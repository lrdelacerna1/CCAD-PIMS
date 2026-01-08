

import { RoomType, RoomInstance, RoomTypeWithQuantity, RoomAvailabilityRequest, RoomInstanceAvailabilityResult, RoomTypeForCatalog, AvailabilityStatus } from '../../frontend/types';
// FIX: Import 'roomRequests' instead of the non-existent 'reservations'.
import { roomTypes, roomInstances, roomRequests } from '../db/mockDb';

const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0,
            v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

export class RoomService {
    static async getRoomTypes(): Promise<RoomTypeWithQuantity[]> {
        const typesWithQuantities: RoomTypeWithQuantity[] = roomTypes.map(type => {
            const instances = roomInstances.filter(inst => inst.roomTypeId === type.id);
            const quantity = {
                total: instances.length,
                available: instances.filter(i => i.status === 'Available').length,
                inUse: instances.filter(i => i.status === 'In Use').length,
                underMaintenance: instances.filter(i => i.status === 'Under Maintenance').length,
            };
            return { ...type, quantity };
        });
        return JSON.parse(JSON.stringify(typesWithQuantities));
    }

    static async getRoomTypesForCatalog(startDate: string, endDate: string): Promise<RoomTypeForCatalog[]> {
        // Filter out hidden rooms
        const baseRoomTypes = (await this.getRoomTypes()).filter(rt => !rt.isHidden);

        const datesInRange: string[] = [];
        let currentDate = new Date(startDate + 'T00:00:00Z');
        const lastDate = new Date(endDate + 'T00:00:00Z');
        if (lastDate >= currentDate) {
            while (currentDate <= lastDate) {
                datesInRange.push(currentDate.toISOString().split('T')[0]);
                currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            }
        }
        
        const catalogItems: RoomTypeForCatalog[] = [];
        for (const roomType of baseRoomTypes) {
            const allInstances = roomInstances.filter(inst => inst.roomTypeId === roomType.id);

            let availableForDates = 0;
            if (datesInRange.length > 0) {
                // An instance is available for the whole range if it's not blocked and not specifically reserved on any of those dates.
                const availableThroughoutInstances = allInstances.filter(instance => {
                    const isPhysicallyAvailable = instance.status === 'Available' &&
                        !(instance.blockedDates && instance.blockedDates.some(d => datesInRange.includes(d)));
                    if (!isPhysicallyAvailable) return false;

                    const isSpecificallyReserved = roomRequests.some(req =>
                        req.instanceId === instance.id &&
                        ['Pending Confirmation', 'For Approval', 'Ready for Check-in', 'Overdue'].includes(req.status) &&
                        (req.requestedStartDate <= datesInRange[datesInRange.length - 1] && req.requestedEndDate >= datesInRange[0])
                    );
                    if (isSpecificallyReserved) return false;

                    return true;
                });
                
                // For the pool of available instances, account for generic reservations (those without an instanceId).
                // Find the peak number of generic reservations on any day in the range.
                let maxGenericReservations = 0;
                for (const date of datesInRange) {
                    const genericReservationsOnDate = roomRequests.filter(req =>
                        !req.instanceId &&
                        req.requestedRoom.roomTypeId === roomType.id &&
                        req.requestedStartDate <= date && req.requestedEndDate >= date &&
                        ['Pending Confirmation', 'For Approval', 'Ready for Check-in', 'Overdue'].includes(req.status)
                    ).length;

                    if (genericReservationsOnDate > maxGenericReservations) {
                        maxGenericReservations = genericReservationsOnDate;
                    }
                }
                
                availableForDates = Math.max(0, availableThroughoutInstances.length - maxGenericReservations);

            } else {
                availableForDates = allInstances.filter(i => i.status === 'Available').length;
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
        
        return JSON.parse(JSON.stringify(catalogItems));
    }

    static async createRoomType(data: { name: string; areaId: string }): Promise<RoomType> {
        if (roomTypes.some(rt => rt.name.toLowerCase() === data.name.toLowerCase() && rt.areaId === data.areaId)) {
            throw new Error(`A room type with the name "${data.name}" already exists in this area.`);
        }
        const newRoomType: RoomType = {
            id: `room-type-${uuidv4()}`,
            ...data,
            isHidden: false,
        };
        roomTypes.push(newRoomType);
        return { ...newRoomType };
    }

    static async updateRoomType(id: string, updates: { name: string; areaId: string; isHidden?: boolean }): Promise<RoomType> {
        const typeIndex = roomTypes.findIndex(rt => rt.id === id);
        if (typeIndex === -1) {
            throw new Error('Room type not found.');
        }
        if (roomTypes.some(rt => rt.name.toLowerCase() === updates.name.toLowerCase() && rt.areaId === updates.areaId && rt.id !== id)) {
            throw new Error(`A room type with the name "${updates.name}" already exists in this area.`);
        }

        const wasHidden = roomTypes[typeIndex].isHidden;
        roomTypes[typeIndex] = { ...roomTypes[typeIndex], ...updates };

        // Side effects for hiding/unhiding
        if (updates.isHidden && !wasHidden) {
            // Room type is being hidden. Set all instances to "Under Maintenance"
            roomInstances.forEach(inst => {
                if (inst.roomTypeId === id) {
                    inst.status = 'Under Maintenance';
                }
            });
        }

        return { ...roomTypes[typeIndex] };
    }

    static async deleteRoomType(id: string): Promise<void> {
        const index = roomTypes.findIndex(rt => rt.id === id);
        if (index !== -1) {
            roomTypes.splice(index, 1);
            let i = roomInstances.length;
            while (i--) {
                if (roomInstances[i].roomTypeId === id) {
                    roomInstances.splice(i, 1);
                }
            }
        }
    }

    static async getInstancesByRoomTypeId(roomTypeId: string): Promise<RoomInstance[]> {
        const instances = roomInstances.filter(inst => inst.roomTypeId === roomTypeId);
        return JSON.parse(JSON.stringify(instances));
    }

    static async createRoomInstance(data: Omit<RoomInstance, 'id'>): Promise<RoomInstance> {
        const newInstance: RoomInstance = {
            id: `room-inst-${uuidv4()}`,
            ...data,
        };
        roomInstances.push(newInstance);
        return { ...newInstance };
    }

    static async updateRoomInstance(id: string, updates: Partial<Omit<RoomInstance, 'id' | 'roomTypeId'>>): Promise<RoomInstance> {
        const index = roomInstances.findIndex(inst => inst.id === id);
        if (index === -1) {
            throw new Error('Room instance not found.');
        }
        roomInstances[index] = { ...roomInstances[index], ...updates };
        return { ...roomInstances[index] };
    }

    static async deleteRoomInstance(id: string): Promise<void> {
        const index = roomInstances.findIndex(inst => inst.id === id);
        if (index !== -1) {
            roomInstances.splice(index, 1);
        }
    }
    
    static async checkRoomAvailability(request: RoomAvailabilityRequest): Promise<RoomInstanceAvailabilityResult[]> {
        const { startDate, endDate, roomTypeIds } = request;
        const results: RoomInstanceAvailabilityResult[] = [];

        const datesInRange: string[] = [];
        let currentDate = new Date(startDate + 'T00:00:00Z');
        const lastDate = new Date(endDate + 'T00:00:00Z');
        while (currentDate <= lastDate) {
            datesInRange.push(currentDate.toISOString().split('T')[0]);
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

        for (const roomTypeId of roomTypeIds) {
            const typeInfo = roomTypes.find(rt => rt.id === roomTypeId);
            if (!typeInfo) continue;

            const allInstances = roomInstances.filter(inst => inst.roomTypeId === roomTypeId);
            
            const availableThroughoutInstances = allInstances.filter(instance => {
                const isPhysicallyAvailable = instance.status === 'Available' &&
                    !(instance.blockedDates && instance.blockedDates.some(d => datesInRange.includes(d)));
                if (!isPhysicallyAvailable) return false;
                
                const isSpecificallyReserved = roomRequests.some(req =>
                    req.instanceId === instance.id &&
                    ['Pending Confirmation', 'For Approval', 'Ready for Check-in', 'Overdue'].includes(req.status) &&
                    (req.requestedStartDate <= datesInRange[datesInRange.length - 1] && req.requestedEndDate >= datesInRange[0])
                );
                if (isSpecificallyReserved) return false;

                return true;
            });

            let maxGenericReservations = 0;
            for (const date of datesInRange) {
                const genericReservationsOnDate = roomRequests.filter(req =>
                    !req.instanceId &&
                    req.requestedRoom.roomTypeId === roomTypeId &&
                    req.requestedStartDate <= date && req.requestedEndDate >= date &&
                    ['Pending Confirmation', 'For Approval', 'Ready for Check-in', 'Overdue'].includes(req.status)
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
                availableInstances,
            });
        }
        return results;
    }
}