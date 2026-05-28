package com.crowdsense.repository;

import com.crowdsense.model.Alert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<Alert, String> {
    List<Alert> findTop50ByOrderByTriggeredAtDesc();

    List<Alert> findByResolvedFalseOrderByTriggeredAtDesc();

    List<Alert> findByResolvedTrueOrderByTriggeredAtDesc();

    long countByResolvedFalse();

    long countByResolvedTrue();
}