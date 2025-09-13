import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  TextInput,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/theme';

interface DiscoverScreenProps {
  navigation: any;
}

interface Animal {
  id: string;
  name: string;
  scientificName: string;
  type: string;
  rarity: string;
  habitat: string;
  points: number;
  seen: boolean;
  imageUrl?: string;
  description: string;
  stats: {
    difficulty: number;
    size: string;
    activity: string;
  };
}

const DiscoverScreen: React.FC<DiscoverScreenProps> = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Mock animal data
  const animals: Animal[] = [
    {
      id: '1',
      name: 'Red Cardinal',
      scientificName: 'Cardinalis cardinalis',
      type: 'Bird',
      rarity: 'uncommon',
      habitat: 'Forest',
      points: 150,
      seen: true,
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
      seen: true,
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
      seen: false,
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
      seen: true,
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
      seen: false,
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
      seen: false,
      description: 'A patient wading bird with exceptional fishing skills.',
      stats: {
        difficulty: 6,
        size: 'Large',
        activity: 'Diurnal',
      },
    },
  ];

  const filters = ['all', 'seen', 'unseen', 'birds', 'mammals', 'insects'];

  const filteredAnimals = animals.filter(animal => {
    const matchesSearch = animal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         animal.scientificName.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    switch (selectedFilter) {
      case 'seen':
        return animal.seen;
      case 'unseen':
        return !animal.seen;
      case 'birds':
        return animal.type.toLowerCase() === 'bird';
      case 'mammals':
        return animal.type.toLowerCase() === 'mammal';
      case 'insects':
        return animal.type.toLowerCase() === 'insect';
      default:
        return true;
    }
  });

  const getRarityColor = (rarity: string): string => {
    switch (rarity.toLowerCase()) {
      case 'common':
        return Colors.gray500;
      case 'uncommon':
        return Colors.success;
      case 'rare':
        return Colors.water;
      case 'epic':
        return '#9C27B0';
      case 'legendary':
        return Colors.accent;
      default:
        return Colors.gray500;
    }
  };

  const renderDifficultyStars = (difficulty: number) => {
    return '★'.repeat(Math.min(difficulty, 5)) + '☆'.repeat(Math.max(0, 5 - difficulty));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search animals..."
          placeholderTextColor={Colors.onSurfaceVariant}
        />
      </View>

      {/* Combined Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Filter Tabs - Header Component */}
        <View style={styles.filtersContainerFixed}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContentFixed}
          >
            {filters.map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterButton,
                  selectedFilter === filter && styles.filterButtonActive
                ]}
                onPress={() => setSelectedFilter(filter)}
              >
                <Text style={[
                  styles.filterText,
                  selectedFilter === filter && styles.filterTextActive
                ]}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Animals Grid */}
        <View style={styles.animalsGrid}>
          {filteredAnimals.map((animal) => (
            <TouchableOpacity key={animal.id} style={styles.animalCard}>
              {/* Animal Image */}
              <View style={styles.animalImageContainer}>
                <View style={[styles.animalImage, { backgroundColor: getRarityColor(animal.rarity) }]}>
                  <Text style={styles.animalEmoji}>
                    {animal.type === 'Bird' ? '🐦' : 
                     animal.type === 'Mammal' ? '🐾' : '🦋'}
                  </Text>
                </View>
                {animal.seen && (
                  <View style={styles.seenBadge}>
                    <Text style={styles.seenText}>✓</Text>
                  </View>
                )}
              </View>

              {/* Animal Info */}
              <View style={styles.animalInfo}>
                <Text style={styles.animalName}>{animal.name}</Text>
                <Text style={styles.animalScientific}>{animal.scientificName}</Text>
                
                <View style={styles.animalMeta}>
                  <View style={[styles.rarityDot, { backgroundColor: getRarityColor(animal.rarity) }]} />
                  <Text style={styles.rarityText}>{animal.rarity}</Text>
                  <Text style={styles.pointsText}>{animal.points} pts</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {filteredAnimals.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No animals found</Text>
            <Text style={styles.emptyStateSubtext}>Try adjusting your search or filters</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    ...(Platform.OS === 'web' && {
      minHeight: '100vh',
    }),
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? Spacing.sm : Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    backgroundColor: Colors.surface,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.onBackground,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.onSurface,
    ...Shadows.sm,
  },
  filtersContainer: {
    paddingLeft: Spacing.lg,
    marginBottom: 0,
    marginTop: 0,
    margin: 0,
    height: 36,
    paddingVertical: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  filtersContent: {
    paddingRight: Spacing.lg,
    alignItems: 'center',
    height: 36,
  },
  filterButton: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.onSurface,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
    lineHeight: 16,
  },
  filterTextActive: {
    color: Colors.onPrimary,
  },
  scrollView: {
    flex: 1,
  },
  filtersContainerFixed: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xs,
    backgroundColor: Colors.background,
  },
  filtersContentFixed: {
    alignItems: 'center',
  },
  animalsGrid: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xl,
    paddingTop: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  animalCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    width: '48%',
    overflow: 'hidden',
    ...Shadows.sm,
  },
  animalImageContainer: {
    position: 'relative',
  },
  animalImage: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    margin: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  animalEmoji: {
    fontSize: 32,
  },
  seenBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.full,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seenText: {
    color: Colors.onPrimary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  animalInfo: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
  animalName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.onSurface,
    marginBottom: Spacing.xs,
  },
  animalScientific: {
    fontSize: Typography.fontSize.xs,
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
  },
  animalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rarityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  rarityText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.onSurfaceVariant,
    fontWeight: Typography.fontWeight.medium,
    textTransform: 'capitalize',
    flex: 1,
  },
  pointsText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.onSurfaceVariant,
    fontWeight: Typography.fontWeight.medium,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['4xl'],
  },
  emptyStateText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: Typography.fontSize.base,
    color: Colors.onSurfaceVariant,
  },
});

export default DiscoverScreen;
