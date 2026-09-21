/* eslint-disable */
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Coins,
  TrendingUp,
  Calendar,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Search,
  X,
  Download,
  List,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Plus,
  Sparkles,
  Info,
  Layers,
  Flame,
  ArrowUpRight,
  SlidersHorizontal,
  Target,
  PieChart as PieIcon,
  Check,
  ArrowRight,
  DollarSign,
  Briefcase,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend,
} from "recharts";
import { THEME, PIE_COLORS } from "../../utils/constants";
import {
  fmtINR,
  fmtINRFull,
  fmtINRExact,
  today,
  getLocalDateString,
  exportArrayToCSV,
  uid,
} from "../../utils/finance";
import { getCurrentFY } from "../../utils/appConstants";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Modal, ModalActions } from "../ui/Modal";
import { Field, Input } from "../ui/Form";
import { Prv } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { StockLogo } from "../ui/BrandLogos";
import { DataTable, Column } from "../design-system/DataTable";

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

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
};

const getDaysUntil = (dateStr: string | null): number | null => {
  if (!dateStr) return null;
  const target = new Date(dateStr + "T00:00:00");
  if (isNaN(target.getTime())) return null;
  const now = new Date(today() + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const urgencyColor = (days: number | null): string => {
  if (days === null) return THEME.muted;
  if (days < 0) return THEME.muted;
  if (days <= 3) return THEME.rust;
  if (days <= 14) return THEME.gold;
  return THEME.sage;
};

const urgencyLabel = (days: number | null): string => {
  if (days === null) return "—";
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return "Today!";
  if (days <= 7) return `${days}d left`;
  if (days <= 30) return `${days}d left`;
  return `${Math.ceil(days / 7)}w`;
};

// Convert Unix timestamp (seconds) → YYYY-MM-DD or null
const tsToDate = (ts: number | null | undefined): string | null => {
  if (!ts || ts <= 0) return null;
  return new Date(Number(ts) * 1000).toISOString().slice(0, 10);
};

export interface DividendCalendarTabProps {
  state: any;
  marketData?: Record<string, any>;
  addItem?: (collection: string, item: any) => Promise<any>;
  showToast?: (msg: string, type?: "success" | "error" | "info") => void;
}

export function DividendCalendarTab({
  state,
  marketData,
  addItem,
  showToast,
}: DividendCalendarTabProps) {
  const todayStr = today();
  const [exData, setExData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  // Search & Navigation Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState("estDivIncome");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "seasonality" | "mf">("list");
  const [timelineFilter, setTimelineFilter] = useState<"all" | "7d" | "30d" | "90d">("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "payers" | "highYield">("all");

  // Passive Income Goal Target (State)
  const [passiveGoalAnnual, setPassiveGoalAnnual] = useState<number>(60000);
  const [isEditingGoal, setIsEditingGoal] = useState<boolean>(false);
  const [goalInput, setGoalInput] = useState<string>("60000");

  // Calendar Day Selection Modal
  const [selectedDayEvents, setSelectedDayEvents] = useState<{
    date: string;
    ex: any[];
    pay: any[];
  } | null>(null);

  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date(todayStr + "T00:00:00");
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  // Record Dividend Modal State (1-Click Ledger Payout)
  const [recordModalData, setRecordModalData] = useState<{
    isOpen: boolean;
    symbol: string;
    fundName?: string;
    type: "stock" | "mf";
    qty: number;
    divRate: number;
    amount: number;
    tds: number;
    paymentDate: string;
    recordDate?: string;
    fy: string;
    saving: boolean;
  }>({
    isOpen: false,
    symbol: "",
    type: "stock",
    qty: 0,
    divRate: 0,
    amount: 0,
    tds: 0,
    paymentDate: todayStr,
    fy: state?.profile?.fy || getCurrentFY(),
    saving: false,
  });

  const matchesSearch = (text: string) =>
    !searchQuery || String(text || "").toLowerCase().includes(searchQuery.toLowerCase());

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "symbol" ? "asc" : "desc");
    }
  };

  // Group portfolio buy-lots into one entry per symbol+exchange
  const stockGroups = useMemo(() => {
    const map = new Map<string, any>();
    (state?.stocks || []).forEach((s: any) => {
      if (!s.symbol || Number(s.qty || 0) <= 0) return;
      const base = String(s.symbol).replace(/\.(NS|BO)$/i, "");
      const exchange = s.exchange || "NSE";
      const yfSym = `${base}.${exchange === "BSE" ? "BO" : "NS"}`;
      const key = `${base}|${exchange}`;
      const qty = Number(s.qty || 0);
      const avgPrice = Number(s.avgPrice || 0);
      const livePrice = marketData?.[yfSym]?.price;
      const currentPrice =
        Number(livePrice ?? 0) || Number(s.currentPrice || 0) || Number(s.avgPrice || 0);

      if (!map.has(key)) {
        map.set(key, {
          symbol: base,
          exchange,
          yfSym,
          qty: 0,
          currentValue: 0,
          investedValue: 0,
        });
      }
      const g = map.get(key);
      g.qty += qty;
      g.currentValue += qty * currentPrice;
      g.investedValue += qty * avgPrice;
    });
    return Array.from(map.values());
  }, [state?.stocks, marketData]);

  // Unique Yahoo Finance symbols to fetch ex-dividend/yield data for
  const symbols = useMemo<string[]>(
    () => Array.from(new Set(stockGroups.map((g: any) => g.yfSym))),
    [stockGroups]
  );

  const fetchExDates = async () => {
    if (fetchingRef.current || symbols.length === 0) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    const results: Record<string, any> = {};
    const failed: string[] = [];

    await Promise.allSettled(
      symbols.map(async (sym) => {
        try {
          const res = await fetch(`/api/stock-exdate?symbol=${encodeURIComponent(sym)}`);
          if (res.ok) {
            const data = await res.json();
            results[sym] = data;
          } else {
            failed.push(sym);
          }
        } catch {
          failed.push(sym);
        }
      })
    );

    setExData(results);
    setFetched(true);
    setLastSyncTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    setLoading(false);
    fetchingRef.current = false;
    if (failed.length > 0) {
      setError(
        failed.length === symbols.length
          ? "Couldn't reach Yahoo Finance for live dividend data. Try refreshing in a minute."
          : `Couldn't fetch live data for ${failed.length} of ${symbols.length} symbols. Try refreshing again shortly.`
      );
    }
  };

  // Auto-fetch once on mount when stocks exist
  useEffect(() => {
    if (symbols.length > 0 && !fetched) {
      fetchExDates();
    }
  }, [symbols]);

  // Build enriched rows
  const stockRows = useMemo(() => {
    return stockGroups.map((g: any) => {
      const info = exData[g.yfSym] || {};
      const exDate = tsToDate(info.exDividendDate);
      const divPayDate = tsToDate(info.dividendDate);
      const divRate = Number(info.dividendRate || info.trailingAnnualDividendRate || 0);
      const divYield = Number(info.dividendYield || 0) * 100;
      const currentPrice = g.qty > 0 ? g.currentValue / g.qty : 0;
      const avgPrice = g.qty > 0 ? g.investedValue / g.qty : 0;
      const estDivIncome = divRate * g.qty;
      const yieldOnCost = avgPrice > 0 ? (divRate / avgPrice) * 100 : 0;
      const daysToEx = getDaysUntil(exDate);
      const daysToPay = getDaysUntil(divPayDate);

      // Past dividends received for this symbol
      const pastDivs = (state?.dividends || [])
        .filter((d: any) => d.symbol === g.symbol || d.fundName === g.symbol)
        .sort((a: any, b: any) =>
          (b.recordDate || b.paymentDate || "").localeCompare(a.recordDate || a.paymentDate || "")
        );
      const lastDiv = pastDivs[0] || null;

      return {
        key: `${g.symbol}-${g.exchange}`,
        symbol: g.symbol,
        yfSym: g.yfSym,
        exchange: g.exchange,
        qty: g.qty,
        currentPrice,
        avgPrice,
        currentValue: g.currentValue,
        investedValue: g.investedValue,
        exDate,
        divPayDate,
        divRate,
        divYield,
        yieldOnCost,
        estDivIncome,
        daysToEx,
        daysToPay,
        lastDiv,
        hasLiveData: fetched && divRate > 0,
        isDivPayer: divRate > 0,
      };
    });
  }, [stockGroups, state?.dividends, exData, fetched]);

  // Upcoming ex-dates within 90 days (or past 7 days)
  const upcomingExDates = useMemo(() => {
    return stockRows
      .filter((r) => r.daysToEx !== null && r.daysToEx >= -7 && r.daysToEx <= 90)
      .filter((r) => {
        if (timelineFilter === "7d") return r.daysToEx !== null && r.daysToEx <= 7 && r.daysToEx >= 0;
        if (timelineFilter === "30d") return r.daysToEx !== null && r.daysToEx <= 30 && r.daysToEx >= 0;
        if (timelineFilter === "90d") return r.daysToEx !== null && r.daysToEx <= 90 && r.daysToEx >= 0;
        return true;
      })
      .filter((r) => {
        if (categoryFilter === "payers") return r.isDivPayer;
        if (categoryFilter === "highYield") return r.divYield >= 3;
        return true;
      })
      .filter((r) => matchesSearch(r.symbol))
      .sort((a, b) => (a.daysToEx ?? 999) - (b.daysToEx ?? 999));
  }, [stockRows, searchQuery, timelineFilter, categoryFilter]);

  const dividendPayers = useMemo(
    () => stockRows.filter((r) => r.isDivPayer).sort((a, b) => b.divYield - a.divYield),
    [stockRows]
  );

  const totalEstIncome = dividendPayers.reduce((s, r) => s + r.estDivIncome, 0);
  const totalPortValue = stockRows.reduce((s, r) => s + r.currentValue, 0);
  const totalInvestedValue = stockRows.reduce((s, r) => s + r.investedValue, 0);
  const portfolioYield = totalPortValue > 0 ? (totalEstIncome / totalPortValue) * 100 : 0;
  const portfolioYoC = totalInvestedValue > 0 ? (totalEstIncome / totalInvestedValue) * 100 : 0;

  // Monthly Projected Cashflow Seasonality from upcoming ex-dates and historical cycles
  const monthlyProjectedSeasonality = useMemo(() => {
    const list = MONTH_NAMES.map((name, i) => ({
      month: name,
      fullName: FULL_MONTH_NAMES[i],
      monthIdx: i,
      amount: 0,
      count: 0,
      stocks: [] as string[],
    }));
    stockRows.forEach((r) => {
      const dStr = r.exDate || r.divPayDate;
      if (dStr && r.estDivIncome > 0) {
        const d = new Date(dStr + "T00:00:00");
        if (!isNaN(d.getTime())) {
          const m = d.getMonth();
          list[m].amount += r.estDivIncome;
          list[m].count += 1;
          list[m].stocks.push(r.symbol);
        }
      }
    });
    return list;
  }, [stockRows]);

  // Quarterly breakdown
  const quarterlySeasonality = useMemo(() => {
    const q1 = monthlyProjectedSeasonality.slice(3, 6).reduce((s, m) => s + m.amount, 0); // Apr - Jun (Q1 Indian FY)
    const q2 = monthlyProjectedSeasonality.slice(6, 9).reduce((s, m) => s + m.amount, 0); // Jul - Sep (Q2)
    const q3 = monthlyProjectedSeasonality.slice(9, 12).reduce((s, m) => s + m.amount, 0); // Oct - Dec (Q3)
    const q4 = monthlyProjectedSeasonality.slice(0, 3).reduce((s, m) => s + m.amount, 0); // Jan - Mar (Q4)
    return [
      { quarter: "Q1 (Apr–Jun)", amount: q1 },
      { quarter: "Q2 (Jul–Sep)", amount: q2 },
      { quarter: "Q3 (Oct–Dec)", amount: q3 },
      { quarter: "Q4 (Jan–Mar)", amount: q4 },
    ];
  }, [monthlyProjectedSeasonality]);

  // Sorted + search-filtered rows for the holdings table
  const tableRows = useMemo(() => {
    const filtered = stockRows
      .filter((r) => matchesSearch(r.symbol))
      .filter((r) => {
        if (categoryFilter === "payers") return r.isDivPayer;
        if (categoryFilter === "highYield") return r.divYield >= 3;
        return true;
      });

    const dir = sortDir === "asc" ? 1 : -1;
    const valueOf = (r: any) => {
      switch (sortKey) {
        case "symbol":
          return r.symbol;
        case "qty":
          return r.qty;
        case "currentValue":
          return r.currentValue;
        case "divRate":
          return r.divRate;
        case "divYield":
          return r.divYield;
        case "yieldOnCost":
          return r.yieldOnCost;
        case "exDate":
          return r.exDate || "";
        case "divPayDate":
          return r.divPayDate || "";
        case "lastDiv":
          return r.lastDiv?.recordDate || r.lastDiv?.paymentDate || "";
        case "estDivIncome":
        default:
          return r.estDivIncome;
      }
    };
    return [...filtered].sort((a, b) => {
      const av = valueOf(a);
      const bv = valueOf(b);
      if (typeof av === "string" || typeof bv === "string") {
        return String(av).localeCompare(String(bv)) * dir;
      }
      return (Number(av) - Number(bv)) * dir;
    });
  }, [stockRows, searchQuery, categoryFilter, sortKey, sortDir]);

  // Calendar month-grid data
  const calDays = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const first = new Date(year, month, 1);
    const startPad = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (string | null)[] = [];
    for (let i = 0; i < startPad; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(getLocalDateString(new Date(year, month, d)));
    return cells;
  }, [calMonth]);

  const calEventsByDate = useMemo(() => {
    const map: Record<string, { ex: any[]; pay: any[] }> = {};
    stockRows
      .filter((r) => matchesSearch(r.symbol))
      .forEach((r) => {
        if (r.exDate) {
          if (!map[r.exDate]) map[r.exDate] = { ex: [], pay: [] };
          map[r.exDate].ex.push(r);
        }
        if (r.divPayDate) {
          if (!map[r.divPayDate]) map[r.divPayDate] = { ex: [], pay: [] };
          map[r.divPayDate].pay.push(r);
        }
      });
    return map;
  }, [stockRows, searchQuery]);

  // Mutual fund dividend / IDCW payouts
  const mfDividends = useMemo(
    () =>
      (state?.dividends || [])
        .filter((d: any) => d.type === "mf" || (!d.symbol && d.fundName))
        .filter((d: any) => matchesSearch(d.fundName))
        .sort((a: any, b: any) =>
          (b.recordDate || b.paymentDate || "").localeCompare(a.recordDate || a.paymentDate || "")
        ),
    [state?.dividends, searchQuery]
  );

  const mfTotals = mfDividends.reduce(
    (acc: any, d: any) => {
      acc.gross += Number(d.amount || 0);
      acc.tds += Number(d.tds || 0);
      return acc;
    },
    { gross: 0, tds: 0 }
  );

  // 1-Click Quick Record Dividend Payout to Ledger
  const openRecordModal = (stockItem: any, eventType: "ex" | "pay" = "pay") => {
    const rawAmount = stockItem.divRate > 0 ? stockItem.divRate * stockItem.qty : 0;
    // Section 194: 10% TDS applies if dividend from a single entity exceeds ₹5,000 in a FY
    const estimatedTds = rawAmount > 5000 ? Math.round(rawAmount * 0.1) : 0;
    const targetDate =
      (eventType === "pay" ? stockItem.divPayDate : stockItem.exDate) || todayStr;

    setRecordModalData({
      isOpen: true,
      symbol: stockItem.symbol,
      type: "stock",
      qty: stockItem.qty,
      divRate: stockItem.divRate || 0,
      amount: rawAmount,
      tds: estimatedTds,
      paymentDate: targetDate,
      recordDate: stockItem.exDate || "",
      fy: state?.profile?.fy || getCurrentFY(),
      saving: false,
    });
  };

  const handleSaveDividendRecord = async () => {
    if (!addItem) {
      showToast?.("Dividend ledger is in read-only mode", "info");
      setRecordModalData((prev) => ({ ...prev, isOpen: false }));
      return;
    }

    if (!recordModalData.amount || Number(recordModalData.amount) <= 0) {
      showToast?.("Please enter a valid dividend amount", "error");
      return;
    }

    setRecordModalData((prev) => ({ ...prev, saving: true }));

    try {
      const newDiv = {
        id: uid(),
        symbol: recordModalData.symbol,
        type: recordModalData.type,
        qty: Number(recordModalData.qty) || undefined,
        divPerShare: Number(recordModalData.divRate) || undefined,
        amount: Number(recordModalData.amount),
        tds: Number(recordModalData.tds || 0),
        paymentDate: recordModalData.paymentDate,
        recordDate: recordModalData.recordDate || recordModalData.paymentDate,
        fy: recordModalData.fy,
        note: `Recorded from Dividend Calendar (${recordModalData.symbol})`,
        createdAt: new Date().toISOString(),
      };

      await addItem("dividends", newDiv);
      showToast?.(
        `Recorded ₹${Number(recordModalData.amount).toLocaleString("en-IN")} dividend from ${recordModalData.symbol}!`,
        "success"
      );
      setRecordModalData((prev) => ({ ...prev, isOpen: false, saving: false }));
      if (selectedDayEvents) setSelectedDayEvents(null);
    } catch (err: any) {
      showToast?.("Failed to record dividend payout: " + (err?.message || "Unknown error"), "error");
      setRecordModalData((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleExportCSV = () => {
    const rows = tableRows.map((r) => ({
      symbol: r.symbol,
      exchange: r.exchange,
      qty: r.qty,
      currentValue: Math.round(r.currentValue),
      divPerShare: r.divRate ? r.divRate.toFixed(2) : "",
      yieldPct: r.divYield ? `${r.divYield.toFixed(2)}%` : "",
      yieldOnCost: r.yieldOnCost ? `${r.yieldOnCost.toFixed(2)}%` : "",
      exDate: r.exDate || "",
      payDate: r.divPayDate || "",
      estAnnual: r.estDivIncome ? Math.round(r.estDivIncome) : "",
      lastReceived: r.lastDiv ? r.lastDiv.recordDate || r.lastDiv.paymentDate || "" : "",
    }));
    exportArrayToCSV(
      rows,
      [
        { key: "symbol", label: "Symbol" },
        { key: "exchange", label: "Exchange" },
        { key: "qty", label: "Qty" },
        { key: "currentValue", label: "Current Value" },
        { key: "divPerShare", label: "Div / Share" },
        { key: "yieldPct", label: "Yield %" },
        { key: "yieldOnCost", label: "Yield on Cost %" },
        { key: "exDate", label: "Ex-date" },
        { key: "payDate", label: "Pay Date" },
        { key: "estAnnual", label: "Est. Annual" },
        { key: "lastReceived", label: "Last Received" },
      ],
      `dividend-calendar_${todayStr}.csv`
    );
  };

  const handleExportMFCSV = () => {
    const rows = mfDividends.map((d: any) => ({
      fund: d.fundName || "",
      amount: Number(d.amount || 0),
      tds: Number(d.tds || 0),
      net: Number(d.amount || 0) - Number(d.tds || 0),
      recordDate: d.recordDate || "",
      paymentDate: d.paymentDate || "",
      fy: d.fy || "",
    }));
    exportArrayToCSV(
      rows,
      [
        { key: "fund", label: "Fund" },
        { key: "amount", label: "Amount" },
        { key: "tds", label: "TDS" },
        { key: "net", label: "Net" },
        { key: "recordDate", label: "Record Date" },
        { key: "paymentDate", label: "Payment Date" },
        { key: "fy", label: "FY" },
      ],
      `mf-dividends_${todayStr}.csv`
    );
  };

  const goalProgressPct = Math.min(
    100,
    Math.round((totalEstIncome / Math.max(1, passiveGoalAnnual)) * 100)
  );

  const monthlyEstAverage = Math.round(totalEstIncome / 12);

  const urgentExList = upcomingExDates.filter(
    (r) => r.daysToEx !== null && r.daysToEx >= 0 && r.daysToEx <= 3
  );

  if (symbols.length === 0 && mfDividends.length === 0 && (state?.dividends || []).length === 0) {
    return (
      <div className="tab-content-enter" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <SectionTitle sub="Ex-dividend dates & income projections for your stock portfolio">
          Dividend Calendar
        </SectionTitle>
        <EmptyState
          icon={Coins}
          title="No Stocks in Portfolio"
          description="Add stocks to your Demat account to track dividend ex-dates, yield on cost, and projected passive cashflow."
        />
      </div>
    );
  }

  const holdingsColumns: Column<(typeof tableRows)[number]>[] = [
    {
      key: "symbol",
      header: "Symbol",
      sortable: true,
      align: "left",
      accessor: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StockLogo yfSym={r.yfSym} size={32} />
          <div>
            <div style={{ fontWeight: 800, color: THEME.ink, fontSize: 13.5 }}>{r.symbol}</div>
            {r.exchange && (
              <div style={{ fontSize: 10.5, color: THEME.muted, fontWeight: 600, marginTop: 1 }}>
                {r.exchange}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "qty",
      header: "Qty",
      sortable: true,
      align: "right",
      accessor: (r) => (
        <span style={{ fontWeight: 600, color: THEME.ink }}>
          {r.qty.toLocaleString("en-IN")}
        </span>
      ),
    },
    {
      key: "currentValue",
      header: "Current Value",
      sortable: true,
      align: "right",
      accessor: (r) => (
        <span style={{ fontWeight: 700 }}>
          <Money value={r.currentValue} variant="exact" />
        </span>
      ),
    },
    {
      key: "divRate",
      header: "Div / Share",
      sortable: true,
      align: "right",
      accessor: (r) => (
        <span
          style={{
            color: r.divRate > 0 ? THEME.sage : THEME.muted,
            fontWeight: r.divRate > 0 ? 700 : 500,
          }}
        >
          {r.divRate > 0 ? <Prv>{`₹${r.divRate.toFixed(2)}`}</Prv> : loading ? "…" : "—"}
        </span>
      ),
    },
    {
      key: "divYield",
      header: "Yield %",
      sortable: true,
      align: "right",
      accessor: (r) => (
        <div style={{ textAlign: "right" }}>
          <span
            style={{
              color: r.divYield > 0 ? THEME.sage : THEME.muted,
              fontWeight: r.divYield > 0 ? 700 : 500,
              fontSize: 13,
            }}
          >
            {r.divYield > 0 ? `${r.divYield.toFixed(2)}%` : loading ? "…" : "—"}
          </span>
          {r.yieldOnCost > 0 && r.yieldOnCost !== r.divYield && (
            <div style={{ fontSize: 10, color: THEME.gold, fontWeight: 700, marginTop: 2 }}>
              YoC: {r.yieldOnCost.toFixed(2)}%
            </div>
          )}
        </div>
      ),
    },
    {
      key: "exDate",
      header: "Ex-date",
      sortable: true,
      align: "right",
      accessor: (r) => (
        <div style={{ textAlign: "right" }}>
          <span
            style={{
              color: r.exDate ? THEME.ink : THEME.muted,
              whiteSpace: "nowrap",
              fontWeight: 600,
              fontSize: 12.5,
            }}
          >
            {r.exDate ? formatDate(r.exDate) : loading ? "…" : "—"}
          </span>
          {r.daysToEx !== null && r.daysToEx >= 0 && r.daysToEx <= 30 && (
            <div style={{ fontSize: 10, color: urgencyColor(r.daysToEx), fontWeight: 800 }}>
              {urgencyLabel(r.daysToEx)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "divPayDate",
      header: "Pay Date",
      sortable: true,
      align: "right",
      accessor: (r) => (
        <span
          style={{
            color: r.divPayDate ? THEME.ink : THEME.muted,
            whiteSpace: "nowrap",
            fontSize: 12.5,
          }}
        >
          {r.divPayDate ? formatDate(r.divPayDate) : loading ? "…" : "—"}
        </span>
      ),
    },
    {
      key: "estDivIncome",
      header: "Est. Annual",
      sortable: true,
      align: "right",
      accessor: (r) => (
        <span
          style={{
            fontWeight: r.estDivIncome > 0 ? 700 : 500,
            color: r.estDivIncome > 0 ? THEME.sage : THEME.muted,
            fontSize: 13,
          }}
        >
          {r.estDivIncome > 0 ? <Money value={r.estDivIncome} variant="exact" /> : "—"}
        </span>
      ),
    },
    {
      key: "lastDiv",
      header: "Last Received",
      sortable: true,
      align: "right",
      accessor: (r) => (
        <span style={{ color: THEME.muted, whiteSpace: "nowrap", fontSize: 12 }}>
          {r.lastDiv ? formatDate(r.lastDiv.recordDate || r.lastDiv.paymentDate) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Action",
      align: "center",
      accessor: (r) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => openRecordModal(r, "pay")}
          style={{ padding: "4px 8px", fontSize: 11, borderRadius: 8 }}
          title="Record dividend payout into ledger"
        >
          + Log
        </Button>
      ),
    },
  ];

  const mfColumns: Column<(typeof mfDividends)[number]>[] = [
    {
      key: "fundName",
      header: "Fund",
      align: "left",
      accessor: (d) => (
        <span style={{ fontWeight: 700, color: THEME.ink, fontSize: 13 }}>
          {d.fundName || "—"}
        </span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      accessor: (d) => (
        <span style={{ fontWeight: 700, fontSize: 13 }}>
          <Money value={Number(d.amount || 0)} variant="exact" />
        </span>
      ),
    },
    {
      key: "tds",
      header: "TDS",
      align: "right",
      accessor: (d) => (
        <span style={{ color: THEME.rust, fontSize: 13 }}>
          <Money value={Number(d.tds || 0)} variant="exact" />
        </span>
      ),
    },
    {
      key: "net",
      header: "Net",
      align: "right",
      accessor: (d) => (
        <span style={{ fontWeight: 700, color: THEME.sage, fontSize: 13 }}>
          <Money value={Number(d.amount || 0) - Number(d.tds || 0)} variant="exact" />
        </span>
      ),
    },
    {
      key: "recordDate",
      header: "Record Date",
      align: "right",
      accessor: (d) => (
        <span style={{ whiteSpace: "nowrap", fontSize: 12 }}>{formatDate(d.recordDate)}</span>
      ),
    },
    {
      key: "paymentDate",
      header: "Payment Date",
      align: "right",
      accessor: (d) => (
        <span style={{ whiteSpace: "nowrap", fontSize: 12 }}>{formatDate(d.paymentDate)}</span>
      ),
    },
  ];

  return (
    <div
      className="tab-content-enter"
      style={{ display: "flex", flexDirection: "column", gap: 22 }}
    >
      {/* ── Executive Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <SectionTitle sub="Ex-dividend dates, dividend yield & projected annual income from your stock holdings">
          Dividend Calendar
        </SectionTitle>

        {/* Sync Status & Action Command Row */}
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                color: THEME.rust,
                fontWeight: 600,
                maxWidth: 280,
                background: "color-mix(in srgb, var(--t-rust) 8%, transparent)",
                padding: "6px 12px",
                borderRadius: 10,
                border: "1px solid color-mix(in srgb, var(--t-rust) 20%, transparent)",
              }}
            >
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {error}
              </span>
            </div>
          )}

          {lastSyncTime && !error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 11.5,
                color: THEME.muted,
                fontWeight: 600,
              }}
            >
              <Clock size={13} />
              Synced at {lastSyncTime}
            </div>
          )}

          <button
            onClick={fetchExDates}
            disabled={loading}
            className="card-lift"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 12,
              border: `1.5px solid ${THEME.line}`,
              background: "var(--surface-0)",
              color: loading ? THEME.muted : THEME.ink,
              fontSize: 13,
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <RefreshCw size={14} className={loading ? "spin" : ""} />
            {loading ? `Fetching ${symbols.length} symbols…` : "Refresh Ex-dates"}
          </button>
        </div>
      </div>

      {/* ── Plain-English Explainer & Tax TDS Note ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 12,
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            background: `color-mix(in srgb, ${THEME.gold} 8%, transparent)`,
            border: `1px solid color-mix(in srgb, ${THEME.gold} 24%, transparent)`,
            fontSize: 12.5,
            color: THEME.ink,
            lineHeight: 1.5,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <Info size={16} color={THEME.gold} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <b>Ex-Dividend Rule</b>: You must hold the stock <i>before</i> the ex-dividend date to
            be eligible for the upcoming payout. Buying on or after this date excludes you from that
            distribution. The <b>Pay Date</b> is when funds hit your bank account.
          </div>
        </div>

        <div
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
            border: `1px solid color-mix(in srgb, ${THEME.accent} 24%, transparent)`,
            fontSize: 12.5,
            color: THEME.ink,
            lineHeight: 1.5,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <ShieldCheck size={16} color={THEME.accent} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <b>Section 194 TDS Intelligence</b>: 10% TDS applies if aggregate dividend from a single
            company exceeds ₹5,000 in a FY. All dividends are taxed at your marginal slab rate in
            your ITR.
          </div>
        </div>
      </div>

      {/* ── Summary KPI Command Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <StatCard
          label="Est. Annual Dividend"
          value={fmtINRFull(totalEstIncome)}
          numericValue={totalEstIncome}
          formatValue={fmtINRFull}
          icon={<Coins />}
          color={THEME.sage}
          caption={
            portfolioYoC > 0
              ? `Yield on Cost: ${portfolioYoC.toFixed(2)}% (Avg ₹${monthlyEstAverage.toLocaleString("en-IN")}/mo)`
              : `Avg ₹${monthlyEstAverage.toLocaleString("en-IN")}/mo`
          }
        />
        <StatCard
          label="Portfolio Div. Yield"
          value={portfolioYield > 0 ? `${portfolioYield.toFixed(2)}%` : "—"}
          numericValue={portfolioYield}
          formatValue={(n) => (n > 0 ? `${n.toFixed(2)}%` : "—")}
          icon={<TrendingUp />}
          color={THEME.accent}
          caption="Forward indicated market yield"
        />
        <StatCard
          label="Upcoming Ex-dates"
          value={String(upcomingExDates.length)}
          numericValue={upcomingExDates.length}
          formatValue={(n) => String(Math.round(n))}
          icon={<Calendar />}
          color={urgentExList.length > 0 ? THEME.rust : THEME.gold}
          caption={
            urgentExList.length > 0
              ? `${urgentExList.length} urgent action in ≤3 days!`
              : "Within ±90 days timeline"
          }
        />
        <StatCard
          label="Dividend Payers"
          value={`${dividendPayers.length} / ${stockRows.length}`}
          icon={<BarChart3 />}
          color={THEME.muted}
          caption={`${((dividendPayers.length / Math.max(1, stockRows.length)) * 100).toFixed(0)}% of stock holdings`}
        />
      </div>

      {/* ── Passive Income Goal / Freedom Tracker Bar ── */}
      <Card
        style={{
          padding: "16px 20px",
          border: `1.5px solid ${THEME.line}`,
          background: "linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: `color-mix(in srgb, ${THEME.sage} 15%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: THEME.sage,
              }}
            >
              <Target size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>
                Passive Income Freedom Target
              </div>
              <div style={{ fontSize: 11.5, color: THEME.muted }}>
                Annual Dividend Target:{" "}
                <b style={{ color: THEME.ink }}>₹{passiveGoalAnnual.toLocaleString("en-IN")}</b>{" "}
                (₹{Math.round(passiveGoalAnnual / 12).toLocaleString("en-IN")}/month)
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isEditingGoal ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="number"
                  value={goalInput}
                  onChange={(e) => setGoalInput(e.target.value)}
                  placeholder="Target in ₹"
                  style={{
                    width: 110,
                    padding: "4px 8px",
                    borderRadius: 8,
                    border: `1.5px solid ${THEME.accent}`,
                    background: "var(--surface-0)",
                    color: THEME.ink,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                />
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    const parsed = Number(goalInput);
                    if (parsed > 0) setPassiveGoalAnnual(parsed);
                    setIsEditingGoal(false);
                  }}
                  style={{ padding: "4px 8px", fontSize: 11 }}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsEditingGoal(false)}
                  style={{ padding: "4px 8px", fontSize: 11 }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setGoalInput(String(passiveGoalAnnual));
                  setIsEditingGoal(true);
                }}
                style={{ padding: "4px 10px", fontSize: 11.5 }}
              >
                Adjust Goal
              </Button>
            )}

            <Badge variant={goalProgressPct >= 100 ? "sage" : "gold"}>
              {goalProgressPct}% Achieved
            </Badge>
          </div>
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: "100%",
            height: 10,
            borderRadius: 6,
            background: "var(--surface-2)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              width: `${goalProgressPct}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${THEME.accent} 0%, ${THEME.sage} 100%)`,
              borderRadius: 6,
              transition: "width 0.6s ease",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 6,
            fontSize: 11,
            color: THEME.muted,
          }}
        >
          <span>
            Current: <b style={{ color: THEME.sage }}>{fmtINR(totalEstIncome)}/yr</b>
          </span>
          <span>
            {totalEstIncome < passiveGoalAnnual ? (
              <>
                Gap:{" "}
                <b style={{ color: THEME.gold }}>
                  {fmtINR(passiveGoalAnnual - totalEstIncome)}/yr
                </b>{" "}
                to freedom milestone
              </>
            ) : (
              <span style={{ color: THEME.sage, fontWeight: 700 }}>
                🎉 Milestone achieved! Increase target to level up.
              </span>
            )}
          </span>
        </div>
      </Card>

      {/* ── View Switcher & Control Filter Bar ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "6px 0",
        }}
      >
        {/* Navigation Tabs */}
        <div
          style={{
            display: "flex",
            background: "var(--surface-1)",
            padding: 4,
            borderRadius: 14,
            gap: 4,
            border: `1.5px solid ${THEME.line}`,
            flexWrap: "wrap",
          }}
        >
          {[
            { id: "list", label: "List View", icon: List },
            { id: "calendar", label: "Month Calendar", icon: CalendarDays },
            { id: "seasonality", label: "Monthly Seasonality", icon: BarChart3 },
            { id: "mf", label: "MF IDCW Ledger", icon: Landmark },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = viewMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as any)}
                aria-pressed={active}
                aria-label={tab.id === "list" ? "List view" : tab.id === "calendar" ? "Calendar view" : tab.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: active ? "var(--surface-0)" : "transparent",
                  color: active ? THEME.ink : THEME.muted,
                  fontWeight: active ? 800 : 600,
                  fontSize: 12.5,
                  cursor: "pointer",
                  boxShadow: active ? "var(--shadow-sm)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                <Icon size={14} color={active ? THEME.accent : THEME.muted} />
                {tab.label}
                {tab.id === "list" && upcomingExDates.length > 0 && (
                  <span
                    style={{
                      background: THEME.gold,
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "1px 5px",
                      borderRadius: 10,
                    }}
                  >
                    {upcomingExDates.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right Search & Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", position: "relative", alignItems: "center" }}>
            <Search
              size={15}
              color={THEME.muted}
              style={{ position: "absolute", left: 12, pointerEvents: "none" }}
            />
            <input
              type="text"
              aria-label="Search holdings"
              placeholder="Search symbol / fund..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: 200,
                padding: `8px ${searchQuery ? 32 : 12}px 8px 34px`,
                borderRadius: 12,
                border: `1.5px solid ${THEME.line}`,
                background: "var(--surface-0)",
                color: THEME.ink,
                fontSize: 12.5,
                boxShadow: "var(--shadow-sm)",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  border: "none",
                  background: "var(--surface-2)",
                  color: THEME.muted,
                  cursor: "pointer",
                }}
              >
                <X size={11} />
              </button>
            )}
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={14} />}
            onClick={viewMode === "mf" ? handleExportMFCSV : handleExportCSV}
          >
            CSV
          </Button>
        </div>
      </div>

      {/* ── Sub-Filters for Timeline / Holdings in List View ── */}
      {viewMode === "list" && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            marginTop: -8,
          }}
        >
          {/* Timeline timeframe filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11.5, color: THEME.muted, fontWeight: 700 }}>
              Timeline Window:
            </span>
            <div
              style={{
                display: "flex",
                border: `1.5px solid ${THEME.line}`,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {[
                { id: "all", label: "All (±90d)" },
                { id: "7d", label: "7 Days" },
                { id: "30d", label: "30 Days" },
                { id: "90d", label: "90 Days" },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTimelineFilter(f.id as any)}
                  style={{
                    padding: "5px 10px",
                    border: "none",
                    background: timelineFilter === f.id ? "var(--t-accent)" : "var(--surface-0)",
                    color: timelineFilter === f.id ? "#fff" : THEME.muted,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11.5, color: THEME.muted, fontWeight: 700 }}>Filter:</span>
            <div
              style={{
                display: "flex",
                border: `1.5px solid ${THEME.line}`,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {[
                { id: "all", label: "All Holdings" },
                { id: "payers", label: "Payers Only" },
                { id: "highYield", label: "High Yield (>3%)" },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(c.id as any)}
                  style={{
                    padding: "5px 10px",
                    border: "none",
                    background: categoryFilter === c.id ? "var(--t-accent)" : "var(--surface-0)",
                    color: categoryFilter === c.id ? "#fff" : THEME.muted,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 1. LIST VIEW (Upcoming Ex-dates + All Holdings DataTable) ── */}
      {viewMode === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Upcoming Ex-Dates Section */}
          {upcomingExDates.length > 0 ? (
            <Card style={{ padding: 22, border: `1.5px solid ${THEME.line}` }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 15,
                    color: THEME.ink,
                    letterSpacing: "-0.015em",
                  }}
                >
                  Upcoming Ex-dividend Dates
                  <span
                    style={{
                      fontSize: 11,
                      color: THEME.muted,
                      marginLeft: 8,
                      fontWeight: 600,
                    }}
                  >
                    (±90 days)
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {upcomingExDates.map((r) => {
                  const uc = urgencyColor(r.daysToEx);
                  const isPast = (r.daysToEx ?? 0) < 0;
                  const isUrgent = r.daysToEx !== null && r.daysToEx >= 0 && r.daysToEx <= 3;
                  return (
                    <div
                      key={r.key}
                      className="card-lift"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "14px 18px",
                        borderRadius: 14,
                        background: isPast
                          ? "transparent"
                          : isUrgent
                            ? "color-mix(in srgb, var(--t-rust) 5%, transparent)"
                            : "var(--surface-0)",
                        border: `1.5px solid ${
                          isPast
                            ? THEME.line
                            : isUrgent
                              ? "color-mix(in srgb, var(--t-rust) 35%, transparent)"
                              : THEME.line
                        }`,
                        opacity: isPast ? 0.7 : 1,
                        transition: "all 0.2s ease",
                        boxShadow: "var(--shadow-sm)",
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Symbol Logo */}
                      <StockLogo yfSym={r.yfSym} size={44} />

                      {/* Info Details */}
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: 14.5,
                            color: THEME.ink,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          {r.symbol}
                          {r.exchange && (
                            <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>
                              {r.exchange}
                            </span>
                          )}
                          {isUrgent && (
                            <span
                              style={{
                                fontSize: 10,
                                padding: "1.5px 7px",
                                borderRadius: 6,
                                background: THEME.rust,
                                color: "#fff",
                                fontWeight: 800,
                              }}
                            >
                              Action Required
                            </span>
                          )}
                          {r.divYield >= 3 && (
                            <span
                              style={{
                                fontSize: 10,
                                padding: "1.5px 6px",
                                borderRadius: 6,
                                background: "color-mix(in srgb, var(--t-sage) 15%, transparent)",
                                color: THEME.sage,
                                fontWeight: 700,
                              }}
                            >
                              High Yield ({r.divYield.toFixed(1)}%)
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            color: THEME.muted,
                            fontWeight: 500,
                            marginTop: 3,
                          }}
                        >
                          Ex-date: <b style={{ color: THEME.ink }}>{formatDate(r.exDate)}</b>
                          {r.divPayDate && (
                            <>
                              {" "}
                              • Pay Date:{" "}
                              <b style={{ color: THEME.sage }}>{formatDate(r.divPayDate)}</b>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Payout Amounts */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: 14,
                            color: THEME.ink,
                          }}
                        >
                          <Prv>{r.divRate > 0 ? `₹${r.divRate.toFixed(2)}/share` : "—"}</Prv>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: THEME.sage,
                            fontWeight: 700,
                            marginTop: 2,
                          }}
                        >
                          {r.estDivIncome > 0 ? (
                            <>
                              Est. <Money value={r.estDivIncome} variant="exact" />
                            </>
                          ) : (
                            `${r.qty.toLocaleString("en-IN")} shares`
                          )}
                        </div>
                      </div>

                      {/* Urgency Badge */}
                      <div
                        style={{
                          padding: "5px 12px",
                          borderRadius: 8,
                          background: `color-mix(in srgb, ${uc} 12%, transparent)`,
                          color: uc,
                          fontSize: 11.5,
                          fontWeight: 800,
                          minWidth: 60,
                          textAlign: "center",
                          flexShrink: 0,
                        }}
                      >
                        {urgencyLabel(r.daysToEx)}
                      </div>

                      {/* 1-Click Log Payout Button */}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openRecordModal(r, "pay")}
                        style={{ padding: "6px 12px", fontSize: 12, fontWeight: 700 }}
                      >
                        + Record Payout
                      </Button>
                    </div>
                  );
                })}
              </div>
            </Card>
          ) : (
            <Card style={{ padding: 24, border: `1.5px solid ${THEME.line}`, textAlign: "center" }}>
              <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 500 }}>
                No ex-dividend dates in the selected timeframe
                {searchQuery ? ` matching "${searchQuery}"` : ""}.
              </div>
            </Card>
          )}

          {/* All Holdings — Dividend Details Table */}
          {stockRows.length > 0 && (
            <Card style={{ border: `1.5px solid ${THEME.line}` }}>
              <div style={{ padding: 20 }}>
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 15,
                    marginBottom: 16,
                    color: THEME.ink,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    letterSpacing: "-0.015em",
                  }}
                >
                  All Holdings — Dividend Details
                  {!fetched && !loading && (
                    <span
                      style={{
                        fontSize: 11,
                        color: THEME.muted,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <AlertCircle size={13} />
                      Click Refresh to fetch live data
                    </span>
                  )}
                  {loading && (
                    <span
                      style={{
                        fontSize: 11,
                        color: THEME.accent,
                        fontWeight: 600,
                      }}
                    >
                      Loading…
                    </span>
                  )}
                </div>
                <DataTable
                  columns={holdingsColumns}
                  data={tableRows}
                  hideSearch
                  keyExtractor={(r) => r.key}
                  sortKey={sortKey}
                  sortDirection={sortDir}
                  onSortChange={handleSort}
                  emptyState={
                    <p style={{ fontSize: 13, color: THEME.muted, margin: 0 }}>
                      No holdings match "{searchQuery}".
                    </p>
                  }
                />

                {fetched && dividendPayers.length === 0 && (
                  <div
                    style={{
                      padding: "24px 0 8px",
                      textAlign: "center",
                      fontSize: 13,
                      color: THEME.muted,
                      fontWeight: 500,
                    }}
                  >
                    No dividend-paying stocks found. Many Indian growth stocks don't pay dividends — check
                    individual stock profiles for details.
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Mutual fund dividend / IDCW payouts summary inside list mode if present */}
          {mfDividends.length > 0 && (
            <Card style={{ border: `1.5px solid ${THEME.line}` }}>
              <div style={{ padding: 20 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 4,
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
                    <Landmark size={16} color={THEME.accent} />
                    Mutual Fund Dividends / IDCW
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Download size={14} />}
                    onClick={handleExportMFCSV}
                  >
                    CSV
                  </Button>
                </div>
                <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 14 }}>
                  Mutual funds don't have predictable ex-dates like stocks — this is your logged
                  dividend/IDCW payout history. Add or edit records from Investments → Dividends.
                </div>

                <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Gross Received
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 16,
                        fontWeight: 800,
                        color: THEME.ink,
                      }}
                    >
                      <Money value={mfTotals.gross} variant="exact" />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      TDS Deducted
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 16,
                        fontWeight: 800,
                        color: THEME.rust,
                      }}
                    >
                      <Money value={mfTotals.tds} variant="exact" />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      Net Received
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 16,
                        fontWeight: 800,
                        color: THEME.sage,
                      }}
                    >
                      <Money value={mfTotals.gross - mfTotals.tds} variant="exact" />
                    </div>
                  </div>
                </div>

                <DataTable
                  columns={mfColumns}
                  data={mfDividends}
                  hideSearch
                  keyExtractor={(d, idx) => d.id || idx}
                />
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── 2. MONTH CALENDAR GRID VIEW ── */}
      {viewMode === "calendar" && (
        <Card style={{ padding: 22, border: `1.5px solid ${THEME.line}` }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div
              style={{
                fontWeight: 800,
                fontSize: 16,
                color: THEME.ink,
                letterSpacing: "-0.015em",
              }}
            >
              {FULL_MONTH_NAMES[calMonth.getMonth()]} {calMonth.getFullYear()}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                aria-label="Previous month"
                onClick={() =>
                  setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))
                }
                style={navBtnStyle}
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={() => {
                  const d = new Date(todayStr + "T00:00:00");
                  setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1));
                }}
                style={{
                  ...navBtnStyle,
                  width: "auto",
                  padding: "0 12px",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Today
              </button>
              <button
                aria-label="Next month"
                onClick={() =>
                  setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))
                }
                style={navBtnStyle}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 16,
              marginBottom: 14,
              fontSize: 11.5,
              color: THEME.muted,
              fontWeight: 600,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: THEME.rust,
                  display: "inline-block",
                }}
              />
              <b>Ex-Dividend Date</b> (Must own before)
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: THEME.sage,
                  display: "inline-block",
                }}
              />
              <b>Pay Date</b> (Bank credit landing)
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {WEEKDAY_NAMES.map((wd) => (
              <div
                key={wd}
                style={{
                  textAlign: "center",
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  padding: "6px 0",
                }}
              >
                {wd}
              </div>
            ))}
            {calDays.map((dateStr, i) => {
              if (!dateStr) return <div key={`pad-${i}`} />;
              const events = calEventsByDate[dateStr];
              const isToday = dateStr === todayStr;
              const dayNum = Number(dateStr.slice(8, 10));
              const chips = [
                ...(events?.ex || []).map((r) => ({ ...r, kind: "ex" })),
                ...(events?.pay || []).map((r) => ({ ...r, kind: "pay" })),
              ];
              const hasEvents = chips.length > 0;

              return (
                <div
                  key={dateStr}
                  onClick={() => {
                    if (hasEvents) {
                      setSelectedDayEvents({
                        date: dateStr,
                        ex: events?.ex || [],
                        pay: events?.pay || [],
                      });
                    }
                  }}
                  style={{
                    minHeight: 88,
                    borderRadius: 10,
                    border: `1.5px solid ${isToday ? THEME.accent : THEME.line}`,
                    background: isToday
                      ? "color-mix(in srgb, var(--t-accent) 6%, transparent)"
                      : hasEvents
                        ? "color-mix(in srgb, var(--surface-1) 60%, var(--surface-0))"
                        : "var(--surface-0)",
                    padding: "6px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                    cursor: hasEvents ? "pointer" : "default",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11.5,
                      fontWeight: isToday ? 800 : 600,
                      color: isToday ? THEME.accent : THEME.muted,
                    }}
                  >
                    {dayNum}
                  </div>
                  {chips.slice(0, 2).map((c, idx) => (
                    <div
                      key={`${c.key}-${c.kind}-${idx}`}
                      title={`${c.symbol} — ${c.kind === "ex" ? "Ex-date" : "Pay date"}`}
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        padding: "2px 5px",
                        borderRadius: 5,
                        color: c.kind === "ex" ? THEME.rust : THEME.sage,
                        background:
                          c.kind === "ex"
                            ? "color-mix(in srgb, var(--t-rust) 12%, transparent)"
                            : "color-mix(in srgb, var(--t-sage) 12%, transparent)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {c.symbol} ({c.kind === "ex" ? "Ex" : "Pay"})
                    </div>
                  ))}
                  {chips.length > 2 && (
                    <div
                      style={{
                        fontSize: 9.5,
                        color: THEME.muted,
                        fontWeight: 700,
                        paddingLeft: 4,
                      }}
                    >
                      +{chips.length - 2} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── 3. MONTHLY SEASONALITY & CASHFLOW FORECAST ── */}
      {viewMode === "seasonality" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: 22, border: `1.5px solid ${THEME.line}` }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, color: THEME.ink }}>
                  Estimated Monthly Dividend Seasonality
                </div>
                <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                  Cashflow projection based on announced & historical declaration cycles
                </div>
              </div>
              <Badge variant="sage">Total Est: {fmtINR(totalEstIncome)}/yr</Badge>
            </div>

            <div style={{ height: 220, width: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyProjectedSeasonality}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} opacity={0.5} />
                  <XAxis dataKey="month" stroke={THEME.muted} fontSize={11} tickLine={false} />
                  <YAxis
                    stroke={THEME.muted}
                    fontSize={11}
                    tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + "k" : v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-0)",
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 10,
                      boxShadow: "var(--shadow-md)",
                      fontSize: 12,
                    }}
                    formatter={(val: any, name: any, item: any) => [
                      fmtINRExact(Number(val)),
                      `Projected (${item?.payload?.count || 0} stocks)`,
                    ]}
                  />
                  <Bar dataKey="amount" fill={THEME.sage} radius={[6, 6, 0, 0]}>
                    {monthlyProjectedSeasonality.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.amount > 0 ? THEME.sage : "var(--surface-2)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Quarterly Distribution Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
            }}
          >
            {quarterlySeasonality.map((q, idx) => (
              <Card key={q.quarter} style={{ padding: "16px 18px", border: `1.5px solid ${THEME.line}` }}>
                <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                  {q.quarter}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    fontWeight: 800,
                    color: THEME.ink,
                    marginTop: 4,
                  }}
                >
                  <Money value={q.amount} variant="exact" />
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
                  {totalEstIncome > 0
                    ? `${((q.amount / totalEstIncome) * 100).toFixed(1)}% of annual payout`
                    : "—"}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── 4. MUTUAL FUND IDCW & HISTORICAL LEDGER ── */}
      {viewMode === "mf" && (
        <Card style={{ border: `1.5px solid ${THEME.line}` }}>
          <div style={{ padding: 20 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 12,
                marginBottom: 4,
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
                <Landmark size={16} color={THEME.accent} />
                Mutual Fund Dividends / IDCW
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={14} />}
                onClick={handleExportMFCSV}
              >
                CSV
              </Button>
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 16 }}>
              Mutual funds don't have predictable ex-dates like stocks — this is your logged
              dividend/IDCW payout history.
            </div>

            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 18 }}>
              <div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: THEME.muted,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Gross Received
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    fontWeight: 800,
                    color: THEME.ink,
                    marginTop: 2,
                  }}
                >
                  <Money value={mfTotals.gross} variant="exact" />
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: THEME.muted,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  TDS Deducted
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    fontWeight: 800,
                    color: THEME.rust,
                    marginTop: 2,
                  }}
                >
                  <Money value={mfTotals.tds} variant="exact" />
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 10.5,
                    color: THEME.muted,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Net Received
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 18,
                    fontWeight: 800,
                    color: THEME.sage,
                    marginTop: 2,
                  }}
                >
                  <Money value={mfTotals.gross - mfTotals.tds} variant="exact" />
                </div>
              </div>
            </div>

            <DataTable
              columns={mfColumns}
              data={mfDividends}
              hideSearch
              keyExtractor={(d, idx) => d.id || idx}
              emptyState={
                <p style={{ fontSize: 13, color: THEME.muted, margin: "16px 0" }}>
                  No mutual fund IDCW dividends recorded yet.
                </p>
              }
            />
          </div>
        </Card>
      )}

      {/* ── Day Details Modal (when clicked in calendar) ── */}
      {selectedDayEvents && (
        <Modal
          title={`Dividend Events on ${formatDate(selectedDayEvents.date)}`}
          onClose={() => setSelectedDayEvents(null)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "8px 0" }}>
            {selectedDayEvents.ex.length > 0 && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: THEME.rust, marginBottom: 8 }}>
                  Ex-Dividend Dates (Must Own Before Today)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selectedDayEvents.ex.map((item) => (
                    <div
                      key={`modal-ex-${item.key}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: `1px solid ${THEME.line}`,
                        background: "var(--surface-0)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <StockLogo yfSym={item.yfSym} size={32} />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: THEME.ink }}>
                            {item.symbol}
                          </div>
                          <div style={{ fontSize: 11, color: THEME.muted }}>
                            {item.qty} shares • Rate: ₹{item.divRate.toFixed(2)}/sh
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 800, color: THEME.sage, fontSize: 13 }}>
                            <Money value={item.estDivIncome} variant="exact" />
                          </div>
                          <div style={{ fontSize: 10, color: THEME.muted }}>Est. Total</div>
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => openRecordModal(item, "ex")}
                          style={{ padding: "4px 8px", fontSize: 11 }}
                        >
                          + Record
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedDayEvents.pay.length > 0 && (
              <div style={{ marginTop: selectedDayEvents.ex.length > 0 ? 10 : 0 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: THEME.sage, marginBottom: 8 }}>
                  Pay Dates (Cash Landing in Bank)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {selectedDayEvents.pay.map((item) => (
                    <div
                      key={`modal-pay-${item.key}`}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: `1px solid ${THEME.line}`,
                        background: "var(--surface-0)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <StockLogo yfSym={item.yfSym} size={32} />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: THEME.ink }}>
                            {item.symbol}
                          </div>
                          <div style={{ fontSize: 11, color: THEME.muted }}>
                            {item.qty} shares • ₹{item.divRate.toFixed(2)}/sh
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 10 }}>
                        <div>
                          <div style={{ fontWeight: 800, color: THEME.sage, fontSize: 13 }}>
                            <Money value={item.estDivIncome} variant="exact" />
                          </div>
                          <div style={{ fontSize: 10, color: THEME.muted }}>Cash Credit</div>
                        </div>
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => openRecordModal(item, "pay")}
                          style={{ padding: "4px 8px", fontSize: 11 }}
                        >
                          + Record
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ── 1-Click Record to Dividend Ledger Modal ── */}
      {recordModalData.isOpen && (
        <Modal
          title={`Record Dividend — ${recordModalData.symbol}`}
          onClose={() => setRecordModalData((prev) => ({ ...prev, isOpen: false }))}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "8px 0" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Symbol / Company">
                <Input value={recordModalData.symbol} readOnly style={{ opacity: 0.8 }} />
              </Field>
              <Field label="Financial Year">
                <Input
                  value={recordModalData.fy}
                  onChange={(e) =>
                    setRecordModalData((prev) => ({ ...prev, fy: e.target.value }))
                  }
                />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Quantity Held">
                <Input
                  type="number"
                  value={recordModalData.qty}
                  onChange={(e) => {
                    const q = Number(e.target.value);
                    const amt = q * recordModalData.divRate;
                    const tds = amt > 5000 ? Math.round(amt * 0.1) : 0;
                    setRecordModalData((prev) => ({
                      ...prev,
                      qty: q,
                      amount: amt,
                      tds,
                    }));
                  }}
                />
              </Field>
              <Field label="Div Per Share (₹)">
                <Input
                  type="number"
                  step="0.01"
                  value={recordModalData.divRate}
                  onChange={(e) => {
                    const rate = Number(e.target.value);
                    const amt = recordModalData.qty * rate;
                    const tds = amt > 5000 ? Math.round(amt * 0.1) : 0;
                    setRecordModalData((prev) => ({
                      ...prev,
                      divRate: rate,
                      amount: amt,
                      tds,
                    }));
                  }}
                />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Gross Amount (₹)">
                <Input
                  type="number"
                  value={recordModalData.amount}
                  onChange={(e) => {
                    const amt = Number(e.target.value);
                    const tds = amt > 5000 ? Math.round(amt * 0.1) : 0;
                    setRecordModalData((prev) => ({ ...prev, amount: amt, tds }));
                  }}
                />
              </Field>
              <Field label="TDS Deducted (₹) (Sec 194)">
                <Input
                  type="number"
                  value={recordModalData.tds}
                  onChange={(e) =>
                    setRecordModalData((prev) => ({ ...prev, tds: Number(e.target.value) }))
                  }
                />
              </Field>
            </div>

            <Field label="Payment / Credit Date">
              <Input
                type="date"
                value={recordModalData.paymentDate}
                onChange={(e) =>
                  setRecordModalData((prev) => ({ ...prev, paymentDate: e.target.value }))
                }
              />
            </Field>

            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "color-mix(in srgb, var(--t-sage) 10%, transparent)",
                border: "1px solid color-mix(in srgb, var(--t-sage) 20%, transparent)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 700, color: THEME.ink }}>
                Net Cash Landing:
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: THEME.sage }}>
                ₹{(recordModalData.amount - recordModalData.tds).toLocaleString("en-IN")}
              </span>
            </div>

            <ModalActions
              onClose={() => setRecordModalData((prev) => ({ ...prev, isOpen: false }))}
              onSave={handleSaveDividendRecord}
              saveLabel="Record Payout"
              loading={recordModalData.saving}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 30,
  height: 30,
  borderRadius: 8,
  border: `1.5px solid ${THEME.line}`,
  background: "var(--surface-0)",
  color: THEME.ink,
  cursor: "pointer",
};
