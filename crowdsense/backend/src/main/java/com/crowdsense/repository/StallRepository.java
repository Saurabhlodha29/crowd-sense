// backend/src/main/java/com/crowdsense/repository/StallRepository.java
package com.crowdsense.repository;

import com.crowdsense.model.Stall;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StallRepository extends JpaRepository<Stall, String> {

    List<Stall> findByEventIdAndIsActiveTrue(UUID eventId);

    List<Stall> findByEventIdAndCategoryAndIsActiveTrue(UUID eventId, String category);

    List<Stall> findByZoneId(String zoneId);

    List<Stall> findByZoneIdAndIsActiveTrue(String zoneId);
}
