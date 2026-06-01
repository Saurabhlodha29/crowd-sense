// backend/src/main/java/com/crowdsense/service/AlertService.java
package com.crowdsense.service;

import com.crowdsense.model.Alert;
import com.crowdsense.model.CrowdReading;
import com.crowdsense.repository.AlertRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final AlertRepository alertRepo;
    private final SimpMessagingTemplate messaging;

    // ── Alert threshold check (called after every reading save) ──────────────

    public void checkAndAlert(CrowdReading reading) {
        String level = reading.getCrowdLevel().name();
        String locationId = reading.getLocationId();

        // Only create alerts for HIGH and CRITICAL
        if (!level.equals("HIGH") && !level.equals("CRITICAL")) {
            // Auto-resolve any lingering alerts for this location when crowd drops
            autoResolveIfSafe(locationId);
            return;
        }

        String alertType = "THRESHOLD_EXCEEDED";

        // Deduplication: skip if same alert type already active for this location
        if (alertRepo.existsByLocationIdAndAlertTypeAndResolvedFalse(locationId, alertType)) {
            return;
        }

        String message = String.format(
                "Crowd at location %s has reached %s (%d people)",
                locationId, level, reading.getPersonCount());

        Alert alert = Alert.builder()
                .locationId(locationId)
                .alertType(alertType)
                .message(message)
                .crowdLevel(level)
                .personCount(reading.getPersonCount())
                .resolved(false)
                .build();

        Alert saved = alertRepo.save(alert);
        log.warn("[ALERT] {} — {} people at {}", level, reading.getPersonCount(), locationId);

        // Broadcast to frontend via WebSocket
        try {
            messaging.convertAndSend("/topic/alerts", Map.of(
                    "id", saved.getId(),
                    "locationId", saved.getLocationId(),
                    "alertType", saved.getAlertType(),
                    "crowdLevel", saved.getCrowdLevel(),
                    "personCount", saved.getPersonCount(),
                    "message", saved.getMessage(),
                    "triggeredAt", saved.getTriggeredAt().toString()));
        } catch (Exception e) {
            log.warn("[ALERT] WS broadcast failed: {}", e.getMessage());
        }
    }

    // ── Sensor offline alert ──────────────────────────────────────────────────

    public void fireSensorAlert(String locationId, String alertType, String detail) {
        if (alertRepo.existsByLocationIdAndAlertTypeAndResolvedFalse(locationId, alertType))
            return;

        Alert alert = Alert.builder()
                .locationId(locationId)
                .alertType(alertType)
                .message(detail)
                .crowdLevel("UNKNOWN")
                .resolved(false)
                .build();
        alertRepo.save(alert);
        log.warn("[ALERT] Sensor alert: {} — {}", alertType, locationId);
    }

    // ── Resolve ───────────────────────────────────────────────────────────────

    public Alert resolve(String alertId) {
        return alertRepo.findById(alertId).map(a -> {
            a.setResolved(true);
            a.setResolvedAt(Instant.now());
            return alertRepo.save(a);
        }).orElseThrow(() -> new IllegalArgumentException("Alert not found: " + alertId));
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    public List<Alert> getAlerts(String filter) {
        return switch (filter) {
            case "active" -> alertRepo.findByResolvedFalseOrderByTriggeredAtDesc();
            case "resolved" -> alertRepo.findByResolvedTrueOrderByTriggeredAtDesc();
            default -> alertRepo.findAllByOrderByTriggeredAtDesc();
        };
    }

    public Map<String, Long> getStats() {
        long active = alertRepo.countByResolvedFalse();
        long resolved = alertRepo.countByResolvedTrue();
        return Map.of("active", active, "resolved", resolved, "total", active + resolved);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void autoResolveIfSafe(String locationId) {
        alertRepo.findByLocationIdOrderByTriggeredAtDesc(locationId)
                .stream()
                .filter(a -> !a.getResolved())
                .filter(a -> "THRESHOLD_EXCEEDED".equals(a.getAlertType()))
                .forEach(a -> {
                    a.setResolved(true);
                    a.setResolvedAt(Instant.now());
                    alertRepo.save(a);
                    log.info("[ALERT] Auto-resolved for {}", locationId);
                });
    }
}
