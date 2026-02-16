
import { auth, googleProvider } from './firebase';
import { signInWithPopup, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { userService } from './firestore';

const signInWithGoogle = async (role?: 'student' | 'faculty'): Promise<void> => {
    console.log("Attempting to sign in with Google...");
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const email = user.email;
        console.log("Google sign-in successful. User:", user.uid, email);

        // Check if the user is new and create a document in Firestore
        console.log("Checking if user exists in Firestore...");
        const userDoc = await userService.getUser(user.uid);
        if (!userDoc) {
            console.log("User does not exist. Creating user document in Firestore...");

            let userRole = 'guest'; // Default role
            if (email && email.endsWith('@up.edu.ph')) {
                if (role) {
                    userRole = role;
                }
            }

            await userService.createUser(user.uid, {
                email: user.email!,
                name: user.displayName!,
                role: userRole,
            });
            console.log("User document created successfully with role:", userRole);
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
