"use client";

import { useEffect, useState } from "react";
import axios from "axios";

import Sidebar from "@/components/dashboard/sidebar";
import styles from "./page.module.css";
import StatCard from "@/components/dashboard/statcard";
import LowStock from "@/components/dashboard/lowstock";
import QuickStats from "@/components/dashboard/quickstats";
import Link from "next/link";
import CartIcon from "@/components/dashboard/cartIcon";
import { useCartStore } from "../inventory";
import CartInitializer from "@/components/dashboard/cartInitializer";
import { useUser } from "@clerk/nextjs";

type Product = {
  id: string;
  name: string;
  quantity: number;
  price: number;
};

export default function DashboardPage() {
  const cartCount = useCartStore((state) => state.getCount());
  const { user } = useUser();
  const userId = user?.id;

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get("http://localhost:5000/products");
        setProducts(res.data);
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // 🔹 Derived stats
  const totalProducts = products.length;

  const totalStock = products.reduce((acc, product) => {
    const stock = Number(product.quantity) || 0;
    return acc + stock;
  }, 0);
  const role = user?.publicMetadata?.role;
  return (
    <div className={styles.layout}>
      {userId && <CartInitializer userId={userId} />}

      <Sidebar />

      <div className={styles.main}>
        <section className={styles.header}>
          <div className={styles.welcome}>
            <h1>Dashboard</h1>
            <p>Overview of your inventory and sales performance</p>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.ctaButtons}>
              {role === "admin" && (
                <Link href={"/dashboard/product"}>Add Product +</Link>
              )}

              <Link href={"/dashboard/inventory"}>Sell Product</Link>
            </div>

            <CartIcon count={cartCount} />
          </div>
        </section>

        <section className={styles.stats}>
          <StatCard
            title="Total Product Categories"
            value={loading ? "..." : String(totalProducts)}
          />

          <StatCard
            title="Combined Stock Quantity"
            value={loading ? "..." : String(totalStock)}
          />

          {/*  Still dummy */}
          <StatCard title="Total Sales" value="0" />
          <StatCard title="Total Profit" value="0.00" />
        </section>

        <section className={styles.bottom}>
          <LowStock />
          <QuickStats />
        </section>
      </div>
    </div>
  );
}
