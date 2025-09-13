package main

import (
	"log"

	"github.com/anidex/backend/internal/config"
	"github.com/anidex/backend/internal/controllers"
	"github.com/anidex/backend/internal/middleware"
	"github.com/anidex/backend/internal/repositories"
	"github.com/anidex/backend/internal/services"

	_ "github.com/anidex/backend/docs"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// @title Anidex API
// @version 1.0
// @description API for Anidex mobile application with authentication and social login

// @contact.name API Support
// @contact.email support@anidex.com

// @host localhost:8080
// @BasePath /

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.

func main() {
	config.LoadConfig()
	config.ConnectDatabase()

	gin.SetMode(config.AppConfig.GinMode)
	router := gin.Default()

	router.Use(middleware.CORSMiddleware())

	userRepo := repositories.NewUserRepository()
	speciesRepo := repositories.NewSpeciesRepository()
	animalCatchRepo := repositories.NewAnimalCatchRepository()
	locationRepo := repositories.NewLocationRepository()
	
	firebaseService := services.NewFirebaseService()
	authService := services.NewAuthService(userRepo, firebaseService)
	oauthService := services.NewOAuthService()
	
	authController := controllers.NewAuthController(authService, oauthService)
	speciesController := controllers.NewSpeciesController(speciesRepo)
	catchController := controllers.NewCatchController(animalCatchRepo, speciesRepo, locationRepo)
	locationController := controllers.NewLocationController(locationRepo, animalCatchRepo)

	api := router.Group("/api")
	{
		// Authentication routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", authController.Register)
			auth.POST("/login", authController.Login)
			auth.POST("/refresh", authController.RefreshToken)
			auth.POST("/firebase", authController.FirebaseLogin)
			auth.GET("/google", authController.GoogleLogin)
			auth.GET("/google/callback", authController.GoogleCallback)
			auth.GET("/facebook", authController.FacebookLogin)
			auth.GET("/facebook/callback", authController.FacebookCallback)

			protected := auth.Group("")
			protected.Use(middleware.AuthMiddleware())
			{
				protected.GET("/profile", authController.GetProfile)
			}
		}

		// Species routes (public)
		species := api.Group("/species")
		{
			species.GET("", speciesController.GetAllSpecies)
			species.GET("/search", speciesController.SearchSpecies)
			species.GET("/:id", speciesController.GetSpeciesById)
		}

		// Animal catches routes
		catches := api.Group("/catches")
		{
			// Public routes
			catches.GET("/:id", catchController.GetCatchById)
			
			// Protected routes
			protected := catches.Group("")
			protected.Use(middleware.AuthMiddleware())
			{
				protected.POST("", catchController.CreateCatch)
				protected.GET("/my", catchController.GetUserCatches)
			}
		}

		// Location routes (public)
		locations := api.Group("/locations")
		{
			locations.GET("/nearby", locationController.GetNearbyLocations)
			locations.GET("/catches", locationController.GetLocationCatches)
		}
	}

	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "healthy"})
	})

	log.Printf("Server starting on port %s", config.AppConfig.Port)
	log.Printf("Swagger documentation available at http://localhost:%s/swagger/index.html", config.AppConfig.Port)
	
	if err := router.Run(":" + config.AppConfig.Port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}