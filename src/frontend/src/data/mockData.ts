// Mock Data for Anidex - Animal Kingdom App
// This file contains all the mock data used throughout the application

export interface Animal {
  id: string;
  name: string;
  scientificName: string;
  type: string;
  rarity: string;
  habitat: string;
  points: number;
  caught: boolean;
  imageUrl?: string;
  description: string;
  stats: {
    difficulty: number;
    size: string;
    activity: string;
  };
}

export interface AnimalSighting {
  id: string;
  name: string;
  type: string;
  rarity: string;
  latitude: number;
  longitude: number;
  userCaught: boolean;
  caughtBy: string;
  timeAgo: string;
  distance: string;
}

export interface UserStats {
  totalCatches: number;
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
  catches: number;
  mutualFriends: number;
  status: 'online' | 'offline';
}

export interface RecentCatch {
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

// ===== MOCK DATA =====

export const mockUserStats: UserStats = {
  totalCatches: 47,
  speciesDiscovered: 23,
  rareAnimals: 5,
  friendsCount: 12,
  level: 8,
  experience: 2450,
  nextLevelExp: 3000,
  joinDate: 'March 2024',
  location: 'New York, NY',
};

export const mockAnimals: Animal[] = [
  {
    id: '1',
    name: 'Red Cardinal',
    scientificName: 'Cardinalis cardinalis',
    type: 'Bird',
    rarity: 'uncommon',
    habitat: 'Forest',
    points: 150,
    caught: true,
    description: 'A vibrant red songbird known for its distinctive crest and melodious call.',
    stats: {
      difficulty: 3,
      size: 'Small',
      activity: 'Diurnal',
    },
  },
  {
    id: '2',
    name: 'Red-tailed Hawk',
    scientificName: 'Buteo jamaicensis',
    type: 'Bird',
    rarity: 'rare',
    habitat: 'Open Areas',
    points: 300,
    caught: true,
    description: 'A large bird of prey with excellent hunting skills and keen eyesight.',
    stats: {
      difficulty: 7,
      size: 'Large',
      activity: 'Diurnal',
    },
  },
  {
    id: '3',
    name: 'Gray Wolf',
    scientificName: 'Canis lupus',
    type: 'Mammal',
    rarity: 'legendary',
    habitat: 'Forest',
    points: 1000,
    caught: false,
    description: 'An apex predator and ancestor of domestic dogs, known for pack hunting.',
    stats: {
      difficulty: 10,
      size: 'Large',
      activity: 'Crepuscular',
    },
  },
  {
    id: '4',
    name: 'Eastern Gray Squirrel',
    scientificName: 'Sciurus carolinensis',
    type: 'Mammal',
    rarity: 'common',
    habitat: 'Urban Parks',
    points: 50,
    caught: true,
    description: 'An agile tree-dwelling rodent commonly found in urban environments.',
    stats: {
      difficulty: 2,
      size: 'Small',
      activity: 'Diurnal',
    },
  },
  {
    id: '5',
    name: 'Monarch Butterfly',
    scientificName: 'Danaus plexippus',
    type: 'Insect',
    rarity: 'epic',
    habitat: 'Gardens',
    points: 500,
    caught: false,
    description: 'Famous for its incredible migration journey and beautiful orange wings.',
    stats: {
      difficulty: 5,
      size: 'Tiny',
      activity: 'Diurnal',
    },
  },
  {
    id: '6',
    name: 'Great Blue Heron',
    scientificName: 'Ardea herodias',
    type: 'Bird',
    rarity: 'rare',
    habitat: 'Wetlands',
    points: 250,
    caught: false,
    description: 'A patient wading bird with exceptional fishing skills.',
    stats: {
      difficulty: 6,
      size: 'Large',
      activity: 'Diurnal',
    },
  },
  {
    id: '7',
    name: 'American Robin',
    scientificName: 'Turdus migratorius',
    type: 'Bird',
    rarity: 'common',
    habitat: 'Gardens',
    points: 75,
    caught: true,
    description: 'A common songbird known for its orange breast and melodic song.',
    stats: {
      difficulty: 2,
      size: 'Small',
      activity: 'Diurnal',
    },
  },
  {
    id: '8',
    name: 'White-tailed Deer',
    scientificName: 'Odocoileus virginianus',
    type: 'Mammal',
    rarity: 'uncommon',
    habitat: 'Forest',
    points: 200,
    caught: false,
    description: 'A graceful deer species recognizable by its distinctive white tail.',
    stats: {
      difficulty: 4,
      size: 'Large',
      activity: 'Crepuscular',
    },
  },
];

export const mockAnimalSightings: AnimalSighting[] = [
  {
    id: '1',
    name: 'Red Cardinal',
    type: 'Bird',
    rarity: 'uncommon',
    latitude: 40.7831,
    longitude: -73.9712,
    userCaught: true,
    caughtBy: 'You',
    timeAgo: '2 hours ago',
    distance: '0.2 miles',
  },
  {
    id: '2',
    name: 'Gray Squirrel',
    type: 'Mammal',
    rarity: 'common',
    latitude: 40.7829,
    longitude: -73.9714,
    userCaught: false,
    caughtBy: 'Sarah Johnson',
    timeAgo: '5 hours ago',
    distance: '0.3 miles',
  },
  {
    id: '3',
    name: 'Red-tailed Hawk',
    type: 'Bird',
    rarity: 'rare',
    latitude: 40.7835,
    longitude: -73.9708,
    userCaught: true,
    caughtBy: 'You',
    timeAgo: '1 day ago',
    distance: '0.5 miles',
  },
  {
    id: '4',
    name: 'Monarch Butterfly',
    type: 'Insect',
    rarity: 'epic',
    latitude: 40.7828,
    longitude: -73.9715,
    userCaught: false,
    caughtBy: 'Mike Chen',
    timeAgo: '3 hours ago',
    distance: '0.1 miles',
  },
  {
    id: '5',
    name: 'Great Blue Heron',
    type: 'Bird',
    rarity: 'rare',
    latitude: 40.7840,
    longitude: -73.9720,
    userCaught: false,
    caughtBy: 'Emma Davis',
    timeAgo: '6 hours ago',
    distance: '0.8 miles',
  },
];

export const mockBadges: Badge[] = [
  { id: '1', name: 'Bird Watcher', description: 'Caught 10 bird species', icon: '🐦', earned: true },
  { id: '2', name: 'Urban Explorer', description: 'Found animals in 5 cities', icon: '🏙️', earned: true },
  { id: '3', name: 'Early Bird', description: 'Caught animals before 7 AM', icon: '🌅', earned: true },
  { id: '4', name: 'Night Owl', description: 'Spotted nocturnal animals', icon: '🦉', earned: false },
  { id: '5', name: 'Rare Hunter', description: 'Caught 5 legendary animals', icon: '🏆', earned: false },
  { id: '6', name: 'Social Butterfly', description: 'Connected with 20 friends', icon: '🦋', earned: false },
  { id: '7', name: 'Nature Photographer', description: 'Captured 100 animal photos', icon: '📸', earned: true },
  { id: '8', name: 'Explorer', description: 'Visited 10 different habitats', icon: '🗺️', earned: false },
];

export const mockFriends: Friend[] = [
  { id: '1', name: 'Sarah Johnson', catches: 34, mutualFriends: 5, status: 'online' },
  { id: '2', name: 'Mike Chen', catches: 67, mutualFriends: 8, status: 'offline' },
  { id: '3', name: 'Emma Davis', catches: 23, mutualFriends: 3, status: 'online' },
  { id: '4', name: 'Alex Rodriguez', catches: 89, mutualFriends: 12, status: 'offline' },
  { id: '5', name: 'Lisa Wang', catches: 45, mutualFriends: 7, status: 'online' },
  { id: '6', name: 'Tom Brown', catches: 56, mutualFriends: 4, status: 'offline' },
];

export const mockRecentCatches: RecentCatch[] = [
  { id: '1', name: 'Red Cardinal', rarity: 'uncommon', time: '2 hours ago', location: 'Central Park' },
  { id: '2', name: 'Gray Squirrel', rarity: 'common', time: '5 hours ago', location: 'Backyard' },
  { id: '3', name: 'Red-tailed Hawk', rarity: 'rare', time: '1 day ago', location: 'City Bridge' },
  { id: '4', name: 'Monarch Butterfly', rarity: 'epic', time: '2 weeks ago', location: 'Botanical Garden' },
];

export const mockAchievements: Achievement[] = [
  { id: '1', title: 'Bird Watcher', description: 'Catch 10 different bird species', progress: 70 },
  { id: '2', title: 'Urban Explorer', description: 'Discover animals in 5 cities', progress: 40 },
  { id: '3', title: 'Early Bird', description: 'Catch animals before 7 AM', progress: 90 },
  { id: '4', title: 'Nature Photographer', description: 'Take 100 animal photos', progress: 65 },
  { id: '5', title: 'Social Connector', description: 'Connect with 20 friends', progress: 60 },
];

export const mockCurrentLocation: Location = {
  latitude: 40.7831,
  longitude: -73.9712,
  address: "Central Park, New York, NY",
};

// Utility functions for mock data
export const getAnimalById = (id: string): Animal | undefined => {
  return mockAnimals.find(animal => animal.id === id);
};

export const getAnimalsByType = (type: string): Animal[] => {
  return mockAnimals.filter(animal => animal.type.toLowerCase() === type.toLowerCase());
};

export const getAnimalsByRarity = (rarity: string): Animal[] => {
  return mockAnimals.filter(animal => animal.rarity.toLowerCase() === rarity.toLowerCase());
};

export const getCaughtAnimals = (): Animal[] => {
  return mockAnimals.filter(animal => animal.caught);
};

export const getUncaughtAnimals = (): Animal[] => {
  return mockAnimals.filter(animal => !animal.caught);
};

export const searchAnimals = (query: string): Animal[] => {
  const searchTerm = query.toLowerCase();
  return mockAnimals.filter(animal => 
    animal.name.toLowerCase().includes(searchTerm) ||
    animal.scientificName.toLowerCase().includes(searchTerm) ||
    animal.type.toLowerCase().includes(searchTerm) ||
    animal.habitat.toLowerCase().includes(searchTerm)
  );
};

export const getFriendsByStatus = (status: 'online' | 'offline'): Friend[] => {
  return mockFriends.filter(friend => friend.status === status);
};

export const getEarnedBadges = (): Badge[] => {
  return mockBadges.filter(badge => badge.earned);
};

export const getUnlockedBadges = (): Badge[] => {
  return mockBadges.filter(badge => !badge.earned);
};
