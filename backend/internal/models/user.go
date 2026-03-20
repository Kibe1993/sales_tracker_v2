package models

import "time"

type User struct {
	ID          string    `json:"id" db:"id"`
	ClerkUserID string    `json:"clerk_user_id" db:"clerk_user_id"`
	Name        string    `json:"name" db:"name"`
	Email       string    `json:"email" db:"email"`
	Role        string    `json:"role" db:"role"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}
