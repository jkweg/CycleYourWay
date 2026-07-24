const { getAsphaltSharePercent } = require("./routePreferences");

const MAIN_ROAD_WAYTYPES = new Set([1, 2]);

const getMainRoadSharePercent = (feature) => {
  const summary = feature?.properties?.extras?.waytype?.summary;
  if (!Array.isArray(summary) || summary.length === 0) return null;

  let mainRoadShare = 0;
  for (const item of summary) {
    if (MAIN_ROAD_WAYTYPES.has(item?.value) && typeof item.amount === "number") {
      mainRoadShare += item.amount;
    }
  }
  return mainRoadShare;
};

const featurePreferenceScore = (
  feature,
  { avoidMainRoads = false, preferAsphalt = false } = {},
) => {
  let score = 0;

  if (avoidMainRoads) {
    const mainShare = getMainRoadSharePercent(feature);
    score += mainShare === null ? 55 : mainShare;
  }

  if (preferAsphalt) {
    const asphaltShare = getAsphaltSharePercent(feature);
    // Lower score is better → penalize missing asphalt data / unpaved share.
    score += asphaltShare === null ? 45 : 100 - asphaltShare;
  }

  return score;
};

const rankFeaturesByPreferences = (
  features,
  { avoidMainRoads = false, preferAsphalt = false } = {},
) => {
  if (!Array.isArray(features) || features.length <= 1) return features;
  if (!avoidMainRoads && !preferAsphalt) return features;

  return [...features].sort((featureA, featureB) => {
    const scoreA = featurePreferenceScore(featureA, {
      avoidMainRoads,
      preferAsphalt,
    });
    const scoreB = featurePreferenceScore(featureB, {
      avoidMainRoads,
      preferAsphalt,
    });
    return scoreA - scoreB;
  });
};

/** @deprecated use rankFeaturesByPreferences */
const rankFeaturesByMainRoadShare = (features) =>
  rankFeaturesByPreferences(features, { avoidMainRoads: true });

module.exports = {
  featurePreferenceScore,
  getAsphaltSharePercent,
  getMainRoadSharePercent,
  rankFeaturesByMainRoadShare,
  rankFeaturesByPreferences,
};
