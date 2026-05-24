import { useState, useCallback } from "react";
import { useCrowdData } from "../hooks/useCrowdData.js";
import { useWebSocket } from "../hooks/useWebSocket.js";
import CrowdLevelCard from "../components/CrowdLevelCard.jsx";
import CrowdChart from "../components/CrowdChart.jsx";
import CrowdMap from "../components/CrowdMap.jsx";
import AlertBanner from "../components/AlertBanner.jsx";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import crowdApi from "../api/crowdApi.js";


export default function Dashboard() {
  const { locationReadings, locations, alerts, loading, error, refetch, applyLiveUpdate } =
    useCrowdData();
  const [chartReadings, setChartReadings] = useState([]);
  const [selectedLoc, setSelectedLoc] = useState(null);
  const [chartLoading, setChartLoading] = useState(false);
  const [resolvedIds, setResolvedIds] = useState(new Set());

  const onCrowdUpdate = useCallback(
    (data) => applyLiveUpdate(data),
    [applyLiveUpdate]
  );
  const onAlertUpdate = useCallback(() => refetch(), [refetch]);
  useWebSocket(onCrowdUpdate, onAlertUpdate);

  async function loadChart(locId) {
    setSelectedLoc(locId);
    setChartLoading(true);
    try {
      const res = await crowdApi.getReadingsByLocation(locId, 120);
      setChartReadings(res.data || []);
    } catch {
      setChartReadings([]);
    } finally {
      setChartLoading(false);
    }
  }

  function handleResolved(id) {
    setResolvedIds((prev) => new Set([...prev, id]));
  }

  const visibleAlerts = alerts.filter((a) => !resolvedIds.has(a.id));
  const locMap = Object.fromEntries(locations.map((l) => [l.id, l]));
  const selectedLocName = selectedLoc ? locMap[selectedLoc]?.name : "";

  if (loading) return <LoadingSpinner message="Loading dashboard…" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  const locationList = locations.length
    ? locations
    : Object.keys(locationReadings).map((id) => ({ id, name: id }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Active Alerts */}
      <AlertBanner alerts={visibleAlerts} onResolved={handleResolved} />

      {/* Summary Cards */}
      <section>
        <SectionLabel>Live Status</SectionLabel>
        <div className="grid-4" style={{ marginTop: 10 }}>
          {locationList.map((loc) => (
            <div
              key={loc.id}
              onClick={() => loadChart(loc.id)}
              style={{ cursor: "pointer", outline: selectedLoc === loc.id ? "2px solid #3b82f6" : "none", borderRadius: 12 }}
            >
              <CrowdLevelCard
                locationName={loc.name}
                reading={locationReadings[loc.id]}
              />
            </div>
          ))}
          {!locationList.length && (
            <div style={styles.noLocs}>
              No locations found. Add one in <b>Locations</b> tab or start the sensor agent.
            </div>
          )}
        </div>
      </section>

      {/* Chart + Map */}
      <div style={styles.bottomRow}>
        {/* Chart */}
        <div className="card" style={{ flex: 2, minWidth: 0 }}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>
              {selectedLocName ? `${selectedLocName} — Trend` : "Select a location card to view chart"}
            </span>
            {selectedLoc && (
              <button onClick={() => loadChart(selectedLoc)} style={styles.refreshBtn}>↻ Refresh</button>
            )}
          </div>
          <div style={{ height: 260, marginTop: 12 }}>
            {chartLoading ? (
              <LoadingSpinner message="Loading chart…" />
            ) : (
              <CrowdChart readings={chartReadings} locationName={selectedLocName} />
            )}
          </div>
        </div>

        {/* Map */}
        <div className="card" style={{ flex: 1.2, minWidth: 280 }}>
          <div style={styles.cardHeader}>
            <span style={styles.cardTitle}>Live Map</span>
          </div>
          <div style={{ height: 260, marginTop: 12 }}>
            <CrowdMap locations={locations} locationReadings={locationReadings} />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid-3">
        <StatCard
          label="Locations Monitored"
          value={locationList.length}
          unit="sites"
          color="#3b82f6"
        />
        <StatCard
          label="Active Alerts"
          value={visibleAlerts.filter((a) => !a.resolved).length}
          unit="unresolved"
          color="#ef4444"
        />
        <StatCard
          label="Critical Zones"
          value={Object.values(locationReadings).filter((r) => r.crowdLevel === "CRITICAL").length}
          unit="locations"
          color="#f97316"
        />
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div style={{
      fontFamily: "'Space Mono', monospace", fontSize: 11,
      color: "#4a5568", letterSpacing: "0.12em",
      textTransform: "uppercase", paddingBottom: 2,
    }}>
      {children}
    </div>
  );
}

function StatCard({ label, value, unit, color }) {
  return (
    <div className="card" style={{ borderTop: `2px solid ${color}` }}>
      <div style={{ color: "#7a8ba0", fontSize: 11, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 28, fontWeight: 700, color }}>{value}</span>
        <span style={{ color: "#4a5568", fontSize: 12 }}>{unit}</span>
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div style={{ color: "#ef4444", fontSize: 14, marginBottom: 12, fontFamily: "'Space Mono', monospace" }}>
        ⚠ {message}
      </div>
      <button onClick={onRetry} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: 6, padding: "8px 20px", cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>
        Retry
      </button>
    </div>
  );
}

const styles = {
  bottomRow: { display: "flex", gap: 16, flexWrap: "wrap" },
  cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 14, color: "#c5cfe0" },
  refreshBtn: {
    background: "transparent", border: "1px solid #1e2d45",
    borderRadius: 6, padding: "4px 10px", color: "#7a8ba0",
    fontSize: 12, cursor: "pointer", fontFamily: "'Space Mono', monospace",
  },
  noLocs: {
    gridColumn: "1 / -1", color: "#4a5568",
    fontFamily: "'Space Mono', monospace", fontSize: 13, padding: 20,
  },
};
