// Stock logo resolution — tries sources in priority order:
// 1. EODHD public CDN  (free, no API key, good NSE/BSE coverage)
// 2. Yahoo Finance website → Google favicon  (free fallback)
// To upgrade: set TWELVE_DATA_KEY env var and it automatically uses Twelve Data instead.

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

async function resolveWithYahoo(symbol) {
  try {
    const summary = await yf.quoteSummary(symbol, { modules: ["assetProfile"] }, { validateResult: false });
    const website = summary?.assetProfile?.website;
    if (website) {
      const domain = new URL(website).hostname.replace(/^www\./, "");
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    }
  } catch (_) {}
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

  // Priority 2: EODHD public CDN — no API key, publicly accessible image files
  if (!logoUrl) {
    const country = isBSE ? "BSE" : "IN";
    logoUrl = `https://eodhistoricaldata.com/img/logos/${country}/${base}.png`;
  }

  // Priority 3: Yahoo Finance website → Google favicon
  const faviconUrl = await resolveWithYahoo(sym);

  res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
  return res.status(200).json({ logoUrl, faviconUrl });
};
