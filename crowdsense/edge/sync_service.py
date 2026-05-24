import requests
from local_db import get_unsynced_readings, mark_synced
from config import BACKEND_URL
import time

def check_internet():
    try:
        # FIX: correct health endpoint is /readings/health, not /health
        response = requests.get(BACKEND_URL + "/readings/health", timeout=3)
        return response.status_code == 200
    except Exception:
        return False

def sync_buffered_data():
    if not check_internet():
        print("[SYNC] Offline — skipping sync.")
        return

    unsynced = get_unsynced_readings()
    if not unsynced:
        return

    # Convert SQLite row dicts to the DTO format the backend expects
    readings_payload = []
    for r in unsynced:
        readings_payload.append({
            "locationId":  r["location_id"],
            "personCount": r["person_count"],
            "crowdLevel":  r["crowd_level"],
            "confidence":  r["confidence"],
            "capturedAt":  r["captured_at"],
        })

    payload = {"readings": readings_payload}
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
            print(f"[SYNC] Server error: {response.status_code} — {response.text[:200]}")
    except Exception as e:
        print(f"[SYNC] Failed: {e}")
