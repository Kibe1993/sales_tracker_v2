"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/app/inventory";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import styles from "./page.module.css";
import { toast } from "react-toastify";
import Link from "next/link";
import { ArrowLeft, Trash2, Plus, Minus } from "lucide-react";

export default function CartPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const items = useCartStore((s) => s.items);
  const loadDraftSale = useCartStore((s) => s.loadDraftSale);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);

  const [loading, setLoading] = useState(true);

  // ✅ Load cart ONLY when Clerk is ready
  useEffect(() => {
    if (!isLoaded) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    loadDraftSale(user.id).finally(() => setLoading(false));
  }, [isLoaded, user?.id]);

  const handleIncrement = async (itemId: string, currentQty: number) => {
    await updateQuantity(itemId, currentQty + 1);
  };

  const handleDecrement = async (itemId: string, currentQty: number) => {
    if (currentQty <= 1) return; // prevent negative
    await updateQuantity(itemId, currentQty - 1);
  };

  const handleRemove = async (itemId: string) => {
    if (confirm("Are you sure you want to remove this item?")) {
      await removeItem(itemId);
      toast.info("Item removed from cart");
    }
  };

  const total = items.reduce((sum, item) => sum + (item.subtotal ?? 0), 0);

  if (!isLoaded || loading) return <p>Loading cart...</p>;

  if (!items || items.length === 0) {
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
          {items.map((item) => (
            <div key={item.id} className={styles.item}>
              <div className={styles.imageSection}>
                <img
                  src={item.product_image || "https://via.placeholder.com/150"}
                  alt={item.product_name || "Product"}
                  className={styles.image}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "https://via.placeholder.com/150";
                  }}
                />
              </div>

              <div className={styles.itemInfo}>
                <p className={styles.product}>
                  {item.product_name || "Unknown Product"}
                </p>

                <div className={styles.quantityControls}>
                  <button
                    onClick={() => handleDecrement(item.id, item.quantity)}
                  >
                    <Minus size={16} />
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() => handleIncrement(item.id, item.quantity)}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <p className={styles.unitPrice}>
                  KES {(item.unitPrice ?? 0).toLocaleString()} / Unit
                </p>
              </div>

              <div className={styles.pricing}>
                <p className={styles.subtotal}>
                  KES {(item.subtotal ?? 0).toLocaleString()}
                </p>
                <button
                  onClick={() => handleRemove(item.id)}
                  className={styles.removeBtn}
                  title="Remove item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className={styles.summary}>
          <h2>Total</h2>
          <p className={styles.total}>KES {total.toLocaleString()} </p>

          <button
            className={styles.checkoutBtn}
            onClick={() => toast.info("Checkout not implemented yet")}
          >
            Checkout
          </button>
        </div>

        <Link href="/dashboard/inventory" className={styles.backLink}>
          <ArrowLeft size={18} />
          <span>Back to Inventory</span>
        </Link>
      </div>
    </div>
  );
}
