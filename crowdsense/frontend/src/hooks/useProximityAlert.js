// frontend/src/hooks/useProximityAlert.js
import { useEffect, useRef } from "react";
import { haversineMeters } from "../utils/haversine";

const PROXIMITY_THRESHOLD_M = 80;

/**
 * Fires a browser notification + callback when a CRITICAL zone is within
 * PROXIMITY_THRESHOLD_M of the user's location.
 */
export function useProximityAlert(userLocation, zones, onAlert) {
  const notifiedZones = useRef(new Set());

  useEffect(() => {
    if (!userLocation || !zones?.length) return;

    zones.forEach((zone) => {
      if (zone.crowdLevel !== "CRITICAL") {
        // Reset so we re-alert if zone becomes critical again
        notifiedZones.current.delete(zone.zoneId || zone.id);
        return;
      }

      const zoneId = zone.zoneId || zone.id;
      if (notifiedZones.current.has(zoneId)) return;

      const zoneLat = zone.latitude || zone.lat;
      const zoneLng = zone.longitude || zone.lng;
      if (!zoneLat || !zoneLng) return;

      const dist = haversineMeters(userLocation.lat, userLocation.lng, zoneLat, zoneLng);

      if (dist <= PROXIMITY_THRESHOLD_M) {
        notifiedZones.current.add(zoneId);

        // Browser notification (requires Notification API permission)
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("⚠️ CrowdSense Alert", {
            body: `CRITICAL crowd detected near ${zone.zoneName || zone.name}! Consider another route.`,
            icon: "/icon.png",
          });
        }

        // Also call the component callback for in-app banner
        onAlert?.({
          zoneId,
          zoneName:    zone.zoneName || zone.name,
          distanceM:   Math.round(dist),
          crowdLevel:  "CRITICAL",
          personCount: zone.personCount,
        });
      }
    });
  }, [userLocation, zones]);
}