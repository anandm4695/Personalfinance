/* eslint-disable */
// @ts-nocheck
import React, { useState, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
  Printer,
  Download,
  FileText,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Shield,
  Coins,
  BarChart3,
  Gem,
  Home,
  Heart,
  Search,
  X,
} from "lucide-react";
import { THEME, ASSET_CLASS_COLORS } from "../../utils/constants";
import {
  fmtINR,
  fmtINRFull,
  today,
  calcCAGR,
  fdMaturity,
  rdMaturity,
  monthsBetween,
  calculateEpfBalance,
  getGoldPricePerGram,
  GOLD_PURITY_FACTOR,
  exportArrayToCSV,
} from "../../utils/finance";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";

/* ── Print-friendly layout ─────────────────────────────────────────── */
const printStyles = `@media print { body * { visibility: hidden; } .investment-statement, .investment-statement * { visibility: visible; } .investment-statement { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } .print-only-header { display: block !important; margin-bottom: 20px; } }`;

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
// Named lookup (not positional index) so a category's color stays fixed even
// when pieData drops zero-value buckets — with 6 optional categories,
// indexing by post-filter position would repaint the survivors whenever a
// user simply doesn't hold one asset class (e.g. no Gold this month shifts
// Retirement/Insurance/Real Estate into the wrong hues). Uses the app-wide
// canonical ASSET_CLASS_COLORS map so these 6 categories render in the same
// color here as on every other tab's asset-class chart (Executive Dashboard,
// Portfolio Rebalancing, Annual Report, Family View).
const PIE_COLOR_BY_NAME = ASSET_CLASS_COLORS;
const PIE_COLORS = [
  THEME.chart1,
  THEME.chart2,
  THEME.chart3,
  THEME.chart4,
  THEME.chart5,
  THEME.chart6,
];

/* ── P&L color helper ──────────────────────────────────────────────── */
const plColor = (v: number) => (v > 0 ? THEME.sage : v < 0 ? THEME.rust : THEME.muted);

const plSign = (v: number) => (v > 0 ? "+" : "");

/* ── Format percent ────────────────────────────────────────────────── */
const fmtPct = (v: number | null | undefined) =>
  v == null || isNaN(v) ? "--" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

/* ── Real-estate ownership share helpers ─────────────────────────────
   Mirrors realEstateTrackedShare/realEstateShareForOwner in RealEstateTab.tsx
   / useMetrics.ts / netWorthAsOf.ts (intentionally duplicated per this
   codebase's existing convention — kept in sync across all four copies) so
   a jointly-owned property contributes only the household's tracked share
   to this statement, not its full value. */
const EXTERNAL_OWNER_ID = "external";

const realEstateTrackedShare = (property: any): number => {
  if (Array.isArray(property.owners) && property.owners.length > 0) {
    return (
      property.owners.reduce(
        (s: number, o: any) => (o?.id !== EXTERNAL_OWNER_ID ? s + Number(o.sharePct || 0) : s),
        0
      ) / 100
    );
  }
  return 1;
};

const realEstateShareForOwner = (property: any, profileId: string): number => {
  if (Array.isArray(property.owners) && property.owners.length > 0) {
    const match = property.owners.find((o: any) => o?.id === profileId);
    return match ? Number(match.sharePct || 0) / 100 : 0;
  }
  return property.owner === profileId ? 1 : 0;
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
            <Prv>{formatter ? formatter(p.value) : <Money value={p.value} variant="full" />}</Prv>
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
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Icon size={18} color={THEME.accent} />
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
  activeProfile,
}: {
  state: any;
  metrics: any;
  marketData: any;
  activeProfile?: string;
}) => {
  const { privacyMode } = usePrivacy();
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    stocks: true,
    mf: true,
    fd: true,
    rd: true,
    bonds: true,
    ppf: true,
    nps: true,
    epf: true,
    gold: true,
    realestate: true,
    insurance: true,
  });

  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const matchesSearch = (text: string) =>
    !searchQuery || (text || "").toLowerCase().includes(searchQuery.toLowerCase());

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
    const principal = Number(x.totalInvestmentAmount || x.totalPrincipalAmount || x.faceValue) || 0;
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
    const goldHoldings = state.goldHoldings || [];
    const realEstateProperties = (state.realEstateProperties || []).filter(
      (p: any) => p.status !== "sold"
    );

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
    // Weight by principal, not a simple per-account average — a ₹10L FD at 6% and a
    // ₹10k FD at 9% should read close to 6%, not the 7.5% midpoint. This rate also
    // feeds into the portfolio-level weightedCAGR below, so an unweighted average
    // here skewed the overall blended return.
    const fdAvgRate =
      fdInvested > 0
        ? fds.reduce((s: number, x: any) => s + (Number(x.rate) || 0) * (Number(x.principal) || 0), 0) /
          fdInvested
        : 0;

    /* ── Debt - RDs ───────────────────────────────────────────────── */
    const rdInvested = rds.reduce((s: number, x: any) => s + rdPrincipal(x), 0);
    const rdCurr = rds.reduce((s: number, x: any) => s + rdCurrentValue(x), 0);
    const rdAvgRate =
      rdInvested > 0
        ? rds.reduce((s: number, x: any) => s + (Number(x.rate) || 0) * rdPrincipal(x), 0) /
          rdInvested
        : 0;

    /* ── Debt - Bonds ─────────────────────────────────────────────── */
    const bondPrincipal = (x: any) =>
      Number(x.totalInvestmentAmount || x.totalPrincipalAmount || x.faceValue) || 0;
    const bondInvested = bonds.reduce((s: number, x: any) => s + bondPrincipal(x), 0);
    const bondCurrent = bonds.reduce((s: number, x: any) => s + bondCurrentValue(x), 0);
    const bondAvgYTM =
      bondInvested > 0
        ? bonds.reduce(
            (s: number, x: any) => s + (Number(x.ytmRate || x.coupon) || 0) * bondPrincipal(x),
            0
          ) / bondInvested
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
    // Matches the fallback already used by npsContributions above and by the per-account
    // detail table below — an account tracked purely via its transactions ledger (balance
    // field unset/0) was previously counted as ₹0 here, undercounting the hero portfolio
    // total, the Retirement pie slice, weightedCAGR, and forcing npsCAGR to null (a real
    // account with contribution history reading as a full loss).
    const npsBalance = npsList.reduce((s: number, x: any) => {
      const bal = Number(x.balance) || 0;
      if (bal > 0) return s + bal;
      const txs = x.transactions || [];
      return (
        s +
        txs.reduce(
          (sum: number, t: any) => sum + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
          0
        )
      );
    }, 0);

    /* ── EPF ──────────────────────────────────────────────────────── */
    const epfBalance = epfs.reduce((s: number, x: any) => s + calculateEpfBalance(x), 0);
    const epfContributions = epfs.reduce((s: number, x: any) => {
      const txs = x.transactions || [];
      // Any non-empty ledger wins over the static balance fallback — matches calculateEpfBalance
      // in finance.ts (previously gated on monthly_contribution/interest_credit/transfer_in only,
      // silently dropping accounts logged via the simpler employee/employer contribution types).
      const hasPassbook = txs.length > 0;
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

    /* ── Gold & SGBs ──────────────────────────────────────────────── */
    // Mirrors GoldSGBTab.tsx's own `enriched` calc (grams * live gram price *
    // purity multiplier for physical), including its "no purchase price on
    // record → invested falls back to current value" rule so an untracked
    // cost basis contributes 0 P&L here instead of a fabricated loss/gain.
    const goldPrice = getGoldPricePerGram(state);
    let goldInvested = 0;
    let goldCurrent = 0;
    const goldDates: string[] = [];
    goldHoldings.forEach((h: any) => {
      const grams = Number(h.grams || 0);
      const purchasePrice = Number(h.purchasePrice || 0);
      const purityMul = h.type === "physical" ? GOLD_PURITY_FACTOR[h.purity] || 1 : 1;
      const currentValue = grams * goldPrice * purityMul;
      const invested = purchasePrice > 0 ? purchasePrice : currentValue;
      goldInvested += invested;
      goldCurrent += currentValue;
      if (purchasePrice > 0 && h.purchaseDate) goldDates.push(h.purchaseDate);
    });
    const goldCAGR =
      goldDates.length && goldInvested > 0
        ? calcCAGR(goldInvested, goldCurrent, goldDates.sort()[0])
        : null;

    /* ── Real Estate ──────────────────────────────────────────────── */
    // Scoped to the active profile's ownership share (mirrors RealEstateTab.tsx's
    // `shareOf`/portfolio stats) — a jointly-owned property contributes only this
    // household/profile's tracked share, not its full market value. Sold
    // properties are already excluded via the `realEstateProperties` filter above.
    let reInvested = 0;
    let reCurrent = 0;
    const reDates: string[] = [];
    realEstateProperties.forEach((p: any) => {
      const share =
        activeProfile && activeProfile !== "all"
          ? realEstateShareForOwner(p, activeProfile)
          : realEstateTrackedShare(p);
      const cost =
        (Number(p.agreementValue || 0) + Number(p.stampDuty || 0) + Number(p.tdsAmount || 0)) *
        share;
      const value = Number(p.marketValue || p.agreementValue || 0) * share;
      reInvested += cost;
      reCurrent += value;
      if (cost > 0 && p.purchaseDate) reDates.push(p.purchaseDate);
    });
    const reCAGR =
      reDates.length && reInvested > 0 ? calcCAGR(reInvested, reCurrent, reDates.sort()[0]) : null;

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
        // "current" here is the policy's eventual maturity/sum-assured value, not a
        // present mark-to-market figure — a lifetime-return % (annualized or not) would
        // misleadingly compare premiums-paid-to-date against a future payout under the
        // same "CAGR" header every other row uses for a genuine annualized return.
        // Already correctly excluded from weightedCAGR (rate: null); the label now
        // matches that instead of showing a fabricated-looking number next to it.
        rate: null,
        rateLabel: "--",
      },
      {
        label: "Gold & SGBs",
        invested: goldInvested,
        current: goldCurrent,
        gain: goldCurrent - goldInvested,
        rate: goldCAGR,
        rateLabel: goldCAGR != null ? `${goldCAGR.toFixed(1)}%` : "--",
      },
      {
        label: "Real Estate",
        invested: reInvested,
        current: reCurrent,
        gain: reCurrent - reInvested,
        rate: reCAGR,
        rateLabel: reCAGR != null ? `${reCAGR.toFixed(1)}%` : "--",
      },
    ];

    const totalInvested = rows.reduce((s, r) => s + r.invested, 0);
    const totalCurrent = rows.reduce((s, r) => s + r.current, 0);
    const totalGain = totalCurrent - totalInvested;

    // Renormalize by the *rate-bearing* rows' own current value, not totalCurrent —
    // rows with rate:null (e.g. LIC/Insurance, whose "return" isn't a comparable
    // annualized rate) are excluded from the weighted average entirely, so the
    // weights of the included rows must sum to 1 on their own. Dividing by the
    // full totalCurrent instead would silently dilute the blended CAGR by
    // whatever share of the portfolio those excluded rows hold.
    const weightedRows = rows.filter((r) => r.rate != null && r.current > 0);
    const weightedBase = weightedRows.reduce((s, r) => s + r.current, 0);
    const weightedCAGR =
      weightedBase > 0
        ? weightedRows.reduce((s, r) => s + (r.rate || 0) * (r.current / weightedBase), 0)
        : null;

    const rowsWithAlloc = rows.map((r) => ({
      ...r,
      allocation: totalCurrent > 0 ? (r.current / totalCurrent) * 100 : 0,
    }));

    /* ── Pie chart data (order fixed to match PIE_COLORS) ───────────── */
    const equityTotal = stockCurrent + eqMFCurrent;
    const debtTotal = fdCurrent + rdCurr + bondCurrent + debtMFCurrent;
    const goldTotal = goldCurrent;
    const retirementTotal = ppfBalance + npsBalance + epfBalance;
    const insuranceTotal = insuranceValue;
    const realEstateTotal = reCurrent;

    const pieData = [
      { name: "Equity", value: equityTotal },
      { name: "Debt", value: debtTotal },
      { name: "Gold", value: goldTotal },
      { name: "Retirement", value: retirementTotal },
      { name: "Insurance", value: insuranceTotal },
      { name: "Real Estate", value: realEstateTotal },
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
      goldTotal,
      retirementTotal,
      insuranceTotal,
      realEstateTotal,
    };
  }, [state, marketData, activeProfile]);

  /* ── Animated hero "Total Portfolio Value" figure ────────────────── */
  const animatedTotalCurrent = useAnimatedNumber(summary.totalCurrent);

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

  /* ── Real estate properties still held (excludes sold) ──────────── */
  const realEstateActiveProperties = useMemo(
    () => (state.realEstateProperties || []).filter((p: any) => p.status !== "sold"),
    [state.realEstateProperties]
  );

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
      (state.investmentPlans?.length || 0) +
      (state.goldHoldings?.length || 0) +
      (state.realEstateProperties?.length || 0) >
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
          description="Add investments across Fixed Deposits, Mutual Funds, Stocks, PPF, NPS, EPF, Gold and Real Estate to see your consolidated statement."
          pills={["Stocks", "Mutual Funds", "FDs", "PPF", "NPS", "EPF", "Gold", "Real Estate"]}
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

  const handleExportCSV = () => {
    const exportRows = summary.rows
      .filter((r: any) => r.invested !== 0 || r.current !== 0)
      .map((r: any) => ({
        assetClass: r.label,
        invested: Math.round(r.invested),
        current: Math.round(r.current),
        gain: Math.round(r.gain),
        rate: r.rateLabel,
        allocationPct: `${r.allocation.toFixed(1)}%`,
      }));
    exportRows.push({
      assetClass: "Total",
      invested: Math.round(summary.totalInvested),
      current: Math.round(summary.totalCurrent),
      gain: Math.round(summary.totalGain),
      rate: summary.weightedCAGR != null ? `${summary.weightedCAGR.toFixed(1)}%` : "--",
      allocationPct: "100%",
    });
    exportArrayToCSV(
      exportRows,
      [
        { key: "assetClass", label: "Asset Class" },
        { key: "invested", label: "Invested" },
        { key: "current", label: "Current Value" },
        { key: "gain", label: "Gain / Loss" },
        { key: "rate", label: "CAGR" },
        { key: "allocationPct", label: "Allocation %" },
      ],
      `investment-statement_${todayStr}.csv`
    );
  };

  return (
    <div
      className="investment-statement"
      style={{ padding: "32px 0", display: "flex", flexDirection: "column", gap: 24 }}
    >
      <style>{printStyles}</style>

      <div className="print-only-header" style={{ display: "none" }}>
        <img src="/logo-horizontal.png" alt="ArthaDrishti" style={{ height: 48, width: "auto" }} />
      </div>

      {/* ── 1. Statement Header ─────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <SectionTitle sub={`As of ${formattedDate}`}>
          Consolidated Investment Statement
        </SectionTitle>
        <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", position: "relative", alignItems: "center" }}>
            <Search
              size={16}
              color={THEME.muted}
              style={{ position: "absolute", left: 14, pointerEvents: "none" }}
            />
            <input
              type="text"
              aria-label="Search holdings"
              placeholder="Search holdings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: 200,
                padding: `9px ${searchQuery ? 36 : 12}px 9px 38px`,
                borderRadius: 12,
                border: `1.5px solid ${THEME.line}`,
                background: "var(--surface-0)",
                color: THEME.ink,
                fontSize: 13,
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
                  right: 10,
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
            onClick={handleExportCSV}
          >
            CSV
          </Button>
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
      {searchQuery && (
        <div style={{ fontSize: 12, color: THEME.muted, marginTop: -14 }} className="no-print">
          Filtering holdings tables by "{searchQuery}" — summary and allocation totals are unaffected.
        </div>
      )}

      {/* ── 1b. Hero Total — "what's my portfolio worth right now" is the one
           number this whole statement answers, so it gets top billing above
           the line-item table instead of only appearing as one more bolded
           row buried at the bottom of it (same treatment as NetWorthTimelineTab's
           "Net Worth Today" / GoalsTab's "Overall Progress"). */}
      <Card
        variant="hero"
        style={{ padding: "clamp(24px, 4vw, 36px)", display: "flex", flexDirection: "column", gap: 4 }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          Total Portfolio Value
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(32px, 5vw, 52px)",
            fontWeight: 600,
            color: "#fff",
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          <Money value={animatedTotalCurrent} variant="full" />
        </div>
        <div
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.65)",
            marginTop: 4,
            display: "flex",
            flexWrap: "wrap",
            gap: 14,
          }}
        >
          <span>
            Invested <Money value={summary.totalInvested} variant="full" />
          </span>
          <span>
            {summary.totalGain >= 0 ? "+" : ""}
            <Money value={summary.totalGain} variant="full" /> gain/loss
          </span>
          {summary.weightedCAGR != null && (
            <span>Weighted CAGR {summary.weightedCAGR.toFixed(1)}%</span>
          )}
        </div>
      </Card>

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
                    className="table-row-hover"
                  >
                    <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                      {row.label}
                    </td>
                    <td style={tdRight}>
                      <Money value={row.invested} variant="full" />
                    </td>
                    <td style={tdRight}>
                      <Money value={row.current} variant="full" />
                    </td>
                    <td style={{ ...tdRight, color: plColor(row.gain), fontWeight: 700 }}>
                      {plSign(row.gain)}
                      <Money value={row.gain} variant="full" />
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
                  <Money value={summary.totalInvested} variant="full" />
                </td>
                <td style={tdBoldRight}>
                  <Money value={summary.totalCurrent} variant="full" />
                </td>
                <td
                  style={{
                    ...tdBoldRight,
                    color: plColor(summary.totalGain),
                  }}
                >
                  {plSign(summary.totalGain)}
                  <Money value={summary.totalGain} variant="full" />
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
                <table style={{ ...tbl, minWidth: 820 }}>
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
                    {stockGroups.filter((g) => matchesSearch(g.base)).map((g) => {
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
                          className="table-row-hover"
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
                            <Money value={avgPrice} variant="full" />
                          </td>
                          <td style={tdRight}>
                            <Money value={livePrice} variant="full" />
                          </td>
                          <td style={{ ...tdRight, fontWeight: 700 }}>
                            <Money value={currentValue} variant="full" />
                          </td>
                          <td style={{ ...tdRight, color: plColor(pl), fontWeight: 700 }}>
                            {plSign(pl)}
                            <Money value={pl} variant="full" />
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
                <table style={{ ...tbl, minWidth: 900 }}>
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
                    {state.mutualFunds
                      .filter((mf: any) => matchesSearch(mf.schemeName || mf.name))
                      .map((mf: any) => {
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
                          className="table-row-hover"
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
                            <Money value={invested} variant="full" />
                          </td>
                          <td style={{ ...tdRight, fontWeight: 700 }}>
                            <Money value={currentValue} variant="full" />
                          </td>
                          <td style={{ ...tdRight, color: plColor(pl), fontWeight: 700 }}>
                            {plSign(pl)}
                            <Money value={pl} variant="full" />
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
                    {state.fixedDeposits
                      .filter((fd: any) => matchesSearch(fd.bank))
                      .map((fd: any) => {
                      const principal = Number(fd.principal) || 0;
                      const rate = Number(fd.rate) || 0;
                      const years = Number(fd.years) || 0;
                      const matAmount = fdMaturity(principal, rate, years);
                      const dtm = daysToMaturity(fd.maturityDate);

                      return (
                        <tr
                          key={fd.id}
                          className="table-row-hover"
                        >
                          <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                            {fd.bank || "--"}
                          </td>
                          <td style={{ ...tdRight, fontWeight: 700 }}>
                            <Money value={principal} variant="full" />
                          </td>
                          <td style={{ ...tdRight, fontWeight: 600 }}>
                            {rate > 0 ? `${rate}%` : "--"}
                          </td>
                          <td style={td}>{fd.startDate || "--"}</td>
                          <td style={td}>{fd.maturityDate || "--"}</td>
                          <td style={{ ...tdRight, fontWeight: 700 }}>
                            <Money value={matAmount} variant="full" />
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
                                    ? THEME.gold
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
                    {state.recurringDeposits
                      .filter((rd: any) => matchesSearch(rd.bank))
                      .map((rd: any) => {
                      const monthly = Number(rd.monthly) || 0;
                      const months = Number(rd.tenureMonths) || 0;
                      const rate = Number(rd.rate) || 0;
                      const matAmount = rdMaturity(monthly, rate, months);

                      return (
                        <tr
                          key={rd.id}
                          className="table-row-hover"
                        >
                          <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                            {rd.bank || "--"}
                          </td>
                          <td style={tdRight}>
                            <Money value={monthly} variant="full" />
                          </td>
                          <td style={tdRight}>{months || "--"}</td>
                          <td style={tdRight}>{rate > 0 ? `${rate}%` : "--"}</td>
                          <td style={{ ...tdRight, paddingRight: 16, fontWeight: 700 }}>
                            <Money value={matAmount} variant="full" />
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
                    {state.bonds
                      .filter((b: any) => matchesSearch(b.name))
                      .map((b: any) => {
                      const faceValue =
                        Number(b.totalInvestmentAmount || b.totalPrincipalAmount || b.faceValue) ||
                        0;
                      const coupon = Number(b.coupon) || 0;
                      const ytm = Number(b.ytmRate) || 0;

                      return (
                        <tr
                          key={b.id}
                          className="table-row-hover"
                        >
                          <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                            {b.name || "--"}
                          </td>
                          <td style={{ ...tdRight, fontWeight: 700 }}>
                            <Money value={faceValue} variant="full" />
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
                    {state.ppf
                      .filter((p: any) => matchesSearch(p.institution))
                      .map((p: any) => {
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
                          className="table-row-hover"
                        >
                          <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                            {p.institution || "--"}
                          </td>
                          <td style={{ ...td, fontSize: 12, color: THEME.muted }}>
                            {p.accountNumber || "--"}
                          </td>
                          <td style={{ ...tdRight, fontWeight: 700 }}>
                            <Money value={balance} variant="full" />
                          </td>
                          <td
                            style={{
                              ...tdRight,
                              paddingRight: 16,
                              color: THEME.sage,
                              fontWeight: 700,
                            }}
                          >
                            {thisYearDeposit > 0 ? (
                              <Money value={thisYearDeposit} variant="full" />
                            ) : (
                              "--"
                            )}
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
                    {state.nps
                      .filter((n: any) => matchesSearch(n.fundManager))
                      .map((n: any) => (
                      <tr
                        key={n.id}
                        className="table-row-hover"
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
                          <Money
                            value={(() => {
                              const bal = Number(n.balance) || 0;
                              if (bal > 0) return bal;
                              return (n.transactions || []).reduce(
                                (ss: number, t: any) =>
                                  ss + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
                                0
                              );
                            })()}
                            variant="full"
                          />
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
                    {state.epf
                      .filter((e: any) => matchesSearch(e.employer))
                      .map((e: any) => (
                      <tr
                        key={e.id}
                        className="table-row-hover"
                      >
                        <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                          {e.employer || "--"}
                        </td>
                        <td style={{ ...td, fontSize: 12, color: THEME.muted }}>{e.uan || "--"}</td>
                        <td style={{ ...tdRight, paddingRight: 16, fontWeight: 700 }}>
                          <Money value={calculateEpfBalance(e)} variant="full" />
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
                <table style={{ ...tbl, minWidth: 680 }}>
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
                    {(state.lic || [])
                      .filter((l: any) => matchesSearch(l.planName))
                      .map((l: any) => (
                      <tr
                        key={l.id}
                        className="table-row-hover"
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
                          <Money
                            value={(() => {
                              const txTotal = (l.transactions || []).reduce(
                                (sum: number, t: any) => sum + Number(t.amount || 0),
                                0
                              );
                              return txTotal > 0 ? txTotal : Number(l.premiumPaid || 0);
                            })()}
                            variant="full"
                          />
                        </td>
                        <td style={{ ...tdRight, fontWeight: 700 }}>
                          <Money value={Number(l.sumAssured) || 0} variant="full" />
                        </td>
                        <td style={{ ...td, paddingRight: 16 }}>{l.maturityDate || "--"}</td>
                      </tr>
                    ))}
                    {(state.investmentPlans || [])
                      .filter((ip: any) => matchesSearch(ip.planName || ip.insurer))
                      .map((ip: any) => (
                      <tr
                        key={ip.id}
                        className="table-row-hover"
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
                          <Money
                            value={(() => {
                              const txTotal = (ip.transactions || []).reduce(
                                (sum: number, t: any) => sum + Number(t.amount || 0),
                                0
                              );
                              return txTotal > 0 ? txTotal : Number(ip.premiumPaid || 0);
                            })()}
                            variant="full"
                          />
                        </td>
                        <td style={{ ...tdRight, fontWeight: 700 }}>
                          <Money
                            value={Number(ip.expectedMaturityAmount || ip.sumAssured) || 0}
                            variant="full"
                          />
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

      {/* Gold & SGBs */}
      {(state.goldHoldings?.length || 0) > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionHeader
            icon={Gem}
            title="Gold & SGBs"
            count={state.goldHoldings.length}
            expanded={!!expandedSections.gold}
            onToggle={() => toggleSection("gold")}
          />
          {expandedSections.gold && (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={tableWrap}>
                <table style={{ ...tbl, minWidth: 760 }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, paddingLeft: 16 }}>Holding</th>
                      <th style={th}>Type</th>
                      <th style={thRight}>Grams</th>
                      <th style={thRight}>Invested</th>
                      <th style={thRight}>Current Value</th>
                      <th style={thRight}>P&L</th>
                      <th style={{ ...thRight, paddingRight: 16 }}>P&L %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.goldHoldings
                      .filter((h: any) => matchesSearch(h.name))
                      .map((h: any) => {
                        const grams = Number(h.grams) || 0;
                        const purchasePrice = Number(h.purchasePrice) || 0;
                        const purityMul =
                          h.type === "physical" ? GOLD_PURITY_FACTOR[h.purity] || 1 : 1;
                        const currentValue =
                          grams * getGoldPricePerGram(state) * purityMul;
                        const invested = purchasePrice > 0 ? purchasePrice : currentValue;
                        const pl = currentValue - invested;
                        const plPct = invested > 0 ? (pl / invested) * 100 : 0;

                        return (
                          <tr key={h.id} className="table-row-hover">
                            <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                              {h.name || "--"}
                            </td>
                            <td style={td}>
                              <Badge
                                variant={h.type === "sgb" ? "sage" : "gold"}
                                style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6 }}
                              >
                                {h.type === "sgb"
                                  ? "SGB"
                                  : h.type === "digital"
                                    ? "Digital"
                                    : h.type === "etf"
                                      ? "ETF"
                                      : h.type === "mf"
                                        ? "Gold MF"
                                        : "Physical"}
                              </Badge>
                            </td>
                            <td style={{ ...tdRight, fontWeight: 600 }}>
                              {grams > 0 ? grams.toFixed(2) : "--"}
                            </td>
                            <td style={tdRight}>
                              <Money value={invested} variant="full" />
                            </td>
                            <td style={{ ...tdRight, fontWeight: 700 }}>
                              <Money value={currentValue} variant="full" />
                            </td>
                            <td style={{ ...tdRight, color: plColor(pl), fontWeight: 700 }}>
                              {plSign(pl)}
                              <Money value={pl} variant="full" />
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

      {/* Real Estate */}
      {realEstateActiveProperties.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SectionHeader
            icon={Home}
            title="Real Estate"
            count={realEstateActiveProperties.length}
            expanded={!!expandedSections.realestate}
            onToggle={() => toggleSection("realestate")}
          />
          {expandedSections.realestate && (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={tableWrap}>
                <table style={{ ...tbl, minWidth: 820 }}>
                  <thead>
                    <tr>
                      <th style={{ ...th, paddingLeft: 16 }}>Property</th>
                      <th style={th}>Location</th>
                      <th style={thRight}>Your Share</th>
                      <th style={thRight}>Invested</th>
                      <th style={thRight}>Current Value</th>
                      <th style={thRight}>Gain</th>
                      <th style={{ ...thRight, paddingRight: 16 }}>Gain %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {realEstateActiveProperties
                      .filter((p: any) => matchesSearch(p.name))
                      .map((p: any) => {
                        const share =
                          activeProfile && activeProfile !== "all"
                            ? realEstateShareForOwner(p, activeProfile)
                            : realEstateTrackedShare(p);
                        const invested =
                          (Number(p.agreementValue || 0) +
                            Number(p.stampDuty || 0) +
                            Number(p.tdsAmount || 0)) *
                          share;
                        const currentValue = Number(p.marketValue || p.agreementValue || 0) * share;
                        const gain = currentValue - invested;
                        const gainPct = invested > 0 ? (gain / invested) * 100 : 0;

                        return (
                          <tr key={p.id} className="table-row-hover">
                            <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                              {p.name || "--"}
                            </td>
                            <td
                              style={{
                                ...td,
                                fontSize: 12,
                                color: THEME.muted,
                                maxWidth: 160,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {p.location || "--"}
                            </td>
                            <td style={{ ...tdRight, fontWeight: 600 }}>
                              {(share * 100).toFixed(0)}%
                            </td>
                            <td style={tdRight}>
                              <Money value={invested} variant="full" />
                            </td>
                            <td style={{ ...tdRight, fontWeight: 700 }}>
                              <Money value={currentValue} variant="full" />
                            </td>
                            <td style={{ ...tdRight, color: plColor(gain), fontWeight: 700 }}>
                              {plSign(gain)}
                              <Money value={gain} variant="full" />
                            </td>
                            <td
                              style={{
                                ...tdRight,
                                paddingRight: 16,
                                color: plColor(gainPct),
                                fontWeight: 700,
                              }}
                            >
                              {fmtPct(gainPct)}
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
                        fill={PIE_COLOR_BY_NAME[d.name] || PIE_COLORS[i % PIE_COLORS.length]}
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
                          fontFamily: "var(--font-display)",
                          fontSize: 16,
                          fill: THEME.ink,
                          fontWeight: 900,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {privacyMode
                          ? "••••"
                          : `₹${summary.pieData[activePieIndex].value.toLocaleString("en-IN", {
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
                        Net Worth
                      </text>
                      <text
                        x="50%"
                        y="56%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 16,
                          fill: THEME.ink,
                          fontWeight: 900,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {privacyMode
                          ? "••••"
                          : `₹${summary.totalCurrent.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`}
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
                        background: PIE_COLOR_BY_NAME[d.name] || PIE_COLORS[i % PIE_COLORS.length],
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
                        <Money value={d.value} variant="full" /> &bull; {pct}%
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
        Generated on {formattedDate} &bull; ArthaDrishti by Anand Mohta
      </div>
    </div>
  );
};
