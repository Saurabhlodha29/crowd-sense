// frontend/src/pages/app/StallBrowser.jsx
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRecommendations } from "../../api/crowdApi";
import { getCrowdConfig } from "../../utils/crowdLevels";

const CATEGORIES = ["all", "food", "merchandise", "activity", "service", "info"];

export default function StallBrowser() {
  const { id: eventId } = useParams();
  const navigate        = useNavigate();
  const [recs,      setRecs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [category,  setCategory]  = useState("all");
  const [prefs,     setPrefs]     = useState([]);

  useEffect(() => {
    load();
  }, [eventId, prefs]);

  async function load() {
    setLoading(true);
    try {
      const data = await getRecommendations({
        eventId,
        prefs: prefs.join(","),
      });
      setRecs(data.recommendations || data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = category === "all"
    ? recs
    : recs.filter((s) => s.category?.toLowerCase() === category);

  function togglePref(cat) {
    setPrefs((prev) =>
      prev.includes(cat) ? prev.filter((p) => p !== cat) : [...prev, cat]
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>←</button>
        <div style={styles.headerTitle}>Stalls & Venues</div>
        <button style={styles.refreshBtn} onClick={load}>↻</button>
      </div>

      {/* Preference chips */}
      <div style={styles.prefSection}>
        <div style={styles.prefLabel}>Your interests:</div>
        <div style={styles.chips}>
          {["food","activity","merchandise","service"].map((cat) => (
            <button
              key={cat}
              style={{ ...styles.chip, ...(prefs.includes(cat) ? styles.chipActive : {}) }}
              onClick={() => togglePref(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Category filter */}
      <div style={styles.filterRow}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            style={{ ...styles.filterBtn, ...(category === cat ? styles.filterBtnActive : {}) }}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Stall list */}
      <div style={styles.list}>
        {loading && <div style={styles.loading}>Finding best stalls for you…</div>}
        {!loading && filtered.length === 0 && (
          <div style={styles.empty}>No stalls in this category.</div>
        )}
        {filtered.map((stall, i) => (
          <StallCard
            key={stall.id}
            stall={stall}
            rank={i + 1}
            onNavigate={() => navigate(`/app/event/${eventId}/route?to=${stall.id}`)}
          />
        ))}
      </div>
    </div>
  );
}

function StallCard({ stall, rank, onNavigate }) {
  const crowdLevel = stall.zone_crowd_level || "UNKNOWN";
  const cfg = getCrowdConfig(crowdLevel);

  return (
    <div style={styles.card}>
      <div style={styles.cardLeft}>
        <div style={styles.rank}>#{rank}</div>
        <div>
          <div style={styles.stallName}>{stall.name}</div>
          <div style={styles.stallCat}>{stall.category}</div>
          {stall.description && (
            <div style={styles.stallDesc}>{stall.description.slice(0, 80)}</div>
          )}
          <div style={styles.stallMeta}>
            <span style={{ ...styles.levelDot, background: cfg.color }} />
            <span style={{ color: cfg.color, fontSize: 11, fontWeight: 600 }}>{cfg.label} crowd</span>
            {stall.rating > 0 && (
              <span style={styles.rating}>⭐ {stall.rating.toFixed(1)}</span>
            )}
          </div>
        </div>
      </div>
      <button style={styles.navBtn} onClick={onNavigate}>
        Navigate →
      </button>
    </div>
  );
}

const styles = {
  container:     { display: "flex", flexDirection: "column", height: "100vh", background: "#0f172a", color: "#f1f5f9" },
  header:        { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "#1e293b", borderBottom: "1px solid #334155" },
  backBtn:       { background: "transparent", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" },
  headerTitle:   { color: "#f1f5f9", fontSize: 16, fontWeight: 700 },
  refreshBtn:    { background: "transparent", border: "none", color: "#6366f1", fontSize: 20, cursor: "pointer" },
  prefSection:   { padding: "10px 16px 6px" },
  prefLabel:     { color: "#64748b", fontSize: 11, marginBottom: 6 },
  chips:         { display: "flex", gap: 6, flexWrap: "wrap" },
  chip:          { background: "#1e293b", border: "1px solid #334155", borderRadius: 20, padding: "4px 12px", color: "#94a3b8", fontSize: 12, cursor: "pointer" },
  chipActive:    { background: "#312e81", border: "1px solid #6366f1", color: "#c7d2fe" },
  filterRow:     { display: "flex", gap: 6, padding: "6px 16px 10px", overflowX: "auto" },
  filterBtn:     { background: "transparent", border: "1px solid #334155", borderRadius: 20, padding: "5px 14px", color: "#64748b", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" },
  filterBtnActive:{ background: "#1e293b", border: "1px solid #6366f1", color: "#a5b4fc" },
  list:          { flex: 1, overflowY: "auto", padding: "0 16px 24px" },
  loading:       { color: "#64748b", fontSize: 13, padding: "30px 0", textAlign: "center" },
  empty:         { color: "#475569", fontSize: 13, padding: "30px 0", textAlign: "center" },
  card:          { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 14, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" },
  cardLeft:      { display: "flex", alignItems: "flex-start", gap: 12, flex: 1 },
  rank:          { color: "#6366f1", fontSize: 18, fontWeight: 800, minWidth: 30 },
  stallName:     { color: "#f1f5f9", fontSize: 14, fontWeight: 700, marginBottom: 2 },
  stallCat:      { color: "#6366f1", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  stallDesc:     { color: "#64748b", fontSize: 12, lineHeight: 1.4, marginBottom: 6 },
  stallMeta:     { display: "flex", alignItems: "center", gap: 6 },
  levelDot:      { width: 8, height: 8, borderRadius: "50%", display: "inline-block" },
  rating:        { color: "#f59e0b", fontSize: 11, marginLeft: 6 },
  navBtn:        { background: "#1e3a5f", color: "#60a5fa", border: "none", borderRadius: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" },
};