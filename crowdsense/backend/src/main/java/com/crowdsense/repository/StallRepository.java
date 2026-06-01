// backend/src/main/java/com/crowdsense/repository/StallRepository.java
package com.crowdsense.repository;

import com.crowdsense.model.Stall;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StallRepository extends JpaRepository<Stall, String> {

    List<Stall> findByEventIdAndIsActiveTrue(String eventId);

    List<Stall> findByEventIdAndCategoryAndIsActiveTrue(String eventId, String category);

    List<Stall> findByZoneId(String zoneId);

    List<Stall> findByZoneIdAndIsActiveTrue(String zoneId);
}