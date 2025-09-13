package config

import (
	"log"

	"github.com/anidex/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDatabase() {
	var err error
	DB, err = gorm.Open(postgres.Open(AppConfig.DatabaseURL), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	err = DB.AutoMigrate(
		&models.User{},
		&models.Species{},
		&models.Location{},
		&models.Hotspot{},
		&models.UserLocationHistory{},
		&models.AnimalCatch{},
		&models.CatchComment{},
		&models.CatchLike{},
		&models.Badge{},
		&models.UserBadge{},
		&models.UserStats{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database connected and migrated successfully")
}