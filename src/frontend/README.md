# Anidex Frontend

React Native frontend for the Anidex application with Firebase authentication.

## Setup Instructions

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Firebase Configuration**
   🚨 **REQUIRED:** You must add Firebase configuration files (these are not committed to git for security):
   
   - Download `google-services.json` from Firebase Console → Project Settings → General → Your apps (Android)
   - Place it at: `android/app/google-services.json`
   
   - Download `GoogleService-Info.plist` from Firebase Console → Project Settings → General → Your apps (iOS)  
   - Place it at: `ios/GoogleService-Info.plist`
   
   These files contain your Firebase project configuration and are required for authentication to work.

3. **iOS Setup (Mac only)**
   ```bash
   npx pod-install
   ```

4. **Run the Application**
   
   **iOS:**
   ```bash
   npm run ios
   ```
   
   **Android:**
   ```bash
   npm run android
   ```

## Features

- ✅ Email/Password Authentication with Firebase
- ✅ Login Screen
- ✅ Sign Up Screen  
- ✅ Password Reset Functionality
- ✅ Coming Soon Screen after authentication
- ✅ State management with Zustand
- ✅ TypeScript support
- ✅ React Navigation

## Project Structure

```
src/
├── config/          # Firebase configuration
├── navigation/      # Navigation setup
├── screens/         # Screen components
├── store/          # State management (Zustand)
└── types/          # TypeScript type definitions
```

## Authentication Flow

1. **Login/Sign Up** → Firebase handles authentication
2. **Success** → Shows personalized "Coming Soon" screen
3. **Password Reset** → Email-based password reset
4. **Sign Out** → Returns to login screen

The app is ready to run with complete authentication functionality!