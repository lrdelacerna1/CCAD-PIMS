import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { EquipmentRequest, RoomRequest } from '../../types';
import { getAllEquipmentRequestsApi } from '../../../backend/api/equipmentRequests';
import { getAllRoomRequestsApi } from '../../../backend/api/roomRequests';
import { getAreasApi } from '../../../backend/api/areas';
import { useAuth } from '../../hooks/useAuth';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import DashboardCalendar from './DashboardCalendar';

type AnyRequest = EquipmentRequest | RoomRequest;

function getAreaId(req: AnyRequest): string {
    return (req as any).areaId || '';
}

const AdminHomePage: React.FC = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState<AnyRequest[]>([]);
    const [managedAreaIds, setManagedAreaIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [equipmentData, roomData, areasData] = await Promise.all([
                getAllEquipmentRequestsApi(),
                getAllRoomRequestsApi(),
                getAreasApi(),
            ]);
            setRequests([...equipmentData, ...roomData]);

            if (user?.id) {
                const ids = new Set(
                    areasData
                        .filter(area => area.adminIds?.includes(user.id))
                        .map(area => area.id)
                );
                setManagedAreaIds(ids);
            }
        } catch (err) {
            setError('Failed to load dashboard data. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const managedRequests = useMemo(() => {
        const isSuperAdmin = user?.role === 'superadmin';
        console.log('role:', user?.role);
        console.log('isSuperAdmin:', isSuperAdmin);
        console.log('managedAreaIds set:', [...managedAreaIds]);
        console.log('all requests:', requests.map(r => ({ id: r.id, areaId: (r as any).areaId })));
        
        if (isSuperAdmin) return requests;
        return requests.filter(r => {
            const areaId = getAreaId(r);
            console.log('checking:', areaId, '| in set:', managedAreaIds.has(areaId));
            return areaId && managedAreaIds.has(areaId);
        });
    }, [requests, user, managedAreaIds]);

    const summaryCounts = useMemo(() => {
        console.log('managedRequests count:', managedRequests.length);
        const equipmentReqs = managedRequests.filter(r => 'requestedItems' in r) as EquipmentRequest[];
        const roomReqs = managedRequests.filter(r => !('requestedItems' in r)) as RoomRequest[];

        const pendingApproval =
            equipmentReqs.filter(r => r.status === 'Pending Approval').length +
            roomReqs.filter(r => r.status === 'Pending Approval').length;

        const upcoming =
            equipmentReqs.filter(r => r.status === 'Approved').length +
            roomReqs.filter(r => r.status === 'Approved').length;

        const readyForPickup =
            equipmentReqs.filter(r => r.status === 'Ready for Pickup').length +
            roomReqs.filter(r => r.status === 'Ready for Check-in').length;

        return { pendingApproval, upcoming, readyForPickup };
    }, [managedRequests]);

    if (isLoading) {
        return <div className="container mx-auto p-6 text-center dark:text-white">Loading Admin Dashboard...</div>;
    }

    if (error) {
        return <div className="container mx-auto p-6 text-center text-red-500">{error}</div>;
    }

    return (
        <div className="container mx-auto p-6 space-y-6">
            <h1 className="text-3xl font-bold dark:text-white">Admin Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="!p-0 w-full !max-w-none flex flex-col">
                    <div className="p-6 flex flex-col items-center text-center flex-grow">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white h-14 flex items-center justify-center">Pending Approval</h2>
                        <div className="flex-grow flex items-center justify-center">
                            <p className="text-5xl font-bold text-up-maroon-700">{summaryCounts.pendingApproval}</p>
                        </div>
                        <Link to="/all-requests" state={{ statusFilter: 'Pending Approval' }} target="_self" className="w-full mt-4">
                            <Button className="!w-full">View All</Button>
                        </Link>
                    </div>
                </Card>
                <Card className="!p-0 w-full !max-w-none flex flex-col">
                    <div className="p-6 flex flex-col items-center text-center flex-grow">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white h-14 flex items-center justify-center">Approved & Upcoming</h2>
                        <div className="flex-grow flex items-center justify-center">
                            <p className="text-5xl font-bold text-up-maroon-700">{summaryCounts.upcoming}</p>
                        </div>
                        <Link to="/all-requests" state={{ statusFilter: 'Approved' }} target="_self" className="w-full mt-4">
                            <Button className="!w-full">View All</Button>
                        </Link>
                    </div>
                </Card>
                <Card className="!p-0 w-full !max-w-none flex flex-col">
                    <div className="p-6 flex flex-col items-center text-center flex-grow">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white h-14 flex items-center justify-center">Ready for Pickup / Check-in</h2>
                        <div className="flex-grow flex items-center justify-center">
                            <p className="text-5xl font-bold text-up-maroon-700">{summaryCounts.readyForPickup}</p>
                        </div>
                        <Link to="/all-requests" state={{ statusFilter: 'Ready for Pickup' }} target="_self" className="w-full mt-4">
                            <Button className="!w-full">View All</Button>
                        </Link>
                    </div>
                </Card>
            </div>

            <div className="mt-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">All Reservations Calendar</h2>
                <DashboardCalendar requests={managedRequests} />
            </div>
        </div>
    );
};

export default AdminHomePage;