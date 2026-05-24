import axios from "axios";

const BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:8080";

const api = axios.create({
  baseURL: BASE + "/api/v1",
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("cs_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("cs_token");
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);

export const crowdApi = {
  // Auth
  login: (email, password) =>
    api.post("/auth/login", { email, password }),

  // Readings
  getLatestReadings: () => api.get("/readings/latest"),
  getReadingsByLocation: (locationId, limit = 100) =>
    api.get(`/readings/location/${locationId}?limit=${limit}`),
  health: () => api.get("/readings/health"),

  // Locations
  getLocations: () => api.get("/locations"),
  createLocation: (data) => api.post("/locations", data),

  // Alerts
  getAlerts: () => api.get("/alerts"),
  resolveAlert: (id) => api.put(`/alerts/${id}/resolve`),
};

export default crowdApi;
