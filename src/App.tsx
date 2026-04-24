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

const THEME = {
  ink: "#202124", // material dark text
  paper: "#F8F9FA", // material light grey background
  accent: "#1A73E8", // material blue primary
  gold: "#F9AB00", // material yellow warning
  sage: "#1E8E3E", // material green success
  rust: "#D93025", // material red error
  muted: "#5F6368", // material secondary text
  line: "#DADCE0", // material divider
  darkInk: "#FFFFFF", // material white (for cards)
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

const DEFAULT_STATE = {
  profile: { name: "", fy: "2025-26", regime: "new" },
  bankAccounts: [],
  transactions: [],
  fixedDeposits: [],
  recurringDeposits: [],
  bonds: [],
  ppf: [],
  nps: [],
  lic: [],
  termPlans: [],
  mutualFunds: [],
  stocks: [],
  demat: [],
  creditCards: [],
  prepaidCards: [],
  loansTaken: [],
  loansGiven: [],
  subscriptions: [],
  goals: [],
  income: [],
  taxPayments: [],
};

// ================== MAIN APP ==================
export default function FinanceDashboard() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("overview");
  const [modal, setModal] = useState(null);

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

    const subTotal = state.subscriptions.reduce((s, sub) => {
      const m =
        sub.cycle === "yearly"
          ? Number(sub.amount || 0) / 12
          : sub.cycle === "quarterly"
          ? Number(sub.amount || 0) / 3
          : Number(sub.amount || 0);
      return s + m;
    }, 0);

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

  const resetAll = () => {
    if (confirm("Delete ALL data? This cannot be undone."))
      setState(DEFAULT_STATE);
  };

  // ================== TABS ==================
  const tabs = [
    { id: "overview", label: "Ledger", icon: LineIcon },
    { id: "banks", label: "Banks", icon: Landmark },
    { id: "investments", label: "Investments", icon: TrendingUp },
    { id: "demat", label: "Demat & Stocks", icon: BarChart3 },
    { id: "credit", label: "Credit & Loans", icon: CreditCard },
    { id: "subs", label: "Subscriptions", icon: Repeat },
    { id: "goals", label: "Goals", icon: Target },
    { id: "tax", label: "Tax Vault", icon: Calculator },
  ];

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
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button onClick={exportJSON} style={btnGhost}>
              <Download size={14} /> Export
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
          />
        )}
        {tab === "demat" && (
          <DematTab state={state} addItem={addItem} removeItem={removeItem} />
        )}
        {tab === "credit" && (
          <CreditTab state={state} addItem={addItem} removeItem={removeItem} />
        )}
        {tab === "subs" && (
          <SubsTab
            state={state}
            addItem={addItem}
            removeItem={removeItem}
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
              display: "flex",
              gap: 32,
              marginTop: 24,
              flexWrap: "wrap",
            }}
          >
            <HeroStat label="Total Assets" value={metrics.totalAssets} />
            <HeroStat
              label="Total Liabilities"
              value={metrics.totalLiabilities}
              negative
            />
            <HeroStat
              label="This Month · In"
              value={metrics.monthIncome}
              sage
            />
            <HeroStat
              label="This Month · Out"
              value={metrics.monthExpense}
              rust
            />
          </div>
        </div>
      </div>

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
function BanksTab({ state, addItem, removeItem }) {
  const [showBank, setShowBank] = useState(false);
  const [showTxn, setShowTxn] = useState(false);
  const [filterAcc, setFilterAcc] = useState("all");

  const filteredTxns =
    filterAcc === "all"
      ? state.transactions
      : state.transactions.filter((t) => t.accountId === filterAcc);

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
            <button
              onClick={() => removeItem("bankAccounts", a.id)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
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
          <select
            style={{ ...input, width: "auto", minWidth: 180 }}
            value={filterAcc}
            onChange={(e) => setFilterAcc(e.target.value)}
          >
            <option value="all">All accounts</option>
            {state.bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.bankName}
              </option>
            ))}
          </select>
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
                      <td style={td}>{t.note || "—"}</td>
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
                        <button
                          onClick={() => removeItem("transactions", t.id)}
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
      </div>

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

// ================== INVESTMENTS TAB ==================
function InvestmentsTab({ state, addItem, removeItem }) {
  const [sub, setSub] = useState("fd");
  const [modal, setModal] = useState(null);

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
        <FDList
          items={state.fixedDeposits}
          onRemove={(id) => removeItem("fixedDeposits", id)}
        />
      )}
      {sub === "rd" && (
        <RDList
          items={state.recurringDeposits}
          onRemove={(id) => removeItem("recurringDeposits", id)}
        />
      )}
      {sub === "bond" && (
        <BondList
          items={state.bonds}
          onRemove={(id) => removeItem("bonds", id)}
        />
      )}
      {sub === "ppf" && (
        <PPFList items={state.ppf} onRemove={(id) => removeItem("ppf", id)} />
      )}
      {sub === "nps" && (
        <NPSList items={state.nps} onRemove={(id) => removeItem("nps", id)} />
      )}
      {sub === "mf" && (
        <MFList
          items={state.mutualFunds}
          onRemove={(id) => removeItem("mutualFunds", id)}
        />
      )}
      {sub === "lic" && (
        <LICList items={state.lic} onRemove={(id) => removeItem("lic", id)} />
      )}
      {sub === "term" && (
        <TermList
          items={state.termPlans}
          onRemove={(id) => removeItem("termPlans", id)}
        />
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
    </div>
  );
}

const InvestCard = ({ children, onRemove }) => (
  <div style={{ ...card, position: "relative" }}>
    <button
      onClick={onRemove}
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: THEME.muted,
      }}
    >
      <Trash2 size={14} />
    </button>
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

function FDList({ items, onRemove }) {
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
          <InvestCard key={f.id} onRemove={() => onRemove(f.id)}>
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

function RDList({ items, onRemove }) {
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
          <InvestCard key={r.id} onRemove={() => onRemove(r.id)}>
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

function BondList({ items, onRemove }) {
  if (!items.length) return <EmptyHint text="No bonds yet" />;
  return (
    <Grid>
      {items.map((b) => (
        <InvestCard key={b.id} onRemove={() => onRemove(b.id)}>
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

function PPFList({ items, onRemove }) {
  if (!items.length) return <EmptyHint text="No PPF account yet" />;
  return (
    <Grid>
      {items.map((p) => (
        <InvestCard key={p.id} onRemove={() => onRemove(p.id)}>
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

function NPSList({ items, onRemove }) {
  if (!items.length) return <EmptyHint text="No NPS account yet" />;
  return (
    <Grid>
      {items.map((n) => (
        <InvestCard key={n.id} onRemove={() => onRemove(n.id)}>
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

function MFList({ items, onRemove }) {
  if (!items.length) return <EmptyHint text="No mutual fund holdings yet" />;
  return (
    <Grid>
      {items.map((m) => {
        const current = Number(m.units) * Number(m.currentNav);
        const pnl = current - Number(m.invested);
        const pct = Number(m.invested) ? (pnl / Number(m.invested)) * 100 : 0;
        return (
          <InvestCard key={m.id} onRemove={() => onRemove(m.id)}>
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

function LICList({ items, onRemove }) {
  if (!items.length) return <EmptyHint text="No LIC policies yet" />;
  return (
    <Grid>
      {items.map((l) => (
        <InvestCard key={l.id} onRemove={() => onRemove(l.id)}>
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

function TermList({ items, onRemove }) {
  if (!items.length) return <EmptyHint text="No term plans yet" />;
  return (
    <Grid>
      {items.map((t) => (
        <InvestCard key={t.id} onRemove={() => onRemove(t.id)}>
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
function FDModal({ onClose, onSave }) {
  const [f, setF] = useState({
    bank: "",
    principal: "",
    rate: "7",
    years: "1",
    startDate: today(),
    maturityDate: "",
  });
  return (
    <Modal title="Add Fixed Deposit" onClose={onClose}>
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
function RDModal({ onClose, onSave }) {
  const [f, setF] = useState({
    bank: "",
    monthly: "",
    rate: "6.5",
    tenureMonths: "12",
    startDate: today(),
  });
  return (
    <Modal title="Add Recurring Deposit" onClose={onClose}>
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
function BondModal({ onClose, onSave }) {
  const [f, setF] = useState({
    name: "",
    type: "Government",
    faceValue: "",
    coupon: "",
    maturityDate: "",
  });
  return (
    <Modal title="Add Bond" onClose={onClose}>
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
function PPFModal({ onClose, onSave }) {
  const [f, setF] = useState({
    bank: "",
    balance: "",
    openDate: "",
    thisYearContribution: "",
  });
  return (
    <Modal title="Add PPF Account" onClose={onClose}>
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
function NPSModal({ onClose, onSave }) {
  const [f, setF] = useState({
    pran: "",
    tier: "I",
    balance: "",
    thisYearContribution: "",
  });
  return (
    <Modal title="Add NPS Account" onClose={onClose}>
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
function MFModal({ onClose, onSave }) {
  const [f, setF] = useState({
    scheme: "",
    type: "Equity",
    units: "",
    invested: "",
    currentNav: "",
  });
  return (
    <Modal title="Add Mutual Fund Holding" onClose={onClose}>
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
function LICModal({ onClose, onSave }) {
  const [f, setF] = useState({
    policyNumber: "",
    planName: "",
    sumAssured: "",
    annualPremium: "",
    premiumPaid: "",
    maturityDate: "",
  });
  return (
    <Modal title="Add LIC Policy" onClose={onClose}>
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
function TermModal({ onClose, onSave }) {
  const [f, setF] = useState({
    insurer: "",
    planName: "",
    coverAmount: "",
    annualPremium: "",
    expiryDate: "",
  });
  return (
    <Modal title="Add Term Plan" onClose={onClose}>
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
function DematTab({ state, addItem, removeItem }) {
  const [showDemat, setShowDemat] = useState(false);
  const [showStock, setShowStock] = useState(false);

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
                  <th style={th}>Symbol</th>
                  <th style={th}>Broker</th>
                  <th style={{ ...th, textAlign: "right" }}>Qty</th>
                  <th style={{ ...th, textAlign: "right" }}>Avg</th>
                  <th style={{ ...th, textAlign: "right" }}>LTP</th>
                  <th style={{ ...th, textAlign: "right" }}>Invested</th>
                  <th style={{ ...th, textAlign: "right" }}>Current</th>
                  <th style={{ ...th, textAlign: "right" }}>P&L</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {state.stocks.map((s) => {
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
                        <button
                          onClick={() => removeItem("stocks", s.id)}
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

function StockModal({ demats, onClose, onSave }) {
  const [f, setF] = useState({
    symbol: "",
    dematId: demats[0]?.id || "",
    qty: "",
    avgPrice: "",
    currentPrice: "",
  });
  return (
    <Modal title="Add Stock" onClose={onClose}>
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
function CreditTab({ state, addItem, removeItem }) {
  const [sub, setSub] = useState("cc");
  const [modal, setModal] = useState(null);

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
        <CCList
          items={state.creditCards}
          onRemove={(id) => removeItem("creditCards", id)}
        />
      )}
      {sub === "prepaid" && (
        <PrepaidList
          items={state.prepaidCards}
          onRemove={(id) => removeItem("prepaidCards", id)}
        />
      )}
      {sub === "taken" && (
        <LoanTakenList
          items={state.loansTaken}
          onRemove={(id) => removeItem("loansTaken", id)}
        />
      )}
      {sub === "given" && (
        <LoanGivenList
          items={state.loansGiven}
          onRemove={(id) => removeItem("loansGiven", id)}
        />
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
    </div>
  );
}

function CCList({ items, onRemove }) {
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
            <button
              onClick={() => onRemove(c.id)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "rgba(245,239,227,0.6)",
              }}
            >
              <Trash2 size={14} />
            </button>
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

function PrepaidList({ items, onRemove }) {
  if (!items.length) return <EmptyHint text="No prepaid cards/wallets" />;
  return (
    <Grid>
      {items.map((p) => (
        <InvestCard key={p.id} onRemove={() => onRemove(p.id)}>
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

function LoanTakenList({ items, onRemove }) {
  if (!items.length) return <EmptyHint text="No loans taken" />;
  return (
    <Grid>
      {items.map((l) => (
        <InvestCard key={l.id} onRemove={() => onRemove(l.id)}>
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

function LoanGivenList({ items, onRemove }) {
  if (!items.length) return <EmptyHint text="No loans given" />;
  return (
    <Grid>
      {items.map((l) => (
        <InvestCard key={l.id} onRemove={() => onRemove(l.id)}>
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

function CCModal({ onClose, onSave }) {
  const [f, setF] = useState({
    issuer: "",
    network: "Visa",
    last4: "",
    limit: "",
    outstanding: "0",
    dueDate: "",
    statementDate: "",
  });
  return (
    <Modal title="Add Credit Card" onClose={onClose}>
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

function PrepaidModal({ onClose, onSave }) {
  const [f, setF] = useState({ provider: "", name: "", balance: "" });
  return (
    <Modal title="Add Prepaid Card / Wallet" onClose={onClose}>
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

function LoanTakenModal({ onClose, onSave }) {
  const [f, setF] = useState({
    lender: "",
    type: "Personal",
    principal: "",
    outstanding: "",
    emi: "",
    rate: "",
    monthsRemaining: "",
  });
  return (
    <Modal title="Add Loan Taken" onClose={onClose}>
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

function LoanGivenModal({ onClose, onSave }) {
  const [f, setF] = useState({
    borrower: "",
    principal: "",
    outstanding: "",
    rate: "",
    date: today(),
    dueDate: "",
    note: "",
  });
  return (
    <Modal title="Record Loan Given" onClose={onClose}>
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
function SubsTab({ state, addItem, removeItem, metrics }) {
  const [show, setShow] = useState(false);
  const annual = metrics.subTotal * 12;

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
          value={state.subscriptions.length}
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
                    style={{ borderBottom: `1px dashed ${THEME.line}` }}
                  >
                    <td style={{ ...td, fontWeight: 600 }}>{s.name}</td>
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
                    <td style={td}>
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
                <div
                  style={{
                    height: 8,
                    background: THEME.line,
                    marginTop: 16,
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
  const [deductions, setDeductions] = useState(
    state.profile.deductions80C || "150000"
  );

  const income = metrics.annualIncome;
  const newReg = calcTaxNew(income);
  const oldReg = calcTaxOld(income, Number(deductions) + 50000); // standard ded 50k old

  // Advance tax schedule
  const advanceTaxDue = [
    { date: "15 Jun", pct: 15 },
    { date: "15 Sep", pct: 45 },
    { date: "15 Dec", pct: 75 },
    { date: "15 Mar", pct: 100 },
  ];

  const paidAdvance = state.taxPayments.reduce(
    (s, t) => s + Number(t.amount || 0),
    0
  );
  const regime = state.profile.regime || "new";
  const expectedTax = regime === "new" ? newReg.total : oldReg.total;

  // Capital gains from stocks (realized not tracked — show unrealized for estimation)
  const unrealizedSTCG = 0; // placeholder: user adds realized separately
  const unrealizedLTCG = state.stocks.reduce(
    (s, st) =>
      s +
      (Number(st.qty) * Number(st.currentPrice) -
        Number(st.qty) * Number(st.avgPrice)),
    0
  );

  return (
    <div>
      <SectionTitle
        sub={`FY ${state.profile.fy} · Advance tax, regime comparison, 80C planning`}
      >
        Tax Vault
      </SectionTitle>

      {/* Regime comparison */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            ...card,
            borderTop: `4px solid ${
              regime === "new" ? THEME.accent : THEME.line
            }`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: THEME.muted,
              }}
            >
              New Regime
            </div>
            {regime === "new" && (
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  background: THEME.accent,
                  color: THEME.paper,
                  letterSpacing: "0.15em",
                }}
              >
                SELECTED
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 34,
              fontWeight: 800,
              marginTop: 12,
            }}
          >
            {fmtINRFull(newReg.total)}
          </div>
          <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
            Tax + 4% cess on {fmtINRFull(income)}
          </div>
          <button
            onClick={() =>
              setState((s) => ({
                ...s,
                profile: { ...s.profile, regime: "new" },
              }))
            }
            style={{ ...btnGhost, marginTop: 16, fontSize: 11 }}
          >
            Use this regime
          </button>
        </div>
        <div
          style={{
            ...card,
            borderTop: `4px solid ${
              regime === "old" ? THEME.accent : THEME.line
            }`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: THEME.muted,
              }}
            >
              Old Regime
            </div>
            {regime === "old" && (
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 8px",
                  background: THEME.accent,
                  color: THEME.paper,
                  letterSpacing: "0.15em",
                }}
              >
                SELECTED
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 34,
              fontWeight: 800,
              marginTop: 12,
            }}
          >
            {fmtINRFull(oldReg.total)}
          </div>
          <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
            After {fmtINRFull(Number(deductions) + 50000)} deductions (incl.
            ₹50k std)
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ ...label, fontSize: 10 }}>
              80C Deductions (₹1.5L max)
            </label>
            <input
              style={{ ...input, fontSize: 13 }}
              type="number"
              value={deductions}
              onChange={(e) => {
                setDeductions(e.target.value);
                setState((s) => ({
                  ...s,
                  profile: { ...s.profile, deductions80C: e.target.value },
                }));
              }}
            />
          </div>
          <button
            onClick={() =>
              setState((s) => ({
                ...s,
                profile: { ...s.profile, regime: "old" },
              }))
            }
            style={{ ...btnGhost, marginTop: 12, fontSize: 11 }}
          >
            Use this regime
          </button>
        </div>
      </div>

      {/* Recommendation banner */}
      <div
        style={{
          ...card,
          marginBottom: 24,
          background: newReg.total < oldReg.total ? "#F0F3ED" : "#F7EFDE",
          borderLeft: `4px solid ${THEME.gold}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Sparkles size={20} style={{ color: THEME.gold }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              {newReg.total < oldReg.total
                ? `New regime saves you ${fmtINRFull(
                    oldReg.total - newReg.total
                  )} this year`
                : `Old regime saves you ${fmtINRFull(
                    newReg.total - oldReg.total
                  )} this year`}
            </div>
            <div style={{ fontSize: 13, color: THEME.muted, marginTop: 2 }}>
              Based on income of {fmtINRFull(income)}. Adjust deductions or add
              more income to recompute.
            </div>
          </div>
        </div>
      </div>

      {/* Advance tax schedule */}
      <div style={{ ...card, marginBottom: 24 }}>
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
            Advance Tax Schedule
          </div>
          <div style={{ fontSize: 13, color: THEME.muted }}>
            Expected: {fmtINRFull(expectedTax)} · Paid:{" "}
            {fmtINRFull(paidAdvance)}
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          {advanceTaxDue.map((d) => {
            const cumulative = (expectedTax * d.pct) / 100;
            const met = paidAdvance >= cumulative;
            return (
              <div
                key={d.date}
                style={{
                  padding: 16,
                  border: `1px solid ${met ? THEME.sage : THEME.line}`,
                  background: met ? "#F0F3ED" : "transparent",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                    color: THEME.muted,
                  }}
                >
                  By {d.date}
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                  {d.pct}% of liability
                </div>
                <div
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: 20,
                    fontWeight: 800,
                    marginTop: 8,
                  }}
                >
                  {fmtINR(cumulative)}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: met ? THEME.sage : THEME.accent,
                    marginTop: 4,
                    fontWeight: 600,
                  }}
                >
                  {met
                    ? "✓ Covered"
                    : `Short ${fmtINR(cumulative - paidAdvance)}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Income & payments */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
                fontFamily: "'Inter', sans-serif",
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              Income (this FY)
            </div>
            <button style={btnGhost} onClick={() => setShowIncome(true)}>
              <Plus size={12} />
            </button>
          </div>
          {state.income.length === 0 ? (
            <EmptyHint text="No income logged" />
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {state.income
                .slice(-10)
                .reverse()
                .map((i) => (
                  <div
                    key={i.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      padding: "8px 0",
                      borderBottom: `1px dashed ${THEME.line}`,
                    }}
                  >
                    <span>
                      <div style={{ fontWeight: 500 }}>{i.source}</div>
                      <div style={{ fontSize: 11, color: THEME.muted }}>
                        {i.date} · {i.category}
                      </div>
                    </span>
                    <span
                      style={{
                        color: THEME.sage,
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmtINRFull(i.amount)}
                    </span>
                  </div>
                ))}
              <div
                style={{
                  borderTop: `2px solid ${THEME.ink}`,
                  padding: "10px 0 0",
                  marginTop: 6,
                  display: "flex",
                  justifyContent: "space-between",
                  fontWeight: 700,
                }}
              >
                <span>Total FY</span>
                <span style={{ color: THEME.sage }}>{fmtINRFull(income)}</span>
              </div>
            </div>
          )}
        </div>

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
                fontFamily: "'Inter', sans-serif",
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              Tax Payments
            </div>
            <button style={btnGhost} onClick={() => setShowTaxPmt(true)}>
              <Plus size={12} />
            </button>
          </div>
          {state.taxPayments.length === 0 ? (
            <EmptyHint text="No advance tax / TDS logged" />
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {state.taxPayments.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    padding: "8px 0",
                    borderBottom: `1px dashed ${THEME.line}`,
                  }}
                >
                  <span>
                    <div style={{ fontWeight: 500 }}>{t.type}</div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>
                      {t.date} · {t.challan || ""}
                    </div>
                  </span>
                  <span
                    style={{
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmtINRFull(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Capital gains hint */}
      <div
        style={{ ...card, marginTop: 24, borderLeft: `4px solid ${THEME.ink}` }}
      >
        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: THEME.muted,
          }}
        >
          Capital Gains Snapshot
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
            marginTop: 12,
          }}
        >
          <Stat k="Unrealized Equity" v={fmtINRFull(unrealizedLTCG)} />
          <Stat
            k="Est. LTCG tax (12.5% above ₹1.25L)"
            v={fmtINR(Math.max(0, unrealizedLTCG - 125000) * 0.125)}
          />
          <Stat k="Realized (track separately)" v="—" />
        </div>
        <div
          style={{
            fontSize: 12,
            color: THEME.muted,
            fontStyle: "normal",
            marginTop: 12,
          }}
        >
          LTCG on listed equity: 12.5% above ₹1.25L exemption (FY 25-26). STCG
          on listed equity: 20%. Log realized gains via transactions for
          accurate reporting.
        </div>
      </div>

      {showIncome && (
        <IncomeModal
          onClose={() => setShowIncome(false)}
          onSave={(v) => {
            addItem("income", v);
            setShowIncome(false);
          }}
        />
      )}
      {showTaxPmt && (
        <TaxPmtModal
          onClose={() => setShowTaxPmt(false)}
          onSave={(v) => {
            addItem("taxPayments", v);
            setShowTaxPmt(false);
          }}
        />
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
