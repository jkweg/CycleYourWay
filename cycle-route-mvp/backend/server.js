const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
// Modules below read environment settings during import.
dotenv.config();
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const { directionsBudget, persistentQuota } = require("./lib/providerBudget");
const { runWithActor } = require("./lib/persistentQuota");
const { createActorResolver } = require("./lib/requestActor");
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

const app = express();
// Proxies in front of the app (production on Render: 3); trust exactly that many hops so
// req.ip is the client (rate limits and guest quotas) and cannot be spoofed.
app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS ?? 1));
const PORT = Number(process.env.PORT) || 5000;
const ORS_API_KEY = process.env.ORS_API_KEY;
const orsResponseCache = new TtlCache({ ttlMs: 5 * 60 * 1000, maxSize: 80 });
const ALLOWED_PROFILES = new Set([
  "cycling-mountain",
  "cycling-regular",
  "cycling-road",
]);

if (!persistentQuota.enabled) {
  console.warn(
    "[startup] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing — shared daily provider quota is OFF (in-memory limits only).",
  );
}

if (!ORS_API_KEY) {
  console.warn(
    "[startup] ORS_API_KEY is missing — /api/geocode, /api/route and /api/loop will return 500 until it is set.",
  );
}

// Defaults apply only when ALLOWED_ORIGINS is absent. Preview URLs must be explicit.
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://cycleyourway.pl",
  "https://www.cycleyourway.pl",
  // Capacitor Android / iOS WebView
  "capacitor://localhost",
  "https://localhost",
  "http://localhost",
  "ionic://localhost",
];

const allowedOrigins = new Set((process.env.ALLOWED_ORIGINS === undefined
  ? DEFAULT_ALLOWED_ORIGINS
  : process.env.ALLOWED_ORIGINS.split(","))
  .map((origin) => origin.trim())
  .filter(Boolean));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
      } else {
        callback(Object.assign(new Error("Origin not allowed"), { status: 403 }));
      }
    },
  }),
);
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    ok: true,
    orsConfigured: Boolean(ORS_API_KEY),
    quotaConfigured: persistentQuota.enabled,
  });
});

// Uptime-monitor target: 503 when today's global provider usage crosses
// QUOTA_ALERT_PERCENT (default 80) or a kill switch is on. Percentages only.
const QUOTA_ALERT_PERCENT = Number(process.env.QUOTA_ALERT_PERCENT) || 80;
app.get("/api/health/quota", async (_req, res) => {
  try {
    const status = await persistentQuota.status(QUOTA_ALERT_PERCENT);
    res.status(status.ok ? 200 : 503).json(status);
  } catch (error) {
    console.error("[quota] status check failed:", error.message);
    res.status(503).json({ ok: false, reason: "quota_unreachable" });
  }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Zbyt wiele zapytań. Spróbuj ponownie za chwilę." },
  skip: (req) => req.path === "/health" || req.path === "/api/health",
});

app.use("/api/", apiLimiter);

const resolveActor = createActorResolver({
  supabaseUrl: process.env.SUPABASE_URL,
  apiKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
});
let proxyHopsLogged = false;

app.use("/api/", async (req, _res, next) => {
  if (!proxyHopsLogged) {
    // One-off deployment check for TRUST_PROXY_HOPS; logs a count, not addresses.
    proxyHopsLogged = true;
    const hops = String(req.get("x-forwarded-for") || "").split(",").filter(Boolean).length;
    console.log(`[startup] first request: x-forwarded-for entries=${hops}, TRUST_PROXY_HOPS=${app.get("trust proxy")}`);
  }
  const actor = await resolveActor(req);
  runWithActor(actor, next);
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

const BUDGET_MESSAGES = {
  guest: "Dzienny limit wyszukiwań na tym urządzeniu został wykorzystany. Zaloguj się, aby korzystać dalej, lub spróbuj jutro.",
  user: "Dzienny limit wyszukiwań dla Twojego konta został wykorzystany. Spróbuj ponownie jutro.",
  disabled: "Wyznaczanie tras jest chwilowo wyłączone. Spróbuj ponownie później.",
  unavailable: "Usługa mapowa jest chwilowo niedostępna. Spróbuj ponownie za minutę.",
};

const sendBudgetError = (error, res) => {
  if (!["PROVIDER_BUDGET_EXCEEDED", "PROVIDER_DISABLED", "PROVIDER_QUOTA_UNAVAILABLE"].includes(error.code)) {
    return false;
  }
  res.set("Retry-After", String(error.retryAfter)).status(error.response?.status || 429).json({
    error: BUDGET_MESSAGES[error.quotaScope] ||
      "Limit usługi mapowej został osiągnięty. Spróbuj ponownie później.",
    code: error.code,
  });
  return true;
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
    if (sendBudgetError(error, res)) return;
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

    if (!isValidPoint({ lat, lng }) || !String(req.query.lat ?? "").trim() ||
        !String(req.query.lng ?? req.query.lon ?? "").trim()) {
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
      directionsBudget.runWithRetry(() => axios.post(directionsGeoJsonUrl(profileName), payload, {
        headers: {
          Authorization: ORS_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: routeTimeoutMs,
      }));

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
    if (sendBudgetError(error, res)) return;
    const status = error.response?.status || 500;
    const apiData = error.response?.data;

    console.error("Error while fetching route from OpenRouteService:", {
      message: error.message,
      status,
      details: apiData || null,
    });

    if (status === 401 || status === 403) {
      return res.status(503).json({
        code: "ROUTING_UNAVAILABLE",
        error: "Usługa tras rowerowych jest chwilowo niedostępna. Spróbuj ponownie później.",
      });
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
      directionsBudget.runWithRetry(() => axios.post(directionsGeoJsonUrl(profileName), routePayload, {
        headers: {
          Authorization: ORS_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: loopTimeoutMs,
      }));

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
    if (sendBudgetError(error, res)) return;
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

app.use((error, _req, res, _next) => {
  const status = [400, 403, 413, 415].includes(error.status) ? error.status : 500;
  res.status(status).json({
    error: status === 413 ? "Żądanie jest zbyt duże."
      : status === 403 ? "Ten adres aplikacji nie jest dozwolony."
      : status === 400 ? "Nieprawidłowe dane żądania."
      : status === 415 ? "Nieobsługiwany format danych."
      : "Wystąpił błąd serwera. Spróbuj ponownie później.",
  });
});

if (require.main === module) app.listen(PORT, () => {
  console.log(`Backend API listening at http://localhost:${PORT}`);
  console.log("ORS proxy only (geocode, route, loop). Auth + trasy: Supabase.");
});

module.exports = app;
