// Vercel serverless function — automated update of stock prices and mutual fund NAVs
// Triggered by Vercel Cron or manually
const { default: YahooFinance } = require("yahoo-finance2");
const { createClient } = require("@supabase/supabase-js");
const https = require("https");

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_EMAIL_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env vars not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  }
  return createClient(url, key);
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https
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
  });
}

module.exports = async function handler(req, res) {
  // Allow manual execution or cron trigger
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  // Basic security check: Vercel CRON key or authorization header
  const authHeader = req.headers.authorization;
  const isCron = req.headers["x-vercel-cron"] === "true";

  if (!isCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // If not Vercel Cron and no secret, check a simple query param as fallback for easy manual debugging
    const { secret } = req.query;
    if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === "production") {
      return res.status(401).json({ error: "Unauthorized access" });
    }
  }

  try {
    const supabase = getSupabase();

    // 1. Fetch all active stock symbols
    const { data: stocks, error: stockErr } = await supabase
      .from("stocks")
      .select("symbol")
      .not("symbol", "is", null);

    if (stockErr) throw stockErr;

    const uniqueSymbols = [...new Set(stocks.map((s) => s.symbol.trim().toUpperCase()))].filter(
      Boolean
    );

    // 2. Fetch all active mutual fund codes
    const { data: mfs, error: mfErr } = await supabase
      .from("mutual_funds")
      .select("mf_code")
      .not("mf_code", "is", null);

    if (mfErr) throw mfErr;

    const uniqueMfCodes = [...new Set(mfs.map((m) => m.mf_code.trim()))].filter((code) =>
      /^\d+$/.test(code)
    );

    const stockResults = { updated: 0, failed: [] };
    const mfResults = { updated: 0, failed: [] };

    // 3. Fetch Stock prices from Yahoo Finance
    await Promise.allSettled(
      uniqueSymbols.map(async (sym) => {
        try {
          const quote = await yf.quote(sym, {}, { validateResult: false });
          const price =
            quote?.regularMarketPrice ?? quote?.postMarketPrice ?? quote?.preMarketPrice;

          if (price != null && !isNaN(price)) {
            const { error } = await supabase
              .from("stocks")
              .update({ current_price: price })
              .eq("symbol", sym);

            if (error) throw error;
            stockResults.updated++;
          } else {
            stockResults.failed.push({ symbol: sym, reason: "No price returned from API" });
          }
        } catch (err) {
          console.error(`[cron-update-prices] Failed stock ${sym}:`, err.message);
          stockResults.failed.push({ symbol: sym, reason: err.message });
        }
      })
    );

    // 4. Fetch Mutual Fund NAVs from MFAPI
    await Promise.allSettled(
      uniqueMfCodes.map(async (code) => {
        try {
          const data = await fetchJson(`https://api.mfapi.in/mf/${code}`);
          if (data?.data?.length > 0) {
            const latestNav = parseFloat(data.data[0].nav);
            if (!isNaN(latestNav)) {
              const { error } = await supabase
                .from("mutual_funds")
                .update({ current_nav: latestNav })
                .eq("mf_code", code);

              if (error) throw error;
              mfResults.updated++;
            } else {
              mfResults.failed.push({ code, reason: "Invalid NAV format" });
            }
          } else {
            mfResults.failed.push({ code, reason: "No data returned from api.mfapi.in" });
          }
        } catch (err) {
          console.error(`[cron-update-prices] Failed MF ${code}:`, err.message);
          mfResults.failed.push({ code, reason: err.message });
        }
      })
    );

    return res.status(200).json({
      status: "success",
      timestamp: new Date().toISOString(),
      stocks: {
        total_unique: uniqueSymbols.length,
        updated: stockResults.updated,
        failed: stockResults.failed,
      },
      mutual_funds: {
        total_unique: uniqueMfCodes.length,
        updated: mfResults.updated,
        failed: mfResults.failed,
      },
    });
  } catch (err) {
    console.error("[cron-update-prices] Fatal error:", err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
};
