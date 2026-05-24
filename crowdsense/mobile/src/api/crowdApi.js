import axios from "axios";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "http://10.0.2.2:8080";

const api = axios.create({
  baseURL: BASE + "/api/v1",
  timeout: 10000,
});

export const crowdApi = {
  getLatestReadings: () => api.get("/readings/latest"),
  getLocations: () => api.get("/locations"),
  getAlerts: () => api.get("/alerts?activeOnly=true"),
  getReadingsByLocation: (locationId, limit = 50) =>
    api.get(`/readings/location/${locationId}?limit=${limit}`),
  health: () => api.get("/readings/health"),
};

export default crowdApi;
