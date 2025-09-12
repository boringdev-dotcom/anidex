import { create } from 'zustand';
import { authHelper } from '../config/authHelper';
import { AuthStore, User } from '../types';

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  loading: true,
  isAuthenticated: false,

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user });
  },

  setLoading: (loading: boolean) => {
    set({ loading });
  },

  signIn: async (email: string, password: string) => {
    console.log('🚀 Auth store signIn called with:', email);
    try {
      set({ loading: true });
      console.log('🔄 Setting loading to true');
      const userCredential = await authHelper.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      console.log('👤 User credential received:', user);
      
      set({
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
        },
        isAuthenticated: true,
        loading: false,
      });
      console.log('✅ User state updated successfully');
    } catch (error) {
      console.error('❌ Auth store signIn error:', error);
      set({ loading: false });
      throw error;
    }
  },

  signUp: async (email: string, password: string, displayName?: string) => {
    try {
      set({ loading: true });
      const userCredential = await authHelper.createUserWithEmailAndPassword(email, password);
      const user = userCredential.user;

      if (displayName) {
        await authHelper.updateProfile(user, { displayName });
      }

      set({
        user: {
          uid: user.uid,
          email: user.email,
          displayName: displayName || user.displayName,
          photoURL: user.photoURL,
        },
        isAuthenticated: true,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  signOut: async () => {
    try {
      set({ loading: true });
      await authHelper.signOut();
      set({
        user: null,
        isAuthenticated: false,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },

  resetPassword: async (email: string) => {
    try {
      await authHelper.sendPasswordResetEmail(email);
    } catch (error) {
      throw error;
    }
  },
}));