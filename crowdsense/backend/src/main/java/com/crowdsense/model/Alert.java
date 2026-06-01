// backend/src/main/java/com/crowdsense/model/Alert.java
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

    /**
     * Alert type:
     * THRESHOLD_EXCEEDED – crowd crossed HIGH or CRITICAL threshold
     * SENSOR_PARTIAL_OFFLINE – one sensor (camera or WiFi) went down
     * SENSOR_OFFLINE – both sensors offline
     */
    @Column(name = "alert_type", nullable = false)
    private String alertType;

    @Column(nullable = false)
    private String message;

    @Column(name = "crowd_level", nullable = false)
    private String crowdLevel;

    @Column(name = "person_count")
    private Integer personCount;

    private Boolean resolved = false;

    @Column(name = "triggered_at")
    private Instant triggeredAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @PrePersist
    public void prePersist() {
        if (triggeredAt == null)
            triggeredAt = Instant.now();
        if (resolved == null)
            resolved = false;
    }
}
