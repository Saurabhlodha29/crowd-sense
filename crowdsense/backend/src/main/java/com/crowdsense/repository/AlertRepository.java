package com.crowdsense.repository;

import com.crowdsense.model.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, String> {

    List<Alert> findByResolvedFalseOrderByTriggeredAtDesc();

    List<Alert> findAllByOrderByTriggeredAtDesc();

    List<Alert> findByLocationIdOrderByTriggeredAtDesc(String locationId);

    boolean existsByLocationIdAndCrowdLevelAndResolvedFalse(String locationId, String crowdLevel);
}
