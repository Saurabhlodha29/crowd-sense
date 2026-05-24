package com.crowdsense.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.Instant;

@Data
public class CrowdReadingDTO {

    @NotBlank(message = "locationId is required")
    @JsonProperty("locationId")
    private String locationId;

    @NotNull(message = "personCount is required")
    @Min(value = 0, message = "personCount must be >= 0")
    @JsonProperty("personCount")
    private Integer personCount;

    @NotBlank(message = "crowdLevel is required")
    @JsonProperty("crowdLevel")
    private String crowdLevel;

    @JsonProperty("confidence")
    private Double confidence;

    @JsonProperty("capturedAt")
    private Instant capturedAt;
}