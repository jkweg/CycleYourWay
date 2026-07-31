/**
 * HeiGIT OpenRouteService endpoints.
 * Old host api.openrouteservice.org is deprecated (shut-off 2026-08-24).
 * Override with ORS_DIRECTIONS_BASE / ORS_PELIAS_BASE if needed.
 */

const stripTrailingSlash = (value) => String(value || "").replace(/\/+$/, "");

const ORS_DIRECTIONS_BASE = stripTrailingSlash(
  process.env.ORS_DIRECTIONS_BASE ||
    "https://api.heigit.org/openrouteservice/v2/directions",
);

const ORS_PELIAS_BASE = stripTrailingSlash(
  process.env.ORS_PELIAS_BASE || "https://api.heigit.org/pelias/v1",
);

const directionsGeoJsonUrl = (profile) =>
  `${ORS_DIRECTIONS_BASE}/${profile}/geojson`;

const ORS_SEARCH_URL = `${ORS_PELIAS_BASE}/search`;
const ORS_AUTOCOMPLETE_URL = `${ORS_PELIAS_BASE}/autocomplete`;

module.exports = {
  ORS_DIRECTIONS_BASE,
  ORS_PELIAS_BASE,
  ORS_SEARCH_URL,
  ORS_AUTOCOMPLETE_URL,
  directionsGeoJsonUrl,
};
