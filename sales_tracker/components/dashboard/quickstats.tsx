import Link from "next/link";
import styles from "./quickstats.module.css";

export default function QuickStats() {
  return (
    <div className={styles.card}>
      <h3>Quick Stats</h3>
      <p>Key metrics at a glance</p>

      <ul className={styles.list}>
        <li className={styles.item}>
          <span>Low Stock Items</span>
          <strong>0</strong>
        </li>

        <li className={styles.item}>
          <span>Average Stock per Product</span>
          <strong>0</strong>
        </li>

        <li className={styles.item}>
          <span>Avg. Profit per Sale</span>
          <strong className={styles.green}>$0.00</strong>
        </li>
      </ul>

      <Link href={"/dashboard/inventory"} className={styles.inventory}>
        View Inventory
      </Link>
    </div>
  );
}
