import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  Alert,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../styles/theme';

interface CameraScreenProps {
  navigation: any;
}

const CameraScreen: React.FC<CameraScreenProps> = ({ navigation }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [lastPhoto, setLastPhoto] = useState<string | null>(null);

  // Mock location data
  const currentLocation = {
    latitude: 40.7831,
    longitude: -73.9712,
    address: "Central Park, New York, NY",
  };

  const handleTakePhoto = () => {
    setIsCapturing(true);
    
    // Simulate camera capture
    setTimeout(() => {
      setIsCapturing(false);
      setLastPhoto('captured_photo_placeholder');
      Alert.alert(
        'Photo Captured!',
        'Your animal photo has been saved. Ready to identify?',
        [
          { text: 'Take Another', style: 'cancel' },
          { 
            text: 'Identify Animal', 
            onPress: handleIdentifyAnimal,
            style: 'default'
          }
        ]
      );
    }, 1500);
  };

  const handleChooseFromGallery = () => {
    Alert.alert(
      'Choose Photo',
      'Select a photo from your gallery to identify an animal.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Open Gallery', 
          onPress: () => {
            // In a real app, this would open the image picker
            setLastPhoto('gallery_photo_placeholder');
            setTimeout(() => {
              handleIdentifyAnimal();
            }, 500);
          }
        }
      ]
    );
  };

  const handleIdentifyAnimal = () => {
    // Navigate to identification/submission flow
    Alert.alert(
      'Animal Identification',
      'Processing your photo... This feature will identify the animal and add it to your collection!',
      [
        { text: 'OK', onPress: () => navigation.navigate('Dashboard') }
      ]
    );
  };

  const tips = [
    {
      icon: '📸',
      title: 'Good Lighting',
      description: 'Take photos in natural light for best results'
    },
    {
      icon: '🎯',
      title: 'Focus on Subject',
      description: 'Make sure the animal is clearly visible and in focus'
    },
    {
      icon: '📏',
      title: 'Appropriate Distance',
      description: 'Get close enough for detail, but respect wildlife'
    },
    {
      icon: '⚡',
      title: 'Quick Capture',
      description: 'Animals move fast - be ready to capture the moment'
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Camera</Text>
      </View>

      {/* Camera Viewfinder Area */}
      <View style={styles.cameraContainer}>
        <View style={styles.viewfinder}>
          {isCapturing ? (
            <View style={styles.capturingIndicator}>
              <Text style={styles.capturingText}>📷</Text>
              <Text style={styles.capturingLabel}>Capturing...</Text>
            </View>
          ) : (
            <View style={styles.viewfinderContent}>
              <Text style={styles.viewfinderIcon}>🎯</Text>
              <Text style={styles.viewfinderText}>Point your camera at an animal</Text>
              {lastPhoto && (
                <View style={styles.lastPhotoIndicator}>
                  <Text style={styles.lastPhotoText}>✓ Photo ready</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Camera Controls */}
        <View style={styles.cameraControls}>
          <TouchableOpacity 
            style={styles.galleryButton}
            onPress={handleChooseFromGallery}
          >
            <Text style={styles.controlButtonIcon}>🖼️</Text>
            <Text style={styles.controlButtonText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.captureButton, isCapturing && styles.captureButtonActive]}
            onPress={handleTakePhoto}
            disabled={isCapturing}
          >
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.switchButton}
            onPress={() => Alert.alert('Camera Switch', 'Switch between front and back camera')}
          >
            <Text style={styles.controlButtonIcon}>🔄</Text>
            <Text style={styles.controlButtonText}>Switch</Text>
          </TouchableOpacity>
        </View>
      </View>


      {/* Action Buttons */}
      {lastPhoto && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.identifyButton}
            onPress={handleIdentifyAnimal}
          >
            <Text style={styles.identifyButtonText}>Identify Animal</Text>
          </TouchableOpacity>
        </View>
      )}
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
  cameraContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    maxHeight: 400,
  },
  viewfinder: {
    flex: 1,
    backgroundColor: Colors.gray900,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.lg,
  },
  viewfinderContent: {
    alignItems: 'center',
  },
  viewfinderIcon: {
    fontSize: 60,
    marginBottom: Spacing.md,
  },
  viewfinderText: {
    fontSize: Typography.fontSize.lg,
    color: Colors.gray300,
    textAlign: 'center',
  },
  capturingIndicator: {
    alignItems: 'center',
  },
  capturingText: {
    fontSize: 80,
    marginBottom: Spacing.md,
  },
  capturingLabel: {
    fontSize: Typography.fontSize.lg,
    color: Colors.gray300,
    fontWeight: Typography.fontWeight.semibold,
  },
  lastPhotoIndicator: {
    marginTop: Spacing.md,
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  lastPhotoText: {
    color: Colors.onPrimary,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  galleryButton: {
    alignItems: 'center',
    padding: Spacing.md,
  },
  switchButton: {
    alignItems: 'center',
    padding: Spacing.md,
  },
  controlButtonIcon: {
    fontSize: Typography.fontSize['2xl'],
    marginBottom: Spacing.xs,
  },
  controlButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.onSurfaceVariant,
    fontWeight: Typography.fontWeight.medium,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.primary,
    ...Shadows.lg,
  },
  captureButtonActive: {
    backgroundColor: Colors.primary,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
  },
  locationContainer: {
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
  tipsContainer: {
    margin: Spacing.lg,
    marginTop: 0,
  },
  tipsTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.onBackground,
    marginBottom: Spacing.md,
  },
  tipsGrid: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  tipIcon: {
    fontSize: Typography.fontSize.lg,
    marginRight: Spacing.md,
    width: 30,
    textAlign: 'center',
  },
  tipContent: {
    flex: 1,
  },
  tipTitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.onSurface,
  },
  tipDescription: {
    fontSize: Typography.fontSize.xs,
    color: Colors.onSurfaceVariant,
    marginTop: Spacing.xs,
  },
  actionButtons: {
    padding: Spacing.lg,
  },
  identifyButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.md,
  },
  identifyButtonText: {
    color: Colors.onPrimary,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
  },
});

export default CameraScreen;
