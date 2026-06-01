// backend/src/main/java/com/crowdsense/service/StallService.java
package com.crowdsense.service;

import com.crowdsense.model.Stall;
import com.crowdsense.repository.StallRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class StallService {

    private final StallRepository stallRepo;

    public List<Stall> getByEvent(String eventId) {
        return stallRepo.findByEventIdAndIsActiveTrue(UUID.fromString(eventId));
    }

    public List<Stall> getByEventAndCategory(String eventId, String category) {
        if (category == null || category.isBlank()) {
            return getByEvent(eventId);
        }
        return stallRepo.findByEventIdAndCategoryAndIsActiveTrue(UUID.fromString(eventId), category);
    }

    public Stall create(String eventId, Stall stall) {
        stall.setEventId(UUID.fromString(eventId));
        stall.setIsActive(true);
        if (stall.getRating() == null)
            stall.setRating(0.0);
        if (stall.getRatingCount() == null)
            stall.setRatingCount(0);
        Stall saved = stallRepo.save(stall);
        log.info("[STALL] Created: {} in event {}", saved.getName(), eventId);
        return saved;
    }

    public Optional<Stall> update(String id, Stall update) {
        return stallRepo.findById(id).map(existing -> {
            if (update.getName() != null)
                existing.setName(update.getName());
            if (update.getCategory() != null)
                existing.setCategory(update.getCategory());
            if (update.getDescription() != null)
                existing.setDescription(update.getDescription());
            if (update.getLatitude() != null)
                existing.setLatitude(update.getLatitude());
            if (update.getLongitude() != null)
                existing.setLongitude(update.getLongitude());
            if (update.getImageUrl() != null)
                existing.setImageUrl(update.getImageUrl());
            if (update.getZoneId() != null)
                existing.setZoneId(update.getZoneId());
            return stallRepo.save(existing);
        });
    }

    public void deactivate(String id) {
        stallRepo.findById(id).ifPresent(s -> {
            s.setIsActive(false);
            stallRepo.save(s);
        });
    }
}
