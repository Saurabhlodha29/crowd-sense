import { useState, useEffect, useCallback } from "react";
import crowdApi from "../api/crowdApi.js";

export function useCrowdData() {
  const [locationReadings, setLocationReadings] = useState({});
  const [locations, setLocations] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [readingsRes, locRes, alertRes] = await Promise.all([
        crowdApi.getLatestReadings(),
        crowdApi.getLocations(),
        crowdApi.getAlerts(),
      ]);
      // Index latest readings by locationId
      const byLocation = {};
      (readingsRes.data || []).forEach((r) => {
        byLocation[r.locationId] = r;
      });
      setLocationReadings(byLocation);
      setLocations(locRes.data || []);
      setAlerts(alertRes.data || []);
      setError(null);
    } catch (e) {
      setError(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000); // re-poll every 30s as fallback
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Called by WebSocket hook to inject a live update
  const applyLiveUpdate = useCallback((update) => {
    setLocationReadings((prev) => ({
      ...prev,
      [update.locationId]: update,
    }));
  }, []);

  return { locationReadings, locations, alerts, loading, error, refetch: fetchAll, applyLiveUpdate };
}
