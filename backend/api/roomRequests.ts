
import { RoomRequest, RoomRequestStatus } from '../../frontend/types';
import { RoomRequestService } from '../services/roomRequestService';

const simulateNetworkDelay = <T>(data: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(data), 300));

export const getAllRoomRequestsApi = async (): Promise<RoomRequest[]> => {
    const data = await RoomRequestService.getAll();
    return simulateNetworkDelay(data);
};

export const getRoomRequestsByUserIdApi = async (userId: string): Promise<RoomRequest[]> => {
    const data = await RoomRequestService.getByUserId(userId);
    return simulateNetworkDelay(data);
};

export const getRoomRequestsByEndorserApi = async (endorserEmail: string): Promise<RoomRequest[]> => {
    const data = await RoomRequestService.getByEndorserEmail(endorserEmail);
    return simulateNetworkDelay(data);
};

export const createRoomRequestApi = async (data: Omit<RoomRequest, 'id' | 'status' | 'dateFiled'>): Promise<RoomRequest> => {
    const newRequest = await RoomRequestService.create(data);
    return simulateNetworkDelay(newRequest);
};

export const updateRoomRequestStatusApi = async (ids: string[], status: RoomRequestStatus, rejectionReason?: string): Promise<void> => {
    await RoomRequestService.updateStatusBatch(ids, status, rejectionReason);
    return simulateNetworkDelay(undefined);
};
