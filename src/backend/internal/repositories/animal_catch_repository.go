package repositories

import (
	"github.com/anidex/backend/internal/config"
	"github.com/anidex/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AnimalCatchRepository struct {
	db *gorm.DB
}

func NewAnimalCatchRepository() *AnimalCatchRepository {
	return &AnimalCatchRepository{
		db: config.DB,
	}
}

// Create creates a new animal catch record
func (r *AnimalCatchRepository) Create(catch *models.AnimalCatch) error {
	return r.db.Create(catch).Error
}

// GetByID retrieves an animal catch by its ID with relationships loaded
func (r *AnimalCatchRepository) GetByID(id uuid.UUID) (*models.AnimalCatch, error) {
	var catch models.AnimalCatch
	err := r.db.Preload("User").Preload("Species").Preload("Location").
		Where("id = ?", id).First(&catch).Error
	if err != nil {
		return nil, err
	}
	return &catch, nil
}

// GetByUserID retrieves all catches by a specific user with pagination
func (r *AnimalCatchRepository) GetByUserID(userID uuid.UUID, limit, offset int) ([]models.AnimalCatch, int64, error) {
	var catches []models.AnimalCatch
	var total int64

	// Count total records
	err := r.db.Model(&models.AnimalCatch{}).Where("user_id = ?", userID).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Get paginated results with relationships
	err = r.db.Preload("Species").Preload("Location").
		Where("user_id = ?", userID).
		Order("caught_at DESC").
		Limit(limit).Offset(offset).
		Find(&catches).Error

	return catches, total, err
}

// GetByLocationID retrieves all catches at a specific location with pagination
func (r *AnimalCatchRepository) GetByLocationID(locationID uuid.UUID, limit, offset int) ([]models.AnimalCatch, int64, error) {
	var catches []models.AnimalCatch
	var total int64

	// Count total records
	err := r.db.Model(&models.AnimalCatch{}).Where("location_id = ?", locationID).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Get paginated results with relationships
	err = r.db.Preload("User").Preload("Species").Preload("Location").
		Where("location_id = ? AND is_public = ?", locationID, true).
		Order("caught_at DESC").
		Limit(limit).Offset(offset).
		Find(&catches).Error

	return catches, total, err
}

// GetBySpeciesID retrieves all catches of a specific species with pagination
func (r *AnimalCatchRepository) GetBySpeciesID(speciesID uuid.UUID, limit, offset int) ([]models.AnimalCatch, int64, error) {
	var catches []models.AnimalCatch
	var total int64

	// Count total records
	err := r.db.Model(&models.AnimalCatch{}).Where("species_id = ?", speciesID).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Get paginated results with relationships
	err = r.db.Preload("User").Preload("Location").
		Where("species_id = ? AND is_public = ?", speciesID, true).
		Order("caught_at DESC").
		Limit(limit).Offset(offset).
		Find(&catches).Error

	return catches, total, err
}

// IsFirstCatchForUser checks if this would be the user's first catch of this species
func (r *AnimalCatchRepository) IsFirstCatchForUser(userID, speciesID uuid.UUID) (bool, error) {
	var count int64
	err := r.db.Model(&models.AnimalCatch{}).
		Where("user_id = ? AND species_id = ?", userID, speciesID).
		Count(&count).Error
	return count == 0, err
}

// GetRecentPublicCatches retrieves recent public catches for feed
func (r *AnimalCatchRepository) GetRecentPublicCatches(limit, offset int) ([]models.AnimalCatch, int64, error) {
	var catches []models.AnimalCatch
	var total int64

	// Count total public records
	err := r.db.Model(&models.AnimalCatch{}).Where("is_public = ?", true).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Get paginated results with relationships
	err = r.db.Preload("User").Preload("Species").Preload("Location").
		Where("is_public = ? AND verification_status = ?", true, models.VerificationApproved).
		Order("caught_at DESC").
		Limit(limit).Offset(offset).
		Find(&catches).Error

	return catches, total, err
}

// GetUserStats retrieves statistics for a user's catches
func (r *AnimalCatchRepository) GetUserStats(userID uuid.UUID) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Total catches
	var totalCatches int64
	err := r.db.Model(&models.AnimalCatch{}).Where("user_id = ?", userID).Count(&totalCatches).Error
	if err != nil {
		return nil, err
	}
	stats["total_catches"] = totalCatches

	// Unique species caught
	var uniqueSpecies int64
	err = r.db.Model(&models.AnimalCatch{}).
		Where("user_id = ?", userID).
		Distinct("species_id").
		Count(&uniqueSpecies).Error
	if err != nil {
		return nil, err
	}
	stats["unique_species"] = uniqueSpecies

	// Total points earned
	var totalPoints int64
	err = r.db.Model(&models.AnimalCatch{}).
		Where("user_id = ?", userID).
		Select("COALESCE(SUM(points_awarded), 0)").
		Scan(&totalPoints).Error
	if err != nil {
		return nil, err
	}
	stats["total_points"] = totalPoints

	// Verified catches
	var verifiedCatches int64
	err = r.db.Model(&models.AnimalCatch{}).
		Where("user_id = ? AND verification_status IN ?", userID, 
			[]models.VerificationStatus{models.VerificationApproved, models.VerificationAuto}).
		Count(&verifiedCatches).Error
	if err != nil {
		return nil, err
	}
	stats["verified_catches"] = verifiedCatches

	return stats, nil
}

// Update updates an existing animal catch
func (r *AnimalCatchRepository) Update(catch *models.AnimalCatch) error {
	return r.db.Save(catch).Error
}

// Delete deletes an animal catch (soft delete)
func (r *AnimalCatchRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.AnimalCatch{}, id).Error
}
