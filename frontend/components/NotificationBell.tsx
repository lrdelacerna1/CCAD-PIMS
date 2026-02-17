import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { BellIcon } from './Icons';
import { formatDistanceToNow } from 'date-fns';
import { Notification } from '../types';

type NotifFilter = 'all' | 'equipment' | 'room';

const FILTER_KEYWORDS: Record<Exclude<NotifFilter, 'all'>, string[]> = {
    equipment: ['equipment', 'item', 'pickup', 'returned'],
    room: ['room', 'check-in', 'check-out'],
};

function categorize(n: Notification): 'equipment' | 'room' | 'other' {
    const text = `${n.title} ${n.message}`.toLowerCase();
    if (FILTER_KEYWORDS.equipment.some(k => text.includes(k))) return 'equipment';
    if (FILTER_KEYWORDS.room.some(k => text.includes(k))) return 'room';
    return 'other';
}

const NotificationBell: React.FC = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
    const [isOpen, setIsOpen] = useState(false);
    const [filter, setFilter] = useState<NotifFilter>('all');
    const navigate = useNavigate();
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Prevent body scroll when dropdown is open on mobile
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleNotificationClick = (notificationId: string, link?: string) => {
        markAsRead(notificationId);
        if (link) navigate(link);
        setIsOpen(false);
    };

    const handleMarkAllReadClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        markAllAsRead();
    };

    const filteredNotifications = useMemo(() => {
        if (filter === 'all') return notifications;
        return notifications.filter(n => categorize(n) === filter);
    }, [notifications, filter]);

    const equipmentUnread = useMemo(() =>
        notifications.filter(n => !n.isRead && categorize(n) === 'equipment').length,
        [notifications]
    );
    const roomUnread = useMemo(() =>
        notifications.filter(n => !n.isRead && categorize(n) === 'room').length,
        [notifications]
    );

    const filterTabs: { key: NotifFilter; label: string; count: number }[] = [
        { key: 'all', label: 'All', count: unreadCount },
        { key: 'equipment', label: 'Equipment', count: equipmentUnread },
        { key: 'room', label: 'Room', count: roomUnread },
    ];

    const DropdownContent = (
        <div className="flex flex-col h-full sm:h-auto overflow-hidden
                        bg-white dark:bg-slate-800
                        sm:rounded-xl sm:shadow-xl sm:border sm:border-slate-200 sm:dark:border-slate-700">

            {/* Header */}
            <div className="px-4 py-3 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 flex-shrink-0">
                <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-slate-900 dark:text-white font-heading tracking-wide">
                        Notifications
                    </h3>
                    {unreadCount > 0 && (
                        <span className="bg-up-maroon-700 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                            {unreadCount} new
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                        <button
                            onClick={handleMarkAllReadClick}
                            className="text-xs font-semibold text-up-maroon-700 hover:text-up-maroon-900 dark:text-up-maroon-400 dark:hover:text-up-maroon-300 hover:underline transition-colors whitespace-nowrap"
                        >
                            Mark all read
                        </button>
                    )}
                    {/* Close button visible on mobile */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="sm:hidden p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                        aria-label="Close notifications"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex-shrink-0">
                {filterTabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5
                            ${filter === tab.key
                                ? 'border-b-2 border-up-maroon-700 text-up-maroon-700 dark:text-up-maroon-400'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        {tab.label}
                        {tab.count > 0 && (
                            <span className="bg-up-maroon-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Notification List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700 sm:max-h-[380px]">
                {filteredNotifications.length > 0 ? (
                    filteredNotifications.map(n => (
                        <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n.id, n.link)}
                            className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/60
                                ${!n.isRead ? 'bg-up-maroon-50 dark:bg-up-maroon-900/20' : 'bg-white dark:bg-slate-800'}`}
                        >
                            {/* Unread dot */}
                            <div className="mt-1.5 flex-shrink-0">
                                {!n.isRead
                                    ? <span className="block h-2 w-2 rounded-full bg-up-maroon-700" />
                                    : <span className="block h-2 w-2 rounded-full bg-transparent" />
                                }
                            </div>

                            <div className="flex-1 min-w-0">
                                {/* Category tag + title row */}
                                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                    {categorize(n) !== 'other' && (
                                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded
                                            ${categorize(n) === 'equipment'
                                                ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300'
                                                : 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300'
                                            }`}>
                                            {categorize(n) === 'equipment' ? 'Equipment' : 'Room'}
                                        </span>
                                    )}
                                    {n.title && (
                                        <p className={`text-sm font-heading tracking-wide
                                            ${!n.isRead
                                                ? 'font-bold text-up-maroon-800 dark:text-up-maroon-300'
                                                : 'font-semibold text-slate-700 dark:text-slate-300'}`}>
                                            {n.title}
                                        </p>
                                    )}
                                </div>
                                {/* Message */}
                                <p className={`text-sm leading-snug
                                    ${!n.isRead
                                        ? 'text-slate-800 dark:text-slate-200'
                                        : 'text-slate-500 dark:text-slate-400'}`}>
                                    {n.message}
                                </p>
                                {/* Timestamp */}
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 italic">
                                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                        <BellIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                        <p className="text-sm font-medium text-slate-400 dark:text-slate-500">
                            {filter === 'all' ? "You're all caught up!" : `No ${filter} notifications.`}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                            {filter === 'all' ? 'No notifications yet.' : 'Try switching to All.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            {filteredNotifications.length > 0 && (
                <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-center flex-shrink-0">
                    <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                        Showing {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                        {filter !== 'all' ? ` in ${filter}` : ''}
                    </p>
                </div>
            )}
        </div>
    );

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Button */}
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="relative text-gray-700 dark:text-gray-200 hover:text-up-maroon-700 dark:hover:text-up-maroon-400 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                aria-label="Notifications"
            >
                <BellIcon className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 flex items-center justify-center h-4 w-4 rounded-full bg-up-maroon-700 text-white text-[10px] font-bold leading-none">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Mobile: full-screen fixed overlay */}
            {isOpen && (
                <>
                    {/* Backdrop (mobile only) */}
                    <div
                        className="sm:hidden fixed inset-0 bg-black/40 z-40"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Mobile panel — slides up from bottom */}
                    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50
                                    rounded-t-2xl shadow-2xl overflow-hidden
                                    max-h-[85vh] flex flex-col
                                    bg-white dark:bg-slate-800
                                    animate-slide-up">
                        {/* Drag handle */}
                        <div className="flex justify-center pt-2 pb-1 flex-shrink-0">
                            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                        </div>
                        {DropdownContent}
                    </div>

                    {/* Desktop: classic dropdown */}
                    <div className="hidden sm:block absolute right-0 mt-2 w-96 max-w-[calc(100vw-1rem)] z-50">
                        {DropdownContent}
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationBell;