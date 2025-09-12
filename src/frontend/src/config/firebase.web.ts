import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged } from 'firebase/auth';

// Import the functions you need from the SDKs you need
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAL5yMpAvUMS5Mj51X6YuGMw1iIgQTrxAE",
  authDomain: "anidex-1470f.firebaseapp.com",
  projectId: "anidex-1470f",
  storageBucket: "anidex-1470f.firebasestorage.app",
  messagingSenderId: "110862963180",
  appId: "1:110862963180:web:602eddde71d93559b9b0c9",
  measurementId: "G-3N7E81P4LX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Export the auth functions for use in authHelper
export { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged };

export default app;
