package handlers

import (
	"errors"
	"net/http"
	"strings"

	"backend/internal/repository"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Input struct for creating a product
type CreateProductInput struct {
	Name        string   `json:"product_name" binding:"required"`
	Description string   `json:"description" binding:"required"`
	Category    string   `json:"category" binding:"required"`
	Cost        float64  `json:"product_cost" binding:"required"`
	Price       float64  `json:"product_price" binding:"required"`
	Quantity    int64    `json:"quantity" binding:"required"`
	Images      []string `json:"images" binding:"required"`
}

type UpdateProductInput struct {
	Name        string   `json:"product_name" binding:"required"`
	Description string   `json:"description" binding:"required"`
	Category    string   `json:"category" binding:"required"`
	Cost        float64  `json:"product_cost" binding:"required"`
	Price       float64  `json:"product_price" binding:"required"`
	Quantity    int64    `json:"quantity" binding:"required"`
	Images      []string `json:"images" binding:"required"`
}

// Handler to create a product
func CreateProductHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(ctx *gin.Context) {
		var input CreateProductInput
		if err := ctx.ShouldBindJSON(&input); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Basic validations
		if strings.TrimSpace(input.Name) == "" || strings.TrimSpace(input.Description) == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Name and description cannot be empty"})
			return
		}
		if len(input.Name) < 2 || len(input.Description) < 2 {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Name and description must be at least 2 characters"})
			return
		}
		if input.Price <= 0 || input.Quantity <= 0 || input.Cost < 0 {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Price and quantity must be positive, cost cannot be negative"})
			return
		}

		// Use repository function directly
		product, err := repository.CreateProduct(pool,
			input.Name,
			input.Description,
			input.Category,
			input.Cost,
			input.Price,
			input.Quantity,
			input.Images,
		)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		ctx.JSON(http.StatusCreated, product)
	}
}

func GetAllProductsHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(ctx *gin.Context) {

		products, err := repository.GetAllProduct(pool)

		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		ctx.JSON(http.StatusOK, products)
	}
}

func GetProductByIdHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(ctx *gin.Context) {

		id := ctx.Param("id")
		product, err := repository.GetProductByID(pool, id)

		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				ctx.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
				return
			}
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		ctx.JSON(http.StatusOK, product)

	}
}

func UpdateProductHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(ctx *gin.Context) {

		id := ctx.Param("id")

		var input UpdateProductInput
		if err := ctx.ShouldBindJSON(&input); err != nil {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Basic validations (same style as create)
		if strings.TrimSpace(input.Name) == "" || strings.TrimSpace(input.Description) == "" {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Name and description cannot be empty"})
			return
		}

		if len(input.Name) < 2 || len(input.Description) < 2 {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Name and description must be at least 2 characters"})
			return
		}

		if input.Price <= 0 || input.Quantity <= 0 || input.Cost < 0 {
			ctx.JSON(http.StatusBadRequest, gin.H{"error": "Invalid price, cost or quantity values"})
			return
		}

		product, err := repository.UpdateProduct(
			pool,
			id,
			input.Name,
			input.Description,
			input.Category,
			input.Cost,
			input.Price,
			input.Quantity,
			input.Images,
		)

		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		ctx.JSON(http.StatusOK, product)
	}
}

func DeleteProductHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(ctx *gin.Context) {

		id := ctx.Param("id")

		err := repository.DeleteProduct(pool, id)
		if err != nil {
			if err.Error() == "product not found" {
				ctx.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
				return
			}

			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		ctx.JSON(http.StatusOK, gin.H{
			"message": "Product deleted successfully",
		})
	}
}
