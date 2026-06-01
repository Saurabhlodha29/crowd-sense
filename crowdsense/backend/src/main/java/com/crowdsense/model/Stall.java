// backend/src/main/java/com/crowdsense/model/Stall.java
package com.crowdsense.model;

import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Entity
@Table(name = "stalls")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Stall {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(name = "event_id", nullable = false)
    private UUID eventId;

    @Column(name = "zone_id")
    private String zoneId;

    @Column(nullable = false)
    private String name;

    private String category;
    private String description;
    private Double latitude;
    private Double longitude;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "is_active")
    private Boolean isActive = true;

    private Double rating = 0.0;

    @Column(name = "rating_count")
    private Integer ratingCount = 0;
}
