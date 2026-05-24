package com.crowdsense.websocket;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class CrowdUpdateMessage {
    private String locationId;
    private Integer personCount;
    private String crowdLevel;
    private Instant capturedAt;
}