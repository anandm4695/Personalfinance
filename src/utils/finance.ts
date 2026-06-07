import { STORAGE_KEY } from "./constants";

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
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
};

export const fmtINRFull = (n: number | string | null | undefined) => {
  if (n === null || n === undefined || isNaN(Number(n))) return "₹0";
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
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

export const monthsBetween = (d1: string, d2: string) => {
  const a = new Date(d1),
    b = new Date(d2);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
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
      let d = new Date(now.getFullYear(), now.getMonth(), day);
      if (d <= now) d = new Date(now.getFullYear(), now.getMonth() + 1, day);
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
    if (income > prev) {
      tax += (Math.min(income, limit) - prev) * rate;
      prev = limit;
    } else break;
  }
  // Section 87A rebate: zero tax if taxable income ≤ ₹12L
  if (income <= 1200000) tax = 0;
  // Marginal relief (FY 2025-26): for income 12L–~13.1L, cap tax at (income − 12L)
  else if (income < 1500000) tax = Math.min(tax, income - 1200000);
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
  let rate: number;
  if (grossIncome <= 10_000_000) rate = 0.1;
  else if (grossIncome <= 20_000_000) rate = 0.15;
  else if (grossIncome <= 50_000_000) rate = 0.25;
  else rate = regime === "new" ? 0.25 : 0.37; // new regime surcharge capped at 25%
  return Math.round(baseTax * rate);
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
  const fyStart = Number((fy || "2025-26").split("-")[0]) || 2025;

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
      tax = capped;
      rebateApplied = true;
      rebateAmount = 0;
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
  const fyStart = Number((fy || "2025-26").split("-")[0]) || 2025;
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

export interface AutoDetectedDeductions {
  d80C: number;
  d80C_sources: string | null;
  hra: number;
  hra_source: string | null;
  homeLoan: number;
  homeLoan_source: string | null;
}

export const getAutoDetectedDeductions = (state: any, fy: string): AutoDetectedDeductions => {
  const fyParts = (fy || "2025-26").split("-");
  const fyStartYear = Number(fyParts[0]) || 2025;
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
          (s: number, p: any) => s + Number(p.yearlyContribution || p.annualContribution || 0),
          0
        );

  // 80C — LIC annual premiums
  const lic = (state.lic || []).reduce((s: number, l: any) => s + Number(l.annualPremium || 0), 0);

  // 80C — EPF employee contributions in FY
  const epf = (state.epf || []).reduce((s: number, e: any) => {
    return (
      s +
      (e.transactions || [])
        .filter((t: any) => t.type === "employee" && t.date >= fyStartStr && t.date <= fyEndStr)
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)
    );
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
  const hraMonthly = (state.rentedProperties || []).reduce(
    (s: number, p: any) => s + Number(p.monthlyRent || 0),
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
    .filter((l: any) => (l.type || "").toLowerCase() === "home")
    .map((l: any) => {
      const outstanding = Number(l.outstanding) || 0;
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
  const fy = state.profile?.fy || "2025-26";
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
    const fyStartYear = Number(fyParts[0]) || 2025;
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
