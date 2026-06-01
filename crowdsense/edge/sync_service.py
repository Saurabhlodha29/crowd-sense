# edge/sync_service.py
# Bulk-uploads unsynced SQLite rows to the backend when internet is available.

import logging
import requests
from local_db import get_unsynced_readings, mark_synced
from config import BACKEND_URL

logger = logging.getLogger(__name__)


def check_internet() -> bool:
    try:
        r = requests.get(f"{BACKEND_URL}/readings/health", timeout=3)
        return r.status_code == 200
    except Exception:
        return False


def sync_buffered_data():
    if not check_internet():
        logger.debug("[SYNC] Offline — skipping.")
        return

    rows = get_unsynced_readings()
    if not rows:
        return

    # Map SQLite column names → DTO field names expected by Spring Boot
    payload_readings = []
    for r in rows:
        payload_readings.append({
            "locationId":  r["location_id"],
            "personCount": r["person_count"],
            "crowdLevel":  r["crowd_level"],
            "confidence":  r.get("confidence"),
            "capturedAt":  r["captured_at"],
            "source":      r.get("source", "HYBRID"),
            "positions":   r.get("positions", []),
        })

    try:
        response = requests.post(
            f"{BACKEND_URL}/sync/bulk",
            json={"readings": payload_readings},
            timeout=30,
        )
        if response.status_code == 200:
            ids = [r["id"] for r in rows]
            mark_synced(ids)
            logger.info(f"[SYNC] ✓  Uploaded {len(ids)} buffered readings.")
        else:
            logger.warning(f"[SYNC] Server error: {response.status_code} {response.text[:200]}")
    except Exception as e:
        logger.warning(f"[SYNC] Request failed: {e}")