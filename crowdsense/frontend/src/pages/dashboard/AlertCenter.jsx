// frontend/src/pages/dashboard/AlertCenter.jsx
import { useState, useEffect } from "react";
import { getAlerts, resolveAlert } from "../../api/crowdApi";
import { useWebSocket } from "../../hooks/useWebSocket";
import { getCrowdConfig } from "../../utils/crowdLevels";
import { format } from "date-fns";

export default function AlertCenter() {
  const [alerts,  setAlerts]  = useState([]);
  const [filter,  setFilter]  = useState("active");
  const [loading, setLoading] = useState(true);
  const { latestAlert } = useWebSocket();

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  // Add new WS alert to top of list
  useEffect(() => {
    if (latestAlert) {
      setAlerts((prev) => [
        { ...latestAlert, resolved: false, triggeredAt: latestAlert.triggeredAt || new Date().toISOString() },
        ...prev.filter((a) => a.id !== latestAlert.id),
      ]);
    }
  }, [latestAlert]);

  async function loadAlerts() {
    setLoading(true);
    try {
      const data = await getAlerts(filter);
      setAlerts(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(id) {
    await resolveAlert(id);
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, resolved: true } : a));
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Alert Center</h1>
        <div style={styles.filters}>
          {["active","resolved","all"].map((f) => (
            <button
              key={f}
              style={{ ...styles.filterBtn, ...(filter === f ? styles.filterActive : {}) }}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading && <div style={styles.loading}>Loading alerts…</div>}

      <div style={styles.list}>
        {alerts.map((alert, i) => {
          const cfg = getCrowdConfig(alert.crowdLevel);
          return (
            <div key={alert.id || i} style={{ ...styles.alertCard, borderLeftColor: cfg.color }}>
              <div style={styles.alertTop}>
                <div>
                  <span style={{ ...styles.levelBadge, background: cfg.bg, color: cfg.color }}>
                    {alert.crowdLevel}
                  </span>
                  <span style={styles.alertType}>{alert.alertType}</span>
                </div>
                {!alert.resolved && (
                  <button style={styles.resolveBtn} onClick={() => handleResolve(alert.id)}>
                    ✓ Resolve
                  </button>
                )}
                {alert.resolved && <span style={styles.resolved}>Resolved</span>}
              </div>
              <div style={styles.alertMsg}>{alert.message}</div>
              <div style={styles.alertMeta}>
                📍 {alert.locationId} &nbsp;·&nbsp;
                {alert.triggeredAt ? format(new Date(alert.triggeredAt), "dd MMM HH:mm:ss") : ""}
              </div>
            </div>
          );
        })}
        {!loading && alerts.length === 0 && (
          <div style={styles.empty}>
            {filter === "active" ? "✅ No active alerts. All clear!" : "No alerts found."}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container:   { padding: 24, overflowY: "auto", height: "100%" },
  header:      { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title:       { color: "#f1f5f9", fontSize: 22, fontWeight: 800, margin: 0 },
  filters:     { display: "flex", gap: 6 },
  filterBtn:   { background: "transparent", border: "1px solid #334155", borderRadius: 6, padding: "6px 14px", color: "#64748b", fontSize: 12, cursor: "pointer" },
  filterActive:{ background: "#1e293b", border: "1px solid #6366f1", color: "#a5b4fc" },
  loading:     { color: "#64748b", fontSize: 13 },
  list:        { display: "flex", flexDirection: "column", gap: 10 },
  alertCard:   { background: "#1e293b", borderRadius: 10, padding: 14, borderLeft: "4px solid transparent" },
  alertTop:    { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  levelBadge:  { borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, marginRight: 8 },
  alertType:   { color: "#64748b", fontSize: 12 },
  resolveBtn:  { background: "#14532d", color: "#4ade80", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer" },
  resolved:    { color: "#64748b", fontSize: 11 },
  alertMsg:    { color: "#f1f5f9", fontSize: 14, marginBottom: 6 },
  alertMeta:   { color: "#64748b", fontSize: 11 },
  empty:       { color: "#475569", fontSize: 13, textAlign: "center", padding: "40px 0" },
};