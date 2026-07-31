/**
 * Short TTL in-memory cache for ORS responses (dedupe rapid repeats).
 */
class TtlCache {
  constructor({ ttlMs = 5 * 60 * 1000, maxSize = 80 } = {}) {
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    // Refresh insertion order for simple LRU-ish eviction.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key, value) {
    if (this.store.has(key)) this.store.delete(key);
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    while (this.store.size > this.maxSize) {
      const oldest = this.store.keys().next().value;
      this.store.delete(oldest);
    }
  }
}

const roundCoord = (value) => Number(value).toFixed(4);

const buildRouteCacheKey = ({
  coordinates,
  profile,
  rideStyle,
  climbPreference,
  preferAsphalt,
  avoidMainRoads,
  includeAlternatives,
}) => {
  const path = (coordinates || [])
    .map(([lng, lat]) => `${roundCoord(lng)},${roundCoord(lat)}`)
    .join(";");
  return [
    "route",
    path,
    profile || "",
    rideStyle || "",
    climbPreference || "",
    preferAsphalt ? "1" : "0",
    avoidMainRoads ? "1" : "0",
    includeAlternatives ? "alts" : "single",
  ].join("|");
};

const buildLoopCacheKey = ({
  start,
  distanceKm,
  rideStyle,
  climbPreference,
  preferAsphalt,
  avoidMainRoads,
  seed,
  points,
}) =>
  [
    "loop",
    `${roundCoord(start.lng)},${roundCoord(start.lat)}`,
    Number(distanceKm).toFixed(1),
    rideStyle || "",
    climbPreference || "",
    preferAsphalt ? "1" : "0",
    avoidMainRoads ? "1" : "0",
    seed,
    points,
  ].join("|");

module.exports = {
  TtlCache,
  buildRouteCacheKey,
  buildLoopCacheKey,
};
