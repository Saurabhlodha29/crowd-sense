package com.crowdsense.controller;

import com.crowdsense.dto.LocationDTO;
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
        return ResponseEntity.ok(locationService.getById(id));
    }

    @PostMapping
    public ResponseEntity<Location> createLocation(@RequestBody LocationDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(locationService.createLocation(dto));
    }
}