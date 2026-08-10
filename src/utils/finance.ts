import { STORAGE_KEY } from "./constants";
import { getCurrentFY, getCurrentFYStartYear } from "./appConstants";

export const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveStateLocal = (s: any) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, _ts: Date.now() }));
  } catch {}
};

export const fmtINR = (n: number | string | null | undefined) => {
  if (n === null || n === undefined || isNaN(Number(n))) return "₹0";
  const num = Number(n);
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  // parseFloat strips trailing zeros: 50.0 → "50", 1.50 → "1.5", 2.00 → "2"
  const fmt = (val: number, dec: number) => parseFloat(val.toFixed(dec)).toString();
  if (abs >= 10000000) return `${sign}₹${fmt(abs / 10000000, 2)}Cr`;
  if (abs >= 100000) return `${sign}₹${fmt(abs / 100000, 2)}L`;
  if (abs >= 1000) return `${sign}₹${fmt(abs / 1000, 1)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
};

export const fmtINRFull = (n: number | string | null | undefined) => {
  if (n === null || n === undefined || isNaN(Number(n))) return "₹0";
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

export const fmtINRExact = (n: number | string | null | undefined) => {
  if (n === null || n === undefined || isNaN(Number(n))) return "₹0";
  const num = Number(n);
  const hasPaisa = num % 1 !== 0;
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: hasPaisa ? 2 : 0, maximumFractionDigits: 2 })}`;
};

export const DEFAULT_GOLD_PRICE_PER_GRAM = 7200; // ₹ per gram for 24K, last-resort fallback only

export const GOLD_PURITY_FACTOR: Record<string, number> = {
  "24K": 1,
  "22K": 22 / 24,
  "18K": 18 / 24,
  "14K": 14 / 24,
};

// Gold price per gram is entered once (GoldSGBTab) and consumed by many modules
// (net worth, analytics, rebalancing, family view, benchmark). It's synced to
// `user_settings.gold_price_per_gram` so it's available across devices — but
// every consumer used to read `localStorage` directly instead, so the price set
// on one device silently fell back to the stale default on any other device/
// browser. Centralizing here: state (DB-synced) wins, localStorage is only a
// same-device cache for callers that don't have `state` in scope.
export const getGoldPricePerGram = (state?: any): number => {
  const fromState = Number(state?.settings?.goldPricePerGram);
  if (fromState > 0) return fromState;
  try {
    const fromLocal = Number(localStorage.getItem("gold_price_per_gram"));
    if (fromLocal > 0) return fromLocal;
  } catch {}
  return DEFAULT_GOLD_PRICE_PER_GRAM;
};

// FIRE (Financial Independence): single source of truth for the "corpus
// needed" formula (annual expense, inflation-projected to `yearsOut`, divided
// by the safe withdrawal rate). Previously AnalyticsTab's dashboard widget,
// AnalyticsTab's Planning projection chart, and the standalone FIREPlannerTab
// each reimplemented this independently — the dashboard/chart hardcoded a flat
// 25x multiplier (implying a fixed 4% SWR) while the Planner exposed SWR as a
// user-adjustable input, so the same household could see disagreeing FIRE
// targets across tabs with no explanation. Centralizing the formula here means
// every consumer computes the same number for the same inputs; the Dashboard/
// chart intentionally still pass the fixed default SWR (a quick heuristic),
// while FIREPlannerTab passes the user's chosen SWR (a tunable model) — that
// difference is by design, but the underlying math can never drift apart again.
export const DEFAULT_FIRE_SWR = 4; // Safe Withdrawal Rate %, i.e. a flat 25x rule

export const computeFireTarget = (
  annualExpense: number,
  yearsOut: number = 0,
  swrPercent: number = DEFAULT_FIRE_SWR,
  inflationPercent: number = 0
): number => {
  const infl = Math.pow(1 + inflationPercent / 100, yearsOut);
  const swr = swrPercent > 0 ? swrPercent : DEFAULT_FIRE_SWR;
  return (Math.max(0, annualExpense) * infl) / (swr / 100);
};

// Emergency Fund: this and the two helpers below (getEmergencyFundLiquidAssets,
// getEmergencyFundMonthlyExpense) are the single source of truth for "months of
// expenses covered by liquid assets" — used by useMetrics (metrics.emergencyFund)
// and every tab/alert that surfaces this figure. Previously each consumer
// (EmergencyFundTab, AnalyticsTab's dashboard widget, its Financial Health Score,
// Smart Insights, gamification badges, useAlerts, AIAssistantTab, SmartAlertsTab,
// PerformanceBenchmarkTab) recomputed its own version of "liquid assets" with
// different asset sets (some included near-term FDs, some liquid mutual funds,
// some prepaid cards, some none of the above) and different month thresholds for
// the same status label — so the same household could see e.g. "2.1 months /
// Critical" on one tab and "5.4 months / Building" on another for the exact same
// underlying data. Centralizing here keeps every surface in sync.
export const EMERGENCY_FUND_TARGET_MONTHS = 6;

// FDs maturing within this window count as "near-liquid" for emergency-fund
// purposes (breaking an FD outside this window still leaves the fund usable, but
// isn't treated as instantly accessible liquidity).
const EMERGENCY_FUND_FD_WINDOW_DAYS = 90;

export type EmergencyFundTier = "critical" | "building" | "healthy" | "excellent";

// Single tier→label→color mapping for the emergency-fund status badge/gauge/etc.
// `badgeVariant` matches the `Badge` component's variant prop so callers can pass
// it straight through without re-deriving a color.
export const getEmergencyFundStatus = (
  monthsCovered: number
): { tier: EmergencyFundTier; label: string; badgeVariant: "rust" | "gold" | "accent" | "sage" } => {
  if (monthsCovered >= 12) return { tier: "excellent", label: "Excellent", badgeVariant: "sage" };
  if (monthsCovered >= EMERGENCY_FUND_TARGET_MONTHS)
    return { tier: "healthy", label: "Healthy", badgeVariant: "accent" };
  if (monthsCovered >= 3) return { tier: "building", label: "Needs Improvement", badgeVariant: "gold" };
  return { tier: "critical", label: "Critical", badgeVariant: "rust" };
};

// Liquid assets counted toward the emergency fund: bank balances, FDs maturing
// within EMERGENCY_FUND_FD_WINDOW_DAYS days (principal), liquid/money-market/
// overnight/ultra-short mutual funds (current value), and prepaid card balances.
// `prepaidValue` is passed in rather than re-derived here because the correct
// calculation (load/spend ledger, closed-card exclusion) already lives in
// useMetrics — re-deriving it independently is what caused prior drift (one
// earlier version filtered on transaction types that don't exist in the data
// model and always evaluated to zero).
export const getEmergencyFundLiquidAssets = (
  state: any,
  cashInBanks: number,
  prepaidValue: number
): { liquidAssets: number; nearTermFDValue: number; liquidMFValue: number } => {
  const nearTermFDValue = (state?.fixedDeposits || []).reduce((sum: number, fd: any) => {
    if (!fd.maturityDate) return sum;
    // Parse at local midnight, not UTC, to match the local Date.now() comparison.
    const matMs = new Date(fd.maturityDate + "T00:00:00").getTime();
    const nowMs = Date.now();
    if (matMs >= nowMs && matMs <= nowMs + EMERGENCY_FUND_FD_WINDOW_DAYS * 86400000) {
      return sum + Number(fd.principal || 0);
    }
    return sum;
  }, 0);

  const liquidMFValue = (state?.mutualFunds || []).reduce((sum: number, m: any) => {
    const cat = (m.category || m.type || "").toLowerCase();
    if (
      cat.includes("liquid") ||
      cat.includes("money market") ||
      cat.includes("overnight") ||
      cat.includes("ultra short")
    ) {
      return sum + (Number(m.units) || 0) * (Number(m.currentNav) || Number(m.buyNav) || 0);
    }
    return sum;
  }, 0);

  return {
    liquidAssets: cashInBanks + nearTermFDValue + liquidMFValue + Math.max(0, prepaidValue),
    nearTermFDValue,
    liquidMFValue,
  };
};

// Monthly expense base for the emergency-fund runway. Prefers the user's own
// budget (excluding Transfer/Self Transfer/Investment categories, which are
// budget-able but aren't real spend — see MonthlyReportModal's same exclusion),
// then falls back to a bottom-up sum of known recurring commitments, then to
// the transaction-derived `monthExpense` metric.
export const getEmergencyFundMonthlyExpense = (state: any, fallbackMonthExpense: number): number => {
  const isNonExpenseBudgetCat = (cat: string) =>
    ["Transfer", "Self Transfer", "Self-Transfer", "Investment"].includes(cat || "");
  const budgetTotal = (state?.budgets || [])
    .filter((b: any) => !isNonExpenseBudgetCat(b.category))
    .reduce((s: number, b: any) => s + Number(b.monthly || b.monthlyLimit || 0), 0);
  if (budgetTotal > 0) return budgetTotal;

  const emis = (state?.loansTaken || []).reduce((s: number, l: any) => s + Number(l.emi || 0), 0);
  const sips = (state?.sips || [])
    .filter((s: any) => s.status !== "stopped")
    .reduce((s: number, si: any) => s + Number(si.amount || 0), 0);
  const subs = (state?.subscriptions || [])
    .filter((s: any) => !s.paused)
    .reduce((s: number, sub: any) => {
      const amt = Number(sub.amount || 0);
      if (sub.cycle === "yearly") return s + amt / 12;
      if (sub.cycle === "quarterly") return s + amt / 3;
      return s + amt;
    }, 0);
  const recurring = (state?.recurringExpenses || []).reduce(
    (s: number, r: any) => s + Number(r.amount || 0),
    0
  );
  const rent = (state?.rentedProperties || []).reduce(
    (s: number, p: any) => s + Number(p.monthlyRent || 0),
    0
  );
  const insurance = [
    ...(state?.lic || []),
    ...(state?.termPlans || []),
    ...(state?.investmentPlans || []),
  ].reduce((s: number, p: any) => s + Number(p.annualPremium || p.premium || 0) / 12, 0);
  const bottomUp = emis + sips + subs + recurring + rent + insurance;

  return bottomUp > 0 ? bottomUp : fallbackMonthExpense || 0;
};

export const uid = () => {
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const getLocalDateString = (d: Date) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export const today = () => getLocalDateString(new Date());

// Alert titles like "HDFC CC due in 5d" or "Credit utilization at 78%" embed a
// number that changes daily even though the user is dismissing/snoozing the same
// underlying condition. Keying dismissal off the raw title means a snooze (or even
// a "permanent" dismiss) silently re-expires the moment that number ticks over —
// e.g. a 7-day snooze on "due in 5d" no longer matches "due in 4d" the next day.
// Stripping digits gives a stable key for the same alert across its lifetime while
// still keeping different alerts (different issuer/policy/name in the title) distinct.
export const alertDismissKey = (title: string) => title.replace(/\d+(\.\d+)?/g, "#");

export const monthsBetween = (d1: string, d2: string) => {
  const a = new Date(d1),
    b = new Date(d2);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
};

// Add `monthsToAdd` calendar months to a "YYYY-MM-DD" date string, clamping the day-of-month so
// it never overflows into a later month (e.g. Jan 31 + 1 month must land on Feb 28/29, not roll
// over into March — plain Date.setMonth silently overflows for day 29-31 starting dates when the
// target month is shorter). Operates entirely on Y-M-D components (no Date-object round trip),
// so it's also immune to the UTC/local-timezone off-by-one that `new Date(str).toISOString()`
// patterns are prone to for users outside IST. Mirrors XIRRReportTab's Date-object version of
// the same fix, for call sites that work with date strings instead.
export const addMonthsToDateStr = (dateStr: string, monthsToAdd: number): string => {
  const [y, m, d] = dateStr.split("-").map(Number);
  const total = m - 1 + monthsToAdd;
  const newY = y + Math.floor(total / 12);
  const newM = ((total % 12) + 12) % 12;
  const daysInMonth = new Date(newY, newM + 1, 0).getDate();
  const newD = Math.min(d, daysInMonth);
  return `${newY}-${String(newM + 1).padStart(2, "0")}-${String(newD).padStart(2, "0")}`;
};

// Returns the next occurrence (this year, or next if already past) of
// `startDate`'s month/day on or after `refDate` — both "YYYY-MM-DD". Used for
// annual-renewal due dates (insurance premiums etc). Built entirely from
// local Y-M-D components (never a bare `new Date("YYYY-MM-DD")` parse, which
// is UTC and can land on the wrong local day) and clamps the day-of-month so
// e.g. a Feb 29 anniversary doesn't overflow into March on a non-leap year —
// same class of bug documented on `getCCDueDate` above.
export const nextAnnualOccurrence = (startDate: string, refDate: string): string => {
  const [, m, d] = startDate.split("-").map(Number);
  const [refY] = refDate.split("-").map(Number);
  const clampedDate = (y: number) => {
    const lastDay = new Date(y, m, 0).getDate();
    return new Date(y, m - 1, Math.min(d, lastDay));
  };
  let occStr = getLocalDateString(clampedDate(refY));
  if (occStr < refDate) occStr = getLocalDateString(clampedDate(refY + 1));
  return occStr;
};

// ── Rental Escalation Tier Helpers ────────────────────────────────────────────

export const getEffectiveRent = (p: any, yearMonth?: string): number => {
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
};

export const getCurrentTierIndex = (p: any, yearMonth?: string): number => {
  const tiers = p.escalationTiers;
  if (!tiers || !tiers.length || !p.agreementStart) return -1;
  const refMonth = yearMonth || today().slice(0, 7);
  const [refY, refM] = refMonth.split("-").map(Number);
  const [startY, startM] = p.agreementStart.slice(0, 7).split("-").map(Number);
  const monthsElapsed = (refY - startY) * 12 + (refM - startM);
  if (monthsElapsed < 0) return 0;
  let cumulative = 0;
  for (let i = 0; i < tiers.length; i++) {
    cumulative += Number(tiers[i].durationMonths || 12);
    if (monthsElapsed < cumulative) return i;
  }
  return tiers.length - 1;
};

export const getMonthsToNextEscalation = (p: any, yearMonth?: string): number | null => {
  const tiers = p.escalationTiers;
  if (!tiers || tiers.length < 2 || !p.agreementStart) return null;
  const refMonth = yearMonth || today().slice(0, 7);
  const [refY, refM] = refMonth.split("-").map(Number);
  const [startY, startM] = p.agreementStart.slice(0, 7).split("-").map(Number);
  const monthsElapsed = (refY - startY) * 12 + (refM - startM);
  if (monthsElapsed < 0) return null;
  let cumulative = 0;
  for (let i = 0; i < tiers.length - 1; i++) {
    cumulative += Number(tiers[i].durationMonths || 12);
    if (monthsElapsed < cumulative) return cumulative - monthsElapsed;
  }
  return null;
};

// ── End Rental Escalation Tier Helpers ────────────────────────────────────────

export const getCCDueDate = (c: any, referenceDate?: Date) => {
  // Prefer computed due date from dueDay over a stored dueDate.
  // A stored dueDate can go stale (e.g. card's dueDay changed but old dueDate was never cleared).
  // If dueDay is present, always compute the next occurrence from it.
  const now = referenceDate || new Date();
  if (c.dueDay) {
    const day = parseInt(c.dueDay, 10);
    if (!isNaN(day) && day >= 1 && day <= 31) {
      // Clamp to the last day of the target month so a dueDay of 29/30/31 doesn't
      // overflow into the following month (e.g. Feb 31 -> Mar 3) when the target
      // month is shorter (Feb, or any 30-day month).
      const clampedDate = (year: number, month: number) => {
        const lastDay = new Date(year, month + 1, 0).getDate();
        return new Date(year, month, Math.min(day, lastDay));
      };
      let d = clampedDate(now.getFullYear(), now.getMonth());
      // Compare dates only (not time-of-day): `d` is always midnight, so comparing it
      // against a full `now` timestamp made the due date roll to next month even when
      // today IS the due date (midnight < any later time today). That showed "~30 days"
      // left instead of "due today" on the actual due date.
      const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (d < nowMidnight) {
        const nextMonth = now.getMonth() + 1;
        d = clampedDate(now.getFullYear() + Math.floor(nextMonth / 12), nextMonth % 12);
      }
      return getLocalDateString(d);
    }
  }
  // Fall back to the stored dueDate only when no dueDay is set
  if (c.dueDate) return c.dueDate;
  return null;
};

export const autoCateg = (note: string): string | null => {
  if (!note) return null;
  const n = note.toLowerCase();
  const rules: [RegExp, string][] = [
    [
      /zomato|swiggy|dunzo|eatsure|domino|pizza|restaurant|cafe|dining|meal|biryani|mcdonalds|kfc|burger|blinkit.*food/i,
      "Food",
    ],
    [
      /grocery|bigbasket|jiomart|zepto|grofers|supermarket|vegetables?|fruits?|departmental/i,
      "Groceries",
    ],
    [
      /\buber\b|ola cab|rapido|auto.*rikshaw|cab ride|taxi|metro|train ticket|bus ticket|flight|airline|petrol|diesel|fuel pump/i,
      "Transport",
    ],
    [/rent|landlord|\bpg\b|hostel|accommodation/i, "Rent"],
    [
      /electricity|water bill|gas bill|internet|broadband|wifi|\bjio\b|\bairtel\b|\bbsnl\b|\bvi\b|vodafone|recharge|postpaid|prepaid/i,
      "Bills",
    ],
    [/salary|payroll|\bctc\b|bonus|incentive|appraisal|stipend/i, "Salary"],
    [
      /\bsip\b|mutual fund|stock purchase|zerodha|groww|nifty|sensex|invest|ppf deposit|nps.*contrib|demat/i,
      "Investment",
    ],
    [/\bemi\b|loan repay|hdfc.*loan|sbi.*loan|equitas/i, "EMI"],
    [
      /insurance|lic.*premium|term.*insur|policy.*premium|health.*insur|star.*health|niva.*bupa|hdfc.*ergo|bajaj.*allianz/i,
      "Insurance",
    ],
    [
      /\bsubscription\b|\brenew\b|netflix|hotstar|prime.*video|disney.*plus|spotify|amazon.*prime|zee5|sonyliv|apple.*tv|crunchyroll/i,
      "Subscription",
    ],
    [/amazon|flipkart|myntra|ajio|meesho|nykaa|snapdeal|shopping|purchase order/i, "Shopping"],
    [/doctor|hospital|pharmacy|medicine|chemist|health|apollo|max.*hosp|fortis|clinic/i, "Medical"],
    [/\bmovie\b|cinema|pvr|multiplex|bookmyshow/i, "Entertainment"],
    [/income tax|tds deposit|\bgst\b|\btax\b/i, "Tax"],
    [/neft|rtgs|imps|upi.*transfer|transfer to/i, "Transfer"],
    [/maintenance|utilities|sewage|society charge/i, "Utilities"],
  ];
  for (const [re, cat] of rules) if (re.test(n)) return cat;
  return null;
};

export const calcCAGR = (invested: number, current: number, buyDate: string): number | null => {
  if (!buyDate || invested <= 0 || current <= 0) return null;
  const msElapsed = Date.now() - new Date(buyDate).getTime();
  if (isNaN(msElapsed) || msElapsed <= 0) return null; // future date or invalid date string
  const years = msElapsed / (365.25 * 24 * 3600 * 1000);
  if (years < 0.08) return null;
  return (Math.pow(current / invested, 1 / years) - 1) * 100;
};

export const fdMaturity = (principal: number, rate: number, years: number, freq = 4) => {
  return principal * Math.pow(1 + rate / 100 / freq, freq * years);
};

export const rdMaturity = (monthly: number, rate: number, months: number) => {
  const n = 4,
    r = rate / 100;
  let total = 0;
  for (let i = 0; i < months; i++) {
    const t = (months - i) / 12;
    total += monthly * Math.pow(1 + r / n, n * t);
  }
  return total;
};

export const calcTaxNew = (income: number) => {
  // FY 2025-26 new-regime standard deduction — must be subtracted before slabbing
  // (previously omitted here, causing tax to be overstated by ~3x for a ₹13L income).
  const stdDed = 75_000;
  const taxable = Math.max(0, income - stdDed);
  let tax = 0;
  const slabs = [
    [400000, 0],
    [800000, 0.05],
    [1200000, 0.1],
    [1600000, 0.15],
    [2000000, 0.2],
    [2400000, 0.25],
    [Infinity, 0.3],
  ];
  let prev = 0;
  for (const [limit, rate] of slabs) {
    if (taxable > prev) {
      tax += (Math.min(taxable, limit) - prev) * rate;
      prev = limit;
    } else break;
  }
  // Section 87A rebate: zero tax if taxable income ≤ ₹12L
  if (taxable <= 1200000) tax = 0;
  // Marginal relief (FY 2025-26): for taxable income 12L–~13.1L, cap tax at (taxable − 12L)
  else if (taxable < 1310000) tax = Math.min(tax, taxable - 1200000);
  const cess = tax * 0.04;
  return { tax, cess, total: tax + cess };
};

export const calcTaxOld = (income: number, deductions = 0) => {
  const taxable = Math.max(0, income - deductions);
  let tax = 0;
  const slabs = [
    [250000, 0],
    [500000, 0.05],
    [1000000, 0.2],
    [Infinity, 0.3],
  ];
  let prev = 0;
  for (const [limit, rate] of slabs) {
    if (taxable > prev) {
      tax += (Math.min(taxable, limit) - prev) * rate;
      prev = limit;
    } else break;
  }
  if (taxable <= 500000) tax = 0;
  const cess = tax * 0.04;
  return { tax, cess, total: tax + cess, taxable };
};

// ── Surcharge u/s 115BAC (new) / normal slab (old) ──────────────────────────
// Applies only when gross income > ₹50L. New regime capped at 25%.
const calcSurcharge = (grossIncome: number, baseTax: number, regime: "new" | "old"): number => {
  if (grossIncome <= 5_000_000) return 0;

  // `threshold` is the surcharge slab boundary just crossed; `prevRate` is the
  // rate that applied at/below that threshold (used for marginal relief below).
  let threshold: number;
  let prevRate: number;
  let rate: number;
  if (grossIncome <= 10_000_000) {
    threshold = 5_000_000;
    prevRate = 0;
    rate = 0.1;
  } else if (grossIncome <= 20_000_000) {
    threshold = 10_000_000;
    prevRate = 0.1;
    rate = 0.15;
  } else if (grossIncome <= 50_000_000) {
    threshold = 20_000_000;
    prevRate = 0.15;
    rate = 0.25;
  } else {
    threshold = 50_000_000;
    prevRate = 0.25;
    rate = regime === "new" ? 0.25 : 0.37; // new regime surcharge capped at 25%
  }

  const uncappedTotal = baseTax * (1 + rate);

  // Statutory marginal relief: total tax+surcharge just above a threshold can
  // never exceed (tax+surcharge at the threshold) + (income beyond the
  // threshold) — i.e. crossing ₹50L/1Cr/2Cr/5Cr can never leave you worse off
  // than someone who earned exactly the threshold amount. All these
  // thresholds sit well past each regime's highest slab breakpoint (₹24L new
  // / ₹10L old), so the marginal slab rate is a flat 30% throughout this
  // range and baseTax scales linearly with income — letting us derive
  // "tax at the threshold" directly instead of re-running the slab calc.
  const MARGINAL_SLAB_RATE = 0.3;
  const baseTaxAtThreshold = baseTax - MARGINAL_SLAB_RATE * (grossIncome - threshold);
  const cappedTotal = baseTaxAtThreshold * (1 + prevRate) + (grossIncome - threshold);

  const total = Math.min(uncappedTotal, cappedTotal);
  return Math.max(0, Math.round(total - baseTax));
};

export interface SlabItem {
  label: string;
  range: string;
  rate: number;
  incomeInSlab: number;
  taxInSlab: number;
}

export interface TaxResult {
  grossIncome: number;
  stdDed: number;
  taxable: number;
  slabs: SlabItem[];
  tax: number; // slab tax before surcharge/cess
  rebateApplied: boolean;
  rebateAmount: number;
  surcharge: number;
  cess: number;
  total: number; // final net tax after all components
  effectiveRate: number; // % of gross income
}

// FY-aware new regime: handles FY 2025-26, 2024-25, 2023-24, 2020-23
export const calcTaxNewByFY = (grossIncome: number, fy: string): TaxResult => {
  const fyStart = Number((fy || getCurrentFY()).split("-")[0]) || getCurrentFYStartYear();

  let stdDed: number;
  let rawSlabs: Array<[number, number]>;
  let rebateThreshold: number; // taxable income limit for 87A
  let fullRebate: boolean; // true = zero tax entirely; false = partial rebate up to maxRebateAmt
  let maxRebateAmt: number;
  let marginalReliefThreshold: number; // income just above rebate limit gets marginal relief

  if (fyStart >= 2025) {
    // Budget 2025 — applicable FY 2025-26 onwards
    stdDed = 75_000;
    rawSlabs = [
      [400000, 0],
      [800000, 0.05],
      [1200000, 0.1],
      [1600000, 0.15],
      [2000000, 0.2],
      [2400000, 0.25],
      [Infinity, 0.3],
    ];
    rebateThreshold = 1_200_000;
    fullRebate = true;
    maxRebateAmt = 0;
    marginalReliefThreshold = 1_310_000; // ~12L + 1.1L buffer
  } else if (fyStart === 2024) {
    // FY 2024-25 (std ded ₹75K, Budget 2024 slab revision)
    stdDed = 75_000;
    rawSlabs = [
      [300000, 0],
      [700000, 0.05],
      [1000000, 0.1],
      [1200000, 0.15],
      [1500000, 0.2],
      [Infinity, 0.3],
    ];
    rebateThreshold = 700_000;
    fullRebate = false;
    maxRebateAmt = 25_000;
    marginalReliefThreshold = 770_000;
  } else if (fyStart === 2023) {
    // FY 2023-24 (std ded ₹50K)
    stdDed = 50_000;
    rawSlabs = [
      [300000, 0],
      [600000, 0.05],
      [900000, 0.1],
      [1200000, 0.15],
      [1500000, 0.2],
      [Infinity, 0.3],
    ];
    rebateThreshold = 700_000;
    fullRebate = false;
    maxRebateAmt = 25_000;
    marginalReliefThreshold = 770_000;
  } else {
    // FY 2020-21, 2021-22, 2022-23 — original new regime
    stdDed = 0;
    rawSlabs = [
      [250000, 0],
      [500000, 0.05],
      [750000, 0.1],
      [1000000, 0.15],
      [1250000, 0.2],
      [1500000, 0.25],
      [Infinity, 0.3],
    ];
    rebateThreshold = 500_000;
    fullRebate = false;
    maxRebateAmt = 12_500;
    marginalReliefThreshold = 0; // no marginal relief in early new regime
  }

  const taxable = Math.max(0, grossIncome - stdDed);
  let tax = 0;
  let prev = 0;
  const slabItems: SlabItem[] = [];

  const slabLabels: Record<number, string> = {
    0: "Exempt slab",
    0.05: "5% slab",
    0.1: "10% slab",
    0.15: "15% slab",
    0.2: "20% slab",
    0.25: "25% slab",
    0.3: "30% slab",
  };

  for (const [limit, rate] of rawSlabs) {
    if (taxable > prev) {
      const incomeInSlab = Math.min(taxable, limit) - prev;
      const taxInSlab = incomeInSlab * rate;
      tax += taxInSlab;
      slabItems.push({
        label: slabLabels[rate] || `${(rate * 100).toFixed(0)}% slab`,
        range:
          limit === Infinity
            ? `Above ₹${(prev / 100000).toFixed(0)}L`
            : `₹${(prev / 100000).toFixed(0)}L – ₹${(limit / 100000).toFixed(0)}L`,
        rate,
        incomeInSlab,
        taxInSlab,
      });
      prev = limit;
    } else {
      // Still add the slab to show it exists, with 0 income
      slabItems.push({
        label: slabLabels[rate] || `${(rate * 100).toFixed(0)}% slab`,
        range:
          limit === Infinity
            ? `Above ₹${(prev / 100000).toFixed(0)}L`
            : `₹${(prev / 100000).toFixed(0)}L – ₹${(limit / 100000).toFixed(0)}L`,
        rate,
        incomeInSlab: 0,
        taxInSlab: 0,
      });
      break;
    }
  }

  // Section 87A rebate
  let rebateApplied = false;
  let rebateAmount = 0;
  if (taxable <= rebateThreshold) {
    if (fullRebate) {
      rebateAmount = tax;
      tax = 0;
    } else {
      rebateAmount = Math.min(tax, maxRebateAmt);
      tax = Math.max(0, tax - rebateAmount);
    }
    rebateApplied = true;
  } else if (marginalReliefThreshold > 0 && taxable < marginalReliefThreshold) {
    // Marginal relief: tax capped at (taxable - rebateThreshold)
    const capped = taxable - rebateThreshold;
    if (tax > capped) {
      // Bug fix: rebateAmount was previously hardcoded to 0 here even though
      // real relief is being granted (tax is being reduced from the raw slab
      // total down to `capped`). Callers that reconstruct the pre-relief tax
      // as `tax + rebateAmount` (e.g. TaxVaultTab's slab breakdown display)
      // silently showed the already-capped tax as if it were the raw amount,
      // and then displayed a "-₹0 rebate" — or worse, TaxVaultTab.tsx's
      // `rebateAmount || tax` fallback then showed the entire post-relief
      // tax figure a second time as the "rebate", making the on-screen
      // Tax − Rebate + Cess arithmetic undercount the real total by the
      // full capped tax amount. Report the actual relief granted instead.
      rebateAmount = tax - capped;
      tax = capped;
      rebateApplied = true;
    }
  }

  const surcharge = calcSurcharge(grossIncome, tax, "new");
  const cess = Math.round((tax + surcharge) * 0.04);
  const total = tax + surcharge + cess;

  return {
    grossIncome,
    stdDed,
    taxable,
    slabs: slabItems,
    tax,
    rebateApplied,
    rebateAmount,
    surcharge,
    cess,
    total,
    effectiveRate: grossIncome > 0 ? (total / grossIncome) * 100 : 0,
  };
};

// FY-aware old regime: slabs unchanged since FY 2014-15, deductions vary
export const calcTaxOldByFY = (
  grossIncome: number,
  totalDeductions: number,
  fy: string
): TaxResult => {
  const fyStart = Number((fy || getCurrentFY()).split("-")[0]) || getCurrentFYStartYear();
  // Old regime std deduction: ₹40K (FY 2018-19 to 2019-20), ₹50K (FY 2020-21 onwards)
  const stdDed = fyStart >= 2020 ? 50_000 : 40_000;
  // totalDeductions passed in already includes stdDed (callers compute: stdDed + 80C + 80D + …)
  const taxable = Math.max(0, grossIncome - totalDeductions);

  const rawSlabs: Array<[number, number]> = [
    [250_000, 0],
    [500_000, 0.05],
    [1_000_000, 0.2],
    [Infinity, 0.3],
  ];

  let tax = 0;
  let prev = 0;
  const slabItems: SlabItem[] = [];

  for (const [limit, rate] of rawSlabs) {
    if (taxable > prev) {
      const incomeInSlab = Math.min(taxable, limit) - prev;
      const taxInSlab = incomeInSlab * rate;
      tax += taxInSlab;
      slabItems.push({
        label: rate === 0 ? "Exempt slab" : `${(rate * 100).toFixed(0)}% slab`,
        range:
          limit === Infinity
            ? `Above ₹${(prev / 100000).toFixed(0)}L`
            : `₹${(prev / 100000).toFixed(0)}L – ₹${(limit / 100000).toFixed(0)}L`,
        rate,
        incomeInSlab,
        taxInSlab,
      });
      prev = limit;
    } else {
      slabItems.push({
        label: rate === 0 ? "Exempt slab" : `${(rate * 100).toFixed(0)}% slab`,
        range:
          limit === Infinity
            ? `Above ₹${(prev / 100000).toFixed(0)}L`
            : `₹${(prev / 100000).toFixed(0)}L – ₹${(limit / 100000).toFixed(0)}L`,
        rate,
        incomeInSlab: 0,
        taxInSlab: 0,
      });
      break;
    }
  }

  // 87A rebate: max ₹12,500 for old regime; effectively zero tax if taxable ≤ 5L
  let rebateApplied = false;
  let rebateAmount = 0;
  if (taxable <= 500_000) {
    rebateAmount = Math.min(tax, 12_500);
    tax = Math.max(0, tax - rebateAmount);
    rebateApplied = true;
  }

  const surcharge = calcSurcharge(grossIncome, tax, "old");
  const cess = Math.round((tax + surcharge) * 0.04);
  const total = tax + surcharge + cess;

  return {
    grossIncome,
    stdDed,
    taxable,
    slabs: slabItems,
    tax,
    rebateApplied,
    rebateAmount,
    surcharge,
    cess,
    total,
    effectiveRate: grossIncome > 0 ? (total / grossIncome) * 100 : 0,
  };
};

// A loan's "type" is a user-editable master-data value (Settings → Loan Types),
// so this must match the exact stored string — a substring match like
// `.includes("home")` would also catch a custom type e.g. "Home Renovation Loan"
// that the user never intended to be treated as a Section 24(b) home loan.
export const isHomeLoan = (l: any): boolean => (l?.type || "").trim().toLowerCase() === "home";

// Missing `outstanding` (legacy/imported rows) is treated as "not yet paid down"
// (falls back to the original principal) rather than silently as a zero balance —
// keep this fallback identical everywhere this figure is derived.
export const loanOutstanding = (l: any): number =>
  l?.outstanding != null ? Number(l.outstanding) || 0 : Number(l?.principal || 0);

export interface AutoDetectedDeductions {
  d80C: number;
  d80C_sources: string | null;
  hra: number;
  hra_source: string | null;
  homeLoan: number;
  homeLoan_source: string | null;
}

export const getAutoDetectedDeductions = (state: any, fy: string): AutoDetectedDeductions => {
  const fyParts = (fy || getCurrentFY()).split("-");
  const fyStartYear = Number(fyParts[0]) || getCurrentFYStartYear();
  const fyStartStr = `${fyStartYear}-04-01`;
  const fyEndStr = `${fyStartYear + 1}-03-31`;

  // 80C — ELSS purchases in FY
  const elss = (state.mutualFunds || [])
    .filter(
      (m: any) =>
        (m.type || m.category || "").toUpperCase().includes("ELSS") &&
        m.buyDate &&
        m.buyDate >= fyStartStr &&
        m.buyDate <= fyEndStr
    )
    .reduce((s: number, m: any) => s + Number(m.invested || m.investedAmount || 0), 0);

  // 80C — PPF deposits in FY (ledger first, else yearly contribution)
  const ppfThisYear = (state.ppfLedger || [])
    .filter(
      (t: any) => t.date && t.date >= fyStartStr && t.date <= fyEndStr && t.type !== "withdrawal"
    )
    .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  const ppf =
    ppfThisYear > 0
      ? ppfThisYear
      : (state.ppf || []).reduce(
          (s: number, p: any) => s + Number(p.thisYearContribution || p.yearlyContribution || 0),
          0
        );

  // 80C — LIC annual premiums
  const lic = (state.lic || []).reduce((s: number, l: any) => s + Number(l.annualPremium || 0), 0);

  // 80C — EPF employee contributions in FY
  // Bug fix: this previously filtered on t.type === "employee", but no EPF
  // transaction is ever created with that type string — calculateEpfBalance()
  // (this same file) and every EPF-writing tab (InvestmentsTab, etc.) use
  // "employee_contribution" for simple entries or "monthly_contribution"
  // with an employeeShare field for passbook entries. As a result EPF
  // contributions were silently never counted toward the 80C auto-detection
  // (and thus never fed into getTaxDueForDashboard's old-regime estimate).
  const epf = (state.epf || []).reduce((s: number, e: any) => {
    const txs = (e.transactions || []).filter(
      (t: any) => t.date >= fyStartStr && t.date <= fyEndStr
    );
    const simple = txs
      .filter((t: any) => t.type === "employee_contribution")
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const passbook = txs
      .filter((t: any) => t.type === "monthly_contribution")
      .reduce((sum: number, t: any) => sum + Number(t.employeeShare || 0), 0);
    return s + simple + passbook;
  }, 0);

  const d80C_raw = elss + ppf + lic + epf;
  const d80C_sources =
    [
      elss > 0 ? `ELSS ₹${Math.round(elss).toLocaleString("en-IN")}` : null,
      ppf > 0 ? `PPF ₹${Math.round(ppf).toLocaleString("en-IN")}` : null,
      lic > 0 ? `LIC ₹${Math.round(lic).toLocaleString("en-IN")}` : null,
      epf > 0 ? `EPF ₹${Math.round(epf).toLocaleString("en-IN")}` : null,
    ]
      .filter(Boolean)
      .join(" + ") || null;

  // HRA — rent paid in FY from rented properties (user is a tenant)
  const hraPayments = (state.rentedProperties || []).reduce((s: number, p: any) => {
    return (
      s +
      (p.payments || [])
        .filter((pay: any) => pay.date && pay.date >= fyStartStr && pay.date <= fyEndStr)
        .reduce((sum: number, pay: any) => sum + Number(pay.amount || 0), 0)
    );
  }, 0);
  // Escalation-aware (via getEffectiveRent), not the flat `monthlyRent` field, which
  // goes stale the moment a property's rent escalates — AIAssistantTab.tsx's tax
  // optimizer already used this fallback; this was the one place that hadn't caught up.
  const hraMonthly = (state.rentedProperties || []).reduce(
    (s: number, p: any) => s + getEffectiveRent(p),
    0
  );
  const hra_raw = hraPayments > 0 ? hraPayments : hraMonthly > 0 ? hraMonthly * 12 : 0;
  const hra_source =
    hra_raw > 0
      ? hraPayments > 0
        ? `Rent payments logged in FY ${fyStartStr.slice(0, 4)}-${fyEndStr.slice(2, 4)}`
        : "Monthly rent × 12"
      : null;

  // Home Loan Interest — from loansTaken type "Home", approx annual interest = outstanding × rate / 100
  const homeLoanData = (state.loansTaken || [])
    .filter(isHomeLoan)
    .map((l: any) => {
      const outstanding = loanOutstanding(l);
      const rate = Number(l.rate) || 0;
      const annualInterest = Math.round((outstanding * rate) / 100);
      return { lender: l.lender || "Home Loan", annualInterest };
    });
  const homeLoan_raw = homeLoanData.reduce((s: number, l: any) => s + l.annualInterest, 0);
  const homeLoan_source =
    homeLoan_raw > 0
      ? homeLoanData.map((l: any) => l.lender).join(", ") + " (approx. interest)"
      : null;

  return {
    d80C: Math.min(d80C_raw, 150_000),
    d80C_sources,
    hra: Math.round(hra_raw),
    hra_source,
    homeLoan: Math.min(homeLoan_raw, 200_000),
    homeLoan_source,
  };
};

export const getTaxDueForDashboard = (state: any, annualIncome: number): number => {
  const fy = state.profile?.fy || getCurrentFY();
  const regime = state.profile?.regime || "new";

  if (regime === "new") {
    // Standard deduction for new regime is handled inside calcTaxNewByFY
    const taxRes = calcTaxNewByFY(annualIncome, fy);
    return taxRes.total;
  } else {
    // Old regime: standard deduction + auto-detected deductions + manual overrides
    const auto = getAutoDetectedDeductions(state, fy);
    const overrides = state.masterData?.taxDeductions?.[fy] || {};

    const d80C = overrides.d80C !== undefined ? overrides.d80C : auto.d80C;
    const d80D = overrides.d80D !== undefined ? overrides.d80D : 0;
    const hra = overrides.hra !== undefined ? overrides.hra : auto.hra;
    const homeLoan = overrides.homeLoan !== undefined ? overrides.homeLoan : auto.homeLoan;
    const nps = overrides.nps !== undefined ? overrides.nps : 0;
    const d80CCD2 = overrides.d80CCD2 !== undefined ? overrides.d80CCD2 : 0;
    const d80G = overrides.d80G !== undefined ? overrides.d80G : 0;
    const d80E = overrides.d80E !== undefined ? overrides.d80E : 0;
    const d80TTA = overrides.d80TTA !== undefined ? overrides.d80TTA : 0;

    const fyParts = fy.split("-");
    const fyStartYear = Number(fyParts[0]) || getCurrentFYStartYear();
    const stdDedOld = fyStartYear >= 2020 ? 50_000 : 40_000;

    const totalOldDeductions =
      stdDedOld +
      Math.min(d80C, 150_000) +
      Math.min(d80D, 25_000) +
      hra +
      Math.min(homeLoan, 200_000) +
      Math.min(nps, 50_000) +
      (d80CCD2 || 0) +
      (d80G || 0) +
      (d80E || 0) +
      Math.min(d80TTA || 0, 10_000);

    const taxRes = calcTaxOldByFY(annualIncome, totalOldDeductions, fy);
    return taxRes.total;
  }
};

export const calculateEpfBalance = (e: any, asOf?: string): number => {
  if (!e) return 0;
  const txs = e.transactions || [];
  const ests = e.establishments || [];

  // hasPassbook is computed from the UNFILTERED transactions — a passbook record must still
  // resolve via the passbook math (correctly returning 0 for months before its first entry),
  // rather than falling through to the static e.balance fallback just because every qualifying
  // transaction happens to be filtered out for an early asOf month.
  // Bug fix: this previously only counted "monthly_contribution"/"interest_credit"/"transfer_in"
  // as evidence of a passbook, so an account tracked purely via the simpler "employee_contribution"
  // / "employer_contribution" / "withdrawal" entry types (a normal, UI-offered way to log EPF —
  // see EPF_TX_TYPES in InvestmentsTab.tsx) had every entered transaction silently ignored in
  // favor of the stale static e.balance field. Any non-empty ledger should win over that fallback.
  const hasPassbook = txs.length > 0;

  if (!hasPassbook) {
    return Number(e.balance || 0);
  }

  const dateFilteredTxs = asOf
    ? txs.filter((t: any) => !t.date || t.date.slice(0, 7) <= asOf)
    : txs;

  // Establishments whose balance has been transferred out via Form 13 (transfer_in recorded).
  // Their individual transactions must NOT be summed — the transfer_in amount already captures them.
  const transferredOutEstIds = new Set<string>(
    dateFilteredTxs
      .filter((x: any) => x.type === "transfer_in" && x.fromEmployer)
      .map((x: any) => {
        const est = ests.find((estItem: any) => estItem.employerName === x.fromEmployer);
        return est ? est.id : null;
      })
      .filter(Boolean)
  );

  // activeTxs = everything except transactions explicitly tagged to transferred-out establishments
  const activeTxs = dateFilteredTxs.filter(
    (t: any) => !t.estId || !transferredOutEstIds.has(t.estId)
  );

  const byType = (type: string) =>
    activeTxs
      .filter((x: any) => x.type === type)
      .reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
  const monthlyRows = activeTxs.filter((x: any) => x.type === "monthly_contribution");
  const interestRows = activeTxs.filter((x: any) => x.type === "interest_credit");
  const transferRows = dateFilteredTxs.filter((x: any) => x.type === "transfer_in"); // all date-eligible txs — all transfer_ins count

  const totalEmployee =
    byType("employee_contribution") +
    monthlyRows.reduce((s: number, x: any) => s + Number(x.employeeShare || 0), 0);
  const totalEmployer =
    byType("employer_contribution") +
    monthlyRows.reduce((s: number, x: any) => s + Number(x.employerShare || 0), 0);
  const totalPension = monthlyRows.reduce(
    (s: number, x: any) => s + Number(x.pensionShare || 0),
    0
  );
  const totalTransferIn = transferRows.reduce((s: number, x: any) => s + Number(x.amount || 0), 0);
  const totalWithdrawal = byType("withdrawal");

  // Compute closing balances per EPFO passbook column
  const empInterest = interestRows.reduce((s: number, x: any) => {
    if (x.employeeShare !== undefined) return s + Number(x.employeeShare || 0);
    return s + Number(x.amount || 0); // backward compat: old single-amount interest → employee
  }, 0);
  const erInterest = interestRows.reduce(
    (s: number, x: any) => s + Number(x.employerShare || 0),
    0
  );
  const penInterest = interestRows.reduce(
    (s: number, x: any) => s + Number(x.pensionShare || 0),
    0
  );
  // employee gets remainder: total - er - pen (handles partial splits and no-splits correctly)
  const transferInEr = transferRows.reduce(
    (s: number, x: any) => s + Number(x.employerShare || 0),
    0
  );
  const transferInPen = transferRows.reduce(
    (s: number, x: any) => s + Number(x.pensionShare || 0),
    0
  );
  const transferInEmp = totalTransferIn - transferInEr - transferInPen;

  const closingEmployee = totalEmployee + empInterest + transferInEmp;
  const closingEmployer = totalEmployer + erInterest + transferInEr;
  const closingPension = totalPension + transferInPen + penInterest;
  const closingTotal = closingEmployee + closingEmployer + closingPension - totalWithdrawal;

  return closingTotal;
};

// ── XIRR Calculation Helper ──────────────────────────────────────────────────

export interface CashFlow {
  date: Date | string;
  amount: number;
}

export const calcXIRR = (cashFlows: CashFlow[]): number | null => {
  if (!cashFlows || !Array.isArray(cashFlows)) return null;

  // Filter out zero amounts and invalid dates
  const flows = cashFlows
    .map((f) => {
      if (!f) return null;
      let d: Date;
      if (f.date instanceof Date) {
        d = f.date;
      } else {
        const clean = String(f.date || "").trim();
        if (clean === "" || clean === "null" || clean === "undefined") {
          d = new Date(NaN); // Invalid Date
        } else {
          // Parse YYYY-MM-DD cleanly in local timezone to avoid off-by-one errors from UTC conversion
          const parts = clean.split("-");
          if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            d = new Date(y, m, day);
          } else {
            d = new Date(clean);
          }
        }
      }
      return {
        date: d,
        amount: Number(f.amount),
      };
    })
    .filter(
      (f): f is { date: Date; amount: number } =>
        f !== null && !isNaN(f.date.getTime()) && f.amount !== 0
    );

  if (flows.length < 2) return null;

  // Sort chronologically
  flows.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Check signs (must have at least one positive and one negative cash flow)
  let hasPos = false;
  let hasNeg = false;
  for (const f of flows) {
    if (f.amount > 0) hasPos = true;
    if (f.amount < 0) hasNeg = true;
  }
  if (!hasPos || !hasNeg) return null;

  const t0 = flows[0].date.getTime();
  const totalDays = (flows[flows.length - 1].date.getTime() - t0) / (24 * 3600 * 1000);
  if (totalDays <= 0) return null;

  // NPV function
  const npv = (r: number): number => {
    let sum = 0;
    for (const f of flows) {
      const t = (f.date.getTime() - t0) / (365 * 24 * 3600 * 1000);
      sum += f.amount / Math.pow(1 + r, t);
    }
    return sum;
  };

  // Derivative of NPV function
  const dNpv = (r: number): number => {
    let sum = 0;
    for (const f of flows) {
      const t = (f.date.getTime() - t0) / (365 * 24 * 3600 * 1000);
      sum += (-t * f.amount) / Math.pow(1 + r, t + 1);
    }
    return sum;
  };

  // Newton-Raphson Method
  let r = 0.1; // initial guess: 10%
  const maxIter = 100;
  const tol = 1e-6;

  for (let i = 0; i < maxIter; i++) {
    const val = npv(r);
    const deriv = dNpv(r);
    if (Math.abs(deriv) < 1e-12) break; // Slope flat, fallback to bisection
    const nextR = r - val / deriv;
    if (Math.abs(nextR - r) < tol) {
      if (!isNaN(nextR) && isFinite(nextR) && nextR > -0.99) {
        return nextR * 100;
      }
    }
    r = nextR;
  }

  // Bisection Method Fallback
  let low = -0.99;
  let high = 50.0; // 5000%
  let mid = 0.0;

  let valLow = npv(low);
  let valHigh = npv(high);

  if (valLow * valHigh > 0) {
    // Try to expand search space to find a sign change
    for (let h = 50.0; h <= 1000.0; h *= 2) {
      const vh = npv(h);
      if (valLow * vh < 0) {
        high = h;
        valHigh = vh;
        break;
      }
    }
  }

  if (valLow * valHigh > 0) {
    // Try adjusting low bound
    for (let l = -0.95; l <= -0.1; l += 0.1) {
      const vl = npv(l);
      if (vl * valHigh < 0) {
        low = l;
        valLow = vl;
        break;
      }
    }
  }

  if (valLow * valHigh < 0) {
    for (let i = 0; i < 100; i++) {
      mid = (low + high) / 2;
      const val = npv(mid);
      if (Math.abs(val) < tol) {
        return mid * 100;
      }
      if (valLow * val < 0) {
        high = mid;
      } else {
        low = mid;
        valLow = val;
      }
    }
  }

  if (mid > -0.99 && !isNaN(mid) && isFinite(mid)) {
    return mid * 100;
  }

  return null;
};

// ── CSV Export Utility ─────────────────────────────────────────────────────────
export const exportArrayToCSV = (
  data: any[],
  columns: { key: string; label: string }[],
  filename: string
) => {
  if (!data || data.length === 0) return;
  const header = columns.map((c) => `"${c.label}"`).join(",");
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key];
        if (val == null) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
