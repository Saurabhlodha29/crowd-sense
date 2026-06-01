// backend/src/main/java/com/crowdsense/dto/LocationDTO.java
package com.crowdsense.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class LocationDTO {

    @NotBlank
    private String id;

    @NotBlank
    private String name;

    @NotNull
    private Double latitude;

    @NotNull
    private Double longitude;

    private String description;

    private Integer maxCapacity;

    /** UUID of the event this zone belongs to. */
    private String eventId;

    /**
     * GeoJSON Polygon string drawn by the organiser in the ZoneEditor.
     * Example:
     * {
     * "type": "Polygon",
     * "coordinates":
     * [[[77.209,28.614],[77.210,28.614],[77.210,28.613],[77.209,28.614]]]
     * }
     */
    private String boundaryGeoJson;
}