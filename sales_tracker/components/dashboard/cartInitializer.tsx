// components/dashboard/CartInitializer.tsx
"use client";

import { useEffect } from "react";
import { useCartStore } from "@/app/inventory";

type CartInitializerProps = {
  userId: string; // current logged-in user
};

export default function CartInitializer({ userId }: CartInitializerProps) {
  const loadDraftSale = useCartStore((state) => state.loadDraftSale);
  const initDraftSale = useCartStore((state) => state.initDraftSale);

  useEffect(() => {
    const initCart = async () => {
      try {
        await loadDraftSale(userId); // try to load existing draft sale

        const state = useCartStore.getState();
        if (!state.saleId) {
          await initDraftSale(userId); // create new draft if none exists
        }
      } catch (err) {
        console.error("Cart initialization failed", err);
      }
    };

    initCart();
  }, [userId, loadDraftSale, initDraftSale]);

  return null; // this component doesn't render anything
}
