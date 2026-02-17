import React from 'react';
// FIX: Use specific request types instead of the legacy Reservation type.
import { EquipmentRequest, RoomRequest } from '../../types';

// FIX: Define a union type for easier prop handling.
type AnyRequest = EquipmentRequest | RoomRequest;

interface RequestListItemProps {
    reservation: AnyRequest;
    areaName: string;
    onClick: () => void;
}

const RequestListItem: React.FC<RequestListItemProps> = ({ reservation, areaName, onClick }) => {
    // FIX: Determine start time based on request type.
    const startTime = (reservation as any).requestedStartTime || 'All Day';
    const endTime = (reservation as any).requestedEndTime || '';
    
    return (
        <div
            onClick={onClick}
            className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors border dark:border-gray-200 dark:border-gray-700"
        >
            <div className="flex flex-col sm:flex-row justify-between">
                <div>
                    {/* FIX: Use 'userName' property from the new request types. */}
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{reservation.userName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{areaName}</p>
                </div>
                <div className="text-left sm:text-right mt-2 sm:mt-0">
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                        {/* FIX: Use 'requestedStartDate' property from the new request types. */}
                        {new Date(reservation.requestedStartDate).toLocaleDateString(undefined, {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            timeZone: 'UTC'
                        })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {startTime} {endTime && `- ${endTime}`}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default RequestListItem;
