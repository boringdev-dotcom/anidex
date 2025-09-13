// API Service for AniDex Backend
// Handles all HTTP requests to the Go backend

const API_BASE_URL = 'http://localhost:8080/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface ApiError {
  error: string;
  details?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add Authorization header if user is authenticated
    const authToken = this.getAuthToken();
    if (authToken) {
      defaultHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  private getAuthToken(): string | null {
    // TODO: Integrate with your auth store to get JWT token
    // For now, return null - will implement after auth integration
    return null;
  }

  // ===== SPECIES ENDPOINTS =====

  async getAllSpecies(params?: {
    category?: string;
    rarity?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Species[]>> {
    const searchParams = new URLSearchParams();
    
    if (params?.category) searchParams.append('category', params.category);
    if (params?.rarity) searchParams.append('rarity', params.rarity);
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());

    const endpoint = `/species${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    return this.request<Species[]>(endpoint);
  }

  async getSpeciesById(id: string): Promise<ApiResponse<Species>> {
    return this.request<Species>(`/species/${id}`);
  }

  async searchSpecies(query: string, limit?: number): Promise<ApiResponse<Species[]>> {
    const searchParams = new URLSearchParams();
    searchParams.append('q', query);
    if (limit) searchParams.append('limit', limit.toString());

    return this.request<Species[]>(`/species/search?${searchParams.toString()}`);
  }

  // ===== CATCHES ENDPOINTS =====

  async getUserCatches(): Promise<ApiResponse<AnimalCatch[]>> {
    return this.request<AnimalCatch[]>('/catches/my');
  }

  async createCatch(catchData: CreateCatchRequest): Promise<ApiResponse<AnimalCatch>> {
    return this.request<AnimalCatch>('/catches', {
      method: 'POST',
      body: JSON.stringify(catchData),
    });
  }

  async getCatchById(id: string): Promise<ApiResponse<AnimalCatch>> {
    return this.request<AnimalCatch>(`/catches/${id}`);
  }

  // ===== LOCATION ENDPOINTS =====

  async getNearbyLocations(params: {
    lat: number;
    lng: number;
    radius?: number;
  }): Promise<ApiResponse<Location[]>> {
    const searchParams = new URLSearchParams();
    searchParams.append('lat', params.lat.toString());
    searchParams.append('lng', params.lng.toString());
    if (params.radius) searchParams.append('radius', params.radius.toString());

    return this.request<Location[]>(`/locations/nearby?${searchParams.toString()}`);
  }

  async getLocationCatches(params: {
    lat: number;
    lng: number;
    radius?: number;
  }): Promise<ApiResponse<AnimalCatch[]>> {
    const searchParams = new URLSearchParams();
    searchParams.append('lat', params.lat.toString());
    searchParams.append('lng', params.lng.toString());
    if (params.radius) searchParams.append('radius', params.radius.toString());

    return this.request<AnimalCatch[]>(`/locations/catches?${searchParams.toString()}`);
  }

  // ===== AUTHENTICATION ENDPOINTS =====

  async register(userData: {
    username: string;
    email: string;
    password: string;
  }): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async getProfile(): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/profile');
  }

  // ===== HEALTH CHECK =====

  async healthCheck(): Promise<{ status: string }> {
    const response = await fetch(`${this.baseUrl.replace('/api', '')}/health`);
    return response.json();
  }
}

// ===== TYPE DEFINITIONS =====
// These match your Go backend models

export interface Species {
  id: string;
  common_name: string;
  scientific_name: string;
  category: string; // 'mammal', 'bird', 'reptile', etc.
  family?: string;
  genus?: string;
  description?: string;
  average_weight?: number;
  average_length?: number;
  average_lifespan?: number;
  habitat?: string;
  diet?: string;
  behavior?: string;
  geographic_range?: string;
  conservation_status: string; // 'LC', 'NT', 'VU', 'EN', 'CR', etc.
  rarity: string; // 'common', 'uncommon', 'rare', 'epic', 'legendary'
  base_points: number;
  difficulty_level: number;
  default_image_url?: string;
  wikipedia_url?: string;
  sound_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnimalCatch {
  id: string;
  user_id: string;
  species_id: string;
  location_id?: string;
  latitude: number;
  longitude: number;
  caught_at: string;
  photo_url?: string;
  notes?: string;
  weather_condition?: string;
  temperature?: number;
  verification_status: string;
  points_awarded: number;
  created_at: string;
  updated_at: string;
  // Relationships
  species?: Species;
  user?: User;
  location?: Location;
}

export interface Location {
  id: string;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  location_type: string; // 'park', 'forest', 'urban', etc.
  country: string;
  state_province?: string;
  city?: string;
  is_protected_area: boolean;
  popularity_score: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  display_name?: string;
  profile_picture_url?: string;
  bio?: string;
  location?: string;
  privacy_level: string;
  total_points: number;
  level: number;
  join_date: string;
  last_active: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refresh_token: string;
  expires_at: string;
}

export interface CreateCatchRequest {
  species_id: string;
  latitude: number;
  longitude: number;
  photo_url?: string;
  notes?: string;
  weather_condition?: string;
  temperature?: number;
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
