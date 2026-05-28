package com.crowdsense.service;

import com.crowdsense.model.Alert;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    @Value("${firebase.enabled:false}")
    private boolean firebaseEnabled;

    public void sendAlert(Alert alert) {
        if (!firebaseEnabled) {
            System.out.printf("[FCM-STUB] Alert: %s | Location: %s | Level: %s%n",
                    alert.getMessage(), alert.getLocationId(), alert.getCrowdLevel());
            return;
        }
        // TODO: implement FCM when firebase.enabled=true
    }
}