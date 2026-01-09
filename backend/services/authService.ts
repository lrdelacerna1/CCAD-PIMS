import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    User as FirebaseUser,
    signInWithPopup,
    GoogleAuthProvider,
    sendEmailVerification,
    sendPasswordResetEmail,
    verifyPasswordResetCode,
    confirmPasswordReset,
} from "firebase/auth";
import { doc, setDoc, getDoc, getDocs, updateDoc, collection, Timestamp } from "firebase/firestore";
import { db, app } from "../../lib/firebase";
import { User } from "../../frontend/types";

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const usersCollection = collection(db, "users");

export class AuthService {

    private static async _getUserProfile(uid: string): Promise<User | null> {
        const userDocRef = doc(db, "users", uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userData = userDoc.data();

            const convertTimestampToString = (timestamp: any): string => {
                if (!timestamp) return new Date().toISOString();
                if (timestamp.toDate) { // Firestore Timestamp
                    return timestamp.toDate().toISOString();
                }
                // Fallback for strings or other date formats
                return new Date(timestamp).toISOString(); 
            };

            const convertTimestampToStringOptional = (timestamp: any): string | undefined => {
                if (!timestamp) return undefined;
                return convertTimestampToString(timestamp);
            };

            return {
                id: userDoc.id,
                ...userData,
                createdAt: convertTimestampToString(userData.createdAt),
                lastLogin: convertTimestampToStringOptional(userData.lastLogin),
            } as User;
        }
        return null;
    }

    static async authenticate(email: string, pass: string): Promise<User> {
        const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, pass);
        await updateDoc(doc(db, "users", firebaseUser.uid), { lastLogin: Timestamp.now() });
        const user = await this._getUserProfile(firebaseUser.uid);
        if (!user) throw new Error("User profile not found after authentication.");
        return user;
    }

    static async signInWithGoogle(): Promise<User> {
        const result = await signInWithPopup(auth, provider);
        const firebaseUser = result.user;
        const userRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            const [firstName, ...lastNameParts] = firebaseUser.displayName?.split(' ') || ['', ''];
            const lastName = lastNameParts.join(' ');

            const newUser: Omit<User, 'id' | 'createdAt' | 'lastLogin'> = {
                role: "guest",
                firstName: firstName,
                lastName: lastName,
                emailAddress: firebaseUser.email || "",
                emailVerified: firebaseUser.emailVerified,
                contactNumber: firebaseUser.phoneNumber || "",
            };
            
            await setDoc(userRef, {
                ...newUser,
                createdAt: Timestamp.now(),
                lastLogin: Timestamp.now(),
            });

            const user = await this._getUserProfile(firebaseUser.uid);
            if (!user) throw new Error("Failed to create and fetch new Google user profile.");
            return user;

        } else {
            await updateDoc(userRef, { lastLogin: Timestamp.now() });
            const user = await this._getUserProfile(firebaseUser.uid);
            if (!user) throw new Error("User profile not found after Google sign-in.");
            return user;
        }
    }

    static async register(userData: Omit<User, 'id' | 'createdAt' | 'lastLogin' | 'emailVerified'> & { password?: string }): Promise<User> {
        const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, userData.emailAddress, userData.password || '');
        
        const newUser: Omit<User, 'id' | 'createdAt' | 'lastLogin'> = {
            ...userData,
            emailVerified: firebaseUser.emailVerified,
        };
        
        await setDoc(doc(db, "users", firebaseUser.uid), {
            ...newUser,
            createdAt: Timestamp.now(),
            lastLogin: Timestamp.now(),
        });

        const user = await this._getUserProfile(firebaseUser.uid);
        if (!user) throw new Error("Failed to create and fetch new user profile after registration.");
        return user;
    }

    static async logout(): Promise<void> {
        await firebaseSignOut(auth);
    }

    static async sendVerificationEmail(): Promise<void> {
        const user = auth.currentUser;
        if (user) {
            await sendEmailVerification(user);
        } else {
            throw new Error("No user is currently signed in.");
        }
    }
    
    static async getAllUsers(): Promise<User[]> {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("Authentication required to fetch users.");
        }

        const requesterProfile = await this._getUserProfile(currentUser.uid);
        if (!requesterProfile || (requesterProfile.role !== 'admin' && requesterProfile.role !== 'superadmin')) {
            throw new Error("Unauthorized: You do not have permission to view all users.");
        }

        const snapshot = await getDocs(usersCollection);
        return snapshot.docs.map(doc => {
            const data = doc.data();
            const convertTimestampToString = (timestamp: any): string => {
                if (!timestamp) return new Date().toISOString();
                if (timestamp.toDate) {
                    return timestamp.toDate().toISOString();
                }
                return new Date(timestamp).toISOString();
            };
            const convertTimestampToStringOptional = (timestamp: any): string | undefined => {
                if (!timestamp) return undefined;
                return convertTimestampToString(timestamp);
            };
            return {
                id: doc.id,
                ...data,
                createdAt: convertTimestampToString(data.createdAt),
                lastLogin: convertTimestampToStringOptional(data.lastLogin),
            } as User;
        });
    }

    static async updateUser(userId: string, updates: Partial<User>): Promise<User> {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, updates);
        const user = await this._getUserProfile(userId);
        if (!user) throw new Error("Failed to fetch updated user.");
        return user;
    }

    static async requestPasswordReset(email: string): Promise<void> {
        await sendPasswordResetEmail(auth, email);
    }

    static async validateResetToken(token: string): Promise<boolean> {
        try {
            await verifyPasswordResetCode(auth, token);
            return true;
        } catch (error) {
            console.error("Invalid reset token:", error);
            return false;
        }
    }

    static async resetPassword(token: string, newPass: string): Promise<void> {
        await confirmPasswordReset(auth, token, newPass);
    }
}
