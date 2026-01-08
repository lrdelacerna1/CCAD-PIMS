import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '../../contexts/NotificationContext';
import { BellIcon } from '../Icons';
import { formatDistanceToNow } from 'date-fns';

const NotificationBell: React.FC = () => {
    const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
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

    const handleNotificationClick = (notificationId: string, requestId?: string) => {
        markAsRead(notificationId);
        if (requestId) {
            navigate('/my-reservations');
        }
        setIsOpen(false);
    };

    const handleMarkAllReadClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        markAllAsRead();
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative text-gray-700 dark:text-gray-200 hover:text-ccad-red dark:hover:text-ccad-red p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 ease-in-out hover:scale-110 origin-center"
            >
                <BellIcon className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                        {unreadCount}
                    </span>
                )}
            </button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-md shadow-lg z-20 border dark:border-gray-700">
                    <div className="p-3 flex justify-between items-center border-b dark:border-gray-600">
                        <h3 className="font-semibold text-gray-800 dark:text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button onClick={handleMarkAllReadClick} className="text-sm text-indigo-600 hover:underline dark:text-indigo-400">
                                Mark all as read
                            </button>
                        )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => handleNotificationClick(n.id, n.equipmentRequestId || n.roomRequestId)}
                                    className={`p-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${!n.isRead ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}
                                >
                                    <p className={`text-sm ${!n.isRead ? 'font-bold' : ''} text-gray-800 dark:text-gray-200`}>{n.message}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <p className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                You have no notifications.
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;