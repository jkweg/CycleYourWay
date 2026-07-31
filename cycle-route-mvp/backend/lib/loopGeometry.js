/**
 * Adaptive ORS round_trip shaping and length scoring.
 */

const roundTripPointsForDistanceKm = (distanceKm) => {
  const km = Number(distanceKm);
  if (!Number.isFinite(km) || km <= 0) return 3;
  if (km >= 70) return 5;
  if (km >= 40) return 4;
  return 3;
};

const featureDistanceMeters = (feature) => {
  const summaryDistance = feature?.properties?.summary?.distance;
  if (typeof summaryDistance === "number" && Number.isFinite(summaryDistance)) {
    return summaryDistance;
  }
  const segments = feature?.properties?.segments;
  if (!Array.isArray(segments) || segments.length === 0) return null;
  let total = 0;
  for (const segment of segments) {
    if (typeof segment?.distance === "number") total += segment.distance;
  }
  return total > 0 ? total : null;
};

const lengthDeviationRatio = (actualMeters, targetMeters) => {
  if (
    !Number.isFinite(actualMeters) ||
    !Number.isFinite(targetMeters) ||
    targetMeters <= 0
  ) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.abs(actualMeters - targetMeters) / targetMeters;
};

/**
 * Prefer preference score, then closer match to target loop length.
 */
const rankLoopFeatures = (
  features,
  {
    targetMeters,
    avoidMainRoads = false,
    preferAsphalt = false,
    preferenceScore,
  } = {},
) => {
  if (!Array.isArray(features) || features.length <= 1) return features;

  return [...features].sort((a, b) => {
    const scoreA = preferenceScore
      ? preferenceScore(a, { avoidMainRoads, preferAsphalt })
      : 0;
    const scoreB = preferenceScore
      ? preferenceScore(b, { avoidMainRoads, preferAsphalt })
      : 0;
    if (scoreA !== scoreB) return scoreA - scoreB;

    const devA = lengthDeviationRatio(featureDistanceMeters(a), targetMeters);
    const devB = lengthDeviationRatio(featureDistanceMeters(b), targetMeters);
    return devA - devB;
  });
};

module.exports = {
  featureDistanceMeters,
  lengthDeviationRatio,
  rankLoopFeatures,
  roundTripPointsForDistanceKm,
};
