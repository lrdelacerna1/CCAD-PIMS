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
    AvailabilityRequest,
    InstanceAvailabilityResult,
    InventoryItemForCatalog,
    AvailabilityStatus,
    InventoryInstanceCondition
} from '../../frontend/types';

const inventoryItemsCollection = collection(db, "inventoryItems");
const inventoryInstancesCollection = collection(db, "inventoryInstances");
const equipmentRequestsCollection = collection(db, "equipmentRequests");

export class InventoryService {

    private static async _getDocs(q: Query<DocumentData>) {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    static async getInventory(): Promise<InventoryItemWithQuantity[]> {
        const items = await this._getDocs(query(inventoryItemsCollection));
        const instances = await this._getDocs(query(inventoryInstancesCollection, where('condition', '!=', 'Lost/Unusable')));

        const instancesByItemId = instances.reduce((acc, inst) => {
            const itemId = (inst as any).itemId;
            if (!acc[itemId]) {
                acc[itemId] = [];
            }
            acc[itemId].push(inst);
            return acc;
        }, {} as Record<string, any[]>);

        const itemsWithQuantities: InventoryItemWithQuantity[] = items.map(item => {
            const nonLostInstances = instancesByItemId[(item as any).id] || [];
            const quantity = {
                total: nonLostInstances.length,
                available: nonLostInstances.filter(i => i.status === 'Available').length,
                reserved: nonLostInstances.filter(i => i.status === 'Reserved').length,
                underMaintenance: nonLostInstances.filter(i => i.status === 'Under Maintenance').length,
            };
            return { ...item, quantity } as InventoryItemWithQuantity;
        }).filter(item => (item.quantity.total > 0 || (item as any).isHidden));

        return itemsWithQuantities;
    }

    static async getInventoryForCatalog(startDate: string, endDate: string): Promise<InventoryItemForCatalog[]> {
        const baseInventory = (await this.getInventory()).filter(item => !(item as any).isHidden);
        if (baseInventory.length === 0) return [];

        const itemIds = baseInventory.map(item => (item as any).id);

        // Fetch all usable instances for the relevant items and map them by itemId.
        const instancesQuery = query(inventoryInstancesCollection, where('itemId', 'in', itemIds), where('condition', '!=', 'Lost/Unusable'));
        const allInstances = await this._getDocs(instancesQuery);
        const instancesByItemId = allInstances.reduce((acc, inst) => {
            const itemId = (inst as any).itemId;
            if (!acc[itemId]) acc[itemId] = [];
            acc[itemId].push(inst);
            return acc;
        }, {} as Record<string, any[]>);

        const datesInRange: string[] = [];
        if (startDate && endDate) {
            let currentDate = new Date(startDate + 'T00:00:00Z');
            const lastDate = new Date(endDate + 'T00:00:00Z');
            if (lastDate >= currentDate) {
                while (currentDate <= lastDate) {
                    datesInRange.push(currentDate.toISOString().split('T')[0]);
                    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
                }
            }
        }
        
        // Fetch all relevant reservations
        const reservationsQuery = query(equipmentRequestsCollection,
            where('status', 'in', ['Submitted', 'Approved', 'Ready for Pickup']),
            where('requestedEndDate', '>=', startDate || '0'),
        );
        const allReservations = (await this._getDocs(reservationsQuery)).filter(res => (res as any).requestedStartDate <= endDate);
        
        // Pre-calculate bookings per item. This is the core optimization.
        const bookingsByItemId = allReservations.reduce((acc, res) => {
            const req = res as any;
            (req.requestedItems || []).forEach((reqItem: any) => {
                if (itemIds.includes(reqItem.itemId)) {
                    if (!acc[reqItem.itemId]) {
                        acc[reqItem.itemId] = 0;
                    }
                    acc[reqItem.itemId]++;
                }
            });
            return acc;
        }, {} as Record<string, number>);


        const catalogItems: InventoryItemForCatalog[] = baseInventory.map(item => {
            const itemId = (item as any).id;
            const itemInstances = instancesByItemId[itemId] || [];
            
            let availableForDates = 0;
            if (datesInRange.length > 0) {
                const potentiallyAvailableInstances = itemInstances.filter(inst =>
                    (inst as any).status === 'Available' &&
                    !((inst as any).blockedDates || []).some((d: string) => datesInRange.includes(d))
                );
                
                const bookedCount = bookingsByItemId[itemId] || 0;
                availableForDates = Math.max(0, potentiallyAvailableInstances.length - bookedCount);

            } else {
                availableForDates = itemInstances.filter(inst => (inst as any).status === 'Available').length;
            }

            let availabilityStatus: AvailabilityStatus;
            if (item.quantity.total === 0) {
                availabilityStatus = 'Unavailable: No Instances';
            } else if (availableForDates > 0) {
                availabilityStatus = 'Available';
            } else if (item.quantity.available > 0) {
                availabilityStatus = 'Unavailable: Reserved';
            } else {
                availabilityStatus = 'Unavailable: On Hold';
            }

            const conditionSummary = itemInstances.reduce((acc, instance) => {
                const condition = (instance as any).condition;
                acc[condition] = (acc[condition] || 0) + 1;
                return acc;
            }, {} as Partial<Record<InventoryInstanceCondition, number>>);

            return { ...item, availableForDates, availabilityStatus, conditionSummary } as InventoryItemForCatalog;
        });
        
        return catalogItems;
    }

    static async createItem(itemData: { name: string; areaId: string }): Promise<InventoryItem> {
        const q = query(inventoryItemsCollection, where("name", "==", itemData.name), where("areaId", "==", itemData.areaId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw new Error(`An item with the name \"${itemData.name}\" already exists in this area.`);
        }
        const newItemData = {
            ...itemData,
            isHidden: false,
        };
        const docRef = await addDoc(inventoryItemsCollection, newItemData);
        return { id: docRef.id, ...newItemData } as InventoryItem;
    }

    static async updateItem(id: string, updates: { name: string; areaId: string; isHidden?: boolean }): Promise<InventoryItem> {
        const itemRef = doc(db, "inventoryItems", id);
        const itemSnap = await getDoc(itemRef);
        if (!itemSnap.exists()) {
             throw new Error('Inventory item not found.');
        }
        const wasHidden = itemSnap.data().isHidden;
        
        const q = query(inventoryItemsCollection, where("name", "==", updates.name), where("areaId", "==", updates.areaId));
        const collisionSnapshot = await getDocs(q);
        if (!collisionSnapshot.empty && collisionSnapshot.docs[0].id !== id) {
             throw new Error(`An item with the name \"${updates.name}\" already exists in this area.`);
        }
        
        await updateDoc(itemRef, updates as any);

        if (updates.isHidden && !wasHidden) {
            const batch = writeBatch(db);
            const instancesQuery = query(inventoryInstancesCollection, where("itemId", "==", id));
            const instancesSnapshot = await getDocs(instancesQuery);
            instancesSnapshot.forEach(instanceDoc => {
                batch.update(instanceDoc.ref, { status: 'Under Maintenance' });
            });
            await batch.commit();
        }
        
        const updatedDoc = await getDoc(itemRef);
        return { id: updatedDoc.id, ...updatedDoc.data() } as InventoryItem;
    }

    static async deleteItem(id: string): Promise<void> {
        const batch = writeBatch(db);
        const itemRef = doc(db, "inventoryItems", id);
        batch.delete(itemRef);

        const instancesQuery = query(inventoryInstancesCollection, where("itemId", "==", id));
        const instancesSnapshot = await getDocs(instancesQuery);
        instancesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        await batch.commit();
    }

    static async getInstancesByItemId(itemId: string): Promise<InventoryInstance[]> {
        const q = query(inventoryInstancesCollection, where("itemId", "==", itemId), where('condition', '!=', 'Lost/Unusable'));
        return await this._getDocs(q) as InventoryInstance[];
    }

    static async createInstance(instanceData: Omit<InventoryInstance, 'id'>): Promise<InventoryInstance> {
        const docRef = await addDoc(inventoryInstancesCollection, instanceData);
        return { id: docRef.id, ...instanceData } as InventoryInstance;
    }

    static async updateInstance(id: string, updates: Partial<Omit<InventoryInstance, 'id' | 'itemId'>>): Promise<InventoryInstance> {
        const instanceRef = doc(db, "inventoryInstances", id);
        await updateDoc(instanceRef, updates);
        const updatedDoc = await getDoc(instanceRef);
        return { id: updatedDoc.id, ...updatedDoc.data() } as InventoryInstance;
    }

    static async deleteInstance(id: string): Promise<void> {
        const instanceRef = doc(db, "inventoryInstances", id);
        await deleteDoc(instanceRef);
    }
    
    static async checkAvailability(request: AvailabilityRequest): Promise<InstanceAvailabilityResult[]> {
        const { startDate, endDate, itemIds } = request;
        const results: InstanceAvailabilityResult[] = [];
        
        const datesInRange: string[] = [];
        if (startDate && endDate) {
            let currentDate = new Date(startDate + 'T00:00:00Z');
            const lastDate = new Date(endDate + 'T00:00:00Z');
            if (lastDate >= currentDate) {
                while (currentDate <= lastDate) {
                    datesInRange.push(currentDate.toISOString().split('T')[0]);
                    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
                }
            }
        }
        if (datesInRange.length === 0) return [];
        
        const reservationsQuery = query(equipmentRequestsCollection,
            where('status', 'in', ['Submitted', 'Approved', 'Ready for Pickup']),
            where('requestedEndDate', '>=', startDate),
        );
        const allReservations = (await this._getDocs(reservationsQuery)).filter(res => (res as any).requestedStartDate <= endDate);
        
        for (const itemId of itemIds) {
            const itemSnap = await getDoc(doc(db, "inventoryItems", itemId));
            if (!itemSnap.exists()) continue;
            const itemInfo = { id: itemSnap.id, ...itemSnap.data() } as InventoryItem;

            const instancesOfItemQuery = query(inventoryInstancesCollection, where("itemId", "==", itemId), where("condition", "!=", "Lost/Unusable"));
            const allInstancesOfItem = await this._getDocs(instancesOfItemQuery);
            
            const availableAndNotBlockedInstances = allInstancesOfItem.filter(inst =>
                (inst as any).status === 'Available' &&
                !((inst as any).blockedDates && (inst as any).blockedDates.some((d: string) => datesInRange.includes(d)))
            );

            let maxConcurrentReservations = 0;
            for (const date of datesInRange) {
                const reservationsOnDate = allReservations.filter(res =>
                    (res as any).requestedStartDate <= date && (res as any).requestedEndDate >= date
                );
                const bookedCountOnDate = reservationsOnDate.reduce((count, req) => {
                    const itemCountInRequest = ((req as any).requestedItems || []).filter((reqItem: any) => reqItem.itemId === itemInfo.id).length;
                    return count + itemCountInRequest;
                }, 0);
                if (bookedCountOnDate > maxConcurrentReservations) {
                    maxConcurrentReservations = bookedCountOnDate;
                }
            }
            
            const guaranteedAvailableCount = availableAndNotBlockedInstances.length - maxConcurrentReservations;

            let availableInstances: InventoryInstance[] = [];
            if (guaranteedAvailableCount > 0) {
                 availableInstances = availableAndNotBlockedInstances.slice(0, guaranteedAvailableCount) as InventoryInstance[];
            }

            results.push({
                itemId,
                itemName: itemInfo.name,
                availableInstances,
            });
        }
        return results;
    }
}
