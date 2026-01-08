import { Notification } from '../../frontend/types';
import { NotificationService } from '../services/notificationService';

const simulateNetworkDelay = <T>(data: T): Promise<T> => {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(data);
        }, 200);
    });
};

export const getNotificationsByUserIdApi = async (userId: string): Promise<Notification[]> => {
    const data = await NotificationService.getNotificationsByUserId(userId);
    return simulateNetworkDelay(data);
};

export const markNotificationAsReadApi = async (notificationId: string): Promise<Notification | null> => {
    const data = await NotificationService.markNotificationAsRead(notificationId);
    return simulateNetworkDelay(data);
};

export const markAllNotificationsAsReadApi = async (userId: string): Promise<void> => {
    await NotificationService.markAllNotificationsAsRead(userId);
    return simulateNetworkDelay(undefined);
};