package repository

import (
	"backend/internal/models"
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func AddItemToDraftSale(
	pool *pgxpool.Pool,
	clerkUserId string,
	productID string,
	quantity int,
	unitPrice float64,
) (*models.SaleItem, error) {

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// 1. GET OR CREATE USER (FIXED)

	var userID string

	err = tx.QueryRow(ctx, `
		SELECT id
		FROM users
		WHERE clerk_user_id = $1
	`, clerkUserId).Scan(&userID)

	if err == pgx.ErrNoRows {
		userID = uuid.New().String()

		_, err = tx.Exec(ctx, `
			INSERT INTO users (id, clerk_user_id)
			VALUES ($1, $2)
		`, userID, clerkUserId)

		if err != nil {
			return nil, err
		}

	} else if err != nil {
		return nil, err
	}

	// 2. GET OR CREATE DRAFT SALE

	var saleID string

	err = tx.QueryRow(ctx, `
		SELECT id
		FROM sales
		WHERE user_id = $1 AND status = 'draft'
		ORDER BY created_at DESC
		LIMIT 1
	`, userID).Scan(&saleID)

	if err == pgx.ErrNoRows {
		err = tx.QueryRow(ctx, `
			INSERT INTO sales (user_id, total_amount, status)
			VALUES ($1, 0, 'draft')
			RETURNING id
		`, userID).Scan(&saleID)

		if err != nil {
			return nil, err
		}

	} else if err != nil {
		return nil, err
	}

	// 3. CHECK IF ITEM EXISTS

	var existingID string
	var existingQty int

	err = tx.QueryRow(ctx, `
		SELECT id, quantity
		FROM sales_items
		WHERE sale_id = $1 AND product_id = $2
	`, saleID, productID).Scan(&existingID, &existingQty)

	var item models.SaleItem

	if err == nil {

		// UPDATE
		newQty := existingQty + quantity
		subtotal := float64(newQty) * unitPrice

		_, err = tx.Exec(ctx, `
			UPDATE sales_items
			SET quantity = $1, subtotal = $2
			WHERE id = $3
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

		// INSERT
		itemID := uuid.New().String()
		subtotal := float64(quantity) * unitPrice

		_, err = tx.Exec(ctx, `
			INSERT INTO sales_items (
				id, sale_id, product_id, quantity, unit_price, subtotal
			)
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

	// 4. UPDATE TOTAL

	_, err = tx.Exec(ctx, `
		UPDATE sales
		SET total_amount = (
			SELECT COALESCE(SUM(subtotal), 0)
			FROM sales_items
			WHERE sale_id = $1
		)
		WHERE id = $1
	`, saleID)

	if err != nil {
		return nil, err
	}

	// 5. COMMIT

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &item, nil
}
func GetDraftSale(pool *pgxpool.Pool, clerkUserID string) (*models.Sale, error) {

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var sale models.Sale
	var internalUserID string

	// 1. GET USER (SAFE)

	err := pool.QueryRow(ctx, `
		SELECT id
		FROM users
		WHERE clerk_user_id = $1
	`, clerkUserID).Scan(&internalUserID)

	if err == pgx.ErrNoRows {
		// user exists in Clerk but not in DB yet → treat as empty cart
		return &models.Sale{
			Items: []models.SaleItem{},
		}, nil
	}

	// 2. GET DRAFT SALE

	err = pool.QueryRow(ctx, `
		SELECT id, user_id, total_amount, created_at
		FROM sales
		WHERE user_id = $1 AND status = 'draft'
		ORDER BY created_at DESC
		LIMIT 1
	`, internalUserID).Scan(
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

	// 3. LOAD ITEMS

	rows, err := pool.Query(ctx, `
		SELECT 
			si.id,
			si.sale_id,
			si.product_id,
			si.quantity,
			si.unit_price,
			si.subtotal,
			si.created_at,
			COALESCE(p.product_name, ''),
			COALESCE(p.main_image, '')
		FROM sales_items si
		LEFT JOIN products p ON p.id = si.product_id
		WHERE si.sale_id = $1
	`, sale.ID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []models.SaleItem

	for rows.Next() {
		var si models.SaleItem

		if err := rows.Scan(
			&si.ID,
			&si.SaleID,
			&si.ProductID,
			&si.Quantity,
			&si.UnitPrice,
			&si.Subtotal,
			&si.CreatedAt,
			&si.ProductName,
			&si.ProductImage,
		); err != nil {
			return nil, err
		}

		items = append(items, si)
	}

	sale.Items = items
	return &sale, nil
}

func UpdateCartItemQuantity(
	pool *pgxpool.Pool,
	itemID string,
	quantity int,
) (*models.SaleItem, error) {

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var unitPrice float64
	var saleID string

	// 1. GET CURRENT ITEM
	err = tx.QueryRow(ctx, `
		SELECT unit_price, sale_id
		FROM sales_items
		WHERE id = $1
	`, itemID).Scan(&unitPrice, &saleID)

	if err != nil {
		return nil, err
	}

	// ❗ If quantity becomes 0 → delete instead
	if quantity <= 0 {
		_, err = tx.Exec(ctx, `
			DELETE FROM sales_items
			WHERE id = $1
		`, itemID)

		if err != nil {
			return nil, err
		}

	} else {
		subtotal := float64(quantity) * unitPrice

		_, err = tx.Exec(ctx, `
			UPDATE sales_items
			SET quantity = $1, subtotal = $2
			WHERE id = $3
		`, quantity, subtotal, itemID)

		if err != nil {
			return nil, err
		}
	}

	// 2. UPDATE TOTAL
	_, err = tx.Exec(ctx, `
		UPDATE sales
		SET total_amount = (
			SELECT COALESCE(SUM(subtotal), 0)
			FROM sales_items
			WHERE sale_id = $1
		)
		WHERE id = $1
	`, saleID)

	if err != nil {
		return nil, err
	}

	// 3. RETURN UPDATED ITEM (if still exists)
	var item models.SaleItem

	err = tx.QueryRow(ctx, `
		SELECT id, sale_id, product_id, quantity, unit_price, subtotal, created_at
		FROM sales_items
		WHERE id = $1
	`, itemID).Scan(
		&item.ID,
		&item.SaleID,
		&item.ProductID,
		&item.Quantity,
		&item.UnitPrice,
		&item.Subtotal,
		&item.CreatedAt,
	)

	// If deleted, just commit and return nil
	if err == pgx.ErrNoRows {
		if err := tx.Commit(ctx); err != nil {
			return nil, err
		}
		return nil, nil
	}

	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &item, nil
}

func RemoveCartItem(
	pool *pgxpool.Pool,
	itemID string,
) error {

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var saleID string

	// 1. GET SALE ID
	err = tx.QueryRow(ctx, `
		SELECT sale_id
		FROM sales_items
		WHERE id = $1
	`, itemID).Scan(&saleID)

	if err != nil {
		return err
	}

	// 2. DELETE ITEM
	_, err = tx.Exec(ctx, `
		DELETE FROM sales_items
		WHERE id = $1
	`, itemID)

	if err != nil {
		return err
	}

	// 3. UPDATE TOTAL
	_, err = tx.Exec(ctx, `
		UPDATE sales
		SET total_amount = (
			SELECT COALESCE(SUM(subtotal), 0)
			FROM sales_items
			WHERE sale_id = $1
		)
		WHERE id = $1
	`, saleID)

	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}
