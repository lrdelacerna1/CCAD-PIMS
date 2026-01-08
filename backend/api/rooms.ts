
import { RoomType, RoomInstance, RoomTypeWithQuantity, RoomAvailabilityRequest, RoomInstanceAvailabilityResult, RoomTypeForCatalog } from '../../frontend/types';
import { RoomService } from '../services/roomService';

const simulateNetworkDelay = <T>(data: T): Promise<T> => new Promise(resolve => setTimeout(() => resolve(data), 300));

export const getRoomTypesApi = async (): Promise<RoomTypeWithQuantity[]> => {
    const data = await RoomService.getRoomTypes();
    return simulateNetworkDelay(data);
};

export const getRoomCatalogApi = async (startDate: string, endDate: string): Promise<RoomTypeForCatalog[]> => {
    const data = await RoomService.getRoomTypesForCatalog(startDate, endDate);
    return simulateNetworkDelay(data);
};

export const createRoomTypeApi = async (data: { name: string; areaId: string }): Promise<RoomType> => {
    const data_ = await RoomService.createRoomType(data);
    return simulateNetworkDelay(data_);
};

export const updateRoomTypeApi = async (id: string, updates: { name: string; areaId: string; isHidden?: boolean }): Promise<RoomType> => {
    const data = await RoomService.updateRoomType(id, updates);
    return simulateNetworkDelay(data);
};

export const deleteRoomTypeApi = async (id: string): Promise<void> => {
    await RoomService.deleteRoomType(id);
    return simulateNetworkDelay(undefined);
};

export const getInstancesByRoomTypeIdApi = async (roomTypeId: string): Promise<RoomInstance[]> => {
    const data = await RoomService.getInstancesByRoomTypeId(roomTypeId);
    return simulateNetworkDelay(data);
};

export const createRoomInstanceApi = async (data: Omit<RoomInstance, 'id'>): Promise<RoomInstance> => {
    const data_ = await RoomService.createRoomInstance(data);
    return simulateNetworkDelay(data_);
};

export const updateRoomInstanceApi = async (id: string, updates: Partial<Omit<RoomInstance, 'id' | 'roomTypeId'>>): Promise<RoomInstance> => {
    const data = await RoomService.updateRoomInstance(id, updates);
    return simulateNetworkDelay(data);
};

export const deleteRoomInstanceApi = async (id: string): Promise<void> => {
    await RoomService.deleteRoomInstance(id);
    return simulateNetworkDelay(undefined);
};

export const checkRoomAvailabilityApi = async (request: RoomAvailabilityRequest): Promise<RoomInstanceAvailabilityResult[]> => {
    const data = await RoomService.checkRoomAvailability(request);
    return simulateNetworkDelay(data);
};
