"use client";
import { useClerk, useUser } from "@clerk/nextjs";
import styles from "./sidebar.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Sidebar() {
  const { signOut } = useClerk();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <aside className={styles.sidebar}>
      <Link href={"/"} className={styles.brand}>
        <span className={styles.logo}>📦</span>
        <div>
          <h2>StockFlow</h2>
          <p>Inventory Manager</p>
        </div>
      </Link>

      <nav className={styles.nav}>
        <Link href="/dashboard" className={styles.active}>
          Dashboard
        </Link>
        <Link href="/dashboard/product">Products</Link>
        <Link href="/dashboard/inventory">Inventory</Link>
        <Link href="/dashboard/sale">Sales</Link>
      </nav>

      <button className={styles.logoutButton} onClick={handleLogout}>
        Logout
      </button>
    </aside>
  );
}
