import { useEffect, useState, useCallback } from "react";
import { getCrowdConfig } from "../utils/crowdLevels";
import { getCrowdReadings, getLocations } from "../api/crowdApi";
import "../styles/mobile.css";

export default function MobileApp() {
  const [readings, setReadings] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [rRes, lRes] = await Promise.all([
        getCrowdReadings(),
        getLocations(),
      ]);
      setReadings(rRes.data || []);
      setLocations(lRes.data || []);
      setLastUpdated(new Date());
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // auto-refresh every 10s
    return () => clearInterval(interval);
  }, [fetchData]);

  const locMap = Object.fromEntries(locations.map((l) => [l.id, l]));

  return (
    <div className="mob-root">
      {/* Header */}
      <div className="mob-header">
        <span className="mob-logo">⬤ CrowdSense</span>
        <span className="mob-subtitle">Live Crowd Intelligence</span>
      </div>

      {/* Last updated */}
      {lastUpdated && (
        <div className="mob-updated">
          Updated {lastUpdated.toLocaleTimeString()}
        </div>
      )}

      {/* Content */}
      <div className="mob-content">
        {loading ? (
          <div className="mob-loading">
            <div className="mob-spinner" />
            <span>Loading crowd data…</span>
          </div>
        ) : readings.length === 0 ? (
          <div className="mob-empty">
            <p>No readings yet.</p>
            <p className="mob-hint">Start the sensor agent to see live data.</p>
          </div>
        ) : (
          readings.map((r) => {
            const loc = locMap[r.locationId];
            const level = r.crowdLevel || "LOW";
            const cfg = getCrowdConfig(level);
            return (
              <div
                key={r.id || r.locationId}
                className="mob-card"
                style={{ borderLeftColor: cfg.color }}
              >
                <div className="mob-card-top">
                  <span className="mob-loc">{loc?.name || r.locationId}</span>
                  <span
                    className="mob-badge"
                    style={{ color: cfg.color, background: cfg.bg }}
                  >
                    {level}
                  </span>
                </div>
                <div className="mob-count" style={{ color: cfg.color }}>
                  {r.personCount}
                </div>
                <div className="mob-unit">people detected</div>
                {r.confidence && (
                  <div className="mob-meta">
                    Confidence: {(r.confidence * 100).toFixed(0)}%
                  </div>
                )}
                <div
                  className="mob-bar-bg"
                  title={`${r.personCount} / ${loc?.maxCapacity || 100}`}
                >
                  <div
                    className="mob-bar-fill"
                    style={{
                      width: `${Math.min(
                        100,
                        (r.personCount / (loc?.maxCapacity || 100)) * 100
                      )}%`,
                      background: cfg.color,
                    }}
                  />
                </div>
              </div>
            );
          })
        )}

        {/* Safety guide */}
        <div className="mob-guide">
          <div className="mob-guide-title">Safety Guide</div>
          {[
            { level: "LOW", label: "Safe to proceed normally" },
            { level: "MEDIUM", label: "Moderate — stay aware" },
            { level: "HIGH", label: "Consider alternate route" },
            { level: "CRITICAL", label: "Avoid this area now" },
          ].map(({ level, label }) => {
            const cfg = getCrowdConfig(level);
            return (
              <div key={level} className="mob-guide-row">
                <span style={{ color: cfg.color }}>●</span>
                <span>
                  <strong>{level}</strong> — {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Refresh button */}
        <button className="mob-refresh" onClick={fetchData}>
          ↻ Refresh
        </button>
      </div>

      {/* Bottom nav */}
      <div className="mob-nav">
        <div className="mob-nav-item mob-nav-active">🏠 Home</div>
        <div className="mob-nav-item">🗺 Map</div>
        <div className="mob-nav-item">⚠ Alerts</div>
        <div className="mob-nav-item">⚙ Settings</div>
      </div>
    </div>
  );
}