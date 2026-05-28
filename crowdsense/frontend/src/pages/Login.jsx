import { useState } from "react";
import { login } from "../api/crowdApi";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email,    setEmail]    = useState("admin@crowdsense.dev");
  const [password, setPassword] = useState("admin123");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(email, password);
      localStorage.setItem("crowdsense_token", res.data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.error || "Login failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%", background: "#1e293b", border: "1px solid #334155",
    color: "#f1f5f9", borderRadius: 8, padding: "11px 14px",
    fontSize: 14, boxSizing: "border-box", outline: "none",
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#0f172a",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "#1e293b", border: "1px solid #334155",
        borderRadius: 16, padding: "40px 36px", width: 380, maxWidth: "90vw",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "#60a5fa", marginBottom: 6 }}>CrowdSense</div>
          <div style={{ fontSize: 14, color: "#64748b" }}>Admin Dashboard</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              required
              autoFocus
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          {error && (
            <div style={{
              background: "#450a0a", border: "1px solid #dc2626",
              borderRadius: 8, padding: "10px 14px",
              color: "#f87171", fontSize: 13, marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", background: "#3b82f6", color: "#fff",
              border: "none", borderRadius: 8, padding: "12px",
              fontSize: 15, fontWeight: 600, cursor: "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: "center", fontSize: 12, color: "#475569" }}>
          Default: admin@crowdsense.dev / admin123
        </div>
      </div>
    </div>
  );
}