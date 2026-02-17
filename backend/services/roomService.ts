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
    RoomType,
    RoomInstance,
    RoomTypeWithQuantity,
    RoomAvailabilityRequest,
    RoomInstanceAvailabilityResult,
    RoomStatus,
    RoomCondition
} from '../../frontend/types';

interface RoomTypeForCatalog extends RoomTypeWithQuantity {
    availabilityStatus: string;
    availableForDates: number;
}

const roomTypesCollection = collection(db, "roomTypes");
const roomInstancesCollection = collection(db, "roomInstances");
const roomRequestsCollection = collection(db, "roomRequests");

// Statuses that block a room instance from being reserved.
// Includes pending states so instances are blocked even before admin approval.
const BLOCKING_STATUSES = [
    'Pending Endorsement',
    'Pending Approval',
    'Approved',
    'Ready for Check-in',
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

/**
 * Extracts all booked instance IDs from a room request document.
 * Room requests store instance IDs inside the `requestedRoom` array,
 * NOT at the root level — this was the source of the availability bug.
 */
function getBookedInstanceIdsFromRoomRequest(res: any): string[] {
    const ids: string[] = [];
    // requestedRoom is the array of { roomTypeId, areaId, instanceId, name }
    if (Array.isArray(res.requestedRoom)) {
        for (const room of res.requestedRoom) {
            if (room.instanceId) ids.push(room.instanceId);
        }
    }
    return ids;
}

export const RoomService = {

    async _getDocs(q: Query<DocumentData>) {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    async getRoomTypes(): Promise<RoomTypeWithQuantity[]> {
        const types = await getDocs(query(roomTypesCollection));
        const instances = await getDocs(query(roomInstancesCollection));

        const instancesByRoomTypeId = instances.docs.reduce((acc, instDoc) => {
            const inst = instDoc.data();
            if (!acc[inst.roomTypeId]) acc[inst.roomTypeId] = [];
            acc[inst.roomTypeId].push({ id: instDoc.id, ...inst });
            return acc;
        }, {} as Record<string, any[]>);

        return types.docs.map(typeDoc => {
            const typeData = typeDoc.data();
            const roomInstances = instancesByRoomTypeId[typeDoc.id] || [];
            const quantity = {
                total: roomInstances.length,
                available: roomInstances.filter((i: any) => i.status === 'Available').length,
                reserved: roomInstances.filter((i: any) => i.status === 'Reserved').length,
                underMaintenance: roomInstances.filter((i: any) => i.status === 'Under Maintenance').length,
            };
            return { id: typeDoc.id, ...typeData, quantity } as RoomTypeWithQuantity;
        });
    },

    async getRoomTypesForCatalog(startDate: string, endDate: string): Promise<RoomTypeForCatalog[]> {
        const baseRoomTypes = (await this.getRoomTypes()).filter(rt => !rt.isHidden);
        if (baseRoomTypes.length === 0) return [];

        const datesInRange = getDatesInRange(startDate, endDate);

        const allInstancesSnapshot = await getDocs(query(roomInstancesCollection));
        const allInstances = allInstancesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        const allReservationsSnapshot = await getDocs(query(
            roomRequestsCollection,
            where('status', 'in', BLOCKING_STATUSES),
        ));

        // Only keep reservations that overlap the requested date range
        const overlappingReservations = allReservationsSnapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter((res: any) => {
                const reqStart = (res.requestedStartDate as string).split('T')[0];
                const reqEnd = (res.requestedEndDate as string).split('T')[0];
                return overlaps(reqStart, reqEnd, startDate, endDate);
            });

        // Build a set of all instance IDs that are booked in this date range
        // FIX: Read from requestedRoom[].instanceId, not res.instanceId
        const reservedInstanceIds = new Set<string>();
        overlappingReservations.forEach((res: any) => {
            getBookedInstanceIdsFromRoomRequest(res).forEach(id => reservedInstanceIds.add(id));
        });

        return baseRoomTypes.map(roomType => {
            const instancesOfThisType = allInstances.filter((inst: any) => inst.roomTypeId === roomType.id) as RoomInstance[];
            let availableCount = 0;

            if (datesInRange.length > 0) {
                for (const inst of instancesOfThisType) {
                    if (inst.status === 'Under Maintenance') continue;
                    if ((inst.blockedDates || []).some(d => datesInRange.includes(d))) continue;
                    if (reservedInstanceIds.has(inst.id)) continue;
                    availableCount++;
                }
            } else {
                availableCount = roomType.quantity.available;
            }

            let availabilityStatus = 'Unavailable';
            if (roomType.quantity.total > 0 && availableCount > 0) {
                availabilityStatus = 'Available';
            }

            return { ...roomType, availabilityStatus, availableForDates: availableCount };
        });
    },

    async createRoomType(data: { name: string; areaId: string; photoUrl?: string }): Promise<RoomType> {
        const q = query(roomTypesCollection, where("name", "==", data.name), where("areaId", "==", data.areaId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw new Error(`A room type with the name "${data.name}" already exists in this area.`);
        }
        const newRoomTypeData = { ...data, isHidden: false };
        const docRef = await addDoc(roomTypesCollection, newRoomTypeData);
        return { id: docRef.id, ...newRoomTypeData } as RoomType;
    },

    async updateRoomType(id: string, updates: { name: string; areaId: string; isHidden?: boolean; photoUrl?: string }): Promise<RoomType> {
        const typeRef = doc(db, "roomTypes", id);
        const typeSnap = await getDoc(typeRef);
        if (!typeSnap.exists()) throw new Error('Room type not found.');

        if (updates.name && updates.name !== typeSnap.data().name) {
            const q = query(roomTypesCollection, where("name", "==", updates.name), where("areaId", "==", updates.areaId));
            const collisionSnapshot = await getDocs(q);
            if (!collisionSnapshot.empty && collisionSnapshot.docs[0].id !== id) {
                throw new Error(`A room type with the name "${updates.name}" already exists in this area.`);
            }
        }

        await updateDoc(typeRef, updates as any);
        const updatedDoc = await getDoc(typeRef);
        return { id: updatedDoc.id, ...updatedDoc.data() } as RoomType;
    },

    async deleteRoomType(id: string): Promise<void> {
        const batch = writeBatch(db);
        const typeRef = doc(db, "roomTypes", id);
        batch.delete(typeRef);
        const instancesQuery = query(roomInstancesCollection, where("roomTypeId", "==", id));
        const instancesSnapshot = await getDocs(instancesQuery);
        instancesSnapshot.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    },

    async getInstancesByRoomTypeId(roomTypeId: string): Promise<RoomInstance[]> {
        const q = query(roomInstancesCollection, where("roomTypeId", "==", roomTypeId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as RoomInstance[];
    },

    async createRoomInstance(data: Omit<RoomInstance, 'id'>): Promise<RoomInstance> {
        const docRef = await addDoc(roomInstancesCollection, data);
        return { id: docRef.id, ...data } as RoomInstance;
    },

    async updateRoomInstance(id: string, updates: Partial<Omit<RoomInstance, 'id' | 'roomTypeId'>>): Promise<RoomInstance> {
        const instanceRef = doc(db, "roomInstances", id);
        await updateDoc(instanceRef, updates);
        const updatedDoc = await getDoc(instanceRef);
        return { id: updatedDoc.id, ...updatedDoc.data() } as RoomInstance;
    },

    async deleteRoomInstance(id: string): Promise<void> {
        await deleteDoc(doc(db, "roomInstances", id));
    },

    async checkRoomAvailability(request: RoomAvailabilityRequest): Promise<RoomInstanceAvailabilityResult[]> {
        const { startDate, endDate, roomTypeIds } = request;
        const results: RoomInstanceAvailabilityResult[] = [];

        const reservationsSnapshot = await getDocs(query(
            roomRequestsCollection,
            where('status', 'in', BLOCKING_STATUSES)
        ));

        // Only keep reservations that overlap the requested date range
        const overlappingReservations = reservationsSnapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter((res: any) => {
                const reqStart = (res.requestedStartDate as string).split('T')[0];
                const reqEnd = (res.requestedEndDate as string).split('T')[0];
                return overlaps(reqStart, reqEnd, startDate, endDate);
            });

        // Build a set of all instance IDs that are booked in this date range
        // FIX: Read from requestedRoom[].instanceId, not res.instanceId
        const reservedInstanceIds = new Set<string>();
        overlappingReservations.forEach((res: any) => {
            getBookedInstanceIdsFromRoomRequest(res).forEach(id => reservedInstanceIds.add(id));
        });

        const datesInRange = getDatesInRange(startDate, endDate);

        for (const roomTypeId of roomTypeIds) {
            const typeSnap = await getDoc(doc(db, "roomTypes", roomTypeId));
            if (!typeSnap.exists()) continue;

            const instancesSnapshot = await getDocs(query(roomInstancesCollection, where("roomTypeId", "==", roomTypeId)));
            const allInstancesOfRoomType = instancesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as RoomInstance[];

            const availableInstancesResult: { id: string, name: string, condition: RoomCondition }[] = [];
            const unavailableInstancesResult: { id: string, name: string, status: RoomStatus }[] = [];

            for (const inst of allInstancesOfRoomType) {
                const isBlocked = (inst.blockedDates || []).some(d => datesInRange.includes(d.split('T')[0]));

                if (inst.status === 'Under Maintenance' || isBlocked) {
                    unavailableInstancesResult.push({ id: inst.id, name: inst.name, status: 'Under Maintenance' });
                } else if (reservedInstanceIds.has(inst.id)) {
                    // FIX: This now correctly fires because reservedInstanceIds is
                    // populated from requestedRoom[].instanceId instead of res.instanceId
                    unavailableInstancesResult.push({ id: inst.id, name: inst.name, status: 'Reserved' });
                } else {
                    availableInstancesResult.push({ id: inst.id, name: inst.name, condition: inst.condition });
                }
            }

            results.push({
                roomTypeId,
                totalInstances: allInstancesOfRoomType.length,
                availableInstances: availableInstancesResult,
                unavailableInstances: unavailableInstancesResult
            });
        }

        return results;
    }
}