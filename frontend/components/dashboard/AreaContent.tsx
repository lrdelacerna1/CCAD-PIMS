import React, { useState, useEffect, useMemo } from 'react';
// FIX: Use specific request types instead of the legacy Reservation type.
import { Area, EquipmentRequest, RoomRequest } from '../../types';
// FIX: Import from existing APIs for equipment and room requests.
import { getAllEquipmentRequestsApi } from '../../../backend/api/equipmentRequests';
import { getAllRoomRequestsApi } from '../../../backend/api/roomRequests';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { SearchIcon } from '../Icons';

// NOTE: ReservationDetailsModal component is missing from the project files.
// The import and usage have been commented out to resolve build errors.
// import ReservationDetailsModal from './ReservationDetailsModal';

// FIX: Combined request type for unified handling.
type AnyRequest = EquipmentRequest | RoomRequest;

const StatusBadge: React.FC<{ status: AnyRequest['status'] }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full capitalize";
    // FIX: Aligned status classes with the new combined status types.
    const statusKey = status.split(' ')[0].toLowerCase();
    const statusClasses: { [key: string]: string } = {
        'approved': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
        'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
        'rejected': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
        'ready': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
        'equipment': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
        'overdue': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
        'returned': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        'closed': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
        'cancelled': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
        'checked': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
    };
    return <span className={`${baseClasses} ${statusClasses[statusKey] || statusClasses['closed']}`}>{status}</span>;
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
                // FIX: Fetch from both equipment and room APIs and combine results.
                const [equipmentData, roomData] = await Promise.all([
                    getAllEquipmentRequestsApi(),
                    getAllRoomRequestsApi(),
                ]);
                const allRequests: AnyRequest[] = [...equipmentData, ...roomData];
                const areaRequests = allRequests.filter(req => {
                    if ('requestedItems' in req) {
                        return req.requestedItems.some(item => item.areaId === area.id);
                    }
                    if ('requestedRoom' in req) {
                        return req.requestedRoom.areaId === area.id;
                    }
                    return false;
                });
                setRequests(areaRequests);
            } catch (err) {
                setError('Failed to load request data.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchRequests();
    }, [area.id]);

    const displayedRequests = useMemo(() => {
        let processedRequests = [...requests];

        // 1. Filter by status
        if (statusFilter !== 'all') {
            processedRequests = processedRequests.filter(res => res.status === statusFilter);
        }

        // 2. Filter by search query (case-insensitive on reserver's name)
        if (searchQuery.trim() !== '') {
            processedRequests = processedRequests.filter(res => 
                res.userName.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // 3. Sort by date
        processedRequests.sort((a, b) => {
            const dateA = new Date(a.requestedStartDate).getTime();
            const dateB = new Date(b.requestedStartDate).getTime();
            // FIX: Corrected sort logic from 'dateA - b' to 'dateB - dateA' for newest first.
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        return processedRequests;
    }, [requests, statusFilter, searchQuery, sortOrder]);

    const handleViewDetails = (request: AnyRequest) => {
        setSelectedRequest(request);
    };

    const handleCloseModal = () => {
        setSelectedRequest(null);
    };

    // FIX: Get all unique statuses from the current requests.
    const statusFilterOptions = useMemo(() => {
        const allStatuses = new Set(requests.map(r => r.status));
        return [
            { label: 'All Statuses', value: 'all' },
            ...Array.from(allStatuses).map(s => ({ label: s, value: s }))
        ];
    }, [requests]);
    
    return (
        <>
            <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {area.name} - All Requests
                </h2>
                
                {/* Search, Filter, and Sort Controls */}
                <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                           <Input 
                                label="Search by name"
                                id="search-reservations"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="e.g., Alice Johnson"
                                icon={<SearchIcon className="w-5 h-5" />}
                           />
                        </div>
                        <div>
                            <Select
                                label="Filter by status"
                                id="status-filter"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                options={statusFilterOptions}
                            />
                        </div>
                         <div>
                            <Select
                                label="Sort by date"
                                id="sort-order"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                                options={[
                                    { value: 'newest', label: 'Newest First' },
                                    { value: 'oldest', label: 'Oldest First' },
                                ]}
                            />
                        </div>
                    </div>
                </div>
                
                {isLoading && <p className="dark:text-gray-300">Loading requests...</p>}
                {error && <p className="text-red-500">{error}</p>}
                
                {!isLoading && !error && (
                    <div className="space-y-3">
                        {displayedRequests.length > 0 ? (
                            displayedRequests.map(res => (
                                <div 
                                    key={res.id} 
                                    onClick={() => handleViewDetails(res)}
                                    className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors border dark:border-gray-700"
                                >
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Reserved By</p>
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">{res.userName}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Date</p>
                                            <p className="text-gray-800 dark:text-gray-200">{new Date(res.requestedStartDate).toLocaleDateString(undefined, { timeZone: 'UTC' })}</p>
                                        </div>
                                        <div className="sm:text-right">
                                             <p className="text-sm font-medium text-gray-500 dark:text-gray-400 sm:hidden mb-1">Status</p>
                                            <StatusBadge status={res.status} />
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                             <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                                {requests.length > 0 ? 'No requests match your criteria.' : 'No requests found for this area.'}
                             </p>
                        )}
                    </div>
                )}
            </div>
            
            {/* {selectedRequest && (
                <ReservationDetailsModal 
                    reservation={selectedRequest} 
                    onClose={handleCloseModal} 
                />
            )} */}
        </>
    );
};

export default AreaContent;
