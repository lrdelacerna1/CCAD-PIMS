import {
    collection,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    where,
    writeBatch,
    Query,
    DocumentData
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import {
    InventoryItem,
    InventoryInstance,
    InventoryItemWithQuantity,
    AvailabilityResult,
    AvailabilityStatus,
    InventoryInstanceCondition,
    InventoryInstanceStatus
} from '../../lib/types';

// Define locally if not in lib/types yet or ensure lib/types has them
interface InventoryItemForCatalog extends InventoryItemWithQuantity {
    availabilityStatus: string;
    availableForDates: number;
    conditionSummary: Partial<Record<InventoryInstanceCondition, number>>;
}

interface AvailabilityRequest {
    startDate: string;
    endDate: string;
    itemIds: string[];
}

interface InstanceAvailabilityResult {
    itemId: string;
    itemName: string;
    availableInstances: { id: string, assetTag: string, condition: InventoryInstanceCondition }[];
    unavailableInstances: { id: string, assetTag: string, status: InventoryInstanceStatus }[];
}

const inventoryItemsCollection = collection(db, "inventoryItems");
const inventoryInstancesCollection = collection(db, "inventoryInstances");
const equipmentRequestsCollection = collection(db, "equipmentRequests");

export const InventoryService = {

    async _getDocs(q: Query<DocumentData>) {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getInventory(): Promise<InventoryItemWithQuantity[]> {
        const itemsSnapshot = await getDocs(query(inventoryItemsCollection));
        const instancesSnapshot = await getDocs(query(inventoryInstancesCollection)); // Removed condition filter to count all, filter later if needed

        const items = itemsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const instances = instancesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        const instancesByItemId = instances.reduce((acc, inst: any) => {
            const itemId = inst.itemId;
            if (!acc[itemId]) {
                acc[itemId] = [];
            }
            acc[itemId].push(inst);
            return acc;
        }, {} as Record<string, any[]>);

        const itemsWithQuantities: InventoryItemWithQuantity[] = items.map((item: any) => {
            const allInstances = instancesByItemId[item.id] || [];
            // Filter out Lost/Unusable from available counts if desired, or keep them in total but not available
            const usableInstances = allInstances.filter((i: any) => i.condition !== 'Lost/Unusable');
            
            const quantity = {
                total: allInstances.length, // Total physical assets including lost ones? Or just usable? Usually Total means everything.
                available: usableInstances.filter((i: any) => i.status === 'Available').length,
                reserved: usableInstances.filter((i: any) => i.status === 'Reserved').length,
                underMaintenance: usableInstances.filter((i: any) => i.status === 'Under Maintenance').length,
            };
            return { ...item, quantity } as InventoryItemWithQuantity;
        });

        return itemsWithQuantities;
    },

    async getInventoryForCatalog(startDate: string, endDate: string): Promise<InventoryItemForCatalog[]> {
        const baseInventory = (await this.getInventory()).filter(item => !item.isHidden);
        if (baseInventory.length === 0) return [];

        const itemIds = baseInventory.map(item => item.id);

        const allInstancesSnapshot = await getDocs(query(inventoryInstancesCollection)); // Fetch all to filter in memory
        const allInstances = allInstancesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Filter instances for relevant items and usable condition
        const usableInstances = allInstances.filter((inst: any) => itemIds.includes(inst.itemId) && inst.condition !== 'Lost/Unusable');

        const instancesByItemId = usableInstances.reduce((acc, inst: any) => {
            if (!acc[inst.itemId]) acc[inst.itemId] = [];
            acc[inst.itemId].push(inst);
            return acc;
        }, {} as Record<string, any[]>);

        const datesInRange: string[] = [];
        if (startDate && endDate) {
            let currentDate = new Date(startDate);
            const lastDate = new Date(endDate);
            while (currentDate <= lastDate) {
                datesInRange.push(currentDate.toISOString().split('T')[0]);
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }
        
        // Fetch reservations
        const reservationsSnapshot = await getDocs(query(equipmentRequestsCollection,
            where('status', 'in', ['Approved', 'Ready for Pickup', 'In Use', 'Overdue']), // Removed 'Submitted' if it means pending approval
        ));
        
        const allReservations = reservationsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
            .filter((res: any) => res.requestedStartDate <= endDate && res.requestedEndDate >= startDate);
        
        const catalogItems: InventoryItemForCatalog[] = baseInventory.map(item => {
            const itemId = item.id;
            const itemInstances = instancesByItemId[itemId] || [];
            
            let availableForDates = 0;

            if (datesInRange.length > 0) {
                 // Logic: Count instances that are physically available AND not blocked AND not reserved
                 // Note: This needs to account for quantity-based reservations where instanceId might not be assigned yet.
                 // Simplified approach: Total Usable Instances - (Blocked + Maintenance) - overlapping reservations
                 
                 // 1. Physically available (not maintenance) and not blocked
                 const potentiallyAvailableInstances = itemInstances.filter((inst: any) => 
                     inst.status !== 'Under Maintenance' &&
                     !((inst.blockedDates || []).some((d: string) => datesInRange.includes(d)))
                 );
                 
                 // 2. Count reservations for this item in this date range
                 let maxConcurrentReservations = 0;
                 
                 // Naive approach: check everyday in range for max overlapping reservations
                 // A better approach would be to sweep line algorithm or similar, but loop is okay for small ranges
                 for (const date of datesInRange) {
                     const reservationsOnDate = allReservations.filter((res: any) => 
                        res.requestedStartDate <= date && res.requestedEndDate >= date
                     );
                     
                     const bookedCountOnDate = reservationsOnDate.reduce((count, req: any) => {
                         const itemCountInRequest = (req.requestedItems || []).filter((reqItem: any) => reqItem.itemId === itemId).reduce((c: number, ri: any) => c + ri.quantity, 0);
                         return count + itemCountInRequest;
                     }, 0);
                     
                     if (bookedCountOnDate > maxConcurrentReservations) {
                         maxConcurrentReservations = bookedCountOnDate;
                     }
                 }
                 
                 availableForDates = Math.max(0, potentiallyAvailableInstances.length - maxConcurrentReservations);

            } else {
                availableForDates = item.quantity.available;
            }

            let availabilityStatus = 'Unavailable';
            if (item.quantity.total === 0) {
                availabilityStatus = 'Unavailable';
            } else if (availableForDates > 0) {
                availabilityStatus = 'Available';
            } else {
                availabilityStatus = 'Unavailable';
            }

            const conditionSummary = itemInstances.reduce((acc, instance: any) => {
                const condition = instance.condition;
                acc[condition] = (acc[condition] || 0) + 1;
                return acc;
            }, {} as any);

            return { ...item, availableForDates, availabilityStatus, conditionSummary } as InventoryItemForCatalog;
        });
        
        return catalogItems;
    },

    async createItem(itemData: { name: string; areaId: string; photoUrl?: string }): Promise<InventoryItem> {
        const q = query(inventoryItemsCollection, where("name", "==", itemData.name), where("areaId", "==", itemData.areaId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw new Error(`An item with the name "${itemData.name}" already exists in this area.`);
        }
        const newItemData = {
            ...itemData,
            isHidden: false,
        };
        const docRef = await addDoc(inventoryItemsCollection, newItemData);
        return { id: docRef.id, ...newItemData } as InventoryItem;
    },

    async updateItem(id: string, updates: { name: string; areaId: string; isHidden?: boolean; photoUrl?: string }): Promise<InventoryItem> {
        const itemRef = doc(db, "inventoryItems", id);
        const itemSnap = await getDoc(itemRef);
        if (!itemSnap.exists()) {
             throw new Error('Inventory item not found.');
        }

        if (updates.name && updates.name !== itemSnap.data().name) {
            const q = query(inventoryItemsCollection, where("name", "==", updates.name), where("areaId", "==", updates.areaId));
            const collisionSnapshot = await getDocs(q);
            if (!collisionSnapshot.empty && collisionSnapshot.docs[0].id !== id) {
                throw new Error(`An item with the name "${updates.name}" already exists in this area.`);
            }
        }
        
        await updateDoc(itemRef, updates as any);

        const updatedDoc = await getDoc(itemRef);
        return { id: updatedDoc.id, ...updatedDoc.data() } as InventoryItem;
    },

    async deleteItem(id: string): Promise<void> {
        const batch = writeBatch(db);
        const itemRef = doc(db, "inventoryItems", id);
        batch.delete(itemRef);

        const instancesQuery = query(inventoryInstancesCollection, where("itemId", "==", id));
        const instancesSnapshot = await getDocs(instancesQuery);
        instancesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
    },

    async getInstancesByItemId(itemId: string): Promise<InventoryInstance[]> {
        const q = query(inventoryInstancesCollection, where("itemId", "==", itemId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as InventoryInstance[];
    },

    async createInstance(instanceData: Omit<InventoryInstance, 'id'>): Promise<InventoryInstance> {
        const docRef = await addDoc(inventoryInstancesCollection, instanceData);
        return { id: docRef.id, ...instanceData } as InventoryInstance;
    },

    async updateInstance(id: string, updates: Partial<Omit<InventoryInstance, 'id' | 'itemId'>>): Promise<InventoryInstance> {
        const instanceRef = doc(db, "inventoryInstances", id);
        await updateDoc(instanceRef, updates);
        const updatedDoc = await getDoc(instanceRef);
        return { id: updatedDoc.id, ...updatedDoc.data() } as InventoryInstance;
    },

    async deleteInstance(id: string): Promise<void> {
        const instanceRef = doc(db, "inventoryInstances", id);
        await deleteDoc(instanceRef);
    },
    
    async checkAvailability(request: AvailabilityRequest): Promise<InstanceAvailabilityResult[]> {
        const { startDate, endDate, itemIds } = request;
        const results: InstanceAvailabilityResult[] = [];
        
        const reservationsSnapshot = await getDocs(query(equipmentRequestsCollection,
            where('status', 'in', ['Approved', 'Ready for Pickup', 'In Use', 'Overdue']),
        ));
        const allReservations = reservationsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
            .filter((res: any) => res.requestedStartDate <= endDate && res.requestedEndDate >= startDate);
        
        for (const itemId of itemIds) {
            const itemSnap = await getDoc(doc(db, "inventoryItems", itemId));
            if (!itemSnap.exists()) continue;
            const itemInfo = { id: itemSnap.id, ...itemSnap.data() } as InventoryItem;

            const instancesSnapshot = await getDocs(query(inventoryInstancesCollection, where("itemId", "==", itemId), where("condition", "!=", "Lost/Unusable")));
            const allInstancesOfItem = instancesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as InventoryInstance[];
            
            const availableInstances: { id: string, assetTag: string, condition: InventoryInstanceCondition }[] = [];
            const unavailableInstances: { id: string, assetTag: string, status: InventoryInstanceStatus }[] = [];

            // Simple check per instance
            for(const inst of allInstancesOfItem) {
                 // 1. Physical status
                 if (inst.status === 'Under Maintenance') {
                     unavailableInstances.push({ id: inst.id, assetTag: inst.assetTag, status: 'Under Maintenance' });
                     continue;
                 }
                 
                 // 2. Blocked dates
                 let isBlocked = false;
                 if (inst.blockedDates) {
                     const start = new Date(startDate);
                     const end = new Date(endDate);
                     for(const bd of inst.blockedDates) {
                         const bdDate = new Date(bd);
                         if (bdDate >= start && bdDate <= end) {
                             isBlocked = true;
                             break;
                         }
                     }
                 }
                 if (isBlocked) {
                      unavailableInstances.push({ id: inst.id, assetTag: inst.assetTag, status: 'Under Maintenance' });
                      continue;
                 }

                 // 3. Specific assignment reservations
                 const isAssigned = allReservations.some((req: any) => 
                     (req.assignedItems || []).some((asgn: any) => asgn.instanceId === inst.id)
                 );
                 
                 if (isAssigned) {
                      unavailableInstances.push({ id: inst.id, assetTag: inst.assetTag, status: 'Reserved' });
                 } else {
                      // Note: This doesn't account for general quantity reservations that haven't been assigned yet.
                      // If the system auto-assigns or requires assignment, this might be tricky.
                      // For now, listing it as available if not specifically assigned.
                      availableInstances.push({ id: inst.id, assetTag: inst.assetTag, condition: inst.condition });
                 }
            }

            results.push({
                itemId,
                itemName: itemInfo.name,
                availableInstances,
                unavailableInstances
            });
        }
        return results;
    }
}
