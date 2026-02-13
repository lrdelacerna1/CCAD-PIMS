
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    doc, 
    getDoc,
    updateDoc, 
    addDoc, 
    serverTimestamp, 
    writeBatch, 
    orderBy
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Notification } from "../../frontend/types";

const notificationsCollection = collection(db, "notifications");

export class NotificationService {
    static async getNotificationsByUserId(userId: string): Promise<Notification[]> {
        const q = query(notificationsCollection, where("userId", "==", userId), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        const notifications: Notification[] = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            notifications.push({
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as any).toDate().toISOString(), // Convert Timestamp to ISO string
            } as Notification);
        });

        return notifications;
    }

    static async markNotificationAsRead(notificationId: string): Promise<Notification | null> {
        const notificationRef = doc(db, "notifications", notificationId);
        await updateDoc(notificationRef, { isRead: true });
        
        const updatedDoc = await getDoc(notificationRef);
        if (updatedDoc.exists()) {
             const data = updatedDoc.data();
             return {
                id: updatedDoc.id,
                ...data,
                createdAt: (data.createdAt as any).toDate().toISOString(),
            } as Notification;
        }
        return null;
    }

    static async markAllNotificationsAsRead(userId: string): Promise<void> {
        const batch = writeBatch(db);
        const q = query(notificationsCollection, where("userId", "==", userId), where("isRead", "==", false));
        
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
            batch.update(doc.ref, { isRead: true });
        });

        await batch.commit();
    }

    static async createNotification(notificationData: Omit<Notification, 'id' | 'createdAt'>): Promise<void> {
        await addDoc(notificationsCollection, {
            userId: notificationData.userId,
            title: notificationData.title,
            message: notificationData.message,
            link: notificationData.link || '',
            isRead: false,
            createdAt: serverTimestamp(),
        });
    }
}
