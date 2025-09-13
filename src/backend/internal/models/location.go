package models

import (
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// LocationType represents the type of location
type LocationType string

const (
	LocationWilderness  LocationType = "wilderness"   // National parks, forests, etc.
	LocationUrban       LocationType = "urban"        // Cities, towns
	LocationSuburban    LocationType = "suburban"     // Suburban areas
	LocationZoo         LocationType = "zoo"          // Zoos, wildlife parks
	LocationAquarium    LocationType = "aquarium"     // Aquariums, marine parks
	LocationSanctuary   LocationType = "sanctuary"    // Wildlife sanctuaries
	LocationFarm        LocationType = "farm"         // Farms, ranches
	LocationBeach       LocationType = "beach"        // Beaches, coastal areas
	LocationMountain    LocationType = "mountain"     // Mountains, hills
	LocationDesert      LocationType = "desert"       // Desert areas
	LocationForest      LocationType = "forest"       // Forests, woodlands
	LocationWetland     LocationType = "wetland"      // Swamps, marshes
	LocationOcean       LocationType = "ocean"        // Ocean, deep sea
	LocationRiver       LocationType = "river"        // Rivers, streams
	LocationLake        LocationType = "lake"         // Lakes, ponds
	LocationOther       LocationType = "other"        // Other locations
)

// Location represents a geographic location where animals can be found
type Location struct {
	ID            uuid.UUID    `gorm:"type:uuid;primary_key" json:"id"`
	
	// Geographic coordinates
	Latitude      float64      `gorm:"not null;index:idx_lat_lng" json:"latitude"`
	Longitude     float64      `gorm:"not null;index:idx_lat_lng" json:"longitude"`
	Altitude      *float64     `json:"altitude"` // in meters above sea level
	Accuracy      *float64     `json:"accuracy"` // GPS accuracy in meters
	
	// Address information
	Address       string       `json:"address"`
	City          string       `gorm:"index" json:"city"`
	State         string       `gorm:"index" json:"state"`
	Country       string       `gorm:"index" json:"country"`
	CountryCode   string       `gorm:"type:varchar(2)" json:"country_code"` // ISO 3166-1 alpha-2
	PostalCode    string       `json:"postal_code"`
	
	// Location details
	Name          string       `json:"name"`          // Custom name for this location
	Description   string       `gorm:"type:text" json:"description"`
	LocationType  LocationType `gorm:"type:varchar(20);default:'other'" json:"location_type"`
	
	// Environmental data
	Ecosystem     string       `json:"ecosystem"`     // Forest, savanna, coral reef, etc.
	Climate       string       `json:"climate"`       // Tropical, temperate, arctic, etc.
	Habitat       string       `json:"habitat"`       // The specific habitat type
	
	// Location statistics
	CatchCount    int          `gorm:"default:0" json:"catch_count"`     // Total catches at this location
	SpeciesCount  int          `gorm:"default:0" json:"species_count"`   // Unique species found here
	UserCount     int          `gorm:"default:0" json:"user_count"`      // Unique users who caught here
	LastCatchAt   *time.Time   `json:"last_catch_at"`                    // Most recent catch
	
	// Safety and accessibility
	SafetyRating  *int         `gorm:"check:safety_rating >= 1 AND safety_rating <= 5" json:"safety_rating"` // 1-5 stars
	Accessibility string       `json:"accessibility"`  // Easy, moderate, difficult
	IsPublic      bool         `gorm:"default:true" json:"is_public"`
	RequiresPermit bool        `gorm:"default:false" json:"requires_permit"`
	
	// Metadata
	CreatedAt     time.Time    `json:"created_at"`
	UpdatedAt     time.Time    `json:"updated_at"`
	
	// Relationships
	AnimalCatches []AnimalCatch `gorm:"foreignKey:LocationID" json:"animal_catches,omitempty"`
}

func (l *Location) BeforeCreate(tx *gorm.DB) error {
	l.ID = uuid.New()
	return nil
}

// DistanceTo calculates the distance between two locations using Haversine formula
// Returns distance in kilometers
func (l *Location) DistanceTo(other *Location) float64 {
	const earthRadius = 6371.0 // Earth's radius in kilometers
	
	lat1Rad := l.Latitude * math.Pi / 180
	lat2Rad := other.Latitude * math.Pi / 180
	deltaLat := (other.Latitude - l.Latitude) * math.Pi / 180
	deltaLng := (other.Longitude - l.Longitude) * math.Pi / 180
	
	a := math.Sin(deltaLat/2)*math.Sin(deltaLat/2) +
		math.Cos(lat1Rad)*math.Cos(lat2Rad)*
		math.Sin(deltaLng/2)*math.Sin(deltaLng/2)
	
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	
	return earthRadius * c
}

// IsNearby checks if this location is within the specified radius (in km) of another location
func (l *Location) IsNearby(other *Location, radiusKm float64) bool {
	return l.DistanceTo(other) <= radiusKm
}

// GetCoordinatesString returns coordinates as a formatted string
func (l *Location) GetCoordinatesString() string {
	return fmt.Sprintf("%.6f,%.6f", l.Latitude, l.Longitude)
}

// Hotspot represents a popular location for animal spotting
type Hotspot struct {
	ID            uuid.UUID    `gorm:"type:uuid;primary_key" json:"id"`
	LocationID    uuid.UUID    `gorm:"type:uuid;not null;uniqueIndex" json:"location_id"`
	
	// Hotspot details
	Name          string       `gorm:"not null" json:"name"`
	Description   string       `gorm:"type:text" json:"description"`
	BestTimeToVisit string     `json:"best_time_to_visit"`
	PeakSeason    string       `json:"peak_season"`
	
	// Statistics
	PopularityScore int        `gorm:"default:0" json:"popularity_score"` // Algorithm-based score
	WeeklyCatches   int        `gorm:"default:0" json:"weekly_catches"`
	MonthlyCatches  int        `gorm:"default:0" json:"monthly_catches"`
	TopSpecies      []string   `gorm:"type:text[]" json:"top_species"` // Most common species IDs
	
	// Features
	HasParking      bool         `gorm:"default:false" json:"has_parking"`
	HasRestrooms    bool         `gorm:"default:false" json:"has_restrooms"`
	HasFood         bool         `gorm:"default:false" json:"has_food"`
	HasGuides       bool         `gorm:"default:false" json:"has_guides"`
	EntryFee        *float64     `json:"entry_fee"` // Cost in local currency
	
	// Admin
	IsVerified      bool         `gorm:"default:false" json:"is_verified"`
	IsActive        bool         `gorm:"default:true" json:"is_active"`
	CreatedAt       time.Time    `json:"created_at"`
	UpdatedAt       time.Time    `json:"updated_at"`
	
	// Relationships
	Location        Location     `gorm:"foreignKey:LocationID" json:"location,omitempty"`
}

func (h *Hotspot) BeforeCreate(tx *gorm.DB) error {
	h.ID = uuid.New()
	return nil
}

// UserLocationHistory tracks user's location history for privacy and analytics
type UserLocationHistory struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	
	Latitude  float64   `gorm:"not null" json:"latitude"`
	Longitude float64   `gorm:"not null" json:"longitude"`
	Accuracy  *float64  `json:"accuracy"`
	
	// Metadata
	RecordedAt time.Time `gorm:"not null;index" json:"recorded_at"`
	
	// Relationships
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (ulh *UserLocationHistory) BeforeCreate(tx *gorm.DB) error {
	ulh.ID = uuid.New()
	if ulh.RecordedAt.IsZero() {
		ulh.RecordedAt = time.Now()
	}
	return nil
}
