
import { auth, googleProvider } from './firebase';
import { signInWithPopup, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { userService } from './firestore';

const signInWithGoogle = async (): Promise<void> => {
    console.log("Attempting to sign in with Google...");
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        console.log("Google sign-in successful. User:", user.uid, user.email);

        // Check if the user is new and create a document in Firestore
        console.log("Checking if user exists in Firestore...");
        const userDoc = await userService.getUser(user.uid);
        if (!userDoc) {
            console.log("User does not exist. Creating user document in Firestore...");
            await userService.createUser(user.uid, {
                email: user.email!,
                name: user.displayName!,
                role: 'student', // Default role for new users
            });
            console.log("User document created successfully.");
        } else {
            console.log("User already exists in Firestore.");
        }
    } catch (error) {
        console.error("Error during sign-in or user creation process: ", error);
    }
};

export const authService = {
    signInWithGoogle,
    onAuthStateChanged: (callback: (user: FirebaseUser | null) => void) => onAuthStateChanged(auth, callback),
    signOut: () => signOut(auth),
};