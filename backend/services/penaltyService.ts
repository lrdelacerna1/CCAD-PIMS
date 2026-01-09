
import {
    collection,
    query,
    where,
    getDocs,
    getDoc, // Correctly import getDoc
    doc,
    updateDoc,
    addDoc,
    serverTimestamp,
    orderBy
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Penalty } from "../../frontend/types";

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
    }

    static async createPenalty(penaltyData: Omit<Penalty, 'id' | 'createdAt'>): Promise<Penalty> {
        const penaltyDocRef = await addDoc(penaltiesCollection, {
            ...penaltyData,
            createdAt: serverTimestamp(),
        });

        const newDocSnap = await getDoc(penaltyDocRef); // Use getDoc with the DocumentReference
        const newPenalty = newDocSnap.data();

        return {
            id: newDocSnap.id,
            ...newPenalty,
             createdAt: (newPenalty?.createdAt as any).toDate().toISOString(),
        } as Penalty;
    }
}
