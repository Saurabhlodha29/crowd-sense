// frontend/src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/crowdApi";

export default function Login() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [tab,      setTab]      = useState("organizer"); // "organizer" | "attendee"
  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await login(email, password);
      localStorage.setItem("cs_token", data.token);
      localStorage.setItem("cs_role",  data.role);
      localStorage.setItem("cs_email", data.email);

      if (["ORGANIZER","ADMIN"].includes(data.role)) {
        navigate("/dashboard");
      } else {
        navigate("/app");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  function continueAsGuest() {
    navigate("/app");
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoRow}>
          <span style={styles.logoIcon}>🌊</span>
          <span style={styles.logoText}>CrowdSense</span>
        </div>
        <p style={styles.tagline}>Real-time crowd intelligence</p>

        {/* Tabs */}
        <div style={styles.tabRow}>
          <button
            style={{ ...styles.tab, ...(tab === "organizer" ? styles.tabActive : {}) }}
            onClick={() => setTab("organizer")}
          >
            Event Organiser
          </button>
          <button
            style={{ ...styles.tab, ...(tab === "attendee" ? styles.tabActive : {}) }}
            onClick={() => setTab("attendee")}
          >
            Attendee
          </button>
        </div>

        {tab === "organizer" ? (
          <form onSubmit={handleLogin} style={styles.form}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="organizer@demo.com"
              required
            />
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            {error && <div style={styles.error}>{error}</div>}
            <button style={styles.btn} type="submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign in as Organiser"}
            </button>
            <p style={styles.hint}>Demo: organizer@demo.com / demo1234</p>
          </form>
        ) : (
          <div style={styles.form}>
            <p style={styles.guestText}>
              Browse events and get crowd-aware routing without an account.
            </p>
            <button style={styles.btn} onClick={continueAsGuest}>
              Continue as Guest →
            </button>
            <div style={styles.divider}>or</div>
            <form onSubmit={handleLogin}>
              <label style={styles.label}>Email (optional)</label>
              <input
                style={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
              <label style={styles.label}>Password</label>
              <input
                style={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              {error && <div style={styles.error}>{error}</div>}
              <button style={{ ...styles.btn, background: "#374151" }} type="submit">
                Sign in
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container:  { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0f172a" },
  card:       { background: "#1e293b", borderRadius: 16, padding: "40px 36px", width: 380, boxShadow: "0 25px 50px rgba(0,0,0,0.5)" },
  logoRow:    { display: "flex", alignItems: "center", gap: 10, marginBottom: 4 },
  logoIcon:   { fontSize: 28 },
  logoText:   { color: "#f1f5f9", fontSize: 24, fontWeight: 700 },
  tagline:    { color: "#94a3b8", fontSize: 13, marginBottom: 24 },
  tabRow:     { display: "flex", background: "#0f172a", borderRadius: 8, marginBottom: 24, padding: 4 },
  tab:        { flex: 1, padding: "8px 0", border: "none", borderRadius: 6, background: "transparent", color: "#94a3b8", cursor: "pointer", fontSize: 13, fontWeight: 500 },
  tabActive:  { background: "#6366f1", color: "#fff" },
  form:       { display: "flex", flexDirection: "column", gap: 12 },
  label:      { color: "#cbd5e1", fontSize: 12, fontWeight: 500, marginBottom: -8 },
  input:      { background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", color: "#f1f5f9", fontSize: 14, outline: "none" },
  error:      { background: "#450a0a", border: "1px solid #ef4444", borderRadius: 6, padding: "8px 12px", color: "#fca5a5", fontSize: 13 },
  btn:        { background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "12px", fontSize: 14, fontWeight: 600, cursor: "pointer", marginTop: 4 },
  hint:       { color: "#475569", fontSize: 11, textAlign: "center", margin: 0 },
  guestText:  { color: "#94a3b8", fontSize: 13, lineHeight: 1.6, textAlign: "center" },
  divider:    { color: "#475569", textAlign: "center", fontSize: 12, margin: "4px 0" },
};