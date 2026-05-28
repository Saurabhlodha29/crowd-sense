import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { getLocations, createLocation, getLatestReadings } from "../api/crowdApi";
import { getCrowdConfig } from "../utils/crowdLevels";
import { timeAgo } from "../utils/formatters";

// Fix Leaflet default icon missing in Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const [readings,  setReadings]  = useState([]);
  const [showForm,  setShowForm]  = useState(false);
  const [form, setForm] = useState({
    name: "", latitude: "", longitude: "", description: "", maxCapacity: ""
  });
  const [saving, setSaving] = useState(false);

  function load() {
    Promise.all([getLocations(), getLatestReadings()])
      .then(([l, r]) => {
        setLocations(l.data || []);
        setReadings(r.data || []);
      })
      .catch(console.error);
  }

  useEffect(() => { load(); }, []);

  function getReadingForLocation(locId) {
    return readings.find((r) => r.locationId === locId);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.latitude || !form.longitude) return;
    try {
      setSaving(true);
      await createLocation({
        name: form.name,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        description: form.description,
        maxCapacity: form.maxCapacity ? parseInt(form.maxCapacity) : null,
      });
      setForm({ name: "", latitude: "", longitude: "", description: "", maxCapacity: "" });
      setShowForm(false);
      load();
    } catch (e) {
      alert("Failed to create location. Make sure you are logged in as admin.");
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    background: "#0f172a", border: "1px solid #334155", color: "#f1f5f9",
    borderRadius: 6, padding: "8px 12px", fontSize: 13, width: "100%", boxSizing: "border-box",
  };

  const center = locations.length > 0
    ? [locations[0].latitude, locations[0].longitude]
    : [28.6139, 77.2090];

  return (
    <div style={{ padding: 28 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, color: "#f1f5f9", fontSize: 18, fontWeight: 600 }}>
          Monitored Locations
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            background: "#3b82f6", color: "#fff", border: "none",
            borderRadius: 8, padding: "9px 18px", cursor: "pointer", fontSize: 13, fontWeight: 600,
          }}
        >
          + Add Location
        </button>
      </div>

      {/* Add Location form */}
      {showForm && (
        <div style={{
          background: "#1e293b", border: "1px solid #334155", borderRadius: 12,
          padding: 24, marginBottom: 24,
        }}>
          <h3 style={{ margin: "0 0 16px", color: "#e2e8f0", fontSize: 15 }}>New Location</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>Name *</label>
                <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="e.g. Gate A" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>Max Capacity</label>
                <input style={inputStyle} type="number" value={form.maxCapacity} onChange={(e) => setForm({ ...form, maxCapacity: e.target.value })} placeholder="e.g. 200" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>Latitude *</label>
                <input style={inputStyle} type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} required placeholder="e.g. 28.6139" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>Longitude *</label>
                <input style={inputStyle} type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} required placeholder="e.g. 77.2090" />
              </div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "#64748b", display: "block", marginBottom: 4 }}>Description</label>
              <input style={inputStyle} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Main entrance gate" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="submit" disabled={saving} style={{
                background: "#3b82f6", color: "#fff", border: "none",
                borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontSize: 13,
              }}>
                {saving ? "Saving..." : "Save Location"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{
                background: "#1e293b", color: "#94a3b8", border: "1px solid #334155",
                borderRadius: 6, padding: "8px 16px", cursor: "pointer", fontSize: 13,
              }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Leaflet Map */}
      <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 24, border: "1px solid #334155" }}>
        <MapContainer
          center={center}
          zoom={13}
          style={{ height: 380 }}
          key={locations.length}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org">OSM</a> &copy; <a href="https://carto.com">CartoDB</a>'
          />
          {locations.map((loc) => {
            const reading = getReadingForLocation(loc.id);
            const cfg = getCrowdConfig(reading?.crowdLevel);
            return (
              <CircleMarker
                key={loc.id}
                center={[loc.latitude, loc.longitude]}
                radius={14}
                pathOptions={{ color: cfg.color, fillColor: cfg.color, fillOpacity: 0.4, weight: 2 }}
              >
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <strong>{loc.name}</strong>
                    {reading && (
                      <div style={{ marginTop: 6, fontSize: 12 }}>
                        <div>{reading.personCount} people · {reading.crowdLevel}</div>
                        <div style={{ color: "#888", marginTop: 2 }}>{timeAgo(reading.capturedAt)}</div>
                      </div>
                    )}
                    {!reading && <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>No readings yet</div>}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* Location cards */}
      {locations.length === 0 ? (
        <div style={{
          textAlign: "center", color: "#475569", padding: 40,
          fontFamily: "monospace", fontSize: 13,
        }}>
          No locations yet. Add your first location above, then start the sensor agent.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {locations.map((loc) => {
            const reading = getReadingForLocation(loc.id);
            const cfg = getCrowdConfig(reading?.crowdLevel);
            return (
              <div key={loc.id} style={{
                background: "#1e293b", border: `1px solid ${reading ? cfg.border : "#334155"}`,
                borderRadius: 10, padding: "16px 20px",
                display: "flex", alignItems: "center", gap: 16,
              }}>
                <div style={{
                  width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
                  background: reading ? cfg.color : "#334155",
                  boxShadow: reading ? `0 0 8px ${cfg.color}` : "none",
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9", marginBottom: 2 }}>{loc.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                    {loc.description && ` · ${loc.description}`}
                  </div>
                </div>
                {reading ? (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: cfg.color }}>{reading.personCount}</div>
                    <div style={{ fontSize: 11, color: "#475569" }}>{timeAgo(reading.capturedAt)}</div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: "#475569" }}>No data</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}