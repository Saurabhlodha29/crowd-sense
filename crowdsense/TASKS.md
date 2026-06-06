# TASKS.md — CrowdSense Prioritised Build List
> Updated: Session 9 audit | Source of truth: actual ZIP codebase  
> Format: `[ ]` = not done, `[x]` = done, `[~]` = partial

---

## 🔴 P0 — BLOCKERS (Fix Before Anything Else)

- [ ] **Delete duplicate main class**
  - File: `backend/src/main/java/com/crowdsense/backend/BackendApplication.java`
  - Also delete: `backend/src/test/java/com/crowdsense/backend/BackendApplicationTests.java`
  - Why: Maven may compile the wrong entry point, causing startup failures
  - Time: 2 min

- [ ] **Delete orphaned directories**
  - `crowdsense/online/` — leftover test directory
  - `crowdsense/sync/` — orphaned copy of edge files
  - All `backend/test_*.py` files (test_pooler_v1..v8, test_direct.py, etc.)
  - `edge/yolov8n.pt` duplicate (keep only `edge/models/yolov8n.pt`)
  - Time: 5 min

---

## 🟠 P1 — CORE (Must Have for Demo)

- [ ] **Build `frontend/src/pages/dashboard/Dashboard.jsx`** — EMPTY FILE
  - The main organiser overview page at `/dashboard` is blank (0-byte file)
  - Needs: live crowd stats cards (total locations, active alerts, online sensors)
  - Needs: live time-series chart (Chart.js, last 30 min across all locations)
  - Needs: zone status table (name, current count, level badge, last seen)
  - Needs: WS status indicator (green dot = connected)
  - Reference: use `useWebSocket()` hook + `getCrowdReadings()` + `getAlertStats()`
  - Time: 2-3 hours

- [ ] **Build `frontend/src/pages/dashboard/StallManager.jsx`** — MISSING FILE
  - Organiser needs to add stalls to events for routing to work
  - List existing stalls per event; form to add new stall (name, category, lat, lng, description)
  - Uses: `getStalls(eventId)` + `createStall(eventId, dto)` from `crowdApi.js`
  - Time: 2 hours

- [ ] **Add StallManager to DashboardLayout sidebar**
  - Add nav link `{ to: "/dashboard/stalls", label: "Stalls", icon: "🏪" }`
  - Add route in `App.jsx`: `<Route path="stalls" element={<StallManager />} />`
  - Time: 15 min

- [ ] **Supabase schema: Add missing tables**
  - Verify `events`, `stalls`, `zone_connections`, `users` tables exist in Supabase
  - Run the SQL from `CrowdSense_Master_v7.md` Section 14 in Supabase SQL Editor
  - Add PostGIS extension: `CREATE EXTENSION IF NOT EXISTS postgis;`
  - Add pg_trgm: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
  - Add `boundary GEOMETRY(POLYGON, 4326)` column to `locations` table
  - Add `positions JSONB` column to `crowd_readings` table
  - Time: 30 min

---

## 🟡 P2 — IMPORTANT (Significantly Improves Demo Quality)

- [ ] **Redesign `frontend/src/pages/Login.jsx`**
  - Current: functional but minimal inline-style design
  - Goal: polished, visually distinct login with CrowdSense branding
  - Keep: dual-tab logic, role-based redirect, guest bypass
  - Time: 1-2 hours

- [ ] **Redesign `frontend/src/index.css` and add global design tokens**
  - Add Google Font (Outfit or DM Sans)
  - Define CSS variables: `--color-bg`, `--color-surface`, `--color-accent`, etc.
  - Standardise all inline styles to use class names where possible
  - Time: 2 hours

- [ ] **Zone Connection Editor in ZoneEditor.jsx**
  - After zones are drawn, let organiser click two zones to create a walking connection
  - Uses `createZoneConnection(dto)` from `crowdApi.js`
  - Backend: `ZoneConnectionController` + `ZoneConnectionService` already done
  - Needed for routing to compute real paths (currently uses fallback direct path)
  - Time: 3 hours

- [ ] **Improve `EventDetail.jsx` — canvas dot rendering**
  - Extract `CrowdDotLayer.jsx` as a standalone component
  - Fix potential memory leak: canvas ref not cleaned up on zone change
  - Add animation: lerp dots from old to new positions over 500ms
  - Time: 2 hours

- [ ] **Add `StallManager.jsx` stall position picker**
  - When adding a stall, let organiser tap the map to set stall lat/lng
  - Currently the form requires manual lat/lng input
  - Time: 2 hours

- [ ] **Build `frontend/src/components/CrowdLevelBadge.jsx`**
  - Reusable colored badge component (LOW/MEDIUM/HIGH/CRITICAL)
  - Currently badge styling is copy-pasted in 5 different files
  - Time: 30 min

---

## 🔵 P3 — ENHANCEMENT (Improves Résumé/Demo Polish)

- [ ] **Real demo data replay**
  - Download a CC0 crowd video from Pixabay
  - Place at `edge/demo_data/crowd_demo.mp4`
  - Run: `python edge/generate_demo_data.py --video edge/demo_data/crowd_demo.mp4`
  - Then `python sensor_agent.py` will use DEMO_VIDEO mode for authentic data
  - Time: 1 hour (mostly download/processing time)

- [ ] **Add `/events/{id}/analytics` to EventDetail**
  - Show a mini analytics panel for attendees (peak times today)
  - Backend endpoint already exists
  - Time: 1 hour

- [ ] **Improve Alert notifications in attendee app**
  - `useProximityAlert.js` is wired but no toast/notification shown
  - Add a floating toast when CRITICAL crowd detected within 50m
  - Time: 1 hour

- [ ] **Add event thumbnail / category tags**
  - Events table has `tags TEXT[]` column
  - Show tags as chips on event cards in EventSearch
  - Time: 1 hour

- [ ] **Loading skeleton screens**
  - Replace "Loading…" text with skeleton placeholder cards
  - Time: 2 hours

- [ ] **Resolve `venv/` from zip**
  - The uploaded zip includes a 1GB+ Python venv directory
  - Add `venv/` to `.gitignore` and delete from repo
  - Time: 5 min

---

## 🟢 P4 — DEPLOYMENT (Phase 7)

- [ ] **Create Dockerfile for Spring Boot backend**
  - Base: `eclipse-temurin:17-jdk-alpine`
  - Build with Maven, run the jar
  - Configure via environment variables (not hardcoded in application.properties)

- [ ] **Deploy backend to Render.com**
  - Create `render.yaml` in project root
  - Set environment variables in Render dashboard
  - Update `frontend/.env.production`: `VITE_BACKEND_URL=https://your-app.onrender.com`

- [ ] **Deploy frontend to Vercel**
  - `vercel.json` with `{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }`
  - Connect GitHub repo to Vercel

- [ ] **Deploy ML service to Railway.app**
  - `ml/Procfile`: `web: uvicorn ml.main:app --host 0.0.0.0 --port $PORT`
  - Add `ml/requirements.txt` with all deps

- [ ] **Move secrets to environment variables**
  - Supabase password, JWT secret should NOT be hardcoded in application.properties
  - Use `${SUPABASE_PASSWORD}` style variables
  - Add `.env.example` for backend

---

## 🔲 P5 — FUTURE / OPTIONAL

- [ ] Firebase FCM push notifications
  - Set `firebase.enabled=true` in properties
  - Add `firebase-service-account.json` from Firebase console
  - Complete `NotificationService.java` implementation

- [ ] Redis Streams for high-throughput ingestion
  - Currently: synchronous save → broadcast
  - Upgrade: save to Redis Stream → consumer group (DB writer + WS broadcaster + alert checker)

- [ ] Rate limiting (bucket4j)
  - Per-sensor rate limiting: 60 readings/minute max

- [ ] CSRNet dense crowd counting
  - Download CSRNet weights from GitHub
  - Integrate `density_estimator.py` into `crowd_detector.py`
  - Switch model when `prev_count > 50`

- [ ] Camera calibration tool
  - Web UI: organiser taps 4 corners of camera frame on map
  - Computes homography matrix stored in zone config
  - Required for real lat/lng positions from YOLOv8 bounding boxes

- [ ] Automated test suite
  - Backend: JUnit tests for CrowdReadingService, AlertService
  - Frontend: Vitest + Testing Library for critical components
  - Edge: pytest for sensor_agent, fusion_engine

---

## Session Tracking

| Session | Tasks Completed | Output |
|---------|----------------|--------|
| 1-3 | Architecture, Spring Boot skeleton, edge agent, frontend skeleton | Working backend + basic dashboard |
| 4 | Supabase hostname fix, Expo setup, simulation files | Sensor data flowing |
| 5 | Backend connection fix, offline resilience | Offline pipeline working |
| 6 | Expo OTA fix, scrcpy guide | Mobile testing setup |
| 7 | Expo replaced with React /app route | Chrome DevTools mobile emulation |
| 8 | 500 error fixed, JWT auth, DataInitializer rewrite | Authentication working |
| 9 | Full architecture overhaul + dual dashboard design + ML service | v7 architecture in code |
| **10 (next)** | **P0 cleanup + P1 Dashboard.jsx + P1 StallManager.jsx** | **Demo-ready organiser portal** |
