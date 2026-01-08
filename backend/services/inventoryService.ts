

import { InventoryItem, InventoryInstance, InventoryItemWithQuantity, AvailabilityRequest, InstanceAvailabilityResult, InventoryItemForCatalog, AvailabilityStatus, InventoryInstanceCondition } from '../../frontend/types';
// FIX: Import 'equipmentRequests' instead of the non-existent 'reservations'.
import { inventoryItems, inventoryInstances, equipmentRequests } from '../db/mockDb';

const uuidv4 = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0,
            v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

export class InventoryService {
    static async getInventory(): Promise<InventoryItemWithQuantity[]> {
        const itemsWithQuantities: InventoryItemWithQuantity[] = inventoryItems.map(item => {
            const nonLostInstances = inventoryInstances.filter(inst => inst.itemId === item.id && inst.condition !== 'Lost/Unusable');
            
            const quantity = {
                total: nonLostInstances.length,
                available: nonLostInstances.filter(i => i.status === 'Available').length,
                reserved: nonLostInstances.filter(i => i.status === 'Reserved').length,
                underMaintenance: nonLostInstances.filter(i => i.status === 'Under Maintenance').length,
            };
            return { ...item, quantity };
        }).filter(item => item.quantity.total > 0 || item.isHidden); // Keep items if they have instances OR if they are hidden/manually managed

        return JSON.parse(JSON.stringify(itemsWithQuantities));
    }

    static async getInventoryForCatalog(startDate: string, endDate: string): Promise<InventoryItemForCatalog[]> {
        // Only get visible items for the catalog
        const baseInventory = (await this.getInventory()).filter(item => !item.isHidden);
        
        const datesInRange: string[] = [];
        let currentDate = new Date(startDate + 'T00:00:00Z');
        const lastDate = new Date(endDate + 'T00:00:00Z');
        if (lastDate >= currentDate) {
            while (currentDate <= lastDate) {
                datesInRange.push(currentDate.toISOString().split('T')[0]);
                currentDate.setUTCDate(currentDate.getUTCDate() + 1);
            }
        }

        const catalogItems: InventoryItemForCatalog[] = [];
        for (const item of baseInventory) {
            const allNonLostInstances = inventoryInstances.filter(inst => inst.itemId === item.id && inst.condition !== 'Lost/Unusable');
            
            let availableForDates = 0;

            if (datesInRange.length > 0) {
                // Find instances that are physically available and not blocked on ANY of the requested dates
                const potentiallyAvailableInstances = allNonLostInstances.filter(inst => 
                    inst.status === 'Available' && 
                    !(inst.blockedDates && inst.blockedDates.some(d => datesInRange.includes(d)))
                );
                
                // Find out how many are reserved on the peak day within the range
                let maxConcurrentReservations = 0;
                for (const date of datesInRange) {
                    const reservationsOnDate = equipmentRequests.filter(res =>
                        res.requestedStartDate <= date && res.requestedEndDate >= date &&
                        ['Pending Confirmation', 'For Approval', 'Ready for Pickup'].includes(res.status)
                    );

                    const bookedCountOnDate = reservationsOnDate.reduce((count, req) => {
                        const itemCountInRequest = req.requestedItems.filter(reqItem => reqItem.itemId === item.id).length;
                        return count + itemCountInRequest;
                    }, 0);

                    if (bookedCountOnDate > maxConcurrentReservations) {
                        maxConcurrentReservations = bookedCountOnDate;
                    }
                }

                // The number available for the whole duration is the number of unblocked, available instances minus the peak reservation count
                const guaranteedAvailableCount = potentiallyAvailableInstances.length - maxConcurrentReservations;
                availableForDates = Math.max(0, guaranteedAvailableCount);

            } else {
                // If no date range, just count physically available ones
                availableForDates = allNonLostInstances.filter(inst => inst.status === 'Available').length;
            }

            let availabilityStatus: AvailabilityStatus;
            if (item.quantity.total === 0) {
                availabilityStatus = 'Unavailable: No Instances';
            } else if (availableForDates > 0) {
                availabilityStatus = 'Available';
            } else if (item.quantity.available > 0) {
                // There are physically available items, but they are all booked/blocked for these dates
                availabilityStatus = 'Unavailable: Reserved';
            } else {
                // There are no physically available items (all are reserved/in maintenance)
                availabilityStatus = 'Unavailable: On Hold';
            }

            const conditionSummary = allNonLostInstances.reduce((acc, instance) => {
                acc[instance.condition] = (acc[instance.condition] || 0) + 1;
                return acc;
            }, {} as Partial<Record<InventoryInstanceCondition, number>>);

            catalogItems.push({ ...item, availabilityStatus, conditionSummary, availableForDates });
        }

        return JSON.parse(JSON.stringify(catalogItems));
    }


    static async createItem(itemData: { name: string; areaId: string }): Promise<InventoryItem> {
        if (inventoryItems.some(item => item.name.toLowerCase() === itemData.name.toLowerCase() && item.areaId === itemData.areaId)) {
            throw new Error(`An item with the name "${itemData.name}" already exists in this area.`);
        }
        const newItem: InventoryItem = {
            id: `item-type-${inventoryItems.length + 10}`, // simple id generation for mock
            ...itemData,
            isHidden: false,
        };
        inventoryItems.push(newItem);
        return { ...newItem };
    }

    static async updateItem(id: string, updates: { name: string; areaId: string; isHidden?: boolean }): Promise<InventoryItem> {
        const itemIndex = inventoryItems.findIndex(item => item.id === id);
        if (itemIndex === -1) {
            throw new Error('Inventory item not found.');
        }
        if (inventoryItems.some(item => item.name.toLowerCase() === updates.name.toLowerCase() && item.areaId === updates.areaId && item.id !== id)) {
            throw new Error(`An item with the name "${updates.name}" already exists in this area.`);
        }

        const wasHidden = inventoryItems[itemIndex].isHidden;
        inventoryItems[itemIndex] = { ...inventoryItems[itemIndex], ...updates };

        // Side effects for hiding/unhiding
        if (updates.isHidden && !wasHidden) {
            // Item is being hidden. Set all instances to "Under Maintenance"
            inventoryInstances.forEach(inst => {
                if (inst.itemId === id) {
                    inst.status = 'Under Maintenance';
                }
            });
        }

        return { ...inventoryItems[itemIndex] };
    }

    static async deleteItem(id: string): Promise<void> {
        const itemIndex = inventoryItems.findIndex(item => item.id === id);
        if (itemIndex !== -1) {
            inventoryItems.splice(itemIndex, 1);
            let i = inventoryInstances.length;
            while (i--) {
                if (inventoryInstances[i].itemId === id) {
                    inventoryInstances.splice(i, 1);
                }
            }
        }
    }

    // --- Instance Methods ---

    static async getInstancesByItemId(itemId: string): Promise<InventoryInstance[]> {
        const instances = inventoryInstances.filter(inst => inst.itemId === itemId && inst.condition !== 'Lost/Unusable');
        return JSON.parse(JSON.stringify(instances));
    }

    static async createInstance(instanceData: Omit<InventoryInstance, 'id'>): Promise<InventoryInstance> {
        const newInstance: InventoryInstance = {
            id: `inst-${inventoryInstances.length + 10}`,
            ...instanceData,
        };
        inventoryInstances.push(newInstance);
        return { ...newInstance };
    }

    static async updateInstance(id: string, updates: Partial<Omit<InventoryInstance, 'id' | 'itemId'>>): Promise<InventoryInstance> {
        const instanceIndex = inventoryInstances.findIndex(inst => inst.id === id);
        if (instanceIndex === -1) {
            throw new Error('Inventory instance not found.');
        }
        inventoryInstances[instanceIndex] = { ...inventoryInstances[instanceIndex], ...updates };
        return { ...inventoryInstances[instanceIndex] };
    }

    static async deleteInstance(id: string): Promise<void> {
        const instanceIndex = inventoryInstances.findIndex(inst => inst.id === id);
        if (instanceIndex !== -1) {
            inventoryInstances.splice(instanceIndex, 1);
        }
    }
    
    // --- Availability Check ---

    static async checkAvailability(request: AvailabilityRequest): Promise<InstanceAvailabilityResult[]> {
        const { startDate, endDate, itemIds } = request;
        const results: InstanceAvailabilityResult[] = [];

        const datesInRange: string[] = [];
        let currentDate = new Date(startDate + 'T00:00:00Z');
        const lastDate = new Date(endDate + 'T00:00:00Z');
        if (lastDate < currentDate) {
            return [];
        }
        while (currentDate <= lastDate) {
            datesInRange.push(currentDate.toISOString().split('T')[0]);
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }

        for (const itemId of itemIds) {
            const itemInfo = inventoryItems.find(i => i.id === itemId);
            if (!itemInfo) continue;

            const allInstancesOfItem = inventoryInstances.filter(inst => inst.itemId === itemId && inst.condition !== 'Lost/Unusable');
            
            const availableAndNotBlockedInstances = allInstancesOfItem.filter(inst => 
                inst.status === 'Available' && 
                !(inst.blockedDates && inst.blockedDates.some(d => datesInRange.includes(d)))
            );

            let maxConcurrentReservations = 0;

            for (const date of datesInRange) {
                const reservationsOnDate = equipmentRequests.filter(res =>
                    res.requestedStartDate <= date && res.requestedEndDate >= date &&
                    ['Pending Confirmation', 'For Approval', 'Ready for Pickup'].includes(res.status)
                );

                const bookedCountOnDate = reservationsOnDate.reduce((count, req) => {
                    const itemCountInRequest = req.requestedItems.filter(reqItem => reqItem.itemId === itemInfo.id).length;
                    return count + itemCountInRequest;
                }, 0);

                if (bookedCountOnDate > maxConcurrentReservations) {
                    maxConcurrentReservations = bookedCountOnDate;
                }
            }
            
            const guaranteedAvailableCount = availableAndNotBlockedInstances.length - maxConcurrentReservations;

            let availableInstances: InventoryInstance[] = [];
            if (guaranteedAvailableCount > 0) {
                availableInstances = availableAndNotBlockedInstances.slice(0, guaranteedAvailableCount);
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