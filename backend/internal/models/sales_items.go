package models

import "time"

type SaleItem struct {
	ID        string    `json:"id" db:"id"`
	SaleID    string    `json:"sale_id" db:"sale_id"`
	ProductID string    `json:"product_id" db:"product_id"`
	Quantity  int       `json:"quantity" db:"quantity"`
	UnitPrice float64   `json:"unit_price" db:"unit_price"`
	Subtotal  float64   `json:"subtotal" db:"subtotal"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}
