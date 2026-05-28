import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { getCrowdConfig } from "../utils/crowdLevels";

export default function AlertBanner({ alert }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (alert) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 8000);
      return () => clearTimeout(t);
    }
  }, [alert]);

  if (!visible || !alert) return null;

  const cfg = getCrowdConfig(alert.crowdLevel);

  return (
    <div style={{
      position: "fixed",
      top: 20,
      right: 20,
      zIndex: 9999,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 10,
      padding: "14px 20px",
      maxWidth: 380,
      display: "flex",
      alignItems: "flex-start",
      gap: 12,
      boxShadow: `0 4px 24px ${cfg.color}33`,
      animation: "slideIn 0.3s ease",
    }}>
      <AlertTriangle size={20} color={cfg.color} style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: cfg.color, marginBottom: 4 }}>
          {alert.crowdLevel} ALERT
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>{alert.message}</div>
      </div>
      <button
        onClick={() => setVisible(false)}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", padding: 0 }}
      >
        <X size={16} />
      </button>
    </div>
  );
}