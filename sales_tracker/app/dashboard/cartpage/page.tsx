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

  useEffect(() => {
    if (!isLoaded) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    loadDraftSale(user.id).finally(() => setLoading(false));
  }, [isLoaded, user?.id]);

  const handleIncrement = async (
    itemId: string,
    qty: number,
    stock?: number,
  ) => {
    if (stock !== undefined && qty >= stock) {
      toast.warning("No more stock available");
      return;
    }

    await updateQuantity(itemId, qty + 1);
  };

  const handleDecrement = async (itemId: string, qty: number) => {
    if (qty <= 1) return;
    await updateQuantity(itemId, qty - 1);
  };

  const handleRemove = async (itemId: string) => {
    if (confirm("Are you sure you want to remove this item?")) {
      await removeItem(itemId);
      toast.info("Item removed from cart");
    }
  };

  const handleCheckout = () => {
    router.push("/dashboard/cartpage/checkout");
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
        <div className={styles.items}>
          {items.map((item) => {
            const maxReached =
              item.productStock !== undefined &&
              item.quantity >= item.productStock;

            return (
              <div key={item.id} className={styles.item}>
                <img
                  src={item.product_image || "https://via.placeholder.com/150"}
                  className={styles.image}
                />

                <div className={styles.itemInfo}>
                  <p className={styles.product}>{item.product_name}</p>

                  <div className={styles.quantityControls}>
                    <button
                      onClick={() => handleDecrement(item.id, item.quantity)}
                    >
                      <Minus size={16} />
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      onClick={() =>
                        handleIncrement(
                          item.id,
                          item.quantity,
                          item.productStock,
                        )
                      }
                      disabled={maxReached}
                      style={{
                        opacity: maxReached ? 0.4 : 1,
                        cursor: maxReached ? "not-allowed" : "pointer",
                      }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {maxReached && (
                    <p style={{ fontSize: "12px", color: "orange" }}>
                      Max stock reached ({item.productStock})
                    </p>
                  )}

                  <p className={styles.unitPrice}>
                    KES {(item.unitPrice ?? 0).toLocaleString()}
                  </p>
                </div>

                <div className={styles.pricing}>
                  <p className={styles.subtotal}>
                    KES {(item.subtotal ?? 0).toLocaleString()}
                  </p>

                  <button
                    onClick={() => handleRemove(item.id)}
                    className={styles.removeBtn}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.summary}>
          <h2>Total</h2>
          <p className={styles.total}>KES {total.toLocaleString()}</p>

          <button className={styles.checkoutBtn} onClick={handleCheckout}>
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
