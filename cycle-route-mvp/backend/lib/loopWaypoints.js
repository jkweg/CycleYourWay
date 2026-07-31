/**
 * Long-loop geometry: closed waypoint ring on a rotated ellipse.
 * Used when target distance exceeds ORS native round_trip (100 km).
 */

const EARTH_RADIUS_M = 6371000;
const ORS_ROUND_TRIP_MAX_KM = 100;
const LOOP_MAX_KM = 200;
const LOOP_MIN_KM = 5;

/** Road networks inflate geometric circumference — start undersized then scale. */
const ROAD_INFLATION = 1.28;

const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

const offsetLatLng = (lat, lng, eastMeters, northMeters) => {
  const newLat = lat + toDeg(northMeters / EARTH_RADIUS_M);
  const newLng =
    lng + toDeg(eastMeters / (EARTH_RADIUS_M * Math.cos(toRad(lat))));
  return { lat: newLat, lng: newLng };
};

/**
 * Build closed ORS coordinates: start → N ellipse samples → start.
 * @returns {number[][]} [lng, lat] pairs
 */
const buildEllipseLoopCoordinates = (
  start,
  {
    lengthMeters,
    bearingDeg = 0,
    waypointCount = 6,
    radiusScale = 1,
  } = {},
) => {
  const geometricCircumference = lengthMeters / ROAD_INFLATION;
  const meanRadius =
    (geometricCircumference / (2 * Math.PI)) * Math.max(0.35, radiusScale);
  const a = meanRadius * 1.18;
  const b = meanRadius * 0.82;
  const rot = toRad(bearingDeg);

  const coordinates = [[start.lng, start.lat]];
  const samples = Math.max(4, Math.min(8, Math.round(waypointCount)));

  for (let i = 1; i <= samples; i += 1) {
    const t = (i / (samples + 1)) * 2 * Math.PI;
    const x = a * Math.cos(t);
    const y = b * Math.sin(t);
    const east = x * Math.cos(rot) - y * Math.sin(rot);
    const north = x * Math.sin(rot) + y * Math.cos(rot);
    const point = offsetLatLng(start.lat, start.lng, east, north);
    coordinates.push([point.lng, point.lat]);
  }

  coordinates.push([start.lng, start.lat]);
  return coordinates;
};

const bearingFromSeed = (seed) => ((Number(seed) % 90) / 90) * 360;

const waypointCountForDistanceKm = (distanceKm) => {
  if (distanceKm >= 160) return 8;
  if (distanceKm >= 120) return 7;
  return 6;
};

module.exports = {
  LOOP_MAX_KM,
  LOOP_MIN_KM,
  ORS_ROUND_TRIP_MAX_KM,
  bearingFromSeed,
  buildEllipseLoopCoordinates,
  waypointCountForDistanceKm,
};
