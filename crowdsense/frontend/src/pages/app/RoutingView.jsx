// frontend/src/pages/app/RoutingView.jsx
// Smart route from user's current zone to a chosen stall.
// Refreshes every 5s; ML decides whether to suggest a new route.

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { getRoute, checkReroute, getStalls, getLocations } from "../../api/crowdApi";
import { useGeolocation } from "../../hooks/useGeolocation";
import { getCrowdConfig } from "../../utils/crowdLevels";
import { haversineMeters } from "../../utils/haversine";

const CROWD_COLORS = {
  LOW: "#22c55e", MEDIUM: "#f59e0b", HIGH: "#f97316", CRITICAL: "#ef4444", UNKNOWN: "#94a3b8",
};

export default function RoutingView() {
  const { id: eventId } = useParams();
  const [searchParams]  = useSearchParams();
  const fromZone        = searchParams.get("from") || "";
  const navigate        = useNavigate();

  const [stalls,      setStalls]      = useState([]);
  const [zones,       setZones]       = useState([]);
  const [selectedStall, setSelectedStall] = useState(null);
  const [route,       setRoute]       = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [rerouteMsg,  setRerouteMsg]  = useState(null);
  const [step,        setStep]        = useState("pick");   // "pick" | "navigate"

  const mapRef     = useRef(null);
  const mapObjRef  = useRef(null);
  const routeLayer = useRef(null);
  const prevLatLng = useRef(null);

  const { location, startTracking } = useGeolocation();

  // ── Load stalls + zones ───────────────────────────────────────────────────
  useEffect(() => {
    getStalls(eventId).then(setStalls).catch(() => setStalls([]));
    getLocations(eventId).then(setZones).catch(() => setZones([]));
  }, [eventId]);

  // ── Init map ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mapObjRef.current || step !== "navigate") return;
    import("leaflet").then((L) => {
      const center = location ? [location.lat, location.lng] : [28.6129, 77.2295];
      const map = L.map(mapRef.current, { center, zoom: 18 });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);
      mapObjRef.current = map;
    });
  }, [step]);

  // ── Draw route on map ─────────────────────────────────────────────────────
  const drawRoute = useCallback((waypoints) => {
    if (!mapObjRef.current || !waypoints?.length) return;
    import("leaflet").then((L) => {
      const map = mapObjRef.current;
      if (routeLayer.current) { routeLayer.current.remove(); routeLayer.current = null; }

      const group = L.featureGroup();

      // Numbered waypoint markers
      waypoints.forEach((wp, i) => {
        if (!wp.lat || !wp.lng) return;
        const cfg  = getCrowdConfig(wp.crowdLevel);
        const icon = L.divIcon({
          html: `<div style="background:${cfg.color};color:#fff;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.4)">${i + 1}</div>`,
          className: "",
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });
        L.marker([wp.lat, wp.lng], { icon })
         .bindTooltip(`${i + 1}. ${wp.name}<br>${wp.personCount ?? "?"} people`, { direction: "top" })
         .addTo(group);
      });

      // Colored polyline segments
      for (let i = 0; i < waypoints.length - 1; i++) {
        const a = waypoints[i];
        const b = waypoints[i + 1];
        if (!a.lat || !b.lat) continue;
        const color   = CROWD_COLORS[b.crowdLevel] || "#94a3b8";
        const dashed  = b.crowdLevel === "CRITICAL";
        L.polyline([[a.lat, a.lng], [b.lat, b.lng]], {
          color,
          weight:    5,
          dashArray: dashed ? "10, 6" : null,
          opacity:   0.9,
        }).addTo(group);
      }

      // User location dot
      if (location) {
        L.circleMarker([location.lat, location.lng], {
          radius: 8, color: "#6366f1", fillColor: "#6366f1", fillOpacity: 1, weight: 2,
        }).bindTooltip("You are here").addTo(group);
      }

      group.addTo(map);
      routeLayer.current = group;

      // Fit bounds
      if (group.getBounds().isValid()) {
        map.fitBounds(group.getBounds(), { padding: [40, 40] });
      }
    });
  }, [location]);

  useEffect(() => {
    if (route) drawRoute(route.waypoints);
  }, [route, drawRoute]);

  // ── Fetch initial route ───────────────────────────────────────────────────
  async function fetchRoute(stall) {
    setLoading(true);
    setRerouteMsg(null);
    try {
      const r = await getRoute({
        fromZone: fromZone,
        toStall:  stall.id,
        eventId,
        userLat:  location?.lat,
        userLng:  location?.lng,
      });
      setRoute(r);
      setStep("navigate");
      prevLatLng.current = location;
    } catch (err) {
      alert("Could not calculate route: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── 5-second reroute check ────────────────────────────────────────────────
  useEffect(() => {
    if (step !== "navigate" || !route || !selectedStall) return;
    const interval = setInterval(async () => {
      if (!route?.path?.length) return;
      const movedM = (location && prevLatLng.current)
        ? haversineMeters(prevLatLng.current.lat, prevLatLng.current.lng, location.lat, location.lng)
        : 0;

      try {
        const check = await checkReroute({
          old_path:     route.path,
          current_zone: fromZone,
          event_id:     eventId,
          user_lat:     location?.lat,
          user_lng:     location?.lng,
          prev_lat:     prevLatLng.current?.lat,
          prev_lng:     prevLatLng.current?.lng,
        });

        if (check.reroute && check.new_route) {
          setRoute(check.new_route);
          setRerouteMsg(`Route updated: ${check.reason}`);
          setTimeout(() => setRerouteMsg(null), 5000);
          prevLatLng.current = location;
        }
      } catch (_) {}
    }, 5000);
    return () => clearInterval(interval);
  }, [step, route, selectedStall, location]);

  // ── Track user position for rerouting ────────────────────────────────────
  useEffect(() => {
    if (step !== "navigate") return;
    const stopTracking = startTracking((loc) => {
      if (mapObjRef.current) {
        import("leaflet").then((L) => {
          mapObjRef.current.setView([loc.lat, loc.lng], mapObjRef.current.getZoom());
        });
      }
    });
    return stopTracking;
  }, [step]);

  // ── Stall picker screen ───────────────────────────────────────────────────
  if (step === "pick") {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>←</button>
          <div style={styles.headerTitle}>Where do you want to go?</div>
        </div>
        <div style={styles.stallList}>
          {stalls.length === 0 && <div style={styles.empty}>No stalls found for this event.</div>}
          {stalls.map((stall) => (
            <div
              key={stall.id}
              style={styles.stallCard}
              onClick={() => { setSelectedStall(stall); fetchRoute(stall); }}
            >
              <div style={styles.stallName}>{stall.name}</div>
              <div style={styles.stallMeta}>{stall.category} · {stall.description?.slice(0,60)}</div>
              {loading && selectedStall?.id === stall.id && (
                <div style={styles.calculating}>Calculating route…</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Navigation screen ─────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />

      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => setStep("pick")}>←</button>
        <div style={styles.headerTitle}>
          Navigating to {selectedStall?.name}
        </div>
      </div>

      {rerouteMsg && (
        <div style={styles.rerouteBanner}>🔄 {rerouteMsg}</div>
      )}

      {/* Map */}
      <div ref={mapRef} style={styles.map} />

      {/* Route summary card */}
      {route && (
        <div style={styles.routeCard}>
          <div style={styles.routeStats}>
            <div style={styles.routeStat}>
              <span style={styles.routeStatVal}>{Math.round((route.estimated_time_s || 0) / 60)} min</span>
              <span style={styles.routeStatLabel}>walk</span>
            </div>
            <div style={styles.routeDivider} />
            <div style={styles.routeStat}>
              <span style={styles.routeStatVal}>{route.total_distance_m || "—"}m</span>
              <span style={styles.routeStatLabel}>distance</span>
            </div>
            <div style={styles.routeDivider} />
            <div style={styles.routeStat}>
              <span style={styles.routeStatVal}>{route.waypoints?.length || 0}</span>
              <span style={styles.routeStatLabel}>zones</span>
            </div>
          </div>

          {/* Step-by-step */}
          <div style={styles.steps}>
            {(route.waypoints || []).map((wp, i) => {
              const cfg = getCrowdConfig(wp.crowdLevel);
              return (
                <div key={i} style={styles.step}>
                  <div style={{ ...styles.stepDot, background: cfg.color }}>{i + 1}</div>
                  <div>
                    <div style={styles.stepName}>{wp.name}</div>
                    <div style={{ ...styles.stepLevel, color: cfg.color }}>{cfg.label} crowd · {wp.personCount ?? "?"} people</div>
                  </div>
                </div>
              );
            })}
          </div>

          {route.note && <div style={styles.routeNote}>{route.note}</div>}
        </div>
      )}
    </div>
  );
}

const styles = {
  container:       { display: "flex", flexDirection: "column", height: "100vh", background: "#0f172a", color: "#f1f5f9" },
  header:          { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#1e293b", borderBottom: "1px solid #334155" },
  backBtn:         { background: "transparent", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer", padding: 0 },
  headerTitle:     { color: "#f1f5f9", fontSize: 15, fontWeight: 600 },
  stallList:       { flex: 1, overflowY: "auto", padding: "12px 16px" },
  stallCard:       { background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: 14, marginBottom: 10, cursor: "pointer" },
  stallName:       { color: "#f1f5f9", fontSize: 15, fontWeight: 600, marginBottom: 4 },
  stallMeta:       { color: "#64748b", fontSize: 12 },
  calculating:     { color: "#6366f1", fontSize: 12, marginTop: 6 },
  empty:           { color: "#475569", fontSize: 13, padding: "30px 0", textAlign: "center" },
  rerouteBanner:   { background: "#312e81", color: "#c7d2fe", padding: "8px 16px", fontSize: 13 },
  map:             { flex: 1, minHeight: 260 },
  routeCard:       { background: "#1e293b", borderRadius: "16px 16px 0 0", padding: "16px 20px 32px", maxHeight: "45vh", overflowY: "auto" },
  routeStats:      { display: "flex", justifyContent: "space-around", marginBottom: 14 },
  routeStat:       { display: "flex", flexDirection: "column", alignItems: "center" },
  routeStatVal:    { color: "#f1f5f9", fontSize: 20, fontWeight: 700 },
  routeStatLabel:  { color: "#64748b", fontSize: 11 },
  routeDivider:    { width: 1, background: "#334155" },
  steps:           { display: "flex", flexDirection: "column", gap: 10 },
  step:            { display: "flex", alignItems: "flex-start", gap: 12 },
  stepDot:         { width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0 },
  stepName:        { color: "#f1f5f9", fontSize: 14, fontWeight: 600 },
  stepLevel:       { fontSize: 11, marginTop: 2 },
  routeNote:       { marginTop: 10, color: "#64748b", fontSize: 11, fontStyle: "italic" },
};