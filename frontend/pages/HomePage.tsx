import React from 'react';
import { useAuth } from '../hooks/useAuth';
import AdminHomePage from '../components/dashboard/AdminHomePage';
import UserDashboard from '../components/dashboard/UserDashboard';
import GuestHomePage from '../components/dashboard/GuestHomePage';

const HomePage: React.FC = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
    }

    if (user) {
        if (user.role === 'admin' || user.role === 'superadmin') {
            return <AdminHomePage />;
        }
        return <UserDashboard />;
    }

    return <GuestHomePage />;
};

export default HomePage;