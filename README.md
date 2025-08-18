# Anidex - Mobile Application

A full-stack mobile application with React Native frontend and Go backend, featuring Firebase authentication, JWT tokens, and modern authentication patterns.

## Features

- **Firebase Authentication**: Email/password authentication with Firebase
- **JWT Integration**: Secure token-based API authentication
- **RESTful API**: Go backend with controller/service/repository pattern
- **Swagger Documentation**: Auto-generated API documentation
- **Cross-platform**: iOS and Android support with React Native
- **Docker Support**: Containerized backend deployment
- **Modern Auth Flow**: Firebase tokens verified server-side

## Tech Stack

### Backend
- **Go** (Golang 1.23+)
- **Gin** - Web framework
- **GORM** - ORM library
- **PostgreSQL** - Database
- **Firebase Admin SDK** - Authentication verification
- **JWT** - API authentication
- **Swagger** - API documentation
- **Docker** - Containerization

### Frontend
- **React Native** - Mobile framework
- **TypeScript** - Type safety
- **Firebase Auth** - Authentication service
- **React Navigation** - Navigation
- **Zustand** - State management
- **Axios** - HTTP client
- **React Native Vector Icons** - Icons

## Project Structure

```
anidex/
├── src/
│   ├── backend/
│   │   ├── cmd/api/          # Application entry point
│   │   ├── internal/
│   │   │   ├── config/       # Configuration
│   │   │   ├── controllers/  # HTTP handlers
│   │   │   ├── middleware/   # Middleware functions
│   │   │   ├── models/       # Data models
│   │   │   ├── repositories/ # Database layer
│   │   │   ├── services/     # Business logic
│   │   │   └── utils/        # Utility functions
│   │   ├── docs/             # Swagger documentation
│   │   ├── Dockerfile
│   │   └── Makefile
│   └── frontend/
│       ├── src/
│       │   ├── components/   # Reusable components
│       │   ├── screens/      # Screen components
│       │   ├── navigation/   # Navigation setup
│       │   ├── services/     # API services
│       │   ├── store/        # State management
│       │   ├── types/        # TypeScript types
│       │   ├── config/       # Firebase configuration
│       │   └── utils/        # Utility functions
│       ├── ios/              # iOS specific code
│       ├── android/          # Android specific code
│       └── firebase.json     # Firebase configuration
└── docker-compose.yml
```

## Prerequisites

- Go 1.23+
- Node.js 18+
- PostgreSQL 16+
- Docker & Docker Compose (optional)
- Firebase project with Authentication enabled
- React Native development environment:
  - For iOS: Xcode (Mac only)
  - For Android: Android Studio

## Setup Instructions

### 1. Firebase Setup (Required)

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project named "Anidex"
   - Enable Authentication → Sign-in method → Email/Password

2. **Get Firebase Configuration Files**
   
   **Backend Service Account:**
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save as `serviceAccountKey.json` in `/src/backend/`

   **Frontend Configuration:**
   - Add Android app (package: `com.anidex`)
   - Download `google-services.json` → place in `/src/frontend/android/app/`
   - Add iOS app (bundle ID: `com.anidex`)
   - Download `GoogleService-Info.plist` → place in `/src/frontend/ios/`

### 2. Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd anidex
   ```

2. **Set up environment variables**
   ```bash
   cd src/backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Configure Firebase**
   - Place your `serviceAccountKey.json` in the backend root directory
   - The `GOOGLE_APPLICATION_CREDENTIALS` environment variable is already set

4. **Install dependencies**
   ```bash
   make deps
   ```

5. **Start database**
   ```bash
   # From root directory
   cd ../..
   docker compose up -d postgres
   ```

6. **Run the backend**
   ```bash
   cd src/backend
   make run
   ```

   The API will be available at `http://localhost:8080`
   Swagger docs at `http://localhost:8080/swagger/index.html`

### 3. Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd src/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Ensure `google-services.json` is in `/android/app/`
   - Ensure `GoogleService-Info.plist` is in `/ios/`
   - Firebase configuration is already set up in `src/config/firebase.ts`

4. **iOS Setup (Mac only)**
   ```bash
   npx pod-install
   ```

5. **Run the application**
   
   **iOS:**
   ```bash
   npm run ios
   ```
   
   **Android:**
   ```bash
   npm run android
   ```

## Docker Deployment

1. **Build and run with Docker Compose** (from root directory)
   ```bash
   docker-compose up -d
   ```

   This will start:
   - PostgreSQL database on port 5432
   - Go backend on port 8080

2. **Stop services**
   ```bash
   docker-compose down
   ```

## API Endpoints

### Authentication

- `POST /api/auth/firebase` - Authenticate with Firebase ID token
- `POST /api/auth/register` - Register new user (legacy)
- `POST /api/auth/login` - Login with email/password (legacy)
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get user profile (protected)
- `GET /api/auth/google` - Initiate Google OAuth (legacy)
- `GET /api/auth/google/callback` - Google OAuth callback (legacy)
- `GET /api/auth/facebook` - Initiate Facebook OAuth (legacy)
- `GET /api/auth/facebook/callback` - Facebook OAuth callback (legacy)

## Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgres://anidex:anidex_password@localhost:5432/anidex?sslmode=disable
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=8080
GIN_MODE=debug

# Firebase Configuration
GOOGLE_APPLICATION_CREDENTIALS=serviceAccountKey.json

# OAuth (Legacy - Optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URL=http://localhost:8080/api/auth/google/callback

FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
FACEBOOK_REDIRECT_URL=http://localhost:8080/api/auth/facebook/callback

FRONTEND_URL=http://localhost:3000
```

## Authentication Flow

### Firebase Authentication

1. **User Registration/Login**: Users authenticate through Firebase on the frontend
2. **Token Generation**: Firebase provides an ID token
3. **Backend Verification**: Backend verifies the Firebase ID token using Firebase Admin SDK
4. **JWT Creation**: Backend creates its own JWT for API access
5. **API Access**: Frontend uses the JWT for subsequent API calls

### API Request Example

```bash
# Authenticate with Firebase
curl -X POST http://localhost:8080/api/auth/firebase \
  -H "Content-Type: application/json" \
  -d '{"idToken": "FIREBASE_ID_TOKEN", "name": "User Name"}'
```

## Testing

### Backend Tests
```bash
cd src/backend
go test -v ./...
```

### Frontend Tests
```bash
cd src/frontend
npm test
```

## Production Deployment

### Backend

1. Build the binary:
   ```bash
   cd src/backend
   go build -o bin/api cmd/api/main.go
   ```

2. Set production environment variables
3. Run migrations
4. Start the server

### Frontend

1. Build for production:
   
   **iOS:**
   - Open `ios/AnidexFrontend.xcworkspace` in Xcode
   - Product > Archive
   - Upload to App Store Connect
   
   **Android:**
   ```bash
   cd src/frontend/android
   ./gradlew assembleRelease
   ```
   The APK will be in `android/app/build/outputs/apk/release/`

## Security Considerations

- **Firebase Security**: Authentication is handled by Firebase with industry-standard security
- **Token Verification**: Firebase ID tokens are verified server-side using Firebase Admin SDK
- **JWT Security**: Change JWT_SECRET in production to a long, random string
- **HTTPS**: Use HTTPS in production for all communications
- **CORS**: Configure CORS properly for your frontend domain
- **Rate Limiting**: Implement rate limiting for API endpoints
- **Input Validation**: All inputs are validated on both client and server
- **Service Account**: Protect Firebase service account key file
- **Environment Variables**: Keep all secrets in environment variables, never in code

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License

## Support

For issues and questions, please create an issue in the GitHub repository.