// Vercel serverless function — Daily/Weekly/Monthly email summary sender
// Triggered by Vercel Cron (GET) or manually from Settings UI (POST)
const { Resend } = require("resend");
const { createClient } = require("@supabase/supabase-js");

const RESEND_KEY = process.env.Resend_Email_API || process.env.RESEND_API_KEY;
const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

// Allow a verified custom domain via RESEND_FROM_EMAIL env var.
// If unset, falls back to the Resend test sender which can ONLY deliver
// to the email address used to register the Resend account.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const FROM_ADDR = `Personal Finance <${FROM_EMAIL}>`;

const PUBLIC_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "zoho.com",
  "protonmail.com",
  "proton.me",
];

function getEffectiveFromEmail(userFromEmail) {
  if (!userFromEmail || !userFromEmail.trim()) return FROM_EMAIL;
  const email = userFromEmail.trim();
  const domain = email.split("@")[1]?.toLowerCase();
  if (PUBLIC_DOMAINS.includes(domain)) {
    return FROM_EMAIL;
  }
  return email;
}

// ── Supabase admin client (service role bypasses RLS) ─────────────────────────
// VITE_ prefix is Vercel-set for the frontend build; API routes also see it.
// SUPABASE_URL is the conventional non-prefixed fallback for pure server use.
function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_EMAIL_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Supabase env vars not configured (VITE_SUPABASE_URL / SUPABASE_SERVICE_EMAIL_ROLE_KEY)"
    );
  return createClient(url, key);
}

// ── IST offset helpers ─────────────────────────────────────────────────────────
function nowIST() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 330); // UTC+5:30
  return d;
}

function istHour() {
  return nowIST().getUTCHours();
}

function istDayOfWeek() {
  return nowIST().getUTCDay(); // 0=Sun,1=Mon,...,6=Sat
}

function istDate() {
  return nowIST().getUTCDate();
}

// ── Number formatters ─────────────────────────────────────────────────────────
function fmtINR(n) {
  const v = Math.abs(Number(n) || 0);
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(1)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
}
function fmtINRFull(n) {
  return `₹${Math.round(Math.abs(Number(n) || 0)).toLocaleString("en-IN")}`;
}
function sign(n) {
  return n >= 0 ? "+" : "-";
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function dateLabel(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function weekRange() {
  const ist = nowIST();
  const day = ist.getUTCDay(); // 0=Sun
  const mon = new Date(ist);
  mon.setUTCDate(ist.getUTCDate() - ((day + 6) % 7));
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  return `${dateLabel(mon.toISOString())} – ${dateLabel(sun.toISOString())}`;
}

function monthLabel() {
  return nowIST().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

// ── Compute all summary metrics from state ─────────────────────────────────────
function computeSummary(state) {
  const now = nowIST();
  const m = now.getUTCMonth();
  const y = now.getUTCFullYear();

  // ── Net worth ──────────────────────────────────────────────────────────────
  const bankTotal = (state.bankAccounts || []).reduce((s, b) => s + (Number(b.balance) || 0), 0);
  const mfTotal = (state.mutualFunds || []).reduce(
    (s, x) => s + (Number(x.currentValue || x.invested) || 0),
    0
  );
  const stockTotal = (state.stocks || []).reduce(
    (s, x) => s + (Number(x.qty) || 0) * (Number(x.currentPrice || x.avgPrice || x.buyPrice) || 0),
    0
  );
  const fdTotal = (state.fixedDeposits || []).reduce((s, x) => s + (Number(x.principal) || 0), 0);
  const rdTotal = (state.recurringDeposits || []).reduce(
    (s, x) => s + (Number(x.balance || x.invested || x.principal) || 0),
    0
  );
  const ppfTotal = (state.ppf || []).reduce(
    (s, x) => s + (Number(x.currentValue || x.balance || x.invested) || 0),
    0
  );
  const npsTotal = (state.nps || []).reduce(
    (s, x) => s + (Number(x.currentValue || x.balance || x.invested) || 0),
    0
  );
  const epfTotal = (state.epf || []).reduce(
    (s, x) => s + (Number(x.balance || x.currentValue || x.invested) || 0),
    0
  );
  const bondsTotal = (state.bonds || []).reduce(
    (s, x) => s + (Number(x.faceValue || x.invested) || 0),
    0
  );

  const investTotal =
    mfTotal + stockTotal + fdTotal + rdTotal + ppfTotal + npsTotal + epfTotal + bondsTotal;

  const activeCards = (state.creditCards || []).filter(
    (c) => (c.status || "active").toLowerCase() !== "closed"
  );
  const creditOutstanding = activeCards.reduce((s, c) => s + (Number(c.outstanding) || 0), 0);
  const creditLimit = activeCards.reduce((s, c) => s + (Number(c.limit || c.cardLimit) || 0), 0);
  const creditUtil = creditLimit > 0 ? Math.round((creditOutstanding / creditLimit) * 100) : 0;
  const loanOutstanding = (state.loansTaken || []).reduce(
    (s, l) => s + (Number(l.outstanding || l.principal) || 0),
    0
  );
  const rentalAssets = (state.rentalProperties || []).reduce(
    (s, r) => s + Number(r.propertyValue || r.property_value || 0),
    0
  );
  const netWorth = bankTotal + investTotal + rentalAssets - creditOutstanding - loanOutstanding;

  // ── Cash flow (current month) ──────────────────────────────────────────────
  // Transactions are stored with positive amounts and a type field ("credit"/"debit").
  // Older fallback: negative amounts for expenses — support both patterns.
  const monthTxns = (state.transactions || []).filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === m && d.getFullYear() === y;
  });
  const isDebit = (t) => t.type === "debit" || (!t.type && Number(t.amount) < 0);
  const isCredit = (t) => t.type === "credit" || (!t.type && Number(t.amount) > 0);
  const monthExpense = monthTxns
    .filter(isDebit)
    .reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
  // Income: explicit income ledger (if populated) → else credit transactions
  const explicitIncome = (state.income || [])
    .filter((i) => {
      const d = new Date(i.date || `${y}-${String(m + 1).padStart(2, "0")}-01`);
      return d.getMonth() === m && d.getFullYear() === y;
    })
    .reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const txnIncome = monthTxns
    .filter(isCredit)
    .reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0);
  const monthIncome = explicitIncome > 0 ? explicitIncome : txnIncome;
  const netSavings = monthIncome - monthExpense;
  const savingsPct = monthIncome > 0 ? Math.round((netSavings / monthIncome) * 100) : 0;

  // ── Top spending categories this month ────────────────────────────────────
  const catMap = {};
  monthTxns.filter(isDebit).forEach((t) => {
    const cat = t.category || "Other";
    catMap[cat] = (catMap[cat] || 0) + Math.abs(Number(t.amount));
  });
  const topCats = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([cat, amt]) => ({ cat, amt }));

  // ── Budget health ─────────────────────────────────────────────────────────
  const curMonthStr = `${y}-${String(m + 1).padStart(2, "0")}`;

  // Group budgets by category
  const categoriesMap = {};
  (state.budgets || []).forEach((b) => {
    const cat = b.category;
    if (!categoriesMap[cat]) categoriesMap[cat] = [];
    categoriesMap[cat].push(b);
  });

  const filteredBudgets = [];
  Object.keys(categoriesMap).forEach((cat) => {
    const list = categoriesMap[cat];
    const specific = list.find(
      (b) => b.budgetMonth === curMonthStr || b.budget_month === curMonthStr
    );
    if (specific) {
      filteredBudgets.push(specific);
    } else {
      const baseline = list.find((b) => !b.budgetMonth && !b.budget_month);
      if (baseline) {
        filteredBudgets.push(baseline);
      } else {
        const prior = list
          .filter(
            (b) =>
              (b.budgetMonth && b.budgetMonth < curMonthStr) ||
              (b.budget_month && b.budget_month < curMonthStr)
          )
          .sort((a, b) => {
            const mA = a.budgetMonth || a.budget_month || "";
            const mB = b.budgetMonth || b.budget_month || "";
            return mB.localeCompare(mA);
          });
        if (prior.length > 0) {
          filteredBudgets.push(prior[0]);
        } else if (list.length > 0) {
          filteredBudgets.push(list[0]);
        }
      }
    }
  });

  const budgetStatus = filteredBudgets
    .map((b) => {
      const spent = catMap[b.category] || 0;
      const limit = Number(b.monthly || b.monthlyLimit || b.monthly_limit || 0);
      const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      return { category: b.category, spent, limit, pct, over: pct > 100 };
    })
    .sort((a, b) => b.pct - a.pct);

  // ── Upcoming dues (next 7 days) ───────────────────────────────────────────
  const today = nowIST();
  const todayMs = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const in7Ms = todayMs + 7 * 86400000;

  const dues = [];

  // Subscriptions — app stores renewal date as renewalDate
  (state.subscriptions || [])
    .filter((s) => !s.paused && s.status !== "cancelled")
    .forEach((s) => {
      const next = new Date(s.renewalDate || s.nextDue || s.startDate || today.toISOString());
      next.setUTCHours(0, 0, 0, 0);
      const nextMs = next.getTime();
      if (nextMs >= todayMs && nextMs <= in7Ms) {
        dues.push({ date: next, label: s.name, amount: Number(s.amount) || 0, type: "sub" });
      }
    });

  // Rent dues for rented properties
  (state.rentedProperties || [])
    .filter((p) => Number(p.monthlyRent || 0) > 0)
    .forEach((p) => {
      const dueDay = Number(p.dueDay || p.due_day || 5);
      const curMonthStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
      const paidCurrent = (p.payments || []).some(
        (pay) => pay.date && pay.date.startsWith(curMonthStr)
      );
      if (!paidCurrent) {
        const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), dueDay));
        if (d.getTime() >= todayMs && d.getTime() <= in7Ms)
          dues.push({
            date: d,
            label: `${p.propertyName || p.property_name || "Rent"}`,
            amount: Number(p.monthlyRent || p.monthly_rent || 0),
            type: "emi",
          });
      }
    });

  // Credit card due dates
  activeCards.forEach((c) => {
    if (!c.dueDay || !Number(c.outstanding)) return;
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), Number(c.dueDay)));
    if (d.getTime() < todayMs) d.setUTCMonth(d.getUTCMonth() + 1);
    if (d.getTime() >= todayMs && d.getTime() <= in7Ms) {
      dues.push({
        date: d,
        label: `${c.issuer} CC Bill`,
        amount: Number(c.outstanding) || 0,
        type: "cc",
      });
    }
  });

  // Loan EMI dates
  (state.loansTaken || []).forEach((l) => {
    if (!l.emiDate && !l.dueDay) return;
    const day = Number(l.emiDate || l.dueDay);
    if (!day) return;
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), day));
    if (d.getTime() < todayMs) d.setUTCMonth(d.getUTCMonth() + 1);
    if (d.getTime() >= todayMs && d.getTime() <= in7Ms) {
      dues.push({
        date: d,
        label: `${l.lender || l.lenderBorrower || "Loan"} EMI`,
        amount: Number(l.emi) || 0,
        type: "emi",
      });
    }
  });

  // Reminders
  (state.reminders || [])
    .filter((r) => !r.done)
    .forEach((r) => {
      const d = new Date(r.date || r.reminderDate || "");
      if (isNaN(d.getTime())) return;
      d.setUTCHours(0, 0, 0, 0);
      if (d.getTime() >= todayMs && d.getTime() <= in7Ms) {
        dues.push({
          date: d,
          label: r.title || r.note || "Reminder",
          amount: Number(r.amount) || 0,
          type: "reminder",
        });
      }
    });

  dues.sort((a, b) => a.date - b.date);

  // ── Goals ─────────────────────────────────────────────────────────────────
  const goals = (state.goals || []).slice(0, 4).map((g) => {
    const target = Number(g.targetAmount || g.target) || 0;
    const current = Number(g.currentAmount || g.current || g.saved) || 0;
    const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
    return { name: g.name || g.category, pct, current, target };
  });

  // ── Alerts ────────────────────────────────────────────────────────────────
  const alerts = [];
  if (creditUtil >= 70)
    alerts.push({
      type: "warn",
      msg: `Credit utilization at ${creditUtil}% — consider paying down outstanding`,
    });
  budgetStatus
    .filter((b) => b.over)
    .forEach((b) =>
      alerts.push({
        type: "warn",
        msg: `${b.category} budget exceeded: spent ${fmtINR(b.spent)} of ${fmtINR(b.limit)} (${b.pct}%)`,
      })
    );
  const overdueDues = dues.filter((d) => d.date.getTime() < todayMs);
  if (overdueDues.length)
    alerts.push({
      type: "alert",
      msg: `${overdueDues.length} overdue payment${overdueDues.length > 1 ? "s" : ""} need attention`,
    });
  if (savingsPct < 20 && monthIncome > 0)
    alerts.push({ type: "info", msg: `Savings rate this month: ${savingsPct}% — aim for 20%+` });

  return {
    netWorth,
    bankTotal,
    investTotal,
    mfTotal,
    stockTotal,
    fdTotal,
    rdTotal,
    creditOutstanding,
    creditLimit,
    creditUtil,
    loanOutstanding,
    monthExpense,
    monthIncome,
    netSavings,
    savingsPct,
    topCats,
    budgetStatus,
    dues,
    goals,
    alerts,
    activeCardCount: activeCards.length,
    activeCards,
  };
}

// ── HTML email template ──────────────────────────────────────────────────────
function generateHTML(summary, frequency, recipientName) {
  const {
    netWorth,
    bankTotal,
    investTotal,
    mfTotal,
    stockTotal,
    fdTotal,
    rdTotal,
    creditOutstanding,
    creditUtil,
    activeCardCount,
    activeCards,
    monthExpense,
    monthIncome,
    netSavings,
    savingsPct,
    topCats,
    dues,
    goals,
    alerts,
    budgetStatus,
  } = summary;
  const fdRdTotal = (fdTotal || 0) + (rdTotal || 0);

  const ist = nowIST();
  const dateStr = ist.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const periodLabel =
    frequency === "weekly"
      ? `Week of ${weekRange()}`
      : frequency === "monthly"
        ? monthLabel()
        : dateStr;

  const posColor = "#10b981";
  const negColor = "#ef4444";
  const warnColor = "#f59e0b";
  const accentColor = "#6366f1";
  const navyBg = "#0f172a";
  const cardBg = "#ffffff";
  const bodyBg = "#f1f5f9";
  const textPrimary = "#0f172a";
  const textMuted = "#64748b";
  const borderColor = "#e2e8f0";

  const pct = (val, total) => (total > 0 ? Math.min(Math.round((val / total) * 100), 100) : 0);

  function progressBar(pct, color = accentColor, height = 6) {
    return `
      <div style="background:#e2e8f0;border-radius:99px;height:${height}px;overflow:hidden;margin-top:6px;">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:99px;transition:width 0.3s;"></div>
      </div>`;
  }

  function statBox(label, value, sub = "", color = textPrimary) {
    return `
      <td style="padding:14px 18px;vertical-align:top;">
        <div style="font-size:11px;color:${textMuted};text-transform:uppercase;letter-spacing:0.08em;font-weight:600;margin-bottom:4px;">${label}</div>
        <div style="font-size:22px;font-weight:800;color:${color};letter-spacing:-0.02em;">${value}</div>
        ${sub ? `<div style="font-size:12px;color:${textMuted};margin-top:2px;">${sub}</div>` : ""}
      </td>`;
  }

  function sectionHeader(title, emoji) {
    return `
      <tr><td style="padding:28px 28px 12px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:16px;">${emoji}</span>
          <span style="font-size:13px;font-weight:800;color:${textMuted};text-transform:uppercase;letter-spacing:0.12em;">${title}</span>
        </div>
        <div style="height:1px;background:${borderColor};margin-top:10px;"></div>
      </td></tr>`;
  }

  // ── Upcoming dues rows ────────────────────────────────────────────────────
  const dueRows = dues
    .slice(0, 6)
    .map((d) => {
      const icon =
        d.type === "cc" ? "💳" : d.type === "emi" ? "🏠" : d.type === "sub" ? "📱" : "📌";
      const isPast = d.date.getTime() < Date.now();
      return `
      <tr>
        <td style="padding:8px 28px;border-bottom:1px solid #f8fafc;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-size:13px;color:${textPrimary};font-weight:500;">${icon} ${d.label}</td>
            <td style="font-size:12px;color:${textMuted};text-align:center;">${d.date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
            <td style="font-size:13px;font-weight:700;color:${isPast ? negColor : textPrimary};text-align:right;">${d.amount > 0 ? fmtINRFull(d.amount) : "—"}</td>
          </tr></table>
        </td>
      </tr>`;
    })
    .join("");

  // ── Goals rows ────────────────────────────────────────────────────────────
  const goalRows = goals
    .map((g) => {
      const barColor = g.pct >= 80 ? posColor : g.pct >= 50 ? accentColor : warnColor;
      return `
      <tr><td style="padding:10px 28px;border-bottom:1px solid #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;font-weight:600;color:${textPrimary};">${g.name}</td>
            <td style="font-size:12px;font-weight:800;color:${barColor};text-align:right;">${g.pct}%</td>
          </tr>
        </table>
        ${progressBar(g.pct, barColor, 5)}
        <div style="font-size:11px;color:${textMuted};margin-top:4px;">${fmtINR(g.current)} of ${fmtINR(g.target)}</div>
      </td></tr>`;
    })
    .join("");

  // ── Top spending rows ─────────────────────────────────────────────────────
  const maxCatAmt = topCats[0]?.amt || 1;
  const catRows = topCats
    .map(({ cat, amt }) => {
      const p = pct(amt, monthExpense);
      return `
      <tr><td style="padding:8px 28px;border-bottom:1px solid #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;color:${textPrimary};font-weight:500;">${cat}</td>
            <td style="font-size:12px;font-weight:700;color:${textPrimary};text-align:right;">${fmtINRFull(amt)} <span style="color:${textMuted};font-weight:400;">(${p}%)</span></td>
          </tr>
        </table>
        ${progressBar(pct(amt, maxCatAmt), "#6366f130", 4)}
      </td></tr>`;
    })
    .join("");

  // ── Alert rows ────────────────────────────────────────────────────────────
  const alertRows = alerts
    .map((a) => {
      const icon = a.type === "alert" ? "🚨" : a.type === "warn" ? "⚠️" : "💡";
      const bg = a.type === "alert" ? "#fef2f2" : a.type === "warn" ? "#fffbeb" : "#f0fdf4";
      const border = a.type === "alert" ? negColor : a.type === "warn" ? warnColor : posColor;
      return `
      <tr><td style="padding:6px 28px;">
        <div style="background:${bg};border-left:3px solid ${border};border-radius:0 6px 6px 0;padding:8px 12px;font-size:13px;color:${textPrimary};">
          ${icon} ${a.msg}
        </div>
      </td></tr>`;
    })
    .join("");

  // ── Credit card quick list ────────────────────────────────────────────────
  const ccRows = activeCards
    .slice(0, 4)
    .map((c) => {
      const out = Number(c.outstanding) || 0;
      const lim = Number(c.limit || c.cardLimit) || 0;
      const u = lim > 0 ? Math.round((out / lim) * 100) : 0;
      const uColor = u >= 70 ? negColor : u >= 40 ? warnColor : posColor;
      return `
      <tr><td style="padding:8px 28px;border-bottom:1px solid #f8fafc;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;font-weight:600;color:${textPrimary};">${c.issuer} <span style="color:${textMuted};font-weight:400;font-size:11px;">••${c.last4 || "**"}</span></td>
            <td style="text-align:right;">
              <span style="font-size:13px;font-weight:700;color:${textPrimary};">${fmtINR(out)}</span>
              <span style="font-size:11px;color:${uColor};font-weight:600;margin-left:6px;">${u}% used</span>
            </td>
          </tr>
        </table>
      </td></tr>`;
    })
    .join("");

  // ── Savings rate colour ───────────────────────────────────────────────────
  const savColor = savingsPct >= 30 ? posColor : savingsPct >= 15 ? warnColor : negColor;
  const netSavColor = netSavings >= 0 ? posColor : negColor;

  const subjectEmoji = frequency === "daily" ? "📅" : frequency === "weekly" ? "📊" : "📈";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Finance Summary</title>
</head>
<body style="margin:0;padding:0;background:${bodyBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:${bodyBg};padding:24px 16px;">
<tr><td>
<table width="600" cellpadding="0" cellspacing="0" align="center" style="max-width:600px;margin:0 auto;">

  <!-- HEADER -->
  <tr><td style="background:${navyBg};border-radius:16px 16px 0 0;padding:28px 28px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">Personal Finance</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.55);margin-top:3px;">${periodLabel}</div>
      </td>
      <td style="text-align:right;vertical-align:top;">
        <div style="display:inline-block;background:rgba(99,102,241,0.25);border:1px solid rgba(99,102,241,0.4);border-radius:8px;padding:6px 12px;">
          <span style="font-size:12px;font-weight:700;color:#a5b4fc;text-transform:uppercase;letter-spacing:0.08em;">
            ${frequency === "daily" ? "Daily" : frequency === "weekly" ? "Weekly" : "Monthly"} Report
          </span>
        </div>
      </td>
    </tr></table>
  </td></tr>

  <!-- NET WORTH HERO -->
  <tr><td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e1b4b 100%);padding:28px;">
    <div style="font-size:11px;font-weight:700;color:rgba(165,180,252,0.8);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">Total Net Worth</div>
    <div style="font-size:38px;font-weight:900;color:#ffffff;letter-spacing:-0.03em;line-height:1;">${fmtINRFull(netWorth)}</div>
    <div style="margin-top:20px;display:flex;gap:0;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="padding:0 16px 0 0;border-right:1px solid rgba(255,255,255,0.12);">
          <div style="font-size:10px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.08em;">Cash & Banks</div>
          <div style="font-size:17px;font-weight:700;color:#fff;margin-top:3px;">${fmtINR(bankTotal)}</div>
        </td>
        <td style="padding:0 16px;border-right:1px solid rgba(255,255,255,0.12);">
          <div style="font-size:10px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.08em;">Investments</div>
          <div style="font-size:17px;font-weight:700;color:#a5b4fc;margin-top:3px;">${fmtINR(investTotal)}</div>
        </td>
        <td style="padding:0 0 0 16px;">
          <div style="font-size:10px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.08em;">Credit Due</div>
          <div style="font-size:17px;font-weight:700;color:#fca5a5;margin-top:3px;">${fmtINR(creditOutstanding)}</div>
        </td>
      </tr></table>
    </div>
  </td></tr>

  <!-- CASHFLOW -->
  ${sectionHeader("Monthly Cash Flow", "💸")}
  <tr><td style="background:${cardBg};padding:0 28px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      ${statBox("Income", fmtINRFull(monthIncome), "This month", posColor)}
      <td style="width:1px;background:${borderColor};"></td>
      ${statBox("Expenses", fmtINRFull(monthExpense), "This month", negColor)}
      <td style="width:1px;background:${borderColor};"></td>
      ${statBox("Net Saved", fmtINRFull(Math.abs(netSavings)), netSavings >= 0 ? `${savingsPct}% savings rate` : "Overspent", netSavColor)}
    </tr></table>
    ${
      monthIncome > 0
        ? `
    <div style="padding:0 0 4px;">
      <div style="display:flex;justify-content:space-between;font-size:11px;color:${textMuted};margin-bottom:4px;">
        <span>Savings rate</span><span style="color:${savColor};font-weight:700;">${savingsPct}%</span>
      </div>
      ${progressBar(savingsPct, savColor, 5)}
    </div>`
        : ""
    }
  </td></tr>

  <!-- INVESTMENTS BREAKDOWN -->
  ${
    investTotal > 0
      ? `
  ${sectionHeader("Investment Portfolio", "📈")}
  <tr><td style="background:${cardBg};padding:0 28px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      ${mfTotal > 0 ? statBox("Mutual Funds", fmtINR(mfTotal), `${pct(mfTotal, investTotal)}% of portfolio`) : ""}
      ${stockTotal > 0 ? statBox("Stocks", fmtINR(stockTotal), `${pct(stockTotal, investTotal)}% of portfolio`) : ""}
      ${fdRdTotal > 0 ? statBox("FDs & RDs", fmtINR(fdRdTotal), "Fixed income") : ""}
    </tr></table>
  </td></tr>`
      : ""
  }

  <!-- CREDIT CARDS -->
  ${
    activeCardCount > 0
      ? `
  ${sectionHeader(`Credit Cards (${creditUtil}% utilized)`, "💳")}
  <tr><td style="background:${cardBg};">
    ${ccRows}
  </td></tr>`
      : ""
  }

  <!-- TOP SPENDING -->
  ${
    topCats.length > 0
      ? `
  ${sectionHeader("Top Spending This Month", "🛍️")}
  <tr><td style="background:${cardBg};">
    ${catRows}
  </td></tr>`
      : ""
  }

  <!-- GOALS -->
  ${
    goals.length > 0
      ? `
  ${sectionHeader("Goal Progress", "🎯")}
  <tr><td style="background:${cardBg};">
    ${goalRows}
  </td></tr>`
      : ""
  }

  <!-- UPCOMING DUES -->
  ${
    dues.length > 0
      ? `
  ${sectionHeader("Upcoming Dues — Next 7 Days", "📅")}
  <tr><td style="background:${cardBg};">
    <tr><td style="padding:8px 28px 4px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr style="background:#f8fafc;">
          <td style="font-size:10px;font-weight:700;color:${textMuted};text-transform:uppercase;letter-spacing:0.08em;padding:6px 0;">Item</td>
          <td style="font-size:10px;font-weight:700;color:${textMuted};text-transform:uppercase;letter-spacing:0.08em;padding:6px 0;text-align:center;">Date</td>
          <td style="font-size:10px;font-weight:700;color:${textMuted};text-transform:uppercase;letter-spacing:0.08em;padding:6px 0;text-align:right;">Amount</td>
        </tr>
      </table>
    </td></tr>
    ${dueRows}
    ${dues.length === 0 ? `<tr><td style="padding:16px 28px;font-size:13px;color:${textMuted};">No upcoming dues in the next 7 days ✓</td></tr>` : ""}
  </td></tr>`
      : ""
  }

  <!-- ALERTS -->
  ${
    alerts.length > 0
      ? `
  ${sectionHeader("Alerts & Insights", "⚡")}
  <tr><td style="background:${cardBg};padding-bottom:16px;">
    ${alertRows}
  </td></tr>`
      : ""
  }

  <!-- NO ALERTS GOOD NEWS -->
  ${
    alerts.length === 0
      ? `
  <tr><td style="background:${cardBg};border-top:1px solid ${borderColor};padding:20px 28px;text-align:center;">
    <div style="font-size:24px;margin-bottom:8px;">✅</div>
    <div style="font-size:14px;font-weight:700;color:${posColor};">Everything looks good!</div>
    <div style="font-size:12px;color:${textMuted};margin-top:4px;">No alerts, budgets on track, finances healthy.</div>
  </td></tr>`
      : ""
  }

  <!-- FOOTER -->
  <tr><td style="background:${navyBg};border-radius:0 0 16px 16px;padding:20px 28px;text-align:center;">
    <div style="font-size:12px;color:rgba(255,255,255,0.4);line-height:1.6;">
      Personal Finance by Anand Mohta &nbsp;·&nbsp; ${dateStr}<br>
      <a href="https://personal-finance-by-anand-mohta.vercel.app" style="color:rgba(165,180,252,0.7);text-decoration:none;">Open Dashboard →</a>
      &nbsp;·&nbsp;
      <a href="https://personal-finance-by-anand-mohta.vercel.app/#settings" style="color:rgba(255,255,255,0.3);text-decoration:none;font-size:11px;">Manage email settings</a>
    </div>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Fetch all state from Supabase (service role) ──────────────────────────────
async function fetchStateFromSupabase(supabase, userId) {
  const [
    banks,
    txns,
    mfs,
    stks,
    fds,
    rds,
    bnds,
    pn,
    ccs,
    lns,
    gls,
    bdgts,
    subs,
    rems,
    rentals,
    incomeQ,
  ] = await Promise.all([
    supabase.from("bank_accounts").select("*").eq("user_id", userId),
    supabase.from("transactions").select("*").eq("user_id", userId),
    supabase.from("mutual_funds").select("*").eq("user_id", userId),
    supabase.from("stocks").select("*").eq("user_id", userId),
    supabase.from("fixed_deposits").select("*").eq("user_id", userId),
    supabase.from("recurring_deposits").select("*").eq("user_id", userId),
    supabase.from("bonds").select("*").eq("user_id", userId),
    supabase.from("ppf_nps").select("*").eq("user_id", userId),
    supabase.from("credit_cards").select("*").eq("user_id", userId),
    supabase.from("loans").select("*").eq("user_id", userId),
    supabase.from("goals").select("*").eq("user_id", userId),
    supabase.from("budgets").select("*").eq("user_id", userId),
    supabase.from("subscriptions").select("*").eq("user_id", userId),
    supabase.from("reminders").select("*").eq("user_id", userId),
    supabase
      .from("rental_properties")
      .select("*")
      .eq("user_id", userId)
      .then(
        (res) => res,
        () => ({ data: [] })
      ),
    supabase
      .from("income_entries")
      .select("*")
      .eq("user_id", userId)
      .then(
        (res) => res,
        () => ({ data: [] })
      ),
  ]);

  const rentalData = rentals.data || [];
  return {
    bankAccounts: banks.data || [],
    transactions: txns.data || [],
    mutualFunds: mfs.data || [],
    stocks: stks.data || [],
    fixedDeposits: fds.data || [],
    recurringDeposits: rds.data || [],
    bonds: bnds.data || [],
    ppf: (pn.data || []).filter((x) => x.type === "PPF"),
    nps: (pn.data || []).filter((x) => x.type === "NPS"),
    epf: (pn.data || []).filter((x) => x.type === "EPF"),
    creditCards: (ccs.data || []).map((c) => ({
      ...c,
      limit: c.card_limit ?? c.limit,
      outstanding: c.outstanding,
    })),
    loansTaken: (lns.data || []).filter((x) => !x.is_lent),
    goals: gls.data || [],
    budgets: (bdgts.data || []).map((b) => ({ ...b, monthly: b.monthly_limit ?? b.monthly })),
    subscriptions: subs.data || [],
    reminders: (rems.data || []).map((r) => ({ ...r, date: r.reminder_date ?? r.date })),
    income: (incomeQ.data || []).map((i) => ({ ...i, date: i.date ?? i.income_date })),
    rentalProperties: rentalData
      .filter((x) => x.property_type === "out")
      .map((r) => ({
        ...r,
        rent: r.monthly_rent,
        propertyValue: Number(r.property_value || 0),
      })),
    rentedProperties: rentalData
      .filter((x) => x.property_type === "in")
      .map((r) => ({
        ...r,
        monthlyRent: r.monthly_rent,
        dueDay: r.due_day,
        payments: r.payments || [],
      })),
  };
}

// ── Check if current IST day matches user's schedule ─────────────────────────
// Cron fires once daily at 8AM IST — only check frequency + day, not hour.
function shouldSendNow(settings, frequency) {
  const freq = frequency || settings.emailFrequency || settings.email_frequency || "weekly";

  if (freq === "daily") return true;

  if (freq === "weekly") {
    const configDay = Number(settings.emailDay ?? settings.email_day ?? 1); // 1=Mon default
    return istDayOfWeek() === configDay;
  }

  if (freq === "monthly") {
    const configDate = Number(settings.emailDay ?? settings.email_day ?? 1);
    return istDate() === configDate;
  }

  return false;
}

// ── Subject line ──────────────────────────────────────────────────────────────
function buildSubject(frequency, netWorth) {
  const ist = nowIST();
  const emoji = frequency === "daily" ? "📅" : frequency === "weekly" ? "📊" : "📈";
  const period =
    frequency === "daily"
      ? ist.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })
      : frequency === "weekly"
        ? `Week of ${weekRange()}`
        : monthLabel();
  return `${emoji} Your ${frequency === "daily" ? "Daily" : frequency === "weekly" ? "Weekly" : "Monthly"} Finance Report — ${period} | Net Worth ${fmtINR(netWorth)}`;
}

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  // ── Health check — called by Settings UI to diagnose config ───────────────
  if (req.method === "GET" && req.query?.action === "healthcheck") {
    const isTestDomain = FROM_EMAIL === "onboarding@resend.dev";
    const hasServiceKey = !!(
      process.env.SUPABASE_SERVICE_EMAIL_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    // A custom fromEmail in the query (passed from UI) means the user configured one — treat as non-test
    const uiFromEmail = req.query?.fromEmail;
    const effectiveFrom = uiFromEmail || FROM_EMAIL;
    const effectiveIsTest = effectiveFrom === "onboarding@resend.dev";
    return res.status(200).json({
      resendKey: !!RESEND_KEY,
      supabaseServiceKey: hasServiceKey,
      supabaseUrl: !!process.env.VITE_SUPABASE_URL,
      fromEmail: effectiveFrom,
      usingTestDomain: effectiveIsTest,
      testDomainWarning: effectiveIsTest
        ? "The test sender onboarding@resend.dev can ONLY deliver to the email address you used to sign up with Resend. Enter your Resend account email in the 'Sender Email' field below to fix this."
        : null,
      ready: !!RESEND_KEY && hasServiceKey && !effectiveIsTest,
    });
  }

  // ── Determine request type ───────────────────────────────────────────────
  const action = req.query?.action;
  const isCron = req.method === "GET" && action === "cron";
  const isManual = req.method === "POST";

  // ── Cron auth ─────────────────────────────────────────────────────────────
  if (isCron) {
    console.log(
      `[send-summary] Cron triggered at ${new Date().toISOString()} (IST: ${nowIST().toISOString()})`
    );
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers["authorization"];
    // Vercel automatically sends Authorization: Bearer <CRON_SECRET> when CRON_SECRET is set
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error("[send-summary] Cron auth failed — Authorization header mismatch");
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!cronSecret) {
      console.warn(
        "[send-summary] CRON_SECRET not set — cron endpoint is unauthenticated. Add CRON_SECRET to Vercel env vars."
      );
    }
  }

  try {
    if (isManual) {
      // ── Manual "Send Test" from Settings UI ─────────────────────────────
      const { state, emailTo, frequency, recipientName, fromEmail } = req.body || {};
      if (!state || !emailTo) return res.status(400).json({ error: "state and emailTo required" });
      if (!RESEND_KEY)
        return res.status(500).json({
          error:
            "Resend API key not configured. Add Resend_Email_API to Vercel environment variables.",
        });

      // Use fromEmail from the request body if provided (user configured it in Settings UI),
      // otherwise fall back to the RESEND_FROM_EMAIL env var or the test sender.
      const effectiveFromEmail = getEffectiveFromEmail(fromEmail);
      const effectiveFromAddr = `Personal Finance <${effectiveFromEmail}>`;

      const summary = computeSummary(state);
      const freq = frequency || "weekly";
      const html = generateHTML(summary, freq, recipientName || "there");
      const subject = buildSubject(freq, summary.netWorth);

      const { data: sendData, error } = await resend.emails.send({
        from: effectiveFromAddr,
        to: emailTo,
        subject,
        html,
      });

      if (error) {
        console.error("[send-summary] Resend error:", error);
        const isTest = effectiveFromEmail === "onboarding@resend.dev";
        return res.status(500).json({
          error: error.message,
          hint: isTest
            ? `Test sender restriction: onboarding@resend.dev can only deliver to the email you registered with Resend (not ${emailTo}). Enter your Resend account email in the 'Sender Email' field in Settings.`
            : `Send failed from ${effectiveFromEmail}. Make sure this email or its domain is verified in your Resend account.`,
        });
      }
      return res.status(200).json({ sent: true, to: emailTo, id: sendData?.id });
    }

    if (isCron) {
      // ── Scheduled cron ───────────────────────────────────────────────────
      if (!RESEND_KEY) {
        console.error("[send-summary] MISSING: Resend_Email_API not set in Vercel env vars");
        return res.status(500).json({ error: "Resend API key not configured" });
      }
      if (!process.env.SUPABASE_SERVICE_EMAIL_ROLE_KEY && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error(
          "[send-summary] MISSING: SUPABASE_SERVICE_EMAIL_ROLE_KEY not set in Vercel env vars"
        );
        return res.status(500).json({ error: "SUPABASE_SERVICE_EMAIL_ROLE_KEY not configured" });
      }

      const supabase = getSupabase();
      // Only fetch users who have email enabled — reduces DB load and processing time
      const { data: allSettings, error: settErr } = await supabase
        .from("user_settings")
        .select(
          "user_id, email_enabled, email_frequency, email_day, email_hour, email_address, from_email"
        )
        .eq("email_enabled", true)
        .not("email_address", "is", null)
        .neq("email_address", "");

      if (settErr) {
        console.error("[send-summary] Failed to fetch user_settings:", settErr.message);
        return res.status(500).json({
          error: `DB error: ${settErr.message}. Run migration 29_email_settings.sql in Supabase.`,
        });
      }

      console.log(`[send-summary] Found ${(allSettings || []).length} user(s) with email enabled`);

      const results = [];
      for (const row of allSettings || []) {
        const freq = row.email_frequency || "weekly";
        if (!shouldSendNow(row, freq)) continue;

        // Verify if the current IST hour matches the user's configured hour (defaulting to 8 AM IST)
        const userHour = Number(row.email_hour ?? 8);
        if (istHour() !== userHour) continue;

        try {
          const state = await fetchStateFromSupabase(supabase, row.user_id);

          // Fetch the user's name from profiles table
          const { data: profData } = await supabase
            .from("profiles")
            .select("name")
            .eq("user_id", row.user_id)
            .maybeSingle();
          const recipientName = profData?.name || row.email_address?.split("@")[0] || "there";

          const summary = computeSummary(state);
          const html = generateHTML(summary, freq, recipientName);
          const subject = buildSubject(freq, summary.netWorth);

          const cronFromEmail = getEffectiveFromEmail(row.from_email);
          const { error } = await resend.emails.send({
            from: `Personal Finance <${cronFromEmail}>`,
            to: row.email_address,
            subject,
            html,
          });

          if (error) console.error(`[send-summary] Failed for user ${row.user_id}:`, error.message);
          results.push({
            userId: row.user_id,
            email: row.email_address,
            sent: !error,
            error: error?.message,
          });
        } catch (userErr) {
          console.error(`[send-summary] Error processing user ${row.user_id}:`, userErr.message);
          results.push({ userId: row.user_id, sent: false, error: userErr.message });
        }
      }

      console.log(
        `[send-summary] Cron complete. Processed: ${results.length}, Sent: ${results.filter((r) => r.sent).length}`
      );
      return res
        .status(200)
        .json({ processed: results.length, sent: results.filter((r) => r.sent).length, results });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("[send-summary] Unhandled error:", err);
    return res.status(500).json({ error: err.message });
  }
};
