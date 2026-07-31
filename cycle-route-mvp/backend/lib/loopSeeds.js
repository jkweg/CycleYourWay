/**
 * Unique random seeds for ORS round_trip candidates.
 */
const uniqueLoopSeeds = (count, maxExclusive = 90) => {
  const n = Math.max(0, Math.min(Number(count) || 0, maxExclusive));
  const seeds = new Set();
  while (seeds.size < n) {
    seeds.add(Math.floor(Math.random() * maxExclusive));
  }
  return [...seeds];
};

module.exports = {
  uniqueLoopSeeds,
};
