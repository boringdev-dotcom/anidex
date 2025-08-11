import AsyncStorage from '@react-native-async-storage/async-storage';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {LoginManager, AccessToken} from 'react-native-fbsdk-next';
import api from './api';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from '../types/auth';

class AuthService {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/api/auth/login', credentials);
    await this.saveAuthData(response.data);
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/api/auth/register', userData);
    await this.saveAuthData(response.data);
    return response.data;
  }

  async googleLogin(): Promise<AuthResponse> {
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.idToken;

      // Get OAuth URL from backend
      const urlResponse = await api.get<{url: string}>('/api/auth/google');
      
      // In a real app, you'd handle the OAuth flow differently
      // For mobile, you typically send the idToken to your backend
      // This is a simplified version
      const response = await api.post<AuthResponse>('/api/auth/google/mobile', {
        idToken,
      });
      
      await this.saveAuthData(response.data);
      return response.data;
    } catch (error) {
      throw new Error('Google login failed');
    }
  }

  async facebookLogin(): Promise<AuthResponse> {
    try {
      const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);
      
      if (result.isCancelled) {
        throw new Error('Facebook login cancelled');
      }

      const data = await AccessToken.getCurrentAccessToken();
      if (!data) {
        throw new Error('Failed to get Facebook access token');
      }

      // Get OAuth URL from backend
      const urlResponse = await api.get<{url: string}>('/api/auth/facebook');
      
      // For mobile, send the access token to your backend
      const response = await api.post<AuthResponse>('/api/auth/facebook/mobile', {
        accessToken: data.accessToken,
      });
      
      await this.saveAuthData(response.data);
      return response.data;
    } catch (error) {
      throw new Error('Facebook login failed');
    }
  }

  async logout(): Promise<void> {
    try {
      await GoogleSignin.signOut();
    } catch (error) {
      // Google sign out failed, but continue
    }

    try {
      LoginManager.logOut();
    } catch (error) {
      // Facebook logout failed, but continue
    }

    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const userString = await AsyncStorage.getItem('user');
      if (userString) {
        return JSON.parse(userString);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await AsyncStorage.getItem('access_token');
    return !!token;
  }

  private async saveAuthData(authResponse: AuthResponse): Promise<void> {
    await AsyncStorage.setItem('access_token', authResponse.access_token);
    await AsyncStorage.setItem('refresh_token', authResponse.refresh_token);
    await AsyncStorage.setItem('user', JSON.stringify(authResponse.user));
  }
}

export default new AuthService();