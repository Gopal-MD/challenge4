/**
 * @file userStore.test.ts
 * Comprehensive unit tests for the Zustand userStore.
 * Covers user auth, cart management (add, update, remove, clear), orders,
 * and selector helpers.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useUserStore } from './userStore';
import type { User, CartItem, Order } from './userStore';

// ─── Helper factories ─────────────────────────────────────────────────────────
const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-test-1',
  name: 'Test Fan',
  email: 'fan@example.com',
  role: 'fan',
  language: 'English',
  ...overrides,
});

const makeCartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  name: 'Stadium Hotdog',
  price: 8.50,
  quantity: 1,
  category: 'food',
  ...overrides,
});

const makeOrder = (overrides: Partial<Order> = {}): Order => ({
  id: `order-${Date.now()}`,
  items: [makeCartItem()],
  total: 8.50,
  status: 'pending',
  pickupLocation: 'Concourse B',
  createdAt: new Date().toISOString(),
  ...overrides,
});

// ─── Reset helper (clears persisted state) ────────────────────────────────────
function resetStore() {
  useUserStore.setState({ user: null, cart: [], orders: [] });
}

// ─── Test Suite ───────────────────────────────────────────────────────────────
describe('useUserStore', () => {
  beforeEach(() => {
    resetStore();
  });

  // ─── User Management ──────────────────────────────────────────────────────
  describe('setUser()', () => {
    it('sets the current user', () => {
      const user = makeUser({ name: 'Gopal' });
      useUserStore.getState().setUser(user);
      expect(useUserStore.getState().user?.name).toBe('Gopal');
    });

    it('replaces previous user', () => {
      useUserStore.getState().setUser(makeUser({ name: 'First' }));
      useUserStore.getState().setUser(makeUser({ name: 'Second', id: 'user-2' }));
      expect(useUserStore.getState().user?.name).toBe('Second');
    });

    it('supports different roles', () => {
      useUserStore.getState().setUser(makeUser({ role: 'admin' }));
      expect(useUserStore.getState().user?.role).toBe('admin');
      useUserStore.getState().setUser(makeUser({ role: 'staff' }));
      expect(useUserStore.getState().user?.role).toBe('staff');
    });
  });

  describe('logout()', () => {
    it('clears user, cart, and orders', () => {
      useUserStore.getState().setUser(makeUser());
      useUserStore.getState().addToCart(makeCartItem({ id: 'logout-item' }));
      useUserStore.getState().addOrder(makeOrder());
      useUserStore.getState().logout();
      expect(useUserStore.getState().user).toBeNull();
      expect(useUserStore.getState().cart).toHaveLength(0);
      expect(useUserStore.getState().orders).toHaveLength(0);
    });
  });

  // ─── Cart Management ──────────────────────────────────────────────────────
  describe('addToCart()', () => {
    it('adds a new item to an empty cart', () => {
      const item = makeCartItem({ id: 'new-item-1', name: 'Nachos' });
      useUserStore.getState().addToCart(item);
      expect(useUserStore.getState().cart).toHaveLength(1);
      expect(useUserStore.getState().cart[0].name).toBe('Nachos');
    });

    it('increments quantity if item already exists in cart', () => {
      const item = makeCartItem({ id: 'dup-item', quantity: 1 });
      useUserStore.getState().addToCart(item);
      useUserStore.getState().addToCart({ ...item, quantity: 2 });
      const cart = useUserStore.getState().cart;
      expect(cart).toHaveLength(1); // not duplicated
      expect(cart[0].quantity).toBe(3); // 1 + 2
    });

    it('adds different items as separate cart entries', () => {
      useUserStore.getState().addToCart(makeCartItem({ id: 'item-a', name: 'Burger' }));
      useUserStore.getState().addToCart(makeCartItem({ id: 'item-b', name: 'Water' }));
      expect(useUserStore.getState().cart).toHaveLength(2);
    });

    it('supports all item categories', () => {
      const categories: CartItem['category'][] = ['food', 'drink', 'merch'];
      categories.forEach((category, i) => {
        useUserStore.getState().addToCart(makeCartItem({ id: `cat-${i}`, category }));
      });
      expect(useUserStore.getState().cart).toHaveLength(3);
    });
  });

  describe('removeFromCart()', () => {
    it('removes an item by id', () => {
      useUserStore.getState().addToCart(makeCartItem({ id: 'rm-1' }));
      useUserStore.getState().addToCart(makeCartItem({ id: 'rm-2' }));
      useUserStore.getState().removeFromCart('rm-1');
      const ids = useUserStore.getState().cart.map((c) => c.id);
      expect(ids).not.toContain('rm-1');
      expect(ids).toContain('rm-2');
    });

    it('does nothing if item does not exist', () => {
      useUserStore.getState().addToCart(makeCartItem({ id: 'safe' }));
      useUserStore.getState().removeFromCart('non-existent');
      expect(useUserStore.getState().cart).toHaveLength(1);
    });
  });

  describe('updateCartQty()', () => {
    it('updates item quantity to a new value', () => {
      useUserStore.getState().addToCart(makeCartItem({ id: 'qty-1', quantity: 1 }));
      useUserStore.getState().updateCartQty('qty-1', 5);
      const item = useUserStore.getState().cart.find((c) => c.id === 'qty-1');
      expect(item?.quantity).toBe(5);
    });

    it('removes item when quantity is set to 0', () => {
      useUserStore.getState().addToCart(makeCartItem({ id: 'qty-0' }));
      useUserStore.getState().updateCartQty('qty-0', 0);
      expect(useUserStore.getState().cart.find((c) => c.id === 'qty-0')).toBeUndefined();
    });

    it('removes item when quantity is negative', () => {
      useUserStore.getState().addToCart(makeCartItem({ id: 'qty-neg' }));
      useUserStore.getState().updateCartQty('qty-neg', -1);
      expect(useUserStore.getState().cart.find((c) => c.id === 'qty-neg')).toBeUndefined();
    });
  });

  describe('clearCart()', () => {
    it('empties the entire cart', () => {
      useUserStore.getState().addToCart(makeCartItem({ id: 'c1' }));
      useUserStore.getState().addToCart(makeCartItem({ id: 'c2' }));
      useUserStore.getState().clearCart();
      expect(useUserStore.getState().cart).toHaveLength(0);
    });

    it('is safe to call on an empty cart', () => {
      expect(() => useUserStore.getState().clearCart()).not.toThrow();
    });
  });

  // ─── Orders ───────────────────────────────────────────────────────────────
  describe('addOrder()', () => {
    it('adds a new order to the orders list', () => {
      const order = makeOrder({ id: 'order-unique', total: 25.00 });
      useUserStore.getState().addOrder(order);
      expect(useUserStore.getState().orders).toHaveLength(1);
      expect(useUserStore.getState().orders[0].total).toBe(25.00);
    });

    it('prepends orders (newest first)', () => {
      useUserStore.getState().addOrder(makeOrder({ id: 'o1' }));
      useUserStore.getState().addOrder(makeOrder({ id: 'o2' }));
      expect(useUserStore.getState().orders[0].id).toBe('o2');
    });
  });

  describe('updateOrderStatus()', () => {
    it('updates order status correctly', () => {
      const order = makeOrder({ id: 'status-1', status: 'pending' });
      useUserStore.getState().addOrder(order);
      useUserStore.getState().updateOrderStatus('status-1', 'ready');
      const updated = useUserStore.getState().orders.find((o) => o.id === 'status-1');
      expect(updated?.status).toBe('ready');
    });

    it('does not affect other orders', () => {
      useUserStore.getState().addOrder(makeOrder({ id: 'sa', status: 'pending' }));
      useUserStore.getState().addOrder(makeOrder({ id: 'sb', status: 'pending' }));
      useUserStore.getState().updateOrderStatus('sa', 'completed');
      const sb = useUserStore.getState().orders.find((o) => o.id === 'sb');
      expect(sb?.status).toBe('pending');
    });
  });

  // ─── Derived selectors ────────────────────────────────────────────────────
  describe('Cart total calculation', () => {
    it('calculates correct total for multiple items', () => {
      useUserStore.getState().addToCart(makeCartItem({ id: 'p1', price: 10.00, quantity: 2 }));
      useUserStore.getState().addToCart(makeCartItem({ id: 'p2', price: 5.50, quantity: 1 }));
      const total = useUserStore.getState().cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      expect(total).toBeCloseTo(25.50, 2);
    });

    it('returns 0 for an empty cart', () => {
      const total = useUserStore.getState().cart.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );
      expect(total).toBe(0);
    });
  });
});
