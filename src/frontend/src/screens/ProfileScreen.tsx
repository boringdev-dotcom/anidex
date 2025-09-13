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
import { UserStats, RecentSighting, Badge, Friend } from '../types';

interface ProfileScreenProps {
  navigation: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, signOut } = useAuthStore();
  const [activeTab, setActiveTab] = useState('collection');
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [recentSightings, setRecentSightings] = useState<RecentSighting[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const [stats, userBadges, sightings] = await Promise.all([
        dataService.getUserStats(),
        dataService.getBadges(),
        dataService.getRecentSightings(),
      ]);
      
      setUserStats(stats);
      setBadges(userBadges);
      setRecentSightings(sightings);
      
      // TODO: Implement friends API when available
      setFriends([]); // No friends for now
    } catch (error) {
      console.error('Failed to load profile data:', error);
      // Set fallback data
      setUserStats({
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
      setBadges([]);
      setRecentSightings([]);
      setFriends([]);
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

  const renderCollection = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{userStats?.totalSightings || 0}</Text>
          <Text style={styles.statLabel}>Total Sightings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{userStats?.speciesDiscovered || 0}</Text>
          <Text style={styles.statLabel}>Species</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{userStats?.rareAnimals || 0}</Text>
          <Text style={styles.statLabel}>Rare Animals</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent Sightings</Text>
      {recentSightings.map((sighting_item) => (
        <View key={sighting_item.id} style={styles.sightingItem}>
          <View style={styles.sightingInfo}>
            <Text style={styles.sightingName}>{sighting_item.name}</Text>
            <Text style={styles.sightingDetails}>
              {sighting_item.location} • {sighting_item.date}
            </Text>
          </View>
          <View style={[styles.rarityBadge, { backgroundColor: getRarityColor(sighting_item.rarity) }]}>
            <Text style={styles.rarityText}>{sighting_item.rarity}</Text>
          </View>
        </View>
      ))}
    </View>
  );

  const renderBadges = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Achievements</Text>
      <View style={styles.badgesGrid}>
        {badges.map((badge) => (
          <View key={badge.id} style={[styles.badgeCard, !badge.earned && styles.badgeCardLocked]}>
            <Text style={[styles.badgeIcon, !badge.earned && styles.badgeIconLocked]}>
              {badge.earned ? badge.icon : '🔒'}
            </Text>
            <Text style={[styles.badgeName, !badge.earned && styles.badgeNameLocked]}>
              {badge.name}
            </Text>
            <Text style={[styles.badgeDescription, !badge.earned && styles.badgeDescriptionLocked]}>
              {badge.description}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderFriends = () => (
    <View style={styles.tabContent}>
      <View style={styles.friendsHeader}>
        <Text style={styles.sectionTitle}>Friends ({userStats?.friendsCount || 0})</Text>
        <TouchableOpacity style={styles.addFriendButton}>
          <Text style={styles.addFriendText}>+ Add Friends</Text>
        </TouchableOpacity>
      </View>
      
      {friends.map((friend) => (
        <View key={friend.id} style={styles.friendItem}>
          <View style={styles.friendAvatar}>
            <Text style={styles.friendAvatarText}>{friend.name.charAt(0)}</Text>
            <View style={[styles.statusDot, { backgroundColor: friend.status === 'online' ? Colors.success : Colors.gray400 }]} />
          </View>
          <View style={styles.friendInfo}>
            <Text style={styles.friendName}>{friend.name}</Text>
            <Text style={styles.friendStats}>
              {friend.sightings} sightings • {friend.mutualFriends} mutual friends
            </Text>
          </View>
          <TouchableOpacity style={styles.messageButton}>
            <Text style={styles.messageButtonText}>Message</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading profile...</Text>
          </View>
        )}

        {/* Profile Header */}
        {!loading && (
          <View style={styles.profileHeader}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </Text>
            </View>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userStats?.totalSightings || 0}</Text>
                <Text style={styles.statLabel}>Sightings</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userStats?.speciesDiscovered || 0}</Text>
                <Text style={styles.statLabel}>Species</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userStats?.rareAnimals || 0}</Text>
                <Text style={styles.statLabel}>Rare</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.displayName || user?.email?.split('@')[0]}
            </Text>
            <Text style={styles.profileLocation}>{userStats?.location || 'Unknown'}</Text>
          </View>
        </View>
        )}

        {/* Tab Navigation */}
        {!loading && (
          <View style={styles.tabNavigation}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'collection' && styles.tabButtonActive]}
              onPress={() => setActiveTab('collection')}
            >
              <Text style={[styles.tabText, activeTab === 'collection' && styles.tabTextActive]}>
                Collection
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'badges' && styles.tabButtonActive]}
              onPress={() => setActiveTab('badges')}
            >
              <Text style={[styles.tabText, activeTab === 'badges' && styles.tabTextActive]}>
                Badges
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'friends' && styles.tabButtonActive]}
              onPress={() => setActiveTab('friends')}
            >
              <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
                Friends
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tab Content */}
        {!loading && (
          <>
            {activeTab === 'collection' && renderCollection()}
            {activeTab === 'badges' && renderBadges()}
            {activeTab === 'friends' && renderFriends()}
          </>
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
  scrollView: {
    flex: 1,
  },
  profileHeader: {
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.lg,
  },
  avatarText: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.onPrimary,
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.onSurface,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },
  profileInfo: {
    alignItems: 'flex-start',
  },
  profileName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.onSurface,
  },
  profileLocation: {
    fontSize: Typography.fontSize.base,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },
  experienceContainer: {
    backgroundColor: Colors.surface,
    margin: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  experienceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  experienceLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.onSurface,
  },
  experienceText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  experienceBar: {
    height: 8,
    backgroundColor: Colors.gray200,
    borderRadius: BorderRadius.full,
  },
  experienceFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
  },
  tabButtonActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: Colors.onPrimary,
  },
  tabContent: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.onBackground,
    marginBottom: Spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  statCard: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: Spacing.xs,
    ...Shadows.sm,
  },
  statNumber: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.primary,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
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
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.onSurface,
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
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  badgeCard: {
    backgroundColor: Colors.surface,
    width: '48%',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  badgeCardLocked: {
    backgroundColor: Colors.gray100,
  },
  badgeIcon: {
    fontSize: Typography.fontSize['2xl'],
    marginBottom: Spacing.sm,
  },
  badgeIconLocked: {
    opacity: 0.5,
  },
  badgeName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.onSurface,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  badgeNameLocked: {
    color: Colors.onSurfaceVariant,
  },
  badgeDescription: {
    fontSize: Typography.fontSize.xs,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  badgeDescriptionLocked: {
    color: Colors.gray500,
  },
  friendsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  addFriendButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  addFriendText: {
    color: Colors.onPrimary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  friendAvatar: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  friendAvatarText: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.secondary,
    color: Colors.onPrimary,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    lineHeight: 50,
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.onSurface,
  },
  friendStats: {
    fontSize: Typography.fontSize.sm,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },
  messageButton: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  messageButtonText: {
    color: Colors.onPrimary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  signOutButton: {
    backgroundColor: Colors.error,
    margin: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    ...Shadows.sm,
  },
  signOutButtonText: {
    color: Colors.onPrimary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
});

export default ProfileScreen;
