const test = require("node:test");
const assert = require("node:assert/strict");
const axios = require("axios");
const dotenv = require("dotenv");

test("HTTP: shared quota charges the right actor and blocks before ORS", async (t) => {
  t.mock.method(dotenv, "config", () => ({}));
  process.env.ORS_API_KEY = "test-placeholder";
  process.env.ALLOWED_ORIGINS = "https://allowed.example";
  process.env.SUPABASE_URL = "https://db.example";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-placeholder";
  process.env.QUOTA_DIRECTIONS_GUEST_PER_DAY = "7";
  process.env.QUOTA_DIRECTIONS_USER_PER_DAY = "70";

  const userId = "6f9619ff-8b86-4e2b-a6c7-3f3f86f7c918";
  const quotaCalls = [];
  let quotaReply = { allowed: true };
  const realFetch = globalThis.fetch;
  t.mock.method(globalThis, "fetch", async (url, init = {}) => {
    const target = String(url);
    if (target === "https://db.example/auth/v1/user") {
      const ok = init.headers.Authorization === `Bearer ${"t".repeat(40)}`;
      return { ok, status: ok ? 200 : 401, json: async () => ({ id: userId }) };
    }
    if (target === "https://db.example/rest/v1/rpc/get_api_usage_today") {
      return { ok: true, status: 200, json: async () => ({ usage: { directions: 1900 }, disabled: [] }) };
    }
    if (target === "https://db.example/rest/v1/rpc/consume_api_quota") {
      quotaCalls.push(JSON.parse(init.body));
      return { ok: true, status: 200, json: async () => quotaReply };
    }
    return realFetch(url, init);
  });
  let orsCalls = 0;
  t.mock.method(axios, "post", async (_url, payload) => {
    orsCalls++;
    return { data: { type: "FeatureCollection", features: [{ type: "Feature",
      geometry: { type: "LineString", coordinates: payload.coordinates },
      properties: { summary: { distance: 2000, duration: 600 } },
    }] } };
  });

  const app = require("../server");
  const server = app.listen(0, "127.0.0.1");
  t.after(() => { server.close(); server.closeAllConnections(); });
  if (!server.listening) await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const route = (lng, headers = {}) => realFetch(`${base}/api/route`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ start: { lat: 52, lng }, end: { lat: 52.01, lng: lng + 0.01 } }),
  });

  assert.equal((await (await realFetch(`${base}/api/health`)).json()).quotaConfigured, true);
  const quotaHealth = await realFetch(`${base}/api/health/quota`);
  assert.equal(quotaHealth.status, 503, "95% of the global directions quota trips the monitor");
  assert.deepEqual((await quotaHealth.json()).percentUsed, { directions: 95, geocode: 0 });

  assert.equal((await route(21.0)).status, 200);
  assert.deepEqual(
    [quotaCalls[0].p_kind, quotaCalls[0].p_actor, quotaCalls[0].p_actor_day_limit],
    ["directions", "ip:127.0.0.1", 7],
  );

  assert.equal((await route(21.1, { authorization: `Bearer ${"t".repeat(40)}` })).status, 200);
  assert.deepEqual([quotaCalls[1].p_actor, quotaCalls[1].p_actor_day_limit], [`user:${userId}`, 70]);

  assert.equal((await route(21.2, { authorization: `Bearer ${"x".repeat(40)}` })).status, 200);
  assert.equal(quotaCalls[2].p_actor, "ip:127.0.0.1", "unverifiable token falls back to guest");

  const orsBefore = orsCalls;
  quotaReply = { allowed: false, reason: "actor", retry_after: 3600 };
  const denied = await route(21.3);
  assert.equal(denied.status, 429);
  assert.equal(denied.headers.get("retry-after"), "3600");
  assert.match((await denied.json()).error, /Zaloguj się/);
  assert.equal(orsCalls, orsBefore, "denied request never reached ORS");

  quotaReply = { allowed: false, reason: "disabled", retry_after: 300 };
  const disabled = await route(21.4);
  assert.equal(disabled.status, 503);
  assert.match((await disabled.json()).error, /chwilowo wyłączone/);

  quotaReply = { allowed: true };
  const callsBefore = quotaCalls.length;
  assert.equal((await route(21.0)).status, 200, "cached route");
  assert.equal(quotaCalls.length, callsBefore, "cache hit is not charged");
});
