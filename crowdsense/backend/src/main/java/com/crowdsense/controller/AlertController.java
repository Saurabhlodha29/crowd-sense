package com.crowdsense.controller;

import com.crowdsense.model.Alert;
import com.crowdsense.service.AlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AlertController {

    private final AlertService alertService;

    @GetMapping
    public ResponseEntity<List<Alert>> getAlerts(
            @RequestParam(defaultValue = "all") String filter) {
        List<Alert> alerts = switch (filter) {
            case "active" -> alertService.getActiveAlerts();
            case "resolved" -> alertService.getResolvedAlerts();
            default -> alertService.getAllAlerts();
        };
        return ResponseEntity.ok(alerts);
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> getStats() {
        return ResponseEntity.ok(alertService.getAlertStats());
    }

    @PutMapping("/{id}/resolve")
    public ResponseEntity<Alert> resolveAlert(@PathVariable String id) {
        return ResponseEntity.ok(alertService.resolveAlert(id));
    }
}