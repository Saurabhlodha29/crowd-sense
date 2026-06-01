// frontend/src/pages/dashboard/DashboardLayout.jsx
import { Outlet, NavLink, useNavigate } from "react-router-dom";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const email    = localStorage.getItem("cs_email") || "Organiser";

  function logout() {
    localStorage.clear();
    navigate("/login");
  }

  const links = [
    { to: "/dashboard",          label: "Overview",  icon: "📊", end: true },
    { to: "/dashboard/events",   label: "Events",    icon: "🎪" },
    { to: "/dashboard/alerts",   label: "Alerts",    icon: "🚨" },
    { to: "/dashboard/analytics",label: "Analytics", icon: "📈" },
  ];

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}>🌊</span>
          <span style={styles.logoText}>CrowdSense</span>
        </div>

        <nav style={styles.nav}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              style={({ isActive }) => ({
                ...styles.navLink,
                ...(isActive ? styles.navLinkActive : {}),
              })}
            >
              <span style={styles.navIcon}>{l.icon}</span>
              {l.label}
            </NavLink>
          ))}
        </nav>

        <div style={styles.sidebarFooter}>
          <div style={styles.userInfo}>
            <div style={styles.userAvatar}>{email[0].toUpperCase()}</div>
            <div style={styles.userEmail}>{email}</div>
          </div>
          <button style={styles.logoutBtn} onClick={logout}>Sign out</button>
        </div>
      </aside>

      {/* Main content */}
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles = {
  shell:          { display: "flex", height: "100vh", background: "#0f172a", color: "#f1f5f9" },
  sidebar:        { width: 220, background: "#1e293b", display: "flex", flexDirection: "column", borderRight: "1px solid #334155", flexShrink: 0 },
  logo:           { display: "flex", alignItems: "center", gap: 10, padding: "24px 20px 20px" },
  logoIcon:       { fontSize: 22 },
  logoText:       { color: "#f1f5f9", fontSize: 18, fontWeight: 800 },
  nav:            { flex: 1, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 2 },
  navLink:        { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, color: "#94a3b8", textDecoration: "none", fontSize: 14, fontWeight: 500, transition: "all 0.15s" },
  navLinkActive:  { background: "#312e81", color: "#c7d2fe" },
  navIcon:        { fontSize: 16, width: 20, textAlign: "center" },
  sidebarFooter:  { padding: 16, borderTop: "1px solid #334155" },
  userInfo:       { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  userAvatar:     { width: 32, height: 32, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 13, fontWeight: 700 },
  userEmail:      { color: "#94a3b8", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 },
  logoutBtn:      { width: "100%", background: "transparent", border: "1px solid #334155", borderRadius: 6, padding: "6px 0", color: "#64748b", fontSize: 12, cursor: "pointer" },
  main:           { flex: 1, overflow: "auto", display: "flex", flexDirection: "column" },
};