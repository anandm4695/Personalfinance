/* eslint-disable */
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  FileText,
  Printer,
  TrendingUp,
  TrendingDown,
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
  Calendar,
  Layers,
  Activity,
  Award,
  ChevronRight,
  Zap,
  CreditCard,
  Scale,
  Percent,
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
  ReferenceLine,
} from "recharts";
import { THEME, PIE_COLORS, ASSET_CLASS_COLORS } from "../../utils/constants";
import { getCurrentFY } from "../../utils/appConstants";
import { fmtINR, fmtINRFull, today, loanOutstanding, annualizePremium } from "../../utils/finance";
import { Card } from "../ui/Card";
import { StatCard } from "../ui/StatCard";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { isLongTerm, isEquityMF } from "./CapitalGainsTab";
import { computeNetWorthAsOf } from "../../utils/netWorthAsOf";

/* ══════════════════════════════════════════════════════════════════
   HELPERS & DATE UTILITIES
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
  .print-only-header {
    display: block !important;
    margin-bottom: 20px;
  }
}`;

/* ── UI Building Blocks ───────────────────────────────────────── */

const CardHeading = ({
  icon: Icon,
  title,
  id,
  color = THEME.accent,
  badge,
}: {
  icon: any;
  title: string;
  id?: string;
  color?: string;
  badge?: string;
}) => (
  <div
    id={id}
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: 16,
      scrollMarginTop: 90,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: `color-mix(in srgb, ${color} 14%, transparent)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color,
          flexShrink: 0,
        }}
      >
        <Icon size={18} />
      </div>
      <div
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 16,
          fontWeight: 700,
          color: THEME.ink,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </div>
    </div>
    {badge && (
      <Badge variant="muted" style={{ fontSize: 10, padding: "2px 8px" }}>
        {badge}
      </Badge>
    )}
  </div>
);

const DataRow = ({
  label,
  value,
  bold,
  color,
  subText,
}: {
  label: string;
  value: React.ReactNode;
  bold?: boolean;
  color?: string;
  subText?: string;
}) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "9px 0",
      borderBottom: `1px solid ${THEME.line}`,
    }}
  >
    <div>
      <span style={{ fontSize: 12.5, color: THEME.muted, fontWeight: bold ? 700 : 500 }}>
        {label}
      </span>
      {subText && (
        <span style={{ fontSize: 11, color: THEME.muted, opacity: 0.8, marginLeft: 6 }}>
          ({subText})
        </span>
      )}
    </div>
    <span
      className="tabular-nums"
      style={{ fontSize: 13, fontWeight: bold ? 700 : 600, color: color || THEME.ink }}
    >
      <Prv>{value}</Prv>
    </span>
  </div>
);

const ProgressBar = ({
  pct,
  color,
  height = 6,
}: {
  pct: number;
  color?: string;
  height?: number;
}) => (
  <div
    className="progress-track"
    style={{
      height,
      background: "var(--surface-2)",
      borderRadius: height / 2,
      overflow: "hidden",
      position: "relative",
    }}
  >
    <div
      className="progress-fill"
      style={{
        width: `${Math.min(100, Math.max(0, pct))}%`,
        background: color || THEME.accent,
        height: "100%",
        borderRadius: height / 2,
        transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    />
  </div>
);

const MetricTile = ({
  label,
  value,
  sub,
  color,
  trend,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  color?: string;
  trend?: { isPositive: boolean; text: string };
}) => (
  <div
    style={{
      padding: "14px 16px",
      background: "var(--surface-0)",
      border: `1px solid ${THEME.line}`,
      borderRadius: 12,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
    }}
  >
    <div
      style={{
        fontSize: 10.5,
        color: THEME.muted,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: 6,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span>{label}</span>
      {trend && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: trend.isPositive ? THEME.sage : THEME.rust,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          {trend.isPositive ? "+" : ""}
          {trend.text}
        </span>
      )}
    </div>
    <div
      style={{
        fontFamily: "var(--font-display)",
        fontSize: 19,
        fontWeight: 800,
        color: color || THEME.ink,
        letterSpacing: "-0.02em",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      <Prv>{value}</Prv>
    </div>
    {sub && (
      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4, fontWeight: 500 }}>
        {sub}
      </div>
    )}
  </div>
);

const InfoBanner = ({ children }: { children: React.ReactNode }) => (
  <div
    className="info-box info-box-info"
    style={{
      marginBottom: 14,
      fontSize: 11.5,
      padding: "10px 14px",
      borderRadius: 10,
      display: "flex",
      alignItems: "center",
      gap: 8,
    }}
  >
    <Info size={14} style={{ flexShrink: 0 }} />
    <span>{children}</span>
  </div>
);

/* ── SVG Circular Progress Gauge ──────────────────────────────── */
const CircularProgress = ({
  pct,
  color,
  size = 52,
  strokeWidth = 5,
  children,
}: {
  pct: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    circumference - (Math.min(100, Math.max(0, pct)) / 100) * circumference;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
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
      {children && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

/* ── Premium Recharts Glass Tooltip ───────────────────────────── */
const GlassTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "color-mix(in srgb, var(--surface-0) 90%, transparent)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          border: `1.5px solid ${THEME.line}`,
          borderRadius: 12,
          padding: "10px 14px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.15)",
          color: THEME.ink,
          minWidth: 140,
        }}
      >
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 700,
            color: THEME.muted,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: 6,
          }}
        >
          {label}
        </div>
        {payload.map((item: any, idx: number) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              fontSize: 12,
              fontWeight: 600,
              padding: "2px 0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: item.color || item.fill,
                }}
              />
              <span style={{ color: THEME.muted }}>{item.name}:</span>
            </div>
            <span style={{ color: THEME.ink, fontWeight: 700 }}>
              <Money value={item.value} variant="full" />
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

/* ══════════════════════════════════════════════════════════════════
   MAIN ANNUAL REPORT COMPONENT
   ══════════════════════════════════════════════════════════════════ */

export const AnnualReportTab = ({
  state,
  metrics,
  marketData,
  activeProfile = "all",
}: {
  state: any;
  metrics: any;
  marketData?: any;
  activeProfile?: string;
}) => {
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

  // ── FY Discovery & Selection ──────────────────────────────────
  const availableFYs = useMemo(() => {
    const fySet = new Set<number>();
    const addDate = (d: string) => {
      if (!d) return;
      const dt = new Date(d.includes("T") ? d : d + "T00:00:00");
      if (isNaN(dt.getTime())) return;
      const yr = dt.getMonth() >= 3 ? dt.getFullYear() : dt.getFullYear() - 1;
      fySet.add(yr);
    };
    (state.income || []).forEach((i: any) => addDate(i.date));
    (state.transactions || []).forEach((t: any) => addDate(t.date));
    (state.netWorthHistory || []).forEach((h: any) => {
      if (h.month) {
        const [y, m] = h.month.split("-").map(Number);
        if (!isNaN(y) && !isNaN(m)) fySet.add(m >= 4 ? y : y - 1);
      }
    });
    (state.salarySlips || []).forEach((s: any) =>
      addDate(s.date || (s.slipMonth ? `${s.slipMonth}-01` : ""))
    );
    (state.rentalProperties || []).forEach((p: any) =>
      (p.receipts || []).forEach((r: any) => addDate(r.date))
    );
    (state.rentedProperties || []).forEach((p: any) =>
      (p.payments || []).forEach((pay: any) => addDate(pay.date))
    );
    (state.dividends || []).forEach((d: any) => addDate(d.date));
    (state.stocks || []).forEach((s: any) => addDate(s.buyDate));
    (state.mutualFunds || []).forEach((m: any) => addDate(m.buyDate));
    (state.fixedDeposits || []).forEach((fd: any) => addDate(fd.startDate));
    (state.ppfLedger || []).forEach((t: any) => addDate(t.date));
    (state.ppf || []).forEach((p: any) =>
      (p.transactions || []).forEach((t: any) => addDate(t.date))
    );
    (state.stockSells || []).forEach((s: any) => addDate(s.sellDate || s.buyDate));
    (state.mfSells || []).forEach((m: any) => addDate(m.sellDate || m.buyDate));
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
    state.salarySlips,
    state.transactions,
    state.rentalProperties,
    state.rentedProperties,
    state.dividends,
    state.netWorthHistory,
    state.stocks,
    state.mutualFunds,
    state.fixedDeposits,
    state.ppf,
    state.ppfLedger,
    state.stockSells,
    state.mfSells,
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

  // States for dynamic chart interactions
  const [hoveredExpense, setHoveredExpense] = useState<{ name: string; value: number } | null>(
    null
  );
  const [hoveredAsset, setHoveredAsset] = useState<{ name: string; value: number } | null>(null);
  const [nwChartMode, setNwChartMode] = useState<"curve" | "delta">("curve");
  const [showAllExpenses, setShowAllExpenses] = useState(false);

  // ── Scrollspy active navigation tracking ───────────────────────
  const [activeSection, setActiveSection] = useState("nw");

  const hasAnyData = useMemo(() => {
    const incomeLedger = (state.income || []).filter(
      (i: any) => i.date && i.date >= fyStart && i.date <= fyEnd
    );
    const salarySlipsInFY = (state.salarySlips || []).filter((s: any) => {
      const d = s.date || (s.slipMonth ? `${s.slipMonth}-01` : "");
      return d && d >= fyStart && d <= fyEnd;
    });
    const creditTxns = (state.transactions || []).filter(
      (t: any) => t.date && t.date >= fyStart && t.date <= fyEnd && t.type === "credit"
    );
    const debitTxns = (state.transactions || []).filter(
      (t: any) => t.date && t.date >= fyStart && t.date <= fyEnd && t.type === "debit"
    );
    const rentalReceipts = (state.rentalProperties || []).some((p: any) =>
      (p.receipts || []).some((r: any) => r.date && r.date >= fyStart && r.date <= fyEnd)
    );
    const rentPaid = (state.rentedProperties || []).some((p: any) =>
      (p.payments || []).some((pay: any) => pay.date && pay.date >= fyStart && pay.date <= fyEnd)
    );
    const dividends = (state.dividends || []).some(
      (d: any) => d.date && d.date >= fyStart && d.date <= fyEnd
    );
    const hasInvestmentActivity =
      (state.stocks || []).some(
        (s: any) => s.buyDate && s.buyDate >= fyStart && s.buyDate <= fyEnd
      ) ||
      (state.mutualFunds || []).some(
        (m: any) => m.buyDate && m.buyDate >= fyStart && m.buyDate <= fyEnd
      ) ||
      (state.fixedDeposits || []).some(
        (fd: any) => fd.startDate && fd.startDate >= fyStart && fd.startDate <= fyEnd
      ) ||
      (state.ppfLedger || []).some((t: any) => t.date && t.date >= fyStart && t.date <= fyEnd) ||
      (state.ppf || []).some((p: any) =>
        (p.transactions || []).some((t: any) => t.date && t.date >= fyStart && t.date <= fyEnd)
      ) ||
      (state.stockSells || []).some(
        (s: any) => s.sellDate && s.sellDate >= fyStart && s.sellDate <= fyEnd
      ) ||
      (state.mfSells || []).some(
        (m: any) => m.sellDate && m.sellDate >= fyStart && m.sellDate <= fyEnd
      ) ||
      (state.taxPayments || []).some((p: any) => p.date && p.date >= fyStart && p.date <= fyEnd);
    const hasAssets =
      (state.bankAccounts || []).length > 0 ||
      (state.realEstateProperties || []).length > 0 ||
      (state.vehicles || []).length > 0 ||
      (state.goldHoldings || []).length > 0 ||
      (state.loansGiven || []).length > 0 ||
      (state.loansTaken || []).length > 0 ||
      (state.fixedDeposits || []).length > 0 ||
      (state.stocks || []).length > 0 ||
      (state.mutualFunds || []).length > 0 ||
      (state.ppf || []).length > 0 ||
      (state.epf || []).length > 0 ||
      (state.nps || []).length > 0 ||
      Number(metrics?.netWorth || 0) > 0;

    return (
      incomeLedger.length > 0 ||
      salarySlipsInFY.length > 0 ||
      creditTxns.length > 0 ||
      debitTxns.length > 0 ||
      rentalReceipts ||
      rentPaid ||
      dividends ||
      hasInvestmentActivity ||
      hasAssets ||
      (state.netWorthHistory || []).length > 0
    );
  }, [
    state.income,
    state.salarySlips,
    state.transactions,
    state.rentalProperties,
    state.rentedProperties,
    state.dividends,
    state.netWorthHistory,
    state.stocks,
    state.mutualFunds,
    state.fixedDeposits,
    state.ppfLedger,
    state.stockSells,
    state.mfSells,
    state.taxPayments,
    state.bankAccounts,
    state.realEstateProperties,
    state.vehicles,
    state.goldHoldings,
    metrics?.netWorth,
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
     (a) NET WORTH SUMMARY (Source Reconstructed & Boundary Safe)
     ═══════════════════════════════════════════════════════════════ */
  const nwForMonth = useCallback(
    (ym: string): number => {
      const todayYM = today().slice(0, 7);
      if (ym > todayYM) return 0; // future months
      if (ym === todayYM && metrics.netWorth > 0) return metrics.netWorth;

      const reconstructed = computeNetWorthAsOf(state, ym, marketData, activeProfile);
      const hasSourceData =
        reconstructed.totalAssets > 0 ||
        reconstructed.totalLiabilities > 0 ||
        reconstructed.assetBreakdown.length > 0;
      if (hasSourceData) {
        return reconstructed.netWorth;
      }

      // Fallback only if there are no asset/liability records at all
      if (activeProfile === "all") {
        const entry = (state.netWorthHistory || [])
          .filter((h: any) => h.month)
          .find((h: any) => h.month === ym);
        if (entry) return Number(entry.netWorth || 0);
      }
      return reconstructed.netWorth;
    },
    [state, marketData, activeProfile, metrics.netWorth]
  );

  const netWorthData = useMemo(() => {
    const aprilKey = `${fyStartYear}-04`;
    const marchKey = `${fyStartYear + 1}-03`;
    const openingMarchKey = `${fyStartYear}-03`; // previous FY March snapshot = opening balance
    const todayYM = today().slice(0, 7);
    const isCurrentFY = todayYM >= aprilKey && todayYM <= marchKey;

    const openingNW = nwForMonth(openingMarchKey);
    const closingNW =
      isCurrentFY && metrics.netWorth > 0 ? metrics.netWorth : nwForMonth(marchKey);

    const change = closingNW - openingNW;
    const changePct =
      openingNW !== 0 ? (change / Math.abs(openingNW)) * 100 : closingNW > 0 ? 100 : 0;

    let prevVal = openingNW;
    const chartData = fyMonths
      .map((ym, idx) => {
        if (isCurrentFY && ym > todayYM) return null;
        const nw = ym === todayYM && metrics.netWorth > 0 ? metrics.netWorth : nwForMonth(ym);
        const delta = nw - prevVal;
        prevVal = nw;
        return {
          month: MONTH_NAMES[idx],
          ym,
          value: nw,
          delta,
        };
      })
      .filter((d): d is { month: string; ym: string; value: number; delta: number } => d !== null);

    const values = chartData.map((d) => d.value);
    const peakNW = values.length > 0 ? Math.max(...values) : closingNW;
    const lowestNW = values.length > 0 ? Math.min(...values) : openingNW;

    return { openingNW, closingNW, change, changePct, chartData, isCurrentFY, peakNW, lowestNW };
  }, [nwForMonth, metrics.netWorth, selectedFY, fyMonths, fyStartYear]);

  /* ═══════════════════════════════════════════════════════════════
     (b) INCOME SUMMARY
     ═══════════════════════════════════════════════════════════════ */
  const incomeData = useMemo(() => {
    const isTransfer = (cat: string) =>
      cat === "Transfer" || cat === "Self Transfer" || cat === "Self-Transfer";

    const incomeLedger = (state.income || []).filter(
      (i: any) => i.date && i.date >= fyStart && i.date <= fyEnd
    );
    const ledgerTotal = incomeLedger.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);

    const creditTxns = (state.transactions || []).filter(
      (t: any) =>
        t.date &&
        t.date >= fyStart &&
        t.date <= fyEnd &&
        t.type === "credit" &&
        !isTransfer(t.category)
    );
    const creditTotal = creditTxns.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

    const salarySlipsInFY = (state.salarySlips || []).filter((s: any) => {
      const d = s.date || (s.slipMonth ? `${s.slipMonth}-01` : "");
      return d && d >= fyStart && d <= fyEnd;
    });
    const salarySlipsTotal = salarySlipsInFY.reduce(
      (s: number, sl: any) =>
        s + Number(sl.netSalary ?? sl.inHand ?? sl.takeHome ?? sl.grossSalary ?? 0),
      0
    );

    const totalPrimaryIncome =
      ledgerTotal > 0 ? ledgerTotal : creditTotal > 0 ? creditTotal : salarySlipsTotal;

    const catMap: Record<string, number> = {};
    const monthlyMap: Record<string, number> = {};

    if (ledgerTotal > 0) {
      incomeLedger.forEach((e: any) => {
        const cat = e.category || e.source || "Other";
        catMap[cat] = (catMap[cat] || 0) + Number(e.amount || 0);
        if (e.date) {
          const ym = e.date.slice(0, 7);
          monthlyMap[ym] = (monthlyMap[ym] || 0) + Number(e.amount || 0);
        }
      });
    } else if (creditTotal > 0) {
      creditTxns.forEach((e: any) => {
        const cat = e.category || e.source || "Other";
        catMap[cat] = (catMap[cat] || 0) + Number(e.amount || 0);
        if (e.date) {
          const ym = e.date.slice(0, 7);
          monthlyMap[ym] = (monthlyMap[ym] || 0) + Number(e.amount || 0);
        }
      });
    } else if (salarySlipsTotal > 0) {
      salarySlipsInFY.forEach((sl: any) => {
        const amt = Number(sl.netSalary ?? sl.inHand ?? sl.takeHome ?? sl.grossSalary ?? 0);
        const cat = sl.employer ? `Salary (${sl.employer})` : "Salary";
        catMap[cat] = (catMap[cat] || 0) + amt;
        const ym = sl.slipMonth || (sl.date ? sl.date.slice(0, 7) : "");
        if (ym) {
          monthlyMap[ym] = (monthlyMap[ym] || 0) + amt;
        }
      });
    }

    // Rental receipts (manual property ledger receipts not linked to bank)
    const rentalReceiptsInFY = (state.rentalProperties || []).flatMap((p: any) =>
      (p.receipts || []).filter((r: any) => r.date && r.date >= fyStart && r.date <= fyEnd)
    );

    const alreadyHasRent = Object.keys(catMap).some((k) => {
      const lower = k.toLowerCase();
      return lower.includes("rental") || lower === "rent";
    });

    const rentalIncomeToAdd = alreadyHasRent
      ? 0
      : (ledgerTotal > 0 || salarySlipsTotal > 0
          ? rentalReceiptsInFY
          : rentalReceiptsInFY.filter((r: any) => !String(r.id || "").startsWith("bank-"))
        ).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

    if (rentalIncomeToAdd > 0) {
      catMap["Rental Income"] = (catMap["Rental Income"] || 0) + rentalIncomeToAdd;
      rentalReceiptsInFY.forEach((r: any) => {
        if (
          r.date &&
          (ledgerTotal > 0 || salarySlipsTotal > 0 || !String(r.id || "").startsWith("bank-"))
        ) {
          const ym = r.date.slice(0, 7);
          monthlyMap[ym] = (monthlyMap[ym] || 0) + Number(r.amount || 0);
        }
      });
    }

    // Standalone dividends (recorded in dividend tracker not linked to bank)
    const dividendsInFY = (state.dividends || []).filter(
      (d: any) => d.date && d.date >= fyStart && d.date <= fyEnd
    );
    const alreadyHasDividends = Object.keys(catMap).some((k) => {
      const lower = k.toLowerCase();
      return lower.includes("dividend");
    });
    const dividendIncomeToAdd = alreadyHasDividends
      ? 0
      : (ledgerTotal > 0 || salarySlipsTotal > 0
          ? dividendsInFY
          : dividendsInFY.filter((d: any) => !String(d.id || "").startsWith("bank-"))
        ).reduce((s: number, d: any) => s + Number(d.amount || 0), 0);

    if (dividendIncomeToAdd > 0) {
      catMap["Dividends"] = (catMap["Dividends"] || 0) + dividendIncomeToAdd;
      dividendsInFY.forEach((d: any) => {
        if (
          d.date &&
          (ledgerTotal > 0 || salarySlipsTotal > 0 || !String(d.id || "").startsWith("bank-"))
        ) {
          const ym = d.date.slice(0, 7);
          monthlyMap[ym] = (monthlyMap[ym] || 0) + Number(d.amount || 0);
        }
      });
    }

    const breakdown = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const totalIncome = totalPrimaryIncome + rentalIncomeToAdd + dividendIncomeToAdd;

    const monthlyChart = fyMonths.map((ym, idx) => ({
      month: MONTH_NAMES[idx],
      income: monthlyMap[ym] || 0,
    }));

    return { totalIncome, breakdown, monthlyChart, monthlyMap, streamCount: breakdown.length };
  }, [
    state.income,
    state.transactions,
    state.salarySlips,
    state.rentalProperties,
    state.dividends,
    selectedFY,
    fyStart,
    fyEnd,
    fyMonths,
  ]);

  /* ═══════════════════════════════════════════════════════════════
     (c) EXPENSE SUMMARY
     ═══════════════════════════════════════════════════════════════ */
  const expenseData = useMemo(() => {
    const isTransfer = (cat: string) =>
      cat === "Transfer" || cat === "Self Transfer" || cat === "Self-Transfer";

    const debitTxns = (state.transactions || []).filter(
      (t: any) =>
        t.date &&
        t.date >= fyStart &&
        t.date <= fyEnd &&
        t.type === "debit" &&
        !isTransfer(t.category) &&
        t.category !== "Investment"
    );
    const txnExpense = debitTxns.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

    const hasRentDebitTxn = debitTxns.some(
      (t: any) =>
        (t.category || "").toLowerCase() === "rent" || (t.category || "").toLowerCase() === "rental"
    );

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

    const rentPaidToAdd = !hasRentDebitTxn ? rentPaid : 0;
    const totalExpense = txnExpense + rentPaidToAdd;

    const catMap: Record<string, number> = {};
    debitTxns.forEach((t: any) => {
      const cat = t.category || "Uncategorized";
      catMap[cat] = (catMap[cat] || 0) + Number(t.amount || 0);
    });
    if (rentPaidToAdd > 0) {
      catMap["Rent"] = (catMap["Rent"] || 0) + rentPaidToAdd;
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
    if (rentPaidToAdd > 0) {
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
    }

    const divisor = isPastFY ? 12 : Math.max(1, fyMonthsElapsed || 12);
    const avgMonthly = totalExpense / divisor;
    const dailyBurn = totalExpense / (divisor * 30.4167);

    const highestExpense =
      debitTxns.length > 0
        ? debitTxns.reduce(
            (max: any, t: any) => (Number(t.amount || 0) > Number(max.amount || 0) ? t : max),
            debitTxns[0]
          )
        : null;

    return { totalExpense, breakdown, top5, avgMonthly, dailyBurn, highestExpense, monthlyMap };
  }, [
    state.transactions,
    state.rentedProperties,
    selectedFY,
    fyStart,
    fyEnd,
    fyMonthsElapsed,
    isPastFY,
  ]);

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
      .reduce(
        (sum: number, m: any) =>
          sum +
          Number(
            m.invested ||
              m.investedValue ||
              (m.buyNav ? Number(m.units || 0) * Number(m.buyNav || 0) : 0)
          ),
        0
      );

    const fdAdds = (state.fixedDeposits || [])
      .filter((fd: any) => fd.startDate && fd.startDate >= fyStart && fd.startDate <= fyEnd)
      .reduce((sum: number, fd: any) => sum + Number(fd.principal || 0), 0);

    const ppfFromTxns = (state.ppf || []).reduce(
      (sum: number, p: any) =>
        sum +
        (p.transactions || [])
          .filter(
            (t: any) => t.date && t.date >= fyStart && t.date <= fyEnd && t.type !== "withdrawal"
          )
          .reduce((s: number, t: any) => s + Number(t.amount || 0), 0),
      0
    );
    const ppfFromLedger = (state.ppfLedger || [])
      .filter((t: any) => t.date && t.date >= fyStart && t.date <= fyEnd && t.type !== "withdrawal")
      .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
    const ppfAdds = ppfFromTxns > 0 ? ppfFromTxns : ppfFromLedger;

    const bondAdds = (state.bonds || [])
      .filter((b: any) => b.orderDate && b.orderDate >= fyStart && b.orderDate <= fyEnd)
      .reduce(
        (sum: number, b: any) =>
          sum +
          Number(
            b.totalInvestmentAmount ||
              b.totalPrincipalAmount ||
              Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0) ||
              b.faceValue ||
              0
          ),
        0
      );

    const govtSchemeAdds = (state.govtSchemes || [])
      .filter((g: any) => g.startDate && g.startDate >= fyStart && g.startDate <= fyEnd)
      .reduce((sum: number, g: any) => sum + Number(g.currentBalance || g.depositedAmount || 0), 0);

    const goldAdds = (state.goldHoldings || [])
      .filter((h: any) => h.purchaseDate && h.purchaseDate >= fyStart && h.purchaseDate <= fyEnd)
      .reduce((sum: number, h: any) => sum + Number(h.investedAmount || h.purchasePrice || 0), 0);

    const sipTotal =
      (state.sips || []).reduce((s: number, sip: any) => s + Number(sip.amount || 0), 0) * 12;

    const totalNewInvestments =
      stockBuys + mfBuys + fdAdds + ppfAdds + bondAdds + govtSchemeAdds + goldAdds;

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
      const isLtcg = s.isLtcg ?? s.isLongTerm ?? isLongTerm(s.buyDate, s.sellDate, 12);
      if (isLtcg) ltcg += gain;
      else stcg += gain;
    });

    const mfCatIdx = new Map<string, string>();
    (state.mutualFunds || []).forEach((mf: any) => {
      if (mf.category) {
        const key = `${(mf.name || mf.scheme || "").trim().toLowerCase()}|${mf.owner || "self"}`;
        if (!mfCatIdx.has(key)) mfCatIdx.set(key, mf.category);
      }
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
      const key = `${(m.name || m.scheme || "").trim().toLowerCase()}|${m.owner || "self"}`;
      const resolvedCategory = m.category || mfCatIdx.get(key) || "";
      const isEquity = isEquityMF({ ...m, category: resolvedCategory });

      let long: boolean;
      if (m.isLtcg !== undefined) {
        long = Boolean(m.isLtcg);
      } else if (m.isLongTerm !== undefined) {
        long = Boolean(m.isLongTerm);
      } else if (isEquity) {
        long = isLongTerm(m.buyDate, m.sellDate, 12);
      } else {
        const cleanBuy = String(m.buyDate || "").trim();
        const postApr2023 = cleanBuy >= "2023-04-01";
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
      bondAdds,
      govtSchemeAdds,
      goldAdds,
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
    state.ppf,
    state.ppfLedger,
    state.bonds,
    state.govtSchemes,
    state.goldHoldings,
    state.sips,
    state.stockSells,
    state.mfSells,
    selectedFY,
    fyStart,
    fyEnd,
  ]);

  const monthlySavingsTrend = useMemo(() => {
    return fyMonths.map((ym) => {
      const inc = incomeData.monthlyMap[ym] || 0;
      const exp = expenseData.monthlyMap[ym] || 0;
      return inc - exp;
    });
  }, [incomeData.monthlyMap, expenseData.monthlyMap, fyMonths]);

  /* ═══════════════════════════════════════════════════════════════
     YEAR-OVER-YEAR COMPARISON
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
    const prevCreditTotal = prevCreditTxns.reduce(
      (s: number, t: any) => s + Number(t.amount || 0),
      0
    );

    const prevSalarySlipsInFY = (state.salarySlips || []).filter((s: any) => {
      const d = s.date || (s.slipMonth ? `${s.slipMonth}-01` : "");
      return d && d >= prevFyStart && d <= prevFyEnd;
    });
    const prevSalaryTotal = prevSalarySlipsInFY.reduce(
      (s: number, sl: any) =>
        s + Number(sl.netSalary ?? sl.inHand ?? sl.takeHome ?? sl.grossSalary ?? 0),
      0
    );

    const prevPrimaryIncome =
      prevLedgerTotal > 0
        ? prevLedgerTotal
        : prevCreditTotal > 0
        ? prevCreditTotal
        : prevSalaryTotal;

    const prevRentalReceipts = (state.rentalProperties || []).flatMap((p: any) =>
      (p.receipts || []).filter((r: any) => r.date && r.date >= prevFyStart && r.date <= prevFyEnd)
    );
    const prevRentalIncome = (
      prevLedgerTotal > 0 || prevSalaryTotal > 0
        ? prevRentalReceipts
        : prevRentalReceipts.filter((r: any) => !String(r.id || "").startsWith("bank-"))
    ).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);

    const prevDividends = (state.dividends || []).filter(
      (d: any) => d.date && d.date >= prevFyStart && d.date <= prevFyEnd
    );
    const prevDividendIncome = (
      prevLedgerTotal > 0 || prevSalaryTotal > 0
        ? prevDividends
        : prevDividends.filter((d: any) => !String(d.id || "").startsWith("bank-"))
    ).reduce((s: number, d: any) => s + Number(d.amount || 0), 0);

    const prevIncome = prevPrimaryIncome + prevRentalIncome + prevDividendIncome;

    const prevDebitTxns = (state.transactions || []).filter(
      (t: any) =>
        t.date &&
        t.date >= prevFyStart &&
        t.date <= prevFyEnd &&
        t.type === "debit" &&
        !isTransfer(t.category) &&
        t.category !== "Investment"
    );
    const prevTxnExpense = prevDebitTxns.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
    const prevHasRentDebit = prevDebitTxns.some(
      (t: any) =>
        (t.category || "").toLowerCase() === "rent" || (t.category || "").toLowerCase() === "rental"
    );
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
    const prevExpense = prevTxnExpense + (!prevHasRentDebit ? prevRentPaid : 0);

    const prevClosingNW = netWorthData.openingNW;
    const prevOpeningNW = nwForMonth(`${fyStartYear - 1}-03`);
    const prevNWChange = prevClosingNW - prevOpeningNW;

    const hasPrevData =
      prevIncome > 0 || prevExpense > 0 || (prevOpeningNW > 0 && prevClosingNW > 0);

    const pctDelta = (curr: number, prev: number) => {
      if (prev !== 0) return ((curr - prev) / Math.abs(prev)) * 100;
      return curr !== 0 ? (curr > 0 ? 100 : -100) : 0;
    };

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
    state.salarySlips,
    state.rentalProperties,
    state.rentedProperties,
    state.dividends,
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
    let equityMF = 0;
    let debtMF = 0;

    (state.mutualFunds || []).forEach((m: any) => {
      const liveNav = Number(m.currentNav || 0);
      const fallbackNav =
        liveNav ||
        Number(m.buyNav || 0) ||
        (Number(m.units || 1) > 0 ? Number(m.invested || 0) / Number(m.units || 1) : 0);
      const val = Number(m.units || 0) * fallbackNav;
      const cat = (m.category || m.type || "").toLowerCase();
      const isDebt =
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
        ].some((k) => cat.includes(k));
      if (isDebt) {
        debtMF += val;
      } else {
        equityMF += val;
      }
    });

    const equity = (metrics.stockValue || 0) + equityMF;
    const debt =
      (metrics.fdValue || 0) +
      (metrics.rdValue || 0) +
      (metrics.bondValue || 0) +
      (metrics.ppfValue || 0) +
      (metrics.npsValue || 0) +
      (metrics.epfValue || 0) +
      (metrics.licValue || 0) +
      (metrics.investmentValue || 0) +
      (metrics.govtSchemesValue || 0) +
      debtMF;
    const cash = (metrics.cashInBanks || 0) + (metrics.prepaidValue || 0);
    const realEstate = (metrics.realEstateAsset || 0) + (metrics.rentalPropertiesAsset || 0);
    const gold = metrics.goldValue || 0;
    const others =
      (metrics.vehicleAsset || 0) +
      (metrics.informalLentValue || 0) +
      (metrics.loansGivenValue || 0) +
      (metrics.rentedDepositAsset || 0);

    const alloc = [
      { name: "Equity", value: Math.round(equity) },
      { name: "Debt", value: Math.round(debt) },
      { name: "Cash", value: Math.round(cash) },
      { name: "Real Estate", value: Math.round(realEstate) },
      { name: "Gold", value: Math.round(gold) },
      { name: "Others", value: Math.round(others) },
    ].filter((a) => a.value > 0);

    const total = alloc.reduce((s, a) => s + a.value, 0);
    const equityPct = total > 0 ? (equity / total) * 100 : 0;

    let riskProfile = "Balanced";
    if (equityPct >= 70) riskProfile = "Aggressive Growth";
    else if (equityPct >= 50) riskProfile = "Growth Oriented";
    else if (equityPct >= 30) riskProfile = "Balanced";
    else riskProfile = "Conservative";

    return { alloc, total, riskProfile, equityPct };
  }, [metrics, state.mutualFunds]);

  /* ═══════════════════════════════════════════════════════════════
     (f) DEBT SUMMARY
     ═══════════════════════════════════════════════════════════════ */
  const debtData = useMemo(() => {
    const loans = state.loansTaken || [];
    const activeLoans = loans.filter(
      (l: any) =>
        (l.status || "active").toLowerCase() !== "closed" &&
        loanOutstanding(l) > 0 &&
        Number(l.monthsRemaining ?? 1) > 0
    );

    const totalOutstanding = activeLoans.reduce((s: number, l: any) => s + loanOutstanding(l), 0);
    const totalPrincipal = loans.reduce((s: number, l: any) => s + Number(l.principal || 0), 0);
    const totalEMI = activeLoans.reduce(
      (s: number, l: any) => s + Number(l.emi || l.monthlyPayment || 0),
      0
    );
    const annualEMI = totalEMI * 12;

    const interestPortion = activeLoans.reduce(
      (s: number, l: any) =>
        s + loanOutstanding(l) * (Number(l.interestRate || l.rate || 0) / 100),
      0
    );
    const principalRepaid = Math.max(0, annualEMI - interestPortion);

    const ccOutstanding = (state.creditCards || []).reduce(
      (s: number, c: any) => s + Number(c.outstanding || 0),
      0
    );

    const dtiRatio =
      incomeData.totalIncome > 0
        ? (annualEMI / incomeData.totalIncome) * 100
        : annualEMI > 0
        ? 100
        : 0;

    return {
      totalLoanCount: loans.length,
      activeLoanCount: activeLoans.length,
      loanCount: activeLoans.length,
      totalOutstanding,
      totalPrincipal,
      totalEMI,
      annualEMI,
      principalRepaid,
      interestPortion,
      ccOutstanding,
      dtiRatio,
    };
  }, [state.loansTaken, state.creditCards, incomeData.totalIncome]);

  /* ═══════════════════════════════════════════════════════════════
     (g) INSURANCE COVERAGE
     ═══════════════════════════════════════════════════════════════ */
  const insuranceData = useMemo(() => {
    const isPolicyActive = (p: any) => {
      const st = (p.status || "active").toLowerCase();
      return st !== "lapsed" && st !== "matured" && st !== "surrendered";
    };

    const licPolicies = (state.lic || []).filter(isPolicyActive);
    const termPlans = (state.termPlans || []).filter(isPolicyActive);
    const investPlans = (state.investmentPlans || []).filter(isPolicyActive);
    const healthPolicies = (state.healthInsurance || []).filter(isPolicyActive);

    const licCover = licPolicies.reduce((s: number, p: any) => s + Number(p.sumAssured || 0), 0);
    const termCover = termPlans.reduce((s: number, p: any) => s + Number(p.coverAmount || 0), 0);
    const totalLifeCover = licCover + termCover;

    const licPremiums = licPolicies.reduce((s: number, p: any) => {
      const txnPremium = (p.transactions || [])
        .filter((t: any) => t.date && t.date >= fyStart && t.date <= fyEnd)
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      return (
        s +
        (txnPremium > 0
          ? txnPremium
          : annualizePremium(p.premium, p.premiumFrequency, p.annualPremium))
      );
    }, 0);

    const termPremiums = termPlans.reduce(
      (s: number, p: any) =>
        s + annualizePremium(p.premium, p.premiumFrequency, p.annualPremium),
      0
    );
    const investPremiums = investPlans.reduce(
      (s: number, p: any) =>
        s + annualizePremium(p.premium, p.premiumFrequency, p.annualPremium),
      0
    );
    const healthPremiums = healthPolicies.reduce(
      (s: number, p: any) =>
        s + annualizePremium(p.premium, p.premiumFrequency, p.annualPremium),
      0
    );
    const totalPremiums = licPremiums + termPremiums + investPremiums + healthPremiums;

    const adequacyRatio = incomeData.totalIncome > 0 ? totalLifeCover / incomeData.totalIncome : 0;

    return {
      licCount: licPolicies.length,
      termCount: termPlans.length,
      investCount: investPlans.length,
      healthCount: healthPolicies.length,
      totalLifeCover,
      totalPremiums,
      adequacyRatio,
    };
  }, [
    state.lic,
    state.termPlans,
    state.investmentPlans,
    state.healthInsurance,
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

    const directTaxPaid = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    const byType: Record<string, number> = {};
    payments.forEach((p: any) => {
      const t = p.type || "Other";
      byType[t] = (byType[t] || 0) + Number(p.amount || 0);
    });

    const salaryTdsPaid = (state.salarySlips || [])
      .filter((s: any) => {
        const ym = s.slipMonth || (s.date ? s.date.slice(0, 7) : "");
        return ym && ym >= fyStart.slice(0, 7) && ym <= fyEnd.slice(0, 7);
      })
      .reduce(
        (sum: number, s: any) =>
          sum + Number(s.tdsDeduction || s.tds || 0) + Number(s.incomeTax || 0),
        0
      );

    if (salaryTdsPaid > 0) {
      byType["Salary TDS"] = (byType["Salary TDS"] || 0) + salaryTdsPaid;
    }

    const totalTaxPaid = directTaxPaid + salaryTdsPaid;

    const regime = state.profile?.regime || "new";
    const effectiveRate =
      incomeData.totalIncome > 0 ? (totalTaxPaid / incomeData.totalIncome) * 100 : 0;

    return {
      totalTaxPaid,
      byType,
      regime,
      effectiveRate,
      paymentCount: payments.length + (salaryTdsPaid > 0 ? 1 : 0),
    };
  }, [
    state.taxPayments,
    state.salarySlips,
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

    const sumTarget =
      metrics.totalGoalTarget > 0
        ? metrics.totalGoalTarget
        : goals.reduce((s: number, g: any) => s + Number(g.targetAmount || g.target || 0), 0);
    const sumSaved =
      metrics.totalGoalSaved > 0
        ? metrics.totalGoalSaved
        : goals.reduce(
            (s: number, g: any) => s + Number(g.savedAmount || g.currentAmount || g.saved || 0),
            0
          );

    const overallPct = sumTarget > 0 ? Math.min((sumSaved / sumTarget) * 100, 100) : 0;

    return { totalGoals, completed, topGoals, overallPct, sumTarget, sumSaved };
  }, [state.goals, metrics.totalGoalTarget, metrics.totalGoalSaved]);

  /* ═══════════════════════════════════════════════════════════════
     (j) KEY HIGHLIGHTS & FINANCIAL ACHIEVEMENTS
     ═══════════════════════════════════════════════════════════════ */
  const highlights = useMemo(() => {
    const items: {
      icon: any;
      category: "Milestone" | "Win" | "Prudence" | "Insight";
      text: React.ReactNode;
      color: string;
    }[] = [];

    if (expenseData.highestExpense) {
      const e = expenseData.highestExpense;
      items.push({
        icon: Receipt,
        category: "Insight",
        text: (
          <>
            Highest single expense: <Money value={e.amount} variant="full" /> —{" "}
            {e.description || e.note || e.category || "Transaction"} ({e.date || ""})
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
          amount: Number(
            m.invested ||
              m.investedValue ||
              (m.buyNav ? Number(m.units || 0) * Number(m.buyNav || 0) : 0)
          ),
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
    (state.bonds || [])
      .filter((b: any) => b.orderDate && b.orderDate >= fyStart && b.orderDate <= fyEnd)
      .forEach((b: any) =>
        allInvestments.push({
          amount: Number(
            b.totalInvestmentAmount ||
              b.totalPrincipalAmount ||
              Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0) ||
              b.faceValue ||
              0
          ),
          name: b.name || b.issuer || "Bond",
        })
      );

    if (allInvestments.length > 0) {
      const largest = allInvestments.reduce(
        (max, i) => (i.amount > max.amount ? i : max),
        allInvestments[0]
      );
      items.push({
        icon: TrendingUp,
        category: "Win",
        text: (
          <>
            Largest investment: <Money value={largest.amount} variant="full" /> in {largest.name}
          </>
        ),
        color: THEME.sage,
      });
    }

    const stockPnLs = (state.stocks || [])
      .filter((s: any) => Number(s.qty || 0) > 0)
      .map((s: any) => {
        const invested = Number(s.invested || (s.avgPrice || 0) * (s.qty || 0) || 0);
        const yfSym = `${(s.symbol || "").replace(/\.(NS|BO)$/i, "")}.${(s.exchange || "NSE") === "BSE" ? "BO" : "NS"}`;
        const md = marketData?.[yfSym];
        const livePrice = md?.price ?? Number(s.currentPrice || s.avgPrice || 0);
        const current = Number(s.currentValue || livePrice * Number(s.qty || 0) || 0);
        const gain = current - invested;
        const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
        return { name: s.name || s.symbol || "Stock", gain, gainPct, invested };
      });
    const mfPnLs = (state.mutualFunds || [])
      .filter((m: any) => Number(m.units || 0) > 0)
      .map((m: any) => {
        const invested = Number(
          m.invested ||
            m.investedValue ||
            (m.buyNav ? Number(m.units || 0) * Number(m.buyNav || 0) : 0)
        );
        const liveNav = Number(m.currentNav || 0);
        const currentNav = liveNav || Number(m.buyNav || 0);
        const current = Number(m.currentValue || currentNav * (m.units || 0) || 0);
        const gain = current - invested;
        const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
        return { name: m.name || m.scheme || "MF", gain, gainPct, invested };
      });
    const allPnL = [...stockPnLs, ...mfPnLs].filter((p) => p.gain > 0 && p.invested > 0);
    if (allPnL.length > 0) {
      const best = allPnL.reduce((max, p) => (p.gainPct > max.gainPct ? p : max), allPnL[0]);
      items.push({
        icon: Trophy,
        category: "Win",
        text: `Best performer: ${best.name} (+${best.gainPct.toFixed(1)}%)`,
        color: THEME.sage,
      });
    }

    const milestones = [
      100000000, 50000000, 25000000, 10000000, 5000000, 2500000, 1000000, 500000, 100000,
    ];
    const closingNW = Number(netWorthData.closingNW || 0);
    const openingNW = Number(netWorthData.openingNW || 0);
    if (closingNW > 0) {
      for (const m of milestones) {
        if (closingNW >= m && openingNW < m) {
          const label = m >= 10000000 ? `${m / 10000000}Cr` : `${m / 100000}L`;
          items.push({
            icon: Target,
            category: "Milestone",
            text: `Net worth crossed the ₹${label} milestone this FY`,
            color: THEME.accent,
          });
          break;
        }
      }
    }

    if (goalsData.completed > 0) {
      items.push({
        icon: CheckCircle2,
        category: "Milestone",
        text: `${goalsData.completed} goal${goalsData.completed > 1 ? "s" : ""} completed this FY`,
        color: THEME.sage,
      });
    }

    const closedLoans = (state.loansTaken || []).filter(
      (l: any) =>
        (l.status || "").toLowerCase() === "closed" ||
        (Number(l.principal || 0) > 0 && loanOutstanding(l) === 0)
    );
    if (closedLoans.length > 0) {
      items.push({
        icon: Unlock,
        category: "Milestone",
        text: `${closedLoans.length} loan${closedLoans.length > 1 ? "s" : ""} fully repaid`,
        color: THEME.sage,
      });
    }

    if (savingsData.savingsRate >= 30) {
      items.push({
        icon: Flame,
        category: "Prudence",
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
    state.bonds,
    state.loansTaken,
    netWorthData,
    goalsData,
    savingsData,
    marketData,
    selectedFY,
    fyStart,
    fyEnd,
  ]);

  /* ═══════════════════════════════════════════════════════════════
     (k) COMPOSITE 360° FINANCIAL HEALTH SCORE
     ═══════════════════════════════════════════════════════════════ */
  const healthScore = useMemo(() => {
    // 1. Savings score (0-25)
    let sScore = 0;
    if (savingsData.savingsRate >= 35) sScore = 25;
    else if (savingsData.savingsRate >= 20) sScore = 20;
    else if (savingsData.savingsRate >= 10) sScore = 15;
    else if (savingsData.savingsRate > 0) sScore = 8;

    // 2. Debt-to-income score (0-25)
    let dScore = 25;
    if (debtData.annualEMI > 0 && incomeData.totalIncome === 0) {
      dScore = 5;
    } else if (debtData.dtiRatio > 50) {
      dScore = 5;
    } else if (debtData.dtiRatio > 35) {
      dScore = 12;
    } else if (debtData.dtiRatio > 20) {
      dScore = 20;
    }

    // 3. Insurance cover score (0-25)
    let iScore = 0;
    if (insuranceData.adequacyRatio >= 10) iScore = 25;
    else if (insuranceData.adequacyRatio >= 5) iScore = 18;
    else if (insuranceData.adequacyRatio >= 2) iScore = 10;
    else if (insuranceData.totalLifeCover > 0) iScore = 5;

    // 4. Goal momentum score (0-25)
    let gScore = 20;
    if (goalsData.totalGoals > 0) {
      if (goalsData.overallPct >= 80) gScore = 25;
      else if (goalsData.overallPct >= 50) gScore = 20;
      else if (goalsData.overallPct >= 25) gScore = 12;
      else gScore = 8;
    }

    const total = Math.min(100, Math.max(0, sScore + dScore + iScore + gScore));
    let tier = "Exceptional";
    let tierColor = THEME.sage;
    let persona = "Wealth Compounder";

    if (total >= 85) {
      tier = "AAA · Exceptional";
      tierColor = THEME.sage;
      persona = "Financial Master";
    } else if (total >= 70) {
      tier = "AA · Strong";
      tierColor = THEME.accent;
      persona = "Active Wealth Builder";
    } else if (total >= 50) {
      tier = "A · Moderate";
      tierColor = THEME.gold;
      persona = "Steady Accumulator";
    } else {
      tier = "B · Caution";
      tierColor = THEME.rust;
      persona = "Needs Optimization";
    }

    return { total, tier, tierColor, persona, sScore, dScore, iScore, gScore };
  }, [
    savingsData.savingsRate,
    debtData.dtiRatio,
    debtData.annualEMI,
    incomeData.totalIncome,
    insuranceData.adequacyRatio,
    insuranceData.totalLifeCover,
    goalsData,
  ]);

  /* ═══════════════════════════════════════════════════════════════
     EXPORT CSV HANDLER
     ═══════════════════════════════════════════════════════════════ */
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

  const nwChangeColor = netWorthData.change >= 0 ? THEME.sage : THEME.rust;
  const savingsRateColor =
    savingsData.savingsRate >= 20
      ? THEME.sage
      : savingsData.savingsRate >= 10
        ? THEME.gold
        : THEME.rust;
  const nwTrendData = netWorthData.chartData.map((d) => d.value);

  return (
    <div className="annual-report">
      {/* Print-only branding header */}
      <div className="print-only-header" style={{ display: "none" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <img
            src="/logo-horizontal.png"
            alt="ArthaDrishti"
            style={{ height: 44, width: "auto" }}
          />
          <div style={{ textAlign: "right", fontSize: 11, color: "#64748b" }}>
            <div>{fyLabel} Annual Financial Review</div>
            <div>{formatDateReadable(fyStart)} — {formatDateReadable(fyEnd)}</div>
          </div>
        </div>
      </div>

      {/* Header & Executive Controls */}
      <SectionTitle
        sub="Comprehensive financial year summary — print or save as PDF"
        rightElement={
          <div className="no-print" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <select
                className="form-input"
                value={selectedFY}
                onChange={(e) => setSelectedFY(e.target.value)}
                aria-label="Select financial year"
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  minWidth: 130,
                  borderRadius: 10,
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                {availableFYs.map((fy) => (
                  <option key={fy} value={fy}>
                    {getFYLabel(fy)}
                  </option>
                ))}
              </select>
            </div>
            {hasAnyData && (
              <Button
                variant="ghost"
                icon={<Download size={15} />}
                onClick={handleExportCSV}
                style={{ borderRadius: 10, padding: "8px 14px", fontSize: 13 }}
              >
                CSV
              </Button>
            )}
            <Button
              variant="accent"
              icon={<Printer size={15} />}
              onClick={() => window.print()}
              style={{ borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 700 }}
            >
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
          {/* ─── Executive Financial Summary Hero Card ────────────────── */}
          <Card
            variant="base"
            style={{
              padding: "clamp(24px, 3.5vw, 36px)",
              marginBottom: 20,
              position: "relative",
              overflow: "hidden",
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--surface-0) 96%, var(--t-accent) 4%), var(--surface-0))",
              border: `1px solid ${THEME.line}`,
              borderTop: `4px solid ${THEME.accent}`,
              borderRadius: "var(--radius-xl)",
              boxShadow: "0 12px 36px -10px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: "radial-gradient(var(--t-line) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
                opacity: 0.25,
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
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.14em",
                      color: THEME.muted,
                    }}
                  >
                    Executive Financial Summary
                  </span>
                  {netWorthData.isCurrentFY ? (
                    <Badge variant="gold" style={{ fontSize: 9.5, padding: "2px 8px" }}>
                      Ongoing FY
                    </Badge>
                  ) : (
                    <Badge variant="muted" style={{ fontSize: 9.5, padding: "2px 8px" }}>
                      Closed FY
                    </Badge>
                  )}
                  <Badge variant="accent" style={{ fontSize: 9.5, padding: "2px 8px" }}>
                    {healthScore.persona}
                  </Badge>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(34px, 4.5vw, 54px)",
                    fontWeight: 900,
                    letterSpacing: "-0.04em",
                    lineHeight: 1.05,
                    color: THEME.ink,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {fyLabel}
                </div>
                <div style={{ fontSize: 13, marginTop: 6, color: THEME.muted, fontWeight: 500 }}>
                  {formatDateReadable(fyStart)} &mdash; {formatDateReadable(fyEnd)}
                </div>
              </div>

              {/* Summary Badges Dock */}
              <div
                style={{
                  display: "flex",
                  gap: 18,
                  flexWrap: "wrap",
                  background: "var(--surface-1)",
                  padding: "16px 22px",
                  borderRadius: "var(--radius-lg)",
                  border: `1px solid ${THEME.line}`,
                  alignItems: "center",
                }}
              >
                <div style={{ textAlign: "center", minWidth: 105 }}>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    Net Worth growth
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 22,
                      fontWeight: 900,
                      color: netWorthData.change >= 0 ? THEME.sage : THEME.rust,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {netWorthData.change >= 0 ? "+" : ""}
                    {netWorthData.changePct.toFixed(1)}%
                  </div>
                </div>

                <div style={{ width: 1, height: 36, background: THEME.line }} />

                <div style={{ textAlign: "center", minWidth: 105 }}>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    Avg Savings rate
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 22,
                      fontWeight: 900,
                      color: savingsData.savingsRate >= 20 ? THEME.sage : THEME.gold,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {savingsData.savingsRate.toFixed(0)}%
                  </div>
                </div>

                <div style={{ width: 1, height: 36, background: THEME.line }} />

                <div style={{ textAlign: "center", minWidth: 105 }}>
                  <div
                    style={{
                      fontSize: 10.5,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontWeight: 700,
                      marginBottom: 4,
                    }}
                  >
                    Health Index
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 22,
                      fontWeight: 900,
                      color: healthScore.tierColor,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {healthScore.total}/100
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* ─── Year-over-Year Comparative Bento ─────────────────────── */}
          {yoyData.hasPrevData && (
            <Card style={{ padding: 22, marginBottom: 20 }}>
              <CardHeading
                icon={TrendingUp}
                title={`vs ${getFYLabel(prevFY)} YoY Performance`}
                badge="Comparative Analysis"
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
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
                    icon: <TrendingUp size={18} />,
                  },
                  {
                    label: "Expenses",
                    curr: expenseData.totalExpense,
                    prev: yoyData.prevExpense,
                    deltaPct: yoyData.expenseDeltaPct,
                    higherIsBetter: false,
                    icon: <Receipt size={18} />,
                  },
                  {
                    label: "Net Savings",
                    curr: savingsData.savings,
                    prev: yoyData.prevSavings,
                    deltaPct: yoyData.savingsDeltaPct,
                    higherIsBetter: true,
                    icon: <PiggyBank size={18} />,
                  },
                  {
                    label: "Net Worth Growth",
                    curr: netWorthData.change,
                    prev: yoyData.prevNWChange,
                    deltaPct: yoyData.nwChangeDeltaPct,
                    higherIsBetter: true,
                    icon: <Wallet size={18} />,
                  },
                ].map((m) => {
                  const improved = m.higherIsBetter ? m.deltaPct >= 0 : m.deltaPct <= 0;
                  const deltaColor =
                    m.deltaPct === 0 ? THEME.muted : improved ? THEME.sage : THEME.rust;
                  return (
                    <div
                      key={m.label}
                      style={{
                        padding: "16px",
                        borderRadius: 12,
                        background: "var(--surface-0)",
                        border: `1px solid ${THEME.line}`,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                          {m.label}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: `color-mix(in srgb, ${deltaColor} 12%, transparent)`,
                            color: deltaColor,
                          }}
                        >
                          {m.deltaPct >= 0 ? "+" : ""}
                          {m.deltaPct.toFixed(0)}%
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 20,
                          fontWeight: 800,
                          color: THEME.ink,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        <Money value={m.curr} variant="full" />
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, display: "flex", justifyContent: "space-between" }}>
                        <span>Prior: <Money value={m.prev} variant="full" /></span>
                        <span style={{ color: deltaColor, fontWeight: 600 }}>
                          {m.curr - m.prev >= 0 ? "+" : ""}
                          <Money value={m.curr - m.prev} variant="full" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ─── Interactive Scrollspy Tab Navigation ────────────────── */}
          <div
            className="no-print"
            style={{
              display: "flex",
              gap: 8,
              overflowX: "auto",
              padding: "10px 12px",
              marginBottom: 20,
              background: "var(--surface-0)",
              borderRadius: 14,
              border: `1px solid ${THEME.line}`,
              scrollbarWidth: "none",
            }}
          >
            {[
              { id: "nw", label: "Net Worth", icon: Wallet },
              { id: "income", label: "Income", icon: TrendingUp },
              { id: "expense", label: "Expenses", icon: Receipt },
              { id: "savings", label: "Savings", icon: PiggyBank },
              { id: "allocation", label: "Assets", icon: PieIcon },
              ...(debtData.loanCount > 0 || debtData.ccOutstanding > 0
                ? [{ id: "debt", label: "Debt", icon: Landmark }]
                : []),
              ...(insuranceData.licCount > 0 || insuranceData.termCount > 0
                ? [{ id: "insurance", label: "Insurance", icon: Shield }]
                : []),
              ...(taxData.totalTaxPaid > 0 ? [{ id: "tax", label: "Tax", icon: Receipt }] : []),
              ...(goalsData.totalGoals > 0 ? [{ id: "goals", label: "Goals", icon: Target }] : []),
              ...(highlights.length > 0 ? [{ id: "highlights", label: "Highlights", icon: Sparkles }] : []),
              { id: "health", label: "Financial Health", icon: BarChart2 },
            ].map((s) => {
              const isActive = activeSection === s.id;
              const Icon = s.icon;
              return (
                <button
                  key={s.id}
                  onClick={() => {
                    const el = document.getElementById(s.id);
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
                  className={`demat-portfolio-pill ${isActive ? "active" : ""}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 14px",
                    borderRadius: 10,
                    fontSize: 12,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                  }}
                >
                  <Icon size={14} />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>

          {/* ─── Hero Stat Cards with Micro-Sparklines ───────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <StatCard
              label="Opening Net Worth"
              value={fmtINRFull(netWorthData.openingNW)}
              numericValue={netWorthData.openingNW}
              formatValue={fmtINRFull}
              icon={<Wallet />}
              color={THEME.accent}
              sub={`Start of ${fyLabel}`}
              sparklineData={nwTrendData}
            />
            <StatCard
              label="Closing Net Worth"
              value={fmtINRFull(netWorthData.closingNW)}
              numericValue={netWorthData.closingNW}
              formatValue={fmtINRFull}
              icon={<TrendingUp />}
              color={THEME.accent}
              sub={netWorthData.isCurrentFY ? "As of today" : `End of ${fyLabel}`}
              sparklineData={nwTrendData}
            />
            <StatCard
              label="NW Change"
              value={`${netWorthData.change >= 0 ? "+" : ""}${fmtINRFull(netWorthData.change)}`}
              numericValue={netWorthData.change}
              formatValue={(n: number) => `${n >= 0 ? "+" : ""}${fmtINRFull(n)}`}
              icon={netWorthData.change >= 0 ? <ArrowUpRight /> : <ArrowDownRight />}
              color={nwChangeColor}
              sub={`${netWorthData.changePct >= 0 ? "+" : ""}${netWorthData.changePct.toFixed(1)}%`}
              subColor={nwChangeColor}
              sparklineData={nwTrendData}
            />
            <StatCard
              label="Savings Rate"
              value={`${savingsData.savingsRate.toFixed(0)}%`}
              numericValue={savingsData.savingsRate}
              formatValue={(n: number) => `${n.toFixed(0)}%`}
              icon={<PiggyBank />}
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

          {/* ─── (a) Net Worth Trend & Trajectory ─────────────────────── */}
          {netWorthData.chartData.length > 1 && (
            <Card style={{ padding: 24, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <CardHeading icon={TrendingUp} title="Net Worth Trend" id="nw" />
                <div className="no-print" style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => setNwChartMode("curve")}
                    className={`demat-portfolio-pill ${nwChartMode === "curve" ? "active" : ""}`}
                    style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8 }}
                  >
                    Valuation Curve
                  </button>
                  <button
                    onClick={() => setNwChartMode("delta")}
                    className={`demat-portfolio-pill ${nwChartMode === "delta" ? "active" : ""}`}
                    style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8 }}
                  >
                    Monthly Growth (Δ)
                  </button>
                </div>
              </div>

              {/* Peak & Lowest Markers */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 10,
                  marginBottom: 16,
                }}
              >
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
                  <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>Peak Valuation</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: THEME.sage }}><Money value={netWorthData.peakNW} variant="full" /></div>
                </div>
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
                  <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>Lowest Valuation</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}><Money value={netWorthData.lowestNW} variant="full" /></div>
                </div>
                <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
                  <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>Net Wealth Added</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: nwChangeColor }}>
                    {netWorthData.change >= 0 ? "+" : ""}<Money value={netWorthData.change} variant="full" />
                  </div>
                </div>
              </div>

              <div style={{ height: 260 }}>
                <div style={{ width: "100%", height: "100%", position: "relative" }}>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    {nwChartMode === "curve" ? (
                      <AreaChart data={netWorthData.chartData}>
                        <defs>
                          <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={THEME.accent} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={THEME.accent} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} vertical={false} opacity={0.4} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: THEME.muted }} />
                        <YAxis
                          tick={{ fontSize: 11, fill: THEME.muted }}
                          tickFormatter={(v: number) => (privacyMode ? "••••" : fmtINR(v))}
                          width={65}
                        />
                        <Tooltip content={<GlassTooltip />} cursor={{ stroke: THEME.line, strokeWidth: 1.5 }} />
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
                    ) : (
                      <BarChart data={netWorthData.chartData} barSize={26}>
                        <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} vertical={false} opacity={0.4} />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: THEME.muted }} />
                        <YAxis
                          tick={{ fontSize: 11, fill: THEME.muted }}
                          tickFormatter={(v: number) => (privacyMode ? "••••" : fmtINR(v))}
                          width={65}
                        />
                        <Tooltip content={<GlassTooltip />} cursor={{ fill: "color-mix(in srgb, var(--t-line) 15%, transparent)" }} />
                        <ReferenceLine y={0} stroke={THEME.line} />
                        <Bar
                          dataKey="delta"
                          name="Monthly Growth"
                          radius={[4, 4, 0, 0]}
                        >
                          {netWorthData.chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.delta >= 0 ? THEME.sage : THEME.rust} />
                          ))}
                        </Bar>
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            </Card>
          )}

          {/* ─── Cash Flow Twins: Income & Expense (two-column grid) ──── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))",
              gap: 18,
              marginBottom: 20,
            }}
          >
            {/* (b) Income Summary with rounded Gradient Bar Chart */}
            <Card style={{ padding: 24 }}>
              <CardHeading
                icon={Wallet}
                title="Income Summary"
                id="income"
                color={THEME.sage}
                badge={`${incomeData.streamCount} Streams`}
              />
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
                  value={fmtINRFull(
                    incomeData.totalIncome / (isPastFY ? 12 : Math.max(1, fyMonthsElapsed || 12))
                  )}
                  sub={isPastFY ? "12 months" : `Active for ${fyMonthsElapsed || 12} mos`}
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
                    Income Streams
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
                      <span style={{ flex: 1, fontSize: 12.5, color: THEME.ink, fontWeight: 500 }}>
                        {cat.name}
                      </span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: THEME.ink }}>
                        <Money value={cat.value} variant="full" />
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: THEME.muted,
                          minWidth: 36,
                          textAlign: "right",
                          fontWeight: 600,
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
                <div style={{ height: 160, marginTop: 12 }}>
                  <div style={{ width: "100%", height: "100%", position: "relative" }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart data={incomeData.monthlyChart} barSize={26}>
                        <defs>
                          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={THEME.sage} stopOpacity={0.9} />
                            <stop offset="100%" stopColor={THEME.sage} stopOpacity={0.3} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} vertical={false} opacity={0.4} />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: THEME.muted }} />
                        <YAxis
                          tick={{ fontSize: 10, fill: THEME.muted }}
                          tickFormatter={(v: number) => (privacyMode ? "••••" : fmtINR(v))}
                          width={50}
                        />
                        <Tooltip content={<GlassTooltip />} cursor={{ fill: "color-mix(in srgb, var(--t-line) 15%, transparent)" }} />
                        <Bar dataKey="income" name="Income" fill="url(#incomeGrad)" radius={[5, 5, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </Card>

            {/* (c) Expense Summary with interactive Donut Chart */}
            <Card style={{ padding: 24 }}>
              <div className="page-break" />
              <CardHeading
                icon={Receipt}
                title="Expense Summary"
                id="expense"
                color={THEME.rust}
                badge={`Burn: ${fmtINR(expenseData.dailyBurn)}/day`}
              />
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
                <MetricTile
                  label="Monthly Avg"
                  value={fmtINRFull(expenseData.avgMonthly)}
                  sub={`Daily: ~${fmtINR(expenseData.dailyBurn)}`}
                />
              </div>

              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: THEME.muted,
                      marginBottom: 10,
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>Top Categories</span>
                    {expenseData.breakdown.length > 5 && (
                      <button
                        onClick={() => setShowAllExpenses(!showAllExpenses)}
                        className="no-print"
                        style={{
                          background: "none",
                          border: "none",
                          color: THEME.accent,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {showAllExpenses ? "Show Top 5" : "View All"}
                      </button>
                    )}
                  </div>
                  {(showAllExpenses ? expenseData.breakdown : expenseData.breakdown.slice(0, 5)).map(
                    (cat, idx) => (
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
                        <span style={{ flex: 1, fontSize: 12.5, color: THEME.ink, fontWeight: 500 }}>
                          {cat.name}
                        </span>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: THEME.ink }}>
                          <Money value={cat.value} variant="full" />
                        </span>
                      </div>
                    )
                  )}
                </div>

                {expenseData.top5.length > 0 && (
                  <div style={{ width: 170, height: 170, flexShrink: 0, position: "relative" }}>
                    <div style={{ width: "100%", height: "100%", position: "relative" }}>
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <PieChart>
                          <Pie
                            data={expenseData.top5}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={72}
                            innerRadius={52}
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
                              fontSize: 9.5,
                              fontWeight: 700,
                              fill: THEME.muted,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            {hoveredExpense ? hoveredExpense.name : "Expenses"}
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
                              : fmtINR(
                                  hoveredExpense ? hoveredExpense.value : expenseData.totalExpense
                                )}
                          </text>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* ─── Savings & Asset Allocation (two-column grid) ────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))",
              gap: 18,
              marginBottom: 20,
            }}
          >
            {/* (d) Savings & Wealth Accumulation */}
            <Card style={{ padding: 24 }}>
              <CardHeading
                icon={PiggyBank}
                title="Savings & Investment"
                id="savings"
                color={THEME.accent}
                badge={`Savings Rate: ${savingsData.savingsRate.toFixed(0)}%`}
              />
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

              {/* 50/30/20 Rule Visualization */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  marginBottom: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, fontWeight: 700, color: THEME.muted }}>
                  <span>50/30/20 Budget Target</span>
                  <span style={{ color: savingsData.savingsRate >= 20 ? THEME.sage : THEME.gold }}>
                    {savingsData.savingsRate >= 20 ? "Target Achieved (≥20%)" : "Under Target (<20%)"}
                  </span>
                </div>
                <ProgressBar
                  pct={savingsData.savingsRate}
                  color={savingsData.savingsRate >= 20 ? THEME.sage : THEME.gold}
                  height={8}
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
                { label: "Bonds & Debentures", value: savingsData.bondAdds },
                { label: "Govt Schemes (NPS/SSY/SCSS)", value: savingsData.govtSchemeAdds },
                { label: "Gold & SGBs", value: savingsData.goldAdds },
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
                    Realized Capital Gains
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
              <CardHeading
                icon={PieIcon}
                title="Asset Allocation"
                id="allocation"
                badge={`Risk: ${assetAllocation.riskProfile}`}
              />
              {isPastFY && (
                <InfoBanner>
                  Asset allocation reflects current holdings — historical snapshot not available for
                  past FYs.
                </InfoBanner>
              )}
              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
                {assetAllocation.alloc.length > 0 && (
                  <div style={{ width: 180, height: 180, flexShrink: 0, position: "relative" }}>
                    <div style={{ width: "100%", height: "100%", position: "relative" }}>
                      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <PieChart>
                          <Pie
                            data={assetAllocation.alloc}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={76}
                            innerRadius={56}
                            paddingAngle={3}
                            onMouseEnter={(_, idx) => {
                              const item = assetAllocation.alloc[idx];
                              if (item) setHoveredAsset({ name: item.name, value: item.value });
                            }}
                            onMouseLeave={() => setHoveredAsset(null)}
                          >
                            {assetAllocation.alloc.map((a, idx) => (
                              <Cell
                                key={idx}
                                fill={
                                  ASSET_CLASS_COLORS[a.name] ||
                                  PIE_COLORS[idx % PIE_COLORS.length]
                                }
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
                              fontSize: 9.5,
                              fontWeight: 700,
                              fill: THEME.muted,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
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
                              : fmtINR(
                                  hoveredAsset ? hoveredAsset.value : assetAllocation.total
                                )}
                          </text>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
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
                              background:
                                ASSET_CLASS_COLORS[a.name] ||
                                PIE_COLORS[idx % PIE_COLORS.length],
                            }}
                          />
                          <span style={{ fontSize: 12, fontWeight: 600, color: THEME.ink }}>
                            {a.name}
                          </span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: THEME.ink }}>
                          <Money value={a.value} variant="full" />
                          <span style={{ fontSize: 10.5, color: THEME.muted, marginLeft: 4 }}>
                            {assetAllocation.total > 0
                              ? ((a.value / assetAllocation.total) * 100).toFixed(0)
                              : 0}
                            %
                          </span>
                        </span>
                      </div>
                      <ProgressBar
                        pct={
                          assetAllocation.total > 0
                            ? (a.value / assetAllocation.total) * 100
                            : 0
                        }
                        color={
                          ASSET_CLASS_COLORS[a.name] || PIE_COLORS[idx % PIE_COLORS.length]
                        }
                      />
                    </div>
                  ))}
                  <div
                    style={{
                      marginTop: 12,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "var(--surface-1)",
                      border: `1px solid ${THEME.line}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>
                        Total Assets
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 13.5,
                          fontWeight: 800,
                          color: THEME.accent,
                        }}
                      >
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
                gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))",
                gap: 18,
                marginBottom: 20,
              }}
            >
              {/* (f) Debt details */}
              {(debtData.loanCount > 0 || debtData.ccOutstanding > 0) && (
                <Card style={{ padding: 24 }}>
                  <CardHeading
                    icon={Landmark}
                    title="Debt Summary"
                    id="debt"
                    color={THEME.rust}
                    badge={`DTI: ${debtData.dtiRatio.toFixed(0)}%`}
                  />
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
                  <CardHeading
                    icon={Shield}
                    title="Insurance Coverage"
                    id="insurance"
                    badge={`Cover: ${insuranceData.adequacyRatio.toFixed(1)}x Income`}
                  />
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
                          ? "Adequate (≥10x)"
                          : insuranceData.adequacyRatio >= 5
                            ? "Moderate"
                            : "Low (<5x)"
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
                        borderRadius: 10,
                        background: "var(--surface-1)",
                        border: `1px solid ${THEME.line}`,
                        fontSize: 12,
                        color: THEME.muted,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <AlertTriangle size={15} style={{ flexShrink: 0, color: THEME.gold }} />
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
                gridTemplateColumns: "repeat(auto-fit, minmax(min(340px, 100%), 1fr))",
                gap: 18,
                marginBottom: 20,
              }}
            >
              {/* (h) Tax details */}
              {(taxData.totalTaxPaid > 0 || taxData.paymentCount > 0) && (
                <Card style={{ padding: 24 }}>
                  <CardHeading
                    icon={Receipt}
                    title="Tax Summary"
                    id="tax"
                    color={THEME.gold}
                    badge={`Regime: ${taxData.regime === "new" ? "New" : "Old"}`}
                  />
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
                  <CardHeading
                    icon={Target}
                    title="Goals Progress"
                    id="goals"
                    badge={`Funded: ${goalsData.overallPct.toFixed(0)}%`}
                  />
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
                  {goalsData.topGoals.map((g: any) => (
                    <div key={g.name} style={{ marginBottom: 12 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: THEME.ink }}>
                          {g.name}
                        </span>
                        <span style={{ fontSize: 11.5, color: THEME.muted }}>
                          <Money value={g.saved} variant="full" /> /{" "}
                          <Money value={g.target} variant="full" />
                          <span
                            style={{
                              marginLeft: 5,
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
                        color={
                          g.pct >= 100 ? THEME.sage : g.pct >= 50 ? THEME.accent : THEME.gold
                        }
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
              <Card style={{ padding: 24, marginBottom: 20 }}>
                <CardHeading
                  icon={Sparkles}
                  title="Key Highlights & Milestones"
                  id="highlights"
                  color={THEME.gold}
                  badge={`${highlights.length} Highlights`}
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
                        background: "var(--t-card-bg)",
                        border: `1px solid ${THEME.line}`,
                        borderLeft: `4px solid ${h.color}`,
                      }}
                    >
                      <span
                        style={{
                          lineHeight: 1,
                          background: `color-mix(in srgb, ${h.color} 12%, transparent)`,
                          padding: 7,
                          borderRadius: 8,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <h.icon size={17} color={h.color} />
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
                          {h.category}
                        </div>
                        <span
                          style={{
                            fontSize: 12.5,
                            fontWeight: 600,
                            color: THEME.ink,
                            lineHeight: 1.5,
                          }}
                        >
                          {h.text}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {/* ─── Financial Health Scorecard (Composite 360° Bento) ────── */}
          <Card style={{ padding: 24, marginBottom: 20 }}>
            <CardHeading
              icon={BarChart2}
              title="Financial Health Snapshot"
              id="health"
              badge={healthScore.tier}
            />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
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
                      : debtData.annualEMI === 0
                        ? "0%"
                        : "N/A",
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
                      : debtData.annualEMI > 0
                        ? 100
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
                    padding: "18px 20px",
                    borderRadius: 14,
                    background:
                      "linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
                    border: `1.5px solid ${THEME.line}`,
                    borderLeft: `3px solid ${m.color}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    transition: "all 0.25s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        color: THEME.muted,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 4,
                      }}
                    >
                      {m.label}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 22,
                        fontWeight: 700,
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
                      style={{ fontSize: 9.5, marginTop: 8, padding: "2px 8px" }}
                    >
                      {m.status}
                    </Badge>
                  </div>

                  <div className="no-print">
                    <CircularProgress pct={m.pct} color={m.color} size={52}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: THEME.ink }}>
                        {m.pct.toFixed(0)}%
                      </span>
                    </CircularProgress>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* ─── Footer ──────────────────────────────────────────────── */}
          <div
            style={{
              textAlign: "center",
              padding: "12px 0 36px",
              fontSize: 11.5,
              color: THEME.muted,
            }}
          >
            Generated on{" "}
            {new Date().toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            &middot; ArthaDrishti Financial Intelligence
          </div>
        </>
      )}
    </div>
  );
};
