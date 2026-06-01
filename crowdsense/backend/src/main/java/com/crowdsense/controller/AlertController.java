// backend/src/main/java/com/crowdsense/controller/AlertController.java
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

    /**
     * GET /alerts?filter=active|resolved|all
     * Returns alerts sorted by triggeredAt DESC.
     */
    @GetMapping
    public ResponseEntity<List<Alert>> list(
            @RequestParam(defaultValue = "active") String filter) {
        return ResponseEntity.ok(alertService.getAlerts(filter));
    }

    /**
     * GET /alerts/stats
     * Returns { active: N, resolved: N, total: N }
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Long>> stats() {
        return ResponseEntity.ok(alertService.getStats());
    }

    /**
     * PUT /alerts/{id}/resolve
     * Marks the alert as resolved and sets resolved_at = now().
     * Requires JWT (ORGANIZER or ADMIN).
     */
    @PutMapping("/{id}/resolve")
    public ResponseEntity<Alert> resolve(@PathVariable String id) {
        try {
            return ResponseEntity.ok(alertService.resolve(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}