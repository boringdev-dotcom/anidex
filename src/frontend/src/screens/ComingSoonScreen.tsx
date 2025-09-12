import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Platform,
} from 'react-native';
import { useAuthStore } from '../store/authStore';

const ComingSoonScreen: React.FC = () => {
  const { signOut, user } = useAuthStore();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>🎉 Welcome to Anidex!</Text>
          <Text style={styles.welcomeText}>
            Hello {user?.displayName || user?.email}!
          </Text>
        </View>

        <View style={styles.mainContent}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>🚀</Text>
          </View>
          
          <Text style={styles.comingSoonTitle}>Something Amazing is Coming Soon!</Text>
          
          <Text style={styles.description}>
            We're working hard to bring you an incredible experience. Stay tuned for exciting features and updates!
          </Text>

          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>What's Coming:</Text>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>• </Text>
              <Text style={styles.featureText}>Personalized anime recommendations</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>• </Text>
              <Text style={styles.featureText}>Track your watching progress</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>• </Text>
              <Text style={styles.featureText}>Connect with other anime fans</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureBullet}>• </Text>
              <Text style={styles.featureText}>Discover new series and movies</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
          
          <Text style={styles.footerText}>Thank you for joining us early! 🙏</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    ...(Platform.OS === 'web' && {
      minHeight: '100vh',
      display: 'flex',
    }),
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
    ...(Platform.OS === 'web' && {
      maxWidth: 600,
      margin: '0 auto',
      width: '100%',
    }),
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  icon: {
    fontSize: 80,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  featuresContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureBullet: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  signOutButton: {
    backgroundColor: '#ff4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default ComingSoonScreen;