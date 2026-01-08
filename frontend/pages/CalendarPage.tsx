import React, { useState, useEffect, useCallback } from 'react';
// FIX: Import ReservationSettings type.
import { Area, ReservationSettings } from '../types';
import { getAreasApi } from '../../backend/api/areas';
import CalendarView from '../components/calendar/CalendarView';
import DailyDetailsModal from '../components/calendar/DailyDetailsModal';
import NewRequestModal from '../components/requests/NewRequestModal';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
// FIX: Import getSettingsApi to fetch system settings.
import { getSettingsApi } from '../../backend/api/settings';

type PreselectedItem = {
    name: string;
    type: 'equipment' | 'room';
    areaId: string;
}

const CalendarPage: React.FC = () => {
    const now = new Date();
    const [year, setYear] = useState(now.getUTCFullYear());
    const [month, setMonth] = useState(now.getUTCMonth()); // 0-indexed

    const [resourceType, setResourceType] = useState<'equipment' | 'rooms'>('equipment');
    const [areaId, setAreaId] = useState('all');
    const [areas, setAreas] = useState<Area[]>([]);
    
    // State for modals
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState(false);
    const [preselectedItem, setPreselectedItem] = useState<PreselectedItem | null>(null);
    // FIX: Add state for system settings.
    const [settings, setSettings] = useState<ReservationSettings | null>(null);

    const fetchData = useCallback(async () => {
        try {
            // FIX: Fetch settings along with areas data.
            const [areasData, settingsData] = await Promise.all([
                getAreasApi(),
                getSettingsApi(),
            ]);
            setAreas(areasData);
            setSettings(settingsData);
        } catch (error) {
            console.error("Failed to load areas for calendar filter", error);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const areaOptions = [{ value: 'all', label: 'All Areas' }, ...areas.map(a => ({ value: a.id, label: a.name }))];
    
    const handleMonthChange = (newYear: number, newMonth: number) => {
        if (newMonth < 0) {
            setYear(newYear - 1);
            setMonth(11);
        } else if (newMonth > 11) {
            setYear(newYear + 1);
            setMonth(0);
        } else {
            setYear(newYear);
            setMonth(newMonth);
        }
    };

    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
    };

    // FIX: Updated 'type' parameter to accept 'equipment' | 'rooms' and added logic to correctly map 'rooms' to 'room' for state consistency.
    const handleRequestFromCalendar = (item: { name: string; areaId: string; }, type: 'equipment' | 'rooms', date: string) => {
        setPreselectedItem({ name: item.name, type: type === 'rooms' ? 'room' : 'equipment', areaId: item.areaId });
        setSelectedDate(new Date(date + 'T00:00:00Z')); // Ensure date is passed correctly
        setIsNewRequestModalOpen(true);
    };

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold dark:text-white mb-6">Availability Calendar</h1>
            
            <div className="mb-6 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <p className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Resource Type</p>
                        <div className="flex rounded-md shadow-sm">
                            <Button
                                type="button"
                                onClick={() => setResourceType('equipment')}
                                className={`!w-full rounded-r-none ${resourceType === 'equipment' ? '' : '!bg-gray-300 !text-black dark:!bg-gray-600 dark:!text-white'}`}
                            >
                                Equipment
                            </Button>
                            <Button
                                type="button"
                                onClick={() => setResourceType('rooms')}
                                className={`!w-full rounded-l-none ${resourceType === 'rooms' ? '' : '!bg-gray-300 !text-black dark:!bg-gray-600 dark:!text-white'}`}
                            >
                                Rooms
                            </Button>
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <Select
                            label="Filter by Area"
                            id="calendar-area-filter"
                            value={areaId}
                            onChange={e => setAreaId(e.target.value)}
                            options={areaOptions}
                        />
                    </div>
                </div>
            </div>

            <CalendarView
                year={year}
                month={month}
                onMonthChange={handleMonthChange}
                areaId={areaId}
                resourceType={resourceType}
                onDayClick={handleDayClick}
            />

            {selectedDate && (
                <DailyDetailsModal
                    date={selectedDate.toISOString().split('T')[0]}
                    areaId={areaId}
                    resourceType={resourceType}
                    areasMap={new Map(areas.map(a => [a.id, a.name]))}
                    onClose={() => setSelectedDate(null)}
                    onRequest={handleRequestFromCalendar}
                />
            )}
            
            {isNewRequestModalOpen && selectedDate && (
                 <NewRequestModal
                    areas={areas}
                    onClose={() => setIsNewRequestModalOpen(false)}
                    onSuccess={() => setIsNewRequestModalOpen(false)}
                    preselectedItem={preselectedItem}
                    preselectedDate={selectedDate.toISOString().split('T')[0]}
                    // FIX: Added missing 'minimumLeadDays' prop.
                    minimumLeadDays={settings?.minimumLeadDays ?? 2}
                />
            )}
        </div>
    );
};

export default CalendarPage;