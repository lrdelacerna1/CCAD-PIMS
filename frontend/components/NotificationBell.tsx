import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import { BellIcon } from './Icons';
import { Notification } from '../types';

const NotificationBell: React.FC = () => {
    const { notifications, unreadCount, markAsRead } = useNotification();
    const [isOpen, setIsOpen] = useState(false);

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.isRead) {
            try {
                await markAsRead(notification.id);
            } catch (error) {
                console.error("Failed to mark notification as read:", error);
            }
        }
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button onClick={() => setIsOpen(!isOpen)} className="relative p-2">
                <BellIcon className="w-6 h-6 text-ccad-black group-hover:text-ccad-red" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-ccad-red ring-2 ring-white" />
                )}
            </button>

            {isOpen && (
                <div 
                    className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white border border-gray-100 z-50"
                    onMouseLeave={() => setIsOpen(false)}
                >
                    <div className="px-4 py-3 border-b border-gray-100">
                        <h3 className="text-md font-bold text-ccad-black">Notifications</h3>
                    </div>
                    
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map(notification => (
                                <Link
                                    to={notification.link || '#'}
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`block px-4 py-3 transition-colors ${ 
                                        !notification.isRead 
                                        ? 'bg-blue-50 hover:bg-blue-100' 
                                        : 'hover:bg-gray-50'
                                    }`}
                                >
                                    <p className={`text-sm ${!notification.isRead ? 'font-bold text-ccad-text-primary' : 'text-ccad-text-secondary'}`}>
                                        {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {new Date(notification.createdAt).toLocaleString()}
                                    </p>
                                </Link>
                            ))
                        ) : (
                            <div className="px-4 py-10 text-center">
                                <p className="text-sm text-ccad-text-secondary">No new notifications.</p>
                            </div>
                        )}
                    </div>

                    <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-right">
                       {/* TODO: Add a 'Mark all as read' button here later */}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
