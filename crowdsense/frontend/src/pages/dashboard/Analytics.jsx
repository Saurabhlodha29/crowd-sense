// frontend/src/pages/dashboard/Analytics.jsx
import { useState, useEffect } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip, Legend,
} from "chart.js";
import { getMyEvents, getEventAnalytics } from "../../api/crowdApi";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function Analytics() {
  const [events,    setEvents]    = useState([]);
  const [selected,  setSelected]  = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    getMyEvents().then((e) => { setEvents(e); if (e.length > 0) setSelected(e[0].id); });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    getEventAnalytics(selected)
      .then(setAnalytics)
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, [selected]);

  const chartData = analytics
    ? {
        labels:   analytics.zones.map((z) => z.zoneName),
        datasets: [{
          label:           "Peak Count",
          data:            analytics.zones.map((z) => z.peakCount),
          backgroundColor: analytics.zones.map((z) => {
            const pct = z.capacity ? z.peakCount / z.capacity : 0;
            if (pct > 0.9) return "#ef4444aa";
            if (pct > 0.6) return "#f97316aa";
            if (pct > 0.3) return "#f59e0baa";
            return "#22c55eaa";
          }),
          borderRadius: 6,
        }],
      }
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: "#1e293b" }, ticks: { color: "#64748b" } },
      y: { beginAtZero: true, grid: { color: "#1e293b" }, ticks: { color: "#64748b" } },
    },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Analytics</h1>
        <select
          style={styles.eventSelect}
          value={selected || ""}
          onChange={(e) => setSelected(e.target.value)}
        >
          {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </div>

      {loading && <div style={styles.loading}>Loading analytics…</div>}

      {!loading && analytics && (
        <>
          {/* Zone peak table */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Zone Peak Counts (Last 24 h)</div>
            <div style={styles.chartWrap}>
              {chartData && <Bar data={chartData} options={chartOptions} />}
            </div>
          </div>

          {/* Zone detail rows */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Zone Details</div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={styles.th}>Zone</th>
                    <th style={styles.th}>Peak Count</th>
                    <th style={styles.th}>Capacity</th>
                    <th style={styles.th}>Peak Utilisation</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.zones.map((z) => {
                    const pct = z.capacity ? Math.round((z.peakCount / z.capacity) * 100) : "—";
                    return (
                      <tr key={z.zoneId} style={styles.tbodyRow}>
                        <td style={styles.td}>{z.zoneName}</td>
                        <td style={styles.td}>{z.peakCount}</td>
                        <td style={styles.td}>{z.capacity || "—"}</td>
                        <td style={styles.td}>{typeof pct === "number" ? `${pct}%` : pct}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && !analytics && (
        <div style={styles.empty}>Select an event with live data to see analytics.</div>
      )}
    </div>
  );
}

const styles = {
  container:   { padding: 24, overflowY: "auto", height: "100%" },
  header:      { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  title:       { color: "#f1f5f9", fontSize: 22, fontWeight: 800, margin: 0 },
  eventSelect: { background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "6px 12px", color: "#94a3b8", fontSize: 13 },
  loading:     { color: "#64748b", fontSize: 13 },
  empty:       { color: "#475569", fontSize: 13, textAlign: "center", padding: "40px 0" },
  section:     { background: "#1e293b", borderRadius: 12, padding: 20, marginBottom: 16 },
  sectionTitle:{ color: "#f1f5f9", fontSize: 14, fontWeight: 600, marginBottom: 14 },
  chartWrap:   { height: 220, position: "relative" },
  tableWrap:   { overflowX: "auto" },
  table:       { width: "100%", borderCollapse: "collapse" },
  theadRow:    { borderBottom: "1px solid #334155" },
  tbodyRow:    { borderBottom: "1px solid #1e293b" },
  th:          { color: "#64748b", fontSize: 11, fontWeight: 600, textTransform: "uppercase", padding: "6px 12px", textAlign: "left" },
  td:          { color: "#f1f5f9", fontSize: 13, padding: "10px 12px" },
};