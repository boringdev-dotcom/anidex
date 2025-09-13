package controllers

import (
	"net/http"
	"strconv"

	"github.com/anidex/backend/internal/repositories"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type SpeciesController struct {
	speciesRepo *repositories.SpeciesRepository
}

func NewSpeciesController(speciesRepo *repositories.SpeciesRepository) *SpeciesController {
	return &SpeciesController{
		speciesRepo: speciesRepo,
	}
}

// GetAllSpecies godoc
// @Summary Get all animal species
// @Description Retrieve a list of all animal species with optional filtering
// @Tags species
// @Accept json
// @Produce json
// @Param category query string false "Filter by animal category (mammal, bird, etc.)"
// @Param rarity query string false "Filter by rarity (common, uncommon, rare, epic, legendary)"
// @Param page query int false "Page number" default(1)
// @Param limit query int false "Number of items per page" default(20)
// @Success 200 {object} map[string]interface{} "success"
// @Failure 400 {object} map[string]interface{} "error"
// @Failure 500 {object} map[string]interface{} "error"
// @Router /api/species [get]
func (sc *SpeciesController) GetAllSpecies(c *gin.Context) {
	// Parse query parameters
	category := c.Query("category")
	rarity := c.Query("rarity")
	
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	
	offset := (page - 1) * limit
	
	species, total, err := sc.speciesRepo.GetAllWithFilters(category, rarity, limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch species",
			"details": err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": species,
		"pagination": gin.H{
			"page":        page,
			"limit":       limit,
			"total":       total,
			"total_pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

// GetSpeciesById godoc
// @Summary Get species by ID
// @Description Retrieve a specific animal species by its ID
// @Tags species
// @Accept json
// @Produce json
// @Param id path string true "Species ID (UUID)"
// @Success 200 {object} map[string]interface{} "success"
// @Failure 400 {object} map[string]interface{} "error"
// @Failure 404 {object} map[string]interface{} "error"
// @Failure 500 {object} map[string]interface{} "error"
// @Router /api/species/{id} [get]
func (sc *SpeciesController) GetSpeciesById(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid species ID format",
		})
		return
	}
	
	species, err := sc.speciesRepo.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Species not found",
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": species,
	})
}

// SearchSpecies godoc
// @Summary Search species by name
// @Description Search for animal species by common name or scientific name
// @Tags species
// @Accept json
// @Produce json
// @Param q query string true "Search query (common name or scientific name)"
// @Param limit query int false "Number of results" default(10)
// @Success 200 {object} map[string]interface{} "success"
// @Failure 400 {object} map[string]interface{} "error"
// @Failure 500 {object} map[string]interface{} "error"
// @Router /api/species/search [get]
func (sc *SpeciesController) SearchSpecies(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Search query is required",
		})
		return
	}
	
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))
	if limit < 1 || limit > 50 {
		limit = 10
	}
	
	species, err := sc.speciesRepo.SearchByName(query, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to search species",
			"details": err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": species,
		"query": query,
	})
}
