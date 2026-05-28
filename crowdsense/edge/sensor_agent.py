"""
CrowdSense Edge Agent — Simulation Mode
Runs time-based realistic crowd simulation and POSTs to Spring Boot backend.
SQLite buffers readings during offline periods and auto-syncs when back online.

Run: python sensor_agent.py
"""

import time
import threading
from datetime import datetime, timezone

import requests

from config import (
    BACKEND_URL, LOCATION_ID,
    SYNC_INTERVAL_SECONDS,
    CROWD_CAPTURE_INTERVAL_SECONDS,
    USE_SIMULATION
)
from local_db  import initialize_db, insert_reading, get_stats
from crowd_detector import simulate_crowd_reading
from sync_service   import sync_buffered_data, check_internet


def send_to_backend(reading: dict) -> bool:
    """Send a single reading directly to the backend REST API."""
    try:
        resp = requests.post(
            f"{BACKEND_URL}/readings",
            json=reading,
            timeout=5
        )
        return resp.status_code == 201
    except Exception:
        return False


def capture_loop():
    """Main loop: capture → buffer → try real-time send."""
    print(f"[AGENT] Capture loop started (interval: {CROWD_CAPTURE_INTERVAL_SECONDS}s)")
    while True:
        try:
            # Get reading (simulation or real camera)
            person_count, crowd_level, confidence = simulate_crowd_reading()
            captured_at = datetime.now(timezone.utc).isoformat()

            # 1. ALWAYS write to SQLite first (offline safety guarantee)
            insert_reading(LOCATION_ID, person_count, crowd_level, confidence, captured_at)

            reading_payload = {
                "locationId":  LOCATION_ID,
                "personCount": person_count,
                "crowdLevel":  crowd_level,
                "confidence":  confidence,
                "capturedAt":  captured_at
            }

            # 2. Try real-time send if online
            if check_internet(timeout=2):
                success = send_to_backend(reading_payload)
                status_icon = "✓" if success else "✗"
                print(f"[AGENT] {status_icon} {person_count:3d} people | {crowd_level:<8} | "
                      f"conf={confidence:.2f} | backend={'OK' if success else 'FAIL'}")
            else:
                stats = get_stats()
                print(f"[AGENT] OFFLINE | {person_count:3d} people | {crowd_level:<8} | "
                      f"buffered={stats['unsynced']} records")

        except Exception as e:
            print(f"[AGENT] Capture error: {e}")

        time.sleep(CROWD_CAPTURE_INTERVAL_SECONDS)


def sync_loop():
    """Background loop: push buffered SQLite records to backend when online."""
    print(f"[SYNC]  Sync loop started (interval: {SYNC_INTERVAL_SECONDS}s)")
    while True:
        time.sleep(SYNC_INTERVAL_SECONDS)
        try:
            sync_buffered_data()
        except Exception as e:
            print(f"[SYNC]  Error: {e}")


if __name__ == "__main__":
    print("=" * 55)
    print("  CrowdSense Edge Agent — Simulation Mode")
    print(f"  Backend : {BACKEND_URL}")
    print(f"  Location: {LOCATION_ID}")
    print(f"  Interval: {CROWD_CAPTURE_INTERVAL_SECONDS}s capture / {SYNC_INTERVAL_SECONDS}s sync")
    print("=" * 55)

    initialize_db()

    # Check backend reachability at startup
    if check_internet():
        print("[AGENT] ✓ Backend reachable — starting in ONLINE mode")
    else:
        print("[AGENT] ✗ Backend not reachable — starting in OFFLINE mode (SQLite buffer active)")

    # Start capture thread
    capture_thread = threading.Thread(target=capture_loop, daemon=True, name="CaptureThread")
    capture_thread.start()

    # Start background sync thread
    sync_thread = threading.Thread(target=sync_loop, daemon=True, name="SyncThread")
    sync_thread.start()

    # Keep main thread alive
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        stats = get_stats()
        print(f"\n[AGENT] Stopped. SQLite stats: {stats}")
        print("[AGENT] All data is safe in SQLite — will sync on next run.")