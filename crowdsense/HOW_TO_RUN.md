# HOW_TO_RUN.md — CrowdSense Complete Setup & Flow Guide
> A step-by-step guide to set up, run, and verify every feature of CrowdSense.
> This is both a **first-time setup guide** and a **demo script** for presentations.

---

## Prerequisites Checklist

Run these in any terminal to verify your tools are installed:

```bash
java --version          # must be Java 17+
mvn --version           # must be 3.6+
node --version          # must be 18+
npm --version           # must be 9+
python --version        # must be 3.10+
```

If any are missing: Java 17 → https://adoptium.net | Node.js 18 → https://nodejs.org | Maven → https://maven.apache.org/download.cgi

---

## One-Time Setup (Do This Once)

### Step 1 — Copy the new files into your project

From the `crowdsense-output/` folder delivered in this session, copy files into your project:

```
crowdsense-output/
  CLAUDE.md                         → crowdsense/CLAUDE.md
  PROJECT_STATUS.md                 → crowdsense/PROJECT_STATUS.md
  TASKS.md                          → crowdsense/TASKS.md
  DECISIONS.md                      → crowdsense/DECISIONS.md
  docs/supabase_migration_v7.sql    → crowdsense/docs/supabase_migration_v7.sql
  frontend/src/index.css            → crowdsense/frontend/src/index.css  (REPLACE)
  frontend/src/App.jsx              → crowdsense/frontend/src/App.jsx    (REPLACE)
  frontend/src/pages/Login.jsx      → crowdsense/frontend/src/pages/Login.jsx (REPLACE)
  frontend/src/pages/dashboard/Dashboard.jsx    → crowdsense/frontend/src/pages/dashboard/Dashboard.jsx (REPLACE)
  frontend/src/pages/dashboard/DashboardLayout.jsx → crowdsense/frontend/src/pages/dashboard/DashboardLayout.jsx (REPLACE)
  frontend/src/pages/dashboard/StallManager.jsx → crowdsense/frontend/src/pages/dashboard/StallManager.jsx (NEW)
  frontend/src/components/CrowdDotLayer.jsx    → crowdsense/frontend/src/components/CrowdDotLayer.jsx (NEW)
  frontend/src/components/CrowdLevelBadge.jsx  → crowdsense/frontend/src/components/CrowdLevelBadge.jsx (NEW)
```

### Step 2 — Delete broken files

Run these delete commands from the `crowdsense/` project root:

**Windows (PowerShell):**
```powershell
Remove-Item "backend\src\main\java\com\crowdsense\backend\BackendApplication.java" -Force
Remove-Item "backend\src\test\java\com\crowdsense\backend\BackendApplicationTests.java" -Force
Remove-Item "backend\test_pooler_v*.py" -Force
Remove-Item "backend\test_direct.py" -Force
Remove-Item "edge\yolov8n.pt" -Force   # duplicate — keep edge/models/yolov8n.pt
Remove-Item -Recurse -Force "online\"
Remove-Item -Recurse -Force "sync\"
```

**Mac/Linux (bash):**
```bash
rm -f backend/src/main/java/com/crowdsense/backend/BackendApplication.java
rm -f backend/src/test/java/com/crowdsense/backend/BackendApplicationTests.java
rm -f backend/test_pooler_v*.py backend/test_direct.py
rm -f edge/yolov8n.pt
rm -rf online/ sync/
```

### Step 3 — Run the Supabase SQL migration

1. Go to https://supabase.com → sign in → open your `crowdsense` project
2. Click **SQL Editor** → **New query**
3. Paste the entire contents of `crowdsense/docs/supabase_migration_v7.sql`
4. Click **Run** (green button)
5. Verify: go to **Table Editor** — you should see tables: `locations`, `crowd_readings`, `alerts`, `events`, `stalls`, `zone_connections`, `users`

### Step 4 — Install frontend dependencies

```bash
cd crowdsense/frontend
npm install
```

If you see any missing packages, also run:
```bash
npm install @stomp/stompjs leaflet react-leaflet leaflet-draw @turf/turf chart.js react-chartjs-2 chartjs-adapter-date-fns axios react-router-dom date-fns
```

### Step 5 — Install Python edge agent dependencies

```bash
cd crowdsense/edge
pip install requests ultralytics opencv-python flask paho-mqtt filterpy numpy
```

### Step 6 — (Optional) Install ML service dependencies

```bash
cd crowdsense/ml
pip install fastapi uvicorn requests numpy scipy
```

---

## Running the System

Open **5 separate terminal windows/tabs**. Label them clearly.

### Terminal 1 — Spring Boot Backend

```bash
cd crowdsense/backend
mvn spring-boot:run
```

**Wait for this line:**
```
Started CrowdSenseApplication in X.XXX seconds
```

**Verify it's working:**
```bash
curl http://localhost:8080/api/v1/readings/health
# Expected: {"status":"UP"}
```

**What it does on startup:**
- Connects to Supabase via transaction pooler
- DataInitializer seeds: admin user, organizer user, loc_001 location, demo event
- STOMP WebSocket available at: `ws://localhost:8080/ws/websocket`

---

### Terminal 2 — React Frontend

```bash
cd crowdsense/frontend
npm run dev
```

**Wait for:**
```
  VITE v5.x.x  ready in XXX ms
  ➜  Local:   http://localhost:3000/
```

**Open in browser:**
- Organiser dashboard: http://localhost:3000/login → select "Organiser" tab
- Attendee app: http://localhost:3000/login → select "Attendee" tab → Continue as Guest

---

### Terminal 3 — Python Sensor Agent (Simulation Mode)

```bash
cd crowdsense/edge
python sensor_agent.py
```

**Expected output every 5 seconds:**
```
[AGENT] CrowdSense Edge Agent starting... (SIMULATION mode)
[DB]   SQLite initialized at data/crowdsense_local.db
[AGENT] Captured: 23 people | Level: LOW
[AGENT] Sent to backend ✓
[AGENT] Captured: 47 people | Level: MEDIUM
[AGENT] Sent to backend ✓
```

If you see `[AGENT] Send failed — data buffered in SQLite`, the backend is not running yet.

---

### Terminal 4 — ML Microservice (Optional — routing/recommendations)

```bash
cd crowdsense/ml
uvicorn main:app --port 8001 --reload
```

**Verify:**
```bash
curl http://localhost:8001/health
# Expected: {"status":"ok"}
```

If this terminal is skipped, the `/route` and `/recommend` endpoints in Spring Boot fall back to a rule-based calculation. All other features still work.

---

### Terminal 5 — Monitor (optional, useful for debugging)

```bash
# Watch Spring Boot logs in real time (Mac/Linux)
tail -f crowdsense/backend/logs/spring.log

# OR just let Terminal 1 show logs — they appear there as readings arrive
```

---

## Demo Flow — Walk Through Every Feature

### 🔐 Feature 1: Login System

**Test Organiser Login:**
1. Go to http://localhost:3000/login
2. Make sure "Organiser" tab is selected
3. Enter: `organizer@demo.com` / `demo1234`
4. Click "Sign in to Dashboard"
5. ✅ You should land on `/dashboard` — the Overview page with live stats

**Test Guest Attendee:**
1. Click "Attendee" tab
2. Click "Continue as Guest →"
3. ✅ You land on `/app` — the event search screen

**Test Admin Login:**
1. Back on login page, enter: `admin@crowdsense.dev` / `admin123`
2. ✅ Also lands on `/dashboard` with full access

---

### 📊 Feature 2: Organiser Dashboard Overview

After logging in as organiser at `/dashboard`:

1. **Stats cards** at the top should show: Total People, Active Zones, Active Alerts, Critical Zones
2. **Live chart** — select a zone from the dropdown to see its crowd timeline
3. **Zone status table** — should show `loc_001 — Main Entrance` with live data
4. **WS indicator** (top right) — should say "Live" with a green dot

**To trigger a real update:**
- Make sure Terminal 3 (sensor agent) is running
- Within 5 seconds you should see the `personCount` in the table change
- The chart updates with new data points

---

### 🗺 Feature 3: Create an Event + Draw Zones

1. In the dashboard sidebar, click **Events**
2. Click **"+ New Event"**
3. Fill in:
   - Name: `Test Event 2026`
   - City: `Mumbai`
   - Start Time: any future date
   - Max Capacity: 500
4. Click **Create Event**
5. The event appears in the list with status `DRAFT`
6. Click **"Draw Zones"** next to the event
7. The map opens with `Leaflet.draw` toolbar on the left
8. Click the **polygon tool** (pentagon icon)
9. Click 4-5 points on the map to draw a zone boundary
10. Double-click to finish the polygon
11. Type the zone name when prompted: e.g. `Main Stage`
12. ✅ Zone polygon appears on map in indigo colour
13. Draw 2-3 more zones: `Food Court`, `Entry Gate`, `Exit`
14. Back in Events, click **"Set Live"** to change status to LIVE

---

### 🏪 Feature 4: Add Stalls

1. In the sidebar, click **Stalls**
2. Select your test event in the event tabs
3. Click **+ Add Stall**
4. Fill in:
   - Name: `Biryani Corner`
   - Category: `food`
   - Zone: select `Food Court` (the zone you just drew)
   - Description: `Best biryani in town`
5. Click the map to drop a pin for the stall position
6. Click **Save Stall**
7. ✅ Stall card appears in the grid
8. Add 2-3 more stalls across different zones

---

### 📱 Feature 5: Attendee Mobile View

1. Open http://localhost:3000/app **in the same browser**
2. Or better: Press `F12` → `Ctrl+Shift+M` → select **Pixel 7** from device list

**Event Search:**
1. The search bar is at the top
2. Type `Test Event` and press Enter (or wait for auto-search)
3. ✅ Your test event appears in results
4. Click the event card

**Live Map:**
1. You're now on the Event Detail page with the Leaflet map
2. The zone polygons you drew are visible, coloured by crowd level
3. Crowd dots appear inside zones (small coloured circles)
4. Tap any zone polygon — a slide-up panel shows:
   - Zone name
   - Current crowd count
   - Crowd level badge
   - Capacity bar
   - "Navigate to a stall from here" button

---

### 🗺 Feature 6: Smart Routing

1. On the Event Detail page, click **"Stalls →"** (top right)
2. Stalls are listed sorted by crowd (least busy first)
3. Tap any stall — you go to the Routing View
4. The map shows numbered waypoints connected by a coloured polyline
5. The route card at the bottom shows: estimated walk time, distance, step-by-step zones
6. Route refreshes every 5 seconds — if a zone becomes CRITICAL, the route avoids it and shows "🔄 Route updated"

---

### 🚨 Feature 7: Alerts

**Trigger a HIGH/CRITICAL alert:**

Option A — Let the simulation run until it generates a HIGH/CRITICAL count naturally (person_count > 50 triggers HIGH, > 75 triggers CRITICAL in the default config).

Option B — Force it manually via curl:
```bash
curl -X POST http://localhost:8080/api/v1/readings \
  -H "Content-Type: application/json" \
  -d '{"locationId":"loc_001","personCount":82,"crowdLevel":"CRITICAL","confidence":0.97,"capturedAt":"2026-01-01T12:00:00Z"}'
```

**What you should see:**
1. Dashboard Overview: "Active Alerts" counter increments
2. Dashboard "Alerts" page: new alert row appears with red CRITICAL badge
3. Attendee EventDetail: if the critical zone is within 50m of your simulated location, a red banner appears at top
4. Browser console: `[WS] Alert received: CRITICAL crowd at loc_001`

**Resolve the alert:**
1. Go to Dashboard → Alerts
2. Click **"Resolve"** next to the alert
3. ✅ Alert moves to "Resolved" status

---

### 📡 Feature 8: Offline Resilience Test

This test proves the SQLite buffer works:

1. Start Terminal 3 (sensor agent) with the backend running — confirm data is flowing
2. **Stop Terminal 1 (backend)** — `Ctrl+C`
3. Watch Terminal 3 — you'll see:
   ```
   [AGENT] Send failed — data buffered in SQLite
   [SYNC] Offline — skipping sync.
   ```
4. Let it run for 1-2 minutes (SQLite accumulates readings)
5. **Restart Terminal 1** (backend): `mvn spring-boot:run`
6. Within 30 seconds, Terminal 3 will show:
   ```
   [SYNC] Synced 12 records.
   ```
7. ✅ Refresh the dashboard chart — you'll see the gap filled in with the buffered data

---

### 📈 Feature 9: Analytics

1. In the dashboard sidebar, click **Analytics**
2. Select your event from the dropdown
3. ✅ Bar chart shows peak crowd counts per zone over the session
4. Try changing the time filter

---

## Common Issues & Quick Fixes

| Symptom | Fix |
|---------|-----|
| Backend won't start — "Connection refused" | Check that Supabase is not paused. Go to supabase.com → your project → resume it (takes ~2 min) |
| Backend starts but shows errors about "BackendApplication" | You forgot Step 2 — delete `BackendApplication.java` |
| Frontend blank page at `/dashboard` | Hard-refresh: `Ctrl+Shift+R`. If persists, `npm run dev` again |
| WebSocket shows "Connecting…" forever | Backend is not running or CORS is blocking. Check Terminal 1 for errors |
| `[AGENT] Send failed` every time | Backend is not on port 8080 or hasn't started yet |
| Zone polygons don't appear on map | `leaflet-draw` CSS not imported. Check `ZoneEditor.jsx` has the CSS import line |
| Stalls don't appear in routing | You need to add stalls via the Stalls page first (Feature 4 above) |
| Route shows "fallback route" | ML service (Terminal 4) is not running — that's OK, fallback is a direct path |
| `npm install` fails on leaflet-draw | Run: `npm install leaflet-draw --legacy-peer-deps` |
| Port 8080 already in use | Windows: `taskkill /F /IM java.exe` · Mac/Linux: `kill $(lsof -ti:8080)` |
| Supabase 503 | Free tier pauses after 7 days of inactivity — go to supabase.com and restore |

---

## System Health Check (Quick Sanity Test)

Run all of these in a new terminal — every command should return a valid response:

```bash
# 1. Backend health
curl http://localhost:8080/api/v1/readings/health
# → {"status":"UP"}

# 2. Login and get token
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"organizer@demo.com","password":"demo1234"}' | python -c "import sys,json; print(json.load(sys.stdin)['token'])")
echo "Token: $TOKEN"
# → Token: eyJhbGci...

# 3. Latest readings (public)
curl http://localhost:8080/api/v1/readings/latest
# → [...] array (may be empty if no data yet)

# 4. Public events
curl "http://localhost:8080/api/v1/events?status=LIVE"
# → Page object with events

# 5. ML service health (if running)
curl http://localhost:8001/health
# → {"status":"ok"}

# 6. Submit a test reading directly
curl -X POST http://localhost:8080/api/v1/readings \
  -H "Content-Type: application/json" \
  -d '{"locationId":"loc_001","personCount":34,"crowdLevel":"MEDIUM","confidence":0.88}'
# → {"id":"...","personCount":34,...}
```

---

## For Presentations / Demo Day

**Recommended terminal layout (4 side-by-side):**
```
┌─────────────────┬──────────────────┐
│  T1: Backend    │  T3: Sensor      │
│  (logs flowing) │  (data ticking)  │
├─────────────────┼──────────────────┤
│  T2: Frontend   │  T4: ML service  │
│  (npm run dev)  │  (optional)      │
└─────────────────┴──────────────────┘
```

**Browser windows:**
- Window 1: http://localhost:3000/dashboard (login as organizer@demo.com)
- Window 2: http://localhost:3000/app with Chrome DevTools → Pixel 7 emulation

**Demo order for maximum impact:**
1. Show live crowd chart updating in real time (Dashboard Overview)
2. Draw a new zone on the map (ZoneEditor)
3. Switch to Attendee view — show the zone map with crowd dots
4. Trigger a CRITICAL alert via curl — show the banner + alert centre update
5. Navigate from a zone to a stall — show the waypoint route
6. Demonstrate offline resilience (stop backend, let agent buffer, restart, show sync)

---

*CrowdSense HOW_TO_RUN.md · Updated Session 9 · June 2026*
