package repository

import (
	"backend/internal/models"
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// CreateProduct inserts a product and multiple images into the database
func CreateProduct(pool *pgxpool.Pool, product_name, description string, product_cost, product_price float64, quantity int64, imageURLs []string) (*models.Product, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1️⃣ Insert product (main image is first in the list)
	mainImage := ""
	if len(imageURLs) > 0 {
		mainImage = imageURLs[0]
	}

	query := `
    INSERT INTO products(product_name, description, product_cost, product_price, quantity, main_image)
    VALUES($1, $2, $3, $4, $5, $6)
    RETURNING id, product_name, description, product_cost, product_price, quantity, main_image, created_at, updated_at
    `

	var product models.Product
	err := pool.QueryRow(ctx, query, product_name, description, product_cost, product_price, quantity, mainImage).
		Scan(&product.ID, &product.Name, &product.Description, &product.Cost, &product.Price, &product.Quantity, &product.MainImage, &product.CreatedAt, &product.UpdatedAt)
	if err != nil {
		return nil, err
	}

	// 2️⃣ Insert all images into product_images table
	for _, url := range imageURLs {
		_, err := pool.Exec(ctx, `
            INSERT INTO product_images(product_id, image_url)
            VALUES($1, $2)
        `, product.ID, url)
		if err != nil {
			return nil, err
		}
	}

	// 3️⃣ Fill Images slice in struct
	product.Images = imageURLs

	return &product, nil
}
