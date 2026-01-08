import { DailyAvailability, AvailabilityLevel, ItemDailyStatus } from '../../frontend/types';
import { equipmentRequests, roomRequests, inventoryItems, inventoryInstances, roomTypes, roomInstances } from '../db/mockDb';

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
            let bookedResources = 0;

            if (resourceType === 'equipment') {
                const itemsInArea = inventoryItems.filter(item => areaId === 'all' || item.areaId === areaId);
                totalResources = inventoryInstances.filter(inst =>
                    itemsInArea.some(item => item.id === inst.itemId) && inst.condition !== 'Lost/Unusable'
                ).length;

                const requestsOnDay = equipmentRequests.filter(req =>
                    day >= req.requestedStartDate && day <= req.requestedEndDate &&
                    (req.status === 'Ready for Pickup') &&
                    // FIX: Use 'requestedItems' instead of 'requestedItem'.
                    req.requestedItems.some(item => areaId === 'all' || item.areaId === areaId)
                );
                bookedResources = requestsOnDay.length;

            } else { // rooms
                const typesInArea = roomTypes.filter(rt => areaId === 'all' || rt.areaId === areaId);
                totalResources = roomInstances.filter(inst =>
                    typesInArea.some(rt => rt.id === inst.roomTypeId)
                ).length;
                
                const requestsOnDay = roomRequests.filter(req =>
                    req.requestedStartDate === day &&
                    (req.status === 'Ready for Check-in' || req.status === 'Overdue') &&
                    (areaId === 'all' || req.requestedRoom.areaId === areaId)
                );
                bookedResources = requestsOnDay.length;
            }
            
            dailyAvailabilities.push({
                date: day,
                level: this.calculateAvailabilityLevel(totalResources, bookedResources),
                total: totalResources,
                booked: bookedResources
            });
        }

        return JSON.parse(JSON.stringify(dailyAvailabilities));
    }

    static async getDailyDetailedStatus(
        date: string,
        areaId: string,
        resourceType: 'equipment' | 'rooms'
    ): Promise<ItemDailyStatus[]> {

        if (resourceType === 'equipment') {
            const requestsOnDay = equipmentRequests.filter(req =>
                date >= req.requestedStartDate && date <= req.requestedEndDate &&
                (req.status === 'Ready for Pickup')
            );
            const itemsInArea = inventoryItems.filter(item => areaId === 'all' || item.areaId === areaId);
            return itemsInArea.map(item => {
                const totalInstances = inventoryInstances.filter(inst => inst.itemId === item.id && inst.condition !== 'Lost/Unusable').length;
                // FIX: Use 'requestedItems' instead of 'requestedItem'.
                const bookedInstances = requestsOnDay.filter(r => r.requestedItems.some(ri => ri.itemId === item.id)).length;
                return {
                    id: item.id,
                    name: item.name,
                    areaId: item.areaId,
                    totalInstances,
                    bookedInstances,
                    isFullyBooked: bookedInstances >= totalInstances,
                };
            }).filter(item => item.totalInstances > 0);

        } else { // rooms
             const requestsOnDay = roomRequests.filter(req =>
                req.requestedStartDate === date &&
                (req.status === 'Ready for Check-in' || req.status === 'Overdue')
            );
            const typesInArea = roomTypes.filter(rt => areaId === 'all' || rt.areaId === areaId);
            return typesInArea.map(type => {
                const allInstances = roomInstances.filter(inst => inst.roomTypeId === type.id);
                const totalInstances = allInstances.length;
                const bookedInstances = requestsOnDay.filter(r => r.requestedRoom.roomTypeId === type.id).length;
                
                return {
                    id: type.id,
                    name: type.name,
                    areaId: type.areaId,
                    totalInstances,
                    bookedInstances,
                    isFullyBooked: bookedInstances >= totalInstances
                };
            }).filter(item => item.totalInstances > 0);
        }
    }
}
