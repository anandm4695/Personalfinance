import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Zap,
  ChevronDown,
  ChevronUp,
  Check,
  Award,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ShieldCheck,
  Sparkles,
  Layers,
  Percent,
  Activity,
  Compass,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Bar,
  ComposedChart,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINRFull, fmtINR, today } from "../../utils/finance";
import { computeNetWorthAsOf, getEarliestNetWorthMonth, nextYm } from "../../utils/netWorthAsOf";
import { Card } from "../ui/Card";
import { StatCard } from "../ui/StatCard";
import { SectionTitle } from "../ui/SectionTitle";
import { Badge } from "../ui/Badge";
import { usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { EmptyState } from "../ui/EmptyState";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const formatMonth = (ym: string) => {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} '${y.slice(-2)}`;
};

const formatFullMonthYear = (ym: string) => {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
};

type TimeframeFilter = "1Y" | "3Y" | "5Y" | "YTD" | "ALL";
type ChartViewMode = "trajectory" | "breakdown" | "allocation";

interface ProjectionPreset {
  label: string;
  returnRate: number;
  inflationRate: number;
  description: string;
}

const projectionPresets: ProjectionPreset[] = [
  { label: "Conservative", returnRate: 8, inflationRate: 6, description: "Debt/FD heavy, steady compounding" },
  { label: "Balanced", returnRate: 12, inflationRate: 6, description: "Balanced Equity & Debt (Nifty 50 blend)" },
  { label: "Aggressive", returnRate: 15, inflationRate: 6, description: "High equity/midcap growth focus" },
  { label: "Custom", returnRate: 12, inflationRate: 6, description: "User-defined custom parameters" },
];

const MILESTONE_DEFINITIONS = [
  { target: 10_00_000, title: "Seed Capital", icon: Sparkles, desc: "First ₹10 Lakhs accumulated" },
  { target: 25_00_000, title: "Quarter Crore", icon: ShieldCheck, desc: "Strong financial foundation" },
  { target: 50_00_000, title: "Half Crore Club", icon: Award, desc: "Significant wealth milestone" },
  { target: 1_00_00_000, title: "Crorepati", icon: Award, desc: "Eight-figure wealth milestone" },
  { target: 2_00_00_000, title: "Double Crorepati", icon: Award, desc: "Exponential wealth growth" },
  { target: 5_00_00_000, title: "High Net Worth (HNW)", icon: Award, desc: "₹5 Crore milestone" },
  { target: 10_00_00_000, title: "Decacrore Elite", icon: Award, desc: "Top tier wealth & complete independence" },
  { target: 25_00_00_000, title: "Multi-Decacrore", icon: Award, desc: "Generational wealth tier" },
  { target: 50_00_00_000, title: "Ultra HNW (UHNW)", icon: Award, desc: "Ultra-high net worth status" },
  { target: 100_00_00_000, title: "Century Club (100 Cr)", icon: Award, desc: "Legendary ₹100 Crore milestone" },
];

// ── Custom Tooltip for Recharts ────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const isAllocation = payload.some((p: any) => p.dataKey && p.dataKey.endsWith("Pct"));
  const isBreakdown =
    !isAllocation &&
    payload.some(
      (p: any) =>
        p.dataKey !== "netWorth" &&
        p.dataKey !== "delta" &&
        p.dataKey !== "rolling3m" &&
        p.dataKey !== "nominal" &&
        p.dataKey !== "real" &&
        p.dataKey !== "capital"
    );
  const isMonthlyChange = payload[0]?.dataKey === "delta" || payload[0]?.dataKey === "rolling3m";
  const isProjection = payload[0]?.dataKey === "nominal" || payload[0]?.dataKey === "real";

  let totalValue = 0;
  if (isBreakdown) {
    totalValue = payload.reduce((sum: number, entry: any) => sum + (Number(entry.value) || 0), 0);
  }

  return (
    <div
      style={{
        background: "color-mix(in srgb, var(--surface-0) 95%, transparent)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1.5px solid var(--t-line)`,
        borderRadius: "14px",
        padding: "14px 16px",
        boxShadow: "var(--shadow-xl)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        minWidth: "250px",
        zIndex: 100,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 800,
          color: "var(--t-muted)",
          borderBottom: `1px solid var(--t-line)`,
          paddingBottom: "6px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>{label}</span>
        <Badge variant="muted" size="xs">
          {isProjection
            ? "Forecast"
            : isMonthlyChange
              ? "MoM Velocity"
              : isAllocation
                ? "Asset Mix %"
                : isBreakdown
                  ? "Asset Breakdown"
                  : "Net Worth"}
        </Badge>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {payload.map((entry: any, index: number) => {
          let color = entry.color || entry.stroke || entry.fill;
          if (entry.dataKey === "cash" || entry.dataKey === "cashPct") color = "var(--t-violet)";
          else if (entry.dataKey === "equity" || entry.dataKey === "equityPct") color = "var(--t-chart-1)";
          else if (entry.dataKey === "debt" || entry.dataKey === "debtPct") color = "var(--t-chart-2)";
          else if (entry.dataKey === "realEstate" || entry.dataKey === "realEstatePct") color = "var(--t-chart-6)";
          else if (entry.dataKey === "vehicles" || entry.dataKey === "vehiclesPct") color = "var(--t-pink)";
          else if (entry.dataKey === "other" || entry.dataKey === "otherPct") color = "var(--t-cyan)";
          else if (entry.dataKey === "netWorth") color = "var(--t-accent)";
          else if (entry.dataKey === "delta")
            color = entry.value >= 0 ? "var(--t-sage)" : "var(--t-rust)";
          else if (entry.dataKey === "rolling3m") color = "var(--t-gold)";
          else if (entry.dataKey === "nominal") color = "var(--t-accent)";
          else if (entry.dataKey === "real") color = "var(--t-gold)";
          else if (entry.dataKey === "capital") color = "var(--t-muted)";

          const pct =
            isBreakdown && totalValue > 0
              ? ` (${((entry.value / totalValue) * 100).toFixed(1)}%)`
              : "";

          const formattedValue = isAllocation
            ? `${Number(entry.value).toFixed(1)}%`
            : entry.dataKey === "rolling3m"
              ? `Avg ${fmtINRFull(entry.value)}`
              : null;

          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: color,
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--t-ink)" }}>
                  {entry.name}
                  {pct && (
                    <span style={{ fontSize: "11px", color: "var(--t-muted)", fontWeight: 500 }}>
                      {pct}
                    </span>
                  )}
                </span>
              </div>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color:
                    entry.dataKey === "delta"
                      ? entry.value >= 0
                        ? "var(--t-sage)"
                        : "var(--t-rust)"
                      : "var(--t-ink)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formattedValue ? (
                  formattedValue
                ) : (
                  <Money
                    value={entry.value}
                    variant="full"
                  />
                )}
              </span>
            </div>
          );
        })}

        {isBreakdown && totalValue > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              borderTop: `1px solid var(--t-line)`,
              paddingTop: "6px",
              marginTop: "2px",
            }}
          >
            <span style={{ fontSize: "12px", fontWeight: 800, color: "var(--t-ink)" }}>
              Total Portfolio
            </span>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: "var(--t-accent)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <Money value={totalValue} variant="full" />
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

interface NetWorthTimelineTabProps {
  state: any;
  metrics: any;
  marketData?: any;
  activeProfile?: string;
}

export const NetWorthTimelineTab: React.FC<NetWorthTimelineTabProps> = ({
  state,
  metrics,
  marketData,
  activeProfile = "all",
}) => {
  const { privacyMode } = usePrivacy();

  // ── State for Interactive Controls ──────────────────────────────────────────
  const [timeframe, setTimeframe] = useState<TimeframeFilter>("ALL");
  const [viewMode, setChartViewMode] = useState<ChartViewMode>("trajectory");
  const [isLogScale, setIsLogScale] = useState(false);
  const [showAnnualMatrix, setShowAnnualMatrix] = useState(false);
  const [deltaMetricMode, setDeltaMetricMode] = useState<"absolute" | "percentage">("absolute");

  // Time Machine States
  const [projectionYears, setProjectionYears] = useState(10);
  const [selectedPreset, setSelectedPreset] = useState(1);
  const [customReturnRate, setCustomReturnRate] = useState(12);
  const [customInflationRate, setCustomInflationRate] = useState(6);
  const [monthlySavings, setMonthlySavings] = useState(
    metrics?.monthIncome > 0
      ? Math.max(10000, Math.round((metrics.monthIncome - metrics.monthExpense) * 0.8))
      : 50000
  );
  const [stepUpPct, setStepUpPct] = useState(5); // Annual SIP Step-up %

  // ── 1. Reconstruct Complete History ─────────────────────────────────────────
  const NAMED_CATEGORIES = new Set([
    "Bank Cash",
    "Stocks",
    "Mutual Funds",
    "Fixed Deposits",
    "Real Estate",
    "Vehicles",
  ]);

  const rawHistory = useMemo(() => {
    const todayYm = today().slice(0, 7);
    const startYm = getEarliestNetWorthMonth(state);
    const findVal = (breakdown: any[], name: string) =>
      breakdown.find((x: any) => x.name === name)?.value || 0;

    const points = [];
    let cursor = startYm;

    while (cursor <= todayYm) {
      const { netWorth, assetBreakdown } = computeNetWorthAsOf(
        state,
        cursor,
        marketData,
        activeProfile
      );
      const other = assetBreakdown
        .filter((x) => !NAMED_CATEGORIES.has(x.name))
        .reduce((s, x) => s + x.value, 0);

      const cash = findVal(assetBreakdown, "Bank Cash");
      const equity = findVal(assetBreakdown, "Stocks") + findVal(assetBreakdown, "Mutual Funds");
      const debt = findVal(assetBreakdown, "Fixed Deposits");
      const realEstate = findVal(assetBreakdown, "Real Estate");
      const vehicles = findVal(assetBreakdown, "Vehicles");

      const totalAssets = Math.max(1, cash + equity + debt + realEstate + vehicles + other);

      points.push({
        month: cursor,
        label: formatMonth(cursor),
        fullLabel: formatFullMonthYear(cursor),
        netWorth,
        cash,
        equity,
        debt,
        realEstate,
        vehicles,
        other,
        // Normalized allocation percentages (for 100% stacked chart)
        cashPct: (cash / totalAssets) * 100,
        equityPct: (equity / totalAssets) * 100,
        debtPct: (debt / totalAssets) * 100,
        realEstatePct: (realEstate / totalAssets) * 100,
        vehiclesPct: (vehicles / totalAssets) * 100,
        otherPct: (other / totalAssets) * 100,
      });

      cursor = nextYm(cursor);
    }
    return points;
  }, [state, marketData, activeProfile]);

  // ── 2. Timeframe Filtered History ──────────────────────────────────────────
  const history = useMemo(() => {
    if (rawHistory.length === 0) return [];
    if (timeframe === "ALL") return rawHistory;

    const currentYear = new Date().getFullYear();

    let monthsToTake = rawHistory.length;
    if (timeframe === "1Y") monthsToTake = 12;
    else if (timeframe === "3Y") monthsToTake = 36;
    else if (timeframe === "5Y") monthsToTake = 60;
    else if (timeframe === "YTD") {
      const startOfYearYm = `${currentYear}-01`;
      return rawHistory.filter((h) => h.month >= startOfYearYm);
    }

    return rawHistory.slice(-monthsToTake);
  }, [rawHistory, timeframe]);

  // ── 3. Month-over-Month Deltas & Velocity ────────────────────────────────────
  const momDeltas = useMemo(() => {
    if (history.length < 2) return [];
    return history.slice(1).map((h, i) => {
      const prev = history[i];
      const delta = h.netWorth - prev.netWorth;
      const pctChange = prev.netWorth > 0 ? (delta / prev.netWorth) * 100 : 0;

      // Calculate 3-month rolling average delta for momentum trendline
      const prevPoints = history.slice(Math.max(0, i - 1), i + 2);
      let rollingSum = 0;
      for (let j = 1; j < prevPoints.length; j++) {
        rollingSum += prevPoints[j].netWorth - prevPoints[j - 1].netWorth;
      }
      const rolling3m = prevPoints.length > 1 ? rollingSum / (prevPoints.length - 1) : delta;

      return {
        label: h.label,
        fullLabel: h.fullLabel,
        month: h.month,
        netWorth: h.netWorth,
        delta,
        pctChange,
        rolling3m: Math.round(rolling3m),
      };
    });
  }, [history]);

  // ── 4. Key Performance Stats & Intelligence ────────────────────────────────
  const stats = useMemo(() => {
    if (rawHistory.length === 0) return null;
    const firstAll = rawHistory[0];
    const last = rawHistory[rawHistory.length - 1];
    const currentNW = metrics?.netWorth || last.netWorth || 0;

    const totalGrowthAll = currentNW - firstAll.netWorth;
    const totalMonthsAll = Math.max(1, rawHistory.length - 1);
    const avgMonthlyAll = totalMonthsAll > 0 ? totalGrowthAll / totalMonthsAll : 0;

    // CAGR calculation (requires positive inception net worth)
    const cagr =
      totalMonthsAll > 0 && firstAll.netWorth > 0
        ? (Math.pow(Math.max(1, currentNW) / firstAll.netWorth, 12 / totalMonthsAll) - 1) * 100
        : null;

    // Wealth Doubling Time via Rule of 72
    let doublingYears: number | null = null;
    if (cagr && cagr > 0) {
      doublingYears = parseFloat((72 / cagr).toFixed(1));
    }

    // All-Time High (ATH) and Peak Drawdown
    let athValue = 0;
    let athMonth = "";
    rawHistory.forEach((pt) => {
      if (pt.netWorth > athValue) {
        athValue = pt.netWorth;
        athMonth = pt.label;
      }
    });

    const isAtAth = currentNW >= athValue;
    const drawdownPct =
      athValue > 0 && !isAtAth ? ((athValue - currentNW) / athValue) * 100 : 0;
    const drawdownAmount = athValue > currentNW ? athValue - currentNW : 0;

    // Best and Worst months
    const allDeltas =
      rawHistory.length > 1
        ? rawHistory.slice(1).map((h, i) => ({
            label: h.label,
            month: h.month,
            delta: h.netWorth - rawHistory[i].netWorth,
            pctChange:
              rawHistory[i].netWorth > 0
                ? ((h.netWorth - rawHistory[i].netWorth) / rawHistory[i].netWorth) * 100
                : 0,
          }))
        : [];

    const bestMonth =
      allDeltas.length > 0
        ? allDeltas.reduce((a, b) => (b.delta > a.delta ? b : a), allDeltas[0])
        : null;

    // Trailing 12-month (YoY) Change
    let yoyDelta = 0;
    let yoyPct = 0;
    if (rawHistory.length >= 13) {
      const pt12MoAgo = rawHistory[rawHistory.length - 13];
      yoyDelta = currentNW - pt12MoAgo.netWorth;
      yoyPct = pt12MoAgo.netWorth > 0 ? (yoyDelta / pt12MoAgo.netWorth) * 100 : 0;
    } else if (rawHistory.length > 1) {
      yoyDelta = currentNW - rawHistory[0].netWorth;
      yoyPct = rawHistory[0].netWorth > 0 ? (yoyDelta / rawHistory[0].netWorth) * 100 : 0;
    }

    return {
      currentNW,
      totalGrowthAll,
      avgMonthlyAll,
      cagr,
      doublingYears,
      athValue,
      athMonth,
      isAtAth,
      drawdownPct,
      drawdownAmount,
      bestMonth,
      yoyDelta,
      yoyPct,
      months: totalMonthsAll,
    };
  }, [rawHistory, metrics?.netWorth]);

  // ── 5. Annual Performance Matrix ───────────────────────────────────────────
  const annualMatrix = useMemo(() => {
    if (rawHistory.length === 0) return [];
    const byYear: Record<string, typeof rawHistory> = {};

    rawHistory.forEach((pt) => {
      const year = pt.month.split("-")[0];
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(pt);
    });

    const years = Object.keys(byYear).sort().reverse();
    return years.map((year) => {
      const points = byYear[year];
      const startPt = points[0];
      const endPt = points[points.length - 1];
      const netAddition = endPt.netWorth - startPt.netWorth;
      const growthPct = startPt.netWorth > 0 ? (netAddition / startPt.netWorth) * 100 : 0;

      let bestMonthOfYear: { label: string; delta: number } | null = null;
      for (let i = 1; i < points.length; i++) {
        const d = points[i].netWorth - points[i - 1].netWorth;
        if (!bestMonthOfYear || d > bestMonthOfYear.delta) {
          bestMonthOfYear = { label: points[i].label, delta: d };
        }
      }

      return {
        year,
        startNW: startPt.netWorth,
        endNW: endPt.netWorth,
        netAddition,
        growthPct,
        bestMonth: bestMonthOfYear,
        monthsTracked: points.length,
      };
    });
  }, [rawHistory]);

  // ── 6. Interactive Future Simulation (What-If Engine) ───────────────────────
  const effectiveReturnRate =
    selectedPreset === 3 ? customReturnRate : projectionPresets[selectedPreset].returnRate;
  const effectiveInflationRate =
    selectedPreset === 3 ? customInflationRate : projectionPresets[selectedPreset].inflationRate;

  const projection = useMemo(() => {
    const currentNW = metrics?.netWorth || (history[history.length - 1]?.netWorth ?? 0);
    const monthlyReturn = effectiveReturnRate / 100 / 12;
    const monthlyInflation = effectiveInflationRate / 100 / 12;
    const months = projectionYears * 12;
    const points = [];
    const now = new Date();

    let accumulatedNominal = currentNW;
    let totalCapitalAdded = 0;

    for (let i = 0; i <= months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

      if (i > 0) {
        const yearIndex = Math.floor((i - 1) / 12);
        const currentMonthlySIP = monthlySavings * Math.pow(1 + stepUpPct / 100, yearIndex);

        accumulatedNominal = (accumulatedNominal + currentMonthlySIP) * (1 + monthlyReturn);
        totalCapitalAdded += currentMonthlySIP;
      }

      const realValue = accumulatedNominal / Math.pow(1 + monthlyInflation, i);

      points.push({
        label: formatMonth(ym),
        month: ym,
        yearNum: Math.floor(i / 12),
        nominal: Math.round(accumulatedNominal),
        real: Math.round(realValue),
        capital: Math.round(currentNW + totalCapitalAdded),
      });
    }
    return points;
  }, [
    metrics?.netWorth,
    history,
    projectionYears,
    effectiveReturnRate,
    effectiveInflationRate,
    monthlySavings,
    stepUpPct,
  ]);

  // Projection Summary Highlights
  const projectionFinal = projection[projection.length - 1] || { nominal: 0, real: 0, capital: 0 };
  const wealthMultiplier =
    stats?.currentNW && stats.currentNW > 0
      ? (projectionFinal.nominal / stats.currentNW).toFixed(1)
      : "1.0";
  const compoundGainsProjected = Math.max(0, projectionFinal.nominal - projectionFinal.capital);

  // ── 7. Milestones with Historical Achievement Detection ────────────────────
  const milestones = useMemo(() => {
    const currentNW = metrics?.netWorth || (history[history.length - 1]?.netWorth ?? 0);
    const monthlyReturn = effectiveReturnRate / 100 / 12;
    const maxMonths = 50 * 12;

    return MILESTONE_DEFINITIONS.map((def) => {
      let achievedDate = "";
      const historicalHit = rawHistory.find((pt) => pt.netWorth >= def.target);
      if (historicalHit) {
        achievedDate = historicalHit.fullLabel;
      }

      const achieved = currentNW >= def.target;

      let eta = "";
      if (!achieved) {
        const hitInChart = projection.find((p) => p.nominal >= def.target);
        if (hitInChart) {
          eta = hitInChart.label;
        } else if (monthlyReturn > 0 || monthlySavings > 0) {
          let testVal = currentNW;
          for (let i = 1; i <= maxMonths; i++) {
            const yIdx = Math.floor((i - 1) / 12);
            const sip = monthlySavings * Math.pow(1 + stepUpPct / 100, yIdx);
            testVal = (testVal + sip) * (1 + monthlyReturn);
            if (testVal >= def.target) {
              const years = Math.ceil(i / 12);
              eta = `~${years} yr${years > 1 ? "s" : ""}`;
              break;
            }
          }
          if (!eta) eta = "30+ years";
        }
      }

      return {
        ...def,
        achieved,
        achievedDate,
        eta,
      };
    });
  }, [
    metrics?.netWorth,
    history,
    rawHistory,
    projection,
    effectiveReturnRate,
    monthlySavings,
    stepUpPct,
  ]);

  const nextTargetMilestone = milestones.find((m) => !m.achieved);
  const nextProgressPct =
    nextTargetMilestone && stats?.currentNW
      ? Math.min(100, Math.max(0, Math.round((stats.currentNW / nextTargetMilestone.target) * 100)))
      : 100;
  const nextShortfall =
    nextTargetMilestone && stats?.currentNW
      ? Math.max(0, nextTargetMilestone.target - stats.currentNW)
      : 0;

  // ── 8. Count-Up Animations for Key Values ──────────────────────────────────
  const animatedNetWorth = useAnimatedNumber(stats?.currentNW || 0);
  const animatedProjectedNominal = useAnimatedNumber(projectionFinal.nominal);
  const animatedProjectedReal = useAnimatedNumber(projectionFinal.real);
  const animatedCapital = useAnimatedNumber(projectionFinal.capital);

  if (rawHistory.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Net Worth Timeline"
        description="Your wealth journey history will build automatically as you add assets, accounts, and investments."
      />
    );
  }

  const latestDelta = momDeltas.length > 0 ? momDeltas[momDeltas.length - 1] : null;
  const nwSparkline = history.map((h) => h.netWorth);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 32 }}>
      {/* ── Executive Header ─────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <SectionTitle sub="Holistic multi-asset wealth progression, velocity metrics, and future compounding simulator">
            Net Worth Timeline
          </SectionTitle>
        </div>

        {/* Global Timeframe Range Selector */}
        <div
          role="group"
          aria-label="Timeframe Range"
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "var(--surface-1)",
            padding: "4px",
            borderRadius: "var(--radius-lg)",
            border: `1.5px solid var(--t-line)`,
            gap: "2px",
          }}
        >
          {(["1Y", "3Y", "5Y", "YTD", "ALL"] as TimeframeFilter[]).map((tf) => {
            const isActive = timeframe === tf;
            return (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                aria-pressed={isActive}
                style={{
                  padding: "6px 14px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: isActive ? "var(--surface-0)" : "transparent",
                  color: isActive ? "var(--t-ink)" : "var(--t-muted)",
                  fontWeight: 700,
                  fontSize: "12px",
                  cursor: "pointer",
                  boxShadow: isActive ? "var(--shadow-sm)" : "none",
                  transition: "all 0.2s var(--ease-premium)",
                }}
              >
                {tf}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Hero Wealth Command Card ─────────────────────────────────────────── */}
      <Card
        variant="base"
        style={{
          padding: "clamp(20px, 3.5vw, 32px)",
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--surface-0) 94%, var(--t-accent) 6%), var(--surface-0))",
          border: `1px solid var(--t-line)`,
          borderTop: `4px solid var(--t-accent)`,
          borderRadius: "var(--radius-xl)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--t-muted)",
            }}
          >
            <TrendingUp size={15} color="var(--t-accent)" /> Total Household Net Worth
          </div>

          {stats?.isAtAth ? (
            <Badge variant="sage" style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Sparkles size={12} /> All-Time High (Peak Wealth)
            </Badge>
          ) : (
            stats && (
              <Badge variant="gold" style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Activity size={12} /> -{stats.drawdownPct.toFixed(1)}% from ATH ({stats.athMonth})
              </Badge>
            )
          )}
        </div>

        {/* Big Net Worth Number */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(36px, 5.5vw, 56px)",
              fontWeight: 900,
              color: "var(--t-ink)",
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <Money value={animatedNetWorth} variant="full" />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            {latestDelta && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: "10px",
                  background:
                    latestDelta.delta >= 0
                      ? "color-mix(in srgb, var(--t-sage) 12%, transparent)"
                      : "color-mix(in srgb, var(--t-rust) 12%, transparent)",
                  border: `1px solid ${latestDelta.delta >= 0 ? "color-mix(in srgb, var(--t-sage) 25%, transparent)" : "color-mix(in srgb, var(--t-rust) 25%, transparent)"}`,
                }}
              >
                {latestDelta.delta >= 0 ? (
                  <ArrowUpRight size={14} color="var(--t-sage)" />
                ) : (
                  <ArrowDownRight size={14} color="var(--t-rust)" />
                )}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: latestDelta.delta >= 0 ? "var(--t-sage)" : "var(--t-rust)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {latestDelta.delta >= 0 ? "+" : ""}
                  <Money value={Math.abs(latestDelta.delta)} variant="full" /> (
                  {latestDelta.pctChange >= 0 ? "+" : ""}
                  {latestDelta.pctChange.toFixed(1)}%)
                </span>
                <span style={{ fontSize: 11, color: "var(--t-muted)", fontWeight: 600 }}>MoM</span>
              </div>
            )}

            {stats && stats.yoyDelta !== 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: "10px",
                  background:
                    stats.yoyDelta >= 0
                      ? "color-mix(in srgb, var(--t-sage) 8%, var(--surface-1))"
                      : "color-mix(in srgb, var(--t-rust) 8%, var(--surface-1))",
                  border: `1px solid var(--t-line)`,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: stats.yoyDelta >= 0 ? "var(--t-sage)" : "var(--t-rust)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {stats.yoyDelta >= 0 ? "+" : ""}
                  <Money value={Math.abs(stats.yoyDelta)} variant="full" /> (
                  {stats.yoyPct >= 0 ? "+" : ""}
                  {stats.yoyPct.toFixed(1)}%)
                </span>
                <span style={{ fontSize: 11, color: "var(--t-muted)", fontWeight: 600 }}>1-Yr YoY</span>
              </div>
            )}
          </div>
        </div>

        {/* Next Milestone Sub-Bar inside Hero */}
        {nextTargetMilestone && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              padding: "12px 16px",
              borderRadius: "12px",
              background: "color-mix(in srgb, var(--surface-1) 75%, transparent)",
              border: `1px solid var(--t-line)`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 12,
                fontWeight: 700,
                color: "var(--t-ink)",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Target size={14} color="var(--t-accent)" /> Next Milestone:{" "}
                <span style={{ color: "var(--t-accent)" }}>{nextTargetMilestone.title}</span> (
                <Money value={nextTargetMilestone.target} variant="full" />)
              </span>
              <span style={{ color: "var(--t-muted)", fontSize: 11 }}>
                {nextProgressPct}% Achieved • <Money value={nextShortfall} variant="full" /> to go
                {nextTargetMilestone.eta && ` • ETA: ${nextTargetMilestone.eta}`}
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: "var(--t-line)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${nextProgressPct}%`,
                  height: "100%",
                  background:
                    "linear-gradient(90deg, var(--t-accent), color-mix(in srgb, var(--t-accent) 60%, #fff))",
                  borderRadius: 3,
                  transition: "width 0.6s var(--ease-premium)",
                }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* ── 6-Pillar Wealth Intelligence Grid ────────────────────────────────── */}
      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
          }}
        >
          <StatCard
            label="Inception Growth"
            value={fmtINRFull(stats.totalGrowthAll)}
            numericValue={stats.totalGrowthAll}
            formatValue={fmtINRFull}
            icon={stats.totalGrowthAll >= 0 ? <TrendingUp /> : <TrendingDown />}
            color={stats.totalGrowthAll >= 0 ? THEME.sage : THEME.rust}
            sparklineData={nwSparkline}
            sub={
              <span style={{ fontWeight: 700 }}>
                {stats.totalGrowthAll >= 0 ? "+" : ""}
                {(
                  (stats.totalGrowthAll / Math.max(1, rawHistory[0]?.netWorth || 1)) *
                  100
                ).toFixed(1)}
                % Total Wealth Growth
              </span>
            }
            subColor={stats.totalGrowthAll >= 0 ? THEME.sage : THEME.rust}
          />

          {(() => {
            const cagrVal = stats.cagr;
            if (cagrVal === null || cagrVal === undefined) {
              return (
                <StatCard
                  label="Compounded CAGR"
                  value="N/A"
                  numericValue={undefined}
                  icon={<Zap />}
                  color={THEME.muted}
                  sub={
                    <Badge variant="muted" size="xs">
                      Requires positive start
                    </Badge>
                  }
                />
              );
            }
            return (
              <StatCard
                label="Compounded CAGR"
                value={`${cagrVal.toFixed(1)}%`}
                numericValue={cagrVal}
                formatValue={(n: number) => `${n.toFixed(1)}%`}
                icon={<Zap />}
                color={cagrVal >= 12 ? THEME.sage : cagrVal >= 8 ? THEME.accent : THEME.gold}
                sub={
                  <Badge
                    variant={
                      cagrVal >= 15
                        ? "sage"
                        : cagrVal >= 10
                          ? "accent"
                          : cagrVal >= 6
                            ? "gold"
                            : "muted"
                    }
                    size="xs"
                  >
                    {cagrVal >= 15
                      ? "High Wealth Velocity"
                      : cagrVal >= 10
                        ? "Steady Compounder"
                        : cagrVal >= 6
                          ? "Conservative"
                          : "Capital Preservation"}
                  </Badge>
                }
              />
            );
          })()}

          <StatCard
            label="Avg Monthly Growth"
            value={fmtINRFull(stats.avgMonthlyAll)}
            numericValue={stats.avgMonthlyAll}
            formatValue={fmtINRFull}
            icon={<Calendar />}
            color={THEME.accent}
            sub="Net Monthly Wealth Addition"
          />

          <StatCard
            label="Doubling Horizon"
            value={stats.doublingYears ? `~${stats.doublingYears} Yrs` : "—"}
            icon={<Clock />}
            color={THEME.violet}
            sub={
              stats.doublingYears ? (
                <span style={{ fontSize: 11, color: "var(--t-muted)" }}>
                  Rule of 72 @ {stats.cagr?.toFixed(1)}% CAGR
                </span>
              ) : (
                "Based on compound speed"
              )
            }
          />

          <StatCard
            label="Best Month on Record"
            value={`+${fmtINRFull(stats.bestMonth?.delta ?? 0)}`}
            numericValue={stats.bestMonth?.delta ?? 0}
            formatValue={(n: number) => `+${fmtINRFull(n)}`}
            icon={<TrendingUp />}
            color={THEME.sage}
            valueColor={THEME.sage}
            sub={
              stats.bestMonth
                ? `${stats.bestMonth.label} (+${stats.bestMonth.pctChange.toFixed(1)}% MoM)`
                : "—"
            }
          />

          <StatCard
            label="Peak Drawdown"
            value={stats.drawdownPct > 0 ? `-${stats.drawdownPct.toFixed(1)}%` : "0.0%"}
            icon={<ShieldCheck />}
            color={stats.drawdownPct > 10 ? THEME.rust : THEME.sage}
            valueColor={stats.drawdownPct > 10 ? THEME.rust : THEME.sage}
            sub={
              stats.isAtAth
                ? "Currently at All-Time High"
                : `₹${fmtINR(stats.drawdownAmount)} below ATH (${stats.athMonth})`
            }
          />
        </div>
      )}

      {/* ── Interactive Multi-Perspective Chart ─────────────────────────────── */}
      <Card style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <TrendingUp size={18} style={{ color: "var(--t-accent)" }} />
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--t-ink)" }}>
                Net Worth Progression ({timeframe})
              </h3>
              <p style={{ margin: 0, fontSize: 12, color: "var(--t-muted)" }}>
                {history.length} monthly checkpoints from {history[0]?.fullLabel} to{" "}
                {history[history.length - 1]?.fullLabel}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div
              role="group"
              aria-label="Chart perspective"
              style={{
                display: "flex",
                background: "var(--surface-1)",
                padding: "3px",
                borderRadius: "var(--radius-md)",
                border: `1.5px solid var(--t-line)`,
                gap: "2px",
              }}
            >
              <button
                onClick={() => setChartViewMode("trajectory")}
                aria-pressed={viewMode === "trajectory"}
                title="Simple Glowing Area Trend"
                style={{
                  padding: "5px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: viewMode === "trajectory" ? "var(--surface-0)" : "transparent",
                  color: viewMode === "trajectory" ? "var(--t-ink)" : "var(--t-muted)",
                  fontWeight: 700,
                  fontSize: "11px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  boxShadow: viewMode === "trajectory" ? "var(--shadow-sm)" : "none",
                }}
              >
                <TrendingUp size={13} /> Trajectory
              </button>
              <button
                onClick={() => setChartViewMode("breakdown")}
                aria-pressed={viewMode === "breakdown"}
                title="Stacked Asset Class Breakdown"
                style={{
                  padding: "5px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: viewMode === "breakdown" ? "var(--surface-0)" : "transparent",
                  color: viewMode === "breakdown" ? "var(--t-ink)" : "var(--t-muted)",
                  fontWeight: 700,
                  fontSize: "11px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  boxShadow: viewMode === "breakdown" ? "var(--shadow-sm)" : "none",
                }}
              >
                <Layers size={13} /> Asset Breakdown
              </button>
              <button
                onClick={() => setChartViewMode("allocation")}
                aria-pressed={viewMode === "allocation"}
                title="100% Stacked Asset Allocation %"
                style={{
                  padding: "5px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: viewMode === "allocation" ? "var(--surface-0)" : "transparent",
                  color: viewMode === "allocation" ? "var(--t-ink)" : "var(--t-muted)",
                  fontWeight: 700,
                  fontSize: "11px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  boxShadow: viewMode === "allocation" ? "var(--shadow-sm)" : "none",
                }}
              >
                <Percent size={13} /> Allocation %
              </button>
            </div>

            {viewMode === "trajectory" && (
              <button
                onClick={() => setIsLogScale(!isLogScale)}
                title="Toggle Logarithmic vs Linear Y-Axis"
                style={{
                  padding: "5px 10px",
                  borderRadius: "var(--radius-md)",
                  border: `1.5px solid var(--t-line)`,
                  background: isLogScale
                    ? "color-mix(in srgb, var(--t-accent) 15%, var(--surface-0))"
                    : "var(--surface-1)",
                  color: isLogScale ? "var(--t-accent)" : "var(--t-muted)",
                  fontWeight: 700,
                  fontSize: "11px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Compass size={13} /> {isLogScale ? "Log Scale (Active)" : "Lin Scale"}
              </button>
            )}
          </div>
        </div>

        <div style={{ width: "100%", height: 380, position: "relative" }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            {viewMode === "trajectory" ? (
              <AreaChart data={history} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="nwTrajectoryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--t-accent)" stopOpacity={0.45} />
                    <stop offset="60%" stopColor="var(--t-accent)" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="var(--t-accent)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--t-line)" opacity={0.3} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fontWeight: 600, fill: "var(--t-muted)" }}
                  axisLine={{ stroke: "var(--t-line)" }}
                  tickLine={false}
                />
                <YAxis
                  scale={isLogScale ? "log" : "auto"}
                  domain={isLogScale ? ["auto", "auto"] : [0, "auto"]}
                  tickFormatter={(v) => (privacyMode ? "••••" : fmtINR(v))}
                  tick={{ fontSize: 11, fill: "var(--t-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--t-accent)", strokeDasharray: "3 3" }} />
                <Area
                  type="monotone"
                  dataKey="netWorth"
                  stroke="var(--t-accent)"
                  fill="url(#nwTrajectoryGrad)"
                  strokeWidth={3}
                  name="Total Net Worth"
                  activeDot={{ r: 6, stroke: "var(--surface-0)", strokeWidth: 2, fill: "var(--t-accent)" }}
                />
              </AreaChart>
            ) : viewMode === "breakdown" ? (
              <AreaChart data={history} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--t-violet)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="var(--t-violet)" stopOpacity={0.08} />
                  </linearGradient>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--t-chart-1)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="var(--t-chart-1)" stopOpacity={0.08} />
                  </linearGradient>
                  <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--t-chart-2)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="var(--t-chart-2)" stopOpacity={0.08} />
                  </linearGradient>
                  <linearGradient id="realEstateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--t-chart-6)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="var(--t-chart-6)" stopOpacity={0.08} />
                  </linearGradient>
                  <linearGradient id="vehiclesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--t-pink)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="var(--t-pink)" stopOpacity={0.08} />
                  </linearGradient>
                  <linearGradient id="otherGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--t-cyan)" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="var(--t-cyan)" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--t-line)" opacity={0.3} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fontWeight: 600, fill: "var(--t-muted)" }}
                  axisLine={{ stroke: "var(--t-line)" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => (privacyMode ? "••••" : fmtINR(v))}
                  tick={{ fontSize: 11, fill: "var(--t-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--t-line)" }} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingBottom: 10 }}
                />
                <Area type="monotone" dataKey="cash" stackId="1" stroke="var(--t-violet)" fill="url(#cashGrad)" strokeWidth={1.5} name="Cash & Bank" />
                <Area type="monotone" dataKey="equity" stackId="1" stroke="var(--t-chart-1)" fill="url(#equityGrad)" strokeWidth={1.5} name="Equity & Mutual Funds" />
                <Area type="monotone" dataKey="debt" stackId="1" stroke="var(--t-chart-2)" fill="url(#debtGrad)" strokeWidth={1.5} name="Fixed Deposits & Debt" />
                <Area type="monotone" dataKey="realEstate" stackId="1" stroke="var(--t-chart-6)" fill="url(#realEstateGrad)" strokeWidth={1.5} name="Real Estate" />
                <Area type="monotone" dataKey="vehicles" stackId="1" stroke="var(--t-pink)" fill="url(#vehiclesGrad)" strokeWidth={1.5} name="Vehicles" />
                <Area type="monotone" dataKey="other" stackId="1" stroke="var(--t-cyan)" fill="url(#otherGrad)" strokeWidth={1.5} name="Other Assets" />
              </AreaChart>
            ) : (
              <AreaChart data={history} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--t-line)" opacity={0.3} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fontWeight: 600, fill: "var(--t-muted)" }}
                  axisLine={{ stroke: "var(--t-line)" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fontSize: 11, fill: "var(--t-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--t-line)" }} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingBottom: 10 }}
                />
                <Area type="monotone" dataKey="cashPct" stackId="1" stroke="var(--t-violet)" fill="var(--t-violet)" fillOpacity={0.8} strokeWidth={1} name="Cash %" />
                <Area type="monotone" dataKey="equityPct" stackId="1" stroke="var(--t-chart-1)" fill="var(--t-chart-1)" fillOpacity={0.8} strokeWidth={1} name="Equity %" />
                <Area type="monotone" dataKey="debtPct" stackId="1" stroke="var(--t-chart-2)" fill="var(--t-chart-2)" fillOpacity={0.8} strokeWidth={1} name="Debt/FD %" />
                <Area type="monotone" dataKey="realEstatePct" stackId="1" stroke="var(--t-chart-6)" fill="var(--t-chart-6)" fillOpacity={0.8} strokeWidth={1} name="Real Estate %" />
                <Area type="monotone" dataKey="vehiclesPct" stackId="1" stroke="var(--t-pink)" fill="var(--t-pink)" fillOpacity={0.8} strokeWidth={1} name="Vehicles %" />
                <Area type="monotone" dataKey="otherPct" stackId="1" stroke="var(--t-cyan)" fill="var(--t-cyan)" fillOpacity={0.8} strokeWidth={1} name="Other %" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ── Monthly Wealth Velocity (MoM Delta & 3M Rolling Average) ─────────── */}
      {momDeltas.length > 0 && (
        <Card style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Activity size={18} style={{ color: "var(--t-accent)" }} />
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--t-ink)" }}>
                  Monthly Wealth Velocity
                </h3>
                <p style={{ margin: 0, fontSize: 12, color: "var(--t-muted)" }}>
                  Monthly wealth additions vs dips with 3-Month moving average trendline
                </p>
              </div>
            </div>

            <div
              role="group"
              aria-label="Velocity Metric Mode"
              style={{
                display: "flex",
                background: "var(--surface-1)",
                padding: "3px",
                borderRadius: "var(--radius-md)",
                border: `1.5px solid var(--t-line)`,
                gap: "2px",
              }}
            >
              <button
                onClick={() => setDeltaMetricMode("absolute")}
                aria-pressed={deltaMetricMode === "absolute"}
                style={{
                  padding: "5px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: deltaMetricMode === "absolute" ? "var(--surface-0)" : "transparent",
                  color: deltaMetricMode === "absolute" ? "var(--t-ink)" : "var(--t-muted)",
                  fontWeight: 700,
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                ₹ Absolute
              </button>
              <button
                onClick={() => setDeltaMetricMode("percentage")}
                aria-pressed={deltaMetricMode === "percentage"}
                style={{
                  padding: "5px 12px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: deltaMetricMode === "percentage" ? "var(--surface-0)" : "transparent",
                  color: deltaMetricMode === "percentage" ? "var(--t-ink)" : "var(--t-muted)",
                  fontWeight: 700,
                  fontSize: "11px",
                  cursor: "pointer",
                }}
              >
                % MoM
              </button>
            </div>
          </div>

          <div style={{ width: "100%", height: 260, position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <ComposedChart data={momDeltas} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--t-line)" opacity={0.3} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fontWeight: 600, fill: "var(--t-muted)" }}
                  axisLine={{ stroke: "var(--t-line)" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) =>
                    privacyMode ? "••••" : deltaMetricMode === "percentage" ? `${v.toFixed(1)}%` : fmtINR(v)
                  }
                  tick={{ fontSize: 11, fill: "var(--t-muted)" }}
                  axisLine={false}
                  tickLine={false}
                  width={75}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--t-line)", opacity: 0.3 }} />
                <Bar
                  dataKey={deltaMetricMode === "percentage" ? "pctChange" : "delta"}
                  name={deltaMetricMode === "percentage" ? "% Change" : "Net Change"}
                  shape={(props: any) => {
                    const { x, y, width, height, value } = props;
                    const isPositive = value >= 0;
                    const fill = isPositive ? "var(--t-sage)" : "var(--t-rust)";
                    const barY = height >= 0 ? y : y + height;
                    const barHeight = Math.max(3, Math.abs(height));
                    return (
                      <rect
                        x={x}
                        y={barY}
                        width={width}
                        height={barHeight}
                        rx={3}
                        ry={3}
                        style={{
                          fill: fill,
                          fillOpacity: 0.85,
                          stroke: fill,
                          strokeWidth: 1,
                        }}
                      />
                    );
                  }}
                />
                {deltaMetricMode === "absolute" && (
                  <Line
                    type="monotone"
                    dataKey="rolling3m"
                    stroke="var(--t-gold)"
                    strokeWidth={2}
                    dot={false}
                    name="3M Rolling Avg"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* ── Annual Wealth Performance Matrix (Year-by-Year Scorecard) ────────── */}
      {annualMatrix.length > 0 && (
        <Card style={{ padding: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              cursor: "pointer",
            }}
            onClick={() => setShowAnnualMatrix(!showAnnualMatrix)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Calendar size={18} style={{ color: "var(--t-accent)" }} />
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--t-ink)" }}>
                  Annual Wealth Scorecard
                </h3>
                <p style={{ margin: 0, fontSize: 12, color: "var(--t-muted)" }}>
                  Year-by-year summary of wealth additions, compounding growth, and peak months
                </p>
              </div>
            </div>

            <button
              style={{
                background: "transparent",
                border: "none",
                color: "var(--t-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {showAnnualMatrix ? "Collapse" : "Expand Table"}
              {showAnnualMatrix ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>

          {showAnnualMatrix && (
            <div style={{ marginTop: 20, overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: `2px solid var(--t-line)`,
                      color: "var(--t-muted)",
                      fontWeight: 800,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    <th style={{ padding: "10px 12px" }}>Year</th>
                    <th style={{ padding: "10px 12px" }}>Opening NW</th>
                    <th style={{ padding: "10px 12px" }}>Closing NW</th>
                    <th style={{ padding: "10px 12px" }}>Net Wealth Added</th>
                    <th style={{ padding: "10px 12px" }}>Annual Growth</th>
                    <th style={{ padding: "10px 12px" }}>Top Month</th>
                  </tr>
                </thead>
                <tbody>
                  {annualMatrix.map((row) => (
                    <tr
                      key={row.year}
                      style={{
                        borderBottom: `1px solid var(--t-line)`,
                        transition: "background 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "12px", fontWeight: 800, color: "var(--t-ink)" }}>
                        {row.year}
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontWeight: 600,
                          color: "var(--t-muted)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Money value={row.startNW} variant="full" />
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontWeight: 700,
                          color: "var(--t-ink)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Money value={row.endNW} variant="full" />
                      </td>
                      <td
                        style={{
                          padding: "12px",
                          fontWeight: 700,
                          color: row.netAddition >= 0 ? "var(--t-sage)" : "var(--t-rust)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {row.netAddition >= 0 ? "+" : ""}
                        <Money value={row.netAddition} variant="full" />
                      </td>
                      <td style={{ padding: "12px" }}>
                        <Badge
                          variant={row.growthPct >= 15 ? "sage" : row.growthPct >= 0 ? "accent" : "rust"}
                          size="xs"
                        >
                          {row.growthPct >= 0 ? "+" : ""}
                          {row.growthPct.toFixed(1)}%
                        </Badge>
                      </td>
                      <td style={{ padding: "12px", fontSize: 12, color: "var(--t-muted)" }}>
                        {row.bestMonth ? (
                          <span style={{ color: "var(--t-sage)", fontWeight: 700 }}>
                            {row.bestMonth.label} (+{fmtINR(row.bestMonth.delta)})
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Next-Gen What-If Time Machine (Future Wealth Simulator) ──────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionTitle sub="Interactive compounding simulation with inflation adjustment and annual step-up SIP">
          What-If Time Machine
        </SectionTitle>

        <Card style={{ padding: "clamp(18px, 3vw, 24px)" }}>
          {/* Simulator Controls Deck */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              marginBottom: 24,
              padding: "20px",
              borderRadius: "16px",
              background: "var(--surface-1)",
              border: `1.5px solid var(--t-line)`,
            }}
          >
            {/* Control Row 1: Scenarios & Horizon */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              {/* Preset Buttons */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, minWidth: 260 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--t-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Growth Scenario
                </span>
                <div
                  role="group"
                  aria-label="Scenario Selector"
                  style={{
                    display: "flex",
                    background: "var(--surface-0)",
                    padding: "3px",
                    borderRadius: "var(--radius-md)",
                    border: `1.5px solid var(--t-line)`,
                    gap: "2px",
                  }}
                >
                  {projectionPresets.map((p, i) => {
                    const isActive = i === selectedPreset;
                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedPreset(i)}
                        aria-pressed={isActive}
                        style={{
                          flex: 1,
                          padding: "6px 10px",
                          borderRadius: "var(--radius-sm)",
                          border: "none",
                          background: isActive ? "var(--t-accent)" : "transparent",
                          color: isActive ? "#fff" : "var(--t-muted)",
                          fontWeight: 700,
                          fontSize: "11px",
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
                <span style={{ fontSize: 11, color: "var(--t-muted)", fontWeight: 500 }}>
                  {projectionPresets[selectedPreset].description}
                </span>
              </div>

              {/* Horizon Selector */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 160 }}>
                <span
                  id="projection-horizon-select-label"
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--t-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Target Horizon
                </span>
                <select
                  aria-labelledby="projection-horizon-select-label"
                  value={projectionYears}
                  onChange={(e) => setProjectionYears(Number(e.target.value))}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: `1.5px solid var(--t-line)`,
                    background: "var(--surface-0)",
                    color: "var(--t-ink)",
                    fontSize: 13,
                    fontWeight: 700,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  {[1, 2, 3, 5, 7, 10, 15, 20, 25, 30].map((y) => (
                    <option key={y} value={y}>
                      {y} Years ({new Date().getFullYear() + y})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Control Row 2: Sliders & Direct Inputs */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
                paddingTop: 14,
                borderTop: `1px solid var(--t-line)`,
              }}
            >
              {/* Expected Return Rate % */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "var(--t-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Annual Return
                  </span>
                  <Badge variant="accent" size="xs">
                    {effectiveReturnRate}% p.a.
                  </Badge>
                </div>
                <input
                  type="range"
                  min="4"
                  max="25"
                  step="0.5"
                  value={effectiveReturnRate}
                  onChange={(e) => {
                    setSelectedPreset(3);
                    setCustomReturnRate(Number(e.target.value));
                  }}
                  style={{ accentColor: "var(--t-accent)", cursor: "pointer", width: "100%" }}
                />
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 10,
                    color: "var(--t-muted)",
                  }}
                >
                  <span>4% (Debt)</span>
                  <span>12% (Index)</span>
                  <span>25% (High Alpha)</span>
                </div>
              </div>

              {/* Monthly Savings / SIP */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span
                  id="monthly-savings-input-label"
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "var(--t-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Monthly Savings / SIP
                </span>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 12,
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--t-muted)",
                    }}
                  >
                    ₹
                  </span>
                  <input
                    type="number"
                    aria-labelledby="monthly-savings-input-label"
                    value={monthlySavings}
                    onChange={(e) => setMonthlySavings(Math.max(0, Number(e.target.value)))}
                    style={{
                      padding: "8px 12px 8px 24px",
                      borderRadius: 8,
                      border: `1.5px solid var(--t-line)`,
                      background: "var(--surface-0)",
                      color: "var(--t-ink)",
                      fontSize: 13,
                      fontWeight: 700,
                      outline: "none",
                      width: "100%",
                    }}
                  />
                </div>
              </div>

              {/* Annual SIP Step-up % */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "var(--t-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Annual Step-Up SIP
                  </span>
                  <Badge variant="sage" size="xs">
                    +{stepUpPct}% / yr
                  </Badge>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  value={stepUpPct}
                  onChange={(e) => setStepUpPct(Number(e.target.value))}
                  style={{ accentColor: "var(--t-sage)", cursor: "pointer", width: "100%" }}
                />
                <span style={{ fontSize: 10, color: "var(--t-muted)" }}>
                  Increases monthly savings with salary hikes
                </span>
              </div>
            </div>
          </div>

          {/* Projection Area Chart with Non-Overlapping Margins & Legend */}
          <div style={{ width: "100%", height: 350, position: "relative", marginBottom: 20 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              {(() => {
                const step = projectionYears <= 3 ? 3 : projectionYears <= 10 ? 6 : 12;
                const chartData = projection.filter(
                  (_, i) => i % step === 0 || i === projection.length - 1
                );
                const tickInterval = Math.max(0, Math.ceil(chartData.length / 10) - 1);
                return (
                  <AreaChart data={chartData} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="nominalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--t-accent)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--t-accent)" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--t-gold)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--t-gold)" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="capitalGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--t-muted)" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="var(--t-muted)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="var(--t-line)" opacity={0.3} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: "var(--t-muted)" }}
                      interval={tickInterval}
                      axisLine={{ stroke: "var(--t-line)" }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => (privacyMode ? "••••" : fmtINR(v))}
                      tick={{ fontSize: 11, fill: "var(--t-muted)" }}
                      axisLine={false}
                      tickLine={false}
                      width={80}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--t-line)" }} />
                    <Legend
                      verticalAlign="top"
                      height={40}
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingBottom: 16 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="nominal"
                      stroke="var(--t-accent)"
                      fill="url(#nominalGrad)"
                      strokeWidth={2.5}
                      name="Nominal Future Wealth"
                    />
                    <Area
                      type="monotone"
                      dataKey="real"
                      stroke="var(--t-gold)"
                      fill="url(#realGrad)"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      name="Inflation-Adjusted (Today's Rupee)"
                    />
                    <Area
                      type="monotone"
                      dataKey="capital"
                      stroke="var(--t-muted)"
                      fill="url(#capitalGrad)"
                      strokeWidth={1.5}
                      name="Principal Capital Invested"
                    />
                  </AreaChart>
                );
              })()}
            </ResponsiveContainer>
          </div>

          {/* Projection KPI Summary Highlights */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {/* Projected Nominal */}
            <div
              style={{
                padding: "16px 20px",
                borderRadius: 14,
                background: `color-mix(in srgb, var(--t-accent) 8%, var(--surface-0))`,
                border: `1.5px solid color-mix(in srgb, var(--t-accent) 25%, transparent)`,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "var(--t-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Projected in {projectionYears} Years
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 24,
                  fontWeight: 800,
                  color: "var(--t-accent)",
                  letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                  marginTop: 4,
                }}
              >
                <Money value={animatedProjectedNominal} variant="full" />
              </div>
              <div style={{ fontSize: 11, color: "var(--t-muted)", marginTop: 4 }}>
                <span style={{ color: "var(--t-accent)", fontWeight: 700 }}>
                  {wealthMultiplier}x
                </span>{" "}
                wealth expansion from today
              </div>
            </div>

            {/* Projected Real (Inflation-Adjusted) */}
            <div
              style={{
                padding: "16px 20px",
                borderRadius: 14,
                background: `color-mix(in srgb, var(--t-gold) 8%, var(--surface-0))`,
                border: `1.5px solid color-mix(in srgb, var(--t-gold) 25%, transparent)`,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "var(--t-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Real Purchasing Power (Today's Value)
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 24,
                  fontWeight: 800,
                  color: "var(--t-gold)",
                  letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                  marginTop: 4,
                }}
              >
                <Money value={animatedProjectedReal} variant="full" />
              </div>
              <div style={{ fontSize: 11, color: "var(--t-muted)", marginTop: 4 }}>
                Discounted at {effectiveInflationRate}% annual inflation
              </div>
            </div>

            {/* Compounded Interest vs Capital Split */}
            <div
              style={{
                padding: "16px 20px",
                borderRadius: 14,
                background: `color-mix(in srgb, var(--t-sage) 8%, var(--surface-0))`,
                border: `1.5px solid color-mix(in srgb, var(--t-sage) 25%, transparent)`,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: "var(--t-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Compounded Wealth Creation
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 24,
                  fontWeight: 800,
                  color: "var(--t-sage)",
                  letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                  marginTop: 4,
                }}
              >
                <Money value={compoundGainsProjected} variant="full" />
              </div>
              <div style={{ fontSize: 11, color: "var(--t-muted)", marginTop: 4 }}>
                From compounding returns over <Money value={animatedCapital} variant="full" /> capital
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Wealth Milestone Roadmap & Achievements ──────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <SectionTitle sub="Track unlocked financial milestones with exact historical dates and projected unlock targets">
          Wealth Milestone Roadmap
        </SectionTitle>

        <Card style={{ padding: 24 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {milestones
              .filter((m) => m.target >= (stats?.currentNW || 0) * 0.1)
              .map((m) => {
                const currentNW = stats?.currentNW || 0;
                const pctToTarget = Math.min(
                  100,
                  Math.max(0, Math.round((currentNW / m.target) * 100))
                );

                return (
                  <div
                    key={m.target}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      padding: "16px 18px",
                      borderRadius: 14,
                      background: m.achieved
                        ? `color-mix(in srgb, var(--t-sage) 7%, var(--surface-0))`
                        : "var(--surface-0)",
                      border: `1.5px solid ${
                        m.achieved
                          ? `color-mix(in srgb, var(--t-sage) 30%, transparent)`
                          : `var(--t-line)`
                      }`,
                      boxShadow: m.achieved ? "var(--shadow-sm)" : "none",
                      transition: "all 0.2s var(--ease-premium)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: m.achieved
                            ? "var(--t-sage)"
                            : "color-mix(in srgb, var(--surface-1) 80%, transparent)",
                          color: m.achieved ? "#fff" : "var(--t-muted)",
                          boxShadow: m.achieved
                            ? `0 0 0 4px color-mix(in srgb, var(--t-sage) 20%, transparent)`
                            : "none",
                          flexShrink: 0,
                        }}
                      >
                        {m.achieved ? (
                          <Check size={18} strokeWidth={3} />
                        ) : (
                          <m.icon size={16} color="var(--t-muted)" />
                        )}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: m.achieved ? "var(--t-sage)" : "var(--t-muted)",
                              textTransform: "uppercase",
                              letterSpacing: "0.05em",
                            }}
                          >
                            {m.title}
                          </span>
                          {m.achieved && (
                            <Badge variant="sage" size="xs">
                              Unlocked
                            </Badge>
                          )}
                        </div>

                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 800,
                            fontSize: 17,
                            color: "var(--t-ink)",
                            fontVariantNumeric: "tabular-nums",
                            marginTop: 2,
                          }}
                        >
                          <Money value={m.target} variant="full" />
                        </div>

                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: m.achieved ? "var(--t-sage)" : "var(--t-muted)",
                            marginTop: 2,
                          }}
                        >
                          {m.achieved
                            ? m.achievedDate
                              ? `Achieved in ${m.achievedDate}`
                              : "Achieved!"
                            : m.eta
                              ? `Projected ETA: ${m.eta}`
                              : "In Progress"}
                        </div>
                      </div>
                    </div>

                    {!m.achieved && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
                        <div
                          style={{
                            height: 6,
                            borderRadius: 3,
                            background: "var(--t-line)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${pctToTarget}%`,
                              background: "var(--t-accent)",
                              height: "100%",
                              borderRadius: 3,
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 10,
                            fontWeight: 700,
                            color: "var(--t-muted)",
                          }}
                        >
                          <span>Progress: {pctToTarget}%</span>
                          <span>
                            Shortfall: <Money value={Math.max(0, m.target - currentNW)} variant="full" />
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </Card>
      </div>
    </div>
  );
};
