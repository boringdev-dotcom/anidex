package main

import (
	"fmt"
	"log"
	"math/rand"
	"time"

	"github.com/anidex/backend/internal/config"
	"github.com/anidex/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func main() {
	// Initialize database
	config.LoadConfig()
	config.ConnectDatabase()

	log.Println("🚀 Enhancing database with comprehensive test data...")

	// Create more users
	if err := createMoreUsers(); err != nil {
		log.Fatal("Failed to create more users:", err)
	}

	// Create many more catches for each user
	if err := createMoreCatches(); err != nil {
		log.Fatal("Failed to create more catches:", err)
	}

	// Skip friendships for now (not implemented in current models)

	// Award more badges
	if err := awardMoreBadges(); err != nil {
		log.Fatal("Failed to award badges:", err)
	}

	log.Println("✅ Data enhancement completed successfully!")
	printStats()
}

func createMoreUsers() error {
	log.Println("👥 Creating additional users...")

	additionalUsers := []models.User{
		{
			Email:    "alex.adventurer@example.com",
			Username: "alex_adventure",
			Name:     "Alex Adventurer",
			Provider: models.AuthProviderGoogle,
		},
		{
			Email:    "emma.wildlife@example.com",
			Username: "emma_wild",
			Name:     "Emma Wildlife",
			Provider: models.AuthProviderLocal,
		},
		{
			Email:    "carlos.explorer@example.com",
			Username: "carlos_explore",
			Name:     "Carlos Explorer",
			Provider: models.AuthProviderFirebase,
		},
		{
			Email:    "lisa.naturalist@example.com",
			Username: "lisa_nature",
			Name:     "Lisa Naturalist",
			Provider: models.AuthProviderLocal,
		},
		{
			Email:    "ryan.photographer@example.com",
			Username: "ryan_photo",
			Name:     "Ryan Photographer",
			Provider: models.AuthProviderGoogle,
		},
		{
			Email:    "zoe.conservationist@example.com",
			Username: "zoe_conservation",
			Name:     "Zoe Conservationist",
			Provider: models.AuthProviderLocal,
		},
	}

	for _, user := range additionalUsers {
		// Check if user already exists
		var existingUser models.User
		if err := config.DB.Where("email = ?", user.Email).First(&existingUser).Error; err == gorm.ErrRecordNotFound {
			if err := config.DB.Create(&user).Error; err != nil {
				return fmt.Errorf("failed to create user %s: %w", user.Email, err)
			}
			log.Printf("Created user: %s", user.Name)
		}
	}

	return nil
}

func createMoreCatches() error {
	log.Println("🐾 Creating comprehensive catch data...")

	// Get all users
	var users []models.User
	if err := config.DB.Find(&users).Error; err != nil {
		return fmt.Errorf("failed to get users: %w", err)
	}

	// Get all species
	var species []models.Species
	if err := config.DB.Find(&species).Error; err != nil {
		return fmt.Errorf("failed to get species: %w", err)
	}

	// Get all locations
	var locations []models.Location
	if err := config.DB.Find(&locations).Error; err != nil {
		return fmt.Errorf("failed to get locations: %w", err)
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

	notes := []string{
		"Amazing wildlife encounter!",
		"Beautiful specimen spotted in its natural habitat",
		"Incredible sighting during my morning walk",
		"What a rare find! So excited to see this",
		"Perfect weather for wildlife photography",
		"This species is truly magnificent",
		"Lucky to witness this amazing creature",
		"Conservation efforts are really paying off",
		"Nature never ceases to amaze me",
		"Great addition to my wildlife collection",
	}

	// Create 15-25 catches per user (many more than the default 3-5)
	for _, user := range users {
		numCatches := 15 + rand.Intn(11) // 15-25 catches

		for i := 0; i < numCatches; i++ {
			// Random species (favor common ones, but include rare ones)
			var selectedSpecies models.Species
			if rand.Float32() < 0.7 { // 70% common/uncommon
				commonSpecies := []string{"common", "uncommon"}
				for _, sp := range species {
					for _, rarity := range commonSpecies {
						if string(sp.Rarity) == rarity && rand.Float32() < 0.3 {
							selectedSpecies = sp
							break
						}
					}
					if selectedSpecies.ID != uuid.Nil {
						break
					}
				}
			}

			if selectedSpecies.ID == uuid.Nil {
				// Pick any random species
				selectedSpecies = species[rand.Intn(len(species))]
			}

			// Random location
			location := locations[rand.Intn(len(locations))]

			// Random time in the past (last 90 days)
			daysAgo := rand.Intn(90)
			hoursAgo := rand.Intn(24)
			minutesAgo := rand.Intn(60)
			caughtAt := time.Now().AddDate(0, 0, -daysAgo).Add(-time.Duration(hoursAgo) * time.Hour).Add(-time.Duration(minutesAgo) * time.Minute)

			catch := models.AnimalCatch{
				UserID:             user.ID,
				SpeciesID:          selectedSpecies.ID,
				LocationID:         location.ID,
				UserPhotoURL:       fmt.Sprintf("https://example.com/catches/%s_%s.jpg", user.Username, selectedSpecies.CommonName),
				UserNotes:          notes[rand.Intn(len(notes))],
				Weather:            weathers[rand.Intn(len(weathers))],
				TimeOfDay:          times[rand.Intn(len(times))],
				Temperature:        func() *float64 { t := float64(15 + rand.Intn(20)); return &t }(), // 15-35°C
				CaughtAt:           caughtAt,
				VerificationStatus: models.VerificationApproved,
				PointsAwarded:      selectedSpecies.CalculatePoints(),
			}

			if err := config.DB.Create(&catch).Error; err != nil {
				return fmt.Errorf("failed to create catch: %w", err)
			}
		}

		log.Printf("Created %d catches for user: %s", numCatches, user.Name)
	}

	return nil
}

// Friendship functionality removed - not implemented in current models

func awardMoreBadges() error {
	log.Println("🏅 Awarding badges based on user activity...")

	var users []models.User
	if err := config.DB.Find(&users).Error; err != nil {
		return fmt.Errorf("failed to get users: %w", err)
	}

	var badges []models.Badge
	if err := config.DB.Find(&badges).Error; err != nil {
		return fmt.Errorf("failed to get badges: %w", err)
	}

	for _, user := range users {
		// Count user's catches
		var catchCount int64
		config.DB.Model(&models.AnimalCatch{}).Where("user_id = ?", user.ID).Count(&catchCount)

		// Count unique species
		var uniqueSpecies int64
		config.DB.Model(&models.AnimalCatch{}).Where("user_id = ?", user.ID).Distinct("species_id").Count(&uniqueSpecies)

		// Award badges based on activity
		for _, badge := range badges {
			shouldAward := false

			switch badge.Name {
			case "First Catch":
				shouldAward = catchCount >= 1
			case "Century Club":
				shouldAward = catchCount >= 100
			case "Bird Watcher":
				var birdCatches int64
				config.DB.Table("animal_catches").
					Joins("JOIN species ON animal_catches.species_id = species.id").
					Where("animal_catches.user_id = ? AND species.category = ?", user.ID, "bird").
					Count(&birdCatches)
				shouldAward = birdCatches >= 5
			case "Rare Collector":
				var rareCatches int64
				config.DB.Table("animal_catches").
					Joins("JOIN species ON animal_catches.species_id = species.id").
					Where("animal_catches.user_id = ? AND species.rarity IN ?", user.ID, []string{"rare", "epic", "legendary"}).
					Count(&rareCatches)
				shouldAward = rareCatches >= 3
			case "Daily Dedication":
				shouldAward = catchCount >= 10
			case "Photo Artist":
				shouldAward = catchCount >= 20
			}

			if shouldAward {
				// Check if user already has this badge
				var existingBadge models.UserBadge
				err := config.DB.Where("user_id = ? AND badge_id = ?", user.ID, badge.ID).First(&existingBadge).Error

				if err == gorm.ErrRecordNotFound {
					userBadge := models.UserBadge{
						UserID:   user.ID,
						BadgeID:  badge.ID,
						EarnedAt: func() *time.Time { t := time.Now(); return &t }(),
					}

					if err := config.DB.Create(&userBadge).Error; err != nil {
						log.Printf("Warning: Failed to award badge %s to %s: %v", badge.Name, user.Name, err)
					} else {
						log.Printf("Awarded badge '%s' to %s", badge.Name, user.Name)
					}
				}
			}
		}
	}

	return nil
}

func printStats() {
	var userCount, speciesCount, locationCount, badgeCount, catchCount, userBadgeCount int64

	config.DB.Model(&models.User{}).Count(&userCount)
	config.DB.Model(&models.Species{}).Count(&speciesCount)
	config.DB.Model(&models.Location{}).Count(&locationCount)
	config.DB.Model(&models.Badge{}).Count(&badgeCount)
	config.DB.Model(&models.AnimalCatch{}).Count(&catchCount)
	config.DB.Model(&models.UserBadge{}).Count(&userBadgeCount)

	fmt.Printf(`
📊 Enhanced Database Statistics:
Users:       %d
Species:     %d
Locations:   %d
Badges:      %d
Catches:     %d
User Badges: %d
`, userCount, speciesCount, locationCount, badgeCount, catchCount, userBadgeCount)
}
