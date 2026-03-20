package handlers

import (
	"backend/internal/repository"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Input struct
type CreateDraftSaleInput struct {
	UserID string `json:"user_id" binding:"required"`
}

type AddItemToSaleInput struct {
	ProductID string  `json:"product_id" binding:"required"`
	Quantity  int     `json:"quantity" binding:"required"`
	UnitPrice float64 `json:"unit_price" binding:"required"`
}

// Handler
func CreateDraftSaleHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(ctx *gin.Context) {

		var input CreateDraftSaleInput
		fmt.Printf("CreateDraftSaleHandler called with body: %+v\n", input)

		if err := ctx.ShouldBindJSON(&input); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		if strings.TrimSpace(input.UserID) == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "user_id cannot be empty"})
			return
		}
		fmt.Println("Creating draft sale for user:", input.UserID)
		sale, err := repository.CreateDraftSale(pool, input.UserID)
		if err != nil {
			fmt.Printf("Error creating draft sale for user %s: %v\n", input.UserID, err)
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		fmt.Printf("Draft sale created successfully: %+v\n", sale)
		ctx.JSON(http.StatusCreated, sale)
	}
}

func AddItemToDraftSaleHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		saleID := ctx.Param("sale_id")

		var input AddItemToSaleInput
		if err := ctx.ShouldBindJSON(&input); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// validations
		if strings.TrimSpace(saleID) == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "sale_id is required"})
			return
		}

		if strings.TrimSpace(input.ProductID) == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "product_id cannot be empty"})
			return
		}

		if input.Quantity <= 0 {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "quantity must be greater than 0"})
			return
		}

		if input.UnitPrice <= 0 {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "unit_price must be greater than 0"})
			return
		}

		item, err := repository.AddItemToDraftSale(
			pool,
			saleID,
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
	return func(ctx *gin.Context) {
		userID := ctx.Param("user_id")

		if strings.TrimSpace(userID) == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "user_id is required"})
			return
		}

		sale, err := repository.GetDraftSale(pool, userID)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if sale == nil {
			ctx.JSON(http.StatusNotFound, gin.H{"message": "no draft sale found"})
			return
		}

		ctx.JSON(http.StatusOK, sale)
	}
}
