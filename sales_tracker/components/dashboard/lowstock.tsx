"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import styles from "./lowstock.module.css";
import axios from "axios";

type Product = {
  id: string;
  product_name: string;
  quantity: number;
};

export default function LowStock() {
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await axios.get<Product[]>(
          "http://localhost:5000/products",
        );
        const data = res.data;
        if (!data) {
          ("Failed to fetch data");
        }

        //  Filter low stock
        const filtered = data.filter((p) => p.quantity <= 10);

        setLowStockItems(filtered);
      } catch (err) {
        console.error("Failed to fetch products", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>
        <AlertTriangle size={20} className={styles.icon} />
        Low Stock Alert
      </h3>

      <p>Products with 10 or fewer items in stock</p>

      {loading ? (
        <p>Loading...</p>
      ) : lowStockItems.length === 0 ? (
        <p>No low stock items </p>
      ) : (
        lowStockItems.map((item) => (
          <div key={item.id} className={styles.item}>
            <span>{item.product_name}</span>
            <span className={styles.badge}>{item.quantity} left</span>
          </div>
        ))
      )}
    </div>
  );
}
