// backend/src/main/java/com/crowdsense/controller/RouteController.java
package com.crowdsense.controller;

import com.crowdsense.service.RouteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RouteController {

    private final RouteService routeService;

    /**
     * Smart route from user's current zone to a destination stall.
     *
     * GET /api/v1/route?from_zone=zone_id&to_stall=stall_id&event_id=uuid
     * &user_lat=18.52&user_lng=73.85
     *
     * Response:
     * {
     * "path": ["zone_a", "zone_b", "zone_c"],
     * "waypoints": [{"lat":18.52,"lng":73.85,"name":"Entry","crowdLevel":"LOW"},
     * ...],
     * "estimated_time_s": 180,
     * "total_distance_m": 250
     * }
     */
    @GetMapping("/route")
    public ResponseEntity<Map<String, Object>> getRoute(
            @RequestParam String fromZone,
            @RequestParam String toStall,
            @RequestParam String eventId,
            @RequestParam(required = false) Double userLat,
            @RequestParam(required = false) Double userLng) {

        Map<String, Object> result = routeService.getRoute(fromZone, toStall, eventId, userLat, userLng);
        return ResponseEntity.ok(result);
    }

    /**
     * Reroute check — the frontend calls this every 5 s to ask:
     * "Has the crowd changed enough that I need a new route?"
     *
     * POST /api/v1/route/check
     * body: { oldPath: [...], currentZone: "...", eventId: "...", userLat: ...,
     * userLng: ... }
     */
    @PostMapping("/route/check")
    public ResponseEntity<Map<String, Object>> checkReroute(
            @RequestBody Map<String, Object> body) {
        Map<String, Object> result = routeService.checkReroute(body);
        return ResponseEntity.ok(result);
    }

    /**
     * Stall recommendations for an event.
     * GET /api/v1/recommend?event_id=&prefs=food,activity&zone=zone_id
     */
    @GetMapping("/recommend")
    public ResponseEntity<Map<String, Object>> recommend(
            @RequestParam String eventId,
            @RequestParam(required = false, defaultValue = "") String prefs,
            @RequestParam(required = false) String zone) {
        Map<String, Object> result = routeService.getRecommendations(eventId, prefs, zone);
        return ResponseEntity.ok(result);
    }
}