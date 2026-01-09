import { RoomType, RoomInstance, RoomTypeWithQuantity, RoomAvailabilityRequest, RoomInstanceAvailabilityResult, RoomTypeForCatalog } from '../../frontend/types';
import { RoomService } from '../services/roomService';

export const getRoomTypesApi = async (): Promise<RoomTypeWithQuantity[]> => {
    return RoomService.getRoomTypes();
};

export const getRoomCatalogApi = async (startDate: string, endDate: string): Promise<RoomTypeForCatalog[]> => {
    return RoomService.getRoomTypesForCatalog(startDate, endDate);
};

export const createRoomTypeApi = async (data: { name: string; areaId: string }): Promise<RoomType> => {
    return RoomService.createRoomType(data);
};

export const updateRoomTypeApi = async (id: string, updates: { name: string; areaId: string; isHidden?: boolean }): Promise<RoomType> => {
    return RoomService.updateRoomType(id, updates);
};

export const deleteRoomTypeApi = async (id: string): Promise<void> => {
    return RoomService.deleteRoomType(id);
};

export const getInstancesByRoomTypeIdApi = async (roomTypeId: string): Promise<RoomInstance[]> => {
    return RoomService.getInstancesByRoomTypeId(roomTypeId);
};

export const createRoomInstanceApi = async (data: Omit<RoomInstance, 'id'>): Promise<RoomInstance> => {
    return RoomService.createRoomInstance(data);
};

export const updateRoomInstanceApi = async (id: string, updates: Partial<Omit<RoomInstance, 'id' | 'roomTypeId'>>): Promise<RoomInstance> => {
    return RoomService.updateRoomInstance(id, updates);
};

export const deleteRoomInstanceApi = async (id: string): Promise<void> => {
    return RoomService.deleteRoomInstance(id);
};

export const checkRoomAvailabilityApi = async (request: RoomAvailabilityRequest): Promise<RoomInstanceAvailabilityResult[]> => {
    return RoomService.checkRoomAvailability(request);
};
