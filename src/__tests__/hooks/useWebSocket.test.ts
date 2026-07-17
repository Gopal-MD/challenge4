/**
 * @file useWebSocket.test.ts
 * Integration tests for the useWebSocket hook.
 * Mocks socket.io-client to verify subscribe, emit, and cleanup behavior
 * without requiring a real WebSocket server.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─── Mock socket.io-client BEFORE importing the hook ─────────────────────────
const mockSocket = {
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connected: true,
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

import { useWebSocket } from '../../hooks/useWebSocket';

describe('useWebSocket hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('subscribe()', () => {
    it('returns a function (unsubscribe)', () => {
      const { result } = renderHook(() => useWebSocket());
      const unsub = result.current.subscribe('test:event', vi.fn());
      expect(typeof unsub).toBe('function');
    });

    it('calls socket.off when the unsubscribe function is invoked', () => {
      const { result } = renderHook(() => useWebSocket());
      const callback = vi.fn();
      const unsub = result.current.subscribe('match:goal', callback);

      act(() => { unsub(); });

      expect(mockSocket.off).toHaveBeenCalledWith('match:goal', callback);
    });

    it('can subscribe to multiple events independently', () => {
      const { result } = renderHook(() => useWebSocket());
      const cb1 = vi.fn();
      const cb2 = vi.fn();

      result.current.subscribe('event:one', cb1);
      result.current.subscribe('event:two', cb2);

      expect(mockSocket.on).toHaveBeenCalledWith('event:one', cb1);
      expect(mockSocket.on).toHaveBeenCalledWith('event:two', cb2);
    });
  });

  describe('emit()', () => {
    it('calls socket.emit with event name and data when connected', () => {
      const { result } = renderHook(() => useWebSocket());
      act(() => {
        result.current.emit('match:update', { id: 'match-1' });
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('match:update', { id: 'match-1' });
    });

    it('does not crash when emitting without data', () => {
      const { result } = renderHook(() => useWebSocket());
      expect(() => {
        act(() => { result.current.emit('ping'); });
      }).not.toThrow();
    });
  });

  describe('connected property', () => {
    it('exposes a boolean connected property', () => {
      const { result } = renderHook(() => useWebSocket());
      expect(typeof result.current.connected).toBe('boolean');
    });
  });
});
