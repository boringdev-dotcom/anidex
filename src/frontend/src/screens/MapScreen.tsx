import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  ScrollView,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/theme';

interface MapScreenProps {
  navigation: any;
}

interface AnimalSighting {
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

const MapScreen: React.FC<MapScreenProps> = ({ navigation }) => {
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [mapMode, setMapMode] = useState('standard'); // 'standard' or 'satellite'

  // Mock animal sightings data
  const animalSightings: AnimalSighting[] = [
    {
      id: '1',
      name: 'Red Cardinal',
      type: 'Bird',
      rarity: 'uncommon',
      latitude: 40.7831,
      longitude: -73.9712,
      userSeen: true,
      seenBy: 'You',
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
      userSeen: false,
      seenBy: 'Sarah Johnson',
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
      userSeen: true,
      seenBy: 'You',
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
      userSeen: false,
      seenBy: 'Mike Chen',
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
      userSeen: false,
      seenBy: 'Emma Davis',
      timeAgo: '6 hours ago',
      distance: '0.8 miles',
    },
  ];

  const filters = ['all', 'my-sightings', 'friends', 'rare', 'nearby'];
  const currentLocation = {
    latitude: 40.7831,
    longitude: -73.9712,
    address: "Central Park, New York, NY",
  };

  const filteredSightings = animalSightings.filter(sighting => {
    switch (selectedFilter) {
      case 'my-sightings':
        return sighting.userSeen;
      case 'friends':
        return !sighting.userSeen;
      case 'rare':
        return ['rare', 'epic', 'legendary'].includes(sighting.rarity);
      case 'nearby':
        return parseFloat(sighting.distance) <= 0.5;
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

  const getAnimalIcon = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'bird':
        return '🐦';
      case 'mammal':
        return '🐾';
      case 'insect':
        return '🦋';
      case 'reptile':
        return '🦎';
      case 'amphibian':
        return '🐸';
      default:
        return '🐾';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Map</Text>
      </View>

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <TouchableOpacity 
          style={[styles.mapModeButton, mapMode === 'standard' && styles.mapModeButtonActive]}
          onPress={() => setMapMode('standard')}
        >
          <Text style={[styles.mapModeText, mapMode === 'standard' && styles.mapModeTextActive]}>
            Standard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.mapModeButton, mapMode === 'satellite' && styles.mapModeButtonActive]}
          onPress={() => setMapMode('satellite')}
        >
          <Text style={[styles.mapModeText, mapMode === 'satellite' && styles.mapModeTextActive]}>
            Satellite
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.locationButton}>
          <Text style={styles.locationButtonIcon}>📍</Text>
        </TouchableOpacity>
      </View>

      {/* Map Placeholder */}
      <View style={styles.mapContainer}>
        <View style={[styles.mapPlaceholder, { backgroundColor: mapMode === 'satellite' ? Colors.gray800 : Colors.gray200 }]}>
          <Text style={[styles.mapText, { color: mapMode === 'satellite' ? Colors.gray300 : Colors.gray600 }]}>
            Map View
          </Text>
          
          {/* Simulated Animal Pins */}
          <View style={styles.pinsContainer}>
            {filteredSightings.slice(0, 5).map((sighting, index) => (
              <TouchableOpacity
                key={sighting.id}
                style={[
                  styles.animalPin,
                  {
                    backgroundColor: getRarityColor(sighting.rarity),
                    left: `${20 + index * 15}%`,
                    top: `${30 + index * 10}%`,
                  }
                ]}
              >
                <Text style={styles.pinIcon}>{getAnimalIcon(sighting.type)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Combined Content */}
      <ScrollView style={styles.mainScrollView} showsVerticalScrollIndicator={false}>
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
                  {filter.charAt(0).toUpperCase() + filter.slice(1).replace('-', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Sightings List */}
        <View style={styles.sightingsContainer}>
          <Text style={styles.sightingsTitle}>
            Recent Sightings ({filteredSightings.length})
          </Text>
          
          <View style={styles.sightingsList}>
          {filteredSightings.map((sighting) => (
            <TouchableOpacity key={sighting.id} style={styles.sightingItem}>
              <View style={styles.sightingIcon}>
                <View style={[styles.sightingIconBg, { backgroundColor: getRarityColor(sighting.rarity) }]}>
                  <Text style={styles.sightingEmoji}>{getAnimalIcon(sighting.type)}</Text>
                </View>
                {sighting.userSeen && (
                  <View style={styles.seenIndicator}>
                    <Text style={styles.seenIcon}>✓</Text>
                  </View>
                )}
              </View>

              <View style={styles.sightingInfo}>
                <Text style={styles.sightingName}>{sighting.name}</Text>
                <View style={styles.sightingMeta}>
                  <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(sighting.rarity) }]}>
                    <Text style={styles.rarityText}>{sighting.rarity}</Text>
                  </View>
                  <Text style={styles.sightingDistance}>{sighting.distance}</Text>
                </View>
                <Text style={styles.sightingDetails}>
                  Seen by {sighting.seenBy} • {sighting.timeAgo}
                </Text>
              </View>

              <TouchableOpacity style={styles.navigateButton}>
                <Text style={styles.navigateButtonIcon}>🧭</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          </View>
        </View>
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
  mapControls: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mapModeButton: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    ...Shadows.sm,
  },
  mapModeButtonActive: {
    backgroundColor: Colors.primary,
  },
  mapModeText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.onSurface,
    fontWeight: Typography.fontWeight.medium,
  },
  mapModeTextActive: {
    color: Colors.onPrimary,
  },
  locationButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  locationButtonIcon: {
    fontSize: Typography.fontSize.lg,
  },
  mapContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  mapPlaceholder: {
    height: 250,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    ...Shadows.md,
  },
  mapText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
  },
  mapSubtext: {
    fontSize: Typography.fontSize.sm,
    marginTop: Spacing.xs,
  },
  pinsContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  animalPin: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
    ...Shadows.sm,
  },
  pinIcon: {
    fontSize: 16,
  },
  mainScrollView: {
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
  sightingsContainer: {
    paddingHorizontal: Spacing.lg,
  },
  sightingsTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.onBackground,
    marginBottom: Spacing.md,
  },
  sightingsList: {
    paddingBottom: Spacing.xl,
  },
  sightingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  sightingIcon: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  sightingIconBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sightingEmoji: {
    fontSize: Typography.fontSize.lg,
  },
  seenIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: Colors.success,
    borderRadius: BorderRadius.full,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  seenIcon: {
    color: Colors.onPrimary,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
  },
  sightingInfo: {
    flex: 1,
  },
  sightingName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.onSurface,
  },
  sightingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  rarityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  rarityText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.onPrimary,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  sightingDistance: {
    fontSize: Typography.fontSize.sm,
    color: Colors.water,
    fontWeight: Typography.fontWeight.medium,
  },
  sightingDetails: {
    fontSize: Typography.fontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  navigateButton: {
    backgroundColor: Colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navigateButtonIcon: {
    fontSize: Typography.fontSize.lg,
  },
  locationInfo: {
    backgroundColor: Colors.surface,
    margin: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  locationIcon: {
    fontSize: Typography.fontSize.lg,
    marginRight: Spacing.sm,
  },
  locationTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.onSurface,
  },
  locationText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.onSurfaceVariant,
    marginBottom: Spacing.xs,
  },
  coordinatesText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.onSurfaceVariant,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

export default MapScreen;
