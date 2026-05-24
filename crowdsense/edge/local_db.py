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