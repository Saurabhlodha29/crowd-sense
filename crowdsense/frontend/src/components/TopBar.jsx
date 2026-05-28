import { useWebSocket } from "../hooks/useWebSocket";

export default function TopBar({ title }) {
  const { connected } = useWebSocket();

  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "16px 28px",
      borderBottom: "1px solid #1e293b",
      background: "#0f172a",
    }}>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: "#f1f5f9" }}>
        {title}
      </h1>
      <div style={{
        display: "flex", alignItems: "center", gap: 7,
        fontSize: 13, color: connected ? "#22c55e" : "#94a3b8",
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: "50%",
          background: connected ? "#22c55e" : "#475569",
          boxShadow: connected ? "0 0 6px #22c55e" : "none",
        }} />
        {connected ? "Live" : "Connecting..."}
      </div>
    </header>
  );
}