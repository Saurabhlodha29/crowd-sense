// frontend/vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Forward /api calls to Spring Boot during dev (avoids CORS)
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      // WebSocket proxy
      "/ws": {
        target: "ws://localhost:8080",
        ws: true,
      },
    },
  },
  // Required: Leaflet uses 'global' in some places — define it for Vite
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    include: ["leaflet", "leaflet-draw"],
  },
});