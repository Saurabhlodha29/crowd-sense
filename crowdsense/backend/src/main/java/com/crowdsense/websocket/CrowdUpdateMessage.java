// backend/src/main/java/com/crowdsense/websocket/CrowdUpdateMessage.java
package com.crowdsense.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CrowdUpdateMessage {
    private String locationId;
    private Integer personCount;
    private String crowdLevel;
    private Instant capturedAt;
    /** Live dot cloud — [{id, lat, lng}] for canvas rendering on frontend */
    private List<Map<String, Object>> positions;
}