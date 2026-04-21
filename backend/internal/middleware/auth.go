package middleware

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"strings"

	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/gin-gonic/gin"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
			c.Abort()
			return
		}

		token := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))

		// ✅ Verify token first
		claims, err := jwt.Verify(context.Background(), &jwt.VerifyParams{
			Token: token,
		})
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		role := ""

		// MANUAL JWT decode (safe for custom claims)
		parts := strings.Split(token, ".")
		if len(parts) == 3 {
			payload, err := base64.RawURLEncoding.DecodeString(parts[1])
			if err == nil {
				var data map[string]interface{}
				if json.Unmarshal(payload, &data) == nil {

					// direct role
					if r, ok := data["role"].(string); ok {
						role = r
					}

					// Clerk metadata
					if role == "" {
						if pm, ok := data["public_metadata"].(map[string]interface{}); ok {
							if r, ok := pm["role"].(string); ok {
								role = r
							}
						}
					}
				}
			}
		}

		c.Set("userId", claims.Subject)
		c.Set("role", role)

		c.Next()
	}
}
