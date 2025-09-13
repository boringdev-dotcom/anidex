package repositories

import (
	"github.com/anidex/backend/internal/config"
	"github.com/anidex/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type SpeciesRepository struct {
	db *gorm.DB
}

func NewSpeciesRepository() *SpeciesRepository {
	return &SpeciesRepository{
		db: config.DB,
	}
}

// CreateSpecies creates a new species record
func (r *SpeciesRepository) CreateSpecies(species *models.Species) error {
	return r.db.Create(species).Error
}

// GetSpeciesByID retrieves a species by ID
func (r *SpeciesRepository) GetSpeciesByID(id uuid.UUID) (*models.Species, error) {
	var species models.Species
	err := r.db.First(&species, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &species, nil
}

// GetSpeciesByScientificName retrieves a species by scientific name
func (r *SpeciesRepository) GetSpeciesByScientificName(scientificName string) (*models.Species, error) {
	var species models.Species
	err := r.db.First(&species, "scientific_name = ?", scientificName).Error
	if err != nil {
		return nil, err
	}
	return &species, nil
}

// GetSpeciesByCategory retrieves all species in a category
func (r *SpeciesRepository) GetSpeciesByCategory(category models.AnimalCategory, limit, offset int) ([]models.Species, error) {
	var species []models.Species
	err := r.db.Where("category = ? AND is_active = ?", category, true).
		Limit(limit).Offset(offset).
		Find(&species).Error
	return species, err
}

// GetSpeciesByRarity retrieves all species of a specific rarity
func (r *SpeciesRepository) GetSpeciesByRarity(rarity models.Rarity, limit, offset int) ([]models.Species, error) {
	var species []models.Species
	err := r.db.Where("rarity = ? AND is_active = ?", rarity, true).
		Limit(limit).Offset(offset).
		Find(&species).Error
	return species, err
}

// SearchSpecies searches species by name (common or scientific)
func (r *SpeciesRepository) SearchSpecies(query string, limit, offset int) ([]models.Species, error) {
	var species []models.Species
	searchPattern := "%" + query + "%"
	err := r.db.Where("(common_name ILIKE ? OR scientific_name ILIKE ?) AND is_active = ?", 
		searchPattern, searchPattern, true).
		Limit(limit).Offset(offset).
		Find(&species).Error
	return species, err
}

// GetPopularSpecies retrieves species ordered by catch count
func (r *SpeciesRepository) GetPopularSpecies(limit, offset int) ([]models.Species, error) {
	var species []models.Species
	err := r.db.Select("species.*, COUNT(animal_catches.id) as catch_count").
		Joins("LEFT JOIN animal_catches ON species.id = animal_catches.species_id").
		Where("species.is_active = ?", true).
		Group("species.id").
		Order("catch_count DESC").
		Limit(limit).Offset(offset).
		Find(&species).Error
	return species, err
}

// GetEndangeredSpecies retrieves endangered species
func (r *SpeciesRepository) GetEndangeredSpecies(limit, offset int) ([]models.Species, error) {
	var species []models.Species
	endangeredStatuses := []models.ConservationStatus{
		models.StatusVulnerable,
		models.StatusEndangered,
		models.StatusCriticallyEndangered,
	}
	err := r.db.Where("conservation_status IN ? AND is_active = ?", endangeredStatuses, true).
		Limit(limit).Offset(offset).
		Find(&species).Error
	return species, err
}

// UpdateSpecies updates an existing species
func (r *SpeciesRepository) UpdateSpecies(species *models.Species) error {
	return r.db.Save(species).Error
}

// DeleteSpecies soft deletes a species (sets is_active to false)
func (r *SpeciesRepository) DeleteSpecies(id uuid.UUID) error {
	return r.db.Model(&models.Species{}).Where("id = ?", id).Update("is_active", false).Error
}

// GetSpeciesCount returns total count of active species
func (r *SpeciesRepository) GetSpeciesCount() (int64, error) {
	var count int64
	err := r.db.Model(&models.Species{}).Where("is_active = ?", true).Count(&count).Error
	return count, err
}

// GetSpeciesCountByCategory returns count of species by category
func (r *SpeciesRepository) GetSpeciesCountByCategory(category models.AnimalCategory) (int64, error) {
	var count int64
	err := r.db.Model(&models.Species{}).
		Where("category = ? AND is_active = ?", category, true).
		Count(&count).Error
	return count, err
}
