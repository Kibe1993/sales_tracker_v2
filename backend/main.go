package main

import (
	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/handlers"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	// Load config
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	var pool *pgxpool.Pool

	pool, err = database.Connect(cfg.DatabaseURL)

	if err != nil {
		log.Fatal("Failed to connect to database", err)

	}

	router := gin.Default()

	// CORS setup
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"},
		AllowMethods:     []string{"POST", "GET", "OPTIONS"},
		AllowHeaders:     []string{"Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	router.SetTrustedProxies(nil)

	router.POST("/products", handlers.CreateProductHandler(pool))
	router.GET("/products", handlers.GetAllProductsHandler(pool))
	router.GET("/products/:id", handlers.GetProductByIdHandler(pool))

	router.POST("/sales/draft", handlers.CreateDraftSaleHandler(pool))
	router.POST("/sales/:sale_id/items", handlers.AddItemToDraftSaleHandler(pool))
	router.GET("/sales/draft/:user_id", handlers.GetDraftSaleHandler(pool))

	// Start server
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal("Server failed:", err)
	}
}
