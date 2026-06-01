// backend/src/main/java/com/crowdsense/controller/EventController.java
package com.crowdsense.controller;

import com.crowdsense.dto.EventDTO;
import com.crowdsense.model.Event;
import com.crowdsense.service.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EventController {

    private final EventService eventService;

    // ── Public endpoints ──────────────────────────────────────────────────────

    /** Public event listing with optional status + city filter + pagination. */
    @GetMapping
    public ResponseEntity<Page<Event>> list(
            @RequestParam(defaultValue = "LIVE") String status,
            @RequestParam(required = false) String city,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(eventService.list(status, city, page, size));
    }

    /** Full-text + geo search: ?q=&city=&lat=&lng=&radius=50 */
    @GetMapping("/search")
    public ResponseEntity<List<Event>> search(
            @RequestParam String q,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) Double lat,
            @RequestParam(required = false) Double lng,
            @RequestParam(defaultValue = "50") int radius,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(eventService.search(q, city, lat, lng, radius, page, size));
    }

    /** Event detail — includes zones and latest crowd per zone. */
    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getDetail(@PathVariable String id) {
        return eventService.getDetail(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ── Organiser-protected endpoints ─────────────────────────────────────────

    /** Returns only events owned by the authenticated organiser. */
    @GetMapping("/mine")
    public ResponseEntity<List<Event>> getMine(Authentication auth) {
        String email = auth.getName();
        return ResponseEntity.ok(eventService.getByOrganizer(email));
    }

    @PostMapping
    public ResponseEntity<Event> create(
            @RequestBody EventDTO dto,
            Authentication auth) {
        Event saved = eventService.create(dto, auth.getName());
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Event> update(
            @PathVariable String id,
            @RequestBody EventDTO dto,
            Authentication auth) {
        return eventService.update(id, dto, auth.getName())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Transition lifecycle: DRAFT → LIVE → ENDED */
    @PutMapping("/{id}/status")
    public ResponseEntity<Event> setStatus(
            @PathVariable String id,
            @RequestParam String status,
            Authentication auth) {
        return eventService.setStatus(id, status, auth.getName())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(
            @PathVariable String id,
            Authentication auth) {
        eventService.deactivate(id, auth.getName());
        return ResponseEntity.ok(Map.of("status", "deactivated"));
    }

    /** Analytics: historical crowd data + peak stats for one event. */
    @GetMapping("/{id}/analytics")
    public ResponseEntity<Map<String, Object>> analytics(
            @PathVariable String id,
            Authentication auth) {
        return ResponseEntity.ok(eventService.getAnalytics(id, auth.getName()));
    }
}