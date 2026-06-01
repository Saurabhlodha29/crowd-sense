// backend/src/main/java/com/crowdsense/service/EventService.java
package com.crowdsense.service;

import com.crowdsense.dto.EventDTO;
import com.crowdsense.model.CrowdReading;
import com.crowdsense.model.Event;
import com.crowdsense.model.Location;
import com.crowdsense.model.User;
import com.crowdsense.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventService {

    private final EventRepository eventRepo;
    private final UserRepository userRepo;
    private final LocationRepository locationRepo;
    private final CrowdReadingRepository readingRepo;

    // ── Listing & search ──────────────────────────────────────────────────────

    public Page<Event> list(String status, String city, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("startTime").descending());
        if (city != null && !city.isBlank()) {
            return eventRepo.findByStatusAndIsActiveTrueAndIsPublicTrueAndCityContainingIgnoreCase(
                    status, city, pageable);
        }
        return eventRepo.findByStatusAndIsActiveTrueAndIsPublicTrue(status, pageable);
    }

    public List<Event> search(
            String q, String city,
            Double lat, Double lng, int radiusKm,
            int page, int size) {

        // Full-text search via native SQL — PostGIS + pg_trgm
        List<Event> results;
        if (lat != null && lng != null) {
            results = eventRepo.searchWithGeo(q, city, lat, lng, radiusKm * 1000.0,
                    PageRequest.of(page, size));
        } else {
            results = eventRepo.searchText(q, city, PageRequest.of(page, size));
        }
        return results;
    }

    public Optional<Map<String, Object>> getDetail(String id) {
        UUID eventId = UUID.fromString(id);
        return eventRepo.findById(eventId).map(event -> {
            List<Location> zones = locationRepo.findByEventIdAndIsActiveTrue(id);
            List<CrowdReading> latest = readingRepo.findLatestPerLocationByEventId(id);

            Map<String, Object> detail = new LinkedHashMap<>();
            detail.put("event", event);
            detail.put("zones", zones);
            detail.put("crowdSummary", buildCrowdSummary(zones, latest));
            return detail;
        });
    }

    public List<Event> getByOrganizer(String email) {
        return userRepo.findByEmail(email)
                .map(u -> eventRepo.findByOrganizerIdAndIsActiveTrue(u.getId()))
                .orElse(Collections.emptyList());
    }

    // ── CRUD ──────────────────────────────────────────────────────────────────

    public Event create(EventDTO dto, String organizerEmail) {
        User organizer = userRepo.findByEmail(organizerEmail)
                .orElseThrow(() -> new IllegalArgumentException("Organizer not found: " + organizerEmail));

        Event event = Event.builder()
                .organizerId(organizer.getId())
                .name(dto.getName())
                .description(dto.getDescription())
                .startTime(dto.getStartTime())
                .endTime(dto.getEndTime())
                .address(dto.getAddress())
                .city(dto.getCity())
                .latitude(dto.getLatitude())
                .longitude(dto.getLongitude())
                .maxCapacity(dto.getMaxCapacity())
                .floorPlanUrl(dto.getFloorPlanUrl())
                .isPublic(dto.getIsPublic() != null ? dto.getIsPublic() : true)
                .status("DRAFT")
                .tags(dto.getTags())
                .isActive(true)
                .build();

        Event saved = eventRepo.save(event);
        log.info("[EVENT] Created: {} by {}", saved.getName(), organizerEmail);
        return saved;
    }

    public Optional<Event> update(String id, EventDTO dto, String organizerEmail) {
        return eventRepo.findById(UUID.fromString(id)).map(existing -> {
            if (dto.getName() != null)
                existing.setName(dto.getName());
            if (dto.getDescription() != null)
                existing.setDescription(dto.getDescription());
            if (dto.getStartTime() != null)
                existing.setStartTime(dto.getStartTime());
            if (dto.getEndTime() != null)
                existing.setEndTime(dto.getEndTime());
            if (dto.getAddress() != null)
                existing.setAddress(dto.getAddress());
            if (dto.getCity() != null)
                existing.setCity(dto.getCity());
            if (dto.getLatitude() != null)
                existing.setLatitude(dto.getLatitude());
            if (dto.getLongitude() != null)
                existing.setLongitude(dto.getLongitude());
            if (dto.getMaxCapacity() != null)
                existing.setMaxCapacity(dto.getMaxCapacity());
            if (dto.getFloorPlanUrl() != null)
                existing.setFloorPlanUrl(dto.getFloorPlanUrl());
            if (dto.getIsPublic() != null)
                existing.setIsPublic(dto.getIsPublic());
            if (dto.getTags() != null)
                existing.setTags(dto.getTags());
            return eventRepo.save(existing);
        });
    }

    public Optional<Event> setStatus(String id, String newStatus, String email) {
        Set<String> valid = Set.of("DRAFT", "LIVE", "ENDED");
        if (!valid.contains(newStatus))
            throw new IllegalArgumentException("Invalid status: " + newStatus);
        return eventRepo.findById(UUID.fromString(id)).map(e -> {
            e.setStatus(newStatus);
            return eventRepo.save(e);
        });
    }

    public void deactivate(String id, String email) {
        eventRepo.findById(UUID.fromString(id)).ifPresent(e -> {
            e.setIsActive(false);
            e.setStatus("ENDED");
            eventRepo.save(e);
        });
    }

    // ── Analytics ─────────────────────────────────────────────────────────────

    public Map<String, Object> getAnalytics(String eventId, String email) {
        List<Location> zones = locationRepo.findByEventIdAndIsActiveTrue(eventId);
        Instant now = Instant.now();
        Instant start = now.minus(24, ChronoUnit.HOURS);

        Map<String, Object> analytics = new LinkedHashMap<>();
        List<Map<String, Object>> zoneStats = new ArrayList<>();

        for (Location zone : zones) {
            List<CrowdReading> history = readingRepo.findByLocationIdAndTimeRange(
                    zone.getId(), start, now, PageRequest.of(0, 500));
            Integer peak = readingRepo.findPeakCount(zone.getId(), start, now);

            Map<String, Object> stat = new LinkedHashMap<>();
            stat.put("zoneId", zone.getId());
            stat.put("zoneName", zone.getName());
            stat.put("peakCount", peak != null ? peak : 0);
            stat.put("capacity", zone.getMaxCapacity());
            stat.put("readings", history);
            zoneStats.add(stat);
        }

        analytics.put("eventId", eventId);
        analytics.put("generatedAt", now);
        analytics.put("zones", zoneStats);
        return analytics;
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private List<Map<String, Object>> buildCrowdSummary(
            List<Location> zones, List<CrowdReading> latest) {

        Map<String, CrowdReading> byLocation = latest.stream()
                .collect(Collectors.toMap(CrowdReading::getLocationId, r -> r));

        return zones.stream().map(z -> {
            CrowdReading r = byLocation.get(z.getId());
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("zoneId", z.getId());
            m.put("zoneName", z.getName());
            m.put("maxCapacity", z.getMaxCapacity());
            m.put("boundaryGeoJson", z.getBoundaryGeoJson());
            m.put("personCount", r != null ? r.getPersonCount() : null);
            m.put("crowdLevel", r != null ? r.getCrowdLevel().name() : "UNKNOWN");
            m.put("capturedAt", r != null ? r.getCapturedAt() : null);
            m.put("positions", r != null ? r.getPositions() : null);
            return m;
        }).collect(Collectors.toList());
    }
}
