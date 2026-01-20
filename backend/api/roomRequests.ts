import { RoomRequest, RoomRequestStatus } from '../../frontend/types';
import { RoomRequestService } from '../services/roomRequestService';
import { AirSlateService } from '../services/airSlateService';

const simulateNetworkDelay = <T>(data: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(data), 300));

export const getAllRoomRequestsApi = async (): Promise<RoomRequest[]> => {
    const data = await RoomRequestService.getAll();
    return simulateNetworkDelay(data);
};

export const getRoomRequestsByUserIdApi = async (userId: string): Promise<RoomRequest[]> => {
    const data = await RoomRequestService.getByUserId(userId);
    return simulateNetworkDelay(data);
};

export const createRoomRequestApi = async (data: Omit<RoomRequest, 'id' | 'status' | 'createdAt' | 'isFlaggedNoShow' | 'airSlateDocumentId' | 'airSlateSignedAt'>): Promise<{ airSlateDocumentUrl: string }> => {
    console.log('[API] Initiating AirSlate workflow for new Room Request');
    const workflowResult = AirSlateService.initiateWorkflow(data, 'room');

    if (!workflowResult) {
        throw new Error('Failed to initiate AirSlate workflow.');
    }

    return simulateNetworkDelay({ airSlateDocumentUrl: workflowResult.airSlateDocumentUrl });
};

export const updateRoomRequestStatusApi = async (ids: string[], status: RoomRequestStatus, rejectionReason?: string): Promise<void> => {
    await RoomRequestService.updateStatus(ids, status, rejectionReason);
    return simulateNetworkDelay(undefined);
};