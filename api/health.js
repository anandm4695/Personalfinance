// Lightweight liveness/readiness endpoint for uptime monitoring (UptimeRobot,
// Vercel Monitoring, etc.). Reports config presence and a real Supabase
// round-trip without ever exposing secret values themselves.
const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_EMAIL_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.Resend_Email_API || process.env.RESEND_API_KEY;
  const cronSecretSet = !!process.env.CRON_SECRET;

  const checks = {
    supabaseUrlConfigured: !!supabaseUrl,
    supabaseServiceKeyConfigured: !!serviceKey,
    resendKeyConfigured: !!resendKey,
    cronSecretConfigured: cronSecretSet,
  };

  let dbReachable = null;
  if (supabaseUrl && serviceKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey);
      const { error } = await supabase
        .from("profiles")
        .select("user_id", { count: "exact", head: true })
        .limit(1);
      dbReachable = !error;
    } catch {
      dbReachable = false;
    }
  }

  const healthy =
    checks.supabaseUrlConfigured &&
    checks.supabaseServiceKeyConfigured &&
    checks.cronSecretConfigured &&
    dbReachable !== false;

  return res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    checks: { ...checks, dbReachable },
  });
};
