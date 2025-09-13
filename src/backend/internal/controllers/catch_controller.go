package controllers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/anidex/backend/internal/models"
	"github.com/anidex/backend/internal/repositories"
	"github.com/anidex/backend/internal/utils"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type CatchController struct {
	catchRepo    *repositories.AnimalCatchRepository
	speciesRepo  *repositories.SpeciesRepository
	locationRepo *repositories.LocationRepository
}

func NewCatchController(catchRepo *repositories.AnimalCatchRepository, speciesRepo *repositories.SpeciesRepository, locationRepo *repositories.LocationRepository) *CatchController {
	return &CatchController{
		catchRepo:    catchRepo,
		speciesRepo:  speciesRepo,
		locationRepo: locationRepo,
	}
}

type CreateCatchRequest struct {
	SpeciesID    string  `json:"species_id" binding:"required"`
	Latitude     float64 `json:"latitude" binding:"required"`
	Longitude    float64 `json:"longitude" binding:"required"`
	UserPhotoURL string  `json:"user_photo_url" binding:"required"`
	UserNotes    string  `json:"user_notes"`
	UserRating   *int    `json:"user_rating"`
	Weather      string  `json:"weather"`
	Temperature  *float64 `json:"temperature"`
}

// CreateCatch godoc
// @Summary Create a new animal catch
// @Description Create a new animal catch record with photo and location
// @Tags catches
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param catch body CreateCatchRequest true "Catch data"
// @Success 201 {object} map[string]interface{} "success"
// @Failure 400 {object} map[string]interface{} "error"
// @Failure 401 {object} map[string]interface{} "error"
// @Failure 500 {object} map[string]interface{} "error"
// @Router /api/catches [post]
func (cc *CatchController) CreateCatch(c *gin.Context) {
	var req CreateCatchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request data",
			"details": err.Error(),
		})
		return
	}

	// Get user ID from JWT token
	userID, err := utils.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	// Parse species ID
	speciesID, err := uuid.Parse(req.SpeciesID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid species ID format",
		})
		return
	}

	// Verify species exists
	species, err := cc.speciesRepo.GetByID(speciesID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Species not found",
		})
		return
	}

	// Create or find location
	location := &models.Location{
		Latitude:  req.Latitude,
		Longitude: req.Longitude,
	}
	
	// Try to find existing nearby location (within 100m)
	existingLocation, err := cc.locationRepo.FindNearby(req.Latitude, req.Longitude, 0.1)
	if err == nil && existingLocation != nil {
		location = existingLocation
	} else {
		// Create new location
		if err := cc.locationRepo.Create(location); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to create location",
			})
			return
		}
	}

	// Determine time of day
	now := time.Now()
	timeOfDay := models.GetTimeOfDayFromHour(now.Hour())

	// Create animal catch
	animalCatch := &models.AnimalCatch{
		UserID:            userID,
		SpeciesID:         speciesID,
		LocationID:        location.ID,
		UserPhotoURL:      req.UserPhotoURL,
		UserNotes:         req.UserNotes,
		UserRating:        req.UserRating,
		Weather:           models.WeatherCondition(req.Weather),
		TimeOfDay:         timeOfDay,
		Temperature:       req.Temperature,
		CaughtAt:          now,
		PointsAwarded:     species.CalculatePoints(),
		IsPublic:          true,
	}

	// Check if this is user's first catch of this species
	isFirstCatch, err := cc.catchRepo.IsFirstCatchForUser(userID, speciesID)
	if err == nil {
		animalCatch.IsFirstCatch = isFirstCatch
		if isFirstCatch {
			animalCatch.ComboMultiplier = 1.5 // Bonus for first catch
		}
	}

	if err := cc.catchRepo.Create(animalCatch); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create catch",
			"details": err.Error(),
		})
		return
	}

	// Load relationships for response
	animalCatch.Species = *species
	animalCatch.Location = *location

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data": animalCatch,
		"message": "Animal catch created successfully",
	})
}

// GetUserCatches godoc
// @Summary Get user's animal catches
// @Description Retrieve all animal catches for the authenticated user
// @Tags catches
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Number of items per page" default(20)
// @Success 200 {object} map[string]interface{} "success"
// @Failure 401 {object} map[string]interface{} "error"
// @Failure 500 {object} map[string]interface{} "error"
// @Router /api/catches/my [get]
func (cc *CatchController) GetUserCatches(c *gin.Context) {
	userID, err := utils.GetUserIDFromContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	catches, total, err := cc.catchRepo.GetByUserID(userID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch catches",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": catches,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetCatchById godoc
// @Summary Get catch by ID
// @Description Retrieve a specific animal catch by its ID
// @Tags catches
// @Accept json
// @Produce json
// @Param id path string true "Catch ID (UUID)"
// @Success 200 {object} map[string]interface{} "success"
// @Failure 400 {object} map[string]interface{} "error"
// @Failure 404 {object} map[string]interface{} "error"
// @Router /api/catches/{id} [get]
func (cc *CatchController) GetCatchById(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid catch ID format",
		})
		return
	}

	catch, err := cc.catchRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Catch not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": catch,
	})
}
