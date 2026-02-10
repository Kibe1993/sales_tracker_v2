package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port        string
	DatabaseURL string
	CloudName   string
	APIKey      string
	APISecret   string
}

func Load() (*Config, error) {

	err := godotenv.Load()

	if err != nil {
		log.Println("Warning: .env file not found, using environment variables", err)
		return nil, err
	}
	var config *Config = &Config{
		Port:        os.Getenv("Port"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		CloudName:   os.Getenv("CLOUDINARY_CLOUD_NAME"),
		APIKey:      os.Getenv("CLOUDINARY_API_KEY"),
		APISecret:   os.Getenv("CLOUDINARY_API_SECRET"),
	}

	if config.DatabaseURL == "" {
		return nil, fmt.Errorf("DATABASE_URL not set")
	}

	if config.CloudName == "" || config.APIKey == "" || config.APISecret == "" {
		return nil, fmt.Errorf("Cloudinary credentials not set in environment")
	}
	return config, nil

}
