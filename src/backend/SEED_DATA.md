# 🌱 AniDex Seed Data

This document describes the comprehensive seed data available for testing the AniDex Pokemon Go for Animals application.

## 📊 Overview

The seed data provides a realistic dataset for testing all features of the application including:

- **16 Animal Species** across all rarity levels and categories
- **14 Famous Wildlife Locations** from around the world  
- **4 Popular Hotspots** for animal spotting
- **27 Achievement Badges** covering all game mechanics
- **4 Sample Users** with realistic profiles
- **15+ Sample Animal Catches** with varied conditions
- **User Statistics** and earned badges

## 🐾 Species Data

### By Rarity Level
- **Legendary (3 species)**: Snow Leopard, Giant Panda, Siberian Tiger
- **Epic (3 species)**: African Elephant, Bald Eagle, Mountain Gorilla  
- **Rare (3 species)**: Red Fox, Great Horned Owl, Green Sea Turtle
- **Uncommon (3 species)**: White-tailed Deer, Northern Cardinal, Monarch Butterfly
- **Common (4 species)**: Gray Squirrel, American Robin, Domestic Cat, Rock Pigeon

### By Category
- **Mammals (9)**: Snow Leopard, Giant Panda, Siberian Tiger, African Elephant, Mountain Gorilla, Red Fox, White-tailed Deer, Gray Squirrel, Domestic Cat
- **Birds (5)**: Bald Eagle, Great Horned Owl, Northern Cardinal, American Robin, Rock Pigeon
- **Reptiles (1)**: Green Sea Turtle
- **Insects (1)**: Monarch Butterfly

### Features
- Complete biological data (weight, length, lifespan)
- Conservation status (IUCN Red List)
- Habitat and behavioral information
- Geographic range data
- Game mechanics (points, difficulty, rarity multipliers)

## 📍 Location Data

### Geographic Distribution
- **Africa**: Serengeti (Tanzania), Kruger (South Africa), David Sheldrick Trust (Kenya)
- **North America**: Yellowstone (USA), Denali (USA), Central Park (USA), Hanauma Bay (Hawaii)
- **Asia**: Sagarmatha (Nepal), Nagarhole (India)
- **South America**: Amazon Rainforest (Brazil)
- **Europe**: Swiss National Park (Switzerland), Hyde Park (UK)
- **Oceania**: Uluru-Kata Tjuta (Australia)

### Location Types
- **Wilderness**: National parks and protected areas
- **Urban**: City parks and urban wildlife areas
- **Mountains**: High-altitude wildlife locations
- **Ocean**: Marine wildlife viewing areas
- **Zoos**: Captive wildlife locations
- **Sanctuaries**: Wildlife rehabilitation centers

### Features
- Precise GPS coordinates
- Complete address information
- Ecosystem and climate data
- Safety ratings and accessibility info
- Visitor statistics and permit requirements

## 🏅 Badge System

### Badge Categories
- **Species Badges (7)**: First Catch, Big Cat Hunter, Bird Watcher, Marine Biologist, Century Club
- **Rarity Badges (3)**: Legendary Hunter, Epic Explorer, Rare Collector  
- **Location Badges (4)**: Globe Trotter, Urban Wildlife Expert, Safari Master, Mountain Climber
- **Streak Badges (3)**: Daily Dedication, Monthly Master, Eternal Explorer
- **Time Badges (2)**: Night Owl, Early Bird
- **Conservation Badges (2)**: Conservation Hero, Habitat Guardian
- **Social Badges (3)**: Community Leader, Photo Artist, Mentor
- **Special Badges (5)**: Weather Warrior, Seasonal Specialist, The Completionist, Lucky Shot, Midnight Photographer

### Badge Rarities
- **Bronze (2)**: First Catch, Daily Dedication
- **Silver (9)**: Big Cat Hunter, Rare Collector, Urban Wildlife Expert, etc.
- **Gold (9)**: Bird Watcher, Epic Explorer, Globe Trotter, etc.
- **Platinum (4)**: Century Club, Conservation Hero, Midnight Photographer
- **Diamond (3)**: Legendary Hunter, Eternal Explorer, The Completionist

## 👥 Sample Users

### Test Accounts
1. **Jane Explorer** (jane_wildlife@example.com)
   - Active wildlife photographer
   - Multiple catches across different categories
   - Several earned badges

2. **Mike Photographer** (mike_photo@example.com)  
   - Professional nature photographer
   - High-quality animal photographs
   - Social media engagement

3. **Sarah Green** (sarah_conservation@example.com)
   - Conservation enthusiast
   - Focus on endangered species
   - Educational content creator

4. **David Naturalist** (david_nature@example.com)
   - Scientific researcher
   - Detailed species documentation
   - Verification expert

### Sample Data Includes
- Realistic user profiles with avatars
- Animal catches with photos and notes
- Badge progressions and achievements
- User statistics and rankings
- Social interactions (likes, comments)

## 🚀 Usage Instructions

### Running the Seeder

```bash
# Navigate to backend directory
cd src/backend

# Seed all data
make seed

# View seeding statistics  
make seed-stats

# Clear all seed data
make seed-clear
```

### Manual Commands

```bash
# Seed database
go run cmd/seeder/main.go -seed

# Show statistics
go run cmd/seeder/main.go -stats

# Clear data
go run cmd/seeder/main.go -clear
```

### API Testing

Once seeded, you can test APIs with realistic data:

```bash
# Get all species
curl http://localhost:8080/api/species

# Get popular species
curl http://localhost:8080/api/species/popular

# Get nearby locations (example coordinates)
curl "http://localhost:8080/api/locations/nearby?lat=40.7829&lng=-73.9654"

# Get all badges
curl http://localhost:8080/api/badges
```

## 🎯 Game Mechanics Testing

### Point System Testing
- **Common animals**: 5-15 points
- **Uncommon animals**: 30-40 points (1.5x multiplier)
- **Rare animals**: 70-90 points (2x multiplier)  
- **Epic animals**: 120-160 points (3x multiplier)
- **Legendary animals**: 180-220 points (5x multiplier)

### Badge Progression Testing
- First catch automatically awards "First Catch" badge
- Multiple catches of same category progress toward category badges
- Streak badges require consecutive daily catches
- Location badges track geographic diversity
- Social badges track community engagement

### Conservation Awareness
- Endangered species carry conservation bonus points
- Conservation badges promote wildlife protection
- Educational content linked to species information
- Partnership opportunities with wildlife organizations

## 🔄 Updating Seed Data

### Adding New Species
1. Edit `internal/seeds/species_seeds.go`
2. Add new species with complete biological data
3. Assign appropriate rarity and points
4. Include conservation status

### Adding New Locations  
1. Edit `internal/seeds/location_seeds.go`
2. Include precise GPS coordinates
3. Add complete address and habitat information
4. Set safety and accessibility ratings

### Adding New Badges
1. Edit `internal/seeds/badge_seeds.go`  
2. Define clear achievement criteria
3. Set appropriate point rewards
4. Choose suitable rarity level

### Re-seeding
```bash
# Clear existing data and re-seed
make seed-clear && make seed
```

## 📈 Statistics

Current seed data provides:
- **16 animal species** for collection gameplay
- **14 global locations** for exploration  
- **27 achievement badges** for gamification
- **4 test users** with varied profiles
- **15+ sample catches** for social features
- **Complete game mechanics** testing coverage

This comprehensive dataset enables full testing of the Pokemon Go for Animals experience!
