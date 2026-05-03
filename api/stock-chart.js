// Vercel serverless function — returns intraday 5-minute chart data for a symbol
const { default: YahooFinance } = require("yahoo-finance2");

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  try {
    // Use range:"1d" so Yahoo always returns the last trading session
    // regardless of weekends/holidays (period1-based approach returns nothing on non-trading days)
    const result = await yf.chart(
      String(symbol),
      { range: "1d", interval: "5m" },
      { validateResult: false }
    );

    const quotes = result?.quotes || [];
    const points = quotes
      .map((q) => ({
        t: new Date(q.date).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Asia/Kolkata",
        }),
        p: Number(((q.close ?? q.open) || 0).toFixed(2)),
      }))
      .filter((pt) => pt.p > 0);

    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json(points);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
