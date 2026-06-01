// backend/src/main/java/com/crowdsense/model/ZoneConnection.java
package com.crowdsense.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "zone_connections", uniqueConstraints = @UniqueConstraint(columnNames = { "event_id", "from_zone_id",
        "to_zone_id" }))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ZoneConnection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Column(name = "from_zone_id", nullable = false)
    private String fromZoneId;

    @Column(name = "to_zone_id", nullable = false)
    private String toZoneId;

    @Column(name = "distance_m", nullable = false)
    private Double distanceM;

    @Column(name = "is_exit_route")
    private Boolean isExitRoute = false;

    @Column(name = "created_at")
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null)
            createdAt = Instant.now();
    }
}
