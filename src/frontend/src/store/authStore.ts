import {create} from 'zustand';
import {User} from '../types/auth';
import authService from '../services/authService';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: User | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  checkAuthStatus: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  setUser: (user) => set({user}),
  setIsAuthenticated: (isAuthenticated) => set({isAuthenticated}),
  setIsLoading: (isLoading) => set({isLoading}),
  setError: (error) => set({error}),
  checkAuthStatus: async () => {
    try {
      set({isLoading: true});
      const user = await authService.getCurrentUser();
      const isAuthenticated = await authService.isAuthenticated();
      set({user, isAuthenticated, isLoading: false});
    } catch (error) {
      set({user: null, isAuthenticated: false, isLoading: false});
    }
  },
  logout: async () => {
    try {
      await authService.logout();
      set({user: null, isAuthenticated: false});
    } catch (error) {
      console.error('Logout error:', error);
    }
  },
}));