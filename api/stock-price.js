// Vercel serverless function — server-side proxy to Yahoo Finance
// Avoids CORS entirely (no browser origin restrictions on server requests)
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
        const r = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              Accept: "application/json",
              "Accept-Language": "en-US,en;q=0.9",
            },
          }
        );
        if (!r.ok) return;
        const data = await r.json();
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (price != null) results[sym] = price;
      } catch (_) {}
    })
  );

  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
  return res.status(200).json(results);
};
