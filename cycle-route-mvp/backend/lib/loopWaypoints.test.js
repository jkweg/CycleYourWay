const test = require("node:test");
const assert = require("node:assert/strict");
const {
  LOOP_MAX_KM,
  ORS_ROUND_TRIP_MAX_KM,
  buildEllipseLoopCoordinates,
  waypointCountForDistanceKm,
} = require("./loopWaypoints");
const {
  douglasPeucker,
  withDisplaySimplifiedGeometry,
} = require("./geoSimplify");

test("ellipse loop is closed and has expected waypoint budget", () => {
  const start = { lat: 50.06, lng: 19.94 };
  const coords = buildEllipseLoopCoordinates(start, {
    lengthMeters: 150000,
    bearingDeg: 40,
    waypointCount: 6,
  });
  assert.ok(coords.length >= 7);
  assert.deepEqual(coords[0], [start.lng, start.lat]);
  assert.deepEqual(coords[coords.length - 1], [start.lng, start.lat]);
  assert.equal(LOOP_MAX_KM, 200);
  assert.equal(ORS_ROUND_TRIP_MAX_KM, 100);
  assert.equal(waypointCountForDistanceKm(150), 7);
});

test("douglasPeucker reduces dense nearly-collinear points", () => {
  const points = [];
  for (let i = 0; i <= 40; i += 1) {
    points.push([19.9 + i * 0.0001, 50.0 + i * 0.00001]);
  }
  const simplified = douglasPeucker(points, 20);
  assert.ok(simplified.length < points.length);
  assert.deepEqual(simplified[0], points[0]);
  assert.deepEqual(simplified[simplified.length - 1], points[points.length - 1]);
});

test("withDisplaySimplifiedGeometry keeps full coords for navigation", () => {
  const coordinates = Array.from({ length: 40 }, (_, i) => [
    19.9 + i * 0.001,
    50 + i * 0.0002,
    200 + i,
  ]);
  const feature = {
    type: "Feature",
    geometry: { type: "LineString", coordinates },
    properties: { summary: { distance: 10000 } },
  };
  const next = withDisplaySimplifiedGeometry(feature, { toleranceMeters: 25 });
  assert.equal(next.properties.cyw_simplified, true);
  assert.equal(next.properties.cyw_full_coordinates.length, 40);
  assert.ok(next.geometry.coordinates.length < 40);
});
