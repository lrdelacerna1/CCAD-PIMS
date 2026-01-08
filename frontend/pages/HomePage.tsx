import React from 'react';
import { useAuth } from '../hooks/useAuth';
import AdminHomePage from '../components/dashboard/AdminHomePage';
import UserDashboard from '../components/dashboard/UserDashboard';
import GuestHomePage from '../components/dashboard/GuestHomePage';

const HomePage: React.FC = () => {
    const { user } = useAuth();

    if (user) {
        if (user.role === 'admin' || user.role === 'superadmin') {
            return <AdminHomePage />;
        }
        return <UserDashboard />;
    }

    return <GuestHomePage />;
};

export default HomePage;