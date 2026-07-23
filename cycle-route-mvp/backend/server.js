const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const {
  rankFeaturesByMainRoadShare,
} = require("./lib/routeRanking");
const { geocodePolishAddress, reverseGeocodePolish } = require("./lib/geocode");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const ORS_API_KEY = process.env.ORS_API_KEY;
const ALLOWED_PROFILES = new Set(["cycling-mountain", "cycling-regular"]);

if (!ORS_API_KEY) {
  console.warn(
    "[startup] ORS_API_KEY is missing — /api/geocode, /api/route and /api/loop will return 500 until it is set.",
  );
}

// Originy zawsze dozwolone (lokalny dev + dowolny deploy Vercela, w tym preview).
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://*.vercel.app",
];

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
app.use(express.json({ limit: "32kb" }));

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Zbyt wiele zapytań. Spróbuj ponownie za chwilę." },
});

app.use("/api/", apiLimiter);

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

const haversineMeters = (a, b) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.min(1, Math.sqrt(h)));
};

// ORS: alternatywne trasy są dozwolone tylko do 100 km. Powyżej liczymy
// pojedynczą trasę, żeby długie przejazdy nadal działały.
const ALTERNATIVE_ROUTES_MAX_METERS = 95000;

const friendlyOrsError = (apiData) => {
  const code = apiData?.error?.code;
  const message = apiData?.error?.message || "";
  if (code === 2004 || /must not be greater/i.test(message)) {
    return "Trasa jest zbyt długa dla tego trybu. Wybierz bliższe punkty.";
  }
  if (code === 2010 || /Could not find routable/i.test(message)) {
    return "Nie znaleziono drogi w pobliżu wybranego punktu. Przesuń punkt bliżej drogi.";
  }
  return "Nie udało się wyznaczyć trasy. Spróbuj ponownie lub zmień punkty.";
};

// ORS waytype: 1 = state_road, 2 = road (traktujemy jako drogi główne)
const BASE_EXTRA_INFO = ["surface", "steepness"];

const getExtraInfo = (avoidMainRoads) =>
  avoidMainRoads ? [...BASE_EXTRA_INFO, "waytype"] : BASE_EXTRA_INFO;

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

app.get("/api/geocode", async (req, res) => {
  try {
    const address = String(req.query.address || "").trim();
    if (!address) {
      return res
        .status(400)
        .json({ error: "Missing required query param: address" });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 5, 1), 10);
    const useAutocomplete = req.query.autocomplete === "true";

    const results = await geocodePolishAddress({
      address,
      limit,
      autocomplete: useAutocomplete,
      orsApiKey: ORS_API_KEY,
    });

    return res.status(200).json({ results });
  } catch (error) {
    const status = error.response?.status || 500;
    const apiData = error.response?.data || null;
    console.error("Error while geocoding address:", {
      message: error.message,
      status,
      details: apiData,
    });
    return res.status(status).json({
      error: "Failed to geocode address.",
    });
  }
});

app.get("/api/reverse", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng ?? req.query.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({
        error: "Missing or invalid query params: lat, lng",
      });
    }

    const result = await reverseGeocodePolish({ lat, lng });
    return res.status(200).json({ result });
  } catch (error) {
    const status = error.response?.status || 500;
    console.error("Error while reverse geocoding:", {
      message: error.message,
      status,
      details: error.response?.data || null,
    });
    return res.status(status).json({
      error: "Failed to reverse geocode coordinates.",
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

    const { start, end, waypoints, profile, avoidMainRoads } = req.body || {};

    let coordinates;
    if (Array.isArray(waypoints) && waypoints.length >= 2) {
      if (waypoints.length > 50) {
        return res.status(400).json({
          error: "Too many waypoints. Maximum is 50.",
        });
      }
      if (!waypoints.every(isValidPoint)) {
        return res.status(400).json({
          error:
            "Invalid waypoints. Expected: { waypoints: [{ lat, lng }, ...] }",
        });
      }
      coordinates = waypoints.map((point) => [point.lng, point.lat]);
    } else if (isValidPoint(start) && isValidPoint(end)) {
      coordinates = [
        [start.lng, start.lat],
        [end.lng, end.lat],
      ];
    } else {
      return res.status(400).json({
        error:
          "Invalid payload. Expected: { start, end } or { waypoints: [{ lat, lng }, ...] }",
      });
    }

    const requestedProfile = ALLOWED_PROFILES.has(profile)
      ? profile
      : "cycling-mountain";
    const profilesToTry =
      requestedProfile === "cycling-mountain"
        ? ["cycling-mountain", "cycling-regular"]
        : [requestedProfile];

    const routeStart = {
      lat: coordinates[0][1],
      lng: coordinates[0][0],
    };
    const routeEnd = {
      lat: coordinates[coordinates.length - 1][1],
      lng: coordinates[coordinates.length - 1][0],
    };
    const straightLineMeters = haversineMeters(routeStart, routeEnd);
    const useAlternatives =
      coordinates.length === 2 &&
      straightLineMeters <= ALTERNATIVE_ROUTES_MAX_METERS;

    const routePayload = {
      coordinates,
      elevation: true,
      instructions: true,
      instructions_format: "text",
      language: "pl",
      extra_info: getExtraInfo(Boolean(avoidMainRoads)),
    };

    if (useAlternatives) {
      routePayload.alternative_routes = {
        target_count: 3,
        weight_factor: 1.6,
        share_factor: 0.6,
      };
    }

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
        const body = req.body || {};
        const fallbackStart = Array.isArray(body.waypoints) && body.waypoints[0]
          ? body.waypoints[0]
          : body.start;
        const fallbackEnd =
          Array.isArray(body.waypoints) && body.waypoints.length >= 2
            ? body.waypoints[body.waypoints.length - 1]
            : body.end;
        const osrmGeoJson = await getRouteFromOsrm(fallbackStart, fallbackEnd);
        console.warn("Using OSRM fallback because ORS access was denied.");
        return res.status(200).json(osrmGeoJson);
      } catch (osrmError) {
        console.error("OSRM fallback failed:", osrmError.message);
      }
    }

    return res.status(status).json({
      error: friendlyOrsError(apiData),
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
