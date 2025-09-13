# 🧪 Testing the New API Endpoints

Testing guide for the 6 basic API endpoints we just created in Phase 1.2.

## 🚀 Setup & Start Server

```bash
# Navigate to backend
cd /Users/swat/Documents/Github\ Projects/anidex/src/backend

# Seed test data (if not already done)
make seed

# Start the API server
make run
```

The server will start on `http://localhost:8080`

## 📋 Test Authentication First

Before testing protected endpoints, you'll need a JWT token:

### Register a Test User
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### Login to Get JWT Token
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Save the JWT token from the response - you'll need it for protected endpoints!**

## 🦁 Testing the 6 New Endpoints

### 1. Species Endpoints (3 endpoints)

#### GET All Species
```bash
curl "http://localhost:8080/api/species"
```

#### GET All Species with Filtering
```bash
# Filter by category (mammal, bird, reptile, etc.)
curl "http://localhost:8080/api/species?category=mammal"

# Filter by rarity (common, uncommon, rare, epic, legendary)
curl "http://localhost:8080/api/species?rarity=legendary"

# Pagination
curl "http://localhost:8080/api/species?page=1&limit=5"

# Combined filters
curl "http://localhost:8080/api/species?category=bird&rarity=rare&page=1&limit=10"
```

#### Search Species by Name
```bash
# Search for lions
curl "http://localhost:8080/api/species/search?q=lion"

# Search for scientific names
curl "http://localhost:8080/api/species/search?q=panthera"

# Limit results
curl "http://localhost:8080/api/species/search?q=eagle&limit=3"
```

#### GET Species by ID
```bash
# First get a species ID from the species list, then:
curl "http://localhost:8080/api/species/{SPECIES_ID_HERE}"
```

### 2. Animal Catches Endpoints (3 endpoints)

#### CREATE New Animal Catch ⚡ (Protected)
```bash
# Replace {JWT_TOKEN} with your actual token and {SPECIES_ID} with a real species ID
curl -X POST http://localhost:8080/api/catches \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "species_id": "{SPECIES_ID}",
    "latitude": 40.7829,
    "longitude": -73.9654,
    "user_photo_url": "https://example.com/my-lion-photo.jpg",
    "user_notes": "Amazing lion sighting in Central Park!",
    "user_rating": 5,
    "weather": "sunny",
    "temperature": 22.5
  }'
```

#### GET User's Catches ⚡ (Protected)
```bash
curl -H "Authorization: Bearer {JWT_TOKEN}" \
  "http://localhost:8080/api/catches/my"

# With pagination
curl -H "Authorization: Bearer {JWT_TOKEN}" \
  "http://localhost:8080/api/catches/my?page=1&limit=10"
```

#### GET Catch by ID
```bash
# Use a catch ID from your catches list
curl "http://localhost:8080/api/catches/{CATCH_ID_HERE}"
```

### 3. Location Endpoints (2 endpoints)

#### GET Nearby Locations
```bash
# Find locations near Central Park, NYC
curl "http://localhost:8080/api/locations/nearby?lat=40.7829&lng=-73.9654"

# With custom radius (in kilometers)
curl "http://localhost:8080/api/locations/nearby?lat=40.7829&lng=-73.9654&radius=50"

# Find locations near Serengeti
curl "http://localhost:8080/api/locations/nearby?lat=-2.154&lng=34.686&radius=100"
```

#### GET Catches at Location
```bash
# Get catches at Central Park coordinates
curl "http://localhost:8080/api/locations/catches?lat=40.7829&lng=-73.9654"

# With pagination
curl "http://localhost:8080/api/locations/catches?lat=40.7829&lng=-73.9654&page=1&limit=5"
```

## 🧪 Complete Test Workflow

Here's a complete Pokemon Go-style test scenario:

### 1. User Registration & Login
```bash
# Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username": "wildlifehunter", "email": "hunter@wildlife.com", "password": "password123"}'

# Login and save the JWT token
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "hunter@wildlife.com", "password": "password123"}'
```

### 2. Explore Available Animals
```bash
# See all legendary animals (hardest to catch)
curl "http://localhost:8080/api/species?rarity=legendary"

# Search for big cats
curl "http://localhost:8080/api/species/search?q=leopard"
```

### 3. Find Nearby Wildlife Locations
```bash
# Check what's near you (example: Central Park)
curl "http://localhost:8080/api/locations/nearby?lat=40.7829&lng=-73.9654&radius=25"
```

### 4. "Catch" an Animal (Pokemon Go style!)
```bash
# Create a catch record (replace {JWT_TOKEN} and {SPECIES_ID})
curl -X POST http://localhost:8080/api/catches \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "species_id": "{SPECIES_ID}",
    "latitude": 40.7829,
    "longitude": -73.9654,
    "user_photo_url": "https://example.com/snow-leopard.jpg",
    "user_notes": "Incredible snow leopard encounter!",
    "user_rating": 5,
    "weather": "cloudy"
  }'
```

### 5. View Your Collection
```bash
# See all your catches
curl -H "Authorization: Bearer {JWT_TOKEN}" \
  "http://localhost:8080/api/catches/my"
```

## 🔍 Expected Responses

### Success Response Format:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "total_pages": 3
  }
}
```

### Error Response Format:
```json
{
  "error": "Description of the error",
  "details": "More specific error information"
}
```

## 🐛 Troubleshooting

### Common Issues:

1. **"User not authenticated"** - Check your JWT token format:
   ```bash
   -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE"
   ```

2. **"Species not found"** - Get valid species IDs first:
   ```bash
   curl "http://localhost:8080/api/species" | head
   ```

3. **"Invalid location parameters"** - Ensure lat/lng are numbers:
   ```bash
   curl "http://localhost:8080/api/locations/nearby?lat=40.7829&lng=-73.9654"
   ```

4. **Empty responses** - Check if you have seed data:
   ```bash
   make seed-stats
   ```

## 📚 Additional Resources

- **Swagger Documentation**: http://localhost:8080/swagger/index.html
- **Health Check**: http://localhost:8080/health
- **Seed Data Stats**: `make seed-stats`
- **Reset Test Data**: `make seed-clear && make seed`

## 🎯 Test Verification

After testing, you should be able to:
- ✅ Browse animal species by category and rarity
- ✅ Search for specific animals
- ✅ Create animal catch records with location
- ✅ View your personal catch collection
- ✅ Find nearby wildlife locations
- ✅ See what animals others have caught nearby

This covers the core Pokemon Go functionality for animal discovery and catching! 🦁📸
