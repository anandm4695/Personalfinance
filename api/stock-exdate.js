// Vercel serverless — fetches ex-dividend date & yield from Yahoo Finance
// Uses the same yahoo-finance2 package as stock-price.js
const { default: YahooFinance } = require("yahoo-finance2");

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// yahoo-finance2 ships with no request timeout by default — a hung upstream
// response can otherwise block until Vercel's maxDuration kills the whole
// function. Follows the same 8s-timeout philosophy as the mfapi.in calls in
// api/mf-nav.js / api/cron-update-prices.js.
const YF_TIMEOUT_MS = 8000;
const yfFetchOptions = () => ({ fetchOptions: { signal: AbortSignal.timeout(YF_TIMEOUT_MS) } });

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "symbol query param required" });

  try {
    const summary = await yf.quoteSummary(
      String(symbol),
      { modules: ["calendarEvents", "summaryDetail"] },
      yfFetchOptions()
    );

    const cal = summary?.calendarEvents;
    const det = summary?.summaryDetail;

    // exDividendDate comes as a Date object from yahoo-finance2; convert to Unix seconds
    const toUnix = (val) => {
      if (!val) return null;
      if (val instanceof Date) return Math.floor(val.getTime() / 1000);
      const n = Number(val);
      return isNaN(n) ? null : n;
    };

    const exDividendDate = toUnix(cal?.exDividendDate ?? det?.exDividendDate ?? null);
    const dividendDate = toUnix(cal?.dividendDate ?? null);

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    return res.status(200).json({
      symbol,
      exDividendDate,
      dividendDate,
      trailingAnnualDividendRate: det?.trailingAnnualDividendRate ?? null,
      dividendYield: det?.dividendYield ?? null,
      dividendRate: det?.dividendRate ?? null,
    });
  } catch (err) {
    console.error(`[stock-exdate] ${symbol}:`, err?.message || err);
    // Return empty payload rather than an error so the UI degrades gracefully
    return res.status(200).json({
      symbol,
      exDividendDate: null,
      dividendDate: null,
      trailingAnnualDividendRate: null,
      dividendYield: null,
      dividendRate: null,
    });
  }
};
