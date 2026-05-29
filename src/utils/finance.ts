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
  return (
    (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  );
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
    [/zomato|swiggy|dunzo|eatsure|domino|pizza|restaurant|cafe|dining|meal|biryani|mcdonalds|kfc|burger|blinkit.*food/i, "Food"],
    [/grocery|bigbasket|jiomart|zepto|grofers|supermarket|vegetables?|fruits?|departmental/i, "Groceries"],
    [/\buber\b|ola cab|rapido|auto.*rikshaw|cab ride|taxi|metro|train ticket|bus ticket|flight|airline|petrol|diesel|fuel pump/i, "Transport"],
    [/rent|landlord|\bpg\b|hostel|accommodation/i, "Rent"],
    [/electricity|water bill|gas bill|internet|broadband|wifi|\bjio\b|\bairtel\b|\bbsnl\b|\bvi\b|vodafone|recharge|postpaid|prepaid/i, "Bills"],
    [/salary|payroll|\bctc\b|bonus|incentive|appraisal|stipend/i, "Salary"],
    [/\bsip\b|mutual fund|stock purchase|zerodha|groww|nifty|sensex|invest|ppf deposit|nps.*contrib|demat/i, "Investment"],
    [/\bemi\b|loan repay|hdfc.*loan|sbi.*loan|equitas/i, "EMI"],
    [/insurance|lic.*premium|term.*insur|policy.*premium|health.*insur|star.*health|niva.*bupa|hdfc.*ergo|bajaj.*allianz/i, "Insurance"],
    [/\bsubscription\b|\brenew\b|netflix|hotstar|prime.*video|disney.*plus|spotify|amazon.*prime|zee5|sonyliv|apple.*tv|crunchyroll/i, "Subscription"],
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
  // so taxpayers just above the rebate cliff are never worse off by ₹1 extra income
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
