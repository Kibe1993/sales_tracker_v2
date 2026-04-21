package repository

import (
	"backend/internal/models"
	"context"
	"errors"
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

	// 1. GET OR CREATE USER
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

	// 2. GET OR CREATE DRAFT SALE (ONE PER USER)
	var saleID string

	err = tx.QueryRow(ctx, `
		SELECT id
		FROM sales
		WHERE user_id = $1 AND status = 'draft'
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

	// 3. LOCK PRODUCT + GET STOCK
	var productCost float64
	var stock int64

	err = tx.QueryRow(ctx, `
		SELECT product_cost, quantity
		FROM products
		WHERE id = $1
		FOR UPDATE
	`, productID).Scan(&productCost, &stock)

	if err != nil {
		return nil, err
	}

	// 4. GET CURRENT QTY IN CART
	var existingQty int

	err = tx.QueryRow(ctx, `
		SELECT COALESCE(quantity, 0)
		FROM sales_items
		WHERE sale_id = $1 AND product_id = $2
	`, saleID, productID).Scan(&existingQty)

	if err != nil && err != pgx.ErrNoRows {
		return nil, err
	}

	// 5. STOCK VALIDATION (IMPORTANT PART)
	if existingQty+quantity > int(stock) {
		return nil, errors.New("insufficient stock available")
	}

	// 6. UPSERT ITEM
	subtotal := float64(existingQty+quantity) * unitPrice

	_, err = tx.Exec(ctx, `
		INSERT INTO sales_items (
			id, sale_id, product_id, quantity, unit_price, subtotal, cost_price
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (sale_id, product_id)
		DO UPDATE SET
			quantity = sales_items.quantity + EXCLUDED.quantity,
			subtotal = (sales_items.quantity + EXCLUDED.quantity) * EXCLUDED.unit_price
	`, uuid.New().String(), saleID, productID, quantity, unitPrice, subtotal, productCost)

	if err != nil {
		return nil, err
	}

	// 7. RETURN ITEM
	var item models.SaleItem

	err = tx.QueryRow(ctx, `
		SELECT id, sale_id, product_id, quantity, unit_price, subtotal, cost_price, created_at
		FROM sales_items
		WHERE sale_id = $1 AND product_id = $2
	`, saleID, productID).Scan(
		&item.ID,
		&item.SaleID,
		&item.ProductID,
		&item.Quantity,
		&item.UnitPrice,
		&item.Subtotal,
		&item.CostPrice,
		&item.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	// 8. UPDATE TOTAL
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

	// 1. GET USER
	err := pool.QueryRow(ctx, `
		SELECT id
		FROM users
		WHERE clerk_user_id = $1
	`, clerkUserID).Scan(&internalUserID)

	if err == pgx.ErrNoRows {
		return &models.Sale{
			Items: []models.SaleItem{},
		}, nil
	}
	if err != nil {
		return nil, err
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
		return &models.Sale{
			Items: []models.SaleItem{},
		}, nil
	}
	if err != nil {
		return nil, err
	}

	// 3. LOAD ITEMS + STOCK INFO
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
			COALESCE(p.main_image, ''),
			COALESCE(p.quantity, 0) AS product_stock

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
			&si.ProductStock,
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

	var (
		unitPrice float64
		saleID    string
		costPrice float64
		productID string
	)

	// 1. Get cart item
	err = tx.QueryRow(ctx, `
		SELECT unit_price, sale_id, cost_price, product_id
		FROM sales_items
		WHERE id = $1
	`, itemID).Scan(&unitPrice, &saleID, &costPrice, &productID)

	if err != nil {
		return nil, err
	}

	// 2. Get product stock
	var stock int
	err = tx.QueryRow(ctx, `
		SELECT quantity
		FROM products
		WHERE id = $1
	`, productID).Scan(&stock)

	if err != nil {
		return nil, err
	}

	// 3. HARD RULE (stock guard)
	if quantity > stock {
		return nil, errors.New("insufficient stock available")
	}

	// 4. Update / delete
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
			SET quantity = $1,
			    subtotal = $2
			WHERE id = $3
		`, quantity, subtotal, itemID)

		if err != nil {
			return nil, err
		}
	}

	// 5. Update sale total
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

	// 6. Return updated item
	var item models.SaleItem

	err = tx.QueryRow(ctx, `
		SELECT id, sale_id, product_id, quantity, unit_price, subtotal, cost_price, created_at
		FROM sales_items
		WHERE id = $1
	`, itemID).Scan(
		&item.ID,
		&item.SaleID,
		&item.ProductID,
		&item.Quantity,
		&item.UnitPrice,
		&item.Subtotal,
		&item.CostPrice,
		&item.CreatedAt,
	)

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

func Checkout(pool *pgxpool.Pool, clerkUserId string) (*models.Sale, error) {

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	tx, err := pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// 1. GET USER ID
	var userID string

	err = tx.QueryRow(ctx, `
		SELECT id
		FROM users
		WHERE clerk_user_id = $1
	`, clerkUserId).Scan(&userID)

	if err == pgx.ErrNoRows {
		return nil, errors.New("user not found")
	}
	if err != nil {
		return nil, err
	}

	// 2. GET DRAFT SALE
	var sale models.Sale

	err = tx.QueryRow(ctx, `
		SELECT id, user_id, total_amount, created_at
		FROM sales
		WHERE user_id = $1 AND status = 'draft'
		ORDER BY created_at DESC
		LIMIT 1
	`, userID).Scan(
		&sale.ID,
		&sale.UserID,
		&sale.TotalAmount,
		&sale.CreatedAt,
	)

	if err == pgx.ErrNoRows {
		return nil, errors.New("no active cart found")
	}
	if err != nil {
		return nil, err
	}

	// 3. GET ITEMS (WITH PRODUCT DATA FOR STOCK + COST)
	rows, err := tx.Query(ctx, `
		SELECT 
			si.id,
			si.product_id,
			si.quantity,
			si.unit_price,
			p.product_cost,
			p.quantity
		FROM sales_items si
		JOIN products p ON p.id = si.product_id
		WHERE si.sale_id = $1
	`, sale.ID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	type checkoutItem struct {
		itemID      string
		productID   string
		qty         int
		unitPrice   float64
		costPrice   float64
		stockBefore int
	}

	var items []checkoutItem

	for rows.Next() {
		var it checkoutItem

		if err := rows.Scan(
			&it.itemID,
			&it.productID,
			&it.qty,
			&it.unitPrice,
			&it.costPrice,
			&it.stockBefore,
		); err != nil {
			return nil, err
		}

		// ❗ STOCK VALIDATION
		if it.stockBefore < it.qty {
			return nil, errors.New("insufficient stock for product")
		}

		items = append(items, it)
	}

	// 4. DEDUCT STOCK + UPDATE SALES ITEMS COST SNAPSHOT
	for _, it := range items {

		// reduce stock
		_, err = tx.Exec(ctx, `
			UPDATE products
			SET quantity = quantity - $1
			WHERE id = $2
		`, it.qty, it.productID)

		if err != nil {
			return nil, err
		}

		// store cost snapshot (IMPORTANT FOR PROFIT)
		_, err = tx.Exec(ctx, `
			UPDATE sales_items
			SET cost_price = $1
			WHERE id = $2
		`, it.costPrice, it.itemID)

		if err != nil {
			return nil, err
		}
	}

	// 5. FINALIZE SALE
	_, err = tx.Exec(ctx, `
		UPDATE sales
		SET status = 'completed',
		    total_amount = (
				SELECT COALESCE(SUM(subtotal), 0)
				FROM sales_items
				WHERE sale_id = $1
		    )
		WHERE id = $1
	`, sale.ID)

	if err != nil {
		return nil, err
	}

	// 6. RETURN FINAL SALE
	err = tx.QueryRow(ctx, `
		SELECT id, user_id, total_amount, status, created_at
		FROM sales
		WHERE id = $1
	`, sale.ID).Scan(
		&sale.ID,
		&sale.UserID,
		&sale.TotalAmount,
		&sale.Status,
		&sale.CreatedAt,
	)

	if err != nil {
		return nil, err
	}

	// 7. LOAD ITEMS (OPTIONAL FOR RECEIPT)
	itemRows, err := tx.Query(ctx, `
		SELECT id, sale_id, product_id, quantity, unit_price, subtotal, cost_price
		FROM sales_items
		WHERE sale_id = $1
	`, sale.ID)

	if err != nil {
		return nil, err
	}
	defer itemRows.Close()

	for itemRows.Next() {
		var si models.SaleItem
		if err := itemRows.Scan(
			&si.ID,
			&si.SaleID,
			&si.ProductID,
			&si.Quantity,
			&si.UnitPrice,
			&si.Subtotal,
			&si.CostPrice,
		); err != nil {
			return nil, err
		}

		sale.Items = append(sale.Items, si)
	}

	// 8. COMMIT
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &sale, nil
}
