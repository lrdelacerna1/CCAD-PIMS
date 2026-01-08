import React, { useState, useEffect } from 'react';
import { EquipmentRequest } from '../../types';
import { getAllEquipmentRequestsApi } from '../../../backend/api/equipmentRequests';
import { format } from 'date-fns';

interface RequestHistoryProps {
    itemId: string;
}

const RequestHistory: React.FC<RequestHistoryProps> = ({ itemId }) => {
    const [history, setHistory] = useState<EquipmentRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const allRequests = await getAllEquipmentRequestsApi();
                const itemHistory = allRequests.filter(req =>
                    req.requestedItems.some(item => item.itemId === itemId)
                );
                // Sort by most recent start date
                itemHistory.sort((a, b) => new Date(b.requestedStartDate).getTime() - new Date(a.requestedStartDate).getTime());
                setHistory(itemHistory);
            } catch (error) {
                console.error("Failed to fetch request history", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, [itemId]);

    if (isLoading) {
        return <div className="text-sm text-center text-slate-500 dark:text-slate-400 p-4">Loading history...</div>;
    }

    if (history.length === 0) {
        return <div className="text-sm text-center text-slate-500 dark:text-slate-400 p-4">No request history found for this item.</div>;
    }

    return (
        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-b-md max-h-64 overflow-y-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-600 dark:text-slate-400">
                    <tr>
                        <th className="py-2 px-3 font-medium">Requestor</th>
                        <th className="py-2 px-3 font-medium">Dates Used</th>
                        <th className="py-2 px-3 font-medium">Status</th>
                    </tr>
                </thead>
                <tbody className="text-slate-800 dark:text-slate-200">
                    {history.map(req => (
                        <tr key={req.id} className="border-t border-slate-200 dark:border-slate-600">
                            <td className="py-2 px-3">{req.userName}</td>
                            <td className="py-2 px-3">
                                {format(new Date(req.requestedStartDate + 'T00:00:00Z'), 'MMM d, yy')} - {format(new Date(req.requestedEndDate + 'T00:00:00Z'), 'MMM d, yy')}
                            </td>
                            <td className="py-2 px-3">{req.status}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default RequestHistory;
