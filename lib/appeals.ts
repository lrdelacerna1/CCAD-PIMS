
import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';

export interface FacultyAppeal {
    uid: string;
    email: string;
    name: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
}

const appealsCollection = collection(db, 'facultyAppeals');

export const appealService = {
    createAppeal: async (uid: string, email: string, name: string, reason: string): Promise<void> => {
        await addDoc(appealsCollection, {
            uid,
            email,
            name,
            reason,
            status: 'pending',
        });
    },

    getAppeals: async (): Promise<FacultyAppeal[]> => {
        const q = query(appealsCollection, where('status', '==', 'pending'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as FacultyAppeal[];
    },

    approveAppeal: async (appealId: string, uid: string): Promise<void> => {
        const appealDoc = doc(db, 'facultyAppeals', appealId);
        await updateDoc(appealDoc, { status: 'approved' });

        const userDoc = doc(db, 'users', uid);
        await updateDoc(userDoc, { role: 'faculty' });
    },

    rejectAppeal: async (appealId: string, uid: string): Promise<void> => {
        const appealDoc = doc(db, 'facultyAppeals', appealId);
        await updateDoc(appealDoc, { status: 'rejected' });

        const userDoc = doc(db, 'users', uid);
        await updateDoc(userDoc, { role: 'guest' });
    },
};
