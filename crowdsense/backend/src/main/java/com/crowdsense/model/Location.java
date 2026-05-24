package com.crowdsense.model;

import jakarta.persistence.*;
import lombok.*;

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

    @Builder.Default
    @Column(name = "is_active")
    private Boolean isActive = true;
}