import axios, {AxiosInstance} from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:8080'; // Change this to your backend URL

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.api.interceptors.request.use(
      async config => {
        const token = await AsyncStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      },
    );

    this.api.interceptors.response.use(
      response => response,
      async error => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            if (refreshToken) {
              const response = await this.api.post('/api/auth/refresh', {
                refresh_token: refreshToken,
              });
              const {access_token, refresh_token} = response.data;
              await AsyncStorage.setItem('access_token', access_token);
              await AsyncStorage.setItem('refresh_token', refresh_token);
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user']);
            // Navigate to login screen
          }
        }
        return Promise.reject(error);
      },
    );
  }

  getApi() {
    return this.api;
  }
}

export default new ApiService().getApi();