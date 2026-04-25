// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
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

const LIGHT_VARS: Record<string, string> = {
  "--t-ink":     "#202124",
  "--t-paper":   "#F8F9FA",
  "--t-accent":  "#1A73E8",
  "--t-gold":    "#F9AB00",
  "--t-sage":    "#1E8E3E",
  "--t-rust":    "#D93025",
  "--t-muted":   "#5F6368",
  "--t-line":    "#DADCE0",
  "--t-darkInk": "#FFFFFF",
};

const DARK_VARS: Record<string, string> = {
  "--t-ink":     "#E8EAED",
  "--t-paper":   "#0F0F1A",
  "--t-accent":  "#6BA8FF",
  "--t-gold":    "#FBBC04",
  "--t-sage":    "#46C56A",
  "--t-rust":    "#FF6B6B",
  "--t-muted":   "#9AA0A6",
  "--t-line":    "#3C4043",
  "--t-darkInk": "#1E1E2E",
};

const PIE_COLORS = [
  "#1A73E8",
  "#34A853",
  "#FBBC04",
  "#EA4335",
  "#4285F4",
  "#0F9D58",
  "#F4B400",
  "#DB4437",
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
    const raw = window.storage ? null : null; // window.storage is async; handled in effect
    return null;
  } catch {
    return null;
  }
};

const DEFAULT_STATE = (() => {
  const d = new Date();
  const ym = d.toISOString().slice(0, 7);
  const lastM = new Date(new Date(d).setMonth(d.getMonth() - 1)).toISOString().slice(0, 7);
  return {
    profile: { name: "Anand", fy: "2025-26", regime: "new" },
    bankAccounts: [
      { id: "1", bankName: "HDFC Bank", accountNo: "XXXX1234", balance: "150000" },
      { id: "2", bankName: "SBI", accountNo: "XXXX5678", balance: "45000" }
    ],
    transactions: [
      { id: "t1", date: `${ym}-01`, accountId: "1", amount: "120000", type: "credit", category: "Salary", note: "Monthly Salary" },
      { id: "t2", date: `${ym}-05`, accountId: "1", amount: "15000", type: "debit", category: "Rent", note: "House Rent" },
      { id: "t3", date: `${ym}-10`, accountId: "2", amount: "8000", type: "debit", category: "Food", note: "Groceries & Dining" },
      { id: "t4", date: `${ym}-15`, accountId: "2", amount: "5000", type: "debit", category: "Utilities", note: "Electricity & Internet" },
      { id: "t5", date: `${lastM}-01`, accountId: "1", amount: "120000", type: "credit", category: "Salary", note: "Monthly Salary" },
      { id: "t6", date: `${lastM}-05`, accountId: "1", amount: "15000", type: "debit", category: "Rent", note: "House Rent" }
    ],
    fixedDeposits: [
      { id: "fd1", bank: "HDFC Bank", principal: "500000", rate: "7", years: "3", startDate: "2023-01-01", maturityDate: "2026-01-01" }
    ],
    recurringDeposits: [
      { id: "rd1", bank: "SBI", monthly: "5000", rate: "6.5", tenureMonths: "24", startDate: "2024-01-01" },
      { id: "rd2", bank: "Post Office", monthly: "3000", rate: "6.8", tenureMonths: "36", startDate: "2023-06-01" },
    ],
    bonds: [
      { id: "b1", name: "G-Sec 7.26% 2033", type: "Government", faceValue: "100000", coupon: "7.26", maturityDate: "2033-09-15" },
      { id: "b2", name: "HDFC Corp Bond", type: "Corporate", faceValue: "50000", coupon: "8.5", maturityDate: "2030-03-31" },
    ],
    ppf: [
      { id: "p1", bank: "Post Office", balance: "350000", openDate: "2015-04-01", thisYearContribution: "150000" }
    ],
    nps: [
      { id: "n1", pran: "110123456789", tier: "I", balance: "250000", thisYearContribution: "50000" },
    ],
    lic: [
      { id: "lic1", policyNumber: "12345678", planName: "Jeevan Anand", sumAssured: "1000000", annualPremium: "45000", premiumPaid: "180000", maturityDate: "2035-06-15" },
      { id: "lic2", policyNumber: "98765432", planName: "Money Back 20yr", sumAssured: "500000", annualPremium: "28000", premiumPaid: "84000", maturityDate: "2030-12-31" },
    ],
    termPlans: [
      { id: "tp1", insurer: "HDFC Life", planName: "Click 2 Protect", coverAmount: "10000000", annualPremium: "12000", expiryDate: "2055-08-01" },
      { id: "tp2", insurer: "LIC", planName: "Tech Term", coverAmount: "5000000", annualPremium: "8500", expiryDate: "2050-04-15" },
    ],
    mutualFunds: [
      { id: "m1", scheme: "Parag Parikh Flexi Cap", type: "Equity", units: "800", currentNav: "325", invested: "200000" },
      { id: "m2", scheme: "Nifty 50 Index Fund", type: "Index", units: "500", currentNav: "370", invested: "150000" }
    ],
    stocks: [
      { id: "s1", symbol: "RELIANCE", dematId: "d1", qty: "20", currentPrice: "2250", avgPrice: "2500" },
      { id: "s2", symbol: "TCS", dematId: "d1", qty: "15", currentPrice: "3600", avgPrice: "2800" },
      { id: "s3", symbol: "INFY", dematId: "d2", qty: "25", currentPrice: "1580", avgPrice: "1400" },
      { id: "s4", symbol: "HDFCBANK", dematId: "d2", qty: "10", currentPrice: "1720", avgPrice: "1650" },
    ],
    demat: [
      { id: "d1", broker: "Zerodha", dpId: "IN300095", clientId: "AB1234" },
      { id: "d2", broker: "Groww", dpId: "IN303719", clientId: "GW5678" },
    ],
    creditCards: [
      { id: "c1", issuer: "Amazon Pay ICICI", network: "Visa", last4: "5678", limit: "300000", outstanding: "24000", dueDate: `${ym}-20` }
    ],
    prepaidCards: [],
    loansTaken: [
      { id: "l1", lender: "HDFC Bank", type: "Car", principal: "800000", outstanding: "550000", emi: "18000", rate: "8.5", monthsRemaining: "36" }
    ],
    loansGiven: [],
    subscriptions: [
      { id: "sub1", name: "Netflix", amount: "649", cycle: "monthly" },
      { id: "sub2", name: "Amazon Prime", amount: "1499", cycle: "yearly" }
    ],
    goals: [
      { id: "g1", name: "Emergency Fund", target: "600000", current: "400000" }
    ],
    income: [
      { id: "i1", source: "Salary", amount: "1440000", date: `${ym}-01` }
    ],
    taxPayments: [],
    budgets: [
      { id: "b1", category: "Food", monthly: "10000" },
      { id: "b2", category: "Rent", monthly: "15000" },
      { id: "b3", category: "Transport", monthly: "3000" },
      { id: "b4", category: "Entertainment", monthly: "2000" },
    ],
    reminders: [],
    sips: [
      { id: "sip1", scheme: "Parag Parikh Flexi Cap", fundType: "Equity", amount: "5000", frequency: "monthly", startDate: "2023-01-01", totalInstallments: "36" },
      { id: "sip2", scheme: "Nifty 50 Index Fund", fundType: "Index", amount: "3000", frequency: "monthly", startDate: "2022-07-01", totalInstallments: "60" },
      { id: "sip3", scheme: "HDFC Hybrid Equity", fundType: "Hybrid", amount: "2000", frequency: "monthly", startDate: "2024-01-01", totalInstallments: "24" },
    ],
  };
})();

// ================== MAIN APP ==================
export default function FinanceDashboard() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState(null);
  const [copied, setCopied] = useState(false);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try { return localStorage.getItem("finance-theme") === "dark"; } catch { return false; }
  });
  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showFAB, setShowFAB] = useState(false);
  const [fabModal, setFabModal] = useState(false);

  // Apply theme CSS vars whenever darkMode changes
  useEffect(() => {
    const vars = darkMode ? DARK_VARS : LIGHT_VARS;
    Object.entries(vars).forEach(([k, v]) =>
      document.documentElement.style.setProperty(k, v)
    );
    try { localStorage.setItem("finance-theme", darkMode ? "dark" : "light"); } catch {}
  }, [darkMode]);

  // Inject Google Fonts once
  useEffect(() => {
    if (document.getElementById("finance-dash-fonts")) return;
    const link = document.createElement("link");
    link.id = "finance-dash-fonts";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap";
    document.head.appendChild(link);
  }, []);

  // Load from persistent storage on mount
  useEffect(() => {
    (async () => {
      try {
        if (window.storage) {
          const result = await window.storage.get(STORAGE_KEY);
          if (result && result.value) {
            const parsed = JSON.parse(result.value);
            setState({ ...DEFAULT_STATE, ...parsed });
          }
        }
      } catch (e) {
        /* no data yet */
      }
      setLoaded(true);
    })();
  }, []);

  // Save on change
  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        if (window.storage) {
          await window.storage.set(STORAGE_KEY, JSON.stringify(state));
        }
      } catch (e) {
        console.error("save failed", e);
      }
    })();
  }, [state, loaded]);

  // ================== COMPUTED FINANCIAL METRICS ==================
  const metrics = useMemo(() => {
    const cashInBanks = state.bankAccounts.reduce(
      (s, a) => s + Number(a.balance || 0),
      0
    );
    const fdValue = state.fixedDeposits.reduce(
      (s, f) => s + Number(f.principal || 0),
      0
    );
    const rdValue = state.recurringDeposits.reduce((s, r) => {
      const m = monthsBetween(r.startDate, today());
      return (
        s + Math.min(m, Number(r.tenureMonths || 0)) * Number(r.monthly || 0)
      );
    }, 0);
    const bondValue = state.bonds.reduce(
      (s, b) => s + Number(b.faceValue || 0),
      0
    );
    const ppfValue = state.ppf.reduce((s, p) => s + Number(p.balance || 0), 0);
    const npsValue = state.nps.reduce((s, n) => s + Number(n.balance || 0), 0);
    const licValue = state.lic.reduce(
      (s, l) => s + Number(l.premiumPaid || 0),
      0
    );
    const mfValue = state.mutualFunds.reduce(
      (s, m) => s + Number(m.units || 0) * Number(m.currentNav || 0),
      0
    );
    const mfInvested = state.mutualFunds.reduce(
      (s, m) => s + Number(m.invested || 0),
      0
    );
    const stockValue = state.stocks.reduce(
      (s, st) => s + Number(st.qty || 0) * Number(st.currentPrice || 0),
      0
    );
    const stockInvested = state.stocks.reduce(
      (s, st) => s + Number(st.qty || 0) * Number(st.avgPrice || 0),
      0
    );

    const loansGivenValue = state.loansGiven.reduce(
      (s, l) => s + Number(l.outstanding || 0),
      0
    );
    const prepaidValue = state.prepaidCards.reduce(
      (s, p) => s + Number(p.balance || 0),
      0
    );

    const ccOutstanding = state.creditCards.reduce(
      (s, c) => s + Number(c.outstanding || 0),
      0
    );
    const loansTakenValue = state.loansTaken.reduce(
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
    const monthTxns = state.transactions.filter(
      (t) => t.date && t.date.startsWith(ym)
    );
    const monthIncome = monthTxns
      .filter((t) => t.type === "credit")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const monthExpense = monthTxns
      .filter((t) => t.type === "debit")
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    // Annual income from income ledger
    const fyStart = new Date(`${state.profile.fy.split("-")[0]}-04-01`);
    const annualIncome = state.income
      .filter((i) => new Date(i.date) >= fyStart)
      .reduce((s, i) => s + Number(i.amount || 0), 0);

    const subTotal = state.subscriptions.filter(sub => !sub.paused).reduce((s, sub) => {
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
    
    const taxDue = state.profile.regime === "old"
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
    };
  }, [state]);

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

  // Monthly trend for last 12 months
  const trendData = useMemo(() => {
    const arr = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const ym = d.toISOString().slice(0, 7);
      const label = d.toLocaleString("en-IN", { month: "short" });
      const txns = state.transactions.filter(
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
  }, [state.transactions]);

  // ================== CRUD ==================
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
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `finance-backup-${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const importJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        setState({ ...DEFAULT_STATE, ...parsed });
        alert("Backup restored successfully");
      } catch {
        alert("Invalid backup file");
      }
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
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    if (confirm("Delete ALL data? This cannot be undone."))
      setState(DEFAULT_STATE);
  };

  const copySummary = () => {
    const text = [
      "Personal Finance Dashboard · FY " + state.profile.fy,
      "Net Worth: " + fmtINRFull(metrics.netWorth),
      "Assets: " + fmtINRFull(metrics.totalAssets) + " | Liabilities: " + fmtINRFull(metrics.totalLiabilities),
      "Monthly Income: " + fmtINRFull(metrics.monthIncome) + " | Expenses: " + fmtINRFull(metrics.monthExpense),
      "MF: " + fmtINRFull(metrics.mfValue) + " | Stocks: " + fmtINRFull(metrics.stockValue),
      "Savings Rate: " + metrics.savingsRate.toFixed(1) + "%",
    ].join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ================== TABS ==================
  const tabs = [
    { id: "overview", label: "Ledger", icon: LineIcon },
    { id: "banks", label: "Banks", icon: Landmark },
    { id: "investments", label: "Investments", icon: TrendingUp },
    { id: "demat", label: "Demat & Stocks", icon: BarChart3 },
    { id: "credit", label: "Credit & Loans", icon: CreditCard },
    { id: "subs", label: "Subscriptions", icon: Repeat },
    { id: "sip", label: "SIP Tracker", icon: Activity },
    { id: "insurance", label: "Insurance", icon: Heart },
    { id: "goals", label: "Goals", icon: Target },
    { id: "budget", label: "Budget", icon: Wallet },
    { id: "reminders", label: "Reminders", icon: Bell },
    { id: "analytics", label: "Analytics", icon: PieIcon },
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

  if (!loaded) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: THEME.paper,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Inter', sans-serif",
          color: THEME.ink,
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: THEME.paper,
        fontFamily: "'Inter', sans-serif",
        color: THEME.ink,
        position: "relative",
      }}
    >

      {/* HEADER */}
      <header
        style={{
          borderBottom: `1px solid ${THEME.line}`,
          background: THEME.darkInk,
          position: "sticky",
          top: 0,
          zIndex: 40,
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        }}
      >
        <div
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            padding: "20px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.3em",
                color: THEME.muted,
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              Personal Finance · FY {state.profile.fy}
            </div>
            <h1
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 28,
                fontWeight: 700,
                margin: 0,
                letterSpacing: "-0.02em",
                color: THEME.ink,
                lineHeight: 1,
              }}
            >
              Finance Dashboard
            </h1>
          </div>
          {/* GLOBAL SEARCH */}
          <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: THEME.darkInk, border: `1px solid ${THEME.line}`, borderRadius: 8, padding: "8px 12px" }}>
              <Search size={14} style={{ color: THEME.muted, flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search transactions, stocks, goals…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setShowSearch(true); }}
                onFocus={() => setShowSearch(true)}
                onBlur={() => setTimeout(() => setShowSearch(false), 200)}
                style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, color: THEME.ink, fontFamily: "inherit", width: "100%" }}
              />
              {search && <button onClick={() => setSearch("")} style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted, padding: 0, lineHeight: 1 }}><X size={13} /></button>}
            </div>
            {showSearch && searchResults.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: THEME.darkInk, border: `1px solid ${THEME.line}`, borderRadius: 8, marginTop: 4, zIndex: 200, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden" }}>
                {searchResults.map((r, i) => (
                  <div key={i} onMouseDown={() => { setTab(r.tab); setSearch(""); setShowSearch(false); }} style={{ padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${THEME.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {/* ── THEME TOGGLE ── */}
            <button
              id="theme-toggle-btn"
              onClick={() => setDarkMode((d) => !d)}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              style={{
                background: darkMode
                  ? "linear-gradient(135deg,#2d2d3f,#1e1e2e)"
                  : "linear-gradient(135deg,#e8f0fe,#d2e3fc)",
                border: `1.5px solid ${darkMode ? "#6BA8FF" : "#1A73E8"}`,
                borderRadius: 10,
                cursor: "pointer",
                padding: "7px 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                color: darkMode ? "#6BA8FF" : "#1A73E8",
                boxShadow: darkMode
                  ? "0 2px 8px rgba(107,168,255,0.25)"
                  : "0 2px 8px rgba(26,115,232,0.18)",
                letterSpacing: "0.01em",
                transition: "all 0.25s ease",
              }}
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
              {darkMode ? "Light" : "Dark"}
            </button>

            <button onClick={exportJSON} style={btnGhost}>
              <Download size={14} /> Export
            </button>
            <button onClick={exportCSV} style={btnGhost} title="Export transactions as CSV">
              <Download size={14} /> CSV
            </button>
            <label style={btnGhost}>
              <Upload size={14} /> Import
              <input
                type="file"
                accept=".json"
                onChange={importJSON}
                style={{ display: "none" }}
              />
            </label>
            <button
              onClick={() => window.print()}
              style={btnGhost}
              title="Print / Save as PDF"
            >
              <Printer size={14} /> Print
            </button>
            <button
              onClick={copySummary}
              style={btnGhost}
              title="Copy summary to clipboard"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={() => setTab("settings")}
              style={btnGhost}
              title="Settings"
            >
              <Settings size={14} />
            </button>
            <button
              onClick={resetAll}
              style={{
                ...btnGhost,
                color: THEME.accent,
                borderColor: THEME.accent,
              }}
            >
              <Trash2 size={14} /> Reset
            </button>
          </div>
        </div>

        {/* TAB NAV */}
        <nav
          style={{
            maxWidth: 1400,
            margin: "0 auto",
            padding: "0 32px",
            display: "flex",
            gap: 0,
            overflowX: "auto",
            borderTop: `1px solid ${THEME.line}`,
          }}
        >
          {tabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "14px 20px",
                  fontFamily: "inherit",
                  fontSize: 14,
                  letterSpacing: "0.02em",
                  color: active ? THEME.accent : THEME.muted,
                  borderBottom: `3px solid ${
                    active ? THEME.accent : "transparent"
                  }`,
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
      </header>

      <main
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "32px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {tab === "overview" && (
          <Overview
            metrics={metrics}
            state={state}
            assetBreakdown={assetBreakdown}
            trendData={trendData}
          />
        )}
        {tab === "banks" && (
          <BanksTab
            state={state}
            addItem={addItem}
            removeItem={removeItem}
            updateItem={updateItem}
          />
        )}
        {tab === "investments" && (
          <InvestmentsTab
            state={state}
            addItem={addItem}
            removeItem={removeItem}
            updateItem={updateItem}
          />
        )}
        {tab === "demat" && (
          <DematTab state={state} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
        )}
        {tab === "credit" && (
          <CreditTab state={state} addItem={addItem} removeItem={removeItem} updateItem={updateItem} />
        )}
        {tab === "subs" && (
          <SubsTab
            state={state}
            addItem={addItem}
            removeItem={removeItem}
            updateItem={updateItem}
            metrics={metrics}
          />
        )}
        {tab === "sip" && (
          <SIPTrackerTab
            state={state}
            addItem={addItem}
            removeItem={removeItem}
          />
        )}
        {tab === "insurance" && (
          <InsuranceSummaryTab
            state={state}
            metrics={metrics}
          />
        )}
        {tab === "goals" && (
          <GoalsTab
            state={state}
            addItem={addItem}
            removeItem={removeItem}
            metrics={metrics}
          />
        )}
        {tab === "tax" && (
          <TaxTab
            state={state}
            addItem={addItem}
            removeItem={removeItem}
            metrics={metrics}
            setState={setState}
          />
        )}
        {tab === "budget" && (
          <BudgetTab
            state={state}
            addItem={addItem}
            removeItem={removeItem}
            updateItem={updateItem}
            metrics={metrics}
          />
        )}
        {tab === "reminders" && (
          <RemindersTab
            state={state}
            addItem={addItem}
            removeItem={removeItem}
          />
        )}
        {tab === "analytics" && (
          <AnalyticsTab
            metrics={metrics}
            state={state}
            trendData={trendData}
          />
        )}
        {tab === "calculators" && <CalculatorsTab />}
        {tab === "settings" && (
          <SettingsTab
            state={state}
            setState={setState}
            exportJSON={exportJSON}
            resetAll={resetAll}
          />
        )}
      </main>

      <footer
        style={{
          textAlign: "center",
          padding: "40px 20px",
          color: THEME.muted,
          fontSize: 14,
          borderTop: `1px solid ${THEME.line}`,
          marginTop: 40,
        }}
      >
        Personal Finance Dashboard
      </footer>

      {/* QUICK-ADD FAB */}
      <button
        onClick={() => setFabModal(true)}
        title="Quick add transaction"
        style={{
          position: "fixed",
          bottom: 32,
          right: 32,
          zIndex: 999,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: THEME.accent,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          color: "#fff",
        }}
      >
        <Plus size={24} />
      </button>

      {fabModal && (
        <QuickAddModal
          onClose={() => setFabModal(false)}
          onSave={(v) => { addItem("transactions", v); setFabModal(false); }}
          bankAccounts={state.bankAccounts}
        />
      )}
    </div>
  );
}

// ================== SHARED STYLES ==================
const btnGhost = {
  background: "transparent",
  border: `1px solid ${THEME.line}`,
  color: THEME.ink,
  padding: "8px 16px",
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  fontWeight: 500,
  borderRadius: 6,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  transition: "all 0.2s ease",
};
const btnSolid = {
  background: THEME.ink,
  color: THEME.darkInk,
  border: `1px solid ${THEME.ink}`,
  padding: "10px 20px",
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  fontWeight: 500,
  borderRadius: 6,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  transition: "all 0.2s ease",
};
const btnAccent = {
  ...btnSolid,
  background: THEME.accent,
  borderColor: THEME.accent,
  color: "#FFFFFF",
};

const card = {
  background: THEME.darkInk,
  border: `1px solid ${THEME.line}`,
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
};
const cardDark = {
  background: THEME.ink,
  color: THEME.darkInk,
  borderRadius: 12,
  padding: 24,
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
};

const input = {
  width: "100%",
  padding: "10px 14px",
  border: `1px solid ${THEME.line}`,
  background: THEME.darkInk,
  fontFamily: "'Inter', sans-serif",
  fontSize: 14,
  color: THEME.ink,
  borderRadius: 6,
  transition: "border-color 0.2s ease",
};
const label = {
  display: "block",
  fontSize: 12,
  color: THEME.ink,
  marginBottom: 6,
  fontWeight: 500,
};

const SectionTitle = ({ children, sub }) => (
  <div style={{ marginBottom: 24 }}>
    <h2
      style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 24,
        fontWeight: 600,
        margin: 0,
        letterSpacing: "-0.02em",
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
          marginTop: 4,
          fontStyle: "normal",
        }}
      >
        {sub}
      </div>
    )}
  </div>
);

// ================== OVERVIEW ==================
function Overview({ metrics, state, assetBreakdown, trendData }) {
  const [drillCat, setDrillCat] = useState(null);
  const netWorthTrend = useMemo(() => {
    // simple monthly snapshot: cumulative net cash flow + current assets snapshot (approximation)
    return trendData.map((t, i) => ({
      month: t.month,
      value:
        metrics.netWorth -
        (trendData.length - 1 - i) *
          (metrics.monthIncome - metrics.monthExpense) *
          0.9,
    }));
  }, [trendData, metrics]);

  return (
    <div>
      {/* HERO STAT */}
      <div
        style={{
          ...cardDark,
          marginBottom: 32,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            opacity: 0.06,
            fontSize: 300,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 900,
            lineHeight: 1,
            color: THEME.gold,
          }}
        >
          ₹
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: THEME.gold,
              marginBottom: 12,
            }}
          >
            Net Worth · As of{" "}
            {new Date().toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 72,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: "-0.03em",
            }}
          >
            {fmtINRFull(metrics.netWorth)}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "24px 32px",
              marginTop: 32,
            }}
          >
            <HeroStat label="Cash Available" value={metrics.cashInBanks} />
            <HeroStat label="Investments" value={metrics.mfValue + metrics.stockValue} />
            <HeroStat label="Monthly Income" value={metrics.monthIncome} sage />
            <HeroStat label="Monthly Expense" value={metrics.monthExpense} rust />
            <HeroStat label="Total Debt" value={metrics.totalLiabilities} negative />
            <HeroStat label="CC Outstanding" value={metrics.ccOutstanding} negative />
            <HeroStat label="Tax Due (Est.)" value={metrics.taxDue} negative />
          </div>
        </div>
      </div>

      {/* QUICK INSIGHTS GRID */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 8, fontWeight: 500 }}>Savings Rate</div>
          {(() => {
            const rate = Math.min(100, Math.max(0, metrics.savingsRate));
            const r = 26, circ = 2 * Math.PI * r;
            const dash = (rate / 100) * circ;
            const col = rate >= 20 ? THEME.sage : rate >= 10 ? THEME.gold : THEME.rust;
            return (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <svg width="68" height="68" viewBox="0 0 68 68">
                  <circle cx="34" cy="34" r={r} fill="none" stroke={THEME.line} strokeWidth="6" />
                  <circle cx="34" cy="34" r={r} fill="none" stroke={col} strokeWidth="6"
                    strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4}
                    strokeLinecap="round" style={{ transition: "stroke-dasharray 0.6s" }} />
                  <text x="34" y="39" textAnchor="middle" style={{ fontSize: 13, fontWeight: 700, fill: col, fontFamily: "inherit" }}>{rate.toFixed(0)}%</text>
                </svg>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: col }}>{metrics.savingsRate.toFixed(1)}%</div>
                  <div style={{ fontSize: 11, color: THEME.muted }}>Of monthly income</div>
                  <div style={{ fontSize: 11, color: rate >= 20 ? THEME.sage : THEME.gold, marginTop: 1 }}>{rate >= 20 ? "On track" : "Target: 20%+"}</div>
                </div>
              </div>
            );
          })()}
        </div>

        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 8, fontWeight: 500 }}>Debt-to-Asset</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: metrics.debtToAssetRatio > 40 ? THEME.rust : THEME.ink }}>
            {metrics.debtToAssetRatio.toFixed(1)}%
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>Healthy if under 40%</div>
        </div>

        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 8, fontWeight: 500 }}>Liquidity</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: THEME.ink }}>
            {metrics.totalAssets > 0 ? ((metrics.liquidAssets / metrics.totalAssets) * 100).toFixed(1) : 0}%
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>Liquid vs Locked assets</div>
        </div>

        <div style={{ ...card, padding: 20 }}>
          <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 8, fontWeight: 500 }}>Investment PnL</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: (metrics.mfPnL + metrics.stockPnL) >= 0 ? THEME.sage : THEME.rust }}>
            {(metrics.mfPnL + metrics.stockPnL) >= 0 ? "+" : ""}{fmtINRFull(metrics.mfPnL + metrics.stockPnL)}
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>Unrealized returns</div>
        </div>
      </div>

      {/* MONTHLY P&L BAR */}
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

      {/* FINANCIAL HEALTH + CASH FLOW + UPCOMING DUES */}
      {(() => {
        // Financial Health Score calculation
        let savingsScore = 0;
        if (metrics.savingsRate >= 30) savingsScore = 25;
        else if (metrics.savingsRate >= 20) savingsScore = 18;
        else if (metrics.savingsRate >= 10) savingsScore = 10;
        else savingsScore = 4;

        let debtScore = 0;
        if (metrics.debtToAssetRatio < 10) debtScore = 25;
        else if (metrics.debtToAssetRatio < 25) debtScore = 18;
        else if (metrics.debtToAssetRatio < 50) debtScore = 10;
        else debtScore = 4;

        const emergencyMonths = metrics.monthExpense > 0 ? metrics.cashInBanks / metrics.monthExpense : 0;
        let emergencyScore = 0;
        if (emergencyMonths > 6) emergencyScore = 25;
        else if (emergencyMonths >= 3) emergencyScore = 18;
        else if (emergencyMonths >= 1) emergencyScore = 10;
        else emergencyScore = 4;

        let divScore = 0;
        if (state.mutualFunds.length > 0) divScore += 6;
        if (state.stocks.length > 0) divScore += 6;
        if (state.fixedDeposits.length > 0) divScore += 6;
        if (state.ppf.length > 0 || state.nps.length > 0) divScore += 7;

        const totalScore = savingsScore + debtScore + emergencyScore + divScore;
        const scoreColor = totalScore >= 75 ? THEME.sage : totalScore >= 50 ? THEME.gold : THEME.rust;

        // Upcoming dues within 30 days
        const todayMs = new Date().getTime();
        const plus30Ms = todayMs + 30 * 86400000;
        const dues = [];
        state.creditCards.forEach((c) => {
          if (c.dueDate) {
            const ms = new Date(c.dueDate).getTime();
            const daysLeft = Math.ceil((ms - todayMs) / 86400000);
            if (daysLeft >= 0 && ms <= plus30Ms) {
              dues.push({ name: (c.issuer || "Card") + " Bill", amount: Number(c.outstanding || 0), daysLeft, date: c.dueDate });
            }
          }
        });
        state.subscriptions.forEach((s) => {
          if (s.renewalDate) {
            const ms = new Date(s.renewalDate).getTime();
            const daysLeft = Math.ceil((ms - todayMs) / 86400000);
            if (daysLeft >= 0 && ms <= plus30Ms) {
              dues.push({ name: s.name + " Renewal", amount: Number(s.amount || 0), daysLeft, date: s.renewalDate });
            }
          }
        });
        dues.sort((a, b) => a.daysLeft - b.daysLeft);

        const saved = metrics.monthIncome - metrics.monthExpense;
        const expensePct = metrics.monthIncome > 0 ? (metrics.monthExpense / metrics.monthIncome) * 100 : 0;
        const savedPct = metrics.monthIncome > 0 ? Math.max(0, (saved / metrics.monthIncome) * 100) : 0;

        const subScores = [
          { label: "Savings Rate", score: savingsScore, max: 25, pct: (savingsScore / 25) * 100 },
          { label: "Debt Ratio", score: debtScore, max: 25, pct: (debtScore / 25) * 100 },
          { label: "Emergency Fund", score: emergencyScore, max: 25, pct: (emergencyScore / 25) * 100 },
          { label: "Diversification", score: divScore, max: 25, pct: (divScore / 25) * 100 },
        ];

        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 32 }}>
            {/* Financial Health Score */}
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
                    <div style={{ height: 5, background: THEME.line, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: s.pct + "%", background: scoreColor, borderRadius: 3, transition: "width 0.5s" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cash Flow Summary */}
            <div style={{ ...card, padding: 24 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>This Month's Cash Flow</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
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
              ) : (
                <div style={{ fontSize: 13, color: THEME.muted, textAlign: "center", padding: "20px 0" }}>No income recorded this month</div>
              )}
            </div>

            {/* Upcoming Dues */}
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
        );
      })()}

      {/* BILL CALENDAR */}
      {(() => {
        const now = new Date();
        const year = now.getFullYear(), month = now.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today2 = now.getDate();
        // Collect due dates this month
        const dueDays = {};
        state.creditCards.forEach((c) => {
          if (c.dueDate) {
            const d = new Date(c.dueDate);
            if (d.getFullYear() === year && d.getMonth() === month)
              dueDays[d.getDate()] = (dueDays[d.getDate()] || []).concat({ label: c.issuer || "Card", color: THEME.rust });
          }
        });
        state.subscriptions.filter(s => !s.paused).forEach((s) => {
          if (s.renewalDate) {
            const d = new Date(s.renewalDate);
            if (d.getFullYear() === year && d.getMonth() === month)
              dueDays[d.getDate()] = (dueDays[d.getDate()] || []).concat({ label: s.name, color: THEME.gold });
          }
        });
        // Advance tax dates
        [15].forEach((day) => { // June 15
          if (month === 5) dueDays[day] = (dueDays[day] || []).concat({ label: "Adv. Tax", color: THEME.accent });
        });
        if (month === 8) dueDays[15] = (dueDays[15] || []).concat({ label: "Adv. Tax", color: THEME.accent });
        if (month === 11) dueDays[15] = (dueDays[15] || []).concat({ label: "Adv. Tax", color: THEME.accent });
        if (month === 2) dueDays[15] = (dueDays[15] || []).concat({ label: "Adv. Tax", color: THEME.accent });
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
                <div key={i} style={{
                  minHeight: 44, padding: 4, borderRadius: 6, fontSize: 11,
                  background: d === today2 ? THEME.accent + "22" : dueDays[d] ? "rgba(249,171,0,0.1)" : "transparent",
                  border: d === today2 ? `1.5px solid ${THEME.accent}` : "1px solid transparent",
                }}>
                  {d && <>
                    <div style={{ fontWeight: d === today2 ? 800 : 500, color: d === today2 ? THEME.accent : THEME.ink, marginBottom: 2 }}>{d}</div>
                    {(dueDays[d] || []).slice(0, 2).map((due, j) => (
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
      })()}

      {/* ALLOCATION + TREND */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.3fr",
          gap: 24,
          marginBottom: 32,
        }}
      >
        <div style={card}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: THEME.muted,
              marginBottom: 16,
            }}
          >
            Wealth Composition
          </div>
          {assetBreakdown.length ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={assetBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  innerRadius={55}
                  paddingAngle={2}
                >
                  {assetBreakdown.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v) => fmtINRFull(v)}
                  contentStyle={{
                    background: THEME.ink,
                    color: THEME.paper,
                    border: "none",
                    fontFamily: "inherit",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyHint text="Add bank accounts and investments to see allocation" />
          )}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginTop: 12,
            }}
          >
            {assetBreakdown.map((a, i) => (
              <div
                key={a.name}
                style={{
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    background: PIE_COLORS[i % PIE_COLORS.length],
                  }}
                />
                <span style={{ color: THEME.ink }}>{a.name}</span>
                <span style={{ color: THEME.muted, marginLeft: "auto" }}>
                  {((a.value / metrics.totalAssets) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: THEME.muted,
              marginBottom: 16,
            }}
          >
            Cashflow · Trailing 12 Months
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={THEME.sage} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={THEME.sage} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={THEME.accent}
                    stopOpacity={0.5}
                  />
                  <stop
                    offset="100%"
                    stopColor={THEME.accent}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} />
              <XAxis
                dataKey="month"
                tick={{
                  fill: THEME.muted,
                  fontSize: 11,
                  fontFamily: "inherit",
                }}
              />
              <YAxis
                tick={{ fill: THEME.muted, fontSize: 11 }}
                tickFormatter={fmtINR}
              />
              <Tooltip
                formatter={(v) => fmtINRFull(v)}
                contentStyle={{
                  background: THEME.ink,
                  color: THEME.paper,
                  border: "none",
                  fontFamily: "inherit",
                }}
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke={THEME.sage}
                strokeWidth={2}
                fill="url(#gInc)"
                name="Income"
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke={THEME.accent}
                strokeWidth={2}
                fill="url(#gExp)"
                name="Expense"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* NEW CHARTS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: 24,
          marginBottom: 32,
        }}
      >
        <div style={card}>
          <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>
            Expense Breakup
          </div>
          {metrics.expenseBreakdown && metrics.expenseBreakdown.length ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={metrics.expenseBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                    {metrics.expenseBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.ink, color: THEME.paper, border: "none", fontFamily: "inherit", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px", marginTop: 12 }}>
                {metrics.expenseBreakdown.slice(0, 8).map((cat, i) => {
                  const total = metrics.expenseBreakdown.reduce((s, c) => s + c.value, 0);
                  const pct = total > 0 ? ((cat.value / total) * 100).toFixed(1) : "0";
                  const active = drillCat === cat.name;
                  return (
                    <div key={cat.name}
                      onClick={() => setDrillCat(active ? null : cat.name)}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, background: active ? PIE_COLORS[i % PIE_COLORS.length] + "22" : "rgba(128,128,128,0.06)", border: active ? `1.5px solid ${PIE_COLORS[i % PIE_COLORS.length]}` : "1.5px solid transparent", cursor: "pointer" }}>
                      <div style={{ width: 10, height: 10, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cat.name}</div>
                        <div style={{ fontSize: 11, color: THEME.muted }}>{fmtINR(cat.value)} · {pct}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {drillCat && (() => {
                const now = new Date();
                const ym = now.toISOString().slice(0, 7);
                const txns = state.transactions.filter(t => t.date && t.date.startsWith(ym) && t.type === "debit" && t.category === drillCat);
                return txns.length > 0 ? (
                  <div style={{ marginTop: 12, borderTop: `1px solid ${THEME.line}`, paddingTop: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: THEME.accent, marginBottom: 6 }}>{drillCat} transactions this month</div>
                    {txns.map(t => (
                      <div key={t.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", borderBottom: `1px dashed ${THEME.line}` }}>
                        <span style={{ color: THEME.muted }}>{t.date} · {t.note || "—"}</span>
                        <span style={{ fontWeight: 600, color: THEME.rust }}>{fmtINRFull(t.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}
            </>
          ) : <EmptyHint text="No expenses this month" />}
        </div>
        
        <div style={card}>
          <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>
            Net Worth Growth
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={netWorthTrend}>
              <defs>
                <linearGradient id="gNw" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={THEME.accent} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={THEME.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} />
              <XAxis dataKey="month" tick={{ fill: THEME.muted, fontSize: 11 }} />
              <YAxis tick={{ fill: THEME.muted, fontSize: 11 }} tickFormatter={fmtINR} />
              <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.ink, color: THEME.paper, border: "none", borderRadius: 8 }} />
              <Area type="monotone" dataKey="value" stroke={THEME.accent} strokeWidth={2} fill="url(#gNw)" name="Net Worth" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ ...card, marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>
          Portfolio Performance
        </div>
        {metrics.portfolioPerformance && metrics.portfolioPerformance.length ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={metrics.portfolioPerformance}>
              <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} />
              <XAxis dataKey="name" tick={{ fill: THEME.muted, fontSize: 11 }} />
              <YAxis tick={{ fill: THEME.muted, fontSize: 11 }} tickFormatter={fmtINR} />
              <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.ink, color: THEME.paper, border: "none", borderRadius: 8 }} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Bar dataKey="Invested" fill={THEME.muted} radius={[4, 4, 0, 0]} />
              <Bar dataKey="Current" fill={THEME.sage} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <EmptyHint text="No investments to show" />}
      </div>

      {/* INVESTMENT ALLOCATION + NET WORTH DONUT */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
        {/* C8: Investment Allocation Pie */}
        {(() => {
          const invBreakdown = [
            { name: "Fixed Deposits", value: metrics.fdValue },
            { name: "Recurring Dep.", value: metrics.rdValue },
            { name: "Bonds", value: metrics.bondValue },
            { name: "PPF", value: metrics.ppfValue },
            { name: "NPS", value: metrics.npsValue },
            { name: "LIC", value: metrics.licValue },
            { name: "Mutual Funds", value: metrics.mfValue },
            { name: "Stocks", value: metrics.stockValue },
          ].filter(x => x.value > 0);
          const total = invBreakdown.reduce((s, x) => s + x.value, 0);
          return (
            <div style={card}>
              <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 12 }}>Investment Allocation</div>
              {invBreakdown.length ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={invBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2}>
                        {invBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.ink, color: THEME.paper, border: "none", borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", marginTop: 8 }}>
                    {invBreakdown.map((x, i) => (
                      <div key={x.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ color: THEME.ink }}>{x.name}</span>
                        <span style={{ color: THEME.muted, marginLeft: "auto" }}>{total > 0 ? ((x.value / total) * 100).toFixed(0) : 0}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <EmptyHint text="Add investments to see allocation" />}
            </div>
          );
        })()}
        {/* C9: Net Worth Donut */}
        {(() => {
          const nwData = [
            { name: "Assets", value: metrics.totalAssets },
            { name: "Liabilities", value: metrics.totalLiabilities },
          ].filter(x => x.value > 0);
          return (
            <div style={card}>
              <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 12 }}>Net Worth Breakdown</div>
              {metrics.totalAssets > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={nwData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={3}>
                        <Cell fill={THEME.sage} />
                        <Cell fill={THEME.rust} />
                      </Pie>
                      <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.ink, color: THEME.paper, border: "none", borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
                    <div style={{ textAlign: "center", padding: 12, background: "rgba(30,142,62,0.08)", borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: THEME.muted }}>Total Assets</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: THEME.sage, marginTop: 4 }}>{fmtINRFull(metrics.totalAssets)}</div>
                    </div>
                    <div style={{ textAlign: "center", padding: 12, background: "rgba(217,48,37,0.08)", borderRadius: 8 }}>
                      <div style={{ fontSize: 11, color: THEME.muted }}>Total Liabilities</div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: THEME.rust, marginTop: 4 }}>{fmtINRFull(metrics.totalLiabilities)}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "center", marginTop: 12, padding: "8px 0", borderTop: `1px solid ${THEME.line}` }}>
                    <span style={{ fontSize: 12, color: THEME.muted }}>Net Worth: </span>
                    <span style={{ fontSize: 18, fontWeight: 800, color: metrics.netWorth >= 0 ? THEME.sage : THEME.rust }}>{fmtINRFull(metrics.netWorth)}</span>
                  </div>
                </>
              ) : <EmptyHint text="Add accounts and investments" />}
            </div>
          );
        })()}
      </div>

      {/* QUICK TILES */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        <Tile
          icon={Landmark}
          label="Bank Cash"
          value={fmtINRFull(metrics.cashInBanks)}
        />
        <Tile
          icon={Coins}
          label="Fixed Deposits"
          value={fmtINRFull(metrics.fdValue)}
        />
        <Tile
          icon={BarChart3}
          label="Mutual Funds"
          value={fmtINRFull(metrics.mfValue)}
          sub={
            metrics.mfPnL !== 0
              ? `${metrics.mfPnL >= 0 ? "+" : ""}${fmtINR(metrics.mfPnL)}`
              : null
          }
          subColor={metrics.mfPnL >= 0 ? THEME.sage : THEME.accent}
        />
        <Tile
          icon={TrendingUp}
          label="Stocks"
          value={fmtINRFull(metrics.stockValue)}
          sub={
            metrics.stockPnL !== 0
              ? `${metrics.stockPnL >= 0 ? "+" : ""}${fmtINR(metrics.stockPnL)}`
              : null
          }
          subColor={metrics.stockPnL >= 0 ? THEME.sage : THEME.accent}
        />
        <Tile
          icon={Shield}
          label="PPF + NPS"
          value={fmtINRFull(metrics.ppfValue + metrics.npsValue)}
        />
        <Tile
          icon={CreditCard}
          label="Card Dues"
          value={fmtINRFull(metrics.ccOutstanding)}
          negative
        />
        <Tile
          icon={HandCoins}
          label="Loans Taken"
          value={fmtINRFull(metrics.loansTakenValue)}
          negative
        />
        <Tile
          icon={Repeat}
          label="Subs / mo"
          value={fmtINRFull(metrics.subTotal)}
        />
      </div>

      {/* RECENT TRANSACTIONS */}
      <div style={card}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
              color: THEME.muted,
            }}
          >
            Recent Movement
          </div>
          <div style={{ fontSize: 12, color: THEME.muted }}>
            {state.transactions.length} total entries
          </div>
        </div>
        {state.transactions.length ? (
          <div style={{ display: "grid", gap: 2 }}>
            {state.transactions
              .slice(-10)
              .reverse()
              .map((t) => {
                const bank = state.bankAccounts.find(
                  (b) => b.id === t.accountId
                );
                return (
                  <div
                    key={t.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "110px 1fr 140px 140px",
                      padding: "10px 0",
                      borderBottom: `1px dashed ${THEME.line}`,
                      fontSize: 14,
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: THEME.muted, fontSize: 12 }}>
                      {t.date}
                    </span>
                    <span>
                      <div style={{ fontWeight: 500 }}>{t.note || "—"}</div>
                      <div style={{ fontSize: 11, color: THEME.muted }}>
                        {t.category} · {bank?.bankName || "—"}
                      </div>
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: THEME.muted,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                      }}
                    >
                      {t.type === "credit" ? "Credit" : "Debit"}
                    </span>
                    <span
                      style={{
                        textAlign: "right",
                        color: t.type === "credit" ? THEME.sage : THEME.accent,
                        fontVariantNumeric: "tabular-nums",
                        fontWeight: 600,
                      }}
                    >
                      {t.type === "credit" ? "+" : "−"} {fmtINRFull(t.amount)}
                    </span>
                  </div>
                );
              })}
          </div>
        ) : (
          <EmptyHint text="No transactions yet. Add some from the Banks tab." />
        )}
      </div>
    </div>
  );
}

const HeroStat = ({ label, value, negative, sage, rust }) => (
  <div>
    <div
      style={{
        fontSize: 10,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: "rgba(245,239,227,0.6)",
        marginBottom: 4,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 24,
        fontWeight: 700,
        color: negative
          ? "#E8A298"
          : sage
          ? "#A8C4A4"
          : rust
          ? "#E8A298"
          : THEME.paper,
      }}
    >
      {fmtINRFull(value)}
    </div>
  </div>
);

const Tile = ({ icon: Icon, label, value, sub, subColor, negative }) => (
  <div style={{ ...card, position: "relative", overflow: "hidden" }}>
    <Icon size={20} style={{ color: THEME.muted, marginBottom: 12 }} />
    <div
      style={{
        fontSize: 10,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: THEME.muted,
        marginBottom: 4,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 22,
        fontWeight: 700,
        color: negative ? THEME.accent : THEME.ink,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {value}
    </div>
    {sub && (
      <div
        style={{
          fontSize: 12,
          color: subColor || THEME.muted,
          marginTop: 2,
          fontWeight: 600,
        }}
      >
        {sub}
      </div>
    )}
  </div>
);

const EmptyHint = ({ text }) => (
  <div
    style={{
      padding: "40px 20px",
      textAlign: "center",
      color: THEME.muted,
      fontStyle: "normal",
      fontSize: 14,
    }}
  >
    {text}
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
  const [editBankId, setEditBankId] = useState(null);
  const [editTxnId, setEditTxnId] = useState(null);
  const [showImport, setShowImport] = useState(false);

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
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: THEME.muted,
                marginBottom: 4,
              }}
            >
              {a.type || "Savings"}
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
            {(dateFrom || dateTo) && (
              <button
                style={{ ...btnGhost, padding: "4px 8px", fontSize: 12 }}
                onClick={() => { setDateFrom(""); setDateTo(""); }}
              >
                Clear dates
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
                  const bank = state.bankAccounts.find(
                    (b) => b.id === t.accountId
                  );
                  return (
                    <tr
                      key={t.id}
                      style={{ borderBottom: `1px dashed ${THEME.line}` }}
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
                      <td style={{ ...td, color: THEME.muted, fontSize: 12 }}>
                        {t.category}
                      </td>
                      <td style={{ ...td, color: THEME.muted, fontSize: 12 }}>
                        {bank?.bankName || "—"}
                      </td>
                      <td
                        style={{
                          ...td,
                          textAlign: "right",
                          color: THEME.accent,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {t.type === "debit" ? fmtINRFull(t.amount) : ""}
                      </td>
                      <td
                        style={{
                          ...td,
                          textAlign: "right",
                          color: THEME.sage,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {t.type === "credit" ? fmtINRFull(t.amount) : ""}
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 2 }}>
                          <button
                            onClick={() => setEditTxnId(t.id)}
                            style={iconBtn}
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => removeItem("transactions", t.id)}
                            style={iconBtn}
                          >
                            <Trash2 size={13} />
                          </button>
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
  textAlign: "left",
  padding: "10px 8px",
  fontSize: 10,
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  color: THEME.muted,
  fontWeight: 700,
};
const td = { padding: "10px 8px", verticalAlign: "top" };
const iconBtn = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: THEME.muted,
  padding: 4,
};

function BankModal({ onClose, onSave }) {
  const [f, setF] = useState({
    bankName: "",
    accountNumber: "",
    type: "Savings",
    balance: "",
  });
  return (
    <Modal title="Add Bank Account" onClose={onClose}>
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
          onChange={(e) => setF({ ...f, note: e.target.value })}
          placeholder="e.g. Swiggy order"
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
        <input style={input} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="e.g. Swiggy order" />
      </Field>
      <ModalActions onSave={() => f.amount && f.accountId && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

// ================== INVESTMENTS TAB ==================
function InvestmentsTab({ state, addItem, removeItem, updateItem }) {
  const [sub, setSub] = useState("fd");
  const [modal, setModal] = useState(null);
  const [editId, setEditId] = useState(null);

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
  ];

  return (
    <div>
      <SectionTitle sub="All instruments under one roof — principal, growth, and paper trail">
        Investments
      </SectionTitle>

      {/* sub-nav */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: 24,
          borderBottom: `1px solid ${THEME.line}`,
          overflowX: "auto",
        }}
      >
        {subs.map((s) => {
          const Icon = s.icon;
          const active = sub === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSub(s.id)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "10px 16px",
                fontFamily: "inherit",
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: active ? THEME.accent : THEME.muted,
                borderBottom: `2px solid ${
                  active ? THEME.accent : "transparent"
                }`,
                display: "flex",
                alignItems: "center",
                gap: 6,
                whiteSpace: "nowrap",
                fontWeight: active ? 700 : 500,
              }}
            >
              <Icon size={12} /> {s.label}
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
          <Plus size={14} /> Add{" "}
          {subs.find((s) => s.id === sub).label.slice(0, -1)}
        </button>
      </div>

      {sub === "fd" && (
        <FDList items={state.fixedDeposits} onRemove={(id) => removeItem("fixedDeposits", id)} onEdit={setEditId} />
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
        <NPSList items={state.nps} onRemove={(id) => removeItem("nps", id)} onEdit={setEditId} />
      )}
      {sub === "mf" && (
        <MFList items={state.mutualFunds} onRemove={(id) => removeItem("mutualFunds", id)} onEdit={setEditId} />
      )}
      {sub === "lic" && (
        <LICList items={state.lic} onRemove={(id) => removeItem("lic", id)} onEdit={setEditId} />
      )}
      {sub === "term" && (
        <TermList items={state.termPlans} onRemove={(id) => removeItem("termPlans", id)} onEdit={setEditId} />
      )}

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
  );
}

const InvestCard = ({ children, onRemove, onEdit }: any) => (
  <div style={{ ...card, position: "relative" }}>
    <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 4 }}>
      {onEdit && (
        <button onClick={onEdit} style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted }}>
          <Edit3 size={14} />
        </button>
      )}
      <button onClick={onRemove} style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted }}>
        <Trash2 size={14} />
      </button>
    </div>
    {children}
  </div>
);

const Grid = ({ children }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
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

function NPSList({ items, onRemove, onEdit }: any) {
  if (!items.length) return <EmptyHint text="No NPS account yet" />;
  return (
    <Grid>
      {items.map((n) => (
        <InvestCard key={n.id} onRemove={() => onRemove(n.id)} onEdit={() => onEdit(n.id)}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: THEME.muted,
            }}
          >
            NPS · Tier {n.tier || "I"}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 28,
              fontWeight: 800,
              marginTop: 4,
            }}
          >
            {fmtINRFull(n.balance)}
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
            <Stat k="PRAN" v={(n.pran || "").slice(-6) || "—"} />
            <Stat k="This FY" v={fmtINR(n.thisYearContribution || 0)} />
          </div>
        </InvestCard>
      ))}
    </Grid>
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
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
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
  const [f, setF] = useState(initial || {
    pran: "",
    tier: "I",
    balance: "",
    thisYearContribution: "",
  });
  return (
    <Modal title={initial ? "Edit NPS Account" : "Add NPS Account"} onClose={onClose}>
      <Field label="PRAN (last 6 ok)">
        <input
          style={input}
          value={f.pran}
          onChange={(e) => setF({ ...f, pran: e.target.value })}
        />
      </Field>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
      >
        <Field label="Tier">
          <select
            style={input}
            value={f.tier}
            onChange={(e) => setF({ ...f, tier: e.target.value })}
          >
            <option>I</option>
            <option>II</option>
          </select>
        </Field>
        <Field label="Balance">
          <input
            style={input}
            type="number"
            value={f.balance}
            onChange={(e) => setF({ ...f, balance: e.target.value })}
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
  });
  return (
    <Modal title={initial ? "Edit Mutual Fund Holding" : "Add Mutual Fund Holding"} onClose={onClose}>
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
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
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
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
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
  const [editStockId, setEditStockId] = useState(null);
  const [sortCol, setSortCol] = useState("pnl");
  const [sortDir, setSortDir] = useState(-1);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir((d) => d * -1);
    else { setSortCol(col); setSortDir(-1); }
  };

  const SortTh = ({ col, label, right = false }) => (
    <th
      style={{ ...th, textAlign: right ? "right" : "left", cursor: "pointer", userSelect: "none" }}
      onClick={() => handleSort(col)}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
        {label}
        {sortCol === col
          ? sortDir === -1 ? <ChevronDown size={11} /> : <ChevronUp size={11} />
          : <ChevronDown size={11} style={{ opacity: 0.3 }} />}
      </span>
    </th>
  );

  const totalValue = state.stocks.reduce(
    (s, st) => s + Number(st.qty) * Number(st.currentPrice),
    0
  );
  const totalInvested = state.stocks.reduce(
    (s, st) => s + Number(st.qty) * Number(st.avgPrice),
    0
  );
  const pnl = totalValue - totalInvested;

  return (
    <div>
      <SectionTitle sub="Brokerage accounts and every scrip you hold">
        Demat & Stocks
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
          icon={Briefcase}
          label="Demat Accounts"
          value={state.demat.length}
        />
        <Tile
          icon={BarChart3}
          label="Portfolio Value"
          value={fmtINRFull(totalValue)}
        />
        <Tile
          icon={TrendingUp}
          label="Unrealized P&L"
          value={fmtINRFull(pnl)}
          sub={
            totalInvested ? `${((pnl / totalInvested) * 100).toFixed(2)}%` : ""
          }
          subColor={pnl >= 0 ? THEME.sage : THEME.accent}
        />
      </div>

      {/* Demat accounts */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          Demat Accounts
        </div>
        <button style={btnGhost} onClick={() => setShowDemat(true)}>
          <Plus size={14} /> Add Demat
        </button>
      </div>
      <Grid>
        {state.demat.length === 0 && (
          <EmptyHint text="Add your brokerage/demat account" />
        )}
        {state.demat.map((d) => (
          <InvestCard key={d.id} onRemove={() => removeItem("demat", d.id)}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: THEME.muted,
              }}
            >
              {d.broker}
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              DP ID: {d.dpId || "—"}
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
              Client ID: {d.clientId || "—"}
            </div>
          </InvestCard>
        ))}
      </Grid>

      {/* Stocks table */}
      <div
        style={{
          marginTop: 40,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 22,
            fontWeight: 700,
          }}
        >
          Stock Holdings
        </div>
        <button style={btnSolid} onClick={() => setShowStock(true)}>
          <Plus size={14} /> Add Stock
        </button>
      </div>

      <div style={card}>
        {state.stocks.length === 0 ? (
          <EmptyHint text="No stock holdings yet" />
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
                  <SortTh col="symbol" label="Symbol" />
                  <th style={th}>Broker</th>
                  <SortTh col="qty" label="Qty" right />
                  <th style={{ ...th, textAlign: "right" }}>Avg</th>
                  <SortTh col="ltp" label="LTP" right />
                  <SortTh col="invested" label="Invested" right />
                  <SortTh col="current" label="Current" right />
                  <SortTh col="pnl" label="P&L" right />
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {[...state.stocks].sort((a, b) => {
                  const ai = Number(a.qty) * Number(a.avgPrice);
                  const bi = Number(b.qty) * Number(b.avgPrice);
                  const ac = Number(a.qty) * Number(a.currentPrice);
                  const bc = Number(b.qty) * Number(b.currentPrice);
                  const vals = {
                    symbol: [a.symbol, b.symbol],
                    qty: [Number(a.qty), Number(b.qty)],
                    ltp: [Number(a.currentPrice), Number(b.currentPrice)],
                    invested: [ai, bi],
                    current: [ac, bc],
                    pnl: [ac - ai, bc - bi],
                  };
                  const [av, bv] = vals[sortCol] || [0, 0];
                  if (av < bv) return sortDir;
                  if (av > bv) return -sortDir;
                  return 0;
                }).map((s) => {
                  const invested = Number(s.qty) * Number(s.avgPrice);
                  const current = Number(s.qty) * Number(s.currentPrice);
                  const p = current - invested;
                  const pct = invested ? (p / invested) * 100 : 0;
                  const demat = state.demat.find((d) => d.id === s.dematId);
                  return (
                    <tr
                      key={s.id}
                      style={{ borderBottom: `1px dashed ${THEME.line}` }}
                    >
                      <td style={{ ...td, fontWeight: 700 }}>{s.symbol}</td>
                      <td style={{ ...td, color: THEME.muted, fontSize: 12 }}>
                        {demat?.broker || "—"}
                      </td>
                      <td
                        style={{
                          ...td,
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {s.qty}
                      </td>
                      <td
                        style={{
                          ...td,
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        ₹{Number(s.avgPrice).toFixed(2)}
                      </td>
                      <td
                        style={{
                          ...td,
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        ₹{Number(s.currentPrice).toFixed(2)}
                      </td>
                      <td
                        style={{
                          ...td,
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {fmtINR(invested)}
                      </td>
                      <td
                        style={{
                          ...td,
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {fmtINR(current)}
                      </td>
                      <td
                        style={{
                          ...td,
                          textAlign: "right",
                          fontVariantNumeric: "tabular-nums",
                          color: p >= 0 ? THEME.sage : THEME.accent,
                          fontWeight: 600,
                        }}
                      >
                        {p >= 0 ? "+" : ""}
                        {fmtINR(p)}
                        <br />
                        <span style={{ fontSize: 11, opacity: 0.8 }}>
                          {pct.toFixed(2)}%
                        </span>
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 2 }}>
                          <button onClick={() => setEditStockId(s.id)} style={iconBtn}>
                            <Edit3 size={13} />
                          </button>
                          <button onClick={() => removeItem("stocks", s.id)} style={iconBtn}>
                            <Trash2 size={13} />
                          </button>
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

      {showDemat && (
        <DematModal
          onClose={() => setShowDemat(false)}
          onSave={(v) => {
            addItem("demat", v);
            setShowDemat(false);
          }}
        />
      )}
      {showStock && (
        <StockModal
          demats={state.demat}
          onClose={() => setShowStock(false)}
          onSave={(v) => {
            addItem("stocks", v);
            setShowStock(false);
          }}
        />
      )}
      {editStockId && (
        <StockModal
          demats={state.demat}
          initial={state.stocks.find(x => x.id === editStockId)}
          onClose={() => setEditStockId(null)}
          onSave={(v) => {
            updateItem("stocks", editStockId, v);
            setEditStockId(null);
          }}
        />
      )}
    </div>
  );
}

function DematModal({ onClose, onSave }) {
  const [f, setF] = useState({ broker: "", dpId: "", clientId: "" });
  return (
    <Modal title="Add Demat Account" onClose={onClose}>
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

function StockModal({ demats, onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || {
    symbol: "",
    dematId: demats[0]?.id || "",
    qty: "",
    avgPrice: "",
    currentPrice: "",
  });
  return (
    <Modal title={initial ? "Edit Stock" : "Add Stock"} onClose={onClose}>
      <Field label="Symbol">
        <input
          style={input}
          value={f.symbol}
          onChange={(e) => setF({ ...f, symbol: e.target.value.toUpperCase() })}
          placeholder="e.g. RELIANCE"
        />
      </Field>
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
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
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
        <CCList items={state.creditCards} onRemove={(id) => removeItem("creditCards", id)} onEdit={setEditId} />
      )}
      {sub === "prepaid" && (
        <PrepaidList items={state.prepaidCards} onRemove={(id) => removeItem("prepaidCards", id)} onEdit={setEditId} />
      )}
      {sub === "taken" && (
        <LoanTakenList items={state.loansTaken} onRemove={(id) => removeItem("loansTaken", id)} onEdit={setEditId} />
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

function CCList({ items, onRemove, onEdit }: any) {
  if (!items.length) return <EmptyHint text="No credit cards yet" />;
  return (
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
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: THEME.gold,
              }}
            >
              {c.network || "Card"}
            </div>
            <div
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 20,
                fontWeight: 700,
                marginTop: 8,
              }}
            >
              {c.issuer}
            </div>
            <div
              style={{ fontSize: 16, letterSpacing: "0.05em", marginTop: 20 }}
            >
              •••• •••• •••• {c.last4 || "****"}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginTop: 16,
                fontSize: 12,
              }}
            >
              <div>
                <div
                  style={{
                    color: "rgba(245,239,227,0.6)",
                    fontSize: 9,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Outstanding
                </div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {fmtINRFull(c.outstanding)}
                </div>
              </div>
              <div>
                <div
                  style={{
                    color: "rgba(245,239,227,0.6)",
                    fontSize: 9,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Limit
                </div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>
                  {fmtINRFull(c.limit)}
                </div>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  height: 3,
                  background: "rgba(245,239,227,0.15)",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: `${Math.min(util, 100)}%`,
                    background: util > 70 ? THEME.accent : THEME.gold,
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: util > 70 ? "#E8A298" : "rgba(245,239,227,0.6)",
                  marginTop: 4,
                  letterSpacing: "0.1em",
                }}
              >
                {util.toFixed(1)}% utilization · Due {c.dueDate || "—"}
              </div>
            </div>
          </div>
        );
      })}
    </Grid>
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
    dueDate: "",
    statementDate: "",
  });
  return (
    <Modal title={initial ? "Edit Credit Card" : "Add Credit Card"} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
        <Field label="Issuer">
          <input
            style={input}
            value={f.issuer}
            onChange={(e) => setF({ ...f, issuer: e.target.value })}
            placeholder="e.g. HDFC Regalia"
          />
        </Field>
        <Field label="Network">
          <select
            style={input}
            value={f.network}
            onChange={(e) => setF({ ...f, network: e.target.value })}
          >
            <option>Visa</option>
            <option>Mastercard</option>
            <option>Amex</option>
            <option>RuPay</option>
            <option>Diners</option>
          </select>
        </Field>
      </div>
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
      >
        <Field label="Last 4 digits">
          <input
            style={input}
            maxLength={4}
            value={f.last4}
            onChange={(e) => setF({ ...f, last4: e.target.value })}
          />
        </Field>
        <Field label="Credit Limit">
          <input
            style={input}
            type="number"
            value={f.limit}
            onChange={(e) => setF({ ...f, limit: e.target.value })}
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
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Statement Date">
          <input
            style={input}
            type="date"
            value={f.statementDate}
            onChange={(e) => setF({ ...f, statementDate: e.target.value })}
          />
        </Field>
        <Field label="Payment Due Date">
          <input
            style={input}
            type="date"
            value={f.dueDate}
            onChange={(e) => setF({ ...f, dueDate: e.target.value })}
          />
        </Field>
      </div>
      <ModalActions onSave={() => f.issuer && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function PrepaidModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || { provider: "", name: "", balance: "" });
  return (
    <Modal title={initial ? "Edit Prepaid Card / Wallet" : "Add Prepaid Card / Wallet"} onClose={onClose}>
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
          <table
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
          </table>
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
    </div>
  );
}

function SubModal({ onClose, onSave }) {
  const [f, setF] = useState({
    name: "",
    category: "Entertainment",
    amount: "",
    cycle: "monthly",
    renewalDate: "",
  });
  return (
    <Modal title="Add Subscription" onClose={onClose}>
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
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
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
function GoalsTab({ state, addItem, removeItem, metrics }) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <SectionTitle sub="What the money is for — down payments, retirement, freedom">
        Goals & Future Planning
      </SectionTitle>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 16,
        }}
      >
        <button style={btnSolid} onClick={() => setShow(true)}>
          <Plus size={14} /> Add Goal
        </button>
      </div>

      {state.goals.length === 0 ? (
        <div style={card}>
          <EmptyHint text="Set a goal — retirement, house, car, travel, emergency fund…" />
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {state.goals.map((g) => {
            const progress = Number(g.targetAmount)
              ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100
              : 0;
            const monthsLeft = g.targetDate
              ? Math.max(0, monthsBetween(today(), g.targetDate))
              : 0;
            const remaining = Math.max(
              0,
              Number(g.targetAmount) - Number(g.currentAmount)
            );
            const monthlyNeeded = monthsLeft > 0 ? remaining / monthsLeft : 0;
            return (
              <div key={g.id} style={{ ...card, position: "relative" }}>
                <button
                  onClick={() => removeItem("goals", g.id)}
                  style={{
                    position: "absolute",
                    top: 16,
                    right: 16,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: THEME.muted,
                  }}
                >
                  <Trash2 size={14} />
                </button>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        color: THEME.muted,
                      }}
                    >
                      {g.category}
                    </div>
                    <div
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 26,
                        fontWeight: 800,
                        marginTop: 4,
                      }}
                    >
                      {g.name}
                    </div>
                    {g.targetDate && (
                      <div
                        style={{
                          fontSize: 13,
                          color: THEME.muted,
                          marginTop: 4,
                        }}
                      >
                        Target: {g.targetDate} · {monthsLeft} months remaining
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: 22,
                        fontWeight: 800,
                      }}
                    >
                      {fmtINRFull(g.currentAmount)}{" "}
                      <span style={{ color: THEME.muted, fontSize: 16 }}>
                        / {fmtINRFull(g.targetAmount)}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: progress >= 100 ? THEME.sage : THEME.accent,
                      }}
                    >
                      {progress.toFixed(1)}% reached
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16 }}>
                  {/* Circular SVG ring */}
                  {(() => {
                    const ringColor = progress >= 100 ? THEME.sage : progress >= 50 ? THEME.gold : THEME.accent;
                    const r = 24;
                    const circ = 2 * Math.PI * r;
                    const dashArr = circ;
                    const dashOff = circ * (1 - Math.min(progress, 100) / 100);
                    return (
                      <svg width="60" height="60" style={{ flexShrink: 0 }}>
                        <circle cx="30" cy="30" r={r} fill="none" stroke={THEME.line} strokeWidth="5" />
                        <circle cx="30" cy="30" r={r} fill="none" stroke={ringColor} strokeWidth="5"
                          strokeDasharray={dashArr} strokeDashoffset={dashOff}
                          strokeLinecap="round"
                          style={{ transformOrigin: "30px 30px", transform: "rotate(-90deg)", transition: "stroke-dashoffset 0.5s" }}
                        />
                        <text x="30" y="35" textAnchor="middle" fontSize="11" fontWeight="700" fill={ringColor}>{Math.min(Math.round(progress), 100)}%</text>
                      </svg>
                    );
                  })()}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        height: 8,
                        background: THEME.line,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: `${Math.min(progress, 100)}%`,
                          background: `linear-gradient(90deg, ${THEME.gold} 0%, ${THEME.accent} 100%)`,
                          transition: "width 0.5s",
                        }}
                      />
                    </div>
                  </div>
                </div>
                {monthlyNeeded > 0 && (
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 13,
                      color: THEME.ink,
                      fontStyle: "normal",
                    }}
                  >
                    → Save <b>{fmtINRFull(monthlyNeeded)}</b>/month to reach
                    this goal on time.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {show && (
        <GoalModal
          onClose={() => setShow(false)}
          onSave={(v) => {
            addItem("goals", v);
            setShow(false);
          }}
        />
      )}
    </div>
  );
}

function GoalModal({ onClose, onSave }) {
  const [f, setF] = useState({
    name: "",
    category: "Wealth",
    targetAmount: "",
    currentAmount: "0",
    targetDate: "",
  });
  return (
    <Modal title="Add Goal" onClose={onClose}>
      <Field label="Goal Name">
        <input
          style={input}
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="e.g. Buy a home, Retirement corpus"
        />
      </Field>
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
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}
      >
        <Field label="Target Amount">
          <input
            style={input}
            type="number"
            value={f.targetAmount}
            onChange={(e) => setF({ ...f, targetAmount: e.target.value })}
          />
        </Field>
        <Field label="Current Saved">
          <input
            style={input}
            type="number"
            value={f.currentAmount}
            onChange={(e) => setF({ ...f, currentAmount: e.target.value })}
          />
        </Field>
        <Field label="Target Date">
          <input
            style={input}
            type="date"
            value={f.targetDate}
            onChange={(e) => setF({ ...f, targetDate: e.target.value })}
          />
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
  const [nps80CCD,  setNps80CCD]  = useState(() => String(state.nps.reduce((s,n) => s + Number(n.thisYearContribution || 0), 0)));
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
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
      <div style={{ ...card, marginBottom: 24, background: betterReg === "new" ? "#F0F3ED" : "#F7EFDE", borderLeft: `4px solid ${THEME.gold}` }}>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: THEME.accent, marginBottom: 8 }}>New Regime (FY 25-26)</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
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
              </table>
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: THEME.accent, marginBottom: 8 }}>Old Regime</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
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
              </table>
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {advanceTaxDue.map((d) => {
            const cumulative = (expectedTax * d.pct) / 100;
            const met = paidAdvance >= cumulative;
            return (
              <div key={d.date} style={{ padding: 16, border: `1px solid ${met ? THEME.sage : THEME.line}`, background: met ? "#F0F3ED" : "transparent" }}>
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
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,22,40,0.6)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: THEME.darkInk,
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          overflowY: "auto",
          border: "none",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        }}
      >
        <div
          style={{
            padding: "20px 28px",
            borderBottom: `1px solid ${THEME.line}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 22,
              fontWeight: 800,
            }}
          >
            {title}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: THEME.ink,
            }}
          >
            <X size={20} />
          </button>
        </div>
        <div style={{ padding: 28 }}>{children}</div>
      </div>
    </div>
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
function BudgetTab({ state, addItem, removeItem, metrics }) {
  const [show, setShow] = useState(false);
  const ym = new Date().toISOString().slice(0, 7);

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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
        <Tile icon={Wallet} label="Total Budgeted" value={fmtINRFull(totalBudget)} />
        <Tile icon={Receipt} label="Spent This Month" value={fmtINRFull(totalSpent)} negative={totalSpent > totalBudget} />
        <Tile icon={TrendingUp} label="Remaining" value={fmtINRFull(Math.max(0, totalBudget - totalSpent))} />
        <Tile icon={Target} label="Categories" value={state.budgets.length} />
      </div>

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
            return (
              <div key={b.id} style={{ ...card, position: "relative" }}>
                <button onClick={() => removeItem("budgets", b.id)} style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", cursor: "pointer", color: THEME.muted }}>
                  <Trash2 size={14} />
                </button>
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
                <div style={{ height: 8, background: THEME.line, borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: Math.min(pct, 100) + "%", background: over ? THEME.rust : pct > 80 ? THEME.gold : THEME.sage, borderRadius: 4, transition: "width 0.5s" }} />
                </div>
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
    </div>
  );
}

function BudgetModal({ existing, onClose, onSave }) {
  const allCats = ["Food", "Rent", "Transport", "Shopping", "Bills", "Salary", "Investment", "Tax", "Medical", "Entertainment", "EMI", "Groceries", "Utilities", "Other"];
  const [f, setF] = useState({ category: allCats[0], monthly: "" });
  return (
    <Modal title="Add Budget" onClose={onClose}>
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

  const allReminders = useMemo(() => {
    const list = [];
    state.creditCards.forEach((c) => {
      if (c.dueDate) list.push({ id: "cc-" + c.id, title: (c.issuer || "Card") + " — Bill Due", subtitle: "Outstanding: " + fmtINRFull(c.outstanding), date: c.dueDate, type: "Credit Card", icon: CreditCard });
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
        <button style={btnSolid} onClick={() => setShow(true)}>
          <Plus size={14} /> Add Reminder
        </button>
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

// ================== ANALYTICS TAB ==================
function AnalyticsTab({ metrics, state, trendData }) {
  const netWorthTrend = useMemo(() => {
    return trendData.map((t, i) => ({
      month: t.month,
      value: metrics.netWorth - (trendData.length - 1 - i) * (metrics.monthIncome - metrics.monthExpense) * 0.85,
    }));
  }, [trendData, metrics]);

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
      const entry: any = { month: label };
      topCatNames.forEach((cat) => { entry[cat] = txns.filter((t) => t.category === cat).reduce((s, t) => s + Number(t.amount || 0), 0); });
      return entry;
    });
    return { data, cats: topCatNames };
  }, [state.transactions, metrics.expenseBreakdown]);

  const incomeBySrc = useMemo(() => {
    const map = {};
    state.income.forEach((i) => { map[i.source] = (map[i.source] || 0) + Number(i.amount || 0); });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a: any, b: any) => b.value - a.value);
  }, [state.income]);

  const avgIncome = trendData.filter((t) => t.income > 0).reduce((s, t) => s + t.income, 0) / Math.max(1, trendData.filter((t) => t.income > 0).length);
  const avgExpense = trendData.filter((t) => t.expense > 0).reduce((s, t) => s + t.expense, 0) / Math.max(1, trendData.filter((t) => t.expense > 0).length);

  return (
    <div>
      <SectionTitle sub="Deeper insights into your spending patterns and financial health">
        Analytics
      </SectionTitle>

      {/* Net Worth Timeline */}
      <div style={{ ...card, marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Net Worth Timeline — Trailing 12 Months</div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={netWorthTrend}>
            <defs>
              <linearGradient id="gNwAnalytics" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={THEME.accent} stopOpacity={0.4} />
                <stop offset="100%" stopColor={THEME.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} />
            <XAxis dataKey="month" tick={{ fill: THEME.muted, fontSize: 11 }} />
            <YAxis tick={{ fill: THEME.muted, fontSize: 11 }} tickFormatter={fmtINR} />
            <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.ink, color: THEME.paper, border: "none", borderRadius: 8 }} />
            <Area type="monotone" dataKey="value" stroke={THEME.accent} strokeWidth={2} fill="url(#gNwAnalytics)" name="Net Worth" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
        <Tile icon={TrendingUp} label="Avg Monthly Income" value={fmtINRFull(avgIncome)} />
        <Tile icon={Receipt} label="Avg Monthly Expense" value={fmtINRFull(avgExpense)} />
        <Tile icon={Target} label="Savings Rate (This Month)" value={metrics.savingsRate.toFixed(1) + "%"} />
        <Tile icon={Wallet} label="Net Worth" value={fmtINRFull(metrics.netWorth)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
        <div style={card}>
          <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Savings Rate — 6 Months</div>
          <ResponsiveContainer width="100%" height={240}>
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
          <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Income by Source (This FY)</div>
          {incomeBySrc.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={incomeBySrc} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={45} paddingAngle={2}>
                  {incomeBySrc.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.ink, color: THEME.paper, border: "none", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyHint text="Log income in Tax Vault to see breakdown" />}
        </div>
      </div>

      <div style={{ ...card, marginBottom: 32 }}>
        <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Top Category Spending — 6 Months (Stacked)</div>
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

      <div style={card}>
        <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Top Expenses This Month</div>
        {metrics.expenseBreakdown.length ? (
          <div style={{ display: "grid", gap: 14 }}>
            {metrics.expenseBreakdown.slice(0, 6).map((cat, i) => {
              const maxVal = metrics.expenseBreakdown[0].value;
              const pct = maxVal > 0 ? (cat.value / maxVal) * 100 : 0;
              return (
                <div key={cat.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5, fontSize: 14 }}>
                    <span style={{ fontWeight: 600 }}>{cat.name}</span>
                    <span style={{ fontWeight: 700 }}>{fmtINRFull(cat.value)}</span>
                  </div>
                  <div style={{ height: 6, background: THEME.line, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: pct + "%", background: PIE_COLORS[i % PIE_COLORS.length], borderRadius: 3 }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : <EmptyHint text="No expense data for this month" />}
      </div>
    </div>
  );
}

// ================== SIP TRACKER TAB ==================
function SIPTrackerTab({ state, addItem, removeItem }) {
  const [show, setShow] = useState(false);
  const todayStr = today();

  const sipsWithCalc = useMemo(() => {
    return (state.sips || []).map((sip) => {
      const paid = Math.min(
        Math.max(0, monthsBetween(sip.startDate, todayStr)),
        Number(sip.totalInstallments || 0)
      );
      const totalInvested = paid * Number(sip.amount || 0);
      return { ...sip, paid, totalInvested };
    });
  }, [state.sips, todayStr]);

  const totalMonthly = sipsWithCalc.reduce((s, sip) => s + Number(sip.amount || 0), 0);
  const totalInvested = sipsWithCalc.reduce((s, sip) => s + sip.totalInvested, 0);

  return (
    <div>
      <SectionTitle sub="Track your systematic investment plans across mutual funds">
        SIP Tracker
      </SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Tile icon={Activity} label="Monthly SIP" value={fmtINRFull(totalMonthly)} />
        <Tile icon={TrendingUp} label="Total Invested" value={fmtINRFull(totalInvested)} />
        <Tile icon={Repeat} label="Active SIPs" value={sipsWithCalc.length} />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button style={btnSolid} onClick={() => setShow(true)}>
          <Plus size={14} /> Add SIP
        </button>
      </div>

      {sipsWithCalc.length === 0 ? (
        <div style={card}><EmptyHint text="Add your SIPs to track investments" /></div>
      ) : (
        <div style={card}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${THEME.ink}` }}>
                <th style={th}>Scheme</th>
                <th style={th}>Type</th>
                <th style={{ ...th, textAlign: "right" }}>Amount/mo</th>
                <th style={th}>Started</th>
                <th style={{ ...th, textAlign: "right" }}>Installments Paid</th>
                <th style={{ ...th, textAlign: "right" }}>Total Invested</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {sipsWithCalc.map((sip) => (
                <tr key={sip.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}>
                  <td style={{ ...td, fontWeight: 600 }}>{sip.scheme}</td>
                  <td style={{ ...td, color: THEME.muted, fontSize: 12 }}>{sip.fundType}</td>
                  <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(sip.amount)}</td>
                  <td style={td}>{sip.startDate}</td>
                  <td style={{ ...td, textAlign: "right" }}>{sip.paid} / {sip.totalInstallments}</td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>{fmtINRFull(sip.totalInvested)}</td>
                  <td style={td}>
                    <button onClick={() => removeItem("sips", sip.id)} style={iconBtn}><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
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
  const coverageGap = totalTermCover < annualIncome * 10;

  return (
    <div>
      <SectionTitle sub="Life Insurance, LIC policies and term plan coverage at a glance">
        Insurance Summary
      </SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Tile icon={Shield} label="Total LIC Sum Assured" value={fmtINRFull(totalLICAssured)} />
        <Tile icon={Heart} label="Total Term Cover" value={fmtINRFull(totalTermCover)} />
        <Tile icon={Wallet} label="Total Annual Premium" value={fmtINRFull(totalAnnualPremium)} />
      </div>

      {coverageGap && annualIncome > 0 && (
        <div style={{ ...card, marginBottom: 24, background: "rgba(217,48,37,0.06)", borderLeft: `4px solid ${THEME.rust}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AlertCircle size={18} style={{ color: THEME.rust, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: THEME.rust }}>Coverage Gap Detected</div>
              <div style={{ fontSize: 13, color: THEME.muted, marginTop: 2 }}>
                Your term cover ({fmtINRFull(totalTermCover)}) is below the recommended 10× annual income ({fmtINRFull(annualIncome * 10)}). Consider increasing your term insurance.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LIC Policies */}
      <div style={{ ...card, marginBottom: 24 }}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Life Insurance (LIC)</div>
        {state.lic.length === 0 ? (
          <EmptyHint text="No LIC policies added" />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
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
          </table>
        )}
      </div>

      {/* Term Plans */}
      <div style={card}>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Term Plans</div>
        {state.termPlans.length === 0 ? (
          <EmptyHint text="No term plans added" />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
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
          </table>
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
        <input style={input} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Optional note" />
      </Field>
      <ModalActions onSave={() => f.amount && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

// ================== SETTINGS TAB ==================
function SettingsTab({ state, setState, exportJSON, resetAll }) {
  const [prof, setProf] = useState({ ...state.profile });
  const [saved, setSaved] = useState(false);

  const saveProfile = () => {
    setState((s) => ({ ...s, profile: { ...s.profile, ...prof } }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result as string);
        setState((s) => ({ ...s, ...parsed }));
        alert("Backup restored successfully");
      } catch {
        alert("Invalid backup file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <SectionTitle sub="Personalise your dashboard and manage your financial data">
        Settings & Profile
      </SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <User size={18} /> Profile
          </div>
          <Field label="Display Name">
            <input style={input} value={prof.name || ""} onChange={(e) => setProf({ ...prof, name: e.target.value })} placeholder="Your name" />
          </Field>
          <Field label="Financial Year">
            <select style={input} value={prof.fy || "2025-26"} onChange={(e) => setProf({ ...prof, fy: e.target.value })}>
              <option value="2023-24">FY 2023-24</option>
              <option value="2024-25">FY 2024-25</option>
              <option value="2025-26">FY 2025-26</option>
              <option value="2026-27">FY 2026-27</option>
            </select>
          </Field>
          <Field label="Tax Regime">
            <select style={input} value={prof.regime || "new"} onChange={(e) => setProf({ ...prof, regime: e.target.value })}>
              <option value="new">New Regime (Default)</option>
              <option value="old">Old Regime</option>
            </select>
          </Field>
          <button style={{ ...btnAccent, marginTop: 8 }} onClick={saveProfile}>
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <FileText size={18} /> Data Management
          </div>
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Export Backup</div>
              <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 8 }}>Download all data as a JSON file</div>
              <button style={btnGhost} onClick={exportJSON}><Download size={14} /> Export JSON</button>
            </div>
            <div style={{ borderTop: "1px solid " + THEME.line, paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Import Backup</div>
              <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 8 }}>Restore from a previously exported file</div>
              <label style={btnGhost}>
                <Upload size={14} /> Import JSON
                <input type="file" accept=".json" onChange={handleImport} style={{ display: "none" }} />
              </label>
            </div>
            <div style={{ borderTop: "1px solid " + THEME.line, paddingTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: THEME.rust }}>Reset All Data</div>
              <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 8 }}>Delete all data and start fresh — cannot be undone</div>
              <button style={{ ...btnGhost, color: THEME.rust, borderColor: THEME.rust }} onClick={resetAll}><Trash2 size={14} /> Reset All</button>
            </div>
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={18} /> Dashboard Summary
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <Stat k="Name" v={state.profile.name || "—"} />
          <Stat k="Financial Year" v={state.profile.fy} />
          <Stat k="Tax Regime" v={state.profile.regime === "new" ? "New Regime" : "Old Regime"} />
          <Stat k="Transactions" v={state.transactions.length + " entries"} />
          <Stat k="Bank Accounts" v={state.bankAccounts.length} />
          <Stat k="Goals" v={state.goals.length} />
          <Stat k="Subscriptions" v={state.subscriptions.length} />
          <Stat k="Budgets Set" v={state.budgets.length} />
        </div>
      </div>
    </div>
  );
}

// ================== CALCULATORS TAB ==================
function CalculatorsTab() {
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
