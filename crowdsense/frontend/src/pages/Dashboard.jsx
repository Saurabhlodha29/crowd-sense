import { useState, useEffect } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { getLatestReadings, getLocations, getAlertStats } from "../api/crowdApi";
import CrowdLevelCard from "../components/CrowdLevelCard";
import AlertBanner from "../components/AlertBanner";
import { getCrowdConfig } from "../utils/crowdLevels";

export default function Dashboard() {
  const { latestCrowdUpdate, latestAlert } = useWebSocket();
  const [readings, setReadings] = useState([]);
  const [locations, setLocations] = useState([]);
  const [alertStats, setAlertStats] = useState({ active: 0, total: 0 });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initial load
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [rRes, lRes, aRes] = await Promise.all([
          getLatestReadings(),
          getLocations(),
          getAlertStats(),
        ]);
        setReadings(rRes.data || []);
        setLocations(lRes.data || []);
        setAlertStats(aRes.data || { active: 0, total: 0 });
        setError(null);
      } catch (e) {
        setError(e?.response?.data?.error || e.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Live WebSocket updates
  useEffect(() => {
    if (!latestCrowdUpdate) return;
    setReadings((prev) => {
      const idx = prev.findIndex((r) => r.locationId === latestCrowdUpdate.locationId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...latestCrowdUpdate };
        return next;
      }
      return [...prev, latestCrowdUpdate];
    });
  }, [latestCrowdUpdate]);

  function locationName(locationId) {
    return locations.find((l) => l.id === locationId)?.name || locationId;
  }

  const totalPeople = readings.reduce((sum, r) => sum + (r.personCount || 0), 0);
  const highestLevel = readings.reduce((acc, r) => {
    const order = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
    return (order[r.crowdLevel] || 0) > (order[acc] || 0) ? r.crowdLevel : acc;
  }, "LOW");

  if (loading) {
    return (
      <div style={{ padding: 40, color: "#94a3b8", textAlign: "center" }}>
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <div style={{ color: "#f87171", fontFamily: "monospace", marginBottom: 16 }}>
          ⚠ {error}
        </div>
        <button
          onClick={() => window.location.reload()}
          style={{
            background: "#3b82f6", color: "#fff", border: "none",
            borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontSize: 14,
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 28 }}>
      <AlertBanner alert={latestAlert} />

      {/* Summary stat cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
        {[
          { label: "Monitored Locations", value: locations.length, color: "#60a5fa" },
          { label: "Total People (now)", value: totalPeople, color: "#34d399" },
          { label: "Active Alerts",      value: alertStats.active, color: "#f87171" },
          { label: "Highest Level",      value: highestLevel, color: getCrowdConfig(highestLevel).color },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            background: "#1e293b", borderRadius: 12, padding: "18px 24px",
            border: "1px solid #334155", flex: "1 1 160px",
          }}>
            <div style={{ fontSize: 12, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
              {label}
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Per-location crowd cards */}
      {readings.length === 0 ? (
        <div style={{
          background: "#1e293b", borderRadius: 12, padding: 40,
          textAlign: "center", color: "#475569", fontSize: 14,
          border: "1px solid #334155",
        }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📡</div>
          No readings yet. Start the sensor agent to begin collecting data.
          <div style={{ fontFamily: "monospace", marginTop: 12, fontSize: 12, color: "#1d4ed8" }}>
            cd edge && python sensor_agent.py
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {readings.map((r) => (
            <CrowdLevelCard
              key={r.locationId || r.id}
              locationName={locationName(r.locationId)}
              personCount={r.personCount}
              crowdLevel={r.crowdLevel}
              capturedAt={r.capturedAt}
            />
          ))}
        </div>
      )}
    </div>
  );
}