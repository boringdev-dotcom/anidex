package services

import (
	"errors"
	"fmt"

	"github.com/anidex/backend/internal/models"
	"github.com/anidex/backend/internal/repositories"
	"github.com/anidex/backend/internal/utils"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type AuthService interface {
	Register(req *models.RegisterRequest) (*models.AuthResponse, error)
	Login(req *models.LoginRequest) (*models.AuthResponse, error)
	RefreshToken(refreshToken string) (*models.AuthResponse, error)
	GetUserByID(userID uuid.UUID) (*models.User, error)
	HandleOAuthLogin(provider models.AuthProvider, providerID, email, name, avatar string) (*models.AuthResponse, error)
}

type authService struct {
	userRepo repositories.UserRepository
}

func NewAuthService(userRepo repositories.UserRepository) AuthService {
	return &authService{
		userRepo: userRepo,
	}
}

func (s *authService) Register(req *models.RegisterRequest) (*models.AuthResponse, error) {
	existingUser, _ := s.userRepo.FindByEmail(req.Email)
	if existingUser != nil {
		return nil, errors.New("email already registered")
	}

	existingUser, _ = s.userRepo.FindByUsername(req.Username)
	if existingUser != nil {
		return nil, errors.New("username already taken")
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Email:    req.Email,
		Username: req.Username,
		Password: hashedPassword,
		Name:     req.Name,
		Provider: models.AuthProviderLocal,
	}

	if err := s.userRepo.Create(user); err != nil {
		return nil, err
	}

	return s.generateAuthResponse(user)
}

func (s *authService) Login(req *models.LoginRequest) (*models.AuthResponse, error) {
	user, err := s.userRepo.FindByEmail(req.Email)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid credentials")
		}
		return nil, err
	}

	if user.Provider != models.AuthProviderLocal {
		return nil, fmt.Errorf("please login with %s", user.Provider)
	}

	if err := utils.ComparePassword(user.Password, req.Password); err != nil {
		return nil, errors.New("invalid credentials")
	}

	return s.generateAuthResponse(user)
}

func (s *authService) RefreshToken(refreshToken string) (*models.AuthResponse, error) {
	userID, err := utils.ValidateRefreshToken(refreshToken)
	if err != nil {
		return nil, errors.New("invalid refresh token")
	}

	user, err := s.userRepo.FindByID(userID)
	if err != nil {
		return nil, errors.New("user not found")
	}

	if user.RefreshToken != refreshToken {
		return nil, errors.New("invalid refresh token")
	}

	return s.generateAuthResponse(user)
}

func (s *authService) GetUserByID(userID uuid.UUID) (*models.User, error) {
	return s.userRepo.FindByID(userID)
}

func (s *authService) HandleOAuthLogin(provider models.AuthProvider, providerID, email, name, avatar string) (*models.AuthResponse, error) {
	user, err := s.userRepo.FindByProviderID(provider, providerID)
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}

		existingUser, _ := s.userRepo.FindByEmail(email)
		if existingUser != nil {
			if existingUser.Provider != provider {
				return nil, fmt.Errorf("email already registered with %s", existingUser.Provider)
			}
		}

		user = &models.User{
			Email:      email,
			Name:       name,
			Avatar:     avatar,
			Provider:   provider,
			ProviderID: providerID,
		}

		if err := s.userRepo.Create(user); err != nil {
			return nil, err
		}
	}

	return s.generateAuthResponse(user)
}

func (s *authService) generateAuthResponse(user *models.User) (*models.AuthResponse, error) {
	accessToken, err := utils.GenerateAccessToken(user.ID, user.Email, user.Username)
	if err != nil {
		return nil, err
	}

	refreshToken, err := utils.GenerateRefreshToken(user.ID)
	if err != nil {
		return nil, err
	}

	if err := s.userRepo.UpdateRefreshToken(user.ID, refreshToken); err != nil {
		return nil, err
	}

	return &models.AuthResponse{
		User:         *user,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
	}, nil
}