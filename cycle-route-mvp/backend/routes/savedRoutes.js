const express = require("express");
const db = require("../db");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

router.get("/", (req, res) => {
  try {
    const rows = db
      .prepare(
        `SELECT id, name, mode, geojson, distance_km, duration_seconds, created_at
         FROM saved_routes
         WHERE user_id = ?
         ORDER BY created_at DESC`
      )
      .all(req.user.id);

    const routes = rows.map((row) => ({
      id: row.id,
      name: row.name,
      mode: row.mode,
      geojson: JSON.parse(row.geojson),
      distanceKm: row.distance_km,
      durationSeconds: row.duration_seconds,
      createdAt: row.created_at,
    }));

    return res.status(200).json({ routes });
  } catch (error) {
    console.error("List saved routes error:", error);
    return res.status(500).json({ error: "Nie udało się pobrać zapisanych tras." });
  }
});

router.post("/", (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const mode = String(req.body?.mode || "").trim();
    const geojson = req.body?.geojson;

    if (!name) {
      return res.status(400).json({ error: "Podaj nazwę trasy." });
    }
    if (!["AtoB", "Loop"].includes(mode)) {
      return res.status(400).json({ error: "Nieprawidłowy tryb trasy." });
    }
    if (!geojson || !Array.isArray(geojson.features) || geojson.features.length === 0) {
      return res.status(400).json({ error: "Brak danych trasy do zapisania." });
    }

    const feature = geojson.features[0];
    const summary = feature?.properties?.summary;
    const distanceMeters =
      typeof summary?.distance === "number"
        ? summary.distance
        : typeof feature?.properties?.distance === "number"
          ? feature.properties.distance
          : null;
    const durationSeconds =
      typeof summary?.duration === "number"
        ? summary.duration
        : typeof feature?.properties?.duration === "number"
          ? feature.properties.duration
          : null;

    const result = db
      .prepare(
        `INSERT INTO saved_routes (user_id, name, mode, geojson, distance_km, duration_seconds)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.user.id,
        name,
        mode,
        JSON.stringify(geojson),
        distanceMeters !== null ? distanceMeters / 1000 : null,
        durationSeconds
      );

    const saved = db
      .prepare(
        `SELECT id, name, mode, geojson, distance_km, duration_seconds, created_at
         FROM saved_routes WHERE id = ? AND user_id = ?`
      )
      .get(result.lastInsertRowid, req.user.id);

    return res.status(201).json({
      route: {
        id: saved.id,
        name: saved.name,
        mode: saved.mode,
        geojson: JSON.parse(saved.geojson),
        distanceKm: saved.distance_km,
        durationSeconds: saved.duration_seconds,
        createdAt: saved.created_at,
      },
    });
  } catch (error) {
    console.error("Save route error:", error);
    return res.status(500).json({ error: "Nie udało się zapisać trasy." });
  }
});

router.delete("/:id", (req, res) => {
  try {
    const routeId = Number(req.params.id);
    if (!Number.isFinite(routeId)) {
      return res.status(400).json({ error: "Nieprawidłowy identyfikator trasy." });
    }

    const result = db
      .prepare("DELETE FROM saved_routes WHERE id = ? AND user_id = ?")
      .run(routeId, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Trasa nie została znaleziona." });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Delete route error:", error);
    return res.status(500).json({ error: "Nie udało się usunąć trasy." });
  }
});

module.exports = router;
