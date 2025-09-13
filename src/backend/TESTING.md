# 🧪 AniDex API Testing Guide

Quick guide for testing the Pokemon Go for Animals API with seed data.

## 🚀 Quick Start

```bash
# Navigate to backend
cd src/backend

# Seed test data
make seed

# Start API server
make run
```

## 📊 Seed Data Overview

- **16 Animal Species** (Common → Legendary)
- **14 Global Locations** (Serengeti, Yellowstone, Central Park, etc.)
- **27 Achievement Badges** (Species, location, streak, conservation)
- **4 Test Users** with sample catches and badges
- **15 Sample Animal Catches** with social interactions

## 🔧 Seed Commands

```bash
make seed          # Populate database with test data
make seed-stats    # View current data statistics
make seed-clear    # Clear all seed data
```

## 🌐 API Testing

### Species Endpoints
```bash
# Get all species
curl http://localhost:8080/api/species

# Get legendary animals
curl http://localhost:8080/api/species/rarity/legendary

# Get birds only
curl http://localhost:8080/api/species/category/bird

# Search species
curl -X POST http://localhost:8080/api/species/search \
  -H "Content-Type: application/json" \
  -d '{"query": "leopard"}'
```

### Location Endpoints
```bash
# Get nearby locations (Central Park, NYC)
curl "http://localhost:8080/api/locations/nearby?lat=40.7829&lng=-73.9654&radius=50"

# Get popular hotspots
curl http://localhost:8080/api/locations/hotspots

# Get location details
curl http://localhost:8080/api/locations/{location_id}
```

### Badge & Achievement Endpoints
```bash
# Get all badges
curl http://localhost:8080/api/badges

# Get user badges (requires auth)
curl -H "Authorization: Bearer {jwt_token}" \
  http://localhost:8080/api/users/{user_id}/badges

# Get user statistics
curl http://localhost:8080/api/users/{user_id}/stats
```

### Animal Catch Endpoints
```bash
# Create new catch (requires auth)
curl -X POST http://localhost:8080/api/catches \
  -H "Authorization: Bearer {jwt_token}" \
  -H "Content-Type: application/json" \
  -d '{
    "species_id": "species-uuid-here",
    "latitude": 40.7829,
    "longitude": -73.9654,
    "photo_url": "https://example.com/photo.jpg",
    "notes": "Amazing wildlife sighting!",
    "is_public": true
  }'

# Get user's catches
curl -H "Authorization: Bearer {jwt_token}" \
  http://localhost:8080/api/catches

# Get catch details
curl http://localhost:8080/api/catches/{catch_id}
```

## 🎯 Test Scenarios

### Pokemon Go Experience
1. **Registration/Login** → Create user account
2. **Species Discovery** → Browse available animals by rarity
3. **Location Exploration** → Find nearby wildlife hotspots
4. **Animal Catching** → Take photo and create catch record
5. **Achievement Tracking** → Earn badges for different milestones
6. **Social Features** → Like/comment on other users' catches

### Sample Test Data
- **Legendary**: Snow Leopard (1900 pts), Giant Panda (1800 pts)
- **Epic**: African Elephant (450 pts), Bald Eagle (360 pts)
- **Rare**: Red Fox (160 pts), Green Sea Turtle (180 pts)
- **Common**: Gray Squirrel (15 pts), Rock Pigeon (8 pts)

### Test Locations
- **Serengeti, Tanzania** (-2.154, 34.686) - Safari wildlife
- **Central Park, NYC** (40.783, -73.965) - Urban animals
- **Yellowstone, USA** (44.428, -110.589) - Wilderness experience
- **Amazon, Brazil** (-3.465, -62.216) - Rainforest biodiversity

## 🔍 Debugging

### Check Seed Status
```bash
make seed-stats
```

### View API Documentation
```bash
# Start server and visit:
http://localhost:8080/swagger/index.html
```

### Reset Test Data
```bash
make seed-clear && make seed
```

## 🏆 Expected Results

After seeding, you should have:
- Species across all rarity levels for collection gameplay
- Global locations for exploration features
- Complete badge system for gamification
- Sample users with realistic catch data
- Social interactions (likes, comments, verification)

Perfect for testing the full Pokemon Go for Animals experience! 🦁📸
