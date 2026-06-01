// backend/src/main/java/com/crowdsense/controller/ZoneConnectionController.java
package com.crowdsense.controller;

import com.crowdsense.model.ZoneConnection;
import com.crowdsense.repository.LocationRepository;
import com.crowdsense.service.ZoneConnectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/zone-connections")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class ZoneConnectionController {

    private final ZoneConnectionService service;
    private final LocationRepository locationRepo;

    /** GET /zone-connections?eventId= */
    @GetMapping
    public ResponseEntity<List<ZoneConnection>> list(
            @RequestParam String eventId) {
        return ResponseEntity.ok(service.getByEvent(eventId));
    }

    /**
     * POST /zone-connections
     * Body: { eventId, fromZoneId, toZoneId, distanceM, isExitRoute }
     * Requires JWT (ORGANIZER).
     */
    @PostMapping
    public ResponseEntity<ZoneConnection> create(
            @RequestBody ZoneConnection conn) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(conn));
    }

    /**
     * POST /zone-connections/auto?eventId=
     * Auto-generates connections between all zones within 300m.
     * Handy shortcut so the organiser doesn't have to define every edge.
     * Requires JWT (ORGANIZER).
     */
    @PostMapping("/auto")
    public ResponseEntity<Map<String, Object>> autoConnect(
            @RequestParam String eventId) {
        var zones = locationRepo.findByEventIdAndIsActiveTrue(eventId);
        var created = service.autoConnect(eventId, zones);
        return ResponseEntity.ok(Map.of(
                "created", created.size(),
                "connections", created));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}