import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/theme';

interface DashboardScreenProps {
  navigation: any;
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ navigation }) => {
  const { user, signOut } = useAuthStore();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Mock data for now
  const stats = {
    totalCatches: 47,
    speciesDiscovered: 23,
    rareAnimals: 5,
    friendsCount: 12,
  };

  const recentCatches = [
    { id: '1', name: 'Red Cardinal', rarity: 'uncommon', time: '2 hours ago', location: 'Central Park' },
    { id: '2', name: 'Gray Squirrel', rarity: 'common', time: '5 hours ago', location: 'Backyard' },
    { id: '3', name: 'Red-tailed Hawk', rarity: 'rare', time: '1 day ago', location: 'City Bridge' },
  ];

  const achievements = [
    { id: '1', title: 'Bird Watcher', description: 'Catch 10 different bird species', progress: 70 },
    { id: '2', title: 'Urban Explorer', description: 'Discover animals in 5 cities', progress: 40 },
    { id: '3', title: 'Early Bird', description: 'Catch animals before 7 AM', progress: 90 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back!</Text>
            <Text style={styles.username}>{user?.displayName || user?.email}</Text>
          </View>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardPrimary]}>
              <Text style={styles.statNumber}>{stats.totalCatches}</Text>
              <Text style={styles.statLabel}>Total Catches</Text>
            </View>
            <View style={[styles.statCard, styles.statCardSecondary]}>
              <Text style={styles.statNumber}>{stats.speciesDiscovered}</Text>
              <Text style={styles.statLabel}>Species Found</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={[styles.statCard, styles.statCardAccent]}>
              <Text style={styles.statNumber}>{stats.rareAnimals}</Text>
              <Text style={styles.statLabel}>Rare Animals</Text>
            </View>
            <View style={[styles.statCard, styles.statCardWater]}>
              <Text style={styles.statNumber}>{stats.friendsCount}</Text>
              <Text style={styles.statLabel}>Friends</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>📸</Text>
              <Text style={styles.actionText}>Catch Animal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>🗺️</Text>
              <Text style={styles.actionText}>Explore Map</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>👥</Text>
              <Text style={styles.actionText}>Find Friends</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Catches */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Catches</Text>
          {recentCatches.map((catch_item) => (
            <View key={catch_item.id} style={styles.catchItem}>
              <View style={styles.catchInfo}>
                <Text style={styles.catchName}>{catch_item.name}</Text>
                <Text style={styles.catchDetails}>
                  {catch_item.location} • {catch_item.time}
                </Text>
              </View>
              <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(catch_item.rarity) }]}>
                <Text style={styles.rarityText}>{catch_item.rarity}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Achievements Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          {achievements.map((achievement) => (
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
                  <Text style={styles.progressText}>{achievement.progress}%</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? Spacing.sm : Spacing.lg,
  },
  greeting: {
    fontSize: Typography.fontSize.lg,
    color: Colors.onSurfaceVariant,
    fontWeight: Typography.fontWeight.normal,
  },
  username: {
    fontSize: Typography.fontSize['2xl'],
    color: Colors.onBackground,
    fontWeight: Typography.fontWeight.bold,
  },
  signOutButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  signOutText: {
    color: Colors.onPrimary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  statsContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
    ...Shadows.md,
  },
  statCardPrimary: {
    backgroundColor: Colors.primary,
  },
  statCardSecondary: {
    backgroundColor: Colors.secondary,
  },
  statCardAccent: {
    backgroundColor: Colors.accent,
  },
  statCardWater: {
    backgroundColor: Colors.water,
  },
  statNumber: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.onPrimary,
    marginBottom: Spacing.xs,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.onPrimary,
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
  catchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  catchInfo: {
    flex: 1,
  },
  catchName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.onSurface,
  },
  catchDetails: {
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
    fontWeight: Typography.fontWeight.medium,
    minWidth: 40,
  },
});

export default DashboardScreen;
