import { useEffect, useCallback, useRef } from "react";
import { io, type Socket } from "socket.io-client";

// Set VITE_SOCKET_URL in your .env to point at the real Socket.io server.
// If absent, the hook silently no-ops (safe for local dev without a server).
function getSocketUrl(): string | null {
  return typeof import.meta !== "undefined" && (import.meta as { env?: { VITE_SOCKET_URL?: string } }).env?.VITE_SOCKET_URL
    ? (import.meta as { env: { VITE_SOCKET_URL: string } }).env.VITE_SOCKET_URL
    : null;
}

/**
 * Reusable WebSocket hook using Socket.io.
 *
 * Usage:
 *   const { subscribe, emit, connected } = useWebSocket();
 *
 *   useEffect(() => {
 *     const unsub = subscribe("match:goal", (data) => addEvent(data));
 *     return unsub;
 *   }, []);
 */
export const useWebSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const connectedRef = useRef(false);

  useEffect(() => {
    const SOCKET_URL = getSocketUrl();
    if (!SOCKET_URL) {
      // No server configured — skip silently
      return;
    }

    const token =
      typeof localStorage !== "undefined" ? localStorage.getItem("authToken") : null;

    socketRef.current = io(SOCKET_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      auth: token ? { token } : undefined,
    });

    socketRef.current.on("connect", () => {
      connectedRef.current = true;
      console.log("[WS] Connected to", SOCKET_URL);
    });

    socketRef.current.on("disconnect", (reason) => {
      connectedRef.current = false;
      console.log("[WS] Disconnected:", reason);
    });

    socketRef.current.on("connect_error", (err) => {
      console.warn("[WS] Connection error:", err.message);
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      connectedRef.current = false;
    };
  }, []);

  /**
   * Subscribe to a WebSocket event.
   * Returns an unsubscribe function — use it in useEffect cleanup.
   */
  const subscribe = useCallback(
    (event: string, callback: (data: unknown) => void) => {
      socketRef.current?.on(event, callback);
      return () => {
        socketRef.current?.off(event, callback);
      };
    },
    []
  );

  /**
   * Emit an event to the server.
   */
  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn("[WS] Cannot emit — not connected:", event);
    }
  }, []);

  return {
    subscribe,
    emit,
    /** True when the socket is currently connected */
    get connected() {
      return connectedRef.current;
    },
  };
};
