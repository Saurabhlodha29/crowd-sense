# ml/recommender.py
import os
import requests
from typing import List, Dict

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8080")

# Category preference weights — how much the user cares about each category
CATEGORY_WEIGHTS = {
    "food":        1.0,
    "merchandise": 0.8,
    "activity":    0.9,
    "service":     0.6,
    "stage":       1.0,
}

def fetch_crowd_data(event_id: str) -> Dict[str, int]:
    """Get current person_count per zone for this event from the backend."""
    try:
        r = requests.get(f"{BACKEND_URL}/api/v1/readings/latest", timeout=5)
        if r.status_code == 200:
            readings = r.json()
            # {location_id: person_count}
            return {rd["locationId"]: rd["personCount"] for rd in readings}
    except Exception:
        pass
    return {}

def fetch_stalls(event_id: str) -> List[Dict]:
    """Get all active stalls for this event from the backend."""
    try:
        r = requests.get(f"{BACKEND_URL}/api/v1/events/{event_id}/stalls", timeout=5)
        if r.status_code == 200:
            return r.json()
    except Exception:
        pass
    # Fallback: demo stalls for testing
    return [
        {"id": "s1", "name": "Biryani Corner",  "category": "food",        "zone_id": "loc_001", "latitude": 28.6139, "longitude": 77.2090},
        {"id": "s2", "name": "Craft Market",    "category": "merchandise", "zone_id": "loc_001", "latitude": 28.6140, "longitude": 77.2091},
        {"id": "s3", "name": "Main Stage",      "category": "stage",       "zone_id": "loc_002", "latitude": 28.6141, "longitude": 77.2092},
        {"id": "s4", "name": "Coffee Stall",    "category": "food",        "zone_id": "loc_002", "latitude": 28.6142, "longitude": 77.2093},
        {"id": "s5", "name": "Gaming Zone",     "category": "activity",    "zone_id": "loc_003", "latitude": 28.6143, "longitude": 77.2094},
    ]

def score_stall(stall: Dict, prefs: List[str], crowd_data: Dict, user_lat: float, user_lon: float) -> float:
    """
    Score = preference_match (0.4) + crowd_inverse (0.35) + distance_inverse (0.25)
    All components normalized 0-1.
    """
    # 1. Preference match
    category = stall.get("category", "")
    base_weight = CATEGORY_WEIGHTS.get(category, 0.5)
    pref_match = 1.0 if category in prefs else base_weight * 0.3

    # 2. Crowd density (lower crowd = higher score)
    zone_id = stall.get("zone_id")
    crowd = crowd_data.get(zone_id, 0) if zone_id else 0
    # Normalize: 0 people = 1.0, 100 people = 0.0
    crowd_score = max(0.0, 1.0 - crowd / 100.0)

    # 3. Distance (simple Euclidean approximation — good enough for venue scale)
    stall_lat = stall.get("latitude", user_lat)
    stall_lon = stall.get("longitude", user_lon)
    dist = ((stall_lat - user_lat) ** 2 + (stall_lon - user_lon) ** 2) ** 0.5
    # Normalize: 0 distance = 1.0, 0.01 degree (~1km) = 0.0
    dist_score = max(0.0, 1.0 - dist / 0.01)

    return round(pref_match * 0.40 + crowd_score * 0.35 + dist_score * 0.25, 4)

def get_recommendations(event_id: str, prefs: List[str], user_lat: float, user_lon: float, top_n: int = 5) -> List[Dict]:
    crowd_data = fetch_crowd_data(event_id)
    stalls = fetch_stalls(event_id)

    scored = []
    for stall in stalls:
        s = score_stall(stall, prefs, crowd_data, user_lat, user_lon)
        zone_id = stall.get("zone_id")
        scored.append({
            **stall,
            "score":        s,
            "crowd_count":  crowd_data.get(zone_id, 0),
            "crowd_level":  _crowd_level(crowd_data.get(zone_id, 0)),
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_n]

def _crowd_level(count: int) -> str:
    if count < 10:  return "LOW"
    if count < 25:  return "MEDIUM"
    if count < 50:  return "HIGH"
    return "CRITICAL"