package main

import (
	"backend/internal/config"
	"backend/internal/database"
	"backend/internal/handlers"
	"backend/internal/middleware"
	"log"
	"os"

	"github.com/clerk/clerk-sdk-go/v2"
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

	// ✅ ONLY THIS IS NEEDED
	clerk.SetKey(os.Getenv("CLERK_SECRET_KEY"))

	var pool *pgxpool.Pool

	pool, err = database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to connect to database", err)
	}

	router := gin.Default()

	router.Use(cors.New(cors.Config{
		AllowOrigins: []string{"http://localhost:3000"},
		AllowMethods: []string{"POST", "GET", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders: []string{
			"Content-Type",
			"Authorization",
			"X-Clerk-User-Id",
		},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	router.SetTrustedProxies(nil)

	// PUBLIC ROUTES
	router.POST("/products", handlers.CreateProductHandler(pool))
	router.GET("/products", handlers.GetAllProductsHandler(pool))
	router.GET("/products/:id", handlers.GetProductByIdHandler(pool))
	router.GET("/stats", handlers.GetProductStatsHandler(pool))

	// ADMIN ROUTES
	admin := router.Group("/admin")
	admin.Use(middleware.AuthMiddleware())
	admin.Use(middleware.RequireAdmin())

	admin.PATCH("/products/:id", handlers.UpdateProductHandler(pool))
	admin.DELETE("/products/:id", handlers.DeleteProductHandler(pool))
	admin.PATCH("/products/:id/stock", handlers.UpdateStockHandler(pool))

	// CART
	router.POST("/cart/items", handlers.AddItemToCartHandler(pool))
	router.GET("/cart/:userId", handlers.GetDraftSaleHandler(pool))
	router.PATCH("/cart/items/:id", handlers.UpdateCartItemHandler(pool))
	router.DELETE("/cart/items/:id", handlers.DeleteCartItemHandler(pool))

	// CHECKOUT
	router.POST("/checkout", handlers.CheckoutHandler(pool))

	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal("Server failed:", err)
	}
}
