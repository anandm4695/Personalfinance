/* eslint-disable */
import React, { useState, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  IndianRupee,
  Info,
  Shield,
  Download,
  Sliders,
  Layers,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Search,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  AreaChart,
  Area,
} from "recharts";
import { THEME } from "../../utils/constants";
import {
  fmtINRFull,
  calcCAGR,
  getGoldPricePerGram,
  GOLD_PURITY_FACTOR,
  exportArrayToCSV,
} from "../../utils/finance";
import { INDEX_BENCHMARKS, OTHER_BENCHMARKS, BENCHMARK_DATA_ASOF } from "../../utils/benchmarkData";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Prv } from "../../context/PrivacyContext";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";

// Statutory & Standard Reference Rates
const EPF_CURRENT_RATE = 8.25;
const PPF_STATED_RATE = OTHER_BENCHMARKS.ppf["1Y"] || 7.1;

// Canonical Benchmark Registry
const BENCHMARK_REGISTRY: Record<
  string,
  {
    id: string;
    label: string;
    category: "Equity" | "Debt / Fixed Income" | "Commodity" | "Macro" | "Hybrid";
    return1Y: number;
    return3Y: number;
    return5Y: number;
    return10Y: number;
    color: string;
    description: string;
  }
> = {
  nifty50: {
    id: "nifty50",
    label: INDEX_BENCHMARKS.nifty50.label,
    category: "Equity",
    return1Y: INDEX_BENCHMARKS.nifty50["1Y"],
    return3Y: INDEX_BENCHMARKS.nifty50["3Y"],
    return5Y: INDEX_BENCHMARKS.nifty50["5Y"],
    return10Y: INDEX_BENCHMARKS.nifty50["10Y"],
    color: THEME.accent,
    description: "Top 50 large-cap blue-chip Indian companies",
  },
  sensex: {
    id: "sensex",
    label: INDEX_BENCHMARKS.sensex.label,
    category: "Equity",
    return1Y: INDEX_BENCHMARKS.sensex["1Y"],
    return3Y: INDEX_BENCHMARKS.sensex["3Y"],
    return5Y: INDEX_BENCHMARKS.sensex["5Y"],
    return10Y: INDEX_BENCHMARKS.sensex["10Y"],
    color: "#6366f1",
    description: "BSE 30 bellwether Indian index",
  },
  niftyMidcap: {
    id: "niftyMidcap",
    label: INDEX_BENCHMARKS.niftyMidcap.label,
    category: "Equity",
    return1Y: INDEX_BENCHMARKS.niftyMidcap["1Y"],
    return3Y: INDEX_BENCHMARKS.niftyMidcap["3Y"],
    return5Y: INDEX_BENCHMARKS.niftyMidcap["5Y"],
    return10Y: INDEX_BENCHMARKS.niftyMidcap["10Y"],
    color: THEME.sage,
    description: "Nifty Midcap 150 high-growth market leaders",
  },
  niftySmallcap: {
    id: "niftySmallcap",
    label: INDEX_BENCHMARKS.niftySmallcap.label,
    category: "Equity",
    return1Y: INDEX_BENCHMARKS.niftySmallcap["1Y"],
    return3Y: INDEX_BENCHMARKS.niftySmallcap["3Y"],
    return5Y: INDEX_BENCHMARKS.niftySmallcap["5Y"],
    return10Y: INDEX_BENCHMARKS.niftySmallcap["10Y"],
    color: "#ec4899",
    description: "Nifty Smallcap 250 emerging growth stocks",
  },
  fdRate: {
    id: "fdRate",
    label: OTHER_BENCHMARKS.fdRate.label,
    category: "Debt / Fixed Income",
    return1Y: OTHER_BENCHMARKS.fdRate["1Y"],
    return3Y: OTHER_BENCHMARKS.fdRate["3Y"],
    return5Y: OTHER_BENCHMARKS.fdRate["5Y"],
    return10Y: (OTHER_BENCHMARKS.fdRate as any)["10Y"] || 6.6,
    color: THEME.gold,
    description: "SBI 1-5 Year Fixed Deposit standard interest rate",
  },
  ppf: {
    id: "ppf",
    label: OTHER_BENCHMARKS.ppf.label,
    category: "Debt / Fixed Income",
    return1Y: OTHER_BENCHMARKS.ppf["1Y"],
    return3Y: OTHER_BENCHMARKS.ppf["3Y"],
    return5Y: OTHER_BENCHMARKS.ppf["5Y"],
    return10Y: (OTHER_BENCHMARKS.ppf as any)["10Y"] || 7.9,
    color: THEME.pink,
    description: "Government-backed Public Provident Fund (tax-free EEE)",
  },
  gold: {
    id: "gold",
    label: OTHER_BENCHMARKS.gold.label,
    category: "Commodity",
    return1Y: OTHER_BENCHMARKS.gold["1Y"],
    return3Y: OTHER_BENCHMARKS.gold["3Y"],
    return5Y: OTHER_BENCHMARKS.gold["5Y"],
    return10Y: (OTHER_BENCHMARKS.gold as any)["10Y"] || 11.8,
    color: THEME.violet,
    description: "MCX Spot Gold / Sovereign Gold Bond return in INR",
  },
  hybrid6040: {
    id: "hybrid6040",
    label: "Hybrid Balanced (60:40)",
    category: "Hybrid",
    return1Y: 0.6 * INDEX_BENCHMARKS.nifty50["1Y"] + 0.4 * OTHER_BENCHMARKS.fdRate["1Y"],
    return3Y: 0.6 * INDEX_BENCHMARKS.nifty50["3Y"] + 0.4 * OTHER_BENCHMARKS.fdRate["3Y"],
    return5Y: 0.6 * INDEX_BENCHMARKS.nifty50["5Y"] + 0.4 * OTHER_BENCHMARKS.fdRate["5Y"],
    return10Y:
      0.6 * INDEX_BENCHMARKS.nifty50["10Y"] + 0.4 * ((OTHER_BENCHMARKS.fdRate as any)["10Y"] || 6.6),
    color: "#06b6d4",
    description: "Classic 60% Equity (Nifty 50) + 40% Debt (Fixed Income)",
  },
  inflation: {
    id: "inflation",
    label: OTHER_BENCHMARKS.inflation.label,
    category: "Macro",
    return1Y: OTHER_BENCHMARKS.inflation["1Y"],
    return3Y: OTHER_BENCHMARKS.inflation["3Y"],
    return5Y: OTHER_BENCHMARKS.inflation["5Y"],
    return10Y: (OTHER_BENCHMARKS.inflation as any)["10Y"] || 5.6,
    color: THEME.rust,
    description: "Consumer Price Index (CPI) inflation hurdle rate",
  },
};

// Custom Tooltip for Recharts
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
        borderRadius: 14,
        padding: "12px 16px",
        boxShadow: "0 12px 36px rgba(0, 0, 0, 0.12)",
        fontSize: 12,
        minWidth: 160,
      }}
    >
      <div
        style={{
          fontWeight: 800,
          color: THEME.ink,
          marginBottom: 8,
          letterSpacing: "-0.01em",
          borderBottom: `1px solid ${THEME.line}`,
          paddingBottom: 4,
        }}
      >
        {label}
      </div>
      {visible.map((p: any, i: number) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: p.color || p.fill || "var(--accent)",
                display: "inline-block",
              }}
            />
            <span style={{ color: THEME.muted, fontWeight: 500 }}>{p.name}:</span>
          </div>
          <span style={{ fontWeight: 700, color: THEME.ink }}>
            <Prv>{formatter ? formatter(p.value) : p.value}</Prv>
          </span>
        </div>
      ))}
    </div>
  );
};

export const PerformanceBenchmarkTab: React.FC<{
  state: any;
  metrics?: any;
  marketData?: any;
}> = ({ state, metrics = {}, marketData = {} }) => {
  const [period, setPeriod] = useState<"1y" | "3y" | "5y" | "10y">("1y");
  const [activeTab, setActiveTab] = useState<
    "macro" | "attribution" | "simulator" | "health" | "custom"
  >("macro");
  const [matrixSearch, setMatrixSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Custom Target Benchmark Builder Weights
  const [customWeights, setCustomWeights] = useState({
    equity: 50,
    debt: 30,
    gold: 15,
    cash: 5,
  });

  // Simulator Initial Capital
  const [simCapital, setSimCapital] = useState<number>(1000000); // default ₹10 Lakhs

  // Compute Comprehensive Portfolio Returns & Asset Breakdown
  const portfolioReturns = useMemo(() => {
    const stocks = state.stocks || [];
    const mfs = state.mutualFunds || [];
    const fds = state.fixedDeposits || [];
    const rds = state.recurringDeposits || [];
    const bonds = state.bonds || [];
    const ppfAccs = state.ppf || [];
    const epfAccs = state.epf || [];
    const npsAccs = state.nps || [];
    const goldHoldings = state.goldHoldings || [];
    const bankAccounts = state.bankAccounts || [];
    const realEstate = state.realEstate || [];

    // 1. Direct Equity
    let equityInvested = 0;
    let equityCurrent = 0;
    let earliestStockDate: string | null = null;
    stocks.forEach((s: any) => {
      const qty = Number(s.qty || 0);
      const avg = Number(s.avgPrice || 0);
      const exch = s.exchange || "NSE";
      const yfSym = `${s.symbol?.replace(/\.(NS|BO)$/i, "")}.${exch === "BSE" ? "BO" : "NS"}`;
      const md = marketData?.[yfSym];
      const curr = md?.price || Number(s.currentPrice || s.avgPrice || 0);
      equityInvested += qty * avg;
      equityCurrent += qty * curr;
      const bd = s.buyDate || s.purchaseDate;
      if (bd && (!earliestStockDate || bd < earliestStockDate)) earliestStockDate = bd;
    });
    const equityCAGR =
      equityInvested > 0 && earliestStockDate
        ? calcCAGR(equityInvested, equityCurrent, earliestStockDate)
        : null;
    const equityReturn =
      equityCAGR != null
        ? equityCAGR
        : equityInvested > 0
          ? ((equityCurrent - equityInvested) / equityInvested) * 100
          : 0;

    // 2. Mutual Funds
    let mfInvested = 0;
    let mfCurrent = 0;
    let earliestMFDate: string | null = null;
    mfs.forEach((m: any) => {
      const units = Number(m.units || 0);
      const buyNav = Number(m.buyNav || 0);
      const currNav = Number(m.currentNav || m.buyNav || 0);
      mfInvested += units * buyNav;
      mfCurrent += units * currNav;
      if (m.buyDate && (!earliestMFDate || m.buyDate < earliestMFDate)) earliestMFDate = m.buyDate;
    });
    const mfCAGR = mfInvested > 0 && earliestMFDate ? calcCAGR(mfInvested, mfCurrent, earliestMFDate) : null;
    const mfReturn =
      mfCAGR != null ? mfCAGR : mfInvested > 0 ? ((mfCurrent - mfInvested) / mfInvested) * 100 : 0;

    // 3. Fixed Deposits & Recurring Deposits
    const fdValue = fds.reduce((s: number, f: any) => s + Number(f.principal || 0), 0);
    const avgFDRate =
      fds.length > 0
        ? fds.reduce((s: number, f: any) => s + Number(f.rate || 0), 0) / fds.length
        : OTHER_BENCHMARKS.fdRate["1Y"];
    const rdValue = rds.reduce(
      (s: number, r: any) => s + Number(r.balance || r.maturityAmount || r.monthlyDeposit || 0),
      0
    );
    const avgRDRate =
      rds.length > 0 ? rds.reduce((s: number, r: any) => s + Number(r.rate || 0), 0) / rds.length : avgFDRate;
    const totalFDAndRDValue = fdValue + rdValue;
    const weightedFDRDRate =
      totalFDAndRDValue > 0 ? (fdValue * avgFDRate + rdValue * avgRDRate) / totalFDAndRDValue : avgFDRate;

    // 4. Bonds
    const bondsInvested = bonds.reduce(
      (s: number, b: any) => s + Number(b.principal || b.invested || 0),
      0
    );
    const bondsCurrent = bonds.reduce(
      (s: number, b: any) => s + Number(b.currentVal || b.principal || b.invested || 0),
      0
    );
    const avgBondRate =
      bonds.length > 0
        ? bonds.reduce((s: number, b: any) => s + Number(b.interestRate || b.couponRate || 7.2), 0) /
          bonds.length
        : 7.2;

    // 5. Provident Funds & Retirement (PPF, EPF, NPS)
    const ppfValue = ppfAccs.reduce((s: number, p: any) => s + Number(p.balance || 0), 0);
    const epfValue = epfAccs.reduce(
      (s: number, e: any) => s + Number(e.balance || e.epfBalance || 0),
      0
    );
    const npsInvested = npsAccs.reduce((s: number, n: any) => s + Number(n.invested || 0), 0);
    const npsValue = npsAccs.reduce(
      (s: number, n: any) => s + Number(n.balance || n.currentValue || n.invested || 0),
      0
    );
    const npsReturn =
      npsInvested > 0 && npsValue > npsInvested
        ? ((npsValue - npsInvested) / npsInvested) * 100
        : 9.5; // NPS historical blended avg ~9.5%

    const totalRetirementValue = ppfValue + epfValue + npsValue;
    const weightedRetirementRate =
      totalRetirementValue > 0
        ? (ppfValue * PPF_STATED_RATE + epfValue * EPF_CURRENT_RATE + npsValue * npsReturn) /
          totalRetirementValue
        : PPF_STATED_RATE;

    // 6. Precious Metals (Gold / SGB)
    const goldPricePerGram = getGoldPricePerGram(state);
    let earliestGoldDate: string | null = null;
    const goldValue = goldHoldings.reduce((s: number, g: any) => {
      const purityMul = g.type === "physical" ? GOLD_PURITY_FACTOR[g.purity] || 1 : 1;
      if (g.purchaseDate && (!earliestGoldDate || g.purchaseDate < earliestGoldDate))
        earliestGoldDate = g.purchaseDate;
      return s + Number(g.grams || 0) * goldPricePerGram * purityMul;
    }, 0);
    const goldInvested = goldHoldings.reduce((s: number, g: any) => s + Number(g.purchasePrice || 0), 0);
    const goldCAGR =
      goldInvested > 0 && earliestGoldDate ? calcCAGR(goldInvested, goldValue, earliestGoldDate) : null;
    const goldReturn =
      goldCAGR != null
        ? goldCAGR
        : goldInvested > 0
          ? ((goldValue - goldInvested) / goldInvested) * 100
          : 0;

    // 7. Cash & Savings Accounts
    const cashValue = bankAccounts.reduce((s: number, b: any) => s + Number(b.balance || 0), 0);
    const cashRate = 3.5; // standard savings rate

    // 8. Real Estate
    const reInvested = realEstate.reduce((s: number, r: any) => s + Number(r.purchasePrice || 0), 0);
    const reValue = realEstate.reduce(
      (s: number, r: any) => s + Number(r.currentValue || r.purchasePrice || 0),
      0
    );
    const reReturn =
      reInvested > 0 && reValue > 0 ? ((reValue - reInvested) / reInvested) * 100 : 7.0;

    // Total Portfolio aggregation
    const totalInvested =
      equityInvested +
      mfInvested +
      totalFDAndRDValue +
      bondsInvested +
      ppfValue +
      epfValue +
      npsInvested +
      goldInvested +
      reInvested +
      cashValue;

    const totalCurrent =
      equityCurrent +
      mfCurrent +
      totalFDAndRDValue +
      bondsCurrent +
      ppfValue +
      epfValue +
      npsValue +
      goldValue +
      reValue +
      cashValue;

    const weightedParts = [
      { rate: equityReturn, value: equityCurrent, label: "Direct Equity" },
      { rate: mfReturn, value: mfCurrent, label: "Mutual Funds" },
      { rate: weightedFDRDRate, value: totalFDAndRDValue, label: "Fixed & Recurring Deposits" },
      { rate: avgBondRate, value: bondsCurrent, label: "Bonds & Debentures" },
      { rate: PPF_STATED_RATE, value: ppfValue, label: "PPF" },
      { rate: EPF_CURRENT_RATE, value: epfValue, label: "EPF" },
      { rate: npsReturn, value: npsValue, label: "NPS" },
      { rate: goldReturn, value: goldValue, label: "Gold & SGB" },
      { rate: reReturn, value: reValue, label: "Real Estate" },
      { rate: cashRate, value: cashValue, label: "Cash & Savings" },
    ].filter((p) => p.value > 0);

    const overallReturn =
      totalCurrent > 0 && weightedParts.length > 0
        ? weightedParts.reduce((s, p) => s + p.rate * (p.value / totalCurrent), 0)
        : 0;

    return {
      equity: { invested: equityInvested, current: equityCurrent, return: equityReturn },
      mf: { invested: mfInvested, current: mfCurrent, return: mfReturn },
      fd: { value: totalFDAndRDValue, rate: weightedFDRDRate, pureFD: fdValue, pureRD: rdValue },
      bonds: { invested: bondsInvested, current: bondsCurrent, rate: avgBondRate },
      ppf: { value: ppfValue, rate: PPF_STATED_RATE },
      epf: { value: epfValue, rate: EPF_CURRENT_RATE },
      nps: { invested: npsInvested, value: npsValue, return: npsReturn },
      retirement: { value: totalRetirementValue, rate: weightedRetirementRate },
      gold: { invested: goldInvested, value: goldValue, return: goldReturn },
      cash: { value: cashValue, rate: cashRate },
      realEstate: { invested: reInvested, value: reValue, return: reReturn },
      overall: { invested: totalInvested, current: totalCurrent, return: overallReturn },
      weightedParts,
    };
  }, [state, marketData]);

  // Selected period key for benchmarks
  const periodKey = useMemo(() => {
    switch (period) {
      case "3y":
        return "return3Y";
      case "5y":
        return "return5Y";
      case "10y":
        return "return10Y";
      case "1y":
      default:
        return "return1Y";
    }
  }, [period]);

  // Comparison Bar Chart data (Macro view)
  const comparisonData = useMemo(() => {
    const items = [
      {
        name: "Your Portfolio",
        return: Number(portfolioReturns.overall.return.toFixed(1)),
        color: "var(--accent)",
        isUser: true,
      },
      {
        name: BENCHMARK_REGISTRY.nifty50.label,
        return: BENCHMARK_REGISTRY.nifty50[periodKey],
        color: BENCHMARK_REGISTRY.nifty50.color,
      },
      {
        name: BENCHMARK_REGISTRY.sensex.label,
        return: BENCHMARK_REGISTRY.sensex[periodKey],
        color: BENCHMARK_REGISTRY.sensex.color,
      },
      {
        name: BENCHMARK_REGISTRY.niftyMidcap.label,
        return: BENCHMARK_REGISTRY.niftyMidcap[periodKey],
        color: BENCHMARK_REGISTRY.niftyMidcap.color,
      },
      {
        name: BENCHMARK_REGISTRY.hybrid6040.label,
        return: Number(BENCHMARK_REGISTRY.hybrid6040[periodKey].toFixed(1)),
        color: BENCHMARK_REGISTRY.hybrid6040.color,
      },
      {
        name: BENCHMARK_REGISTRY.gold.label,
        return: BENCHMARK_REGISTRY.gold[periodKey],
        color: BENCHMARK_REGISTRY.gold.color,
      },
      {
        name: BENCHMARK_REGISTRY.fdRate.label,
        return: BENCHMARK_REGISTRY.fdRate[periodKey],
        color: BENCHMARK_REGISTRY.fdRate.color,
      },
      {
        name: BENCHMARK_REGISTRY.ppf.label,
        return: BENCHMARK_REGISTRY.ppf[periodKey],
        color: BENCHMARK_REGISTRY.ppf.color,
      },
      {
        name: BENCHMARK_REGISTRY.inflation.label,
        return: BENCHMARK_REGISTRY.inflation[periodKey],
        color: BENCHMARK_REGISTRY.inflation.color,
      },
    ];
    return items;
  }, [portfolioReturns, periodKey]);

  // Asset Class side-by-side performance data
  const assetComparison = useMemo(() => {
    const list = [
      {
        category: "Equity",
        yours: Number(portfolioReturns.equity.return.toFixed(1)),
        benchmark: BENCHMARK_REGISTRY.nifty50[periodKey],
        bmLabel: "Nifty 50",
        invested: portfolioReturns.equity.invested,
        current: portfolioReturns.equity.current,
      },
      {
        category: "Mutual Funds",
        yours: Number(portfolioReturns.mf.return.toFixed(1)),
        benchmark: BENCHMARK_REGISTRY.nifty50[periodKey],
        bmLabel: "Nifty 50",
        invested: portfolioReturns.mf.invested,
        current: portfolioReturns.mf.current,
      },
      {
        category: "Fixed Deposits",
        yours: Number(portfolioReturns.fd.rate.toFixed(1)),
        benchmark: BENCHMARK_REGISTRY.fdRate[periodKey],
        bmLabel: "SBI FD Rate",
        invested: portfolioReturns.fd.value,
        current: portfolioReturns.fd.value,
      },
      {
        category: "PPF & Retirement",
        yours: Number(portfolioReturns.retirement.rate.toFixed(1)),
        benchmark: BENCHMARK_REGISTRY.ppf[periodKey],
        bmLabel: "PPF Rate",
        invested: portfolioReturns.retirement.value,
        current: portfolioReturns.retirement.value,
      },
      {
        category: "Gold & SGB",
        yours: Number(portfolioReturns.gold.return.toFixed(1)),
        benchmark: BENCHMARK_REGISTRY.gold[periodKey],
        bmLabel: "MCX Gold Spot",
        invested: portfolioReturns.gold.invested,
        current: portfolioReturns.gold.value,
      },
    ];
    return list.filter((a) => a.current > 0 || a.yours !== 0);
  }, [portfolioReturns, periodKey]);

  // Financial Health Radar
  const fdReferenceRate =
    portfolioReturns.fd.rate > 0 ? portfolioReturns.fd.rate : BENCHMARKS.fdRate.return1Y;

  const healthScore = useMemo(() => {
    const savingsRate =
      metrics.monthIncome > 0 ? (1 - metrics.monthExpense / metrics.monthIncome) * 100 : 0;
    const debtRatio = metrics.debtToAssetRatio || 0;
    const emergencyMonths = metrics.emergencyFund?.monthsCovered || 0;
    const diversification = [
      portfolioReturns.equity.invested > 0 ? 1 : 0,
      portfolioReturns.mf.invested > 0 ? 1 : 0,
      portfolioReturns.fd.value > 0 ? 1 : 0,
      portfolioReturns.ppf.value > 0 || portfolioReturns.epf.value > 0 ? 1 : 0,
      portfolioReturns.gold.invested > 0 ? 1 : 0,
    ].reduce((s: number, v: number) => s + v, 0);

    return [
      {
        metric: "Savings Rate",
        score: Math.min(100, Math.max(0, savingsRate * 2)),
        fullMark: 100,
        tip: "Aim to save >30% of your take-home monthly income.",
      },
      {
        metric: "Low Debt",
        score: Math.min(100, Math.max(0, 100 - debtRatio * 2)),
        fullMark: 100,
        tip: "Keep total debt-to-asset ratio comfortably under 30%.",
      },
      {
        metric: "Emergency Fund",
        score: Math.min(100, (emergencyMonths / 12) * 100),
        fullMark: 100,
        tip: "Build 6-12 months of living expenses in liquid accounts.",
      },
      {
        metric: "Diversification",
        score: diversification * 20,
        fullMark: 100,
        tip: "Maintain balanced exposure across Equity, Debt, Gold & Liquid Cash.",
      },
      {
        metric: "Returns vs FD",
        score: Math.min(
          100,
          Math.max(0, (portfolioReturns.overall.return / (fdReferenceRate || 7.0)) * 50)
        ),
        fullMark: 100,
        tip: "Generate risk-managed alpha that consistently beats fixed deposit rates.",
      },
      {
        metric: "Goal Progress",
        score: Math.min(100, Math.max(0, metrics.overallGoalPct || 0)),
        fullMark: 100,
        tip: "Track your long-term milestones and rebalance periodically.",
      },
    ];
  }, [metrics, portfolioReturns, fdReferenceRate]);

  const overallScore = Math.round(
    healthScore.reduce((s, h) => s + h.score, 0) / healthScore.length
  );
  const scoreColor = overallScore >= 70 ? THEME.sage : overallScore >= 40 ? THEME.gold : THEME.rust;
  const scoreLabel = overallScore >= 70 ? "Excellent" : overallScore >= 40 ? "Good" : "Needs Work";

  // Alpha vs Core Benchmarks
  const niftyAlpha = portfolioReturns.overall.return - BENCHMARK_REGISTRY.nifty50[periodKey];
  const realInflationAlpha =
    portfolioReturns.overall.return - BENCHMARK_REGISTRY.inflation[periodKey];

  // Custom Target Benchmark Weighted CAGR
  const customTargetCAGR = useMemo(() => {
    const totalW =
      customWeights.equity + customWeights.debt + customWeights.gold + customWeights.cash;
    if (totalW === 0) return 0;
    const eqPart =
      (customWeights.equity / totalW) * BENCHMARK_REGISTRY.nifty50[periodKey];
    const debtPart =
      (customWeights.debt / totalW) * BENCHMARK_REGISTRY.fdRate[periodKey];
    const goldPart =
      (customWeights.gold / totalW) * BENCHMARK_REGISTRY.gold[periodKey];
    const cashPart =
      (customWeights.cash / totalW) * 3.5;
    return eqPart + debtPart + goldPart + cashPart;
  }, [customWeights, periodKey]);

  const customTrackingAlpha = portfolioReturns.overall.return - customTargetCAGR;

  // Simulator Data Projection
  const simulationTimeline = useMemo(() => {
    const horizons = [1, 3, 5, 7, 10, 15];
    const userRate = Math.max(0, portfolioReturns.overall.return) / 100;
    const niftyRate = BENCHMARK_REGISTRY.nifty50.return5Y / 100;
    const fdRate = BENCHMARK_REGISTRY.fdRate.return5Y / 100;
    const inflationRate = BENCHMARK_REGISTRY.inflation.return5Y / 100;

    return horizons.map((yr) => {
      const userVal = Math.round(simCapital * Math.pow(1 + userRate, yr));
      const niftyVal = Math.round(simCapital * Math.pow(1 + niftyRate, yr));
      const fdVal = Math.round(simCapital * Math.pow(1 + fdRate, yr));
      const inflVal = Math.round(simCapital * Math.pow(1 + inflationRate, yr));
      return {
        year: `Yr ${yr}`,
        userVal,
        niftyVal,
        fdVal,
        inflVal,
      };
    });
  }, [simCapital, portfolioReturns]);

  // Export CSV Handler
  const handleExportCSV = () => {
    const exportRows = Object.values(BENCHMARK_REGISTRY).map((bm) => {
      const bmVal = bm[periodKey];
      const diff = portfolioReturns.overall.return - bmVal;
      return {
        series: bm.label,
        category: bm.category,
        benchmarkReturn: `${bmVal.toFixed(1)}%`,
        yourPortfolioReturn: `${portfolioReturns.overall.return.toFixed(1)}%`,
        activeAlpha: `${diff >= 0 ? "+" : ""}${diff.toFixed(1)}%`,
        status: diff >= 0 ? "Outperforming" : "Lagging",
      };
    });

    exportArrayToCSV(
      exportRows,
      [
        { key: "series", label: "Benchmark Series" },
        { key: "category", label: "Asset Category" },
        { key: "benchmarkReturn", label: `Benchmark Return (${period.toUpperCase()})` },
        { key: "yourPortfolioReturn", label: "Your Portfolio Return" },
        { key: "activeAlpha", label: "Active Alpha %" },
        { key: "status", label: "Performance Status" },
      ],
      `portfolio-performance-benchmarks-${period}.csv`
    );
  };

  // Zero State Guard
  if (portfolioReturns.overall.invested === 0 && portfolioReturns.overall.current === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <SectionTitle sub="Compare your portfolio against market benchmarks">
          Performance Benchmark
        </SectionTitle>
        <EmptyState
          icon={BarChart3}
          title="No Portfolio Data Yet"
          description="Add stocks, mutual funds, FDs, PPF or gold holdings to see how your returns stack up against Nifty 50, FD rates and inflation."
        />
      </div>
    );
  }

  // Filtered Benchmark Matrix
  const filteredBenchmarks = Object.values(BENCHMARK_REGISTRY).filter((bm) => {
    const matchCat = selectedCategory === "all" || bm.category === selectedCategory;
    const matchSearch =
      matrixSearch.trim() === "" ||
      bm.label.toLowerCase().includes(matrixSearch.toLowerCase()) ||
      bm.description.toLowerCase().includes(matrixSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header with Title and Global Actions */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <SectionTitle sub="Institutional-grade relative returns, active alpha attribution, and financial health diagnostics">
          Performance Benchmark
        </SectionTitle>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Period Selector */}
          <div
            role="tablist"
            aria-label="Benchmark comparison period"
            style={{
              display: "flex",
              gap: 4,
              background: "var(--surface-0)",
              border: `1.5px solid ${THEME.line}`,
              padding: "4px",
              borderRadius: 14,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {[
              { id: "1y", label: "1 Year" },
              { id: "3y", label: "3 Years" },
              { id: "5y", label: "5 Years" },
              { id: "10y", label: "10 Years" },
            ].map((p) => {
              const active = period === p.id;
              return (
                <button
                  key={p.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setPeriod(p.id as any)}
                  className="card-lift"
                  style={{
                    padding: "6px 14px",
                    borderRadius: 10,
                    background: active ? "var(--accent)" : "transparent",
                    border: "none",
                    color: active ? THEME.darkInk : THEME.ink,
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="card-lift"
            title="Export this comparison as CSV"
            aria-label="Export benchmark comparison as CSV"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 14,
              background: "var(--surface-0)",
              border: `1.5px solid ${THEME.line}`,
              color: THEME.ink,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Download size={13} />
            Export Matrix
          </button>
        </div>
      </div>

      {/* Hero Executive Stat Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <StatCard
          label="Overall Return"
          value={`${portfolioReturns.overall.return.toFixed(1)}%`}
          numericValue={portfolioReturns.overall.return}
          formatValue={(n) => `${n.toFixed(1)}%`}
          sub="Blended, weighted by current value"
          icon={
            portfolioReturns.overall.return >= 0 ? (
              <TrendingUp />
            ) : (
              <TrendingDown />
            )
          }
          color={portfolioReturns.overall.return >= 0 ? THEME.sage : THEME.rust}
        />

        <StatCard
          label="Active Alpha (vs Nifty 50)"
          value={`${niftyAlpha >= 0 ? "+" : ""}${niftyAlpha.toFixed(1)}%`}
          numericValue={niftyAlpha}
          formatValue={(n) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`}
          sub={niftyAlpha >= 0 ? "Beating Nifty 50 Index" : "Trailing Nifty 50"}
          subColor={niftyAlpha >= 0 ? THEME.sage : THEME.rust}
          icon={<Zap />}
          color={niftyAlpha >= 0 ? THEME.sage : THEME.rust}
        />

        <StatCard
          label="Real Return (vs Inflation)"
          value={`${realInflationAlpha >= 0 ? "+" : ""}${realInflationAlpha.toFixed(1)}%`}
          numericValue={realInflationAlpha}
          formatValue={(n) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`}
          sub={
            realInflationAlpha >= 0
              ? "Positive real purchasing power"
              : "Purchasing power erosion"
          }
          subColor={realInflationAlpha >= 0 ? THEME.sage : THEME.rust}
          icon={<Flame />}
          color={realInflationAlpha >= 0 ? THEME.sage : THEME.rust}
        />

        <StatCard
          label="Total Invested"
          value={fmtINRFull(portfolioReturns.overall.invested)}
          numericValue={portfolioReturns.overall.invested}
          formatValue={fmtINRFull}
          sub={`Current: ${fmtINRFull(portfolioReturns.overall.current)}`}
          icon={<IndianRupee />}
          color={THEME.accent}
        />

        <StatCard
          label="Financial Health"
          value={String(overallScore)}
          numericValue={overallScore}
          formatValue={(n) => String(Math.round(n))}
          sub={scoreLabel}
          subColor={scoreColor}
          icon={<Shield />}
          color={scoreColor}
        />
      </div>

      {/* Navigation Sub-view Tabs */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 4,
          borderBottom: `1px solid ${THEME.line}`,
        }}
      >
        {[
          {
            id: "macro",
            label: "Macro Benchmarks & Matrix",
            icon: BarChart3,
            desc: "Comparative index heatmap",
          },
          {
            id: "attribution",
            label: "Asset Class Attribution",
            icon: Layers,
            desc: "Equity, Debt, Gold drilldown",
          },
          {
            id: "simulator",
            label: "Wealth Growth Simulator",
            icon: Sparkles,
            desc: "Real purchasing power visualizer",
          },
          {
            id: "health",
            label: "Financial Health Radar",
            icon: Target,
            desc: "6-factor resilience radar",
          },
          {
            id: "custom",
            label: "Custom Target Benchmark",
            icon: Sliders,
            desc: "Build blended index",
          },
        ].map((tab) => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className="card-lift"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 18px",
                borderRadius: 14,
                background: active
                  ? "color-mix(in srgb, var(--accent) 15%, var(--surface-0))"
                  : "var(--surface-0)",
                border: `1.5px solid ${active ? "var(--accent)" : THEME.line}`,
                color: active ? THEME.ink : THEME.muted,
                fontWeight: active ? 800 : 600,
                fontSize: 13,
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                boxShadow: active ? "var(--shadow-sm)" : "none",
              }}
            >
              <Icon
                size={16}
                color={active ? "var(--accent)" : THEME.muted}
                style={{ flexShrink: 0 }}
              />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUB-VIEW 1: MACRO BENCHMARKS & MATRIX */}
      {activeTab === "macro" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Main Visual Bar Chart */}
          <Card style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 12,
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
                  Your Returns vs Benchmarks
                </h3>
                <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                  Comparative performance mapping against Indian and global asset hurdles ·{" "}
                  <span style={{ fontWeight: 700, color: "var(--accent)" }}>
                    {period.toUpperCase()} Horizon
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: THEME.muted,
                    fontStyle: "italic",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    marginTop: 4,
                  }}
                >
                  <Info size={12} style={{ flexShrink: 0 }} />
                  Illustrative long-run historical averages, as of {BENCHMARK_DATA_ASOF} — not
                  live-updated market feed.
                </div>
              </div>

              {/* Performance Indicator Pill */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 14px",
                  borderRadius: 12,
                  background:
                    niftyAlpha >= 0
                      ? "color-mix(in srgb, var(--sage) 15%, var(--surface-0))"
                      : "color-mix(in srgb, var(--rust) 15%, var(--surface-0))",
                  border: `1px solid ${niftyAlpha >= 0 ? THEME.sage : THEME.rust}`,
                  fontSize: 12,
                  fontWeight: 700,
                  color: niftyAlpha >= 0 ? THEME.sage : THEME.rust,
                }}
              >
                {niftyAlpha >= 0 ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                <span>
                  {niftyAlpha >= 0
                    ? `Alpha: +${niftyAlpha.toFixed(1)}% vs Nifty 50`
                    : `Lag: ${niftyAlpha.toFixed(1)}% vs Nifty 50`}
                </span>
              </div>
            </div>

            <div style={{ width: "100%", height: 340, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={comparisonData} layout="vertical">
                  <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    tickFormatter={(v) => `${v}%`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    tick={{ fontSize: 11, fill: THEME.ink, fontWeight: 700 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v: any) => `${Number(v || 0).toFixed(1)}%`}
                    content={
                      <ChartTooltip formatter={(v: any) => `${Number(v || 0).toFixed(1)}%`} />
                    }
                    cursor={{ fill: THEME.line, opacity: 0.3 }}
                  />
                  <Bar
                    dataKey="return"
                    name="Annualized Return %"
                    radius={[0, 8, 8, 0]}
                    shape={(props) => {
                      const { x, y, width, height, payload } = props;
                      const isPortfolio = payload.name === "Your Portfolio";
                      return (
                        <rect
                          x={x}
                          y={y}
                          width={Math.max(2, Math.abs(width))}
                          height={height}
                          rx={6}
                          fill={isPortfolio ? "var(--accent)" : payload.color || THEME.muted}
                          stroke={isPortfolio ? "var(--ink)" : "none"}
                          strokeWidth={isPortfolio ? 1.5 : 0}
                          style={{
                            filter: isPortfolio
                              ? "drop-shadow(0 2px 8px color-mix(in srgb, var(--accent) 50%, transparent))"
                              : "none",
                          }}
                        />
                      );
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Multi-Horizon Relative Return Heatmap Matrix */}
          <Card style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16,
                marginBottom: 16,
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
                  Multi-Horizon Benchmark Matrix
                </h3>
                <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                  Comprehensive return comparison across 1Y, 3Y, 5Y, and 10Y horizons with active
                  alpha calculation
                </div>
              </div>

              {/* Filters */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {/* Search */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "var(--surface-0)",
                    border: `1.5px solid ${THEME.line}`,
                    borderRadius: 12,
                    padding: "6px 10px",
                    width: 180,
                  }}
                >
                  <Search size={14} color={THEME.muted} />
                  <input
                    type="text"
                    placeholder="Search index..."
                    value={matrixSearch}
                    onChange={(e) => setMatrixSearch(e.target.value)}
                    style={{
                      border: "none",
                      background: "transparent",
                      color: THEME.ink,
                      fontSize: 12,
                      outline: "none",
                      width: "100%",
                    }}
                  />
                </div>

                {/* Category Filter */}
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    background: "var(--surface-0)",
                    border: `1.5px solid ${THEME.line}`,
                    padding: "3px",
                    borderRadius: 12,
                  }}
                >
                  {["all", "Equity", "Debt / Fixed Income", "Commodity", "Macro"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 8,
                        background:
                          selectedCategory === cat
                            ? "color-mix(in srgb, var(--accent) 20%, var(--surface-0))"
                            : "transparent",
                        border: "none",
                        color: selectedCategory === cat ? THEME.ink : THEME.muted,
                        fontSize: 11,
                        fontWeight: selectedCategory === cat ? 700 : 500,
                        cursor: "pointer",
                      }}
                    >
                      {cat === "all" ? "All" : cat.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Matrix Table */}
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "separate",
                  borderSpacing: "0 6px",
                  fontSize: 12.5,
                }}
              >
                <thead>
                  <tr style={{ color: THEME.muted, textAlign: "left" }}>
                    <th style={{ padding: "8px 12px", fontWeight: 700 }}>Benchmark Index</th>
                    <th style={{ padding: "8px 12px", fontWeight: 700 }}>Category</th>
                    <th style={{ padding: "8px 12px", fontWeight: 700, textAlign: "right" }}>
                      1Y Return
                    </th>
                    <th style={{ padding: "8px 12px", fontWeight: 700, textAlign: "right" }}>
                      3Y CAGR
                    </th>
                    <th style={{ padding: "8px 12px", fontWeight: 700, textAlign: "right" }}>
                      5Y CAGR
                    </th>
                    <th style={{ padding: "8px 12px", fontWeight: 700, textAlign: "right" }}>
                      10Y CAGR
                    </th>
                    <th style={{ padding: "8px 12px", fontWeight: 700, textAlign: "right" }}>
                      Alpha ({period.toUpperCase()})
                    </th>
                    <th style={{ padding: "8px 12px", fontWeight: 700, textAlign: "center" }}>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Highlighted Portfolio Row */}
                  <tr
                    style={{
                      background: "color-mix(in srgb, var(--accent) 10%, var(--surface-0))",
                      border: `1.5px solid var(--accent)`,
                      borderRadius: 10,
                      fontWeight: 800,
                    }}
                  >
                    <td style={{ padding: "12px 14px", borderRadius: "10px 0 0 10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            background: "var(--accent)",
                          }}
                        />
                        <span style={{ color: THEME.ink, fontSize: 13 }}>Your Portfolio</span>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 6,
                            background: "var(--accent)",
                            color: THEME.darkInk,
                            fontWeight: 800,
                          }}
                        >
                          YOU
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ color: THEME.muted, fontSize: 11 }}>Blended Multi-Asset</span>
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        textAlign: "right",
                        color: THEME.ink,
                        fontWeight: 800,
                      }}
                    >
                      <Prv>{portfolioReturns.overall.return.toFixed(1)}%</Prv>
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        textAlign: "right",
                        color: THEME.ink,
                        fontWeight: 800,
                      }}
                    >
                      <Prv>{portfolioReturns.overall.return.toFixed(1)}%</Prv>
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        textAlign: "right",
                        color: THEME.ink,
                        fontWeight: 800,
                      }}
                    >
                      <Prv>{portfolioReturns.overall.return.toFixed(1)}%</Prv>
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        textAlign: "right",
                        color: THEME.ink,
                        fontWeight: 800,
                      }}
                    >
                      <Prv>{portfolioReturns.overall.return.toFixed(1)}%</Prv>
                    </td>
                    <td style={{ padding: "12px", textAlign: "right", color: THEME.muted }}>
                      Baseline
                    </td>
                    <td
                      style={{
                        padding: "12px",
                        textAlign: "center",
                        borderRadius: "0 10px 10px 0",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          padding: "3px 8px",
                          borderRadius: 8,
                          background: "var(--surface-0)",
                          border: `1px solid ${THEME.line}`,
                          color: THEME.ink,
                          fontWeight: 700,
                        }}
                      >
                        Target
                      </span>
                    </td>
                  </tr>

                  {/* Benchmark Rows */}
                  {filteredBenchmarks.map((bm) => {
                    const activeBmReturn = bm[periodKey];
                    const alpha = portfolioReturns.overall.return - activeBmReturn;
                    const isOutperforming = alpha >= 0;

                    return (
                      <tr
                        key={bm.id}
                        className="card-lift"
                        style={{
                          background: "var(--surface-0)",
                          borderRadius: 10,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <td style={{ padding: "12px 14px", borderRadius: "10px 0 0 10px" }}>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span
                                style={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  background: bm.color,
                                }}
                              />
                              <span style={{ fontWeight: 700, color: THEME.ink }}>{bm.label}</span>
                            </div>
                            <span
                              style={{
                                fontSize: 10.5,
                                color: THEME.muted,
                                marginLeft: 16,
                                marginTop: 2,
                              }}
                            >
                              {bm.description}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "12px" }}>
                          <span
                            style={{
                              fontSize: 10.5,
                              padding: "2px 8px",
                              borderRadius: 6,
                              background: `color-mix(in srgb, ${bm.color} 12%, transparent)`,
                              color: bm.color,
                              fontWeight: 600,
                            }}
                          >
                            {bm.category}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            textAlign: "right",
                            fontWeight: period === "1y" ? 800 : 500,
                            color: period === "1y" ? THEME.ink : THEME.muted,
                          }}
                        >
                          {bm.return1Y.toFixed(1)}%
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            textAlign: "right",
                            fontWeight: period === "3y" ? 800 : 500,
                            color: period === "3y" ? THEME.ink : THEME.muted,
                          }}
                        >
                          {bm.return3Y.toFixed(1)}%
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            textAlign: "right",
                            fontWeight: period === "5y" ? 800 : 500,
                            color: period === "5y" ? THEME.ink : THEME.muted,
                          }}
                        >
                          {bm.return5Y.toFixed(1)}%
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            textAlign: "right",
                            fontWeight: period === "10y" ? 800 : 500,
                            color: period === "10y" ? THEME.ink : THEME.muted,
                          }}
                        >
                          {bm.return10Y.toFixed(1)}%
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            textAlign: "right",
                            fontWeight: 800,
                            color: isOutperforming ? THEME.sage : THEME.rust,
                          }}
                        >
                          <Prv>
                            {isOutperforming ? "+" : ""}
                            {alpha.toFixed(1)}%
                          </Prv>
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            textAlign: "center",
                            borderRadius: "0 10px 10px 0",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10.5,
                              padding: "3px 8px",
                              borderRadius: 8,
                              background: isOutperforming
                                ? "color-mix(in srgb, var(--sage) 15%, transparent)"
                                : "color-mix(in srgb, var(--rust) 15%, transparent)",
                              color: isOutperforming ? THEME.sage : THEME.rust,
                              fontWeight: 700,
                            }}
                          >
                            {isOutperforming ? "Outperforming" : "Lagging"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* SUB-VIEW 2: ASSET CLASS ATTRIBUTION & DRILLDOWN */}
      {activeTab === "attribution" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Asset Class Cards Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {assetComparison.map((asset) => {
              const alpha = asset.yours - asset.benchmark;
              const isPositive = alpha >= 0;
              return (
                <Card
                  key={asset.category}
                  className="card-lift"
                  style={{
                    padding: 20,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 16,
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 10,
                      }}
                    >
                      <h4
                        style={{
                          margin: 0,
                          fontSize: 15,
                          fontWeight: 800,
                          color: THEME.ink,
                        }}
                      >
                        {asset.category}
                      </h4>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 8,
                          background: isPositive
                            ? "color-mix(in srgb, var(--sage) 15%, transparent)"
                            : "color-mix(in srgb, var(--rust) 15%, transparent)",
                          color: isPositive ? THEME.sage : THEME.rust,
                        }}
                      >
                        {isPositive ? `+${alpha.toFixed(1)}% Alpha` : `${alpha.toFixed(1)}% Alpha`}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        marginBottom: 12,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 11, color: THEME.muted }}>Your Return / CAGR</div>
                        <div
                          style={{
                            fontSize: 22,
                            fontWeight: 800,
                            color: "var(--accent)",
                            letterSpacing: "-0.02em",
                          }}
                        >
                          <Prv>{asset.yours.toFixed(1)}%</Prv>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: THEME.muted }}>
                          {asset.bmLabel} ({period.toUpperCase()})
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 700, color: THEME.ink }}>
                          {asset.benchmark.toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {/* Return comparison bar */}
                    <div
                      style={{
                        height: 6,
                        borderRadius: 3,
                        background: THEME.line,
                        overflow: "hidden",
                        display: "flex",
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${Math.min(100, (asset.yours / (asset.benchmark + 0.01)) * 50)}%`,
                          background: "var(--accent)",
                          borderRadius: 3,
                        }}
                      />
                    </div>
                  </div>

                  {/* Portfolio holding size info */}
                  <div
                    style={{
                      borderTop: `1px solid ${THEME.line}`,
                      paddingTop: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11.5,
                    }}
                  >
                    <span style={{ color: THEME.muted }}>Allocated Holding:</span>
                    <span style={{ fontWeight: 700, color: THEME.ink }}>
                      <Prv>{fmtINRFull(asset.current)}</Prv>
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Asset-wise Side-by-Side Chart */}
          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 20 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 800,
                  color: THEME.ink,
                  letterSpacing: "-0.015em",
                }}
              >
                Asset Class Performance vs Benchmarks
              </h3>
              <div style={{ fontSize: 12, color: THEME.muted }}>
                Side-by-side returns breakdown by asset category · {period.toUpperCase()} benchmark
                horizon
              </div>
            </div>

            <div style={{ width: "100%", height: 320, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={assetComparison}>
                  <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} vertical={false} />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 11.5, fill: THEME.muted, fontWeight: 600 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v: any) => `${Number(v || 0).toFixed(1)}%`}
                    content={
                      <ChartTooltip formatter={(v: any) => `${Number(v || 0).toFixed(1)}%`} />
                    }
                    cursor={{ fill: THEME.line, opacity: 0.3 }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 14 }}
                    formatter={(value: string) => (
                      <span style={{ color: THEME.ink, fontWeight: 700 }}>{value}</span>
                    )}
                  />
                  <Bar
                    dataKey="yours"
                    name="Your Return %"
                    fill="var(--accent)"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="benchmark"
                    name="Benchmark %"
                    fill={`color-mix(in srgb, var(--accent) 35%, transparent)`}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      )}

      {/* SUB-VIEW 3: WEALTH GROWTH & PURCHASING POWER SIMULATOR */}
      {activeTab === "simulator" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
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
                  Wealth Compounding & Inflation Erosion Visualizer
                </h3>
                <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                  Simulate long-term purchasing power expansion of your current return profile vs
                  market alternatives
                </div>
              </div>

              {/* Capital Preset Selector */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11.5, color: THEME.muted, fontWeight: 600 }}>
                  Simulated Capital:
                </span>
                {[
                  { label: "₹1 Lakh", val: 100000 },
                  { label: "₹10 Lakhs", val: 1000000 },
                  { label: "₹50 Lakhs", val: 5000000 },
                  {
                    label: "Portfolio",
                    val: Math.max(100000, Math.round(portfolioReturns.overall.current)),
                  },
                ].map((preset) => {
                  const active = simCapital === preset.val;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => setSimCapital(preset.val)}
                      className="card-lift"
                      style={{
                        padding: "5px 12px",
                        borderRadius: 10,
                        background: active ? "var(--accent)" : "var(--surface-0)",
                        border: `1.5px solid ${active ? "var(--accent)" : THEME.line}`,
                        color: active ? THEME.darkInk : THEME.ink,
                        fontSize: 11.5,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Area Chart of Projections */}
            <div style={{ width: "100%", height: 340, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={simulationTimeline}>
                  <defs>
                    <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="niftyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="fdGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.gold} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={THEME.gold} stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="inflGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.rust} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={THEME.rust} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 11.5, fill: THEME.muted, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => fmtINRFull(v)}
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v: any) => fmtINRFull(Number(v || 0))}
                    content={
                      <ChartTooltip formatter={(v: any) => fmtINRFull(Number(v || 0))} />
                    }
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 14 }}
                    formatter={(value: string) => (
                      <span style={{ color: THEME.ink, fontWeight: 700 }}>{value}</span>
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="userVal"
                    name={`Your Portfolio (${portfolioReturns.overall.return.toFixed(1)}%)`}
                    stroke="var(--accent)"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#userGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="niftyVal"
                    name={`Nifty 50 (${BENCHMARK_REGISTRY.nifty50.return5Y}%)`}
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#niftyGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="fdVal"
                    name={`Fixed Deposit (${BENCHMARK_REGISTRY.fdRate.return5Y}%)`}
                    stroke={THEME.gold}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#fdGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="inflVal"
                    name={`CPI Inflation (${BENCHMARK_REGISTRY.inflation.return5Y}%)`}
                    stroke={THEME.rust}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#inflGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Summary Highlights Matrix */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 14,
                marginTop: 24,
              }}
            >
              {[
                {
                  horizon: "10-Year Portfolio Value",
                  val: simulationTimeline[4]?.userVal || 0,
                  color: "var(--accent)",
                  sub: "Compounded wealth accumulation",
                },
                {
                  horizon: "10-Year Nifty 50 Value",
                  val: simulationTimeline[4]?.niftyVal || 0,
                  color: "#6366f1",
                  sub: "Passive market benchmark",
                },
                {
                  horizon: "10-Year Fixed Deposit",
                  val: simulationTimeline[4]?.fdVal || 0,
                  color: THEME.gold,
                  sub: "Guaranteed nominal return",
                },
                {
                  horizon: "10-Year Inflation Hurdle",
                  val: simulationTimeline[4]?.inflVal || 0,
                  color: THEME.rust,
                  sub: "Cost of living preservation line",
                },
              ].map((item) => (
                <div
                  key={item.horizon}
                  className="card-lift"
                  style={{
                    padding: "14px 18px",
                    borderRadius: 14,
                    background: "var(--surface-0)",
                    border: `1.5px solid ${THEME.line}`,
                  }}
                >
                  <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 4 }}>
                    {item.horizon}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: item.color }}>
                    <Prv>{fmtINRFull(item.val)}</Prv>
                  </div>
                  <div style={{ fontSize: 10.5, color: THEME.muted, marginTop: 2 }}>{item.sub}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* SUB-VIEW 4: FINANCIAL HEALTH & RESILIENCE RADAR */}
      {activeTab === "health" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(var(--grid-min-lg), 1fr))",
              gap: 16,
            }}
          >
            {/* Radar Card */}
            <Card style={{ padding: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 800,
                      color: THEME.ink,
                      letterSpacing: "-0.015em",
                    }}
                  >
                    Financial Health Radar
                  </h3>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 10,
                      background: `color-mix(in srgb, ${scoreColor} 15%, transparent)`,
                      color: scoreColor,
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {overallScore}/100 · {scoreLabel}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: THEME.muted }}>
                  Multi-dimensional financial resilience scoring across 6 key pillars
                </div>
              </div>

              <div style={{ width: "100%", height: 320, position: "relative" }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <RadarChart data={healthScore} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke={THEME.line} strokeOpacity={0.8} />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fontSize: 11, fill: THEME.ink, fontWeight: 700 }}
                    />
                    <PolarRadiusAxis
                      angle={30}
                      domain={[0, 100]}
                      tick={{ fontSize: 9.5, fill: THEME.muted, fontWeight: 600 }}
                      axisLine={false}
                    />
                    <Radar
                      name="Your Score"
                      dataKey="score"
                      stroke="var(--accent)"
                      fill="var(--accent)"
                      fillOpacity={0.2}
                      strokeWidth={2.5}
                    />
                    <Tooltip
                      formatter={(v: any) => `${Math.round(Number(v || 0))}/100`}
                      content={
                        <ChartTooltip
                          formatter={(v: any) => `${Math.round(Number(v || 0))}/100`}
                        />
                      }
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Detailed Scores & Actionable Tips */}
            <Card style={{ padding: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 18 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 800,
                    color: THEME.ink,
                    letterSpacing: "-0.015em",
                  }}
                >
                  Score Breakdown & Optimization
                </h3>
                <div style={{ fontSize: 12, color: THEME.muted }}>
                  Detailed health metrics and actionable recommendations
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {healthScore.map((h) => {
                  const color = h.score >= 70 ? THEME.sage : h.score >= 40 ? THEME.gold : THEME.rust;
                  return (
                    <div
                      key={h.metric}
                      className="card-lift"
                      style={{
                        padding: "12px 16px",
                        borderRadius: 14,
                        background: "var(--surface-0)",
                        border: `1.5px solid ${THEME.line}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 6,
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                          {h.metric}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 800, color }}>
                          {Math.round(h.score)}/100
                        </span>
                      </div>

                      <div
                        style={{
                          height: 6,
                          borderRadius: 3,
                          background: `color-mix(in srgb, ${THEME.line} 80%, transparent)`,
                          overflow: "hidden",
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(100, Math.max(0, h.score))}%`,
                            borderRadius: 3,
                            background: color,
                            transition: "width 0.5s",
                          }}
                        />
                      </div>

                      <div style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.4 }}>
                        {h.tip}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* SUB-VIEW 5: CUSTOM TARGET BENCHMARK BUILDER */}
      {activeTab === "custom" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 800,
                    color: THEME.ink,
                    letterSpacing: "-0.015em",
                  }}
                >
                  Custom Blended Benchmark Builder
                </h3>
                <button
                  onClick={() => setCustomWeights({ equity: 60, debt: 25, gold: 10, cash: 5 })}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 10,
                    background: "var(--surface-0)",
                    border: `1.5px solid ${THEME.line}`,
                    color: THEME.ink,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <RefreshCw size={11} /> Reset 60:25:10:5
                </button>
              </div>
              <div style={{ fontSize: 12, color: THEME.muted }}>
                Construct a personalized benchmark index mirroring your custom target asset
                allocation
              </div>
            </div>

            {/* Sliders & Active Metrics */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 20,
              }}
            >
              {/* Sliders Column */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  {
                    key: "equity",
                    label: "Equity Allocation (Nifty 50)",
                    val: customWeights.equity,
                    rate: BENCHMARK_REGISTRY.nifty50[periodKey],
                    color: "var(--accent)",
                  },
                  {
                    key: "debt",
                    label: "Fixed Income (SBI FD Rate)",
                    val: customWeights.debt,
                    rate: BENCHMARK_REGISTRY.fdRate[periodKey],
                    color: THEME.gold,
                  },
                  {
                    key: "gold",
                    label: "Precious Metals (Gold Spot)",
                    val: customWeights.gold,
                    rate: BENCHMARK_REGISTRY.gold[periodKey],
                    color: THEME.violet,
                  },
                  {
                    key: "cash",
                    label: "Cash & Liquid (Savings Rate)",
                    val: customWeights.cash,
                    rate: 3.5,
                    color: THEME.sage,
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 14,
                      background: "var(--surface-0)",
                      border: `1.5px solid ${THEME.line}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 8,
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                        {item.label}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: item.color }}>
                        {item.val}% (CAGR: {item.rate.toFixed(1)}%)
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={item.val}
                      onChange={(e) =>
                        setCustomWeights({
                          ...customWeights,
                          [item.key]: Number(e.target.value),
                        })
                      }
                      style={{
                        width: "100%",
                        accentColor: "var(--accent)",
                        cursor: "pointer",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Result Summary Column */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 16,
                  padding: 20,
                  borderRadius: 16,
                  background: "color-mix(in srgb, var(--accent) 8%, var(--surface-0))",
                  border: `1.5px solid var(--accent)`,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, marginBottom: 4 }}>
                    Tailored Blended Target Return ({period.toUpperCase()})
                  </div>
                  <div
                    style={{
                      fontSize: 32,
                      fontWeight: 800,
                      color: THEME.ink,
                      letterSpacing: "-0.03em",
                      marginBottom: 12,
                    }}
                  >
                    {customTargetCAGR.toFixed(1)}% CAGR
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 14px",
                      borderRadius: 12,
                      background:
                        customTrackingAlpha >= 0
                          ? "color-mix(in srgb, var(--sage) 20%, var(--surface-0))"
                          : "color-mix(in srgb, var(--rust) 20%, var(--surface-0))",
                      border: `1px solid ${customTrackingAlpha >= 0 ? THEME.sage : THEME.rust}`,
                      color: customTrackingAlpha >= 0 ? THEME.sage : THEME.rust,
                      fontSize: 13,
                      fontWeight: 800,
                      marginBottom: 16,
                    }}
                  >
                    {customTrackingAlpha >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <span>
                      {customTrackingAlpha >= 0
                        ? `+${customTrackingAlpha.toFixed(1)}% Active Alpha vs Custom Target`
                        : `${customTrackingAlpha.toFixed(1)}% Lag vs Custom Target`}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.5 }}>
                    Your actual portfolio is delivering{" "}
                    <strong>{portfolioReturns.overall.return.toFixed(1)}% CAGR</strong>. Comparing it
                    against this bespoke target index ensures your performance reflects your personal
                    risk tolerance and asset allocation plan.
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: THEME.muted,
                    fontStyle: "italic",
                    borderTop: `1px solid ${THEME.line}`,
                    paddingTop: 10,
                  }}
                >
                  Calculated using long-run historical averages for Indian asset classes as of{" "}
                  {BENCHMARK_DATA_ASOF}.
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
