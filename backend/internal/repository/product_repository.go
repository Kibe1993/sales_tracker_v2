package repository

import (
	"backend/internal/models"
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// CreateProduct inserts a product and multiple images into the database
func CreateProduct(pool *pgxpool.Pool, product_name, description string, category string, product_cost, product_price float64, quantity int64, imageURLs []string) (*models.Product, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// 1️⃣ Insert product (main image is first in the list)
	mainImage := ""
	if len(imageURLs) > 0 {
		mainImage = imageURLs[0]
	}

	query := `
    INSERT INTO products(product_name, description, category, product_cost, product_price, quantity, main_image)
    VALUES($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, product_name, description, category, product_cost, product_price, quantity, main_image, created_at, updated_at
    `

	var product models.Product
	err := pool.QueryRow(ctx, query, product_name, description, category, product_cost, product_price, quantity, mainImage).
		Scan(&product.ID, &product.Name, &product.Description, &product.Category, &product.Cost, &product.Price, &product.Quantity, &product.MainImage, &product.CreatedAt, &product.UpdatedAt)
	if err != nil {
		return nil, err
	}

	// 2️⃣ Insert all images into product_images table

	batch := &pgx.Batch{}

	for _, url := range imageURLs {

		batch.Queue(`
            INSERT INTO product_images(product_id, image_url)
            VALUES($1, $2)
        `, product.ID, url)

	}
	br := pool.SendBatch(ctx, batch)
	defer br.Close()

	for range imageURLs {
		_, err := br.Exec()

		if err != nil {
			return nil, err
		}
	}

	// 3️⃣ Fill Images slice in struct
	product.Images = imageURLs

	return &product, nil
}

func GetAllProduct(pool *pgxpool.Pool) ([]models.Product, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	query := `
		SELECT 
			p.id,
			p.product_name,
			p.description,
			p.category,
			p.product_cost,
			p.product_price,
			p.quantity,
			p.main_image,
			p.created_at,
			p.updated_at,
			pi.image_url
		FROM products p
		LEFT JOIN product_images pi ON p.id = pi.product_id
	`

	rows, err := pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	productMap := make(map[string]*models.Product)

	for rows.Next() {

		var p models.Product
		var imageURL *string

		err := rows.Scan(
			&p.ID,
			&p.Name,
			&p.Description,
			&p.Category,
			&p.Cost,
			&p.Price,
			&p.Quantity,
			&p.MainImage,
			&p.CreatedAt,
			&p.UpdatedAt,
			&imageURL,
		)
		if err != nil {
			return nil, err
		}

		if existing, ok := productMap[p.ID]; ok {
			if imageURL != nil {
				existing.Images = append(existing.Images, *imageURL)
			}
		} else {

			if imageURL != nil {
				p.Images = append(p.Images, *imageURL)
			}

			productMap[p.ID] = &p
		}
	}

	var products []models.Product

	for _, p := range productMap {
		products = append(products, *p)
	}

	return products, nil
}

func GetProductByID(pool *pgxpool.Pool, id string) (*models.Product, error) {
	var ctx context.Context
	var cancel context.CancelFunc

	ctx, cancel = context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var query string = `
		SELECT id, product_name, description, category, product_cost, product_price, quantity, main_image, created_at, updated_at
		FROM products WHERE id = $1 
	`
	var p models.Product

	var err error = pool.QueryRow(ctx, query, id).Scan(
		&p.ID,
		&p.Name,
		&p.Description,
		&p.Category,
		&p.Cost,
		&p.Price,
		&p.Quantity,
		&p.MainImage,
		&p.CreatedAt,
		&p.UpdatedAt,
	)

	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, fmt.Errorf("product not found")
		}
		return nil, err
	}
	imgRows, err := pool.Query(ctx, `SELECT image_url FROM product_images WHERE product_id=$1`, p.ID)
	if err != nil {
		return nil, err
	}
	for imgRows.Next() {
		var url string
		if err := imgRows.Scan(&url); err != nil {
			imgRows.Close()
			return nil, err
		}
		p.Images = append(p.Images, url)
	}

	if err := imgRows.Err(); err != nil {
		imgRows.Close()
		return nil, err
	}

	return &p, nil
}
