
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    Timestamp
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { User, UserRole } from "../types";
import { GoogleAuthProvider, User as FirebaseUser } from "firebase/auth";

const provider = new GoogleAuthProvider();

/**
 * Fetches a user document from Firestore by user ID.
 */
async function getUser(userId: string): Promise<User | null> {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const userData = userSnap.data();
        
        const createdAt = userData.createdAt && userData.createdAt.toDate 
            ? userData.createdAt.toDate().toISOString() 
            : userData.createdAt;
            
        const lastLogin = userData.lastLogin && userData.lastLogin.toDate 
            ? userData.lastLogin.toDate().toISOString() 
            : userData.lastLogin;

        return {
            id: userSnap.id,
            ...userData,
            createdAt,
            lastLogin,
        } as User;
    } else {
        return null;
    }
}

/**
 * Creates a new user document in Firestore, used for both standard and Google sign-ups.
 */
async function createUser(userData: Omit<User, 'createdAt' | 'lastLogin'>): Promise<User> {
    const userRef = doc(db, "users", userData.id);
    const newUser: Omit<User, 'id'> = {
        ...userData,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        emailVerified: false, // Set explicitly for new users
    };
    await setDoc(userRef, newUser);
    return { id: userData.id, ...newUser };
}

/**
 * Creates a new user from Google sign-in information.
 */
async function createUserFromGoogle(firebaseUser: FirebaseUser): Promise<User> {
    const [firstName, ...lastNameParts] = firebaseUser.displayName?.split(' ') || ['', ''];
    const lastName = lastNameParts.join(' ');

    const newUser: Omit<User, 'createdAt' | 'lastLogin'> = {
        id: firebaseUser.uid,
        firstName: firstName,
        lastName: lastName,
        emailAddress: firebaseUser.email || '',
        role: 'student', // Default role
        contactNumber: firebaseUser.phoneNumber || '',
        emailVerified: firebaseUser.emailVerified,
    };
    return createUser(newUser);
}

/**
 * Updates an existing user document in Firestore.
 */
async function updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, updates);
    const updatedUser = await getUser(userId);
    if (!updatedUser) throw new Error("Failed to fetch updated user.");
    return updatedUser;
}

export const authService = {
    getUser,
    createUser,
    createUserFromGoogle,
    updateUser,
    googleProvider: provider
};
