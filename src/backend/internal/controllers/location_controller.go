package controllers

import (
	"net/http"
	"strconv"

	"github.com/anidex/backend/internal/repositories"
	"github.com/gin-gonic/gin"
)

type LocationController struct {
	locationRepo *repositories.LocationRepository
	catchRepo    *repositories.AnimalCatchRepository
}

func NewLocationController(locationRepo *repositories.LocationRepository, catchRepo *repositories.AnimalCatchRepository) *LocationController {
	return &LocationController{
		locationRepo: locationRepo,
		catchRepo:    catchRepo,
	}
}

type NearbyLocationsRequest struct {
	Latitude  float64 `form:"lat" binding:"required"`
	Longitude float64 `form:"lng" binding:"required"`
	Radius    float64 `form:"radius"` // in kilometers, default 10km
}

// GetNearbyLocations godoc
// @Summary Get nearby locations with animal catches
// @Description Retrieve locations near the user's position that have animal catches
// @Tags locations
// @Accept json
// @Produce json
// @Param lat query number true "Latitude"
// @Param lng query number true "Longitude"
// @Param radius query number false "Search radius in kilometers" default(10)
// @Success 200 {object} map[string]interface{} "success"
// @Failure 400 {object} map[string]interface{} "error"
// @Failure 500 {object} map[string]interface{} "error"
// @Router /api/locations/nearby [get]
func (lc *LocationController) GetNearbyLocations(c *gin.Context) {
	var req NearbyLocationsRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid location parameters",
			"details": err.Error(),
		})
		return
	}

	// Default radius to 10km if not provided
	if req.Radius <= 0 {
		req.Radius = 10.0
	}

	// Limit radius to reasonable maximum (100km)
	if req.Radius > 100 {
		req.Radius = 100.0
	}

	locations, err := lc.locationRepo.GetNearbyWithCatches(req.Latitude, req.Longitude, req.Radius)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch nearby locations",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": locations,
		"center": gin.H{
			"latitude":  req.Latitude,
			"longitude": req.Longitude,
		},
		"radius_km": req.Radius,
	})
}

// GetLocationCatches godoc
// @Summary Get catches at a specific location
// @Description Retrieve all animal catches at a specific location
// @Tags locations
// @Accept json
// @Produce json
// @Param lat query number true "Latitude"
// @Param lng query number true "Longitude"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Number of items per page" default(20)
// @Success 200 {object} map[string]interface{} "success"
// @Failure 400 {object} map[string]interface{} "error"
// @Failure 500 {object} map[string]interface{} "error"
// @Router /api/locations/catches [get]
func (lc *LocationController) GetLocationCatches(c *gin.Context) {
	latStr := c.Query("lat")
	lngStr := c.Query("lng")

	if latStr == "" || lngStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Latitude and longitude are required",
		})
		return
	}

	lat, err := strconv.ParseFloat(latStr, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid latitude format",
		})
		return
	}

	lng, err := strconv.ParseFloat(lngStr, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid longitude format",
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

	// Find location first
	location, err := lc.locationRepo.FindNearby(lat, lng, 0.1) // Within 100m
	if err != nil || location == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "No location found at these coordinates",
		})
		return
	}

	catches, total, err := lc.catchRepo.GetByLocationID(location.ID, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch catches at location",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": catches,
		"location": location,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}
