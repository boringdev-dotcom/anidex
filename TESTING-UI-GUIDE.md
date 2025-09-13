# 🖼️ AniDex Testing UI Guide

Beautiful Pokemon-style interface for testing all AniDex API endpoints!

## 🌟 Overview

The AniDex Testing UI is a standalone HTML file that provides a stunning visual interface for testing your animal kingdom API. It displays animals as Pokemon-style cards with full stats, images, and detailed information.

## 🚀 Quick Start

### 1. Start Backend
```bash
cd src/backend
go run cmd/api/main.go
```

### 2. Seed Database
```bash
go run cmd/seeder/main.go -seed
```

### 3. Open Testing UI
```bash
# Double-click the file or:
open testing-ui.html
```

**That's it!** 🎉 The Testing UI is ready to use.

## 🎮 Features

### 🐾 Species Tab
- **Browse Animals**: View all species with filtering
- **Search**: Find animals by name (common or scientific)
- **Filters**: Category (mammal, bird, etc.) and rarity
- **Pagination**: Navigate through pages of animals

### 🖼️ Gallery Tab ⭐ **MAIN FEATURE**
- **Pokemon-Style Cards**: Beautiful animal cards with images
- **Click to Expand**: Full-screen modal with complete stats
- **Filtering**: Filter by category, rarity, pagination
- **High-Quality Images**: Professional wildlife photography
- **Stats Display**: Points, difficulty, weight, lifespan
- **Conservation Info**: IUCN status and habitat details

### 📸 Catches Tab
- **Create Catches**: Submit new animal sightings
- **View Catches**: Browse submitted catches
- **Authentication**: Login required for some features

### 📍 Locations Tab
- **Nearby Locations**: Find animal hotspots near coordinates
- **Location Catches**: See what animals were caught at specific places
- **Auto-location**: Uses browser location if available

### 🔐 Auth Tab
- **User Registration**: Create new accounts
- **Login**: Authenticate users
- **Profile**: View user information

## 🎨 Using the Gallery (Pokemon Cards)

### Step 1: Load Gallery
1. Click **🖼️ Gallery** tab
2. Set your filters (optional):
   - **Category**: mammal, bird, reptile, etc.
   - **Rarity**: common, uncommon, rare, epic, legendary
   - **Images per Page**: 12, 24, 48, or 100
3. Click **"Load Gallery"**

### Step 2: Browse Pokemon-Style Cards
You'll see beautiful animal cards displaying:
- **High-quality animal photos**
- **Animal name & scientific name**
- **Category badge** (mammal, bird, etc.)
- **Rarity badge** (common → legendary)
- **Conservation status**
- **Stats**: Points, difficulty level, weight

### Step 3: View Full Card Details
Click any animal image to open the full Pokemon-style card:
- **Large image view**
- **Complete stats section**
- **Detailed information**:
  - Description
  - Habitat
  - Diet
  - Behavior
  - Geographic range
  - Wikipedia links

### Step 4: Navigate & Filter
- **Use pagination** to browse more animals
- **Apply filters** to find specific types
- **Search by name** for quick lookup

## 🔧 Configuration

### Backend URL
The Testing UI connects to `http://localhost:8080/api` by default.

To change this, edit the `API_BASE` variable in `testing-ui.html`:
```javascript
const API_BASE = 'http://your-backend-url:port/api';
```

### Authentication
Some endpoints require authentication:
1. Go to **🔐 Auth** tab
2. Register or login
3. The JWT token is automatically saved and used

Or manually set a token:
1. Get token from login response
2. Paste in the "Bearer Token" field in **Catches** tab

## 🎯 Testing Workflow

### 1. Test Species Endpoints
- **All Species**: Browse with filters and pagination
- **Search**: Find specific animals by name
- **Individual Species**: Get detailed animal information

### 2. Explore the Gallery
- **Visual browsing**: See Pokemon-style animal cards
- **Click interaction**: Full-screen detailed cards
- **Filtering**: Test different categories and rarities

### 3. Test Catches (Authentication Required)
- **Register/Login**: Create account or sign in
- **Create Catch**: Submit new animal sighting
- **View Catches**: Browse submitted catches

### 4. Test Locations
- **Nearby Search**: Find locations with animal activity
- **Location Details**: See catches at specific coordinates


## 🐛 Troubleshooting

### Gallery Not Loading
**Problem**: "Failed to load gallery"
```bash
# Check if backend is running
curl http://localhost:8080/health

# Check if database has data
cd src/backend
go run cmd/seeder/main.go -stats
```

### Images Not Showing
**Problem**: Animal cards show "Image not available"
```bash
# Re-seed with fresh images
go run cmd/seeder/main.go -clear
go run cmd/seeder/main.go -seed
```

### CORS Errors
**Problem**: "Access to fetch blocked by CORS policy"

The backend includes CORS middleware, but if you see errors:
1. Make sure backend is running on port 8080
2. Check browser console for specific CORS error
3. Verify `API_BASE` URL in `testing-ui.html`

### Authentication Issues
**Problem**: "User not authenticated" errors
1. Go to **🔐 Auth** tab
2. Register a new user
3. Login to get JWT token
4. Token is automatically saved for protected endpoints

### Modal Cut Off
**Problem**: Pokemon card modal is cut off

This was fixed in the latest version, but if you see issues:
1. Make sure you have the latest `testing-ui.html`
2. Try different screen sizes
3. Use browser zoom (Ctrl/Cmd + or -)

## 🎨 Customization

### Adding New Animals
1. Edit `src/backend/internal/seeds/species_seeds.go`
2. Add new species with image URLs
3. Re-seed database:
   ```bash
   go run cmd/seeder/main.go -clear
   go run cmd/seeder/main.go -seed
   ```

### Changing Images
Replace image URLs in species data with:
- High-quality wildlife photography
- Consistent resolution (recommended: 800px wide)
- HTTPS URLs for security

### Styling
The Testing UI uses modern CSS with:
- Pokemon Go-inspired color scheme
- Card-based layout
- Responsive design
- Smooth animations

## 📱 Mobile Support

The Testing UI works on mobile devices:
- **Responsive design** adapts to screen size
- **Touch-friendly** buttons and interactions
- **Mobile modal** optimized for small screens
- **Gesture support** for closing modals

## 🚀 Advanced Usage

### Bulk Testing
```javascript
// Test multiple endpoints in sequence
async function testAllEndpoints() {
    await loadGallery();           // Gallery tab
    await getAllSpecies();         // Species tab  
    await getNearbyLocations();    // Locations tab
}
```

### Custom Filters
Create bookmarks with pre-set filters:
- Mammals only: `testing-ui.html#mammals`
- Legendary animals: `testing-ui.html#legendary`
- Endangered species: `testing-ui.html#endangered`

### API Performance Testing
Use browser dev tools to:
- Monitor network requests
- Check response times
- Debug API issues
- Test different payload sizes

---

## 🎯 Next Steps

1. **Explore the Gallery** - See all Pokemon-style animal cards
2. **Test Authentication** - Register and login
3. **Submit Catches** - Create new animal sightings
4. **Check Locations** - Find animal hotspots
5. **Customize Data** - Add your own animals and images

Ready to explore the animal kingdom? 🦁🌍✨
