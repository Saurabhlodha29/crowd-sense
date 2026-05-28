import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import TopBar  from "./components/TopBar";
import Dashboard  from "./pages/Dashboard";
import Locations  from "./pages/Locations";
import History    from "./pages/History";
import Alerts     from "./pages/Alerts";
import Login      from "./pages/Login";
import MobileApp  from "./pages/MobileApp";

const PAGE_TITLES = {
  "/dashboard": "Live Dashboard",
  "/locations": "Locations",
  "/history":   "Historical Data",
  "/alerts":    "Alerts",
};

function RequireAuth({ children }) {
  const token = localStorage.getItem("crowdsense_token");
  const location = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function AdminLayout({ children }) {
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || "CrowdSense";
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0f172a", color: "#f1f5f9" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopBar title={title} />
        <main style={{ flex: 1, overflow: "auto" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/app"   element={<MobileApp />} />
        <Route path="/"      element={<Navigate to="/dashboard" replace />} />

        {/* Protected admin routes */}
        <Route path="/dashboard" element={
          <RequireAuth>
            <AdminLayout><Dashboard /></AdminLayout>
          </RequireAuth>
        } />
        <Route path="/locations" element={
          <RequireAuth>
            <AdminLayout><Locations /></AdminLayout>
          </RequireAuth>
        } />
        <Route path="/history" element={
          <RequireAuth>
            <AdminLayout><History /></AdminLayout>
          </RequireAuth>
        } />
        <Route path="/alerts" element={
          <RequireAuth>
            <AdminLayout><Alerts /></AdminLayout>
          </RequireAuth>
        } />
      </Routes>
    </BrowserRouter>
  );
}