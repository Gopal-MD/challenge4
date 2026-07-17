import axios from "axios";

const API_BASE =
  typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL
    ? (import.meta as any).env.VITE_API_URL as string
    : "http://localhost:3001/api";

function getToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem("authToken");
}

function clearToken() {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("authToken");
  }
}

/** Shared Axios instance with auth + error interceptors */
export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 10_000,
  headers: { "Content-Type": "application/json" },
});

// ── Request: inject Bearer token ─────────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response: global error handling ──────────────────────────────────────────
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// Match API
// ─────────────────────────────────────────────────────────────────────────────
export const matchAPI = {
  getMatch: (matchId: string) => apiClient.get(`/matches/${matchId}`),
  getEvents: (matchId: string) => apiClient.get(`/matches/${matchId}/events`),
  getStats: (matchId: string) => apiClient.get(`/matches/${matchId}/stats`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Order API
// ─────────────────────────────────────────────────────────────────────────────
export const orderAPI = {
  create: (data: Record<string, unknown>) => apiClient.post("/orders", data),
  getStatus: (orderId: string) => apiClient.get(`/orders/${orderId}`),
  update: (orderId: string, data: Record<string, unknown>) =>
    apiClient.put(`/orders/${orderId}`, data),
  getHistory: (userId: string) => apiClient.get(`/users/${userId}/orders`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Ops API
// ─────────────────────────────────────────────────────────────────────────────
export const opsAPI = {
  getIncidents: (matchId: string) =>
    apiClient.get(`/ops/incidents?match=${matchId}`),
  reportIncident: (data: Record<string, unknown>) =>
    apiClient.post("/ops/incidents", data),
  updateIncident: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/ops/incidents/${id}`, data),
  getCrowdStatus: (matchId: string) =>
    apiClient.get(`/ops/crowd-status?match=${matchId}`),
};

// ─────────────────────────────────────────────────────────────────────────────
// Auth API
// ─────────────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email: string, password: string) =>
    apiClient.post("/auth/login", { email, password }),
  logout: () => apiClient.post("/auth/logout"),
  refresh: () => apiClient.post("/auth/refresh"),
  me: () => apiClient.get("/auth/me"),
};
