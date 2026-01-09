
import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { User } from './types';

const createUser = async (uid: string, data: User) => {
    console.log(`Attempting to create user document for UID: ${uid}`);
    try {
        await setDoc(doc(db, 'users', uid), data);
        console.log(`Successfully created user document for UID: ${uid}`);
    } catch (error) {
        console.error(`Error creating user document for UID: ${uid}`, error);
    }
};

const getUser = async (uid: string): Promise<User | null> => {
    console.log(`Attempting to get user document for UID: ${uid}`);
    try {
        const docSnap = await getDoc(doc(db, 'users', uid));
        if (docSnap.exists()) {
            console.log(`Successfully found user document for UID: ${uid}`);
            return docSnap.data() as User;
        }
        console.log(`No user document found for UID: ${uid}`);
        return null;
    } catch (error) {
        console.error(`Error getting user document for UID: ${uid}`, error);
        return null;
    }
};

export const userService = {
    createUser,
    getUser,
};