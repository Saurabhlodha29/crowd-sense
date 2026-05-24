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
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertService {

    private final AlertRepository alertRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationService notificationService;

    private static final List<String> ALERT_LEVELS = List.of("HIGH", "CRITICAL");

    public void checkAndAlert(CrowdReading reading) {
        String level = reading.getCrowdLevel().name();
        if (!ALERT_LEVELS.contains(level)) return;

        boolean alreadyActive = alertRepository.existsByLocationIdAndCrowdLevelAndResolvedFalse(
                reading.getLocationId(), level);
        if (alreadyActive) return;

        String message = String.format(
                "Crowd at location %s has reached %s level (%d people)",
                reading.getLocationId(), level, reading.getPersonCount());

        Alert alert = Alert.builder()
                .locationId(reading.getLocationId())
                .alertType("THRESHOLD_EXCEEDED")
                .message(message)
                .crowdLevel(level)
                .personCount(reading.getPersonCount())
                .resolved(false)
                .triggeredAt(Instant.now())
                .build();

        Alert saved = alertRepository.save(alert);
        log.warn("[ALERT] {} — {}", level, message);

        messagingTemplate.convertAndSend("/topic/alerts", saved);
        notificationService.sendAlert(saved);
    }

    public List<Alert> getActiveAlerts() {
        return alertRepository.findByResolvedFalseOrderByTriggeredAtDesc();
    }

    public List<Alert> getAllAlerts() {
        return alertRepository.findAllByOrderByTriggeredAtDesc();
    }

    public Optional<Alert> resolveAlert(String alertId) {
        return alertRepository.findById(alertId).map(alert -> {
            alert.setResolved(true);
            alert.setResolvedAt(Instant.now());
            return alertRepository.save(alert);
        });
    }
}
