# CrowdSense — Master Project Document v7.0

**Smart Crowd Monitoring & Safe-Route SaaS Platform**
_May 2026 | ATTACH THIS TO EVERY NEW CHAT SESSION_

---

## Current Session Status (Session 9 — Planning Overhaul)

| Session   | Focus                                                                                                                                                     | Status         |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1–3       | Architecture, Spring Boot skeleton, edge agent, frontend skeleton                                                                                         | ✅ Complete    |
| 4         | Supabase hostname fix, Expo setup, simulation files                                                                                                       | ✅ Complete    |
| 5         | Backend connection fix, offline resilience design, event platform design                                                                                  | ✅ Complete    |
| 6         | Expo OTA fix, scrcpy guide, offline tech analysis                                                                                                         | ✅ Complete    |
| 7         | Expo replaced with React /app route + Chrome DevTools emulation                                                                                           | ✅ Complete    |
| 8         | 500 error fixed, JWT auth, DataInitializer, sensor agent rewrite                                                                                          | ✅ Complete    |
| 9 (this)  | Full architecture overhaul: hybrid ML model, real offline pipeline, dual dashboard, zone drawing, dynamic crowd map, search, smart routing, system design | 🔄 In Progress |
| 10 (next) | Build Phase 4: React dashboard v2 — zone drawing, crowd heatmap, dual login, smart routing UI                                                             | Planned        |
| 11        | Phase 5: ML service v2 — YOLOv8 + WiFi fusion, CNN model, route recommendation                                                                            | Planned        |
| 12        | Phase 6: Deployment + Redis + Rate limiting                                                                                                               | Planned        |

---

## Table of Contents

1. [What Changed in v7 — Executive Summary](#1-what-changed-in-v7)
2. [Full System Architecture — Production SaaS](#2-full-system-architecture)
3. [Offline-First Pipeline — Every Failure Scenario](#3-offline-first-pipeline)
4. [Hybrid ML Crowd Detection — WiFi + Camera + Fusion](#4-hybrid-ml-crowd-detection)
5. [Dual Dashboard Design — Organizer vs Attendee](#5-dual-dashboard-design)
6. [Zone Drawing on Map](#6-zone-drawing-on-map)
7. [Dynamic Crowd Visualization — Live Points on Map](#7-dynamic-crowd-visualization)
8. [Search Feature — Events, Cities, Addresses](#8-search-feature)
9. [Smart Routing with Waypoints — Dijkstra on Live Crowd Data](#9-smart-routing-with-waypoints)
10. [Real Demo Data — Not Fake Random Numbers](#10-real-demo-data)
11. [Production System Design — Parallelism, Concurrency, Resilience](#11-production-system-design)
12. [Complete Data Flow — Every Online/Offline Case](#12-complete-data-flow)
13. [Updated Folder Structure](#13-updated-folder-structure)
14. [Database Schema — Complete v7](#14-database-schema)
15. [API Endpoints Reference — Complete v7](#15-api-endpoints-reference)
16. [WebSocket Events Reference](#16-websocket-events-reference)
17. [Phase Build Plan — Updated](#17-phase-build-plan)
18. [Verified Working Credentials](#18-verified-working-credentials)
19. [Known Issues and Fixes](#19-known-issues-and-fixes)
20. [How to Start the Next Chat](#20-how-to-start-the-next-chat)

---

## 1. What Changed in v7

### Core Problems Solved

| Problem           | v6 Behavior                    | v7 Fix                                                                   |
| ----------------- | ------------------------------ | ------------------------------------------------------------------------ |
| Offline detection | SQLite buffer only             | Full MQTT mesh + local processing + LocalStorage fallback on frontend    |
| ML model          | YOLOv8 only (simulated random) | YOLOv8 + WiFi MAC fusion + DeepSORT tracker → real video file demo       |
| Single dashboard  | One login, one view            | Organizer portal vs Attendee mobile web — two separate JWT roles         |
| Map               | Static Leaflet markers         | Zone drawing (polygon tool) + live crowd dot cloud refreshing every 5s   |
| Search            | None                           | PostgreSQL FTS + PostGIS geo-search + city/event/address search UI       |
| Routing           | None                           | Dijkstra on zone graph weighted by live crowd density → waypoint trail   |
| Demo data         | Random integers                | Recorded video file through YOLOv8 + simulated WiFi MAC stream           |
| System design     | Single Spring Boot             | Event-driven: Redis Streams, partitioned consumers, ML microservice pool |

---

## 2. Full System Architecture

### Layer Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  EDGE LAYER  (Raspberry Pi / Laptop Simulation)                                     │
│                                                                                     │
│  ┌──────────────┐   ┌────────────────┐   ┌───────────────────┐   ┌──────────────┐  │
│  │ Camera Input │──▶│ YOLOv8n + SORT │──▶│                   │──▶│ SQLite       │  │
│  │ (video/live) │   │ Person counter │   │  sensor_agent.py  │   │ Buffer       │  │
│  └──────────────┘   └────────────────┘   │  Fusion Engine    │   │ (always on)  │  │
│  ┌──────────────┐   ┌────────────────┐   │                   │   └──────┬───────┘  │
│  │ WiFi Probe   │──▶│ MAC Dedup +    │──▶│  Count = 0.6×cam  │          │          │
│  │ (Scapy/sim)  │   │ RSSI estimator │   │      + 0.4×wifi   │          │ HTTP/MQTT│
│  └──────────────┘   └────────────────┘   └───────────────────┘          ▼          │
│                                                                   ┌──────────────┐  │
│                                                              MQTT │ Local Broker │  │
│                                                            (Mosq) │  port 1883   │  │
└──────────────────────────────────────────────────────────────────┴──────┬────────┘
                                                                           │ MQTT publish
                                                                           │ OR HTTP POST
                                                                           ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  INGESTION LAYER  (Spring Boot — port 8080)                                         │
│                                                                                     │
│  POST /api/v1/readings ──▶ Validation ──▶ Redis Stream "crowd:raw"                  │
│  POST /api/v1/sync/bulk ──▶ Validation ──▶ Redis Stream "crowd:raw" (batched)       │
│  MQTT subscriber (crowd/readings topic) ──▶ Redis Stream "crowd:raw"               │
│                                                                                     │
│  ┌──────────────────────────────────────────────────────────────────────────────┐   │
│  │  Redis Streams Consumer Group "crowd-processors"                             │   │
│  │                                                                              │   │
│  │  Consumer 1: DB Writer ──────────▶ Supabase PostgreSQL                      │   │
│  │  Consumer 2: Alert Checker ───────▶ Create alert if HIGH/CRITICAL           │   │
│  │  Consumer 3: WebSocket Broadcast ─▶ /topic/crowd, /topic/events/{id}        │   │
│  │  Consumer 4: FCM Notifier ────────▶ Firebase (CRITICAL only)                │   │
│  │  Consumer 5: ML Enricher ─────────▶ Python ML service /enrich               │   │
│  └──────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────┘
                    │                         │                    │
          ┌─────────▼──────────┐   ┌──────────▼─────┐   ┌────────▼──────────┐
          │  Supabase          │   │  Redis Cache   │   │  Python ML        │
          │  PostgreSQL        │   │  TTL 10s       │   │  Microservice     │
          │  (primary store)   │   │  latest reads  │   │  FastAPI :8001    │
          └─────────┬──────────┘   └────────────────┘   └────────┬──────────┘
                    │                                             │
┌───────────────────▼─────────────────────────────────────────────▼──────────────────┐
│  PRESENTATION LAYER                                                                 │
│                                                                                     │
│  React /dashboard  ──  Organizer portal: event CRUD, zone drawing, heatmap, alerts │
│  React /app        ──  Attendee view: crowd status, stall search, smart routing     │
│  Both routes served from same Vite build, different JWT role claims                 │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibility Matrix

| Component         | Owns                                                           | Does NOT own                         |
| ----------------- | -------------------------------------------------------------- | ------------------------------------ |
| sensor_agent.py   | Detection, fusion, SQLite write, MQTT publish                  | Backend logic, alerts                |
| Spring Boot       | REST API, WebSocket, JWT auth, event CRUD, alert creation      | ML computation, routing              |
| Redis Streams     | Message passing, buffering spikes                              | Data persistence                     |
| Supabase          | Persistent data store                                          | Real-time push (Spring handles that) |
| Python ML Service | YOLOv8 inference on video, route scoring, stall recommendation | Data storage                         |
| React /dashboard  | Organizer UI: zones, events, heatmap, alerts panel             | Attendee features                    |
| React /app        | Attendee UI: search, routing, stall list, crowd status         | Admin features                       |

---

## 3. Offline-First Pipeline — Every Failure Scenario

### Failure Mode Matrix

| Failure                     | Detected How                              | Data Continuity                                                          | UI Behavior                                           |
| --------------------------- | ----------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------- |
| Internet drops at venue     | HTTP POST returns timeout                 | SQLite accumulates, MQTT continues locally                               | Dashboard shows "Last seen X min ago" badge           |
| Supabase pauses (free tier) | Spring Boot connection pool error         | Spring Boot in-memory queue holds 500 readings                           | Admin sees warning banner                             |
| Camera offline              | No frames from OpenCV                     | WiFi-only mode activates, weight shifts to 1.0×wifi                      | Dashboard shows camera icon with offline badge        |
| WiFi probe offline          | No new MACs                               | Camera-only mode activates, weight shifts to 1.0×camera                  | Dashboard shows WiFi icon with offline badge          |
| Both sensors offline        | sensor_agent detects no input             | Last known reading held + SENSOR_OFFLINE alert fired                     | Dashboard shows red SENSOR OFFLINE alert              |
| Spring Boot (Render) sleeps | WebSocket drops, REST 503                 | Edge SQLite continues buffering                                          | Frontend shows stale banner + polls /health every 30s |
| Edge device power outage    | N/A — no process                          | SQLite on disk is safe. On restart agent reads all unsynced rows         | Full historical sync on reconnect                     |
| Redis down                  | Spring Boot log: JedisConnectionException | Fall back to synchronous write (no stream) — slightly slower but correct | No user impact                                        |
| ML service down             | 503 from /recommend                       | Fall back to rule-based: sort stalls by inverse crowd density            | Attendee sees recommendations, just less personalized |

### Local Alert System (Internet-Independent)

This runs INSIDE `sensor_agent.py` — no internet required:

```python
# edge/local_alert.py
import os, time

CRITICAL_THRESHOLD = 75  # persons

def check_local_alert(person_count, crowd_level, location_id):
    if crowd_level == "CRITICAL":
        _play_audio_alert()          # pygame — Pi audio jack
        _flash_gpio_led()            # RPi.GPIO pin 17 — red LED
        _write_alert_log(person_count, location_id)
        _broadcast_local_network(person_count, location_id)  # UDP broadcast port 5555

def _broadcast_local_network(count, location_id):
    # Other Pi units on same LAN receive this via UDP
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
    msg = f"CRITICAL:{location_id}:{count}".encode()
    sock.sendto(msg, ('<broadcast>', 5555))
```

### MQTT Offline Mesh Architecture

```
[Pi Zone A]──MQTT──▶[Mosquitto Broker on Pi A, port 1883]
                              │
[Pi Zone B]──MQTT─────────────┤  (all on same WiFi LAN or Pi hotspot)
[Pi Zone C]──MQTT─────────────┤
                              │
                    [Spring Boot MQTT Subscriber]
                    (paho-mqtt or Spring Integration)
                              │
                    [Redis Stream crowd:raw]
```

When internet drops:

- Mosquitto broker stays alive on Pi (no internet needed)
- All Pi units keep publishing to MQTT
- Spring Boot subscribes to MQTT locally (same LAN)
- Spring Boot writes to local in-memory queue (if Supabase down)
- Spring Boot WebSocket still broadcasts to connected dashboard clients on LAN

**This means the dashboard works COMPLETELY OFFLINE on local LAN.**

### Offline Data Sync Sequence

```
OFFLINE PERIOD:
  sensor_agent.py → SQLite (every 5s, never misses)
  sensor_agent.py → MQTT broker (local LAN)
  Spring Boot subscriber → in-memory ring buffer (max 10,000 readings)

RECONNECT EVENT:
  1. Spring Boot detects Supabase available (connection pool health check)
  2. Drains in-memory ring buffer to Supabase (batch insert 500/request)
  3. sensor_agent.py detects internet available
  4. sync_service.py uploads all SQLite rows with synced=0
  5. Both paths deduplicate via (location_id, captured_at) unique constraint
```

---

## 4. Hybrid ML Crowd Detection — WiFi + Camera + Fusion

### Why Hybrid is More Accurate

| Method             | Strength                                             | Weakness                                                                                 |
| ------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Camera (YOLOv8)    | Exact person count in frame, positional data         | Occlusion in dense crowds; limited field of view                                         |
| WiFi Probe (Scapy) | Counts people OUTSIDE camera frame; penetrates walls | Counts devices not people; double-counts multi-device people; varies with phone settings |
| Hybrid Fusion      | Compensates for each weakness                        | Requires calibration weights per venue                                                   |

### Methods We Use (Ordered by Accuracy Contribution)

#### Method 1: YOLOv8 + DeepSORT Tracking (Primary Camera Count)

YOLOv8 detects person bounding boxes per frame. DeepSORT assigns persistent IDs across frames, so a person walking through multiple frames is counted once, not N times.

```python
# edge/crowd_detector.py

from ultralytics import YOLO
from deep_sort_realtime.deepsort_tracker import DeepSort

model = YOLO("yolov8n.pt")
tracker = DeepSort(max_age=30, n_init=3, nn_budget=100)

def detect_with_tracking(frame):
    results = model(frame, classes=[0], verbose=False)  # class 0 = person
    detections = []
    for box in results[0].boxes:
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        conf = float(box.conf[0])
        detections.append(([x1, y1, x2 - x1, y2 - y1], conf, 'person'))

    tracks = tracker.update_tracks(detections, frame=frame)
    active_ids = [t.track_id for t in tracks if t.is_confirmed()]

    # Return unique person count in this frame + their centroid positions
    positions = []
    for t in tracks:
        if t.is_confirmed():
            ltrb = t.to_ltrb()
            cx = (ltrb[0] + ltrb[2]) / 2
            cy = (ltrb[1] + ltrb[3]) / 2
            positions.append({"id": t.track_id, "cx": cx, "cy": cy})

    return len(active_ids), positions
```

**Why DeepSORT over plain YOLOv8 count:**

- Without tracking: 50 people in 10 frames = 500 "detections" if you just sum boxes
- With tracking: 50 people assigned 50 unique IDs = 50 actual people
- In dense crowds (100+ people) this is 30-40% more accurate

#### Method 2: WiFi Probe MAC Deduplication + RSSI Zone Estimation

```python
# edge/wifi_probe.py

from scapy.all import sniff, Dot11  # real Pi
# OR simulated on laptop

import time, random, hashlib
from collections import defaultdict

# Time window: count unique MACs seen in last 60 seconds
# Why 60s: A person walking through stays in range for ~20-60s
# MACs seen more than 60s ago are considered "left"

class WifiProbe:
    def __init__(self, window_seconds=60):
        self.window = window_seconds
        self.mac_timestamps = {}  # mac → last_seen_epoch
        self.mac_rssi = {}        # mac → rssi (signal strength = proxy for distance)

    def process_packet(self, pkt):
        if pkt.haslayer(Dot11):
            mac = pkt.addr2
            if mac and mac != "ff:ff:ff:ff:ff:ff":
                # Anonymize MAC for privacy
                anon = hashlib.sha256(mac.encode()).hexdigest()[:12]
                self.mac_timestamps[anon] = time.time()
                if hasattr(pkt, 'dBm_AntSignal'):
                    self.mac_rssi[anon] = pkt.dBm_AntSignal

    def get_count(self):
        now = time.time()
        cutoff = now - self.window
        # Only count MACs seen recently
        active = {m: t for m, t in self.mac_timestamps.items() if t > cutoff}

        # RSSI-based zone: MACs with RSSI > -60dBm are "close" (within 10m)
        close = sum(1 for m in active if self.mac_rssi.get(m, -100) > -60)
        far   = len(active) - close

        # Correction factor: not every device = 1 person
        # Empirically: ~0.7 devices per person in a crowd (some have 2 devices, some have 0)
        corrected = (close * 0.8 + far * 0.6)
        return int(corrected), len(active)  # corrected_persons, raw_mac_count
```

#### Method 3: Kalman Filter Fusion (Camera + WiFi → Single Reading)

```python
# edge/fusion_engine.py

import numpy as np

class CrowdFusionKalman:
    """
    Kalman filter that fuses camera count + wifi count into single estimate.
    State: [person_count, count_velocity]
    Measurements: [camera_count, wifi_corrected_count]
    """
    def __init__(self):
        self.x = np.array([0.0, 0.0])          # state: [count, rate_of_change]
        self.P = np.eye(2) * 100                # covariance
        self.F = np.array([[1, 1], [0, 1]])     # state transition: count += rate
        self.H_cam   = np.array([[1, 0]])       # camera measures count directly
        self.H_wifi  = np.array([[1, 0]])       # wifi also measures count
        self.R_cam   = np.array([[25]])         # camera noise variance (std=5 persons)
        self.R_wifi  = np.array([[100]])        # wifi noise variance (std=10 persons)
        self.Q = np.array([[1, 0], [0, 0.1]])   # process noise

    def predict(self):
        self.x = self.F @ self.x
        self.P = self.F @ self.P @ self.F.T + self.Q

    def update(self, measurement, H, R):
        y = measurement - H @ self.x
        S = H @ self.P @ H.T + R
        K = self.P @ H.T @ np.linalg.inv(S)
        self.x = self.x + K @ y
        self.P = (np.eye(2) - K @ H) @ self.P

    def fuse(self, camera_count=None, wifi_count=None):
        self.predict()
        if camera_count is not None:
            self.update(np.array([camera_count]), self.H_cam, self.R_cam)
        if wifi_count is not None:
            self.update(np.array([wifi_count]), self.H_wifi, self.R_wifi)
        return max(0, int(round(self.x[0])))
```

**Why Kalman Filter:**

- If camera goes offline, Kalman uses WiFi reading with higher noise → still gives estimate
- If WiFi goes offline, Kalman uses camera reading → still works
- If both available, Kalman weights them by their noise variances → optimal fusion
- Smooths out per-frame jitter (a crowd of 50 doesn't suddenly become 30 in one frame)

#### Method 4: Crowd Density Estimation via CNN (For Dense Crowd > 50 People)

At high densities (100+ people), individual bounding boxes overlap and YOLOv8 undercounts. We add a density map estimation model:

```python
# ml/density_estimator.py
# Uses CSRNet (Crowd Counting via Convolutional Neural Networks)
# Pre-trained on ShanghaiTech dataset — NO training needed

import torch
import torchvision.transforms as transforms
from PIL import Image
import numpy as np

class CSRNetEstimator:
    """
    CSRNet produces a density map where each pixel value represents
    fractional crowd density. Summing the map gives total count.
    Works better than bounding box detection for >50 people.
    """
    def __init__(self, model_path="models/csrnet_shanghaitech.pth"):
        self.model = self._load_model(model_path)
        self.transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])

    def estimate(self, frame_bgr):
        img = Image.fromarray(frame_bgr[:, :, ::-1])  # BGR to RGB
        tensor = self.transform(img).unsqueeze(0)
        with torch.no_grad():
            density_map = self.model(tensor)
        count = density_map.sum().item()
        # Density map also gives spatial heatmap for visualization
        heatmap = density_map.squeeze().numpy()
        return int(round(count)), heatmap
```

**Model choice by crowd density (automatic switching):**

```python
def get_count(frame, prev_count):
    if prev_count < 30:
        # Sparse: YOLOv8 + DeepSORT is most accurate (individual tracking)
        count, positions = yolo_tracker.detect_with_tracking(frame)
        return count, positions, None
    elif prev_count < 100:
        # Medium: Both methods, average
        yolo_count, positions = yolo_tracker.detect_with_tracking(frame)
        density_count, heatmap = csrnet.estimate(frame)
        count = int(0.5 * yolo_count + 0.5 * density_count)
        return count, positions, heatmap
    else:
        # Dense: CSRNet is far more accurate for crowds > 100
        count, heatmap = csrnet.estimate(frame)
        return count, [], heatmap  # no individual positions at this density
```

### Fusion Weight Summary

```
Final Count = Kalman_Fuse(
    camera_input  = adaptive_model(frame, prev_count),   # YOLOv8 or CSRNet
    wifi_input    = wifi_probe.get_corrected_count()
)

Adaptive weights (when both online):
  camera_weight = 0.65 (more reliable for position)
  wifi_weight   = 0.35 (corrects for out-of-frame people)

Fallback weights (one sensor offline):
  camera_only: weight = 1.0, wifi_weight = 0
  wifi_only:   weight = 0, wifi_weight = 1.0 (corrected count)
  both offline: last Kalman estimate + SENSOR_OFFLINE alert
```

---

## 5. Dual Dashboard Design — Organizer vs Attendee

### Authentication Flow

```
POST /api/v1/auth/login
  body: { email, password }
  response: { token, role: "ORGANIZER" | "ATTENDEE" | "ADMIN", userId }

JWT payload:
  { sub: email, role: "ORGANIZER", userId: "uuid", eventIds: ["uuid1","uuid2"] }

Frontend routing after login:
  role = "ORGANIZER" → redirect to /dashboard
  role = "ATTENDEE"  → redirect to /app
  role = "ADMIN"     → redirect to /dashboard (full access)
```

### Organizer Portal (/dashboard)

**What they see:**

- Left sidebar: My Events list, Create Event button
- Event detail view: Zone map editor, live crowd heatmap, sensor status
- Analytics: Chart.js time-series for each zone, daily/weekly trend, peak detection
- Alert center: All alerts for their events, resolve buttons
- Stall manager: Add/edit stalls, assign to zones, upload images
- Export: Download crowd data as CSV or PDF report

**Key organizer-only features:**

- Zone drawing tool (draw polygons on Leaflet map)
- Sensor assignment (link `location_id` to zone polygon)
- Capacity configuration per zone
- Alert threshold settings per zone (override defaults)
- Event lifecycle: DRAFT → LIVE → ENDED

### Attendee View (/app)

**What they see:**

- Event search bar (city, event name, date)
- Nearby events list (uses browser geolocation if granted)
- Event detail: zone map with live crowd dots
- Stall browser: filter by category (food/merch/activity), sort by crowd (least busy first)
- Smart routing: tap a stall, get waypoint trail
- Crowd alerts: push notification if CRITICAL crowd approaching user's current zone

**Attendees do NOT need to create an account.** They browse as guests. Account optional for saved preferences.

### Role-Based API Gating

```
Public (no auth):        GET /events, GET /events/search, GET /events/{id}
                         GET /readings/latest, GET /readings/location/{id}
                         GET /recommend, POST /auth/login, POST /auth/register

Organizer (JWT + role):  POST /events, PUT /events/{id}, DELETE /events/{id}
                         POST /locations (zones), PUT /locations/{id}
                         PUT /alerts/{id}/resolve
                         GET /events/{id}/analytics (their events only)
                         POST /events/{id}/stalls, PUT /stalls/{id}

Admin (JWT + ADMIN):     All above + GET /admin/all-events + user management
```

---

## 6. Zone Drawing on Map

### How It Works

Organizers draw zone polygons directly on the Leaflet map. Each polygon becomes a `location` record in the database with a GeoJSON polygon boundary stored in PostGIS.

### Frontend Implementation

```jsx
// frontend/src/components/ZoneEditor.jsx
// Uses Leaflet.draw plugin for polygon drawing

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";

export default function ZoneEditor({ eventId, onZoneSaved }) {
  const mapRef = useRef(null);
  const drawnItems = useRef(new L.FeatureGroup());

  useEffect(() => {
    const map = L.map(mapRef.current, { center: [28.6139, 77.209], zoom: 18 });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(
      map,
    );
    drawnItems.current.addTo(map);

    const drawControl = new L.Control.Draw({
      edit: { featureGroup: drawnItems.current },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          shapeOptions: { color: "#6366f1", fillOpacity: 0.2 },
        },
        rectangle: true,
        // Disable non-useful tools
        circle: false,
        circlemarker: false,
        polyline: false,
        marker: false,
      },
    });
    map.addControl(drawControl);

    map.on(L.Draw.Event.CREATED, (e) => {
      const layer = e.layer;
      drawnItems.current.addLayer(layer);

      // Prompt for zone name
      const name = prompt(
        "Zone name (e.g. Main Stage, Food Court, Entry Gate):",
      );
      if (name) {
        const geoJson = layer.toGeoJSON();
        onZoneSaved({ name, geoJson, eventId });
      }
    });

    return () => map.remove();
  }, []);

  return <div ref={mapRef} style={{ height: "500px", width: "100%" }} />;
}
```

### Backend Zone Save

```java
// POST /api/v1/locations  (organizer creates a zone)
// LocationDTO includes: name, eventId, geoJsonPolygon, maxCapacity

// Stored in PostgreSQL as PostGIS geometry:
// ALTER TABLE locations ADD COLUMN boundary GEOMETRY(POLYGON, 4326);
// UPDATE locations SET boundary = ST_GeomFromGeoJSON(:geoJson) WHERE id = :id;
```

### Attendee Zone Interaction (Select & View Stats)

Attendees tap on any zone polygon on the map:

- Zone highlights with blue border
- Slide-up panel shows: person count, crowd level badge, capacity bar, stall list for that zone
- Zone stats refresh every 5 seconds via REST polling (no WebSocket needed for attendees)

```jsx
// In attendee map view
map.on("click", (e) => {
  const clickedZone = zones.find((z) =>
    L.geoJSON(z.boundary).getBounds().contains(e.latlng),
  );
  if (clickedZone) {
    setSelectedZone(clickedZone);
    fetchZoneStats(clickedZone.id); // GET /readings/location/{id}?limit=1
  }
});
```

---

## 7. Dynamic Crowd Visualization — Live Points on Map

### Concept

Rather than just colored circles for zones, we show actual crowd "dot clouds" — a cluster of points on the map representing estimated positions of people, refreshing every 5 seconds.

### How Positions Are Generated

**When camera is online:** YOLOv8 + DeepSORT gives us bounding box centroids in pixel space. We transform these to lat/lng using a homography matrix calibrated when the organizer sets up the camera (they tap 4 corners of the frame on the map).

**When only WiFi probe is online:** We distribute N points randomly within the zone polygon boundary (weighted by RSSI — stronger signal = closer to probe = cluster near center).

**When neither is online:** No dots shown — zone polygon shows with "no data" styling.

```javascript
// frontend/src/utils/crowdDots.js

export function generateCrowdDots(zone, personCount, positions) {
  if (positions && positions.length > 0) {
    // Real positions from camera — convert pixel to lat/lng
    return positions.map((p) => ({
      lat: pixelToLat(p.cy, zone.calibration),
      lng: pixelToLng(p.cx, zone.calibration),
      id: p.id,
    }));
  }
  // Fallback: random distribution within zone polygon
  return randomPointsInPolygon(zone.boundary, personCount);
}

function randomPointsInPolygon(geojson, n) {
  const bbox = turf.bbox(geojson);
  const points = [];
  while (points.length < n) {
    const candidate = turf.randomPoint(1, { bbox }).features[0];
    if (turf.booleanPointInPolygon(candidate, geojson)) {
      points.push({
        lat: candidate.geometry.coordinates[1],
        lng: candidate.geometry.coordinates[0],
      });
    }
  }
  return points;
}
```

### Frontend Rendering (Canvas Layer for Performance)

Leaflet's SVG layer is too slow for 500+ dots refreshing every 5s. We use an HTML Canvas overlay:

```jsx
// frontend/src/components/CrowdDotLayer.jsx
// Uses Leaflet.CanvasLayer for 60fps rendering

import { useEffect, useRef } from "react";
import L from "leaflet";

export default function CrowdDotLayer({ map, dots, crowdLevel }) {
  const canvasRef = useRef(null);

  const COLORS = {
    LOW: "#22c55e",
    MEDIUM: "#f59e0b",
    HIGH: "#f97316",
    CRITICAL: "#ef4444",
  };

  useEffect(() => {
    if (!map || !dots.length) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const color = COLORS[crowdLevel] || "#6366f1";

    dots.forEach((dot) => {
      const point = map.latLngToContainerPoint([dot.lat, dot.lng]);
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color + "CC"; // slight transparency
      ctx.fill();
    });
  }, [dots, crowdLevel]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
    />
  );
}
```

### Refresh Cycle

```javascript
// Dots refresh every 5 seconds
// New dots animate from previous positions (smooth transition)
useEffect(() => {
  const interval = setInterval(async () => {
    const data = await getCrowdReadings(locationId);
    const newDots = generateCrowdDots(zone, data.personCount, data.positions);
    animateDotsTransition(prevDots, newDots, setDots); // lerp over 500ms
  }, 5000);
  return () => clearInterval(interval);
}, [locationId]);
```

---

## 8. Search Feature — Events, Cities, Addresses

### Search UI

Search bar is present in the attendee /app header. Supports:

- Event name: "Sunburn Festival"
- City: "Pune"
- Partial address: "NSCI Dome"
- Event tag: "music"

### Backend Search Endpoint

```java
// GET /api/v1/events/search?q=sunburn+festival&city=pune&lat=18.52&lng=73.85&radius=50

@GetMapping("/search")
public ResponseEntity<Page<EventDTO>> searchEvents(
    @RequestParam String q,
    @RequestParam(required = false) String city,
    @RequestParam(required = false) Double lat,
    @RequestParam(required = false) Double lng,
    @RequestParam(defaultValue = "50") int radius,  // km
    @RequestParam(defaultValue = "0") int page,
    @RequestParam(defaultValue = "20") int size
) {
    return ResponseEntity.ok(eventService.search(q, city, lat, lng, radius, page, size));
}
```

```sql
-- PostgreSQL FTS + PostGIS combined query
SELECT e.*,
       ST_Distance(
         ST_MakePoint(e.longitude, e.latitude)::geography,
         ST_MakePoint(:lng, :lat)::geography
       ) / 1000 AS distance_km,
       ts_rank(
         to_tsvector('english', e.name || ' ' || COALESCE(e.city,'') || ' ' || COALESCE(e.description,'')),
         plainto_tsquery('english', :q)
       ) AS relevance
FROM events e
WHERE
  (
    to_tsvector('english', e.name || ' ' || COALESCE(e.city,'') || ' ' || COALESCE(e.description,''))
    @@ plainto_tsquery('english', :q)
  )
  AND e.is_public = true
  AND e.is_active = true
  AND (:city IS NULL OR LOWER(e.city) LIKE LOWER(CONCAT('%', :city, '%')))
  AND (
    :lat IS NULL OR
    ST_DWithin(
      ST_MakePoint(e.longitude, e.latitude)::geography,
      ST_MakePoint(:lng, :lat)::geography,
      :radius * 1000
    )
  )
ORDER BY relevance DESC, distance_km ASC
LIMIT :size OFFSET :page * :size;
```

### Location Permission Flow (First Open)

```jsx
// frontend/src/hooks/useGeolocation.js
export function useGeolocation() {
  const [location, setLocation] = useState(null);
  const [permission, setPermission] = useState("unknown");

  useEffect(() => {
    // Check existing permission before asking
    navigator.permissions.query({ name: "geolocation" }).then((result) => {
      setPermission(result.state); // "granted" | "denied" | "prompt"
      if (result.state === "granted") {
        navigator.geolocation.getCurrentPosition(
          (pos) =>
            setLocation({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
            }),
          (err) => console.warn("Geolocation error:", err),
        );
      }
    });
  }, []);

  const requestLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPermission("granted");
      },
      (err) => setPermission("denied"),
    );
  };

  return { location, permission, requestLocation };
}
```

On first open, if permission is "prompt", show a modal explaining why we need location, then call `requestLocation()`. If denied, search still works (no geo-filtering, just text search).

---

## 9. Smart Routing with Waypoints — Dijkstra on Live Crowd Data

### Concept

Each event venue is modeled as a graph:

- **Nodes:** Zone centroids (lat/lng) + stall positions
- **Edges:** Walking paths between adjacent zones (defined by organizer or auto-generated from zone adjacency)
- **Edge weights:** Crowd density of destination zone → more crowded = higher cost

Every 5 seconds, edge weights update. If the optimal path changes significantly, the app suggests the new route. ML decides "significant enough" to avoid annoying the user with constant re-routing.

### Graph Data Model

```sql
-- New table: zone_connections (organizer defines or auto-computed from adjacency)
CREATE TABLE zone_connections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES events(id),
  from_zone_id  TEXT NOT NULL REFERENCES locations(id),
  to_zone_id    TEXT NOT NULL REFERENCES locations(id),
  distance_m    FLOAT NOT NULL,  -- physical walking distance in meters
  is_exit_route BOOLEAN DEFAULT false,  -- evacuation route flag
  created_at    TIMESTAMPTZ DEFAULT now()
);
```

### Dijkstra Implementation (Python ML Service)

```python
# ml/router.py
import heapq
from dataclasses import dataclass
from typing import Dict, List, Optional

@dataclass
class Zone:
    id: str
    name: str
    lat: float
    lng: float
    person_count: int
    max_capacity: int

    @property
    def crowd_cost(self) -> float:
        """Higher crowd = higher traversal cost"""
        density = self.person_count / max(self.max_capacity, 1)
        # Exponential cost: 0% density → cost=1, 100% density → cost=10
        return 1 + 9 * (density ** 2)

def dijkstra_route(
    graph: Dict[str, List[tuple]],   # zone_id → [(neighbor_id, distance_m)]
    zones: Dict[str, Zone],
    start_zone: str,
    end_zone: str,
    user_lat: float,
    user_lng: float
) -> dict:
    """
    Returns: { path: [zone_id, ...], waypoints: [{lat, lng, name}], estimated_time_s: int }
    """
    INF = float('inf')
    dist = {z: INF for z in graph}
    dist[start_zone] = 0
    prev = {}
    pq = [(0, start_zone)]

    while pq:
        cost, u = heapq.heappop(pq)
        if cost > dist[u]:
            continue
        if u == end_zone:
            break
        for v, d_meters in graph.get(u, []):
            # Total edge cost = physical distance + crowd penalty
            crowd_penalty = zones[v].crowd_cost * d_meters
            new_cost = dist[u] + crowd_penalty
            if new_cost < dist[v]:
                dist[v] = new_cost
                prev[v] = u
                heapq.heappush(pq, (new_cost, v))

    # Reconstruct path
    path = []
    node = end_zone
    while node in prev:
        path.append(node)
        node = prev[node]
    path.append(start_zone)
    path.reverse()

    waypoints = [{"lat": zones[z].lat, "lng": zones[z].lng,
                  "name": zones[z].name, "crowd": zones[z].person_count} for z in path]

    # Walking time estimate: 1.4 m/s average human walking speed
    total_dist = sum(
        min(d for n, d in graph[path[i]] if n == path[i+1])
        for i in range(len(path)-1)
    ) if len(path) > 1 else 0

    return {
        "path": path,
        "waypoints": waypoints,
        "estimated_time_s": int(total_dist / 1.4),
        "total_distance_m": int(total_dist)
    }
```

### ML Re-routing Decision

```python
# ml/reroute_decider.py
# Decides if a new route is different enough to bother the user

def should_reroute(old_path: list, new_path: list,
                   crowd_changes: dict,
                   user_moved_m: float) -> bool:
    """
    Returns True if user should receive new route suggestion.

    Rules:
    1. Path has completely changed (no common zones except start/end) → always reroute
    2. A zone on current path has become CRITICAL → always reroute
    3. New path is 30%+ faster → reroute
    4. User has moved >20m since last route → recalculate from new position
    5. Otherwise → keep current route
    """
    if user_moved_m > 20:
        return True

    old_set = set(old_path[1:-1])  # exclude start and end
    new_set = set(new_path[1:-1])

    if len(old_set & new_set) == 0 and len(old_set) > 0:
        return True  # completely different intermediate zones

    for zone_id in old_path:
        if crowd_changes.get(zone_id) == "CRITICAL":
            return True  # current route now passes through critical zone

    return False  # keep current route
```

### Route Display on Frontend

```jsx
// Waypoints shown as numbered markers with connecting polyline
// Color of polyline segment = crowd level of destination zone
// User dot moves along path as they move

const routePolyline = waypoints.map((wp, i) => {
  const nextWp = waypoints[i + 1];
  if (!nextWp) return null;
  return (
    <Polyline
      key={i}
      positions={[
        [wp.lat, wp.lng],
        [nextWp.lat, nextWp.lng],
      ]}
      color={CROWD_COLORS[nextWp.crowdLevel]}
      weight={4}
      dashArray={nextWp.crowdLevel === "CRITICAL" ? "10, 5" : null}
    />
  );
});
```

### Proximity Alert for Approaching Crowd

```javascript
// frontend/src/hooks/useProximityAlert.js
// Watches for CRITICAL crowds within 50m of user position

export function useProximityAlert(userLocation, zones) {
  useEffect(() => {
    const criticalNearby = zones.filter((z) => {
      if (z.crowdLevel !== "CRITICAL") return false;
      const dist = haversineDistance(userLocation, { lat: z.lat, lng: z.lng });
      return dist < 50; // 50 meters
    });
    if (criticalNearby.length > 0) {
      showNotification(
        `⚠️ CRITICAL crowd near ${criticalNearby[0].name}. Suggested detour available.`,
      );
    }
  }, [userLocation, zones]);
}
```

---

## 10. Real Demo Data — Not Fake Random Numbers

### The Problem with Random Numbers

Random integers in `sensor_agent.py` look fake — they jump from 12 to 78 in one tick, which no real crowd does. Recruiters and demonstrators will notice.

### Solution: Real Video File Through YOLOv8

**Step 1:** Download a free crowd video (Creative Commons):

```bash
# From Pixabay, Pexels, or use your college event video
# Place at: edge/demo_data/crowd_demo.mp4
```

**Step 2:** Process video through YOLOv8 to generate a readings CSV:

```bash
python edge/generate_demo_data.py --video edge/demo_data/crowd_demo.mp4 --output edge/demo_data/readings_cache.csv
```

**Step 3:** In demo mode, `sensor_agent.py` replays this CSV at real speed:

```python
# edge/sensor_agent.py — demo mode
if USE_DEMO_VIDEO:
    readings = load_csv("demo_data/readings_cache.csv")
    for row in readings:
        # Replay at original speed (or 2x for faster demo)
        time.sleep(row['interval_s'] / DEMO_SPEED_FACTOR)
        send_reading(row)
```

This gives REAL crowd count data that looks authentic — gradual rises, gradual falls, realistic peaks.

### Simulated WiFi Stream (Correlated with Video)

```python
# edge/wifi_sim.py
# Generates WiFi MAC counts that CORRELATE with the video-based camera counts
# (Not random — follows the same crowd pattern with ±10% noise)

class CorrelatedWiFiSimulator:
    def __init__(self, camera_counts: list):
        self.camera_counts = camera_counts
        self.index = 0

    def get_count(self) -> int:
        camera = self.camera_counts[self.index % len(self.camera_counts)]
        # WiFi probe sees 40% of crowd (rest have no device or device asleep)
        # Plus some passers-by not in camera frame
        noise = random.gauss(0, 3)
        wifi_devices = camera * 0.42 + noise + random.randint(0, 5)  # passers-by
        return max(0, int(wifi_devices))
```

### Demo Scenarios (Selectable from UI)

```bash
# Run specific scenario from a video-derived dataset
python sensor_agent.py --demo-scenario morning_arrival
python sensor_agent.py --demo-scenario concert_peak
python sensor_agent.py --demo-scenario evacuation_drill
python sensor_agent.py --demo-scenario normal_day
```

Each scenario plays back pre-computed readings from the actual video analysis.

---

## 11. Production System Design — Parallelism, Concurrency, Resilience

### Multi-Event Parallel Processing

```
                    Redis Stream "crowd:raw"
                           │
              ┌────────────┼────────────┐
              │            │            │
          Consumer      Consumer    Consumer
          Group 1       Group 2     Group 3
          (events       (events     (events
          A, B)         C, D)       E, F)
              │            │            │
          Partitioned by event_id → each consumer group handles separate events
          No cross-event blocking
```

### Spring Boot Thread Pool Configuration

```yaml
# application.properties
spring.task.execution.pool.core-size=10
spring.task.execution.pool.max-size=50
spring.task.execution.pool.queue-capacity=200
spring.task.execution.thread-name-prefix=crowd-worker-
# Each sensor reading processed asynchronously
# @Async("crowdTaskExecutor") on CrowdReadingService.saveReading()
```

### Rate Limiting Per Sensor

```java
// Uses bucket4j — token bucket algorithm
// Each sensor_id gets its own bucket: 60 readings/minute max

@Bean
public Bucket createSensorBucket(String sensorId) {
    Bandwidth limit = Bandwidth.classic(60, Refill.greedy(60, Duration.ofMinutes(1)));
    return Bucket.builder().addLimit(limit).build();
}

// In CrowdReadingController:
@PostMapping
public ResponseEntity<?> createReading(@RequestBody CrowdReadingDTO dto, HttpServletRequest req) {
    Bucket bucket = bucketService.getBucket(dto.getSensorId());
    if (!bucket.tryConsume(1)) {
        return ResponseEntity.status(429).body(Map.of("error", "Rate limit exceeded"));
    }
    // proceed...
}
```

### WebSocket Scalability

At large scale (500+ concurrent organizers), Spring's in-memory STOMP broker becomes a bottleneck. Solution:

```java
// Phase 9: Replace SimpleBroker with Redis-backed broker
@Override
public void configureMessageBroker(MessageBrokerRegistry config) {
    config.enableStompBrokerRelay("/topic")  // Redis relay
          .setRelayHost("localhost")
          .setRelayPort(6379);
    config.setApplicationDestinationPrefixes("/app");
}
```

For now (development): SimpleBroker handles up to ~500 connections fine.

### ML Service Horizontal Scaling

```yaml
# ml/docker-compose.yml
services:
  ml-service-1:
    image: crowdsense-ml
    ports: ["8001:8001"]
    environment: WORKER_ID=1
  ml-service-2:
    image: crowdsense-ml
    ports: ["8002:8001"]
    environment: WORKER_ID=2

  nginx:
    image: nginx
    # Round-robin between ml-service-1 and ml-service-2
```

Spring Boot's `RecommendationProxyService` calls the ML load balancer endpoint.

### Database Connection Pooling

```properties
# Supabase free tier: max 60 connections
# Pooler mode gives us transaction-level multiplexing
# Our pool settings:
spring.datasource.hikari.maximum-pool-size=3    # 3 per Spring Boot instance
spring.datasource.hikari.minimum-idle=1
# At scale: 10 Spring Boot instances × 3 = 30 connections (50% of limit)
```

### Graceful Degradation Stack

```
Full features:     Internet + Supabase + Redis + ML service
                   → All features, real-time, personalized recs

Degraded-1:        Internet + Supabase, no Redis
                   → Synchronous DB writes (slower, still correct)

Degraded-2:        LAN only (Supabase down), MQTT active
                   → Local dashboard works, data queued for sync

Degraded-3:        Total internet outage
                   → SQLite buffer, local alerts, no remote dashboard

Degraded-4:        Camera offline
                   → WiFi-only counts, no positional dots

Degraded-5:        Both sensors offline
                   → Last reading held, SENSOR_OFFLINE alert, local siren
```

---

## 12. Complete Data Flow — Every Online/Offline Case

### Case A: Everything Online (Happy Path)

```
[Camera frame]──▶ YOLOv8 + DeepSORT ──▶ {count=42, positions=[{cx,cy}...]}
[WiFi probe]──▶ MAC dedup + RSSI ──▶ {count=38}
                              │
                   Kalman Fusion ──▶ {fused_count=41}
                              │
              sensor_agent.py writes to SQLite (synced=0)
                              │
              HTTP POST /api/v1/readings ──▶ Spring Boot
                              │
              Spring Boot validates ──▶ Redis Stream "crowd:raw"
                              │
         ┌────────────────────┴──────────────────────────┐
         │                    │                           │
     DB Writer           Alert Checker            WS Broadcaster
     Supabase              HIGH/CRITICAL?          /topic/crowd
     INSERT               create alert            broadcast to
     Returns id           /topic/alerts           all dashboards
         │
     marks SQLite row synced=1
```

### Case B: Internet Drops Mid-Event

```
T=0: Internet drops
  sensor_agent: HTTP POST fails → catch exception → skip backend call
  SQLite: continues writing every 5s (synced=0 rows accumulate)
  MQTT: publishes to local broker (if Spring Boot on same LAN, it still works)

T=30s: sync_service.py retries → still no internet → logs "offline, queued N readings"

T=5min: 60 readings queued in SQLite

T=5min30s: Internet restored
  sync_service.py detects internet → bulk POST /api/v1/sync/bulk with all 60 readings
  Spring Boot bulk-inserts to Supabase (deduplicated by captured_at + location_id)
  Dashboard fills in the gap in historical chart
  marks all 60 rows synced=1 in SQLite
```

### Case C: Camera Goes Offline (WiFi Only Mode)

```
T=0: Camera feed drops (USB disconnect, cable fault, Pi camera error)
  crowd_detector.py: OpenCV read() fails → raises CameraOfflineException
  sensor_agent.py catches exception → sets CAMERA_OFFLINE flag
  sensor_agent.py: switches to wifi_only_mode()

T=5s: Next reading cycle
  WiFi probe still running → get_count() → {count=35}
  Fusion engine: camera_count=None → use wifi only → {fused_count=35}
  Reading: {"personCount": 35, "source": "WIFI_ONLY", "confidence": 0.65}

  Backend receives "WIFI_ONLY" source → stores in crowd_readings
  Dashboard shows camera icon with red dot (offline indicator)
  Alert created: type="SENSOR_PARTIAL_OFFLINE", message="Camera offline at Main Entrance"
```

### Case D: Organizer Creates Event (Full Flow)

```
Organizer fills form → POST /api/v1/events
  Spring Boot validates JWT (role=ORGANIZER)
  Creates event in Supabase: status=DRAFT
  Returns eventId

Organizer draws zones on map
  ZoneEditor emits polygon GeoJSON
  POST /api/v1/locations (one per zone)
  PostGIS stores GEOMETRY(POLYGON, 4326)
  Returns locationId for each zone

Organizer assigns sensor to zone
  PUT /api/v1/locations/{id} { sensorId: "pi_001" }
  Edge agent config.py updated: LOCATION_ID = "loc_002"

Event goes LIVE
  PUT /api/v1/events/{id} { status: "LIVE" }
  Backend broadcasts to /topic/events/{id}: { type: "EVENT_LIVE" }
  Attendees searching see event in results
  Sensors start posting to their assigned locationId
```

### Case E: Attendee Finds Safe Route (Full Flow)

```
Attendee opens /app → grants location permission → browser geolocation API
  useGeolocation hook → { lat: 18.52, lng: 73.85 }

Attendee searches "Sunburn Festival"
  GET /api/v1/events/search?q=sunburn+festival&lat=18.52&lng=73.85&radius=50
  Returns events sorted by (relevance DESC, distance_km ASC)

Attendee taps event → EventDetailScreen loads
  GET /api/v1/events/{id} → event info + zone list
  GET /api/v1/readings/latest?eventId={id} → live crowd per zone

  Map shows: zone polygons colored by crowd level
              live crowd dots in each zone
              stall markers

Attendee taps stall "Caricature Corner" → wants routing
  App determines user's current zone by checking which polygon contains user lat/lng
  GET /api/v1/recommend/route?from={userZoneId}&to={stallId}&eventId={id}

  Spring Boot calls ML service:
  POST http://ml:8001/route { from: "zone_entry", to: "zone_food_court", event_id: "..." }

  ML service:
  1. Fetches current crowd data per zone (GET /api/v1/readings/latest?eventId={id})
  2. Builds zone graph with crowd-weighted edges
  3. Runs Dijkstra → optimal path
  4. Returns waypoints [{lat, lng, name, crowdLevel}]

  Frontend renders waypoints as numbered markers + colored polyline
  Starts 5s refresh cycle on waypoints

  T+5s: Crowd changes in Zone B → ML re-evaluates route
  should_reroute() → path unchanged → no notification

  T+30s: Zone B becomes CRITICAL
  should_reroute() → True → "Route updated to avoid crowded Zone B" notification
```

---

## 13. Updated Folder Structure

```
crowdsense/
│
├── docs/
│   └── CrowdSense_Master_v7.md          ← This file
│
├── edge/
│   ├── requirements.txt                 ← Updated: add deep-sort-realtime, filterpy, paho-mqtt
│   ├── config.py                        ← BACKEND_URL, MQTT_BROKER, LOCATION_ID, USE_DEMO_VIDEO
│   ├── sensor_agent.py                  ← Main agent: fusion → SQLite → HTTP/MQTT
│   ├── crowd_detector.py                ← YOLOv8 + DeepSORT + CSRNet switching
│   ├── wifi_probe.py                    ← Scapy (Pi) or CorrelatedWiFiSimulator (laptop)
│   ├── fusion_engine.py                 ← Kalman filter fusion (NEW)
│   ├── local_db.py                      ← SQLite: init, insert, get_unsynced, mark_synced
│   ├── local_alert.py                   ← Internet-independent alerts (NEW)
│   ├── sync_service.py                  ← Bulk upload to backend when online
│   ├── mqtt_client.py                   ← MQTT publish to local broker (NEW)
│   ├── generate_demo_data.py            ← Process video → readings_cache.csv (NEW)
│   ├── models/
│   │   ├── yolov8n.pt                   ← Auto-downloaded on first run
│   │   └── csrnet_shanghaitech.pth      ← Download separately (see README)
│   └── demo_data/
│       ├── crowd_demo.mp4               ← Place your video here
│       └── readings_cache.csv           ← Generated by generate_demo_data.py
│
├── backend/
│   ├── pom.xml                          ← Spring Boot 3.2, jjwt, bucket4j, paho-mqtt
│   └── src/main/java/com/crowdsense/
│       ├── CrowdSenseApplication.java
│       ├── config/
│       │   ├── WebSocketConfig.java
│       │   ├── SecurityConfig.java
│       │   ├── CorsConfig.java
│       │   ├── DataInitializer.java     ← Seeds admin + loc_001
│       │   ├── RedisConfig.java         ← Redis Streams config (Phase 9)
│       │   └── MqttConfig.java          ← Paho MQTT subscriber (NEW)
│       ├── controller/
│       │   ├── CrowdReadingController.java
│       │   ├── LocationController.java   ← Zone CRUD + GeoJSON
│       │   ├── AlertController.java
│       │   ├── EventController.java
│       │   ├── StallController.java
│       │   ├── SyncController.java
│       │   ├── AuthController.java
│       │   └── RouteController.java      ← Proxy to ML service (NEW)
│       ├── service/
│       │   ├── CrowdReadingService.java
│       │   ├── LocationService.java
│       │   ├── AlertService.java
│       │   ├── EventService.java
│       │   ├── StallService.java
│       │   ├── SyncService.java
│       │   ├── NotificationService.java
│       │   ├── RouteService.java         ← Calls ML service (NEW)
│       │   └── ZoneConnectionService.java ← Zone graph management (NEW)
│       ├── model/
│       │   ├── CrowdReading.java
│       │   ├── Location.java             ← Added: boundary GEOMETRY field
│       │   ├── Alert.java
│       │   ├── Event.java
│       │   ├── Stall.java
│       │   ├── User.java
│       │   └── ZoneConnection.java       ← NEW
│       ├── repository/
│       │   ├── CrowdReadingRepository.java  ← DISTINCT ON fix
│       │   ├── LocationRepository.java
│       │   ├── AlertRepository.java
│       │   ├── EventRepository.java
│       │   ├── StallRepository.java
│       │   └── ZoneConnectionRepository.java ← NEW
│       ├── dto/
│       │   ├── CrowdReadingDTO.java
│       │   ├── BulkSyncDTO.java
│       │   ├── LocationDTO.java           ← Added: geoJsonPolygon
│       │   ├── EventDTO.java
│       │   ├── StallDTO.java
│       │   ├── RouteRequestDTO.java       ← NEW
│       │   └── AlertDTO.java
│       └── security/
│           ├── JwtUtil.java
│           └── JwtAuthFilter.java
│
├── frontend/
│   ├── package.json                      ← Add: leaflet-draw, @turf/turf, @stomp/stompjs
│   ├── vite.config.js
│   ├── .env
│   └── src/
│       ├── main.jsx
│       ├── App.jsx                       ← Routes: /login, /dashboard/*, /app/*
│       ├── api/
│       │   ├── crowdApi.js               ← All REST calls
│       │   ├── eventApi.js               ← Event CRUD
│       │   ├── routeApi.js               ← Routing calls (NEW)
│       │   └── websocketClient.js        ← STOMP over native WS
│       ├── pages/
│       │   ├── Login.jsx                 ← Dual login: detects role, redirects
│       │   ├── dashboard/               ← ORGANIZER views
│       │   │   ├── DashboardLayout.jsx
│       │   │   ├── Dashboard.jsx         ← Live charts + stats
│       │   │   ├── EventManager.jsx      ← Create/edit events
│       │   │   ├── ZoneEditor.jsx        ← Leaflet.draw zone drawing
│       │   │   ├── AlertCenter.jsx
│       │   │   ├── Analytics.jsx
│       │   │   └── StallManager.jsx
│       │   └── app/                     ← ATTENDEE views
│       │       ├── AppLayout.jsx         ← Mobile-first layout
│       │       ├── EventSearch.jsx       ← Search + geo results
│       │       ├── EventDetail.jsx       ← Zone map + live dots
│       │       ├── StallBrowser.jsx      ← Sorted by crowd
│       │       ├── RoutingView.jsx       ← Waypoint navigation (NEW)
│       │       └── AlertsView.jsx        ← Proximity alerts
│       ├── components/
│       │   ├── CrowdChart.jsx
│       │   ├── CrowdMap.jsx              ← Leaflet base map
│       │   ├── ZoneEditor.jsx            ← Leaflet.draw (organizer)
│       │   ├── CrowdDotLayer.jsx         ← Canvas overlay (NEW)
│       │   ├── ZonePolygonLayer.jsx      ← Colored zone polygons
│       │   ├── RoutePolyline.jsx         ← Waypoint display (NEW)
│       │   ├── StallCard.jsx
│       │   ├── AlertBanner.jsx
│       │   ├── CrowdLevelCard.jsx
│       │   └── LoadingSpinner.jsx
│       ├── hooks/
│       │   ├── useCrowdData.js
│       │   ├── useWebSocket.js
│       │   ├── useGeolocation.js         ← NEW
│       │   ├── useProximityAlert.js      ← NEW
│       │   └── useRoute.js               ← NEW
│       └── utils/
│           ├── crowdLevels.js
│           ├── formatters.js
│           ├── crowdDots.js              ← NEW: dot generation
│           └── haversine.js              ← NEW: distance calculation
│
├── ml/
│   ├── requirements.txt                  ← fastapi, scikit-learn, networkx, scipy, torch
│   ├── main.py                           ← FastAPI: /recommend, /route, /enrich, /health
│   ├── recommender.py                    ← Stall recommendation scoring
│   ├── router.py                         ← Dijkstra routing (NEW)
│   ├── reroute_decider.py               ← ML re-route decision (NEW)
│   ├── density_estimator.py             ← CSRNet density maps (NEW)
│   └── .env
│
└── mobile_expo_paused/                   ← Archived, not used
```

---

## 14. Database Schema — Complete v7

```sql
-- Run in Supabase SQL Editor

-- ============ CORE TABLES ============

CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  description TEXT,
  max_capacity INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  event_id UUID,  -- NULL = standalone sensor, NOT NULL = zone within event
  boundary GEOMETRY(POLYGON, 4326),  -- PostGIS polygon for zone boundary
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crowd_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL REFERENCES locations(id),
  person_count INTEGER NOT NULL CHECK (person_count >= 0),
  crowd_level TEXT NOT NULL CHECK (crowd_level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  confidence DOUBLE PRECISION,
  source TEXT DEFAULT 'HYBRID',  -- 'CAMERA_ONLY', 'WIFI_ONLY', 'HYBRID', 'SIMULATED'
  positions JSONB,  -- [{id, lat, lng}] from camera tracking, NULL if no camera
  captured_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (location_id, captured_at)  -- deduplication constraint
);

CREATE INDEX IF NOT EXISTS idx_readings_location_time
  ON crowd_readings(location_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL REFERENCES locations(id),
  alert_type TEXT NOT NULL,  -- 'THRESHOLD_EXCEEDED','SENSOR_PARTIAL_OFFLINE','SENSOR_OFFLINE'
  message TEXT NOT NULL,
  crowd_level TEXT NOT NULL,
  person_count INTEGER,
  resolved BOOLEAN DEFAULT false,
  triggered_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'ATTENDEE',  -- 'ADMIN', 'ORGANIZER', 'ATTENDEE'
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ EVENT PLATFORM TABLES ============

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  address TEXT,
  city TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  max_capacity INTEGER,
  floor_plan_url TEXT,
  is_public BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'DRAFT',  -- 'DRAFT', 'LIVE', 'ENDED'
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stalls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  zone_id TEXT REFERENCES locations(id),
  name TEXT NOT NULL,
  category TEXT,  -- 'food', 'merchandise', 'activity', 'service', 'info'
  description TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  rating FLOAT DEFAULT 0,
  rating_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS zone_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  from_zone_id TEXT NOT NULL REFERENCES locations(id),
  to_zone_id TEXT NOT NULL REFERENCES locations(id),
  distance_m FLOAT NOT NULL,
  is_exit_route BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ INDEXES ============

CREATE INDEX IF NOT EXISTS idx_events_fts ON events
  USING GIN (to_tsvector('english', name || ' ' || COALESCE(city,'') || ' ' || COALESCE(description,'')));

CREATE INDEX IF NOT EXISTS idx_events_location ON events
  USING GIST (ST_MakePoint(longitude, latitude)::geography);

CREATE INDEX IF NOT EXISTS idx_locations_boundary ON locations
  USING GIST (boundary);

CREATE INDEX IF NOT EXISTS idx_events_status ON events(status, is_active, is_public);

-- ============ EXTENSIONS ============

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For fuzzy text search

-- ============ SAMPLE DATA ============

INSERT INTO locations (id, name, latitude, longitude, description, max_capacity)
VALUES ('loc_001', 'Main Entrance', 28.6139, 77.2090, 'Main entrance gate', 100)
ON CONFLICT (id) DO NOTHING;
```

---

## 15. API Endpoints Reference — Complete v7

Base URL (local): `http://localhost:8080/api/v1`

### Auth

| Method | Endpoint       | Auth | Description                     |
| ------ | -------------- | ---- | ------------------------------- |
| POST   | /auth/login    | No   | Returns `{token, role, userId}` |
| POST   | /auth/register | No   | Register attendee or organizer  |
| GET    | /auth/me       | JWT  | Get current user info           |

### Crowd Readings

| Method | Endpoint                      | Auth | Description                           |
| ------ | ----------------------------- | ---- | ------------------------------------- |
| GET    | /readings/health              | No   | `{status: UP}`                        |
| POST   | /readings                     | No   | Submit reading from sensor            |
| GET    | /readings/latest              | No   | Latest per location (DISTINCT ON fix) |
| GET    | /readings/latest?eventId={id} | No   | Latest per zone for one event         |
| GET    | /readings/location/{id}       | No   | History `?limit=200&from=&to=`        |
| POST   | /sync/bulk                    | No   | Bulk upload from edge SQLite          |

### Locations / Zones

| Method | Endpoint                | Auth          | Description                       |
| ------ | ----------------------- | ------------- | --------------------------------- |
| GET    | /locations              | No            | All active locations              |
| GET    | /locations?eventId={id} | No            | Zones for one event               |
| POST   | /locations              | JWT ORGANIZER | Create zone with GeoJSON boundary |
| PUT    | /locations/{id}         | JWT ORGANIZER | Update zone                       |
| DELETE | /locations/{id}         | JWT ORGANIZER | Deactivate zone                   |

### Events

| Method | Endpoint               | Auth          | Description                                     |
| ------ | ---------------------- | ------------- | ----------------------------------------------- |
| GET    | /events                | No            | Public event listing `?status=LIVE&city=&page=` |
| GET    | /events/search         | No            | FTS: `?q=&city=&lat=&lng=&radius=`              |
| GET    | /events/{id}           | No            | Event detail + zones + latest crowd             |
| GET    | /events/mine           | JWT ORGANIZER | Organizer's own events                          |
| POST   | /events                | JWT ORGANIZER | Create event                                    |
| PUT    | /events/{id}           | JWT ORGANIZER | Update event (status, details)                  |
| DELETE | /events/{id}           | JWT ORGANIZER | Deactivate                                      |
| GET    | /events/{id}/analytics | JWT ORGANIZER | Historical crowd data + peak stats              |

### Stalls

| Method | Endpoint            | Auth          | Description              |
| ------ | ------------------- | ------------- | ------------------------ |
| GET    | /events/{id}/stalls | No            | All stalls for event     |
| GET    | /stalls/search      | No            | `?eventId=&category=&q=` |
| POST   | /events/{id}/stalls | JWT ORGANIZER | Add stall                |
| PUT    | /stalls/{id}        | JWT ORGANIZER | Update stall             |

### Alerts

| Method | Endpoint             | Auth          | Description                 |
| ------ | -------------------- | ------------- | --------------------------- | -------- | ------------- |
| GET    | /alerts              | JWT           | `?filter=active             | resolved | all&eventId=` |
| GET    | /alerts/stats        | No            | Count active/resolved/total |
| PUT    | /alerts/{id}/resolve | JWT ORGANIZER | Resolve alert               |

### Routing & Recommendations

| Method | Endpoint                   | Auth          | Description                                                       |
| ------ | -------------------------- | ------------- | ----------------------------------------------------------------- |
| GET    | /recommend                 | No            | `?event_id=&prefs=&zone=` → ranked stalls                         |
| GET    | /route                     | No            | `?from_zone=&to_stall=&event_id=&user_lat=&user_lng=` → waypoints |
| POST   | /zone-connections          | JWT ORGANIZER | Define walking paths between zones                                |
| GET    | /zone-connections?eventId= | No            | Zone graph for routing                                            |

---

## 16. WebSocket Events Reference

Connection URL: `ws://localhost:8080/ws/websocket`

| Topic                  | Direction            | Payload                                                        | When                    |
| ---------------------- | -------------------- | -------------------------------------------------------------- | ----------------------- | ------------------ | ------------------- |
| `/topic/crowd`         | Server → All         | `{locationId, personCount, crowdLevel, positions, capturedAt}` | Every new reading       |
| `/topic/alerts`        | Server → All         | `{locationId, alertType, crowdLevel, message, triggeredAt}`    | HIGH/CRITICAL threshold |
| `/topic/events/{id}`   | Server → Subscribers | `{type: "CROWD_UPDATE", zoneId, personCount, crowdLevel}`      | Per-event updates       |
| `/topic/sensor-status` | Server → All         | `{locationId, status: "ONLINE                                  | OFFLINE                 | PARTIAL", source}` | Sensor state change |

### Frontend Subscription Example

```javascript
client.subscribe("/topic/crowd", (msg) => {
  const data = JSON.parse(msg.body);
  // data.positions is [{id, lat, lng}] array for live dot rendering
  updateCrowdDots(data.locationId, data.positions, data.personCount);
});

client.subscribe("/topic/alerts", (msg) => {
  const alert = JSON.parse(msg.body);
  showAlertBanner(alert);
  if (alert.crowdLevel === "CRITICAL") {
    checkProximityToUser(alert.locationId);
  }
});
```

---

## 17. Phase Build Plan — Updated

| Phase    | What Gets Built                                                           | Days | Done When                             |
| -------- | ------------------------------------------------------------------------- | ---- | ------------------------------------- |
| ✅ 0     | Tools, accounts, folder structure                                         | 1    | All --version commands pass           |
| ✅ 1     | Supabase schema (v6)                                                      | 1    | Tables visible in dashboard           |
| ✅ 2     | Edge agent (simulation mode) + SQLite                                     | 3    | Data flows to Supabase                |
| ✅ 3     | Spring Boot: REST + WebSocket + JWT + DataInitializer                     | 6    | 201 on POST /readings                 |
| 🔄 4     | Dual dashboard: ZoneEditor + CrowdDotLayer + EventSearch + RoutingView    | 8    | Live zones, dot clouds, routing works |
| 🔜 5     | ML v2: Kalman fusion + CSRNet + Dijkstra router + reroute decider         | 5    | /route returns real waypoints         |
| 🔜 6     | Real demo data: video → CSV → replay mode                                 | 2    | Demo scenario plays authentic data    |
| 🔜 7     | MQTT offline mesh + local alert system                                    | 2    | Works fully with no internet          |
| 🔜 8     | Deployment: Render + Vercel + Railway                                     | 2    | Public URLs work from phone           |
| 🔜 9     | System polish: Redis Streams + bucket4j rate limiting + WebSocket scaling | 3    | Load test passes                      |
| Optional | CSRNet model download + calibration tool for camera homography            | 2    | Dense crowd counting accurate         |

### Session 10 Build Target (Next Chat)

Build these files:

1. `frontend/src/pages/Login.jsx` — dual login with role-based redirect
2. `frontend/src/pages/dashboard/ZoneEditor.jsx` — Leaflet.draw polygon tool
3. `frontend/src/components/CrowdDotLayer.jsx` — Canvas crowd dots
4. `frontend/src/pages/app/EventSearch.jsx` — geo search UI
5. `frontend/src/pages/app/RoutingView.jsx` — waypoint navigation
6. Backend: `RouteController.java` + `ZoneConnectionService.java`
7. Backend: `LocationController.java` update for GeoJSON boundary
8. DB schema: `zone_connections` table + `positions JSONB` column on `crowd_readings`

---

## 18. Verified Working Credentials

**DO NOT CHANGE — verified working Supabase + JWT config**

```properties
# backend/src/main/resources/application.properties

spring.application.name=crowdsense-backend
server.port=8080

# Supabase — Transaction Pooler (aws-1-, port 6543)
spring.datasource.url=jdbc:postgresql://aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&prepareThreshold=0
spring.datasource.username=postgres.leihwymwbxgzvzasskzy
spring.datasource.password=Crowd@#101716
spring.datasource.driver-class-name=org.postgresql.Driver
spring.datasource.hikari.maximum-pool-size=3
spring.datasource.hikari.minimum-idle=1
spring.datasource.hikari.connection-timeout=30000
spring.datasource.hikari.idle-timeout=600000
spring.datasource.hikari.max-lifetime=1800000
spring.datasource.hikari.keepalive-time=300000

spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.open-in-view=false
spring.jpa.properties.hibernate.jdbc.time_zone=UTC

firebase.enabled=false
firebase.credentials.path=src/main/resources/firebase-service-account.json

jwt.secret=404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970
jwt.expiration.ms=86400000

logging.level.com.crowdsense=DEBUG
logging.level.org.hibernate.SQL=WARN
logging.level.com.zaxxer.hikari=WARN

# ML Service URL
ml.service.url=http://localhost:8001
```

### Admin + Test Credentials (seeded by DataInitializer)

```
Admin:     admin@crowdsense.dev  /  admin123
Organizer: organizer@test.com   /  test1234  (create manually or add to DataInitializer)
```

### Frontend .env

```env
VITE_BACKEND_URL=http://localhost:8080
VITE_ML_SERVICE_URL=http://localhost:8001
VITE_APP_TITLE=CrowdSense
```

### ML Service .env

```env
BACKEND_URL=http://localhost:8080
PORT=8001
```

---

## 19. Known Issues and Fixes

| Issue                                     | Cause                                                       | Fix                                                                  |
| ----------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| 500 on GET /readings/latest               | JPQL correlated subquery broken                             | **FIXED**: Native DISTINCT ON in CrowdReadingRepository              |
| Login invalid credentials                 | No admin user in DB                                         | **FIXED**: DataInitializer seeds admin@crowdsense.dev/admin123       |
| WebSocket Uncaught ReferenceError: global | sockjs-client Node.js globals in Vite                       | **FIXED**: sockjs removed, native WS via @stomp/stompjs              |
| UnknownHostException on Spring Boot start | Wrong host prefix (missing aws-1-)                          | Copy EXACT URL from Section 18                                       |
| Spring Boot "BUILD SUCCESS" but exits     | DB connection failure — exitCode=1 looks like build success | Read ERROR lines ABOVE "BUILD SUCCESS"                               |
| Supabase 503                              | Free tier project paused after 7 days                       | supabase.com → Restore → wait 2 min                                  |
| Port 8080 in use                          | Old Java process running                                    | `taskkill /F /IM java.exe` (Windows) / `kill $(lsof -ti:8080)` (Mac) |
| leaflet-draw not rendering tools          | Missing CSS import                                          | `import "leaflet-draw/dist/leaflet.draw.css"` in ZoneEditor.jsx      |
| CSRNet model file not found               | Model not downloaded                                        | Run: `python ml/download_models.py` (will add this script)           |
| Chrome DevTools no phone frame            | Device emulation not toggled                                | F12 → Ctrl+Shift+M → Pixel 7                                         |

---

## 20. How to Start the Next Chat

**Copy this exactly:**

> "I am building CrowdSense. Read the attached master document (CrowdSense_Master_v7.md) for full context.
> We are at **Phase 4** — React Dashboard v2.
> Last completed: Spring Boot backend fully working, JWT auth, sensor agent running, data flowing to Supabase.
> Next build target: [describe exactly what you want from Session 10 build list above].
> Continue from there."

Then attach `CrowdSense_Master_v7.md`.

### Quick Start Commands (All Sessions)

```bash
# Terminal 1: Backend
cd crowdsense/backend && mvn spring-boot:run

# Terminal 2: Frontend
cd crowdsense/frontend && npm run dev
# Dashboard: http://localhost:3000/dashboard  (admin@crowdsense.dev / admin123)
# Mobile:    http://localhost:3000/app        (F12 → Ctrl+Shift+M → Pixel 7)

# Terminal 3: Sensor agent (generates realistic data)
cd crowdsense/edge && python sensor_agent.py --demo-scenario normal_day

# Terminal 4: ML Service
cd crowdsense/ml && uvicorn main:app --port 8001 --reload

# Terminal 5: MQTT Broker (offline mesh)
mosquitto -c /etc/mosquitto/mosquitto.conf
# OR on Windows: mosquitto.exe
```

---

## Appendix A: Free Services Reference

| Service                 | Used For                                  | Free Limits                      | URL                                   |
| ----------------------- | ----------------------------------------- | -------------------------------- | ------------------------------------- |
| Supabase                | PostgreSQL + PostGIS + Storage            | 500MB DB, pauses after 7d        | supabase.com                          |
| Render.com              | Spring Boot hosting                       | 750 hrs/month, sleeps 15min idle | render.com                            |
| Vercel                  | React frontend (both /dashboard and /app) | Unlimited static                 | vercel.com                            |
| Railway.app             | Python ML microservice                    | $5/month free credit             | railway.app                           |
| Firebase FCM            | Push notifications (Phase 9)              | Unlimited                        | console.firebase.google.com           |
| Redis Cloud             | Pub/Sub + caching (Phase 9)               | 30MB free                        | redis.io/try-free                     |
| Mosquitto               | Local MQTT broker for offline mode        | Free, open source                | mosquitto.org                         |
| OpenStreetMap / Leaflet | Map tiles + rendering                     | Free, no key needed              | leafletjs.com                         |
| Google Maps API         | Optional: richer map tiles                | Free tier: $200/month credit     | console.cloud.google.com              |
| CSRNet weights          | Pre-trained crowd density model           | Free research model              | github.com/leeyeehoo/CSRNet-pytorch   |
| DeepSORT                | Multi-object tracker                      | Free open source                 | github.com/levan92/deep_sort_realtime |
| Chrome DevTools         | Mobile UI preview                         | Free — built into Chrome/Edge    | Already installed                     |

## Appendix B: ML Models Used (No Training Required)

| Model                 | Task                              | Size                          | Source                           |
| --------------------- | --------------------------------- | ----------------------------- | -------------------------------- |
| YOLOv8n.pt            | Person detection per frame        | 6MB                           | Auto-downloaded by `ultralytics` |
| DeepSORT              | Person tracking across frames     | ~10MB                         | `pip install deep-sort-realtime` |
| CSRNet (ShanghaiTech) | Dense crowd counting (>50 people) | ~25MB                         | GitHub — see Appendix A          |
| Kalman Filter         | Sensor fusion                     | No file — implemented in code | `filterpy` library               |

All models are **inference-only** — zero training needed. CSRNet was trained on crowd datasets and generalizes to new venues without fine-tuning.

## Appendix C: Google Maps API Integration (Optional)

If you want richer map tiles and proper turn-by-turn directions (for outside-venue routing):

```javascript
// Replace Leaflet tile layer with Google Maps
// Free tier: $200/month credit = ~100,000 map loads/month = plenty for a portfolio project

// In CrowdMap.jsx
import {
  GoogleMap,
  LoadScript,
  Polygon,
  Marker,
  Polyline,
} from "@react-google-maps/api";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY; // add to .env
```

**When to use Google Maps vs Leaflet:**

- **Leaflet (free, no key):** Zone drawing, crowd visualization, event maps — all indoor/venue features
- **Google Maps (optional):** Outside-venue routing "how do I GET to the event", street-level navigation
- For the demo and portfolio: **Leaflet is sufficient and free.** Google Maps is a bonus.

---

_CrowdSense Master Document v7.0 | May 2026 | Update this file when architecture changes_

---

## Appendix D — Session 9 Files Delivered (Complete List)

### New backend files (place in `backend/src/main/java/com/crowdsense/`)

| File                            | Package subfolder                            | Status            |
| ------------------------------- | -------------------------------------------- | ----------------- |
| `pom.xml`                       | `backend/`                                   | ✅ NEW            |
| `CrowdSenseApplication.java`    | root                                         | ✅ NEW            |
| `AppConfig.java`                | `config/`                                    | ✅ NEW            |
| `WebSocketConfig.java`          | `config/`                                    | ✅ NEW            |
| `CorsConfig.java`               | `config/`                                    | ✅ NEW            |
| `DataInitializer_FIXED.java`    | `config/` → rename to `DataInitializer.java` | ✅ FIXED          |
| `SecurityConfig.java`           | `config/`                                    | ✅ updated        |
| `JwtUtil.java`                  | `security/`                                  | ✅ NEW            |
| `JwtAuthFilter.java`            | `security/`                                  | ✅ NEW            |
| `AuthController.java`           | `controller/`                                | ✅ NEW            |
| `CrowdReadingController.java`   | `controller/`                                | ✅ updated        |
| `SyncController.java`           | `controller/`                                | ✅ NEW            |
| `AlertController.java`          | `controller/`                                | ✅ NEW            |
| `StallController.java`          | `controller/`                                | ✅ NEW            |
| `ZoneConnectionController.java` | `controller/`                                | ✅ NEW            |
| `RouteController.java`          | `controller/`                                | ✅ NEW            |
| `AlertService.java`             | `service/`                                   | ✅ NEW (complete) |
| `StallService.java`             | `service/`                                   | ✅ NEW            |
| `ZoneConnectionService.java`    | `service/`                                   | ✅ NEW            |
| `Alert.java`                    | `model/`                                     | ✅ NEW            |
| `BulkSyncDTO.java`              | `dto/`                                       | ✅ NEW            |
| `AlertRepository.java`          | `repository/`                                | ✅ NEW            |
| `UserRepository.java`           | `repository/`                                | ✅ NEW            |
| `StallRepository.java`          | `repository/`                                | ✅ NEW            |

> **Note on `DataInitializer_FIXED.java`**: This replaces the previous `DataInitializer.java` which had a Java syntax error (stray backslash). Delete the old file and rename this one to `DataInitializer.java`.

### Fixed edge files

| File          | Fix                                                           |
| ------------- | ------------------------------------------------------------- |
| `local_db.py` | Removed duplicate `get_unsynced_readings` function definition |
