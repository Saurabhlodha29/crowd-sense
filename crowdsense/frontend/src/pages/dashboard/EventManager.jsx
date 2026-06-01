// frontend/src/pages/dashboard/EventManager.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMyEvents, createEvent, setEventStatus } from "../../api/crowdApi";

const STATUS_COLORS = { DRAFT: "#64748b", LIVE: "#22c55e", ENDED: "#334155" };

export default function EventManager() {
  const [events,  setEvents]  = useState([]);
  const [showForm,setShowForm]= useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getMyEvents().then(setEvents).catch(() => setEvents([])).finally(() => setLoading(false));
  }, []);

  async function handleStatusChange(id, newStatus) {
    const updated = await setEventStatus(id, newStatus);
    setEvents((prev) => prev.map((e) => e.id === id ? { ...e, status: newStatus } : e));
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>My Events</h1>
        <button style={styles.createBtn} onClick={() => setShowForm(true)}>+ New Event</button>
      </div>

      {showForm && (
        <CreateEventForm
          onSave={async (dto) => {
            const saved = await createEvent(dto);
            setEvents((prev) => [saved, ...prev]);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading && <div style={styles.loading}>Loading events…</div>}

      <div style={styles.eventList}>
        {events.map((evt) => (
          <div key={evt.id} style={styles.card}>
            <div style={styles.cardTop}>
              <div>
                <div style={styles.evtName}>{evt.name}</div>
                <div style={styles.evtCity}>📍 {evt.city}</div>
              </div>
              <span style={{ ...styles.statusBadge, background: STATUS_COLORS[evt.status] + "33", color: STATUS_COLORS[evt.status] }}>
                {evt.status}
              </span>
            </div>

            <div style={styles.cardActions}>
              <button
                style={styles.actionBtn}
                onClick={() => navigate(`/dashboard/events/${evt.id}/zones`)}
              >
                🗺 Zone Editor
              </button>

              {evt.status === "DRAFT" && (
                <button
                  style={{ ...styles.actionBtn, background: "#14532d", color: "#4ade80" }}
                  onClick={() => handleStatusChange(evt.id, "LIVE")}
                >
                  ▶ Go Live
                </button>
              )}
              {evt.status === "LIVE" && (
                <button
                  style={{ ...styles.actionBtn, background: "#431407", color: "#fb923c" }}
                  onClick={() => handleStatusChange(evt.id, "ENDED")}
                >
                  ■ End Event
                </button>
              )}
            </div>
          </div>
        ))}

        {!loading && events.length === 0 && !showForm && (
          <div style={styles.empty}>
            No events yet. Click "New Event" to create your first one.
          </div>
        )}
      </div>
    </div>
  );
}

function CreateEventForm({ onSave, onCancel }) {
  const [form, setForm] = useState({
    name: "", description: "", city: "", address: "",
    startTime: "", maxCapacity: 500, isPublic: true,
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ ...form, startTime: new Date(form.startTime).toISOString(), maxCapacity: parseInt(form.maxCapacity) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.formCard}>
      <h2 style={styles.formTitle}>Create New Event</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>Event Name *</label>
        <input style={styles.input} value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="Sunburn Festival 2026" />

        <label style={styles.label}>City *</label>
        <input style={styles.input} value={form.city} onChange={(e) => set("city", e.target.value)} required placeholder="Pune" />

        <label style={styles.label}>Address</label>
        <input style={styles.input} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="NSCI Dome, Worli" />

        <label style={styles.label}>Start Date & Time *</label>
        <input style={styles.input} type="datetime-local" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} required />

        <label style={styles.label}>Max Capacity</label>
        <input style={styles.input} type="number" value={form.maxCapacity} onChange={(e) => set("maxCapacity", e.target.value)} />

        <label style={styles.label}>Description</label>
        <textarea style={{ ...styles.input, minHeight: 80, resize: "vertical" }} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Tell attendees about the event…" />

        <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
          <button style={styles.saveBtn} type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create Event"}
          </button>
          <button style={styles.cancelBtn} type="button" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  );
}

const styles = {
  container:   { padding: 24, overflowY: "auto", height: "100%" },
  header:      { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  title:       { color: "#f1f5f9", fontSize: 22, fontWeight: 800, margin: 0 },
  createBtn:   { background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  loading:     { color: "#64748b", fontSize: 13 },
  eventList:   { display: "flex", flexDirection: "column", gap: 12 },
  card:        { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 16 },
  cardTop:     { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  evtName:     { color: "#f1f5f9", fontSize: 16, fontWeight: 700 },
  evtCity:     { color: "#64748b", fontSize: 12, marginTop: 2 },
  statusBadge: { borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 },
  cardActions: { display: "flex", gap: 8 },
  actionBtn:   { background: "#0f172a", color: "#94a3b8", border: "1px solid #334155", borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer" },
  empty:       { color: "#475569", fontSize: 13, textAlign: "center", padding: "40px 0" },
  formCard:    { background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20, marginBottom: 20 },
  formTitle:   { color: "#f1f5f9", fontSize: 16, fontWeight: 700, margin: "0 0 16px" },
  form:        { display: "flex", flexDirection: "column", gap: 10 },
  label:       { color: "#94a3b8", fontSize: 12, fontWeight: 500, marginBottom: -6 },
  input:       { background: "#0f172a", border: "1px solid #334155", borderRadius: 8, padding: "10px 12px", color: "#f1f5f9", fontSize: 14, outline: "none" },
  saveBtn:     { background: "#6366f1", color: "#fff", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  cancelBtn:   { background: "transparent", color: "#64748b", border: "1px solid #334155", borderRadius: 8, padding: "10px 16px", fontSize: 14, cursor: "pointer" },
};