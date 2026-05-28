package com.crowdsense.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "alerts")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "location_id", nullable = false)
    private String locationId;

    @Column(name = "alert_type", nullable = false)
    private String alertType;

    @Column(nullable = false)
    private String message;

    @Column(name = "crowd_level", nullable = false)
    private String crowdLevel;

    @Column(name = "person_count")
    private Integer personCount;

    @Builder.Default
    private Boolean resolved = false;

    @Column(name = "triggered_at")
    private Instant triggeredAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @PrePersist
    public void prePersist() {
        if (this.triggeredAt == null)
            this.triggeredAt = Instant.now();
        if (this.resolved == null)
            this.resolved = false;
    }
}