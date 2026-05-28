import requests
from local_db import get_unsynced_readings, mark_synced
from config import BACKEND_URL

def check_internet(timeout: int = 3) -> bool:
    try:
        requests.get(f"{BACKEND_URL}/readings/health", timeout=timeout)
        return True
    except Exception:
        return False

def sync_buffered_data():
    if not check_internet():
        print("[SYNC] Offline — data safely buffered in SQLite")
        return 0

    unsynced = get_unsynced_readings()
    if not unsynced:
        return 0

    payload = {"readings": []}
    for r in unsynced:
        payload["readings"].append({
            "locationId":  r["location_id"],
            "personCount": r["person_count"],
            "crowdLevel":  r["crowd_level"],
            "confidence":  r["confidence"],
            "capturedAt":  r["captured_at"]
        })

    try:
        resp = requests.post(f"{BACKEND_URL}/sync/bulk", json=payload, timeout=15)
        if resp.status_code == 200:
            ids = [r["id"] for r in unsynced]
            mark_synced(ids)
            print(f"[SYNC] ✓ Synced {len(ids)} buffered records to backend")
            return len(ids)
        else:
            print(f"[SYNC] Server returned {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        print(f"[SYNC] Failed: {e}")
    return 0