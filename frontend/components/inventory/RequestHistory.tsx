
import React, { useState, useEffect, useMemo } from 'react';
import { EquipmentRequest, RoomRequest, UserRole } from '../../types';
import { getAllEquipmentRequestsApi } from '../../../backend/api/equipmentRequests';
import { getAllRoomRequestsApi } from '../../../backend/api/roomRequests';
import { format } from 'date-fns';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { SearchIcon, DocumentDuplicateIcon, CheckCircleIcon } from '../Icons';

// Placeholder types for audit logs until backend support is added
interface ConditionChangeLog {
    id: string;
    targetId: string; // instanceId
    type: 'condition_change';
    newCondition: string;
    changedBy: string; // Admin name
    date: string;
}

// Mock data generator for condition logs (since backend endpoint doesn't exist yet)
const mockConditionLogs: ConditionChangeLog[] = [
    { id: '1', targetId: 'mock', type: 'condition_change', newCondition: 'Good', changedBy: 'Admin User', date: new Date().toISOString() },
];

interface RequestHistoryProps {
    itemId?: string; // For equipment (legacy prop, might be instanceId in future if strictly instance based)
    instanceId?: string; // For rooms or specific equipment instance
}

type HistoryView = 'reservations' | 'condition';

const RequestHistory: React.FC<RequestHistoryProps> = ({ itemId, instanceId }) => {
    const [activeView, setActiveView] = useState<HistoryView>('reservations');
    const [reservations, setReservations] = useState<(EquipmentRequest | RoomRequest)[]>([]);
    const [conditionLogs, setConditionLogs] = useState<ConditionChangeLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [userTypeFilter, setUserTypeFilter] = useState<UserRole | 'all'>('all');

    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                let requests: (EquipmentRequest | RoomRequest)[] = [];
                
                // Fetch Reservations
                if (itemId) {
                    const allRequests = await getAllEquipmentRequestsApi();
                    // Filter for approved/completed requests only as per requirement
                    requests = allRequests.filter(req => 
                        ['Approved', 'Ready for Pickup', 'In Use', 'Returned', 'Overdue', 'Completed'].includes(req.status)
                    );

                    if (instanceId) {
                         // Filter by specific instance assignment if instanceId is provided (for equipment)
                         requests = requests.filter(req => 
                            req.assignedItems?.some(item => item.instanceId === instanceId)
                        );
                    } else if (itemId) {
                         requests = requests.filter(req => 
                            req.requestedItems.some(item => item.itemId === itemId)
                        );
                    }

                } else if (instanceId) {
                    // Room requests
                    const allRequests = await getAllRoomRequestsApi();
                    requests = allRequests.filter(req => 
                        req.instanceId === instanceId &&
                        ['Approved', 'Ready for Check-in', 'In Use', 'Completed', 'Overdue'].includes(req.status)
                    );
                }
                
                setReservations(requests.sort((a, b) => new Date(b.dateFiled).getTime() - new Date(a.dateFiled).getTime()));

                // Fetch Condition Logs (Mocked for now as backend doesn't seem to store audit logs for condition changes yet)
                setConditionLogs(mockConditionLogs.filter(log => log.targetId === instanceId || log.targetId === 'mock')); // Showing mock for demo

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

    const filteredReservations = useMemo(() => {
        let filtered = reservations;

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(req => req.userName.toLowerCase().includes(query));
        }

        if (userTypeFilter !== 'all') {
             // Placeholder: assuming we can't easily filter by role without extra fetch.
        }

        return filtered;
    }, [reservations, searchQuery, userTypeFilter]);

    const handleCopy = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (isLoading) {
        return <p className="text-center dark:text-slate-300 py-8">Loading history...</p>;
    }

    return (
        <div className="space-y-4">
            <div className="flex gap-4 mb-4">
                <div className="w-48">
                    <Select
                        value={activeView}
                        onChange={(e) => setActiveView(e.target.value as HistoryView)}
                        options={[
                            { value: 'reservations', label: 'Reservations' },
                            { value: 'condition', label: 'Condition Changes' },
                        ]}
                    />
                </div>
                {activeView === 'reservations' && (
                    <div className="flex-1">
                        <Input
                            placeholder="Search by requestor name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            icon={<SearchIcon className="w-4 h-4" />}
                        />
                    </div>
                )}
            </div>

            {activeView === 'reservations' && (
                <>
                    {filteredReservations.length === 0 ? (
                        <p className="text-center text-slate-500 dark:text-slate-400 py-4">No approved reservations found.</p>
                    ) : (
                        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Request ID</th>
                                        <th scope="col" className="px-6 py-3">Requestor</th>
                                        <th scope="col" className="px-6 py-3">Dates Used</th>
                                        <th scope="col" className="px-6 py-3">Date Filed</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredReservations.map(req => (
                                        <tr key={req.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                                            <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">
                                                <div className="flex items-center space-x-2">
                                                    <span className="truncate max-w-[100px]" title={req.id}>{req.id}</span>
                                                    <button 
                                                        onClick={() => handleCopy(req.id)}
                                                        className="text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 transition-colors"
                                                        title="Copy ID"
                                                    >
                                                        {copiedId === req.id ? <CheckCircleIcon className="w-4 h-4 text-green-500" /> : <DocumentDuplicateIcon className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">
                                                {req.userName}
                                                <div className="text-xs text-slate-500 dark:text-slate-400">{req.userContact}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {format(new Date(req.requestedStartDate), 'MMM d, yyyy')} - {format(new Date(req.requestedEndDate), 'MMM d, yyyy')}
                                            </td>
                                            <td className="px-6 py-4">
                                                {format(new Date(req.dateFiled), 'MMM d, yyyy')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {activeView === 'condition' && (
                <>
                    {conditionLogs.length === 0 ? (
                        <p className="text-center text-slate-500 dark:text-slate-400 py-4">No condition changes recorded.</p>
                    ) : (
                        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Change</th>
                                        <th scope="col" className="px-6 py-3">Admin</th>
                                        <th scope="col" className="px-6 py-3">Date</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {conditionLogs.map(log => (
                                        <tr key={log.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                                            <td className="px-6 py-4">
                                                Marked <span className="font-semibold text-slate-900 dark:text-white">{log.newCondition}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {log.changedBy}
                                            </td>
                                            <td className="px-6 py-4">
                                                {format(new Date(log.date), 'MMM d, yyyy HH:mm')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default RequestHistory;
