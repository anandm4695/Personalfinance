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
        const data = await yf.quote(sym, {}, { validateResult: false });
        const price =
          data?.regularMarketPrice ??
          data?.postMarketPrice ??
          data?.preMarketPrice;
        if (price != null) {
          results[sym] = {
            price,
            change: data?.regularMarketChange ?? 0,
            changePercent: data?.regularMarketChangePercent ?? 0,
            dayHigh: data?.regularMarketDayHigh ?? null,
            dayLow: data?.regularMarketDayLow ?? null,
            weekHigh52: data?.fiftyTwoWeekHigh ?? null,
            weekLow52: data?.fiftyTwoWeekLow ?? null,
            prevClose: data?.regularMarketPreviousClose ?? null,
            volume: data?.regularMarketVolume ?? null,
          };
        }
      } catch (_) {}
    })
  );

  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
  return res.status(200).json(results);
};
