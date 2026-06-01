// backend/src/main/java/com/crowdsense/repository/ZoneConnectionRepository.java
package com.crowdsense.repository;

import com.crowdsense.model.ZoneConnection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ZoneConnectionRepository extends JpaRepository<ZoneConnection, String> {

    List<ZoneConnection> findByEventId(UUID eventId);

    List<ZoneConnection> findByEventIdAndIsExitRouteTrue(UUID eventId);

    @Query("SELECT z FROM ZoneConnection z WHERE z.eventId = :eventId " +
            "AND (z.fromZoneId = :zoneId OR z.toZoneId = :zoneId)")
    List<ZoneConnection> findByEventIdAndZoneId(
            @Param("eventId") UUID eventId,
            @Param("zoneId") String zoneId);

    void deleteByEventId(UUID eventId);
}
