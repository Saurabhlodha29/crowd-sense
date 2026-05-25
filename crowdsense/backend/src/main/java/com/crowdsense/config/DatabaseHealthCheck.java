package com.crowdsense.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DatabaseHealthCheck {

    private final JdbcTemplate jdbcTemplate;

    @EventListener(ApplicationReadyEvent.class)
    public void checkDatabase() {
        try {
            jdbcTemplate.queryForObject("SELECT 1", Integer.class);
            log.info("✅ Supabase connection OK — backend is fully operational");
        } catch (Exception e) {
            log.error("❌ Database connection FAILED: {}", e.getMessage());
            log.error("--- CHECKLIST ---");
            log.error("1. Go to supabase.com — is your project paused? Click Restore.");
            log.error("2. Host must be: aws-0-ap-south-1.pooler.supabase.com (NOT db.xxx.supabase.co)");
            log.error("3. Username must be: postgres.leihwymwbxgzvzasskzy (NOT just 'postgres')");
            log.error("4. Port must be: 5432 (NOT 6543) on the pooler host");
            log.error("5. Run in PowerShell: nslookup aws-0-ap-south-1.pooler.supabase.com");
            log.error("   If it fails: your network blocks this — switch to phone hotspot");
        }
    }
}