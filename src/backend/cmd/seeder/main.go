package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"github.com/anidex/backend/internal/config"
	"github.com/anidex/backend/internal/services"
)

func main() {
	// Command line flags
	var (
		seedAll   = flag.Bool("seed", false, "Seed the database with initial data")
		clearAll  = flag.Bool("clear", false, "Clear all seeded data from database")
		showStats = flag.Bool("stats", false, "Show seeding statistics")
	)
	flag.Parse()

	// Load configuration
	config.LoadConfig()

	// Connect to database
	config.ConnectDatabase()

	// Create seeder service
	seederService := services.NewSeederService()

	// Execute based on flags
	switch {
	case *clearAll:
		fmt.Println("🗑️  Clearing all seed data...")
		if err := seederService.ClearAllData(); err != nil {
			log.Fatalf("Failed to clear data: %v", err)
		}
		fmt.Println("✅ Data cleared successfully!")

	case *seedAll:
		fmt.Println("🌱 Starting database seeding...")
		if err := seederService.SeedAll(); err != nil {
			log.Fatalf("Failed to seed database: %v", err)
		}
		fmt.Println("✅ Database seeded successfully!")

		// Show stats after seeding
		showSeedingStats(seederService)

	case *showStats:
		showSeedingStats(seederService)

	default:
		printUsage()
	}
}

func showSeedingStats(seederService *services.SeederService) {
	fmt.Println("\n📊 Database Seeding Statistics:")
	stats := seederService.GetSeedStats()
	
	fmt.Printf("Species:     %d\n", stats["species"])
	fmt.Printf("Locations:   %d\n", stats["locations"])
	fmt.Printf("Hotspots:    %d\n", stats["hotspots"])
	fmt.Printf("Badges:      %d\n", stats["badges"])
	fmt.Printf("Users:       %d\n", stats["users"])
	fmt.Printf("Catches:     %d\n", stats["catches"])
	fmt.Printf("User Badges: %d\n", stats["user_badges"])
	fmt.Println()
}

func printUsage() {
	fmt.Println("AniDex Database Seeder")
	fmt.Println("Usage:")
	fmt.Println("  go run cmd/seeder/main.go [flags]")
	fmt.Println()
	fmt.Println("Flags:")
	fmt.Println("  -seed     Seed the database with initial data")
	fmt.Println("  -clear    Clear all seeded data from database")
	fmt.Println("  -stats    Show current seeding statistics")
	fmt.Println()
	fmt.Println("Examples:")
	fmt.Println("  go run cmd/seeder/main.go -seed")
	fmt.Println("  go run cmd/seeder/main.go -stats")
	fmt.Println("  go run cmd/seeder/main.go -clear")
	
	os.Exit(1)
}
