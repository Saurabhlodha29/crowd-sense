import { useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl, StyleSheet, ActivityIndicator } from "react-native";
import crowdApi from "../api/crowdApi.js";

const LEVEL_COLORS = {
  LOW: { text: "#22c55e", bg: "rgba(34,197,94,0.1)" },
  MEDIUM: { text: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  HIGH: { text: "#f97316", bg: "rgba(249,115,22,0.1)" },
  CRITICAL: { text: "#ef4444", bg: "rgba(239,68,68,0.1)" },
};

function timeAgo(ts) {
  if (!ts) return "";
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AlertsScreen() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchAlerts(); }, []);

  async function fetchAlerts() {
    try {
      const res = await crowdApi.getAlerts();
      setAlerts(res.data || []);
    } catch { setAlerts([]); }
    finally { setLoading(false); setRefreshing(false); }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAlerts(); }} tintColor="#3b82f6" />}
    >
      <Text style={styles.section}>Active Alerts ({alerts.filter(a => !a.resolved).length})</Text>

      {alerts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyText}>No active alerts</Text>
          <Text style={styles.emptyHint}>All crowd levels are within safe limits</Text>
        </View>
      ) : (
        alerts.map((alert, i) => {
          const cfg = LEVEL_COLORS[alert.crowdLevel] || LEVEL_COLORS.LOW;
          return (
            <View key={alert.id || i} style={[styles.card, { borderLeftColor: cfg.text, opacity: alert.resolved ? 0.5 : 1 }]}>
              <View style={styles.cardTop}>
                <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.badgeText, { color: cfg.text }]}>{alert.crowdLevel}</Text>
                </View>
                {alert.resolved && <Text style={styles.resolvedTag}>✓ Resolved</Text>}
                <Text style={styles.time}>{timeAgo(alert.triggeredAt)}</Text>
              </View>
              <Text style={styles.message}>{alert.message}</Text>
              <Text style={styles.meta}>Location: {alert.locationId}</Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#0a0e1a" },
  content: { padding: 16, gap: 10 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0e1a" },
  section: { color: "#4a5568", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "monospace", marginBottom: 4 },
  card: {
    backgroundColor: "#151d2e", borderRadius: 10,
    padding: 14, borderLeftWidth: 3,
    borderWidth: 1, borderColor: "#1e2d45", gap: 6,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeText: { fontSize: 9, fontFamily: "monospace", fontWeight: "700", letterSpacing: 0.8 },
  resolvedTag: { color: "#22c55e", fontSize: 10, fontFamily: "monospace" },
  time: { color: "#4a5568", fontSize: 10, fontFamily: "monospace", marginLeft: "auto" },
  message: { color: "#c5cfe0", fontSize: 13, fontFamily: "monospace" },
  meta: { color: "#4a5568", fontSize: 11, fontFamily: "monospace" },
  empty: { alignItems: "center", padding: 48, gap: 8 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyText: { color: "#22c55e", fontSize: 14, fontWeight: "600" },
  emptyHint: { color: "#4a5568", fontSize: 12, fontFamily: "monospace", textAlign: "center" },
});
