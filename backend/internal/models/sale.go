package models

import "time"

type Sale struct {
	ID          string     `json:"id" db:"id"`
	UserID      string     `json:"user_id" db:"user_id"`
	TotalAmount float64    `json:"total_amount" db:"total_amount"`
	Status      string     `json:"status" db:"status"` // ADD THIS
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	Items       []SaleItem `json:"items,omitempty"`
}
