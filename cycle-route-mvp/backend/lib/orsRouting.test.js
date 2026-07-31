const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ORS_AUTOCOMPLETE_URL,
  ORS_SEARCH_URL,
  directionsGeoJsonUrl,
} = require("./orsConfig");
const { isAlternativesLimitError } = require("./orsErrors");
const { uniqueLoopSeeds } = require("./loopSeeds");

test("directions URL uses HeiGIT openrouteservice base", () => {
  assert.match(
    directionsGeoJsonUrl("cycling-regular"),
    /^https:\/\/api\.heigit\.org\/openrouteservice\/v2\/directions\/cycling-regular\/geojson$/,
  );
});

test("pelias geocode URLs use HeiGIT base", () => {
  assert.equal(ORS_SEARCH_URL, "https://api.heigit.org/pelias/v1/search");
  assert.equal(
    ORS_AUTOCOMPLETE_URL,
    "https://api.heigit.org/pelias/v1/autocomplete",
  );
});

test("detects alternatives limit errors from ORS payload", () => {
  assert.equal(
    isAlternativesLimitError({
      response: {
        status: 400,
        data: {
          error: {
            code: 2004,
            message: "Request parameters exceed the server configuration limits. Next request: distance must not be greater than 100000.0.",
          },
        },
      },
    }),
    true,
  );

  assert.equal(
    isAlternativesLimitError({
      error: { code: 2003, message: "Unable to compute alternative routes" },
    }),
    true,
  );

  assert.equal(
    isAlternativesLimitError({
      response: {
        status: 500,
        data: { error: { code: 2000, message: "Unknown internal error" } },
      },
    }),
    false,
  );
});

test("uniqueLoopSeeds returns distinct values of requested size", () => {
  const seeds = uniqueLoopSeeds(3);
  assert.equal(seeds.length, 3);
  assert.equal(new Set(seeds).size, 3);
  for (const seed of seeds) {
    assert.ok(seed >= 0 && seed < 90);
  }
});

test("uniqueLoopSeeds caps at maxExclusive", () => {
  const seeds = uniqueLoopSeeds(100, 5);
  assert.equal(seeds.length, 5);
  assert.equal(new Set(seeds).size, 5);
});
