// backend/src/main/java/com/crowdsense/controller/LocationController.java
package com.crowdsense.controller;

import com.crowdsense.dto.LocationDTO;
import com.crowdsense.model.Location;
import com.crowdsense.service.LocationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/locations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LocationController {

    private final LocationService locationService;

    /** All active locations (optionally filtered by event). */
    @GetMapping
    public ResponseEntity<List<Location>> getLocations(
            @RequestParam(required = false) String eventId) {
        if (eventId != null) {
            return ResponseEntity.ok(locationService.getByEvent(eventId));
        }
        return ResponseEntity.ok(locationService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Location> getById(@PathVariable String id) {
        return locationService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Create a new zone / sensor location. Requires JWT. */
    @PostMapping
    public ResponseEntity<Location> create(@Valid @RequestBody LocationDTO dto) {
        Location saved = locationService.create(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /** Update a location (name, boundary, capacity, etc.). Requires JWT. */
    @PutMapping("/{id}")
    public ResponseEntity<Location> update(
            @PathVariable String id,
            @RequestBody LocationDTO dto) {
        return locationService.update(id, dto)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Soft-delete (sets is_active = false). Requires JWT. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deactivate(@PathVariable String id) {
        locationService.deactivate(id);
        return ResponseEntity.ok(Map.of("status", "deactivated", "id", id));
    }
}