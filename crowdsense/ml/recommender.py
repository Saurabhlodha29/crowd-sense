# ml/recommender.py
# Content-based stall recommendation engine.
#
# Score formula (weighted sum, higher = better recommendation):
#   score = preference_match * 0.40
#         + (1 / crowd_density) * 0.35
#         + (1 / distance_factor) * 0.25
#
# Phase 1 (now): rule-based scoring — no training needed.
# Phase 3 (later): replace preference_match with a trained
#                  collaborative filtering model (matrix factorisation).

import math
import logging
from typing import Any

logger = logging.getLogger(__name__)

# Crowd level → base cost (higher = more crowded = less desirable)
CROWD_COST = {"LOW": 1.0, "MEDIUM": 2.5, "HIGH": 5.0, "CRITICAL": 10.0, "UNKNOWN": 3.0}


def score_stalls(
    stalls:     list,        # [{id, name, category, zone_id, latitude, longitude, rating}]
    crowd_data: dict,        # {zone_id: {crowd_level, person_count, ...}}
    prefs:      list,        # ["food", "activity", ...]  — from attendee profile
    user_lat:   float | None = None,
    user_lng:   float | None = None,
) -> list:
    """
    Score and rank stalls.  Returns list sorted best-first.
    """
    if not stalls:
        return []

    scored = []
    for stall in stalls:
        s = _score_one(stall, crowd_data, prefs, user_lat, user_lng)
        scored.append({**stall, "score": round(s, 4)})

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored


def _score_one(
    stall:      dict,
    crowd_data: dict,
    prefs:      list,
    user_lat:   float | None,
    user_lng:   float | None,
) -> float:
    # ── 1. Preference match (0–1) ─────────────────────────────────────────
    stall_cat = (stall.get("category") or "").lower()
    pref_lower = [p.lower() for p in prefs] if prefs else []
    if pref_lower:
        pref_score = 1.0 if stall_cat in pref_lower else 0.2
    else:
        pref_score = 0.5   # neutral if no preferences stated

    # ── 2. Crowd factor (0–1, higher = less crowded) ─────────────────────
    zone_id    = stall.get("zone_id")
    zone_cd    = crowd_data.get(zone_id, {})
    level      = zone_cd.get("crowd_level", "UNKNOWN")
    crowd_inv  = 1.0 / CROWD_COST.get(level, 3.0)   # range ~0.1 – 1.0

    # ── 3. Distance factor (0–1, closer = higher score) ──────────────────
    slat = stall.get("latitude")
    slng = stall.get("longitude")
    if user_lat and user_lng and slat and slng:
        dist_m = _haversine(user_lat, user_lng, slat, slng)
        # Normalize: 0 m → 1.0, 500 m → 0.5, 2000 m → ~0.2
        dist_factor = 1.0 / (1.0 + dist_m / 500.0)
    else:
        dist_factor = 0.5   # neutral if no location data

    # ── 4. Rating bonus (0–0.1 extra) ────────────────────────────────────
    rating_bonus = (stall.get("rating") or 0) / 50.0   # 5-star → +0.1

    score = (
        pref_score  * 0.40 +
        crowd_inv   * 0.35 +
        dist_factor * 0.25 +
        rating_bonus
    )
    return score


def _haversine(lat1, lng1, lat2, lng2) -> float:
    R = 6_371_000
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    dφ = math.radians(lat2 - lat1)
    dλ = math.radians(lng2 - lng1)
    a  = math.sin(dφ/2)**2 + math.cos(φ1)*math.cos(φ2)*math.sin(dλ/2)**2
    return R * 2 * math.asin(math.sqrt(a))