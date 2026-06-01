// backend/src/main/java/com/crowdsense/model/Location.java
package com.crowdsense.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "locations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Location {

    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    private String description;

    @Column(name = "max_capacity")
    private Integer maxCapacity;

    @Column(name = "is_active")
    private Boolean isActive = true;

    /** UUID of the event this zone belongs to. NULL for standalone sensors. */
    @Column(name = "event_id")
    private String eventId;

    /**
     * GeoJSON FeatureCollection string storing the drawn polygon boundary.
     * Example: {"type":"Polygon","coordinates":[[[lng,lat],...,[lng,lat]]]}
     * Stored as TEXT in PostgreSQL; PostGIS queries use native SQL.
     */
    @Column(name = "boundary_geojson", columnDefinition = "TEXT")
    private String boundaryGeoJson;

    @Column(name = "created_at")
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null)
            createdAt = Instant.now();
    }
}
