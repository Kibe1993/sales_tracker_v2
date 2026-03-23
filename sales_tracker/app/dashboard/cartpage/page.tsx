"use client";

import { useEffect, useState } from "react";
import { useCartStore, CartItem } from "@/app/inventory";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { toast } from "react-toastify";

export default function CartPage() {
  const router = useRouter();

  const saleId = useCartStore((s) => s.saleId);
  const items = useCartStore((s) => s.items);

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("[CartPage] useEffect fired", { saleId, items });

    if (!saleId) {
      toast.error("No active cart");
      router.push("/dashboard/inventory");
      return;
    }

    if (!items || items.length === 0) {
      console.log("[CartPage] No items in cart");
      setLoading(false);
      return;
    }

    // Log each item to verify data
    items.forEach((item, index) =>
      console.log(`[CartPage] Item ${index + 1}`, item),
    );

    setCartItems(items);
    setLoading(false);
  }, [saleId, items, router]);

  const total = cartItems.reduce((sum, item) => sum + (item.subtotal ?? 0), 0);

  if (loading) return <p>Loading cart...</p>;

  if (cartItems.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Your Cart</h1>
        <p>Your cart is empty</p>
        <button
          onClick={() => router.push("/dashboard/inventory")}
          className={styles.checkoutBtn}
        >
          Continue Shopping
        </button>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Your Cart</h1>

      <div className={styles.container}>
        {/* Items List */}
        <div className={styles.items}>
          {cartItems.map((item) => (
            <div key={item.id} className={styles.item}>
              <div className={styles.imageSection}>
                <img
                  src={item.product_image || "https://via.placeholder.com/150"}
                  alt={item.product_name || "Product"}
                  className={styles.image}
                  onError={(e) => {
                    console.warn("[CartPage] Image load failed for", item);
                    (e.currentTarget as HTMLImageElement).src =
                      "https://via.placeholder.com/150";
                  }}
                />
              </div>
              <div className={styles.itemInfo}>
                <p className={styles.product}>
                  {item.product_name || "Unknown Product"}
                </p>
                <p className={styles.quantity}>Qty: {item.quantity}</p>
                <p className={styles.unitPrice}>
                  KES {(item.unitPrice ?? 0).toLocaleString()}
                </p>
              </div>
              <div className={styles.pricing}>
                <p className={styles.subtotal}>
                  KES {(item.subtotal ?? 0).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className={styles.summary}>
          <h2>Total</h2>
          <p className={styles.total}>KES {total.toLocaleString()}</p>

          <button
            className={styles.checkoutBtn}
            onClick={() => toast.info("Checkout not implemented yet")}
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
