# CLAUDE.md — CrowdSense AI Session Context
> Attach this file at the start of every new chat. It tells the AI exactly what the project is, what has been built, and what the ground truth codebase state is.

---

## Project Identity

**Name:** CrowdSense  
**Type:** Smart Crowd Monitoring & Safe-Route SaaS Platform  
**Student:** 2nd year, portfolio project  
**Stack:** Spring Boot (Java 17) + React.js + Python edge agent + Supabase (PostgreSQL)  
**Master Doc:** `docs/CrowdSense_Master_v7.md` — full architecture reference

---

## What This System Does

A real-time crowd density monitoring system for events and public spaces:
1. A Python edge agent (laptop or Raspberry Pi) detects crowd density using simulated data, a pre-recorded video, or live YOLOv8 + WiFi probe
2. Data is sent to a Spring Boot REST API and stored in Supabase PostgreSQL
3. Spring Boot broadcasts updates via WebSocket (STOMP over native WS) to connected clients
4. An **Organiser dashboard** (`/dashboard`) allows event managers to create events, draw map zones, view live crowd heatmaps, and manage alerts
5. An **Attendee web app** (`/app`) lets public users find events, view crowd levels, and get smart routes to stalls
6. A Python FastAPI ML microservice runs Dijkstra routing, stall recommendations, and reroute decisions

---

## Verified Working Credentials (DO NOT CHANGE)

### Supabase — Transaction Pooler
```
URL:      jdbc:postgresql://aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&prepareThreshold=0
Username: postgres.leihwymwbxgzvzasskzy
Password: Crowd@#101716
Project:  leihwymwbxgzvzasskzy
```

### JWT
```
Secret:   404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
Expiry:   86400000 ms (24h)
```

### Demo Users (seeded by DataInitializer on startup)
```
Admin:      admin@crowdsense.dev   / admin123
Organiser:  organizer@demo.com     / demo1234
```

### Frontend .env
```
VITE_BACKEND_URL=http://localhost:8080
VITE_ML_SERVICE_URL=http://localhost:8001
VITE_APP_TITLE=CrowdSense
```

---

## Tech Stack — Exact Versions

| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | Spring Boot | 3.2.5 |
| Backend Lang | Java | 17 |
| Backend ORM | Spring Data JPA + Hibernate | via Boot |
| Backend Auth | Spring Security + jjwt | 0.11.5 |
| Backend WS | Spring WebSocket STOMP | via Boot |
| Database | Supabase PostgreSQL | latest |
| Edge AI | Python + Ultralytics YOLOv8 | yolov8n.pt |
| Edge Fusion | Kalman filter (filterpy) | custom |
| Edge Comms | paho-mqtt (local Mosquitto) | optional |
| Frontend | React + Vite | 18.3 / 5.2 |
| Frontend Router | react-router-dom | 6.23 |
| Frontend Map | Leaflet + react-leaflet | 1.9.4 / 4.2.1 |
| Frontend WS | @stomp/stompjs | 7.0 (native WS — no SockJS) |
| Frontend Charts | chart.js + react-chartjs-2 | 4.4 / 5.2 |
| Frontend Geo | @turf/turf | 6.5 |
| ML Service | FastAPI + uvicorn | latest |
| ML Routing | Custom Dijkstra (pure Python) | — |

---

## Repository Structure

```
crowdsense/
├── backend/                  Spring Boot application
├── edge/                     Python sensor agent (YOLOv8 + WiFi + Kalman)
├── frontend/                 React Vite app (/dashboard + /app routes)
├── ml/                       Python FastAPI microservice
├── mobile_expo_paused/       Archived — NOT used
├── docs/                     Architecture docs
├── HOW_TO_RUN.md             Quick start guide
├── CLAUDE.md                 ← This file
├── PROJECT_STATUS.md         Health report
├── TASKS.md                  Prioritised TODO list
└── DECISIONS.md              Architecture decision log
```

---

## Quick Start Commands

```bash
# Terminal 1 — Backend
cd backend && mvn spring-boot:run

# Terminal 2 — Frontend
cd frontend && npm install && npm run dev
# Dashboard: http://localhost:3000/dashboard  (organizer@demo.com / demo1234)
# Mobile:    http://localhost:3000/app        (no login needed, browse as guest)

# Terminal 3 — Sensor agent (simulation mode)
cd edge && pip install requests ultralytics opencv-python
python sensor_agent.py

# Terminal 4 — ML service (optional, routing degrades gracefully without it)
cd ml && pip install fastapi uvicorn
uvicorn ml.main:app --port 8001 --reload
```

---

## Critical Architecture Notes

### WebSocket: NO SockJS
The frontend uses `@stomp/stompjs` with native WebSocket (`brokerURL: ws://...`). SockJS has been removed because it caused `ReferenceError: global is not defined` in Vite. **Never reintroduce SockJS.**

### Supabase: Transaction Pooler Only
Must use port **6543** (transaction mode) with `prepareThreshold=0`. Direct connection (port 5432) and session pooler (port 5432 with different host) are blocked on the free tier in this region.

### Dual Dashboard Architecture
- `/dashboard/*` — Organiser/Admin (requires JWT with role ORGANIZER or ADMIN)
- `/app/*` — Attendee (no login required, public browsing)
- Both served from the same Vite build (`frontend/`)
- Role detected at login, redirects to correct path

### Backend Dual Entry Point Bug (KNOWN — SEE PROJECT_STATUS.md)
There are TWO main class files:
- `backend/src/main/java/com/crowdsense/CrowdSenseApplication.java` ← CORRECT one
- `backend/src/main/java/com/crowdsense/backend/BackendApplication.java` ← should be deleted

### DISTINCT ON Fix
`CrowdReadingRepository.findLatestPerLocation()` uses PostgreSQL `DISTINCT ON` native query to get the most recent reading per location. **Do not replace with JPQL** — it caused a 500 error and was fixed in session 8.

---

## API Base URL
Local: `http://localhost:8080/api/v1`

Key endpoints:
- `GET  /readings/health` — liveness check
- `POST /readings` — submit reading from sensor (no auth)
- `GET  /readings/latest` — latest per location
- `GET  /events` — public event list
- `GET  /events/search?q=&city=&lat=&lng=` — full-text + geo search
- `GET  /events/{id}` — event detail + zones + crowd summary
- `POST /auth/login` — returns `{token, role, email}`
- `POST /sync/bulk` — batch upload from SQLite buffer
- `GET  /route?fromZone=&toStall=&eventId=` — smart routing (proxied to ML)

---

## WebSocket Topics
```
/topic/crowd          — every new crowd reading {locationId, personCount, crowdLevel, positions, capturedAt}
/topic/alerts         — new alert {locationId, alertType, crowdLevel, message, triggeredAt}
/topic/sensor-status  — sensor online/offline status changes
/topic/events/{id}    — per-event crowd updates
```

---

## How to Start a New Chat Session

Paste at the top:
> "I am building CrowdSense. Read CLAUDE.md + PROJECT_STATUS.md for full context. Current phase: [PHASE]. Continuing from: [last thing done]. Next task: [task from TASKS.md]."

Then attach: `CLAUDE.md`, `PROJECT_STATUS.md`, `TASKS.md`

---

*Last updated: Session 9 audit — June 2026*
