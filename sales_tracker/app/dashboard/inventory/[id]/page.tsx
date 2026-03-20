"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import styles from "./page.module.css";
import { useCartStore } from "@/app/inventory";

type Product = {
  id: string;
  product_name: string;
  description: string;
  product_price: number;
  quantity: number;
  images: string[];
  category: string;
};

export default function ProductDetailsPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const addToCart = useCartStore((state) => state.addToCart);
  const saleId = useCartStore((state) => state.saleId);
  const initDraftSale = useCartStore((state) => state.initDraftSale);
  const loadDraftSale = useCartStore((state) => state.loadDraftSale);

  const userId = "28c9e3db-42ee-427d-81d5-9e9404bee2e2";

  // Load existing draft sale or create a new one
  useEffect(() => {
    const ensureDraftSale = async () => {
      await loadDraftSale(userId);
      if (!useCartStore.getState().saleId) {
        await initDraftSale(userId);
      }
    };
    ensureDraftSale();
  }, [userId, loadDraftSale, initDraftSale]);

  // Fetch product
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await axios.get(
          `http://localhost:5000/products/${id}`,
        );
        setProduct(data);
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchProduct();
  }, [id]);

  if (loading) return <p>Loading product...</p>;
  if (!product) return <p>Product not found</p>;

  return (
    <div className={styles.page}>
      <div className={styles.wrapper}>
        <Link href="/dashboard/inventory" className={styles.backBtn}>
          ← Back to Products
        </Link>

        <div className={styles.container}>
          <div className={styles.imageSection}>
            <img
              src={product.images?.[0] || "/placeholder.png"}
              alt={product.product_name}
              className={styles.mainImage}
            />
          </div>

          <div className={styles.detailsSection}>
            <h1 className={styles.title}>{product.product_name}</h1>
            <p className={styles.category}>Category: {product.category}</p>
            <p className={styles.description}>{product.description}</p>
            <p className={styles.stock}>{product.quantity} items in stock</p>
            <h2 className={styles.price}>
              KES {product.product_price.toLocaleString()}
            </h2>

            <button
              className={styles.buyBtn}
              disabled={product.quantity === 0 || !saleId}
              onClick={() =>
                saleId &&
                addToCart({
                  productId: product.id,
                  unitPrice: product.product_price,
                })
              }
            >
              {!saleId
                ? "Initializing Cart..."
                : product.quantity === 0
                  ? "Out of Stock"
                  : "Add to Cart"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
