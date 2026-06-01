// backend/src/main/java/com/crowdsense/service/LocationService.java
package com.crowdsense.service;

import com.crowdsense.dto.LocationDTO;
import com.crowdsense.model.Location;
import com.crowdsense.repository.LocationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class LocationService {

    private final LocationRepository repository;

    public List<Location> getAll() {
        return repository.findByIsActiveTrue();
    }

    public List<Location> getByEvent(String eventId) {
        return repository.findByEventIdAndIsActiveTrue(eventId);
    }

    public Optional<Location> findById(String id) {
        return repository.findById(id);
    }

    public Location create(LocationDTO dto) {
        Location loc = Location.builder()
                .id(dto.getId())
                .name(dto.getName())
                .latitude(dto.getLatitude())
                .longitude(dto.getLongitude())
                .description(dto.getDescription())
                .maxCapacity(dto.getMaxCapacity() != null ? dto.getMaxCapacity() : 100)
                .eventId(dto.getEventId())
                .boundaryGeoJson(dto.getBoundaryGeoJson())
                .isActive(true)
                .build();
        Location saved = repository.save(loc);
        log.info("[LOCATION] Created zone: {} (event={})", saved.getId(), saved.getEventId());
        return saved;
    }

    public Optional<Location> update(String id, LocationDTO dto) {
        return repository.findById(id).map(existing -> {
            if (dto.getName() != null)
                existing.setName(dto.getName());
            if (dto.getLatitude() != null)
                existing.setLatitude(dto.getLatitude());
            if (dto.getLongitude() != null)
                existing.setLongitude(dto.getLongitude());
            if (dto.getDescription() != null)
                existing.setDescription(dto.getDescription());
            if (dto.getMaxCapacity() != null)
                existing.setMaxCapacity(dto.getMaxCapacity());
            if (dto.getBoundaryGeoJson() != null)
                existing.setBoundaryGeoJson(dto.getBoundaryGeoJson());
            if (dto.getEventId() != null)
                existing.setEventId(dto.getEventId());
            return repository.save(existing);
        });
    }

    public void deactivate(String id) {
        repository.findById(id).ifPresent(loc -> {
            loc.setIsActive(false);
            repository.save(loc);
        });
    }

}
