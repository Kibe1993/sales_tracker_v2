"use client";

import { create } from "zustand";
import axios from "axios";

export type CartItem = {
  id: string; // backend sale_item id
  saleId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt?: string;
};

type CartStore = {
  items: CartItem[];
  saleId: string | null;

  // Backend operations
  initDraftSale: (userId: string) => Promise<void>;
  loadDraftSale: (userId: string) => Promise<void>;
  addToCart: (product: {
    productId: string;
    unitPrice: number;
  }) => Promise<void>;

  // Helper
  getCount: () => number;
};

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  saleId: null,

  initDraftSale: async (userId) => {
    try {
      const { data } = await axios.post("http://localhost:5000/sales/draft", {
        user_id: userId,
      });
      set({ saleId: data.id, items: [] });
    } catch (err) {
      console.error("Failed to create draft sale", err);
    }
  },

  loadDraftSale: async (userId) => {
    try {
      const { data } = await axios.get(
        `http://localhost:5000/sales/draft/${userId}`,
      );
      set({ saleId: data.id, items: data.items || [] });
    } catch (err: any) {
      if (err.response?.status === 404) {
        // No draft sale exists yet
        set({ saleId: null, items: [] });
      } else {
        console.error("Failed to load draft sale", err);
      }
    }
  },

  addToCart: async (product) => {
    const { items, saleId } = get();
    if (!saleId) {
      console.warn("No saleId set. Initialize draft sale first.");
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
    } catch (err) {
      console.error("Failed to add item to draft sale", err);
    }
  },

  getCount: () => get().items.reduce((total, item) => total + item.quantity, 0),
}));
