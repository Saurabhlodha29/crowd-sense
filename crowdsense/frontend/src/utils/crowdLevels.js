export const CROWD_LEVEL_CONFIG = {
  LOW:      { color: "#22c55e", label: "Low",      bg: "#052e16", border: "#16a34a" },
  MEDIUM:   { color: "#f59e0b", label: "Medium",   bg: "#451a03", border: "#d97706" },
  HIGH:     { color: "#f97316", label: "High",     bg: "#431407", border: "#ea580c" },
  CRITICAL: { color: "#ef4444", label: "Critical", bg: "#450a0a", border: "#dc2626" },
};

export function getCrowdConfig(level) {
  return CROWD_LEVEL_CONFIG[level?.toUpperCase()] || CROWD_LEVEL_CONFIG.LOW;
}

export function getLevelFromCount(count) {
  if (count < 10) return "LOW";
  if (count < 25) return "MEDIUM";
  if (count < 50) return "HIGH";
  return "CRITICAL";
}