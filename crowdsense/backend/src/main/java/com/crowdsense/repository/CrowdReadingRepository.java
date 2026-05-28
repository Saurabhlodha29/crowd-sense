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
         * FIX: Uses PostgreSQL's DISTINCT ON to get the single latest reading per
         * location.
         * This replaces broken JPQL correlated subquery which threw on empty table /
         * type mismatch.
         */
        @Query(value = "SELECT DISTINCT ON (location_id) * FROM crowd_readings ORDER BY location_id, captured_at DESC", nativeQuery = true)
        List<CrowdReading> findLatestPerLocation();

        /**
         * Get last N readings for a specific location, newest first.
         */
        @Query(value = "SELECT * FROM crowd_readings WHERE location_id = :locationId ORDER BY captured_at DESC LIMIT :limitVal", nativeQuery = true)
        List<CrowdReading> findTopNByLocationIdOrderByCapturedAtDesc(
                        @Param("locationId") String locationId,
                        @Param("limitVal") int limitVal);

        /**
         * Count readings in a time window — used by AlertService.
         */
        @Query(value = "SELECT COUNT(*) FROM crowd_readings WHERE location_id = :locationId AND captured_at > :since", nativeQuery = true)
        long countByLocationIdAndCapturedAtAfter(
                        @Param("locationId") String locationId,
                        @Param("since") Instant since);

        /**
         * Get readings between timestamps for a location.
         */
        @Query(value = "SELECT * FROM crowd_readings WHERE location_id = :locationId AND captured_at BETWEEN :from AND :to ORDER BY captured_at ASC", nativeQuery = true)
        List<CrowdReading> findByLocationIdAndCapturedAtBetween(
                        @Param("locationId") String locationId,
                        @Param("from") Instant from,
                        @Param("to") Instant to);
}