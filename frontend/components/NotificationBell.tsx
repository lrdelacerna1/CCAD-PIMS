import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { BellIcon } from './Icons';
;
import { formatDistanceToNow } from 'date-fns';

const NotificationBell: React.FC = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
    const [isOpen, setIsOpen] = useState(false);
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

    const handleNotificationClick = (notificationId: string, link?: string) => {
        markAsRead(notificationId);
        if (link) navigate(link);
        setIsOpen(false);
    };

    const handleMarkAllReadClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        markAllAsRead();
    };

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

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-slate-800 rounded-xl shadow-xl z-50 border border-slate-200 dark:border-slate-700 overflow-hidden">
                    
                    {/* Header */}
                    <div className="px-4 py-3 flex justify-between items-center border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 dark:text-white font-heading tracking-wide">
                                Notifications
                            </h3>
                            {unreadCount > 0 && (
                                <span className="bg-up-maroon-700 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                                    {unreadCount} new
                                </span>
                            )}
                        </div>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllReadClick}
                                className="text-xs font-semibold text-up-maroon-700 hover:text-up-maroon-900 dark:text-up-maroon-400 dark:hover:text-up-maroon-300 hover:underline transition-colors"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Notification List */}
                    <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
                        {notifications.length > 0 ? (
                            notifications.map(n => (
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
                                        {/* Title */}
                                        {n.title && (
                                            <p className={`text-sm font-heading tracking-wide mb-0.5
                                                ${!n.isRead
                                                    ? 'font-bold text-up-maroon-800 dark:text-up-maroon-300'
                                                    : 'font-semibold text-slate-700 dark:text-slate-300'}`}>
                                                {n.title}
                                            </p>
                                        )}
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
                                    You're all caught up!
                                </p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                                    No notifications yet.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-center">
                            <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                                Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;