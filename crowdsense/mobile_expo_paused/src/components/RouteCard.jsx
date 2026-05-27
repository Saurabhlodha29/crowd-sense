import { View, Text, StyleSheet } from "react-native";

export default function RouteCard({ route }) {
  return (
    <View style={styles.card}>
      <Text style={styles.name}>{route.name}</Text>
      <Text style={styles.status}>{route.status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#151d2e", borderRadius: 10,
    padding: 14, borderWidth: 1, borderColor: "#1e2d45",
  },
  name: { color: "#e8edf5", fontSize: 14 },
  status: { color: "#7a8ba0", fontSize: 12, fontFamily: "monospace" },
});
