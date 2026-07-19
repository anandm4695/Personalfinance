/* eslint-disable */
// @ts-nocheck
import React, { useState, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
  Printer,
  FileText,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Shield,
  Coins,
  BarChart3,
  Building2,
  PiggyBank,
  Heart,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import {
  fmtINR,
  fmtINRFull,
  today,
  calcCAGR,
  fdMaturity,
  rdMaturity,
  monthsBetween,
  calculateEpfBalance,
} from "../../utils/finance";
import { Prv } from "../../context/PrivacyContext";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";

/* ── Print-friendly layout ─────────────────────────────────────────── */
const printStyles = `@media print { body * { visibility: hidden; } .investment-statement, .investment-statement * { visibility: visible; } .investment-statement { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } }`;

/* ── Shared table styles ───────────────────────────────────────────── */
const tableWrap: React.CSSProperties = {
  width: "100%",
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
};

const tbl: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
  whiteSpace: "nowrap",
};

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "14px 16px",
  fontWeight: 700,
  fontSize: 10,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  color: THEME.muted,
  borderBottom: `1.5px solid ${THEME.line}`,
  background: "color-mix(in srgb, var(--surface-1) 50%, transparent)",
  whiteSpace: "nowrap",
};

const thRight: React.CSSProperties = { ...th, textAlign: "right" };

const td: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: `1px solid ${THEME.line}`,
  color: THEME.ink,
  fontSize: 13,
  verticalAlign: "middle",
  fontVariantNumeric: "tabular-nums",
};

const tdRight: React.CSSProperties = { ...td, textAlign: "right" };

const tdBold: React.CSSProperties = { ...td, fontWeight: 700 };

const tdBoldRight: React.CSSProperties = { ...tdRight, fontWeight: 700 };

/* ── Color palette for pie chart ───────────────────────────────────── */
const PIE_COLORS = [
  "#4F46E5", // Equity
  "#059669", // Debt
  "#D97706", // Retirement
  "#7C3AED", // Insurance
  "#DC2626", // Other
  "#0891B2",
  "#2563EB",
  "#B91C1C",
];

/* ── P&L color helper ──────────────────────────────────────────────── */
const plColor = (v: number) => (v > 0 ? THEME.sage : v < 0 ? THEME.rust : THEME.muted);

const plSign = (v: number) => (v > 0 ? "+" : "");

/* ── Format percent ────────────────────────────────────────────────── */
const fmtPct = (v: number | null | undefined) =>
  v == null || isNaN(v) ? "--" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

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
      {visible.map((p: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: p.color || p.fill,
              display: "inline-block",
            }}
          />
          <span style={{ color: THEME.muted, fontWeight: 500 }}>{p.name || label}:</span>
          <span style={{ fontWeight: 700, color: THEME.ink }}>
            <Prv>{formatter ? formatter(p.value) : fmtINRFull(p.value)}</Prv>
          </span>
        </div>
      ))}
    </div>
  );
};

/* ── Collapsible section header ────────────────────────────────────── */
const SectionHeader = ({
  icon: Icon,
  title,
  count,
  expanded,
  onToggle,
}: {
  icon: any;
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
}) => (
  <div
    onClick={onToggle}
    role="button"
    tabIndex={0}
    aria-expanded={expanded}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onToggle();
      }
    }}
    className="card-lift"
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "14px 18px",
      cursor: "pointer",
      userSelect: "none",
      background: "var(--surface-0)",
      border: `1.5px solid ${THEME.line}`,
      borderRadius: 14,
      boxShadow: "var(--shadow-sm)",
      transition: "all 0.2s ease",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Icon size={18} color="var(--accent)" />
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: THEME.ink,
          letterSpacing: "-0.015em",
        }}
      >
        {title}
      </span>
      <Badge variant="muted" style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12 }}>
        {count} holding{count !== 1 ? "s" : ""}
      </Badge>
    </div>
    <div style={{ display: "flex", alignItems: "center" }}>
      {expanded ? (
        <ChevronDown size={16} color={THEME.muted} />
      ) : (
        <ChevronRight size={16} color={THEME.muted} />
      )}
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════
   INVESTMENT STATEMENT TAB
   ══════════════════════════════════════════════════════════════════════ */
export const InvestmentStatementTab = ({
  state,
  metrics,
  marketData,
}: {
  state: any;
  metrics: any;
  marketData: any;
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    stocks: true,
    mf: true,
    fd: true,
    rd: true,
    bonds: true,
    ppf: true,
    nps: true,
    epf: true,
    insurance: true,
  });

  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  /* ── Helper: FD current accrued value ────────────────────────────── */
  const fdCurrentValue = (x: any) => {
    const principal = Number(x.principal) || 0;
    const rate = Number(x.rate) || 0;
    const years = Number(x.years) || 0;
    if (!years || !principal) return principal;
    if (x.maturityDate) {
      const [y, m, d] = String(x.maturityDate).split("-").map(Number);
      if (new Date(y, m - 1, d) <= new Date()) return fdMaturity(principal, rate, years);
    }
    const elapsedYears = x.startDate
      ? Math.min(years, monthsBetween(x.startDate, today()) / 12)
      : years;
    return fdMaturity(principal, rate, Math.max(0, elapsedYears));
  };

  /* ── Helper: RD elapsed months ───────────────────────────────────── */
  const rdElapsed = (x: any) =>
    x.startDate
      ? Math.min(Number(x.tenureMonths) || 0, Math.max(0, monthsBetween(x.startDate, today())))
      : Number(x.tenureMonths) || 0;

  const rdCurrentValue = (x: any) =>
    rdMaturity(Number(x.monthly) || 0, Number(x.rate) || 0, rdElapsed(x));

  const rdPrincipal = (x: any) => (Number(x.monthly) || 0) * rdElapsed(x);

  /* ── Helper: Bond accrued current value ──────────────────────────── */
  // Bonds have no live market feed (unlike stocks/MFs), so approximate accrued
  // value via YTM/coupon compounding since purchase, matching the FD/RD
  // accrual approach above. Capped at the bond's own tenure so a matured bond
  // doesn't keep compounding past its maturity date.
  const bondCurrentValue = (x: any) => {
    const principal = Number(x.totalInvestmentAmount || x.faceValue) || 0;
    const rate = Number(x.ytmRate || x.coupon) || 0;
    if (!principal) return 0;
    if (!rate || !x.orderDate) return principal;
    let elapsedYears = Math.max(0, monthsBetween(x.orderDate, today()) / 12);
    if (x.maturityDate) {
      const totalYears = monthsBetween(x.orderDate, x.maturityDate) / 12;
      elapsedYears = Math.min(elapsedYears, Math.max(0, totalYears));
    }
    return principal * Math.pow(1 + rate / 100, elapsedYears);
  };

  /* ── Helper: Days to maturity ────────────────────────────────────── */
  // Parse both dates at local midnight (matching the "+T00:00:00" convention used
  // elsewhere in this file) rather than comparing a bare `new Date(matDate)` (parsed
  // as UTC midnight) against `Date.now()` — for IST (+5:30) that mismatch could
  // flip a same-day maturity to "1d" or an already-matured date to still show days.
  const daysToMaturity = (matDate: string) => {
    if (!matDate) return null;
    const ms =
      new Date(matDate + "T00:00:00").getTime() - new Date(today() + "T00:00:00").getTime();
    return ms > 0 ? Math.round(ms / 86400000) : 0;
  };

  /* ── Helper: Stock live price ────────────────────────────────────── */
  const getStockPrice = (st: any) => {
    const base = (st.symbol || "").replace(/\.(NS|BO)$/i, "");
    const exch = st.exchange || "NSE";
    const yfSym = `${base}.${exch === "BSE" ? "BO" : "NS"}`;
    const livePrice = marketData?.[yfSym]?.price;
    return livePrice !== undefined ? Number(livePrice) : Number(st.currentPrice || 0);
  };

  /* ═══════════════════════════════════════════════════════════════════
     PORTFOLIO SUMMARY CALCULATIONS
     ═══════════════════════════════════════════════════════════════════ */
  const summary = useMemo(() => {
    const stocks = state.stocks || [];
    const mfs = state.mutualFunds || [];
    const fds = state.fixedDeposits || [];
    const rds = state.recurringDeposits || [];
    const bonds = state.bonds || [];
    const ppfs = state.ppf || [];
    const npsList = state.nps || [];
    const epfs = state.epf || [];
    const licPolicies = state.lic || [];
    const investmentPlans = state.investmentPlans || [];

    /* ── Equity - Stocks ──────────────────────────────────────────── */
    const stockInvested = stocks.reduce(
      (s: number, st: any) => s + Number(st.qty || 0) * Number(st.avgPrice || 0),
      0
    );
    const stockCurrent = stocks.reduce(
      (s: number, st: any) => s + Number(st.qty || 0) * getStockPrice(st),
      0
    );
    const stockDates = stocks.filter((s: any) => s.buyDate).map((s: any) => s.buyDate);
    const earliestStockDate = stockDates.length ? stockDates.sort()[0] : null;
    const stockCAGR =
      earliestStockDate && stockInvested > 0
        ? calcCAGR(stockInvested, stockCurrent, earliestStockDate)
        : null;

    /* ── Equity - Mutual Funds ────────────────────────────────────── */
    const equityMFs = mfs.filter(
      (m: any) =>
        (m.category || "").toLowerCase().includes("equity") ||
        (m.category || "").toLowerCase().includes("elss")
    );
    const debtMFs = mfs.filter(
      (m: any) =>
        !(
          (m.category || "").toLowerCase().includes("equity") ||
          (m.category || "").toLowerCase().includes("elss")
        )
    );

    const mfInvested = (list: any[]) =>
      list.reduce(
        (s: number, m: any) =>
          s +
          (Number(m.invested || m.investedValue) ||
            Number(m.units || 0) * Number(m.buyNav || 0) ||
            0),
        0
      );
    const mfCurrent = (list: any[]) =>
      list.reduce(
        (s: number, m: any) =>
          s +
          (Number(m.units || 0) * Number(m.currentNav || 0) ||
            Number(m.invested || m.investedValue) ||
            0),
        0
      );

    const eqMFInvested = mfInvested(equityMFs);
    const eqMFCurrent = mfCurrent(equityMFs);
    const debtMFInvested = mfInvested(debtMFs);
    const debtMFCurrent = mfCurrent(debtMFs);

    const eqMFDates = equityMFs.filter((m: any) => m.buyDate).map((m: any) => m.buyDate);
    const eqMFCAGR =
      eqMFDates.length && eqMFInvested > 0
        ? calcCAGR(eqMFInvested, eqMFCurrent, eqMFDates.sort()[0])
        : null;

    /* ── Debt - FDs ───────────────────────────────────────────────── */
    const fdInvested = fds.reduce((s: number, x: any) => s + (Number(x.principal) || 0), 0);
    const fdCurrent = fds.reduce((s: number, x: any) => s + fdCurrentValue(x), 0);
    const fdAvgRate = fds.length
      ? fds.reduce((s: number, x: any) => s + (Number(x.rate) || 0), 0) / fds.length
      : 0;

    /* ── Debt - RDs ───────────────────────────────────────────────── */
    const rdInvested = rds.reduce((s: number, x: any) => s + rdPrincipal(x), 0);
    const rdCurr = rds.reduce((s: number, x: any) => s + rdCurrentValue(x), 0);
    const rdAvgRate = rds.length
      ? rds.reduce((s: number, x: any) => s + (Number(x.rate) || 0), 0) / rds.length
      : 0;

    /* ── Debt - Bonds ─────────────────────────────────────────────── */
    const bondInvested = bonds.reduce(
      (s: number, x: any) => s + (Number(x.totalInvestmentAmount || x.faceValue) || 0),
      0
    );
    const bondCurrent = bonds.reduce((s: number, x: any) => s + bondCurrentValue(x), 0);
    const bondAvgYTM = bonds.length
      ? bonds.reduce((s: number, x: any) => s + (Number(x.ytmRate || x.coupon) || 0), 0) /
        bonds.length
      : 0;

    /* ── PPF ──────────────────────────────────────────────────────── */
    const ppfDeposited = ppfs.reduce((s: number, x: any) => {
      const txs = x.transactions || [];
      if (txs.length > 0) {
        const dep = txs
          .filter((t: any) => t.type === "deposit")
          .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        const wd = txs
          .filter((t: any) => t.type === "withdrawal")
          .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
        return s + dep - wd;
      }
      return s + (Number(x.balance) || 0);
    }, 0);
    const ppfBalance = ppfs.reduce((s: number, x: any) => s + (Number(x.balance) || 0), 0);

    /* ── NPS ──────────────────────────────────────────────────────── */
    const npsContributions = npsList.reduce((s: number, x: any) => {
      const txs = x.transactions || [];
      if (txs.length > 0) {
        return (
          s +
          txs.reduce(
            (sum: number, t: any) =>
              sum + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
            0
          )
        );
      }
      return s + (Number(x.balance) || 0);
    }, 0);
    const npsBalance = npsList.reduce((s: number, x: any) => s + (Number(x.balance) || 0), 0);

    /* ── EPF ──────────────────────────────────────────────────────── */
    const epfBalance = epfs.reduce((s: number, x: any) => s + calculateEpfBalance(x), 0);
    const epfContributions = epfs.reduce((s: number, x: any) => {
      const txs = x.transactions || [];
      const hasPassbook = txs.some(
        (t: any) =>
          t.type === "monthly_contribution" ||
          t.type === "interest_credit" ||
          t.type === "transfer_in"
      );
      if (!hasPassbook) return s + (Number(x.balance) || 0);
      const monthlyRows = txs.filter((t: any) => t.type === "monthly_contribution");
      const empContrib =
        txs
          .filter((t: any) => t.type === "employee_contribution")
          .reduce((a: number, t: any) => a + Number(t.amount || 0), 0) +
        monthlyRows.reduce((a: number, t: any) => a + Number(t.employeeShare || 0), 0);
      const erContrib =
        txs
          .filter((t: any) => t.type === "employer_contribution")
          .reduce((a: number, t: any) => a + Number(t.amount || 0), 0) +
        monthlyRows.reduce((a: number, t: any) => a + Number(t.employerShare || 0), 0);
      const penContrib = monthlyRows.reduce(
        (a: number, t: any) => a + Number(t.pensionShare || 0),
        0
      );
      const transferIn = txs
        .filter((t: any) => t.type === "transfer_in")
        .reduce((a: number, t: any) => a + Number(t.amount || 0), 0);
      const withdrawal = txs
        .filter((t: any) => t.type === "withdrawal")
        .reduce((a: number, t: any) => a + Number(t.amount || 0), 0);
      return s + empContrib + erContrib + penContrib + transferIn - withdrawal;
    }, 0);

    /* ── LIC / Insurance Plans ────────────────────────────────────── */
    const licPremiums = licPolicies.reduce((s: number, x: any) => {
      const txTotal = (x.transactions || []).reduce(
        (sum: number, t: any) => sum + Number(t.amount || 0),
        0
      );
      return s + (txTotal > 0 ? txTotal : Number(x.premiumPaid || 0));
    }, 0);
    const licValue = licPolicies.reduce((s: number, x: any) => s + (Number(x.sumAssured) || 0), 0);
    const investPremiums = investmentPlans.reduce((s: number, x: any) => {
      const txTotal = (x.transactions || []).reduce(
        (sum: number, t: any) => sum + Number(t.amount || 0),
        0
      );
      return s + (txTotal > 0 ? txTotal : Number(x.premiumPaid || 0));
    }, 0);
    const investValue = investmentPlans.reduce(
      (s: number, x: any) => s + (Number(x.expectedMaturityAmount || x.sumAssured) || 0),
      0
    );
    const insurancePremiums = licPremiums + investPremiums;
    const insuranceValue = licValue + investValue;

    /* ── Debt MFs row ─────────────────────────────────────────────── */
    const debtMFDates = debtMFs.filter((m: any) => m.buyDate).map((m: any) => m.buyDate);
    const debtMFCAGR =
      debtMFDates.length && debtMFInvested > 0
        ? calcCAGR(debtMFInvested, debtMFCurrent, debtMFDates.sort()[0])
        : null;

    /* ── NPS CAGR ─────────────────────────────────────────────────── */
    const npsTxDates = npsList.flatMap((x: any) =>
      (x.transactions || []).filter((t: any) => t.date).map((t: any) => t.date)
    );
    const npsCAGR =
      npsTxDates.length && npsContributions > 0
        ? calcCAGR(npsContributions, npsBalance, npsTxDates.sort()[0])
        : null;

    /* ── Build rows ───────────────────────────────────────────────── */
    const rows = [
      {
        label: "Equity - Stocks",
        invested: stockInvested,
        current: stockCurrent,
        gain: stockCurrent - stockInvested,
        rate: stockCAGR,
        rateLabel: stockCAGR != null ? `${stockCAGR.toFixed(1)}%` : "--",
      },
      {
        label: "Equity - Mutual Funds",
        invested: eqMFInvested,
        current: eqMFCurrent,
        gain: eqMFCurrent - eqMFInvested,
        rate: eqMFCAGR,
        rateLabel: eqMFCAGR != null ? `${eqMFCAGR.toFixed(1)}%` : "--",
      },
      {
        label: "Debt - Fixed Deposits",
        invested: fdInvested,
        current: fdCurrent,
        gain: fdCurrent - fdInvested,
        rate: fdAvgRate,
        rateLabel: fdAvgRate > 0 ? `${fdAvgRate.toFixed(1)}%` : "--",
      },
      {
        label: "Debt - Recurring Deposits",
        invested: rdInvested,
        current: rdCurr,
        gain: rdCurr - rdInvested,
        rate: rdAvgRate,
        rateLabel: rdAvgRate > 0 ? `${rdAvgRate.toFixed(1)}%` : "--",
      },
      {
        label: "Debt - Bonds",
        invested: bondInvested,
        current: bondCurrent,
        gain: bondCurrent - bondInvested,
        rate: bondAvgYTM,
        rateLabel: bondAvgYTM > 0 ? `${bondAvgYTM.toFixed(1)}%` : "--",
      },
      {
        label: "Debt - Mutual Funds",
        invested: debtMFInvested,
        current: debtMFCurrent,
        gain: debtMFCurrent - debtMFInvested,
        rate: debtMFCAGR,
        rateLabel: debtMFCAGR != null ? `${debtMFCAGR.toFixed(1)}%` : "--",
      },
      {
        label: "PPF",
        invested: ppfDeposited,
        current: ppfBalance,
        gain: ppfBalance - ppfDeposited,
        rate: 7.1,
        rateLabel: "7.1%",
      },
      {
        label: "NPS",
        invested: npsContributions,
        current: npsBalance,
        gain: npsBalance - npsContributions,
        rate: npsCAGR,
        rateLabel: npsCAGR != null ? `${npsCAGR.toFixed(1)}%` : "--",
      },
      {
        label: "EPF",
        invested: epfContributions,
        current: epfBalance,
        gain: epfBalance - epfContributions,
        rate: 8.15,
        rateLabel: "8.15%",
      },
      {
        label: "LIC / Insurance Plans",
        invested: insurancePremiums,
        current: insuranceValue,
        gain: insuranceValue - insurancePremiums,
        rate: null,
        rateLabel:
          insurancePremiums > 0 && insuranceValue > 0
            ? `${(((insuranceValue - insurancePremiums) / insurancePremiums) * 100).toFixed(1)}%`
            : "--",
      },
    ];

    const totalInvested = rows.reduce((s, r) => s + r.invested, 0);
    const totalCurrent = rows.reduce((s, r) => s + r.current, 0);
    const totalGain = totalCurrent - totalInvested;

    const weightedRows = rows.filter((r) => r.rate != null && r.current > 0);
    const weightedCAGR =
      totalCurrent > 0 && weightedRows.length > 0
        ? weightedRows.reduce((s, r) => s + (r.rate || 0) * (r.current / totalCurrent), 0)
        : null;

    const rowsWithAlloc = rows.map((r) => ({
      ...r,
      allocation: totalCurrent > 0 ? (r.current / totalCurrent) * 100 : 0,
    }));

    /* ── Pie chart data ───────────────────────────────────────────── */
    const equityTotal = stockCurrent + eqMFCurrent;
    const debtTotal = fdCurrent + rdCurr + bondCurrent + debtMFCurrent;
    const retirementTotal = ppfBalance + npsBalance + epfBalance;
    const insuranceTotal = insuranceValue;

    const pieData = [
      { name: "Equity", value: equityTotal },
      { name: "Debt", value: debtTotal },
      { name: "Retirement", value: retirementTotal },
      { name: "Insurance", value: insuranceTotal },
    ].filter((d) => d.value > 0);

    return {
      rows: rowsWithAlloc,
      totalInvested,
      totalCurrent,
      totalGain,
      weightedCAGR,
      pieData,
      equityTotal,
      debtTotal,
      retirementTotal,
      insuranceTotal,
    };
  }, [state, marketData]);

  /* ── Stock groups (same logic as DematTab) ───────────────────────── */
  const stockGroups = useMemo(() => {
    const stocks = state.stocks || [];
    const groups: Record<string, { base: string; exchange: string; yfSym: string; lots: any[] }> =
      {};
    stocks.forEach((s: any) => {
      const base = (s.symbol || "").replace(/\.(NS|BO)$/i, "");
      const exch = s.exchange || "NSE";
      const key = `${base}|${exch}`;
      if (!groups[key])
        groups[key] = {
          base,
          exchange: exch,
          yfSym: `${base}.${exch === "BSE" ? "BO" : "NS"}`,
          lots: [],
        };
      groups[key].lots.push(s);
    });
    return Object.values(groups);
  }, [state.stocks]);

  /* ── Check if any data exists ────────────────────────────────────── */
  const hasAnyData =
    (state.stocks?.length || 0) +
      (state.mutualFunds?.length || 0) +
      (state.fixedDeposits?.length || 0) +
      (state.recurringDeposits?.length || 0) +
      (state.bonds?.length || 0) +
      (state.ppf?.length || 0) +
      (state.nps?.length || 0) +
      (state.epf?.length || 0) +
      (state.lic?.length || 0) +
      (state.investmentPlans?.length || 0) >
    0;

  if (!hasAnyData) {
    return (
      <div style={{ padding: "32px 0" }}>
        <SectionTitle sub="View all your investments in one consolidated statement">
          Consolidated Investment Statement
        </SectionTitle>
        <EmptyState
          icon={FileText}
          gradient={`linear-gradient(135deg, ${THEME.accent} 0%, color-mix(in srgb, var(--t-accent) 65%, white) 100%)`}
          dotColor={THEME.accent}
          title="No Investments Yet"
          description="Add investments across Fixed Deposits, Mutual Funds, Stocks, PPF, NPS, EPF and more to see your consolidated statement."
          pills={["Stocks", "Mutual Funds", "FDs", "PPF", "NPS", "EPF"]}
          buttonLabel="Go to Investments"
          onAdd={() => {}}
        />
      </div>
    );
  }

  const todayStr = today();
  const formattedDate = new Date(todayStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="investment-statement"
      style={{ padding: "32px 0", display: "flex", flexDirection: "column", gap: 24 }}
    >
      <style>{printStyles}</style>

      {/* ── 1. Statement Header ─────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionTitle sub={`As of ${formattedDate}`}>
          Consolidated Investment Statement
        </SectionTitle>
        <div className="no-print">
          <Button
            variant="secondary"
            size="sm"
            icon={<Printer size={14} />}
            onClick={() => window.print()}
          >
            Print
          </Button>
        </div>
      </div>

      {/* ── 2. Portfolio Summary Table ──────────────────────────────── */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={tableWrap}>
          <table style={tbl}>
            <thead>
              <tr>
                <th style={{ ...th, paddingLeft: 16 }}>Asset Class</th>
                <th style={thRight}>Invested</th>
                <th style={thRight}>Current Value</th>
                <th style={thRight}>Gain / Loss</th>
                <th style={thRight}>CAGR</th>
                <th style={{ ...thRight, paddingRight: 16 }}>Allocation %</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((row) =>
                row.invested === 0 && row.current === 0 ? null : (
                  <tr
                    key={row.label}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "color-mix(in srgb, var(--accent) 4%, transparent)")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                      {row.label}
                    </td>
                    <td style={tdRight}>
                      <Prv>{fmtINRFull(row.invested)}</Prv>
                    </td>
                    <td style={tdRight}>
                      <Prv>{fmtINRFull(row.current)}</Prv>
                    </td>
                    <td style={{ ...tdRight, color: plColor(row.gain), fontWeight: 700 }}>
                      <Prv>
                        {plSign(row.gain)}
                        {fmtINRFull(row.gain)}
                      </Prv>
                    </td>
                    <td style={{ ...tdRight, fontWeight: 600 }}>{row.rateLabel}</td>
                    <td style={{ ...tdRight, paddingRight: 16, fontWeight: 600 }}>
                      {row.allocation.toFixed(1)}%
                    </td>
                  </tr>
                )
              )}
              {/* ── Total row ──────────────────────────────────────── */}
              <tr
                style={{
                  background: "color-mix(in srgb, var(--surface-1) 70%, transparent)",
                  borderTop: `2px solid ${THEME.line}`,
                }}
              >
                <td style={{ ...tdBold, paddingLeft: 16 }}>Total</td>
                <td style={tdBoldRight}>
                  <Prv>{fmtINRFull(summary.totalInvested)}</Prv>
                </td>
                <td style={tdBoldRight}>
                  <Prv>{fmtINRFull(summary.totalCurrent)}</Prv>
                </td>
                <td
                  style={{
                    ...tdBoldRight,
                    color: plColor(summary.totalGain),
                  }}
                >
                  <Prv>
                    {plSign(summary.totalGain)}
                    {fmtINRFull(summary.totalGain)}
                  </Prv>
                </td>
                <td style={tdBoldRight}>
                  {summary.weightedCAGR != null ? `${summary.weightedCAGR.toFixed(1)}%` : "--"}
                </td>
                <td style={{ ...tdBoldRight, paddingRight: 16 }}>100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── 3. Holdings Detail -- Equity Stocks ────────────────────── */}
      {stockGroups.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionHeader
            icon={TrendingUp}
            title="Equity Stocks"
            count={stockGroups.length}
            expanded={!!expandedSections.stocks}
            onToggle={() => toggleSection("stocks")}
          />
          {expandedSections.stocks && (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={tableWrap}>
                <table style={tbl}>
                  <thead>
                    <tr>
                      <th style={{ ...th, paddingLeft: 16 }}>Symbol</th>
                      <th style={th}>Exchange</th>
                      <th style={thRight}>Qty</th>
                      <th style={thRight}>Avg Price</th>
                      <th style={thRight}>Current Price</th>
                      <th style={thRight}>Current Value</th>
                      <th style={thRight}>P&L</th>
                      <th style={thRight}>P&L %</th>
                      <th style={{ ...th, paddingRight: 16 }}>Sector</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockGroups.map((g) => {
                      const totalQty = g.lots.reduce(
                        (s: number, l: any) => s + (Number(l.qty) || 0),
                        0
                      );
                      const totalInvested = g.lots.reduce(
                        (s: number, l: any) => s + (Number(l.qty) || 0) * (Number(l.avgPrice) || 0),
                        0
                      );
                      const avgPrice = totalQty > 0 ? totalInvested / totalQty : 0;
                      const livePrice = getStockPrice(g.lots[0]);
                      const currentValue = totalQty * livePrice;
                      const pl = currentValue - totalInvested;
                      const plPct = totalInvested > 0 ? (pl / totalInvested) * 100 : 0;
                      const sector = marketData?.[g.yfSym]?.sector || "--";

                      return (
                        <tr
                          key={g.yfSym}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "color-mix(in srgb, var(--accent) 4%, transparent)")
                          }
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                            {g.base}
                          </td>
                          <td style={td}>
                            <Badge
                              variant={g.exchange === "BSE" ? "gold" : "accent"}
                              style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6 }}
                            >
                              {g.exchange}
                            </Badge>
                          </td>
                          <td style={{ ...tdRight, fontWeight: 600 }}>{totalQty}</td>
                          <td style={tdRight}>
                            <Prv>{fmtINRFull(avgPrice)}</Prv>
                          </td>
                          <td style={tdRight}>
                            <Prv>{fmtINRFull(livePrice)}</Prv>
                          </td>
                          <td style={{ ...tdRight, fontWeight: 700 }}>
                            <Prv>{fmtINRFull(currentValue)}</Prv>
                          </td>
                          <td style={{ ...tdRight, color: plColor(pl), fontWeight: 700 }}>
                            <Prv>
                              {plSign(pl)}
                              {fmtINRFull(pl)}
                            </Prv>
                          </td>
                          <td style={{ ...tdRight, color: plColor(plPct), fontWeight: 700 }}>
                            {fmtPct(plPct)}
                          </td>
                          <td
                            style={{
                              ...td,
                              paddingRight: 16,
                              fontSize: 12,
                              color: THEME.muted,
                              maxWidth: 120,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {sector}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── 4. Holdings Detail -- Mutual Funds ─────────────────────── */}
      {(state.mutualFunds?.length || 0) > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionHeader
            icon={BarChart3}
            title="Mutual Funds"
            count={state.mutualFunds.length}
            expanded={!!expandedSections.mf}
            onToggle={() => toggleSection("mf")}
          />
          {expandedSections.mf && (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={tableWrap}>
                <table style={tbl}>
                  <thead>
                    <tr>
                      <th style={{ ...th, paddingLeft: 16 }}>Scheme Name</th>
                      <th style={th}>Category</th>
                      <th style={th}>Folio</th>
                      <th style={thRight}>Units</th>
                      <th style={thRight}>Buy NAV</th>
                      <th style={thRight}>Current NAV</th>
                      <th style={thRight}>Invested</th>
                      <th style={thRight}>Current Value</th>
                      <th style={thRight}>P&L</th>
                      <th style={{ ...thRight, paddingRight: 16 }}>P&L %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.mutualFunds.map((mf: any) => {
                      const units = Number(mf.units) || 0;
                      const buyNav = Number(mf.buyNav) || 0;
                      const currentNav = Number(mf.currentNav) || 0;
                      const invested =
                        Number(mf.invested || mf.investedValue) || units * buyNav || 0;
                      const currentValue = units * currentNav || invested;
                      const pl = currentValue - invested;
                      const plPct = invested > 0 ? (pl / invested) * 100 : 0;

                      return (
                        <tr
                          key={mf.id}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "color-mix(in srgb, var(--accent) 4%, transparent)")
                          }
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td
                            style={{
                              ...td,
                              paddingLeft: 16,
                              fontWeight: 700,
                              color: THEME.ink,
                              maxWidth: 220,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {mf.schemeName || mf.name || "Unnamed Fund"}
                          </td>
                          <td style={td}>
                            <Badge
                              variant={
                                (mf.category || "").toLowerCase().includes("equity")
                                  ? "accent"
                                  : "sage"
                              }
                              style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6 }}
                            >
                              {mf.category || "Other"}
                            </Badge>
                          </td>
                          <td style={{ ...td, fontSize: 12, color: THEME.muted }}>
                            {mf.folioNumber || "--"}
                          </td>
                          <td style={{ ...tdRight, fontWeight: 600 }}>
                            {units > 0 ? units.toFixed(3) : "--"}
                          </td>
                          <td style={tdRight}>
                            <Prv>{buyNav > 0 ? `₹${buyNav.toFixed(2)}` : "--"}</Prv>
                          </td>
                          <td style={tdRight}>
                            <Prv>{currentNav > 0 ? `₹${currentNav.toFixed(2)}` : "--"}</Prv>
                          </td>
                          <td style={tdRight}>
                            <Prv>{fmtINRFull(invested)}</Prv>
                          </td>
                          <td style={{ ...tdRight, fontWeight: 700 }}>
                            <Prv>{fmtINRFull(currentValue)}</Prv>
                          </td>
                          <td style={{ ...tdRight, color: plColor(pl), fontWeight: 700 }}>
                            <Prv>
                              {plSign(pl)}
                              {fmtINRFull(pl)}
                            </Prv>
                          </td>
                          <td
                            style={{
                              ...tdRight,
                              paddingRight: 16,
                              color: plColor(plPct),
                              fontWeight: 700,
                            }}
                          >
                            {fmtPct(plPct)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── 5. Holdings Detail -- Fixed Income ─────────────────────── */}
      {/* FDs */}
      {(state.fixedDeposits?.length || 0) > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionHeader
            icon={Coins}
            title="Fixed Deposits"
            count={state.fixedDeposits.length}
            expanded={!!expandedSections.fd}
            onToggle={() => toggleSection("fd")}
          />
          {expandedSections.fd && (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={tableWrap}>
                <table style={tbl}>
                  <thead>
                    <tr>
                      <th style={{ ...th, paddingLeft: 16 }}>Bank</th>
                      <th style={thRight}>Principal</th>
                      <th style={thRight}>Rate</th>
                      <th style={th}>Start Date</th>
                      <th style={th}>Maturity Date</th>
                      <th style={thRight}>Maturity Amount</th>
                      <th style={{ ...thRight, paddingRight: 16 }}>Days to Maturity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.fixedDeposits.map((fd: any) => {
                      const principal = Number(fd.principal) || 0;
                      const rate = Number(fd.rate) || 0;
                      const years = Number(fd.years) || 0;
                      const matAmount = fdMaturity(principal, rate, years);
                      const dtm = daysToMaturity(fd.maturityDate);

                      return (
                        <tr
                          key={fd.id}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "color-mix(in srgb, var(--accent) 4%, transparent)")
                          }
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                            {fd.bank || "--"}
                          </td>
                          <td style={{ ...tdRight, fontWeight: 700 }}>
                            <Prv>{fmtINRFull(principal)}</Prv>
                          </td>
                          <td style={{ ...tdRight, fontWeight: 600 }}>
                            {rate > 0 ? `${rate}%` : "--"}
                          </td>
                          <td style={td}>{fd.startDate || "--"}</td>
                          <td style={td}>{fd.maturityDate || "--"}</td>
                          <td style={{ ...tdRight, fontWeight: 700 }}>
                            <Prv>{fmtINRFull(matAmount)}</Prv>
                          </td>
                          <td
                            style={{
                              ...tdRight,
                              paddingRight: 16,
                              fontWeight: 700,
                              color:
                                dtm != null && dtm <= 30
                                  ? THEME.rust
                                  : dtm != null && dtm <= 90
                                    ? "#D97706"
                                    : THEME.sage,
                            }}
                          >
                            {dtm != null ? (dtm === 0 ? "Matured" : `${dtm}d`) : "--"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* RDs */}
      {(state.recurringDeposits?.length || 0) > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionHeader
            icon={Coins}
            title="Recurring Deposits"
            count={state.recurringDeposits.length}
            expanded={!!expandedSections.rd}
            onToggle={() => toggleSection("rd")}
          />
          {expandedSections.rd && (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={tableWrap}>
                <table style={tbl}>
                  <thead>
                    <tr>
                      <th style={{ ...th, paddingLeft: 16 }}>Bank</th>
                      <th style={thRight}>Monthly</th>
                      <th style={thRight}>Tenure (months)</th>
                      <th style={thRight}>Rate</th>
                      <th style={{ ...thRight, paddingRight: 16 }}>Maturity Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.recurringDeposits.map((rd: any) => {
                      const monthly = Number(rd.monthly) || 0;
                      const months = Number(rd.tenureMonths) || 0;
                      const rate = Number(rd.rate) || 0;
                      const matAmount = rdMaturity(monthly, rate, months);

                      return (
                        <tr
                          key={rd.id}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "color-mix(in srgb, var(--accent) 4%, transparent)")
                          }
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                            {rd.bank || "--"}
                          </td>
                          <td style={tdRight}>
                            <Prv>{fmtINRFull(monthly)}</Prv>
                          </td>
                          <td style={tdRight}>{months || "--"}</td>
                          <td style={tdRight}>{rate > 0 ? `${rate}%` : "--"}</td>
                          <td style={{ ...tdRight, paddingRight: 16, fontWeight: 700 }}>
                            <Prv>{fmtINRFull(matAmount)}</Prv>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Bonds */}
      {(state.bonds?.length || 0) > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionHeader
            icon={FileText}
            title="Bonds"
            count={state.bonds.length}
            expanded={!!expandedSections.bonds}
            onToggle={() => toggleSection("bonds")}
          />
          {expandedSections.bonds && (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={tableWrap}>
                <table style={tbl}>
                  <thead>
                    <tr>
                      <th style={{ ...th, paddingLeft: 16 }}>Name</th>
                      <th style={thRight}>Face Value</th>
                      <th style={thRight}>Coupon</th>
                      <th style={thRight}>YTM</th>
                      <th style={{ ...th, paddingRight: 16 }}>Maturity Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.bonds.map((b: any) => {
                      const faceValue = Number(b.totalInvestmentAmount || b.faceValue) || 0;
                      const coupon = Number(b.coupon) || 0;
                      const ytm = Number(b.ytmRate) || 0;

                      return (
                        <tr
                          key={b.id}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "color-mix(in srgb, var(--accent) 4%, transparent)")
                          }
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                            {b.name || "--"}
                          </td>
                          <td style={{ ...tdRight, fontWeight: 700 }}>
                            <Prv>{fmtINRFull(faceValue)}</Prv>
                          </td>
                          <td style={tdRight}>{coupon > 0 ? `${coupon}%` : "--"}</td>
                          <td style={tdRight}>{ytm > 0 ? `${ytm}%` : "--"}</td>
                          <td style={{ ...td, paddingRight: 16 }}>{b.maturityDate || "--"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── 6. Holdings Detail -- Retirement ───────────────────────── */}
      {/* PPF */}
      {(state.ppf?.length || 0) > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionHeader
            icon={Shield}
            title="PPF"
            count={state.ppf.length}
            expanded={!!expandedSections.ppf}
            onToggle={() => toggleSection("ppf")}
          />
          {expandedSections.ppf && (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={tableWrap}>
                <table style={tbl}>
                  <thead>
                    <tr>
                      <th style={{ ...th, paddingLeft: 16 }}>Institution</th>
                      <th style={th}>Account #</th>
                      <th style={thRight}>Balance</th>
                      <th style={{ ...thRight, paddingRight: 16 }}>This Year Deposit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.ppf.map((p: any) => {
                      const balance = Number(p.balance) || 0;
                      const currentFY =
                        new Date().getMonth() >= 3
                          ? new Date().getFullYear()
                          : new Date().getFullYear() - 1;
                      const fyStart = `${currentFY}-04-01`;
                      const thisYearDeposit = (p.transactions || [])
                        .filter((t: any) => t.type === "deposit" && t.date && t.date >= fyStart)
                        .reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);

                      return (
                        <tr
                          key={p.id}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "color-mix(in srgb, var(--accent) 4%, transparent)")
                          }
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                            {p.institution || "--"}
                          </td>
                          <td style={{ ...td, fontSize: 12, color: THEME.muted }}>
                            {p.accountNumber || "--"}
                          </td>
                          <td style={{ ...tdRight, fontWeight: 700 }}>
                            <Prv>{fmtINRFull(balance)}</Prv>
                          </td>
                          <td
                            style={{
                              ...tdRight,
                              paddingRight: 16,
                              color: THEME.sage,
                              fontWeight: 700,
                            }}
                          >
                            <Prv>{thisYearDeposit > 0 ? fmtINRFull(thisYearDeposit) : "--"}</Prv>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* NPS */}
      {(state.nps?.length || 0) > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionHeader
            icon={Briefcase}
            title="NPS"
            count={state.nps.length}
            expanded={!!expandedSections.nps}
            onToggle={() => toggleSection("nps")}
          />
          {expandedSections.nps && (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={tableWrap}>
                <table style={tbl}>
                  <thead>
                    <tr>
                      <th style={{ ...th, paddingLeft: 16 }}>Fund Manager</th>
                      <th style={th}>PRAN</th>
                      <th style={th}>Tier</th>
                      <th style={{ ...thRight, paddingRight: 16 }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.nps.map((n: any) => (
                      <tr
                        key={n.id}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "color-mix(in srgb, var(--accent) 4%, transparent)")
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                          {n.fundManager || "--"}
                        </td>
                        <td style={{ ...td, fontSize: 12, color: THEME.muted }}>
                          {n.pran || "--"}
                        </td>
                        <td style={td}>
                          <Badge
                            variant={n.tier === "II" ? "gold" : "accent"}
                            style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6 }}
                          >
                            Tier {n.tier || "I"}
                          </Badge>
                        </td>
                        <td style={{ ...tdRight, paddingRight: 16, fontWeight: 700 }}>
                          <Prv>
                            {fmtINRFull(
                              (() => {
                                const bal = Number(n.balance) || 0;
                                if (bal > 0) return bal;
                                return (n.transactions || []).reduce(
                                  (ss: number, t: any) =>
                                    ss +
                                    (Number(t.employeeAmount) || 0) +
                                    (Number(t.employerAmount) || 0),
                                  0
                                );
                              })()
                            )}
                          </Prv>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* EPF */}
      {(state.epf?.length || 0) > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionHeader
            icon={Shield}
            title="EPF"
            count={state.epf.length}
            expanded={!!expandedSections.epf}
            onToggle={() => toggleSection("epf")}
          />
          {expandedSections.epf && (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={tableWrap}>
                <table style={tbl}>
                  <thead>
                    <tr>
                      <th style={{ ...th, paddingLeft: 16 }}>Employer</th>
                      <th style={th}>UAN</th>
                      <th style={{ ...thRight, paddingRight: 16 }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.epf.map((e: any) => (
                      <tr
                        key={e.id}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "color-mix(in srgb, var(--accent) 4%, transparent)")
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                          {e.employer || "--"}
                        </td>
                        <td style={{ ...td, fontSize: 12, color: THEME.muted }}>{e.uan || "--"}</td>
                        <td style={{ ...tdRight, paddingRight: 16, fontWeight: 700 }}>
                          <Prv>{fmtINRFull(calculateEpfBalance(e))}</Prv>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── Insurance ──────────────────────────────────────────────── */}
      {(state.lic?.length || 0) + (state.investmentPlans?.length || 0) > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionHeader
            icon={Heart}
            title="LIC / Insurance Plans"
            count={(state.lic?.length || 0) + (state.investmentPlans?.length || 0)}
            expanded={!!expandedSections.insurance}
            onToggle={() => toggleSection("insurance")}
          />
          {expandedSections.insurance && (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={tableWrap}>
                <table style={tbl}>
                  <thead>
                    <tr>
                      <th style={{ ...th, paddingLeft: 16 }}>Plan Name</th>
                      <th style={th}>Policy #</th>
                      <th style={th}>Type</th>
                      <th style={thRight}>Premiums Paid</th>
                      <th style={thRight}>Sum Assured / Value</th>
                      <th style={{ ...th, paddingRight: 16 }}>Maturity Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(state.lic || []).map((l: any) => (
                      <tr
                        key={l.id}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "color-mix(in srgb, var(--accent) 4%, transparent)")
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                          {l.planName || "--"}
                        </td>
                        <td style={{ ...td, fontSize: 12, color: THEME.muted }}>
                          {l.policyNumber || "--"}
                        </td>
                        <td style={td}>
                          <Badge
                            variant="gold"
                            style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6 }}
                          >
                            LIC
                          </Badge>
                        </td>
                        <td style={tdRight}>
                          <Prv>
                            {fmtINRFull(
                              (() => {
                                const txTotal = (l.transactions || []).reduce(
                                  (sum: number, t: any) => sum + Number(t.amount || 0),
                                  0
                                );
                                return txTotal > 0 ? txTotal : Number(l.premiumPaid || 0);
                              })()
                            )}
                          </Prv>
                        </td>
                        <td style={{ ...tdRight, fontWeight: 700 }}>
                          <Prv>{fmtINRFull(Number(l.sumAssured) || 0)}</Prv>
                        </td>
                        <td style={{ ...td, paddingRight: 16 }}>{l.maturityDate || "--"}</td>
                      </tr>
                    ))}
                    {(state.investmentPlans || []).map((ip: any) => (
                      <tr
                        key={ip.id}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "color-mix(in srgb, var(--accent) 4%, transparent)")
                        }
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                          {ip.planName || ip.insurer || "--"}
                        </td>
                        <td style={{ ...td, fontSize: 12, color: THEME.muted }}>
                          {ip.policyNumber || "--"}
                        </td>
                        <td style={td}>
                          <Badge
                            variant="sage"
                            style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6 }}
                          >
                            Investment
                          </Badge>
                        </td>
                        <td style={tdRight}>
                          <Prv>
                            {fmtINRFull(
                              (() => {
                                const txTotal = (ip.transactions || []).reduce(
                                  (sum: number, t: any) => sum + Number(t.amount || 0),
                                  0
                                );
                                return txTotal > 0 ? txTotal : Number(ip.premiumPaid || 0);
                              })()
                            )}
                          </Prv>
                        </td>
                        <td style={{ ...tdRight, fontWeight: 700 }}>
                          <Prv>
                            {fmtINRFull(Number(ip.expectedMaturityAmount || ip.sumAssured) || 0)}
                          </Prv>
                        </td>
                        <td style={{ ...td, paddingRight: 16 }}>{ip.maturityDate || "--"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ── 7. Asset Allocation Pie Chart ──────────────────────────── */}
      {summary.pieData.length > 0 && (
        <Card style={{ padding: "24px 20px" }}>
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
              Asset Allocation
            </h3>
            <div style={{ fontSize: 11, color: THEME.muted }}>
              Percentage distribution split by primary wealth category
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 32,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 280, height: 280, position: "relative" }}>
              <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={summary.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                    onMouseEnter={(_, idx) => setActivePieIndex(idx)}
                    onMouseLeave={() => setActivePieIndex(null)}
                  >
                    {summary.pieData.map((d: any, i: number) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
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
                  <Tooltip content={<ChartTooltip />} />
                  {activePieIndex !== null && summary.pieData[activePieIndex] ? (
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
                        {summary.pieData[activePieIndex].name}
                      </text>
                      <text
                        x="50%"
                        y="56%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 16,
                          fill: THEME.ink,
                          fontWeight: 900,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        ₹
                        {summary.pieData[activePieIndex].value.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
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
                        Net Worth
                      </text>
                      <text
                        x="50%"
                        y="56%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 16,
                          fill: THEME.ink,
                          fontWeight: 900,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        ₹
                        {summary.totalCurrent.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </text>
                    </>
                  )}
                </PieChart>
              </ResponsiveContainer></div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minWidth: 220,
              }}
            >
              {summary.pieData.map((d: any, i: number) => {
                const total = summary.pieData.reduce((s: number, x: any) => s + x.value, 0);
                const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0";
                return (
                  <div
                    key={d.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "8px 12px",
                      borderRadius: 12,
                      background: "var(--surface-0)",
                      border: `1.5px solid ${THEME.line}`,
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 4,
                        background: PIE_COLORS[i % PIE_COLORS.length],
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: THEME.ink,
                        }}
                      >
                        {d.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: THEME.muted,
                          fontWeight: 600,
                          marginTop: 1,
                        }}
                      >
                        <Prv>{fmtINRFull(d.value)}</Prv> &bull; {pct}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <div
        style={{
          textAlign: "center",
          fontSize: 11,
          color: THEME.muted,
          padding: "16px 0",
        }}
      >
        Generated on {formattedDate} &bull; Personal Finance by Anand Mohta
      </div>
    </div>
  );
};
