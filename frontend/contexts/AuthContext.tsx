import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, User as FirebaseUser, sendEmailVerification as firebaseSendEmailVerification, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User } from '../types';
import { useNavigate } from 'react-router-dom';
import { loginUserApi, signInWithGoogleApi } from '../../backend/api/auth';
import { authService } from '../services/authService';

export interface AuthContextType {
    user: User | null;
    loading: boolean;
    isSuperAdmin: boolean;
    isAdmin: boolean;
    isUser: boolean;
    login: (email: string, pass: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    sendVerificationEmail: () => Promise<void>;
    reloadUser: () => Promise<void>;
    signOut: () => Promise<void>;
    updateProfile: (updates: Partial<User>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isUser, setIsUser] = useState(false);
    const auth = getAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const userDocRef = doc(db, 'users', firebaseUser.uid);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const userPayload = {
                        id: userDoc.id,
                        ...userData,
                        emailVerified: firebaseUser.emailVerified,
                    } as User;
                    setUser(userPayload);
                    setIsSuperAdmin(userPayload.role === 'superadmin');
                    setIsAdmin(userPayload.role === 'admin' || userPayload.role === 'superadmin');
                    setIsUser(userPayload.role === 'user');
                } else {
                    const newUser: Omit<User, 'id'> = {
                        emailAddress: firebaseUser.email || '',
                        emailVerified: firebaseUser.emailVerified,
                        role: 'guest',
                        firstName: firebaseUser.displayName?.split(' ')[0] || 'New',
                        lastName: firebaseUser.displayName?.split(' ')[1] || 'User',
                        createdAt: new Date().toISOString(),
                        lastLogin: new Date().toISOString(),
                    };
                    await setDoc(userDocRef, newUser);
                    setUser({ id: firebaseUser.uid, ...newUser } as User);
                    setIsUser(false);
                    setIsAdmin(false);
                    setIsSuperAdmin(false);
                }
                await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
            } else {
                setUser(null);
                setIsSuperAdmin(false);
                setIsAdmin(false);
                setIsUser(false);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [auth]);

    const login = async (email: string, pass: string) => {
        try {
            await loginUserApi(email, pass);
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    };

    const signInWithGoogle = async () => {
        try {
            await signInWithGoogleApi();
        } catch (error) {
            console.error("Google Sign-in failed:", error);
            throw error;
        }
    };

    const sendVerificationEmail = async () => {
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
            await firebaseSendEmailVerification(firebaseUser);
        } else {
            throw new Error("No user is currently signed in to send a verification email.");
        }
    };

    const reloadUser = async () => {
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
            await firebaseUser.reload();
            const reloadedFirebaseUser = getAuth().currentUser;
            if (reloadedFirebaseUser) {
                const userDocRef = doc(db, 'users', reloadedFirebaseUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                     const userPayload = {
                        id: userDoc.id,
                        ...userData,
                        emailVerified: reloadedFirebaseUser.emailVerified,
                    } as User;
                    setUser(userPayload);
                }
            }
        } else {
            throw new Error("No user is currently signed in to reload.");
        }
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
        setUser(null);
        navigate('/login');
    };

    const updateProfile = async (updates: Partial<User>) => {
        if (!user) throw new Error("No user is signed in.");
        try {
            // First, update the data in the database.
            await authService.updateUser(user.id, updates);
            
            // Then, update the local state by merging the updates into the existing user object.
            // This ensures that properties not in the form (like emailVerified) are preserved.
            const newUserState = { ...user, ...updates };
            setUser(newUserState);

        } catch (error) {
            console.error("Failed to update profile:", error);
            throw error;
        }
    };

    const value = {
        user,
        loading,
        isSuperAdmin,
        isAdmin,
        isUser,
        login,
        signInWithGoogle,
        sendVerificationEmail,
        reloadUser,
        signOut,
        updateProfile
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};