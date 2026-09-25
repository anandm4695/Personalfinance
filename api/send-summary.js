// Vercel serverless function — Daily/Weekly/Monthly email summary sender
// Triggered by Vercel Cron (GET) or manually from Settings UI (POST)
const { Resend } = require("resend");
const { createClient } = require("@supabase/supabase-js");
const { default: YahooFinance } = require("yahoo-finance2");

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

// yahoo-finance2 ships with no request timeout by default — a hung upstream
// response can otherwise block until Vercel's maxDuration kills the whole
// function. Follows the same 8s-timeout philosophy as the mfapi.in calls in
// api/mf-nav.js / api/cron-update-prices.js.
const YF_TIMEOUT_MS = 8000;
const yfFetchOptions = () => ({ fetchOptions: { signal: AbortSignal.timeout(YF_TIMEOUT_MS) } });

const RESEND_KEY = process.env.Resend_Email_API || process.env.RESEND_API_KEY;
const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

// Allow a verified custom domain via RESEND_FROM_EMAIL env var.
// If unset, falls back to the Resend test sender which can ONLY deliver
// to the email address used to register the Resend account.
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const FROM_ADDR = `ArthaDrishti <${FROM_EMAIL}>`;

const APP_URL = (
  process.env.APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
  "https://arthadrishti-app.vercel.app"
).replace(/\/$/, "");

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
function getSupabase() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_EMAIL_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Supabase env vars not configured (VITE_SUPABASE_URL / SUPABASE_SERVICE_EMAIL_ROLE_KEY)"
    );
  return createClient(url, key);
}

// ── Last-send status tracking ─────────────────────────────────────────────────
async function recordSendResult(supabase, userId, status, errorMsg) {
  try {
    await supabase.from("user_settings").upsert({
      user_id: userId,
      last_email_sent_at: new Date().toISOString(),
      last_email_status: status,
      last_email_error: status === "sent" ? null : String(errorMsg || "Unknown error").slice(0, 500),
    });
  } catch (err) {
    console.error("[send-summary] Failed to record send status:", err.message);
  }
}

// ── Manual-send auth check ────────────────────────────────────────────────────
async function verifyManualAuth(req) {
  const authHeader = req.headers["authorization"] || "";
  const match = /^Bearer\s+(.+)$/i.exec(authHeader);
  if (!match) return { ok: false, reason: "Missing Authorization header" };
  const token = match[1].trim();
  if (!token) return { ok: false, reason: "Empty bearer token" };
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return { ok: false, reason: "Invalid or expired session" };
    return { ok: true, user: data.user };
  } catch (err) {
    return { ok: false, reason: err.message || "Auth check failed" };
  }
}

// ── IST offset helpers ─────────────────────────────────────────────────────────
function nowIST() {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 330); // UTC+5:30
  return d;
}

function istDayOfWeek() {
  return nowIST().getUTCDay(); // 0=Sun,1=Mon,...,6=Sat
}

function istDate() {
  return nowIST().getUTCDate();
}

function istDaysInCurrentMonth() {
  const d = nowIST();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}

// ── Camel/Date helpers for calculations alignment ──────────────────────────────
function snakeToCamel(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamel);
  const res = {};
  for (const k in obj) {
    const camel = k.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    res[camel] = obj[k] !== null && typeof obj[k] === "object" ? snakeToCamel(obj[k]) : obj[k];
  }
  return res;
}

function today() {
  const d = nowIST();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function monthsBetween(d1, d2) {
  if (!d1 || !d2) return 0;
  const a = new Date(d1);
  const b = new Date(d2);
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
}

function rdMaturity(monthly, rate, months) {
  const n = 4;
  const r = rate / 100;
  let total = 0;
  for (let i = 0; i < months; i++) {
    const t = (months - i) / 12;
    total += monthly * Math.pow(1 + r / n, n * t);
  }
  return total;
}

// ── Premium annualization & next-anniversary helper ────────────────────────────
const PREMIUM_FREQ_MULT = { monthly: 12, quarterly: 4, semi_annual: 2, annual: 1, yearly: 1 };
function annualizePremium(premium, frequency, preAnnualized) {
  if (preAnnualized && Number(preAnnualized) > 0) return Number(preAnnualized);
  const freq = (frequency || "annual").toLowerCase().replace("-", "_");
  return Number(premium || 0) * (PREMIUM_FREQ_MULT[freq] || 1);
}

function nextAnnualOccurrence(startDate, refDate) {
  if (!startDate) return refDate || today();
  const parts = startDate.slice(0, 10).split("-").map(Number);
  const m = parts[1];
  const d = parts[2];
  const refParts = (refDate || today()).split("-").map(Number);
  const refY = refParts[0];
  const clampedDateStr = (y) => {
    const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const day = Math.min(d, lastDay);
    return `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };
  let occ = clampedDateStr(refY);
  if (occ < (refDate || today())) occ = clampedDateStr(refY + 1);
  return occ;
}

// ── Number formatters ─────────────────────────────────────────────────────────
function fmtINR(n) {
  const v = Math.abs(Number(n) || 0);
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
}

function fmtINRFull(n) {
  return `₹${Math.round(Math.abs(Number(n) || 0)).toLocaleString("en-IN")}`;
}

// Rounds each amount's share of `total` to a whole percent using the largest-remainder
// method, so the results always sum to 100.
function largestRemainderRound(amounts, total) {
  if (!(total > 0) || amounts.length === 0) return amounts.map(() => 0);
  const raw = amounts.map((a) => (a / total) * 100);
  const floors = raw.map(Math.floor);
  const remainder = 100 - floors.reduce((s, v) => s + v, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  const result = [...floors];
  for (let k = 0; k < remainder && k < order.length; k++) result[order[k].i] += 1;
  return result;
}

// ── HTML escaping ──────────────────────────────────────────────────────────────
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function dateLabel(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function weekRange() {
  const ist = nowIST();
  const day = ist.getUTCDay();
  const mon = new Date(ist);
  mon.setUTCDate(ist.getUTCDate() - ((day + 6) % 7));
  const sun = new Date(mon);
  sun.setUTCDate(mon.getUTCDate() + 6);
  return `${dateLabel(mon.toISOString())} – ${dateLabel(sun.toISOString())}`;
}

function monthLabel() {
  return nowIST().toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

// ── Escalation-aware rent ────────────────────────────────────────────────────
function getEffectiveRent(p, yearMonth) {
  const tiers = p.escalationTiers;
  if (!tiers || !tiers.length || !p.agreementStart) return Number(p.monthlyRent || 0);
  const refMonth = yearMonth || today().slice(0, 7);
  const [refY, refM] = refMonth.split("-").map(Number);
  const [startY, startM] = p.agreementStart.slice(0, 7).split("-").map(Number);
  const monthsElapsed = (refY - startY) * 12 + (refM - startM);
  if (monthsElapsed < 0) return Number(tiers[0]?.amount || p.monthlyRent || 0);
  let cumulative = 0;
  for (const tier of tiers) {
    cumulative += Number(tier.durationMonths || 12);
    if (monthsElapsed < cumulative) return Number(tier.amount || 0);
  }
  return Number(tiers[tiers.length - 1]?.amount || p.monthlyRent || 0);
}

// ── Compute all summary metrics from state ─────────────────────────────────────
function computeSummary(state) {
  const now = nowIST();
  const m = now.getUTCMonth();
  const y = now.getUTCFullYear();
  const curYm = `${y}-${String(m + 1).padStart(2, "0")}`;

  const calculateEpfBalance = (e) => {
    if (!e) return 0;
    const txs = e.transactions || [];
    const ests = e.establishments || [];

    const hasPassbook = txs.some(
      (t) =>
        t.type === "monthly_contribution" ||
        t.type === "interest_credit" ||
        t.type === "transfer_in"
    );

    if (!hasPassbook) {
      return Number(e.balance || 0);
    }

    const transferredOutEstIds = new Set(
      txs
        .filter((x) => x.type === "transfer_in" && x.fromEmployer)
        .map((x) => {
          const est = ests.find((estItem) => estItem.employerName === x.fromEmployer);
          return est ? est.id : null;
        })
        .filter(Boolean)
    );

    const activeTxs = txs.filter((t) => !t.estId || !transferredOutEstIds.has(t.estId));

    const byType = (type) =>
      activeTxs.filter((x) => x.type === type).reduce((s, x) => s + Number(x.amount || 0), 0);
    const monthlyRows = activeTxs.filter((x) => x.type === "monthly_contribution");
    const interestRows = activeTxs.filter((x) => x.type === "interest_credit");
    const transferRows = txs.filter((x) => x.type === "transfer_in");

    const totalEmployee =
      byType("employee_contribution") +
      monthlyRows.reduce((s, x) => s + Number(x.employeeShare || 0), 0);
    const totalEmployer =
      byType("employer_contribution") +
      monthlyRows.reduce((s, x) => s + Number(x.employerShare || 0), 0);
    const totalPension = monthlyRows.reduce((s, x) => s + Number(x.pensionShare || 0), 0);
    const totalTransferIn = transferRows.reduce((s, x) => s + Number(x.amount || 0), 0);
    const totalWithdrawal = byType("withdrawal");

    const empInterest = interestRows.reduce((s, x) => {
      if (x.employeeShare !== undefined) return s + Number(x.employeeShare || 0);
      return s + Number(x.amount || 0);
    }, 0);
    const erInterest = interestRows.reduce((s, x) => s + Number(x.employerShare || 0), 0);
    const penInterest = interestRows.reduce((s, x) => s + Number(x.pensionShare || 0), 0);
    const transferInEr = transferRows.reduce((s, x) => s + Number(x.employerShare || 0), 0);
    const transferInPen = transferRows.reduce((s, x) => s + Number(x.pensionShare || 0), 0);
    const transferInEmp = totalTransferIn - transferInEr - transferInPen;

    const closingEmployee = totalEmployee + empInterest + transferInEmp;
    const closingEmployer = totalEmployer + erInterest + transferInEr;
    const closingPension = totalPension + transferInPen + penInterest;
    const closingTotal = closingEmployee + closingEmployer + closingPension - totalWithdrawal;

    return closingTotal;
  };

  // ── Net worth: Assets ──────────────────────────────────────────────────────
  const bankTotal = (state.bankAccounts || []).reduce((s, b) => s + (Number(b.balance) || 0), 0);
  const mfTotal = (state.mutualFunds || []).reduce((s, m) => {
    const liveNav = Number(m.currentNav || 0);
    const fallbackNav =
      liveNav ||
      Number(m.buyNav || 0) ||
      (Number(m.units || 1) > 0 ? Number(m.invested || 0) / Number(m.units || 1) : 0);
    return s + Number(m.units || 0) * fallbackNav;
  }, 0);
  const stockTotal = (state.stocks || []).reduce((s, st) => {
    const fallbackPrice = Number(st.currentPrice || 0) || Number(st.avgPrice || 0);
    return s + Number(st.qty || 0) * fallbackPrice;
  }, 0);
  const fdTotal = (state.fixedDeposits || []).reduce((s, x) => s + (Number(x.principal) || 0), 0);
  const rdTotal = (state.recurringDeposits || []).reduce((s, r) => {
    const elapsed = r.startDate
      ? Math.min(Number(r.tenureMonths || 0), Math.max(0, monthsBetween(r.startDate, today())))
      : Number(r.tenureMonths || 0);
    return s + rdMaturity(Number(r.monthly || 0), Number(r.rate || 0), elapsed);
  }, 0);
  const ppfTotal = (state.ppf || []).reduce((s, x) => s + (Number(x.balance) || 0), 0);
  const npsTotal = (state.nps || []).reduce((s, x) => {
    const bal = Number(x.balance) || 0;
    if (bal > 0) return s + bal;
    return (
      s +
      (x.transactions || []).reduce(
        (ss, t) => ss + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
        0
      )
    );
  }, 0);
  const epfTotal = (state.epf || []).reduce((s, x) => s + calculateEpfBalance(x), 0);
  const bondsTotal = (state.bonds || []).reduce(
    (s, b) => s + Number(b.totalInvestmentAmount || b.totalPrincipalAmount || b.faceValue || 0),
    0
  );
  const licTotal = (state.lic || []).reduce((s, l) => {
    const txTotal = (l.transactions || []).reduce((sum, t) => sum + Number(t.amount || 0), 0);
    return s + (txTotal > 0 ? txTotal : Number(l.premiumPaid || 0));
  }, 0);
  const investmentTotalPlans = (state.investmentPlans || []).reduce((s, ip) => {
    const txTotal = (ip.transactions || []).reduce((sum, t) => sum + Number(t.amount || 0), 0);
    return s + (txTotal > 0 ? txTotal : Number(ip.premiumPaid || 0));
  }, 0);

  const investTotal =
    mfTotal +
    stockTotal +
    fdTotal +
    rdTotal +
    ppfTotal +
    npsTotal +
    epfTotal +
    bondsTotal +
    licTotal +
    investmentTotalPlans;

  // Gold & SGBs
  const PURITY_FACTOR = { "24K": 1, "22K": 22 / 24, "18K": 18 / 24, "14K": 14 / 24 };
  const goldPricePerGram = state.settings?.goldPricePerGram || state.goldPricePerGram || 7200;
  const goldTotal = (state.goldHoldings || []).reduce((s, h) => {
    const grams = Number(h.grams || 0);
    const purityMul = h.type === "physical" ? PURITY_FACTOR[h.purity] || 1 : 1;
    return s + grams * goldPricePerGram * purityMul;
  }, 0);

  const loansGivenTotal = (state.loansGiven || []).reduce(
    (s, l) => s + Number(l.outstanding || 0),
    0
  );

  const prepaidTotal = (state.prepaidCards || [])
    .filter((p) => (p.status || "").toLowerCase() !== "closed")
    .reduce((s, p) => {
      const txns = p.transactions || [];
      const loaded = txns
        .filter((t) => t.type === "load")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      const spent = txns
        .filter((t) => t.type === "spend")
        .reduce((sum, t) => sum + Number(t.amount || 0), 0);
      return s + (loaded - spent);
    }, 0);

  const rentedDepositAsset = (state.rentedProperties || []).reduce((s, p) => {
    const actualDeposit =
      p.depositTransactions && p.depositTransactions.length > 0
        ? p.depositTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
        : Number(p.securityDeposit || 0);
    const returned = Number(p.depositReturned || 0);
    return s + Math.max(0, actualDeposit - returned);
  }, 0);

  // Accounting bug fix: fallback to person.amount when no individual tranches/payments recorded
  const informalLentTotal = (state.informalLent || []).reduce((s, person) => {
    const tranches = person.tranches || [];
    const payments = person.payments || [];
    const totalT = tranches.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalP = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const net = totalT > 0 || totalP > 0 ? Math.max(0, totalT - totalP) : Number(person.amount || 0);
    return s + net;
  }, 0);

  const rentalPropertiesAsset = (state.rentalProperties || []).reduce(
    (s, r) => s + Number(r.propertyValue || 0),
    0
  );

  const vehicleAsset = (state.vehicles || []).reduce(
    (s, v) => s + Number(v.currentValue || v.purchasePrice || 0),
    0
  );

  const REALTY_EXTERNAL_OWNER_ID = "external";
  const realEstateTrackedShare = (property) => {
    if (Array.isArray(property.owners) && property.owners.length > 0) {
      return (
        property.owners.reduce(
          (s, o) => (o?.id !== REALTY_EXTERNAL_OWNER_ID ? s + Number(o.sharePct || 0) : s),
          0
        ) / 100
      );
    }
    return 1;
  };
  const realEstateAsset = (state.realEstateProperties || [])
    .filter((p) => p.status !== "sold")
    .reduce(
      (s, p) => s + Number(p.marketValue || p.agreementValue || 0) * realEstateTrackedShare(p),
      0
    );

  const govtSchemesTotal = (state.govtSchemes || []).reduce(
    (s, sc) => s + Number(sc.currentBalance || 0),
    0
  );

  const totalAssets =
    bankTotal +
    investTotal +
    goldTotal +
    loansGivenTotal +
    prepaidTotal +
    rentedDepositAsset +
    informalLentTotal +
    rentalPropertiesAsset +
    realEstateAsset +
    vehicleAsset +
    govtSchemesTotal;

  // ── Net worth: Liabilities ─────────────────────────────────────────────────
  const activeCards = (state.creditCards || []).filter(
    (c) => (c.status || "active").toLowerCase() !== "closed"
  );
  const creditOutstanding = activeCards.reduce((s, c) => s + (Number(c.outstanding) || 0), 0);

  const ccGroupPools = {};
  activeCards.forEach((c) => {
    if (c.sharedGroup) {
      ccGroupPools[c.sharedGroup] = Math.max(
        ccGroupPools[c.sharedGroup] || 0,
        Number(c.sharedGroupLimit) || 0
      );
    }
  });
  const creditLimit =
    activeCards
      .filter((c) => !c.sharedGroup)
      .reduce((s, c) => s + (Number(c.limit || c.cardLimit) || 0), 0) +
    Object.values(ccGroupPools).reduce((s, v) => s + v, 0);
  const creditUtil = creditLimit > 0 ? Math.round((creditOutstanding / creditLimit) * 100) : 0;

  const loanOutstanding = (state.loansTaken || []).reduce(
    (s, l) => s + Number(l.outstanding || 0),
    0
  );

  const rentalDepositLiability = (state.rentalProperties || []).reduce((s, p) => {
    const actualDeposit =
      p.depositTransactions && p.depositTransactions.length > 0
        ? p.depositTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0)
        : Number(p.securityDeposit || 0);
    const deducted = (p.depositDeductions || []).reduce((a, d) => a + Number(d.amount || 0), 0);
    const returned = Number(p.depositReturned || 0);
    return s + Math.max(0, actualDeposit - deducted - returned);
  }, 0);

  // Accounting bug fix: fallback to person.amount when no individual tranches/payments recorded
  const informalBorrowedTotal = (state.informalBorrowed || []).reduce((s, person) => {
    const tranches = person.tranches || [];
    const payments = person.payments || [];
    const totalT = tranches.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalP = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const net = totalT > 0 || totalP > 0 ? Math.max(0, totalT - totalP) : Number(person.amount || 0);
    return s + net;
  }, 0);

  // Accounting bug fix: compute per-property with ownership share, matching useMetrics.ts
  const realEstateOutstanding = (state.realEstateProperties || [])
    .filter((p) => p.status === "under-construction")
    .reduce((total, p) => {
      const share = realEstateTrackedShare(p);
      const demanded = (state.realEstateDemands || [])
        .filter((d) => d.propertyId === p.id)
        .reduce((s, d) => s + Number(d.totalAmount || d.amount || 0), 0);
      const paid = (state.realEstatePayments || [])
        .filter((pm) => pm.propertyId === p.id)
        .reduce((s, pm) => s + Number(pm.amount || 0), 0);
      return total + Math.max(0, demanded - paid) * share;
    }, 0);

  const totalLiabilities =
    creditOutstanding +
    loanOutstanding +
    rentalDepositLiability +
    informalBorrowedTotal +
    realEstateOutstanding;
  const netWorth = totalAssets - totalLiabilities;
  const debtToAssetRatio =
    totalAssets > 0 ? Math.min(100, Math.round((totalLiabilities / totalAssets) * 100)) : 0;

  // ── Cash flow (current month MTD) ──────────────────────────────────────────
  const monthTxns = (state.transactions || []).filter((t) => t.date && t.date.startsWith(curYm));
  const isTransferCat = (cat) => ["Transfer", "Self Transfer", "Self-Transfer"].includes(cat);

  const rentReceivedThisMonth = (state.rentalProperties || []).reduce((sum, p) => {
    const receiptsThisMonth = (p.receipts || [])
      .filter((r) => r.date && r.date.startsWith(curYm))
      .reduce((s, r) => s + Number(r.amount || 0), 0);
    return sum + receiptsThisMonth;
  }, 0);
  const hasRentReceivedTxn = monthTxns.some(
    (t) => t.type === "credit" && (t.category || "").toLowerCase() === "rent"
  );

  const monthIncome = (() => {
    const explicitIncomeMonth = (state.income || [])
      .filter((i) => i.date && i.date.startsWith(curYm))
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const txnIncomeMonth = monthTxns
      .filter((t) => t.type === "credit" && !isTransferCat(t.category))
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const rentTopUp = rentReceivedThisMonth > 0 && !hasRentReceivedTxn ? rentReceivedThisMonth : 0;
    return (explicitIncomeMonth > 0 ? explicitIncomeMonth : txnIncomeMonth) + rentTopUp;
  })();

  const rentPaidThisMonth = (state.rentedProperties || []).reduce((sum, p) => {
    const paymentsThisMonth = (p.payments || [])
      .filter((pay) => pay.date && pay.date.startsWith(curYm))
      .reduce((s, pay) => s + Number(pay.amount || 0), 0);
    return sum + paymentsThisMonth;
  }, 0);

  const hasRentTxn = monthTxns.some(
    (t) => t.type === "debit" && (t.category || "").toLowerCase() === "rent"
  );
  const monthExpense =
    monthTxns
      .filter(
        (t) => t.type === "debit" && !isTransferCat(t.category) && t.category !== "Investment"
      )
      .reduce((s, t) => s + Number(t.amount || 0), 0) +
    (rentPaidThisMonth > 0 && !hasRentTxn ? rentPaidThisMonth : 0);

  const netSavings = monthIncome - monthExpense;
  const savingsPct = monthIncome > 0 ? Math.round((netSavings / monthIncome) * 100) : 0;

  // ── MTD Pacing ─────────────────────────────────────────────────────────────
  const dayOfMonth = istDate();
  const totalDaysInMonth = istDaysInCurrentMonth();
  const monthElapsedPct = Math.min(100, Math.round((dayOfMonth / totalDaysInMonth) * 100));

  // ── Top spending categories this month ────────────────────────────────────
  const catMap = {};
  monthTxns
    .filter((t) => t.type === "debit" && !isTransferCat(t.category) && t.category !== "Investment")
    .forEach((t) => {
      const cat = t.category || "Other";
      catMap[cat] = (catMap[cat] || 0) + Math.abs(Number(t.amount) || 0);
    });
  const topCats = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, amt]) => ({ cat, amt }));

  // ── Budget health ─────────────────────────────────────────────────────────
  const filteredBudgets = [];
  const categoriesMap = {};
  (state.budgets || []).forEach((b) => {
    const cat = b.category;
    if (!categoriesMap[cat]) categoriesMap[cat] = [];
    categoriesMap[cat].push(b);
  });

  Object.keys(categoriesMap).forEach((cat) => {
    const list = categoriesMap[cat];
    const specific = list.find((b) => b.budgetMonth === curYm);
    if (specific) {
      filteredBudgets.push(specific);
    } else {
      const baseline = list.find((b) => !b.budgetMonth);
      if (baseline) {
        filteredBudgets.push(baseline);
      } else {
        const prior = list
          .filter((b) => b.budgetMonth && b.budgetMonth < curYm)
          .sort((a, b) => (b.budgetMonth || "").localeCompare(a.budgetMonth || ""));
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
      const limit = Number(b.monthly || 0);
      const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      return { category: b.category, spent, limit, pct, over: pct > 100 };
    })
    .sort((a, b) => b.pct - a.pct);

  const totalBudgetLimit = filteredBudgets
    .filter((b) => !isTransferCat(b.category) && b.category !== "Investment")
    .reduce((s, b) => s + Number(b.monthly || 0), 0);
  const totalBudgetSpent = filteredBudgets
    .filter((b) => !isTransferCat(b.category) && b.category !== "Investment")
    .reduce((s, b) => s + (catMap[b.category] || 0), 0);
  const totalBudgetSpentPct =
    totalBudgetLimit > 0 ? Math.round((totalBudgetSpent / totalBudgetLimit) * 100) : 0;

  // ── Cadence 1: Daily Specific Data (Yesterday & Today Pulse) ───────────────
  const todayVal = nowIST();
  const todayStr = today();
  const yestDate = new Date(now);
  yestDate.setUTCDate(now.getUTCDate() - 1);
  const yestYmStr = `${yestDate.getUTCFullYear()}-${String(yestDate.getUTCMonth() + 1).padStart(2, "0")}-${String(yestDate.getUTCDate()).padStart(2, "0")}`;
  const yesterdayDebits = (state.transactions || []).filter(
    (t) =>
      t.date === yestYmStr &&
      t.type === "debit" &&
      !isTransferCat(t.category) &&
      t.category !== "Investment"
  );
  const yesterdayCredits = (state.transactions || []).filter(
    (t) => t.date === yestYmStr && t.type === "credit" && !isTransferCat(t.category)
  );
  const yesterdaySpend = yesterdayDebits.reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
  const yesterdayIncome = yesterdayCredits.reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
  const yesterdayCount = yesterdayDebits.length;
  const yesterdayTxns = yesterdayDebits
    .map((t) => ({
      title: t.description || t.merchant || t.title || t.category || "Expense",
      category: t.category || "General",
      amount: Math.abs(Number(t.amount) || 0),
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 4);

  const dailyBudgetAllowance =
    totalBudgetLimit > 0 ? Math.round(totalBudgetLimit / totalDaysInMonth) : 0;
  const yesterdayVsDailyBudgetPct =
    dailyBudgetAllowance > 0 ? Math.round((yesterdaySpend / dailyBudgetAllowance) * 100) : null;

  // ── Cadence 2: Weekly Specific Data (Past 7 Days & 7-Day Trend) ────────────
  const p7Start = new Date(todayVal);
  p7Start.setUTCDate(todayVal.getUTCDate() - 7);
  const p7StartStr = p7Start.toISOString().slice(0, 10);

  const past7DaysDebits = (state.transactions || []).filter(
    (t) =>
      t.date &&
      t.date >= p7StartStr &&
      t.date <= todayStr &&
      t.type === "debit" &&
      !isTransferCat(t.category) &&
      t.category !== "Investment"
  );
  const past7DaysExpense = past7DaysDebits.reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
  const past7DaysCount = past7DaysDebits.length;

  const past7DaysCredits = (state.transactions || []).filter(
    (t) =>
      t.date &&
      t.date >= p7StartStr &&
      t.date <= todayStr &&
      t.type === "credit" &&
      !isTransferCat(t.category)
  );
  const past7DaysIncome = past7DaysCredits.reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
  const past7DaysNetSavings = past7DaysIncome - past7DaysExpense;

  const past7CatMap = {};
  past7DaysDebits.forEach((t) => {
    const cat = t.category || "Other";
    past7CatMap[cat] = (past7CatMap[cat] || 0) + Math.abs(Number(t.amount) || 0);
  });
  const past7DaysTopCats = Object.entries(past7CatMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([cat, amt]) => ({ cat, amt }));

  // Prior 7 days for week-over-week variance
  const p14Start = new Date(todayVal);
  p14Start.setUTCDate(todayVal.getUTCDate() - 14);
  const p14StartStr = p14Start.toISOString().slice(0, 10);
  const prior7DaysDebits = (state.transactions || []).filter(
    (t) =>
      t.date &&
      t.date >= p14StartStr &&
      t.date < p7StartStr &&
      t.type === "debit" &&
      !isTransferCat(t.category) &&
      t.category !== "Investment"
  );
  const prior7DaysExpense = prior7DaysDebits.reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
  const weeklySpendTrendPct =
    prior7DaysExpense > 0
      ? Math.round(((past7DaysExpense - prior7DaysExpense) / prior7DaysExpense) * 100)
      : null;

  const weeklyBudgetAllowance =
    totalBudgetLimit > 0 ? Math.round(totalBudgetLimit / (totalDaysInMonth / 7)) : 0;
  const weeklyBudgetSpentPct =
    weeklyBudgetAllowance > 0 ? Math.round((past7DaysExpense / weeklyBudgetAllowance) * 100) : 0;

  // ── Emergency Fund (accurate liquid runway accounting) ─────────────────────
  const commitEmis = (state.loansTaken || []).reduce((s, l) => s + Number(l.emi || 0), 0);
  const commitSips = (state.sips || [])
    .filter((s) => s.status !== "stopped")
    .reduce((s, si) => s + Number(si.amount || 0), 0);
  const commitSubs = (state.subscriptions || [])
    .filter((s) => !s.paused && s.status !== "cancelled")
    .reduce((s, sub) => {
      const amt = Number(sub.amount || 0);
      const c = (sub.cycle || "monthly").toLowerCase();
      if (c === "yearly" || c === "annual") return s + amt / 12;
      if (c === "half-yearly" || c === "semi-annual") return s + amt / 6;
      if (c === "quarterly") return s + amt / 3;
      return s + amt;
    }, 0);
  const commitRecurring = (state.recurringExpenses || []).reduce(
    (s, r) => s + Number(r.amount || 0),
    0
  );
  const commitRent = (state.rentedProperties || [])
    .filter((p) => p.isActive !== false)
    .reduce((s, p) => s + getEffectiveRent(p, curYm), 0);
  const commitInsurance = [
    ...(state.lic || []),
    ...(state.termPlans || []),
    ...(state.investmentPlans || []),
    ...(state.healthInsurance || []),
  ].reduce((s, p) => s + annualizePremium(p.premium, p.premiumFrequency, p.annualPremium) / 12, 0);

  const bottomUpMonthlyExpense =
    commitEmis + commitSips + commitSubs + commitRecurring + commitRent + commitInsurance;

  const efMonthlyExpense =
    totalBudgetLimit > 0
      ? totalBudgetLimit
      : bottomUpMonthlyExpense > 0
        ? bottomUpMonthlyExpense
        : monthExpense > 0
          ? monthExpense
          : 0;

  const todayMs = Date.UTC(
    todayVal.getUTCFullYear(),
    todayVal.getUTCMonth(),
    todayVal.getUTCDate()
  );
  const in3Ms = todayMs + 3 * 86400000;
  const in7Ms = todayMs + 7 * 86400000;
  const in30Ms = todayMs + 30 * 86400000;

  // Near-term FDs maturing within 90 days count toward liquid assets
  const nearTermFDValue = (state.fixedDeposits || []).reduce((sum, fd) => {
    if (!fd.maturityDate) return sum;
    const matMs = new Date(fd.maturityDate + "T00:00:00").getTime();
    if (matMs >= todayMs && matMs <= todayMs + 90 * 86400000) {
      return sum + Number(fd.principal || 0);
    }
    return sum;
  }, 0);

  // Liquid/money-market/overnight MFs
  const liquidMFValue = (state.mutualFunds || []).reduce((sum, mf) => {
    const cat = (mf.category || mf.type || "").toLowerCase();
    if (
      cat.includes("liquid") ||
      cat.includes("money market") ||
      cat.includes("overnight") ||
      cat.includes("ultra short")
    ) {
      const liveNav = Number(mf.currentNav || 0);
      const nav = liveNav || Number(mf.buyNav || 0) || 0;
      return sum + (Number(mf.units) || 0) * nav;
    }
    return sum;
  }, 0);

  const efLiquidAssets = bankTotal + nearTermFDValue + liquidMFValue + Math.max(0, prepaidTotal);
  const efMonthsCovered =
    efMonthlyExpense > 0 ? Number((efLiquidAssets / efMonthlyExpense).toFixed(1)) : 0;
  const efStatus =
    efMonthsCovered >= 12
      ? { label: "Excellent", color: "#059669" }
      : efMonthsCovered >= 6
        ? { label: "Healthy", color: "#059669" }
        : efMonthsCovered >= 3
          ? { label: "Needs Improvement", color: "#d97706" }
          : { label: "Critical", color: "#dc2626" };

  // ── Upcoming dues (collected up to 30 days) ─────────────────────────────────
  const dues = [];

  // 1. Subscriptions
  (state.subscriptions || [])
    .filter((s) => !s.paused && s.status !== "cancelled")
    .forEach((s) => {
      const next = new Date(s.renewalDate || s.nextDue || s.startDate || todayVal.toISOString());
      next.setUTCHours(0, 0, 0, 0);
      const nextMs = next.getTime();
      if (nextMs >= todayMs && nextMs <= in30Ms) {
        dues.push({
          date: next,
          label: s.name || s.provider || "Subscription",
          amount: Number(s.amount) || 0,
          type: "sub",
          category: "Subscription",
        });
      }
    });

  // 2. Rent dues for rented properties
  (state.rentedProperties || []).forEach((p) => {
    const dueDay = Number(p.dueDay || 5);
    const paidCurrent = (p.payments || []).some((pay) => pay.date && pay.date.startsWith(curYm));
    if (!paidCurrent) {
      const d = new Date(Date.UTC(todayVal.getUTCFullYear(), todayVal.getUTCMonth(), dueDay));
      if (d.getTime() >= todayMs && d.getTime() <= in30Ms)
        dues.push({
          date: d,
          label: `${p.propertyName || "Rent"}`,
          amount: getEffectiveRent(p, curYm),
          type: "rent",
          category: "Rent",
        });
    }
  });

  // 3. Credit card statement dues
  activeCards.forEach((c) => {
    if (!c.dueDay || !Number(c.outstanding)) return;
    const d = new Date(
      Date.UTC(todayVal.getUTCFullYear(), todayVal.getUTCMonth(), Number(c.dueDay))
    );
    if (d.getTime() < todayMs) d.setUTCMonth(d.getUTCMonth() + 1);
    if (d.getTime() >= todayMs && d.getTime() <= in30Ms) {
      dues.push({
        date: d,
        label: `${c.issuer || c.name || "Credit Card"} Bill`,
        amount: Number(c.outstanding) || 0,
        type: "cc",
        category: "Credit Card",
      });
    }
  });

  // 4. Credit card annual fees
  activeCards.forEach((c) => {
    if (!Number(c.annualFee) || !c.feeMonth) return;
    const fMonth = Number(c.feeMonth) - 1;
    const fDay = Number(c.feeDay) || 1;
    let candidate = new Date(Date.UTC(todayVal.getUTCFullYear(), fMonth, fDay));
    if (candidate.getTime() < todayMs) {
      candidate = new Date(Date.UTC(todayVal.getUTCFullYear() + 1, fMonth, fDay));
    }
    if (candidate.getTime() >= todayMs && candidate.getTime() <= in30Ms) {
      dues.push({
        date: candidate,
        label: `${c.issuer || "Card"} Annual Fee`,
        amount: Number(c.annualFee),
        type: "cc",
        category: "Credit Card Fee",
      });
    }
  });

  // 5. Loan EMI dates
  (state.loansTaken || []).forEach((l) => {
    if (!l.emiDate && !l.dueDay && !l.emi) return;
    const day = Number(l.emiDate || l.dueDay || 5);
    if (!day) return;
    const d = new Date(Date.UTC(todayVal.getUTCFullYear(), todayVal.getUTCMonth(), day));
    if (d.getTime() < todayMs) d.setUTCMonth(d.getUTCMonth() + 1);
    if (d.getTime() >= todayMs && d.getTime() <= in30Ms) {
      dues.push({
        date: d,
        label: `${l.lender || l.lenderBorrower || "Loan"} EMI`,
        amount: Number(l.emi) || 0,
        type: "emi",
        category: "Loan EMI",
      });
    }
  });

  // 6. SIP instalments
  (state.sips || [])
    .filter((s) => s.status !== "stopped")
    .forEach((s) => {
      const amt = Number(s.amount || 0);
      if (amt <= 0) return;
      const dueDay = s.startDate
        ? new Date(s.startDate + "T00:00:00").getUTCDate()
        : Number(s.dayOfMonth || s.dueDay || 5);
      const d = new Date(Date.UTC(todayVal.getUTCFullYear(), todayVal.getUTCMonth(), dueDay));
      if (d.getTime() < todayMs) d.setUTCMonth(d.getUTCMonth() + 1);
      if (d.getTime() >= todayMs && d.getTime() <= in30Ms) {
        dues.push({
          date: d,
          label: `${s.scheme || s.fundName || "Mutual Fund"} SIP`,
          amount: amt,
          type: "sip",
          category: "SIP Investment",
        });
      }
    });

  // 7. Insurance premium renewals (LIC, Term, Investment, Health)
  const addInsuranceDue = (policies, defaultLabel) => {
    (policies || []).forEach((p) => {
      const premium = annualizePremium(p.premium, p.premiumFrequency, p.annualPremium);
      if (!premium) return;
      const startDate = p.commencementDate || p.startDate || p.renewalDate;
      if (!startDate) return;
      const expiry = p.maturityDate || p.expiryDate;
      if (expiry && expiry < today()) return;
      const nextDueStr = nextAnnualOccurrence(startDate, today());
      const d = new Date(nextDueStr + "T00:00:00");
      if (d.getTime() >= todayMs && d.getTime() <= in30Ms) {
        dues.push({
          date: d,
          label: `${p.planName || p.insurer || p.policyName || defaultLabel} Premium`,
          amount: premium,
          type: "insurance",
          category: "Insurance",
        });
      }
    });
  };
  addInsuranceDue(state.lic, "LIC Policy");
  addInsuranceDue(state.termPlans, "Term Insurance");
  addInsuranceDue(state.investmentPlans, "Investment Plan");
  addInsuranceDue(state.healthInsurance, "Health Policy");

  // 8. Real Estate builder demand letters
  (state.realEstateDemands || []).forEach((d) => {
    if (d.status === "paid" || !d.dueDate) return;
    const dueDate = new Date(d.dueDate + "T00:00:00");
    if (dueDate.getTime() >= todayMs && dueDate.getTime() <= in30Ms) {
      const totalAmt = Number(d.totalAmount || d.amount || 0);
      const paid = (state.realEstatePayments || [])
        .filter((pm) => pm.demandId === d.id)
        .reduce((s, p) => s + Number(p.amount || 0), 0);
      const remaining = Math.max(0, totalAmt - paid);
      if (remaining > 0) {
        const prop = (state.realEstateProperties || []).find((p) => p.id === d.propertyId);
        dues.push({
          date: dueDate,
          label: `${prop?.name || "Property"} ${d.milestone || "Demand"}`,
          amount: remaining,
          type: "demand",
          category: "Builder Demand",
        });
      }
    }
  });

  // 9. Recurring expenses & Bill payments
  (state.recurringExpenses || []).forEach((r) => {
    if (!r.amount || !r.dueDay) return;
    const d = new Date(Date.UTC(todayVal.getUTCFullYear(), todayVal.getUTCMonth(), Number(r.dueDay)));
    if (d.getTime() < todayMs) d.setUTCMonth(d.getUTCMonth() + 1);
    if (d.getTime() >= todayMs && d.getTime() <= in30Ms) {
      dues.push({
        date: d,
        label: r.name || r.title || "Recurring Expense",
        amount: Number(r.amount) || 0,
        type: "bill",
        category: "Recurring Bill",
      });
    }
  });

  // 10. General Reminders
  (state.reminders || [])
    .filter((r) => !r.done)
    .forEach((r) => {
      const d = new Date(r.date || r.reminderDate || "");
      if (isNaN(d.getTime())) return;
      d.setUTCHours(0, 0, 0, 0);
      if (d.getTime() >= todayMs && d.getTime() <= in30Ms) {
        dues.push({
          date: d,
          label: r.title || r.note || "Reminder",
          amount: Number(r.amount) || 0,
          type: "reminder",
          category: "Reminder",
        });
      }
    });

  dues.sort((a, b) => a.date - b.date);

  // ── Expected Inflows ────────────────────────────────────────────────────────
  const inflows = [];
  (state.rentalProperties || [])
    .filter((p) => p.isActive !== false)
    .forEach((p) => {
      const rentAmt = getEffectiveRent(p, curYm);
      if (!rentAmt) return;
      const dueDay = Number(p.dueDay || 1);
      const d = new Date(Date.UTC(todayVal.getUTCFullYear(), todayVal.getUTCMonth(), dueDay));
      if (d.getTime() < todayMs) d.setUTCMonth(d.getUTCMonth() + 1);
      const received = (p.receipts || []).some((r) => r.date && r.date.startsWith(curYm));
      if (!received && d.getTime() >= todayMs && d.getTime() <= in30Ms) {
        inflows.push({
          date: d,
          label: `${p.propertyName || "Rental Property"} Rent`,
          amount: rentAmt,
          type: "rent_in",
        });
      }
    });

  (state.loansGiven || []).forEach((l) => {
    if (!l.dueDate || Number(l.outstanding || 0) <= 0) return;
    const d = new Date(l.dueDate + "T00:00:00");
    if (d.getTime() >= todayMs && d.getTime() <= in30Ms) {
      inflows.push({
        date: d,
        label: `${l.borrower || "Borrower"} Repayment`,
        amount: Number(l.outstanding || 0),
        type: "loan_in",
      });
    }
  });

  inflows.sort((a, b) => a.date - b.date);

  // Windowed dues & inflows for cadences
  const dues3Days = dues.filter((d) => d.date.getTime() <= in3Ms);
  const dues7Days = dues.filter((d) => d.date.getTime() <= in7Ms);
  const dues30Days = dues.filter((d) => d.date.getTime() <= in30Ms);

  const inflows3Days = inflows.filter((i) => i.date.getTime() <= in3Ms);
  const inflows7Days = inflows.filter((i) => i.date.getTime() <= in7Ms);
  const inflows30Days = inflows.filter((i) => i.date.getTime() <= in30Ms);

  const totalDues3Days = dues3Days.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const totalDues7Days = dues7Days.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const totalDues30Days = dues30Days.reduce((s, d) => s + (Number(d.amount) || 0), 0);

  const totalInflows3Days = inflows3Days.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalInflows7Days = inflows7Days.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const totalInflows30Days = inflows30Days.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const liquidityBuffer3Days = bankTotal - totalDues3Days;
  const liquidityBuffer7Days = bankTotal - totalDues7Days;
  const liquidityBuffer = liquidityBuffer7Days;

  // ── Goals ─────────────────────────────────────────────────────────────────
  const goals = (state.goals || []).map((g) => {
    const target = Number(g.targetAmount || g.target) || 0;
    const current = Number(g.currentAmount || g.current || g.saved) || 0;
    const pct = target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0;
    return { name: g.name || g.category, pct, current, target };
  });

  // ── Alerts & Smart Insights ────────────────────────────────────────────────
  const alerts = [];

  // Urgent Liquidity Check: Upcoming dues exceed bank balance
  if (totalDues7Days > bankTotal) {
    alerts.push({
      type: "alert",
      msg: `Upcoming dues in next 7 days (${fmtINR(totalDues7Days)}) exceed your bank cash (${fmtINR(bankTotal)}) by ${fmtINR(totalDues7Days - bankTotal)}. Arrange liquidity.`,
    });
  }

  if (creditUtil >= 70) {
    alerts.push({
      type: "warn",
      msg: `High credit card utilization: ${creditUtil}% of combined limit utilized (${fmtINR(creditOutstanding)} of ${fmtINR(creditLimit)}). Pay down to protect credit score.`,
    });
  }

  budgetStatus
    .filter((b) => b.over)
    .forEach((b) =>
      alerts.push({
        type: "warn",
        msg: `${b.category} budget exceeded: spent ${fmtINR(b.spent)} of ${fmtINR(b.limit)} (${b.pct}%).`,
      })
    );

  // Budget burn-rate pacing alert
  if (totalBudgetLimit > 0 && totalBudgetSpentPct > monthElapsedPct + 20 && dayOfMonth <= 20) {
    alerts.push({
      type: "warn",
      msg: `Fast spending pace: ${totalBudgetSpentPct}% of overall monthly budget spent with only ${monthElapsedPct}% of the month elapsed (Day ${dayOfMonth} of ${totalDaysInMonth}).`,
    });
  }

  if (savingsPct < 20 && monthIncome > 0 && dayOfMonth >= 15) {
    alerts.push({
      type: "info",
      msg: `Savings rate MTD is ${savingsPct}%. Target 20%+ by controlling discretionary expenses.`,
    });
  }

  // Emergency fund alert based on real liquid assets and standard runway formula
  if (efMonthsCovered < 3 && efMonthlyExpense > 0) {
    alerts.push({
      type: "warn",
      msg: `Emergency runway is low: liquid assets (${fmtINR(efLiquidAssets)}) cover only ${efMonthsCovered} months of expenses (${fmtINR(efMonthlyExpense)}/mo) — target is 6 months.`,
    });
  }

  // High debt ratio
  if (totalAssets > 0 && totalLiabilities > totalAssets * 0.5) {
    alerts.push({
      type: "alert",
      msg: `Debt-to-assets ratio at ${Math.round((totalLiabilities / totalAssets) * 100)}%. Total liabilities: ${fmtINR(totalLiabilities)}.`,
    });
  }

  // FDs maturing within 30 days
  const fdMaturities30Days = [];
  (state.fixedDeposits || []).forEach((fd) => {
    if (fd.maturityDate) {
      const daysToMaturity = Math.round(
        (new Date(fd.maturityDate).getTime() - new Date(todayStr).getTime()) / 86400000
      );
      if (daysToMaturity >= 0 && daysToMaturity <= 30) {
        fdMaturities30Days.push({ ...fd, daysToMaturity });
        alerts.push({
          type: "info",
          msg: `FD of ${fmtINR(fd.principal)} at ${fd.bank || "bank"} matures in ${daysToMaturity} day(s) — plan for renewal or reinvestment.`,
        });
      }
    }
  });

  return {
    netWorth,
    totalAssets,
    totalLiabilities,
    debtToAssetRatio,
    bankTotal,
    investTotal,
    goldTotal,
    mfTotal,
    stockTotal,
    fdTotal,
    rdTotal,
    ppfTotal,
    npsTotal,
    epfTotal,
    bondsTotal,
    licTotal,
    investmentTotalPlans,
    loansGivenTotal,
    prepaidTotal,
    rentedDepositAsset,
    informalLentTotal,
    rentalPropertiesAsset,
    realEstateAsset,
    vehicleAsset,
    govtSchemesTotal,
    creditOutstanding,
    creditLimit,
    creditUtil,
    loanOutstanding,
    rentalDepositLiability,
    informalBorrowedTotal,
    realEstateOutstanding,
    monthExpense,
    monthIncome,
    netSavings,
    savingsPct,
    yesterdaySpend,
    yesterdayIncome,
    yesterdayCount,
    yesterdayTxns,
    dailyBudgetAllowance,
    yesterdayVsDailyBudgetPct,
    dayOfMonth,
    totalDaysInMonth,
    monthElapsedPct,
    totalBudgetLimit,
    totalBudgetSpent,
    totalBudgetSpentPct,
    past7DaysExpense,
    past7DaysIncome,
    past7DaysNetSavings,
    past7DaysCount,
    past7DaysTopCats,
    prior7DaysExpense,
    weeklySpendTrendPct,
    weeklyBudgetAllowance,
    weeklyBudgetSpentPct,
    efLiquidAssets,
    efMonthlyExpense,
    efMonthsCovered,
    efStatus,
    topCats,
    budgetStatus,
    dues,
    dues3Days,
    dues7Days,
    dues30Days,
    inflows,
    inflows3Days,
    inflows7Days,
    inflows30Days,
    totalDues3Days,
    totalDues7Days,
    totalDues30Days,
    totalInflows3Days,
    totalInflows7Days,
    totalInflows30Days,
    liquidityBuffer,
    liquidityBuffer3Days,
    liquidityBuffer7Days,
    fdMaturities30Days,
    goals,
    alerts,
    activeCardCount: activeCards.length,
    activeCards,
  };
}

// ── Shared HTML Email Helpers & Styles ─────────────────────────────────────────
const EMAIL_STYLES = {
  posColor: "#059669",
  posBg: "#ecfdf5",
  negColor: "#dc2626",
  negBg: "#fef2f2",
  warnColor: "#d97706",
  warnBg: "#fffbeb",
  accentColor: "#4f46e5",
  accentLight: "#e0e7ff",
  navyBg: "#0a0f1d",
  cardBg: "#ffffff",
  bodyBg: "#f8fafc",
  textPrimary: "#0f172a",
  textMuted: "#64748b",
  borderColor: "#e2e8f0",
};

function pctCalc(val, total) {
  return total > 0 ? Math.min(Math.round((val / total) * 100), 100) : 0;
}

function renderProgressBar(pctVal, color = EMAIL_STYLES.accentColor, height = 6) {
  const w = Math.max(Math.min(pctVal, 100), 2);
  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:6px;border-collapse:collapse;">
      <tr>
        <td style="background:#e2e8f0;border-radius:99px;height:${height}px;font-size:1px;line-height:${height}px;padding:0;">
          <table width="${w}%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
              <td style="background:${color};border-radius:99px;height:${height}px;font-size:1px;line-height:${height}px;">&nbsp;</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

function renderSectionHeader(title, badge = "", badgeColor = EMAIL_STYLES.accentColor, badgeBg = EMAIL_STYLES.accentLight) {
  return `
    <tr><td style="padding:26px 24px 10px;">
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="font-size:13px;font-weight:800;color:${EMAIL_STYLES.textPrimary};text-transform:uppercase;letter-spacing:0.08em;vertical-align:middle;">
            ${escapeHtml(title)}
          </td>
          ${
            badge
              ? `<td style="text-align:right;vertical-align:middle;">
                  <span style="display:inline-block;background:${badgeBg};color:${badgeColor};font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;text-transform:uppercase;letter-spacing:0.04em;">
                    ${escapeHtml(badge)}
                  </span>
                </td>`
              : ""
          }
        </tr>
      </table>
      <div style="height:2px;background:${EMAIL_STYLES.borderColor};margin-top:10px;border-radius:1px;"></div>
    </td></tr>`;
}

function renderAlertRows(alerts) {
  if (!alerts || alerts.length === 0) {
    return `
    <tr><td style="background:#ecfdf5;border-top:1px solid ${EMAIL_STYLES.borderColor};padding:20px 24px;text-align:center;">
      <div style="font-size:15px;font-weight:800;color:${EMAIL_STYLES.posColor};">Everything is looking healthy!</div>
      <div style="font-size:12px;color:${EMAIL_STYLES.textMuted};margin-top:4px;font-weight:500;">
        No urgent alerts, budgets are within limits, and emergency liquidity is intact.
      </div>
    </td></tr>`;
  }
  return alerts
    .map((a) => {
      const typeLabel = a.type === "alert" ? "CRITICAL" : a.type === "warn" ? "WARNING" : "INSIGHT";
      const bg = a.type === "alert" ? EMAIL_STYLES.negBg : a.type === "warn" ? EMAIL_STYLES.warnBg : EMAIL_STYLES.posBg;
      const border = a.type === "alert" ? EMAIL_STYLES.negColor : a.type === "warn" ? EMAIL_STYLES.warnColor : EMAIL_STYLES.posColor;
      const badgeColor = border;
      return `
      <tr><td style="padding:5px 24px;">
        <div style="background:${bg};border-left:4px solid ${border};border-radius:0 8px 8px 0;padding:11px 14px;font-size:12.5px;color:${EMAIL_STYLES.textPrimary};font-weight:500;line-height:1.5;">
          <span style="font-size:9.5px;font-weight:800;color:${badgeColor};text-transform:uppercase;margin-right:6px;letter-spacing:0.04em;">[${typeLabel}]</span>${escapeHtml(a.msg)}
        </div>
      </td></tr>`;
    })
    .join("");
}

function renderEmailShell(contentHtml, titleText) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(titleText)}</title>
<style>
  body { margin:0; padding:0; background-color:${EMAIL_STYLES.bodyBg}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; }
  table { border-collapse:collapse; }
  .dark-hero { background-color:#0a0f1d !important; color:#ffffff !important; }
  .dark-header { background-color:#0a0f1d !important; }
  .dark-footer { background-color:#0a0f1d !important; }
  @media only screen and (max-width:540px) {
    .main-wrap { width:100% !important; border-radius:0 !important; }
    .kpi-col { display:block !important; width:100% !important; margin-bottom:10px !important; }
    .kpi-space { display:none !important; }
    .sec-pad { padding-left:16px !important; padding-right:16px !important; }
    .hero-nw { font-size:34px !important; }
  }
</style>
</head>
<body bgcolor="${EMAIL_STYLES.bodyBg}" style="margin:0;padding:0;background-color:${EMAIL_STYLES.bodyBg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="${EMAIL_STYLES.bodyBg}" style="background-color:${EMAIL_STYLES.bodyBg};padding:20px 12px;">
<tr><td align="center">
<table class="main-wrap" width="620" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:620px;width:100%;margin:0 auto;background-color:#ffffff;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);border:1px solid ${EMAIL_STYLES.borderColor};">
${contentHtml}
</table>
</td></tr>
</table>
</body>
</html>`;
}

function renderFooterBlock(recipientName, cadenceDesc) {
  return `
  <!-- FOOTER & DASHBOARD CTA -->
  <tr bgcolor="${EMAIL_STYLES.navyBg}"><td bgcolor="${EMAIL_STYLES.navyBg}" class="dark-footer" style="background-color:${EMAIL_STYLES.navyBg};background:${EMAIL_STYLES.navyBg};padding:26px 24px;text-align:center;border-top:1px solid rgba(255,255,255,0.08);">
    <div style="margin-bottom:12px;">
      <a href="${APP_URL}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:13.5px;font-weight:700;padding:10px 22px;border-radius:8px;">
        Open ArthaDrishti Dashboard →
      </a>
    </div>
    <div style="font-size:11.5px;color:#94a3b8;line-height:1.7;font-weight:500;">
      Personal Finance by Anand Mohta · ${cadenceDesc} prepared for ${escapeHtml(recipientName)}<br>
      <a href="${APP_URL}/#settings" style="color:#64748b;text-decoration:none;font-size:11px;">
        Manage email preferences &amp; notification schedule
      </a>
    </div>
  </td></tr>`;
}

// ── CADENCE 1: DAILY DIGEST ───────────────────────────────────────────────────
// Tactical morning briefing focusing on yesterday's transactions, daily budget pace,
// liquid cash, and immediate 1–3 day obligations.
function renderDailyHTML(summary, recipientName, ist) {
  const {
    netWorth,
    bankTotal,
    creditUtil,
    yesterdaySpend,
    yesterdayCount,
    yesterdayTxns,
    dailyBudgetAllowance,
    yesterdayVsDailyBudgetPct,
    dues3Days,
    totalDues3Days,
    liquidityBuffer3Days,
    efMonthsCovered,
    activeCards,
    alerts,
  } = summary;

  const dateStr = ist.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const todayMs = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());

  const bufferColor = liquidityBuffer3Days >= 0 ? EMAIL_STYLES.posColor : EMAIL_STYLES.negColor;

  // Immediate due rows (Overdue, Today, Tomorrow, Next 3 Days)
  const dueRows = dues3Days.length > 0
    ? dues3Days
        .map((d, i) => {
          const dueTime = d.date.getTime();
          const daysUntil = Math.ceil((dueTime - todayMs) / 86400000);
          const isPast = daysUntil < 0;
          const isToday = daysUntil === 0;
          const isTomorrow = daysUntil === 1;
          const badgeText = isPast
            ? `${Math.abs(daysUntil)}d OVERDUE`
            : isToday
              ? "DUE TODAY"
              : isTomorrow
                ? "DUE TOMORROW"
                : `DUE IN ${daysUntil}D`;
          const badgeBg = isPast ? EMAIL_STYLES.negBg : isToday || isTomorrow ? EMAIL_STYLES.warnBg : "#f1f5f9";
          const badgeColor = isPast ? EMAIL_STYLES.negColor : isToday || isTomorrow ? EMAIL_STYLES.warnColor : EMAIL_STYLES.textMuted;
          const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
          return `
          <tr><td style="padding:11px 24px;background:${bg};border-bottom:1px solid ${EMAIL_STYLES.borderColor};">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:${EMAIL_STYLES.textPrimary};font-weight:600;">
                  <span style="display:inline-block;font-size:9.5px;font-weight:800;color:#b45309;background:#fef3c7;padding:2px 6px;border-radius:4px;margin-right:8px;vertical-align:middle;">${escapeHtml(d.category || "DUE")}</span>${escapeHtml(d.title || d.label)}
                </td>
                <td style="text-align:right;white-space:nowrap;">
                  <span style="font-size:14px;font-weight:800;color:${EMAIL_STYLES.textPrimary};margin-right:10px;">${fmtINRFull(d.amount)}</span>
                  <span style="display:inline-block;background:${badgeBg};color:${badgeColor};font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:4px;text-transform:uppercase;">
                    ${badgeText}
                  </span>
                </td>
              </tr>
            </table>
          </td></tr>`;
        })
        .join("")
    : `<tr><td style="padding:18px 24px;background:#f0fdf4;text-align:center;color:#15803d;font-size:13px;font-weight:600;">
        ✨ No bills or obligations due in the next 3 days. Clean immediate runway!
      </td></tr>`;

  // Yesterday transaction breakdown rows
  const yesterdayTxnRows = yesterdayTxns.length > 0
    ? yesterdayTxns
        .map((tx, i) => {
          const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
          return `
          <tr><td style="padding:10px 24px;background:${bg};border-bottom:1px solid ${EMAIL_STYLES.borderColor};">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:${EMAIL_STYLES.textPrimary};font-weight:600;">
                  <span style="display:inline-block;font-size:9.5px;font-weight:700;color:${EMAIL_STYLES.accentColor};background:${EMAIL_STYLES.accentLight};padding:2px 6px;border-radius:4px;margin-right:8px;vertical-align:middle;">${escapeHtml(tx.category)}</span>${escapeHtml(tx.title)}
                </td>
                <td style="font-size:13.5px;font-weight:800;color:${EMAIL_STYLES.textPrimary};text-align:right;">
                  ${fmtINRFull(tx.amount)}
                </td>
              </tr>
            </table>
          </td></tr>`;
        })
        .join("")
    : "";

  // Active credit cards summary
  const ccRows = activeCards
    .slice(0, 3)
    .map((c, i) => {
      const out = Number(c.outstanding) || 0;
      const lim = Number(c.limit || c.cardLimit) || 0;
      const u = lim > 0 ? Math.round((out / lim) * 100) : 0;
      const uColor = u >= 70 ? EMAIL_STYLES.negColor : u >= 40 ? EMAIL_STYLES.warnColor : EMAIL_STYLES.posColor;
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `
      <tr><td style="padding:10px 24px;background:${bg};border-bottom:1px solid ${EMAIL_STYLES.borderColor};">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;font-weight:700;color:${EMAIL_STYLES.textPrimary};">
              ${escapeHtml(c.issuer)} <span style="color:${EMAIL_STYLES.textMuted};font-weight:400;font-size:11px;">··${escapeHtml(c.last4) || "**"}</span>
            </td>
            <td style="text-align:right;">
              <span style="font-size:13.5px;font-weight:800;color:${EMAIL_STYLES.textPrimary};">${fmtINR(out)}</span>
              <span style="font-size:11px;color:${uColor};font-weight:700;margin-left:6px;">${u}% used</span>
            </td>
          </tr>
        </table>
      </td></tr>`;
    })
    .join("");

  const bodyHtml = `
  <!-- HEADER -->
  <tr bgcolor="${EMAIL_STYLES.navyBg}"><td bgcolor="${EMAIL_STYLES.navyBg}" class="dark-header" style="background-color:${EMAIL_STYLES.navyBg};background:${EMAIL_STYLES.navyBg};padding:22px 24px 18px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:middle;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;padding-right:10px;">
                <img src="${APP_URL}/favicon-192x192.png" width="30" height="30" alt="AD" style="display:block;border-radius:8px;">
              </td>
              <td style="vertical-align:middle;">
                <div style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.02em;">ArthaDrishti</div>
                <div style="font-size:12px;color:#94a3b8;font-weight:500;margin-top:2px;">Morning Briefing · ${dateStr}</div>
              </td>
            </tr>
          </table>
        </td>
        <td style="text-align:right;vertical-align:middle;">
          <div style="display:inline-block;background-color:#3b2d14;background:#3b2d14;border:1px solid #d97706;border-radius:20px;padding:5px 12px;">
            <span style="font-size:11px;font-weight:800;color:#fde68a;text-transform:uppercase;letter-spacing:0.06em;">
              Daily Digest
            </span>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- HERO: INSTANT LIQUID CASH & TODAY'S POSITION -->
  <tr bgcolor="#0a0f1d"><td bgcolor="#0a0f1d" class="dark-hero" style="background-color:#0a0f1d;background:linear-gradient(180deg, #0a0f1d 0%, #1c1917 100%);padding:26px 24px 28px;color:#ffffff;">
    <div style="font-size:12px;font-weight:700;color:#fde68a;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">
      Available Bank Balance &amp; Cash
    </div>
    <div class="hero-nw" style="font-size:42px;font-weight:900;color:#ffffff;letter-spacing:-0.03em;line-height:1.05;">
      ${fmtINRFull(bankTotal)}
    </div>

    <!-- Quick net worth & liquid reserves pill -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        <td bgcolor="#161e38" style="background-color:#161e38;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:9px 14px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Net Worth: </span>
                <span style="font-size:14px;color:#ffffff;font-weight:800;">${fmtINR(netWorth)}</span>
              </td>
              <td style="text-align:center;color:#64748b;font-size:14px;">·</td>
              <td style="text-align:right;">
                <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Runway: </span>
                <span style="font-size:14px;color:#34d399;font-weight:800;">${efMonthsCovered} mo</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- YESTERDAY'S SPENDING PULSE -->
  ${renderSectionHeader("Yesterday's Spending Pulse", yesterdayCount > 0 ? `${yesterdayCount} debit${yesterdayCount === 1 ? "" : "s"}` : "Clean Day", "#b45309", "#fef3c7")}
  <tr><td style="padding:4px 24px 12px;background:${EMAIL_STYLES.cardBg};">
    ${
      yesterdaySpend > 0
        ? `
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 16px;margin-bottom:12px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <div style="font-size:11px;color:#92400e;text-transform:uppercase;font-weight:800;letter-spacing:0.04em;">Total Outflow Yesterday</div>
            <div style="font-size:22px;font-weight:900;color:#78350f;margin-top:2px;">${fmtINRFull(yesterdaySpend)}</div>
          </td>
          ${
            dailyBudgetAllowance > 0
              ? `
          <td style="text-align:right;">
            <div style="font-size:11px;color:#92400e;text-transform:uppercase;font-weight:700;">Daily Budget Target</div>
            <div style="font-size:14px;font-weight:800;color:${yesterdayVsDailyBudgetPct > 100 ? EMAIL_STYLES.negColor : EMAIL_STYLES.posColor};margin-top:2px;">
              ${fmtINR(dailyBudgetAllowance)} (${yesterdayVsDailyBudgetPct}% used)
            </div>
          </td>`
              : ""
          }
        </tr>
      </table>
    </div>`
        : `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px 16px;text-align:center;margin-bottom:8px;">
      <div style="font-size:14px;font-weight:800;color:#166534;">Zero expenses yesterday! 🎉</div>
      <div style="font-size:12px;color:#15803d;margin-top:2px;">No debits recorded across your bank &amp; card accounts.</div>
    </div>`
    }
  </td></tr>
  ${yesterdayTxnRows ? `<tr><td style="background:${EMAIL_STYLES.cardBg};">${yesterdayTxnRows}</td></tr>` : ""}

  <!-- IMMEDIATE ACTION ITEMS (NEXT 3 DAYS) -->
  ${renderSectionHeader("Immediate Dues (Today & Next 3 Days)", `${dues3Days.length} due`, dues3Days.length > 0 ? "#b45309" : "#059669", dues3Days.length > 0 ? "#fef3c7" : "#ecfdf5")}
  <tr><td style="background:${EMAIL_STYLES.cardBg};">
    ${dueRows}
  </td></tr>
  <tr><td style="padding:12px 24px;background:#f8fafc;border-bottom:1px solid ${EMAIL_STYLES.borderColor};">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:12px;font-weight:700;color:${EMAIL_STYLES.textMuted};text-transform:uppercase;">3-Day Immediate Outflow</td>
        <td style="font-size:15px;font-weight:900;color:${EMAIL_STYLES.textPrimary};text-align:right;">${fmtINRFull(totalDues3Days)}</td>
      </tr>
      <tr>
        <td style="font-size:11px;color:${EMAIL_STYLES.textMuted};padding-top:4px;">Cash Buffer After 3-Day Dues:</td>
        <td style="font-size:12px;font-weight:700;color:${bufferColor};text-align:right;padding-top:4px;">
          ${bankTotal >= totalDues3Days ? `Safe (+${fmtINR(liquidityBuffer3Days)})` : `Deficit: ${fmtINR(Math.abs(liquidityBuffer3Days))}`}
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- CREDIT CARD QUICK PULSE -->
  ${
    activeCards.length > 0
      ? `
  ${renderSectionHeader(`Credit Cards (${creditUtil}% utilized)`)}
  <tr><td style="background:${EMAIL_STYLES.cardBg};">
    ${ccRows}
  </td></tr>`
      : ""
  }

  <!-- URGENT ALERTS -->
  ${
    alerts.length > 0
      ? `
  ${renderSectionHeader("Immediate Action Items", `${alerts.length} alert${alerts.length === 1 ? "" : "s"}`)}
  <tr><td style="background:${EMAIL_STYLES.cardBg};padding-bottom:14px;">
    ${renderAlertRows(alerts.slice(0, 3))}
  </td></tr>`
      : ""
  }

  ${renderFooterBlock(recipientName, "Daily Digest")}`;

  return renderEmailShell(bodyHtml, `ArthaDrishti Daily Digest · ${dateStr}`);
}

// ── CADENCE 2: WEEKLY BRIEFING ────────────────────────────────────────────────
// Tactical 7-day review: past 7 days spending breakdown, week-over-week trend,
// upcoming 7-day forward obligations, weekly budget burn rate, and top goals.
function renderWeeklyHTML(summary, recipientName, ist) {
  const {
    netWorth,
    totalAssets,
    totalLiabilities,
    bankTotal,
    past7DaysExpense,
    past7DaysIncome,
    past7DaysNetSavings,
    past7DaysCount,
    past7DaysTopCats,
    weeklySpendTrendPct,
    weeklyBudgetAllowance,
    weeklyBudgetSpentPct,
    monthElapsedPct,
    dues7Days,
    inflows7Days,
    totalDues7Days,
    liquidityBuffer7Days,
    goals,
    alerts,
  } = summary;

  const bufferColor = liquidityBuffer7Days >= 0 ? EMAIL_STYLES.posColor : EMAIL_STYLES.negColor;
  const bufferBg = liquidityBuffer7Days >= 0 ? EMAIL_STYLES.posBg : EMAIL_STYLES.negBg;
  const todayMs = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());

  // Past 7 days top category rows
  const maxCatAmt = past7DaysTopCats[0]?.amt || 1;
  const catRows = past7DaysTopCats.length > 0
    ? past7DaysTopCats
        .map(({ cat, amt }, i) => {
          const p = pctCalc(amt, past7DaysExpense);
          const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
          return `
          <tr><td style="padding:11px 24px;background:${bg};border-bottom:1px solid ${EMAIL_STYLES.borderColor};">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:${EMAIL_STYLES.textPrimary};font-weight:600;">${escapeHtml(cat)}</td>
                <td style="font-size:13.5px;font-weight:800;color:${EMAIL_STYLES.textPrimary};text-align:right;">
                  ${fmtINRFull(amt)} <span style="color:${EMAIL_STYLES.textMuted};font-weight:500;font-size:11px;">(${p}%)</span>
                </td>
              </tr>
            </table>
            ${renderProgressBar(pctCalc(amt, maxCatAmt), EMAIL_STYLES.accentColor, 5)}
          </td></tr>`;
        })
        .join("")
    : `<tr><td style="padding:16px 24px;text-align:center;color:${EMAIL_STYLES.textMuted};font-size:13px;">No expenses recorded in the past 7 days.</td></tr>`;

  // Next 7 days due rows
  const dueRows = dues7Days.length > 0
    ? dues7Days
        .slice(0, 6)
        .map((d, i) => {
          const dueTime = d.date.getTime();
          const daysUntil = Math.ceil((dueTime - todayMs) / 86400000);
          const isPast = daysUntil < 0;
          const isToday = daysUntil === 0;
          const badgeText = isPast
            ? `${Math.abs(daysUntil)}d OVERDUE`
            : isToday
              ? "DUE TODAY"
              : `DUE IN ${daysUntil}D`;
          const badgeBg = isPast ? EMAIL_STYLES.negBg : isToday ? EMAIL_STYLES.warnBg : "#f1f5f9";
          const badgeColor = isPast ? EMAIL_STYLES.negColor : isToday ? EMAIL_STYLES.warnColor : EMAIL_STYLES.textMuted;
          const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
          return `
          <tr><td style="padding:11px 24px;background:${bg};border-bottom:1px solid ${EMAIL_STYLES.borderColor};">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:${EMAIL_STYLES.textPrimary};font-weight:600;">
                  <span style="display:inline-block;font-size:9.5px;font-weight:800;color:${EMAIL_STYLES.accentColor};background:${EMAIL_STYLES.accentLight};padding:2px 6px;border-radius:4px;margin-right:8px;vertical-align:middle;">${escapeHtml(d.category || "DUE")}</span>${escapeHtml(d.title || d.label)}
                </td>
                <td style="text-align:right;white-space:nowrap;">
                  <span style="font-size:14px;font-weight:800;color:${EMAIL_STYLES.textPrimary};margin-right:8px;">${fmtINRFull(d.amount)}</span>
                  <span style="display:inline-block;background:${badgeBg};color:${badgeColor};font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;text-transform:uppercase;">
                    ${badgeText}
                  </span>
                </td>
              </tr>
            </table>
          </td></tr>`;
        })
        .join("")
    : `<tr><td style="padding:16px 24px;text-align:center;color:#15803d;font-size:13px;">No obligations due in next 7 days!</td></tr>`;

  // Inflow rows
  const inflowRows = inflows7Days
    .map((inf) => `
    <tr>
      <td style="padding:10px 24px;background:#f0fdf4;border-bottom:1px solid #bbf7d0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;color:#166534;font-weight:600;">
              <span style="display:inline-block;font-size:9px;font-weight:800;color:#166534;background:#bbf7d0;padding:2px 6px;border-radius:4px;margin-right:8px;vertical-align:middle;">INFLOW</span>${escapeHtml(inf.label)}
              <span style="font-size:11px;color:#15803d;font-weight:500;"> · ${inf.date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
            </td>
            <td style="font-size:13.5px;font-weight:800;color:${EMAIL_STYLES.posColor};text-align:right;">
              +${fmtINRFull(inf.amount)}
            </td>
          </tr>
        </table>
      </td>
    </tr>`)
    .join("");

  // Goal rows
  const goalRows = goals.slice(0, 3).map((g, i) => {
    const barColor = g.pct >= 80 ? EMAIL_STYLES.posColor : g.pct >= 50 ? EMAIL_STYLES.accentColor : EMAIL_STYLES.warnColor;
    const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
    return `
    <tr><td style="padding:11px 24px;background:${bg};border-bottom:1px solid ${EMAIL_STYLES.borderColor};">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;font-weight:700;color:${EMAIL_STYLES.textPrimary};">${escapeHtml(g.name)}</td>
          <td style="font-size:13.5px;font-weight:900;color:${barColor};text-align:right;">${g.pct}%</td>
        </tr>
      </table>
      ${renderProgressBar(g.pct, barColor, 5)}
      <div style="font-size:11px;color:${EMAIL_STYLES.textMuted};margin-top:4px;font-weight:500;">
        ${fmtINR(g.current)} of ${fmtINR(g.target)}
      </div>
    </td></tr>`;
  }).join("");

  const bodyHtml = `
  <!-- HEADER -->
  <tr bgcolor="${EMAIL_STYLES.navyBg}"><td bgcolor="${EMAIL_STYLES.navyBg}" class="dark-header" style="background-color:${EMAIL_STYLES.navyBg};background:${EMAIL_STYLES.navyBg};padding:22px 24px 18px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:middle;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;padding-right:10px;">
                <img src="${APP_URL}/favicon-192x192.png" width="30" height="30" alt="AD" style="display:block;border-radius:8px;">
              </td>
              <td style="vertical-align:middle;">
                <div style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.02em;">ArthaDrishti</div>
                <div style="font-size:12px;color:#94a3b8;font-weight:500;margin-top:2px;">Weekly Briefing · Week of ${weekRange()}</div>
              </td>
            </tr>
          </table>
        </td>
        <td style="text-align:right;vertical-align:middle;">
          <div style="display:inline-block;background-color:#312e81;background:linear-gradient(135deg, #312e81, #1e1b4b);border:1px solid #4338ca;border-radius:20px;padding:5px 12px;">
            <span style="font-size:11px;font-weight:800;color:#c7d2fe;text-transform:uppercase;letter-spacing:0.06em;">
              Weekly Briefing
            </span>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- HERO: NET WORTH -->
  <tr bgcolor="#0a0f1d"><td bgcolor="#0a0f1d" class="dark-hero" style="background-color:#0a0f1d;background:linear-gradient(180deg, #0a0f1d 0%, #161e38 100%);padding:26px 24px 30px;color:#ffffff;">
    <div style="font-size:12px;font-weight:700;color:#a5b4fc;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">
      Total Household Net Worth
    </div>
    <div class="hero-nw" style="font-size:42px;font-weight:900;color:#ffffff;letter-spacing:-0.03em;line-height:1.05;">
      ${fmtINRFull(netWorth)}
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        <td bgcolor="#161e38" style="background-color:#161e38;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:9px 14px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Assets: </span>
                <span style="font-size:14px;color:#34d399;font-weight:800;">${fmtINR(totalAssets)}</span>
              </td>
              <td style="text-align:center;color:#64748b;font-size:14px;">·</td>
              <td style="text-align:right;">
                <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Liabilities: </span>
                <span style="font-size:14px;color:#fca5a5;font-weight:800;">${fmtINR(totalLiabilities)}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- 4-CARD WEEKLY KPI GRID -->
  <tr><td style="padding:16px 24px 6px;background:${EMAIL_STYLES.cardBg};">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <!-- Past 7d spend -->
        <td class="kpi-col" width="48%" style="padding:14px 16px;background:${EMAIL_STYLES.bodyBg};border:1px solid ${EMAIL_STYLES.borderColor};border-radius:10px;vertical-align:top;">
          <div style="font-size:11px;color:${EMAIL_STYLES.textMuted};text-transform:uppercase;font-weight:700;letter-spacing:0.04em;">Past 7-Day Spend</div>
          <div style="font-size:20px;font-weight:900;color:${EMAIL_STYLES.textPrimary};margin-top:4px;">${fmtINRFull(past7DaysExpense)}</div>
          <div style="font-size:11px;color:${weeklySpendTrendPct !== null && weeklySpendTrendPct > 0 ? EMAIL_STYLES.warnColor : EMAIL_STYLES.posColor};margin-top:2px;font-weight:600;">
            ${weeklySpendTrendPct !== null ? `${weeklySpendTrendPct > 0 ? "+" : ""}${weeklySpendTrendPct}% vs prior week` : `${past7DaysCount} debit${past7DaysCount === 1 ? "" : "s"}`}
          </div>
        </td>
        <td class="kpi-space" width="4%"></td>
        <!-- Past 7d income -->
        <td class="kpi-col" width="48%" style="padding:14px 16px;background:${EMAIL_STYLES.bodyBg};border:1px solid ${EMAIL_STYLES.borderColor};border-radius:10px;vertical-align:top;">
          <div style="font-size:11px;color:${EMAIL_STYLES.textMuted};text-transform:uppercase;font-weight:700;letter-spacing:0.04em;">Past 7-Day Income</div>
          <div style="font-size:20px;font-weight:900;color:${EMAIL_STYLES.posColor};margin-top:4px;">${fmtINRFull(past7DaysIncome)}</div>
          <div style="font-size:11px;color:${EMAIL_STYLES.textMuted};margin-top:2px;">
            Net saved: ${past7DaysNetSavings >= 0 ? "+" : "-"}${fmtINR(Math.abs(past7DaysNetSavings))}
          </div>
        </td>
      </tr>
      <tr><td colspan="3" style="height:10px;"></td></tr>
      <tr>
        <!-- Next 7d dues -->
        <td class="kpi-col" width="48%" style="padding:14px 16px;background:${EMAIL_STYLES.bodyBg};border:1px solid ${EMAIL_STYLES.borderColor};border-radius:10px;vertical-align:top;">
          <div style="font-size:11px;color:${EMAIL_STYLES.textMuted};text-transform:uppercase;font-weight:700;letter-spacing:0.04em;">Next 7-Day Dues</div>
          <div style="font-size:20px;font-weight:900;color:${EMAIL_STYLES.textPrimary};margin-top:4px;">${fmtINRFull(totalDues7Days)}</div>
          <div style="font-size:11px;color:${EMAIL_STYLES.textMuted};margin-top:2px;">${dues7Days.length} obligations due</div>
        </td>
        <td class="kpi-space" width="4%"></td>
        <!-- 7-Day Cash Buffer -->
        <td class="kpi-col" width="48%" style="padding:14px 16px;background:${EMAIL_STYLES.bodyBg};border:1px solid ${EMAIL_STYLES.borderColor};border-radius:10px;vertical-align:top;">
          <div style="font-size:11px;color:${EMAIL_STYLES.textMuted};text-transform:uppercase;font-weight:700;letter-spacing:0.04em;">7-Day Cash Buffer</div>
          <div style="font-size:20px;font-weight:900;color:${bufferColor};margin-top:4px;">${liquidityBuffer7Days >= 0 ? "+" : "-"}${fmtINR(Math.abs(liquidityBuffer7Days))}</div>
          <div style="display:inline-block;background:${bufferBg};color:${bufferColor};font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;margin-top:2px;">
            ${liquidityBuffer7Days >= 0 ? "Comfortably covered" : "Attention needed"}
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- PAST 7 DAYS CATEGORY SPENDING -->
  ${renderSectionHeader("Past 7 Days Spending by Category", fmtINR(past7DaysExpense))}
  <tr><td style="background:${EMAIL_STYLES.cardBg};">
    ${catRows}
  </td></tr>

  <!-- UPCOMING 7 DAYS OBLIGATIONS & INFLOWS -->
  ${renderSectionHeader("Upcoming Obligations — Next 7 Days", `${dues7Days.length} upcoming`)}
  ${inflowRows}
  <tr><td style="background:${EMAIL_STYLES.cardBg};">
    ${dueRows}
  </td></tr>
  <tr><td style="padding:12px 24px;background:#f8fafc;border-bottom:1px solid ${EMAIL_STYLES.borderColor};">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:12px;font-weight:700;color:${EMAIL_STYLES.textMuted};text-transform:uppercase;">Total 7-Day Outflow</td>
        <td style="font-size:15px;font-weight:900;color:${EMAIL_STYLES.textPrimary};text-align:right;">${fmtINRFull(totalDues7Days)}</td>
      </tr>
      <tr>
        <td style="font-size:11px;color:${EMAIL_STYLES.textMuted};padding-top:4px;">Bank Balance Coverage:</td>
        <td style="font-size:12px;font-weight:700;color:${bufferColor};text-align:right;padding-top:4px;">
          ${bankTotal >= totalDues7Days ? `Safe (+${fmtINR(liquidityBuffer7Days)} remaining)` : `Deficit: ${fmtINR(Math.abs(liquidityBuffer7Days))}`}
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- WEEKLY BUDGET PACE -->
  ${
    weeklyBudgetAllowance > 0
      ? `
  ${renderSectionHeader("Weekly Budget Pacing", `${monthElapsedPct}% of month elapsed`)}
  <tr><td style="padding:4px 24px 16px;background:${EMAIL_STYLES.cardBg};">
    <div style="background:#ffffff;border:1px solid ${EMAIL_STYLES.borderColor};border-radius:8px;padding:12px 14px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:12.5px;color:${EMAIL_STYLES.textPrimary};font-weight:700;">Past 7 Days vs Weekly Target</td>
          <td style="font-size:13px;font-weight:800;color:${weeklyBudgetSpentPct > 100 ? EMAIL_STYLES.negColor : EMAIL_STYLES.posColor};text-align:right;">
            ${fmtINR(past7DaysExpense)} / ${fmtINR(weeklyBudgetAllowance)} (${weeklyBudgetSpentPct}%)
          </td>
        </tr>
      </table>
      ${renderProgressBar(weeklyBudgetSpentPct, weeklyBudgetSpentPct > 100 ? EMAIL_STYLES.negColor : EMAIL_STYLES.posColor, 6)}
    </div>
  </td></tr>`
      : ""
  }

  <!-- GOALS PROGRESS -->
  ${
    goalRows
      ? `
  ${renderSectionHeader("Financial Goals Progress")}
  <tr><td style="background:${EMAIL_STYLES.cardBg};">
    ${goalRows}
  </td></tr>`
      : ""
  }

  <!-- SMART ALERTS -->
  ${
    alerts.length > 0
      ? `
  ${renderSectionHeader("Weekly Smart Insights", `${alerts.length} item${alerts.length === 1 ? "" : "s"}`)}
  <tr><td style="background:${EMAIL_STYLES.cardBg};padding-bottom:14px;">
    ${renderAlertRows(alerts)}
  </td></tr>`
      : ""
  }

  ${renderFooterBlock(recipientName, "Weekly Briefing")}`;

  return renderEmailShell(bodyHtml, `ArthaDrishti Weekly Briefing · Week of ${weekRange()}`);
}

// ── CADENCE 3: MONTHLY EXECUTIVE STATEMENT ────────────────────────────────────
// Comprehensive executive statement covering full month cash flow, category-by-category
// budget adherence, complete balance sheet (all investment assets & liabilities),
// emergency fund audit, goals milestone tracker, and 30-day forward outlook.
function renderMonthlyHTML(summary, recipientName, ist) {
  const {
    netWorth,
    totalAssets,
    totalLiabilities,
    debtToAssetRatio,
    bankTotal,
    investTotal,
    goldTotal,
    mfTotal,
    stockTotal,
    fdTotal,
    rdTotal,
    ppfTotal,
    npsTotal,
    epfTotal,
    bondsTotal,
    licTotal,
    investmentTotalPlans,
    loansGivenTotal,
    prepaidTotal,
    rentedDepositAsset,
    informalLentTotal,
    rentalPropertiesAsset,
    realEstateAsset,
    vehicleAsset,
    govtSchemesTotal,
    creditOutstanding,
    creditUtil,
    loanOutstanding,
    rentalDepositLiability,
    informalBorrowedTotal,
    realEstateOutstanding,
    monthExpense,
    monthIncome,
    netSavings,
    savingsPct,
    totalBudgetLimit,
    totalBudgetSpentPct,
    efLiquidAssets,
    efMonthlyExpense,
    efMonthsCovered,
    efStatus,
    topCats,
    budgetStatus,
    goals,
    alerts,
    fdMaturities30Days,
    dues30Days,
  } = summary;

  const monthStr = monthLabel();
  const savRateColor = savingsPct >= 30 ? EMAIL_STYLES.posColor : savingsPct >= 15 ? EMAIL_STYLES.warnColor : EMAIL_STYLES.negColor;

  let rowIdx = 0;
  function listRow(label, value, icon) {
    const bg = rowIdx++ % 2 === 0 ? "#ffffff" : "#f8fafc";
    return `
    <tr><td style="padding:11px 24px;background:${bg};border-bottom:1px solid ${EMAIL_STYLES.borderColor};">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:13px;color:${EMAIL_STYLES.textPrimary};font-weight:600;">${icon ? icon + " " : ""}${escapeHtml(label)}</td>
        <td style="font-size:13.5px;font-weight:800;color:${EMAIL_STYLES.textPrimary};text-align:right;">${value}</td>
      </tr></table>
    </td></tr>`;
  }

  // Monthly top category rows
  const maxCatAmt = topCats[0]?.amt || 1;
  const catRows = topCats
    .map(({ cat, amt }, i) => {
      const p = pctCalc(amt, monthExpense);
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `
      <tr><td style="padding:11px 24px;background:${bg};border-bottom:1px solid ${EMAIL_STYLES.borderColor};">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;color:${EMAIL_STYLES.textPrimary};font-weight:600;">${escapeHtml(cat)}</td>
            <td style="font-size:13.5px;font-weight:800;color:${EMAIL_STYLES.textPrimary};text-align:right;">
              ${fmtINRFull(amt)} <span style="color:${EMAIL_STYLES.textMuted};font-weight:500;font-size:11px;">(${p}%)</span>
            </td>
          </tr>
        </table>
        ${renderProgressBar(pctCalc(amt, maxCatAmt), EMAIL_STYLES.accentColor, 5)}
      </td></tr>`;
    })
    .join("");

  // Budget status rows
  const budgetRows = budgetStatus
    .map((b, i) => {
      const barColor = b.over ? EMAIL_STYLES.negColor : b.pct >= 85 ? EMAIL_STYLES.warnColor : EMAIL_STYLES.posColor;
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `
      <tr><td style="padding:11px 24px;background:${bg};border-bottom:1px solid ${EMAIL_STYLES.borderColor};">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;font-weight:700;color:${EMAIL_STYLES.textPrimary};">${escapeHtml(b.category)}</td>
            <td style="font-size:13px;font-weight:800;color:${barColor};text-align:right;">
              ${fmtINR(b.spent)} / ${fmtINR(b.limit)} (${b.pct}%)
            </td>
          </tr>
        </table>
        ${renderProgressBar(b.pct, barColor, 5)}
      </td></tr>`;
    })
    .join("");

  // Investment categories
  rowIdx = 0;
  const investCategories = [
    { label: "Mutual Funds", amt: mfTotal },
    { label: "Stocks & Equities", amt: stockTotal },
    { label: "Fixed Deposits", amt: fdTotal },
    { label: "Recurring Deposits", amt: rdTotal },
    { label: "PPF", amt: ppfTotal },
    { label: "NPS", amt: npsTotal },
    { label: "EPF", amt: epfTotal },
    { label: "Bonds & Debentures", amt: bondsTotal },
    { label: "LIC / Insurance Savings", amt: licTotal },
    { label: "Investment Plans", amt: investmentTotalPlans },
  ].filter((c) => c.amt > 0);
  const investPcts = largestRemainderRound(investCategories.map((c) => c.amt), investTotal);
  const investRows = investCategories
    .map((c, i) => listRow(c.label, `${fmtINR(c.amt)} <span style="color:${EMAIL_STYLES.textMuted};font-weight:500;font-size:11.5px;">(${investPcts[i]}%)</span>`))
    .join("");

  // Other assets
  rowIdx = 0;
  const otherAssetItems = [
    goldTotal > 0 && listRow("Gold & SGBs", fmtINR(goldTotal)),
    realEstateAsset > 0 && listRow("Real Estate", fmtINR(realEstateAsset)),
    vehicleAsset > 0 && listRow("Vehicles", fmtINR(vehicleAsset)),
    rentalPropertiesAsset > 0 && listRow("Rental Properties", fmtINR(rentalPropertiesAsset)),
    loansGivenTotal > 0 && listRow("Loans Given", fmtINR(loansGivenTotal)),
    informalLentTotal > 0 && listRow("Informal Lending", fmtINR(informalLentTotal)),
    prepaidTotal > 0 && listRow("Prepaid Cards", fmtINR(prepaidTotal)),
    rentedDepositAsset > 0 && listRow("Security Deposits Paid", fmtINR(rentedDepositAsset)),
    govtSchemesTotal > 0 && listRow("Govt Schemes", fmtINR(govtSchemesTotal)),
  ].filter(Boolean).join("");

  // Liabilities
  rowIdx = 0;
  const liabilityItems = [
    loanOutstanding > 0 && listRow("Loans Outstanding", fmtINR(loanOutstanding)),
    creditOutstanding > 0 && listRow(`Credit Card Dues (${creditUtil}% limit used)`, fmtINR(creditOutstanding)),
    informalBorrowedTotal > 0 && listRow("Informal Borrowings", fmtINR(informalBorrowedTotal)),
    rentalDepositLiability > 0 && listRow("Tenant Deposits Owed", fmtINR(rentalDepositLiability)),
    realEstateOutstanding > 0 && listRow("Real Estate Construction Dues", fmtINR(realEstateOutstanding)),
  ].filter(Boolean).join("");

  // Goals
  const goalRows = goals.map((g, i) => {
    const barColor = g.pct >= 80 ? EMAIL_STYLES.posColor : g.pct >= 50 ? EMAIL_STYLES.accentColor : EMAIL_STYLES.warnColor;
    const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
    return `
    <tr><td style="padding:11px 24px;background:${bg};border-bottom:1px solid ${EMAIL_STYLES.borderColor};">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;font-weight:700;color:${EMAIL_STYLES.textPrimary};">${escapeHtml(g.name)}</td>
          <td style="font-size:13.5px;font-weight:900;color:${barColor};text-align:right;">${g.pct}%</td>
        </tr>
      </table>
      ${renderProgressBar(g.pct, barColor, 5)}
      <div style="font-size:11px;color:${EMAIL_STYLES.textMuted};margin-top:4px;font-weight:500;">
        ${fmtINR(g.current)} of ${fmtINR(g.target)}
      </div>
    </td></tr>`;
  }).join("");

  // Forward 30 days outlook items
  const outlookItems = [
    ...(fdMaturities30Days || []).map((fd) => ({
      label: `FD Maturity at ${fd.bank || "Bank"}`,
      dateStr: dateLabel(fd.maturityDate),
      amount: Number(fd.principal || 0),
      type: "inflow",
    })),
    ...(dues30Days || []).slice(0, 5).map((d) => ({
      label: d.label,
      dateStr: dateLabel(d.date.toISOString()),
      amount: Number(d.amount || 0),
      type: "outflow",
    })),
  ];

  const outlookRows = outlookItems.length > 0
    ? outlookItems
        .map((it, i) => {
          const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
          const isInf = it.type === "inflow";
          return `
          <tr><td style="padding:10px 24px;background:${bg};border-bottom:1px solid ${EMAIL_STYLES.borderColor};">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="font-size:13px;color:${EMAIL_STYLES.textPrimary};font-weight:600;">
                  <span style="display:inline-block;font-size:9.5px;font-weight:800;color:${isInf ? "#166534" : "#b45309"};background:${isInf ? "#bbf7d0" : "#fef3c7"};padding:2px 6px;border-radius:4px;margin-right:8px;vertical-align:middle;">${isInf ? "INFLOW" : "DUE"}</span>${escapeHtml(it.label)}
                  <span style="font-size:11px;color:${EMAIL_STYLES.textMuted};"> · ${it.dateStr}</span>
                </td>
                <td style="font-size:13.5px;font-weight:800;color:${isInf ? EMAIL_STYLES.posColor : EMAIL_STYLES.textPrimary};text-align:right;">
                  ${isInf ? "+" : ""}${fmtINRFull(it.amount)}
                </td>
              </tr>
            </table>
          </td></tr>`;
        })
        .join("")
    : "";

  const bodyHtml = `
  <!-- HEADER -->
  <tr bgcolor="${EMAIL_STYLES.navyBg}"><td bgcolor="${EMAIL_STYLES.navyBg}" class="dark-header" style="background-color:${EMAIL_STYLES.navyBg};background:${EMAIL_STYLES.navyBg};padding:22px 24px 18px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:middle;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;padding-right:10px;">
                <img src="${APP_URL}/favicon-192x192.png" width="30" height="30" alt="AD" style="display:block;border-radius:8px;">
              </td>
              <td style="vertical-align:middle;">
                <div style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.02em;">ArthaDrishti</div>
                <div style="font-size:12px;color:#94a3b8;font-weight:500;margin-top:2px;">Monthly Executive Statement · ${monthStr}</div>
              </td>
            </tr>
          </table>
        </td>
        <td style="text-align:right;vertical-align:middle;">
          <div style="display:inline-block;background-color:#064e3b;background:linear-gradient(135deg, #064e3b, #022c22);border:1px solid #059669;border-radius:20px;padding:5px 12px;">
            <span style="font-size:11px;font-weight:800;color:#a7f3d0;text-transform:uppercase;letter-spacing:0.06em;">
              Monthly Executive
            </span>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- HERO: NET WORTH & BALANCE SHEET PILL -->
  <tr bgcolor="#0a0f1d"><td bgcolor="#0a0f1d" class="dark-hero" style="background-color:#0a0f1d;background:linear-gradient(180deg, #0a0f1d 0%, #06241b 100%);padding:28px 24px 32px;color:#ffffff;">
    <div style="font-size:12px;font-weight:700;color:#a7f3d0;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px;">
      Total Household Net Worth
    </div>
    <div class="hero-nw" style="font-size:44px;font-weight:900;color:#ffffff;letter-spacing:-0.03em;line-height:1.05;">
      ${fmtINRFull(netWorth)}
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        <td bgcolor="#06241b" style="background-color:#06241b;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:10px 14px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Total Assets: </span>
                <span style="font-size:14.5px;color:#34d399;font-weight:800;">${fmtINR(totalAssets)}</span>
              </td>
              <td style="text-align:center;color:#64748b;font-size:14px;">·</td>
              <td style="text-align:right;">
                <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;">Liabilities: </span>
                <span style="font-size:14.5px;color:#fca5a5;font-weight:800;">${fmtINR(totalLiabilities)}</span>
                <span style="font-size:11px;color:#94a3b8;margin-left:4px;">(${debtToAssetRatio}% debt)</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- 4-CARD EXECUTIVE KPI GRID -->
  <tr><td style="padding:16px 24px 6px;background:${EMAIL_STYLES.cardBg};">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <!-- Month Income -->
        <td class="kpi-col" width="48%" style="padding:14px 16px;background:${EMAIL_STYLES.bodyBg};border:1px solid ${EMAIL_STYLES.borderColor};border-radius:10px;vertical-align:top;">
          <div style="font-size:11px;color:${EMAIL_STYLES.textMuted};text-transform:uppercase;font-weight:700;letter-spacing:0.04em;">Monthly Income MTD</div>
          <div style="font-size:20px;font-weight:900;color:${EMAIL_STYLES.posColor};margin-top:4px;">${fmtINRFull(monthIncome)}</div>
          <div style="font-size:11px;color:${EMAIL_STYLES.textMuted};margin-top:2px;">All verified revenue streams</div>
        </td>
        <td class="kpi-space" width="4%"></td>
        <!-- Month Expense -->
        <td class="kpi-col" width="48%" style="padding:14px 16px;background:${EMAIL_STYLES.bodyBg};border:1px solid ${EMAIL_STYLES.borderColor};border-radius:10px;vertical-align:top;">
          <div style="font-size:11px;color:${EMAIL_STYLES.textMuted};text-transform:uppercase;font-weight:700;letter-spacing:0.04em;">Monthly Expenses MTD</div>
          <div style="font-size:20px;font-weight:900;color:${EMAIL_STYLES.negColor};margin-top:4px;">${fmtINRFull(monthExpense)}</div>
          <div style="font-size:11px;color:${EMAIL_STYLES.textMuted};margin-top:2px;">Operational + Living expenses</div>
        </td>
      </tr>
      <tr><td colspan="3" style="height:10px;"></td></tr>
      <tr>
        <!-- Net Saved & Rate -->
        <td class="kpi-col" width="48%" style="padding:14px 16px;background:${EMAIL_STYLES.bodyBg};border:1px solid ${EMAIL_STYLES.borderColor};border-radius:10px;vertical-align:top;">
          <div style="font-size:11px;color:${EMAIL_STYLES.textMuted};text-transform:uppercase;font-weight:700;letter-spacing:0.04em;">Net Saved &amp; Savings Rate</div>
          <div style="font-size:20px;font-weight:900;color:${netSavings >= 0 ? EMAIL_STYLES.posColor : EMAIL_STYLES.negColor};margin-top:4px;">
            ${netSavings >= 0 ? "+" : "-"}${fmtINRFull(Math.abs(netSavings))}
          </div>
          <div style="display:inline-block;background:${savingsPct >= 20 ? EMAIL_STYLES.posBg : EMAIL_STYLES.warnBg};color:${savRateColor};font-size:10.5px;font-weight:700;padding:2px 6px;border-radius:4px;margin-top:2px;">
            ${savingsPct}% savings rate
          </div>
        </td>
        <td class="kpi-space" width="4%"></td>
        <!-- Emergency Runway -->
        <td class="kpi-col" width="48%" style="padding:14px 16px;background:${EMAIL_STYLES.bodyBg};border:1px solid ${EMAIL_STYLES.borderColor};border-radius:10px;vertical-align:top;">
          <div style="font-size:11px;color:${EMAIL_STYLES.textMuted};text-transform:uppercase;font-weight:700;letter-spacing:0.04em;">Emergency Runway</div>
          <div style="font-size:20px;font-weight:900;color:${efStatus.color};margin-top:4px;">${efMonthsCovered} mo</div>
          <div style="display:inline-block;background:${efStatus.color === EMAIL_STYLES.posColor ? EMAIL_STYLES.posBg : EMAIL_STYLES.warnBg};color:${efStatus.color};font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;margin-top:2px;">
            ${efStatus.label} · 6mo target
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- TOP EXPENSE CATEGORIES THIS MONTH -->
  ${
    topCats.length > 0
      ? `
  ${renderSectionHeader("Top Expense Categories MTD", fmtINR(monthExpense))}
  <tr><td style="background:${EMAIL_STYLES.cardBg};">
    ${catRows}
  </td></tr>`
      : ""
  }

  <!-- COMPLETE BUDGET WATCHLIST -->
  ${
    budgetRows
      ? `
  ${renderSectionHeader("Category Budget Adherence", totalBudgetLimit > 0 ? `${totalBudgetSpentPct}% spent` : "")}
  <tr><td style="background:${EMAIL_STYLES.cardBg};">
    ${budgetRows}
  </td></tr>`
      : ""
  }

  <!-- INVESTMENT PORTFOLIO ALLOCATION -->
  ${
    investTotal > 0
      ? `
  ${renderSectionHeader("Investment Portfolio Allocation", fmtINR(investTotal))}
  <tr><td style="background:${EMAIL_STYLES.cardBg};">
    ${investRows}
  </td></tr>`
      : ""
  }

  <!-- PHYSICAL & REAL ASSETS -->
  ${
    otherAssetItems
      ? `
  ${renderSectionHeader("Tangible & Real Assets", fmtINR(totalAssets - investTotal - bankTotal))}
  <tr><td style="background:${EMAIL_STYLES.cardBg};">
    ${otherAssetItems}
  </td></tr>`
      : ""
  }

  <!-- LIABILITIES AUDIT -->
  ${
    liabilityItems
      ? `
  ${renderSectionHeader("Liabilities & Debt Audit", fmtINR(totalLiabilities))}
  <tr><td style="background:${EMAIL_STYLES.cardBg};">
    ${liabilityItems}
  </td></tr>`
      : ""
  }

  <!-- EMERGENCY FUND AUDIT -->
  ${renderSectionHeader("Emergency Liquidity Audit", `${efMonthsCovered} mo runway`)}
  <tr><td style="padding:14px 24px;background:#f8fafc;border-bottom:1px solid ${EMAIL_STYLES.borderColor};">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:12.5px;color:${EMAIL_STYLES.textMuted};font-weight:600;">Liquid Reserves Available (Bank, FDs, Liq MF):</td>
        <td style="font-size:13.5px;font-weight:800;color:${EMAIL_STYLES.textPrimary};text-align:right;">${fmtINR(efLiquidAssets)}</td>
      </tr>
      <tr>
        <td style="font-size:12.5px;color:${EMAIL_STYLES.textMuted};font-weight:600;padding-top:6px;">Monthly Fixed &amp; Living Expense Baseline:</td>
        <td style="font-size:13.5px;font-weight:800;color:${EMAIL_STYLES.negColor};text-align:right;padding-top:6px;">${fmtINR(efMonthlyExpense)}/mo</td>
      </tr>
      <tr>
        <td style="font-size:12.5px;color:${EMAIL_STYLES.textPrimary};font-weight:700;padding-top:6px;">Total Safety Runway:</td>
        <td style="font-size:14px;font-weight:900;color:${efStatus.color};text-align:right;padding-top:6px;">${efMonthsCovered} Months (${efStatus.label})</td>
      </tr>
    </table>
  </td></tr>

  <!-- GOALS PROGRESS TRACKER -->
  ${
    goalRows
      ? `
  ${renderSectionHeader("Financial Goals Progress", `${goals.length} active`)}
  <tr><td style="background:${EMAIL_STYLES.cardBg};">
    ${goalRows}
  </td></tr>`
      : ""
  }

  <!-- 30-DAY FORWARD OUTLOOK -->
  ${
    outlookRows
      ? `
  ${renderSectionHeader("Next 30 Days Forward Outlook", `${outlookItems.length} milestone${outlookItems.length === 1 ? "" : "s"}`)}
  <tr><td style="background:${EMAIL_STYLES.cardBg};">
    ${outlookRows}
  </td></tr>`
      : ""
  }

  <!-- STRATEGIC ALERTS -->
  ${
    alerts.length > 0
      ? `
  ${renderSectionHeader("Strategic Recommendations", `${alerts.length} action${alerts.length === 1 ? "" : "s"}`)}
  <tr><td style="background:${EMAIL_STYLES.cardBg};padding-bottom:14px;">
    ${renderAlertRows(alerts)}
  </td></tr>`
      : ""
  }

  ${renderFooterBlock(recipientName, "Monthly Executive Statement")}`;

  return renderEmailShell(bodyHtml, `ArthaDrishti Monthly Executive Statement · ${monthStr}`);
}

// ── Main Dispatcher for HTML Generation ───────────────────────────────────────
function generateHTML(summary, frequency, recipientName) {
  const normFreq = String(frequency || "daily").trim().toLowerCase();
  const ist = nowIST();
  const name = recipientName || "there";

  if (normFreq === "weekly") {
    return renderWeeklyHTML(summary, name, ist);
  }
  if (normFreq === "monthly") {
    return renderMonthlyHTML(summary, name, ist);
  }
  return renderDailyHTML(summary, name, ist);
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
    licP,
    investP,
    pcs,
    infLns,
    reProps,
    reDemands,
    rePayments,
    vehicles,
    gold,
    settingsGold,
    govtSchemesQ,
    termPlansQ,
    healthInsQ,
    sipsQ,
    recExpensesQ,
    billPaymentsQ,
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
    supabase
      .from("lic_policies")
      .select("*")
      .eq("user_id", userId)
      .then(
        (res) => res,
        () => ({ data: [] })
      ),
    supabase
      .from("investment_plans")
      .select("*")
      .eq("user_id", userId)
      .then(
        (res) => res,
        () => ({ data: [] })
      ),
    supabase
      .from("prepaid_cards")
      .select("*")
      .eq("user_id", userId)
      .then(
        (res) => res,
        () => ({ data: [] })
      ),
    supabase
      .from("informal_loans")
      .select("*")
      .eq("user_id", userId)
      .then(
        (res) => res,
        () => ({ data: [] })
      ),
    supabase
      .from("real_estate_properties")
      .select("*")
      .eq("user_id", userId)
      .then(
        (res) => res,
        () => ({ data: [] })
      ),
    supabase
      .from("real_estate_demands")
      .select("*")
      .eq("user_id", userId)
      .then(
        (res) => res,
        () => ({ data: [] })
      ),
    supabase
      .from("real_estate_payments")
      .select("*")
      .eq("user_id", userId)
      .then(
        (res) => res,
        () => ({ data: [] })
      ),
    supabase
      .from("vehicles")
      .select("*")
      .eq("user_id", userId)
      .then(
        (res) => res,
        () => ({ data: [] })
      ),
    supabase
      .from("gold_holdings")
      .select("*")
      .eq("user_id", userId)
      .then(
        (res) => res,
        () => ({ data: [] })
      ),
    supabase
      .from("user_settings")
      .select("gold_price_per_gram")
      .eq("user_id", userId)
      .maybeSingle()
      .then(
        (res) => res,
        () => ({ data: null })
      ),
    supabase
      .from("govt_schemes")
      .select("*")
      .eq("user_id", userId)
      .then(
        (res) => res,
        () => ({ data: [] })
      ),
    supabase
      .from("term_plans")
      .select("*")
      .eq("user_id", userId)
      .then(
        (res) => res,
        () => ({ data: [] })
      ),
    supabase
      .from("health_insurance")
      .select("*")
      .eq("user_id", userId)
      .then(
        (res) => res,
        () => ({ data: [] })
      ),
    supabase
      .from("sips")
      .select("*")
      .eq("user_id", userId)
      .then(
        (res) => res,
        () => ({ data: [] })
      ),
    supabase
      .from("recurring_expenses")
      .select("*")
      .eq("user_id", userId)
      .then(
        (res) => res,
        () => ({ data: [] })
      ),
    supabase
      .from("bill_payments")
      .select("*")
      .eq("user_id", userId)
      .then(
        (res) => res,
        () => ({ data: [] })
      ),
  ]);

  const camelBanks = snakeToCamel(banks.data || []);
  const camelTxns = snakeToCamel(txns.data || []);
  const camelMfs = snakeToCamel(mfs.data || []).map((m) => ({
    ...m,
    name: m.name || m.scheme || "",
    category: m.category || m.type || "",
  }));
  const camelStocks = snakeToCamel(stks.data || []);
  const camelFds = snakeToCamel(fds.data || []);
  const camelRds = snakeToCamel(rds.data || []);
  const camelBnds = snakeToCamel(bnds.data || []);
  const camelPn = snakeToCamel(pn.data || []);
  const camelCcs = snakeToCamel(ccs.data || []).map((c) => ({
    ...c,
    limit: c.cardLimit ?? c.limit,
  }));
  const camelLns = snakeToCamel(lns.data || []);
  const camelGls = snakeToCamel(gls.data || []);
  const camelBdgts = snakeToCamel(bdgts.data || []).map((b) => ({
    ...b,
    monthly: b.monthlyLimit,
  }));
  const camelSubs = snakeToCamel(subs.data || []);
  const camelRems = snakeToCamel(rems.data || []).map((r) => ({
    ...r,
    date: r.reminderDate,
  }));
  const camelRentalData = snakeToCamel(rentals.data || []);
  const camelIncome = snakeToCamel(incomeQ.data || []);
  const camelLic = snakeToCamel(licP.data || []);
  const camelInvestP = snakeToCamel(investP.data || []);
  const camelPrepaid = snakeToCamel(pcs.data || []);
  const camelInfLns = snakeToCamel(infLns.data || []);
  const camelReProps = snakeToCamel(reProps.data || []);
  const camelReDemands = snakeToCamel(reDemands.data || []);
  const camelRePayments = snakeToCamel(rePayments.data || []);
  const camelVehicles = snakeToCamel(vehicles.data || []);
  const camelGold = snakeToCamel(gold.data || []);
  const camelGovtSchemes = snakeToCamel(govtSchemesQ.data || []);
  const camelTermPlans = snakeToCamel(termPlansQ.data || []);
  const camelHealthIns = snakeToCamel(healthInsQ.data || []);
  const camelSips = snakeToCamel(sipsQ.data || []);
  const camelRecExpenses = snakeToCamel(recExpensesQ.data || []);
  const camelBillPayments = snakeToCamel(billPaymentsQ.data || []);

  const rentalProperties = camelRentalData
    .filter((x) => x.propertyType === "out")
    .map((x) => ({ ...x, propertyType: x.propertyTypeDetail || "shop" }));
  const rentedProperties = camelRentalData
    .filter((x) => x.propertyType === "in")
    .map((x) => ({ ...x, propertyType: x.propertyTypeDetail || "shop" }));

  return {
    bankAccounts: camelBanks,
    transactions: camelTxns,
    mutualFunds: camelMfs,
    stocks: camelStocks,
    fixedDeposits: camelFds,
    recurringDeposits: camelRds,
    bonds: camelBnds,
    ppf: camelPn.filter((x) => x.type === "PPF"),
    nps: camelPn.filter((x) => x.type === "NPS"),
    epf: camelPn.filter((x) => x.type === "EPF"),
    lic: camelLic,
    termPlans: camelTermPlans,
    healthInsurance: camelHealthIns,
    investmentPlans: camelInvestP,
    prepaidCards: camelPrepaid,
    creditCards: camelCcs,
    loansTaken: camelLns.filter((x) => !x.isLent),
    loansGiven: camelLns.filter((x) => x.isLent),
    informalBorrowed: camelInfLns.filter((x) => x.direction === "borrowed"),
    informalLent: camelInfLns.filter((x) => x.direction === "lent"),
    goals: camelGls,
    budgets: camelBdgts,
    subscriptions: camelSubs,
    reminders: camelRems,
    income: camelIncome,
    rentalProperties,
    rentedProperties,
    realEstateProperties: camelReProps,
    realEstateDemands: camelReDemands,
    realEstatePayments: camelRePayments,
    vehicles: camelVehicles,
    goldHoldings: camelGold,
    goldPricePerGram: settingsGold.data?.gold_price_per_gram || 7200,
    govtSchemes: camelGovtSchemes,
    sips: camelSips,
    recurringExpenses: camelRecExpenses,
    billPayments: camelBillPayments,
  };
}

// ── Live stock prices ─────────────────────────────────────────────────────────
async function withLiveStockPrices(state) {
  const stocks = state.stocks || [];
  if (stocks.length === 0) return state;

  const yfSymFor = (s) =>
    `${String(s.symbol || "").replace(/\.(NS|BO)$/i, "")}.${(s.exchange || "NSE") === "BSE" ? "BO" : "NS"}`;

  const uniqueSymbols = [...new Set(stocks.map(yfSymFor).filter((sym) => sym !== "."))];
  const priceMap = {};

  await Promise.allSettled(
    uniqueSymbols.map(async (sym) => {
      try {
        const quote = await yf.quote(sym, {}, { validateResult: false, ...yfFetchOptions() });
        const price = quote?.regularMarketPrice ?? quote?.postMarketPrice ?? quote?.preMarketPrice;
        if (price != null && !isNaN(price)) priceMap[sym] = price;
      } catch (err) {
        console.error(`[send-summary] Failed to fetch live price for ${sym}:`, err.message);
      }
    })
  );

  return {
    ...state,
    stocks: stocks.map((s) => {
      const live = priceMap[yfSymFor(s)];
      return live != null ? { ...s, currentPrice: live } : s;
    }),
  };
}

// ── Live mutual fund NAVs ──────────────────────────────────────────────────────
const MFAPI_TIMEOUT_MS = 8000;
async function withLiveMFPrices(state) {
  const funds = state.mutualFunds || [];
  if (funds.length === 0) return state;

  const uniqueCodes = [
    ...new Set(
      funds
        .map((m) => String(m.mfCode || "").trim())
        .filter((code) => /^\d+$/.test(code))
    ),
  ];
  if (uniqueCodes.length === 0) return state;

  const navMap = {};
  await Promise.allSettled(
    uniqueCodes.map(async (code) => {
      try {
        const res = await fetch(`https://api.mfapi.in/mf/${code}`, {
          signal: AbortSignal.timeout(MFAPI_TIMEOUT_MS),
        });
        if (!res.ok) return;
        const data = await res.json();
        const latestNav = parseFloat(data?.data?.[0]?.nav);
        if (!isNaN(latestNav)) navMap[code] = latestNav;
      } catch (err) {
        console.error(`[send-summary] Failed to fetch live NAV for ${code}:`, err.message);
      }
    })
  );

  return {
    ...state,
    mutualFunds: funds.map((m) => {
      const live = navMap[String(m.mfCode || "").trim()];
      return live != null ? { ...m, currentNav: live } : m;
    }),
  };
}

// ── Check if current IST day matches user's schedule ─────────────────────────
function getMatchingFrequencies(settings, frequency) {
  const freqStr = frequency || settings?.emailFrequency || settings?.email_frequency || "weekly";
  const freqs = String(freqStr)
    .split(",")
    .map((f) => f.trim().toLowerCase())
    .filter(Boolean);

  const matched = [];
  const currentIstDay = istDayOfWeek();
  const currentIstDate = istDate();
  const daysInMonth = istDaysInCurrentMonth();
  const configDay = Number(settings?.emailDay ?? settings?.email_day ?? 1);

  for (const freq of freqs) {
    if (freq === "daily") {
      matched.push("daily");
    } else if (freq === "weekly") {
      if (currentIstDay === configDay) matched.push("weekly");
    } else if (freq === "monthly") {
      const effectiveDate = Math.min(configDay, daysInMonth);
      if (currentIstDate === effectiveDate) matched.push("monthly");
    }
  }
  return matched;
}

function shouldSendNow(settings, frequency) {
  return getMatchingFrequencies(settings, frequency).length > 0;
}

// ── Subject line ──────────────────────────────────────────────────────────────
function buildSubject(frequency, netWorth) {
  const ist = nowIST();
  const period =
    frequency === "daily"
      ? ist.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })
      : frequency === "weekly"
        ? `Week of ${weekRange()}`
        : monthLabel();
  const title =
    frequency === "daily"
      ? "Daily Digest"
      : frequency === "weekly"
        ? "Weekly Briefing"
        : "Monthly Executive Statement";
  return `Your ${title} — ${period} | Net Worth ${fmtINR(netWorth)}`;
}

// ── Main handler ──────────────────────────────────────────────────────────────
async function handler(req, res) {
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

  // ── Preview — renders the email HTML without sending ───────────────────────
  if (req.method === "GET" && req.query?.action === "preview") {
    const auth = await verifyManualAuth(req);
    if (!auth.ok) {
      console.error(`[send-summary] Preview rejected: ${auth.reason}`);
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      const supabase = getSupabase();
      const state = await fetchStateFromSupabase(supabase, auth.user.id);
      const { data: profData } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      const recipientName = profData?.name || "there";
      const rawFreq = req.query?.frequency;
      const freq = ["daily", "weekly", "monthly"].includes(rawFreq)
        ? rawFreq
        : String(rawFreq || "").split(",")[0] || "daily";
      const summary = computeSummary(await withLiveMFPrices(await withLiveStockPrices(state)));
      const html = generateHTML(summary, freq, recipientName);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(200).send(html);
    } catch (err) {
      console.error("[send-summary] Preview error:", err);
      return res.status(500).json({ error: err.message });
    }
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
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      console.error(
        cronSecret
          ? "[send-summary] Cron auth failed — Authorization header mismatch"
          : "[send-summary] Cron auth failed — CRON_SECRET not configured in Vercel env vars"
      );
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  try {
    if (isManual) {
      // ── Manual "Send Test" from Settings UI ─────────────────────────────
      const auth = await verifyManualAuth(req);
      if (!auth.ok) {
        console.error(`[send-summary] Manual send rejected: ${auth.reason}`);
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { emailTo: requestedEmailTo, frequency, recipientName: requestedRecipientName, fromEmail } =
        req.body || {};
      if (!RESEND_KEY)
        return res.status(500).json({
          error:
            "Resend API key not configured. Add Resend_Email_API to Vercel environment variables.",
        });

      const supabase = getSupabase();
      const { data: settingsRow } = await supabase
        .from("user_settings")
        .select("email_address")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      const emailTo = (settingsRow?.email_address || "").trim() || auth.user.email;
      if (!emailTo) {
        return res.status(400).json({
          error: "No email address on file. Set one in Settings before sending a test email.",
        });
      }
      if (requestedEmailTo && requestedEmailTo !== emailTo) {
        console.warn(
          `[send-summary] Manual send: ignoring client-supplied emailTo (${requestedEmailTo}); using account email instead`
        );
      }

      const effectiveFromEmail = getEffectiveFromEmail(fromEmail);
      const effectiveFromAddr = `ArthaDrishti <${effectiveFromEmail}>`;

      const state = await fetchStateFromSupabase(supabase, auth.user.id);
      const { data: profData } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      const recipientName = profData?.name || requestedRecipientName || "there";

      const summary = computeSummary(await withLiveMFPrices(await withLiveStockPrices(state)));
      const freq = frequency || "daily";
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
        await recordSendResult(supabase, auth.user.id, "failed", error.message);
        const isTest = effectiveFromEmail === "onboarding@resend.dev";
        return res.status(500).json({
          error: error.message,
          hint: isTest
            ? `Test sender restriction: onboarding@resend.dev can only deliver to the email you registered with Resend (not ${emailTo}). Enter your Resend account email in the 'Sender Email' field in Settings.`
            : `Send failed from ${effectiveFromEmail}. Make sure this email or its domain is verified in your Resend account.`,
        });
      }
      await recordSendResult(supabase, auth.user.id, "sent", null);
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
        const matchingFreqs = getMatchingFrequencies(row);
        if (matchingFreqs.length === 0) continue;

        for (const freq of matchingFreqs) {
          try {
            const state = await fetchStateFromSupabase(supabase, row.user_id);

            const { data: profData } = await supabase
              .from("profiles")
              .select("name")
              .eq("user_id", row.user_id)
              .maybeSingle();
            const recipientName = profData?.name || row.email_address?.split("@")[0] || "there";

            const summary = computeSummary(await withLiveMFPrices(await withLiveStockPrices(state)));
            const html = generateHTML(summary, freq, recipientName);
            const subject = buildSubject(freq, summary.netWorth);

            const cronFromEmail = getEffectiveFromEmail(row.from_email);
            const { error } = await resend.emails.send({
              from: `ArthaDrishti <${cronFromEmail}>`,
              to: row.email_address,
              subject,
              html,
            });

            if (error)
              console.error(`[send-summary] Failed for user ${row.user_id} (${freq}):`, error.message);
            await recordSendResult(supabase, row.user_id, error ? "failed" : "sent", error?.message);
            results.push({
              userId: row.user_id,
              email: row.email_address,
              frequency: freq,
              sent: !error,
              error: error?.message,
            });
          } catch (userErr) {
            console.error(`[send-summary] Error processing user ${row.user_id} (${freq}):`, userErr.message);
            await recordSendResult(supabase, row.user_id, "failed", userErr.message);
            results.push({ userId: row.user_id, frequency: freq, sent: false, error: userErr.message });
          }
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
}

// Attach helpers to module.exports for testability
module.exports = handler;
handler.computeSummary = computeSummary;
handler.generateHTML = generateHTML;
handler.getEffectiveRent = getEffectiveRent;
handler.getMatchingFrequencies = getMatchingFrequencies;
handler.shouldSendNow = shouldSendNow;
handler.annualizePremium = annualizePremium;
handler.nextAnnualOccurrence = nextAnnualOccurrence;
handler.fmtINR = fmtINR;
handler.fmtINRFull = fmtINRFull;
handler.escapeHtml = escapeHtml;
handler.largestRemainderRound = largestRemainderRound;
