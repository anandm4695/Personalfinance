// Vercel serverless function — returns intraday 5-minute chart for the last trading session
const { default: YahooFinance } = require("yahoo-finance2");

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  try {
    // Go back 7 days so we always capture the last trading session even on weekends/holidays.
    // yahoo-finance2 chart() only supports period1/period2, not range — range is silently ignored.
    const period1 = new Date();
    period1.setDate(period1.getDate() - 7);

    const result = await yf.chart(
      String(symbol),
      { period1, interval: "5m" },
      { validateResult: false }
    );

    const quotes = result?.quotes || [];
    if (!quotes.length) {
      return res.status(200).json({ date: null, points: [] });
    }

    // Find the most recent trading session date in IST
    const dateTags = quotes.map((q) =>
      new Date(q.date).toLocaleDateString("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    );
    const lastDateTag = dateTags[dateTags.length - 1];

    // Keep only that last session's candles
    const points = quotes
      .filter((_, i) => dateTags[i] === lastDateTag)
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
    return res.status(200).json({ date: lastDateTag, points });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
