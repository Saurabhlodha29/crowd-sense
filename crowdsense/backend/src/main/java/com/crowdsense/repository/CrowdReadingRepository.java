// backend/src/main/java/com/crowdsense/repository/CrowdReadingRepository.java
package com.crowdsense.repository;

import com.crowdsense.model.CrowdReading;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface CrowdReadingRepository extends JpaRepository<CrowdReading, String> {

        /**
         * Returns the single most-recent reading per location.
         * Uses PostgreSQL DISTINCT ON — eliminates the 500 error from JPQL subqueries.
         */
        @Query(value = """
                        SELECT DISTINCT ON (location_id)
                               id, location_id, person_count, crowd_level,
                               confidence, source, positions, captured_at, created_at
                        FROM   crowd_readings
                        ORDER  BY location_id, captured_at DESC
                        """, nativeQuery = true)
        List<CrowdReading> findLatestPerLocation();

        /**
         * Latest reading per location scoped to the zones of one event.
         * joins to locations to filter by event_id.
         */
        @Query(value = """
                        SELECT DISTINCT ON (cr.location_id)
                               cr.id, cr.location_id, cr.person_count, cr.crowd_level,
                               cr.confidence, cr.source, cr.positions, cr.captured_at, cr.created_at
                        FROM   crowd_readings cr
                        JOIN   locations l ON l.id = cr.location_id
                        WHERE  l.event_id = :eventId
                        ORDER  BY cr.location_id, cr.captured_at DESC
                        """, nativeQuery = true)
        List<CrowdReading> findLatestPerLocationByEventId(@Param("eventId") String eventId);

        /**
         * Time-series for one location (for Chart.js).
         */
        @Query(value = """
                        SELECT * FROM crowd_readings
                        WHERE  location_id = :locationId
                        ORDER  BY captured_at DESC
                        LIMIT  :limit
                        """, nativeQuery = true)
        List<CrowdReading> findTopNByLocationIdOrderByCapturedAtDesc(
                        @Param("locationId") String locationId,
                        @Param("limit") int limit);

        /**
         * Time-series with optional date range filtering.
         */
        @Query("SELECT r FROM CrowdReading r " +
                        "WHERE r.locationId = :locationId " +
                        "AND (:from IS NULL OR r.capturedAt >= :from) " +
                        "AND (:to   IS NULL OR r.capturedAt <= :to) " +
                        "ORDER BY r.capturedAt DESC")
        List<CrowdReading> findByLocationIdAndTimeRange(
                        @Param("locationId") String locationId,
                        @Param("from") Instant from,
                        @Param("to") Instant to,
                        org.springframework.data.domain.Pageable pageable);

        /** Peak count for a location in a time window (for analytics). */
        @Query("SELECT MAX(r.personCount) FROM CrowdReading r " +
                        "WHERE r.locationId = :locationId " +
                        "AND r.capturedAt >= :from AND r.capturedAt <= :to")
        Integer findPeakCount(@Param("locationId") String locationId,
                        @Param("from") Instant from,
                        @Param("to") Instant to);
}
