const { default: YahooFinance } = require("yahoo-finance2");

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const RANGE_CONFIG = {
  "1d":  { days: 7,    interval: "5m",  filterLastSession: true },
  "5d":  { days: 7,    interval: "15m", filterLastSession: false },
  "1m":  { days: 35,   interval: "1d",  filterLastSession: false },
  "6m":  { days: 190,  interval: "1d",  filterLastSession: false },
  "ytd": { ytd: true,  interval: "1d",  filterLastSession: false },
  "1y":  { days: 370,  interval: "1wk", filterLastSession: false },
  "3y":  { days: 1100, interval: "1wk", filterLastSession: false },
  "5y":  { days: 1830, interval: "1mo", filterLastSession: false },
  "max": { days: 7300, interval: "1mo", filterLastSession: false },
};

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { symbol, range: rangeParam } = req.query;
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  const range = RANGE_CONFIG[rangeParam] ? rangeParam : "1d";
  const cfg = RANGE_CONFIG[range];

  try {
    const period1 = new Date();
    if (cfg.ytd) {
      period1.setMonth(0, 1);
      period1.setHours(0, 0, 0, 0);
    } else {
      period1.setDate(period1.getDate() - cfg.days);
    }

    const result = await yf.chart(
      String(symbol),
      { period1, interval: cfg.interval },
      { validateResult: false }
    );

    const quotes = result?.quotes || [];
    if (!quotes.length) {
      return res.status(200).json({ date: null, points: [], range });
    }

    if (cfg.filterLastSession) {
      const dateTags = quotes.map((q) =>
        new Date(q.date).toLocaleDateString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      );
      const lastDateTag = dateTags[dateTags.length - 1];

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
      return res.status(200).json({ date: lastDateTag, points, range });
    }

    const points = quotes
      .map((q) => {
        const d = new Date(q.date);
        let t;
        if (cfg.interval === "15m" || cfg.interval === "5m") {
          t = d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            timeZone: "Asia/Kolkata",
          }) + " " + d.toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Asia/Kolkata",
          });
        } else if (cfg.interval === "1d") {
          t = d.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            timeZone: "Asia/Kolkata",
          });
        } else {
          t = d.toLocaleDateString("en-IN", {
            month: "short",
            year: "2-digit",
            timeZone: "Asia/Kolkata",
          });
        }
        return {
          t,
          p: Number(((q.close ?? q.open) || 0).toFixed(2)),
        };
      })
      .filter((pt) => pt.p > 0);

    const cacheTtl = ["1d", "5d"].includes(range) ? 60 : 3600;
    res.setHeader("Cache-Control", `s-maxage=${cacheTtl}, stale-while-revalidate=${cacheTtl * 2}`);
    return res.status(200).json({ date: null, points, range });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
