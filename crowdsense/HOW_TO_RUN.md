# CrowdSense — How to Run Everything

## Prerequisites
- Java 17 ✓
- Python 3.10+ ✓
- Node.js v18+ (install from nodejs.org)
- Android phone with Expo Go app

---

## Step 1: Start the Spring Boot Backend

```bash
cd crowdsense/backend
mvn spring-boot:run
```

Or run the existing jar:
```bash
java -jar target/backend-0.0.1-SNAPSHOT.jar
```

Backend runs at: http://localhost:8080
Test it: http://localhost:8080/api/v1/readings/health → should return `{"status":"UP"}`

---

## Step 2: Start the Python Sensor Agent (simulated data)

```bash
cd crowdsense/edge
pip install requests
python sensor_agent.py
```

You'll see output like:
```
[AGENT] Captured: 42 people | Level: MEDIUM
[AGENT] Sent to backend ✓
```

Data flows: Python → Spring Boot → Supabase → WebSocket → Dashboard

---

## Step 3: Start the React Admin Dashboard

```bash
cd crowdsense/frontend
npm install
npm run dev
```

Open: http://localhost:3000

Login: admin@crowdsense.dev / admin123

---

## Step 4: Run the Mobile App (Expo)

1. Find your laptop's local IP:
   - Windows: `ipconfig` → look for IPv4
   - Mac/Linux: `ifconfig` → look for inet

2. Edit `crowdsense/mobile/.env`:
   ```
   EXPO_PUBLIC_BACKEND_URL=http://YOUR_LAPTOP_IP:8080
   ```

3. Install and start:
   ```bash
   cd crowdsense/mobile
   npm install
   npx expo start
   ```

4. Scan the QR code with Expo Go app on your Android phone.
   Make sure phone and laptop are on the SAME WiFi network.

---

## Step 5: Test the Full Flow

1. Backend running → ✓
2. Python agent running → data appears in Supabase dashboard
3. Open admin dashboard → see live crowd cards update
4. Open Expo Go app → see crowd levels
5. Kill WiFi on sensor machine → agent buffers to SQLite
6. Restore WiFi → agent auto-syncs buffered data
7. Raise threshold in config.py (e.g. CRITICAL: 20) → alert fires in dashboard

---

## Supabase Quick Check

Open: https://supabase.com/dashboard/project/leihwymwbxgzvzasskzy/editor

Run: `SELECT * FROM crowd_readings ORDER BY captured_at DESC LIMIT 10;`

---

## Common Fixes

| Problem | Fix |
|---------|-----|
| Backend won't start | Check Supabase password in application.properties |
| Frontend login fails | Use admin@crowdsense.dev / admin123 (hardcoded) |
| Mobile can't reach backend | Use laptop's LAN IP not localhost |
| No data on dashboard | Start the Python sensor agent first |
| Chart not showing | Click a location card on the dashboard first |
| Expo install fails | Run `npm install --legacy-peer-deps` |
