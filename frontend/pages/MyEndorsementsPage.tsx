import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { Area, EquipmentRequest, RoomRequest, Penalty, AllEquipmentRequestStatuses, AllRoomRequestStatuses, EquipmentRequestStatus, RoomRequestStatus } from '../types';
import { getAreasApi } from '../../backend/api/areas';
import { getEquipmentRequestsByEndorserApi, updateEquipmentRequestStatusApi } from '../../backend/api/equipmentRequests';
import { getRoomRequestsByEndorserApi, updateRoomRequestStatusApi } from '../../backend/api/roomRequests';
import { Button } from '../components/ui/Button';
import { format } from 'date-fns';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { SearchIcon } from '../components/Icons';
import ReservationDetailsModal from '../components/reservations/ReservationDetailsModal';

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
    onEndorse: (req: AnyRequest) => void;
    onReject: (req: AnyRequest) => void;
    onRowClick: (req: AnyRequest) => void;
    areasMap: Map<string, string>;
    resourceType: 'equipment' | 'room';
}> = ({ requests, onEndorse, onReject, onRowClick, areasMap, resourceType }) => {

    const getItemName = (req: AnyRequest): string => {
        if ('requestedItems' in req) {
            return req.requestedItems[0]?.name || 'N/A';
        }
        if ('requestedRoom' in req) {
            const room = req.requestedRoom;
            if (Array.isArray(room)) {
                return room.map(r => r.name).join(', ') || 'N/A';
            }
            return (room as any)?.name || 'N/A';
        }
        return 'N/A';
    };

    const getDateTimeString = (req: AnyRequest) => {
        if (!req.requestedStartDate) {
            return 'N/A';
        }

        const startDate = new Date(req.requestedStartDate + 'T00:00:00Z');
        if (isNaN(startDate.getTime())) {
            return 'Invalid date';
        }
        const start = format(startDate, 'MMM d, yyyy');

        if ('requestedItems' in req) {
            if (!req.requestedEndDate) {
                return start;
            }
            const endDate = new Date(req.requestedEndDate + 'T00:00:00Z');
            if (isNaN(endDate.getTime())) {
                return start;
            }
            const end = format(endDate, 'MMM d, yyyy');
            return start === end ? start : `${start} to ${end}`;
        } else {
            const startTime = 'requestedStartTime' in req ? req.requestedStartTime : '';
            const endTime = 'requestedEndTime' in req ? req.requestedEndTime : '';
            if (startTime && endTime) {
                return `${start} at ${startTime} - ${endTime}`;
            }
            return start;
        }
    };

    if (requests.length === 0) return null;

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-x-auto border border-slate-200 dark:border-slate-700">
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400 font-heading">
                    <tr>
                        <th scope="col" className="px-6 py-3">{resourceType === 'equipment' ? 'Item' : 'Room'}</th>
                        <th scope="col" className="px-6 py-3">Requestor</th>
                        <th scope="col" className="px-6 py-3">Date & Time</th>
                        <th scope="col" className="px-6 py-3">Status</th>
                        <th scope="col" className="px-6 py-3">Action</th>
                    </tr>
                </thead>
                <tbody>
                    {requests.map((req) => (
                        <tr
                            key={req.id}
                            onClick={() => onRowClick(req)}
                            className={`bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 cursor-pointer ${req.status === 'Overdue' ? 'bg-rose-50 dark:bg-rose-900/20' : ''}`}
                        >
                            <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">
                                {getItemName(req)}
                            </td>
                            <td className="px-6 py-4">{req.userName}</td>
                            <td className="px-6 py-4">{getDateTimeString(req)}</td>
                            <td className="px-6 py-4"><StatusBadge status={req.status} /></td>
                            <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                {req.status === 'Pending Endorsement' && (
                                    <div className="flex gap-2">
                                        <Button variant="success" className="!w-auto !py-1 !px-3 text-xs" onClick={() => onEndorse(req)}>
                                            Endorse
                                        </Button>
                                        <Button variant="danger" className="!w-auto !py-1 !px-3 text-xs" onClick={() => onReject(req)}>
                                            Reject
                                        </Button>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};


const MyEndorsementsPage: React.FC = () => {
    const { user } = useAuth();
    const [equipmentRequests, setEquipmentRequests] = useState<EquipmentRequest[]>([]);
    const [roomRequests, setRoomRequests] = useState<RoomRequest[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const [mainTab, setMainTab] = useState<'equipment' | 'rooms'>('equipment');
    const [nestedTab, setNestedTab] = useState<'pending' | 'endorsed' | 'rejected'>('pending');

    const [searchQuery, setSearchQuery] = useState('');
    const [areaFilter, setAreaFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

    const [requestToAction, setRequestToAction] = useState<AnyRequest | null>(null);
    const [actionType, setActionType] = useState<'endorse' | 'reject' | null>(null);
    const [viewingRequest, setViewingRequest] = useState<AnyRequest | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        setError('');
        try {
            const userEmail = user.emailAddress || user.email;

            if (!userEmail) {
                setError('User email not found. Cannot fetch endorsements.');
                setIsLoading(false);
                return;
            }

            const [eqData, roomData, areasData] = await Promise.all([
                getEquipmentRequestsByEndorserApi(userEmail),
                getRoomRequestsByEndorserApi(userEmail),
                getAreasApi(),
            ]);
            setEquipmentRequests(eqData);
            setRoomRequests(roomData);
            setAreas(areasData);
        } catch (err) {
            console.error('[MyEndorsementsPage] fetchData failed:', err instanceof Error ? err.message : err);
            setError('Failed to load your data.');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const areasMap = useMemo(() => new Map(areas.map(a => [a.id, a.name])), [areas]);

    const getRequestAreaId = (req: AnyRequest): string => {
        if ('requestedItems' in req) {
            return req.requestedItems[0]?.areaId || '';
        }
        if ('requestedRoom' in req) {
            const room = req.requestedRoom;
            if (Array.isArray(room)) return room[0]?.areaId || '';
            return (room as any)?.areaId || '';
        }
        return '';
    };

    const getRequestName = (req: AnyRequest): string => {
        if ('requestedItems' in req) {
            return req.requestedItems[0]?.name || '';
        }
        if ('requestedRoom' in req) {
            const room = req.requestedRoom;
            if (Array.isArray(room)) return room.map(r => r.name).join(', ');
            return (room as any)?.name || '';
        }
        return '';
    };

    const filterAndSortRequests = (requests: AnyRequest[]) => {
        let filtered = requests;

        if (areaFilter !== 'all') {
            filtered = filtered.filter(req => getRequestAreaId(req) === areaFilter);
        }

        if (searchQuery.trim() !== '') {
            const lowercasedQuery = searchQuery.toLowerCase();
            filtered = filtered.filter(req =>
                req.purpose.toLowerCase().includes(lowercasedQuery) ||
                getRequestName(req).toLowerCase().includes(lowercasedQuery)
            );
        }

        return filtered.sort((a, b) => {
            const dateA = new Date(a.dateFiled).getTime();
            const dateB = new Date(b.dateFiled).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });
    };

    // AFTER
    const ENDORSED_STATUSES = ['Pending Approval', 'Approved', 'Ready for Pickup', 'Ready for Check-in', 'In Use', 'Returned', 'Completed', 'Overdue'];

    const categorizedEq = useMemo(() => {
        return {
            pending: filterAndSortRequests(equipmentRequests.filter(r => r.status === 'Pending Endorsement')),
            endorsed: filterAndSortRequests(equipmentRequests.filter(r => ENDORSED_STATUSES.includes(r.status))),
            rejected: filterAndSortRequests(equipmentRequests.filter(r => r.status === 'Rejected')),
        };
    }, [equipmentRequests, searchQuery, areaFilter, sortOrder]);

    const categorizedRooms = useMemo(() => {
        return {
            pending: filterAndSortRequests(roomRequests.filter(r => r.status === 'Pending Endorsement')),
            endorsed: filterAndSortRequests(roomRequests.filter(r => ENDORSED_STATUSES.includes(r.status))),
            rejected: filterAndSortRequests(roomRequests.filter(r => r.status === 'Rejected')),
        };
    }, [roomRequests, searchQuery, areaFilter, sortOrder]);

    const handleAction = async () => {
        if (!requestToAction || !actionType) return;
        setIsProcessing(true);
        try {
            const newStatus = actionType === 'endorse' ? 'Pending Approval' : 'Rejected';

            if ('requestedItems' in requestToAction) {
                await updateEquipmentRequestStatusApi([requestToAction.id], newStatus as EquipmentRequestStatus);
                // Optimistically update local state immediately
                setEquipmentRequests(prev =>
                    prev.map(r => r.id === requestToAction.id ? { ...r, status: newStatus as EquipmentRequestStatus } : r)
                );
            } else {
                await updateRoomRequestStatusApi([requestToAction.id], newStatus as RoomRequestStatus);
                // Optimistically update local state immediately
                setRoomRequests(prev =>
                    prev.map(r => r.id === requestToAction.id ? { ...r, status: newStatus as RoomRequestStatus } : r)
                );
            }

            setRequestToAction(null);
            setActionType(null);
            fetchData(); // still refetches in background to sync
        } catch (err) {
            setError(`Failed to ${actionType} the request.`);
        } finally {
            setIsProcessing(false);
        }
    };

    const areaFilterOptions = useMemo(() => {
        return [{ value: 'all', label: 'All Areas' }, ...areas.map(a => ({ value: a.id, label: a.name }))];
    }, [areas]);

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
                <h1 className="text-3xl font-bold dark:text-white font-heading">My Endorsements</h1>
            </div>

            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setMainTab('equipment')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${mainTab === 'equipment' ? activeTabClasses : inactiveTabClasses}`}>Equipment</button>
                    <button onClick={() => setMainTab('rooms')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${mainTab === 'rooms' ? activeTabClasses : inactiveTabClasses}`}>Rooms</button>
                </nav>
            </div>

            <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Input
                        label="Search"
                        id="search-endorsements"
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

            {isLoading && <p className="dark:text-white text-center">Loading...</p>}
            {error && <p className="text-red-500 text-center">{error}</p>}

            {!isLoading && !error && (
                <div>
                    <div className="flex space-x-2 mb-4 p-1 bg-slate-100 dark:bg-slate-900/50 rounded-lg">
                        <button onClick={() => setNestedTab('pending')} className={`w-full py-2 px-4 text-sm font-semibold rounded-md transition-colors ${nestedTab === 'pending' ? nestedTabActiveClasses : nestedTabInactiveClasses}`}>Pending</button>
                        <button onClick={() => setNestedTab('endorsed')} className={`w-full py-2 px-4 text-sm font-semibold rounded-md transition-colors ${nestedTab === 'endorsed' ? nestedTabActiveClasses : nestedTabInactiveClasses}`}>Endorsed</button>
                        <button onClick={() => setNestedTab('rejected')} className={`w-full py-2 px-4 text-sm font-semibold rounded-md transition-colors ${nestedTab === 'rejected' ? nestedTabActiveClasses : nestedTabInactiveClasses}`}>Rejected</button>
                    </div>

                    {mainTab === 'equipment' && (
                        <div className="space-y-4">
                            {nestedTab === 'pending' && (categorizedEq.pending.length > 0 ? <RequestsTable requests={categorizedEq.pending} onEndorse={(req) => { setRequestToAction(req); setActionType('endorse'); }} onReject={(req) => { setRequestToAction(req); setActionType('reject'); }} onRowClick={setViewingRequest} areasMap={areasMap} resourceType="equipment" /> : renderEmptyState('pending', 'equipment', equipmentRequests.length > 0))}
                            {nestedTab === 'endorsed' && (categorizedEq.endorsed.length > 0 ? <RequestsTable requests={categorizedEq.endorsed} onEndorse={() => { }} onReject={() => { }} onRowClick={setViewingRequest} areasMap={areasMap} resourceType="equipment" /> : renderEmptyState('endorsed', 'equipment', equipmentRequests.length > 0))}
                            {nestedTab === 'rejected' && (categorizedEq.rejected.length > 0 ? <RequestsTable requests={categorizedEq.rejected} onEndorse={() => { }} onReject={() => { }} onRowClick={setViewingRequest} areasMap={areasMap} resourceType="equipment" /> : renderEmptyState('rejected', 'equipment', equipmentRequests.length > 0))}
                        </div>
                    )}
                    {mainTab === 'rooms' && (
                        <div className="space-y-4">
                            {nestedTab === 'pending' && (categorizedRooms.pending.length > 0 ? <RequestsTable requests={categorizedRooms.pending} onEndorse={(req) => { setRequestToAction(req); setActionType('endorse'); }} onReject={(req) => { setRequestToAction(req); setActionType('reject'); }} onRowClick={setViewingRequest} areasMap={areasMap} resourceType="room" /> : renderEmptyState('pending', 'room', roomRequests.length > 0))}
                            {nestedTab === 'endorsed' && (categorizedRooms.endorsed.length > 0 ? <RequestsTable requests={categorizedRooms.endorsed} onEndorse={() => { }} onReject={() => { }} onRowClick={setViewingRequest} areasMap={areasMap} resourceType="room" /> : renderEmptyState('endorsed', 'room', roomRequests.length > 0))}
                            {nestedTab === 'rejected' && (categorizedRooms.rejected.length > 0 ? <RequestsTable requests={categorizedRooms.rejected} onEndorse={() => { }} onReject={() => { }} onRowClick={setViewingRequest} areasMap={areasMap} resourceType="room" /> : renderEmptyState('rejected', 'room', roomRequests.length > 0))}
                        </div>
                    )}
                </div>
            )}

            {requestToAction && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" onClick={() => setRequestToAction(null)}>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <div className="p-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white font-heading">Confirm {actionType === 'endorse' ? 'Endorsement' : 'Rejection'}</h3>
                            <p className="mt-2 text-slate-600 dark:text-slate-300">Are you sure you want to {actionType} this request?</p>
                        </div>
                        <div className="p-6 flex justify-end gap-3 border-t dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 rounded-b-lg">
                            <Button onClick={() => setRequestToAction(null)} className="!w-auto" variant="secondary">Back</Button>
                            <Button onClick={handleAction} isLoading={isProcessing} variant={actionType === 'endorse' ? 'success' : 'danger'} className="!w-auto">Confirm</Button>
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

export default MyEndorsementsPage;