// Vercel serverless function — fetches latest NAV + 30-day chart + 52W H/L from mfapi.in
const https = require("https");

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("Invalid JSON from mfapi")); }
      });
    }).on("error", reject);
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { code } = req.query;
  if (!code) return res.status(400).json({ error: "code required" });

  try {
    const data = await fetchJson(`https://api.mfapi.in/mf/${String(code).trim()}`);
    if (!data?.data?.length) return res.status(200).json({ nav: null, history: [] });

    const latest = data.data[0];
    const latestNav = parseFloat(latest.nav);

    // 52W high/low from last 365 days of data
    const yearData = data.data.slice(0, 365);
    const navValues = yearData.map((d) => parseFloat(d.nav)).filter((n) => !isNaN(n) && n > 0);
    const high52 = navValues.length ? Math.max(...navValues) : null;
    const low52 = navValues.length ? Math.min(...navValues) : null;

    // Previous NAV (yesterday)
    const prevNav = data.data.length > 1 ? parseFloat(data.data[1].nav) : null;
    const navChange = (prevNav && latestNav) ? latestNav - prevNav : null;
    const navChangePct = (prevNav && navChange != null) ? (navChange / prevNav) * 100 : null;

    // 30-day chart — mfapi.in stores newest first, so reverse for chronological order
    const chart = data.data.slice(0, 30).reverse().map((d) => ({
      t: d.date,
      p: parseFloat(d.nav),
    })).filter((pt) => pt.p > 0);

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    return res.status(200).json({
      nav: isNaN(latestNav) ? null : latestNav,
      date: latest.date,
      prevNav: isNaN(prevNav) ? null : prevNav,
      navChange: navChange != null ? Number(navChange.toFixed(4)) : null,
      navChangePct: navChangePct != null ? Number(navChangePct.toFixed(4)) : null,
      high52,
      low52,
      chart,
      schemeName: data.meta?.scheme_name || "",
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
