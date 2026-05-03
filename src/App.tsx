// @ts-nocheck
import "./styles.css";
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import {
  Wallet,
  TrendingUp,
  CreditCard,
  Target,
  Calculator,
  PieChart as PieIcon,
  Building2,
  Coins,
  Shield,
  Briefcase,
  Plus,
  Trash2,
  Download,
  Upload,
  ArrowUpRight,
  ArrowDownRight,
  IndianRupee,
  Calendar,
  AlertCircle,
  X,
  Edit3,
  FileText,
  Landmark,
  BarChart3,
  Layers,
  Receipt,
  Repeat,
  HandCoins,
  Banknote,
  LineChart as LineIcon,
  Sparkles,
  Sun,
  Moon,
  Bell,
  Settings,
  Printer,
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
  User,
  Users,
  Search,
  Activity,
  Pause,
  Play,
  Zap,
  Heart,
  TrendingDown,
  Hash,
  FileUp,
  Percent,
  List,
  LogOut,
  LayoutTemplate,
  AlignJustify,
  Pencil,
  RefreshCw,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import Auth from "./Auth";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ── THEME: all values are CSS custom-property references so they react
//    automatically when we swap --t-xxx vars on :root for dark/light mode.
const THEME = {
  ink:     "var(--t-ink)",
  paper:   "var(--t-paper)",
  accent:  "var(--t-accent)",
  gold:    "var(--t-gold)",
  sage:    "var(--t-sage)",
  rust:    "var(--t-rust)",
  muted:   "var(--t-muted)",
  line:    "var(--t-line)",
  darkInk: "var(--t-darkInk)",
};

// ── ACCENT COLOUR PALETTES ──────────────────────────────────────────────────
const ACCENT_PALETTES = {
  blue:    { light: "#4F46E5", dark: "#818CF8", label: "Indigo",         dot: "#4F46E5" },
  purple:  { light: "#7C3AED", dark: "#A78BFA", label: "Violet",        dot: "#7C3AED" },
  emerald: { light: "#059669", dark: "#34D399", label: "Emerald",       dot: "#059669" },
  amber:   { light: "#D97706", dark: "#FBBF24", label: "Amber",         dot: "#D97706" },
  rose:    { light: "#E11D48", dark: "#FB7185", label: "Rose",          dot: "#E11D48" },
  indigo:  { light: "#2563EB", dark: "#60A5FA", label: "Ocean Blue",    dot: "#2563EB" },
};
type AccentKey = keyof typeof ACCENT_PALETTES;

// ── DENSITY PRESETS ─────────────────────────────────────────────────────────
const DENSITY = {
  compact:      { cardPad: 16, gap: 12, fontSize: 13, sectionGap: 20 },
  normal:       { cardPad: 24, gap: 16, fontSize: 14, sectionGap: 32 },
  comfortable:  { cardPad: 32, gap: 24, fontSize: 15, sectionGap: 40 },
};
type DensityKey = keyof typeof DENSITY;

const LIGHT_VARS: Record<string, string> = {
  "--t-ink":     "#0F172A",
  "--t-paper":   "#F8FAFC",
  "--t-accent":  "#4F46E5",
  "--t-gold":    "#D97706",
  "--t-sage":    "#059669",
  "--t-rust":    "#DC2626",
  "--t-muted":   "#64748B",
  "--t-line":    "#E2E8F0",
  "--t-darkInk": "#FFFFFF",
};

const DARK_VARS: Record<string, string> = {
  "--t-ink":     "#E2E8F0",
  "--t-paper":   "#0B0F1A",
  "--t-accent":  "#818CF8",
  "--t-gold":    "#FBBF24",
  "--t-sage":    "#34D399",
  "--t-rust":    "#FB7185",
  "--t-muted":   "#94A3B8",
  "--t-line":    "#1E293B",
  "--t-darkInk": "#0F172A",
};

const PIE_COLORS = [
  "#4F46E5",
  "#059669",
  "#D97706",
  "#DC2626",
  "#7C3AED",
  "#0891B2",
  "#EA580C",
  "#2563EB",
];

// ================== HELPERS ==================
const fmtINR = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "₹0";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 10000000) return `${sign}₹${(abs / 10000000).toFixed(2)}Cr`;
  if (abs >= 100000) return `${sign}₹${(abs / 100000).toFixed(2)}L`;
  if (abs >= 1000) return `${sign}₹${(abs / 1000).toFixed(1)}K`;
  return `${sign}₹${abs.toFixed(0)}`;
};
const fmtINRFull = (n) => {
  if (n === null || n === undefined || isNaN(n)) return "₹0";
  return `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};
const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => new Date().toISOString().slice(0, 10);
const monthsBetween = (d1, d2) => {
  const a = new Date(d1),
    b = new Date(d2);
  return (
    (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth())
  );
};
// Computes the next upcoming due date for a CC from its dueDay (day of month)
const getCCDueDate = (c) => {
  if (c.dueDate) return c.dueDate;
  if (!c.dueDay) return null;
  const now = new Date();
  const day = parseInt(c.dueDay, 10);
  let d = new Date(now.getFullYear(), now.getMonth(), day);
  if (d <= now) d = new Date(now.getFullYear(), now.getMonth() + 1, day);
  return d.toISOString().slice(0, 10);
};

// Auto-categorise transactions from note text
const autoCateg = (note: string): string | null => {
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

// Annualised CAGR from invested cost to current value over time since buyDate
const calcCAGR = (invested: number, current: number, buyDate: string): number | null => {
  if (!buyDate || invested <= 0 || current <= 0) return null;
  const years = (Date.now() - new Date(buyDate).getTime()) / (365.25 * 24 * 3600 * 1000);
  if (years < 0.08) return null;
  return (Math.pow(current / invested, 1 / years) - 1) * 100;
};

// Compound interest for FD/RD/Bond maturity estimates
const fdMaturity = (principal, rate, years, freq = 4) => {
  return principal * Math.pow(1 + rate / 100 / freq, freq * years);
};
const rdMaturity = (monthly, rate, months) => {
  // RD quarterly compounding approximation
  const n = 4,
    r = rate / 100;
  let total = 0;
  for (let i = 0; i < months; i++) {
    const t = (months - i) / 12;
    total += monthly * Math.pow(1 + r / n, n * t);
  }
  return total;
};

// ================== TAX CALCULATORS (FY 2025-26) ==================
const calcTaxNew = (income) => {
  // New regime FY 25-26 slabs (post Budget 2025)
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
  // Rebate 87A up to 12L under new regime
  if (income <= 1200000) tax = 0;
  const cess = tax * 0.04;
  return { tax, cess, total: tax + cess };
};

const calcTaxOld = (income, deductions = 0) => {
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
  if (taxable <= 500000) tax = 0; // 87A old regime
  const cess = tax * 0.04;
  return { tax, cess, total: tax + cess, taxable };
};

const calcNewSlabs = (taxable) => {
  const slabs = [
    { label: "0 – ₹4L",     from: 0,       to: 400000,   rate: 0  },
    { label: "₹4L – ₹8L",   from: 400000,  to: 800000,   rate: 5  },
    { label: "₹8L – ₹12L",  from: 800000,  to: 1200000,  rate: 10 },
    { label: "₹12L – ₹16L", from: 1200000, to: 1600000,  rate: 15 },
    { label: "₹16L – ₹20L", from: 1600000, to: 2000000,  rate: 20 },
    { label: "₹20L – ₹24L", from: 2000000, to: 2400000,  rate: 25 },
    { label: "Above ₹24L",  from: 2400000, to: Infinity, rate: 30 },
  ];
  let grossTax = 0;
  const breakdown = slabs.map((s) => {
    const inSlab = Math.max(0, Math.min(taxable, s.to === Infinity ? taxable : s.to) - s.from);
    const slabTax = (inSlab * s.rate) / 100;
    grossTax += slabTax;
    return { ...s, inSlab, slabTax };
  });
  const rebate = taxable <= 1200000 ? grossTax : 0;
  const afterRebate = Math.max(0, grossTax - rebate);
  const cess = afterRebate * 0.04;
  return { breakdown, grossTax, rebate, afterRebate, cess, total: afterRebate + cess };
};

const calcOldSlabs = (taxable) => {
  const slabs = [
    { label: "0 – ₹2.5L",   from: 0,       to: 250000,   rate: 0  },
    { label: "₹2.5L – ₹5L", from: 250000,  to: 500000,   rate: 5  },
    { label: "₹5L – ₹10L",  from: 500000,  to: 1000000,  rate: 20 },
    { label: "Above ₹10L",  from: 1000000, to: Infinity,  rate: 30 },
  ];
  let grossTax = 0;
  const breakdown = slabs.map((s) => {
    const inSlab = Math.max(0, Math.min(taxable, s.to === Infinity ? taxable : s.to) - s.from);
    const slabTax = (inSlab * s.rate) / 100;
    grossTax += slabTax;
    return { ...s, inSlab, slabTax };
  });
  const rebate = taxable <= 500000 ? grossTax : 0;
  const afterRebate = Math.max(0, grossTax - rebate);
  const cess = afterRebate * 0.04;
  return { breakdown, grossTax, rebate, afterRebate, cess, total: afterRebate + cess };
};

// ================== STORAGE ==================
const STORAGE_KEY = "finance_dashboard_v1";
const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const saveStateLocal = (s: any) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...s, _ts: Date.now() })); } catch {}
};

const PROFILES = [
  { id: "self", name: "Self" },
  { id: "wife", name: "Wife" },
  { id: "daughter", name: "Daughter" },
  { id: "huf", name: "HUF" }
];

const OwnerBadge = ({ owner }: { owner?: string }) => {
  if (!owner) return null;
  const p = PROFILES.find(x => x.id === owner);
  if (!p) return null;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", background: "color-mix(in srgb, var(--t-accent) 12%, transparent)", color: "var(--t-accent)", padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
      {p.name}
    </div>
  );
};

const DEFAULT_STATE = (() => {
  const d = new Date();
  const ym = d.toISOString().slice(0, 7);
  const lastM = new Date(new Date(d).setMonth(d.getMonth() - 1)).toISOString().slice(0, 7);
  return {
    profile: { name: "Anand", fy: "2025-26", regime: "new" },
    bankAccounts: [
      { id: "1", owner: "self", bankName: "HDFC Bank", accountNumber: "XXXX1234", balance: "150000" },
      { id: "2", owner: "self", bankName: "SBI", accountNumber: "XXXX5678", balance: "45000" },
      { id: "3", owner: "wife", bankName: "ICICI Bank", accountNumber: "XXXX9988", balance: "80000" },
      { id: "4", owner: "huf", bankName: "Axis Bank", accountNumber: "XXXX1111", balance: "250000" }
    ],
    transactions: [
      { id: "t1", owner: "self", date: `${ym}-01`, accountId: "1", amount: "120000", type: "credit", category: "Salary", note: "Monthly Salary" },
      { id: "t2", owner: "self", date: `${ym}-05`, accountId: "1", amount: "15000", type: "debit", category: "Rent", note: "House Rent" },
      { id: "t3", owner: "self", date: `${ym}-10`, accountId: "2", amount: "8000", type: "debit", category: "Food", note: "Groceries & Dining" },
      { id: "t4", owner: "self", date: `${ym}-15`, accountId: "2", amount: "5000", type: "debit", category: "Utilities", note: "Electricity & Internet" },
      { id: "t5", owner: "self", date: `${lastM}-01`, accountId: "1", amount: "120000", type: "credit", category: "Salary", note: "Monthly Salary" },
      { id: "t6", owner: "self", date: `${lastM}-05`, accountId: "1", amount: "15000", type: "debit", category: "Rent", note: "House Rent" }
    ],
    fixedDeposits: [
      { id: "fd1", owner: "self", bank: "HDFC Bank", principal: "500000", rate: "7", years: "3", startDate: "2023-01-01", maturityDate: "2026-01-01" },
      { id: "fd2", owner: "huf", bank: "Axis Bank", principal: "1000000", rate: "7.5", years: "5", startDate: "2022-06-01", maturityDate: "2027-06-01" }
    ],
    recurringDeposits: [
      { id: "rd1", owner: "self", bank: "SBI", monthly: "5000", rate: "6.5", tenureMonths: "24", startDate: "2024-01-01" },
      { id: "rd2", owner: "self", bank: "Post Office", monthly: "3000", rate: "6.8", tenureMonths: "36", startDate: "2023-06-01" },
    ],
    bonds: [
      { id: "b1", owner: "self", name: "G-Sec 7.26% 2033", type: "Government", faceValue: "100000", coupon: "7.26", maturityDate: "2033-09-15" },
      { id: "b2", owner: "self", name: "HDFC Corp Bond", type: "Corporate", faceValue: "50000", coupon: "8.5", maturityDate: "2030-03-31" },
    ],
    ppf: [
      { id: "p1", owner: "self", bank: "Post Office", balance: "350000", openDate: "2015-04-01", thisYearContribution: "150000" },
      { id: "p2", owner: "wife", bank: "SBI", balance: "200000", openDate: "2018-04-01", thisYearContribution: "50000" }
    ],
    nps: [
      { id: "n1", owner: "self", pran: "110123456789", tier: "I", balance: "250000", thisYearContribution: "50000", contributions: [
        { id: "nc1", date: "2024-04-05", selfAmount: "50000", employerAmount: "18000" },
        { id: "nc2", date: "2025-04-10", selfAmount: "50000", employerAmount: "20000" },
      ] },
    ],
    lic: [
      { id: "lic1", owner: "self", policyNumber: "12345678", planName: "Jeevan Anand", sumAssured: "1000000", annualPremium: "45000", premiumPaid: "180000", maturityDate: "2035-06-15" },
      { id: "lic2", owner: "self", policyNumber: "98765432", planName: "Money Back 20yr", sumAssured: "500000", annualPremium: "28000", premiumPaid: "84000", maturityDate: "2030-12-31" },
    ],
    termPlans: [
      { id: "tp1", owner: "self", insurer: "HDFC Life", planName: "Click 2 Protect", coverAmount: "10000000", annualPremium: "12000", expiryDate: "2055-08-01" },
      { id: "tp2", owner: "self", insurer: "LIC", planName: "Tech Term", coverAmount: "5000000", annualPremium: "8500", expiryDate: "2050-04-15" },
    ],
    mutualFunds: [
      { id: "m1", owner: "self", scheme: "Parag Parikh Flexi Cap", type: "Equity", units: "800", currentNav: "325", invested: "200000" },
      { id: "m2", owner: "self", scheme: "Nifty 50 Index Fund", type: "Index", units: "500", currentNav: "370", invested: "150000" },
      { id: "m3", owner: "daughter", scheme: "HDFC Children's Gift Fund", type: "Hybrid", units: "1000", currentNav: "150", invested: "100000" }
    ],
    stocks: [
      { id: "s1", owner: "self", symbol: "RELIANCE", dematId: "d1", qty: "20", currentPrice: "2250", avgPrice: "2500" },
      { id: "s2", owner: "self", symbol: "TCS", dematId: "d1", qty: "15", currentPrice: "3600", avgPrice: "2800" },
      { id: "s3", owner: "self", symbol: "INFY", dematId: "d2", qty: "25", currentPrice: "1580", avgPrice: "1400" },
      { id: "s4", owner: "self", symbol: "HDFCBANK", dematId: "d2", qty: "10", currentPrice: "1720", avgPrice: "1650" },
    ],
    demat: [
      { id: "d1", owner: "self", broker: "Zerodha", dpId: "IN300095", clientId: "AB1234" },
      { id: "d2", owner: "self", broker: "Groww", dpId: "IN303719", clientId: "GW5678" },
    ],
    creditCards: [
      { 
        id: "c1", 
        owner: "self",
        issuer: "Amazon Pay ICICI", 
        network: "Visa", 
        last4: "5678", 
        limit: "300000", 
        outstanding: "24000", 
        billDate: "20", 
        dueDay: "10",
        annualFee: "0",
        waiverInfo: "Life Time Free",
        helpline: "1800 102 3333",
        transactions: [
          { id: "ctx1", date: `${ym}-05`, merchant: "Amazon.in", amount: "1200", category: "Shopping" },
          { id: "ctx2", date: `${ym}-12`, merchant: "Swiggy", amount: "450", category: "Food" }
        ]
      }
    ],
    prepaidCards: [],
    loansTaken: [
      { id: "l1", owner: "self", lender: "HDFC Bank", type: "Car", principal: "800000", outstanding: "550000", emi: "18000", rate: "8.5", monthsRemaining: "36" }
    ],
    loansGiven: [],
    subscriptions: [
      { id: "sub1", owner: "self", name: "Netflix", amount: "649", cycle: "monthly", renewalDate: `${ym}-28` },
      { id: "sub2", owner: "self", name: "Amazon Prime", amount: "1499", cycle: "yearly", renewalDate: `${ym}-30` }
    ],
    goals: [
      { id: "g1", owner: "self", name: "Emergency Fund", category: "Emergency Fund", targetAmount: "600000", currentAmount: "400000", priority: "High", startDate: "2024-01-01", targetDate: "2025-12-31" },
      { id: "g2", owner: "daughter", name: "College Fund", category: "Education", targetAmount: "2000000", currentAmount: "250000", priority: "Medium", startDate: "2024-06-01", targetDate: "2030-06-01" }
    ],
    income: [
      { id: "i1", owner: "self", source: "Salary", category: "Salary", amount: "1440000", date: `${ym}-01` }
    ],
    taxPayments: [],
    budgets: [
      { id: "b1", owner: "self", category: "Food", monthly: "10000" },
      { id: "b2", owner: "self", category: "Rent", monthly: "15000" },
      { id: "b3", owner: "self", category: "Transport", monthly: "3000" },
      { id: "b4", owner: "self", category: "Entertainment", monthly: "2000" },
    ],
    reminders: [],
    netWorthHistory: [],
    sips: [
      { id: "sip1", owner: "self", scheme: "Parag Parikh Flexi Cap", fundType: "Equity", amount: "5000", frequency: "monthly", startDate: "2023-01-01", totalInstallments: "36" },
      { id: "sip2", owner: "self", scheme: "Nifty 50 Index Fund", fundType: "Index", amount: "3000", frequency: "monthly", startDate: "2022-07-01", totalInstallments: "60" },
      { id: "sip3", owner: "self", scheme: "HDFC Hybrid Equity", fundType: "Hybrid", amount: "2000", frequency: "monthly", startDate: "2024-01-01", totalInstallments: "24" },
    ],
  };
})();

// ================== MAIN APP ==================
export default function FinanceDashboard() {
  const [state, setState] = useState(() => {
    const saved = loadState();
    return saved ? { ...DEFAULT_STATE, ...saved } : DEFAULT_STATE;
  });
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("analytics");
  const [subTab, setSubTab] = useState(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try { return localStorage.getItem("finance-theme") === "dark"; } catch { return false; }
  });
  const [accentKey, setAccentKey] = useState<AccentKey>(() => {
    try { return (localStorage.getItem("finance-accent") as AccentKey) || "blue"; } catch { return "blue"; }
  });
  const [density, setDensity] = useState<DensityKey>(() => {
    try { return (localStorage.getItem("finance-density") as DensityKey) || "normal"; } catch { return "normal"; }
  });
  const [sidebarNav, setSidebarNav] = useState<boolean>(() => {
    try { return localStorage.getItem("finance-sidebar") === "true"; } catch { return false; }
  });
  const [radiusKey, setRadiusKey] = useState<string>(() => {
    try { return localStorage.getItem("finance-radius") || "modern"; } catch { return "modern"; }
  });
  const [fontKey, setFontKey] = useState<string>(() => {
    try { return localStorage.getItem("finance-font") || "inter"; } catch { return "inter"; }
  });
  const [bgStyle, setBgStyle] = useState<string>(() => {
    try { return localStorage.getItem("finance-bg") || "plain"; } catch { return "plain"; }
  });
  const [activeProfile, setActiveProfile] = useState<string>("all");
  const [animSpeed, setAnimSpeed] = useState<string>(() => {
    try { return localStorage.getItem("finance-anim") || "smooth"; } catch { return "smooth"; }
  });
  const [chartStyle, setChartStyle] = useState<string>(() => {
    try { return localStorage.getItem("finance-chart") || "monotone"; } catch { return "monotone"; }
  });
  const [session, setSession] = useState<any>(null);
  const [toasts, setToasts] = useState<{id:string;msg:string;type:string}[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{message:string;onConfirm:()=>void}|null>(null);
  const showToast = useCallback((msg: string, type = "success") => {
    const id = uid();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!error) setSession(session);
    }).catch(() => {});
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [fabModal, setFabModal] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);

  // Apply theme CSS vars whenever darkMode, accentKey, or other UI settings change
  useEffect(() => {
    const vars = darkMode ? DARK_VARS : LIGHT_VARS;
    const palette = ACCENT_PALETTES[accentKey] || ACCENT_PALETTES.blue;
    const d = DENSITY[density] || DENSITY.normal;
    
    const radiuses = { sharp: "4px", modern: "12px", round: "24px" };
    const fonts = { 
      inter: "'Inter', sans-serif", 
      outfit: "'Outfit', sans-serif", 
      roboto: "'Roboto', sans-serif" 
    };
    const anims = { snappy: "0.15s", smooth: "0.4s", relaxed: "0.8s" };
    
    const merged = { 
      ...vars, 
      "--t-accent": darkMode ? palette.dark : palette.light,
      "--card-pad": `${d.cardPad}px`,
      "--app-font-size": `${d.fontSize}px`,
      "--section-gap": `${d.sectionGap}px`,
      "--t-radius": radiuses[radiusKey] || "12px",
      "--t-font": fonts[fontKey] || "'Inter', sans-serif",
      "--t-transition": `${anims[animSpeed] || "0.4s"} cubic-bezier(0.4, 0, 0.2, 1)`,
      "--t-card-bg": vars["--t-darkInk"],
      "--t-card-shadow": darkMode 
        ? "0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03)" 
        : "0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.02), inset 0 1px 0 rgba(255,255,255,0.8)",
      "--t-card-blur": "none",
      "--t-card-border": `1px solid ${vars["--t-line"]}`,
    };

    Object.entries(merged).forEach(([k, v]) =>
      document.documentElement.style.setProperty(k, v)
    );
    // Drive the CSS class-based dark theme so styles.css vars activate
    document.documentElement.classList.toggle("dark-theme", darkMode);
    document.body.classList.toggle("dark-theme", darkMode);
    try {
      localStorage.setItem("finance-theme", darkMode ? "dark" : "light");
      localStorage.setItem("finance-accent", accentKey);
      localStorage.setItem("finance-density", density);
      localStorage.setItem("finance-sidebar", String(sidebarNav));
      localStorage.setItem("finance-radius", radiusKey);
      localStorage.setItem("finance-font", fontKey);
      localStorage.setItem("finance-bg", bgStyle);
      localStorage.setItem("finance-anim", animSpeed);
      localStorage.setItem("finance-chart", chartStyle);
    } catch {}
  }, [darkMode, accentKey, density, sidebarNav, radiusKey, fontKey, bgStyle, animSpeed, chartStyle]);

  // Background style (dots / mesh) injected dynamically since it depends on user setting
  useEffect(() => {
    const bgMap = {
      dots: "radial-gradient(circle, var(--t-line) 1.5px, transparent 1.5px)",
      mesh: "linear-gradient(135deg, color-mix(in srgb, var(--t-accent) 7%, transparent) 0%, transparent 100%)",
      plain: "none",
    };
    document.body.style.setProperty("background-image", bgMap[bgStyle] || "none", "important");
    document.body.style.setProperty("background-size", bgStyle === "dots" ? "24px 24px" : "auto", "important");
    document.body.style.setProperty("background-attachment", "fixed", "important");
  }, [bgStyle]);

  // Always save to localStorage on every state change (works offline + demo mode)
  useEffect(() => {
    if (!loaded) return;
    saveStateLocal(state);
  }, [state, loaded]);

  // Load from Supabase on mount (real logged-in users get cloud sync)
  useEffect(() => {
    if (!session) {
      // No session: mark loaded so saves start immediately
      setLoaded(true);
      return;
    }
    const userId = session.user?.id;
    // Demo / offline mode — skip Supabase, just use localStorage
    if (!userId || userId === "offline-user") {
      setLoaded(true);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("user_state")
          .select("data")
          .eq("user_id", userId)
          .single();
        if (data && data.data) {
          const cloudData = data.data;
          const localData = loadState();
          const cloudTs = cloudData._ts || 0;
          const localTs = localData?._ts || 0;
          // Only apply cloud data if it is strictly newer than what is already in localStorage.
          // This prevents an old Supabase snapshot from overwriting data the user added locally.
          if (cloudTs > localTs) {
            setState({ ...DEFAULT_STATE, ...cloudData });
          }
        }
      } catch (e) {
        console.error("Supabase load failed", e);
      }
      setLoaded(true);
    })();
  }, [session]);

  // Sync to Supabase on change — debounced 1 s so rapid edits don't hammer the API
  useEffect(() => {
    if (!loaded || !session) return;
    const userId = session.user?.id;
    if (!userId || userId === "offline-user") return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      try {
        const now = Date.now();
        await supabase.from("user_state").upsert({
          user_id: userId,
          data: { ...state, _ts: now },
          updated_at: new Date(now).toISOString()
        }, { onConflict: 'user_id' });
      } catch (e) {
        console.error("Supabase save failed", e);
      }
    }, 1000);
    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); };
  }, [state, loaded, session]);

  // Fire browser push notifications for reminders due within 3 days (runs once per session)
  useEffect(() => {
    if (!loaded || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const todayStr = today();
    const soon: { title: string; body: string }[] = [];
    const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - new Date(todayStr).getTime()) / 86400000);
    state.reminders.forEach((r) => {
      if (!r.date) return;
      const d = daysLeft(r.date);
      if (d >= 0 && d <= 3) soon.push({ title: r.title, body: d === 0 ? "Due today!" : `Due in ${d} day${d !== 1 ? "s" : ""}` });
    });
    state.creditCards.forEach((c) => {
      const dueDate = getCCDueDate(c);
      if (!dueDate) return;
      const d = daysLeft(dueDate);
      if (d >= 0 && d <= 3) soon.push({ title: `${c.issuer} bill due`, body: `${fmtINRFull(c.outstanding)} outstanding${d === 0 ? " — today!" : ` — ${d}d`}` });
    });
    state.subscriptions.filter((s) => s.renewalDate && !s.paused).forEach((s) => {
      const d = daysLeft(s.renewalDate);
      if (d >= 0 && d <= 3) soon.push({ title: `${s.name} renewal`, body: `${fmtINRFull(s.amount)} due${d === 0 ? " today" : ` in ${d}d`}` });
    });
    soon.forEach(({ title, body }) => {
      try { new Notification(title, { body, icon: "/favicon.ico" }); } catch {}
    });
  }, [loaded]); // intentionally omit other deps — runs once after initial load

  // Record a net-worth snapshot for the current month once per session after data loads
  useEffect(() => {
    if (!loaded) return;
    const ym = new Date().toISOString().slice(0, 7);
    setState((s) => {
      const nw = (() => {
        const cash = (s.bankAccounts || []).reduce((a, x) => a + Number(x.balance || 0), 0);
        const mf = (s.mutualFunds || []).reduce((a, x) => a + Number(x.units || 0) * Number(x.currentNav || 0), 0);
        const stocks = (s.stocks || []).reduce((a, x) => a + Number(x.qty || 0) * Number(x.currentPrice || 0), 0);
        const fd = (s.fixedDeposits || []).reduce((a, x) => a + Number(x.principal || 0), 0);
        const ppf = (s.ppf || []).reduce((a, x) => a + Number(x.balance || 0), 0);
        const nps = (s.nps || []).reduce((a, x) => a + Number(x.balance || 0), 0);
        const lic = (s.lic || []).reduce((a, x) => a + Number(x.premiumPaid || 0), 0);
        const bonds = (s.bonds || []).reduce((a, x) => a + Number(x.faceValue || 0), 0);
        const cc = (s.creditCards || []).reduce((a, x) => a + Number(x.outstanding || 0), 0);
        const loans = (s.loansTaken || []).reduce((a, x) => a + Number(x.outstanding || 0), 0);
        return cash + mf + stocks + fd + ppf + nps + lic + bonds - cc - loans;
      })();
      const history = (s.netWorthHistory || []).filter((h) => h.month !== ym);
      return { ...s, netWorthHistory: [...history, { month: ym, netWorth: nw }].slice(-36) };
    });
  }, [loaded]); // intentionally omit other deps — runs once after initial load

  const filteredState = useMemo(() => {
    if (activeProfile === "all") return state;
    const filterByOwner = (arr: any[]) => arr.filter((item) => item.owner === activeProfile);
    return {
      ...state,
      bankAccounts: filterByOwner(state.bankAccounts),
      transactions: filterByOwner(state.transactions),
      fixedDeposits: filterByOwner(state.fixedDeposits),
      recurringDeposits: filterByOwner(state.recurringDeposits),
      bonds: filterByOwner(state.bonds),
      ppf: filterByOwner(state.ppf),
      nps: filterByOwner(state.nps),
      lic: filterByOwner(state.lic),
      termPlans: filterByOwner(state.termPlans),
      mutualFunds: filterByOwner(state.mutualFunds),
      stocks: filterByOwner(state.stocks),
      demat: filterByOwner(state.demat),
      creditCards: filterByOwner(state.creditCards),
      prepaidCards: filterByOwner(state.prepaidCards),
      loansTaken: filterByOwner(state.loansTaken),
      loansGiven: filterByOwner(state.loansGiven),
      subscriptions: filterByOwner(state.subscriptions),
      goals: filterByOwner(state.goals),
      income: filterByOwner(state.income),
      taxPayments: filterByOwner(state.taxPayments),
      budgets: filterByOwner(state.budgets),
      sips: filterByOwner(state.sips)
    };
  }, [state, activeProfile]);

  // ================== COMPUTED FINANCIAL METRICS ==================
  const metrics = useMemo(() => {
    const sState = filteredState;
    const cashInBanks = sState.bankAccounts.reduce(
      (s, a) => s + Number(a.balance || 0),
      0
    );
    const fdValue = sState.fixedDeposits.reduce(
      (s, f) => s + Number(f.principal || 0),
      0
    );
    const rdValue = sState.recurringDeposits.reduce((s, r) => {
      const m = monthsBetween(r.startDate, today());
      return (
        s + Math.min(m, Number(r.tenureMonths || 0)) * Number(r.monthly || 0)
      );
    }, 0);
    const bondValue = sState.bonds.reduce(
      (s, b) => s + Number(b.faceValue || 0),
      0
    );
    const ppfValue = sState.ppf.reduce((s, p) => s + Number(p.balance || 0), 0);
    const npsValue = sState.nps.reduce((s, n) => s + Number(n.balance || 0), 0);
    const licValue = sState.lic.reduce(
      (s, l) => s + Number(l.premiumPaid || 0),
      0
    );
    const mfValue = sState.mutualFunds.reduce(
      (s, m) => s + Number(m.units || 0) * Number(m.currentNav || 0),
      0
    );
    const mfInvested = sState.mutualFunds.reduce(
      (s, m) => s + Number(m.invested || 0),
      0
    );
    const stockValue = sState.stocks.reduce(
      (s, st) => s + Number(st.qty || 0) * Number(st.currentPrice || 0),
      0
    );
    const stockInvested = sState.stocks.reduce(
      (s, st) => s + Number(st.qty || 0) * Number(st.avgPrice || 0),
      0
    );

    const loansGivenValue = sState.loansGiven.reduce(
      (s, l) => s + Number(l.outstanding || 0),
      0
    );
    const prepaidValue = sState.prepaidCards.reduce(
      (s, p) => s + Number(p.balance || 0),
      0
    );

    const ccOutstanding = sState.creditCards.reduce(
      (s, c) => s + Number(c.outstanding || 0),
      0
    );
    const loansTakenValue = sState.loansTaken.reduce(
      (s, l) => s + Number(l.outstanding || 0),
      0
    );

    const totalAssets =
      cashInBanks +
      fdValue +
      rdValue +
      bondValue +
      ppfValue +
      npsValue +
      licValue +
      mfValue +
      stockValue +
      loansGivenValue +
      prepaidValue;
    const totalLiabilities = ccOutstanding + loansTakenValue;
    const netWorth = totalAssets - totalLiabilities;

    // Income/Expense current month
    const now = new Date();
    const ym = now.toISOString().slice(0, 7);
    const monthTxns = sState.transactions.filter(
      (t) => t.date && t.date.startsWith(ym)
    );
    const monthIncome = monthTxns
      .filter((t) => t.type === "credit")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const monthExpense = monthTxns
      .filter((t) => t.type === "debit")
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    // Annual income from income ledger
    const fyStart = new Date(`${sState.profile.fy.split("-")[0]}-04-01`);
    const annualIncome = sState.income
      .filter((i) => new Date(i.date) >= fyStart)
      .reduce((s, i) => s + Number(i.amount || 0), 0);

    const subTotal = sState.subscriptions.filter(sub => !sub.paused).reduce((s, sub) => {
      const m =
        sub.cycle === "yearly"
          ? Number(sub.amount || 0) / 12
          : sub.cycle === "quarterly"
          ? Number(sub.amount || 0) / 3
          : Number(sub.amount || 0);
      return s + m;
    }, 0);

    const liquidAssets = cashInBanks + mfValue + stockValue;
    const lockedAssets = fdValue + rdValue + bondValue + ppfValue + npsValue + licValue;
    const savingsRate = monthIncome > 0 ? ((monthIncome - monthExpense) / monthIncome) * 100 : 0;
    const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;
    
    const taxDue = sState.profile.regime === "old"
      ? calcTaxOld(annualIncome).total
      : calcTaxNew(annualIncome).total;

    const expenseBreakdownMap = monthTxns
      .filter((t) => t.type === "debit")
      .reduce((acc, t) => {
        const cat = t.category || "Uncategorized";
        acc[cat] = (acc[cat] || 0) + Number(t.amount || 0);
        return acc;
      }, {});
    const expenseBreakdown = Object.keys(expenseBreakdownMap).map((k) => ({
      name: k,
      value: expenseBreakdownMap[k],
    })).sort((a, b) => b.value - a.value);

    const portfolioPerformance = [
      { name: "Mutual Funds", Invested: mfInvested, Current: mfValue },
      { name: "Stocks", Invested: stockInvested, Current: stockValue },
    ].filter(x => x.Invested > 0 || x.Current > 0);

    const totalGoalTarget = sState.goals.reduce((s, g) => s + Number(g.targetAmount || 0), 0);
    const totalGoalSaved = sState.goals.reduce((s, g) => s + Number(g.currentAmount || 0), 0);
    const totalGoalRemaining = Math.max(0, totalGoalTarget - totalGoalSaved);
    const overallGoalPct = totalGoalTarget > 0 ? (totalGoalSaved / totalGoalTarget) * 100 : 0;
    const goalsCompleted = sState.goals.filter(g => Number(g.targetAmount) > 0 && Number(g.currentAmount) >= Number(g.targetAmount)).length;

    return {
      cashInBanks,
      fdValue,
      rdValue,
      bondValue,
      ppfValue,
      npsValue,
      licValue,
      mfValue,
      mfInvested,
      stockValue,
      stockInvested,
      ccOutstanding,
      loansTakenValue,
      loansGivenValue,
      prepaidValue,
      totalAssets,
      totalLiabilities,
      netWorth,
      monthIncome,
      monthExpense,
      annualIncome,
      subTotal,
      mfPnL: mfValue - mfInvested,
      stockPnL: stockValue - stockInvested,
      liquidAssets,
      lockedAssets,
      savingsRate,
      debtToAssetRatio,
      taxDue,
      expenseBreakdown,
      portfolioPerformance,
      totalGoalTarget,
      totalGoalSaved,
      totalGoalRemaining,
      overallGoalPct,
      goalsCompleted,
    };
  }, [filteredState]);

  const assetBreakdown = useMemo(
    () =>
      [
        { name: "Bank Cash", value: metrics.cashInBanks },
        { name: "Fixed Deposits", value: metrics.fdValue },
        { name: "Recurring Deposits", value: metrics.rdValue },
        { name: "Mutual Funds", value: metrics.mfValue },
        { name: "Stocks", value: metrics.stockValue },
        { name: "PPF", value: metrics.ppfValue },
        { name: "NPS", value: metrics.npsValue },
        { name: "Bonds", value: metrics.bondValue },
        { name: "LIC", value: metrics.licValue },
        { name: "Loans Given", value: metrics.loansGivenValue },
      ].filter((x) => x.value > 0),
    [metrics]
  );

  // Monthly trend for last 12 months — uses filtered transactions to respect profile filter
  const trendData = useMemo(() => {
    const arr = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = d.toISOString().slice(0, 7);
      const label = d.toLocaleString("en-IN", { month: "short" });
      const txns = filteredState.transactions.filter(
        (t) => t.date && t.date.startsWith(ym)
      );
      const inc = txns
        .filter((t) => t.type === "credit")
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      const exp = txns
        .filter((t) => t.type === "debit")
        .reduce((s, t) => s + Number(t.amount || 0), 0);
      arr.push({ month: label, income: inc, expense: exp, net: inc - exp });
    }
    return arr;
  }, [filteredState.transactions]);

  // ================== CRUD ==================
  // ================== ALERTS CENTRE ==================
  const alerts = useMemo(() => {
    const list: { level: "error"|"warn"|"info"; title: string; detail: string; tab: string }[] = [];
    const now = new Date();
    // Over-budget categories
    const ym = now.toISOString().slice(0, 7);
    const monthSpend: Record<string, number> = {};
    state.transactions.filter((t) => t.date && t.date.startsWith(ym) && t.type === "debit").forEach((t) => {
      const cat = t.category || "Uncategorized";
      monthSpend[cat] = (monthSpend[cat] || 0) + Number(t.amount || 0);
    });
    state.budgets.forEach((b) => {
      const spent = monthSpend[b.category] || 0;
      if (spent > Number(b.monthly || 0)) {
        list.push({ level: "error", title: `${b.category} over budget`, detail: `Spent ${fmtINRFull(spent)} vs budget ${fmtINRFull(b.monthly)}`, tab: "budget" });
      }
    });
    // CC due in ≤10 days
    state.creditCards.forEach((c) => {
      const dueDate = getCCDueDate(c);
      if (dueDate) {
        const days = Math.ceil((new Date(dueDate).getTime() - now.getTime()) / 86400000);
        if (days >= 0 && days <= 5) list.push({ level: "error", title: `${c.issuer} CC due in ${days}d`, detail: `Outstanding: ${fmtINRFull(c.outstanding)}`, tab: "credit" });
        else if (days > 5 && days <= 10) list.push({ level: "warn", title: `${c.issuer} CC due in ${days}d`, detail: `Outstanding: ${fmtINRFull(c.outstanding)}`, tab: "credit" });
      }
    });
    // Goals behind schedule
    state.goals.forEach((g) => {
      const progress = Number(g.targetAmount) ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100 : 0;
      if (g.targetDate) {
        const totalM = monthsBetween(today(), g.targetDate);
        const elapsed = g.startDate ? monthsBetween(g.startDate, today()) : 0;
        const totalDuration = elapsed + totalM;
        const expectedPct = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
        if (progress < expectedPct - 10) list.push({ level: "warn", title: `Goal "${g.name}" behind schedule`, detail: `${progress.toFixed(0)}% saved, expected ${expectedPct.toFixed(0)}%`, tab: "goals" });
      }
    });
    // Advance tax upcoming (within 30 days)
    const advDates = [`${now.getFullYear()}-06-15`, `${now.getFullYear()}-09-15`, `${now.getFullYear()}-12-15`, `${now.getFullYear()}-03-15`];
    advDates.forEach((d) => {
      const days = Math.ceil((new Date(d).getTime() - now.getTime()) / 86400000);
      if (days >= 0 && days <= 30) list.push({ level: "info", title: `Advance tax due on ${d}`, detail: "Log payment in Tax Vault", tab: "tax" });
    });
    // Low emergency fund
    if (metrics.monthExpense > 0 && metrics.cashInBanks / metrics.monthExpense < 3) {
      list.push({ level: "warn", title: "Low emergency fund", detail: `Only ${(metrics.cashInBanks / metrics.monthExpense).toFixed(1)} months of expenses in bank`, tab: "banks" });
    }
    // Subscription renewals in ≤7 days
    state.subscriptions.filter((s) => s.renewalDate && !s.paused).forEach((s) => {
      const days = Math.ceil((new Date(s.renewalDate).getTime() - now.getTime()) / 86400000);
      if (days >= 0 && days <= 7) list.push({ level: "info", title: `${s.name} renews in ${days}d`, detail: fmtINRFull(s.amount), tab: "subs" });
    });
    return list;
  }, [state.transactions, state.budgets, state.creditCards, state.goals, state.subscriptions, metrics.monthExpense, metrics.cashInBanks]);

  const addItem = (key, item) =>
    setState((s) => ({ ...s, [key]: [...s[key], { id: uid(), ...item }] }));
  const removeItem = (key, id) =>
    setState((s) => ({ ...s, [key]: s[key].filter((x) => x.id !== id) }));
  const updateItem = (key, id, patch) =>
    setState((s) => ({
      ...s,
      [key]: s[key].map((x) => (x.id === id ? { ...x, ...patch } : x)),
    }));

  // ================== EXPORT / IMPORT ==================
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-backup-${today()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const importJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const input = e.target;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.bankAccounts)) {
          showToast("Invalid backup — not a valid finance export", "error");
          input.value = "";
          return;
        }
        setState({ ...DEFAULT_STATE, ...parsed });
        showToast("Backup restored successfully");
      } catch {
        showToast("Invalid backup file — check JSON format", "error");
      }
      input.value = "";
    };
    reader.readAsText(file);
  };

  const exportCSV = () => {
    const rows = [["Date", "Account", "Type", "Category", "Amount", "Note"]];
    state.transactions.forEach((t) => {
      const bank = state.bankAccounts.find((b) => b.id === t.accountId);
      rows.push([t.date || "", bank ? bank.bankName : "", t.type || "", t.category || "", t.amount || "", t.note || ""]);
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions-${today()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    setConfirmDialog({
      message: "Delete ALL data? This action cannot be undone and will clear every account, transaction, goal and setting.",
      onConfirm: () => setState(DEFAULT_STATE),
    });
  };

  // ================== TABS ==================
  const tabs = [
    { id: "analytics", label: "Dashboard", icon: PieIcon },
    { id: "banks", label: "Banks", icon: Landmark },
    { id: "investments", label: "Investments", icon: TrendingUp, children: [
      { id: "fd", label: "Fixed Deposits" },
      { id: "rd", label: "Recurring Deposits" },
      { id: "bond", label: "Bonds" },
      { id: "ppf", label: "PPF" },
      { id: "nps", label: "NPS" },
      { id: "mf", label: "Mutual Funds" },
      { id: "lic", label: "LIC" },
      { id: "term", label: "Term Plans" },
      { id: "income", label: "Interest Income" },
    ]},
    { id: "demat", label: "Demat & Stocks", icon: BarChart3 },
    { id: "credit", label: "Credit & Loans", icon: CreditCard },
    { id: "subs", label: "Subscriptions", icon: Repeat },
    { id: "sip", label: "SIP Tracker", icon: Activity },
    { id: "insurance", label: "Insurance", icon: Heart },
    { id: "goals", label: "Goals", icon: Target },
    { id: "budget", label: "Budget", icon: Wallet },
    { id: "reminders", label: "Reminders", icon: Bell },
    { id: "calculators", label: "Calculators", icon: Hash },
    { id: "tax", label: "Tax Vault", icon: Calculator },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  // Search results
  const searchResults = useMemo(() => {
    if (!search.trim() || search.length < 2) return [];
    const q = search.toLowerCase();
    const results = [];
    state.transactions.forEach((t) => {
      if ((t.note || "").toLowerCase().includes(q) || (t.category || "").toLowerCase().includes(q)) {
        results.push({ type: "Transaction", name: t.note || t.category, detail: `${t.date} · ${fmtINR(t.amount)}`, tab: "banks" });
      }
    });
    state.stocks.forEach((s) => {
      if ((s.symbol || "").toLowerCase().includes(q)) {
        results.push({ type: "Stock", name: s.symbol, detail: fmtINRFull(Number(s.qty) * Number(s.currentPrice)), tab: "demat" });
      }
    });
    state.mutualFunds.forEach((m) => {
      if ((m.scheme || "").toLowerCase().includes(q)) {
        results.push({ type: "Mutual Fund", name: m.scheme, detail: fmtINRFull(Number(m.units) * Number(m.currentNav)), tab: "investments" });
      }
    });
    state.goals.forEach((g) => {
      if ((g.name || "").toLowerCase().includes(q)) {
        results.push({ type: "Goal", name: g.name, detail: fmtINRFull(g.currentAmount) + " / " + fmtINRFull(g.targetAmount), tab: "goals" });
      }
    });
    state.subscriptions.forEach((s) => {
      if ((s.name || "").toLowerCase().includes(q)) {
        results.push({ type: "Subscription", name: s.name, detail: fmtINRFull(s.amount) + " / " + s.cycle, tab: "subs" });
      }
    });
    return results.slice(0, 8);
  }, [search, state]);

  const d = DENSITY[density] || DENSITY.normal;

  const isSupabaseConfigured = !!(process.env.REACT_APP_SUPABASE_URL && !process.env.REACT_APP_SUPABASE_URL.includes("placeholder"));

  if (!session) {
    if (!isSupabaseConfigured) {
      return (
        <div style={{
          padding: 40,
          textAlign: "center",
          background: "linear-gradient(145deg, #0F172A 0%, #1E1B4B 60%, #0B0F1A 100%)",
          color: "#F1F3F9",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          fontFamily: "'Inter', sans-serif",
        }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚙️</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: "-0.03em" }}>Setup Required</h2>
          <p style={{ color: "rgba(255,255,255,0.45)", maxWidth: 380, lineHeight: 1.6, fontSize: 14 }}>
            Please add <code style={{ background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4, color: "#818CF8" }}>REACT_APP_SUPABASE_URL</code> and{" "}
            <code style={{ background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4, color: "#818CF8" }}>REACT_APP_SUPABASE_ANON_KEY</code> to your <code style={{ background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: 4 }}>.env</code> file.
          </p>
          <button
            onClick={() => setSession({ user: { id: "offline-user" } })}
            style={{
              padding: "14px 28px",
              background: "linear-gradient(135deg, #4F46E5, #818CF8)",
              border: "none",
              borderRadius: 12,
              color: "#fff",
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
              boxShadow: "0 8px 24px rgba(79,70,229,0.35)",
              transition: "all 0.2s ease",
              marginTop: 8,
            }}
          >
            Continue in Demo Mode
          </button>
        </div>
      );
    }
    return <Auth onLogin={setSession} />;
  }

  return (
    <div
      className={darkMode ? "dark-theme" : ""}
      style={{
        minHeight: "100vh",
        background: "var(--t-paper)",
        fontFamily: "var(--t-font, 'Inter', sans-serif)",
        color: THEME.ink,
        position: "relative",
        display: sidebarNav ? "flex" : "block",
        fontSize: d.fontSize,
      }}
    >
      {/* ── SIDEBAR NAVIGATION ── */}
      {sidebarNav && (
        <aside
          style={{
            width: 280,
            background: THEME.darkInk,
            borderRight: `1px solid ${THEME.line}`,
            position: "sticky",
            top: 0,
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            zIndex: 100,
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div style={{ padding: "28px 24px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, var(--t-accent), color-mix(in srgb, var(--t-accent) 75%, #C4B5FD))", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 14px color-mix(in srgb, var(--t-accent) 35%, transparent)" }}>
                <IndianRupee size={20} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.2em", color: THEME.muted, textTransform: "uppercase", fontWeight: 600 }}>
                  Personal Finance
                </div>
                <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: "-0.02em" }}>
                  Dashboard
                </h1>
              </div>
            </div>
          </div>

          <nav style={{ flex: 1, overflowY: "auto", padding: "0 16px" }} className="no-scrollbar">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <div key={t.id}>
                  <button
                    onClick={() => { setTab(t.id); if (t.children) setSubTab(t.children[0].id); else setSubTab(null); }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      background: active ? "color-mix(in srgb, var(--t-accent) 10%, transparent)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "12px 16px",
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 4,
                      color: active ? THEME.accent : THEME.muted,
                      fontWeight: active ? 700 : 500,
                      transition: "all 0.2s",
                    }}
                  >
                    <Icon size={18} />
                    <span style={{ fontSize: 14 }}>{t.label}</span>
                    {active && !t.children && <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: THEME.accent }} />}
                  </button>
                  {active && t.children && (
                    <div style={{ marginLeft: 20, paddingLeft: 12, borderLeft: `1px solid ${THEME.line}`, marginBottom: 8 }}>
                      {t.children.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => setSubTab(child.id)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: "8px 12px",
                            borderRadius: 6,
                            display: "block",
                            fontSize: 13,
                            color: subTab === child.id ? THEME.accent : THEME.muted,
                            fontWeight: subTab === child.id ? 600 : 500,
                            transition: "all 0.2s",
                          }}
                        >
                          {child.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div style={{ padding: 24, borderTop: `1px solid ${THEME.line}` }}>
             <button
              onClick={() => setDarkMode(!darkMode)}
              style={{ ...btnGhost, width: "100%", justifyContent: "center" }}
            >
              {darkMode ? <Sun size={14} /> : <Moon size={14} />}
              {darkMode ? "Light Mode" : "Dark Mode"}
            </button>
          </div>
        </aside>
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* HEADER */}
        <header
          style={{
            borderBottom: `1px solid ${THEME.line}`,
            background: THEME.darkInk,
            position: "sticky",
            top: 0,
            zIndex: 40,
            boxShadow: darkMode
              ? "0 1px 0 rgba(255,255,255,0.03), 0 4px 20px rgba(0,0,0,0.4)"
              : "0 1px 0 rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.03)",
            backdropFilter: "blur(16px) saturate(180%)",
            WebkitBackdropFilter: "blur(16px) saturate(180%)",
          }}
        >
          <div
            style={{
              maxWidth: 1400,
              margin: "0 auto",
              padding: sidebarNav ? "16px 32px" : "20px 32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 16,
            }}
          >
            {!sidebarNav && (
              <div>
                <div style={{ fontSize: 10, letterSpacing: "0.25em", color: THEME.muted, textTransform: "uppercase", marginBottom: 4, fontWeight: 500 }}>
                  Personal Finance · FY {state.profile.fy}
                </div>
                <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: "-0.03em", color: THEME.ink, lineHeight: 1 }}>
                  Finance Dashboard
                </h1>
              </div>
            )}

            {sidebarNav && (
               <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ padding: "8px 12px", background: "color-mix(in srgb, var(--t-accent) 10%, transparent)", borderRadius: 8, color: THEME.accent, fontWeight: 700, fontSize: 13 }}>
                    {tabs.find(t => t.id === tab)?.label}
                  </div>
               </div>
            )}

            {/* GLOBAL SEARCH */}
            <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: THEME.darkInk, border: `1px solid ${THEME.line}`, borderRadius: 12, padding: "10px 14px", boxShadow: "0 2px 10px rgba(0,0,0,0.02)" }}>
                <Search size={14} style={{ color: THEME.muted, flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search everything..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setShowSearch(true); }}
                  onFocus={() => setShowSearch(true)}
                  onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                  style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, color: THEME.ink, fontFamily: "inherit", width: "100%" }}
                />
              </div>
              {showSearch && searchResults.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: THEME.darkInk, border: `1px solid ${THEME.line}`, borderRadius: 12, marginTop: 8, zIndex: 200, boxShadow: "0 12px 40px rgba(0,0,0,0.15)", overflow: "hidden" }}>
                  {searchResults.map((r, i) => (
                    <div key={`${r.tab}-${r.name}-${i}`} onMouseDown={() => { setTab(r.tab); setSearch(""); setShowSearch(false); }} style={{ padding: "12px 16px", cursor: "pointer", borderBottom: `1px solid ${THEME.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: THEME.muted }}>{r.type}</div>
                      </div>
                      <div style={{ fontSize: 12, color: THEME.accent }}>{r.detail}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PROFILE SWITCHER */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Users size={16} color={THEME.muted} />
              <select 
                style={{ ...input, padding: "8px 12px", width: "auto", minWidth: 120, fontSize: 13, borderRadius: 10, background: "transparent", borderColor: THEME.line }}
                value={activeProfile}
                onChange={e => setActiveProfile(e.target.value)}
              >
                <option value="all">All Profiles</option>
                {PROFILES.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 6, alignItems: "center", position: "relative" }}>
              {/* Bell / Alerts */}
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowAlerts((v) => !v)}
                  style={{ ...btnGhost, borderRadius: 10, padding: "9px 12px", position: "relative" }}
                  aria-label={`${alerts.length} alerts`}
                >
                  <Bell size={16} />
                  {alerts.length > 0 && (
                    <span className="notif-badge" style={{ position: "absolute", top: -5, right: -5 }}>
                      {alerts.length > 9 ? "9+" : alerts.length}
                    </span>
                  )}
                </button>
                {showAlerts && (
                  <div className="alerts-panel">
                    <div style={{ padding: "14px 16px", borderBottom: `1px solid ${THEME.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: THEME.ink }}>Alerts</div>
                      <button onClick={() => setShowAlerts(false)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, display: "flex", padding: 4, borderRadius: 6 }}>
                        <X size={14} />
                      </button>
                    </div>
                    {alerts.length === 0 ? (
                      <div style={{ padding: "24px 16px", textAlign: "center", color: THEME.muted, fontSize: 13 }}>
                        All clear — no alerts right now
                      </div>
                    ) : (
                      <div style={{ maxHeight: 340, overflowY: "auto" }}>
                        {alerts.map((a, i) => (
                          <div
                            key={`${a.tab}-${a.title}-${i}`}
                            onClick={() => { setTab(a.tab); setShowAlerts(false); }}
                            style={{
                              padding: "12px 16px",
                              cursor: "pointer",
                              borderBottom: `1px solid ${THEME.line}`,
                              display: "flex",
                              gap: 10,
                              alignItems: "flex-start",
                              transition: "background 0.15s",
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = `color-mix(in srgb, var(--t-accent) 4%, transparent)`}
                            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                          >
                            <div style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: a.level === "error" ? THEME.rust : a.level === "warn" ? THEME.gold : THEME.accent,
                              flexShrink: 0,
                              marginTop: 4,
                            }} />
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.ink, marginBottom: 2 }}>{a.title}</div>
                              <div style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.4 }}>{a.detail}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dark mode toggle */}
              {!sidebarNav && (
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  style={{ ...btnGhost, borderRadius: 10, padding: "9px 12px" }}
                  aria-label="Toggle theme"
                  title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                </button>
              )}

              <button onClick={exportJSON} style={{ ...btnGhost, display: "flex" }} title="Export backup">
                <Download size={14} />
                <span style={{ display: "none", "@media(min-width:1024px)": { display: "inline" } }}>Export</span>
              </button>

              <button
                onClick={() => setTab("settings")}
                style={{
                  ...btnGhost,
                  background: tab === "settings" ? THEME.accent : "transparent",
                  color: tab === "settings" ? "#fff" : THEME.ink,
                  borderColor: tab === "settings" ? THEME.accent : THEME.line,
                }}
                aria-label="Settings"
              >
                <Settings size={14} />
              </button>
            </div>
          </div>

          {/* TOP TAB NAV (only if not sidebar) */}
          {!sidebarNav && (
            <nav style={{ maxWidth: 1400, margin: "0 auto", padding: "0 32px", display: "flex", gap: 8, overflowX: "auto", borderTop: `1px solid ${THEME.line}`, background: THEME.darkInk }} className="no-scrollbar desktop-tab-nav">
              {tabs.map((t) => {
                const Icon = t.icon;
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setTab(t.id); if (t.children) setSubTab(t.children[0].id); else setSubTab(null); }}
                    style={{
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "16px 20px",
                      fontFamily: "inherit",
                      fontSize: 14,
                      color: active ? THEME.accent : THEME.muted,
                      borderBottom: `3px solid ${active ? THEME.accent : "transparent"}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      whiteSpace: "nowrap",
                      fontWeight: active ? 700 : 500,
                      transition: "all 0.2s",
                    }}
                  >
                    <Icon size={14} /> {t.label}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Quick Stats Bar */}
          {(() => {
            const items = [
              { label: "Net Worth", value: fmtINRFull(metrics.netWorth), color: metrics.netWorth >= 0 ? THEME.sage : THEME.rust, positive: metrics.netWorth >= 0 },
              { label: "Savings Rate", value: metrics.savingsRate.toFixed(1) + "%", color: metrics.savingsRate >= 20 ? THEME.sage : THEME.gold, positive: metrics.savingsRate >= 20 },
              { label: "Est. Tax", value: fmtINRFull(metrics.taxDue), color: metrics.taxDue > 0 ? THEME.rust : THEME.sage, positive: metrics.taxDue === 0 },
              { label: "Monthly Income", value: fmtINRFull(metrics.monthIncome), color: THEME.sage, positive: true },
              { label: "Monthly Spend", value: fmtINRFull(metrics.monthExpense), color: THEME.muted, positive: null },
            ];
            return (
              <div style={{ borderTop: `1px solid ${THEME.line}`, background: THEME.darkInk, overflowX: "auto" }} className="no-scrollbar">
                <div style={{ maxWidth: 1400, margin: "0 auto", padding: "10px 32px", display: "flex", gap: 0, alignItems: "center", minWidth: "max-content" }}>
                  {items.map(({ label, value, color }, idx) => (
                    <React.Fragment key={label}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0 20px" }}>
                        <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: THEME.muted, fontWeight: 500 }}>{label}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.01em" }}>{value}</span>
                      </div>
                      {idx < items.length - 1 && (
                        <div style={{ width: 1, height: 28, background: THEME.line, flexShrink: 0 }} />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            );
          })()}
        </header>

        <main
          style={{
            maxWidth: sidebarNav ? 1200 : 1400,
            margin: sidebarNav ? "0" : "0 auto",
            padding: sidebarNav ? "40px" : "32px",
            position: "relative",
            zIndex: 1,
            background: "var(--t-paper)",
          }}
        >
          <div key={tab} className="tab-content-enter">
            
            {tab === "banks" && <BanksTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />}
            {tab === "investments" && <InvestmentsTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} subTab={subTab} />}
            {tab === "demat" && <DematTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />}
            {tab === "credit" && <CreditTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />}
            {tab === "subs" && <SubsTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} metrics={metrics} />}
            {tab === "sip" && <SIPTrackerTab state={filteredState} addItem={addItem} removeItem={removeItem} />}
            {tab === "insurance" && <InsuranceSummaryTab state={filteredState} metrics={metrics} />}
            {tab === "goals" && <GoalsTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} metrics={metrics} />}
            {tab === "tax" && <TaxTab state={filteredState} addItem={addItem} removeItem={removeItem} metrics={metrics} setState={setState} />}
            {tab === "budget" && <BudgetTab state={filteredState} addItem={addItem} removeItem={removeItem} updateItem={updateItem} metrics={metrics} />}
            {tab === "reminders" && <RemindersTab state={filteredState} addItem={addItem} removeItem={removeItem} />}
            {tab === "analytics" && <AnalyticsDashboard metrics={metrics} state={filteredState} assetBreakdown={assetBreakdown} trendData={trendData} chartStyle={chartStyle} isVertical={sidebarNav} />}
            {tab === "calculators" && <CalculatorsTab metrics={metrics} />}
            {tab === "settings" && (
              <SettingsTab
                state={state}
                setState={setState}
                exportJSON={exportJSON}
                resetAll={resetAll}
                showToast={showToast}
                onSignOut={async () => { await supabase.auth.signOut(); setSession(null); }}
                accentKey={accentKey} setAccentKey={setAccentKey}
                density={density} setDensity={setDensity}
                sidebarNav={sidebarNav} setSidebarNav={setSidebarNav}
                radiusKey={radiusKey} setRadiusKey={setRadiusKey}
                fontKey={fontKey} setFontKey={setFontKey}
                bgStyle={bgStyle} setBgStyle={setBgStyle}
                animSpeed={animSpeed} setAnimSpeed={setAnimSpeed}
                chartStyle={chartStyle} setChartStyle={setChartStyle}
              />
            )}
          </div>
        </main>

        <footer style={{
          textAlign: "center",
          padding: "32px 20px 80px",
          color: THEME.muted,
          fontSize: 12,
          borderTop: `1px solid ${THEME.line}`,
          marginTop: 40,
          letterSpacing: "0.04em",
          lineHeight: 1.8,
        }}>
          <span style={{ fontWeight: 600 }}>Finance Dashboard</span> · Enterprise Grade · All data stored securely · FY {state.profile.fy}
        </footer>
      </div>

      {/* ── MOBILE BOTTOM NAVIGATION ── */}
      {!sidebarNav && (() => {
        const mobileNavTabs = [
          { id: "analytics",   label: "Analytics", icon: PieIcon },
          { id: "banks",       label: "Banks",     icon: Landmark },
          { id: "investments", label: "Invest",    icon: TrendingUp },
          { id: "goals",       label: "Goals",     icon: Target },
          { id: "settings",    label: "More",      icon: Settings },
        ];
        return (
          <nav className="mobile-bottom-nav" style={{ justifyContent: "space-around" }}>
            {mobileNavTabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); if (t.children) setSubTab(t.children[0].id); else setSubTab(null); }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 12px",
                    color: active ? THEME.accent : THEME.muted,
                    fontFamily: "inherit",
                    transition: "color 0.2s ease",
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <div style={{
                    width: 36,
                    height: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 10,
                    background: active ? `color-mix(in srgb, var(--t-accent) 12%, transparent)` : "transparent",
                    transition: "background 0.2s ease",
                  }}>
                    <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
                  </div>
                  <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, letterSpacing: "0.03em", lineHeight: 1 }}>{t.label}</span>
                </button>
              );
            })}
          </nav>
        );
      })()}

      {/* QUICK-ADD FAB */}
      <button
        className="fab"
        onClick={() => setFabModal(true)}
        style={{ border: "none" }}
        aria-label="Quick add transaction"
      >
        <Plus size={24} strokeWidth={3} />
      </button>

      {fabModal && (
        <QuickAddModal
          onClose={() => setFabModal(false)}
          onSave={(v) => { addItem("transactions", v); setFabModal(false); }}
          bankAccounts={state.bankAccounts}
        />
      )}

      {/* ── TOAST NOTIFICATIONS ── */}
      <ToastStack toasts={toasts} />

      {/* ── CONFIRM DIALOG ── */}
      {confirmDialog && (
        <ConfirmDialog
          message={confirmDialog.message}
          onConfirm={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}

// ================== SHARED STYLES ==================
const btnGhost = {
  background: "transparent",
  border: `1.5px solid ${THEME.line}`,
  color: THEME.ink,
  padding: "8px 14px",
  fontFamily: "var(--t-font, 'Inter', sans-serif)",
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 10,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  transition: "all 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
  letterSpacing: "-0.01em",
};
const btnSolid = {
  background: THEME.ink,
  color: THEME.darkInk,
  border: `1.5px solid ${THEME.ink}`,
  padding: "10px 20px",
  fontFamily: "var(--t-font, 'Inter', sans-serif)",
  fontSize: 14,
  fontWeight: 600,
  borderRadius: 10,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  transition: "all 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
};
const btnAccent = {
  ...btnSolid,
  background: "linear-gradient(135deg, var(--t-accent), color-mix(in srgb, var(--t-accent) 75%, #C4B5FD))",
  borderColor: "var(--t-accent)",
  color: "#FFFFFF",
  boxShadow: "0 4px 14px color-mix(in srgb, var(--t-accent) 25%, transparent), inset 0 1px 0 rgba(255,255,255,0.15)",
};

const btnOutline = {
  ...btnSolid,
  background: "transparent",
  color: "var(--t-ink)",
  border: "1.5px solid var(--t-line)",
};
const card = {
  background: "var(--t-card-bg)",
  border: "var(--t-card-border)",
  borderRadius: "var(--t-radius)",
  padding: "var(--card-pad, 24px)",
  boxShadow: "var(--t-card-shadow)",
  transition: "box-shadow 0.25s cubic-bezier(0.22,1,0.36,1), border-color 0.25s cubic-bezier(0.22,1,0.36,1)",
};
const cardDark = {
  background: "linear-gradient(145deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)",
  color: "#fff",
  borderRadius: "var(--radius-xl)",
  padding: "var(--card-pad, 24px)",
  boxShadow: "0 20px 60px rgba(15,23,42,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.06)",
  position: "relative",
  overflow: "hidden",
};

const input = {
  width: "100%",
  padding: "11px 14px",
  border: "1.5px solid var(--t-line)",
  background: "var(--t-card-bg)",
  fontFamily: "var(--t-font, 'Inter', sans-serif)",
  fontSize: "var(--app-font-size, 14px)",
  color: "var(--t-ink)",
  borderRadius: 10,
  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
  outline: "none",
};
const label = {
  display: "block",
  fontSize: 12,
  color: THEME.muted,
  marginBottom: 6,
  fontWeight: 600,
  letterSpacing: "0.03em",
  textTransform: "uppercase" as const,
};

const SectionTitle = ({ children, sub }) => (
  <div style={{ marginBottom: 28 }}>
    <h2
      style={{
        fontFamily: "var(--t-font, 'Inter', sans-serif)",
        fontSize: 22,
        fontWeight: 800,
        margin: 0,
        letterSpacing: "-0.035em",
        color: THEME.ink,
      }}
    >
      {children}
    </h2>
    {sub && (
      <div
        style={{
          fontSize: 13,
          color: THEME.muted,
          marginTop: 5,
          fontStyle: "normal",
          lineHeight: 1.5,
        }}
      >
        {sub}
      </div>
    )}
  </div>
);

// ================== TOAST + CONFIRM DIALOG ==================
function ToastStack({ toasts }: { toasts: {id:string;msg:string;type:string}[] }) {
  if (!toasts.length) return null;
  const colors = {
    success: { bg: "#F0FDF4", border: "#BBF7D0", text: "#16A34A", icon: "✓" },
    error:   { bg: "#FEF2F2", border: "#FECACA", text: "#DC2626", icon: "✕" },
    warn:    { bg: "#FFFBEB", border: "#FDE68A", text: "#D97706", icon: "!" },
    info:    { bg: "#EFF6FF", border: "#BFDBFE", text: "#2563EB", icon: "i" },
  };
  return ReactDOM.createPortal(
    <div style={{ position: "fixed", bottom: 88, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none" }}>
      {toasts.map((t) => {
        const c = colors[t.type] || colors.success;
        return (
          <div key={t.id} style={{
            background: c.bg,
            border: `1px solid ${c.border}`,
            color: c.text,
            padding: "12px 16px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            maxWidth: 340,
            fontFamily: "var(--t-font, 'Inter', sans-serif)",
            animation: "fadeSlideIn 0.25s ease",
          }}>
            <span style={{ width: 18, height: 18, borderRadius: "50%", background: c.border, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{c.icon}</span>
            {t.msg}
          </div>
        );
      })}
    </div>,
    document.body
  );
}

function ConfirmDialog({ message, onConfirm, onCancel }: { message:string; onConfirm:()=>void; onCancel:()=>void }) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);
  return ReactDOM.createPortal(
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", color: THEME.ink }}>Confirm Action</div>
          <button className="modal-close-btn" onClick={onCancel} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: THEME.ink, lineHeight: 1.6, marginBottom: 24 }}>{message}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button style={btnGhost} onClick={onCancel}>Cancel</button>
            <button
              onClick={onConfirm}
              style={{ ...btnGhost, background: "#DC2626", border: "1px solid #DC2626", color: "#fff", fontWeight: 700 }}
            >
              Yes, delete
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ================== OVERVIEW ==================

// ================== SUB-NAV COMPONENT ==================
function SubNav({ items, active, onChange, isVertical }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: THEME.muted, fontWeight: 600 }}>Categories</div>
        
      </div>
      <div style={{ 
        display: "flex", 
        flexDirection: isVertical ? "column" : "row",
        gap: 8, 
        overflowX: isVertical ? "visible" : "auto",
        paddingBottom: isVertical ? 0 : 8,
        scrollbarWidth: "none"
      }}>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: isVertical ? "12px 16px" : "8px 16px",
                background: isActive ? THEME.accent + "1A" : "rgba(255,255,255,0.03)",
                border: `1.5px solid ${isActive ? THEME.accent : "rgba(255,255,255,0.05)"}`,
                borderRadius: 99,
                color: isActive ? THEME.accent : THEME.ink,
                fontSize: 13, fontWeight: isActive ? 700 : 500,
                cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s ease",
                width: isVertical ? "100%" : "auto"
              }}
            >
              {Icon && <Icon size={14} />} {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ================== MONTHLY REPORT MODAL ==================
function MonthlyReportModal({ metrics, state, onClose }: any) {
  const now = new Date();
  const monthLabel = now.toLocaleString("en-IN", { month: "long", year: "numeric" });
  const ym = now.toISOString().slice(0, 7);
  const txns = state.transactions.filter((t) => t.date?.startsWith(ym));
  const income = txns.filter((t) => t.type === "credit").reduce((s, t) => s + Number(t.amount || 0), 0);
  const expense = txns.filter((t) => t.type === "debit").reduce((s, t) => s + Number(t.amount || 0), 0);
  const saving = income - expense;
  const savingRate = income > 0 ? ((saving / income) * 100).toFixed(1) : "0";
  const catMap: Record<string, number> = {};
  txns.filter((t) => t.type === "debit").forEach((t) => {
    const c = t.category || "Other";
    catMap[c] = (catMap[c] || 0) + Number(t.amount || 0);
  });
  const topCats = Object.entries(catMap).sort(([, a], [, b]) => b - a).slice(0, 6);
  const upcoming: { label: string; amount: number; date: string }[] = [];
  state.creditCards.forEach((c) => {
    const due = getCCDueDate(c);
    if (due) upcoming.push({ label: `${c.issuer} CC`, amount: Number(c.outstanding || 0), date: due });
  });
  state.loansTaken.forEach((l) => {
    upcoming.push({ label: `${l.lender} ${l.type} Loan`, amount: Number(l.emi || 0), date: "Monthly EMI" });
  });
  const rpt: { [key: string]: string } = {
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    color: "var(--t-ink)",
  };
  return (
    <Modal title={`Monthly Report — ${monthLabel}`} onClose={onClose}>
      <style>{`@media print { .no-print { display: none !important; } body { background: white !important; } .print-scroll { max-height: none !important; overflow: visible !important; } }`}</style>
      <div style={{ maxHeight: "72vh", overflowY: "auto" }} className="print-scroll">
        {/* Net Worth Banner */}
        <div style={{ background: "#0f172a", borderRadius: 10, padding: "16px 20px", marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 6 }}>Net Worth Snapshot</div>
          <div style={{ fontSize: 30, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em" }}>{fmtINRFull(metrics.netWorth)}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
            Assets {fmtINRFull(metrics.totalAssets)} · Liabilities {fmtINRFull(metrics.totalLiabilities)}
          </div>
        </div>

        {/* Cash Flow */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Income", value: income, color: THEME.sage },
            { label: "Expense", value: expense, color: THEME.rust },
            { label: `Saved (${savingRate}%)`, value: saving, color: saving >= 0 ? THEME.sage : THEME.rust },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ padding: 12, borderRadius: 8, background: "rgba(128,128,128,0.06)", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color }}>{fmtINRFull(value)}</div>
            </div>
          ))}
        </div>

        {/* Top Expenses */}
        {topCats.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8, fontWeight: 700 }}>Top Expenses</div>
            {topCats.map(([cat, amt], i) => (
              <div key={cat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px dashed ${THEME.line}`, fontSize: 13 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], display: "inline-block" }} />
                  {cat}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 50, height: 4, background: THEME.line, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${expense > 0 ? Math.min(100, (amt / expense) * 100) : 0}%`, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  </div>
                  <span style={{ fontWeight: 700, minWidth: 80, textAlign: "right" }}>{fmtINRFull(amt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Portfolio Snapshot */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8, fontWeight: 700 }}>Portfolio Snapshot</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {([
              ["Bank Cash", metrics.cashInBanks],
              ["Fixed Deposits", state.fixedDeposits.reduce((s, f) => s + Number(f.principal || 0), 0)],
              ["Mutual Funds", metrics.mfValue],
              ["Stocks", metrics.stockValue],
              ["PPF", metrics.ppfValue],
              ["NPS", metrics.npsValue],
            ] as [string, number][]).filter(([, v]) => v > 0).map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: "rgba(128,128,128,0.05)", borderRadius: 6, fontSize: 13 }}>
                <span style={{ color: THEME.muted }}>{label}</span>
                <span style={{ fontWeight: 700 }}>{fmtINRFull(val)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Dues */}
        {upcoming.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8, fontWeight: 700 }}>Upcoming Dues</div>
            {upcoming.map((d, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px dashed ${THEME.line}`, fontSize: 13 }}>
                <span>{d.label}</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, color: THEME.rust }}>{fmtINRFull(d.amount)}</div>
                  <div style={{ fontSize: 11, color: THEME.muted }}>{d.date}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 16 }} className="no-print">
        <button style={btnGhost} onClick={onClose}>Close</button>
        <button style={btnSolid} onClick={() => window.print()}>
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>
    </Modal>
  );
}

// ================== ANALYTICS DASHBOARD ==================
function AnalyticsDashboard({ metrics, state, assetBreakdown, trendData, chartStyle, isVertical }) {
  const [sub, setSub] = useState("dashboard");
  const [drillCat, setDrillCat] = useState(null);
  const [showReport, setShowReport] = useState(false);
  
  const subs = [
    { id: "dashboard", label: "Dashboard", icon: PieChart },
    { id: "trends", label: "Trends", icon: TrendingUp },
    { id: "spending", label: "Spending", icon: CreditCard },
    { id: "allocation", label: "Allocation", icon: Target },
    { id: "calendar", label: "Calendar", icon: Calendar },
  ];

  const netWorthTrend = useMemo(() => {
    const histMap: Record<string, number> = {};
    (state.netWorthHistory || []).forEach((h) => { histMap[h.month] = h.netWorth; });
    const now = new Date();
    return trendData.map((t, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (trendData.length - 1 - i), 1);
      const ym = d.toISOString().slice(0, 7);
      const value = histMap[ym] !== undefined
        ? histMap[ym]
        : metrics.netWorth - (trendData.length - 1 - i) * (metrics.monthIncome - metrics.monthExpense) * 0.9;
      return { month: t.month, value, real: histMap[ym] !== undefined };
    });
  }, [trendData, metrics, state.netWorthHistory]);

  const savingsData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const ym = d.toISOString().slice(0, 7);
      const label = d.toLocaleString("en-IN", { month: "short" });
      const txns = state.transactions.filter((t) => t.date && t.date.startsWith(ym));
      const inc = txns.filter((t) => t.type === "credit").reduce((s, t) => s + Number(t.amount || 0), 0);
      const exp = txns.filter((t) => t.type === "debit").reduce((s, t) => s + Number(t.amount || 0), 0);
      return { month: label, rate: parseFloat((inc > 0 ? ((inc - exp) / inc) * 100 : 0).toFixed(1)), income: inc, expense: exp };
    });
  }, [state.transactions]);

  const catTrend = useMemo(() => {
    const topCatNames = metrics.expenseBreakdown.slice(0, 4).map((c) => c.name);
    const now = new Date();
    const data = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const ym = d.toISOString().slice(0, 7);
      const label = d.toLocaleString("en-IN", { month: "short" });
      const txns = state.transactions.filter((t) => t.date && t.date.startsWith(ym) && t.type === "debit");
      const entry = { month: label };
      topCatNames.forEach((cat) => { entry[cat] = txns.filter((t) => t.category === cat).reduce((s, t) => s + Number(t.amount || 0), 0); });
      return entry;
    });
    return { data, cats: topCatNames };
  }, [state.transactions, metrics.expenseBreakdown]);

  const incomeBySrc = useMemo(() => {
    const map = {};
    state.income.forEach((i) => { map[i.source] = (map[i.source] || 0) + Number(i.amount || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [state.income]);

  const isPositive = metrics.netWorth >= 0;

  // Memoized dashboard computations (health score, dues, streak) — avoids re-running on sub-tab switches
  const dashboardData = useMemo(() => {
    let savingsScore = 0, debtScore = 0, emergencyScore = 0, divScore = 0;
    if (metrics.savingsRate >= 30) savingsScore = 25;
    else if (metrics.savingsRate >= 20) savingsScore = 18;
    else if (metrics.savingsRate >= 10) savingsScore = 10;
    else savingsScore = 4;
    if (metrics.debtToAssetRatio < 10) debtScore = 25;
    else if (metrics.debtToAssetRatio < 25) debtScore = 18;
    else if (metrics.debtToAssetRatio < 50) debtScore = 10;
    else debtScore = 4;
    const emergencyMonths = metrics.monthExpense > 0 ? metrics.cashInBanks / metrics.monthExpense : 0;
    if (emergencyMonths > 6) emergencyScore = 25;
    else if (emergencyMonths >= 3) emergencyScore = 18;
    else if (emergencyMonths >= 1) emergencyScore = 10;
    else emergencyScore = 4;
    if (state.mutualFunds.length > 0) divScore += 6;
    if (state.stocks.length > 0) divScore += 6;
    if (state.fixedDeposits.length > 0) divScore += 6;
    if (state.ppf.length > 0 || state.nps.length > 0) divScore += 7;
    const totalScore = savingsScore + debtScore + emergencyScore + divScore;
    const scoreColor = totalScore >= 75 ? THEME.sage : totalScore >= 50 ? THEME.gold : THEME.rust;
    const subScores = [
      { label: "Savings Rate", score: savingsScore, max: 25, pct: (savingsScore / 25) * 100 },
      { label: "Debt Ratio", score: debtScore, max: 25, pct: (debtScore / 25) * 100 },
      { label: "Emergency Fund", score: emergencyScore, max: 25, pct: (emergencyScore / 25) * 100 },
      { label: "Diversification", score: divScore, max: 25, pct: (divScore / 25) * 100 },
    ];
    const todayMs = new Date().getTime();
    const plus30Ms = todayMs + 30 * 86400000;
    const dues: any[] = [];
    state.creditCards.forEach((c) => {
      const dueDate = getCCDueDate(c);
      if (dueDate) {
        const ms = new Date(dueDate).getTime();
        const daysLeft = Math.ceil((ms - todayMs) / 86400000);
        if (daysLeft >= 0 && ms <= plus30Ms) dues.push({ name: (c.issuer || "Card") + " Bill", amount: Number(c.outstanding || 0), daysLeft, date: dueDate });
      }
    });
    state.subscriptions.forEach((s) => {
      if (s.renewalDate) {
        const ms = new Date(s.renewalDate).getTime();
        const daysLeft = Math.ceil((ms - todayMs) / 86400000);
        if (daysLeft >= 0 && ms <= plus30Ms) dues.push({ name: s.name + " Renewal", amount: Number(s.amount || 0), daysLeft, date: s.renewalDate });
      }
    });
    dues.sort((a, b) => a.daysLeft - b.daysLeft);
    const saved = metrics.monthIncome - metrics.monthExpense;
    const expensePct = metrics.monthIncome > 0 ? (metrics.monthExpense / metrics.monthIncome) * 100 : 0;
    const savedPct = metrics.monthIncome > 0 ? Math.max(0, (saved / metrics.monthIncome) * 100) : 0;
    let streak = 0;
    const now = new Date();
    for (let i = 1; i <= 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym2 = d.toISOString().slice(0, 7);
      const txns = state.transactions.filter((t) => t.date && t.date.startsWith(ym2));
      const inc = txns.filter((t) => t.type === "credit").reduce((s, t) => s + Number(t.amount || 0), 0);
      const exp = txns.filter((t) => t.type === "debit").reduce((s, t) => s + Number(t.amount || 0), 0);
      if (inc > exp && inc > 0) streak++; else break;
    }
    const streakEmoji = streak >= 12 ? "🏆" : streak >= 6 ? "🔥" : streak >= 3 ? "⚡" : streak >= 1 ? "✅" : "💤";
    const streakMsg = streak >= 12 ? "Incredible!" : streak >= 6 ? "On fire!" : streak >= 3 ? "Great run!" : streak >= 1 ? "Keep going!" : "Start saving";
    return { totalScore, scoreColor, subScores, dues, saved, expensePct, savedPct, streak, streakEmoji, streakMsg };
  }, [metrics, state.mutualFunds.length, state.stocks.length, state.fixedDeposits.length, state.ppf.length, state.nps.length, state.creditCards, state.subscriptions, state.transactions]);

  const { totalScore, scoreColor, subScores, dues, saved, expensePct, savedPct, streak, streakEmoji, streakMsg } = dashboardData;

  return (
    <div className="tab-content-enter">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <SubNav items={subs} active={sub} onChange={setSub} isVertical={false} />
        <button style={{ ...btnGhost, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }} onClick={() => setShowReport(true)}>
          <Printer size={14} /> Monthly Report
        </button>
      </div>
      <SectionTitle sub="Unified view of your net worth, cash flow, and spending analytics">Analytics Dashboard</SectionTitle>
      {showReport && <MonthlyReportModal metrics={metrics} state={state} onClose={() => setShowReport(false)} />}
      
      

      {sub === "dashboard" && (
        <>
          <div className="hero-card" style={{ marginBottom: 28 }}>
            <div className="hero-card-mesh" />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 20, position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: isPositive ? "#34D399" : "#FB7185", boxShadow: `0 0 10px ${isPositive ? "rgba(52,211,153,0.5)" : "rgba(251,113,133,0.5)"}` }} />
                <span style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", fontWeight: 700 }}>Net Worth Dashboard</span>
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.04em" }}>{new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
            </div>
            <div style={{ position: "relative", zIndex: 1, marginBottom: 32 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600, marginBottom: 8 }}>Total Net Worth</div>
              <div style={{ fontSize: "clamp(42px, 5.5vw, 72px)", fontWeight: 900, lineHeight: 1, letterSpacing: "-0.045em", fontVariantNumeric: "tabular-nums", color: "#fff", textShadow: "0 2px 30px rgba(0,0,0,0.3)", fontFeatureSettings: "'ss01', 'tnum'" }}>
                {fmtINRFull(metrics.netWorth)}
              </div>
              {metrics.totalAssets > 0 && (
                <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, color: isPositive ? "#34D399" : "#F87171", fontWeight: 700 }}>{isPositive ? "▲" : "▼"} {((Math.abs(metrics.netWorth) / metrics.totalAssets) * 100).toFixed(1)}% equity ratio</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>·</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>Total assets {fmtINRFull(metrics.totalAssets)}</span>
                </div>
              )}
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px 24px", position: "relative", zIndex: 1, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
              <HeroStat label="Bank Cash" value={metrics.cashInBanks} />
              <HeroStat label="Fixed Deposits" value={state.fixedDeposits.reduce((acc, curr) => acc + Number(curr.principal), 0)} />
              <HeroStat label="Mutual Funds" value={metrics.mfValue} />
              <HeroStat label="Stocks" value={metrics.stockValue} />
              <HeroStat label="PPF + NPS" value={metrics.ppfValue + metrics.npsValue} />
              <HeroStat label="Card Dues" value={metrics.ccOutstanding} negative />
              <HeroStat label="Loans Taken" value={metrics.totalLiabilities - metrics.ccOutstanding} negative />
              <HeroStat label="Subs / Mo" value={state.subscriptions.filter(s => !s.paused && s.amount).reduce((acc, curr) => acc + (curr.cycle === "yearly" ? Number(curr.amount)/12 : Number(curr.amount)), 0)} />
            </div>
          </div>

          {/* RECENT MOVEMENT */}
          <div style={{ ...card, marginBottom: 28 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted }}>Recent Movement</div>
              <div style={{ fontSize: 12, color: THEME.muted }}>{state.transactions.length} total entries</div>
            </div>
            {state.transactions.length ? (
              <div style={{ overflowX: "auto" }}>
                <div style={{ display: "grid", gap: 2, minWidth: 480 }}>
                  {state.transactions.slice(-6).reverse().map((t) => {
                    const bank = state.bankAccounts.find((b) => b.id === t.accountId);
                    return (
                      <div key={t.id} style={{ display: "grid", gridTemplateColumns: "110px 1fr 100px 140px", padding: "10px 0", borderBottom: `1px dashed ${THEME.line}`, fontSize: 14, alignItems: "center" }}>
                        <span style={{ color: THEME.muted, fontSize: 12 }}>{t.date}</span>
                        <span style={{ overflow: "hidden" }}>
                          <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.note || "—"}</div>
                          <div style={{ fontSize: 11, color: THEME.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.category} · {bank ? bank.bank : "Cash"}</div>
                        </span>
                        <span style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>{t.type}</span>
                        <span style={{ fontWeight: 700, textAlign: "right", color: t.type === "credit" ? THEME.sage : THEME.ink }}>{t.type === "credit" ? "+" : "−"} {fmtINR(t.amount)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : <EmptyHint text="No recent transactions" />}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 28 }}>
            <div className="insight-card" onClick={() => setSub("trends")} style={{ cursor: "pointer" }}>
              <div className="section-label">Savings Rate</div>
              {(() => {
                const rate = Math.min(100, Math.max(0, metrics.savingsRate));
                const r = 24, circ = 2 * Math.PI * r;
                const dash = (rate / 100) * circ;
                const col = rate >= 20 ? THEME.sage : rate >= 10 ? THEME.gold : THEME.rust;
                return (
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <svg width="60" height="60" viewBox="0 0 60 60" style={{ flexShrink: 0 }}>
                      <circle cx="30" cy="30" r={r} fill="none" stroke="var(--t-line)" strokeWidth="5" />
                      <circle cx="30" cy="30" r={r} fill="none" stroke={col} strokeWidth="5" strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.7s ease" }} />
                      <text x="30" y="35" textAnchor="middle" style={{ fontSize: 11, fontWeight: 800, fill: col, fontFamily: "inherit" }}>{rate.toFixed(0)}%</text>
                    </svg>
                    <div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: col, letterSpacing: "-0.03em", lineHeight: 1 }}>{metrics.savingsRate.toFixed(1)}%</div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 3 }}>of monthly income</div>
                      <span className={`badge ${rate >= 20 ? "badge-sage" : rate >= 10 ? "badge-gold" : "badge-rust"}`} style={{ marginTop: 6, fontSize: 10 }}>{rate >= 20 ? "On track" : rate >= 10 ? "Improving" : "Below target"}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="insight-card" onClick={() => setSub("trends")} style={{ cursor: "pointer" }}>
              <div className="section-label">Debt-to-Asset Ratio</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1, color: metrics.debtToAssetRatio > 40 ? THEME.rust : THEME.sage, marginBottom: 6 }}>{metrics.debtToAssetRatio.toFixed(1)}<span style={{ fontSize: 16, fontWeight: 600 }}>%</span></div>
              <div style={{ height: 6, background: "var(--t-line)", borderRadius: 99, overflow: "hidden", marginBottom: 8 }}><div style={{ height: "100%", width: Math.min(metrics.debtToAssetRatio, 100) + "%", background: metrics.debtToAssetRatio > 40 ? THEME.rust : THEME.sage, borderRadius: 99, transition: "width 0.7s ease" }} /></div>
              <div style={{ fontSize: 11, color: THEME.muted }}>Healthy if under 40% · Your liabilities {fmtINR(metrics.totalLiabilities)}</div>
            </div>
            <div className="insight-card" onClick={() => setSub("allocation")} style={{ cursor: "pointer" }}>
              <div className="section-label">Liquidity Score</div>
              <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", lineHeight: 1, color: THEME.accent, marginBottom: 6 }}>{metrics.totalAssets > 0 ? ((metrics.liquidAssets / metrics.totalAssets) * 100).toFixed(1) : 0}<span style={{ fontSize: 16, fontWeight: 600 }}>%</span></div>
              <div style={{ height: 6, background: "var(--t-line)", borderRadius: 99, overflow: "hidden", marginBottom: 8 }}><div style={{ height: "100%", width: (metrics.totalAssets > 0 ? Math.min((metrics.liquidAssets / metrics.totalAssets) * 100, 100) : 0) + "%", background: THEME.accent, borderRadius: 99, transition: "width 0.7s ease" }} /></div>
              <div style={{ fontSize: 11, color: THEME.muted }}>Liquid {fmtINR(metrics.liquidAssets)} · Locked {fmtINR(metrics.lockedAssets)}</div>
            </div>
            <div className="insight-card" onClick={() => setSub("trends")} style={{ cursor: "pointer" }}>
              <div className="section-label">Investment P&amp;L</div>
              {(() => {
                const pnl = metrics.mfPnL + metrics.stockPnL;
                const col = pnl >= 0 ? THEME.sage : THEME.rust;
                const invested = metrics.mfInvested + metrics.stockInvested;
                const pct = invested > 0 ? (pnl / invested) * 100 : 0;
                return (
                  <>
                    <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em", color: col, lineHeight: 1, marginBottom: 4 }}>{pnl >= 0 ? "+" : ""}{fmtINR(pnl)}</div>
                    <div style={{ fontSize: 12, color: col, fontWeight: 600, marginBottom: 6 }}>{pnl >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}% overall return</div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>Unrealised · Invested {fmtINR(invested)}</div>
                  </>
                );
              })()}
            </div>
            <div className="insight-card" onClick={() => setSub("trends")} style={{ cursor: "pointer" }}>
              <div className="section-label">Savings Streak</div>
              <div style={{ fontSize: 32, lineHeight: 1, marginBottom: 6 }}>{streakEmoji}</div>
              <div style={{ fontSize: 36, fontWeight: 900, color: streak > 0 ? THEME.sage : THEME.muted, letterSpacing: "-0.04em", lineHeight: 1 }}>{streak}</div>
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>consecutive months</div>
              <span className={`badge ${streak >= 6 ? "badge-sage" : streak >= 1 ? "badge-gold" : "badge-muted"}`} style={{ marginTop: 8, fontSize: 10 }}>{streakMsg}</span>
            </div>
          </div>

          <div style={{ ...card, marginBottom: 32 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Monthly P&L · Last 6 Months</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={trendData.slice(-6)} barGap={4}>
                <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} />
                <XAxis dataKey="month" tick={{ fill: THEME.muted, fontSize: 11 }} />
                <YAxis tick={{ fill: THEME.muted, fontSize: 11 }} tickFormatter={fmtINR} />
                <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.ink, color: THEME.paper, border: "none", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="income" name="Income" fill={THEME.sage} radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill={THEME.rust} radius={[4, 4, 0, 0]} />
                <Bar dataKey="net" name="Saved" fill={THEME.accent} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 32 }}>
            <div style={{ ...card, padding: 24 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Financial Health Score</div>
              <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20 }}>
                <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1, color: scoreColor, fontFamily: "'Inter', sans-serif" }}>{totalScore}</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: scoreColor }}>{totalScore >= 75 ? "Excellent" : totalScore >= 50 ? "Good" : "Needs Work"}</div>
                  <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>out of 100</div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                {subScores.map((s) => (
                  <div key={s.label}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                      <span style={{ color: THEME.muted }}>{s.label}</span>
                      <span style={{ fontWeight: 600 }}>{s.score}/{s.max}</span>
                    </div>
                    <div style={{ height: 5, background: THEME.line, borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: s.pct + "%", background: scoreColor, borderRadius: 3, transition: "width 0.5s" }} /></div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...card, padding: 24 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>This Month's Cash Flow</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 2 }}>Income</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: THEME.sage }}>{fmtINR(metrics.monthIncome)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 2 }}>Expenses</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: THEME.rust }}>{fmtINR(metrics.monthExpense)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 2 }}>Saved</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: saved >= 0 ? THEME.accent : THEME.rust }}>{fmtINR(Math.abs(saved))}</div>
                </div>
              </div>
              {metrics.monthIncome > 0 ? (
                <div>
                  <div style={{ height: 20, background: THEME.line, borderRadius: 10, overflow: "hidden", display: "flex" }}>
                    <div style={{ height: "100%", width: Math.min(expensePct, 100) + "%", background: THEME.rust, transition: "width 0.5s" }} />
                    <div style={{ height: "100%", width: Math.min(savedPct, 100 - Math.min(expensePct, 100)) + "%", background: THEME.sage, transition: "width 0.5s" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.muted, marginTop: 6 }}>
                    <span style={{ color: THEME.rust }}>{expensePct.toFixed(1)}% spent</span>
                    <span style={{ color: THEME.sage }}>{savedPct.toFixed(1)}% saved</span>
                  </div>
                </div>
              ) : <div style={{ fontSize: 13, color: THEME.muted, textAlign: "center", padding: "20px 0" }}>No income recorded this month</div>}
            </div>

            <div style={{ ...card, padding: 24 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Upcoming Dues (30 days)</div>
              {dues.length === 0 ? (
                <div style={{ fontSize: 13, color: THEME.muted, textAlign: "center", padding: "24px 0" }}>No dues in the next 30 days</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {dues.slice(0, 5).map((d, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: d.daysLeft <= 5 ? "rgba(217,48,37,0.06)" : "rgba(128,128,128,0.04)", borderLeft: `3px solid ${d.daysLeft <= 5 ? THEME.rust : d.daysLeft <= 10 ? THEME.gold : THEME.line}` }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{d.name}</div>
                        <div style={{ fontSize: 11, color: THEME.muted }}>{d.date}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{fmtINR(d.amount)}</div>
                        <div style={{ fontSize: 11, color: d.daysLeft <= 5 ? THEME.rust : THEME.muted }}>{d.daysLeft === 0 ? "Today" : d.daysLeft + "d"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {sub === "trends" && (
        <>
          <div style={{ ...card, marginBottom: 32 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Net Worth Timeline — Trailing 12 Months</div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={netWorthTrend}>
                <defs>
                  <linearGradient id="gNwAnalytics" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={THEME.accent} stopOpacity={0.4} /><stop offset="100%" stopColor={THEME.accent} stopOpacity={0} /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} />
                <XAxis dataKey="month" tick={{ fill: THEME.muted, fontSize: 11 }} />
                <YAxis tick={{ fill: THEME.muted, fontSize: 11 }} tickFormatter={fmtINR} />
                <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.ink, color: THEME.paper, border: "none", borderRadius: 8 }} />
                <Area type={chartStyle} dataKey="value" stroke={THEME.accent} strokeWidth={2} fill="url(#gNwAnalytics)" name="Net Worth" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 24, marginBottom: 32 }}>
            <div style={card}>
              <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Savings Rate — 6 Months</div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={savingsData}>
                  <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} />
                  <XAxis dataKey="month" tick={{ fill: THEME.muted, fontSize: 11 }} />
                  <YAxis tick={{ fill: THEME.muted, fontSize: 11 }} tickFormatter={(v) => v + "%"} />
                  <Tooltip formatter={(v) => v + "%"} contentStyle={{ background: THEME.ink, color: THEME.paper, border: "none", borderRadius: 8 }} />
                  <Bar dataKey="rate" fill={THEME.accent} radius={[4, 4, 0, 0]} name="Savings Rate %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div style={card}>
              <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Cashflow · Trailing 12 Months</div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={THEME.sage} stopOpacity={0.5} /><stop offset="100%" stopColor={THEME.sage} stopOpacity={0} /></linearGradient>
                    <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={THEME.accent} stopOpacity={0.5} /><stop offset="100%" stopColor={THEME.accent} stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} />
                  <XAxis dataKey="month" tick={{ fill: THEME.muted, fontSize: 11 }} />
                  <YAxis tick={{ fill: THEME.muted, fontSize: 11 }} tickFormatter={fmtINR} />
                  <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.ink, color: THEME.paper, border: "none", borderRadius: 8 }} />
                  <Area type={chartStyle} dataKey="income" stroke={THEME.sage} strokeWidth={2} fill="url(#gInc)" name="Income" />
                  <Area type={chartStyle} dataKey="expense" stroke={THEME.accent} strokeWidth={2} fill="url(#gExp)" name="Expense" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        
          <div style={{ ...card, marginBottom: 32 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Portfolio Performance</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={[
                { name: "Mutual Funds", current: metrics.mfValue, invested: metrics.mfInvested },
                { name: "Stocks", current: metrics.stockValue, invested: metrics.stockInvested }
              ]} barGap={4}>
                <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} />
                <XAxis dataKey="name" tick={{ fill: THEME.muted, fontSize: 11 }} />
                <YAxis tick={{ fill: THEME.muted, fontSize: 11 }} tickFormatter={fmtINRFull} />
                <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.ink, color: THEME.paper, border: "none", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="current" name="Current" fill={THEME.sage} radius={[4, 4, 0, 0]} />
                <Bar dataKey="invested" name="Invested" fill={THEME.muted} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </>
      )}

      {sub === "spending" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24, marginBottom: 32 }}>
            <div style={card}>
              <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Expense Breakup</div>
              {metrics.expenseBreakdown && metrics.expenseBreakdown.length ? (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={metrics.expenseBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                        {metrics.expenseBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.ink, color: THEME.paper, border: "none", borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginTop: 12 }}>
                    {metrics.expenseBreakdown.slice(0, 8).map((cat, i) => {
                      const total = metrics.expenseBreakdown.reduce((s, c) => s + c.value, 0);
                      const pct = total > 0 ? ((cat.value / total) * 100).toFixed(1) : "0";
                      const active = drillCat === cat.name;
                      return (
                        <div key={cat.name} onClick={() => setDrillCat(active ? null : cat.name)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: active ? PIE_COLORS[i % PIE_COLORS.length] + "22" : "rgba(128,128,128,0.06)", border: active ? `1.5px solid ${PIE_COLORS[i % PIE_COLORS.length]}` : "1.5px solid transparent", cursor: "pointer" }}>
                          <div style={{ width: 10, height: 10, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cat.name}</div>
                            <div style={{ fontSize: 11, color: THEME.muted }}>{fmtINR(cat.value)} · {pct}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : <EmptyHint text="No expense data" />}
            </div>

            <div style={card}>
              <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Top Category Spending — 6 Months</div>
              {catTrend.cats.length ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={catTrend.data}>
                    <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} />
                    <XAxis dataKey="month" tick={{ fill: THEME.muted, fontSize: 11 }} />
                    <YAxis tick={{ fill: THEME.muted, fontSize: 11 }} tickFormatter={fmtINR} />
                    <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.ink, color: THEME.paper, border: "none", borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    {catTrend.cats.map((cat, i) => (
                      <Bar key={cat} dataKey={cat} fill={PIE_COLORS[i % PIE_COLORS.length]} radius={[2, 2, 0, 0]} stackId="a" />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : <EmptyHint text="Add categorized transactions to see trends" />}
            </div>
          </div>

          <div style={{ ...card, marginBottom: 32 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Top Expenses — 6-Month Sparklines</div>
            {metrics.expenseBreakdown.length ? (
              <div style={{ display: "grid", gap: 16 }}>
                {metrics.expenseBreakdown.slice(0, 6).map((cat, i) => {
                  const maxVal = metrics.expenseBreakdown[0].value;
                  const pct = maxVal > 0 ? (cat.value / maxVal) * 100 : 0;
                  const sparkVals = catTrend.data.map((d) => d[cat.name] || 0);
                  const sparkMax = Math.max(...sparkVals, 1);
                  const W = 80, H = 28, pts = sparkVals.map((v, idx) => {
                    const x = (idx / (sparkVals.length - 1)) * W;
                    const y = H - (v / sparkMax) * H;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  }).join(" ");
                  return (
                    <div key={cat.name}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5, fontSize: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontWeight: 600 }}>{cat.name}</span>
                          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
                            <polyline points={pts} fill="none" stroke={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            {sparkVals.map((v, idx) => {
                              const x = (idx / (sparkVals.length - 1)) * W;
                              const y = H - (v / sparkMax) * H;
                              return <circle key={idx} cx={x.toFixed(1)} cy={y.toFixed(1)} r="2.5" fill={PIE_COLORS[i % PIE_COLORS.length]} />;
                            })}
                          </svg>
                        </div>
                        <span style={{ fontWeight: 700 }}>{fmtINRFull(cat.value)}</span>
                      </div>
                      <div style={{ height: 6, background: THEME.line, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: pct + "%", background: PIE_COLORS[i % PIE_COLORS.length], borderRadius: 3, transition: "width 0.5s" }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <EmptyHint text="No expense data for this month" />}
          </div>
        </>
      )}

      
      {/* RESTORED CHARTS */}
      {sub === "allocation" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
          <div style={card}>
            <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Investment Allocation</div>
            {assetBreakdown.length ? (
              <>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={assetBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={2}>
                      {assetBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.ink, color: THEME.paper, border: "none" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                  {assetBreakdown.map((a, i) => (
                    <div key={a.name} style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 10, height: 10, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span style={{ color: THEME.ink }}>{a.name}</span>
                      <span style={{ color: THEME.muted, marginLeft: "auto" }}>{((a.value / metrics.totalAssets) * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <EmptyHint text="Add bank accounts and investments to see allocation" />}
          </div>

          <div style={card}>
            <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Net Worth Breakdown</div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={[
                  { name: "Total Assets", value: metrics.totalAssets },
                  { name: "Total Liabilities", value: metrics.totalLiabilities }
                ]} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={2}>
                  <Cell fill={THEME.sage} />
                  <Cell fill={THEME.rust} />
                </Pie>
                <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.ink, color: THEME.paper, border: "none" }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
              <div style={{ background: THEME.sage + "1A", padding: 12, borderRadius: 8, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>Total Assets</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: THEME.sage }}>{fmtINRFull(metrics.totalAssets)}</div>
              </div>
              <div style={{ background: THEME.rust + "1A", padding: 12, borderRadius: 8, textAlign: "center" }}>
                <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>Total Liabilities</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: THEME.rust }}>{fmtINRFull(metrics.totalLiabilities)}</div>
              </div>
            </div>
            <div style={{ textAlign: "center", marginTop: 16, fontSize: 14, fontWeight: 600 }}>
              Net Worth: <span style={{ color: metrics.netWorth >= 0 ? THEME.sage : THEME.rust }}>{fmtINRFull(metrics.netWorth)}</span>
            </div>
          </div>
        </div>
      )}

      {sub === "calendar" && (
        (() => {
          const now = new Date();
          const year = now.getFullYear(), month = now.getMonth();
          const firstDay = new Date(year, month, 1).getDay();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const today2 = now.getDate();
          const dueDays = {};
          state.creditCards.forEach((c) => {
            const dueDate = getCCDueDate(c);
            if (dueDate) {
              const d = new Date(dueDate);
              if (d.getFullYear() === year && d.getMonth() === month) dueDays[d.getDate()] = (dueDays[d.getDate()] || []).concat({ label: c.issuer || "Card", color: THEME.rust });
            }
          });
          state.subscriptions.filter(s => !s.paused).forEach((s) => {
            if (s.renewalDate) {
              const d = new Date(s.renewalDate);
              if (d.getFullYear() === year && d.getMonth() === month) dueDays[d.getDate()] = (dueDays[d.getDate()] || []).concat({ label: s.name, color: THEME.gold });
            }
          });
          [15].forEach((day) => { if (month === 5) dueDays[day] = (dueDays[day] || []).concat({ label: "Adv. Tax", color: THEME.accent }); });
          if (month === 8 || month === 11 || month === 2) dueDays[15] = (dueDays[15] || []).concat({ label: "Adv. Tax", color: THEME.accent });
          const cells = [];
          for (let i = 0; i < firstDay; i++) cells.push(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(d);
          const monthName = now.toLocaleString("en-IN", { month: "long", year: "numeric" });
          return (
            <div style={{ ...card, marginBottom: 32 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 12 }}>Bill Calendar · {monthName}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
                {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
                  <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: THEME.muted, padding: "4px 0" }}>{d}</div>
                ))}
                {cells.map((d, i) => (
                  <div key={i} style={{ minHeight: 60, padding: 4, borderRadius: 6, fontSize: 11, background: d === today2 ? THEME.accent + "22" : dueDays[d] ? "rgba(249,171,0,0.1)" : "transparent", border: d === today2 ? `1.5px solid ${THEME.accent}` : "1px solid transparent" }}>
                    {d && <>
                      <div style={{ fontWeight: d === today2 ? 800 : 500, color: d === today2 ? THEME.accent : THEME.ink, marginBottom: 2 }}>{d}</div>
                      {(dueDays[d] || []).slice(0, 3).map((due, j) => (
                        <div key={j} style={{ fontSize: 9, color: due.color, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{due.label}</div>
                      ))}
                    </>}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 11, color: THEME.muted, marginTop: 4 }}>
                <span><span style={{ color: THEME.rust, fontWeight: 700 }}>●</span> Credit card dues</span>
                <span><span style={{ color: THEME.gold, fontWeight: 700 }}>●</span> Subscription renewals</span>
                <span><span style={{ color: THEME.accent, fontWeight: 700 }}>●</span> Advance tax</span>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}


const HeroStat = ({ label, value, negative, sage, rust }) => {
  const color = negative ? "#F87171" : sage ? "#34D399" : rust ? "#F87171" : "rgba(255,255,255,0.9)";
  return (
    <div style={{ borderLeft: `2px solid ${color}22`, paddingLeft: 12 }}>
      <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: 5, fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", lineHeight: 1 }}>
        {fmtINRFull(value)}
      </div>
    </div>
  );
};

const Tile = ({ icon: Icon, label, value, sub, subColor, negative }) => (
  <div className="tile-card">
    <div style={{
      width: 36, height: 36, borderRadius: 10,
      background: `color-mix(in srgb, var(--t-accent) 10%, transparent)`,
      display: "flex", alignItems: "center", justifyContent: "center",
      marginBottom: 14,
    }}>
      <Icon size={18} style={{ color: THEME.accent }} />
    </div>
    <div style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: THEME.muted, marginBottom: 6, fontWeight: 600 }}>
      {label}
    </div>
    <div style={{ fontSize: 22, fontWeight: 800, color: negative ? THEME.rust : THEME.ink, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
      {value}
    </div>
    {sub && (
      <div style={{ fontSize: 12, color: subColor || THEME.muted, marginTop: 4, fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
        {sub}
      </div>
    )}
  </div>
);

const EmptyHint = ({ text, icon: HintIcon = null }) => (
  <div className="empty-state">
    <div className="empty-state-icon">
      {HintIcon ? <HintIcon size={22} /> : <Layers size={22} />}
    </div>
    <div className="empty-state-title">{text}</div>
    <div className="empty-state-sub">Add data using the button above to get started.</div>
  </div>
);

// ================== BANKS TAB ==================
function BanksTab({ state, addItem, removeItem, updateItem }) {
  const [showBank, setShowBank] = useState(false);
  const [showTxn, setShowTxn] = useState(false);
  const [filterAcc, setFilterAcc] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const setQuickRange = (preset: string) => {
    const now = new Date();
    if (preset === "thisMonth") {
      setDateFrom(now.toISOString().slice(0, 7) + "-01");
      setDateTo(now.toISOString().slice(0, 10));
    } else if (preset === "lastMonth") {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      setDateFrom(prev.toISOString().slice(0, 10));
      setDateTo(last.toISOString().slice(0, 10));
    } else if (preset === "3months") {
      const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      setDateFrom(from.toISOString().slice(0, 10));
      setDateTo(now.toISOString().slice(0, 10));
    } else if (preset === "thisFY") {
      const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      setDateFrom(`${fyYear}-04-01`);
      setDateTo(now.toISOString().slice(0, 10));
    }
  };
  const [editBankId, setEditBankId] = useState(null);
  const [editTxnId, setEditTxnId] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEdit, setInlineEdit] = useState<any>(null);

  // D12: Recurring detection — transactions with same note+amount appearing ≥2 times
  const recurringKeys = useMemo(() => {
    const freq = {};
    state.transactions.forEach((t) => {
      const key = (t.note || "") + "|" + t.amount + "|" + t.type;
      freq[key] = (freq[key] || 0) + 1;
    });
    return new Set(Object.keys(freq).filter((k) => freq[k] >= 2));
  }, [state.transactions]);

  const filteredTxns = state.transactions
    .filter((t) => filterAcc === "all" || t.accountId === filterAcc)
    .filter((t) => filterType === "all" || t.type === filterType)
    .filter((t) => !dateFrom || t.date >= dateFrom)
    .filter((t) => !dateTo || t.date <= dateTo)
    .filter((t) =>
      !search ||
      (t.note || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.category || "").toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <SectionTitle sub="Bank accounts, cash positions, and every rupee that moves">
          Banks & Transactions
        </SectionTitle>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnGhost} onClick={() => setShowBank(true)}>
            <Plus size={14} /> Account
          </button>
          <button style={btnGhost} onClick={() => setShowImport(true)} title="Import transactions from CSV">
            <FileUp size={14} /> Import CSV
          </button>
          <button style={btnSolid} onClick={() => setShowTxn(true)}>
            <Plus size={14} /> Transaction
          </button>
        </div>
      </div>

      {/* Accounts grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {state.bankAccounts.length === 0 && (
          <div style={card}>
            <EmptyHint text="Add your first bank account" />
          </div>
        )}
        {state.bankAccounts.map((a) => (
          <div key={a.id} style={{ ...card, position: "relative" }}>
            <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 4 }}>
              <button
                onClick={() => setEditBankId(a.id)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted }}
              >
                <Edit3 size={14} />
              </button>
              <button
                onClick={() => removeItem("bankAccounts", a.id)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted }}
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: THEME.muted,
                }}
              >
                {a.type || "Savings"}
              </div>
              <OwnerBadge owner={a.owner} />
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                marginBottom: 2,
              }}
            >
              {a.bankName}
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 16 }}>
              ••••{(a.accountNumber || "").slice(-4)}
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 28,
                fontWeight: 800,
                color: THEME.ink,
              }}
            >
              {fmtINRFull(a.balance)}
            </div>
          </div>
        ))}
      </div>

      {/* Transaction ledger */}
      <div style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            Transaction Ledger
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              style={{ ...input, width: "auto", minWidth: 160 }}
              placeholder="Search notes or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              style={{ ...input, width: "auto", minWidth: 140 }}
              value={filterAcc}
              onChange={(e) => setFilterAcc(e.target.value)}
            >
              <option value="all">All accounts</option>
              {state.bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.bankName}</option>
              ))}
            </select>
            <select
              style={{ ...input, width: "auto", minWidth: 120 }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All types</option>
              <option value="credit">Credit only</option>
              <option value="debit">Debit only</option>
            </select>
            <input
              type="date"
              style={{ ...input, width: "auto" }}
              title="From date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span style={{ color: THEME.muted, fontSize: 12 }}>to</span>
            <input
              type="date"
              style={{ ...input, width: "auto" }}
              title="To date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
            {["thisMonth", "lastMonth", "3months", "thisFY"].map((p) => {
              const labels = { thisMonth: "This Month", lastMonth: "Last Month", "3months": "Last 3M", thisFY: "This FY" };
              return (
                <button key={p} style={{ ...btnGhost, padding: "6px 10px", fontSize: 11, whiteSpace: "nowrap" }} onClick={() => setQuickRange(p)}>
                  {labels[p]}
                </button>
              );
            })}
            {(dateFrom || dateTo) && (
              <button
                style={{ ...btnGhost, padding: "4px 8px", fontSize: 12 }}
                onClick={() => { setDateFrom(""); setDateTo(""); }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {filteredTxns.length === 0 ? (
          <EmptyHint text="No transactions" />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr style={{ borderBottom: `2px solid ${THEME.ink}` }}>
                  <th style={th}>Date</th>
                  <th style={th}>Particulars</th>
                  <th style={th}>Category</th>
                  <th style={th}>Account</th>
                  <th style={{ ...th, textAlign: "right" }}>Debit</th>
                  <th style={{ ...th, textAlign: "right" }}>Credit</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {[...filteredTxns].reverse().map((t) => {
                  const bank = state.bankAccounts.find((b) => b.id === t.accountId);
                  const isEditing = inlineEditId === t.id;
                  const txnCats = ["Food", "Rent", "Transport", "Shopping", "Bills", "Salary", "Investment", "Tax", "Medical", "Entertainment", "EMI", "Groceries", "Utilities", "Other"];
                  if (isEditing && inlineEdit) {
                    return (
                      <tr key={t.id} style={{ borderBottom: `1px solid ${THEME.accent}`, background: `color-mix(in srgb, var(--t-accent) 4%, transparent)` }}>
                        <td style={td}><input type="date" value={inlineEdit.date} onChange={(e) => setInlineEdit({ ...inlineEdit, date: e.target.value })} style={{ ...input, padding: "4px 6px", fontSize: 12, width: 130 }} /></td>
                        <td style={td}><input value={inlineEdit.note || ""} onChange={(e) => setInlineEdit({ ...inlineEdit, note: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { updateItem("transactions", t.id, inlineEdit); setInlineEditId(null); } if (e.key === "Escape") setInlineEditId(null); }} style={{ ...input, padding: "4px 6px", fontSize: 12, minWidth: 140 }} autoFocus /></td>
                        <td style={td}><select value={inlineEdit.category || ""} onChange={(e) => setInlineEdit({ ...inlineEdit, category: e.target.value })} style={{ ...input, padding: "4px 6px", fontSize: 12 }}>{txnCats.map((c) => <option key={c}>{c}</option>)}</select></td>
                        <td style={{ ...td, color: THEME.muted, fontSize: 12 }}>{bank?.bankName || "—"}</td>
                        <td style={{ ...td, textAlign: "right" }} colSpan={2}><input type="number" value={inlineEdit.amount} onChange={(e) => setInlineEdit({ ...inlineEdit, amount: e.target.value })} style={{ ...input, padding: "4px 6px", fontSize: 12, width: 100, textAlign: "right" }} /></td>
                        <td style={td}>
                          <div style={{ display: "flex", gap: 2 }}>
                            <button onClick={() => { updateItem("transactions", t.id, inlineEdit); setInlineEditId(null); }} style={{ ...iconBtn, color: THEME.sage }} title="Save"><Check size={14} /></button>
                            <button onClick={() => setInlineEditId(null)} style={{ ...iconBtn, color: THEME.rust }} title="Cancel"><X size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr
                      key={t.id}
                      onDoubleClick={() => { setInlineEditId(t.id); setInlineEdit({ ...t }); }}
                      style={{ borderBottom: `1px dashed ${THEME.line}`, cursor: "default" }}
                      title="Double-click to edit inline"
                    >
                      <td style={td}>{t.date}</td>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {t.note || "—"}
                          {recurringKeys.has((t.note || "") + "|" + t.amount + "|" + t.type) && (
                            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: THEME.gold + "33", color: THEME.gold, fontWeight: 700, whiteSpace: "nowrap" }}>RECURRING</span>
                          )}
                        </div>
                      </td>
                      <td style={{ ...td, color: THEME.muted, fontSize: 12 }}>{t.category}</td>
                      <td style={{ ...td, color: THEME.muted, fontSize: 12 }}>{bank?.bankName || "—"}</td>
                      <td style={{ ...td, textAlign: "right", color: THEME.accent, fontVariantNumeric: "tabular-nums" }}>
                        {t.type === "debit" ? fmtINRFull(t.amount) : ""}
                      </td>
                      <td style={{ ...td, textAlign: "right", color: THEME.sage, fontVariantNumeric: "tabular-nums" }}>
                        {t.type === "credit" ? fmtINRFull(t.amount) : ""}
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 2 }}>
                          <button onClick={() => setEditTxnId(t.id)} style={iconBtn}><Edit3 size={13} /></button>
                          <button onClick={() => removeItem("transactions", t.id)} style={iconBtn}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editBankId && (
        <BankEditModal
          account={state.bankAccounts.find((a) => a.id === editBankId)}
          onClose={() => setEditBankId(null)}
          onSave={(v) => {
            updateItem("bankAccounts", editBankId, v);
            setEditBankId(null);
          }}
        />
      )}
      {editTxnId && (
        <TxnEditModal
          txn={state.transactions.find((t) => t.id === editTxnId)}
          accounts={state.bankAccounts}
          onClose={() => setEditTxnId(null)}
          onSave={(v) => {
            updateItem("transactions", editTxnId, v);
            setEditTxnId(null);
          }}
        />
      )}
      {showBank && (
        <BankModal
          onClose={() => setShowBank(false)}
          onSave={(v) => {
            addItem("bankAccounts", v);
            setShowBank(false);
          }}
        />
      )}
      {showTxn && (
        <TxnModal
          accounts={state.bankAccounts}
          onClose={() => setShowTxn(false)}
          onSave={(v) => {
            addItem("transactions", v);
            setShowTxn(false);
          }}
        />
      )}
      {showImport && (
        <CsvImportModal
          accounts={state.bankAccounts}
          onClose={() => setShowImport(false)}
          onImport={(rows) => {
            rows.forEach((v) => addItem("transactions", v));
            setShowImport(false);
          }}
        />
      )}
    </div>
  );
}

const th = {
  textAlign: "left" as const,
  padding: "11px 10px",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: THEME.muted,
  fontWeight: 700,
  borderBottom: `1px solid var(--t-line)`,
  whiteSpace: "nowrap" as const,
};
const td = {
  padding: "12px 10px",
  verticalAlign: "top" as const,
  fontSize: 13,
  borderBottom: `1px solid var(--t-line)`,
};
const iconBtn = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: THEME.muted,
  padding: "5px",
  borderRadius: 6,
  display: "inline-flex",
  alignItems: "center",
  transition: "color 0.15s ease, background 0.15s ease",
};

function BankModal({ onClose, onSave }) {
  const [f, setF] = useState({
    owner: "self",
    bankName: "",
    accountNumber: "",
    type: "Savings",
    balance: "",
  });
  return (
    <Modal title="Add Bank Account" onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Bank Name">
        <input
          style={input}
          value={f.bankName}
          onChange={(e) => setF({ ...f, bankName: e.target.value })}
          placeholder="e.g. HDFC Bank"
        />
      </Field>
      <Field label="Account Number (last 4 ok)">
        <input
          style={input}
          value={f.accountNumber}
          onChange={(e) => setF({ ...f, accountNumber: e.target.value })}
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Type">
          <select
            style={input}
            value={f.type}
            onChange={(e) => setF({ ...f, type: e.target.value })}
          >
            <option>Savings</option>
            <option>Current</option>
            <option>Salary</option>
            <option>Joint</option>
          </select>
        </Field>
        <Field label="Current Balance">
          <input
            style={input}
            type="number"
            value={f.balance}
            onChange={(e) => setF({ ...f, balance: e.target.value })}
          />
        </Field>
      </div>
      <ModalActions onSave={() => f.bankName && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function TxnModal({ accounts, onClose, onSave }) {
  const [f, setF] = useState({
    owner: "self",
    date: today(),
    accountId: accounts[0]?.id || "",
    type: "debit",
    amount: "",
    category: "General",
    note: "",
  });
  const cats = [
    "General",
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Salary",
    "Transfer",
    "Investment",
    "Tax",
    "Medical",
    "Entertainment",
    "Other",
  ];
  return (
    <Modal title="Record Transaction" onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Date">
          <input
            style={input}
            type="date"
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
          />
        </Field>
        <Field label="Account">
          <select
            style={input}
            value={f.accountId}
            onChange={(e) => setF({ ...f, accountId: e.target.value })}
          >
            {accounts.length === 0 && (
              <option value="">Add account first</option>
            )}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.bankName}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Type">
          <select
            style={input}
            value={f.type}
            onChange={(e) => setF({ ...f, type: e.target.value })}
          >
            <option value="debit">Debit (money out)</option>
            <option value="credit">Credit (money in)</option>
          </select>
        </Field>
        <Field label="Amount">
          <input
            style={input}
            type="number"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Category">
        <select
          style={input}
          value={f.category}
          onChange={(e) => setF({ ...f, category: e.target.value })}
        >
          {cats.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="Note">
        <input
          style={input}
          value={f.note}
          onChange={(e) => {
            const note = e.target.value;
            const cat = autoCateg(note);
            setF({ ...f, note, ...(cat ? { category: cat } : {}) });
          }}
          placeholder="e.g. Swiggy order — category auto-detected"
        />
      </Field>
      <ModalActions
        onSave={() => f.amount && f.accountId && onSave(f)}
        onClose={onClose}
      />
    </Modal>
  );
}

function TxnEditModal({ txn, accounts, onClose, onSave }) {
  const cats = ["General", "Food", "Transport", "Shopping", "Bills", "Salary", "Transfer", "Investment", "Tax", "Medical", "Entertainment", "Rent", "Utilities", "Other"];
  const [f, setF] = useState({
    date: txn?.date || today(),
    accountId: txn?.accountId || accounts[0]?.id || "",
    type: txn?.type || "debit",
    amount: txn?.amount || "",
    category: txn?.category || "General",
    note: txn?.note || "",
  });
  return (
    <Modal title="Edit Transaction" onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Date">
          <input style={input} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
        <Field label="Account">
          <select style={input} value={f.accountId} onChange={(e) => setF({ ...f, accountId: e.target.value })}>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.bankName}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Type">
          <select style={input} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            <option value="debit">Debit (money out)</option>
            <option value="credit">Credit (money in)</option>
          </select>
        </Field>
        <Field label="Amount">
          <input style={input} type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </Field>
      </div>
      <Field label="Category">
        <select style={input} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {cats.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Note">
        <input style={input} value={f.note} onChange={(e) => {
          const note = e.target.value;
          const cat = autoCateg(note);
          setF({ ...f, note, ...(cat ? { category: cat } : {}) });
        }} placeholder="e.g. Swiggy order — category auto-detected" />
      </Field>
      <ModalActions onSave={() => f.amount && f.accountId && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

// ================== INVESTMENTS TAB ==================
function InvestmentsTab({ state, addItem, removeItem, updateItem, subTab }) {
  const sub = subTab || "fd";
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);

  const addNPSContribution = (npsId: string, contribution: any) => {
    const account = state.nps.find((n) => n.id === npsId);
    if (!account) return;
    const existing = account.contributions || [];
    updateItem("nps", npsId, { contributions: [...existing, { id: uid(), ...contribution }] });
  };

  const removeNPSContribution = (npsId: string, contributionId: string) => {
    const account = state.nps.find((n) => n.id === npsId);
    if (!account) return;
    updateItem("nps", npsId, { contributions: (account.contributions || []).filter((c) => c.id !== contributionId) });
  };

  const subs = [
    { id: "fd", label: "Fixed Deposits", key: "fixedDeposits", icon: Coins },
    {
      id: "rd",
      label: "Recurring Deposits",
      key: "recurringDeposits",
      icon: Repeat,
    },
    { id: "bond", label: "Bonds", key: "bonds", icon: FileText },
    { id: "ppf", label: "PPF", key: "ppf", icon: Shield },
    { id: "nps", label: "NPS", key: "nps", icon: Briefcase },
    { id: "mf", label: "Mutual Funds", key: "mutualFunds", icon: BarChart3 },
    { id: "lic", label: "LIC", key: "lic", icon: Shield },
    { id: "term", label: "Term Plans", key: "termPlans", icon: Shield },
    { id: "income", label: "Interest Income", key: "", icon: Coins },
  ];

  return (
    <div>
      <SectionTitle sub="All instruments under one roof — principal, growth, and paper trail">
        Investments
      </SectionTitle>

      
      <div>
        
        <div style={{ minWidth: 0 }}>


      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <button style={btnSolid} onClick={() => setModal(sub)}>
          <Plus size={14} /> Add{" "}
          {subs.find((s) => s.id === sub).label.slice(0, -1)}
        </button>
      </div>

      {sub === "fd" && (
        <>
          <FDList items={state.fixedDeposits} onRemove={(id) => removeItem("fixedDeposits", id)} onEdit={setEditId} />
          {/* F5 – Maturity Timeline (FD + Bond) */}
          {(state.fixedDeposits.length > 0 || state.bonds.length > 0) && (() => {
            const now = new Date();
            const items = [
              ...state.fixedDeposits.map((f) => ({ label: `${f.bank} FD`, date: f.maturityDate, amount: Number(f.principal), color: THEME.accent })),
              ...state.bonds.map((b) => ({ label: b.name, date: b.maturityDate, amount: Number(b.faceValue), color: THEME.gold })),
            ].filter((x) => x.date).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            if (!items.length) return null;
            const earliest = new Date(items[0].date).getFullYear();
            const latest = new Date(items[items.length - 1].date).getFullYear();
            const range = Math.max(latest - earliest + 1, 1);
            return (
              <div style={{ ...card, marginTop: 20 }}>
                <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>FD & Bond Maturity Timeline</div>
                <div style={{ position: "relative", paddingBottom: 8 }}>
                  <div style={{ height: 2, background: THEME.line, marginBottom: 24, marginTop: 8 }} />
                  {items.map((item, i) => {
                    const yr = new Date(item.date).getFullYear();
                    const leftPct = range > 1 ? ((yr - earliest) / (range - 1)) * 100 : 50;
                    return (
                      <div key={i} style={{ position: "absolute", top: -16, left: `${leftPct}%`, transform: "translateX(-50%)", textAlign: "center", minWidth: 80 }}>
                        <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, margin: "0 auto 4px", border: `2px solid ${THEME.paper}`, boxShadow: `0 0 0 2px ${item.color}` }} />
                        <div style={{ fontSize: 9, fontWeight: 700, color: item.color, whiteSpace: "nowrap" }}>{item.label}</div>
                        <div style={{ fontSize: 9, color: THEME.muted }}>{item.date?.slice(0, 7)}</div>
                        <div style={{ fontSize: 9, fontWeight: 600, color: THEME.ink }}>{fmtINR(item.amount)}</div>
                      </div>
                    );
                  })}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 56, fontSize: 10, color: THEME.muted }}>
                    {Array.from({ length: range }, (_, i) => <span key={i}>{earliest + i}</span>)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 16, fontSize: 11, color: THEME.muted, marginTop: 8 }}>
                  <span><span style={{ color: THEME.accent }}>●</span> Fixed Deposits</span>
                  <span><span style={{ color: THEME.gold }}>●</span> Bonds</span>
                </div>
              </div>
            );
          })()}
        </>
      )}
      {sub === "rd" && (
        <RDList items={state.recurringDeposits} onRemove={(id) => removeItem("recurringDeposits", id)} onEdit={setEditId} />
      )}
      {sub === "bond" && (
        <BondList items={state.bonds} onRemove={(id) => removeItem("bonds", id)} onEdit={setEditId} />
      )}
      {sub === "ppf" && (
        <PPFList items={state.ppf} onRemove={(id) => removeItem("ppf", id)} onEdit={setEditId} />
      )}
      {sub === "nps" && (
        <NPSList
          items={state.nps}
          onRemove={(id) => removeItem("nps", id)}
          onEdit={setEditId}
          onAddContribution={addNPSContribution}
          onRemoveContribution={removeNPSContribution}
        />
      )}
      {sub === "mf" && (
        <>
          <MFList items={state.mutualFunds} onRemove={(id) => removeItem("mutualFunds", id)} onEdit={setEditId} />
          {/* F4 – MF Overlap Detector */}
          {state.mutualFunds.length > 1 && (() => {
            const typeMap: Record<string, string[]> = {};
            state.mutualFunds.forEach((m) => {
              const t = (m.type || "Other").toLowerCase();
              const bucket = t.includes("index") || t.includes("nifty") || t.includes("sensex") ? "Index/Large-cap"
                : t.includes("equity") || t.includes("flexi") || t.includes("large") ? "Equity"
                : t.includes("debt") || t.includes("liquid") || t.includes("bond") ? "Debt"
                : t.includes("hybrid") || t.includes("balanced") ? "Hybrid" : "Other";
              if (!typeMap[bucket]) typeMap[bucket] = [];
              typeMap[bucket].push(m.scheme);
            });
            const overlaps = Object.entries(typeMap).filter(([, names]) => names.length > 1);
            if (!overlaps.length) return (
              <div style={{ ...card, marginTop: 20, borderLeft: `4px solid ${THEME.sage}` }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Check size={16} style={{ color: THEME.sage }} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>No overlap detected — your MF portfolio is well-diversified across categories.</span>
                </div>
              </div>
            );
            return (
              <div style={{ ...card, marginTop: 20, borderLeft: `4px solid ${THEME.gold}` }}>
                <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: THEME.muted, marginBottom: 12 }}>MF Overlap Detector</div>
                <div style={{ display: "grid", gap: 10 }}>
                  {overlaps.map(([bucket, names]) => (
                    <div key={bucket} style={{ padding: 12, background: "rgba(249,171,0,0.08)", borderRadius: 8 }}>
                      <div style={{ fontWeight: 700, color: THEME.gold, fontSize: 13, marginBottom: 4 }}>⚠ {bucket} overlap ({names.length} funds)</div>
                      <div style={{ fontSize: 12, color: THEME.muted }}>{names.join(" · ")}</div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>These funds likely hold similar stocks — consider consolidating to one.</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </>
      )}
      {sub === "lic" && (
        <LICList items={state.lic} onRemove={(id) => removeItem("lic", id)} onEdit={setEditId} />
      )}
      {sub === "term" && (
        <TermList items={state.termPlans} onRemove={(id) => removeItem("termPlans", id)} onEdit={setEditId} />
      )}

      {/* F6 – Interest & Dividend Income Tracker */}
      {sub === "income" && (() => {
        const now = new Date();
        const fdInterest = state.fixedDeposits.map((f) => {
          const principal = Number(f.principal) || 0;
          const rate = Number(f.rate) || 0;
          const annual = (principal * rate) / 100;
          return { label: `${f.bank} FD`, annual, monthly: annual / 12, type: "FD Interest" };
        });
        const bondInterest = state.bonds.map((b) => {
          const face = Number(b.faceValue) || 0;
          const coupon = Number(b.coupon) || 0;
          const annual = (face * coupon) / 100;
          return { label: b.name, annual, monthly: annual / 12, type: "Bond Coupon" };
        });
        const rdInterest = state.recurringDeposits.map((r) => {
          const m = Number(r.monthly) || 0;
          const rate = Number(r.rate) || 0;
          const months = Number(r.tenureMonths) || 12;
          const maturity = rdMaturity(m, rate, months);
          const invested = m * months;
          const annual = (maturity - invested) / (months / 12);
          return { label: `${r.bank} RD`, annual, monthly: annual / 12, type: "RD Interest" };
        });
        const all = [...fdInterest, ...bondInterest, ...rdInterest];
        const totalAnnual = all.reduce((s, x) => s + x.annual, 0);
        const totalMonthly = all.reduce((s, x) => s + x.monthly, 0);
        return (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
              <Tile icon={Coins} label="Annual Interest Income" value={fmtINRFull(totalAnnual)} />
              <Tile icon={IndianRupee} label="Monthly Interest" value={fmtINRFull(totalMonthly)} />
              <Tile icon={Receipt} label="Sources" value={all.length} />
              <Tile icon={Percent} label="Avg Yield" value={
                (state.fixedDeposits.reduce((s,f)=>s+Number(f.principal||0),0) + state.bonds.reduce((s,b)=>s+Number(b.faceValue||0),0)) > 0
                  ? (totalAnnual / (state.fixedDeposits.reduce((s,f)=>s+Number(f.principal||0),0) + state.bonds.reduce((s,b)=>s+Number(b.faceValue||0),0)) * 100).toFixed(2) + "%" : "—"
              } />
            </div>
            {all.length === 0 ? <div style={card}><EmptyHint text="Add FDs, Bonds, or RDs to see interest income" /></div> : (
              <div style={card}>
                <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Income Breakdown</div>
                <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${THEME.ink}` }}>
                      <th style={th}>Instrument</th>
                      <th style={th}>Type</th>
                      <th style={{ ...th, textAlign: "right" }}>Annual Income</th>
                      <th style={{ ...th, textAlign: "right" }}>Monthly Income</th>
                    </tr>
                  </thead>
                  <tbody>
                    {all.map((x, i) => (
                      <tr key={i} style={{ borderBottom: `1px dashed ${THEME.line}` }}>
                        <td style={{ ...td, fontWeight: 600 }}>{x.label}</td>
                        <td style={{ ...td, color: THEME.muted, fontSize: 12 }}>{x.type}</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 700, color: THEME.sage }}>{fmtINRFull(x.annual)}</td>
                        <td style={{ ...td, textAlign: "right", color: THEME.muted }}>{fmtINRFull(x.monthly)}</td>
                      </tr>
                    ))}
                    <tr style={{ background: "rgba(128,128,128,0.06)" }}>
                      <td style={{ ...td, fontWeight: 700 }} colSpan={2}>Total</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 800, color: THEME.sage }}>{fmtINRFull(totalAnnual)}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700, color: THEME.sage }}>{fmtINRFull(totalMonthly)}</td>
                    </tr>
                  </tbody>
                </table></div>
              </div>
            )}
          </div>
        );
      })()}

      {modal === "fd" && (
        <FDModal
          onClose={() => setModal(null)}
          onSave={(v) => {
            addItem("fixedDeposits", v);
            setModal(null);
          }}
        />
      )}
      {modal === "rd" && (
        <RDModal
          onClose={() => setModal(null)}
          onSave={(v) => {
            addItem("recurringDeposits", v);
            setModal(null);
          }}
        />
      )}
      {modal === "bond" && (
        <BondModal
          onClose={() => setModal(null)}
          onSave={(v) => {
            addItem("bonds", v);
            setModal(null);
          }}
        />
      )}
      {modal === "ppf" && (
        <PPFModal
          onClose={() => setModal(null)}
          onSave={(v) => {
            addItem("ppf", v);
            setModal(null);
          }}
        />
      )}
      {modal === "nps" && (
        <NPSModal
          onClose={() => setModal(null)}
          onSave={(v) => {
            addItem("nps", v);
            setModal(null);
          }}
        />
      )}
      {modal === "mf" && (
        <MFModal
          onClose={() => setModal(null)}
          onSave={(v) => {
            addItem("mutualFunds", v);
            setModal(null);
          }}
        />
      )}
      {modal === "lic" && (
        <LICModal
          onClose={() => setModal(null)}
          onSave={(v) => {
            addItem("lic", v);
            setModal(null);
          }}
        />
      )}
      {modal === "term" && (
        <TermModal
          onClose={() => setModal(null)}
          onSave={(v) => {
            addItem("termPlans", v);
            setModal(null);
          }}
        />
      )}

      {editId && sub === "fd" && (
        <FDModal initial={state.fixedDeposits.find(x => x.id === editId)} onClose={() => setEditId(null)}
          onSave={(v) => { updateItem("fixedDeposits", editId, v); setEditId(null); }} />
      )}
      {editId && sub === "rd" && (
        <RDModal initial={state.recurringDeposits.find(x => x.id === editId)} onClose={() => setEditId(null)}
          onSave={(v) => { updateItem("recurringDeposits", editId, v); setEditId(null); }} />
      )}
      {editId && sub === "bond" && (
        <BondModal initial={state.bonds.find(x => x.id === editId)} onClose={() => setEditId(null)}
          onSave={(v) => { updateItem("bonds", editId, v); setEditId(null); }} />
      )}
      {editId && sub === "ppf" && (
        <PPFModal initial={state.ppf.find(x => x.id === editId)} onClose={() => setEditId(null)}
          onSave={(v) => { updateItem("ppf", editId, v); setEditId(null); }} />
      )}
      {editId && sub === "nps" && (
        <NPSModal initial={state.nps.find(x => x.id === editId)} onClose={() => setEditId(null)}
          onSave={(v) => { updateItem("nps", editId, v); setEditId(null); }} />
      )}
      {editId && sub === "mf" && (
        <MFModal initial={state.mutualFunds.find(x => x.id === editId)} onClose={() => setEditId(null)}
          onSave={(v) => { updateItem("mutualFunds", editId, v); setEditId(null); }} />
      )}
      {editId && sub === "lic" && (
        <LICModal initial={state.lic.find(x => x.id === editId)} onClose={() => setEditId(null)}
          onSave={(v) => { updateItem("lic", editId, v); setEditId(null); }} />
      )}
      {editId && sub === "term" && (
        <TermModal initial={state.termPlans.find(x => x.id === editId)} onClose={() => setEditId(null)}
          onSave={(v) => { updateItem("termPlans", editId, v); setEditId(null); }} />
      )}
            </div>
      </div>
    </div>
  );
}

const InvestCard = ({ children, onRemove, onEdit }: any) => (
  <div style={{ ...card, position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 2, zIndex: 2 }}>
      {onEdit && (
        <button onClick={onEdit} title="Edit" style={{ ...iconBtn, padding: "4px 6px", borderRadius: 6 }}>
          <Edit3 size={13} />
        </button>
      )}
      <button onClick={onRemove} title="Delete" style={{ ...iconBtn, padding: "4px 6px", borderRadius: 6, color: THEME.rust }}>
        <Trash2 size={13} />
      </button>
    </div>
    {children}
  </div>
);

const Grid = ({ children }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
      gap: 16,
    }}
  >
    {children}
  </div>
);

function FDList({ items, onRemove, onEdit }: any) {
  if (!items.length) return <EmptyHint text="No fixed deposits yet" />;
  return (
    <Grid>
      {items.map((f) => {
        const maturity = fdMaturity(
          Number(f.principal),
          Number(f.rate),
          Number(f.years)
        );
        return (
          <InvestCard key={f.id} onRemove={() => onRemove(f.id)} onEdit={() => onEdit(f.id)}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: THEME.muted,
              }}
            >
              {f.bank}
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 24,
                fontWeight: 800,
                marginTop: 4,
              }}
            >
              {fmtINRFull(f.principal)}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginTop: 16,
                fontSize: 12,
              }}
            >
              <Stat k="Rate" v={`${f.rate}%`} />
              <Stat k="Tenure" v={`${f.years} yrs`} />
              <Stat k="Maturity" v={fmtINR(maturity)} />
              <Stat k="Matures on" v={f.maturityDate || "—"} />
            </div>
          </InvestCard>
        );
      })}
    </Grid>
  );
}
const Stat = ({ k, v }) => (
  <div>
    <div
      style={{
        fontSize: 10,
        color: THEME.muted,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
      }}
    >
      {k}
    </div>
    <div style={{ fontWeight: 600, fontSize: 14 }}>{v}</div>
  </div>
);

function RDList({ items, onRemove, onEdit }: any) {
  if (!items.length) return <EmptyHint text="No RDs yet" />;
  return (
    <Grid>
      {items.map((r) => {
        const m = Math.min(
          monthsBetween(r.startDate, today()),
          Number(r.tenureMonths)
        );
        const paid = m * Number(r.monthly);
        const maturity = rdMaturity(
          Number(r.monthly),
          Number(r.rate),
          Number(r.tenureMonths)
        );
        return (
          <InvestCard key={r.id} onRemove={() => onRemove(r.id)} onEdit={() => onEdit(r.id)}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: THEME.muted,
              }}
            >
              {r.bank}
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 24,
                fontWeight: 800,
                marginTop: 4,
              }}
            >
              {fmtINRFull(r.monthly)}/mo
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginTop: 16,
                fontSize: 12,
              }}
            >
              <Stat k="Paid so far" v={fmtINR(paid)} />
              <Stat k="Rate" v={`${r.rate}%`} />
              <Stat k="Tenure" v={`${r.tenureMonths} mo`} />
              <Stat k="Projected" v={fmtINR(maturity)} />
            </div>
          </InvestCard>
        );
      })}
    </Grid>
  );
}

function BondList({ items, onRemove, onEdit }: any) {
  if (!items.length) return <EmptyHint text="No bonds yet" />;
  return (
    <Grid>
      {items.map((b) => (
        <InvestCard key={b.id} onRemove={() => onRemove(b.id)} onEdit={() => onEdit(b.id)}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: THEME.muted,
            }}
          >
            {b.type || "Bond"}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 22,
              fontWeight: 800,
              marginTop: 4,
            }}
          >
            {b.name}
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4 }}>
            {fmtINRFull(b.faceValue)}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 16,
              fontSize: 12,
            }}
          >
            <Stat k="Coupon" v={`${b.coupon}%`} />
            <Stat k="Matures" v={b.maturityDate || "—"} />
          </div>
        </InvestCard>
      ))}
    </Grid>
  );
}

function PPFList({ items, onRemove, onEdit }: any) {
  if (!items.length) return <EmptyHint text="No PPF account yet" />;
  return (
    <Grid>
      {items.map((p) => (
        <InvestCard key={p.id} onRemove={() => onRemove(p.id)} onEdit={() => onEdit(p.id)}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: THEME.muted,
            }}
          >
            PPF · {p.bank}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 28,
              fontWeight: 800,
              marginTop: 4,
            }}
          >
            {fmtINRFull(p.balance)}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 16,
              fontSize: 12,
            }}
          >
            <Stat k="Opened" v={p.openDate || "—"} />
            <Stat k="This FY" v={fmtINR(p.thisYearContribution || 0)} />
          </div>
        </InvestCard>
      ))}
    </Grid>
  );
}

function NPSList({ items, onRemove, onEdit, onAddContribution, onRemoveContribution }: any) {
  const [addingFor, setAddingFor] = useState<string | null>(null);

  if (!items.length) return <EmptyHint text="No NPS account yet" />;

  const getFY = (dateStr: string) => {
    const d = new Date(dateStr);
    const y = d.getFullYear(), m = d.getMonth();
    const fyStart = m >= 3 ? y : y - 1;
    return `${fyStart}-${String(fyStart + 1).slice(-2)}`;
  };

  const now = new Date();
  const currentFYStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const currentFY = `${currentFYStart}-${String(currentFYStart + 1).slice(-2)}`;

  return (
    <>
      <Grid>
        {items.map((n) => {
          const contributions: any[] = n.contributions || [];
          const byFY: Record<string, any[]> = {};
          contributions.forEach((c) => {
            const fy = getFY(c.date);
            if (!byFY[fy]) byFY[fy] = [];
            byFY[fy].push(c);
          });
          const fyList = Object.keys(byFY).sort().reverse();
          const thisFY = byFY[currentFY] || [];
          const thisFYSelf = thisFY.reduce((s, c) => s + Number(c.selfAmount || 0), 0);
          const thisFYEmp = thisFY.reduce((s, c) => s + Number(c.employerAmount || 0), 0);
          const totalSelf = contributions.reduce((s, c) => s + Number(c.selfAmount || 0), 0);
          const totalEmp = contributions.reduce((s, c) => s + Number(c.employerAmount || 0), 0);

          return (
            <InvestCard key={n.id} onRemove={() => onRemove(n.id)} onEdit={() => onEdit(n.id)}>
              <div style={{ fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: THEME.muted }}>
                NPS · Tier {n.tier || "I"} · {(n.owner || "self").toUpperCase()}
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 28, fontWeight: 800, marginTop: 4 }}>
                {fmtINRFull(n.balance)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16, fontSize: 12 }}>
                <Stat k="PRAN" v={(n.pran || "").slice(-6) || "—"} />
                <Stat k={"FY " + currentFY + " Self"} v={fmtINR(thisFYSelf)} />
                <Stat k={"FY " + currentFY + " Employer"} v={fmtINR(thisFYEmp)} />
                <Stat k="All-time Self" v={fmtINR(totalSelf)} />
              </div>

              {/* Contribution history grouped by FY */}
              {fyList.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: THEME.muted, marginBottom: 10 }}>
                    Contribution History
                  </div>
                  {fyList.map((fy) => {
                    const rows = byFY[fy].slice().sort((a, b) => a.date.localeCompare(b.date));
                    const fySelf = rows.reduce((s, c) => s + Number(c.selfAmount || 0), 0);
                    const fyEmp = rows.reduce((s, c) => s + Number(c.employerAmount || 0), 0);
                    return (
                      <div key={fy} style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: THEME.gold, marginBottom: 6 }}>
                          FY {fy}
                        </div>
                        <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                          <thead>
                            <tr>
                              <th style={{ color: THEME.muted, textAlign: "left", paddingBottom: 4, fontWeight: 500, fontSize: 10 }}>Date</th>
                              <th style={{ color: THEME.muted, textAlign: "right", paddingBottom: 4, fontWeight: 500, fontSize: 10 }}>Self</th>
                              <th style={{ color: THEME.muted, textAlign: "right", paddingBottom: 4, fontWeight: 500, fontSize: 10 }}>Employer</th>
                              <th style={{ width: 18 }} />
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((c) => (
                              <tr key={c.id} style={{ borderTop: `1px solid ${THEME.line}` }}>
                                <td style={{ color: THEME.ink, padding: "4px 0" }}>{c.date}</td>
                                <td style={{ color: THEME.sage, textAlign: "right", padding: "4px 0" }}>{fmtINR(c.selfAmount || 0)}</td>
                                <td style={{ color: THEME.accent, textAlign: "right", padding: "4px 0" }}>{fmtINR(c.employerAmount || 0)}</td>
                                <td style={{ textAlign: "right", padding: "4px 0" }}>
                                  {onRemoveContribution && (
                                    <button
                                      onClick={() => onRemoveContribution(n.id, c.id)}
                                      style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 0, lineHeight: 1 }}
                                      title="Remove"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                            <tr style={{ borderTop: `1px solid ${THEME.line}` }}>
                              <td style={{ color: THEME.muted, padding: "5px 0", fontWeight: 700, fontSize: 10 }}>FY Total</td>
                              <td style={{ color: THEME.sage, textAlign: "right", padding: "5px 0", fontWeight: 700 }}>{fmtINR(fySelf)}</td>
                              <td style={{ color: THEME.accent, textAlign: "right", padding: "5px 0", fontWeight: 700 }}>{fmtINR(fyEmp)}</td>
                              <td />
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                  <div style={{ borderTop: `1px solid ${THEME.line}`, paddingTop: 8, display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: THEME.muted, fontWeight: 700 }}>All-time Total</span>
                    <span>
                      <span style={{ color: THEME.sage, fontWeight: 700, marginRight: 12 }}>{fmtINR(totalSelf)}</span>
                      <span style={{ color: THEME.accent, fontWeight: 700 }}>{fmtINR(totalEmp)}</span>
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setAddingFor(n.id)}
                style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, width: "100%", justifyContent: "center", fontSize: 12, background: THEME.line, border: "none", borderRadius: 8, padding: "7px 12px", cursor: "pointer", color: THEME.ink, fontWeight: 600 }}
              >
                <Plus size={13} /> Add Contribution
              </button>
            </InvestCard>
          );
        })}
      </Grid>

      {addingFor && (
        <NPSContributionModal
          onClose={() => setAddingFor(null)}
          onSave={(c) => { onAddContribution(addingFor, c); setAddingFor(null); }}
        />
      )}
    </>
  );
}

function MFList({ items, onRemove, onEdit }: any) {
  if (!items.length) return <EmptyHint text="No mutual fund holdings yet" />;
  return (
    <Grid>
      {items.map((m) => {
        const current = Number(m.units) * Number(m.currentNav);
        const pnl = current - Number(m.invested);
        const pct = Number(m.invested) ? (pnl / Number(m.invested)) * 100 : 0;
        return (
          <InvestCard key={m.id} onRemove={() => onRemove(m.id)} onEdit={() => onEdit(m.id)}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: THEME.muted,
              }}
            >
              {m.type || "Equity"}
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 18,
                fontWeight: 700,
                marginTop: 4,
                lineHeight: 1.1,
              }}
            >
              {m.scheme}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 12 }}>
              {fmtINRFull(current)}
            </div>
            <div
              style={{
                color: pnl >= 0 ? THEME.sage : THEME.accent,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {pnl >= 0 ? "+" : ""}
              {fmtINR(pnl)} ({pct.toFixed(2)}%)
            </div>
            {(() => {
              const cagr = m.buyDate ? calcCAGR(Number(m.invested), current, m.buyDate) : null;
              return cagr !== null ? (
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                  CAGR <span style={{ fontWeight: 700, color: cagr >= 15 ? THEME.sage : cagr >= 8 ? THEME.gold : THEME.rust }}>{cagr >= 0 ? "+" : ""}{cagr.toFixed(1)}%/yr</span>
                </div>
              ) : null;
            })()}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginTop: 12,
                fontSize: 12,
              }}
            >
              <Stat k="Units" v={Number(m.units).toFixed(3)} />
              <Stat k="Invested" v={fmtINR(m.invested)} />
            </div>
          </InvestCard>
        );
      })}
    </Grid>
  );
}

function LICList({ items, onRemove, onEdit }: any) {
  if (!items.length) return <EmptyHint text="No LIC policies yet" />;
  return (
    <Grid>
      {items.map((l) => (
        <InvestCard key={l.id} onRemove={() => onRemove(l.id)} onEdit={() => onEdit(l.id)}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: THEME.muted,
            }}
          >
            Policy {l.policyNumber?.slice(-4) || ""}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 18,
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            {l.planName}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 16,
              fontSize: 12,
            }}
          >
            <Stat k="Sum Assured" v={fmtINR(l.sumAssured)} />
            <Stat k="Premium/yr" v={fmtINR(l.annualPremium)} />
            <Stat k="Paid so far" v={fmtINR(l.premiumPaid)} />
            <Stat k="Maturity" v={l.maturityDate || "—"} />
          </div>
        </InvestCard>
      ))}
    </Grid>
  );
}

function TermList({ items, onRemove, onEdit }: any) {
  if (!items.length) return <EmptyHint text="No term plans yet" />;
  return (
    <Grid>
      {items.map((t) => (
        <InvestCard key={t.id} onRemove={() => onRemove(t.id)} onEdit={() => onEdit(t.id)}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: THEME.muted,
            }}
          >
            {t.insurer}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 18,
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            {t.planName}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 16,
              fontSize: 12,
            }}
          >
            <Stat k="Cover" v={fmtINR(t.coverAmount)} />
            <Stat k="Premium" v={fmtINR(t.annualPremium)} />
            <Stat k="Expires" v={t.expiryDate || "—"} />
          </div>
        </InvestCard>
      ))}
    </Grid>
  );
}

// ===== Investment modals =====
function FDModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || {
    bank: "",
    principal: "",
    rate: "7",
    years: "1",
    startDate: today(),
    maturityDate: "",
  });
  return (
    <Modal title={initial ? "Edit Fixed Deposit" : "Add Fixed Deposit"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Bank">
        <input
          style={input}
          value={f.bank}
          onChange={(e) => setF({ ...f, bank: e.target.value })}
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Principal">
          <input
            style={input}
            type="number"
            value={f.principal}
            onChange={(e) => setF({ ...f, principal: e.target.value })}
          />
        </Field>
        <Field label="Interest Rate (%)">
          <input
            style={input}
            type="number"
            step="0.01"
            value={f.rate}
            onChange={(e) => setF({ ...f, rate: e.target.value })}
          />
        </Field>
        <Field label="Tenure (years)">
          <input
            style={input}
            type="number"
            step="0.25"
            value={f.years}
            onChange={(e) => setF({ ...f, years: e.target.value })}
          />
        </Field>
        <Field label="Maturity Date">
          <input
            style={input}
            type="date"
            value={f.maturityDate}
            onChange={(e) => setF({ ...f, maturityDate: e.target.value })}
          />
        </Field>
      </div>
      <ModalActions
        onSave={() => f.bank && f.principal && onSave(f)}
        onClose={onClose}
      />
    </Modal>
  );
}
function RDModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || {
    bank: "",
    monthly: "",
    rate: "6.5",
    tenureMonths: "12",
    startDate: today(),
  });
  return (
    <Modal title={initial ? "Edit Recurring Deposit" : "Add Recurring Deposit"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Bank">
        <input
          style={input}
          value={f.bank}
          onChange={(e) => setF({ ...f, bank: e.target.value })}
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Monthly Amount">
          <input
            style={input}
            type="number"
            value={f.monthly}
            onChange={(e) => setF({ ...f, monthly: e.target.value })}
          />
        </Field>
        <Field label="Rate (%)">
          <input
            style={input}
            type="number"
            step="0.01"
            value={f.rate}
            onChange={(e) => setF({ ...f, rate: e.target.value })}
          />
        </Field>
        <Field label="Tenure (months)">
          <input
            style={input}
            type="number"
            value={f.tenureMonths}
            onChange={(e) => setF({ ...f, tenureMonths: e.target.value })}
          />
        </Field>
        <Field label="Start Date">
          <input
            style={input}
            type="date"
            value={f.startDate}
            onChange={(e) => setF({ ...f, startDate: e.target.value })}
          />
        </Field>
      </div>
      <ModalActions
        onSave={() => f.bank && f.monthly && onSave(f)}
        onClose={onClose}
      />
    </Modal>
  );
}
function BondModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || {
    name: "",
    type: "Government",
    faceValue: "",
    coupon: "",
    maturityDate: "",
  });
  return (
    <Modal title={initial ? "Edit Bond" : "Add Bond"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Bond Name">
        <input
          style={input}
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="e.g. G-Sec 7.26% 2033"
        />
      </Field>
      <Field label="Type">
        <select
          style={input}
          value={f.type}
          onChange={(e) => setF({ ...f, type: e.target.value })}
        >
          <option>Government</option>
          <option>Corporate</option>
          <option>Sovereign Gold Bond</option>
          <option>Tax-free</option>
          <option>Other</option>
        </select>
      </Field>
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}
      >
        <Field label="Face Value">
          <input
            style={input}
            type="number"
            value={f.faceValue}
            onChange={(e) => setF({ ...f, faceValue: e.target.value })}
          />
        </Field>
        <Field label="Coupon (%)">
          <input
            style={input}
            type="number"
            step="0.01"
            value={f.coupon}
            onChange={(e) => setF({ ...f, coupon: e.target.value })}
          />
        </Field>
        <Field label="Maturity">
          <input
            style={input}
            type="date"
            value={f.maturityDate}
            onChange={(e) => setF({ ...f, maturityDate: e.target.value })}
          />
        </Field>
      </div>
      <ModalActions
        onSave={() => f.name && f.faceValue && onSave(f)}
        onClose={onClose}
      />
    </Modal>
  );
}
function PPFModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || {
    bank: "",
    balance: "",
    openDate: "",
    thisYearContribution: "",
  });
  return (
    <Modal title={initial ? "Edit PPF Account" : "Add PPF Account"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Bank/Post Office">
        <input
          style={input}
          value={f.bank}
          onChange={(e) => setF({ ...f, bank: e.target.value })}
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Current Balance">
          <input
            style={input}
            type="number"
            value={f.balance}
            onChange={(e) => setF({ ...f, balance: e.target.value })}
          />
        </Field>
        <Field label="Opened On">
          <input
            style={input}
            type="date"
            value={f.openDate}
            onChange={(e) => setF({ ...f, openDate: e.target.value })}
          />
        </Field>
        <Field label="Contribution FY">
          <input
            style={input}
            type="number"
            value={f.thisYearContribution}
            onChange={(e) =>
              setF({ ...f, thisYearContribution: e.target.value })
            }
          />
        </Field>
      </div>
      <ModalActions onSave={() => f.bank && onSave(f)} onClose={onClose} />
    </Modal>
  );
}
function NPSModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || { pran: "", tier: "I", balance: "", contributions: [] });
  return (
    <Modal title={initial ? "Edit NPS Account" : "Add NPS Account"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="PRAN (last 6 ok)">
        <input style={input} value={f.pran} onChange={(e) => setF({ ...f, pran: e.target.value })} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Tier">
          <select style={input} value={f.tier} onChange={(e) => setF({ ...f, tier: e.target.value })}>
            <option>I</option>
            <option>II</option>
          </select>
        </Field>
        <Field label="Current Balance (₹)">
          <input style={input} type="number" value={f.balance} onChange={(e) => setF({ ...f, balance: e.target.value })} />
        </Field>
      </div>
      <ModalActions onSave={() => onSave(f)} onClose={onClose} />
    </Modal>
  );
}
function NPSContributionModal({ onClose, onSave }: any) {
  const [f, setF] = useState({ date: today(), selfAmount: "", employerAmount: "" });
  return (
    <Modal title="Add NPS Contribution" onClose={onClose}>
      <Field label="Date of Investment">
        <input style={input} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Self Contribution (₹)">
          <input style={input} type="number" placeholder="0" value={f.selfAmount} onChange={(e) => setF({ ...f, selfAmount: e.target.value })} />
        </Field>
        <Field label="Employer Contribution (₹)">
          <input style={input} type="number" placeholder="0" value={f.employerAmount} onChange={(e) => setF({ ...f, employerAmount: e.target.value })} />
        </Field>
      </div>
      <ModalActions onSave={() => onSave(f)} onClose={onClose} />
    </Modal>
  );
}
function MFModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || {
    scheme: "",
    type: "Equity",
    units: "",
    invested: "",
    currentNav: "",
    buyDate: "",
  });
  return (
    <Modal title={initial ? "Edit Mutual Fund Holding" : "Add Mutual Fund Holding"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Scheme Name">
        <input
          style={input}
          value={f.scheme}
          onChange={(e) => setF({ ...f, scheme: e.target.value })}
          placeholder="e.g. Parag Parikh Flexi Cap"
        />
      </Field>
      <Field label="Type">
        <select
          style={input}
          value={f.type}
          onChange={(e) => setF({ ...f, type: e.target.value })}
        >
          <option>Equity</option>
          <option>Debt</option>
          <option>Hybrid</option>
          <option>ELSS</option>
          <option>Index</option>
          <option>International</option>
          <option>Liquid</option>
        </select>
      </Field>
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}
      >
        <Field label="Units">
          <input
            style={input}
            type="number"
            step="0.001"
            value={f.units}
            onChange={(e) => setF({ ...f, units: e.target.value })}
          />
        </Field>
        <Field label="Total Invested">
          <input
            style={input}
            type="number"
            value={f.invested}
            onChange={(e) => setF({ ...f, invested: e.target.value })}
          />
        </Field>
        <Field label="Current NAV">
          <input
            style={input}
            type="number"
            step="0.01"
            value={f.currentNav}
            onChange={(e) => setF({ ...f, currentNav: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Purchase Date (optional — enables CAGR calculation)">
        <input style={input} type="date" value={f.buyDate || ""} onChange={(e) => setF({ ...f, buyDate: e.target.value })} />
      </Field>
      <ModalActions
        onSave={() => f.scheme && f.units && onSave(f)}
        onClose={onClose}
      />
    </Modal>
  );
}
function LICModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || {
    policyNumber: "",
    planName: "",
    sumAssured: "",
    annualPremium: "",
    premiumPaid: "",
    maturityDate: "",
  });
  return (
    <Modal title={initial ? "Edit LIC Policy" : "Add LIC Policy"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Policy Number">
        <input
          style={input}
          value={f.policyNumber}
          onChange={(e) => setF({ ...f, policyNumber: e.target.value })}
        />
      </Field>
      <Field label="Plan Name">
        <input
          style={input}
          value={f.planName}
          onChange={(e) => setF({ ...f, planName: e.target.value })}
          placeholder="e.g. Jeevan Anand"
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Sum Assured">
          <input
            style={input}
            type="number"
            value={f.sumAssured}
            onChange={(e) => setF({ ...f, sumAssured: e.target.value })}
          />
        </Field>
        <Field label="Annual Premium">
          <input
            style={input}
            type="number"
            value={f.annualPremium}
            onChange={(e) => setF({ ...f, annualPremium: e.target.value })}
          />
        </Field>
        <Field label="Premium Paid Total">
          <input
            style={input}
            type="number"
            value={f.premiumPaid}
            onChange={(e) => setF({ ...f, premiumPaid: e.target.value })}
          />
        </Field>
        <Field label="Maturity Date">
          <input
            style={input}
            type="date"
            value={f.maturityDate}
            onChange={(e) => setF({ ...f, maturityDate: e.target.value })}
          />
        </Field>
      </div>
      <ModalActions onSave={() => f.planName && onSave(f)} onClose={onClose} />
    </Modal>
  );
}
function TermModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || {
    insurer: "",
    planName: "",
    coverAmount: "",
    annualPremium: "",
    expiryDate: "",
  });
  return (
    <Modal title={initial ? "Edit Term Plan" : "Add Term Plan"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Insurer">
        <input
          style={input}
          value={f.insurer}
          onChange={(e) => setF({ ...f, insurer: e.target.value })}
        />
      </Field>
      <Field label="Plan Name">
        <input
          style={input}
          value={f.planName}
          onChange={(e) => setF({ ...f, planName: e.target.value })}
        />
      </Field>
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}
      >
        <Field label="Cover">
          <input
            style={input}
            type="number"
            value={f.coverAmount}
            onChange={(e) => setF({ ...f, coverAmount: e.target.value })}
          />
        </Field>
        <Field label="Annual Premium">
          <input
            style={input}
            type="number"
            value={f.annualPremium}
            onChange={(e) => setF({ ...f, annualPremium: e.target.value })}
          />
        </Field>
        <Field label="Expires">
          <input
            style={input}
            type="date"
            value={f.expiryDate}
            onChange={(e) => setF({ ...f, expiryDate: e.target.value })}
          />
        </Field>
      </div>
      <ModalActions onSave={() => f.insurer && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

// ================== DEMAT TAB ==================
function DematTab({ state, addItem, removeItem, updateItem }) {
  const [showDemat, setShowDemat] = useState(false);
  const [showStock, setShowStock] = useState(false);
  const [stockDefaults, setStockDefaults] = useState(null);
  const [editStockId, setEditStockId] = useState(null);
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const [marketData, setMarketData] = useState({} as any);
  const [chartData, setChartData] = useState({} as any);
  const [expandedSymbols, setExpandedSymbols] = useState(new Set() as Set<string>);
  const [fetchingChart, setFetchingChart] = useState(null as string | null);

  // Group stocks by (base symbol, exchange)
  const groups: any[] = Object.values(
    state.stocks.reduce((acc: any, s: any) => {
      const base = s.symbol.replace(/\.(NS|BO)$/i, "");
      const exch = s.exchange || "NSE";
      const key = `${base}|${exch}`;
      if (!acc[key]) acc[key] = { base, exchange: exch, yfSym: `${base}.${exch === "BSE" ? "BO" : "NS"}`, lots: [] };
      acc[key].lots.push(s);
      return acc;
    }, {})
  );

  const fetchLivePrices = async () => {
    if (!groups.length || fetchingPrices) return;
    setFetchingPrices(true);
    setFetchError(null);
    try {
      const symbols = groups.map((g) => g.yfSym);
      const res = await fetch(`/api/stock-price?symbols=${symbols.join(",")}`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const newMd: any = { ...marketData };
      let found = 0;
      for (const g of groups) {
        const md = data[g.yfSym];
        if (md?.price != null) {
          newMd[g.yfSym] = md;
          for (const lot of g.lots) {
            updateItem("stocks", lot.id, { currentPrice: String(Number(md.price).toFixed(2)) });
          }
          found++;
        }
      }
      setMarketData(newMd);
      setLastRefreshed(new Date());
      const missed = groups.length - found;
      if (missed > 0) setFetchError(`${missed} symbol(s) not found — check ticker names (e.g. RELIANCE, TCS)`);
      else setFetchError(null);
    } catch (e: any) {
      setFetchError(`Failed to fetch: ${e.message}`);
    } finally {
      setFetchingPrices(false);
    }
  };

  const fetchIntradayChart = async (yfSym: string) => {
    if (chartData[yfSym] || fetchingChart === yfSym) return;
    setFetchingChart(yfSym);
    try {
      const res = await fetch(`/api/stock-chart?symbol=${encodeURIComponent(yfSym)}`);
      if (res.ok) {
        const pts = await res.json();
        setChartData((prev: any) => ({ ...prev, [yfSym]: pts }));
      }
    } catch (_) {}
    setFetchingChart(null);
  };

  const toggleExpand = (yfSym: string) => {
    setExpandedSymbols((prev) => {
      const next = new Set(prev);
      if (next.has(yfSym)) {
        next.delete(yfSym);
      } else {
        next.add(yfSym);
        fetchIntradayChart(yfSym);
      }
      return next;
    });
  };

  const totalValue = state.stocks.reduce((s: number, st: any) => s + Number(st.qty) * Number(st.currentPrice), 0);
  const totalInvested = state.stocks.reduce((s: number, st: any) => s + Number(st.qty) * Number(st.avgPrice), 0);
  const pnl = totalValue - totalInvested;

  const fmtVol = (v: number) => {
    if (!v) return "—";
    if (v >= 1e7) return (v / 1e7).toFixed(2) + "Cr";
    if (v >= 1e5) return (v / 1e5).toFixed(2) + "L";
    if (v >= 1000) return (v / 1000).toFixed(1) + "K";
    return String(v);
  };

  return (
    <div>
      <SectionTitle sub="Brokerage accounts and every scrip you hold">
        Demat & Stocks
      </SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Tile icon={Briefcase} label="Demat Accounts" value={state.demat.length} />
        <Tile icon={BarChart3} label="Portfolio Value" value={fmtINRFull(totalValue)} />
        <Tile icon={TrendingUp} label="Unrealized P&L" value={fmtINRFull(pnl)}
          sub={totalInvested ? `${((pnl / totalInvested) * 100).toFixed(2)}%` : ""}
          subColor={pnl >= 0 ? THEME.sage : THEME.rust}
        />
        <Tile icon={Percent} label="Portfolio Return"
          value={totalInvested ? ((pnl / totalInvested) * 100).toFixed(2) + "%" : "—"}
          sub={`on ${fmtINR(totalInvested)} invested`}
          subColor={pnl >= 0 ? THEME.sage : THEME.rust}
        />
      </div>

      {/* Demat accounts */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700 }}>Demat Accounts</div>
        <button style={btnGhost} onClick={() => setShowDemat(true)}><Plus size={14} /> Add Demat</button>
      </div>
      <Grid>
        {state.demat.length === 0 && <EmptyHint text="Add your brokerage/demat account" />}
        {state.demat.map((d: any) => (
          <InvestCard key={d.id} onRemove={() => removeItem("demat", d.id)}>
            <div style={{ fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: THEME.muted }}>{d.broker}</div>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 700, marginTop: 4 }}>DP ID: {d.dpId || "—"}</div>
            <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>Client ID: {d.clientId || "—"}</div>
          </InvestCard>
        ))}
      </Grid>

      {/* Stock Holdings */}
      <div style={{ marginTop: 40, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700 }}>Stock Holdings</div>
          {lastRefreshed && (
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
              Live prices as of {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
          )}
          {fetchError && <div style={{ fontSize: 11, color: THEME.rust, marginTop: 2 }}>{fetchError}</div>}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button style={{ ...btnGhost, display: "flex", alignItems: "center", gap: 6, opacity: fetchingPrices ? 0.6 : 1 }}
            onClick={fetchLivePrices} disabled={fetchingPrices}>
            <RefreshCw size={13} style={fetchingPrices ? { animation: "spin 1s linear infinite" } : {}} />
            {fetchingPrices ? "Fetching…" : "Refresh Prices"}
          </button>
          <button style={btnSolid} onClick={() => { setStockDefaults(null); setShowStock(true); }}>
            <Plus size={14} /> Add Stock
          </button>
        </div>
      </div>

      {state.stocks.length === 0 ? (
        <div style={card}><EmptyHint text="No stock holdings yet" /></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {groups.map(({ base, exchange, yfSym, lots }) => {
            const md = marketData[yfSym];
            const currentPrice = md?.price ?? Number(lots[0]?.currentPrice ?? 0);
            const totalQty = lots.reduce((s: number, l: any) => s + Number(l.qty), 0);
            const totalInv = lots.reduce((s: number, l: any) => s + Number(l.qty) * Number(l.avgPrice), 0);
            const totalCurr = totalQty * currentPrice;
            const totalPnl = totalCurr - totalInv;
            const totalPnlPct = totalInv ? (totalPnl / totalInv) * 100 : 0;
            const isExpanded = expandedSymbols.has(yfSym);
            const isLive = !!md;
            const charts = chartData[yfSym];
            const changeAmt = md?.change ?? 0;
            const changePct = md?.changePercent ?? 0;

            return (
              <div key={yfSym} style={{ ...card, padding: 0, overflow: "hidden" }}>
                {/* Group header — click to expand */}
                <div
                  style={{ display: "flex", alignItems: "flex-start", flexWrap: "wrap", gap: 12, padding: "14px 18px", cursor: "pointer", borderBottom: isExpanded ? `1px solid ${THEME.line}` : "none" }}
                  onClick={() => toggleExpand(yfSym)}
                >
                  <div style={{ paddingTop: 3, color: THEME.muted, flexShrink: 0 }}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                  <div style={{ flexShrink: 0, minWidth: 160 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "0.02em" }}>{base}</span>
                      <span style={{ fontSize: 10, background: THEME.line, color: THEME.muted, padding: "1px 5px", borderRadius: 3, fontWeight: 600 }}>{exchange}</span>
                      <span style={{ fontSize: 11, color: THEME.muted }}>{lots.length} lot{lots.length > 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
                      ₹{currentPrice.toFixed(2)}
                      {isLive && <span style={{ marginLeft: 5, fontSize: 9, color: THEME.sage, fontWeight: 700, verticalAlign: "middle" }}>●LIVE</span>}
                    </div>
                    {isLive && (
                      <div style={{ fontSize: 12, fontWeight: 600, color: changeAmt >= 0 ? THEME.sage : THEME.rust }}>
                        {changeAmt >= 0 ? "+" : ""}{changeAmt.toFixed(2)} ({changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%)
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1, display: "flex", flexWrap: "wrap", gap: 20, justifyContent: "flex-end", alignItems: "flex-start" }}>
                    {[
                      { label: "Qty", val: String(totalQty) },
                      { label: "Invested", val: fmtINR(totalInv) },
                      { label: "Current", val: fmtINR(totalCurr) },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                        <div style={{ fontWeight: 600, fontSize: 14, fontVariantNumeric: "tabular-nums" }}>{val}</div>
                      </div>
                    ))}
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>P&L</div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: totalPnl >= 0 ? THEME.sage : THEME.rust, fontVariantNumeric: "tabular-nums" }}>
                        {totalPnl >= 0 ? "+" : ""}{fmtINR(totalPnl)}
                      </div>
                      <div style={{ fontSize: 11, color: totalPnl >= 0 ? THEME.sage : THEME.rust }}>
                        {totalPnl >= 0 ? "▲" : "▼"}{Math.abs(totalPnlPct).toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div>
                    {/* Market data bar */}
                    {isLive && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, padding: "10px 18px", background: "rgba(128,128,128,0.06)", borderBottom: `1px solid ${THEME.line}`, fontSize: 12 }}>
                        {md.prevClose != null && (
                          <span><span style={{ color: THEME.muted }}>Prev Close </span><b>₹{md.prevClose.toFixed(2)}</b></span>
                        )}
                        {md.dayHigh != null && md.dayLow != null && (
                          <span>
                            <span style={{ color: THEME.muted }}>Day H/L </span>
                            <b style={{ color: THEME.sage }}>{md.dayHigh.toFixed(2)}</b>
                            <span style={{ color: THEME.muted }}> / </span>
                            <b style={{ color: THEME.rust }}>{md.dayLow.toFixed(2)}</b>
                          </span>
                        )}
                        {md.weekHigh52 != null && md.weekLow52 != null && (
                          <span>
                            <span style={{ color: THEME.muted }}>52W H/L </span>
                            <b style={{ color: THEME.sage }}>{md.weekHigh52.toFixed(2)}</b>
                            <span style={{ color: THEME.muted }}> / </span>
                            <b style={{ color: THEME.rust }}>{md.weekLow52.toFixed(2)}</b>
                          </span>
                        )}
                        {md.volume != null && (
                          <span><span style={{ color: THEME.muted }}>Vol </span><b>{fmtVol(md.volume)}</b></span>
                        )}
                      </div>
                    )}

                    {/* Intraday chart */}
                    {charts && charts.length > 2 ? (
                      <div style={{ padding: "14px 18px", borderBottom: `1px solid ${THEME.line}` }}>
                        <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Intraday Chart</div>
                        <ResponsiveContainer width="100%" height={130}>
                          <AreaChart data={charts} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                            <defs>
                              <linearGradient id={`ig-${base}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={changeAmt >= 0 ? THEME.sage : THEME.rust} stopOpacity={0.35} />
                                <stop offset="95%" stopColor={changeAmt >= 0 ? THEME.sage : THEME.rust} stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--t-muted)" }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                            <YAxis hide domain={["auto", "auto"]} />
                            <Tooltip
                              contentStyle={{ fontSize: 12, background: "var(--t-paper)", border: `1px solid ${THEME.line}`, borderRadius: 6 }}
                              formatter={(v: any) => [`₹${Number(v).toFixed(2)}`, "Price"]}
                              labelStyle={{ color: "var(--t-muted)" }}
                            />
                            <Area type="monotone" dataKey="p"
                              stroke={changeAmt >= 0 ? THEME.sage : THEME.rust}
                              strokeWidth={1.5}
                              fill={`url(#ig-${base})`}
                              dot={false}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    ) : fetchingChart === yfSym ? (
                      <div style={{ padding: "12px 18px", fontSize: 12, color: THEME.muted, borderBottom: `1px solid ${THEME.line}` }}>
                        Loading chart…
                      </div>
                    ) : charts != null ? (
                      <div style={{ padding: "10px 18px", fontSize: 11, color: THEME.muted, borderBottom: `1px solid ${THEME.line}` }}>
                        Chart unavailable — market may be closed or no data for this session
                      </div>
                    ) : null}

                    {/* Per-lot table */}
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: `2px solid ${THEME.line}` }}>
                            <th style={{ ...th, paddingLeft: 18 }}>Broker</th>
                            <th style={{ ...th, textAlign: "right" }}>Qty</th>
                            <th style={{ ...th, textAlign: "right" }}>Buy Price</th>
                            <th style={{ ...th, textAlign: "right" }}>Buy Date</th>
                            <th style={{ ...th, textAlign: "right" }}>Invested</th>
                            {isLive && <th style={{ ...th, textAlign: "right" }}>Day Gain</th>}
                            <th style={{ ...th, textAlign: "right" }}>Overall Gain</th>
                            <th style={{ ...th, textAlign: "right" }}>Curr Value</th>
                            <th style={th}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {lots.map((lot: any) => {
                            const lInv = Number(lot.qty) * Number(lot.avgPrice);
                            const lCurr = Number(lot.qty) * currentPrice;
                            const lPnl = lCurr - lInv;
                            const lPnlPct = lInv ? (lPnl / lInv) * 100 : 0;
                            const lDayGain = isLive ? Number(lot.qty) * changeAmt : null;
                            const demat = state.demat.find((d: any) => d.id === lot.dematId);
                            return (
                              <tr key={lot.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}>
                                <td style={{ ...td, paddingLeft: 18, color: THEME.muted, fontSize: 12 }}>{demat?.broker || "—"}</td>
                                <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{lot.qty}</td>
                                <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>₹{Number(lot.avgPrice).toFixed(2)}</td>
                                <td style={{ ...td, textAlign: "right", color: THEME.muted, fontSize: 12 }}>
                                  {lot.buyDate ? new Date(lot.buyDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—"}
                                </td>
                                <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINR(lInv)}</td>
                                {isLive && (
                                  <td style={{ ...td, textAlign: "right", color: (lDayGain ?? 0) >= 0 ? THEME.sage : THEME.rust, fontVariantNumeric: "tabular-nums" }}>
                                    {(lDayGain ?? 0) >= 0 ? "+" : ""}{fmtINR(lDayGain ?? 0)}
                                    <br /><span style={{ fontSize: 11 }}>({changePct >= 0 ? "+" : ""}{changePct.toFixed(2)}%)</span>
                                  </td>
                                )}
                                <td style={{ ...td, textAlign: "right", color: lPnl >= 0 ? THEME.sage : THEME.rust, fontVariantNumeric: "tabular-nums" }}>
                                  {lPnl >= 0 ? "+" : ""}{fmtINR(lPnl)}
                                  <br /><span style={{ fontSize: 11 }}>{lPnl >= 0 ? "▲" : "▼"}{Math.abs(lPnlPct).toFixed(2)}%</span>
                                  {lot.buyDate && (() => {
                                    const cagr = calcCAGR(lInv, lCurr, lot.buyDate);
                                    return cagr !== null ? (
                                      <span style={{ fontSize: 10, display: "block", color: cagr >= 15 ? THEME.sage : cagr >= 8 ? THEME.gold : THEME.rust, fontWeight: 700 }}>
                                        CAGR {cagr >= 0 ? "+" : ""}{cagr.toFixed(1)}%/yr
                                      </span>
                                    ) : null;
                                  })()}
                                </td>
                                <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINR(lCurr)}</td>
                                <td style={td}>
                                  <div style={{ display: "flex", gap: 2 }}>
                                    <button onClick={(e) => { e.stopPropagation(); setEditStockId(lot.id); }} style={iconBtn}><Edit3 size={13} /></button>
                                    <button onClick={(e) => { e.stopPropagation(); removeItem("stocks", lot.id); }} style={iconBtn}><Trash2 size={13} /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Add lot footer */}
                    <div style={{ padding: "10px 18px", borderTop: `1px solid ${THEME.line}` }}>
                      <button
                        style={{ ...btnGhost, fontSize: 12 }}
                        onClick={(e) => { e.stopPropagation(); setStockDefaults({ symbol: base, exchange, dematId: lots[0]?.dematId }); setShowStock(true); }}
                      >
                        <Plus size={12} /> Add Lot to {base}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showDemat && (
        <DematModal onClose={() => setShowDemat(false)} onSave={(v: any) => { addItem("demat", v); setShowDemat(false); }} />
      )}
      {showStock && (
        <StockModal
          demats={state.demat}
          defaults={stockDefaults}
          onClose={() => { setShowStock(false); setStockDefaults(null); }}
          onSave={(v: any) => { addItem("stocks", v); setShowStock(false); setStockDefaults(null); }}
        />
      )}
      {editStockId && (
        <StockModal
          demats={state.demat}
          initial={state.stocks.find((x: any) => x.id === editStockId)}
          onClose={() => setEditStockId(null)}
          onSave={(v: any) => { updateItem("stocks", editStockId, v); setEditStockId(null); }}
        />
      )}
    </div>
  );
}

function DematModal({ onClose, onSave }) {
  const [f, setF] = useState({ broker: "", dpId: "", clientId: "" });
  return (
    <Modal title="Add Demat Account" onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Broker">
        <input
          style={input}
          value={f.broker}
          onChange={(e) => setF({ ...f, broker: e.target.value })}
          placeholder="e.g. Zerodha, Groww"
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="DP ID">
          <input
            style={input}
            value={f.dpId}
            onChange={(e) => setF({ ...f, dpId: e.target.value })}
          />
        </Field>
        <Field label="Client ID">
          <input
            style={input}
            value={f.clientId}
            onChange={(e) => setF({ ...f, clientId: e.target.value })}
          />
        </Field>
      </div>
      <ModalActions onSave={() => f.broker && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function StockModal({ demats, onClose, onSave, initial = null, defaults = null }: any) {
  const [f, setF] = useState(initial || {
    symbol: defaults?.symbol || "",
    exchange: defaults?.exchange || "NSE",
    dematId: defaults?.dematId || demats[0]?.id || "",
    qty: "",
    avgPrice: "",
    currentPrice: "",
    buyDate: "",
  });
  return (
    <Modal title={initial ? "Edit Stock" : "Add Stock"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
        <Field label="Symbol">
          <input
            style={input}
            value={f.symbol}
            onChange={(e) => setF({ ...f, symbol: e.target.value.toUpperCase().replace(/\.(NS|BO)$/i, "") })}
            placeholder="e.g. RELIANCE"
          />
        </Field>
        <Field label="Exchange">
          <select style={{ ...input, width: 90 }} value={f.exchange || "NSE"} onChange={e => setF({ ...f, exchange: e.target.value })}>
            <option value="NSE">NSE</option>
            <option value="BSE">BSE</option>
          </select>
        </Field>
      </div>
      <Field label="Demat Account">
        <select
          style={input}
          value={f.dematId}
          onChange={(e) => setF({ ...f, dematId: e.target.value })}
        >
          {demats.length === 0 && <option value="">Add demat first</option>}
          {demats.map((d) => (
            <option key={d.id} value={d.id}>
              {d.broker}
            </option>
          ))}
        </select>
      </Field>
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}
      >
        <Field label="Quantity">
          <input
            style={input}
            type="number"
            value={f.qty}
            onChange={(e) => setF({ ...f, qty: e.target.value })}
          />
        </Field>
        <Field label="Avg Price">
          <input
            style={input}
            type="number"
            step="0.01"
            value={f.avgPrice}
            onChange={(e) => setF({ ...f, avgPrice: e.target.value })}
          />
        </Field>
        <Field label="Current Price">
          <input
            style={input}
            type="number"
            step="0.01"
            value={f.currentPrice}
            onChange={(e) => setF({ ...f, currentPrice: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Buy Date (optional — enables CAGR calculation)">
        <input style={input} type="date" value={f.buyDate || ""} onChange={(e) => setF({ ...f, buyDate: e.target.value })} />
      </Field>
      <ModalActions
        onSave={() => f.symbol && f.qty && onSave(f)}
        onClose={onClose}
      />
    </Modal>
  );
}

// ================== CREDIT & LOANS TAB ==================
function CreditTab({ state, addItem, removeItem, updateItem }) {
  const [sub, setSub] = useState("cc");
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);

  const subs = [
    { id: "cc", label: "Credit Cards", key: "creditCards" },
    { id: "prepaid", label: "Prepaid Cards", key: "prepaidCards" },
    { id: "taken", label: "Loans Taken", key: "loansTaken" },
    { id: "given", label: "Loans Given", key: "loansGiven" },
  ];

  return (
    <div>
      <SectionTitle sub="Cards, debts owed, and debts owed to you">
        Credit & Loans
      </SectionTitle>

      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 24,
          borderBottom: `1px solid ${THEME.line}`,
        }}
      >
        {subs.map((s) => {
          const active = sub === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSub(s.id)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "10px 20px",
                fontFamily: "inherit",
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: active ? THEME.accent : THEME.muted,
                borderBottom: `2px solid ${
                  active ? THEME.accent : "transparent"
                }`,
                fontWeight: active ? 700 : 500,
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <button style={btnSolid} onClick={() => setModal(sub)}>
          <Plus size={14} /> Add
        </button>
      </div>

      {sub === "cc" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
            <div style={card}>
              <div style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Total Credit Limit</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: THEME.accent, marginTop: 4 }}>
                {fmtINRFull(state.creditCards.reduce((acc, c) => acc + (Number(c.limit) || 0), 0))}
              </div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Total Outstanding</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: THEME.rust, marginTop: 4 }}>
                {fmtINRFull(state.creditCards.reduce((acc, c) => acc + (Number(c.outstanding) || 0), 0))}
              </div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Available Credit</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: THEME.sage, marginTop: 4 }}>
                {fmtINRFull(state.creditCards.reduce((acc, c) => acc + (Number(c.limit) || 0) - (Number(c.outstanding) || 0), 0))}
              </div>
            </div>
          </div>
          <CCList 
            items={state.creditCards} 
            onRemove={(id) => removeItem("creditCards", id)} 
            onEdit={setEditId}
            onUpdateCard={(id, updates) => updateItem("creditCards", id, updates)}
          />
        </>
      )}
      {sub === "prepaid" && (
        <PrepaidList items={state.prepaidCards} onRemove={(id) => removeItem("prepaidCards", id)} onEdit={setEditId} />
      )}
      {sub === "taken" && (
        <>
          <LoanTakenList items={state.loansTaken} onRemove={(id) => removeItem("loansTaken", id)} onEdit={setEditId} />
          {state.loansTaken.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Payoff Progress</div>
              <div style={{ display: "grid", gap: 16 }}>
                {state.loansTaken.map((l) => {
                  const principal = Number(l.principal) || 0;
                  const outstanding = Number(l.outstanding) || 0;
                  const emi = Number(l.emi) || 0;
                  const months = Number(l.monthsRemaining) || 0;
                  const paid = principal - outstanding;
                  const paidPct = principal > 0 ? (paid / principal) * 100 : 0;
                  const totalRemaining = emi * months;
                  const interestRemaining = Math.max(0, totalRemaining - outstanding);
                  const r = (Number(l.rate) || 0) / 12 / 100;
                  const startMonths = r > 0 && emi > 0 ? Math.round(Math.log(emi / (emi - outstanding * r)) / Math.log(1 + r)) : months;
                  const payoffDate = new Date();
                  payoffDate.setMonth(payoffDate.getMonth() + months);
                  return (
                    <div key={l.id} style={{ ...card as any }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                        <div>
                          <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: THEME.muted }}>{l.type || "Loan"}</div>
                          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{l.lender}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 22, fontWeight: 800, color: THEME.rust }}>{fmtINRFull(outstanding)}</div>
                          <div style={{ fontSize: 11, color: THEME.muted }}>outstanding</div>
                        </div>
                      </div>
                      <div style={{ height: 10, background: THEME.line, borderRadius: 5, overflow: "hidden", marginBottom: 8 }}>
                        <div style={{ height: "100%", width: Math.min(paidPct, 100) + "%", background: paidPct > 60 ? THEME.sage : paidPct > 30 ? THEME.gold : THEME.rust, borderRadius: 5, transition: "width 0.6s" }} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, fontSize: 12 }}>
                        <div><div style={{ color: THEME.muted, marginBottom: 2 }}>Principal paid</div><div style={{ fontWeight: 700, color: THEME.sage }}>{fmtINR(paid)}</div></div>
                        <div><div style={{ color: THEME.muted, marginBottom: 2 }}>EMI</div><div style={{ fontWeight: 700 }}>{fmtINR(emi)}/mo</div></div>
                        <div><div style={{ color: THEME.muted, marginBottom: 2 }}>Interest remaining</div><div style={{ fontWeight: 700, color: THEME.rust }}>{fmtINR(interestRemaining)}</div></div>
                        <div><div style={{ color: THEME.muted, marginBottom: 2 }}>Payoff date</div><div style={{ fontWeight: 700 }}>{months > 0 ? payoffDate.toLocaleString("en-IN", { month: "short", year: "numeric" }) : "—"}</div></div>
                      </div>
                      <div style={{ marginTop: 10, fontSize: 12, color: THEME.muted }}>{paidPct.toFixed(1)}% of principal repaid · {months} months left</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
      {sub === "given" && (
        <LoanGivenList items={state.loansGiven} onRemove={(id) => removeItem("loansGiven", id)} onEdit={setEditId} />
      )}

      {modal === "cc" && (
        <CCModal
          onClose={() => setModal(null)}
          onSave={(v) => {
            addItem("creditCards", v);
            setModal(null);
          }}
        />
      )}
      {modal === "prepaid" && (
        <PrepaidModal
          onClose={() => setModal(null)}
          onSave={(v) => {
            addItem("prepaidCards", v);
            setModal(null);
          }}
        />
      )}
      {modal === "taken" && (
        <LoanTakenModal
          onClose={() => setModal(null)}
          onSave={(v) => {
            addItem("loansTaken", v);
            setModal(null);
          }}
        />
      )}
      {modal === "given" && (
        <LoanGivenModal
          onClose={() => setModal(null)}
          onSave={(v) => {
            addItem("loansGiven", v);
            setModal(null);
          }}
        />
      )}

      {editId && sub === "cc" && (
        <CCModal initial={state.creditCards.find(x => x.id === editId)} onClose={() => setEditId(null)}
          onSave={(v) => { updateItem("creditCards", editId, v); setEditId(null); }} />
      )}
      {editId && sub === "prepaid" && (
        <PrepaidModal initial={state.prepaidCards.find(x => x.id === editId)} onClose={() => setEditId(null)}
          onSave={(v) => { updateItem("prepaidCards", editId, v); setEditId(null); }} />
      )}
      {editId && sub === "taken" && (
        <LoanTakenModal initial={state.loansTaken.find(x => x.id === editId)} onClose={() => setEditId(null)}
          onSave={(v) => { updateItem("loansTaken", editId, v); setEditId(null); }} />
      )}
      {editId && sub === "given" && (
        <LoanGivenModal initial={state.loansGiven.find(x => x.id === editId)} onClose={() => setEditId(null)}
          onSave={(v) => { updateItem("loansGiven", editId, v); setEditId(null); }} />
      )}
    </div>
  );
}

function CCList({ items, onRemove, onEdit, onUpdateCard }: any) {
  const [selectedLedger, setSelectedLedger] = useState<string | null>(null);

  if (!items.length) return <EmptyHint text="No credit cards yet" />;
  
  const selectedCard = items.find(c => c.id === selectedLedger);

  return (
    <div>
      <Grid>
        {items.map((c) => {
          const util = Number(c.limit)
            ? (Number(c.outstanding) / Number(c.limit)) * 100
            : 0;
          return (
            <div
              key={c.id}
              style={{
                ...cardDark,
                position: "relative",
                background: `linear-gradient(135deg, ${THEME.ink} 0%, #1A2A42 100%)`,
                paddingBottom: 60,
              }}
            >
              <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 4 }}>
                <button onClick={() => onEdit(c.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(245,239,227,0.6)" }}>
                  <Edit3 size={14} />
                </button>
                <button onClick={() => onRemove(c.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(245,239,227,0.6)" }}>
                  <Trash2 size={14} />
                </button>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: THEME.gold }}>
                  {c.network || "Card"}
                </div>
                <OwnerBadge owner={c.owner} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>
                {c.issuer}
              </div>
              <div style={{ fontSize: 16, letterSpacing: "0.05em", marginTop: 12, opacity: 0.8 }}>
                •••• •••• •••• {c.last4 || "****"}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20, fontSize: 12 }}>
                <div>
                  <div style={{ color: "rgba(245,239,227,0.6)", fontSize: 9, textTransform: "uppercase" }}>Outstanding</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{fmtINRFull(c.outstanding)}</div>
                </div>
                <div>
                  <div style={{ color: "rgba(245,239,227,0.6)", fontSize: 9, textTransform: "uppercase" }}>Limit</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{fmtINRFull(c.limit)}</div>
                </div>
              </div>

              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 11, color: "rgba(245,239,227,0.7)" }}>
                <div>Bill Date: <strong>{c.billDate || "—"}th</strong></div>
                <div>Due Day: <strong>{c.dueDay || "—"}th</strong></div>
                <div>Fee: <strong>{fmtINR(c.annualFee)}</strong></div>
                <div>Helpline: <strong>{c.helpline || "—"}</strong></div>
              </div>

              {c.waiverInfo && (
                <div style={{ marginTop: 12, fontSize: 10, background: "rgba(255,255,255,0.05)", padding: "6px 10px", borderRadius: 6, color: THEME.gold }}>
                  Waiver: {c.waiverInfo}
                </div>
              )}

              <div style={{ marginTop: 16 }}>
                <div style={{ height: 4, background: "rgba(245,239,227,0.15)", borderRadius: 2 }}>
                  <div style={{ height: "100%", width: `${Math.min(util, 100)}%`, background: util > 70 ? THEME.rust : THEME.gold, borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: 10, color: util > 70 ? THEME.rust : "rgba(245,239,227,0.6)", marginTop: 6 }}>
                  {util.toFixed(1)}% utilization
                </div>
              </div>

              <button 
                onClick={() => setSelectedLedger(c.id)}
                style={{
                  position: "absolute", bottom: 0, left: 0, right: 0, height: 44,
                  background: "rgba(255,255,255,0.05)", border: "none", borderTop: `1px solid rgba(255,255,255,0.1)`,
                  color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 12,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8
                }}
              >
                <List size={14} /> View Transactions ({c.transactions?.length || 0})
              </button>
            </div>
          );
        })}
      </Grid>

      {selectedLedger && selectedCard && (
        <CCTransactionLedger 
          card={selectedCard} 
          onClose={() => setSelectedLedger(null)}
          onUpdate={(newTransactions) => {
            const newOutstanding = newTransactions.reduce((acc, t) => acc + Number(t.amount), 0);
            onUpdateCard(selectedLedger, { transactions: newTransactions, outstanding: String(newOutstanding) });
          }}
        />
      )}
    </div>
  );
}

function CCTransactionLedger({ card, onClose, onUpdate }: any) {
  const [txs, setTxs] = useState(card.transactions || []);
  const [showAdd, setShowAdd] = useState(false);
  const [newTx, setNewTx] = useState({ date: today(), merchant: "", amount: "", category: "General" });
  const [editId, setEditId] = useState<string | null>(null);

  const saveTx = () => {
    if (!newTx.merchant || !newTx.amount) return;
    let updated;
    if (editId) {
      updated = txs.map(t => t.id === editId ? { ...newTx, id: editId } : t);
    } else {
      updated = [...txs, { ...newTx, id: uid() }];
    }
    setTxs(updated);
    onUpdate(updated);
    setShowAdd(false);
    setEditId(null);
    setNewTx({ date: today(), merchant: "", amount: "", category: "General" });
  };

  const removeTx = (id) => {
    const updated = txs.filter(t => t.id !== id);
    setTxs(updated);
    onUpdate(updated);
  };

  const startEdit = (t) => {
    setNewTx({ date: t.date, merchant: t.merchant, amount: t.amount, category: t.category });
    setEditId(t.id);
    setShowAdd(true);
  };

  return (
    <Modal title={`${card.issuer} - Transactions`} onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Recent Ledger</div>
        <button 
          style={{ ...btnGhost, padding: "6px 12px", fontSize: 12 }} 
          onClick={() => {
            if (showAdd) {
              setShowAdd(false);
              setEditId(null);
              setNewTx({ date: today(), merchant: "", amount: "", category: "General" });
            } else {
              setShowAdd(true);
            }
          }}
        >
          {showAdd ? "Cancel" : <><Plus size={14} /> Add Transaction</>}
        </button>
      </div>

      {showAdd && (
        <div style={{ ...card, background: THEME.darkInk, border: `1px solid ${THEME.line}`, marginBottom: 16, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: THEME.accent }}>{editId ? "EDIT TRANSACTION" : "NEW TRANSACTION"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Field label="Date"><input type="date" style={input} value={newTx.date} onChange={e => setNewTx({...newTx, date: e.target.value})} /></Field>
            <Field label="Amount"><input type="number" style={input} value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})} placeholder="0.00" /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Field label="Merchant"><input type="text" style={input} value={newTx.merchant} onChange={e => setNewTx({...newTx, merchant: e.target.value})} placeholder="e.g. Amazon" /></Field>
            <Field label="Category"><input type="text" style={input} value={newTx.category} onChange={e => setNewTx({...newTx, category: e.target.value})} placeholder="e.g. Food" /></Field>
          </div>
          <button style={{ ...btnAccent, width: "100%" }} onClick={saveTx}>{editId ? "Update Transaction" : "Save Transaction"}</button>
        </div>
      )}

      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: `1px solid ${THEME.line}`, color: THEME.muted }}>
              <th style={{ padding: "10px 8px" }}>Date</th>
              <th style={{ padding: "10px 8px" }}>Merchant</th>
              <th style={{ padding: "10px 8px" }}>Category</th>
              <th style={{ padding: "10px 8px", textAlign: "right" }}>Amount</th>
              <th style={{ padding: "10px 8px", width: 70 }}></th>
            </tr>
          </thead>
          <tbody>
            {txs.sort((a,b) => b.date.localeCompare(a.date)).map(t => (
              <tr key={t.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                <td style={{ padding: "12px 8px" }}>{t.date}</td>
                <td style={{ padding: "12px 8px", fontWeight: 600 }}>{t.merchant}</td>
                <td style={{ padding: "12px 8px" }}><span style={{ background: THEME.paper, padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>{t.category}</span></td>
                <td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 700 }}>{fmtINR(t.amount)}</td>
                <td style={{ padding: "12px 8px", textAlign: "right" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => startEdit(t)} style={{ background: "transparent", border: "none", color: THEME.muted, cursor: "pointer" }}><Edit3 size={14} /></button>
                    <button onClick={() => removeTx(t.id)} style={{ background: "transparent", border: "none", color: THEME.rust, cursor: "pointer" }}><X size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!txs.length && (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: THEME.muted }}>No transactions found for this card</td></tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: `2px solid ${THEME.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 14, color: THEME.muted }}>Total Ledger Outstanding</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: THEME.rust }}>
          {fmtINRFull(txs.reduce((acc, t) => acc + Number(t.amount), 0))}
        </div>
      </div>
    </Modal>
  );
}

function PrepaidList({ items, onRemove, onEdit }: any) {
  if (!items.length) return <EmptyHint text="No prepaid cards/wallets" />;
  return (
    <Grid>
      {items.map((p) => (
        <InvestCard key={p.id} onRemove={() => onRemove(p.id)} onEdit={() => onEdit(p.id)}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: THEME.muted,
            }}
          >
            {p.provider}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 20,
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            {p.name}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 24,
              fontWeight: 800,
              marginTop: 12,
            }}
          >
            {fmtINRFull(p.balance)}
          </div>
        </InvestCard>
      ))}
    </Grid>
  );
}

function LoanTakenList({ items, onRemove, onEdit }: any) {
  if (!items.length) return <EmptyHint text="No loans taken" />;
  return (
    <Grid>
      {items.map((l) => (
        <InvestCard key={l.id} onRemove={() => onRemove(l.id)} onEdit={() => onEdit(l.id)}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: THEME.accent,
            }}
          >
            {l.type || "Loan"}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 18,
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            {l.lender}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 22,
              fontWeight: 800,
              marginTop: 12,
              color: THEME.accent,
            }}
          >
            {fmtINRFull(l.outstanding)}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 12,
              fontSize: 12,
            }}
          >
            <Stat k="Principal" v={fmtINR(l.principal)} />
            <Stat k="EMI" v={fmtINR(l.emi)} />
            <Stat k="Rate" v={`${l.rate}%`} />
            <Stat k="Tenure Left" v={`${l.monthsRemaining || "—"} mo`} />
          </div>
        </InvestCard>
      ))}
    </Grid>
  );
}

function LoanGivenList({ items, onRemove, onEdit }: any) {
  if (!items.length) return <EmptyHint text="No loans given" />;
  return (
    <Grid>
      {items.map((l) => (
        <InvestCard key={l.id} onRemove={() => onRemove(l.id)} onEdit={() => onEdit(l.id)}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: THEME.sage,
            }}
          >
            Receivable
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 18,
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            {l.borrower}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 22,
              fontWeight: 800,
              marginTop: 12,
              color: THEME.sage,
            }}
          >
            {fmtINRFull(l.outstanding)}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 12,
              fontSize: 12,
            }}
          >
            <Stat k="Principal" v={fmtINR(l.principal)} />
            <Stat k="Rate" v={l.rate ? `${l.rate}%` : "—"} />
            <Stat k="Given on" v={l.date || "—"} />
            <Stat k="Due" v={l.dueDate || "—"} />
          </div>
          {l.note && (
            <div
              style={{
                fontSize: 12,
                color: THEME.muted,
                marginTop: 8,
                fontStyle: "normal",
              }}
            >
              "{l.note}"
            </div>
          )}
        </InvestCard>
      ))}
    </Grid>
  );
}

function CCModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || {
    issuer: "",
    network: "Visa",
    last4: "",
    limit: "",
    outstanding: "0",
    billDate: "",
    dueDay: "",
    annualFee: "0",
    waiverInfo: "",
    helpline: "",
    transactions: [],
  });
  return (
    <Modal title={initial ? "Edit Credit Card" : "Add Credit Card"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <Field label="Issuer">
          <input style={input} value={f.issuer} onChange={(e) => setF({ ...f, issuer: e.target.value })} placeholder="e.g. HDFC Regalia" />
        </Field>
        <Field label="Network">
          <select style={input} value={f.network} onChange={(e) => setF({ ...f, network: e.target.value })}>
            <option>Visa</option>
            <option>Mastercard</option>
            <option>Amex</option>
            <option>RuPay</option>
            <option>Diners</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <Field label="Last 4 digits">
          <input style={input} maxLength={4} value={f.last4} onChange={(e) => setF({ ...f, last4: e.target.value })} />
        </Field>
        <Field label="Credit Limit">
          <input style={input} type="number" value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value })} />
        </Field>
        <Field label="Outstanding">
          <input style={input} type="number" value={f.outstanding} onChange={(e) => setF({ ...f, outstanding: e.target.value })} />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Statement Date (Day of Month)">
          <input style={input} type="number" min="1" max="31" placeholder="e.g. 20" value={f.billDate} onChange={(e) => setF({ ...f, billDate: e.target.value })} />
        </Field>
        <Field label="Due Day (Day of Month)">
          <input style={input} type="number" min="1" max="31" placeholder="e.g. 10" value={f.dueDay} onChange={(e) => setF({ ...f, dueDay: e.target.value })} />
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Annual Fee">
          <input style={input} type="number" value={f.annualFee} onChange={(e) => setF({ ...f, annualFee: e.target.value })} />
        </Field>
        <Field label="Helpline Number">
          <input style={input} value={f.helpline} onChange={(e) => setF({ ...f, helpline: e.target.value })} placeholder="1800-xxx-xxxx" />
        </Field>
      </div>
      <Field label="Waiver Details (How and When)">
        <textarea style={{ ...input, height: 60, resize: "none" }} value={f.waiverInfo} onChange={(e) => setF({ ...f, waiverInfo: e.target.value })} placeholder="e.g. Spend 1L in a year to waive off annual fee" />
      </Field>
      <ModalActions onSave={() => f.issuer && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function PrepaidModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || { provider: "", name: "", balance: "" });
  return (
    <Modal title={initial ? "Edit Prepaid Card / Wallet" : "Add Prepaid Card / Wallet"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Provider">
        <input
          style={input}
          value={f.provider}
          onChange={(e) => setF({ ...f, provider: e.target.value })}
          placeholder="e.g. Paytm, Amazon Pay, Forex card"
        />
      </Field>
      <Field label="Name/Label">
        <input
          style={input}
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
      </Field>
      <Field label="Balance">
        <input
          style={input}
          type="number"
          value={f.balance}
          onChange={(e) => setF({ ...f, balance: e.target.value })}
        />
      </Field>
      <ModalActions onSave={() => f.provider && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function LoanTakenModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || {
    lender: "",
    type: "Personal",
    principal: "",
    outstanding: "",
    emi: "",
    rate: "",
    monthsRemaining: "",
  });
  return (
    <Modal title={initial ? "Edit Loan Taken" : "Add Loan Taken"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Lender">
        <input
          style={input}
          value={f.lender}
          onChange={(e) => setF({ ...f, lender: e.target.value })}
        />
      </Field>
      <Field label="Type">
        <select
          style={input}
          value={f.type}
          onChange={(e) => setF({ ...f, type: e.target.value })}
        >
          <option>Personal</option>
          <option>Home</option>
          <option>Car</option>
          <option>Education</option>
          <option>Gold</option>
          <option>Business</option>
          <option>Other</option>
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Original Principal">
          <input
            style={input}
            type="number"
            value={f.principal}
            onChange={(e) => setF({ ...f, principal: e.target.value })}
          />
        </Field>
        <Field label="Outstanding">
          <input
            style={input}
            type="number"
            value={f.outstanding}
            onChange={(e) => setF({ ...f, outstanding: e.target.value })}
          />
        </Field>
        <Field label="EMI">
          <input
            style={input}
            type="number"
            value={f.emi}
            onChange={(e) => setF({ ...f, emi: e.target.value })}
          />
        </Field>
        <Field label="Interest Rate (%)">
          <input
            style={input}
            type="number"
            step="0.01"
            value={f.rate}
            onChange={(e) => setF({ ...f, rate: e.target.value })}
          />
        </Field>
        <Field label="Months Remaining">
          <input
            style={input}
            type="number"
            value={f.monthsRemaining}
            onChange={(e) => setF({ ...f, monthsRemaining: e.target.value })}
          />
        </Field>
      </div>
      <ModalActions onSave={() => f.lender && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function LoanGivenModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || {
    borrower: "",
    principal: "",
    outstanding: "",
    rate: "",
    date: today(),
    dueDate: "",
    note: "",
  });
  return (
    <Modal title={initial ? "Edit Loan Given" : "Record Loan Given"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Borrower Name">
        <input
          style={input}
          value={f.borrower}
          onChange={(e) => setF({ ...f, borrower: e.target.value })}
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Principal">
          <input
            style={input}
            type="number"
            value={f.principal}
            onChange={(e) => setF({ ...f, principal: e.target.value })}
          />
        </Field>
        <Field label="Outstanding">
          <input
            style={input}
            type="number"
            value={f.outstanding}
            onChange={(e) => setF({ ...f, outstanding: e.target.value })}
          />
        </Field>
        <Field label="Interest %">
          <input
            style={input}
            type="number"
            step="0.01"
            value={f.rate}
            onChange={(e) => setF({ ...f, rate: e.target.value })}
          />
        </Field>
        <Field label="Given On">
          <input
            style={input}
            type="date"
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
          />
        </Field>
        <Field label="Due By">
          <input
            style={input}
            type="date"
            value={f.dueDate}
            onChange={(e) => setF({ ...f, dueDate: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Note">
        <input
          style={input}
          value={f.note}
          onChange={(e) => setF({ ...f, note: e.target.value })}
        />
      </Field>
      <ModalActions
        onSave={() => f.borrower && f.principal && onSave(f)}
        onClose={onClose}
      />
    </Modal>
  );
}

// ================== SUBSCRIPTIONS TAB ==================
function SubsTab({ state, addItem, removeItem, updateItem, metrics }) {
  const [show, setShow] = useState(false);
  const [editSub, setEditSub] = useState(null);
  const annual = metrics.subTotal * 12;
  const activeSubs = state.subscriptions.filter(s => !s.paused).length;

  return (
    <div>
      <SectionTitle sub="Recurring charges that quietly drain the ledger">
        Subscriptions
      </SectionTitle>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <Tile
          icon={Repeat}
          label="Active Subs"
          value={activeSubs}
        />
        <Tile
          icon={Calendar}
          label="Monthly"
          value={fmtINRFull(metrics.subTotal)}
        />
        <Tile icon={Calculator} label="Annualised" value={fmtINRFull(annual)} />
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <button style={btnSolid} onClick={() => setShow(true)}>
          <Plus size={14} /> Add Subscription
        </button>
      </div>

      {state.subscriptions.length === 0 ? (
        <div style={card}>
          <EmptyHint text="Netflix, Spotify, iCloud, newspaper… add them all" />
        </div>
      ) : (
        <div style={card}>
          <div style={{ overflowX: "auto" }}><table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}
          >
            <thead>
              <tr style={{ borderBottom: `2px solid ${THEME.ink}` }}>
                <th style={th}>Service</th>
                <th style={th}>Category</th>
                <th style={th}>Cycle</th>
                <th style={th}>Next Renewal</th>
                <th style={{ ...th, textAlign: "right" }}>Amount</th>
                <th style={{ ...th, textAlign: "right" }}>Monthly Equiv</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {state.subscriptions.map((s) => {
                const monthly =
                  s.cycle === "yearly"
                    ? Number(s.amount) / 12
                    : s.cycle === "quarterly"
                    ? Number(s.amount) / 3
                    : Number(s.amount);
                return (
                  <tr
                    key={s.id}
                    style={{ borderBottom: `1px dashed ${THEME.line}`, opacity: s.paused ? 0.5 : 1 }}
                  >
                    <td style={{ ...td, fontWeight: 600 }}>
                      {s.name}
                      {s.paused && <span style={{ marginLeft: 8, fontSize: 10, padding: "2px 6px", background: THEME.muted, color: THEME.paper, borderRadius: 4, letterSpacing: "0.1em" }}>PAUSED</span>}
                    </td>
                    <td style={{ ...td, color: THEME.muted, fontSize: 12 }}>
                      {s.category}
                    </td>
                    <td style={{ ...td, textTransform: "capitalize" }}>
                      {s.cycle}
                    </td>
                    <td style={td}>{s.renewalDate || "—"}</td>
                    <td
                      style={{
                        ...td,
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmtINRFull(s.amount)}
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                        color: THEME.muted,
                      }}
                    >
                      {fmtINRFull(monthly)}
                    </td>
                    <td style={{ ...td, display: "flex", gap: 6 }}>
                      <button
                        onClick={() => updateItem("subscriptions", s.id, { paused: !s.paused })}
                        style={{ ...iconBtn, color: s.paused ? THEME.sage : THEME.gold }}
                        title={s.paused ? "Resume" : "Pause"}
                      >
                        {s.paused ? <Play size={13} /> : <Pause size={13} />}
                      </button>
                      <button onClick={() => setEditSub(s)} style={iconBtn} title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => removeItem("subscriptions", s.id)}
                        style={iconBtn}
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table></div>
        </div>
      )}

      {show && (
        <SubModal
          onClose={() => setShow(false)}
          onSave={(v) => {
            addItem("subscriptions", v);
            setShow(false);
          }}
        />
      )}
      {editSub && (
        <SubModal
          initialValues={editSub}
          onClose={() => setEditSub(null)}
          onSave={(v) => {
            updateItem("subscriptions", editSub.id, v);
            setEditSub(null);
          }}
        />
      )}
    </div>
  );
}

function SubModal({ onClose, onSave, initialValues = null }) {
  const [f, setF] = useState(initialValues ? {
    owner: initialValues.owner || "self",
    name: initialValues.name || "",
    category: initialValues.category || "Entertainment",
    amount: initialValues.amount || "",
    cycle: initialValues.cycle || "monthly",
    renewalDate: initialValues.renewalDate || "",
  } : {
    owner: "self",
    name: "",
    category: "Entertainment",
    amount: "",
    cycle: "monthly",
    renewalDate: "",
  });
  return (
    <Modal title={initialValues ? "Edit Subscription" : "Add Subscription"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Service Name">
        <input
          style={input}
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
      </Field>
      <Field label="Category">
        <select
          style={input}
          value={f.category}
          onChange={(e) => setF({ ...f, category: e.target.value })}
        >
          <option>Entertainment</option>
          <option>Productivity</option>
          <option>Storage/Cloud</option>
          <option>News/Media</option>
          <option>Fitness</option>
          <option>Utilities</option>
          <option>Other</option>
        </select>
      </Field>
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}
      >
        <Field label="Amount">
          <input
            style={input}
            type="number"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
          />
        </Field>
        <Field label="Cycle">
          <select
            style={input}
            value={f.cycle}
            onChange={(e) => setF({ ...f, cycle: e.target.value })}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </Field>
        <Field label="Next Renewal">
          <input
            style={input}
            type="date"
            value={f.renewalDate}
            onChange={(e) => setF({ ...f, renewalDate: e.target.value })}
          />
        </Field>
      </div>
      <ModalActions
        onSave={() => f.name && f.amount && onSave(f)}
        onClose={onClose}
      />
    </Modal>
  );
}

// ================== GOALS TAB ==================
const PRIORITY_ORDER = { High: 3, Medium: 2, Low: 1 };
const PRIORITY_COLOR = { High: "#ef4444", Medium: "#f59e0b", Low: "#22c55e" };

function GoalsTab({ state, addItem, removeItem, updateItem, metrics }) {
  const [show, setShow] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  // ── Aggregate calculations ──
  const totalTarget = state.goals.reduce((s, g) => s + Number(g.targetAmount || 0), 0);
  const totalSaved = state.goals.reduce((s, g) => s + Number(g.currentAmount || 0), 0);
  const totalRemaining = Math.max(0, totalTarget - totalSaved);
  const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
  const completedCount = state.goals.filter(g => Number(g.targetAmount) > 0 && Number(g.currentAmount) >= Number(g.targetAmount)).length;
  const onTrackCount = state.goals.filter(g => {
    const progress = Number(g.targetAmount) ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100 : 0;
    if (progress >= 100) return false;
    if (!g.targetDate) return true;
    const elapsed = g.startDate ? monthsBetween(g.startDate, today()) : 0;
    const rem = Math.max(0, monthsBetween(today(), g.targetDate));
    const total = elapsed + rem;
    const expectedPct = total > 0 ? (elapsed / total) * 100 : 0;
    return progress >= expectedPct - 10;
  }).length;
  const behindCount = state.goals.length - completedCount - onTrackCount;

  // Priority breakdown
  const priBreakdown = (["High", "Medium", "Low"] as const).map(p => {
    const gs = state.goals.filter(g => (g.priority || "Medium") === p);
    return {
      priority: p,
      count: gs.length,
      target: gs.reduce((s, g) => s + Number(g.targetAmount || 0), 0),
      saved: gs.reduce((s, g) => s + Number(g.currentAmount || 0), 0),
    };
  });

  const sortedGoals = [...state.goals]
    .filter(g => filterPriority === "all" || (g.priority || "Medium") === filterPriority)
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 2;
      const pb = PRIORITY_ORDER[b.priority] ?? 2;
      return sortDir === "desc" ? pb - pa : pa - pb;
    });

  const ringColor = (pct: number) =>
    pct >= 100 ? THEME.sage : pct >= 75 ? THEME.gold : pct >= 40 ? THEME.accent : THEME.rust;

  return (
    <div>
      <SectionTitle sub="What the money is for — down payments, retirement, freedom">
        Goals & Future Planning
      </SectionTitle>

      {/* ── Summary Stats Card ── */}
      {state.goals.length > 0 && (
        <div style={{ ...card, marginBottom: 20 }}>
          {/* KPI tiles */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 16, marginBottom: 18 }}>
            {[
              { label: "Total Goals", value: String(state.goals.length), color: THEME.ink },
              { label: "Total Target", value: fmtINRFull(totalTarget), color: THEME.ink },
              { label: "Saved So Far", value: fmtINRFull(totalSaved), color: THEME.sage },
              { label: "Balance Left", value: fmtINRFull(totalRemaining), color: THEME.rust },
              { label: "Overall Achieved", value: `${overallPct.toFixed(1)}%`, color: ringColor(overallPct) },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ padding: "12px 0" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: THEME.muted, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: "'Inter', sans-serif" }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Overall progress bar */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ height: 10, background: THEME.line, borderRadius: 6, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(overallPct, 100)}%`,
                background: `linear-gradient(90deg, ${ringColor(overallPct)}, color-mix(in srgb, ${ringColor(overallPct)} 70%, white))`,
                borderRadius: 6,
                transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)",
              }} />
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: THEME.sage, fontWeight: 600 }}>✓ {completedCount} completed</span>
              <span style={{ fontSize: 12, color: THEME.accent, fontWeight: 600 }}>↑ {onTrackCount} on track</span>
              {behindCount > 0 && <span style={{ fontSize: 12, color: THEME.rust, fontWeight: 600 }}>⚠ {behindCount} behind</span>}
            </div>
          </div>

          {/* Priority breakdown */}
          <div style={{ borderTop: `1px solid ${THEME.line}`, paddingTop: 14 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: THEME.muted, marginBottom: 10 }}>Breakdown by Priority</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {priBreakdown.map(p => {
                const pPct = p.target > 0 ? (p.saved / p.target) * 100 : 0;
                return (
                  <div key={p.priority} style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1.5px solid ${PRIORITY_COLOR[p.priority]}22`,
                    background: `${PRIORITY_COLOR[p.priority]}0a`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: PRIORITY_COLOR[p.priority], textTransform: "uppercase", letterSpacing: "0.1em" }}>{p.priority}</span>
                      <span style={{ fontSize: 11, color: THEME.muted }}>{p.count} goal{p.count !== 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ height: 4, background: THEME.line, borderRadius: 3, marginBottom: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(pPct, 100)}%`, background: PRIORITY_COLOR[p.priority], borderRadius: 3, transition: "width 0.6s ease" }} />
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>
                      <span style={{ color: THEME.sage, fontWeight: 600 }}>{fmtINRFull(p.saved)}</span>
                      <span> / {fmtINRFull(p.target)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Controls row ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["all", "High", "Medium", "Low"] as const).map(p => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              style={{
                ...btnOutline,
                fontSize: 11,
                padding: "6px 12px",
                background: filterPriority === p ? (p === "all" ? THEME.accent : PRIORITY_COLOR[p]) : "transparent",
                color: filterPriority === p ? "#fff" : (p === "all" ? THEME.ink : PRIORITY_COLOR[p]),
                borderColor: p === "all" ? THEME.line : PRIORITY_COLOR[p],
                fontWeight: 700,
              }}
            >
              {p === "all" ? "All" : p}
            </button>
          ))}
          <button
            onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
            style={{ ...btnOutline, fontSize: 11, padding: "6px 12px" }}
          >
            {sortDir === "desc" ? "High → Low" : "Low → High"}
          </button>
        </div>
        <button style={btnSolid} onClick={() => setShow(true)}>
          <Plus size={14} /> Add Goal
        </button>
      </div>

      {/* ── Goal cards ── */}
      {state.goals.length === 0 ? (
        <div style={card}>
          <EmptyHint text="Set a goal — retirement, house, car, travel, emergency fund…" />
        </div>
      ) : sortedGoals.length === 0 ? (
        <div style={card}>
          <EmptyHint text={`No ${filterPriority} priority goals yet.`} />
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {sortedGoals.map((g) => {
            const progress = Number(g.targetAmount)
              ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100
              : 0;
            const isComplete = progress >= 100;
            const monthsLeft = g.targetDate
              ? Math.max(0, monthsBetween(today(), g.targetDate))
              : 0;
            const remaining = Math.max(0, Number(g.targetAmount) - Number(g.currentAmount));
            const monthlyNeeded = monthsLeft > 0 ? remaining / monthsLeft : 0;
            const elapsed = g.startDate ? monthsBetween(g.startDate, today()) : 0;
            const totalDuration = elapsed + monthsLeft;
            const expectedPct = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
            const isBehind = !isComplete && g.targetDate && progress < expectedPct - 10;
            const rc = ringColor(progress);

            return (
              <div key={g.id} style={{ ...card, position: "relative", border: isComplete ? `1.5px solid ${THEME.sage}44` : undefined }}>
                {/* action buttons */}
                <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8, alignItems: "center" }}>
                  {isComplete && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: `${THEME.sage}22`, color: THEME.sage, border: `1px solid ${THEME.sage}55`, borderRadius: 6, padding: "2px 8px", letterSpacing: "0.1em" }}>
                      COMPLETED
                    </span>
                  )}
                  {isBehind && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: `${THEME.rust}15`, color: THEME.rust, border: `1px solid ${THEME.rust}44`, borderRadius: 6, padding: "2px 8px", letterSpacing: "0.1em" }}>
                      BEHIND
                    </span>
                  )}
                  <button onClick={() => setEditGoal(g)} style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => removeItem("goals", g.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted }}>
                    <Trash2 size={14} />
                  </button>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted }}>{g.category}</div>
                      {g.priority && (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: PRIORITY_COLOR[g.priority] || THEME.muted, border: `1px solid ${PRIORITY_COLOR[g.priority] || THEME.muted}`, borderRadius: 4, padding: "1px 6px" }}>
                          {g.priority}
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: 800, marginTop: 4 }}>{g.name}</div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {g.startDate && <span>Started: {g.startDate}</span>}
                      {g.targetDate && <span>Target: {g.targetDate} · {monthsLeft}m left</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 800 }}>
                      {fmtINRFull(g.currentAmount)}{" "}
                      <span style={{ color: THEME.muted, fontSize: 15 }}>/ {fmtINRFull(g.targetAmount)}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: rc }}>{progress.toFixed(1)}% reached</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16 }}>
                  {(() => {
                    const r = 36, sz = 88, cx = sz / 2;
                    const circ = 2 * Math.PI * r;
                    const dashOff = circ * (1 - Math.min(progress, 100) / 100);
                    return (
                      <svg width={sz} height={sz} style={{ flexShrink: 0 }}>
                        <circle cx={cx} cy={cx} r={r} fill="none" stroke={THEME.line} strokeWidth="7" />
                        <circle cx={cx} cy={cx} r={r} fill="none" stroke={rc} strokeWidth="7"
                          strokeDasharray={circ} strokeDashoffset={dashOff} strokeLinecap="round"
                          style={{ transformOrigin: `${cx}px ${cx}px`, transform: "rotate(-90deg)", transition: "stroke-dashoffset 0.6s ease" }}
                        />
                        <text x={cx} y={cx - 4} textAnchor="middle" fontSize="13" fontWeight="800" fill={rc}>{Math.min(Math.round(progress), 100)}%</text>
                        <text x={cx} y={cx + 12} textAnchor="middle" fontSize="9" fill={THEME.muted}>{isComplete ? "DONE!" : "done"}</text>
                      </svg>
                    );
                  })()}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8, fontSize: 12 }}>
                      <div><div style={{ color: THEME.muted }}>Saved so far</div><div style={{ fontWeight: 700, color: THEME.sage }}>{fmtINRFull(g.currentAmount)}</div></div>
                      <div><div style={{ color: THEME.muted }}>Remaining</div><div style={{ fontWeight: 700, color: THEME.rust }}>{fmtINRFull(remaining)}</div></div>
                      {g.targetDate && <div><div style={{ color: THEME.muted }}>Months left</div><div style={{ fontWeight: 700 }}>{monthsLeft}</div></div>}
                    </div>
                    {monthlyNeeded > 0 && (
                      <div style={{ marginTop: 10, fontSize: 13, color: THEME.ink }}>
                        → Save <b>{fmtINRFull(monthlyNeeded)}</b>/month to hit target on time.
                      </div>
                    )}
                    {isBehind && (
                      <div style={{ marginTop: 6, fontSize: 12, color: THEME.rust }}>
                        Expected {expectedPct.toFixed(0)}% by now — you are {(expectedPct - progress).toFixed(0)}% behind schedule.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {show && (
        <GoalModal
          onClose={() => setShow(false)}
          onSave={(v) => { addItem("goals", v); setShow(false); }}
        />
      )}
      {editGoal && (
        <GoalModal
          initialValues={editGoal}
          onClose={() => setEditGoal(null)}
          onSave={(v) => { updateItem("goals", editGoal.id, v); setEditGoal(null); }}
        />
      )}
    </div>
  );
}

function GoalModal({ onClose, onSave, initialValues = null }) {
  const [f, setF] = useState(initialValues ? {
    name: initialValues.name || "",
    category: initialValues.category || "Wealth",
    owner: initialValues.owner || "self",
    targetAmount: initialValues.targetAmount || "",
    currentAmount: initialValues.currentAmount || "0",
    startDate: initialValues.startDate || "",
    targetDate: initialValues.targetDate || "",
    priority: initialValues.priority || "Medium",
  } : {
    name: "",
    category: "Wealth",
    owner: "self",
    targetAmount: "",
    currentAmount: "0",
    startDate: new Date().toISOString().slice(0, 10),
    targetDate: "",
    priority: "Medium",
  });
  return (
    <Modal title={initialValues ? "Edit Goal" : "Add Goal"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Goal Name">
        <input
          style={input}
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="e.g. Buy a home, Retirement corpus"
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Category">
          <select
            style={input}
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value })}
          >
            <option>Wealth</option>
            <option>Retirement</option>
            <option>Home</option>
            <option>Vehicle</option>
            <option>Education</option>
            <option>Travel</option>
            <option>Emergency Fund</option>
            <option>Wedding</option>
            <option>Other</option>
          </select>
        </Field>
        <Field label="Priority">
          <select
            style={input}
            value={f.priority}
            onChange={(e) => setF({ ...f, priority: e.target.value })}
          >
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <Field label="Target Amount">
          <input style={input} type="number" value={f.targetAmount} onChange={(e) => setF({ ...f, targetAmount: e.target.value })} />
        </Field>
        <Field label="Current Saved">
          <input style={input} type="number" value={f.currentAmount} onChange={(e) => setF({ ...f, currentAmount: e.target.value })} />
        </Field>
        <Field label="Start Date">
          <input style={input} type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
        </Field>
        <Field label="Target Date">
          <input style={input} type="date" value={f.targetDate} onChange={(e) => setF({ ...f, targetDate: e.target.value })} />
        </Field>
      </div>
      <ModalActions
        onSave={() => f.name && f.targetAmount && onSave(f)}
        onClose={onClose}
      />
    </Modal>
  );
}

// ================== TAX TAB ==================
function TaxTab({ state, addItem, removeItem, metrics, setState }) {
  const [showIncome, setShowIncome] = useState(false);
  const [showTaxPmt, setShowTaxPmt] = useState(false);
  const [showSlabs, setShowSlabs] = useState(false);
  const [cgPlan, setCgPlan] = useState<{id:string;sellDate:string}[]>([]);
  const [rentPaid, setRentPaid] = useState("180000");
  const [cityTier, setCityTier] = useState("metro");

  // ── Income inputs ──
  const [grossSalary, setGrossSalary] = useState(String(metrics.annualIncome || ""));
  const [hraReceived, setHraReceived] = useState("0");
  const [housePropertyIncome, setHousePropertyIncome] = useState("0");
  const [capitalGainsST, setCapitalGainsST] = useState("0");
  const [capitalGainsLT, setCapitalGainsLT] = useState("0");
  const [otherIncome, setOtherIncome] = useState("0");

  // ── Old Regime deduction inputs (pre-fill from state where possible) ──
  const [hraExemption, setHraExemption] = useState("0");
  const [lic80C,  setLic80C]  = useState(() => String(state.lic.reduce((s,l) => s + Number(l.annualPremium || 0), 0)));
  const [ppf80C,  setPpf80C]  = useState(() => String(state.ppf.reduce((s,p) => s + Number(p.thisYearContribution || 0), 0)));
  const [elss80C, setElss80C] = useState("0");
  const [nsc80C,  setNsc80C]  = useState("0");
  const [hlPrincipal80C, setHlPrincipal80C] = useState("0");
  const [tuition80C, setTuition80C] = useState("0");
  const [other80C,   setOther80C]   = useState("0");
  const [nps80CCD,  setNps80CCD]  = useState(() => {
    const now = new Date();
    const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const fyStart = new Date(fyStartYear, 3, 1);
    const fyEnd = new Date(fyStartYear + 1, 2, 31);
    return String(state.nps.reduce((total, n) => {
      const contributions = n.contributions || [];
      if (contributions.length > 0) {
        return total + contributions
          .filter((c) => { const d = new Date(c.date); return d >= fyStart && d <= fyEnd; })
          .reduce((s, c) => s + Number(c.selfAmount || 0), 0);
      }
      return total + Number(n.thisYearContribution || 0);
    }, 0));
  });
  const [medSelf80D,    setMedSelf80D]    = useState("0");
  const [medParents80D, setMedParents80D] = useState("0");
  const [parentsIsSenior, setParentsIsSenior] = useState(false);
  const [hlInterest24B, setHlInterest24B] = useState("0");
  const [donations80G,  setDonations80G]  = useState("0");
  const [tta80TTA,  setTta80TTA]  = useState("0");
  const [profTax,   setProfTax]   = useState("0");

  const regime = state.profile.regime || "new";

  // ── Derived numbers ──
  const gSalary  = Math.max(0, Number(grossSalary)         || 0);
  const hpIncome = Number(housePropertyIncome) || 0;   // can be negative (loss)
  const stcg     = Math.max(0, Number(capitalGainsST)  || 0);
  const ltcg     = Math.max(0, Number(capitalGainsLT)  || 0);
  const other    = Math.max(0, Number(otherIncome)     || 0);

  // Capital gains special taxes (separate from slab)
  const stcgTaxAmt  = stcg * 0.20 * 1.04;
  const ltcgTaxable = Math.max(0, ltcg - 125000);
  const ltcgTaxAmt  = ltcgTaxable * 0.125 * 1.04;

  // ── New Regime ──
  const stdDedNew   = Math.min(gSalary, 75000);
  const taxableNew  = Math.max(0, gSalary - stdDedNew + hpIncome + other);
  const newCalc     = calcNewSlabs(taxableNew);
  const newGrandTotal = newCalc.total + stcgTaxAmt + ltcgTaxAmt;

  // ── Old Regime ──
  const stdDedOld   = Math.min(gSalary, 50000);
  const hraEx       = Math.max(0, Number(hraExemption)   || 0);
  const total80C    = Math.min(150000,
    (Number(lic80C) || 0) + (Number(ppf80C) || 0) + (Number(elss80C) || 0) +
    (Number(nsc80C) || 0) + (Number(hlPrincipal80C) || 0) +
    (Number(tuition80C) || 0) + (Number(other80C) || 0));
  const totalNPS80CCD = Math.min(50000, Number(nps80CCD) || 0);
  const med80D   = Math.min(Number(medSelf80D) || 0, 25000) +
                   Math.min(Number(medParents80D) || 0, parentsIsSenior ? 50000 : 25000);
  const hl24B    = Math.min(200000, Number(hlInterest24B) || 0);
  const don80G   = Math.max(0, Number(donations80G) || 0);
  const tta      = Math.min(10000, Number(tta80TTA) || 0);
  const pTax     = Math.min(2500, Number(profTax) || 0);

  const totalOldDed = stdDedOld + hraEx + total80C + totalNPS80CCD + med80D + hl24B + don80G + tta + pTax;
  const taxableOld  = Math.max(0, gSalary - stdDedOld - hraEx - total80C - totalNPS80CCD - med80D - hl24B - don80G - tta - pTax + hpIncome + other);
  const oldCalc     = calcOldSlabs(taxableOld);
  const oldGrandTotal = oldCalc.total + stcgTaxAmt + ltcgTaxAmt;

  const saving    = Math.abs(newGrandTotal - oldGrandTotal);
  const betterReg = newGrandTotal <= oldGrandTotal ? "new" : "old";

  // Advance tax
  const expectedTax   = regime === "new" ? newGrandTotal : oldGrandTotal;
  const paidAdvance   = state.taxPayments.reduce((s, t) => s + Number(t.amount || 0), 0);
  const advanceTaxDue = [
    { date: "15 Jun", pct: 15 }, { date: "15 Sep", pct: 45 },
    { date: "15 Dec", pct: 75 }, { date: "15 Mar", pct: 100 },
  ];

  const unrealizedLTCG = state.stocks.reduce(
    (s, st) => s + (Number(st.qty) * Number(st.currentPrice) - Number(st.qty) * Number(st.avgPrice)), 0);

  const income = metrics.annualIncome; // for income ledger display below

  // ── Style helpers ──
  const sectionHead = { fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 };
  const rowSep = { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px dashed ${THEME.line}`, fontSize: 14 };
  const deductionRow = (lbl, val, cap?) => (
    <div style={rowSep}>
      <span style={{ color: THEME.muted }}>{lbl}{cap ? <span style={{ fontSize: 11, marginLeft: 4 }}>(max {fmtINR(cap)})</span> : null}</span>
      <span style={{ color: THEME.sage, fontWeight: 600 }}>− {fmtINR(val)}</span>
    </div>
  );
  const inpRow = (lbl, val, setter, note?) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 4, fontWeight: 500 }}>{lbl}{note ? <span style={{ marginLeft: 6, fontSize: 11 }}>{note}</span> : null}</div>
      <input style={{ ...input, fontSize: 13 }} type="number" value={val} onChange={(e) => setter(e.target.value)} placeholder="0" />
    </div>
  );

  return (
    <div>
      <SectionTitle sub={`FY ${state.profile.fy} · Enter income & deductions to compare New vs Old regime`}>
        Tax Vault
      </SectionTitle>

      {/* ── 1. Income Inputs ── */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={sectionHead}>Income Details</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {inpRow("Gross Salary / Business Income", grossSalary, setGrossSalary, "(annual, pre-tax)")}
          {inpRow("HRA Received", hraReceived, setHraReceived)}
          {inpRow("House Property Income / Loss", housePropertyIncome, setHousePropertyIncome, "(negative = loss)")}
          {inpRow("Short-Term Capital Gains (STCG)", capitalGainsST, setCapitalGainsST, "(taxed @20%)")}
          {inpRow("Long-Term Capital Gains (LTCG)", capitalGainsLT, setCapitalGainsLT, "(taxed @12.5% above ₹1.25L)")}
          {inpRow("Other Income (interest, freelance…)", otherIncome, setOtherIncome)}
        </div>
      </div>

      {/* ── 2. Old Regime Deductions ── */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={sectionHead}>Old Regime Deductions <span style={{ fontSize: 12, fontWeight: 400, color: THEME.muted }}>(not applicable under New Regime)</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.accent, marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${THEME.line}` }}>Section 80C (max ₹1.5L total)</div>
            {inpRow("LIC Premium", lic80C, setLic80C, "(auto-filled)")}
            {inpRow("PPF Contribution", ppf80C, setPpf80C, "(auto-filled)")}
            {inpRow("ELSS / Tax-saving MF", elss80C, setElss80C)}
            {inpRow("NSC", nsc80C, setNsc80C)}
            {inpRow("Home Loan Principal Repayment", hlPrincipal80C, setHlPrincipal80C)}
            {inpRow("Children Tuition Fees", tuition80C, setTuition80C)}
            {inpRow("Other 80C (FD, ULIP, etc.)", other80C, setOther80C)}
            <div style={{ padding: "10px 12px", background: total80C >= 150000 ? "rgba(90,130,80,0.1)" : "rgba(128,128,128,0.07)", borderRadius: 6, fontSize: 13, marginTop: 4 }}>
              <span style={{ color: THEME.muted }}>Total 80C used: </span>
              <b style={{ color: total80C >= 150000 ? THEME.sage : THEME.ink }}>{fmtINRFull(total80C)}</b>
              {total80C < 150000
                ? <span style={{ color: THEME.gold }}> · {fmtINRFull(150000 - total80C)} remaining</span>
                : <span style={{ color: THEME.sage }}> · Limit reached!</span>}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.accent, marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${THEME.line}` }}>Other Deductions</div>
            {inpRow("HRA Exemption u/s 10(13A)", hraExemption, setHraExemption)}
            {inpRow("NPS 80CCD(1B)", nps80CCD, setNps80CCD, "(auto-filled · max ₹50K)")}
            {inpRow("Mediclaim – Self/Family 80D", medSelf80D, setMedSelf80D, "(max ₹25K)")}
            {inpRow("Mediclaim – Parents 80D", medParents80D, setMedParents80D, `(max ${parentsIsSenior ? "₹50K" : "₹25K"})`)}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <input type="checkbox" id="parentsSenior" checked={parentsIsSenior} onChange={(e) => setParentsIsSenior(e.target.checked)} />
              <label htmlFor="parentsSenior" style={{ fontSize: 12, color: THEME.muted, cursor: "pointer" }}>Parents are Senior Citizens (60+)</label>
            </div>
            {inpRow("Home Loan Interest 24(B)", hlInterest24B, setHlInterest24B, "(max ₹2L)")}
            {inpRow("Donations 80G", donations80G, setDonations80G)}
            {inpRow("Savings Interest 80TTA", tta80TTA, setTta80TTA, "(max ₹10K)")}
            {inpRow("Professional Tax", profTax, setProfTax, "(max ₹2,500)")}
          </div>
        </div>
      </div>

      {/* ── 3. Regime Comparison ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* New Regime */}
        <div style={{ ...card, borderTop: `4px solid ${regime === "new" ? THEME.accent : THEME.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: THEME.muted }}>New Regime</div>
            {regime === "new" && <span style={{ fontSize: 10, padding: "2px 8px", background: THEME.accent, color: THEME.paper }}>SELECTED</span>}
          </div>
          <div style={rowSep}>
            <span style={{ color: THEME.muted }}>Gross Income</span>
            <span style={{ fontWeight: 600 }}>{fmtINRFull(gSalary + hpIncome + other)}</span>
          </div>
          {deductionRow("Standard Deduction", stdDedNew, 75000)}
          <div style={rowSep}>
            <span style={{ color: THEME.muted, fontWeight: 600 }}>Taxable Income</span>
            <span style={{ fontWeight: 700 }}>{fmtINRFull(taxableNew)}</span>
          </div>
          <div style={{ borderTop: `1px dashed ${THEME.line}`, paddingTop: 8, marginTop: 4, marginBottom: 8 }}>
            <div style={rowSep}>
              <span style={{ color: THEME.muted }}>Slab Tax</span>
              <span>{fmtINRFull(newCalc.grossTax)}</span>
            </div>
            {newCalc.rebate > 0 && (
              <div style={rowSep}>
                <span style={{ color: THEME.sage }}>87A Rebate</span>
                <span style={{ color: THEME.sage }}>−{fmtINRFull(newCalc.rebate)}</span>
              </div>
            )}
            <div style={rowSep}>
              <span style={{ color: THEME.muted }}>4% Cess</span>
              <span>{fmtINRFull(newCalc.cess)}</span>
            </div>
            {stcg > 0 && <div style={rowSep}><span style={{ color: THEME.muted }}>STCG Tax (20% + cess)</span><span>{fmtINRFull(stcgTaxAmt)}</span></div>}
            {ltcg > 0 && <div style={rowSep}><span style={{ color: THEME.muted }}>LTCG Tax (12.5% + cess)</span><span>{fmtINRFull(ltcgTaxAmt)}</span></div>}
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 32, fontWeight: 800 }}>{fmtINRFull(newGrandTotal)}</div>
          <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 12 }}>Total tax liability</div>
          <button onClick={() => setState((s) => ({ ...s, profile: { ...s.profile, regime: "new" } }))} style={{ ...btnGhost, fontSize: 11 }}>Use this regime</button>
        </div>
        {/* Old Regime */}
        <div style={{ ...card, borderTop: `4px solid ${regime === "old" ? THEME.accent : THEME.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: THEME.muted }}>Old Regime</div>
            {regime === "old" && <span style={{ fontSize: 10, padding: "2px 8px", background: THEME.accent, color: THEME.paper }}>SELECTED</span>}
          </div>
          <div style={rowSep}>
            <span style={{ color: THEME.muted }}>Gross Income</span>
            <span style={{ fontWeight: 600 }}>{fmtINRFull(gSalary + hpIncome + other)}</span>
          </div>
          {deductionRow("Standard Deduction", stdDedOld, 50000)}
          {hraEx > 0 && deductionRow("HRA Exemption", hraEx)}
          {total80C > 0 && deductionRow("80C Deductions", total80C, 150000)}
          {totalNPS80CCD > 0 && deductionRow("NPS 80CCD(1B)", totalNPS80CCD, 50000)}
          {med80D > 0 && deductionRow("80D Mediclaim", med80D)}
          {hl24B > 0 && deductionRow("Home Loan Interest 24B", hl24B, 200000)}
          {don80G > 0 && deductionRow("80G Donations", don80G)}
          {tta > 0 && deductionRow("80TTA Savings Interest", tta, 10000)}
          {pTax > 0 && deductionRow("Professional Tax", pTax, 2500)}
          <div style={rowSep}>
            <span style={{ color: THEME.muted, fontWeight: 600 }}>Taxable Income</span>
            <span style={{ fontWeight: 700 }}>{fmtINRFull(taxableOld)}</span>
          </div>
          <div style={{ borderTop: `1px dashed ${THEME.line}`, paddingTop: 8, marginTop: 4, marginBottom: 8 }}>
            <div style={rowSep}>
              <span style={{ color: THEME.muted }}>Slab Tax</span>
              <span>{fmtINRFull(oldCalc.grossTax)}</span>
            </div>
            {oldCalc.rebate > 0 && (
              <div style={rowSep}>
                <span style={{ color: THEME.sage }}>87A Rebate</span>
                <span style={{ color: THEME.sage }}>−{fmtINRFull(oldCalc.rebate)}</span>
              </div>
            )}
            <div style={rowSep}>
              <span style={{ color: THEME.muted }}>4% Cess</span>
              <span>{fmtINRFull(oldCalc.cess)}</span>
            </div>
            {stcg > 0 && <div style={rowSep}><span style={{ color: THEME.muted }}>STCG Tax (20% + cess)</span><span>{fmtINRFull(stcgTaxAmt)}</span></div>}
            {ltcg > 0 && <div style={rowSep}><span style={{ color: THEME.muted }}>LTCG Tax (12.5% + cess)</span><span>{fmtINRFull(ltcgTaxAmt)}</span></div>}
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 32, fontWeight: 800 }}>{fmtINRFull(oldGrandTotal)}</div>
          <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 12 }}>Total tax liability · {fmtINRFull(totalOldDed)} deductions</div>
          <button onClick={() => setState((s) => ({ ...s, profile: { ...s.profile, regime: "old" } }))} style={{ ...btnGhost, fontSize: 11 }}>Use this regime</button>
        </div>
      </div>

      {/* ── 4. Recommendation Banner ── */}
      <div style={{ ...card, marginBottom: 24, background: betterReg === "new" ? THEME.sage + "18" : THEME.gold + "18", borderLeft: `4px solid ${THEME.gold}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Sparkles size={20} style={{ color: THEME.gold }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {saving === 0
                ? "Both regimes result in the same tax liability."
                : `${betterReg === "new" ? "New" : "Old"} Regime saves you ${fmtINRFull(saving)} this FY`}
            </div>
            <div style={{ fontSize: 13, color: THEME.muted, marginTop: 2 }}>
              {betterReg === "new"
                ? "New regime's lower slabs benefit you more than available deductions."
                : "Your deductions under the old regime lower your taxable income significantly."}
              {" "}Update income or deductions above to recompute live.
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Slab-wise Breakdown Toggle ── */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showSlabs ? 20 : 0 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700 }}>Slab-wise Tax Breakdown</div>
          <button style={btnGhost} onClick={() => setShowSlabs((v) => !v)}>{showSlabs ? "Hide" : "Show"}</button>
        </div>
        {showSlabs && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: THEME.accent, marginBottom: 8 }}>New Regime (FY 25-26)</div>
              <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr><th style={th}>Slab</th><th style={th}>Rate</th><th style={{ ...th, textAlign: "right" }}>Tax</th></tr></thead>
                <tbody>
                  {newCalc.breakdown.filter((r) => r.inSlab > 0).map((r, i) => (
                    <tr key={i}><td style={td}>{r.label}</td><td style={td}>{r.rate}%</td><td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINR(r.slabTax)}</td></tr>
                  ))}
                  <tr style={{ background: "rgba(128,128,128,0.05)" }}>
                    <td style={{ ...td, fontWeight: 700 }} colSpan={2}>Gross Tax</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{fmtINR(newCalc.grossTax)}</td>
                  </tr>
                  {newCalc.rebate > 0 && (
                    <tr><td style={{ ...td, color: THEME.sage }} colSpan={2}>87A Rebate</td><td style={{ ...td, textAlign: "right", color: THEME.sage }}>−{fmtINR(newCalc.rebate)}</td></tr>
                  )}
                  <tr><td style={{ ...td, color: THEME.muted }} colSpan={2}>4% Health & Edu Cess</td><td style={{ ...td, textAlign: "right", color: THEME.muted }}>{fmtINR(newCalc.cess)}</td></tr>
                  <tr style={{ background: "rgba(128,128,128,0.08)" }}>
                    <td style={{ ...td, fontWeight: 700 }} colSpan={2}>Total (incl. cess)</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{fmtINR(newCalc.total)}</td>
                  </tr>
                </tbody>
              </table></div>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: THEME.accent, marginBottom: 8 }}>Old Regime</div>
              <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead><tr><th style={th}>Slab</th><th style={th}>Rate</th><th style={{ ...th, textAlign: "right" }}>Tax</th></tr></thead>
                <tbody>
                  {oldCalc.breakdown.filter((r) => r.inSlab > 0).map((r, i) => (
                    <tr key={i}><td style={td}>{r.label}</td><td style={td}>{r.rate}%</td><td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINR(r.slabTax)}</td></tr>
                  ))}
                  <tr style={{ background: "rgba(128,128,128,0.05)" }}>
                    <td style={{ ...td, fontWeight: 700 }} colSpan={2}>Gross Tax</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{fmtINR(oldCalc.grossTax)}</td>
                  </tr>
                  {oldCalc.rebate > 0 && (
                    <tr><td style={{ ...td, color: THEME.sage }} colSpan={2}>87A Rebate</td><td style={{ ...td, textAlign: "right", color: THEME.sage }}>−{fmtINR(oldCalc.rebate)}</td></tr>
                  )}
                  <tr><td style={{ ...td, color: THEME.muted }} colSpan={2}>4% Health & Edu Cess</td><td style={{ ...td, textAlign: "right", color: THEME.muted }}>{fmtINR(oldCalc.cess)}</td></tr>
                  <tr style={{ background: "rgba(128,128,128,0.08)" }}>
                    <td style={{ ...td, fontWeight: 700 }} colSpan={2}>Total (incl. cess)</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{fmtINR(oldCalc.total)}</td>
                  </tr>
                </tbody>
              </table></div>
            </div>
          </div>
        )}
      </div>

      {/* ── 6. 80C Tracker ── */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={sectionHead}>80C Deductions Tracker</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 16 }}>
          {([
            ["LIC Premium", Number(lic80C) || 0],
            ["PPF", Number(ppf80C) || 0],
            ["ELSS", Number(elss80C) || 0],
            ["NSC", Number(nsc80C) || 0],
            ["HL Principal", Number(hlPrincipal80C) || 0],
            ["Tuition Fees", Number(tuition80C) || 0],
            ["Other 80C", Number(other80C) || 0],
          ] as [string, number][]).filter(([, v]) => v > 0).map(([lbl, val]) => (
            <div key={lbl} style={{ padding: 12, background: "rgba(128,128,128,0.05)", borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: THEME.muted }}>{lbl}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{fmtINRFull(val)}</div>
            </div>
          ))}
        </div>
        <div style={{ height: 10, background: THEME.line, borderRadius: 5, overflow: "hidden", marginBottom: 8 }}>
          <div style={{ height: "100%", width: Math.min((total80C / 150000) * 100, 100) + "%", background: total80C >= 150000 ? THEME.sage : THEME.accent, borderRadius: 5, transition: "width 0.5s" }} />
        </div>
        <div style={{ fontSize: 13 }}>
          <b>{fmtINRFull(total80C)}</b> used of <b>₹1.5L</b> limit.{" "}
          <span style={{ color: total80C >= 150000 ? THEME.sage : THEME.gold }}>
            {total80C >= 150000 ? "Fully utilized!" : `${fmtINRFull(150000 - total80C)} remaining.`}
          </span>
        </div>
      </div>

      {/* ── 7. Advance Tax Schedule ── */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700 }}>Advance Tax Schedule</div>
          <div style={{ fontSize: 13, color: THEME.muted }}>Expected: {fmtINRFull(expectedTax)} · Paid: {fmtINRFull(paidAdvance)}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {advanceTaxDue.map((d) => {
            const cumulative = (expectedTax * d.pct) / 100;
            const met = paidAdvance >= cumulative;
            return (
              <div key={d.date} style={{ padding: 16, borderRadius: 8, border: `1px solid ${met ? THEME.sage : THEME.line}`, background: met ? THEME.sage + "15" : "transparent" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: THEME.muted }}>By {d.date}</div>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{d.pct}% of liability</div>
                <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 800, marginTop: 8 }}>{fmtINR(cumulative)}</div>
                <div style={{ fontSize: 11, color: met ? THEME.sage : THEME.accent, marginTop: 4, fontWeight: 600 }}>
                  {met ? "✓ Covered" : `Short ${fmtINR(cumulative - paidAdvance)}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 8. Income Ledger & Tax Payments ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700 }}>Income (this FY)</div>
            <button style={btnGhost} onClick={() => setShowIncome(true)}><Plus size={12} /></button>
          </div>
          {state.income.length === 0 ? <EmptyHint text="No income logged" /> : (
            <div style={{ display: "grid", gap: 6 }}>
              {state.income.slice(-10).reverse().map((i) => (
                <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "8px 0", borderBottom: `1px dashed ${THEME.line}` }}>
                  <span>
                    <div style={{ fontWeight: 500 }}>{i.source}</div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>{i.date} · {i.category}</div>
                  </span>
                  <span style={{ color: THEME.sage, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(i.amount)}</span>
                </div>
              ))}
              <div style={{ borderTop: `2px solid ${THEME.ink}`, padding: "10px 0 0", marginTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
                <span>Total FY</span>
                <span style={{ color: THEME.sage }}>{fmtINRFull(income)}</span>
              </div>
            </div>
          )}
        </div>
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700 }}>Tax Payments</div>
            <button style={btnGhost} onClick={() => setShowTaxPmt(true)}><Plus size={12} /></button>
          </div>
          {state.taxPayments.length === 0 ? <EmptyHint text="No advance tax / TDS logged" /> : (
            <div style={{ display: "grid", gap: 6 }}>
              {state.taxPayments.map((t) => (
                <div key={t.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "8px 0", borderBottom: `1px dashed ${THEME.line}` }}>
                  <span>
                    <div style={{ fontWeight: 500 }}>{t.type}</div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>{t.date} · {t.challan || ""}</div>
                  </span>
                  <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(t.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── 9. Capital Gains Snapshot ── */}
      <div style={{ ...card, marginTop: 24, borderLeft: `4px solid ${THEME.ink}` }}>
        <div style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted }}>Capital Gains Snapshot</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 12 }}>
          <Stat k="Unrealized Equity" v={fmtINRFull(unrealizedLTCG)} />
          <Stat k="Est. LTCG tax (12.5% above ₹1.25L)" v={fmtINR(Math.max(0, unrealizedLTCG - 125000) * 0.125)} />
          <Stat k="Realized (track separately)" v="—" />
        </div>
        <div style={{ fontSize: 12, color: THEME.muted, marginTop: 12 }}>
          LTCG on listed equity: 12.5% above ₹1.25L exemption (FY 25-26). STCG on listed equity: 20%. Log realized gains via transactions for accurate reporting.
        </div>
      </div>

      {/* ── G7. Tax Saved vs Tax Paid ── */}
      {(() => {
        const regime = state.profile.regime || "new";
        const taxLiability = regime === "new" ? newGrandTotal : oldGrandTotal;
        const marginalRate = gSalary > 2400000 ? 30 : gSalary > 2000000 ? 25 : gSalary > 1600000 ? 20 : gSalary > 1200000 ? 15 : gSalary > 800000 ? 10 : gSalary > 400000 ? 5 : 0;
        const deductionsOldTotal = regime === "old" ? totalOldDed : stdDedNew;
        const taxSaved = (deductionsOldTotal * marginalRate) / 100;
        return (
          <div style={{ ...card, marginTop: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>G7 · Tax Saved vs Tax Paid</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
              <div style={{ padding: 16, borderRadius: 10, background: "rgba(30,142,62,0.07)", border: `1px solid ${THEME.sage}` }}>
                <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>Tax Saved via Deductions</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: THEME.sage }}>{fmtINRFull(taxSaved)}</div>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>{fmtINRFull(deductionsOldTotal)} deductions × {marginalRate}% rate</div>
              </div>
              <div style={{ padding: 16, borderRadius: 10, background: "rgba(217,48,37,0.06)", border: `1px solid ${THEME.rust}` }}>
                <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>Tax Liability ({regime === "new" ? "New" : "Old"} Regime)</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: THEME.rust }}>{fmtINRFull(taxLiability)}</div>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>Incl. 4% cess</div>
              </div>
              <div style={{ padding: 16, borderRadius: 10, background: "rgba(249,171,0,0.07)", border: `1px solid ${THEME.gold}` }}>
                <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>Effective Tax Rate</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: THEME.gold }}>{gSalary > 0 ? ((taxLiability / gSalary) * 100).toFixed(1) : 0}%</div>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>of gross income</div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── G8. Capital Gains Tax Planner ── */}
      {(() => {
        const updateCG = (id, date) => setCgPlan((prev) => { const next = prev.filter((x) => x.id !== id); return date ? [...next, { id, sellDate: date }] : next; });
        const stocksWithPlan = state.stocks.map((s) => {
          const plan = cgPlan.find((x) => x.id === s.id);
          const invested = Number(s.qty) * Number(s.avgPrice);
          const current = Number(s.qty) * Number(s.currentPrice);
          const gain = current - invested;
          const sellDate = plan?.sellDate;
          const holdingMonths = sellDate ? monthsBetween(today(), sellDate) : null;
          const isLTCG = holdingMonths !== null ? holdingMonths >= 12 : null;
          const taxOnGain = gain <= 0 ? 0 : isLTCG === null ? 0 : isLTCG ? Math.max(0, gain - 125000) * 0.125 * 1.04 : gain * 0.20 * 1.04;
          return { ...s, gain, invested, current, sellDate, isLTCG, taxOnGain };
        });
        return (
          <div style={{ ...card, marginTop: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>G8 · Capital Gains Tax Planner — Enter Planned Sell Dates</div>
            {state.stocks.length === 0 ? <EmptyHint text="Add stocks in Demat & Stocks tab" /> : (
              <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ borderBottom: `2px solid ${THEME.ink}` }}>
                  <th style={th}>Stock</th>
                  <th style={{ ...th, textAlign: "right" }}>Gain</th>
                  <th style={th}>Planned Sell Date</th>
                  <th style={th}>STCG / LTCG</th>
                  <th style={{ ...th, textAlign: "right" }}>Est. Tax</th>
                </tr></thead>
                <tbody>
                  {stocksWithPlan.map((s) => (
                    <tr key={s.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}>
                      <td style={{ ...td, fontWeight: 700 }}>{s.symbol}</td>
                      <td style={{ ...td, textAlign: "right", color: s.gain >= 0 ? THEME.sage : THEME.rust, fontWeight: 600 }}>{s.gain >= 0 ? "+" : ""}{fmtINR(s.gain)}</td>
                      <td style={td}><input type="date" style={{ ...input, padding: "3px 8px", fontSize: 12 }} value={s.sellDate || ""} onChange={(e) => updateCG(s.id, e.target.value)} /></td>
                      <td style={td}>{s.isLTCG === null ? "—" : <span style={{ color: s.isLTCG ? THEME.sage : THEME.gold, fontWeight: 700 }}>{s.isLTCG ? "LTCG ✓" : "STCG ⚡"}</span>}</td>
                      <td style={{ ...td, textAlign: "right", color: THEME.rust, fontWeight: 700 }}>{s.sellDate ? fmtINRFull(s.taxOnGain) : "—"}</td>
                    </tr>
                  ))}
                  {stocksWithPlan.some((s) => s.sellDate) && (
                    <tr style={{ background: "rgba(128,128,128,0.07)" }}>
                      <td style={{ ...td, fontWeight: 700 }} colSpan={4}>Total Planned Tax</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 800, color: THEME.rust }}>{fmtINRFull(stocksWithPlan.reduce((s, x) => s + x.taxOnGain, 0))}</td>
                    </tr>
                  )}
                </tbody>
              </table></div>
            )}
          </div>
        );
      })()}

      {/* ── G9. HRA Exemption Calculator ── */}
      {(() => {
        const hra = Number(hraReceived) || 0;
        const basic = gSalary * 0.4;
        const rentExcess = Math.max(0, Number(rentPaid) - 0.1 * basic);
        const pctOfBasic = cityTier === "metro" ? basic * 0.5 : basic * 0.4;
        const exemption = Math.min(hra, pctOfBasic, rentExcess);
        const taxableHRA = hra - exemption;
        return (
          <div style={{ ...card, marginTop: 24, marginBottom: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>G9 · HRA Exemption Calculator (u/s 10(13A))</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 4 }}>Actual Rent Paid (Annual)</div>
                <input style={{ ...input, fontSize: 13 }} type="number" value={rentPaid} onChange={(e) => setRentPaid(e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 4 }}>HRA Received (auto)</div>
                <input style={{ ...input, fontSize: 13, opacity: 0.7 }} type="number" readOnly value={hraReceived} />
              </div>
              <div>
                <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 4 }}>City Tier</div>
                <select style={{ ...input, fontSize: 13 }} value={cityTier} onChange={(e) => setCityTier(e.target.value)}>
                  <option value="metro">Metro (Delhi/Mumbai/Chennai/Kolkata)</option>
                  <option value="non-metro">Non-Metro</option>
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              {[
                { label: "Actual HRA received", val: fmtINRFull(hra), color: THEME.ink },
                { label: `${cityTier==="metro"?"50%":"40%"} of Basic (est.)`, val: fmtINRFull(pctOfBasic), color: THEME.muted },
                { label: "Rent paid − 10% Basic", val: fmtINRFull(rentExcess), color: THEME.muted },
                { label: "HRA Exempt (min of 3)", val: fmtINRFull(exemption), color: THEME.sage },
                { label: "Taxable HRA", val: fmtINRFull(taxableHRA), color: taxableHRA > 0 ? THEME.rust : THEME.sage },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ padding: 12, borderRadius: 8, background: "rgba(128,128,128,0.05)" }}>
                  <div style={{ fontSize: 11, color: THEME.muted }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color, marginTop: 4 }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, marginTop: 12 }}>Exemption = min(Actual HRA · {cityTier==="metro"?"50%":"40%"} of Basic · Rent − 10% Basic). Enter your HRA in Income Details above.</div>
          </div>
        );
      })()}

      {showIncome && (
        <IncomeModal onClose={() => setShowIncome(false)} onSave={(v) => { addItem("income", v); setShowIncome(false); }} />
      )}
      {showTaxPmt && (
        <TaxPmtModal onClose={() => setShowTaxPmt(false)} onSave={(v) => { addItem("taxPayments", v); setShowTaxPmt(false); }} />
      )}
    </div>
  );
}

function IncomeModal({ onClose, onSave }) {
  const [f, setF] = useState({
    source: "",
    category: "Salary",
    amount: "",
    date: today(),
  });
  return (
    <Modal title="Log Income" onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Source">
        <input
          style={input}
          value={f.source}
          onChange={(e) => setF({ ...f, source: e.target.value })}
          placeholder="Employer / Client name"
        />
      </Field>
      <Field label="Category">
        <select
          style={input}
          value={f.category}
          onChange={(e) => setF({ ...f, category: e.target.value })}
        >
          <option>Salary</option>
          <option>Freelance</option>
          <option>Business</option>
          <option>Interest</option>
          <option>Dividend</option>
          <option>Rental</option>
          <option>Capital Gains</option>
          <option>Other</option>
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Amount">
          <input
            style={input}
            type="number"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
          />
        </Field>
        <Field label="Date">
          <input
            style={input}
            type="date"
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
          />
        </Field>
      </div>
      <ModalActions
        onSave={() => f.source && f.amount && onSave(f)}
        onClose={onClose}
      />
    </Modal>
  );
}

function TaxPmtModal({ onClose, onSave }) {
  const [f, setF] = useState({
    type: "Advance Tax",
    amount: "",
    date: today(),
    challan: "",
  });
  return (
    <Modal title="Log Tax Payment" onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Type">
        <select
          style={input}
          value={f.type}
          onChange={(e) => setF({ ...f, type: e.target.value })}
        >
          <option>Advance Tax</option>
          <option>TDS</option>
          <option>Self-Assessment</option>
          <option>TCS</option>
        </select>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Amount">
          <input
            style={input}
            type="number"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
          />
        </Field>
        <Field label="Date">
          <input
            style={input}
            type="date"
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Challan Number (optional)">
        <input
          style={input}
          value={f.challan}
          onChange={(e) => setF({ ...f, challan: e.target.value })}
        />
      </Field>
      <ModalActions onSave={() => f.amount && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

// ================== MODAL SHELL ==================
function Modal({ title, children, onClose }) {
  React.useEffect(() => {
    // Escape key closes modal
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    // Lock body scroll while modal is open
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Portal to document.body so position:fixed is always relative to the viewport,
  // not to any ancestor with a CSS transform (e.g. the tab-content-enter animation).
  return ReactDOM.createPortal(
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em", color: THEME.ink }}>
            {title}
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  );
}

const Field = ({ label: lbl, children }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={label}>{lbl}</div>
    {children}
  </div>
);

function ModalActions({ onSave, onClose }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 8,
        marginTop: 20,
        paddingTop: 20,
        borderTop: `1px solid ${THEME.line}`,
      }}
    >
      <button style={btnGhost} onClick={onClose}>
        Cancel
      </button>
      <button style={btnAccent} onClick={onSave}>
        Save
      </button>
    </div>
  );
}

// ================== BANK EDIT MODAL ==================
function BankEditModal({ account, onClose, onSave }) {
  const [f, setF] = useState({
    bankName: account?.bankName || "",
    accountNumber: account?.accountNumber || "",
    type: account?.type || "Savings",
    balance: account?.balance || "",
  });
  return (
    <Modal title="Edit Bank Account" onClose={onClose}>
      <Field label="Bank Name">
        <input style={input} value={f.bankName} onChange={(e) => setF({ ...f, bankName: e.target.value })} />
      </Field>
      <Field label="Account Number (last 4 ok)">
        <input style={input} value={f.accountNumber} onChange={(e) => setF({ ...f, accountNumber: e.target.value })} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Type">
          <select style={input} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            <option>Savings</option>
            <option>Current</option>
            <option>Salary</option>
            <option>Joint</option>
          </select>
        </Field>
        <Field label="Current Balance">
          <input style={input} type="number" value={f.balance} onChange={(e) => setF({ ...f, balance: e.target.value })} />
        </Field>
      </div>
      <ModalActions onSave={() => f.bankName && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

// ================== BUDGET TAB ==================
function BudgetTab({ state, addItem, removeItem, updateItem, metrics }) {
  const [show, setShow] = useState(false);
  const [editBudget, setEditBudget] = useState(null);
  const ym = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const monthSpending = useMemo(() => {
    return state.transactions
      .filter((t) => t.date && t.date.startsWith(ym) && t.type === "debit")
      .reduce((acc, t) => {
        const cat = t.category || "Uncategorized";
        acc[cat] = (acc[cat] || 0) + Number(t.amount || 0);
        return acc;
      }, {});
  }, [state.transactions, ym]);

  const totalBudget = state.budgets.reduce((s, b) => s + Number(b.monthly || 0), 0);
  const totalSpent = state.budgets.reduce((s, b) => s + (monthSpending[b.category] || 0), 0);

  const overBudgetCount = state.budgets.filter((b) => {
    const spent = monthSpending[b.category] || 0;
    return spent > Number(b.monthly || 0);
  }).length;

  return (
    <div>
      {overBudgetCount > 0 && (
        <div style={{ background: "rgba(217,48,37,0.08)", border: `1px solid ${THEME.rust}`, borderRadius: 8, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, color: THEME.rust }}>
          <AlertCircle size={16} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>⚠ {overBudgetCount} {overBudgetCount === 1 ? "category" : "categories"} over budget this month</span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <SectionTitle sub="Set monthly limits per category and track real spending">
          Budget Planner
        </SectionTitle>
        <button style={btnSolid} onClick={() => setShow(true)}>
          <Plus size={14} /> Add Budget
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Tile icon={Wallet} label="Total Budgeted" value={fmtINRFull(totalBudget)} />
        <Tile icon={Receipt} label="Spent This Month" value={fmtINRFull(totalSpent)} negative={totalSpent > totalBudget} />
        <Tile icon={TrendingUp} label="Remaining" value={fmtINRFull(Math.max(0, totalBudget - totalSpent))} />
        <Tile icon={Target} label="Categories" value={state.budgets.length} />
      </div>

      {/* E1 – Budget Burn Rate */}
      {totalBudget > 0 && (() => {
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysPassed = now.getDate();
        const monthElapsedPct = (daysPassed / daysInMonth) * 100;
        const spentPct = (totalSpent / totalBudget) * 100;
        const onTrack = spentPct <= monthElapsedPct + 5;
        const burnColor = spentPct > monthElapsedPct + 10 ? THEME.rust : spentPct > monthElapsedPct - 5 ? THEME.gold : THEME.sage;
        const r = 44, sz = 104, circ = 2 * Math.PI * r;
        return (
          <div style={{ ...card, marginBottom: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Budget Burn Rate — Day {daysPassed} of {daysInMonth}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <svg width={sz} height={sz}>
                  <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={THEME.line} strokeWidth="8" />
                  {/* Month elapsed arc (grey) */}
                  <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={THEME.muted} strokeWidth="8" opacity="0.3"
                    strokeDasharray={`${(monthElapsedPct/100)*circ} ${circ}`} strokeDashoffset={circ/4} strokeLinecap="round" />
                  {/* Spend arc */}
                  <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={burnColor} strokeWidth="8"
                    strokeDasharray={`${Math.min(spentPct/100,1)*circ} ${circ}`} strokeDashoffset={circ/4} strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 0.6s ease" }} />
                  <text x={sz/2} y={sz/2-4} textAnchor="middle" fontSize="15" fontWeight="800" fill={burnColor}>{spentPct.toFixed(0)}%</text>
                  <text x={sz/2} y={sz/2+13} textAnchor="middle" fontSize="9" fill={THEME.muted}>spent</text>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "grid", gap: 10 }}>
                  {[
                    { label: "Month elapsed", val: monthElapsedPct.toFixed(0) + "%", color: THEME.muted },
                    { label: "Budget spent", val: spentPct.toFixed(0) + "%", color: burnColor },
                    { label: "Spent so far", val: fmtINRFull(totalSpent), color: THEME.ink },
                    { label: "Daily average", val: fmtINR(daysPassed > 0 ? totalSpent / daysPassed : 0) + "/day", color: THEME.muted },
                    { label: "Projected month-end", val: fmtINRFull(daysPassed > 0 ? (totalSpent / daysPassed) * daysInMonth : 0), color: burnColor },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: THEME.muted }}>{label}</span>
                      <span style={{ fontWeight: 700, color }}>{val}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, fontSize: 12, padding: "8px 12px", borderRadius: 6, background: onTrack ? "rgba(30,142,62,0.08)" : "rgba(217,48,37,0.08)", color: onTrack ? THEME.sage : THEME.rust, fontWeight: 600 }}>
                  {onTrack ? "✓ On track — spending in line with the month" : `⚠ Overpacing — spending faster than month progress`}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {state.budgets.length === 0 ? (
        <div style={card}>
          <EmptyHint text="Add budget limits for categories like Food, Rent, Entertainment…" />
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {state.budgets.map((b) => {
            const spent = monthSpending[b.category] || 0;
            const budget = Number(b.monthly || 0);
            const pct = budget > 0 ? (spent / budget) * 100 : 0;
            const over = pct > 100;
            const barColor = over ? THEME.rust : pct > 80 ? THEME.gold : THEME.sage;

            const nowDate = new Date();
            const daysPassed = nowDate.getDate();
            const daysInMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0).getDate();
            const projected = daysPassed > 0 ? (spent / daysPassed) * daysInMonth : 0;
            const projectedPct = budget > 0 ? (projected / budget) * 100 : 0;
            const dailyAvg = daysPassed > 0 ? spent / daysPassed : 0;

            return (
              <div key={b.id} style={{ ...card, position: "relative" }}>
                <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8 }}>
                  <button onClick={() => setEditBudget(b)} style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => removeItem("budgets", b.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, paddingRight: 28 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{b.category}</div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                      {fmtINRFull(spent)} spent of {fmtINRFull(budget)} budget
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: over ? THEME.rust : THEME.ink }}>{pct.toFixed(0)}%</div>
                    <div style={{ fontSize: 11, color: over ? THEME.rust : THEME.sage, fontWeight: 600 }}>
                      {over ? fmtINR(spent - budget) + " over" : fmtINR(budget - spent) + " left"}
                    </div>
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ height: 8, background: THEME.line, borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ height: "100%", width: Math.min(pct, 100) + "%", background: barColor, borderRadius: 4, transition: "width 0.5s" }} />
                </div>
                {/* Pace projection row */}
                {spent > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.muted, flexWrap: "wrap", gap: 4 }}>
                    <span>{fmtINR(dailyAvg)}/day avg · day {daysPassed}/{daysInMonth}</span>
                    <span style={{ fontWeight: 600, color: projectedPct > 110 ? THEME.rust : projectedPct > 90 ? THEME.gold : THEME.sage }}>
                      Projected: {fmtINR(projected)} ({projectedPct.toFixed(0)}%)
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(() => {
        const budgetedCats = new Set(state.budgets.map((b) => b.category));
        const unbudgeted = Object.entries(monthSpending).filter(([cat]) => !budgetedCats.has(cat));
        if (!unbudgeted.length) return null;
        return (
          <div style={{ ...card, marginTop: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12, color: THEME.muted }}>Unbudgeted Spending This Month</div>
            <div style={{ display: "grid", gap: 6 }}>
              {unbudgeted.sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                <div key={cat} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, padding: "8px 0", borderBottom: "1px dashed " + THEME.line }}>
                  <span>{cat}</span>
                  <span style={{ fontWeight: 600 }}>{fmtINRFull(amt)}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {show && (
        <BudgetModal
          existing={state.budgets.map((b) => b.category)}
          onClose={() => setShow(false)}
          onSave={(v) => { addItem("budgets", v); setShow(false); }}
        />
      )}
      {editBudget && (
        <BudgetModal
          existing={state.budgets.filter(b => b.id !== editBudget.id).map(b => b.category)}
          initialValues={editBudget}
          onClose={() => setEditBudget(null)}
          onSave={(v) => { updateItem("budgets", editBudget.id, v); setEditBudget(null); }}
        />
      )}
    </div>
  );
}

function BudgetModal({ existing, onClose, onSave, initialValues = null }) {
  const allCats = ["Food", "Rent", "Transport", "Shopping", "Bills", "Salary", "Investment", "Tax", "Medical", "Entertainment", "EMI", "Groceries", "Utilities", "Other"];
  const [f, setF] = useState(initialValues ? { owner: initialValues.owner || "self", category: initialValues.category || allCats[0], monthly: initialValues.monthly || "" } : { owner: "self", category: allCats[0], monthly: "" });
  return (
    <Modal title={initialValues ? "Edit Budget" : "Add Budget"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Category">
        <select style={input} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {allCats.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Monthly Limit (₹)">
        <input style={input} type="number" value={f.monthly} onChange={(e) => setF({ ...f, monthly: e.target.value })} placeholder="e.g. 5000" />
      </Field>
      <ModalActions onSave={() => f.monthly && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

// ================== REMINDERS TAB ==================
function RemindersTab({ state, addItem, removeItem }) {
  const [show, setShow] = useState(false);
  const todayStr = today();
  const [notifPerm, setNotifPerm] = useState<string>(() => {
    if (typeof Notification === "undefined") return "unsupported";
    return Notification.permission;
  });

  const requestNotifications = async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === "granted") {
      try { localStorage.setItem("finance-notif", "granted"); } catch {}
    }
  };

  const allReminders = useMemo(() => {
    const list = [];
    state.creditCards.forEach((c) => {
      const dueDate = getCCDueDate(c);
      if (dueDate) list.push({ id: "cc-" + c.id, title: (c.issuer || "Card") + " — Bill Due", subtitle: "Outstanding: " + fmtINRFull(c.outstanding), date: dueDate, type: "Credit Card", icon: CreditCard });
    });
    state.subscriptions.forEach((s) => {
      if (s.renewalDate) list.push({ id: "sub-" + s.id, title: s.name + " Renewal", subtitle: s.cycle + " · " + fmtINRFull(s.amount), date: s.renewalDate, type: "Subscription", icon: Repeat });
    });
    state.fixedDeposits.forEach((f) => {
      if (f.maturityDate) list.push({ id: "fd-" + f.id, title: "FD Maturity — " + (f.bank || f.bankName || "Bank"), subtitle: "Principal: " + fmtINRFull(f.principal), date: f.maturityDate, type: "Fixed Deposit", icon: Coins });
    });
    state.bonds.forEach((b) => {
      if (b.maturityDate) list.push({ id: "bond-" + b.id, title: "Bond Maturity — " + b.name, subtitle: "Face Value: " + fmtINRFull(b.faceValue), date: b.maturityDate, type: "Bond", icon: FileText });
    });
    state.lic.forEach((l) => {
      if (l.maturityDate) list.push({ id: "lic-" + l.id, title: "LIC Maturity — " + l.planName, subtitle: "Annual Premium: " + fmtINRFull(l.annualPremium), date: l.maturityDate, type: "LIC", icon: Shield });
    });
    state.termPlans.forEach((t) => {
      if (t.expiryDate) list.push({ id: "term-" + t.id, title: "Term Plan Expiry — " + t.planName, subtitle: "Cover: " + fmtINRFull(t.coverAmount), date: t.expiryDate, type: "Term Plan", icon: Shield });
    });
    state.loansGiven.forEach((l) => {
      if (l.dueDate) list.push({ id: "loan-" + l.id, title: "Loan Recovery — " + l.borrower, subtitle: "Outstanding: " + fmtINRFull(l.outstanding), date: l.dueDate, type: "Loan Given", icon: HandCoins });
    });
    state.reminders.forEach((r) => {
      list.push({ id: r.id, title: r.title, subtitle: r.note || "", date: r.date, type: "Reminder", icon: Bell, manual: true });
    });
    return list.filter((r) => r.date).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [state]);

  const daysLeft = (d) => Math.ceil((new Date(d) - new Date(todayStr)) / 86400000);
  const urgencyColor = (days) => days < 0 ? THEME.muted : days <= 7 ? THEME.rust : days <= 30 ? THEME.gold : THEME.sage;

  const upcoming = allReminders.filter((r) => daysLeft(r.date) >= 0);
  const past = allReminders.filter((r) => daysLeft(r.date) < 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <SectionTitle sub="Upcoming dues, maturities, renewals and custom alerts">
          Reminders & Alerts
        </SectionTitle>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {notifPerm !== "unsupported" && notifPerm !== "granted" && (
            <button
              style={{ ...btnGhost, fontSize: 12 }}
              onClick={requestNotifications}
              title="Get browser notifications for due reminders"
            >
              <Bell size={13} /> Enable Notifications
            </button>
          )}
          {notifPerm === "granted" && (
            <span style={{ fontSize: 12, color: THEME.sage, display: "flex", alignItems: "center", gap: 4 }}>
              <Check size={13} /> Notifications on
            </span>
          )}
          <button style={btnSolid} onClick={() => setShow(true)}>
            <Plus size={14} /> Add Reminder
          </button>
        </div>
      </div>

      {upcoming.length === 0 && past.length === 0 ? (
        <div style={card}>
          <EmptyHint text="No reminders yet. Add credit cards, FDs, or subscriptions with due dates to see them here." />
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div style={{ display: "grid", gap: 12, marginBottom: 32 }}>
              {upcoming.map((r) => {
                const days = daysLeft(r.date);
                const color = urgencyColor(days);
                const Icon = r.icon;
                return (
                  <div key={r.id} style={{ ...card, display: "flex", alignItems: "center", gap: 16, borderLeft: "4px solid " + color, padding: "16px 20px" }}>
                    <Icon size={20} style={{ color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>{r.subtitle}{r.subtitle ? " · " : ""}{r.type}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, color, fontSize: 16 }}>
                        {days === 0 ? "Today" : days === 1 ? "Tomorrow" : days + " days"}
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted }}>{r.date}</div>
                    </div>
                    {r.manual && (
                      <button onClick={() => removeItem("reminders", r.id)} style={iconBtn}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {past.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Past Due</div>
              <div style={{ display: "grid", gap: 8 }}>
                {past.slice(-5).map((r) => {
                  const days = Math.abs(daysLeft(r.date));
                  const Icon = r.icon;
                  return (
                    <div key={r.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12, opacity: 0.6, padding: "12px 16px" }}>
                      <Icon size={16} style={{ color: THEME.muted, flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 14 }}>
                        <span style={{ fontWeight: 600 }}>{r.title}</span>
                        <span style={{ color: THEME.muted }}> · {r.date}</span>
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted }}>{days}d ago</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {show && (
        <ReminderModal
          onClose={() => setShow(false)}
          onSave={(v) => { addItem("reminders", v); setShow(false); }}
        />
      )}
    </div>
  );
}

function ReminderModal({ onClose, onSave }) {
  const [f, setF] = useState({ title: "", amount: "", date: "", note: "" });
  return (
    <Modal title="Add Reminder" onClose={onClose}>
      <Field label="Title">
        <input style={input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Car Insurance Renewal" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Due Date">
          <input style={input} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
        <Field label="Amount (optional)">
          <input style={input} type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </Field>
      </div>
      <Field label="Note (optional)">
        <input style={input} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      </Field>
      <ModalActions onSave={() => f.title && f.date && onSave(f)} onClose={onClose} />
    </Modal>
  );
}
// ================== SIP TRACKER TAB ==================
function SIPTrackerTab({ state, addItem, removeItem }) {
  const [show, setShow] = useState(false);
  const todayStr = today();

  const [sipProjRate, setSipProjRate] = useState("12");

  const sipsWithCalc = useMemo(() => {
    const r = (Number(sipProjRate) || 12) / 12 / 100;
    return (state.sips || []).map((sip) => {
      const paid = Math.min(Math.max(0, monthsBetween(sip.startDate, todayStr)), Number(sip.totalInstallments || 0));
      const totalInvested = paid * Number(sip.amount || 0);
      const remaining = Math.max(0, Number(sip.totalInstallments || 0) - paid);
      const m = Number(sip.amount || 0);
      const currentCorpus = r === 0 ? totalInvested : m * (Math.pow(1 + r, paid) - 1) / r * (1 + r);
      const projectedCorpus = r === 0 ? currentCorpus + m * remaining : currentCorpus * Math.pow(1 + r, remaining) + m * (Math.pow(1 + r, remaining) - 1) / r * (1 + r);
      return { ...sip, paid, totalInvested, remaining, currentCorpus, projectedCorpus };
    });
  }, [state.sips, todayStr, sipProjRate]);

  const totalMonthly = sipsWithCalc.reduce((s, sip) => s + Number(sip.amount || 0), 0);
  const totalInvested = sipsWithCalc.reduce((s, sip) => s + sip.totalInvested, 0);
  const totalProjected = sipsWithCalc.reduce((s, sip) => s + sip.projectedCorpus, 0);

  return (
    <div>
      <SectionTitle sub="Track your systematic investment plans across mutual funds">
        SIP Tracker
      </SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Tile icon={Activity} label="Monthly SIP" value={fmtINRFull(totalMonthly)} />
        <Tile icon={TrendingUp} label="Total Invested" value={fmtINRFull(totalInvested)} />
        <Tile icon={Repeat} label="Active SIPs" value={sipsWithCalc.length} />
        <Tile icon={Sparkles} label="Projected Corpus" value={fmtINRFull(totalProjected)} sub={`@${sipProjRate}% p.a.`} subColor={THEME.sage} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: THEME.muted }}>Projection rate:</span>
          <input style={{ ...input, width: 64, fontSize: 13, padding: "4px 8px" }} type="number" value={sipProjRate} onChange={(e) => setSipProjRate(e.target.value)} />
          <span style={{ fontSize: 12, color: THEME.muted }}>% p.a.</span>
        </div>
        <button style={btnSolid} onClick={() => setShow(true)}>
          <Plus size={14} /> Add SIP
        </button>
      </div>

      {sipsWithCalc.length === 0 ? (
        <div style={card}><EmptyHint text="Add your SIPs to track investments" /></div>
      ) : (
        <div style={card}>
          <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${THEME.ink}` }}>
                <th style={th}>Scheme</th>
                <th style={th}>Type</th>
                <th style={{ ...th, textAlign: "right" }}>Amount/mo</th>
                <th style={th}>Started</th>
                <th style={{ ...th, textAlign: "right" }}>Paid/Total</th>
                <th style={{ ...th, textAlign: "right" }}>Invested</th>
                <th style={{ ...th, textAlign: "right" }}>Projected Corpus</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {sipsWithCalc.map((sip) => (
                <tr key={sip.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}>
                  <td style={{ ...td, fontWeight: 600, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sip.scheme}</td>
                  <td style={{ ...td, color: THEME.muted, fontSize: 12 }}>{sip.fundType}</td>
                  <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(sip.amount)}</td>
                  <td style={td}>{sip.startDate}</td>
                  <td style={{ ...td, textAlign: "right" }}>{sip.paid} / {sip.totalInstallments}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{fmtINRFull(sip.totalInvested)}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 700, color: THEME.sage }}>
                    {fmtINRFull(sip.projectedCorpus)}
                    <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 400 }}>{sip.remaining > 0 ? `${sip.remaining} mo left` : "Complete"}</div>
                  </td>
                  <td style={td}>
                    <button onClick={() => removeItem("sips", sip.id)} style={iconBtn}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}

      {show && (
        <SIPModal
          onClose={() => setShow(false)}
          onSave={(v) => { addItem("sips", v); setShow(false); }}
        />
      )}
    </div>
  );
}

function SIPModal({ onClose, onSave }) {
  const [f, setF] = useState({ scheme: "", fundType: "Equity", amount: "", frequency: "monthly", startDate: today(), totalInstallments: "12" });
  return (
    <Modal title="Add SIP" onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Scheme Name">
        <input style={input} value={f.scheme} onChange={(e) => setF({ ...f, scheme: e.target.value })} placeholder="e.g. Parag Parikh Flexi Cap" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Fund Type">
          <select style={input} value={f.fundType} onChange={(e) => setF({ ...f, fundType: e.target.value })}>
            <option>Equity</option>
            <option>Index</option>
            <option>Hybrid</option>
            <option>Debt</option>
            <option>ELSS</option>
          </select>
        </Field>
        <Field label="Frequency">
          <select style={input} value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <Field label="Amount (₹)">
          <input style={input} type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </Field>
        <Field label="Start Date">
          <input style={input} type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
        </Field>
        <Field label="Total Installments">
          <input style={input} type="number" value={f.totalInstallments} onChange={(e) => setF({ ...f, totalInstallments: e.target.value })} />
        </Field>
      </div>
      <ModalActions onSave={() => f.scheme && f.amount && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

// ================== INSURANCE SUMMARY TAB ==================
function InsuranceSummaryTab({ state, metrics }) {
  const totalLICAssured = state.lic.reduce((s, l) => s + Number(l.sumAssured || 0), 0);
  const totalTermCover = state.termPlans.reduce((s, t) => s + Number(t.coverAmount || 0), 0);
  const licAnnualPremium = state.lic.reduce((s, l) => s + Number(l.annualPremium || 0), 0);
  const termAnnualPremium = state.termPlans.reduce((s, t) => s + Number(t.annualPremium || 0), 0);
  const totalAnnualPremium = licAnnualPremium + termAnnualPremium;
  const annualIncome = state.income.reduce((s, i) => s + Number(i.amount || 0), 0);
  const totalCover = totalTermCover + totalLICAssured;
  const recommended15x = annualIncome * 15;
  const recommended10x = annualIncome * 10;
  const coverRatio = annualIncome > 0 ? totalTermCover / annualIncome : 0;
  const adequacyLevel = coverRatio >= 15 ? "excellent" : coverRatio >= 10 ? "adequate" : coverRatio >= 5 ? "low" : "critical";
  const adequacyColor = { excellent: THEME.sage, adequate: THEME.gold, low: THEME.gold, critical: THEME.rust }[adequacyLevel];
  const adequacyLabel = { excellent: "Excellent (≥15×)", adequate: "Adequate (10–15×)", low: "Low (5–10×)", critical: "Critical (<5×)" }[adequacyLevel];

  return (
    <div>
      <SectionTitle sub="Life Insurance, LIC policies and term plan coverage at a glance">
        Insurance Summary
      </SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Tile icon={Shield} label="Total LIC Sum Assured" value={fmtINRFull(totalLICAssured)} />
        <Tile icon={Heart} label="Total Term Cover" value={fmtINRFull(totalTermCover)} />
        <Tile icon={Wallet} label="Total Annual Premium" value={fmtINRFull(totalAnnualPremium)} />
        <Tile icon={Zap} label="Cover Ratio" value={annualIncome > 0 ? coverRatio.toFixed(1) + "×" : "—"} sub={adequacyLabel} subColor={adequacyColor} />
      </div>

      {/* D10 – Insurance Adequacy Checker */}
      {annualIncome > 0 && (
        <div style={{ ...card, marginBottom: 24 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Coverage Adequacy Checker · 15× Rule</div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px 20px", alignItems: "center", marginBottom: 20 }}>
            {[
              { label: "Your annual income", val: fmtINRFull(annualIncome) },
              { label: "Recommended cover (10× minimum)", val: fmtINRFull(recommended10x) },
              { label: "Recommended cover (15× ideal)", val: fmtINRFull(recommended15x) },
              { label: "Your term cover", val: fmtINRFull(totalTermCover) },
              { label: "Gap to 15×", val: totalTermCover >= recommended15x ? "None — fully covered!" : fmtINRFull(recommended15x - totalTermCover) },
            ].map(({ label, val }, i) => (
              <React.Fragment key={i}>
                <div style={{ fontSize: 13, color: THEME.muted }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: i === 3 ? adequacyColor : i === 4 ? (totalTermCover >= recommended15x ? THEME.sage : THEME.rust) : THEME.ink }}>{val}</div>
              </React.Fragment>
            ))}
          </div>
          <div style={{ height: 12, background: THEME.line, borderRadius: 6, overflow: "visible", position: "relative", marginBottom: 10 }}>
            <div style={{ height: "100%", width: Math.min((totalTermCover / recommended15x) * 100, 100) + "%", background: adequacyColor, borderRadius: 6, transition: "width 0.6s" }} />
            {[10, 15].map((mult) => {
              const pct = Math.min((annualIncome * mult / recommended15x) * 100, 100);
              return <div key={mult} style={{ position: "absolute", top: -4, left: pct + "%", width: 2, height: 20, background: THEME.ink, opacity: 0.35 }} />;
            })}
          </div>
          <div style={{ display: "flex", gap: 20, fontSize: 11, color: THEME.muted }}>
            <span><span style={{ background: THEME.rust, borderRadius: 2, padding: "1px 6px", color: "#fff", marginRight: 4 }}>|</span> 10× mark</span>
            <span><span style={{ background: THEME.ink, borderRadius: 2, padding: "1px 6px", color: "#fff", opacity: 0.4, marginRight: 4 }}>|</span> 15× ideal</span>
            <span style={{ marginLeft: "auto", fontWeight: 700, color: adequacyColor }}>{adequacyLabel}</span>
          </div>
        </div>
      )}

      {/* LIC Policies */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Life Insurance (LIC)</div>
        {state.lic.length === 0 ? (
          <EmptyHint text="No LIC policies added" />
        ) : (
          <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${THEME.ink}` }}>
                <th style={th}>Policy No</th>
                <th style={th}>Plan Name</th>
                <th style={{ ...th, textAlign: "right" }}>Sum Assured</th>
                <th style={{ ...th, textAlign: "right" }}>Annual Premium</th>
                <th style={th}>Maturity Date</th>
              </tr>
            </thead>
            <tbody>
              {state.lic.map((l) => (
                <tr key={l.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}>
                  <td style={td}>****{String(l.policyNumber || "").slice(-4)}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{l.planName}</td>
                  <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(l.sumAssured)}</td>
                  <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(l.annualPremium)}</td>
                  <td style={td}>{l.maturityDate}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {/* Term Plans */}
      <div style={card}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Term Plans</div>
        {state.termPlans.length === 0 ? (
          <EmptyHint text="No term plans added" />
        ) : (
          <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${THEME.ink}` }}>
                <th style={th}>Insurer</th>
                <th style={th}>Plan Name</th>
                <th style={{ ...th, textAlign: "right" }}>Cover Amount</th>
                <th style={{ ...th, textAlign: "right" }}>Annual Premium</th>
                <th style={th}>Expiry Date</th>
              </tr>
            </thead>
            <tbody>
              {state.termPlans.map((t) => (
                <tr key={t.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}>
                  <td style={td}>{t.insurer}</td>
                  <td style={{ ...td, fontWeight: 600 }}>{t.planName}</td>
                  <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(t.coverAmount)}</td>
                  <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(t.annualPremium)}</td>
                  <td style={td}>{t.expiryDate}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}

// ================== QUICK ADD MODAL ==================
function QuickAddModal({ onClose, onSave, bankAccounts }) {
  const [f, setF] = useState({
    date: today(),
    type: "debit",
    amount: "",
    category: "Food",
    note: "",
    accountId: bankAccounts[0]?.id || "",
  });
  const categories = ["Food", "Rent", "Transport", "Shopping", "Bills", "Salary", "Investment", "Tax", "Medical", "Entertainment", "EMI", "Groceries", "Utilities", "Other"];
  return (
    <Modal title="Quick Add Transaction" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Date">
          <input style={input} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
        <Field label="Type">
          <select style={input} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            <option value="debit">Debit (Expense)</option>
            <option value="credit">Credit (Income)</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Amount (₹)">
          <input style={input} type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="0" />
        </Field>
        <Field label="Category">
          <select style={input} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Account">
        <select style={input} value={f.accountId} onChange={(e) => setF({ ...f, accountId: e.target.value })}>
          {bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.bankName}</option>)}
        </select>
      </Field>
      <Field label="Note">
        <input style={input} value={f.note} onChange={(e) => {
          const note = e.target.value;
          const cat = autoCateg(note);
          setF({ ...f, note, ...(cat ? { category: cat } : {}) });
        }} placeholder="Optional note — category auto-detected" />
      </Field>
      <ModalActions onSave={() => f.amount && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

// ================== SETTINGS TAB ==================
function SettingsTab({
  state, setState, exportJSON, resetAll, showToast, onSignOut,
  accentKey, setAccentKey,
  density, setDensity,
  sidebarNav, setSidebarNav,
  radiusKey, setRadiusKey,
  fontKey, setFontKey,
  bgStyle, setBgStyle,
  animSpeed, setAnimSpeed,
  chartStyle, setChartStyle
}) {
  const [prof, setProf] = useState({ ...state.profile });
  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveProfile = () => {
    setState((s) => ({ ...s, profile: { ...s.profile, ...prof } }));
    setSaved(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  };

  useEffect(() => () => { if (savedTimerRef.current) clearTimeout(savedTimerRef.current); }, []);

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const input = e.target;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result as string);
        if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.bankAccounts)) {
          showToast("Invalid backup — not a valid finance export", "error");
          input.value = "";
          return;
        }
        setState({ ...DEFAULT_STATE, ...parsed });
        showToast("Backup restored successfully");
      } catch {
        showToast("Invalid backup file — check JSON format", "error");
      }
      input.value = "";
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ maxWidth: 1000 }}>
      <SectionTitle sub="Personalise your dashboard and manage your financial data">
        Settings & UI Preferences
      </SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24, marginBottom: 24 }}>
        
        {/* UI PREFERENCES */}
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles size={18} color={THEME.accent} /> Visual Theme
          </div>
          
          <Field label="Accent Color">
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {Object.entries(ACCENT_PALETTES).map(([k, p]) => (
                <button
                  key={k}
                  onClick={() => setAccentKey(k as AccentKey)}
                  title={p.label}
                  style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: p.dot, border: accentKey === k ? `4px solid ${THEME.line}` : "none",
                    cursor: "pointer", transition: "transform 0.2s",
                    transform: accentKey === k ? "scale(1.1)" : "scale(1)"
                  }}
                />
              ))}
            </div>
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
            <Field label="Layout Density">
              <select style={input} value={density} onChange={(e) => setDensity(e.target.value as DensityKey)}>
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="comfortable">Comfortable</option>
              </select>
            </Field>
            <Field label="Navigation Style">
              <select style={input} value={sidebarNav ? "sidebar" : "top"} onChange={(e) => setSidebarNav(e.target.value === "sidebar")}>
                <option value="top">Top Tabs</option>
                <option value="sidebar">Sidebar Menu</option>
              </select>
            </Field>
          </div>

          <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Card Roundness">
              <select style={input} value={radiusKey} onChange={(e) => setRadiusKey(e.target.value)}>
                <option value="sharp">Sharp (4px)</option>
                <option value="modern">Modern (12px)</option>
                <option value="round">Round (24px)</option>
              </select>
            </Field>
            <Field label="Typography">
              <select style={input} value={fontKey} onChange={(e) => setFontKey(e.target.value)}>
                <option value="inter">Inter (Default)</option>
                <option value="outfit">Outfit (Modern)</option>
                <option value="roboto">Roboto (Pro)</option>
              </select>
            </Field>
          </div>

          <div style={{ marginTop: 16 }}>
            <Field label="Background Style">
              <div style={{ display: "flex", gap: 8 }}>
                {["plain", "mesh", "dots"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setBgStyle(s)}
                    style={{
                      flex: 1,
                      padding: "8px",
                      borderRadius: 8,
                      border: `1px solid ${bgStyle === s ? THEME.accent : THEME.line}`,
                      background: bgStyle === s ? THEME.accent + "11" : THEME.darkInk,
                      color: bgStyle === s ? THEME.accent : THEME.muted,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      textTransform: "capitalize"
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Animation Speed">
              <select style={input} value={animSpeed} onChange={(e) => setAnimSpeed(e.target.value)}>
                <option value="snappy">Snappy (Fast)</option>
                <option value="smooth">Smooth (Default)</option>
                <option value="relaxed">Relaxed (Slow)</option>
              </select>
            </Field>
            <Field label="Chart Line Style">
              <select style={input} value={chartStyle} onChange={(e) => setChartStyle(e.target.value)}>
                <option value="monotone">Curved Lines</option>
                <option value="linear">Straight Lines</option>
                <option value="step">Step Lines</option>
              </select>
            </Field>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <User size={18} /> Profile
          </div>
          <Field label="Display Name">
            <input style={input} value={prof.name || ""} onChange={(e) => setProf({ ...prof, name: e.target.value })} placeholder="Your name" />
          </Field>
          <Field label="Financial Year">
            <select style={input} value={prof.fy || "2025-26"} onChange={(e) => setProf({ ...prof, fy: e.target.value })}>
              <option value="2024-25">FY 2024-25</option>
              <option value="2025-26">FY 2025-26</option>
              <option value="2026-27">FY 2026-27</option>
            </select>
          </Field>
          <Field label="Tax Regime">
            <select style={input} value={prof.regime || "new"} onChange={(e) => setProf({ ...prof, regime: e.target.value })}>
              <option value="new">New Regime</option>
              <option value="old">Old Regime</option>
            </select>
          </Field>
          <button style={{ ...btnAccent, marginTop: 8 }} onClick={saveProfile}>
            {saved ? "Saved!" : "Save Profile"}
          </button>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={18} /> Data Management
          </div>
          <div style={{ display: "grid", gap: 16 }}>
            <button style={btnGhost} onClick={exportJSON}><Download size={14} /> Export Backup</button>
            <label style={btnGhost}>
              <Upload size={14} /> Import Backup
              <input type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
            </label>
            <button style={{ ...btnGhost, color: THEME.rust, borderColor: THEME.rust }} onClick={resetAll}><Trash2 size={14} /> Reset All</button>
            <div style={{ borderTop: `1px solid ${THEME.line}`, paddingTop: 16, marginTop: 4 }}>
              <button
                style={{ ...btnGhost, color: THEME.rust, borderColor: THEME.rust, width: "100%", justifyContent: "center" }}
                onClick={onSignOut}
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <Activity size={18} /> System Summary
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Stat k="Transactions" v={state.transactions.length} />
            <Stat k="Accounts" v={state.bankAccounts.length} />
            <Stat k="Investments" v={state.mutualFunds.length + state.stocks.length} />
            <Stat k="Goals" v={state.goals.length} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ================== CALCULATORS TAB ==================
function CalculatorsTab({ metrics = null }: any) {
  // EMI Calculator
  const [emiP, setEmiP] = useState("1000000");
  const [emiR, setEmiR] = useState("8.5");
  const [emiN, setEmiN] = useState("240");

  const emiResult = useMemo(() => {
    const p = Number(emiP) || 0, r = (Number(emiR) || 0) / 12 / 100, n = Number(emiN) || 1;
    if (r === 0) return { emi: p / n, total: p, interest: 0 };
    const emi = p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    return { emi, total: emi * n, interest: emi * n - p };
  }, [emiP, emiR, emiN]);

  // SIP Returns Projector
  const [sipAmt, setSipAmt] = useState("10000");
  const [sipYrs, setSipYrs] = useState("10");
  const [sipRate, setSipRate] = useState("12");
  const sipResult = useMemo(() => {
    const m = Number(sipAmt) || 0, y = Number(sipYrs) || 1, r = (Number(sipRate) || 0) / 12 / 100;
    const n = y * 12;
    const corpus = r === 0 ? m * n : m * (Math.pow(1 + r, n) - 1) / r * (1 + r);
    return { corpus, invested: m * n, gains: corpus - m * n };
  }, [sipAmt, sipYrs, sipRate]);

  // FD / RD Maturity Calculator
  const [fdP, setFdP] = useState("100000");
  const [fdR, setFdR] = useState("6.5");
  const [fdYrs, setFdYrs] = useState("3");
  const [fdType, setFdType] = useState("fd");
  const fdResult = useMemo(() => {
    const p = Number(fdP) || 0, r = (Number(fdR) || 0) / 100, y = Number(fdYrs) || 1;
    if (fdType === "fd") {
      const maturity = p * Math.pow(1 + r / 4, 4 * y);
      return { maturity, interest: maturity - p };
    } else {
      const n = y * 12, mr = r / 12;
      const maturity = mr === 0 ? p * n : p * (Math.pow(1 + mr, n) - 1) / mr * (1 + mr);
      return { maturity, interest: maturity - p * n, totalDeposited: p * n };
    }
  }, [fdP, fdR, fdYrs, fdType]);

  // A1 – FIRE Calculator
  const [fireCorpus, setFireCorpus] = useState("2000000");
  const [fireSavings, setFireSavings] = useState("30000");
  const [fireReturn, setFireReturn] = useState("10");
  const [fireExpenses, setFireExpenses] = useState("600000");
  const [fireWR, setFireWR] = useState("4");
  const fireResult = useMemo(() => {
    const corpus = Number(fireCorpus) || 0;
    const savings = Number(fireSavings) || 0;
    const annR = (Number(fireReturn) || 0) / 100;
    const annExp = Number(fireExpenses) || 0;
    const wr = (Number(fireWR) || 4) / 100;
    const target = wr > 0 ? annExp / wr : 0;
    const r = annR / 12;
    let years = 0;
    if (target <= corpus) { years = 0; }
    else if (r === 0) { years = savings > 0 ? (target - corpus) / savings / 12 : Infinity; }
    else { years = Math.log((target * r + savings) / (corpus * r + savings)) / Math.log(1 + r) / 12; }
    return { target, years: Math.max(0, years), monthly: savings };
  }, [fireCorpus, fireSavings, fireReturn, fireExpenses, fireWR]);

  // A2 – Salary Hike Simulator
  const [hikeBase, setHikeBase] = useState("1200000");
  const [hikePct, setHikePct] = useState("15");
  const hikeResult = useMemo(() => {
    const base = Number(hikeBase) || 0;
    const pct = Number(hikePct) || 0;
    const newSal = base * (1 + pct / 100);
    const calcNewTax = (sal) => {
      const std = Math.min(sal, 75000);
      const taxable = Math.max(0, sal - std);
      let tax = 0, prev = 0;
      [[400000,0],[800000,.05],[1200000,.10],[1600000,.15],[2000000,.20],[2400000,.25],[Infinity,.30]].forEach(([l, r]) => {
        const inSlab = Math.max(0, Math.min(taxable, l === Infinity ? taxable : l) - prev);
        tax += inSlab * r; prev = l;
      });
      const rebate = taxable <= 1200000 ? tax : 0;
      const after = Math.max(0, tax - rebate);
      return after * 1.04;
    };
    const calcOldTax = (sal) => {
      const taxable = Math.max(0, sal - 50000 - 150000);
      let tax = 0, prev = 0;
      [[250000,0],[500000,.05],[1000000,.20],[Infinity,.30]].forEach(([l, r]) => {
        const inSlab = Math.max(0, Math.min(taxable, l === Infinity ? taxable : l) - prev);
        tax += inSlab * r; prev = l;
      });
      const rebate = taxable <= 500000 ? tax : 0;
      const after = Math.max(0, tax - rebate);
      return after * 1.04;
    };
    return {
      newSal,
      newRegimeTaxCurrent: calcNewTax(base),
      newRegimeTaxAfter: calcNewTax(newSal),
      takehomeCurrent: base - calcNewTax(base),
      takehomeNew: newSal - calcNewTax(newSal),
      gain: newSal - calcNewTax(newSal) - (base - calcNewTax(base)),
    };
  }, [hikeBase, hikePct]);

  // A3 – Loan vs Invest Analyzer
  const [lviOutstanding, setLviOutstanding] = useState("550000");
  const [lviRate, setLviRate] = useState("8.5");
  const [lviMonths, setLviMonths] = useState("36");
  const [lviInvReturn, setLviInvReturn] = useState("12");
  const lviResult = useMemo(() => {
    const outstanding = Number(lviOutstanding) || 0;
    const annualRate = Number(lviRate) || 0;
    const months = Number(lviMonths) || 1;
    const invR = (Number(lviInvReturn) || 0) / 12 / 100;
    const r = annualRate / 12 / 100;
    const emi = r === 0 ? outstanding / months : outstanding * r * Math.pow(1 + r, months) / (Math.pow(1 + r, months) - 1);
    const totalPayments = emi * months;
    const interestSaved = totalPayments - outstanding;
    const sipCorpus = invR === 0 ? emi * months : emi * (Math.pow(1 + invR, months) - 1) / invR * (1 + invR);
    const investGain = sipCorpus - totalPayments;
    const betterChoice = interestSaved >= investGain ? "prepay" : "invest";
    return { emi, interestSaved, sipCorpus, investGain, totalPayments, betterChoice };
  }, [lviOutstanding, lviRate, lviMonths, lviInvReturn]);

  // B – Loan Amortization Schedule
  const [amoP, setAmoP] = useState("1000000");
  const [amoR, setAmoR] = useState("8.5");
  const [amoN, setAmoN] = useState("240");
  const [amoPage, setAmoPage] = useState(0);
  const AMO_PAGE_SIZE = 12;
  const amoResult = useMemo(() => {
    const p = Number(amoP) || 0, r = (Number(amoR) || 0) / 12 / 100, n = Number(amoN) || 1;
    if (p <= 0 || n <= 0) return { emi: 0, schedule: [], totalInterest: 0, totalPayment: 0 };
    const emi = r === 0 ? p / n : p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    const schedule: { month: number; emi: number; principal: number; interest: number; balance: number }[] = [];
    let balance = p;
    for (let i = 1; i <= n; i++) {
      const interest = balance * r;
      const principal = Math.min(emi - interest, balance);
      balance = Math.max(0, balance - principal);
      schedule.push({ month: i, emi, principal, interest, balance });
    }
    return { emi, schedule, totalInterest: emi * n - p, totalPayment: emi * n };
  }, [amoP, amoR, amoN]);

  // C – Net Worth Projection
  const [nwpSavings, setNwpSavings] = useState("30000");
  const [nwpReturn, setNwpReturn] = useState("10");
  const [nwpYears, setNwpYears] = useState("15");
  const nwpData = useMemo(() => {
    const current = metrics?.netWorth || 0;
    const monthly = Number(nwpSavings) || 0;
    const annualR = (Number(nwpReturn) || 0) / 100;
    const years = Math.max(1, Math.min(Number(nwpYears) || 15, 40));
    const startYear = new Date().getFullYear();
    const points: { year: number; value: number }[] = [];
    let corpus = current;
    for (let y = 0; y <= years; y++) {
      points.push({ year: startYear + y, value: Math.round(corpus) });
      const r = annualR / 12;
      corpus = r === 0
        ? corpus + monthly * 12
        : corpus * (1 + annualR) + monthly * (Math.pow(1 + r, 12) - 1) / r * (1 + r);
    }
    return points;
  }, [metrics?.netWorth, nwpSavings, nwpReturn, nwpYears]);

  const calcCard = { ...card as any, marginBottom: 0 };
  const inpRow = (lbl, val, set) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 4, fontWeight: 500 }}>{lbl}</div>
      <input style={{ ...input, fontSize: 14 }} type="number" value={val} onChange={(e) => set(e.target.value)} />
    </div>
  );
  const resultRow = (lbl, val, highlight?) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px dashed ${THEME.line}`, fontSize: 14 }}>
      <span style={{ color: THEME.muted }}>{lbl}</span>
      <span style={{ fontWeight: highlight ? 800 : 600, color: highlight ? THEME.sage : THEME.ink }}>{fmtINRFull(val)}</span>
    </div>
  );

  return (
    <div>
      <SectionTitle sub="Quick financial calculators — EMI, SIP projector, FD/RD maturity">Calculators</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>

        {/* EMI Calculator */}
        <div style={calcCard}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>EMI Calculator</div>
          {inpRow("Loan Amount (₹)", emiP, setEmiP)}
          {inpRow("Annual Interest Rate (%)", emiR, setEmiR)}
          {inpRow("Tenure (months)", emiN, setEmiN)}
          <div style={{ background: "rgba(128,128,128,0.05)", borderRadius: 10, padding: 16, marginTop: 4 }}>
            <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 8, letterSpacing: "0.15em", textTransform: "uppercase" }}>Result</div>
            {resultRow("Monthly EMI", emiResult.emi)}
            {resultRow("Total Payment", emiResult.total)}
            {resultRow("Total Interest", emiResult.interest)}
            <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ height: 10, flex: 1, background: THEME.line, borderRadius: 5, overflow: "hidden", display: "flex" }}>
                <div style={{ height: "100%", width: emiResult.total > 0 ? ((Number(emiP) / emiResult.total) * 100) + "%" : "0%", background: THEME.accent }} />
                <div style={{ height: "100%", flex: 1, background: THEME.rust }} />
              </div>
            </div>
            <div style={{ display: "flex", fontSize: 11, color: THEME.muted, gap: 16, marginTop: 4 }}>
              <span><span style={{ color: THEME.accent }}>■</span> Principal</span>
              <span><span style={{ color: THEME.rust }}>■</span> Interest</span>
            </div>
          </div>
        </div>

        {/* SIP Returns Projector */}
        <div style={calcCard}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>SIP Returns Projector</div>
          {inpRow("Monthly SIP Amount (₹)", sipAmt, setSipAmt)}
          {inpRow("Investment Period (years)", sipYrs, setSipYrs)}
          {inpRow("Expected Annual Return (%)", sipRate, setSipRate)}
          <div style={{ background: "rgba(128,128,128,0.05)", borderRadius: 10, padding: 16, marginTop: 4 }}>
            <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 8, letterSpacing: "0.15em", textTransform: "uppercase" }}>Result</div>
            {resultRow("Amount Invested", sipResult.invested)}
            {resultRow("Estimated Gains", sipResult.gains)}
            {resultRow("Total Corpus", sipResult.corpus, true)}
            <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ height: 10, flex: 1, background: THEME.line, borderRadius: 5, overflow: "hidden", display: "flex" }}>
                <div style={{ height: "100%", width: sipResult.corpus > 0 ? ((sipResult.invested / sipResult.corpus) * 100) + "%" : "0%", background: THEME.muted }} />
                <div style={{ height: "100%", flex: 1, background: THEME.sage }} />
              </div>
            </div>
            <div style={{ display: "flex", fontSize: 11, color: THEME.muted, gap: 16, marginTop: 4 }}>
              <span><span style={{ color: THEME.muted }}>■</span> Invested</span>
              <span><span style={{ color: THEME.sage }}>■</span> Gains</span>
            </div>
          </div>
        </div>

        {/* A1 – FIRE Calculator */}
        <div style={calcCard}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>FIRE Calculator</div>
          <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 16 }}>Financial Independence / Retire Early</div>
          {inpRow("Current Corpus (₹)", fireCorpus, setFireCorpus)}
          {inpRow("Monthly Savings (₹)", fireSavings, setFireSavings)}
          {inpRow("Expected Annual Return (%)", fireReturn, setFireReturn)}
          {inpRow("Annual Expenses at Retirement (₹)", fireExpenses, setFireExpenses)}
          {inpRow("Safe Withdrawal Rate (%)", fireWR, setFireWR)}
          <div style={{ background: "rgba(128,128,128,0.05)", borderRadius: 10, padding: 16, marginTop: 4 }}>
            <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 8, letterSpacing: "0.15em", textTransform: "uppercase" }}>Result</div>
            {resultRow("FIRE Target Corpus", fireResult.target)}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px dashed ${THEME.line}`, fontSize: 14 }}>
              <span style={{ color: THEME.muted }}>Years to FIRE</span>
              <span style={{ fontWeight: 800, color: fireResult.years === 0 ? THEME.sage : THEME.ink }}>
                {fireResult.years === 0 ? "Already there! 🎉" : isFinite(fireResult.years) ? fireResult.years.toFixed(1) + " yrs" : "∞ (save more)"}
              </span>
            </div>
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 8 }}>
              At {fireWR}% SWR, corpus of {fmtINR(fireResult.target)} sustains ₹{fmtINR(Number(fireExpenses))} annual spend forever.
            </div>
          </div>
        </div>

        {/* A2 – Salary Hike Simulator */}
        <div style={calcCard}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Salary Hike Simulator</div>
          <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 16 }}>See exact take-home impact before appraisal</div>
          {inpRow("Current Annual Salary (₹)", hikeBase, setHikeBase)}
          {inpRow("Hike Percentage (%)", hikePct, setHikePct)}
          <div style={{ background: "rgba(128,128,128,0.05)", borderRadius: 10, padding: 16, marginTop: 4 }}>
            <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 8, letterSpacing: "0.15em", textTransform: "uppercase" }}>Result (New Regime)</div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px dashed ${THEME.line}`, fontSize: 14 }}>
              <span style={{ color: THEME.muted }}>New Salary</span>
              <span style={{ fontWeight: 700 }}>{fmtINRFull(hikeResult.newSal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px dashed ${THEME.line}`, fontSize: 14 }}>
              <span style={{ color: THEME.muted }}>Tax (before → after)</span>
              <span style={{ fontWeight: 600 }}>{fmtINR(hikeResult.newRegimeTaxCurrent)} → <span style={{ color: THEME.rust }}>{fmtINR(hikeResult.newRegimeTaxAfter)}</span></span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px dashed ${THEME.line}`, fontSize: 14 }}>
              <span style={{ color: THEME.muted }}>Take-home (before → after)</span>
              <span style={{ fontWeight: 600 }}>{fmtINR(hikeResult.takehomeCurrent)} → <span style={{ color: THEME.sage }}>{fmtINR(hikeResult.takehomeNew)}</span></span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontSize: 15 }}>
              <span style={{ color: THEME.muted, fontWeight: 600 }}>Net annual gain</span>
              <span style={{ fontWeight: 800, color: THEME.sage }}>+{fmtINRFull(hikeResult.gain)}</span>
            </div>
          </div>
        </div>

        {/* A3 – Loan vs Invest Analyzer */}
        <div style={calcCard}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Loan vs Invest Analyzer</div>
          <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 16 }}>Prepay your loan or invest the money?</div>
          {inpRow("Outstanding Loan Balance (₹)", lviOutstanding, setLviOutstanding)}
          {inpRow("Loan Interest Rate (% p.a.)", lviRate, setLviRate)}
          {inpRow("Months Remaining", lviMonths, setLviMonths)}
          {inpRow("Expected Investment Return (% p.a.)", lviInvReturn, setLviInvReturn)}
          <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 12 }}>
            Computed EMI: <b style={{ color: THEME.ink }}>{fmtINRFull(lviResult.emi)}/mo</b>
          </div>
          <div style={{ background: "rgba(128,128,128,0.05)", borderRadius: 10, padding: 16, marginTop: 4 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 10 }}>
              <div style={{ padding: 12, borderRadius: 8, border: `2px solid ${lviResult.betterChoice === "prepay" ? THEME.sage : THEME.line}`, background: lviResult.betterChoice === "prepay" ? "rgba(30,142,62,0.07)" : "transparent" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: THEME.muted, marginBottom: 4 }}>Prepay Loan</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: THEME.sage }}>{fmtINR(lviResult.interestSaved)}</div>
                <div style={{ fontSize: 11, color: THEME.muted }}>Interest saved</div>
                {lviResult.betterChoice === "prepay" && <div style={{ fontSize: 10, color: THEME.sage, fontWeight: 700, marginTop: 4 }}>✓ RECOMMENDED</div>}
              </div>
              <div style={{ padding: 12, borderRadius: 8, border: `2px solid ${lviResult.betterChoice === "invest" ? THEME.accent : THEME.line}`, background: lviResult.betterChoice === "invest" ? "rgba(26,115,232,0.07)" : "transparent" }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: THEME.muted, marginBottom: 4 }}>Invest as SIP</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: THEME.accent }}>{fmtINR(lviResult.investGain)}</div>
                <div style={{ fontSize: 11, color: THEME.muted }}>Gain above EMIs paid</div>
                {lviResult.betterChoice === "invest" && <div style={{ fontSize: 10, color: THEME.accent, fontWeight: 700, marginTop: 4 }}>✓ RECOMMENDED</div>}
              </div>
            </div>
            <div style={{ fontSize: 11, color: THEME.muted }}>SIP corpus at end of tenure: <b>{fmtINRFull(lviResult.sipCorpus)}</b></div>
          </div>
        </div>

        {/* FD / RD Maturity Calculator */}
        <div style={calcCard}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 20 }}>FD / RD Maturity Calculator</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {["fd", "rd"].map((t) => (
              <button key={t} onClick={() => setFdType(t)} style={{ ...btnGhost, flex: 1, background: fdType === t ? THEME.accent : "transparent", color: fdType === t ? THEME.paper : THEME.ink }}>
                {t.toUpperCase()}
              </button>
            ))}
          </div>
          {inpRow(fdType === "fd" ? "Principal Amount (₹)" : "Monthly Deposit (₹)", fdP, setFdP)}
          {inpRow("Annual Interest Rate (%)", fdR, setFdR)}
          {inpRow("Tenure (years)", fdYrs, setFdYrs)}
          <div style={{ background: "rgba(128,128,128,0.05)", borderRadius: 10, padding: 16, marginTop: 4 }}>
            <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 8, letterSpacing: "0.15em", textTransform: "uppercase" }}>Result</div>
            {fdType === "rd" && resultRow("Total Deposited", fdResult.totalDeposited || 0)}
            {resultRow("Interest Earned", fdResult.interest)}
            {resultRow("Maturity Value", fdResult.maturity, true)}
          </div>
        </div>

        {/* B – Loan Amortization Schedule */}
        <div style={{ ...calcCard, gridColumn: "1 / -1" }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Loan Amortization Schedule</div>
          <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 16 }}>Month-by-month principal/interest breakdown</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
            {inpRow("Loan Amount (₹)", amoP, (v) => { setAmoP(v); setAmoPage(0); })}
            {inpRow("Annual Interest Rate (%)", amoR, (v) => { setAmoR(v); setAmoPage(0); })}
            {inpRow("Tenure (months)", amoN, (v) => { setAmoN(v); setAmoPage(0); })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 16 }}>
            <div style={{ padding: 12, background: "rgba(128,128,128,0.05)", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>Monthly EMI</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink }}>{fmtINRFull(amoResult.emi)}</div>
            </div>
            <div style={{ padding: 12, background: "rgba(128,128,128,0.05)", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>Total Interest</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: THEME.rust }}>{fmtINRFull(amoResult.totalInterest)}</div>
            </div>
            <div style={{ padding: 12, background: "rgba(128,128,128,0.05)", borderRadius: 8, textAlign: "center" }}>
              <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>Total Payment</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: THEME.accent }}>{fmtINRFull(amoResult.totalPayment)}</div>
            </div>
          </div>
          {amoResult.schedule.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${THEME.ink}` }}>
                    <th style={th}>Month</th>
                    <th style={{ ...th, textAlign: "right" }}>EMI</th>
                    <th style={{ ...th, textAlign: "right" }}>Principal</th>
                    <th style={{ ...th, textAlign: "right" }}>Interest</th>
                    <th style={{ ...th, textAlign: "right" }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {amoResult.schedule.slice(amoPage * AMO_PAGE_SIZE, (amoPage + 1) * AMO_PAGE_SIZE).map((row) => (
                    <tr key={row.month} style={{ borderBottom: `1px dashed ${THEME.line}` }}>
                      <td style={td}>{row.month}</td>
                      <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(row.emi)}</td>
                      <td style={{ ...td, textAlign: "right", color: THEME.sage, fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(row.principal)}</td>
                      <td style={{ ...td, textAlign: "right", color: THEME.rust, fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(row.interest)}</td>
                      <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 13 }}>
                <span style={{ color: THEME.muted }}>Rows {amoPage * AMO_PAGE_SIZE + 1}–{Math.min((amoPage + 1) * AMO_PAGE_SIZE, amoResult.schedule.length)} of {amoResult.schedule.length}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={btnGhost} onClick={() => setAmoPage(p => Math.max(0, p - 1))} disabled={amoPage === 0}>← Prev</button>
                  <button style={btnGhost} onClick={() => setAmoPage(p => Math.min(Math.ceil(amoResult.schedule.length / AMO_PAGE_SIZE) - 1, p + 1))} disabled={(amoPage + 1) * AMO_PAGE_SIZE >= amoResult.schedule.length}>Next →</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* C – Net Worth Projection */}
        <div style={{ ...calcCard, gridColumn: "1 / -1" }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Net Worth Projection</div>
          <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 16 }}>
            Starting from current net worth {metrics?.netWorth !== undefined ? `(${fmtINRFull(metrics.netWorth)})` : ""} — project growth with monthly savings + market returns
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
            {inpRow("Monthly Savings / SIP (₹)", nwpSavings, setNwpSavings)}
            {inpRow("Expected Annual Return (%)", nwpReturn, setNwpReturn)}
            {inpRow("Projection Years", nwpYears, setNwpYears)}
          </div>
          {nwpData.length > 1 && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 16 }}>
                <div style={{ padding: 12, background: "rgba(128,128,128,0.05)", borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>Today</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{fmtINRFull(nwpData[0]?.value)}</div>
                </div>
                <div style={{ padding: 12, background: `rgba(${THEME.sage === "var(--t-sage)" ? "52,211,153" : "5,150,105"},0.1)`, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>In {nwpYears} years ({nwpData[nwpData.length - 1]?.year})</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: THEME.sage }}>{fmtINRFull(nwpData[nwpData.length - 1]?.value)}</div>
                </div>
                <div style={{ padding: 12, background: "rgba(128,128,128,0.05)", borderRadius: 8 }}>
                  <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>Growth</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: THEME.gold }}>
                    {nwpData[0]?.value ? `${(((nwpData[nwpData.length - 1]?.value || 0) / nwpData[0].value - 1) * 100).toFixed(0)}%` : "—"}
                  </div>
                </div>
              </div>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={nwpData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="nwpGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={THEME.sage} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={THEME.sage} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: THEME.muted }} />
                    <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 10, fill: THEME.muted }} width={60} />
                    <Tooltip formatter={(v: any) => fmtINRFull(v)} labelFormatter={(l) => `Year ${l}`} />
                    <Area type="monotone" dataKey="value" stroke={THEME.sage} strokeWidth={2} fill="url(#nwpGrad)" dot={false} name="Net Worth" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

// ================== CSV IMPORT MODAL ==================
function CsvImportModal({ accounts, onClose, onImport }) {
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState("");

  const parseCSV = () => {
    setError("");
    try {
      const lines = csvText.trim().split("\n").filter(Boolean);
      if (lines.length === 0) { setError("Paste at least one row."); return; }
      const rows = lines.map((line, i) => {
        const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        // Expected: date, amount, type (credit/debit), category, note, accountId (optional)
        if (parts.length < 4) throw new Error(`Row ${i + 1}: need at least date, amount, type, category`);
        const [date, amount, type, category, note, accountId] = parts;
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) throw new Error(`Row ${i + 1}: date must be YYYY-MM-DD`);
        if (!["credit", "debit"].includes(type.toLowerCase())) throw new Error(`Row ${i + 1}: type must be credit or debit`);
        return { date, amount: String(Number(amount)), type: type.toLowerCase(), category: category || "Other", note: note || "", accountId: accountId || (accounts[0]?.id || "") };
      });
      setPreview(rows);
    } catch (e) {
      setError(e.message);
      setPreview([]);
    }
  };

  return (
    <Modal title="Import Transactions (CSV)" onClose={onClose}>
      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 8 }}>
        Format: <code style={{ background: "rgba(128,128,128,0.1)", padding: "1px 4px" }}>date, amount, type, category, note, accountId</code>
        <div style={{ marginTop: 4 }}>Example: <code style={{ background: "rgba(128,128,128,0.1)", padding: "1px 4px" }}>2025-04-01, 120000, credit, Salary, April Salary, 1</code></div>
      </div>
      <div style={{ marginBottom: 10 }}>
        <label style={{ ...label }}>Paste CSV rows</label>
        <textarea
          style={{ ...input, height: 120, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
          value={csvText}
          onChange={(e) => { setCsvText(e.target.value); setPreview([]); }}
          placeholder={"2025-04-01, 120000, credit, Salary, April Salary\n2025-04-05, 15000, debit, Rent, House Rent"}
        />
      </div>
      <button style={{ ...btnGhost, marginBottom: 12 }} onClick={parseCSV}>Preview</button>
      {error && <div style={{ color: THEME.rust, fontSize: 12, marginBottom: 8 }}>{error}</div>}
      {preview.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>{preview.length} rows parsed — review before importing:</div>
          <div style={{ maxHeight: 180, overflow: "auto", fontSize: 12 }}>
            {preview.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "4px 0", borderBottom: `1px dashed ${THEME.line}` }}>
                <span style={{ color: THEME.muted }}>{r.date}</span>
                <span style={{ color: r.type === "credit" ? THEME.sage : THEME.rust }}>{r.type === "credit" ? "+" : "−"}{fmtINRFull(r.amount)}</span>
                <span style={{ color: THEME.muted }}>{r.category}</span>
                <span>{r.note}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <ModalActions onSave={() => preview.length > 0 && onImport(preview)} onClose={onClose} />
    </Modal>
  );
}
