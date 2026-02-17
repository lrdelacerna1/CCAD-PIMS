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
                <div className="p-6 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-slate-600 dark:text-slate-400">
                        You do not have access to this page. Please contact your administrator if you believe this is a mistake.
                    </p>
                </div>
            )}
        </div>
    );
};

export default SettingsPage;