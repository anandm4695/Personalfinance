// Vercel serverless function — uses yahoo-finance2 which handles
// Yahoo Finance cookie/crumb auth automatically (no CORS issues server-side)
const { default: YahooFinance } = require("yahoo-finance2");
const { rateLimit } = require("./_lib/rateLimit");

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
  if (!rateLimit(req, res, { max: 30, windowMs: 60_000 })) return;

  const { symbols } = req.query;
  if (!symbols) return res.status(400).json({ error: "symbols query param required" });

  const symList = String(symbols)
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && /^[A-Z0-9.\-&]+$/i.test(s) && s.length <= 20)
    .slice(0, 30);

  const results = {};

  await Promise.allSettled(
    symList.map(async (sym) => {
      try {
        // Fetch both quote and quoteSummary to get price, sector, and marketCap
        const [quote, summary] = await Promise.all([
          yf.quote(sym, {}, { validateResult: false, ...yfFetchOptions() }),
          yf
            .quoteSummary(
              sym,
              { modules: ["assetProfile", "summaryDetail", "price", "calendarEvents"] },
              yfFetchOptions()
            )
            .catch(() => null),
        ]);

        const price = quote?.regularMarketPrice ?? quote?.postMarketPrice ?? quote?.preMarketPrice;

        // exDividendDate/dividendDate come back as Date objects from yahoo-finance2
        const toUnix = (val) => {
          if (!val) return null;
          if (val instanceof Date) return Math.floor(val.getTime() / 1000);
          const n = Number(val);
          return isNaN(n) ? null : n;
        };

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
            sector: summary?.assetProfile?.sector ?? null,
            marketCap:
              summary?.price?.marketCap ??
              summary?.summaryDetail?.marketCap ??
              quote?.marketCap ??
              null,
            // Dividend fields — piggybacked onto the price poll that already runs
            // app-wide so alerts/other tabs can read ex-dividend dates without a
            // second Yahoo round-trip (see api/stock-exdate.js for the dedicated,
            // higher-detail endpoint the Dividend Calendar tab still uses).
            exDividendDate: toUnix(
              summary?.calendarEvents?.exDividendDate ?? summary?.summaryDetail?.exDividendDate ?? null
            ),
            dividendDate: toUnix(summary?.calendarEvents?.dividendDate ?? null),
            dividendRate: summary?.summaryDetail?.dividendRate ?? null,
            dividendYield: summary?.summaryDetail?.dividendYield ?? null,
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
