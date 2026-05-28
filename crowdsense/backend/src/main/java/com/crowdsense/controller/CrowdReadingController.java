package com.crowdsense.controller;

import com.crowdsense.dto.CrowdReadingDTO;
import com.crowdsense.model.CrowdReading;
import com.crowdsense.service.CrowdReadingService;
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

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP", "service", "CrowdSense Backend"));
    }

    @PostMapping
    public ResponseEntity<CrowdReading> createReading(@RequestBody CrowdReadingDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(crowdReadingService.saveReading(dto));
    }

    @GetMapping("/latest")
    public ResponseEntity<List<CrowdReading>> getLatestReadings() {
        return ResponseEntity.ok(crowdReadingService.getLatestPerLocation());
    }

    @GetMapping("/location/{locationId}")
    public ResponseEntity<List<CrowdReading>> getReadingsByLocation(
            @PathVariable String locationId,
            @RequestParam(defaultValue = "200") int limit) {
        return ResponseEntity.ok(crowdReadingService.getByLocation(locationId, limit));
    }
}