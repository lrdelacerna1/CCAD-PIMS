// ─── RequestsPage.tsx ────────────────────────────────────────────────────────

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Area, EquipmentRequest, RoomRequest, User, EquipmentRequestStatus, RoomRequestStatus } from '../types';
import { getAreasApi } from '../../backend/api/areas';
import { getAllEquipmentRequestsApi, updateEquipmentRequestStatusApi } from '../../backend/api/equipmentRequests';
import { getAllRoomRequestsApi, updateRoomRequestStatusApi } from '../../backend/api/roomRequests';
import { getAllUsersApi } from '../../backend/api/auth';
import RequestManagementTable from '../components/dashboard/RequestManagementTable';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { SearchIcon } from '../components/Icons';
import { Button } from '../components/ui/Button';
import { ToggleSwitch } from '../components/ui/ToggleSwitch';
import ReservationDetailsModal from '../components/reservations/ReservationDetailsModal';

type AnyRequest = EquipmentRequest | RoomRequest;

// Type guards — use fields that actually exist on each type
const isEquipmentRequest = (r: AnyRequest): r is EquipmentRequest => 'requestedItems' in r;
const isRoomRequest = (r: AnyRequest): r is RoomRequest => 'roomTypeId' in r;

const RequestsPage: React.FC = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState<AnyRequest[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedRequestIds, setSelectedRequestIds] = useState<Set<string>>(new Set());
    const [actionMessage, setActionMessage] = useState('');

    const [searchQuery, setSearchQuery] = useState('');
    const [areaFilter, setAreaFilter] = useState('all');
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
    const [selectedRequest, setSelectedRequest] = useState<AnyRequest | null>(null);
    const [autoApproveEnabled, setAutoApproveEnabled] = useState(false);

    const fetchData = useCallback(async () => {
        if (!user) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const [equipmentData, roomData, areasData, usersData] = await Promise.all([
                getAllEquipmentRequestsApi(),
                getAllRoomRequestsApi(),
                getAreasApi(),
                getAllUsersApi(),
            ]);
            setRequests([...equipmentData, ...roomData]);
            setAreas(areasData || []);
            setUsers(usersData || []);
        } catch (err) {
            setError('We could not load the requests at this time. Please refresh the page to try again.');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const usersMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
    const areasMap = useMemo(() => new Map(areas.map(a => [a.id, a.name])), [areas]);

    // Both EquipmentRequest and RoomRequest have a top-level areaId
    const getAreaId = (req: AnyRequest): string => req.areaId;

    const filteredAndSortedRequests = useMemo(() => {
        const managedIds = new Set(user?.managedAreaIds || []);
        const isSuperAdmin = user?.role === 'superadmin';

        let processedRequests = requests.filter(r => {
            return r.status === 'Pending Approval' && (isSuperAdmin || managedIds.has(r.areaId));
        });

        if (areaFilter !== 'all') processedRequests = processedRequests.filter(r => r.areaId === areaFilter);
        if (searchQuery.trim() !== '') {
            processedRequests = processedRequests.filter(r =>
                r.userName.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        processedRequests.sort((a, b) => {
            const dateA = new Date(a.dateFiled).getTime();
            const dateB = new Date(b.dateFiled).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        return processedRequests;
    }, [requests, user, areaFilter, searchQuery, sortOrder]);

    const handleSelectionChange = (id: string, isSelected: boolean) => {
        setSelectedRequestIds(prev => {
            const newSet = new Set(prev);
            if (isSelected) newSet.add(id);
            else newSet.delete(id);
            return newSet;
        });
    };

    const handleSelectAll = (areAllSelected: boolean) => {
        if (areAllSelected) setSelectedRequestIds(new Set());
        else setSelectedRequestIds(new Set(filteredAndSortedRequests.map(r => r.id)));
    };

    const handleAction = async (ids: string[], action: 'approve' | 'reject') => {
        if (ids.length === 0) return;
        const status = action === 'approve' ? 'Approved' : 'Rejected';
        try {
            // Use correct type guards to split equipment vs room request IDs
            const equipmentIds = ids.filter(id => {
                const r = requests.find(req => req.id === id);
                return r && isEquipmentRequest(r);
            });
            const roomIds = ids.filter(id => {
                const r = requests.find(req => req.id === id);
                return r && isRoomRequest(r);
            });

            if (equipmentIds.length > 0) {
                await updateEquipmentRequestStatusApi(equipmentIds, status as EquipmentRequestStatus);
            }
            if (roomIds.length > 0) {
                await updateRoomRequestStatusApi(roomIds, status as RoomRequestStatus);
            }

            setActionMessage(`Successfully ${action === 'approve' ? 'approved' : 'rejected'} ${ids.length} request(s).`);
            setTimeout(() => setActionMessage(''), 3000);
            setSelectedRequestIds(new Set());
            fetchData();
        } catch (err) {
            setError(`Something went wrong while trying to ${action} the selected requests. Please try again.`);
        }
    };

    const areaFilterOptions = useMemo(() => {
        const baseOptions = [{ value: 'all', label: 'All Areas' }];
        const relevantAreas = user?.role === 'superadmin'
            ? areas
            : areas.filter(a => user?.managedAreaIds?.includes(a.id));
        return [...baseOptions, ...relevantAreas.map(a => ({ value: a.id, label: a.name }))];
    }, [areas, user]);

    return (
        <div className="container mx-auto p-6">
            <Link to="/" className="inline-flex items-center text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-500 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
            </Link>

            <div className="flex justify-between items-center mb-1">
                <h1 className="text-3xl font-bold dark:text-white">Requests for Approval</h1>
                <Link to="/all-requests">
                    <Button className="!w-auto">View All Requests</Button>
                </Link>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
                Showing {filteredAndSortedRequests.length} request(s) awaiting your action.
            </p>

            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Input label="Search by name" id="search-requests" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="e.g., Jane Doe" icon={<SearchIcon className="w-5 h-5" />} />
                    <Select label="Filter by area" id="area-filter" value={areaFilter} onChange={e => setAreaFilter(e.target.value)} options={areaFilterOptions} />
                    <Select label="Sort by date filed" id="sort-order" value={sortOrder} onChange={e => setSortOrder(e.target.value as 'newest' | 'oldest')} options={[{ value: 'newest', label: 'Newest First' }, { value: 'oldest', label: 'Oldest First' }]} />
                </div>
                <div className="flex justify-start pt-4 border-t border-gray-200 dark:border-gray-600">
                    <ToggleSwitch id="auto-approve-toggle" label="Auto-Approve New Requests" enabled={autoApproveEnabled} onChange={setAutoApproveEnabled} />
                </div>
            </div>

            {actionMessage && (
                <div className="mb-4 p-3 rounded-md bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                    {actionMessage}
                </div>
            )}
            {error && (
                <div className="mb-4 p-3 rounded-md bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                    {error}
                </div>
            )}

            {isLoading ? (
                <p className="dark:text-white text-center">Loading requests...</p>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-x-auto">
                    <RequestManagementTable
                        requests={filteredAndSortedRequests}
                        areasMap={areasMap}
                        usersMap={usersMap}
                        selectedIds={selectedRequestIds}
                        onSelectionChange={handleSelectionChange}
                        onSelectAll={handleSelectAll}
                        onApprove={ids => handleAction(ids, 'approve')}
                        onReject={ids => handleAction(ids, 'reject')}
                        onRowClick={req => setSelectedRequest(req)}
                    />
                </div>
            )}

            {selectedRequest && (
                <ReservationDetailsModal reservation={selectedRequest} onClose={() => setSelectedRequest(null)} />
            )}
        </div>
    );
};

export default RequestsPage;