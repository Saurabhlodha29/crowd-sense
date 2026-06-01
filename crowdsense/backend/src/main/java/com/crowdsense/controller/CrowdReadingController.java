// backend/src/main/java/com/crowdsense/controller/CrowdReadingController.java
package com.crowdsense.controller;

import com.crowdsense.dto.CrowdReadingDTO;
import com.crowdsense.model.CrowdReading;
import com.crowdsense.service.CrowdReadingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/readings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CrowdReadingController {

    private final CrowdReadingService crowdReadingService;

    // ── Health check ──────────────────────────────────────────────────────────

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }

    // ── Create (sensor POST) ──────────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<CrowdReading> create(@Valid @RequestBody CrowdReadingDTO dto) {
        CrowdReading saved = crowdReadingService.saveReading(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // ── Latest per location ───────────────────────────────────────────────────

    /**
     * GET /readings/latest → latest per ALL locations
     * GET /readings/latest?eventId= → latest per zones of ONE event
     */
    @GetMapping("/latest")
    public ResponseEntity<List<CrowdReading>> latest(
            @RequestParam(required = false) String eventId) {
        if (eventId != null && !eventId.isBlank()) {
            return ResponseEntity.ok(crowdReadingService.getLatestPerLocationByEvent(eventId));
        }
        return ResponseEntity.ok(crowdReadingService.getLatestPerLocation());
    }

    // ── Time-series for one location ──────────────────────────────────────────

    @GetMapping("/location/{locationId}")
    public ResponseEntity<List<CrowdReading>> byLocation(
            @PathVariable String locationId,
            @RequestParam(defaultValue = "100") int limit) {
        return ResponseEntity.ok(crowdReadingService.getByLocation(locationId, limit));
    }
}