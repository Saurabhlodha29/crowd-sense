import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import crowdApi from "../api/crowdApi.js";

const LEVEL_COLORS = {
  LOW: "#22c55e", MEDIUM: "#f59e0b", HIGH: "#f97316", CRITICAL: "#ef4444",
};

export default function MapScreen() {
  const [locations, setLocations] = useState([]);
  const [readings, setReadings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    try {
      const [locRes, readRes] = await Promise.all([
        crowdApi.getLocations(),
        crowdApi.getLatestReadings(),
      ]);
      setLocations(locRes.data || []);
      const byLoc = {};
      (readRes.data || []).forEach((r) => { byLoc[r.locationId] = r; });
      setReadings(byLoc);
    } catch {}
    finally { setLoading(false); }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#3b82f6" size="large" />
        <Text style={styles.loadingText}>Loading map…</Text>
      </View>
    );
  }

  const initialRegion = locations.length
    ? { latitude: locations[0].latitude, longitude: locations[0].longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : { latitude: 28.6139, longitude: 77.209, latitudeDelta: 0.1, longitudeDelta: 0.1 };

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        userInterfaceStyle="dark"
      >
        {locations.map((loc) => {
          const r = readings[loc.id];
          const level = r?.crowdLevel || "LOW";
          const color = LEVEL_COLORS[level];
          return (
            <Marker
              key={loc.id}
              coordinate={{ latitude: loc.latitude, longitude: loc.longitude }}
              pinColor={color}
            >
              <View style={[styles.markerDot, { backgroundColor: color, shadowColor: color }]} />
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{loc.name}</Text>
                  <Text style={[styles.calloutLevel, { color }]}>{level}</Text>
                  <Text style={styles.calloutCount}>{r?.personCount ?? "—"} people</Text>
                  {loc.maxCapacity && (
                    <Text style={styles.calloutMeta}>Capacity: {loc.maxCapacity}</Text>
                  )}
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>

      {/* Legend overlay */}
      <View style={styles.legend}>
        {Object.entries(LEVEL_COLORS).map(([lvl, col]) => (
          <View key={lvl} style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: col }]} />
            <Text style={styles.legendText}>{lvl}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.refreshBtn} onPress={fetchData}>
        <Text style={styles.refreshText}>↻ Refresh</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0a0e1a", gap: 12 },
  loadingText: { color: "#7a8ba0", fontFamily: "monospace", fontSize: 13 },
  markerDot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 2, borderColor: "#0a0e1a",
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 6, shadowOpacity: 0.8,
    elevation: 5,
  },
  callout: { padding: 8, minWidth: 120 },
  calloutTitle: { fontWeight: "700", fontSize: 13, marginBottom: 2 },
  calloutLevel: { fontSize: 11, fontFamily: "monospace", fontWeight: "700" },
  calloutCount: { fontSize: 13, marginTop: 2 },
  calloutMeta: { fontSize: 11, color: "#666", marginTop: 2 },
  legend: {
    position: "absolute", top: 12, right: 12,
    backgroundColor: "rgba(10,14,26,0.85)",
    borderRadius: 8, padding: 10, gap: 5,
    borderWidth: 1, borderColor: "#1e2d45",
  },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: "#c5cfe0", fontSize: 10, fontFamily: "monospace" },
  refreshBtn: {
    position: "absolute", bottom: 24, alignSelf: "center",
    backgroundColor: "#111827", borderWidth: 1, borderColor: "#1e2d45",
    borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10,
  },
  refreshText: { color: "#7a8ba0", fontFamily: "monospace", fontSize: 13 },
});
