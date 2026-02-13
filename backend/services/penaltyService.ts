
import {
    collection,
    query,
    where,
    getDocs,
    getDoc,
    doc,
    updateDoc,
    addDoc,
    serverTimestamp,
    orderBy
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Penalty } from "../../frontend/types";
import { NotificationService } from "./notificationService";

const penaltiesCollection = collection(db, "penalties");

export class PenaltyService {
    static async getPenaltiesByUserId(userId: string): Promise<Penalty[]> {
        const q = query(penaltiesCollection, where("userId", "==", userId), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as any).toDate().toISOString(),
            } as Penalty;
        });
    }

    static async getAllPenalties(): Promise<Penalty[]> {
        const q = query(penaltiesCollection, orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: (data.createdAt as any).toDate().toISOString(),
            } as Penalty;
        });
    }

    static async markPenaltyAsPaid(penaltyId: string): Promise<void> {
        const penaltyRef = doc(db, "penalties", penaltyId);
        await updateDoc(penaltyRef, { isPaid: true });

        const penaltySnap = await getDoc(penaltyRef);
        const penalty = penaltySnap.data() as Penalty;

        if (penalty) {
            await NotificationService.createNotification({
                userId: penalty.userId,
                title: "Penalty Resolved",
                message: `Your penalty for "${penalty.reason}" has been marked as paid.`,
                isRead: false,
                link: "/penalties"
            });
        }
    }

    static async createPenalty(penaltyData: Omit<Penalty, 'id' | 'createdAt'>): Promise<Penalty> {
        const penaltyDocRef = await addDoc(penaltiesCollection, {
            ...penaltyData,
            createdAt: serverTimestamp(),
        });

        const newDocSnap = await getDoc(penaltyDocRef);
        const newPenalty = newDocSnap.data();

        if (newPenalty) {
            await NotificationService.createNotification({
                userId: newPenalty.userId,
                title: "New Penalty Issued",
                message: `You have received a new penalty for "${newPenalty.reason}". Amount: ₱${newPenalty.amount}`,
                isRead: false,
                link: "/penalties"
            });
        }

        return {
            id: newDocSnap.id,
            ...newPenalty,
             createdAt: (newPenalty?.createdAt as any).toDate().toISOString(),
        } as Penalty;
    }
}
