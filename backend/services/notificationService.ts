import { Notification } from '../../frontend/types';
import { notifications } from '../db/mockDb';

export class NotificationService {
    static async getNotificationsByUserId(userId: string): Promise<Notification[]> {
        let userNotifications = notifications
            .filter(n => n.userId === userId)
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            
        // HACK: For demo purposes, if a new user has no notifications, show the default user's notifications.
        if (userNotifications.length === 0 && userId !== 'user-4') {
            userNotifications = notifications
                .filter(n => n.userId === 'user-4') // The default user with sample data
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        }

        return JSON.parse(JSON.stringify(userNotifications));
    }

    static async markNotificationAsRead(notificationId: string): Promise<Notification | null> {
        const notification = notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.isRead = true;
            return { ...notification };
        }
        return null;
    }

     static async markAllNotificationsAsRead(userId: string): Promise<void> {
        notifications.forEach(n => {
            if (n.userId === userId) {
                n.isRead = true;
            }
        });
    }

    static createNotification(notification: Omit<Notification, 'id'>) {
        const newNotification: Notification = {
            id: `notif-${Date.now()}`,
            ...notification,
        };
        notifications.push(newNotification);
    }
}