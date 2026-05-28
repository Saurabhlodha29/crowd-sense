import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

const api = axios.create({
  baseURL: `${BACKEND_URL}/api/v1`,
  timeout: 10000,
});

// ── Attach JWT token to every request if present ──
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("crowdsense_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auth ──
export const login = (email, password) =>
  api.post("/auth/login", { email, password });

export const getMe = () =>
  api.get("/auth/me");

// ── Crowd Readings ──
export const getLatestReadings = () =>
  api.get("/readings/latest");

// Alias used by MobileApp.jsx
export const getCrowdReadings = getLatestReadings;

export const getReadingsByLocation = (locationId, limit = 200) =>
  api.get(`/readings/location/${locationId}`, { params: { limit } });

export const postReading = (data) =>
  api.post("/readings", data);

export const healthCheck = () =>
  api.get("/readings/health");

// ── Locations ──
export const getLocations = () =>
  api.get("/locations");

export const createLocation = (data) =>
  api.post("/locations", data);

// ── Alerts ──
export const getAlerts = (filter = "all") =>
  api.get("/alerts", { params: { filter } });

export const getAlertStats = () =>
  api.get("/alerts/stats");

export const resolveAlert = (id) =>
  api.put(`/alerts/${id}/resolve`);

export default api;