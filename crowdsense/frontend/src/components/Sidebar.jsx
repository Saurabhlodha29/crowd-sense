import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, MapPin, History, Bell, LogOut } from "lucide-react";

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/locations", icon: MapPin,          label: "Locations" },
  { to: "/history",   icon: History,         label: "History" },
  { to: "/alerts",    icon: Bell,            label: "Alerts" },
];

export default function Sidebar() {
  const location = useLocation();

  function handleLogout() {
    localStorage.removeItem("crowdsense_token");
    window.location.href = "/login";
  }

  return (
    <aside style={{
      width: 220,
      minHeight: "100vh",
      background: "#0f172a",
      borderRight: "1px solid #1e293b",
      display: "flex",
      flexDirection: "column",
      padding: "24px 0",
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: "0 20px 32px", borderBottom: "1px solid #1e293b" }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: "#60a5fa", letterSpacing: "-0.5px" }}>
          CrowdSense
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "16px 0" }}>
        {NAV.map(({ to, icon: Icon, label }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 20px",
                color: active ? "#60a5fa" : "#94a3b8",
                background: active ? "#1e3a5f" : "transparent",
                borderLeft: active ? "3px solid #3b82f6" : "3px solid transparent",
                textDecoration: "none",
                fontSize: 14,
                fontWeight: active ? 600 : 400,
                transition: "all 0.15s",
              }}
            >
              <Icon size={17} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: "0 20px", borderTop: "1px solid #1e293b", paddingTop: 16 }}>
        <button
          onClick={handleLogout}
          style={{
            display: "flex", alignItems: "center", gap: 10,
            color: "#64748b", background: "none", border: "none",
            cursor: "pointer", fontSize: 14, padding: "8px 0",
          }}
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}