import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
// FIX: Corrected the import path for the useAuth hook.
import { useAuth } from '../hooks/useAuth';
import { Notification } from '../types';
import { getNotificationsByUserIdApi, markNotificationAsReadApi, markAllNotificationsAsReadApi } from '../../backend/api/notifications';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = (): NotificationContextType => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!user) {
            setNotifications([]);
            return;
        }
        setIsLoading(true);
        try {
            const data = await getNotificationsByUserIdApi(user.id);
            setNotifications(data);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchNotifications();
        // Set up an interval to poll for new notifications
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
        return () => clearInterval(interval);
    }, [fetchNotifications]);
    
    const markAsRead = async (notificationId: string) => {
        setNotifications(prev =>
            prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
        );
        try {
            await markNotificationAsReadApi(notificationId);
            // Optionally re-fetch to ensure consistency
            // fetchNotifications(); 
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
             // Revert optimistic update on failure
            setNotifications(prev =>
                prev.map(n => (n.id === notificationId ? { ...n, isRead: false } : n))
            );
        }
    };
    
    const markAllAsRead = async () => {
        if (!user) return;
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        try {
            await markAllNotificationsAsReadApi(user.id);
        } catch (error) {
            console.error("Failed to mark all as read:", error);
             setNotifications(prev => prev.map(n => ({ ...n, isRead: false })));
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, isLoading, markAsRead, markAllAsRead }}>
            {children}
        </NotificationContext.Provider>
    );
};
