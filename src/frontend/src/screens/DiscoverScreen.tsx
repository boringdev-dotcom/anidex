import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/theme';
import { dataService } from '../services/dataService';

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
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load animals from backend
  useEffect(() => {
    loadAnimals();
  }, []);

  const loadAnimals = async () => {
    try {
      setLoading(true);
      setError(null);
      const animalsData = await dataService.getAllAnimals();
      setAnimals(animalsData);
    } catch (err) {
      console.error('Failed to load animals:', err);
      setError('Failed to load animals. Please check your connection.');
      // Fallback to empty array
      setAnimals([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle search with debouncing
  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(async () => {
        try {
          const searchResults = await dataService.searchAnimals(searchQuery);
          setAnimals(searchResults);
        } catch (err) {
          console.error('Search failed:', err);
        }
      }, 300); // 300ms debounce

      return () => clearTimeout(timeoutId);
    } else {
      // If search is cleared, reload all animals
      loadAnimals();
    }
  }, [searchQuery]);

  const filters = ['all', 'seen', 'unseen', 'birds', 'mammals', 'insects'];

  // Filter animals based on search query and selected filter
  const filteredAnimals = animals.filter(animal => {
    // Note: Search is handled by the API now, so we mainly filter by category here
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
        
        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading animals...</Text>
          </View>
        )}

        {/* Error State */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadAnimals}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Animals Grid */}
        {!loading && !error && (
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
          
          {/* Empty State */}
          {filteredAnimals.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No animals found</Text>
              <Text style={styles.emptyStateSubtext}>Try adjusting your search or filters</Text>
            </View>
          )}
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
      minHeight: '100vh' as any,
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
    fontWeight: Typography.fontWeight.bold as any,
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
    fontWeight: Typography.fontWeight.medium as any,
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
    fontWeight: Typography.fontWeight.bold as any,
  },
  animalInfo: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
  animalName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold as any,
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
    fontWeight: Typography.fontWeight.medium as any,
    textTransform: 'capitalize',
    flex: 1,
  },
  pointsText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.onSurfaceVariant,
    fontWeight: Typography.fontWeight.medium as any,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['4xl'],
  },
  emptyStateText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.sm,
  },
  emptyStateSubtext: {
    fontSize: Typography.fontSize.base,
    color: Colors.onSurfaceVariant,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.onSurfaceVariant,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    fontSize: Typography.fontSize.base,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: Colors.onPrimary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium as any,
  },
});

export default DiscoverScreen;
