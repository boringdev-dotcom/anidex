package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ConservationStatus represents IUCN Red List status
type ConservationStatus string

const (
	StatusNotEvaluated      ConservationStatus = "NE"  // Not Evaluated
	StatusDataDeficient     ConservationStatus = "DD"  // Data Deficient
	StatusLeastConcern      ConservationStatus = "LC"  // Least Concern
	StatusNearThreatened    ConservationStatus = "NT"  // Near Threatened
	StatusVulnerable        ConservationStatus = "VU"  // Vulnerable
	StatusEndangered        ConservationStatus = "EN"  // Endangered
	StatusCriticallyEndangered ConservationStatus = "CR" // Critically Endangered
	StatusExtinctInWild     ConservationStatus = "EW"  // Extinct in the Wild
	StatusExtinct           ConservationStatus = "EX"  // Extinct
)

// AnimalCategory represents the broad category of animals
type AnimalCategory string

const (
	CategoryMammal     AnimalCategory = "mammal"
	CategoryBird       AnimalCategory = "bird"
	CategoryReptile    AnimalCategory = "reptile"
	CategoryAmphibian  AnimalCategory = "amphibian"
	CategoryFish       AnimalCategory = "fish"
	CategoryInsect     AnimalCategory = "insect"
	CategoryArachnid   AnimalCategory = "arachnid"
	CategoryMollusk    AnimalCategory = "mollusk"
	CategoryCrustacean AnimalCategory = "crustacean"
	CategoryOther      AnimalCategory = "other"
)

// Rarity represents how difficult it is to spot this animal
type Rarity string

const (
	RarityCommon    Rarity = "common"    // Easy to find, low points
	RarityUncommon  Rarity = "uncommon"  // Moderate difficulty
	RarityRare      Rarity = "rare"      // Hard to find
	RarityEpic      Rarity = "epic"      // Very rare
	RarityLegendary Rarity = "legendary" // Extremely rare, high points
)

// Species represents the master data for all animal types
type Species struct {
	ID                uuid.UUID          `gorm:"type:uuid;primary_key" json:"id"`
	CommonName        string             `gorm:"not null;index" json:"common_name"`
	ScientificName    string             `gorm:"not null;uniqueIndex" json:"scientific_name"`
	Category          AnimalCategory     `gorm:"type:varchar(20);not null;index" json:"category"`
	Family            string             `json:"family"`
	Genus             string             `json:"genus"`
	
	// Physical characteristics
	Description       string             `gorm:"type:text" json:"description"`
	AverageWeight     *float64           `json:"average_weight"` // in kg
	AverageLength     *float64           `json:"average_length"` // in cm
	AverageLifespan   *int               `json:"average_lifespan"` // in years
	
	// Habitat and behavior
	Habitat           string             `json:"habitat"`
	Diet              string             `json:"diet"` // carnivore, herbivore, omnivore
	Behavior          string             `gorm:"type:text" json:"behavior"`
	GeographicRange   string             `gorm:"type:text" json:"geographic_range"`
	
	// Conservation and rarity
	ConservationStatus ConservationStatus `gorm:"type:varchar(2);default:'LC'" json:"conservation_status"`
	Rarity            Rarity             `gorm:"type:varchar(20);default:'common'" json:"rarity"`
	
	// Game mechanics
	BasePoints        int                `gorm:"default:10" json:"base_points"` // Points awarded for catching
	DifficultyLevel   int                `gorm:"default:1;check:difficulty_level >= 1 AND difficulty_level <= 10" json:"difficulty_level"`
	
	// Media
	DefaultImageURL   string             `json:"default_image_url"`
	WikipediaURL      string             `json:"wikipedia_url"`
	SoundURL          string             `json:"sound_url"` // Animal sound/call
	
	// Metadata
	IsActive          bool               `gorm:"default:true" json:"is_active"`
	CreatedAt         time.Time          `json:"created_at"`
	UpdatedAt         time.Time          `json:"updated_at"`
	
	// Relationships
	AnimalCatches     []AnimalCatch      `gorm:"foreignKey:SpeciesID" json:"animal_catches,omitempty"`
}

func (s *Species) BeforeCreate(tx *gorm.DB) error {
	s.ID = uuid.New()
	return nil
}

// GetRarityMultiplier returns the point multiplier based on rarity
func (s *Species) GetRarityMultiplier() float64 {
	switch s.Rarity {
	case RarityCommon:
		return 1.0
	case RarityUncommon:
		return 1.5
	case RarityRare:
		return 2.0
	case RarityEpic:
		return 3.0
	case RarityLegendary:
		return 5.0
	default:
		return 1.0
	}
}

// CalculatePoints calculates total points for catching this species
func (s *Species) CalculatePoints() int {
	basePoints := float64(s.BasePoints)
	rarityMultiplier := s.GetRarityMultiplier()
	difficultyMultiplier := 1.0 + (float64(s.DifficultyLevel-1) * 0.1)
	
	return int(basePoints * rarityMultiplier * difficultyMultiplier)
}

// IsEndangered returns true if the species is threatened/endangered
func (s *Species) IsEndangered() bool {
	return s.ConservationStatus == StatusVulnerable ||
		s.ConservationStatus == StatusEndangered ||
		s.ConservationStatus == StatusCriticallyEndangered
}
