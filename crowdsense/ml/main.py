# ml/main.py
# FastAPI microservice — stateless, called by Spring Boot RouteService.
#
# Endpoints:
#   POST /route           — Dijkstra route from zone to stall
#   POST /route/check     — Should we reroute? (ML decision)
#   POST /recommend       — Ranked stall list
#   GET  /health          — Liveness check

from ml.recommender import score_stalls
from ml.router import should_reroute
from ml.router import haversine_m
from ml.router import dijkstra
import logging
import os
from typing import Any, Dict, Optional, List

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

from fastapi import FastAPI, HTTPException
try:
    from fastapi.middleware.cors import CORSMiddleware
except ImportError:  # pragma: no cover
    CORSMiddleware = None  # type: ignore
    logger.warning("fastapi.middleware.cors not available; CORS middleware will be disabled.")
from pydantic import BaseModel

app = FastAPI(title="CrowdSense ML Service", version="2.0.0")

if CORSMiddleware:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    logger.info("CORS middleware not installed; skipping CORS configuration.")


# ── Pydantic models ───────────────────────────────────────────────────────────

class RouteRequest(BaseModel):
    from_zone:  str
    to_stall:   str
    event_id:   str
    user_lat:   Optional[float] = None
    user_lng:   Optional[float] = None
    crowd_data: Dict[str, Any]  = {}
    zone_graph: Dict[str, Any]  = {}
    locations:  Dict[str, Any]  = {}


class RerouteCheckRequest(BaseModel):
    old_path:     list
    new_path:     Optional[list]  = None
    current_zone: str
    event_id:     str
    user_lat:     Optional[float] = None
    user_lng:     Optional[float] = None
    prev_lat:     Optional[float] = None
    prev_lng:     Optional[float] = None
    crowd_data:   Dict[str, Any]  = {}
    zone_graph:   Dict[str, Any]  = {}
    locations:    Dict[str, Any]  = {}


class RecommendRequest(BaseModel):
    event_id:   str
    prefs:      str  = ""
    zone:       Optional[str] = None
    user_lat:   Optional[float] = None
    user_lng:   Optional[float] = None
    crowd_data: Dict[str, Any]  = {}
    stalls:     list = []


# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "UP", "service": "crowdsense-ml"}


@app.post("/route")
def get_route(req: RouteRequest):
    """
    Dijkstra from req.from_zone to req.to_stall (treated as destination zone).
    The to_stall's zone_id is used as the graph destination.
    """
    try:
        # Normalise graph edges: [{zone_id, distance_m}]
        graph = {
            k: [{"zone_id": e["zone_id"], "distance_m": float(e.get("distance_m", 50))}
                for e in v]
            for k, v in req.zone_graph.items()
        }

        # If graph is empty (organiser hasn't defined connections yet),
        # synthesise direct edge from start to destination
        dest = req.to_stall  # stall id or zone id
        if not graph or dest not in graph:
            # Try to find the stall's zone from crowd_data keys
            dest_zone = next(
                (z for z in req.crowd_data if z != req.from_zone), dest
            )
            graph.setdefault(req.from_zone, []).append(
                {"zone_id": dest_zone, "distance_m": 100.0}
            )
            graph.setdefault(dest_zone, []).append(
                {"zone_id": req.from_zone, "distance_m": 100.0}
            )
            dest = dest_zone

        result = dijkstra(graph, req.crowd_data, req.locations, req.from_zone, dest)
        return result

    except Exception as e:
        logger.error(f"[ROUTE] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/route/check")
def check_reroute(req: RerouteCheckRequest):
    """
    Decides if the current route needs updating.
    Recalculates the optimal path and compares with old_path.
    """
    try:
        # How far has the user moved?
        moved_m = 0.0
        if all(v is not None for v in [req.user_lat, req.user_lng, req.prev_lat, req.prev_lng]):
            moved_m = haversine_m(req.prev_lat, req.prev_lng, req.user_lat, req.user_lng)

        # Compute new path
        graph = {
            k: [{"zone_id": e["zone_id"], "distance_m": float(e.get("distance_m", 50))}
                for e in v]
            for k, v in req.zone_graph.items()
        }
        end = req.old_path[-1] if req.old_path else req.current_zone
        new_route = dijkstra(graph, req.crowd_data, req.locations, req.current_zone, end)
        new_path  = new_route.get("path", [])

        # Crowd changes dict (zone → crowd_level) from crowd_data
        crowd_changes = {z: d.get("crowd_level", "LOW") for z, d in req.crowd_data.items()}

        do_reroute, reason = should_reroute(req.old_path, new_path, crowd_changes, moved_m)

        return {
            "reroute":   do_reroute,
            "reason":    reason,
            "new_route": new_route if do_reroute else None,
        }
    except Exception as e:
        logger.error(f"[REROUTE] Error: {e}", exc_info=True)
        return {"reroute": False, "reason": "error"}


@app.post("/recommend")
def recommend(req: RecommendRequest):
    """Rank stalls by preference match × crowd lightness × distance."""
    try:
        pref_list = [p.strip() for p in req.prefs.split(",") if p.strip()]

        # Filter stalls to current zone if zone is provided
        stalls = req.stalls
        if req.zone:
            zone_stalls = [s for s in stalls if s.get("zone_id") == req.zone]
            # If zone has stalls show those first, else show all
            if zone_stalls:
                other = [s for s in stalls if s.get("zone_id") != req.zone]
                stalls = zone_stalls + other

        ranked = score_stalls(
            stalls     = stalls,
            crowd_data = req.crowd_data,
            prefs      = pref_list,
            user_lat   = req.user_lat,
            user_lng   = req.user_lng,
        )
        return {"recommendations": ranked, "total": len(ranked)}
    except Exception as e:
        logger.error(f"[RECOMMEND] Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    try:
        import uvicorn
    except ImportError:
        raise RuntimeError(
            "uvicorn is not installed. Install it with 'pip install uvicorn' to run the server."
        )

    port = int(os.getenv("PORT", 8001))
    uvicorn.run(
        "ml.main:app",
        host="0.0.0.0",
        port=port,
        reload=True
    )