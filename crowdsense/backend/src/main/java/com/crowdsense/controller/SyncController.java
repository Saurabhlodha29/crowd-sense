// backend/src/main/java/com/crowdsense/controller/SyncController.java
package com.crowdsense.controller;

import com.crowdsense.dto.BulkSyncDTO;
import com.crowdsense.service.CrowdReadingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/sync")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class SyncController {

    private final CrowdReadingService crowdReadingService;

    /**
     * POST /api/v1/sync/bulk
     * Called by edge/sync_service.py to upload all SQLite-buffered readings
     * when internet is restored after an outage.
     *
     * Body: { "readings": [ {CrowdReadingDTO}, ... ] }
     * Response: { "status": "success", "synced": N }
     */
    @PostMapping("/bulk")
    public ResponseEntity<Map<String, Object>> bulkSync(@RequestBody BulkSyncDTO dto) {
        int count = 0;
        int errors = 0;
        for (var reading : dto.getReadings()) {
            try {
                crowdReadingService.saveReading(reading);
                count++;
            } catch (Exception e) {
                log.warn("[SYNC] Skipped one reading (likely duplicate): {}", e.getMessage());
                errors++;
            }
        }
        log.info("[SYNC] Bulk sync complete: {} saved, {} skipped", count, errors);
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "synced", count,
                "skipped", errors));
    }
}