export default function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div style={styles.wrap}>
      <div style={styles.spinner} />
      <span style={styles.msg}>{message}</span>
    </div>
  );
}

const styles = {
  wrap: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: 12, padding: 48,
  },
  spinner: {
    width: 36, height: 36,
    border: "3px solid #1e2d45",
    borderTop: "3px solid #3b82f6",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  msg: { color: "#7a8ba0", fontSize: 13, fontFamily: "'Space Mono', monospace" },
};

// inject keyframe once
if (typeof document !== "undefined" && !document.getElementById("cs-spin-style")) {
  const s = document.createElement("style");
  s.id = "cs-spin-style";
  s.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
  document.head.appendChild(s);
}
