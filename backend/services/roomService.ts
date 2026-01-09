
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
    RoomTypeForCatalog,
    AvailabilityStatus
} from '../../frontend/types';

const roomTypesCollection = collection(db, "roomTypes");
const roomInstancesCollection = collection(db, "roomInstances");
const roomRequestsCollection = collection(db, "roomRequests");

export class RoomService {

    private static async _getDocs(q: Query<DocumentData>) {
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    static async getRoomTypes(): Promise<RoomTypeWithQuantity[]> {
        const types = await this._getDocs(query(roomTypesCollection));
        const instances = await this._getDocs(query(roomInstancesCollection));

        const instancesByRoomTypeId = instances.reduce((acc, inst) => {
            const roomTypeId = (inst as any).roomTypeId;
            if (!acc[roomTypeId]) {
                acc[roomTypeId] = [];
            }
            acc[roomTypeId].push(inst);
            return acc;
        }, {} as Record<string, any[]>);

        const typesWithQuantities: RoomTypeWithQuantity[] = types.map(type => {
            const roomInstances = instancesByRoomTypeId[(type as any).id] || [];
            const quantity = {
                total: roomInstances.length,
                available: roomInstances.filter(i => i.status === 'Available').length,
                inUse: roomInstances.filter(i => i.status === 'In Use').length,
                underMaintenance: roomInstances.filter(i => i.status === 'Under Maintenance').length,
            };
            return { ...type, quantity } as RoomTypeWithQuantity;
        });

        return typesWithQuantities;
    }

    static async getRoomTypesForCatalog(startDate: string, endDate: string): Promise<RoomTypeForCatalog[]> {
        const baseRoomTypes = (await this.getRoomTypes()).filter(rt => !(rt as any).isHidden);

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

        const allInstances = await this._getDocs(query(roomInstancesCollection));
        const allReservations = await this._getDocs(query(
            roomRequestsCollection,
            where('status', 'in', ['Pending Confirmation', 'For Approval', 'Ready for Check-in', 'Overdue']),
            where('requestedEndDate', '>=', startDate || '0')
        ));

        const catalogItems: RoomTypeForCatalog[] = [];
        for (const roomType of baseRoomTypes) {
            const instancesOfThisType = allInstances.filter(inst => (inst as any).roomTypeId === (roomType as any).id);
            let availableForDates = 0;

            if (datesInRange.length > 0) {
                const availableThroughoutInstances = instancesOfThisType.filter(instance => {
                    const isPhysicallyAvailable = (instance as any).status === 'Available' &&
                        !((instance as any).blockedDates && (instance as any).blockedDates.some((d: string) => datesInRange.includes(d)));
                    if (!isPhysicallyAvailable) return false;

                    const isSpecificallyReserved = allReservations.some(req =>
                        (req as any).instanceId === (instance as any).id &&
                        ((req as any).requestedStartDate <= datesInRange[datesInRange.length - 1] && (req as any).requestedEndDate >= datesInRange[0])
                    );
                    if (isSpecificallyReserved) return false;

                    return true;
                });

                let maxGenericReservations = 0;
                for (const date of datesInRange) {
                    const genericReservationsOnDate = allReservations.filter(req =>
                        !(req as any).instanceId &&
                        (req as any).requestedRoom.roomTypeId === (roomType as any).id &&
                        (req as any).requestedStartDate <= date && (req as any).requestedEndDate >= date
                    ).length;

                    if (genericReservationsOnDate > maxGenericReservations) {
                        maxGenericReservations = genericReservationsOnDate;
                    }
                }

                availableForDates = Math.max(0, availableThroughoutInstances.length - maxGenericReservations);
            } else {
                availableForDates = instancesOfThisType.filter(i => (i as any).status === 'Available').length;
            }

            let availabilityStatus: AvailabilityStatus;
            if (roomType.quantity.total === 0) {
                availabilityStatus = 'Unavailable: No Instances';
            } else if (availableForDates > 0) {
                availabilityStatus = 'Available';
            } else {
                availabilityStatus = 'Unavailable: Reserved';
            }

            catalogItems.push({ ...roomType, availabilityStatus, availableForDates });
        }

        return catalogItems;
    }

    static async createRoomType(data: { name: string; areaId: string }): Promise<RoomType> {
        const q = query(roomTypesCollection, where("name", "==", data.name), where("areaId", "==", data.areaId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            throw new Error(`A room type with the name "${data.name}" already exists in this area.`);
        }
        const newRoomTypeData = {
            ...data,
            isHidden: false,
        };
        const docRef = await addDoc(roomTypesCollection, newRoomTypeData);
        return { id: docRef.id, ...newRoomTypeData } as RoomType;
    }

    static async updateRoomType(id: string, updates: { name: string; areaId: string; isHidden?: boolean }): Promise<RoomType> {
        const typeRef = doc(db, "roomTypes", id);
        const typeSnap = await getDoc(typeRef);
        if (!typeSnap.exists()) {
            throw new Error('Room type not found.');
        }
        const wasHidden = typeSnap.data().isHidden;

        const q = query(roomTypesCollection, where("name", "==", updates.name), where("areaId", "==", updates.areaId));
        const collisionSnapshot = await getDocs(q);
        if (!collisionSnapshot.empty && collisionSnapshot.docs[0].id !== id) {
            throw new Error(`A room type with the name "${updates.name}" already exists in this area.`);
        }

        await updateDoc(typeRef, updates as any);

        if (updates.isHidden && !wasHidden) {
            const batch = writeBatch(db);
            const instancesQuery = query(roomInstancesCollection, where("roomTypeId", "==", id));
            const instancesSnapshot = await getDocs(instancesQuery);
            instancesSnapshot.forEach(instanceDoc => {
                batch.update(instanceDoc.ref, { status: 'Under Maintenance' });
            });
            await batch.commit();
        }

        const updatedDoc = await getDoc(typeRef);
        return { id: updatedDoc.id, ...updatedDoc.data() } as RoomType;
    }

    static async deleteRoomType(id: string): Promise<void> {
        const batch = writeBatch(db);
        const typeRef = doc(db, "roomTypes", id);
        batch.delete(typeRef);

        const instancesQuery = query(roomInstancesCollection, where("roomTypeId", "==", id));
        const instancesSnapshot = await getDocs(instancesQuery);
        instancesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
    }

    static async getInstancesByRoomTypeId(roomTypeId: string): Promise<RoomInstance[]> {
        const q = query(roomInstancesCollection, where("roomTypeId", "==", roomTypeId));
        return await this._getDocs(q) as RoomInstance[];
    }

    static async createRoomInstance(data: Omit<RoomInstance, 'id'>): Promise<RoomInstance> {
        const docRef = await addDoc(roomInstancesCollection, data);
        return { id: docRef.id, ...data } as RoomInstance;
    }

    static async updateRoomInstance(id: string, updates: Partial<Omit<RoomInstance, 'id' | 'roomTypeId'>>): Promise<RoomInstance> {
        const instanceRef = doc(db, "roomInstances", id);
        await updateDoc(instanceRef, updates);
        const updatedDoc = await getDoc(instanceRef);
        return { id: updatedDoc.id, ...updatedDoc.data() } as RoomInstance;
    }

    static async deleteRoomInstance(id: string): Promise<void> {
        const instanceRef = doc(db, "roomInstances", id);
        await deleteDoc(instanceRef);
    }

    static async checkRoomAvailability(request: RoomAvailabilityRequest): Promise<RoomInstanceAvailabilityResult[]> {
        const { startDate, endDate, roomTypeIds } = request;
        const results: RoomInstanceAvailabilityResult[] = [];

        const datesInRange: string[] = [];
        if (startDate && endDate) {
            let currentDate = new Date(startDate + 'T00:00:00Z');
            const lastDate = new Date(endDate + 'T00:00:00Z');
            while (currentDate <= lastDate) {
                datesInRange.push(currentDate.toISOString().split('T')[0]);
                currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            }
        }
        if (datesInRange.length === 0) return [];

        const allReservations = await this._getDocs(query(
            roomRequestsCollection,
            where('status', 'in', ['Pending Confirmation', 'For Approval', 'Ready for Check-in', 'Overdue']),
            where('requestedEndDate', '>=', startDate)
        ));

        for (const roomTypeId of roomTypeIds) {
            const typeSnap = await getDoc(doc(db, "roomTypes", roomTypeId));
            if (!typeSnap.exists()) continue;
            const typeInfo = { id: typeSnap.id, ...typeSnap.data() } as RoomType;

            const instancesOfRoomTypeQuery = query(roomInstancesCollection, where("roomTypeId", "==", roomTypeId));
            const allInstancesOfRoomType = await this._getDocs(instancesOfRoomTypeQuery);

            const availableThroughoutInstances = allInstancesOfRoomType.filter(instance => {
                const isPhysicallyAvailable = (instance as any).status === 'Available' &&
                    !((instance as any).blockedDates && (instance as any).blockedDates.some((d: string) => datesInRange.includes(d)));
                if (!isPhysicallyAvailable) return false;

                const isSpecificallyReserved = allReservations.some(req =>
                    (req as any).instanceId === (instance as any).id &&
                    ((req as any).requestedStartDate <= datesInRange[datesInRange.length - 1] && (req as any).requestedEndDate >= datesInRange[0])
                );
                if (isSpecificallyReserved) return false;

                return true;
            });

            let maxGenericReservations = 0;
            for (const date of datesInRange) {
                const genericReservationsOnDate = allReservations.filter(req =>
                    !(req as any).instanceId &&
                    (req as any).requestedRoom.roomTypeId === roomTypeId &&
                    (req as any).requestedStartDate <= date && (req as any).requestedEndDate >= date
                ).length;

                if (genericReservationsOnDate > maxGenericReservations) {
                    maxGenericReservations = genericReservationsOnDate;
                }
            }

            const numAvailable = Math.max(0, availableThroughoutInstances.length - maxGenericReservations);
            const availableInstances = availableThroughoutInstances.slice(0, numAvailable);

            results.push({
                roomTypeId,
                roomTypeName: typeInfo.name,
                availableInstances: availableInstances as RoomInstance[],
            });
        }
        return results;
    }
}
