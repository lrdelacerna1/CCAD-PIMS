import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Area } from '../../types';
import { getAreasApi, updateAreaApi } from '../../../backend/api/areas';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { InformationCircleIcon, CurrencyDollarIcon } from '../Icons';

const AreaSettings: React.FC = () => {
    const { user } = useAuth();
    const [areas, setAreas] = useState<Area[]>([]);
    const [selectedArea, setSelectedArea] = useState<Area | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const fetchAreas = useCallback(async (selectedAreaId?: string) => {
        if (!user) return;
        setIsLoading(true);
        try {
            const allAreas = await getAreasApi();

            // Filter areas where adminIds array contains this user's id
            const managedAreas = allAreas.filter(area =>
                (area as any).adminIds?.includes(user.id)
            );

            setAreas(managedAreas);

            if (managedAreas.length > 0) {
                const newSelectedArea = managedAreas.find(a => a.id === selectedAreaId) || managedAreas[0];
                setSelectedArea(newSelectedArea);
            }
        } catch (err) {
            setError('Failed to load areas.');
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchAreas();
    }, [fetchAreas]);

    const handleAreaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const area = areas.find(a => a.id === e.target.value);
        setSelectedArea(area || null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (!selectedArea) return;
        setSelectedArea(prev => ({
            ...(prev as Area),
            penaltySettings: {
                ...prev?.penaltySettings,
                [name]: name === 'penaltyAmount' ? Number(value) : value
            }
        }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedArea) return;
        if (selectedArea.penaltySettings && selectedArea.penaltySettings.penaltyAmount < 0) {
            setError('Please enter a valid non-negative penalty amount.');
            return;
        }
        setIsLoading(true);
        setError('');
        setSuccessMessage('');
        try {
            await updateAreaApi(selectedArea.id, { penaltySettings: selectedArea.penaltySettings });
            setSuccessMessage('Settings updated successfully!');
            fetchAreas(selectedArea.id);
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err: any) {
            setError(err.message || 'Failed to update settings.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && areas.length === 0) return <div>Loading...</div>;
    if (!user) return <div>You must be logged in to view this page.</div>;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700">
                    <div className="p-6 border-b dark:border-slate-700">
                        <h2 className="text-xl font-semibold dark:text-white">Managed Areas</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">A list of all the areas you manage.</p>
                    </div>
                    <div className="p-6">
                        {areas.length > 0 ? (
                            <ul className="space-y-2">
                                {areas.map(area => (
                                    <li key={area.id} className="text-slate-700 dark:text-slate-300">{area.name}</li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-slate-500 dark:text-slate-400">You are not managing any areas.</p>
                        )}
                    </div>
                </div>
            </div>

            <div className="lg:col-span-2">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border dark:border-slate-700">
                    <div className="p-6 border-b dark:border-slate-700">
                        <h2 className="text-xl font-semibold dark:text-white">Penalty Rules</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Set the penalty amount and interval for each area you manage.</p>
                    </div>
                    <form onSubmit={handleSave} className="p-6 space-y-6">
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        {successMessage && <p className="text-sm text-green-500">{successMessage}</p>}

                        {areas.length === 0 && !isLoading && (
                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                No areas assigned to you yet. Contact your superadmin to be assigned to an area.
                            </p>
                        )}

                        {areas.length > 0 && (
                            <>
                                <Select
                                    label="Select an Area"
                                    id="area-select"
                                    value={selectedArea?.id || ''}
                                    onChange={handleAreaChange}
                                    options={areas.map(area => ({ value: area.id, label: area.name }))}
                                    disabled={isLoading}
                                />

                                {selectedArea && (
                                    <div className="space-y-4 pt-4 border-t dark:border-slate-700">
                                        <Input
                                            label="Penalty Amount (PHP)"
                                            id="penaltyAmount"
                                            name="penaltyAmount"
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={selectedArea.penaltySettings?.penaltyAmount || 0}
                                            onChange={handleInputChange}
                                            required
                                            icon={<CurrencyDollarIcon className="w-5 h-5" />}
                                        />
                                        <Select
                                            label="Penalty Interval"
                                            id="penaltyInterval"
                                            name="penaltyInterval"
                                            value={selectedArea.penaltySettings?.penaltyInterval || 'per_day'}
                                            onChange={handleInputChange}
                                            options={[
                                                { value: 'per_day', label: 'Per Day' },
                                                { value: 'per_hour', label: 'Per Hour' },
                                            ]}
                                        />
                                        <div className="p-3 bg-sky-50 dark:bg-sky-900/40 rounded-lg border border-sky-200 dark:border-sky-800 text-xs text-sky-700 dark:text-sky-300">
                                            <p>
                                                <InformationCircleIcon className="w-4 h-4 inline-block mr-1 align-middle" />
                                                This defines the base amount and frequency for penalties issued for overdue items in the selected area.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 flex justify-end">
                                    <Button type="submit" isLoading={isLoading} disabled={!selectedArea} className="!w-auto">
                                        Save Settings
                                    </Button>
                                </div>
                            </>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AreaSettings;