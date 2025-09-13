package repositories

import (
	"github.com/anidex/backend/internal/config"
	"github.com/anidex/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type LocationRepository struct {
	db *gorm.DB
}

func NewLocationRepository() *LocationRepository {
	return &LocationRepository{
		db: config.DB,
	}
}

// Create creates a new location record
func (r *LocationRepository) Create(location *models.Location) error {
	return r.db.Create(location).Error
}

// GetByID retrieves a location by its ID
func (r *LocationRepository) GetByID(id uuid.UUID) (*models.Location, error) {
	var location models.Location
	err := r.db.Where("id = ?", id).First(&location).Error
	if err != nil {
		return nil, err
	}
	return &location, nil
}

// FindNearby finds a location within the specified radius (in km) of given coordinates
func (r *LocationRepository) FindNearby(lat, lng, radiusKm float64) (*models.Location, error) {
	var locations []models.Location
	
	// Get all locations
	err := r.db.Find(&locations).Error
	if err != nil {
		return nil, err
	}
	
	// Find the closest location within radius using Go calculation
	var closestLocation *models.Location
	var closestDistance float64 = radiusKm + 1 // Start with distance greater than radius
	
	targetLocation := &models.Location{
		Latitude:  lat,
		Longitude: lng,
	}
	
	for _, location := range locations {
		distance := location.DistanceTo(targetLocation)
		if distance <= radiusKm && distance < closestDistance {
			closestDistance = distance
			closestLocation = &location
		}
	}
	
	if closestLocation == nil {
		return nil, gorm.ErrRecordNotFound
	}
	
	return closestLocation, nil
}

// GetNearbyWithCatches retrieves locations within radius that have animal catches
func (r *LocationRepository) GetNearbyWithCatches(lat, lng, radiusKm float64) ([]models.Location, error) {
	var locations []models.Location
	
	// Get all locations
	err := r.db.Find(&locations).Error
	if err != nil {
		return nil, err
	}
	
	// Filter by distance using Go calculation
	var nearbyLocations []models.Location
	targetLocation := &models.Location{
		Latitude:  lat,
		Longitude: lng,
	}
	
	for _, location := range locations {
		distance := location.DistanceTo(targetLocation)
		if distance <= radiusKm {
			nearbyLocations = append(nearbyLocations, location)
		}
	}
	
	return nearbyLocations, nil
}

// GetHotspots retrieves popular locations with high animal activity
func (r *LocationRepository) GetHotspots(limit int) ([]models.Location, error) {
	var locations []models.Location
	
	err := r.db.
		Preload("AnimalCatches", func(db *gorm.DB) *gorm.DB {
			return db.Where("is_public = ?", true).Limit(10)
		}).
		Where("catch_count > ?", 5).
		Order("catch_count DESC, species_count DESC").
		Limit(limit).
		Find(&locations).Error
	
	return locations, err
}

// UpdateStats updates location statistics (catch count, species count, etc.)
func (r *LocationRepository) UpdateStats(locationID uuid.UUID) error {
	// Update catch count
	err := r.db.Exec(`
		UPDATE locations 
		SET catch_count = (
			SELECT COUNT(*) FROM animal_catches 
			WHERE location_id = ? AND is_public = true
		)
		WHERE id = ?
	`, locationID, locationID).Error
	
	if err != nil {
		return err
	}
	
	// Update unique species count
	err = r.db.Exec(`
		UPDATE locations 
		SET species_count = (
			SELECT COUNT(DISTINCT species_id) FROM animal_catches 
			WHERE location_id = ? AND is_public = true
		)
		WHERE id = ?
	`, locationID, locationID).Error
	
	if err != nil {
		return err
	}
	
	// Update user count
	err = r.db.Exec(`
		UPDATE locations 
		SET user_count = (
			SELECT COUNT(DISTINCT user_id) FROM animal_catches 
			WHERE location_id = ? AND is_public = true
		)
		WHERE id = ?
	`, locationID, locationID).Error
	
	if err != nil {
		return err
	}
	
	// Update last catch time
	err = r.db.Exec(`
		UPDATE locations 
		SET last_catch_at = (
			SELECT MAX(caught_at) FROM animal_catches 
			WHERE location_id = ? AND is_public = true
		)
		WHERE id = ?
	`, locationID, locationID).Error
	
	return err
}

// GetLocationsByCountry retrieves locations by country with pagination
func (r *LocationRepository) GetLocationsByCountry(country string, limit, offset int) ([]models.Location, int64, error) {
	var locations []models.Location
	var total int64
	
	// Count total records
	err := r.db.Model(&models.Location{}).
		Where("country = ? AND catch_count > 0", country).
		Count(&total).Error
	if err != nil {
		return nil, 0, err
	}
	
	// Get paginated results
	err = r.db.Where("country = ? AND catch_count > 0", country).
		Order("catch_count DESC").
		Limit(limit).Offset(offset).
		Find(&locations).Error
	
	return locations, total, err
}

// Update updates an existing location
func (r *LocationRepository) Update(location *models.Location) error {
	return r.db.Save(location).Error
}

// Delete deletes a location (soft delete)
func (r *LocationRepository) Delete(id uuid.UUID) error {
	return r.db.Delete(&models.Location{}, id).Error
}

