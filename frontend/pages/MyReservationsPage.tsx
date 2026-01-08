import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { Area, EquipmentRequest, RoomRequest, Penalty, AllEquipmentRequestStatuses, AllRoomRequestStatuses } from '../types';
import { getAreasApi } from '../../backend/api/areas';
import { getEquipmentRequestsByUserIdApi, updateEquipmentRequestStatusApi } from '../../backend/api/equipmentRequests';
import { getRoomRequestsByUserIdApi, updateRoomRequestStatusApi } from '../../backend/api/roomRequests';
import { getPenaltiesByUserIdApi } from '../../backend/api/penalties';
import { Button } from '../components/ui/Button';
import { format } from 'date-fns';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { SearchIcon } from '../components/Icons';
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
    
    const getItemName = (req: AnyRequest) => 'requestedItems' in req ? req.requestedItems[0]?.name || 'N/A' : req.requestedRoom.name;
    const getAreaName = (req: AnyRequest) => {
        const areaId = 'requestedItems' in req ? req.requestedItems[0]?.areaId : req.requestedRoom.areaId;
        return areasMap.get(areaId) || 'Unknown Area';
    };
    const getDateTimeString = (req: AnyRequest) => {
        const start = format(new Date(req.requestedStartDate + 'T00:00:00Z'), 'MMM d, yyyy');
        if ('requestedItems' in req) {
            const end = format(new Date(req.requestedEndDate + 'T00:00:00Z'), 'MMM d, yyyy');
            return start === end ? start : `${start} to ${end}`;
        } else {
            return `${start} at ${req.requestedStartTime} - ${req.requestedEndTime}`;
        }
    };
    const canCancel = (req: AnyRequest) => {
        const cancellableEquipmentStatuses = ['For Approval', 'Pending Confirmation', 'Ready for Pickup'];
        const cancellableRoomStatuses = ['For Approval', 'Pending Confirmation', 'Ready for Check-in'];
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
        const req = requests.find(r => r.id === (penalty.equipmentRequestId || penalty.roomRequestId));
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


const MyReservationsPage: React.FC = () => {
    const { user } = useAuth();
    const [equipmentRequests, setEquipmentRequests] = useState<EquipmentRequest[]>([]);
    const [roomRequests, setRoomRequests] = useState<RoomRequest[]>([]);
    const [penalties, setPenalties] = useState<Penalty[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [mainTab, setMainTab] = useState<'equipment' | 'rooms' | 'accountability'>('equipment');
    const [nestedTab, setNestedTab] = useState<'ongoing' | 'upcoming' | 'past' | 'cancelled'>('ongoing');
    
    const [searchQuery, setSearchQuery] = useState('');
    const [areaFilter, setAreaFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    
    const [requestToCancel, setRequestToCancel] = useState<AnyRequest | null>(null);
    const [viewingRequest, setViewingRequest] = useState<AnyRequest | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);

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

    const categorizedEq = useMemo(() => {
        let filteredRequests = equipmentRequests;

        if (statusFilter !== 'all') {
            filteredRequests = filteredRequests.filter(req => req.status === statusFilter);
        }
        if (areaFilter !== 'all') {
            filteredRequests = filteredRequests.filter(req => req.requestedItems.some(item => item.areaId === areaFilter));
        }
        if (searchQuery.trim() !== '') {
            const lowercasedQuery = searchQuery.toLowerCase();
            filteredRequests = filteredRequests.filter(req => 
                req.purpose.toLowerCase().includes(lowercasedQuery) ||
                req.requestedItems.some(item => item.name.toLowerCase().includes(lowercasedQuery))
            );
        }
        
        const upcoming: EquipmentRequest[] = [];
        const ongoing: EquipmentRequest[] = [];
        const past: EquipmentRequest[] = [];
        const cancelled: EquipmentRequest[] = [];
        const todayStr = new Date().toISOString().split('T')[0];

        filteredRequests.forEach(r => {
            if (r.status === 'Cancelled' || r.status === 'Rejected') { cancelled.push(r); return; }
            if (r.status === 'Closed') { past.push(r); return; }
            if (r.requestedEndDate < todayStr) { past.push(r); return; }
            if (r.status === 'For Approval' || r.status === 'Pending Confirmation') { ongoing.push(r); return; }
            
            const isToday = todayStr >= r.requestedStartDate && todayStr <= r.requestedEndDate;
            const isFuture = r.requestedStartDate > todayStr;
            
            if (r.status === 'Ready for Pickup') {
                if (isToday) ongoing.push(r);
                else if (isFuture) upcoming.push(r);
                else past.push(r);
            }
        });

        const dateSorter = (a: EquipmentRequest, b: EquipmentRequest) => {
            const dateA = new Date(a.dateFiled).getTime();
            const dateB = new Date(b.dateFiled).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        };

        ongoing.sort(dateSorter);
        upcoming.sort(dateSorter);
        past.sort(dateSorter);
        cancelled.sort(dateSorter);
        
        return { upcoming, ongoing, past, cancelled };
    }, [equipmentRequests, searchQuery, areaFilter, statusFilter, sortOrder]);

    const categorizedRooms = useMemo(() => {
        let filteredRequests = roomRequests;
        if (statusFilter !== 'all') {
            filteredRequests = filteredRequests.filter(req => req.status === statusFilter);
        }
        if (areaFilter !== 'all') {
            filteredRequests = filteredRequests.filter(req => req.requestedRoom.areaId === areaFilter);
        }
        if (searchQuery.trim() !== '') {
            const lowercasedQuery = searchQuery.toLowerCase();
            filteredRequests = filteredRequests.filter(req => 
                req.purpose.toLowerCase().includes(lowercasedQuery) ||
                req.requestedRoom.name.toLowerCase().includes(lowercasedQuery)
            );
        }

        const upcoming: RoomRequest[] = [];
        const ongoing: RoomRequest[] = [];
        const past: RoomRequest[] = [];
        const cancelled: RoomRequest[] = [];
        const todayStr = new Date().toISOString().split('T')[0];

        filteredRequests.forEach(r => {
            if (r.status === 'Cancelled' || r.status === 'Rejected') { cancelled.push(r); return; }
            if (r.status === 'Closed') { past.push(r); return; }
            if (r.requestedStartDate < todayStr) { past.push(r); return; }
            if (r.status === 'For Approval' || r.status === 'Pending Confirmation') { ongoing.push(r); return; }

            const isToday = r.requestedStartDate === todayStr;
            const isFuture = r.requestedStartDate > todayStr;

            if (r.status === 'Ready for Check-in' || r.status === 'Overdue') {
                if (isToday) ongoing.push(r);
                else if (isFuture) upcoming.push(r);
            }
        });

        const dateSorter = (a: RoomRequest, b: RoomRequest) => {
            const dateA = new Date(a.dateFiled).getTime();
            const dateB = new Date(b.dateFiled).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        };
        
        ongoing.sort(dateSorter);
        upcoming.sort(dateSorter);
        past.sort(dateSorter);
        cancelled.sort(dateSorter);
        return { upcoming, ongoing, past, cancelled };
    }, [roomRequests, searchQuery, areaFilter, statusFilter, sortOrder]);
    
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
        return [
            { label: 'All Statuses', value: 'all' },
            ...[...allStatuses].sort((a: string, b: string) => a.localeCompare(b)).map(s => ({ label: s, value: s }))
        ];
    }, [mainTab]);

    const activeTabClasses = "border-b-2 border-up-maroon-700 text-up-maroon-700 dark:text-up-maroon-400 font-bold";
    const inactiveTabClasses = "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300";
    
    const nestedTabActiveClasses = 'bg-up-maroon-50 text-up-maroon-800 border border-up-maroon-200 dark:bg-up-maroon-900/30 dark:text-up-maroon-300 dark:border-up-maroon-800';
    const nestedTabInactiveClasses = 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700';
    
    const renderEmptyState = (tab: string, resource: string, hasOriginalData: boolean) => (
         <p className="text-slate-500 dark:text-slate-400 text-center py-4">
            {hasOriginalData 
                ? `No ${resource} requests match your current filters in the '${tab}' tab.`
                : `You have no ${tab} ${resource} requests.`
            }
        </p>
    );

    const searchPlaceholder = mainTab === 'equipment' ? 'e.g., Projector...' : 'e.g., Conference Room A...';

    return (
        <div className="container mx-auto p-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold dark:text-white font-heading">My Requests</h1>
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
                    {(mainTab === 'equipment' || mainTab === 'rooms') && (
                        <div className="flex space-x-2 mb-4 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-lg">
                            <button onClick={() => setNestedTab('ongoing')} className={`w-full py-2 px-4 text-sm font-semibold rounded-md transition-colors ${nestedTab === 'ongoing' ? nestedTabActiveClasses : nestedTabInactiveClasses}`}>Ongoing</button>
                            <button onClick={() => setNestedTab('upcoming')} className={`w-full py-2 px-4 text-sm font-semibold rounded-md transition-colors ${nestedTab === 'upcoming' ? nestedTabActiveClasses : nestedTabInactiveClasses}`}>Upcoming</button>
                            <button onClick={() => setNestedTab('past')} className={`w-full py-2 px-4 text-sm font-semibold rounded-md transition-colors ${nestedTab === 'past' ? nestedTabActiveClasses : nestedTabInactiveClasses}`}>Past</button>
                            <button onClick={() => setNestedTab('cancelled')} className={`w-full py-2 px-4 text-sm font-semibold rounded-md transition-colors ${nestedTab === 'cancelled' ? nestedTabActiveClasses : nestedTabInactiveClasses}`}>Cancelled</button>
                        </div>
                    )}
                    
                    {mainTab === 'equipment' && (
                        <div className="space-y-4">
                           {nestedTab === 'ongoing' && (categorizedEq.ongoing.length > 0 ? <RequestsTable requests={categorizedEq.ongoing} onCancel={setRequestToCancel} onRowClick={setViewingRequest} areasMap={areasMap} resourceType="equipment" /> : renderEmptyState('ongoing', 'equipment', equipmentRequests.length > 0))}
                           {nestedTab === 'upcoming' && (categorizedEq.upcoming.length > 0 ? <RequestsTable requests={categorizedEq.upcoming} onCancel={setRequestToCancel} onRowClick={setViewingRequest} areasMap={areasMap} resourceType="equipment" /> : renderEmptyState('upcoming', 'equipment', equipmentRequests.length > 0))}
                           {nestedTab === 'past' && (categorizedEq.past.length > 0 ? <RequestsTable requests={categorizedEq.past} onCancel={setRequestToCancel} onRowClick={setViewingRequest} areasMap={areasMap} resourceType="equipment" /> : renderEmptyState('past', 'equipment', equipmentRequests.length > 0))}
                           {nestedTab === 'cancelled' && (categorizedEq.cancelled.length > 0 ? <RequestsTable requests={categorizedEq.cancelled} onCancel={setRequestToCancel} onRowClick={setViewingRequest} areasMap={areasMap} resourceType="equipment" /> : renderEmptyState('cancelled', 'equipment', equipmentRequests.length > 0))}
                        </div>
                    )}
                    {mainTab === 'rooms' && (
                         <div className="space-y-4">
                           {nestedTab === 'ongoing' && (categorizedRooms.ongoing.length > 0 ? <RequestsTable requests={categorizedRooms.ongoing} onCancel={setRequestToCancel} onRowClick={setViewingRequest} areasMap={areasMap} resourceType="room" /> : renderEmptyState('ongoing', 'room', roomRequests.length > 0))}
                           {nestedTab === 'upcoming' && (categorizedRooms.upcoming.length > 0 ? <RequestsTable requests={categorizedRooms.upcoming} onCancel={setRequestToCancel} onRowClick={setViewingRequest} areasMap={areasMap} resourceType="room" /> : renderEmptyState('upcoming', 'room', roomRequests.length > 0))}
                           {nestedTab === 'past' && (categorizedRooms.past.length > 0 ? <RequestsTable requests={categorizedRooms.past} onCancel={setRequestToCancel} onRowClick={setViewingRequest} areasMap={areasMap} resourceType="room" /> : renderEmptyState('past', 'room', roomRequests.length > 0))}
                           {nestedTab === 'cancelled' && (categorizedRooms.cancelled.length > 0 ? <RequestsTable requests={categorizedRooms.cancelled} onCancel={setRequestToCancel} onRowClick={setViewingRequest} areasMap={areasMap} resourceType="room" /> : renderEmptyState('cancelled', 'room', roomRequests.length > 0))}
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
        </div>
    );
};

export default MyReservationsPage;