// frontend/src/pages/app/EventDetail.jsx
// Shows the event's zone map with:
//   1. Colored zone polygons (green/amber/red/critical)
//   2. Live crowd dot cloud (canvas layer, refreshes every 5s)
//   3. Tap a zone → slide-up panel with stats
//   4. FAB → go to stall browser / routing

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getEventDetail, getCrowdReadings } from "../../api/crowdApi";
import { useWebSocket } from "../../hooks/useWebSocket";
import { useGeolocation } from "../../hooks/useGeolocation";
import { useProximityAlert } from "../../hooks/useProximityAlert";
import { getCrowdConfig, capacityPercent } from "../../utils/crowdLevels";
import { generateCrowdDots } from "../../utils/crowdDots";

export default function EventDetail() {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const [eventData,  setEventData]  = useState(null);
  const [zones,      setZones]      = useState([]);
  const [crowdMap,   setCrowdMap]   = useState({});   // zoneId → {personCount, crowdLevel, positions}
  const [selectedZone, setSelectedZone] = useState(null);
  const [dots,       setDots]       = useState({});   // zoneId → [{lat,lng,id}]
  const [proximityAlert, setProximityAlert] = useState(null);
  const mapRef    = useRef(null);
  const mapObjRef = useRef(null);
  const canvasRef = useRef(null);
  const layersRef = useRef({});

  const { crowdMap: wsCrowdMap } = useWebSocket();
  const { location, requestLocation } = useGeolocation();

  // ── Load event data ───────────────────────────────────────────────────────
  useEffect(() => {
    getEventDetail(eventId).then((d) => {
      setEventData(d.event);
      setZones(d.zones || []);
      // Build initial crowd map
      const cm = {};
      (d.crowdSummary || []).forEach((z) => {
        cm[z.zoneId] = {
          personCount:  z.personCount || 0,
          crowdLevel:   z.crowdLevel || "UNKNOWN",
          capturedAt:   z.capturedAt,
          positions:    [],
        };
      });
      setCrowdMap(cm);
    });
  }, [eventId]);

  // ── Refresh crowd data every 5 s ─────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      getCrowdReadings(eventId).then((readings) => {
        const cm = { ...crowdMap };
        readings.forEach((r) => {
          let pos = [];
          if (r.positions) {
            try { pos = JSON.parse(r.positions); } catch (_) {}
          }
          cm[r.locationId] = {
            personCount: r.personCount,
            crowdLevel:  r.crowdLevel,
            capturedAt:  r.capturedAt,
            positions:   pos,
          };
        });
        setCrowdMap(cm);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [eventId, crowdMap]);

  // ── WS live updates overlay ───────────────────────────────────────────────
  useEffect(() => {
    if (!wsCrowdMap) return;
    Object.entries(wsCrowdMap).forEach(([locationId, data]) => {
      setCrowdMap((prev) => ({
        ...prev,
        [locationId]: {
          personCount: data.personCount,
          crowdLevel:  data.crowdLevel,
          capturedAt:  data.capturedAt,
          positions:   data.positions || [],
        },
      }));
    });
  }, [wsCrowdMap]);

  // ── Regenerate dots when crowdMap changes ─────────────────────────────────
  useEffect(() => {
    const newDots = {};
    zones.forEach((zone) => {
      const cd = crowdMap[zone.id] || {};
      newDots[zone.id] = generateCrowdDots(zone, cd.personCount || 0, cd.positions || []);
    });
    setDots(newDots);
  }, [crowdMap, zones]);

  // ── Initialise map ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!eventData || mapObjRef.current) return;
    import("leaflet").then((L) => {
      const center = eventData.latitude
        ? [eventData.latitude, eventData.longitude]
        : [28.6129, 77.2295];

      const map = L.map(mapRef.current, { center, zoom: 17, zoomControl: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
      mapObjRef.current = map;

      // Canvas overlay for dots
      const canvas = document.createElement("canvas");
      canvas.style.cssText = "position:absolute;top:0;left:0;pointer-events:none;z-index:500;";
      mapRef.current.appendChild(canvas);
      canvasRef.current = canvas;

      // Resize canvas on map size change
      const resize = () => {
        const size = map.getSize();
        canvas.width  = size.x;
        canvas.height = size.y;
      };
      map.on("resize", resize);
      resize();

      // Redraw canvas on map move
      map.on("move zoom", drawCanvas);
    });
  }, [eventData]);

  // ── Draw zone polygons ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapObjRef.current || zones.length === 0) return;
    import("leaflet").then((L) => {
      const map = mapObjRef.current;

      // Remove old layers
      Object.values(layersRef.current).forEach((l) => l.remove());
      layersRef.current = {};

      zones.forEach((zone) => {
        const cd  = crowdMap[zone.id] || {};
        const cfg = getCrowdConfig(cd.crowdLevel || "UNKNOWN");

        if (zone.boundaryGeoJson) {
          try {
            const geom  = JSON.parse(zone.boundaryGeoJson);
            const layer = L.geoJSON({ type: "Feature", geometry: geom }, {
              style: {
                color:       cfg.color,
                fillColor:   cfg.color,
                fillOpacity: 0.25,
                weight:      2,
              },
            });
            layer.bindTooltip(
              `<b>${zone.name}</b><br>${cd.personCount ?? "—"} people`,
              { permanent: false, direction: "center" }
            );
            layer.on("click", () => setSelectedZone(zone.id));
            layer.addTo(map);
            layersRef.current[zone.id] = layer;
          } catch (_) {}
        }

        // Fallback: circle marker
        const marker = L.circleMarker([zone.latitude, zone.longitude], {
          radius:      cd.personCount ? Math.min(8 + cd.personCount / 5, 30) : 8,
          color:       cfg.color,
          fillColor:   cfg.color,
          fillOpacity: 0.6,
          weight:      2,
        });
        marker.bindTooltip(`${zone.name}: ${cd.personCount ?? "—"}`);
        marker.on("click", () => setSelectedZone(zone.id));
        marker.addTo(map);
      });
    });
  }, [zones, crowdMap]);

  // ── Draw crowd dots on canvas ──────────────────────────────────────────────
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const map    = mapObjRef.current;
    if (!canvas || !map) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    Object.entries(dots).forEach(([zoneId, zoneDots]) => {
      const cd  = crowdMap[zoneId] || {};
      const cfg = getCrowdConfig(cd.crowdLevel || "LOW");
      zoneDots.forEach((dot) => {
        if (!dot.lat || !dot.lng) return;
        const pt = map.latLngToContainerPoint([dot.lat, dot.lng]);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = cfg.dot + "CC";
        ctx.fill();
      });
    });
  }, [dots, crowdMap]);

  useEffect(() => { drawCanvas(); }, [drawCanvas]);

  // ── Proximity alerts ───────────────────────────────────────────────────────
  const zonesWithCrowd = zones.map((z) => ({
    ...z,
    crowdLevel:  crowdMap[z.id]?.crowdLevel,
    personCount: crowdMap[z.id]?.personCount,
  }));
  useProximityAlert(location, zonesWithCrowd, setProximityAlert);

  const selectedData = selectedZone
    ? { zone: zones.find((z) => z.id === selectedZone), crowd: crowdMap[selectedZone] || {} }
    : null;

  return (
    <div style={styles.container}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <button style={styles.backBtn} onClick={() => navigate("/app")}>←</button>
          <div>
            <div style={styles.eventName}>{eventData?.name || "Loading…"}</div>
            <div style={styles.eventCity}>📍 {eventData?.city}</div>
          </div>
        </div>
        <button style={styles.stallsBtn} onClick={() => navigate(`/app/event/${eventId}/stalls`)}>
          Stalls →
        </button>
      </div>

      {/* Proximity alert */}
      {proximityAlert && (
        <div style={styles.proxAlert}>
          ⚠️ CRITICAL crowd {proximityAlert.distanceM}m away near {proximityAlert.zoneName}!
          <button style={styles.proxClose} onClick={() => setProximityAlert(null)}>✕</button>
        </div>
      )}

      {/* Map */}
      <div style={styles.mapWrap}>
        <div ref={mapRef} style={styles.map} />
      </div>

      {/* Zone stats slide-up */}
      {selectedData && (
        <ZonePanel
          zone={selectedData.zone}
          crowd={selectedData.crowd}
          eventId={eventId}
          onClose={() => setSelectedZone(null)}
          onRoute={() => navigate(`/app/event/${eventId}/route?from=${selectedZone}`)}
        />
      )}

      {/* Location FAB */}
      {!location && (
        <button style={styles.locationFab} onClick={requestLocation} title="Enable location">
          📍
        </button>
      )}
    </div>
  );
}

function ZonePanel({ zone, crowd, eventId, onClose, onRoute }) {
  const cfg = getCrowdConfig(crowd.crowdLevel);
  const pct = capacityPercent(crowd.personCount || 0, zone.maxCapacity);

  return (
    <div style={styles.panel}>
      <div style={styles.panelHandle} />
      <button style={styles.panelClose} onClick={onClose}>✕</button>
      <div style={styles.panelTitle}>{zone.name}</div>

      <div style={styles.panelRow}>
        <span style={{ ...styles.levelBadge, background: cfg.bg, color: cfg.color }}>
          {cfg.label}
        </span>
        <span style={styles.panelCount}>{crowd.personCount ?? "—"} people</span>
      </div>

      {/* Capacity bar */}
      <div style={styles.barBg}>
        <div style={{ ...styles.barFill, width: `${pct}%`, background: cfg.color }} />
      </div>
      <div style={styles.barLabel}>{pct}% of capacity ({zone.maxCapacity})</div>

      <div style={styles.panelActions}>
        <button style={styles.routeBtn} onClick={onRoute}>
          🗺 Navigate to a stall from here
        </button>
      </div>
    </div>
  );
}

const styles = {
  container:    { display: "flex", flexDirection: "column", height: "100vh", background: "#0f172a", position: "relative" },
  header:       { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#1e293b", borderBottom: "1px solid #334155", zIndex: 10 },
  headerLeft:   { display: "flex", alignItems: "center", gap: 10 },
  backBtn:      { background: "transparent", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer", padding: 0 },
  eventName:    { color: "#f1f5f9", fontSize: 15, fontWeight: 700 },
  eventCity:    { color: "#64748b", fontSize: 12 },
  stallsBtn:    { background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer" },
  proxAlert:    { background: "#450a0a", color: "#fca5a5", padding: "10px 16px", fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center" },
  proxClose:    { background: "transparent", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 16 },
  mapWrap:      { flex: 1, position: "relative", overflow: "hidden" },
  map:          { width: "100%", height: "100%" },
  panel:        { position: "absolute", bottom: 0, left: 0, right: 0, background: "#1e293b", borderRadius: "16px 16px 0 0", padding: "16px 20px 32px", zIndex: 600, boxShadow: "0 -4px 20px rgba(0,0,0,0.4)" },
  panelHandle:  { width: 40, height: 4, background: "#334155", borderRadius: 2, margin: "0 auto 16px" },
  panelClose:   { position: "absolute", top: 16, right: 16, background: "transparent", border: "none", color: "#64748b", cursor: "pointer", fontSize: 18 },
  panelTitle:   { color: "#f1f5f9", fontSize: 18, fontWeight: 700, marginBottom: 10 },
  panelRow:     { display: "flex", alignItems: "center", gap: 12, marginBottom: 12 },
  levelBadge:   { borderRadius: 6, padding: "4px 12px", fontSize: 12, fontWeight: 700 },
  panelCount:   { color: "#94a3b8", fontSize: 14 },
  barBg:        { background: "#0f172a", borderRadius: 4, height: 8, marginBottom: 4 },
  barFill:      { height: "100%", borderRadius: 4, transition: "width 0.5s ease" },
  barLabel:     { color: "#64748b", fontSize: 11, marginBottom: 16 },
  panelActions: { display: "flex", gap: 10 },
  routeBtn:     { flex: 1, background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, padding: 12, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  locationFab:  { position: "absolute", bottom: 20, right: 20, background: "#1e293b", border: "1px solid #334155", borderRadius: "50%", width: 44, height: 44, fontSize: 20, cursor: "pointer", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center" },
};