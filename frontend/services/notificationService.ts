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
      createdAt: new Date(),
      link: link || undefined
    } as Notification;
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
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({ 
        id: doc.id, 
        userId: data.userId,
        title: data.title || 'Notification',
        message: data.message,
        isRead: data.isRead || false,
        createdAt: data.createdAt?.toDate() || new Date(),
        link: data.link || undefined
      } as Notification);
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
    querySnapshot.forEach((doc) => {
      superAdminIds.push(doc.id);
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