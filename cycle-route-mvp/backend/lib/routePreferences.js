/**
 * Map CycleYourWay ride preferences → OpenRouteService profile / weightings.
 */

const RIDE_STYLE_TO_PROFILE = {
  road: "cycling-road",
  gravel: "cycling-regular",
  mtb: "cycling-mountain",
};

const PROFILE_FALLBACKS = {
  "cycling-road": ["cycling-road", "cycling-regular", "cycling-mountain"],
  "cycling-regular": ["cycling-regular", "cycling-mountain"],
  "cycling-mountain": ["cycling-mountain", "cycling-regular"],
};

/** ORS steepness_difficulty: 0 novice … 3 pro */
const CLIMB_TO_STEEPNESS = {
  easy: 0,
  normal: 1,
  hard: 3,
};

const ASPHALT_SURFACE_CODES = new Set([1, 3]); // "Asfalt / utwardzona", "Asfalt"

function resolveRideStyle(rideStyle) {
  if (rideStyle && RIDE_STYLE_TO_PROFILE[rideStyle]) return rideStyle;
  return "mtb";
}

function resolveClimbPreference(climbPreference) {
  if (climbPreference && CLIMB_TO_STEEPNESS[climbPreference] != null) {
    return climbPreference;
  }
  return "normal";
}

function resolveOrsProfile(rideStyle) {
  return RIDE_STYLE_TO_PROFILE[resolveRideStyle(rideStyle)];
}

function profilesToTry(rideStyle) {
  const primary = resolveOrsProfile(rideStyle);
  return PROFILE_FALLBACKS[primary] || [primary, "cycling-regular"];
}

function steepnessDifficulty(climbPreference) {
  return CLIMB_TO_STEEPNESS[resolveClimbPreference(climbPreference)];
}

function buildOrsRoutingOptions({ climbPreference } = {}) {
  const difficulty = steepnessDifficulty(climbPreference);
  if (difficulty == null) return undefined;

  return {
    profile_params: {
      weightings: {
        steepness_difficulty: difficulty,
      },
    },
  };
}

function getAsphaltSharePercent(feature) {
  const summary = feature?.properties?.extras?.surface?.summary;
  if (!Array.isArray(summary) || summary.length === 0) return null;

  let asphaltShare = 0;
  for (const item of summary) {
    if (
      ASPHALT_SURFACE_CODES.has(item?.value) &&
      typeof item.amount === "number"
    ) {
      asphaltShare += item.amount;
    }
  }
  return asphaltShare;
}

module.exports = {
  ASPHALT_SURFACE_CODES,
  RIDE_STYLE_TO_PROFILE,
  buildOrsRoutingOptions,
  getAsphaltSharePercent,
  profilesToTry,
  resolveClimbPreference,
  resolveOrsProfile,
  resolveRideStyle,
  steepnessDifficulty,
};
