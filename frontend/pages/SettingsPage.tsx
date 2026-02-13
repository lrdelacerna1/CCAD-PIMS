import React from 'react';
import { useAuth } from '../hooks/useAuth';
import AreaSettings from '../components/admin/AreaSettings';

const SettingsPage: React.FC = () => {
    const { user } = useAuth();

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold dark:text-white mb-6 font-heading">Area Settings</h1>
            
            {user?.role === 'admin' ? (
                <AreaSettings />
            ) : (
                <p>You do not have permission to view this page.</p>
            )}
        </div>
    );
};

export default SettingsPage;