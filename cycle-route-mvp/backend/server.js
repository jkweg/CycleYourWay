const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const {
  rankFeaturesByPreferences,
  featurePreferenceScore,
} = require("./lib/routeRanking");
const { geocodePolishAddress, reverseGeocodePolish } = require("./lib/geocode");
const { directionsGeoJsonUrl } = require("./lib/orsConfig");
const { isAlternativesLimitError } = require("./lib/orsErrors");
const { uniqueLoopSeeds } = require("./lib/loopSeeds");
const {
  TtlCache,
  buildLoopCacheKey,
  buildRouteCacheKey,
} = require("./lib/orsCache");
const {
  featureDistanceMeters,
  lengthDeviationRatio,
  rankLoopFeatures,
  roundTripPointsForDistanceKm,
} = require("./lib/loopGeometry");
const {
  LOOP_MAX_KM,
  LOOP_MIN_KM,
  ORS_ROUND_TRIP_MAX_KM,
  bearingFromSeed,
  buildEllipseLoopCoordinates,
  waypointCountForDistanceKm,
} = require("./lib/loopWaypoints");
const { withDisplaySimplifiedGeometry } = require("./lib/geoSimplify");
const {
  buildOrsRoutingOptions,
  profilesToTry,
  resolveClimbPreference,
  resolveOrsProfile,
  resolveRideStyle,
} = require("./lib/routePreferences");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const ORS_API_KEY = process.env.ORS_API_KEY;
const orsResponseCache = new TtlCache({ ttlMs: 5 * 60 * 1000, maxSize: 80 });
const ALLOWED_PROFILES = new Set([
  "cycling-mountain",
  "cycling-regular",
  "cycling-road",
]);

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
  // Capacitor Android / iOS WebView
  "capacitor://localhost",
  "https://localhost",
  "http://localhost",
  "ionic://localhost",
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

const getExtraInfo = ({ avoidMainRoads = false, preferAsphalt = false } = {}) => {
  const extras = [...BASE_EXTRA_INFO];
  if (avoidMainRoads) extras.push("waytype");
  if (preferAsphalt && !extras.includes("surface")) extras.push("surface");
  return extras;
};

const optimizeGeoJsonForPreferences = (
  geoJson,
  { avoidMainRoads = false, preferAsphalt = false } = {},
) => {
  if (!geoJson?.features?.length) return geoJson;
  if (!avoidMainRoads && !preferAsphalt) return geoJson;
  return {
    ...geoJson,
    features: rankFeaturesByPreferences(geoJson.features, {
      avoidMainRoads,
      preferAsphalt,
    }),
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

    const {
      start,
      end,
      waypoints,
      profile,
      rideStyle,
      climbPreference,
      preferAsphalt,
      avoidMainRoads,
      includeAlternatives,
    } = req.body || {};

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

    const style = resolveRideStyle(rideStyle);
    const climbs = resolveClimbPreference(climbPreference);
    const wantAsphalt = Boolean(preferAsphalt);
    const wantQuiet = Boolean(avoidMainRoads);

    const requestedProfile = ALLOWED_PROFILES.has(profile)
      ? profile
      : resolveOrsProfile(style);
    const profilesQueue = [
      ...new Set([requestedProfile, ...profilesToTry(style)]),
    ];

    const routeStart = {
      lat: coordinates[0][1],
      lng: coordinates[0][0],
    };
    const routeEnd = {
      lat: coordinates[coordinates.length - 1][1],
      lng: coordinates[coordinates.length - 1][0],
    };
    const straightLineMeters = haversineMeters(routeStart, routeEnd);
    // Fast-first: alternatives only when the client explicitly asks for them.
    const useAlternatives =
      Boolean(includeAlternatives) &&
      coordinates.length === 2 &&
      straightLineMeters <= ALTERNATIVE_ROUTES_MAX_METERS;

    const routingOptions = buildOrsRoutingOptions({ climbPreference: climbs });
    const routeTimeoutMs = Math.min(
      45000,
      Math.max(15000, 10000 + straightLineMeters / 8),
    );

    const routePayload = {
      coordinates,
      elevation: true,
      instructions: true,
      instructions_format: "text",
      language: "pl",
      extra_info: getExtraInfo({
        avoidMainRoads: wantQuiet,
        preferAsphalt: wantAsphalt,
      }),
    };

    if (routingOptions) {
      routePayload.options = routingOptions;
    }

    if (useAlternatives) {
      routePayload.alternative_routes = {
        target_count: 3,
        weight_factor: 1.6,
        share_factor: 0.6,
      };
    }

    const cacheKey = buildRouteCacheKey({
      coordinates,
      profile: requestedProfile,
      rideStyle: style,
      climbPreference: climbs,
      preferAsphalt: wantAsphalt,
      avoidMainRoads: wantQuiet,
      includeAlternatives: useAlternatives,
    });
    const cached = orsResponseCache.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    let orsResponse;
    let lastError;
    let usedProfile = requestedProfile;

    const postDirections = async (profileName, payload) =>
      axios.post(directionsGeoJsonUrl(profileName), payload, {
        headers: {
          Authorization: ORS_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: routeTimeoutMs,
      });

    for (const currentProfile of profilesQueue) {
      try {
        orsResponse = await postDirections(currentProfile, routePayload);
        usedProfile = currentProfile;
        if (currentProfile !== requestedProfile) {
          console.warn(
            `OpenRouteService fallback used: ${requestedProfile} -> ${currentProfile}`,
          );
        }
        break;
      } catch (error) {
        let failure = error;
        lastError = failure;

        if (
          useAlternatives &&
          routePayload.alternative_routes &&
          isAlternativesLimitError(failure)
        ) {
          const singlePayload = { ...routePayload };
          delete singlePayload.alternative_routes;
          try {
            orsResponse = await postDirections(currentProfile, singlePayload);
            usedProfile = currentProfile;
            console.warn(
              `OpenRouteService alternatives rejected; retried single route on ${currentProfile}`,
            );
            break;
          } catch (retryError) {
            failure = retryError;
            lastError = retryError;
          }
        }

        const status = failure.response?.status;
        const detailsText = JSON.stringify(failure.response?.data || "");
        const canFallback =
          status === 403 ||
          /disallow/i.test(detailsText) ||
          status === 404;

        if (!canFallback) {
          throw failure;
        }

        console.warn(
          `${currentProfile} failed (${status}), trying next cycling profile`,
        );
      }
    }

    if (!orsResponse) {
      throw lastError || new Error("No response from OpenRouteService");
    }

    const responseData = optimizeGeoJsonForPreferences(orsResponse.data, {
      avoidMainRoads: wantQuiet,
      preferAsphalt: wantAsphalt,
    });

    if (responseData?.features?.[0]?.properties) {
      responseData.features[0].properties.cyw_prefs = {
        rideStyle: style,
        climbPreference: climbs,
        preferAsphalt: wantAsphalt,
        avoidMainRoads: wantQuiet,
        orsProfile: usedProfile,
        includeAlternatives: useAlternatives,
      };
    }

    if (Array.isArray(responseData?.features)) {
      responseData.features = responseData.features.map((feature) =>
        withDisplaySimplifiedGeometry(feature),
      );
    }

    orsResponseCache.set(cacheKey, responseData);
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
  const startedAt = Date.now();
  try {
    if (!ORS_API_KEY) {
      console.error("ORS_API_KEY is missing in environment variables.");
      return res.status(500).json({
        error: "Server misconfiguration: missing ORS API key.",
      });
    }

    const {
      start,
      distance,
      avoidMainRoads,
      rideStyle,
      climbPreference,
      preferAsphalt,
    } = req.body || {};
    const distanceKm = Number(distance);

    if (
      !isValidPoint(start) ||
      !Number.isFinite(distanceKm) ||
      distanceKm < LOOP_MIN_KM ||
      distanceKm > LOOP_MAX_KM
    ) {
      return res.status(400).json({
        error: `Invalid payload. Expected: { start: { lat, lng }, distance: ${LOOP_MIN_KM}-${LOOP_MAX_KM} km }`,
      });
    }

    const style = resolveRideStyle(rideStyle);
    const climbs = resolveClimbPreference(climbPreference);
    const wantAsphalt = Boolean(preferAsphalt);
    const wantQuiet = Boolean(avoidMainRoads);
    const profileQueue = profilesToTry(style);
    const loopLengthMeters = Math.round(distanceKm * 1000);
    const roundTripPoints = roundTripPointsForDistanceKm(distanceKm);
    const extraInfo = getExtraInfo({
      avoidMainRoads: wantQuiet,
      preferAsphalt: wantAsphalt,
    });
    const preferenceOptions = buildOrsRoutingOptions({
      climbPreference: climbs,
    });
    const loopTimeoutMs = Math.min(
      60000,
      Math.max(20000, 12000 + loopLengthMeters / 5),
    );
    const useWaypointLoop = distanceKm > ORS_ROUND_TRIP_MAX_KM;

    const postDirectionsPayload = async (profileName, routePayload) =>
      axios.post(directionsGeoJsonUrl(profileName), routePayload, {
        headers: {
          Authorization: ORS_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: loopTimeoutMs,
      });

    const requestNativeLoop = async (seed, profileName, points) => {
      const cacheKey = buildLoopCacheKey({
        start,
        distanceKm,
        rideStyle: style,
        climbPreference: climbs,
        preferAsphalt: wantAsphalt,
        avoidMainRoads: wantQuiet,
        seed,
        points,
      });
      const cachedFeature = orsResponseCache.get(cacheKey);
      if (cachedFeature) return cachedFeature;

      const routePayload = {
        coordinates: [[start.lng, start.lat]],
        options: {
          round_trip: {
            length: loopLengthMeters,
            points,
            seed,
          },
          ...(preferenceOptions?.profile_params
            ? { profile_params: preferenceOptions.profile_params }
            : {}),
        },
        elevation: true,
        instructions: true,
        instructions_format: "text",
        language: "pl",
        extra_info: extraInfo,
      };

      const orsResponse = await postDirectionsPayload(profileName, routePayload);
      const feature = orsResponse.data?.features?.[0] || null;
      if (feature) orsResponseCache.set(cacheKey, feature);
      return feature;
    };

    const requestWaypointLoop = async (seed, profileName, radiusScale = 1) => {
      const points = waypointCountForDistanceKm(distanceKm);

      const fetchOnce = async (scale) => {
        const cacheKey = buildLoopCacheKey({
          start,
          distanceKm,
          rideStyle: style,
          climbPreference: climbs,
          preferAsphalt: wantAsphalt,
          avoidMainRoads: wantQuiet,
          seed: `wp:${seed}:${scale.toFixed(2)}`,
          points,
        });
        const cachedFeature = orsResponseCache.get(cacheKey);
        if (cachedFeature) return cachedFeature;

        const coordinates = buildEllipseLoopCoordinates(start, {
          lengthMeters: loopLengthMeters,
          bearingDeg: bearingFromSeed(seed),
          waypointCount: points,
          radiusScale: scale,
        });

        const routePayload = {
          coordinates,
          elevation: true,
          instructions: true,
          instructions_format: "text",
          language: "pl",
          extra_info: extraInfo,
        };
        if (preferenceOptions) {
          routePayload.options = preferenceOptions;
        }

        const orsResponse = await postDirectionsPayload(
          profileName,
          routePayload,
        );
        const feature = orsResponse.data?.features?.[0] || null;
        if (feature) orsResponseCache.set(cacheKey, feature);
        return feature;
      };

      let feature = await fetchOnce(radiusScale);
      if (!feature) return null;

      const actual = featureDistanceMeters(feature);
      const deviation = lengthDeviationRatio(actual, loopLengthMeters);
      if (Number.isFinite(actual) && deviation > 0.12) {
        const nextScale = Math.max(
          0.55,
          Math.min(1.55, radiusScale * (loopLengthMeters / actual)),
        );
        if (Math.abs(nextScale - radiusScale) > 0.04) {
          const corrected = await fetchOnce(nextScale);
          if (corrected) feature = corrected;
        }
      }

      return feature;
    };

    const requestLoopWithFallback = async (seed, pointsOrScale) => {
      let lastError;
      for (const profileName of profileQueue) {
        try {
          const feature = useWaypointLoop
            ? await requestWaypointLoop(seed, profileName, pointsOrScale ?? 1)
            : await requestNativeLoop(
                seed,
                profileName,
                pointsOrScale ?? roundTripPoints,
              );
          if (feature) return feature;
        } catch (error) {
          lastError = error;
          const status = error.response?.status;
          const detailsText = JSON.stringify(error.response?.data || "");
          if (
            status !== 403 &&
            status !== 404 &&
            !/disallow/i.test(detailsText)
          ) {
            throw error;
          }
        }
      }
      if (lastError) throw lastError;
      return null;
    };

    const pickBestFeature = (candidates) => {
      const ranked = rankLoopFeatures(candidates, {
        targetMeters: loopLengthMeters,
        avoidMainRoads: wantQuiet,
        preferAsphalt: wantAsphalt,
        preferenceScore: featurePreferenceScore,
      });
      return ranked[0] || null;
    };

    let bestFeature;
    let orsCallsEstimate = 0;

    if (useWaypointLoop) {
      const seedCount = wantQuiet || wantAsphalt ? 3 : 2;
      const seeds = uniqueLoopSeeds(seedCount);
      orsCallsEstimate = seeds.length;
      const candidates = (
        await Promise.all(seeds.map((seed) => requestLoopWithFallback(seed, 1)))
      ).filter(Boolean);

      if (candidates.length === 0) {
        throw new Error("No loop route candidates returned by OpenRouteService.");
      }
      bestFeature = pickBestFeature(candidates);
    } else if (wantQuiet || wantAsphalt) {
      const seeds = uniqueLoopSeeds(3);
      orsCallsEstimate = seeds.length;
      let candidates = (
        await Promise.all(
          seeds.map((seed) => requestLoopWithFallback(seed, roundTripPoints)),
        )
      ).filter(Boolean);

      if (candidates.length === 0) {
        throw new Error("No loop route candidates returned by OpenRouteService.");
      }

      bestFeature = pickBestFeature(candidates);
      const bestDeviation = lengthDeviationRatio(
        featureDistanceMeters(bestFeature),
        loopLengthMeters,
      );

      if (bestDeviation > 0.12 && roundTripPoints < 5) {
        const extraSeed = uniqueLoopSeeds(1)[0];
        orsCallsEstimate += 1;
        const extra = await requestLoopWithFallback(
          extraSeed,
          Math.min(5, roundTripPoints + 1),
        );
        if (extra) {
          candidates = [...candidates, extra];
          bestFeature = pickBestFeature(candidates);
        }
      }
    } else {
      orsCallsEstimate = 1;
      const primarySeed = Math.floor(Math.random() * 90);
      bestFeature = await requestLoopWithFallback(primarySeed, roundTripPoints);
      const deviation = lengthDeviationRatio(
        featureDistanceMeters(bestFeature),
        loopLengthMeters,
      );
      if (deviation > 0.12) {
        orsCallsEstimate += 1;
        const retrySeed = (primarySeed + 17) % 90;
        const retryPoints = Math.min(5, roundTripPoints + 1);
        const retryFeature = await requestLoopWithFallback(
          retrySeed,
          retryPoints,
        );
        if (retryFeature) {
          bestFeature = pickBestFeature(
            [bestFeature, retryFeature].filter(Boolean),
          );
        }
      }
    }

    if (!bestFeature) {
      throw new Error("No loop route returned by OpenRouteService.");
    }

    if (bestFeature.properties) {
      bestFeature.properties.cyw_prefs = {
        rideStyle: style,
        climbPreference: climbs,
        preferAsphalt: wantAsphalt,
        avoidMainRoads: wantQuiet,
        roundTripPoints: useWaypointLoop
          ? waypointCountForDistanceKm(distanceKm)
          : roundTripPoints,
        loopMode: useWaypointLoop ? "waypoint-ellipse" : "ors-round-trip",
        lengthDeviation: lengthDeviationRatio(
          featureDistanceMeters(bestFeature),
          loopLengthMeters,
        ),
      };
    }

    bestFeature = withDisplaySimplifiedGeometry(bestFeature);

    console.info("[loop]", {
      distanceKm,
      mode: useWaypointLoop ? "waypoint-ellipse" : "ors-round-trip",
      ms: Date.now() - startedAt,
      candidatesHint: orsCallsEstimate,
      lengthDeviation: bestFeature?.properties?.cyw_prefs?.lengthDeviation,
    });

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
      ms: Date.now() - startedAt,
    });
    return res.status(status).json({
      error:
        status === 400
          ? friendlyOrsError(apiData)
          : "Failed to generate loop route.",
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
