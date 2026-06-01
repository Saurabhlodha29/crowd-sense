// backend/src/main/java/com/crowdsense/service/CrowdReadingService.java
package com.crowdsense.service;

import com.crowdsense.dto.CrowdReadingDTO;
import com.crowdsense.model.CrowdReading;
import com.crowdsense.repository.CrowdReadingRepository;
import com.crowdsense.websocket.CrowdUpdateMessage;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    private final ObjectMapper objectMapper;

    public CrowdReading saveReading(CrowdReadingDTO dto) {
        // Serialise positions list → JSON string for JSONB column
        String posJson = null;
        if (dto.getPositions() != null && !dto.getPositions().isEmpty()) {
            try {
                posJson = objectMapper.writeValueAsString(dto.getPositions());
            } catch (Exception e) {
                log.warn("[READINGS] Could not serialise positions: {}", e.getMessage());
            }
        }

        CrowdReading reading = CrowdReading.builder()
                .locationId(dto.getLocationId())
                .personCount(dto.getPersonCount())
                .crowdLevel(CrowdReading.CrowdLevel.valueOf(dto.getCrowdLevel()))
                .confidence(dto.getConfidence())
                .source(dto.getSource() != null ? dto.getSource() : "HYBRID")
                .positions(posJson)
                .capturedAt(dto.getCapturedAt() != null ? dto.getCapturedAt() : Instant.now())
                .build();

        CrowdReading saved = repository.save(reading);

        // ── Broadcast to WebSocket clients (non-fatal) ────────────────────
        try {
            CrowdUpdateMessage msg = CrowdUpdateMessage.builder()
                    .locationId(saved.getLocationId())
                    .personCount(saved.getPersonCount())
                    .crowdLevel(saved.getCrowdLevel().name())
                    .capturedAt(saved.getCapturedAt())
                    .positions(dto.getPositions()) // send original list (not JSON string)
                    .build();
            messagingTemplate.convertAndSend("/topic/crowd", msg);
        } catch (Exception e) {
            log.warn("[READINGS] WebSocket broadcast failed: {}", e.getMessage());
        }

        // ── Alert threshold check (non-fatal) ────────────────────────────
        try {
            alertService.checkAndAlert(saved);
        } catch (Exception e) {
            log.warn("[READINGS] Alert check failed: {}", e.getMessage());
        }

        return saved;
    }

    public List<CrowdReading> getLatestPerLocation() {
        return repository.findLatestPerLocation();
    }

    public List<CrowdReading> getLatestPerLocationByEvent(String eventId) {
        return repository.findLatestPerLocationByEventId(eventId);
    }

    public List<CrowdReading> getByLocation(String locationId, int limit) {
        return repository.findTopNByLocationIdOrderByCapturedAtDesc(locationId, limit);
    }
}