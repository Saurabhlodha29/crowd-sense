import { useLocation } from "react-router-dom";
import { Wifi, WifiOff } from "lucide-react";
import { useWebSocket } from "../hooks/useWebSocket.js";
import { formatDateTime } from "../utils/formatters.js";

const PAGE_TITLES = {
  "/dashboard": "Live Dashboard",
  "/locations": "Locations",
  "/history":   "Historical Data",
  "/alerts":    "Alerts",
};

export default function TopBar() {
  const { pathname } = useLocation();
  const { connected, lastHeartbeat } = useWebSocket();
  const title = PAGE_TITLES[pathname] || "CrowdSense";

  return (
    <header style={styles.bar}>
      <h1 style={styles.title}>{title}</h1>
      <div style={styles.right}>
        <div style={{ ...styles.wsStatus, color: connected ? "#22c55e" : "#ef4444" }}>
          {connected
            ? <><Wifi size={14} /> <span>Live</span></>
            : <><WifiOff size={14} /> <span>Offline</span></>}
        </div>
        {lastHeartbeat && (
          <span style={styles.ts}>Updated {formatDateTime(lastHeartbeat)}</span>
        )}
      </div>
    </header>
  );
}

const styles = {
  bar: {
    height: 58,
    background: "#0d1220",
    borderBottom: "1px solid #1e2d45",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    flexShrink: 0,
  },
  title: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: 18,
    color: "#e8edf5",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  wsStatus: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    fontSize: 13,
    fontFamily: "'Space Mono', monospace",
  },
  ts: {
    fontSize: 12,
    color: "#4a5568",
    fontFamily: "'Space Mono', monospace",
  },
};
