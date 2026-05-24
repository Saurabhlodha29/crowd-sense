import { useState, useEffect, useCallback } from "react";
import crowdApi from "../api/crowdApi.js";
import { useWebSocket } from "../hooks/useWebSocket.js";
import { getCrowdConfig } from "../utils/crowdLevels.js";
import { formatDateTime, timeAgo } from "../utils/formatters.js";
import { AlertTriangle, CheckCircle, Bell, BellOff } from "lucide-react";
import LoadingSpinner from "../components/LoadingSpinner.jsx";

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | active | resolved
  const [resolving, setResolving] = useState(null);

  useEffect(() => { fetchAlerts(); }, []);

  async function fetchAlerts() {
    setLoading(true);
    try {
      const res = await crowdApi.getAlerts();
      setAlerts(res.data || []);
    } catch { setAlerts([]); }
    finally { setLoading(false); }
  }

  const onAlertUpdate = useCallback((newAlert) => {
    setAlerts((prev) => {
      const exists = prev.find((a) => a.id === newAlert.id);
      if (exists) return prev.map((a) => a.id === newAlert.id ? newAlert : a);
      return [newAlert, ...prev];
    });
  }, []);

  useWebSocket(null, onAlertUpdate);

  async function resolve(id) {
    setResolving(id);
    try {
      await crowdApi.resolveAlert(id);
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, resolved: true } : a));
    } catch (e) { console.error(e); }
    finally { setResolving(null); }
  }

  const filtered = alerts.filter((a) => {
    if (filter === "active") return !a.resolved;
    if (filter === "resolved") return a.resolved;
    return true;
  });

  const activeCount = alerts.filter((a) => !a.resolved).length;

  if (loading) return <LoadingSpinner message="Loading alerts…" />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h2 style={styles.h2}>Alerts</h2>
          {activeCount > 0 && (
            <span style={styles.badge}>{activeCount} active</span>
          )}
        </div>
        <div style={styles.filterRow}>
          {["all", "active", "resolved"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{ ...styles.filterBtn, ...(filter === f ? styles.filterBtnActive : {}) }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid-3">
        <SummaryCard icon={<Bell size={18} color="#ef4444" />} label="Active" value={alerts.filter(a => !a.resolved).length} color="#ef4444" />
        <SummaryCard icon={<CheckCircle size={18} color="#22c55e" />} label="Resolved" value={alerts.filter(a => a.resolved).length} color="#22c55e" />
        <SummaryCard icon={<AlertTriangle size={18} color="#f59e0b" />} label="Total" value={alerts.length} color="#f59e0b" />
      </div>

      {/* Alert list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <BellOff size={32} color="#2a3f5f" style={{ marginBottom: 12 }} />
            <div style={{ color: "#4a5568", fontFamily: "'Space Mono', monospace", fontSize: 13 }}>
              {filter === "active" ? "No active alerts — everything looks safe!" : "No alerts found."}
            </div>
          </div>
        ) : (
          filtered.map((alert) => <AlertRow key={alert.id} alert={alert} onResolve={resolve} resolving={resolving} />)
        )}
      </div>
    </div>
  );
}

function AlertRow({ alert, onResolve, resolving }) {
  const { color, bg } = getCrowdConfig(alert.crowdLevel);
  const isResolving = resolving === alert.id;

  return (
    <div
      style={{
        ...styles.row,
        borderLeft: `3px solid ${alert.resolved ? "#2a3f5f" : color}`,
        opacity: alert.resolved ? 0.6 : 1,
      }}
    >
      <div style={styles.rowIcon}>
        <AlertTriangle size={16} color={alert.resolved ? "#4a5568" : color} />
      </div>
      <div style={styles.rowBody}>
        <div style={styles.rowTop}>
          <span style={{ ...styles.levelTag, background: bg, color: alert.resolved ? "#4a5568" : color }}>
            {alert.crowdLevel}
          </span>
          <span style={styles.alertType}>{alert.alertType?.replace("_", " ")}</span>
          {alert.resolved && <span style={styles.resolvedTag}>✓ Resolved</span>}
        </div>
        <div style={styles.rowMsg}>{alert.message}</div>
        <div style={styles.rowMeta}>
          <span>{formatDateTime(alert.triggeredAt)}</span>
          <span>·</span>
          <span>{timeAgo(alert.triggeredAt)}</span>
          <span>·</span>
          <span>Loc: {alert.locationId}</span>
          {alert.personCount && <><span>·</span><span>{alert.personCount} people</span></>}
        </div>
      </div>
      {!alert.resolved && (
        <button
          onClick={() => onResolve(alert.id)}
          disabled={isResolving}
          style={{ ...styles.resolveBtn, opacity: isResolving ? 0.5 : 1 }}
        >
          <CheckCircle size={14} />
          {isResolving ? "…" : "Resolve"}
        </button>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, color }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
      {icon}
      <div>
        <div style={{ color: "#4a5568", fontSize: 10, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
        <div style={{ color, fontFamily: "'Space Mono', monospace", fontSize: 22, fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  );
}

const styles = {
  h2: { fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 18, color: "#e8edf5" },
  badge: {
    background: "rgba(239,68,68,0.15)", color: "#ef4444",
    fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
    padding: "3px 10px", borderRadius: 20,
  },
  filterRow: { display: "flex", gap: 4 },
  filterBtn: {
    background: "transparent", border: "1px solid #1e2d45",
    borderRadius: 6, padding: "6px 14px", color: "#7a8ba0",
    fontFamily: "'Space Mono', monospace", fontSize: 12, cursor: "pointer",
  },
  filterBtnActive: { background: "#1a2d45", color: "#3b82f6", borderColor: "#3b82f6" },
  row: {
    background: "#151d2e", border: "1px solid #1e2d45",
    borderRadius: 10, padding: "14px 16px",
    display: "flex", alignItems: "flex-start", gap: 12,
    animation: "fade-in 0.25s ease",
  },
  rowIcon: { paddingTop: 2, flexShrink: 0 },
  rowBody: { flex: 1, display: "flex", flexDirection: "column", gap: 4 },
  rowTop: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  levelTag: {
    fontSize: 10, fontFamily: "'Space Mono', monospace", fontWeight: 700,
    padding: "2px 8px", borderRadius: 20, letterSpacing: "0.1em", textTransform: "uppercase",
  },
  alertType: { color: "#7a8ba0", fontSize: 11, fontFamily: "'Space Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em" },
  resolvedTag: { color: "#22c55e", fontSize: 11, fontFamily: "'Space Mono', monospace" },
  rowMsg: { color: "#c5cfe0", fontSize: 13, fontFamily: "'Space Mono', monospace" },
  rowMeta: { display: "flex", gap: 6, color: "#4a5568", fontSize: 11, fontFamily: "'Space Mono', monospace", flexWrap: "wrap" },
  resolveBtn: {
    display: "flex", alignItems: "center", gap: 5,
    background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
    borderRadius: 6, padding: "6px 12px", color: "#22c55e",
    fontFamily: "'Space Mono', monospace", fontSize: 11, cursor: "pointer",
    flexShrink: 0,
  },
};
