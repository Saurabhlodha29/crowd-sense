// backend/src/main/java/com/crowdsense/service/RouteService.java
package com.crowdsense.service;

import com.crowdsense.model.CrowdReading;
import com.crowdsense.model.Location;
import com.crowdsense.repository.CrowdReadingRepository;
import com.crowdsense.repository.LocationRepository;
import com.crowdsense.repository.StallRepository;
import com.crowdsense.repository.ZoneConnectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RouteService {

    private final CrowdReadingRepository readingRepo;
    private final LocationRepository locationRepo;
    private final StallRepository stallRepo;
    private final ZoneConnectionRepository zoneConnRepo;
    private final RestTemplate restTemplate;

    @Value("${ml.service.url:http://localhost:8001}")
    private String mlUrl;

    // ── Route ─────────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public Map<String, Object> getRoute(
            String fromZone, String toStall, String eventId,
            Double userLat, Double userLng) {

        // Build payload for ML service
        Map<String, Object> payload = new HashMap<>();
        payload.put("from_zone", fromZone);
        payload.put("to_stall", toStall);
        payload.put("event_id", eventId);
        if (userLat != null)
            payload.put("user_lat", userLat);
        if (userLng != null)
            payload.put("user_lng", userLng);

        // Attach latest crowd data so ML doesn't need its own DB call
        payload.put("crowd_data", buildCrowdSnapshot(eventId));
        payload.put("zone_graph", buildZoneGraph(eventId));

        try {
            Map<String, Object> result = restTemplate.postForObject(
                    mlUrl + "/route", payload, Map.class);
            if (result != null)
                return result;
        } catch (Exception e) {
            log.warn("[ROUTE] ML service unavailable ({}), using fallback Dijkstra", e.getMessage());
        }

        // ── Fallback: simple shortest-path ignoring crowd ─────────────────
        return fallbackRoute(fromZone, toStall, eventId);
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> checkReroute(Map<String, Object> body) {
        body.put("crowd_data", buildCrowdSnapshot((String) body.get("eventId")));
        try {
            Map<String, Object> result = restTemplate.postForObject(
                    mlUrl + "/route/check", body, Map.class);
            if (result != null)
                return result;
        } catch (Exception e) {
            log.warn("[ROUTE] ML reroute check unavailable: {}", e.getMessage());
        }
        return Map.of("reroute", false, "reason", "ml_unavailable");
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> getRecommendations(
            String eventId, String prefs, String zone) {

        Map<String, Object> payload = new HashMap<>();
        payload.put("event_id", eventId);
        payload.put("prefs", prefs);
        payload.put("zone", zone);
        payload.put("crowd_data", buildCrowdSnapshot(eventId));

        // Attach stall list so ML can rank without its own DB
        UUID parsedEventId = UUID.fromString(eventId);
        List<Map<String, Object>> stalls = stallRepo.findByEventIdAndIsActiveTrue(parsedEventId)
                .stream()
                .map(s -> {
                    Map<String, Object> m = new HashMap<>();
                    m.put("id", s.getId());
                    m.put("name", s.getName());
                    m.put("category", s.getCategory());
                    m.put("zone_id", s.getZoneId());
                    m.put("latitude", s.getLatitude());
                    m.put("longitude", s.getLongitude());
                    m.put("rating", s.getRating());
                    return m;
                })
                .collect(Collectors.toList());
        payload.put("stalls", stalls);

        try {
            Map<String, Object> result = restTemplate.postForObject(
                    mlUrl + "/recommend", payload, Map.class);
            if (result != null)
                return result;
        } catch (Exception e) {
            log.warn("[ROUTE] ML recommend unavailable: {}", e.getMessage());
        }

        // ── Fallback: sort stalls by crowd level ascending ────────────────
        return fallbackRecommend(eventId, stalls);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Snapshot of latest person_count and crowd_level per zone for the event. */
    private Map<String, Map<String, Object>> buildCrowdSnapshot(String eventId) {
        List<CrowdReading> readings = readingRepo.findLatestPerLocationByEventId(eventId);
        Map<String, Map<String, Object>> snap = new HashMap<>();
        for (CrowdReading r : readings) {
            Map<String, Object> info = new HashMap<>();
            info.put("person_count", r.getPersonCount());
            info.put("crowd_level", r.getCrowdLevel().name());
            snap.put(r.getLocationId(), info);
        }
        return snap;
    }

    /** Zone graph: zone_id → [{neighbor_id, distance_m}] */
    private Map<String, List<Map<String, Object>>> buildZoneGraph(String eventId) {
        var connections = zoneConnRepo.findByEventId(UUID.fromString(eventId));
        Map<String, List<Map<String, Object>>> graph = new HashMap<>();
        for (var c : connections) {
            graph.computeIfAbsent(c.getFromZoneId(), k -> new ArrayList<>())
                    .add(Map.of("zone_id", c.getToZoneId(), "distance_m", c.getDistanceM()));
            // Undirected graph — add reverse edge
            graph.computeIfAbsent(c.getToZoneId(), k -> new ArrayList<>())
                    .add(Map.of("zone_id", c.getFromZoneId(), "distance_m", c.getDistanceM()));
        }
        return graph;
    }

    private Map<String, Object> fallbackRoute(
            String fromZone, String toStall, String eventId) {
        // Just return a direct single-hop route to the stall's zone
        return Map.of(
                "path", List.of(fromZone, toStall),
                "waypoints", List.of(),
                "estimated_time_s", 120,
                "total_distance_m", 150,
                "note", "Simplified fallback route — ML service offline");
    }

    private Map<String, Object> fallbackRecommend(
            String eventId, List<Map<String, Object>> stalls) {
        // Return stalls ordered by rating desc as a simple non-personalized fallback
        List<Map<String, Object>> sorted = stalls.stream()
                .sorted(Comparator.comparingDouble(
                        s -> -((Number) s.getOrDefault("rating", 0)).doubleValue()))
                .collect(Collectors.toList());
        return Map.of(
                "recommendations", sorted,
                "note", "Popularity-based fallback — ML service offline");
    }
}
