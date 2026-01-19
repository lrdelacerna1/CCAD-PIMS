import { RoomTypeForCatalog, RoomAvailabilityRequest, RoomAvailabilityResponse } from '../types';

export const getRoomCatalogApi = async (startDate: string, endDate: string): Promise<RoomTypeForCatalog[]> => {
    const response = await fetch(`/api/rooms/catalog?startDate=${startDate}&endDate=${endDate}`);
    if (!response.ok) {
        throw new Error('Failed to fetch room catalog');
    }
    return response.json();
};

export const checkRoomAvailabilityApi = async (request: RoomAvailabilityRequest): Promise<RoomAvailabilityResponse[]> => {
    const response = await fetch('/api/rooms/availability', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
    });

    if (!response.ok) {
        throw new Error('Failed to check room availability');
    }
    return response.json();
};