import React from 'react';
// FIX: Use specific request types instead of the legacy Reservation type.
import { EquipmentRequest, RoomRequest } from '../../types';
import RequestListItem from './RequestListItem';

// FIX: Define a union type for easier prop handling.
type AnyRequest = EquipmentRequest | RoomRequest;

interface ReturnsListProps {
    title: string;
    reservations: AnyRequest[];
    areasMap: Map<string, string>;
    onReservationClick: (reservation: AnyRequest) => void;
    emptyMessage: string;
}

const ReturnsList: React.FC<ReturnsListProps> = ({ title, reservations, areasMap, onReservationClick, emptyMessage }) => {
    const getAreaId = (req: AnyRequest) => {
      if ('requestedItems' in req) return req.requestedItems[0]?.areaId || '';
      if ('requestedRoom' in req) return req.requestedRoom.areaId;
      return '';
    };
    
    return (
        <div>
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2 border-b dark:border-gray-600 pb-1 text-center">{title}</h3>
            {reservations.length > 0 ? (
                <div className="space-y-2">
                    {reservations.map(res => (
                        <RequestListItem
                            key={res.id}
                            reservation={res}
                            areaName={areasMap.get(getAreaId(res)) || 'Unknown Area'}
                            onClick={() => onReservationClick(res)}
                        />
                    ))}
                </div>
            ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-2">{emptyMessage}</p>
            )}
        </div>
    );
};

export default ReturnsList;
