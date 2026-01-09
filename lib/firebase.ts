
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDOsFLhrFD4XSuz-5wPZAJq7LU2I-YiOWI",
  authDomain: "ccad-pims-2025.firebaseapp.com",
  projectId: "ccad-pims-2025",
  storageBucket: "ccad-pims-2025.firebasestorage.app",
  messagingSenderId: "560467416728",
  appId: "1:560467416728:web:0b3da3d1e74c0e8574e2ed",
  measurementId: "G-NM4ZBRBJTR"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
