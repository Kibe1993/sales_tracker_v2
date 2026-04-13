"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import styles from "./page.module.css";
import { useCartStore } from "@/app/inventory";
import { toast } from "react-toastify";
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

export default function ProductDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const addToCart = useCartStore((state) => state.addToCart);
  const loadDraftSale = useCartStore((state) => state.loadDraftSale);

  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();

  const userId = user?.id;

  // role
  const role = user?.publicMetadata?.role;

  // Load cart
  useEffect(() => {
    if (!isLoaded || !userId) return;

    loadDraftSale(userId).catch(() => {
      toast.error("Failed to load cart");
    });
  }, [isLoaded, userId, loadDraftSale]);

  // Fetch product
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data } = await axios.get(
          `http://localhost:5000/products/${id}`,
        );
        setProduct(data);
      } catch (err) {
        console.error("[Product] fetch failed:", err);
        setProduct(null);
        toast.error("Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id]);

  // Add to cart
  const handleAddToCart = async () => {
    if (!product) return;

    if (!userId) {
      toast.error("You must be logged in");
      return;
    }

    try {
      setAdding(true);

      await addToCart({
        userId,
        productId: product.id,
        unitPrice: product.product_price,
      });

      toast.success("Item added to cart");

      setTimeout(() => {
        router.push("/dashboard/cartpage");
      }, 700);
    } catch (err) {
      console.error("[Cart] add failed:", err);
      toast.error("Failed to add item to cart");
    } finally {
      setAdding(false);
    }
  };

  // Delete product (FIXED)
  const handleDelete = async () => {
    if (!product) return;

    const confirmDelete = confirm(
      "Are you sure you want to delete this product?",
    );
    if (!confirmDelete) return;

    try {
      const token = await getToken();

      await axios.delete(`http://localhost:5000/products/${product.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("Product deleted");
      router.push("/dashboard/inventory");
    } catch (err) {
      console.error("[Delete] failed:", err);
      toast.error("Failed to delete product");
    }
  };

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
              <span className={styles.unit}> / Unit</span>
            </h2>

            <div className={styles.actionsRow}>
              <button
                className={styles.buyBtn}
                disabled={product.quantity === 0 || adding}
                onClick={handleAddToCart}
              >
                {product.quantity === 0
                  ? "Out of Stock"
                  : adding
                    ? "Adding..."
                    : "Add to Cart"}
              </button>

              {role === "admin" && (
                <>
                  <button
                    className={styles.editBtn}
                    onClick={() =>
                      router.push(`/dashboard/inventory/${product.id}/edit`)
                    }
                  >
                    Edit
                  </button>

                  <button className={styles.deleteBtn} onClick={handleDelete}>
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
