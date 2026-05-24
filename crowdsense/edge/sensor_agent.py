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
        if response.status_code == 201:
            return True
        else:
            print(f"[AGENT] Backend returned {response.status_code}: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"[AGENT] Request error: {e}")
        return False

def capture_loop():
    while True:
        person_count, crowd_level, confidence = simulate_crowd_reading()
        captured_at = datetime.now(timezone.utc).isoformat()

        reading = {
            "locationId":  LOCATION_ID,
            "personCount": person_count,
            "crowdLevel":  crowd_level,
            "confidence":  confidence,
            "capturedAt":  captured_at
        }

        # Always write to local DB first (offline buffer)
        insert_reading(LOCATION_ID, person_count, crowd_level, confidence, captured_at)
        print(f"[AGENT] Captured: {person_count} people | Level: {crowd_level}")

        # Try real-time send if backend is reachable
        if check_internet():
            success = send_reading_to_backend(reading)
            if success:
                print(f"[AGENT] Sent to backend ✓")
            else:
                print(f"[AGENT] Send failed — data buffered in SQLite")
        else:
            print(f"[AGENT] Backend unreachable — buffered in SQLite")

        time.sleep(CROWD_CAPTURE_INTERVAL_SECONDS)

def sync_loop():
    while True:
        sync_buffered_data()
        time.sleep(SYNC_INTERVAL_SECONDS)

if __name__ == "__main__":
    initialize_db()
    print("[AGENT] CrowdSense Edge Agent starting...")
    print(f"[AGENT] Backend URL: {BACKEND_URL}")
    print(f"[AGENT] Location ID: {LOCATION_ID}")

    capture_thread = threading.Thread(target=capture_loop, daemon=True)
    sync_thread = threading.Thread(target=sync_loop, daemon=True)

    capture_thread.start()
    sync_thread.start()

    # Keep main thread alive
    while True:
        time.sleep(1)
