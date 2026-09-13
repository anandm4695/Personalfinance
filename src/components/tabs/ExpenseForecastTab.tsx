/* eslint-disable */
import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Calendar,
  BarChart3,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  Info,
  Search,
  Download,
  SlidersHorizontal,
  Sparkles,
  ShieldCheck,
  Zap,
  Activity,
  CheckCircle2,
  PieChart as PieIcon,
  Layers,
  ArrowRight,
  Flame,
  RotateCcw,
  Target,
  Clock,
  Plus,
  Trash2,
  ChevronRight,
  Eye,
  Sliders,
  DollarSign,
  TrendingDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ComposedChart,
  Line,
  Cell,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, exportArrayToCSV, maskCurrencyInText } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Money } from "../ui/Money";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { EmptyState } from "../ui/EmptyState";

/* ─── STYLES & TOKENS ──────────────────────────────────────────────────────── */

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "13px 16px",
  fontSize: 10.5,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: THEME.muted,
  fontWeight: 700,
  borderBottom: `1.5px solid ${THEME.line}`,
  whiteSpace: "nowrap",
  background: "color-mix(in srgb, var(--surface-1) 60%, transparent)",
};

const td: React.CSSProperties = {
  padding: "13px 16px",
  verticalAlign: "middle",
  fontSize: 13,
  borderBottom: `1px solid ${THEME.line}`,
  fontVariantNumeric: "tabular-nums",
};

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

const FULL_MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/* ─── CLASSIFICATION LISTS ─────────────────────────────────────────────────── */

const NEEDS_CATEGORIES = new Set([
  "Rent",
  "Groceries",
  "Grocery",
  "Bills",
  "Utilities",
  "Electricity",
  "Water",
  "Gas",
  "Medical",
  "Healthcare",
  "Medicine",
  "Doctor",
  "Transport",
  "Transportation",
  "Fuel",
  "Petrol",
  "Diesel",
  "EMI",
  "Loan",
  "Maintenance",
  "Education",
  "School",
  "Tuition",
  "Tax",
  "Taxes",
  "Insurance",
  "Life Insurance",
  "Health Insurance",
]);

const FIXED_COMMITMENT_KEYWORDS = [
  "rent",
  "emi",
  "loan",
  "insurance",
  "premium",
  "subscription",
  "maintenance",
  "sip",
  "school",
  "fee",
  "tuition",
  "broadband",
  "wifi",
];

export type ForecastStrategy = "hybrid" | "momentum" | "conservative" | "frugal";
export type ForecastView = "overview" | "categories" | "seasonality" | "commitments" | "simulator";

interface PlannedOutlay {
  id: string;
  name: string;
  monthOffset: number; // 1 to horizon
  amount: number;
  category: string;
}

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
        minWidth: 160,
      }}
    >
      <div style={{ fontWeight: 800, color: THEME.ink, marginBottom: 6, letterSpacing: "-0.01em" }}>
        {label}
      </div>
      {visible.map((p: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: p.color || p.stroke || p.fill || "var(--accent)",
                display: "inline-block",
              }}
            />
            <span style={{ color: THEME.muted, fontWeight: 500 }}>{p.name}:</span>
          </div>
          <span style={{ fontWeight: 700, color: THEME.ink }}>
            <Prv>{formatter ? formatter(p.value) : fmtINRFull(p.value)}</Prv>
          </span>
        </div>
      ))}
    </div>
  );
};

export const ExpenseForecastTab: React.FC<{
  state: any;
  metrics?: any;
  setTab?: (tab: string) => void;
}> = ({ state, metrics, setTab }) => {
  const { privacyMode } = usePrivacy();

  // Navigation & Control State
  const [activeView, setActiveView] = useState<ForecastView>("overview");
  const [forecastMonths, setForecastMonths] = useState<number>(12);
  const [strategy, setStrategy] = useState<ForecastStrategy>("hybrid");
  const [catFilter, setCatFilter] = useState<string>("");
  const [catTypeFilter, setCatTypeFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"avg" | "forecast" | "trend" | "volatility">("forecast");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Selected Category Drilldown Modal
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // What-If Simulator State
  const [simInflationRate, setSimInflationRate] = useState<number>(6.0); // 6% annual inflation
  const [simDiscretionaryShift, setSimDiscretionaryShift] = useState<number>(0); // -30% to +30%
  const [plannedOutlays, setPlannedOutlays] = useState<PlannedOutlay[]>([
    { id: "1", name: "Festival & Gifting", monthOffset: 2, amount: 25000, category: "Shopping" },
    { id: "2", name: "Annual Vacation", monthOffset: 5, amount: 60000, category: "Travel" },
  ]);
  const [newOutlayName, setNewOutlayName] = useState("");
  const [newOutlayAmount, setNewOutlayAmount] = useState("");
  const [newOutlayMonth, setNewOutlayMonth] = useState("1");
  const [newOutlayCategory, setNewOutlayCategory] = useState("General");

  // 1. Historical monthly expenses & categories
  const historicalData = useMemo(() => {
    const monthMap: Record<string, { total: number; categories: Record<string, number> }> = {};
    (state.transactions || [])
      .filter(
        (t: any) =>
          t.type === "debit" &&
          t.date &&
          t.category !== "Transfer" &&
          t.category !== "Self Transfer" &&
          t.category !== "Self-Transfer" &&
          t.category !== "Investment"
      )
      .forEach((t: any) => {
        const ym = t.date.slice(0, 7);
        const cat = t.category || "Uncategorized";
        const amt = Number(t.amount || 0);
        if (!monthMap[ym]) monthMap[ym] = { total: 0, categories: {} };
        monthMap[ym].total += amt;
        monthMap[ym].categories[cat] = (monthMap[ym].categories[cat] || 0) + amt;
      });

    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, data]) => ({
        month: ym,
        label: `${MONTH_NAMES[parseInt(ym.split("-")[1]) - 1]} '${ym.slice(2, 4)}`,
        monthIndex: parseInt(ym.split("-")[1]) - 1,
        total: Math.round(data.total),
        ...data.categories,
      }));
  }, [state.transactions]);

  // 2. Deterministic Known Future Commitments (Subscriptions, EMIs, Insurance)
  const deterministicCommitments = useMemo(() => {
    let monthlySubscriptions = 0;
    (state.subscriptions || []).forEach((s: any) => {
      if (s.status === "paused" || s.active === false) return;
      const amt = Number(s.amount || 0);
      const cycle = (s.cycle || "monthly").toLowerCase();
      if (cycle === "monthly") monthlySubscriptions += amt;
      else if (cycle === "quarterly") monthlySubscriptions += amt / 3;
      else if (cycle === "half_yearly" || cycle === "semi_annual") monthlySubscriptions += amt / 6;
      else if (cycle === "yearly" || cycle === "annual") monthlySubscriptions += amt / 12;
      else monthlySubscriptions += amt;
    });

    let monthlyLoanEMIs = 0;
    (state.loans || []).forEach((l: any) => {
      const emi = Number(l.emi || l.monthlyPayment || 0);
      const remaining = Number(l.remainingMonths || l.tenureMonths || 12);
      if (remaining > 0) monthlyLoanEMIs += emi;
    });

    let monthlyInsurance = 0;
    (state.insurances || []).forEach((ins: any) => {
      const premium = Number(ins.premium || 0);
      const freq = (ins.paymentFrequency || ins.frequency || "annual").toLowerCase();
      if (freq === "monthly") monthlyInsurance += premium;
      else if (freq === "quarterly") monthlyInsurance += premium / 3;
      else if (freq === "semi_annual" || freq === "half_yearly") monthlyInsurance += premium / 6;
      else monthlyInsurance += premium / 12;
    });

    return {
      subscriptions: Math.round(monthlySubscriptions),
      emis: Math.round(monthlyLoanEMIs),
      insurance: Math.round(monthlyInsurance),
      totalFixedMonthly: Math.round(monthlySubscriptions + monthlyLoanEMIs + monthlyInsurance),
    };
  }, [state.subscriptions, state.loans, state.insurances]);

  // 3. Category Stats, Trends & Volatility Analysis
  const categoryStats = useMemo(() => {
    if (!historicalData.length) return [];
    const allCats = new Set<string>();
    historicalData.forEach((m: any) => {
      Object.keys(m).forEach((key) => {
        if (key === "month" || key === "label" || key === "total" || key === "monthIndex") return;
        allCats.add(key);
      });
    });

    const N = historicalData.length;

    return Array.from(allCats)
      .map((cat: string) => {
        const series = historicalData.map((m: any) => Number(m[cat] || 0));
        const avg = series.reduce((s, v) => s + v, 0) / N;

        const recentCount = Math.min(3, N);
        const recentSlice = series.slice(-recentCount);
        const recentAvg = recentSlice.reduce((s, v) => s + v, 0) / recentCount;

        const olderSlice = series.slice(0, N - recentCount);
        let trend: "up" | "down" | "stable" | "new" = "new";
        let velocityPct = 0;
        if (olderSlice.length > 0) {
          const olderAvg = olderSlice.reduce((s, v) => s + v, 0) / olderSlice.length;
          if (olderAvg > 0) {
            velocityPct = Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
          }
          trend =
            recentAvg > olderAvg * 1.15 ? "up" : recentAvg < olderAvg * 0.85 ? "down" : "stable";
        }

        const nonZero = series.filter((v) => v > 0);
        const max = nonZero.length ? Math.max(...nonZero) : 0;
        const min = nonZero.length ? Math.min(...nonZero) : 0;

        // Standard Deviation & Volatility (Coefficient of Variation)
        const variance = series.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / N;
        const stdDev = Math.sqrt(variance);
        const cv = avg > 0 ? stdDev / avg : 0;
        const volatility: "low" | "moderate" | "high" =
          cv < 0.35 ? "low" : cv < 0.75 ? "moderate" : "high";

        // Classification
        const isNeed = NEEDS_CATEGORIES.has(cat);
        const isFixed = FIXED_COMMITMENT_KEYWORDS.some((kw) => cat.toLowerCase().includes(kw));
        const classification = isFixed ? "Fixed" : isNeed ? "Needs" : "Discretionary";

        // Category-specific Next Month Forecast based on chosen strategy
        let forecastNext = Math.round(recentAvg * 0.5 + avg * 0.5);
        if (strategy === "momentum") forecastNext = Math.round(recentAvg * 0.8 + avg * 0.2);
        if (strategy === "conservative") forecastNext = Math.round(Math.max(avg, recentAvg) * 1.15);
        if (strategy === "frugal") forecastNext = Math.round(Math.min(avg, recentAvg) * 0.9);

        return {
          category: cat,
          avg: Math.round(avg),
          recentAvg: Math.round(recentAvg),
          forecastNext,
          trend,
          velocityPct,
          volatility,
          cv: Math.round(cv * 100),
          classification,
          max: Math.round(max),
          min: Math.round(min),
          activeMonths: nonZero.length,
          totalMonths: N,
          history: series,
        };
      })
      .sort((a, b) => b.avg - a.avg);
  }, [historicalData, strategy]);

  // Filtered categories
  const filteredCategoryStats = useMemo(() => {
    let list = [...categoryStats];
    if (catFilter.trim()) {
      const q = catFilter.trim().toLowerCase();
      list = list.filter((c) => c.category.toLowerCase().includes(q));
    }
    if (catTypeFilter !== "all") {
      if (catTypeFilter === "needs") list = list.filter((c) => c.classification === "Needs");
      else if (catTypeFilter === "discretionary") list = list.filter((c) => c.classification === "Discretionary");
      else if (catTypeFilter === "fixed") list = list.filter((c) => c.classification === "Fixed");
      else if (catTypeFilter === "trending_up") list = list.filter((c) => c.trend === "up");
      else if (catTypeFilter === "volatile") list = list.filter((c) => c.volatility === "high");
    }

    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;
      if (sortField === "avg") {
        valA = a.avg;
        valB = b.avg;
      } else if (sortField === "forecast") {
        valA = a.forecastNext;
        valB = b.forecastNext;
      } else if (sortField === "trend") {
        valA = a.velocityPct;
        valB = b.velocityPct;
      } else if (sortField === "volatility") {
        valA = a.cv;
        valB = b.cv;
      }
      return sortDir === "asc" ? valA - valB : valB - valA;
    });

    return list;
  }, [categoryStats, catFilter, catTypeFilter, sortField, sortDir]);

  // 4. Seasonal Monthly Patterns (12 Calendar Months)
  const seasonalPatterns = useMemo(() => {
    const monthTotals: Record<number, number[]> = {};
    historicalData.forEach((h: any) => {
      const m = parseInt(h.month.split("-")[1]) - 1;
      if (!monthTotals[m]) monthTotals[m] = [];
      monthTotals[m].push(h.total);
    });

    const allAvg = historicalData.length
      ? historicalData.reduce((acc, h) => acc + h.total, 0) / historicalData.length
      : 0;

    return MONTH_NAMES.map((name, i) => {
      const vals = monthTotals[i] || [];
      const avg = vals.length > 0 ? vals.reduce((s: number, v: number) => s + v, 0) / vals.length : 0;
      const index = allAvg > 0 ? Math.round((avg / allAvg) * 100) : 100;
      let tag = "Normal";
      if (index >= 120) tag = "Peak Spending";
      else if (index <= 80 && avg > 0) tag = "Low Spend";

      return {
        month: name,
        fullName: FULL_MONTH_NAMES[i],
        avg: Math.round(avg),
        samples: vals.length,
        seasonalityIndex: index,
        tag,
      };
    });
  }, [historicalData]);

  // 5. Predictive Forecast Point Builder
  const buildForecastPoint = (monthsAhead: number) => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const targetMonth = d.getMonth();

    const sameMonthData = historicalData.filter(
      (h) => parseInt(h.month.split("-")[1]) - 1 === targetMonth
    );
    const recentData = historicalData.slice(-6);

    const seasonalAvg =
      sameMonthData.length >= 2
        ? sameMonthData.reduce((s, h) => s + h.total, 0) / sameMonthData.length
        : null;
    const recentAvg = recentData.length
      ? recentData.reduce((s, h) => s + h.total, 0) / recentData.length
      : 0;

    let predicted = Math.round(recentAvg);
    if (strategy === "hybrid") {
      predicted = seasonalAvg
        ? Math.round(seasonalAvg * 0.6 + recentAvg * 0.4)
        : Math.round(recentAvg);
    } else if (strategy === "momentum") {
      const veryRecent = historicalData.slice(-3);
      const veryRecentAvg = veryRecent.length
        ? veryRecent.reduce((s, h) => s + h.total, 0) / veryRecent.length
        : recentAvg;
      predicted = Math.round(veryRecentAvg * 0.75 + recentAvg * 0.25);
    } else if (strategy === "conservative") {
      const base = seasonalAvg ? Math.max(seasonalAvg, recentAvg) : recentAvg;
      predicted = Math.round(base * 1.15);
    } else if (strategy === "frugal") {
      const base = seasonalAvg ? Math.min(seasonalAvg, recentAvg) : recentAvg;
      predicted = Math.round(base * 0.9);
    }

    // Include planned one-time outlays for this month
    const addedOutlays = plannedOutlays
      .filter((o) => o.monthOffset === monthsAhead)
      .reduce((sum, o) => sum + o.amount, 0);

    // What-If simulated projection
    const monthlyInflationFactor = Math.pow(1 + simInflationRate / 100, monthsAhead / 12);
    const fixedPart = deterministicCommitments.totalFixedMonthly;
    const discretionaryPart = Math.max(0, predicted - fixedPart);
    const simDiscretionary = discretionaryPart * (1 + simDiscretionaryShift / 100);
    const simulatedTotal = Math.round((fixedPart + simDiscretionary) * monthlyInflationFactor) + addedOutlays;

    const lower = Math.round(predicted * 0.8);
    const upper = Math.round(predicted * 1.2);

    return {
      month: ym,
      label: `${MONTH_NAMES[targetMonth]} '${String(d.getFullYear()).slice(-2)}`,
      monthName: FULL_MONTH_NAMES[targetMonth],
      predicted: predicted + addedOutlays,
      basePredicted: predicted,
      simulatedTotal,
      lower,
      upper,
      fixedCommitments: deterministicCommitments.totalFixedMonthly,
      discretionarySpend: Math.max(0, predicted - deterministicCommitments.totalFixedMonthly),
      plannedOutlays: addedOutlays,
      isForecast: true,
    };
  };

  // 6. Forecast datasets
  const forecast = useMemo(() => {
    if (historicalData.length < 3) return [];
    const points = [];
    for (let i = 1; i <= forecastMonths; i++) points.push(buildForecastPoint(i));
    return points;
  }, [
    historicalData,
    forecastMonths,
    strategy,
    deterministicCommitments,
    simInflationRate,
    simDiscretionaryShift,
    plannedOutlays,
  ]);

  const annualForecastPoints = useMemo(() => {
    if (historicalData.length < 3) return [];
    const points = [];
    for (let i = 1; i <= 12; i++) points.push(buildForecastPoint(i));
    return points;
  }, [
    historicalData,
    strategy,
    deterministicCommitments,
    simInflationRate,
    simDiscretionaryShift,
    plannedOutlays,
  ]);

  // Combined chart dataset
  const chartData = useMemo(() => {
    const hist = historicalData.slice(-12).map((h) => ({
      ...h,
      predicted: h.total,
      simulatedTotal: h.total,
      fixedCommitments: deterministicCommitments.totalFixedMonthly,
      isForecast: false,
    }));
    return [...hist, ...forecast];
  }, [historicalData, forecast, deterministicCommitments]);

  // Headline metrics
  const annualProjection = useMemo(
    () => annualForecastPoints.reduce((s, p) => s + p.predicted, 0),
    [annualForecastPoints]
  );

  const annualSimulatedProjection = useMemo(
    () => annualForecastPoints.reduce((s, p) => s + p.simulatedTotal, 0),
    [annualForecastPoints]
  );

  const nextMonth = forecast[0] || null;

  const dataConfidence: "high" | "medium" | "low" =
    historicalData.length >= 12 ? "high" : historicalData.length >= 6 ? "medium" : "low";

  const confidenceCopy = {
    high: { label: "High Confidence (12+ Mo)", color: THEME.sage },
    medium: { label: "Medium Confidence (6-11 Mo)", color: THEME.gold },
    low: { label: "Low Confidence (<6 Mo)", color: THEME.rust },
  }[dataConfidence];

  const trendingUp = categoryStats.filter((c) => c.trend === "up").length;
  const trendingDown = categoryStats.filter((c) => c.trend === "down").length;
  const highVolatilityCount = categoryStats.filter((c) => c.volatility === "high").length;

  // Selected Category Data for Drilldown Modal
  const selectedCatData = useMemo(() => {
    if (!selectedCategory) return null;
    return categoryStats.find((c) => c.category === selectedCategory) || null;
  }, [selectedCategory, categoryStats]);

  // Export Category Trends CSV
  const handleExportCategoryCSV = () => {
    const rows = categoryStats.map((c: any) => ({
      category: c.category,
      classification: c.classification,
      monthlyAvg: c.avg,
      recent3mAvg: c.recentAvg,
      forecastNextMonth: c.forecastNext,
      trendVelocity: `${c.velocityPct >= 0 ? "+" : ""}${c.velocityPct}%`,
      trendState: c.trend,
      volatilityScore: `${c.cv}% (${c.volatility})`,
      minSpend: c.min,
      maxSpend: c.max,
      activeMonths: `${c.activeMonths}/${c.totalMonths}`,
    }));
    exportArrayToCSV(
      rows,
      [
        { key: "category", label: "Category" },
        { key: "classification", label: "Type" },
        { key: "monthlyAvg", label: "Historical Monthly Avg" },
        { key: "recent3mAvg", label: "Recent (3M Avg)" },
        { key: "forecastNextMonth", label: "Forecast Next Month" },
        { key: "trendVelocity", label: "Velocity %" },
        { key: "trendState", label: "Trend" },
        { key: "volatilityScore", label: "Volatility" },
        { key: "minSpend", label: "Min" },
        { key: "maxSpend", label: "Max" },
        { key: "activeMonths", label: "Active Frequency" },
      ],
      `Expense_Forecast_Category_Intelligence_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  // Export Forecast Schedule CSV
  const handleExportScheduleCSV = () => {
    const rows = forecast.map((f: any) => ({
      month: f.label,
      predictedTotal: f.predicted,
      lowerBound: f.lower,
      upperBound: f.upper,
      fixedCommitments: f.fixedCommitments,
      discretionarySpend: f.discretionarySpend,
      plannedOutlays: f.plannedOutlays,
      simulatedScenario: f.simulatedTotal,
    }));
    exportArrayToCSV(
      rows,
      [
        { key: "month", label: "Forecast Month" },
        { key: "predictedTotal", label: "Predicted Outflow" },
        { key: "lowerBound", label: "Lower Bound (-20%)" },
        { key: "upperBound", label: "Upper Bound (+20%)" },
        { key: "fixedCommitments", label: "Fixed Commitments" },
        { key: "discretionarySpend", label: "Discretionary Run-Rate" },
        { key: "plannedOutlays", label: "One-off Planned Outlays" },
        { key: "simulatedScenario", label: "Scenario Simulated Outflow" },
      ],
      `Expense_Forecast_Monthly_Schedule_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const handleAddOutlay = () => {
    if (!newOutlayName.trim() || !newOutlayAmount) return;
    const item: PlannedOutlay = {
      id: Date.now().toString(),
      name: newOutlayName.trim(),
      monthOffset: Math.max(1, parseInt(newOutlayMonth) || 1),
      amount: Math.max(0, Number(newOutlayAmount) || 0),
      category: newOutlayCategory.trim() || "General",
    };
    setPlannedOutlays([...plannedOutlays, item]);
    setNewOutlayName("");
    setNewOutlayAmount("");
  };

  const handleRemoveOutlay = (id: string) => {
    setPlannedOutlays(plannedOutlays.filter((o) => o.id !== id));
  };

  if (historicalData.length < 3) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Not Enough Historical Data"
        gradient={`linear-gradient(135deg, var(--t-accent), color-mix(in srgb, var(--t-accent) 65%, white))`}
        dotColor="var(--accent)"
        description="Add at least 3 months of transactions to activate predictive expense forecasting, seasonal cycle mapping, and What-If scenario simulations."
        pills={["Predictive Outflow", "Velocity Tracking", "Seasonal Heatmaps", "Scenario Simulation"]}
        buttonLabel="Add Transactions"
        onAdd={() => setTab?.("banks")}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ─── HEADER & COMMAND BAR ────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <SectionTitle sub="Executive predictive financial modeling, category velocity, seasonal cycles, and What-If outlays">
          Expense Forecast
        </SectionTitle>

        {/* Action controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Strategy selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--surface-0)",
              padding: "4px 12px",
              borderRadius: 10,
              border: `1px solid ${THEME.line}`,
              boxShadow: "var(--shadow-xs)",
            }}
          >
            <Sparkles size={13} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 10.5, fontWeight: 800, color: THEME.muted, textTransform: "uppercase" }}>
              Model
            </span>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as ForecastStrategy)}
              aria-label="Forecasting model strategy"
              style={{
                background: "transparent",
                border: "none",
                color: THEME.ink,
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="hybrid">Seasonal Blend</option>
              <option value="momentum">Momentum Trend</option>
              <option value="conservative">Conservative (+15%)</option>
              <option value="frugal">Frugal Target (-10%)</option>
            </select>
          </div>

          {/* Horizon selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--surface-0)",
              padding: "4px 12px",
              borderRadius: 10,
              border: `1px solid ${THEME.line}`,
              boxShadow: "var(--shadow-xs)",
            }}
          >
            <Clock size={13} style={{ color: THEME.muted }} />
            <span style={{ fontSize: 10.5, fontWeight: 800, color: THEME.muted, textTransform: "uppercase" }}>
              Horizon
            </span>
            <select
              value={forecastMonths}
              aria-label="Forecast horizon"
              onChange={(e) => setForecastMonths(Number(e.target.value))}
              style={{
                background: "transparent",
                border: "none",
                color: THEME.ink,
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value={3}>Next 3 Months</option>
              <option value={6}>Next 6 Months</option>
              <option value={9}>Next 9 Months</option>
              <option value={12}>Next 12 Months</option>
              <option value={24}>Next 24 Months</option>
            </select>
          </div>

          {/* Export dropdown / button */}
          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={13} />}
            onClick={activeView === "categories" ? handleExportCategoryCSV : handleExportScheduleCSV}
            title="Export CSV data"
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* ─── EXECUTIVE KPI STAT CARDS ────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          label="Next Month Forecast"
          value={nextMonth ? fmtINRFull(nextMonth.predicted) : "—"}
          numericValue={nextMonth ? nextMonth.predicted : undefined}
          formatValue={fmtINRFull}
          icon={<TrendingUp />}
          color="var(--accent)"
          sub={
            nextMonth
              ? maskCurrencyInText(
                  `Band ${fmtINR(nextMonth.lower)} – ${fmtINR(nextMonth.upper)}`,
                  privacyMode
                )
              : undefined
          }
        />
        <StatCard
          label="Annual Projection"
          value={fmtINRFull(annualProjection)}
          numericValue={annualProjection}
          formatValue={fmtINRFull}
          icon={<Calendar />}
          color="var(--accent)"
          sub="Next 12 months outflow"
        />
        <StatCard
          label="Monthly Average"
          value={fmtINRFull(Math.round(annualProjection / 12))}
          numericValue={Math.round(annualProjection / 12)}
          formatValue={fmtINRFull}
          icon={<BarChart3 />}
          color={THEME.accent}
          sub={`Daily burn: ${maskCurrencyInText(fmtINR(Math.round(annualProjection / 365)), privacyMode)}/day`}
        />
        <StatCard
          label="Fixed Commitments"
          value={fmtINRFull(deterministicCommitments.totalFixedMonthly)}
          numericValue={deterministicCommitments.totalFixedMonthly}
          formatValue={fmtINRFull}
          icon={<ShieldCheck />}
          color={THEME.gold}
          sub="EMIs, Subscriptions & Insurance"
          subColor={THEME.gold}
        />
        <StatCard
          label="Trending Up"
          value={`${trendingUp} categories`}
          numericValue={trendingUp}
          formatValue={(n) => `${Math.round(n)} categories`}
          icon={<ArrowUp />}
          color={THEME.rust}
          sub="Rising spending velocity"
          subColor={THEME.rust}
        />
        <StatCard
          label="Trending Down"
          value={`${trendingDown} categories`}
          numericValue={trendingDown}
          formatValue={(n) => `${Math.round(n)} categories`}
          icon={<ArrowDown />}
          color={THEME.sage}
          sub="Cooling spending velocity"
          subColor={THEME.sage}
        />
      </div>

      {/* ─── VIEW NAVIGATION TABS ────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          borderBottom: `1.5px solid ${THEME.line}`,
          paddingBottom: 4,
          overflowX: "auto",
        }}
      >
        <button
          onClick={() => setActiveView("overview")}
          className="btn-interactive"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            background: activeView === "overview" ? "var(--surface-2)" : "transparent",
            color: activeView === "overview" ? "var(--accent)" : THEME.muted,
            fontWeight: activeView === "overview" ? 800 : 600,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.2s ease",
            borderBottom: activeView === "overview" ? "2px solid var(--accent)" : "2px solid transparent",
          }}
        >
          <BarChart3 size={15} />
          Executive Overview
        </button>

        <button
          onClick={() => setActiveView("categories")}
          className="btn-interactive"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            background: activeView === "categories" ? "var(--surface-2)" : "transparent",
            color: activeView === "categories" ? "var(--accent)" : THEME.muted,
            fontWeight: activeView === "categories" ? 800 : 600,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.2s ease",
            borderBottom: activeView === "categories" ? "2px solid var(--accent)" : "2px solid transparent",
          }}
        >
          <Layers size={15} />
          Category Trends
          <span
            style={{
              fontSize: 10,
              padding: "1px 6px",
              borderRadius: 10,
              background: "color-mix(in srgb, var(--accent) 15%, transparent)",
              color: "var(--accent)",
              fontWeight: 800,
            }}
          >
            {categoryStats.length}
          </span>
        </button>

        <button
          onClick={() => setActiveView("seasonality")}
          className="btn-interactive"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            background: activeView === "seasonality" ? "var(--surface-2)" : "transparent",
            color: activeView === "seasonality" ? "var(--accent)" : THEME.muted,
            fontWeight: activeView === "seasonality" ? 800 : 600,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.2s ease",
            borderBottom: activeView === "seasonality" ? "2px solid var(--accent)" : "2px solid transparent",
          }}
        >
          <Calendar size={15} />
          Seasonal Spending Patterns
        </button>

        <button
          onClick={() => setActiveView("commitments")}
          className="btn-interactive"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            background: activeView === "commitments" ? "var(--surface-2)" : "transparent",
            color: activeView === "commitments" ? "var(--accent)" : THEME.muted,
            fontWeight: activeView === "commitments" ? 800 : 600,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.2s ease",
            borderBottom: activeView === "commitments" ? "2px solid var(--accent)" : "2px solid transparent",
          }}
        >
          <ShieldCheck size={15} />
          Fixed vs Discretionary
        </button>

        <button
          onClick={() => setActiveView("simulator")}
          className="btn-interactive"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            background: activeView === "simulator" ? "var(--surface-2)" : "transparent",
            color: activeView === "simulator" ? "var(--accent)" : THEME.muted,
            fontWeight: activeView === "simulator" ? 800 : 600,
            fontSize: 13,
            cursor: "pointer",
            transition: "all 0.2s ease",
            borderBottom: activeView === "simulator" ? "2px solid var(--accent)" : "2px solid transparent",
          }}
        >
          <SlidersHorizontal size={15} />
          What-If Simulator
          <span
            style={{
              fontSize: 10,
              padding: "1px 6px",
              borderRadius: 10,
              background: "color-mix(in srgb, var(--t-gold) 18%, transparent)",
              color: THEME.gold,
              fontWeight: 800,
            }}
          >
            Live
          </span>
        </button>
      </div>

      {/* ─── VIEW 1: EXECUTIVE OVERVIEW ──────────────────────────────────── */}
      {activeView === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Main Forecast Chart Card */}
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
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 800,
                      color: THEME.ink,
                      letterSpacing: "-0.015em",
                    }}
                  >
                    Expense Forecast
                  </h3>
                  <Badge variant="accent" size="xs">
                    {strategy === "hybrid"
                      ? "Seasonal Blend"
                      : strategy === "momentum"
                      ? "Momentum"
                      : strategy === "conservative"
                      ? "+15% Conservative"
                      : "-10% Frugal"}
                  </Badge>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 11.5, color: THEME.muted }}>
                    Historical spend actuals blended with predictive time-series & confidence bands
                  </span>
                  <span
                    title={`Based on ${historicalData.length} month${historicalData.length === 1 ? "" : "s"} of history`}
                    style={{
                      fontSize: 9.5,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-xs)",
                      color: confidenceCopy.color,
                      background: `color-mix(in srgb, ${confidenceCopy.color} 14%, transparent)`,
                    }}
                  >
                    {confidenceCopy.label}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "6px 14px",
                    borderRadius: 10,
                    background: "var(--surface-1)",
                    border: `1px solid ${THEME.line}`,
                    fontSize: 11,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--t-accent)" }} />
                    <span style={{ color: THEME.muted }}>Historical Actuals</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
                    <span style={{ color: THEME.ink, fontWeight: 700 }}>Forecast Trajectory</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: THEME.gold }} />
                    <span style={{ color: THEME.muted }}>Fixed Baseline</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ width: "100%", height: 380, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="forecastAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="actualAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--t-accent)" stopOpacity={0.16} />
                      <stop offset="95%" stopColor="var(--t-accent)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    tickLine={false}
                    axisLine={{ stroke: THEME.line }}
                  />
                  <YAxis
                    tickFormatter={(v) => (privacyMode ? "••••" : fmtINR(v))}
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: THEME.line, strokeDasharray: "3 3" }} />
                  {historicalData.length > 0 && (
                    <ReferenceLine
                      x={historicalData[historicalData.length - 1].label}
                      stroke={THEME.muted}
                      strokeDasharray="3 3"
                      label={{
                        value: "Today",
                        position: "insideTopRight",
                        fill: THEME.muted,
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    />
                  )}
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 14 }}
                    formatter={(value: string) => (
                      <span style={{ color: THEME.ink, fontWeight: 600 }}>{value}</span>
                    )}
                  />
                  {/* Upper Bound */}
                  <Area
                    type="monotone"
                    dataKey="upper"
                    stroke="none"
                    fill={THEME.rust}
                    fillOpacity={0.08}
                    name="Upper Bound (+20%)"
                  />
                  {/* Lower Bound */}
                  <Area
                    type="monotone"
                    dataKey="lower"
                    stroke="none"
                    fill={THEME.sage}
                    fillOpacity={0.08}
                    name="Lower Bound (-20%)"
                  />
                  {/* Fixed Obligations Line */}
                  <Line
                    type="monotone"
                    dataKey="fixedCommitments"
                    stroke={THEME.gold}
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                    name="Fixed Obligations"
                  />
                  {/* Forecast Line & Area */}
                  <Area
                    type="monotone"
                    dataKey="predicted"
                    stroke="var(--accent)"
                    fill="url(#forecastAreaGrad)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "var(--accent)" }}
                    activeDot={{ r: 6 }}
                    name="Predicted Outflow"
                  />
                  {/* Actual Spend Area */}
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="var(--t-accent)"
                    fill="url(#actualAreaGrad)"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: "var(--t-accent)" }}
                    name="Actual Spend"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Sub-grid: Top Drivers & Predictive Intelligence */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 16,
            }}
          >
            {/* Top Expense Drivers Card */}
            <Card style={{ padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                    Top Expense Drivers (Forecast)
                  </h4>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                    Major categories shaping next month's outflow
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveView("categories")}
                  icon={<ArrowRight size={13} />}
                >
                  View All
                </Button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {categoryStats.slice(0, 5).map((cat, idx) => {
                  const sharePct = nextMonth && nextMonth.predicted > 0
                    ? Math.round((cat.forecastNext / nextMonth.predicted) * 100)
                    : 0;
                  return (
                    <div
                      key={cat.category}
                      onClick={() => setSelectedCategory(cat.category)}
                      className="card-lift"
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: "var(--surface-0)",
                        border: `1px solid ${THEME.line}`,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: THEME.muted,
                              width: 18,
                              height: 18,
                              borderRadius: "50%",
                              background: "var(--surface-2)",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {idx + 1}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                            {cat.category}
                          </span>
                          <Badge
                            size="xs"
                            variant={cat.classification === "Fixed" ? "gold" : cat.classification === "Needs" ? "sage" : "accent"}
                          >
                            {cat.classification}
                          </Badge>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                            <Money value={cat.forecastNext} variant="full" />
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>
                            ({sharePct}%)
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div
                        style={{
                          width: "100%",
                          height: 5,
                          background: "var(--surface-2)",
                          borderRadius: 3,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, sharePct * 2.5)}%`,
                            height: "100%",
                            background:
                              cat.classification === "Fixed"
                                ? THEME.gold
                                : cat.classification === "Needs"
                                ? THEME.sage
                                : "var(--accent)",
                            borderRadius: 3,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Smart Predictive Intelligence & Advisory Card */}
            <Card style={{ padding: 22, background: "color-mix(in srgb, var(--surface-0) 95%, transparent)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <Zap size={16} color="var(--accent)" />
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                  Smart Predictive Advisory
                </h4>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {/* Fixed ratio advice */}
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "color-mix(in srgb, var(--t-gold) 10%, transparent)",
                    border: `1px solid color-mix(in srgb, var(--t-gold) 25%, transparent)`,
                    display: "flex",
                    gap: 10,
                  }}
                >
                  <ShieldCheck size={16} color={THEME.gold} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 11.5, color: THEME.ink, lineHeight: 1.5 }}>
                    <strong>Contractual Floor:</strong> ₹
                    {fmtINR(deterministicCommitments.totalFixedMonthly)}/mo is committed to EMIs,
                    insurance & subscriptions (
                    {nextMonth ? Math.round((deterministicCommitments.totalFixedMonthly / nextMonth.predicted) * 100) : 0}
                    % of total). Maintain this buffer in liquid bank accounts.
                  </div>
                </div>

                {/* Acceleration alert */}
                {trendingUp > 0 && (
                  <div
                    style={{
                      padding: "10px 14px",
                      borderRadius: 10,
                      background: "color-mix(in srgb, var(--t-rust) 10%, transparent)",
                      border: `1px solid color-mix(in srgb, var(--t-rust) 25%, transparent)`,
                      display: "flex",
                      gap: 10,
                    }}
                  >
                    <Flame size={16} color={THEME.rust} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: 11.5, color: THEME.ink, lineHeight: 1.5 }}>
                      <strong>Velocity Spike:</strong> {trendingUp} categories (including{" "}
                      {categoryStats.filter((c) => c.trend === "up").slice(0, 2).map((c) => c.category).join(", ")}
                      ) exhibit upward spending momentum. Consider setting category budget caps.
                    </div>
                  </div>
                )}

                {/* Volatility info */}
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "color-mix(in srgb, var(--t-accent) 10%, transparent)",
                    border: `1px solid color-mix(in srgb, var(--t-accent) 25%, transparent)`,
                    display: "flex",
                    gap: 10,
                  }}
                >
                  <Activity size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div style={{ fontSize: 11.5, color: THEME.ink, lineHeight: 1.5 }}>
                    <strong>Confidence Interval:</strong> The ±20% band suggests a monthly swing range of{" "}
                    {nextMonth ? maskCurrencyInText(`₹${fmtINR(nextMonth.lower)} – ₹${fmtINR(nextMonth.upper)}`, privacyMode) : "—"}.
                    Review What-If scenarios to stress-test your cash buffer.
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ─── VIEW 2: CATEGORY TRENDS & VOLATILITY ───────────────────────── */}
      {activeView === "categories" && (
        <Card style={{ padding: 24 }}>
          {/* Table Toolbar */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: 16,
                  fontWeight: 800,
                  color: THEME.ink,
                  letterSpacing: "-0.015em",
                }}
              >
                Category Trends
              </h3>
              <div style={{ fontSize: 11.5, color: THEME.muted }}>
                Granular predictive velocity, volatility index (CV), and historical min/max ranges
              </div>
            </div>

            {/* Filters */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {/* Type Filter Pills */}
              <div
                style={{
                  display: "flex",
                  background: "var(--surface-1)",
                  borderRadius: 8,
                  padding: 2,
                  border: `1px solid ${THEME.line}`,
                }}
              >
                {[
                  { id: "all", label: "All" },
                  { id: "needs", label: "Needs" },
                  { id: "discretionary", label: "Wants" },
                  { id: "fixed", label: "Fixed" },
                  { id: "trending_up", label: "Rising" },
                  { id: "volatile", label: "Volatile" },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    onClick={() => setCatTypeFilter(pill.id)}
                    style={{
                      border: "none",
                      background: catTypeFilter === pill.id ? "var(--surface-0)" : "transparent",
                      color: catTypeFilter === pill.id ? "var(--accent)" : THEME.muted,
                      fontWeight: catTypeFilter === pill.id ? 800 : 600,
                      fontSize: 11,
                      padding: "4px 10px",
                      borderRadius: 6,
                      cursor: "pointer",
                      boxShadow: catTypeFilter === pill.id ? "var(--shadow-xs)" : "none",
                    }}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div style={{ position: "relative" }}>
                <Search
                  size={13}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: THEME.muted,
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                  placeholder="Filter category…"
                  aria-label="Filter categories"
                  style={{
                    border: `1px solid ${THEME.line}`,
                    borderRadius: 8,
                    padding: "6px 10px 6px 28px",
                    fontSize: 12,
                    color: THEME.ink,
                    background: "var(--surface-0)",
                    width: 150,
                  }}
                />
              </div>

              {/* Export */}
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={13} />}
                onClick={handleExportCategoryCSV}
              >
                CSV
              </Button>
            </div>
          </div>

          {/* Table */}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...th, paddingLeft: 16 }}>Category</th>
                  <th style={{ ...th, textAlign: "center" }}>Classification</th>
                  <th
                    style={{ ...th, textAlign: "right", cursor: "pointer" }}
                    onClick={() => {
                      if (sortField === "avg") setSortDir(sortDir === "asc" ? "desc" : "asc");
                      else { setSortField("avg"); setSortDir("desc"); }
                    }}
                  >
                    Monthly Avg {sortField === "avg" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    style={{ ...th, textAlign: "right", cursor: "pointer" }}
                    onClick={() => {
                      if (sortField === "forecast") setSortDir(sortDir === "asc" ? "desc" : "asc");
                      else { setSortField("forecast"); setSortDir("desc"); }
                    }}
                  >
                    Forecast Next {sortField === "forecast" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                  <th style={{ ...th, textAlign: "right" }}>Recent (3M)</th>
                  <th
                    style={{ ...th, textAlign: "center", cursor: "pointer" }}
                    onClick={() => {
                      if (sortField === "trend") setSortDir(sortDir === "asc" ? "desc" : "asc");
                      else { setSortField("trend"); setSortDir("desc"); }
                    }}
                  >
                    Velocity {sortField === "trend" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                  <th
                    style={{ ...th, textAlign: "center", cursor: "pointer" }}
                    onClick={() => {
                      if (sortField === "volatility") setSortDir(sortDir === "asc" ? "desc" : "asc");
                      else { setSortField("volatility"); setSortDir("desc"); }
                    }}
                  >
                    Volatility {sortField === "volatility" && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                  <th style={{ ...th, textAlign: "right" }}>Min</th>
                  <th style={{ ...th, textAlign: "right" }}>Max</th>
                  <th style={{ ...th, textAlign: "center", paddingRight: 16 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategoryStats.map((c: any) => (
                  <tr
                    key={c.category}
                    style={{ borderBottom: `1px solid ${THEME.line}` }}
                    className="table-row-hover"
                  >
                    <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        <span>{c.category}</span>
                        <span style={{ fontSize: 10, fontWeight: 500, color: THEME.muted, marginTop: 2 }}>
                          Active {c.activeMonths}/{c.totalMonths} mo
                        </span>
                      </div>
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <Badge
                        size="xs"
                        variant={c.classification === "Fixed" ? "gold" : c.classification === "Needs" ? "sage" : "accent"}
                      >
                        {c.classification}
                      </Badge>
                    </td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                      <Money value={c.avg} variant="full" />
                    </td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 800, color: "var(--accent)" }}>
                      <Money value={c.forecastNext} variant="full" />
                    </td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                      <Money value={c.recentAvg} variant="full" />
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "3px 8px",
                          borderRadius: "var(--radius-xs)",
                          fontSize: 10.5,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                          background:
                            c.trend === "up"
                              ? "color-mix(in srgb, var(--t-rust) 16%, transparent)"
                              : c.trend === "down"
                              ? "color-mix(in srgb, var(--t-sage) 16%, transparent)"
                              : c.trend === "new"
                              ? "color-mix(in srgb, var(--t-accent) 14%, transparent)"
                              : "var(--surface-2)",
                          color:
                            c.trend === "up"
                              ? THEME.rust
                              : c.trend === "down"
                              ? THEME.sage
                              : c.trend === "new"
                              ? THEME.accent
                              : THEME.muted,
                        }}
                      >
                        {c.trend === "up" ? (
                          <ArrowUp size={12} />
                        ) : c.trend === "down" ? (
                          <ArrowDown size={12} />
                        ) : c.trend === "new" ? (
                          <Info size={12} />
                        ) : (
                          <Minus size={12} />
                        )}
                        {c.velocityPct !== 0 ? `${c.velocityPct >= 0 ? "+" : ""}${c.velocityPct}%` : "Stable"}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background:
                            c.volatility === "low"
                              ? "color-mix(in srgb, var(--t-sage) 12%, transparent)"
                              : c.volatility === "moderate"
                              ? "color-mix(in srgb, var(--t-gold) 12%, transparent)"
                              : "color-mix(in srgb, var(--t-rust) 12%, transparent)",
                          color:
                            c.volatility === "low"
                              ? THEME.sage
                              : c.volatility === "moderate"
                              ? THEME.gold
                              : THEME.rust,
                        }}
                      >
                        {c.volatility.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: "right", color: THEME.muted, fontWeight: 500 }}>
                      <Money value={c.min} variant="full" />
                    </td>
                    <td style={{ ...td, textAlign: "right", color: THEME.muted, fontWeight: 500 }}>
                      <Money value={c.max} variant="full" />
                    </td>
                    <td style={{ ...td, textAlign: "center", paddingRight: 16 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Eye size={12} />}
                        onClick={() => setSelectedCategory(c.category)}
                        title="View Historical Trajectory"
                      >
                        Details
                      </Button>
                    </td>
                  </tr>
                ))}
                {filteredCategoryStats.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ ...td, textAlign: "center", color: THEME.muted, padding: "24px 16px" }}>
                      No categories match "{catFilter}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─── VIEW 3: SEASONAL SPENDING PATTERNS ─────────────────────────── */}
      {activeView === "seasonality" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 16,
                    fontWeight: 800,
                    color: THEME.ink,
                    letterSpacing: "-0.015em",
                  }}
                >
                  Seasonal Spending Patterns
                </h3>
                <Badge variant="accent" size="xs">
                  Calendar Year Cycle
                </Badge>
              </div>
              <div style={{ fontSize: 11.5, color: THEME.muted }}>
                Average monthly expenditure levels mapped across the 12 calendar months to isolate cyclical peaks
              </div>
            </div>

            <div style={{ width: "100%", height: 320, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={seasonalPatterns} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    tickLine={false}
                    axisLine={{ stroke: THEME.line }}
                  />
                  <YAxis
                    tickFormatter={(v) => (privacyMode ? "••••" : fmtINR(v))}
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: THEME.line, opacity: 0.3 }} />
                  <Bar dataKey="avg" name="Average Spend" radius={[6, 6, 0, 0]}>
                    {seasonalPatterns.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.seasonalityIndex >= 120
                            ? THEME.rust
                            : entry.seasonalityIndex <= 80
                            ? THEME.sage
                            : "var(--accent)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Seasonality Insights Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            {seasonalPatterns.map((m) => (
              <div
                key={m.month}
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                    {m.fullName}
                  </div>
                  <div style={{ fontSize: 10.5, color: THEME.muted, marginTop: 2 }}>
                    {m.samples} years of data
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                    <Money value={m.avg} variant="full" />
                  </div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "1px 6px",
                      borderRadius: 4,
                      background:
                        m.seasonalityIndex >= 120
                          ? "color-mix(in srgb, var(--t-rust) 15%, transparent)"
                          : m.seasonalityIndex <= 80
                          ? "color-mix(in srgb, var(--t-sage) 15%, transparent)"
                          : "var(--surface-2)",
                      color:
                        m.seasonalityIndex >= 120
                          ? THEME.rust
                          : m.seasonalityIndex <= 80
                          ? THEME.sage
                          : THEME.muted,
                    }}
                  >
                    {m.seasonalityIndex}% baseline
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── VIEW 4: FIXED VS DISCRETIONARY COMMITMENTS ─────────────────── */}
      {activeView === "commitments" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {/* Breakdown Card */}
            <Card style={{ padding: 22 }}>
              <h4 style={{ margin: "0 0 14px 0", fontSize: 15, fontWeight: 800, color: THEME.ink }}>
                Committed Obligations Breakdown
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: THEME.muted }}>Loan EMIs</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                    <Money value={deterministicCommitments.emis} variant="full" />/mo
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: THEME.muted }}>Active Subscriptions</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                    <Money value={deterministicCommitments.subscriptions} variant="full" />/mo
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: THEME.muted }}>Insurance Amortized</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                    <Money value={deterministicCommitments.insurance} variant="full" />/mo
                  </span>
                </div>
                <div
                  style={{
                    borderTop: `1.5px solid ${THEME.line}`,
                    paddingTop: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                    Total Contractual Floor
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 900, color: THEME.gold }}>
                    <Money value={deterministicCommitments.totalFixedMonthly} variant="full" />/mo
                  </span>
                </div>
              </div>
            </Card>

            {/* Flexible Discretionary Runway */}
            <Card style={{ padding: 22 }}>
              <h4 style={{ margin: "0 0 14px 0", fontSize: 15, fontWeight: 800, color: THEME.ink }}>
                Flexible Discretionary Buffer
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: THEME.muted }}>Projected Monthly Outflow</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                    <Money value={nextMonth ? nextMonth.predicted : 0} variant="full" />
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: THEME.muted }}>Fixed Commitments</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: THEME.gold }}>
                    - <Money value={deterministicCommitments.totalFixedMonthly} variant="full" />
                  </span>
                </div>
                <div
                  style={{
                    borderTop: `1.5px solid ${THEME.line}`,
                    paddingTop: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                    Discretionary Run-Rate
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 900, color: THEME.sage }}>
                    <Money
                      value={Math.max(
                        0,
                        (nextMonth ? nextMonth.predicted : 0) - deterministicCommitments.totalFixedMonthly
                      )}
                      variant="full"
                    />
                    /mo
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Schedule Table */}
          <Card style={{ padding: 24 }}>
            <h4 style={{ margin: "0 0 16px 0", fontSize: 15, fontWeight: 800, color: THEME.ink }}>
              Monthly Projected Cash Allocation Schedule
            </h4>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ ...th, paddingLeft: 16 }}>Month</th>
                    <th style={{ ...th, textAlign: "right" }}>Fixed Obligations</th>
                    <th style={{ ...th, textAlign: "right" }}>Discretionary Spend</th>
                    <th style={{ ...th, textAlign: "right" }}>Planned Milestones</th>
                    <th style={{ ...th, textAlign: "right", paddingRight: 16 }}>Total Predicted</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.map((f: any) => (
                    <tr
                      key={f.month}
                      style={{ borderBottom: `1px solid ${THEME.line}` }}
                      className="table-row-hover"
                    >
                      <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                        {f.label} ({f.monthName})
                      </td>
                      <td style={{ ...td, textAlign: "right", color: THEME.gold, fontWeight: 700 }}>
                        <Money value={f.fixedCommitments} variant="full" />
                      </td>
                      <td style={{ ...td, textAlign: "right", color: THEME.sage, fontWeight: 700 }}>
                        <Money value={f.discretionarySpend} variant="full" />
                      </td>
                      <td style={{ ...td, textAlign: "right", color: THEME.muted }}>
                        {f.plannedOutlays > 0 ? (
                          <span style={{ color: "var(--accent)", fontWeight: 700 }}>
                            +<Money value={f.plannedOutlays} variant="full" />
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 800, paddingRight: 16 }}>
                        <Money value={f.predicted} variant="full" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ─── VIEW 5: WHAT-IF SCENARIO SIMULATOR ──────────────────────────── */}
      {activeView === "simulator" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Controls & Comparison KPI Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16,
            }}
          >
            {/* Sliders Card */}
            <Card style={{ padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Sliders size={16} color="var(--accent)" />
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: THEME.ink }}>
                  Scenario Parameter Knobs
                </h4>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Inflation slider */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>
                      Annual Inflation Rate
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: "var(--accent)" }}>
                      {simInflationRate.toFixed(1)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="0.5"
                    value={simInflationRate}
                    onChange={(e) => setSimInflationRate(parseFloat(e.target.value))}
                    aria-label="Annual inflation rate slider"
                    style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: THEME.muted }}>
                    <span>0% (Flat)</span>
                    <span>6% (Historical RBI)</span>
                    <span>15% (High Stress)</span>
                  </div>
                </div>

                {/* Discretionary Shift slider */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>
                      Discretionary Spending Shift
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: simDiscretionaryShift >= 0 ? THEME.rust : THEME.sage,
                      }}
                    >
                      {simDiscretionaryShift >= 0 ? `+${simDiscretionaryShift}%` : `${simDiscretionaryShift}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="30"
                    step="5"
                    value={simDiscretionaryShift}
                    onChange={(e) => setSimDiscretionaryShift(parseInt(e.target.value))}
                    aria-label="Discretionary spending shift slider"
                    style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: THEME.muted }}>
                    <span>-30% (Frugal Cut)</span>
                    <span>0% (Baseline)</span>
                    <span>+30% (Lifestyle Creep)</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<RotateCcw size={12} />}
                    onClick={() => {
                      setSimInflationRate(6.0);
                      setSimDiscretionaryShift(0);
                    }}
                  >
                    Reset Parameters
                  </Button>
                </div>
              </div>
            </Card>

            {/* Impact Delta KPI Card */}
            <Card style={{ padding: 22 }}>
              <h4 style={{ margin: "0 0 14px 0", fontSize: 15, fontWeight: 800, color: THEME.ink }}>
                Annual Scenario Impact
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: THEME.muted }}>Baseline 12-Month Outflow</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                    <Money value={annualProjection} variant="full" />
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: THEME.muted }}>Simulated 12-Month Outflow</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: "var(--accent)" }}>
                    <Money value={annualSimulatedProjection} variant="full" />
                  </span>
                </div>
                <div
                  style={{
                    borderTop: `1.5px solid ${THEME.line}`,
                    paddingTop: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                    Net Outflow Variance
                  </span>
                  <span
                    style={{
                      fontSize: 15,
                      fontWeight: 900,
                      color: annualSimulatedProjection > annualProjection ? THEME.rust : THEME.sage,
                    }}
                  >
                    {annualSimulatedProjection > annualProjection ? "+" : "-"}
                    <Money value={Math.abs(annualSimulatedProjection - annualProjection)} variant="full" />
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Planned Large Outlays Section */}
          <Card style={{ padding: 22 }}>
            <h4 style={{ margin: "0 0 14px 0", fontSize: 15, fontWeight: 800, color: THEME.ink }}>
              Planned One-off Future Outlays & Milestones
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <input
                  type="text"
                  placeholder="Event (e.g. Vacation, Gadget)"
                  value={newOutlayName}
                  onChange={(e) => setNewOutlayName(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-0)",
                    fontSize: 12,
                    color: THEME.ink,
                    minWidth: 160,
                  }}
                />
                <input
                  type="number"
                  placeholder="Amount (₹)"
                  value={newOutlayAmount}
                  onChange={(e) => setNewOutlayAmount(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-0)",
                    fontSize: 12,
                    color: THEME.ink,
                    width: 120,
                  }}
                />
                <select
                  value={newOutlayMonth}
                  onChange={(e) => setNewOutlayMonth(e.target.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-0)",
                    fontSize: 12,
                    color: THEME.ink,
                  }}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      In {m} Month{m === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
                <Button variant="accent" size="sm" icon={<Plus size={13} />} onClick={handleAddOutlay}>
                  Add Outlay
                </Button>
              </div>

              {/* List of planned outlays */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                {plannedOutlays.map((o) => (
                  <div
                    key={o.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 12px",
                      borderRadius: 8,
                      background: "var(--surface-1)",
                      border: `1px solid ${THEME.line}`,
                      fontSize: 12,
                    }}
                  >
                    <span style={{ fontWeight: 700, color: THEME.ink }}>{o.name}:</span>
                    <span style={{ fontWeight: 800, color: "var(--accent)" }}>
                      <Money value={o.amount} variant="full" />
                    </span>
                    <span style={{ fontSize: 10, color: THEME.muted }}>(In {o.monthOffset}m)</span>
                    <button
                      onClick={() => handleRemoveOutlay(o.id)}
                      style={{
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        color: THEME.muted,
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                      }}
                      title="Remove"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── CATEGORY DRILLDOWN MODAL ────────────────────────────────────── */}
      {selectedCatData && (
        <Modal
          title={`Category Intelligence: ${selectedCatData.category}`}
          onClose={() => setSelectedCategory(null)}
          maxWidth={600}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
                padding: "12px 14px",
                borderRadius: 10,
                background: "var(--surface-1)",
              }}
            >
              <div>
                <div style={{ fontSize: 10.5, color: THEME.muted, fontWeight: 700 }}>Monthly Average</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, marginTop: 2 }}>
                  <Money value={selectedCatData.avg} variant="full" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: THEME.muted, fontWeight: 700 }}>Next Month Forecast</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--accent)", marginTop: 2 }}>
                  <Money value={selectedCatData.forecastNext} variant="full" />
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: THEME.muted, fontWeight: 700 }}>Volatility (CV)</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, marginTop: 2 }}>
                  {selectedCatData.cv}% ({selectedCatData.volatility})
                </div>
              </div>
            </div>

            {/* Historical Spend Bar Chart for this category */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink, marginBottom: 8 }}>
                Historical Monthly Outlay Trajectory
              </div>
              <div style={{ width: "100%", height: 200, position: "relative" }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart
                    data={historicalData.slice(-12).map((h) => ({
                      month: h.label,
                      amount: Number(h[selectedCatData.category] || 0),
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: THEME.muted }} tickLine={false} />
                    <YAxis
                      tickFormatter={(v) => (privacyMode ? "••" : fmtINR(v))}
                      tick={{ fontSize: 10, fill: THEME.muted }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: THEME.line, opacity: 0.3 }} />
                    <Bar dataKey="amount" name={selectedCatData.category} fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button variant="secondary" onClick={() => setSelectedCategory(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── METHODOLOGY & STATISTICAL DISCLAIMER ────────────────────────── */}
      <div
        style={{
          padding: "12px 18px",
          borderRadius: 10,
          background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
          border: `1px solid color-mix(in srgb, ${THEME.muted} 13%, transparent)`,
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          fontSize: 11.5,
          color: THEME.muted,
          lineHeight: 1.6,
        }}
      >
        <Info size={15} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          <strong>Predictive Methodology:</strong> The forecasting engine integrates deterministic
          obligations (active loan EMIs, subscriptions, and insurance premiums) with statistical time-series
          blends of historical category spend. The ±20% confidence band accounts for stochastic lifestyle
          variations and discretionary spikes. What-If simulations project compounded inflation and flexible
          spending shifts.
        </span>
      </div>
    </div>
  );
};
