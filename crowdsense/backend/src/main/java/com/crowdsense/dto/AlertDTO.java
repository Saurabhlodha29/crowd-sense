package com.crowdsense.dto;

import lombok.Data;
import java.time.Instant;

@Data
public class AlertDTO {
    private String id;
    private String locationId;
    private String alertType;
    private String message;
    private String crowdLevel;
    private Integer personCount;
    private Boolean resolved;
    private Instant triggeredAt;
    private Instant resolvedAt;
}