/**
 * Geospatial utility functions for simulator
 */

/**
 * Generate random point within radius of a center point
 * @param {number} centerLat - Center latitude
 * @param {number} centerLng - Center longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {{lat: number, lng: number}}
 */
function randomPointInRadius(centerLat, centerLng, radiusKm) {
  const radiusInDegrees = radiusKm / 111.32; // 1 degree ≈ 111.32 km

  const u = Math.random();
  const v = Math.random();
  const w = radiusInDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);

  const newLat = centerLat + y;
  const newLng = centerLng + x / Math.cos((centerLat * Math.PI) / 180);

  return { lat: newLat, lng: newLng };
}

/**
 * Move a point slightly (simulate bike movement)
 * @param {number} lat - Current latitude
 * @param {number} lng - Current longitude
 * @param {number} maxDistanceKm - Maximum movement distance in km
 * @returns {{lat: number, lng: number}}
 */
function movePoint(lat, lng, maxDistanceKm = 0.05) {
  return randomPointInRadius(lat, lng, maxDistanceKm);
}

/**
 * Calculate distance between two points (Haversine formula)
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

module.exports = {
  randomPointInRadius,
  movePoint,
  haversineDistance,
};
