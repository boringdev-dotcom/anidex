package services

import (
	"fmt"
	"log"
	"time"

	"github.com/anidex/backend/internal/config"
	"github.com/anidex/backend/internal/models"
	"github.com/anidex/backend/internal/seeds"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SeederService struct {
	db *gorm.DB
}

func NewSeederService() *SeederService {
	return &SeederService{
		db: config.DB,
	}
}

// SeedAll runs all seeders in the correct order
func (s *SeederService) SeedAll() error {
	log.Println("🌱 Starting database seeding...")

	// Check if data already exists
	if s.hasExistingData() {
		log.Println("⚠️  Database already contains seed data. Skipping seeding.")
		return nil
	}

	// Seed in dependency order
	if err := s.SeedSpecies(); err != nil {
		return fmt.Errorf("failed to seed species: %w", err)
	}

	if err := s.SeedLocations(); err != nil {
		return fmt.Errorf("failed to seed locations: %w", err)
	}

	if err := s.SeedHotspots(); err != nil {
		return fmt.Errorf("failed to seed hotspots: %w", err)
	}

	if err := s.SeedBadges(); err != nil {
		return fmt.Errorf("failed to seed badges: %w", err)
	}

	// Create some sample users and catches for testing
	if err := s.SeedSampleData(); err != nil {
		return fmt.Errorf("failed to seed sample data: %w", err)
	}

	log.Println("✅ Database seeding completed successfully!")
	return nil
}

// hasExistingData checks if the database already has seed data
func (s *SeederService) hasExistingData() bool {
	var count int64
	s.db.Model(&models.Species{}).Count(&count)
	return count > 0
}

// SeedSpecies populates the species table
func (s *SeederService) SeedSpecies() error {
	log.Println("🐾 Seeding species data...")

	species := seeds.GetSpeciesSeeds()
	
	for i, sp := range species {
		// Check if species already exists
		var existing models.Species
		if err := s.db.Where("scientific_name = ?", sp.ScientificName).First(&existing).Error; err == nil {
			log.Printf("Species %s already exists, skipping...", sp.CommonName)
			continue
		}

		if err := s.db.Create(&sp).Error; err != nil {
			return fmt.Errorf("failed to create species %s: %w", sp.CommonName, err)
		}

		if (i+1)%5 == 0 {
			log.Printf("Created %d/%d species...", i+1, len(species))
		}
	}

	log.Printf("✅ Successfully seeded %d species", len(species))
	return nil
}

// SeedLocations populates the locations table
func (s *SeederService) SeedLocations() error {
	log.Println("📍 Seeding location data...")

	locations := seeds.GetLocationSeeds()
	
	for i, loc := range locations {
		// Check if location already exists
		var existing models.Location
		if err := s.db.Where("latitude = ? AND longitude = ?", loc.Latitude, loc.Longitude).First(&existing).Error; err == nil {
			log.Printf("Location %s already exists, skipping...", loc.Name)
			continue
		}

		if err := s.db.Create(&loc).Error; err != nil {
			return fmt.Errorf("failed to create location %s: %w", loc.Name, err)
		}

		if (i+1)%3 == 0 {
			log.Printf("Created %d/%d locations...", i+1, len(locations))
		}
	}

	log.Printf("✅ Successfully seeded %d locations", len(locations))
	return nil
}

// SeedHotspots populates the hotspots table
func (s *SeederService) SeedHotspots() error {
	log.Println("🔥 Seeding hotspot data...")

	hotspots := seeds.GetHotspotSeeds()
	
	// Get some location IDs to link hotspots
	var locations []models.Location
	s.db.Limit(len(hotspots)).Find(&locations)

	for i, hotspot := range hotspots {
		if i < len(locations) {
			hotspot.LocationID = locations[i].ID
		}

		if err := s.db.Create(&hotspot).Error; err != nil {
			return fmt.Errorf("failed to create hotspot %s: %w", hotspot.Name, err)
		}
	}

	log.Printf("✅ Successfully seeded %d hotspots", len(hotspots))
	return nil
}

// SeedBadges populates the badges table
func (s *SeederService) SeedBadges() error {
	log.Println("🏅 Seeding badge data...")

	badges := seeds.GetBadgeSeeds()
	
	for i, badge := range badges {
		// Check if badge already exists
		var existing models.Badge
		if err := s.db.Where("name = ?", badge.Name).First(&existing).Error; err == nil {
			log.Printf("Badge %s already exists, skipping...", badge.Name)
			continue
		}

		if err := s.db.Create(&badge).Error; err != nil {
			return fmt.Errorf("failed to create badge %s: %w", badge.Name, err)
		}

		if (i+1)%5 == 0 {
			log.Printf("Created %d/%d badges...", i+1, len(badges))
		}
	}

	log.Printf("✅ Successfully seeded %d badges", len(badges))
	return nil
}

// SeedSampleData creates sample users, catches, and user badges for testing
func (s *SeederService) SeedSampleData() error {
	log.Println("👥 Creating sample test data...")

	// Create sample users
	users := s.createSampleUsers()
	for i, user := range users {
		if err := s.db.Create(&user).Error; err != nil {
			return fmt.Errorf("failed to create sample user: %w", err)
		}
		users[i] = user // Update with generated ID
	}

	// Get some species and locations for sample catches
	var species []models.Species
	var locations []models.Location
	s.db.Limit(10).Find(&species)
	s.db.Limit(5).Find(&locations)

	if len(species) == 0 || len(locations) == 0 {
		log.Println("⚠️  No species or locations found, skipping sample catches")
		return nil
	}

	// Create sample animal catches
	catches := s.createSampleCatches(users, species, locations)
	for i, catch := range catches {
		if err := s.db.Create(&catch).Error; err != nil {
			return fmt.Errorf("failed to create sample catch: %w", err)
		}

		if (i+1)%5 == 0 {
			log.Printf("Created %d/%d sample catches...", i+1, len(catches))
		}
	}

	// Create user stats for sample users
	for _, user := range users {
		stats := s.createUserStats(user.ID)
		if err := s.db.Create(&stats).Error; err != nil {
			return fmt.Errorf("failed to create user stats: %w", err)
		}
	}

	// Award some sample badges
	if err := s.createSampleBadges(users); err != nil {
		return fmt.Errorf("failed to create sample badges: %w", err)
	}

	log.Printf("✅ Successfully created sample data: %d users, %d catches", len(users), len(catches))
	return nil
}

func (s *SeederService) createSampleUsers() []models.User {
	return []models.User{
		{
			Email:    "jane.explorer@example.com",
			Username: "jane_wildlife",
			Name:     "Jane Explorer",
			Avatar:   "https://example.com/avatars/jane.jpg",
			Provider: models.AuthProviderLocal,
		},
		{
			Email:    "mike.photographer@example.com",
			Username: "mike_photo",
			Name:     "Mike Photographer",
			Avatar:   "https://example.com/avatars/mike.jpg",
			Provider: models.AuthProviderGoogle,
		},
		{
			Email:    "sarah.conservationist@example.com",
			Username: "sarah_conservation",
			Name:     "Sarah Green",
			Avatar:   "https://example.com/avatars/sarah.jpg",
			Provider: models.AuthProviderLocal,
		},
		{
			Email:    "david.naturalist@example.com",
			Username: "david_nature",
			Name:     "David Naturalist",
			Avatar:   "https://example.com/avatars/david.jpg",
			Provider: models.AuthProviderFirebase,
		},
	}
}

func (s *SeederService) createSampleCatches(users []models.User, species []models.Species, locations []models.Location) []models.AnimalCatch {
	var catches []models.AnimalCatch
	
	timeVariations := []time.Duration{
		-24 * time.Hour,
		-48 * time.Hour,
		-72 * time.Hour,
		-5 * 24 * time.Hour,
		-7 * 24 * time.Hour,
	}

	weathers := []models.WeatherCondition{
		models.WeatherSunny,
		models.WeatherCloudy,
		models.WeatherRainy,
		models.WeatherFoggy,
	}

	times := []models.TimeOfDay{
		models.TimeMorning,
		models.TimeAfternoon,
		models.TimeEvening,
		models.TimeDusk,
	}

	for i, user := range users {
		// Create 3-5 catches per user
		numCatches := 3 + (i % 3)
		
		for j := 0; j < numCatches; j++ {
			speciesIdx := (i*numCatches + j) % len(species)
			locationIdx := (i + j) % len(locations)
			
			catch := models.AnimalCatch{
				UserID:             user.ID,
				SpeciesID:          species[speciesIdx].ID,
				LocationID:         locations[locationIdx].ID,
				UserPhotoURL:       fmt.Sprintf("https://example.com/catches/user_%d_catch_%d.jpg", i+1, j+1),
				UserNotes:          fmt.Sprintf("Amazing %s spotted during my wildlife adventure!", species[speciesIdx].CommonName),
				Weather:            weathers[j%len(weathers)],
				TimeOfDay:          times[j%len(times)],
				VerificationStatus: models.VerificationApproved,
				PointsAwarded:      species[speciesIdx].CalculatePoints(),
				IsFirstCatch:       j == 0, // First catch for each user
				ComboMultiplier:    1.0,
				IsPublic:           true,
				LikesCount:         j * 3, // Varying likes
				CommentsCount:      j,
				CaughtAt:           time.Now().Add(timeVariations[j%len(timeVariations)]),
			}
			
			catches = append(catches, catch)
		}
	}

	return catches
}

func (s *SeederService) createUserStats(userID uuid.UUID) models.UserStats {
	return models.UserStats{
		UserID:             userID,
		TotalCatches:       4, // Average catches per user
		UniqueSpecies:      4,
		TotalPoints:        350,
		CurrentStreak:      2,
		LongestStreak:      3,
		LastCatchDate:      timePtr(time.Now().Add(-24 * time.Hour)),
		CommonCatches:      2,
		UncommonCatches:    1,
		RareCatches:        1,
		EpicCatches:        0,
		LegendaryCatches:   0,
		MammalCatches:      2,
		BirdCatches:        1,
		ReptileCatches:     1,
		CountriesVisited:   2,
		CitiesVisited:      3,
		BadgesEarned:       2,
		FollowersCount:     5,
		FollowingCount:     8,
		TotalLikes:         15,
		TotalComments:      8,
		LastUpdated:        time.Now(),
	}
}

func (s *SeederService) createSampleBadges(users []models.User) error {
	// Get some badges to award
	var badges []models.Badge
	s.db.Where("name IN ?", []string{"First Catch", "Daily Dedication", "Urban Wildlife Expert"}).Find(&badges)

	if len(badges) == 0 {
		log.Println("⚠️  No badges found to award")
		return nil
	}

	// Award badges to users
	for i, user := range users {
		for j, badge := range badges {
			if j <= i { // Award different numbers of badges to different users
				userBadge := models.UserBadge{
					UserID:      user.ID,
					BadgeID:     badge.ID,
					Progress:    getProgressValue(badge.RequiredCount),
					MaxProgress: getProgressValue(badge.RequiredCount),
					EarnedAt:    timePtr(time.Now().Add(-time.Duration(j*24) * time.Hour)),
					IsDisplayed: true,
				}

				if err := s.db.Create(&userBadge).Error; err != nil {
					return fmt.Errorf("failed to create user badge: %w", err)
				}
			}
		}
	}

	return nil
}

// ClearAllData removes all seeded data (useful for development/testing)
func (s *SeederService) ClearAllData() error {
	log.Println("🗑️  Clearing all seed data...")

	// Delete in reverse dependency order
	tables := []interface{}{
		&models.UserBadge{},
		&models.UserStats{},
		&models.CatchLike{},
		&models.CatchComment{},
		&models.AnimalCatch{},
		&models.Hotspot{},
		&models.Badge{},
		&models.Location{},
		&models.Species{},
		&models.User{}, // Only remove seed users
	}

	for _, table := range tables {
		if err := s.db.Unscoped().Where("1 = 1").Delete(table).Error; err != nil {
			return fmt.Errorf("failed to clear table: %w", err)
		}
	}

	log.Println("✅ All seed data cleared successfully!")
	return nil
}

// GetSeedStats returns statistics about the seeded data
func (s *SeederService) GetSeedStats() map[string]int64 {
	stats := make(map[string]int64)

	var count int64

	s.db.Model(&models.Species{}).Count(&count)
	stats["species"] = count

	s.db.Model(&models.Location{}).Count(&count)
	stats["locations"] = count

	s.db.Model(&models.Hotspot{}).Count(&count)
	stats["hotspots"] = count

	s.db.Model(&models.Badge{}).Count(&count)
	stats["badges"] = count

	s.db.Model(&models.User{}).Count(&count)
	stats["users"] = count

	s.db.Model(&models.AnimalCatch{}).Count(&count)
	stats["catches"] = count

	s.db.Model(&models.UserBadge{}).Count(&count)
	stats["user_badges"] = count

	return stats
}

// Helper function for time pointers
func timePtr(t time.Time) *time.Time {
	return &t
}

// Helper function for progress values
func getProgressValue(requiredCount *int) int {
	if requiredCount != nil {
		return *requiredCount
	}
	return 1
}
