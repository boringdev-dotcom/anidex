# Anidex Frontend

A React Native mobile app built with Expo, featuring Firebase authentication with Google Sign-In.

## Setup

### Prerequisites

- Node.js and npm installed
- CocoaPods installed (for iOS: `sudo gem install cocoapods`)
- Xcode (for iOS development)
- Android Studio (for Android development)
- Firebase project set up with Google Sign-In enabled

### Installation

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Set up Firebase:**
   - Create a Firebase project at https://console.firebase.google.com
   - Enable Google Sign-In in Authentication > Sign-in method
   - Download configuration files:
     - iOS: `GoogleService-Info.plist` → Place in `frontend/` directory
     - Android: `google-services.json` → Place in `frontend/` directory

3. **Configure Google Sign-In:**
   - Get your Web Client ID from Firebase Console > Project Settings
   - Open `contexts/AuthContext.tsx`
   - Replace the placeholder `webClientId` (line 17) with your actual Web Client ID

4. **Generate native projects:**
   ```bash
   npx expo prebuild
   ```
   This creates the `ios/` and `android/` directories.

5. **Install iOS dependencies:**
   ```bash
   cd ios
   pod install
   cd ..
   ```

### Running the App

**iOS:**
```bash
npx expo run:ios
```

**Android:**
```bash
npx expo run:android
```

**Development server only:**
```bash
npm start
```

**Important:** Firebase authentication requires native builds and won't work with Expo Go app.

## Project Structure

```
frontend/
├── app/                    # App screens (expo-router)
│   ├── (tabs)/            # Tab-based navigation
│   │   ├── _layout.tsx    # Tabs layout
│   │   └── index.tsx      # Home screen
│   ├── _layout.tsx        # Root layout with auth logic
│   ├── login.tsx          # Login screen
│   └── +not-found.tsx     # 404 screen
├── components/            # Reusable components
│   ├── ThemedView.tsx
│   └── ThemedText.tsx
├── contexts/              # React contexts
│   └── AuthContext.tsx    # Firebase authentication
├── hooks/                 # Custom hooks
│   ├── useColorScheme.ts
│   └── useThemeColor.ts
├── constants/             # App constants
│   └── Colors.ts          # Theme colors
└── assets/                # Images, fonts, etc.
```

## Features

- ✅ Google Sign-In authentication
- ✅ Firebase integration
- ✅ Expo Router for navigation
- ✅ Dark/Light theme support
- ✅ TypeScript support
- ✅ Cross-platform (iOS, Android, Web)

## Getting Your Firebase Web Client ID

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click **Authentication** → **Sign-in method** → Click on **Google**
4. Find the **Web SDK configuration** section
5. Copy the **Web client ID** (format: `xxxxx.apps.googleusercontent.com`)
6. Paste it in `contexts/AuthContext.tsx` at line 17

## Troubleshooting

**iOS build errors with Firebase:**
- Make sure you've run `pod install` in the `ios/` directory
- The Podfile is configured to use static frameworks for Firebase compatibility
- Clean build: `cd ios && rm -rf Pods Podfile.lock && pod install`

**Android build errors:**
- Ensure `google-services.json` is in the root `frontend/` directory
- Check that the package name in Firebase matches `com.anidex.app`

**Firebase config files not found:**
- Files should be in the root `frontend/` directory (NOT in `ios/` or `android/`)
- After adding them, run `npx expo prebuild --clean` to regenerate native projects

## Customization

- **App name/bundle ID:** Edit `app.config.js`
- **Theme colors:** Edit `constants/Colors.ts`
- **App icons:** Replace images in `assets/images/`
- **EAS Build:** Update `projectId` in `app.config.js` if using Expo Application Services
