// backend/src/main/java/com/crowdsense/repository/AlertRepository.java
package com.crowdsense.repository;

import com.crowdsense.model.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, String> {

    List<Alert> findByResolvedFalseOrderByTriggeredAtDesc();

    List<Alert> findByResolvedTrueOrderByTriggeredAtDesc();

    List<Alert> findAllByOrderByTriggeredAtDesc();

    List<Alert> findByLocationIdOrderByTriggeredAtDesc(String locationId);

    long countByResolvedFalse();

    long countByResolvedTrue();

    /**
     * Check if an unresolved alert of the same type already exists
     * for this location (prevents duplicate alert storms).
     */
    boolean existsByLocationIdAndAlertTypeAndResolvedFalse(
            String locationId, String alertType);

    /** Alerts triggered within a time range (for analytics / export). */
    @Query("SELECT a FROM Alert a WHERE a.triggeredAt >= :from AND a.triggeredAt <= :to ORDER BY a.triggeredAt DESC")
    List<Alert> findByTimeRange(@Param("from") Instant from, @Param("to") Instant to);
}
