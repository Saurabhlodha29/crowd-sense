// backend/src/main/java/com/crowdsense/model/CrowdReading.java
package com.crowdsense.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "crowd_readings")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CrowdReading {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "location_id", nullable = false)
    private String locationId;

    @Column(name = "person_count", nullable = false)
    private Integer personCount;

    @Column(name = "crowd_level", nullable = false)
    @Enumerated(EnumType.STRING)
    private CrowdLevel crowdLevel;

    private Double confidence;

    /**
     * JSON array of person positions: [{"id":1,"lat":28.61,"lng":77.21}, ...]
     * These are real-world lat/lng converted from pixel coords via calibration,
     * or randomly distributed within the zone polygon when no camera is available.
     * Stored as JSONB in PostgreSQL.
     */
    @Column(name = "positions", columnDefinition = "TEXT")
    private String positions;

    /**
     * Data source: HYBRID | CAMERA_ONLY | WIFI_ONLY | SIMULATION | DEMO_VIDEO
     */
    @Column(name = "source")
    private String source = "HYBRID";

    @Column(name = "captured_at", nullable = false)
    private Instant capturedAt;

    @Column(name = "created_at")
    private Instant createdAt;

    public enum CrowdLevel {
        LOW, MEDIUM, HIGH, CRITICAL
    }

    @PrePersist
    public void prePersist() {
        if (createdAt == null)
            createdAt = Instant.now();
    }
}