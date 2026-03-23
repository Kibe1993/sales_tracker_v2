// components/dashboard/CartIcon.tsx
"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import styles from "./cartIcon.module.css";

export default function CartIcon({ count }: { count: number }) {
  return (
    <Link href="/dashboard/cartpage" className={styles.cart}>
      <ShoppingCart size={22} />

      {count > 0 && <span className={styles.badge}>{count}</span>}
    </Link>
  );
}
