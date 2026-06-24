const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const ORS_API_KEY = process.env.ORS_API_KEY;
const ALLOWED_PROFILES = new Set(["cycling-mountain", "cycling-regular"]);

// Originy zawsze dozwolone (lokalny dev + dowolny deploy Vercela, w tym preview).
// Dzięki temu nie trzeba ręcznie aktualizować listy po każdym deployu.
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://*.vercel.app",
];

// Dozwolone originy. Wpisy mogą zawierać wildcard "*", np. https://*.vercel.app
const allowedOriginPatterns = [
  ...DEFAULT_ALLOWED_ORIGINS,
  ...(process.env.ALLOWED_ORIGINS || "").split(","),
]
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((pattern) => {
    if (!pattern.includes("*")) return pattern;
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*");
    return new RegExp(`^${escaped}$`);
  });

const isOriginAllowed = (origin) =>
  allowedOriginPatterns.some((pattern) =>
    pattern instanceof RegExp ? pattern.test(origin) : pattern === origin,
  );

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`));
      }
    },
  }),
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    orsConfigured: Boolean(ORS_API_KEY),
  });
});

const isValidPoint = (point) => {
  if (!point || typeof point !== "object") return false;
  const { lat, lng } = point;
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

// ORS waytype: 1 = state_road, 2 = road (traktujemy jako drogi główne)
const MAIN_ROAD_WAYTYPES = new Set([1, 2]);

const BASE_EXTRA_INFO = ["surface", "steepness"];

const getExtraInfo = (avoidMainRoads) =>
  avoidMainRoads ? [...BASE_EXTRA_INFO, "waytype"] : BASE_EXTRA_INFO;

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

const optimizeGeoJsonForMainRoads = (geoJson) => {
  if (!geoJson?.features?.length) return geoJson;
  return {
    ...geoJson,
    features: rankFeaturesByMainRoadShare(geoJson.features),
  };
};

const getRouteFromOsrm = async (start, end) => {
  const osrmUrl = `https://router.project-osrm.org/route/v1/bicycle/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
  const osrmResponse = await axios.get(osrmUrl, { timeout: 15000 });
  const route = osrmResponse.data?.routes?.[0];

  if (!route?.geometry) {
    throw new Error("OSRM did not return a valid route geometry.");
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          source: "osrm",
          summary: route.legs?.[0]?.summary || "",
          distance: route.distance,
          duration: route.duration,
        },
        geometry: route.geometry,
      },
    ],
  };
};

const mapGeocodeFeatures = (features) =>
  features
    .map((feature) => {
      const coords = feature?.geometry?.coordinates;
      const lon = Array.isArray(coords) ? coords[0] : null;
      const lat = Array.isArray(coords) ? coords[1] : null;
      const name =
        feature?.properties?.label ||
        feature?.properties?.name ||
        feature?.properties?.locality ||
        "";

      if (!Number.isFinite(lon) || !Number.isFinite(lat) || !name) return null;
      return { name, lon, lat };
    })
    .filter(Boolean);

app.get("/api/geocode", async (req, res) => {
  try {
    if (!ORS_API_KEY) {
      console.error("ORS_API_KEY is missing in environment variables.");
      return res.status(500).json({
        error: "Server misconfiguration: missing ORS API key.",
      });
    }

    const address = String(req.query.address || "").trim();
    if (!address) {
      return res
        .status(400)
        .json({ error: "Missing required query param: address" });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 10);
    const useAutocomplete = req.query.autocomplete === "true";

    const url = "https://api.openrouteservice.org/geocode/search";
    const orsResponse = await axios.get(url, {
      headers: { Authorization: ORS_API_KEY },
      params: {
        text: address,
        size: limit,
        ...(useAutocomplete ? { autocomplete: true } : {}),
        "boundary.country": "POL",
      },
      timeout: 15000,
    });

    const features = Array.isArray(orsResponse.data?.features)
      ? orsResponse.data.features
      : [];

    const results = mapGeocodeFeatures(features);

    return res.status(200).json({ results });
  } catch (error) {
    const status = error.response?.status || 500;
    const apiData = error.response?.data || null;
    console.error("Error while geocoding via OpenRouteService:", {
      message: error.message,
      status,
      details: apiData,
    });
    return res.status(status).json({
      error: "Failed to geocode address.",
      details: apiData || error.message,
    });
  }
});

app.post("/api/route", async (req, res) => {
  try {
    if (!ORS_API_KEY) {
      console.error("ORS_API_KEY is missing in environment variables.");
      return res.status(500).json({
        error: "Server misconfiguration: missing ORS API key.",
      });
    }

    const { start, end, profile, avoidMainRoads } = req.body || {};

    if (!isValidPoint(start) || !isValidPoint(end)) {
      return res.status(400).json({
        error:
          "Invalid payload. Expected: { start: { lat, lng }, end: { lat, lng } }",
      });
    }

    const requestedProfile = ALLOWED_PROFILES.has(profile)
      ? profile
      : "cycling-mountain";
    const profilesToTry =
      requestedProfile === "cycling-mountain"
        ? ["cycling-mountain", "cycling-regular"]
        : [requestedProfile];

    const routePayload = {
      coordinates: [
        [start.lng, start.lat],
        [end.lng, end.lat],
      ],
      elevation: true,
      instructions: true,
      instructions_format: "text",
      language: "pl",
      extra_info: getExtraInfo(Boolean(avoidMainRoads)),
      alternative_routes: {
        target_count: 3,
        weight_factor: 1.6,
        share_factor: 0.6,
      },
    };

    let orsResponse;
    let lastError;

    for (const currentProfile of profilesToTry) {
      const orsUrl = `https://api.openrouteservice.org/v2/directions/${currentProfile}/geojson`;

      try {
        orsResponse = await axios.post(orsUrl, routePayload, {
          headers: {
            Authorization: ORS_API_KEY,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        });
        if (currentProfile !== requestedProfile) {
          console.warn(
            `OpenRouteService fallback used: ${requestedProfile} -> ${currentProfile}`
          );
        }
        break;
      } catch (error) {
        lastError = error;
        const status = error.response?.status;
        const detailsText = JSON.stringify(error.response?.data || "");
        const canFallback =
          currentProfile === "cycling-mountain" &&
          (status === 403 || /disallow/i.test(detailsText));

        if (!canFallback) {
          throw error;
        }

        console.warn(
          "cycling-mountain not allowed for this key, retrying with cycling-regular"
        );
      }
    }

    if (!orsResponse) {
      throw lastError || new Error("No response from OpenRouteService");
    }

    const responseData = avoidMainRoads
      ? optimizeGeoJsonForMainRoads(orsResponse.data)
      : orsResponse.data;

    return res.status(200).json(responseData);
  } catch (error) {
    const status = error.response?.status || 500;
    const apiData = error.response?.data;
    const detailsText = JSON.stringify(apiData || "");
    const shouldFallbackToOsrm =
      status === 403 || /disallow/i.test(detailsText);

    console.error("Error while fetching route from OpenRouteService:", {
      message: error.message,
      status,
      details: apiData || null,
    });

    if (shouldFallbackToOsrm) {
      try {
        const { start, end } = req.body || {};
        const osrmGeoJson = await getRouteFromOsrm(start, end);
        console.warn("Using OSRM fallback because ORS access was denied.");
        return res.status(200).json(osrmGeoJson);
      } catch (osrmError) {
        console.error("OSRM fallback failed:", osrmError.message);
      }
    }

    return res.status(status).json({
      error: "Failed to fetch route from routing provider.",
      details: apiData || error.message,
    });
  }
});

app.post("/api/loop", async (req, res) => {
  try {
    if (!ORS_API_KEY) {
      console.error("ORS_API_KEY is missing in environment variables.");
      return res.status(500).json({
        error: "Server misconfiguration: missing ORS API key.",
      });
    }

    const { start, distance, avoidMainRoads } = req.body || {};
    const distanceKm = Number(distance);

    if (!isValidPoint(start) || !Number.isFinite(distanceKm) || distanceKm <= 0) {
      return res.status(400).json({
        error:
          "Invalid payload. Expected: { start: { lat, lng }, distance: number_in_km }",
      });
    }

    const orsUrl =
      "https://api.openrouteservice.org/v2/directions/cycling-mountain/geojson";
    const loopLengthMeters = Math.round(distanceKm * 1000);
    const extraInfo = getExtraInfo(Boolean(avoidMainRoads));

    const requestLoop = async (seed) => {
      const routePayload = {
        coordinates: [[start.lng, start.lat]],
        options: {
          round_trip: {
            length: loopLengthMeters,
            points: 3,
            seed,
          },
        },
        elevation: true,
        instructions: true,
        instructions_format: "text",
        language: "pl",
        extra_info: extraInfo,
      };

      const orsResponse = await axios.post(orsUrl, routePayload, {
        headers: {
          Authorization: ORS_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      });

      return orsResponse.data?.features?.[0] || null;
    };

    let bestFeature;
    if (avoidMainRoads) {
      const seeds = Array.from({ length: 5 }, () => Math.floor(Math.random() * 90));
      const candidates = (
        await Promise.all(seeds.map((seed) => requestLoop(seed)))
      ).filter(Boolean);

      if (candidates.length === 0) {
        throw new Error("No loop route candidates returned by OpenRouteService.");
      }

      const rankedCandidates = rankFeaturesByMainRoadShare(candidates);
      bestFeature = rankedCandidates[0];
    } else {
      bestFeature = await requestLoop(Math.floor(Math.random() * 90));
    }

    if (!bestFeature) {
      throw new Error("No loop route returned by OpenRouteService.");
    }

    return res.status(200).json({
      type: "FeatureCollection",
      features: [bestFeature],
    });
  } catch (error) {
    const status = error.response?.status || 500;
    const apiData = error.response?.data || null;
    console.error("Error while generating round trip via OpenRouteService:", {
      message: error.message,
      status,
      details: apiData,
    });
    return res.status(status).json({
      error: "Failed to generate loop route.",
      details: apiData || error.message,
    });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Backend API listening at http://localhost:${PORT}`);
  console.log("ORS proxy only (geocode, route, loop). Auth + trasy: Supabase.");
});
