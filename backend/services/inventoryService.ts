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
    AvailabilityStatus,
    InventoryInstanceCondition,
    InventoryInstanceStatus
} from '../../lib/types';

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
    availableInstances: InventoryInstance[];
    unavailableInstances: { id: string, assetTag: string, status: InventoryInstanceStatus }[];
}

const inventoryItemsCollection = collection(db, "inventoryItems");
const inventoryInstancesCollection = collection(db, "inventoryInstances");
const equipmentRequestsCollection = collection(db, "equipmentRequests");

// Statuses that block an instance from being reserved.
// Includes pending states so instances are blocked even before admin approval.
const BLOCKING_STATUSES = [
    'Pending Endorsement',
    'Pending Approval',
    'Approved',
    'Ready for Pickup',
    'In Use',
    'Overdue',
];

function getDatesInRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    let current = new Date(startDate);
    const last = new Date(endDate);
    while (current <= last) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

function overlaps(resStart: string, resEnd: string, startDate: string, endDate: string): boolean {
    return resStart <= endDate && resEnd >= startDate;
}

export const InventoryService = {

    async _getDocs(q: Query<DocumentData>) {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getInventory(): Promise<InventoryItemWithQuantity[]> {
        const itemsSnapshot = await getDocs(query(inventoryItemsCollection));
        const instancesSnapshot = await getDocs(query(inventoryInstancesCollection));

        const items = itemsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const instances = instancesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        const instancesByItemId = instances.reduce((acc, inst: any) => {
            if (!acc[inst.itemId]) acc[inst.itemId] = [];
            acc[inst.itemId].push(inst);
            return acc;
        }, {} as Record<string, any[]>);

        return items.map((item: any) => {
            const allInstances = instancesByItemId[item.id] || [];
            const usableInstances = allInstances.filter((i: any) => i.condition !== 'Lost/Unusable');
            const quantity = {
                total: allInstances.length,
                available: usableInstances.filter((i: any) => i.status === 'Available').length,
                reserved: usableInstances.filter((i: any) => i.status === 'Reserved').length,
                underMaintenance: usableInstances.filter((i: any) => i.status === 'Under Maintenance').length,
            };
            return { ...item, quantity } as InventoryItemWithQuantity;
        });
    },

    async getInventoryForCatalog(startDate: string, endDate: string): Promise<InventoryItemForCatalog[]> {
        const baseInventory = (await this.getInventory()).filter(item => !item.isHidden);
        if (baseInventory.length === 0) return [];

        const allInstancesSnapshot = await getDocs(query(inventoryInstancesCollection));
        const allInstances = allInstancesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        const instancesByItemId = allInstances.reduce((acc, inst: any) => {
            if (!acc[inst.itemId]) acc[inst.itemId] = [];
            acc[inst.itemId].push(inst);
            return acc;
        }, {} as Record<string, any[]>);

        const reservationsSnapshot = await getDocs(query(
            equipmentRequestsCollection,
            where('status', 'in', BLOCKING_STATUSES)
        ));

        // Collect all reserved instance IDs that overlap the requested date range
        const reservedInstanceIds = new Set<string>();
        reservationsSnapshot.docs.forEach(d => {
            const res = d.data();
            const reqStart = (res.requestedStartDate as string).split('T')[0];
            const reqEnd = (res.requestedEndDate as string).split('T')[0];
            if (overlaps(reqStart, reqEnd, startDate, endDate)) {
                (res.requestedItems || []).forEach((item: any) => {
                    if (item.instanceId) reservedInstanceIds.add(item.instanceId);
                });
            }
        });

        const datesInRange = getDatesInRange(startDate, endDate);

        return baseInventory.map(item => {
            const itemInstances = (instancesByItemId[item.id] || []) as InventoryInstance[];

            let availableForDates = 0;
            if (datesInRange.length > 0) {
                const potentiallyAvailable = itemInstances.filter(inst =>
                    inst.condition !== 'Lost/Unusable' &&
                    inst.status !== 'Under Maintenance' &&
                    !(inst.blockedDates || []).some(d => datesInRange.includes(d))
                );
                availableForDates = potentiallyAvailable.filter(inst => !reservedInstanceIds.has(inst.id)).length;
            } else {
                availableForDates = item.quantity.available;
            }

            const availabilityStatus: AvailabilityStatus = availableForDates > 0 ? 'Available' : 'Unavailable';

            const conditionSummary = itemInstances.reduce((acc, instance) => {
                acc[instance.condition] = (acc[instance.condition] || 0) + 1;
                return acc;
            }, {} as Partial<Record<InventoryInstanceCondition, number>>);

            return { ...item, availableForDates, availabilityStatus, conditionSummary };
        });
    },

    async createItem(itemData: { name: string; areaId: string; photoUrl?: string }): Promise<InventoryItem> {
        const q = query(inventoryItemsCollection, where("name", "==", itemData.name), where("areaId", "==", itemData.areaId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw new Error(`An item with the name "${itemData.name}" already exists in this area.`);
        }
        const newItemData = { ...itemData, isHidden: false };
        const docRef = await addDoc(inventoryItemsCollection, newItemData);
        return { id: docRef.id, ...newItemData } as InventoryItem;
    },

    async updateItem(id: string, updates: { name: string; areaId: string; isHidden?: boolean; photoUrl?: string }): Promise<InventoryItem> {
        const itemRef = doc(db, "inventoryItems", id);
        const itemSnap = await getDoc(itemRef);
        if (!itemSnap.exists()) throw new Error('Inventory item not found.');

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
        instancesSnapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    },

    async getInstancesByItemId(itemId: string): Promise<InventoryInstance[]> {
        const q = query(inventoryInstancesCollection, where("itemId", "==", itemId));
        return this._getDocs(q) as Promise<InventoryInstance[]>;
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
        await deleteDoc(doc(db, "inventoryInstances", id));
    },

    async checkAvailability(request: AvailabilityRequest): Promise<InstanceAvailabilityResult[]> {
        const { startDate, endDate, itemIds } = request;
        const results: InstanceAvailabilityResult[] = [];

        const reservationsSnapshot = await getDocs(query(
            equipmentRequestsCollection,
            where('status', 'in', BLOCKING_STATUSES)
        ));

        // Collect all reserved instance IDs that overlap the requested date range
        const reservedInstanceIds = new Set<string>();
        reservationsSnapshot.docs.forEach(d => {
            const res = d.data();
            const reqStart = (res.requestedStartDate as string).split('T')[0];
            const reqEnd = (res.requestedEndDate as string).split('T')[0];
            if (overlaps(reqStart, reqEnd, startDate, endDate)) {
                (res.requestedItems || []).forEach((item: any) => {
                    if (item.instanceId) reservedInstanceIds.add(item.instanceId);
                });
            }
        });

        const datesInRange = getDatesInRange(startDate, endDate);

        for (const itemId of itemIds) {
            const itemSnap = await getDoc(doc(db, "inventoryItems", itemId));
            if (!itemSnap.exists()) continue;
            const itemInfo = { id: itemSnap.id, ...itemSnap.data() } as InventoryItem;

            const instancesSnapshot = await getDocs(query(inventoryInstancesCollection, where("itemId", "==", itemId)));
            const allInstancesOfItem = instancesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as InventoryInstance[];

            const availableInstancesResult: InventoryInstance[] = [];
            const unavailableInstancesResult: { id: string, assetTag: string, status: InventoryInstanceStatus }[] = [];

            for (const inst of allInstancesOfItem) {
                if (inst.condition === 'Lost/Unusable') continue;

                const isBlocked = (inst.blockedDates || []).some(d => datesInRange.includes(d.split('T')[0]));

                if (inst.status === 'Under Maintenance' || isBlocked) {
                    unavailableInstancesResult.push({ id: inst.id, assetTag: inst.assetTag, status: 'Under Maintenance' });
                } else if (reservedInstanceIds.has(inst.id)) {
                    unavailableInstancesResult.push({ id: inst.id, assetTag: inst.assetTag, status: 'Reserved' });
                } else {
                    availableInstancesResult.push(inst);
                }
            }

            results.push({
                itemId,
                itemName: itemInfo.name,
                availableInstances: availableInstancesResult,
                unavailableInstances: unavailableInstancesResult
            });
        }

        return results;
    }
}