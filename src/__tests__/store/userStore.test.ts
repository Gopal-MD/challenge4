import { describe, it, expect, beforeEach } from 'vitest';
import { useUserStore, type CartItem, type Order, type User } from '@/store/userStore';

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  name: 'Test Fan',
  email: 'fan@example.com',
  role: 'fan',
  ...overrides,
});

const makeCartItem = (overrides: Partial<CartItem> = {}): CartItem => ({
  id: 'item-1',
  name: 'Hot Dog',
  price: 8.5,
  quantity: 1,
  category: 'food',
  ...overrides,
});

describe('useUserStore', () => {
  beforeEach(() => {
    useUserStore.setState({ user: null, cart: [], orders: [] });
  });

  it('sets user on login', () => {
    const user = makeUser();
    useUserStore.getState().setUser(user);
    expect(useUserStore.getState().user).toEqual(user);
  });

  it('adds items to cart', () => {
    const item = makeCartItem();
    useUserStore.getState().addToCart(item);
    expect(useUserStore.getState().cart).toHaveLength(1);
    expect(useUserStore.getState().cart[0]).toEqual(item);
  });

  it('increments quantity when adding duplicate cart item', () => {
    const item = makeCartItem();
    useUserStore.getState().addToCart(item);
    useUserStore.getState().addToCart({ ...item, quantity: 2 });
    expect(useUserStore.getState().cart[0].quantity).toBe(3);
  });

  it('removes items from cart', () => {
    const item = makeCartItem();
    useUserStore.getState().addToCart(item);
    useUserStore.getState().removeFromCart(item.id);
    expect(useUserStore.getState().cart).toHaveLength(0);
  });

  it('updates cart quantity and removes at zero', () => {
    const item = makeCartItem({ quantity: 2 });
    useUserStore.getState().addToCart(item);
    useUserStore.getState().updateCartQty(item.id, 5);
    expect(useUserStore.getState().cart[0].quantity).toBe(5);
    useUserStore.getState().updateCartQty(item.id, 0);
    expect(useUserStore.getState().cart).toHaveLength(0);
  });

  it('clears cart', () => {
    useUserStore.getState().addToCart(makeCartItem());
    useUserStore.getState().clearCart();
    expect(useUserStore.getState().cart).toHaveLength(0);
  });

  it('adds and updates orders', () => {
    const order: Order = {
      id: 'order-1',
      items: [makeCartItem()],
      total: 8.5,
      status: 'pending',
      pickupLocation: 'Gate B',
      createdAt: new Date().toISOString(),
    };
    useUserStore.getState().addOrder(order);
    expect(useUserStore.getState().orders).toHaveLength(1);
    useUserStore.getState().updateOrderStatus('order-1', 'ready');
    expect(useUserStore.getState().orders[0].status).toBe('ready');
  });

  it('clears state on logout', () => {
    useUserStore.getState().setUser(makeUser());
    useUserStore.getState().addToCart(makeCartItem());
    useUserStore.getState().logout();
    expect(useUserStore.getState().user).toBeNull();
    expect(useUserStore.getState().cart).toHaveLength(0);
    expect(useUserStore.getState().orders).toHaveLength(0);
  });
});
