// Stock logo resolution — tries sources in priority order:
// 1. Twelve Data (if TWELVE_DATA_KEY env var set)
// 2. EODHD public CDN — validated via HEAD to skip blank placeholder images
// 3. Yahoo Finance website → Google favicon (sz=256 for crispness)

const { default: YahooFinance } = require("yahoo-finance2");
const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

async function resolveWithTwelveData(base, exchange, apiKey) {
  const exch = /BO/i.test(exchange) ? "BSE" : "NSE";
  const url = `https://api.twelvedata.com/logo?symbol=${encodeURIComponent(base)}&exchange=${exch}&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  return data?.url || null;
}

async function resolveWithEODHD(base, isBSE) {
  const country = isBSE ? "BSE" : "IN";
  const url = `https://eodhistoricaldata.com/img/logos/${country}/${base}.png`;
  try {
    // HEAD request to verify the image is a real logo (not a blank placeholder).
    // EODHD returns 200 OK with a tiny transparent PNG for unknown stocks,
    // which renders as empty and never triggers onError in the browser.
    const check = await fetch(url, { method: "HEAD" });
    if (!check.ok) return null;
    const contentLength = parseInt(check.headers.get("content-length") || "0", 10);
    // Real company logos are at least 1 KB; blank placeholders are ~67–200 bytes.
    if (contentLength > 0 && contentLength < 1000) return null;
    return url;
  } catch (_) {
    // If HEAD is blocked/unsupported, return the URL and let the browser handle it.
    return url;
  }
}

async function resolveWithYahoo(symbol) {
  try {
    const summary = await yf.quoteSummary(symbol, { modules: ["assetProfile"] }, { validateResult: false });
    const website = summary?.assetProfile?.website;
    if (website) {
      const domain = new URL(website).hostname.replace(/^www\./, "");
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=256`;
    }
  } catch (err) {
    console.error(`[stock-logo] Yahoo lookup failed for ${symbol}:`, err?.message || err);
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  const sym = String(symbol);
  const base = sym.replace(/\.(NS|BO)$/i, "");
  const isBSE = /\.BO$/i.test(sym);
  const exchange = isBSE ? "BSE" : "NSE";

  let logoUrl = null;

  // Priority 1: Twelve Data (if API key configured)
  const tdKey = process.env.TWELVE_DATA_KEY;
  if (tdKey) {
    logoUrl = await resolveWithTwelveData(base, exchange, tdKey);
  }

  // Priority 2: EODHD public CDN — validated to skip transparent placeholder images
  if (!logoUrl) {
    logoUrl = await resolveWithEODHD(base, isBSE);
  }

  // Priority 3: Yahoo Finance website → Google favicon (sz=256 for crispness)
  const faviconUrl = await resolveWithYahoo(sym);

  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
  return res.status(200).json({ logoUrl, faviconUrl });
};
