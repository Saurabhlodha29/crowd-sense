import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function AlertModal({ visible, alert, onClose }) {
  if (!alert) return null;
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>⚠ Alert</Text>
          <Text style={styles.msg}>{alert.message}</Text>
          <TouchableOpacity style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", padding: 24 },
  modal: { backgroundColor: "#151d2e", borderRadius: 14, padding: 24, borderWidth: 1, borderColor: "#ef444440" },
  title: { color: "#ef4444", fontSize: 16, fontWeight: "700", marginBottom: 10 },
  msg: { color: "#c5cfe0", fontSize: 13, fontFamily: "monospace" },
  btn: { backgroundColor: "#1e2d45", borderRadius: 8, padding: 12, alignItems: "center", marginTop: 16 },
  btnText: { color: "#e8edf5", fontWeight: "600" },
});
