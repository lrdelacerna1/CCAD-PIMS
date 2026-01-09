import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getNotificationsByUserIdApi, markNotificationAsReadApi, markAllNotificationsAsReadApi } from '../../backend/api/notifications';
import { Notification } from '../types';
import { useAuth } from '../hooks/useAuth';

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    isLoading: boolean;
    error: string | null;
    fetchNotifications: () => void;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user, loading: authLoading } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        if (!user || !user.id) return;

        setIsLoading(true);
        try {
            const fetchedNotifications = await getNotificationsByUserIdApi(user.id);
            setNotifications(fetchedNotifications);
            setError(null);
        } catch (err: any) {
            console.error("Failed to fetch notifications:", err);
            setError(err.message || "Failed to fetch notifications");
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && user && user.id) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
            return () => clearInterval(interval);
        } else if (!authLoading && !user) {
            setNotifications([]);
            setIsLoading(false);
        }
    }, [user, authLoading, fetchNotifications]);

    const markAsRead = async (notificationId: string) => {
        const originalNotifications = notifications;
        setNotifications(prev =>
            prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n))
        );
        try {
            await markNotificationAsReadApi(notificationId);
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
            setNotifications(originalNotifications); // Revert on failure
        }
    };

    const markAllAsRead = async () => {
        if (!user || !user.id) return;
        const originalNotifications = notifications;
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        try {
            await markAllNotificationsAsReadApi(user.id);
        } catch (error) {
            console.error("Failed to mark all notifications as read:", error);
            setNotifications(originalNotifications); // Revert on failure
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            isLoading,
            error,
            fetchNotifications,
            markAsRead,
            markAllAsRead
        }}>
            {children}
        </NotificationContext.Provider>
    );
};

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};