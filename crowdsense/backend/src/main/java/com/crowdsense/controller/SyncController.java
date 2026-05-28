package com.crowdsense.controller;

import com.crowdsense.dto.BulkSyncDTO;
import com.crowdsense.service.SyncService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/sync")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SyncController {

    private final SyncService syncService;

    @PostMapping("/bulk")
    public ResponseEntity<Map<String, Object>> bulkSync(@RequestBody BulkSyncDTO dto) {
        int count = syncService.bulkSync(dto);
        return ResponseEntity.ok(Map.of("status", "success", "synced", count));
    }
}