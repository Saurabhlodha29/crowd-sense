import { AlertTriangle, X, CheckCircle } from "lucide-react";
import { getCrowdConfig } from "../utils/crowdLevels.js";
import { timeAgo } from "../utils/formatters.js";
import crowdApi from "../api/crowdApi.js";
import { useState } from "react";

export default function AlertBanner({ alerts = [], onResolved }) {
  const [resolving, setResolving] = useState(null);
  const active = alerts.filter((a) => !a.resolved).slice(0, 3);

  if (!active.length) return null;

  async function handleResolve(id) {
    setResolving(id);
    try {
      await crowdApi.resolveAlert(id);
      onResolved && onResolved(id);
    } catch (e) {
      console.error("Resolve failed", e);
    } finally {
      setResolving(null);
    }
  }

  return (
    <div style={styles.wrap}>
      {active.map((alert) => {
        const { color, bg } = getCrowdConfig(alert.crowdLevel);
        return (
          <div key={alert.id} style={{ ...styles.banner, background: bg, borderLeft: `3px solid ${color}` }}>
            <AlertTriangle size={15} color={color} style={{ flexShrink: 0 }} />
            <div style={styles.body}>
              <span style={{ ...styles.level, color }}>{alert.crowdLevel}</span>
              <span style={styles.msg}>{alert.message}</span>
              <span style={styles.time}>{timeAgo(alert.triggeredAt)}</span>
            </div>
            <button
              onClick={() => handleResolve(alert.id)}
              disabled={resolving === alert.id}
              style={{ ...styles.resolveBtn, opacity: resolving === alert.id ? 0.5 : 1 }}
              title="Mark resolved"
            >
              <CheckCircle size={15} color={color} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  wrap: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 },
  banner: {
    display: "flex", alignItems: "flex-start", gap: 10,
    padding: "10px 14px", borderRadius: 8,
    animation: "fade-in 0.3s ease",
  },
  body: { flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  level: {
    fontFamily: "'Space Mono', monospace", fontWeight: 700,
    fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase",
  },
  msg: { color: "#c5cfe0", fontSize: 13, fontFamily: "'Space Mono', monospace" },
  time: { color: "#7a8ba0", fontSize: 11, fontFamily: "'Space Mono', monospace" },
  resolveBtn: {
    background: "transparent", border: "none", cursor: "pointer",
    padding: 4, borderRadius: 4, display: "flex", alignItems: "center",
  },
};
