const test = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");
const dotenv = require("dotenv");

test("API safety boundaries with mocked providers and no real credentials", async t => {
  t.mock.method(dotenv, "config", () => ({}));
  process.env.NODE_ENV = "production";
  process.env.ORS_API_KEY = "test-placeholder";
  process.env.ALLOWED_ORIGINS = "https://allowed.example";
  process.env.ORS_DIRECTIONS_PER_MINUTE = "3";
  process.env.ORS_DIRECTIONS_PER_DAY = "3";
  process.env.ORS_DIRECTIONS_CONCURRENCY = "4";
  process.env.ORS_GEOCODE_PER_MINUTE = "2";
  process.env.ORS_GEOCODE_PER_DAY = "2";
  process.env.ORS_GEOCODE_CONCURRENCY = "6";
  const calls = [];
  let denyGeocode = false;
  t.mock.method(axios, "get", async url => {
    calls.push({ method: "GET", url });
    assert.ok(url.endsWith("/autocomplete"), "no Nominatim or OSRM requests permitted");
    if (denyGeocode) throw Object.assign(new Error("provider unavailable"), { response: { status: 503 } });
    return { data: { features: [{ geometry: { coordinates: [21, 52] }, properties: { name: "Warszawa", label: "Warszawa" } }] } };
  });
  t.mock.method(axios, "post", async (url, payload) => {
    calls.push({ method: "POST", url, coordinates: payload.coordinates });
    if (payload.coordinates[0][0] === 22) {
      throw Object.assign(new Error("forbidden"), { response: { status: 403 } });
    }
    return { data: { type: "FeatureCollection", features: [{ type: "Feature",
      geometry: { type: "LineString", coordinates: payload.coordinates },
      properties: { summary: { distance: 2000, duration: 600 } },
    }] } };
  });
  const app = require("../server");
  const server = app.listen(0, "127.0.0.1");
  t.after(() => { server.close(); server.closeAllConnections(); });
  if (!server.listening) await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = data => ({ method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
  async function request(path, options, expected) {
    const response = await fetch(base + path, options);
    assert.equal(response.status, expected);
    assert.match(response.headers.get("content-type"), /application\/json/);
    return { response, body: await response.json() };
  }

  await t.test("CORS uses exact replacement allowlist, including preflight", async () => {
    const { response } = await request("/api/health", { headers: { Origin: "https://allowed.example" } }, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), "https://allowed.example");
    for (const origin of ["https://foreign.vercel.app", "https://cycleyourway.pl", "https://allowed.example.evil.test"]) {
      const { response: denied } = await request("/api/health", { headers: { Origin: origin } }, 403);
      assert.equal(denied.headers.get("access-control-allow-origin"), null);
    }
    const preflight = await fetch(base + "/api/route", { method: "OPTIONS", headers: {
      Origin: "https://allowed.example", "Access-Control-Request-Method": "POST",
    } });
    assert.equal(preflight.status, 204);
    await preflight.text();
    await request("/api/health", {}, 200); // CORS is not authentication.
  });

  await t.test("invalid input is JSON and never reaches a provider", async () => {
    await request("/api/route", post({ start: { lat: 999, lng: 21 }, end: { lat: 52, lng: 21 } }), 400);
    await request("/api/route", { ...post({}), body: "{" }, 400);
    await request("/api/route", post({ padding: "x".repeat(33000) }), 413);
    for (const query of ["lat=999&lng=21", "lat=&lng=21", "lat=52", "lat=52&lng=181"]) {
      await request("/api/reverse?" + query, {}, 400);
    }
    assert.equal(calls.length, 0);
  });

  await t.test("autocomplete uses Pelias only, including failures and quotas", async () => {
    const { body } = await request("/api/geocode?address=Warszawa&autocomplete=true", {}, 200);
    assert.equal(body.results[0].name, "Warszawa");
    denyGeocode = true;
    await request("/api/geocode?address=Krakow&autocomplete=true", {}, 503);
    const { response, body: limited } = await request("/api/geocode?address=Poznan&autocomplete=true", {}, 429);
    assert.equal(limited.code, "PROVIDER_BUDGET_EXCEEDED");
    assert.ok(Number(response.headers.get("retry-after")) > 0);
    assert.equal(calls.length, 2);
    const { geocodePolishAddress } = require("./geocode");
    assert.deepEqual(await geocodePolishAddress({ address: "Warszawa", autocomplete: true }), []);
    assert.equal(calls.length, 2);
  });

  const route = { start: { lat: 52, lng: 21 }, end: { lat: 52.01, lng: 21.01 } };
  await t.test("successful routes are cached without charging provider again", async () => {
    await request("/api/route", post(route), 200);
    const count = calls.length;
    await request("/api/route", post(route), 200);
    assert.equal(calls.length, count);
  });

  await t.test("denied routing keeps every waypoint on cycling retries and never uses OSRM", async () => {
    const waypoints = [{ lat: 52, lng: 22 }, { lat: 52.5, lng: 22.5 }, { lat: 53, lng: 23 }];
    const { body } = await request("/api/route", post({ waypoints }), 503);
    assert.equal(body.code, "ROUTING_UNAVAILABLE");
    const retries = calls.filter(call => call.coordinates?.[0][0] === 22);
    assert.equal(retries.length, 2);
    for (const retry of retries) assert.deepEqual(retry.coordinates, [[22, 52], [22.5, 52.5], [23, 53]]);
    assert.ok(!calls.some(call => call.url.includes("project-osrm")));
  });

  await t.test("route and loop share the provider budget; cached routes and health still work", async () => {
    const count = calls.length;
    await request("/api/route", post({ start: { lat: 51, lng: 20 }, end: route.end }), 429);
    await request("/api/loop", post({ start: route.start, distance: 20, avoidMainRoads: true }), 429);
    await request("/api/route", post(route), 200);
    await request("/api/health", {}, 200);
    assert.equal(calls.length, count);
  });
});
