// backend/src/main/java/com/crowdsense/controller/StallController.java
package com.crowdsense.controller;

import com.crowdsense.model.Stall;
import com.crowdsense.service.StallService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class StallController {

    private final StallService stallService;

    // ── GET /events/{eventId}/stalls?category= ────────────────────────────────

    @GetMapping("/api/v1/events/{eventId}/stalls")
    public ResponseEntity<List<Stall>> list(
            @PathVariable String eventId,
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(stallService.getByEventAndCategory(eventId, category));
    }

    // ── POST /events/{eventId}/stalls ─────────────────────────────────────────

    @PostMapping("/api/v1/events/{eventId}/stalls")
    public ResponseEntity<Stall> create(
            @PathVariable String eventId,
            @RequestBody Stall stall) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(stallService.create(eventId, stall));
    }

    // ── PUT /stalls/{id} ──────────────────────────────────────────────────────

    @PutMapping("/api/v1/stalls/{id}")
    public ResponseEntity<Stall> update(
            @PathVariable String id,
            @RequestBody Stall stall) {
        return stallService.update(id, stall)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ── DELETE /stalls/{id} ───────────────────────────────────────────────────

    @DeleteMapping("/api/v1/stalls/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable String id) {
        stallService.deactivate(id);
        return ResponseEntity.ok(Map.of("status", "deactivated"));
    }
}