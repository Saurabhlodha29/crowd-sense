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
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final AlertRepository alertRepository;
    private final NotificationService notificationService;
    private final SimpMessagingTemplate messagingTemplate;

    // Track last alerted level per location to avoid spam
    private final Map<String, String> lastAlertedLevel = new ConcurrentHashMap<>();

    public void checkAndAlert(CrowdReading reading) {
        String level = reading.getCrowdLevel().name();
        String locationId = reading.getLocationId();

        // Only alert on HIGH or CRITICAL
        if (level.equals("HIGH") || level.equals("CRITICAL")) {
            String prev = lastAlertedLevel.get(locationId);

            // Create alert if first time at this level or escalated
            boolean shouldAlert = (prev == null)
                    || (level.equals("CRITICAL") && prev.equals("HIGH"))
                    || (!prev.equals("HIGH") && !prev.equals("CRITICAL"));

            if (shouldAlert) {
                Alert alert = Alert.builder()
                        .locationId(locationId)
                        .alertType("THRESHOLD_EXCEEDED")
                        .message(String.format(
                                "Crowd at %s has reached %s level (%d people detected)",
                                locationId, level, reading.getPersonCount()))
                        .crowdLevel(level)
                        .personCount(reading.getPersonCount())
                        .resolved(false)
                        .triggeredAt(Instant.now())
                        .build();

                alertRepository.save(alert);
                log.info("[ALERT] Created: {} at {}", level, locationId);

                // WebSocket broadcast
                try {
                    messagingTemplate.convertAndSend("/topic/alerts", Map.of(
                            "id", alert.getId() != null ? alert.getId() : "",
                            "locationId", alert.getLocationId(),
                            "alertType", alert.getAlertType(),
                            "crowdLevel", alert.getCrowdLevel(),
                            "message", alert.getMessage(),
                            "triggeredAt", alert.getTriggeredAt().toString()));
                } catch (Exception e) {
                    log.warn("[ALERT] WebSocket broadcast failed: {}", e.getMessage());
                }

                // FCM notification
                notificationService.sendAlert(alert);
                lastAlertedLevel.put(locationId, level);
            }
        } else {
            // Clear when crowd drops below HIGH
            if (lastAlertedLevel.containsKey(locationId)) {
                lastAlertedLevel.remove(locationId);
                log.info("[ALERT] Crowd normalised at {}", locationId);
            }
        }
    }

    public List<Alert> getAllAlerts() {
        return alertRepository.findTop50ByOrderByTriggeredAtDesc();
    }

    public List<Alert> getActiveAlerts() {
        return alertRepository.findByResolvedFalseOrderByTriggeredAtDesc();
    }

    public List<Alert> getResolvedAlerts() {
        return alertRepository.findByResolvedTrueOrderByTriggeredAtDesc();
    }

    public Alert resolveAlert(String id) {
        Alert alert = alertRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Alert not found: " + id));
        alert.setResolved(true);
        alert.setResolvedAt(Instant.now());
        return alertRepository.save(alert);
    }

    public Map<String, Long> getAlertStats() {
        return Map.of(
                "active", alertRepository.countByResolvedFalse(),
                "resolved", alertRepository.countByResolvedTrue(),
                "total", alertRepository.count());
    }
}