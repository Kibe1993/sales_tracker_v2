"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./quickstats.module.css";
import axios from "axios";

type Stats = {
  low_stock: number;
  avg_stock: number;
  total_products: number;
};

export default function QuickStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get("http://localhost:5000/stats");
        setStats(res.data);
        if (res.data) throw new Error("Failed to fetch stats");

        setStats(res.data);
      } catch (err) {
        console.error("Stats error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className={styles.card}>
      <h3>Quick Stats</h3>
      <p>Key metrics at a glance</p>

      {loading ? (
        <p>Loading stats...</p>
      ) : !stats ? (
        <p>Failed to load stats</p>
      ) : (
        <ul className={styles.list}>
          <li className={styles.item}>
            <span>Low Stock Items</span>
            <strong className={styles.danger}>{stats.low_stock}</strong>
          </li>

          <li className={styles.item}>
            <span>Average Stock per Product</span>
            <strong>{stats.avg_stock}</strong>
          </li>

          <li className={styles.item}>
            <span>Avg. Profit per Sale</span>
            <strong className={styles.muted}>--</strong>
          </li>
        </ul>
      )}

      <Link href="/dashboard/inventory" className={styles.inventory}>
        View Inventory
      </Link>
    </div>
  );
}
