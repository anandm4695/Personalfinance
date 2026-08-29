// Best-effort per-instance rate limiter for the public market-data proxy endpoints.
// Vercel functions are stateless across cold starts and can run on multiple
// concurrent instances, so this is not a hard global cap — it will not stop a
// distributed attacker. It does meaningfully raise the bar against a single
// script hammering the endpoint, which is the realistic threat here: these
// routes have no auth and several proxy metered/paid third-party APIs
// (Surepass, Twelve Data, Yahoo Finance) with no other access control in front
// of them. A durable cross-instance limiter would need Upstash/Vercel KV.

const buckets = new Map();

function clientIp(req) {
  if (!req) return "127.0.0.1";
  const fwd = req.headers ? (req.headers["x-forwarded-for"] || req.headers["X-Forwarded-For"]) : null;
  if (fwd) return String(fwd).split(",")[0].trim();
  return req.socket?.remoteAddress || req.ip || "127.0.0.1";
}

function rateLimit(req, res, { windowMs = 60_000, max = 30, keyPrefix = "" } = {}) {
  const key = keyPrefix + clientIp(req);
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  bucket.count++;
  if (bucket.count > max) {
    res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
    res.status(429).json({ error: "Too many requests — please slow down" });
    return false;
  }
  return true;
}

// Prevent unbounded growth on long-lived warm instances.
const cleanupTimer = setInterval(
  () => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (now > bucket.resetAt) buckets.delete(key);
    }
  },
  5 * 60_000
);
cleanupTimer.unref?.();

module.exports = { rateLimit, clientIp };
