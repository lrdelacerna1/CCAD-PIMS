import React, { useState, useEffect, useMemo } from 'react';
import { Area, EquipmentRequest, RoomRequest } from '../../types';
import { getAllEquipmentRequestsApi } from '../../../backend/api/equipmentRequests';
import { getAllRoomRequestsApi } from '../../../backend/api/roomRequests';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { SearchIcon } from '../Icons';

type AnyRequest = EquipmentRequest | RoomRequest;

// Type guards — these let TypeScript narrow the union properly
const isEquipmentRequest = (req: AnyRequest): req is EquipmentRequest =>
    'requestedItems' in req;

const isRoomRequest = (req: AnyRequest): req is RoomRequest =>
    'roomTypeId' in req;

const StatusBadge: React.FC<{ status: AnyRequest['status'] }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full capitalize";
    const statusKey = status.split(' ')[0].toLowerCase();
    const statusClasses: Record<string, string> = {
        'approved': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        'rejected': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        'ready': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        'in': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
        'overdue': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
        'returned': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        'completed': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        'cancelled': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    };
    return (
        <span className={`${baseClasses} ${statusClasses[statusKey] ?? statusClasses['completed']}`}>
            {status}
        </span>
    );
};

const AreaContent: React.FC<{ area: Area }> = ({ area }) => {
    const [requests, setRequests] = useState<AnyRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedRequest, setSelectedRequest] = useState<AnyRequest | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    useEffect(() => {
        const fetchRequests = async () => {
            setIsLoading(true);
            setError('');
            try {
                const [equipmentData, roomData] = await Promise.all([
                    getAllEquipmentRequestsApi(),
                    getAllRoomRequestsApi(),
                ]);

                const allRequests: AnyRequest[] = [
                    ...(equipmentData as EquipmentRequest[]),
                    ...(roomData as RoomRequest[]),
                ];

                // Both EquipmentRequest and RoomRequest have a top-level areaId field
                // so we can filter directly without needing to check nested objects
                const areaRequests = allRequests.filter(req => req.areaId === area.id);

                setRequests(areaRequests);
            } catch (err) {
                setError("We couldn't load your request data at the moment. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchRequests();
    }, [area.id]);

    const displayedRequests = useMemo(() => {
        let processed = [...requests];

        if (statusFilter !== 'all') {
            processed = processed.filter(req => req.status === statusFilter);
        }

        if (searchQuery.trim() !== '') {
            processed = processed.filter(req =>
                req.userName.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        processed.sort((a, b) => {
            const dateA = new Date(a.requestedStartDate).getTime();
            const dateB = new Date(b.requestedStartDate).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        return processed;
    }, [requests, statusFilter, searchQuery, sortOrder]);

    const statusFilterOptions = useMemo(() => {
        const allStatuses = new Set(requests.map(r => r.status));
        return [
            { label: 'All Statuses', value: 'all' },
            ...Array.from(allStatuses).map(s => ({ label: s, value: s })),
        ];
    }, [requests]);

    return (
        <>
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {area.name} - All Requests
                </h2>

                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Input
                            label="Search by name"
                            id="search-reservations"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="e.g., Alice Johnson"
                            icon={<SearchIcon className="w-5 h-5" />}
                        />
                        <Select
                            label="Filter by status"
                            id="status-filter"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            options={statusFilterOptions}
                        />
                        <Select
                            label="Sort by date"
                            id="sort-order"
                            value={sortOrder}
                            onChange={e => setSortOrder(e.target.value as 'newest' | 'oldest')}
                            options={[
                                { value: 'newest', label: 'Newest First' },
                                { value: 'oldest', label: 'Oldest First' },
                            ]}
                        />
                    </div>
                </div>

                {isLoading && <p className="dark:text-gray-300">Loading requests...</p>}
                {error && <p className="text-red-500">{error}</p>}

                {!isLoading && !error && (
                    <div className="space-y-3">
                        {displayedRequests.length > 0 ? (
                            displayedRequests.map(req => (
                                <div
                                    key={req.id}
                                    onClick={() => setSelectedRequest(req)}
                                    className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors border dark:border-gray-700"
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Reserved By</p>
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">{req.userName}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Date</p>
                                            <p className="text-gray-800 dark:text-gray-200">
                                                {new Date(req.requestedStartDate).toLocaleDateString(undefined, { timeZone: 'UTC' })}
                                            </p>
                                        </div>
                                        <div className="sm:text-right">
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:hidden mb-1">Status</p>
                                            <StatusBadge status={req.status} />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                                {requests.length > 0
                                    ? 'No requests match your criteria.'
                                    : 'No requests found for this area.'}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* {selectedRequest && (
                <ReservationDetailsModal
                    reservation={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                />
            )} */}
        </>
    );
};

export default AreaContent;