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

const rankFeaturesByMainRoadShare = (features) => {
  if (!Array.isArray(features) || features.length <= 1) return features;

  return [...features].sort((featureA, featureB) => {
    const shareA = getMainRoadSharePercent(featureA);
    const shareB = getMainRoadSharePercent(featureB);
    const scoreA = shareA === null ? Number.POSITIVE_INFINITY : shareA;
    const scoreB = shareB === null ? Number.POSITIVE_INFINITY : shareB;
    return scoreA - scoreB;
  });
};

module.exports = {
  getMainRoadSharePercent,
  rankFeaturesByMainRoadShare,
};
