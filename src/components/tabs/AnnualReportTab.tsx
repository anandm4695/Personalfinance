/* eslint-disable */
// @ts-nocheck
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  FileText,
  Printer,
  TrendingUp,
  Wallet,
  PiggyBank,
  PieChart as PieIcon,
  Shield,
  Receipt,
  Target,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Landmark,
  BarChart2,
  AlertTriangle,
  Trophy,
  CheckCircle2,
  Unlock,
  Flame,
  Info,
  Download,
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
} from "recharts";
import { THEME, PIE_COLORS } from "../../utils/constants";
import { getCurrentFY } from "../../utils/appConstants";
import { fmtINR, fmtINRFull, today } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { isLongTerm, isEquityMF } from "./CapitalGainsTab";
import { computeNetWorthAsOf } from "../../utils/netWorthAsOf";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";

/* ══════════════════════════════════════════════════════════════════
   HELPERS & PREMIUM CONTROLS
   ══════════════════════════════════════════════════════════════════ */

const getFYDates = (fy: string) => {
  const startYear = parseInt(fy.split("-")[0]);
  return { start: `${startYear}-04-01`, end: `${startYear + 1}-03-31` };
};

const getFYLabel = (fy: string) => {
  const startYear = parseInt(fy.split("-")[0]);
  return `FY ${startYear}-${String(startYear + 1).slice(-2)}`;
};

const MONTH_NAMES = [
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
];

const getFYMonths = (fy: string): string[] => {
  const startYear = parseInt(fy.split("-")[0]);
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const m = ((3 + i) % 12) + 1; // Apr=4 ... Mar=3
    const y = m >= 4 ? startYear : startYear + 1;
    months.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return months;
};

const formatDateReadable = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const printStyles = `@media print {
  @page {
    margin: 15mm 20mm;
    size: A4 portrait;
  }
  body {
    background: #ffffff !important;
    color: #0f172a !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body * { visibility: hidden; }
  .annual-report, .annual-report * { visibility: visible; }
  .annual-report { position: absolute; left: 0; top: 0; width: 100%; font-size: 11px; color: #0f172a !important; background: #ffffff !important; }
  .no-print { display: none !important; }
  .page-break { page-break-before: always; break-before: page; }
  .card-base, .tile-card, .insight-card, .hero-card {
    page-break-inside: avoid;
    break-inside: avoid;
    border: 1px solid #cbd5e1 !important;
    box-shadow: none !important;
    background: #ffffff !important;
    color: #0f172a !important;
  }
  .hero-card {
    background: #f8fafc !important;
    color: #0f172a !important;
    border: 1.5px solid #0f172a !important;
  }
  .hero-card * {
    color: #0f172a !important;
  }
  .recharts-responsive-container {
    width: 100% !important;
    height: auto !important;
  }
}`;

/* ── Tiny sub-components ───────────────────────────────────────── */

const CardHeading = ({ icon: Icon, title, id, color = THEME.accent }: any) => (
  <div
    id={id}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
      scrollMarginTop: 84,
    }}
  >
    <div style={{ display: "flex", alignItems: "center" }}>
      <Icon size={19} style={{ color }} />
    </div>
    <div
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 16,
        fontWeight: 600,
        color: THEME.ink,
        letterSpacing: "-0.005em",
      }}
    >
      {title}
    </div>
  </div>
);

const DataRow = ({ label, value, bold, color }: any) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "10px 0",
      borderBottom: `1px solid ${THEME.line}`,
    }}
  >
    <span style={{ fontSize: 13, color: THEME.muted, fontWeight: bold ? 700 : 500 }}>{label}</span>
    <span
      className="tabular-nums"
      style={{ fontSize: 13, fontWeight: bold ? 700 : 600, color: color || THEME.ink }}
    >
      <Prv>{value}</Prv>
    </span>
  </div>
);

const ProgressBar = ({ pct, color, height = 6 }: any) => (
  <div className="progress-track" style={{ height }}>
    <div
      className="progress-fill"
      style={{
        width: `${Math.min(100, Math.max(0, pct))}%`,
        background: color || THEME.accent,
      }}
    />
  </div>
);

const MetricTile = ({ label, value, sub, color }: any) => (
  <div
    style={{
      padding: "14px 16px",
      background: "var(--surface-0)",
      border: `1px solid ${THEME.line}`,
      borderRadius: 10,
      textAlign: "center",
    }}
  >
    <div
      style={{
        fontSize: 10,
        color: THEME.muted,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 6,
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 20,
        fontWeight: 800,
        color: color || THEME.ink,
        letterSpacing: "-0.03em",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <Prv>{value}</Prv>
    </div>
    {sub && <div style={{ fontSize: 10, color: THEME.muted, marginTop: 4 }}>{sub}</div>}
  </div>
);

const InfoBanner = ({ children }: any) => (
  <div className="info-box info-box-info" style={{ marginBottom: 12, fontSize: 11 }}>
    <Info size={12} style={{ flexShrink: 0, marginTop: 1 }} />
    {children}
  </div>
);

/* ── Premium SVG Sparkline ─────────────────────────────────────── */
const Sparkline = ({
  data,
  color,
  width = 80,
  height = 30,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) => {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }} className="no-print">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

/* ── Premium SVG Circular Progress ────────────────────────────── */
const CircularProgress = ({
  pct,
  color,
  size = 50,
}: {
  pct: number;
  color: string;
  size?: number;
}) => {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, pct)) / 100) * circumference;

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke="var(--surface-2)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="transparent"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.22, 1, 0.36, 1)" }}
      />
    </svg>
  );
};

/* ── Premium Recharts Glass Tooltip ───────────────────────────── */
const GlassTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "color-mix(in srgb, var(--surface-0) 85%, transparent)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: `1.5px solid ${THEME.line}`,
          borderRadius: 12,
          padding: "10px 14px",
          boxShadow:
            "0 8px 30px rgba(0, 0, 0, 0.12), inset 0 1px 0 color-mix(in srgb, var(--t-ink) 6%, transparent)",
          color: THEME.ink,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: THEME.muted,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 6,
          }}
        >
          {label}
        </div>
        {payload.map((item: any, idx: number) => (
          <div
            key={idx}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600 }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: item.color || item.fill,
              }}
            />
            <span style={{ color: THEME.muted }}>{item.name}:</span>
            <span style={{ color: THEME.ink }}>
              <Money value={item.value} variant="full" />
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

/* ── Premium Stat Card with Sparkline ─────────────────────────── */
const PremiumStatCard = ({
  label,
  value,
  sub,
  subColor,
  icon: Icon,
  color,
  sparklineData,
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
      background:
        "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 15%, var(--surface-0)) 100%)",
      border: `1.5px solid ${THEME.line}`,
      borderTop: `4px solid ${color}`,
      borderRadius: 16,
      padding: "20px 22px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      boxShadow:
        "0 4px 20px -2px rgba(0, 0, 0, 0.02), inset 0 1px 0 color-mix(in srgb, var(--t-ink) 4%, transparent)",
      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      position: "relative",
      overflow: "hidden",
    }}
  >
    <div
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", color: color, flexShrink: 0 }}>
          <Icon size={24} />
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

      {sparklineData && sparklineData.length >= 2 && (
        <div style={{ opacity: 0.85, marginRight: 4 }} className="no-print">
          <Sparkline data={sparklineData} color={color} />
        </div>
      )}
    </div>

    <div
      style={{
        fontSize: 28,
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

/* ══════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════ */

export const AnnualReportTab = ({ state, metrics, marketData, activeProfile = "all" }: any) => {
  const { privacyMode } = usePrivacy();
  // ── Inject print styles ────────────────────────────────────────
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "annual-report-print";
    style.textContent = printStyles;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  // ── FY selection ───────────────────────────────────────────────
  const availableFYs = useMemo(() => {
    const fySet = new Set<number>();
    const addDate = (d: string) => {
      if (!d) return;
      const dt = new Date(d + "T00:00:00");
      const yr = dt.getMonth() >= 3 ? dt.getFullYear() : dt.getFullYear() - 1;
      fySet.add(yr);
    };
    (state.income || []).forEach((i: any) => addDate(i.date));
    (state.transactions || []).forEach((t: any) => addDate(t.date));
    (state.netWorthHistory || []).forEach((h: any) => {
      if (h.month) {
        const [y, m] = h.month.split("-").map(Number);
        fySet.add(m >= 4 ? y : y - 1);
      }
    });
    // Also scan investment/tax/loan activity dates — a FY where the user only bought stocks/MFs
    // or paid tax, without logging any income/transaction/net-worth entry, previously had no way
    // to appear in this picker at all (its data was invisible and unreachable in the report).
    (state.stocks || []).forEach((s: any) => addDate(s.buyDate));
    (state.mutualFunds || []).forEach((m: any) => addDate(m.buyDate));
    (state.fixedDeposits || []).forEach((fd: any) => addDate(fd.startDate));
    (state.taxPayments || []).forEach((p: any) => addDate(p.date));
    const now = new Date();
    const currentFYStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    fySet.add(currentFYStart);
    if (currentFYStart > 0) fySet.add(currentFYStart - 1);
    return Array.from(fySet)
      .sort((a, b) => b - a)
      .map((y) => `${y}-${String(y + 1).slice(-2)}`);
  }, [
    state.income,
    state.transactions,
    state.netWorthHistory,
    state.stocks,
    state.mutualFunds,
    state.fixedDeposits,
    state.taxPayments,
  ]);

  const [selectedFY, setSelectedFY] = useState(availableFYs[0] || getCurrentFY());
  const { start: fyStart, end: fyEnd } = getFYDates(selectedFY);
  const fyLabel = getFYLabel(selectedFY);
  const fyMonths = getFYMonths(selectedFY);
  const fyStartYear = parseInt(selectedFY.split("-")[0]);

  const fyMonthsElapsed = useMemo(() => {
    const todayStr = today();
    const todayYM = todayStr.slice(0, 7);
    const startYM = fyStart.slice(0, 7);
    const endYM = fyEnd.slice(0, 7);
    if (todayYM < startYM) return 0;
    if (todayYM > endYM) return 12;
    const curMonth = parseInt(todayYM.slice(5, 7));
    const curYear = parseInt(todayYM.slice(0, 4));
    const sMonth = parseInt(startYM.slice(5, 7));
    const sYear = parseInt(startYM.slice(0, 4));
    return (curYear - sYear) * 12 + (curMonth - sMonth) + 1;
  }, [fyStart, fyEnd]);

  const isPastFY = fyMonthsElapsed >= 12 || today().slice(0, 7) > fyEnd.slice(0, 7);

  const prevFY = `${fyStartYear - 1}-${String(fyStartYear).slice(-2)}`;
  const { start: prevFyStart, end: prevFyEnd } = getFYDates(prevFY);

  // States for dynamic donut hover effects
  const [hoveredExpense, setHoveredExpense] = useState<{ name: string; value: number } | null>(
    null
  );
  const [hoveredAsset, setHoveredAsset] = useState<{ name: string; value: number } | null>(null);

  // ── Scrollspy active navigation tracking ───────────────────────
  const [activeSection, setActiveSection] = useState("nw");

  const hasAnyData = useMemo(() => {
    const incomeLedger = (state.income || []).filter(
      (i: any) => i.date && i.date >= fyStart && i.date <= fyEnd
    );
    const creditTxns = (state.transactions || []).filter(
      (t: any) => t.date && t.date >= fyStart && t.date <= fyEnd && t.type === "credit"
    );
    const debitTxns = (state.transactions || []).filter(
      (t: any) => t.date && t.date >= fyStart && t.date <= fyEnd && t.type === "debit"
    );
    // Also treat investment/tax activity dated within the FY as "data" — otherwise a year where
    // the user only bought stocks/MFs/FDs or paid tax (without logging income/transactions) fell
    // through to the "No Data" empty state even though there was real activity to report.
    const hasInvestmentActivity =
      (state.stocks || []).some((s: any) => s.buyDate && s.buyDate >= fyStart && s.buyDate <= fyEnd) ||
      (state.mutualFunds || []).some(
        (m: any) => m.buyDate && m.buyDate >= fyStart && m.buyDate <= fyEnd
      ) ||
      (state.fixedDeposits || []).some(
        (fd: any) => fd.startDate && fd.startDate >= fyStart && fd.startDate <= fyEnd
      ) ||
      (state.taxPayments || []).some(
        (p: any) => p.date && p.date >= fyStart && p.date <= fyEnd
      );
    return (
      incomeLedger.length > 0 ||
      creditTxns.length > 0 ||
      debitTxns.length > 0 ||
      hasInvestmentActivity ||
      (state.netWorthHistory || []).length > 0
    );
  }, [
    state.income,
    state.transactions,
    state.netWorthHistory,
    state.stocks,
    state.mutualFunds,
    state.fixedDeposits,
    state.taxPayments,
    fyStart,
    fyEnd,
  ]);

  useEffect(() => {
    if (!hasAnyData) return;
    const sections = [
      "nw",
      "income",
      "expense",
      "savings",
      "allocation",
      "debt",
      "insurance",
      "tax",
      "goals",
      "highlights",
      "health",
    ];

    const observerOptions = {
      root: null,
      rootMargin: "-25% 0px -55% 0px",
      threshold: 0,
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      sections.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.unobserve(el);
      });
    };
  }, [hasAnyData, selectedFY]);

  /* ═══════════════════════════════════════════════════════════════
     (a) NET WORTH SUMMARY
     ═══════════════════════════════════════════════════════════════ */
  // Reconstruct a month's net worth from each asset's own dated records (same helper
  // NetWorthTimelineTab/MonthlyReportModal use) instead of ONLY reading frozen monthly
  // snapshots. Two real gaps in the old snapshot-only approach:
  // 1. `getFilteredStateForProfile` (useMetrics.ts) always returns `netWorthHistory: []` for
  //    any profile other than "All" — there is no per-family-member snapshot to read, so the
  //    entire Net Worth section (and this chart) silently showed ₹0 / stayed empty whenever a
  //    specific family member was selected via the header's profile switcher.
  // 2. The snapshot is only ever written for whichever month the app happened to be open in
  //    (App.tsx's debounced auto-snapshot effect) — any month you didn't open the app leaves a
  //    permanent gap, and the old code's `.filter(d => d.value > 0)` silently dropped those
  //    months from the chart, compressing the x-axis and distorting the visible trend/slope.
  // For "All" + a month with a real recorded snapshot, still prefer that snapshot — it captured
  // the actual historical stock/MF/gold price at the time, which computeNetWorthAsOf can't
  // (it always reconstructs holdings at TODAY's price, per its own documented limitation).
  // Hoisted out of netWorthData so the Year-over-Year comparison section below can reuse the
  // exact same reconstruction instead of duplicating it (and risking the two figures diverging).
  const nwForMonth = useCallback(
    (ym: string): number => {
      const todayYM = today().slice(0, 7);
      if (ym > todayYM) return 0; // can't reconstruct a month that hasn't happened yet
      if (activeProfile === "all") {
        const entry = (state.netWorthHistory || [])
          .filter((h: any) => h.month)
          .find((h: any) => h.month === ym);
        if (entry) return Number(entry.netWorth || 0);
      }
      return computeNetWorthAsOf(state, ym, marketData, activeProfile).netWorth;
    },
    [state, marketData, activeProfile]
  );

  const netWorthData = useMemo(() => {
    const aprilKey = `${fyStartYear}-04`;
    const marchKey = `${fyStartYear + 1}-03`;
    const openingMarchKey = `${fyStartYear}-03`; // last month of the PREVIOUS FY = opening balance of this FY
    const todayYM = today().slice(0, 7);
    const isCurrentFY = todayYM >= aprilKey && todayYM <= marchKey;

    const openingNW = nwForMonth(openingMarchKey);
    const closingNW =
      isCurrentFY && metrics.netWorth > 0 ? metrics.netWorth : nwForMonth(marchKey);

    const change = closingNW - openingNW;
    const changePct =
      openingNW !== 0 ? (change / Math.abs(openingNW)) * 100 : closingNW > 0 ? 100 : 0;

    const chartData = fyMonths
      .map((ym, idx) => {
        let nw = ym === todayYM && metrics.netWorth > 0 ? metrics.netWorth : nwForMonth(ym);
        return { month: MONTH_NAMES[idx], value: nw };
      })
      .filter((d) => d.value > 0);

    return { openingNW, closingNW, change, changePct, chartData, isCurrentFY };
  }, [
    nwForMonth,
    metrics.netWorth,
    selectedFY,
    fyMonths,
    fyStartYear,
  ]);

  /* ═══════════════════════════════════════════════════════════════
     (b) INCOME SUMMARY
     ═══════════════════════════════════════════════════════════════ */
  const incomeData = useMemo(() => {
    const incomeLedger = (state.income || []).filter(
      (i: any) => i.date && i.date >= fyStart && i.date <= fyEnd
    );
    const ledgerTotal = incomeLedger.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);

    // Exclude internal transfers between the user's own accounts — same treatment as
    // useMetrics.ts/BanksTab's dashboard KPIs/MonthlyReportModal. Without this, every
    // self-transfer inflated the FY Income total here and polluted the category
    // breakdown with a fake "Transfer" income source.
    const creditTxns = (state.transactions || []).filter(
      (t: any) =>
        t.date &&
        t.date >= fyStart &&
        t.date <= fyEnd &&
        t.type === "credit" &&
        t.category !== "Transfer" &&
        t.category !== "Self Transfer" &&
        t.category !== "Self-Transfer"
    );
    const creditTotal = creditTxns.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

    const totalIncome = ledgerTotal > 0 ? ledgerTotal : creditTotal;
    const sourceEntries = ledgerTotal > 0 ? incomeLedger : creditTxns;

    const catMap: Record<string, number> = {};
    sourceEntries.forEach((e: any) => {
      const cat = e.category || e.source || "Other";
      catMap[cat] = (catMap[cat] || 0) + Number(e.amount || 0);
    });
    const breakdown = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const monthlyMap: Record<string, number> = {};
    sourceEntries.forEach((e: any) => {
      if (e.date) {
        const ym = e.date.slice(0, 7);
        monthlyMap[ym] = (monthlyMap[ym] || 0) + Number(e.amount || 0);
      }
    });
    const monthlyChart = fyMonths.map((ym, idx) => ({
      month: MONTH_NAMES[idx],
      income: monthlyMap[ym] || 0,
    }));

    const rentalReceiptsInFY = (state.rentalProperties || []).flatMap(
      (p: any) => (p.receipts || []).filter((r: any) => r.date && r.date >= fyStart && r.date <= fyEnd)
    );
    // Receipts auto-posted by linking a bank "Rent" credit transaction (BanksTab's
    // getLinkConfig) always get id `bank-${txnId}` (see BanksTab.tsx's applyLinkedTxn) and are
    // already present in creditTxns as that same transaction. Only exclude them when totalIncome
    // is actually built from creditTxns (the ledgerTotal===0 branch) — when it's built from the
    // separate income ledger instead, transactions never contributed to totalIncome at all, so
    // every receipt (bank-linked or not) is genuinely additional there.
    const rentalIncome = (
      ledgerTotal > 0
        ? rentalReceiptsInFY
        : rentalReceiptsInFY.filter((r: any) => !String(r.id || "").startsWith("bank-"))
    ).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    if (rentalIncome > 0) {
      catMap["Rental Income"] = rentalIncome;
      breakdown.push({ name: "Rental Income", value: rentalIncome });
      breakdown.sort((a, b) => b.value - a.value);
    }

    return { totalIncome: totalIncome + rentalIncome, breakdown, monthlyChart };
  }, [
    state.income,
    state.transactions,
    state.rentalProperties,
    selectedFY,
    fyStart,
    fyEnd,
    fyMonths,
  ]);

  /* ═══════════════════════════════════════════════════════════════
     (c) EXPENSE SUMMARY
     ═══════════════════════════════════════════════════════════════ */
  const expenseData = useMemo(() => {
    // Same Transfer exclusion as incomeData's creditTxns above — a self-transfer out of
    // one of the user's own accounts is not real spending.
    const debitTxns = (state.transactions || []).filter(
      (t: any) =>
        t.date &&
        t.date >= fyStart &&
        t.date <= fyEnd &&
        t.type === "debit" &&
        t.category !== "Transfer" &&
        t.category !== "Self Transfer" &&
        t.category !== "Self-Transfer"
    );
    const txnExpense = debitTxns.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

    // Exclude bank-linked payments (id `bank-${txnId}`, stamped by BanksTab's applyLinkedTxn) —
    // those are already counted inside debitTxns/txnExpense as the underlying "Rent" transaction,
    // so including them here again double-counted every bank-paid rent instalment.
    const rentPaid = (state.rentedProperties || []).reduce(
      (sum: number, p: any) =>
        sum +
        (p.payments || [])
          .filter(
            (pay: any) =>
              pay.date &&
              pay.date >= fyStart &&
              pay.date <= fyEnd &&
              !String(pay.id || "").startsWith("bank-")
          )
          .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0),
      0
    );

    const totalExpense = txnExpense + rentPaid;

    const catMap: Record<string, number> = {};
    debitTxns.forEach((t: any) => {
      const cat = t.category || "Uncategorized";
      catMap[cat] = (catMap[cat] || 0) + Number(t.amount || 0);
    });
    if (rentPaid > 0) {
      catMap["Rent"] = (catMap["Rent"] || 0) + rentPaid;
    }
    const breakdown = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const top5 = breakdown.slice(0, 5);

    const monthlyMap: Record<string, number> = {};
    debitTxns.forEach((t: any) => {
      if (t.date) {
        const ym = t.date.slice(0, 7);
        monthlyMap[ym] = (monthlyMap[ym] || 0) + Number(t.amount || 0);
      }
    });
    (state.rentedProperties || []).forEach((p: any) => {
      (p.payments || [])
        .filter(
          (pay: any) =>
            pay.date &&
            pay.date >= fyStart &&
            pay.date <= fyEnd &&
            !String(pay.id || "").startsWith("bank-")
        )
        .forEach((pay: any) => {
          const ym = pay.date.slice(0, 7);
          monthlyMap[ym] = (monthlyMap[ym] || 0) + Number(pay.amount || 0);
        });
    });

    const divisor = fyMonthsElapsed || 1;
    const avgMonthly = totalExpense / divisor;

    const highestExpense =
      debitTxns.length > 0
        ? debitTxns.reduce(
            (max: any, t: any) => (Number(t.amount || 0) > Number(max.amount || 0) ? t : max),
            debitTxns[0]
          )
        : null;

    return { totalExpense, breakdown, top5, avgMonthly, highestExpense, monthlyMap };
  }, [state.transactions, state.rentedProperties, selectedFY, fyStart, fyEnd, fyMonthsElapsed]);

  /* ═══════════════════════════════════════════════════════════════
     (d) SAVINGS & INVESTMENT
     ═══════════════════════════════════════════════════════════════ */
  const savingsData = useMemo(() => {
    const savings = incomeData.totalIncome - expenseData.totalExpense;
    const savingsRate = incomeData.totalIncome > 0 ? (savings / incomeData.totalIncome) * 100 : 0;

    const stockBuys = (state.stocks || [])
      .filter((s: any) => s.buyDate && s.buyDate >= fyStart && s.buyDate <= fyEnd)
      .reduce(
        (sum: number, s: any) => sum + Number(s.invested || (s.avgPrice || 0) * (s.qty || 0) || 0),
        0
      );

    const mfBuys = (state.mutualFunds || [])
      .filter((m: any) => m.buyDate && m.buyDate >= fyStart && m.buyDate <= fyEnd)
      .reduce((sum: number, m: any) => sum + Number(m.invested || m.investedValue || 0), 0);

    const fdAdds = (state.fixedDeposits || [])
      .filter((fd: any) => fd.startDate && fd.startDate >= fyStart && fd.startDate <= fyEnd)
      .reduce((sum: number, fd: any) => sum + Number(fd.principal || 0), 0);

    const ppfAdds = (state.ppfLedger || [])
      .filter((t: any) => t.date && t.date >= fyStart && t.date <= fyEnd && t.type !== "withdrawal")
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

    const sipTotal =
      (state.sips || []).reduce((s: number, sip: any) => s + Number(sip.amount || 0), 0) * 12;

    const totalNewInvestments = stockBuys + mfBuys + fdAdds + ppfAdds;

    // stockSells/mfSells records store the realized gain in `profit` (set at sell time by
    // DematTab/InvestmentsTab's sell modals) plus qty/buyPrice/sellPrice or units/buyNav/sellNav —
    // there is no `sellAmount`/`invested` field on these records at all, so the previous
    // `Number(s.sellAmount||0) - Number(s.invested||0)` always evaluated to 0 - 0 = 0, meaning
    // STCG/LTCG here always showed ₹0 regardless of actual realized gains. Also switched the
    // naive "> 365 days" split for a naive day-diff to isLongTerm()'s Section 2(42A)
    // anniversary rule (12mo equity, 36mo pre-Apr-2023 debt MF, always-STCG post-Apr-2023 debt
    // MF) to match CapitalGainsTab/TaxVaultTab's classification exactly.
    const stockSellsInFY = (state.stockSells || []).filter(
      (s: any) => s.sellDate && s.sellDate >= fyStart && s.sellDate <= fyEnd
    );
    let stcg = 0;
    let ltcg = 0;
    stockSellsInFY.forEach((s: any) => {
      const gain =
        s.profit != null
          ? Number(s.profit)
          : (Number(s.sellPrice || 0) - Number(s.buyPrice || 0)) * Number(s.qty || 0);
      if (isLongTerm(s.buyDate, s.sellDate, 12)) ltcg += gain;
      else stcg += gain;
    });

    const mfSellsInFY = (state.mfSells || []).filter(
      (s: any) => s.sellDate && s.sellDate >= fyStart && s.sellDate <= fyEnd
    );
    let mfStcg = 0;
    let mfLtcg = 0;
    mfSellsInFY.forEach((m: any) => {
      const gain =
        m.profit != null
          ? Number(m.profit)
          : (Number(m.sellNav || 0) - Number(m.buyNav || 0)) * Number(m.units || 0);
      let long: boolean;
      if (isEquityMF(m)) {
        long = isLongTerm(m.buyDate, m.sellDate, 12);
      } else {
        const buyDate = new Date(m.buyDate);
        const postApr2023 = buyDate >= new Date(2023, 3, 1);
        long = postApr2023 ? false : isLongTerm(m.buyDate, m.sellDate, 36);
      }
      if (long) mfLtcg += gain;
      else mfStcg += gain;
    });

    return {
      savings,
      savingsRate,
      stockBuys,
      mfBuys,
      fdAdds,
      ppfAdds,
      sipTotal,
      totalNewInvestments,
      stcg: stcg + mfStcg,
      ltcg: ltcg + mfLtcg,
    };
  }, [
    incomeData,
    expenseData,
    state.stocks,
    state.mutualFunds,
    state.fixedDeposits,
    state.ppfLedger,
    state.sips,
    state.stockSells,
    state.mfSells,
    selectedFY,
    fyStart,
    fyEnd,
  ]);

  // Compute monthly savings trend for sparkline
  const monthlySavingsTrend = useMemo(() => {
    return fyMonths.map((ym) => {
      const inc =
        incomeData.monthlyChart.find((d) => {
          return d.month === MONTH_NAMES[getFYMonths(selectedFY).indexOf(ym)];
        })?.income || 0;
      const exp = expenseData.monthlyMap[ym] || 0;
      return inc - exp;
    });
  }, [selectedFY, incomeData.monthlyChart, expenseData.monthlyMap, fyMonths]);

  /* ═══════════════════════════════════════════════════════════════
     YEAR-OVER-YEAR COMPARISON — same income/expense rules as (b)/(c) above,
     applied to the FY immediately before the selected one.
     ═══════════════════════════════════════════════════════════════ */
  const yoyData = useMemo(() => {
    const isTransfer = (cat: string) =>
      cat === "Transfer" || cat === "Self Transfer" || cat === "Self-Transfer";

    const prevIncomeLedger = (state.income || []).filter(
      (i: any) => i.date && i.date >= prevFyStart && i.date <= prevFyEnd
    );
    const prevLedgerTotal = prevIncomeLedger.reduce(
      (s: number, i: any) => s + Number(i.amount || 0),
      0
    );
    const prevCreditTxns = (state.transactions || []).filter(
      (t: any) =>
        t.date &&
        t.date >= prevFyStart &&
        t.date <= prevFyEnd &&
        t.type === "credit" &&
        !isTransfer(t.category)
    );
    const prevCreditTotal = prevCreditTxns.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

    const prevRentalReceipts = (state.rentalProperties || []).flatMap((p: any) =>
      (p.receipts || []).filter((r: any) => r.date && r.date >= prevFyStart && r.date <= prevFyEnd)
    );
    const prevRentalIncome = (
      prevLedgerTotal > 0
        ? prevRentalReceipts
        : prevRentalReceipts.filter((r: any) => !String(r.id || "").startsWith("bank-"))
    ).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

    const prevIncome = (prevLedgerTotal > 0 ? prevLedgerTotal : prevCreditTotal) + prevRentalIncome;

    const prevDebitTxns = (state.transactions || []).filter(
      (t: any) =>
        t.date && t.date >= prevFyStart && t.date <= prevFyEnd && t.type === "debit" && !isTransfer(t.category)
    );
    const prevTxnExpense = prevDebitTxns.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const prevRentPaid = (state.rentedProperties || []).reduce(
      (sum: number, p: any) =>
        sum +
        (p.payments || [])
          .filter(
            (pay: any) =>
              pay.date &&
              pay.date >= prevFyStart &&
              pay.date <= prevFyEnd &&
              !String(pay.id || "").startsWith("bank-")
          )
          .reduce((s: number, pay: any) => s + Number(pay.amount || 0), 0),
      0
    );
    const prevExpense = prevTxnExpense + prevRentPaid;

    // The previous FY's closing net worth is, by definition, this FY's opening net worth —
    // reuse it instead of recomputing, so the two figures can never drift apart.
    const prevClosingNW = netWorthData.openingNW;
    const prevOpeningNW = nwForMonth(`${fyStartYear - 1}-03`);
    const prevNWChange = prevClosingNW - prevOpeningNW;

    const hasPrevData =
      prevIncomeLedger.length > 0 || prevCreditTxns.length > 0 || prevDebitTxns.length > 0;

    const pctDelta = (curr: number, prev: number) =>
      prev !== 0 ? ((curr - prev) / Math.abs(prev)) * 100 : curr > 0 ? 100 : 0;

    return {
      hasPrevData,
      prevIncome,
      prevExpense,
      prevSavings: prevIncome - prevExpense,
      prevNWChange,
      incomeDeltaPct: pctDelta(incomeData.totalIncome, prevIncome),
      expenseDeltaPct: pctDelta(expenseData.totalExpense, prevExpense),
      savingsDeltaPct: pctDelta(savingsData.savings, prevIncome - prevExpense),
      nwChangeDeltaPct: pctDelta(netWorthData.change, prevNWChange),
    };
  }, [
    state.income,
    state.transactions,
    state.rentalProperties,
    state.rentedProperties,
    prevFyStart,
    prevFyEnd,
    fyStartYear,
    nwForMonth,
    netWorthData.openingNW,
    netWorthData.change,
    incomeData.totalIncome,
    expenseData.totalExpense,
    savingsData.savings,
  ]);

  /* ═══════════════════════════════════════════════════════════════
     (e) ASSET ALLOCATION
     ═══════════════════════════════════════════════════════════════ */
  const assetAllocation = useMemo(() => {
    const equityMFValue = (state.mutualFunds || [])
      .filter((m: any) => {
        const cat = (m.category || m.type || "").toLowerCase();
        return (
          !cat ||
          [
            "equity",
            "elss",
            "flexi",
            "large",
            "mid",
            "small",
            "multi",
            "focused",
            "sectoral",
            "thematic",
            "index",
          ].some((k) => cat.includes(k))
        );
      })
      .reduce(
        (s: number, m: any) => s + Number(m.units || 0) * Number(m.currentNav || m.buyNav || 0),
        0
      );
    const debtMFValue = (state.mutualFunds || [])
      .filter((m: any) => {
        const cat = (m.category || m.type || "").toLowerCase();
        return (
          cat &&
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
          ].some((k) => cat.includes(k))
        );
      })
      .reduce(
        (s: number, m: any) => s + Number(m.units || 0) * Number(m.currentNav || m.buyNav || 0),
        0
      );

    const equity = (metrics.stockValue || 0) + equityMFValue;
    const debt =
      (metrics.fdValue || 0) +
      (metrics.rdValue || 0) +
      (metrics.bondValue || 0) +
      (metrics.ppfValue || 0) +
      (metrics.npsValue || 0) +
      (metrics.epfValue || 0) +
      (metrics.licValue || 0) +
      (metrics.investmentValue || 0) +
      debtMFValue;
    const cash = metrics.cashInBanks || 0;
    const realEstate = (metrics.realEstateAsset || 0) + (metrics.rentalPropertiesAsset || 0);
    const gold = metrics.goldValue || 0;
    const others = (metrics.vehicleAsset || 0) + (metrics.informalLentValue || 0);

    const alloc = [
      { name: "Equity", value: Math.round(equity) },
      { name: "Debt", value: Math.round(debt) },
      { name: "Cash", value: Math.round(cash) },
      { name: "Real Estate", value: Math.round(realEstate) },
      { name: "Gold", value: Math.round(gold) },
      { name: "Others", value: Math.round(others) },
    ].filter((a) => a.value > 0);

    const total = alloc.reduce((s, a) => s + a.value, 0);

    return { alloc, total };
  }, [metrics, state.mutualFunds]);

  /* ═══════════════════════════════════════════════════════════════
     (f) DEBT SUMMARY
     ═══════════════════════════════════════════════════════════════ */
  const debtData = useMemo(() => {
    const loans = state.loansTaken || [];
    const totalOutstanding = loans.reduce((s: number, l: any) => s + Number(l.outstanding || 0), 0);
    const totalPrincipal = loans.reduce((s: number, l: any) => s + Number(l.principal || 0), 0);
    const totalEMI = loans.reduce((s: number, l: any) => s + Number(l.emi || 0), 0);
    const annualEMI = totalEMI * 12;

    // Weight each loan's own outstanding balance by its own rate, rather than applying a
    // simple (unweighted) average rate across ALL loans to the POOLED outstanding total —
    // that previous approach misallocated interest whenever loans had different balances
    // (e.g. a small high-rate personal loan skewed the "average" applied to a much larger
    // low-rate home loan's balance too).
    const interestPortion = loans.reduce(
      (s: number, l: any) =>
        s + Number(l.outstanding || 0) * (Number(l.interestRate || l.rate || 0) / 100),
      0
    );
    const principalRepaid = Math.max(0, annualEMI - interestPortion);

    const ccOutstanding = (state.creditCards || []).reduce(
      (s: number, c: any) => s + Number(c.outstanding || 0),
      0
    );

    return {
      loanCount: loans.length,
      totalOutstanding,
      totalPrincipal,
      totalEMI,
      annualEMI,
      principalRepaid,
      interestPortion,
      ccOutstanding,
    };
  }, [state.loansTaken, state.creditCards]);

  /* ═══════════════════════════════════════════════════════════════
     (g) INSURANCE COVERAGE
     ═══════════════════════════════════════════════════════════════ */
  const insuranceData = useMemo(() => {
    const licPolicies = state.lic || [];
    const termPlans = state.termPlans || [];
    const investPlans = state.investmentPlans || [];

    const licCover = licPolicies.reduce((s: number, p: any) => s + Number(p.sumAssured || 0), 0);
    const termCover = termPlans.reduce((s: number, p: any) => s + Number(p.coverAmount || 0), 0);
    const totalLifeCover = licCover + termCover;

    const licPremiums = licPolicies.reduce((s: number, p: any) => {
      const txnPremium = (p.transactions || [])
        .filter((t: any) => t.date && t.date >= fyStart && t.date <= fyEnd)
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      return s + (txnPremium > 0 ? txnPremium : Number(p.annualPremium || 0));
    }, 0);

    const termPremiums = termPlans.reduce(
      (s: number, p: any) => s + Number(p.annualPremium || p.premium || 0),
      0
    );
    const investPremiums = investPlans.reduce(
      (s: number, p: any) => s + Number(p.annualPremium || p.premium || 0),
      0
    );
    const totalPremiums = licPremiums + termPremiums + investPremiums;

    const adequacyRatio = incomeData.totalIncome > 0 ? totalLifeCover / incomeData.totalIncome : 0;

    return {
      licCount: licPolicies.length,
      termCount: termPlans.length,
      totalLifeCover,
      totalPremiums,
      adequacyRatio,
    };
  }, [
    state.lic,
    state.termPlans,
    state.investmentPlans,
    incomeData.totalIncome,
    selectedFY,
    fyStart,
    fyEnd,
  ]);

  /* ═══════════════════════════════════════════════════════════════
     (h) TAX SUMMARY
     ═══════════════════════════════════════════════════════════════ */
  const taxData = useMemo(() => {
    const payments = (state.taxPayments || []).filter(
      (p: any) => p.date && p.date >= fyStart && p.date <= fyEnd
    );

    const totalTaxPaid = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    const byType: Record<string, number> = {};
    payments.forEach((p: any) => {
      const t = p.type || "Other";
      byType[t] = (byType[t] || 0) + Number(p.amount || 0);
    });

    const regime = state.profile?.regime || "new";
    const effectiveRate =
      incomeData.totalIncome > 0 ? (totalTaxPaid / incomeData.totalIncome) * 100 : 0;

    return { totalTaxPaid, byType, regime, effectiveRate, paymentCount: payments.length };
  }, [
    state.taxPayments,
    state.profile?.regime,
    incomeData.totalIncome,
    selectedFY,
    fyStart,
    fyEnd,
  ]);

  /* ═══════════════════════════════════════════════════════════════
     (i) GOALS PROGRESS
     ═══════════════════════════════════════════════════════════════ */
  const goalsData = useMemo(() => {
    const goals = state.goals || [];
    const totalGoals = goals.length;
    const completed = goals.filter((g: any) => {
      const target = Number(g.targetAmount || g.target || 0);
      const saved = Number(g.savedAmount || g.currentAmount || g.saved || 0);
      return target > 0 && saved >= target;
    }).length;

    const topGoals = goals.slice(0, 5).map((g: any) => {
      const target = Number(g.targetAmount || g.target || 0);
      const saved = Number(g.savedAmount || g.currentAmount || g.saved || 0);
      const pct = target > 0 ? Math.min((saved / target) * 100, 100) : 0;
      return { name: g.name || g.goalName || "Goal", target, saved, pct };
    });

    const overallPct =
      metrics.totalGoalTarget > 0
        ? Math.min((metrics.totalGoalSaved / metrics.totalGoalTarget) * 100, 100)
        : 0;

    return { totalGoals, completed, topGoals, overallPct };
  }, [state.goals, metrics.totalGoalTarget, metrics.totalGoalSaved]);

  /* ═══════════════════════════════════════════════════════════════
     (j) KEY HIGHLIGHTS
     ═══════════════════════════════════════════════════════════════ */
  const highlights = useMemo(() => {
    const items: { icon: any; text: string; color: string }[] = [];

    if (expenseData.highestExpense) {
      const e = expenseData.highestExpense;
      items.push({
        icon: Receipt,
        text: (
          <>
            Highest single expense: <Money value={e.amount} variant="full" /> —{" "}
            {e.note || e.category || "Transaction"} ({e.date || ""})
          </>
        ),
        color: THEME.rust,
      });
    }

    const allInvestments: { amount: number; name: string }[] = [];
    (state.stocks || [])
      .filter((s: any) => s.buyDate && s.buyDate >= fyStart && s.buyDate <= fyEnd)
      .forEach((s: any) =>
        allInvestments.push({
          amount: Number(s.invested || (s.avgPrice || 0) * (s.qty || 0) || 0),
          name: s.name || s.symbol || "Stock",
        })
      );
    (state.mutualFunds || [])
      .filter((m: any) => m.buyDate && m.buyDate >= fyStart && m.buyDate <= fyEnd)
      .forEach((m: any) =>
        allInvestments.push({
          amount: Number(m.invested || m.investedValue || 0),
          name: m.name || m.scheme || "MF",
        })
      );
    (state.fixedDeposits || [])
      .filter((fd: any) => fd.startDate && fd.startDate >= fyStart && fd.startDate <= fyEnd)
      .forEach((fd: any) =>
        allInvestments.push({
          amount: Number(fd.principal || 0),
          name: `FD at ${fd.bank || "Bank"}`,
        })
      );

    if (allInvestments.length > 0) {
      const largest = allInvestments.reduce(
        (max, i) => (i.amount > max.amount ? i : max),
        allInvestments[0]
      );
      items.push({
        icon: TrendingUp,
        text: (
          <>
            Largest investment: <Money value={largest.amount} variant="full" /> in {largest.name}
          </>
        ),
        color: THEME.sage,
      });
    }

    const stockPnLs = (state.stocks || []).map((s: any) => {
      const invested = Number(s.invested || (s.avgPrice || 0) * (s.qty || 0) || 0);
      // Stock records have no `currentValue`/`ltp` field — the real field is `currentPrice`
      // (this component has no live marketData feed, unlike useMetrics.ts's stockValue calc).
      // The old `s.ltp * (s.qty||0)` was always `undefined * n` = NaN, so `gain` was always
      // NaN, `allPnL.filter(p => p.gain > 0)` silently dropped every stock, and "Best
      // performer" would only ever surface if a mutual fund happened to also pass (also NaN).
      const current = Number(s.currentValue || (s.currentPrice || 0) * (s.qty || 0) || 0);
      const gain = current - invested;
      const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
      return { name: s.name || s.symbol || "Stock", gain, gainPct };
    });
    const mfPnLs = (state.mutualFunds || []).map((m: any) => {
      const invested = Number(m.invested || m.investedValue || 0);
      // Same bug as stocks above — the real field is `currentNav`, not `nav`.
      const current = Number(m.currentValue || (m.currentNav || 0) * (m.units || 0) || 0);
      const gain = current - invested;
      const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
      return { name: m.name || m.scheme || "MF", gain, gainPct };
    });
    const allPnL = [...stockPnLs, ...mfPnLs].filter((p) => p.gain > 0);
    if (allPnL.length > 0) {
      const best = allPnL.reduce((max, p) => (p.gainPct > max.gainPct ? p : max), allPnL[0]);
      items.push({
        icon: Trophy,
        text: `Best performer: ${best.name} (+${best.gainPct.toFixed(1)}%)`,
        color: THEME.sage,
      });
    }

    const milestones = [10000000, 5000000, 2500000, 1000000, 500000, 100000];
    const closingNW = netWorthData.closingNW;
    const openingNW = netWorthData.openingNW;
    for (const m of milestones) {
      if (closingNW >= m && openingNW < m) {
        const label = m >= 10000000 ? `${m / 10000000}Cr` : `${m / 100000}L`;
        items.push({
          icon: Target,
          text: `Net worth crossed the ₹${label} milestone this FY`,
          color: THEME.accent,
        });
        break;
      }
    }

    if (goalsData.completed > 0) {
      items.push({
        icon: CheckCircle2,
        text: `${goalsData.completed} goal${goalsData.completed > 1 ? "s" : ""} completed this FY`,
        color: THEME.sage,
      });
    }

    const closedLoans = (state.loansTaken || []).filter(
      (l: any) => Number(l.principal || 0) > 0 && Number(l.outstanding || 0) === 0
    );
    if (closedLoans.length > 0) {
      items.push({
        icon: Unlock,
        text: `${closedLoans.length} loan${closedLoans.length > 1 ? "s" : ""} fully repaid`,
        color: THEME.sage,
      });
    }

    if (savingsData.savingsRate >= 30) {
      items.push({
        icon: Flame,
        text: `Excellent savings rate of ${savingsData.savingsRate.toFixed(0)}% achieved`,
        color: THEME.sage,
      });
    }

    return items;
  }, [
    expenseData,
    state.stocks,
    state.mutualFunds,
    state.fixedDeposits,
    state.loansTaken,
    netWorthData,
    goalsData,
    savingsData,
    selectedFY,
    fyStart,
    fyEnd,
  ]);

  /* ═══════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════ */

  const nwChangeColor = netWorthData.change >= 0 ? THEME.sage : THEME.rust;
  const savingsRateColor =
    savingsData.savingsRate >= 20
      ? THEME.sage
      : savingsData.savingsRate >= 10
        ? THEME.gold
        : THEME.rust;
  const nwTrendData = netWorthData.chartData.map((d) => d.value);

  const handleExportCSV = () => {
    const q = (v: any) => {
      const val = typeof v === "number" ? Math.round(v) : v;
      return `"${String(val ?? "").replace(/"/g, '""')}"`;
    };
    const rows: string[] = [`Annual Report — ${fyLabel}`, ""];
    const section = (title: string, entries: [string, any][]) => {
      rows.push(q(title));
      entries.forEach(([label, value]) => rows.push(`${q(label)},${q(value)}`));
      rows.push("");
    };

    section("Net Worth", [
      ["Opening Net Worth", netWorthData.openingNW],
      ["Closing Net Worth", netWorthData.closingNW],
      ["Change", netWorthData.change],
      ["Change %", `${netWorthData.changePct.toFixed(1)}%`],
    ]);
    section("Income", [
      ["Total Income", incomeData.totalIncome],
      ...incomeData.breakdown.map((c) => [c.name, c.value] as [string, any]),
    ]);
    section("Expenses", [
      ["Total Expenses", expenseData.totalExpense],
      ["Monthly Average", expenseData.avgMonthly],
      ...expenseData.breakdown.map((c) => [c.name, c.value] as [string, any]),
    ]);
    section("Savings & Investment", [
      ["Net Savings", savingsData.savings],
      ["Savings Rate", `${savingsData.savingsRate.toFixed(1)}%`],
      ["New Investments", savingsData.totalNewInvestments],
      ["STCG", savingsData.stcg],
      ["LTCG", savingsData.ltcg],
    ]);
    section(
      "Asset Allocation",
      assetAllocation.alloc.map((a) => [a.name, a.value] as [string, any])
    );
    if (debtData.loanCount > 0 || debtData.ccOutstanding > 0) {
      section("Debt", [
        ["Active Loans", debtData.loanCount],
        ["Total Outstanding", debtData.totalOutstanding],
        ["Annual EMI", debtData.annualEMI],
        ["Credit Card Outstanding", debtData.ccOutstanding],
      ]);
    }
    if (insuranceData.licCount > 0 || insuranceData.termCount > 0) {
      section("Insurance", [
        ["Total Life Cover", insuranceData.totalLifeCover],
        ["Annual Premiums", insuranceData.totalPremiums],
        ["Coverage Ratio", `${insuranceData.adequacyRatio.toFixed(1)}x`],
      ]);
    }
    if (taxData.totalTaxPaid > 0) {
      section("Tax", [
        ["Total Tax Paid", taxData.totalTaxPaid],
        ["Effective Rate", `${taxData.effectiveRate.toFixed(1)}%`],
        ...Object.entries(taxData.byType).map(([t, a]) => [t, a] as [string, any]),
      ]);
    }
    if (goalsData.totalGoals > 0) {
      section("Goals", [
        ["Total Goals", goalsData.totalGoals],
        ["Completed", goalsData.completed],
        ["Overall Progress", `${goalsData.overallPct.toFixed(0)}%`],
      ]);
    }
    if (yoyData.hasPrevData) {
      section(`vs ${getFYLabel(prevFY)}`, [
        ["Income", incomeData.totalIncome],
        [`Income (${getFYLabel(prevFY)})`, yoyData.prevIncome],
        ["Expenses", expenseData.totalExpense],
        [`Expenses (${getFYLabel(prevFY)})`, yoyData.prevExpense],
        ["Net Savings", savingsData.savings],
        [`Net Savings (${getFYLabel(prevFY)})`, yoyData.prevSavings],
      ]);
    }

    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `annual-report-${selectedFY}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="annual-report">
      {/* Header */}
      <SectionTitle
        sub="Comprehensive financial year summary — print or save as PDF"
        rightElement={
          <div className="no-print" style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <select
              className="form-input"
              value={selectedFY}
              onChange={(e) => setSelectedFY(e.target.value)}
              aria-label="Select financial year"
              style={{ padding: "8px 12px", fontSize: 13, fontWeight: 600, minWidth: 130 }}
            >
              {availableFYs.map((fy) => (
                <option key={fy} value={fy}>
                  {getFYLabel(fy)}
                </option>
              ))}
            </select>
            {hasAnyData && (
              <Button variant="ghost" icon={<Download size={16} />} onClick={handleExportCSV}>
                CSV
              </Button>
            )}
            <Button variant="accent" icon={<Printer size={16} />} onClick={() => window.print()}>
              Print / PDF
            </Button>
          </div>
        }
      >
        Annual Report
      </SectionTitle>

      {!hasAnyData ? (
        <EmptyState
          icon={FileText}
          title={`No Data for ${fyLabel}`}
          description={`Add income entries, transactions, or investments to generate your annual financial report for ${fyLabel}.`}
          pills={["Income vs Expense", "Net Worth Growth", "Goal Progress", "Tax Summary"]}
        />
      ) : (
        <>
          {/* ─── Premium Executive Hero Card ─────────────────────────── */}
          <Card
            variant="hero"
            style={{ padding: "40px", marginBottom: 24, position: "relative", overflow: "hidden" }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: "radial-gradient(var(--t-line) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
                opacity: 0.07,
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 24,
                position: "relative",
                zIndex: 1,
              }}
            >
              <div style={{ textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.15em",
                      opacity: 0.8,
                      color: "color-mix(in srgb, var(--t-accent) 25%, #fff)",
                    }}
                  >
                    Executive Financial Summary
                  </span>
                  {netWorthData.isCurrentFY && (
                    <Badge variant="gold" style={{ fontSize: 9, padding: "2px 8px" }}>
                      Ongoing
                    </Badge>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 36,
                    fontWeight: 900,
                    letterSpacing: "-0.04em",
                    lineHeight: 1.1,
                    color: "#fff",
                  }}
                >
                  {fyLabel}
                </div>
                <div style={{ fontSize: 13, marginTop: 6, opacity: 0.7, color: "var(--t-paper)" }}>
                  {formatDateReadable(fyStart)} &mdash; {formatDateReadable(fyEnd)}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 16,
                  flexWrap: "wrap",
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "16px 24px",
                  borderRadius: 16,
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(4px)",
                }}
              >
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 10,
                      opacity: 0.6,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 4,
                    }}
                  >
                    Net Worth growth
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color:
                        netWorthData.change >= 0
                          ? `color-mix(in srgb, ${THEME.sage} 70%, white)`
                          : `color-mix(in srgb, ${THEME.rust} 65%, white)`,
                    }}
                  >
                    {netWorthData.change >= 0 ? "+" : ""}
                    {netWorthData.changePct.toFixed(1)}%
                  </div>
                </div>
                <div style={{ width: 1, background: "rgba(255, 255, 255, 0.15)" }} />
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: 10,
                      opacity: 0.6,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 4,
                    }}
                  >
                    Avg Savings rate
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color:
                        savingsData.savingsRate >= 20
                          ? `color-mix(in srgb, ${THEME.sage} 70%, white)`
                          : `color-mix(in srgb, ${THEME.gold} 65%, white)`,
                    }}
                  >
                    {savingsData.savingsRate.toFixed(0)}%
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* ─── Year-over-Year Comparison ───────────────────────────── */}
          {yoyData.hasPrevData && (
            <Card style={{ padding: 24, marginBottom: 24 }}>
              <CardHeading icon={TrendingUp} title={`vs ${getFYLabel(prevFY)}`} />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 14,
                }}
              >
                {[
                  {
                    label: "Income",
                    curr: incomeData.totalIncome,
                    prev: yoyData.prevIncome,
                    deltaPct: yoyData.incomeDeltaPct,
                    higherIsBetter: true,
                  },
                  {
                    label: "Expenses",
                    curr: expenseData.totalExpense,
                    prev: yoyData.prevExpense,
                    deltaPct: yoyData.expenseDeltaPct,
                    higherIsBetter: false,
                  },
                  {
                    label: "Net Savings",
                    curr: savingsData.savings,
                    prev: yoyData.prevSavings,
                    deltaPct: yoyData.savingsDeltaPct,
                    higherIsBetter: true,
                  },
                  {
                    label: "Net Worth Growth",
                    curr: netWorthData.change,
                    prev: yoyData.prevNWChange,
                    deltaPct: yoyData.nwChangeDeltaPct,
                    higherIsBetter: true,
                  },
                ].map((m) => {
                  const improved = m.higherIsBetter ? m.deltaPct >= 0 : m.deltaPct <= 0;
                  const deltaColor = m.deltaPct === 0 ? THEME.muted : improved ? THEME.sage : THEME.rust;
                  return (
                    <div
                      key={m.label}
                      style={{
                        padding: "14px 16px",
                        background: "var(--surface-0)",
                        border: `1px solid ${THEME.line}`,
                        borderRadius: 10,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          color: THEME.muted,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          marginBottom: 6,
                        }}
                      >
                        {m.label}
                      </div>
                      <div
                        style={{
                          fontSize: 18,
                          fontWeight: 800,
                          color: THEME.ink,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Money value={m.curr} variant="full" />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 6 }}>
                        {m.deltaPct >= 0 ? (
                          <ArrowUpRight size={12} style={{ color: deltaColor }} />
                        ) : (
                          <ArrowDownRight size={12} style={{ color: deltaColor }} />
                        )}
                        <span style={{ fontSize: 12, fontWeight: 700, color: deltaColor }}>
                          {m.deltaPct >= 0 ? "+" : ""}
                          {m.deltaPct.toFixed(0)}%
                        </span>
                        <span style={{ fontSize: 10, color: THEME.muted }}>
                          vs <Money value={m.prev} variant="full" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ─── Interactive Scrollspy Tab Navigation ──────────────── */}
          <div
            className="no-print"
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              justifyContent: "center",
              marginBottom: 24,
              // Deliberately NOT position:sticky — this row sits directly inline between
              // dense stat cards with no reserved gutter for it. A pinned bar here always
              // ends up parked on top of whatever card row happens to scroll to that exact
              // height (e.g. covering the NET SAVINGS/NEW INVESTMENTS stat boxes), which
              // reads as broken no matter how opaque its background is. A normal in-flow
              // row that scrolls away with the page avoids ever covering content.
              background: "var(--surface-0)",
              padding: "12px 8px",
              borderRadius: 16,
              border: `1px solid ${THEME.line}`,
              boxShadow: "var(--shadow-card)",
            }}
          >
            {[
              { id: "nw", label: "Net Worth" },
              { id: "income", label: "Income" },
              { id: "expense", label: "Expenses" },
              { id: "savings", label: "Savings" },
              { id: "allocation", label: "Assets" },
              ...(debtData.loanCount > 0 || debtData.ccOutstanding > 0
                ? [{ id: "debt", label: "Debt" }]
                : []),
              ...(insuranceData.licCount > 0 || insuranceData.termCount > 0
                ? [{ id: "insurance", label: "Insurance" }]
                : []),
              ...(taxData.totalTaxPaid > 0 ? [{ id: "tax", label: "Tax" }] : []),
              ...(goalsData.totalGoals > 0 ? [{ id: "goals", label: "Goals" }] : []),
              ...(highlights.length > 0 ? [{ id: "highlights", label: "Highlights" }] : []),
              { id: "health", label: "Health" },
            ].map((s) => {
              const isActive = activeSection === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    const el = document.getElementById(s.id);
                    // The page scrolls inside `.app-main-content`, not `window` — scrolling
                    // window here was a no-op since that element never scrolls.
                    const container = el?.closest(".app-main-content") as HTMLElement | null;
                    if (el && container) {
                      const yOffset = -80;
                      const y =
                        el.getBoundingClientRect().top -
                        container.getBoundingClientRect().top +
                        container.scrollTop +
                        yOffset;
                      container.scrollTo({ top: y, behavior: "smooth" });
                    }
                  }}
                  aria-current={isActive ? "true" : undefined}
                  className="card-lift"
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    background: isActive
                      ? `color-mix(in srgb, ${THEME.accent} 12%, transparent)`
                      : "var(--surface-0)",
                    border: `1px solid ${isActive ? THEME.accent : THEME.line}`,
                    color: THEME.accent,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* ─── Hero Stat Cards with Micro-Sparklines ──────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
              marginBottom: 24,
            }}
          >
            <PremiumStatCard
              label="Opening Net Worth"
              value={fmtINRFull(netWorthData.openingNW)}
              numericValue={netWorthData.openingNW}
              formatValue={fmtINRFull}
              icon={Wallet}
              color={THEME.accent}
              sub={`Start of ${fyLabel}`}
              sparklineData={nwTrendData}
            />
            <PremiumStatCard
              label="Closing Net Worth"
              value={fmtINRFull(netWorthData.closingNW)}
              numericValue={netWorthData.closingNW}
              formatValue={fmtINRFull}
              icon={TrendingUp}
              color={THEME.accent}
              sub={netWorthData.isCurrentFY ? "As of today" : `End of ${fyLabel}`}
              sparklineData={nwTrendData}
            />
            <PremiumStatCard
              label="NW Change"
              value={`${netWorthData.change >= 0 ? "+" : ""}${fmtINRFull(netWorthData.change)}`}
              numericValue={netWorthData.change}
              formatValue={(n: number) => `${n >= 0 ? "+" : ""}${fmtINRFull(n)}`}
              icon={netWorthData.change >= 0 ? ArrowUpRight : ArrowDownRight}
              color={nwChangeColor}
              sub={`${netWorthData.changePct >= 0 ? "+" : ""}${netWorthData.changePct.toFixed(1)}%`}
              subColor={nwChangeColor}
              sparklineData={nwTrendData}
            />
            <PremiumStatCard
              label="Savings Rate"
              value={`${savingsData.savingsRate.toFixed(0)}%`}
              numericValue={savingsData.savingsRate}
              formatValue={(n: number) => `${n.toFixed(0)}%`}
              icon={PiggyBank}
              color={savingsRateColor}
              sub={
                savingsData.savingsRate >= 30
                  ? "Excellent"
                  : savingsData.savingsRate >= 20
                    ? "Good"
                    : savingsData.savingsRate >= 10
                      ? "Fair"
                      : "Needs attention"
              }
              subColor={savingsRateColor}
              sparklineData={monthlySavingsTrend.filter((v) => v !== 0)}
            />
          </div>

          {/* ─── (a) Net Worth Trend Area Chart ──────────────────────── */}
          {netWorthData.chartData.length > 1 && (
            <Card style={{ padding: 24, marginBottom: 24 }}>
              <CardHeading icon={TrendingUp} title="Net Worth Trend" id="nw" />
              <div style={{ height: 260 }}>
                <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <AreaChart data={netWorthData.chartData}>
                    <defs>
                      <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={THEME.accent} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={THEME.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="4 4"
                      stroke={THEME.line}
                      vertical={false}
                      opacity={0.4}
                    />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: THEME.muted }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: THEME.muted }}
                      tickFormatter={(v: number) => (privacyMode ? "••••" : fmtINRFull(v))}
                      width={65}
                    />
                    <Tooltip
                      content={<GlassTooltip />}
                      cursor={{ stroke: THEME.line, strokeWidth: 1.5 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name="Net Worth"
                      stroke={THEME.accent}
                      fill="url(#nwGrad)"
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer></div>
              </div>
            </Card>
          )}

          {/* ─── Income & Expense (two-column grid) ─────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {/* (b) Income Summary with rounded Gradient Bar Chart */}
            <Card style={{ padding: 24 }}>
              <CardHeading icon={Wallet} title="Income Summary" id="income" color={THEME.sage} />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <MetricTile
                  label="Total Income"
                  value={fmtINRFull(incomeData.totalIncome)}
                  color={THEME.sage}
                />
                <MetricTile
                  label="Monthly Avg"
                  value={fmtINRFull(incomeData.totalIncome / (fyMonthsElapsed || 12))}
                />
              </div>
              {incomeData.breakdown.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: THEME.muted,
                      marginBottom: 10,
                    }}
                  >
                    By Category
                  </div>
                  {incomeData.breakdown.map((cat, idx) => (
                    <div
                      key={cat.name}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: PIE_COLORS[idx % PIE_COLORS.length],
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ flex: 1, fontSize: 12, color: THEME.muted }}>{cat.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: THEME.ink }}>
                        <Money value={cat.value} variant="full" />
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          color: THEME.muted,
                          minWidth: 32,
                          textAlign: "right",
                        }}
                      >
                        {incomeData.totalIncome > 0
                          ? ((cat.value / incomeData.totalIncome) * 100).toFixed(0)
                          : 0}
                        %
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {incomeData.monthlyChart.some((d) => d.income > 0) && (
                <div style={{ height: 160 }}>
                  <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <BarChart data={incomeData.monthlyChart} barSize={32}>
                      <defs>
                        <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={THEME.sage} stopOpacity={0.85} />
                          <stop offset="100%" stopColor={THEME.sage} stopOpacity={0.3} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="4 4"
                        stroke={THEME.line}
                        vertical={false}
                        opacity={0.4}
                      />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: THEME.muted }} />
                      <YAxis
                        tick={{ fontSize: 9, fill: THEME.muted }}
                        tickFormatter={(v: number) => (privacyMode ? "••••" : fmtINRFull(v))}
                        width={50}
                      />
                      <Tooltip
                        content={<GlassTooltip />}
                        cursor={{ fill: "color-mix(in srgb, var(--t-line) 15%, transparent)" }}
                      />
                      <Bar
                        dataKey="income"
                        name="Income"
                        fill="url(#incomeGrad)"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer></div>
                </div>
              )}
            </Card>

            {/* (c) Expense Summary with interactive Donut Chart */}
            <Card style={{ padding: 24 }}>
              <div className="page-break" />
              <CardHeading icon={Receipt} title="Expense Summary" id="expense" color={THEME.rust} />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <MetricTile
                  label="Total Expenses"
                  value={fmtINRFull(expenseData.totalExpense)}
                  color={THEME.rust}
                />
                <MetricTile label="Monthly Avg" value={fmtINRFull(expenseData.avgMonthly)} />
              </div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: THEME.muted,
                      marginBottom: 10,
                    }}
                  >
                    Top Categories
                  </div>
                  {expenseData.breakdown.slice(0, 6).map((cat, idx) => (
                    <div
                      key={cat.name}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: PIE_COLORS[idx % PIE_COLORS.length],
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ flex: 1, fontSize: 12, color: THEME.muted }}>{cat.name}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: THEME.ink }}>
                        <Money value={cat.value} variant="full" />
                      </span>
                    </div>
                  ))}
                </div>
                {expenseData.top5.length > 0 && (
                  <div style={{ width: 170, height: 170, flexShrink: 0, position: "relative" }}>
                    <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <PieChart>
                        <Pie
                          data={expenseData.top5}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          innerRadius={50}
                          paddingAngle={3}
                          onMouseEnter={(_, idx) => {
                            const item = expenseData.top5[idx];
                            if (item) setHoveredExpense({ name: item.name, value: item.value });
                          }}
                          onMouseLeave={() => setHoveredExpense(null)}
                        >
                          {expenseData.top5.map((_, idx) => (
                            <Cell
                              key={idx}
                              fill={PIE_COLORS[idx % PIE_COLORS.length]}
                              style={{ outline: "none", cursor: "pointer" }}
                            />
                          ))}
                        </Pie>
                        <text
                          x="50%"
                          y="46%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            fill: THEME.muted,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                          }}
                        >
                          {hoveredExpense ? hoveredExpense.name : "Total Expenses"}
                        </text>
                        <text
                          x="50%"
                          y="58%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fontSize: 13, fontWeight: 800, fill: THEME.ink }}
                        >
                          {privacyMode
                            ? "••••"
                            : fmtINRFull(
                                hoveredExpense ? hoveredExpense.value : expenseData.totalExpense
                              )}
                        </text>
                      </PieChart>
                    </ResponsiveContainer></div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* ─── Savings & Asset Allocation (two-column grid) ────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
              gap: 16,
              marginBottom: 24,
            }}
          >
            {/* (d) Savings & Investment details */}
            <Card style={{ padding: 24 }}>
              <CardHeading icon={PiggyBank} title="Savings & Investment" id="savings" />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <MetricTile
                  label="Net Savings"
                  value={`${savingsData.savings >= 0 ? "+" : ""}${fmtINRFull(savingsData.savings)}`}
                  color={savingsData.savings >= 0 ? THEME.sage : THEME.rust}
                />
                <MetricTile
                  label="New Investments"
                  value={fmtINRFull(savingsData.totalNewInvestments)}
                  color={THEME.accent}
                />
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: THEME.muted,
                  marginBottom: 8,
                }}
              >
                Investment Additions
              </div>
              {[
                { label: "Stocks", value: savingsData.stockBuys },
                { label: "Mutual Funds", value: savingsData.mfBuys },
                { label: "Fixed Deposits", value: savingsData.fdAdds },
                { label: "PPF", value: savingsData.ppfAdds },
                // Reflects TODAY's active SIP mandates annualized, not what actually ran during
                // the selected FY — only meaningful as a forward run-rate for the ongoing FY, so
                // it's hidden for past (closed) FYs where it would misrepresent history.
                ...(netWorthData.isCurrentFY
                  ? [{ label: "Active SIPs (run-rate)", value: savingsData.sipTotal }]
                  : []),
              ]
                .filter((r) => r.value > 0)
                .map((r) => (
                  <DataRow key={r.label} label={r.label} value={fmtINRFull(r.value)} />
                ))}
              {(savingsData.stcg !== 0 || savingsData.ltcg !== 0) && (
                <>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: THEME.muted,
                      marginBottom: 8,
                      marginTop: 16,
                    }}
                  >
                    Capital Gains
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <MetricTile
                      label="STCG"
                      value={fmtINRFull(savingsData.stcg)}
                      color={savingsData.stcg >= 0 ? THEME.sage : THEME.rust}
                    />
                    <MetricTile
                      label="LTCG"
                      value={fmtINRFull(savingsData.ltcg)}
                      color={savingsData.ltcg >= 0 ? THEME.sage : THEME.rust}
                    />
                  </div>
                </>
              )}
            </Card>

            {/* (e) Asset Allocation Donut Chart with Progress Bars */}
            <Card style={{ padding: 24 }}>
              <div className="page-break" />
              <CardHeading icon={PieIcon} title="Asset Allocation" id="allocation" />
              {isPastFY && (
                <InfoBanner>
                  Asset allocation reflects current holdings — historical snapshot not available for
                  past FYs.
                </InfoBanner>
              )}
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
                {assetAllocation.alloc.length > 0 && (
                  <div style={{ width: 180, height: 180, flexShrink: 0, position: "relative" }}>
                    <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <PieChart>
                        <Pie
                          data={assetAllocation.alloc}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={75}
                          innerRadius={55}
                          paddingAngle={3}
                          onMouseEnter={(_, idx) => {
                            const item = assetAllocation.alloc[idx];
                            if (item) setHoveredAsset({ name: item.name, value: item.value });
                          }}
                          onMouseLeave={() => setHoveredAsset(null)}
                        >
                          {assetAllocation.alloc.map((_, idx) => (
                            <Cell
                              key={idx}
                              fill={PIE_COLORS[idx % PIE_COLORS.length]}
                              style={{ outline: "none", cursor: "pointer" }}
                            />
                          ))}
                        </Pie>
                        <text
                          x="50%"
                          y="46%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{
                            fontSize: 9,
                            fontWeight: 700,
                            fill: THEME.muted,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                          }}
                        >
                          {hoveredAsset ? hoveredAsset.name : "Total Assets"}
                        </text>
                        <text
                          x="50%"
                          y="58%"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          style={{ fontSize: 13, fontWeight: 800, fill: THEME.ink }}
                        >
                          {privacyMode
                            ? "••••"
                            : fmtINRFull(hoveredAsset ? hoveredAsset.value : assetAllocation.total)}
                        </text>
                      </PieChart>
                    </ResponsiveContainer></div>
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 160 }}>
                  {assetAllocation.alloc.map((a, idx) => (
                    <div key={a.name} style={{ marginBottom: 8 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 3,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: PIE_COLORS[idx % PIE_COLORS.length],
                            }}
                          />
                          <span style={{ fontSize: 12, fontWeight: 600, color: THEME.ink }}>
                            {a.name}
                          </span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: THEME.ink }}>
                          <Money value={a.value} variant="full" />
                          <span style={{ fontSize: 10, color: THEME.muted, marginLeft: 4 }}>
                            {assetAllocation.total > 0
                              ? ((a.value / assetAllocation.total) * 100).toFixed(0)
                              : 0}
                            %
                          </span>
                        </span>
                      </div>
                      <ProgressBar
                        pct={
                          assetAllocation.total > 0 ? (a.value / assetAllocation.total) * 100 : 0
                        }
                        color={PIE_COLORS[idx % PIE_COLORS.length]}
                      />
                    </div>
                  ))}
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: "var(--surface-1)",
                      border: `1px solid ${THEME.line}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>
                        Total Assets
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: THEME.accent }}>
                        <Money value={assetAllocation.total} variant="full" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* ─── Debt & Insurance (two-column grid, conditional) ─────── */}
          {(debtData.loanCount > 0 ||
            debtData.ccOutstanding > 0 ||
            insuranceData.licCount > 0 ||
            insuranceData.termCount > 0) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
                gap: 16,
                marginBottom: 24,
              }}
            >
              {/* (f) Debt details */}
              {(debtData.loanCount > 0 || debtData.ccOutstanding > 0) && (
                <Card style={{ padding: 24 }}>
                  <CardHeading icon={Landmark} title="Debt Summary" id="debt" color={THEME.rust} />
                  {isPastFY && (
                    <InfoBanner>
                      Debt figures reflect current outstanding — historical balances not available
                      for past FYs.
                    </InfoBanner>
                  )}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                      marginBottom: 16,
                    }}
                  >
                    <MetricTile
                      label="Outstanding"
                      value={fmtINRFull(debtData.totalOutstanding)}
                      color={THEME.rust}
                    />
                    <MetricTile label="Annual EMI" value={fmtINRFull(debtData.annualEMI)} />
                  </div>
                  <DataRow label="Active loans" value={debtData.loanCount} />
                  <DataRow label="Total principal" value={fmtINRFull(debtData.totalPrincipal)} />
                  <DataRow
                    label="Est. principal repaid (annual)"
                    value={fmtINRFull(debtData.principalRepaid)}
                  />
                  <DataRow
                    label="Est. interest paid (annual)"
                    value={fmtINRFull(debtData.interestPortion)}
                  />
                  {debtData.ccOutstanding > 0 && (
                    <DataRow
                      label="Credit card outstanding"
                      value={fmtINRFull(debtData.ccOutstanding)}
                      color={THEME.rust}
                    />
                  )}
                </Card>
              )}

              {/* (g) Insurance details */}
              {(insuranceData.licCount > 0 || insuranceData.termCount > 0) && (
                <Card style={{ padding: 24 }}>
                  <div className="page-break" />
                  <CardHeading icon={Shield} title="Insurance Coverage" id="insurance" />
                  {isPastFY && (
                    <InfoBanner>
                      Insurance data reflects current policies — historical coverage not available
                      for past FYs.
                    </InfoBanner>
                  )}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                      marginBottom: 16,
                    }}
                  >
                    <MetricTile
                      label="Life Cover"
                      value={fmtINRFull(insuranceData.totalLifeCover)}
                      color={THEME.accent}
                    />
                    <MetricTile
                      label="Coverage"
                      value={`${insuranceData.adequacyRatio.toFixed(1)}x`}
                      sub={
                        insuranceData.adequacyRatio >= 10
                          ? "Adequate"
                          : insuranceData.adequacyRatio >= 5
                            ? "Moderate"
                            : "Low"
                      }
                      color={
                        insuranceData.adequacyRatio >= 10
                          ? THEME.sage
                          : insuranceData.adequacyRatio >= 5
                            ? THEME.gold
                            : THEME.rust
                      }
                    />
                  </div>
                  <DataRow label="LIC / Endowment policies" value={insuranceData.licCount} />
                  <DataRow label="Term life plans" value={insuranceData.termCount} />
                  <DataRow
                    label="Annual premiums"
                    value={fmtINRFull(insuranceData.totalPremiums)}
                  />
                  {insuranceData.adequacyRatio < 10 && incomeData.totalIncome > 0 && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: "var(--surface-1)",
                        border: `1px solid ${THEME.line}`,
                        fontSize: 12,
                        color: THEME.muted,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                      <span>
                        Coverage is {insuranceData.adequacyRatio.toFixed(1)}x annual income.
                        Recommended: at least 10x (
                        <Money value={incomeData.totalIncome * 10} variant="full" />).
                      </span>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}

          {/* ─── Tax & Goals (two-column grid, conditional) ──────────── */}
          {(taxData.totalTaxPaid > 0 || taxData.paymentCount > 0 || goalsData.totalGoals > 0) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
                gap: 16,
                marginBottom: 24,
              }}
            >
              {/* (h) Tax details */}
              {(taxData.totalTaxPaid > 0 || taxData.paymentCount > 0) && (
                <Card style={{ padding: 24 }}>
                  <CardHeading icon={Receipt} title="Tax Summary" id="tax" color={THEME.gold} />
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 10,
                      marginBottom: 16,
                    }}
                  >
                    <MetricTile
                      label="Total Tax"
                      value={fmtINRFull(taxData.totalTaxPaid)}
                      color={THEME.rust}
                    />
                    <MetricTile
                      label="Effective Rate"
                      value={`${taxData.effectiveRate.toFixed(1)}%`}
                      sub={`Regime: ${taxData.regime === "new" ? "New" : "Old"}`}
                    />
                  </div>
                  {Object.entries(taxData.byType).length > 0 && (
                    <>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: THEME.muted,
                          marginBottom: 8,
                        }}
                      >
                        Breakdown
                      </div>
                      {Object.entries(taxData.byType).map(([type, amount]) => (
                        <DataRow key={type} label={type} value={fmtINRFull(amount as number)} />
                      ))}
                    </>
                  )}
                </Card>
              )}

              {/* (i) Goals Progress with rounded indicators */}
              {goalsData.totalGoals > 0 && (
                <Card style={{ padding: 24 }}>
                  <CardHeading icon={Target} title="Goals Progress" id="goals" />
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 10,
                      marginBottom: 16,
                    }}
                  >
                    <MetricTile label="Goals" value={String(goalsData.totalGoals)} />
                    <MetricTile
                      label="Done"
                      value={String(goalsData.completed)}
                      color={THEME.sage}
                    />
                    <MetricTile
                      label="Progress"
                      value={`${goalsData.overallPct.toFixed(0)}%`}
                      color={THEME.accent}
                    />
                  </div>
                  {goalsData.topGoals.map((g) => (
                    <div key={g.name} style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontSize: 12, fontWeight: 600, color: THEME.ink }}>
                          {g.name}
                        </span>
                        <span style={{ fontSize: 11, color: THEME.muted }}>
                          <Money value={g.saved} variant="full" /> / <Money value={g.target} variant="full" />
                          <span
                            style={{
                              marginLeft: 4,
                              fontWeight: 700,
                              color: g.pct >= 100 ? THEME.sage : THEME.accent,
                            }}
                          >
                            {g.pct.toFixed(0)}%
                          </span>
                        </span>
                      </div>
                      <ProgressBar
                        pct={g.pct}
                        color={g.pct >= 100 ? THEME.sage : g.pct >= 50 ? THEME.accent : THEME.gold}
                      />
                    </div>
                  ))}
                </Card>
              )}
            </div>
          )}

          {/* ─── (j) Key Highlights Bento Grid ────────────────────────── */}
          {highlights.length > 0 && (
            <>
              <div className="page-break" />
              <Card style={{ padding: 24, marginBottom: 24 }}>
                <CardHeading
                  icon={Sparkles}
                  title="Key Highlights"
                  id="highlights"
                  color={THEME.gold}
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: 12,
                  }}
                >
                  {highlights.map((h, idx) => (
                    <div
                      key={idx}
                      className="card-lift"
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        padding: "16px",
                        borderRadius: 12,
                        background:
                          "linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
                        border: `1.5px solid ${THEME.line}`,
                        borderLeft: `4px solid ${h.color}`,
                        boxShadow: "var(--shadow-sm)",
                        transition: "all 0.25s ease",
                      }}
                    >
                      <span
                        style={{
                          lineHeight: 1,
                          background: `color-mix(in srgb, ${h.color} 10%, transparent)`,
                          padding: 6,
                          borderRadius: 8,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <h.icon size={18} color={h.color} />
                      </span>
                      <span
                        style={{
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: THEME.ink,
                          lineHeight: 1.6,
                          marginTop: 2,
                        }}
                      >
                        {h.text}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {/* ─── Financial Health Bento Scorecard with Circular Progress ── */}
          <Card style={{ padding: 24, marginBottom: 24 }}>
            <CardHeading icon={BarChart2} title="Financial Health Snapshot" id="health" />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: 14,
              }}
            >
              {[
                {
                  label: "Savings Rate",
                  value: `${savingsData.savingsRate.toFixed(0)}%`,
                  status:
                    savingsData.savingsRate >= 30
                      ? "Excellent"
                      : savingsData.savingsRate >= 20
                        ? "Good"
                        : savingsData.savingsRate >= 10
                          ? "Fair"
                          : "Low",
                  color:
                    savingsData.savingsRate >= 20
                      ? THEME.sage
                      : savingsData.savingsRate >= 10
                        ? THEME.gold
                        : THEME.rust,
                  pct: Math.min(100, Math.max(0, savingsData.savingsRate)),
                },
                {
                  label: "Debt-to-Income",
                  value:
                    incomeData.totalIncome > 0
                      ? `${((debtData.annualEMI / incomeData.totalIncome) * 100).toFixed(0)}%`
                      : "0%",
                  status:
                    debtData.annualEMI === 0
                      ? "No Debt"
                      : incomeData.totalIncome > 0 &&
                          debtData.annualEMI / incomeData.totalIncome < 0.3
                        ? "Healthy"
                        : incomeData.totalIncome > 0 &&
                            debtData.annualEMI / incomeData.totalIncome < 0.5
                          ? "Moderate"
                          : "High",
                  color:
                    debtData.annualEMI === 0
                      ? THEME.sage
                      : incomeData.totalIncome > 0 &&
                          debtData.annualEMI / incomeData.totalIncome < 0.3
                        ? THEME.sage
                        : incomeData.totalIncome > 0 &&
                            debtData.annualEMI / incomeData.totalIncome < 0.5
                          ? THEME.gold
                          : THEME.rust,
                  pct:
                    incomeData.totalIncome > 0
                      ? Math.min(100, (debtData.annualEMI / incomeData.totalIncome) * 100)
                      : 0,
                },
                {
                  label: "Insurance Cover",
                  value: `${insuranceData.adequacyRatio.toFixed(1)}x`,
                  status:
                    insuranceData.adequacyRatio >= 10
                      ? "Adequate"
                      : insuranceData.adequacyRatio >= 5
                        ? "Moderate"
                        : insuranceData.totalLifeCover === 0
                          ? "None"
                          : "Low",
                  color:
                    insuranceData.adequacyRatio >= 10
                      ? THEME.sage
                      : insuranceData.adequacyRatio >= 5
                        ? THEME.gold
                        : THEME.rust,
                  pct: Math.min(100, (insuranceData.adequacyRatio / 10) * 100),
                },
                {
                  label: "Goal Progress",
                  value: `${goalsData.overallPct.toFixed(0)}%`,
                  status:
                    goalsData.overallPct >= 80
                      ? "On Track"
                      : goalsData.overallPct >= 50
                        ? "In Progress"
                        : goalsData.totalGoals === 0
                          ? "No Goals"
                          : "Behind",
                  color:
                    goalsData.overallPct >= 80
                      ? THEME.sage
                      : goalsData.overallPct >= 50
                        ? THEME.gold
                        : goalsData.totalGoals === 0
                          ? THEME.muted
                          : THEME.rust,
                  pct: goalsData.overallPct,
                },
              ].map((m) => (
                <div
                  key={m.label}
                  style={{
                    padding: "20px",
                    borderRadius: 16,
                    background:
                      "linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
                    border: `1.5px solid ${THEME.line}`,
                    borderTop: `4px solid ${m.color}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    boxShadow: "var(--shadow-card)",
                    transition: "all 0.25s ease",
                  }}
                >
                  <div
                    style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: THEME.muted,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 6,
                      }}
                    >
                      {m.label}
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 900,
                        color: m.color,
                        letterSpacing: "-0.03em",
                        fontVariantNumeric: "tabular-nums",
                        lineHeight: 1.2,
                      }}
                    >
                      {m.value}
                    </div>
                    <Badge
                      variant={
                        m.color === THEME.sage
                          ? "sage"
                          : m.color === THEME.gold
                            ? "gold"
                            : m.color === THEME.muted
                              ? "muted"
                              : "rust"
                      }
                      style={{ fontSize: 9, marginTop: 8, padding: "2px 8px" }}
                    >
                      {m.status}
                    </Badge>
                  </div>

                  <div className="no-print">
                    <CircularProgress pct={m.pct} color={m.color} size={55} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* ─── Footer ──────────────────────────────────────────────── */}
          <div
            style={{ textAlign: "center", padding: "8px 0 32px", fontSize: 11, color: THEME.muted }}
          >
            Generated on{" "}
            {new Date().toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            &middot; Personal Finance Dashboard
          </div>
        </>
      )}
    </div>
  );
};
