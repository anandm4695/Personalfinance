/* eslint-disable */
// @ts-nocheck
import React, { useState, useMemo, useEffect } from "react";
import {
  BarChart3,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Printer,
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
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Prv } from "../../context/PrivacyContext";
import { EmptyState } from "../ui/EmptyState";

const printStyles = `@media print {
  @page { margin: 15mm 20mm; size: A4 portrait; }
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
}`;

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

const getMonthLabel = (ym) => {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} '${y.slice(-2)}`;
};

const selectStyle: React.CSSProperties = {
  padding: "6px 12px",
  borderRadius: 8,
  border: `1px solid ${THEME.line}`,
  background: "var(--surface-0)",
  color: THEME.ink,
  fontSize: 13,
  fontWeight: 700,
  cursor: "pointer",
  outline: "none",
};

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
              background: p.color || p.fill,
              display: "inline-block",
            }}
          />
          <span style={{ color: THEME.muted, fontWeight: 500 }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: THEME.ink }}>
            <Prv>{formatter ? formatter(p.value) : fmtINRFull(p.value)}</Prv>
          </span>
        </div>
      ))}
    </div>
  );
};

/* ─── Comparison Split Card ───────────────────────────────────── */
const ComparisonSplitCard = ({
  label,
  currentLabel,
  previousLabel,
  currentValue,
  previousValue,
  delta,
  percentChange,
  isIncome = false,
  isNetWorth = false,
  deltaIndicator,
}: any) => {
  const isUp = delta > 0;
  return (
    <div
      className="card-lift"
      style={{
        background:
          "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 12%, var(--surface-0)) 100%)",
        border: `1.5px solid ${THEME.line}`,
        borderRadius: 16,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        boxShadow:
          "0 4px 20px -2px rgba(0, 0, 0, 0.02), inset 0 1px 0 color-mix(in srgb, var(--t-ink) 4%, transparent)",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: THEME.muted,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>

      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              color: THEME.muted,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 4,
            }}
          >
            {currentLabel}
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: isIncome ? THEME.sage : isNetWorth ? THEME.accent : THEME.ink,
              letterSpacing: "-0.02em",
            }}
          >
            <Prv>{fmtINRFull(currentValue)}</Prv>
          </div>
        </div>

        <div style={{ fontSize: 18, color: THEME.line, fontWeight: 600, padding: "0 6px" }}>vs</div>

        <div style={{ flex: 1, textAlign: "right" }}>
          <div
            style={{
              fontSize: 10,
              color: THEME.muted,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 4,
            }}
          >
            {previousLabel}
          </div>
          <div
            style={{ fontSize: 20, fontWeight: 700, color: THEME.muted, letterSpacing: "-0.02em" }}
          >
            <Prv>{fmtINRFull(previousValue)}</Prv>
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: `1px solid ${THEME.line}`,
          paddingTop: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        {deltaIndicator}
        {percentChange !== undefined && percentChange !== 0 && (
          <span
            style={{
              fontSize: 12,
              color: isIncome ? (isUp ? THEME.sage : THEME.rust) : isUp ? THEME.rust : THEME.sage,
              fontWeight: 700,
            }}
          >
            ({isUp ? "+" : ""}
            {percentChange.toFixed(1)}%)
          </span>
        )}
      </div>
    </div>
  );
};

export const ComparisonReportsTab = ({ state, metrics }) => {
  // ── Inject print styles (scoped to this tab, cleaned up on unmount) ──
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
  const lastYM = `${now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()}-${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, "0")}`;

  // Fiscal-year period key helpers (FY runs Apr–Mar; quarters/halves anchored to FY start year)
  const getFYQuarterKey = (ym) => {
    const [yStr, mStr] = ym.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    if (m >= 4 && m <= 6) return `${y}-Q1`;
    if (m >= 7 && m <= 9) return `${y}-Q2`;
    if (m >= 10 && m <= 12) return `${y}-Q3`;
    return `${y - 1}-Q4`;
  };
  const getFYHalfKey = (ym) => {
    const [yStr, mStr] = ym.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    if (m >= 4 && m <= 9) return `${y}-H1`;
    if (m >= 10 && m <= 12) return `${y}-H2`;
    return `${y - 1}-H2`;
  };
  const getFYYearKey = (ym) => {
    const [yStr, mStr] = ym.split("-");
    const y = parseInt(yStr, 10);
    const m = parseInt(mStr, 10);
    return String(m >= 4 ? y : y - 1);
  };

  const monthsInQuarter = (key) => {
    const [fyStr, qStr] = key.split("-Q");
    const fy = parseInt(fyStr, 10);
    const q = parseInt(qStr, 10);
    const table = {
      1: [
        [fy, 4],
        [fy, 5],
        [fy, 6],
      ],
      2: [
        [fy, 7],
        [fy, 8],
        [fy, 9],
      ],
      3: [
        [fy, 10],
        [fy, 11],
        [fy, 12],
      ],
      4: [
        [fy + 1, 1],
        [fy + 1, 2],
        [fy + 1, 3],
      ],
    };
    return table[q].map(([y, m]) => `${y}-${String(m).padStart(2, "0")}`);
  };
  const monthsInHalf = (key) => {
    const [fyStr, hStr] = key.split("-H");
    const fy = parseInt(fyStr, 10);
    const h = parseInt(hStr, 10);
    if (h === 1) return [4, 5, 6, 7, 8, 9].map((m) => `${fy}-${String(m).padStart(2, "0")}`);
    return [
      ...[10, 11, 12].map((m) => `${fy}-${String(m).padStart(2, "0")}`),
      ...[1, 2, 3].map((m) => `${fy + 1}-${String(m).padStart(2, "0")}`),
    ];
  };
  const monthsInYear = (key) => {
    const fy = parseInt(key, 10);
    return [
      ...[4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => `${fy}-${String(m).padStart(2, "0")}`),
      ...[1, 2, 3].map((m) => `${fy + 1}-${String(m).padStart(2, "0")}`),
    ];
  };
  const monthsForPeriod = (periodType, key) =>
    periodType === "month"
      ? [key]
      : periodType === "quarter"
        ? monthsInQuarter(key)
        : periodType === "half"
          ? monthsInHalf(key)
          : monthsInYear(key);

  const getQuarterLabel = (key) => {
    const [fyStr, qStr] = key.split("-Q");
    const fy = parseInt(fyStr, 10);
    return `Q${qStr} FY${String(fy).slice(-2)}-${String(fy + 1).slice(-2)}`;
  };
  const getHalfLabel = (key) => {
    const [fyStr, hStr] = key.split("-H");
    const fy = parseInt(fyStr, 10);
    return `H${hStr} FY${String(fy).slice(-2)}-${String(fy + 1).slice(-2)}`;
  };
  const getYearLabel = (key) => {
    const fy = parseInt(key, 10);
    return `FY ${fy}-${String(fy + 1).slice(-2)}`;
  };
  const getPeriodLabel = (periodType, key) =>
    periodType === "month"
      ? getMonthLabel(key)
      : periodType === "quarter"
        ? getQuarterLabel(key)
        : periodType === "half"
          ? getHalfLabel(key)
          : getYearLabel(key);

  const prevPeriodKey = (periodType, key) => {
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
  const [periodA, setPeriodA] = useState(currentYM);
  const [periodB, setPeriodB] = useState(lastYM);

  const handleModeChange = (mode) => {
    setCompMode(mode);
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

  // Same internal-transfer/investment exclusion useMetrics.ts and MonthlyReportModal.tsx
  // apply — without it, a self-transfer between own accounts (both a debit and a credit
  // on the "Transfer" category) inflated both income and expense here, and an Investment
  // SIP debit counted as "expense" here while the Dashboard excludes it, so this tab's
  // period totals and category deltas silently disagreed with every other report.
  const isTransferCat = (cat) => ["Transfer", "Self Transfer", "Self-Transfer"].includes(cat || "");

  // Monthly expense totals + category breakdown (debit transactions)
  const monthlyExpense = useMemo(() => {
    const map = {};
    (state.transactions || [])
      .filter(
        (t) => t.type === "debit" && t.date && !isTransferCat(t.category) && t.category !== "Investment"
      )
      .forEach((t) => {
        const ym = t.date.slice(0, 7);
        const cat = t.category || "Uncategorized";
        if (!map[ym]) map[ym] = { total: 0, cats: {} };
        map[ym].total += Number(t.amount || 0);
        map[ym].cats[cat] = (map[ym].cats[cat] || 0) + Number(t.amount || 0);
      });
    // Rent paid via the Rented Properties ledger (not logged as a transaction) — same
    // ledger-vs-transaction reconciliation useMetrics.ts/MonthlyReportModal.tsx apply, so a
    // household paying rent purely through that ledger isn't silently missing from this tab.
    (state.rentedProperties || []).forEach((p) => {
      (p.payments || []).forEach((pay) => {
        if (!pay.date) return;
        const ym = pay.date.slice(0, 7);
        const hasRentTxn = (state.transactions || []).some(
          (t) => t.date?.slice(0, 7) === ym && t.type === "debit" && (t.category || "").toLowerCase() === "rent"
        );
        if (hasRentTxn) return;
        if (!map[ym]) map[ym] = { total: 0, cats: {} };
        map[ym].total += Number(pay.amount || 0);
        map[ym].cats["Rent"] = (map[ym].cats["Rent"] || 0) + Number(pay.amount || 0);
      });
    });
    return map;
  }, [state.transactions, state.rentedProperties]);

  // Monthly income, tracked separately by source so period aggregates can
  // prefer the manual income ledger over credit transactions (avoids double-counting
  // the same income when both are logged for a period).
  const monthlyIncomeLedger = useMemo(() => {
    const map = {};
    (state.income || [])
      .filter((i) => i.date)
      .forEach((i) => {
        const ym = i.date.slice(0, 7);
        map[ym] = (map[ym] || 0) + Number(i.amount || 0);
      });
    return map;
  }, [state.income]);

  const monthlyIncomeTxn = useMemo(() => {
    const map = {};
    (state.transactions || [])
      .filter((t) => t.type === "credit" && t.date && !isTransferCat(t.category))
      .forEach((t) => {
        const ym = t.date.slice(0, 7);
        map[ym] = (map[ym] || 0) + Number(t.amount || 0);
      });
    return map;
  }, [state.transactions]);

  const availableMonths = useMemo(() => {
    const set = new Set([
      ...Object.keys(monthlyExpense),
      ...Object.keys(monthlyIncomeLedger),
      ...Object.keys(monthlyIncomeTxn),
      currentYM,
    ]);
    return [...set].sort().reverse();
  }, [monthlyExpense, monthlyIncomeLedger, monthlyIncomeTxn, currentYM]);

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
    const aggregate = (key) => {
      const months = monthsForPeriod(compMode, key);
      let total = 0;
      let incomeLedger = 0;
      let incomeTxn = 0;
      const cats = {};
      months.forEach((ym) => {
        const e = monthlyExpense[ym];
        if (e) {
          total += e.total;
          Object.entries(e.cats).forEach(([cat, amt]: any) => {
            cats[cat] = (cats[cat] || 0) + amt;
          });
        }
        incomeLedger += monthlyIncomeLedger[ym] || 0;
        incomeTxn += monthlyIncomeTxn[ym] || 0;
      });
      const income = incomeLedger > 0 ? incomeLedger : incomeTxn;
      return { total, income, cats };
    };

    const current = aggregate(periodA);
    const previous = aggregate(periodB);

    const allCats = new Set([...Object.keys(current.cats), ...Object.keys(previous.cats)]);
    const categoryComps = [...allCats]
      .map((cat) => {
        const curr = current.cats[cat] || 0;
        const prev = previous.cats[cat] || 0;
        const delta = curr - prev;
        const pctChange = prev > 0 ? (delta / prev) * 100 : curr > 0 ? 100 : 0;
        return {
          category: cat,
          current: Math.round(curr),
          previous: Math.round(prev),
          delta: Math.round(delta),
          pctChange,
        };
      })
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    // Net worth: use live net worth if the period includes the current month,
    // otherwise the latest snapshot on record within that period.
    const nwHistory = state.netWorthHistory || [];
    const findNW = (months) => {
      if (months.includes(currentYM)) return metrics.netWorth || 0;
      for (let i = months.length - 1; i >= 0; i--) {
        const entry = nwHistory.find((h) => h.month === months[i]);
        if (entry) return entry.netWorth || 0;
      }
      return 0;
    };
    const currentNW = findNW(monthsForPeriod(compMode, periodA));
    const previousNW = findNW(monthsForPeriod(compMode, periodB));

    return {
      currentLabel: getPeriodLabel(compMode, periodA),
      previousLabel: getPeriodLabel(compMode, periodB),
      currentExpense: current.total,
      previousExpense: previous.total,
      currentIncome: current.income,
      previousIncome: previous.income,
      expenseDelta: current.total - previous.total,
      incomeDelta: current.income - previous.income,
      currentNW,
      previousNW,
      nwDelta: currentNW - previousNW,
      categoryComps,
    };
  }, [compMode, periodA, periodB, monthlyExpense, monthlyIncomeLedger, monthlyIncomeTxn, state.netWorthHistory, metrics, currentYM]);

  // Chart data for category comparison
  const chartData = useMemo(() => {
    return comp.categoryComps.slice(0, 10).map((c) => ({
      category: c.category.length > 12 ? c.category.slice(0, 12) + "…" : c.category,
      [comp.currentLabel]: c.current,
      [comp.previousLabel]: c.previous,
    }));
  }, [comp]);

  const DeltaIndicator = ({ value, showAmount = true }) => {
    if (!value || Math.abs(value) < 1) {
      return (
        <Badge variant="muted">
          <Minus size={12} /> Stable
        </Badge>
      );
    }
    const isUp = value > 0;
    return (
      <Badge
        variant={isUp ? "rust" : "sage"}
        style={{ textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 800 }}
      >
        {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {isUp ? "Increased" : "Decreased"}
        {showAmount && (
          <span style={{ fontWeight: 900, marginLeft: 2 }}>
            <Prv>{fmtINRFull(Math.abs(value))}</Prv>
          </span>
        )}
      </Badge>
    );
  };

  return (
    <div className="comparison-report" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <SectionTitle sub="Compare any month, quarter, half-year, or year side-by-side">
          Comparison Reports
        </SectionTitle>

        <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Premium Mode Switcher */}
          <div
            style={{
              display: "flex",
              gap: 6,
              background: "var(--surface-0)",
              border: `1.5px solid ${THEME.line}`,
              padding: "4px",
              borderRadius: 16,
              boxShadow: "var(--shadow-sm)",
              flexWrap: "wrap",
            }}
          >
          {[
            { id: "month", label: "Month vs Month" },
            { id: "quarter", label: "Quarter vs Quarter" },
            { id: "half", label: "Half-Year vs Half-Year" },
            { id: "year", label: "Year vs Year" },
          ].map((m) => {
            const active = compMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleModeChange(m.id)}
                className={active ? "" : "btn-ghost"}
                aria-pressed={active}
                style={{
                  padding: "6px 14px",
                  borderRadius: 12,
                  background: active ? THEME.accent : "transparent",
                  border: "none",
                  color: active ? "#fff" : THEME.ink,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                }}
              >
                {m.label}
              </button>
            );
          })}
          </div>
          <Button variant="accent" size="sm" icon={<Printer size={14} />} onClick={() => window.print()}>
            Print / PDF
          </Button>
        </div>
      </div>

      {/* Period Selectors */}
      <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>Compare</span>
          <select
            value={periodA}
            onChange={(e) => setPeriodA(e.target.value)}
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
        <span style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>with</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Same period can't appear in both sides — it collapses the two
              comparison series into one under identical chart data keys. */}
          <select
            value={periodB}
            onChange={(e) => setPeriodB(e.target.value)}
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

      {/* Summary Stats Split Cards */}
      <Card style={{ padding: 24 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: THEME.ink,
            marginBottom: 18,
            letterSpacing: "-0.015em",
          }}
        >
          {comp.currentLabel} vs {comp.previousLabel}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          <ComparisonSplitCard
            label="Expenses"
            currentLabel={comp.currentLabel}
            previousLabel={comp.previousLabel}
            currentValue={comp.currentExpense}
            previousValue={comp.previousExpense}
            delta={comp.expenseDelta}
            percentChange={
              comp.previousExpense > 0
                ? (comp.expenseDelta / comp.previousExpense) * 100
                : undefined
            }
            deltaIndicator={<DeltaIndicator value={comp.expenseDelta} showAmount={false} />}
          />

          <ComparisonSplitCard
            label="Income"
            currentLabel={comp.currentLabel}
            previousLabel={comp.previousLabel}
            currentValue={comp.currentIncome}
            previousValue={comp.previousIncome}
            delta={comp.incomeDelta}
            percentChange={
              comp.previousIncome > 0 ? (comp.incomeDelta / comp.previousIncome) * 100 : undefined
            }
            isIncome={true}
            deltaIndicator={<DeltaIndicator value={comp.incomeDelta} showAmount={false} />}
          />

          {compMode === "year" && comp.previousNW > 0 && (
            <ComparisonSplitCard
              label="Net Worth"
              currentLabel={comp.currentLabel}
              previousLabel={comp.previousLabel}
              currentValue={comp.currentNW}
              previousValue={comp.previousNW}
              delta={comp.nwDelta}
              percentChange={comp.previousNW > 0 ? (comp.nwDelta / comp.previousNW) * 100 : undefined}
              isNetWorth={true}
              deltaIndicator={<DeltaIndicator value={comp.nwDelta} showAmount={false} />}
            />
          )}
        </div>
      </Card>

      {/* Category Chart */}
      {chartData.length > 0 && (
        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 20 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                color: THEME.ink,
                letterSpacing: "-0.015em",
              }}
            >
              Category Comparison (Top 10)
            </h3>
            <div style={{ fontSize: 11, color: THEME.muted }}>
              Distribution comparison across selected periods
            </div>
          </div>
          <div style={{ width: "100%", height: 350, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => fmtINRFull(v)}
                tick={{ fontSize: 11, fill: THEME.muted }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="category"
                width={110}
                tick={{ fontSize: 11, fill: THEME.ink, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: THEME.line, opacity: 0.4 }} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                formatter={(value: string) => (
                  <span style={{ color: THEME.ink, fontWeight: 600 }}>{value}</span>
                )}
              />
              <Bar dataKey={comp.currentLabel} fill={THEME.accent} radius={[0, 6, 6, 0]} />
              <Bar
                dataKey={comp.previousLabel}
                fill={`color-mix(in srgb, ${THEME.accent} 30%, transparent)`}
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer></div>
        </Card>
      )}

      {/* Detailed Category Table */}
      {comp.categoryComps.length > 0 && (
        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 20 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                color: THEME.ink,
                letterSpacing: "-0.015em",
              }}
            >
              Category Detail
            </h3>
            <div style={{ fontSize: 11, color: THEME.muted }}>
              Period-over-period comparative analysis by spending category
            </div>
          </div>
          <div className="mobile-table-wrap">
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...th, paddingLeft: 16 }}>Category</th>
                  <th style={{ ...th, textAlign: "right" }}>{comp.currentLabel}</th>
                  <th style={{ ...th, textAlign: "right" }}>{comp.previousLabel}</th>
                  <th style={{ ...th, textAlign: "right" }}>Change</th>
                  <th style={{ ...th, textAlign: "right", paddingRight: 16 }}>%</th>
                </tr>
              </thead>
              <tbody>
                {comp.categoryComps.map((c) => (
                  <tr
                    key={c.category}
                    style={{ borderBottom: `1px solid ${THEME.line}` }}
                    className="table-row-hover"
                  >
                    <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                      {c.category}
                    </td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                      <Prv>{fmtINRFull(c.current)}</Prv>
                    </td>
                    <td style={{ ...td, textAlign: "right", color: THEME.muted, fontWeight: 500 }}>
                      <Prv>{fmtINRFull(c.previous)}</Prv>
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: "right",
                        fontWeight: 700,
                        color: c.delta > 0 ? THEME.rust : c.delta < 0 ? THEME.sage : THEME.muted,
                      }}
                    >
                      {c.delta > 0 ? "+" : ""}
                      <Prv>{fmtINRFull(c.delta)}</Prv>
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: "right",
                        fontWeight: 700,
                        paddingRight: 16,
                        color:
                          c.pctChange > 0 ? THEME.rust : c.pctChange < 0 ? THEME.sage : THEME.muted,
                      }}
                    >
                      {c.pctChange > 0 ? "+" : ""}
                      {c.pctChange.toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {comp.categoryComps.length === 0 && (
        <EmptyState
          icon={BarChart3}
          title="Not Enough Data"
          description="Add transactions across multiple months to see comparison reports."
        />
      )}
    </div>
  );
};
