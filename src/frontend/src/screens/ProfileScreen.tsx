import React, { useState } from 'react';
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

interface ProfileScreenProps {
  navigation: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { user, signOut } = useAuthStore();
  const [activeTab, setActiveTab] = useState('collection');

  // Mock user data
  const userStats = {
    totalSightings: 47,
    speciesDiscovered: 23,
    rareAnimals: 5,
    friendsCount: 12,
    level: 8,
    experience: 2450,
    nextLevelExp: 3000,
    joinDate: 'March 2024',
    location: 'New York, NY',
  };

  const badges = [
    { id: '1', name: 'Bird Watcher', description: 'Seen 10 bird species', icon: '🐦', earned: true },
    { id: '2', name: 'Urban Explorer', description: 'Found animals in 5 cities', icon: '🏙️', earned: true },
    { id: '3', name: 'Early Bird', description: 'Seen animals before 7 AM', icon: '🌅', earned: true },
    { id: '4', name: 'Night Owl', description: 'Spotted nocturnal animals', icon: '🦉', earned: false },
    { id: '5', name: 'Rare Hunter', description: 'Seen 5 legendary animals', icon: '🏆', earned: false },
    { id: '6', name: 'Social Butterfly', description: 'Connected with 20 friends', icon: '🦋', earned: false },
  ];

  const recentSightings = [
    { id: '1', name: 'Red Cardinal', rarity: 'uncommon', date: '2 days ago', location: 'Central Park' },
    { id: '2', name: 'Gray Squirrel', rarity: 'common', date: '3 days ago', location: 'Backyard' },
    { id: '3', name: 'Red-tailed Hawk', rarity: 'rare', date: '1 week ago', location: 'City Bridge' },
    { id: '4', name: 'Monarch Butterfly', rarity: 'epic', date: '2 weeks ago', location: 'Botanical Garden' },
  ];

  const friends = [
    { id: '1', name: 'Sarah Johnson', sightings: 34, mutualFriends: 5, status: 'online' },
    { id: '2', name: 'Mike Chen', sightings: 67, mutualFriends: 8, status: 'offline' },
    { id: '3', name: 'Emma Davis', sightings: 23, mutualFriends: 3, status: 'online' },
    { id: '4', name: 'Alex Rodriguez', sightings: 89, mutualFriends: 12, status: 'offline' },
  ];

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
          <Text style={styles.statNumber}>{userStats.totalSightings}</Text>
          <Text style={styles.statLabel}>Total Sightings</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{userStats.speciesDiscovered}</Text>
          <Text style={styles.statLabel}>Species</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{userStats.rareAnimals}</Text>
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
        <Text style={styles.sectionTitle}>Friends ({userStats.friendsCount})</Text>
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
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
              </Text>
            </View>
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userStats.totalSightings}</Text>
                <Text style={styles.statLabel}>Sightings</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userStats.speciesDiscovered}</Text>
                <Text style={styles.statLabel}>Species</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{userStats.rareAnimals}</Text>
                <Text style={styles.statLabel}>Rare</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {user?.displayName || user?.email?.split('@')[0]}
            </Text>
            <Text style={styles.profileLocation}>{userStats.location}</Text>
          </View>
        </View>

        {/* Tab Navigation */}
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

        {/* Tab Content */}
        {activeTab === 'collection' && renderCollection()}
        {activeTab === 'badges' && renderBadges()}
        {activeTab === 'friends' && renderFriends()}

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
