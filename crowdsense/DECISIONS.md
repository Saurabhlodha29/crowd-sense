# DECISIONS.md — CrowdSense Architectural Decision Log
> This file records every significant technical decision made, why it was made, and what alternatives were rejected. Attach to interviews and code reviews to demonstrate engineering judgment.

---

## ADR-001: PostgreSQL (Supabase) over MongoDB
**Date:** Session 1  
**Status:** Active

**Decision:** Use Supabase (PostgreSQL) as the primary database instead of MongoDB Atlas.

**Why:**
- Free tier: 500 MB DB, no credit card, does not require billing setup
- PostgreSQL is superior for time-series queries (crowd readings with time windows, aggregates)
- Supabase provides a built-in dashboard for visual inspection during development
- PostGIS extension enables geospatial queries (event search by radius, zone boundary storage)
- `DISTINCT ON` syntax solves the "latest reading per location" query elegantly
- MongoDB Atlas free tier restrictions tightened in 2024

**Rejected alternatives:**
- MongoDB Atlas: inferior for time-series, no geospatial without Atlas Search
- Firebase Realtime DB: no complex queries, no SQL aggregates
- PlanetScale: MySQL-based, no PostGIS, no arrays

---

## ADR-002: Transaction Pooler (port 6543) over Direct Connection
**Date:** Session 4  
**Status:** Active — CRITICAL

**Decision:** Connect to Supabase via the Transaction Pooler at port 6543 with `prepareThreshold=0`.

**Why:** The free tier Supabase instance in ap-south-1 blocks direct PostgreSQL connections (port 5432) from external IPs. Session pooler also had issues. Transaction pooler works reliably but requires `prepareThreshold=0` to disable server-side prepared statements (which don't survive between pooler connections).

**Connection string format:**
```
jdbc:postgresql://aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&prepareThreshold=0
```

**What NOT to do:**
- Do not use port 5432 (direct) — will get "connection refused" or timeout
- Do not remove `prepareThreshold=0` — will get "prepared statement already exists" errors

---

## ADR-003: Native WebSocket over SockJS
**Date:** Session 7  
**Status:** Active — CRITICAL

**Decision:** Use `@stomp/stompjs` with native WebSocket (`brokerURL: ws://...`) instead of SockJS.

**Why:** SockJS imports Node.js globals (`global`, `process`) that don't exist in Vite's browser bundle. This caused `ReferenceError: global is not defined` on page load in React. The native WS approach is simpler, has no polyfill requirements, and works identically in modern browsers.

**Code:**
```javascript
// CORRECT
import { Client } from "@stomp/stompjs";
const WS_URL = BASE.replace(/^http/, "ws") + "/ws/websocket";
new Client({ brokerURL: WS_URL, ... });

// WRONG — causes ReferenceError: global
import SockJS from "sockjs-client";
new Client({ webSocketFactory: () => new SockJS(url), ... });
```

**Rejected alternatives:**
- SockJS: broke Vite build
- Raw WebSocket (no STOMP): less reliable, no heartbeats, no topic subscriptions

---

## ADR-004: DISTINCT ON for Latest Reading per Location
**Date:** Session 8  
**Status:** Active — CRITICAL

**Decision:** Use PostgreSQL's `DISTINCT ON (location_id)` in a native query instead of JPQL subqueries or max-by-group patterns.

**Why:** The original JPQL subquery `SELECT r FROM CrowdReading r WHERE r.capturedAt = (SELECT MAX(...))` caused a 500 error in production with Supabase. The subquery was translated to inefficient SQL that PostgreSQL's query planner rejected. `DISTINCT ON` is a PostgreSQL extension that solves this in a single pass, is index-friendly, and is supported by the existing index `idx_readings_location_time`.

**Code:**
```sql
SELECT DISTINCT ON (location_id)
  id, location_id, person_count, crowd_level, confidence, source, positions, captured_at, created_at
FROM crowd_readings
ORDER BY location_id, captured_at DESC
```

**DO NOT replace with JPQL.** It was tried and failed.

---

## ADR-005: Dual Route Architecture (/dashboard + /app)
**Date:** Session 7  
**Status:** Active

**Decision:** Serve both the organiser dashboard and the attendee mobile web app from the same Vite React build, on separate route trees (`/dashboard/*` and `/app/*`).

**Why:**
- Single deployment (one Vercel project)
- Shared code (utils, API client, WebSocket client)
- Role-based redirect: `ORGANIZER/ADMIN → /dashboard`, `ATTENDEE → /app`
- Attendees can browse `/app` without any account

**Route protection:**
- `/dashboard/*` guarded by `PrivateRoute` checking `localStorage.cs_role`
- `/app/*` public (no guard) — attendees access as guests

**Alternative rejected:** Separate React apps in `frontend-organiser/` and `frontend-attendee/` — doubles deployment complexity and eliminates code sharing.

---

## ADR-006: Expo Mobile App Paused
**Date:** Session 7  
**Status:** Paused

**Decision:** Pause the React Native Expo mobile app development. The attendee experience is provided by the `/app` route served as a mobile-responsive web app, testable in Chrome DevTools device emulation.

**Why:**
- Expo OTA updates caused install issues on physical device
- Chrome DevTools with Pixel 7 emulation gives identical testing surface
- Reduces project scope (mobile app is a Phase 5 item)
- Same React code works in browser with Leaflet maps

**Location of paused code:** `mobile_expo_paused/` — do not delete, may resume in Phase 5.

---

## ADR-007: Kalman Filter Fusion for Camera + WiFi
**Date:** Session 9  
**Status:** Active (simulation mode, real fusion ready for Pi hardware)

**Decision:** Use a 2-state Kalman filter to fuse camera (YOLOv8) and WiFi probe counts into a single estimate.

**Why:**
- Camera: accurate individual positions, but blind to people outside frame
- WiFi: counts people in range (including outside frame), but overcounts (multiple devices, passers-by)
- Kalman filter weights by noise variance: camera (σ=5) gets more weight than WiFi (σ=10)
- Graceful degradation: if one sensor fails, Kalman uses the other with appropriate uncertainty

**Weights:**
- Both online: camera = 0.65, WiFi = 0.35 (implicit via Kalman variances)
- Camera offline: WiFi-only mode (weight = 1.0)
- WiFi offline: camera-only mode (weight = 1.0)
- Both offline: last Kalman estimate + SENSOR_OFFLINE alert

---

## ADR-008: ML Service as Separate FastAPI Microservice
**Date:** Session 9  
**Status:** Active

**Decision:** Run the routing/recommendation ML logic as a separate Python FastAPI service, called by Spring Boot's `RouteService` via HTTP.

**Why:**
- Python is far better than Java for numerical algorithms (NumPy, heapq, scipy)
- Spring Boot can call the ML service with a 2-line `RestTemplate` call
- ML service is stateless — Spring Boot sends all context (crowd data, graph, stalls) in request body
- If ML service is down, `RouteService.java` falls back to simple direct-hop routing

**Fallback chain:**
```
GET /route
  → Spring Boot calls ML service
  → ML returns Dijkstra path
  [IF ML DOWN]
  → Spring Boot returns direct fallback route
```

---

## ADR-009: SQLite Offline Buffer on Edge
**Date:** Session 2  
**Status:** Active

**Decision:** Always write crowd readings to SQLite on the edge device FIRST, before attempting HTTP POST to the backend.

**Why:** If internet drops during a reading, data is not lost. The `sync_service.py` background thread checks connectivity every 30 seconds and bulk-uploads all `synced=0` rows.

**Deduplication:** The PostgreSQL schema has `UNIQUE (location_id, captured_at)` — duplicate uploads from sync are silently ignored by Supabase.

**Column `synced`:** 0 = pending, 1 = confirmed received by backend.

---

## ADR-010: Hardcoded Credentials in application.properties (Dev Only)
**Date:** Session 4  
**Status:** Dev OK, must fix before production

**Decision:** For development simplicity, Supabase credentials and JWT secret are hardcoded in `application.properties`.

**Risk:** If the repo is made public on GitHub, credentials leak.

**Required before production:**
```properties
# Replace hardcoded values with:
spring.datasource.password=${SUPABASE_PASSWORD}
jwt.secret=${JWT_SECRET}
```
And set environment variables in Render.com dashboard.

**See TASKS.md P4 for deployment checklist.**

---

## ADR-011: HikariCP Pool Size = 3
**Date:** Session 4  
**Status:** Active

**Decision:** Set HikariCP `maximum-pool-size=3` for Supabase connection.

**Why:** Supabase free tier allows max 60 database connections. The transaction pooler further limits to ~10 connections per client at the free tier. Setting pool size to 3 leaves headroom for direct SQL Editor connections during development, and scales to ~10 Spring Boot instances without hitting the limit.

---

## ADR-012: DataInitializer seeds on every startup
**Date:** Session 8  
**Status:** Active

**Decision:** `DataInitializer.java` runs `CommandLineRunner` and uses `findByEmail().isEmpty()` guards before inserting.

**Why:** Idempotent seeding — safe to run on every startup. If admin already exists, does nothing. Avoids needing manual SQL inserts for development setup.

**Seeds:**
- `admin@crowdsense.dev` / `admin123` (ADMIN role)
- `organizer@demo.com` / `demo1234` (ORGANIZER role)
- `loc_001` — Main Entrance location (standalone sensor demo)
- Demo event linked to organizer@demo.com

---

## ADR-013: CORS `*` Wildcard (Dev Only)
**Date:** Session 3  
**Status:** Dev OK, must restrict before production

**Decision:** All controllers use `@CrossOrigin(origins = "*")` for development.

**Required for production:** Restrict to the specific Vercel domain:
```java
@CrossOrigin(origins = {"https://crowdsense.vercel.app", "http://localhost:3000"})
```

---

*This log is maintained as part of the project documentation. Add a new ADR when a significant architectural choice is made.*
