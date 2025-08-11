package controllers

import (
	"net/http"

	"github.com/anidex/backend/internal/config"
	"github.com/anidex/backend/internal/models"
	"github.com/anidex/backend/internal/services"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AuthController struct {
	authService  services.AuthService
	oauthService services.OAuthService
}

func NewAuthController(authService services.AuthService, oauthService services.OAuthService) *AuthController {
	return &AuthController{
		authService:  authService,
		oauthService: oauthService,
	}
}

// Register godoc
// @Summary Register a new user
// @Description Create a new user account
// @Tags auth
// @Accept json
// @Produce json
// @Param request body models.RegisterRequest true "Registration details"
// @Success 201 {object} models.AuthResponse
// @Failure 400 {object} map[string]string
// @Router /api/auth/register [post]
func (ctrl *AuthController) Register(c *gin.Context) {
	var req models.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response, err := ctrl.authService.Register(&req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, response)
}

// Login godoc
// @Summary Login user
// @Description Authenticate user and get tokens
// @Tags auth
// @Accept json
// @Produce json
// @Param request body models.LoginRequest true "Login credentials"
// @Success 200 {object} models.AuthResponse
// @Failure 401 {object} map[string]string
// @Router /api/auth/login [post]
func (ctrl *AuthController) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response, err := ctrl.authService.Login(&req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// RefreshToken godoc
// @Summary Refresh access token
// @Description Get new access token using refresh token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body models.RefreshTokenRequest true "Refresh token"
// @Success 200 {object} models.AuthResponse
// @Failure 401 {object} map[string]string
// @Router /api/auth/refresh [post]
func (ctrl *AuthController) RefreshToken(c *gin.Context) {
	var req models.RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response, err := ctrl.authService.RefreshToken(req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, response)
}

// GetProfile godoc
// @Summary Get user profile
// @Description Get current user profile
// @Tags auth
// @Produce json
// @Security BearerAuth
// @Success 200 {object} models.User
// @Failure 401 {object} map[string]string
// @Router /api/auth/profile [get]
func (ctrl *AuthController) GetProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	user, err := ctrl.authService.GetUserByID(userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// GoogleLogin godoc
// @Summary Initiate Google OAuth login
// @Description Redirect to Google OAuth login page
// @Tags auth
// @Produce json
// @Success 200 {object} map[string]string
// @Router /api/auth/google [get]
func (ctrl *AuthController) GoogleLogin(c *gin.Context) {
	state := uuid.New().String()
	url := ctrl.oauthService.GetGoogleLoginURL(state)
	c.JSON(http.StatusOK, gin.H{"url": url})
}

// GoogleCallback godoc
// @Summary Handle Google OAuth callback
// @Description Process Google OAuth callback and authenticate user
// @Tags auth
// @Param code query string true "Authorization code"
// @Param state query string true "State parameter"
// @Success 200 {object} models.AuthResponse
// @Failure 400 {object} map[string]string
// @Router /api/auth/google/callback [get]
func (ctrl *AuthController) GoogleCallback(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code parameter required"})
		return
	}

	userInfo, err := ctrl.oauthService.HandleGoogleCallback(code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response, err := ctrl.authService.HandleOAuthLogin(models.AuthProviderGoogle, userInfo.ID, userInfo.Email, userInfo.Name, userInfo.Avatar)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.Redirect(http.StatusTemporaryRedirect, config.AppConfig.FrontendURL+"/auth/callback?token="+response.AccessToken+"&refresh="+response.RefreshToken)
}

// FacebookLogin godoc
// @Summary Initiate Facebook OAuth login
// @Description Redirect to Facebook OAuth login page
// @Tags auth
// @Produce json
// @Success 200 {object} map[string]string
// @Router /api/auth/facebook [get]
func (ctrl *AuthController) FacebookLogin(c *gin.Context) {
	state := uuid.New().String()
	url := ctrl.oauthService.GetFacebookLoginURL(state)
	c.JSON(http.StatusOK, gin.H{"url": url})
}

// FacebookCallback godoc
// @Summary Handle Facebook OAuth callback
// @Description Process Facebook OAuth callback and authenticate user
// @Tags auth
// @Param code query string true "Authorization code"
// @Param state query string true "State parameter"
// @Success 200 {object} models.AuthResponse
// @Failure 400 {object} map[string]string
// @Router /api/auth/facebook/callback [get]
func (ctrl *AuthController) FacebookCallback(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "code parameter required"})
		return
	}

	userInfo, err := ctrl.oauthService.HandleFacebookCallback(code)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response, err := ctrl.authService.HandleOAuthLogin(models.AuthProviderFacebook, userInfo.ID, userInfo.Email, userInfo.Name, userInfo.Avatar)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.Redirect(http.StatusTemporaryRedirect, config.AppConfig.FrontendURL+"/auth/callback?token="+response.AccessToken+"&refresh="+response.RefreshToken)
}