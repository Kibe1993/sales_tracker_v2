package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {

		claims, exists := c.Get("claims")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			c.Abort()
			return
		}

		// Clerk stores metadata in claims
		cl := claims.(map[string]interface{})

		metadata, ok := cl["public_metadata"].(map[string]interface{})
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{"error": "no role found"})
			c.Abort()
			return
		}

		role, ok := metadata["role"].(string)
		if !ok || role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "admin only"})
			c.Abort()
			return
		}

		c.Next()
	}
}
