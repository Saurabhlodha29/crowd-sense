// frontend/src/utils/crowdLevels.js

export const CROWD_LEVEL_CONFIG = {
  LOW:      { color: "#22c55e", label: "Low",      bg: "#dcfce7", dot: "#16a34a", ring: "#bbf7d0" },
  MEDIUM:   { color: "#f59e0b", label: "Medium",   bg: "#fef3c7", dot: "#d97706", ring: "#fde68a" },
  HIGH:     { color: "#f97316", label: "High",     bg: "#ffedd5", dot: "#ea580c", ring: "#fed7aa" },
  CRITICAL: { color: "#ef4444", label: "Critical", bg: "#fee2e2", dot: "#dc2626", ring: "#fecaca" },
  UNKNOWN:  { color: "#9ca3af", label: "Unknown",  bg: "#f3f4f6", dot: "#6b7280", ring: "#e5e7eb" },
};

export function getCrowdConfig(level) {
  return CROWD_LEVEL_CONFIG[level] || CROWD_LEVEL_CONFIG.UNKNOWN;
}

export function capacityPercent(personCount, maxCapacity) {
  if (!maxCapacity || maxCapacity <= 0) return 0;
  return Math.min(100, Math.round((personCount / maxCapacity) * 100));
}