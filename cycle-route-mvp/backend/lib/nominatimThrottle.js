/**
 * Simple Nominatim politeness helpers: in-memory cache + ~1 req/s throttle.
 */

const nominatimCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 120;
const MIN_INTERVAL_MS = 1050;

let lastNominatimAt = 0;
let nominatimQueue = Promise.resolve();

const cacheGet = (key) => {
  const entry = nominatimCache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    nominatimCache.delete(key);
    return undefined;
  }
  return entry.value;
};

const cacheSet = (key, value) => {
  if (nominatimCache.has(key)) nominatimCache.delete(key);
  nominatimCache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  while (nominatimCache.size > CACHE_MAX) {
    const oldest = nominatimCache.keys().next().value;
    nominatimCache.delete(oldest);
  }
};

const withNominatimThrottle = (task) => {
  const run = async () => {
    const wait = Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastNominatimAt));
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    lastNominatimAt = Date.now();
    return task();
  };

  const next = nominatimQueue.then(run, run);
  nominatimQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
};

module.exports = {
  cacheGet,
  cacheSet,
  withNominatimThrottle,
};
