"use client";

import { useEffect } from "react";
import { useCartStore } from "@/app/inventory";

type CartInitializerProps = {
  userId: string;
};

export default function CartInitializer({ userId }: CartInitializerProps) {
  const loadDraftSale = useCartStore((state) => state.loadDraftSale);

  useEffect(() => {
    if (!userId) return;

    const init = async () => {
      try {
        await loadDraftSale(userId);
      } catch (err) {
        console.error("Cart initialization failed", err);
      }
    };

    init();
  }, [userId, loadDraftSale]);

  return null;
}
