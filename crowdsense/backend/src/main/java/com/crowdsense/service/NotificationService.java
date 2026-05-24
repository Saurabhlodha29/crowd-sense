package com.crowdsense.service;

import com.crowdsense.model.Alert;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class NotificationService {

    @Value("${firebase.enabled:false}")
    private boolean firebaseEnabled;

    /**
     * Sends a push notification via Firebase FCM.
     * Firebase setup is completed in Phase 5.
     * For now this logs the notification instead.
     */
    public void sendAlert(Alert alert) {
        if (!firebaseEnabled) {
            log.info("[FCM] (disabled) Would send: {} — {}", alert.getCrowdLevel(), alert.getMessage());
            return;
        }

        // Firebase FCM implementation added in Phase 5
        // This stub prevents compile errors now
        log.info("[FCM] Sending push notification for alert: {}", alert.getId());
    }
}