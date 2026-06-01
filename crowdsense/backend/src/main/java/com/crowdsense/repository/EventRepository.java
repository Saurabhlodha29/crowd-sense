// backend/src/main/java/com/crowdsense/repository/EventRepository.java
package com.crowdsense.repository;

import com.crowdsense.model.Event;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EventRepository extends JpaRepository<Event, String> {

    Page<Event> findByStatusAndIsActiveTrueAndIsPublicTrue(String status, Pageable pageable);

    Page<Event> findByStatusAndIsActiveTrueAndIsPublicTrueAndCityContainingIgnoreCase(
            String status, String city, Pageable pageable);

    List<Event> findByOrganizerIdAndIsActiveTrue(String organizerId);

    /**
     * Full-text search with optional city filter (no geo).
     * Uses PostgreSQL ts_rank for relevance ordering.
     */
    @Query(value = """
            SELECT * FROM events
            WHERE
              to_tsvector('english', name || ' ' || COALESCE(city,'') || ' ' || COALESCE(description,''))
              @@ plainto_tsquery('english', :q)
              AND is_public  = true
              AND is_active  = true
              AND (:city IS NULL OR LOWER(city) LIKE LOWER(CONCAT('%', :city, '%')))
            ORDER BY
              ts_rank(
                to_tsvector('english', name || ' ' || COALESCE(city,'') || ' ' || COALESCE(description,'')),
                plainto_tsquery('english', :q)
              ) DESC,
              start_time ASC
            """, nativeQuery = true)
    List<Event> searchText(
            @Param("q") String q,
            @Param("city") String city,
            Pageable pageable);

    /**
     * Full-text + geo search: returns events within radius meters of lat/lng,
     * sorted by relevance then distance.
     */
    @Query(value = """
            SELECT e.*,
                   ST_Distance(
                     ST_MakePoint(e.longitude, e.latitude)::geography,
                     ST_MakePoint(:lng, :lat)::geography
                   ) AS dist_m
            FROM   events e
            WHERE
              to_tsvector('english', e.name || ' ' || COALESCE(e.city,'') || ' ' || COALESCE(e.description,''))
              @@ plainto_tsquery('english', :q)
              AND e.is_public = true
              AND e.is_active = true
              AND (:city IS NULL OR LOWER(e.city) LIKE LOWER(CONCAT('%', :city, '%')))
              AND ST_DWithin(
                    ST_MakePoint(e.longitude, e.latitude)::geography,
                    ST_MakePoint(:lng, :lat)::geography,
                    :radius
              )
            ORDER BY dist_m ASC, e.start_time ASC
            """, nativeQuery = true)
    List<Event> searchWithGeo(
            @Param("q") String q,
            @Param("city") String city,
            @Param("lat") Double lat,
            @Param("lng") Double lng,
            @Param("radius") Double radiusMeters,
            Pageable pageable);
}