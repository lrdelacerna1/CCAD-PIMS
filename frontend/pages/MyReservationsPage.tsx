
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { Area, EquipmentRequest, RoomRequest, Penalty, AllEquipmentRequestStatuses, AllRoomRequestStatuses, EquipmentRequestStatus, RoomRequestStatus } from '../types';
import { getAreasApi } from '../../backend/api/areas';
import { getEquipmentRequestsByUserIdApi, updateEquipmentRequestStatusApi } from '../../backend/api/equipmentRequests';
import { getRoomRequestsByUserIdApi, updateRoomRequestStatusApi } from '../../backend/api/roomRequests';
import { getPenaltiesByUserIdApi } from '../../backend/api/penalties';
import { Button } from '../components/ui/Button';
import { format, startOfDay, endOfDay, isBefore, isAfter, isWithinInterval } from 'date-fns';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { SearchIcon, ClockIcon, XIcon } from '../components/Icons';
import ReservationDetailsModal from '../components/reservations/ReservationDetailsModal';

// --- Reusable Components ---

type AnyRequest = EquipmentRequest | RoomRequest;

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full capitalize whitespace-nowrap";
    const colorKey = status.split(' ')[0].toLowerCase();
    const colors: { [key: string]: string } = {
        'approved': 'bg-up-green-100 text-up-green-800 dark:bg-up-green-900/40 dark:text-up-green-300',
        'pending': 'bg-up-gold-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
        'for': 'bg-up-gold-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
        'rejected': 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
        'ready': 'bg-up-green-100 text-up-green-800 dark:bg-up-green-900/40 dark:text-up-green-300',
        'equipment': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
        'overdue': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
        'returned': 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
        'closed': 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
        'cancelled': 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        'checked': 'bg-up-green-100 text-up-green-800 dark:bg-up-green-900/40 dark:text-up-green-300',
    };
    return <span className={`${baseClasses} ${colors[colorKey] || colors['closed']}`}>{status}</span>;
};


const RequestsTable: React.FC<{
    requests: AnyRequest[];
    onCancel: (req: AnyRequest) => void;
    onRowClick: (req: AnyRequest) => void;
    areasMap: Map<string, string>;
    resourceType: 'equipment' | 'room';
}> = ({ requests, onCancel, onRowClick, areasMap, resourceType }) => {
    
    const getItemName = (req: AnyRequest) => 'requestedItems' in req ? req.requestedItems[0]?.name || 'N/A' : ('requestedRoom' in req ? req.requestedRoom.name : 'N/A');
    const getAreaName = (req: AnyRequest) => {
        const areaId = 'requestedItems' in req ? req.requestedItems[0]?.areaId : ('requestedRoom' in req ? req.requestedRoom.areaId : '');
        return areasMap.get(areaId) || 'Unknown Area';
    };
    const getDateTimeString = (req: AnyRequest) => {
        const start = format(new Date(req.requestedStartDate + 'T00:00:00Z'), 'MMM d, yyyy');
        if ('requestedItems' in req) {
            const end = format(new Date(req.requestedEndDate + 'T00:00:00Z'), 'MMM d, yyyy');
            return start === end ? start : `${start} to ${end}`;
        } else {
            return `${start} at ${'requestedStartTime' in req ? req.requestedStartTime : ''} - ${'requestedEndTime' in req ? req.requestedEndTime : ''}`;
        }
    };
    const canCancel = (req: AnyRequest) => {
        const cancellableEquipmentStatuses: EquipmentRequestStatus[] = ['Pending Endorsement', 'Pending Approval', 'Approved', 'Ready for Pickup'];
        const cancellableRoomStatuses: RoomRequestStatus[] = ['Pending Endorsement', 'Pending Approval', 'Approved', 'Ready for Check-in'];
        return 'requestedItems' in req ? cancellableEquipmentStatuses.includes(req.status) : cancellableRoomStatuses.includes(req.status);
    };

    if (requests.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-x-auto border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400 font-heading">
                    <tr>
                        <th scope="col" className="px-6 py-3">{resourceType === 'equipment' ? 'Item' : 'Room'}</th>
                        <th scope="col" className="px-6 py-3">Area</th>
                        <th scope="col" className="px-6 py-3">Date & Time</th>
                        <th scope="col" className="px-6 py-3">Status</th>
                        <th scope="col" className="px-6 py-3">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {requests.map((req, index) => (
                        <tr 
                            key={req.id} 
                            onClick={() => onRowClick(req)}
                            className={`bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 cursor-pointer ${req.status === 'Overdue' ? 'bg-rose-50 dark:bg-rose-900/20' : ''}`}
                        >
                            <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">
                                {getItemName(req)}
                            </td>
                            <td className="px-6 py-4">{getAreaName(req)}</td>
                            <td className="px-6 py-4">{getDateTimeString(req)}</td>
                            <td className="px-6 py-4"><StatusBadge status={req.status} /></td>
                            <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                {canCancel(req) && (
                                    <Button variant="danger" className="!w-auto !py-1 !px-3 text-xs" onClick={() => onCancel(req)}>
                                        Cancel
                                    </Button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


const PenaltyHistoryList: React.FC<{ penalties: Penalty[], requests: (EquipmentRequest | RoomRequest)[] }> = ({ penalties, requests }) => {
    if (penalties.length === 0) {
        return <p className="text-slate-500 dark:text-slate-400 text-center py-6">You have no outstanding or past penalties.</p>;
    }

    const getRequestPurpose = (penalty: Penalty) => {
        const req = requests.find(r => r.id === (penalty.requestId));
        return req?.purpose || 'General Penalty';
    };

    return (
        <div className="space-y-4">
            {penalties.map(penalty => (
                <div key={penalty.id} className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                        <div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Amount</p>
                            <p className="font-semibold text-xl text-slate-800 dark:text-slate-200">₱{penalty.amount.toFixed(2)}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Reason</p>
                            <p className="text-slate-800 dark:text-slate-200">{penalty.reason}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Related to: {getRequestPurpose(penalty)}</p>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-2">
                             <span className={`px-2 py-1 text-xs font-medium rounded-full ${penalty.isPaid ? 'bg-up-green-100 text-up-green-800 dark:bg-up-green-900/40 dark:text-up-green-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'}`}>
                                {penalty.isPaid ? 'Paid' : 'Unpaid'}
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Issued: {format(new Date(penalty.createdAt), 'MMM d, yyyy')}
                            </p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const AllUserHistoryModal: React.FC<{ userId: string; onClose: () => void; areasMap: Map<string, string> }> = ({ userId, onClose, areasMap }) => {
    const [allRequests, setAllRequests] = useState<AnyRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'all' | 'equipment' | 'room'>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [eqData, roomData] = await Promise.all([
                    getEquipmentRequestsByUserIdApi(userId),
                    getRoomRequestsByUserIdApi(userId),
                ]);
                setAllRequests([...eqData, ...roomData]);
            } catch (error) {
                console.error("Failed to fetch user history:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [userId]);
    
    const getType = (req: AnyRequest) => 'requestedItems' in req ? 'Equipment' : 'Room';
    const getName = (req: AnyRequest) => 'requestedItems' in req ? req.requestedItems.map(i => i.name).join(', ') : ('requestedRoom' in req ? req.requestedRoom.name : 'N/A');

    const filteredRequests = useMemo(() => {
        let filtered = allRequests;

        if (typeFilter !== 'all') {
            filtered = filtered.filter(req => (typeFilter === 'equipment') === ('requestedItems' in req));
        }

        if (statusFilter !== 'all') {
             if (statusFilter === 'completed') {
                 filtered = filtered.filter(req => ['Returned', 'Completed', 'Closed'].includes(req.status));
             } else if (statusFilter === 'cancelled') {
                 filtered = filtered.filter(req => ['Cancelled', 'Rejected'].includes(req.status));
             }
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(req => 
                req.purpose.toLowerCase().includes(query) ||
                getName(req).toLowerCase().includes(query)
            );
        }

        return filtered.sort((a, b) => new Date(b.dateFiled).getTime() - new Date(a.dateFiled).getTime());
    }, [allRequests, searchQuery, typeFilter, statusFilter]);

    return (
         <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b dark:border-slate-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold dark:text-white">Complete Request History</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-4 flex-shrink-0">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <Input
                            placeholder="Search by purpose or item name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            icon={<SearchIcon className="w-4 h-4" />}
                        />
                        <Select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value as any)}
                            options={[
                                { value: 'all', label: 'All Types' },
                                { value: 'equipment', label: 'Equipment' },
                                { value: 'room', label: 'Rooms' },
                            ]}
                        />
                         <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            options={[
                                { value: 'all', label: 'All Statuses' },
                                { value: 'completed', label: 'Completed/Returned' },
                                { value: 'cancelled', label: 'Cancelled/Rejected' },
                            ]}
                        />
                    </div>
                </div>
                <div className="px-4 pb-4 overflow-y-auto flex-grow">
                    {isLoading ? (
                        <p className="text-center py-8">Loading history...</p>
                    ) : filteredRequests.length === 0 ? (
                        <p className="text-center text-slate-500 dark:text-slate-400 py-8">No history found.</p>
                    ) : (
                         <div className="overflow-x-auto relative border sm:rounded-lg dark:border-slate-700">
                            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Type</th>
                                        <th scope="col" className="px-6 py-3">Details</th>
                                        <th scope="col" className="px-6 py-3">Dates</th>
                                        <th scope="col" className="px-6 py-3">Status</th>
                                        <th scope="col" className="px-6 py-3">Date Filed</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRequests.map(req => (
                                        <tr key={req.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                                            <td className="px-6 py-4">{getType(req)}</td>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">
                                                {getName(req)}
                                                <p className="text-xs text-slate-500 font-normal">{req.purpose}</p>
                                            </td>
                                            <td className="px-6 py-4">{format(new Date(req.requestedStartDate), 'MMM d, yyyy')} - {format(new Date(req.requestedEndDate), 'MMM d, yyyy')}</td>
                                            <td className="px-6 py-4"><StatusBadge status={req.status} /></td>
                                            <td className="px-6 py-4">{format(new Date(req.dateFiled), 'MMM d, yyyy')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const MyReservationsPage: React.FC = () => {
    const { user } = useAuth();
    const [equipmentRequests, setEquipmentRequests] = useState<EquipmentRequest[]>([]);
    const [roomRequests, setRoomRequests] = useState<RoomRequest[]>([]);
    const [penalties, setPenalties] = useState<Penalty[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [mainTab, setMainTab] = useState<'equipment' | 'rooms' | 'accountability'>('equipment');
    
    const [searchQuery, setSearchQuery] = useState('');
    const [areaFilter, setAreaFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    
    const [requestToCancel, setRequestToCancel] = useState<AnyRequest | null>(null);
    const [viewingRequest, setViewingRequest] = useState<AnyRequest | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        setError('');
        try {
            const [eqData, roomData, areasData, penData] = await Promise.all([
                getEquipmentRequestsByUserIdApi(user.id),
                getRoomRequestsByUserIdApi(user.id),
                getAreasApi(),
                getPenaltiesByUserIdApi(user.id)
            ]);
            setEquipmentRequests(eqData);
            setRoomRequests(roomData);
            setAreas(areasData);
            setPenalties(penData);
        } catch (err) {
            setError('Failed to load your data.');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const areasMap = useMemo(() => new Map(areas.map(a => [a.id, a.name])), [areas]);

    const activeRequests = useMemo(() => {
        const activeEq = equipmentRequests.filter(req => !['Cancelled', 'Rejected', 'Closed', 'Returned', 'Completed'].includes(req.status));
        const activeRooms = roomRequests.filter(req => !['Cancelled', 'Rejected', 'Closed', 'Returned', 'Completed'].includes(req.status));
        
        let filtered = mainTab === 'equipment' ? activeEq : activeRooms;

        if (statusFilter !== 'all') {
            filtered = filtered.filter(req => req.status === statusFilter);
        }
        if (areaFilter !== 'all') {
            filtered = filtered.filter(req => ('requestedItems' in req ? req.requestedItems.some(item => item.areaId === areaFilter) : (req as RoomRequest).requestedRoom.areaId === areaFilter));
        }
        if (searchQuery.trim() !== '') {
            const lowercasedQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(req => 
                req.purpose.toLowerCase().includes(lowercasedQuery) ||
                ('requestedItems' in req ? req.requestedItems.some(item => item.name.toLowerCase().includes(lowercasedQuery)) : (req as RoomRequest).requestedRoom.name.toLowerCase().includes(lowercasedQuery))
            );
        }

        return filtered.sort((a, b) => {
            const dateA = new Date(a.dateFiled).getTime();
            const dateB = new Date(b.dateFiled).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
    }, [equipmentRequests, roomRequests, mainTab, searchQuery, areaFilter, statusFilter, sortOrder]);
    
    const handleConfirmCancel = async () => {
        if (!requestToCancel) return;
        setIsCancelling(true);
        try {
            if ('requestedItems' in requestToCancel) {
                await updateEquipmentRequestStatusApi([requestToCancel.id], 'Cancelled');
            } else {
                await updateRoomRequestStatusApi([requestToCancel.id], 'Cancelled');
            }
            setRequestToCancel(null);
            fetchData();
        } catch (err) {
            setError('Failed to cancel the request.');
        } finally {
            setIsCancelling(false);
        }
    };
    
    const areaFilterOptions = useMemo(() => {
        return [{ value: 'all', label: 'All Areas' }, ...areas.map(a => ({ value: a.id, label: a.name }))];
    }, [areas]);

    const statusFilterOptions = useMemo(() => {
        const allStatuses = mainTab === 'equipment' ? AllEquipmentRequestStatuses : AllRoomRequestStatuses;
        // Filter out completed/cancelled statuses from the active view filter options
        const activeStatuses = allStatuses.filter(s => !['Cancelled', 'Rejected', 'Closed', 'Returned', 'Completed'].includes(s));
        
        return [
            { label: 'All Active Statuses', value: 'all' },
            ...[...activeStatuses].sort((a: string, b: string) => a.localeCompare(b)).map(s => ({ label: s, value: s }))
        ];
    }, [mainTab]);

    const activeTabClasses = "border-b-2 border-up-maroon-700 text-up-maroon-700 dark:text-up-maroon-400 font-bold";
    const inactiveTabClasses = "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300";
    
    const renderEmptyState = (tab: string, resource: string) => (
         <p className="text-slate-500 dark:text-slate-400 text-center py-4">
            You have no active {resource} reservations matching your filters.
            <br/><span className="text-xs">Check "History" for completed or cancelled requests.</span>
        </p>
    );

    const searchPlaceholder = mainTab === 'equipment' ? 'e.g., Projector...' : 'e.g., Conference Room A...';

    return (
        <div className="container mx-auto p-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold dark:text-white font-heading">My Reservations</h1>
                 <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    {/* Conditionally render buttons based on active tab */}
                    {mainTab === 'equipment' && (
                        <Link to="/catalog" state={{ activeTab: 'equipment' }} target="_self">
                            <Button className="!w-full sm:!w-auto">+ Request Equipment</Button>
                        </Link>
                    )}
                    {mainTab === 'rooms' && (
                        <Link to="/catalog" state={{ activeTab: 'rooms' }} target="_self">
                            <Button className="!w-full sm:!w-auto">+ Request a Room</Button>
                        </Link>
                    )}
                    <Button
                        variant="secondary"
                        className="!w-full sm:!w-auto"
                        onClick={() => setIsHistoryModalOpen(true)}
                        title="View Full History"
                    >
                        <ClockIcon className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setMainTab('equipment')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${mainTab === 'equipment' ? activeTabClasses : inactiveTabClasses}`}>Equipment</button>
                    <button onClick={() => setMainTab('rooms')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${mainTab === 'rooms' ? activeTabClasses : inactiveTabClasses}`}>Rooms</button>
                    <button onClick={() => setMainTab('accountability')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${mainTab === 'accountability' ? activeTabClasses : inactiveTabClasses}`}>Accountability</button>
                </nav>
            </div>
            
            {/* Filter Bar */}
            {(mainTab === 'equipment' || mainTab === 'rooms') && (
                <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                     <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input 
                            label="Search"
                            id="search-reservations"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={searchPlaceholder}
                            icon={<SearchIcon className="w-5 h-5" />}
                        />
                        <Select
                            label="Filter by area"
                            id="area-filter"
                            value={areaFilter}
                            onChange={(e) => setAreaFilter(e.target.value)}
                            options={areaFilterOptions}
                        />
                         <Select
                            label="Filter by status"
                            id="status-filter"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            options={statusFilterOptions}
                        />
                        <Select
                            label="Sort by date filed"
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
            )}
            
            {/* Content Area */}
            {isLoading && <p className="dark:text-white text-center">Loading...</p>}
            {error && <p className="text-red-500 text-center">{error}</p>}
            
            {!isLoading && !error && (
                <div>
                    {mainTab === 'equipment' && (
                        <div className="space-y-4">
                           {activeRequests.length > 0 ? (
                               <RequestsTable requests={activeRequests} onCancel={setRequestToCancel} onRowClick={setViewingRequest} areasMap={areasMap} resourceType="equipment" />
                           ) : renderEmptyState('Active', 'equipment')}
                        </div>
                    )}
                    {mainTab === 'rooms' && (
                         <div className="space-y-4">
                           {activeRequests.length > 0 ? (
                               <RequestsTable requests={activeRequests} onCancel={setRequestToCancel} onRowClick={setViewingRequest} areasMap={areasMap} resourceType="room" />
                           ) : renderEmptyState('Active', 'room')}
                        </div>
                    )}
                    {mainTab === 'accountability' && <PenaltyHistoryList penalties={penalties} requests={[...equipmentRequests, ...roomRequests]} />}
                </div>
            )}
            
            {requestToCancel && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setRequestToCancel(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white font-heading">Confirm Cancellation</h3>
                            <p className="mt-2 text-slate-600 dark:text-slate-300">Are you sure you want to cancel this request?</p>
                        </div>
                        <div className="p-6 flex justify-end gap-3 border-t dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg">
                            <Button onClick={() => setRequestToCancel(null)} className="!w-auto" variant="secondary">Back</Button>
                            <Button onClick={handleConfirmCancel} isLoading={isCancelling} variant="danger" className="!w-auto">Confirm Cancel</Button>
                        </div>
                    </div>
                </div>
            )}
             {viewingRequest && (
                <ReservationDetailsModal
                    reservation={viewingRequest}
                    onClose={() => setViewingRequest(null)}
                />
            )}

            {isHistoryModalOpen && user && (
                <AllUserHistoryModal userId={user.id} onClose={() => setIsHistoryModalOpen(false)} areasMap={areasMap} />
            )}
        </div>
    );
};

export default MyReservationsPage;
