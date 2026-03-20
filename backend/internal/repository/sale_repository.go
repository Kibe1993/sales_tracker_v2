package repository

import (
	"backend/internal/models"
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func CreateDraftSale(pool *pgxpool.Pool, userId string) (*models.Sale, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	saleID := uuid.New().String()

	query := `
	INSERT INTO sales (id, user_id, total_amount)
	VALUES ($1, $2, $3)
	RETURNING id, user_id, total_amount, created_at
	`

	var sale models.Sale

	err := pool.QueryRow(ctx, query, saleID, userId, 0).Scan(
		&sale.ID,
		&sale.UserID,
		&sale.TotalAmount,
		&sale.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	sale.Items = []models.SaleItem{}
	return &sale, nil
}

func AddItemToDraftSale(pool *pgxpool.Pool, saleID string, productID string, quantity int, unitPrice float64) (*models.SaleItem, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var existingID string
	var existingQty int

	err = tx.QueryRow(ctx, `
		SELECT id, quantity
		FROM sales_items
		WHERE sale_id=$1 AND product_id=$2
	`, saleID, productID).Scan(&existingID, &existingQty)

	var item models.SaleItem

	if err == nil {
		// EXISTS → update
		newQty := existingQty + quantity
		subtotal := float64(newQty) * unitPrice

		_, err = tx.Exec(ctx, `
			UPDATE sales_items
			SET quantity=$1, subtotal=$2
			WHERE id=$3
		`, newQty, subtotal, existingID)
		if err != nil {
			return nil, err
		}

		item = models.SaleItem{
			ID:        existingID,
			SaleID:    saleID,
			ProductID: productID,
			Quantity:  newQty,
			UnitPrice: unitPrice,
			Subtotal:  subtotal,
			CreatedAt: time.Now(),
		}

	} else if err == pgx.ErrNoRows {
		// NOT EXISTS → insert
		itemID := uuid.New().String()
		subtotal := float64(quantity) * unitPrice

		_, err = tx.Exec(ctx, `
			INSERT INTO sales_items (id, sale_id, product_id, quantity, unit_price, subtotal)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, itemID, saleID, productID, quantity, unitPrice, subtotal)
		if err != nil {
			return nil, err
		}

		item = models.SaleItem{
			ID:        itemID,
			SaleID:    saleID,
			ProductID: productID,
			Quantity:  quantity,
			UnitPrice: unitPrice,
			Subtotal:  subtotal,
			CreatedAt: time.Now(),
		}

	} else {
		return nil, err
	}

	// Update total_amount safely
	_, err = tx.Exec(ctx, `
		UPDATE sales
		SET total_amount = (
			SELECT COALESCE(SUM(subtotal), 0)
			FROM sales_items
			WHERE sale_id=$1
		)
		WHERE id=$1
	`, saleID)
	if err != nil {
		return nil, err
	}

	// Commit transaction
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &item, nil
}

func GetDraftSale(pool *pgxpool.Pool, userID string) (*models.Sale, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var sale models.Sale

	err := pool.QueryRow(ctx, `
		SELECT id, user_id, total_amount, created_at
		FROM sales
		WHERE user_id=$1
		ORDER BY created_at DESC
		LIMIT 1
	`, userID).Scan(
		&sale.ID,
		&sale.UserID,
		&sale.TotalAmount,
		&sale.CreatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	rows, err := pool.Query(ctx, `
		SELECT id, sale_id, product_id, quantity, unit_price, subtotal, created_at
		FROM sales_items
		WHERE sale_id=$1
	`, sale.ID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.SaleItem

	for rows.Next() {
		var si models.SaleItem
		err := rows.Scan(
			&si.ID,
			&si.SaleID,
			&si.ProductID,
			&si.Quantity,
			&si.UnitPrice,
			&si.Subtotal,
			&si.CreatedAt,
		)
		if err != nil {
			return nil, err
		}
		items = append(items, si)
	}

	sale.Items = items
	return &sale, nil
}
