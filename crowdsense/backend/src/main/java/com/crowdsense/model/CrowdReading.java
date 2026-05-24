package com.crowdsense.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
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
    @JdbcTypeCode(SqlTypes.UUID)
    private String id;

    @Column(name = "location_id", nullable = false)
    private String locationId;

    @Column(name = "person_count", nullable = false)
    private Integer personCount;

    @Column(name = "crowd_level", nullable = false)
    @Enumerated(EnumType.STRING)
    private CrowdLevel crowdLevel;

    @Column(name = "confidence")
    private Double confidence;

    @Column(name = "captured_at", nullable = false)
    private Instant capturedAt;

    @Column(name = "created_at")
    private Instant createdAt;

    public enum CrowdLevel {
        LOW, MEDIUM, HIGH, CRITICAL
    }

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }
}