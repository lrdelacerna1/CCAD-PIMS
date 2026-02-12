
import { 
    collection, 
    getDocs, 
    query, 
    where, 
    Timestamp,
    doc,
    getDoc
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { 
    DailyAvailability, 
    AvailabilityLevel, 
    ItemDailyStatus,
    InventoryItem,
    EquipmentRequest,
    RoomRequest,
    RoomType,
    InventoryInstance,
    RoomInstance
} from '../../frontend/types';

const equipmentRequestsCollection = collection(db, "equipmentRequests");
const roomRequestsCollection = collection(db, "roomRequests");
const inventoryItemsCollection = collection(db, "inventoryItems");
const inventoryInstancesCollection = collection(db, "inventoryInstances");
const roomTypesCollection = collection(db, "roomTypes");
const roomInstancesCollection = collection(db, "roomInstances");

export class CalendarService {
    private static getDaysInMonth(year: number, month: number): string[] {
        const date = new Date(Date.UTC(year, month, 1));
        const days: string[] = [];
        while (date.getUTCMonth() === month) {
            days.push(date.toISOString().split('T')[0]);
            date.setUTCDate(date.getUTCDate() + 1);
        }
        return days;
    }

    private static calculateAvailabilityLevel(total: number, booked: number): AvailabilityLevel {
        if (total === 0) return 'none';
        const ratio = booked / total;
        if (ratio >= 1) return 'none';
        if (ratio >= 0.7) return 'low';
        if (ratio >= 0.3) return 'medium';
        return 'high';
    }

    static async getMonthlyAvailability(
        year: number,
        month: number, // 0-indexed (0 for Jan, 11 for Dec)
        areaId: string,
        resourceType: 'equipment' | 'rooms'
    ): Promise<DailyAvailability[]> {
        const days = this.getDaysInMonth(year, month);
        const dailyAvailabilities: DailyAvailability[] = [];

        for (const day of days) {
            let totalResources = 0;
            let unavailableResources = 0; // Includes booked, maintenance, blocked

            if (resourceType === 'equipment') {
                const itemQuery = areaId === 'all' 
                    ? query(inventoryItemsCollection) 
                    : query(inventoryItemsCollection, where('areaId', '==', areaId));
                const itemsSnapshot = await getDocs(itemQuery);
                const itemIds = itemsSnapshot.docs.map(doc => doc.id);
                
                if (itemIds.length > 0) {
                    const instancesQuery = query(inventoryInstancesCollection, where('itemId', 'in', itemIds));
                    const instancesSnapshot = await getDocs(instancesQuery);
                    const allInstances = instancesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as InventoryInstance[];
                    
                    totalResources = allInstances.length;

                    const requestsQuery = query(equipmentRequestsCollection,
                        where('requestedStartDate', '<=', day),
                        where('requestedEndDate', '>=', day),
                        where('status', 'in', ['Approved', 'Ready for Pickup', 'In Use', 'Overdue'])
                    );
                    const requestsSnapshot = await getDocs(requestsQuery);
                    const todaysReservations = requestsSnapshot.docs.map(d => d.data() as EquipmentRequest);

                    const unavailableInstanceIds = new Set<string>();

                    allInstances.forEach(instance => {
                        // Check for Under Maintenance status
                        if (instance.status === 'Under Maintenance') {
                            unavailableInstanceIds.add(instance.id);
                            return; // No need for further checks
                        }

                        // Check for manually blocked dates
                        if (instance.blockedDates?.includes(day)) {
                            unavailableInstanceIds.add(instance.id);
                            return;
                        }

                        // Check for active reservations
                        const isReserved = todaysReservations.some(req => 
                            req.assignedItems?.some(asgn => asgn.instanceId === instance.id)
                        );
                        if (isReserved) {
                            unavailableInstanceIds.add(instance.id);
                        }
                    });

                    unavailableResources = unavailableInstanceIds.size;
                }

            } else { // rooms
                const typeQuery = areaId === 'all' 
                    ? query(roomTypesCollection) 
                    : query(roomTypesCollection, where('areaId', '==', areaId));
                const typesSnapshot = await getDocs(typeQuery);
                const typeIds = typesSnapshot.docs.map(doc => doc.id);

                if (typeIds.length > 0) {
                    const instancesQuery = query(roomInstancesCollection, where('roomTypeId', 'in', typeIds));
                    const instancesSnapshot = await getDocs(instancesQuery);
                    const allInstances = instancesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RoomInstance[];

                    totalResources = allInstances.length;

                    const requestsQuery = query(roomRequestsCollection, 
                        where('requestedStartDate', '<=', day),
                        where('requestedEndDate', '>=', day),
                        where('status', 'in', ['Approved', 'Ready for Check-in', 'In Use', 'Overdue'])
                    );
                    const requestsSnapshot = await getDocs(requestsQuery);
                    const todaysReservations = requestsSnapshot.docs.map(d => d.data() as RoomRequest);

                    const unavailableInstanceIds = new Set<string>();

                    allInstances.forEach(instance => {
                        // Check for Under Maintenance status
                        if (instance.status === 'Under Maintenance') {
                            unavailableInstanceIds.add(instance.id);
                            return; 
                        }

                        // Check for manually blocked dates
                        if (instance.blockedDates?.includes(day)) {
                            unavailableInstanceIds.add(instance.id);
                            return;
                        }

                        // Check for active reservations
                        const isReserved = todaysReservations.some(req => req.instanceId === instance.id);
                        if (isReserved) {
                            unavailableInstanceIds.add(instance.id);
                        }
                    });
                    unavailableResources = unavailableInstanceIds.size;
                }
            }
            
            dailyAvailabilities.push({
                date: day,
                level: this.calculateAvailabilityLevel(totalResources, unavailableResources),
                total: totalResources,
                booked: unavailableResources // Field name is now a bit of a misnomer, but changing it would break the frontend contract.
            });
        }

        return dailyAvailabilities;
    }

    static async getDailyDetailedStatus(
        date: string,
        areaId: string,
        resourceType: 'equipment' | 'rooms'
    ): Promise<ItemDailyStatus[]> {

        if (resourceType === 'equipment') {
            const requestsOnDayQuery = query(equipmentRequestsCollection,
                where('requestedStartDate', '<=', date),
                where('requestedEndDate', '>=', date),
                where('status', 'in', ['Ready for Pickup', 'Closed'])
            );
            const requestsOnDaySnapshot = await getDocs(requestsOnDayQuery);
            const requestsOnDay = requestsOnDaySnapshot.docs.map(doc => doc.data() as EquipmentRequest);

            const itemsQuery = areaId === 'all' ? query(inventoryItemsCollection) : query(inventoryItemsCollection, where('areaId', '==', areaId));
            const itemsSnapshot = await getDocs(itemsQuery);

            const dailyStatus: ItemDailyStatus[] = [];

            for (const itemDoc of itemsSnapshot.docs) {
                const item = { id: itemDoc.id, ...itemDoc.data() } as InventoryItem;
                const instancesQuery = query(inventoryInstancesCollection, where('itemId', '==', item.id), where('condition', '!=', 'Lost/Unusable'));
                const instancesSnapshot = await getDocs(instancesQuery);
                const totalInstances = instancesSnapshot.size;

                let bookedInstances = 0;
                 for (const req of requestsOnDay) {
                    if (req.requestedItems.some((ri) => ri.itemId === item.id)) {
                        bookedInstances++;
                    }
                }

                if (totalInstances > 0) {
                    dailyStatus.push({
                        id: item.id,
                        name: item.name,
                        areaId: item.areaId,
                        totalInstances,
                        bookedInstances,
                        isFullyBooked: bookedInstances >= totalInstances,
                    });
                }
            }
            return dailyStatus;

        } else { // rooms
            const requestsOnDayQuery = query(roomRequestsCollection,
                where('requestedStartDate', '==', date),
                where('status', 'in', ['Ready for Check-in', 'Overdue', 'Closed'])
            );
            const requestsOnDaySnapshot = await getDocs(requestsOnDayQuery);
            const requestsOnDay = requestsOnDaySnapshot.docs.map(doc => doc.data() as RoomRequest);
            
            const typesQuery = areaId === 'all' ? query(roomTypesCollection) : query(roomTypesCollection, where('areaId', '==', areaId));
            const typesSnapshot = await getDocs(typesQuery);

            const dailyStatus: ItemDailyStatus[] = [];

            for (const typeDoc of typesSnapshot.docs) {
                const type = { id: typeDoc.id, ...typeDoc.data() } as RoomType;
                const instancesQuery = query(roomInstancesCollection, where('roomTypeId', '==', type.id));
                const instancesSnapshot = await getDocs(instancesQuery);
                const totalInstances = instancesSnapshot.size;

                let bookedInstances = 0;
                for (const req of requestsOnDay) {
                    if (req.requestedRoom.roomTypeId === type.id) {
                        bookedInstances++;
                    }
                }

                 if (totalInstances > 0) {
                    dailyStatus.push({
                        id: type.id,
                        name: type.name,
                        areaId: type.areaId,
                        totalInstances,
                        bookedInstances,
                        isFullyBooked: bookedInstances >= totalInstances
                    });
                }
            }
             return dailyStatus;
        }
    }
}
