"use client";

import { create } from "zustand";
import axios from "axios";

export type CartItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  createdAt?: string;
  product_name?: string;
  product_image?: string;

  // 👇 NEW: stock awareness
  productStock?: number;
};

type CartStore = {
  items: CartItem[];
  cartBusy: boolean;

  loadDraftSale: (userId: string) => Promise<void>;

  addToCart: (args: {
    userId: string;
    productId: string;
    unitPrice: number;
    productStock?: number;
  }) => Promise<void>;

  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;

  setCartBusy: (value: boolean) => void;

  getCount: () => number;
  getItemQty: (productId: string) => number;

  // 👇 NEW helper (important for UI disabling)
  canAddMore: (productId: string, stock: number) => boolean;
};

const formatItem = (item: any): CartItem => ({
  id: item.id,
  productId: item.product_id,
  quantity: item.quantity,
  unitPrice: item.unit_price,
  subtotal: item.subtotal,
  createdAt: item.created_at,
  product_name: item.product_name,
  product_image: item.product_image,

  // 👇 backend must send this now
  productStock: item.product_stock,
});

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  cartBusy: false,

  setCartBusy: (value) => set({ cartBusy: value }),

  loadDraftSale: async (userId) => {
    try {
      const { data } = await axios.get(`http://localhost:5000/cart/${userId}`);

      const formattedItems = (data.items || []).map(formatItem);
      set({ items: formattedItems });
    } catch (err: any) {
      if (err.response?.status === 404) {
        set({ items: [] });
      } else {
        console.error("[Cart] loadDraftSale failed:", err);
      }
    }
  },

  // =========================
  // ADD TO CART (SAFE)
  // =========================
  addToCart: async ({ userId, productId, unitPrice, productStock }) => {
    const { items } = get();
    set({ cartBusy: true });

    try {
      const existingQty = items
        .filter((i) => i.productId === productId)
        .reduce((sum, i) => sum + i.quantity, 0);

      // 👇 FRONTEND GUARD (optional but good UX)
      if (productStock !== undefined && existingQty >= productStock) {
        console.warn("[Cart] Stock limit reached");
        return;
      }

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
    } finally {
      set({ cartBusy: false });
    }
  },

  // =========================
  // UPDATE QUANTITY (BACKEND IS FINAL AUTHORITY)
  // =========================
  updateQuantity: async (itemId, quantity) => {
    if (quantity < 0) return;

    set({ cartBusy: true });

    try {
      const { data } = await axios.patch(
        `http://localhost:5000/cart/items/${itemId}`,
        { quantity },
      );

      set((state) => ({
        items: state.items.map((i) =>
          i.id === itemId
            ? {
                ...i,
                quantity: data.quantity,
                subtotal: data.subtotal,
              }
            : i,
        ),
      }));
    } catch (err) {
      console.error("[Cart] updateQuantity failed:", err);
    } finally {
      set({ cartBusy: false });
    }
  },

  removeItem: async (itemId) => {
    set({ cartBusy: true });

    try {
      await axios.delete(`http://localhost:5000/cart/items/${itemId}`);

      set((state) => ({
        items: state.items.filter((i) => i.id !== itemId),
      }));
    } catch (err) {
      console.error("[Cart] removeItem failed:", err);
    } finally {
      set({ cartBusy: false });
    }
  },

  // =========================
  // HELPERS
  // =========================
  getCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  getItemQty: (productId: string) => {
    return get()
      .items.filter((i) => i.productId === productId)
      .reduce((sum, i) => sum + i.quantity, 0);
  },

  // 👇 NEW: used for disabling + button in UI
  canAddMore: (productId: string, stock: number) => {
    const qty = get()
      .items.filter((i) => i.productId === productId)
      .reduce((sum, i) => sum + i.quantity, 0);

    return qty < stock;
  },
}));
