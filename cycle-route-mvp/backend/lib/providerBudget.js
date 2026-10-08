// Process-wide protection for actual provider calls, including retries/fan-out.
// The optional beforeCall hook adds the persistent, shared daily quota
// (lib/persistentQuota.js) on top of these in-memory burst limits.
const { PersistentQuota, quotaLimitsFromEnv } = require("./persistentQuota");

// Connection-level failures (reset socket, malformed HTTP from the provider or an
// intermediate proxy) carry no HTTP response and are safe to retry once.
function isTransientConnectionError(error) {
  if (!error || error.response) return false;
  return /^(ECONNRESET|EPIPE|ECONNREFUSED|EAI_AGAIN|HPE_[A-Z_]+)$/.test(String(error.code || "")) ||
    /Parse Error|socket hang up/i.test(String(error.message || ""));
}

class ProviderBudget {
  constructor({ perMinute, perDay, concurrency, now = Date.now, beforeCall = null }) {
    this.beforeCall = beforeCall;
    this.perMinute = perMinute;
    this.perDay = perDay;
    this.concurrency = concurrency;
    this.now = now;
    this.calls = [];
    this.active = 0;
  }

  async run(request) {
    const now = this.now();
    this.calls = this.calls.filter(time => time > now - 86400000);
    const minuteCalls = this.calls.filter(time => time > now - 60000);
    let retryAfter = 0;
    if (this.calls.length >= this.perDay) {
      retryAfter = Math.ceil((this.calls[0] + 86400000 - now) / 1000);
    } else if (minuteCalls.length >= this.perMinute) {
      retryAfter = Math.ceil((minuteCalls[0] + 60000 - now) / 1000);
    } else if (this.active >= this.concurrency) {
      retryAfter = 1;
    }
    if (retryAfter) {
      throw Object.assign(new Error("Provider request budget exhausted"), {
        code: "PROVIDER_BUDGET_EXCEEDED",
        retryAfter,
        response: { status: 429 },
      });
    }
    // Reserve synchronously before yielding, so parallel candidates cannot overspend.
    this.calls.push(now);
    this.active += 1;
    try {
      if (this.beforeCall) {
        try {
          await this.beforeCall();
        } catch (error) {
          // Denied by the shared quota: the call never happened, so free its slot.
          const index = this.calls.lastIndexOf(now);
          if (index >= 0) this.calls.splice(index, 1);
          throw error;
        }
      }
      return await request();
    } finally {
      this.active -= 1;
    }
  }

  // Each attempt is a real provider call, so each one is budgeted and charged.
  async runWithRetry(request, retries = 1) {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.run(request);
      } catch (error) {
        if (attempt >= retries || !isTransientConnectionError(error)) throw error;
        console.warn(`[provider] transient connection error (${error.code || error.message}), retrying`);
      }
    }
  }
}

function positiveInteger(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

const persistentQuota = new PersistentQuota({
  supabaseUrl: process.env.SUPABASE_URL,
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  limits: quotaLimitsFromEnv(),
  failMode: process.env.QUOTA_FAIL_MODE,
});

const directionsBudget = new ProviderBudget({
  perMinute: positiveInteger("ORS_DIRECTIONS_PER_MINUTE", 40),
  perDay: positiveInteger("ORS_DIRECTIONS_PER_DAY", 2000),
  concurrency: positiveInteger("ORS_DIRECTIONS_CONCURRENCY", 4),
  beforeCall: () => persistentQuota.consume("directions"),
});
const geocodeBudget = new ProviderBudget({
  perMinute: positiveInteger("ORS_GEOCODE_PER_MINUTE", 100),
  perDay: positiveInteger("ORS_GEOCODE_PER_DAY", 3000),
  concurrency: positiveInteger("ORS_GEOCODE_CONCURRENCY", 6),
  beforeCall: () => persistentQuota.consume("geocode"),
});

module.exports = {
  ProviderBudget,
  directionsBudget,
  geocodeBudget,
  isTransientConnectionError,
  persistentQuota,
};
