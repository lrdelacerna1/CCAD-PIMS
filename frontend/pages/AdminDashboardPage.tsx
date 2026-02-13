import React from 'react';
import { useAuth } from '../hooks/useAuth';
import SuperAdminDashboard from '../components/admin/SuperAdminDashboard';
import StandardAdminDashboard from '../components/admin/StandardAdminDashboard';

const AdminDashboardPage: React.FC = () => {
    const { user } = useAuth();

    const isSuperAdmin = user?.role === 'superadmin';

    return (
        <div className="container mx-auto p-6">
             <h1 className="text-3xl font-bold dark:text-white mb-6">
                {isSuperAdmin ? 'Areas and Administrators' : 'Admin Dashboard'}
            </h1>
            {isSuperAdmin && <SuperAdminDashboard />}
            {user?.role === 'admin' && <StandardAdminDashboard />}
        </div>
    );
};

export default AdminDashboardPage;