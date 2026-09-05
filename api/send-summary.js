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

  // ── Yesterday's spending pulse ─────────────────────────────────────────────
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
  const yesterdaySpend = yesterdayDebits.reduce((s, t) => s + Math.abs(Number(t.amount) || 0), 0);
  const yesterdayCount = yesterdayDebits.length;

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
    .slice(0, 4)
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

  const todayVal = nowIST();
  const todayMs = Date.UTC(
    todayVal.getUTCFullYear(),
    todayVal.getUTCMonth(),
    todayVal.getUTCDate()
  );
  const in7Ms = todayMs + 7 * 86400000;

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

  // ── Upcoming dues (next 7 days) — Enriched ─────────────────────────────────
  const dues = [];

  // 1. Subscriptions
  (state.subscriptions || [])
    .filter((s) => !s.paused && s.status !== "cancelled")
    .forEach((s) => {
      const next = new Date(s.renewalDate || s.nextDue || s.startDate || todayVal.toISOString());
      next.setUTCHours(0, 0, 0, 0);
      const nextMs = next.getTime();
      if (nextMs >= todayMs && nextMs <= in7Ms) {
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
      if (d.getTime() >= todayMs && d.getTime() <= in7Ms)
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
    if (d.getTime() >= todayMs && d.getTime() <= in7Ms) {
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
    if (candidate.getTime() >= todayMs && candidate.getTime() <= in7Ms) {
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
    if (d.getTime() >= todayMs && d.getTime() <= in7Ms) {
      dues.push({
        date: d,
        label: `${l.lender || l.lenderBorrower || "Loan"} EMI`,
        amount: Number(l.emi) || 0,
        type: "emi",
        category: "Loan EMI",
      });
    }
  });

  // 6. SIP instalments (Enriched)
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
      if (d.getTime() >= todayMs && d.getTime() <= in7Ms) {
        dues.push({
          date: d,
          label: `${s.scheme || s.fundName || "Mutual Fund"} SIP`,
          amount: amt,
          type: "sip",
          category: "SIP Investment",
        });
      }
    });

  // 7. Insurance premium renewals (LIC, Term, Investment, Health) (Enriched)
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
      if (d.getTime() >= todayMs && d.getTime() <= in7Ms) {
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

  // 8. Real Estate builder demand letters (Enriched)
  (state.realEstateDemands || []).forEach((d) => {
    if (d.status === "paid" || !d.dueDate) return;
    const dueDate = new Date(d.dueDate + "T00:00:00");
    if (dueDate.getTime() >= todayMs && dueDate.getTime() <= in7Ms) {
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

  // 9. Recurring expenses & Bill payments (Enriched)
  (state.recurringExpenses || []).forEach((r) => {
    if (!r.amount || !r.dueDay) return;
    const d = new Date(Date.UTC(todayVal.getUTCFullYear(), todayVal.getUTCMonth(), Number(r.dueDay)));
    if (d.getTime() < todayMs) d.setUTCMonth(d.getUTCMonth() + 1);
    if (d.getTime() >= todayMs && d.getTime() <= in7Ms) {
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
      if (d.getTime() >= todayMs && d.getTime() <= in7Ms) {
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

  // ── Expected Inflows (next 7 days) ─────────────────────────────────────────
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
      if (!received && d.getTime() >= todayMs && d.getTime() <= in7Ms) {
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
    if (d.getTime() >= todayMs && d.getTime() <= in7Ms) {
      inflows.push({
        date: d,
        label: `${l.borrower || "Borrower"} Repayment`,
        amount: Number(l.outstanding || 0),
        type: "loan_in",
      });
    }
  });

  const totalDues7Days = dues.reduce((s, d) => s + (Number(d.amount) || 0), 0);
  const totalInflows7Days = inflows.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const liquidityBuffer = bankTotal - totalDues7Days;

  // ── Goals ─────────────────────────────────────────────────────────────────
  const goals = (state.goals || []).slice(0, 4).map((g) => {
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
  const todayStr = today();
  (state.fixedDeposits || []).forEach((fd) => {
    if (fd.maturityDate) {
      const daysToMaturity = Math.round(
        (new Date(fd.maturityDate).getTime() - new Date(todayStr).getTime()) / 86400000
      );
      if (daysToMaturity >= 0 && daysToMaturity <= 30) {
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
    yesterdayCount,
    dayOfMonth,
    totalDaysInMonth,
    monthElapsedPct,
    totalBudgetLimit,
    totalBudgetSpent,
    totalBudgetSpentPct,
    efLiquidAssets,
    efMonthlyExpense,
    efMonthsCovered,
    efStatus,
    topCats,
    budgetStatus,
    dues,
    inflows,
    totalDues7Days,
    totalInflows7Days,
    liquidityBuffer,
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
    totalAssets,
    totalLiabilities,
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
    activeCardCount,
    activeCards,
    monthExpense,
    monthIncome,
    netSavings,
    savingsPct,
    yesterdaySpend,
    yesterdayCount,
    dayOfMonth,
    totalDaysInMonth,
    monthElapsedPct,
    totalBudgetLimit,
    totalBudgetSpent,
    totalBudgetSpentPct,
    efLiquidAssets,
    efMonthsCovered,
    efStatus,
    topCats,
    dues,
    inflows,
    totalDues7Days,
    totalInflows7Days,
    liquidityBuffer,
    goals,
    alerts,
    budgetStatus,
  } = summary;

  const ist = nowIST();
  const dateStr = ist.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const periodLabel =
    frequency === "weekly"
      ? `Weekly Briefing · ${weekRange()}`
      : frequency === "monthly"
        ? `Monthly Statement · ${monthLabel()}`
        : `Morning Briefing · ${dateStr}`;

  const posColor = "#059669";
  const posBg = "#ecfdf5";
  const negColor = "#dc2626";
  const negBg = "#fef2f2";
  const warnColor = "#d97706";
  const warnBg = "#fffbeb";
  const accentColor = "#4f46e5";
  const accentLight = "#e0e7ff";
  const navyBg = "#0a0f1d";
  const cardBg = "#ffffff";
  const bodyBg = "#f8fafc";
  const textPrimary = "#0f172a";
  const textMuted = "#64748b";
  const borderColor = "#e2e8f0";

  const pct = (val, total) => (total > 0 ? Math.min(Math.round((val / total) * 100), 100) : 0);

  function progressBar(pctVal, color = accentColor, height = 7) {
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

  function sectionHeader(title, emoji, badge = "") {
    return `
      <tr><td style="padding:28px 24px 12px;">
        <table cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="font-size:18px;vertical-align:middle;width:26px;">${emoji}</td>
            <td style="font-size:13px;font-weight:800;color:${textPrimary};text-transform:uppercase;letter-spacing:0.08em;vertical-align:middle;">
              ${escapeHtml(title)}
            </td>
            ${
              badge
                ? `<td style="text-align:right;vertical-align:middle;">
                    <span style="display:inline-block;background:${accentLight};color:${accentColor};font-size:11px;font-weight:700;padding:3px 8px;border-radius:6px;text-transform:uppercase;letter-spacing:0.04em;">
                      ${escapeHtml(badge)}
                    </span>
                  </td>`
                : ""
            }
          </tr>
        </table>
        <div style="height:2px;background:${borderColor};margin-top:10px;border-radius:1px;"></div>
      </td></tr>`;
  }

  // ── Due item icons & urgency badges ───────────────────────────────────────
  const todayMs = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate());
  const dueRows = dues
    .slice(0, 7)
    .map((d, i) => {
      const icon =
        d.type === "cc"
          ? "💳"
          : d.type === "emi"
            ? "🏦"
            : d.type === "sip"
              ? "📈"
              : d.type === "rent"
                ? "🏠"
                : d.type === "insurance"
                  ? "🛡️"
                  : d.type === "demand"
                    ? "🏗️"
                    : d.type === "sub"
                      ? "📱"
                      : "📌";
      const dueTime = d.date.getTime();
      const daysUntil = Math.ceil((dueTime - todayMs) / 86400000);
      const isPast = daysUntil < 0;
      const isToday = daysUntil === 0;
      const isUrgent = daysUntil > 0 && daysUntil <= 2;

      const badgeText = isPast
        ? "Overdue"
        : isToday
          ? "Due Today"
          : daysUntil === 1
            ? "Due Tomorrow"
            : `In ${daysUntil} days`;
      const badgeBg = isPast || isToday ? negBg : isUrgent ? warnBg : "#f1f5f9";
      const badgeColor = isPast || isToday ? negColor : isUrgent ? warnColor : textMuted;

      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `
      <tr>
        <td style="padding:12px 24px;background:${bg};border-bottom:1px solid ${borderColor};">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:14px;color:${textPrimary};font-weight:600;">
                <span style="margin-right:6px;">${icon}</span>${escapeHtml(d.label)}
                <div style="font-size:11px;color:${textMuted};font-weight:500;margin-top:2px;">
                  ${d.date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                </div>
              </td>
              <td style="text-align:right;vertical-align:middle;">
                <div style="font-size:15px;font-weight:800;color:${isToday || isPast ? negColor : textPrimary};">
                  ${d.amount > 0 ? fmtINRFull(d.amount) : "—"}
                </div>
                <div style="display:inline-block;background:${badgeBg};color:${badgeColor};font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;margin-top:2px;">
                  ${badgeText}
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
    })
    .join("");

  // Inflow items (Rent expected, loan repayments)
  const inflowRows = inflows
    .slice(0, 3)
    .map((inf) => {
      return `
      <tr>
        <td style="padding:10px 24px;background:#f0fdf4;border-bottom:1px solid #bbf7d0;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:13px;color:#166534;font-weight:600;">
                <span style="margin-right:6px;">💰</span>${escapeHtml(inf.label)}
                <span style="font-size:11px;color:#15803d;font-weight:500;"> · Expected ${inf.date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              </td>
              <td style="font-size:14px;font-weight:800;color:${posColor};text-align:right;">
                +${fmtINRFull(inf.amount)}
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
    })
    .join("");

  // ── Top spending rows ─────────────────────────────────────────────────────
  const maxCatAmt = topCats[0]?.amt || 1;
  const catRows = topCats
    .map(({ cat, amt }, i) => {
      const p = pct(amt, monthExpense);
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `
      <tr><td style="padding:12px 24px;background:${bg};border-bottom:1px solid ${borderColor};">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;color:${textPrimary};font-weight:600;">${escapeHtml(cat)}</td>
            <td style="font-size:14px;font-weight:800;color:${textPrimary};text-align:right;">
              ${fmtINRFull(amt)} <span style="color:${textMuted};font-weight:500;font-size:11px;">(${p}%)</span>
            </td>
          </tr>
        </table>
        ${progressBar(pct(amt, maxCatAmt), accentColor, 5)}
      </td></tr>`;
    })
    .join("");

  // ── Alert rows ────────────────────────────────────────────────────
  const alertRows = alerts
    .map((a) => {
      const icon = a.type === "alert" ? "🚨" : a.type === "warn" ? "⚠️" : "💡";
      const bg = a.type === "alert" ? negBg : a.type === "warn" ? warnBg : posBg;
      const border = a.type === "alert" ? negColor : a.type === "warn" ? warnColor : posColor;
      return `
      <tr><td style="padding:6px 24px;">
        <div style="background:${bg};border-left:4px solid ${border};border-radius:0 8px 8px 0;padding:12px 14px;font-size:13px;color:${textPrimary};font-weight:500;line-height:1.5;">
          ${icon} ${escapeHtml(a.msg)}
        </div>
      </td></tr>`;
    })
    .join("");

  // ── Credit cards quick list ───────────────────────────────────────────────
  const ccRows = activeCards
    .slice(0, 4)
    .map((c, i) => {
      const out = Number(c.outstanding) || 0;
      const lim = Number(c.limit || c.cardLimit) || 0;
      const u = lim > 0 ? Math.round((out / lim) * 100) : 0;
      const uColor = u >= 70 ? negColor : u >= 40 ? warnColor : posColor;
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `
      <tr><td style="padding:10px 24px;background:${bg};border-bottom:1px solid ${borderColor};">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;font-weight:700;color:${textPrimary};">
              ${escapeHtml(c.issuer)} <span style="color:${textMuted};font-weight:400;font-size:11px;">··${escapeHtml(c.last4) || "**"}</span>
            </td>
            <td style="text-align:right;">
              <span style="font-size:14px;font-weight:800;color:${textPrimary};">${fmtINR(out)}</span>
              <span style="font-size:11px;color:${uColor};font-weight:700;margin-left:6px;">${u}% used</span>
            </td>
          </tr>
        </table>
      </td></tr>`;
    })
    .join("");

  // ── Investment portfolio rows ─────────────────────────────────────────────
  let rowIdx = 0;
  function listRow(label, value, icon) {
    const bg = rowIdx++ % 2 === 0 ? "#ffffff" : "#f8fafc";
    return `
    <tr><td style="padding:11px 24px;background:${bg};border-bottom:1px solid ${borderColor};">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:13px;color:${textPrimary};font-weight:600;">${icon ? icon + " " : ""}${escapeHtml(label)}</td>
        <td style="font-size:14px;font-weight:800;color:${textPrimary};text-align:right;">${value}</td>
      </tr></table>
    </td></tr>`;
  }

  rowIdx = 0;
  const investCategories = [
    { label: "Mutual Funds", amt: mfTotal },
    { label: "Stocks", amt: stockTotal },
    { label: "Fixed Deposits", amt: fdTotal },
    { label: "Recurring Deposits", amt: rdTotal },
    { label: "PPF", amt: ppfTotal },
    { label: "NPS", amt: npsTotal },
    { label: "EPF", amt: epfTotal },
    { label: "Bonds & Debentures", amt: bondsTotal },
    { label: "LIC / Insurance", amt: licTotal },
    { label: "Investment Plans", amt: investmentTotalPlans },
  ].filter((c) => c.amt > 0);
  const investPcts = largestRemainderRound(investCategories.map((c) => c.amt), investTotal);
  const investRows = investCategories
    .map(
      (c, i) =>
        listRow(
          c.label,
          `${fmtINR(c.amt)} <span style="color:${textMuted};font-weight:500;font-size:12px;">(${investPcts[i]}%)</span>`
        )
    )
    .join("");

  // ── Other assets rows ─────────────────────────────────────────────────────
  rowIdx = 0;
  const otherAssetItems = [
    goldTotal > 0 && listRow("Gold & SGBs", fmtINR(goldTotal), "🥇"),
    realEstateAsset > 0 && listRow("Real Estate", fmtINR(realEstateAsset), "🏠"),
    vehicleAsset > 0 && listRow("Vehicles", fmtINR(vehicleAsset), "🚗"),
    rentalPropertiesAsset > 0 && listRow("Rental Properties", fmtINR(rentalPropertiesAsset), "🏢"),
    loansGivenTotal > 0 && listRow("Loans Given", fmtINR(loansGivenTotal), "🤝"),
    informalLentTotal > 0 && listRow("Informal Lending", fmtINR(informalLentTotal), "💰"),
    prepaidTotal > 0 && listRow("Prepaid Cards", fmtINR(prepaidTotal), "💳"),
    rentedDepositAsset > 0 && listRow("Security Deposits", fmtINR(rentedDepositAsset), "🔑"),
    govtSchemesTotal > 0 && listRow("Govt Schemes", fmtINR(govtSchemesTotal), "🏛️"),
  ]
    .filter(Boolean)
    .join("");

  // ── Liabilities rows ──────────────────────────────────────────────────────
  rowIdx = 0;
  const liabilityItems = [
    loanOutstanding > 0 && listRow("Loans Outstanding", fmtINR(loanOutstanding), "🏦"),
    creditOutstanding > 0 && listRow("Credit Card Dues", fmtINR(creditOutstanding), "💳"),
    informalBorrowedTotal > 0 &&
      listRow("Informal Borrowings", fmtINR(informalBorrowedTotal), "🤝"),
    rentalDepositLiability > 0 &&
      listRow("Tenant Deposits Owed", fmtINR(rentalDepositLiability), "🔑"),
    realEstateOutstanding > 0 && listRow("Real Estate Dues", fmtINR(realEstateOutstanding), "🏗️"),
  ]
    .filter(Boolean)
    .join("");

  // ── Budget health rows ────────────────────────────────────────────────────
  const budgetRows = budgetStatus
    .slice(0, 5)
    .map((b, i) => {
      const barColor = b.over ? negColor : b.pct >= 85 ? warnColor : posColor;
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `
    <tr><td style="padding:12px 24px;background:${bg};border-bottom:1px solid ${borderColor};">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;font-weight:700;color:${textPrimary};">${escapeHtml(b.category)}</td>
          <td style="font-size:13px;font-weight:800;color:${barColor};text-align:right;">
            ${fmtINR(b.spent)} / ${fmtINR(b.limit)} (${b.pct}%)
          </td>
        </tr>
      </table>
      ${progressBar(b.pct, barColor, 6)}
    </td></tr>`;
    })
    .join("");

  // ── Goals rows ────────────────────────────────────────────────────────────
  const goalRows = goals
    .map((g, i) => {
      const barColor = g.pct >= 80 ? posColor : g.pct >= 50 ? accentColor : warnColor;
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `
      <tr><td style="padding:12px 24px;background:${bg};border-bottom:1px solid ${borderColor};">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:13px;font-weight:700;color:${textPrimary};">${escapeHtml(g.name)}</td>
            <td style="font-size:14px;font-weight:900;color:${barColor};text-align:right;">${g.pct}%</td>
          </tr>
        </table>
        ${progressBar(g.pct, barColor, 6)}
        <div style="font-size:11px;color:${textMuted};margin-top:4px;font-weight:500;">
          ${fmtINR(g.current)} of ${fmtINR(g.target)}
        </div>
      </td></tr>`;
    })
    .join("");

  const bufferColor = liquidityBuffer >= 0 ? posColor : negColor;
  const bufferBg = liquidityBuffer >= 0 ? posBg : negBg;
  const savRateColor = savingsPct >= 30 ? posColor : savingsPct >= 15 ? warnColor : negColor;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<title>ArthaDrishti Financial Summary</title>
<style>
  body { margin:0; padding:0; background-color:${bodyBg}; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; }
  table { border-collapse:collapse; }
  @media only screen and (max-width:540px) {
    .main-wrap { width:100% !important; border-radius:0 !important; }
    .kpi-col { display:block !important; width:100% !important; margin-bottom:10px !important; }
    .kpi-space { display:none !important; }
    .sec-pad { padding-left:16px !important; padding-right:16px !important; }
    .hero-nw { font-size:36px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${bodyBg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<table width="100%" cellpadding="0" cellspacing="0" style="background-color:${bodyBg};padding:20px 12px;">
<tr><td align="center">

<table class="main-wrap" width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);border:1px solid ${borderColor};">

  <!-- TOP BRAND HEADER -->
  <tr><td style="background:${navyBg};padding:24px 24px 20px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="vertical-align:middle;">
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align:middle;padding-right:10px;">
                <img src="https://personal-finance-by-anand-mohta.vercel.app/favicon-192x192.png" width="30" height="30" alt="AD" style="display:block;border-radius:8px;">
              </td>
              <td style="vertical-align:middle;">
                <div style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.02em;">ArthaDrishti</div>
                <div style="font-size:12px;color:#94a3b8;font-weight:500;margin-top:2px;">${periodLabel}</div>
              </td>
            </tr>
          </table>
        </td>
        <td style="text-align:right;vertical-align:middle;">
          <div style="display:inline-block;background:linear-gradient(135deg, #312e81, #1e1b4b);border:1px solid #4338ca;border-radius:20px;padding:6px 14px;">
            <span style="font-size:11px;font-weight:800;color:#c7d2fe;text-transform:uppercase;letter-spacing:0.06em;">
              ${frequency === "daily" ? "Daily Digest" : frequency === "weekly" ? "Weekly Digest" : "Monthly Digest"}
            </span>
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- NET WORTH HERO SECTION -->
  <tr><td style="background:linear-gradient(180deg, #0a0f1d 0%, #161e38 100%);padding:28px 24px 32px;color:#ffffff;">
    <div style="font-size:12px;font-weight:700;color:#a5b4fc;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">
      Total Household Net Worth
    </div>
    <div class="hero-nw" style="font-size:44px;font-weight:900;color:#ffffff;letter-spacing:-0.03em;line-height:1.05;">
      ${fmtINRFull(netWorth)}
    </div>

    <!-- Assets vs Liabilities Pill Bar -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:18px;">
      <tr>
        <td style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:10px;padding:10px 14px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td>
                <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;letter-spacing:0.06em;">Assets: </span>
                <span style="font-size:15px;color:#34d399;font-weight:800;">${fmtINR(totalAssets)}</span>
              </td>
              <td style="text-align:center;color:#64748b;font-size:14px;">·</td>
              <td style="text-align:right;">
                <span style="font-size:11px;color:#94a3b8;text-transform:uppercase;font-weight:700;letter-spacing:0.06em;">Liabilities: </span>
                <span style="font-size:15px;color:#fca5a5;font-weight:800;">${fmtINR(totalLiabilities)}</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- 4-CARD EXECUTIVE KPI GRID -->
  <tr><td style="padding:16px 24px 6px;background:${cardBg};">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <!-- Bank Cash -->
        <td class="kpi-col" width="48%" style="padding:14px 16px;background:${bodyBg};border:1px solid ${borderColor};border-radius:10px;vertical-align:top;">
          <div style="font-size:11px;color:${textMuted};text-transform:uppercase;font-weight:700;letter-spacing:0.06em;">Bank Cash</div>
          <div style="font-size:22px;font-weight:900;color:${textPrimary};margin-top:4px;">${fmtINR(bankTotal)}</div>
          <div style="font-size:11px;color:${textMuted};margin-top:2px;">Instant liquid cash</div>
        </td>
        <td class="kpi-space" width="4%"></td>
        <!-- Investments -->
        <td class="kpi-col" width="48%" style="padding:14px 16px;background:${bodyBg};border:1px solid ${borderColor};border-radius:10px;vertical-align:top;">
          <div style="font-size:11px;color:${textMuted};text-transform:uppercase;font-weight:700;letter-spacing:0.06em;">Investments</div>
          <div style="font-size:22px;font-weight:900;color:${accentColor};margin-top:4px;">${fmtINR(investTotal)}</div>
          <div style="font-size:11px;color:${textMuted};margin-top:2px;">MFs, Stocks, FDs, PF</div>
        </td>
      </tr>
      <tr><td colspan="3" style="height:10px;"></td></tr>
      <tr>
        <!-- Emergency Runway -->
        <td class="kpi-col" width="48%" style="padding:14px 16px;background:${bodyBg};border:1px solid ${borderColor};border-radius:10px;vertical-align:top;">
          <div style="font-size:11px;color:${textMuted};text-transform:uppercase;font-weight:700;letter-spacing:0.06em;">Emergency Runway</div>
          <div style="font-size:22px;font-weight:900;color:${efStatus.color};margin-top:4px;">${efMonthsCovered} mo</div>
          <div style="display:inline-block;background:${efStatus.color === posColor ? posBg : efStatus.color === warnColor ? warnBg : negBg};color:${efStatus.color};font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;margin-top:3px;">
            ${efStatus.label} · 6mo target
          </div>
        </td>
        <td class="kpi-space" width="4%"></td>
        <!-- 7-Day Liquidity Buffer -->
        <td class="kpi-col" width="48%" style="padding:14px 16px;background:${bodyBg};border:1px solid ${borderColor};border-radius:10px;vertical-align:top;">
          <div style="font-size:11px;color:${textMuted};text-transform:uppercase;font-weight:700;letter-spacing:0.06em;">7-Day Cash Buffer</div>
          <div style="font-size:22px;font-weight:900;color:${bufferColor};margin-top:4px;">${liquidityBuffer >= 0 ? "+" : "-"}${fmtINR(Math.abs(liquidityBuffer))}</div>
          <div style="display:inline-block;background:${bufferBg};color:${bufferColor};font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;margin-top:3px;">
            ${liquidityBuffer >= 0 ? "Safe after 7d dues" : "Attention needed"}
          </div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- YESTERDAY'S PULSE (If daily and transactions exist) -->
  ${
    frequency === "daily" && yesterdaySpend > 0
      ? `
  <tr><td style="padding:12px 24px 0;">
    <div style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:10px 14px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;font-weight:700;color:${textPrimary};">
            📅 Yesterday's Spending Activity
          </td>
          <td style="font-size:14px;font-weight:900;color:${textPrimary};text-align:right;">
            ${fmtINRFull(yesterdaySpend)} <span style="font-size:11px;color:${textMuted};font-weight:500;">(${yesterdayCount} debit${yesterdayCount === 1 ? "" : "s"})</span>
          </td>
        </tr>
      </table>
    </div>
  </td></tr>`
      : ""
  }

  <!-- UPCOMING DUES (NEXT 7 DAYS) -->
  ${
    dues.length > 0 || inflows.length > 0
      ? `
  ${sectionHeader("Upcoming Dues & Obligations — Next 7 Days", "📅", `${dues.length} upcoming`)}
  ${inflowRows}
  <tr><td style="background:${cardBg};">
    ${dueRows}
  </td></tr>
  <tr><td style="padding:12px 24px;background:#f8fafc;border-bottom:1px solid ${borderColor};">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:12px;font-weight:700;color:${textMuted};text-transform:uppercase;">Total 7-Day Outflow</td>
        <td style="font-size:16px;font-weight:900;color:${textPrimary};text-align:right;">${fmtINRFull(totalDues7Days)}</td>
      </tr>
      <tr>
        <td style="font-size:11px;color:${textMuted};padding-top:4px;">Bank Balance Coverage:</td>
        <td style="font-size:12px;font-weight:700;color:${bufferColor};text-align:right;padding-top:4px;">
          ${bankTotal >= totalDues7Days ? `Comfortably covered (+${fmtINR(liquidityBuffer)} buffer)` : `Deficit: ${fmtINR(Math.abs(liquidityBuffer))}`}
        </td>
      </tr>
    </table>
  </td></tr>`
      : ""
  }

  <!-- MONTH-TO-DATE (MTD) CASH FLOW & BUDGET PACING -->
  ${sectionHeader(`Month-to-Date Cash Flow · Day ${dayOfMonth} of ${totalDaysInMonth}`, "💸", `${monthElapsedPct}% elapsed`)}
  <tr><td style="padding:4px 24px 16px;background:${cardBg};">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:${bodyBg};border:1px solid ${borderColor};border-radius:10px;padding:14px 16px;">
      <tr>
        <td width="33%" style="text-align:center;border-right:1px solid ${borderColor};">
          <div style="font-size:11px;color:${textMuted};text-transform:uppercase;font-weight:700;">Income MTD</div>
          <div style="font-size:18px;font-weight:900;color:${posColor};margin-top:4px;">${fmtINRFull(monthIncome)}</div>
        </td>
        <td width="33%" style="text-align:center;border-right:1px solid ${borderColor};">
          <div style="font-size:11px;color:${textMuted};text-transform:uppercase;font-weight:700;">Expenses MTD</div>
          <div style="font-size:18px;font-weight:900;color:${negColor};margin-top:4px;">${fmtINRFull(monthExpense)}</div>
        </td>
        <td width="34%" style="text-align:center;">
          <div style="font-size:11px;color:${textMuted};text-transform:uppercase;font-weight:700;">Net Saved</div>
          <div style="font-size:18px;font-weight:900;color:${netSavings >= 0 ? posColor : negColor};margin-top:4px;">
            ${netSavings >= 0 ? "+" : "-"}${fmtINRFull(Math.abs(netSavings))}
          </div>
        </td>
      </tr>
    </table>

    <!-- Savings rate bar -->
    ${
      monthIncome > 0
        ? `
    <div style="margin-top:14px;background:#ffffff;border:1px solid ${borderColor};border-radius:8px;padding:10px 14px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:12px;color:${textPrimary};font-weight:700;">MTD Savings Rate</td>
          <td style="font-size:13px;color:${savRateColor};font-weight:800;text-align:right;">${savingsPct}%</td>
        </tr>
      </table>
      ${progressBar(savingsPct, savRateColor, 6)}
    </div>`
        : ""
    }

    <!-- Budget burn pacing -->
    ${
      totalBudgetLimit > 0
        ? `
    <div style="margin-top:8px;background:#ffffff;border:1px solid ${borderColor};border-radius:8px;padding:10px 14px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:12px;color:${textPrimary};font-weight:700;">Overall Budget Pacing</td>
          <td style="font-size:13px;font-weight:800;color:${totalBudgetSpentPct > monthElapsedPct + 15 ? warnColor : posColor};text-align:right;">
            ${fmtINR(totalBudgetSpent)} of ${fmtINR(totalBudgetLimit)} (${totalBudgetSpentPct}%)
          </td>
        </tr>
      </table>
      ${progressBar(totalBudgetSpentPct, totalBudgetSpentPct > monthElapsedPct + 15 ? warnColor : posColor, 6)}
      <div style="font-size:11px;color:${textMuted};margin-top:4px;">
        ${monthElapsedPct}% of month elapsed · ${totalBudgetSpentPct > monthElapsedPct + 15 ? "Burning faster than average pace" : "Spending on track"}
      </div>
    </div>`
        : ""
    }
  </td></tr>

  <!-- TOP SPENDING THIS MONTH -->
  ${
    topCats.length > 0
      ? `
  ${sectionHeader("Top Expense Categories MTD", "🛍️")}
  <tr><td style="background:${cardBg};">
    ${catRows}
  </td></tr>`
      : ""
  }

  <!-- BUDGET HEALTH (INDIVIDUAL CATEGORIES) -->
  ${
    budgetRows
      ? `
  ${sectionHeader("Budget Watchlist", "📊")}
  <tr><td style="background:${cardBg};">
    ${budgetRows}
  </td></tr>`
      : ""
  }

  <!-- INVESTMENT PORTFOLIO BREAKDOWN -->
  ${
    investTotal > 0
      ? `
  ${sectionHeader("Investment Portfolio Allocation", "📈", fmtINR(investTotal))}
  <tr><td style="background:${cardBg};">
    ${investRows}
  </td></tr>`
      : ""
  }

  <!-- OTHER ASSETS -->
  ${
    otherAssetItems
      ? `
  ${sectionHeader("Other Assets", "🏛️")}
  <tr><td style="background:${cardBg};">
    ${otherAssetItems}
  </td></tr>`
      : ""
  }

  <!-- LIABILITIES SUMMARY -->
  ${
    liabilityItems
      ? `
  ${sectionHeader("Liabilities Breakdown", "📋", fmtINR(totalLiabilities))}
  <tr><td style="background:${cardBg};">
    ${liabilityItems}
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

  <!-- GOALS -->
  ${
    goals.length > 0
      ? `
  ${sectionHeader("Financial Goals Progress", "🎯")}
  <tr><td style="background:${cardBg};">
    ${goalRows}
  </td></tr>`
      : ""
  }

  <!-- ALERTS & INSIGHTS -->
  ${
    alerts.length > 0
      ? `
  ${sectionHeader("Smart Alerts & Action Items", "⚡", `${alerts.length} action${alerts.length === 1 ? "" : "s"}`)}
  <tr><td style="background:${cardBg};padding-bottom:14px;">
    ${alertRows}
  </td></tr>`
      : `
  <tr><td style="background:#ecfdf5;border-top:1px solid ${borderColor};padding:24px;text-align:center;">
    <div style="font-size:28px;margin-bottom:8px;">✅</div>
    <div style="font-size:16px;font-weight:800;color:${posColor};">Everything is looking healthy!</div>
    <div style="font-size:13px;color:${textMuted};margin-top:4px;font-weight:500;">
      No urgent alerts, budgets are within limits, and emergency liquidity is intact.
    </div>
  </td></tr>`
  }

  <!-- FOOTER & DASHBOARD CTA -->
  <tr><td style="background:${navyBg};padding:28px 24px;text-align:center;border-top:1px solid rgba(255,255,255,0.08);">
    <div style="margin-bottom:14px;">
      <a href="https://personal-finance-by-anand-mohta.vercel.app" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:11px 24px;border-radius:8px;">
        Open ArthaDrishti Dashboard →
      </a>
    </div>
    <div style="font-size:12px;color:#94a3b8;line-height:1.7;font-weight:500;">
      Personal Finance by Anand Mohta · Prepared for ${escapeHtml(recipientName)}<br>
      <a href="https://personal-finance-by-anand-mohta.vercel.app/#settings" style="color:#64748b;text-decoration:none;font-size:11px;">
        Manage email preferences &amp; notification schedule
      </a>
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
function shouldSendNow(settings, frequency) {
  const freq = frequency || settings.emailFrequency || settings.email_frequency || "weekly";

  if (freq === "daily") return true;

  if (freq === "weekly") {
    const configDay = Number(settings.emailDay ?? settings.email_day ?? 1);
    return istDayOfWeek() === configDay;
  }

  if (freq === "monthly") {
    const configDate = Number(settings.emailDay ?? settings.email_day ?? 1);
    const effectiveDate = Math.min(configDate, istDaysInCurrentMonth());
    return istDate() === effectiveDate;
  }

  return false;
}

// ── Subject line ──────────────────────────────────────────────────────────────
function buildSubject(frequency, netWorth) {
  const ist = nowIST();
  const emoji = frequency === "daily" ? "☀️" : frequency === "weekly" ? "📊" : "📈";
  const period =
    frequency === "daily"
      ? ist.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })
      : frequency === "weekly"
        ? `Week of ${weekRange()}`
        : monthLabel();
  return `${emoji} Your ${frequency === "daily" ? "Daily" : frequency === "weekly" ? "Weekly" : "Monthly"} ArthaDrishti Briefing — ${period} | Net Worth ${fmtINR(netWorth)}`;
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
      const freq = ["daily", "weekly", "monthly"].includes(req.query?.frequency)
        ? req.query.frequency
        : "daily";
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
        const freq = row.email_frequency || "daily";
        if (!shouldSendNow(row, freq)) continue;

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

          if (error) console.error(`[send-summary] Failed for user ${row.user_id}:`, error.message);
          await recordSendResult(supabase, row.user_id, error ? "failed" : "sent", error?.message);
          results.push({
            userId: row.user_id,
            email: row.email_address,
            sent: !error,
            error: error?.message,
          });
        } catch (userErr) {
          console.error(`[send-summary] Error processing user ${row.user_id}:`, userErr.message);
          await recordSendResult(supabase, row.user_id, "failed", userErr.message);
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
}

// Attach helpers to module.exports for testability
module.exports = handler;
handler.computeSummary = computeSummary;
handler.generateHTML = generateHTML;
handler.getEffectiveRent = getEffectiveRent;
handler.shouldSendNow = shouldSendNow;
handler.annualizePremium = annualizePremium;
handler.nextAnnualOccurrence = nextAnnualOccurrence;
handler.fmtINR = fmtINR;
handler.fmtINRFull = fmtINRFull;
handler.escapeHtml = escapeHtml;
handler.largestRemainderRound = largestRemainderRound;
