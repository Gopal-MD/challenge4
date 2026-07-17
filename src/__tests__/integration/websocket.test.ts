import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocket } from '@/hooks/useWebSocket';

const eventHandlers = new Map<string, Set<(data: unknown) => void>>();

const mockSocket = {
  on: vi.fn((event: string, cb: (data: unknown) => void) => {
    if (!eventHandlers.has(event)) eventHandlers.set(event, new Set());
    eventHandlers.get(event)!.add(cb);
  }),
  off: vi.fn((event: string, cb: (data: unknown) => void) => {
    eventHandlers.get(event)?.delete(cb);
  }),
  emit: vi.fn(),
  connected: true,
  disconnect: vi.fn(),
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

function simulateEvent(event: string, data: unknown) {
  eventHandlers.get(event)?.forEach((cb) => cb(data));
}

describe('useWebSocket integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventHandlers.clear();
  });

  it('delivers match:goal events to subscribers', () => {
    const { result } = renderHook(() => useWebSocket());
    const callback = vi.fn();

    act(() => {
      result.current.subscribe('match:goal', callback);
    });

    const mockData = { id: 'ev-99', type: 'goal', team: 'home', player: 'Test Player', minute: 45, timestamp: Date.now() };
    act(() => {
      simulateEvent('match:goal', mockData);
    });

    expect(callback).toHaveBeenCalledWith(mockData);
  });

  it('unsubscribes from events on cleanup', () => {
    const { result, unmount } = renderHook(() => useWebSocket());
    const callback = vi.fn();

    let unsub: () => void;
    act(() => {
      unsub = result.current.subscribe('match:goal', callback);
    });

    act(() => {
      unsub!();
    });

    act(() => {
      simulateEvent('match:goal', { player: 'Should not fire' });
    });

    expect(callback).not.toHaveBeenCalled();
    unmount();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('supports multiple event types independently', () => {
    const { result } = renderHook(() => useWebSocket());
    const goalCb = vi.fn();
    const cardCb = vi.fn();

    act(() => {
      result.current.subscribe('match:goal', goalCb);
      result.current.subscribe('match:card', cardCb);
    });

    act(() => {
      simulateEvent('match:card', { type: 'card', minute: 30 });
    });

    expect(cardCb).toHaveBeenCalledTimes(1);
    expect(goalCb).not.toHaveBeenCalled();
  });
});
