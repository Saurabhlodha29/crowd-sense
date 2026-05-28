package com.crowdsense.config;

import com.crowdsense.model.Location;
import com.crowdsense.model.User;
import com.crowdsense.repository.LocationRepository;
import com.crowdsense.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final LocationRepository locationRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedAdminUser();
        seedDefaultLocation();
    }

    private void seedAdminUser() {
        String adminEmail = "admin@crowdsense.dev";
        if (!userRepository.existsByEmail(adminEmail)) {
            User admin = User.builder()
                    .email(adminEmail)
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .role("ADMIN")
                    .build();
            userRepository.save(admin);
            log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
            log.info("[INIT] Admin user created:");
            log.info("[INIT]   Email   : {}", adminEmail);
            log.info("[INIT]   Password: admin123");
            log.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        } else {
            log.info("[INIT] Admin user already exists: {}", adminEmail);
        }
    }

    private void seedDefaultLocation() {
        if (!locationRepository.existsById("loc_001")) {
            Location loc = Location.builder()
                    .id("loc_001")
                    .name("Main Entrance")
                    .latitude(28.6139)
                    .longitude(77.2090)
                    .description("Main entrance gate — default sensor location")
                    .maxCapacity(100)
                    .isActive(true)
                    .build();
            locationRepository.save(loc);
            log.info("[INIT] Default location seeded: loc_001 / Main Entrance");
        }
    }
}