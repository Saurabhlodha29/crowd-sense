package com.crowdsense.service;

import com.crowdsense.model.Location;
import com.crowdsense.repository.LocationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationRepository locationRepository;

    public List<Location> getAllActiveLocations() {
        return locationRepository.findByIsActiveTrue();
    }

    public Optional<Location> getLocationById(String id) {
        return locationRepository.findById(id);
    }

    public Location createLocation(Location location) {
        return locationRepository.save(location);
    }

    public Optional<Location> deactivateLocation(String id) {
        return locationRepository.findById(id).map(loc -> {
            loc.setIsActive(false);
            return locationRepository.save(loc);
        });
    }
}