import { useState, useEffect } from "react";
import { getLocations, getReadingsByLocation } from "../api/crowdApi";
import CrowdChart from "../components/CrowdChart";
import { getCrowdConfig } from "../utils/crowdLevels";
import { formatDateTime } from "../utils/formatters";

export default function History() {
  const [locations, setLocations]   = useState([]);
  const [selectedLoc, setSelectedLoc] = useState("loc_001");
  const [limit, setLimit]           = useState(200);
  const [readings, setReadings]     = useState([]);
  const [loading, setLoading]       = useState(false);

  useEffect(() => {
    getLocations().then((r) => {
      setLocations(r.data || []);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedLoc) return;
    setLoading(true);
    getReadingsByLocation(selectedLoc, limit)
      .then((r) => setReadings(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedLoc, limit]);

  const locationName = locations.find((l) => l.id === selectedLoc)?.name || selectedLoc;

  // Stats from readings
  const total   = readings.length;
  const avg     = total ? Math.round(readings.reduce((s, r) => s + r.personCount, 0) / total) : null;
  const peak    = total ? Math.max(...readings.map((r) => r.personCount)) : null;
  const low     = total ? Math.min(...readings.map((r) => r.personCount)) : null;

  const levelCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
  readings.forEach((r) => { if (levelCounts[r.crowdLevel] !== undefined) levelCounts[r.crowdLevel]++; });

  const selectStyle = {
    background: "#1e293b", color: "#f1f5f9", border: "1px solid #334155",
    borderRadius: 6, padding: "6px 12px", fontSize: 13, cursor: "pointer",
  };

  return (
    <div style={{ padding: 28 }}>
      {/* Controls */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <label style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>
            Location
          </label>
          <select style={selectStyle} value={selectedLoc} onChange={(e) => setSelectedLoc(e.target.value)}>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>
            Records
          </label>
          <select style={selectStyle} value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            {[50, 100, 200, 500].map((v) => (
              <option key={v} value={v}>Last {v}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setLimit((l) => l)} // triggers re-fetch
          style={{
            alignSelf: "flex-end", background: "#1e3a5f", color: "#60a5fa",
            border: "1px solid #1d4ed8", borderRadius: 6,
            padding: "7px 14px", cursor: "pointer", fontSize: 13,
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "Total Readings", value: total,  color: "#60a5fa" },
          { label: "Avg People",     value: avg ?? "—", color: "#34d399" },
          { label: "Peak People",    value: peak ?? "—", color: "#f87171" },
          { label: "Low People",     value: low ?? "—", color: "#22c55e" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: "#1e293b", borderRadius: 10, padding: "16px 20px",
            border: "1px solid #334155", flex: "1 1 140px",
          }}>
            <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
              {label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Crowd level distribution */}
      <div style={{
        background: "#1e293b", borderRadius: 10, padding: "20px 24px",
        border: "1px solid #334155", marginBottom: 24,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 16 }}>
          Crowd Level Distribution
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {Object.entries(levelCounts).map(([level, count]) => {
            const cfg = getCrowdConfig(level);
            const pct = total ? Math.round((count / total) * 100) : 0;
            return (
              <div key={level} style={{
                background: cfg.bg, border: `1px solid ${cfg.border}`,
                borderRadius: 8, padding: "12px 18px", flex: "1 1 120px",
              }}>
                <div style={{ fontSize: 11, color: cfg.color, fontWeight: 700, marginBottom: 4 }}>
                  {level}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: cfg.color }}>{pct}%</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{count} readings</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <div style={{
        background: "#1e293b", borderRadius: 10, padding: "20px 24px",
        border: "1px solid #334155", marginBottom: 24,
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 16 }}>
          {locationName} — History
        </div>
        {loading ? (
          <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569" }}>
            Loading...
          </div>
        ) : (
          <CrowdChart readings={readings} locationName={locationName} />
        )}
      </div>

      {/* Raw data table */}
      <div style={{
        background: "#1e293b", borderRadius: 10, padding: "20px 24px",
        border: "1px solid #334155", overflow: "auto",
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: 16 }}>
          Raw Data
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["Time", "People", "Level", "Confidence", "Location"].map((h) => (
                <th key={h} style={{
                  textAlign: "left", padding: "8px 12px",
                  color: "#64748b", fontSize: 11, textTransform: "uppercase",
                  letterSpacing: 1, borderBottom: "1px solid #334155",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {readings.slice(0, 100).map((r, i) => {
              const cfg = getCrowdConfig(r.crowdLevel);
              return (
                <tr key={r.id || i} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "8px 12px", color: "#94a3b8" }}>{formatDateTime(r.capturedAt)}</td>
                  <td style={{ padding: "8px 12px", color: "#f1f5f9", fontWeight: 600 }}>{r.personCount}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{
                      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                      borderRadius: 12, padding: "2px 10px", fontSize: 11, fontWeight: 600,
                    }}>
                      {r.crowdLevel}
                    </span>
                  </td>
                  <td style={{ padding: "8px 12px", color: "#64748b" }}>
                    {r.confidence ? `${(r.confidence * 100).toFixed(0)}%` : "—"}
                  </td>
                  <td style={{ padding: "8px 12px", color: "#64748b" }}>{r.locationId}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {readings.length === 0 && (
          <div style={{ textAlign: "center", color: "#475569", padding: 24, fontSize: 13 }}>
            No data for {locationName}
          </div>
        )}
      </div>
    </div>
  );
}