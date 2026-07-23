/**
 * Geocoding helpers for Polish addresses.
 * Nominatim (OSM) handles city-first queries better than Pelias/ORS for small PL towns.
 */

const axios = require("axios");

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const ORS_SEARCH_URL = "https://api.openrouteservice.org/geocode/search";
const ORS_AUTOCOMPLETE_URL =
  "https://api.openrouteservice.org/geocode/autocomplete";

const CITY_STREET_NUMBER =
  /^([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ][A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ.'\-\s]{1,40}?)\s+([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ][A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ.'\-\s]{1,60}?)\s+(\d+[A-Za-z]?)$/u;

const CITY_STREET =
  /^([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ][A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ.'\-\s]{1,40}?)\s+([A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ][A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ.'\-\s]{2,60})$/u;

const PLACE_TYPE_LABELS = {
  city: "miasto",
  town: "miasto",
  village: "wieś",
  hamlet: "przysiółek",
  suburb: "osiedle",
  neighbourhood: "osiedle",
  quarter: "dzielnica",
  municipality: "gmina",
  county: "powiat",
  state: "województwo",
  administrative: "jednostka adm.",
};

/** Expand "Jasło Widokowa 8" → also "Widokowa 8, Jasło" (street-first). */
function expandQueryVariants(rawText) {
  const text = String(rawText || "").trim().replace(/\s+/g, " ");
  if (!text) return [];

  const variants = [text];

  const withNumber = text.match(CITY_STREET_NUMBER);
  if (withNumber) {
    const [, city, street, number] = withNumber;
    variants.push(`${street} ${number}, ${city}`);
    variants.push(`${street} ${number} ${city}`);
    variants.push(`${street}, ${city}`);
  } else {
    const withoutNumber = text.match(CITY_STREET);
    if (withoutNumber) {
      const [, city, street] = withoutNumber;
      if (city.length <= 28 && street.length >= 3) {
        variants.push(`${street}, ${city}`);
        variants.push(`${street} ${city}`);
      }
    }
  }

  return [...new Set(variants.map((item) => item.trim()).filter(Boolean))];
}

function polishCountryLabel(label) {
  return String(label || "")
    .replace(/,\s*Republic of Poland\b/gi, "")
    .replace(/,\s*Poland\b/gi, "")
    .replace(/\bPoland\b/gi, "Polska")
    .replace(/,\s*Polska\s*$/i, "")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .replace(/^,\s*|\s*,$/g, "")
    .trim();
}

function cleanAdminName(value) {
  if (!value) return "";
  return String(value)
    .replace(/^powiat\s+/i, "")
    .replace(/^województwo\s+/i, "")
    .replace(/\s+County$/i, "")
    .replace(/\s+Voivodeship$/i, "")
    .trim();
}

function placeTypeLabel(item) {
  const type = item.type || "";
  const osmClass = item.class || "";
  if (PLACE_TYPE_LABELS[type]) return PLACE_TYPE_LABELS[type];
  if (osmClass === "boundary" && type === "administrative") {
    return "jednostka adm.";
  }
  if (osmClass === "place") return "miejscowość";
  return "";
}

/**
 * Build a distinctive Polish label so suggestions are not all "Jasło".
 */
function formatNominatimLabel(item) {
  const address = item.address || {};
  const street =
    address.road ||
    address.pedestrian ||
    address.footway ||
    address.path ||
    address.residential;
  const housenumber = address.house_number;
  const locality =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.hamlet;
  const suburb = address.suburb || address.neighbourhood || address.quarter;
  const county = cleanAdminName(address.county);
  const state = cleanAdminName(address.state);
  const typeLabel = placeTypeLabel(item);

  if (street && housenumber && locality) {
    const parts = [`${street} ${housenumber}`, locality];
    if (county) parts.push(`powiat ${county}`);
    return polishCountryLabel(parts.join(", "));
  }

  if (street && locality) {
    const parts = [street];
    if (suburb && suburb !== locality && suburb !== street) parts.push(suburb);
    parts.push(locality);
    if (county) parts.push(`powiat ${county}`);
    return polishCountryLabel(parts.join(", "));
  }

  // Place / city / suburb results — always add hierarchy so rows differ.
  const primaryName =
    suburb && suburb !== locality
      ? suburb
      : locality ||
        address.municipality ||
        address.city_district ||
        item.name ||
        null;

  if (primaryName) {
    const parts = [];
    if (typeLabel && !street) {
      parts.push(`${primaryName} (${typeLabel})`);
    } else {
      parts.push(primaryName);
    }

    if (
      locality &&
      locality !== primaryName &&
      !String(primaryName).includes(locality)
    ) {
      parts.push(locality);
    }
    if (county && !parts.some((part) => part.includes(county))) {
      parts.push(`powiat ${county}`);
    }
    if (state && !parts.some((part) => part.toLowerCase().includes(state.toLowerCase()))) {
      parts.push(`woj. ${state}`);
    }

    return polishCountryLabel(parts.join(", "));
  }

  // Last resort: first segments of display_name (already localized when accept-language=pl)
  const fromDisplay = polishCountryLabel(item.display_name)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(", ");

  return fromDisplay || polishCountryLabel(item.display_name);
}

function formatOrsLabel(properties = {}) {
  const street = properties.street || null;
  const housenumber = properties.housenumber || null;
  const name = properties.name || null;
  const locality =
    properties.locality ||
    properties.localadmin ||
    properties.county ||
    null;
  const region = properties.region || null;
  const layer = properties.layer || "";

  if (street && housenumber && locality) {
    return polishCountryLabel(`${street} ${housenumber}, ${locality}`);
  }
  if (street && locality) {
    return polishCountryLabel(`${street}, ${locality}`);
  }
  if (name && locality && name !== locality) {
    const parts = [name, locality];
    if (region) parts.push(region);
    return polishCountryLabel(parts.join(", "));
  }
  if (name) {
    const parts = [name];
    if (locality && !String(name).includes(locality)) parts.push(locality);
    if (region) parts.push(region);
    if (layer === "locality" || layer === "localadmin") {
      return polishCountryLabel(`${parts.join(", ")} (miejscowość)`);
    }
    return polishCountryLabel(parts.join(", "));
  }

  return polishCountryLabel(properties.label || "");
}

function normalizeLabelKey(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function resultCoordKey(lat, lon) {
  return `${Number(lat).toFixed(4)},${Number(lon).toFixed(4)}`;
}

function nominatimPriority(item) {
  const type = item.type || "";
  const osmClass = item.class || "";
  if (osmClass === "highway" || osmClass === "building") return 0;
  if (type === "house" || type === "residential") return 1;
  if (type === "city" || type === "town") return 2;
  if (type === "suburb" || type === "neighbourhood" || type === "quarter") return 3;
  if (type === "village" || type === "hamlet") return 4;
  if (osmClass === "place") return 5;
  if (osmClass === "boundary") return 8;
  return 6;
}

async function searchNominatim(text, limit) {
  const response = await axios.get(NOMINATIM_URL, {
    params: {
      q: text,
      format: "json",
      addressdetails: 1,
      countrycodes: "pl",
      limit: Math.min(limit * 2, 12),
      "accept-language": "pl",
    },
    headers: {
      "User-Agent": "CycleYourWay/1.0 (https://github.com/jkweg/CycleYourWay)",
      "Accept-Language": "pl",
    },
    timeout: 12000,
  });

  const rows = Array.isArray(response.data) ? response.data : [];
  return rows
    .map((item) => {
      const lat = Number(item.lat);
      const lon = Number(item.lon);
      const name = formatNominatimLabel(item);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || !name) return null;
      return {
        name,
        lat,
        lon,
        source: "nominatim",
        priority: nominatimPriority(item),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.priority - b.priority);
}

async function searchOrs({ text, limit, apiKey, autocomplete }) {
  const url = autocomplete ? ORS_AUTOCOMPLETE_URL : ORS_SEARCH_URL;
  const response = await axios.get(url, {
    headers: { Authorization: apiKey },
    params: {
      text,
      size: limit,
      "boundary.country": "PL",
      lang: "pl",
    },
    timeout: 12000,
  });

  const features = Array.isArray(response.data?.features)
    ? response.data.features
    : [];

  return features
    .map((feature) => {
      const coords = feature?.geometry?.coordinates;
      const lon = Array.isArray(coords) ? Number(coords[0]) : null;
      const lat = Array.isArray(coords) ? Number(coords[1]) : null;
      const name = formatOrsLabel(feature?.properties || {});
      if (!Number.isFinite(lon) || !Number.isFinite(lat) || !name) return null;
      return { name, lat, lon, source: "ors", priority: 5 };
    })
    .filter(Boolean);
}

function mergeResults(lists, limit) {
  const seenCoords = new Set();
  const seenLabels = new Set();
  const merged = [];

  const flat = lists.flat().filter(Boolean);
  flat.sort((a, b) => (a.priority ?? 5) - (b.priority ?? 5));

  for (const item of flat) {
    const coordKey = resultCoordKey(item.lat, item.lon);
    const labelKey = normalizeLabelKey(item.name);
    if (seenCoords.has(coordKey) || seenLabels.has(labelKey)) continue;
    seenCoords.add(coordKey);
    seenLabels.add(labelKey);
    merged.push({
      name: item.name,
      lat: item.lat,
      lon: item.lon,
    });
    if (merged.length >= limit) break;
  }

  return merged;
}

/**
 * Geocode Polish free-text with query variants + Nominatim (+ ORS fallback).
 */
async function geocodePolishAddress({
  address,
  limit = 6,
  autocomplete = false,
  orsApiKey,
}) {
  const variants = expandQueryVariants(address);
  const primary = variants[0];
  const secondary = variants.find((item) => item !== primary) || null;

  const nominatimSearches = [searchNominatim(primary, limit)];
  if (secondary) {
    nominatimSearches.push(searchNominatim(secondary, limit));
  }

  let nominatimResults = [];
  try {
    const batches = await Promise.allSettled(nominatimSearches);
    nominatimResults = batches
      .filter((batch) => batch.status === "fulfilled")
      .map((batch) => batch.value);
  } catch {
    nominatimResults = [];
  }

  let merged = mergeResults(nominatimResults, limit);
  if (merged.length >= Math.min(3, limit) || !orsApiKey) {
    return merged;
  }

  const orsBatches = [];
  try {
    orsBatches.push(
      await searchOrs({
        text: primary,
        limit,
        apiKey: orsApiKey,
        autocomplete,
      }),
    );
    if (secondary) {
      orsBatches.push(
        await searchOrs({
          text: secondary,
          limit,
          apiKey: orsApiKey,
          autocomplete,
        }),
      );
    }
  } catch (error) {
    if (merged.length === 0) throw error;
  }

  return mergeResults([...nominatimResults, ...orsBatches], limit);
}

/**
 * Reverse-geocode lat/lng to a Polish address label.
 */
async function reverseGeocodePolish({ lat, lng }) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new Error("Invalid coordinates for reverse geocode.");
  }

  const response = await axios.get(NOMINATIM_REVERSE_URL, {
    params: {
      lat: latitude,
      lon: longitude,
      format: "jsonv2",
      addressdetails: 1,
      "accept-language": "pl",
      zoom: 18,
    },
    headers: {
      "User-Agent": "CycleYourWay/1.0 (cycle-route-mvp; contact@local)",
    },
    timeout: 10000,
  });

  const item = response.data;
  if (!item || item.error) {
    return {
      name: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      lat: latitude,
      lon: longitude,
    };
  }

  const label =
    formatNominatimLabel(item) ||
    polishCountryLabel(item.display_name) ||
    `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

  return {
    name: label,
    lat: latitude,
    lon: longitude,
  };
}

module.exports = {
  expandQueryVariants,
  formatNominatimLabel,
  formatOrsLabel,
  geocodePolishAddress,
  reverseGeocodePolish,
  polishCountryLabel,
};
