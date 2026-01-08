import React, { useState, useEffect } from 'react';
import { ReservationSettings } from '../../types';
import { updateSettingsApi } from '../../../backend/api/settings';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { InformationCircleIcon } from '../Icons';

interface SystemSettingsProps {
    initialSettings: ReservationSettings;
    refreshData: () => void;
}

const SystemSettings: React.FC<SystemSettingsProps> = ({ initialSettings, refreshData }) => {
    const [leadDays, setLeadDays] = useState<number | string>(initialSettings.minimumLeadDays);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        setLeadDays(initialSettings.minimumLeadDays);
    }, [initialSettings]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        const numLeadDays = Number(leadDays);
        if (isNaN(numLeadDays) || numLeadDays < 0) {
            setError('Please enter a valid non-negative number.');
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccessMessage('');
        try {
            await updateSettingsApi({ minimumLeadDays: numLeadDays });
            setSuccessMessage('Settings updated successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
            refreshData(); // To ensure parent has the latest settings if needed
        } catch (err: any) {
            setError(err.message || 'Failed to update settings.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm flex flex-col h-full overflow-hidden border dark:border-slate-700">
            <div className="p-6 border-b dark:border-slate-700">
                <h2 className="text-xl font-semibold dark:text-white mb-4">System Settings</h2>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 flex-grow">
                 {error && <p className="text-sm text-red-500 -mt-2 mb-2">{error}</p>}
                {successMessage && <p className="text-sm text-green-500 -mt-2 mb-2">{successMessage}</p>}
                
                <Input
                    label="Reservation Lead Time (Days)"
                    id="leadDays"
                    type="number"
                    min="0"
                    value={leadDays}
                    onChange={(e) => setLeadDays(e.target.value)}
                    required
                />

                <div className="p-3 bg-sky-50 dark:bg-sky-900/40 rounded-lg border border-sky-200 dark:border-sky-800 text-xs text-sky-700 dark:text-sky-300">
                    <p>
                        <InformationCircleIcon className="w-4 h-4 inline-block mr-1 align-middle" />
                        This is the minimum number of days in advance a user must make a reservation. For example, a value of '2' means users must book at least two days before their desired start date.
                    </p>
                </div>
                
                <div className="pt-2">
                    <Button type="submit" isLoading={isLoading} className="!w-auto">
                        Save Settings
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default SystemSettings;