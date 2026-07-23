const test = require("node:test");
const assert = require("node:assert/strict");
const {
  expandQueryVariants,
  formatNominatimLabel,
  formatOrsLabel,
  polishCountryLabel,
} = require("./geocode");

test("expands city-first Polish address to street-first variants", () => {
  const variants = expandQueryVariants("Jasło Widokowa 8");
  assert.ok(variants.includes("Jasło Widokowa 8"));
  assert.ok(variants.includes("Widokowa 8, Jasło"));
  assert.ok(variants.includes("Widokowa 8 Jasło"));
});

test("strips English/Polish country suffix from labels", () => {
  assert.equal(
    polishCountryLabel("Widokowa 8, Jasło, Poland"),
    "Widokowa 8, Jasło",
  );
});

test("formats ORS properties into Polish-style label", () => {
  const label = formatOrsLabel({
    street: "Widokowa",
    housenumber: "8",
    locality: "Jasło",
    label: "Widokowa 8, Jasło, Subcarpathian Voivodeship, Poland",
  });
  assert.equal(label, "Widokowa 8, Jasło");
});

test("formats city place with hierarchy instead of bare name", () => {
  const label = formatNominatimLabel({
    type: "city",
    class: "place",
    name: "Jasło",
    address: {
      city: "Jasło",
      county: "jasielski",
      state: "podkarpackie",
      country: "Polska",
    },
    display_name: "Jasło, powiat jasielski, województwo podkarpackie, Polska",
  });
  assert.match(label, /Jasło/);
  assert.match(label, /powiat jasielski|woj\. podkarpackie/);
  assert.notEqual(label, "Jasło");
});

test("formats suburb distinctly from city", () => {
  const label = formatNominatimLabel({
    type: "suburb",
    class: "place",
    address: {
      suburb: "Jasło Niegłowice",
      city: "Jasło",
      county: "jasielski",
      state: "podkarpackie",
    },
    display_name: "Jasło Niegłowice, Jasło, Polska",
  });
  assert.match(label, /Niegłowice/);
});
