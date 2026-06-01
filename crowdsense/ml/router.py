# ml/router.py
# Dijkstra-based route planner that weights edges by crowd density.
# The zone graph is passed in from Spring Boot — ML service is stateless.

import heapq
import math
import logging
from typing import Any

logger = logging.getLogger(__name__)


# ── Crowd cost function ───────────────────────────────────────────────────────

def crowd_cost_multiplier(person_count: int, max_capacity: int) -> float:
    """
    Maps crowd density → traversal cost multiplier.
    density 0%   → 1.0×   (free to walk through)
    density 50%  → 3.2×
    density 100% → 10.0×  (very costly to traverse)

    Uses exponential curve: cost = 1 + 9 * density²
    """
    capacity = max(max_capacity, 1)
    density  = min(person_count / capacity, 1.0)
    return 1.0 + 9.0 * (density ** 2)


# ── Dijkstra ──────────────────────────────────────────────────────────────────

def dijkstra(
    graph: dict,          # {zone_id: [{zone_id, distance_m}]}
    crowd_data: dict,     # {zone_id: {person_count, crowd_level, ...}}
    locations: dict,      # {zone_id: {lat, lng, name, max_capacity, ...}}
    start: str,
    end: str,
) -> dict:
    """
    Find the least-crowd-cost path from start zone to end zone.

    Returns
    -------
    {
      path: [zone_id, ...],
      waypoints: [{lat, lng, name, crowdLevel, personCount}, ...],
      estimated_time_s: int,
      total_distance_m: int,
      crowd_cost: float
    }
    """
    INF    = float("inf")
    dist   = {z: INF for z in graph}
    dist[start] = 0.0
    prev   = {}
    pq     = [(0.0, start)]

    while pq:
        cost, u = heapq.heappop(pq)
        if cost > dist[u]:
            continue
        if u == end:
            break
        for edge in graph.get(u, []):
            v       = edge["zone_id"]
            d_m     = edge["distance_m"]
            info    = crowd_data.get(v, {})
            locinfo = locations.get(v, {})
            mult    = crowd_cost_multiplier(
                info.get("person_count", 0),
                locinfo.get("max_capacity", 100),
            )
            new_cost = dist[u] + d_m * mult
            if new_cost < dist.get(v, INF):
                dist[v] = new_cost
                prev[v] = u
                heapq.heappush(pq, (new_cost, v))

    # ── Reconstruct path ──────────────────────────────────────────────────
    if end not in prev and start != end:
        logger.warning(f"[ROUTER] No path found from {start} to {end}")
        return {"path": [start], "waypoints": [], "estimated_time_s": 0,
                "total_distance_m": 0, "crowd_cost": 0.0}

    path = []
    node = end
    while node in prev:
        path.append(node)
        node = prev[node]
    path.append(start)
    path.reverse()

    # ── Build waypoints ───────────────────────────────────────────────────
    waypoints = []
    for z in path:
        loc = locations.get(z, {})
        cd  = crowd_data.get(z, {})
        waypoints.append({
            "zoneId":      z,
            "lat":         loc.get("latitude"),
            "lng":         loc.get("longitude"),
            "name":        loc.get("name", z),
            "crowdLevel":  cd.get("crowd_level", "LOW"),
            "personCount": cd.get("person_count", 0),
        })

    # ── Walking time: average 1.4 m/s ────────────────────────────────────
    total_dist_m = 0.0
    for i in range(len(path) - 1):
        u, v = path[i], path[i + 1]
        edge_dist = next(
            (e["distance_m"] for e in graph.get(u, []) if e["zone_id"] == v),
            50.0,   # fallback if edge not explicitly listed
        )
        total_dist_m += edge_dist

    return {
        "path":             path,
        "waypoints":        waypoints,
        "estimated_time_s": int(total_dist_m / 1.4),
        "total_distance_m": int(total_dist_m),
        "crowd_cost":       round(dist.get(end, 0.0), 2),
    }


# ── Re-route decision ─────────────────────────────────────────────────────────

def should_reroute(
    old_path: list,
    new_path: list,
    crowd_changes: dict,   # zone_id → new crowd_level
    user_moved_m: float,
) -> tuple:
    """
    Decide if the user should be shown a new route.

    Returns (bool, reason_str)
    """
    # 1. User has physically moved far — recalculate from new position
    if user_moved_m > 20:
        return True, "user_moved"

    # 2. A zone on the CURRENT path became CRITICAL
    for zone_id in old_path:
        if crowd_changes.get(zone_id) == "CRITICAL":
            return True, f"critical_zone_{zone_id}"

    # 3. New path is completely different (no shared intermediate zones)
    old_mid = set(old_path[1:-1])
    new_mid = set(new_path[1:-1])
    if old_mid and len(old_mid & new_mid) == 0:
        return True, "completely_different_path"

    # 4. New path saves ≥ 30 % traversal time
    old_cost = sum(crowd_changes.get(z, 1) for z in old_path)
    new_cost = sum(crowd_changes.get(z, 1) for z in new_path)
    if old_cost > 0 and (old_cost - new_cost) / old_cost >= 0.30:
        return True, "30_percent_faster"

    return False, "no_significant_change"


# ── Haversine distance ────────────────────────────────────────────────────────

def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    R = 6_371_000  # metres
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    dφ     = math.radians(lat2 - lat1)
    dλ     = math.radians(lng2 - lng1)
    a      = math.sin(dφ/2)**2 + math.cos(φ1)*math.cos(φ2)*math.sin(dλ/2)**2
    return R * 2 * math.asin(math.sqrt(a))