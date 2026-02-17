import { RoomRequestData, RoomRequest } from '../types';
import { createRoomRequestApi as createRoomRequestApiService } from '../../backend/api/roomRequests';

export const createRoomRequestApi = async (requestData: RoomRequestData): Promise<RoomRequest[]> => {
    // This function now directly calls the backend service, which handles database operations.
    return await createRoomRequestApiService(requestData);
};
