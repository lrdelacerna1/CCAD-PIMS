import React, { useState, useMemo, useEffect, useRef } from 'react';
import { EquipmentRequest, RoomRequest } from '../../types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { ChevronUpIcon, ChevronDownIcon, XIcon, InventoryIcon, BuildingOfficeIcon } from '../Icons';

type AnyRequest = EquipmentRequest | RoomRequest;

const EventPopover: React.FC<{ event: AnyRequest; position: { top: number; left: number }; onClose: () => void; }> = ({ event, position, onClose }) => {
    const isEquipment = 'requestedItems' in event;
    const ref = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Adjust position to stay within viewport
    const adjustedPosition = { ...position };
    if (ref.current) {
        const popoverRect = ref.current.getBoundingClientRect();
        if (position.left + popoverRect.width / 2 > window.innerWidth) {
            adjustedPosition.left = window.innerWidth - popoverRect.width / 2 - 16;
        }
        if (position.left - popoverRect.width / 2 < 0) {
            adjustedPosition.left = popoverRect.width / 2 + 16;
        }
    }
    
    return (
        <div
            ref={ref}
            style={{ top: adjustedPosition.top, left: adjustedPosition.left, position: 'fixed' }}
            className="z-20 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border dark:border-slate-600 p-4 transform -translate-y-full -translate-x-1/2"
        >
            <button onClick={onClose} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <XIcon className="w-5 h-5"/>
            </button>
            <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-full ${isEquipment ? 'bg-sky-100 dark:bg-sky-900/50' : 'bg-indigo-100 dark:bg-indigo-900/50'}`}>
                    {isEquipment ? <InventoryIcon className="w-5 h-5 text-sky-600 dark:text-sky-400" /> : <BuildingOfficeIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
                </div>
                <h4 className="font-bold text-slate-900 dark:text-white flex-1 truncate">{event.purpose}</h4>
            </div>
            <div className="text-sm space-y-2">
                <p><strong className="text-slate-500 dark:text-slate-400">User:</strong> {event.userName}</p>
                <p><strong className="text-slate-500 dark:text-slate-400">Status:</strong> {event.status}</p>
                {isEquipment ? (
                    <p><strong className="text-slate-500 dark:text-slate-400">Item:</strong> {event.requestedItems[0]?.name}</p>
                ) : (
                    <p><strong className="text-slate-500 dark:text-slate-400">Room:</strong> {event.requestedRoom.name}</p>
                )}
                 <p><strong className="text-slate-500 dark:text-slate-400">Dates:</strong> {format(parseISO(event.requestedStartDate), 'MMM d')} - {format(parseISO(event.requestedEndDate), 'MMM d')}</p>
            </div>
        </div>
    );
};

const DashboardCalendar: React.FC<{ requests: AnyRequest[] }> = ({ requests }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedEvent, setSelectedEvent] = useState<{event: AnyRequest, position: {top: number, left: number}} | null>(null);

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const events = useMemo(() => requests.map(r => ({ ...r, type: 'requestedItems' in r ? 'equipment' : 'room' })), [requests]);

    const handleEventClick = (event: AnyRequest, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedEvent({ event, position: { top: e.clientY - 10, left: e.clientX } });
    };

    const calendarGrid = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const allDays = eachDayOfInterval({ start: startDate, end: endDate });

        return allDays.map((day) => {
            const isCurrentMonth = isSameMonth(day, monthStart);
            const dayEvents = events.filter(event => {
                const eventStart = parseISO(event.requestedStartDate);
                const eventEnd = parseISO(event.requestedEndDate);
                return isWithinInterval(day, { start: eventStart, end: eventEnd });
            });

            return (
                <div 
                    key={day.toString()} 
                    className={`p-2 border-r border-b dark:border-slate-700 min-h-[120px] flex flex-col ${isCurrentMonth ? '' : 'bg-slate-50 dark:bg-slate-800/50'}`}
                >
                    <span className={`font-semibold self-end ${isCurrentMonth ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'} ${isToday(day) ? 'bg-sky-500 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>
                        {format(day, 'd')}
                    </span>
                    <div className="space-y-1 mt-1 overflow-y-auto">
                        {dayEvents.map(event => (
                            <div 
                                key={event.id}
                                onClick={(e) => handleEventClick(event, e)}
                                className={`p-1 rounded text-xs cursor-pointer truncate ${event.type === 'equipment' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300' : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300'}`}
                            >
                                {event.purpose}
                            </div>
                        ))}
                    </div>
                </div>
            );
        });
    }, [currentMonth, events]);

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-4 border border-slate-200 dark:border-slate-700 relative">
            {selectedEvent && <EventPopover event={selectedEvent.event} position={selectedEvent.position} onClose={() => setSelectedEvent(null)} />}
            <div className="flex justify-between items-center mb-4">
                <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                    <ChevronUpIcon className="w-6 h-6 transform -rotate-90" />
                </button>
                <h2 className="text-xl font-bold dark:text-white">
                    {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                    <ChevronDownIcon className="w-6 h-6 transform -rotate-90" />
                </button>
            </div>
            <div className="grid grid-cols-7 border-t border-l dark:border-slate-700">
                {weekdays.map(day => (
                    <div key={day} className="p-2 text-center font-semibold text-slate-600 dark:text-slate-300 border-r border-b dark:border-slate-700">{day}</div>
                ))}
                {calendarGrid}
            </div>
        </div>
    );
};

export default DashboardCalendar;
