/* eslint-disable */
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  PieChart as PieIcon,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Zap,
  Info,
  Search,
  X,
  Download,
  Wallet,
  Copy,
  Check,
  Sliders,
  SlidersHorizontal,
  ShieldCheck,
  Layers,
  Flame,
  RefreshCw,
  Sparkles,
  Lock,
  Unlock,
  Coins,
  Scale,
  Calendar,
  HelpCircle,
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
  ReferenceLine,
} from "recharts";
import { THEME, ASSET_CLASS_COLORS } from "../../utils/constants";
import {
  fmtINR,
  fmtINRFull,
  fmtINRExact,
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

/* ─── TABLE STYLING ───────────────────────────────────────────────────────── */
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

/* ─── CUSTOM CHART TOOLTIP ─────────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null;
  const visible = payload.filter((p: any) => p.value !== 0 && p.value != null);
  if (!visible.length) return null;
  return (
    <div
      style={{
        background: "color-mix(in srgb, var(--surface-0) 90%, transparent)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: `1.5px solid ${THEME.line}`,
        borderRadius: 12,
        padding: "10px 14px",
        boxShadow: "0 10px 32px rgba(0, 0, 0, 0.12)",
        fontSize: 12,
      }}
    >
      {visible.map((p: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 0" }}>
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

/* ─── PRESETS ─────────────────────────────────────────────────────────────── */
interface AllocationTarget {
  equity: number;
  debt: number;
  gold: number;
  cash: number;
  label?: string;
  desc?: string;
  tag?: string;
}

const PRESETS: Record<string, AllocationTarget> = {
  aggressive: {
    label: "Aggressive Growth (80/15/0/5)",
    equity: 80,
    debt: 15,
    gold: 0,
    cash: 5,
    desc: "Maximizes compounding for high risk tolerance & long horizons (>7-10 yrs).",
    tag: "High Growth",
  },
  moderate: {
    label: "Balanced Growth (60/30/5/5)",
    equity: 60,
    debt: 30,
    gold: 5,
    cash: 5,
    desc: "Classic all-round portfolio balancing market growth with debt stability and gold hedge.",
    tag: "Most Popular",
  },
  conservative: {
    label: "Conservative (40/45/10/5)",
    equity: 40,
    debt: 45,
    gold: 10,
    cash: 5,
    desc: "Capital preservation with inflation protection. Ideal for near-term major milestones.",
    tag: "Capital Guard",
  },
  retirement: {
    label: "Retirement / Passive (25/55/10/10)",
    equity: 25,
    debt: 55,
    gold: 10,
    cash: 10,
    desc: "Income stability and low volatility to sustain systematic drawdowns (SWP).",
    tag: "Income Focus",
  },
  allWeather: {
    label: "All-Weather Ray Dalio (30/55/10/5)",
    equity: 30,
    debt: 55,
    gold: 10,
    cash: 5,
    desc: "Engineered to weather economic growth, recessions, inflation, and deflations smoothly.",
    tag: "Low Volatility",
  },
};

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

interface RebalancingTabProps {
  state: any;
  metrics?: any;
  marketData?: any;
}

export const RebalancingTab: React.FC<RebalancingTabProps> = ({ state, metrics, marketData }) => {
  const { privacyMode } = usePrivacy();
  const [savedPrefs] = useState(loadRebalPrefs);

  const [selectedPreset, setSelectedPreset] = useState(
    PRESETS[savedPrefs.selectedPreset] ? savedPrefs.selectedPreset : "moderate"
  );
  const [customTarget, setCustomTarget] = useState<AllocationTarget>(
    savedPrefs.customTarget || { equity: 60, debt: 30, gold: 5, cash: 5 }
  );
  const [useCustom, setUseCustom] = useState(!!savedPrefs.useCustom);
  const [driftThreshold, setDriftThreshold] = useState(savedPrefs.driftThreshold ?? 3);

  // Strategy Mode: "direct" | "newMoney" | "sip"
  const [strategyMode, setStrategyMode] = useState<"direct" | "newMoney" | "sip">("direct");
  const [newMoneyAmount, setNewMoneyAmount] = useState<string>("100000");
  const [monthlySipAmount, setMonthlySipAmount] = useState<string>("25000");

  // Search & Filter
  const [breakdownSearch, setBreakdownSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "Equity" | "Debt" | "Gold" | "Cash">("all");

  // Chart hover states
  const [activeCurrentIndex, setActiveCurrentIndex] = useState<number | null>(null);
  const [activeTargetIndex, setActiveTargetIndex] = useState<number | null>(null);

  // Copy feedback state
  const [copiedPlan, setCopiedPlan] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(
        REBAL_PREFS_KEY,
        JSON.stringify({ selectedPreset, customTarget, useCustom, driftThreshold })
      );
    } catch {
      // Ignore private mode / quota restrictions
    }
  }, [selectedPreset, customTarget, useCustom, driftThreshold]);

  const target = useCustom ? customTarget : PRESETS[selectedPreset] || PRESETS.moderate;

  const customTargetSum =
    Number(customTarget.equity || 0) +
    Number(customTarget.debt || 0) +
    Number(customTarget.gold || 0) +
    Number(customTarget.cash || 0);
  const customTargetInvalid = useCustom && Math.abs(customTargetSum - 100) > 0.5;

  // Auto-normalize custom target to exactly 100%
  const handleNormalizeCustomTarget = useCallback(() => {
    if (customTargetSum <= 0) {
      setCustomTarget({ equity: 60, debt: 30, gold: 5, cash: 5 });
      return;
    }
    const factor = 100 / customTargetSum;
    const eq = Math.round(Number(customTarget.equity || 0) * factor);
    const db = Math.round(Number(customTarget.debt || 0) * factor);
    const gd = Math.round(Number(customTarget.gold || 0) * factor);
    const cs = Math.max(0, 100 - (eq + db + gd));
    setCustomTarget({ equity: eq, debt: db, gold: gd, cash: cs });
  }, [customTarget, customTargetSum]);

  // ── Compute Comprehensive Portfolio Allocation ──
  const allocation = useMemo(() => {
    // 1. Direct Equity Stocks
    const equityStocks = (state.stocks || []).reduce((s: number, st: any) => {
      const price = (() => {
        if (marketData) {
          const sym = `${(st.symbol || "").replace(/\.(NS|BO)$/i, "")}.${
            (st.exchange || "NSE") === "BSE" ? "BO" : "NS"
          }`;
          return marketData[sym]?.price || Number(st.currentPrice) || Number(st.avgPrice) || 0;
        }
        return Number(st.currentPrice) || Number(st.avgPrice) || 0;
      })();
      return s + (Number(st.qty) || 0) * price;
    }, 0);

    // 2. Mutual Funds (categorized by type/strategy)
    let equityMF = 0;
    let debtMF = 0;
    let goldMF = 0;
    (state.mutualFunds || []).forEach((m: any) => {
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
        equityMF += val * 0.65;
        debtMF += val * 0.35;
      } else if (isDebt) {
        debtMF += val;
      } else {
        equityMF += val;
      }
    });

    // 3. Fixed & Recurring Deposits
    const fd = (state.fixedDeposits || []).reduce((s: number, f: any) => s + Number(f.principal || 0), 0);
    const rd = (state.recurringDeposits || []).reduce((s: number, r: any) => {
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

    // 4. Bonds & Debentures
    const bonds = (state.bonds || []).reduce(
      (s: number, b: any) =>
        s +
        Number(
          b.totalInvestmentAmount ||
            b.totalPrincipalAmount ||
            b.faceValue ||
            Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0) ||
            0
        ),
      0
    );

    // 5. Retirement & Long-Term Locked Instruments
    const ppf = (state.ppf || []).reduce((s: number, p: any) => s + Number(p.balance || 0), 0);
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
    const epf = (state.epf || []).reduce((s: number, e: any) => s + calculateEpfBalance(e), 0);
    const govtSchemes = (state.govtSchemes || []).reduce(
      (s: number, sc: any) => s + Number(sc.currentBalance || 0),
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

    // 6. Gold & Precious Metals
    const goldPricePerGram = getGoldPricePerGram(state);
    const goldPhysical = (state.goldHoldings || []).reduce((s: number, g: any) => {
      const grams = Number(g.grams || 0);
      const purityMul = g.type === "physical" ? GOLD_PURITY_FACTOR[g.purity] || 1 : 1;
      return s + grams * goldPricePerGram * purityMul;
    }, 0);
    const gold = goldPhysical + goldMF;

    // 7. Cash & Liquid Equivalents
    const cash = (state.bankAccounts || []).reduce((s: number, a: any) => s + Number(a.balance || 0), 0);
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

    const debt = debtMF + fd + rd + bonds + ppf + epf + govtSchemes + lic + investPlans;
    const equity = equityStocks + equityMF;
    const total = equity + debt + gold + cash + prepaidCards + nps;

    // Liquid vs Locked Capital analysis
    const liquidEquity = equityStocks + equityMF;
    const liquidDebt = debtMF + cash + fd;
    const lockedDebt = ppf + epf + nps + govtSchemes + lic + investPlans + rd + bonds;
    const liquidGold = goldPhysical + goldMF;
    const liquidCash = cash + prepaidCards;

    const totalLiquid = liquidEquity + liquidDebt + liquidGold + liquidCash;
    const totalLocked = lockedDebt;

    const equityPct = total ? (equity / total) * 100 : 0;
    const debtPct = total ? ((debt + nps) / total) * 100 : 0;
    const goldPct = total ? (gold / total) * 100 : 0;
    const cashPct = total ? ((cash + prepaidCards) / total) * 100 : 0;

    return {
      total,
      equity,
      debt: debt + nps,
      gold,
      cash: cash + prepaidCards,
      equityPct,
      debtPct,
      goldPct,
      cashPct,
      nps,
      totalLiquid,
      totalLocked,
      liquidRatio: total ? (totalLiquid / total) * 100 : 0,
      breakdown: {
        equityStocks,
        equityMF,
        debtMF,
        fd,
        rd,
        bonds,
        ppf,
        epf,
        nps,
        govtSchemes,
        lic,
        investPlans,
        goldPhysical,
        goldMF,
        cash,
        prepaidCards,
      },
    };
  }, [state, marketData]);

  // Animated Total for Count-up
  const animatedTotal = useAnimatedNumber(allocation.total);

  // ── Suggestions Engine with Drift & Liquidity Intelligence ──
  const { suggestions, maxDrift, totalDriftAmt, deviationScore } = useMemo(() => {
    if (!allocation.total) {
      return { suggestions: [], maxDrift: 0, totalDriftAmt: 0, deviationScore: 100 };
    }

    const classes = [
      {
        name: "Equity",
        current: allocation.equityPct,
        target: target.equity,
        value: allocation.equity,
        color: ASSET_CLASS_COLORS.Equity,
        isLiquid: true,
        sellInstrumentHint: "Direct Stocks or Open-ended Equity MFs",
        buyInstrumentHint: "Broad Market Index Funds / ETFs",
        taxNote: "Equity LTCG @ 12.5% (above ₹1.25L/yr exemption), STCG @ 20%",
      },
      {
        name: "Debt",
        current: allocation.debtPct,
        target: target.debt,
        value: allocation.debt,
        color: ASSET_CLASS_COLORS.Debt,
        isLiquid: false, // Contains locked EPF/PPF/NPS
        sellInstrumentHint: "Liquid/Arbitrage/Short-Duration MFs (PPF/EPF are locked)",
        buyInstrumentHint: "Short Duration Debt Funds, Corporate Bonds, FDs",
        taxNote: "Debt MFs taxed at marginal income slab rate",
      },
      {
        name: "Gold",
        current: allocation.goldPct,
        target: target.gold || 0,
        value: allocation.gold,
        color: ASSET_CLASS_COLORS.Gold,
        isLiquid: true,
        sellInstrumentHint: "Gold ETFs or Gold Mutual Funds",
        buyInstrumentHint: "Sovereign Gold Bonds (SGBs) or Gold ETFs",
        taxNote: "Physical/ETF Gold LTCG @ 12.5% with no indexation",
      },
      {
        name: "Cash",
        current: allocation.cashPct,
        target: target.cash,
        value: allocation.cash,
        color: ASSET_CLASS_COLORS.Cash,
        isLiquid: true,
        sellInstrumentHint: "Deploy into underweight assets",
        buyInstrumentHint: "High-yield Savings Account / Liquid Funds",
        taxNote: "Bank interest taxed under Other Sources (Sec 80TTA/80TTB)",
      },
    ];

    let maxD = 0;
    let sumDrift = 0;
    const items: any[] = [];

    classes.forEach((cls) => {
      const diff = cls.current - cls.target;
      const absDiff = Math.abs(diff);
      const diffAmt = (absDiff / 100) * allocation.total;
      const inTolerance = absDiff <= driftThreshold;

      if (absDiff > maxD) maxD = absDiff;
      if (!inTolerance) {
        sumDrift += diffAmt;
      }

      items.push({
        asset: cls.name,
        action: diff > 0 ? "Reduce" : "Increase",
        actionVerb: diff > 0 ? "Sell / Trim" : "Buy / Add",
        diffPct: absDiff.toFixed(1),
        rawDiffPct: diff,
        diffAmt,
        current: cls.current.toFixed(1),
        currentPct: cls.current.toFixed(1),
        target: cls.target,
        targetPct: cls.target,
        currentValue: cls.value,
        targetValue: (cls.target / 100) * allocation.total,
        overweight: diff > 0,
        inTolerance,
        color: cls.color,
        sellInstrumentHint: cls.sellInstrumentHint,
        buyInstrumentHint: cls.buyInstrumentHint,
        taxNote: cls.taxNote,
      });
    });

    const d1 = Math.abs(allocation.equityPct - target.equity);
    const d2 = Math.abs(allocation.debtPct - target.debt);
    const d3 = Math.abs(allocation.goldPct - (target.gold || 0));
    const d4 = Math.abs(allocation.cashPct - target.cash);
    const totalVariance = d1 + d2 + d3 + d4;
    const score = Math.max(0, Math.min(100, 100 - totalVariance));

    return {
      suggestions: items.sort((a, b) => b.diffAmt - a.diffAmt),
      maxDrift: maxD,
      totalDriftAmt: sumDrift / 2, // Divided by 2 because selling X means buying X
      deviationScore: score,
    };
  }, [allocation, target, driftThreshold]);

  // ── Multi-Strategy 2: Smart Cash Inflow Calculator ──
  const deploymentPlan = useMemo(() => {
    const amt = Number(newMoneyAmount) || 0;
    if (!amt || !allocation.total) return [];
    const newTotal = allocation.total + amt;
    const classes = [
      { name: "Equity", current: allocation.equity, target: target.equity, color: ASSET_CLASS_COLORS.Equity },
      { name: "Debt", current: allocation.debt, target: target.debt, color: ASSET_CLASS_COLORS.Debt },
      { name: "Gold", current: allocation.gold, target: target.gold || 0, color: ASSET_CLASS_COLORS.Gold },
      { name: "Cash", current: allocation.cash, target: target.cash, color: ASSET_CLASS_COLORS.Cash },
    ];
    const gaps = classes.map((c) => ({
      ...c,
      targetAmount: (c.target / 100) * newTotal,
      gap: Math.max(0, (c.target / 100) * newTotal - c.current),
    }));
    const totalGap = gaps.reduce((s: number, g: any) => s + g.gap, 0);
    const base = totalGap > 0 ? gaps.filter((g) => g.gap > 0) : gaps.filter((c) => c.target > 0);
    const baseTotal =
      totalGap > 0 ? totalGap : base.reduce((s: number, c: any) => s + c.target, 0);

    if (!baseTotal) return [];
    return base
      .map((c) => {
        const allocated = ((totalGap > 0 ? c.gap : c.target) / baseTotal) * amt;
        const newAmt = c.current + allocated;
        const postPct = (newAmt / newTotal) * 100;
        return {
          name: c.name,
          color: c.color,
          amount: allocated,
          current: c.current,
          postAmount: newAmt,
          postPct: postPct.toFixed(1),
          targetPct: c.target,
          pctOfInflow: ((allocated / amt) * 100).toFixed(0),
        };
      })
      .filter((c) => c.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [newMoneyAmount, allocation, target]);

  // ── Multi-Strategy 3: Systematic SIP Rebalancer ──
  const sipPlan = useMemo(() => {
    const sip = Number(monthlySipAmount) || 0;
    if (!sip || !allocation.total) return [];

    const underweight = suggestions.filter((s) => !s.overweight && !s.inTolerance);
    if (!underweight.length) {
      return [
        { name: "Equity", sharePct: target.equity, amount: (target.equity / 100) * sip, color: ASSET_CLASS_COLORS.Equity },
        { name: "Debt", sharePct: target.debt, amount: (target.debt / 100) * sip, color: ASSET_CLASS_COLORS.Debt },
        { name: "Gold", sharePct: target.gold || 0, amount: ((target.gold || 0) / 100) * sip, color: ASSET_CLASS_COLORS.Gold },
        { name: "Cash", sharePct: target.cash, amount: (target.cash / 100) * sip, color: ASSET_CLASS_COLORS.Cash },
      ].filter((p) => p.amount > 0);
    }

    const totalUnderweightAmt = underweight.reduce((s, u) => s + u.diffAmt, 0);
    return underweight.map((u) => {
      const share = u.diffAmt / totalUnderweightAmt;
      const monthlyAlloc = share * sip;
      const monthsToRebalance = Math.ceil(u.diffAmt / (monthlyAlloc || 1));
      return {
        name: u.asset,
        color: u.color,
        amount: monthlyAlloc,
        sharePct: Math.round(share * 100),
        monthsToRebalance,
        currentPct: u.currentPct,
        targetPct: u.targetPct,
      };
    });
  }, [monthlySipAmount, suggestions, allocation, target]);

  // ── Chart Data Preparations ──
  const pieData = useMemo(() => {
    return [
      { name: "Equity", value: allocation.equity, color: ASSET_CLASS_COLORS.Equity },
      { name: "Debt", value: allocation.debt, color: ASSET_CLASS_COLORS.Debt },
      { name: "Gold", value: allocation.gold, color: ASSET_CLASS_COLORS.Gold },
      { name: "Cash", value: allocation.cash, color: ASSET_CLASS_COLORS.Cash },
    ].filter((d) => d.value > 0);
  }, [allocation]);

  const targetPieData = useMemo(() => {
    return [
      { name: "Equity", value: target.equity, color: ASSET_CLASS_COLORS.Equity },
      { name: "Debt", value: target.debt, color: ASSET_CLASS_COLORS.Debt },
      { name: "Gold", value: target.gold || 0, color: ASSET_CLASS_COLORS.Gold },
      { name: "Cash", value: target.cash, color: ASSET_CLASS_COLORS.Cash },
    ].filter((d) => d.value > 0);
  }, [target]);

  const comparisonData = useMemo(() => {
    return [
      {
        name: "Equity",
        Current: Number(allocation.equityPct.toFixed(1)),
        Target: target.equity,
        Diff: Number((allocation.equityPct - target.equity).toFixed(1)),
      },
      {
        name: "Debt",
        Current: Number(allocation.debtPct.toFixed(1)),
        Target: target.debt,
        Diff: Number((allocation.debtPct - target.debt).toFixed(1)),
      },
      {
        name: "Gold",
        Current: Number(allocation.goldPct.toFixed(1)),
        Target: target.gold || 0,
        Diff: Number((allocation.goldPct - (target.gold || 0)).toFixed(1)),
      },
      {
        name: "Cash",
        Current: Number(allocation.cashPct.toFixed(1)),
        Target: target.cash,
        Diff: Number((allocation.cashPct - target.cash).toFixed(1)),
      },
    ];
  }, [allocation, target]);

  // ── Asset Breakdown Rows ──
  const breakdownRowsAll = useMemo(() => {
    const list = [
      { label: "Stocks (Direct Equity)", value: allocation.breakdown.equityStocks, parent: "Equity", liquid: true },
      { label: "Equity Mutual Funds", value: allocation.breakdown.equityMF, parent: "Equity", liquid: true },
      { label: "Debt Mutual Funds", value: allocation.breakdown.debtMF, parent: "Debt", liquid: true },
      { label: "Fixed Deposits (FD)", value: allocation.breakdown.fd, parent: "Debt", liquid: true },
      { label: "Recurring Deposits (RD)", value: allocation.breakdown.rd, parent: "Debt", liquid: false },
      { label: "Bonds & NCDs", value: allocation.breakdown.bonds, parent: "Debt", liquid: true },
      { label: "Public Provident Fund (PPF)", value: allocation.breakdown.ppf, parent: "Debt", liquid: false },
      { label: "Employees' Provident Fund (EPF)", value: allocation.breakdown.epf, parent: "Debt", liquid: false },
      { label: "National Pension System (NPS)", value: allocation.breakdown.nps, parent: "Debt", liquid: false },
      { label: "Post Office & Govt Schemes", value: allocation.breakdown.govtSchemes, parent: "Debt", liquid: false },
      {
        label: "LIC & Traditional Insurance Plans",
        value: allocation.breakdown.lic + allocation.breakdown.investPlans,
        parent: "Debt",
        liquid: false,
      },
      { label: "Physical Gold & SGBs", value: allocation.breakdown.goldPhysical, parent: "Gold", liquid: true },
      { label: "Gold / Silver Mutual Funds", value: allocation.breakdown.goldMF, parent: "Gold", liquid: true },
      { label: "Bank Savings Account", value: allocation.breakdown.cash, parent: "Cash", liquid: true },
      { label: "Prepaid Cards & Wallets", value: allocation.breakdown.prepaidCards, parent: "Cash", liquid: true },
    ].filter((r) => r.value > 0);

    return list;
  }, [allocation]);

  const filteredBreakdownRows = useMemo(() => {
    let rows = breakdownRowsAll;
    if (categoryFilter !== "all") {
      rows = rows.filter((r) => r.parent === categoryFilter);
    }
    const q = breakdownSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => `${r.label} ${r.parent}`.toLowerCase().includes(q));
    }
    return rows;
  }, [breakdownRowsAll, categoryFilter, breakdownSearch]);

  const handleExportBreakdownCSV = () => {
    const rows = filteredBreakdownRows.map((r) => ({
      assetClass: r.label,
      category: r.parent,
      liquidity: r.liquid ? "Liquid / Tradable" : "Locked / Long-term",
      value: Math.round(r.value),
      percentOfPortfolio: allocation.total
        ? `${((r.value / allocation.total) * 100).toFixed(1)}%`
        : "0%",
    }));
    exportArrayToCSV(
      rows,
      [
        { key: "assetClass", label: "Asset Class / Sub-Instrument" },
        { key: "category", label: "Primary Category" },
        { key: "liquidity", label: "Liquidity Status" },
        { key: "value", label: "Current Value (₹)" },
        { key: "percentOfPortfolio", label: "% of Total Portfolio" },
      ],
      `smart-rebalancing-breakdown_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const handleCopyPlan = () => {
    const lines = [
      `SMART REBALANCING PLAN - ${new Date().toLocaleDateString()}`,
      `Portfolio Value: ₹${Math.round(allocation.total).toLocaleString("en-IN")}`,
      `Alignment Score: ${Math.round(deviationScore)}/100`,
      `Target Profile: ${useCustom ? "Custom Allocation" : target.label || selectedPreset}`,
      `----------------------------------------------------`,
      `ACTIONABLE STEPS:`,
    ];

    if (strategyMode === "direct") {
      suggestions
        .filter((s) => !s.inTolerance)
        .forEach((s, idx) => {
          lines.push(
            `${idx + 1}. [${s.action.toUpperCase()}] ${s.asset}: ${s.diffPct}% (₹${Math.round(
              s.diffAmt
            ).toLocaleString("en-IN")})`
          );
          lines.push(`   Current: ${s.currentPct}% → Target: ${s.targetPct}%`);
          lines.push(`   Guidance: ${s.overweight ? s.sellInstrumentHint : s.buyInstrumentHint}`);
        });
    } else if (strategyMode === "newMoney") {
      lines.push(`Deploying Fresh Cash: ₹${Number(newMoneyAmount || 0).toLocaleString("en-IN")}`);
      deploymentPlan.forEach((d, idx) => {
        lines.push(
          `${idx + 1}. BUY ${d.name}: ₹${Math.round(d.amount).toLocaleString("en-IN")} (${d.pctOfInflow}% of fresh money)`
        );
      });
    } else {
      lines.push(`Monthly SIP Rebalancing: ₹${Number(monthlySipAmount || 0).toLocaleString("en-IN")}/mo`);
      sipPlan.forEach((p, idx) => {
        lines.push(
          `${idx + 1}. ALLOCATE to ${p.name}: ₹${Math.round(p.amount).toLocaleString("en-IN")}/mo (${p.sharePct}%)`
        );
      });
    }

    lines.push(`----------------------------------------------------`);
    lines.push(`Note: Suggestions are indicative. Mind capital gains taxes & exit loads.`);

    navigator.clipboard.writeText(lines.join("\n"));
    setCopiedPlan(true);
    setTimeout(() => setCopiedPlan(false), 2500);
  };

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

  // Health Score Colors & Labels
  const scoreColor =
    deviationScore >= 85 ? THEME.sage : deviationScore >= 60 ? THEME.gold : THEME.rust;
  const scoreGrade =
    deviationScore >= 90
      ? "Grade A+ (Optimal Balance)"
      : deviationScore >= 80
      ? "Grade A (Well Balanced)"
      : deviationScore >= 60
      ? "Grade B (Moderate Drift)"
      : deviationScore >= 40
      ? "Grade C (Rebalance Recommended)"
      : "Grade D (Severe Imbalance)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Tab Header with Subtitle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <SectionTitle sub="Compare your allocation to target and get actionable suggestions">
          Smart Rebalancing
        </SectionTitle>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Button
            variant="secondary"
            size="sm"
            icon={copiedPlan ? <Check size={14} style={{ color: THEME.sage }} /> : <Copy size={14} />}
            onClick={handleCopyPlan}
          >
            {copiedPlan ? "Plan Copied!" : "Copy Action Plan"}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={14} />}
            onClick={handleExportBreakdownCSV}
          >
            Export Breakdown
          </Button>
        </div>
      </div>

      {/* ── 1. HERO BENTO: PORTFOLIO HEALTH & ALIGNMENT GAUGE ── */}
      <Card style={{ padding: "28px 24px", position: "relative", overflow: "hidden" }}>
        {/* Subtle background glow */}
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 240,
            height: 240,
            borderRadius: "50%",
            background: `radial-gradient(circle, color-mix(in srgb, ${scoreColor} 12%, transparent) 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
            alignItems: "center",
          }}
        >
          {/* Radial Score Gauge */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                background: `conic-gradient(${scoreColor} ${deviationScore * 3.6}deg, ${THEME.line} 0deg)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.05)",
                flexShrink: 0,
                transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: "50%",
                  background: "var(--surface-0)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-display)",
                }}
              >
                <span style={{ fontSize: 24, fontWeight: 900, color: scoreColor, lineHeight: 1 }}>
                  {Math.round(deviationScore)}
                </span>
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginTop: 2,
                  }}
                >
                  Score
                </span>
              </div>
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                  flexWrap: "wrap",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontWeight: 800,
                    fontSize: 18,
                    color: THEME.ink,
                    letterSpacing: "-0.015em",
                  }}
                >
                  Portfolio Alignment Score
                </h3>
                <Badge
                  variant={deviationScore >= 80 ? "sage" : deviationScore >= 60 ? "gold" : "rust"}
                  style={{ fontSize: 11, padding: "2px 8px" }}
                >
                  {scoreGrade}
                </Badge>
              </div>
              <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 500, lineHeight: 1.4 }}>
                {deviationScore >= 85
                  ? "Your asset mix is tightly aligned with your risk profile. No urgent changes needed."
                  : deviationScore >= 60
                  ? `Moderate drift detected (max drift ${maxDrift.toFixed(1)}%). Consider rebalancing soon.`
                  : `High divergence from target. Action recommended to restore target risk-return curve.`}
              </div>
            </div>
          </div>

          {/* Quick Portfolio Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: 14,
              borderLeft: `1px solid ${THEME.line}`,
              paddingLeft: 20,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 10.5,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
              >
                Total Portfolio
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 22,
                  fontWeight: 700,
                  color: THEME.ink,
                  letterSpacing: "-0.03em",
                  marginTop: 3,
                }}
              >
                <Money value={animatedTotal} variant="full" />
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 10.5,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
              >
                Drift Capital (Gross)
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 20,
                  fontWeight: 700,
                  color: totalDriftAmt > 0 ? THEME.rust : THEME.sage,
                  letterSpacing: "-0.03em",
                  marginTop: 3,
                }}
              >
                <Money value={totalDriftAmt} variant="full" />
              </div>
            </div>

            <div>
              <div
                style={{
                  fontSize: 10.5,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
              >
                Liquid vs Locked
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: THEME.ink,
                  marginTop: 5,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ color: THEME.sage }}>
                  <Unlock size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 2 }} />
                  {allocation.liquidRatio.toFixed(0)}% Liquid
                </span>
                <span style={{ color: THEME.muted }}>/</span>
                <span style={{ color: THEME.gold }}>
                  <Lock size={12} style={{ display: "inline", verticalAlign: "middle", marginRight: 2 }} />
                  {(100 - allocation.liquidRatio).toFixed(0)}% Locked
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── 2. TARGET ALLOCATION PROFILE BUILDER ── */}
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
              fontSize: 16,
              color: THEME.ink,
              display: "flex",
              alignItems: "center",
              gap: 8,
              letterSpacing: "-0.015em",
            }}
          >
            <Settings size={18} style={{ color: "var(--accent)" }} /> Target Allocation Profile
          </div>

          {/* Drift Threshold Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--surface-0)",
              padding: "4px 10px",
              borderRadius: 10,
              border: `1px solid ${THEME.line}`,
            }}
          >
            <SlidersHorizontal size={14} style={{ color: THEME.muted }} />
            <label
              htmlFor="drift-threshold-select"
              style={{ fontSize: 11.5, color: THEME.muted, fontWeight: 700 }}
            >
              Drift Tolerance:
            </label>
            <select
              id="drift-threshold-select"
              value={driftThreshold}
              onChange={(e) => setDriftThreshold(Number(e.target.value))}
              style={{
                padding: "3px 8px",
                borderRadius: 6,
                border: `1px solid ${THEME.line}`,
                background: "var(--surface-1)",
                color: THEME.ink,
                fontSize: 12,
                fontWeight: 700,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value={2}>±2% (Tight / Institutional)</option>
              <option value={3}>±3% (Balanced / Recommended)</option>
              <option value={5}>±5% (Flexible 5/25 Rule)</option>
              <option value={8}>±8% (Wide Corridor)</option>
              <option value={10}>±10% (High Volatility)</option>
            </select>
          </div>
        </div>

        {/* Preset Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          {Object.entries(PRESETS).map(([key, preset]) => {
            const active = !useCustom && selectedPreset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedPreset(key);
                  setUseCustom(false);
                }}
                aria-pressed={active}
                className="card-lift"
                style={{
                  padding: "16px",
                  borderRadius: 14,
                  textAlign: "left",
                  border: `1.5px solid ${active ? "var(--accent)" : THEME.line}`,
                  background: active
                    ? "color-mix(in srgb, var(--accent) 8%, var(--surface-0))"
                    : "var(--surface-0)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 6,
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 800,
                        fontSize: 13.5,
                        color: active ? "var(--accent)" : THEME.ink,
                      }}
                    >
                      {preset.label}
                    </span>
                    {preset.tag && (
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 6,
                          background: active
                            ? "var(--accent)"
                            : "color-mix(in srgb, var(--surface-2) 60%, transparent)",
                          color: active ? "#ffffff" : THEME.muted,
                        }}
                      >
                        {preset.tag}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 500, lineHeight: 1.35 }}>
                    {preset.desc}
                  </div>
                </div>

                {/* Visual Ratio Bar */}
                <div
                  style={{
                    display: "flex",
                    height: 6,
                    borderRadius: 3,
                    overflow: "hidden",
                    marginTop: 6,
                    background: THEME.line,
                  }}
                >
                  {preset.equity > 0 && (
                    <div
                      style={{
                        width: `${preset.equity}%`,
                        background: ASSET_CLASS_COLORS.Equity,
                      }}
                      title={`Equity: ${preset.equity}%`}
                    />
                  )}
                  {preset.debt > 0 && (
                    <div
                      style={{
                        width: `${preset.debt}%`,
                        background: ASSET_CLASS_COLORS.Debt,
                      }}
                      title={`Debt: ${preset.debt}%`}
                    />
                  )}
                  {(preset.gold || 0) > 0 && (
                    <div
                      style={{
                        width: `${preset.gold}%`,
                        background: ASSET_CLASS_COLORS.Gold,
                      }}
                      title={`Gold: ${preset.gold}%`}
                    />
                  )}
                  {preset.cash > 0 && (
                    <div
                      style={{
                        width: `${preset.cash}%`,
                        background: ASSET_CLASS_COLORS.Cash,
                      }}
                      title={`Cash: ${preset.cash}%`}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom Target Controller */}
        <div
          style={{
            borderTop: `1px solid ${THEME.line}`,
            paddingTop: 16,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <button
              type="button"
              onClick={() => setUseCustom(!useCustom)}
              aria-pressed={useCustom}
              className="card-lift"
              style={{
                padding: "7px 16px",
                borderRadius: 10,
                fontSize: 12.5,
                fontWeight: 700,
                border: `1.5px solid ${useCustom ? "var(--accent)" : THEME.line}`,
                background: useCustom
                  ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                  : "transparent",
                color: useCustom ? "var(--accent)" : THEME.ink,
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Sliders size={14} />
              Custom Target Allocation
            </button>

            {useCustom && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: customTargetInvalid ? THEME.rust : THEME.sage,
                  }}
                >
                  Total: {customTargetSum.toFixed(0)}%
                </span>
                {customTargetInvalid && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleNormalizeCustomTarget}
                    style={{ fontSize: 11, padding: "4px 10px" }}
                  >
                    Auto-Normalize to 100%
                  </Button>
                )}
              </div>
            )}
          </div>

          {useCustom && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
                padding: 16,
                background: "color-mix(in srgb, var(--surface-1) 50%, transparent)",
                borderRadius: 12,
                border: `1px solid ${THEME.line}`,
              }}
            >
              {[
                { key: "equity", label: "Equity", color: ASSET_CLASS_COLORS.Equity },
                { key: "debt", label: "Debt", color: ASSET_CLASS_COLORS.Debt },
                { key: "gold", label: "Gold", color: ASSET_CLASS_COLORS.Gold },
                { key: "cash", label: "Cash", color: ASSET_CLASS_COLORS.Cash },
              ].map(({ key, label, color }) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: "10px 12px",
                    background: "var(--surface-0)",
                    borderRadius: 10,
                    border: `1px solid ${THEME.line}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: THEME.ink,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span
                        style={{ width: 8, height: 8, borderRadius: "50%", background: color }}
                      />
                      {label}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 13,
                        fontWeight: 900,
                        color: THEME.ink,
                      }}
                    >
                      {customTarget[key as keyof AllocationTarget] || 0}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={customTarget[key as keyof AllocationTarget] || 0}
                    onChange={(e) =>
                      setCustomTarget((prev) => ({
                        ...prev,
                        [key]: Number(e.target.value),
                      }))
                    }
                    style={{
                      width: "100%",
                      accentColor: color,
                      cursor: "pointer",
                    }}
                  />
                </div>
              ))}
            </div>
          )}

          {customTargetInvalid && (
            <div className="info-box info-box-error animate-slide-down">
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontWeight: 600, fontSize: 12.5 }}>
                Targets sum to {customTargetSum.toFixed(1)}% — they must total 100% for accurate calculations.
                Click "Auto-Normalize to 100%" to scale them automatically.
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* ── 3. VISUAL ANALYTICS: CURRENT VS TARGET VS DRIFT ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
        }}
      >
        {/* Current Allocation Donut */}
        <Card style={{ padding: "24px 20px" }}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 14,
                marginBottom: 12,
                color: THEME.ink,
                letterSpacing: "-0.01em",
              }}
            >
              Current Allocation
            </div>
            <div style={{ width: "100%", height: 190, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={54}
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
                              ? "drop-shadow(0 6px 14px rgba(0,0,0,0.18))"
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
                          fontSize: 10,
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
                          fontFamily: "var(--font-display)",
                          fontSize: 13.5,
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
                          fontSize: 10,
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
                          fontFamily: "var(--font-display)",
                          fontSize: 13.5,
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
              </ResponsiveContainer>
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
                    fontSize: 11.5,
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

        {/* Target Allocation Donut */}
        <Card style={{ padding: "24px 20px" }}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 14,
                marginBottom: 12,
                color: THEME.ink,
                letterSpacing: "-0.01em",
              }}
            >
              Target Allocation
            </div>
            <div style={{ width: "100%", height: 190, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={targetPieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    innerRadius={54}
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
                              ? "drop-shadow(0 6px 14px rgba(0,0,0,0.18))"
                              : "none",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip formatter={(v: any) => `${v}%`} />} />
                  {activeTargetIndex !== null && targetPieData[activeTargetIndex] ? (
                    <>
                      <text
                        x="50%"
                        y="46%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 10,
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
                          fontFamily: "var(--font-display)",
                          fontSize: 13.5,
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
                          fontSize: 10,
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
                          fontFamily: "var(--font-display)",
                          fontSize: 13.5,
                          fill: THEME.ink,
                          fontWeight: 900,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {targetPieData.reduce((s, d) => s + d.value, 0).toFixed(0)}%
                      </text>
                    </>
                  )}
                </PieChart>
              </ResponsiveContainer>
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
                    fontSize: 11.5,
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

        {/* Current vs Target Comparison Bar */}
        <Card style={{ padding: "24px 20px" }}>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 14,
                marginBottom: 12,
                color: THEME.ink,
                letterSpacing: "-0.01em",
              }}
            >
              Current vs Target
            </div>
            <div style={{ width: "100%", height: 190 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                    formatter={(v: any) => `${v}%`}
                    content={<ChartTooltip formatter={(v: any) => `${v}%`} />}
                    cursor={{ fill: THEME.line, opacity: 0.35 }}
                  />
                  <Bar dataKey="Current" fill="var(--accent)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Target" fill={THEME.sage} radius={[6, 6, 0, 0]} />
                  <Legend
                    wrapperStyle={{ fontSize: 11.5, paddingTop: 8 }}
                    formatter={(value: string) => (
                      <span style={{ color: THEME.ink, fontWeight: 600 }}>{value}</span>
                    )}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>

      {/* ── 4. MULTI-STRATEGY REBALANCING EXECUTION CENTER ── */}
      <Card style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 800,
                fontSize: 16,
                color: THEME.ink,
                display: "flex",
                alignItems: "center",
                gap: 8,
                letterSpacing: "-0.015em",
              }}
            >
              <Zap size={18} style={{ color: THEME.gold }} /> Actionable Suggestions
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, marginTop: 3 }}>
              Select an execution strategy tailored to your liquidity and tax preferences
            </div>
          </div>

          {/* Strategy Mode Switcher Tabs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "var(--surface-1)",
              padding: 4,
              borderRadius: 12,
              border: `1px solid ${THEME.line}`,
            }}
          >
            <button
              type="button"
              onClick={() => setStrategyMode("direct")}
              style={{
                padding: "6px 14px",
                borderRadius: 9,
                fontSize: 12,
                fontWeight: 700,
                border: "none",
                background: strategyMode === "direct" ? "var(--surface-0)" : "transparent",
                color: strategyMode === "direct" ? THEME.ink : THEME.muted,
                boxShadow: strategyMode === "direct" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              1. Direct Rebalance (Sell & Buy)
            </button>
            <button
              type="button"
              onClick={() => setStrategyMode("newMoney")}
              style={{
                padding: "6px 14px",
                borderRadius: 9,
                fontSize: 12,
                fontWeight: 700,
                border: "none",
                background: strategyMode === "newMoney" ? "var(--surface-0)" : "transparent",
                color: strategyMode === "newMoney" ? THEME.ink : THEME.muted,
                boxShadow: strategyMode === "newMoney" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              2. Deploy New Money (Zero-Tax)
            </button>
            <button
              type="button"
              onClick={() => setStrategyMode("sip")}
              style={{
                padding: "6px 14px",
                borderRadius: 9,
                fontSize: 12,
                fontWeight: 700,
                border: "none",
                background: strategyMode === "sip" ? "var(--surface-0)" : "transparent",
                color: strategyMode === "sip" ? THEME.ink : THEME.muted,
                boxShadow: strategyMode === "sip" ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              3. SIP Rebalancing
            </button>
          </div>
        </div>

        {/* ── STRATEGY 1: DIRECT SELL & BUY TICKETS ── */}
        {strategyMode === "direct" && (
          <div>
            {suggestions.filter((s) => !s.inTolerance).length === 0 ? (
              <div className="info-box info-box-success" style={{ padding: 18 }}>
                <CheckCircle2 size={20} style={{ flexShrink: 0, color: THEME.sage }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
                    Your portfolio is perfectly aligned! No rebalancing suggestions required.
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                    All asset classes are well within your chosen ±{driftThreshold}% tolerance threshold.
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {suggestions
                  .filter((s) => !s.inTolerance)
                  .map((s, i) => (
                    <div
                      key={i}
                      className="card-lift"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                        padding: "18px 20px",
                        borderRadius: 14,
                        background: "var(--surface-0)",
                        border: `1.5px solid ${THEME.line}`,
                        borderLeft: `5px solid ${s.overweight ? THEME.rust : THEME.sage}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          flexWrap: "wrap",
                          gap: 12,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div
                            style={{
                              width: 42,
                              height: 42,
                              borderRadius: 12,
                              background: s.overweight
                                ? `color-mix(in srgb, ${THEME.rust} 10%, transparent)`
                                : `color-mix(in srgb, ${THEME.sage} 10%, transparent)`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {s.overweight ? (
                              <ArrowDownRight size={20} style={{ color: THEME.rust }} />
                            ) : (
                              <ArrowUpRight size={20} style={{ color: THEME.sage }} />
                            )}
                          </div>

                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <span
                                style={{
                                  fontWeight: 800,
                                  fontSize: 14.5,
                                  color: THEME.ink,
                                }}
                              >
                                {s.action} {s.asset} by {s.diffPct}%
                              </span>
                              <Badge
                                variant={s.overweight ? "rust" : "sage"}
                                style={{ fontSize: 10, padding: "2px 7px" }}
                              >
                                {s.overweight ? "Overweight (Sell)" : "Underweight (Buy)"}
                              </Badge>
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: THEME.muted,
                                marginTop: 3,
                                fontWeight: 500,
                              }}
                            >
                              Current: <span style={{ fontWeight: 700 }}>{s.currentPct}%</span> → Target:{" "}
                              <span style={{ fontWeight: 700 }}>{s.targetPct}%</span> (Corridor: ±{driftThreshold}%)
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontFamily: "var(--font-display)",
                              fontWeight: 900,
                              fontSize: 16,
                              color: s.overweight ? THEME.rust : THEME.sage,
                            }}
                          >
                            <Money value={s.diffAmt} variant="full" />
                          </div>
                          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                            {s.overweight ? "Capital to Trim" : "Capital to Add"}
                          </div>
                        </div>
                      </div>

                      {/* Instrument & Tax Guidance */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                          gap: 10,
                          paddingTop: 10,
                          borderTop: `1px solid ${THEME.line}`,
                        }}
                      >
                        <div style={{ fontSize: 11.5, color: THEME.ink }}>
                          <span style={{ color: THEME.muted, fontWeight: 600 }}>Suggested Action: </span>
                          <span style={{ fontWeight: 700 }}>
                            {s.overweight ? s.sellInstrumentHint : s.buyInstrumentHint}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: THEME.muted }}>
                          <span style={{ fontWeight: 600 }}>Tax Impact: </span>
                          <span>{s.taxNote}</span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ── STRATEGY 2: DEPLOY NEW MONEY (ZERO-TAX ADDITIVE) ── */}
        {strategyMode === "newMoney" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                padding: "16px 18px",
                borderRadius: 14,
                background: "color-mix(in srgb, var(--t-sage) 6%, var(--surface-0))",
                border: `1px solid ${THEME.line}`,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <Wallet size={24} style={{ color: THEME.sage, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: THEME.ink }}>
                  Smart Additive Rebalancing (Zero Capital Gains Tax)
                </div>
                <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                  Got a bonus, maturity payout, or windfall? Allocate fresh cash directly into underweight
                  buckets to restore balance without selling a single share or triggering tax!
                </div>
              </div>
            </div>

            {/* Inflow Amount Input & Quick Chips */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <div style={{ position: "relative", width: 220 }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      fontSize: 14,
                      fontWeight: 700,
                      color: THEME.muted,
                    }}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    min={0}
                    inputMode="decimal"
                    aria-label="Amount to deploy"
                    placeholder="e.g. 100000"
                    value={newMoneyAmount}
                    onChange={(e) => setNewMoneyAmount(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 14px 10px 30px",
                      borderRadius: 12,
                      border: `1.5px solid ${THEME.line}`,
                      background: "var(--surface-0)",
                      color: THEME.ink,
                      fontSize: 14,
                      fontWeight: 700,
                      outline: "none",
                    }}
                  />
                </div>

                {/* Preset Chips */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[25000, 50000, 100000, 500000, 1000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setNewMoneyAmount(amt.toString())}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: 11.5,
                        fontWeight: 700,
                        border: `1px solid ${THEME.line}`,
                        background:
                          newMoneyAmount === amt.toString()
                            ? "color-mix(in srgb, var(--accent) 12%, var(--surface-0))"
                            : "var(--surface-0)",
                        color: newMoneyAmount === amt.toString() ? "var(--accent)" : THEME.ink,
                        cursor: "pointer",
                      }}
                    >
                      ₹{(amt / 1000).toFixed(0)}k
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {Number(newMoneyAmount) > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Optimal Deployment Breakdown
                </div>
                {deploymentPlan.map((d) => (
                  <div
                    key={d.name}
                    className="card-lift"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 14,
                      padding: "14px 18px",
                      borderRadius: 12,
                      background: "var(--surface-0)",
                      border: `1.5px solid ${THEME.line}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: d.color,
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>
                          Allocate to {d.name}
                        </div>
                        <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                          {d.pctOfInflow}% of fresh money → Moves {d.name} to {d.postPct}% (Target: {d.targetPct}%)
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 15,
                          fontWeight: 900,
                          color: THEME.sage,
                        }}
                      >
                        <Money value={d.amount} variant="full" />
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                        Post-deploy: <Money value={d.postAmount} variant="full" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  textAlign: "center",
                  padding: "24px 16px",
                  background: "var(--surface-1)",
                  borderRadius: 12,
                  color: THEME.muted,
                  fontSize: 12.5,
                }}
              >
                Enter a lump sum amount above to calculate your zero-tax deployment plan.
              </div>
            )}
          </div>
        )}

        {/* ── STRATEGY 3: SYSTEMATIC SIP REBALANCER ── */}
        {strategyMode === "sip" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                padding: "16px 18px",
                borderRadius: 14,
                background: "color-mix(in srgb, var(--accent) 6%, var(--surface-0))",
                border: `1px solid ${THEME.line}`,
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <Calendar size={24} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: THEME.ink }}>
                  Ongoing SIP Optimization (Frictionless Rebalancing)
                </div>
                <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                  Direct your monthly SIP installments towards underweight asset classes. Achieve full portfolio
                  alignment over the next 6-12 months organically with zero exit loads.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <label
                htmlFor="monthly-sip-input"
                style={{ fontSize: 12.5, fontWeight: 700, color: THEME.ink }}
              >
                Monthly SIP Budget:
              </label>
              <div style={{ position: "relative", width: 180 }}>
                <span
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 13,
                    fontWeight: 700,
                    color: THEME.muted,
                  }}
                >
                  ₹
                </span>
                <input
                  id="monthly-sip-input"
                  type="number"
                  min={0}
                  step={1000}
                  value={monthlySipAmount}
                  onChange={(e) => setMonthlySipAmount(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px 8px 26px",
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

              <div style={{ display: "flex", gap: 6 }}>
                {[10000, 25000, 50000, 100000].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setMonthlySipAmount(s.toString())}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      border: `1px solid ${THEME.line}`,
                      background:
                        monthlySipAmount === s.toString()
                          ? "color-mix(in srgb, var(--accent) 12%, var(--surface-0))"
                          : "var(--surface-0)",
                      color: monthlySipAmount === s.toString() ? "var(--accent)" : THEME.ink,
                      cursor: "pointer",
                    }}
                  >
                    ₹{(s / 1000).toFixed(0)}k/mo
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {sipPlan.map((p) => (
                <div
                  key={p.name}
                  className="card-lift"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 14,
                    padding: "14px 18px",
                    borderRadius: 12,
                    background: "var(--surface-0)",
                    border: `1.5px solid ${THEME.line}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: p.color,
                      }}
                    />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>
                        SIP into {p.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                        {p.sharePct}% of monthly SIP budget
                        {p.monthsToRebalance
                          ? ` → Rebalances in ~${p.monthsToRebalance} months`
                          : ""}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 15,
                        fontWeight: 900,
                        color: "var(--accent)",
                      }}
                    >
                      <Money value={p.amount} variant="full" />
                      <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 500 }}>/mo</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ── 5. DETAILED BREAKDOWN & HOLDINGS EXPLORER ── */}
      <Card style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 800,
                color: THEME.ink,
                letterSpacing: "-0.015em",
              }}
            >
              Detailed Breakdown
            </h3>
            <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
              Granular inspection of individual asset subcomponents, values, and liquidity
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Category Filter Pills */}
            <div
              style={{
                display: "flex",
                background: "var(--surface-1)",
                padding: 3,
                borderRadius: 10,
                border: `1px solid ${THEME.line}`,
              }}
            >
              {(["all", "Equity", "Debt", "Gold", "Cash"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 7,
                    fontSize: 11,
                    fontWeight: 700,
                    border: "none",
                    background: categoryFilter === cat ? "var(--surface-0)" : "transparent",
                    color: categoryFilter === cat ? THEME.ink : THEME.muted,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {cat === "all" ? "All" : cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div style={{ display: "flex", position: "relative", alignItems: "center" }}>
              <Search
                size={14}
                color={THEME.muted}
                style={{ position: "absolute", left: 12, pointerEvents: "none" }}
              />
              <input
                type="text"
                aria-label="Search breakdown"
                placeholder="Filter asset..."
                value={breakdownSearch}
                onChange={(e) => setBreakdownSearch(e.target.value)}
                style={{
                  width: 150,
                  padding: `7px ${breakdownSearch ? 32 : 12}px 7px 32px`,
                  borderRadius: 10,
                  border: `1.5px solid ${THEME.line}`,
                  background: "var(--surface-0)",
                  color: THEME.ink,
                  fontSize: 12,
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
              disabled={!filteredBreakdownRows.length}
            >
              CSV
            </Button>
          </div>
        </div>

        {/* Table View */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...th, paddingLeft: 16 }}>Asset Class / Sub-Instrument</th>
                <th style={th}>Category</th>
                <th style={th}>Liquidity</th>
                <th style={thRight}>Value</th>
                <th style={{ ...thRight, paddingRight: 16 }}>% of Portfolio</th>
              </tr>
            </thead>
            <tbody>
              {filteredBreakdownRows.map((row, i) => (
                <tr
                  key={i}
                  className="table-row-hover"
                  style={{ borderBottom: `1px solid ${THEME.line}` }}
                >
                  <td style={{ ...td, paddingLeft: 16, color: THEME.ink, fontWeight: 700 }}>
                    {row.label}
                  </td>
                  <td style={td}>
                    <Badge
                      variant="muted"
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        border: `1px solid ${
                          row.parent === "Equity"
                            ? ASSET_CLASS_COLORS.Equity
                            : row.parent === "Debt"
                            ? ASSET_CLASS_COLORS.Debt
                            : row.parent === "Gold"
                            ? ASSET_CLASS_COLORS.Gold
                            : ASSET_CLASS_COLORS.Cash
                        }`,
                      }}
                    >
                      {row.parent}
                    </Badge>
                  </td>
                  <td style={td}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 11,
                        fontWeight: 600,
                        color: row.liquid ? THEME.sage : THEME.gold,
                      }}
                    >
                      {row.liquid ? <Unlock size={11} /> : <Lock size={11} />}
                      {row.liquid ? "Liquid / Tradable" : "Locked / Long-term"}
                    </span>
                  </td>
                  <td style={{ ...tdRight, fontWeight: 700 }}>
                    <Money value={row.value} variant="full" />
                  </td>
                  <td style={{ ...tdRight, paddingRight: 16, color: THEME.muted, fontWeight: 600 }}>
                    {allocation.total ? ((row.value / allocation.total) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
              {!filteredBreakdownRows.length && (
                <tr>
                  <td colSpan={5} style={{ ...td, textAlign: "center", color: THEME.muted, padding: 24 }}>
                    No holdings match your search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── 6. STRATEGIC REBALANCING & TAX INTELLIGENCE ACCORDION ── */}
      <div
        style={{
          padding: "18px 20px",
          borderRadius: 14,
          background: "color-mix(in srgb, var(--accent) 5%, var(--surface-0))",
          border: `1.5px solid ${THEME.line}`,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Info size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
            Institutional Rebalancing Guidelines & Tax Insights
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 14,
            fontSize: 11.5,
            color: THEME.muted,
            lineHeight: 1.5,
            paddingLeft: 28,
          }}
        >
          <div>
            <strong style={{ color: THEME.ink }}>The 5/25 Rebalancing Rule:</strong> Rebalance only when an asset
            class deviates by an absolute ±5% or a relative ±25% from its target weight to avoid excessive
            transaction friction and tax triggers.
          </div>
          <div>
            <strong style={{ color: THEME.ink }}>Tax Harvesting:</strong> When rebalancing Equity, utilize the
            ₹1,25,000 annual Long-Term Capital Gains (LTCG) tax exemption under Section 112A. STCG is taxed at
            20%.
          </div>
          <div>
            <strong style={{ color: THEME.ink }}>Locked vs Liquid:</strong> Instruments like EPF, PPF, NPS Tier-1,
            and ELSS (3-yr lock-in) cannot be liquidated immediately. Use fresh cash flows (SIPs/Bonuses) to
            rebalance around them.
          </div>
        </div>
      </div>
    </div>
  );
};
