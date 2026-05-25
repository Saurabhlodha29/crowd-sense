# edge/sensor_agent.py
import time
import threading
from datetime import datetime, timezone
import requests

from local_db import initialize_db, insert_reading
from sync_service import sync_buffered_data, check_internet
from simulation_engine import simulate_reading
from config import (
    BACKEND_URL, LOCATION_ID,
    SYNC_INTERVAL_SECONDS, CROWD_CAPTURE_INTERVAL_SECONDS
)

def send_to_backend(reading):
    try:
        r = requests.post(BACKEND_URL + "/readings", json=reading, timeout=5)
        return r.status_code == 201
    except Exception:
        return False

def capture_loop():
    while True:
        person_count, crowd_level, confidence = simulate_reading()
        captured_at = datetime.now(timezone.utc).isoformat()

        reading = {
            "locationId":  LOCATION_ID,
            "personCount": person_count,
            "crowdLevel":  crowd_level,
            "confidence":  confidence,
            "capturedAt":  captured_at
        }

        # Always write locally first — data is never lost
        insert_reading(LOCATION_ID, person_count, crowd_level, confidence, captured_at)
        print(f"[AGENT] {datetime.now().strftime('%H:%M:%S')} | {person_count:3d} people | {crowd_level:8s} | conf={confidence}")

        if check_internet():
            ok = send_to_backend(reading)
            print(f"[AGENT] → Backend {'✓' if ok else '✗ (buffered in SQLite)'}")
        else:
            print(f"[AGENT] → Offline — buffered in SQLite")

        time.sleep(CROWD_CAPTURE_INTERVAL_SECONDS)

def sync_loop():
    while True:
        sync_buffered_data()
        time.sleep(SYNC_INTERVAL_SECONDS)

if __name__ == "__main__":
    initialize_db()
    print(f"[AGENT] CrowdSense Edge Agent | Backend: {BACKEND_URL} | Location: {LOCATION_ID}")
    print("[AGENT] Mode: Simulation (time-based patterns) | Ctrl+C to stop\n")

    threading.Thread(target=capture_loop, daemon=True).start()
    threading.Thread(target=sync_loop,   daemon=True).start()

    try:
        while True: time.sleep(1)
    except KeyboardInterrupt:
        print("\n[AGENT] Stopped.")