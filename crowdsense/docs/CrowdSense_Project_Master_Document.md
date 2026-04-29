# CrowdSense — Smart Crowd Monitoring & Safe-Route System
## Master Project Document v1.0

> **Purpose of this file:** Attach this document at the start of every new chat session. It gives the AI full context to continue without you re-explaining anything.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Revised Tech Stack & Justification](#2-revised-tech-stack--justification)
3. [System Architecture](#3-system-architecture)
4. [Full Workflow — Step by Step](#4-full-workflow--step-by-step)
5. [Folder & File Structure](#5-folder--file-structure)
6. [Installation & Prerequisites](#6-installation--prerequisites)
7. [Module-by-Module Build Plan](#7-module-by-module-build-plan)
8. [Database Schema Design](#8-database-schema-design)
9. [API Endpoints Reference](#9-api-endpoints-reference)
10. [WebSocket Events Reference](#10-websocket-events-reference)
11. [Environment Variables & Config Files](#11-environment-variables--config-files)
12. [Development Phases & Milestones](#12-development-phases--milestones)
13. [What to Do Next (After Reading This)](#13-what-to-do-next-after-reading-this)

---

## 1. Project Overview

**Project Name:** CrowdSense  
**Tagline:** Real-time crowd intelligence — detect, predict, and navigate safely.

### What It Does

CrowdSense is an end-to-end system that:

- Uses a **Raspberry Pi** (or simulated sensor) with a camera and WiFi probe to detect crowd density in real time at a physical location.
- Runs **AI (YOLOv8)** on the edge device to count people and classify crowd levels (Low / Medium / High / Critical).
- Sends data to a **Spring Boot backend** via REST + WebSocket.
- Stores data in **Supabase (PostgreSQL)** online; falls back to **SQLite locally** when the internet is down, and syncs automatically when reconnected.
- Provides an **admin dashboard (React.js)** with live charts, heatmaps, and historical data.
- Offers a **user mobile app (React Native / Flutter)** that shows safe routes and crowd alerts.

### Who Uses It

| User | Use Case |
|------|----------|
| Event organizers | Monitor crowd density at venues in real time |
| City administrators | Track footfall in public spaces |
| General public | Check crowd levels and find safe routes |
| Security teams | Get alerts when crowds exceed safe thresholds |

### Why This Project Matters (For Your Resume)

This project demonstrates: IoT + edge computing, AI/ML integration, real-time systems, offline-first architecture, full-stack development, and cloud deployment — all things that make a 2nd-year student's portfolio stand out extremely well.

---

## 2. Revised Tech Stack & Justification

### Changes From Original Proposal

**MongoDB → Supabase (PostgreSQL)**

Reasons:
- Supabase has a **free tier** (500 MB database, unlimited API calls) — no credit card needed.
- It provides a **REST API and real-time subscriptions out of the box**, reducing backend code.
- PostgreSQL is better than MongoDB for time-series crowd data that needs aggregate queries (averages, trends over time windows).
- Supabase has a clean dashboard UI for you to visually inspect data — great for development.
- MongoDB Atlas free tier now has more restrictions; Supabase free tier is more generous.

**Firebase (kept, but limited role)**

- Used only for **push notifications** (FCM — Firebase Cloud Messaging) to the mobile app.
- Not used as the primary database.

**AWS / Google Cloud → Supabase Storage + Render.com**

- Supabase Storage handles file/model storage (free tier: 1 GB).
- **Render.com** hosts the Spring Boot backend for free (free tier: 750 hrs/month).
- This keeps the entire project free.

### Final Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Edge Hardware** | Raspberry Pi 4 (or simulated) | Low cost, runs Python, has GPIO + camera |
| **Edge Vision AI** | Python + YOLOv8 (Ultralytics) | Best free object detection, runs on Pi |
| **Edge Offline DB** | SQLite (on Pi / local machine) | Zero config, file-based, perfect for offline buffer |
| **Backend** | Spring Boot (Java 17) | You already know it; great for REST + WebSocket |
| **Primary DB** | Supabase (PostgreSQL) | Free, online, REST + realtime built-in |
| **Sync Layer** | Custom Spring Boot Sync Service | Detects offline→online transition, pushes SQLite data to Supabase |
| **Push Notifications** | Firebase FCM (free) | Industry standard for mobile push alerts |
| **Admin Frontend** | React.js + Chart.js + Leaflet.js | Free, widely used, Chart.js for graphs, Leaflet for maps |
| **Mobile App** | React Native (Expo) | Free, cross-platform, shares logic with React web |
| **Real-time** | WebSockets (Spring Boot STOMP) | Built into Spring Boot, no extra service needed |
| **Simulation** | Python virtual sensor script | Simulate Pi hardware on your laptop — no Pi needed to start |
| **Deployment** | Render.com (backend) + Vercel (frontend) | Both have generous free tiers |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         EDGE LAYER (Raspberry Pi / Laptop Sim)      │
│                                                                      │
│   ┌─────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│   │  Camera /   │───▶│  YOLOv8      │───▶│  Edge Python Agent   │  │
│   │  WiFi Probe │    │  Crowd Count │    │  (sensor_agent.py)   │  │
│   └─────────────┘    └──────────────┘    └──────┬───────────────┘  │
│                                                  │                  │
│                                          ┌───────▼────────┐        │
│                                          │  SQLite Buffer  │        │
│                                          │  (offline store)│        │
│                                          └───────┬────────┘        │
└──────────────────────────────────────────────────┼─────────────────┘
                                                   │ HTTP POST (when online)
                                                   │
┌──────────────────────────────────────────────────▼─────────────────┐
│                         BACKEND LAYER (Spring Boot)                  │
│                                                                      │
│   ┌─────────────────┐   ┌──────────────────┐   ┌────────────────┐  │
│   │  REST API       │   │  WebSocket Server │   │  Sync Service  │  │
│   │  /api/v1/...    │   │  (STOMP/SockJS)   │   │  SQLite→Supa.  │  │
│   └────────┬────────┘   └────────┬─────────┘   └───────┬────────┘  │
│            │                     │                      │           │
│            └──────────┬──────────┘                      │           │
│                       │                                  │           │
│             ┌─────────▼──────────────────────────────────▼────────┐ │
│             │              Service Layer (Java)                     │ │
│             └─────────┬──────────────────────────────────┬────────┘ │
│                       │                                  │          │
│              ┌────────▼────────┐                ┌────────▼───────┐ │
│              │  Supabase Client │                │  FCM Notifier  │ │
│              │  (PostgreSQL)    │                │  (push alerts) │ │
│              └─────────────────┘                └────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
                    │                           │
        ┌───────────▼──────┐         ┌──────────▼──────────┐
        │  React.js Admin  │         │  React Native App   │
        │  Dashboard       │         │  (Mobile — users)   │
        │  (Vercel)        │         │  (Expo Go)          │
        └──────────────────┘         └─────────────────────┘
```

### Data Flow Explained

1. **Camera/WiFi probe** captures frames or WiFi device signals.
2. **YOLOv8 model** (running on Pi or laptop) counts people per frame, outputs a crowd reading.
3. **sensor_agent.py** receives the reading, stores it immediately in **local SQLite** (never lose data).
4. If **internet is available**, the agent also POSTs the reading to the Spring Boot API.
5. If **internet is down**, SQLite accumulates readings. A **background sync thread** in the agent keeps checking connectivity. Once back online, it bulk-uploads all buffered records to the backend.
6. **Spring Boot** saves records to **Supabase PostgreSQL** and broadcasts the update via **WebSocket** to all connected dashboards.
7. If crowd level crosses a threshold, the backend triggers **Firebase FCM** to send push notifications to mobile app users.
8. **React Admin Dashboard** shows live charts (WebSocket) and historical data (REST).
9. **React Native App** shows current crowd levels and suggests routes avoiding high-density areas.

---

## 4. Full Workflow — Step by Step

This is the order in which we will build everything. Each phase produces working, testable output before moving to the next.

### Phase 0 — Environment Setup (Day 1)

Goal: Get all tools installed and verify they work.

Steps:
1. Install Node.js (v18+), Python (3.10+), Java 17 ✓ (already done)
2. Install Spring Boot CLI or use Spring Initializr to generate the project
3. Install Python packages: ultralytics, fastapi, requests, sqlite3 (built-in)
4. Create Supabase project (free account at supabase.com)
5. Create Firebase project (free at console.firebase.google.com) for FCM
6. Create Render.com account (free)
7. Create Vercel account (free)
8. Install VS Code extensions: Java Extension Pack, Python, ESLint, Prettier

### Phase 1 — Database Setup (Day 1-2)

Goal: Have Supabase running with the right schema.

Steps:
1. Create tables in Supabase (SQL editor): locations, crowd_readings, alerts, users
2. Enable Row Level Security (RLS) for security
3. Get the Supabase URL and anon key for the backend config
4. Test inserting and reading data from the Supabase dashboard

### Phase 2 — Python Sensor Agent (Day 2-4)

Goal: A Python script that simulates or runs real crowd detection and sends data.

Steps:
1. Write `sensor_agent.py`: captures mock readings (random or from webcam)
2. Integrate YOLOv8 for actual person detection (optional at first — use mock data)
3. Add SQLite for local buffering
4. Add the offline sync logic (queue → retry on reconnect)
5. Test that data appears in Supabase after running the agent

### Phase 3 — Spring Boot Backend (Day 4-8)

Goal: A working REST API and WebSocket server.

Steps:
1. Generate project with Spring Initializr (Web, WebSocket, JPA, Lombok, Validation)
2. Configure Supabase connection (via JDBC PostgreSQL driver)
3. Build entity models: Location, CrowdReading, Alert
4. Build repositories (Spring Data JPA)
5. Build service layer with business logic
6. Build REST controllers: `/api/v1/readings`, `/api/v1/locations`, `/api/v1/alerts`
7. Build WebSocket config + message broker (STOMP over SockJS)
8. Build the FCM notification service
9. Write the sync endpoint that the Python agent calls to bulk-upload buffered data
10. Test all endpoints using Postman or curl

### Phase 4 — React Admin Dashboard (Day 8-13)

Goal: A live dashboard showing real-time crowd data.

Steps:
1. Create React app with Vite
2. Set up Chart.js for time-series crowd graphs
3. Set up Leaflet.js for location map with crowd markers
4. Connect to Spring Boot WebSocket (SockJS + StompJS)
5. Build dashboard layout: sidebar, top stats, chart area, map area
6. Add authentication (simple JWT login via Spring Boot)
7. Add historical data view with date filters

### Phase 5 — React Native Mobile App (Day 13-18)

Goal: A mobile app showing crowd levels and safe routes.

Steps:
1. Create Expo project: `npx create-expo-app CrowdSenseMobile`
2. Build home screen with current crowd levels per location
3. Integrate map (React Native Maps) with color-coded crowd markers
4. Add route suggestion feature (avoid high-density zones)
5. Add FCM push notification setup
6. Test on Android (Expo Go app)

### Phase 6 — Integration & Testing (Day 18-22)

Goal: Everything works end-to-end.

Steps:
1. Run Python sensor agent → verify data appears in Supabase
2. Verify Spring Boot picks it up and broadcasts via WebSocket
3. Verify React dashboard updates in real time
4. Verify mobile app shows current data
5. Test offline scenario: disconnect internet → agent buffers → reconnect → data syncs
6. Test alert threshold: set crowd to Critical → verify FCM notification fires

### Phase 7 — Deployment (Day 22-25)

Goal: Live, accessible application.

Steps:
1. Deploy Spring Boot to Render.com (free tier)
2. Deploy React frontend to Vercel (free tier)
3. Configure environment variables in Render.com dashboard
4. Test production URLs

---

## 5. Folder & File Structure

Below is the complete folder structure. Create all of these manually in VS Code.

```
crowdsense/                          ← Root project folder
│
├── README.md                        ← Project readme
├── .gitignore                       ← Git ignore rules
│
├── docs/                            ← Documentation (put this master doc here)
│   └── CrowdSense_Project_Master_Document.md
│
├── edge/                            ← Python edge agent (runs on Pi or laptop)
│   ├── requirements.txt
│   ├── sensor_agent.py              ← Main agent: detect → buffer → sync
│   ├── crowd_detector.py            ← YOLOv8 integration
│   ├── local_db.py                  ← SQLite operations
│   ├── sync_service.py              ← Upload buffered data when online
│   ├── config.py                    ← Edge config (backend URL, thresholds)
│   ├── models/
│   │   └── yolov8n.pt               ← YOLOv8 nano model (downloaded at runtime)
│   └── data/
│       └── crowdsense_local.db      ← SQLite database file (auto-created)
│
├── backend/                         ← Spring Boot application
│   ├── pom.xml
│   └── src/
│       └── main/
│           ├── java/
│           │   └── com/crowdsense/
│           │       ├── CrowdSenseApplication.java
│           │       ├── config/
│           │       │   ├── WebSocketConfig.java
│           │       │   ├── SecurityConfig.java
│           │       │   └── CorsConfig.java
│           │       ├── controller/
│           │       │   ├── CrowdReadingController.java
│           │       │   ├── LocationController.java
│           │       │   ├── AlertController.java
│           │       │   ├── SyncController.java
│           │       │   └── AuthController.java
│           │       ├── service/
│           │       │   ├── CrowdReadingService.java
│           │       │   ├── LocationService.java
│           │       │   ├── AlertService.java
│           │       │   ├── NotificationService.java
│           │       │   └── SyncService.java
│           │       ├── model/
│           │       │   ├── Location.java
│           │       │   ├── CrowdReading.java
│           │       │   ├── Alert.java
│           │       │   └── User.java
│           │       ├── repository/
│           │       │   ├── LocationRepository.java
│           │       │   ├── CrowdReadingRepository.java
│           │       │   └── AlertRepository.java
│           │       ├── dto/
│           │       │   ├── CrowdReadingDTO.java
│           │       │   ├── BulkSyncDTO.java
│           │       │   └── AlertDTO.java
│           │       └── websocket/
│           │           └── CrowdUpdateMessage.java
│           └── resources/
│               ├── application.properties
│               └── application-prod.properties
│
├── frontend/                        ← React.js admin dashboard
│   ├── package.json
│   ├── vite.config.js
│   ├── .env
│   ├── .env.example
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── api/
│       │   ├── crowdApi.js          ← REST API calls
│       │   └── websocketClient.js   ← WebSocket connection
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   ├── TopBar.jsx
│       │   ├── CrowdLevelCard.jsx
│       │   ├── CrowdChart.jsx       ← Chart.js time-series
│       │   ├── CrowdMap.jsx         ← Leaflet map
│       │   ├── AlertBanner.jsx
│       │   └── LoadingSpinner.jsx
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Locations.jsx
│       │   ├── History.jsx
│       │   ├── Alerts.jsx
│       │   └── Login.jsx
│       ├── hooks/
│       │   ├── useCrowdData.js
│       │   └── useWebSocket.js
│       └── utils/
│           ├── crowdLevels.js       ← Level → color/label mapping
│           └── formatters.js
│
└── mobile/                          ← React Native (Expo) mobile app
    ├── package.json
    ├── app.json
    ├── .env
    └── src/
        ├── App.jsx
        ├── api/
        │   └── crowdApi.js
        ├── components/
        │   ├── CrowdMarker.jsx
        │   ├── RouteCard.jsx
        │   └── AlertModal.jsx
        ├── screens/
        │   ├── HomeScreen.jsx
        │   ├── MapScreen.jsx
        │   ├── AlertsScreen.jsx
        │   └── SettingsScreen.jsx
        └── utils/
            └── notifications.js
```

---

## 6. Installation & Prerequisites

### What You Already Have

- Java 17 ✓
- Python 3.x ✓
- VS Code ✓

### What You Need to Install

#### 1. Node.js (for React frontend and mobile)

Download from: https://nodejs.org (choose LTS version, currently v20)

Verify: `node --version` and `npm --version`

#### 2. Python Packages (for edge agent)

```bash
pip install ultralytics opencv-python requests flask
```

- `ultralytics` — YOLOv8 (includes the model)
- `opencv-python` — camera frame capture
- `requests` — HTTP calls to backend
- `flask` — optional local API for the edge agent

#### 3. Spring Boot via Spring Initializr

Go to: https://start.spring.io

Settings:
- Project: Maven
- Language: Java
- Spring Boot: 3.2.x
- Group: com.crowdsense
- Artifact: backend
- Java: 17

Dependencies to add:
- Spring Web
- Spring WebSocket
- Spring Data JPA
- PostgreSQL Driver
- Spring Security
- Lombok
- Spring Boot DevTools
- Validation

Download, unzip into `crowdsense/backend/`

#### 4. Expo CLI (for mobile app)

```bash
npm install -g @expo/cli
```

Verify: `expo --version`

Also install Expo Go on your Android phone (free from Play Store) for testing.

#### 5. VS Code Extensions to Install

Open VS Code → Extensions (Ctrl+Shift+X) → Search and install:
- Extension Pack for Java (Microsoft)
- Spring Boot Extension Pack (VMware)
- Python (Microsoft)
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- GitLens

#### 6. Git

```bash
git --version
```

If not installed: https://git-scm.com/downloads

#### 7. Postman (for API testing)

Download free from: https://www.postman.com/downloads/

---

## 7. Module-by-Module Build Plan

### Module 1: Edge Python Agent

**File: `edge/config.py`**
```python
# Centralized config for the edge agent
BACKEND_URL = "http://localhost:8080/api/v1"
LOCATION_ID = "loc_001"
SYNC_INTERVAL_SECONDS = 30
CROWD_CAPTURE_INTERVAL_SECONDS = 5
ALERT_THRESHOLDS = {
    "LOW": 10,
    "MEDIUM": 25,
    "HIGH": 50,
    "CRITICAL": 75
}
SQLITE_DB_PATH = "data/crowdsense_local.db"
```

**File: `edge/local_db.py`**
```python
import sqlite3
import json
from datetime import datetime
from config import SQLITE_DB_PATH

def get_connection():
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def initialize_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS crowd_readings_buffer (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            location_id TEXT NOT NULL,
            person_count INTEGER NOT NULL,
            crowd_level TEXT NOT NULL,
            confidence REAL,
            captured_at TEXT NOT NULL,
            synced INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()
    print("[DB] SQLite initialized at", SQLITE_DB_PATH)

def insert_reading(location_id, person_count, crowd_level, confidence, captured_at):
    conn = get_connection()
    conn.execute("""
        INSERT INTO crowd_readings_buffer
        (location_id, person_count, crowd_level, confidence, captured_at, synced)
        VALUES (?, ?, ?, ?, ?, 0)
    """, (location_id, person_count, crowd_level, confidence, captured_at))
    conn.commit()
    conn.close()

def get_unsynced_readings():
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM crowd_readings_buffer WHERE synced = 0 ORDER BY captured_at ASC"
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]

def mark_synced(ids: list):
    if not ids:
        return
    conn = get_connection()
    placeholders = ",".join("?" * len(ids))
    conn.execute(f"UPDATE crowd_readings_buffer SET synced = 1 WHERE id IN ({placeholders})", ids)
    conn.commit()
    conn.close()
```

**File: `edge/crowd_detector.py`**
```python
from ultralytics import YOLO
from config import ALERT_THRESHOLDS
import random  # for simulation mode

model = None

def load_model():
    global model
    # Downloads yolov8n.pt automatically on first run
    model = YOLO("yolov8n.pt")
    print("[AI] YOLOv8 model loaded.")

def detect_crowd_from_frame(frame):
    """Run YOLOv8 on a frame. Returns (person_count, crowd_level, confidence)."""
    if model is None:
        load_model()
    results = model(frame, classes=[0], verbose=False)  # class 0 = person
    person_count = len(results[0].boxes)
    confidence = float(results[0].boxes.conf.mean()) if person_count > 0 else 0.0
    return person_count, classify_crowd(person_count), round(confidence, 3)

def simulate_crowd_reading():
    """Generate a fake reading for testing without camera."""
    person_count = random.randint(0, 90)
    return person_count, classify_crowd(person_count), round(random.uniform(0.7, 0.99), 3)

def classify_crowd(count):
    if count < ALERT_THRESHOLDS["LOW"]:
        return "LOW"
    elif count < ALERT_THRESHOLDS["MEDIUM"]:
        return "MEDIUM"
    elif count < ALERT_THRESHOLDS["HIGH"]:
        return "HIGH"
    else:
        return "CRITICAL"
```

**File: `edge/sync_service.py`**
```python
import requests
from local_db import get_unsynced_readings, mark_synced
from config import BACKEND_URL
import time

def check_internet():
    try:
        requests.get(BACKEND_URL + "/health", timeout=3)
        return True
    except Exception:
        return False

def sync_buffered_data():
    if not check_internet():
        print("[SYNC] Offline — skipping sync.")
        return

    unsynced = get_unsynced_readings()
    if not unsynced:
        return

    payload = {"readings": unsynced}
    try:
        response = requests.post(
            BACKEND_URL + "/sync/bulk",
            json=payload,
            timeout=10
        )
        if response.status_code == 200:
            ids = [r["id"] for r in unsynced]
            mark_synced(ids)
            print(f"[SYNC] Synced {len(ids)} records.")
        else:
            print(f"[SYNC] Server error: {response.status_code}")
    except Exception as e:
        print(f"[SYNC] Failed: {e}")
```

**File: `edge/sensor_agent.py`**
```python
import time
import threading
from datetime import datetime, timezone
import requests

from local_db import initialize_db, insert_reading
from crowd_detector import simulate_crowd_reading  # swap for detect_crowd_from_frame for real Pi
from sync_service import sync_buffered_data, check_internet
from config import (
    BACKEND_URL, LOCATION_ID,
    SYNC_INTERVAL_SECONDS, CROWD_CAPTURE_INTERVAL_SECONDS
)

def send_reading_to_backend(reading):
    try:
        response = requests.post(
            BACKEND_URL + "/readings",
            json=reading,
            timeout=5
        )
        return response.status_code == 201
    except Exception:
        return False

def capture_loop():
    while True:
        person_count, crowd_level, confidence = simulate_crowd_reading()
        captured_at = datetime.now(timezone.utc).isoformat()

        reading = {
            "locationId": LOCATION_ID,
            "personCount": person_count,
            "crowdLevel": crowd_level,
            "confidence": confidence,
            "capturedAt": captured_at
        }

        # Always write to local DB first
        insert_reading(LOCATION_ID, person_count, crowd_level, confidence, captured_at)
        print(f"[AGENT] Captured: {person_count} people | Level: {crowd_level}")

        # Try real-time send if online
        if check_internet():
            success = send_reading_to_backend(reading)
            if success:
                print(f"[AGENT] Sent to backend ✓")
            else:
                print(f"[AGENT] Send failed — data buffered in SQLite")

        time.sleep(CROWD_CAPTURE_INTERVAL_SECONDS)

def sync_loop():
    while True:
        sync_buffered_data()
        time.sleep(SYNC_INTERVAL_SECONDS)

if __name__ == "__main__":
    initialize_db()
    print("[AGENT] CrowdSense Edge Agent starting...")

    capture_thread = threading.Thread(target=capture_loop, daemon=True)
    sync_thread = threading.Thread(target=sync_loop, daemon=True)

    capture_thread.start()
    sync_thread.start()

    # Keep main thread alive
    while True:
        time.sleep(1)
```

---

### Module 2: Spring Boot Backend — Key Files

**File: `backend/src/main/resources/application.properties`**
```properties
# Application
spring.application.name=crowdsense-backend
server.port=8080

# Supabase PostgreSQL Connection
# Replace with your actual Supabase connection string
spring.datasource.url=jdbc:postgresql://<YOUR_SUPABASE_HOST>:5432/postgres
spring.datasource.username=postgres
spring.datasource.password=<YOUR_SUPABASE_DB_PASSWORD>
spring.datasource.driver-class-name=org.postgresql.Driver

# JPA
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect

# WebSocket
websocket.endpoint=/ws
websocket.topic.crowd=/topic/crowd

# Firebase
firebase.credentials.path=src/main/resources/firebase-service-account.json

# JWT
jwt.secret=<GENERATE_A_RANDOM_256BIT_STRING>
jwt.expiration.ms=86400000

# Logging
logging.level.com.crowdsense=DEBUG
```

**File: `backend/src/main/java/com/crowdsense/model/CrowdReading.java`**
```java
package com.crowdsense.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "crowd_readings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CrowdReading {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "location_id", nullable = false)
    private String locationId;

    @Column(name = "person_count", nullable = false)
    private Integer personCount;

    @Column(name = "crowd_level", nullable = false)
    @Enumerated(EnumType.STRING)
    private CrowdLevel crowdLevel;

    @Column(name = "confidence")
    private Double confidence;

    @Column(name = "captured_at", nullable = false)
    private Instant capturedAt;

    @Column(name = "created_at")
    private Instant createdAt;

    public enum CrowdLevel {
        LOW, MEDIUM, HIGH, CRITICAL
    }

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }
}
```

**File: `backend/src/main/java/com/crowdsense/model/Location.java`**
```java
package com.crowdsense.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "locations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Location {

    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    private String description;

    @Column(name = "max_capacity")
    private Integer maxCapacity;

    @Column(name = "is_active")
    private Boolean isActive = true;
}
```

**File: `backend/src/main/java/com/crowdsense/config/WebSocketConfig.java`**
```java
package com.crowdsense.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}
```

**File: `backend/src/main/java/com/crowdsense/controller/CrowdReadingController.java`**
```java
package com.crowdsense.controller;

import com.crowdsense.dto.CrowdReadingDTO;
import com.crowdsense.model.CrowdReading;
import com.crowdsense.service.CrowdReadingService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/readings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CrowdReadingController {

    private final CrowdReadingService crowdReadingService;

    @PostMapping
    public ResponseEntity<CrowdReading> createReading(@RequestBody CrowdReadingDTO dto) {
        CrowdReading reading = crowdReadingService.saveReading(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(reading);
    }

    @GetMapping("/latest")
    public ResponseEntity<List<CrowdReading>> getLatestReadings() {
        return ResponseEntity.ok(crowdReadingService.getLatestPerLocation());
    }

    @GetMapping("/location/{locationId}")
    public ResponseEntity<List<CrowdReading>> getReadingsByLocation(
            @PathVariable String locationId,
            @RequestParam(defaultValue = "100") int limit) {
        return ResponseEntity.ok(crowdReadingService.getByLocation(locationId, limit));
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }
}
```

**File: `backend/src/main/java/com/crowdsense/service/CrowdReadingService.java`**
```java
package com.crowdsense.service;

import com.crowdsense.dto.CrowdReadingDTO;
import com.crowdsense.model.CrowdReading;
import com.crowdsense.repository.CrowdReadingRepository;
import com.crowdsense.websocket.CrowdUpdateMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CrowdReadingService {

    private final CrowdReadingRepository repository;
    private final SimpMessagingTemplate messagingTemplate;
    private final AlertService alertService;

    public CrowdReading saveReading(CrowdReadingDTO dto) {
        CrowdReading reading = CrowdReading.builder()
                .locationId(dto.getLocationId())
                .personCount(dto.getPersonCount())
                .crowdLevel(CrowdReading.CrowdLevel.valueOf(dto.getCrowdLevel()))
                .confidence(dto.getConfidence())
                .capturedAt(dto.getCapturedAt() != null ? dto.getCapturedAt() : Instant.now())
                .build();

        CrowdReading saved = repository.save(reading);

        // Broadcast to WebSocket clients
        messagingTemplate.convertAndSend("/topic/crowd",
                new CrowdUpdateMessage(saved.getLocationId(), saved.getPersonCount(),
                        saved.getCrowdLevel().name(), saved.getCapturedAt()));

        // Check if alert threshold crossed
        alertService.checkAndAlert(saved);

        return saved;
    }

    public List<CrowdReading> getLatestPerLocation() {
        return repository.findLatestPerLocation();
    }

    public List<CrowdReading> getByLocation(String locationId, int limit) {
        return repository.findTopNByLocationIdOrderByCapturedAtDesc(locationId, limit);
    }
}
```

**File: `backend/src/main/java/com/crowdsense/controller/SyncController.java`**
```java
package com.crowdsense.controller;

import com.crowdsense.dto.BulkSyncDTO;
import com.crowdsense.dto.CrowdReadingDTO;
import com.crowdsense.service.CrowdReadingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/sync")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SyncController {

    private final CrowdReadingService crowdReadingService;

    @PostMapping("/bulk")
    public ResponseEntity<Map<String, Object>> bulkSync(@RequestBody BulkSyncDTO dto) {
        int count = 0;
        for (CrowdReadingDTO reading : dto.getReadings()) {
            crowdReadingService.saveReading(reading);
            count++;
        }
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "synced", count
        ));
    }
}
```

---

### Module 3: React Admin Dashboard — Key Files

**File: `frontend/src/api/websocketClient.js`**
```javascript
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";

const BACKEND_WS_URL = import.meta.env.VITE_BACKEND_URL + "/ws";

let client = null;
const subscribers = {};

export function connectWebSocket(onCrowdUpdate) {
  client = new Client({
    webSocketFactory: () => new SockJS(BACKEND_WS_URL),
    onConnect: () => {
      console.log("[WS] Connected to CrowdSense backend");
      client.subscribe("/topic/crowd", (message) => {
        const data = JSON.parse(message.body);
        onCrowdUpdate(data);
      });
    },
    onDisconnect: () => console.log("[WS] Disconnected"),
    onStompError: (frame) => console.error("[WS] Error:", frame),
    reconnectDelay: 5000,
  });
  client.activate();
}

export function disconnectWebSocket() {
  if (client) client.deactivate();
}
```

**File: `frontend/src/hooks/useWebSocket.js`**
```javascript
import { useEffect, useState } from "react";
import { connectWebSocket, disconnectWebSocket } from "../api/websocketClient";

export function useWebSocket() {
  const [latestUpdate, setLatestUpdate] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    connectWebSocket((data) => {
      setLatestUpdate(data);
      setConnected(true);
    });
    return () => disconnectWebSocket();
  }, []);

  return { latestUpdate, connected };
}
```

**File: `frontend/src/utils/crowdLevels.js`**
```javascript
export const CROWD_LEVEL_CONFIG = {
  LOW:      { color: "#22c55e", label: "Low",      bg: "#dcfce7" },
  MEDIUM:   { color: "#f59e0b", label: "Medium",   bg: "#fef3c7" },
  HIGH:     { color: "#f97316", label: "High",     bg: "#ffedd5" },
  CRITICAL: { color: "#ef4444", label: "Critical", bg: "#fee2e2" },
};

export function getCrowdConfig(level) {
  return CROWD_LEVEL_CONFIG[level] || CROWD_LEVEL_CONFIG.LOW;
}
```

**File: `frontend/src/components/CrowdChart.jsx`**
```jsx
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS, LineElement, PointElement,
  LinearScale, TimeScale, Tooltip, Legend
} from "chart.js";
import "chartjs-adapter-date-fns";

ChartJS.register(LineElement, PointElement, LinearScale, TimeScale, Tooltip, Legend);

export default function CrowdChart({ readings }) {
  const data = {
    datasets: [{
      label: "Person Count",
      data: readings.map(r => ({ x: new Date(r.capturedAt), y: r.personCount })),
      borderColor: "#6366f1",
      backgroundColor: "rgba(99,102,241,0.1)",
      tension: 0.4,
      fill: true,
    }]
  };

  const options = {
    responsive: true,
    scales: {
      x: { type: "time", time: { unit: "minute" } },
      y: { beginAtZero: true, title: { display: true, text: "People" } }
    }
  };

  return <Line data={data} options={options} />;
}
```

---

## 8. Database Schema Design

### Supabase SQL (run in Supabase SQL Editor)

```sql
-- Locations table
CREATE TABLE locations (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    description TEXT,
    max_capacity INTEGER,
    is_active   BOOLEAN DEFAULT true,
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Crowd readings table
CREATE TABLE crowd_readings (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id  TEXT NOT NULL REFERENCES locations(id),
    person_count INTEGER NOT NULL CHECK (person_count >= 0),
    crowd_level  TEXT NOT NULL CHECK (crowd_level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    confidence   DOUBLE PRECISION,
    captured_at  TIMESTAMPTZ NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT now()
);

-- Index for fast location-based time queries
CREATE INDEX idx_readings_location_time ON crowd_readings(location_id, captured_at DESC);

-- Alerts table
CREATE TABLE alerts (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id  TEXT NOT NULL REFERENCES locations(id),
    alert_type   TEXT NOT NULL,
    message      TEXT NOT NULL,
    crowd_level  TEXT NOT NULL,
    person_count INTEGER,
    resolved     BOOLEAN DEFAULT false,
    triggered_at TIMESTAMPTZ DEFAULT now(),
    resolved_at  TIMESTAMPTZ
);

-- Users table (admin users only — not public app users)
CREATE TABLE users (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email        TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role         TEXT DEFAULT 'ADMIN',
    created_at   TIMESTAMPTZ DEFAULT now()
);

-- Insert a sample location
INSERT INTO locations (id, name, latitude, longitude, description, max_capacity)
VALUES ('loc_001', 'Main Entrance', 28.6139, 77.2090, 'Main entrance gate', 100);
```

### SQLite Schema (auto-created by Python agent)

```sql
CREATE TABLE IF NOT EXISTS crowd_readings_buffer (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id  TEXT NOT NULL,
    person_count INTEGER NOT NULL,
    crowd_level  TEXT NOT NULL,
    confidence   REAL,
    captured_at  TEXT NOT NULL,
    synced       INTEGER DEFAULT 0
);
```

---

## 9. API Endpoints Reference

### Base URL: `http://localhost:8080/api/v1`

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| GET | `/readings/health` | Health check | — |
| POST | `/readings` | Submit a single reading | CrowdReadingDTO |
| GET | `/readings/latest` | Get latest reading per location | — |
| GET | `/readings/location/{id}` | Get readings for a location | — |
| POST | `/sync/bulk` | Bulk upload buffered readings | BulkSyncDTO |
| GET | `/locations` | Get all active locations | — |
| POST | `/locations` | Create a location | LocationDTO |
| GET | `/alerts` | Get recent alerts | — |
| PUT | `/alerts/{id}/resolve` | Mark alert as resolved | — |
| POST | `/auth/login` | Admin login | {email, password} |

### Sample CrowdReadingDTO (JSON):

```json
{
  "locationId": "loc_001",
  "personCount": 42,
  "crowdLevel": "MEDIUM",
  "confidence": 0.87,
  "capturedAt": "2025-07-15T10:30:00Z"
}
```

### Sample BulkSyncDTO (JSON):

```json
{
  "readings": [
    {
      "locationId": "loc_001",
      "personCount": 15,
      "crowdLevel": "LOW",
      "confidence": 0.91,
      "capturedAt": "2025-07-15T10:00:00Z"
    },
    {
      "locationId": "loc_001",
      "personCount": 63,
      "crowdLevel": "HIGH",
      "confidence": 0.84,
      "capturedAt": "2025-07-15T10:05:00Z"
    }
  ]
}
```

---

## 10. WebSocket Events Reference

### Subscribe to (Frontend → Backend)

| Topic | Description |
|-------|-------------|
| `/topic/crowd` | Live crowd updates from all locations |
| `/topic/alerts` | New alert notifications |

### Message Format (Backend → Frontend via `/topic/crowd`):

```json
{
  "locationId": "loc_001",
  "personCount": 42,
  "crowdLevel": "MEDIUM",
  "capturedAt": "2025-07-15T10:30:00Z"
}
```

### Message Format for Alerts (`/topic/alerts`):

```json
{
  "locationId": "loc_001",
  "alertType": "THRESHOLD_EXCEEDED",
  "crowdLevel": "CRITICAL",
  "message": "Crowd at Main Entrance has reached CRITICAL level (78 people)",
  "triggeredAt": "2025-07-15T10:35:00Z"
}
```

---

## 11. Environment Variables & Config Files

### `frontend/.env`

```
VITE_BACKEND_URL=http://localhost:8080
VITE_APP_TITLE=CrowdSense Admin
```

### `frontend/.env.production`

```
VITE_BACKEND_URL=https://your-render-app.onrender.com
```

### `backend/src/main/resources/application.properties`

(See Module 2 section above for full content)

### `edge/config.py`

(See Module 1 section above for full content)

---

## 12. Development Phases & Milestones

| Phase | What You'll Build | Estimated Days | Completion Signal |
|-------|-------------------|---------------|-------------------|
| 0 | Setup: install tools, create accounts | 1 | Can run `java --version`, `node --version`, `python --version`; Supabase project created |
| 1 | Supabase schema | 1 | Tables visible in Supabase dashboard |
| 2 | Python sensor agent | 2-3 | Agent runs and data appears in Supabase |
| 3 | Spring Boot backend | 4-5 | Postman shows 201 Created on POST `/readings` |
| 4 | React dashboard | 5-6 | Dashboard loads, shows live WebSocket updates |
| 5 | React Native app | 4-5 | Expo Go on phone shows crowd levels |
| 6 | Integration testing | 3-4 | Full offline→sync scenario works |
| 7 | Deployment | 2-3 | Live URLs on Render + Vercel |

---

## 13. What to Do Next (After Reading This)

### Step 1 — Create the folder structure

Open your terminal in VS Code and run:

```bash
mkdir crowdsense
cd crowdsense
mkdir -p docs edge/models edge/data backend mobile frontend
```

Save this document into `crowdsense/docs/CrowdSense_Project_Master_Document.md`

### Step 2 — Initialize the Spring Boot project

Go to https://start.spring.io with the settings in Section 6. Download and unzip into `crowdsense/backend/`.

### Step 3 — Create your Supabase project

1. Go to https://supabase.com → New Project (free)
2. Name it `crowdsense`
3. Choose a region close to you
4. Go to SQL Editor → run the schema from Section 8
5. Go to Settings → Database → copy the connection string into `application.properties`

### Step 4 — Start the next chat with this file

Paste this instruction at the top of your next chat:

> "I am building CrowdSense. Read the attached master document for full context. We are currently at **[PHASE NUMBER]** and about to start building **[MODULE NAME]**. Let's continue."

Then attach this file and the AI will have complete context.

### Step 5 — Suggested chat-by-chat breakdown

| Chat Session | Focus |
|--------------|-------|
| Chat 2 | Phase 1: Supabase schema + Phase 2: Full Python edge agent |
| Chat 3 | Phase 3: Spring Boot — models, repos, services |
| Chat 4 | Phase 3 continued: controllers, WebSocket, sync endpoint |
| Chat 5 | Phase 4: React frontend structure + WebSocket hook |
| Chat 6 | Phase 4 continued: Dashboard UI, charts, map |
| Chat 7 | Phase 5: React Native mobile app |
| Chat 8 | Phase 6: Integration testing + bug fixes |
| Chat 9 | Phase 7: Deployment to Render + Vercel |

---

## Appendix A — Potential Issues & Solutions

| Issue | Likely Cause | Solution |
|-------|-------------|---------|
| Spring Boot can't connect to Supabase | Wrong connection string format | Use JDBC format: `jdbc:postgresql://HOST:5432/postgres?sslmode=require` |
| YOLOv8 slow on laptop | Running on CPU | Use `yolov8n.pt` (nano — fastest); avoid `yolov8l.pt` |
| WebSocket not connecting from React | CORS not configured | Add `setAllowedOriginPatterns("*")` in WebSocketConfig |
| Python agent fails to sync | Backend not running | Start backend first with `mvn spring-boot:run` |
| Expo Go can't reach local backend | Phone and laptop on different networks | Use your laptop's local IP (e.g. 192.168.x.x) instead of localhost |

---

## Appendix B — Free Services Being Used

| Service | Free Tier Limits | Sign Up URL |
|---------|-----------------|-------------|
| Supabase | 500 MB DB, unlimited API | supabase.com |
| Render.com | 750 hrs/month (sleeps after 15 min idle) | render.com |
| Vercel | Unlimited static sites | vercel.com |
| Firebase FCM | Unlimited push notifications | console.firebase.google.com |
| Expo | Free React Native build + hosting | expo.dev |

---

*Document Version: 1.0 | Created for CrowdSense project | Update this file whenever architecture changes.*
