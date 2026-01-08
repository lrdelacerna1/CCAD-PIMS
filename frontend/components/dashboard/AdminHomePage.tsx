import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Area, EquipmentRequest, RoomRequest } from '../../types';
import { getAllEquipmentRequestsApi } from '../../../backend/api/equipmentRequests';
import { getAllRoomRequestsApi } from '../../../backend/api/roomRequests';
import { getAreasApi } from '../../../backend/api/areas';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import DashboardCalendar from './DashboardCalendar';

type AnyRequest = EquipmentRequest | RoomRequest;

const AdminHomePage: React.FC = () => {
    const [requests, setRequests] = useState<AnyRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [equipmentData, roomData] = await Promise.all([
                getAllEquipmentRequestsApi(),
                getAllRoomRequestsApi(),
            ]);
            setRequests([...equipmentData, ...roomData]);
        } catch (err) {
            setError('Failed to load dashboard data. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const summaryCounts = useMemo(() => {
        const equipmentReqs = requests.filter(r => 'requestedItems' in r) as EquipmentRequest[];
        const roomReqs = requests.filter(r => 'requestedRoom' in r) as RoomRequest[];

        const pendingConfirmation = equipmentReqs.filter(r => r.status === 'Pending Confirmation').length + roomReqs.filter(r => r.status === 'Pending Confirmation').length;
        const readyForApproval = equipmentReqs.filter(r => r.status === 'For Approval').length + roomReqs.filter(r => r.status === 'For Approval').length;
        const upcoming = equipmentReqs.filter(r => r.status === 'Ready for Pickup').length + roomReqs.filter(r => r.status === 'Ready for Check-in').length;

        return { pendingConfirmation, readyForApproval, upcoming };
    }, [requests]);


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
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white h-14 flex items-center justify-center">Pending Confirmation</h2>
                        <div className="flex-grow flex items-center justify-center">
                             <p className="text-5xl font-bold text-up-maroon-700">{summaryCounts.pendingConfirmation}</p>
                        </div>
                        <Link to="/all-requests" state={{ statusFilter: 'Pending Confirmation' }} target="_self" className="w-full mt-4">
                            <Button className="!w-full">View All</Button>
                        </Link>
                    </div>
                </Card>
                 <Card className="!p-0 w-full !max-w-none flex flex-col">
                     <div className="p-6 flex flex-col items-center text-center flex-grow">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white h-14 flex items-center justify-center">Ready for Approval</h2>
                        <div className="flex-grow flex items-center justify-center">
                             <p className="text-5xl font-bold text-up-maroon-700">{summaryCounts.readyForApproval}</p>
                        </div>
                        <Link to="/all-requests" state={{ statusFilter: 'For Approval' }} target="_self" className="w-full mt-4">
                            <Button className="!w-full">View All</Button>
                        </Link>
                    </div>
                </Card>
                <Card className="!p-0 w-full !max-w-none flex flex-col">
                    <div className="p-6 flex flex-col items-center text-center flex-grow">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white h-14 flex items-center justify-center">Upcoming Pick-ups & Check-ins</h2>
                        <div className="flex-grow flex items-center justify-center">
                            <p className="text-5xl font-bold text-up-maroon-700">{summaryCounts.upcoming}</p>
                        </div>
                        <Link to="/all-requests" target="_self" className="w-full mt-4">
                            <Button className="!w-full">View All</Button>
                        </Link>
                    </div>
                </Card>
            </div>

            <div className="mt-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">All Reservations Calendar</h2>
                <DashboardCalendar requests={requests} />
            </div>

        </div>
    );
};

export default AdminHomePage;