// Identifies who a provider call is charged to: a signed-in Supabase user (token
// verified with Supabase Auth, cached briefly) or a guest keyed by client IP.
// An invalid or unverifiable token is treated as a guest, never as an error.
const crypto = require("node:crypto");
const net = require("node:net");
const { TtlCache } = require("./orsCache");

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// IPv6 clients usually control a whole /64, so guests are grouped per /64.
function guestKey(ip) {
  const address = String(ip || "").replace(/^::ffff:(?=\d+\.\d+\.\d+\.\d+$)/, "");
  if (net.isIPv4(address)) return address;
  if (!net.isIPv6(address)) return "unknown";
  const [head, tail = ""] = address.split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const groups = address.includes("::")
    ? [...left, ...Array(8 - left.length - right.length).fill("0"), ...right]
    : left;
  return `${groups.slice(0, 4).map((group) => parseInt(group, 16).toString(16)).join(":")}::/64`;
}

function createActorResolver({ supabaseUrl, apiKey, fetchImpl = fetch, timeoutMs = 2500 }) {
  const userEndpoint = supabaseUrl ? `${supabaseUrl.replace(/\/+$/, "")}/auth/v1/user` : null;
  const tokens = new TtlCache({ ttlMs: 5 * 60 * 1000, maxSize: 1000 });

  return async function resolveActor(req) {
    const guest = { id: `ip:${guestKey(req.ip)}`, isUser: false };
    const token = /^Bearer\s+(\S{20,4096})$/i.exec(req.get("authorization") || "")?.[1];
    if (!token || !userEndpoint || !apiKey) return guest;

    const cacheKey = crypto.createHash("sha256").update(token).digest("hex");
    const cached = tokens.get(cacheKey);
    if (cached !== undefined) return cached || guest;

    try {
      const response = await fetchImpl(userEndpoint, {
        headers: { apikey: apiKey, Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.status === 401 || response.status === 403) {
        tokens.set(cacheKey, null);
        return guest;
      }
      if (!response.ok) return guest;
      const user = await response.json();
      const actor = UUID.test(user?.id || "") ? { id: `user:${user.id}`, isUser: true } : null;
      tokens.set(cacheKey, actor);
      return actor || guest;
    } catch {
      return guest;
    }
  };
}

module.exports = { createActorResolver, guestKey };
