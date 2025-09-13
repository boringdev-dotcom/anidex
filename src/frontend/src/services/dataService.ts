// Data Service - Transforms API data to frontend format
// Bridges backend API responses with frontend components

import { apiClient, Species, AnimalCatch } from './api';
import { 
  AnimalSighting, 
  UserStats, 
  RecentSighting, 
  Achievement,
  Badge 
} from '../types';

// Transform backend Species to frontend Animal format
export const transformSpeciesToAnimal = (species: Species, userCatches: AnimalCatch[] = []) => {
  const userHasCaught = userCatches.some(catch_ => catch_.species_id === species.id);
  
  return {
    id: species.id,
    name: species.common_name,
    scientificName: species.scientific_name,
    type: capitalizeFirst(species.category),
    rarity: species.rarity,
    habitat: species.habitat || 'Unknown',
    points: species.base_points,
    seen: userHasCaught,
    imageUrl: species.default_image_url,
    description: species.description || `A ${species.rarity} ${species.category} species.`,
    stats: {
      difficulty: species.difficulty_level,
      size: getSizeFromWeight(species.average_weight),
      activity: 'Diurnal', // Default, could be enhanced later
    },
  };
};

// Transform backend AnimalCatch to frontend AnimalSighting
export const transformCatchToSighting = (catch_: AnimalCatch): AnimalSighting => {
  const timeAgo = getTimeAgo(new Date(catch_.caught_at));
  
  return {
    id: catch_.id,
    name: catch_.species?.common_name || 'Unknown Species',
    type: capitalizeFirst(catch_.species?.category || 'unknown'),
    rarity: catch_.species?.rarity || 'common',
    latitude: catch_.latitude,
    longitude: catch_.longitude,
    userSeen: true, // If we have the catch, user has seen it
    seenBy: catch_.user?.display_name || catch_.user?.username || 'Someone',
    timeAgo,
    distance: '0.0 miles', // TODO: Calculate based on user location
  };
};

// Transform backend AnimalCatch to frontend RecentSighting
export const transformCatchToRecentSighting = (catch_: AnimalCatch): RecentSighting => {
  return {
    id: catch_.id,
    name: catch_.species?.common_name || 'Unknown Species',
    rarity: catch_.species?.rarity || 'common',
    time: getTimeAgo(new Date(catch_.caught_at)),
    location: catch_.location?.name || 'Unknown Location',
    date: new Date(catch_.caught_at).toLocaleDateString(),
  };
};

// ===== DATA SERVICE CLASS =====

class DataService {
  private speciesCache: Species[] = [];
  private lastSpeciesFetch: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  // ===== SPECIES/ANIMALS =====

  async getAllAnimals(filters?: {
    category?: string;
    rarity?: string;
    search?: string;
  }) {
    try {
      let species: Species[];

      if (filters?.search) {
        const response = await apiClient.searchSpecies(filters.search, 50);
        species = response.data;
      } else {
        // Use cache if available and recent
        const now = Date.now();
        if (this.speciesCache.length > 0 && (now - this.lastSpeciesFetch) < this.CACHE_DURATION) {
          species = this.speciesCache;
        } else {
          const response = await apiClient.getAllSpecies({
            category: filters?.category,
            rarity: filters?.rarity,
            limit: 100, // Get all species
          });
          species = response.data;
          this.speciesCache = species;
          this.lastSpeciesFetch = now;
        }
      }

      // Get user catches to determine which animals are "seen"
      const userCatches = await this.getUserCatches();
      
      // Transform to frontend format
      return species.map(sp => transformSpeciesToAnimal(sp, userCatches));
    } catch (error) {
      console.error('Failed to fetch animals:', error);
      throw error;
    }
  }

  async getAnimalById(id: string) {
    try {
      const response = await apiClient.getSpeciesById(id);
      const userCatches = await this.getUserCatches();
      return transformSpeciesToAnimal(response.data, userCatches);
    } catch (error) {
      console.error('Failed to fetch animal by ID:', error);
      throw error;
    }
  }

  async searchAnimals(query: string) {
    return this.getAllAnimals({ search: query });
  }

  // ===== USER CATCHES/SIGHTINGS =====

  async getUserCatches(): Promise<AnimalCatch[]> {
    try {
      const response = await apiClient.getUserCatches();
      return response.data;
    } catch (error) {
      // If user is not authenticated, return empty array
      console.warn('Failed to fetch user catches (user may not be logged in):', error);
      return [];
    }
  }

  async getRecentSightings(): Promise<RecentSighting[]> {
    try {
      const catches = await this.getUserCatches();
      return catches
        .slice(0, 5) // Get last 5 catches
        .map(transformCatchToRecentSighting);
    } catch (error) {
      console.error('Failed to fetch recent sightings:', error);
      return [];
    }
  }

  async getAnimalSightings(): Promise<AnimalSighting[]> {
    try {
      // For now, just return user's own catches
      // Later, could fetch public catches from nearby locations
      const catches = await this.getUserCatches();
      return catches.map(transformCatchToSighting);
    } catch (error) {
      console.error('Failed to fetch animal sightings:', error);
      return [];
    }
  }

  // ===== USER STATS =====

  async getUserStats(): Promise<UserStats> {
    try {
      const catches = await this.getUserCatches();
      const uniqueSpecies = new Set(catches.map(c => c.species_id)).size;
      const rareAnimals = catches.filter(c => 
        c.species?.rarity === 'rare' || 
        c.species?.rarity === 'epic' || 
        c.species?.rarity === 'legendary'
      ).length;

      // TODO: Get real stats from backend user profile
      return {
        totalSightings: catches.length,
        speciesDiscovered: uniqueSpecies,
        rareAnimals,
        friendsCount: 0, // TODO: Implement friends system
        level: Math.floor(catches.length / 10) + 1,
        experience: catches.reduce((total, c) => total + (c.points_awarded || 0), 0),
        nextLevelExp: (Math.floor(catches.length / 10) + 1) * 1000,
        joinDate: 'Recently', // TODO: Get from user profile
        location: 'Unknown', // TODO: Get from user profile
      };
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
      // Return default stats for unauthenticated users
      return {
        totalSightings: 0,
        speciesDiscovered: 0,
        rareAnimals: 0,
        friendsCount: 0,
        level: 1,
        experience: 0,
        nextLevelExp: 1000,
        joinDate: 'Recently',
        location: 'Unknown',
      };
    }
  }

  // ===== ACHIEVEMENTS & BADGES =====

  async getAchievements(): Promise<Achievement[]> {
    try {
      const catches = await this.getUserCatches();
      const stats = await this.getUserStats();

      // Generate achievements based on user progress
      return [
        {
          id: '1',
          title: 'Bird Watcher',
          description: 'See 10 different bird species',
          progress: Math.min(100, (catches.filter(c => c.species?.category === 'bird').length / 10) * 100),
        },
        {
          id: '2',
          title: 'Mammal Enthusiast',
          description: 'See 10 different mammal species',
          progress: Math.min(100, (catches.filter(c => c.species?.category === 'mammal').length / 10) * 100),
        },
        {
          id: '3',
          title: 'Rare Hunter',
          description: 'See 5 rare or legendary animals',
          progress: Math.min(100, (stats.rareAnimals / 5) * 100),
        },
        {
          id: '4',
          title: 'Explorer',
          description: 'Discover 25 species total',
          progress: Math.min(100, (stats.speciesDiscovered / 25) * 100),
        },
        {
          id: '5',
          title: 'Nature Photographer',
          description: 'Take 50 animal photos',
          progress: Math.min(100, (stats.totalSightings / 50) * 100),
        },
      ];
    } catch (error) {
      console.error('Failed to generate achievements:', error);
      return [];
    }
  }

  async getBadges(): Promise<Badge[]> {
    try {
      const achievements = await this.getAchievements();
      
      return achievements.map(achievement => ({
        id: achievement.id,
        name: achievement.title,
        description: achievement.description,
        icon: getBadgeIcon(achievement.title),
        earned: achievement.progress >= 100,
      }));
    } catch (error) {
      console.error('Failed to generate badges:', error);
      return [];
    }
  }

  // ===== UTILITY METHODS =====

  async createCatch(speciesId: string, latitude: number, longitude: number, photoUrl?: string) {
    try {
      const response = await apiClient.createCatch({
        species_id: speciesId,
        latitude,
        longitude,
        photo_url: photoUrl,
        notes: '',
      });
      
      // Clear cache to force refresh
      this.speciesCache = [];
      
      return response.data;
    } catch (error) {
      console.error('Failed to create catch:', error);
      throw error;
    }
  }

  async checkBackendHealth(): Promise<boolean> {
    try {
      const health = await apiClient.healthCheck();
      return health.status === 'healthy';
    } catch (error) {
      console.error('Backend health check failed:', error);
      return false;
    }
  }
}

// ===== UTILITY FUNCTIONS =====

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getSizeFromWeight(weight?: number): string {
  if (!weight) return 'Unknown';
  if (weight < 1) return 'Tiny';
  if (weight < 10) return 'Small';
  if (weight < 100) return 'Medium';
  return 'Large';
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

function getBadgeIcon(title: string): string {
  const iconMap: { [key: string]: string } = {
    'Bird Watcher': '🐦',
    'Mammal Enthusiast': '🐾',
    'Rare Hunter': '🏆',
    'Explorer': '🗺️',
    'Nature Photographer': '📸',
  };
  return iconMap[title] || '🎖️';
}

// Export singleton instance
export const dataService = new DataService();
export default dataService;
