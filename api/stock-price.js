// Vercel serverless function — uses yahoo-finance2 which handles
// Yahoo Finance cookie/crumb auth automatically (no CORS issues server-side)
const { default: YahooFinance } = require("yahoo-finance2");

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ error: "symbols query param required" });

  const symList = String(symbols)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 30);

  const results = {};

  await Promise.allSettled(
    symList.map(async (sym) => {
      try {
        // Fetch both quote and quoteSummary to get price, sector, and marketCap
        const [quote, summary] = await Promise.all([
          yf.quote(sym, {}, { validateResult: false }),
          yf.quoteSummary(sym, { modules: ["assetProfile", "summaryDetail", "price"] }).catch(() => null)
        ]);

        const price =
          quote?.regularMarketPrice ??
          quote?.postMarketPrice ??
          quote?.preMarketPrice;

        if (price != null) {
          results[sym] = {
            price,
            change: quote?.regularMarketChange ?? 0,
            changePercent: quote?.regularMarketChangePercent ?? 0,
            dayHigh: quote?.regularMarketDayHigh ?? null,
            dayLow: quote?.regularMarketDayLow ?? null,
            weekHigh52: quote?.fiftyTwoWeekHigh ?? null,
            weekLow52: quote?.fiftyTwoWeekLow ?? null,
            prevClose: quote?.regularMarketPreviousClose ?? null,
            volume: quote?.regularMarketVolume ?? null,
            // New fields for analysis
            sector: summary?.assetProfile?.sector ?? "Unknown",
            marketCap: summary?.price?.marketCap ?? summary?.summaryDetail?.marketCap ?? quote?.marketCap ?? null,
          };
        }
      } catch (err) {
        console.error(`[stock-price] Failed to fetch ${sym}:`, err?.message || err);
      }
    })
  );

  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
  return res.status(200).json(results);
};
