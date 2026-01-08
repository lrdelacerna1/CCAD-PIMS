import React, { useState, useEffect, useMemo } from 'react';
import { getMonthlyAvailabilityApi } from '../../../backend/api/calendar';
import { DailyAvailability } from '../../types';
import { ChevronUpIcon, ChevronDownIcon } from '../Icons';

interface CalendarViewProps {
    year: number;
    month: number; // 0-indexed
    onMonthChange: (year: number, month: number) => void;
    areaId: string;
    resourceType: 'equipment' | 'rooms';
    onDayClick: (date: Date) => void;
}

const Legend: React.FC = () => (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 mt-2 mb-4 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-200 dark:bg-emerald-900/50 border border-slate-300 dark:border-slate-600"></span>
            <span>High</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-200 dark:bg-amber-900/50 border border-slate-300 dark:border-slate-600"></span>
            <span>Medium</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-200 dark:bg-orange-900/50 border border-slate-300 dark:border-slate-600"></span>
            <span>Low</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-200 dark:bg-rose-900/50 border border-slate-300 dark:border-slate-600"></span>
            <span>Unavailable</span>
        </div>
        <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-100 dark:bg-slate-800/50 border border-slate-300 dark:border-slate-600"></span>
            <span>Past</span>
        </div>
    </div>
);


const CalendarView: React.FC<CalendarViewProps> = ({ year, month, onMonthChange, areaId, resourceType, onDayClick }) => {
    const [availabilityData, setAvailabilityData] = useState<Map<string, DailyAvailability>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAvailability = async () => {
            setIsLoading(true);
            try {
                const data = await getMonthlyAvailabilityApi(year, month, areaId, resourceType);
                const map = new Map(data.map(d => [d.date, d]));
                setAvailabilityData(map);
            } catch (error) {
                console.error(`Failed to fetch calendar availability for ${resourceType}`, error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAvailability();
    }, [year, month, areaId, resourceType]);

    const handlePrevMonth = () => {
        onMonthChange(year, month - 1);
    };

    const handleNextMonth = () => {
        onMonthChange(year, month + 1);
    };

    const calendarGrid = useMemo(() => {
        const grid = [];
        const firstDay = new Date(Date.UTC(year, month, 1)).getUTCDay();
        const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        
        for (let i = 0; i < firstDay; i++) {
            grid.push(<div key={`empty-start-${i}`} className="border-r border-b dark:border-slate-700"></div>);
        }

        const now = new Date();
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(Date.UTC(year, month, day));
            const dateString = date.toISOString().split('T')[0];
            const dayData = availabilityData.get(dateString);
            const level = dayData?.level || 'none';
            const availableCount = dayData ? dayData.total - dayData.booked : 0;
            const isPast = date < today;

            const availabilityClasses: { [key in DailyAvailability['level']]: string } = {
                high: 'bg-emerald-100 dark:bg-emerald-900/50 hover:bg-emerald-200 dark:hover:bg-emerald-800/50',
                medium: 'bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 dark:hover:bg-amber-800/50',
                low: 'bg-orange-100 dark:bg-orange-900/50 hover:bg-orange-200 dark:hover:bg-orange-800/50',
                none: 'bg-rose-100 dark:bg-rose-900/50 hover:bg-rose-200 dark:hover:bg-rose-800/50',
            };
            
            let cellClass = `p-2 border-r border-b dark:border-slate-700 transition-colors duration-200 h-28 flex flex-col justify-between`;
            
            if (isPast) {
                 cellClass += ' bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500';
            } else {
                 cellClass += ` cursor-pointer ${availabilityClasses[level]}`;
            }

            grid.push(
                <div key={day} className={cellClass} onClick={() => !isPast && onDayClick(date)}>
                    <span className="font-semibold self-end">{day}</span>
                    {!isPast && dayData && (
                        <span className="text-xs text-center text-slate-700 dark:text-slate-300 font-medium">
                           {availableCount > 0 ? `${availableCount} available` : 'None'}
                        </span>
                    )}
                </div>
            );
        }
        return grid;
    }, [year, month, availabilityData, onDayClick]);

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-2">
                <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                    <ChevronUpIcon className="w-6 h-6 transform -rotate-90" />
                </button>
                <h2 className="text-xl font-bold dark:text-white">
                    {new Date(Date.UTC(year, month)).toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                </h2>
                <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                     <ChevronDownIcon className="w-6 h-6 transform -rotate-90" />
                </button>
            </div>
            <Legend />
            {isLoading && <div className="text-center p-8 dark:text-white">Loading Calendar...</div>}
            {!isLoading && (
                 <div className="grid grid-cols-7 border-t border-l dark:border-slate-700">
                    {weekdays.map(day => (
                        <div key={day} className="p-2 text-center font-semibold text-slate-600 dark:text-slate-300 border-r border-b dark:border-slate-700">{day}</div>
                    ))}
                    {calendarGrid}
                </div>
            )}
        </div>
    );
};

export default CalendarView;