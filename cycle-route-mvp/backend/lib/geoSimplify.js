/**
 * Douglas–Peucker simplification for GeoJSON line coordinates [lng, lat, ele?].
 * Keeps elevation when present. Tolerance in meters (approx via degree scale).
 */

const toRad = (deg) => (deg * Math.PI) / 180;

const haversineMeters = (a, b) => {
  const earth = 6371000;
  const dLat = toRad(b[1] - a[1]);
  const dLng = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
};

const perpendicularDistanceMeters = (point, start, end) => {
  if (start[0] === end[0] && start[1] === end[1]) {
    return haversineMeters(point, start);
  }
  // Local equirectangular projection around start.
  const cosLat = Math.cos(toRad(start[1]));
  const x0 = (point[0] - start[0]) * cosLat;
  const y0 = point[1] - start[1];
  const x1 = (end[0] - start[0]) * cosLat;
  const y1 = end[1] - start[1];
  const denom = x1 * x1 + y1 * y1;
  const t = denom === 0 ? 0 : Math.max(0, Math.min(1, (x0 * x1 + y0 * y1) / denom));
  const proj = {
    lng: start[0] + t * (end[0] - start[0]),
    lat: start[1] + t * (end[1] - start[1]),
  };
  return haversineMeters(point, [proj.lng, proj.lat]);
};

const douglasPeucker = (points, toleranceMeters) => {
  if (!Array.isArray(points) || points.length <= 2) return points || [];

  let maxDistance = 0;
  let index = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i += 1) {
    const distance = perpendicularDistanceMeters(points[i], points[0], points[end]);
    if (distance > maxDistance) {
      index = i;
      maxDistance = distance;
    }
  }

  if (maxDistance > toleranceMeters) {
    const left = douglasPeucker(points.slice(0, index + 1), toleranceMeters);
    const right = douglasPeucker(points.slice(index), toleranceMeters);
    return left.slice(0, -1).concat(right);
  }

  return [points[0], points[end]];
};

/**
 * Attach full coordinates for nav/GPX and replace geometry with a simplified line for maps.
 */
const withDisplaySimplifiedGeometry = (feature, { toleranceMeters = 14 } = {}) => {
  if (!feature?.geometry || feature.geometry.type !== "LineString") {
    return feature;
  }
  const full = feature.geometry.coordinates;
  if (!Array.isArray(full) || full.length < 8) return feature;

  const simplified = douglasPeucker(full, toleranceMeters);
  if (simplified.length < 2 || simplified.length >= full.length) {
    return feature;
  }

  return {
    ...feature,
    geometry: {
      ...feature.geometry,
      coordinates: simplified,
    },
    properties: {
      ...(feature.properties || {}),
      cyw_full_coordinates: full,
      cyw_simplified: true,
      cyw_full_point_count: full.length,
      cyw_display_point_count: simplified.length,
    },
  };
};

module.exports = {
  douglasPeucker,
  withDisplaySimplifiedGeometry,
};
