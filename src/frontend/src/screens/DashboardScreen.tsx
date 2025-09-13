import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/theme';
import { dataService } from '../services/dataService';
import { UserStats, RecentSighting, Achievement } from '../types';

interface DashboardScreenProps {
  navigation: any;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { user, signOut } = useAuthStore();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentSightings, setRecentSightings] = useState<RecentSighting[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [userStats, sightings, userAchievements] = await Promise.all([
        dataService.getUserStats(),
        dataService.getRecentSightings(),
        dataService.getAchievements(),
      ]);
      
      setStats(userStats);
      setRecentSightings(sightings);
      setAchievements(userAchievements);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Set fallback data
      setStats({
        totalSightings: 0,
        speciesDiscovered: 0,
        rareAnimals: 0,
        friendsCount: 0,
        level: 1,
        experience: 0,
        nextLevelExp: 1000,
        joinDate: 'Recently',
        location: 'Unknown',
      });
      setRecentSightings([]);
      setAchievements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.username}>{user?.displayName || user?.email?.split('@')[0]}</Text>
          </View>
        </View>

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading your data...</Text>
          </View>
        )}

        {/* Stats Overview */}
        {!loading && stats && (
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.totalSightings}</Text>
              <Text style={styles.statLabel}>Sightings</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.speciesDiscovered}</Text>
              <Text style={styles.statLabel}>Species</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{stats.rareAnimals}</Text>
              <Text style={styles.statLabel}>Rare</Text>
            </View>
          </View>
        )}


        {/* Recent Sightings */}
        {!loading && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Sightings</Text>
            {recentSightings.length > 0 ? (
              recentSightings.map((sighting_item) => (
                <View key={sighting_item.id} style={styles.sightingItem}>
                  <View style={styles.sightingInfo}>
                    <Text style={styles.sightingName}>{sighting_item.name}</Text>
                    <Text style={styles.sightingDetails}>
                      {sighting_item.location} • {sighting_item.time}
                    </Text>
                  </View>
                  <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(sighting_item.rarity) }]}>
                    <Text style={styles.rarityText}>{sighting_item.rarity}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No sightings yet. Go explore!</Text>
            )}
          </View>
        )}

        {/* Achievements Preview */}
        {!loading && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            {achievements.length > 0 ? (
              achievements.slice(0, 3).map((achievement) => (
                <View key={achievement.id} style={styles.achievementItem}>
                  <View style={styles.achievementInfo}>
                    <Text style={styles.achievementTitle}>{achievement.title}</Text>
                    <Text style={styles.achievementDescription}>{achievement.description}</Text>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View 
                          style={[styles.progressFill, { width: `${achievement.progress}%` }]} 
                        />
                      </View>
                      <Text style={styles.progressText}>{Math.round(achievement.progress)}%</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Achievements will appear as you explore!</Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    ...(Platform.OS === 'web' && {
      minHeight: '100vh',
    }),
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? Spacing.sm : Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray200,
    backgroundColor: Colors.surface,
  },
  greeting: {
    fontSize: Typography.fontSize.base,
    color: Colors.onSurfaceVariant,
    fontWeight: Typography.fontWeight.normal,
  },
  username: {
    fontSize: Typography.fontSize['2xl'],
    color: Colors.onBackground,
    fontWeight: Typography.fontWeight.bold,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.onBackground,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    fontWeight: Typography.fontWeight.medium,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.onBackground,
    marginBottom: Spacing.md,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
    minWidth: 80,
  },
  actionIcon: {
    fontSize: Typography.fontSize['2xl'],
    marginBottom: Spacing.sm,
  },
  actionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.onSurface,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
  },
  sightingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  sightingInfo: {
    flex: 1,
  },
  sightingName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.onSurface,
  },
  sightingDetails: {
    fontSize: Typography.fontSize.sm,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },
  rarityBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  rarityText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.onPrimary,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
  },
  achievementItem: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.onSurface,
  },
  achievementDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.gray200,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  progressText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.onSurfaceVariant,
    fontWeight: Typography.fontWeight.medium as any,
    minWidth: 40,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.onSurfaceVariant,
  },
  emptyText: {
    fontSize: Typography.fontSize.base,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    padding: Spacing.lg,
    fontStyle: 'italic',
  },
});

export default DashboardScreen;
