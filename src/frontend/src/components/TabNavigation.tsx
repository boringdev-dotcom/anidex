import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/theme';

import DashboardScreen from '../screens/DashboardScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import CameraScreen from '../screens/CameraScreen';
import MapScreen from '../screens/MapScreen';
import ProfileScreen from '../screens/ProfileScreen';

interface TabNavigationProps {
  navigation: any;
}

type TabName = 'Dashboard' | 'Discover' | 'Camera' | 'Map' | 'Profile';

interface Tab {
  name: TabName;
  icon: string;
  label: string;
  component: React.ComponentType<any>;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState<TabName>('Dashboard');

  const tabs: Tab[] = [
    {
      name: 'Dashboard',
      icon: '🏠',
      label: 'Home',
      component: DashboardScreen,
    },
    {
      name: 'Discover',
      icon: '🔍',
      label: 'Discover',
      component: DiscoverScreen,
    },
    {
      name: 'Camera',
      icon: '📸',
      label: 'Catch',
      component: CameraScreen,
    },
    {
      name: 'Map',
      icon: '🗺️',
      label: 'Map',
      component: MapScreen,
    },
    {
      name: 'Profile',
      icon: '👤',
      label: 'Profile',
      component: ProfileScreen,
    },
  ];

  const ActiveComponent = tabs.find(tab => tab.name === activeTab)?.component || DashboardScreen;

  const handleTabPress = (tabName: TabName) => {
    setActiveTab(tabName);
  };

  return (
    <View style={styles.container}>
      {/* Main Content */}
      <View style={styles.content}>
        <ActiveComponent navigation={navigation} />
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <View style={styles.tabContainer}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.name}
              style={[
                styles.tabButton,
                activeTab === tab.name && styles.tabButtonActive,
                tab.name === 'Camera' && styles.cameraTab,
              ]}
              onPress={() => handleTabPress(tab.name)}
              activeOpacity={0.7}
            >
              {tab.name === 'Camera' ? (
                <View style={styles.cameraButtonInner}>
                  <Text style={styles.cameraIcon}>{tab.icon}</Text>
                </View>
              ) : (
                <>
                  <Text style={[
                    styles.tabIcon,
                    activeTab === tab.name && styles.tabIconActive
                  ]}>
                    {tab.icon}
                  </Text>
                  <Text style={[
                    styles.tabLabel,
                    activeTab === tab.name && styles.tabLabelActive
                  ]}>
                    {tab.label}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
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
  content: {
    flex: 1,
  },
  tabBar: {
    backgroundColor: Colors.surface,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? Spacing.lg : Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    ...Shadows.lg,
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 60,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.xs,
  },
  tabButtonActive: {
    backgroundColor: Colors.primaryLight + '20', // 20% opacity
  },
  cameraTab: {
    flex: 0,
    backgroundColor: 'transparent',
    marginHorizontal: Spacing.sm,
  },
  cameraButtonInner: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.md,
  },
  cameraIcon: {
    fontSize: Typography.fontSize.lg,
    color: Colors.onPrimary,
  },
  tabIcon: {
    fontSize: Typography.fontSize.base,
    marginBottom: Spacing.xs,
  },
  tabIconActive: {
    fontSize: Typography.fontSize.lg,
  },
  tabLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.onSurfaceVariant,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default TabNavigation;
