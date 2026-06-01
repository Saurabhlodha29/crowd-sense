// backend/src/main/java/com/crowdsense/service/ZoneConnectionService.java
package com.crowdsense.service;

import com.crowdsense.model.ZoneConnection;
import com.crowdsense.repository.ZoneConnectionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ZoneConnectionService {

    private final ZoneConnectionRepository repo;

    public List<ZoneConnection> getByEvent(String eventId) {
        return repo.findByEventId(eventId);
    }

    public ZoneConnection create(ZoneConnection conn) {
        ZoneConnection saved = repo.save(conn);
        log.info("[ZONE-CONN] Created: {} ↔ {} ({}m) in event {}",
                saved.getFromZoneId(), saved.getToZoneId(), saved.getDistanceM(), saved.getEventId());
        return saved;
    }

    public void delete(String id) {
        repo.deleteById(id);
    }

    /**
     * Build an adjacency list: zone_id → [{zone_id, distance_m}]
     * Used by RouteService to pass the graph to the ML service.
     */
    public Map<String, List<Map<String, Object>>> buildGraph(String eventId) {
        List<ZoneConnection> connections = repo.findByEventId(eventId);
        Map<String, List<Map<String, Object>>> graph = new HashMap<>();

        for (ZoneConnection c : connections) {
            // Both directions (undirected walking paths)
            graph.computeIfAbsent(c.getFromZoneId(), k -> new ArrayList<>())
                    .add(Map.of("zone_id", c.getToZoneId(), "distance_m", c.getDistanceM()));
            graph.computeIfAbsent(c.getToZoneId(), k -> new ArrayList<>())
                    .add(Map.of("zone_id", c.getFromZoneId(), "distance_m", c.getDistanceM()));
        }
        return graph;
    }

    /**
     * Auto-generate connections between all adjacent zones of an event.
     * Uses Euclidean distance between zone centres as edge weight.
     * Call this after an organiser creates all their zones — saves them
     * from manually defining every connection.
     */
    public List<ZoneConnection> autoConnect(String eventId,
            List<com.crowdsense.model.Location> zones) {
        List<ZoneConnection> created = new ArrayList<>();
        for (int i = 0; i < zones.size(); i++) {
            for (int j = i + 1; j < zones.size(); j++) {
                var a = zones.get(i);
                var b = zones.get(j);
                double distM = haversineMeters(
                        a.getLatitude(), a.getLongitude(),
                        b.getLatitude(), b.getLongitude());
                // Only connect zones within 300m of each other
                if (distM <= 300) {
                    ZoneConnection conn = ZoneConnection.builder()
                            .eventId(eventId)
                            .fromZoneId(a.getId())
                            .toZoneId(b.getId())
                            .distanceM((double) Math.round(distM))
                            .isExitRoute(false)
                            .build();
                    try {
                        created.add(repo.save(conn));
                    } catch (Exception e) {
                        // Unique constraint — connection already exists, skip
                    }
                }
            }
        }
        log.info("[ZONE-CONN] Auto-connected {} zone pairs for event {}", created.size(), eventId);
        return created;
    }

    private double haversineMeters(double lat1, double lng1, double lat2, double lng2) {
        double R = 6_371_000;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                        * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.asin(Math.sqrt(a));
    }
}