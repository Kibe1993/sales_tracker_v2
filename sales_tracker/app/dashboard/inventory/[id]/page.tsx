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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const addToCart = useCartStore((state) => state.addToCart);
  const loadDraftSale = useCartStore((state) => state.loadDraftSale);
  const getItemQty = useCartStore((state) => state.getItemQty);

  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();

  const userId = user?.id;
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

        if (data.images?.length > 0) {
          setSelectedImage(data.images[0]);
        }
      } catch (err) {
        console.error("[Product] fetch failed:", err);
        toast.error("Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchProduct();
  }, [id]);

  // 🔥 STOCK CALCULATION (IMPORTANT FIX)
  const cartQty = product ? getItemQty(product.id) : 0;
  const remainingStock = product ? product.quantity - cartQty : 0;
  const isOutOfStock = remainingStock <= 0;

  // Add to cart
  const handleAddToCart = async () => {
    if (!product) return;

    if (!userId) {
      toast.error("You must be logged in");
      return;
    }

    // 🔥 HARD FRONTEND GUARD
    if (isOutOfStock) {
      toast.error("No more stock available");
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
      toast.error("Failed to add item");
    } finally {
      setAdding(false);
    }
  };
  const getAuthToken = async () => {
    if (!isLoaded || !user) return null;

    return await getToken({
      template: "sales_tracker",
      skipCache: true,
    });
  };
  // Delete product
  const handleDelete = async () => {
    if (!product) return;
    if (!confirm("Delete this product?")) return;

    try {
      setLoading(true);

      const token = await getAuthToken();

      if (!token) {
        toast.error("Authentication failed");
        return;
      }

      await axios.delete(`http://localhost:5000/admin/products/${product.id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("Product deleted");
      router.push("/dashboard/inventory");
    } catch (err) {
      console.error("[Delete] failed:", err);
      toast.error("Delete failed");
    } finally {
      setLoading(false);
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
          {/* IMAGE SECTION */}
          <div className={styles.imageSection}>
            <img
              src={selectedImage || "/placeholder.png"}
              alt={product.product_name}
              className={styles.mainImage}
            />

            <div className={styles.thumbnailContainer}>
              {product.images?.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Thumbnail ${i}`}
                  className={`${styles.thumbnail} ${
                    selectedImage === img ? styles.activeThumbnail : ""
                  }`}
                  onClick={() => setSelectedImage(img)}
                />
              ))}
            </div>
          </div>

          {/* DETAILS SECTION */}
          <div className={styles.detailsSection}>
            <h1 className={styles.title}>{product.product_name}</h1>

            <p className={styles.category}>Category: {product.category}</p>

            <p className={styles.description}>{product.description}</p>

            {/* 🔥 SHOW REAL STOCK */}
            <p className={styles.stock}>{remainingStock} items available</p>

            <h2 className={styles.price}>
              KES {product.product_price.toLocaleString()}
              <span className={styles.unit}> / Unit</span>
            </h2>

            <div className={styles.actionsRow}>
              <button
                className={styles.buyBtn}
                disabled={isOutOfStock || adding}
                onClick={handleAddToCart}
              >
                {isOutOfStock
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
