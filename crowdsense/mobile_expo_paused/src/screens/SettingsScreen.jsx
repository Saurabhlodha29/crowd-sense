import { useState } from "react";
import { View, Text, TextInput, Switch, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SettingsScreen() {
  const [backendUrl, setBackendUrl] = useState(process.env.EXPO_PUBLIC_BACKEND_URL || "http://10.0.2.2:8080");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [alertOnHigh, setAlertOnHigh] = useState(true);
  const [alertOnCritical, setAlertOnCritical] = useState(true);

  function saveSettings() {
    Alert.alert("Saved", "Settings saved. Restart the app to apply backend URL changes.");
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Backend</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Backend URL</Text>
        <TextInput
          value={backendUrl}
          onChangeText={setBackendUrl}
          style={styles.input}
          placeholder="http://192.168.x.x:8080"
          placeholderTextColor="#4a5568"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.hint}>
          Use your laptop's local IP on your WiFi network.{"\n"}
          Android emulator: use 10.0.2.2 instead of localhost.
        </Text>
      </View>

      <Text style={styles.section}>Notifications</Text>
      <View style={styles.card}>
        <SettingRow label="Enable Notifications" value={notificationsEnabled} onToggle={setNotificationsEnabled} />
        <SettingRow label="Alert on HIGH level" value={alertOnHigh} onToggle={setAlertOnHigh} />
        <SettingRow label="Alert on CRITICAL level" value={alertOnCritical} onToggle={setAlertOnCritical} />
      </View>

      <Text style={styles.section}>About</Text>
      <View style={styles.card}>
        <InfoRow label="Version" value="1.0.0" />
        <InfoRow label="Project" value="CrowdSense" />
        <InfoRow label="Stack" value="Expo + Spring Boot + Supabase" />
        <InfoRow label="AI Model" value="YOLOv8 (edge)" />
      </View>

      <TouchableOpacity style={styles.saveBtn} onPress={saveSettings}>
        <Text style={styles.saveBtnText}>Save Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function SettingRow({ label, value, onToggle }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onToggle} trackColor={{ true: "#3b82f6", false: "#1e2d45" }} thumbColor="#e8edf5" />
    </View>
  );
}

function InfoRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: "#0a0e1a" },
  content: { padding: 16, gap: 10 },
  section: { color: "#4a5568", fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "monospace", marginTop: 8 },
  card: {
    backgroundColor: "#151d2e", borderRadius: 12,
    padding: 16, borderWidth: 1, borderColor: "#1e2d45", gap: 12,
  },
  label: { color: "#7a8ba0", fontSize: 11, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 },
  input: {
    backgroundColor: "#0d1220", borderWidth: 1, borderColor: "#1e2d45",
    borderRadius: 8, padding: 10, color: "#e8edf5",
    fontFamily: "monospace", fontSize: 13,
  },
  hint: { color: "#4a5568", fontSize: 11, fontFamily: "monospace", lineHeight: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { color: "#c5cfe0", fontSize: 13 },
  rowValue: { color: "#7a8ba0", fontSize: 12, fontFamily: "monospace" },
  saveBtn: {
    backgroundColor: "#3b82f6", borderRadius: 10,
    padding: 14, alignItems: "center", marginTop: 8,
  },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
