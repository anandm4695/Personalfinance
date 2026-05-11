const { default: YahooFinance } = require("yahoo-finance2");
const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  try {
    const summary = await yf.quoteSummary(
      String(symbol),
      { modules: ["assetProfile"] },
      { validateResult: false }
    );
    const website = summary?.assetProfile?.website;
    if (website) {
      const domain = new URL(website).hostname.replace(/^www\./, "");
      const logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=604800");
      return res.status(200).json({ logoUrl, domain });
    }
  } catch (_) {}

  res.setHeader("Cache-Control", "s-maxage=3600");
  return res.status(200).json({ logoUrl: null });
};
