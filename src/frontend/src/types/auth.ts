export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  avatar: string;
  provider: 'local' | 'google' | 'facebook';
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  name: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}