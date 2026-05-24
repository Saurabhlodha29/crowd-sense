package com.crowdsense.controller;

import com.crowdsense.model.Location;
import com.crowdsense.service.LocationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/locations")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class LocationController {

    private final LocationService locationService;

    @GetMapping
    public ResponseEntity<List<Location>> getAllLocations() {
        return ResponseEntity.ok(locationService.getAllActiveLocations());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Location> getLocation(@PathVariable String id) {
        return locationService.getLocationById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Location> createLocation(@RequestBody Location location) {
        return ResponseEntity.status(HttpStatus.CREATED).body(locationService.createLocation(location));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deactivateLocation(@PathVariable String id) {
        return locationService.deactivateLocation(id)
                .map(l -> ResponseEntity.noContent().<Void>build())
                .orElse(ResponseEntity.notFound().build());
    }
}