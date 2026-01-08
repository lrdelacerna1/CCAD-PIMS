import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ReservationSettings } from '../types';
import { getSettingsApi } from '../../backend/api/settings';
import AccountabilityList from '../components/admin/AccountabilityList';
import RulesAndPenalties from '../components/admin/RulesAndPenalties';

const SettingsPage: React.FC = () => {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'superadmin';

    const [activeTab, setActiveTab] = useState('accountability');
    const [settings, setSettings] = useState<ReservationSettings | null>(null);
    const [isLoading, setIsLoading] = useState(isSuperAdmin);
    const [error, setError] = useState('');

    const fetchData = useCallback(async () => {
        if (!isSuperAdmin) return;
        setIsLoading(true);
        setError('');
        try {
            const currentSettings = await getSettingsApi();
            setSettings(currentSettings);
        } catch (err) {
            setError('Failed to load system settings.');
        } finally {
            setIsLoading(false);
        }
    }, [isSuperAdmin]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const activeTabClasses = "border-b-2 border-up-maroon-700 text-up-maroon-700 dark:text-up-maroon-400 font-bold";
    const inactiveTabClasses = "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-300";

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold dark:text-white mb-6 font-heading">Settings</h1>

            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('accountability')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'accountability' ? activeTabClasses : inactiveTabClasses}`}>
                        Accountability
                    </button>
                    {isSuperAdmin && (
                        <button onClick={() => setActiveTab('rules')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'rules' ? activeTabClasses : inactiveTabClasses}`}>
                            Rules & Penalties
                        </button>
                    )}
                </nav>
            </div>

            <div>
                {activeTab === 'accountability' && <AccountabilityList />}
                {activeTab === 'rules' && isSuperAdmin && (
                    <>
                        {isLoading && <p>Loading settings...</p>}
                        {error && <p className="text-red-500">{error}</p>}
                        {settings && <RulesAndPenalties initialSettings={settings} refreshData={fetchData} />}
                    </>
                )}
            </div>
        </div>
    );
};

export default SettingsPage;