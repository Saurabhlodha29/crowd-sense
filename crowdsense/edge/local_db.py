# edge/local_db.py
# SQLite-backed offline buffer.
# All readings are written here FIRST, before any network transmission.
# This guarantees zero data loss during internet outages.

import sqlite3
import json
import os
import logging
from config import SQLITE_DB_PATH

logger = logging.getLogger(__name__)


def _ensure_dir():
    os.makedirs(os.path.dirname(SQLITE_DB_PATH) or ".", exist_ok=True)


def get_connection() -> sqlite3.Connection:
    _ensure_dir()
    conn = sqlite3.connect(SQLITE_DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def initialize_db():
    conn = get_connection()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS crowd_readings_buffer (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            location_id  TEXT    NOT NULL,
            person_count INTEGER NOT NULL,
            crowd_level  TEXT    NOT NULL,
            confidence   REAL,
            source       TEXT    DEFAULT 'HYBRID',
            positions    TEXT,      -- JSON array of {id, cx, cy} pixel coords
            captured_at  TEXT    NOT NULL,
            synced       INTEGER DEFAULT 0
        )
    """)
    # Add positions column to existing DBs (idempotent migration)
    try:
        conn.execute("ALTER TABLE crowd_readings_buffer ADD COLUMN positions TEXT")
    except sqlite3.OperationalError:
        pass   # column already exists
    try:
        conn.execute("ALTER TABLE crowd_readings_buffer ADD COLUMN source TEXT DEFAULT 'HYBRID'")
    except sqlite3.OperationalError:
        pass
    conn.commit()
    conn.close()
    logger.info(f"[DB] SQLite ready at {SQLITE_DB_PATH}")


def insert_reading(location_id: str, person_count: int, crowd_level: str,
                   confidence: float, captured_at: str,
                   positions: list = None, source: str = "HYBRID"):
    conn = get_connection()
    pos_json = json.dumps(positions) if positions else None
    conn.execute("""
        INSERT INTO crowd_readings_buffer
            (location_id, person_count, crowd_level, confidence,
             source, positions, captured_at, synced)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    """, (location_id, person_count, crowd_level, confidence,
          source, pos_json, captured_at))
    conn.commit()
    conn.close()





# Fixed version:
def get_unsynced_readings() -> list:   # noqa: F811
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM crowd_readings_buffer WHERE synced = 0 ORDER BY captured_at ASC"
    ).fetchall()
    conn.close()
    result = []
    for r in rows:
        d = dict(r)
        if d.get("positions"):
            try:
                d["positions"] = json.loads(d["positions"])
            except (json.JSONDecodeError, TypeError):
                d["positions"] = []
        else:
            d["positions"] = []
        result.append(d)
    return result


def mark_synced(ids: list):
    if not ids:
        return
    conn = get_connection()
    placeholders = ",".join("?" * len(ids))
    conn.execute(
        f"UPDATE crowd_readings_buffer SET synced = 1 WHERE id IN ({placeholders})",
        ids,
    )
    conn.commit()
    conn.close()


def count_unsynced() -> int:
    conn = get_connection()
    n = conn.execute(
        "SELECT COUNT(*) FROM crowd_readings_buffer WHERE synced = 0"
    ).fetchone()[0]
    conn.close()
    return n