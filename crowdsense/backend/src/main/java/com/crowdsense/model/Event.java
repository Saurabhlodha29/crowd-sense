// backend/src/main/java/com/crowdsense/model/Event.java
package com.crowdsense.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "events")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "organizer_id", nullable = false)
    private String organizerId;

    @Column(nullable = false)
    private String name;

    private String description;

    @Column(name = "start_time", nullable = false)
    private Instant startTime;

    @Column(name = "end_time")
    private Instant endTime;

    private String address;

    @Column(nullable = false)
    private String city;

    private Double latitude;
    private Double longitude;

    @Column(name = "max_capacity")
    private Integer maxCapacity;

    @Column(name = "floor_plan_url")
    private String floorPlanUrl;

    @Column(name = "is_public")
    private Boolean isPublic = true;

    @Column(name = "is_active")
    private Boolean isActive = true;

    /**
     * Lifecycle: DRAFT → LIVE → ENDED
     */
    private String status = "DRAFT";

    @Column(columnDefinition = "TEXT[]")
    private String[] tags;

    @Column(name = "created_at")
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null)
            createdAt = Instant.now();
        if (status == null)
            status = "DRAFT";
    }
}