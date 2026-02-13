
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
            // Simple loop to get dates, might need timezone adjustment in a real app
            while (currentDate <= lastDate) {
                datesInRange.push(currentDate.toISOString().split('T')[0]);
                currentDate.setDate(currentDate.getDate() + 1);
            }
        }

        const allInstancesSnapshot = await getDocs(query(roomInstancesCollection));
        const allInstances = allInstancesSnapshot.docs.map(d => ({id: d.id, ...d.data()}));
        
        // This query might be too broad or need composite indexes. For now, fetching broader set.
        // In a real app, optimize indices.
        const allReservationsSnapshot = await getDocs(query(
            roomRequestsCollection,
            where('status', 'in', ['Pending Approval', 'Approved', 'Ready for Check-in', 'In Use', 'Overdue']),
        ));
        
        const allReservations = allReservationsSnapshot.docs.map(d => ({id: d.id, ...d.data()}));

        const catalogItems: RoomTypeForCatalog[] = [];
        
        for (const roomType of baseRoomTypes) {
            const instancesOfThisType = allInstances.filter((inst: any) => inst.roomTypeId === roomType.id);
            let availableCount = 0;

            if (datesInRange.length > 0) {
                 // Check each instance
                 for (const instance of instancesOfThisType) {
                     const inst = instance as RoomInstance;
                     // 1. Check physical status
                     if (inst.status === 'Under Maintenance') continue;
                     
                     // 2. Check blocked dates
                     if (inst.blockedDates && inst.blockedDates.some(d => datesInRange.includes(d))) continue;

                     // 3. Check existing reservations for this specific instance
                     const isBooked = allReservations.some((req: any) => {
                         if (req.instanceId !== inst.id) return false;
                         // Check overlap
                         return (req.requestedStartDate <= endDate && req.requestedEndDate >= startDate);
                     });
                     
                     if (!isBooked) {
                         availableCount++;
                     }
                 }
                 
                 // Note: This simple logic doesn't account for "floating" reservations (room type booked but no instance assigned yet).
                 // In a robust system, you'd subtract unassigned reservations for this room type from the available count.
                 const unassignedReservations = allReservations.filter((req: any) => 
                    !req.instanceId && 
                    req.roomTypeId === roomType.id &&
                    (req.requestedStartDate <= endDate && req.requestedEndDate >= startDate)
                 ).length;
                 
                 availableCount = Math.max(0, availableCount - unassignedReservations);

            } else {
                // If no dates selected, just show total available status
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
        // Basic check for duplicates
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

        // Check for duplicates if name changed
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
        
        const allReservationsSnapshot = await getDocs(query(
            roomRequestsCollection,
            where('status', 'in', ['Pending Approval', 'Approved', 'Ready for Check-in', 'In Use', 'Overdue']),
        ));
        const allReservations = allReservationsSnapshot.docs.map(d => ({id: d.id, ...d.data()}));

        for (const roomTypeId of roomTypeIds) {
            const typeRef = doc(db, "roomTypes", roomTypeId);
            const typeSnap = await getDoc(typeRef);
            if (!typeSnap.exists()) continue;
            
            const instancesSnapshot = await getDocs(query(roomInstancesCollection, where("roomTypeId", "==", roomTypeId)));
            const instances = instancesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as RoomInstance[];
            
            const availableInstances: { id: string, name: string, condition: RoomCondition }[] = [];
            const unavailableInstances: { id: string, name: string, status: RoomStatus }[] = [];

            for (const inst of instances) {
                // 1. Physical status
                if (inst.status === 'Under Maintenance') {
                    unavailableInstances.push({ id: inst.id, name: inst.name, status: 'Under Maintenance' });
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
                    unavailableInstances.push({ id: inst.id, name: inst.name, status: 'Under Maintenance' }); // Or custom status
                    continue;
                }

                // 3. Reservations
                const isReserved = allReservations.some((req: any) => {
                     if (req.instanceId !== inst.id) return false;
                     return (req.requestedStartDate <= endDate && req.requestedEndDate >= startDate);
                });

                if (isReserved) {
                    unavailableInstances.push({ id: inst.id, name: inst.name, status: 'Reserved' });
                } else {
                    availableInstances.push({ id: inst.id, name: inst.name, condition: inst.condition });
                }
            }

            results.push({
                roomTypeId,
                totalInstances: instances.length,
                availableInstances,
                unavailableInstances
            });
        }
        
        return results;
    }
}
