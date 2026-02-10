import { AlertTriangle } from "lucide-react";
import styles from "./lowstock.module.css";

export default function LowStock() {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>
        <AlertTriangle size={20} className={styles.icon} />
        Low Stock Alert
      </h3>
      <p>Products with 10 or fewer items in stock</p>

      <div className={styles.item}>
        <span>0</span>
        <span className={styles.badge}>0 left</span>
      </div>
    </div>
  );
}
