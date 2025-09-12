import { Platform } from 'react-native';
import { auth } from './firebase';

// Platform-specific auth helper to handle differences between web and mobile Firebase APIs
export const authHelper = {
  // Get the auth instance (function call for RN, direct object for web)
  getAuth: () => {
    if (Platform.OS === 'web') {
      return auth; // Web Firebase auth is already an object
    } else {
      return auth(); // React Native Firebase auth is a function
    }
  },

  // Sign in with email and password
  signInWithEmailAndPassword: async (email: string, password: string) => {
    console.log('🔐 Attempting to sign in with:', email);
    const authInstance = authHelper.getAuth();
    console.log('🔐 Auth instance:', authInstance);
    try {
      if (Platform.OS === 'web') {
        // Use the imported function directly for web
        const { signInWithEmailAndPassword } = require('./firebase.web');
        const result = await signInWithEmailAndPassword(authInstance, email, password);
        console.log('✅ Sign in successful:', result);
        return result;
      } else {
        // Use the method on the auth instance for mobile
        const result = await authInstance.signInWithEmailAndPassword(email, password);
        console.log('✅ Sign in successful:', result);
        return result;
      }
    } catch (error) {
      console.error('❌ Sign in failed:', error);
      throw error;
    }
  },

  // Create user with email and password
  createUserWithEmailAndPassword: async (email: string, password: string) => {
    const authInstance = authHelper.getAuth();
    if (Platform.OS === 'web') {
      const { createUserWithEmailAndPassword } = require('./firebase.web');
      return await createUserWithEmailAndPassword(authInstance, email, password);
    } else {
      return await authInstance.createUserWithEmailAndPassword(email, password);
    }
  },

  // Sign out
  signOut: async () => {
    const authInstance = authHelper.getAuth();
    if (Platform.OS === 'web') {
      const { signOut } = require('./firebase.web');
      return await signOut(authInstance);
    } else {
      return await authInstance.signOut();
    }
  },

  // Send password reset email
  sendPasswordResetEmail: async (email: string) => {
    const authInstance = authHelper.getAuth();
    if (Platform.OS === 'web') {
      const { sendPasswordResetEmail } = require('./firebase.web');
      return await sendPasswordResetEmail(authInstance, email);
    } else {
      return await authInstance.sendPasswordResetEmail(email);
    }
  },

  // Update user profile
  updateProfile: async (user: any, profile: { displayName?: string }) => {
    return await user.updateProfile(profile);
  },

  // Get current user
  getCurrentUser: () => {
    const authInstance = authHelper.getAuth();
    return authInstance.currentUser;
  },

  // Listen to auth state changes
  onAuthStateChanged: (callback: (user: any) => void) => {
    const authInstance = authHelper.getAuth();
    if (Platform.OS === 'web') {
      const { onAuthStateChanged } = require('./firebase.web');
      return onAuthStateChanged(authInstance, callback);
    } else {
      return authInstance.onAuthStateChanged(callback);
    }
  },
};
