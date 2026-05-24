import { useState, useEffect } from "react";
import crowdApi from "../api/crowdApi.js";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import CrowdMap from "../components/CrowdMap.jsx";
import { getCrowdConfig } from "../utils/crowdLevels.js";
import { MapPin, Plus, X, CheckCircle } from "lucide-react";

export default function Locations() {
  const [locations, setLocations] = useState([]);
  const [readings, setReadings] = useState({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: "", name: "", latitude: "", longitude: "", description: "", maxCapacity: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [locRes, readRes] = await Promise.all([
        crowdApi.getLocations(),
        crowdApi.getLatestReadings(),
      ]);
      setLocations(locRes.data || []);
      const byLoc = {};
      (readRes.data || []).forEach((r) => { byLoc[r.locationId] = r; });
      setReadings(byLoc);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await crowdApi.createLocation({
        id: form.id || undefined,
        name: form.name,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        description: form.description || undefined,
        maxCapacity: form.maxCapacity ? parseInt(form.maxCapacity) : undefined,
      });
      setSaved(true);
      setTimeout(() => { setSaved(false); setShowForm(false); fetchData(); }, 1200);
      setForm({ id: "", name: "", latitude: "", longitude: "", description: "", maxCapacity: "" });
    } catch (e) {
      setError(e.response?.data?.message || e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner message="Loading locations…" />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2 style={styles.h2}>Monitored Locations</h2>
        <button onClick={() => setShowForm(!showForm)} style={styles.addBtn}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "Add Location"}
        </button>
      </div>

      {/* Add Location Form */}
      {showForm && (
        <div className="card" style={{ animation: "fade-in 0.25s ease" }}>
          <h3 style={styles.formTitle}>New Location</h3>
          <form onSubmit={handleSave} style={styles.formGrid}>
            <FormField label="Location ID" value={form.id} onChange={(v) => setForm({ ...form, id: v })} placeholder="loc_002" hint="Leave blank to auto-generate" />
            <FormField label="Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Main Entrance" required />
            <FormField label="Latitude *" value={form.latitude} onChange={(v) => setForm({ ...form, latitude: v })} placeholder="28.6139" type="number" step="any" required />
            <FormField label="Longitude *" value={form.longitude} onChange={(v) => setForm({ ...form, longitude: v })} placeholder="77.2090" type="number" step="any" required />
            <FormField label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Optional description" />
            <FormField label="Max Capacity" value={form.maxCapacity} onChange={(v) => setForm({ ...form, maxCapacity: v })} placeholder="100" type="number" />
            {error && <div style={styles.error}>{error}</div>}
            <button type="submit" disabled={saving} style={styles.saveBtn}>
              {saved ? <><CheckCircle size={14} /> Saved!</> : saving ? "Saving…" : "Save Location"}
            </button>
          </form>
        </div>
      )}

      {/* Map */}
      <div className="card" style={{ height: 300 }}>
        <CrowdMap locations={locations} locationReadings={readings} />
      </div>

      {/* Table */}
      <div className="card" style={{ overflowX: "auto" }}>
        {locations.length === 0 ? (
          <div style={{ color: "#4a5568", padding: 24, fontFamily: "'Space Mono', monospace", textAlign: "center" }}>
            No locations yet. Add your first location above, then start the sensor agent.
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                {["ID", "Name", "Coords", "Capacity", "Current Level", "People", "Status"].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {locations.map((loc) => {
                const r = readings[loc.id];
                const { color, label, bg } = getCrowdConfig(r?.crowdLevel || "LOW");
                return (
                  <tr key={loc.id} style={styles.tr}>
                    <td style={styles.td}><span style={styles.mono}>{loc.id}</span></td>
                    <td style={styles.td}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <MapPin size={12} color={color} />
                        <span style={{ color: "#e8edf5" }}>{loc.name}</span>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={styles.mono}>{loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}</span>
                    </td>
                    <td style={styles.td}><span style={styles.mono}>{loc.maxCapacity || "—"}</span></td>
                    <td style={styles.td}>
                      {r ? (
                        <span style={{ ...styles.badge, background: bg, color }}>{label}</span>
                      ) : <span style={{ color: "#4a5568" }}>—</span>}
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.mono, color: r ? color : "#4a5568" }}>{r?.personCount ?? "—"}</span>
                    </td>
                    <td style={styles.td}>
                      <span style={{ color: loc.isActive ? "#22c55e" : "#4a5568", fontSize: 11, fontFamily: "'Space Mono', monospace" }}>
                        {loc.isActive ? "● Active" : "○ Inactive"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, type = "text", step, required, hint }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#7a8ba0", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </label>
      <input
        type={type}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        style={{
          background: "#0d1220", border: "1px solid #1e2d45",
          borderRadius: 6, padding: "8px 12px", color: "#e8edf5",
          fontFamily: "'Space Mono', monospace", fontSize: 12, outline: "none",
        }}
      />
      {hint && <span style={{ fontSize: 10, color: "#4a5568", fontFamily: "'Space Mono', monospace" }}>{hint}</span>}
    </div>
  );
}

const styles = {
  h2: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: "#e8edf5" },
  addBtn: {
    display: "flex", alignItems: "center", gap: 6,
    background: "#3b82f6", color: "#fff", border: "none",
    borderRadius: 8, padding: "8px 16px", cursor: "pointer",
    fontFamily: "'Space Mono', monospace", fontSize: 12,
  },
  formTitle: { fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 15, color: "#c5cfe0", marginBottom: 16 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 },
  error: {
    gridColumn: "1 / -1",
    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 6, padding: "8px 12px",
    color: "#ef4444", fontSize: 12, fontFamily: "'Space Mono', monospace",
  },
  saveBtn: {
    gridColumn: "1 / -1",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    background: "#3b82f6", color: "#fff", border: "none",
    borderRadius: 8, padding: "10px 0", cursor: "pointer",
    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14,
  },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    fontFamily: "'Space Mono', monospace", fontSize: 10,
    color: "#4a5568", textTransform: "uppercase", letterSpacing: "0.1em",
    padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #1e2d45",
  },
  tr: { borderBottom: "1px solid #1a2438", transition: "background 0.12s" },
  td: { padding: "12px", color: "#7a8ba0", fontSize: 13 },
  mono: { fontFamily: "'Space Mono', monospace", fontSize: 12 },
  badge: {
    fontSize: 10, fontFamily: "'Space Mono', monospace", fontWeight: 700,
    padding: "2px 8px", borderRadius: 20, letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
};
