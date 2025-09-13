// ===== FRONTEND-SPECIFIC TYPES =====

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

// ===== API INTEGRATION TYPES =====
// These will be used alongside backend API types

export interface AnimalSighting {
  id: string;
  name: string;
  type: string;
  rarity: string;
  latitude: number;
  longitude: number;
  userSeen: boolean;
  seenBy: string;
  timeAgo: string;
  distance: string;
}

export interface UserStats {
  totalSightings: number;
  speciesDiscovered: number;
  rareAnimals: number;
  friendsCount: number;
  level: number;
  experience: number;
  nextLevelExp: number;
  joinDate: string;
  location: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
}

export interface Friend {
  id: string;
  name: string;
  sightings: number;
  mutualFriends: number;
  status: 'online' | 'offline';
}

export interface RecentSighting {
  id: string;
  name: string;
  rarity: string;
  time: string;
  location: string;
  date?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  progress: number;
}

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}