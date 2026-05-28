package com.crowdsense.dto;

import lombok.Data;
import java.time.Instant;

@Data
public class CrowdReadingDTO {
    private String locationId;
    private Integer personCount;
    private String crowdLevel;
    private Double confidence;
    private Instant capturedAt;
}