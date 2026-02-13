
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
} from '../../lib/types';

interface RoomTypeForCatalog extends RoomTypeWithQuantity {
    availabilityStatus: string;
    availableForDates: number;
}


const roomTypesCollection = collection(db, "roomTypes");
const roomInstancesCollection = collection(db, "roomInstances");
const roomRequestsCollection = collection(db, "roomRequests");

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
            const roomTypeId = inst.roomTypeId;
            if (!acc[roomTypeId]) {
                acc[roomTypeId] = [];
            }
            acc[roomTypeId].push({ id: instDoc.id, ...inst });
            return acc;
        }, {} as Record<string, any[]>);

        const typesWithQuantities: RoomTypeWithQuantity[] = types.docs.map(typeDoc => {
            const typeData = typeDoc.data();
            const roomInstances = instancesByRoomTypeId[typeDoc.id] || [];
            const quantity = {
                total: roomInstances.length,
                available: roomInstances.filter(i => i.status === 'Available').length,
                reserved: roomInstances.filter(i => i.status === 'Reserved').length,
                underMaintenance: roomInstances.filter(i => i.status === 'Under Maintenance').length,
            };
            return { id: typeDoc.id, ...typeData, quantity } as RoomTypeWithQuantity;
        });

        return typesWithQuantities;
    },

    async getRoomTypesForCatalog(startDate: string, endDate: string): Promise<RoomTypeForCatalog[]> {
        const baseRoomTypes = (await this.getRoomTypes()).filter(rt => !rt.isHidden);

        const datesInRange: string[] = [];
        if (startDate && endDate) {
            let currentDate = new Date(startDate);
            const lastDate = new Date(endDate);
            while (currentDate <= lastDate) {
                datesInRange.push(currentDate.toISOString().split('T')[0]);
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        const allInstancesSnapshot = await getDocs(query(roomInstancesCollection));
        const allInstances = allInstancesSnapshot.docs.map(d => ({id: d.id, ...d.data()}));
        
        const allReservationsSnapshot = await getDocs(query(
            roomRequestsCollection,
            where('status', 'in', ['Pending Confirmation','For Approval', 'Approved', 'Ready for Check-in', 'In Use', 'Overdue']),
        ));
        
        const allReservations = allReservationsSnapshot.docs.map(d => ({id: d.id, ...d.data()}))
            .filter((res: any) => {
                const reqStart = res.requestedStartDate.split('T')[0];
                const reqEnd = res.requestedEndDate.split('T')[0];
                return reqStart <= endDate && reqEnd >= startDate;
            });

        const catalogItems: RoomTypeForCatalog[] = [];
        
        for (const roomType of baseRoomTypes) {
            const instancesOfThisType = allInstances.filter((inst: any) => inst.roomTypeId === roomType.id);
            let availableCount = 0;

            if (datesInRange.length > 0) {
                 for (const instance of instancesOfThisType) {
                     const inst = instance as RoomInstance;
                     if (inst.status === 'Under Maintenance') continue;
                     if (inst.blockedDates && inst.blockedDates.some(d => datesInRange.includes(d))) continue;

                     const isBooked = allReservations.some((req: any) => {
                         if (req.instanceId !== inst.id) return false;
                         const reqStart = req.requestedStartDate.split('T')[0];
                         const reqEnd = req.requestedEndDate.split('T')[0];
                         return reqStart <= endDate && reqEnd >= startDate;
                     });
                     
                     if (!isBooked) {
                         availableCount++;
                     }
                 }
                 
                 const unassignedReservations = allReservations.filter((req: any) => 
                    !req.instanceId && 
                    req.roomTypeId === roomType.id &&
                    (req.requestedStartDate.split('T')[0] <= endDate && req.requestedEndDate.split('T')[0] >= startDate)
                 ).length;
                 
                 availableCount = Math.max(0, availableCount - unassignedReservations);

            } else {
                availableCount = roomType.quantity.available;
            }

            let availabilityStatus = 'Unavailable';
            if (roomType.quantity.total === 0) {
                availabilityStatus = 'Unavailable';
            } else if (availableCount > 0) {
                availabilityStatus = 'Available';
            } else {
                availabilityStatus = 'Unavailable';
            }

            catalogItems.push({ ...roomType, availabilityStatus, availableForDates: availableCount });
        }

        return catalogItems;
    },

    async createRoomType(data: { name: string; areaId: string; photoUrl?: string }): Promise<RoomType> {
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
    },

    async updateRoomType(id: string, updates: { name: string; areaId: string; isHidden?: boolean; photoUrl?: string }): Promise<RoomType> {
        const typeRef = doc(db, "roomTypes", id);
        const typeSnap = await getDoc(typeRef);
        if (!typeSnap.exists()) {
            throw new Error('Room type not found.');
        }

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
        instancesSnapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

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
        const instanceRef = doc(db, "roomInstances", id);
        await deleteDoc(instanceRef);
    },

    async checkRoomAvailability(request: RoomAvailabilityRequest): Promise<RoomInstanceAvailabilityResult[]> {
        const { startDate, endDate, roomTypeIds } = request;
        const results: RoomInstanceAvailabilityResult[] = [];

        const reservationsSnapshot = await getDocs(query(
            roomRequestsCollection,
            where('status', 'in', ['Pending Confirmation', 'For Approval', 'Approved', 'Ready for Check-in', 'In Use', 'Overdue'])
        ));
        const allReservations = reservationsSnapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(res => {
                const reqStart = res.requestedStartDate.split('T')[0];
                const reqEnd = res.requestedEndDate.split('T')[0];
                return reqStart <= endDate && reqEnd >= startDate;
            });

        const datesInRange: string[] = [];
        if (startDate && endDate) {
            let currentDate = new Date(startDate);
            const lastDate = new Date(endDate);
            while (currentDate <= lastDate) {
                datesInRange.push(currentDate.toISOString().split('T')[0]);
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        for (const roomTypeId of roomTypeIds) {
            const typeSnap = await getDoc(doc(db, "roomTypes", roomTypeId));
            if (!typeSnap.exists()) continue;

            const instancesSnapshot = await getDocs(query(roomInstancesCollection, where("roomTypeId", "==", roomTypeId)));
            const allInstancesOfRoomType = instancesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as RoomInstance[];

            const availableInstancesResult: { id: string, name: string, condition: RoomCondition }[] = [];
            const unavailableInstancesResult: { id: string, name: string, status: RoomStatus }[] = [];

            const potentiallyAvailable: RoomInstance[] = [];
            for (const inst of allInstancesOfRoomType) {
                const isBlocked = (inst.blockedDates || []).some(d => datesInRange.includes(d.split('T')[0]));
                if (inst.status === 'Under Maintenance' || isBlocked) {
                    unavailableInstancesResult.push({ id: inst.id, name: inst.name, status: 'Under Maintenance' });
                } else {
                    potentiallyAvailable.push(inst);
                }
            }

            const unassignedInstances: RoomInstance[] = [];
            for (const inst of potentiallyAvailable) {
                const isAssigned = allReservations.some(req => req.instanceId === inst.id);
                if (isAssigned) {
                    unavailableInstancesResult.push({ id: inst.id, name: inst.name, status: 'Reserved' });
                } else {
                    unassignedInstances.push(inst);
                }
            }
            
            let maxConcurrentFloatingReservations = 0;
            if (datesInRange.length > 0) {
                for (const date of datesInRange) {
                    const reservationsOnDate = allReservations.filter(res => 
                        !res.instanceId &&
                        res.roomTypeId === roomTypeId &&
                        res.requestedStartDate.split('T')[0] <= date && 
                        res.requestedEndDate.split('T')[0] >= date
                    );
                    if (reservationsOnDate.length > maxConcurrentFloatingReservations) {
                        maxConcurrentFloatingReservations = reservationsOnDate.length;
                    }
                }
            }

            const instancesToMarkAsReserved = unassignedInstances.splice(0, maxConcurrentFloatingReservations);
            for (const inst of instancesToMarkAsReserved) {
                unavailableInstancesResult.push({ id: inst.id, name: inst.name, status: 'Reserved' });
            }

            for (const inst of unassignedInstances) {
                availableInstancesResult.push({ id: inst.id, name: inst.name, condition: inst.condition });
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
