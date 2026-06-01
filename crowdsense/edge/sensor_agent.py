#!/usr/bin/env python3
# edge/sensor_agent.py
# ─────────────────────────────────────────────────────────────────────────────
# CrowdSense Edge Agent — Main Orchestrator
#
# Modes (set SENSOR_MODE in config.py):
#   SIMULATION  — correlated random data, no hardware needed
#   DEMO_VIDEO  — replays pre-processed video CSV (most realistic for demos)
#   LIVE        — real YOLOv8 + WiFi probe on Raspberry Pi
#
# Data flow (every 5 seconds):
#   1. Capture camera + WiFi reading
#   2. Fuse via Kalman filter
#   3. Write to SQLite (ALWAYS — never miss a reading)
#   4. Try to POST to Spring Boot backend (best-effort)
#   5. Publish to local MQTT broker (offline mesh)
#   6. Fire local alerts if CRITICAL and internet is down
#
# Background thread (every 30 seconds):
#   - Bulk-upload all unsynced SQLite rows to /api/v1/sync/bulk
# ─────────────────────────────────────────────────────────────────────────────

import csv
import json
import logging
import os
import sys
import threading
import time
from datetime import datetime, timezone

import requests

import local_alert
import mqtt_client
from config import (
    BACKEND_URL, LOCATION_ID, SENSOR_MODE,
    CROWD_CAPTURE_INTERVAL_SECONDS, SYNC_INTERVAL_SECONDS,
    DEMO_CSV_PATH, DEMO_SPEED_FACTOR,
)
from crowd_detector import classify_crowd, simulate_crowd_reading
from fusion_engine import CrowdFusionKalman
from local_db import initialize_db, insert_reading, count_unsynced
from sync_service import sync_buffered_data, check_internet
from wifi_probe import create_wifi_probe

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Shared state ──────────────────────────────────────────────────────────────
_fusion     = CrowdFusionKalman()
_wifi_probe = None            # initialised in main()
_online     = False           # set by capture_loop; used by sync_loop


# ─────────────────────────────────────────────────────────────────────────────
#  Reading sources
# ─────────────────────────────────────────────────────────────────────────────

def _capture_simulation() -> tuple:
    """Correlated fake reading."""
    count, level, conf, positions = simulate_crowd_reading()
    if _wifi_probe:
        _wifi_probe.update_reference(count)
        wifi_count, _ = _wifi_probe.get_count()
    else:
        wifi_count = None
    fused = _fusion.fuse(camera_count=count, wifi_count=wifi_count)
    level = classify_crowd(fused)
    return fused, level, conf, positions, "SIMULATION"


def _capture_live() -> tuple:
    """Real YOLOv8 + WiFi probe — Raspberry Pi only."""
    import cv2
    from crowd_detector import detect_from_frame
    cap = cv2.VideoCapture(0)
    ret, frame = cap.read()
    cap.release()
    if not ret:
        raise RuntimeError("Camera read failed")
    cam_count, level, conf, positions = detect_from_frame(frame)
    wifi_count, _ = _wifi_probe.get_count() if _wifi_probe else (None, None)
    fused  = _fusion.fuse(camera_count=cam_count, wifi_count=wifi_count)
    level  = classify_crowd(fused)
    source = ("HYBRID" if wifi_count is not None else "CAMERA_ONLY")
    return fused, level, conf, positions, source


def _load_demo_csv() -> list:
    if not os.path.exists(DEMO_CSV_PATH):
        logger.warning(f"[DEMO] {DEMO_CSV_PATH} not found — falling back to simulation")
        return []
    rows = []
    with open(DEMO_CSV_PATH, newline="") as f:
        for r in csv.DictReader(f):
            rows.append({
                "person_count": int(r["person_count"]),
                "crowd_level":  r["crowd_level"],
                "confidence":   float(r.get("confidence", 0.88)),
                "positions":    json.loads(r.get("positions", "[]")),
                "interval_s":   float(r.get("interval_s", 5.0)),
            })
    logger.info(f"[DEMO] Loaded {len(rows)} readings from {DEMO_CSV_PATH}")
    return rows


# ─────────────────────────────────────────────────────────────────────────────
#  Backend communication
# ─────────────────────────────────────────────────────────────────────────────

def _send_to_backend(reading: dict) -> bool:
    try:
        r = requests.post(
            f"{BACKEND_URL}/readings",
            json=reading,
            timeout=5,
        )
        return r.status_code == 201
    except Exception:
        return False


# ─────────────────────────────────────────────────────────────────────────────
#  Capture loop
# ─────────────────────────────────────────────────────────────────────────────

def capture_loop():
    global _online
    demo_rows  = _load_demo_csv() if SENSOR_MODE == "DEMO_VIDEO" else []
    demo_index = 0

    while True:
        try:
            # ── 1. Get reading ─────────────────────────────────────────────
            if SENSOR_MODE == "DEMO_VIDEO" and demo_rows:
                row       = demo_rows[demo_index % len(demo_rows)]
                demo_index += 1
                count     = row["person_count"]
                level     = row["crowd_level"]
                conf      = row["confidence"]
                positions = row["positions"]
                source    = "DEMO_VIDEO"
                sleep_s   = row["interval_s"] / DEMO_SPEED_FACTOR
            elif SENSOR_MODE == "LIVE":
                count, level, conf, positions, source = _capture_live()
                sleep_s = CROWD_CAPTURE_INTERVAL_SECONDS
            else:
                count, level, conf, positions, source = _capture_simulation()
                sleep_s = CROWD_CAPTURE_INTERVAL_SECONDS

            captured_at = datetime.now(timezone.utc).isoformat()

            # ── 2. SQLite write (always, never skip) ────────────────────────
            insert_reading(
                location_id=LOCATION_ID,
                person_count=count,
                crowd_level=level,
                confidence=conf,
                captured_at=captured_at,
                positions=positions,
                source=source,
            )

            # ── 3. Local alert (internet-independent) ──────────────────────
            local_alert.check_and_fire(count, level, LOCATION_ID)

            # ── 4. HTTP POST to backend ─────────────────────────────────────
            reading = {
                "locationId":  LOCATION_ID,
                "personCount": count,
                "crowdLevel":  level,
                "confidence":  conf,
                "capturedAt":  captured_at,
                "source":      source,
                "positions":   positions,
            }
            _online = _send_to_backend(reading)
            backend_tag = "backend=OK" if _online else "backend=offline"

            # ── 5. MQTT publish (local mesh, offline-safe) ──────────────────
            mqtt_ok = mqtt_client.publish(reading)

            # ── 6. Log ─────────────────────────────────────────────────────
            queued = count_unsynced()
            logger.info(
                f"[AGENT] ✓  {count:3d} people | {level:<8s} | conf={conf:.2f} | "
                f"{backend_tag} | mqtt={'OK' if mqtt_ok else 'off'} | queued={queued}"
            )

        except Exception as e:
            logger.error(f"[AGENT] Capture error: {e}", exc_info=True)
            sleep_s = CROWD_CAPTURE_INTERVAL_SECONDS

        time.sleep(sleep_s)


# ─────────────────────────────────────────────────────────────────────────────
#  Sync loop  (bulk-upload buffered SQLite rows)
# ─────────────────────────────────────────────────────────────────────────────

def sync_loop():
    while True:
        time.sleep(SYNC_INTERVAL_SECONDS)
        try:
            sync_buffered_data()
        except Exception as e:
            logger.error(f"[SYNC] Error: {e}")


# ─────────────────────────────────────────────────────────────────────────────
#  Entry point
# ─────────────────────────────────────────────────────────────────────────────

def main():
    global _wifi_probe

    logger.info("=" * 60)
    logger.info("  CrowdSense Edge Agent starting")
    logger.info(f"  Mode       : {SENSOR_MODE}")
    logger.info(f"  Location   : {LOCATION_ID}")
    logger.info(f"  Backend    : {BACKEND_URL}")
    logger.info("=" * 60)

    initialize_db()

    if SENSOR_MODE in ("SIMULATION", "DEMO_VIDEO"):
        from wifi_probe import CorrelatedWiFiSimulator
        _wifi_probe = CorrelatedWiFiSimulator()
    elif SENSOR_MODE == "LIVE":
        _wifi_probe = create_wifi_probe()

    threading.Thread(target=capture_loop, daemon=True, name="capture").start()
    threading.Thread(target=sync_loop,    daemon=True, name="sync").start()

    logger.info("[AGENT] Running.  Press Ctrl+C to stop.")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("[AGENT] Shutting down…")
        mqtt_client.stop()
        sys.exit(0)


if __name__ == "__main__":
    main()