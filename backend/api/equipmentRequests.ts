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

export const createEquipmentRequestApi = async (data: Omit<EquipmentRequest, 'id' | 'status' | 'dateFiled'>): Promise<EquipmentRequest> => {
    const newRequest = await EquipmentRequestService.create(data);
    return simulateNetworkDelay(newRequest);
};

export const updateEquipmentRequestStatusApi = async (ids: string[], status: EquipmentRequestStatus, rejectionReason?: string): Promise<void> => {
    await EquipmentRequestService.updateStatus(ids, status, rejectionReason);
    return simulateNetworkDelay(undefined);
};