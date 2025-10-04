import React from 'react';
import { StyleSheet, Button } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeScreen() {
  const { user, signOut } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>
        Hello!
      </ThemedText>

      <ThemedText style={styles.userInfo}>
        Welcome, {user?.displayName || user?.email}
      </ThemedText>

      <ThemedText style={styles.subtitle}>
        You've successfully signed in with Google
      </ThemedText>

      <Button title="Sign Out" onPress={signOut} />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    marginBottom: 20,
  },
  subtitle: {
    marginBottom: 30,
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  userInfo: {
    marginVertical: 10,
    fontSize: 18,
  },
});
