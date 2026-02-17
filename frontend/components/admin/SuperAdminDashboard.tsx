import React, { useState, useEffect, useCallback } from 'react';
import AreaManagement from './AreaManagement';
import AdminAssignment from './AdminAssignment';
import { useAuth } from '../../hooks/useAuth';
import { User, Area } from '../../types';
import { getAllUsersApi } from '../../../backend/api/auth';
import { getAreasApi } from '../../../backend/api/areas';


const SuperAdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [areas, setAreas] = useState<Area[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const [allUsers, allAreas] = await Promise.all([
                getAllUsersApi(),
                getAreasApi(),
            ]);
            setUsers(allUsers);
            setAreas(allAreas);
        } catch (err) {
            setError('Failed to load dashboard data.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (isLoading) {
        return <p className="dark:text-white">Loading dashboard...</p>;
    }
    
    if (error) {
         return <p className="text-red-500">{error}</p>;
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 flex-grow">
            <div className="xl:col-span-1">
                <AreaManagement areas={areas} users={users} refreshData={fetchData} />
            </div>
            <div className="xl:col-span-1">
                <AdminAssignment admins={users.filter(u => u.role === 'admin')} areas={areas} refreshData={fetchData} />
            </div>
        </div>
    );
};

export default SuperAdminDashboard;