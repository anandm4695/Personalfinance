import React, { useState, useMemo } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Calendar,
  Layers,
  BarChart3,
  PieChart as PieIcon,
  Search,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Clock,
  Download,
  Upload,
  AlertTriangle,
  Info,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Percent,
  IndianRupee,
  Sparkles,
  ArrowUpRight,
  User,
  Calculator,
  Building,
  SlidersHorizontal,
  FileSpreadsheet,
  Zap,
  Tag,
  Coins,
  Receipt,
  HelpCircle,
  ExternalLink,
  Sliders,
  DollarSign,
  Briefcase,
  Award,
  List,
  Flame,
  Milestone,
  BookOpen,
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
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
} from "recharts";
import { THEME, PIE_COLORS } from "../../utils/constants";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { Money } from "../ui/Money";
import {
  fmtINRFull,
  today,
  monthsBetween,
  addMonthsToDateStr,
  exportArrayToCSV,
} from "../../utils/finance";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { StatCard } from "../ui/StatCard";
import { ConfirmDialog } from "../ui/Feedback";
import { BankLogo } from "../ui/BrandLogos";

export interface PPFTransaction {
  id: string;
  date: string;
  type: "deposit" | "withdrawal" | "interest";
  amount: number | string;
  note?: string;
}

export interface PPFItem {
  id: string;
  institution?: string;
  bank?: string;
  accountNumber?: string;
  balance?: number | string;
  openingDate?: string;
  startDate?: string;
  maturityDate?: string;
  rate?: number | string;
  extensionYears?: number | string; // 0, 5, 10, 15, etc.
  extensionWithContribution?: boolean;
  owner?: string;
  nominee?: string;
  linkedAccount?: string;
  transactions?: PPFTransaction[];
  notes?: string;
}

interface PPFSectionProps {
  items: PPFItem[];
  removeItem: (key: string, id: string) => void;
  updateItem: (key: string, id: string, data: any) => void;
  addItem?: (key: string, data: any) => void;
  onAdd: () => void;
  showToast?: (msg: string, type?: any) => void;
  activeProfile?: string;
}

// Popular Banks and Post Office for PPF in India
const POPULAR_PPF_INSTITUTIONS = [
  "State Bank of India",
  "India Post (Post Office)",
  "HDFC Bank",
  "ICICI Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
  "Axis Bank",
  "Union Bank of India",
  "Kotak Mahindra Bank",
  "Central Bank of India",
  "Indian Bank",
];

// Current sovereign PPF rate (compounded annually)
const DEFAULT_PPF_RATE = 7.1;
const ANNUAL_MAX_80C_LIMIT = 150000;
const ANNUAL_MIN_PPF_LIMIT = 500;

// Unique ID generator helper
const uid = () => `ppf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

/* ── Financial Year Helpers ── */
export const getFinancialYear = (dateStr: string): string => {
  if (!dateStr) return "Current FY";
  const [y, m] = dateStr.split("-").map(Number);
  if (!y || !m) return "Current FY";
  const startYear = m >= 4 ? y : y - 1;
  return `FY ${startYear}-${String(startYear + 1).slice(2)}`;
};

export const getCurrentFinancialYear = (): string => {
  return getFinancialYear(today());
};

export const getFinancialYearDates = (dateStr: string) => {
  const [y, m] = (dateStr || today()).split("-").map(Number);
  const startYear = m >= 4 ? y : y - 1;
  return {
    start: `${startYear}-04-01`,
    end: `${startYear + 1}-03-31`,
    fyLabel: `FY ${startYear}-${String(startYear + 1).slice(2)}`,
  };
};

// Calculate 15-year statutory maturity date from opening date (PPF rules: 15 full FYs from end of opening FY)
export const calculatePPFMaturityDate = (openingDateStr: string, extensionYears: number = 0): string => {
  if (!openingDateStr) {
    const currentYear = new Date().getFullYear();
    return `${currentYear + 15 + extensionYears}-03-31`;
  }
  const [y, m] = openingDateStr.split("-").map(Number);
  if (!y || !m) return `${new Date().getFullYear() + 15 + extensionYears}-03-31`;
  
  // End of the financial year in which the account was opened
  const openingFYEndYear = m >= 4 ? y + 1 : y;
  const maturityYear = openingFYEndYear + 15 + Number(extensionYears || 0);
  return `${maturityYear}-03-31`;
};

// Calculate how many completed financial years have elapsed
export const getPPFElapsedYears = (openingDateStr?: string): number => {
  if (!openingDateStr) return 1;
  const [y, m] = openingDateStr.split("-").map(Number);
  if (!y || !m) return 1;
  const openingFYStartYear = m >= 4 ? y : y - 1;
  
  const [cy, cm] = today().split("-").map(Number);
  const currentFYStartYear = cm >= 4 ? cy : cy - 1;
  
  return Math.max(1, currentFYStartYear - openingFYStartYear + 1);
};

export function PPFSection({
  items = [],
  removeItem,
  updateItem,
  addItem,
  onAdd,
  showToast,
  activeProfile = "all",
}: PPFSectionProps) {
  const { familyProfiles } = useMasterData();

  // State Management
  const [viewMode, setViewMode] = useState<
    "cards" | "table" | "timeline" | "analytics" | "calculator" | "tax" | "guide"
  >("cards");
  const [institutionFilter, setInstitutionFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "extended" | "matured">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<
    | "balance_desc"
    | "balance_asc"
    | "fy_deposit_desc"
    | "maturity_asc"
    | "institution_asc"
  >("balance_desc");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals & Drawers
  const [editingPPF, setEditingPPF] = useState<PPFItem | null>(null);
  const [confirmDeletePPF, setConfirmDeletePPF] = useState<PPFItem | null>(null);
  const [activeLedgerPPF, setActiveLedgerPPF] = useState<PPFItem | null>(null);
  const [txModalState, setTxModalState] = useState<{
    ppf: PPFItem;
    tx?: PPFTransaction | null;
  } | null>(null);
  const [confirmDeleteTx, setConfirmDeleteTx] = useState<{
    ppf: PPFItem;
    tx: PPFTransaction;
  } | null>(null);
  const [csvImportPPF, setCsvImportPPF] = useState<PPFItem | null>(null);
  const [extendModalPPF, setExtendModalPPF] = useState<PPFItem | null>(null);
  const [accrueInterestPPF, setAccrueInterestPPF] = useState<PPFItem | null>(null);

  // Filter items by profile if not 'all'
  const profileFilteredItems = useMemo(() => {
    if (!activeProfile || activeProfile === "all") return items;
    return items.filter((p) => !p.owner || p.owner === activeProfile);
  }, [items, activeProfile]);

  // PPF Account Computational Helpers
  const getAccountTxs = (p: PPFItem): PPFTransaction[] => {
    return p.transactions || [];
  };

  const getAccountTotals = (p: PPFItem) => {
    const txs = getAccountTxs(p);
    const deposits = txs
      .filter((t) => t.type === "deposit")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const withdrawals = txs
      .filter((t) => t.type === "withdrawal")
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const interestCredited = txs
      .filter((t) => t.type === "interest")
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const manualBalance = Number(p.balance) || 0;
    const ledgerNet = Math.max(0, deposits + interestCredited - withdrawals);
    const displayBalance = manualBalance > 0 ? manualBalance : ledgerNet;
    const balanceFromLedger = manualBalance === 0 && txs.length > 0;

    // Current FY calculation
    const currentFY = getCurrentFinancialYear();
    const { start: fyStart, end: fyEnd } = getFinancialYearDates(today());
    const currentFYDeposits = txs
      .filter((t) => t.type === "deposit" && t.date >= fyStart && t.date <= fyEnd)
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    // Statutory Maturity & Tenure
    const openingDate = p.openingDate || p.startDate || "2020-04-01";
    const extensionYears = Number(p.extensionYears) || 0;
    const maturityDate = p.maturityDate || calculatePPFMaturityDate(openingDate, extensionYears);
    const elapsedYears = getPPFElapsedYears(openingDate);
    const totalTenureYears = 15 + extensionYears;
    const isMatured = elapsedYears >= totalTenureYears;
    const isExtended = extensionYears > 0;

    // Loan eligibility: 3rd FY to 6th FY
    const isLoanEligible = elapsedYears >= 3 && elapsedYears <= 6;
    // Loan maximum amount: 25% of balance at the end of the 2nd preceding financial year
    const approxLoanLimit = Math.round(displayBalance * 0.25);

    // Partial withdrawal eligibility: 7th FY onwards
    const isWithdrawalEligible = elapsedYears >= 7;
    // Max partial withdrawal: 50% of the balance at end of 4th preceding FY or preceding FY
    const approxWithdrawalLimit = Math.round(displayBalance * 0.5);

    return {
      txs,
      deposits,
      withdrawals,
      interestCredited,
      displayBalance,
      balanceFromLedger,
      currentFYDeposits,
      openingDate,
      maturityDate,
      extensionYears,
      elapsedYears,
      totalTenureYears,
      isMatured,
      isExtended,
      isLoanEligible,
      approxLoanLimit,
      isWithdrawalEligible,
      approxWithdrawalLimit,
      rate: Number(p.rate) || DEFAULT_PPF_RATE,
    };
  };

  // Overall Portfolio Aggregates
  const portfolioStats = useMemo(() => {
    let totalPortfolioValue = 0;
    let totalFYDeposits = 0;
    let totalDepositsAllTime = 0;
    let totalWithdrawalsAllTime = 0;
    let totalInterestCredited = 0;
    let totalProjectedMaturity = 0;

    profileFilteredItems.forEach((p) => {
      const stats = getAccountTotals(p);
      totalPortfolioValue += stats.displayBalance;
      totalFYDeposits += stats.currentFYDeposits;
      totalDepositsAllTime += stats.deposits;
      totalWithdrawalsAllTime += stats.withdrawals;
      totalInterestCredited += stats.interestCredited;

      // Project maturity value assuming 7.1% compounding for remaining years
      const remainingYears = Math.max(0, stats.totalTenureYears - stats.elapsedYears);
      const assumedAnnualDeposit = Math.max(stats.currentFYDeposits, 50000);
      const r = stats.rate / 100;
      let fv = stats.displayBalance;
      for (let yr = 0; yr < remainingYears; yr++) {
        fv = (fv + assumedAnnualDeposit) * (1 + r);
      }
      totalProjectedMaturity += Math.round(fv);
    });

    const fyCap = ANNUAL_MAX_80C_LIMIT * Math.max(1, profileFilteredItems.length);
    const fyUtilizationPct = Math.min(100, Math.round((totalFYDeposits / fyCap) * 100));

    // Sovereign Tax Saved estimation (at 30% + 4% cess = 31.2%)
    const taxSavedFY = Math.round(Math.min(ANNUAL_MAX_80C_LIMIT, totalFYDeposits) * 0.312);

    return {
      totalPortfolioValue,
      totalFYDeposits,
      totalDepositsAllTime,
      totalWithdrawalsAllTime,
      totalInterestCredited,
      totalProjectedMaturity,
      fyCap,
      fyUtilizationPct,
      taxSavedFY,
      activeAccountsCount: profileFilteredItems.length,
    };
  }, [profileFilteredItems]);

  // Search & Multi-Filter Logic
  const filteredItems = useMemo(() => {
    return profileFilteredItems
      .filter((p) => {
        const inst = p.institution || p.bank || "PPF";
        if (institutionFilter !== "all" && inst !== institutionFilter) return false;
        if (ownerFilter !== "all" && (p.owner || "Primary") !== ownerFilter) return false;

        const stats = getAccountTotals(p);
        if (statusFilter === "active" && (stats.isMatured || stats.isExtended)) return false;
        if (statusFilter === "extended" && !stats.isExtended) return false;
        if (statusFilter === "matured" && !stats.isMatured) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchInst = inst.toLowerCase().includes(q);
          const matchAcc = (p.accountNumber || "").toLowerCase().includes(q);
          const matchOwner = (p.owner || "").toLowerCase().includes(q);
          const matchNotes = (p.notes || "").toLowerCase().includes(q);
          if (!matchInst && !matchAcc && !matchOwner && !matchNotes) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const aStats = getAccountTotals(a);
        const bStats = getAccountTotals(b);
        if (sortBy === "balance_desc") return bStats.displayBalance - aStats.displayBalance;
        if (sortBy === "balance_asc") return aStats.displayBalance - bStats.displayBalance;
        if (sortBy === "fy_deposit_desc") return bStats.currentFYDeposits - aStats.currentFYDeposits;
        if (sortBy === "maturity_asc") return aStats.maturityDate.localeCompare(bStats.maturityDate);
        if (sortBy === "institution_asc")
          return (a.institution || a.bank || "").localeCompare(b.institution || b.bank || "");
        return 0;
      });
  }, [profileFilteredItems, institutionFilter, ownerFilter, statusFilter, searchQuery, sortBy]);

  // Unique Institutions & Owners for Filters
  const uniqueInstitutions = useMemo(() => {
    const set = new Set<string>();
    profileFilteredItems.forEach((p) => {
      const name = p.institution || p.bank;
      if (name) set.add(name);
    });
    return Array.from(set);
  }, [profileFilteredItems]);

  const uniqueOwners = useMemo(() => {
    const set = new Set<string>();
    profileFilteredItems.forEach((p) => set.add(p.owner || "Primary"));
    return Array.from(set);
  }, [profileFilteredItems]);

  // Copy helper with feedback
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Transaction Persistence Handler
  const persistPPFTransactions = async (ppfId: string, updatedTxs: PPFTransaction[]) => {
    try {
      await updateItem("ppf", ppfId, { transactions: updatedTxs });
      showToast?.("PPF ledger updated successfully", "success");
      return true;
    } catch (e: any) {
      showToast?.(`Failed to update PPF ledger: ${e?.message || "Error"}`, "error");
      return false;
    }
  };

  // Quick 1-Click Annual Interest Accrual Helper
  const handleAccrueInterest = async (ppf: PPFItem, interestAmount: number, fyLabel: string) => {
    const txs = getAccountTxs(ppf);
    const newTx: PPFTransaction = {
      id: uid(),
      date: `${fyLabel.split("-")[0].replace("FY ", "")}-03-31`,
      type: "interest",
      amount: interestAmount,
      note: `Annual Interest Credited (${fyLabel} @ ${ppf.rate || DEFAULT_PPF_RATE}%)`,
    };
    const updatedTxs = [...txs, newTx];
    const currentBalance = Number(ppf.balance) || 0;
    const newBalance = currentBalance > 0 ? currentBalance + interestAmount : undefined;

    try {
      await updateItem("ppf", ppf.id, {
        transactions: updatedTxs,
        ...(newBalance !== undefined ? { balance: newBalance } : {}),
      });
      showToast?.(`₹${interestAmount.toLocaleString("en-IN")} interest credited to PPF!`, "success");
      setAccrueInterestPPF(null);
    } catch (e: any) {
      showToast?.(`Failed to credit interest: ${e?.message || "Error"}`, "error");
    }
  };

  // Export Full PPF Data to CSV
  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      showToast?.("No PPF accounts to export", "info");
      return;
    }

    const exportRows = filteredItems.map((p) => {
      const stats = getAccountTotals(p);
      return {
        "Bank / Institution": p.institution || p.bank || "PPF",
        "Account Number": p.accountNumber || "—",
        "Family Member": p.owner || "Primary",
        "Current Balance (INR)": stats.displayBalance,
        "FY Deposit (INR)": stats.currentFYDeposits,
        "Total Deposits (INR)": stats.deposits,
        "Total Withdrawals (INR)": stats.withdrawals,
        "Interest Rate (%)": stats.rate,
        "Opening Date": stats.openingDate,
        "Maturity Date": stats.maturityDate,
        "Tenure Completed (Years)": stats.elapsedYears,
        "Total Tenure (Years)": stats.totalTenureYears,
        "Extension Status": stats.isExtended ? `Extended +${stats.extensionYears} Yrs` : "Original 15-Yr",
        "Loan Eligible": stats.isLoanEligible ? "Yes" : "No",
        "Withdrawal Eligible": stats.isWithdrawalEligible ? "Yes" : "No",
        Notes: p.notes || "",
      };
    });

    exportArrayToCSV(exportRows, `ppf_portfolio_${today()}.csv`);
    showToast?.("PPF Portfolio exported to CSV", "success");
  };

  return (
    <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── TOP HERO HEADER & SUMMARY METRICS ── */}
      <div
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${THEME.sage} 12%, var(--surface-0)) 0%, color-mix(in srgb, ${THEME.accent} 8%, var(--surface-1)) 100%)`,
          borderRadius: "var(--radius-xl)",
          border: `1px solid color-mix(in srgb, ${THEME.sage} 25%, ${THEME.line})`,
          padding: "24px 28px",
          boxShadow: "var(--shadow-sm)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Subtle Decorative Sovereign Shield Background */}
        <div
          style={{
            position: "absolute",
            right: -20,
            top: -20,
            opacity: 0.04,
            pointerEvents: "none",
          }}
        >
          <Shield size={240} color={THEME.sage} />
        </div>

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
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `color-mix(in srgb, ${THEME.sage} 20%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: THEME.sage,
                }}
              >
                <Shield size={22} />
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  color: THEME.ink,
                  fontFamily: "var(--font-display)",
                }}
              >
                Public Provident Fund (PPF)
              </h2>
              <Badge variant="accent" style={{ background: `color-mix(in srgb, ${THEME.sage} 15%, transparent)`, color: THEME.sage, borderColor: `color-mix(in srgb, ${THEME.sage} 30%, transparent)` }}>
                EEE Sovereign Status • 7.1% p.a.
              </Badge>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: THEME.muted,
                maxWidth: 650,
                lineHeight: 1.5,
              }}
            >
              15-year sovereign wealth accumulator with 100% tax-free compound interest, Section 80C deductions, 5-year extension blocks, and flexible loan & partial withdrawal privileges.
            </p>
          </div>

          {/* Action CTAs */}
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Button
              variant="outline"
              size="sm"
              icon={<Download size={14} />}
              onClick={handleExportCSV}
              disabled={filteredItems.length === 0}
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={15} />}
              onClick={onAdd}
              style={{
                background: `linear-gradient(135deg, ${THEME.sage} 0%, #15803d 100%)`,
                borderColor: "#15803d",
                boxShadow: "0 4px 12px rgba(34, 197, 94, 0.25)",
              }}
            >
              Add PPF Account
            </Button>
          </div>
        </div>

        {/* ── KPI Grid ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          {/* Total PPF Corpus */}
          <div
            style={{
              padding: "14px 18px",
              borderRadius: "var(--radius-lg)",
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Coins size={13} color={THEME.sage} /> Total PPF Portfolio
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
                fontWeight: 800,
                color: THEME.sage,
                letterSpacing: "-0.02em",
              }}
            >
              <Money value={portfolioStats.totalPortfolioValue} variant="full" />
            </div>
            <div style={{ fontSize: 11, color: THEME.muted }}>
              Across {portfolioStats.activeAccountsCount} sovereign account{portfolioStats.activeAccountsCount !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Current FY Contribution & 80C Gauge */}
          <div
            style={{
              padding: "14px 18px",
              borderRadius: "var(--radius-lg)",
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Receipt size={13} color={THEME.accent} /> {getCurrentFinancialYear()} Deposits
              </span>
              <span style={{ color: THEME.accent, fontWeight: 800 }}>
                {portfolioStats.fyUtilizationPct}%
              </span>
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 800,
                color: THEME.ink,
                letterSpacing: "-0.02em",
              }}
            >
              <Money value={portfolioStats.totalFYDeposits} variant="full" />
            </div>
            {/* Progress bar */}
            <div
              style={{
                width: "100%",
                height: 6,
                borderRadius: 4,
                background: "var(--surface-2)",
                overflow: "hidden",
                marginTop: 2,
              }}
            >
              <div
                style={{
                  width: `${portfolioStats.fyUtilizationPct}%`,
                  height: "100%",
                  borderRadius: 4,
                  background:
                    portfolioStats.fyUtilizationPct >= 100
                      ? THEME.sage
                      : `linear-gradient(90deg, ${THEME.accent} 0%, ${THEME.sage} 100%)`,
                  transition: "width 0.5s ease",
                }}
              />
            </div>
            <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
              ₹{(ANNUAL_MAX_80C_LIMIT - Math.min(ANNUAL_MAX_80C_LIMIT, portfolioStats.totalFYDeposits)).toLocaleString("en-IN")} limit remaining for 80C
            </div>
          </div>

          {/* Tax Saved This FY */}
          <div
            style={{
              padding: "14px 18px",
              borderRadius: "var(--radius-lg)",
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Sparkles size={13} color={THEME.gold} /> Section 80C Tax Saved
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 800,
                color: THEME.gold,
                letterSpacing: "-0.02em",
              }}
            >
              <Money value={portfolioStats.taxSavedFY} variant="full" />
            </div>
            <div style={{ fontSize: 11, color: THEME.muted }}>
              At 30% slab (+ 4% cess) for {getCurrentFinancialYear()}
            </div>
          </div>

          {/* Projected Maturity Wealth */}
          <div
            style={{
              padding: "14px 18px",
              borderRadius: "var(--radius-lg)",
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <TrendingUp size={13} color={THEME.cyan} /> Estimated Maturity Corpus
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                fontWeight: 800,
                color: THEME.cyan,
                letterSpacing: "-0.02em",
              }}
            >
              <Money value={portfolioStats.totalProjectedMaturity} variant="full" />
            </div>
            <div style={{ fontSize: 11, color: THEME.muted }}>
              Tax-free corpus at 7.1% compounding
            </div>
          </div>
        </div>

        {/* ── 5th-of-Month Golden Rule Banner ── */}
        <div
          style={{
            marginTop: 16,
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            background: `color-mix(in srgb, ${THEME.gold} 10%, var(--surface-0))`,
            border: `1px solid color-mix(in srgb, ${THEME.gold} 30%, transparent)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: THEME.ink }}>
            <Flame size={16} color={THEME.gold} />
            <span>
              <strong>PPF Golden Rule:</strong> Deposit on or before the <strong>5th of the month</strong> to maximize your monthly interest credit!
            </span>
          </div>
          <button
            onClick={() => setViewMode("calculator")}
            style={{
              background: "none",
              border: "none",
              color: THEME.gold,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: 0,
            }}
          >
            Simulate Wealth Difference <ArrowUpRight size={13} />
          </button>
        </div>
      </div>

      {/* ── VIEW MODE NAVIGATION & FILTER BAR ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        {/* Navigation Tabs */}
        <div
          style={{
            display: "flex",
            background: "var(--surface-1)",
            padding: 4,
            borderRadius: "var(--radius-lg)",
            border: `1px solid ${THEME.line}`,
            gap: 2,
            overflowX: "auto",
            maxWidth: "100%",
          }}
        >
          {[
            { id: "cards", label: "Cards View", icon: Layers },
            { id: "table", label: "Data Table", icon: FileSpreadsheet },
            { id: "timeline", label: "15-Yr Roadmap", icon: Milestone },
            { id: "analytics", label: "Analytics & Growth", icon: BarChart3 },
            { id: "calculator", label: "PPF Calculator", icon: Calculator },
            { id: "tax", label: "80C Optimizer", icon: Sparkles },
            { id: "guide", label: "Rules & Guide", icon: BookOpen },
          ].map(({ id, label, icon: Icon }) => {
            const active = viewMode === id;
            return (
              <button
                key={id}
                onClick={() => setViewMode(id as any)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: active ? "var(--surface-0)" : "transparent",
                  color: active ? THEME.ink : THEME.muted,
                  fontWeight: active ? 700 : 500,
                  fontSize: 12,
                  cursor: "pointer",
                  boxShadow: active ? "var(--shadow-sm)" : "none",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                <Icon size={14} color={active ? THEME.sage : "currentColor"} />
                {label}
              </button>
            );
          })}
        </div>

        {/* Search & Filters */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Search Box */}
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Search
              size={13}
              color={THEME.muted}
              style={{ position: "absolute", left: 10, pointerEvents: "none" }}
            />
            <input
              type="text"
              placeholder="Search bank, account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "7px 12px 7px 30px",
                fontSize: 12,
                borderRadius: "var(--radius-md)",
                border: `1px solid ${THEME.line}`,
                background: "var(--surface-0)",
                color: THEME.ink,
                width: 170,
                outline: "none",
              }}
            />
          </div>

          {/* Institution Filter */}
          {uniqueInstitutions.length > 1 && (
            <select
              value={institutionFilter}
              onChange={(e) => setInstitutionFilter(e.target.value)}
              style={{
                padding: "7px 10px",
                fontSize: 12,
                borderRadius: "var(--radius-md)",
                border: `1px solid ${THEME.line}`,
                background: "var(--surface-0)",
                color: THEME.ink,
                cursor: "pointer",
              }}
            >
              <option value="all">All Banks / Post Office</option>
              {uniqueInstitutions.map((inst) => (
                <option key={inst} value={inst}>
                  {inst}
                </option>
              ))}
            </select>
          )}

          {/* Owner Filter */}
          {uniqueOwners.length > 1 && (
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              style={{
                padding: "7px 10px",
                fontSize: 12,
                borderRadius: "var(--radius-md)",
                border: `1px solid ${THEME.line}`,
                background: "var(--surface-0)",
                color: THEME.ink,
                cursor: "pointer",
              }}
            >
              <option value="all">All Family Members</option>
              {uniqueOwners.map((owner) => (
                <option key={owner} value={owner}>
                  {formatProfileOption(owner, familyProfiles)}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            style={{
              padding: "7px 10px",
              fontSize: 12,
              borderRadius: "var(--radius-md)",
              border: `1px solid ${THEME.line}`,
              background: "var(--surface-0)",
              color: THEME.ink,
              cursor: "pointer",
            }}
          >
            <option value="all">All Phases</option>
            <option value="active">Active (15-Yr)</option>
            <option value="extended">Extended Blocks</option>
            <option value="matured">Matured</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              padding: "7px 10px",
              fontSize: 12,
              borderRadius: "var(--radius-md)",
              border: `1px solid ${THEME.line}`,
              background: "var(--surface-0)",
              color: THEME.ink,
              cursor: "pointer",
            }}
          >
            <option value="balance_desc">Highest Balance</option>
            <option value="balance_asc">Lowest Balance</option>
            <option value="fy_deposit_desc">Highest FY Deposit</option>
            <option value="maturity_asc">Earliest Maturity</option>
            <option value="institution_asc">Bank Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* ── EMPTY STATE ── */}
      {filteredItems.length === 0 && (
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            background: "var(--surface-0)",
            borderRadius: "var(--radius-xl)",
            border: `1px dashed ${THEME.line}`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 14,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: `color-mix(in srgb, ${THEME.sage} 15%, transparent)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: THEME.sage,
            }}
          >
            <Shield size={28} />
          </div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: THEME.ink }}>
            {searchQuery || institutionFilter !== "all" || ownerFilter !== "all" || statusFilter !== "all"
              ? "No matching PPF accounts found"
              : "No Public Provident Fund (PPF) Accounts Added"}
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: THEME.muted, maxWidth: 500, lineHeight: 1.5 }}>
            {searchQuery || institutionFilter !== "all" || ownerFilter !== "all" || statusFilter !== "all"
              ? "Try resetting your search query or status filters to view all your sovereign accounts."
              : "Start tracking your sovereign 15-year PPF accounts with full deposit ledgers, CSV imports, 80C tax optimization, and partial withdrawal tracking."}
          </p>
          <Button
            variant="primary"
            size="md"
            icon={<Plus size={16} />}
            onClick={onAdd}
            style={{
              background: `linear-gradient(135deg, ${THEME.sage} 0%, #15803d 100%)`,
              borderColor: "#15803d",
              marginTop: 6,
            }}
          >
            Add Your First PPF Account
          </Button>
        </div>
      )}

      {/* ── 1. CARDS VIEW ── */}
      {viewMode === "cards" && filteredItems.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: 20,
          }}
        >
          {filteredItems.map((p) => {
            const stats = getAccountTotals(p);
            const tenureProgress = Math.min(
              100,
              Math.round((stats.elapsedYears / stats.totalTenureYears) * 100)
            );
            const fyProgress = Math.min(
              100,
              Math.round((stats.currentFYDeposits / ANNUAL_MAX_80C_LIMIT) * 100)
            );

            return (
              <Card
                key={p.id}
                style={{
                  padding: 22,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  borderTop: `4px solid ${stats.isMatured ? THEME.gold : THEME.sage}`,
                  boxShadow: "var(--shadow-sm)",
                  position: "relative",
                }}
              >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <BankLogo
                      name={p.institution || p.bank || "PPF"}
                      size={40}
                      accentColor={THEME.sage}
                    />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                          {p.institution || p.bank || "PPF Account"}
                        </span>
                        {p.owner && (
                          <Badge variant="neutral" style={{ fontSize: 10 }}>
                            <User size={10} style={{ marginRight: 3 }} />
                            {formatProfileOption(p.owner, familyProfiles)}
                          </Badge>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                        {p.accountNumber ? (
                          <button
                            onClick={() => handleCopy(p.accountNumber!, `acc_${p.id}`)}
                            title="Click to copy account number"
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              fontSize: 11,
                              color: THEME.muted,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <span>A/C: {p.accountNumber}</span>
                            {copiedId === `acc_${p.id}` ? (
                              <Check size={11} color={THEME.sage} />
                            ) : (
                              <Copy size={11} />
                            )}
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: THEME.muted }}>No A/C number</span>
                        )}
                        <Badge
                          variant="accent"
                          style={{
                            fontSize: 10,
                            background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                            color: THEME.sage,
                            borderColor: `color-mix(in srgb, ${THEME.sage} 25%, transparent)`,
                          }}
                        >
                          {stats.rate}% p.a. Sovereign
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Top Action Buttons */}
                  <div style={{ display: "flex", gap: 4 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Pencil size={13} />}
                      onClick={() => setEditingPPF(p)}
                      title="Edit Account Details"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 size={13} />}
                      style={{ color: THEME.rust }}
                      onClick={() => setConfirmDeletePPF(p)}
                      title="Delete Account"
                    />
                  </div>
                </div>

                {/* Primary Balance Section */}
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: "var(--radius-lg)",
                    background: "var(--surface-1)",
                    border: `1px solid ${THEME.line}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Current Balance
                      {stats.balanceFromLedger && (
                        <span style={{ color: THEME.cyan, marginLeft: 6, fontWeight: 600 }}>
                          (from ledger)
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 26,
                        fontWeight: 800,
                        color: THEME.sage,
                        letterSpacing: "-0.02em",
                        marginTop: 2,
                      }}
                    >
                      <Money value={stats.displayBalance} variant="full" />
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: THEME.muted }}>Maturity Date</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>
                      {stats.maturityDate}
                    </div>
                  </div>
                </div>

                {/* Tenure Roadmap Progress */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: THEME.muted, display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={12} color={THEME.muted} />
                      Tenure: <strong>Year {stats.elapsedYears} of {stats.totalTenureYears}</strong>
                    </span>
                    <span style={{ color: stats.isMatured ? THEME.gold : THEME.sage, fontWeight: 700 }}>
                      {stats.isMatured ? "Matured" : `${stats.totalTenureYears - stats.elapsedYears} yrs remaining`}
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 6,
                      borderRadius: 4,
                      background: "var(--surface-2)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${tenureProgress}%`,
                        height: "100%",
                        borderRadius: 4,
                        background:
                          stats.isMatured
                            ? THEME.gold
                            : `linear-gradient(90deg, ${THEME.accent} 0%, ${THEME.sage} 100%)`,
                      }}
                    />
                  </div>
                </div>

                {/* Statutory Milestone Status Badges */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {stats.isExtended && (
                    <Badge
                      variant="accent"
                      style={{
                        fontSize: 10,
                        background: `color-mix(in srgb, ${THEME.gold} 15%, transparent)`,
                        color: THEME.gold,
                        borderColor: `color-mix(in srgb, ${THEME.gold} 30%, transparent)`,
                      }}
                    >
                      Extended Block (+{stats.extensionYears} yrs)
                    </Badge>
                  )}
                  {stats.isWithdrawalEligible ? (
                    <Badge
                      variant="accent"
                      style={{
                        fontSize: 10,
                        background: `color-mix(in srgb, ${THEME.cyan} 15%, transparent)`,
                        color: THEME.cyan,
                        borderColor: `color-mix(in srgb, ${THEME.cyan} 30%, transparent)`,
                      }}
                    >
                      Partial Withdrawal Eligible (~₹{stats.approxWithdrawalLimit.toLocaleString("en-IN")})
                    </Badge>
                  ) : stats.isLoanEligible ? (
                    <Badge
                      variant="neutral"
                      style={{
                        fontSize: 10,
                        background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
                        color: THEME.accent,
                      }}
                    >
                      Loan Eligible (~₹{stats.approxLoanLimit.toLocaleString("en-IN")} @ {stats.rate + 1}%)
                    </Badge>
                  ) : (
                    <Badge variant="neutral" style={{ fontSize: 10 }}>
                      Lock-in Phase (Y1–Y2)
                    </Badge>
                  )}
                </div>

                {/* Current FY Contribution Tracker */}
                <div
                  style={{
                    padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    background: "var(--surface-0)",
                    border: `1px solid ${THEME.line}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: THEME.muted }}>
                      {getCurrentFinancialYear()} Contribution:
                    </span>
                    <span
                      style={{
                        fontWeight: 800,
                        color:
                          stats.currentFYDeposits >= ANNUAL_MAX_80C_LIMIT
                            ? THEME.sage
                            : stats.currentFYDeposits < ANNUAL_MIN_PPF_LIMIT
                            ? THEME.rust
                            : THEME.ink,
                      }}
                    >
                      ₹{stats.currentFYDeposits.toLocaleString("en-IN")} / ₹1,50,000
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 5,
                      borderRadius: 3,
                      background: "var(--surface-2)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${fyProgress}%`,
                        height: "100%",
                        borderRadius: 3,
                        background:
                          stats.currentFYDeposits >= ANNUAL_MAX_80C_LIMIT
                            ? THEME.sage
                            : `linear-gradient(90deg, ${THEME.accent} 0%, ${THEME.sage} 100%)`,
                      }}
                    />
                  </div>
                  {stats.currentFYDeposits < ANNUAL_MIN_PPF_LIMIT && (
                    <div style={{ fontSize: 10, color: THEME.rust, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                      <AlertTriangle size={11} /> Deposit min. ₹500 before March 31 to avoid account deactivation!
                    </div>
                  )}
                </div>

                {/* Action Buttons Row */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    marginTop: "auto",
                  }}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Plus size={13} />}
                    onClick={() => setTxModalState({ ppf: p, tx: null })}
                  >
                    Add Deposit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<List size={13} />}
                    onClick={() => setActiveLedgerPPF(p)}
                  >
                    Ledger ({stats.txs.length})
                  </Button>
                </div>

                {/* Secondary Quick Actions */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${THEME.line}`, paddingTop: 10, fontSize: 11 }}>
                  <button
                    onClick={() => setCsvImportPPF(p)}
                    style={{
                      background: "none",
                      border: "none",
                      color: THEME.accent,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: 0,
                    }}
                  >
                    <Upload size={12} /> Import CSV
                  </button>

                  <button
                    onClick={() => setAccrueInterestPPF(p)}
                    style={{
                      background: "none",
                      border: "none",
                      color: THEME.sage,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: 0,
                    }}
                  >
                    <Coins size={12} /> Credit Annual Interest
                  </button>

                  <button
                    onClick={() => setExtendModalPPF(p)}
                    style={{
                      background: "none",
                      border: "none",
                      color: THEME.gold,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: 0,
                    }}
                  >
                    <RefreshCw size={12} /> Extend (5 Yrs)
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── 2. DATA TABLE VIEW ── */}
      {viewMode === "table" && filteredItems.length > 0 && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "var(--surface-1)", borderBottom: `1px solid ${THEME.line}` }}>
                  {[
                    "Bank / Institution",
                    "Account No.",
                    "Owner",
                    "Current Balance",
                    `${getCurrentFinancialYear()} Deposit`,
                    "Interest Rate",
                    "Opening Date",
                    "Maturity Date",
                    "Phase / Status",
                    "Actions",
                  ].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        padding: "12px 14px",
                        textAlign: i === 3 || i === 4 ? "right" : "left",
                        fontSize: 11,
                        fontWeight: 700,
                        color: THEME.muted,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((p) => {
                  const stats = getAccountTotals(p);
                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: `1px solid ${THEME.line}`,
                        transition: "background 0.15s ease",
                      }}
                    >
                      {/* Bank / Institution */}
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <BankLogo
                            name={p.institution || p.bank || "PPF"}
                            size={24}
                            accentColor={THEME.sage}
                          />
                          <span style={{ fontWeight: 700, color: THEME.ink }}>
                            {p.institution || p.bank || "PPF Account"}
                          </span>
                        </div>
                      </td>

                      {/* Account Number */}
                      <td style={{ padding: "12px 14px", color: THEME.muted, whiteSpace: "nowrap" }}>
                        {p.accountNumber || "—"}
                      </td>

                      {/* Owner */}
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        <Badge variant="neutral" style={{ fontSize: 10 }}>
                          {formatProfileOption(p.owner || "Primary", familyProfiles)}
                        </Badge>
                      </td>

                      {/* Current Balance */}
                      <td
                        style={{
                          padding: "12px 14px",
                          textAlign: "right",
                          fontWeight: 800,
                          fontSize: 13,
                          color: THEME.sage,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <Money value={stats.displayBalance} variant="full" />
                      </td>

                      {/* Current FY Deposit */}
                      <td
                        style={{
                          padding: "12px 14px",
                          textAlign: "right",
                          fontWeight: 700,
                          color:
                            stats.currentFYDeposits >= ANNUAL_MAX_80C_LIMIT
                              ? THEME.sage
                              : stats.currentFYDeposits < ANNUAL_MIN_PPF_LIMIT
                              ? THEME.rust
                              : THEME.ink,
                          whiteSpace: "nowrap",
                        }}
                      >
                        ₹{stats.currentFYDeposits.toLocaleString("en-IN")}
                      </td>

                      {/* Interest Rate */}
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        <Badge variant="accent" style={{ color: THEME.sage, fontSize: 10 }}>
                          {stats.rate}% p.a.
                        </Badge>
                      </td>

                      {/* Opening Date */}
                      <td style={{ padding: "12px 14px", color: THEME.muted, whiteSpace: "nowrap" }}>
                        {stats.openingDate}
                      </td>

                      {/* Maturity Date */}
                      <td style={{ padding: "12px 14px", fontWeight: 600, color: THEME.ink, whiteSpace: "nowrap" }}>
                        {stats.maturityDate}
                      </td>

                      {/* Phase / Status */}
                      <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                        {stats.isMatured ? (
                          <Badge variant="accent" style={{ background: `color-mix(in srgb, ${THEME.gold} 15%, transparent)`, color: THEME.gold }}>
                            Matured
                          </Badge>
                        ) : stats.isExtended ? (
                          <Badge variant="accent" style={{ color: THEME.gold }}>
                            Extended (+{stats.extensionYears}Y)
                          </Badge>
                        ) : stats.isWithdrawalEligible ? (
                          <Badge variant="accent" style={{ color: THEME.cyan }}>
                            Yr {stats.elapsedYears} (Withdrawal OK)
                          </Badge>
                        ) : stats.isLoanEligible ? (
                          <Badge variant="neutral">Yr {stats.elapsedYears} (Loan OK)</Badge>
                        ) : (
                          <Badge variant="neutral">Yr {stats.elapsedYears} of 15</Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "12px 14px", textAlign: "right", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Plus size={12} />}
                            onClick={() => setTxModalState({ ppf: p, tx: null })}
                            title="Add Deposit"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<List size={12} />}
                            onClick={() => setActiveLedgerPPF(p)}
                            title="View Ledger"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Pencil size={12} />}
                            onClick={() => setEditingPPF(p)}
                            title="Edit Account"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Trash2 size={12} />}
                            style={{ color: THEME.rust }}
                            onClick={() => setConfirmDeletePPF(p)}
                            title="Delete Account"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── 3. 15-YEAR ROADMAP & MILESTONE LADDER ── */}
      {viewMode === "timeline" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card style={{ padding: 24 }}>
            <h3
              style={{
                margin: "0 0 8px 0",
                fontSize: 18,
                fontWeight: 800,
                color: THEME.ink,
                fontFamily: "var(--font-display)",
              }}
            >
              15-Year PPF Statutory Milestone Architecture
            </h3>
            <p style={{ margin: "0 0 24px 0", fontSize: 13, color: THEME.muted, lineHeight: 1.5 }}>
              Public Provident Fund accounts are governed by strict sovereign financial stages under the Ministry of Finance. Below is your portfolio&apos;s live milestone progression map.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {filteredItems.map((p) => {
                const stats = getAccountTotals(p);
                return (
                  <div
                    key={p.id}
                    style={{
                      padding: 20,
                      borderRadius: "var(--radius-lg)",
                      background: "var(--surface-1)",
                      border: `1px solid ${THEME.line}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: 16,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <BankLogo name={p.institution || p.bank || "PPF"} size={32} accentColor={THEME.sage} />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15, color: THEME.ink }}>
                            {p.institution || p.bank || "PPF Account"}
                          </div>
                          <div style={{ fontSize: 11, color: THEME.muted }}>
                            Opened: {stats.openingDate} • Statutory Maturity: {stats.maturityDate}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: THEME.muted }}>Current Stage</div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: THEME.sage }}>
                          Year {stats.elapsedYears} of {stats.totalTenureYears} completed
                        </div>
                      </div>
                    </div>

                    {/* Visual Milestone Progress Steps */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: 10,
                      }}
                    >
                      {/* Step 1: Years 1-2 Initial Lock-in */}
                      <div
                        style={{
                          padding: "12px 14px",
                          borderRadius: "var(--radius-md)",
                          background: stats.elapsedYears >= 1 ? `color-mix(in srgb, ${THEME.sage} 10%, var(--surface-0))` : "var(--surface-0)",
                          border: `1px solid ${stats.elapsedYears >= 1 ? THEME.sage : THEME.line}`,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: THEME.ink }}>
                          {stats.elapsedYears >= 2 ? (
                            <CheckCircle2 size={13} color={THEME.sage} />
                          ) : (
                            <Clock size={13} color={THEME.muted} />
                          )}
                          Years 1–2
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: THEME.sage }}>
                          Lock-in & Build
                        </div>
                        <div style={{ fontSize: 10, color: THEME.muted }}>
                          Min ₹500/yr to keep active
                        </div>
                      </div>

                      {/* Step 2: Years 3-6 Loan Window */}
                      <div
                        style={{
                          padding: "12px 14px",
                          borderRadius: "var(--radius-md)",
                          background: stats.isLoanEligible ? `color-mix(in srgb, ${THEME.accent} 15%, var(--surface-0))` : stats.elapsedYears > 6 ? `color-mix(in srgb, ${THEME.sage} 10%, var(--surface-0))` : "var(--surface-0)",
                          border: `1px solid ${stats.isLoanEligible ? THEME.accent : stats.elapsedYears > 6 ? THEME.sage : THEME.line}`,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: THEME.ink }}>
                          {stats.elapsedYears > 6 ? (
                            <CheckCircle2 size={13} color={THEME.sage} />
                          ) : (
                            <Clock size={13} color={stats.isLoanEligible ? THEME.accent : THEME.muted} />
                          )}
                          Years 3–6
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: stats.isLoanEligible ? THEME.accent : THEME.ink }}>
                          Loan Facility
                        </div>
                        <div style={{ fontSize: 10, color: THEME.muted }}>
                          Max 25% of Y-2 balance @ +1% interest
                        </div>
                      </div>

                      {/* Step 3: Years 7-15 Partial Withdrawal */}
                      <div
                        style={{
                          padding: "12px 14px",
                          borderRadius: "var(--radius-md)",
                          background: stats.isWithdrawalEligible && !stats.isMatured ? `color-mix(in srgb, ${THEME.cyan} 15%, var(--surface-0))` : stats.isMatured ? `color-mix(in srgb, ${THEME.sage} 10%, var(--surface-0))` : "var(--surface-0)",
                          border: `1px solid ${stats.isWithdrawalEligible && !stats.isMatured ? THEME.cyan : stats.isMatured ? THEME.sage : THEME.line}`,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: THEME.ink }}>
                          {stats.isMatured ? (
                            <CheckCircle2 size={13} color={THEME.sage} />
                          ) : (
                            <Clock size={13} color={stats.isWithdrawalEligible ? THEME.cyan : THEME.muted} />
                          )}
                          Years 7–15
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: stats.isWithdrawalEligible ? THEME.cyan : THEME.ink }}>
                          Partial Withdrawals
                        </div>
                        <div style={{ fontSize: 10, color: THEME.muted }}>
                          1 withdrawal/FY (up to 50% limit)
                        </div>
                      </div>

                      {/* Step 4: Year 15 Sovereign Maturity */}
                      <div
                        style={{
                          padding: "12px 14px",
                          borderRadius: "var(--radius-md)",
                          background: stats.isMatured ? `color-mix(in srgb, ${THEME.gold} 15%, var(--surface-0))` : "var(--surface-0)",
                          border: `1px solid ${stats.isMatured ? THEME.gold : THEME.line}`,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: THEME.ink }}>
                          {stats.isMatured ? (
                            <Award size={13} color={THEME.gold} />
                          ) : (
                            <Milestone size={13} color={THEME.muted} />
                          )}
                          Year 15
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: stats.isMatured ? THEME.gold : THEME.ink }}>
                          Full Maturity
                        </div>
                        <div style={{ fontSize: 10, color: THEME.muted }}>
                          100% Tax-Free lump sum payout
                        </div>
                      </div>

                      {/* Step 5: Post-15 Extension in 5-Yr Blocks */}
                      <div
                        style={{
                          padding: "12px 14px",
                          borderRadius: "var(--radius-md)",
                          background: stats.isExtended ? `color-mix(in srgb, ${THEME.gold} 15%, var(--surface-0))` : "var(--surface-0)",
                          border: `1px solid ${stats.isExtended ? THEME.gold : THEME.line}`,
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: THEME.ink }}>
                          <RefreshCw size={13} color={stats.isExtended ? THEME.gold : THEME.muted} />
                          Post-15 Extension
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: stats.isExtended ? THEME.gold : THEME.ink }}>
                          5-Year Blocks (Form H)
                        </div>
                        <div style={{ fontSize: 10, color: THEME.muted }}>
                          With or without fresh deposits
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

      {/* ── 4. ANALYTICS & GROWTH PROJECTIONS ── */}
      {viewMode === "analytics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 20 }}>
            {/* Wealth Accumulation Simulation Stacked Area Chart */}
            <Card style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: THEME.ink }}>
                  15–25 Year Compound Growth Projection
                </h4>
                <Badge variant="accent" style={{ color: THEME.sage, fontSize: 10 }}>
                  7.1% Sovereign Compounding
                </Badge>
              </div>
              <p style={{ fontSize: 12, color: THEME.muted, margin: "0 0 16px 0" }}>
                Simulation of portfolio balance trajectory assuming ₹1.5L annual maximum 80C contributions across remaining statutory tenure.
              </p>
              <div style={{ height: 260, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={[
                      { year: "Y0", principal: portfolioStats.totalDepositsAllTime || 150000, interest: portfolioStats.totalInterestCredited || 10650 },
                      { year: "Y3", principal: (portfolioStats.totalDepositsAllTime || 150000) + 450000, interest: (portfolioStats.totalInterestCredited || 10650) + 85000 },
                      { year: "Y6", principal: (portfolioStats.totalDepositsAllTime || 150000) + 900000, interest: (portfolioStats.totalInterestCredited || 10650) + 240000 },
                      { year: "Y9", principal: (portfolioStats.totalDepositsAllTime || 150000) + 1350000, interest: (portfolioStats.totalInterestCredited || 10650) + 510000 },
                      { year: "Y12", principal: (portfolioStats.totalDepositsAllTime || 150000) + 1800000, interest: (portfolioStats.totalInterestCredited || 10650) + 940000 },
                      { year: "Y15", principal: (portfolioStats.totalDepositsAllTime || 150000) + 2250000, interest: (portfolioStats.totalInterestCredited || 10650) + 1818000 },
                      { year: "Y20 (Ext)", principal: (portfolioStats.totalDepositsAllTime || 150000) + 3000000, interest: (portfolioStats.totalInterestCredited || 10650) + 3658000 },
                    ]}
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} opacity={0.6} />
                    <XAxis dataKey="year" stroke={THEME.muted} fontSize={11} />
                    <YAxis
                      stroke={THEME.muted}
                      fontSize={11}
                      tickFormatter={(val) => `₹${(val / 100000).toFixed(1)}L`}
                    />
                    <Tooltip
                      formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, ""]}
                      contentStyle={{
                        background: "var(--surface-0)",
                        borderColor: THEME.line,
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Area
                      type="monotone"
                      dataKey="principal"
                      name="Principal Invested"
                      stackId="1"
                      stroke={THEME.accent}
                      fill={THEME.accent}
                      fillOpacity={0.4}
                    />
                    <Area
                      type="monotone"
                      dataKey="interest"
                      name="Tax-Free Compound Interest"
                      stackId="1"
                      stroke={THEME.sage}
                      fill={THEME.sage}
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Bank / Institution Allocation Donut Chart */}
            <Card style={{ padding: 20 }}>
              <h4 style={{ margin: "0 0 14px 0", fontSize: 15, fontWeight: 800, color: THEME.ink }}>
                Institution &amp; Post Office Distribution
              </h4>
              <div style={{ height: 260, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={filteredItems.map((p, idx) => ({
                        name: p.institution || p.bank || `PPF ${idx + 1}`,
                        value: getAccountTotals(p).displayBalance,
                      }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {filteredItems.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: any) => [`₹${Number(val).toLocaleString("en-IN")}`, "Balance"]}
                      contentStyle={{
                        background: "var(--surface-0)",
                        borderColor: THEME.line,
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── 5. INTERACTIVE PPF WEALTH CALCULATOR ── */}
      {viewMode === "calculator" && <PPFInteractiveCalculator />}

      {/* ── 6. TAX & 80C OPTIMIZER HUB ── */}
      {viewMode === "tax" && (
        <PPFTaxOptimizer
          portfolioStats={portfolioStats}
          items={filteredItems}
        />
      )}

      {/* ── 7. RULES & STATUTORY GUIDE ── */}
      {viewMode === "guide" && <PPFStatutoryGuideHub />}

      {/* ── MODALS ── */}
      {/* 1. Add / Edit Account Modal */}
      {editingPPF && (
        <EditPPFModal
          ppf={editingPPF}
          familyProfiles={familyProfiles}
          onClose={() => setEditingPPF(null)}
          onSave={async (updated: any) => {
            try {
              await updateItem("ppf", editingPPF.id, updated);
              showToast?.("PPF Account saved successfully", "success");
              setEditingPPF(null);
            } catch (e: any) {
              showToast?.(`Failed to save PPF account: ${e?.message || "Error"}`, "error");
            }
          }}
        />
      )}

      {/* 2. Add / Edit Transaction Modal */}
      {txModalState && (
        <PPFTransactionModal
          ppf={txModalState.ppf}
          initialTx={txModalState.tx}
          onClose={() => setTxModalState(null)}
          onSave={async (txData: PPFTransaction) => {
            const currentTxs = getAccountTxs(txModalState.ppf);
            let updated: PPFTransaction[];
            if (txModalState.tx) {
              updated = currentTxs.map((t) => (t.id === txModalState.tx!.id ? txData : t));
            } else {
              updated = [...currentTxs, { ...txData, id: uid() }];
            }
            const ok = await persistPPFTransactions(txModalState.ppf.id, updated);
            if (ok) setTxModalState(null);
          }}
        />
      )}

      {/* 3. Transaction Ledger Full Drawer / Modal */}
      {activeLedgerPPF && (
        <PPFLedgerDrawer
          ppf={activeLedgerPPF}
          onClose={() => setActiveLedgerPPF(null)}
          onAddTx={() => setTxModalState({ ppf: activeLedgerPPF, tx: null })}
          onEditTx={(tx: PPFTransaction) => setTxModalState({ ppf: activeLedgerPPF, tx })}
          onDeleteTx={(tx: PPFTransaction) => setConfirmDeleteTx({ ppf: activeLedgerPPF, tx })}
          onOpenCsvImport={() => setCsvImportPPF(activeLedgerPPF)}
        />
      )}

      {/* 4. CSV Import Modal */}
      {csvImportPPF && (
        <PPFCsvImportModal
          ppf={csvImportPPF}
          onClose={() => setCsvImportPPF(null)}
          onImport={async (importedRows: PPFTransaction[]) => {
            const currentTxs = getAccountTxs(csvImportPPF);
            const merged = [...currentTxs, ...importedRows];
            const ok = await persistPPFTransactions(csvImportPPF.id, merged);
            if (ok) {
              showToast?.(`Imported ${importedRows.length} transactions!`, "success");
              setCsvImportPPF(null);
            }
          }}
        />
      )}

      {/* 5. 5-Year Block Extension Modal */}
      {extendModalPPF && (
        <PPFExtendModal
          ppf={extendModalPPF}
          onClose={() => setExtendModalPPF(null)}
          onSave={async (extensionYears: number, withContribution: boolean) => {
            try {
              await updateItem("ppf", extendModalPPF.id, {
                extensionYears,
                extensionWithContribution: withContribution,
              });
              showToast?.(`PPF extended by ${extensionYears} years!`, "success");
              setExtendModalPPF(null);
            } catch (e: any) {
              showToast?.(`Failed to extend PPF: ${e?.message || "Error"}`, "error");
            }
          }}
        />
      )}

      {/* 6. Quick Annual Interest Accrual Dialog */}
      {accrueInterestPPF && (
        <PPFAccrueInterestModal
          ppf={accrueInterestPPF}
          onClose={() => setAccrueInterestPPF(null)}
          onAccrue={handleAccrueInterest}
        />
      )}

      {/* 7. Delete Account Confirmation Dialog */}
      {confirmDeletePPF && (
        <ConfirmDialog
          message={`Are you sure you want to delete ${confirmDeletePPF.institution || confirmDeletePPF.bank || "this PPF"} account and all its transaction history? This cannot be undone.`}
          onConfirm={() => {
            removeItem("ppf", confirmDeletePPF.id);
            setConfirmDeletePPF(null);
            showToast?.("PPF account removed", "info");
          }}
          onCancel={() => setConfirmDeletePPF(null)}
        />
      )}

      {/* 8. Delete Transaction Confirmation Dialog */}
      {confirmDeleteTx && (
        <ConfirmDialog
          message={`Delete ${confirmDeleteTx.tx.type} transaction of ₹${Number(confirmDeleteTx.tx.amount).toLocaleString("en-IN")} dated ${confirmDeleteTx.tx.date}?`}
          onConfirm={async () => {
            const currentTxs = getAccountTxs(confirmDeleteTx.ppf);
            const filtered = currentTxs.filter((t) => t.id !== confirmDeleteTx.tx.id);
            await persistPPFTransactions(confirmDeleteTx.ppf.id, filtered);
            setConfirmDeleteTx(null);
          }}
          onCancel={() => setConfirmDeleteTx(null)}
        />
      )}
    </div>
  );
}

/* ── EDIT / ADD PPF MODAL ────────────────────────────────────────────── */
function EditPPFModal({ ppf, familyProfiles, onClose, onSave }: any) {
  const [form, setForm] = useState({
    institution: ppf.institution || ppf.bank || "",
    accountNumber: ppf.accountNumber || "",
    balance: ppf.balance != null ? String(ppf.balance) : "",
    openingDate: ppf.openingDate || ppf.startDate || "2020-04-01",
    rate: ppf.rate != null ? String(ppf.rate) : String(DEFAULT_PPF_RATE),
    owner: ppf.owner || "Primary",
    nominee: ppf.nominee || "",
    linkedAccount: ppf.linkedAccount || "",
    notes: ppf.notes || "",
  });
  const [saving, setSaving] = useState(false);

  const inp = {
    width: "100%",
    padding: "8px 12px",
    fontSize: 13,
    borderRadius: "var(--radius-md)",
    border: `1px solid ${THEME.line}`,
    background: "var(--surface-0)",
    color: THEME.ink,
    outline: "none",
  };

  const handleSave = async () => {
    if (!form.institution.trim()) return;
    setSaving(true);
    await onSave({
      ...form,
      balance: Number(form.balance) || 0,
      rate: Number(form.rate) || DEFAULT_PPF_RATE,
    });
    setSaving(false);
  };

  return (
    <Modal title="Edit PPF Account" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Bank Presets */}
        <Field label="Bank / Post Office">
          <input
            style={inp}
            value={form.institution}
            onChange={(e) => setForm({ ...form, institution: e.target.value })}
            placeholder="e.g. State Bank of India, India Post"
            list="ppf-bank-list"
          />
          <datalist id="ppf-bank-list">
            {POPULAR_PPF_INSTITUTIONS.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Account Number">
            <input
              style={inp}
              value={form.accountNumber}
              onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
              placeholder="e.g. 10982348712"
            />
          </Field>

          <Field label="Opening Date">
            <input
              style={inp}
              type="date"
              value={form.openingDate}
              onChange={(e) => setForm({ ...form, openingDate: e.target.value })}
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Current Balance (₹)">
            <input
              style={inp}
              type="number"
              value={form.balance}
              onChange={(e) => setForm({ ...form, balance: e.target.value })}
              placeholder="250000"
            />
          </Field>

          <Field label="Interest Rate (% p.a.)">
            <input
              style={inp}
              type="number"
              step="0.05"
              value={form.rate}
              onChange={(e) => setForm({ ...form, rate: e.target.value })}
              placeholder="7.1"
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Account Holder (Family Member)">
            <select
              style={inp}
              value={form.owner}
              onChange={(e) => setForm({ ...form, owner: e.target.value })}
            >
              <option value="Primary">Primary (Self)</option>
              {(familyProfiles || []).map((p: any) => (
                <option key={p.id || p.name} value={p.name || p.id}>
                  {p.name} ({p.relationship || "Member"})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Nominee Name">
            <input
              style={inp}
              value={form.nominee}
              onChange={(e) => setForm({ ...form, nominee: e.target.value })}
              placeholder="Nominee name"
            />
          </Field>
        </div>

        <Field label="Notes / Remarks">
          <input
            style={inp}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="e.g. Form H extended, Linked to SBI Savings"
          />
        </Field>

        <div style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.4 }}>
          💡 <strong>Tip:</strong> Keep the current balance updated after yearly interest is credited on March 31, or use the ledger to track all deposits and withdrawals.
        </div>

        <ModalActions
          onSave={handleSave}
          onClose={onClose}
          saveLabel="Save PPF Account"
          disabled={saving || !form.institution}
          loading={saving}
        />
      </div>
    </Modal>
  );
}

/* ── ADD / EDIT PPF TRANSACTION MODAL ────────────────────────────────── */
function PPFTransactionModal({ ppf, initialTx, onClose, onSave }: any) {
  const [form, setForm] = useState<PPFTransaction>(
    initialTx || {
      id: uid(),
      date: today(),
      type: "deposit",
      amount: "",
      note: "",
    }
  );
  const [saving, setSaving] = useState(false);

  const inp = {
    width: "100%",
    padding: "8px 12px",
    fontSize: 13,
    borderRadius: "var(--radius-md)",
    border: `1px solid ${THEME.line}`,
    background: "var(--surface-0)",
    color: THEME.ink,
    outline: "none",
  };

  const dayOfMonth = form.date ? Number(form.date.split("-")[2]) : 1;
  const isBefore5th = dayOfMonth <= 5;

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) return;
    setSaving(true);
    await onSave({
      ...form,
      amount: Number(form.amount),
    });
    setSaving(false);
  };

  return (
    <Modal
      title={initialTx ? "Edit PPF Transaction" : `Add Transaction • ${ppf.institution || ppf.bank || "PPF"}`}
      onClose={onClose}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Transaction Date">
            <input
              style={inp}
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>

          <Field label="Transaction Type">
            <select
              style={inp}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as any })}
            >
              <option value="deposit">Deposit (Contribution)</option>
              <option value="withdrawal">Partial Withdrawal</option>
              <option value="interest">Annual Interest Credit</option>
            </select>
          </Field>
        </div>

        <Field label="Amount (₹)">
          <input
            style={inp}
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            placeholder="e.g. 150000"
          />
        </Field>

        {/* 5th of month indicator for deposits */}
        {form.type === "deposit" && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "var(--radius-md)",
              background: isBefore5th
                ? `color-mix(in srgb, ${THEME.sage} 12%, var(--surface-0))`
                : `color-mix(in srgb, ${THEME.gold} 12%, var(--surface-0))`,
              border: `1px solid ${isBefore5th ? THEME.sage : THEME.gold}`,
              fontSize: 11,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {isBefore5th ? (
              <CheckCircle2 size={14} color={THEME.sage} />
            ) : (
              <AlertTriangle size={14} color={THEME.gold} />
            )}
            <span>
              {isBefore5th ? (
                <strong>Interest Maximized:</strong>
              ) : (
                <strong>Post-5th Deposit:</strong>
              )}{" "}
              {isBefore5th
                ? `Deposited on day ${dayOfMonth} (<= 5th), earning full interest for this calendar month!`
                : `Deposited on day ${dayOfMonth} (> 5th). Monthly interest starts from next calendar month.`}
            </span>
          </div>
        )}

        <Field label="Note / Reference">
          <input
            style={inp}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="e.g. FY 2025-26 80C deposit"
          />
        </Field>

        <ModalActions
          onSave={handleSave}
          onClose={onClose}
          saveLabel={initialTx ? "Update Transaction" : "Add Transaction"}
          disabled={saving || !form.amount || Number(form.amount) <= 0}
          loading={saving}
        />
      </div>
    </Modal>
  );
}

/* ── TRANSACTION LEDGER DRAWER / MODAL ───────────────────────────────── */
function PPFLedgerDrawer({ ppf, onClose, onAddTx, onEditTx, onDeleteTx, onOpenCsvImport }: any) {
  const txs: PPFTransaction[] = ppf.transactions || [];
  const sorted = [...txs].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const totalDeposits = txs
    .filter((t) => t.type === "deposit")
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalWithdrawals = txs
    .filter((t) => t.type === "withdrawal")
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const totalInterest = txs
    .filter((t) => t.type === "interest")
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  return (
    <Modal
      title={`Transaction Ledger • ${ppf.institution || ppf.bank || "PPF"} (${txs.length} entries)`}
      onClose={onClose}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Ledger Summary Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--surface-1)", border: `1px solid ${THEME.line}` }}>
            <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase" }}>Total Deposits</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: THEME.sage, marginTop: 2 }}>
              ₹{totalDeposits.toLocaleString("en-IN")}
            </div>
          </div>
          <div style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--surface-1)", border: `1px solid ${THEME.line}` }}>
            <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase" }}>Interest Credited</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: THEME.gold, marginTop: 2 }}>
              ₹{totalInterest.toLocaleString("en-IN")}
            </div>
          </div>
          <div style={{ padding: "10px 12px", borderRadius: "var(--radius-md)", background: "var(--surface-1)", border: `1px solid ${THEME.line}` }}>
            <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase" }}>Withdrawals</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: THEME.rust, marginTop: 2 }}>
              ₹{totalWithdrawals.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
          <Button variant="primary" size="sm" icon={<Plus size={14} />} onClick={onAddTx}>
            Add Entry
          </Button>
          <Button variant="outline" size="sm" icon={<Upload size={14} />} onClick={onOpenCsvImport}>
            Import CSV
          </Button>
        </div>

        {/* Transactions Table */}
        <div style={{ border: `1px solid ${THEME.line}`, borderRadius: "var(--radius-md)", overflow: "hidden", maxHeight: 360, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--surface-1)", borderBottom: `1px solid ${THEME.line}`, position: "sticky", top: 0, zIndex: 1 }}>
                {["Date", "Type", "Amount", "Note", ""].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 10px",
                      textAlign: i === 2 ? "right" : i === 4 ? "right" : "left",
                      fontSize: 10,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "24px", textAlign: "center", color: THEME.muted }}>
                    No transactions in this account yet. Add a deposit or import a CSV statement.
                  </td>
                </tr>
              ) : (
                sorted.map((t) => (
                  <tr key={t.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                    <td style={{ padding: "8px 10px", color: THEME.muted, whiteSpace: "nowrap" }}>
                      {t.date}
                    </td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontWeight: 700,
                          fontSize: 11,
                          color:
                            t.type === "deposit"
                              ? THEME.sage
                              : t.type === "interest"
                              ? THEME.gold
                              : THEME.rust,
                        }}
                      >
                        {t.type === "deposit" ? (
                          <TrendingUp size={11} />
                        ) : t.type === "interest" ? (
                          <Coins size={11} />
                        ) : (
                          <TrendingDown size={11} />
                        )}
                        {t.type === "deposit"
                          ? "Deposit"
                          : t.type === "interest"
                          ? "Interest"
                          : "Withdrawal"}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "8px 10px",
                        textAlign: "right",
                        fontWeight: 800,
                        color:
                          t.type === "deposit"
                            ? THEME.sage
                            : t.type === "interest"
                            ? THEME.gold
                            : THEME.rust,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.type === "withdrawal" ? "-" : "+"}
                      <Money value={t.amount} variant="full" />
                    </td>
                    <td style={{ padding: "8px 10px", color: THEME.muted }}>
                      {t.note || "—"}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => onEditTx(t)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: THEME.muted,
                            padding: 4,
                          }}
                          title="Edit Transaction"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => onDeleteTx(t)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: THEME.rust,
                            padding: 4,
                          }}
                          title="Delete Transaction"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <ModalActions onClose={onClose} />
      </div>
    </Modal>
  );
}

/* ── CSV BULK IMPORT MODAL ───────────────────────────────────────────── */
function PPFCsvImportModal({ ppf, onClose, onImport }: any) {
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<PPFTransaction[]>([]);
  const [csvError, setCsvError] = useState("");
  const [fileName, setFileName] = useState("");

  const parseCsvText = (text: string) => {
    setCsvError("");
    setCsvPreview([]);
    try {
      const lines = text
        .trim()
        .split("\n")
        .filter((l) => l.trim() && !l.trim().startsWith("#"));
      if (!lines.length) {
        setCsvError("No data rows found in CSV.");
        return;
      }
      const rows = lines.map((line, i) => {
        const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        if (parts.length < 3) {
          throw new Error(`Row ${i + 1}: Need date, type, amount (got: "${line}")`);
        }
        const [date, type, amount, note] = parts;
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          throw new Error(`Row ${i + 1}: Date must be in YYYY-MM-DD format`);
        }
        const t = type.toLowerCase();
        let normalizedType: "deposit" | "withdrawal" | "interest" = "deposit";
        if (t.startsWith("w")) normalizedType = "withdrawal";
        else if (t.startsWith("i")) normalizedType = "interest";

        const amt = Number(amount);
        if (isNaN(amt) || amt <= 0) {
          throw new Error(`Row ${i + 1}: Amount must be a positive number`);
        }
        return {
          id: `ppftx-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          date,
          type: normalizedType,
          amount: amt,
          note: note || "",
        };
      });
      setCsvPreview(rows);
    } catch (e: any) {
      setCsvError(e.message);
    }
  };

  const downloadTemplate = () => {
    const content =
      "# PPF Transaction Import Template\n# Columns: date, type, amount, note\n# Type values: deposit, withdrawal, interest\n2025-04-05,deposit,150000,Annual contribution FY 2025-26\n2025-10-04,deposit,50000,Mid-year contribution\n2026-01-15,withdrawal,25000,Partial withdrawal\n2026-03-31,interest,18500,Annual interest credit FY 2025-26";
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ppf_ledger_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal title={`Import CSV Ledger • ${ppf.institution || ppf.bank || "PPF"}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ margin: 0, fontSize: 12, color: THEME.muted }}>
            Upload or paste CSV transactions (columns: date, type, amount, note).
          </p>
          <Button variant="outline" size="sm" icon={<Download size={12} />} onClick={downloadTemplate}>
            Download Template
          </Button>
        </div>

        {/* File Dropzone */}
        <div
          style={{
            padding: 20,
            borderRadius: "var(--radius-md)",
            border: `2px dashed ${THEME.line}`,
            background: "var(--surface-1)",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Upload size={24} color={THEME.accent} />
          <div style={{ fontSize: 12, fontWeight: 600, color: THEME.ink }}>
            {fileName || "Select or drop your CSV file"}
          </div>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setFileName(file.name);
              const reader = new FileReader();
              reader.onload = (ev) => {
                const text = ev.target?.result as string;
                setCsvText(text);
                parseCsvText(text);
              };
              reader.readAsText(file);
            }}
            style={{ fontSize: 11 }}
          />
        </div>

        {/* CSV Textarea fallback */}
        <Field label="Or Paste CSV Data Directly:">
          <textarea
            rows={4}
            value={csvText}
            onChange={(e) => {
              setCsvText(e.target.value);
              parseCsvText(e.target.value);
            }}
            placeholder="2025-04-05,deposit,150000,Annual contribution"
            style={{
              width: "100%",
              padding: 10,
              fontSize: 12,
              fontFamily: "monospace",
              borderRadius: "var(--radius-md)",
              border: `1px solid ${THEME.line}`,
              background: "var(--surface-0)",
              color: THEME.ink,
            }}
          />
        </Field>

        {csvError && (
          <div style={{ padding: "8px 12px", borderRadius: "var(--radius-md)", background: `color-mix(in srgb, ${THEME.rust} 15%, transparent)`, color: THEME.rust, fontSize: 12 }}>
            {csvError}
          </div>
        )}

        {csvPreview.length > 0 && (
          <div style={{ fontSize: 12, color: THEME.sage, fontWeight: 700 }}>
            ✓ Parsed {csvPreview.length} valid transaction rows ready for import
          </div>
        )}

        <ModalActions
          onSave={() => onImport(csvPreview)}
          onClose={onClose}
          saveLabel={`Import ${csvPreview.length} Transactions`}
          disabled={csvPreview.length === 0}
        />
      </div>
    </Modal>
  );
}

/* ── 5-YEAR EXTENSION MODAL ──────────────────────────────────────────── */
function PPFExtendModal({ ppf, onClose, onSave }: any) {
  const currentExtension = Number(ppf.extensionYears) || 0;
  const [extensionYears, setExtensionYears] = useState(currentExtension + 5);
  const [withContribution, setWithContribution] = useState(true);

  return (
    <Modal title={`Extend PPF Account • ${ppf.institution || ppf.bank || "PPF"}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: THEME.muted, lineHeight: 1.5 }}>
          Under Government of India rules (Form H), you can extend your PPF account in <strong>blocks of 5 years</strong> indefinitely, either with fresh contributions or without contributions.
        </p>

        <Field label="Extension Block (Years)">
          <select
            value={extensionYears}
            onChange={(e) => setExtensionYears(Number(e.target.value))}
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: 13,
              borderRadius: "var(--radius-md)",
              border: `1px solid ${THEME.line}`,
              background: "var(--surface-0)",
              color: THEME.ink,
            }}
          >
            <option value={5}>Extend +5 Years (Total 20 Years)</option>
            <option value={10}>Extend +10 Years (Total 25 Years)</option>
            <option value={15}>Extend +15 Years (Total 30 Years)</option>
          </select>
        </Field>

        <div
          style={{
            padding: "12px 14px",
            borderRadius: "var(--radius-md)",
            background: "var(--surface-1)",
            border: `1px solid ${THEME.line}`,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, cursor: "pointer", color: THEME.ink, fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={withContribution}
              onChange={(e) => setWithContribution(e.target.checked)}
            />
            Continue with fresh annual contributions (Form H filed)
          </label>
          <div style={{ fontSize: 11, color: THEME.muted, paddingLeft: 24 }}>
            {withContribution
              ? "Allows continuing ₹500–₹1.5L annual deposits with Section 80C tax deductions."
              : "Account continues earning tax-free interest with 1 withdrawal allowed per year up to eligible balance."}
          </div>
        </div>

        <ModalActions
          onSave={() => onSave(extensionYears, withContribution)}
          onClose={onClose}
          saveLabel={`Extend by ${extensionYears} Years`}
        />
      </div>
    </Modal>
  );
}

/* ── ANNUAL INTEREST ACCRUAL HELPER MODAL ────────────────────────────── */
function PPFAccrueInterestModal({ ppf, onClose, onAccrue }: any) {
  const currentFY = getCurrentFinancialYear();
  const rate = Number(ppf.rate) || DEFAULT_PPF_RATE;
  const balance = Number(ppf.balance) || 0;
  // Estimated interest for the year
  const estimatedInterest = Math.round(balance * (rate / 100));
  const [interestAmount, setInterestAmount] = useState(String(estimatedInterest));

  return (
    <Modal title={`Credit Annual Interest • ${ppf.institution || ppf.bank || "PPF"}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: THEME.muted, lineHeight: 1.5 }}>
          Sovereign PPF interest is calculated monthly on the lowest balance between the 5th and end of the month, and credited automatically to the account on <strong>March 31st</strong>.
        </p>

        <div style={{ padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--surface-1)", border: `1px solid ${THEME.line}`, display: "flex", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, color: THEME.muted }}>Applicable FY &amp; Rate</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
              {currentFY} @ {rate}% p.a.
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: THEME.muted }}>Current Balance</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: THEME.sage }}>
              ₹{balance.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        <Field label="Annual Interest Amount (₹)">
          <input
            type="number"
            value={interestAmount}
            onChange={(e) => setInterestAmount(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: 13,
              borderRadius: "var(--radius-md)",
              border: `1px solid ${THEME.line}`,
              background: "var(--surface-0)",
              color: THEME.ink,
            }}
          />
        </Field>

        <div style={{ fontSize: 11, color: THEME.muted }}>
          This will add an <strong>Interest Credit</strong> entry to the account ledger dated March 31st and update your active balance.
        </div>

        <ModalActions
          onSave={() => onAccrue(ppf, Number(interestAmount) || 0, currentFY)}
          onClose={onClose}
          saveLabel="Credit Interest to Account"
          disabled={!interestAmount || Number(interestAmount) <= 0}
        />
      </div>
    </Modal>
  );
}

/* ── INTERACTIVE PPF WEALTH CALCULATOR ───────────────────────────────── */
function PPFInteractiveCalculator() {
  const [depositFreq, setDepositFreq] = useState<"annual" | "monthly">("annual");
  const [annualDeposit, setAnnualDeposit] = useState<number>(150000);
  const [rate, setRate] = useState<number>(DEFAULT_PPF_RATE);
  const [tenureYears, setTenureYears] = useState<number>(15);
  const [depositBefore5th, setDepositBefore5th] = useState<boolean>(true);

  // Amortization Schedule Calculation
  const schedule = useMemo(() => {
    const rows = [];
    let opening = 0;
    let totalInvested = 0;
    const r = rate / 100;

    for (let yr = 1; yr <= tenureYears; yr++) {
      const deposit = annualDeposit;
      totalInvested += deposit;
      
      // If deposited before April 5th in annual lump sum, earns full 12 months interest
      // If monthly, earns monthly compounding approx
      let interest = 0;
      if (depositFreq === "annual") {
        if (depositBefore5th) {
          interest = Math.round((opening + deposit) * r);
        } else {
          // Deposited late in the year (e.g. March)
          interest = Math.round(opening * r);
        }
      } else {
        // Monthly deposit
        const monthly = deposit / 12;
        let runningBal = opening;
        let yrInterest = 0;
        for (let m = 1; m <= 12; m++) {
          runningBal += monthly;
          yrInterest += runningBal * (r / 12);
        }
        interest = Math.round(yrInterest);
      }

      const closing = opening + deposit + interest;
      rows.push({
        year: yr,
        openingBalance: opening,
        deposit,
        interest,
        closingBalance: closing,
        totalDeposited: totalInvested,
        cumulativeInterest: closing - totalInvested,
      });
      opening = closing;
    }
    return rows;
  }, [annualDeposit, rate, tenureYears, depositFreq, depositBefore5th]);

  const finalMaturity = schedule[schedule.length - 1]?.closingBalance || 0;
  const totalPrincipal = schedule[schedule.length - 1]?.totalDeposited || 0;
  const totalInterestGained = finalMaturity - totalPrincipal;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: THEME.ink, fontFamily: "var(--font-display)" }}>
              PPF Wealth &amp; Block Extension Simulator
            </h3>
            <p style={{ margin: "4px 0 0 0", fontSize: 13, color: THEME.muted }}>
              Simulate 15 to 35-year sovereign compound wealth creation with the golden 5th-of-month timing rule.
            </p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <Button
              variant={depositFreq === "annual" ? "primary" : "outline"}
              size="sm"
              onClick={() => setDepositFreq("annual")}
            >
              Annual Lump Sum
            </Button>
            <Button
              variant={depositFreq === "monthly" ? "primary" : "outline"}
              size="sm"
              onClick={() => setDepositFreq("monthly")}
            >
              Monthly Deposit
            </Button>
          </div>
        </div>

        {/* Sliders Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 24 }}>
          {/* Amount Slider */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: THEME.muted, fontWeight: 600 }}>
                {depositFreq === "annual" ? "Annual Contribution" : "Monthly Contribution"}
              </span>
              <span style={{ fontWeight: 800, color: THEME.sage }}>
                ₹{(depositFreq === "annual" ? annualDeposit : Math.round(annualDeposit / 12)).toLocaleString("en-IN")}
              </span>
            </div>
            <input
              type="range"
              min={depositFreq === "annual" ? 500 : 500}
              max={depositFreq === "annual" ? 150000 : 12500}
              step={depositFreq === "annual" ? 5000 : 500}
              value={depositFreq === "annual" ? annualDeposit : Math.round(annualDeposit / 12)}
              onChange={(e) => {
                const val = Number(e.target.value);
                setAnnualDeposit(depositFreq === "annual" ? val : val * 12);
              }}
              style={{ width: "100%", accentColor: THEME.sage }}
            />
          </div>

          {/* Rate Slider */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: THEME.muted, fontWeight: 600 }}>Interest Rate (% p.a.)</span>
              <span style={{ fontWeight: 800, color: THEME.accent }}>{rate}%</span>
            </div>
            <input
              type="range"
              min="6.5"
              max="9.0"
              step="0.1"
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.accent }}
            />
          </div>

          {/* Tenure Slider */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
              <span style={{ color: THEME.muted, fontWeight: 600 }}>Tenure (Years)</span>
              <span style={{ fontWeight: 800, color: THEME.gold }}>{tenureYears} Years</span>
            </div>
            <input
              type="range"
              min="15"
              max="35"
              step="5"
              value={tenureYears}
              onChange={(e) => setTenureYears(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.gold }}
            />
          </div>
        </div>

        {/* 5th of Month Switch */}
        {depositFreq === "annual" && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              background: "var(--surface-1)",
              border: `1px solid ${THEME.line}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: THEME.ink, cursor: "pointer", fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={depositBefore5th}
                onChange={(e) => setDepositBefore5th(e.target.checked)}
              />
              Deposit on/before April 5th each year (Maximizes annual interest)
            </label>
            <span style={{ fontSize: 11, color: depositBefore5th ? THEME.sage : THEME.rust, fontWeight: 700 }}>
              {depositBefore5th ? "Full 12 Months Interest" : "Late Deposit (Earns 0 Mo in Y1)"}
            </span>
          </div>
        )}

        {/* KPI Output Bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
          <div style={{ padding: "14px 18px", borderRadius: "var(--radius-lg)", background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
            <div style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase" }}>Total Deposited</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: THEME.ink, marginTop: 2 }}>
              ₹{totalPrincipal.toLocaleString("en-IN")}
            </div>
          </div>
          <div style={{ padding: "14px 18px", borderRadius: "var(--radius-lg)", background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
            <div style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase" }}>Total Tax-Free Interest</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: THEME.gold, marginTop: 2 }}>
              ₹{totalInterestGained.toLocaleString("en-IN")}
            </div>
          </div>
          <div style={{ padding: "14px 18px", borderRadius: "var(--radius-lg)", background: "var(--surface-0)", border: `1px solid ${THEME.line}` }}>
            <div style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase" }}>Maturity Corpus (100% Tax-Free)</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: THEME.sage, marginTop: 2 }}>
              ₹{finalMaturity.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        {/* Year-by-Year Amortization Schedule */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: THEME.ink }}>
            Year-by-Year Sovereign Growth Schedule
          </h4>
          <Button
            variant="outline"
            size="sm"
            icon={<Download size={12} />}
            onClick={() => exportArrayToCSV(schedule, `ppf_amortization_${tenureYears}yr.csv`)}
          >
            Export Schedule
          </Button>
        </div>

        <div style={{ border: `1px solid ${THEME.line}`, borderRadius: "var(--radius-md)", overflow: "hidden", maxHeight: 320, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--surface-1)", borderBottom: `1px solid ${THEME.line}`, position: "sticky", top: 0 }}>
                {["Year", "Opening (₹)", "Deposit (₹)", "Interest (₹)", "Closing Balance (₹)"].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: "8px 12px",
                      textAlign: i === 0 ? "left" : "right",
                      fontSize: 10,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schedule.map((row) => (
                <tr key={row.year} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                  <td style={{ padding: "8px 12px", fontWeight: 700, color: THEME.ink }}>
                    Year {row.year}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: THEME.muted }}>
                    ₹{row.openingBalance.toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", color: THEME.ink }}>
                    ₹{row.deposit.toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: THEME.gold }}>
                    +₹{row.interest.toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 800, color: THEME.sage }}>
                    ₹{row.closingBalance.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ── TAX & 80C OPTIMIZER ─────────────────────────────────────────────── */
function PPFTaxOptimizer({ portfolioStats, items }: any) {
  const currentFYDeposits = portfolioStats.totalFYDeposits;
  const remaining80CRoom = Math.max(0, ANNUAL_MAX_80C_LIMIT - currentFYDeposits);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 6px 0", fontSize: 18, fontWeight: 800, color: THEME.ink, fontFamily: "var(--font-display)" }}>
          Section 80C &amp; EEE Tax Optimization
        </h3>
        <p style={{ margin: "0 0 20px 0", fontSize: 13, color: THEME.muted, lineHeight: 1.5 }}>
          PPF is one of India&apos;s rare financial instruments that enjoys triple <strong>Exempt-Exempt-Exempt (EEE)</strong> status under the Income Tax Act.
        </p>

        {/* Triple EEE Status Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 24 }}>
          <div style={{ padding: 16, borderRadius: "var(--radius-lg)", background: "var(--surface-1)", border: `1px solid ${THEME.line}` }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: THEME.sage, marginBottom: 4 }}>
              1. Exempt on Investment (80C)
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.4 }}>
              Contributions up to ₹1,50,000 per financial year are 100% tax deductible under Section 80C.
            </div>
          </div>

          <div style={{ padding: 16, borderRadius: "var(--radius-lg)", background: "var(--surface-1)", border: `1px solid ${THEME.line}` }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: THEME.gold, marginBottom: 4 }}>
              2. Exempt on Accrual (Interest)
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.4 }}>
              Annual compound interest earned (currently 7.1%) is completely exempt from income tax without TDS.
            </div>
          </div>

          <div style={{ padding: 16, borderRadius: "var(--radius-lg)", background: "var(--surface-1)", border: `1px solid ${THEME.line}` }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: THEME.cyan, marginBottom: 4 }}>
              3. Exempt on Withdrawal
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.4 }}>
              Maturity proceeds and partial withdrawals are 100% tax-free under Section 10(11).
            </div>
          </div>
        </div>

        {/* Slab-by-Slab Tax Savings Breakdown */}
        <div style={{ border: `1px solid ${THEME.line}`, borderRadius: "var(--radius-md)", padding: 16, background: "var(--surface-0)" }}>
          <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 800, color: THEME.ink }}>
            Your Annual Tax Savings from PPF (FY {getCurrentFinancialYear()})
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {[
              { slab: "30% Slab (+ 4% Cess)", rate: 0.312, label: "Highest Tax Bracket" },
              { slab: "20% Slab (+ 4% Cess)", rate: 0.208, label: "Middle Bracket" },
              { slab: "10% Slab (+ 4% Cess)", rate: 0.104, label: "Lower Bracket" },
            ].map((s) => {
              const eligibleDeposit = Math.min(ANNUAL_MAX_80C_LIMIT, currentFYDeposits);
              const saved = Math.round(eligibleDeposit * s.rate);
              return (
                <div key={s.slab} style={{ padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--surface-1)", border: `1px solid ${THEME.line}` }}>
                  <div style={{ fontSize: 11, color: THEME.muted }}>{s.slab}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: THEME.sage, marginTop: 2 }}>
                    ₹{saved.toLocaleString("en-IN")}
                  </div>
                  <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ── STATUTORY PPF RULES & ADVISORY HUB ──────────────────────────────── */
function PPFStatutoryGuideHub() {
  const rules = [
    {
      title: "15-Year Maturity Rule",
      desc: "PPF tenure is 15 financial years calculated from the end of the financial year in which the initial deposit was made (e.g., account opened in July 2015 matures on March 31, 2031).",
      icon: Clock,
      color: THEME.sage,
    },
    {
      title: "The Golden 5th-of-Month Rule",
      desc: "Interest is calculated on the minimum balance between the 5th and the last day of each calendar month. Always deposit before the 5th to earn interest for that full month.",
      icon: Flame,
      color: THEME.gold,
    },
    {
      title: "Loan Against PPF (Years 3 to 6)",
      desc: "You can avail a loan from the 3rd to the 6th financial year. Maximum loan amount is 25% of the balance at the end of the 2nd preceding FY. Interest is 1% above PPF rate.",
      icon: Coins,
      color: THEME.accent,
    },
    {
      title: "Partial Withdrawals (Year 7 Onwards)",
      desc: "1 partial withdrawal per financial year is permitted from the 7th financial year. Up to 50% of the balance at the end of the 4th preceding year or preceding year (whichever is lower).",
      icon: TrendingDown,
      color: THEME.cyan,
    },
    {
      title: "5-Year Block Extensions (Form H)",
      desc: "Accounts can be extended indefinitely in 5-year blocks. Submit Form H within 1 year of maturity to continue fresh deposits; otherwise, the account extends without deposits.",
      icon: RefreshCw,
      color: THEME.gold,
    },
    {
      title: "Minimum & Maximum Limits",
      desc: "Minimum deposit is ₹500 per FY (penalty of ₹50 + ₹500/year to revive inactive accounts). Maximum deposit is ₹1,50,000 across all accounts (including minor accounts).",
      icon: AlertTriangle,
      color: THEME.rust,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 6px 0", fontSize: 18, fontWeight: 800, color: THEME.ink, fontFamily: "var(--font-display)" }}>
          Official PPF Statutory Rules &amp; Operations Guide
        </h3>
        <p style={{ margin: "0 0 20px 0", fontSize: 13, color: THEME.muted }}>
          Essential regulatory guidelines issued by the Ministry of Finance, Government of India.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          {rules.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.title}
                style={{
                  padding: 16,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--surface-1)",
                  border: `1px solid ${THEME.line}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: `color-mix(in srgb, ${r.color} 15%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: r.color,
                    }}
                  >
                    <Icon size={16} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                    {r.title}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.5 }}>
                  {r.desc}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
