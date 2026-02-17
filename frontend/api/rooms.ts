
import { RoomTypeForCatalog, RoomAvailabilityRequest, RoomAvailabilityResponse } from '../types';
import { getRoomCatalogApi as getRoomCatalogApiService, checkRoomAvailabilityApi as checkRoomAvailabilityApiService } from '../../backend/api/rooms';

export const getRoomCatalogApi = async (startDate: string, endDate: string): Promise<RoomTypeForCatalog[]> => {
    return await getRoomCatalogApiService(startDate, endDate);
};

export const checkRoomAvailabilityApi = async (request: RoomAvailabilityRequest): Promise<RoomAvailabilityResponse[]> => {
    return await checkRoomAvailabilityApiService(request);
};
