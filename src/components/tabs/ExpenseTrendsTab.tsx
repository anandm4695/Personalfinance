/* eslint-disable */
// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  BarChart2,
  Wallet,
  Activity,
  ShieldAlert,
  Layers,
  ArrowUp,
  ArrowDown,
  Package,
  Search,
  Download,
} from "lucide-react";
import {
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
  Line,
  ReferenceLine,
  ComposedChart,
} from "recharts";
import { THEME, PIE_COLORS } from "../../utils/constants";
import { fmtINR, fmtINRFull, exportArrayToCSV } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";

/* ─── STYLES ──────────────────────────────────────────────────────────────── */

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "14px 16px",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: THEME.muted,
  fontWeight: 700,
  borderBottom: `1.5px solid ${THEME.line}`,
  whiteSpace: "nowrap",
  background: "color-mix(in srgb, var(--surface-1) 50%, transparent)",
};

const td: React.CSSProperties = {
  padding: "14px 16px",
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

type Period = "3m" | "6m" | "12m" | "ytd" | "custom";

/* ─── HELPERS ─────────────────────────────────────────────────────────────── */

function getMonthKey(date: string): string {
  return date.slice(0, 7); // "YYYY-MM"
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

function fullMonthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${FULL_MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
}

function parseDate(d: string): Date {
  return new Date(d + "T00:00:00");
}

function dateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getDateRange(period: Period, customStart: string, customEnd: string): [string, string] {
  const now = new Date();
  const todayStr = dateStr(now);

  switch (period) {
    // setDate(1) must run BEFORE setMonth() — on the 29th-31st, setMonth() on a
    // date still holding that day-of-number overflows into the following month
    // when the target month is shorter (e.g. May 31 minus 3 months lands on
    // Mar 3, not Feb 1), silently shrinking the trend window by up to a month.
    case "3m": {
      const d = new Date(now);
      d.setDate(1);
      d.setMonth(d.getMonth() - 3);
      return [dateStr(d), todayStr];
    }
    case "6m": {
      const d = new Date(now);
      d.setDate(1);
      d.setMonth(d.getMonth() - 6);
      return [dateStr(d), todayStr];
    }
    case "12m": {
      const d = new Date(now);
      d.setDate(1);
      d.setMonth(d.getMonth() - 12);
      return [dateStr(d), todayStr];
    }
    case "ytd": {
      const fyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      return [`${fyStart}-04-01`, todayStr];
    }
    case "custom": {
      const start = customStart || todayStr;
      const end = customEnd || todayStr;
      // A reversed pick (start after end) isn't invalid input to reject — it's an
      // obvious swap. Silently correcting it beats a blank "no data" screen with no
      // hint why, which is what falls out of the date filter otherwise.
      return start > end ? [end, start] : [start, end];
    }
    default:
      return [dateStr(new Date(now.getFullYear(), now.getMonth() - 6, 1)), todayStr];
  }
}

function extractMerchant(narration: string): string {
  if (!narration) return "Unknown";
  let n = narration.trim();
  const upiMatch = n.match(/UPI[-\/].*?[-\/](.+?)[-\/]/i);
  if (upiMatch) return upiMatch[1].trim().slice(0, 30);
  const neftMatch = n.match(/(?:NEFT|IMPS|RTGS)[-\/].*?[-\/](.+?)[-\/]/i);
  if (neftMatch) return neftMatch[1].trim().slice(0, 30);
  const parts = n.split(/[-\/|]/);
  const meaningful = parts.find((p) => p.trim().length > 2);
  return meaningful ? meaningful.trim().slice(0, 30) : n.slice(0, 30);
}

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
      <div style={{ fontWeight: 800, color: THEME.ink, marginBottom: 6, letterSpacing: "-0.01em" }}>
        {label}
      </div>
      {visible.map((p: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: p.color,
              display: "inline-block",
            }}
          />
          <span style={{ color: THEME.muted, fontWeight: 500 }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: THEME.ink }}>
            <Prv>{formatter ? formatter(p.value) : <Money value={p.value} variant="full" />}</Prv>
          </span>
        </div>
      ))}
    </div>
  );
};

/* ─── Premium Stat Card ───────────────────────────────────────── */
const PremiumStatCard = ({
  label,
  value,
  color,
  icon: Icon,
  sub,
  subColor,
  numericValue,
  formatValue,
}: any) => {
  const hasAnimation = typeof numericValue === "number" && typeof formatValue === "function";
  const animated = useAnimatedNumber(hasAnimation ? numericValue : 0);
  const displayValue = hasAnimation ? formatValue(animated) : value;
  return (
  <div
    className="card-lift"
    style={{
      background: "var(--t-card-bg)",
      border: `1.5px solid ${THEME.line}`,
      borderTop: `4px solid ${color}`,
      borderRadius: 16,
      padding: "18px 20px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      gap: 12,
      transition: "border-color 0.2s var(--ease-premium)",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", color, flexShrink: 0 }}>
        <Icon size={22} />
      </div>
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: THEME.muted,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          {label}
        </div>
        {sub && (
          <div
            style={{
              fontSize: 10,
              color: subColor || THEME.muted,
              fontWeight: subColor ? 700 : 400,
              marginTop: 2,
              opacity: subColor ? 1 : 0.8,
            }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
    <div
      style={{
        fontSize: 26,
        fontWeight: 900,
        color: THEME.ink,
        letterSpacing: "-0.04em",
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
        marginTop: 4,
      }}
    >
      <Prv>{displayValue}</Prv>
    </div>
  </div>
  );
};

/* ─── MAIN COMPONENT ──────────────────────────────────────────────────────── */

export const ExpenseTrendsTab = ({ state, metrics }: any) => {
  const { privacyMode } = usePrivacy();
  const [period, setPeriod] = useState<Period>("6m");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [sortCol, setSortCol] = useState<string>("periodTotal");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);
  const [catFilter, setCatFilter] = useState("");

  const txns = state?.transactions || [];

  const [rangeStart, rangeEnd] = useMemo(
    () => getDateRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  );

  const periodTxns = useMemo(
    () => txns.filter((t: any) => t.date >= rangeStart && t.date <= rangeEnd),
    [txns, rangeStart, rangeEnd]
  );

  // Exclude internal transfers (between the user's own accounts) — same treatment as
  // BanksTab's dashboard KPI cards / useMetrics.ts, so trend totals here don't inflate
  // both "income" and "expense" every time money moves between two of the user's own
  // accounts (each leg of a transfer is separately categorised "Transfer").
  const isTransferCat = (cat: string) =>
    cat === "Transfer" || cat === "Self Transfer" || cat === "Self-Transfer";
  const expenses = useMemo(
    () => periodTxns.filter((t: any) => t.type === "debit" && !isTransferCat(t.category)),
    [periodTxns]
  );
  const income = useMemo(
    () => periodTxns.filter((t: any) => t.type === "credit" && !isTransferCat(t.category)),
    [periodTxns]
  );

  const monthlyData = useMemo(() => {
    const expenseMap: Record<string, number> = {};
    const incomeMap: Record<string, number> = {};

    expenses.forEach((t: any) => {
      const mk = getMonthKey(t.date);
      expenseMap[mk] = (expenseMap[mk] || 0) + Number(t.amount || 0);
    });

    income.forEach((t: any) => {
      const mk = getMonthKey(t.date);
      incomeMap[mk] = (incomeMap[mk] || 0) + Number(t.amount || 0);
    });

    const months: string[] = [];
    const start = new Date(rangeStart + "T00:00:00");
    const end = new Date(rangeEnd + "T00:00:00");
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const mk = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      months.push(mk);
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return months.map((mk) => ({
      month: mk,
      label: monthLabel(mk),
      expense: expenseMap[mk] || 0,
      income: incomeMap[mk] || 0,
      net: (incomeMap[mk] || 0) - (expenseMap[mk] || 0),
      savingsRate:
        (incomeMap[mk] || 0) > 0
          ? (((incomeMap[mk] || 0) - (expenseMap[mk] || 0)) / (incomeMap[mk] || 0)) * 100
          : 0,
    }));
  }, [expenses, income, rangeStart, rangeEnd]);

  const summary = useMemo(() => {
    const totalSpend = expenses.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const monthCount = Math.max(monthlyData.length, 1);
    const avgMonthly = totalSpend / monthCount;

    let highestMonth = { month: "", amount: 0 };
    let lowestMonth = { month: "", amount: Infinity };

    monthlyData.forEach((m) => {
      if (m.expense > highestMonth.amount) {
        highestMonth = { month: m.month, amount: m.expense };
      }
      if (m.expense < lowestMonth.amount && m.expense > 0) {
        lowestMonth = { month: m.month, amount: m.expense };
      }
    });

    if (lowestMonth.amount === Infinity) {
      lowestMonth = { month: "", amount: 0 };
    }

    // Compare the last two calendar-adjacent months in the range (monthlyData already
    // includes every month even ones with ₹0 spend) — NOT the last two months that merely
    // happen to have data, which would silently compare two non-adjacent months (e.g. Feb
    // vs Apr if Mar had no spend) while still labeling it "Month-over-Month".
    let momChange = 0;
    if (monthlyData.length >= 2) {
      const curr = monthlyData[monthlyData.length - 1].expense;
      const prev = monthlyData[monthlyData.length - 2].expense;
      momChange = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
    }

    return { totalSpend, avgMonthly, highestMonth, lowestMonth, momChange };
  }, [expenses, monthlyData]);

  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    expenses.forEach((t: any) => {
      const cat = t.category || "Uncategorized";
      catMap[cat] = (catMap[cat] || 0) + Number(t.amount || 0);
    });

    return Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  // Single source of truth for category → color, keyed off categoryData's spend-sorted
  // order. Every chart below (donut, its legend, and the stacked bar) must read colors
  // from this map rather than indexing into their own locally-ordered category lists —
  // otherwise the same category renders in two different colors across charts that are
  // meant to be compared side by side.
  const categoryColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    categoryData.forEach((c, i) => {
      map[c.name] = PIE_COLORS[i % PIE_COLORS.length];
    });
    return map;
  }, [categoryData]);

  const categoryStackedData = useMemo(() => {
    const monthCatMap: Record<string, Record<string, number>> = {};

    expenses.forEach((t: any) => {
      const mk = getMonthKey(t.date);
      const cat = t.category || "Uncategorized";
      if (!monthCatMap[mk]) monthCatMap[mk] = {};
      monthCatMap[mk][cat] = (monthCatMap[mk][cat] || 0) + Number(t.amount || 0);
    });

    const cats = categoryData.map((c) => c.name);

    return {
      data: monthlyData.map((m) => {
        const entry: any = { label: m.label };
        cats.forEach((c) => {
          entry[c] = monthCatMap[m.month]?.[c] || 0;
        });
        return entry;
      }),
      categories: cats,
    };
  }, [expenses, monthlyData, categoryData]);

  const categoryTableData = useMemo(() => {
    // "This month" / "Last month" must be relative to the latest month
    // actually present in the already period-filtered `expenses`, not the
    // real today's date — otherwise viewing a past period shows ₹0 for
    // both columns while "Period Total" is correct.
    const presentMonthKeys = Array.from(
      new Set(expenses.map((t: any) => getMonthKey(t.date)))
    ).sort();
    const shiftMonthKey = (key: string, delta: number) => {
      const [y, m] = key.split("-").map(Number);
      const d = new Date(y, m - 1 + delta, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };
    const now = new Date();
    const thisMonthKey =
      presentMonthKeys[presentMonthKeys.length - 1] ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastMonthKey = shiftMonthKey(thisMonthKey, -1);
    const avg3Keys: string[] = [1, 2, 3].map((i) => shiftMonthKey(thisMonthKey, -i));

    const catMonthMap: Record<string, Record<string, number>> = {};
    const catPeriodTotal: Record<string, number> = {};

    expenses.forEach((t: any) => {
      const cat = t.category || "Uncategorized";
      const mk = getMonthKey(t.date);
      if (!catMonthMap[cat]) catMonthMap[cat] = {};
      catMonthMap[cat][mk] = (catMonthMap[cat][mk] || 0) + Number(t.amount || 0);
      catPeriodTotal[cat] = (catPeriodTotal[cat] || 0) + Number(t.amount || 0);
    });

    return Object.keys(catMonthMap).map((cat) => {
      const thisMonth = catMonthMap[cat][thisMonthKey] || 0;
      const lastMonthVal = catMonthMap[cat][lastMonthKey] || 0;
      const avg3Sum = avg3Keys.reduce((s, k) => s + (catMonthMap[cat][k] || 0), 0);
      const avg3 = avg3Sum / Math.max(avg3Keys.filter((k) => catMonthMap[cat][k]).length, 1);
      const changePct = lastMonthVal > 0 ? ((thisMonth - lastMonthVal) / lastMonthVal) * 100 : 0;
      const isAnomaly = avg3 > 0 && thisMonth > avg3 * 2;

      return {
        category: cat,
        thisMonth,
        lastMonth: lastMonthVal,
        changePct,
        avg3,
        periodTotal: catPeriodTotal[cat] || 0,
        isAnomaly,
      };
    });
  }, [expenses]);

  const sortedCategoryTable = useMemo(() => {
    const filtered = catFilter.trim()
      ? categoryTableData.filter((c) =>
          c.category.toLowerCase().includes(catFilter.trim().toLowerCase())
        )
      : categoryTableData;
    const sorted = [...filtered].sort((a: any, b: any) => {
      const aVal = a[sortCol] ?? 0;
      const bVal = b[sortCol] ?? 0;
      if (typeof aVal === "string")
        return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [categoryTableData, sortCol, sortDir, catFilter]);

  const handleExportCategoryTable = () => {
    const rows = sortedCategoryTable.map((r) => ({
      category: r.category,
      thisMonth: Math.round(r.thisMonth),
      lastMonth: Math.round(r.lastMonth),
      changePct: `${r.changePct.toFixed(1)}%`,
      avg3Month: Math.round(r.avg3),
      periodTotal: Math.round(r.periodTotal),
      anomaly: r.isAnomaly ? "Yes" : "No",
    }));
    exportArrayToCSV(
      rows,
      [
        { key: "category", label: "Category" },
        { key: "thisMonth", label: "This Month" },
        { key: "lastMonth", label: "Last Month" },
        { key: "changePct", label: "Change %" },
        { key: "avg3Month", label: "3M Avg" },
        { key: "periodTotal", label: "Period Total" },
        { key: "anomaly", label: "Anomaly" },
      ],
      `Expense_Category_Breakdown_${rangeStart}_to_${rangeEnd}.csv`
    );
  };

  const topMerchants = useMemo(() => {
    const merchantMap: Record<string, number> = {};
    expenses.forEach((t: any) => {
      const merchant = extractMerchant(t.narration || t.note || t.description || "");
      merchantMap[merchant] = (merchantMap[merchant] || 0) + Number(t.amount || 0);
    });

    return Object.entries(merchantMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [expenses]);

  const anomalies = useMemo(() => {
    const catAnomalies = categoryTableData.filter((c) => c.isAnomaly);
    const catAvg: Record<string, number> = {};
    const catCount: Record<string, number> = {};
    expenses.forEach((t: any) => {
      const cat = t.category || "Uncategorized";
      catAvg[cat] = (catAvg[cat] || 0) + Number(t.amount || 0);
      catCount[cat] = (catCount[cat] || 0) + 1;
    });
    Object.keys(catAvg).forEach((c) => {
      catAvg[c] = catAvg[c] / (catCount[c] || 1);
    });

    const txnAnomalies = expenses
      .filter((t: any) => {
        const cat = t.category || "Uncategorized";
        const avg = catAvg[cat] || 0;
        return avg > 0 && Number(t.amount || 0) > avg * 3;
      })
      .sort((a: any, b: any) => Number(b.amount) - Number(a.amount))
      .slice(0, 10);

    return { catAnomalies, txnAnomalies };
  }, [expenses, categoryTableData]);

  const avgSpend = useMemo(() => {
    const vals = monthlyData.filter((m) => m.expense > 0).map((m) => m.expense);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }, [monthlyData]);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return <ChevronDown size={10} style={{ opacity: 0.3 }} />;
    return sortDir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />;
  };

  if (!txns.length) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <SectionTitle sub="Analyze your spending patterns, track category-wise trends, and detect anomalies.">
          Expense Trends & Analytics
        </SectionTitle>
        <EmptyState
          icon={BarChart2}
          title="No Transactions Yet"
          description="Add transactions from the Banks tab to start seeing your expense trends and analytics here."
          pills={["Category trends", "Top merchants", "Anomaly detection"]}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle sub="Analyze your spending patterns, track category-wise trends, and detect anomalies.">
        Expense Trends & Analytics
      </SectionTitle>

      {/* Premium Period Selector */}
      <div
        style={{
          padding: "12px 16px",
          background: "var(--surface-0)",
          border: `1.5px solid ${THEME.line}`,
          borderRadius: 16,
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: THEME.muted }}>
          <Calendar size={15} />
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Period
          </span>
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(
            [
              { key: "3m", label: "Last 3 Months" },
              { key: "6m", label: "Last 6 Months" },
              { key: "12m", label: "Last 12 Months" },
              { key: "ytd", label: "YTD" },
              { key: "custom", label: "Custom" },
            ] as { key: Period; label: string }[]
          ).map((opt) => {
            const active = period === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setPeriod(opt.key)}
                className={`demat-portfolio-pill ${active ? "active" : ""}`}
                aria-pressed={active}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {period === "custom" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
            <input
              type="date"
              aria-label="Custom range start date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              style={{
                border: `1px solid ${THEME.line}`,
                borderRadius: 8,
                padding: "5px 10px",
                fontSize: 12,
                color: THEME.ink,
                background: "var(--surface-0)",
              }}
            />
            <span style={{ color: THEME.muted, fontSize: 12 }}>to</span>
            <input
              type="date"
              aria-label="Custom range end date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              style={{
                border: `1px solid ${THEME.line}`,
                borderRadius: 8,
                padding: "5px 10px",
                fontSize: 12,
                color: THEME.ink,
                background: "var(--surface-0)",
              }}
            />
          </div>
        )}
      </div>

      {/* Premium Stat Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
        <PremiumStatCard
          label="Total Spend"
          value={fmtINRFull(summary.totalSpend)}
          numericValue={summary.totalSpend}
          formatValue={fmtINRFull}
          icon={Wallet}
          color={PIE_COLORS[3]}
          sub={`${monthLabel(getMonthKey(rangeStart))} – ${monthLabel(getMonthKey(rangeEnd))}`}
        />
        <PremiumStatCard
          label="Avg Monthly"
          value={fmtINRFull(summary.avgMonthly)}
          numericValue={summary.avgMonthly}
          formatValue={fmtINRFull}
          icon={Activity}
          color={PIE_COLORS[0]}
          sub={`Over ${monthlyData.length} month${monthlyData.length !== 1 ? "s" : ""}`}
        />
        <PremiumStatCard
          label="Highest Month"
          value={fmtINRFull(summary.highestMonth.amount)}
          numericValue={summary.highestMonth.amount}
          formatValue={fmtINRFull}
          icon={TrendingUp}
          color={THEME.rust}
          sub={summary.highestMonth.month ? fullMonthLabel(summary.highestMonth.month) : "--"}
          subColor={THEME.rust}
        />
        <PremiumStatCard
          label="Lowest Month"
          value={fmtINRFull(summary.lowestMonth.amount)}
          numericValue={summary.lowestMonth.amount}
          formatValue={fmtINRFull}
          icon={TrendingDown}
          color={THEME.sage}
          sub={summary.lowestMonth.month ? fullMonthLabel(summary.lowestMonth.month) : "--"}
          subColor={THEME.sage}
        />
        <PremiumStatCard
          label="MoM Change"
          value={`${summary.momChange >= 0 ? "+" : ""}${summary.momChange.toFixed(1)}%`}
          numericValue={summary.momChange}
          formatValue={(n) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`}
          icon={summary.momChange >= 0 ? ArrowUpRight : ArrowDownRight}
          color={summary.momChange >= 0 ? THEME.rust : THEME.sage}
          sub={summary.momChange >= 0 ? "Spending up" : "Spending down"}
          subColor={summary.momChange >= 0 ? THEME.rust : THEME.sage}
        />
      </div>

      {/* Monthly Spend Trend ComposedChart */}
      <Card style={{ padding: "24px 20px" }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: THEME.ink,
            marginBottom: 4,
            letterSpacing: "-0.015em",
          }}
        >
          Monthly Spend Trend
        </div>
        <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 20 }}>
          Expense area with income overlay and average reference line
        </div>
        <div style={{ width: "100%", height: 320, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PIE_COLORS[3]} stopOpacity={0.25} />
                <stop offset="95%" stopColor={PIE_COLORS[3]} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PIE_COLORS[1]} stopOpacity={0.2} />
                <stop offset="95%" stopColor={PIE_COLORS[1]} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: THEME.muted }}
              axisLine={{ stroke: THEME.line }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: THEME.muted }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => (privacyMode ? "••••" : fmtINR(v))}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: THEME.line }} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
              formatter={(value: string) => (
                <span style={{ color: THEME.ink, fontWeight: 600 }}>{value}</span>
              )}
            />
            <ReferenceLine
              y={avgSpend}
              stroke={THEME.muted}
              strokeDasharray="6 4"
              label={{
                value: `Avg: ${privacyMode ? "••••" : fmtINR(avgSpend)}`,
                position: "insideTopRight",
                fill: THEME.muted,
                fontSize: 10,
              }}
            />
            <Area
              type="monotone"
              dataKey="expense"
              name="Expenses"
              stroke={PIE_COLORS[3]}
              fill="url(#expenseGrad)"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="income"
              name="Income"
              stroke={PIE_COLORS[1]}
              strokeWidth={2}
              dot={{ r: 3, fill: PIE_COLORS[1] }}
            />
          </ComposedChart>
        </ResponsiveContainer></div>
      </Card>

      {/* Category Breakdown (Donut + Stacked Bar) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 16,
        }}
      >
        {/* Donut chart */}
        <Card style={{ padding: "24px 20px" }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: THEME.ink,
              marginBottom: 4,
              letterSpacing: "-0.015em",
            }}
          >
            Spend by Category
          </div>
          <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 16 }}>
            Hover sections to inspect individual details
          </div>
          {categoryData.length > 0 ? (
            <>
              <div style={{ width: "100%", height: 280, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    onMouseEnter={(_, index) => setActivePieIndex(index)}
                    onMouseLeave={() => setActivePieIndex(null)}
                  >
                    {categoryData.map((c: any, i: number) => (
                      <Cell
                        key={i}
                        fill={categoryColorMap[c.name] || PIE_COLORS[i % PIE_COLORS.length]}
                        style={{
                          filter:
                            activePieIndex === i
                              ? "drop-shadow(0 4px 10px rgba(0,0,0,0.15))"
                              : "none",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0];
                      const pct =
                        summary.totalSpend > 0
                          ? ((d.value / summary.totalSpend) * 100).toFixed(1)
                          : "0";
                      return (
                        <div
                          style={{
                            background: "color-mix(in srgb, var(--surface-0) 85%, transparent)",
                            backdropFilter: "blur(12px)",
                            border: `1.5px solid ${THEME.line}`,
                            borderRadius: 12,
                            padding: "10px 14px",
                            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
                            fontSize: 12,
                          }}
                        >
                          <div style={{ fontWeight: 800, color: THEME.ink }}>{d.name}</div>
                          <div style={{ color: THEME.muted, marginTop: 4, fontWeight: 600 }}>
                            <Money value={d.value} variant="full" /> ({pct}%)
                          </div>
                        </div>
                      );
                    }}
                  />
                  {activePieIndex !== null && categoryData[activePieIndex] ? (
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
                        {categoryData[activePieIndex].name}
                      </text>
                      <text
                        x="50%"
                        y="56%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 18,
                          fill: THEME.ink,
                          fontWeight: 900,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {privacyMode
                          ? "••••"
                          : `₹${categoryData[activePieIndex].value.toLocaleString("en-IN", {
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
                        Total Spend
                      </text>
                      <text
                        x="50%"
                        y="56%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 18,
                          fill: THEME.ink,
                          fontWeight: 900,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {privacyMode
                          ? "••••"
                          : `₹${summary.totalSpend.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
                      </text>
                    </>
                  )}
                </PieChart>
              </ResponsiveContainer></div>
              {/* Legend */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px 16px",
                  marginTop: 8,
                }}
              >
                {categoryData.slice(0, 8).map((c: any) => (
                  <div
                    key={c.name}
                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: categoryColorMap[c.name],
                        display: "inline-block",
                      }}
                    />
                    <span style={{ color: THEME.muted, fontWeight: 500 }}>{c.name}</span>
                    <span style={{ fontWeight: 700, color: THEME.ink }}>
                      <Money value={c.value} variant="full" />
                    </span>
                  </div>
                ))}
                {categoryData.length > 8 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      fontSize: 11,
                      color: THEME.muted,
                      fontWeight: 700,
                    }}
                  >
                    +{categoryData.length - 8} more
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: THEME.muted, fontSize: 13 }}>
              No expense data for this period
            </div>
          )}
        </Card>

        {/* Stacked bar chart */}
        <Card style={{ padding: "24px 20px" }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: THEME.ink,
              marginBottom: 4,
              letterSpacing: "-0.015em",
            }}
          >
            Category Trends
          </div>
          <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 16 }}>
            Month-by-month category-wise breakdown
          </div>
          {categoryStackedData.categories.length > 0 ? (
            <div style={{ width: "100%", height: 320, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={categoryStackedData.data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: THEME.muted }}
                  axisLine={{ stroke: THEME.line }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: THEME.muted }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => (privacyMode ? "••••" : fmtINR(v))}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: THEME.line, opacity: 0.4 }} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                  iconType="circle"
                  formatter={(value: string) => (
                    <span style={{ color: THEME.ink, fontWeight: 600 }}>{value}</span>
                  )}
                />
                {categoryStackedData.categories.map((cat: string, i: number) => (
                  <Bar
                    key={cat}
                    dataKey={cat}
                    stackId="cats"
                    fill={categoryColorMap[cat] || PIE_COLORS[i % PIE_COLORS.length]}
                    radius={
                      i === categoryStackedData.categories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
                    }
                  />
                ))}
              </BarChart>
            </ResponsiveContainer></div>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: THEME.muted, fontSize: 13 }}>
              No expense data for this period
            </div>
          )}
        </Card>
      </div>

      {/* Category Deep Dive Table */}
      <Card style={{ padding: "24px 20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: THEME.ink,
                marginBottom: 4,
                letterSpacing: "-0.015em",
              }}
            >
              Category Deep Dive
            </div>
            <div style={{ fontSize: 12, color: THEME.muted }}>
              Click any row to see individual transactions. Anomalies are flagged with a warning
              badge.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
            <button
              onClick={handleExportCategoryTable}
              disabled={!sortedCategoryTable.length}
              className="card-lift"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                border: `1px solid ${THEME.line}`,
                background: "var(--surface-0)",
                color: THEME.ink,
                fontSize: 12,
                fontWeight: 600,
                cursor: sortedCategoryTable.length ? "pointer" : "not-allowed",
                opacity: sortedCategoryTable.length ? 1 : 0.5,
              }}
            >
              <Download size={13} />
              Export CSV
            </button>
          </div>
        </div>
        {sortedCategoryTable.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {[
                    { key: "category", label: "Category" },
                    { key: "thisMonth", label: "This Month" },
                    { key: "lastMonth", label: "Last Month" },
                    { key: "changePct", label: "Change %" },
                    { key: "avg3", label: "3M Avg" },
                    { key: "periodTotal", label: "Period Total" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      style={{
                        ...th,
                        cursor: "pointer",
                        userSelect: "none",
                      }}
                      tabIndex={0}
                      role="button"
                      aria-sort={
                        sortCol === col.key
                          ? sortDir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                      }
                      onClick={() => handleSort(col.key)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSort(col.key);
                        }
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        {col.label} <SortIcon col={col.key} />
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedCategoryTable.map((row) => (
                  <React.Fragment key={row.category}>
                    <tr
                      className="table-row-hover"
                      style={{ cursor: "pointer" }}
                      tabIndex={0}
                      role="button"
                      aria-expanded={expandedCat === row.category}
                      aria-label={`${row.category} — ${expandedCat === row.category ? "collapse" : "expand"} transactions`}
                      onClick={() =>
                        setExpandedCat(expandedCat === row.category ? null : row.category)
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedCat(expandedCat === row.category ? null : row.category);
                        }
                      }}
                    >
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {expandedCat === row.category ? (
                            <ChevronDown size={14} style={{ color: THEME.muted }} />
                          ) : (
                            <ChevronRight size={14} style={{ color: THEME.muted }} />
                          )}
                          <span style={{ fontWeight: 700, color: THEME.ink }}>{row.category}</span>
                          {row.isAnomaly && (
                            <Badge
                              variant="rust"
                              style={{
                                fontSize: 9,
                                padding: "2px 6px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              <AlertTriangle size={10} />
                              Anomaly
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td style={{ ...td, fontWeight: 600 }}>
                        <Money value={row.thisMonth} variant="full" />
                      </td>
                      <td style={{ ...td, fontWeight: 500, color: THEME.muted }}>
                        <Money value={row.lastMonth} variant="full" />
                      </td>
                      <td style={td}>
                        <span
                          style={{
                            color:
                              row.changePct > 0
                                ? THEME.rust
                                : row.changePct < 0
                                  ? THEME.sage
                                  : THEME.muted,
                            fontWeight: 700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          {row.changePct > 0 ? (
                            <ArrowUpRight size={12} />
                          ) : row.changePct < 0 ? (
                            <ArrowDownRight size={12} />
                          ) : null}
                          {row.changePct !== 0
                            ? `${row.changePct > 0 ? "+" : ""}${row.changePct.toFixed(1)}%`
                            : "--"}
                        </span>
                      </td>
                      <td style={{ ...td, fontWeight: 600 }}>
                        <Money value={row.avg3} variant="full" />
                      </td>
                      <td style={{ ...td, fontWeight: 800, fontSize: 14 }}>
                        <Money value={row.periodTotal} variant="full" />
                      </td>
                    </tr>

                    {/* Expanded transaction rows */}
                    {expandedCat === row.category && (
                      <tr>
                        <td colSpan={6} style={{ padding: 0 }}>
                          <div
                            style={{
                              background: "var(--surface-1)",
                              padding: "16px 20px",
                              borderBottom: `1.5px solid ${THEME.line}`,
                              boxShadow: "inset 0 2px 10px rgba(0,0,0,0.02)",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: THEME.muted,
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                marginBottom: 12,
                              }}
                            >
                              Transactions in {row.category}
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                              {expenses
                                .filter(
                                  (t: any) => (t.category || "Uncategorized") === row.category
                                )
                                .sort((a: any, b: any) => b.date.localeCompare(a.date))
                                .slice(0, 20)
                                .map((t: any, idx: number) => (
                                  <div
                                    key={t.id}
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      padding: "10px 0",
                                      borderBottom: `1px solid ${THEME.line}`,
                                      fontSize: 12.5,
                                    }}
                                  >
                                    <div style={{ flex: 1 }}>
                                      <div
                                        style={{
                                          fontWeight: 700,
                                          color: THEME.ink,
                                          marginBottom: 2,
                                        }}
                                      >
                                        {t.narration || t.note || t.description || "No description"}
                                      </div>
                                      <div style={{ color: THEME.muted, fontSize: 11 }}>
                                        {new Date(t.date + "T00:00:00").toLocaleDateString(
                                          "en-IN",
                                          {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                          }
                                        )}
                                      </div>
                                    </div>
                                    <div
                                      style={{ fontWeight: 800, color: THEME.rust, fontSize: 13.5 }}
                                    >
                                      <Money value={t.amount} variant="full" />
                                    </div>
                                  </div>
                                ))}
                            </div>
                            {expenses.filter(
                              (t: any) => (t.category || "Uncategorized") === row.category
                            ).length > 20 && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: THEME.muted,
                                  textAlign: "center",
                                  padding: "10px 0 0",
                                  fontWeight: 600,
                                }}
                              >
                                Showing first 20 of{" "}
                                {
                                  expenses.filter(
                                    (t: any) => (t.category || "Uncategorized") === row.category
                                  ).length
                                }{" "}
                                transactions
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 40, color: THEME.muted, fontSize: 13 }}>
            {catFilter.trim() && categoryTableData.length > 0
              ? `No category matches "${catFilter.trim()}"`
              : "No expense data for this period"}
          </div>
        )}
      </Card>

      {/* Top Merchants / Payees */}
      <Card style={{ padding: "24px 20px" }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: THEME.ink,
            marginBottom: 4,
            letterSpacing: "-0.015em",
          }}
        >
          Top Merchants / Payees
        </div>
        <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 16 }}>
          Top 10 by total spend, extracted from transaction narrations
        </div>
        {topMerchants.length > 0 ? (
          <div style={{ width: "100%", height: Math.max(topMerchants.length * 40 + 40, 200), position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart
              data={topMerchants}
              layout="vertical"
              margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: THEME.muted }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => (privacyMode ? "••••" : fmtINR(v))}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: THEME.ink, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                width={140}
              />
              <Tooltip
                cursor={{ fill: THEME.line, opacity: 0.4 }}
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  const val = payload[0]?.value || 0;
                  const totalMerchantSpend = topMerchants.reduce(
                    (s: number, m: any) => s + m.amount,
                    0
                  );
                  const pct =
                    totalMerchantSpend > 0 ? ((val / totalMerchantSpend) * 100).toFixed(1) : "0";
                  return (
                    <div
                      style={{
                        background: "color-mix(in srgb, var(--surface-0) 85%, transparent)",
                        backdropFilter: "blur(12px)",
                        border: `1.5px solid ${THEME.line}`,
                        borderRadius: 12,
                        padding: "10px 14px",
                        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
                        fontSize: 12,
                      }}
                    >
                      <div style={{ fontWeight: 800, color: THEME.ink }}>
                        {payload[0]?.payload?.name}
                      </div>
                      <div style={{ color: THEME.muted, marginTop: 4, fontWeight: 600 }}>
                        <Money value={val} variant="full" /> ({pct}%)
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="amount" radius={[0, 6, 6, 0]} barSize={24}>
                {topMerchants.map((_: any, i: number) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer></div>
        ) : (
          <div style={{ textAlign: "center", padding: 40, color: THEME.muted, fontSize: 13 }}>
            No merchant data available
          </div>
        )}
      </Card>

      {/* Anomaly Detection */}
      {(anomalies.catAnomalies.length > 0 || anomalies.txnAnomalies.length > 0) && (
        <Card style={{ padding: "24px 20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <ShieldAlert size={18} style={{ color: THEME.rust }} />
            <span
              style={{ fontSize: 15, fontWeight: 700, color: THEME.ink, letterSpacing: "-0.015em" }}
            >
              Anomaly Detection
            </span>
          </div>
          <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 16 }}>
            Unusual spending patterns that need your attention
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Category anomalies */}
            {anomalies.catAnomalies.map((c: any) => (
              <div
                key={c.category}
                style={{
                  background: `color-mix(in srgb, ${THEME.rust} 5%, var(--surface-0))`,
                  border: `1.5px solid color-mix(in srgb, ${THEME.rust} 20%, ${THEME.line})`,
                  borderRadius: 12,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <AlertTriangle size={16} style={{ color: THEME.rust, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: THEME.ink }}>
                      {c.category} spending is unusually high
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                      This month: <Money value={c.thisMonth} variant="full" /> vs 3-month avg:{" "}
                      <Money value={c.avg3} variant="full" /> (
                      {c.avg3 > 0
                        ? `${((c.thisMonth / c.avg3) * 100 - 100).toFixed(0)}% above average`
                        : "N/A"}
                      )
                    </div>
                  </div>
                </div>
                <Badge variant="rust">Category Alert</Badge>
              </div>
            ))}

            {/* Transaction anomalies */}
            {anomalies.txnAnomalies.map((t: any) => (
              <div
                key={t.id}
                style={{
                  background: `color-mix(in srgb, ${THEME.gold} 5%, var(--surface-0))`,
                  border: `1px solid color-mix(in srgb, ${THEME.gold} 20%, ${THEME.line})`,
                  borderRadius: 12,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <AlertTriangle size={16} style={{ color: THEME.gold, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: THEME.ink }}>
                      Large transaction: <Money value={t.amount} variant="full" />
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                      {t.narration || t.note || t.description || "No description"} &middot;{" "}
                      {new Date(t.date + "T00:00:00").toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      &middot; {t.category || "Uncategorized"}
                    </div>
                  </div>
                </div>
                <Badge variant="gold">Outlier Txn</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Income vs Expense Comparison */}
      <Card style={{ padding: "24px 20px" }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: THEME.ink,
            marginBottom: 4,
            letterSpacing: "-0.015em",
          }}
        >
          Income vs Expense
        </div>
        <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 20 }}>
          Side-by-side comparison with net savings overlay and savings rate
        </div>
        <div style={{ width: "100%", height: 340, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: THEME.muted }}
              axisLine={{ stroke: THEME.line }}
              tickLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: THEME.muted }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => (privacyMode ? "••••" : fmtINR(v))}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: THEME.muted }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v.toFixed(0)}%`}
              domain={[-100, 100]}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: THEME.line }} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
              formatter={(value: string) => (
                <span style={{ color: THEME.ink, fontWeight: 600 }}>{value}</span>
              )}
            />
            <Bar
              yAxisId="left"
              dataKey="income"
              name="Income"
              fill={PIE_COLORS[1]}
              radius={[6, 6, 0, 0]}
              barSize={20}
              opacity={0.85}
            />
            <Bar
              yAxisId="left"
              dataKey="expense"
              name="Expense"
              fill={PIE_COLORS[3]}
              radius={[6, 6, 0, 0]}
              barSize={20}
              opacity={0.85}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="net"
              name="Net Savings"
              stroke={PIE_COLORS[0]}
              strokeWidth={2.5}
              dot={{ r: 4, fill: PIE_COLORS[0], strokeWidth: 1.5, stroke: "#fff" }}
            />
          </ComposedChart>
        </ResponsiveContainer></div>

        {/* Savings rate row */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 16,
            padding: "16px 0 0",
            borderTop: `1px solid ${THEME.line}`,
          }}
        >
          {monthlyData.map((m) => (
            <div
              key={m.month}
              style={{
                textAlign: "center",
                minWidth: 60,
                flex: "1 1 60px",
              }}
            >
              <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 4, fontWeight: 600 }}>
                {m.label}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  color: m.savingsRate >= 0 ? THEME.sage : THEME.rust,
                }}
              >
                {m.income > 0 ? `${m.savingsRate.toFixed(0)}%` : "--"}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginTop: 2,
                  fontWeight: 700,
                }}
              >
                Savings Rate
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
