
import { EquipmentRequest, EquipmentRequestStatus } from '../../frontend/types';
import { EquipmentRequestService } from '../services/equipmentRequestService';

const simulateNetworkDelay = <T>(data: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(data), 300));

export const getAllEquipmentRequestsApi = async (): Promise<EquipmentRequest[]> => {
    const data = await EquipmentRequestService.getAll();
    return simulateNetworkDelay(data);
};

export const getEquipmentRequestsByUserIdApi = async (userId: string): Promise<EquipmentRequest[]> => {
    const data = await EquipmentRequestService.getByUserId(userId);
    return simulateNetworkDelay(data);
};

export const getEquipmentRequestsByEndorserApi = async (endorserEmail: string): Promise<EquipmentRequest[]> => {
    const data = await EquipmentRequestService.getByEndorserEmail(endorserEmail);
    return simulateNetworkDelay(data);
};

export const createEquipmentRequestApi = async (data: Omit<EquipmentRequest, 'id' | 'status' | 'dateFiled'>): Promise<EquipmentRequest[]> => {
    const itemsByArea = new Map<string, typeof data.requestedItems>();

    for (const item of data.requestedItems) {
        if (!itemsByArea.has(item.areaId)) {
            itemsByArea.set(item.areaId, []);
        }
        itemsByArea.get(item.areaId)!.push(item);
    }

    const createdRequests: EquipmentRequest[] = [];

    for (const items of itemsByArea.values()) {
        const singleAreaRequestData = {
            ...data,
            requestedItems: items,
        };

        const newRequest = await EquipmentRequestService.create(singleAreaRequestData);
        createdRequests.push(newRequest);
    }

    return simulateNetworkDelay(createdRequests);
};

export const updateEquipmentRequestStatusApi = async (ids: string[], status: EquipmentRequestStatus, rejectionReason?: string): Promise<void> => {
    await EquipmentRequestService.updateStatusBatch(ids, status, rejectionReason);
    return simulateNetworkDelay(undefined);
};
