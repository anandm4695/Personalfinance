// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  AlertTriangle,
  BarChart2,
  PieChart as PieIcon,
  Wallet,
  DollarSign,
  Activity,
  ShieldAlert,
  Layers,
  Users,
  Receipt,
  Search,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
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
  Line,
  LineChart,
  ReferenceLine,
  ComposedChart,
} from "recharts";
import { THEME, PIE_COLORS } from "../../utils/constants";
import { fmtINR, fmtINRFull, today } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Prv } from "../../context/PrivacyContext";

/* ─── STYLES ──────────────────────────────────────────────────────────────── */

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 10px",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: THEME.muted,
  fontWeight: 700,
  borderBottom: `1px solid ${THEME.line}`,
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "14px 10px",
  verticalAlign: "middle",
  fontSize: 13,
  borderBottom: `1px solid ${THEME.line}`,
  fontVariantNumeric: "tabular-nums",
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const FULL_MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
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
    case "3m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      d.setDate(1);
      return [dateStr(d), todayStr];
    }
    case "6m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      d.setDate(1);
      return [dateStr(d), todayStr];
    }
    case "12m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 12);
      d.setDate(1);
      return [dateStr(d), todayStr];
    }
    case "ytd": {
      return [`${now.getFullYear()}-01-01`, todayStr];
    }
    case "custom": {
      return [customStart || todayStr, customEnd || todayStr];
    }
    default:
      return [dateStr(new Date(now.getFullYear(), now.getMonth() - 6, 1)), todayStr];
  }
}

function extractMerchant(narration: string): string {
  if (!narration) return "Unknown";
  // Clean up common prefixes
  let n = narration.trim();
  // Remove UPI/ prefix and extract payee
  const upiMatch = n.match(/UPI[-\/].*?[-\/](.+?)[-\/]/i);
  if (upiMatch) return upiMatch[1].trim().slice(0, 30);
  // Remove NEFT/IMPS prefixes
  const neftMatch = n.match(/(?:NEFT|IMPS|RTGS)[-\/].*?[-\/](.+?)[-\/]/i);
  if (neftMatch) return neftMatch[1].trim().slice(0, 30);
  // Take first meaningful segment
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
        background: "var(--surface-0)",
        border: `1px solid ${THEME.line}`,
        borderRadius: 10,
        padding: "10px 14px",
        boxShadow: "var(--shadow-md)",
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 700, color: THEME.ink, marginBottom: 6 }}>{label}</div>
      {visible.map((p: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: p.color,
              display: "inline-block",
            }}
          />
          <span style={{ color: THEME.muted }}>{p.name}:</span>
          <span style={{ fontWeight: 600, color: THEME.ink }}>
            {formatter ? formatter(p.value) : fmtINRFull(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ─── MAIN COMPONENT ──────────────────────────────────────────────────────── */

export const ExpenseTrendsTab = ({ state, metrics }: any) => {
  const [period, setPeriod] = useState<Period>("6m");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [sortCol, setSortCol] = useState<string>("periodTotal");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const txns = state?.transactions || [];

  const [rangeStart, rangeEnd] = useMemo(
    () => getDateRange(period, customStart, customEnd),
    [period, customStart, customEnd],
  );

  /* ── Filter transactions by period ── */
  const periodTxns = useMemo(
    () => txns.filter((t: any) => t.date >= rangeStart && t.date <= rangeEnd),
    [txns, rangeStart, rangeEnd],
  );

  const expenses = useMemo(
    () => periodTxns.filter((t: any) => t.type === "debit"),
    [periodTxns],
  );

  const income = useMemo(
    () => periodTxns.filter((t: any) => t.type === "credit"),
    [periodTxns],
  );

  /* ── Build monthly aggregates ── */
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

    // Generate all months in range
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

  /* ── Summary stats ── */
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

    // MoM change: compare last two months with data
    const monthsWithData = monthlyData.filter((m) => m.expense > 0);
    let momChange = 0;
    if (monthsWithData.length >= 2) {
      const curr = monthsWithData[monthsWithData.length - 1].expense;
      const prev = monthsWithData[monthsWithData.length - 2].expense;
      momChange = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
    }

    return { totalSpend, avgMonthly, highestMonth, lowestMonth, momChange };
  }, [expenses, monthlyData]);

  /* ── Category breakdown ── */
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

  /* ── Category monthly stacked data ── */
  const categoryStackedData = useMemo(() => {
    const allCats = new Set<string>();
    const monthCatMap: Record<string, Record<string, number>> = {};

    expenses.forEach((t: any) => {
      const mk = getMonthKey(t.date);
      const cat = t.category || "Uncategorized";
      allCats.add(cat);
      if (!monthCatMap[mk]) monthCatMap[mk] = {};
      monthCatMap[mk][cat] = (monthCatMap[mk][cat] || 0) + Number(t.amount || 0);
    });

    const cats = Array.from(allCats);

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
  }, [expenses, monthlyData]);

  /* ── Category deep-dive table data ── */
  const categoryTableData = useMemo(() => {
    const now = new Date();
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;

    // 3-month keys for average
    const avg3Keys: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      avg3Keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

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
    const sorted = [...categoryTableData].sort((a: any, b: any) => {
      const aVal = a[sortCol] ?? 0;
      const bVal = b[sortCol] ?? 0;
      if (typeof aVal === "string") return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });
    return sorted;
  }, [categoryTableData, sortCol, sortDir]);

  /* ── Top merchants ── */
  const topMerchants = useMemo(() => {
    const merchantMap: Record<string, number> = {};
    expenses.forEach((t: any) => {
      const merchant = extractMerchant(t.narration || "");
      merchantMap[merchant] = (merchantMap[merchant] || 0) + Number(t.amount || 0);
    });

    return Object.entries(merchantMap)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [expenses]);

  /* ── Anomaly detection ── */
  const anomalies = useMemo(() => {
    // Category-level anomalies
    const catAnomalies = categoryTableData.filter((c) => c.isAnomaly);

    // Individual transaction anomalies (> 3x category average)
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

  /* ── Average spend reference line ── */
  const avgSpend = useMemo(() => {
    const vals = monthlyData.filter((m) => m.expense > 0).map((m) => m.expense);
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  }, [monthlyData]);

  /* ── Handle sort ── */
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

  /* ── No transactions guard ── */
  if (!txns.length) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <SectionTitle sub="Analyze your spending patterns, track category-wise trends, and detect anomalies.">
          Expense Trends & Analytics
        </SectionTitle>
        <Card style={{ padding: "48px 32px", textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: `linear-gradient(135deg, ${THEME.accent}, color-mix(in srgb, ${THEME.accent} 70%, #fff))`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <BarChart2 size={30} color="#fff" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, marginBottom: 8 }}>
            No Transactions Yet
          </div>
          <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 380, margin: "0 auto", lineHeight: 1.6 }}>
            Add transactions from the Banks tab to start seeing your expense trends and analytics here.
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ─── HEADER ─────────────────────────────────────────────────────── */}
      <SectionTitle sub="Analyze your spending patterns, track category-wise trends, and detect anomalies.">
        Expense Trends & Analytics
      </SectionTitle>

      {/* ─── 1. PERIOD SELECTOR ─────────────────────────────────────────── */}
      <Card style={{ padding: "16px 20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <Calendar size={16} style={{ color: THEME.muted }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, marginRight: 4 }}>
            PERIOD:
          </span>
          {(
            [
              { key: "3m", label: "Last 3 Months" },
              { key: "6m", label: "Last 6 Months" },
              { key: "12m", label: "Last 12 Months" },
              { key: "ytd", label: "YTD" },
              { key: "custom", label: "Custom" },
            ] as { key: Period; label: string }[]
          ).map((opt) => (
            <Button
              key={opt.key}
              size="sm"
              variant={period === opt.key ? "primary" : "secondary"}
              onClick={() => setPeriod(opt.key)}
              style={{ fontSize: 11 }}
            >
              {opt.label}
            </Button>
          ))}

          {period === "custom" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 8 }}>
              <input
                type="date"
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
      </Card>

      {/* ─── 2. SUMMARY CARDS ───────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          label="Total Spend"
          value={fmtINRFull(summary.totalSpend)}
          icon={<Wallet />}
          color={PIE_COLORS[3]}
          sub={`${rangeStart.slice(0, 7)} to ${rangeEnd.slice(0, 7)}`}
        />
        <StatCard
          label="Avg Monthly"
          value={fmtINRFull(summary.avgMonthly)}
          icon={<Activity />}
          color={PIE_COLORS[0]}
          sub={`Over ${monthlyData.length} month${monthlyData.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          label="Highest Month"
          value={fmtINRFull(summary.highestMonth.amount)}
          icon={<TrendingUp />}
          color={THEME.rust}
          sub={summary.highestMonth.month ? fullMonthLabel(summary.highestMonth.month) : "--"}
          subColor={THEME.rust}
        />
        <StatCard
          label="Lowest Month"
          value={fmtINRFull(summary.lowestMonth.amount)}
          icon={<TrendingDown />}
          color={THEME.sage}
          sub={summary.lowestMonth.month ? fullMonthLabel(summary.lowestMonth.month) : "--"}
          subColor={THEME.sage}
        />
        <StatCard
          label="MoM Change"
          value={`${summary.momChange >= 0 ? "+" : ""}${summary.momChange.toFixed(1)}%`}
          icon={summary.momChange >= 0 ? <ArrowUpRight /> : <ArrowDownRight />}
          color={summary.momChange >= 0 ? THEME.rust : THEME.sage}
          sub={summary.momChange >= 0 ? "Spending up" : "Spending down"}
          subColor={summary.momChange >= 0 ? THEME.rust : THEME.sage}
        />
      </div>

      {/* ─── 3. MONTHLY SPEND TREND (AREA CHART) ───────────────────────── */}
      <Card style={{ padding: "24px 20px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: THEME.ink, marginBottom: 4 }}>
          Monthly Spend Trend
        </div>
        <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 20 }}>
          Expense area with income overlay and average reference line
        </div>
        <ResponsiveContainer width="100%" height={320}>
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
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} />
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
              tickFormatter={(v: number) => fmtINRFull(v)}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: THEME.line }} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
              formatter={(value: string) => (
                <span style={{ color: THEME.ink, fontWeight: 500 }}>{value}</span>
              )}
            />
            <ReferenceLine
              y={avgSpend}
              stroke={THEME.muted}
              strokeDasharray="6 4"
              label={{
                value: `Avg: ${fmtINRFull(avgSpend)}`,
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
        </ResponsiveContainer>
      </Card>

      {/* ─── 4. CATEGORY BREAKDOWN ──────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 16,
        }}
      >
        {/* Donut chart */}
        <Card style={{ padding: "24px 20px" }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: THEME.ink, marginBottom: 4 }}>
            Spend by Category
          </div>
          <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 16 }}>
            Total distribution for the selected period
          </div>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {categoryData.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0];
                      const pct = summary.totalSpend > 0
                        ? ((d.value / summary.totalSpend) * 100).toFixed(1)
                        : "0";
                      return (
                        <div
                          style={{
                            background: "var(--surface-0)",
                            border: `1px solid ${THEME.line}`,
                            borderRadius: 10,
                            padding: "10px 14px",
                            boxShadow: "var(--shadow-md)",
                            fontSize: 12,
                          }}
                        >
                          <div style={{ fontWeight: 700, color: THEME.ink }}>{d.name}</div>
                          <div style={{ color: THEME.muted, marginTop: 4 }}>
                            <Prv>{fmtINRFull(d.value)}</Prv> ({pct}%)
                          </div>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px 16px",
                  marginTop: 8,
                }}
              >
                {categoryData.slice(0, 8).map((c: any, i: number) => (
                  <div
                    key={c.name}
                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: PIE_COLORS[i % PIE_COLORS.length],
                        display: "inline-block",
                      }}
                    />
                    <span style={{ color: THEME.muted }}>{c.name}</span>
                    <span style={{ fontWeight: 600, color: THEME.ink }}>
                      <Prv>{fmtINRFull(c.value)}</Prv>
                    </span>
                  </div>
                ))}
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
          <div style={{ fontSize: 15, fontWeight: 700, color: THEME.ink, marginBottom: 4 }}>
            Category Trends
          </div>
          <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 16 }}>
            Month-by-month category-wise breakdown
          </div>
          {categoryStackedData.categories.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={categoryStackedData.data}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} />
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
                  tickFormatter={(v: number) => fmtINRFull(v)}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: THEME.line, opacity: 0.4 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                  iconType="circle"
                  formatter={(value: string) => (
                    <span style={{ color: THEME.ink, fontWeight: 500 }}>{value}</span>
                  )}
                />
                {categoryStackedData.categories.map((cat: string, i: number) => (
                  <Bar
                    key={cat}
                    dataKey={cat}
                    stackId="cats"
                    fill={PIE_COLORS[i % PIE_COLORS.length]}
                    radius={
                      i === categoryStackedData.categories.length - 1
                        ? [4, 4, 0, 0]
                        : [0, 0, 0, 0]
                    }
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: THEME.muted, fontSize: 13 }}>
              No expense data for this period
            </div>
          )}
        </Card>
      </div>

      {/* ─── 5. CATEGORY DEEP DIVE TABLE ────────────────────────────────── */}
      <Card style={{ padding: "24px 20px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: THEME.ink, marginBottom: 4 }}>
          Category Deep Dive
        </div>
        <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 16 }}>
          Click any row to see individual transactions. Anomalies are flagged with a warning badge.
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
                      onClick={() => handleSort(col.key)}
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
                      style={{ cursor: "pointer", transition: "background 0.15s" }}
                      onClick={() =>
                        setExpandedCat(expandedCat === row.category ? null : row.category)
                      }
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = `color-mix(in srgb, ${THEME.accent} 4%, transparent)`;
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}
                    >
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {expandedCat === row.category ? (
                            <ChevronDown size={14} style={{ color: THEME.muted }} />
                          ) : (
                            <ChevronRight size={14} style={{ color: THEME.muted }} />
                          )}
                          <span style={{ fontWeight: 600, color: THEME.ink }}>{row.category}</span>
                          {row.isAnomaly && (
                            <Badge variant="rust" style={{ fontSize: 9, padding: "2px 6px" }}>
                              <AlertTriangle size={10} style={{ marginRight: 3 }} />
                              Anomaly
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td style={td}>
                        <Prv>{fmtINRFull(row.thisMonth)}</Prv>
                      </td>
                      <td style={td}>
                        <Prv>{fmtINRFull(row.lastMonth)}</Prv>
                      </td>
                      <td style={td}>
                        <span
                          style={{
                            color: row.changePct > 0 ? THEME.rust : row.changePct < 0 ? THEME.sage : THEME.muted,
                            fontWeight: 600,
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
                      <td style={td}>
                        <Prv>{fmtINRFull(row.avg3)}</Prv>
                      </td>
                      <td style={{ ...td, fontWeight: 700 }}>
                        <Prv>{fmtINRFull(row.periodTotal)}</Prv>
                      </td>
                    </tr>

                    {/* Expanded transaction rows */}
                    {expandedCat === row.category && (
                      <tr>
                        <td colSpan={6} style={{ padding: 0 }}>
                          <div
                            style={{
                              background: `color-mix(in srgb, ${THEME.accent} 3%, var(--surface-0))`,
                              padding: "12px 16px",
                              borderBottom: `1px solid ${THEME.line}`,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: THEME.muted,
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                marginBottom: 10,
                              }}
                            >
                              Transactions in {row.category}
                            </div>
                            {expenses
                              .filter(
                                (t: any) =>
                                  (t.category || "Uncategorized") === row.category,
                              )
                              .sort((a: any, b: any) => b.date.localeCompare(a.date))
                              .slice(0, 20)
                              .map((t: any) => (
                                <div
                                  key={t.id}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "8px 0",
                                    borderBottom: `1px solid ${THEME.line}`,
                                    fontSize: 12,
                                  }}
                                >
                                  <div style={{ flex: 1 }}>
                                    <div
                                      style={{
                                        fontWeight: 600,
                                        color: THEME.ink,
                                        marginBottom: 2,
                                      }}
                                    >
                                      {t.narration || "No description"}
                                    </div>
                                    <div style={{ color: THEME.muted, fontSize: 11 }}>
                                      {new Date(t.date + "T00:00:00").toLocaleDateString(
                                        "en-IN",
                                        { day: "numeric", month: "short", year: "numeric" },
                                      )}
                                    </div>
                                  </div>
                                  <div style={{ fontWeight: 700, color: THEME.rust }}>
                                    <Prv>{fmtINRFull(t.amount)}</Prv>
                                  </div>
                                </div>
                              ))}
                            {expenses.filter(
                              (t: any) =>
                                (t.category || "Uncategorized") === row.category,
                            ).length > 20 && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: THEME.muted,
                                  textAlign: "center",
                                  padding: "8px 0",
                                }}
                              >
                                Showing first 20 of{" "}
                                {
                                  expenses.filter(
                                    (t: any) =>
                                      (t.category || "Uncategorized") === row.category,
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
            No expense data for this period
          </div>
        )}
      </Card>

      {/* ─── 6. TOP MERCHANTS / PAYEES ──────────────────────────────────── */}
      <Card style={{ padding: "24px 20px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: THEME.ink, marginBottom: 4 }}>
          Top Merchants / Payees
        </div>
        <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 16 }}>
          Top 10 by total spend, extracted from transaction narrations
        </div>
        {topMerchants.length > 0 ? (
          <ResponsiveContainer width="100%" height={Math.max(topMerchants.length * 40 + 40, 200)}>
            <BarChart
              data={topMerchants}
              layout="vertical"
              margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11, fill: THEME.muted }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => fmtINRFull(v)}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11, fill: THEME.ink, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={120}
              />
              <Tooltip
                content={({ active, payload }: any) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div
                      style={{
                        background: "var(--surface-0)",
                        border: `1px solid ${THEME.line}`,
                        borderRadius: 10,
                        padding: "10px 14px",
                        boxShadow: "var(--shadow-md)",
                        fontSize: 12,
                      }}
                    >
                      <div style={{ fontWeight: 700, color: THEME.ink }}>
                        {payload[0]?.payload?.name}
                      </div>
                      <div style={{ color: THEME.muted, marginTop: 4 }}>
                        <Prv>{fmtINRFull(payload[0]?.value)}</Prv>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="amount" fill={PIE_COLORS[0]} radius={[0, 6, 6, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: "center", padding: 40, color: THEME.muted, fontSize: 13 }}>
            No merchant data available
          </div>
        )}
      </Card>

      {/* ─── 7. ANOMALY DETECTION ───────────────────────────────────────── */}
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
            <span style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>
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
                  border: `1px solid color-mix(in srgb, ${THEME.rust} 20%, ${THEME.line})`,
                  borderRadius: 12,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <AlertTriangle size={16} style={{ color: THEME.rust, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                      {c.category} spending is unusually high
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                      This month: <Prv>{fmtINRFull(c.thisMonth)}</Prv> vs 3-month avg:{" "}
                      <Prv>{fmtINRFull(c.avg3)}</Prv> (
                      {c.avg3 > 0 ? `${((c.thisMonth / c.avg3) * 100 - 100).toFixed(0)}% above average` : "N/A"})
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
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <AlertTriangle size={16} style={{ color: THEME.gold, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                      Large transaction: <Prv>{fmtINRFull(t.amount)}</Prv>
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                      {t.narration || "No description"} &middot;{" "}
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

      {/* ─── 8. INCOME VS EXPENSE COMPARISON ────────────────────────────── */}
      <Card style={{ padding: "24px 20px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: THEME.ink, marginBottom: 4 }}>
          Income vs Expense
        </div>
        <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 20 }}>
          Side-by-side comparison with net savings overlay and savings rate
        </div>
        <ResponsiveContainer width="100%" height={340}>
          <ComposedChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} />
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
              tickFormatter={(v: number) => fmtINRFull(v)}
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
                <span style={{ color: THEME.ink, fontWeight: 500 }}>{value}</span>
              )}
            />
            <Bar
              yAxisId="left"
              dataKey="income"
              name="Income"
              fill={PIE_COLORS[1]}
              radius={[4, 4, 0, 0]}
              barSize={20}
              opacity={0.85}
            />
            <Bar
              yAxisId="left"
              dataKey="expense"
              name="Expense"
              fill={PIE_COLORS[3]}
              radius={[4, 4, 0, 0]}
              barSize={20}
              opacity={0.85}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="net"
              name="Net Savings"
              stroke={PIE_COLORS[0]}
              strokeWidth={2}
              dot={{ r: 3, fill: PIE_COLORS[0] }}
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Savings rate row */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 16,
            padding: "12px 0 0",
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
              <div style={{ fontSize: 10, color: THEME.muted, marginBottom: 4 }}>{m.label}</div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
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
