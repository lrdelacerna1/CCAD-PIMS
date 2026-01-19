import { RoomRequestData } from '../types';

export const createRoomRequestApi = async (requestData: RoomRequestData): Promise<void> => {
    const response = await fetch('/api/room-requests', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create room request.');
    }
};