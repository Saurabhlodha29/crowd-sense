// backend/src/main/java/com/crowdsense/dto/BulkSyncDTO.java
package com.crowdsense.dto;

import lombok.Data;
import java.util.List;

@Data
public class BulkSyncDTO {
    private List<CrowdReadingDTO> readings;
}