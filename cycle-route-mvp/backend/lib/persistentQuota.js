// Shared, persistent daily quota for provider calls (B02 / R03), backed by
// public.consume_api_quota() in Supabase (supabase/migrations/20261008_api_quota.sql).
// The in-process ProviderBudget still guards per-minute bursts and concurrency;
// this layer survives restarts and is shared by every backend instance.
const { AsyncLocalStorage } = require("node:async_hooks");

const requestContext = new AsyncLocalStorage();

// Runs fn with the request's actor ({ id: "user:<uuid>" | "ip:<addr>", isUser })
// visible to every provider call made while handling that request.
function runWithActor(actor, fn) {
  return requestContext.run({ actor }, fn);
}

function currentActor() {
  return requestContext.getStore()?.actor || { id: "system", isUser: false };
}

function quotaError(code, status, retryAfter, scope) {
  return Object.assign(new Error(`Provider quota denied (${scope})`), {
    code,
    retryAfter,
    quotaScope: scope,
    response: { status },
  });
}

function positiveInteger(env, name, fallback) {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function quotaLimitsFromEnv(env = process.env) {
  return {
    directions: {
      global: positiveInteger(env, "QUOTA_DIRECTIONS_GLOBAL_PER_DAY",
        positiveInteger(env, "ORS_DIRECTIONS_PER_DAY", 2000)),
      user: positiveInteger(env, "QUOTA_DIRECTIONS_USER_PER_DAY", 300),
      guest: positiveInteger(env, "QUOTA_DIRECTIONS_GUEST_PER_DAY", 60),
    },
    geocode: {
      global: positiveInteger(env, "QUOTA_GEOCODE_GLOBAL_PER_DAY",
        positiveInteger(env, "ORS_GEOCODE_PER_DAY", 3000)),
      user: positiveInteger(env, "QUOTA_GEOCODE_USER_PER_DAY", 800),
      guest: positiveInteger(env, "QUOTA_GEOCODE_GUEST_PER_DAY", 200),
    },
  };
}

class PersistentQuota {
  constructor({ supabaseUrl, serviceKey, limits, failMode = "open", fetchImpl = fetch, timeoutMs = 2500, log = console }) {
    this.endpoint = supabaseUrl ? `${supabaseUrl.replace(/\/+$/, "")}/rest/v1/rpc/consume_api_quota` : null;
    this.serviceKey = serviceKey;
    this.limits = limits;
    this.failMode = failMode === "closed" ? "closed" : "open";
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
    this.log = log;
  }

  get enabled() {
    return Boolean(this.endpoint && this.serviceKey);
  }

  // Charges one provider call of `kind` to the current actor and the global bucket.
  async consume(kind) {
    if (!this.enabled) return;
    const actor = currentActor();
    const limits = this.limits[kind];
    let result;
    try {
      const response = await this.fetchImpl(this.endpoint, {
        method: "POST",
        headers: {
          apikey: this.serviceKey,
          Authorization: `Bearer ${this.serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          p_kind: kind,
          p_actor: actor.id,
          p_actor_day_limit: actor.isUser ? limits.user : limits.guest,
          p_global_day_limit: limits.global,
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) throw new Error(`quota RPC HTTP ${response.status}`);
      result = await response.json();
    } catch (error) {
      if (this.failMode === "closed") {
        throw quotaError("PROVIDER_QUOTA_UNAVAILABLE", 503, 60, "unavailable");
      }
      this.log.warn?.("[quota] check failed, allowing (QUOTA_FAIL_MODE=open):", error.message);
      return;
    }
    if (result?.allowed) return;
    if (result?.reason === "disabled") {
      throw quotaError("PROVIDER_DISABLED", 503, result.retry_after || 300, "disabled");
    }
    throw quotaError("PROVIDER_BUDGET_EXCEEDED", 429, result?.retry_after || 3600,
      result?.reason === "actor" ? (actor.isUser ? "user" : "guest") : "global");
  }
}

module.exports = { PersistentQuota, currentActor, quotaLimitsFromEnv, runWithActor };
