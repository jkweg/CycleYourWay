const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");

dotenv.config();

const app = express();
const PORT = 5000;
const ORS_API_KEY = process.env.ORS_API_KEY;
const ALLOWED_PROFILES = new Set(["cycling-mountain", "cycling-regular"]);

app.use(cors());
app.use(express.json());

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

app.post("/api/route", async (req, res) => {
  try {
    if (!ORS_API_KEY) {
      console.error("ORS_API_KEY is missing in environment variables.");
      return res.status(500).json({
        error: "Server misconfiguration: missing ORS API key.",
      });
    }

    const { start, end, profile } = req.body || {};

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

    return res.status(200).json(orsResponse.data);
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

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Backend API listening at http://localhost:${PORT}`);
});
