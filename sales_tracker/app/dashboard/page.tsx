"use client";

import Sidebar from "@/components/dashboard/sidebar";
import styles from "./page.module.css";
import StatCard from "@/components/dashboard/statcard";
import LowStock from "@/components/dashboard/lowstock";
import QuickStats from "@/components/dashboard/quickstats";
import Link from "next/link";
import CartIcon from "@/components/dashboard/cartIcon";
import { useCartStore } from "../inventory";
import CartInitializer from "@/components/dashboard/cartInitializer";

export default function DashboardPage() {
  const cartCount = useCartStore((state) => state.getCount());
  const userId = "28c9e3db-42ee-427d-81d5-9e9404bee2e2"; // replace with actual logged-in user ID

  return (
    <div className={styles.layout}>
      {/* Initialize cart on load */}
      <CartInitializer userId={userId} />

      <Sidebar />
      <div className={styles.main}>
        <section className={styles.header}>
          <div className={styles.welcome}>
            <h1>Dashboard</h1>
            <p>Overview of your inventory and sales performance</p>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.ctaButtons}>
              <Link href={"/dashboard/product"}>Add Product +</Link>
              <Link href={"/dashboard/sale"}>Sell Product</Link>
            </div>

            <CartIcon count={cartCount} />
          </div>
        </section>

        <section className={styles.stats}>
          <StatCard title="Total Products" value="0" />
          <StatCard title="Total Stock" value="0" />
          <StatCard title="Total Sales" value="0" />
          <StatCard title="Total Profit" value="$0.00" />
        </section>

        <section className={styles.bottom}>
          <LowStock />
          <QuickStats />
        </section>
      </div>
    </div>
  );
}
