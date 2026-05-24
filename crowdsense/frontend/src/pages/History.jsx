import { useState, useEffect } from "react";
import crowdApi from "../api/crowdApi.js";
import CrowdChart from "../components/CrowdChart.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import { getCrowdConfig } from "../utils/crowdLevels.js";
import { formatDateTime } from "../utils/formatters.js";

export default function History() {
  const [locations, setLocations] = useState([]);
  const [selectedLoc, setSelectedLoc] = useState("");
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [limit, setLimit] = useState(200);

  useEffect(() => {
    crowdApi.getLocations().then((r) => {
      setLocations(r.data || []);
      if (r.data?.length) setSelectedLoc(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedLoc) return;
    fetchReadings();
  }, [selectedLoc, limit]);

  async function fetchReadings() {
    setLoading(true);
    try {
      const res = await crowdApi.getReadingsByLocation(selectedLoc, limit);
      setReadings(res.data || []);
    } catch { setReadings([]); }
    finally { setLoading(false); }
  }

  // Summary stats
  const stats = calcStats(readings);
  const locName = locations.find((l) => l.id === selectedLoc)?.name || selectedLoc;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Location</label>
          <select
            value={selectedLoc}
            onChange={(e) => setSelectedLoc(e.target.value)}
            style={styles.select}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Records</label>
          <select value={limit} onChange={(e) => setLimit(Number(e.target.value))} style={styles.select}>
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
            <option value={200}>Last 200</option>
            <option value={500}>Last 500</option>
          </select>
        </div>
        <button onClick={fetchReadings} style={styles.refreshBtn}>↻ Refresh</button>
      </div>

      {/* Stats cards */}
      <div className="grid-4">
        <MiniStat label="Total Readings" value={readings.length} />
        <MiniStat label="Avg People" value={stats.avg} />
        <MiniStat label="Peak People" value={stats.max} color="#ef4444" />
        <MiniStat label="Low People" value={stats.min} color="#22c55e" />
      </div>

      {/* Level distribution */}
      <div className="card">
        <h3 style={styles.cardTitle}>Crowd Level Distribution</h3>
        <div style={styles.distRow}>
          {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((lvl) => {
            const count = readings.filter((r) => r.crowdLevel === lvl).length;
            const pct = readings.length ? ((count / readings.length) * 100).toFixed(1) : 0;
            const { color, label, bg } = getCrowdConfig(lvl);
            return (
              <div key={lvl} style={{ ...styles.distCard, background: bg, border: `1px solid ${color}33` }}>
                <span style={{ color, fontFamily: "'Space Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
                <span style={{ color, fontFamily: "'Space Mono', monospace", fontSize: 24, fontWeight: 700 }}>{pct}%</span>
                <span style={{ color: "#7a8ba0", fontFamily: "'Space Mono', monospace", fontSize: 11 }}>{count} readings</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div className="card" style={{ height: 300 }}>
        <h3 style={styles.cardTitle}>{locName} — History</h3>
        <div style={{ height: 250, marginTop: 12 }}>
          {loading ? <LoadingSpinner message="Fetching data…" /> : <CrowdChart readings={readings} locationName={locName} />}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflowX: "auto" }}>
        <h3 style={{ ...styles.cardTitle, marginBottom: 14 }}>Raw Data</h3>
        {loading ? <LoadingSpinner /> : (
          <table style={styles.table}>
            <thead>
              <tr>
                {["Time", "People", "Level", "Confidence", "Location"].map((h) => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {readings.slice(0, 100).map((r, i) => {
                const { color, label, bg } = getCrowdConfig(r.crowdLevel);
                return (
                  <tr key={r.id || i} style={styles.tr}>
                    <td style={styles.td}><span style={styles.mono}>{formatDateTime(r.capturedAt)}</span></td>
                    <td style={styles.td}><span style={{ ...styles.mono, color }}>{r.personCount}</span></td>
                    <td style={styles.td}><span style={{ ...styles.badge, background: bg, color }}>{label}</span></td>
                    <td style={styles.td}><span style={styles.mono}>{r.confidence ? (r.confidence * 100).toFixed(0) + "%" : "—"}</span></td>
                    <td style={styles.td}><span style={styles.mono}>{r.locationId}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {readings.length > 100 && (
          <div style={{ textAlign: "center", padding: 12, color: "#4a5568", fontSize: 12, fontFamily: "'Space Mono', monospace" }}>
            Showing 100 of {readings.length} — use chart for full view
          </div>
        )}
      </div>
    </div>
  );
}

function MiniStat({ label, value, color = "#3b82f6" }) {
  return (
    <div className="card">
      <div style={{ color: "#4a5568", fontSize: 10, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
      <div style={{ color, fontFamily: "'Space Mono', monospace", fontSize: 24, fontWeight: 700, marginTop: 6 }}>{value ?? "—"}</div>
    </div>
  );
}

function calcStats(readings) {
  if (!readings.length) return { avg: "—", max: "—", min: "—" };
  const counts = readings.map((r) => r.personCount);
  return {
    avg: Math.round(counts.reduce((a, b) => a + b, 0) / counts.length),
    max: Math.max(...counts),
    min: Math.min(...counts),
  };
}

const styles = {
  controls: { display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#7a8ba0", textTransform: "uppercase", letterSpacing: "0.08em" },
  select: {
    background: "#111827", border: "1px solid #1e2d45",
    borderRadius: 8, padding: "8px 14px", color: "#e8edf5",
    fontFamily: "'Space Mono', monospace", fontSize: 12, outline: "none", cursor: "pointer",
  },
  refreshBtn: {
    background: "transparent", border: "1px solid #1e2d45",
    borderRadius: 8, padding: "8px 16px", color: "#7a8ba0",
    fontFamily: "'Space Mono', monospace", fontSize: 12, cursor: "pointer",
  },
  cardTitle: { fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14, color: "#c5cfe0" },
  distRow: { display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" },
  distCard: { flex: 1, minWidth: 100, display: "flex", flexDirection: "column", gap: 4, padding: "14px 16px", borderRadius: 8 },
  table: { width: "100%", borderCollapse: "collapse" },
  th: {
    fontFamily: "'Space Mono', monospace", fontSize: 10, color: "#4a5568",
    textTransform: "uppercase", letterSpacing: "0.1em",
    padding: "8px 12px", textAlign: "left", borderBottom: "1px solid #1e2d45",
  },
  tr: { borderBottom: "1px solid #1a2438" },
  td: { padding: "10px 12px", color: "#7a8ba0", fontSize: 12 },
  mono: { fontFamily: "'Space Mono', monospace", fontSize: 12 },
  badge: {
    fontSize: 10, fontFamily: "'Space Mono', monospace", fontWeight: 700,
    padding: "2px 8px", borderRadius: 20, letterSpacing: "0.08em", textTransform: "uppercase",
  },
};
