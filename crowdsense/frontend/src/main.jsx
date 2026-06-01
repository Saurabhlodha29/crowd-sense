// frontend/src/main.jsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon paths broken by Vite bundler
import L from "leaflet";
import markerIcon2x   from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon     from "leaflet/dist/images/marker-icon.png";
import markerShadow   from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl:       markerIcon,
  shadowUrl:     markerShadow,
});

// Global reset
const root = document.getElementById("root");
Object.assign(root.style, {
  margin:     "0",
  padding:    "0",
  boxSizing:  "border-box",
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
});
document.body.style.margin = "0";
document.body.style.background = "#0f172a";

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
);