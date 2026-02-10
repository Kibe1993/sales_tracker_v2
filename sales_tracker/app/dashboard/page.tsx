"use client";

import Sidebar from "@/components/dashboard/sidebar";
import styles from "./page.module.css";
import StatCard from "@/components/dashboard/statcard";
import LowStock from "@/components/dashboard/lowstock";
import QuickStats from "@/components/dashboard/quickstats";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className={styles.layout}>
      <Sidebar />

      <div className={styles.main}>
        <section className={styles.header}>
          <div className={styles.welcome}>
            <h1>Dashboard</h1>
            <p>Overview of your inventory and sales performance</p>
          </div>

          <div className={styles.ctaButtons}>
            <Link href={"/dashboard/product"}>Add Product +</Link>
            <Link href={"/dashboard/sale"}>Sell Product</Link>
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
