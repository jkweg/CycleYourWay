const test = require("node:test");
const assert = require("node:assert/strict");
const {
  featureDistanceMeters,
  lengthDeviationRatio,
  rankLoopFeatures,
  roundTripPointsForDistanceKm,
} = require("./loopGeometry");
const { TtlCache, buildRouteCacheKey } = require("./orsCache");

test("roundTripPoints grows with target distance", () => {
  assert.equal(roundTripPointsForDistanceKm(20), 3);
  assert.equal(roundTripPointsForDistanceKm(40), 4);
  assert.equal(roundTripPointsForDistanceKm(70), 5);
  assert.equal(roundTripPointsForDistanceKm(100), 5);
});

test("lengthDeviationRatio measures relative error", () => {
  assert.equal(lengthDeviationRatio(55000, 50000), 0.1);
  assert.equal(lengthDeviationRatio(null, 50000), Number.POSITIVE_INFINITY);
});

test("rankLoopFeatures prefers closer length when preference scores tie", () => {
  const far = { properties: { summary: { distance: 70000 } } };
  const near = { properties: { summary: { distance: 52000 } } };
  const ranked = rankLoopFeatures([far, near], { targetMeters: 50000 });
  assert.equal(ranked[0], near);
  assert.equal(featureDistanceMeters(near), 52000);
});

test("TtlCache returns stored values and respects max size", () => {
  const cache = new TtlCache({ ttlMs: 60_000, maxSize: 2 });
  cache.set("a", 1);
  cache.set("b", 2);
  cache.set("c", 3);
  assert.equal(cache.get("a"), undefined);
  assert.equal(cache.get("b"), 2);
  assert.equal(cache.get("c"), 3);
});

test("buildRouteCacheKey distinguishes alternatives mode", () => {
  const base = {
    coordinates: [
      [19.94, 50.06],
      [19.95, 50.07],
    ],
    profile: "cycling-regular",
    rideStyle: "gravel",
    climbPreference: "normal",
    preferAsphalt: false,
    avoidMainRoads: false,
  };
  const single = buildRouteCacheKey({ ...base, includeAlternatives: false });
  const alts = buildRouteCacheKey({ ...base, includeAlternatives: true });
  assert.notEqual(single, alts);
  assert.match(single, /single$/);
  assert.match(alts, /alts$/);
});
