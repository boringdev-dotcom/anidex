package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuthProvider string

const (
	AuthProviderLocal    AuthProvider = "local"
	AuthProviderGoogle   AuthProvider = "google"
	AuthProviderFacebook AuthProvider = "facebook"
	AuthProviderFirebase AuthProvider = "firebase"
)

type User struct {
	ID           uuid.UUID    `gorm:"type:uuid;primary_key" json:"id"`
	Email        string       `gorm:"uniqueIndex;not null" json:"email"`
	Username     string       `gorm:"uniqueIndex" json:"username"`
	Password     string       `json:"-"`
	Name         string       `json:"name"`
	Avatar       string       `json:"avatar"`
	Provider     AuthProvider `gorm:"type:varchar(20);default:'local'" json:"provider"`
	ProviderID   string       `json:"-"`
	RefreshToken string       `json:"-"`
	CreatedAt    time.Time    `json:"created_at"`
	UpdatedAt    time.Time    `json:"updated_at"`
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	u.ID = uuid.New()
	return nil
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type RegisterRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Username string `json:"username" binding:"required,min=3,max=30"`
	Password string `json:"password" binding:"required,min=6"`
	Name     string `json:"name" binding:"required"`
}

type AuthResponse struct {
	User         User   `json:"user"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" binding:"required"`
}