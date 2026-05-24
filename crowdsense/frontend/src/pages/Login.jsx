import { useState } from "react";
import { Radio, Eye, EyeOff } from "lucide-react";
import crowdApi from "../api/crowdApi.js";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await crowdApi.login(email, password);
      const token = res.data?.token || res.data?.accessToken || "demo-token";
      localStorage.setItem("cs_token", token);
      onLogin();
    } catch (err) {
      // Dev bypass: if backend not running, allow demo login
      if (email === "admin@crowdsense.dev" && password === "admin123") {
        localStorage.setItem("cs_token", "demo-token");
        onLogin();
      } else {
        setError(err.response?.data?.message || "Invalid credentials. Try admin@crowdsense.dev / admin123");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.bg} />
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoRow}>
          <Radio size={28} color="#3b82f6" />
          <span style={styles.logoText}>CrowdSense</span>
        </div>
        <p style={styles.sub}>Admin Dashboard</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@crowdsense.dev"
              required
              style={styles.input}
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <div style={styles.pwWrap}>
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ ...styles.input, paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                style={styles.eyeBtn}
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" disabled={loading} style={styles.btn}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p style={styles.hint}>Demo: admin@crowdsense.dev / admin123</p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
    background: "#0a0e1a", position: "relative", overflow: "hidden",
  },
  bg: {
    position: "absolute", inset: 0,
    background: "radial-gradient(ellipse at 50% 40%, rgba(59,130,246,0.08) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  card: {
    background: "#111827", border: "1px solid #1e2d45",
    borderRadius: 16, padding: "40px 36px", width: "100%", maxWidth: 380,
    display: "flex", flexDirection: "column", gap: 4,
    boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
    animation: "fade-in 0.4s ease",
    position: "relative", zIndex: 1,
  },
  logoRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 2 },
  logoText: {
    fontFamily: "'Syne', sans-serif", fontWeight: 800,
    fontSize: 22, color: "#e8edf5", letterSpacing: "0.04em",
  },
  sub: {
    color: "#4a5568", fontFamily: "'Space Mono', monospace",
    fontSize: 12, marginBottom: 24,
  },
  form: { display: "flex", flexDirection: "column", gap: 16 },
  field: { display: "flex", flexDirection: "column", gap: 6 },
  label: {
    fontFamily: "'Space Mono', monospace", fontSize: 11,
    color: "#7a8ba0", letterSpacing: "0.08em", textTransform: "uppercase",
  },
  input: {
    background: "#0d1220", border: "1px solid #1e2d45",
    borderRadius: 8, padding: "10px 14px", color: "#e8edf5",
    fontFamily: "'Space Mono', monospace", fontSize: 13,
    outline: "none", width: "100%", transition: "border-color 0.15s",
  },
  pwWrap: { position: "relative" },
  eyeBtn: {
    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
    background: "transparent", border: "none", color: "#4a5568", cursor: "pointer",
  },
  error: {
    background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)",
    borderRadius: 6, padding: "8px 12px",
    color: "#ef4444", fontSize: 12, fontFamily: "'Space Mono', monospace",
  },
  btn: {
    background: "#3b82f6", color: "#fff",
    fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 14,
    padding: "12px 0", borderRadius: 8,
    border: "none", cursor: "pointer", marginTop: 4,
    transition: "background 0.15s",
  },
  hint: {
    marginTop: 16, textAlign: "center",
    color: "#4a5568", fontSize: 11, fontFamily: "'Space Mono', monospace",
  },
};
