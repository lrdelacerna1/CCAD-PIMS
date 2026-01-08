
import { InventoryItem, InventoryItemWithQuantity, InventoryInstance, AvailabilityRequest, InstanceAvailabilityResult, InventoryItemForCatalog } from '../../frontend/types';
import { InventoryService } from '../services/inventoryService';

const simulateNetworkDelay = <T>(data: T): Promise<T> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(data);
        }, 300);
    });
};

export const getInventoryApi = async (): Promise<InventoryItemWithQuantity[]> => {
    const items = await InventoryService.getInventory();
    return simulateNetworkDelay(items);
};

export const getInventoryCatalogApi = async (startDate: string, endDate: string): Promise<InventoryItemForCatalog[]> => {
    const items = await InventoryService.getInventoryForCatalog(startDate, endDate);
    return simulateNetworkDelay(items);
};

export const createInventoryItemApi = async (itemData: { name: string; areaId: string }): Promise<InventoryItem> => {
    const newItem = await InventoryService.createItem(itemData);
    return simulateNetworkDelay(newItem);
};

export const updateInventoryItemApi = async (id: string, updates: { name: string; areaId: string; isHidden?: boolean }): Promise<InventoryItem> => {
    const updatedItem = await InventoryService.updateItem(id, updates);
    return simulateNetworkDelay(updatedItem);
};

export const deleteInventoryItemApi = async (id: string): Promise<void> => {
    await InventoryService.deleteItem(id);
    return simulateNetworkDelay(undefined);
};

// --- Instance API Methods ---

export const getInstancesByItemIdApi = async (itemId: string): Promise<InventoryInstance[]> => {
    const instances = await InventoryService.getInstancesByItemId(itemId);
    return simulateNetworkDelay(instances);
}

export const createInstanceApi = async (instanceData: Omit<InventoryInstance, 'id'>): Promise<InventoryInstance> => {
    const newInstance = await InventoryService.createInstance(instanceData);
    return simulateNetworkDelay(newInstance);
}

export const updateInstanceApi = async (id: string, updates: Partial<Omit<InventoryInstance, 'id' | 'itemId'>>): Promise<InventoryInstance> => {
    const updatedInstance = await InventoryService.updateInstance(id, updates);
    return simulateNetworkDelay(updatedInstance);
}

export const deleteInstanceApi = async (id: string): Promise<void> => {
    await InventoryService.deleteInstance(id);
    return simulateNetworkDelay(undefined);
}

// --- Availability API Method ---

export const checkAvailabilityApi = async (request: AvailabilityRequest): Promise<InstanceAvailabilityResult[]> => {
    const results = await InventoryService.checkAvailability(request);
    return simulateNetworkDelay(results);
};
