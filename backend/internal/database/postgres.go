package database

import (
	"context"
	"log"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(DatabaseURL string) (*pgxpool.Pool, error) {
	var ctx context.Context = context.Background()
	var config *pgxpool.Config
	var err error

	config, err = pgxpool.ParseConfig(DatabaseURL)

	if err != nil {
		log.Printf("Unable to parse DATABASE_URL: %v", err)
		return nil, err
	}

	var pool *pgxpool.Pool

	pool, err = pgxpool.NewWithConfig(ctx, config)

	if err != nil {
		log.Printf("Unable to parse DATABASE_URL: %v", err)
		return nil, err
	}
	err = pool.Ping(ctx)

	if err != nil {
		log.Printf("Unable to ping database: %v", err)
		pool.Close()
		return nil, err
	}
	log.Printf("Successfully connected to postgreSQL database")
	return pool, nil

}
