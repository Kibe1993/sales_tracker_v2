"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import styles from "./page.module.css";

type Product = {
  id: string;
  product_name: string;
  description: string;
  product_price: number;
  quantity: number;
  images: string[];
  category: string;
};

export default function ProductPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [visibleCount, setVisibleCount] = useState(8);
  const [activeFilter, setActiveFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data } = await axios.get("http://localhost:5000/products");
        setProducts(data);
      } catch (err: unknown) {
        if (axios.isAxiosError(err))
          setError(err.response?.data?.error || err.message);
        else setError("Failed to load products from the Database");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filtered =
    activeFilter === "All"
      ? products
      : products.filter(
          (p) => p.category.toLowerCase() === activeFilter.toLowerCase(),
        );

  const visible = filtered.slice(0, visibleCount);

  return (
    <div className={styles.page}>
      {/* Dashboard link OUTSIDE container */}
      <div className={styles.topBar}>
        <Link href="/dashboard" className={styles.dashboardLink}>
          ← Dashboard
        </Link>
      </div>

      <div className={styles.container}>
        {/* Filters */}
        <div className={styles.filters}>
          {["All", "Electronics", "Cyber", "Services"].map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveFilter(cat);
                setVisibleCount(8);
              }}
              className={`${styles.filterBtn} ${
                activeFilter === cat ? styles.active : ""
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && <p className={styles.status}>Loading products...</p>}

        {/* Error */}
        {error && <p className={styles.error}>{error}</p>}

        {/* Grid */}
        {!loading && !error && (
          <>
            <div className={styles.grid}>
              {visible.map((product) => (
                <div key={product.id} className={styles.card}>
                  <div className={styles.imageWrapper}>
                    <img
                      src={product.images?.[0] || "/placeholder.png"}
                      alt={product.product_name}
                    />
                  </div>

                  <div className={styles.cardContent}>
                    <h3 className={styles.title}>{product.product_name}</h3>

                    <p className={styles.description}>{product.description}</p>

                    <div className={styles.meta}>
                      <span className={styles.quantity}>
                        {product.quantity} in stock
                      </span>
                      <span className={styles.price}>
                        KES {product.product_price.toLocaleString()}
                      </span>
                    </div>

                    <Link
                      href={`/dashboard/inventory/${product.id}`}
                      className={styles.seeMoreBtn}
                    >
                      View Product →
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More */}
            {visibleCount < filtered.length && (
              <div className={styles.loadWrapper}>
                <button
                  onClick={() => setVisibleCount((prev) => prev + 8)}
                  className={styles.loadBtn}
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
