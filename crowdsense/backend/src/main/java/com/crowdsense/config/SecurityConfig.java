// backend/src/main/java/com/crowdsense/config/SecurityConfig.java
package com.crowdsense.config;

import com.crowdsense.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth

                        // ── Always public — health + auth ─────────────────────────
                        .requestMatchers("/api/v1/readings/health").permitAll()
                        .requestMatchers("/api/v1/auth/**").permitAll()

                        // ── Sensor ingestion — no auth (edge agent has no JWT) ────
                        .requestMatchers(HttpMethod.POST, "/api/v1/readings").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/sync/bulk").permitAll()

                        // ── Read-only public (attendees browse without account) ───
                        .requestMatchers(HttpMethod.GET, "/api/v1/readings/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/locations/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/events/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/stalls/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/route/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/recommend/**").permitAll()

                        // ── Reroute check POST is also public ─────────────────────
                        .requestMatchers(HttpMethod.POST, "/api/v1/route/check").permitAll()

                        // ── WebSocket endpoint — no auth at transport level ───────
                        .requestMatchers("/ws/**").permitAll()

                        // ── Everything else requires a valid JWT ──────────────────
                        .anyRequest().authenticated())
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}