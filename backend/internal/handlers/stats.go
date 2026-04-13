package handlers

import (
	"backend/internal/repository"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

func GetProductStatsHandler(pool *pgxpool.Pool) gin.HandlerFunc {
	return func(ctx *gin.Context) {

		products, err := repository.GetAllProduct(pool)
		if err != nil {
			ctx.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		totalStock := 0
		lowStockCount := 0

		for _, p := range products {
			totalStock += int(p.Quantity)

			if p.Quantity <= 10 {
				lowStockCount++
			}
		}

		avgStock := 0
		if len(products) > 0 {
			avgStock = totalStock / len(products)
		}

		ctx.JSON(http.StatusOK, gin.H{
			"low_stock":      lowStockCount,
			"avg_stock":      avgStock,
			"total_products": len(products),
		})
	}
}
