package services

import (
	"context"
	"log"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/auth"
	"google.golang.org/api/option"
)

type FirebaseService interface {
	VerifyIDToken(ctx context.Context, idToken string) (*auth.Token, error)
	GetUser(ctx context.Context, uid string) (*auth.UserRecord, error)
}

type firebaseService struct {
	client *auth.Client
}

func NewFirebaseService() FirebaseService {
	ctx := context.Background()
	
	// Initialize Firebase with service account key
	// You can also use default credentials if running on Google Cloud
	var app *firebase.App
	var err error
	
	// Try to initialize with service account key file
	// In production, you should set GOOGLE_APPLICATION_CREDENTIALS environment variable
	// or use default credentials when running on Google Cloud Platform
	serviceAccountKeyPath := "serviceAccountKey.json"
	opt := option.WithCredentialsFile(serviceAccountKeyPath)
	app, err = firebase.NewApp(ctx, nil, opt)
	if err != nil {
		// Fallback to default credentials
		log.Printf("Failed to initialize Firebase with service account key, falling back to default credentials: %v", err)
		app, err = firebase.NewApp(ctx, nil)
		if err != nil {
			log.Fatalf("Failed to initialize Firebase: %v", err)
		}
	}

	client, err := app.Auth(ctx)
	if err != nil {
		log.Fatalf("Failed to initialize Firebase Auth client: %v", err)
	}

	return &firebaseService{
		client: client,
	}
}

func (s *firebaseService) VerifyIDToken(ctx context.Context, idToken string) (*auth.Token, error) {
	token, err := s.client.VerifyIDToken(ctx, idToken)
	if err != nil {
		return nil, err
	}
	return token, nil
}

func (s *firebaseService) GetUser(ctx context.Context, uid string) (*auth.UserRecord, error) {
	user, err := s.client.GetUser(ctx, uid)
	if err != nil {
		return nil, err
	}
	return user, nil
}