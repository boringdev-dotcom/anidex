package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL string
	JWTSecret   string
	Port        string
	GinMode     string

	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string

	FacebookClientID     string
	FacebookClientSecret string
	FacebookRedirectURL  string

	FrontendURL string
}

var AppConfig *Config

func LoadConfig() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found, using environment variables")
	}

	AppConfig = &Config{
		DatabaseURL:          getEnv("DATABASE_URL", "postgres://user:password@localhost:5432/anidex?sslmode=disable"),
		JWTSecret:            getEnv("JWT_SECRET", "your-secret-key"),
		Port:                 getEnv("PORT", "8080"),
		GinMode:              getEnv("GIN_MODE", "debug"),
		GoogleClientID:       getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret:   getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:    getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/api/auth/google/callback"),
		FacebookClientID:     getEnv("FACEBOOK_CLIENT_ID", ""),
		FacebookClientSecret: getEnv("FACEBOOK_CLIENT_SECRET", ""),
		FacebookRedirectURL:  getEnv("FACEBOOK_REDIRECT_URL", "http://localhost:8080/api/auth/facebook/callback"),
		FrontendURL:          getEnv("FRONTEND_URL", "http://localhost:3000"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}