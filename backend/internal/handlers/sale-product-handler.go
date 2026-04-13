package handlers

import (
	"backend/internal/repository"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AddItemToSaleInput struct {
	ProductID string  `json:"product_id" binding:"required"`
	Quantity  int     `json:"quantity" binding:"required"`
	UnitPrice float64 `json:"unit_price" binding:"required"`
}

type UpdateCartItemInput struct {
	Quantity int `json:"quantity" binding:"required"`
}

func AddItemToCartHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(ctx *gin.Context) {

		var input struct {
			ClerkUserID string  `json:"clerkUserId"`
			ProductID   string  `json:"productId"`
			Quantity    int     `json:"quantity"`
			UnitPrice   float64 `json:"unitPrice"`
		}

		// Bind JSON
		if err := ctx.ShouldBindJSON(&input); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Validation
		if input.ClerkUserID == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "clerkUserId required"})
			return
		}

		if input.ProductID == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "productId required"})
			return
		}

		if input.Quantity <= 0 {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "quantity must be > 0"})
			return
		}

		if input.UnitPrice <= 0 {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "unitPrice must be > 0"})
			return
		}

		// Repository call
		item, err := repository.AddItemToDraftSale(
			pool,
			input.ClerkUserID,
			input.ProductID,
			input.Quantity,
			input.UnitPrice,
		)

		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		ctx.JSON(http.StatusOK, item)
	}
}

// Handler
func GetDraftSaleHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(c *gin.Context) {

		clerkUserID := strings.TrimSpace(c.Param("userId"))

		if clerkUserID == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "user_id is required",
			})
			return
		}

		sale, err := repository.GetDraftSale(pool, clerkUserID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "failed to fetch draft sale",
			})
			return
		}

		if sale == nil {
			c.JSON(http.StatusOK, gin.H{
				"message": "no draft sale found",
			})
			return
		}

		c.JSON(http.StatusOK, sale)
	}
}

func UpdateCartItemHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		itemID := ctx.Param("id")
		if itemID == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "item id is required"})
			return
		}

		var input UpdateCartItemInput
		if err := ctx.ShouldBindJSON(&input); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if input.Quantity < 0 {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "quantity cannot be negative"})
			return
		}

		item, err := repository.UpdateCartItemQuantity(pool, itemID, input.Quantity)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		// If quantity is 0, item was removed
		if item == nil {
			ctx.Status(http.StatusNoContent)
			return
		}

		ctx.JSON(http.StatusOK, item)
	}
}

// -------------------- DELETE: Remove Item --------------------

func DeleteCartItemHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		itemID := ctx.Param("id")
		if itemID == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "item id is required"})
			return
		}

		if err := repository.RemoveCartItem(pool, itemID); err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		ctx.Status(http.StatusNoContent)
	}
}
