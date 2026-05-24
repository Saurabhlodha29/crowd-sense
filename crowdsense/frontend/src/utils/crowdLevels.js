export const CROWD_LEVEL_CONFIG = {
  LOW:      { color: "#22c55e", label: "Low",      bg: "#dcfce7" },
  MEDIUM:   { color: "#f59e0b", label: "Medium",   bg: "#fef3c7" },
  HIGH:     { color: "#f97316", label: "High",     bg: "#ffedd5" },
  CRITICAL: { color: "#ef4444", label: "Critical", bg: "#fee2e2" },
};

export function getCrowdConfig(level) {
  return CROWD_LEVEL_CONFIG[level] || CROWD_LEVEL_CONFIG.LOW;
}