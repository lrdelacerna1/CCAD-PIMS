
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

export const createRoomRequestApi = async (data: any): Promise<RoomRequest[]> => {
    const roomsByArea = new Map<string, any[]>();

    if (data.requestedRoom && Array.isArray(data.requestedRoom)) {
        for (const room of data.requestedRoom) {
            if (!roomsByArea.has(room.areaId)) {
                roomsByArea.set(room.areaId, []);
            }
            roomsByArea.get(room.areaId)!.push(room);
        }
    } else {
        // Fallback for legacy data structure if any (though new modal sends requestedRoom)
        // If data has areaId already?
         if (data.areaId) {
             roomsByArea.set(data.areaId, []);
         }
    }

    const createdRequests: RoomRequest[] = [];

    for (const [areaId, rooms] of roomsByArea.entries()) {
        const singleAreaRequestData = {
            ...data,
            requestedRoom: rooms,
            areaId: areaId
        };

        const newRequest = await RoomRequestService.create(singleAreaRequestData);
        createdRequests.push(newRequest);
    }

    return simulateNetworkDelay(createdRequests);
};

export const updateRoomRequestStatusApi = async (ids: string[], status: RoomRequestStatus, rejectionReason?: string): Promise<void> => {
    await RoomRequestService.updateStatusBatch(ids, status, rejectionReason);
    return simulateNetworkDelay(undefined);
};
