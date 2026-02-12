import React, { useState, useEffect } from 'react';
import { EquipmentRequest, RoomRequest } from '../../types';
import { getAllEquipmentRequestsApi } from '../../../backend/api/equipmentRequests';
import { getAllRoomRequestsApi } from '../../../backend/api/roomRequests';
import { format } from 'date-fns';

interface RequestHistoryProps {
    itemId?: string;
    instanceId?: string;
}

const RequestHistory: React.FC<RequestHistoryProps> = ({ itemId, instanceId }) => {
    const [history, setHistory] = useState<(EquipmentRequest | RoomRequest)[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                let requests: (EquipmentRequest | RoomRequest)[] = [];
                if (itemId) {
                    const allRequests = await getAllEquipmentRequestsApi();
                    requests = allRequests.filter(req => 
                        req.requestedItems.some(item => item.itemId === itemId)
                    );
                } else if (instanceId) {
                    const allRequests = await getAllRoomRequestsApi();
                    requests = allRequests.filter(req => req.instanceId === instanceId);
                }
                setHistory(requests.sort((a, b) => new Date(b.dateFiled).getTime() - new Date(a.dateFiled).getTime()));
            } catch (error) {
                console.error("Failed to fetch history:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (itemId || instanceId) {
            fetchHistory();
        }
    }, [itemId, instanceId]);

    if (isLoading) {
        return <p className="text-center dark:text-slate-300 py-8">Loading history...</p>;
    }

    if (history.length === 0) {
        return (
            <div className="text-center py-10">
                <p className="text-slate-500 dark:text-slate-400">No request history found.</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                    <tr>
                        <th scope="col" className="px-6 py-3">User</th>
                        <th scope="col" className="px-6 py-3">Purpose</th>
                        <th scope="col" className="px-6 py-3">Dates</th>
                        <th scope="col" className="px-6 py-3">Status</th>
                        <th scope="col" className="px-6 py-3">Date Filed</th>
                    </tr>
                </thead>
                <tbody>
                    {history.map(req => (
                        <tr key={req.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                            <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">
                                {req.userName}
                            </td>
                            <td className="px-6 py-4">
                                {req.purpose}
                            </td>
                            <td className="px-6 py-4">
                                {format(new Date(req.requestedStartDate), 'MMM d, yyyy')} - {format(new Date(req.requestedEndDate), 'MMM d, yyyy')}
                            </td>
                            <td className="px-6 py-4">
                                {req.status}
                            </td>
                            <td className="px-6 py-4">
                                {format(new Date(req.dateFiled), 'MMM d, yyyy')}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default RequestHistory;
