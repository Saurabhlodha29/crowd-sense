// backend/src/main/java/com/crowdsense/repository/LocationRepository.java
package com.crowdsense.repository;

import com.crowdsense.model.Location;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface LocationRepository extends JpaRepository<Location, String> {
    List<Location> findByIsActiveTrue();

    List<Location> findByEventIdAndIsActiveTrue(String eventId);

    List<Location> findByEventId(String eventId);
}