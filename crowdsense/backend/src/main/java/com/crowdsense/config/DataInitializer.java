// backend/src/main/java/com/crowdsense/config/DataInitializer.java
package com.crowdsense.config;

import com.crowdsense.model.Event;
import com.crowdsense.model.Location;
import com.crowdsense.model.User;
import com.crowdsense.repository.EventRepository;
import com.crowdsense.repository.LocationRepository;
import com.crowdsense.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepo;
    private final LocationRepository locationRepo;
    private final EventRepository eventRepo;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedAdmin();
        seedOrganizer();
        seedDefaultLocation();
        seedDemoEvent();
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    private void seedAdmin() {
        if (userRepo.findByEmail("admin@crowdsense.dev").isEmpty()) {
            userRepo.save(User.builder()
                    .email("admin@crowdsense.dev")
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .role("ADMIN")
                    .name("CrowdSense Admin")
                    .build());
            log.info("[INIT] Admin seeded: admin@crowdsense.dev / admin123");
        }
    }

    // ── Demo Organiser ────────────────────────────────────────────────────────

    private void seedOrganizer() {
        if (userRepo.findByEmail("organizer@demo.com").isEmpty()) {
            userRepo.save(User.builder()
                    .email("organizer@demo.com")
                    .passwordHash(passwordEncoder.encode("demo1234"))
                    .role("ORGANIZER")
                    .name("Demo Organizer")
                    .build());
            log.info("[INIT] Organizer seeded: organizer@demo.com / demo1234");
        }
    }

    // ── Default standalone sensor location ───────────────────────────────────

    private void seedDefaultLocation() {
        if (locationRepo.findById("loc_001").isEmpty()) {
            locationRepo.save(Location.builder()
                    .id("loc_001")
                    .name("Main Entrance")
                    .latitude(28.6139)
                    .longitude(77.2090)
                    .description("Default standalone sensor location")
                    .maxCapacity(100)
                    .isActive(true)
                    .build());
            log.info("[INIT] Default location seeded: loc_001");
        }
    }

    // ── Demo event with two zones ─────────────────────────────────────────────

    private void seedDemoEvent() {
        Optional<User> organizer = userRepo.findByEmail("organizer@demo.com");
        if (organizer.isEmpty())
            return;

        UUID orgId = organizer.get().getId();

        boolean hasEvents = !eventRepo.findByOrganizerIdAndIsActiveTrue(orgId).isEmpty();
        if (hasEvents)
            return;

        Event event = eventRepo.save(Event.builder()
                .organizerId(orgId)
                .name("CrowdSense Demo Fest 2026")
                .description("Live demo event showcasing all CrowdSense features.")
                .startTime(Instant.now())
                .endTime(Instant.now().plus(8, ChronoUnit.HOURS))
                .address("India Gate Lawns, New Delhi")
                .city("New Delhi")
                .latitude(28.6129)
                .longitude(77.2295)
                .maxCapacity(500)
                .isPublic(true)
                .status("LIVE")
                .isActive(true)
                .tags(new String[] { "demo", "music", "festival" })
                .build());

        // Zone A — Main Stage
        if (locationRepo.findById("loc_demo_a").isEmpty()) {
            locationRepo.save(Location.builder()
                    .id("loc_demo_a")
                    .name("Main Stage")
                    .latitude(28.6130)
                    .longitude(77.2295)
                    .description("Primary performance zone")
                    .maxCapacity(250)
                    .eventId(event.getId().toString())
                    .isActive(true)
                    .build());
        }

        // Zone B — Food Court
        if (locationRepo.findById("loc_demo_b").isEmpty()) {
            locationRepo.save(Location.builder()
                    .id("loc_demo_b")
                    .name("Food Court")
                    .latitude(28.6125)
                    .longitude(77.2300)
                    .description("Food & beverage stall area")
                    .maxCapacity(150)
                    .eventId(event.getId().toString())
                    .isActive(true)
                    .build());
        }

        // Zone C — Entry Gate
        if (locationRepo.findById("loc_demo_c").isEmpty()) {
            locationRepo.save(Location.builder()
                    .id("loc_demo_c")
                    .name("Entry Gate")
                    .latitude(28.6135)
                    .longitude(77.2290)
                    .description("Main entry and ticketing zone")
                    .maxCapacity(80)
                    .eventId(event.getId().toString())
                    .isActive(true)
                    .build());
        }

        log.info("[INIT] Demo event seeded: '{}' (id={})", event.getName(), event.getId());
    }
}
