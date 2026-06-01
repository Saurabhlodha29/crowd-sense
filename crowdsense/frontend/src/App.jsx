// frontend/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login          from "./pages/Login";
import DashboardLayout from "./pages/dashboard/DashboardLayout";
import Dashboard      from "./pages/dashboard/Dashboard";
import EventManager   from "./pages/dashboard/EventManager";
import ZoneEditor     from "./pages/dashboard/ZoneEditor";
import AlertCenter    from "./pages/dashboard/AlertCenter";
import Analytics      from "./pages/dashboard/Analytics";
import AppLayout      from "./pages/app/AppLayout";
import EventSearch    from "./pages/app/EventSearch";
import EventDetail    from "./pages/app/EventDetail";
import StallBrowser   from "./pages/app/StallBrowser";
import RoutingView    from "./pages/app/RoutingView";

function PrivateRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("cs_token");
  const role  = localStorage.getItem("cs_role");
  if (!token) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Auth ──────────────────────────────────────────────────────── */}
        <Route path="/login" element={<Login />} />
        <Route path="/"      element={<Navigate to="/login" replace />} />

        {/* ── Organiser dashboard ────────────────────────────────────────── */}
        <Route path="/dashboard" element={
          <PrivateRoute allowedRoles={["ORGANIZER","ADMIN"]}>
            <DashboardLayout />
          </PrivateRoute>
        }>
          <Route index             element={<Dashboard />} />
          <Route path="events"     element={<EventManager />} />
          <Route path="events/:id/zones" element={<ZoneEditor />} />
          <Route path="alerts"     element={<AlertCenter />} />
          <Route path="analytics"  element={<Analytics />} />
        </Route>

        {/* ── Public attendee app ────────────────────────────────────────── */}
        <Route path="/app" element={<AppLayout />}>
          <Route index              element={<EventSearch />} />
          <Route path="event/:id"   element={<EventDetail />} />
          <Route path="event/:id/stalls"  element={<StallBrowser />} />
          <Route path="event/:id/route"   element={<RoutingView />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}