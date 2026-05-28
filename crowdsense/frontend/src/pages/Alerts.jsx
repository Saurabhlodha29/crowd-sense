import { useState, useEffect } from "react";
import { getAlerts, resolveAlert } from "../api/crowdApi";
import { getCrowdConfig } from "../utils/crowdLevels";
import { formatDateTime } from "../utils/formatters";
import { Bell, CheckCircle, AlertTriangle } from "lucide-react";
import { useWebSocket } from "../hooks/useWebSocket";

export default function Alerts() {
  const [alerts, setAlerts]     = useState([]);
  const [filter, setFilter]     = useState("all");
  const [loading, setLoading]   = useState(true);
  const { latestAlert }         = useWebSocket();

  function load() {
    setLoading(true);
    getAlerts(filter)
      .then((r) => setAlerts(r.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [filter]);

  // Auto-add new alert from WebSocket
  useEffect(() => {
    if (latestAlert) {
      setAlerts((prev) => [latestAlert, ...prev]);
    }
  }, [latestAlert]);

  async function handleResolve(id) {
    try {
      await resolveAlert(id);
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, resolved: true } : a))
      );
    } catch (e) {
      console.error("Resolve failed", e);
    }
  }

  const stats = {
    active:   alerts.filter((a) => !a.resolved).length,
    resolved: alerts.filter((a) => a.resolved).length,
    total:    alerts.length,
  };

  const btnStyle = (active) => ({
    padding: "6px 16px", borderRadius: 6, fontSize: 13, cursor: "pointer",
    border: active ? "1px solid #3b82f6" : "1px solid #334155",
    background: active ? "#1e3a5f" : "#1e293b",
    color: active ? "#60a5fa" : "#94a3b8",
  });

  return (
    <div style={{ padding: 28 }}>
      {/* Filter buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ margin: 0, color: "#f1f5f9", fontSize: 18, fontWeight: 600 }}>Alerts</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "active", "resolved"].map((f) => (
            <button key={f} style={btnStyle(filter === f)} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Active", value: stats.active, icon: Bell, color: "#f87171" },
          { label: "Resolved", value: stats.resolved, icon: CheckCircle, color: "#34d399" },
          { label: "Total", value: stats.total, icon: AlertTriangle, color: "#f59e0b" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} style={{
            background: "#1e293b", borderRadius: 12, padding: "20px 28px",
            border: "1px solid #334155", flex: 1,
            display: "flex", alignItems: "center", gap: 16,
          }}>
            <Icon size={28} color={color} />
            <div>
              <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
              <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert list */}
      <div style={{
        background: "#1e293b", borderRadius: 12, border: "1px solid #334155",
        overflow: "hidden",
      }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#475569" }}>Loading alerts...</div>
        ) : alerts.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <Bell size={40} color="#334155" style={{ marginBottom: 12 }} />
            <div style={{ color: "#475569", fontFamily: "monospace" }}>No alerts found.</div>
          </div>
        ) : (
          alerts.map((alert, i) => {
            const cfg = getCrowdConfig(alert.crowdLevel);
            return (
              <div key={alert.id || i} style={{
                padding: "16px 24px",
                borderBottom: i < alerts.length - 1 ? "1px solid #0f172a" : "none",
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
                opacity: alert.resolved ? 0.6 : 1,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: alert.resolved ? "#334155" : cfg.color,
                  marginTop: 6, flexShrink: 0,
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{
                      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                      borderRadius: 12, padding: "2px 10px", fontSize: 11, fontWeight: 700,
                    }}>
                      {alert.crowdLevel}
                    </span>
                    <span style={{ fontSize: 12, color: "#64748b" }}>{alert.alertType}</span>
                    {alert.resolved && (
                      <span style={{ fontSize: 11, color: "#34d399", marginLeft: "auto" }}>✓ Resolved</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: "#e2e8f0", marginBottom: 4 }}>{alert.message}</div>
                  <div style={{ fontSize: 11, color: "#475569" }}>
                    {formatDateTime(alert.triggeredAt)} · {alert.locationId}
                  </div>
                </div>
                {!alert.resolved && (
                  <button
                    onClick={() => handleResolve(alert.id)}
                    style={{
                      background: "#0f172a", border: "1px solid #334155",
                      color: "#34d399", borderRadius: 6,
                      padding: "4px 12px", cursor: "pointer", fontSize: 12,
                    }}
                  >
                    Resolve
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}