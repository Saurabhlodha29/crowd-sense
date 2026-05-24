import { useEffect, useRef } from "react";
import { getCrowdConfig } from "../utils/crowdLevels.js";

// Leaflet map component (no React-Leaflet to avoid SSR issues)
export default function CrowdMap({ locations = [], locationReadings = {} }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef({});

  useEffect(() => {
    if (mapInstanceRef.current) return;
    // dynamic import to avoid SSR
    import("leaflet").then((L) => {
      const map = L.map(mapRef.current, {
        center: [28.6139, 77.209],
        zoom: 12,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "©OpenStreetMap ©CartoDB",
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = { map, L };
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.map.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !locations.length) return;
    const { map, L } = mapInstanceRef.current;

    locations.forEach((loc) => {
      const reading = locationReadings[loc.id];
      const level = reading?.crowdLevel || "LOW";
      const count = reading?.personCount ?? "—";
      const { color } = getCrowdConfig(level);

      const icon = L.divIcon({
        className: "",
        html: `
          <div style="
            background:${color};width:14px;height:14px;border-radius:50%;
            border:2px solid #0a0e1a;
            box-shadow:0 0 8px ${color}88;
          "></div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const popup = `
        <div style="font-family:'Space Mono',monospace;font-size:12px;background:#151d2e;color:#e8edf5;padding:8px 12px;border-radius:6px;min-width:140px">
          <b style="font-family:'Syne',sans-serif;font-size:13px">${loc.name}</b><br/>
          <span style="color:${color}">${level}</span> · ${count} people
          ${reading?.confidence ? `<br/><span style="color:#4a5568">conf: ${(reading.confidence*100).toFixed(0)}%</span>` : ""}
        </div>
      `;

      if (markersRef.current[loc.id]) {
        markersRef.current[loc.id].setIcon(icon).setPopupContent(popup);
      } else {
        const marker = L.marker([loc.latitude, loc.longitude], { icon })
          .bindPopup(popup, { className: "cs-popup" })
          .addTo(map);
        markersRef.current[loc.id] = marker;
      }
    });
  }, [locations, locationReadings]);

  return (
    <div style={styles.wrap}>
      <div ref={mapRef} style={styles.map} />
      <style>{`.leaflet-popup-content-wrapper,.leaflet-popup-tip{background:#151d2e;border:1px solid #1e2d45;}`}</style>
    </div>
  );
}

const styles = {
  wrap: { position: "relative", height: "100%", minHeight: 320, borderRadius: 10, overflow: "hidden" },
  map: { width: "100%", height: "100%", minHeight: 320, background: "#0a0e1a" },
};
