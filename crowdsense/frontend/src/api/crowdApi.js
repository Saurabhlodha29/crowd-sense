// frontend/src/api/crowdApi.js
import axios from "axios";

const BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";
const api  = axios.create({ baseURL: `${BASE}/api/v1` });

// Attach JWT if available
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("cs_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
  api.post("/auth/login", { email, password }).then((r) => r.data);

export const getMe = () => api.get("/auth/me").then((r) => r.data);

// ── Crowd readings ─────────────────────────────────────────────────────────────
export const getCrowdReadings = (eventId) => {
  const params = eventId ? { eventId } : {};
  return api.get("/readings/latest", { params }).then((r) => r.data);
};

export const getReadingHistory = (locationId, limit = 200) =>
  api.get(`/readings/location/${locationId}`, { params: { limit } }).then((r) => r.data);

// ── Locations / zones ──────────────────────────────────────────────────────────
export const getLocations = (eventId) => {
  const params = eventId ? { eventId } : {};
  return api.get("/locations", { params }).then((r) => r.data);
};

export const createLocation = (dto) =>
  api.post("/locations", dto).then((r) => r.data);

export const updateLocation = (id, dto) =>
  api.put(`/locations/${id}`, dto).then((r) => r.data);

export const deleteLocation = (id) =>
  api.delete(`/locations/${id}`).then((r) => r.data);

// ── Alerts ─────────────────────────────────────────────────────────────────────
export const getAlerts = (filter = "active", eventId) =>
  api.get("/alerts", { params: { filter, eventId } }).then((r) => r.data);

export const getAlertStats = () =>
  api.get("/alerts/stats").then((r) => r.data);

export const resolveAlert = (id) =>
  api.put(`/alerts/${id}/resolve`).then((r) => r.data);

// ── Events ─────────────────────────────────────────────────────────────────────
export const searchEvents = ({ q, city, lat, lng, radius = 50, page = 0, size = 20 }) =>
  api.get("/events/search", { params: { q, city, lat, lng, radius, page, size } })
     .then((r) => r.data);

export const getPublicEvents = ({ status = "LIVE", city, page = 0, size = 20 }) =>
  api.get("/events", { params: { status, city, page, size } }).then((r) => r.data);

export const getEventDetail = (id) =>
  api.get(`/events/${id}`).then((r) => r.data);

export const getMyEvents = () =>
  api.get("/events/mine").then((r) => r.data);

export const createEvent = (dto) =>
  api.post("/events", dto).then((r) => r.data);

export const updateEvent = (id, dto) =>
  api.put(`/events/${id}`, dto).then((r) => r.data);

export const setEventStatus = (id, status) =>
  api.put(`/events/${id}/status`, null, { params: { status } }).then((r) => r.data);

export const getEventAnalytics = (id) =>
  api.get(`/events/${id}/analytics`).then((r) => r.data);

// ── Stalls ─────────────────────────────────────────────────────────────────────
export const getStalls = (eventId, category) =>
  api.get(`/events/${eventId}/stalls`, { params: { category } }).then((r) => r.data);

export const createStall = (eventId, dto) =>
  api.post(`/events/${eventId}/stalls`, dto).then((r) => r.data);

// ── Routing & recommendations ──────────────────────────────────────────────────
export const getRoute = ({ fromZone, toStall, eventId, userLat, userLng }) =>
  api.get("/route", { params: { fromZone, toStall, eventId, userLat, userLng } })
     .then((r) => r.data);

export const checkReroute = (body) =>
  api.post("/route/check", body).then((r) => r.data);

export const getRecommendations = ({ eventId, prefs = "", zone, userLat, userLng }) =>
  api.get("/recommend", { params: { eventId, prefs, zone, userLat, userLng } })
     .then((r) => r.data);

// ── Zone connections ───────────────────────────────────────────────────────────
export const getZoneConnections = (eventId) =>
  api.get("/zone-connections", { params: { eventId } }).then((r) => r.data);

export const createZoneConnection = (dto) =>
  api.post("/zone-connections", dto).then((r) => r.data);