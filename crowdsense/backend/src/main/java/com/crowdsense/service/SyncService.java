package com.crowdsense.service;

import com.crowdsense.dto.BulkSyncDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class SyncService {

    private final CrowdReadingService crowdReadingService;

    public int bulkSync(BulkSyncDTO dto) {
        if (dto.getReadings() == null || dto.getReadings().isEmpty())
            return 0;
        int count = 0;
        for (var r : dto.getReadings()) {
            try {
                crowdReadingService.saveReading(r);
                count++;
            } catch (Exception e) {
                log.error("[SYNC] Failed to save reading for {}: {}", r.getLocationId(), e.getMessage());
            }
        }
        log.info("[SYNC] Bulk synced {} / {} readings", count, dto.getReadings().size());
        return count;
    }
}