import React, { useMemo } from 'react';
// FIX: Use specific request types instead of the legacy Reservation type.
import { EquipmentRequest, RoomRequest } from '../../types';
import RequestListItem from './RequestListItem';

// FIX: Define a union type for easier prop handling.
type AnyRequest = EquipmentRequest | RoomRequest;

interface UpcomingReservationsProps {
    reservations: AnyRequest[];
    areasMap: Map<string, string>;
    onReservationClick: (reservation: AnyRequest) => void;
}

const UpcomingReservations: React.FC<UpcomingReservationsProps> = ({ reservations, areasMap, onReservationClick }) => {

    const groupedReservations = useMemo(() => {
        const groups: { [key: string]: AnyRequest[] } = {};

        const now = new Date();
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        
        const tomorrow = new Date(today);
        tomorrow.setUTCDate(today.getUTCDate() + 1);

        reservations.forEach(res => {
            // FIX: Correctly parse the reservation date string as UTC midnight to prevent timezone bugs.
            const dateParts = res.requestedStartDate.split('T');
            const resDate = new Date(dateParts[0] + 'T00:00:00Z');
            
            let dateString;
            if (resDate.getTime() === today.getTime()) {
                dateString = 'Today';
            } else if (resDate.getTime() === tomorrow.getTime()) {
                dateString = 'Tomorrow';
            } else {
                dateString = resDate.toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    timeZone: 'UTC'
                });
            }
            
            if (!groups[dateString]) {
                groups[dateString] = [];
            }
            groups[dateString].push(res);
        });
        
        // This creates a sorted array of keys: ['Today', 'Tomorrow', 'August 1, 2024', ...]
        const sortedKeys = Object.keys(groups).sort((a, b) => {
            if (a === 'Today') return -1;
            if (b === 'Today') return 1;
            if (a === 'Tomorrow') return -1;
            if (b === 'Tomorrow') return 1;
            return new Date(a).getTime() - new Date(b).getTime();
        });

        // Return a new object with keys in the correct order.
        return sortedKeys.reduce((acc, key) => {
            acc[key] = groups[key];
            return acc;
        }, {} as { [key: string]: AnyRequest[] });

    }, [reservations]);

    if (reservations.length === 0) {
        return <p className="text-gray-500 dark:text-gray-400 text-center py-4">There are no upcoming approved reservations.</p>;
    }

    const getAreaId = (req: AnyRequest) => {
        if ('requestedItems' in req && req.requestedItems.length > 0) return req.requestedItems[0]?.areaId || '';
        if ('areaId' in req && (req as any).areaId) return (req as any).areaId;
        
        if ('requestedRoom' in req) {
             const rr = (req as any).requestedRoom;
             if (Array.isArray(rr) && rr.length > 0) return rr[0].areaId;
             if (!Array.isArray(rr) && rr) return rr.areaId;
        }
        return '';
    };

    return (
        <div className="space-y-4">
            {Object.keys(groupedReservations).map(date => {
                const resList = groupedReservations[date];
                return (
                    <div key={date}>
                        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2 border-b dark:border-gray-600 pb-1 text-center">{date}</h3>
                        <div className="space-y-2">
                            {resList.map(res => (
                                 <RequestListItem
                                    key={res.id}
                                    reservation={res}
                                    areaName={areasMap.get(getAreaId(res)) || 'Unknown Area'}
                                    onClick={() => onReservationClick(res)}
                                />
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    );
};

export default UpcomingReservations;
