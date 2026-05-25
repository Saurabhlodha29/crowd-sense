# ml/main.py
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from recommender import get_recommendations
import uvicorn
import os

app = FastAPI(title="CrowdSense ML Service", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "UP", "service": "crowdsense-ml"}

@app.get("/recommend")
def recommend(
    event_id: str = Query(..., description="Event UUID"),
    prefs:    str  = Query("food,activity", description="Comma-separated preference categories"),
    lat:      float = Query(28.6139, description="User latitude"),
    lon:      float = Query(77.2090, description="User longitude"),
    top_n:    int   = Query(5, description="Number of recommendations to return")
):
    """
    Returns ranked stall recommendations for an event attendee.
    Considers: preference match, current crowd density, distance from user.
    """
    pref_list = [p.strip().lower() for p in prefs.split(",") if p.strip()]
    results = get_recommendations(event_id, pref_list, lat, lon, top_n)
    return {
        "event_id":        event_id,
        "preferences":     pref_list,
        "recommendations": results,
        "count":           len(results)
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)