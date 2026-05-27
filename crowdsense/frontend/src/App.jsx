import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar.jsx";
import MobileApp from "./pages/MobileApp";
import TopBar from "./components/TopBar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Locations from "./pages/Locations.jsx";
import History from "./pages/History.jsx";
import Alerts from "./pages/Alerts.jsx";
import Login from "./pages/Login.jsx";

function ProtectedLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <TopBar />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem("cs_token"));

  useEffect(() => {
    const check = () => setAuthed(!!localStorage.getItem("cs_token"));
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, []);

  if (!authed) {
    return <Login onLogin={() => setAuthed(true)} />;
  }

  return (
    <ProtectedLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/locations" element={<Locations />} />
        <Route path="/history" element={<History />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        <Route path="/app" element={<MobileApp />} />
      </Routes>
    </ProtectedLayout>
  );
}
