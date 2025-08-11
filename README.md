# Anidex - Mobile Application

A full-stack mobile application with React Native frontend and Go backend, featuring user authentication with JWT tokens and social login integration.

## Features

- **User Authentication**: JWT-based authentication system
- **Social Login**: Google and Facebook OAuth integration
- **RESTful API**: Go backend with controller/service/repository pattern
- **Swagger Documentation**: Auto-generated API documentation
- **Cross-platform**: iOS and Android support with React Native
- **Docker Support**: Containerized backend deployment

## Tech Stack

### Backend
- **Go** (Golang 1.21+)
- **Gin** - Web framework
- **GORM** - ORM library
- **PostgreSQL** - Database
- **JWT** - Authentication
- **Swagger** - API documentation
- **Docker** - Containerization

### Frontend
- **React Native** - Mobile framework
- **TypeScript** - Type safety
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
│       │   └── utils/        # Utility functions
│       ├── ios/              # iOS specific code
│       └── android/          # Android specific code
└── docker-compose.yml
```

## Prerequisites

- Go 1.21+
- Node.js 18+
- PostgreSQL 16+
- Docker & Docker Compose (optional)
- React Native development environment:
  - For iOS: Xcode (Mac only)
  - For Android: Android Studio

## Setup Instructions

### Backend Setup

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

3. **Configure OAuth providers**
   
   **Google OAuth:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add redirect URI: `http://localhost:8080/api/auth/google/callback`
   - Copy Client ID and Secret to `.env`

   **Facebook OAuth:**
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Create a new app
   - Add Facebook Login product
   - Configure OAuth redirect URI: `http://localhost:8080/api/auth/facebook/callback`
   - Copy App ID and Secret to `.env`

4. **Install dependencies**
   ```bash
   go mod download
   ```

5. **Run database migrations**
   ```bash
   # Start PostgreSQL (if using Docker from root directory)
   cd ../..
   docker-compose up -d postgres
   
   # Run the application (auto-migrates)
   cd src/backend
   go run cmd/api/main.go
   ```

6. **Generate Swagger documentation**
   ```bash
   make swagger
   ```

7. **Run the backend**
   ```bash
   make run
   # Or with Docker from root directory
   cd ../..
   docker-compose up backend
   ```

   The API will be available at `http://localhost:8080`
   Swagger docs at `http://localhost:8080/swagger/index.html`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd src/frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure OAuth**
   
   Edit `src/App.tsx` and add your OAuth credentials:
   ```typescript
   GoogleSignin.configure({
     webClientId: 'YOUR_GOOGLE_WEB_CLIENT_ID',
     iosClientId: 'YOUR_IOS_CLIENT_ID',
   });
   ```

4. **iOS Setup (Mac only)**
   ```bash
   cd ios
   pod install
   cd ..
   ```

5. **Update API URL**
   
   Edit `src/services/api.ts` and update the API_URL:
   ```typescript
   const API_URL = 'http://YOUR_BACKEND_URL:8080';
   ```

6. **Run the application**
   
   **iOS:**
   ```bash
   npm run ios
   # or
   yarn ios
   ```
   
   **Android:**
   ```bash
   npm run android
   # or
   yarn android
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

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/profile` - Get user profile (protected)
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/facebook` - Initiate Facebook OAuth
- `GET /api/auth/facebook/callback` - Facebook OAuth callback

## Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgres://user:password@localhost:5432/anidex?sslmode=disable
JWT_SECRET=your-secret-key
PORT=8080
GIN_MODE=debug

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URL=http://localhost:8080/api/auth/google/callback

FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
FACEBOOK_REDIRECT_URL=http://localhost:8080/api/auth/facebook/callback

FRONTEND_URL=http://localhost:3000
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

- Change JWT_SECRET in production
- Use HTTPS in production
- Configure CORS properly
- Implement rate limiting
- Add input validation
- Use secure password requirements
- Implement account lockout policies
- Add 2FA support (future enhancement)

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