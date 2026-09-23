/* eslint-disable */
import React, { useState, useMemo, useEffect } from "react";
import {
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Minus,
  Printer,
  Search,
  Download,
  X,
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Sparkles,
  Percent,
  Layers,
  ChevronUp,
  ChevronDown,
  Calendar,
  Zap,
  ShieldCheck,
  AlertTriangle,
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
  ReferenceLine,
  Cell,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINRFull, exportArrayToCSV } from "../../utils/finance";
import { computeNetWorthAsOf } from "../../utils/netWorthAsOf";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { EmptyState } from "../ui/EmptyState";

const printStyles = `@media print {
  @page { margin: 12mm 15mm; size: A4 portrait; }
  body { background: #ffffff !important; color: #0f172a !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body * { visibility: hidden; }
  .comparison-report, .comparison-report * { visibility: visible; }
  .comparison-report { position: absolute; left: 0; top: 0; width: 100%; font-size: 11px; color: #0f172a !important; background: #ffffff !important; }
  .no-print { display: none !important; }
  .card-base, .tile-card, .insight-card, .hero-card {
    page-break-inside: avoid;
    break-inside: avoid;
    border: 1px solid #cbd5e1 !important;
    box-shadow: none !important;
    background: #ffffff !important;
    color: #0f172a !important;
  }
  .recharts-responsive-container { width: 100% !important; height: auto !important; }
  .print-only-header { display: block !important; margin-bottom: 20px; }
}`;

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 10,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: THEME.muted,
  fontWeight: 800,
  borderBottom: `1.5px solid ${THEME.line}`,
  whiteSpace: "nowrap",
  background: "color-mix(in srgb, var(--surface-1) 60%, transparent)",
  userSelect: "none",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
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

const getMonthLabel = (ym: string) => {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} '${y.slice(-2)}`;
};

const selectStyle: React.CSSProperties = {
  padding: "7px 12px",
  borderRadius: 10,
  border: `1.5px solid ${THEME.line}`,
  background: "var(--surface-0)",
  color: THEME.ink,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  outline: "none",
  boxShadow: "var(--shadow-xs)",
};

/* ─── CUSTOM CHART TOOLTIP ──────────────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null;
  const visible = payload.filter((p: any) => p.value !== 0 && p.value != null);
  if (!visible.length) return null;
  return (
    <div
      style={{
        background: "color-mix(in srgb, var(--surface-0) 92%, transparent)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: `1.5px solid ${THEME.line}`,
        borderRadius: 12,
        padding: "10px 14px",
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.12)",
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
              background: p.color || p.fill,
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

/* ─── CUSTOM VARIANCE TOOLTIP ─────────────────────────────────────────────────── */
const VarianceTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  const isUp = data.delta > 0;
  return (
    <div
      style={{
        background: "color-mix(in srgb, var(--surface-0) 92%, transparent)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: `1.5px solid ${THEME.line}`,
        borderRadius: 12,
        padding: "10px 14px",
        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.12)",
        fontSize: 12,
        minWidth: 160,
      }}
    >
      <div style={{ fontWeight: 800, color: THEME.ink, marginBottom: 6 }}>{data.fullCategory || label}</div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 4, color: THEME.muted }}>
        <span>Current:</span>
        <span style={{ fontWeight: 700, color: THEME.ink }}><Money value={data.current} variant="full" /></span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6, color: THEME.muted }}>
        <span>Previous:</span>
        <span style={{ fontWeight: 700, color: THEME.ink }}><Money value={data.previous} variant="full" /></span>
      </div>
      <div
        style={{
          borderTop: `1px solid ${THEME.line}`,
          paddingTop: 6,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          fontWeight: 800,
          color: isUp ? THEME.rust : THEME.sage,
        }}
      >
        <span>Net Shift:</span>
        <span>{isUp ? "+" : ""}<Money value={data.delta} variant="full" /> ({isUp ? "+" : ""}{data.pctChange.toFixed(1)}%)</span>
      </div>
    </div>
  );
};

/* ─── Executive Split KPI Card ───────────────────────────────────── */
const ExecutiveSplitCard = ({
  title,
  icon: Icon,
  currentLabel,
  previousLabel,
  currentValue,
  previousValue,
  delta,
  percentChange,
  isIncome = false,
  isNetWorth = false,
  isRate = false,
  rateUnit = "%",
  deltaIndicator,
}: any) => {
  const isUp = delta > 0;
  const isGood = (isIncome || isNetWorth || isRate) ? isUp : !isUp;
  const animatedCurrent = useAnimatedNumber(currentValue ?? 0);
  const animatedPrevious = useAnimatedNumber(previousValue ?? 0);

  // Calculate proportional bar share
  const maxVal = Math.max(Math.abs(currentValue || 0), Math.abs(previousValue || 0), 1);
  const currPct = Math.min(100, Math.round((Math.abs(currentValue || 0) / maxVal) * 100));
  const prevPct = Math.min(100, Math.round((Math.abs(previousValue || 0) / maxVal) * 100));

  // Determine dynamic font size based on numeric length to prevent clipping on large sums (e.g. Crores)
  const getDynamicFontSize = (val: number | string, isCurrent: boolean) => {
    if (isRate) return isCurrent ? 18 : 16;
    const num = typeof val === "number" ? Math.round(Math.abs(val)) : 0;
    const digitCount = num > 0 ? num.toString().length : 1;
    if (digitCount >= 8) return isCurrent ? 14.5 : 13.5; // >= 1 Crore (8+ digits: ₹1,24,96,841)
    if (digitCount >= 6) return isCurrent ? 16 : 14.5;   // >= 1 Lakh (6-7 digits)
    return isCurrent ? 18 : 16;
  };

  return (
    <div
      className="card-lift"
      style={{
        background: "var(--t-card-bg, var(--surface-0))",
        border: `1.5px solid ${THEME.line}`,
        borderRadius: 16,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 12,
        position: "relative",
        boxShadow: "var(--shadow-xs)",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          {Icon && (
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "var(--surface-1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isIncome ? THEME.sage : isNetWorth ? THEME.accent : THEME.ink,
                flexShrink: 0,
              }}
            >
              <Icon size={15} />
            </div>
          )}
          <span
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: THEME.muted,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </span>
        </div>
        <div style={{ flexShrink: 0 }}>{deltaIndicator}</div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto minmax(0, 1fr)",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div style={{ minWidth: 0, overflow: "hidden" }}>
          <div
            style={{
              fontSize: 10,
              color: THEME.muted,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={currentLabel}
          >
            {currentLabel}
          </div>
          <div
            title={typeof currentValue === "number" ? fmtINRFull(currentValue) : String(currentValue)}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: getDynamicFontSize(currentValue, true),
              fontWeight: 700,
              color: isIncome ? THEME.sage : isNetWorth ? THEME.accent : THEME.ink,
              letterSpacing: "-0.025em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.2,
            }}
          >
            {isRate ? (
              <span>{animatedCurrent.toFixed(1)}{rateUnit}</span>
            ) : (
              <Money value={animatedCurrent} variant="full" />
            )}
          </div>
        </div>

        <div
          style={{
            fontSize: 9.5,
            fontWeight: 800,
            color: THEME.muted,
            background: "var(--surface-1)",
            padding: "2px 5px",
            borderRadius: 5,
            letterSpacing: "0.02em",
            flexShrink: 0,
            lineHeight: 1,
          }}
        >
          VS
        </div>

        <div style={{ textAlign: "right", minWidth: 0, overflow: "hidden" }}>
          <div
            style={{
              fontSize: 10,
              color: THEME.muted,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 2,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={previousLabel}
          >
            {previousLabel}
          </div>
          <div
            title={typeof previousValue === "number" ? fmtINRFull(previousValue) : String(previousValue)}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: getDynamicFontSize(previousValue, false),
              fontWeight: 600,
              color: THEME.muted,
              letterSpacing: "-0.025em",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              lineHeight: 1.2,
            }}
          >
            {isRate ? (
              <span>{animatedPrevious.toFixed(1)}{rateUnit}</span>
            ) : (
              <Money value={animatedPrevious} variant="full" />
            )}
          </div>
        </div>
      </div>

      {/* Mini Visual Gauge Bar */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ display: "flex", height: 4, borderRadius: 2, overflow: "hidden", background: "var(--surface-2)" }}>
          <div
            style={{
              width: `${currPct}%`,
              background: isIncome ? THEME.sage : isNetWorth ? THEME.accent : THEME.ink,
              borderRadius: 2,
              transition: "width 0.4s ease",
            }}
            title={`${currentLabel}: ${currPct}%`}
          />
        </div>
        <div style={{ display: "flex", height: 3, borderRadius: 2, overflow: "hidden", background: "var(--surface-2)" }}>
          <div
            style={{
              width: `${prevPct}%`,
              background: THEME.muted,
              opacity: 0.4,
              borderRadius: 2,
              transition: "width 0.4s ease",
            }}
            title={`${previousLabel}: ${prevPct}%`}
          />
        </div>
      </div>

      {percentChange !== undefined && percentChange !== 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 11,
            color: THEME.muted,
            borderTop: `1px solid ${THEME.line}`,
            paddingTop: 8,
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          <span style={{ flexShrink: 0 }}>Net Variance</span>
          <span
            style={{
              fontWeight: 800,
              color: isGood ? THEME.sage : THEME.rust,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textAlign: "right",
            }}
          >
            {isUp ? "+" : ""}
            {percentChange.toFixed(1)}% ({isUp ? "+" : ""}{isRate ? `${delta.toFixed(1)}%` : <Money value={delta} variant="full" />})
          </span>
        </div>
      )}
    </div>
  );
};

export const ComparisonReportsTab: React.FC<{
  state: any;
  metrics?: any;
  marketData?: any;
  activeProfile?: string;
}> = ({ state, metrics = {}, marketData = {}, activeProfile = "all" }) => {
  const { privacyMode } = usePrivacy();

  // ── Inject print styles ──
  useEffect(() => {
    const style = document.createElement("style");
    style.id = "comparison-report-print";
    style.textContent = printStyles;
    document.head.appendChild(style);
    return () => {
      style.remove();
    };
  }, []);

  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastYM = `${now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()}-${String(
    now.getMonth() === 0 ? 12 : now.getMonth()
  ).padStart(2, "0")}`;
  const sameMonthLastYearYM = `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Fiscal-year period key helpers (FY runs Apr–Mar)
  const getFYQuarterKey = (ym: string) => {
    const [yStr, mStr] = ym.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    if (m >= 4 && m <= 6) return `${y}-Q1`;
    if (m >= 7 && m <= 9) return `${y}-Q2`;
    if (m >= 10 && m <= 12) return `${y}-Q3`;
    return `${y - 1}-Q4`;
  };
  const getFYHalfKey = (ym: string) => {
    const [yStr, mStr] = ym.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    if (m >= 4 && m <= 9) return `${y}-H1`;
    if (m >= 10 && m <= 12) return `${y}-H2`;
    return `${y - 1}-H2`;
  };
  const getFYYearKey = (ym: string) => {
    const [yStr, mStr] = ym.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    return String(m >= 4 ? y : y - 1);
  };

  const monthsInQuarter = (key: string) => {
    const [fyStr, qStr] = key.split("-Q");
    const fy = parseInt(fyStr, 10);
    const q = parseInt(qStr, 10);
    const table: Record<number, [number, number][]> = {
      1: [[fy, 4], [fy, 5], [fy, 6]],
      2: [[fy, 7], [fy, 8], [fy, 9]],
      3: [[fy, 10], [fy, 11], [fy, 12]],
      4: [[fy + 1, 1], [fy + 1, 2], [fy + 1, 3]],
    };
    return (table[q] || []).map(([y, m]) => `${y}-${String(m).padStart(2, "0")}`);
  };
  const monthsInHalf = (key: string) => {
    const [fyStr, hStr] = key.split("-H");
    const fy = parseInt(fyStr, 10);
    const h = parseInt(hStr, 10);
    if (h === 1) return [4, 5, 6, 7, 8, 9].map((m) => `${fy}-${String(m).padStart(2, "0")}`);
    return [
      ...[10, 11, 12].map((m) => `${fy}-${String(m).padStart(2, "0")}`),
      ...[1, 2, 3].map((m) => `${fy + 1}-${String(m).padStart(2, "0")}`),
    ];
  };
  const monthsInYear = (key: string) => {
    const fy = parseInt(key, 10);
    return [
      ...[4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => `${fy}-${String(m).padStart(2, "0")}`),
      ...[1, 2, 3].map((m) => `${fy + 1}-${String(m).padStart(2, "0")}`),
    ];
  };
  const monthsForPeriod = (periodType: string, key: string) =>
    periodType === "month"
      ? [key]
      : periodType === "quarter"
      ? monthsInQuarter(key)
      : periodType === "half"
      ? monthsInHalf(key)
      : monthsInYear(key);

  const getQuarterLabel = (key: string) => {
    const [fyStr, qStr] = key.split("-Q");
    const fy = parseInt(fyStr, 10);
    return `Q${qStr} FY${String(fy).slice(-2)}-${String(fy + 1).slice(-2)}`;
  };
  const getHalfLabel = (key: string) => {
    const [fyStr, hStr] = key.split("-H");
    const fy = parseInt(fyStr, 10);
    return `H${hStr} FY${String(fy).slice(-2)}-${String(fy + 1).slice(-2)}`;
  };
  const getYearLabel = (key: string) => {
    const fy = parseInt(key, 10);
    return `FY ${fy}-${String(fy + 1).slice(-2)}`;
  };
  const getPeriodLabel = (periodType: string, key: string) =>
    periodType === "month"
      ? getMonthLabel(key)
      : periodType === "quarter"
      ? getQuarterLabel(key)
      : periodType === "half"
      ? getHalfLabel(key)
      : getYearLabel(key);

  const prevPeriodKey = (periodType: string, key: string) => {
    if (periodType === "month") {
      const [y, m] = key.split("-").map(Number);
      const py = m === 1 ? y - 1 : y;
      const pm = m === 1 ? 12 : m - 1;
      return `${py}-${String(pm).padStart(2, "0")}`;
    }
    if (periodType === "quarter") {
      const [fyStr, qStr] = key.split("-Q");
      const fy = parseInt(fyStr, 10);
      const q = parseInt(qStr, 10);
      return q === 1 ? `${fy - 1}-Q4` : `${fy}-Q${q - 1}`;
    }
    if (periodType === "half") {
      const [fyStr, hStr] = key.split("-H");
      const fy = parseInt(fyStr, 10);
      const h = parseInt(hStr, 10);
      return h === 1 ? `${fy - 1}-H2` : `${fy}-H1`;
    }
    return String(parseInt(key, 10) - 1);
  };

  const currentQuarterKey = getFYQuarterKey(currentYM);
  const currentHalfKey = getFYHalfKey(currentYM);
  const currentYearKey = getFYYearKey(currentYM);

  const [compMode, setCompMode] = useState("month"); // "month" | "quarter" | "half" | "year"
  const [activePreset, setActivePreset] = useState<string>("mom"); // "mom" | "qoq" | "yoy" | "fy" | "custom"
  const [periodA, setPeriodA] = useState(currentYM);
  const [periodB, setPeriodB] = useState(lastYM);

  // Quick Preset Handlers
  const handlePresetSelect = (preset: string) => {
    setActivePreset(preset);
    if (preset === "mom") {
      setCompMode("month");
      setPeriodA(currentYM);
      setPeriodB(lastYM);
    } else if (preset === "qoq") {
      setCompMode("quarter");
      const currQ = currentQuarterKey;
      setPeriodA(currQ);
      setPeriodB(prevPeriodKey("quarter", currQ));
    } else if (preset === "yoy") {
      setCompMode("month");
      setPeriodA(currentYM);
      setPeriodB(sameMonthLastYearYM);
    } else if (preset === "fy") {
      setCompMode("year");
      const currY = currentYearKey;
      setPeriodA(currY);
      setPeriodB(prevPeriodKey("year", currY));
    }
  };

  const handleModeChange = (mode: string) => {
    setCompMode(mode);
    setActivePreset("custom");
    const defaultA =
      mode === "month"
        ? currentYM
        : mode === "quarter"
        ? currentQuarterKey
        : mode === "half"
        ? currentHalfKey
        : currentYearKey;
    setPeriodA(defaultA);
    setPeriodB(prevPeriodKey(mode, defaultA));
  };

  // Internal transfer exclusion
  const isTransferCat = (cat?: string) =>
    ["Transfer", "Self Transfer", "Self-Transfer"].includes(cat || "");

  // Monthly expense totals + category breakdown
  const monthlyExpense = useMemo(() => {
    const map: Record<string, { total: number; cats: Record<string, number> }> = {};
    (state.transactions || [])
      .filter(
        (t: any) =>
          t.type === "debit" &&
          t.date &&
          !isTransferCat(t.category) &&
          t.category !== "Investment"
      )
      .forEach((t: any) => {
        const ym = t.date.slice(0, 7);
        const cat = t.category || "Uncategorized";
        if (!map[ym]) map[ym] = { total: 0, cats: {} };
        map[ym].total += Number(t.amount || 0);
        map[ym].cats[cat] = (map[ym].cats[cat] || 0) + Number(t.amount || 0);
      });

    // Rent paid via the Rented Properties ledger
    (state.rentedProperties || []).forEach((p: any) => {
      (p.payments || []).forEach((pay: any) => {
        if (!pay.date) return;
        const ym = pay.date.slice(0, 7);
        const hasRentTxn = (state.transactions || []).some(
          (t: any) =>
            t.date?.slice(0, 7) === ym &&
            t.type === "debit" &&
            (t.category || "").toLowerCase() === "rent"
        );
        if (hasRentTxn) return;
        if (!map[ym]) map[ym] = { total: 0, cats: {} };
        map[ym].total += Number(pay.amount || 0);
        map[ym].cats["Rent"] = (map[ym].cats["Rent"] || 0) + Number(pay.amount || 0);
      });
    });
    return map;
  }, [state.transactions, state.rentedProperties]);

  const monthlyIncomeLedger = useMemo(() => {
    const map: Record<string, number> = {};
    (state.income || [])
      .filter((i: any) => i.date)
      .forEach((i: any) => {
        const ym = i.date.slice(0, 7);
        map[ym] = (map[ym] || 0) + Number(i.amount || 0);
      });
    return map;
  }, [state.income]);

  const monthlyIncomeTxn = useMemo(() => {
    const map: Record<string, number> = {};
    (state.transactions || [])
      .filter((t: any) => t.type === "credit" && t.date && !isTransferCat(t.category))
      .forEach((t: any) => {
        const ym = t.date.slice(0, 7);
        map[ym] = (map[ym] || 0) + Number(t.amount || 0);
      });
    return map;
  }, [state.transactions]);

  const monthlyIncomeCatLedger = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    (state.income || [])
      .filter((i: any) => i.date)
      .forEach((i: any) => {
        const ym = i.date.slice(0, 7);
        const cat = i.category || i.source || "Other";
        if (!map[ym]) map[ym] = {};
        map[ym][cat] = (map[ym][cat] || 0) + Number(i.amount || 0);
      });
    return map;
  }, [state.income]);

  const monthlyIncomeCatTxn = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    (state.transactions || [])
      .filter((t: any) => t.type === "credit" && t.date && !isTransferCat(t.category))
      .forEach((t: any) => {
        const ym = t.date.slice(0, 7);
        const cat = t.category || "Uncategorized";
        if (!map[ym]) map[ym] = {};
        map[ym][cat] = (map[ym][cat] || 0) + Number(t.amount || 0);
      });
    return map;
  }, [state.transactions]);

  const availableMonths = useMemo(() => {
    const set = new Set([
      ...Object.keys(monthlyExpense),
      ...Object.keys(monthlyIncomeLedger),
      ...Object.keys(monthlyIncomeTxn),
      currentYM,
      sameMonthLastYearYM,
    ]);
    return [...set].sort().reverse();
  }, [monthlyExpense, monthlyIncomeLedger, monthlyIncomeTxn, currentYM, sameMonthLastYearYM]);

  const availableQuarters = useMemo(
    () => [...new Set(availableMonths.map(getFYQuarterKey))].sort().reverse(),
    [availableMonths]
  );
  const availableHalves = useMemo(
    () => [...new Set(availableMonths.map(getFYHalfKey))].sort().reverse(),
    [availableMonths]
  );
  const availableYears = useMemo(
    () => [...new Set(availableMonths.map(getFYYearKey))].sort().reverse(),
    [availableMonths]
  );

  const periodOptions = useMemo(() => {
    const base =
      compMode === "month"
        ? availableMonths
        : compMode === "quarter"
        ? availableQuarters
        : compMode === "half"
        ? availableHalves
        : availableYears;
    return [...new Set([...base, periodA, periodB])].sort().reverse();
  }, [compMode, availableMonths, availableQuarters, availableHalves, availableYears, periodA, periodB]);

  const comp = useMemo(() => {
    const aggregate = (key: string) => {
      const months = monthsForPeriod(compMode, key);
      let total = 0;
      let incomeLedgerTotal = 0;
      let incomeTxnTotal = 0;
      const expenseCats: Record<string, number> = {};
      const incomeCats: Record<string, number> = {};
      months.forEach((ym: string) => {
        const e = monthlyExpense[ym];
        if (e) {
          total += e.total;
          Object.entries(e.cats).forEach(([cat, amt]) => {
            expenseCats[cat] = (expenseCats[cat] || 0) + Number(amt || 0);
          });
        }
        const monthLedgerTotal = monthlyIncomeLedger[ym] || 0;
        incomeLedgerTotal += monthLedgerTotal;
        incomeTxnTotal += monthlyIncomeTxn[ym] || 0;
        const catSource =
          monthLedgerTotal > 0 ? monthlyIncomeCatLedger[ym] : monthlyIncomeCatTxn[ym];
        if (catSource) {
          Object.entries(catSource).forEach(([cat, amt]) => {
            incomeCats[cat] = (incomeCats[cat] || 0) + Number(amt || 0);
          });
        }
      });
      const income = incomeLedgerTotal > 0 ? incomeLedgerTotal : incomeTxnTotal;
      const savings = income - total;
      const savingsRate = income > 0 ? Math.max(0, (savings / income) * 100) : 0;
      return { total, income, savings, savingsRate, expenseCats, incomeCats };
    };

    const current = aggregate(periodA);
    const previous = aggregate(periodB);

    const buildCategoryComps = (
      currCats: Record<string, number>,
      prevCats: Record<string, number>,
      currTotal: number
    ) => {
      const allCats = new Set<string>([...Object.keys(currCats), ...Object.keys(prevCats)]);
      return [...allCats]
        .map((cat) => {
          const curr = currCats[cat] || 0;
          const prev = prevCats[cat] || 0;
          const delta = curr - prev;
          const isNew = prev === 0 && curr > 0;
          const pctChange = prev > 0 ? (delta / prev) * 100 : curr > 0 ? 100 : 0;
          const sharePct = currTotal > 0 ? (curr / currTotal) * 100 : 0;
          return {
            category: cat,
            current: Math.round(curr),
            previous: Math.round(prev),
            delta: Math.round(delta),
            pctChange,
            sharePct,
            isNew,
          };
        })
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    };

    const expenseCategoryComps = buildCategoryComps(
      current.expenseCats,
      previous.expenseCats,
      current.total
    );
    const incomeCategoryComps = buildCategoryComps(
      current.incomeCats,
      previous.incomeCats,
      current.income
    );

    // Net worth reconstruction
    const nwHistory = state.netWorthHistory || [];
    const nwForMonth = (ym: string) => {
      if (ym === currentYM) return metrics.netWorth || 0;
      const reconstructed = computeNetWorthAsOf(state, ym, marketData, activeProfile);
      if (
        reconstructed.totalAssets > 0 ||
        reconstructed.totalLiabilities > 0 ||
        reconstructed.assetBreakdown.length > 0
      ) {
        return reconstructed.netWorth;
      }
      if (activeProfile === "all") {
        const entry = nwHistory.find((h: any) => h.month === ym);
        if (entry) return entry.netWorth || 0;
      }
      return reconstructed.netWorth;
    };
    const findNW = (months: string[]) => {
      if (months.includes(currentYM)) return metrics.netWorth || 0;
      return nwForMonth(months[months.length - 1]);
    };
    const currentNW = findNW(monthsForPeriod(compMode, periodA));
    const previousNW = findNW(monthsForPeriod(compMode, periodB));

    const savingsDelta = current.savings - previous.savings;
    const savingsRateDelta = current.savingsRate - previous.savingsRate;

    return {
      currentLabel: getPeriodLabel(compMode, periodA),
      previousLabel: getPeriodLabel(compMode, periodB),
      currentExpense: current.total,
      previousExpense: previous.total,
      currentIncome: current.income,
      previousIncome: previous.income,
      currentSavings: current.savings,
      previousSavings: previous.savings,
      currentSavingsRate: current.savingsRate,
      previousSavingsRate: previous.savingsRate,
      expenseDelta: current.total - previous.total,
      incomeDelta: current.income - previous.income,
      savingsDelta,
      savingsRateDelta,
      currentNW,
      previousNW,
      nwDelta: currentNW - previousNW,
      expenseCategoryComps,
      incomeCategoryComps,
    };
  }, [
    compMode,
    periodA,
    periodB,
    monthlyExpense,
    monthlyIncomeLedger,
    monthlyIncomeTxn,
    monthlyIncomeCatLedger,
    monthlyIncomeCatTxn,
    state,
    metrics,
    currentYM,
    marketData,
    activeProfile,
  ]);

  const [categoryView, setCategoryView] = useState<"expense" | "income">("expense");
  const [chartMode, setChartMode] = useState<"dual" | "variance">("dual");
  const [topCount, setTopCount] = useState<number>(10);
  const [catSearch, setCatSearch] = useState("");
  const [sortField, setSortField] = useState<"category" | "current" | "previous" | "delta" | "pctChange" | "sharePct">("delta");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const activeCategoryComps = categoryView === "expense" ? comp.expenseCategoryComps : comp.incomeCategoryComps;

  // Sorting and Filtering
  const sortedAndFilteredCategoryComps = useMemo(() => {
    let list = [...activeCategoryComps];
    const q = catSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((c) => c.category.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (sortField === "category") {
        return sortOrder === "asc"
          ? String(aVal).localeCompare(String(bVal))
          : String(bVal).localeCompare(String(aVal));
      }
      if (sortField === "delta") {
        aVal = Math.abs(a.delta);
        bVal = Math.abs(b.delta);
      }
      return sortOrder === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return list;
  }, [activeCategoryComps, catSearch, sortField, sortOrder]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  // Chart data
  const chartData = useMemo(() => {
    const list = topCount === 0 ? sortedAndFilteredCategoryComps : sortedAndFilteredCategoryComps.slice(0, topCount);
    return list.map((c) => ({
      category: c.category.length > 14 ? c.category.slice(0, 14) + "…" : c.category,
      fullCategory: c.category,
      [comp.currentLabel]: c.current,
      [comp.previousLabel]: c.previous,
      delta: c.delta,
      current: c.current,
      previous: c.previous,
      pctChange: c.pctChange,
    }));
  }, [sortedAndFilteredCategoryComps, topCount, comp.currentLabel, comp.previousLabel]);

  // Smart Highlights computation
  const highlights = useMemo(() => {
    const items: Array<{ type: "positive" | "negative" | "neutral"; icon: any; title: string; text: string }> = [];

    // Cash flow / Savings insight
    if (comp.savingsDelta > 0) {
      items.push({
        type: "positive",
        icon: TrendingUp,
        title: "Cash Flow Surplus Expanded",
        text: `Net surplus increased by ${fmtINRFull(comp.savingsDelta)} (${comp.previousSavings > 0 ? "+" + ((comp.savingsDelta / comp.previousSavings) * 100).toFixed(1) + "%" : "improved"}), boosting savings rate to ${comp.currentSavingsRate.toFixed(1)}%.`,
      });
    } else if (comp.savingsDelta < 0) {
      items.push({
        type: "negative",
        icon: TrendingDown,
        title: "Cash Flow Surplus Contracted",
        text: `Net surplus narrowed by ${fmtINRFull(Math.abs(comp.savingsDelta))}. Current savings rate stands at ${comp.currentSavingsRate.toFixed(1)}% vs ${comp.previousSavingsRate.toFixed(1)}% previously.`,
      });
    }

    // Top Expense Driver
    const biggestSpike = [...comp.expenseCategoryComps]
      .filter((c) => c.delta > 0)
      .sort((a, b) => b.delta - a.delta)[0];
    if (biggestSpike && biggestSpike.delta > 500) {
      items.push({
        type: "negative",
        icon: AlertTriangle,
        title: `Primary Cost Increase: ${biggestSpike.category}`,
        text: `Spending rose by ${fmtINRFull(biggestSpike.delta)} (${biggestSpike.isNew ? "New Category" : "+" + biggestSpike.pctChange.toFixed(0) + "%"}), accounting for ${biggestSpike.sharePct.toFixed(1)}% of total period spend.`,
      });
    }

    // Top Expense Reduction (Cost Efficiency)
    const biggestReduction = [...comp.expenseCategoryComps]
      .filter((c) => c.delta < 0)
      .sort((a, b) => a.delta - b.delta)[0];
    if (biggestReduction && Math.abs(biggestReduction.delta) > 500) {
      items.push({
        type: "positive",
        icon: ShieldCheck,
        title: `Top Cost Reduction: ${biggestReduction.category}`,
        text: `Spending trimmed by ${fmtINRFull(Math.abs(biggestReduction.delta))} (${biggestReduction.pctChange.toFixed(0)}%), lowering period outflow efficiently.`,
      });
    }

    // Net Worth Trajectory
    if (comp.currentNW !== 0 && comp.previousNW !== 0 && Math.abs(comp.nwDelta) > 1000) {
      const isNWUp = comp.nwDelta > 0;
      items.push({
        type: isNWUp ? "positive" : "neutral",
        icon: Sparkles,
        title: `Net Worth Trajectory: ${isNWUp ? "Upward" : "Adjusted"}`,
        text: `Total estimated net worth shifted by ${isNWUp ? "+" : ""}${fmtINRFull(comp.nwDelta)} across the compared timeframe.`,
      });
    }

    return items;
  }, [comp]);

  const handleExportCSV = () => {
    const rows = sortedAndFilteredCategoryComps.map((c) => ({
      Category: c.category,
      [comp.currentLabel]: c.current,
      [comp.previousLabel]: c.previous,
      "Share %": `${c.sharePct.toFixed(1)}%`,
      "Net Change": c.delta,
      "% Change": c.isNew ? "New" : `${c.pctChange > 0 ? "+" : ""}${c.pctChange.toFixed(1)}%`,
    }));
    const safe = (s: any) => String(s).replace(/[^a-zA-Z0-9]+/g, "_");
    exportArrayToCSV(
      rows,
      [
        { key: "Category", label: "Category" },
        { key: comp.currentLabel, label: comp.currentLabel },
        { key: comp.previousLabel, label: comp.previousLabel },
        { key: "Share %", label: "Share of Period %" },
        { key: "Net Change", label: "Net Change" },
        { key: "% Change", label: "% Change" },
      ],
      `Comparison_${categoryView}_${safe(comp.currentLabel)}_vs_${safe(comp.previousLabel)}.csv`
    );
  };

  const handleSwapPeriods = () => {
    setActivePreset("custom");
    setPeriodA(periodB);
    setPeriodB(periodA);
  };

  const DeltaIndicator: React.FC<{
    value: number;
    showAmount?: boolean;
    higherIsBetter?: boolean;
  }> = ({ value, showAmount = true, higherIsBetter = false }) => {
    if (!value || Math.abs(value) < 1) {
      return (
        <Badge variant="muted">
          <Minus size={12} /> Stable
        </Badge>
      );
    }
    const isUp = value > 0;
    const isGood = higherIsBetter ? isUp : !isUp;
    return (
      <Badge
        variant={isGood ? "sage" : "rust"}
        style={{ textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 800 }}
      >
        {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {isUp ? "Increased" : "Decreased"}
        {showAmount && (
          <span style={{ fontWeight: 900, marginLeft: 2 }}>
            <Money value={Math.abs(value)} variant="full" />
          </span>
        )}
      </Badge>
    );
  };

  return (
    <div className="comparison-report" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="print-only-header" style={{ display: "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `2px solid ${THEME.ink}`, paddingBottom: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Executive Period Comparison Report</h1>
            <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
              Comparing {comp.currentLabel} vs {comp.previousLabel} • Generated on {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}
            </div>
          </div>
          <img src="/logo-horizontal.png" alt="ArthaDrishti" style={{ height: 40, width: "auto" }} />
        </div>
      </div>

      {/* Header & Main Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <SectionTitle sub="Side-by-side financial variance, cash flow dynamics & category drift analytics">
          Comparison Reports
        </SectionTitle>

        <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Quick Preset Selector */}
          <div
            style={{
              display: "flex",
              gap: 4,
              background: "var(--surface-0)",
              border: `1.5px solid ${THEME.line}`,
              padding: "4px",
              borderRadius: 14,
              boxShadow: "var(--shadow-xs)",
            }}
          >
            {[
              { id: "mom", label: "MoM" },
              { id: "qoq", label: "QoQ" },
              { id: "yoy", label: "YoY" },
              { id: "fy", label: "FY vs FY" },
            ].map((p) => {
              const active = activePreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handlePresetSelect(p.id)}
                  aria-pressed={active}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 10,
                    border: "none",
                    background: active ? THEME.ink : "transparent",
                    color: active ? "var(--surface-0)" : THEME.muted,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <Button variant="accent" size="sm" icon={<Printer size={14} />} onClick={() => window.print()}>
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Granular Period Selectors & Mode Picker */}
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 14,
          background: "var(--surface-0)",
          border: `1.5px solid ${THEME.line}`,
          padding: "12px 18px",
          borderRadius: 16,
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Granularity:
          </span>
          <div style={{ display: "flex", gap: 4, background: "var(--surface-1)", padding: 3, borderRadius: 10 }}>
            {[
              { id: "month", label: "Month" },
              { id: "quarter", label: "Quarter" },
              { id: "half", label: "Half-Year" },
              { id: "year", label: "Fiscal Year" },
            ].map((m) => {
              const active = compMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => handleModeChange(m.id)}
                  aria-pressed={active}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: active ? "var(--surface-0)" : "transparent",
                    color: active ? THEME.ink : THEME.muted,
                    fontSize: 12,
                    fontWeight: active ? 800 : 600,
                    cursor: "pointer",
                    boxShadow: active ? "var(--shadow-xs)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>Period A:</span>
            <select
              value={periodA}
              onChange={(e) => {
                setActivePreset("custom");
                setPeriodA(e.target.value);
              }}
              aria-label="First period to compare"
              style={selectStyle}
            >
              {periodOptions
                .filter((key) => key !== periodB)
                .map((key) => (
                  <option key={key} value={key}>
                    {getPeriodLabel(compMode, key)}
                  </option>
                ))}
            </select>
          </div>

          <button
            onClick={handleSwapPeriods}
            aria-label="Swap periods"
            title="Swap periods"
            className="card-lift"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 10,
              border: `1.5px solid ${THEME.line}`,
              background: "var(--surface-1)",
              color: THEME.ink,
              cursor: "pointer",
            }}
          >
            <ArrowLeftRight size={14} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>Period B:</span>
            <select
              value={periodB}
              onChange={(e) => {
                setActivePreset("custom");
                setPeriodB(e.target.value);
              }}
              aria-label="Second period to compare"
              style={selectStyle}
            >
              {periodOptions
                .filter((key) => key !== periodA)
                .map((key) => (
                  <option key={key} value={key}>
                    {getPeriodLabel(compMode, key)}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Executive KPI Variance Hero Matrix */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink, letterSpacing: "-0.01em" }}>
            Performance Matrix: <span style={{ color: THEME.accent }}>{comp.currentLabel}</span> vs <span style={{ color: THEME.muted }}>{comp.previousLabel}</span>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          {/* Expenses Card */}
          <ExecutiveSplitCard
            title="Expenses"
            icon={Wallet}
            currentLabel={comp.currentLabel}
            previousLabel={comp.previousLabel}
            currentValue={comp.currentExpense}
            previousValue={comp.previousExpense}
            delta={comp.expenseDelta}
            percentChange={
              comp.previousExpense > 0 ? (comp.expenseDelta / comp.previousExpense) * 100 : undefined
            }
            deltaIndicator={<DeltaIndicator value={comp.expenseDelta} showAmount={false} />}
          />

          {/* Income Card */}
          <ExecutiveSplitCard
            title="Income"
            icon={PiggyBank}
            currentLabel={comp.currentLabel}
            previousLabel={comp.previousLabel}
            currentValue={comp.currentIncome}
            previousValue={comp.previousIncome}
            delta={comp.incomeDelta}
            percentChange={
              comp.previousIncome > 0 ? (comp.incomeDelta / comp.previousIncome) * 100 : undefined
            }
            isIncome={true}
            deltaIndicator={<DeltaIndicator value={comp.incomeDelta} showAmount={false} higherIsBetter />}
          />

          {/* Net Cash Flow / Savings Surplus */}
          <ExecutiveSplitCard
            title="Net Cash Surplus"
            icon={TrendingUp}
            currentLabel={comp.currentLabel}
            previousLabel={comp.previousLabel}
            currentValue={comp.currentSavings}
            previousValue={comp.previousSavings}
            delta={comp.savingsDelta}
            percentChange={
              comp.previousSavings !== 0 ? (comp.savingsDelta / Math.abs(comp.previousSavings)) * 100 : undefined
            }
            isIncome={true}
            deltaIndicator={<DeltaIndicator value={comp.savingsDelta} showAmount={false} higherIsBetter />}
          />

          {/* Savings Rate Card */}
          <ExecutiveSplitCard
            title="Savings Rate"
            icon={Percent}
            currentLabel={comp.currentLabel}
            previousLabel={comp.previousLabel}
            currentValue={comp.currentSavingsRate}
            previousValue={comp.previousSavingsRate}
            delta={comp.savingsRateDelta}
            percentChange={
              comp.previousSavingsRate > 0 ? (comp.savingsRateDelta / comp.previousSavingsRate) * 100 : undefined
            }
            isRate={true}
            deltaIndicator={<DeltaIndicator value={comp.savingsRateDelta} showAmount={false} higherIsBetter />}
          />

          {/* Net Worth Card */}
          {(comp.currentNW !== 0 || comp.previousNW !== 0) && (
            <ExecutiveSplitCard
              title="Net Worth"
              icon={Sparkles}
              currentLabel={comp.currentLabel}
              previousLabel={comp.previousLabel}
              currentValue={comp.currentNW}
              previousValue={comp.previousNW}
              delta={comp.nwDelta}
              percentChange={
                comp.previousNW !== 0 ? (comp.nwDelta / Math.abs(comp.previousNW)) * 100 : undefined
              }
              isNetWorth={true}
              deltaIndicator={<DeltaIndicator value={comp.nwDelta} showAmount={false} higherIsBetter />}
            />
          )}
        </div>
      </div>

      {/* Smart AI / Executive Highlights Banner */}
      {highlights.length > 0 && (
        <Card style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <Zap size={16} style={{ color: THEME.accent }} />
            <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Smart Comparison Highlights & Drift Insights
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {highlights.map((h, i) => {
              const IconComp = h.icon;
              return (
                <div
                  key={i}
                  style={{
                    background: "var(--surface-1)",
                    border: `1px solid ${THEME.line}`,
                    borderRadius: 12,
                    padding: "12px 14px",
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background:
                        h.type === "positive"
                          ? `color-mix(in srgb, ${THEME.sage} 15%, transparent)`
                          : h.type === "negative"
                          ? `color-mix(in srgb, ${THEME.rust} 15%, transparent)`
                          : `color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
                      color:
                        h.type === "positive"
                          ? THEME.sage
                          : h.type === "negative"
                          ? THEME.rust
                          : THEME.accent,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconComp size={15} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>{h.title}</div>
                    <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.45 }}>{h.text}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Category Breakdown & Visual Analytics Toolbar */}
      {(comp.expenseCategoryComps.length > 0 || comp.incomeCategoryComps.length > 0) && (
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {/* Dimension Selector: Expenses vs Income */}
          <div style={{ display: "flex", gap: 4, background: "var(--surface-0)", border: `1.5px solid ${THEME.line}`, padding: 4, borderRadius: 12 }}>
            {[
              { id: "expense", label: "Expense Breakdown" },
              { id: "income", label: "Income Breakdown" },
            ].map((v) => {
              const active = categoryView === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setCategoryView(v.id as "expense" | "income")}
                  aria-pressed={active}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 9,
                    background: active ? THEME.accent : "transparent",
                    border: "none",
                    color: active ? "#fff" : THEME.ink,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                  }}
                >
                  {v.label}
                </button>
              );
            })}
          </div>

          {/* Visualization Mode & Search Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Visual Type: Dual vs Variance */}
            <div style={{ display: "flex", gap: 4, background: "var(--surface-0)", border: `1.5px solid ${THEME.line}`, padding: 4, borderRadius: 12 }}>
              <button
                onClick={() => setChartMode("dual")}
                aria-pressed={chartMode === "dual"}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "none",
                  background: chartMode === "dual" ? "var(--surface-2)" : "transparent",
                  color: chartMode === "dual" ? THEME.ink : THEME.muted,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Dual Bar
              </button>
              <button
                onClick={() => setChartMode("variance")}
                aria-pressed={chartMode === "variance"}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "none",
                  background: chartMode === "variance" ? "var(--surface-2)" : "transparent",
                  color: chartMode === "variance" ? THEME.ink : THEME.muted,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Net Shift (+/-)
              </button>
            </div>

            {/* Top count filter */}
            <select
              value={topCount}
              onChange={(e) => setTopCount(Number(e.target.value))}
              aria-label="Category limit"
              style={{ ...selectStyle, padding: "6px 10px", fontSize: 12 }}
            >
              <option value={5}>Top 5</option>
              <option value={10}>Top 10</option>
              <option value={15}>Top 15</option>
              <option value={0}>All Categories</option>
            </select>

            {/* Search Input */}
            <div style={{ position: "relative" }}>
              <Search
                size={15}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: THEME.muted,
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                placeholder="Filter categories…"
                aria-label="Search categories"
                style={{
                  border: `1.5px solid ${THEME.line}`,
                  borderRadius: 12,
                  padding: `7px ${catSearch ? 32 : 12}px 7px 34px`,
                  fontSize: 12,
                  color: THEME.ink,
                  background: "var(--surface-0)",
                  boxShadow: "var(--shadow-xs)",
                  width: 170,
                }}
              />
              {catSearch && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setCatSearch("")}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: "50%",
                    transform: "translateY(-50%)",
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
              icon={<Download size={13} />}
              onClick={handleExportCSV}
              disabled={!sortedAndFilteredCategoryComps.length}
            >
              Export CSV
            </Button>
          </div>
        </div>
      )}

      {/* Interactive Category Comparison Visual Chart */}
      {chartData.length > 0 && (
        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 800,
                  color: THEME.ink,
                  letterSpacing: "-0.015em",
                }}
              >
                {categoryView === "expense" ? "Expense" : "Income"} Category Comparison ({topCount > 0 ? `Top ${topCount}` : "All"})
              </h3>
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                {chartMode === "dual"
                  ? `Side-by-side volume comparison across ${comp.currentLabel} and ${comp.previousLabel}`
                  : `Net absolute drift (+/-) between ${comp.currentLabel} and ${comp.previousLabel}`}
              </div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>
              {chartData.length} categories shown
            </div>
          </div>

          <div style={{ width: "100%", height: Math.max(300, chartData.length * 36), position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              {chartMode === "dual" ? (
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => (privacyMode ? "••••" : fmtINRFull(v))}
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={120}
                    tick={{ fontSize: 11, fill: THEME.ink, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: THEME.line, opacity: 0.3 }} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                    formatter={(value: string) => (
                      <span style={{ color: THEME.ink, fontWeight: 700 }}>{value}</span>
                    )}
                  />
                  <Bar dataKey={comp.currentLabel} fill={THEME.accent} radius={[0, 6, 6, 0]} />
                  <Bar
                    dataKey={comp.previousLabel}
                    fill={`color-mix(in srgb, ${THEME.accent} 32%, transparent)`}
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              ) : (
                <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => (privacyMode ? "••••" : `${v > 0 ? "+" : ""}${fmtINRFull(v)}`)}
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={120}
                    tick={{ fontSize: 11, fill: THEME.ink, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ReferenceLine x={0} stroke={THEME.line} strokeWidth={2} />
                  <Tooltip content={<VarianceTooltip />} cursor={{ fill: THEME.line, opacity: 0.3 }} />
                  <Bar dataKey="delta" radius={[0, 6, 6, 0]}>
                    {chartData.map((entry, index) => {
                      const isUp = entry.delta > 0;
                      const isGood = categoryView === "expense" ? !isUp : isUp;
                      return <Cell key={`cell-${index}`} fill={isGood ? THEME.sage : THEME.rust} />;
                    })}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Detailed Interactive Category Table */}
      {activeCategoryComps.length > 0 && (
        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 800,
                  color: THEME.ink,
                  letterSpacing: "-0.015em",
                }}
              >
                {categoryView === "expense" ? "Expense" : "Income"} Category Detail
              </h3>
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                Click column headers to sort by volume, absolute net change, or growth percentage
              </div>
            </div>

            <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>
              {sortedAndFilteredCategoryComps.length} categories listed
            </div>
          </div>

          {sortedAndFilteredCategoryComps.length > 0 ? (
            <div className="mobile-table-wrap">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th
                      style={{ ...thStyle, cursor: "pointer" }}
                      onClick={() => handleSort("category")}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        Category
                        {sortField === "category" && (sortOrder === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th
                      style={{ ...thStyle, textAlign: "right", cursor: "pointer" }}
                      onClick={() => handleSort("current")}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                        {comp.currentLabel}
                        {sortField === "current" && (sortOrder === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th
                      style={{ ...thStyle, textAlign: "right", cursor: "pointer" }}
                      onClick={() => handleSort("previous")}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                        {comp.previousLabel}
                        {sortField === "previous" && (sortOrder === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th
                      style={{ ...thStyle, textAlign: "right", cursor: "pointer" }}
                      onClick={() => handleSort("sharePct")}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                        Share %
                        {sortField === "sharePct" && (sortOrder === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th
                      style={{ ...thStyle, textAlign: "right", cursor: "pointer" }}
                      onClick={() => handleSort("delta")}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                        Net Shift
                        {sortField === "delta" && (sortOrder === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th
                      style={{ ...thStyle, textAlign: "right", cursor: "pointer" }}
                      onClick={() => handleSort("pctChange")}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                        Growth %
                        {sortField === "pctChange" && (sortOrder === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                      </div>
                    </th>
                    <th style={{ ...thStyle, textAlign: "center", width: 140 }}>Volume Comparison</th>
                    <th style={{ ...thStyle, textAlign: "right", paddingRight: 16 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAndFilteredCategoryComps.map((c) => {
                    const isUp = c.delta > 0;
                    const isGood = categoryView === "expense" ? !isUp : isUp;
                    const maxRowVal = Math.max(c.current, c.previous, 1);
                    const currBarPct = Math.min(100, Math.round((c.current / maxRowVal) * 100));
                    const prevBarPct = Math.min(100, Math.round((c.previous / maxRowVal) * 100));

                    return (
                      <tr
                        key={c.category}
                        style={{ borderBottom: `1px solid ${THEME.line}` }}
                        className="table-row-hover"
                      >
                        <td style={{ ...tdStyle, paddingLeft: 14, fontWeight: 700, color: THEME.ink }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: isGood ? THEME.sage : THEME.rust,
                              }}
                            />
                            {c.category}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: THEME.ink }}>
                          <Money value={c.current} variant="full" />
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", color: THEME.muted, fontWeight: 600 }}>
                          <Money value={c.previous} variant="full" />
                        </td>
                        <td style={{ ...tdStyle, textAlign: "right", color: THEME.muted, fontSize: 12 }}>
                          {c.sharePct.toFixed(1)}%
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "right",
                            fontWeight: 800,
                            color: isGood ? THEME.sage : THEME.rust,
                          }}
                        >
                          {c.delta > 0 ? "+" : ""}
                          <Money value={c.delta} variant="full" />
                        </td>
                        <td
                          style={{
                            ...tdStyle,
                            textAlign: "right",
                            fontWeight: 800,
                            color: c.isNew ? THEME.accent : isGood ? THEME.sage : THEME.rust,
                          }}
                        >
                          {c.isNew ? "New" : `${c.pctChange > 0 ? "+" : ""}${c.pctChange.toFixed(0)}%`}
                        </td>

                        {/* Inline visual distribution bar */}
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 3, width: "100%" }}>
                            <div style={{ display: "flex", height: 4, background: "var(--surface-2)", borderRadius: 2, overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${currBarPct}%`,
                                  background: THEME.accent,
                                  borderRadius: 2,
                                }}
                                title={`${comp.currentLabel}: ${fmtINRFull(c.current)}`}
                              />
                            </div>
                            <div style={{ display: "flex", height: 3, background: "var(--surface-2)", borderRadius: 2, overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${prevBarPct}%`,
                                  background: THEME.muted,
                                  opacity: 0.45,
                                  borderRadius: 2,
                                }}
                                title={`${comp.previousLabel}: ${fmtINRFull(c.previous)}`}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Dynamic Status Badge */}
                        <td style={{ ...tdStyle, textAlign: "right", paddingRight: 16 }}>
                          {c.isNew ? (
                            <Badge variant="accent">New</Badge>
                          ) : c.pctChange > 20 ? (
                            <Badge variant={categoryView === "expense" ? "rust" : "sage"}>Spike &gt;20%</Badge>
                          ) : c.pctChange < -15 ? (
                            <Badge variant={categoryView === "expense" ? "sage" : "rust"}>Reduced</Badge>
                          ) : (
                            <Badge variant="muted">Stable</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: "color-mix(in srgb, var(--surface-1) 80%, transparent)", borderTop: `2px solid ${THEME.line}` }}>
                    <td style={{ ...tdStyle, fontWeight: 900, color: THEME.ink }}>Total Aggregates</td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 900, color: THEME.ink }}>
                      <Money value={categoryView === "expense" ? comp.currentExpense : comp.currentIncome} variant="full" />
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 900, color: THEME.muted }}>
                      <Money value={categoryView === "expense" ? comp.previousExpense : comp.previousIncome} variant="full" />
                    </td>
                    <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: THEME.muted }}>100%</td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        fontWeight: 900,
                        color:
                          (categoryView === "expense" ? comp.expenseDelta < 0 : comp.incomeDelta > 0)
                            ? THEME.sage
                            : THEME.rust,
                      }}
                    >
                      {(categoryView === "expense" ? comp.expenseDelta : comp.incomeDelta) > 0 ? "+" : ""}
                      <Money value={categoryView === "expense" ? comp.expenseDelta : comp.incomeDelta} variant="full" />
                    </td>
                    <td
                      style={{
                        ...tdStyle,
                        textAlign: "right",
                        fontWeight: 900,
                        color:
                          (categoryView === "expense" ? comp.expenseDelta < 0 : comp.incomeDelta > 0)
                            ? THEME.sage
                            : THEME.rust,
                      }}
                    >
                      {categoryView === "expense"
                        ? comp.previousExpense > 0
                          ? `${comp.expenseDelta > 0 ? "+" : ""}${((comp.expenseDelta / comp.previousExpense) * 100).toFixed(1)}%`
                          : "—"
                        : comp.previousIncome > 0
                        ? `${comp.incomeDelta > 0 ? "+" : ""}${((comp.incomeDelta / comp.previousIncome) * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                    <td style={{ ...tdStyle }} />
                    <td style={{ ...tdStyle, paddingRight: 16 }} />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div style={{ padding: "32px 0", textAlign: "center", fontSize: 13, color: THEME.muted }}>
              No categories match “{catSearch}”.
            </div>
          )}
        </Card>
      )}

      {activeCategoryComps.length === 0 && (
        <EmptyState
          icon={BarChart3}
          title="Not Enough Comparison Data"
          description={
            categoryView === "expense"
              ? "Add expense transactions across multiple periods to unlock side-by-side variance analysis."
              : "Add income entries across multiple periods to unlock income drift and comparison reports."
          }
        />
      )}
    </div>
  );
};
export default ComparisonReportsTab;
