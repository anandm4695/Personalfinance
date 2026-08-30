// Vercel serverless function — fetches latest NAV + historical chart + 52W H/L from mfapi.in
const https = require("https");
const { rateLimit } = require("./_lib/rateLimit");

// In-memory cache for mfapi responses (5 min TTL) to minimize external requests & avoid throttling
const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function parseMfDate(dStr) {
  if (!dStr || typeof dStr !== "string") return 0;
  const parts = dStr.split("-");
  if (parts.length !== 3) return 0;
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);
  if (isNaN(d) || isNaN(m) || isNaN(y)) return 0;
  return new Date(y, m - 1, d).getTime();
}

function getCutoffTimestamp(range) {
  const now = Date.now();
  const DAY_MS = 86400000;
  switch (String(range || "3m").toLowerCase()) {
    case "1m": return now - 30 * DAY_MS;
    case "3m": return now - 90 * DAY_MS;
    case "6m": return now - 182 * DAY_MS;
    case "1y": return now - 365 * DAY_MS;
    case "3y": return now - 365 * 3 * DAY_MS;
    case "5y": return now - 365 * 5 * DAY_MS;
    case "max": return 0;
    default: return now - 90 * DAY_MS;
  }
}

// Downsample to keep chart payloads/rendering fast for long ranges, always keeping the last point
function downsample(points, maxPoints) {
  if (!points || points.length <= maxPoints) return points || [];
  const step = Math.ceil(points.length / maxPoints);
  const out = [];
  for (let i = 0; i < points.length; i += step) out.push(points[i]);
  const last = points[points.length - 1];
  if (out[out.length - 1] !== last) out.push(last);
  return out;
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https
      .get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error("Invalid JSON from mfapi"));
          }
        });
      })
      .on("error", reject);
    // Without a timeout, a hung upstream connection can block until Vercel's
    // maxDuration kills the whole function instead of failing this one call fast.
    req.setTimeout(8000, () => req.destroy(new Error("Request to mfapi.in timed out")));
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Allow up to 180 requests per minute per IP for mutual fund batch/portfolio loads
  if (!rateLimit(req, res, { max: 180, windowMs: 60_000 })) return;

  const { code, range } = req.query;
  if (!code) return res.status(400).json({ error: "code required" });
  const cleanCode = String(code).trim();
  if (!/^\d+$/.test(cleanCode))
    return res.status(400).json({ error: "code must be numeric" });

  const rangeKey = String(range || "3m").toLowerCase();
  const cacheKey = `${cleanCode}:${rangeKey}`;
  const now = Date.now();

  const cached = cache.get(cacheKey);
  if (cached && now < cached.expiresAt) {
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    return res.status(200).json(cached.payload);
  }

  try {
    const data = await fetchJson(`https://api.mfapi.in/mf/${cleanCode}`);
    if (!data?.data?.length) return res.status(200).json({ nav: null, history: [] });

    const latest = data.data[0];
    const latestNav = parseFloat(latest.nav);

    // 52W high/low from last 365 days of data (approx 250 trading days or calendar cutoff)
    const yearCutoff = now - 365 * 86400000;
    const yearData = data.data.filter((d) => parseMfDate(d.date) >= yearCutoff);
    const navCandidates = yearData.length > 0 ? yearData : data.data.slice(0, 250);
    const navValues = navCandidates.map((d) => parseFloat(d.nav)).filter((n) => !isNaN(n) && n > 0);
    const high52 = navValues.length ? Math.max(...navValues) : null;
    const low52 = navValues.length ? Math.min(...navValues) : null;

    // Previous NAV (yesterday / previous trading day)
    const prevNav = data.data.length > 1 ? parseFloat(data.data[1].nav) : null;
    const navChange =
      prevNav !== null && !isNaN(prevNav) && latestNav !== null && !isNaN(latestNav)
        ? latestNav - prevNav
        : null;
    const navChangePct =
      navChange !== null && prevNav !== null && !isNaN(prevNav) && prevNav !== 0
        ? (navChange / prevNav) * 100
        : null;

    // mfapi.in stores newest first, filter by range cutoff then reverse for chronological order
    const cutoff = getCutoffTimestamp(rangeKey);
    let chartSource = data.data;
    if (cutoff > 0) {
      chartSource = data.data.filter((d) => parseMfDate(d.date) >= cutoff);
      if (!chartSource.length && data.data.length) {
        chartSource = data.data.slice(0, Math.min(data.data.length, 90));
      }
    }

    const chart = downsample(
      chartSource
        .slice()
        .reverse()
        .map((d) => ({
          t: d.date,
          p: parseFloat(d.nav),
        }))
        .filter((pt) => !isNaN(pt.p) && pt.p > 0),
      500
    );

    const payload = {
      nav: isNaN(latestNav) ? null : latestNav,
      date: latest.date,
      prevNav: isNaN(prevNav) ? null : prevNav,
      navChange: navChange != null ? Number(navChange.toFixed(4)) : null,
      navChangePct: navChangePct != null ? Number(navChangePct.toFixed(4)) : null,
      high52,
      low52,
      chart,
      schemeName: data.meta?.scheme_name || "",
    };

    cache.set(cacheKey, { payload, expiresAt: now + CACHE_TTL_MS });

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    return res.status(200).json(payload);
  } catch (e) {
    console.error(`[mf-nav] ${cleanCode}:`, e?.message || e);
    return res.status(500).json({ error: "Failed to fetch NAV data" });
  }
};
