
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Area, EquipmentRequest, RoomRequest, AllEquipmentRequestStatuses, AllRoomRequestStatuses, User, ReservationSettings, EquipmentRequestStatus, RoomRequestStatus } from '../types';
import { getAreasApi } from '../../backend/api/areas';
import { getAllEquipmentRequestsApi, updateEquipmentRequestStatusApi } from '../../backend/api/equipmentRequests';
import { getAllRoomRequestsApi, updateRoomRequestStatusApi } from '../../backend/api/roomRequests';
import { getAllUsersApi } from '../../backend/api/auth';
import { getSettingsApi } from '../../backend/api/settings';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { SearchIcon, DocumentDuplicateIcon, UserIcon, AcademicCapIcon, BriefcaseIcon } from '../components/Icons';
import { Button } from '../components/ui/Button';
import NewRequestModal from '../components/requests/NewRequestModal';
import AccountabilityList from '../components/admin/AccountabilityList';
import ReservationDetailsModal from '../components/reservations/ReservationDetailsModal';

type AnyRequest = EquipmentRequest | RoomRequest;

const StatusBadge: React.FC<{ status: AnyRequest['status'] }> = ({ status }) => {
    const baseClasses = "px-2 py-1 text-xs font-medium rounded-full capitalize whitespace-nowrap";
    const colorKey = status.split(' ')[0].toLowerCase();
    const colors: { [key: string]: string } = {
        'approved': 'bg-up-green-100 text-up-green-800 dark:bg-up-green-900/40 dark:text-up-green-300',
        'pending': 'bg-up-gold-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
        'rejected': 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
        'ready': 'bg-up-green-100 text-up-green-800 dark:bg-up-green-900/40 dark:text-up-green-300',
        'equipment': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
        'overdue': 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
        'closed': 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
        'cancelled': 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
        'checked': 'bg-up-green-100 text-up-green-800 dark:bg-up-green-900/40 dark:text-up-green-300',
        'for': 'bg-up-gold-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    };
    return <span className={`${baseClasses} ${colors[colorKey] || colors['closed']}`}>{status}</span>;
};

const AllRequestsPage: React.FC = () => {
    const { user } = useAuth();
    const location = useLocation();

    const [requests, setRequests] = useState<AnyRequest[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [settings, setSettings] = useState<ReservationSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [activeTab, setActiveTab] = useState<'equipment' | 'room' | 'accountability'>('equipment');

    const [searchQuery, setSearchQuery] = useState('');
    const [areaFilter, setAreaFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<string>(
        (location.state as { statusFilter?: string })?.statusFilter || 'all'
    );
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [selectedRequest, setSelectedRequest] = useState<AnyRequest | null>(null);
    const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
    const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        const stateTab = (location.state as any)?.activeTab;
        if (stateTab) {
            setActiveTab(stateTab);
        }
    }, [location.state]);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [equipmentData, roomData, areasData, usersData, settingsData] = await Promise.all([
                getAllEquipmentRequestsApi(),
                getAllRoomRequestsApi(),
                getAreasApi(),
                getAllUsersApi(),
                getSettingsApi(),
            ]);
            setRequests([...equipmentData, ...roomData]);
            setAreas(areasData);
            setUsers(usersData);
            setSettings(settingsData);
        } catch (err) {
            setError('Failed to load request data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleStatusUpdate = async (request: AnyRequest, newStatus: EquipmentRequestStatus | RoomRequestStatus) => {
        setIsUpdatingId(request.id);
        setError('');
        try {
            if ('requestedItems' in request) {
                await updateEquipmentRequestStatusApi([request.id], newStatus as EquipmentRequestStatus);
            } else {
                await updateRoomRequestStatusApi([request.id], newStatus as RoomRequestStatus);
            }
            fetchData();
        } catch (err) {
            setError('Failed to update request status. Please try again.');
        } finally {
            setIsUpdatingId(null);
        }
    };

    const usersMap = useMemo(() => new Map(users.map(user => [user.id, user])), [users]);
    const areasMap = useMemo(() => new Map(areas.map(area => [area.id, area.name])), [areas]);
    const getAreaId = (req: AnyRequest) => {
        if ('requestedItems' in req && req.requestedItems.length > 0) return req.requestedItems[0]?.areaId;
        if ('roomTypeId' in req) {
             const room = areas.find(area => area.id === req.roomTypeId);
             return room ? room.id : '';
        }
        return '';
    };

    const filteredAndSortedRequests = useMemo(() => {
        if (activeTab === 'accountability') return [];

        const managedIds = new Set(user?.managedAreaIds || []);
        const isSuperAdmin = user?.role === 'superadmin';
        
        let processed = requests.filter(r => isSuperAdmin || managedIds.has(getAreaId(r) || ''));

        if (activeTab === 'equipment') {
            processed = processed.filter(r => 'requestedItems' in r);
        } else if (activeTab === 'room') {
            processed = processed.filter(r => 'roomTypeId' in r);
        }

        if (areaFilter !== 'all') processed = processed.filter(r => getAreaId(r) === areaFilter);
        if (statusFilter !== 'all') processed = processed.filter(r => r.status === statusFilter);
        if (searchQuery.trim() !== '') processed = processed.filter(r => r.userName.toLowerCase().includes(searchQuery.toLowerCase()));
    
        processed.sort((a, b) => {
            const dateA = new Date(a.dateFiled).getTime();
            const dateB = new Date(b.dateFiled).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        return processed;
    }, [requests, user, areaFilter, statusFilter, searchQuery, sortOrder, activeTab]);
    
    const areaFilterOptions = useMemo(() => {
        const base = [{ value: 'all', label: 'All Managed Areas' }];
        const relevant = user?.role === 'superadmin' ? areas : areas.filter(a => user?.managedAreaIds?.includes(a.id));
        return [...base, ...relevant.map(a => ({ value: a.id, label: a.name }))];
    }, [areas, user]);
    
    const statusFilterOptions = useMemo(() => {
        const allStatuses = activeTab === 'equipment' ? AllEquipmentRequestStatuses : AllRoomRequestStatuses;
        return [
            { label: 'All Statuses', value: 'all' },
            ...allStatuses.map(s => ({ label: s, value: s }))
        ];
    }, [activeTab]);

    const activeTabClasses = "border-b-2 border-up-maroon-700 text-up-maroon-700 dark:text-up-maroon-400 font-bold";
    const inactiveTabClasses = "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300";

    const renderActions = (request: AnyRequest) => {
        const isUpdating = isUpdatingId === request.id;

        switch (request.status) {
            case 'Pending Approval':
                const approveStatus = 'requestedItems' in request ? 'Approved' : 'Approved';
                return (
                    <div className="flex gap-2">
                        <Button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(request, approveStatus); }} isLoading={isUpdating} variant="success" className="!w-auto !px-2 !py-1 text-xs">Approve</Button>
                        <Button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(request, 'Rejected'); }} isLoading={isUpdating} variant="danger" className="!w-auto !px-2 !py-1 text-xs">Reject</Button>
                    </div>
                );
            case 'Approved':
                 const readyStatus = 'requestedItems' in request ? 'Ready for Pickup' : 'Ready for Check-in';
                 return (
                    <Button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(request, readyStatus); }} isLoading={isUpdating} variant="primary" className="!w-auto !px-2 !py-1 text-xs">Mark as Ready</Button>
                );
            case 'Ready for Pickup':
                 return (
                    <Button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(request, 'In Use'); }} isLoading={isUpdating} variant="dark" className="!w-auto !px-2 !py-1 text-xs">Check Out</Button>
                );
             case 'Ready for Check-in':
                 return (
                    <Button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(request, 'In Use'); }} isLoading={isUpdating} variant="dark" className="!w-auto !px-2 !py-1 text-xs">Check In</Button>
                );
             case 'In Use':
                 const closeStatus = 'requestedItems' in request ? 'Returned' : 'Completed';
                 return (
                    <Button onClick={(e) => { e.stopPropagation(); handleStatusUpdate(request, closeStatus); }} isLoading={isUpdating} variant="dark" className="!w-auto !px-2 !py-1 text-xs">Close</Button>
                );
            default:
                return <span className="text-slate-400 dark:text-slate-500">-</span>;
        }
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold dark:text-white mb-6 font-heading">Reservations</h1>
            
            <div className="border-b border-slate-200 dark:border-slate-700 my-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('equipment')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'equipment' ? activeTabClasses : inactiveTabClasses}`}>Equipment</button>
                    <button onClick={() => setActiveTab('room')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'room' ? activeTabClasses : inactiveTabClasses}`}>Rooms</button>
                    <button onClick={() => setActiveTab('accountability')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'accountability' ? activeTabClasses : inactiveTabClasses}`}>Accountability</button>
                </nav>
            </div>
            
            {activeTab !== 'accountability' && (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <p className="text-slate-500 dark:text-slate-400">Showing {filteredAndSortedRequests.length} {activeTab} reservation(s).</p>
                        <Button className="!w-auto" onClick={() => setIsNewRequestModalOpen(true)}>
                            + New Reservation
                        </Button>
                    </div>
                    
                    <div className="mb-6 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Input label="Search by name" id="search-requests" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} icon={<SearchIcon className="w-5 h-5" />} />
                            <Select label="Filter by area" id="area-filter" value={areaFilter} onChange={e => setAreaFilter(e.target.value)} options={areaFilterOptions} />
                            <Select label="Filter by status" id="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} options={statusFilterOptions} />
                            <Select label="Sort by date" id="sort-order" value={sortOrder} onChange={e => setSortOrder(e.target.value as any)} options={[{ value: 'newest', label: 'Newest First' }, { value: 'oldest', label: 'Oldest First' }]} />
                        </div>
                    </div>

                    {error && <p className="text-red-500">{error}</p>}
                    {isLoading ? <p className="dark:text-white">Loading...</p> : (
                        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-x-auto border border-slate-200 dark:border-slate-700">
                            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-400 font-heading">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">Reserved By</th>
                                        <th scope="col" className="px-6 py-3">Area</th>
                                        <th scope="col" className="px-6 py-3">Date & Time</th>
                                        <th scope="col" className="px-6 py-3">Status</th>
                                        <th scope="col" className="px-6 py-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAndSortedRequests.length > 0 ? filteredAndSortedRequests.map(req => (
                                        <tr 
                                            key={req.id} 
                                            className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 cursor-pointer"
                                            onClick={() => setSelectedRequest(req)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {(() => {
                                                        const userForRequest = usersMap.get(req.userId);
                                                        if (!userForRequest) {
                                                            return <UserIcon className="w-5 h-5 text-slate-400 flex-shrink-0" title="User" />;
                                                        }
                                                        switch (userForRequest.role) {
                                                            case 'student':
                                                                return <AcademicCapIcon className="w-5 h-5 text-slate-500 flex-shrink-0" title="Student/User" />;
                                                            case 'admin':
                                                            case 'superadmin':
                                                                return <BriefcaseIcon className="w-5 h-5 text-slate-500 flex-shrink-0" title="Admin/Staff" />;
                                                            default:
                                                                return <UserIcon className="w-5 h-5 text-slate-400 flex-shrink-0" title="User" />;
                                                        }
                                                    })()}
                                                    <span className="font-medium text-slate-900 whitespace-nowrap dark:text-white">{req.userName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">{areasMap.get(getAreaId(req)) || 'Unknown'}</td>
                                            <td className="px-6 py-4">{new Date(req.requestedStartDate).toLocaleDateString(undefined, { timeZone: 'UTC' })} at {'requestedStartTime' in req ? req.requestedStartTime : 'N/A'}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1 items-start">
                                                    <StatusBadge status={req.status} />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                                {renderActions(req)}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={6} className="text-center p-6">
                                                <p className="text-slate-500 dark:text-slate-400">No {activeTab} reservations match your criteria.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'accountability' && <AccountabilityList />}

             {isNewRequestModalOpen && (
                <NewRequestModal 
                    areas={areas}
                    onClose={() => setIsNewRequestModalOpen(false)}
                    onSuccess={() => {
                        setIsNewRequestModalOpen(false);
                        fetchData();
                    }}
                    minimumLeadDays={settings?.minimumLeadDays ?? 2}
                />
            )}

            {selectedRequest && (
                <ReservationDetailsModal 
                    reservation={selectedRequest}
                    onClose={() => setSelectedRequest(null)}
                />
            )}
        </div>
    );
};

export default AllRequestsPage;