package services

import (
	"backend/internal/config"
	"context"
	"fmt"
	"log"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
)

type CloudinaryService struct {
	cld *cloudinary.Cloudinary
}

func NewCloudinaryService(cfg *config.Config) (*CloudinaryService, error) {

	if cfg.CloudName == "" || cfg.APIKey == "" || cfg.APISecret == "" {
		return nil, fmt.Errorf("Cloudinary environment variables missing")

	}

	cld, err := cloudinary.NewFromParams(cfg.CloudName, cfg.APIKey, cfg.APISecret)

	if err != nil {
		log.Printf("Failed to initialize cloudinary: %v", err)
		return nil, err
	}

	return &CloudinaryService{cld: cld}, nil

}

func (c *CloudinaryService) UploadFile(ctx context.Context, localFilePath, folder string) (string, error) {
	result, err := c.cld.Upload.Upload(ctx, localFilePath, uploader.UploadParams{
		Folder: folder,
	})
	if err != nil {
		return "", fmt.Errorf("Cloudinary upload failed: %w", err)
	}
	return result.SecureURL, nil
}
