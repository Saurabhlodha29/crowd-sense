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

    // Get the latest reading per location (for the dashboard summary cards)
    @Query(value = """
            SELECT DISTINCT ON (location_id) *
            FROM crowd_readings
            ORDER BY location_id, captured_at DESC
            """, nativeQuery = true)
    List<CrowdReading> findLatestPerLocation();

    // Get N most recent readings for a specific location
    @Query(value = """
            SELECT * FROM crowd_readings
            WHERE location_id = :locationId
            ORDER BY captured_at DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<CrowdReading> findTopNByLocationIdOrderByCapturedAtDesc(
            @Param("locationId") String locationId,
            @Param("limit") int limit);

    // Get readings in a time window (for historical charts)
    @Query(value = """
            SELECT * FROM crowd_readings
            WHERE location_id = :locationId
              AND captured_at BETWEEN :from AND :to
            ORDER BY captured_at ASC
            """, nativeQuery = true)
    List<CrowdReading> findByLocationIdAndTimeRange(
            @Param("locationId") String locationId,
            @Param("from") Instant from,
            @Param("to") Instant to);
}