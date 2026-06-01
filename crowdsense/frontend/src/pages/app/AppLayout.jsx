// frontend/src/pages/app/AppLayout.jsx
import { Outlet, useNavigate, useLocation } from "react-router-dom";

export default function AppLayout() {
  const navigate = useNavigate();
  const loc      = useLocation();

  const tabs = [
    { path: "/app",       label: "Events",  icon: "🎪" },
    { path: "/login",     label: "Sign in", icon: "👤" },
  ];

  return (
    <div style={styles.shell}>
      <div style={styles.content}>
        <Outlet />
      </div>
      <nav style={styles.nav}>
        {tabs.map((t) => {
          const active = loc.pathname === t.path || loc.pathname.startsWith(t.path + "/");
          return (
            <button
              key={t.path}
              style={{ ...styles.navBtn, ...(active ? styles.navBtnActive : {}) }}
              onClick={() => navigate(t.path)}
            >
              <span style={styles.navIcon}>{t.icon}</span>
              <span style={styles.navLabel}>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

const styles = {
  shell:       { display: "flex", flexDirection: "column", height: "100vh", maxWidth: 430, margin: "0 auto", position: "relative", overflow: "hidden" },
  content:     { flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" },
  nav:         { display: "flex", background: "#1e293b", borderTop: "1px solid #334155", padding: "8px 0 env(safe-area-inset-bottom,8px)" },
  navBtn:      { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "transparent", border: "none", cursor: "pointer", padding: "6px 0" },
  navBtnActive:{ "& span": { color: "#6366f1" } },
  navIcon:     { fontSize: 20 },
  navLabel:    { color: "#64748b", fontSize: 10 },
};