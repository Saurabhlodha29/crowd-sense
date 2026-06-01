// backend/src/main/java/com/crowdsense/controller/AuthController.java
package com.crowdsense.controller;

import com.crowdsense.model.User;
import com.crowdsense.repository.UserRepository;
import com.crowdsense.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class AuthController {

    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    // ── POST /auth/login ──────────────────────────────────────────────────────

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "email and password required"));
        }

        return userRepo.findByEmail(email)
                .filter(u -> passwordEncoder.matches(password, u.getPasswordHash()))
                .map(u -> {
                    String userId = u.getId().toString();
                    String token = jwtUtil.generateToken(u.getEmail(), u.getRole(), userId);
                    log.info("[AUTH] Login: {} ({})", u.getEmail(), u.getRole());
                    return ResponseEntity.ok(Map.of(
                            "token", token,
                            "email", u.getEmail(),
                            "role", u.getRole(),
                            "userId", userId,
                            "name", u.getName() != null ? u.getName() : u.getEmail()));
                })
                .orElseGet(() -> {
                    log.warn("[AUTH] Failed login for: {}", email);
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                            .body(Map.of("message", "Invalid credentials"));
                });
    }

    // ── POST /auth/register ───────────────────────────────────────────────────

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");
        String name = body.getOrDefault("name", email);
        // Default role for self-registration is ORGANIZER
        // (ATTENDEE is guest — no account needed; ADMIN is seeded only)
        String role = "ORGANIZER";

        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "email and password required"));
        }

        if (userRepo.findByEmail(email).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Email already registered"));
        }

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(password))
                .role(role)
                .name(name)
                .build();
        User saved = userRepo.save(user);

        String userId = saved.getId().toString();
        String token = jwtUtil.generateToken(saved.getEmail(), saved.getRole(), userId);
        log.info("[AUTH] Registered: {} ({})", saved.getEmail(), saved.getRole());

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "token", token,
                "email", saved.getEmail(),
                "role", saved.getRole(),
                "userId", userId));
    }

    // ── GET /auth/me ──────────────────────────────────────────────────────────

    @GetMapping("/me")
    public ResponseEntity<?> me(Authentication auth) {
        if (auth == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Not authenticated"));
        }
        String email = auth.getName();
        return userRepo.findByEmail(email)
                .map(u -> ResponseEntity.ok(Map.of(
                        "email", u.getEmail(),
                        "role", u.getRole(),
                        "userId", u.getId().toString(),
                        "name", u.getName() != null ? u.getName() : u.getEmail())))
                .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "User not found")));
    }
}
