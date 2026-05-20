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

export const getCCDueDate = (c: any, referenceDate?: Date) => {
  if (c.dueDate) return c.dueDate;
  if (!c.dueDay) return null;
  const now = referenceDate || new Date();
  const day = parseInt(c.dueDay, 10);
  let d = new Date(now.getFullYear(), now.getMonth(), day);
  if (d <= now) d = new Date(now.getFullYear(), now.getMonth() + 1, day);
  return getLocalDateString(d);
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
    [/amazon|flipkart|myntra|ajio|meesho|nykaa|snapdeal|shopping|purchase order/i, "Shopping"],
    [/doctor|hospital|pharmacy|medicine|chemist|health|apollo|max.*hosp|fortis|clinic/i, "Medical"],
    [/netflix|prime video|hotstar|disney|spotify|youtube.*premium|movie|cinema|pvr/i, "Entertainment"],
    [/income tax|tds deposit|\bgst\b|\btax\b/i, "Tax"],
    [/neft|rtgs|imps|upi.*transfer|transfer to/i, "Transfer"],
    [/maintenance|utilities|sewage|society charge/i, "Utilities"],
  ];
  for (const [re, cat] of rules) if (re.test(n)) return cat;
  return null;
};

export const calcCAGR = (invested: number, current: number, buyDate: string): number | null => {
  if (!buyDate || invested <= 0 || current <= 0) return null;
  const years = (Date.now() - new Date(buyDate).getTime()) / (365.25 * 24 * 3600 * 1000);
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
  if (income <= 1200000) tax = 0;
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
