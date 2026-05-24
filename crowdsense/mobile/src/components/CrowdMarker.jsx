import { View, StyleSheet } from "react-native";

const COLORS = { LOW: "#22c55e", MEDIUM: "#f59e0b", HIGH: "#f97316", CRITICAL: "#ef4444" };

export default function CrowdMarker({ level = "LOW" }) {
  const color = COLORS[level] || COLORS.LOW;
  return <View style={[styles.dot, { backgroundColor: color, shadowColor: color }]} />;
}

const styles = StyleSheet.create({
  dot: {
    width: 14, height: 14, borderRadius: 7,
    borderWidth: 2, borderColor: "#0a0e1a",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 6, shadowOpacity: 0.9, elevation: 5,
  },
});
