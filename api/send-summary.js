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

// ── Manual-send auth check ────────────────────────────────────────────────────
// The manual POST path (used by the Settings "Send Test" button and the Monthly
// Report modal) used to have NO auth check at all: anyone who found this URL
// could POST { state, emailTo, ... } and have an email sent to any address using
// data they supplied themselves. This app has exactly one real user, and the
// frontend already holds a live Supabase session (see src/supabaseClient.ts),
// so we require the caller to prove they hold a valid Supabase access token for
// that account — the same JWT the browser already has from signing in. This is
// stronger than a shared secret (which would need to be embedded in client JS,
// where anyone can read it) and doesn't require introducing a brand-new secret.
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
  // Day 0 of next month == last day of current month
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

// Rounds each amount's share of `total` to a whole percent using the largest-remainder
// method, so the results always sum to 100 (unlike rounding each share independently,
// which can drift to 99 or 101 once there are more than a couple of categories).
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
// Every user-entered string (issuer names, goal names, category labels, alert
// text, recipient name, subscription/lender/property labels, etc.) is inserted
// into the email HTML template below. Without escaping, a caller of the manual
// POST endpoint could inject arbitrary HTML/script into the generated email.
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

    // Establishments whose balance has been transferred out via Form 13 (transfer_in recorded).
    // Their individual transactions must NOT be summed — the transfer_in amount already captures them.
    const transferredOutEstIds = new Set(
      txs
        .filter((x) => x.type === "transfer_in" && x.fromEmployer)
        .map((x) => {
          const est = ests.find((estItem) => estItem.employerName === x.fromEmployer);
          return est ? est.id : null;
        })
        .filter(Boolean)
    );

    // activeTxs = everything except transactions explicitly tagged to transferred-out establishments
    const activeTxs = txs.filter((t) => !t.estId || !transferredOutEstIds.has(t.estId));

    const byType = (type) =>
      activeTxs.filter((x) => x.type === type).reduce((s, x) => s + Number(x.amount || 0), 0);
    const monthlyRows = activeTxs.filter((x) => x.type === "monthly_contribution");
    const interestRows = activeTxs.filter((x) => x.type === "interest_credit");
    const transferRows = txs.filter((x) => x.type === "transfer_in"); // all txs — all transfer_ins count

    const totalEmployee =
      byType("employee_contribution") +
      monthlyRows.reduce((s, x) => s + Number(x.employeeShare || 0), 0);
    const totalEmployer =
      byType("employer_contribution") +
      monthlyRows.reduce((s, x) => s + Number(x.employerShare || 0), 0);
    const totalPension = monthlyRows.reduce((s, x) => s + Number(x.pensionShare || 0), 0);
    const totalInterest = interestRows.reduce((s, x) => {
      if (x.employeeShare !== undefined || x.employerShare !== undefined)
        return (
          s +
          Number(x.employeeShare || 0) +
          Number(x.employerShare || 0) +
          Number(x.pensionShare || 0)
        );
      return s + Number(x.amount || 0);
    }, 0);
    const totalTransferIn = transferRows.reduce((s, x) => s + Number(x.amount || 0), 0);
    const totalWithdrawal = byType("withdrawal");

    // Compute closing balances per EPFO passbook column
    const empInterest = interestRows.reduce((s, x) => {
      if (x.employeeShare !== undefined) return s + Number(x.employeeShare || 0);
      return s + Number(x.amount || 0); // backward compat: old single-amount interest → employee
    }, 0);
    const erInterest = interestRows.reduce((s, x) => s + Number(x.employerShare || 0), 0);
    const penInterest = interestRows.reduce((s, x) => s + Number(x.pensionShare || 0), 0);
    // employee gets remainder: total - er - pen (handles partial splits and no-splits correctly)
    const transferInEr = transferRows.reduce((s, x) => s + Number(x.employerShare || 0), 0);
    const transferInPen = transferRows.reduce((s, x) => s + Number(x.pensionShare || 0), 0);
    const transferInEmp = totalTransferIn - transferInEr - transferInPen;

    const closingEmployee = totalEmployee + empInterest + transferInEmp;
    const closingEmployer = totalEmployer + erInterest + transferInEr;
    const closingPension = totalPension + transferInPen + penInterest;
    const closingTotal = closingEmployee + closingEmployer + closingPension - totalWithdrawal;

    return closingTotal;
  };

  // ── Net worth ──────────────────────────────────────────────────────────────
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

  // Gold & SGBs — uses gold price stored in user_settings (synced from the app's Gold tab)
  // Falls back to 7200/gram (same default as the dashboard) if not set.
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

  const informalLentTotal = (state.informalLent || []).reduce((s, person) => {
    const tranches = person.tranches || [];
    const payments = person.payments || [];
    const totalT = tranches.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalP = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return s + Math.max(0, totalT - totalP);
  }, 0);

  const rentalPropertiesAsset = (state.rentalProperties || []).reduce(
    (s, r) => s + Number(r.propertyValue || 0),
    0
  );

  const vehicleAsset = (state.vehicles || []).reduce(
    (s, v) => s + Number(v.currentValue || v.purchasePrice || 0),
    0
  );

  const realEstateAsset = (state.realEstateProperties || [])
    .filter((p) => p.status !== "sold")
    .reduce((s, p) => s + Number(p.marketValue || p.agreementValue || 0), 0);

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

  const activeCards = (state.creditCards || []).filter(
    (c) => (c.status || "active").toLowerCase() !== "closed"
  );
  const creditOutstanding = activeCards.reduce((s, c) => s + (Number(c.outstanding) || 0), 0);
  // Shared-pool deduplication: cards sharing a pool (sharedGroup) count only the pool's max limit
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

  const informalBorrowedTotal = (state.informalBorrowed || []).reduce((s, person) => {
    const tranches = person.tranches || [];
    const payments = person.payments || [];
    const totalT = tranches.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalP = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return s + Math.max(0, totalT - totalP);
  }, 0);

  const realEstateOutstanding = (() => {
    const ucIds = new Set(
      (state.realEstateProperties || [])
        .filter((p) => p.status === "under-construction")
        .map((p) => p.id)
    );
    const demanded = (state.realEstateDemands || [])
      .filter((d) => ucIds.has(d.propertyId))
      .reduce((s, d) => s + Number(d.totalAmount || d.amount || 0), 0);
    const paid = (state.realEstatePayments || [])
      .filter((p) => ucIds.has(p.propertyId))
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    return Math.max(0, demanded - paid);
  })();

  const totalLiabilities =
    creditOutstanding +
    loanOutstanding +
    rentalDepositLiability +
    informalBorrowedTotal +
    realEstateOutstanding;
  const netWorth = totalAssets - totalLiabilities;

  // ── Cash flow (current month) ──────────────────────────────────────────────
  const monthTxns = (state.transactions || []).filter((t) => t.date && t.date.startsWith(curYm));

  const isTransferCat = (cat) => ["Transfer", "Self Transfer", "Self-Transfer"].includes(cat);

  const monthIncome = (() => {
    const explicitIncomeMonth = (state.income || [])
      .filter((i) => i.date && i.date.startsWith(curYm))
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const txnIncomeMonth = monthTxns
      .filter((t) => t.type === "credit" && !isTransferCat(t.category))
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    return explicitIncomeMonth > 0 ? explicitIncomeMonth : txnIncomeMonth;
  })();

  const rentPaidThisMonth = (state.rentedProperties || []).reduce((sum, p) => {
    const paymentsThisMonth = (p.payments || [])
      .filter((pay) => pay.date && pay.date.startsWith(curYm))
      .reduce((s, pay) => s + Number(pay.amount || 0), 0);
    return sum + paymentsThisMonth;
  }, 0);

  // Only add rental-ledger rent when no "Rent"-category debit txn exists this month —
  // prevents double-counting when the user already logged rent in the transactions tab.
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
          .sort((a, b) => {
            const mA = a.budgetMonth || "";
            const mB = b.budgetMonth || "";
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
      const limit = Number(b.monthly || 0);
      const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      return { category: b.category, spent, limit, pct, over: pct > 100 };
    })
    .sort((a, b) => b.pct - a.pct);

  // ── Upcoming dues (next 7 days) ───────────────────────────────────────────
  const todayVal = nowIST();
  const todayMs = Date.UTC(
    todayVal.getUTCFullYear(),
    todayVal.getUTCMonth(),
    todayVal.getUTCDate()
  );
  const in7Ms = todayMs + 7 * 86400000;

  const dues = [];

  // Subscriptions — app stores renewal date as renewalDate
  (state.subscriptions || [])
    .filter((s) => !s.paused && s.status !== "cancelled")
    .forEach((s) => {
      const next = new Date(s.renewalDate || s.nextDue || s.startDate || todayVal.toISOString());
      next.setUTCHours(0, 0, 0, 0);
      const nextMs = next.getTime();
      if (nextMs >= todayMs && nextMs <= in7Ms) {
        dues.push({ date: next, label: s.name, amount: Number(s.amount) || 0, type: "sub" });
      }
    });

  // Rent dues for rented properties
  (state.rentedProperties || []).forEach((p) => {
    const dueDay = Number(p.dueDay || 5);
    const paidCurrent = (p.payments || []).some((pay) => pay.date && pay.date.startsWith(curYm));
    if (!paidCurrent) {
      const d = new Date(Date.UTC(todayVal.getUTCFullYear(), todayVal.getUTCMonth(), dueDay));
      if (d.getTime() >= todayMs && d.getTime() <= in7Ms)
        dues.push({
          date: d,
          label: `${p.propertyName || "Rent"}`,
          amount: Number(p.monthlyRent || 0),
          type: "emi",
        });
    }
  });

  // Credit card due dates
  activeCards.forEach((c) => {
    if (!c.dueDay || !Number(c.outstanding)) return;
    const d = new Date(
      Date.UTC(todayVal.getUTCFullYear(), todayVal.getUTCMonth(), Number(c.dueDay))
    );
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

  // Credit card annual fees due in the next 7 days
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
      });
    }
  });

  // Loan EMI dates
  (state.loansTaken || []).forEach((l) => {
    if (!l.emiDate && !l.dueDay) return;
    const day = Number(l.emiDate || l.dueDay);
    if (!day) return;
    const d = new Date(Date.UTC(todayVal.getUTCFullYear(), todayVal.getUTCMonth(), day));
    if (d.getTime() < todayMs) d.setUTCMonth(d.getUTCMonth() + 1);
    if (d.getTime() >= todayMs && d.getTime() <= in7Ms) {
      dues.push({
        date: d,
        label: `${l.lender || "Loan"} EMI`,
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
  if (savingsPct < 20 && monthIncome > 0)
    alerts.push({ type: "info", msg: `Savings rate this month: ${savingsPct}% — aim for 20%+` });

  // No income/expenses logged this month — surface this explicitly so "no alerts" never
  // gets read as "verified healthy" when it's really "no data yet" (savings-rate and
  // emergency-fund checks above are both skipped when monthIncome/monthExpense are 0).
  if (monthIncome === 0 && monthExpense === 0 && now.getUTCDate() >= 10)
    alerts.push({
      type: "info",
      msg: `No income or expenses logged yet this month (day ${now.getUTCDate()}) — log your transactions to get accurate budget and savings insights.`,
    });

  // Emergency fund check: bank balance < 3 months expenses
  if (monthExpense > 0 && bankTotal < monthExpense * 3)
    alerts.push({
      type: "warn",
      msg: `Emergency fund low: bank balance (${fmtINR(bankTotal)}) covers only ${Math.round(bankTotal / monthExpense)} month(s) of expenses — aim for 3-6 months`,
    });

  // High debt ratio
  if (totalAssets > 0 && totalLiabilities > totalAssets * 0.5)
    alerts.push({
      type: "alert",
      msg: `Debt ratio at ${Math.round((totalLiabilities / totalAssets) * 100)}% of assets — liabilities are ${fmtINR(totalLiabilities)}`,
    });

  // FDs maturing within 30 days
  const todayStr = today();
  (state.fixedDeposits || []).forEach((fd) => {
    if (fd.maturityDate) {
      const daysToMaturity = Math.round(
        (new Date(fd.maturityDate).getTime() - new Date(todayStr).getTime()) / 86400000
      );
      if (daysToMaturity >= 0 && daysToMaturity <= 30)
        alerts.push({
          type: "info",
          msg: `FD of ${fmtINR(fd.principal)} at ${fd.bank || "bank"} matures in ${daysToMaturity} day(s) — plan for reinvestment`,
        });
    }
  });

  // Large informal lending outstanding
  if (informalLentTotal > 0 && informalLentTotal > bankTotal * 0.3)
    alerts.push({
      type: "info",
      msg: `${fmtINR(informalLentTotal)} lent informally — ${Math.round((informalLentTotal / totalAssets) * 100)}% of total assets`,
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

  const posColor = "#059669";
  const negColor = "#dc2626";
  const warnColor = "#d97706";
  const accentColor = "#4f46e5";
  const navyBg = "#0f172a";
  const cardBg = "#ffffff";
  const bodyBg = "#f1f5f9";
  const textPrimary = "#0f172a";
  const textMuted = "#475569";
  const borderColor = "#e2e8f0";
  const sectionBg = "#f8fafc";

  const pct = (val, total) => (total > 0 ? Math.min(Math.round((val / total) * 100), 100) : 0);

  function progressBar(pctVal, color = accentColor, height = 8) {
    const w = Math.max(pctVal, 2);
    return `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;"><tr>
        <td style="background:#e2e8f0;border-radius:99px;height:${height}px;font-size:1px;line-height:${height}px;">
          <table width="${w}%" cellpadding="0" cellspacing="0"><tr>
            <td style="background:${color};border-radius:99px;height:${height}px;font-size:1px;line-height:${height}px;">&nbsp;</td>
          </tr></table>
        </td>
      </tr></table>`;
  }

  function statBox(label, value, sub = "", color = textPrimary) {
    return `
      <td style="padding:16px 20px;vertical-align:top;background:${sectionBg};border-radius:8px;">
        <div style="font-size:12px;color:${textMuted};text-transform:uppercase;letter-spacing:0.06em;font-weight:700;margin-bottom:6px;">${label}</div>
        <div style="font-size:24px;font-weight:900;color:${color};letter-spacing:-0.02em;line-height:1.2;">${value}</div>
        ${sub ? `<div style="font-size:13px;color:${textMuted};margin-top:4px;">${sub}</div>` : ""}
      </td>`;
  }

  function sectionHeader(title, emoji) {
    return `
      <tr><td class="sec-pad" style="padding:32px 28px 14px;">
        <table cellpadding="0" cellspacing="0" width="100%"><tr>
          <td style="font-size:18px;padding-right:10px;vertical-align:middle;width:28px;">${emoji}</td>
          <td style="font-size:14px;font-weight:800;color:${textPrimary};text-transform:uppercase;letter-spacing:0.1em;vertical-align:middle;">${title}</td>
        </tr></table>
        <div style="height:2px;background:${accentColor};margin-top:12px;border-radius:1px;"></div>
      </td></tr>`;
  }

  // ── Upcoming dues rows ────────────────────────────────────────────────────
  const _todayVal = nowIST();
  const todayMs = Date.UTC(
    _todayVal.getUTCFullYear(),
    _todayVal.getUTCMonth(),
    _todayVal.getUTCDate()
  );
  const dueRows = dues
    .slice(0, 6)
    .map((d, i) => {
      const icon =
        d.type === "cc" ? "💳" : d.type === "emi" ? "🏠" : d.type === "sub" ? "📱" : "📌";
      const isPast = d.date.getTime() < todayMs;
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `
      <tr>
        <td style="padding:12px 28px;background:${bg};border-bottom:1px solid ${borderColor};">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-size:14px;color:${textPrimary};font-weight:600;">${icon} ${escapeHtml(d.label)}</td>
            <td style="font-size:13px;color:${textMuted};font-weight:600;text-align:center;">${d.date.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</td>
            <td style="font-size:16px;font-weight:900;color:${isPast ? negColor : textPrimary};text-align:right;">${d.amount > 0 ? fmtINRFull(d.amount) : "—"}</td>
          </tr></table>
        </td>
      </tr>`;
    })
    .join("");

  // ── Goals rows ────────────────────────────────────────────────────────────
  const goalRows = goals
    .map((g, i) => {
      const barColor = g.pct >= 80 ? posColor : g.pct >= 50 ? accentColor : warnColor;
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `
      <tr><td style="padding:14px 28px;background:${bg};border-bottom:1px solid ${borderColor};">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:15px;font-weight:700;color:${textPrimary};">${escapeHtml(g.name)}</td>
            <td style="font-size:15px;font-weight:900;color:${barColor};text-align:right;">${g.pct}%</td>
          </tr>
        </table>
        ${progressBar(g.pct, barColor, 8)}
        <div style="font-size:13px;color:${textMuted};margin-top:6px;font-weight:500;">${fmtINR(g.current)} of ${fmtINR(g.target)}</div>
      </td></tr>`;
    })
    .join("");

  // ── Top spending rows ─────────────────────────────────────────────────────
  const maxCatAmt = topCats[0]?.amt || 1;
  const catRows = topCats
    .map(({ cat, amt }, i) => {
      const p = pct(amt, monthExpense);
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `
      <tr><td style="padding:12px 28px;background:${bg};border-bottom:1px solid ${borderColor};">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:14px;color:${textPrimary};font-weight:600;">${escapeHtml(cat)}</td>
            <td style="font-size:15px;font-weight:800;color:${textPrimary};text-align:right;">${fmtINRFull(amt)} <span style="color:${textMuted};font-weight:500;font-size:12px;">(${p}%)</span></td>
          </tr>
        </table>
        ${progressBar(pct(amt, maxCatAmt), accentColor, 6)}
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
        <div style="background:${bg};border-left:4px solid ${border};border-radius:0 8px 8px 0;padding:12px 16px;font-size:14px;color:${textPrimary};font-weight:500;line-height:1.5;">
          ${icon} ${escapeHtml(a.msg)}
        </div>
      </td></tr>`;
    })
    .join("");

  // ── Credit card quick list ────────────────────────────────────────────────
  const ccRows = activeCards
    .slice(0, 4)
    .map((c, i) => {
      const out = Number(c.outstanding) || 0;
      const lim = Number(c.limit || c.cardLimit) || 0;
      const u = lim > 0 ? Math.round((out / lim) * 100) : 0;
      const uColor = u >= 70 ? negColor : u >= 40 ? warnColor : posColor;
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `
      <tr><td style="padding:12px 28px;background:${bg};border-bottom:1px solid ${borderColor};">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font-size:14px;font-weight:700;color:${textPrimary};">${escapeHtml(c.issuer)} <span style="color:${textMuted};font-weight:400;font-size:12px;">··${escapeHtml(c.last4) || "**"}</span></td>
            <td style="text-align:right;">
              <span style="font-size:15px;font-weight:800;color:${textPrimary};">${fmtINR(out)}</span>
              <span style="font-size:12px;color:${uColor};font-weight:700;margin-left:8px;">${u}% used</span>
            </td>
          </tr>
        </table>
      </td></tr>`;
    })
    .join("");

  // ── Savings rate colour ───────────────────────────────────────────────────
  const savColor = savingsPct >= 30 ? posColor : savingsPct >= 15 ? warnColor : negColor;
  const netSavColor = netSavings >= 0 ? posColor : negColor;

  // ── Row helper for breakdown lists ──────────────────────────────────────────
  let rowIdx = 0;
  function listRow(label, value, icon) {
    const bg = rowIdx++ % 2 === 0 ? "#ffffff" : "#f8fafc";
    return `
    <tr><td style="padding:12px 28px;background:${bg};border-bottom:1px solid ${borderColor};">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:14px;color:${textPrimary};font-weight:600;">${icon ? icon + " " : ""}${label}</td>
        <td style="font-size:15px;font-weight:800;color:${textPrimary};text-align:right;">${value}</td>
      </tr></table>
    </td></tr>`;
  }

  // ── Investment portfolio rows (all types) ─────────────────────────────────
  // Percentages use largest-remainder rounding so they always sum to 100%
  // instead of drifting to 99/101 from rounding each category independently.
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
          `${fmtINR(c.amt)} <span style="color:${textMuted};font-weight:500;font-size:13px;">(${investPcts[i]}%)</span>`
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
    .slice(0, 6)
    .map((b, i) => {
      const barColor = b.over ? negColor : b.pct >= 80 ? warnColor : posColor;
      const bg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
      return `
    <tr><td style="padding:14px 28px;background:${bg};border-bottom:1px solid ${borderColor};">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:14px;font-weight:700;color:${textPrimary};">${escapeHtml(b.category)}</td>
          <td style="font-size:14px;font-weight:800;color:${barColor};text-align:right;">${fmtINR(b.spent)} / ${fmtINR(b.limit)} (${b.pct}%)</td>
        </tr>
      </table>
      ${progressBar(Math.min(b.pct, 100), barColor, 8)}
    </td></tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<!--[if gte mso 9]><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
<title>Finance Summary</title>
<style>
  @media only screen and (max-width:480px) {
    .sec-pad { padding-left:16px !important; padding-right:16px !important; }
    .hero-value { font-size:32px !important; }
    .stat4 td { display:block !important; width:100% !important; margin-bottom:8px; }
    .stat4 td:empty { display:none !important; }
    .stat3 td { display:block !important; width:100% !important; margin-bottom:8px; }
    .stat3 td:last-child { margin-bottom:0; }
  }
</style>
</head>
<body style="margin:0;Margin:0;padding:0;background:${bodyBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:${bodyBg};padding:24px 16px;">
<tr><td>
<table width="680" cellpadding="0" cellspacing="0" align="center" style="max-width:680px;margin:0 auto;">

  <!-- HEADER -->
  <tr><td class="sec-pad" style="background:${navyBg};border-radius:16px 16px 0 0;padding:28px 28px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td>
        <div style="font-size:22px;font-weight:900;color:#ffffff;letter-spacing:-0.02em;">Personal Finance</div>
        <div style="font-size:14px;color:#94a3b8;margin-top:5px;font-weight:500;">${periodLabel}</div>
      </td>
      <td style="text-align:right;vertical-align:top;">
        <div style="display:inline-block;background:#2a2977;border:1px solid #4338ca;border-radius:8px;padding:8px 16px;">
          <span style="font-size:13px;font-weight:800;color:#a5b4fc;text-transform:uppercase;letter-spacing:0.08em;">
            ${frequency === "daily" ? "Daily" : frequency === "weekly" ? "Weekly" : "Monthly"} Report
          </span>
        </div>
      </td>
    </tr></table>
  </td></tr>

  <!-- NET WORTH HERO -->
  <tr><td class="sec-pad" style="background:#1e1b4b;padding:32px 28px;">
    <div style="font-size:13px;font-weight:700;color:#a5b4fc;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:10px;">Total Net Worth</div>
    <div class="hero-value" style="font-size:44px;font-weight:900;color:#ffffff;letter-spacing:-0.03em;line-height:1;">${fmtINRFull(netWorth)}</div>
    <table class="stat4" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;"><tr>
      <td style="padding:10px 12px;background:#2a2755;border-radius:8px;text-align:center;">
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Total Assets</div>
        <div style="font-size:20px;font-weight:800;color:#34d399;margin-top:5px;">${fmtINR(totalAssets)}</div>
      </td>
      <td style="width:8px;"></td>
      <td style="padding:10px 12px;background:#2a2755;border-radius:8px;text-align:center;">
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Total Liabilities</div>
        <div style="font-size:20px;font-weight:800;color:#fca5a5;margin-top:5px;">${fmtINR(totalLiabilities)}</div>
      </td>
      <td style="width:8px;"></td>
      <td style="padding:10px 12px;background:#2a2755;border-radius:8px;text-align:center;">
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Cash &amp; Banks</div>
        <div style="font-size:20px;font-weight:800;color:#ffffff;margin-top:5px;">${fmtINR(bankTotal)}</div>
      </td>
      <td style="width:8px;"></td>
      <td style="padding:10px 12px;background:#2a2755;border-radius:8px;text-align:center;">
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;">Investments</div>
        <div style="font-size:20px;font-weight:800;color:#a5b4fc;margin-top:5px;">${fmtINR(investTotal)}</div>
      </td>
    </tr></table>
  </td></tr>

  <!-- CASHFLOW -->
  ${sectionHeader("Monthly Cash Flow", "💸")}
  <tr><td class="sec-pad" style="background:${cardBg};padding:4px 28px 24px;">
    <table class="stat3" width="100%" cellpadding="0" cellspacing="8"><tr>
      ${statBox("Income", fmtINRFull(monthIncome), "This month", posColor)}
      ${statBox("Expenses", fmtINRFull(monthExpense), "This month", negColor)}
      ${statBox("Net Saved", fmtINRFull(Math.abs(netSavings)), netSavings >= 0 ? `${savingsPct}% savings rate` : "Overspent", netSavColor)}
    </tr></table>
    ${
      monthIncome > 0
        ? `
    <div style="padding:8px 0 4px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-size:12px;color:${textMuted};font-weight:600;">Savings rate</td>
        <td style="font-size:13px;color:${savColor};font-weight:800;text-align:right;">${savingsPct}%</td>
      </tr></table>
      ${progressBar(savingsPct, savColor, 6)}
    </div>`
        : ""
    }
  </td></tr>

  <!-- INVESTMENT PORTFOLIO (FULL BREAKDOWN) -->
  ${
    investTotal > 0
      ? `
  ${sectionHeader("Investment Portfolio", "📈")}
  <tr><td style="padding:4px 28px 12px;background:${cardBg};">
    <div style="background:#eef2ff;border-left:4px solid ${accentColor};border-radius:0 8px 8px 0;padding:14px 16px;">
      <div style="font-size:28px;font-weight:900;color:${accentColor};letter-spacing:-0.02em;">${fmtINRFull(investTotal)}</div>
      <div style="font-size:12px;color:${textMuted};margin-top:4px;font-weight:500;">Total invested across ${[mfTotal, stockTotal, fdTotal, rdTotal, ppfTotal, npsTotal, epfTotal, bondsTotal, licTotal, investmentTotalPlans].filter((v) => v > 0).length} categories</div>
    </div>
  </td></tr>
  <tr><td style="background:${cardBg};">
    ${investRows}
  </td></tr>`
      : ""
  }

  <!-- OTHER ASSETS -->
  ${
    otherAssetItems
      ? `
  ${sectionHeader("Other Assets", "🏦")}
  <tr><td style="background:${cardBg};">
    ${otherAssetItems}
  </td></tr>`
      : ""
  }

  <!-- LIABILITIES -->
  ${
    liabilityItems
      ? `
  ${sectionHeader("Liabilities", "📋")}
  <tr><td style="background:${cardBg};">
    ${liabilityItems}
  </td></tr>
  <tr><td style="padding:14px 28px;background:#fef2f2;border-left:4px solid ${negColor};">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="font-size:14px;font-weight:800;color:${negColor};">Total Liabilities</td>
      <td style="font-size:18px;font-weight:900;color:${negColor};text-align:right;">${fmtINRFull(totalLiabilities)}</td>
    </tr></table>
  </td></tr>`
      : ""
  }

  <!-- CREDIT CARDS -->
  ${
    activeCardCount > 0
      ? `
  ${sectionHeader(`Credit Cards (${creditUtil}% of combined limit utilized)`, "💳")}
  <tr><td style="background:${cardBg};">
    ${ccRows}
  </td></tr>`
      : ""
  }

  <!-- BUDGET HEALTH -->
  ${
    budgetRows
      ? `
  ${sectionHeader("Budget Health", "📊")}
  <tr><td style="background:${cardBg};">
    ${budgetRows}
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
  <tr><td style="padding:8px 28px 4px;background:${cardBg};">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr style="background:#eef2ff;">
        <td style="font-size:11px;font-weight:800;color:${accentColor};text-transform:uppercase;letter-spacing:0.08em;padding:10px 0;border-bottom:2px solid ${accentColor};">Item</td>
        <td style="font-size:11px;font-weight:800;color:${accentColor};text-transform:uppercase;letter-spacing:0.08em;padding:10px 0;text-align:center;border-bottom:2px solid ${accentColor};">Date</td>
        <td style="font-size:11px;font-weight:800;color:${accentColor};text-transform:uppercase;letter-spacing:0.08em;padding:10px 0;text-align:right;border-bottom:2px solid ${accentColor};">Amount</td>
      </tr>
    </table>
  </td></tr>
  ${dueRows}`
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
  <tr><td style="background:#ecfdf5;border-top:1px solid ${borderColor};padding:28px;text-align:center;">
    <div style="font-size:32px;margin-bottom:10px;">✅</div>
    <div style="font-size:18px;font-weight:800;color:${posColor};">Everything looks good!</div>
    <div style="font-size:14px;color:${textMuted};margin-top:6px;font-weight:500;">No alerts, budgets on track, finances healthy.</div>
  </td></tr>`
      : ""
  }

  <!-- FOOTER -->
  <tr><td style="background:${navyBg};border-radius:0 0 16px 16px;padding:24px 28px;text-align:center;">
    <div style="font-size:13px;color:#94a3b8;line-height:1.8;font-weight:500;">
      Personal Finance by Anand Mohta &nbsp;·&nbsp; ${dateStr}<br>
      <a href="https://personal-finance-by-anand-mohta.vercel.app" style="color:#a5b4fc;text-decoration:none;font-weight:700;">Open Dashboard →</a>
      &nbsp;·&nbsp;
      <a href="https://personal-finance-by-anand-mohta.vercel.app/#settings" style="color:#64748b;text-decoration:none;font-size:12px;">Manage email settings</a>
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
  };
}

// ── Live stock prices ─────────────────────────────────────────────────────────
// The dashboard's net worth uses live Yahoo Finance quotes (fetched client-side) rather
// than the stocks table's stored current_price column, which is only refreshed by the
// cron-update-prices job on weekday evenings. Without this, the email's stock valuation
// can lag the dashboard's by whatever the stock has moved since that last sync — so we
// fetch the same live quotes here, using the same symbol format (SYMBOL.NS / SYMBOL.BO).
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
// Mirrors withLiveStockPrices above: the dashboard (InvestmentsTab's liveMfNav /
// getLiveNav, fed by api/mf-nav.js) fetches each fund's NAV from mfapi.in on every
// load, while the mutual_funds.current_nav column is only refreshed once a day by
// the weekday-6pm cron-update-prices job. Without this, the email's MF valuation
// can be up to a day stale relative to what the dashboard shows.
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
    // Clamp to the last day of the current month so a user who picked 29/30/31
    // still gets their report in shorter months (e.g. Feb) instead of the send
    // silently never firing that month.
    const effectiveDate = Math.min(configDate, istDaysInCurrentMonth());
    return istDate() === effectiveDate;
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
      // Auth check FIRST, before touching the request body or sending anything.
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

      // ── Resolve destination email server-side ───────────────────────────
      // NEVER trust the client-supplied emailTo: signup is open (src/Auth.tsx),
      // so anyone can register an account and POST an arbitrary emailTo to make
      // this endpoint's Resend account relay branded email to any address. Look
      // up the caller's OWN notification email from user_settings (set only via
      // their own authenticated session in SettingsTab.tsx) instead, falling
      // back to their verified Supabase Auth account email if unset.
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

      // Use fromEmail from the request body if provided (user configured it in Settings UI),
      // otherwise fall back to the RESEND_FROM_EMAIL env var or the test sender.
      const effectiveFromEmail = getEffectiveFromEmail(fromEmail);
      const effectiveFromAddr = `Personal Finance <${effectiveFromEmail}>`;

      // Fetch state fresh from Supabase — same source of truth the cron uses —
      // instead of trusting whatever the browser's in-memory state happened to
      // hold. A tab left open across a data edit made elsewhere (another
      // device, another tab, a direct DB change) would otherwise silently
      // email stale numbers with no way to tell they're stale.
      const state = await fetchStateFromSupabase(supabase, auth.user.id);
      const { data: profData } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      const recipientName = profData?.name || requestedRecipientName || "there";

      const summary = computeSummary(await withLiveMFPrices(await withLiveStockPrices(state)));
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

        try {
          const state = await fetchStateFromSupabase(supabase, row.user_id);

          // Fetch the user's name from profiles table
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
