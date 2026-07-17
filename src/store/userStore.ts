import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "fan" | "staff" | "admin";
  seat?: string;
  language?: string;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: "food" | "drink" | "merch";
  imageUrl?: string;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: "pending" | "preparing" | "ready" | "completed";
  pickupLocation: string;
  createdAt: string;
}

interface UserStore {
  user: User | null;
  cart: CartItem[];
  orders: Order[];
  setUser: (user: User) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (itemId: string) => void;
  updateCartQty: (itemId: string, qty: number) => void;
  clearCart: () => void;
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order["status"]) => void;
  logout: () => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      cart: [],
      orders: [],

      setUser: (user) => set({ user }),

      addToCart: (item) =>
        set((state) => {
          const existing = state.cart.find((c) => c.id === item.id);
          if (existing) {
            return {
              cart: state.cart.map((c) =>
                c.id === item.id ? { ...c, quantity: c.quantity + item.quantity } : c
              ),
            };
          }
          return { cart: [...state.cart, item] };
        }),

      removeFromCart: (itemId) =>
        set((state) => ({
          cart: state.cart.filter((item) => item.id !== itemId),
        })),

      updateCartQty: (itemId, qty) =>
        set((state) => ({
          cart: qty <= 0
            ? state.cart.filter((item) => item.id !== itemId)
            : state.cart.map((item) => (item.id === itemId ? { ...item, quantity: qty } : item)),
        })),

      clearCart: () => set({ cart: [] }),

      addOrder: (order) =>
        set((state) => ({
          orders: [order, ...state.orders],
        })),

      updateOrderStatus: (orderId, status) =>
        set((state) => ({
          orders: state.orders.map((o) => (o.id === orderId ? { ...o, status } : o)),
        })),

      logout: () => set({ user: null, cart: [], orders: [] }),
    }),
    {
      name: "fanops-user-store",
      partialize: (state) => ({
        user: state.user,
        cart: state.cart,
        orders: state.orders,
      }),
    }
  )
);

// Selector helpers
export const useUser = () => useUserStore((state) => state.user);
export const useCart = () => useUserStore((state) => state.cart);
export const useCartTotal = () =>
  useUserStore((state) =>
    state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );
export const useOrders = () => useUserStore((state) => state.orders);
