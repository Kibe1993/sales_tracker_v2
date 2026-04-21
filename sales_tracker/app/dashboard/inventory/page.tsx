"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";
import styles from "./page.module.css";
import { useUser, useAuth } from "@clerk/nextjs";

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
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();

  // 🔐 ROLE CHECK
  const role = user?.publicMetadata?.role;
  const isAdmin = role === "admin";

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

  const handleStockChange = async (id: string, change: number) => {
    try {
      // 🔥 Ensure Clerk is ready
      if (!isLoaded || !user) {
        return;
      }

      setUpdatingId(id);

      // 🔥 FORCE template + bypass cache
      const token = await getToken({
        template: "sales_tracker",
        skipCache: true,
      });

      if (!token) {
        console.error("[STOCK FRONTEND] ❌ No auth token");
        return;
      }

      //  DECODE TOKEN (THIS IS CRITICAL)
      const payload = JSON.parse(atob(token.split(".")[1]));

      const url = `http://localhost:5000/admin/products/${id}/stock`;

      const { data } = await axios.patch(
        url,
        { change },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, quantity: data.quantity } : p)),
      );
    } catch (err) {
      console.error("[STOCK FRONTEND] ❌ Stock update failed:", err);
    } finally {
      setUpdatingId(null);
    }
  };
  const filtered =
    activeFilter === "All"
      ? products
      : products.filter(
          (p) => p.category.toLowerCase() === activeFilter.toLowerCase(),
        );

  const visible = filtered.slice(0, visibleCount);

  return (
    <div className={styles.page}>
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

        {loading && <p className={styles.status}>Loading products...</p>}
        {error && <p className={styles.error}>{error}</p>}

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

                    {/*  ONLY ADMIN SEES THIS */}
                    {isLoaded && isAdmin && (
                      <div className={styles.stockControls}>
                        <button
                          className={styles.stockBtn}
                          disabled={
                            product.quantity <= 0 || updatingId === product.id
                          }
                          onClick={() => handleStockChange(product.id, -1)}
                        >
                          -
                        </button>

                        <span className={styles.stockValue}>
                          {product.quantity}
                        </span>

                        <button
                          className={styles.stockBtn}
                          disabled={updatingId === product.id}
                          onClick={() => handleStockChange(product.id, +1)}
                        >
                          +
                        </button>
                      </div>
                    )}

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
