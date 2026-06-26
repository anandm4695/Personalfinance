// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
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
  padding: "10px 12px",
  fontWeight: 700,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: THEME.muted,
  borderBottom: `2px solid ${THEME.line}`,
  background: "var(--surface-0)",
};

const thRight: React.CSSProperties = { ...th, textAlign: "right" };

const td: React.CSSProperties = {
  padding: "10px 12px",
  borderBottom: `1px solid ${THEME.line}`,
  color: THEME.ink,
};

const tdRight: React.CSSProperties = { ...td, textAlign: "right" };

const tdBold: React.CSSProperties = { ...td, fontWeight: 700 };

const tdBoldRight: React.CSSProperties = { ...tdRight, fontWeight: 700 };

/* ── Color palette for pie chart ───────────────────────────────────── */
const PIE_COLORS = [
  "#4F46E5", // Equity
  "#059669", // Debt
  "#D97706", // Retirement
  "#DC2626", // Insurance
  "#7C3AED", // Other
  "#0891B2",
  "#2563EB",
  "#B91C1C",
];

/* ── P&L color helper ──────────────────────────────────────────────── */
const plColor = (v: number) =>
  v > 0 ? "#059669" : v < 0 ? "#DC2626" : THEME.muted;

const plSign = (v: number) => (v > 0 ? "+" : "");

/* ── Format percent ────────────────────────────────────────────────── */
const fmtPct = (v: number | null | undefined) =>
  v == null || isNaN(v) ? "--" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

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
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "14px 0",
      cursor: "pointer",
      userSelect: "none",
    }}
  >
    {expanded ? (
      <ChevronDown size={16} color={THEME.muted} />
    ) : (
      <ChevronRight size={16} color={THEME.muted} />
    )}
    <Icon size={18} color={THEME.accent} />
    <span
      style={{
        fontSize: 16,
        fontWeight: 700,
        color: THEME.ink,
        letterSpacing: "-0.02em",
      }}
    >
      {title}
    </span>
    <Badge variant="muted" style={{ fontSize: 11 }}>
      {count} holding{count !== 1 ? "s" : ""}
    </Badge>
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
      ? Math.min(
          Number(x.tenureMonths) || 0,
          Math.max(0, monthsBetween(x.startDate, today()))
        )
      : Number(x.tenureMonths) || 0;

  const rdCurrentValue = (x: any) =>
    rdMaturity(Number(x.monthly) || 0, Number(x.rate) || 0, rdElapsed(x));

  const rdPrincipal = (x: any) => (Number(x.monthly) || 0) * rdElapsed(x);

  /* ── Helper: Days to maturity ────────────────────────────────────── */
  const daysToMaturity = (matDate: string) => {
    if (!matDate) return null;
    const ms = new Date(matDate).getTime() - Date.now();
    return ms > 0 ? Math.ceil(ms / 86400000) : 0;
  };

  /* ── Helper: Stock live price ────────────────────────────────────── */
  const getStockPrice = (st: any) => {
    const base = (st.symbol || "").replace(/\.(NS|BO)$/i, "");
    const exch = st.exchange || "NSE";
    const yfSym = `${base}.${exch === "BSE" ? "BO" : "NS"}`;
    const livePrice = marketData?.[yfSym]?.price;
    return livePrice !== undefined ? Number(livePrice) : Number(st.currentPrice || 0);
  };

  const getStockYfSym = (st: any) => {
    const base = (st.symbol || "").replace(/\.(NS|BO)$/i, "");
    const exch = st.exchange || "NSE";
    return `${base}.${exch === "BSE" ? "BO" : "NS"}`;
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
    // Use earliest buyDate for CAGR
    const stockDates = stocks.filter((s: any) => s.buyDate).map((s: any) => s.buyDate);
    const earliestStockDate = stockDates.length
      ? stockDates.sort()[0]
      : null;
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
        !((m.category || "").toLowerCase().includes("equity") ||
          (m.category || "").toLowerCase().includes("elss"))
    );

    const mfInvested = (list: any[]) =>
      list.reduce(
        (s: number, m: any) =>
          s + (Number(m.invested || m.investedValue) || (Number(m.units || 0) * Number(m.buyNav || 0)) || 0),
        0
      );
    const mfCurrent = (list: any[]) =>
      list.reduce(
        (s: number, m: any) =>
          s + (Number(m.units || 0) * Number(m.currentNav || 0) || Number(m.invested || m.investedValue) || 0),
        0
      );

    const eqMFInvested = mfInvested(equityMFs);
    const eqMFCurrent = mfCurrent(equityMFs);
    const debtMFInvested = mfInvested(debtMFs);
    const debtMFCurrent = mfCurrent(debtMFs);

    const eqMFDates = equityMFs.filter((m: any) => m.buyDate).map((m: any) => m.buyDate);
    const eqMFCAGR = eqMFDates.length && eqMFInvested > 0
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
    const bondCurrent = bonds.reduce(
      (s: number, x: any) => s + (Number(x.totalInvestmentAmount || x.faceValue) || 0),
      0
    );
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
    const ppfBalance = ppfs.reduce(
      (s: number, x: any) => s + (Number(x.balance) || 0),
      0
    );

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
    const npsBalance = npsList.reduce(
      (s: number, x: any) => s + (Number(x.balance) || 0),
      0
    );

    /* ── EPF ──────────────────────────────────────────────────────── */
    const epfContributions = epfs.reduce(
      (s: number, x: any) => s + calculateEpfBalance(x),
      0
    );
    const epfBalance = epfContributions; // EPF balance IS the computed balance

    /* ── LIC / Insurance Plans ────────────────────────────────────── */
    const licPremiums = licPolicies.reduce(
      (s: number, x: any) => s + (Number(x.premiumPaid) || 0),
      0
    );
    const licValue = licPolicies.reduce(
      (s: number, x: any) => s + (Number(x.sumAssured) || 0),
      0
    );
    const investPremiums = investmentPlans.reduce(
      (s: number, x: any) => s + (Number(x.premiumPaid) || 0),
      0
    );
    const investValue = investmentPlans.reduce(
      (s: number, x: any) =>
        s + (Number(x.expectedMaturityAmount || x.sumAssured) || 0),
      0
    );
    const insurancePremiums = licPremiums + investPremiums;
    const insuranceValue = licValue + investValue;

    /* ── Debt MFs row ─────────────────────────────────────────────── */
    const debtMFDates = debtMFs.filter((m: any) => m.buyDate).map((m: any) => m.buyDate);
    const debtMFCAGR = debtMFDates.length && debtMFInvested > 0
      ? calcCAGR(debtMFInvested, debtMFCurrent, debtMFDates.sort()[0])
      : null;

    /* ── NPS CAGR ─────────────────────────────────────────────────── */
    const npsTxDates = npsList.flatMap((x: any) =>
      (x.transactions || []).filter((t: any) => t.date).map((t: any) => t.date)
    );
    const npsCAGR = npsTxDates.length && npsContributions > 0
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

    // Weighted CAGR: use rows with valid rate and nonzero current
    const weightedRows = rows.filter((r) => r.rate != null && r.current > 0);
    const weightedCAGR =
      totalCurrent > 0 && weightedRows.length > 0
        ? weightedRows.reduce(
            (s, r) => s + (r.rate || 0) * (r.current / totalCurrent),
            0
          )
        : null;

    // Add allocation %
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
    <div className="investment-statement" style={{ padding: "32px 0" }}>
      <style>{printStyles}</style>

      {/* ── 1. Statement Header ─────────────────────────────────────── */}
      <SectionTitle
        sub={`As of ${formattedDate}`}
        rightElement={
          <div className="no-print" style={{ display: "flex", gap: 8 }}>
            <Button
              variant="secondary"
              size="sm"
              icon={<Printer size={14} />}
              onClick={() => window.print()}
            >
              Print
            </Button>
          </div>
        }
      >
        Consolidated Investment Statement
      </SectionTitle>

      {/* ── 2. Portfolio Summary Table ──────────────────────────────── */}
      <Card style={{ padding: 0, marginBottom: 24, overflow: "hidden" }}>
        <div style={tableWrap}>
          <table style={tbl}>
            <thead>
              <tr>
                <th style={th}>Asset Class</th>
                <th style={thRight}>Invested</th>
                <th style={thRight}>Current Value</th>
                <th style={thRight}>Gain / Loss</th>
                <th style={thRight}>CAGR</th>
                <th style={thRight}>Allocation %</th>
              </tr>
            </thead>
            <tbody>
              {summary.rows.map((row) =>
                row.invested === 0 && row.current === 0 ? null : (
                  <tr key={row.label}>
                    <td style={td}>{row.label}</td>
                    <td style={tdRight}>
                      <Prv>{fmtINRFull(row.invested)}</Prv>
                    </td>
                    <td style={tdRight}>
                      <Prv>{fmtINRFull(row.current)}</Prv>
                    </td>
                    <td style={{ ...tdRight, color: plColor(row.gain) }}>
                      <Prv>
                        {plSign(row.gain)}
                        {fmtINRFull(row.gain)}
                      </Prv>
                    </td>
                    <td style={tdRight}>{row.rateLabel}</td>
                    <td style={tdRight}>{row.allocation.toFixed(1)}%</td>
                  </tr>
                )
              )}
              {/* ── Total row ──────────────────────────────────────── */}
              <tr
                style={{
                  background: "var(--surface-0)",
                  borderTop: `2px solid ${THEME.line}`,
                }}
              >
                <td style={tdBold}>Total</td>
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
                  {summary.weightedCAGR != null
                    ? `${summary.weightedCAGR.toFixed(1)}%`
                    : "--"}
                </td>
                <td style={tdBoldRight}>100%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── 3. Holdings Detail -- Equity Stocks ────────────────────── */}
      {stockGroups.length > 0 && (
        <Card style={{ padding: "0 16px 16px", marginBottom: 24 }}>
          <SectionHeader
            icon={TrendingUp}
            title="Equity Stocks"
            count={stockGroups.length}
            expanded={!!expandedSections.stocks}
            onToggle={() => toggleSection("stocks")}
          />
          {expandedSections.stocks && (
            <div style={tableWrap}>
              <table style={tbl}>
                <thead>
                  <tr>
                    <th style={th}>Symbol</th>
                    <th style={th}>Exchange</th>
                    <th style={thRight}>Qty</th>
                    <th style={thRight}>Avg Price</th>
                    <th style={thRight}>Current Price</th>
                    <th style={thRight}>Current Value</th>
                    <th style={thRight}>P&L</th>
                    <th style={thRight}>P&L %</th>
                    <th style={th}>Sector</th>
                  </tr>
                </thead>
                <tbody>
                  {stockGroups.map((g) => {
                    const totalQty = g.lots.reduce(
                      (s: number, l: any) => s + (Number(l.qty) || 0),
                      0
                    );
                    const totalInvested = g.lots.reduce(
                      (s: number, l: any) =>
                        s + (Number(l.qty) || 0) * (Number(l.avgPrice) || 0),
                      0
                    );
                    const avgPrice = totalQty > 0 ? totalInvested / totalQty : 0;
                    const livePrice =
                      marketData?.[g.yfSym]?.price ??
                      Number(g.lots[0]?.currentPrice || 0);
                    const currentValue = totalQty * livePrice;
                    const pl = currentValue - totalInvested;
                    const plPct = totalInvested > 0 ? (pl / totalInvested) * 100 : 0;
                    const sector = marketData?.[g.yfSym]?.sector || "--";

                    return (
                      <tr key={g.yfSym}>
                        <td style={{ ...td, fontWeight: 600 }}>{g.base}</td>
                        <td style={td}>
                          <Badge
                            variant={g.exchange === "BSE" ? "gold" : "accent"}
                            style={{ fontSize: 10 }}
                          >
                            {g.exchange}
                          </Badge>
                        </td>
                        <td style={tdRight}>{totalQty}</td>
                        <td style={tdRight}>
                          <Prv>{fmtINRFull(avgPrice)}</Prv>
                        </td>
                        <td style={tdRight}>
                          <Prv>{fmtINRFull(livePrice)}</Prv>
                        </td>
                        <td style={tdRight}>
                          <Prv>{fmtINRFull(currentValue)}</Prv>
                        </td>
                        <td style={{ ...tdRight, color: plColor(pl) }}>
                          <Prv>
                            {plSign(pl)}
                            {fmtINRFull(pl)}
                          </Prv>
                        </td>
                        <td style={{ ...tdRight, color: plColor(plPct) }}>
                          {fmtPct(plPct)}
                        </td>
                        <td
                          style={{
                            ...td,
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
          )}
        </Card>
      )}

      {/* ── 4. Holdings Detail -- Mutual Funds ─────────────────────── */}
      {(state.mutualFunds?.length || 0) > 0 && (
        <Card style={{ padding: "0 16px 16px", marginBottom: 24 }}>
          <SectionHeader
            icon={BarChart3}
            title="Mutual Funds"
            count={state.mutualFunds.length}
            expanded={!!expandedSections.mf}
            onToggle={() => toggleSection("mf")}
          />
          {expandedSections.mf && (
            <div style={tableWrap}>
              <table style={tbl}>
                <thead>
                  <tr>
                    <th style={th}>Scheme Name</th>
                    <th style={th}>Category</th>
                    <th style={th}>Folio</th>
                    <th style={thRight}>Units</th>
                    <th style={thRight}>Buy NAV</th>
                    <th style={thRight}>Current NAV</th>
                    <th style={thRight}>Invested</th>
                    <th style={thRight}>Current Value</th>
                    <th style={thRight}>P&L</th>
                    <th style={thRight}>P&L %</th>
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
                      <tr key={mf.id}>
                        <td
                          style={{
                            ...td,
                            fontWeight: 600,
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
                              (mf.category || "")
                                .toLowerCase()
                                .includes("equity")
                                ? "accent"
                                : "sage"
                            }
                            style={{ fontSize: 10 }}
                          >
                            {mf.category || "Other"}
                          </Badge>
                        </td>
                        <td style={{ ...td, fontSize: 12, color: THEME.muted }}>
                          {mf.folioNumber || "--"}
                        </td>
                        <td style={tdRight}>
                          {units > 0 ? units.toFixed(3) : "--"}
                        </td>
                        <td style={tdRight}>
                          <Prv>
                            {buyNav > 0 ? `₹${buyNav.toFixed(2)}` : "--"}
                          </Prv>
                        </td>
                        <td style={tdRight}>
                          <Prv>
                            {currentNav > 0
                              ? `₹${currentNav.toFixed(2)}`
                              : "--"}
                          </Prv>
                        </td>
                        <td style={tdRight}>
                          <Prv>{fmtINRFull(invested)}</Prv>
                        </td>
                        <td style={tdRight}>
                          <Prv>{fmtINRFull(currentValue)}</Prv>
                        </td>
                        <td style={{ ...tdRight, color: plColor(pl) }}>
                          <Prv>
                            {plSign(pl)}
                            {fmtINRFull(pl)}
                          </Prv>
                        </td>
                        <td style={{ ...tdRight, color: plColor(plPct) }}>
                          {fmtPct(plPct)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── 5. Holdings Detail -- Fixed Income ─────────────────────── */}
      {/* FDs */}
      {(state.fixedDeposits?.length || 0) > 0 && (
        <Card style={{ padding: "0 16px 16px", marginBottom: 24 }}>
          <SectionHeader
            icon={Coins}
            title="Fixed Deposits"
            count={state.fixedDeposits.length}
            expanded={!!expandedSections.fd}
            onToggle={() => toggleSection("fd")}
          />
          {expandedSections.fd && (
            <div style={tableWrap}>
              <table style={tbl}>
                <thead>
                  <tr>
                    <th style={th}>Bank</th>
                    <th style={thRight}>Principal</th>
                    <th style={thRight}>Rate</th>
                    <th style={th}>Start Date</th>
                    <th style={th}>Maturity Date</th>
                    <th style={thRight}>Maturity Amount</th>
                    <th style={thRight}>Days to Maturity</th>
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
                      <tr key={fd.id}>
                        <td style={{ ...td, fontWeight: 600 }}>
                          {fd.bank || "--"}
                        </td>
                        <td style={tdRight}>
                          <Prv>{fmtINRFull(principal)}</Prv>
                        </td>
                        <td style={tdRight}>{rate > 0 ? `${rate}%` : "--"}</td>
                        <td style={td}>{fd.startDate || "--"}</td>
                        <td style={td}>{fd.maturityDate || "--"}</td>
                        <td style={tdRight}>
                          <Prv>{fmtINRFull(matAmount)}</Prv>
                        </td>
                        <td
                          style={{
                            ...tdRight,
                            color:
                              dtm != null && dtm <= 30
                                ? "#DC2626"
                                : dtm != null && dtm <= 90
                                  ? "#D97706"
                                  : THEME.ink,
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
          )}
        </Card>
      )}

      {/* RDs */}
      {(state.recurringDeposits?.length || 0) > 0 && (
        <Card style={{ padding: "0 16px 16px", marginBottom: 24 }}>
          <SectionHeader
            icon={Coins}
            title="Recurring Deposits"
            count={state.recurringDeposits.length}
            expanded={!!expandedSections.rd}
            onToggle={() => toggleSection("rd")}
          />
          {expandedSections.rd && (
            <div style={tableWrap}>
              <table style={tbl}>
                <thead>
                  <tr>
                    <th style={th}>Bank</th>
                    <th style={thRight}>Monthly</th>
                    <th style={thRight}>Tenure (months)</th>
                    <th style={thRight}>Rate</th>
                    <th style={thRight}>Maturity Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {state.recurringDeposits.map((rd: any) => {
                    const monthly = Number(rd.monthly) || 0;
                    const months = Number(rd.tenureMonths) || 0;
                    const rate = Number(rd.rate) || 0;
                    const matAmount = rdMaturity(monthly, rate, months);

                    return (
                      <tr key={rd.id}>
                        <td style={{ ...td, fontWeight: 600 }}>
                          {rd.bank || "--"}
                        </td>
                        <td style={tdRight}>
                          <Prv>{fmtINRFull(monthly)}</Prv>
                        </td>
                        <td style={tdRight}>{months || "--"}</td>
                        <td style={tdRight}>{rate > 0 ? `${rate}%` : "--"}</td>
                        <td style={tdRight}>
                          <Prv>{fmtINRFull(matAmount)}</Prv>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Bonds */}
      {(state.bonds?.length || 0) > 0 && (
        <Card style={{ padding: "0 16px 16px", marginBottom: 24 }}>
          <SectionHeader
            icon={FileText}
            title="Bonds"
            count={state.bonds.length}
            expanded={!!expandedSections.bonds}
            onToggle={() => toggleSection("bonds")}
          />
          {expandedSections.bonds && (
            <div style={tableWrap}>
              <table style={tbl}>
                <thead>
                  <tr>
                    <th style={th}>Name</th>
                    <th style={thRight}>Face Value</th>
                    <th style={thRight}>Coupon</th>
                    <th style={thRight}>YTM</th>
                    <th style={th}>Maturity Date</th>
                  </tr>
                </thead>
                <tbody>
                  {state.bonds.map((b: any) => {
                    const faceValue =
                      Number(b.totalInvestmentAmount || b.faceValue) || 0;
                    const coupon = Number(b.coupon) || 0;
                    const ytm = Number(b.ytmRate) || 0;

                    return (
                      <tr key={b.id}>
                        <td style={{ ...td, fontWeight: 600 }}>
                          {b.name || "--"}
                        </td>
                        <td style={tdRight}>
                          <Prv>{fmtINRFull(faceValue)}</Prv>
                        </td>
                        <td style={tdRight}>
                          {coupon > 0 ? `${coupon}%` : "--"}
                        </td>
                        <td style={tdRight}>
                          {ytm > 0 ? `${ytm}%` : "--"}
                        </td>
                        <td style={td}>{b.maturityDate || "--"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── 6. Holdings Detail -- Retirement ───────────────────────── */}
      {/* PPF */}
      {(state.ppf?.length || 0) > 0 && (
        <Card style={{ padding: "0 16px 16px", marginBottom: 24 }}>
          <SectionHeader
            icon={Shield}
            title="PPF"
            count={state.ppf.length}
            expanded={!!expandedSections.ppf}
            onToggle={() => toggleSection("ppf")}
          />
          {expandedSections.ppf && (
            <div style={tableWrap}>
              <table style={tbl}>
                <thead>
                  <tr>
                    <th style={th}>Institution</th>
                    <th style={th}>Account #</th>
                    <th style={thRight}>Balance</th>
                    <th style={thRight}>This Year Deposit</th>
                  </tr>
                </thead>
                <tbody>
                  {state.ppf.map((p: any) => {
                    const balance = Number(p.balance) || 0;
                    const currentFY = new Date().getMonth() >= 3
                      ? new Date().getFullYear()
                      : new Date().getFullYear() - 1;
                    const fyStart = `${currentFY}-04-01`;
                    const thisYearDeposit = (p.transactions || [])
                      .filter(
                        (t: any) =>
                          t.type === "deposit" && t.date && t.date >= fyStart
                      )
                      .reduce(
                        (s: number, t: any) => s + (Number(t.amount) || 0),
                        0
                      );

                    return (
                      <tr key={p.id}>
                        <td style={{ ...td, fontWeight: 600 }}>
                          {p.institution || "--"}
                        </td>
                        <td style={{ ...td, fontSize: 12, color: THEME.muted }}>
                          {p.accountNumber || "--"}
                        </td>
                        <td style={tdRight}>
                          <Prv>{fmtINRFull(balance)}</Prv>
                        </td>
                        <td style={tdRight}>
                          <Prv>
                            {thisYearDeposit > 0
                              ? fmtINRFull(thisYearDeposit)
                              : "--"}
                          </Prv>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* NPS */}
      {(state.nps?.length || 0) > 0 && (
        <Card style={{ padding: "0 16px 16px", marginBottom: 24 }}>
          <SectionHeader
            icon={Briefcase}
            title="NPS"
            count={state.nps.length}
            expanded={!!expandedSections.nps}
            onToggle={() => toggleSection("nps")}
          />
          {expandedSections.nps && (
            <div style={tableWrap}>
              <table style={tbl}>
                <thead>
                  <tr>
                    <th style={th}>Fund Manager</th>
                    <th style={th}>PRAN</th>
                    <th style={th}>Tier</th>
                    <th style={thRight}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {state.nps.map((n: any) => (
                    <tr key={n.id}>
                      <td style={{ ...td, fontWeight: 600 }}>
                        {n.fundManager || "--"}
                      </td>
                      <td style={{ ...td, fontSize: 12, color: THEME.muted }}>
                        {n.pran || "--"}
                      </td>
                      <td style={td}>
                        <Badge
                          variant={n.tier === "II" ? "gold" : "accent"}
                          style={{ fontSize: 10 }}
                        >
                          Tier {n.tier || "I"}
                        </Badge>
                      </td>
                      <td style={tdRight}>
                        <Prv>{fmtINRFull(Number(n.balance) || 0)}</Prv>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* EPF */}
      {(state.epf?.length || 0) > 0 && (
        <Card style={{ padding: "0 16px 16px", marginBottom: 24 }}>
          <SectionHeader
            icon={Shield}
            title="EPF"
            count={state.epf.length}
            expanded={!!expandedSections.epf}
            onToggle={() => toggleSection("epf")}
          />
          {expandedSections.epf && (
            <div style={tableWrap}>
              <table style={tbl}>
                <thead>
                  <tr>
                    <th style={th}>Employer</th>
                    <th style={th}>UAN</th>
                    <th style={thRight}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {state.epf.map((e: any) => (
                    <tr key={e.id}>
                      <td style={{ ...td, fontWeight: 600 }}>
                        {e.employer || "--"}
                      </td>
                      <td style={{ ...td, fontSize: 12, color: THEME.muted }}>
                        {e.uan || "--"}
                      </td>
                      <td style={tdRight}>
                        <Prv>{fmtINRFull(calculateEpfBalance(e))}</Prv>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── Insurance ──────────────────────────────────────────────── */}
      {((state.lic?.length || 0) + (state.investmentPlans?.length || 0)) > 0 && (
        <Card style={{ padding: "0 16px 16px", marginBottom: 24 }}>
          <SectionHeader
            icon={Heart}
            title="LIC / Insurance Plans"
            count={(state.lic?.length || 0) + (state.investmentPlans?.length || 0)}
            expanded={!!expandedSections.insurance}
            onToggle={() => toggleSection("insurance")}
          />
          {expandedSections.insurance && (
            <div style={tableWrap}>
              <table style={tbl}>
                <thead>
                  <tr>
                    <th style={th}>Plan Name</th>
                    <th style={th}>Policy #</th>
                    <th style={th}>Type</th>
                    <th style={thRight}>Premiums Paid</th>
                    <th style={thRight}>Sum Assured / Value</th>
                    <th style={th}>Maturity Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(state.lic || []).map((l: any) => (
                    <tr key={l.id}>
                      <td style={{ ...td, fontWeight: 600 }}>
                        {l.planName || "--"}
                      </td>
                      <td style={{ ...td, fontSize: 12, color: THEME.muted }}>
                        {l.policyNumber || "--"}
                      </td>
                      <td style={td}>
                        <Badge variant="gold" style={{ fontSize: 10 }}>
                          LIC
                        </Badge>
                      </td>
                      <td style={tdRight}>
                        <Prv>{fmtINRFull(Number(l.premiumPaid) || 0)}</Prv>
                      </td>
                      <td style={tdRight}>
                        <Prv>{fmtINRFull(Number(l.sumAssured) || 0)}</Prv>
                      </td>
                      <td style={td}>{l.maturityDate || "--"}</td>
                    </tr>
                  ))}
                  {(state.investmentPlans || []).map((ip: any) => (
                    <tr key={ip.id}>
                      <td style={{ ...td, fontWeight: 600 }}>
                        {ip.planName || ip.insurer || "--"}
                      </td>
                      <td style={{ ...td, fontSize: 12, color: THEME.muted }}>
                        {ip.policyNumber || "--"}
                      </td>
                      <td style={td}>
                        <Badge variant="sage" style={{ fontSize: 10 }}>
                          Investment
                        </Badge>
                      </td>
                      <td style={tdRight}>
                        <Prv>{fmtINRFull(Number(ip.premiumPaid) || 0)}</Prv>
                      </td>
                      <td style={tdRight}>
                        <Prv>
                          {fmtINRFull(
                            Number(ip.expectedMaturityAmount || ip.sumAssured) || 0
                          )}
                        </Prv>
                      </td>
                      <td style={td}>{ip.maturityDate || "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* ── 7. Asset Allocation Pie Chart ──────────────────────────── */}
      {summary.pieData.length > 0 && (
        <Card style={{ padding: "24px 16px", marginBottom: 24 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: THEME.ink,
              letterSpacing: "-0.02em",
              marginBottom: 20,
            }}
          >
            Asset Allocation
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
            <div style={{ width: 300, height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summary.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    nameKey="name"
                    stroke="none"
                  >
                    {summary.pieData.map((_: any, i: number) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => fmtINRFull(value)}
                    contentStyle={{
                      background: "var(--t-paper)",
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 8,
                      fontSize: 13,
                      color: THEME.ink,
                    }}
                    labelStyle={{ color: THEME.ink }}
                    itemStyle={{ color: THEME.ink }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span style={{ color: THEME.ink, fontSize: 12 }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                minWidth: 200,
              }}
            >
              {summary.pieData.map((d: any, i: number) => {
                const total = summary.pieData.reduce(
                  (s: number, x: any) => s + x.value,
                  0
                );
                const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0";
                return (
                  <div
                    key={d.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        background: PIE_COLORS[i % PIE_COLORS.length],
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: THEME.ink,
                        }}
                      >
                        {d.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: THEME.muted,
                        }}
                      >
                        <Prv>{fmtINRFull(d.value)}</Prv> ({pct}%)
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
