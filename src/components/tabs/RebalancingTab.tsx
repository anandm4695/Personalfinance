/* eslint-disable */
// @ts-nocheck
import React, { useState, useMemo, useEffect } from "react";
import {
  PieChart as PieIcon,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Zap,
  Info,
  Search,
  X,
  Download,
  Wallet,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { THEME } from "../../utils/constants";
import {
  fmtINRFull,
  rdMaturity,
  calculateEpfBalance,
  getGoldPricePerGram,
  GOLD_PURITY_FACTOR,
  exportArrayToCSV,
} from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { Money } from "../ui/Money";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "14px 16px",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: THEME.muted,
  fontWeight: 700,
  borderBottom: `1.5px solid ${THEME.line}`,
  background: "color-mix(in srgb, var(--surface-1) 50%, transparent)",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: `1px solid ${THEME.line}`,
  color: THEME.ink,
  fontSize: 13,
  verticalAlign: "middle",
  fontVariantNumeric: "tabular-nums",
};

const thRight: React.CSSProperties = { ...th, textAlign: "right" };
const tdRight: React.CSSProperties = { ...td, textAlign: "right" };

/* ─── CUSTOM TOOLTIP ──────────────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null;
  const visible = payload.filter((p: any) => p.value !== 0 && p.value != null);
  if (!visible.length) return null;
  return (
    <div
      style={{
        background: "color-mix(in srgb, var(--surface-0) 85%, transparent)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1.5px solid ${THEME.line}`,
        borderRadius: 12,
        padding: "10px 14px",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
        fontSize: 12,
      }}
    >
      {visible.map((p: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: p.color || p.fill,
              display: "inline-block",
            }}
          />
          <span style={{ color: THEME.muted, fontWeight: 500 }}>{p.name || label}:</span>
          <span style={{ fontWeight: 700, color: THEME.ink }}>
            <Prv>{formatter ? formatter(p.value) : fmtINRFull(p.value)}</Prv>
          </span>
        </div>
      ))}
    </div>
  );
};

const PRESETS = {
  aggressive: {
    label: "Aggressive (80/15/5)",
    equity: 80,
    debt: 15,
    gold: 0,
    cash: 5,
    desc: "High growth, high risk — for age < 35",
  },
  moderate: {
    label: "Moderate (60/30/10)",
    equity: 60,
    debt: 30,
    gold: 0,
    cash: 10,
    desc: "Balanced growth — for age 35-50",
  },
  conservative: {
    label: "Conservative (40/45/15)",
    equity: 40,
    debt: 45,
    gold: 0,
    cash: 15,
    desc: "Capital preservation — for age 50+",
  },
  retirement: {
    label: "Retirement (30/50/20)",
    equity: 30,
    debt: 50,
    gold: 0,
    cash: 20,
    desc: "Income & safety focus",
  },
};

// Persists the user's chosen preset/custom target/drift threshold across
// tab navigation — previously these reset to "moderate" every time the user
// left and came back, silently discarding a custom target they'd set up.
const REBAL_PREFS_KEY = "rebalancing_prefs_v1";
const loadRebalPrefs = () => {
  try {
    const raw = localStorage.getItem(REBAL_PREFS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

export const RebalancingTab = ({ state, metrics, marketData }) => {
  const { privacyMode } = usePrivacy();
  const [savedPrefs] = useState(loadRebalPrefs);
  const [selectedPreset, setSelectedPreset] = useState(
    PRESETS[savedPrefs.selectedPreset] ? savedPrefs.selectedPreset : "moderate"
  );
  const [customTarget, setCustomTarget] = useState(
    savedPrefs.customTarget || { equity: 60, debt: 30, gold: 0, cash: 10 }
  );
  const [useCustom, setUseCustom] = useState(!!savedPrefs.useCustom);
  const [driftThreshold, setDriftThreshold] = useState(savedPrefs.driftThreshold ?? 3);
  const [breakdownSearch, setBreakdownSearch] = useState("");
  const [newMoneyAmount, setNewMoneyAmount] = useState("");

  const [activeCurrentIndex, setActiveCurrentIndex] = useState<number | null>(null);
  const [activeTargetIndex, setActiveTargetIndex] = useState<number | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(
        REBAL_PREFS_KEY,
        JSON.stringify({ selectedPreset, customTarget, useCustom, driftThreshold })
      );
    } catch {
      /* localStorage unavailable (private mode/quota) — preference just won't persist */
    }
  }, [selectedPreset, customTarget, useCustom, driftThreshold]);

  const target = useCustom ? customTarget : PRESETS[selectedPreset];

  const customTargetSum =
    Number(customTarget.equity || 0) +
    Number(customTarget.debt || 0) +
    Number(customTarget.gold || 0) +
    Number(customTarget.cash || 0);
  const customTargetInvalid = useCustom && Math.abs(customTargetSum - 100) > 0.5;

  const allocation = useMemo(() => {
    const equityStocks = (state.stocks || []).reduce((s, st) => {
      const price = (() => {
        if (marketData) {
          const sym = `${(st.symbol || "").replace(/\.(NS|BO)$/i, "")}.${(st.exchange || "NSE") === "BSE" ? "BO" : "NS"}`;
          return marketData[sym]?.price || Number(st.currentPrice) || Number(st.avgPrice) || 0;
        }
        return Number(st.currentPrice) || Number(st.avgPrice) || 0;
      })();
      return s + (Number(st.qty) || 0) * price;
    }, 0);

    // Single pass classifier: every fund's value lands somewhere (equity,
    // debt, or gold-MF). The old two-reduce version silently dropped any
    // fund whose category matched neither list — which included "Hybrid"
    // and "International", both real, selectable categories elsewhere in
    // the app — so that money vanished from the portfolio total entirely.
    let equityMF = 0;
    let debtMF = 0;
    let goldMF = 0;
    (state.mutualFunds || []).forEach((m) => {
      const val = (Number(m.units) || 0) * (Number(m.currentNav) || Number(m.buyNav) || 0);
      const cat = (m.category || m.type || "").toLowerCase();
      const isGold = ["gold", "silver"].some((k) => cat.includes(k));
      const isHybrid =
        !isGold && ["hybrid", "balanced", "multi asset", "equity savings"].some((k) => cat.includes(k));
      const isDebt =
        !isGold &&
        !isHybrid &&
        [
          "debt",
          "liquid",
          "money market",
          "gilt",
          "corporate bond",
          "banking",
          "credit risk",
          "dynamic bond",
          "ultra short",
          "low duration",
          "medium",
          "long duration",
          "overnight",
          "floater",
        ].some((k) => cat.includes(k));
      if (isGold) {
        goldMF += val;
      } else if (isHybrid) {
        // Hybrid/Balanced/Multi-Asset funds blend equity and debt. Split
        // 65:35 — the minimum equity share Indian hybrid funds hold to
        // qualify for equity taxation — instead of dropping the value.
        equityMF += val * 0.65;
        debtMF += val * 0.35;
      } else if (isDebt) {
        debtMF += val;
      } else {
        // Equity, ELSS, Index, "International", or any unrecognized/blank
        // category defaults to equity rather than being excluded.
        equityMF += val;
      }
    });

    const fd = (state.fixedDeposits || []).reduce((s, f) => s + Number(f.principal || 0), 0);
    const rd = (state.recurringDeposits || []).reduce((s, r) => {
      const now = new Date();
      const start = r.startDate ? new Date(r.startDate + "T00:00:00") : now;
      const totalMonths = Number(r.tenureMonths || 0);
      const elapsed = Math.min(
        totalMonths,
        Math.max(
          0,
          (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
        )
      );
      return s + rdMaturity(Number(r.monthly || 0), Number(r.rate || 6), elapsed);
    }, 0);
    const bonds = (state.bonds || []).reduce(
      (s, b) => s + Number(b.totalInvestmentAmount || b.totalPrincipalAmount || b.faceValue || 0),
      0
    );
    const ppf = (state.ppf || []).reduce((s, p) => s + Number(p.balance || 0), 0);
    const nps = (state.nps || []).reduce((s: number, n: any) => {
      const bal = Number(n.balance) || 0;
      if (bal > 0) return s + bal;
      return (
        s +
        (n.transactions || []).reduce(
          (ss: number, t: any) =>
            ss + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
          0
        )
      );
    }, 0);
    const epf = (state.epf || []).reduce((s, e) => s + calculateEpfBalance(e), 0);
    const cash = (state.bankAccounts || []).reduce((s, a) => s + Number(a.balance || 0), 0);
    const prepaidCards = (state.prepaidCards || [])
      .filter((pc: any) => (pc.status || "").toLowerCase() !== "closed")
      .reduce((s: number, pc: any) => {
        const txns = pc.transactions || [];
        const loaded = txns
          .filter((t: any) => t.type === "load")
          .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        const spent = txns
          .filter((t: any) => t.type === "spend")
          .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        return s + (loaded - spent);
      }, 0);
    const govtSchemes = (state.govtSchemes || []).reduce(
      (s, sc) => s + Number(sc.currentBalance || 0),
      0
    );
    const lic = (state.lic || []).reduce((s: number, l: any) => {
      const txTotal = (l.transactions || []).reduce(
        (sum: number, t: any) => sum + Number(t.amount || 0),
        0
      );
      return s + (txTotal > 0 ? txTotal : Number(l.premiumPaid || 0));
    }, 0);
    const investPlans = (state.investmentPlans || []).reduce((s: number, ip: any) => {
      const txTotal = (ip.transactions || []).reduce(
        (sum: number, t: any) => sum + Number(t.amount || 0),
        0
      );
      return s + (txTotal > 0 ? txTotal : Number(ip.premiumPaid || 0));
    }, 0);

    const goldPricePerGram = getGoldPricePerGram(state);
    const goldPhysical = (state.goldHoldings || []).reduce((s, g) => {
      const grams = Number(g.grams || 0);
      const purityMul = g.type === "physical" ? GOLD_PURITY_FACTOR[g.purity] || 1 : 1;
      return s + grams * goldPricePerGram * purityMul;
    }, 0);
    const gold = goldPhysical + goldMF;

    const equity = equityStocks + equityMF;
    const debt = debtMF + fd + rd + bonds + ppf + epf + lic + investPlans + govtSchemes;
    const cashTotal = cash + prepaidCards;
    const total = equity + debt + gold + cashTotal + nps;

    return {
      equity,
      debt,
      gold,
      cash: cashTotal,
      nps,
      total,
      equityPct: total ? (equity / total) * 100 : 0,
      debtPct: total ? ((debt + nps) / total) * 100 : 0,
      goldPct: total ? (gold / total) * 100 : 0,
      cashPct: total ? (cashTotal / total) * 100 : 0,
      breakdown: {
        equityStocks,
        equityMF,
        debtMF,
        fd,
        rd,
        bonds,
        ppf,
        nps,
        epf,
        lic,
        investPlans,
        govtSchemes,
        goldPhysical,
        goldMF,
        cash,
        prepaidCards,
      },
    };
  }, [state, marketData]);

  const suggestions = useMemo(() => {
    if (!allocation.total) return [];
    const items = [];
    const classes = [
      {
        name: "Equity",
        current: allocation.equityPct,
        target: target.equity,
        value: allocation.equity,
      },
      {
        name: "Debt",
        current: allocation.debtPct,
        target: target.debt,
        value: allocation.debt + allocation.nps,
      },
      {
        name: "Gold",
        current: allocation.goldPct,
        target: target.gold || 0,
        value: allocation.gold,
      },
      { name: "Cash", current: allocation.cashPct, target: target.cash, value: allocation.cash },
    ];

    classes.forEach((cls) => {
      const diff = cls.current - cls.target;
      const diffAmt = (Math.abs(diff) / 100) * allocation.total;
      if (Math.abs(diff) > driftThreshold) {
        items.push({
          asset: cls.name,
          action: diff > 0 ? "Reduce" : "Increase",
          diffPct: Math.abs(diff).toFixed(1),
          diffAmt,
          current: cls.current.toFixed(1),
          target: cls.target,
          overweight: diff > 0,
        });
      }
    });

    return items.sort((a, b) => b.diffAmt - a.diffAmt);
  }, [allocation, target, driftThreshold]);

  const deviationScore = useMemo(() => {
    if (!allocation.total) return 0;
    const d1 = Math.abs(allocation.equityPct - target.equity);
    const d2 = Math.abs(allocation.debtPct - target.debt);
    const d3 = Math.abs(allocation.goldPct - (target.gold || 0));
    const d4 = Math.abs(allocation.cashPct - target.cash);
    return Math.max(0, 100 - (d1 + d2 + d3 + d4));
  }, [allocation, target]);

  // "Deploy new money" — instead of selling overweight assets, spread a
  // fresh lump sum (bonus, maturity payout, new SIP) across the underweight
  // classes proportional to how far each is below target. If nothing is
  // underweight, split proportional to target weights so the money still
  // has somewhere sensible to go.
  const deploymentPlan = useMemo(() => {
    const amt = Number(newMoneyAmount) || 0;
    if (!amt || !allocation.total) return [];
    const newTotal = allocation.total + amt;
    const classes = [
      { name: "Equity", current: allocation.equity, target: target.equity },
      { name: "Debt", current: allocation.debt + allocation.nps, target: target.debt },
      { name: "Gold", current: allocation.gold, target: target.gold || 0 },
      { name: "Cash", current: allocation.cash, target: target.cash },
    ];
    const gaps = classes.map((c) => ({
      ...c,
      gap: Math.max(0, (c.target / 100) * newTotal - c.current),
    }));
    const totalGap = gaps.reduce((s, g) => s + g.gap, 0);
    const base = totalGap > 0 ? gaps.filter((g) => g.gap > 0) : classes.filter((c) => c.target > 0);
    const baseTotal =
      totalGap > 0 ? totalGap : base.reduce((s, c) => s + c.target, 0);
    if (!baseTotal) return [];
    return base
      .map((c) => ({
        name: c.name,
        amount: ((totalGap > 0 ? c.gap : c.target) / baseTotal) * amt,
      }))
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [newMoneyAmount, allocation, target]);

  // Count-up animation for the hero "Total Portfolio" figure.
  const animatedTotal = useAnimatedNumber(allocation.total);

  // Fixed chart-extension token (not the user-selectable accent) — Equity
  // already uses THEME.accent, so a hardcoded purple here would render as the
  // exact same color if the user's active theme happens to be "Violet".
  const CASH_COLOR = THEME.violet;

  const pieData = [
    { name: "Equity", value: allocation.equity, color: THEME.accent },
    { name: "Debt", value: allocation.debt + allocation.nps, color: THEME.sage },
    { name: "Gold", value: allocation.gold, color: THEME.gold },
    { name: "Cash", value: allocation.cash, color: CASH_COLOR },
  ].filter((d) => d.value > 0);

  const targetPieData = [
    { name: "Equity", value: target.equity, color: THEME.accent },
    { name: "Debt", value: target.debt, color: THEME.sage },
    { name: "Gold", value: target.gold || 0, color: THEME.gold },
    { name: "Cash", value: target.cash, color: CASH_COLOR },
  ].filter((d) => d.value > 0);

  const comparisonData = [
    { name: "Equity", Current: Number(allocation.equityPct.toFixed(1)), Target: target.equity },
    { name: "Debt", Current: Number(allocation.debtPct.toFixed(1)), Target: target.debt },
    { name: "Gold", Current: Number(allocation.goldPct.toFixed(1)), Target: target.gold || 0 },
    { name: "Cash", Current: Number(allocation.cashPct.toFixed(1)), Target: target.cash },
  ];

  if (!allocation.total) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <SectionTitle sub="Compare your allocation to target and get actionable suggestions">
          Smart Rebalancing
        </SectionTitle>
        <EmptyState
          icon={PieIcon}
          title="No Portfolio Data"
          description="Add investments to see rebalancing suggestions"
        />
      </div>
    );
  }

  const scoreColor =
    deviationScore > 80 ? THEME.sage : deviationScore > 50 ? THEME.gold : THEME.rust;

  const breakdownRowsAll = [
    { label: "Stocks (Direct Equity)", value: allocation.breakdown.equityStocks, parent: "Equity" },
    { label: "Equity Mutual Funds", value: allocation.breakdown.equityMF, parent: "Equity" },
    { label: "Debt Mutual Funds", value: allocation.breakdown.debtMF, parent: "Debt" },
    { label: "Fixed Deposits", value: allocation.breakdown.fd, parent: "Debt" },
    { label: "Recurring Deposits", value: allocation.breakdown.rd, parent: "Debt" },
    { label: "Bonds", value: allocation.breakdown.bonds, parent: "Debt" },
    { label: "PPF", value: allocation.breakdown.ppf, parent: "Debt" },
    { label: "EPF", value: allocation.breakdown.epf, parent: "Debt" },
    { label: "NPS", value: allocation.breakdown.nps, parent: "Debt" },
    { label: "Post Office / Govt Schemes", value: allocation.breakdown.govtSchemes, parent: "Debt" },
    {
      label: "LIC / Insurance",
      value: allocation.breakdown.lic + allocation.breakdown.investPlans,
      parent: "Debt",
    },
    { label: "Gold & SGBs (Physical)", value: allocation.breakdown.goldPhysical, parent: "Gold" },
    { label: "Gold / Silver Mutual Funds", value: allocation.breakdown.goldMF, parent: "Gold" },
    { label: "Bank Balance (Cash)", value: allocation.breakdown.cash, parent: "Cash" },
    { label: "Prepaid Cards", value: allocation.breakdown.prepaidCards, parent: "Cash" },
  ].filter((r) => r.value > 0);

  const breakdownSearchTrimmed = breakdownSearch.trim().toLowerCase();
  const breakdownRows = breakdownSearchTrimmed
    ? breakdownRowsAll.filter((r) =>
        `${r.label} ${r.parent}`.toLowerCase().includes(breakdownSearchTrimmed)
      )
    : breakdownRowsAll;

  const handleExportBreakdownCSV = () => {
    const rows = breakdownRows.map((r) => ({
      assetClass: r.label,
      category: r.parent,
      value: Math.round(r.value),
      percentOfPortfolio: allocation.total
        ? `${((r.value / allocation.total) * 100).toFixed(1)}%`
        : "0%",
    }));
    exportArrayToCSV(
      rows,
      [
        { key: "assetClass", label: "Asset Class" },
        { key: "category", label: "Category" },
        { key: "value", label: "Value" },
        { key: "percentOfPortfolio", label: "% of Portfolio" },
      ],
      `smart-rebalancing-breakdown_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle sub="Compare your allocation to target and get actionable suggestions">
        Smart Rebalancing
      </SectionTitle>

      {/* Alignment Score Bento Card */}
      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: `conic-gradient(${scoreColor} ${deviationScore * 3.6}deg, ${THEME.line} 0deg)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.03)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--surface-0)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: 20,
                color: scoreColor,
              }}
            >
              {Math.round(deviationScore)}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div
              style={{ fontWeight: 800, fontSize: 16, color: THEME.ink, letterSpacing: "-0.015em" }}
            >
              Portfolio Alignment Score
            </div>
            <div style={{ fontSize: 12.5, color: THEME.muted, marginTop: 4, fontWeight: 500 }}>
              {deviationScore > 80
                ? "Well aligned — minor adjustments only"
                : deviationScore > 50
                  ? "Moderate deviation — consider rebalancing"
                  : "Significant deviation — rebalancing recommended"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 11,
                color: THEME.muted,
                textTransform: "uppercase",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              Total Portfolio
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: THEME.ink,
                letterSpacing: "-0.03em",
                marginTop: 2,
              }}
            >
              <Money value={animatedTotal} variant="full" />
            </div>
          </div>
        </div>
      </Card>

      {/* Target Selection Card */}
      <Card style={{ padding: 24 }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: 15,
            marginBottom: 16,
            color: THEME.ink,
            display: "flex",
            alignItems: "center",
            gap: 8,
            letterSpacing: "-0.015em",
          }}
        >
          <Settings size={16} /> Target Allocation Profile
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          {Object.entries(PRESETS).map(([key, preset]) => {
            const active = !useCustom && selectedPreset === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setSelectedPreset(key);
                  setUseCustom(false);
                }}
                aria-pressed={active}
                className="card-lift"
                style={{
                  padding: "16px 18px",
                  borderRadius: 14,
                  textAlign: "left",
                  border: `1.5px solid ${active ? "var(--accent)" : THEME.line}`,
                  background: active
                    ? "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--accent) 8%, var(--surface-0)) 100%)"
                    : "var(--surface-0)",
                  cursor: "pointer",
                  boxShadow: active
                    ? "0 4px 15px color-mix(in srgb, var(--accent) 8%, transparent)"
                    : "var(--shadow-sm)",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 13.5,
                    color: active ? "var(--accent)" : THEME.ink,
                  }}
                >
                  {preset.label}
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 500, lineHeight: 1.3 }}>
                  {preset.desc}
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom target options switcher */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            borderTop: `1px solid ${THEME.line}`,
            paddingTop: 16,
          }}
        >
          <div>
            <button
              onClick={() => setUseCustom(!useCustom)}
              aria-pressed={useCustom}
              className="card-lift"
              style={{
                padding: "6px 14px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                border: `1.5px solid ${useCustom ? "var(--accent)" : THEME.line}`,
                background: useCustom
                  ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                  : "transparent",
                color: useCustom ? "var(--accent)" : THEME.ink,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              Custom Target Allocation
            </button>
          </div>
          {useCustom && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              {["equity", "debt", "gold", "cash"].map((k) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 10,
                    background: "var(--surface-0)",
                    border: `1px solid ${THEME.line}`,
                  }}
                >
                  <label
                    htmlFor={`custom-target-${k}`}
                    style={{
                      fontSize: 11.5,
                      color: THEME.muted,
                      fontWeight: 700,
                      textTransform: "capitalize",
                    }}
                  >
                    {k}
                  </label>
                  <input
                    id={`custom-target-${k}`}
                    type="number"
                    min={0}
                    max={100}
                    value={customTarget[k]}
                    onChange={(e) =>
                      setCustomTarget((p) => ({ ...p, [k]: Number(e.target.value) }))
                    }
                    style={{
                      width: 50,
                      padding: "4px 6px",
                      borderRadius: 6,
                      border: `1px solid ${THEME.line}`,
                      background: "transparent",
                      color: THEME.ink,
                      fontSize: 13,
                      fontWeight: 700,
                      textAlign: "center",
                      outline: "none",
                    }}
                  />
                  <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>%</span>
                </div>
              ))}
            </div>
          )}
          {customTargetInvalid && (
            <div className="info-box info-box-error animate-slide-down">
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontWeight: 600 }}>
                Targets sum to {customTargetSum.toFixed(1)}% — should total 100%.
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Comparison Charts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {/* Current Donut */}
        <Card style={{ padding: "24px 16px" }}>
          <div style={{ padding: "0 8px", textAlign: "center" }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 13.5,
                marginBottom: 12,
                color: THEME.ink,
                letterSpacing: "-0.01em",
              }}
            >
              Current Allocation
            </div>
            <div style={{ width: "100%", height: 180, position: "relative" }}>
              <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={50}
                    paddingAngle={3}
                    stroke="none"
                    onMouseEnter={(_, idx) => setActiveCurrentIndex(idx)}
                    onMouseLeave={() => setActiveCurrentIndex(null)}
                  >
                    {pieData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.color}
                        style={{
                          filter:
                            activeCurrentIndex === i
                              ? "drop-shadow(0 4px 10px rgba(0,0,0,0.15))"
                              : "none",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  {activeCurrentIndex !== null && pieData[activeCurrentIndex] ? (
                    <>
                      <text
                        x="50%"
                        y="46%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 9.5,
                          fill: THEME.muted,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        {pieData[activeCurrentIndex].name}
                      </text>
                      <text
                        x="50%"
                        y="56%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 13,
                          fill: THEME.ink,
                          fontWeight: 900,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {privacyMode
                          ? "••••"
                          : `₹${pieData[activeCurrentIndex].value.toLocaleString("en-IN", {
                              maximumFractionDigits: 0,
                            })}`}
                      </text>
                    </>
                  ) : (
                    <>
                      <text
                        x="50%"
                        y="46%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 9.5,
                          fill: THEME.muted,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        Portfolio
                      </text>
                      <text
                        x="50%"
                        y="56%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 13,
                          fill: THEME.ink,
                          fontWeight: 900,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {privacyMode
                          ? "••••"
                          : `₹${allocation.total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
                      </text>
                    </>
                  )}
                </PieChart>
              </ResponsiveContainer></div>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 10,
                marginTop: 12,
              }}
            >
              {pieData.map((d) => (
                <div
                  key={d.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    color: THEME.muted,
                    fontWeight: 600,
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                  {d.name} {allocation.total ? ((d.value / allocation.total) * 100).toFixed(0) : 0}%
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Comparison Bar */}
        <Card style={{ padding: "24px 16px" }}>
          <div style={{ padding: "0 8px", textAlign: "center" }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 13.5,
                marginBottom: 12,
                color: THEME.ink,
                letterSpacing: "-0.01em",
              }}
            >
              Current vs Target
            </div>
            <div style={{ width: "100%", height: 180 }}>
              <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    unit="%"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(v) => `${v}%`}
                    content={<ChartTooltip formatter={(v) => `${v}%`} />}
                    cursor={{ fill: THEME.line, opacity: 0.4 }}
                  />
                  <Bar dataKey="Current" fill={THEME.accent} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Target" fill={THEME.sage} radius={[6, 6, 0, 0]} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                    formatter={(value: string) => (
                      <span style={{ color: THEME.ink, fontWeight: 600 }}>{value}</span>
                    )}
                  />
                </BarChart>
              </ResponsiveContainer></div>
            </div>
          </div>
        </Card>

        {/* Target Donut */}
        <Card style={{ padding: "24px 16px" }}>
          <div style={{ padding: "0 8px", textAlign: "center" }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 13.5,
                marginBottom: 12,
                color: THEME.ink,
                letterSpacing: "-0.01em",
              }}
            >
              Target Allocation
            </div>
            <div style={{ width: "100%", height: 180, position: "relative" }}>
              <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={targetPieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={50}
                    paddingAngle={3}
                    stroke="none"
                    onMouseEnter={(_, idx) => setActiveTargetIndex(idx)}
                    onMouseLeave={() => setActiveTargetIndex(null)}
                  >
                    {targetPieData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.color}
                        style={{
                          filter:
                            activeTargetIndex === i
                              ? "drop-shadow(0 4px 10px rgba(0,0,0,0.15))"
                              : "none",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip formatter={(v) => `${v}%`} />} />
                  {activeTargetIndex !== null && targetPieData[activeTargetIndex] ? (
                    <>
                      <text
                        x="50%"
                        y="46%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 9.5,
                          fill: THEME.muted,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        {targetPieData[activeTargetIndex].name}
                      </text>
                      <text
                        x="50%"
                        y="56%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 13,
                          fill: THEME.ink,
                          fontWeight: 900,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {targetPieData[activeTargetIndex].value}%
                      </text>
                    </>
                  ) : (
                    <>
                      <text
                        x="50%"
                        y="46%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 9.5,
                          fill: THEME.muted,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        Target
                      </text>
                      <text
                        x="50%"
                        y="56%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 13,
                          fill: THEME.ink,
                          fontWeight: 900,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {/* Sums the actual target slices rather than assuming 100 — an
                            invalid custom target (flagged above) can total something else. */}
                        {targetPieData.reduce((s, d) => s + d.value, 0).toFixed(0)}%
                      </text>
                    </>
                  )}
                </PieChart>
              </ResponsiveContainer></div>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 10,
                marginTop: 12,
              }}
            >
              {targetPieData.map((d) => (
                <div
                  key={d.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    color: THEME.muted,
                    fontWeight: 600,
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                  {d.name} {d.value}%
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Rebalancing Actions Suggestions */}
      <Card style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 15,
              color: THEME.ink,
              display: "flex",
              alignItems: "center",
              gap: 8,
              letterSpacing: "-0.015em",
            }}
          >
            <Zap size={16} style={{ color: THEME.gold }} /> Actionable Suggestions
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label
              htmlFor="drift-threshold"
              style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}
            >
              Flag drift over
            </label>
            <select
              id="drift-threshold"
              value={driftThreshold}
              onChange={(e) => setDriftThreshold(Number(e.target.value))}
              style={{
                padding: "5px 8px",
                borderRadius: 8,
                border: `1px solid ${THEME.line}`,
                background: "var(--surface-0)",
                color: THEME.ink,
                fontSize: 12,
                fontWeight: 700,
                outline: "none",
              }}
            >
              <option value={2}>2%</option>
              <option value={3}>3%</option>
              <option value={5}>5%</option>
              <option value={10}>10%</option>
            </select>
          </div>
        </div>
        {suggestions.length === 0 ? (
          <div className="info-box info-box-success">
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>
              Your portfolio is perfectly aligned! No rebalancing suggestions required.
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {suggestions.map((s, i) => (
              <div
                key={i}
                className="card-lift"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "16px 20px",
                  borderRadius: 14,
                  background: "var(--surface-0)",
                  border: `1.5px solid ${THEME.line}`,
                  borderLeft: `5px solid ${s.overweight ? THEME.rust : THEME.sage}`,
                  boxShadow: "var(--shadow-sm)",
                  transition: "all 0.25s ease",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: s.overweight
                      ? `color-mix(in srgb, ${THEME.rust} 9%, transparent)`
                      : `color-mix(in srgb, ${THEME.sage} 9%, transparent)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {s.overweight ? (
                    <ArrowRight
                      size={16}
                      style={{ color: THEME.rust, transform: "rotate(-45deg)" }}
                    />
                  ) : (
                    <ArrowRight
                      size={16}
                      style={{ color: THEME.sage, transform: "rotate(45deg)" }}
                    />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 13.5, color: THEME.ink }}>
                    {s.action} {s.asset} by {s.diffPct}%
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2, fontWeight: 500 }}>
                    Current: {s.current}% &rarr; Target: {s.target}%
                  </div>
                </div>
                <div
                  style={{
                    textAlign: "right",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: 14,
                      color: s.overweight ? THEME.rust : THEME.sage,
                    }}
                  >
                    <Money value={s.diffAmt} variant="full" />
                  </div>
                  <Badge
                    variant={s.overweight ? "rust" : "sage"}
                    style={{ fontSize: 9.5, padding: "2px 6px" }}
                  >
                    {s.overweight ? "Overweight" : "Underweight"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Deploy New Money — additive rebalancing, no selling required */}
      <Card style={{ padding: 24 }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: 15,
            marginBottom: 4,
            color: THEME.ink,
            display: "flex",
            alignItems: "center",
            gap: 8,
            letterSpacing: "-0.015em",
          }}
        >
          <Wallet size={16} style={{ color: THEME.sage }} /> Deploy New Money
        </div>
        <div style={{ fontSize: 11.5, color: THEME.muted, marginBottom: 16, fontWeight: 500 }}>
          Got a bonus, maturity payout, or fresh SIP amount? See how to split it to move toward
          target without selling anything.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, color: THEME.muted, fontWeight: 700 }}>₹</span>
            <input
              type="number"
              min={0}
              inputMode="decimal"
              aria-label="Amount to deploy"
              placeholder="e.g. 100000"
              value={newMoneyAmount}
              onChange={(e) => setNewMoneyAmount(e.target.value)}
              style={{
                width: 160,
                padding: "8px 12px",
                borderRadius: 10,
                border: `1.5px solid ${THEME.line}`,
                background: "var(--surface-0)",
                color: THEME.ink,
                fontSize: 13,
                fontWeight: 700,
                outline: "none",
              }}
            />
          </div>
        </div>
        {Number(newMoneyAmount) > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
            {deploymentPlan.map((d) => (
              <div
                key={d.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: "color-mix(in srgb, var(--t-sage) 6%, var(--surface-0))",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>{d.name}</span>
                <span style={{ fontSize: 13.5, fontWeight: 900, color: THEME.sage }}>
                  <Money value={d.amount} variant="full" />
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Detailed Breakdown Table */}
      <Card style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                color: THEME.ink,
                letterSpacing: "-0.015em",
              }}
            >
              Detailed Breakdown
            </h3>
            <div style={{ fontSize: 11, color: THEME.muted }}>
              Individual asset components and their portfolio shares
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", position: "relative", alignItems: "center" }}>
              <Search
                size={14}
                color={THEME.muted}
                style={{ position: "absolute", left: 12, pointerEvents: "none" }}
              />
              <input
                type="text"
                aria-label="Search breakdown"
                placeholder="Search..."
                value={breakdownSearch}
                onChange={(e) => setBreakdownSearch(e.target.value)}
                style={{
                  width: 160,
                  padding: `7px ${breakdownSearch ? 30 : 10}px 7px 32px`,
                  borderRadius: 10,
                  border: `1.5px solid ${THEME.line}`,
                  background: "var(--surface-0)",
                  color: THEME.ink,
                  fontSize: 12.5,
                }}
              />
              {breakdownSearch && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setBreakdownSearch("")}
                  style={{
                    position: "absolute",
                    right: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: "none",
                    background: "var(--surface-2)",
                    color: THEME.muted,
                    cursor: "pointer",
                  }}
                >
                  <X size={10} />
                </button>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download size={13} />}
              onClick={handleExportBreakdownCSV}
              disabled={!breakdownRows.length}
            >
              CSV
            </Button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...th, paddingLeft: 16 }}>Asset Class</th>
                <th style={thRight}>Value</th>
                <th style={{ ...thRight, paddingRight: 16 }}>% of Portfolio</th>
              </tr>
            </thead>
            <tbody>
              {breakdownRows.map((row, i) => (
                <tr
                  key={i}
                  className="table-row-hover"
                  style={{ borderBottom: `1px solid ${THEME.line}` }}
                >
                  <td style={{ ...td, paddingLeft: 16, color: THEME.ink, fontWeight: 700 }}>
                    {row.label}
                    <Badge
                      variant="muted"
                      style={{ marginLeft: 8, fontSize: 10, padding: "2px 6px" }}
                    >
                      {row.parent}
                    </Badge>
                  </td>
                  <td style={{ ...tdRight, fontWeight: 700 }}>
                    <Money value={row.value} variant="full" />
                  </td>
                  <td style={{ ...tdRight, paddingRight: 16, color: THEME.muted, fontWeight: 600 }}>
                    {allocation.total ? ((row.value / allocation.total) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
              {!breakdownRows.length && (
                <tr>
                  <td colSpan={3} style={{ ...td, textAlign: "center", color: THEME.muted }}>
                    No holdings match "{breakdownSearch}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Disclaimer */}
      <div
        style={{
          padding: "14px 18px",
          borderRadius: 14,
          background: "color-mix(in srgb, var(--accent) 5%, var(--surface-0))",
          border: `1.5px solid ${THEME.line}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 12,
            color: THEME.muted,
            lineHeight: 1.4,
            fontWeight: 500,
          }}
        >
          <Info size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <span>
            Rebalancing suggestions are indicative. Consult your financial advisor before making
            investment decisions. Tax implications of selling should be considered.
          </span>
        </div>
      </div>
    </div>
  );
};
