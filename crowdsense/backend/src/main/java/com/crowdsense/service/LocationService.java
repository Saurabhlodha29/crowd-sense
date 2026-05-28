package com.crowdsense.service;

import com.crowdsense.dto.LocationDTO;
import com.crowdsense.model.Location;
import com.crowdsense.repository.LocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationRepository locationRepository;

    public List<Location> getAllActiveLocations() {
        return locationRepository.findByIsActiveTrue();
    }

    public Location getById(String id) {
        return locationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Location not found: " + id));
    }

    public Location createLocation(LocationDTO dto) {
        Location loc = Location.builder()
                .id(dto.getId() != null ? dto.getId() : "loc_" + System.currentTimeMillis())
                .name(dto.getName())
                .latitude(dto.getLatitude())
                .longitude(dto.getLongitude())
                .description(dto.getDescription())
                .maxCapacity(dto.getMaxCapacity())
                .isActive(true)
                .build();
        return locationRepository.save(loc);
    }
}