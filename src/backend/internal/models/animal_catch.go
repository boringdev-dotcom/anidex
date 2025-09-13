package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// VerificationStatus represents the verification state of an animal catch
type VerificationStatus string

const (
	VerificationPending  VerificationStatus = "pending"
	VerificationApproved VerificationStatus = "approved"
	VerificationRejected VerificationStatus = "rejected"
	VerificationAuto     VerificationStatus = "auto_approved" // AI/ML auto-verification
)

// WeatherCondition represents weather during the catch
type WeatherCondition string

const (
	WeatherSunny   WeatherCondition = "sunny"
	WeatherCloudy  WeatherCondition = "cloudy"
	WeatherRainy   WeatherCondition = "rainy"
	WeatherSnowy   WeatherCondition = "snowy"
	WeatherFoggy   WeatherCondition = "foggy"
	WeatherStorm   WeatherCondition = "storm"
	WeatherUnknown WeatherCondition = "unknown"
)

// TimeOfDay represents when the animal was spotted
type TimeOfDay string

const (
	TimeDawn      TimeOfDay = "dawn"      // 5-7 AM
	TimeMorning   TimeOfDay = "morning"   // 7-11 AM
	TimeNoon      TimeOfDay = "noon"      // 11 AM - 1 PM
	TimeAfternoon TimeOfDay = "afternoon" // 1-5 PM
	TimeEvening   TimeOfDay = "evening"   // 5-8 PM
	TimeDusk      TimeOfDay = "dusk"      // 8-9 PM
	TimeNight     TimeOfDay = "night"     // 9 PM - 5 AM
)

// AnimalCatch represents an individual animal encounter/catch by a user
type AnimalCatch struct {
	ID                uuid.UUID          `gorm:"type:uuid;primary_key" json:"id"`
	UserID            uuid.UUID          `gorm:"type:uuid;not null;index" json:"user_id"`
	SpeciesID         uuid.UUID          `gorm:"type:uuid;not null;index" json:"species_id"`
	LocationID        uuid.UUID          `gorm:"type:uuid;not null" json:"location_id"`
	
	// User-generated content
	UserPhotoURL      string             `gorm:"not null" json:"user_photo_url"`
	UserNotes         string             `gorm:"type:text" json:"user_notes"`
	UserRating        *int               `gorm:"check:user_rating >= 1 AND user_rating <= 5" json:"user_rating"` // 1-5 stars
	
	// Verification
	VerificationStatus VerificationStatus `gorm:"type:varchar(20);default:'pending'" json:"verification_status"`
	VerifiedBy        *uuid.UUID         `gorm:"type:uuid" json:"verified_by"` // Admin/Moderator who verified
	VerifiedAt        *time.Time         `json:"verified_at"`
	VerificationNotes string             `gorm:"type:text" json:"verification_notes"`
	
	// Environmental conditions
	Weather           WeatherCondition   `gorm:"type:varchar(20)" json:"weather"`
	TimeOfDay         TimeOfDay          `gorm:"type:varchar(20)" json:"time_of_day"`
	Temperature       *float64           `json:"temperature"` // in Celsius
	
	// Game mechanics
	PointsAwarded     int                `gorm:"default:0" json:"points_awarded"`
	IsFirstCatch      bool               `gorm:"default:false" json:"is_first_catch"` // First time user caught this species
	ComboMultiplier   float64            `gorm:"default:1.0" json:"combo_multiplier"` // Streak bonus
	
	// Social features
	IsPublic          bool               `gorm:"default:true" json:"is_public"`
	LikesCount        int                `gorm:"default:0" json:"likes_count"`
	CommentsCount     int                `gorm:"default:0" json:"comments_count"`
	SharesCount       int                `gorm:"default:0" json:"shares_count"`
	
	// Metadata
	CaughtAt          time.Time          `gorm:"not null;index" json:"caught_at"`
	CreatedAt         time.Time          `json:"created_at"`
	UpdatedAt         time.Time          `json:"updated_at"`
	
	// Relationships
	User              User               `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Species           Species            `gorm:"foreignKey:SpeciesID" json:"species,omitempty"`
	Location          Location           `gorm:"foreignKey:LocationID" json:"location,omitempty"`
	VerifiedByUser    *User              `gorm:"foreignKey:VerifiedBy" json:"verified_by_user,omitempty"`
	Comments          []CatchComment     `gorm:"foreignKey:CatchID" json:"comments,omitempty"`
	Likes             []CatchLike        `gorm:"foreignKey:CatchID" json:"likes,omitempty"`
}

func (ac *AnimalCatch) BeforeCreate(tx *gorm.DB) error {
	ac.ID = uuid.New()
	if ac.CaughtAt.IsZero() {
		ac.CaughtAt = time.Now()
	}
	return nil
}

// CatchComment represents comments on animal catches (social feature)
type CatchComment struct {
	ID        uuid.UUID   `gorm:"type:uuid;primary_key" json:"id"`
	CatchID   uuid.UUID   `gorm:"type:uuid;not null;index" json:"catch_id"`
	UserID    uuid.UUID   `gorm:"type:uuid;not null;index" json:"user_id"`
	Content   string      `gorm:"type:text;not null" json:"content"`
	CreatedAt time.Time   `json:"created_at"`
	UpdatedAt time.Time   `json:"updated_at"`
	
	// Relationships
	User      User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Catch     AnimalCatch `gorm:"foreignKey:CatchID" json:"catch,omitempty"`
}

func (cc *CatchComment) BeforeCreate(tx *gorm.DB) error {
	cc.ID = uuid.New()
	return nil
}

// CatchLike represents likes on animal catches (social feature)
type CatchLike struct {
	ID        uuid.UUID   `gorm:"type:uuid;primary_key" json:"id"`
	CatchID   uuid.UUID   `gorm:"type:uuid;not null;index" json:"catch_id"`
	UserID    uuid.UUID   `gorm:"type:uuid;not null;index" json:"user_id"`
	CreatedAt time.Time   `json:"created_at"`
	
	// Relationships
	User      User        `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Catch     AnimalCatch `gorm:"foreignKey:CatchID" json:"catch,omitempty"`
}

func (cl *CatchLike) BeforeCreate(tx *gorm.DB) error {
	cl.ID = uuid.New()
	return nil
}

// Unique constraint to prevent duplicate likes
func (CatchLike) TableName() string {
	return "catch_likes"
}

// GetTimeOfDayFromHour determines TimeOfDay from hour (0-23)
func GetTimeOfDayFromHour(hour int) TimeOfDay {
	switch {
	case hour >= 5 && hour < 7:
		return TimeDawn
	case hour >= 7 && hour < 11:
		return TimeMorning
	case hour >= 11 && hour < 13:
		return TimeNoon
	case hour >= 13 && hour < 17:
		return TimeAfternoon
	case hour >= 17 && hour < 20:
		return TimeEvening
	case hour >= 20 && hour < 21:
		return TimeDusk
	default:
		return TimeNight
	}
}

// IsVerified returns true if the catch has been verified
func (ac *AnimalCatch) IsVerified() bool {
	return ac.VerificationStatus == VerificationApproved || 
		   ac.VerificationStatus == VerificationAuto
}

// CanEdit returns true if the catch can still be edited (not yet verified)
func (ac *AnimalCatch) CanEdit() bool {
	return ac.VerificationStatus == VerificationPending
}
