"use client";

import { create } from "zustand";
import axios from "axios";

export type CartItem = {
  id: string;
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt?: string;
  product_name?: string;
  product_image?: string;
};

type CartStore = {
  items: CartItem[];
  saleId: string | null;

  initDraftSale: (userId: string) => Promise<void>;
  loadDraftSale: (userId: string) => Promise<void>;
  addToCart: (product: {
    productId: string;
    unitPrice: number;
  }) => Promise<void>;
  getCount: () => number;
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  saleId: null,

  initDraftSale: async (userId) => {
    console.log("[CartStore] initDraftSale called for user:", userId);
    try {
      const { data } = await axios.post("http://localhost:5000/sales/draft", {
        user_id: userId,
      });
      console.log("[CartStore] Draft sale created:", data);
      set({ saleId: data.id, items: [] });
    } catch (err) {
      console.error("[CartStore] Failed to create draft sale:", err);
    }
  },

  loadDraftSale: async (userId) => {
    console.log("[CartStore] loadDraftSale called for user:", userId);
    try {
      const { data } = await axios.get(
        `http://localhost:5000/sales/draft/${userId}`,
      );
      console.log("[CartStore] Draft sale loaded:", data);

      // Backend already returns productName and productImage
      set({ saleId: data.id, items: data.items || [] });
      console.log("[CartStore] State updated with draft sale:", get());
    } catch (err: any) {
      if (err.response?.status === 404) {
        console.warn("[CartStore] No draft sale found for user:", userId);
        set({ saleId: null, items: [] });
      } else {
        console.error("[CartStore] Failed to load draft sale:", err);
      }
    }
  },

  addToCart: async (product) => {
    const { items, saleId } = get();
    console.log("[CartStore] addToCart called:", { saleId, product });

    if (!saleId) {
      console.warn("[CartStore] No saleId set. Initialize draft sale first.");
      return;
    }

    try {
      const { data } = await axios.post(
        `http://localhost:5000/sales/${saleId}/items`,
        {
          product_id: product.productId,
          quantity: 1,
          unit_price: product.unitPrice,
        },
      );
      console.log("[CartStore] Item added to draft sale:", data);

      const existing = items.find((i) => i.productId === product.productId);
      if (existing) {
        set({
          items: items.map((i) =>
            i.productId === product.productId ? data : i,
          ),
        });
      } else {
        set({ items: [...items, data] });
      }

      console.log("[CartStore] Updated state after addToCart:", get());
    } catch (err) {
      console.error("[CartStore] Failed to add item to draft sale:", err);
    }
  },

  getCount: () => {
    const count = get().items.reduce((total, item) => total + item.quantity, 0);
    console.log("[CartStore] getCount called. Total items:", count);
    return count;
  },
}));
