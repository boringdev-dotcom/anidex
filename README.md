# 🦁 AniDex

A cross-platform wildlife photography and collection app that gamifies animal spotting and conservation awareness. Catch, collect, and explore the animal kingdom while contributing to wildlife conservation efforts!

## 🌟 Project Vision

**"Gotta Catch 'Em All... But For Real Animals!"**

AniDex transforms wildlife observation into an engaging, Pokemon Go-style experience where users photograph real animals in their natural habitats. The app combines social networking, gamification, and conservation education to create a global community of wildlife enthusiasts.

## 🎮 Core Features

### 🐾 Animal Collection System
- **Species Database**: 1000+ animal species with detailed information
- **Photo Verification**: AI-powered and community-driven photo verification
- **Rarity System**: Common → Uncommon → Rare → Epic → Legendary animals
- **Collection Cards**: Pokemon-style cards with stats and conservation info

### 📍 Location-Based Discovery
- **GPS Tracking**: Real-time location-based animal encounters
- **Interactive Maps**: Friend's catches appear as map balloons
- **Hotspots**: Popular animal spotting locations
- **Geographic Challenges**: Country/region-specific collection goals

### 🏆 Gamification & Achievements
- **Badge System**: 50+ achievement badges (Top 5 Big Cats, Night Owl, etc.)
- **Streaks**: Daily/weekly catch streaks with bonuses
- **Leaderboards**: Global, country, and local rankings
- **Points System**: Rarity-based scoring with conservation multipliers

### 👥 Social Features
- **Follow System**: Connect with fellow wildlife enthusiasts
- **Activity Feed**: See friends' latest animal catches
- **Photo Sharing**: Share and comment on animal photographs
- **Conservation Groups**: Join wildlife protection communities

### 🔬 Educational Content
- **Species Information**: Detailed animal facts and conservation status
- **Habitat Learning**: Ecosystem and environmental education
- **Conservation Awareness**: IUCN Red List integration
- **Wildlife Protection**: Partner with conservation organizations

## 🛠️ Tech Stack

### Backend (Go)
- **Framework**: Gin HTTP Framework
- **Database**: PostgreSQL 16+ with GORM ORM
- **Authentication**: Firebase Auth + JWT tokens
- **Storage**: Firebase Storage for image uploads
- **Documentation**: Swagger/OpenAPI
- **Deployment**: Docker containerization

### Frontend (React Native)
- **Platform**: iOS, Android, and Web support
- **Framework**: React Native + React Native Web
- **Language**: TypeScript for type safety
- **State Management**: Zustand
- **Navigation**: React Navigation 6
- **Maps**: React Native Maps with custom markers
- **Camera**: React Native Camera for animal photography

### Infrastructure
- **Cloud Storage**: Firebase Storage for images
- **Authentication**: Firebase Authentication
- **Database**: PostgreSQL with spatial extensions
- **Image Processing**: AI-powered animal recognition
- **Maps Integration**: Google Maps Platform

## 📱 Platform Support

| Platform | Status | Features |
|----------|--------|----------|
| 📱 **iOS** | ✅ Ready | Camera, GPS, Push notifications |
| 🤖 **Android** | ✅ Ready | Camera, GPS, Push notifications |
| 🌐 **Web** | ✅ Ready | Photo upload, social features |

## 🚀 Getting Started

### Prerequisites
- Go 1.23+
- Node.js 18+
- PostgreSQL 16+
- Firebase project
- React Native development environment

### 1. Clone Repository
```bash
git clone https://github.com/your-username/anidex.git
cd anidex
```

### 2. Firebase Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create project "AniDex"
   - Enable Authentication (Email/Password)
   - Enable Storage for image uploads

2. **Download Config Files**
   - Service Account Key → `src/backend/serviceAccountKey.json`
   - Android Config → `src/frontend/android/app/google-services.json`
   - iOS Config → `src/frontend/ios/GoogleService-Info.plist`

### 3. Backend Setup
```bash
cd src/backend

# Install dependencies
go mod download

# Setup environment
cp .env.example .env
# Edit .env with your database and Firebase configuration

# Start database
docker-compose up -d postgres

# Run migrations
go run cmd/api/main.go
```

### 4. Frontend Setup
```bash
cd src/frontend

# Install dependencies
npm install

# iOS setup (Mac only)
npx pod-install

# Run the app
npm run ios     # iOS
npm run android # Android
npm run web     # Web browser
```

## 📚 API Documentation

### Animal & Species Endpoints
```
GET    /api/species                 # List all species
GET    /api/species/{id}            # Get species details
GET    /api/species/category/{cat}  # Filter by category
GET    /api/species/rarity/{rarity} # Filter by rarity
POST   /api/species/search          # Search species
```

### Animal Catches
```
POST   /api/catches                 # Create new catch
GET    /api/catches                 # List user's catches
GET    /api/catches/{id}            # Get catch details
PUT    /api/catches/{id}            # Update catch
DELETE /api/catches/{id}            # Delete catch
POST   /api/catches/{id}/verify     # Verify catch (moderator)
```

### Social Features
```
POST   /api/users/{id}/follow       # Follow user
DELETE /api/users/{id}/follow       # Unfollow user
GET    /api/users/{id}/followers    # Get followers
GET    /api/users/{id}/following    # Get following
GET    /api/feed                    # Activity feed
```

### Maps & Locations
```
GET    /api/locations/nearby        # Find nearby locations
GET    /api/locations/hotspots      # Popular locations
GET    /api/catches/map             # Map markers for catches
```

### Badges & Achievements
```
GET    /api/badges                  # List all badges
GET    /api/users/{id}/badges       # User's badges
GET    /api/leaderboard             # Global leaderboard
GET    /api/users/{id}/stats        # User statistics
```

## 🎯 Game Mechanics

### Point System
- **Base Points**: Determined by species rarity
- **Rarity Multipliers**: 
  - Common: 1x
  - Uncommon: 1.5x
  - Rare: 2x
  - Epic: 3x
  - Legendary: 5x
- **Difficulty Bonus**: +10% per difficulty level
- **Conservation Bonus**: +50% for endangered species

### Badge Categories
- **Species Collector**: "Big Cat Hunter", "Bird Watcher", "Marine Biologist"
- **Explorer**: "Globe Trotter", "Urban Wildlife", "Safari Master"
- **Conservationist**: "Endangered Protector", "Habitat Guardian"
- **Social**: "Community Leader", "Photo Artist", "Mentor"
- **Achievement**: "First Catch", "Century Club", "Legendary Hunter"

### Level System
- **Level Calculation**: `floor(sqrt(total_points / 100)) + 1`
- **Level 1**: 0-99 points
- **Level 2**: 100-399 points
- **Level 10**: 8,100+ points

## 🌍 Conservation Impact

### Educational Features
- **IUCN Red List Integration**: Real conservation status
- **Habitat Information**: Ecosystem education
- **Threat Awareness**: Climate change and human impact
- **Conservation Tips**: How users can help protect wildlife

### Partnership Opportunities
- **Wildlife Organizations**: WWF, National Geographic, local zoos
- **Research Institutions**: Citizen science data collection
- **Conservation Groups**: Species monitoring and protection
- **Educational Programs**: School and university partnerships

## 🔧 Development Roadmap

### Phase 1: Core Features ✅
- [x] Database models and relationships
- [x] User authentication and profiles
- [x] Basic animal catch functionality
- [x] Location tracking and mapping

### Phase 2: Social & Gamification 🚧
- [ ] Following/followers system
- [ ] Activity feed and photo sharing
- [ ] Badge system implementation
- [ ] Leaderboards and rankings

### Phase 3: Advanced Features 📋
- [ ] AI-powered animal recognition
- [ ] Advanced map features with filters
- [ ] Push notifications for nearby animals
- [ ] Offline mode for remote locations

### Phase 4: Community & Conservation 📋
- [ ] Conservation organization partnerships
- [ ] Citizen science data integration
- [ ] Educational content expansion
- [ ] Community challenges and events

## 🤝 Contributing

We welcome contributions from wildlife enthusiasts, developers, and conservationists!

### How to Contribute
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Areas of Interest
- **Wildlife Data**: Species information and conservation status
- **Photography**: Animal photo verification algorithms
- **Conservation**: Educational content and partnerships
- **Mobile Development**: iOS/Android feature improvements
- **Backend**: API optimization and scalability

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Wildlife Organizations**: For conservation data and partnership
- **Open Source Community**: For the amazing tools and libraries
- **Pokemon Go**: For the inspiration and game mechanics
- **iNaturalist**: For citizen science inspiration
- **eBird**: For wildlife data collection concepts

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-username/anidex/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/anidex/discussions)
- **Email**: support@anidex.app

---

**🌿 "Together, we can explore, protect, and celebrate the incredible diversity of our planet's wildlife!"** 🌿
