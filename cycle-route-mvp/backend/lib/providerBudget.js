// Process-wide protection for actual provider calls, including retries/fan-out.
// This is not a persistent or distributed quota; see docs/IMPLEMENTATION_PROGRESS.md.
class ProviderBudget {
  constructor({ perMinute, perDay, concurrency, now = Date.now }) {
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
      return await request();
    } finally {
      this.active -= 1;
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

const directionsBudget = new ProviderBudget({
  perMinute: positiveInteger("ORS_DIRECTIONS_PER_MINUTE", 40),
  perDay: positiveInteger("ORS_DIRECTIONS_PER_DAY", 2000),
  concurrency: positiveInteger("ORS_DIRECTIONS_CONCURRENCY", 4),
});
const geocodeBudget = new ProviderBudget({
  perMinute: positiveInteger("ORS_GEOCODE_PER_MINUTE", 100),
  perDay: positiveInteger("ORS_GEOCODE_PER_DAY", 3000),
  concurrency: positiveInteger("ORS_GEOCODE_CONCURRENCY", 6),
});

module.exports = { ProviderBudget, directionsBudget, geocodeBudget };
