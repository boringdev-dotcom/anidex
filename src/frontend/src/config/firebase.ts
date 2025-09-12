import { Platform } from 'react-native';

let auth: any;
let firebaseApp: any;
let firebaseConfig: any;

if (Platform.OS === 'web') {
  // Use web Firebase SDK
  const { auth: webAuth, default: webApp, firebaseConfig: webConfig } = require('./firebase.web');
  auth = webAuth;
  firebaseApp = webApp;
  firebaseConfig = webConfig;
} else {
  // Use React Native Firebase SDK for mobile
  const rnAuth = require('@react-native-firebase/auth').default;
  const rnApp = require('@react-native-firebase/app').default;
  
  auth = rnAuth;
  firebaseApp = rnApp;
  firebaseConfig = {
    // Firebase configuration is handled by the native SDKs
    // Configuration files should be placed in:
    // - android/app/google-services.json
    // - ios/GoogleService-Info.plist
  };
}

export { auth, firebaseApp, firebaseConfig };