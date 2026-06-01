// frontend/src/utils/crowdDots.js
// Generates lat/lng dot positions for the live crowd canvas layer.
// When real positions are available (from camera/DeepSORT), uses those.
// Otherwise distributes points randomly within the zone polygon.

import * as turf from "@turf/turf";

/**
 * @param {object} zone      - Location with boundaryGeoJson string
 * @param {number} count     - Person count
 * @param {Array}  positions - [{id, lat, lng}] from backend, may be empty
 * @returns Array of {lat, lng, id}
 */
export function generateCrowdDots(zone, count, positions) {
  // Real positions from camera tracking (already in lat/lng)
  if (positions && positions.length > 0) {
    const real = positions.filter((p) => p.lat && p.lng);
    if (real.length > 0) return real;
  }

  // Fallback: random distribution inside polygon
  if (zone.boundaryGeoJson) {
    try {
      const poly = JSON.parse(zone.boundaryGeoJson);
      return randomPointsInPolygon(poly, Math.min(count, 200));
    } catch (_) {
      // fall through to zone-centre dots
    }
  }

  // Final fallback: cluster around zone centre
  return clusterAroundCenter(zone.latitude, zone.longitude, count);
}

function randomPointsInPolygon(geoJsonPolygon, n) {
  const feature = turf.feature(geoJsonPolygon);
  const bbox    = turf.bbox(feature);
  const dots    = [];
  let   tries   = 0;
  while (dots.length < n && tries < n * 20) {
    tries++;
    const pt = turf.randomPoint(1, { bbox }).features[0];
    if (turf.booleanPointInPolygon(pt, feature)) {
      dots.push({
        lat: pt.geometry.coordinates[1],
        lng: pt.geometry.coordinates[0],
        id:  dots.length,
      });
    }
  }
  return dots;
}

function clusterAroundCenter(lat, lng, n) {
  const dots = [];
  for (let i = 0; i < Math.min(n, 200); i++) {
    const angle  = Math.random() * 2 * Math.PI;
    const radius = Math.random() * 0.0003; // ~30 m spread
    dots.push({
      lat: lat + radius * Math.cos(angle),
      lng: lng + radius * Math.sin(angle),
      id:  i,
    });
  }
  return dots;
}