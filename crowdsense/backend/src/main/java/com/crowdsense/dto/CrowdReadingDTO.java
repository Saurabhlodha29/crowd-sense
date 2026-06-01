// backend/src/main/java/com/crowdsense/dto/CrowdReadingDTO.java
package com.crowdsense.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data
public class CrowdReadingDTO {

    @NotBlank(message = "locationId is required")
    private String locationId;

    @NotNull
    @Min(0)
    private Integer personCount;

    @NotBlank
    @Pattern(regexp = "LOW|MEDIUM|HIGH|CRITICAL", message = "crowdLevel must be LOW|MEDIUM|HIGH|CRITICAL")
    private String crowdLevel;

    private Double confidence;

    private Instant capturedAt;

    /** Source tag — set by edge agent. Stored as-is. */
    private String source = "HYBRID";

    /**
     * Array of position objects from DeepSORT tracking or CSRNet.
     * Each element: {"id": int, "lat": double, "lng": double}
     * OR {"id": int, "cx": double, "cy": double} (pixel coords — converted by ML
     * service)
     * May be null/empty if camera is offline.
     */
    private List<Map<String, Object>> positions;
}