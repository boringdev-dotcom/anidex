package services

import (
	"context"
	"encoding/json"
	"errors"
	"io"

	"github.com/anidex/backend/internal/config"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/facebook"
	"golang.org/x/oauth2/google"
)

type OAuthService interface {
	GetGoogleLoginURL(state string) string
	GetFacebookLoginURL(state string) string
	HandleGoogleCallback(code string) (*OAuthUserInfo, error)
	HandleFacebookCallback(code string) (*OAuthUserInfo, error)
}

type OAuthUserInfo struct {
	ID     string
	Email  string
	Name   string
	Avatar string
}

type oauthService struct {
	googleOAuthConfig   *oauth2.Config
	facebookOAuthConfig *oauth2.Config
}

func NewOAuthService() OAuthService {
	return &oauthService{
		googleOAuthConfig: &oauth2.Config{
			ClientID:     config.AppConfig.GoogleClientID,
			ClientSecret: config.AppConfig.GoogleClientSecret,
			RedirectURL:  config.AppConfig.GoogleRedirectURL,
			Scopes:       []string{"openid", "profile", "email"},
			Endpoint:     google.Endpoint,
		},
		facebookOAuthConfig: &oauth2.Config{
			ClientID:     config.AppConfig.FacebookClientID,
			ClientSecret: config.AppConfig.FacebookClientSecret,
			RedirectURL:  config.AppConfig.FacebookRedirectURL,
			Scopes:       []string{"email", "public_profile"},
			Endpoint:     facebook.Endpoint,
		},
	}
}

func (s *oauthService) GetGoogleLoginURL(state string) string {
	return s.googleOAuthConfig.AuthCodeURL(state)
}

func (s *oauthService) GetFacebookLoginURL(state string) string {
	return s.facebookOAuthConfig.AuthCodeURL(state)
}

func (s *oauthService) HandleGoogleCallback(code string) (*OAuthUserInfo, error) {
	token, err := s.googleOAuthConfig.Exchange(context.Background(), code)
	if err != nil {
		return nil, err
	}

	client := s.googleOAuthConfig.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var googleUser struct {
		ID      string `json:"id"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}

	if err := json.Unmarshal(data, &googleUser); err != nil {
		return nil, err
	}

	if googleUser.Email == "" {
		return nil, errors.New("unable to get email from Google")
	}

	return &OAuthUserInfo{
		ID:     googleUser.ID,
		Email:  googleUser.Email,
		Name:   googleUser.Name,
		Avatar: googleUser.Picture,
	}, nil
}

func (s *oauthService) HandleFacebookCallback(code string) (*OAuthUserInfo, error) {
	token, err := s.facebookOAuthConfig.Exchange(context.Background(), code)
	if err != nil {
		return nil, err
	}

	client := s.facebookOAuthConfig.Client(context.Background(), token)
	resp, err := client.Get("https://graph.facebook.com/me?fields=id,name,email,picture.type(large)")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	var fbUser struct {
		ID      string `json:"id"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture struct {
			Data struct {
				URL string `json:"url"`
			} `json:"data"`
		} `json:"picture"`
	}

	if err := json.Unmarshal(data, &fbUser); err != nil {
		return nil, err
	}

	if fbUser.Email == "" {
		return nil, errors.New("unable to get email from Facebook")
	}

	return &OAuthUserInfo{
		ID:     fbUser.ID,
		Email:  fbUser.Email,
		Name:   fbUser.Name,
		Avatar: fbUser.Picture.Data.URL,
	}, nil
}