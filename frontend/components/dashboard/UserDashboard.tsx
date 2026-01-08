import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
// FIX: Import ReservationSettings type.
import { EquipmentRequest, RoomRequest, Area, ReservationSettings } from '../../types';
import { getEquipmentRequestsByUserIdApi } from '../../../backend/api/equipmentRequests';
import { getRoomRequestsByUserIdApi } from '../../../backend/api/roomRequests';
import { getAreasApi } from '../../../backend/api/areas';
import { Button } from '../ui/Button';
import { CalendarPlusIcon, ListBulletIcon, ViewGridIcon } from '../Icons';
import NewRequestModal from '../requests/NewRequestModal';
import DashboardCalendar from './DashboardCalendar';
import RequestSummary from './RequestSummary';
// FIX: Import getSettingsApi to fetch system settings.
import { getSettingsApi } from '../../../backend/api/settings';

const UserDashboard: React.FC = () => {
    const { user } = useAuth();
    const [equipmentRequests, setEquipmentRequests] = useState<EquipmentRequest[]>([]);
    const [roomRequests, setRoomRequests] = useState<RoomRequest[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
    // FIX: Add state for system settings.
    const [settings, setSettings] = useState<ReservationSettings | null>(null);

    const fetchData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            // FIX: Fetch settings along with other dashboard data.
            const [eqData, roomData, areasData, settingsData] = await Promise.all([
                getEquipmentRequestsByUserIdApi(user.id),
                getRoomRequestsByUserIdApi(user.id),
                getAreasApi(),
                getSettingsApi(),
            ]);
            setEquipmentRequests(eqData);
            setRoomRequests(roomData);
            setAreas(areasData);
            setSettings(settingsData);
        } catch (error) {
            console.error("Failed to fetch user dashboard data", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const allRequests = useMemo(() => {
        return [...equipmentRequests, ...roomRequests];
    }, [equipmentRequests, roomRequests]);


    if (isLoading) {
        return <div className="container mx-auto p-6 text-center dark:text-white">Loading your dashboard...</div>;
    }

    return (
        <div className="container mx-auto p-6 space-y-8">
            <div>
                <h1 className="text-3xl font-bold dark:text-white">Welcome, {user?.firstName}!</h1>
                <p className="text-lg text-slate-600 dark:text-slate-300">Here's a quick summary of your activities.</p>
            </div>

            {/* Quick Action Buttons */}
            <div>
                <h2 className="text-2xl font-semibold dark:text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                     <Button 
                        className="w-full !py-6 !text-base !justify-start"
                        onClick={() => setIsNewRequestModalOpen(true)}
                    >
                        <CalendarPlusIcon className="w-6 h-6 mr-3"/>
                        New Request
                    </Button>
                     <Link to="/my-reservations" target="_self" className="w-full">
                        <Button className="w-full !py-6 !text-base !justify-start" variant="dark">
                           <ListBulletIcon className="w-6 h-6 mr-3"/>
                            My Requests
                        </Button>
                    </Link>
                     <Link to="/catalog" target="_self" className="w-full">
                        <Button className="w-full !py-6 !text-base !justify-start" variant="dark">
                            <ViewGridIcon className="w-6 h-6 mr-3"/>
                            Browse Catalog
                        </Button>
                    </Link>
                </div>
            </div>
            
            {/* Main Dashboard Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
                {/* Request Summary */}
                <div className="lg:col-span-1 h-full">
                     <RequestSummary equipmentRequests={equipmentRequests} roomRequests={roomRequests} />
                </div>
                {/* Calendar */}
                <div className="lg:col-span-3 h-full">
                    <DashboardCalendar requests={allRequests} />
                </div>
            </div>


            {isNewRequestModalOpen && (
                <NewRequestModal
                    areas={areas}
                    onClose={() => setIsNewRequestModalOpen(false)}
                    onSuccess={() => {
                        setIsNewRequestModalOpen(false);
                        fetchData(); // Re-fetch data to update summary cards
                    }}
                    // FIX: Added missing 'minimumLeadDays' prop.
                    minimumLeadDays={settings?.minimumLeadDays ?? 2}
                />
            )}
        </div>
    );
};

export default UserDashboard;