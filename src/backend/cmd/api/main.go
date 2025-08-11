package main

import (
	"log"

	"github.com/anidex/backend/internal/config"
	"github.com/anidex/backend/internal/controllers"
	"github.com/anidex/backend/internal/middleware"
	"github.com/anidex/backend/internal/repositories"
	"github.com/anidex/backend/internal/services"

	_ "anidex-backend/docs"

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
	authService := services.NewAuthService(userRepo)
	oauthService := services.NewOAuthService()
	authController := controllers.NewAuthController(authService, oauthService)

	api := router.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", authController.Register)
			auth.POST("/login", authController.Login)
			auth.POST("/refresh", authController.RefreshToken)
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