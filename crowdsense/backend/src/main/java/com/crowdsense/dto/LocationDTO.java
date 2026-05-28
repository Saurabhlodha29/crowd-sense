package com.crowdsense.dto;

import lombok.Data;

@Data
public class LocationDTO {
    private String id;
    private String name;
    private Double latitude;
    private Double longitude;
    private String description;
    private Integer maxCapacity;
}