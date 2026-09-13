/* eslint-disable */
import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  AlertTriangle,
  BarChart2,
  Wallet,
  Activity,
  ShieldAlert,
  Layers,
  Package,
  Search,
  Download,
  Flame,
  Percent,
  PieChart as PieIcon,
  Sparkles,
  CreditCard,
  Building2,
  CheckCircle2,
  Zap,
  Info,
  Clock,
  Printer,
  RotateCcw,
  SlidersHorizontal,
  Target,
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
  LineChart,
} from "recharts";
import { THEME, PIE_COLORS } from "../../utils/constants";
import { fmtINR, fmtINRFull, exportArrayToCSV } from "../../utils/finance";
import { Card } from "../ui/Card";
import { StatCard } from "../ui/StatCard";
import { Badge } from "../ui/Badge";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";

/* ─── STYLES & DESIGN TOKENS ──────────────────────────────────────────────── */

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

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type Period =
  | "current_month"
  | "last_month"
  | "3m"
  | "6m"
  | "12m"
  | "ytd"
  | "last_fy"
  | "custom";

type ChartView = "trend" | "category_pie" | "category_stacked" | "dow_velocity" | "burn_pace";

/* ─── 50/30/20 CATEGORY CLASSIFICATIONS ──────────────────────────────────── */

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
  "Household",
]);

const WANTS_CATEGORIES = new Set([
  "Food",
  "Dining",
  "Restaurant",
  "Cafe",
  "Shopping",
  "Clothing",
  "Apparel",
  "Entertainment",
  "Movies",
  "Travel",
  "Vacation",
  "Flight",
  "Hotel",
  "Personal Care",
  "Salon",
  "Spa",
  "Subscriptions",
  "OTT",
  "Netflix",
  "Hobbies",
  "Gifts",
  "Electronics",
  "Gadgets",
  "Leisure",
  "Outing",
  "Party",
]);

const SAVINGS_CATEGORIES = new Set([
  "Investment",
  "Investments",
  "SIP",
  "Savings",
  "Mutual Funds",
  "Stocks",
  "FD",
  "RD",
  "Gold",
  "PPF",
  "EPF",
  "NPS",
]);

function getCategoryClassification(cat: string): "Needs" | "Wants" | "Savings" | "Other" {
  const normalized = (cat || "").trim();
  if (NEEDS_CATEGORIES.has(normalized)) return "Needs";
  if (WANTS_CATEGORIES.has(normalized)) return "Wants";
  if (SAVINGS_CATEGORIES.has(normalized)) return "Savings";
  return "Wants"; // Default unclassified discretionary
}

/* ─── HELPERS ─────────────────────────────────────────────────────────────── */

function getMonthKey(date: string): string {
  return date.slice(0, 7); // "YYYY-MM"
}

function monthLabel(key: string): string {
  if (!key || !key.includes("-")) return key || "—";
  const [y, m] = key.split("-");
  const monthIdx = parseInt(m, 10) - 1;
  return `${MONTH_NAMES[monthIdx] || m} '${y.slice(2)}`;
}

function fullMonthLabel(key: string): string {
  if (!key || !key.includes("-")) return key || "—";
  const [y, m] = key.split("-");
  const monthIdx = parseInt(m, 10) - 1;
  return `${FULL_MONTH_NAMES[monthIdx] || m} ${y}`;
}

function dateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getDateRange(
  period: Period,
  customStart: string,
  customEnd: string
): [string, string] {
  const now = new Date();
  const todayStr = dateStr(now);

  switch (period) {
    case "current_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return [dateStr(start), todayStr];
    }
    case "last_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return [dateStr(start), dateStr(end)];
    }
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
    case "last_fy": {
      const currentFyStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const lastFyStart = currentFyStart - 1;
      return [`${lastFyStart}-04-01`, `${currentFyStart}-03-31`];
    }
    case "custom": {
      const start = customStart || todayStr;
      const end = customEnd || todayStr;
      return start > end ? [end, start] : [start, end];
    }
    default:
      return [dateStr(new Date(now.getFullYear(), now.getMonth() - 6, 1)), todayStr];
  }
}

function extractMerchant(narration: string): string {
  if (!narration) return "Unknown Merchant";
  let n = narration.trim();
  const upiMatch = n.match(/UPI[-\/].*?[-\/](.+?)[-\/]/i);
  if (upiMatch) return upiMatch[1].trim().slice(0, 32);
  const neftMatch = n.match(/(?:NEFT|IMPS|RTGS)[-\/].*?[-\/](.+?)[-\/]/i);
  if (neftMatch) return neftMatch[1].trim().slice(0, 32);
  const posMatch = n.match(/POS[-\/].*?[-\/](.+?)[-\/]/i);
  if (posMatch) return posMatch[1].trim().slice(0, 32);
  const parts = n.split(/[-\/|]/);
  const meaningful = parts.find((p) => p.trim().length > 2);
  return meaningful ? meaningful.trim().slice(0, 32) : n.slice(0, 32);
}

/* ─── CUSTOM CHART TOOLTIP ────────────────────────────────────────────────── */

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
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.12)",
        fontSize: 12,
        zIndex: 50,
      }}
    >
      <div
        style={{
          fontWeight: 800,
          color: THEME.ink,
          marginBottom: 8,
          letterSpacing: "-0.01em",
          fontSize: 13,
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
            gap: 14,
            marginBottom: 5,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: p.color || p.fill || THEME.accent,
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span style={{ color: THEME.muted, fontWeight: 500 }}>{p.name}:</span>
          </div>
          <span style={{ fontWeight: 800, color: THEME.ink }}>
            <Prv>{formatter ? formatter(p.value) : <Money value={p.value} variant="full" />}</Prv>
          </span>
        </div>
      ))}
    </div>
  );
};

/* ─── MAIN COMPONENT ──────────────────────────────────────────────────────── */

export const ExpenseTrendsTab = ({ state, metrics }: any) => {
  const { privacyMode } = usePrivacy();
  const [period, setPeriod] = useState<Period>("6m");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [catFilter, setCatFilter] = useState("");
  const [minAmount, setMinAmount] = useState<string>("");
  const [chartView, setChartView] = useState<ChartView>("trend");
  const [isStackedPercent, setIsStackedPercent] = useState<boolean>(false);
  const [merchantSortBy, setMerchantSortBy] = useState<"amount" | "count">("amount");
  const [merchantSearch, setMerchantSearch] = useState<string>("");

  const [sortCol, setSortCol] = useState<string>("periodTotal");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [catTxnSearch, setCatTxnSearch] = useState<string>("");
  const [catTxnLimit, setCatTxnLimit] = useState<number>(20);
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  const txns = state?.transactions || [];

  // Extract distinct accounts / banks for filter dropdown
  const availableAccounts = useMemo(() => {
    const set = new Set<string>();
    txns.forEach((t: any) => {
      const acc = t.account || t.bank || t.accountName || t.source;
      if (acc) set.add(acc);
    });
    return Array.from(set).sort();
  }, [txns]);

  const [rangeStart, rangeEnd] = useMemo(
    () => getDateRange(period, customStart, customEnd),
    [period, customStart, customEnd]
  );

  // Filter transactions by date range and account
  const periodTxns = useMemo(() => {
    let filtered = txns.filter((t: any) => t.date >= rangeStart && t.date <= rangeEnd);
    if (selectedAccount !== "all") {
      filtered = filtered.filter(
        (t: any) => (t.account || t.bank || t.accountName || t.source) === selectedAccount
      );
    }
    if (minAmount && !isNaN(Number(minAmount)) && Number(minAmount) > 0) {
      filtered = filtered.filter((t: any) => Number(t.amount || 0) >= Number(minAmount));
    }
    return filtered;
  }, [txns, rangeStart, rangeEnd, selectedAccount, minAmount]);

  // Exclude internal transfers
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

  // Compute number of days in selected period
  const totalPeriodDays = useMemo(() => {
    const s = new Date(rangeStart + "T00:00:00");
    const e = new Date(rangeEnd + "T00:00:00");
    const diffTime = Math.abs(e.getTime() - s.getTime());
    return Math.max(Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1, 1);
  }, [rangeStart, rangeEnd]);

  // Generate continuous monthly dataset
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

    return months.map((mk, idx, arr) => {
      const exp = expenseMap[mk] || 0;
      const inc = incomeMap[mk] || 0;
      const net = inc - exp;
      const savingsRate = inc > 0 ? ((inc - exp) / inc) * 100 : 0;

      // 3-month trailing moving average for smoothing
      const prevMonths = [idx - 2, idx - 1, idx].filter((i) => i >= 0).map((i) => arr[i]);
      const movingAvgSum = prevMonths.reduce((s, k) => s + (expenseMap[k] || 0), 0);
      const movingAvg = movingAvgSum / Math.max(prevMonths.length, 1);

      return {
        month: mk,
        label: monthLabel(mk),
        fullLabel: fullMonthLabel(mk),
        expense: exp,
        income: inc,
        net,
        savingsRate,
        movingAvg: Math.round(movingAvg),
      };
    });
  }, [expenses, income, rangeStart, rangeEnd]);

  // Category Aggregates
  const categoryData = useMemo(() => {
    const catMap: Record<string, { value: number; count: number }> = {};
    expenses.forEach((t: any) => {
      const cat = t.category || "Uncategorized";
      if (!catMap[cat]) catMap[cat] = { value: 0, count: 0 };
      catMap[cat].value += Number(t.amount || 0);
      catMap[cat].count += 1;
    });

    return Object.entries(catMap)
      .map(([name, data]) => ({ name, value: data.value, count: data.count }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  // Unified color map for categories
  const categoryColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    categoryData.forEach((c, i) => {
      map[c.name] = PIE_COLORS[i % PIE_COLORS.length];
    });
    return map;
  }, [categoryData]);

  // Executive KPI summary calculations
  const summary = useMemo(() => {
    const totalSpend = expenses.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const totalIncome = income.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const monthCount = Math.max(monthlyData.length, 1);
    const avgMonthly = totalSpend / monthCount;
    const dailyBurnRate = totalSpend / totalPeriodDays;
    const totalNetSavings = totalIncome - totalSpend;
    const overallSavingsRate = totalIncome > 0 ? (totalNetSavings / totalIncome) * 100 : 0;

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

    let momChange = 0;
    if (monthlyData.length >= 2) {
      const curr = monthlyData[monthlyData.length - 1].expense;
      const prev = monthlyData[monthlyData.length - 2].expense;
      momChange = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
    }

    // Top category concentration
    const topCat = categoryData[0] || { name: "None", value: 0 };
    const concentrationRatio = totalSpend > 0 ? (topCat.value / totalSpend) * 100 : 0;

    // 50/30/20 Needs vs Wants breakdown
    let needsSpend = 0;
    let wantsSpend = 0;
    let savingsSpend = 0;

    expenses.forEach((t: any) => {
      const cat = t.category || "Uncategorized";
      const cls = getCategoryClassification(cat);
      const amt = Number(t.amount || 0);
      if (cls === "Needs") needsSpend += amt;
      else if (cls === "Savings") savingsSpend += amt;
      else wantsSpend += amt;
    });

    const needsPct = totalSpend > 0 ? (needsSpend / totalSpend) * 100 : 0;
    const wantsPct = totalSpend > 0 ? (wantsSpend / totalSpend) * 100 : 0;
    const savingsPct = totalSpend > 0 ? (savingsSpend / totalSpend) * 100 : 0;

    return {
      totalSpend,
      totalIncome,
      avgMonthly,
      dailyBurnRate,
      highestMonth,
      lowestMonth,
      momChange,
      totalNetSavings,
      overallSavingsRate,
      topCat,
      concentrationRatio,
      needsSpend,
      wantsSpend,
      savingsSpend,
      needsPct,
      wantsPct,
      savingsPct,
    };
  }, [expenses, income, monthlyData, totalPeriodDays, categoryData]);

  // Stacked Category Month Data (both absolute & percentage)
  const categoryStackedData = useMemo(() => {
    const monthCatMap: Record<string, Record<string, number>> = {};

    expenses.forEach((t: any) => {
      const mk = getMonthKey(t.date);
      const cat = t.category || "Uncategorized";
      if (!monthCatMap[mk]) monthCatMap[mk] = {};
      monthCatMap[mk][cat] = (monthCatMap[mk][cat] || 0) + Number(t.amount || 0);
    });

    const cats = categoryData.slice(0, 8).map((c) => c.name);
    const hasOther = categoryData.length > 8;
    const allCategoryKeys = hasOther ? [...cats, "Other Categories"] : cats;

    const data = monthlyData.map((m) => {
      const entry: any = { label: m.label, month: m.month, total: m.expense };
      let topCatsSum = 0;
      cats.forEach((c) => {
        const val = monthCatMap[m.month]?.[c] || 0;
        entry[c] = isStackedPercent && m.expense > 0 ? (val / m.expense) * 100 : val;
        topCatsSum += val;
      });
      if (hasOther) {
        const otherVal = Math.max(m.expense - topCatsSum, 0);
        entry["Other Categories"] =
          isStackedPercent && m.expense > 0 ? (otherVal / m.expense) * 100 : otherVal;
      }
      return entry;
    });

    return { data, categories: allCategoryKeys };
  }, [expenses, monthlyData, categoryData, isStackedPercent]);

  // Day of Week Spending Velocity Heatmap / Bar Data
  const dayOfWeekData = useMemo(() => {
    const dowSpend: number[] = [0, 0, 0, 0, 0, 0, 0];
    const dowCount: number[] = [0, 0, 0, 0, 0, 0, 0];

    expenses.forEach((t: any) => {
      const d = new Date(t.date + "T00:00:00");
      const day = d.getDay();
      dowSpend[day] += Number(t.amount || 0);
      dowCount[day] += 1;
    });

    const totalSpend = dowSpend.reduce((a, b) => a + b, 0);
    const weekdaySpend = dowSpend[1] + dowSpend[2] + dowSpend[3] + dowSpend[4] + dowSpend[5];
    const weekendSpend = dowSpend[0] + dowSpend[6];

    const chartData = [1, 2, 3, 4, 5, 6, 0].map((dayIdx) => ({
      day: DAY_SHORT[dayIdx],
      fullDay: DAY_NAMES[dayIdx],
      spend: dowSpend[dayIdx],
      count: dowCount[dayIdx],
      avgTicket: dowCount[dayIdx] > 0 ? dowSpend[dayIdx] / dowCount[dayIdx] : 0,
      sharePct: totalSpend > 0 ? (dowSpend[dayIdx] / totalSpend) * 100 : 0,
      isWeekend: dayIdx === 0 || dayIdx === 6,
    }));

    return { chartData, weekdaySpend, weekendSpend, totalSpend };
  }, [expenses]);

  // Cumulative Month Burn Pace (Day 1 to 31)
  const cumulativeBurnData = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;

    const currentMonthTxns = txns.filter(
      (t: any) =>
        t.type === "debit" &&
        !isTransferCat(t.category) &&
        getMonthKey(t.date) === currentMonthKey
    );
    const prevMonthTxns = txns.filter(
      (t: any) =>
        t.type === "debit" &&
        !isTransferCat(t.category) &&
        getMonthKey(t.date) === prevMonthKey
    );

    const currentDayMap: Record<number, number> = {};
    const prevDayMap: Record<number, number> = {};

    currentMonthTxns.forEach((t: any) => {
      const day = parseInt(t.date.slice(8, 10), 10);
      currentDayMap[day] = (currentDayMap[day] || 0) + Number(t.amount || 0);
    });

    prevMonthTxns.forEach((t: any) => {
      const day = parseInt(t.date.slice(8, 10), 10);
      prevDayMap[day] = (prevDayMap[day] || 0) + Number(t.amount || 0);
    });

    const todayDay = now.getDate();
    let currentRunning = 0;
    let prevRunning = 0;
    const days: any[] = [];

    for (let day = 1; day <= 31; day++) {
      prevRunning += prevDayMap[day] || 0;
      let currVal: number | null = null;
      if (day <= todayDay) {
        currentRunning += currentDayMap[day] || 0;
        currVal = currentRunning;
      }

      days.push({
        day: `Day ${day}`,
        currentMonth: currVal,
        prevMonth: prevRunning,
      });
    }

    return days;
  }, [txns]);

  // Category Deep Dive Table data
  const categoryTableData = useMemo(() => {
    const presentMonthKeys: string[] = Array.from(
      new Set<string>(expenses.map((t: any) => getMonthKey(t.date)))
    ).sort();

    const shiftMonthKey = (key: string, delta: number) => {
      const [y, m] = key.split("-").map(Number);
      const d = new Date(y, m - 1 + delta, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };

    const now = new Date();
    const thisMonthKey: string =
      presentMonthKeys[presentMonthKeys.length - 1] ||
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastMonthKey: string = shiftMonthKey(thisMonthKey, -1);
    const avg3Keys: string[] = [1, 2, 3].map((i) => shiftMonthKey(thisMonthKey, -i));

    const catMonthMap: Record<string, Record<string, number>> = {};
    const catPeriodTotal: Record<string, number> = {};
    const catTxnCount: Record<string, number> = {};

    expenses.forEach((t: any) => {
      const cat = t.category || "Uncategorized";
      const mk = getMonthKey(t.date);
      if (!catMonthMap[cat]) catMonthMap[cat] = {};
      catMonthMap[cat][mk] = (catMonthMap[cat][mk] || 0) + Number(t.amount || 0);
      catPeriodTotal[cat] = (catPeriodTotal[cat] || 0) + Number(t.amount || 0);
      catTxnCount[cat] = (catTxnCount[cat] || 0) + 1;
    });

    const totalSpend = summary.totalSpend;

    return Object.keys(catMonthMap).map((cat) => {
      const thisMonth = catMonthMap[cat][thisMonthKey] || 0;
      const lastMonthVal = catMonthMap[cat][lastMonthKey] || 0;
      const avg3Sum = avg3Keys.reduce((s, k) => s + (catMonthMap[cat][k] || 0), 0);
      const avg3 = avg3Sum / Math.max(avg3Keys.filter((k) => catMonthMap[cat][k]).length, 1);
      const changePct = lastMonthVal > 0 ? ((thisMonth - lastMonthVal) / lastMonthVal) * 100 : 0;
      const isAnomaly = avg3 > 0 && thisMonth > avg3 * 2;
      const periodTotal = catPeriodTotal[cat] || 0;
      const sharePct = totalSpend > 0 ? (periodTotal / totalSpend) * 100 : 0;
      const classification = getCategoryClassification(cat);
      const txnCount = catTxnCount[cat] || 0;
      const avgPerTxn = txnCount > 0 ? periodTotal / txnCount : 0;

      return {
        category: cat,
        thisMonth,
        lastMonth: lastMonthVal,
        changePct,
        avg3,
        periodTotal,
        sharePct,
        isAnomaly,
        classification,
        txnCount,
        avgPerTxn,
      };
    });
  }, [expenses, summary.totalSpend]);

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

  // Merchant / Payee Intelligence
  const merchantData = useMemo(() => {
    const merchantMap: Record<
      string,
      { amount: number; count: number; category: string; lastDate: string }
    > = {};

    expenses.forEach((t: any) => {
      const merchant = extractMerchant(t.narration || t.note || t.description || "");
      const cat = t.category || "Uncategorized";
      if (!merchantMap[merchant]) {
        merchantMap[merchant] = { amount: 0, count: 0, category: cat, lastDate: t.date };
      }
      merchantMap[merchant].amount += Number(t.amount || 0);
      merchantMap[merchant].count += 1;
      if (t.date > merchantMap[merchant].lastDate) {
        merchantMap[merchant].lastDate = t.date;
        merchantMap[merchant].category = cat;
      }
    });

    let list = Object.entries(merchantMap).map(([name, data]) => ({
      name,
      amount: data.amount,
      count: data.count,
      avgTicket: data.count > 0 ? data.amount / data.count : 0,
      category: data.category,
      lastDate: data.lastDate,
    }));

    if (merchantSearch.trim()) {
      const q = merchantSearch.trim().toLowerCase();
      list = list.filter(
        (m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)
      );
    }

    if (merchantSortBy === "count") {
      list.sort((a, b) => b.count - a.count || b.amount - a.amount);
    } else {
      list.sort((a, b) => b.amount - a.amount || b.count - a.count);
    }

    return list;
  }, [expenses, merchantSortBy, merchantSearch]);

  const topMerchants = useMemo(() => merchantData.slice(0, 10), [merchantData]);

  // Smart Anomalies & Financial Radar
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
        return (avg > 0 && Number(t.amount || 0) > avg * 3) || Number(t.amount || 0) >= 30000;
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
    if (sortCol !== col) return <ArrowUpDown size={11} style={{ opacity: 0.3 }} />;
    return sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  const handleExportCategoryTable = () => {
    const rows = sortedCategoryTable.map((r) => ({
      category: r.category,
      classification: r.classification,
      thisMonth: Math.round(r.thisMonth),
      lastMonth: Math.round(r.lastMonth),
      changePct: `${r.changePct.toFixed(1)}%`,
      avg3Month: Math.round(r.avg3),
      periodTotal: Math.round(r.periodTotal),
      sharePct: `${r.sharePct.toFixed(1)}%`,
      txnCount: r.txnCount,
      avgPerTxn: Math.round(r.avgPerTxn),
      anomaly: r.isAnomaly ? "Yes" : "No",
    }));
    exportArrayToCSV(
      rows,
      [
        { key: "category", label: "Category" },
        { key: "classification", label: "Type" },
        { key: "periodTotal", label: "Period Total (₹)" },
        { key: "sharePct", label: "Share %" },
        { key: "thisMonth", label: "This Month (₹)" },
        { key: "lastMonth", label: "Last Month (₹)" },
        { key: "changePct", label: "MoM Change %" },
        { key: "avg3Month", label: "3M Avg (₹)" },
        { key: "txnCount", label: "Transactions" },
        { key: "avgPerTxn", label: "Avg Ticket (₹)" },
        { key: "anomaly", label: "Anomaly Alert" },
      ],
      `Expense_Analysis_${rangeStart}_to_${rangeEnd}.csv`
    );
  };

  const resetFilters = () => {
    setPeriod("6m");
    setCustomStart("");
    setCustomEnd("");
    setSelectedAccount("all");
    setCatFilter("");
    setMinAmount("");
  };

  const isFiltered =
    period !== "6m" ||
    selectedAccount !== "all" ||
    Boolean(catFilter.trim()) ||
    Boolean(minAmount);

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
          pills={["Category trends", "Top merchants", "Anomaly detection", "50/30/20 Budgeting"]}
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header & Title */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <SectionTitle sub="Analyze your spending patterns, track category-wise trends, and detect anomalies.">
          Expense Trends & Analytics
        </SectionTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {isFiltered && (
            <button
              onClick={resetFilters}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 10,
                border: `1.5px solid ${THEME.line}`,
                background: "var(--surface-0)",
                color: THEME.muted,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <RotateCcw size={13} />
              Reset Filters
            </button>
          )}
          <button
            onClick={handleExportCategoryTable}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 10,
              border: `1.5px solid ${THEME.line}`,
              background: "var(--surface-0)",
              color: THEME.ink,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "var(--shadow-sm)",
              transition: "all 0.2s ease",
            }}
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Modern Control & Filter Bar */}
      <Card style={{ padding: "16px 20px" }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* Top row: Presets & Dates */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: THEME.muted,
                  marginRight: 4,
                }}
              >
                <Calendar size={15} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Period
                </span>
              </div>

              {(
                [
                  { key: "current_month", label: "This Month" },
                  { key: "last_month", label: "Last Month" },
                  { key: "3m", label: "3 Months" },
                  { key: "6m", label: "6 Months" },
                  { key: "12m", label: "12 Months" },
                  { key: "ytd", label: "FY YTD" },
                  { key: "last_fy", label: "Last FY" },
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
                    style={{
                      padding: "6px 13px",
                      fontSize: 12,
                      fontWeight: active ? 700 : 600,
                      borderRadius: 10,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Custom Date Inputs */}
            {period === "custom" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "var(--surface-1)",
                  padding: "4px 10px",
                  borderRadius: 10,
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <input
                  type="date"
                  aria-label="Custom range start date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  style={{
                    border: `1px solid ${THEME.line}`,
                    borderRadius: 6,
                    padding: "4px 8px",
                    fontSize: 11.5,
                    color: THEME.ink,
                    background: "var(--surface-0)",
                  }}
                />
                <span style={{ color: THEME.muted, fontSize: 11, fontWeight: 700 }}>to</span>
                <input
                  type="date"
                  aria-label="Custom range end date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  style={{
                    border: `1px solid ${THEME.line}`,
                    borderRadius: 6,
                    padding: "4px 8px",
                    fontSize: 11.5,
                    color: THEME.ink,
                    background: "var(--surface-0)",
                  }}
                />
              </div>
            )}
          </div>

          {/* Bottom row: Account, Min Amount & Active Window Summary */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 12,
              paddingTop: 12,
              borderTop: `1px solid color-mix(in srgb, ${THEME.line} 60%, transparent)`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {/* Account Dropdown */}
              {availableAccounts.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Building2 size={13} style={{ color: THEME.muted }} />
                  <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    aria-label="Filter by account"
                    style={{
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 8,
                      padding: "5px 10px",
                      fontSize: 12,
                      color: THEME.ink,
                      background: "var(--surface-0)",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <option value="all">All Accounts ({availableAccounts.length})</option>
                    {availableAccounts.map((acc) => (
                      <option key={acc} value={acc}>
                        {acc}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Min Transaction Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Min ₹:</span>
                <input
                  type="number"
                  placeholder="e.g. 1000"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  aria-label="Filter minimum amount"
                  style={{
                    width: 90,
                    border: `1px solid ${THEME.line}`,
                    borderRadius: 8,
                    padding: "5px 8px",
                    fontSize: 12,
                    color: THEME.ink,
                    background: "var(--surface-0)",
                  }}
                />
              </div>
            </div>

            {/* Range active pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 11.5,
                color: THEME.muted,
                fontWeight: 600,
              }}
            >
              <span>Window:</span>
              <Badge variant="muted" style={{ fontSize: 11, fontWeight: 700 }}>
                {new Date(rangeStart + "T00:00:00").toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                –{" "}
                {new Date(rangeEnd + "T00:00:00").toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                ({totalPeriodDays} days)
              </Badge>
              <Badge variant="accent" style={{ fontSize: 11, fontWeight: 700 }}>
                {expenses.length} Expenses
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Executive KPI Summary Cards (8-card responsive matrix) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          label="Total Spend"
          value={fmtINRFull(summary.totalSpend)}
          numericValue={summary.totalSpend}
          formatValue={fmtINRFull}
          icon={<Wallet />}
          color={PIE_COLORS[3]}
          sub={`${monthLabel(getMonthKey(rangeStart))} – ${monthLabel(getMonthKey(rangeEnd))}`}
        />
        <StatCard
          label="Avg Monthly"
          value={fmtINRFull(summary.avgMonthly)}
          numericValue={summary.avgMonthly}
          formatValue={fmtINRFull}
          icon={<Activity />}
          color={PIE_COLORS[0]}
          sub={`Over ${monthlyData.length} active month${monthlyData.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          label="Daily Burn Rate"
          value={fmtINRFull(summary.dailyBurnRate)}
          numericValue={summary.dailyBurnRate}
          formatValue={fmtINRFull}
          icon={<Flame />}
          color={PIE_COLORS[6]}
          sub={`Avg across ${totalPeriodDays} days`}
        />
        <StatCard
          label="MoM Change"
          value={`${summary.momChange >= 0 ? "+" : ""}${summary.momChange.toFixed(1)}%`}
          numericValue={summary.momChange}
          formatValue={(n) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`}
          icon={summary.momChange >= 0 ? <ArrowUpRight /> : <ArrowDownRight />}
          color={summary.momChange >= 0 ? THEME.rust : THEME.sage}
          sub={summary.momChange >= 0 ? "Spending increased" : "Spending decreased"}
          subColor={summary.momChange >= 0 ? THEME.rust : THEME.sage}
        />
        <StatCard
          label="Highest Month"
          value={fmtINRFull(summary.highestMonth.amount)}
          numericValue={summary.highestMonth.amount}
          formatValue={fmtINRFull}
          icon={<TrendingUp />}
          color={THEME.rust}
          sub={summary.highestMonth.month ? fullMonthLabel(summary.highestMonth.month) : "—"}
          subColor={THEME.rust}
        />
        <StatCard
          label="Lowest Month"
          value={fmtINRFull(summary.lowestMonth.amount)}
          numericValue={summary.lowestMonth.amount}
          formatValue={fmtINRFull}
          icon={<TrendingDown />}
          color={THEME.sage}
          sub={summary.lowestMonth.month ? fullMonthLabel(summary.lowestMonth.month) : "—"}
          subColor={THEME.sage}
        />
        <StatCard
          label="Top Category"
          value={`${summary.topCat.name}`}
          sub={`${summary.concentrationRatio.toFixed(1)}% of total outgo`}
          icon={<Target />}
          color={PIE_COLORS[1]}
        />
        <StatCard
          label="Net Savings Rate"
          value={`${summary.overallSavingsRate.toFixed(1)}%`}
          numericValue={summary.overallSavingsRate}
          formatValue={(n) => `${n.toFixed(1)}%`}
          icon={<Percent />}
          color={summary.overallSavingsRate >= 20 ? THEME.sage : THEME.gold}
          sub={
            summary.totalIncome > 0
              ? `Saved ${fmtINR(Math.max(summary.totalNetSavings, 0))} out of ${fmtINR(summary.totalIncome)}`
              : "No income recorded"
          }
          subColor={summary.overallSavingsRate >= 20 ? THEME.sage : THEME.gold}
        />
      </div>

      {/* 50/30/20 Budgeting Rule Breakdown Banner */}
      <Card style={{ padding: "20px 24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: "color-mix(in srgb, var(--t-accent) 15%, transparent)",
                color: THEME.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Target size={18} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                50/30/20 Essential vs Lifestyle Spending Balance
              </div>
              <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 1 }}>
                Benchmark: 50% Needs (Essentials) &bull; 30% Wants (Discretionary) &bull; 20%
                Savings / Investments
              </div>
            </div>
          </div>
          <Badge
            variant={
              summary.needsPct <= 55 && summary.wantsPct <= 35 ? "sage" : "gold"
            }
          >
            {summary.needsPct <= 55 && summary.wantsPct <= 35
              ? "Healthy Budget Split"
              : "Lifestyle Tuning Recommended"}
          </Badge>
        </div>

        {/* 3-Part Segmented Progress Bar */}
        <div
          style={{
            height: 12,
            width: "100%",
            borderRadius: 6,
            background: "var(--surface-2)",
            display: "flex",
            overflow: "hidden",
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: `${Math.min(summary.needsPct, 100)}%`,
              background: THEME.accent,
              transition: "width 0.4s ease",
            }}
            title={`Needs: ${summary.needsPct.toFixed(1)}%`}
          />
          <div
            style={{
              width: `${Math.min(summary.wantsPct, 100 - summary.needsPct)}%`,
              background: THEME.gold,
              transition: "width 0.4s ease",
            }}
            title={`Wants: ${summary.wantsPct.toFixed(1)}%`}
          />
          <div
            style={{
              width: `${Math.max(0, 100 - summary.needsPct - summary.wantsPct)}%`,
              background: THEME.sage,
              transition: "width 0.4s ease",
            }}
            title={`Savings / Net: ${summary.savingsPct.toFixed(1)}%`}
          />
        </div>

        {/* 3 Segment Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
          }}
        >
          <div
            style={{
              background: "var(--surface-1)",
              padding: "12px 14px",
              borderRadius: 12,
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: THEME.accent,
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>
                NEEDS (ESSENTIALS)
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink }}>
              <Money value={summary.needsSpend} variant="full" />
              <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600, marginLeft: 6 }}>
                ({summary.needsPct.toFixed(1)}% &bull; Target: &le;50%)
              </span>
            </div>
          </div>

          <div
            style={{
              background: "var(--surface-1)",
              padding: "12px 14px",
              borderRadius: 12,
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: THEME.gold,
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>
                WANTS (DISCRETIONARY)
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink }}>
              <Money value={summary.wantsSpend} variant="full" />
              <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600, marginLeft: 6 }}>
                ({summary.wantsPct.toFixed(1)}% &bull; Target: &le;30%)
              </span>
            </div>
          </div>

          <div
            style={{
              background: "var(--surface-1)",
              padding: "12px 14px",
              borderRadius: 12,
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: THEME.sage,
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>
                SAVINGS & INVESTMENTS
              </span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink }}>
              <Money
                value={Math.max(summary.savingsSpend, summary.totalNetSavings)}
                variant="full"
              />
              <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600, marginLeft: 6 }}>
                ({summary.overallSavingsRate.toFixed(1)}% &bull; Target: &ge;20%)
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Multi-Dimensional Interactive Chart Deck */}
      <Card style={{ padding: "24px 20px" }}>
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
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: THEME.ink,
                marginBottom: 4,
                letterSpacing: "-0.015em",
              }}
            >
              {chartView === "trend" && "Monthly Spend Trend"}
              {chartView === "category_pie" && "Category Spend Distribution"}
              {chartView === "category_stacked" && "Category Month-by-Month Evolution"}
              {chartView === "dow_velocity" && "Day-of-Week Spending Velocity"}
              {chartView === "burn_pace" && "Cumulative Day-by-Day Burn Pace"}
            </div>
            <div style={{ fontSize: 12, color: THEME.muted }}>
              {chartView === "trend" &&
                "Monthly outflow curve with income overlay, net cashflow, and trailing 3-month moving average"}
              {chartView === "category_pie" &&
                "Interactive breakdown by spending category with percentage shares and total volume"}
              {chartView === "category_stacked" &&
                "Track how categorical proportions expand or contract month over month"}
              {chartView === "dow_velocity" &&
                "Identify high-spend days of the week, ticket sizes, and weekend vs weekday habits"}
              {chartView === "burn_pace" &&
                "Compare current month's cumulative day 1–31 burn curve against previous month"}
            </div>
          </div>

          {/* Chart Viewport Selectors */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {(
              [
                { id: "trend", label: "Monthly Trend", icon: TrendingUp },
                { id: "category_pie", label: "Category Share", icon: PieIcon },
                { id: "category_stacked", label: "Stacked Evolution", icon: Layers },
                { id: "dow_velocity", label: "Day of Week", icon: Clock },
                { id: "burn_pace", label: "Burn Pace", icon: Flame },
              ] as { id: ChartView; label: string; icon: any }[]
            ).map((v) => {
              const active = chartView === v.id;
              const Icon = v.icon;
              return (
                <button
                  key={v.id}
                  onClick={() => setChartView(v.id)}
                  className={`demat-portfolio-pill ${active ? "active" : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: active ? 700 : 600,
                    borderRadius: 10,
                  }}
                >
                  <Icon size={13} />
                  {v.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* VIEW 1: Monthly Spend Trend */}
        {chartView === "trend" && (
          <div>
            <div style={{ width: "100%", height: 340, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <ComposedChart
                  data={monthlyData}
                  margin={{ top: 10, right: 15, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PIE_COLORS[3]} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={PIE_COLORS[3]} stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PIE_COLORS[1]} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={PIE_COLORS[1]} stopOpacity={0.01} />
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
                    wrapperStyle={{ fontSize: 11.5, paddingTop: 14 }}
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
                      fontSize: 10.5,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    name="Expenses"
                    stroke={PIE_COLORS[3]}
                    fill="url(#expenseGrad)"
                    strokeWidth={2.5}
                  />
                  <Line
                    type="monotone"
                    dataKey="movingAvg"
                    name="3M Moving Avg"
                    stroke={THEME.gold}
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="income"
                    name="Income"
                    stroke={PIE_COLORS[1]}
                    strokeWidth={2}
                    dot={{ r: 3.5, fill: PIE_COLORS[1] }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* VIEW 2: Category Pie / Donut */}
        {chartView === "category_pie" && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 20,
              alignItems: "center",
            }}
          >
            <div style={{ width: "100%", height: 300, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
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
                              ? "drop-shadow(0 6px 12px rgba(0,0,0,0.18))"
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
                            background: "color-mix(in srgb, var(--surface-0) 90%, transparent)",
                            backdropFilter: "blur(14px)",
                            border: `1.5px solid ${THEME.line}`,
                            borderRadius: 12,
                            padding: "10px 14px",
                            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.1)",
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
                          fontSize: 10.5,
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
                          fontFamily: "var(--font-display)",
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
                          fontSize: 10.5,
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
                          fontFamily: "var(--font-display)",
                          fontSize: 18,
                          fill: THEME.ink,
                          fontWeight: 900,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {privacyMode
                          ? "••••"
                          : `₹${summary.totalSpend.toLocaleString("en-IN", {
                              maximumFractionDigits: 0,
                            })}`}
                      </text>
                    </>
                  )}
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Chips list for categories */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "10px 14px",
                maxHeight: 280,
                overflowY: "auto",
                paddingRight: 6,
              }}
            >
              {categoryData.map((c: any, i: number) => {
                const pct =
                  summary.totalSpend > 0 ? ((c.value / summary.totalSpend) * 100).toFixed(1) : "0";
                return (
                  <div
                    key={c.name}
                    onClick={() => {
                      setExpandedCat(expandedCat === c.name ? null : c.name);
                      setCatFilter(c.name);
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                      padding: "8px 12px",
                      borderRadius: 10,
                      background: "var(--surface-1)",
                      border: `1px solid ${activePieIndex === i ? THEME.accent : THEME.line}`,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background:
                            categoryColorMap[c.name] || PIE_COLORS[i % PIE_COLORS.length],
                        }}
                      />
                      <span
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: THEME.ink,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {c.name}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 12,
                        fontWeight: 800,
                        color: THEME.ink,
                        marginTop: 2,
                      }}
                    >
                      <Money value={c.value} variant="full" />
                      <span style={{ fontSize: 10.5, color: THEME.muted, fontWeight: 600 }}>
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 3: Stacked Category Evolution */}
        {chartView === "category_stacked" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginBottom: 12,
                gap: 8,
              }}
            >
              <button
                onClick={() => setIsStackedPercent(false)}
                className={`demat-portfolio-pill ${!isStackedPercent ? "active" : ""}`}
                style={{ padding: "4px 10px", fontSize: 11 }}
              >
                Absolute Amount (₹)
              </button>
              <button
                onClick={() => setIsStackedPercent(true)}
                className={`demat-portfolio-pill ${isStackedPercent ? "active" : ""}`}
                style={{ padding: "4px 10px", fontSize: 11 }}
              >
                Percentage Share (%)
              </button>
            </div>
            <div style={{ width: "100%", height: 340, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={categoryStackedData.data}
                  margin={{ top: 10, right: 15, left: 0, bottom: 0 }}
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
                    tickFormatter={(v: number) =>
                      isStackedPercent ? `${v.toFixed(0)}%` : privacyMode ? "••••" : fmtINR(v)
                    }
                  />
                  <Tooltip
                    content={<ChartTooltip formatter={isStackedPercent ? (v: number) => `${v.toFixed(1)}%` : undefined} />}
                    cursor={{ fill: THEME.line, opacity: 0.3 }}
                  />
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
                        i === categoryStackedData.categories.length - 1
                          ? [4, 4, 0, 0]
                          : [0, 0, 0, 0]
                      }
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* VIEW 4: Day of Week Velocity */}
        {chartView === "dow_velocity" && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 14,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  background: "var(--surface-1)",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>
                  WEEKDAY SPEND (MON–FRI)
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, marginTop: 3 }}>
                  <Money value={dayOfWeekData.weekdaySpend} variant="full" />
                  <span style={{ fontSize: 11, color: THEME.muted, marginLeft: 6 }}>
                    (
                    {dayOfWeekData.totalSpend > 0
                      ? (
                          (dayOfWeekData.weekdaySpend / dayOfWeekData.totalSpend) *
                          100
                        ).toFixed(1)
                      : "0"}
                    %)
                  </span>
                </div>
              </div>
              <div
                style={{
                  background: "var(--surface-1)",
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>
                  WEEKEND SPEND (SAT–SUN)
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, marginTop: 3 }}>
                  <Money value={dayOfWeekData.weekendSpend} variant="full" />
                  <span style={{ fontSize: 11, color: THEME.muted, marginLeft: 6 }}>
                    (
                    {dayOfWeekData.totalSpend > 0
                      ? (
                          (dayOfWeekData.weekendSpend / dayOfWeekData.totalSpend) *
                          100
                        ).toFixed(1)
                      : "0"}
                    %)
                  </span>
                </div>
              </div>
            </div>
            <div style={{ width: "100%", height: 300, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={dayOfWeekData.chartData}
                  margin={{ top: 10, right: 15, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} />
                  <XAxis
                    dataKey="fullDay"
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
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div
                          style={{
                            background: "color-mix(in srgb, var(--surface-0) 90%, transparent)",
                            backdropFilter: "blur(14px)",
                            border: `1.5px solid ${THEME.line}`,
                            borderRadius: 12,
                            padding: "10px 14px",
                            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.1)",
                            fontSize: 12,
                          }}
                        >
                          <div style={{ fontWeight: 800, color: THEME.ink }}>{d.fullDay}</div>
                          <div style={{ color: THEME.muted, marginTop: 4 }}>
                            Total Spend: <b><Money value={d.spend} variant="full" /></b> ({d.sharePct.toFixed(1)}%)
                          </div>
                          <div style={{ color: THEME.muted, marginTop: 2 }}>
                            Transactions: <b>{d.count}</b> &bull; Avg Ticket:{" "}
                            <b><Money value={d.avgTicket} variant="full" /></b>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="spend" radius={[6, 6, 0, 0]} barSize={34}>
                    {dayOfWeekData.chartData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={entry.isWeekend ? THEME.rust : THEME.accent}
                        opacity={0.9}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* VIEW 5: Cumulative Month Burn Pace */}
        {chartView === "burn_pace" && (
          <div>
            <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 12 }}>
              Day 1–31 cumulative expenditure tracking current month vs previous month
            </div>
            <div style={{ width: "100%", height: 320, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <LineChart
                  data={cumulativeBurnData}
                  margin={{ top: 10, right: 15, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    axisLine={{ stroke: THEME.line }}
                    tickLine={false}
                    interval={4}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v: number) => (privacyMode ? "••••" : fmtINR(v))}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ stroke: THEME.line }} />
                  <Legend
                    wrapperStyle={{ fontSize: 11.5, paddingTop: 12 }}
                    formatter={(value: string) => (
                      <span style={{ color: THEME.ink, fontWeight: 600 }}>{value}</span>
                    )}
                  />
                  <Line
                    type="monotone"
                    dataKey="currentMonth"
                    name="Current Month (Pacing)"
                    stroke={THEME.rust}
                    strokeWidth={3}
                    dot={{ r: 3, fill: THEME.rust }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="prevMonth"
                    name="Previous Month (Full)"
                    stroke={THEME.muted}
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </Card>

      {/* Two-Column Matrix: Donut Summary & Stacked Trends overview */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 16,
        }}
      >
        {/* Spend by Category Card */}
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
              <div style={{ width: "100%", height: 260, position: "relative" }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
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
                        fontFamily: "var(--font-display)",
                        fontSize: 17,
                        fill: THEME.ink,
                        fontWeight: 900,
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {privacyMode
                        ? "••••"
                        : `₹${summary.totalSpend.toLocaleString("en-IN", {
                            maximumFractionDigits: 0,
                          })}`}
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px 14px",
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

        {/* Category Trends Card */}
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
            <div style={{ width: "100%", height: 300, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: THEME.line, opacity: 0.3 }} />
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
                        i === categoryStackedData.categories.length - 1
                          ? [4, 4, 0, 0]
                          : [0, 0, 0, 0]
                      }
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 40, color: THEME.muted, fontSize: 13 }}>
              No expense data for this period
            </div>
          )}
        </Card>
      </div>

      {/* Category Deep Dive Matrix & Transaction Drilldown */}
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
                fontSize: 16,
                fontWeight: 800,
                color: THEME.ink,
                marginBottom: 4,
                letterSpacing: "-0.015em",
              }}
            >
              Category Deep Dive
            </div>
            <div style={{ fontSize: 12, color: THEME.muted }}>
              Click any category row to expand transactions and detailed metrics. Anomalies are
              highlighted.
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
                placeholder="Filter categories…"
                aria-label="Filter categories"
                style={{
                  border: `1.5px solid ${THEME.line}`,
                  borderRadius: 8,
                  padding: "6px 10px 6px 28px",
                  fontSize: 12,
                  color: THEME.ink,
                  background: "var(--surface-0)",
                  width: 170,
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
                border: `1.5px solid ${THEME.line}`,
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
                    { key: "classification", label: "Type" },
                    { key: "thisMonth", label: "This Month" },
                    { key: "lastMonth", label: "Last Month" },
                    { key: "changePct", label: "MoM Change %" },
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
                      style={{ cursor: "pointer", transition: "background 0.15s ease" }}
                      tabIndex={0}
                      role="button"
                      aria-expanded={expandedCat === row.category}
                      aria-label={`${row.category} — ${expandedCat === row.category ? "collapse" : "expand"} transactions`}
                      onClick={() => {
                        setExpandedCat(expandedCat === row.category ? null : row.category);
                        setCatTxnSearch("");
                        setCatTxnLimit(20);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedCat(expandedCat === row.category ? null : row.category);
                          setCatTxnSearch("");
                          setCatTxnLimit(20);
                        }
                      }}
                    >
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {expandedCat === row.category ? (
                            <ChevronDown size={14} style={{ color: THEME.accent }} />
                          ) : (
                            <ChevronRight size={14} style={{ color: THEME.muted }} />
                          )}
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: categoryColorMap[row.category] || THEME.accent,
                              display: "inline-block",
                            }}
                          />
                          <span style={{ fontWeight: 700, color: THEME.ink }}>
                            {row.category}
                          </span>
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
                      <td style={td}>
                        <Badge
                          variant={
                            row.classification === "Needs"
                              ? "accent"
                              : row.classification === "Savings"
                                ? "sage"
                                : "gold"
                          }
                          style={{ fontSize: 10, padding: "2px 7px" }}
                        >
                          {row.classification}
                        </Badge>
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
                      <td style={{ ...td, fontWeight: 800, fontSize: 13.5 }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <Money value={row.periodTotal} variant="full" />
                          <div
                            style={{
                              width: 80,
                              height: 4,
                              borderRadius: 2,
                              background: "var(--surface-2)",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${Math.min(row.sharePct, 100)}%`,
                                height: "100%",
                                background: categoryColorMap[row.category] || THEME.accent,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Transaction Drilldown */}
                    {expandedCat === row.category && (
                      <tr>
                        <td colSpan={7} style={{ padding: 0 }}>
                          <div
                            style={{
                              background: "var(--surface-1)",
                              padding: "18px 24px",
                              borderBottom: `1.5px solid ${THEME.line}`,
                              boxShadow: "inset 0 2px 10px rgba(0,0,0,0.03)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                flexWrap: "wrap",
                                gap: 12,
                                marginBottom: 14,
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 800,
                                    color: THEME.muted,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                  }}
                                >
                                  {row.category} Analytics &amp; Transactions
                                </span>
                                <Badge variant="muted" style={{ fontSize: 10 }}>
                                  {row.txnCount} Total Transactions
                                </Badge>
                                <Badge variant="muted" style={{ fontSize: 10 }}>
                                  Avg Ticket: <Money value={row.avgPerTxn} variant="full" />
                                </Badge>
                              </div>

                              <div style={{ position: "relative" }}>
                                <Search
                                  size={12}
                                  style={{
                                    position: "absolute",
                                    left: 8,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: THEME.muted,
                                  }}
                                />
                                <input
                                  type="text"
                                  placeholder="Search in this category…"
                                  value={catTxnSearch}
                                  onChange={(e) => setCatTxnSearch(e.target.value)}
                                  style={{
                                    border: `1px solid ${THEME.line}`,
                                    borderRadius: 6,
                                    padding: "4px 8px 4px 24px",
                                    fontSize: 11.5,
                                    color: THEME.ink,
                                    background: "var(--surface-0)",
                                    width: 180,
                                  }}
                                />
                              </div>
                            </div>

                            <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                              {expenses
                                .filter(
                                  (t: any) => (t.category || "Uncategorized") === row.category
                                )
                                .filter((t: any) => {
                                  if (!catTxnSearch.trim()) return true;
                                  const q = catTxnSearch.trim().toLowerCase();
                                  const narr = (
                                    t.narration ||
                                    t.note ||
                                    t.description ||
                                    ""
                                  ).toLowerCase();
                                  return narr.includes(q);
                                })
                                .sort((a: any, b: any) => b.date.localeCompare(a.date))
                                .slice(0, catTxnLimit)
                                .map((t: any) => (
                                  <div
                                    key={t.id}
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      padding: "9px 0",
                                      borderBottom: `1px solid ${THEME.line}`,
                                      fontSize: 12.5,
                                    }}
                                  >
                                    <div style={{ flex: 1, paddingRight: 16 }}>
                                      <div
                                        style={{
                                          fontWeight: 700,
                                          color: THEME.ink,
                                          marginBottom: 2,
                                        }}
                                      >
                                        {t.narration || t.note || t.description || "No description"}
                                      </div>
                                      <div
                                        style={{
                                          color: THEME.muted,
                                          fontSize: 11,
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 8,
                                        }}
                                      >
                                        <span>
                                          {new Date(t.date + "T00:00:00").toLocaleDateString(
                                            "en-IN",
                                            {
                                              day: "numeric",
                                              month: "short",
                                              year: "numeric",
                                            }
                                          )}
                                        </span>
                                        {(t.account || t.bank || t.accountName) && (
                                          <>
                                            &bull;
                                            <span>
                                              {t.account || t.bank || t.accountName}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div
                                      style={{
                                        fontWeight: 800,
                                        color: THEME.rust,
                                        fontSize: 13.5,
                                        fontVariantNumeric: "tabular-nums",
                                      }}
                                    >
                                      <Money value={t.amount} variant="full" />
                                    </div>
                                  </div>
                                ))}
                            </div>

                            {expenses.filter(
                              (t: any) => (t.category || "Uncategorized") === row.category
                            ).length > catTxnLimit && (
                              <div style={{ textAlign: "center", padding: "12px 0 0" }}>
                                <button
                                  onClick={() => setCatTxnLimit((prev) => prev + 50)}
                                  style={{
                                    padding: "5px 14px",
                                    borderRadius: 8,
                                    border: `1px solid ${THEME.line}`,
                                    background: "var(--surface-0)",
                                    fontSize: 11.5,
                                    fontWeight: 700,
                                    color: THEME.accent,
                                    cursor: "pointer",
                                  }}
                                >
                                  Load More Transactions (Showing {catTxnLimit} of{" "}
                                  {
                                    expenses.filter(
                                      (t: any) => (t.category || "Uncategorized") === row.category
                                    ).length
                                  }
                                  )
                                </button>
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

      {/* Top Merchants / Payees Intelligence */}
      <Card style={{ padding: "24px 20px" }}>
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
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: THEME.ink,
                marginBottom: 4,
                letterSpacing: "-0.015em",
              }}
            >
              Top Merchants / Payees
            </div>
            <div style={{ fontSize: 12, color: THEME.muted }}>
              Top 10 by total spend, extracted from transaction narrations
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <Search
                size={12}
                style={{
                  position: "absolute",
                  left: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: THEME.muted,
                }}
              />
              <input
                type="text"
                placeholder="Search merchant…"
                value={merchantSearch}
                onChange={(e) => setMerchantSearch(e.target.value)}
                style={{
                  border: `1.5px solid ${THEME.line}`,
                  borderRadius: 8,
                  padding: "5px 8px 5px 24px",
                  fontSize: 12,
                  color: THEME.ink,
                  background: "var(--surface-0)",
                  width: 150,
                }}
              />
            </div>

            <div style={{ display: "flex", gap: 4 }}>
              <button
                onClick={() => setMerchantSortBy("amount")}
                className={`demat-portfolio-pill ${merchantSortBy === "amount" ? "active" : ""}`}
                style={{ padding: "5px 10px", fontSize: 11.5 }}
              >
                By Volume (₹)
              </button>
              <button
                onClick={() => setMerchantSortBy("count")}
                className={`demat-portfolio-pill ${merchantSortBy === "count" ? "active" : ""}`}
                style={{ padding: "5px 10px", fontSize: 11.5 }}
              >
                By Frequency
              </button>
            </div>
          </div>
        </div>

        {topMerchants.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 20,
              alignItems: "center",
            }}
          >
            {/* Horizontal Bar Chart */}
            <div
              style={{
                width: "100%",
                height: Math.max(topMerchants.length * 36 + 30, 220),
                position: "relative",
              }}
            >
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart
                  data={topMerchants}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
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
                    width={130}
                  />
                  <Tooltip
                    cursor={{ fill: THEME.line, opacity: 0.3 }}
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null;
                      const val = payload[0]?.value || 0;
                      const totalMerchantSpend = topMerchants.reduce(
                        (s: number, m: any) => s + m.amount,
                        0
                      );
                      const pct =
                        totalMerchantSpend > 0
                          ? ((val / totalMerchantSpend) * 100).toFixed(1)
                          : "0";
                      return (
                        <div
                          style={{
                            background: "color-mix(in srgb, var(--surface-0) 90%, transparent)",
                            backdropFilter: "blur(14px)",
                            border: `1.5px solid ${THEME.line}`,
                            borderRadius: 12,
                            padding: "10px 14px",
                            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.1)",
                            fontSize: 12,
                          }}
                        >
                          <div style={{ fontWeight: 800, color: THEME.ink }}>
                            {payload[0]?.payload?.name}
                          </div>
                          <div style={{ color: THEME.muted, marginTop: 4, fontWeight: 600 }}>
                            <Money value={val} variant="full" /> ({pct}%)
                          </div>
                          <div style={{ color: THEME.muted, marginTop: 2, fontSize: 11 }}>
                            Category: <b>{payload[0]?.payload?.category}</b> &bull; Txns:{" "}
                            <b>{payload[0]?.payload?.count}</b>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey={merchantSortBy === "count" ? "count" : "amount"}
                    radius={[0, 6, 6, 0]}
                    barSize={20}
                  >
                    {topMerchants.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Merchant Ranking Matrix */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={{ ...th, padding: "8px 12px" }}>Rank &amp; Payee</th>
                    <th style={{ ...th, padding: "8px 12px" }}>Category</th>
                    <th style={{ ...th, padding: "8px 12px", textAlign: "right" }}>Txns</th>
                    <th style={{ ...th, padding: "8px 12px", textAlign: "right" }}>Avg Ticket</th>
                    <th style={{ ...th, padding: "8px 12px", textAlign: "right" }}>Total Outflow</th>
                  </tr>
                </thead>
                <tbody>
                  {topMerchants.map((m, idx) => (
                    <tr key={m.name} className="table-row-hover">
                      <td style={{ ...td, padding: "8px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: "var(--surface-2)",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: 10,
                              fontWeight: 800,
                              color: THEME.muted,
                            }}
                          >
                            {idx + 1}
                          </span>
                          <span style={{ fontWeight: 700, color: THEME.ink }}>{m.name}</span>
                        </div>
                      </td>
                      <td style={{ ...td, padding: "8px 12px" }}>
                        <Badge variant="muted" style={{ fontSize: 10 }}>
                          {m.category}
                        </Badge>
                      </td>
                      <td style={{ ...td, padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>
                        {m.count}
                      </td>
                      <td style={{ ...td, padding: "8px 12px", textAlign: "right", color: THEME.muted }}>
                        <Money value={m.avgTicket} variant="full" />
                      </td>
                      <td
                        style={{
                          ...td,
                          padding: "8px 12px",
                          textAlign: "right",
                          fontWeight: 800,
                          color: THEME.rust,
                        }}
                      >
                        <Money value={m.amount} variant="full" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 40, color: THEME.muted, fontSize: 13 }}>
            No merchant data available
          </div>
        )}
      </Card>

      {/* Smart Anomaly Detection & Financial Radar */}
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
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: THEME.ink,
                letterSpacing: "-0.015em",
              }}
            >
              Anomaly Detection
            </span>
          </div>
          <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 16 }}>
            Unusual spending patterns and high-ticket deviations that require your attention
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Category Anomalies */}
            {anomalies.catAnomalies.map((c: any) => (
              <div
                key={c.category}
                style={{
                  background: `color-mix(in srgb, ${THEME.rust} 5%, var(--surface-0))`,
                  border: `1.5px solid color-mix(in srgb, ${THEME.rust} 22%, ${THEME.line})`,
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
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: `color-mix(in srgb, ${THEME.rust} 15%, transparent)`,
                      color: THEME.rust,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: THEME.ink }}>
                      {c.category} spending is unusually elevated
                    </div>
                    <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                      This month: <b><Money value={c.thisMonth} variant="full" /></b> vs 3-month
                      baseline: <b><Money value={c.avg3} variant="full" /></b> (
                      {c.avg3 > 0
                        ? `${((c.thisMonth / c.avg3) * 100 - 100).toFixed(0)}% above normal`
                        : "No baseline"}
                      )
                    </div>
                  </div>
                </div>
                <Badge variant="rust">Category Surge Alert</Badge>
              </div>
            ))}

            {/* Transaction Anomalies */}
            {anomalies.txnAnomalies.map((t: any) => (
              <div
                key={t.id}
                style={{
                  background: `color-mix(in srgb, ${THEME.gold} 5%, var(--surface-0))`,
                  border: `1.5px solid color-mix(in srgb, ${THEME.gold} 22%, ${THEME.line})`,
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
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: `color-mix(in srgb, ${THEME.gold} 15%, transparent)`,
                      color: THEME.gold,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Zap size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: THEME.ink }}>
                      High-Ticket Outlier: <Money value={t.amount} variant="full" />
                    </div>
                    <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                      {t.narration || t.note || t.description || "No description"} &bull;{" "}
                      {new Date(t.date + "T00:00:00").toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      &bull; Category: <b>{t.category || "Uncategorized"}</b>
                    </div>
                  </div>
                </div>
                <Badge variant="gold">Outlier Transaction</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Income vs Expense Comparison & Monthly Net Surplus */}
      <Card style={{ padding: "24px 20px" }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 800,
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
        <div style={{ width: "100%", height: 340, position: "relative" }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ComposedChart data={monthlyData} margin={{ top: 10, right: 15, left: 0, bottom: 0 }}>
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
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: THEME.line }} />
              <Legend
                wrapperStyle={{ fontSize: 11.5, paddingTop: 14 }}
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
                barSize={22}
                opacity={0.88}
              />
              <Bar
                yAxisId="left"
                dataKey="expense"
                name="Expense"
                fill={PIE_COLORS[3]}
                radius={[6, 6, 0, 0]}
                barSize={22}
                opacity={0.88}
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
          </ResponsiveContainer>
        </div>

        {/* Savings Rate Grid */}
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            marginTop: 18,
            padding: "16px 0 0",
            borderTop: `1px solid ${THEME.line}`,
          }}
        >
          {monthlyData.map((m) => (
            <div
              key={m.month}
              style={{
                textAlign: "center",
                minWidth: 65,
                flex: "1 1 65px",
                background: "var(--surface-1)",
                padding: "8px 6px",
                borderRadius: 10,
                border: `1px solid ${THEME.line}`,
              }}
            >
              <div style={{ fontSize: 10.5, color: THEME.muted, marginBottom: 3, fontWeight: 700 }}>
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
                  letterSpacing: "0.04em",
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
