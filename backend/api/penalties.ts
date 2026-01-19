import { db } from '../../lib/firebase';
import { collection, doc, setDoc, getDocs, updateDoc, query, where, orderBy } from 'firebase/firestore';
import { Penalty } from '../../frontend/types';

const penaltiesCollection = collection(db, 'penalties');

export const createPenaltyApi = async (penaltyData: Omit<Penalty, 'id'>): Promise<Penalty> => {
    const newDocRef = doc(penaltiesCollection);
    const newPenalty = { ...penaltyData, id: newDocRef.id };
    await setDoc(newDocRef, newPenalty);
    return newPenalty;
};

export const getAllPenaltiesApi = async (): Promise<Penalty[]> => {
    const q = query(penaltiesCollection, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Penalty);
};

export const getPenaltiesByUserIdApi = async (userId: string): Promise<Penalty[]> => {
    const q = query(penaltiesCollection, where("userId", "==", userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Penalty);
};

export const markPenaltyAsPaidApi = async (penaltyId: string, isPaid: boolean): Promise<void> => {
    const penaltyDoc = doc(db, 'penalties', penaltyId);
    await updateDoc(penaltyDoc, { isPaid });
};
