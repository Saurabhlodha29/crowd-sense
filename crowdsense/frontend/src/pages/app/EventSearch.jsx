// frontend/src/pages/app/EventSearch.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { searchEvents, getPublicEvents } from "../../api/crowdApi";
import { useGeolocation } from "../../hooks/useGeolocation";
import { getCrowdConfig } from "../../utils/crowdLevels";

export default function EventSearch() {
  const [query,      setQuery]      = useState("");
  const [events,     setEvents]     = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [searched,   setSearched]   = useState(false);
  const { location, permission, requestLocation } = useGeolocation();
  const navigate = useNavigate();

  // Load nearby / live events on mount
  useEffect(() => {
    setLoading(true);
    getPublicEvents({ status: "LIVE", size: 20 })
      .then((data) => setEvents(data.content || data || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const params = {
        q:    query,
        size: 20,
      };
      if (location) {
        params.lat    = location.lat;
        params.lng    = location.lng;
        params.radius = 100;
      }
      const results = await searchEvents(params);
      setEvents(Array.isArray(results) ? results : results.content || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      {/* Search bar */}
      <div style={styles.searchSection}>
        <h1 style={styles.title}>🌊 CrowdSense</h1>
        <p style={styles.subtitle}>Find events. Avoid crowds. Navigate smarter.</p>
        <form onSubmit={handleSearch} style={styles.searchForm}>
          <input
            style={styles.searchInput}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events, cities, venues…"
          />
          <button style={styles.searchBtn} type="submit">Search</button>
        </form>

        {/* Location permission request */}
        {permission === "prompt" && (
          <button style={styles.locationBtn} onClick={requestLocation}>
            📍 Enable location for nearby events
          </button>
        )}
        {location && (
          <div style={styles.locationBadge}>
            📍 Location active — showing events near you
          </div>
        )}
      </div>

      {/* Results */}
      <div style={styles.results}>
        <h2 style={styles.sectionTitle}>
          {searched ? `Results for "${query}"` : "Live Events Now"}
        </h2>

        {loading && <div style={styles.loading}>Loading events…</div>}

        {!loading && events.length === 0 && (
          <div style={styles.empty}>No events found. Try a different search.</div>
        )}

        {events.map((evt) => (
          <EventCard key={evt.id} event={evt} onClick={() => navigate(`/app/event/${evt.id}`)} />
        ))}
      </div>
    </div>
  );
}

function EventCard({ event, onClick }) {
  const maxLevel = event.crowdSummary
    ? (() => {
        const levels = ["LOW","MEDIUM","HIGH","CRITICAL"];
        const topLevel = event.crowdSummary.reduce((max, z) => {
          const idx = levels.indexOf(z.crowdLevel);
          return idx > levels.indexOf(max) ? z.crowdLevel : max;
        }, "LOW");
        return topLevel;
      })()
    : "UNKNOWN";

  const cfg = getCrowdConfig(maxLevel);

  return (
    <div style={styles.card} onClick={onClick}>
      <div style={styles.cardTop}>
        <div>
          <div style={styles.cardName}>{event.name}</div>
          <div style={styles.cardCity}>📍 {event.city}{event.address ? ` · ${event.address}` : ""}</div>
        </div>
        <span style={{ ...styles.levelBadge, background: cfg.bg, color: cfg.color }}>
          {cfg.label}
        </span>
      </div>
      {event.description && (
        <p style={styles.cardDesc}>{event.description.slice(0, 120)}{event.description.length > 120 ? "…" : ""}</p>
      )}
      <div style={styles.cardMeta}>
        {event.status === "LIVE" && <span style={styles.liveDot}>● LIVE</span>}
        {event.maxCapacity && <span style={styles.metaItem}>Cap: {event.maxCapacity}</span>}
        {event.tags?.length > 0 && event.tags.map(t => (
          <span key={t} style={styles.tag}>{t}</span>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container:     { display: "flex", flexDirection: "column", height: "100%", background: "#0f172a", color: "#f1f5f9", overflowY: "auto" },
  searchSection: { padding: "32px 20px 20px", background: "linear-gradient(180deg,#1e293b,#0f172a)" },
  title:         { fontSize: 28, fontWeight: 800, margin: "0 0 4px" },
  subtitle:      { color: "#64748b", fontSize: 14, marginBottom: 16 },
  searchForm:    { display: "flex", gap: 8 },
  searchInput:   { flex: 1, background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "12px 16px", color: "#f1f5f9", fontSize: 15, outline: "none" },
  searchBtn:     { background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, padding: "12px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  locationBtn:   { marginTop: 10, background: "transparent", border: "1px solid #334155", borderRadius: 8, padding: "8px 14px", color: "#94a3b8", fontSize: 12, cursor: "pointer", width: "100%" },
  locationBadge: { marginTop: 8, color: "#22c55e", fontSize: 12 },
  results:       { padding: "0 16px 24px", flex: 1 },
  sectionTitle:  { color: "#94a3b8", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, margin: "16px 0 10px" },
  loading:       { color: "#64748b", fontSize: 13, padding: "20px 0", textAlign: "center" },
  empty:         { color: "#475569", fontSize: 13, padding: "30px 0", textAlign: "center" },
  card:          { background: "#1e293b", borderRadius: 12, padding: 16, marginBottom: 12, cursor: "pointer", border: "1px solid #334155", transition: "border-color 0.15s" },
  cardTop:       { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  cardName:      { fontSize: 16, fontWeight: 700, color: "#f1f5f9" },
  cardCity:      { fontSize: 12, color: "#64748b", marginTop: 2 },
  cardDesc:      { fontSize: 13, color: "#94a3b8", margin: "6px 0 8px", lineHeight: 1.5 },
  cardMeta:      { display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" },
  levelBadge:    { borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 },
  liveDot:       { color: "#ef4444", fontSize: 11, fontWeight: 700 },
  metaItem:      { color: "#64748b", fontSize: 11 },
  tag:           { background: "#0f172a", color: "#6366f1", borderRadius: 4, padding: "2px 8px", fontSize: 11 },
};