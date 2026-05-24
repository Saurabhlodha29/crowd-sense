package com.crowdsense.service;

import com.crowdsense.dto.CrowdReadingDTO;
import com.crowdsense.model.CrowdReading;
import com.crowdsense.repository.CrowdReadingRepository;
import com.crowdsense.websocket.CrowdUpdateMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CrowdReadingService {

    private final CrowdReadingRepository repository;
    private final SimpMessagingTemplate messagingTemplate;
    private final AlertService alertService;

    public CrowdReading saveReading(CrowdReadingDTO dto) {
        CrowdReading reading = CrowdReading.builder()
                .locationId(dto.getLocationId())
                .personCount(dto.getPersonCount())
                .crowdLevel(CrowdReading.CrowdLevel.valueOf(dto.getCrowdLevel()))
                .confidence(dto.getConfidence())
                .capturedAt(dto.getCapturedAt() != null ? dto.getCapturedAt() : Instant.now())
                .build();

        CrowdReading saved = repository.save(reading);

        // Broadcast to WebSocket clients
        messagingTemplate.convertAndSend("/topic/crowd",
                new CrowdUpdateMessage(saved.getLocationId(), saved.getPersonCount(),
                        saved.getCrowdLevel().name(), saved.getCapturedAt()));

        // Check if alert threshold crossed
        alertService.checkAndAlert(saved);

        return saved;
    }

    public List<CrowdReading> getLatestPerLocation() {
        return repository.findLatestPerLocation();
    }

    public List<CrowdReading> getByLocation(String locationId, int limit) {
        return repository.findTopNByLocationIdOrderByCapturedAtDesc(locationId, limit);
    }
}