"use client";

import { create } from "zustand";
import axios from "axios";

export type CartItem = {
  id: string;
  productId: string; // keep camelCase for logic
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt?: string;
  product_name?: string;
  product_image?: string;
};

type CartStore = {
  items: CartItem[];

  loadDraftSale: (userId: string) => Promise<void>;
  addToCart: (args: {
    userId: string;
    productId: string;
    unitPrice: number;
  }) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;

  getCount: () => number;
};

// normalize backend → frontend
const formatItem = (item: any): CartItem => ({
  id: item.id,
  productId: item.product_id,
  quantity: item.quantity,
  unitPrice: item.unit_price,
  subtotal: item.subtotal,
  createdAt: item.created_at,
  product_name: item.product_name,
  product_image: item.product_image,
});

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],

  // ✅ LOAD CART
  loadDraftSale: async (userId) => {
    try {
      const { data } = await axios.get(`http://localhost:5000/cart/${userId}`);
      const formattedItems = (data.items || []).map(formatItem);

      set({ items: formattedItems });
      console.log("[Cart] loaded:", formattedItems.length);
    } catch (err: any) {
      if (err.response?.status === 404) {
        set({ items: [] });
      } else {
        console.error("[Cart] loadDraftSale failed:", err);
      }
    }
  },

  // ✅ ADD ITEM
  addToCart: async ({ userId, productId, unitPrice }) => {
    const { items } = get();

    try {
      const { data } = await axios.post("http://localhost:5000/cart/items", {
        clerkUserId: userId,
        productId,
        quantity: 1,
        unitPrice,
      });

      const formatted = formatItem(data);
      const exists = items.find((i) => i.productId === productId);

      if (exists) {
        set({
          items: items.map((i) =>
            i.productId === productId
              ? {
                  ...formatted,
                  product_name: i.product_name,
                  product_image: i.product_image,
                }
              : i,
          ),
        });
      } else {
        set({ items: [...items, formatted] });
      }
    } catch (err) {
      console.error("[Cart] addToCart failed:", err);
    }
  },

  // ✅ UPDATE QUANTITY
  updateQuantity: async (itemId, quantity) => {
    if (quantity < 0) return;

    try {
      const { data } = await axios.patch(
        `http://localhost:5000/cart/items/${itemId}`,
        { quantity },
      );

      set((state) => ({
        items: state.items.map((i) =>
          i.id === itemId
            ? { ...i, quantity: data.quantity, subtotal: data.subtotal }
            : i,
        ),
      }));
    } catch (err) {
      console.error("[Cart] updateQuantity failed:", err);
    }
  },

  // ✅ REMOVE ITEM
  removeItem: async (itemId) => {
    try {
      await axios.delete(`http://localhost:5000/cart/items/${itemId}`);
      set((state) => ({
        items: state.items.filter((i) => i.id !== itemId),
      }));
    } catch (err) {
      console.error("[Cart] removeItem failed:", err);
    }
  },

  // ✅ CART COUNT
  getCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
}));
