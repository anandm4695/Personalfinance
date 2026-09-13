/* eslint-disable */
import React, { useState, useMemo } from "react";
import {
  IndianRupee,
  TrendingUp,
  Coins,
  FileText,
  Target,
  Repeat,
  Shield,
  Briefcase,
  Calendar,
  Download,
  Printer,
  Search,
  Filter,
  SlidersHorizontal,
  Layers,
  Flame,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  CheckCircle2,
  Calculator,
  PiggyBank,
  Home,
  Percent,
  ArrowUpRight,
  Zap,
  Receipt,
  Activity,
  Building2,
  Landmark,
  ShieldCheck,
  Check,
  PieChart as PieIcon,
  BarChart3,
  CalendarDays,
  Lock,
  Unlock,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { THEME } from "../../utils/constants";
import {
  fmtINRFull,
  fmtINRExact,
  today,
  exportArrayToCSV,
  calculateEpfBalance,
  fdMaturity,
  rdMaturity,
  addMonthsToDateStr,
} from "../../utils/finance";
import { Money } from "../ui/Money";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { StatCard } from "../ui/StatCard";

// Helpers
const isFdMatured = (f: any): boolean => {
  let matStr = f?.maturityDate;
  if (!matStr && f?.startDate && f?.years && !isNaN(Number(f.years))) {
    matStr = addMonthsToDateStr(f.startDate, Math.round(Number(f.years) * 12));
  }
  if (!matStr) return false;
  const [y, m, d] = String(matStr).split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
  const matDate = new Date(y, m - 1, d);
  const nowDate = new Date();
  nowDate.setHours(0, 0, 0, 0);
  return matDate.getTime() < nowDate.getTime();
};

const isBondMatured = (b: any): boolean => {
  if (!b?.maturityDate) return false;
  const [y, m, d] = String(b.maturityDate).split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
  const matDate = new Date(y, m - 1, d);
  const nowDate = new Date();
  nowDate.setHours(0, 0, 0, 0);
  return matDate.getTime() < nowDate.getTime();
};

const bondAnnualCoupon = (b: any): number => {
  const principal =
    Number(b?.totalPrincipalAmount || 0) ||
    Number(b?.numberOfUnits || 0) * Number(b?.faceValuePerUnit || 0) ||
    Number(b?.totalInvestmentAmount || 0) ||
    Number(b?.faceValue || 0);
  return (principal * (Number(b?.coupon) || 0)) / 100;
};

// Rates
const PPF_RATE = 7.1;
const EPF_RATE = 8.25;
const GOVT_RATES: Record<string, number> = {
  SSY: 8.2,
  SCSS: 8.2,
  NSC: 7.7,
  KVP: 7.5,
  POST_MIS: 7.4,
  RBI_BOND: 8.05,
  MAHILA_SAMMAN: 7.5,
  NPS_LITE: 7.0,
};

export type TaxSlabRate = 0 | 0.1 | 0.2 | 0.312; // 0%, 10%, 20%, 30%+4%cess (31.2%)

export interface YieldStreamItem {
  id: string;
  label: string;
  category: "cash" | "retirement" | "realestate";
  value: number; // Pre-tax annual yield
  postTaxValue: number; // In-hand after slab tax
  capital: number;
  rateBadge: string;
  effectiveRate: number;
  count: number;
  color: string;
  icon: any;
  note: string;
  isEstimate?: boolean;
  isTaxFree?: boolean;
  payoutFrequency: "Monthly" | "Quarterly" | "Semi-Annual" | "Annual" | "Variable" | "Compounding";
  underlyingItems: Array<{
    id: string;
    name: string;
    institution?: string;
    principal: number;
    rate: number;
    annualYield: number;
    postTaxYield: number;
    payoutFrequency: string;
    maturityDate?: string;
    isTaxFree?: boolean;
  }>;
}

export function YieldTrackerSection({ state }: { state: any }) {
  const [viewMode, setViewMode] = useState<
    "overview" | "ledger" | "calendar" | "tax" | "fire"
  >("overview");
  const [activeCategory, setActiveCategory] = useState<"all" | "cash" | "retirement">("all");
  const [taxSlab, setTaxSlab] = useState<TaxSlabRate>(0.312); // Default to standard 30% + cess
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStreamFilter, setSelectedStreamFilter] = useState<string>("all");
  const [expandedStreams, setExpandedStreams] = useState<Record<string, boolean>>({});

  // FIRE Calculator state
  const [fireMonthlyGoal, setFireMonthlyGoal] = useState<number>(100000);
  const [simCapitalAdd, setSimCapitalAdd] = useState<number>(1000000);
  const [simRateAdd, setSimRateAdd] = useState<number>(8.0);
  const [simTaxFree, setSimTaxFree] = useState<boolean>(false);

  // 1. Fixed Deposits (Quarterly Compounding, Active only)
  const activeFds = useMemo(() => {
    return (state?.fixedDeposits || []).filter((f: any) => {
      if (isFdMatured(f)) return false;
      return (Number(f.principal) || 0) > 0;
    });
  }, [state?.fixedDeposits]);

  const fdPrincipal = activeFds.reduce((s: number, f: any) => s + (Number(f.principal) || 0), 0);
  const fdInterest = activeFds.reduce((s: number, f: any) => {
    const principal = Number(f.principal || 0);
    const rate = Number(f.rate || 0);
    if (principal <= 0 || rate <= 0) return s;
    return s + (fdMaturity(principal, rate, 1) - principal);
  }, 0);
  const fdEffectiveRate = fdPrincipal > 0 ? (fdInterest / fdPrincipal) * 100 : 0;
  const fdUnderlying = activeFds.map((f: any) => {
    const principal = Number(f.principal || 0);
    const rate = Number(f.rate || 0);
    const interest = fdMaturity(principal, rate, 1) - principal;
    const postTax = interest * (1 - taxSlab);
    return {
      id: f.id || `fd-${f.bank}-${principal}`,
      name: `${f.bank || "Bank"} Fixed Deposit`,
      institution: f.bank || "Bank",
      principal,
      rate,
      annualYield: interest,
      postTaxYield: postTax,
      payoutFrequency: "Quarterly",
      maturityDate: f.maturityDate || (f.startDate && f.years ? addMonthsToDateStr(f.startDate, Math.round(Number(f.years) * 12)) : "Active"),
      isTaxFree: false,
    };
  });

  // 2. Bonds & Debentures (Contractual coupon, Active only)
  const activeBonds = useMemo(() => {
    return (state?.bonds || []).filter((b: any) => !isBondMatured(b));
  }, [state?.bonds]);

  const bondPrincipal = activeBonds.reduce((s: number, b: any) => {
    return (
      s +
      (Number(b?.totalPrincipalAmount || 0) ||
        Number(b?.numberOfUnits || 0) * Number(b?.faceValuePerUnit || 0) ||
        Number(b?.totalInvestmentAmount || 0) ||
        Number(b?.faceValue || 0))
    );
  }, 0);
  const bondInterest = activeBonds.reduce((s: number, b: any) => s + bondAnnualCoupon(b), 0);
  const bondEffectiveRate = bondPrincipal > 0 ? (bondInterest / bondPrincipal) * 100 : 0;
  const bondUnderlying = activeBonds.map((b: any) => {
    const principal =
      Number(b?.totalPrincipalAmount || 0) ||
      Number(b?.numberOfUnits || 0) * Number(b?.faceValuePerUnit || 0) ||
      Number(b?.totalInvestmentAmount || 0) ||
      Number(b?.faceValue || 0);
    const coupon = Number(b?.coupon || 0);
    const annualYield = (principal * coupon) / 100;
    const isTaxFree =
      (b.name || "").toLowerCase().includes("tax free") ||
      (b.name || "").toLowerCase().includes("tax-free") ||
      b.taxCategory === "tax_free";
    const postTaxYield = isTaxFree ? annualYield : annualYield * (1 - taxSlab);
    return {
      id: b.id || `bond-${b.name}-${principal}`,
      name: b.name || "Bond / Debenture",
      institution: b.issuer || "Government / PSU",
      principal,
      rate: coupon,
      annualYield,
      postTaxYield,
      payoutFrequency: (b.frequency || "Semi-Annual") as string,
      maturityDate: b.maturityDate || "Perpetual / Active",
      isTaxFree,
    };
  });

  // 3. Government / Post Office Schemes
  const activeGovtSchemes = useMemo(() => {
    return (state?.govtSchemes || []).filter((sc: any) => {
      if (sc.maturityDate && sc.maturityDate < today()) return false;
      return (Number(sc.currentBalance || sc.principal || sc.investedAmount) || 0) > 0;
    });
  }, [state?.govtSchemes]);

  const govtPrincipal = activeGovtSchemes.reduce(
    (s: number, sc: any) =>
      s + (Number(sc.currentBalance || sc.principal || sc.investedAmount) || 0),
    0
  );
  const govtInterest = activeGovtSchemes.reduce((s: number, sc: any) => {
    const rate = Number(sc.interestRate) || GOVT_RATES[sc.schemeType] || 7.5;
    const balance = Number(sc.currentBalance || sc.principal || sc.investedAmount) || 0;
    return s + (balance * rate) / 100;
  }, 0);
  const govtEffectiveRate = govtPrincipal > 0 ? (govtInterest / govtPrincipal) * 100 : 0;
  const govtUnderlying = activeGovtSchemes.map((sc: any) => {
    const rate = Number(sc.interestRate) || GOVT_RATES[sc.schemeType] || 7.5;
    const balance = Number(sc.currentBalance || sc.principal || sc.investedAmount) || 0;
    const annualYield = (balance * rate) / 100;
    const isTaxFree = sc.schemeType === "SSY" || (sc.schemeName || "").includes("Sukanya");
    const postTaxYield = isTaxFree ? annualYield : annualYield * (1 - taxSlab);
    const freq =
      sc.schemeType === "POST_MIS"
        ? "Monthly"
        : sc.schemeType === "SCSS"
        ? "Quarterly"
        : sc.schemeType === "RBI_BOND"
        ? "Semi-Annual"
        : "Compounding";
    return {
      id: sc.id || `govt-${sc.schemeType}-${balance}`,
      name: sc.schemeName || sc.schemeType || "Government Scheme",
      institution: "Post Office / RBI",
      principal: balance,
      rate,
      annualYield,
      postTaxYield,
      payoutFrequency: freq,
      maturityDate: sc.maturityDate || "Ongoing",
      isTaxFree,
    };
  });

  // 4. Recurring Deposits
  const activeRds = useMemo(() => {
    return (state?.recurringDeposits || []).filter((r: any) => {
      const tenureMonths = Number(r.tenureMonths) || 0;
      if (!tenureMonths) return false;
      if (r.maturityDate && r.maturityDate < today()) return false;
      if (r.startDate && addMonthsToDateStr(r.startDate, tenureMonths) < today()) return false;
      return (Number(r.monthly) || 0) > 0;
    });
  }, [state?.recurringDeposits]);

  const rdDepositedPrincipal = activeRds.reduce((s: number, r: any) => {
    const tenureMonths = Number(r.tenureMonths) || 0;
    return s + (Number(r.monthly) || 0) * tenureMonths;
  }, 0);
  const rdInterest = activeRds.reduce((s: number, r: any) => {
    const tenureMonths = Number(r.tenureMonths) || 0;
    const monthly = Number(r.monthly) || 0;
    const rate = Number(r.rate) || 0;
    if (!tenureMonths || !monthly || !rate) return s;
    const fullMaturity = rdMaturity(monthly, rate, tenureMonths);
    const fullDeposited = monthly * tenureMonths;
    const annualisedInterest = (fullMaturity - fullDeposited) / (tenureMonths / 12);
    return s + Math.max(0, annualisedInterest);
  }, 0);
  const rdEffectiveRate = rdDepositedPrincipal > 0 ? (rdInterest / rdDepositedPrincipal) * 100 : 0;
  const rdUnderlying = activeRds.map((r: any) => {
    const tenureMonths = Number(r.tenureMonths) || 0;
    const monthly = Number(r.monthly) || 0;
    const rate = Number(r.rate) || 0;
    const fullMaturity = rdMaturity(monthly, rate, tenureMonths);
    const fullDeposited = monthly * tenureMonths;
    const annualisedInterest = (fullMaturity - fullDeposited) / (tenureMonths / 12);
    const postTaxYield = annualisedInterest * (1 - taxSlab);
    return {
      id: r.id || `rd-${r.bank}-${monthly}`,
      name: `${r.bank || "Bank"} RD (₹${monthly.toLocaleString("en-IN")}/mo)`,
      institution: r.bank || "Bank",
      principal: fullDeposited,
      rate,
      annualYield: Math.max(0, annualisedInterest),
      postTaxYield: Math.max(0, postTaxYield),
      payoutFrequency: "Compounding",
      maturityDate: r.maturityDate || (r.startDate ? addMonthsToDateStr(r.startDate, tenureMonths) : "Active"),
      isTaxFree: false,
    };
  });

  // 5. Dividends (TTM)
  const oneYearAgoStr = useMemo(() => {
    const [y, m, d] = today().split("-").map(Number);
    return `${y - 1}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }, []);

  const ttmDividends = useMemo(() => {
    return (state?.dividends || []).filter(
      (d: any) => d.paymentDate && d.paymentDate >= oneYearAgoStr
    );
  }, [state?.dividends, oneYearAgoStr]);

  const dividendYield = ttmDividends.reduce((s: number, d: any) => {
    return s + Math.max(0, (Number(d.amount) || 0) - (Number(d.tds) || 0));
  }, 0);

  const stockPortfolioVal = useMemo(() => {
    return (state?.stocks || []).reduce((s: number, st: any) => {
      const qty = Number(st.shares || st.quantity || st.units || 0);
      const price = Number(st.currentPrice || st.cmp || st.buyPrice || st.avgBuyPrice || 0);
      return s + (qty * price || Number(st.invested || 0));
    }, 0);
  }, [state?.stocks]);

  const dividendEffectiveRate =
    stockPortfolioVal > 0 ? (dividendYield / stockPortfolioVal) * 100 : 0;

  const dividendUnderlying = ttmDividends.map((d: any) => {
    const net = Math.max(0, (Number(d.amount) || 0) - (Number(d.tds) || 0));
    return {
      id: d.id || `div-${d.symbol}-${d.paymentDate}`,
      name: d.symbol ? `${d.symbol} Dividend` : d.fundName || "Stock Dividend",
      institution: d.symbol || "Equity Market",
      principal: 0,
      rate: 0,
      annualYield: net,
      postTaxYield: net, // Already net of TDS
      payoutFrequency: "Variable",
      maturityDate: d.paymentDate,
      isTaxFree: false,
    };
  });

  // 6. EPF / EPFO (Statutory 8.25% p.a.)
  const epfPrincipal = (state?.epf || []).reduce(
    (s: number, e: any) => s + calculateEpfBalance(e),
    0
  );
  const epfInterest = (epfPrincipal * EPF_RATE) / 100;
  const epfUnderlying = (state?.epf || []).map((e: any, idx: number) => {
    const bal = calculateEpfBalance(e);
    const yieldVal = (bal * EPF_RATE) / 100;
    return {
      id: e.id || `epf-${idx}`,
      name: e.companyName ? `EPF (${e.companyName})` : "Employees Provident Fund",
      institution: "EPFO India",
      principal: bal,
      rate: EPF_RATE,
      annualYield: yieldVal,
      postTaxYield: yieldVal, // Tax exempt under statutory limit
      payoutFrequency: "Annual",
      maturityDate: "Retirement (Age 58)",
      isTaxFree: true,
    };
  });

  // 7. PPF (Public Provident Fund @ 7.10% Tax-Free)
  const ppfPrincipal = (state?.ppf || []).reduce((s: number, p: any) => {
    const manualBalance = Number(p.balance) || 0;
    if (manualBalance > 0) return s + manualBalance;
    const txs = p.transactions || [];
    if (txs.length > 0) {
      const deposits = txs
        .filter((t: any) => t.type === "deposit")
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      const withdrawals = txs
        .filter((t: any) => t.type === "withdrawal")
        .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      return s + Math.max(0, deposits - withdrawals);
    }
    return s;
  }, 0);
  const ppfInterest = (ppfPrincipal * PPF_RATE) / 100;
  const ppfUnderlying = (state?.ppf || []).map((p: any, idx: number) => {
    let bal = Number(p.balance) || 0;
    if (bal <= 0 && p.transactions?.length) {
      bal = p.transactions.reduce((acc: number, t: any) => acc + (t.type === "deposit" ? Number(t.amount || 0) : -Number(t.amount || 0)), 0);
    }
    const yieldVal = (bal * PPF_RATE) / 100;
    return {
      id: p.id || `ppf-${idx}`,
      name: p.institution ? `PPF (${p.institution})` : "Public Provident Fund",
      institution: p.institution || "Designated Bank",
      principal: bal,
      rate: PPF_RATE,
      annualYield: yieldVal,
      postTaxYield: yieldVal, // Section 10(11) EEE Tax Free
      payoutFrequency: "Compounding",
      maturityDate: "15-Year EEE Sovereign",
      isTaxFree: true,
    };
  });

  // 8. NPS (National Pension System ~10% CAGR Est.)
  const npsCorpus = (state?.nps || []).reduce((s: number, n: any) => {
    const bal = Number(n.balance) || 0;
    if (bal > 0) return s + bal;
    const txCorpus = (n.transactions || []).reduce(
      (sum: number, t: any) =>
        sum + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
      0
    );
    return s + txCorpus;
  }, 0);
  const npsGrowth = (npsCorpus * 10) / 100;
  const npsUnderlying = (state?.nps || []).map((n: any, idx: number) => {
    const bal = Number(n.balance) || (n.transactions || []).reduce((sum: number, t: any) => sum + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0), 0);
    const yieldVal = (bal * 10) / 100;
    return {
      id: n.id || `nps-${idx}`,
      name: n.pran ? `NPS (PRAN: ${n.pran})` : "National Pension System Tier-I",
      institution: "PFRDA / CRA",
      principal: bal,
      rate: 10.0,
      annualYield: yieldVal,
      postTaxYield: yieldVal, // Tax deferred
      payoutFrequency: "Compounding",
      maturityDate: "Retirement (Age 60)",
      isTaxFree: true,
    };
  });

  // 9. Rental Income (Real Estate)
  const activeRentals = useMemo(() => {
    return (state?.rentalProperties || []).filter(
      (r: any) => r.isActive !== false && Number(r.monthlyRent || r.rent || 0) > 0
    );
  }, [state?.rentalProperties]);

  const rentalAnnualYield = activeRentals.reduce(
    (s: number, r: any) => s + (Number(r.monthlyRent || r.rent || 0) * 12),
    0
  );
  const rentalCapital = activeRentals.reduce(
    (s: number, r: any) => s + Number(r.marketValue || r.purchasePrice || r.cost || 0),
    0
  );
  const rentalEffectiveRate =
    rentalCapital > 0 ? (rentalAnnualYield / rentalCapital) * 100 : 0;
  const rentalUnderlying = activeRentals.map((r: any) => {
    const annual = Number(r.monthlyRent || r.rent || 0) * 12;
    // Section 24(a) allows 30% statutory deduction for repairs/maintenance!
    const taxableRental = annual * 0.70;
    const postTax = annual - (taxableRental * taxSlab);
    return {
      id: r.id || `rent-${r.name}`,
      name: r.name ? `${r.name} (Leased Out)` : "Rental Property",
      institution: r.tenantName ? `Tenant: ${r.tenantName}` : "Leased Real Estate",
      principal: Number(r.marketValue || r.purchasePrice || 0),
      rate: Number(r.marketValue || 0) > 0 ? (annual / Number(r.marketValue)) * 100 : 0,
      annualYield: annual,
      postTaxYield: postTax,
      payoutFrequency: "Monthly",
      maturityDate: "Lease / Rental Flow",
      isTaxFree: false,
    };
  });

  // Compile All Yield Streams
  const allStreams: YieldStreamItem[] = useMemo(() => {
    const streams: YieldStreamItem[] = [
      {
        id: "fd",
        label: "Fixed Deposits",
        category: "cash",
        value: fdInterest,
        postTaxValue: fdInterest * (1 - taxSlab),
        capital: fdPrincipal,
        rateBadge: fdEffectiveRate > 0 ? `${fdEffectiveRate.toFixed(2)}% effective` : `Quart. Comp.`,
        effectiveRate: fdEffectiveRate,
        count: activeFds.length,
        color: THEME.gold,
        icon: Coins,
        note: "Annual interest on active FDs (quarterly compounding)",
        payoutFrequency: "Quarterly",
        underlyingItems: fdUnderlying,
        isTaxFree: false,
      },
      {
        id: "bond",
        label: "Bonds & Debentures",
        category: "cash",
        value: bondInterest,
        postTaxValue: bondUnderlying.reduce((s, b) => s + b.postTaxYield, 0),
        capital: bondPrincipal,
        rateBadge: bondEffectiveRate > 0 ? `${bondEffectiveRate.toFixed(2)}% coupon` : `Fixed Coupon`,
        effectiveRate: bondEffectiveRate,
        count: activeBonds.length,
        color: THEME.muted,
        icon: FileText,
        note: "Contractual annual coupon payout on face value",
        payoutFrequency: "Semi-Annual",
        underlyingItems: bondUnderlying,
        isTaxFree: bondUnderlying.length > 0 && bondUnderlying.every((b) => b.isTaxFree),
      },
      {
        id: "govt",
        label: "Govt / Post Office Schemes",
        category: "cash",
        value: govtInterest,
        postTaxValue: govtUnderlying.reduce((s, sc) => s + sc.postTaxYield, 0),
        capital: govtPrincipal,
        rateBadge: govtEffectiveRate > 0 ? `${govtEffectiveRate.toFixed(2)}% p.a.` : "7.40–8.20%",
        effectiveRate: govtEffectiveRate,
        count: activeGovtSchemes.length,
        color: THEME.cyan,
        icon: Target,
        note: "SCSS, Post Office MIS, SSY, NSC & RBI Bonds",
        payoutFrequency: "Quarterly",
        underlyingItems: govtUnderlying,
        isTaxFree: false,
      },
      {
        id: "rd",
        label: "Recurring Deposits",
        category: "cash",
        value: rdInterest,
        postTaxValue: rdInterest * (1 - taxSlab),
        capital: rdDepositedPrincipal,
        rateBadge: rdEffectiveRate > 0 ? `${rdEffectiveRate.toFixed(2)}% p.a.` : "Annualised",
        effectiveRate: rdEffectiveRate,
        count: activeRds.length,
        color: THEME.accent,
        icon: Repeat,
        note: "Annualised interest across active RD contracts",
        payoutFrequency: "Compounding",
        underlyingItems: rdUnderlying,
        isTaxFree: false,
      },
      {
        id: "dividends",
        label: "Dividends (TTM)",
        category: "cash",
        value: dividendYield,
        postTaxValue: dividendYield, // Net of TDS
        capital: stockPortfolioVal,
        rateBadge:
          dividendEffectiveRate > 0
            ? `${dividendEffectiveRate.toFixed(2)}% div yield`
            : "Net of TDS",
        effectiveRate: dividendEffectiveRate,
        count: ttmDividends.length,
        color: THEME.rust,
        icon: IndianRupee,
        note: "Trailing 12-month net dividend receipts logged",
        payoutFrequency: "Variable",
        underlyingItems: dividendUnderlying,
        isTaxFree: false,
      },
      {
        id: "rental",
        label: "Rental Income",
        category: "cash",
        value: rentalAnnualYield,
        postTaxValue: rentalUnderlying.reduce((s, r) => s + r.postTaxYield, 0),
        capital: rentalCapital,
        rateBadge: rentalEffectiveRate > 0 ? `${rentalEffectiveRate.toFixed(2)}% gross yield` : "Active Leases",
        effectiveRate: rentalEffectiveRate,
        count: activeRentals.length,
        color: THEME.sage,
        icon: Home,
        note: "Contractual annual rental cash flows (30% statutory Sec 24(a) tax deduction applied)",
        payoutFrequency: "Monthly",
        underlyingItems: rentalUnderlying,
        isTaxFree: false,
      },
      {
        id: "epf",
        label: "EPF / EPFO",
        category: "retirement",
        value: epfInterest,
        postTaxValue: epfInterest,
        capital: epfPrincipal,
        rateBadge: `@ ${EPF_RATE}% p.a.`,
        effectiveRate: EPF_RATE,
        count: (state?.epf || []).length,
        color: THEME.sage,
        icon: Shield,
        note: "Declared statutory interest on cumulative EPF balance",
        payoutFrequency: "Annual",
        underlyingItems: epfUnderlying,
        isTaxFree: true,
      },
      {
        id: "ppf",
        label: "PPF (Public Provident)",
        category: "retirement",
        value: ppfInterest,
        postTaxValue: ppfInterest,
        capital: ppfPrincipal,
        rateBadge: `@ ${PPF_RATE}% p.a.`,
        effectiveRate: PPF_RATE,
        count: (state?.ppf || []).length,
        color: THEME.sage,
        icon: Shield,
        note: "Tax-free compound interest on PPF balance",
        payoutFrequency: "Compounding",
        underlyingItems: ppfUnderlying,
        isTaxFree: true,
      },
      {
        id: "nps",
        label: "NPS Growth (Est.)",
        category: "retirement",
        value: npsGrowth,
        postTaxValue: npsGrowth,
        capital: npsCorpus,
        rateBadge: "~10.0% CAGR",
        effectiveRate: 10.0,
        count: (state?.nps || []).length,
        color: THEME.violet,
        icon: Briefcase,
        note: "Blended market CAGR projection — capital appreciation, not cash payout",
        isEstimate: true,
        payoutFrequency: "Compounding",
        underlyingItems: npsUnderlying,
        isTaxFree: true,
      },
    ];

    return streams.filter((s) => s.value > 0);
  }, [
    fdInterest,
    fdPrincipal,
    fdEffectiveRate,
    activeFds.length,
    fdUnderlying,
    bondInterest,
    bondPrincipal,
    bondEffectiveRate,
    activeBonds.length,
    bondUnderlying,
    govtInterest,
    govtPrincipal,
    govtEffectiveRate,
    activeGovtSchemes.length,
    govtUnderlying,
    rdInterest,
    rdDepositedPrincipal,
    rdEffectiveRate,
    activeRds.length,
    rdUnderlying,
    dividendYield,
    stockPortfolioVal,
    dividendEffectiveRate,
    ttmDividends.length,
    dividendUnderlying,
    rentalAnnualYield,
    rentalCapital,
    rentalEffectiveRate,
    activeRentals.length,
    rentalUnderlying,
    epfInterest,
    epfPrincipal,
    state?.epf,
    epfUnderlying,
    ppfInterest,
    ppfPrincipal,
    state?.ppf,
    ppfUnderlying,
    npsGrowth,
    npsCorpus,
    state?.nps,
    npsUnderlying,
    taxSlab,
  ]);

  const filteredStreams = useMemo(() => {
    return allStreams.filter((s) => {
      if (activeCategory === "all") return true;
      if (activeCategory === "cash") return s.category === "cash";
      if (activeCategory === "retirement") return s.category === "retirement";
      return true;
    });
  }, [allStreams, activeCategory]);

  // Aggregate Metrics
  const contractualAnnual = useMemo(() => {
    return allStreams.filter((s) => !s.isEstimate).reduce((s, x) => s + x.value, 0);
  }, [allStreams]);

  const estimatedAnnual = useMemo(() => {
    return allStreams.filter((s) => s.isEstimate).reduce((s, x) => s + x.value, 0);
  }, [allStreams]);

  const totalAnnual = contractualAnnual + estimatedAnnual;
  const totalMonthly = totalAnnual / 12;
  const totalDaily = totalAnnual / 365;

  const totalPostTaxAnnual = useMemo(() => {
    return allStreams.reduce((s, x) => s + x.postTaxValue, 0);
  }, [allStreams]);
  const totalPostTaxMonthly = totalPostTaxAnnual / 12;

  const contractualCapital = useMemo(() => {
    return allStreams.filter((s) => !s.isEstimate).reduce((s, x) => s + x.capital, 0);
  }, [allStreams]);

  const totalCapital = useMemo(() => {
    return allStreams.reduce((s, x) => s + x.capital, 0);
  }, [allStreams]);

  const weightedYieldRate =
    contractualCapital > 0 ? (contractualAnnual / contractualCapital) * 100 : 0;
  const weightedPostTaxYieldRate =
    totalCapital > 0 ? (totalPostTaxAnnual / totalCapital) * 100 : 0;

  const taxFreeYieldTotal = useMemo(() => {
    return allStreams
      .filter((s) => s.isTaxFree || s.id === "ppf" || s.id === "epf")
      .reduce((s, x) => s + x.value, 0);
  }, [allStreams]);

  const maxVal = Math.max(...filteredStreams.map((s) => s.value), 1);

  // Toggle Stream Expansion in Ledger View
  const toggleStream = (id: string) => {
    setExpandedStreams((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    const rows = allStreams.flatMap((s) =>
      s.underlyingItems.map((u) => ({
        Stream: s.label,
        Category: s.category.toUpperCase(),
        InstrumentName: u.name,
        Institution: u.institution || "—",
        CapitalDeployed: u.principal,
        YieldRatePercent: u.rate,
        PreTaxAnnualYield: u.annualYield,
        PostTaxAnnualYield: u.postTaxYield,
        PayoutCadence: u.payoutFrequency,
        MaturityOrDate: u.maturityDate || "—",
        TaxFreeStatus: u.isTaxFree ? "TAX-FREE" : "TAXABLE",
      }))
    );

    exportArrayToCSV(rows, `portfolio-yield-breakdown-${today()}.csv`);
  };

  // Cash Flow Calendar monthly estimates
  const monthlyFlowDistribution = useMemo(() => {
    const months = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
    return months.map((m) => {
      // Monthly streams (Rental, PO MIS) flow 100% every month
      const monthlyStreamsAmt = (rentalAnnualYield / 12) + (allStreams.find((s) => s.id === "govt")?.underlyingItems.filter((g) => g.payoutFrequency === "Monthly").reduce((acc, x) => acc + x.annualYield / 12, 0) || 0);
      // Quarterly streams (FD, SCSS) flow in Jun, Sep, Dec, Mar
      const isQuarterEnd = ["Jun", "Sep", "Dec", "Mar"].includes(m);
      const quarterlyAmt = isQuarterEnd ? ((fdInterest + (govtInterest * 0.7)) / 4) : 0;
      // Dividends seasonality peak in Jul, Aug, Sep, Feb
      const isDividendPeak = ["Jul", "Aug", "Sep", "Feb"].includes(m);
      const dividendAmt = isDividendPeak ? (dividendYield / 4) : 0;
      // Semi-Annual bonds in Jun & Dec
      const isSemiAnnual = ["Jun", "Dec"].includes(m);
      const bondAmt = isSemiAnnual ? (bondInterest / 2) : 0;
      // Compounding / Retirement run rate
      const compoundingMonthly = (epfInterest + ppfInterest + npsGrowth) / 12;

      const totalMonthFlow = monthlyStreamsAmt + quarterlyAmt + dividendAmt + bondAmt + compoundingMonthly;

      return {
        month: m,
        CashPayouts: Math.round(monthlyStreamsAmt + quarterlyAmt + dividendAmt + bondAmt),
        CompoundingAccruals: Math.round(compoundingMonthly),
        Total: Math.round(totalMonthFlow),
      };
    });
  }, [rentalAnnualYield, allStreams, fdInterest, govtInterest, dividendYield, bondInterest, epfInterest, ppfInterest, npsGrowth]);

  // FIRE calculation
  const fireCurrentMonthly = totalMonthly;
  const fireMonthlyShortfall = Math.max(0, fireMonthlyGoal - fireCurrentMonthly);
  const effectiveAnnualRateForCalc = weightedYieldRate > 0 ? weightedYieldRate : 7.5;
  const fireRequiredAdditionalCapital = (fireMonthlyShortfall * 12) / (effectiveAnnualRateForCalc / 100);
  const fireProgressPct = fireMonthlyGoal > 0 ? Math.min(100, (fireCurrentMonthly / fireMonthlyGoal) * 100) : 0;

  // What-if simulator
  const simAddedAnnualYield = (simCapitalAdd * simRateAdd) / 100;
  const simAddedMonthly = simAddedAnnualYield / 12;
  const simNewTotalAnnual = totalAnnual + simAddedAnnualYield;
  const simNewTotalMonthly = totalMonthly + simAddedMonthly;

  // Chart data for asset mix
  const chartData = useMemo(() => {
    return allStreams.map((s) => ({
      name: s.label,
      value: Math.round(s.value),
      color: s.color,
      category: s.category,
    }));
  }, [allStreams]);

  return (
    <div className="tab-content-enter">
      {/* ── HEADER & CONTROLS ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: THEME.ink,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <Zap size={24} color={THEME.accent} />
            Yield &amp; Passive Income Tracker
          </div>
          <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
            Portfolio cash-flow engine, statutory compounding accruals, post-tax real yields &amp; FIRE target simulator
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {/* Tax Slab Selector */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "var(--surface-1)",
              padding: "4px 10px",
              borderRadius: 10,
              border: `1px solid ${THEME.line}`,
              fontSize: 11,
              color: THEME.muted,
            }}
          >
            <ShieldCheck size={14} color={THEME.accent} />
            <span>Tax Slab:</span>
            {[
              { label: "0%", val: 0 },
              { label: "10%", val: 0.1 },
              { label: "20%", val: 0.2 },
              { label: "30% (Old/New)", val: 0.312 },
            ].map((s) => (
              <button
                key={s.label}
                onClick={() => setTaxSlab(s.val as TaxSlabRate)}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: "none",
                  fontSize: 10,
                  fontWeight: taxSlab === s.val ? 800 : 500,
                  background: taxSlab === s.val ? THEME.accent : "transparent",
                  color: taxSlab === s.val ? "#ffffff" : THEME.muted,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            icon={<Download size={13} />}
            onClick={handleExportCSV}
            title="Download CSV Audit of all Yield Streams"
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Printer size={13} />}
            onClick={() => window.print()}
            title="Print Yield Summary Report"
          >
            Print
          </Button>
        </div>
      </div>

      {/* ── TOP KPI STAT TILES ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <StatCard
          label="Annual Yield"
          value={fmtINRFull(totalAnnual)}
          numericValue={totalAnnual}
          formatValue={fmtINRFull}
          icon={<IndianRupee />}
          color={THEME.accent}
          sub={
            estimatedAnnual > 0 ? (
              <>
                {fmtINRFull(contractualAnnual)} contractual + {fmtINRFull(estimatedAnnual)} est.
              </>
            ) : (
              "Combined interest, coupons & dividends"
            )
          }
        />
        <StatCard
          label="Post-Tax Real Yield"
          value={fmtINRFull(totalPostTaxAnnual)}
          numericValue={totalPostTaxAnnual}
          formatValue={fmtINRFull}
          icon={<ShieldCheck />}
          color={THEME.sage}
          sub={`@ ${(taxSlab * 100).toFixed(1)}% marginal slab in-hand`}
        />
        <StatCard
          label="Weighted Yield Rate"
          value={`${weightedYieldRate > 0 ? weightedYieldRate.toFixed(2) : "0.00"}% p.a.`}
          numericValue={weightedYieldRate}
          formatValue={(n: number) => `${n.toFixed(2)}% p.a.`}
          icon={<Activity />}
          color={THEME.gold}
          sub={`On ${fmtINRFull(contractualCapital)} active capital`}
        />
        <StatCard
          label="Monthly Income"
          value={fmtINRFull(totalMonthly)}
          numericValue={totalMonthly}
          formatValue={fmtINRFull}
          icon={<Receipt />}
          color={THEME.sage}
          sub={`Post-tax: ~${fmtINRFull(totalPostTaxMonthly)}/mo`}
        />
        <StatCard
          label="Daily Passive"
          value={fmtINRFull(totalDaily)}
          numericValue={totalDaily}
          formatValue={fmtINRFull}
          icon={<Zap />}
          color={THEME.accent}
          sub="₹ earned per day"
        />
        <StatCard
          label="Capital Deployed"
          value={fmtINRFull(totalCapital)}
          numericValue={totalCapital}
          formatValue={fmtINRFull}
          icon={<Target />}
          color={THEME.muted}
          sub={`${allStreams.length} active yielding streams`}
        />
      </div>

      {/* ── 5 EXECUTIVE VIEW TABS ── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          background: "var(--surface-1)",
          padding: 4,
          borderRadius: 12,
          border: `1px solid ${THEME.line}`,
          marginBottom: 20,
          overflowX: "auto",
        }}
      >
        {[
          { id: "overview", label: "Executive Overview", icon: Layers },
          { id: "ledger", label: "Granular Asset Ledger", icon: FileText },
          { id: "calendar", label: "Cash Flow & Payout Calendar", icon: CalendarDays },
          { id: "tax", label: "Tax Efficiency & Real Yield", icon: Percent },
          { id: "fire", label: "FIRE & Target Simulator", icon: Calculator },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = viewMode === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id as any)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                borderRadius: 9,
                border: "none",
                fontSize: 12,
                fontWeight: isActive ? 800 : 600,
                background: isActive ? THEME.accent : "transparent",
                color: isActive ? "#ffffff" : THEME.muted,
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {allStreams.length === 0 ? (
        <Card style={{ padding: "54px 32px", textAlign: "center" as const }}>
          <PiggyBank size={54} color={THEME.muted} style={{ margin: "0 auto 16px" }} />
          <div style={{ fontSize: 20, fontWeight: 800, color: THEME.ink, marginBottom: 8 }}>
            No Yield Data Yet
          </div>
          <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 420, margin: "0 auto", lineHeight: 1.6 }}>
            Add Fixed Deposits, Bonds, PPF, EPF, Recurring Deposits, Govt Schemes, Rental Properties, NPS or Dividends
            to track your automated income stream breakdown here.
          </div>
        </Card>
      ) : (
        <>
          {/* ═════════ 1. EXECUTIVE OVERVIEW VIEW ═════════ */}
          {viewMode === "overview" && (
            <div style={{ display: "grid", gap: 20 }}>
              {/* Visual Asset Mix & Yield Distribution */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: 16,
                }}
              >
                {/* Donut Chart */}
                <Card style={{ padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <PieIcon size={16} color={THEME.accent} />
                    Yield Share by Asset Class
                  </div>
                  <div style={{ height: 240, width: "100%" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: any) => [fmtINRFull(Number(value)) + " /yr", "Annual Yield"]}
                          contentStyle={{
                            background: "var(--surface-1)",
                            borderColor: THEME.line,
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 11, paddingTop: 6 }}
                          formatter={(value) => <span style={{ color: THEME.ink, fontSize: 11 }}>{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                {/* Pre-Tax vs Post-Tax Comparison Bar Chart */}
                <Card style={{ padding: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <BarChart3 size={16} color={THEME.sage} />
                    Pre-Tax vs In-Hand Net Yield (₹/yr)
                  </div>
                  <div style={{ height: 240, width: "100%" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={allStreams.map((s) => ({
                          name: s.label.replace(" (TTM)", "").replace(" (Public Provident)", ""),
                          PreTax: Math.round(s.value),
                          PostTax: Math.round(s.postTaxValue),
                        }))}
                        margin={{ top: 10, right: 10, left: 10, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: THEME.muted }} angle={-20} textAnchor="end" />
                        <YAxis tick={{ fontSize: 10, fill: THEME.muted }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                        <Tooltip
                          formatter={(v: any, name: any) => [fmtINRFull(Number(v)), name === "PreTax" ? "Pre-Tax Yield" : "In-Hand Post-Tax"]}
                          contentStyle={{ background: "var(--surface-1)", borderColor: THEME.line, borderRadius: 8, fontSize: 12 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="PreTax" fill={THEME.gold} name="Pre-Tax Yield" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="PostTax" fill={THEME.sage} name="Post-Tax In-Hand" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>

              {/* Main Streams Card */}
              <Card style={{ padding: 24 }}>
                {/* Header and Category Pills */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: THEME.muted,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.08em",
                      }}
                    >
                      Yield Breakdown by Instrument
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                      Accounting audit of active cash flows and compounding interest
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      background: "var(--surface-1)",
                      padding: 4,
                      borderRadius: 10,
                      border: `1px solid ${THEME.line}`,
                    }}
                  >
                    {[
                      { id: "all", label: `All Streams (${allStreams.length})` },
                      {
                        id: "cash",
                        label: `Cash Flow (${allStreams.filter((s) => s.category === "cash").length})`,
                      },
                      {
                        id: "retirement",
                        label: `Retirement & Compounding (${
                          allStreams.filter((s) => s.category === "retirement").length
                        })`,
                      },
                    ].map((pill) => (
                      <button
                        key={pill.id}
                        onClick={() => setActiveCategory(pill.id as any)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 8,
                          border: "none",
                          fontSize: 11,
                          fontWeight: activeCategory === pill.id ? 700 : 500,
                          background: activeCategory === pill.id ? THEME.accent : "transparent",
                          color: activeCategory === pill.id ? "#ffffff" : THEME.muted,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {pill.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Breakdown List */}
                <div style={{ display: "grid", gap: 14 }}>
                  {filteredStreams.map(
                    ({
                      id,
                      label,
                      value,
                      postTaxValue,
                      capital,
                      rateBadge,
                      color,
                      icon: Icon,
                      note,
                      isEstimate,
                      isTaxFree,
                      payoutFrequency,
                      underlyingItems,
                    }) => {
                      const barPct = (value / maxVal) * 100;
                      const sharePct = totalAnnual > 0 ? (value / totalAnnual) * 100 : 0;
                      const isExpanded = !!expandedStreams[id];

                      return (
                        <div
                          key={label}
                          style={{
                            padding: "14px 16px",
                            borderRadius: 12,
                            background: "var(--surface-1)",
                            border: `1px solid ${THEME.line}`,
                            transition: "all 0.2s ease",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 8,
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div
                                style={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 8,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background: `color-mix(in srgb, ${color} 14%, transparent)`,
                                  border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
                                }}
                              >
                                <Icon size={17} color={color} />
                              </div>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                                    {label}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      padding: "2px 6px",
                                      borderRadius: 6,
                                      background: `color-mix(in srgb, ${color} 12%, transparent)`,
                                      color,
                                    }}
                                  >
                                    {rateBadge}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 700,
                                      padding: "2px 5px",
                                      borderRadius: 4,
                                      background: "var(--surface-2)",
                                      color: THEME.muted,
                                    }}
                                  >
                                    {payoutFrequency}
                                  </span>
                                  {isTaxFree && (
                                    <span
                                      style={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        padding: "2px 6px",
                                        borderRadius: 4,
                                        background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                                        color: THEME.sage,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 3,
                                      }}
                                    >
                                      <ShieldCheck size={10} /> Tax-Free
                                    </span>
                                  )}
                                  {isEstimate && (
                                    <span
                                      style={{
                                        fontSize: 9,
                                        fontWeight: 700,
                                        padding: "1px 5px",
                                        borderRadius: 4,
                                        background: `color-mix(in srgb, ${THEME.violet} 12%, transparent)`,
                                        color: THEME.violet,
                                      }}
                                    >
                                      Projection
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                                  {note}{" "}
                                  {capital > 0 && (
                                    <span style={{ opacity: 0.85 }}>
                                      • Capital: <Money value={capital} variant="full" />
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div style={{ textAlign: "right" as const }}>
                              <div
                                style={{
                                  fontFamily: "var(--font-display)",
                                  fontSize: 15,
                                  fontWeight: 900,
                                  color,
                                }}
                              >
                                <Money value={value} variant="full" />
                                <span style={{ fontSize: 10, fontWeight: 500, color: THEME.muted }}>
                                  {" "}
                                  /yr
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                                {sharePct.toFixed(1)}% of yield{" "}
                                <span style={{ opacity: 0.8, color: THEME.sage }}>
                                  (Net: <Money value={postTaxValue} variant="full" />)
                                </span>
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              height: 6,
                              borderRadius: 4,
                              background: `color-mix(in srgb, ${color} 10%, transparent)`,
                              overflow: "hidden",
                              marginBottom: 8,
                            }}
                          >
                            <div
                              style={{
                                height: "100%",
                                width: `${barPct}%`,
                                background: color,
                                borderRadius: 4,
                                transition: "width 0.4s ease",
                              }}
                            />
                          </div>

                          {/* Expansion toggle to view underlying items */}
                          {underlyingItems.length > 0 && (
                            <button
                              onClick={() => toggleStream(id)}
                              style={{
                                background: "none",
                                border: "none",
                                padding: 0,
                                fontSize: 11,
                                color: THEME.accent,
                                fontWeight: 600,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                cursor: "pointer",
                                marginTop: 4,
                              }}
                            >
                              {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                              {isExpanded ? "Hide" : "Show"} {underlyingItems.length} Underlying {underlyingItems.length === 1 ? "Holding" : "Holdings"}
                            </button>
                          )}

                          {isExpanded && (
                            <div
                              style={{
                                marginTop: 10,
                                paddingTop: 10,
                                borderTop: `1px dashed ${THEME.line}`,
                                display: "grid",
                                gap: 6,
                              }}
                            >
                              {underlyingItems.map((item) => (
                                <div
                                  key={item.id}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "6px 10px",
                                    borderRadius: 6,
                                    background: "var(--surface-2)",
                                    fontSize: 11,
                                  }}
                                >
                                  <div>
                                    <div style={{ fontWeight: 600, color: THEME.ink }}>{item.name}</div>
                                    <div style={{ color: THEME.muted, fontSize: 10 }}>
                                      {item.institution} {item.rate > 0 && `• ${item.rate}% p.a.`} {item.maturityDate && `• Due: ${item.maturityDate}`}
                                    </div>
                                  </div>
                                  <div style={{ textAlign: "right" as const }}>
                                    <div style={{ fontWeight: 700, color: THEME.ink }}>
                                      <Money value={item.annualYield} variant="full" /> /yr
                                    </div>
                                    <div style={{ color: THEME.sage, fontSize: 10 }}>
                                      In-hand: <Money value={item.postTaxYield} variant="full" />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    }
                  )}
                </div>

                {/* Bottom Totals Bar */}
                <div
                  style={{
                    marginTop: 24,
                    paddingTop: 16,
                    borderTop: `2px solid ${THEME.line}`,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                    gap: 16,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: THEME.muted,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.08em",
                        marginBottom: 2,
                      }}
                    >
                      Contractual Cash Flow
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 18,
                        fontWeight: 700,
                        color: THEME.ink,
                      }}
                    >
                      <Money value={contractualAnnual} variant="full" />
                    </div>
                    <div style={{ fontSize: 10, color: THEME.muted }}>Guaranteed / declared cash</div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: THEME.muted,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.08em",
                        marginBottom: 2,
                      }}
                    >
                      Total Annual Yield
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 22,
                        fontWeight: 800,
                        color: THEME.accent,
                      }}
                    >
                      <Money value={totalAnnual} variant="full" />
                    </div>
                    <div style={{ fontSize: 10, color: THEME.muted }}>Inclusive of NPS CAGR est.</div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: 10,
                        color: THEME.muted,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.08em",
                        marginBottom: 2,
                      }}
                    >
                      Post-Tax In-Hand Run Rate
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 18,
                        fontWeight: 700,
                        color: THEME.sage,
                      }}
                    >
                      <Money value={totalPostTaxAnnual} variant="full" />
                    </div>
                    <div style={{ fontSize: 10, color: THEME.muted }}>
                      ~<Money value={totalPostTaxMonthly} variant="full" /> / mo in-hand
                    </div>
                  </div>

                  <div style={{ textAlign: "right" as const }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: THEME.muted,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.08em",
                        marginBottom: 2,
                      }}
                    >
                      Monthly Run-Rate
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 18,
                        fontWeight: 700,
                        color: THEME.sage,
                      }}
                    >
                      <Money value={totalMonthly} variant="full" />
                    </div>
                    <div style={{ fontSize: 10, color: THEME.muted }}>
                      ~<Money value={totalDaily} variant="full" /> / day
                    </div>
                  </div>
                </div>

                {/* Audit & Accounting Standards Reference Note */}
                <div
                  style={{
                    marginTop: 18,
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
                    border: `1px solid ${`color-mix(in srgb, ${THEME.accent} 15%, transparent)`}`,
                    fontSize: 11,
                    color: THEME.muted,
                    lineHeight: 1.6,
                  }}
                >
                  <b style={{ color: THEME.ink }}>Accounting &amp; Regulatory Audit Notes:</b>
                  <ul style={{ margin: "4px 0 0 0", paddingLeft: 18 }}>
                    <li>
                      <b>FD:</b> Computed using Indian banking standard quarterly compounding (A = P × (1
                      + r/400)⁴ⁿ). Only active, non-matured deposits are counted.
                    </li>
                    <li>
                      <b>Bonds:</b> Annual coupon computed on active face value / principal.
                    </li>
                    <li>
                      <b>Govt Schemes:</b> Includes SCSS (8.2%), Post Office MIS (7.4%), SSY (8.2%), NSC
                      (7.7%), and RBI Floating Rate Bonds (8.05%).
                    </li>
                    <li>
                      <b>PPF &amp; EPF:</b> PPF compounded @ {PPF_RATE}% p.a. (Section 80C exempt). EPF
                      accrued @ {EPF_RATE}% p.a. declared EPFO rate.
                    </li>
                    <li>
                      <b>Dividends:</b> Net of TDS trailing 12-month actual cash receipts.
                    </li>
                    <li>
                      <b>Rental Yield:</b> Annual lease receipts less 30% statutory Section 24(a) standard maintenance deduction.
                    </li>
                    <li>
                      <b>NPS:</b> Marked at ~10% blended benchmark CAGR (wealth accumulation, non-cash
                      distribution).
                    </li>
                  </ul>
                </div>
              </Card>
            </div>
          )}

          {/* ═════════ 2. GRANULAR ASSET LEDGER VIEW ═════════ */}
          {viewMode === "ledger" && (
            <Card style={{ padding: 24 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                    Individual Yield Instrument Ledger
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted }}>
                    Itemized list of every active capital asset generating income or compounding accruals
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      background: "var(--surface-1)",
                      padding: "4px 10px",
                      borderRadius: 8,
                      border: `1px solid ${THEME.line}`,
                      width: 200,
                    }}
                  >
                    <Search size={13} color={THEME.muted} />
                    <input
                      type="text"
                      placeholder="Search holdings..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        background: "none",
                        border: "none",
                        outline: "none",
                        fontSize: 11,
                        color: THEME.ink,
                        width: "100%",
                      }}
                    />
                  </div>

                  <select
                    value={selectedStreamFilter}
                    onChange={(e) => setSelectedStreamFilter(e.target.value)}
                    style={{
                      background: "var(--surface-1)",
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 8,
                      padding: "5px 10px",
                      fontSize: 11,
                      color: THEME.ink,
                      cursor: "pointer",
                    }}
                  >
                    <option value="all">All Asset Classes</option>
                    {allStreams.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table of all underlying items */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${THEME.line}`, textAlign: "left" as const, color: THEME.muted }}>
                      <th style={{ padding: "8px 10px" }}>Asset / Instrument</th>
                      <th style={{ padding: "8px 10px" }}>Institution / Entity</th>
                      <th style={{ padding: "8px 10px" }}>Cadence</th>
                      <th style={{ padding: "8px 10px", textAlign: "right" as const }}>Capital</th>
                      <th style={{ padding: "8px 10px", textAlign: "right" as const }}>Yield Rate</th>
                      <th style={{ padding: "8px 10px", textAlign: "right" as const }}>Annual Pre-Tax</th>
                      <th style={{ padding: "8px 10px", textAlign: "right" as const }}>In-Hand Post-Tax</th>
                      <th style={{ padding: "8px 10px" }}>Tax Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allStreams
                      .filter((s) => selectedStreamFilter === "all" || s.id === selectedStreamFilter)
                      .flatMap((s) => s.underlyingItems)
                      .filter((item) => {
                        if (!searchQuery) return true;
                        const q = searchQuery.toLowerCase();
                        return (
                          item.name.toLowerCase().includes(q) ||
                          (item.institution || "").toLowerCase().includes(q) ||
                          item.payoutFrequency.toLowerCase().includes(q)
                        );
                      })
                      .map((item, idx) => (
                        <tr
                          key={item.id + idx}
                          style={{
                            borderBottom: `1px solid ${THEME.line}`,
                            transition: "background 0.15s ease",
                          }}
                        >
                          <td style={{ padding: "10px", fontWeight: 600, color: THEME.ink }}>
                            {item.name}
                            {item.maturityDate && (
                              <div style={{ fontSize: 10, color: THEME.muted }}>Due: {item.maturityDate}</div>
                            )}
                          </td>
                          <td style={{ padding: "10px", color: THEME.muted }}>{item.institution || "—"}</td>
                          <td style={{ padding: "10px" }}>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background: "var(--surface-2)",
                                color: THEME.muted,
                              }}
                            >
                              {item.payoutFrequency}
                            </span>
                          </td>
                          <td style={{ padding: "10px", textAlign: "right" as const, fontWeight: 600 }}>
                            {item.principal > 0 ? <Money value={item.principal} variant="full" /> : "—"}
                          </td>
                          <td style={{ padding: "10px", textAlign: "right" as const, color: THEME.gold, fontWeight: 700 }}>
                            {item.rate > 0 ? `${item.rate.toFixed(2)}%` : "—"}
                          </td>
                          <td style={{ padding: "10px", textAlign: "right" as const, fontWeight: 700, color: THEME.accent }}>
                            <Money value={item.annualYield} variant="full" />
                          </td>
                          <td style={{ padding: "10px", textAlign: "right" as const, fontWeight: 700, color: THEME.sage }}>
                            <Money value={item.postTaxYield} variant="full" />
                          </td>
                          <td style={{ padding: "10px" }}>
                            {item.isTaxFree ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                                  color: THEME.sage,
                                }}
                              >
                                Tax-Free
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                  background: "var(--surface-2)",
                                  color: THEME.muted,
                                }}
                              >
                                Slab Taxable
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ═════════ 3. CASH FLOW & PAYOUT CALENDAR ═════════ */}
          {viewMode === "calendar" && (
            <div style={{ display: "grid", gap: 20 }}>
              <Card style={{ padding: 24 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                  <CalendarDays size={18} color={THEME.accent} />
                  Projected 12-Month Inflow Schedule
                </div>
                <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 20 }}>
                  Estimated seasonal cash flow distribution across Indian Financial Year months (Apr–Mar)
                </div>

                <div style={{ height: 280, width: "100%" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyFlowDistribution} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: THEME.ink }} />
                      <YAxis tick={{ fontSize: 10, fill: THEME.muted }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(v: any, name: any) => [fmtINRFull(Number(v)), name]}
                        contentStyle={{ background: "var(--surface-1)", borderColor: THEME.line, borderRadius: 8, fontSize: 12 }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="CashPayouts" fill={THEME.accent} name="Direct Cash Payouts" stackId="a" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="CompoundingAccruals" fill={THEME.sage} name="Compounding Retirement Accruals" stackId="a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Cadence Grouping Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 14,
                }}
              >
                {[
                  {
                    title: "Monthly Inflows",
                    desc: "PO MIS, Rental Real Estate, SWP",
                    amount: (rentalAnnualYield / 12) + (allStreams.find((s) => s.id === "govt")?.underlyingItems.filter((g) => g.payoutFrequency === "Monthly").reduce((a, b) => a + b.annualYield / 12, 0) || 0),
                    color: THEME.accent,
                  },
                  {
                    title: "Quarterly Inflows",
                    desc: "FD quarterly compounding, SCSS, MSSC",
                    amount: (fdInterest + (govtInterest * 0.7)) / 4,
                    color: THEME.gold,
                  },
                  {
                    title: "Semi-Annual Coupons",
                    desc: "Govt Bonds, Corporate NCDs, SGBs",
                    amount: bondInterest / 2,
                    color: THEME.muted,
                  },
                  {
                    title: "Annual / Compounding",
                    desc: "EPF, PPF, NPS, NSC wealth accumulation",
                    amount: epfInterest + ppfInterest + npsGrowth,
                    color: THEME.sage,
                  },
                ].map((c) => (
                  <Card key={c.title} style={{ padding: 18 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" as const, letterSpacing: "0.08em" }}>
                      {c.title}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: c.color, margin: "6px 0" }}>
                      <Money value={c.amount} variant="full" />
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>{c.desc}</div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ═════════ 4. TAX EFFICIENCY & REAL YIELD ═════════ */}
          {viewMode === "tax" && (
            <div style={{ display: "grid", gap: 20 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                {/* Tax Drag Summary Card */}
                <Card style={{ padding: 22 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <ShieldCheck size={16} color={THEME.sage} />
                    Tax Drag &amp; Sovereign Shield
                  </div>
                  <div style={{ display: "grid", gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: THEME.muted }}>Gross Nominal Yield (Annual)</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink }}>
                        <Money value={totalAnnual} variant="full" />
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: THEME.muted }}>Estimated Tax Leakage (@ {(taxSlab * 100).toFixed(1)}% Slab)</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: THEME.rust }}>
                        - <Money value={totalAnnual - totalPostTaxAnnual} variant="full" />
                      </div>
                    </div>
                    <div style={{ paddingTop: 8, borderTop: `1px solid ${THEME.line}` }}>
                      <div style={{ fontSize: 11, color: THEME.muted }}>Net In-Hand Real Yield</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: THEME.sage }}>
                        <Money value={totalPostTaxAnnual} variant="full" />
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Sovereign Tax-Free Shields */}
                <Card style={{ padding: 22 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <Sparkles size={16} color={THEME.gold} />
                    Sovereign Tax-Free Assets
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.6 }}>
                    You have <b style={{ color: THEME.ink }}><Money value={taxFreeYieldTotal} variant="full" /> /yr</b> in completely tax-free sovereign accruals (PPF, SSY, EPF &amp; Tax-Free Bonds).
                  </div>
                  <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: THEME.muted }}>PPF Sec 10(11) EEE:</span>
                      <b style={{ color: THEME.sage }}><Money value={ppfInterest} variant="full" /></b>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: THEME.muted }}>EPF Statutory Interest:</span>
                      <b style={{ color: THEME.sage }}><Money value={epfInterest} variant="full" /></b>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: THEME.muted }}>Rental Sec 24(a) 30% Deduction Shield:</span>
                      <b style={{ color: THEME.sage }}><Money value={rentalAnnualYield * 0.30} variant="full" /> tax-free</b>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Actionable Tax Optimization Tips */}
              <Card style={{ padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  <Info size={15} color={THEME.accent} />
                  Senior Wealth Advisory: Tax Optimization Strategies
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginTop: 12, fontSize: 12, color: THEME.muted, lineHeight: 1.5 }}>
                  <div style={{ background: "var(--surface-1)", padding: 12, borderRadius: 8, border: `1px solid ${THEME.line}` }}>
                    <b style={{ color: THEME.ink }}>Maximize 80TTB for Senior Citizens:</b>
                    <div style={{ marginTop: 4 }}>
                      Senior citizens enjoy up to ₹50,000 deduction on FD, RD, and Post Office interest under Section 80TTB.
                    </div>
                  </div>
                  <div style={{ background: "var(--surface-1)", padding: 12, borderRadius: 8, border: `1px solid ${THEME.line}` }}>
                    <b style={{ color: THEME.ink }}>Arbitrage via Arbitrage Funds:</b>
                    <div style={{ marginTop: 4 }}>
                      For 30% tax slab investors, debt-equivalent returns in Arbitrage Mutual Funds are taxed as equity (12.5% LTCG / 20% STCG) instead of 30% slab rate.
                    </div>
                  </div>
                  <div style={{ background: "var(--surface-1)", padding: 12, borderRadius: 8, border: `1px solid ${THEME.line}` }}>
                    <b style={{ color: THEME.ink }}>Lock in Tax-Free PSU Bonds:</b>
                    <div style={{ marginTop: 4 }}>
                      NHAI / REC / PFC Tax-Free bonds provide 5.2%–6.0% tax-free yield, which equals an 8.7% pre-tax FD equivalent for 30% bracket earners.
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ═════════ 5. FIRE & PASSIVE INCOME SIMULATOR ═════════ */}
          {viewMode === "fire" && (
            <div style={{ display: "grid", gap: 20 }}>
              {/* Target Goal Progress */}
              <Card style={{ padding: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, display: "flex", alignItems: "center", gap: 8 }}>
                      <Flame size={18} color={THEME.rust} />
                      FIRE &amp; Monthly Passive Income Goal
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                      Track your progress towards replacing active salary with passive portfolio yields
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: THEME.muted }}>Target / Month:</span>
                    <select
                      value={fireMonthlyGoal}
                      onChange={(e) => setFireMonthlyGoal(Number(e.target.value))}
                      style={{
                        background: "var(--surface-1)",
                        border: `1px solid ${THEME.line}`,
                        borderRadius: 8,
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: THEME.ink,
                      }}
                    >
                      <option value={25000}>₹25,000 / month</option>
                      <option value={50000}>₹50,000 / month</option>
                      <option value={100000}>₹1,00,000 / month</option>
                      <option value={150000}>₹1,50,000 / month</option>
                      <option value={200000}>₹2,00,000 / month</option>
                      <option value={500000}>₹5,00,000 / month</option>
                    </select>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: THEME.muted }}>Current: <b style={{ color: THEME.ink }}><Money value={fireCurrentMonthly} variant="full" />/mo</b></span>
                    <span style={{ color: THEME.accent, fontWeight: 800 }}>{fireProgressPct.toFixed(1)}% Achieved</span>
                    <span style={{ color: THEME.muted }}>Goal: <b style={{ color: THEME.ink }}><Money value={fireMonthlyGoal} variant="full" />/mo</b></span>
                  </div>
                  <div style={{ height: 10, borderRadius: 6, background: "var(--surface-2)", overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${fireProgressPct}%`,
                        background: `linear-gradient(90deg, ${THEME.gold}, ${THEME.accent})`,
                        borderRadius: 6,
                        transition: "width 0.5s ease",
                      }}
                    />
                  </div>
                </div>

                {fireMonthlyShortfall > 0 ? (
                  <div
                    style={{
                      background: `color-mix(in srgb, ${THEME.accent} 6%, transparent)`,
                      padding: "14px 18px",
                      borderRadius: 10,
                      border: `1px solid color-mix(in srgb, ${THEME.accent} 20%, transparent)`,
                      fontSize: 12,
                      color: THEME.ink,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div>
                      <b>Shortfall: <Money value={fireMonthlyShortfall} variant="full" /> / month</b>
                      <div style={{ color: THEME.muted, fontSize: 11, marginTop: 2 }}>
                        To close this gap at your weighted portfolio yield ({effectiveAnnualRateForCalc.toFixed(2)}% p.a.):
                      </div>
                    </div>
                    <div style={{ textAlign: "right" as const }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: THEME.accent }}>
                        + <Money value={fireRequiredAdditionalCapital} variant="full" />
                      </div>
                      <div style={{ fontSize: 10, color: THEME.muted }}>Additional Capital Required</div>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: `color-mix(in srgb, ${THEME.sage} 10%, transparent)`,
                      padding: 14,
                      borderRadius: 10,
                      color: THEME.sage,
                      fontWeight: 700,
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <CheckCircle2 size={18} />
                    Congratulations! Your portfolio generates enough passive yield to cover your ₹{fireMonthlyGoal.toLocaleString("en-IN")}/mo goal!
                  </div>
                )}
              </Card>

              {/* What-If Simulator Playground */}
              <Card style={{ padding: 24 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                  <Calculator size={16} color={THEME.accent} />
                  What-If Deployment Simulator
                </div>
                <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 16 }}>
                  Simulate deploying surplus liquidity to see the immediate boost to your annual &amp; monthly run-rate
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 14,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: THEME.muted }}>Additional Capital (₹):</label>
                    <input
                      type="number"
                      value={simCapitalAdd}
                      onChange={(e) => setSimCapitalAdd(Number(e.target.value))}
                      step={50000}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "var(--surface-1)",
                        border: `1px solid ${THEME.line}`,
                        color: THEME.ink,
                        fontSize: 13,
                        fontWeight: 700,
                        marginTop: 4,
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: THEME.muted }}>Expected Yield Rate (% p.a.):</label>
                    <input
                      type="number"
                      value={simRateAdd}
                      onChange={(e) => setSimRateAdd(Number(e.target.value))}
                      step={0.1}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "var(--surface-1)",
                        border: `1px solid ${THEME.line}`,
                        color: THEME.ink,
                        fontSize: 13,
                        fontWeight: 700,
                        marginTop: 4,
                      }}
                    />
                  </div>
                </div>

                {/* Simulation Result */}
                <div
                  style={{
                    background: "var(--surface-2)",
                    padding: 16,
                    borderRadius: 10,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase" as const }}>Additional Annual Yield</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: THEME.accent }}>
                      + <Money value={simAddedAnnualYield} variant="full" /> / yr
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase" as const }}>Additional Monthly Income</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: THEME.sage }}>
                      + <Money value={simAddedMonthly} variant="full" /> / mo
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase" as const }}>New Projected Monthly Run-Rate</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: THEME.gold }}>
                      <Money value={simNewTotalMonthly} variant="full" /> / mo
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Backward-compatible alias
export const YieldTracker = YieldTrackerSection;
