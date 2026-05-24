import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement, PointElement,
  LinearScale, TimeScale,
  Tooltip, Legend, Filler,
} from "chart.js";
import "chartjs-adapter-date-fns";

ChartJS.register(LineElement, PointElement, LinearScale, TimeScale, Tooltip, Legend, Filler);

export default function CrowdChart({ readings = [], locationName = "" }) {
  if (!readings.length) {
    return (
      <div style={styles.empty}>No data for {locationName || "this location"}</div>
    );
  }

  const sorted = [...readings].sort(
    (a, b) => new Date(a.capturedAt) - new Date(b.capturedAt)
  );

  const data = {
    datasets: [
      {
        label: "Person Count",
        data: sorted.map((r) => ({ x: new Date(r.capturedAt), y: r.personCount })),
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59,130,246,0.08)",
        pointBackgroundColor: sorted.map((r) => levelColor(r.crowdLevel)),
        pointRadius: sorted.length > 60 ? 0 : 4,
        pointHoverRadius: 6,
        tension: 0.3,
        fill: true,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#151d2e",
        borderColor: "#2a3f5f",
        borderWidth: 1,
        titleColor: "#e8edf5",
        bodyColor: "#7a8ba0",
        titleFont: { family: "'Syne', sans-serif", size: 13 },
        bodyFont: { family: "'Space Mono', monospace", size: 12 },
        callbacks: {
          label: (ctx) =>
            `  ${ctx.parsed.y} people  ·  ${sorted[ctx.dataIndex]?.crowdLevel || ""}`,
        },
      },
    },
    scales: {
      x: {
        type: "time",
        time: { unit: "minute", displayFormats: { minute: "HH:mm" } },
        ticks: { color: "#4a5568", font: { family: "'Space Mono', monospace", size: 11 }, maxTicksLimit: 8 },
        grid: { color: "#1a2438" },
        border: { color: "#1e2d45" },
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#4a5568", font: { family: "'Space Mono', monospace", size: 11 } },
        grid: { color: "#1a2438" },
        border: { color: "#1e2d45" },
        title: { display: true, text: "People", color: "#4a5568", font: { size: 11 } },
      },
    },
  };

  return (
    <div style={styles.wrap}>
      <Line data={data} options={options} />
    </div>
  );
}

function levelColor(level) {
  const map = { LOW: "#22c55e", MEDIUM: "#f59e0b", HIGH: "#f97316", CRITICAL: "#ef4444" };
  return map[level] || "#3b82f6";
}

const styles = {
  wrap: { position: "relative", height: "100%", minHeight: 220 },
  empty: {
    display: "flex", alignItems: "center", justifyContent: "center",
    height: 220, color: "#4a5568",
    fontFamily: "'Space Mono', monospace", fontSize: 13,
  },
};
