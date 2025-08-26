export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export interface AuthStore extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}