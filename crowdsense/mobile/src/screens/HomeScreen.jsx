import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  RefreshControl, StyleSheet, ActivityIndicator,
} from "react-native";
import crowdApi from "../api/crowdApi.js";

const LEVEL_COLORS = {
  LOW:      { bg: "rgba(34,197,94,0.12)",  text: "#22c55e", border: "#22c55e" },
  MEDIUM:   { bg: "rgba(245,158,11,0.12)", text: "#f59e0b", border: "#f59e0b" },
  HIGH:     { bg: "rgba(249,115,22,0.12)", text: "#f97316", border: "#f97316" },
  CRITICAL: { bg: "rgba(239,68,68,0.12)",  text: "#ef4444", border: "#ef4444" },
};

export default function HomeScreen() {
  const [readings, setReadings] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [backendOk, setBackendOk] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [readRes, locRes] = await Promise.all([
        crowdApi.getLatestReadings(),
        crowdApi.getLocations(),
      ]);
      setReadings(readRes.data || []);
      setLocations(locRes.data || []);
      setBackendOk(true);
    } catch {
      setBackendOk(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const locMap = Object.fromEntries(locations.map((l) => [l.id, l]));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3b82f6" size="large" />
        <Text style={styles.loadingText}>Loading crowd data…</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
    >
      {/* Status bar */}
      <View style={[styles.statusBar, { backgroundColor: backendOk ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)" }]}>
        <Text style={[styles.statusDot, { color: backendOk ? "#22c55e" : "#ef4444" }]}>●</Text>
        <Text style={[styles.statusText, { color: backendOk ? "#22c55e" : "#ef4444" }]}>
          {backendOk ? "Backend Connected" : "Backend Offline — check your IP in .env"}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Live Crowd Status</Text>

      {readings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No readings yet.</Text>
          <Text style={styles.emptyHint}>Start the Python sensor agent to see live data.</Text>
        </View>
      ) : (
        readings.map((r) => {
          const loc = locMap[r.locationId];
          const level = r.crowdLevel || "LOW";
          const cfg = LEVEL_COLORS[level] || LEVEL_COLORS.LOW;
          return (
            <View key={r.id || r.locationId} style={[styles.card, { borderLeftColor: cfg.border }]}>
              <View style={styles.cardTop}>
                <Text style={styles.locName}>{loc?.name || r.locationId}</Text>
                <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.badgeText, { color: cfg.text }]}>{level}</Text>
                </View>
              </View>
              <Text style={[styles.count, { color: cfg.text }]}>{r.personCount}</Text>
              <Text style={styles.unit}>people detected</Text>
              {r.confidence && (
                <Text style={styles.meta}>Confidence: {(r.confidence * 100).toFixed(0)}%</Text>
              )}
            </View>
          );
        })
      )}

      {/* Safety tip */}
      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>🛡 Safety Guide</Text>
        <View style={styles.tipRow}><Text style={[styles.tipDot, { color: "#22c55e" }]}>●</Text><Text style={styles.tipText}>LOW — Safe to proceed normally</Text></View>
        <View style={styles.tipRow}><Text style={[styles.tipDot, { color: "#f59e0b" }]}>●</Text><Text style={styles.tipText}>MEDIUM — Moderate, stay aware</Text></View>
        <View style={styles.tipRow}><Text style={[styles.tipDot, { color: "#f97316" }]}>●</Text><Text style={styles.tipText}>HIGH — Consider alternate route</Text></View>
        <View style={styles.tipRow}><Text style={[styles.tipDot, { color: "#ef4444" }]}>●</Text><Text style={styles.tipText}>CRITICAL — Avoid this area now</Text></View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#0a0e1a" },
  content: { padding: 16, gap: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0e1a", gap: 12 },
  loadingText: { color: "#7a8ba0", fontFamily: "monospace", fontSize: 13 },
  statusBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 10, borderRadius: 8, marginBottom: 4,
  },
  statusDot: { fontSize: 10 },
  statusText: { fontSize: 12, fontFamily: "monospace" },
  sectionTitle: {
    color: "#7a8ba0", fontSize: 11, letterSpacing: 1.5,
    textTransform: "uppercase", fontFamily: "monospace",
    marginTop: 4, marginBottom: 4,
  },
  card: {
    backgroundColor: "#151d2e", borderRadius: 12,
    padding: 16, borderLeftWidth: 3,
    borderWidth: 1, borderColor: "#1e2d45",
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  locName: { color: "#c5cfe0", fontSize: 15, fontWeight: "600", flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, fontFamily: "monospace", fontWeight: "700", letterSpacing: 0.8 },
  count: { fontSize: 36, fontWeight: "700", fontFamily: "monospace", lineHeight: 40 },
  unit: { color: "#7a8ba0", fontSize: 12, fontFamily: "monospace" },
  meta: { color: "#4a5568", fontSize: 11, fontFamily: "monospace", marginTop: 4 },
  empty: { alignItems: "center", padding: 32, gap: 8 },
  emptyText: { color: "#4a5568", fontSize: 14, fontFamily: "monospace" },
  emptyHint: { color: "#2a3f5f", fontSize: 12, fontFamily: "monospace", textAlign: "center" },
  tipCard: {
    backgroundColor: "#111827", borderRadius: 12,
    padding: 16, borderWidth: 1, borderColor: "#1e2d45",
    marginTop: 8, gap: 8,
  },
  tipTitle: { color: "#c5cfe0", fontSize: 13, fontWeight: "600", marginBottom: 4 },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tipDot: { fontSize: 10 },
  tipText: { color: "#7a8ba0", fontSize: 12, fontFamily: "monospace" },
});
