# Centralized config for the edge agent
BACKEND_URL = "http://localhost:8080/api/v1"
LOCATION_ID = "loc_001"
SYNC_INTERVAL_SECONDS = 30
CROWD_CAPTURE_INTERVAL_SECONDS = 5
ALERT_THRESHOLDS = {
    "LOW": 10,
    "MEDIUM": 25,
    "HIGH": 50,
    "CRITICAL": 75
}
SQLITE_DB_PATH = "data/crowdsense_local.db"