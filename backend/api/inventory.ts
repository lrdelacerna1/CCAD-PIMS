
import { InventoryItem, InventoryItemWithQuantity, InventoryInstance, AvailabilityRequest, InstanceAvailabilityResult, InventoryItemForCatalog } from '../../frontend/types';
import { InventoryService } from '../services/inventoryService';

export const getInventoryApi = async (): Promise<InventoryItemWithQuantity[]> => {
    return InventoryService.getInventory();
};

export const getInventoryCatalogApi = async (startDate: string, endDate: string): Promise<InventoryItemForCatalog[]> => {
    return InventoryService.getInventoryForCatalog(startDate, endDate);
};

export const createInventoryItemApi = async (itemData: { name: string; areaId: string; photoUrl?: string; }): Promise<InventoryItem> => {
    return InventoryService.createItem(itemData);
};

export const updateInventoryItemApi = async (id: string, updates: { name: string; areaId: string; isHidden?: boolean; photoUrl?: string }): Promise<InventoryItem> => {
    return InventoryService.updateItem(id, updates);
};

export const deleteInventoryItemApi = async (id: string): Promise<void> => {
    return InventoryService.deleteItem(id);
};

// --- Instance API Methods ---

export const getInstancesByItemIdApi = async (itemId: string): Promise<InventoryInstance[]> => {
    return InventoryService.getInstancesByItemId(itemId);
}

export const createInstanceApi = async (instanceData: Omit<InventoryInstance, 'id'>): Promise<InventoryInstance> => {
    return InventoryService.createInstance(instanceData);
}

export const updateInstanceApi = async (id: string, updates: Partial<Omit<InventoryInstance, 'id' | 'itemId'>>): Promise<InventoryInstance> => {
    return InventoryService.updateInstance(id, updates);
}

export const deleteInstanceApi = async (id: string): Promise<void> => {
    return InventoryService.deleteInstance(id);
}

// --- Availability API Method ---

export const checkAvailabilityApi = async (request: AvailabilityRequest): Promise<InstanceAvailabilityResult[]> => {
    return InventoryService.checkAvailability(request);
};
