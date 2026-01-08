import React, { useState, useEffect } from 'react';
import { ReservationSettings } from '../../types';
import { updateSettingsApi } from '../../../backend/api/settings';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { InformationCircleIcon, CurrencyDollarIcon, ClockIcon } from '../Icons';

interface RulesAndPenaltiesProps {
    initialSettings: ReservationSettings;
    refreshData: () => void;
}

const RulesAndPenalties: React.FC<RulesAndPenaltiesProps> = ({ initialSettings, refreshData }) => {
    const [settings, setSettings] = useState(initialSettings);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        setSettings(initialSettings);
    }, [initialSettings]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: name === 'penaltyAmount' || name === 'minimumLeadDays' ? Number(value) : value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (settings.minimumLeadDays < 0 || settings.penaltyAmount < 0) {
            setError('Please enter valid non-negative numbers.');
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccessMessage('');
        try {
            await updateSettingsApi(settings);
            setSuccessMessage('Settings updated successfully!');
            setTimeout(() => setSuccessMessage(''), 3000);
            refreshData(); 
        } catch (err: any) {
            setError(err.message || 'Failed to update settings.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700 max-w-3xl mx-auto">
            <div className="p-6 border-b dark:border-slate-700">
                <h2 className="text-xl font-semibold dark:text-white">General Rules & Penalties</h2>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-6">
                {error && <p className="text-sm text-red-500">{error}</p>}
                {successMessage && <p className="text-sm text-green-500">{successMessage}</p>}
                
                <div className="space-y-4">
                    <h3 className="text-lg font-medium dark:text-white border-b dark:border-slate-600 pb-2">Reservation Rules</h3>
                    <Input
                        label="Reservation Lead Time (Days)"
                        id="minimumLeadDays"
                        name="minimumLeadDays"
                        type="number"
                        min="0"
                        value={settings.minimumLeadDays}
                        onChange={handleInputChange}
                        required
                        icon={<ClockIcon className="w-5 h-5" />}
                    />
                    <div className="p-3 bg-sky-50 dark:bg-sky-900/40 rounded-lg border border-sky-200 dark:border-sky-800 text-xs text-sky-700 dark:text-sky-300">
                        <p>
                            <InformationCircleIcon className="w-4 h-4 inline-block mr-1 align-middle" />
                            Minimum number of days in advance a user must book. '0' means same-day booking is allowed.
                        </p>
                    </div>
                </div>

                <div className="space-y-4 pt-6 border-t dark:border-slate-600">
                    <h3 className="text-lg font-medium dark:text-white border-b dark:border-slate-600 pb-2">Penalty Rules</h3>
                     <Input
                        label="Penalty Amount (PHP)"
                        id="penaltyAmount"
                        name="penaltyAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={settings.penaltyAmount}
                        onChange={handleInputChange}
                        required
                        icon={<CurrencyDollarIcon className="w-5 h-5" />}
                    />
                    <Select
                        label="Penalty Interval"
                        id="penaltyInterval"
                        name="penaltyInterval"
                        value={settings.penaltyInterval}
                        onChange={handleInputChange}
                        options={[
                            { value: 'per_day', label: 'Per Day' },
                            { value: 'per_hour', label: 'Per Hour' },
                        ]}
                    />
                    <div className="p-3 bg-sky-50 dark:bg-sky-900/40 rounded-lg border border-sky-200 dark:border-sky-800 text-xs text-sky-700 dark:text-sky-300">
                        <p>
                            <InformationCircleIcon className="w-4 h-4 inline-block mr-1 align-middle" />
                            This defines the base amount and frequency for penalties issued for overdue items.
                        </p>
                    </div>
                </div>
                
                <div className="pt-4 flex justify-end">
                    <Button type="submit" isLoading={isLoading} className="!w-auto">
                        Save Settings
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default RulesAndPenalties;