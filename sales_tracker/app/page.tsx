"use client";

import { useEffect } from "react";
import styles from "./page.module.css";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function Home() {
  const { openSignIn, openSignUp } = useClerk();
  const { isSignedIn } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      router.push("/dashboard");
    }
  }, [isSignedIn, router]);

  return (
    <main className={styles.container}>
      <div className={styles.brand}>
        <div className={styles.logo}>📦</div>
        <h1 className={styles.title}>StockFlow</h1>
        <p className={styles.subtitle}>Inventory Management System</p>
      </div>

      <div className={styles.card}>
        <h2 className={styles.welcome}>Welcome</h2>
        <p className={styles.helper}>Sign in to your Account</p>

        {/* Auth navigation */}
        <div className={styles.authLinks}>
          <button
            className={styles.signInLink}
            type="button"
            onClick={() => openSignIn({ redirectUrl: "/dashboard" })}
          >
            Sign In
          </button>

          <button
            type="button"
            onClick={() => openSignUp()}
            className={styles.signUpLink}
          >
            Sign Up
          </button>
        </div>
      </div>
    </main>
  );
}
