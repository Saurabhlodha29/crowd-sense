import { getCrowdConfig } from "../utils/crowdLevels";
import { timeAgo } from "../utils/formatters";

export default function CrowdLevelCard({ locationName, personCount, crowdLevel, capturedAt }) {
  const cfg = getCrowdConfig(crowdLevel);

  return (
    <div style={{
      background: "#1e293b",
      border: `1px solid ${cfg.border}`,
      borderRadius: 12,
      padding: "20px 24px",
      minWidth: 200,
    }}>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: 1 }}>
        {locationName || "Location"}
      </div>
      <div style={{ fontSize: 40, fontWeight: 700, color: cfg.color, lineHeight: 1.1 }}>
        {personCount ?? "—"}
      </div>
      <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>people detected</div>
      <div style={{
        display: "inline-block",
        marginTop: 10,
        padding: "3px 10px",
        borderRadius: 20,
        background: cfg.bg,
        color: cfg.color,
        fontSize: 12,
        fontWeight: 600,
        border: `1px solid ${cfg.border}`,
      }}>
        {cfg.label}
      </div>
      <div style={{ fontSize: 11, color: "#475569", marginTop: 8 }}>
        {timeAgo(capturedAt)}
      </div>
    </div>
  );
}