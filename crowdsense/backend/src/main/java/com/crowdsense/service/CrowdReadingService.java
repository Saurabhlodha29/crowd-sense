package com.crowdsense.service;

import com.crowdsense.dto.CrowdReadingDTO;
import com.crowdsense.model.CrowdReading;
import com.crowdsense.repository.CrowdReadingRepository;
import com.crowdsense.websocket.CrowdUpdateMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CrowdReadingService {

    private final CrowdReadingRepository repository;
    private final SimpMessagingTemplate messagingTemplate;
    private final AlertService alertService;

    public CrowdReading saveReading(CrowdReadingDTO dto) {
        // Build entity
        CrowdReading.CrowdLevel level;
        try {
            level = CrowdReading.CrowdLevel.valueOf(
                    dto.getCrowdLevel() != null ? dto.getCrowdLevel().toUpperCase() : "LOW");
        } catch (IllegalArgumentException e) {
            level = CrowdReading.CrowdLevel.LOW;
            log.warn("[SERVICE] Unknown crowd level '{}', defaulting to LOW", dto.getCrowdLevel());
        }

        CrowdReading reading = CrowdReading.builder()
                .locationId(dto.getLocationId())
                .personCount(dto.getPersonCount() != null ? dto.getPersonCount() : 0)
                .crowdLevel(level)
                .confidence(dto.getConfidence())
                .capturedAt(dto.getCapturedAt() != null ? dto.getCapturedAt() : Instant.now())
                .build();

        CrowdReading saved = repository.save(reading);
        log.debug("[SERVICE] Saved reading: {} people at {} ({})",
                saved.getPersonCount(), saved.getLocationId(), saved.getCrowdLevel());

        // Broadcast via WebSocket — wrapped in try/catch so a WS failure doesn't break
        // the API
        try {
            messagingTemplate.convertAndSend("/topic/crowd",
                    new CrowdUpdateMessage(
                            saved.getLocationId(),
                            saved.getPersonCount(),
                            saved.getCrowdLevel().name(),
                            saved.getCapturedAt()));
        } catch (Exception e) {
            log.warn("[SERVICE] WebSocket broadcast failed: {}", e.getMessage());
        }

        // Alert check — wrapped so a failed alert doesn't break the POST
        try {
            alertService.checkAndAlert(saved);
        } catch (Exception e) {
            log.warn("[SERVICE] Alert check failed: {}", e.getMessage());
        }

        return saved;
    }

    public List<CrowdReading> getLatestPerLocation() {
        return repository.findLatestPerLocation();
    }

    public List<CrowdReading> getByLocation(String locationId, int limit) {
        return repository.findTopNByLocationIdOrderByCapturedAtDesc(locationId, limit);
    }
}