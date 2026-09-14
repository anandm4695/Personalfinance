/* eslint-disable */
import React, { useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Coins,
  Shield,
  Landmark,
  Repeat,
  FileText,
  Briefcase,
  Activity,
  Info,
  Search,
  X,
  Download,
  Trophy,
  AlertTriangle,
  Layers,
  ArrowUpDown,
  Filter,
  Eye,
  Calendar,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Printer,
  CheckCircle2,
  Clock,
  Zap,
  Target,
  Scale,
  RefreshCw,
  Percent,
  Sliders,
  Maximize2,
  HelpCircle,
  Gem,
  Home,
  Award,
  CircleDollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Sliders as SlidersIcon,
  SlidersHorizontal as SlidersHIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { THEME, ASSET_CLASS_COLORS } from "../../utils/constants";
import {
  calcXIRR,
  calculateEpfBalance,
  fmtINRFull,
  fmtINRExact,
  fmtINR,
  today,
  fdMaturity,
  rdMaturity,
  getLocalDateString,
  exportArrayToCSV,
  monthsBetween,
  calcCAGR,
} from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { Badge } from "../ui/Badge";
import { StatCard } from "../ui/StatCard";
import { Button } from "../ui/Button";
import { Money } from "../ui/Money";
import { DataTable, Column } from "../design-system/DataTable";
import { usePrivacy } from "../../context/PrivacyContext";

/* ── Benchmark Rates (Annualised Reference Standards) ──────────────── */
const BENCHMARK_RATES = [
  {
    name: "Nifty Next 50 TRI",
    rate: 16.8,
    category: "Equity - High Growth",
    color: "#8B5CF6",
    desc: "Large & Mid-Cap Momentum Equity benchmark",
  },
  {
    name: "Nifty 50 TRI",
    rate: 14.2,
    category: "Equity - Large Cap",
    color: THEME.accent,
    desc: "Indian marquee equity benchmark standard (10-yr CAGR)",
  },
  {
    name: "Physical Gold (MCX)",
    rate: 11.5,
    category: "Commodities",
    color: THEME.gold,
    desc: "Sovereign Gold / Bullion historical return",
  },
  {
    name: "Corporate Bond Index",
    rate: 7.8,
    category: "Fixed Income",
    color: THEME.cyan,
    desc: "AAA/AA Corporate Debt composite yield",
  },
  {
    name: "Public Provident Fund (PPF)",
    rate: 7.1,
    category: "Govt / Sovereign",
    color: THEME.sage,
    desc: "Govt-backed risk-free tax-exempt return",
  },
  {
    name: "Bank 1-3 Yr Fixed Deposit",
    rate: 7.1,
    category: "Fixed Income",
    color: "#0EA5E9",
    desc: "Average Scheduled Commercial Bank FD rate",
  },
  {
    name: "CPI Inflation Rate",
    rate: 5.4,
    category: "Macro Hurdle",
    color: THEME.rust,
    desc: "Headline cost of living inflation baseline",
  },
];

/* ── Canonical section ordering ────────────────────────────────────── */
const TYPE_ORDER = [
  "Fixed Deposit",
  "Recurring Deposit",
  "Mutual Fund",
  "Stocks",
  "PPF",
  "EPF",
  "NPS",
  "Bonds",
  "Govt Schemes",
  "Real Estate",
  "Gold & SGB",
];

const xirrColor = (x: number | null): string => {
  if (x === null) return THEME.muted;
  if (x >= 15) return THEME.sage;
  if (x >= 10) return THEME.accent;
  if (x >= 6) return THEME.gold;
  return THEME.rust;
};

const xirrLabel = (x: number | null): string => {
  if (x === null) return "N/A";
  return `${x.toFixed(2)}%`;
};

// Clamped month addition preventing date overflow into subsequent months
const addMonthsClamped = (date: Date, monthsToAdd: number): Date => {
  const day = date.getDate();
  const total = date.getMonth() + monthsToAdd;
  const y = date.getFullYear() + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(day, daysInMonth));
};

const holdingLabel = (startDate: string, endDate: string): string => {
  if (!startDate || !endDate) return "—";
  const days = Math.ceil(
    (new Date(endDate + "T00:00:00").getTime() - new Date(startDate + "T00:00:00").getTime()) /
      (1000 * 60 * 60 * 24)
  );
  if (days <= 0) return "<1d";
  if (days < 365) return `${days}d`;
  return `${(days / 365).toFixed(1)}y`;
};

const holdingDays = (startDate: string, endDate: string): number => {
  if (!startDate || !endDate) return 0;
  return Math.max(
    0,
    Math.ceil(
      (new Date(endDate + "T00:00:00").getTime() - new Date(startDate + "T00:00:00").getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );
};

export function XIRRReportTab({ state, initialTab = "overview" }: any) {
  const todayStr = today();
  const [activeTab, setActiveTab] = useState<
    "overview" | "holdings" | "asset-classes" | "cashflows" | "simulator" | "benchmarks"
  >(initialTab);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedOwner, setSelectedOwner] = useState<string>("all");
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [sortField, setSortField] = useState<"xirr" | "gain" | "currentValue" | "invested" | "name" | "period">("xirr");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Cash flow inspection drawer state
  const [inspectingHolding, setInspectingHolding] = useState<any | null>(null);

  // Simulator state
  const [simTargetValuation, setSimTargetValuation] = useState<number>(0);
  const [simHoldingMonths, setSimHoldingMonths] = useState<number>(12);
  const [simMonthlySip, setSimMonthlySip] = useState<number>(0);
  const [simLumpSum, setSimLumpSum] = useState<number>(0);

  /* ═══════════════════════════════════════════════════════════════════
     COMPREHENSIVE MULTI-ASSET CASH FLOW & XIRR ENGINE
     ═══════════════════════════════════════════════════════════════════ */
  const rows = useMemo(() => {
    const results: any[] = [];

    // ── 1. Fixed Deposits ──────────────────────────────────────────────
    (state?.fixedDeposits || []).forEach((fd: any) => {
      if (!fd.startDate || !fd.principal) return;
      const years = Number(fd.years || 1);
      const matDate =
        fd.maturityDate ||
        (() => {
          const d = new Date(fd.startDate + "T00:00:00");
          return getLocalDateString(addMonthsClamped(d, Math.round(years * 12)));
        })();

      const isMature = matDate <= todayStr;
      const endDate = isMature ? matDate : todayStr;
      const elapsed =
        (new Date(endDate + "T00:00:00").getTime() -
          new Date(fd.startDate + "T00:00:00").getTime()) /
        (365.25 * 24 * 3600 * 1000);

      const currentVal = isMature
        ? fdMaturity(Number(fd.principal), Number(fd.rate), years)
        : fdMaturity(Number(fd.principal), Number(fd.rate), Math.max(0, elapsed));

      const cashFlows = [
        { date: fd.startDate, amount: -Number(fd.principal), type: "Principal Outflow", note: `Initial FD Deposit @ ${fd.rate}%` },
        { date: endDate, amount: currentVal, type: isMature ? "Maturity Inflow" : "Mark-to-Market Valuation", note: isMature ? "Final Maturity Proceeds" : "Accrued Quarterly Value" },
      ];
      const xirr = calcXIRR(cashFlows);

      results.push({
        id: fd.id || `fd-${fd.bank}-${fd.startDate}`,
        name: fd.bank || "FD",
        type: "Fixed Deposit",
        assetCategory: "Fixed Income",
        icon: Landmark,
        color: THEME.cyan,
        invested: Number(fd.principal),
        currentValue: currentVal,
        startDate: fd.startDate,
        endDate,
        xirr,
        cashFlows,
        status: isMature ? "matured" : "active",
        owner: fd.owner || "self",
        rate: Number(fd.rate || 0),
        raw: fd,
      });
    });

    // ── 2. Recurring Deposits ──────────────────────────────────────────
    (state?.recurringDeposits || []).forEach((rd: any) => {
      if (!rd.startDate || !rd.monthly || !rd.tenureMonths) return;
      const months = Number(rd.tenureMonths);
      const monthly = Number(rd.monthly);

      const rdStart = new Date(rd.startDate + "T00:00:00");
      const cashFlows: any[] = [];
      for (let i = 0; i < months; i++) {
        const ds = getLocalDateString(addMonthsClamped(rdStart, i));
        if (ds <= todayStr) {
          cashFlows.push({
            date: ds,
            amount: -monthly,
            type: "Monthly Deposit",
            note: `Installment #${i + 1} of ${months}`,
          });
        }
      }
      if (cashFlows.length === 0) return;

      const matDate = rd.maturityDate || getLocalDateString(addMonthsClamped(rdStart, months));
      const isMature = matDate <= todayStr;
      const paidMonths = cashFlows.length;
      const matAmt = rdMaturity(monthly, Number(rd.rate), months);
      const currentVal = isMature ? matAmt : rdMaturity(monthly, Number(rd.rate), paidMonths);
      const endDate = isMature ? matDate : todayStr;

      cashFlows.push({
        date: endDate,
        amount: currentVal,
        type: isMature ? "Maturity Proceeds" : "Current Accrued Value",
        note: isMature ? "RD Matured" : `${paidMonths} months accrued @ ${rd.rate}%`,
      });
      const xirr = calcXIRR(cashFlows);

      results.push({
        id: rd.id || `rd-${rd.bank}-${rd.startDate}`,
        name: rd.bank || "RD",
        type: "Recurring Deposit",
        assetCategory: "Fixed Income",
        icon: Repeat,
        color: THEME.violet,
        invested: monthly * paidMonths,
        currentValue: currentVal,
        startDate: rd.startDate,
        endDate,
        xirr,
        cashFlows,
        status: isMature ? "matured" : "active",
        owner: rd.owner || "self",
        rate: Number(rd.rate || 0),
        raw: rd,
      });
    });

    // ── 3. Mutual Funds ────────────────────────────────────────────────
    (state?.mutualFunds || []).forEach((mf: any) => {
      const invested = Number(mf.invested || 0) || (Number(mf.units || 0) * Number(mf.buyNav || 0));
      const currentVal = Number(mf.units || 0) * Number(mf.currentNav || mf.nav || 0);
      const buyDate = mf.buyDate || mf.startDate || mf.purchaseDate;
      if (!buyDate || invested <= 0 || currentVal <= 0) return;

      const cashFlows = [
        { date: buyDate, amount: -invested, type: "Investment Outflow", note: `${mf.units || 0} units @ ₹${mf.buyNav || 0}` },
        { date: todayStr, amount: currentVal, type: "Mark-to-Market Valuation", note: `NAV ₹${mf.currentNav || mf.nav || 0}` },
      ];
      const xirr = calcXIRR(cashFlows);

      const category = (mf.category || "").toLowerCase();
      const isEquity = category.includes("equity") || category.includes("elss") || category.includes("small") || category.includes("mid") || category.includes("large") || category.includes("flexi");

      results.push({
        id: mf.id || `mf-${mf.name || mf.scheme}-${buyDate}`,
        name: mf.name || mf.scheme || "Mutual Fund",
        type: "Mutual Fund",
        assetCategory: isEquity ? "Equity" : "Debt / Hybrid",
        icon: BarChart3,
        color: THEME.accent,
        invested,
        currentValue: currentVal,
        startDate: buyDate,
        endDate: todayStr,
        xirr,
        cashFlows,
        status: "active",
        owner: mf.owner || "self",
        folio: mf.folio || mf.folioNo,
        raw: mf,
      });
    });

    // ── 4. Stocks ──────────────────────────────────────────────────────
    (state?.stocks || []).forEach((s: any) => {
      const buyDate = s.buyDate || s.purchaseDate || s.date;
      if (!buyDate || !s.avgPrice || !s.qty) return;
      const invested = Number(s.avgPrice) * Number(s.qty);
      const currentVal = Number(s.currentPrice || s.ltp || s.avgPrice) * Number(s.qty);

      const cashFlows = [
        { date: buyDate, amount: -invested, type: "Buy Outflow", note: `${s.qty} shares @ ₹${s.avgPrice}` },
        { date: todayStr, amount: currentVal, type: "Current Market Value", note: `LTP ₹${s.currentPrice || s.ltp || s.avgPrice}` },
      ];
      const xirr = calcXIRR(cashFlows);

      results.push({
        id: s.id || `stock-${s.symbol || s.name}-${buyDate}`,
        name: s.symbol || s.name || "Stock",
        type: "Stocks",
        assetCategory: "Equity",
        icon: TrendingUp,
        color: THEME.gold,
        invested,
        currentValue: currentVal,
        startDate: buyDate,
        endDate: todayStr,
        xirr,
        cashFlows,
        status: "active",
        owner: s.owner || "self",
        raw: s,
      });
    });

    // ── 5. PPF ─────────────────────────────────────────────────────────
    (state?.ppf || [])
      .filter((p: any) => !p.type || p.type === "PPF")
      .forEach((p: any) => {
        const txns = (p.transactions || []).filter(
          (t: any) => t.date && (t.type === "deposit" || Number(t.amount) > 0)
        );
        if (txns.length === 0 && (!p.startDate || !p.balance)) return;

        let cashFlows: any[] = [];
        let invested = 0;

        if (txns.length > 0) {
          cashFlows = txns.map((t: any, idx: number) => {
            const amt = Math.abs(Number(t.amount));
            invested += amt;
            return {
              date: t.date,
              amount: -amt,
              type: "PPF Deposit",
              note: t.description || `Deposit #${idx + 1}`,
            };
          });
          cashFlows.push({
            date: todayStr,
            amount: Number(p.balance || 0),
            type: "PPF Account Balance",
            note: "Current PPF Ledger Balance",
          });
        } else {
          invested = Number(p.balance || 0);
          cashFlows = [
            { date: p.startDate, amount: -invested, type: "Initial Contribution", note: "Opening PPF Deposit" },
            { date: todayStr, amount: invested, type: "PPF Balance", note: "Current Balance" },
          ];
        }

        const xirr = calcXIRR(cashFlows);

        results.push({
          id: p.id || `ppf-${p.institution || p.name}`,
          name: p.institution || p.name || "PPF Account",
          type: "PPF",
          assetCategory: "Govt / Sovereign",
          icon: Shield,
          color: THEME.sage,
          invested,
          currentValue: Number(p.balance || invested),
          startDate: txns[0]?.date || p.startDate,
          endDate: todayStr,
          xirr,
          cashFlows,
          status: "active",
          owner: p.owner || "self",
          raw: p,
        });
      });

    // ── 6. EPF ─────────────────────────────────────────────────────────
    (state?.epf || []).forEach((p: any) => {
      const getEmpShare = (t: any) => Number(t.employeeShare || t.amount || 0);
      const txns = (p.transactions || []).filter((t: any) => t.date && getEmpShare(t) > 0);
      const currentVal = calculateEpfBalance(p);

      if (txns.length > 0) {
        const cashFlows: any[] = txns.map((t: any) => ({
          date: t.date,
          amount: -getEmpShare(t),
          type: "EPF Monthly Contribution",
          note: `Emp: ₹${getEmpShare(t)} | Empr: ₹${t.employerShare || 0}`,
        }));
        cashFlows.push({
          date: todayStr,
          amount: currentVal,
          type: "Total EPF Accumulated",
          note: "Includes interest & employer share",
        });
        const xirr = calcXIRR(cashFlows);
        const invested = txns.reduce((s: number, t: any) => s + getEmpShare(t), 0);

        results.push({
          id: p.id || `epf-${p.employer || p.institution}`,
          name: p.employer || p.institution || "EPF Account",
          type: "EPF",
          assetCategory: "Govt / Sovereign",
          icon: Shield,
          color: THEME.pink,
          invested,
          currentValue: currentVal,
          startDate: txns[0]?.date,
          endDate: todayStr,
          xirr,
          cashFlows,
          status: "active",
          owner: p.owner || "self",
          raw: p,
        });
      } else if (currentVal > 0 && p.startDate) {
        const invested = Number(p.balance || currentVal);
        const cashFlows = [
          { date: p.startDate, amount: -invested, type: "EPF Capital", note: "Opening Balance" },
          { date: todayStr, amount: currentVal, type: "EPF Valuation", note: "Current Balance" },
        ];
        const xirr = calcXIRR(cashFlows);
        results.push({
          id: p.id || `epf-${p.employer || p.institution}`,
          name: p.employer || p.institution || "EPF Account",
          type: "EPF",
          assetCategory: "Govt / Sovereign",
          icon: Shield,
          color: THEME.pink,
          invested,
          currentValue: currentVal,
          startDate: p.startDate,
          endDate: todayStr,
          xirr,
          cashFlows,
          status: "active",
          owner: p.owner || "self",
          raw: p,
        });
      }
    });

    // ── 7. NPS ─────────────────────────────────────────────────────────
    (state?.nps || []).forEach((p: any) => {
      const getNpsAmount = (t: any) =>
        Number(t.employeeAmount || t.amount || 0) + Number(t.employerAmount || 0);
      const txns = (p.transactions || []).filter((t: any) => t.date && getNpsAmount(t) > 0);
      const currentVal =
        Number(p.balance || 0) ||
        txns.reduce((s: number, t: any) => s + getNpsAmount(t), 0);

      if (txns.length > 0) {
        const cashFlows: any[] = txns.map((t: any) => ({
          date: t.date,
          amount: -getNpsAmount(t),
          type: "NPS Contribution",
          note: `Emp: ₹${t.employeeAmount || 0} | Co: ₹${t.employerAmount || 0}`,
        }));
        cashFlows.push({
          date: todayStr,
          amount: currentVal,
          type: "NPS Corpus Valuation",
          note: "Mark-to-Market Tier Valuation",
        });
        const xirr = calcXIRR(cashFlows);
        const invested = txns.reduce((s: number, t: any) => s + getNpsAmount(t), 0);

        results.push({
          id: p.id || `nps-${p.institution || "nps"}`,
          name: `${p.institution || "NPS"}${p.tier ? ` (Tier ${p.tier})` : ""}`,
          type: "NPS",
          assetCategory: "Retirement",
          icon: Briefcase,
          color: THEME.rust,
          invested,
          currentValue: currentVal,
          startDate: txns[0]?.date,
          endDate: todayStr,
          xirr,
          cashFlows,
          status: "active",
          owner: p.owner || "self",
          raw: p,
        });
      } else if (currentVal > 0 && (p.startDate || p.openDate)) {
        const startDate = p.startDate || p.openDate;
        const cashFlows = [
          { date: startDate, amount: -currentVal, type: "NPS Inflow", note: "Opening Contribution" },
          { date: todayStr, amount: currentVal, type: "NPS Valuation", note: "Current Corpus" },
        ];
        const xirr = calcXIRR(cashFlows);
        results.push({
          id: p.id || `nps-${p.institution || "nps"}`,
          name: `${p.institution || "NPS"}${p.tier ? ` (Tier ${p.tier})` : ""}`,
          type: "NPS",
          assetCategory: "Retirement",
          icon: Briefcase,
          color: THEME.rust,
          invested: currentVal,
          currentValue: currentVal,
          startDate,
          endDate: todayStr,
          xirr,
          cashFlows,
          status: "active",
          owner: p.owner || "self",
          raw: p,
        });
      }
    });

    // ── 8. Bonds & SGBs ────────────────────────────────────────────────
    (state?.bonds || []).forEach((b: any) => {
      const purchaseDate = b.orderDate || b.purchaseDate || b.settlementDate;
      const unitVal = Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0);
      const invAmount = Number(
        b.totalInvestmentAmount || b.totalPrincipalAmount || b.faceValue || unitVal || 0
      );
      if (!purchaseDate || invAmount <= 0) return;

      const faceVal = Number(b.totalPrincipalAmount || b.faceValue || unitVal || invAmount);
      const couponRate = Number(b.coupon || b.ytmRate || 0) / 100;
      const annualCoupon = faceVal * couponRate;

      const cashFlows: any[] = [
        {
          date: purchaseDate,
          amount: -invAmount,
          type: "Bond Acquisition",
          note: `Purchase cost @ ₹${b.pricePerUnit || invAmount}`,
        },
      ];

      if (b.maturityDate && annualCoupon > 0) {
        const couponEnd = b.maturityDate < todayStr ? b.maturityDate : todayStr;
        const purchaseD = new Date(purchaseDate + "T00:00:00");
        let yearOffset = 1;
        let ds = getLocalDateString(addMonthsClamped(purchaseD, yearOffset * 12));
        while (ds <= couponEnd) {
          cashFlows.push({
            date: ds,
            amount: annualCoupon,
            type: "Coupon Payment",
            note: `${b.coupon || 0}% Annual Coupon Inflow`,
          });
          yearOffset++;
          ds = getLocalDateString(addMonthsClamped(purchaseD, yearOffset * 12));
        }
      }

      const isMature = b.maturityDate && b.maturityDate <= todayStr;
      cashFlows.push({
        date: isMature ? b.maturityDate : todayStr,
        amount: faceVal,
        type: isMature ? "Bond Redemption" : "Current Face Valuation",
        note: isMature ? "Redeemed at Maturity" : "Holding Face Value",
      });

      const xirr = calcXIRR(cashFlows);
      const isSgb = (b.name || "").toLowerCase().includes("sgb") || (b.name || "").toLowerCase().includes("gold");

      results.push({
        id: b.id || `bond-${b.name || b.issuer}-${purchaseDate}`,
        name: b.name || b.issuer || "Bond",
        type: isSgb ? "Gold & SGB" : "Bonds",
        assetCategory: isSgb ? "Commodities" : "Fixed Income",
        icon: isSgb ? Gem : FileText,
        color: isSgb ? THEME.gold : THEME.muted,
        invested: invAmount,
        currentValue: faceVal,
        startDate: purchaseDate,
        endDate: b.maturityDate || todayStr,
        xirr,
        cashFlows,
        status: isMature ? "matured" : "active",
        owner: b.owner || "self",
        raw: b,
      });
    });

    // ── 9. Govt Schemes (Sukanya, NSC, SCSS, etc.) ──────────────────────
    (state?.govtSchemes || []).forEach((g: any) => {
      const startDate = g.startDate || g.openDate;
      const invested = Number(g.contributionAmount || g.invested || g.currentBalance || 0);
      const currentVal = Number(g.currentBalance || invested);
      if (!startDate || invested <= 0) return;

      const cashFlows = [
        { date: startDate, amount: -invested, type: "Scheme Deposit", note: `${g.schemeType || "Govt Scheme"} deposit` },
        { date: todayStr, amount: currentVal, type: "Current Valuation", note: `Interest rate ${g.interestRate || 0}%` },
      ];
      const xirr = calcXIRR(cashFlows);

      results.push({
        id: g.id || `govt-${g.name || g.schemeType}-${startDate}`,
        name: g.name || g.schemeType || "Govt Scheme",
        type: "Govt Schemes",
        assetCategory: "Govt / Sovereign",
        icon: Landmark,
        color: THEME.sage,
        invested,
        currentValue: currentVal,
        startDate,
        endDate: g.maturityDate || todayStr,
        xirr,
        cashFlows,
        status: "active",
        owner: g.owner || "self",
        raw: g,
      });
    });

    // ── 10. Real Estate Properties ──────────────────────────────────────
    (state?.realEstateProperties || [])
      .filter((p: any) => p.status !== "sold" && p.purchaseDate && (p.purchasePrice || p.totalCost))
      .forEach((p: any) => {
        const invested = Number(p.purchasePrice || p.totalCost || 0);
        const currentVal = Number(p.marketValue || p.currentValuation || invested);
        if (invested <= 0) return;

        const cashFlows = [
          { date: p.purchaseDate, amount: -invested, type: "Property Acquisition", note: `Purchased in ${p.location || ""}` },
          { date: todayStr, amount: currentVal, type: "Market Valuation", note: "Fair Market Value" },
        ];
        const xirr = calcXIRR(cashFlows);

        results.push({
          id: p.id || `re-${p.name || p.propertyType}-${p.purchaseDate}`,
          name: p.name || p.propertyType || "Real Estate",
          type: "Real Estate",
          assetCategory: "Real Estate",
          icon: Home,
          color: THEME.violet,
          invested,
          currentValue: currentVal,
          startDate: p.purchaseDate,
          endDate: todayStr,
          xirr,
          cashFlows,
          status: "active",
          owner: p.owner || "self",
          raw: p,
        });
      });

    return results.sort((a, b) => (b.xirr ?? -Infinity) - (a.xirr ?? -Infinity));
  }, [state, todayStr]);

  /* ═══════════════════════════════════════════════════════════════════
     PORTFOLIO AGGREGATIONS & BLENDED XIRR
     ═══════════════════════════════════════════════════════════════════ */
  const portfolioXIRR = useMemo(() => {
    if (rows.length === 0) return null;
    const flows: { date: string; amount: number }[] = [];
    rows.forEach((r) => {
      const rowFlows: { date: string; amount: number }[] = r.cashFlows || [];
      flows.push(...rowFlows.slice(0, -1));
    });
    const totalCurrent = rows.reduce((s: number, r) => s + (r.currentValue || 0), 0);
    flows.push({ date: todayStr, amount: totalCurrent });
    return calcXIRR(flows);
  }, [rows, todayStr]);

  const totalInvested = useMemo(() => rows.reduce((s: number, r) => s + (r.invested || 0), 0), [rows]);
  const totalCurrent = useMemo(() => rows.reduce((s: number, r) => s + (r.currentValue || 0), 0), [rows]);
  const totalGain = totalCurrent - totalInvested;
  const totalGainPct = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0;

  // Best / Worst performers
  const { bestRow, worstRow } = useMemo(() => {
    const ranked = rows.filter((r) => r.xirr !== null);
    if (ranked.length < 2) return { bestRow: null, worstRow: null };
    return { bestRow: ranked[0], worstRow: ranked[ranked.length - 1] };
  }, [rows]);

  // Asset class summary
  const assetClassAggregates = useMemo(() => {
    const map: Record<string, { name: string; invested: number; current: number; flows: any[]; count: number; color: string; icon: any }> = {};

    rows.forEach((r) => {
      const cat = r.type;
      if (!map[cat]) {
        map[cat] = {
          name: cat,
          invested: 0,
          current: 0,
          flows: [],
          count: 0,
          color: r.color,
          icon: r.icon,
        };
      }
      map[cat].invested += r.invested || 0;
      map[cat].current += r.currentValue || 0;
      map[cat].count += 1;
      const rowFlows = r.cashFlows || [];
      map[cat].flows.push(...rowFlows.slice(0, -1));
    });

    return Object.values(map)
      .map((item) => {
        const fullFlows = [...item.flows, { date: todayStr, amount: item.current }];
        const classXirr = calcXIRR(fullFlows);
        const gain = item.current - item.invested;
        const gainPct = item.invested > 0 ? (gain / item.invested) * 100 : 0;
        const allocPct = totalCurrent > 0 ? (item.current / totalCurrent) * 100 : 0;
        return {
          ...item,
          xirr: classXirr,
          gain,
          gainPct,
          allocPct,
        };
      })
      .sort((a, b) => (b.xirr ?? -Infinity) - (a.xirr ?? -Infinity));
  }, [rows, todayStr, totalCurrent]);

  // Available filters
  const availableOwners = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.owner) set.add(r.owner);
    });
    return Array.from(set);
  }, [rows]);

  const availableTypes = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.type));
    return Array.from(set).sort((a, b) => {
      const ia = TYPE_ORDER.indexOf(a);
      const ib = TYPE_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }, [rows]);

  // Filtered and sorted holdings
  const filteredRows = useMemo(() => {
    let list = rows.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (r.name || "").toLowerCase().includes(q);
        const matchesType = (r.type || "").toLowerCase().includes(q);
        const matchesOwner = (r.owner || "").toLowerCase().includes(q);
        const matchesFolio = (r.folio || "").toLowerCase().includes(q);
        if (!matchesName && !matchesType && !matchesOwner && !matchesFolio) return false;
      }

      if (selectedType !== "all" && r.type !== selectedType) return false;
      if (selectedOwner !== "all" && r.owner !== selectedOwner) return false;

      if (selectedTier !== "all") {
        if (selectedTier === "excellent" && (r.xirr === null || r.xirr < 15)) return false;
        if (selectedTier === "good" && (r.xirr === null || r.xirr < 10 || r.xirr >= 15)) return false;
        if (selectedTier === "moderate" && (r.xirr === null || r.xirr < 6 || r.xirr >= 10)) return false;
        if (selectedTier === "lagging" && (r.xirr === null || r.xirr < 0 || r.xirr >= 6)) return false;
        if (selectedTier === "negative" && (r.xirr === null || r.xirr >= 0)) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;

      switch (sortField) {
        case "xirr":
          valA = a.xirr ?? -Infinity;
          valB = b.xirr ?? -Infinity;
          break;
        case "gain":
          valA = (a.currentValue || 0) - (a.invested || 0);
          valB = (b.currentValue || 0) - (b.invested || 0);
          break;
        case "currentValue":
          valA = a.currentValue || 0;
          valB = b.currentValue || 0;
          break;
        case "invested":
          valA = a.invested || 0;
          valB = b.invested || 0;
          break;
        case "name":
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
          break;
        case "period":
          valA = holdingDays(a.startDate, a.endDate);
          valB = holdingDays(b.startDate, b.endDate);
          break;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  }, [rows, searchQuery, selectedType, selectedOwner, selectedTier, sortField, sortOrder]);

  // Per-type grouping for Asset-Class tab
  const typeGroups = useMemo(() => {
    const groups: Record<string, any[]> = {};
    filteredRows.forEach((r) => {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type].push(r);
    });
    return Object.entries(groups).sort(([a], [b]) => {
      const ia = TYPE_ORDER.indexOf(a);
      const ib = TYPE_ORDER.indexOf(b);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }, [filteredRows]);

  // All Cash Flows Chronological Flat List
  const consolidatedCashFlows = useMemo(() => {
    const flows: any[] = [];
    rows.forEach((r) => {
      (r.cashFlows || []).forEach((f: any, idx: number) => {
        flows.push({
          date: f.date,
          amount: f.amount,
          type: f.type || (f.amount < 0 ? "Outflow / Investment" : "Inflow / Valuation"),
          holdingName: r.name,
          holdingType: r.type,
          holdingColor: r.color,
          note: f.note || "",
          isTerminal: idx === (r.cashFlows?.length || 1) - 1,
        });
      });
    });
    return flows.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  }, [rows]);

  // Simulator Computed Scenario
  const simulatedPortfolioXIRR = useMemo(() => {
    if (rows.length === 0) return null;
    const flows: { date: string; amount: number }[] = [];
    rows.forEach((r) => {
      const rowFlows: { date: string; amount: number }[] = r.cashFlows || [];
      flows.push(...rowFlows.slice(0, -1));
    });

    const simMonths = Math.max(1, simHoldingMonths);
    const futureDate = getLocalDateString(addMonthsClamped(new Date(todayStr + "T00:00:00"), simMonths));

    // Base current terminal value or user override
    let projectedFinalValue = simTargetValuation > 0 ? simTargetValuation : totalCurrent;

    // Add additional SIPs
    if (simMonthlySip > 0) {
      const startD = new Date(todayStr + "T00:00:00");
      for (let i = 0; i < simMonths; i++) {
        const ds = getLocalDateString(addMonthsClamped(startD, i));
        flows.push({ date: ds, amount: -simMonthlySip });
      }
      projectedFinalValue += simMonthlySip * simMonths;
    }

    // Add lump sum
    if (simLumpSum > 0) {
      flows.push({ date: todayStr, amount: -simLumpSum });
      projectedFinalValue += simLumpSum;
    }

    flows.push({ date: futureDate, amount: projectedFinalValue });
    return calcXIRR(flows);
  }, [rows, todayStr, totalCurrent, simTargetValuation, simHoldingMonths, simMonthlySip, simLumpSum]);

  // CSV Export Handler
  const handleExportCSV = () => {
    const exportRows = filteredRows.map((r) => ({
      name: r.name,
      type: r.type,
      owner: r.owner || "self",
      invested: Math.round(r.invested || 0),
      currentValue: Math.round(r.currentValue || 0),
      gain: Math.round((r.currentValue || 0) - (r.invested || 0)),
      period: holdingLabel(r.startDate, r.endDate),
      xirr: r.xirr !== null ? `${r.xirr.toFixed(2)}%` : "N/A",
      status: r.status,
    }));
    exportArrayToCSV(
      exportRows,
      [
        { key: "name", label: "Name" },
        { key: "type", label: "Type" },
        { key: "owner", label: "Owner" },
        { key: "invested", label: "Invested" },
        { key: "currentValue", label: "Current Value" },
        { key: "gain", label: "Gain / Loss" },
        { key: "period", label: "Period" },
        { key: "xirr", label: "XIRR" },
        { key: "status", label: "Status" },
      ],
      `xirr-report_${todayStr}.csv`
    );
  };

  const handlePrint = () => {
    window.print();
  };

  // Table Columns definition
  const holdingColumns: Column<any>[] = [
    {
      key: "name",
      header: "Holding Name & Asset Type",
      align: "left",
      accessor: (row) => {
        const days = holdingDays(row.startDate, row.endDate);
        const isShortTenure = days > 0 && days < 90;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 34,
                height: 34,
                borderRadius: 10,
                background: `color-mix(in srgb, ${row.color || THEME.accent} 12%, transparent)`,
                color: row.color || THEME.accent,
                flexShrink: 0,
              }}
            >
              <row.icon size={18} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, color: THEME.ink, fontSize: 13.5 }}>{row.name}</span>
                {row.status === "matured" && (
                  <Badge variant="muted" size="xs">
                    Matured
                  </Badge>
                )}
                {isShortTenure && (
                  <span
                    title="Holding tenure <90 days: Annualised XIRR may be exaggerated due to short duration compounding extrapolation"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: THEME.gold,
                      background: `color-mix(in srgb, ${THEME.gold} 15%, transparent)`,
                      padding: "1px 6px",
                      borderRadius: 4,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <Clock size={10} /> &lt;90d
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11.5, color: THEME.muted, fontWeight: 500, marginTop: 2, display: "flex", gap: 8 }}>
                <span>{row.type}</span>
                {row.owner && row.owner !== "self" && (
                  <span>• Owner: <strong style={{ color: THEME.ink }}>{row.owner}</strong></span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "invested",
      header: "Invested",
      align: "right",
      accessor: (row) => <Money value={row.invested} variant="exact" />,
    },
    {
      key: "currentValue",
      header: "Current Value",
      align: "right",
      accessor: (row) => (
        <span style={{ fontWeight: 700 }}>
          <Money value={row.currentValue} variant="exact" />
        </span>
      ),
    },
    {
      key: "gain",
      header: "Gain / Loss",
      align: "right",
      accessor: (row) => {
        const gain = (row.currentValue || 0) - (row.invested || 0);
        const gainPct = row.invested > 0 ? (gain / row.invested) * 100 : 0;
        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ color: gain >= 0 ? THEME.sage : THEME.rust, fontWeight: 700 }}>
              {gain >= 0 ? "+" : ""}
              <Money value={Math.abs(gain)} variant="exact" />
            </span>
            <span style={{ fontSize: 11, color: gain >= 0 ? THEME.sage : THEME.rust, opacity: 0.85, fontWeight: 600 }}>
              {gainPct >= 0 ? "+" : ""}{gainPct.toFixed(1)}%
            </span>
          </div>
        );
      },
    },
    {
      key: "period",
      header: "Period",
      align: "right",
      accessor: (row) => (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <span style={{ fontWeight: 600, color: THEME.ink, fontSize: 12.5 }}>
            {holdingLabel(row.startDate, row.endDate)}
          </span>
          <span style={{ fontSize: 10.5, color: THEME.muted }}>
            {row.startDate ? row.startDate.slice(0, 4) : ""} – {row.endDate ? row.endDate.slice(0, 4) : "Present"}
          </span>
        </div>
      ),
    },
    {
      key: "xirr",
      header: "Annualised XIRR",
      align: "right",
      accessor: (row) => (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
          <span
            style={{
              fontWeight: 800,
              fontSize: 13,
              color: xirrColor(row.xirr),
              background: `color-mix(in srgb, ${xirrColor(row.xirr)} 12%, transparent)`,
              padding: "4px 10px",
              borderRadius: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {row.xirr !== null && row.xirr >= 0 ? <TrendingUp size={12} /> : row.xirr !== null ? <TrendingDown size={12} /> : null}
            {xirrLabel(row.xirr)}
          </span>
          <button
            type="button"
            title="Inspect Cash Flows"
            onClick={(e) => {
              e.stopPropagation();
              setInspectingHolding(row);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 6,
              border: `1px solid ${THEME.line}`,
              background: "var(--surface-1)",
              color: THEME.muted,
              cursor: "pointer",
            }}
          >
            <Eye size={13} />
          </button>
        </div>
      ),
    },
  ];

  /* ── Empty State ───────────────────────────────────────────────────── */
  if (rows.length === 0) {
    return (
      <div className="tab-content-enter">
        <SectionTitle sub="Extended Internal Rate of Return across all your investments">
          XIRR Report
        </SectionTitle>
        <EmptyState
          icon={Activity}
          title="No Investment Data"
          description="Add FDs, Mutual Funds, Stocks, PPF, EPF, NPS or Bonds with transaction dates to calculate precision XIRR."
        />
      </div>
    );
  }

  return (
    <div
      className="tab-content-enter xirr-report-container"
      style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}
    >
      {/* ── Print Styles ── */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .xirr-report-container, .xirr-report-container * { visibility: visible; }
          .xirr-report-container { position: absolute; left: 0; top: 0; width: 100%; background: #fff !important; color: #000 !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ── Header Command Bar ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <SectionTitle sub="True annualised return accounting for precise cash flow dates — the gold standard cross-asset performance metric">
            XIRR Report
          </SectionTitle>
        </div>

        <div className="no-print" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Printer size={14} />}
            onClick={handlePrint}
          >
            Print Report
          </Button>
          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={14} />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── Executive Hero KPI Bento Grid ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <Card
          style={{
            padding: "20px",
            border: `1.5px solid ${THEME.line}`,
            background: "var(--surface-0)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Portfolio Blended XIRR
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: xirrColor(portfolioXIRR), marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
                {xirrLabel(portfolioXIRR)}
              </div>
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: `color-mix(in srgb, ${xirrColor(portfolioXIRR)} 15%, transparent)`,
                color: xirrColor(portfolioXIRR),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Activity size={20} />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14, fontSize: 11.5 }}>
            {portfolioXIRR !== null && portfolioXIRR >= 14.2 ? (
              <span style={{ color: THEME.sage, fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
                <TrendingUp size={12} /> +{(portfolioXIRR - 14.2).toFixed(1)}% vs Nifty 50
              </span>
            ) : portfolioXIRR !== null ? (
              <span style={{ color: THEME.gold, fontWeight: 600 }}>
                {(14.2 - portfolioXIRR).toFixed(1)}% below Nifty 50 (14.2%)
              </span>
            ) : null}
            <span style={{ color: THEME.muted }}>• Money-Weighted</span>
          </div>
        </Card>

        <StatCard
          label="Total Invested"
          value={fmtINRFull(totalInvested)}
          numericValue={totalInvested}
          formatValue={fmtINRFull}
          icon={<Coins />}
          color={THEME.accent}
        />

        <StatCard
          label="Current Value"
          value={fmtINRFull(totalCurrent)}
          numericValue={totalCurrent}
          formatValue={fmtINRFull}
          icon={<TrendingUp />}
          color={THEME.sage}
        />

        <Card
          style={{
            padding: "20px",
            border: `1.5px solid ${THEME.line}`,
            background: "var(--surface-0)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Total Wealth Created
              </div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: totalGain >= 0 ? THEME.sage : THEME.rust,
                  marginTop: 6,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {totalGain >= 0 ? "+" : ""}
                <Money value={totalGain} variant="exact" />
              </div>
            </div>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: `color-mix(in srgb, ${totalGain >= 0 ? THEME.sage : THEME.rust} 15%, transparent)`,
                color: totalGain >= 0 ? THEME.sage : THEME.rust,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {totalGain >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            </div>
          </div>
          <div style={{ marginTop: 14, fontSize: 11.5, color: THEME.muted }}>
            Absolute Return:{" "}
            <strong style={{ color: totalGain >= 0 ? THEME.sage : THEME.rust }}>
              {totalGainPct >= 0 ? "+" : ""}{totalGainPct.toFixed(2)}%
            </strong>
          </div>
        </Card>
      </div>

      {/* ── Best / Worst Outperformer Strip ── */}
      {bestRow && worstRow && bestRow !== worstRow && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          <Card
            style={{
              border: `1.5px solid ${THEME.line}`,
              borderLeft: `4px solid ${THEME.sage}`,
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              cursor: "pointer",
            }}
            onClick={() => setInspectingHolding(bestRow)}
          >
            <div style={{ display: "flex", alignItems: "center", color: THEME.sage, flexShrink: 0 }}>
              <Trophy size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Top Outperformer
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {bestRow.name} <span style={{ color: THEME.muted, fontWeight: 500 }}>· {bestRow.type}</span>
              </div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right", flexShrink: 0 }}>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 14,
                  color: xirrColor(bestRow.xirr),
                  background: `color-mix(in srgb, ${xirrColor(bestRow.xirr)} 12%, transparent)`,
                  padding: "5px 12px",
                  borderRadius: 8,
                  display: "inline-block",
                }}
              >
                {xirrLabel(bestRow.xirr)}
              </span>
            </div>
          </Card>

          <Card
            style={{
              border: `1.5px solid ${THEME.line}`,
              borderLeft: `4px solid ${THEME.rust}`,
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              cursor: "pointer",
            }}
            onClick={() => setInspectingHolding(worstRow)}
          >
            <div style={{ display: "flex", alignItems: "center", color: THEME.rust, flexShrink: 0 }}>
              <AlertTriangle size={22} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Needs Attention / Lowest Return
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {worstRow.name} <span style={{ color: THEME.muted, fontWeight: 500 }}>· {worstRow.type}</span>
              </div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right", flexShrink: 0 }}>
              <span
                style={{
                  fontWeight: 800,
                  fontSize: 14,
                  color: xirrColor(worstRow.xirr),
                  background: `color-mix(in srgb, ${xirrColor(worstRow.xirr)} 12%, transparent)`,
                  padding: "5px 12px",
                  borderRadius: 8,
                  display: "inline-block",
                }}
              >
                {xirrLabel(worstRow.xirr)}
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* ── 6-Hub Sub-View Switcher ── */}
      <div
        className="no-print"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          borderBottom: `1.5px solid ${THEME.line}`,
          paddingBottom: 4,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {[
          { key: "overview", label: "Overview & Analytics", icon: BarChart3 },
          { key: "holdings", label: `Holdings Explorer (${rows.length})`, icon: Layers },
          { key: "asset-classes", label: "Asset Classes", icon: Landmark },
          { key: "cashflows", label: `Cash Flow Chronology (${consolidatedCashFlows.length})`, icon: Clock },
          { key: "simulator", label: "What-If Simulator", icon: Sparkles },
          { key: "benchmarks", label: "Benchmark Matrix", icon: Target },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: "10px 10px 0 0",
                border: "none",
                background: isActive ? "var(--surface-0)" : "transparent",
                color: isActive ? THEME.accent : THEME.muted,
                fontWeight: isActive ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                borderBottom: isActive ? `2px solid ${THEME.accent}` : "2px solid transparent",
                marginBottom: -5,
                transition: "all 0.15s ease",
                whiteSpace: "nowrap",
              }}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          VIEW 1: OVERVIEW & ANALYTICS
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Asset Class Allocation vs XIRR Bar Chart */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 16,
            }}
          >
            <Card style={{ padding: "20px", border: `1.5px solid ${THEME.line}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, margin: 0 }}>
                    Asset Class XIRR Leaderboard
                  </h3>
                  <p style={{ fontSize: 12, color: THEME.muted, margin: "3px 0 0" }}>
                    Money-weighted annualised performance per asset category
                  </p>
                </div>
                <Badge variant="accent" size="sm">
                  {assetClassAggregates.length} Categories
                </Badge>
              </div>

              <div style={{ height: 260, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={assetClassAggregates}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-subtle)" />
                    <XAxis
                      type="number"
                      unit="%"
                      stroke={THEME.muted}
                      fontSize={11}
                      domain={['dataMin < 0 ? dataMin - 2 : 0', 'auto']}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      stroke={THEME.muted}
                      fontSize={11}
                      width={110}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(val: any) => [`${Number(val).toFixed(2)}%`, "Category XIRR"]}
                      contentStyle={{
                        background: "var(--surface-0)",
                        border: `1px solid ${THEME.line}`,
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="xirr" radius={[0, 6, 6, 0]}>
                      {assetClassAggregates.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={xirrColor(entry.xirr)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Benchmark Alpha Spread */}
            <Card style={{ padding: "20px", border: `1.5px solid ${THEME.line}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, margin: 0 }}>
                    Alpha vs Market Standards
                  </h3>
                  <p style={{ fontSize: 12, color: THEME.muted, margin: "3px 0 0" }}>
                    Portfolio return spread against primary Indian indices
                  </p>
                </div>
                <Target size={18} color={THEME.accent} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {BENCHMARK_RATES.slice(0, 5).map((bm) => {
                  const portXirr = portfolioXIRR ?? 0;
                  const spread = portXirr - bm.rate;
                  const isOutperforming = spread >= 0;

                  return (
                    <div
                      key={bm.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "var(--surface-1)",
                        border: `1px solid ${THEME.line}`,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: THEME.ink }}>{bm.name}</span>
                          <span style={{ fontSize: 10.5, color: THEME.muted }}>({bm.rate}%)</span>
                        </div>
                        <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>{bm.category}</div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: 12.5,
                            color: isOutperforming ? THEME.sage : THEME.rust,
                            background: `color-mix(in srgb, ${isOutperforming ? THEME.sage : THEME.rust} 12%, transparent)`,
                            padding: "3px 8px",
                            borderRadius: 6,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          {isOutperforming ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {spread >= 0 ? "+" : ""}{spread.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Quick Holding Highlights & Color Guide */}
          <Card style={{ border: `1.5px solid ${THEME.line}` }}>
            <div
              style={{
                padding: "16px 20px",
                display: "flex",
                gap: 24,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                  color: THEME.muted,
                }}
              >
                <Info size={14} />
                <span
                  style={{
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.02em",
                    fontSize: 10.5,
                  }}
                >
                  XIRR Benchmarks (Annualised):
                </span>
              </div>
              {[
                { label: "≥ 15% — Excellent Alpha", color: THEME.sage },
                { label: "10 – 15% — Market Beating", color: THEME.accent },
                { label: "6 – 10% — Moderate Return", color: THEME.gold },
                { label: "< 6% — Below FD Baseline", color: THEME.rust },
              ].map((g) => (
                <div
                  key={g.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12.5,
                    fontWeight: 600,
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: g.color,
                    }}
                  />
                  <span style={{ color: THEME.ink }}>{g.label}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VIEW 2: HOLDINGS EXPLORER
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "holdings" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Filter & Control Bar */}
          <Card style={{ padding: "16px 20px", border: `1.5px solid ${THEME.line}` }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              {/* Search */}
              <div style={{ display: "flex", position: "relative", alignItems: "center", minWidth: 220, flex: "1 1 200px" }}>
                <Search
                  size={16}
                  color={THEME.muted}
                  style={{ position: "absolute", left: 14, pointerEvents: "none" }}
                />
                <input
                  type="text"
                  aria-label="Search holdings"
                  placeholder="Search name, symbol, folio, owner..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: `9px ${searchQuery ? 36 : 12}px 9px 38px`,
                    borderRadius: 10,
                    border: `1.5px solid ${THEME.line}`,
                    background: "var(--surface-0)",
                    color: THEME.ink,
                    fontSize: 13,
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

              {/* Type Filter */}
              <select
                aria-label="Filter by Asset Type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                style={{
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: `1.5px solid ${THEME.line}`,
                  background: "var(--surface-0)",
                  color: THEME.ink,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <option value="all">All Asset Types</option>
                {availableTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              {/* Owner Filter */}
              {availableOwners.length > 1 && (
                <select
                  aria-label="Filter by Family Member"
                  value={selectedOwner}
                  onChange={(e) => setSelectedOwner(e.target.value)}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 10,
                    border: `1.5px solid ${THEME.line}`,
                    background: "var(--surface-0)",
                    color: THEME.ink,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <option value="all">All Owners</option>
                  {availableOwners.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              )}

              {/* Tier Filter */}
              <select
                aria-label="Filter by Performance Tier"
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                style={{
                  padding: "9px 12px",
                  borderRadius: 10,
                  border: `1.5px solid ${THEME.line}`,
                  background: "var(--surface-0)",
                  color: THEME.ink,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                <option value="all">All Return Tiers</option>
                <option value="excellent">≥ 15% (Excellent)</option>
                <option value="good">10 – 15% (Good)</option>
                <option value="moderate">6 – 10% (Moderate)</option>
                <option value="lagging">&lt; 6% (Sub-FD)</option>
                <option value="negative">Negative Return</option>
              </select>

              {/* Sort Order Selector */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <select
                  aria-label="Sort by field"
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as any)}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 10,
                    border: `1.5px solid ${THEME.line}`,
                    background: "var(--surface-0)",
                    color: THEME.ink,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  <option value="xirr">Sort by XIRR</option>
                  <option value="gain">Sort by Gain/Loss</option>
                  <option value="currentValue">Sort by Current Value</option>
                  <option value="invested">Sort by Invested</option>
                  <option value="period">Sort by Holding Period</option>
                  <option value="name">Sort by Name</option>
                </select>
                <button
                  type="button"
                  aria-label="Toggle sort order"
                  onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
                  style={{
                    padding: "9px",
                    borderRadius: 10,
                    border: `1.5px solid ${THEME.line}`,
                    background: "var(--surface-0)",
                    color: THEME.ink,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <ArrowUpDown size={15} />
                </button>
              </div>
            </div>
          </Card>

          {/* Holdings Count Summary */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 4px" }}>
            <span style={{ fontSize: 13, color: THEME.muted }}>
              Showing <strong>{filteredRows.length}</strong> of {rows.length} investments
            </span>
            {(searchQuery || selectedType !== "all" || selectedOwner !== "all" || selectedTier !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedType("all");
                  setSelectedOwner("all");
                  setSelectedTier("all");
                }}
                style={{
                  fontSize: 12,
                  color: THEME.accent,
                  border: "none",
                  background: "transparent",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Desktop Data Table */}
          <Card style={{ overflow: "hidden", border: `1.5px solid ${THEME.line}` }}>
            <div className="desktop-only">
              <DataTable
                columns={holdingColumns}
                data={filteredRows}
                hideSearch
                keyExtractor={(row, i) => `${row.id}-${i}`}
              />
            </div>

            {/* Mobile View */}
            <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: 10, padding: 14 }}>
              {filteredRows.map((row, i) => {
                const gain = (row.currentValue || 0) - (row.invested || 0);
                const gainPct = row.invested > 0 ? (gain / row.invested) * 100 : 0;
                return (
                  <div
                    key={i}
                    style={{
                      border: `1.5px solid ${THEME.line}`,
                      borderRadius: 12,
                      padding: "14px",
                      background: "var(--surface-0)",
                    }}
                    onClick={() => setInspectingHolding(row)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: `color-mix(in srgb, ${row.color} 12%, transparent)`,
                          color: row.color,
                          flexShrink: 0,
                        }}
                      >
                        <row.icon size={16} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 700, color: THEME.ink, fontSize: 13.5 }}>{row.name}</div>
                        <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>
                          {row.type} {row.owner && row.owner !== "self" ? `• ${row.owner}` : ""}
                        </div>
                      </div>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: 12.5,
                          color: xirrColor(row.xirr),
                          background: `color-mix(in srgb, ${xirrColor(row.xirr)} 12%, transparent)`,
                          padding: "3px 9px",
                          borderRadius: 8,
                          flexShrink: 0,
                        }}
                      >
                        {xirrLabel(row.xirr)}
                      </span>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: 8,
                        marginTop: 12,
                        paddingTop: 10,
                        borderTop: `1px solid ${THEME.line}`,
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                          Invested
                        </div>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: THEME.ink, marginTop: 2 }}>
                          <Money value={row.invested} variant="exact" />
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                          Current
                        </div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: THEME.ink, marginTop: 2 }}>
                          <Money value={row.currentValue} variant="exact" />
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                          Gain
                        </div>
                        <div
                          style={{
                            fontSize: 12.5,
                            fontWeight: 700,
                            color: gain >= 0 ? THEME.sage : THEME.rust,
                            marginTop: 2,
                          }}
                        >
                          {gain >= 0 ? "+" : ""}
                          <Money value={Math.abs(gain)} variant="exact" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VIEW 3: ASSET CLASSES BREAKDOWN
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "asset-classes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {typeGroups.map(([type, items]) => {
            const typeInvested = items.reduce((s: number, r) => s + (r.invested || 0), 0);
            const typeCurrent = items.reduce((s: number, r) => s + (r.currentValue || 0), 0);
            const typeGain = typeCurrent - typeInvested;
            const TypeIcon = items[0]?.icon || Activity;

            // Compute Group XIRR
            const flows: any[] = [];
            items.forEach((r) => {
              const rFlows = r.cashFlows || [];
              flows.push(...rFlows.slice(0, -1));
            });
            flows.push({ date: todayStr, amount: typeCurrent });
            const groupXirr = calcXIRR(flows);

            return (
              <Card key={type} style={{ overflow: "hidden", border: `1.5px solid ${THEME.line}` }}>
                <div style={{ padding: "20px 22px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 16,
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          background: `color-mix(in srgb, ${items[0]?.color || THEME.accent} 12%, transparent)`,
                          color: items[0]?.color || THEME.accent,
                          flexShrink: 0,
                        }}
                      >
                        <TypeIcon size={18} />
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontWeight: 800, fontSize: 16, color: THEME.ink }}>
                            {type}
                          </span>
                          <Badge variant="muted" size="xs">
                            {items.length} {items.length === 1 ? "holding" : "holdings"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 12.5 }}>
                        <span style={{ color: THEME.muted }}>Invested: </span>
                        <strong style={{ color: THEME.ink }}><Money value={typeInvested} variant="exact" /></strong>
                      </div>
                      <div style={{ fontSize: 12.5 }}>
                        <span style={{ color: THEME.muted }}>Value: </span>
                        <strong style={{ color: THEME.ink }}><Money value={typeCurrent} variant="exact" /></strong>
                      </div>
                      <div style={{ fontSize: 12.5 }}>
                        <span style={{ color: typeGain >= 0 ? THEME.sage : THEME.rust, fontWeight: 700 }}>
                          {typeGain >= 0 ? "+" : ""}<Money value={typeGain} variant="exact" />
                        </span>
                      </div>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 13,
                          color: xirrColor(groupXirr),
                          background: `color-mix(in srgb, ${xirrColor(groupXirr)} 12%, transparent)`,
                          padding: "4px 10px",
                          borderRadius: 8,
                        }}
                      >
                        Class XIRR: {xirrLabel(groupXirr)}
                      </div>
                    </div>
                  </div>

                  <div className="desktop-only">
                    <DataTable
                      columns={holdingColumns}
                      data={items}
                      hideSearch
                      keyExtractor={(row, i) => `${type}-${i}`}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VIEW 4: CASH FLOW CHRONOLOGY
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "cashflows" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: "20px", border: `1.5px solid ${THEME.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, margin: 0 }}>
                  Consolidated Cash Flow Ledger
                </h3>
                <p style={{ fontSize: 12, color: THEME.muted, margin: "3px 0 0" }}>
                  Chronological record of every investment outflow, coupon, and terminal valuation date
                </p>
              </div>
              <Badge variant="accent" size="sm">
                {consolidatedCashFlows.length} Transactions
              </Badge>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1.5px solid ${THEME.line}`, textAlign: "left" }}>
                    <th style={{ padding: "10px 12px", color: THEME.muted, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Date</th>
                    <th style={{ padding: "10px 12px", color: THEME.muted, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Investment / Asset</th>
                    <th style={{ padding: "10px 12px", color: THEME.muted, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Flow Event</th>
                    <th style={{ padding: "10px 12px", color: THEME.muted, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Note</th>
                    <th style={{ padding: "10px 12px", color: THEME.muted, fontWeight: 700, fontSize: 11, textTransform: "uppercase", textAlign: "right" }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {consolidatedCashFlows.map((flow, idx) => {
                    const isOutflow = flow.amount < 0;
                    return (
                      <tr
                        key={idx}
                        style={{
                          borderBottom: `1px solid ${THEME.line}`,
                          background: flow.isTerminal ? "color-mix(in srgb, var(--surface-1) 50%, transparent)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "10px 12px", fontWeight: 600, color: THEME.ink, fontVariantNumeric: "tabular-nums" }}>
                          {flow.date}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <span style={{ fontWeight: 700, color: THEME.ink }}>{flow.holdingName}</span>
                          <span style={{ fontSize: 11, color: THEME.muted, marginLeft: 6 }}>({flow.holdingType})</span>
                        </td>
                        <td style={{ padding: "10px 12px", color: THEME.ink, fontSize: 12.5 }}>
                          {flow.type}
                        </td>
                        <td style={{ padding: "10px 12px", color: THEME.muted, fontSize: 11.5 }}>
                          {flow.note || "—"}
                        </td>
                        <td
                          style={{
                            padding: "10px 12px",
                            textAlign: "right",
                            fontWeight: 700,
                            color: isOutflow ? THEME.rust : THEME.sage,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {isOutflow ? "–" : "+"}
                          <Money value={Math.abs(flow.amount)} variant="exact" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VIEW 5: WHAT-IF XIRR SIMULATOR
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "simulator" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 16,
            }}
          >
            {/* Input Controls */}
            <Card style={{ padding: "20px", border: `1.5px solid ${THEME.line}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Sparkles size={18} color={THEME.accent} />
                <h3 style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, margin: 0 }}>
                  Simulation Parameters
                </h3>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                    Future Holding Horizon
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
                    <input
                      type="range"
                      min={1}
                      max={60}
                      value={simHoldingMonths}
                      onChange={(e) => setSimHoldingMonths(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontWeight: 700, fontSize: 13, color: THEME.ink, minWidth: 60 }}>
                      {simHoldingMonths} {simHoldingMonths === 1 ? "month" : "months"} ({ (simHoldingMonths/12).toFixed(1) }y)
                    </span>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                    Target Exit Valuation (₹)
                  </label>
                  <input
                    type="number"
                    placeholder={`Current: ${totalCurrent}`}
                    value={simTargetValuation || ""}
                    onChange={(e) => setSimTargetValuation(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: `1.5px solid ${THEME.line}`,
                      background: "var(--surface-0)",
                      color: THEME.ink,
                      fontSize: 13,
                      marginTop: 6,
                    }}
                  />
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    {[1.1, 1.2, 1.35, 1.5].map((mult) => (
                      <button
                        key={mult}
                        type="button"
                        onClick={() => setSimTargetValuation(Math.round(totalCurrent * mult))}
                        style={{
                          fontSize: 11,
                          padding: "3px 8px",
                          borderRadius: 6,
                          border: `1px solid ${THEME.line}`,
                          background: "var(--surface-1)",
                          color: THEME.ink,
                          cursor: "pointer",
                        }}
                      >
                        +{Math.round((mult - 1) * 100)}%
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                    Simulate Additional Monthly SIP (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 25000"
                    value={simMonthlySip || ""}
                    onChange={(e) => setSimMonthlySip(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: `1.5px solid ${THEME.line}`,
                      background: "var(--surface-0)",
                      color: THEME.ink,
                      fontSize: 13,
                      marginTop: 6,
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                    Simulate Lump-sum Capital Injection (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 100000"
                    value={simLumpSum || ""}
                    onChange={(e) => setSimLumpSum(Number(e.target.value))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: `1.5px solid ${THEME.line}`,
                      background: "var(--surface-0)",
                      color: THEME.ink,
                      fontSize: 13,
                      marginTop: 6,
                    }}
                  />
                </div>
              </div>
            </Card>

            {/* Projected Outcome Card */}
            <Card
              style={{
                padding: "24px",
                border: `1.5px solid ${THEME.line}`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                background: "var(--surface-0)",
              }}
            >
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Projected Portfolio XIRR
                </div>
                <div
                  style={{
                    fontSize: 34,
                    fontWeight: 900,
                    color: xirrColor(simulatedPortfolioXIRR),
                    marginTop: 8,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {xirrLabel(simulatedPortfolioXIRR)}
                </div>
                <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4 }}>
                  Current baseline: <strong style={{ color: THEME.ink }}>{xirrLabel(portfolioXIRR)}</strong>
                  {simulatedPortfolioXIRR !== null && portfolioXIRR !== null && (
                    <span
                      style={{
                        marginLeft: 8,
                        color: simulatedPortfolioXIRR >= portfolioXIRR ? THEME.sage : THEME.rust,
                        fontWeight: 700,
                      }}
                    >
                      ({simulatedPortfolioXIRR >= portfolioXIRR ? "+" : ""}
                      {(simulatedPortfolioXIRR - portfolioXIRR).toFixed(2)}% shift)
                    </span>
                  )}
                </div>
              </div>

              <div
                style={{
                  marginTop: 24,
                  padding: "16px",
                  borderRadius: 12,
                  background: "var(--surface-1)",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink, marginBottom: 8 }}>
                  Simulation Scenario Summary:
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: THEME.muted, display: "flex", flexDirection: "column", gap: 4 }}>
                  <li>Horizon: +{simHoldingMonths} months from today</li>
                  <li>Projected Exit Valuation: <strong style={{ color: THEME.ink }}><Money value={simTargetValuation > 0 ? simTargetValuation : totalCurrent} /></strong></li>
                  {simMonthlySip > 0 && <li>Added SIPs: <Money value={simMonthlySip} /> × {simHoldingMonths}m = <Money value={simMonthlySip * simHoldingMonths} /></li>}
                  {simLumpSum > 0 && <li>Lump Sum Injection: <Money value={simLumpSum} /></li>}
                </ul>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          VIEW 6: BENCHMARK MATRIX
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === "benchmarks" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: "20px", border: `1.5px solid ${THEME.line}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, margin: 0 }}>
                  Institutional Indian Benchmarks
                </h3>
                <p style={{ fontSize: 12, color: THEME.muted, margin: "3px 0 0" }}>
                  Comparison of your portfolio XIRR ({xirrLabel(portfolioXIRR)}) against recognized standard asset benchmarks
                </p>
              </div>
              <Target size={20} color={THEME.accent} />
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1.5px solid ${THEME.line}`, textAlign: "left" }}>
                    <th style={{ padding: "12px 14px", color: THEME.muted, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Benchmark Standard</th>
                    <th style={{ padding: "12px 14px", color: THEME.muted, fontWeight: 700, fontSize: 11, textTransform: "uppercase" }}>Asset Category</th>
                    <th style={{ padding: "12px 14px", color: THEME.muted, fontWeight: 700, fontSize: 11, textTransform: "uppercase", textAlign: "right" }}>Annualised Benchmark</th>
                    <th style={{ padding: "12px 14px", color: THEME.muted, fontWeight: 700, fontSize: 11, textTransform: "uppercase", textAlign: "right" }}>Your Alpha Spread</th>
                    <th style={{ padding: "12px 14px", color: THEME.muted, fontWeight: 700, fontSize: 11, textTransform: "uppercase", textAlign: "center" }}>Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {BENCHMARK_RATES.map((bm, i) => {
                    const portXirr = portfolioXIRR ?? 0;
                    const diff = portXirr - bm.rate;
                    const isBeating = diff >= 0;

                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                        <td style={{ padding: "12px 14px" }}>
                          <div style={{ fontWeight: 700, color: THEME.ink }}>{bm.name}</div>
                          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{bm.desc}</div>
                        </td>
                        <td style={{ padding: "12px 14px", color: THEME.muted, fontSize: 12 }}>
                          {bm.category}
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 700, color: THEME.ink, fontVariantNumeric: "tabular-nums" }}>
                          {bm.rate.toFixed(1)}%
                        </td>
                        <td
                          style={{
                            padding: "12px 14px",
                            textAlign: "right",
                            fontWeight: 800,
                            color: isBeating ? THEME.sage : THEME.rust,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {diff >= 0 ? "+" : ""}{diff.toFixed(2)}%
                        </td>
                        <td style={{ padding: "12px 14px", textAlign: "center" }}>
                          <Badge variant={isBeating ? "sage" : "rust"} size="xs">
                            {isBeating ? "Outperforming" : "Lagging"}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          CASH FLOW INSPECTOR MODAL / DRAWER
          ═══════════════════════════════════════════════════════════════ */}
      {inspectingHolding && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cash Flow Inspector"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => setInspectingHolding(null)}
        >
          <div
            style={{
              background: "var(--surface-0)",
              borderRadius: 16,
              border: `1.5px solid ${THEME.line}`,
              maxWidth: 620,
              width: "100%",
              maxHeight: "85vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "var(--shadow-lg)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "18px 22px",
                borderBottom: `1.5px solid ${THEME.line}`,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: `color-mix(in srgb, ${inspectingHolding.color || THEME.accent} 15%, transparent)`,
                    color: inspectingHolding.color || THEME.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <inspectingHolding.icon size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, margin: 0 }}>
                    {inspectingHolding.name}
                  </h3>
                  <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                    {inspectingHolding.type} • {holdingLabel(inspectingHolding.startDate, inspectingHolding.endDate)}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 14,
                    color: xirrColor(inspectingHolding.xirr),
                    background: `color-mix(in srgb, ${xirrColor(inspectingHolding.xirr)} 12%, transparent)`,
                    padding: "4px 10px",
                    borderRadius: 8,
                  }}
                >
                  {xirrLabel(inspectingHolding.xirr)}
                </span>
                <button
                  type="button"
                  aria-label="Close Inspector"
                  onClick={() => setInspectingHolding(null)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    border: "none",
                    background: "var(--surface-2)",
                    color: THEME.muted,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: "20px 22px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Summary Strip */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 12,
                  padding: "12px",
                  borderRadius: 12,
                  background: "var(--surface-1)",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div>
                  <div style={{ fontSize: 10.5, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                    Total Invested
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: THEME.ink, marginTop: 2 }}>
                    <Money value={inspectingHolding.invested} variant="exact" />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                    Current Valuation
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: THEME.ink, marginTop: 2 }}>
                    <Money value={inspectingHolding.currentValue} variant="exact" />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                    Gain / Loss
                  </div>
                  <div
                    style={{
                      fontSize: 13.5,
                      fontWeight: 700,
                      color: (inspectingHolding.currentValue - inspectingHolding.invested) >= 0 ? THEME.sage : THEME.rust,
                      marginTop: 2,
                    }}
                  >
                    {(inspectingHolding.currentValue - inspectingHolding.invested) >= 0 ? "+" : ""}
                    <Money value={inspectingHolding.currentValue - inspectingHolding.invested} variant="exact" />
                  </div>
                </div>
              </div>

              {/* Cash Flow Ledger */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink, marginBottom: 8 }}>
                  Underlying Cash Flows Used in calcXIRR:
                </div>
                <div style={{ border: `1px solid ${THEME.line}`, borderRadius: 10, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ background: "var(--surface-1)", borderBottom: `1px solid ${THEME.line}`, textAlign: "left" }}>
                        <th style={{ padding: "8px 10px", color: THEME.muted, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase" }}>#</th>
                        <th style={{ padding: "8px 10px", color: THEME.muted, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase" }}>Date</th>
                        <th style={{ padding: "8px 10px", color: THEME.muted, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase" }}>Event</th>
                        <th style={{ padding: "8px 10px", color: THEME.muted, fontWeight: 700, fontSize: 10.5, textTransform: "uppercase", textAlign: "right" }}>Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(inspectingHolding.cashFlows || []).map((cf: any, idx: number) => {
                        const isOut = cf.amount < 0;
                        return (
                          <tr key={idx} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                            <td style={{ padding: "8px 10px", color: THEME.muted }}>{idx + 1}</td>
                            <td style={{ padding: "8px 10px", fontWeight: 600, color: THEME.ink, fontVariantNumeric: "tabular-nums" }}>{cf.date}</td>
                            <td style={{ padding: "8px 10px", color: THEME.ink }}>
                              <div>{cf.type || (isOut ? "Outflow" : "Inflow")}</div>
                              {cf.note && <div style={{ fontSize: 10.5, color: THEME.muted }}>{cf.note}</div>}
                            </td>
                            <td
                              style={{
                                padding: "8px 10px",
                                textAlign: "right",
                                fontWeight: 700,
                                color: isOut ? THEME.rust : THEME.sage,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {isOut ? "–" : "+"}
                              <Money value={Math.abs(cf.amount)} variant="exact" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "14px 22px",
                borderTop: `1.5px solid ${THEME.line}`,
                background: "var(--surface-1)",
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <Button variant="secondary" size="sm" onClick={() => setInspectingHolding(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
