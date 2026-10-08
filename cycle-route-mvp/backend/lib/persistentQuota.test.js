const test = require("node:test");
const assert = require("node:assert/strict");
const { PersistentQuota, runWithActor } = require("./persistentQuota");
const { ProviderBudget } = require("./providerBudget");
const { createActorResolver, guestKey } = require("./requestActor");

const limits = {
  directions: { global: 2000, user: 300, guest: 60 },
  geocode: { global: 3000, user: 800, guest: 200 },
};
const json = (status, body) => ({ ok: status < 400, status, json: async () => body });
const silent = { warn() {} };

test("quota is a no-op until Supabase is configured", async () => {
  const quota = new PersistentQuota({ limits, fetchImpl: () => assert.fail("no request expected") });
  assert.equal(quota.enabled, false);
  await quota.consume("directions");
});

test("charges the request actor with user or guest limits", async () => {
  const bodies = [];
  const quota = new PersistentQuota({
    supabaseUrl: "https://db.example/", serviceKey: "service", limits,
    fetchImpl: async (url, init) => {
      assert.equal(url, "https://db.example/rest/v1/rpc/consume_api_quota");
      assert.equal(init.headers.apikey, "service");
      bodies.push(JSON.parse(init.body));
      return json(200, { allowed: true });
    },
  });
  await runWithActor({ id: "user:u1", isUser: true }, () => quota.consume("directions"));
  await runWithActor({ id: "ip:1.2.3.4", isUser: false }, () => quota.consume("geocode"));
  assert.deepEqual(bodies, [
    { p_kind: "directions", p_actor: "user:u1", p_actor_day_limit: 300, p_global_day_limit: 2000 },
    { p_kind: "geocode", p_actor: "ip:1.2.3.4", p_actor_day_limit: 200, p_global_day_limit: 3000 },
  ]);
});

test("maps denials to 429 (guest/user/global) and the kill switch to 503", async () => {
  let reply;
  const quota = new PersistentQuota({
    supabaseUrl: "https://db.example", serviceKey: "service", limits, fetchImpl: async () => json(200, reply),
  });
  const guest = () => runWithActor({ id: "ip:x", isUser: false }, () => quota.consume("directions"));
  reply = { allowed: false, reason: "actor", retry_after: 120 };
  await assert.rejects(guest(), (e) => e.code === "PROVIDER_BUDGET_EXCEEDED" && e.quotaScope === "guest"
    && e.response.status === 429 && e.retryAfter === 120);
  await assert.rejects(runWithActor({ id: "user:u", isUser: true }, () => quota.consume("directions")),
    (e) => e.quotaScope === "user");
  reply = { allowed: false, reason: "global", retry_after: 50 };
  await assert.rejects(guest(), (e) => e.quotaScope === "global");
  reply = { allowed: false, reason: "disabled", retry_after: 300 };
  await assert.rejects(guest(), (e) => e.code === "PROVIDER_DISABLED" && e.response.status === 503);
});

test("quota outage fails open by default and closed on request", async () => {
  const down = async () => { throw new Error("connect ECONNREFUSED"); };
  const open = new PersistentQuota({ supabaseUrl: "https://db.example", serviceKey: "s", limits, fetchImpl: down, log: silent });
  await open.consume("directions");
  const closed = new PersistentQuota({ supabaseUrl: "https://db.example", serviceKey: "s", limits, fetchImpl: down, failMode: "closed" });
  await assert.rejects(closed.consume("directions"), (e) => e.code === "PROVIDER_QUOTA_UNAVAILABLE" && e.response.status === 503);
  const http500 = new PersistentQuota({ supabaseUrl: "https://db.example", serviceKey: "s", limits,
    fetchImpl: async () => json(500, {}), failMode: "closed" });
  await assert.rejects(http500.consume("geocode"), (e) => e.code === "PROVIDER_QUOTA_UNAVAILABLE");
});

test("a shared-quota denial never reaches the provider and frees the local slot", async () => {
  let deny = true;
  const budget = new ProviderBudget({
    perMinute: 1, perDay: 1, concurrency: 1, now: () => 0,
    beforeCall: async () => { if (deny) throw Object.assign(new Error("denied"), { code: "PROVIDER_BUDGET_EXCEEDED" }); },
  });
  let sent = 0;
  await assert.rejects(budget.run(async () => { sent++; }), /denied/);
  deny = false;
  await budget.run(async () => { sent++; });
  assert.equal(sent, 1);
  assert.equal(budget.active, 0);
});

test("guests are keyed by IPv4 or IPv6 /64", () => {
  assert.equal(guestKey("203.0.113.9"), "203.0.113.9");
  assert.equal(guestKey("::ffff:203.0.113.9"), "203.0.113.9");
  assert.equal(guestKey("2001:db8:1:2:aaaa:bbbb:cccc:dddd"), "2001:db8:1:2::/64");
  assert.equal(guestKey("2001:db8:1:2::5"), "2001:db8:1:2::/64");
  assert.equal(guestKey("2001:db8::1"), "2001:db8:0:0::/64");
  assert.equal(guestKey(undefined), "unknown");
});

test("verified Supabase token identifies the user; anything else is a guest", async () => {
  const token = "a".repeat(40);
  let calls = 0;
  let reply = json(200, { id: "6f9619ff-8b86-4e2b-a6c7-3f3f86f7c918" });
  const resolve = createActorResolver({
    supabaseUrl: "https://db.example", apiKey: "service",
    fetchImpl: async (url, init) => {
      calls++;
      assert.equal(url, "https://db.example/auth/v1/user");
      assert.match(init.headers.Authorization, /^Bearer [abc]{40}$/);
      if (reply instanceof Error) throw reply;
      return reply;
    },
  });
  const req = (auth) => ({ ip: "203.0.113.9", get: (name) => (name === "authorization" ? auth : undefined) });

  assert.deepEqual(await resolve(req(undefined)), { id: "ip:203.0.113.9", isUser: false });
  assert.equal(calls, 0);
  assert.deepEqual(await resolve(req(`Bearer ${token}`)), { id: "user:6f9619ff-8b86-4e2b-a6c7-3f3f86f7c918", isUser: true });
  await resolve(req(`Bearer ${token}`));
  assert.equal(calls, 1, "verified token is cached");

  const bad = "b".repeat(40);
  reply = json(401, {});
  assert.equal((await resolve(req(`Bearer ${bad}`))).isUser, false);
  await resolve(req(`Bearer ${bad}`));
  assert.equal(calls, 2, "rejected token is cached too");

  reply = new Error("network");
  const flaky = "c".repeat(40);
  assert.equal((await resolve(req(`Bearer ${flaky}`))).isUser, false);
  await resolve(req(`Bearer ${flaky}`));
  assert.equal(calls, 4, "network failures are not cached");
});

test("transient connection errors are retried once, each attempt charged", async () => {
  const { isTransientConnectionError } = require("./providerBudget");
  const parseError = Object.assign(new Error("Parse Error: Expected HTTP/, RTSP/ or ICE/"), { code: "HPE_INVALID_CONSTANT" });
  assert.equal(isTransientConnectionError(parseError), true);
  assert.equal(isTransientConnectionError(Object.assign(new Error("x"), { code: "ECONNRESET" })), true);
  assert.equal(isTransientConnectionError(Object.assign(new Error("forbidden"), { response: { status: 403 } })), false);
  assert.equal(isTransientConnectionError(Object.assign(new Error("timeout"), { code: "ECONNABORTED" })), false);

  let charged = 0;
  const budget = new ProviderBudget({ perMinute: 10, perDay: 10, concurrency: 2, beforeCall: async () => { charged++; } });
  let attempts = 0;
  assert.equal(await budget.runWithRetry(async () => {
    attempts++;
    if (attempts === 1) throw parseError;
    return "ok";
  }), "ok");
  assert.deepEqual([attempts, charged], [2, 2]);

  attempts = 0;
  await assert.rejects(budget.runWithRetry(async () => { attempts++; throw parseError; }), /Parse Error/);
  assert.equal(attempts, 2, "only one retry");

  attempts = 0;
  await assert.rejects(budget.runWithRetry(async () => {
    attempts++;
    throw Object.assign(new Error("forbidden"), { response: { status: 403 } });
  }), /forbidden/);
  assert.equal(attempts, 1, "HTTP errors are not retried");
});

test("quota status reports percentages and trips at the alert threshold", async () => {
  let reply = { usage: { directions: 1500, geocode: 300 }, disabled: [] };
  const quota = new PersistentQuota({
    supabaseUrl: "https://db.example", serviceKey: "s", limits,
    fetchImpl: async (url) => {
      assert.equal(url, "https://db.example/rest/v1/rpc/get_api_usage_today");
      return json(200, reply);
    },
  });
  assert.deepEqual(await quota.status(80), {
    ok: true, reason: undefined, percentUsed: { directions: 75, geocode: 10 }, alertPercent: 80, disabled: [],
  });
  reply = { usage: { directions: 1600 }, disabled: [] };
  assert.equal((await quota.status(80)).reason, "quota_high");
  reply = { usage: {}, disabled: ["all"] };
  assert.equal((await quota.status(80)).reason, "kill_switch");
  assert.deepEqual(await new PersistentQuota({ limits }).status(80), { ok: false, reason: "not_configured" });
});
