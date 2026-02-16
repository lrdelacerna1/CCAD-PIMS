import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getAuth, onAuthStateChanged, User as FirebaseUser, sendEmailVerification as firebaseSendEmailVerification, signOut as firebaseSignOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User } from '../types';
import { useNavigate } from 'react-router-dom';
import { loginUserApi, registerUserApi } from '../../backend/api/auth';
import { authService } from '../services/authService';

export interface AuthContextType {
    user: User | null;
    loading: boolean;
    isSuperAdmin: boolean;
    isAdmin: boolean;
    isFaculty: boolean;
    isUser: boolean;
    login: (email: string, pass: string) => Promise<void>;
    register: (userData: any) => Promise<User>;
    signInWithGoogle: () => Promise<FirebaseUser | null>;
    signUpWithGoogle: () => Promise<FirebaseUser | null>;
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
    const [isFaculty, setIsFaculty] = useState(false);
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
                    } as unknown as User;
                    setUser(userPayload);
                    const userRole = userPayload.role;
                    const isSuperAdminRole = userRole === 'superadmin';
                    const isAdminRole = userRole === 'admin' || isSuperAdminRole;
                    const isFacultyRole = userRole === 'faculty';

                    setIsSuperAdmin(isSuperAdminRole);
                    setIsAdmin(isAdminRole);
                    setIsFaculty(isFacultyRole);
                    setIsUser(!isAdminRole && !isFacultyRole);
                    await setDoc(userDocRef, { lastLogin: serverTimestamp() }, { merge: true });
                } else {
                    // User authenticated with Firebase but no document exists
                    // This should not happen - signInWithGoogle/signUpWithGoogle handle this
                    setUser(null);
                    setIsSuperAdmin(false);
                    setIsAdmin(false);
                    setIsFaculty(false);
                    setIsUser(false);
                }
            } else {
                setUser(null);
                setIsSuperAdmin(false);
                setIsAdmin(false);
                setIsFaculty(false);
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

    const register = async (userData: any): Promise<User> => {
        try {
            const isFacultyRegistration = userData.role === 'faculty';
            const isUpMail = userData.emailAddress.endsWith('@up.edu.ph');

            if (isFacultyRegistration && !isUpMail) {
                throw new Error("Faculty registration is restricted to university emails only (@up.edu.ph).");
            }

            const user = await registerUserApi(userData);
            const firebaseUser = auth.currentUser;
            if (firebaseUser) {
                await firebaseSendEmailVerification(firebaseUser);
            }
            return user;

        } catch (error) {
            console.error("Registration failed:", error);
            throw error;
        }
    };

    // Sign In with Google - For Login Page (existing users only)
    const signInWithGoogle = async (): Promise<FirebaseUser | null> => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const googleUser = result.user;

            if (!googleUser.email) {
                await firebaseSignOut(auth);
                throw new Error("Could not retrieve email from Google account.");
            }

            // Check if user document exists in Firestore
            const userDocRef = doc(db, 'users', googleUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists()) {
                // Sign user out of Firebase and throw error
                await firebaseSignOut(auth);
                throw new Error("Account not found. Please sign up first.");
            }
            
            return googleUser;
        } catch (error: any) {
            console.error("Google Sign-in failed:", error.message);
            throw new Error(error.message || "An unexpected error occurred during Google Sign-in.");
        }
    };

    // Sign Up with Google - For Register Page (creates new accounts)
    const signUpWithGoogle = async (): Promise<FirebaseUser | null> => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const googleUser = result.user;

            if (!googleUser.email) {
                await firebaseSignOut(auth);
                throw new Error("Could not retrieve email from Google account.");
            }

            // Check if user already exists
            const userDocRef = doc(db, 'users', googleUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                // User already exists - sign them out and throw error
                await firebaseSignOut(auth);
                throw new Error("An account with this email already exists. Please sign in instead.");
            }

            // Create new user document
            const newUser: Omit<User, 'id'> = {
                emailAddress: googleUser.email,
                emailVerified: googleUser.emailVerified,
                role: 'guest', // Will be updated based on email domain in RegisterPage
                firstName: googleUser.displayName?.split(' ')[0] || 'New',
                lastName: googleUser.displayName?.split(' ').slice(1).join(' ') || 'User',
                createdAt: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
            };
            
            await setDoc(userDocRef, newUser);
            
            return googleUser;
        } catch (error: any) {
            console.error("Google Sign-up failed:", error.message);
            throw new Error(error.message || "An unexpected error occurred during Google Sign-up.");
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
                    } as unknown as User;
                    setUser(userPayload);
                    const userRole = userPayload.role;
                    const isSuperAdminRole = userRole === 'superadmin';
                    const isAdminRole = userRole === 'admin' || isSuperAdminRole;
                    const isFacultyRole = userRole === 'faculty';

                    setIsSuperAdmin(isSuperAdminRole);
                    setIsAdmin(isAdminRole);
                    setIsFaculty(isFacultyRole);
                    setIsUser(!isAdminRole && !isFacultyRole);
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
            await authService.updateUser(user.id, updates);
            
            const newUserState = { ...user, ...updates };
            setUser(newUserState);

            if (updates.role) {
                const newRole = updates.role;
                const isSuperAdminRole = newRole === 'superadmin';
                const isAdminRole = newRole === 'admin' || isSuperAdminRole;
                const isFacultyRole = newRole === 'faculty';

                setIsSuperAdmin(isSuperAdminRole);
                setIsAdmin(isAdminRole);
                setIsFaculty(isFacultyRole);
                setIsUser(!isAdminRole && !isFacultyRole);
            }

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
        isFaculty,
        isUser,
        login,
        register,
        signInWithGoogle,
        signUpWithGoogle,
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