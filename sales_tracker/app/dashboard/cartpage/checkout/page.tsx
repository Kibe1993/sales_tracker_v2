"use client";

import { useEffect, useState } from "react";
import { useCartStore } from "@/app/inventory";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import styles from "./page.module.css";
import { toast } from "react-toastify";
import axios from "axios";
import Link from "next/link";
import { ArrowLeft, Trash2, Plus, Minus } from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  const items = useCartStore((s) => s.items);
  const loadDraftSale = useCartStore((s) => s.loadDraftSale);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const cartBusy = useCartStore((s) => s.cartBusy);

  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    loadDraftSale(user.id).finally(() => setLoading(false));
  }, [isLoaded, user?.id]);

  const handleIncrement = async (itemId: string, qty: number) => {
    if (cartBusy) return;
    await updateQuantity(itemId, qty + 1);
  };

  const handleDecrement = async (itemId: string, qty: number) => {
    if (cartBusy) return;
    if (qty <= 1) return;
    await updateQuantity(itemId, qty - 1);
  };

  const handleRemove = async (itemId: string) => {
    if (cartBusy) return;

    if (confirm("Remove this item?")) {
      await removeItem(itemId);
      toast.info("Item removed");
    }
  };

  const total = items.reduce((sum, i) => sum + (i.subtotal ?? 0), 0);

  // ✅ AXIOS checkout
  const handleCheckout = async () => {
    if (!user?.id) {
      toast.error("You must be logged in");
      return;
    }

    if (checkingOut || cartBusy) return;

    const confirmOrder = confirm("Complete this sale?");
    if (!confirmOrder) return;

    try {
      setCheckingOut(true);

      const { data } = await axios.post(
        "http://localhost:5000/checkout",
        {},
        {
          headers: {
            "X-Clerk-User-Id": user.id,
          },
        },
      );

      toast.success("Order completed successfully!");

      await loadDraftSale(user.id);

      router.push("/dashboard/orders");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.error || "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  };

  if (!isLoaded || loading) return <p>Loading checkout...</p>;

  if (!items || items.length === 0) {
    return (
      <div className={styles.page}>
        <h1 className={styles.title}>Checkout</h1>
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
      <h1 className={styles.title}>Checkout</h1>

      <div className={styles.container}>
        <div className={styles.items}>
          {items.map((item) => (
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
                    onClick={() => handleIncrement(item.id, item.quantity)}
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <p className={styles.unitPrice}>
                  KES {(item.unitPrice ?? 0).toLocaleString()}
                </p>
              </div>

              <div className={styles.pricing}>
                <p className={styles.subtotal}>
                  KES {(item.subtotal ?? 0).toLocaleString()}
                </p>

                <button onClick={() => handleRemove(item.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.summary}>
          <h2>Order Summary</h2>

          <p className={styles.total}>Total: KES {total.toLocaleString()}</p>

          <button
            className={styles.checkoutBtn}
            onClick={handleCheckout}
            disabled={checkingOut || cartBusy}
          >
            {checkingOut ? "Processing..." : "Complete Sale"}
          </button>
        </div>

        <Link href="/dashboard/cartpage" className={styles.backLink}>
          <ArrowLeft size={18} />
          <span>Back to Cart</span>
        </Link>
      </div>
    </div>
  );
}
