package models

import "time"

// Product represents a product in your inventory
type Product struct {
	ID          string    `json:"id" db:"id"`
	Name        string    `json:"product_name" db:"product_name"`
	Description string    `json:"description" db:"description"`
	Category    string    `json:"category" db:"category"`
	Cost        float64   `json:"product_cost" db:"product_cost"`
	Price       float64   `json:"product_price" db:"product_price"`
	Quantity    int64     `json:"quantity" db:"quantity"`
	MainImage   string    `json:"main_image" db:"main_image"`
	Images      []string  `json:"images"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}
