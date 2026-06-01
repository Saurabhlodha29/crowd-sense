// backend/src/main/java/com/crowdsense/dto/EventDTO.java
package com.crowdsense.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.Instant;

@Data
public class EventDTO {

    @NotBlank
    private String name;
    private String description;

    @NotNull
    private Instant startTime;
    private Instant endTime;

    private String address;
    @NotBlank
    private String city;

    private Double latitude;
    private Double longitude;
    private Integer maxCapacity;
    private String floorPlanUrl;
    private Boolean isPublic = true;
    private String status;
    private String[] tags;
}