import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, MapPin, BarChart2, Bell, LogOut, Radio
} from "lucide-react";

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/locations",  icon: MapPin,          label: "Locations"  },
  { to: "/history",    icon: BarChart2,        label: "History"    },
  { to: "/alerts",     icon: Bell,             label: "Alerts"     },
];

export default function Sidebar() {
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("cs_token");
    navigate("/");
    window.location.reload();
  }

  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logo}>
        <Radio size={22} color="#3b82f6" />
        <span style={styles.logoText}>CrowdSense</span>
      </div>

      <nav style={styles.nav}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              ...styles.navItem,
              ...(isActive ? styles.navItemActive : {}),
            })}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <button onClick={logout} style={styles.logout}>
        <LogOut size={16} />
        <span>Logout</span>
      </button>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: 220,
    minWidth: 220,
    background: "#0d1220",
    borderRight: "1px solid #1e2d45",
    display: "flex",
    flexDirection: "column",
    padding: "20px 12px",
    gap: 4,
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px 24px",
    borderBottom: "1px solid #1e2d45",
    marginBottom: 12,
  },
  logoText: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: 16,
    letterSpacing: "0.05em",
    color: "#e8edf5",
  },
  nav: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 14px",
    borderRadius: 8,
    color: "#7a8ba0",
    fontFamily: "'Space Mono', monospace",
    fontSize: 13,
    fontWeight: 400,
    textDecoration: "none",
    transition: "all 0.15s ease",
    background: "transparent",
  },
  navItemActive: {
    background: "rgba(59,130,246,0.12)",
    color: "#3b82f6",
    borderLeft: "2px solid #3b82f6",
  },
  logout: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 14px",
    borderRadius: 8,
    background: "transparent",
    color: "#7a8ba0",
    fontSize: 13,
    fontFamily: "'Space Mono', monospace",
    marginTop: "auto",
    transition: "color 0.15s",
    border: "none",
    cursor: "pointer",
  },
};
