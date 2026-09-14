/* eslint-disable */
import React, { useState, useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import {
  Printer,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
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
  Landmark,
  Layers,
  PieChart as PieIcon,
  Calendar,
  Sparkles,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Maximize2,
  Minimize2,
  SlidersHorizontal,
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
import { StatCard } from "../ui/StatCard";

/* ── Print-friendly layout ─────────────────────────────────────────── */
const printStyles = `
@media print {
  body * {
    visibility: hidden;
  }
  .investment-statement,
  .investment-statement * {
    visibility: visible;
  }
  .investment-statement {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    padding: 0 !important;
    background: #fff !important;
    color: #000 !important;
  }
  .no-print {
    display: none !important;
  }
  .print-only-header {
    display: flex !important;
    justify-content: space-between;
    align-items: center;
    border-bottom: 2px solid #333;
    padding-bottom: 16px;
    margin-bottom: 24px;
  }
  .print-card {
    border: 1px solid #ccc !important;
    box-shadow: none !important;
    page-break-inside: avoid;
    margin-bottom: 16px;
    background: transparent !important;
  }
  .print-break-inside-avoid {
    page-break-inside: avoid;
  }
}
`;

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
  padding: "12px 16px",
  fontWeight: 700,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: THEME.muted,
  borderBottom: `1.5px solid ${THEME.line}`,
  background: "color-mix(in srgb, var(--surface-1) 60%, transparent)",
  whiteSpace: "nowrap",
};

const thRight: React.CSSProperties = { ...th, textAlign: "right" };

const td: React.CSSProperties = {
  padding: "12px 16px",
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

/* ── Real-estate ownership share helpers ───────────────────────────── */
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
        background: "color-mix(in srgb, var(--surface-0) 90%, transparent)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: `1.5px solid ${THEME.line}`,
        borderRadius: 12,
        padding: "10px 14px",
        boxShadow: "0 10px 32px rgba(0, 0, 0, 0.12)",
        fontSize: 12,
      }}
    >
      {visible.map((p: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 10,
              height: 10,
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
  totalValue,
  gain,
  accentColor = THEME.accent,
  expanded,
  onToggle,
}: {
  icon: any;
  title: string;
  count: number;
  totalValue?: number;
  gain?: number;
  accentColor?: string;
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
      borderLeft: `4px solid ${accentColor}`,
      borderRadius: 14,
      transition: "all 0.2s ease",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: accentColor,
        }}
      >
        <Icon size={18} />
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
      </div>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      {totalValue !== undefined && (
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
            <Money value={totalValue} variant="full" />
          </div>
          {gain !== undefined && gain !== 0 && (
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: plColor(gain),
              }}
            >
              {plSign(gain)}
              <Money value={gain} variant="compact" />
            </div>
          )}
        </div>
      )}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "var(--surface-1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: THEME.muted,
        }}
      >
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </div>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════════════════════
   INVESTMENT STATEMENT TAB
   ══════════════════════════════════════════════════════════════════════ */
export const InvestmentStatementTab = ({
  state,
  metrics = {},
  marketData = {},
  activeProfile,
}: {
  state: any;
  metrics?: any;
  marketData?: any;
  activeProfile?: string;
}) => {
  const { privacyMode } = usePrivacy();

  // Navigation views: "statement" | "allocation" | "maturity" | "holdings"
  const [activeView, setActiveView] = useState<"statement" | "allocation" | "maturity" | "holdings">(
    "statement"
  );

  // Category filter
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("all");

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    stocks: true,
    mf: true,
    fd: true,
    rd: true,
    bonds: true,
    ppf: true,
    nps: true,
    epf: true,
    govtschemes: true,
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

  const expandAllSections = () => {
    setExpandedSections({
      stocks: true,
      mf: true,
      fd: true,
      rd: true,
      bonds: true,
      ppf: true,
      nps: true,
      epf: true,
      govtschemes: true,
      gold: true,
      realestate: true,
      insurance: true,
    });
  };

  const collapseAllSections = () => {
    setExpandedSections({
      stocks: false,
      mf: false,
      fd: false,
      rd: false,
      bonds: false,
      ppf: false,
      nps: false,
      epf: false,
      govtschemes: false,
      gold: false,
      realestate: false,
      insurance: false,
    });
  };

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
    const govtSchemes = state.govtSchemes || [];
    const filteredGovt =
      activeProfile && activeProfile !== "all"
        ? govtSchemes.filter((g: any) => g.owner === activeProfile)
        : govtSchemes;
    const govtInvested = filteredGovt.reduce(
      (s: number, g: any) => s + (Number(g.contributionAmount) || Number(g.currentBalance) || 0),
      0
    );
    const govtCurrent = filteredGovt.reduce(
      (s: number, g: any) => s + (Number(g.currentBalance) || 0),
      0
    );
    const govtAvgRate =
      govtCurrent > 0
        ? filteredGovt.reduce(
            (s: number, g: any) =>
              s + (Number(g.interestRate) || 0) * (Number(g.currentBalance) || 0),
            0
          ) / govtCurrent
        : 0;

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
        category: "Equity",
        label: "Equity - Stocks",
        invested: stockInvested,
        current: stockCurrent,
        gain: stockCurrent - stockInvested,
        rate: stockCAGR,
        rateLabel: stockCAGR != null ? `${stockCAGR.toFixed(1)}%` : "--",
        color: THEME.accent,
      },
      {
        category: "Equity",
        label: "Equity - Mutual Funds",
        invested: eqMFInvested,
        current: eqMFCurrent,
        gain: eqMFCurrent - eqMFInvested,
        rate: eqMFCAGR,
        rateLabel: eqMFCAGR != null ? `${eqMFCAGR.toFixed(1)}%` : "--",
        color: "#6366f1",
      },
      {
        category: "Debt",
        label: "Debt - Fixed Deposits",
        invested: fdInvested,
        current: fdCurrent,
        gain: fdCurrent - fdInvested,
        rate: fdAvgRate,
        rateLabel: fdAvgRate > 0 ? `${fdAvgRate.toFixed(1)}%` : "--",
        color: THEME.gold,
      },
      {
        category: "Debt",
        label: "Debt - Recurring Deposits",
        invested: rdInvested,
        current: rdCurr,
        gain: rdCurr - rdInvested,
        rate: rdAvgRate,
        rateLabel: rdAvgRate > 0 ? `${rdAvgRate.toFixed(1)}%` : "--",
        color: "#f59e0b",
      },
      {
        category: "Debt",
        label: "Debt - Bonds",
        invested: bondInvested,
        current: bondCurrent,
        gain: bondCurrent - bondInvested,
        rate: bondAvgYTM,
        rateLabel: bondAvgYTM > 0 ? `${bondAvgYTM.toFixed(1)}%` : "--",
        color: "#10b981",
      },
      {
        category: "Debt",
        label: "Debt - Mutual Funds",
        invested: debtMFInvested,
        current: debtMFCurrent,
        gain: debtMFCurrent - debtMFInvested,
        rate: debtMFCAGR,
        rateLabel: debtMFCAGR != null ? `${debtMFCAGR.toFixed(1)}%` : "--",
        color: "#14b8a6",
      },
      {
        category: "Retirement",
        label: "PPF",
        invested: ppfDeposited,
        current: ppfBalance,
        gain: ppfBalance - ppfDeposited,
        rate: 7.1,
        rateLabel: "7.1%",
        color: THEME.pink,
      },
      {
        category: "Retirement",
        label: "NPS",
        invested: npsContributions,
        current: npsBalance,
        gain: npsBalance - npsContributions,
        rate: npsCAGR,
        rateLabel: npsCAGR != null ? `${npsCAGR.toFixed(1)}%` : "--",
        color: "#8b5cf6",
      },
      {
        category: "Retirement",
        label: "EPF",
        invested: epfContributions,
        current: epfBalance,
        gain: epfBalance - epfContributions,
        rate: 8.15,
        rateLabel: "8.15%",
        color: "#a855f7",
      },
      {
        category: "Insurance",
        label: "LIC / Insurance Plans",
        invested: insurancePremiums,
        current: insuranceValue,
        gain: insuranceValue - insurancePremiums,
        rate: null,
        rateLabel: "--",
        color: "#f43f5e",
      },
      {
        category: "Govt Schemes",
        label: "Govt Savings & Schemes",
        invested: govtInvested,
        current: govtCurrent,
        gain: govtCurrent - govtInvested,
        rate: govtAvgRate > 0 ? govtAvgRate : null,
        rateLabel: govtAvgRate > 0 ? `${govtAvgRate.toFixed(1)}%` : "--",
        color: "#0284c7",
      },
      {
        category: "Gold",
        label: "Gold & SGBs",
        invested: goldInvested,
        current: goldCurrent,
        gain: goldCurrent - goldInvested,
        rate: goldCAGR,
        rateLabel: goldCAGR != null ? `${goldCAGR.toFixed(1)}%` : "--",
        color: THEME.violet,
      },
      {
        category: "Real Estate",
        label: "Real Estate",
        invested: reInvested,
        current: reCurrent,
        gain: reCurrent - reInvested,
        rate: reCAGR,
        rateLabel: reCAGR != null ? `${reCAGR.toFixed(1)}%` : "--",
        color: "#059669",
      },
    ];

    const totalInvested = rows.reduce((s, r) => s + r.invested, 0);
    const totalCurrent = rows.reduce((s, r) => s + r.current, 0);
    const totalGain = totalCurrent - totalInvested;
    const gainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

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

    /* ── Pie chart data ─────────────────────────────────────────────── */
    const equityTotal = stockCurrent + eqMFCurrent;
    const debtTotal = fdCurrent + rdCurr + bondCurrent + debtMFCurrent + govtCurrent;
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

    // Guaranteed / Fixed Income total
    const fixedIncomeTotal = fdCurrent + rdCurr + bondCurrent + ppfBalance + epfBalance + govtCurrent;
    const fixedIncomeShare = totalCurrent > 0 ? (fixedIncomeTotal / totalCurrent) * 100 : 0;

    // Dominant asset class
    const dominantSlice = [...pieData].sort((a, b) => b.value - a.value)[0] || {
      name: "None",
      value: 0,
    };
    const dominantPct = totalCurrent > 0 ? (dominantSlice.value / totalCurrent) * 100 : 0;

    // Liquidity breakdown
    const liquidTotal = stockCurrent + eqMFCurrent + debtMFCurrent;
    const semiLiquidTotal = fdCurrent + rdCurr + bondCurrent + govtCurrent + goldCurrent;
    const illiquidTotal = realEstateTotal + ppfBalance + npsBalance + epfBalance + insuranceTotal;

    return {
      rows: rowsWithAlloc,
      totalInvested,
      totalCurrent,
      totalGain,
      gainPct,
      weightedCAGR,
      pieData,
      equityTotal,
      debtTotal,
      goldTotal,
      retirementTotal,
      insuranceTotal,
      realEstateTotal,
      fixedIncomeTotal,
      fixedIncomeShare,
      dominantSlice,
      dominantPct,
      liquidTotal,
      semiLiquidTotal,
      illiquidTotal,
    };
  }, [state, marketData, activeProfile]);

  /* ── Animated hero figure ────────────────────────────────────────── */
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

  /* ── Real estate properties held ─────────────────────────────────── */
  const realEstateActiveProperties = useMemo(
    () => (state.realEstateProperties || []).filter((p: any) => p.status !== "sold"),
    [state.realEstateProperties]
  );

  /* ── Upcoming Maturities Radar ────────────────────────────────────── */
  const maturitySchedule = useMemo(() => {
    const items: Array<{
      id: string;
      category: string;
      title: string;
      institution: string;
      principal: number;
      maturityAmount: number;
      maturityDate: string;
      dtm: number | null;
      status: "urgent" | "near" | "medium" | "far" | "matured" | "active";
    }> = [];

    // FDs
    (state.fixedDeposits || []).forEach((fd: any) => {
      const principal = Number(fd.principal) || 0;
      const rate = Number(fd.rate) || 0;
      const years = Number(fd.years) || 0;
      const matAmount = fdMaturity(principal, rate, years);
      const dtm = daysToMaturity(fd.maturityDate);
      let status: any = "active";
      if (dtm !== null) {
        if (dtm === 0) status = "matured";
        else if (dtm <= 30) status = "urgent";
        else if (dtm <= 90) status = "near";
        else if (dtm <= 365) status = "medium";
        else status = "far";
      }
      items.push({
        id: `fd_${fd.id}`,
        category: "Fixed Deposit",
        title: fd.bank || "FD",
        institution: fd.bank || "--",
        principal,
        maturityAmount: matAmount,
        maturityDate: fd.maturityDate || "--",
        dtm,
        status,
      });
    });

    // Bonds
    (state.bonds || []).forEach((b: any) => {
      const principal =
        Number(b.totalInvestmentAmount || b.totalPrincipalAmount || b.faceValue) || 0;
      const dtm = daysToMaturity(b.maturityDate);
      let status: any = "active";
      if (dtm !== null) {
        if (dtm === 0) status = "matured";
        else if (dtm <= 30) status = "urgent";
        else if (dtm <= 90) status = "near";
        else if (dtm <= 365) status = "medium";
        else status = "far";
      }
      items.push({
        id: `bond_${b.id}`,
        category: "Bond",
        title: b.name || "Bond",
        institution: b.name || "--",
        principal,
        maturityAmount: principal,
        maturityDate: b.maturityDate || "--",
        dtm,
        status,
      });
    });

    // LIC Policies
    (state.lic || []).forEach((l: any) => {
      if (l.maturityDate) {
        const dtm = daysToMaturity(l.maturityDate);
        let status: any = "active";
        if (dtm !== null) {
          if (dtm === 0) status = "matured";
          else if (dtm <= 30) status = "urgent";
          else if (dtm <= 90) status = "near";
          else if (dtm <= 365) status = "medium";
          else status = "far";
        }
        items.push({
          id: `lic_${l.id}`,
          category: "Insurance Policy",
          title: l.planName || "LIC Policy",
          institution: "LIC",
          principal: Number(l.premiumPaid || 0),
          maturityAmount: Number(l.sumAssured || 0),
          maturityDate: l.maturityDate,
          dtm,
          status,
        });
      }
    });

    // Sort by DTM ascending (matured or closest first)
    return items.sort((a, b) => {
      if (a.dtm === null) return 1;
      if (b.dtm === null) return -1;
      return a.dtm - b.dtm;
    });
  }, [state.fixedDeposits, state.bonds, state.lic]);

  /* ── All Granular Holdings Flat List ──────────────────────────────── */
  const allHoldingsList = useMemo(() => {
    const list: Array<{
      id: string;
      category: string;
      name: string;
      identifier: string;
      issuer: string;
      invested: number;
      currentValue: number;
      gain: number;
      gainPct: number;
      rateLabel: string;
    }> = [];

    // Stocks
    stockGroups.forEach((g) => {
      const totalQty = g.lots.reduce((s: number, l: any) => s + (Number(l.qty) || 0), 0);
      const totalInvested = g.lots.reduce(
        (s: number, l: any) => s + (Number(l.qty) || 0) * (Number(l.avgPrice) || 0),
        0
      );
      const livePrice = getStockPrice(g.lots[0]);
      const currentValue = totalQty * livePrice;
      const gain = currentValue - totalInvested;
      const gainPct = totalInvested > 0 ? (gain / totalInvested) * 100 : 0;
      list.push({
        id: `stock_${g.yfSym}`,
        category: "Equity Stocks",
        name: g.base,
        identifier: g.exchange,
        issuer: marketData?.[g.yfSym]?.sector || "Equity",
        invested: totalInvested,
        currentValue,
        gain,
        gainPct,
        rateLabel: fmtPct(gainPct),
      });
    });

    // Mutual Funds
    (state.mutualFunds || []).forEach((mf: any) => {
      const units = Number(mf.units) || 0;
      const buyNav = Number(mf.buyNav) || 0;
      const currentNav = Number(mf.currentNav) || 0;
      const invested = Number(mf.invested || mf.investedValue) || units * buyNav || 0;
      const currentValue = units * currentNav || invested;
      const gain = currentValue - invested;
      const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
      list.push({
        id: `mf_${mf.id}`,
        category: "Mutual Funds",
        name: mf.schemeName || mf.name || "Mutual Fund",
        identifier: mf.folioNumber || mf.category || "--",
        issuer: mf.category || "MF",
        invested,
        currentValue,
        gain,
        gainPct,
        rateLabel: fmtPct(gainPct),
      });
    });

    // FDs
    (state.fixedDeposits || []).forEach((fd: any) => {
      const principal = Number(fd.principal) || 0;
      const current = fdCurrentValue(fd);
      const rate = Number(fd.rate) || 0;
      list.push({
        id: `fd_${fd.id}`,
        category: "Fixed Deposits",
        name: `${fd.bank || "FD"} ${rate}%`,
        identifier: fd.maturityDate ? `Mat: ${fd.maturityDate}` : "--",
        issuer: fd.bank || "Bank",
        invested: principal,
        currentValue: current,
        gain: current - principal,
        gainPct: principal > 0 ? ((current - principal) / principal) * 100 : 0,
        rateLabel: `${rate}%`,
      });
    });

    // Bonds
    (state.bonds || []).forEach((b: any) => {
      const principal =
        Number(b.totalInvestmentAmount || b.totalPrincipalAmount || b.faceValue) || 0;
      const current = bondCurrentValue(b);
      const rate = Number(b.ytmRate || b.coupon) || 0;
      list.push({
        id: `bond_${b.id}`,
        category: "Bonds",
        name: b.name || "Bond",
        identifier: b.maturityDate || "--",
        issuer: "Bond Issuer",
        invested: principal,
        currentValue: current,
        gain: current - principal,
        gainPct: principal > 0 ? ((current - principal) / principal) * 100 : 0,
        rateLabel: rate > 0 ? `${rate}%` : "--",
      });
    });

    // Gold
    (state.goldHoldings || []).forEach((h: any) => {
      const grams = Number(h.grams) || 0;
      const purchasePrice = Number(h.purchasePrice) || 0;
      const purityMul = h.type === "physical" ? GOLD_PURITY_FACTOR[h.purity] || 1 : 1;
      const currentValue = grams * getGoldPricePerGram(state) * purityMul;
      const invested = purchasePrice > 0 ? purchasePrice : currentValue;
      const gain = currentValue - invested;
      const gainPct = invested > 0 ? (gain / invested) * 100 : 0;
      list.push({
        id: `gold_${h.id}`,
        category: "Gold & SGBs",
        name: h.name || "Gold Holding",
        identifier: `${grams.toFixed(2)}g (${h.type || "Gold"})`,
        issuer: h.type === "sgb" ? "RBI" : "Precious Metal",
        invested,
        currentValue,
        gain,
        gainPct,
        rateLabel: fmtPct(gainPct),
      });
    });

    // Real Estate
    realEstateActiveProperties.forEach((p: any) => {
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
      list.push({
        id: `re_${p.id}`,
        category: "Real Estate",
        name: p.name || "Property",
        identifier: `${(share * 100).toFixed(0)}% share`,
        issuer: p.location || "Real Estate",
        invested,
        currentValue,
        gain,
        gainPct,
        rateLabel: fmtPct(gainPct),
      });
    });

    return list;
  }, [state, stockGroups, realEstateActiveProperties, marketData, activeProfile]);

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
      (state.govtSchemes?.length || 0) +
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

  const handleExportSummaryCSV = () => {
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
      `investment-statement-summary_${todayStr}.csv`
    );
  };

  const handleExportDetailedCSV = () => {
    const exportRows = allHoldingsList.map((h) => ({
      category: h.category,
      name: h.name,
      identifier: h.identifier,
      issuer: h.issuer,
      invested: Math.round(h.invested),
      currentValue: Math.round(h.currentValue),
      gain: Math.round(h.gain),
      returnRate: h.rateLabel,
    }));
    exportArrayToCSV(
      exportRows,
      [
        { key: "category", label: "Category" },
        { key: "name", label: "Holding Name" },
        { key: "identifier", label: "ID / Details" },
        { key: "issuer", label: "Issuer / Sector" },
        { key: "invested", label: "Invested (₹)" },
        { key: "currentValue", label: "Current Value (₹)" },
        { key: "gain", label: "Gain / Loss (₹)" },
        { key: "returnRate", label: "Return %" },
      ],
      `investment-statement-holdings_${todayStr}.csv`
    );
  };

  return (
    <div
      className="investment-statement"
      style={{ padding: "24px 0", display: "flex", flexDirection: "column", gap: 24 }}
    >
      <style>{printStyles}</style>

      {/* ── Print Cover Header ────────────────────────────────────────── */}
      <div className="print-only-header" style={{ display: "none" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#111" }}>
            ArthaDrishti Consolidated Investment Statement
          </h1>
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
            Confidential Wealth Portfolio Statement &bull; As of {formattedDate}
          </div>
        </div>
        <img src="/logo-horizontal.png" alt="ArthaDrishti" style={{ height: 40, width: "auto" }} />
      </div>

      {/* ── 1. Statement Header & Navigation ─────────────────────────── */}
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <SectionTitle sub={`Consolidated wealth intelligence as of ${formattedDate}`}>
            Consolidated Investment Statement
          </SectionTitle>
        </div>

        {/* Global Toolbar */}
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
              placeholder="Search all holdings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: 220,
                padding: `8px ${searchQuery ? 32 : 12}px 8px 34px`,
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
            onClick={handleExportSummaryCSV}
            title="Download Asset Class Summary CSV"
          >
            Summary CSV
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={14} />}
            onClick={handleExportDetailedCSV}
            title="Download All Granular Line-Items CSV"
          >
            Holdings CSV
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

      {/* ── 2. Executive Hero Stat Cards ─────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {/* Main Hero Card */}
        <Card
          className="print-card"
          variant="base"
          style={{
            gridColumn: "1 / -1",
            padding: "clamp(20px, 3vw, 28px)",
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--surface-0) 92%, var(--t-accent) 8%), var(--surface-0))",
            border: `1px solid ${THEME.line}`,
            borderTop: `4px solid ${THEME.accent}`,
            borderRadius: "var(--radius-xl)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.04)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: THEME.muted,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Sparkles size={14} color={THEME.accent} />
              Total Portfolio Value
            </div>
            {summary.weightedCAGR != null && (
              <Badge variant="accent" style={{ fontSize: 11, padding: "4px 10px", borderRadius: 8 }}>
                Weighted CAGR: {summary.weightedCAGR.toFixed(1)}%
              </Badge>
            )}
          </div>

          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(34px, 4.5vw, 52px)",
              fontWeight: 900,
              color: THEME.ink,
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
              color: THEME.muted,
              marginTop: 4,
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 16,
              fontWeight: 600,
            }}
          >
            <span>
              Invested <Money value={summary.totalInvested} variant="full" />
            </span>
            <span
              style={{
                color: plColor(summary.totalGain),
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              {summary.totalGain >= 0 ? (
                <TrendingUp size={14} color={THEME.sage} />
              ) : (
                <TrendingDown size={14} color={THEME.rust} />
              )}
              {plSign(summary.totalGain)}
              <Money value={summary.totalGain} variant="full" /> ({fmtPct(summary.gainPct)})
            </span>
            <span style={{ color: THEME.muted }}>
              &bull; {allHoldingsList.length} total active holdings
            </span>
          </div>
        </Card>

        {/* Sub-KPI Card 1: Unrealized Gains */}
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Total Unrealized Gain"
          value={fmtINR(summary.totalGain)}
          numericValue={summary.totalGain}
          formatValue={fmtINR}
          valueColor={summary.totalGain >= 0 ? THEME.sage : THEME.rust}
          sub={`${fmtPct(summary.gainPct)} overall return`}
          color={summary.totalGain >= 0 ? THEME.sage : THEME.rust}
        />

        {/* Sub-KPI Card 2: Safe & Guaranteed Income */}
        <StatCard
          icon={<Shield size={18} />}
          label="Guaranteed & Fixed Income"
          value={fmtINR(summary.fixedIncomeTotal)}
          numericValue={summary.fixedIncomeTotal}
          formatValue={fmtINR}
          sub={`${summary.fixedIncomeShare.toFixed(1)}% of total wealth`}
          color={THEME.gold}
        />

        {/* Sub-KPI Card 3: Dominant Asset Class */}
        <StatCard
          icon={<BarChart3 size={18} />}
          label="Dominant Asset Class"
          value={summary.dominantSlice.name}
          maskInPrivacyMode={false}
          sub={`${summary.dominantPct.toFixed(1)}% (${fmtINR(summary.dominantSlice.value)})`}
          color={THEME.accent}
        />

        {/* Sub-KPI Card 4: Liquid Capital */}
        <StatCard
          icon={<Coins size={18} />}
          label="Liquid Growth Assets"
          value={fmtINR(summary.liquidTotal)}
          numericValue={summary.liquidTotal}
          formatValue={fmtINR}
          sub={`${summary.totalCurrent > 0 ? ((summary.liquidTotal / summary.totalCurrent) * 100).toFixed(1) : 0}% stocks & funds`}
          color="#0284c7"
        />
      </div>

      {/* ── 3. View Switcher Tabs & Category Filter ──────────────────── */}
      <div
        className="no-print"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "6px 8px",
          background: "var(--surface-0)",
          border: `1.5px solid ${THEME.line}`,
          borderRadius: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setActiveView("statement")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background:
                activeView === "statement"
                  ? THEME.accent
                  : "transparent",
              color: activeView === "statement" ? "#fff" : THEME.muted,
              transition: "all 0.15s ease",
            }}
          >
            <Layers size={15} />
            Consolidated Statement
          </button>

          <button
            type="button"
            onClick={() => setActiveView("allocation")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background:
                activeView === "allocation"
                  ? THEME.accent
                  : "transparent",
              color: activeView === "allocation" ? "#fff" : THEME.muted,
              transition: "all 0.15s ease",
            }}
          >
            <PieIcon size={15} />
            Asset Allocation
          </button>

          <button
            type="button"
            onClick={() => setActiveView("maturity")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background:
                activeView === "maturity"
                  ? THEME.accent
                  : "transparent",
              color: activeView === "maturity" ? "#fff" : THEME.muted,
              transition: "all 0.15s ease",
            }}
          >
            <Calendar size={15} />
            Maturity Radar ({maturitySchedule.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveView("holdings")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              background:
                activeView === "holdings"
                  ? THEME.accent
                  : "transparent",
              color: activeView === "holdings" ? "#fff" : THEME.muted,
              transition: "all 0.15s ease",
            }}
          >
            <SlidersHorizontal size={15} />
            All Holdings ({allHoldingsList.length})
          </button>
        </div>

        {activeView === "statement" && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Button
              variant="secondary"
              size="sm"
              icon={<Maximize2 size={12} />}
              onClick={expandAllSections}
              title="Expand all sections"
            >
              Expand All
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<Minimize2 size={12} />}
              onClick={collapseAllSections}
              title="Collapse all sections"
            >
              Collapse All
            </Button>
          </div>
        )}
      </div>

      {searchQuery && (
        <div style={{ fontSize: 12, color: THEME.muted, marginTop: -12 }} className="no-print">
          Filtering holdings across tables by "<strong>{searchQuery}</strong>" &bull; Summary totals represent full portfolio.
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          VIEW 1: CONSOLIDATED STATEMENT
          ══════════════════════════════════════════════════════════════ */}
      {(activeView === "statement" || typeof window === "undefined") && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* ── Portfolio Summary Table ─────────────────────────────── */}
          <Card className="print-card" style={{ padding: 0, overflow: "hidden" }}>
            <div
              style={{
                padding: "16px 20px",
                borderBottom: `1px solid ${THEME.line}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: THEME.ink }}>
                  Asset Class Summary Breakdown
                </h3>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                  Consolidated allocation and CAGR by financial instrument category
                </div>
              </div>
              <Badge variant="accent" style={{ fontSize: 11, padding: "3px 8px" }}>
                13 Categories Tracked
              </Badge>
            </div>
            <div style={tableWrap}>
              <table style={tbl}>
                <thead>
                  <tr>
                    <th style={{ ...th, paddingLeft: 20 }}>Asset Class</th>
                    <th style={thRight}>Invested</th>
                    <th style={thRight}>Current Value</th>
                    <th style={thRight}>Gain / Loss</th>
                    <th style={thRight}>CAGR</th>
                    <th style={{ ...thRight, paddingRight: 20 }}>Allocation %</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.rows.map((row) =>
                    row.invested === 0 && row.current === 0 ? null : (
                      <tr key={row.label} className="table-row-hover">
                        <td
                          style={{
                            ...td,
                            paddingLeft: 20,
                            fontWeight: 700,
                            color: THEME.ink,
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 3,
                              background: row.color || THEME.accent,
                              display: "inline-block",
                            }}
                          />
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
                        <td style={{ ...tdRight, paddingRight: 20, fontWeight: 700 }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <div
                              style={{
                                width: 48,
                                height: 5,
                                borderRadius: 3,
                                background: "var(--surface-2)",
                                overflow: "hidden",
                                display: "inline-block",
                              }}
                            >
                              <div
                                style={{
                                  width: `${Math.min(100, row.allocation)}%`,
                                  height: "100%",
                                  background: row.color || THEME.accent,
                                  borderRadius: 3,
                                }}
                              />
                            </div>
                            <span>{row.allocation.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                  {/* Total Row */}
                  <tr
                    style={{
                      background: "color-mix(in srgb, var(--surface-1) 80%, transparent)",
                      borderTop: `2px solid ${THEME.line}`,
                    }}
                  >
                    <td style={{ ...tdBold, paddingLeft: 20 }}>Total</td>
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
                    <td style={{ ...tdBoldRight, paddingRight: 20 }}>100%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* ── Category Detail Sections ─────────────────────────────── */}

          {/* 3. Equity Stocks */}
          {stockGroups.length > 0 && (
            <div className="print-break-inside-avoid" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SectionHeader
                icon={TrendingUp}
                title="Equity Stocks"
                count={stockGroups.length}
                totalValue={stockGroups.reduce(
                  (s, g) =>
                    s +
                    g.lots.reduce((ss: number, l: any) => ss + (Number(l.qty) || 0), 0) *
                      getStockPrice(g.lots[0]),
                  0
                )}
                accentColor={THEME.accent}
                expanded={!!expandedSections.stocks}
                onToggle={() => toggleSection("stocks")}
              />
              {expandedSections.stocks && (
                <Card className="print-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={tableWrap}>
                    <table style={{ ...tbl, minWidth: 820 }}>
                      <thead>
                        <tr>
                          <th style={{ ...th, paddingLeft: 20 }}>Symbol</th>
                          <th style={th}>Exchange</th>
                          <th style={thRight}>Qty</th>
                          <th style={thRight}>Avg Price</th>
                          <th style={thRight}>Current Price</th>
                          <th style={thRight}>Current Value</th>
                          <th style={thRight}>P&L</th>
                          <th style={thRight}>P&L %</th>
                          <th style={{ ...th, paddingRight: 20 }}>Sector</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockGroups
                          .filter((g) => matchesSearch(g.base))
                          .map((g) => {
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
                            const livePrice = getStockPrice(g.lots[0]);
                            const currentValue = totalQty * livePrice;
                            const pl = currentValue - totalInvested;
                            const plPct = totalInvested > 0 ? (pl / totalInvested) * 100 : 0;
                            const sector = marketData?.[g.yfSym]?.sector || "--";

                            return (
                              <tr key={g.yfSym} className="table-row-hover">
                                <td
                                  style={{
                                    ...td,
                                    paddingLeft: 20,
                                    fontWeight: 700,
                                    color: THEME.ink,
                                  }}
                                >
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
                                    paddingRight: 20,
                                    fontSize: 12,
                                    color: THEME.muted,
                                    maxWidth: 130,
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

          {/* 4. Mutual Funds */}
          {(state.mutualFunds?.length || 0) > 0 && (
            <div className="print-break-inside-avoid" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SectionHeader
                icon={BarChart3}
                title="Mutual Funds"
                count={state.mutualFunds.length}
                totalValue={state.mutualFunds.reduce(
                  (s: number, m: any) =>
                    s +
                    (Number(m.units || 0) * Number(m.currentNav || 0) ||
                      Number(m.invested || m.investedValue) ||
                      0),
                  0
                )}
                accentColor="#6366f1"
                expanded={!!expandedSections.mf}
                onToggle={() => toggleSection("mf")}
              />
              {expandedSections.mf && (
                <Card className="print-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={tableWrap}>
                    <table style={{ ...tbl, minWidth: 900 }}>
                      <thead>
                        <tr>
                          <th style={{ ...th, paddingLeft: 20 }}>Scheme Name</th>
                          <th style={th}>Category</th>
                          <th style={th}>Folio</th>
                          <th style={thRight}>Units</th>
                          <th style={thRight}>Buy NAV</th>
                          <th style={thRight}>Current NAV</th>
                          <th style={thRight}>Invested</th>
                          <th style={thRight}>Current Value</th>
                          <th style={thRight}>P&L</th>
                          <th style={{ ...thRight, paddingRight: 20 }}>P&L %</th>
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
                              <tr key={mf.id} className="table-row-hover">
                                <td
                                  style={{
                                    ...td,
                                    paddingLeft: 20,
                                    fontWeight: 700,
                                    color: THEME.ink,
                                    maxWidth: 240,
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
                                    paddingRight: 20,
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

          {/* 5. Fixed Deposits */}
          {(state.fixedDeposits?.length || 0) > 0 && (
            <div className="print-break-inside-avoid" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SectionHeader
                icon={Coins}
                title="Fixed Deposits"
                count={state.fixedDeposits.length}
                totalValue={state.fixedDeposits.reduce(
                  (s: number, x: any) => s + fdCurrentValue(x),
                  0
                )}
                accentColor={THEME.gold}
                expanded={!!expandedSections.fd}
                onToggle={() => toggleSection("fd")}
              />
              {expandedSections.fd && (
                <Card className="print-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={tableWrap}>
                    <table style={tbl}>
                      <thead>
                        <tr>
                          <th style={{ ...th, paddingLeft: 20 }}>Bank</th>
                          <th style={thRight}>Principal</th>
                          <th style={thRight}>Rate</th>
                          <th style={th}>Start Date</th>
                          <th style={th}>Maturity Date</th>
                          <th style={thRight}>Maturity Amount</th>
                          <th style={{ ...thRight, paddingRight: 20 }}>Days to Maturity</th>
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
                              <tr key={fd.id} className="table-row-hover">
                                <td
                                  style={{
                                    ...td,
                                    paddingLeft: 20,
                                    fontWeight: 700,
                                    color: THEME.ink,
                                  }}
                                >
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
                                    paddingRight: 20,
                                    fontWeight: 700,
                                    color:
                                      dtm != null && dtm === 0
                                        ? THEME.muted
                                        : dtm != null && dtm <= 30
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

          {/* 6. Recurring Deposits */}
          {(state.recurringDeposits?.length || 0) > 0 && (
            <div className="print-break-inside-avoid" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SectionHeader
                icon={Coins}
                title="Recurring Deposits"
                count={state.recurringDeposits.length}
                totalValue={state.recurringDeposits.reduce(
                  (s: number, x: any) => s + rdCurrentValue(x),
                  0
                )}
                accentColor="#f59e0b"
                expanded={!!expandedSections.rd}
                onToggle={() => toggleSection("rd")}
              />
              {expandedSections.rd && (
                <Card className="print-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={tableWrap}>
                    <table style={tbl}>
                      <thead>
                        <tr>
                          <th style={{ ...th, paddingLeft: 20 }}>Bank</th>
                          <th style={thRight}>Monthly</th>
                          <th style={thRight}>Tenure (months)</th>
                          <th style={thRight}>Rate</th>
                          <th style={{ ...thRight, paddingRight: 20 }}>Maturity Amount</th>
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
                              <tr key={rd.id} className="table-row-hover">
                                <td
                                  style={{
                                    ...td,
                                    paddingLeft: 20,
                                    fontWeight: 700,
                                    color: THEME.ink,
                                  }}
                                >
                                  {rd.bank || "--"}
                                </td>
                                <td style={tdRight}>
                                  <Money value={monthly} variant="full" />
                                </td>
                                <td style={tdRight}>{months || "--"}</td>
                                <td style={tdRight}>{rate > 0 ? `${rate}%` : "--"}</td>
                                <td style={{ ...tdRight, paddingRight: 20, fontWeight: 700 }}>
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

          {/* 7. Bonds */}
          {(state.bonds?.length || 0) > 0 && (
            <div className="print-break-inside-avoid" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SectionHeader
                icon={FileText}
                title="Bonds"
                count={state.bonds.length}
                totalValue={state.bonds.reduce(
                  (s: number, x: any) => s + bondCurrentValue(x),
                  0
                )}
                accentColor="#10b981"
                expanded={!!expandedSections.bonds}
                onToggle={() => toggleSection("bonds")}
              />
              {expandedSections.bonds && (
                <Card className="print-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={tableWrap}>
                    <table style={tbl}>
                      <thead>
                        <tr>
                          <th style={{ ...th, paddingLeft: 20 }}>Name</th>
                          <th style={thRight}>Face Value</th>
                          <th style={thRight}>Coupon</th>
                          <th style={thRight}>YTM</th>
                          <th style={th}>Maturity Date</th>
                          <th style={{ ...thRight, paddingRight: 20 }}>Status / DTM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.bonds
                          .filter((b: any) => matchesSearch(b.name))
                          .map((b: any) => {
                            const faceValue =
                              Number(
                                b.totalInvestmentAmount ||
                                  b.totalPrincipalAmount ||
                                  b.faceValue
                              ) || 0;
                            const coupon = Number(b.coupon) || 0;
                            const ytm = Number(b.ytmRate) || 0;
                            const dtm = daysToMaturity(b.maturityDate);

                            return (
                              <tr key={b.id} className="table-row-hover">
                                <td
                                  style={{
                                    ...td,
                                    paddingLeft: 20,
                                    fontWeight: 700,
                                    color: THEME.ink,
                                  }}
                                >
                                  {b.name || "--"}
                                </td>
                                <td style={{ ...tdRight, fontWeight: 700 }}>
                                  <Money value={faceValue} variant="full" />
                                </td>
                                <td style={tdRight}>{coupon > 0 ? `${coupon}%` : "--"}</td>
                                <td style={tdRight}>{ytm > 0 ? `${ytm}%` : "--"}</td>
                                <td style={td}>{b.maturityDate || "--"}</td>
                                <td
                                  style={{
                                    ...tdRight,
                                    paddingRight: 20,
                                    fontWeight: 700,
                                    color:
                                      dtm != null && dtm === 0
                                        ? THEME.muted
                                        : dtm != null && dtm <= 30
                                        ? THEME.rust
                                        : dtm != null && dtm <= 90
                                        ? THEME.gold
                                        : THEME.sage,
                                  }}
                                >
                                  {dtm != null ? (dtm === 0 ? "Matured" : `${dtm}d left`) : "--"}
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

          {/* 8. PPF */}
          {(state.ppf?.length || 0) > 0 && (
            <div className="print-break-inside-avoid" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SectionHeader
                icon={Shield}
                title="PPF"
                count={state.ppf.length}
                totalValue={state.ppf.reduce((s: number, x: any) => s + (Number(x.balance) || 0), 0)}
                accentColor={THEME.pink}
                expanded={!!expandedSections.ppf}
                onToggle={() => toggleSection("ppf")}
              />
              {expandedSections.ppf && (
                <Card className="print-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={tableWrap}>
                    <table style={tbl}>
                      <thead>
                        <tr>
                          <th style={{ ...th, paddingLeft: 20 }}>Institution</th>
                          <th style={th}>Account #</th>
                          <th style={thRight}>Balance</th>
                          <th style={{ ...thRight, paddingRight: 20 }}>This Year Deposit</th>
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
                              .filter(
                                (t: any) => t.type === "deposit" && t.date && t.date >= fyStart
                              )
                              .reduce((s: number, t: any) => s + (Number(t.amount) || 0), 0);

                            return (
                              <tr key={p.id} className="table-row-hover">
                                <td
                                  style={{
                                    ...td,
                                    paddingLeft: 20,
                                    fontWeight: 700,
                                    color: THEME.ink,
                                  }}
                                >
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
                                    paddingRight: 20,
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

          {/* 9. NPS */}
          {(state.nps?.length || 0) > 0 && (
            <div className="print-break-inside-avoid" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SectionHeader
                icon={Briefcase}
                title="NPS"
                count={state.nps.length}
                totalValue={state.nps.reduce((s: number, x: any) => {
                  const bal = Number(x.balance) || 0;
                  if (bal > 0) return s + bal;
                  return (
                    s +
                    (x.transactions || []).reduce(
                      (ss: number, t: any) =>
                        ss + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
                      0
                    )
                  );
                }, 0)}
                accentColor="#8b5cf6"
                expanded={!!expandedSections.nps}
                onToggle={() => toggleSection("nps")}
              />
              {expandedSections.nps && (
                <Card className="print-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={tableWrap}>
                    <table style={tbl}>
                      <thead>
                        <tr>
                          <th style={{ ...th, paddingLeft: 20 }}>Fund Manager</th>
                          <th style={th}>PRAN</th>
                          <th style={th}>Tier</th>
                          <th style={{ ...thRight, paddingRight: 20 }}>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.nps
                          .filter((n: any) => matchesSearch(n.fundManager))
                          .map((n: any) => (
                            <tr key={n.id} className="table-row-hover">
                              <td
                                style={{
                                  ...td,
                                  paddingLeft: 20,
                                  fontWeight: 700,
                                  color: THEME.ink,
                                }}
                              >
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
                              <td style={{ ...tdRight, paddingRight: 20, fontWeight: 700 }}>
                                <Money
                                  value={(() => {
                                    const bal = Number(n.balance) || 0;
                                    if (bal > 0) return bal;
                                    return (n.transactions || []).reduce(
                                      (ss: number, t: any) =>
                                        ss +
                                        (Number(t.employeeAmount) || 0) +
                                        (Number(t.employerAmount) || 0),
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

          {/* 10. EPF */}
          {(state.epf?.length || 0) > 0 && (
            <div className="print-break-inside-avoid" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SectionHeader
                icon={Shield}
                title="EPF"
                count={state.epf.length}
                totalValue={state.epf.reduce(
                  (s: number, x: any) => s + calculateEpfBalance(x),
                  0
                )}
                accentColor="#a855f7"
                expanded={!!expandedSections.epf}
                onToggle={() => toggleSection("epf")}
              />
              {expandedSections.epf && (
                <Card className="print-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={tableWrap}>
                    <table style={tbl}>
                      <thead>
                        <tr>
                          <th style={{ ...th, paddingLeft: 20 }}>Employer</th>
                          <th style={th}>UAN</th>
                          <th style={{ ...thRight, paddingRight: 20 }}>Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {state.epf
                          .filter((e: any) => matchesSearch(e.employer))
                          .map((e: any) => (
                            <tr key={e.id} className="table-row-hover">
                              <td
                                style={{
                                  ...td,
                                  paddingLeft: 20,
                                  fontWeight: 700,
                                  color: THEME.ink,
                                }}
                              >
                                {e.employer || "--"}
                              </td>
                              <td style={{ ...td, fontSize: 12, color: THEME.muted }}>
                                {e.uan || "--"}
                              </td>
                              <td style={{ ...tdRight, paddingRight: 20, fontWeight: 700 }}>
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

          {/* 11. Govt Savings & Schemes */}
          {(state.govtSchemes?.length || 0) > 0 && (
            <div className="print-break-inside-avoid" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SectionHeader
                icon={Landmark}
                title="Govt Savings & Schemes"
                count={state.govtSchemes.length}
                totalValue={state.govtSchemes.reduce(
                  (s: number, g: any) => s + (Number(g.currentBalance) || 0),
                  0
                )}
                accentColor="#0284c7"
                expanded={!!expandedSections.govtschemes}
                onToggle={() => toggleSection("govtschemes")}
              />
              {expandedSections.govtschemes && (
                <Card className="print-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={tableWrap}>
                    <table style={{ ...tbl, minWidth: 720 }}>
                      <thead>
                        <tr>
                          <th style={{ ...th, paddingLeft: 20 }}>Scheme</th>
                          <th style={th}>Type</th>
                          <th style={th}>Account / Member</th>
                          <th style={thRight}>Interest Rate</th>
                          <th style={thRight}>Invested</th>
                          <th style={{ ...thRight, paddingRight: 20 }}>Current Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(state.govtSchemes || [])
                          .filter((g: any) =>
                            matchesSearch(g.schemeName || g.schemeType || g.memberName)
                          )
                          .map((g: any) => {
                            const invested =
                              Number(g.contributionAmount) || Number(g.currentBalance) || 0;
                            const current = Number(g.currentBalance) || 0;
                            const rate = Number(g.interestRate) || 0;
                            return (
                              <tr key={g.id} className="table-row-hover">
                                <td
                                  style={{
                                    ...td,
                                    paddingLeft: 20,
                                    fontWeight: 700,
                                    color: THEME.ink,
                                  }}
                                >
                                  {g.schemeName || g.schemeType || "--"}
                                </td>
                                <td style={td}>
                                  <Badge
                                    variant="sage"
                                    style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6 }}
                                  >
                                    {g.schemeType || "Scheme"}
                                  </Badge>
                                </td>
                                <td style={{ ...td, fontSize: 12, color: THEME.muted }}>
                                  {g.memberName || g.accountNumber || "--"}
                                </td>
                                <td style={tdRight}>
                                  {rate > 0 ? `${rate.toFixed(1)}%` : "--"}
                                </td>
                                <td style={tdRight}>
                                  <Money value={invested} variant="full" />
                                </td>
                                <td
                                  style={{
                                    ...tdRight,
                                    paddingRight: 20,
                                    fontWeight: 700,
                                  }}
                                >
                                  <Money value={current} variant="full" />
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

          {/* 12. LIC & Insurance */}
          {(state.lic?.length || 0) + (state.investmentPlans?.length || 0) > 0 && (
            <div className="print-break-inside-avoid" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SectionHeader
                icon={Heart}
                title="LIC / Insurance Plans"
                count={(state.lic?.length || 0) + (state.investmentPlans?.length || 0)}
                totalValue={
                  state.lic.reduce((s: number, x: any) => s + (Number(x.sumAssured) || 0), 0) +
                  state.investmentPlans.reduce(
                    (s: number, x: any) =>
                      s + (Number(x.expectedMaturityAmount || x.sumAssured) || 0),
                    0
                  )
                }
                accentColor="#f43f5e"
                expanded={!!expandedSections.insurance}
                onToggle={() => toggleSection("insurance")}
              />
              {expandedSections.insurance && (
                <Card className="print-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={tableWrap}>
                    <table style={{ ...tbl, minWidth: 680 }}>
                      <thead>
                        <tr>
                          <th style={{ ...th, paddingLeft: 20 }}>Plan Name</th>
                          <th style={th}>Policy #</th>
                          <th style={th}>Type</th>
                          <th style={thRight}>Premiums Paid</th>
                          <th style={thRight}>Sum Assured / Value</th>
                          <th style={{ ...th, paddingRight: 20 }}>Maturity Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(state.lic || [])
                          .filter((l: any) => matchesSearch(l.planName))
                          .map((l: any) => (
                            <tr key={l.id} className="table-row-hover">
                              <td
                                style={{
                                  ...td,
                                  paddingLeft: 20,
                                  fontWeight: 700,
                                  color: THEME.ink,
                                }}
                              >
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
                              <td style={{ ...td, paddingRight: 20 }}>{l.maturityDate || "--"}</td>
                            </tr>
                          ))}
                        {(state.investmentPlans || [])
                          .filter((ip: any) => matchesSearch(ip.planName || ip.insurer))
                          .map((ip: any) => (
                            <tr key={ip.id} className="table-row-hover">
                              <td
                                style={{
                                  ...td,
                                  paddingLeft: 20,
                                  fontWeight: 700,
                                  color: THEME.ink,
                                }}
                              >
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
                              <td style={{ ...td, paddingRight: 20 }}>{ip.maturityDate || "--"}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* 13. Gold & SGBs */}
          {(state.goldHoldings?.length || 0) > 0 && (
            <div className="print-break-inside-avoid" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SectionHeader
                icon={Gem}
                title="Gold & SGBs"
                count={state.goldHoldings.length}
                totalValue={state.goldHoldings.reduce((s: number, h: any) => {
                  const grams = Number(h.grams) || 0;
                  const purityMul =
                    h.type === "physical" ? GOLD_PURITY_FACTOR[h.purity] || 1 : 1;
                  return s + grams * getGoldPricePerGram(state) * purityMul;
                }, 0)}
                accentColor={THEME.violet}
                expanded={!!expandedSections.gold}
                onToggle={() => toggleSection("gold")}
              />
              {expandedSections.gold && (
                <Card className="print-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={tableWrap}>
                    <table style={{ ...tbl, minWidth: 760 }}>
                      <thead>
                        <tr>
                          <th style={{ ...th, paddingLeft: 20 }}>Holding</th>
                          <th style={th}>Type</th>
                          <th style={thRight}>Grams</th>
                          <th style={thRight}>Invested</th>
                          <th style={thRight}>Current Value</th>
                          <th style={thRight}>P&L</th>
                          <th style={{ ...thRight, paddingRight: 20 }}>P&L %</th>
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
                                <td
                                  style={{
                                    ...td,
                                    paddingLeft: 20,
                                    fontWeight: 700,
                                    color: THEME.ink,
                                  }}
                                >
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
                                    paddingRight: 20,
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

          {/* 14. Real Estate */}
          {realEstateActiveProperties.length > 0 && (
            <div className="print-break-inside-avoid" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <SectionHeader
                icon={Home}
                title="Real Estate"
                count={realEstateActiveProperties.length}
                totalValue={realEstateActiveProperties.reduce((s: number, p: any) => {
                  const share =
                    activeProfile && activeProfile !== "all"
                      ? realEstateShareForOwner(p, activeProfile)
                      : realEstateTrackedShare(p);
                  return s + Number(p.marketValue || p.agreementValue || 0) * share;
                }, 0)}
                accentColor="#059669"
                expanded={!!expandedSections.realestate}
                onToggle={() => toggleSection("realestate")}
              />
              {expandedSections.realestate && (
                <Card className="print-card" style={{ padding: 0, overflow: "hidden" }}>
                  <div style={tableWrap}>
                    <table style={{ ...tbl, minWidth: 820 }}>
                      <thead>
                        <tr>
                          <th style={{ ...th, paddingLeft: 20 }}>Property</th>
                          <th style={th}>Location</th>
                          <th style={thRight}>Your Share</th>
                          <th style={thRight}>Invested</th>
                          <th style={thRight}>Current Value</th>
                          <th style={thRight}>Gain</th>
                          <th style={{ ...thRight, paddingRight: 20 }}>Gain %</th>
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
                            const currentValue =
                              Number(p.marketValue || p.agreementValue || 0) * share;
                            const gain = currentValue - invested;
                            const gainPct = invested > 0 ? (gain / invested) * 100 : 0;

                            return (
                              <tr key={p.id} className="table-row-hover">
                                <td
                                  style={{
                                    ...td,
                                    paddingLeft: 20,
                                    fontWeight: 700,
                                    color: THEME.ink,
                                  }}
                                >
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
                                    paddingRight: 20,
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

          {/* ── Asset Allocation Section at Bottom of Statement ──────── */}
          {summary.pieData.length > 0 && (
            <Card className="print-card" style={{ padding: "24px 20px" }}>
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
                  <div style={{ width: "100%", height: "100%", position: "relative" }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                                : `₹${summary.pieData[activePieIndex].value.toLocaleString(
                                    "en-IN",
                                    {
                                      maximumFractionDigits: 0,
                                    }
                                  )}`}
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
                                : `₹${summary.totalCurrent.toLocaleString("en-IN", {
                                    maximumFractionDigits: 0,
                                  })}`}
                            </text>
                          </>
                        )}
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
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
                          padding: "8px 14px",
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
                            background:
                              PIE_COLOR_BY_NAME[d.name] || PIE_COLORS[i % PIE_COLORS.length],
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
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          VIEW 2: ASSET ALLOCATION & RISK INSIGHTS
          ══════════════════════════════════════════════════════════════ */}
      {activeView === "allocation" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 20,
            }}
          >
            {/* Donut Chart & Category Cards */}
            <Card style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700, color: THEME.ink }}>
                Portfolio Asset Breakdown
              </h3>
              <div style={{ height: 260, position: "relative" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                      stroke="none"
                    >
                      {summary.pieData.map((d: any, i: number) => (
                        <Cell
                          key={`alloc-cell-${i}`}
                          fill={PIE_COLOR_BY_NAME[d.name] || PIE_COLORS[i % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
                {summary.pieData.map((d, i) => {
                  const pct =
                    summary.totalCurrent > 0
                      ? ((d.value / summary.totalCurrent) * 100).toFixed(1)
                      : "0";
                  return (
                    <div
                      key={d.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        background: "var(--surface-1)",
                        borderRadius: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 3,
                            background:
                              PIE_COLOR_BY_NAME[d.name] || PIE_COLORS[i % PIE_COLORS.length],
                          }}
                        />
                        <span style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>
                          {d.name}
                        </span>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                          <Money value={d.value} variant="full" />
                        </span>
                        <span style={{ fontSize: 11, color: THEME.muted, marginLeft: 8 }}>
                          ({pct}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Liquidity Profile & Diversification Health */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Card style={{ padding: 24 }}>
                <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700, color: THEME.ink }}>
                  Liquidity & Horizon Profile
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Liquid */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ color: THEME.sage, display: "flex", alignItems: "center", gap: 6 }}>
                        <CheckCircle2 size={14} /> Highly Liquid (Equities, MFs)
                      </span>
                      <span>
                        <Money value={summary.liquidTotal} variant="full" /> (
                        {summary.totalCurrent > 0
                          ? ((summary.liquidTotal / summary.totalCurrent) * 100).toFixed(1)
                          : 0}
                        %)
                      </span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 4,
                        background: "var(--surface-2)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${
                            summary.totalCurrent > 0
                              ? (summary.liquidTotal / summary.totalCurrent) * 100
                              : 0
                          }%`,
                          background: THEME.sage,
                        }}
                      />
                    </div>
                  </div>

                  {/* Semi-Liquid */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ color: THEME.gold, display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock size={14} /> Semi-Liquid (FDs, RDs, Bonds, Gold)
                      </span>
                      <span>
                        <Money value={summary.semiLiquidTotal} variant="full" /> (
                        {summary.totalCurrent > 0
                          ? ((summary.semiLiquidTotal / summary.totalCurrent) * 100).toFixed(1)
                          : 0}
                        %)
                      </span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 4,
                        background: "var(--surface-2)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${
                            summary.totalCurrent > 0
                              ? (summary.semiLiquidTotal / summary.totalCurrent) * 100
                              : 0
                          }%`,
                          background: THEME.gold,
                        }}
                      />
                    </div>
                  </div>

                  {/* Illiquid / Long Term */}
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        fontWeight: 600,
                        marginBottom: 6,
                      }}
                    >
                      <span style={{ color: THEME.accent, display: "flex", alignItems: "center", gap: 6 }}>
                        <Shield size={14} /> Long-Term / Locked (EPF, PPF, RE, Insurance)
                      </span>
                      <span>
                        <Money value={summary.illiquidTotal} variant="full" /> (
                        {summary.totalCurrent > 0
                          ? ((summary.illiquidTotal / summary.totalCurrent) * 100).toFixed(1)
                          : 0}
                        %)
                      </span>
                    </div>
                    <div
                      style={{
                        height: 8,
                        borderRadius: 4,
                        background: "var(--surface-2)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${
                            summary.totalCurrent > 0
                              ? (summary.illiquidTotal / summary.totalCurrent) * 100
                              : 0
                          }%`,
                          background: THEME.accent,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Portfolio Insights & Guardrails */}
              <Card style={{ padding: 24 }}>
                <h3 style={{ margin: "0 0 12px 0", fontSize: 16, fontWeight: 700, color: THEME.ink }}>
                  Portfolio Health Intelligence
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "color-mix(in srgb, var(--t-sage) 10%, var(--surface-0))",
                      border: `1px solid color-mix(in srgb, var(--t-sage) 30%, transparent)`,
                    }}
                  >
                    <CheckCircle2 size={18} color={THEME.sage} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 700, color: THEME.ink }}>Guaranteed Base Stability</div>
                      <div style={{ color: THEME.muted, fontSize: 12, marginTop: 2 }}>
                        {summary.fixedIncomeShare.toFixed(1)}% of your portfolio is in capital-guaranteed instruments (FD, EPF, PPF, Bonds).
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: "color-mix(in srgb, var(--t-accent) 10%, var(--surface-0))",
                      border: `1px solid color-mix(in srgb, var(--t-accent) 30%, transparent)`,
                    }}
                  >
                    <TrendingUp size={18} color={THEME.accent} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 700, color: THEME.ink }}>Equity Compounding Engine</div>
                      <div style={{ color: THEME.muted, fontSize: 12, marginTop: 2 }}>
                        Equity holdings contribute{" "}
                        {summary.totalCurrent > 0
                          ? ((summary.equityTotal / summary.totalCurrent) * 100).toFixed(1)
                          : 0}
                        % towards long-term inflation-beating capital growth.
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          VIEW 3: MATURITY RADAR & CASHFLOW SCHEDULE
          ══════════════════════════════════════════════════════════════ */}
      {activeView === "maturity" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div
              style={{
                padding: "16px 20px",
                borderBottom: `1px solid ${THEME.line}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: THEME.ink }}>
                  Upcoming Instrument Maturities & Payouts
                </h3>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                  Tracks Fixed Deposits, Bonds, and Insurance policy redemption dates
                </div>
              </div>
              <Badge variant="gold" style={{ fontSize: 11, padding: "3px 8px" }}>
                {maturitySchedule.filter((m) => m.dtm !== null && m.dtm > 0 && m.dtm <= 90).length}{" "}
                Maturing in 90 Days
              </Badge>
            </div>

            {maturitySchedule.length === 0 ? (
              <div style={{ padding: "32px 20px", textAlign: "center", color: THEME.muted }}>
                No active maturity instruments found.
              </div>
            ) : (
              <div style={tableWrap}>
                <table style={tbl}>
                  <thead>
                    <tr>
                      <th style={{ ...th, paddingLeft: 20 }}>Instrument</th>
                      <th style={th}>Category</th>
                      <th style={thRight}>Principal Invested</th>
                      <th style={thRight}>Expected Payout</th>
                      <th style={th}>Maturity Date</th>
                      <th style={{ ...thRight, paddingRight: 20 }}>Status / Urgency</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maturitySchedule
                      .filter((m) => matchesSearch(m.title || m.institution || m.category))
                      .map((item) => (
                        <tr key={item.id} className="table-row-hover">
                          <td
                            style={{
                              ...td,
                              paddingLeft: 20,
                              fontWeight: 700,
                              color: THEME.ink,
                            }}
                          >
                            {item.title}
                          </td>
                          <td style={td}>
                            <Badge
                              variant={
                                item.category === "Bond"
                                  ? "sage"
                                  : item.category === "Fixed Deposit"
                                  ? "gold"
                                  : "accent"
                              }
                              style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6 }}
                            >
                              {item.category}
                            </Badge>
                          </td>
                          <td style={tdRight}>
                            <Money value={item.principal} variant="full" />
                          </td>
                          <td style={{ ...tdRight, fontWeight: 700 }}>
                            <Money value={item.maturityAmount} variant="full" />
                          </td>
                          <td style={td}>{item.maturityDate}</td>
                          <td
                            style={{
                              ...tdRight,
                              paddingRight: 20,
                              fontWeight: 700,
                              color:
                                item.status === "matured"
                                  ? THEME.muted
                                  : item.status === "urgent"
                                  ? THEME.rust
                                  : item.status === "near"
                                  ? THEME.gold
                                  : THEME.sage,
                            }}
                          >
                            {item.dtm != null ? (
                              item.dtm === 0 ? (
                                <span style={{ color: THEME.muted }}>Matured</span>
                              ) : item.dtm <= 30 ? (
                                <span style={{ color: THEME.rust, display: "inline-flex", alignItems: "center", gap: 4 }}>
                                  <AlertCircle size={12} /> {item.dtm}d left
                                </span>
                              ) : (
                                `${item.dtm}d left`
                              )
                            ) : (
                              "--"
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          VIEW 4: ALL HOLDINGS EXPLORER
          ══════════════════════════════════════════════════════════════ */}
      {activeView === "holdings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div
              style={{
                padding: "16px 20px",
                borderBottom: `1px solid ${THEME.line}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: THEME.ink }}>
                  Universal Holdings Explorer
                </h3>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                  Flat consolidated registry across all asset classes with real-time valuations
                </div>
              </div>
              <Badge variant="accent" style={{ fontSize: 11, padding: "3px 8px" }}>
                {allHoldingsList.length} Total Holdings
              </Badge>
            </div>

            <div style={tableWrap}>
              <table style={tbl}>
                <thead>
                  <tr>
                    <th style={{ ...th, paddingLeft: 20 }}>Holding Name</th>
                    <th style={th}>Category</th>
                    <th style={th}>Identifier / Folio</th>
                    <th style={th}>Issuer / Sector</th>
                    <th style={thRight}>Invested</th>
                    <th style={thRight}>Current Value</th>
                    <th style={thRight}>Unrealized Gain</th>
                    <th style={{ ...thRight, paddingRight: 20 }}>Return Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {allHoldingsList
                    .filter((h) =>
                      matchesSearch(`${h.name} ${h.category} ${h.identifier} ${h.issuer}`)
                    )
                    .map((h) => (
                      <tr key={h.id} className="table-row-hover">
                        <td
                          style={{
                            ...td,
                            paddingLeft: 20,
                            fontWeight: 700,
                            color: THEME.ink,
                          }}
                        >
                          {h.name}
                        </td>
                        <td style={td}>
                          <Badge
                            variant="muted"
                            style={{ fontSize: 10, padding: "2px 6px", borderRadius: 6 }}
                          >
                            {h.category}
                          </Badge>
                        </td>
                        <td style={{ ...td, fontSize: 12, color: THEME.muted }}>{h.identifier}</td>
                        <td style={{ ...td, fontSize: 12, color: THEME.muted }}>{h.issuer}</td>
                        <td style={tdRight}>
                          <Money value={h.invested} variant="full" />
                        </td>
                        <td style={{ ...tdRight, fontWeight: 700 }}>
                          <Money value={h.currentValue} variant="full" />
                        </td>
                        <td style={{ ...tdRight, color: plColor(h.gain), fontWeight: 700 }}>
                          {plSign(h.gain)}
                          <Money value={h.gain} variant="full" />
                        </td>
                        <td style={{ ...tdRight, paddingRight: 20, fontWeight: 600 }}>
                          {h.rateLabel}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
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
        Generated on {formattedDate} &bull; ArthaDrishti by Anand Mohta &bull; Confidential Wealth Report
      </div>
    </div>
  );
};
