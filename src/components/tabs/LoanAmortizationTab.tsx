/* eslint-disable */
import React, { useState, useMemo, useCallback } from "react";
import {
  Calculator,
  TrendingDown,
  IndianRupee,
  Calendar,
  Zap,
  Info,
  Download,
  Search,
  X,
  Sparkles,
  ArrowRight,
  Sliders,
  CheckCircle2,
  HelpCircle,
  Clock,
  ShieldCheck,
  Building,
  RotateCcw,
  Layers,
  Award,
  ChevronRight,
  TrendingUp,
  Home,
  Car,
  Briefcase,
  GraduationCap,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, fmtINRExact, loanOutstanding } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { BankLogo } from "../ui/BrandLogos";

const th: React.CSSProperties = {
  padding: "12px 16px",
  textAlign: "right",
  color: THEME.muted,
  fontWeight: 800,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  borderBottom: `2px solid ${THEME.line}`,
  background: "color-mix(in srgb, var(--surface-1) 70%, transparent)",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "12px 16px",
  textAlign: "right",
  color: THEME.ink,
  fontSize: 13,
  fontWeight: 500,
  borderBottom: `1px solid ${THEME.line}`,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
};

const thCenter: React.CSSProperties = { ...th, textAlign: "center" };
const tdCenter: React.CSSProperties = {
  ...td,
  textAlign: "center",
  color: THEME.muted,
  fontWeight: 700,
};

export interface AmortizationScheduleItem {
  month: number;
  emi: number;
  principal: number;
  interest: number;
  balance: number;
  totalInterest: number;
  totalPrincipal: number;
  dateLabel?: string;
  isPrepaymentMonth?: boolean;
  prepaymentAmount?: number;
  progressPercent?: number;
}

export interface AmortizationResult {
  emi: number;
  schedule: AmortizationScheduleItem[];
  totalInterest: number;
  totalMonths: number;
  crossoverMonth?: number; // First month where principal portion > interest portion
  halfwayMonth?: number;   // Month where 50% of principal is paid off
}

export interface LumpSumPrepayment {
  month: number;
  amount: number;
}

export interface RecurringPrepayment {
  intervalMonths: number;
  amount: number;
}

export const generateAmortization = (
  principal: number,
  annualRate: number,
  tenureMonths: number,
  extraMonthly: number = 0,
  lumpSum: LumpSumPrepayment | null = null,
  recurringAnnual: number = 0
): AmortizationResult => {
  if (!tenureMonths || tenureMonths <= 0 || principal <= 0) {
    return { emi: 0, schedule: [], totalInterest: 0, totalMonths: 0 };
  }

  const monthlyRate = annualRate / 100 / 12;
  const emi =
    monthlyRate > 0
      ? (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
        (Math.pow(1 + monthlyRate, tenureMonths) - 1)
      : principal / tenureMonths;

  const schedule: AmortizationScheduleItem[] = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPrincipal = 0;
  let month = 0;
  let crossoverMonth: number | undefined = undefined;
  let halfwayMonth: number | undefined = undefined;

  while (balance > 0.5 && month < tenureMonths * 2) {
    month++;
    const interestPart = balance * monthlyRate;
    let extraThisMonth = extraMonthly;
    let isPrepay = extraMonthly > 0;
    let prepayAmount = extraMonthly;

    // Check one-time lump sum
    if (lumpSum && lumpSum.month === month && lumpSum.amount > 0) {
      extraThisMonth += lumpSum.amount;
      isPrepay = true;
      prepayAmount += lumpSum.amount;
    }

    // Check recurring annual lump sum (e.g., bonus every 12 months)
    if (recurringAnnual > 0 && month > 0 && month % 12 === 0) {
      extraThisMonth += recurringAnnual;
      isPrepay = true;
      prepayAmount += recurringAnnual;
    }

    let principalPart = emi - interestPart + extraThisMonth;
    if (principalPart > balance) {
      principalPart = balance;
    }
    balance -= principalPart;
    totalInterest += interestPart;
    totalPrincipal += principalPart;

    if (!crossoverMonth && principalPart >= interestPart) {
      crossoverMonth = month;
    }

    if (!halfwayMonth && totalPrincipal >= principal * 0.5) {
      halfwayMonth = month;
    }

    const progressPercent = Math.min(100, Math.round((totalPrincipal / principal) * 100));

    schedule.push({
      month,
      emi: Math.round(interestPart + principalPart),
      principal: Math.round(principalPart),
      interest: Math.round(interestPart),
      balance: Math.max(0, Math.round(balance)),
      totalInterest: Math.round(totalInterest),
      totalPrincipal: Math.round(totalPrincipal),
      isPrepaymentMonth: isPrepay,
      prepaymentAmount: prepayAmount > 0 ? Math.round(prepayAmount) : undefined,
      progressPercent,
    });

    if (balance <= 0) break;
  }

  return {
    emi: Math.round(emi),
    schedule,
    totalInterest: Math.round(totalInterest),
    totalMonths: month,
    crossoverMonth,
    halfwayMonth,
  };
};

const addMonths = (date: Date, n: number) => new Date(date.getFullYear(), date.getMonth() + n, 1);
const formatMonthYear = (date: Date) =>
  date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

/* ─── CUSTOM CHART TOOLTIP ─────────────────────────────────────────────────── */
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
        borderRadius: 14,
        padding: "12px 16px",
        boxShadow: "0 12px 36px rgba(0, 0, 0, 0.16)",
        fontSize: 12,
        minWidth: 180,
      }}
    >
      <div
        style={{
          fontWeight: 800,
          color: THEME.ink,
          marginBottom: 8,
          fontSize: 13,
          letterSpacing: "-0.01em",
        }}
      >
        {typeof label === "number" ? `Month ${label}` : label}
      </div>
      {visible.map((p: any, i: number) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 5,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: p.color || p.fill,
                display: "inline-block",
              }}
            />
            <span style={{ color: THEME.muted, fontWeight: 600 }}>{p.name}:</span>
          </div>
          <span style={{ fontWeight: 800, color: THEME.ink }}>
            <Prv>{formatter ? formatter(p.value) : p.value}</Prv>
          </span>
        </div>
      ))}
    </div>
  );
};

/* ─── POPULAR INDIAN LOAN PRESETS ─────────────────────────────────────────── */
interface LoanPreset {
  title: string;
  icon: React.ReactNode;
  principal: number;
  rate: number;
  tenureYears: number;
  desc: string;
}

const LOAN_PRESETS: LoanPreset[] = [
  {
    title: "Home Loan",
    icon: <Home size={13} />,
    principal: 5000000,
    rate: 8.5,
    tenureYears: 20,
    desc: "₹50L @ 8.5% (20y)",
  },
  {
    title: "Car Loan",
    icon: <Car size={13} />,
    principal: 1200000,
    rate: 9.0,
    tenureYears: 5,
    desc: "₹12L @ 9.0% (5y)",
  },
  {
    title: "Personal Loan",
    icon: <Briefcase size={13} />,
    principal: 500000,
    rate: 12.5,
    tenureYears: 3,
    desc: "₹5L @ 12.5% (3y)",
  },
  {
    title: "Education Loan",
    icon: <GraduationCap size={13} />,
    principal: 2000000,
    rate: 9.75,
    tenureYears: 8,
    desc: "₹20L @ 9.75% (8y)",
  },
];

export const LoanAmortizationTab: React.FC<{ state: any }> = ({ state }) => {
  const { privacyMode } = usePrivacy();

  // Active loans from user's state
  const loans = useMemo(
    () => [...(state.loansTaken || [])].filter((l: any) => loanOutstanding(l) > 0),
    [state.loansTaken]
  );

  // Mode Selection: "from_loans" | "custom"
  const [useCustom, setUseCustom] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<string | null>(null);

  // Custom Loan parameters (initialized with default home loan to prevent empty state)
  const [customPrincipal, setCustomPrincipal] = useState(5000000);
  const [customRate, setCustomRate] = useState(8.5);
  const [customTenure, setCustomTenure] = useState(240);
  const [customLoanName, setCustomLoanName] = useState("Home Loan");

  // Prepayment controls
  const [extraEMI, setExtraEMI] = useState(0);
  const [lumpSumAmount, setLumpSumAmount] = useState(0);
  const [lumpSumMonth, setLumpSumMonth] = useState(12);
  const [recurringAnnual, setRecurringAnnual] = useState(0);

  // View & Filter States
  const [scheduleView, setScheduleView] = useState<"monthly" | "yearly">("yearly");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYearFilter, setSelectedYearFilter] = useState<number | "all">("all");
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

  const today = useMemo(() => new Date(), []);

  // Resolves to a real loan id whenever one exists
  const resolvedLoanId = useMemo(() => {
    if (selectedLoan && loans.some((lo) => lo.id === selectedLoan)) return selectedLoan;
    return loans[0]?.id || "";
  }, [selectedLoan, loans]);

  const activeLoanObj = useMemo(() => {
    if (useCustom) return null;
    return loans.find((lo) => lo.id === resolvedLoanId) || null;
  }, [loans, resolvedLoanId, useCustom]);

  const loanData = useMemo(() => {
    if (useCustom) {
      return {
        principal: customPrincipal,
        rate: customRate,
        tenure: customTenure,
        name: customLoanName || "Custom Loan",
        lender: "Custom Simulation",
        type: customLoanName,
      };
    }
    if (activeLoanObj) {
      return {
        principal: loanOutstanding(activeLoanObj),
        rate: Number(activeLoanObj.rate || 0),
        tenure: Number(activeLoanObj.monthsRemaining || activeLoanObj.tenureMonths || 240),
        name: activeLoanObj.type || activeLoanObj.lender || "Loan",
        lender: activeLoanObj.lender || "Bank",
        type: activeLoanObj.type || "Loan",
      };
    }
    return { principal: 0, rate: 0, tenure: 0, name: "", lender: "", type: "" };
  }, [useCustom, customPrincipal, customRate, customTenure, customLoanName, activeLoanObj]);

  // Apply a preset to custom simulator
  const applyPreset = (preset: LoanPreset) => {
    setUseCustom(true);
    setCustomPrincipal(preset.principal);
    setCustomRate(preset.rate);
    setCustomTenure(preset.tenureYears * 12);
    setCustomLoanName(preset.title);
  };

  // Base Amortization calculation
  const baseAmort = useMemo(
    () => generateAmortization(loanData.principal, loanData.rate, loanData.tenure),
    [loanData]
  );

  const hasPrepayment = extraEMI > 0 || lumpSumAmount > 0 || recurringAnnual > 0;

  // Extra Amortization calculation (with prepayment simulator)
  const extraAmort = useMemo(
    () =>
      hasPrepayment
        ? generateAmortization(
            loanData.principal,
            loanData.rate,
            loanData.tenure,
            extraEMI,
            lumpSumAmount > 0 ? { month: lumpSumMonth, amount: lumpSumAmount } : null,
            recurringAnnual
          )
        : null,
    [loanData, extraEMI, lumpSumAmount, lumpSumMonth, recurringAnnual, hasPrepayment]
  );

  const activeAmort = extraAmort || baseAmort;

  // Month-by-month Schedule with calendar labels
  const scheduleWithDates = useMemo(
    () =>
      activeAmort.schedule.map((row) => ({
        ...row,
        dateLabel: formatMonthYear(addMonths(today, row.month - 1)),
      })),
    [activeAmort, today]
  );

  // Yearly Summary aggregation
  const yearlyBreakdown = useMemo(() => {
    const years: {
      year: number;
      label: string;
      principal: number;
      interest: number;
      totalPaid: number;
      endingBalance: number;
      sec24bEligible: number;
      sec80cEligible: number;
    }[] = [];

    for (let i = 0; i < activeAmort.schedule.length; i += 12) {
      const yearMonths = activeAmort.schedule.slice(i, i + 12);
      const yearPrincipal = yearMonths.reduce((s, m) => s + m.principal, 0);
      const yearInterest = yearMonths.reduce((s, m) => s + m.interest, 0);
      const startYear = addMonths(today, i).getFullYear();
      const endYear = addMonths(today, i + yearMonths.length - 1).getFullYear();
      const lastRow = yearMonths[yearMonths.length - 1];

      years.push({
        year: Math.floor(i / 12) + 1,
        label: startYear === endYear ? `Year ${Math.floor(i / 12) + 1} (${startYear})` : `Year ${Math.floor(i / 12) + 1} (${startYear}–'${String(endYear).slice(-2)})`,
        principal: yearPrincipal,
        interest: yearInterest,
        totalPaid: yearPrincipal + yearInterest,
        endingBalance: lastRow ? lastRow.balance : 0,
        sec24bEligible: Math.min(200000, yearInterest), // Section 24(b) cap ₹2,00,000
        sec80cEligible: Math.min(150000, yearPrincipal), // Section 80C cap ₹1,50,000
      });
    }
    return years;
  }, [activeAmort, today]);

  // Filtered monthly schedule
  const filteredSchedule = useMemo(() => {
    let result = scheduleWithDates;

    if (selectedYearFilter !== "all") {
      const startM = (Number(selectedYearFilter) - 1) * 12 + 1;
      const endM = Number(selectedYearFilter) * 12;
      result = result.filter((row) => row.month >= startM && row.month <= endM);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (row) =>
          String(row.month).includes(q) ||
          (row.dateLabel && row.dateLabel.toLowerCase().includes(q))
      );
    }

    return result;
  }, [scheduleWithDates, selectedYearFilter, searchQuery]);

  // Projected Closure Dates
  const baseClosureDate = useMemo(
    () => (baseAmort.totalMonths ? formatMonthYear(addMonths(today, baseAmort.totalMonths - 1)) : null),
    [baseAmort, today]
  );

  const prepayClosureDate = useMemo(
    () =>
      extraAmort && extraAmort.totalMonths
        ? formatMonthYear(addMonths(today, extraAmort.totalMonths - 1))
        : null,
    [extraAmort, today]
  );

  // Financial milestones
  const crossoverDate = useMemo(() => {
    if (!activeAmort.crossoverMonth) return null;
    return formatMonthYear(addMonths(today, activeAmort.crossoverMonth - 1));
  }, [activeAmort, today]);

  const halfwayDate = useMemo(() => {
    if (!activeAmort.halfwayMonth) return null;
    return formatMonthYear(addMonths(today, activeAmort.halfwayMonth - 1));
  }, [activeAmort, today]);

  // Savings & ROI
  const savings = useMemo(() => {
    if (!extraAmort) return null;
    const interestSaved = baseAmort.totalInterest - extraAmort.totalInterest;
    const monthsSaved = baseAmort.totalMonths - extraAmort.totalMonths;
    const totalWithExtra = loanData.principal + extraAmort.totalInterest;
    const totalWithout = loanData.principal + baseAmort.totalInterest;

    // Total Prepayment invested
    const totalPrepaymentPrincipal = extraAmort.schedule.reduce(
      (s, r) => s + (r.prepaymentAmount || 0),
      0
    );

    // Guaranteed ROI multiplier
    const roiPercent =
      totalPrepaymentPrincipal > 0
        ? Math.round((interestSaved / totalPrepaymentPrincipal) * 100)
        : 0;

    return {
      interestSaved,
      monthsSaved,
      totalWithExtra,
      totalWithout,
      totalPrepaymentPrincipal,
      roiPercent,
    };
  }, [baseAmort, extraAmort, loanData.principal]);

  // Chart data sampled for smooth high-res rendering
  const chartData = useMemo(() => {
    const sampleEvery = Math.max(1, Math.floor(baseAmort.schedule.length / 60));
    return baseAmort.schedule
      .filter((_, i) => i % sampleEvery === 0 || i === baseAmort.schedule.length - 1)
      .map((row) => {
        if (!extraAmort) return row;
        const extraRow = extraAmort.schedule.find((r) => r.month === row.month);
        return {
          ...row,
          balanceWithPrepay: extraRow ? extraRow.balance : 0,
        };
      });
  }, [baseAmort, extraAmort]);

  // CSV Exporter
  const downloadScheduleCSV = () => {
    if (scheduleView === "yearly") {
      const rows = [
        "Year,Period,Principal Repaid (₹),Interest Paid (₹),Total Cashflow (₹),Ending Balance (₹),Sec 24(b) Deduction (₹),Sec 80C Deduction (₹)",
      ];
      yearlyBreakdown.forEach((r) => {
        rows.push(
          [
            `Year ${r.year}`,
            `"${r.label}"`,
            r.principal,
            r.interest,
            r.totalPaid,
            r.endingBalance,
            r.sec24bEligible,
            r.sec80cEligible,
          ].join(",")
        );
      });
      const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(loanData.name || "loan").toLowerCase().replace(/\s+/g, "-")}-yearly-amortization.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const rows = [
      "Month,Date,Total Payment (₹),Principal (₹),Interest (₹),Prepayment (₹),Outstanding Balance (₹),Progress (%)",
    ];
    scheduleWithDates.forEach((row) => {
      rows.push(
        [
          row.month,
          row.dateLabel,
          row.emi,
          row.principal,
          row.interest,
          row.prepaymentAmount || 0,
          row.balance,
          `${row.progressPercent || 0}%`,
        ].join(",")
      );
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const suffix = extraAmort ? "-with-prepayment" : "";
    a.download = `${(loanData.name || "loan").toLowerCase().replace(/\s+/g, "-")}-monthly-amortization${suffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalYears = Math.ceil(loanData.tenure / 12);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <SectionTitle
        sub="Executive loan amortization simulator & payoff accelerator — model interest savings, prepayment ROI, and crossover milestones"
        rightElement={
          loanData.principal > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Badge variant="muted">
                {loanData.lender} • {loanData.name}
              </Badge>
              <Badge variant="accent">
                <IndianRupee size={13} /> EMI <Money value={baseAmort.emi} variant="exact" />
              </Badge>
              {baseClosureDate && (
                <Badge variant="sage">
                  <Calendar size={13} /> Closes {baseClosureDate}
                </Badge>
              )}
            </div>
          )
        }
      >
        Loan Amortization
      </SectionTitle>

      {/* ─── SECTION 1: LOAN SELECTOR & SCENARIO BUILDER ─── */}
      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Segmented Controller: My Loans vs Custom Loan */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 14,
              borderBottom: `1px solid ${THEME.line}`,
              paddingBottom: 16,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 6,
                }}
              >
                Loan Simulation Source
              </div>
              <div
                role="group"
                aria-label="Loan Source Selector"
                style={{
                  display: "inline-flex",
                  gap: 6,
                  background: "var(--surface-0)",
                  border: `1.5px solid ${THEME.line}`,
                  padding: 4,
                  borderRadius: 14,
                }}
              >
                <button
                  onClick={() => setUseCustom(false)}
                  className="card-lift"
                  aria-pressed={!useCustom}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 700,
                    border: "none",
                    background: !useCustom ? "var(--accent)" : "transparent",
                    color: !useCustom ? "#fff" : THEME.ink,
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Building size={14} /> My Portfolios ({loans.length})
                </button>
                <button
                  onClick={() => setUseCustom(true)}
                  className="card-lift"
                  aria-pressed={useCustom}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 10,
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 700,
                    border: "none",
                    background: useCustom ? "var(--accent)" : "transparent",
                    color: useCustom ? "#fff" : THEME.ink,
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Calculator size={14} /> Custom Loan Simulator
                </button>
              </div>
            </div>

            {/* Quick Presets for Custom Simulator */}
            {useCustom && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: THEME.muted,
                    textTransform: "uppercase",
                  }}
                >
                  Quick Presets:
                </span>
                {LOAN_PRESETS.map((p) => (
                  <button
                    key={p.title}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="card-lift"
                    style={{
                      padding: "5px 12px",
                      borderRadius: 10,
                      border: `1px solid ${
                        customPrincipal === p.principal && customRate === p.rate
                          ? "var(--accent)"
                          : THEME.line
                      }`,
                      background:
                        customPrincipal === p.principal && customRate === p.rate
                          ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                          : "var(--surface-0)",
                      color:
                        customPrincipal === p.principal && customRate === p.rate
                          ? "var(--accent)"
                          : THEME.ink,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>{p.icon}</span> {p.title}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Active Loan Selector Cards (when From My Loans is active) */}
          {!useCustom && loans.length > 0 && (
            <div>
              <label
                htmlFor="loan-select-active"
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: THEME.muted,
                  display: "block",
                  marginBottom: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Select Active Loan Account
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 12,
                }}
              >
                {loans.map((l) => {
                  const isSelected = resolvedLoanId === l.id;
                  const bal = loanOutstanding(l);
                  return (
                    <div
                      key={l.id}
                      onClick={() => setSelectedLoan(l.id)}
                      className="card-lift"
                      style={{
                        padding: "14px 16px",
                        borderRadius: 14,
                        border: `1.5px solid ${isSelected ? "var(--accent)" : THEME.line}`,
                        background: isSelected
                          ? "color-mix(in srgb, var(--accent) 8%, var(--surface-0))"
                          : "var(--surface-0)",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
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
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <BankLogo bankName={l.lender || "Bank"} size={22} />
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 13, color: THEME.ink }}>
                              {l.lender || "Lender"}
                            </div>
                            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 500 }}>
                              {l.type || "Personal Loan"}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: "50%",
                              background: "var(--accent)",
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <CheckCircle2 size={13} />
                          </div>
                        )}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-end",
                          paddingTop: 6,
                          borderTop: `1px dashed ${THEME.line}`,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700 }}>
                            OUTSTANDING
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink }}>
                            <Money value={bal} variant="exact" />
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700 }}>
                            RATE / TENURE
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>
                            {l.rate}% • {l.monthsRemaining || l.tenureMonths || 240}m
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Loan Parameter Inputs (when Custom is active) */}
          {useCustom && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 16,
                padding: "16px",
                background: "color-mix(in srgb, var(--surface-1) 50%, transparent)",
                borderRadius: 14,
                border: `1px solid ${THEME.line}`,
              }}
            >
              <div>
                <label
                  htmlFor="loan-custom-name"
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: THEME.muted,
                    display: "block",
                    marginBottom: 6,
                    textTransform: "uppercase",
                  }}
                >
                  Loan Description
                </label>
                <input
                  id="loan-custom-name"
                  type="text"
                  value={customLoanName}
                  onChange={(e) => setCustomLoanName(e.target.value)}
                  className="form-input"
                  placeholder="e.g. Dream Villa Loan"
                  style={{ padding: "10px 14px", fontSize: 13.5, width: "100%" }}
                />
              </div>

              <div>
                <label
                  htmlFor="loan-custom-principal"
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: THEME.muted,
                    display: "block",
                    marginBottom: 6,
                    textTransform: "uppercase",
                  }}
                >
                  Principal Borrowed (₹)
                </label>
                <input
                  id="loan-custom-principal"
                  type="number"
                  min="1000"
                  step="10000"
                  value={customPrincipal || ""}
                  onChange={(e) => setCustomPrincipal(Math.max(0, Number(e.target.value)))}
                  className="form-input"
                  style={{ padding: "10px 14px", fontSize: 13.5, width: "100%" }}
                />
              </div>

              <div>
                <label
                  htmlFor="loan-custom-rate"
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: THEME.muted,
                    display: "block",
                    marginBottom: 6,
                    textTransform: "uppercase",
                  }}
                >
                  Annual Interest Rate (% p.a.)
                </label>
                <input
                  id="loan-custom-rate"
                  type="number"
                  step="0.05"
                  min="0"
                  max="40"
                  value={customRate || ""}
                  onChange={(e) => setCustomRate(Math.max(0, Number(e.target.value)))}
                  className="form-input"
                  style={{ padding: "10px 14px", fontSize: 13.5, width: "100%" }}
                />
              </div>

              <div>
                <label
                  htmlFor="loan-custom-tenure"
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: THEME.muted,
                    display: "block",
                    marginBottom: 6,
                    textTransform: "uppercase",
                  }}
                >
                  Tenure: {Math.floor(customTenure / 12)}y {customTenure % 12}m ({customTenure} mos)
                </label>
                <input
                  id="loan-custom-tenure"
                  type="number"
                  min="1"
                  max="480"
                  value={customTenure || ""}
                  onChange={(e) => setCustomTenure(Math.max(1, Number(e.target.value)))}
                  className="form-input"
                  style={{ padding: "10px 14px", fontSize: 13.5, width: "100%" }}
                />
              </div>
            </div>
          )}

          {/* ─── PREPAYMENT SANDBOX (THE "WHAT-IF" STUDIO) ─── */}
          <div
            style={{
              padding: "18px 20px",
              borderRadius: 16,
              background: "color-mix(in srgb, var(--accent) 5%, var(--surface-0))",
              border: `1.5px solid color-mix(in srgb, var(--accent) 25%, ${THEME.line})`,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: "var(--accent)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Zap size={16} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                    Prepayment Accelerator & "What-If" Studio
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted }}>
                    Simulate how extra monthly contributions or bonuses reduce your loan tenure and interest
                  </div>
                </div>
              </div>

              {hasPrepayment && (
                <button
                  onClick={() => {
                    setExtraEMI(0);
                    setLumpSumAmount(0);
                    setRecurringAnnual(0);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "4px 10px",
                    borderRadius: 8,
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-0)",
                    color: THEME.muted,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  <RotateCcw size={12} /> Reset Prepayments
                </button>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 16,
              }}
            >
              {/* Extra Monthly Prepayment */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <label
                    htmlFor="loan-extra-prepayment"
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: THEME.muted,
                      textTransform: "uppercase",
                    }}
                  >
                    Extra Prepayment / Month
                  </label>
                  <span style={{ fontSize: 12, fontWeight: 800, color: THEME.sage }}>
                    <Money value={extraEMI} variant="exact" />
                  </span>
                </div>

                <input
                  id="loan-extra-prepayment"
                  type="number"
                  min="0"
                  step="500"
                  value={extraEMI || ""}
                  onChange={(e) => setExtraEMI(Math.max(0, Number(e.target.value)))}
                  placeholder="e.g. ₹5,000"
                  className="form-input"
                  style={{ padding: "8px 12px", fontSize: 13, width: "100%", marginBottom: 8 }}
                />

                <input
                  type="range"
                  className="cxo-slider"
                  min={0}
                  max={Math.max(50000, Math.round((baseAmort.emi || 0) * 1.5))}
                  step={500}
                  value={extraEMI}
                  aria-label="Extra prepayment per month slider"
                  onChange={(e) => setExtraEMI(Number(e.target.value))}
                  style={{ width: "100%", marginBottom: 10 }}
                />

                {/* Quick Boost Chips */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[1000, 2500, 5000, 10000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setExtraEMI(amt)}
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        border: `1px solid ${extraEMI === amt ? "var(--accent)" : THEME.line}`,
                        background:
                          extraEMI === amt
                            ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                            : "var(--surface-1)",
                        color: extraEMI === amt ? "var(--accent)" : THEME.ink,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      +₹{(amt / 1000).toFixed(amt % 1000 === 0 ? 0 : 1)}k
                    </button>
                  ))}
                  {baseAmort.emi > 0 && (
                    <button
                      type="button"
                      onClick={() => setExtraEMI(Math.round(baseAmort.emi * 0.1))}
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        border: `1px solid ${
                          extraEMI === Math.round(baseAmort.emi * 0.1) ? "var(--accent)" : THEME.line
                        }`,
                        background:
                          extraEMI === Math.round(baseAmort.emi * 0.1)
                            ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                            : "var(--surface-1)",
                        color:
                          extraEMI === Math.round(baseAmort.emi * 0.1)
                            ? "var(--accent)"
                            : THEME.ink,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      +10% EMI
                    </button>
                  )}
                </div>
              </div>

              {/* One-Time Lump Sum */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <label
                    id="loan-lumpsum-label"
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: THEME.muted,
                      textTransform: "uppercase",
                    }}
                  >
                    One-Time Lump Sum
                  </label>
                  {lumpSumAmount > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: THEME.accent }}>
                      Applied in Month {lumpSumMonth}
                    </span>
                  )}
                </div>

                <div role="group" aria-labelledby="loan-lumpsum-label" style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={lumpSumAmount || ""}
                    onChange={(e) => setLumpSumAmount(Math.max(0, Number(e.target.value)))}
                    placeholder="Amount ₹ (e.g. 1,00,000)"
                    aria-label="One-time lump sum amount"
                    className="form-input"
                    style={{ padding: "8px 12px", fontSize: 13, flex: 2 }}
                  />
                  <input
                    type="number"
                    min="1"
                    max={loanData.tenure || 360}
                    value={lumpSumMonth || ""}
                    onChange={(e) =>
                      setLumpSumMonth(
                        Math.max(1, Math.min(loanData.tenure || 360, Number(e.target.value) || 1))
                      )
                    }
                    placeholder="Month #"
                    aria-label="Month number to apply the lump sum in"
                    title="Which month number to apply the lump sum in (1 = next payment)"
                    className="form-input"
                    style={{ padding: "8px 12px", fontSize: 13, flex: 1 }}
                  />
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[50000, 100000, 200000, 500000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setLumpSumAmount(amt)}
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        border: `1px solid ${lumpSumAmount === amt ? "var(--accent)" : THEME.line}`,
                        background:
                          lumpSumAmount === amt
                            ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                            : "var(--surface-1)",
                        color: lumpSumAmount === amt ? "var(--accent)" : THEME.ink,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      ₹{(amt / 100000).toFixed(amt % 100000 === 0 ? 0 : 1)}L
                    </button>
                  ))}
                </div>
              </div>

              {/* Recurring Annual Bonus Prepayment */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <label
                    htmlFor="loan-recurring-bonus"
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: THEME.muted,
                      textTransform: "uppercase",
                    }}
                  >
                    Annual Bonus Prepayment
                  </label>
                  {recurringAnnual > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: THEME.sage }}>
                      Every 12 mos
                    </span>
                  )}
                </div>

                <input
                  id="loan-recurring-bonus"
                  type="number"
                  min="0"
                  step="5000"
                  value={recurringAnnual || ""}
                  onChange={(e) => setRecurringAnnual(Math.max(0, Number(e.target.value)))}
                  placeholder="e.g. ₹50,000 every year"
                  className="form-input"
                  style={{ padding: "8px 12px", fontSize: 13, width: "100%", marginBottom: 8 }}
                />

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[25000, 50000, 100000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setRecurringAnnual(amt)}
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        border: `1px solid ${recurringAnnual === amt ? "var(--accent)" : THEME.line}`,
                        background:
                          recurringAnnual === amt
                            ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                            : "var(--surface-1)",
                        color: recurringAnnual === amt ? "var(--accent)" : THEME.ink,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      +₹{(amt / 1000).toFixed(0)}k/yr
                    </button>
                  ))}
                  {baseAmort.emi > 0 && (
                    <button
                      type="button"
                      onClick={() => setRecurringAnnual(baseAmort.emi)}
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        border: `1px solid ${
                          recurringAnnual === baseAmort.emi ? "var(--accent)" : THEME.line
                        }`,
                        background:
                          recurringAnnual === baseAmort.emi
                            ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                            : "var(--surface-1)",
                        color: recurringAnnual === baseAmort.emi ? "var(--accent)" : THEME.ink,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      1 Extra EMI/yr
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ─── SECTION 2: HERO STATS & PREPAYMENT IMPACT ─── */}
      {loanData.principal > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <StatCard
              label="Monthly EMI"
              value={fmtINRExact(baseAmort.emi)}
              numericValue={baseAmort.emi}
              formatValue={fmtINRExact}
              sub={`Rate: ${loanData.rate}% p.a.`}
              icon={<IndianRupee size={16} />}
              color="var(--accent)"
            />
            <StatCard
              label="Total Interest Payable"
              value={fmtINRFull(baseAmort.totalInterest)}
              numericValue={baseAmort.totalInterest}
              formatValue={fmtINRFull}
              sub={`${Math.round((baseAmort.totalInterest / loanData.principal) * 100)}% of principal`}
              icon={<TrendingDown size={16} />}
              color={THEME.rust}
            />
            <StatCard
              label="Total Loan Cost"
              value={fmtINRFull(loanData.principal + baseAmort.totalInterest)}
              numericValue={loanData.principal + baseAmort.totalInterest}
              formatValue={fmtINRFull}
              sub={`Principal: ${fmtINRFull(loanData.principal)}`}
              icon={<Calculator size={16} />}
              color="var(--accent)"
            />
            <StatCard
              label="Payoff Timeline"
              value={`${Math.floor(baseAmort.totalMonths / 12)}y ${baseAmort.totalMonths % 12}m`}
              numericValue={baseAmort.totalMonths}
              formatValue={(n) => `${Math.floor(n / 12)}y ${Math.round(n % 12)}m`}
              sub={baseClosureDate ? `Around ${baseClosureDate}` : undefined}
              icon={<Calendar size={16} />}
              color={THEME.sage}
            />
          </div>

          {/* PREPAYMENT ROI BANNER */}
          {savings && extraAmort && (
            <div
              className="card-lift"
              style={{
                padding: "20px 24px",
                borderRadius: 16,
                background:
                  "linear-gradient(135deg, color-mix(in srgb, var(--surface-0) 80%, var(--t-sage, #10b981) 12%), var(--surface-0))",
                border: `1.5px solid ${THEME.sage}`,
                boxShadow: "0 8px 30px rgba(16, 185, 129, 0.08)",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      background: THEME.sage,
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 16,
                        fontWeight: 800,
                        color: THEME.sage,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      Prepayment Payoff Velocity & ROI
                    </h3>
                    <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 500 }}>
                      Accelerated debt elimination metrics based on your simulated prepayments
                    </div>
                  </div>
                </div>

                <Badge variant="sage">
                  <Award size={12} /> Guaranteed Return on Prepayment
                </Badge>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                  gap: 14,
                }}
              >
                <div
                  style={{
                    padding: "14px 18px",
                    borderRadius: 14,
                    background: "var(--surface-0)",
                    border: `1.5px solid ${THEME.line}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Interest Saved
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 22,
                      fontWeight: 700,
                      color: THEME.sage,
                      marginTop: 4,
                    }}
                  >
                    <Money value={savings.interestSaved} variant="full" />
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                    Direct cash saved in interest charges
                  </div>
                </div>

                <div
                  style={{
                    padding: "14px 18px",
                    borderRadius: 14,
                    background: "var(--surface-0)",
                    border: `1.5px solid ${THEME.line}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Time Saved
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 22,
                      fontWeight: 700,
                      color: THEME.sage,
                      marginTop: 4,
                    }}
                  >
                    {Math.floor(savings.monthsSaved / 12)}y {savings.monthsSaved % 12}m
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                    Eliminated {savings.monthsSaved} monthly installments
                  </div>
                </div>

                <div
                  style={{
                    padding: "14px 18px",
                    borderRadius: 14,
                    background: "var(--surface-0)",
                    border: `1.5px solid ${THEME.line}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    New Debt-Free Date
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 20,
                      fontWeight: 700,
                      color: THEME.sage,
                      marginTop: 4,
                    }}
                  >
                    {prepayClosureDate || "Accelerated"}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                    Instead of {baseClosureDate}
                  </div>
                </div>

                <div
                  style={{
                    padding: "14px 18px",
                    borderRadius: 14,
                    background: "var(--surface-0)",
                    border: `1.5px solid ${THEME.line}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Prepayment ROI
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 22,
                      fontWeight: 700,
                      color: THEME.accent,
                      marginTop: 4,
                    }}
                  >
                    {loanData.rate}%{" "}
                    <span style={{ fontSize: 12, fontWeight: 600, color: THEME.muted }}>
                      tax-free
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                    Guaranteed equivalent compound yield
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* KEY FINANCIAL MILESTONES BAR */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 14,
            }}
          >
            {/* Crossover Month Milestone */}
            <Card style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    padding: 8,
                    borderRadius: 10,
                    background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                    color: "var(--accent)",
                  }}
                >
                  <TrendingUp size={18} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Principal Crossover Point
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, marginTop: 2 }}>
                    {activeAmort.crossoverMonth
                      ? `Month ${activeAmort.crossoverMonth} (${crossoverDate})`
                      : "Already Crossed"}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4, lineHeight: 1.4 }}>
                    The milestone where monthly principal repaid exceeds monthly interest charges.
                  </div>
                </div>
              </div>
            </Card>

            {/* 50% Payoff Milestone */}
            <Card style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    padding: 8,
                    borderRadius: 10,
                    background: "color-mix(in srgb, var(--t-sage, #10b981) 15%, transparent)",
                    color: THEME.sage,
                  }}
                >
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    50% Principal Milestone
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, marginTop: 2 }}>
                    {activeAmort.halfwayMonth
                      ? `Month ${activeAmort.halfwayMonth} (${halfwayDate})`
                      : "N/A"}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4, lineHeight: 1.4 }}>
                    Halfway through your loan principal payoff journey.
                  </div>
                </div>
              </div>
            </Card>

            {/* Indian Tax Insight Card */}
            <Card style={{ padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    padding: 8,
                    borderRadius: 10,
                    background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                    color: "var(--accent)",
                  }}
                >
                  <ShieldCheck size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: THEME.muted,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Tax Shield Summary
                    </div>
                    <button
                      onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
                      style={{
                        fontSize: 11,
                        color: "var(--accent)",
                        fontWeight: 700,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {showTaxBreakdown ? "Hide" : "Details"}
                    </button>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink, marginTop: 2 }}>
                    Sec 24(b) & 80C Eligible
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4, lineHeight: 1.4 }}>
                    Up to ₹2L/yr interest deduction & ₹1.5L/yr principal deduction (Home Loans).
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* ─── SECTION 3: VISUAL CHARTS & ANALYTICS ─── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
              gap: 16,
            }}
          >
            {/* Balance Over Time Area Chart */}
            <Card style={{ padding: 24 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 18,
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
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
                    Outstanding Balance Trajectory
                  </h3>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                    Principal balance curve vs cumulative interest paid
                  </div>
                </div>
                {extraAmort && (
                  <Badge variant="sage">
                    <Zap size={12} /> Prepayment Curve Active
                  </Badge>
                )}
              </div>

              <div style={{ width: "100%", height: 300, position: "relative" }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="interestGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={THEME.rust} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={THEME.rust} stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="prepayGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={THEME.sage} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={THEME.sage} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} vertical={false} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: THEME.muted }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => (privacyMode ? "••••" : fmtINRFull(v))}
                      tick={{ fontSize: 11, fill: THEME.muted }}
                      axisLine={false}
                      tickLine={false}
                      width={80}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip formatter={(v: any) => fmtINRFull(Number(v) || 0)} />
                      }
                      cursor={{ stroke: THEME.line }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                      formatter={(value: string) => (
                        <span style={{ color: THEME.ink, fontWeight: 700 }}>{value}</span>
                      )}
                    />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      stroke="var(--accent)"
                      fill="url(#balanceGrad)"
                      strokeWidth={2.5}
                      name="Standard Balance"
                    />
                    <Area
                      type="monotone"
                      dataKey="totalInterest"
                      stroke={THEME.rust}
                      fill="url(#interestGrad)"
                      strokeWidth={2.5}
                      name="Cumulative Interest"
                    />
                    {extraAmort && (
                      <Area
                        type="monotone"
                        dataKey="balanceWithPrepay"
                        stroke={THEME.sage}
                        fill="url(#prepayGrad)"
                        strokeWidth={2.5}
                        strokeDasharray="5 4"
                        name="Accelerated Balance"
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Yearly Breakdown Bar Chart */}
            <Card style={{ padding: 24 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 18,
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
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
                    Annual Principal vs Interest Split
                  </h3>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                    Principal equity build-up vs interest charges per year
                  </div>
                </div>
              </div>

              <div style={{ width: "100%", height: 300, position: "relative" }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <BarChart
                    data={yearlyBreakdown}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10.5, fill: THEME.muted }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(v) => (privacyMode ? "••••" : fmtINRFull(v))}
                      tick={{ fontSize: 11, fill: THEME.muted }}
                      axisLine={false}
                      tickLine={false}
                      width={80}
                    />
                    <Tooltip
                      content={
                        <ChartTooltip formatter={(v: any) => fmtINRFull(Number(v) || 0)} />
                      }
                      cursor={{ fill: THEME.line, opacity: 0.3 }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                      formatter={(value: string) => (
                        <span style={{ color: THEME.ink, fontWeight: 700 }}>{value}</span>
                      )}
                    />
                    <Bar
                      dataKey="principal"
                      name="Principal Paid"
                      fill={THEME.sage}
                      stackId="a"
                      radius={[0, 0, 0, 0]}
                    />
                    <Bar
                      dataKey="interest"
                      name="Interest Charged"
                      fill={THEME.rust}
                      stackId="a"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* ─── SECTION 4: FULL AMORTIZATION SCHEDULE LEDGER ─── */}
          <Card style={{ padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 16,
                      fontWeight: 800,
                      color: THEME.ink,
                      letterSpacing: "-0.015em",
                    }}
                  >
                    Amortization Ledger & Cash Flow Table
                  </h3>
                  {extraAmort && <Badge variant="accent">Including Prepayment</Badge>}
                </div>
                <div style={{ fontSize: 11, color: THEME.muted }}>
                  Detailed breakdown of every installment, principal component, interest charge, and loan balance
                </div>
              </div>

              {/* View Switcher & Action Tools */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {/* Monthly vs Yearly Toggle */}
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    background: "var(--surface-0)",
                    border: `1.5px solid ${THEME.line}`,
                    padding: 3,
                    borderRadius: 12,
                  }}
                >
                  <button
                    onClick={() => setScheduleView("yearly")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 9,
                      fontSize: 12,
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      background: scheduleView === "yearly" ? "var(--accent)" : "transparent",
                      color: scheduleView === "yearly" ? "#fff" : THEME.ink,
                      transition: "all 0.15s ease",
                    }}
                  >
                    Yearly Summary ({yearlyBreakdown.length} yrs)
                  </button>
                  <button
                    onClick={() => setScheduleView("monthly")}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 9,
                      fontSize: 12,
                      fontWeight: 700,
                      border: "none",
                      cursor: "pointer",
                      background: scheduleView === "monthly" ? "var(--accent)" : "transparent",
                      color: scheduleView === "monthly" ? "#fff" : THEME.ink,
                      transition: "all 0.15s ease",
                    }}
                  >
                    Monthly Schedule ({activeAmort.schedule.length} mos)
                  </button>
                </div>

                {/* Search Bar (if in monthly view) */}
                {scheduleView === "monthly" && (
                  <div style={{ display: "flex", position: "relative", alignItems: "center" }}>
                    <Search
                      size={14}
                      color={THEME.muted}
                      style={{ position: "absolute", left: 12, pointerEvents: "none" }}
                    />
                    <input
                      type="text"
                      aria-label="Search schedule by month or date"
                      placeholder="Search month or date..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: 170,
                        padding: `7px ${searchQuery ? 30 : 12}px 7px 32px`,
                        borderRadius: 10,
                        border: `1.5px solid ${THEME.line}`,
                        background: "var(--surface-0)",
                        color: THEME.ink,
                        fontSize: 12,
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
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          border: "none",
                          background: "var(--surface-2)",
                          color: THEME.muted,
                          cursor: "pointer",
                        }}
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                )}

                {/* CSV Export Button */}
                <button
                  onClick={downloadScheduleCSV}
                  className="card-lift"
                  title="Download schedule as CSV"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "var(--surface-0)",
                    border: `1.5px solid ${THEME.line}`,
                    borderRadius: 10,
                    padding: "7px 14px",
                    fontSize: 12,
                    fontWeight: 700,
                    color: THEME.ink,
                    cursor: "pointer",
                  }}
                >
                  <Download size={13} /> Export CSV
                </button>
              </div>
            </div>

            {/* Quick Year Filter Chips (if in monthly view and long tenure) */}
            {scheduleView === "monthly" && totalYears > 1 && (
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginBottom: 16,
                  padding: "8px 12px",
                  borderRadius: 10,
                  background: "var(--surface-1)",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: THEME.muted,
                    textTransform: "uppercase",
                  }}
                >
                  Filter Year:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedYearFilter("all")}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 6,
                    border: `1px solid ${selectedYearFilter === "all" ? "var(--accent)" : THEME.line}`,
                    background:
                      selectedYearFilter === "all"
                        ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                        : "var(--surface-0)",
                    color: selectedYearFilter === "all" ? "var(--accent)" : THEME.ink,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  All Months
                </button>
                {Array.from({ length: Math.min(10, totalYears) }).map((_, idx) => {
                  const y = idx + 1;
                  return (
                    <button
                      key={y}
                      type="button"
                      onClick={() => setSelectedYearFilter(y)}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 6,
                        border: `1px solid ${selectedYearFilter === y ? "var(--accent)" : THEME.line}`,
                        background:
                          selectedYearFilter === y
                            ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                            : "var(--surface-0)",
                        color: selectedYearFilter === y ? "var(--accent)" : THEME.ink,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Yr {y}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ─── SCHEDULE TABLE ─── */}
            <div
              style={{
                overflowX: "auto",
                maxHeight: 520,
                overflowY: "auto",
                border: `1.5px solid ${THEME.line}`,
                borderRadius: 14,
              }}
            >
              {scheduleView === "yearly" ? (
                /* YEARLY SUMMARY VIEW */
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr
                      style={{
                        position: "sticky",
                        top: 0,
                        background: "var(--surface-1)",
                        zIndex: 2,
                      }}
                    >
                      <th style={{ ...th, textAlign: "left" }}>Year</th>
                      <th style={th}>Principal Paid</th>
                      <th style={th}>Interest Paid</th>
                      <th style={th}>Total Cash Paid</th>
                      <th style={th}>Ending Balance</th>
                      <th style={th}>Sec 24(b) Max</th>
                      <th style={th}>Sec 80C Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearlyBreakdown.map((r) => (
                      <tr
                        key={r.year}
                        className="table-row-hover"
                        style={{ borderBottom: `1px solid ${THEME.line}` }}
                      >
                        <td style={{ ...td, textAlign: "left", fontWeight: 800 }}>{r.label}</td>
                        <td style={{ ...td, color: THEME.sage, fontWeight: 700 }}>
                          <Money value={r.principal} variant="exact" />
                        </td>
                        <td style={{ ...td, color: THEME.rust, fontWeight: 700 }}>
                          <Money value={r.interest} variant="exact" />
                        </td>
                        <td style={{ ...td, fontWeight: 800 }}>
                          <Money value={r.totalPaid} variant="exact" />
                        </td>
                        <td style={{ ...td, fontWeight: 800, color: THEME.ink }}>
                          <Money value={r.endingBalance} variant="exact" />
                        </td>
                        <td style={{ ...td, color: THEME.accent, fontWeight: 600 }}>
                          <Money value={r.sec24bEligible} variant="exact" />
                        </td>
                        <td style={{ ...td, color: THEME.sage, fontWeight: 600 }}>
                          <Money value={r.sec80cEligible} variant="exact" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                /* MONTHLY SCHEDULE VIEW */
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr
                      style={{
                        position: "sticky",
                        top: 0,
                        background: "var(--surface-1)",
                        zIndex: 2,
                      }}
                    >
                      <th style={thCenter}>#</th>
                      <th style={thCenter}>Date</th>
                      <th style={th}>Total Payment</th>
                      <th style={th}>Principal</th>
                      <th style={th}>Interest</th>
                      <th style={th}>Outstanding Balance</th>
                      <th style={{ ...th, textAlign: "center" }}>Paid Off %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchedule.map((row) => {
                      const isPrepay = row.isPrepaymentMonth;
                      return (
                        <tr
                          key={row.month}
                          className="table-row-hover"
                          style={{
                            borderBottom: `1px solid ${THEME.line}`,
                            background: isPrepay
                              ? "color-mix(in srgb, var(--t-sage, #10b981) 5%, transparent)"
                              : undefined,
                          }}
                        >
                          <td style={tdCenter}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                              <span>{row.month}</span>
                              {isPrepay && (
                                <span
                                  title="Prepayment accelerated month"
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    padding: "2px 4px",
                                    borderRadius: 4,
                                    fontSize: 9,
                                    fontWeight: 800,
                                    background: THEME.sage,
                                    color: "#fff",
                                  }}
                                >
                                  <Zap size={9} />
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={tdCenter}>{row.dateLabel}</td>
                          <td style={{ ...td, fontWeight: 700 }}>
                            <Money value={row.emi} variant="exact" />
                          </td>
                          <td style={{ ...td, color: THEME.sage, fontWeight: 600 }}>
                            <Money value={row.principal} variant="exact" />
                          </td>
                          <td style={{ ...td, color: THEME.rust, fontWeight: 600 }}>
                            <Money value={row.interest} variant="exact" />
                          </td>
                          <td style={{ ...td, fontWeight: 800, color: THEME.ink }}>
                            <Money value={row.balance} variant="exact" />
                          </td>
                          <td style={{ ...td, textAlign: "center" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 6,
                              }}
                            >
                              <div
                                style={{
                                  width: 45,
                                  height: 6,
                                  borderRadius: 3,
                                  background: "var(--surface-2)",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    width: `${row.progressPercent || 0}%`,
                                    height: "100%",
                                    background: THEME.sage,
                                    borderRadius: 3,
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>
                                {row.progressPercent || 0}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredSchedule.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ ...td, textAlign: "center", padding: 28 }}>
                          {searchQuery.trim()
                            ? `No months match "${searchQuery}"`
                            : "No schedule to display — check loan tenure."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </>
      )}

      {/* Empty State when no loans are present and custom mode is not used */}
      {loans.length === 0 && !useCustom && (
        <EmptyState
          icon={Calculator}
          title="No Active Loans Found"
          description="Add loans in the Credit & Liabilities section, or click Custom Loan Simulator above to test any financing scenario."
        />
      )}
    </div>
  );
};
