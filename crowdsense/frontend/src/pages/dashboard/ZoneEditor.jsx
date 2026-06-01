// frontend/src/pages/dashboard/ZoneEditor.jsx
// Allows an organiser to draw zone polygons on a Leaflet map.
// Each polygon is saved as a Location with a GeoJSON boundary.

import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { createLocation, getLocations, deleteLocation, getEventDetail } from "../../api/crowdApi";
import { nanoid } from "../../utils/nanoid";

export default function ZoneEditor() {
  const { id: eventId } = useParams();
  const mapRef     = useRef(null);
  const mapObjRef  = useRef(null);
  const drawnItems = useRef(null);
  const [zones,   setZones]   = useState([]);
  const [event,   setEvent]   = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [message, setMessage] = useState(null);

  // ── Load event & existing zones ──────────────────────────────────────────
  useEffect(() => {
    getEventDetail(eventId).then((d) => setEvent(d.event));
    getLocations(eventId).then(setZones);
  }, [eventId]);

  // ── Initialise Leaflet map ────────────────────────────────────────────────
  useEffect(() => {
    if (mapObjRef.current) return;   // already initialised

    // Dynamic import so SSR doesn't break
    import("leaflet").then((L) => {
      import("leaflet-draw").then(() => {
        const map = L.map(mapRef.current, {
          center: [28.6129, 77.2295],
          zoom:   17,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
        }).addTo(map);

        const fg = new L.FeatureGroup();
        fg.addTo(map);
        drawnItems.current = fg;
        mapObjRef.current  = map;

        // Draw control
        const drawControl = new L.Control.Draw({
          edit: { featureGroup: fg },
          draw: {
            polygon:      { allowIntersection: false, showArea: true,
                            shapeOptions: { color: "#6366f1", fillOpacity: 0.25 } },
            rectangle:    { shapeOptions: { color: "#6366f1", fillOpacity: 0.25 } },
            circle:       false,
            circlemarker: false,
            polyline:     false,
            marker:       false,
          },
        });
        map.addControl(drawControl);

        // Draw created
        map.on(L.Draw.Event.CREATED, (e) => {
          const layer = e.layer;
          fg.addLayer(layer);
          const geoJson = layer.toGeoJSON().geometry;   // Polygon geometry
          const name    = prompt("Zone name (e.g. Main Stage, Food Court, Entry Gate):", "");
          const cap     = prompt("Max capacity for this zone:", "100");
          if (name) {
            saveZone(name, parseInt(cap) || 100, JSON.stringify(geoJson), layer);
          } else {
            fg.removeLayer(layer);
          }
        });

        // Draw deleted
        map.on(L.Draw.Event.DELETED, (e) => {
          // We don't auto-delete from backend on map delete — user uses the list panel
        });

        // Render existing zones
        loadExistingZones(map, fg, L);
      });
    });
  }, []);

  function loadExistingZones(map, fg, L) {
    getLocations(eventId).then((locs) => {
      locs.forEach((loc) => {
        if (loc.boundaryGeoJson) {
          try {
            const geom = JSON.parse(loc.boundaryGeoJson);
            const layer = L.geoJSON({ type: "Feature", geometry: geom }, {
              style: { color: "#6366f1", fillOpacity: 0.2 },
            });
            layer.bindTooltip(loc.name, { permanent: true, direction: "center" });
            fg.addLayer(layer);
          } catch (_) {}
        } else {
          // Point marker for locations without polygon
          L.circleMarker([loc.latitude, loc.longitude], { radius: 8, color: "#6366f1" })
           .bindTooltip(loc.name)
           .addTo(fg);
        }
      });
    });
  }

  async function saveZone(name, capacity, boundaryGeoJson, layer) {
    setSaving(true);
    try {
      const center = layer.getBounds().getCenter();
      const dto = {
        id:              `zone_${eventId.slice(0,8)}_${nanoid(6)}`,
        name,
        latitude:        center.lat,
        longitude:       center.lng,
        maxCapacity:     capacity,
        eventId,
        boundaryGeoJson,
      };
      const saved = await createLocation(dto);
      setZones((prev) => [...prev, saved]);
      setMessage(`Zone "${name}" saved.`);
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      alert("Failed to save zone: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteZone(zoneId) {
    if (!confirm("Delete this zone?")) return;
    await deleteLocation(zoneId);
    setZones((prev) => prev.filter((z) => z.id !== zoneId));
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Zone Editor — {event?.name || "…"}</h2>
        <p style={styles.subtitle}>Draw polygons on the map to define crowd monitoring zones.</p>
      </div>

      <div style={styles.layout}>
        {/* Map */}
        <div style={styles.mapWrap}>
          {message && <div style={styles.toast}>{message}</div>}
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css" />
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.draw/1.0.4/leaflet.draw.css" />
          <div ref={mapRef} style={styles.map} />
          {saving && <div style={styles.savingOverlay}>Saving…</div>}
        </div>

        {/* Zone list */}
        <div style={styles.sidebar}>
          <h3 style={styles.sidebarTitle}>Defined Zones ({zones.length})</h3>
          {zones.length === 0 && (
            <p style={styles.empty}>No zones yet. Draw a polygon on the map.</p>
          )}
          {zones.map((z) => (
            <div key={z.id} style={styles.zoneCard}>
              <div>
                <div style={styles.zoneName}>{z.name}</div>
                <div style={styles.zoneMeta}>Max: {z.maxCapacity} people</div>
                <div style={styles.zoneMeta}>{z.id}</div>
              </div>
              <button style={styles.delBtn} onClick={() => handleDeleteZone(z.id)}>✕</button>
            </div>
          ))}

          <div style={styles.instructions}>
            <strong>How to draw zones:</strong>
            <ol style={{ paddingLeft: 16, lineHeight: 2 }}>
              <li>Click the polygon tool (pentagon icon) in the top-left of the map</li>
              <li>Click points on the map to draw the zone boundary</li>
              <li>Close the polygon by clicking the first point again</li>
              <li>Enter the zone name and capacity when prompted</li>
              <li>Assign your sensor's LOCATION_ID to this zone in <code>edge/config.py</code></li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container:    { display: "flex", flexDirection: "column", height: "100%" },
  header:       { padding: "20px 24px 0", borderBottom: "1px solid #1e293b", marginBottom: 0 },
  title:        { color: "#f1f5f9", fontSize: 20, fontWeight: 700, margin: "0 0 4px" },
  subtitle:     { color: "#64748b", fontSize: 13, margin: "0 0 16px" },
  layout:       { display: "flex", flex: 1, overflow: "hidden" },
  mapWrap:      { flex: 1, position: "relative" },
  map:          { width: "100%", height: "100%", minHeight: 500 },
  savingOverlay:{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)",
                  background: "#6366f1", color: "#fff", padding: "6px 16px", borderRadius: 20, zIndex: 1000 },
  toast:        { position: "absolute", top: 12, right: 12, background: "#22c55e",
                  color: "#fff", padding: "8px 16px", borderRadius: 8, zIndex: 1000, fontSize: 13 },
  sidebar:      { width: 300, background: "#1e293b", overflowY: "auto", padding: 16 },
  sidebarTitle: { color: "#f1f5f9", fontSize: 14, fontWeight: 600, marginBottom: 12 },
  empty:        { color: "#475569", fontSize: 13 },
  zoneCard:     { background: "#0f172a", borderRadius: 8, padding: 12, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  zoneName:     { color: "#f1f5f9", fontSize: 13, fontWeight: 600, marginBottom: 2 },
  zoneMeta:     { color: "#64748b", fontSize: 11 },
  delBtn:       { background: "transparent", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 16, padding: 0 },
  instructions: { marginTop: 16, background: "#0f172a", borderRadius: 8, padding: 12, color: "#94a3b8", fontSize: 12 },
};