import { useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import "chartjs-adapter-date-fns";

ChartJS.register(LineElement, PointElement, LinearScale, TimeScale, Tooltip, Legend, Filler);

export default function CrowdChart({ readings, locationName }) {
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext("2d");

    // Destroy previous chart instance
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    if (!readings || readings.length === 0) return;

    const sorted = [...readings].sort((a, b) =>
      new Date(a.capturedAt) - new Date(b.capturedAt)
    );

    chartRef.current = new ChartJS(ctx, {
      type: "line",
      data: {
        datasets: [{
          label: "Person Count",
          data: sorted.map((r) => ({ x: new Date(r.capturedAt), y: r.personCount })),
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59,130,246,0.08)",
          tension: 0.4,
          fill: true,
          pointRadius: sorted.length > 50 ? 0 : 3,
          pointHoverRadius: 5,
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 300 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#1e293b",
            titleColor: "#94a3b8",
            bodyColor: "#f1f5f9",
            callbacks: {
              title: (items) => new Date(items[0].raw.x).toLocaleTimeString("en-IN"),
              label: (item) => ` ${item.raw.y} people`,
            },
          },
        },
        scales: {
          x: {
            type: "time",
            time: { unit: "minute", displayFormats: { minute: "HH:mm" } },
            ticks: { color: "#475569", maxTicksLimit: 8 },
            grid: { color: "#1e293b" },
          },
          y: {
            beginAtZero: true,
            ticks: { color: "#475569" },
            grid: { color: "#1e293b" },
            title: { display: true, text: "People", color: "#475569" },
          },
        },
      },
    });

    return () => {
      if (chartRef.current) chartRef.current.destroy();
    };
  }, [readings]);

  if (!readings || readings.length === 0) {
    return (
      <div style={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontSize: 13 }}>
        No data for {locationName}
      </div>
    );
  }

  return <canvas ref={canvasRef} style={{ height: 280, width: "100%" }} />;
}