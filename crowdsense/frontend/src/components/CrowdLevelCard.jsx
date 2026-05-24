import { getCrowdConfig } from "../utils/crowdLevels.js";
import { timeAgo } from "../utils/formatters.js";
import { Users, MapPin } from "lucide-react";

export default function CrowdLevelCard({ locationName, reading }) {
  if (!reading) {
    return (
      <div style={styles.card}>
        <div style={styles.header}>
          <MapPin size={14} color="#4a5568" />
          <span style={styles.locName}>{locationName || "Unknown"}</span>
        </div>
        <div style={styles.noData}>No data yet</div>
      </div>
    );
  }

  const { color, label, bg } = getCrowdConfig(reading.crowdLevel);

  return (
    <div style={{ ...styles.card, borderLeft: `3px solid ${color}` }}>
      <div style={styles.header}>
        <MapPin size={14} color={color} />
        <span style={styles.locName}>{locationName}</span>
        <span style={{ ...styles.badge, background: bg, color }}>
          {label}
        </span>
      </div>
      <div style={styles.countRow}>
        <Users size={18} color={color} />
        <span style={{ ...styles.count, color }}>{reading.personCount}</span>
        <span style={styles.people}>people</span>
      </div>
      {reading.confidence && (
        <div style={styles.conf}>conf: {(reading.confidence * 100).toFixed(0)}%</div>
      )}
      <div style={styles.time}>{timeAgo(reading.capturedAt)}</div>
    </div>
  );
}

const styles = {
  card: {
    background: "#151d2e",
    border: "1px solid #1e2d45",
    borderRadius: 12,
    padding: "16px 18px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    transition: "border-color 0.18s",
    cursor: "default",
  },
  header: {
    display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
  },
  locName: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 600,
    fontSize: 14,
    color: "#c5cfe0",
    flex: 1,
  },
  badge: {
    fontSize: 10,
    fontFamily: "'Space Mono', monospace",
    fontWeight: 700,
    letterSpacing: "0.08em",
    padding: "2px 8px",
    borderRadius: 20,
    textTransform: "uppercase",
  },
  countRow: {
    display: "flex", alignItems: "baseline", gap: 8,
  },
  count: {
    fontFamily: "'Space Mono', monospace",
    fontSize: 32,
    fontWeight: 700,
    lineHeight: 1,
  },
  people: {
    color: "#7a8ba0", fontSize: 12,
  },
  conf: {
    fontSize: 11,
    color: "#4a5568",
    fontFamily: "'Space Mono', monospace",
  },
  time: {
    fontSize: 11,
    color: "#4a5568",
    fontFamily: "'Space Mono', monospace",
  },
};
