package models

import (
	"math"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// BadgeType represents the category of badge
type BadgeType string

const (
	BadgeTypeSpecies     BadgeType = "species"     // Species-specific badges (catch 10 cats, etc.)
	BadgeTypeLocation    BadgeType = "location"    // Location-based badges (visit 5 countries, etc.)
	BadgeTypeCount       BadgeType = "count"       // Count-based badges (catch 100 animals, etc.)
	BadgeTypeRarity      BadgeType = "rarity"      // Rarity-based badges (catch legendary animal, etc.)
	BadgeTypeStreak      BadgeType = "streak"      // Streak badges (daily catch for 7 days, etc.)
	BadgeTypeSocial      BadgeType = "social"      // Social badges (get 100 likes, etc.)
	BadgeTypeConservation BadgeType = "conservation" // Conservation awareness badges
	BadgeTypeTime        BadgeType = "time"        // Time-based badges (night owl, early bird, etc.)
	BadgeTypeSeasonal    BadgeType = "seasonal"    // Seasonal/event badges
	BadgeTypeSpecial     BadgeType = "special"     // Special achievement badges
)

// BadgeRarity represents how difficult the badge is to earn
type BadgeRarity string

const (
	BadgeRarityBronze   BadgeRarity = "bronze"
	BadgeRaritySilver   BadgeRarity = "silver"
	BadgeRarityGold     BadgeRarity = "gold"
	BadgeRarityPlatinum BadgeRarity = "platinum"
	BadgeRarityDiamond  BadgeRarity = "diamond"
)

// Badge represents an achievement badge that users can earn
type Badge struct {
	ID            uuid.UUID   `gorm:"type:uuid;primary_key" json:"id"`
	
	// Basic information
	Name          string      `gorm:"not null;uniqueIndex" json:"name"`
	Description   string      `gorm:"type:text;not null" json:"description"`
	ShortDesc     string      `gorm:"not null" json:"short_desc"` // Brief description for UI
	
	// Badge properties
	BadgeType     BadgeType   `gorm:"type:varchar(20);not null;index" json:"badge_type"`
	BadgeRarity   BadgeRarity `gorm:"type:varchar(20);default:'bronze'" json:"badge_rarity"`
	
	// Visual
	IconURL       string      `json:"icon_url"`
	Color         string      `gorm:"type:varchar(7)" json:"color"` // Hex color code
	
	// Requirements (stored as JSON or specific fields)
	RequiredCount *int        `json:"required_count"` // For count-based badges
	RequiredSpecies []string  `gorm:"type:text[]" json:"required_species"` // Species IDs
	RequiredLocationType *LocationType `gorm:"type:varchar(20)" json:"required_location_type"`
	RequiredRarity *Rarity   `gorm:"type:varchar(20)" json:"required_rarity"`
	RequiredDays  *int        `json:"required_days"` // For streak badges
	
	// Points and rewards
	PointsAwarded int         `gorm:"default:0" json:"points_awarded"`
	IsSecret      bool        `gorm:"default:false" json:"is_secret"` // Hidden until earned
	
	// Metadata
	IsActive      bool        `gorm:"default:true" json:"is_active"`
	CreatedAt     time.Time   `json:"created_at"`
	UpdatedAt     time.Time   `json:"updated_at"`
	
	// Relationships
	UserBadges    []UserBadge `gorm:"foreignKey:BadgeID" json:"user_badges,omitempty"`
}

func (b *Badge) BeforeCreate(tx *gorm.DB) error {
	b.ID = uuid.New()
	return nil
}

// UserBadge represents a badge earned by a user
type UserBadge struct {
	ID        uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;not null;index" json:"user_id"`
	BadgeID   uuid.UUID `gorm:"type:uuid;not null;index" json:"badge_id"`
	
	// Progress tracking
	Progress  int       `gorm:"default:0" json:"progress"` // Current progress towards badge
	MaxProgress int     `gorm:"default:1" json:"max_progress"` // Required progress to earn
	
	// Achievement details
	EarnedAt  *time.Time `json:"earned_at"` // null if not yet earned
	
	// Related data for earning the badge
	RelatedCatchID *uuid.UUID `gorm:"type:uuid" json:"related_catch_id"` // Catch that earned the badge
	
	// Display preferences
	IsDisplayed bool      `gorm:"default:true" json:"is_displayed"` // Show on profile
	DisplayOrder int      `gorm:"default:0" json:"display_order"`
	
	// Metadata
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
	
	// Relationships
	User      User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Badge     Badge       `gorm:"foreignKey:BadgeID" json:"badge,omitempty"`
	RelatedCatch *AnimalCatch `gorm:"foreignKey:RelatedCatchID" json:"related_catch,omitempty"`
}

func (ub *UserBadge) BeforeCreate(tx *gorm.DB) error {
	ub.ID = uuid.New()
	return nil
}

// IsEarned returns true if the user has earned this badge
func (ub *UserBadge) IsEarned() bool {
	return ub.EarnedAt != nil
}

// IsCompleted returns true if progress is complete
func (ub *UserBadge) IsCompleted() bool {
	return ub.Progress >= ub.MaxProgress
}

// GetProgressPercentage returns progress as percentage (0-100)
func (ub *UserBadge) GetProgressPercentage() float64 {
	if ub.MaxProgress == 0 {
		return 0
	}
	percentage := float64(ub.Progress) / float64(ub.MaxProgress) * 100
	if percentage > 100 {
		return 100
	}
	return percentage
}

// UserStats represents aggregated statistics for a user
type UserStats struct {
	ID                uuid.UUID `gorm:"type:uuid;primary_key" json:"id"`
	UserID            uuid.UUID `gorm:"type:uuid;not null;uniqueIndex" json:"user_id"`
	
	// Catch statistics
	TotalCatches      int       `gorm:"default:0" json:"total_catches"`
	UniqueSpecies     int       `gorm:"default:0" json:"unique_species"`
	TotalPoints       int       `gorm:"default:0" json:"total_points"`
	
	// Streak information
	CurrentStreak     int       `gorm:"default:0" json:"current_streak"`
	LongestStreak     int       `gorm:"default:0" json:"longest_streak"`
	LastCatchDate     *time.Time `json:"last_catch_date"`
	
	// Rarity catches
	CommonCatches     int       `gorm:"default:0" json:"common_catches"`
	UncommonCatches   int       `gorm:"default:0" json:"uncommon_catches"`
	RareCatches       int       `gorm:"default:0" json:"rare_catches"`
	EpicCatches       int       `gorm:"default:0" json:"epic_catches"`
	LegendaryCatches  int       `gorm:"default:0" json:"legendary_catches"`
	
	// Category catches
	MammalCatches     int       `gorm:"default:0" json:"mammal_catches"`
	BirdCatches       int       `gorm:"default:0" json:"bird_catches"`
	ReptileCatches    int       `gorm:"default:0" json:"reptile_catches"`
	AmphibianCatches  int       `gorm:"default:0" json:"amphibian_catches"`
	FishCatches       int       `gorm:"default:0" json:"fish_catches"`
	InsectCatches     int       `gorm:"default:0" json:"insect_catches"`
	OtherCatches      int       `gorm:"default:0" json:"other_catches"`
	
	// Location statistics
	CountriesVisited  int       `gorm:"default:0" json:"countries_visited"`
	CitiesVisited     int       `gorm:"default:0" json:"cities_visited"`
	FarthestDistance  float64   `gorm:"default:0" json:"farthest_distance"` // km from home
	
	// Social statistics
	BadgesEarned      int       `gorm:"default:0" json:"badges_earned"`
	FollowersCount    int       `gorm:"default:0" json:"followers_count"`
	FollowingCount    int       `gorm:"default:0" json:"following_count"`
	TotalLikes        int       `gorm:"default:0" json:"total_likes"` // Likes received
	TotalComments     int       `gorm:"default:0" json:"total_comments"` // Comments received
	
	// Rankings
	GlobalRank        *int      `json:"global_rank"`
	CountryRank       *int      `json:"country_rank"`
	CityRank          *int      `json:"city_rank"`
	
	// Metadata
	LastUpdated       time.Time `json:"last_updated"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
	
	// Relationships
	User              User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

func (us *UserStats) BeforeCreate(tx *gorm.DB) error {
	us.ID = uuid.New()
	return nil
}

// GetLevel calculates user level based on total points
func (us *UserStats) GetLevel() int {
	// Level formula: level = floor(sqrt(points / 100)) + 1
	// This means: Level 1: 0-99 points, Level 2: 100-399 points, etc.
	if us.TotalPoints < 100 {
		return 1
	}
	return int(math.Sqrt(float64(us.TotalPoints)/100)) + 1
}

// GetPointsToNextLevel calculates points needed for next level
func (us *UserStats) GetPointsToNextLevel() int {
	currentLevel := us.GetLevel()
	nextLevelPoints := (currentLevel * currentLevel) * 100
	return nextLevelPoints - us.TotalPoints
}
