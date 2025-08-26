import auth from '@react-native-firebase/auth';
import app from '@react-native-firebase/app';

// Firebase is automatically initialized by the native SDKs
// using google-services.json (Android) and GoogleService-Info.plist (iOS)
// The @react-native-firebase modules handle initialization automatically

// Export auth as a function (as expected by the rest of the app)
export { auth };

// Export the default app instance for reference if needed
export const firebaseApp = app;

export const firebaseConfig = {
  // Firebase configuration is handled by the native SDKs
  // Configuration files should be placed in:
  // - android/app/google-services.json
  // - ios/GoogleService-Info.plist
};