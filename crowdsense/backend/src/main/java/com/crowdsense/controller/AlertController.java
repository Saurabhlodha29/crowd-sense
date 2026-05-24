package com.crowdsense.controller;

import com.crowdsense.model.Alert;
import com.crowdsense.service.AlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/alerts")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AlertController {

    private final AlertService alertService;

    /** Returns ALL alerts (active + resolved), newest first. Frontend filters. */
    @GetMapping
    public ResponseEntity<List<Alert>> getAllAlerts(
            @RequestParam(defaultValue = "false") boolean activeOnly) {
        List<Alert> result = activeOnly
                ? alertService.getActiveAlerts()
                : alertService.getAllAlerts();
        return ResponseEntity.ok(result);
    }

    @PutMapping("/{id}/resolve")
    public ResponseEntity<Alert> resolveAlert(@PathVariable String id) {
        return alertService.resolveAlert(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
