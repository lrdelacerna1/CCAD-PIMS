import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, updateDoc, doc } from 'firebase/firestore';
import { Notification } from '../types';

const createNotification = async (
  userId: string,
  message: string,
  link?: string,
  title?: string
): Promise<Notification> => {
  try {
    const now = new Date().toISOString();
    const docRef = await addDoc(collection(db, 'notifications'), {
      userId,
      title: title || 'New Notification',
      message,
      link: link || null,
      isRead: false,
      createdAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      userId,
      title: title || 'New Notification',
      message,
      isRead: false,
      createdAt: now,           // ISO string — matches Notification.createdAt: string
      link: link || undefined,
    };
  } catch (error) {
    console.error("Error creating notification:", error);
    throw new Error('Failed to create notification.');
  }
};

const getNotificationsForUser = async (userId: string): Promise<Notification[]> => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const notifications: Notification[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const rawDate = data.createdAt?.toDate?.() as Date | undefined;
      notifications.push({
        id: docSnap.id,
        userId: data.userId,
        title: data.title || 'Notification',
        message: data.message,
        isRead: data.isRead || false,
        createdAt: rawDate ? rawDate.toISOString() : new Date().toISOString(),
        link: data.link || undefined,
      });
    });
    return notifications;
  } catch (error) {
    console.error("Error getting notifications:", error);
    throw new Error('Failed to fetch notifications.');
  }
};

const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { isRead: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    throw new Error('Failed to update notification.');
  }
};

const getSuperAdmins = async (): Promise<string[]> => {
  try {
    const q = query(collection(db, 'users'), where('role', '==', 'superadmin'));
    const querySnapshot = await getDocs(q);
    const superAdminIds: string[] = [];
    querySnapshot.forEach((docSnap) => {
      superAdminIds.push(docSnap.id);
    });
    return superAdminIds;
  } catch (error) {
    console.error("Error getting superadmins:", error);
    throw new Error('Failed to fetch superadmins.');
  }
};

export const notificationService = {
  createNotification,
  getNotificationsForUser,
  markNotificationAsRead,
  getSuperAdmins,
};