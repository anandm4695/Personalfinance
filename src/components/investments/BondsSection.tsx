import React, { useState, useMemo } from "react";
import {
  FileText,
  TrendingUp,
  Activity,
  Calendar,
  Layers,
  Shield,
  ShieldCheck,
  ShieldAlert,
  BarChart3,
  PieChart as PieIcon,
  Search,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Clock,
  Download,
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

export interface BondItem {
  id: string;
  name: string;
  issuer?: string;
  isin?: string;
  securityNature?: string;
  creditRating?: string;
  orderId?: string;
  faceValuePerUnit?: number | string;
  numberOfUnits?: number | string;
  coupon?: number | string;
  ytmRate?: number | string;
  maturityDate?: string;
  orderDate?: string;
  principalRepayment?: string;
  interestPaymentDate?: string;
  cleanPricePerUnit?: number | string;
  accruedInterestPerUnit?: number | string;
  brokerage?: number | string;
  stampDuty?: number | string;
  totalPrincipalAmount?: number;
  totalAccruedInterest?: number;
  totalConsideration?: number;
  totalInvestmentAmount?: number;
  faceValue?: number;
  owner?: string;
  nominee?: string;
  dematAccount?: string;
  taxCategory?: "tax_free" | "54ec" | "sgb" | "taxable_ncd" | "gsec";
  notes?: string;
}

interface BondsSectionProps {
  items: any[];
  removeItem: (key: string, id: string) => void;
  updateItem: (key: string, id: string, data: any) => void;
  addItem?: (key: string, data: any) => void;
  onAdd: () => void;
  showToast?: (msg: string, type?: any) => void;
  activeProfile?: string;
}

// Popular Preset Indian Bonds for quick selection
const POPULAR_BOND_PRESETS = [
  {
    name: "NHAI 54EC Capital Gains Bond Series XXIV",
    issuer: "NHAI",
    securityNature: "54EC Capital Gains Bond",
    creditRating: "CRISIL AAA",
    coupon: 5.25,
    ytmRate: 5.25,
    faceValuePerUnit: 10000,
    interestPaymentDate: "Annually",
    principalRepayment: "At Maturity",
    taxCategory: "54ec",
    tenureYears: 5,
  },
  {
    name: "REC 54EC Capital Gains Bonds Series 2024",
    issuer: "REC Ltd",
    securityNature: "54EC Capital Gains Bond",
    creditRating: "ICRA AAA",
    coupon: 5.25,
    ytmRate: 5.25,
    faceValuePerUnit: 10000,
    interestPaymentDate: "Annually",
    principalRepayment: "At Maturity",
    taxCategory: "54ec",
    tenureYears: 5,
  },
  {
    name: "PFC Capital Gains 54EC Bonds",
    issuer: "Power Finance Corporation",
    securityNature: "54EC Capital Gains Bond",
    creditRating: "CARE AAA",
    coupon: 5.25,
    ytmRate: 5.25,
    faceValuePerUnit: 10000,
    interestPaymentDate: "Annually",
    principalRepayment: "At Maturity",
    taxCategory: "54ec",
    tenureYears: 5,
  },
  {
    name: "RBI 8.05% Floating Rate Savings Bonds (FRSB)",
    issuer: "Reserve Bank of India",
    securityNature: "Floating Rate Govt Bond",
    creditRating: "Sovereign (GOI)",
    coupon: 8.05,
    ytmRate: 8.05,
    faceValuePerUnit: 1000,
    interestPaymentDate: "Semi-Annually",
    principalRepayment: "At Maturity",
    taxCategory: "gsec",
    tenureYears: 7,
  },
  {
    name: "7.18% GS 2033 Benchmark Government Security",
    issuer: "Government of India",
    securityNature: "Central Govt Security (G-Sec)",
    creditRating: "Sovereign (GOI)",
    coupon: 7.18,
    ytmRate: 7.12,
    faceValuePerUnit: 100,
    interestPaymentDate: "Semi-Annually",
    principalRepayment: "At Maturity",
    taxCategory: "gsec",
    tenureYears: 10,
  },
  {
    name: "IIFL Samasta Secured NCD Series 2025",
    issuer: "IIFL Samasta",
    securityNature: "Senior Secured Bond",
    creditRating: "CRISIL AA",
    coupon: 10.5,
    ytmRate: 10.5,
    faceValuePerUnit: 1000,
    interestPaymentDate: "Annually",
    principalRepayment: "At Maturity",
    taxCategory: "taxable_ncd",
    tenureYears: 3,
  },
  {
    name: "Tata Capital Financial Services NCD",
    issuer: "Tata Capital",
    securityNature: "Secured Redeemable NCD",
    creditRating: "CRISIL AAA",
    coupon: 8.85,
    ytmRate: 8.85,
    faceValuePerUnit: 1000,
    interestPaymentDate: "Annually",
    principalRepayment: "At Maturity",
    taxCategory: "taxable_ncd",
    tenureYears: 5,
  },
  {
    name: "Sovereign Gold Bond 2.50% Series (SGB)",
    issuer: "Reserve Bank of India",
    securityNature: "Sovereign Gold Bond",
    creditRating: "Sovereign (GOI)",
    coupon: 2.5,
    ytmRate: 2.5,
    faceValuePerUnit: 6500,
    interestPaymentDate: "Semi-Annually",
    principalRepayment: "At Maturity",
    taxCategory: "sgb",
    tenureYears: 8,
  },
];

// Calculation helper functions
export const isBondMatured = (b: any): boolean => {
  if (!b?.maturityDate) return false;
  const [y, m, d] = String(b.maturityDate).split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return false;
  const matDate = new Date(y, m - 1, d);
  const nowDate = new Date();
  nowDate.setHours(0, 0, 0, 0);
  return matDate.getTime() < nowDate.getTime();
};

export const bondAnnualCoupon = (b: any): number => {
  const principal =
    Number(b?.totalPrincipalAmount || 0) ||
    Number(b?.numberOfUnits || 0) * Number(b?.faceValuePerUnit || 0) ||
    Number(b?.totalInvestmentAmount || 0) ||
    Number(b?.faceValue || 0);
  return (principal * (Number(b?.coupon) || 0)) / 100;
};

export const bondCurrentValue = (b: any): number => {
  const principal =
    Number(b?.totalInvestmentAmount || 0) ||
    Number(b?.totalPrincipalAmount || 0) ||
    Number(b?.numberOfUnits || 0) * Number(b?.faceValuePerUnit || 0) ||
    Number(b?.faceValue || 0);
  const annualCoupon = bondAnnualCoupon(b);
  if (annualCoupon <= 0) return principal;

  const fullTermYears =
    b?.maturityDate && b?.orderDate
      ? Math.max(0, monthsBetween(b.orderDate, b.maturityDate) / 12)
      : b?.maturityDate
      ? Math.max(0, monthsBetween(today(), b.maturityDate) / 12)
      : Infinity;

  if (isBondMatured(b)) {
    // When matured, full lifetime coupon is realized upon completion
    return principal + annualCoupon * (isFinite(fullTermYears) ? fullTermYears : 0);
  }

  if (!b?.orderDate) return principal;
  const elapsedYears = Math.max(0, monthsBetween(b.orderDate, today()) / 12);
  return principal + annualCoupon * Math.min(elapsedYears, fullTermYears);
};

export const maturityCountdown = (dateStr: string) => {
  if (!dateStr) return null;
  const [y, m, d] = String(dateStr).split("-").map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  const matDate = new Date(y, m - 1, d);
  const nowDate = new Date();
  nowDate.setHours(0, 0, 0, 0);
  const days = Math.ceil((matDate.getTime() - nowDate.getTime()) / 86400000);
  if (days < 0) return { text: "Matured", color: THEME.muted, matured: true, days };
  if (days === 0) return { text: "Matures today!", color: THEME.rust, matured: false, days };
  if (days <= 30) return { text: `${days}d left`, color: THEME.rust, matured: false, days };
  if (days <= 90) return { text: `${Math.ceil(days / 30)}m left`, color: THEME.gold, matured: false, days };
  if (days <= 365) return { text: `${Math.ceil(days / 30)}m left`, color: THEME.gold, matured: false, days };
  const yrs = Math.floor(days / 365);
  const mos = Math.ceil((days % 365) / 30);
  return { text: `${yrs}y ${mos}m left`, color: THEME.muted, matured: false, days };
};

const getRatingColor = (rating?: string) => {
  const r = (rating || "").toUpperCase();
  if (r.includes("SOVEREIGN") || r.includes("GOI")) return "#10b981"; // Emerald
  if (r.includes("AAA")) return "#059669"; // Green
  if (r.includes("AA+")) return "#3b82f6"; // Blue
  if (r.includes("AA")) return "#6366f1"; // Indigo
  if (r.includes("A")) return "#f59e0b"; // Amber
  if (r.includes("BBB") || r.includes("BB")) return "#f97316"; // Orange
  return THEME.muted;
};

const BOND_GOLD = "#d97706";
const BOND_AMBER = THEME.gold || "#d97706";

const lblStyle = {
  fontSize: 9.5,
  color: THEME.muted,
  fontWeight: 700,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  marginBottom: 3,
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--surface-0)",
  border: `1.5px solid ${THEME.line}`,
  borderRadius: 10,
  color: THEME.ink,
  fontSize: 14,
};

export function BondsSection({
  items = [],
  removeItem,
  updateItem,
  addItem,
  onAdd,
  showToast,
  activeProfile = "all",
}: BondsSectionProps) {
  const { familyProfiles } = useMasterData();

  // View & Filter States
  const [viewMode, setViewMode] = useState<
    "cards" | "table" | "ladder" | "cashflow" | "analytics" | "calculator"
  >("cards");
  const [filterTab, setFilterTab] = useState<
    "all" | "active" | "due_soon" | "matured" | "tax_free" | "govt" | "corporate"
  >("all");
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<
    "maturity_asc" | "maturity_desc" | "invested_desc" | "coupon_desc" | "ytm_desc" | "issuer_asc"
  >("maturity_asc");
  const [copiedISIN, setCopiedISIN] = useState<string | null>(null);

  // Modals
  const [editBond, setEditBond] = useState<any>(null);
  const [confirmDeleteBond, setConfirmDeleteBond] = useState<any>(null);
  const [cashflowBond, setCashflowBond] = useState<any>(null);

  // Async action handlers
  const { run: saveBondEdit, loading: savingBondEdit } = useAsyncAction(
    async (id: string, v: any) => {
      await updateItem("bonds", id, v);
    },
    {
      onSuccess: () => {
        setEditBond(null);
        showToast?.("Bond updated successfully", "success");
      },
      onError: (e: any) =>
        showToast?.(`Failed to save bond: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  // Counts & Calculations
  const maturedCount = items.filter(isBondMatured).length;
  const activeItems = items.filter((b) => !isBondMatured(b));
  const activeCount = activeItems.length;

  const dueSoonCount = items.filter((b) => {
    if (isBondMatured(b)) return false;
    const cd = maturityCountdown(b.maturityDate);
    return cd && cd.days !== undefined && cd.days >= 0 && cd.days <= 90;
  }).length;

  const totalInvested = items.reduce((s: number, b: any) => {
    return (
      s +
      Number(
        b.totalInvestmentAmount ||
          b.totalPrincipalAmount ||
          Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0) ||
          b.faceValue ||
          0
      )
    );
  }, 0);

  const totalCurrentValue = items.reduce((s: number, b: any) => s + bondCurrentValue(b), 0);
  const totalLifetimeCouponsEarned = Math.max(0, totalCurrentValue - totalInvested);

  // Accounting standard: Only active (non-matured) bonds yield ongoing recurring annual coupon income
  const annualIncome = activeItems.reduce((s: number, b: any) => {
    const principal =
      Number(b.totalPrincipalAmount || 0) ||
      Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0);
    return s + (principal * Number(b.coupon || 0)) / 100;
  }, 0);

  const monthlyCouponRunRate = annualIncome / 12;

  // Weighted Average Coupon (WAC) & Weighted Average YTM (WAYTM) for active bonds
  const totalActivePrincipal = activeItems.reduce((s: number, b: any) => {
    return (
      s +
      (Number(b.totalPrincipalAmount || 0) ||
        Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0) ||
        Number(b.totalInvestmentAmount || 0) ||
        0)
    );
  }, 0);

  const weightedCoupon =
    totalActivePrincipal > 0
      ? activeItems.reduce((s: number, b: any) => {
          const p =
            Number(b.totalPrincipalAmount || 0) ||
            Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0) ||
            Number(b.totalInvestmentAmount || 0) ||
            0;
          return s + p * (Number(b.coupon) || 0);
        }, 0) / totalActivePrincipal
      : 0;

  const weightedYtm =
    totalActivePrincipal > 0
      ? activeItems.reduce((s: number, b: any) => {
          const p =
            Number(b.totalPrincipalAmount || 0) ||
            Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0) ||
            Number(b.totalInvestmentAmount || 0) ||
            0;
          return s + p * (Number(b.ytmRate) || Number(b.coupon) || 0);
        }, 0) / totalActivePrincipal
      : 0;

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return items
      .filter((b: any) => {
        // Tab Filter
        if (filterTab === "active" && isBondMatured(b)) return false;
        if (filterTab === "matured" && !isBondMatured(b)) return false;
        if (filterTab === "due_soon") {
          if (isBondMatured(b)) return false;
          const cd = maturityCountdown(b.maturityDate);
          if (!cd || cd.days === undefined || cd.days < 0 || cd.days > 90) return false;
        }
        if (filterTab === "tax_free") {
          const sec = (b.securityNature || "").toLowerCase();
          const name = (b.name || "").toLowerCase();
          const isTaxFree =
            sec.includes("tax free") ||
            sec.includes("54ec") ||
            name.includes("tax free") ||
            name.includes("54ec") ||
            b.taxCategory === "tax_free" ||
            b.taxCategory === "54ec";
          if (!isTaxFree) return false;
        }
        if (filterTab === "govt") {
          const sec = (b.securityNature || "").toLowerCase();
          const iss = (b.issuer || "").toLowerCase();
          const r = (b.creditRating || "").toLowerCase();
          const isGovt =
            sec.includes("govt") ||
            sec.includes("g-sec") ||
            sec.includes("sgb") ||
            sec.includes("sovereign") ||
            iss.includes("rbi") ||
            iss.includes("india") ||
            iss.includes("nhai") ||
            iss.includes("rec") ||
            iss.includes("pfc") ||
            r.includes("sovereign");
          if (!isGovt) return false;
        }
        if (filterTab === "corporate") {
          const sec = (b.securityNature || "").toLowerCase();
          const iss = (b.issuer || "").toLowerCase();
          const isCorp =
            sec.includes("ncd") ||
            sec.includes("corporate") ||
            sec.includes("secured") ||
            (!iss.includes("rbi") && !iss.includes("india") && !iss.includes("nhai") && !iss.includes("rec") && !iss.includes("pfc"));
          if (!isCorp) return false;
        }

        // Rating Filter
        if (ratingFilter !== "all") {
          const cr = (b.creditRating || "").toUpperCase();
          if (ratingFilter === "SOVEREIGN" && !cr.includes("SOVEREIGN") && !cr.includes("GOI")) return false;
          if (ratingFilter === "AAA" && !cr.includes("AAA")) return false;
          if (ratingFilter === "AA" && (!cr.includes("AA") || cr.includes("AAA"))) return false;
          if (ratingFilter === "HIGH_YIELD" && (cr.includes("AAA") || cr.includes("SOVEREIGN"))) return false;
        }

        // Owner Profile Filter
        if (activeProfile !== "all" && b.owner && b.owner !== activeProfile) return false;
        if (ownerFilter !== "all" && b.owner !== ownerFilter) return false;

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = (b.name || "").toLowerCase().includes(q);
          const matchIssuer = (b.issuer || "").toLowerCase().includes(q);
          const matchIsin = (b.isin || "").toLowerCase().includes(q);
          const matchOrderId = (b.orderId || "").toLowerCase().includes(q);
          const matchRating = (b.creditRating || "").toLowerCase().includes(q);
          if (!matchName && !matchIssuer && !matchIsin && !matchOrderId && !matchRating) return false;
        }

        return true;
      })
      .sort((a: any, b: any) => {
        if (sortBy === "maturity_asc") {
          const da = a.maturityDate ? new Date(a.maturityDate).getTime() : Infinity;
          const db = b.maturityDate ? new Date(b.maturityDate).getTime() : Infinity;
          return da - db;
        }
        if (sortBy === "maturity_desc") {
          const da = a.maturityDate ? new Date(a.maturityDate).getTime() : 0;
          const db = b.maturityDate ? new Date(b.maturityDate).getTime() : 0;
          return db - da;
        }
        if (sortBy === "invested_desc") {
          const ia = Number(a.totalInvestmentAmount || a.totalPrincipalAmount || 0);
          const ib = Number(b.totalInvestmentAmount || b.totalPrincipalAmount || 0);
          return ib - ia;
        }
        if (sortBy === "coupon_desc") {
          return (Number(b.coupon) || 0) - (Number(a.coupon) || 0);
        }
        if (sortBy === "ytm_desc") {
          return (Number(b.ytmRate || b.coupon) || 0) - (Number(a.ytmRate || a.coupon) || 0);
        }
        if (sortBy === "issuer_asc") {
          return (a.issuer || a.name || "").localeCompare(b.issuer || b.name || "");
        }
        return 0;
      });
  }, [items, filterTab, ratingFilter, activeProfile, ownerFilter, searchQuery, sortBy]);

  // Copy ISIN handler
  const handleCopyISIN = (isin: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isin) return;
    navigator.clipboard?.writeText(isin);
    setCopiedISIN(isin);
    showToast?.(`Copied ISIN: ${isin}`, "success");
    setTimeout(() => setCopiedISIN(null), 2000);
  };

  // Export to CSV handler
  const handleExportCSV = () => {
    if (items.length === 0) return;
    const csvData = items.map((b) => ({
      "Bond Name": b.name || "",
      Issuer: b.issuer || "",
      ISIN: b.isin || "",
      "Security Nature": b.securityNature || "",
      "Credit Rating": b.creditRating || "",
      "Units": b.numberOfUnits || "",
      "Face Value (₹)": b.faceValuePerUnit || "",
      "Total Principal (₹)": b.totalPrincipalAmount || "",
      "Total Investment (₹)": b.totalInvestmentAmount || "",
      "Coupon Rate (%)": b.coupon || "",
      "YTM (%)": b.ytmRate || "",
      "Order Date": b.orderDate || "",
      "Maturity Date": b.maturityDate || "",
      "Interest Frequency": b.interestPaymentDate || "",
      "Principal Repayment": b.principalRepayment || "",
      Status: isBondMatured(b) ? "Matured" : "Active",
      Owner: b.owner || "Self",
      Nominee: b.nominee || "",
    }));
    exportArrayToCSV(csvData, `Bonds_Portfolio_${today()}.csv`);
    showToast?.("Bonds portfolio exported to CSV", "success");
  };

  const fmtBondDate = (d?: string) =>
    d
      ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── KPI Dashboard Strip ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          label="Total Invested"
          value={fmtINRFull(totalInvested)}
          numericValue={totalInvested}
          formatValue={fmtINRFull}
          icon={<IndianRupee />}
          color={BOND_AMBER}
          subtext={`${items.length} total bonds`}
        />

        <StatCard
          label="Annual Coupon"
          value={fmtINRFull(annualIncome)}
          numericValue={annualIncome}
          formatValue={fmtINRFull}
          icon={<Coins />}
          color={THEME.sage}
          subtext={`~${fmtINRFull(monthlyCouponRunRate)} / month`}
        />

        <StatCard
          label="Weighted Avg Coupon"
          value={weightedCoupon > 0 ? `${weightedCoupon.toFixed(2)}%` : "0.00%"}
          numericValue={weightedCoupon}
          formatValue={(n) => `${n.toFixed(2)}%`}
          icon={<Percent />}
          color="#3b82f6"
          subtext={weightedYtm > 0 ? `Avg YTM: ${weightedYtm.toFixed(2)}%` : "Yield to Maturity"}
        />

        <StatCard
          label={maturedCount > 0 ? `${maturedCount} Matured` : "Bonds Active"}
          value={String(activeCount)}
          numericValue={activeCount}
          formatValue={(n) => String(Math.round(n))}
          icon={<BarChart3 />}
          color={maturedCount > 0 ? THEME.rust : THEME.accent}
          subtext={dueSoonCount > 0 ? `${dueSoonCount} due in <90 days` : "Portfolio status"}
        />
      </div>

      {/* ── Top Navigation Bar: View Modes & Action Buttons ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "8px 12px",
          background: "var(--surface-0)",
          borderRadius: 14,
          border: `1px solid ${THEME.line}`,
        }}
      >
        {/* View Mode Selector */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { id: "cards", label: "Cards", icon: Layers },
            { id: "table", label: "Ledger", icon: FileSpreadsheet },
            { id: "ladder", label: "Bond Ladder", icon: Activity },
            { id: "cashflow", label: "Coupon Calendar", icon: Calendar },
            { id: "analytics", label: "Analytics", icon: PieIcon },
            { id: "calculator", label: "YTM & Tax", icon: Calculator },
          ].map((mode) => {
            const Icon = mode.icon;
            const active = viewMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setViewMode(mode.id as any)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "7px 12px",
                  borderRadius: 9,
                  fontSize: 12.5,
                  fontWeight: active ? 700 : 500,
                  background: active ? "var(--t-accent)" : "transparent",
                  color: active ? "#ffffff" : THEME.ink,
                  border: active ? "1px solid var(--t-accent)" : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <Icon size={14} />
                {mode.label}
              </button>
            );
          })}
        </div>

        {/* Global Actions */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {items.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              icon={<Download size={13} />}
              onClick={handleExportCSV}
              title="Export portfolio as CSV"
            >
              Export CSV
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={onAdd}
            style={{ background: BOND_AMBER, borderColor: BOND_AMBER }}
          >
            Add Bond
          </Button>
        </div>
      </div>

      {/* ── Filters and Search Toolbar ── */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: 14,
          background: "var(--surface-0)",
          borderRadius: 12,
          border: `1px solid ${THEME.line}`,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          {/* Status Filter Pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={`demat-portfolio-pill ${filterTab === "all" ? "active" : ""}`}
              style={{ cursor: "pointer", border: "none" }}
            >
              {`All (${items.length})`}
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("active")}
              className={`demat-portfolio-pill ${filterTab === "active" ? "active" : ""}`}
              style={{ cursor: "pointer", border: "none" }}
            >
              {`Active (${activeCount})`}
            </button>
            {maturedCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterTab("matured")}
                className={`demat-portfolio-pill ${filterTab === "matured" ? "active" : ""}`}
                style={{ cursor: "pointer", border: "none" }}
              >
                {`Matured (${maturedCount})`}
              </button>
            )}
            {dueSoonCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterTab("due_soon")}
                className={`demat-portfolio-pill ${filterTab === "due_soon" ? "active" : ""}`}
                style={{ cursor: "pointer", border: "none" }}
              >
                {`Due Soon (${dueSoonCount})`}
              </button>
            )}
            <button
              type="button"
              onClick={() => setFilterTab("tax_free")}
              className={`demat-portfolio-pill ${filterTab === "tax_free" ? "active" : ""}`}
              style={{ cursor: "pointer", border: "none" }}
            >
              Tax-Free & 54EC
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("govt")}
              className={`demat-portfolio-pill ${filterTab === "govt" ? "active" : ""}`}
              style={{ cursor: "pointer", border: "none" }}
            >
              Govt / Sovereign
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("corporate")}
              className={`demat-portfolio-pill ${filterTab === "corporate" ? "active" : ""}`}
              style={{ cursor: "pointer", border: "none" }}
            >
              Corporate NCDs
            </button>
          </div>

          {/* Quick Stats Pill */}
          <div style={{ fontSize: 11, color: THEME.muted, display: "flex", gap: 8, alignItems: "center" }}>
            <span>Showing <strong style={{ color: THEME.ink }}>{filteredItems.length}</strong> of {items.length} bonds</span>
          </div>
        </div>

        {/* Secondary Filters: Search, Credit Rating, Owner & Sort */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
            alignItems: "center",
          }}
        >
          {/* Search Box */}
          <div style={{ position: "relative" }}>
            <Search
              size={13}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: THEME.muted,
              }}
            />
            <input
              type="text"
              placeholder="Search bond, issuer, ISIN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                ...inputStyle,
                paddingLeft: 30,
                fontSize: 12,
                height: 34,
                paddingTop: 6,
                paddingBottom: 6,
              }}
            />
          </div>

          {/* Credit Rating Filter */}
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            style={{
              ...inputStyle,
              fontSize: 12,
              height: 34,
              paddingTop: 4,
              paddingBottom: 4,
            }}
          >
            <option value="all">All Credit Ratings</option>
            <option value="SOVEREIGN">Sovereign / Govt of India</option>
            <option value="AAA">AAA Rated (Prime)</option>
            <option value="AA">AA / AA+ Rated (High Grade)</option>
            <option value="HIGH_YIELD">High Yield / Other</option>
          </select>

          {/* Family Owner Filter */}
          {familyProfiles.length > 0 && (
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              style={{
                ...inputStyle,
                fontSize: 12,
                height: 34,
                paddingTop: 4,
                paddingBottom: 4,
              }}
            >
              <option value="all">All Family Members</option>
              <option value="self">Self</option>
              {familyProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatProfileOption(p)}
                </option>
              ))}
            </select>
          )}

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{
              ...inputStyle,
              fontSize: 12,
              height: 34,
              paddingTop: 4,
              paddingBottom: 4,
            }}
          >
            <option value="maturity_asc">Maturity: Earliest First</option>
            <option value="maturity_desc">Maturity: Furthest First</option>
            <option value="invested_desc">Invested Amount: High to Low</option>
            <option value="coupon_desc">Coupon Rate: High to Low</option>
            <option value="ytm_desc">YTM: High to Low</option>
            <option value="issuer_asc">Issuer: A to Z</option>
          </select>
        </div>
      </div>

      {/* ── EMPTY STATE ── */}
      {items.length === 0 ? (
        <Card
          style={{
            padding: 48,
            textAlign: "center",
            background: "var(--surface-0)",
            border: `1.5px dashed ${THEME.line}`,
            borderRadius: 16,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #92400e 0%, #d97706 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "#fff",
              boxShadow: "0 8px 24px rgba(217, 119, 6, 0.25)",
            }}
          >
            <FileText size={30} />
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: THEME.ink, marginBottom: 8 }}>
            No Bonds Added Yet
          </h3>
          <p
            style={{
              fontSize: 13,
              color: THEME.muted,
              maxWidth: 520,
              margin: "0 auto 20px",
              lineHeight: 1.5,
            }}
          >
            Track government bonds, SGBs, and corporate bonds with full order slip details — coupon
            rate, YTM, maturity, and investment breakdown.
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 24,
            }}
          >
            {["Senior Secured", "Govt / SGB", "Coupon & YTM", "Order Details"].map((pill) => (
              <span
                key={pill}
                style={{
                  fontSize: 11,
                  padding: "4px 10px",
                  borderRadius: 12,
                  background: "var(--surface-1)",
                  color: THEME.muted,
                  border: `1px solid ${THEME.line}`,
                }}
              >
                {pill}
              </span>
            ))}
          </div>

          <Button
            variant="primary"
            size="md"
            icon={<Plus size={16} />}
            onClick={onAdd}
            style={{ background: BOND_AMBER, borderColor: BOND_AMBER, margin: "0 auto" }}
          >
            Add Bond
          </Button>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card style={{ padding: 36, textAlign: "center" }}>
          <AlertTriangle size={32} style={{ color: THEME.gold, margin: "0 auto 12px" }} />
          <h4 style={{ fontSize: 16, fontWeight: 700, color: THEME.ink, marginBottom: 6 }}>
            No bonds match the selected filters
          </h4>
          <p style={{ fontSize: 13, color: THEME.muted, marginBottom: 16 }}>
            Try resetting your search query or selecting a different status/rating filter.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFilterTab("all");
              setRatingFilter("all");
              setOwnerFilter("all");
              setSearchQuery("");
            }}
          >
            Reset Filters
          </Button>
        </Card>
      ) : (
        <>
          {/* ════════════════════════════════════════════════════════════════
             VIEW 1: CARDS VIEW
             ════════════════════════════════════════════════════════════════ */}
          {viewMode === "cards" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(var(--grid-min-lg, 360px), 1fr))",
                gap: 20,
              }}
            >
              {filteredItems.map((b: any) => {
                const isMatured = isBondMatured(b);
                const investmentAmt = Number(
                  b.totalInvestmentAmount ||
                    b.totalPrincipalAmount ||
                    Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0) ||
                    b.faceValue ||
                    0
                );
                const ml = maturityCountdown(b.maturityDate);
                const isDueSoon = !isMatured && ml && ml.text.includes("d left") && !ml.matured;
                const annualCoupon = bondAnnualCoupon(b);
                const charges = Number(b.brokerage || 0) + Number(b.stampDuty || 0);
                const bondProgress = isMatured
                  ? 100
                  : b.orderDate && b.maturityDate
                  ? (() => {
                      const start = new Date(b.orderDate + "T00:00:00").getTime();
                      const end = new Date(b.maturityDate + "T00:00:00").getTime();
                      return end > start
                        ? Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100))
                        : 0;
                    })()
                  : 0;

                const currentVal = bondCurrentValue(b);
                const couponEarned = currentVal - investmentAmt;
                const cardBorder = isMatured ? THEME.muted : isDueSoon ? THEME.rust : BOND_AMBER;
                const ratingColor = getRatingColor(b.creditRating);

                return (
                  <Card
                    key={b.id}
                    style={{
                      padding: 22,
                      borderTop: `3.5px solid ${cardBorder}`,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      position: "relative",
                      transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    }}
                  >
                    <div>
                      {/* Header: badges + actions */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 12,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                            flex: 1,
                            marginRight: 8,
                          }}
                        >
                          {b.securityNature && (
                            <Badge variant={isMatured ? "muted" : "gold"} style={{ fontSize: 9 }}>
                              {b.securityNature}
                            </Badge>
                          )}
                          {b.issuer && (
                            <Badge variant="muted" style={{ fontSize: 9 }}>
                              {b.issuer}
                            </Badge>
                          )}
                          {b.creditRating && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                                padding: "2px 7px",
                                borderRadius: 10,
                                fontSize: 9,
                                fontWeight: 700,
                                background: `color-mix(in srgb, ${ratingColor} 12%, transparent)`,
                                border: `1px solid color-mix(in srgb, ${ratingColor} 28%, transparent)`,
                                color: ratingColor,
                              }}
                            >
                              <Shield size={9} />
                              {b.creditRating}
                            </span>
                          )}
                          {isMatured ? (
                            <Badge variant="muted" style={{ fontSize: 9 }}>
                              Matured
                            </Badge>
                          ) : isDueSoon ? (
                            <Badge variant="rust" style={{ fontSize: 9 }}>
                              {ml?.text}
                            </Badge>
                          ) : null}
                        </div>

                        {/* Card Actions */}
                        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Calendar size={12} />}
                            onClick={() => setCashflowBond(b)}
                            aria-label={`View cash flow for ${b.issuer || "bond"}`}
                            title="View Coupon Schedule"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Pencil size={12} />}
                            onClick={() => setEditBond(b)}
                            aria-label={`Edit ${b.issuer || "bond"}`}
                            title="Edit"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Trash2 size={12} />}
                            style={{ color: THEME.rust }}
                            onClick={() => setConfirmDeleteBond(b)}
                            aria-label={`Delete ${b.issuer || "bond"}`}
                            title="Delete"
                          />
                        </div>
                      </div>

                      {/* Logo + Bond name + ISIN */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          marginBottom: 14,
                        }}
                      >
                        <BankLogo
                          name={b.issuer || b.name}
                          size={38}
                          accentColor={isMatured ? THEME.muted : BOND_AMBER}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 16,
                              fontWeight: 800,
                              color: THEME.ink,
                              lineHeight: 1.3,
                              marginBottom: 3,
                            }}
                          >
                            {b.name}
                          </div>
                          {b.isin && (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span
                                style={{
                                  fontSize: 10.5,
                                  color: THEME.muted,
                                  fontFamily: "monospace",
                                  letterSpacing: "0.04em",
                                }}
                              >
                                {b.isin}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyISIN(b.isin, e)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  padding: 0,
                                  cursor: "pointer",
                                  color: copiedISIN === b.isin ? THEME.sage : THEME.muted,
                                  display: "inline-flex",
                                  alignItems: "center",
                                }}
                                title="Copy ISIN"
                              >
                                {copiedISIN === b.isin ? <Check size={11} /> : <Copy size={11} />}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Investment amount (primary) */}
                      <div style={lblStyle}>
                        {isMatured ? "Total Investment (Matured)" : "Total Investment"}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontSize: 26,
                          fontWeight: 600,
                          color: isMatured ? THEME.muted : BOND_AMBER,
                          letterSpacing: "-0.02em",
                          marginBottom: couponEarned > 0 ? 4 : 16,
                        }}
                      >
                        <Money value={investmentAmt} variant="full" />
                      </div>

                      {couponEarned > 0 && (
                        <div style={{ fontSize: 10.5, color: THEME.sage, marginBottom: 16 }}>
                          {isMatured ? (
                            <>
                              +<Money value={couponEarned} variant="full" /> total lifetime coupon ·{" "}
                              <span style={{ color: THEME.ink, fontWeight: 700 }}>
                                <Money value={currentVal} variant="full" /> final maturity value
                              </span>
                            </>
                          ) : (
                            <>
                              +<Money value={couponEarned} variant="full" /> coupon earned to date ·{" "}
                              <Money value={currentVal} variant="full" /> current value
                            </>
                          )}
                        </div>
                      )}

                      {/* Key metrics — 4 amber/muted pills */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(4, 1fr)",
                          gap: 6,
                          marginBottom: 14,
                        }}
                      >
                        {[
                          ["Coupon", b.coupon ? `${b.coupon}%` : "—"],
                          ["YTM", b.ytmRate ? `${b.ytmRate}%` : "—"],
                          ["Units", b.numberOfUnits || "—"],
                          [
                            "FV/Unit",
                            b.faceValuePerUnit ? (
                              <Money value={b.faceValuePerUnit} variant="full" />
                            ) : (
                              "—"
                            ),
                          ],
                        ].map(([l, v]) => (
                          <div
                            key={l as string}
                            style={{
                              padding: "8px 6px",
                              background: isMatured
                                ? `color-mix(in srgb, ${THEME.muted} 8%, transparent)`
                                : `color-mix(in srgb, ${BOND_AMBER} 6%, transparent)`,
                              borderRadius: 8,
                              border: `1px solid ${
                                isMatured
                                  ? `color-mix(in srgb, ${THEME.muted} 16%, transparent)`
                                  : `color-mix(in srgb, ${BOND_AMBER} 14%, transparent)`
                              }`,
                              textAlign: "center",
                            }}
                          >
                            <div style={{ ...lblStyle, marginBottom: 3 }}>{l as string}</div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: THEME.ink }}>
                              {v}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Maturity + Annual Income row */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 12,
                          padding: "12px 0",
                          borderTop: `1px solid ${THEME.line}`,
                          borderBottom: bondProgress > 0 ? "none" : `1px solid ${THEME.line}`,
                          marginBottom: bondProgress > 0 ? 0 : 14,
                        }}
                      >
                        <div>
                          <div style={lblStyle}>{isMatured ? "Matured On" : "Maturity Date"}</div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, color: THEME.ink }}>
                            {fmtBondDate(b.maturityDate)}
                          </div>
                          {ml && (
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: isMatured ? THEME.muted : ml.color,
                                marginTop: 2,
                              }}
                            >
                              {isMatured ? "Term Completed" : ml.text}
                            </div>
                          )}
                        </div>
                        <div>
                          <div style={lblStyle}>Annual Income</div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 800,
                              color: isMatured ? THEME.muted : THEME.sage,
                            }}
                          >
                            {isMatured ? (
                              "₹0 (Matured)"
                            ) : annualCoupon > 0 ? (
                              <Money value={annualCoupon} variant="full" />
                            ) : (
                              "—"
                            )}
                          </div>
                          {b.interestPaymentDate && (
                            <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                              {isMatured ? "Redeemed / Completed" : b.interestPaymentDate}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Elapsed progress bar */}
                      {bondProgress > 0 && (
                        <div
                          style={{
                            padding: "10px 0 14px",
                            borderBottom: `1px solid ${THEME.line}`,
                            marginBottom: 14,
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 9.5,
                              color: THEME.muted,
                              marginBottom: 4,
                              fontWeight: 600,
                            }}
                          >
                            <span>{isMatured ? "STATUS" : "ELAPSED"}</span>
                            <span
                              style={{
                                color: isMatured ? THEME.sage : BOND_AMBER,
                                fontWeight: 700,
                              }}
                            >
                              {isMatured ? "100% COMPLETED" : `${bondProgress.toFixed(0)}%`}
                            </span>
                          </div>
                          <div className="progress-track">
                            <div
                              className="progress-fill"
                              style={{
                                width: `${bondProgress}%`,
                                background: isMatured ? THEME.sage : BOND_AMBER,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Investment breakdown — 3 col */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr 1fr",
                          gap: 8,
                          marginBottom: 12,
                        }}
                      >
                        {[
                          [
                            "Principal",
                            b.totalPrincipalAmount ||
                              Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0) ||
                              b.faceValue,
                          ],
                          ["Accrued Int.", b.totalAccruedInterest],
                          ["Consideration", b.totalConsideration],
                        ].map(([label, val]) => (
                          <div key={label as string}>
                            <div style={lblStyle}>{label as string}</div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: THEME.ink }}>
                              {val ? <Money value={val} variant="full" /> : "—"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Footer meta row */}
                    <div
                      style={{
                        paddingTop: 10,
                        borderTop: `1px solid ${THEME.line}`,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "4px 12px",
                        fontSize: 10,
                        color: THEME.muted,
                      }}
                    >
                      {b.principalRepayment && (
                        <span>
                          Principal:{" "}
                          <strong style={{ color: THEME.ink }}>{b.principalRepayment}</strong>
                        </span>
                      )}
                      {charges > 0 && (
                        <span>
                          Charges:{" "}
                          <strong style={{ color: THEME.ink }}>
                            <Money value={charges} variant="full" />
                          </strong>
                        </span>
                      )}
                      {b.orderId && (
                        <span>
                          Order #: <strong style={{ color: THEME.ink }}>{b.orderId}</strong>
                        </span>
                      )}
                      {b.orderDate && (
                        <span>
                          Ordered: <strong style={{ color: THEME.ink }}>{b.orderDate}</strong>
                        </span>
                      )}
                      {b.nominee && (
                        <span>
                          Nominee: <strong style={{ color: THEME.ink }}>{b.nominee}</strong>
                        </span>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
             VIEW 2: INSTITUTIONAL TABLE / LEDGER VIEW
             ════════════════════════════════════════════════════════════════ */}
          {viewMode === "table" && (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "left",
                    fontSize: 12.5,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "var(--surface-1)",
                        borderBottom: `1.5px solid ${THEME.line}`,
                        color: THEME.muted,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      <th style={{ padding: "12px 16px" }}>Bond / Issuer</th>
                      <th style={{ padding: "12px 12px" }}>ISIN / Rating</th>
                      <th style={{ padding: "12px 12px", textAlign: "right" }}>Coupon %</th>
                      <th style={{ padding: "12px 12px", textAlign: "right" }}>YTM %</th>
                      <th style={{ padding: "12px 12px", textAlign: "right" }}>Units</th>
                      <th style={{ padding: "12px 12px", textAlign: "right" }}>Total Invested</th>
                      <th style={{ padding: "12px 12px", textAlign: "right" }}>Current Val</th>
                      <th style={{ padding: "12px 12px", textAlign: "right" }}>Annual Coupon</th>
                      <th style={{ padding: "12px 12px" }}>Maturity Date</th>
                      <th style={{ padding: "12px 12px" }}>Status</th>
                      <th style={{ padding: "12px 16px", textAlign: "center" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((b: any) => {
                      const isMatured = isBondMatured(b);
                      const inv = Number(
                        b.totalInvestmentAmount ||
                          b.totalPrincipalAmount ||
                          Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0) ||
                          b.faceValue ||
                          0
                      );
                      const curVal = bondCurrentValue(b);
                      const annCoupon = isMatured ? 0 : bondAnnualCoupon(b);
                      const ml = maturityCountdown(b.maturityDate);
                      const ratingColor = getRatingColor(b.creditRating);

                      return (
                        <tr
                          key={b.id}
                          style={{
                            borderBottom: `1px solid ${THEME.line}`,
                            background: isMatured ? "var(--surface-1)" : "transparent",
                            opacity: isMatured ? 0.8 : 1,
                          }}
                        >
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ fontWeight: 700, color: THEME.ink }}>{b.name}</div>
                            <div style={{ fontSize: 11, color: THEME.muted }}>
                              {b.issuer || b.securityNature || "Bond"}
                            </div>
                          </td>
                          <td style={{ padding: "12px 12px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <span style={{ fontFamily: "monospace", fontSize: 11 }}>
                                {b.isin || "—"}
                              </span>
                              {b.isin && (
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyISIN(b.isin, e)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    padding: 0,
                                    color: copiedISIN === b.isin ? THEME.sage : THEME.muted,
                                  }}
                                >
                                  {copiedISIN === b.isin ? <Check size={10} /> : <Copy size={10} />}
                                </button>
                              )}
                            </div>
                            {b.creditRating && (
                              <span
                                style={{
                                  fontSize: 9.5,
                                  fontWeight: 700,
                                  color: ratingColor,
                                }}
                              >
                                {b.creditRating}
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "12px 12px",
                              textAlign: "right",
                              fontWeight: 700,
                              color: THEME.ink,
                            }}
                          >
                            {b.coupon ? `${b.coupon}%` : "—"}
                          </td>
                          <td
                            style={{
                              padding: "12px 12px",
                              textAlign: "right",
                              fontWeight: 600,
                              color: THEME.muted,
                            }}
                          >
                            {b.ytmRate ? `${b.ytmRate}%` : "—"}
                          </td>
                          <td style={{ padding: "12px 12px", textAlign: "right" }}>
                            {b.numberOfUnits || "—"}
                          </td>
                          <td
                            style={{
                              padding: "12px 12px",
                              textAlign: "right",
                              fontWeight: 700,
                              color: isMatured ? THEME.muted : BOND_AMBER,
                            }}
                          >
                            <Money value={inv} variant="full" />
                          </td>
                          <td
                            style={{
                              padding: "12px 12px",
                              textAlign: "right",
                              fontWeight: 700,
                              color: THEME.ink,
                            }}
                          >
                            <Money value={curVal} variant="full" />
                          </td>
                          <td
                            style={{
                              padding: "12px 12px",
                              textAlign: "right",
                              fontWeight: 700,
                              color: isMatured ? THEME.muted : THEME.sage,
                            }}
                          >
                            {annCoupon > 0 ? <Money value={annCoupon} variant="full" /> : "—"}
                          </td>
                          <td style={{ padding: "12px 12px" }}>
                            <div style={{ fontWeight: 600 }}>{fmtBondDate(b.maturityDate)}</div>
                            {ml && (
                              <div
                                style={{
                                  fontSize: 10,
                                  color: isMatured ? THEME.muted : ml.color,
                                  fontWeight: 600,
                                }}
                              >
                                {ml.text}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "12px 12px" }}>
                            {isMatured ? (
                              <Badge variant="muted">Matured</Badge>
                            ) : ml?.text.includes("d left") ? (
                              <Badge variant="rust">{ml.text}</Badge>
                            ) : (
                              <Badge variant="sage">Active</Badge>
                            )}
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <div
                              style={{
                                display: "inline-flex",
                                gap: 4,
                                alignItems: "center",
                              }}
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<Calendar size={12} />}
                                onClick={() => setCashflowBond(b)}
                                title="Coupon Schedule"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<Pencil size={12} />}
                                onClick={() => setEditBond(b)}
                                title="Edit"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<Trash2 size={12} />}
                                style={{ color: THEME.rust }}
                                onClick={() => setConfirmDeleteBond(b)}
                                title="Delete"
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

          {/* ════════════════════════════════════════════════════════════════
             VIEW 3: BOND LADDER & MATURITY TIMELINE
             ════════════════════════════════════════════════════════════════ */}
          {viewMode === "ladder" && (
            <BondLadderView items={items} onEdit={setEditBond} onSchedule={setCashflowBond} />
          )}

          {/* ════════════════════════════════════════════════════════════════
             VIEW 4: COUPON CASH FLOW CALENDAR
             ════════════════════════════════════════════════════════════════ */}
          {viewMode === "cashflow" && (
            <CouponCashFlowCalendar items={activeItems} />
          )}

          {/* ════════════════════════════════════════════════════════════════
             VIEW 5: CREDIT & SECTOR ANALYTICS
             ════════════════════════════════════════════════════════════════ */}
          {viewMode === "analytics" && (
            <BondsAnalyticsView items={items} />
          )}

          {/* ════════════════════════════════════════════════════════════════
             VIEW 6: BOND PRICING, YTM & DURATION CALCULATOR + TAX VAULT
             ════════════════════════════════════════════════════════════════ */}
          {viewMode === "calculator" && (
            <BondCalculatorAndTaxVault items={items} />
          )}
        </>
      )}

      {/* ── MODALS ── */}
      {editBond && (
        <EditBondModal
          bond={editBond}
          onClose={() => setEditBond(null)}
          onSave={(updated: any) => saveBondEdit(editBond.id, updated)}
          saving={savingBondEdit}
        />
      )}

      {confirmDeleteBond && (
        <ConfirmDialog
          message={`Delete ${confirmDeleteBond.issuer || confirmDeleteBond.name || "this bond"}? This cannot be undone.`}
          onConfirm={() => {
            removeItem("bonds", confirmDeleteBond.id);
            setConfirmDeleteBond(null);
            showToast?.("Bond deleted successfully", "info");
          }}
          onCancel={() => setConfirmDeleteBond(null)}
        />
      )}

      {cashflowBond && (
        <BondCashflowScheduleModal
          bond={cashflowBond}
          onClose={() => setCashflowBond(null)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   BOND LADDER & MATURITY TIMELINE VIEW
   ══════════════════════════════════════════════════════════════════════ */
function BondLadderView({ items, onEdit, onSchedule }: any) {
  const ladderData = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const map: Record<number, { year: number; principal: number; count: number; bonds: any[] }> = {};

    // Generate buckets for past/current + next 10 years
    for (let y = currentYear; y <= currentYear + 10; y++) {
      map[y] = { year: y, principal: 0, count: 0, bonds: [] };
    }

    items.forEach((b: any) => {
      if (!b.maturityDate) return;
      const yr = new Date(b.maturityDate).getFullYear();
      const p =
        Number(b.totalPrincipalAmount || 0) ||
        Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0) ||
        Number(b.totalInvestmentAmount || 0) ||
        0;

      if (!map[yr]) {
        map[yr] = { year: yr, principal: 0, count: 0, bonds: [] };
      }
      map[yr].principal += p;
      map[yr].count += 1;
      map[yr].bonds.push(b);
    });

    return Object.values(map).sort((a, b) => a.year - b.year);
  }, [items]);

  const maxYearPrincipal = Math.max(...ladderData.map((d) => d.principal), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Intro Card */}
      <Card style={{ padding: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              background: "color-mix(in srgb, var(--t-accent) 12%, transparent)",
              color: "var(--t-accent)",
            }}
          >
            <Activity size={22} />
          </div>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700, color: THEME.ink, marginBottom: 4 }}>
              Bond Maturity Laddering Strategy
            </h4>
            <p style={{ fontSize: 12.5, color: THEME.muted, lineHeight: 1.5, margin: 0 }}>
              Laddering your bond portfolio across different maturity years smooths interest rate
              fluctuations, provides regular liquidity events, and ensures continuous reinvestment
              at prevailing market yields.
            </p>
          </div>
        </div>
      </Card>

      {/* Ladder Chart & Year Buckets */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {ladderData
          .filter((d) => d.count > 0 || d.year <= new Date().getFullYear() + 5)
          .map((bucket) => {
            const isCurrentYear = bucket.year === new Date().getFullYear();
            const barPct = Math.min(100, Math.max(0, (bucket.principal / maxYearPrincipal) * 100));

            return (
              <Card
                key={bucket.year}
                style={{
                  padding: 18,
                  borderLeft: isCurrentYear
                    ? `4px solid var(--t-accent)`
                    : bucket.principal > 0
                    ? `4px solid ${BOND_AMBER}`
                    : `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: THEME.ink }}>
                      {bucket.year}
                    </span>
                    {isCurrentYear && <Badge variant="rust">Current Year</Badge>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: BOND_AMBER }}>
                      <Money value={bucket.principal} variant="full" />
                    </div>
                    <div style={{ fontSize: 10.5, color: THEME.muted }}>
                      {bucket.count} {bucket.count === 1 ? "bond redemption" : "bond redemptions"}
                    </div>
                  </div>
                </div>

                {/* Progress Visual */}
                <div className="progress-track" style={{ height: 6, marginBottom: 12 }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${barPct}%`,
                      background: isCurrentYear ? "var(--t-accent)" : BOND_AMBER,
                    }}
                  />
                </div>

                {/* Bonds list in this bucket */}
                {bucket.bonds.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {bucket.bonds.map((b: any) => (
                      <div
                        key={b.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "6px 8px",
                          background: "var(--surface-1)",
                          borderRadius: 8,
                          fontSize: 11.5,
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1, marginRight: 8 }}>
                          <div style={{ fontWeight: 600, color: THEME.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {b.name}
                          </div>
                          <div style={{ fontSize: 9.5, color: THEME.muted }}>
                            {b.coupon}% · {b.maturityDate}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontWeight: 700, color: THEME.ink }}>
                            <Money
                              value={
                                Number(b.totalPrincipalAmount || 0) ||
                                Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0) ||
                                Number(b.totalInvestmentAmount || 0) ||
                                0
                              }
                              variant="full"
                            />
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Calendar size={11} />}
                            onClick={() => onSchedule?.(b)}
                            title="Schedule"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 11, color: THEME.muted, fontStyle: "italic", padding: "8px 0" }}>
                    No bonds maturing in {bucket.year} (Maturity gap)
                  </div>
                )}
              </Card>
            );
          })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   COUPON CASH FLOW CALENDAR
   ══════════════════════════════════════════════════════════════════════ */
function CouponCashFlowCalendar({ items = [] }: { items: any[] }) {
  const MONTHS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  // Projected Monthly Cashflow for the next 12 calendar months
  const monthlyProjection = useMemo(() => {
    const res: Array<{
      monthName: string;
      monthIdx: number;
      expectedPayout: number;
      items: Array<{ name: string; amount: number; frequency: string }>;
    }> = MONTHS.map((name, idx) => ({
      monthName: name,
      monthIdx: idx,
      expectedPayout: 0,
      items: [],
    }));

    items.forEach((b) => {
      const annCoupon = bondAnnualCoupon(b);
      if (annCoupon <= 0) return;
      const freq = (b.interestPaymentDate || "Annually").toLowerCase();

      // Determine payout months
      let payoutMonths: number[] = [];
      if (freq.includes("monthly")) {
        payoutMonths = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
      } else if (freq.includes("quarterly")) {
        payoutMonths = [2, 5, 8, 11]; // Mar, Jun, Sep, Dec
      } else if (freq.includes("semi")) {
        payoutMonths = [5, 11]; // Jun, Dec
      } else {
        // Annual: assume maturity month or order month
        const refDate = b.maturityDate || b.orderDate;
        const m = refDate ? new Date(refDate).getMonth() : 2; // Default March
        payoutMonths = [m];
      }

      const installment = annCoupon / (payoutMonths.length || 1);
      payoutMonths.forEach((m) => {
        if (res[m]) {
          res[m].expectedPayout += installment;
          res[m].items.push({
            name: b.name,
            amount: installment,
            frequency: b.interestPaymentDate || "Annually",
          });
        }
      });
    });

    return res;
  }, [items]);

  const totalProjectedAnnual = monthlyProjection.reduce((s, m) => s + m.expectedPayout, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* KPI Highlight */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
        <StatCard
          label="Projected 12-Month Coupon Inflow"
          value={fmtINRFull(totalProjectedAnnual)}
          numericValue={totalProjectedAnnual}
          formatValue={fmtINRFull}
          icon={<Calendar />}
          color={THEME.sage}
          subtext="Total predicted coupon credits"
        />
        <StatCard
          label="Average Monthly Cashflow"
          value={fmtINRFull(totalProjectedAnnual / 12)}
          numericValue={totalProjectedAnnual / 12}
          formatValue={fmtINRFull}
          icon={<DollarSign />}
          color={BOND_AMBER}
          subtext="Smoothed passive income"
        />
      </div>

      {/* 12-Month Cashflow Grid */}
      <Card style={{ padding: 22 }}>
        <h4 style={{ fontSize: 16, fontWeight: 700, color: THEME.ink, marginBottom: 16 }}>
          Monthly Coupon Inflow Breakdown
        </h4>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          {monthlyProjection.map((m) => {
            const hasPayout = m.expectedPayout > 0;
            return (
              <div
                key={m.monthName}
                style={{
                  padding: 14,
                  borderRadius: 12,
                  background: hasPayout
                    ? "color-mix(in srgb, var(--t-sage, #10b981) 8%, var(--surface-1))"
                    : "var(--surface-1)",
                  border: hasPayout
                    ? "1px solid color-mix(in srgb, var(--t-sage, #10b981) 30%, transparent)"
                    : `1px solid ${THEME.line}`,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                  {m.monthName}
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: hasPayout ? THEME.sage : THEME.muted,
                    margin: "8px 0 4px",
                  }}
                >
                  <Money value={m.expectedPayout} variant="full" />
                </div>
                <div style={{ fontSize: 10, color: THEME.muted }}>
                  {m.items.length} {m.items.length === 1 ? "coupon" : "coupons"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Recharts Bar Chart */}
        <div style={{ height: 260, marginTop: 10 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyProjection} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="monthName" stroke={THEME.muted} fontSize={11} />
              <YAxis
                stroke={THEME.muted}
                fontSize={11}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(val: any) => [fmtINRFull(Number(val)), "Projected Coupon"]}
                contentStyle={{
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="expectedPayout" fill={THEME.sage} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   CREDIT & SECTOR ANALYTICS VIEW
   ══════════════════════════════════════════════════════════════════════ */
function BondsAnalyticsView({ items = [] }: { items: any[] }) {
  // Credit Quality Distribution
  const ratingData = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((b) => {
      const cr = (b.creditRating || "Unrated").toUpperCase();
      let key = "Unrated";
      if (cr.includes("SOVEREIGN") || cr.includes("GOI")) key = "Sovereign (GOI)";
      else if (cr.includes("AAA")) key = "AAA Rated (Prime)";
      else if (cr.includes("AA+")) key = "AA+ Rated";
      else if (cr.includes("AA")) key = "AA Rated";
      else if (cr.includes("A")) key = "A Rated";
      else key = "Other / Unrated";

      const p =
        Number(b.totalInvestmentAmount || 0) ||
        Number(b.totalPrincipalAmount || 0) ||
        Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0) ||
        0;
      map[key] = (map[key] || 0) + p;
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [items]);

  // Sector Exposure Distribution
  const sectorData = useMemo(() => {
    const map: Record<string, number> = {};
    items.forEach((b) => {
      const sec = (b.securityNature || "").toLowerCase();
      const iss = (b.issuer || "").toLowerCase();
      let key = "Corporate & NBFC";
      if (sec.includes("g-sec") || sec.includes("govt") || sec.includes("sovereign") || iss.includes("rbi") || iss.includes("india")) {
        key = "Central Government (G-Sec/SGB)";
      } else if (sec.includes("54ec") || iss.includes("nhai") || iss.includes("rec") || iss.includes("pfc")) {
        key = "PSU & Infrastructure (54EC)";
      } else if (sec.includes("tax free")) {
        key = "Tax-Free PSU Bonds";
      } else if (iss.includes("iifl") || iss.includes("bajaj") || iss.includes("tata") || iss.includes("mahindra")) {
        key = "Financial Institutions / NBFCs";
      }

      const p =
        Number(b.totalInvestmentAmount || 0) ||
        Number(b.totalPrincipalAmount || 0) ||
        Number(b.numberOfUnits || 0) * Number(b.faceValuePerUnit || 0) ||
        0;
      map[key] = (map[key] || 0) + p;
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [items]);

  const COLORS = [THEME.sage, "#3b82f6", BOND_AMBER, "#8b5cf6", "#ec4899", "#f97316"];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
      {/* Rating Breakdown Pie */}
      <Card style={{ padding: 22 }}>
        <h4 style={{ fontSize: 16, fontWeight: 700, color: THEME.ink, marginBottom: 4 }}>
          Credit Quality Distribution
        </h4>
        <p style={{ fontSize: 12, color: THEME.muted, marginBottom: 16 }}>
          Allocation across credit risk tiers
        </p>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={ratingData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
              >
                {ratingData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val: any) => [fmtINRFull(Number(val)), "Investment"]}
                contentStyle={{
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {ratingData.map((d, i) => (
            <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: COLORS[i % COLORS.length],
                }}
              />
              <span style={{ color: THEME.muted }}>{d.name}:</span>
              <strong style={{ color: THEME.ink }}>{fmtINRFull(d.value)}</strong>
            </div>
          ))}
        </div>
      </Card>

      {/* Sector Exposure Bar Chart */}
      <Card style={{ padding: 22 }}>
        <h4 style={{ fontSize: 16, fontWeight: 700, color: THEME.ink, marginBottom: 4 }}>
          Sector & Issuer Category Exposure
        </h4>
        <p style={{ fontSize: 12, color: THEME.muted, marginBottom: 16 }}>
          Diversification across PSUs, Sovereign, and NBFCs
        </p>
        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={sectorData}
              layout="vertical"
              margin={{ top: 10, right: 10, left: 20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis type="number" stroke={THEME.muted} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} fontSize={10} />
              <YAxis type="category" dataKey="name" stroke={THEME.muted} fontSize={10.5} width={130} />
              <Tooltip
                formatter={(val: any) => [fmtINRFull(Number(val)), "Allocation"]}
                contentStyle={{
                  background: "var(--surface-0)",
                  border: `1px solid ${THEME.line}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" fill={BOND_AMBER} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   BOND CALCULATOR & TAX VAULT
   ══════════════════════════════════════════════════════════════════════ */
function BondCalculatorAndTaxVault({ items = [] }: { items: any[] }) {
  // Interactive Pricing & YTM Simulator State
  const [faceValue, setFaceValue] = useState<number>(1000);
  const [cleanPrice, setCleanPrice] = useState<number>(985);
  const [couponRate, setCouponRate] = useState<number>(9.5);
  const [tenureYears, setTenureYears] = useState<number>(3);
  const [frequency, setFrequency] = useState<number>(1); // 1 = Annual, 2 = Semi, 4 = Quarterly
  const [accruedDays, setAccruedDays] = useState<number>(60);

  // Computed Calculator Metrics
  const annualCoupon = (faceValue * couponRate) / 100;
  const accruedInterest = (annualCoupon * accruedDays) / 365;
  const dirtyPrice = cleanPrice + accruedInterest;
  const currentYield = cleanPrice > 0 ? (annualCoupon / cleanPrice) * 100 : 0;

  // Approximate Yield to Maturity (YTM) formula:
  // YTM approx = [ C + (F - P) / n ] / [ (F + P) / 2 ]
  const approxYTM =
    cleanPrice > 0 && tenureYears > 0
      ? ((annualCoupon + (faceValue - cleanPrice) / tenureYears) / ((faceValue + cleanPrice) / 2)) * 100
      : 0;

  // Macaulay Duration approx = (1 + y/k)/(y) - [ (1 + y/k) + n*(c - y) ] / [ c * ( (1+y/k)^n - 1 ) + y ]
  const modifiedDuration = approxYTM > 0 ? (tenureYears * 0.85) / (1 + approxYTM / 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Calculator Simulator Card ── */}
      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              background: "color-mix(in srgb, #3b82f6 12%, transparent)",
              color: "#3b82f6",
            }}
          >
            <Calculator size={22} />
          </div>
          <div>
            <h4 style={{ fontSize: 17, fontWeight: 800, color: THEME.ink, margin: 0 }}>
              Bond Pricing, YTM & Duration Simulator
            </h4>
            <p style={{ fontSize: 12.5, color: THEME.muted, margin: "2px 0 0" }}>
              Calculate Clean vs Dirty Price, Current Yield, Yield to Maturity (YTM), and Interest
              Rate Sensitivity (Modified Duration).
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {/* Inputs Column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Face Value (₹)">
                <input
                  style={inputStyle}
                  type="number"
                  value={faceValue}
                  onChange={(e) => setFaceValue(Number(e.target.value) || 0)}
                />
              </Field>
              <Field label="Clean Price (₹)">
                <input
                  style={inputStyle}
                  type="number"
                  value={cleanPrice}
                  onChange={(e) => setCleanPrice(Number(e.target.value) || 0)}
                />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Coupon Rate (% p.a.)">
                <input
                  style={inputStyle}
                  type="number"
                  step="0.01"
                  value={couponRate}
                  onChange={(e) => setCouponRate(Number(e.target.value) || 0)}
                />
              </Field>
              <Field label="Tenure to Maturity (Yrs)">
                <input
                  style={inputStyle}
                  type="number"
                  step="0.5"
                  value={tenureYears}
                  onChange={(e) => setTenureYears(Number(e.target.value) || 0)}
                />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Field label="Accrued Interest Days">
                <input
                  style={inputStyle}
                  type="number"
                  value={accruedDays}
                  onChange={(e) => setAccruedDays(Number(e.target.value) || 0)}
                />
              </Field>
              <Field label="Payout Frequency">
                <select
                  style={inputStyle}
                  value={frequency}
                  onChange={(e) => setFrequency(Number(e.target.value))}
                >
                  <option value={1}>Annual (1x/yr)</option>
                  <option value={2}>Semi-Annual (2x/yr)</option>
                  <option value={4}>Quarterly (4x/yr)</option>
                </select>
              </Field>
            </div>
          </div>

          {/* Results Output Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              background: "var(--surface-1)",
              padding: 18,
              borderRadius: 14,
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div style={{ padding: 10, background: "var(--surface-0)", borderRadius: 10 }}>
              <div style={lblStyle}>Dirty / Settlement Price</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: BOND_AMBER }}>
                ₹{dirtyPrice.toFixed(2)}
              </div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                Includes ₹{accruedInterest.toFixed(2)} accrued interest
              </div>
            </div>

            <div style={{ padding: 10, background: "var(--surface-0)", borderRadius: 10 }}>
              <div style={lblStyle}>Yield to Maturity (YTM)</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: THEME.sage }}>
                {approxYTM.toFixed(2)}%
              </div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                Total annual compounded return
              </div>
            </div>

            <div style={{ padding: 10, background: "var(--surface-0)", borderRadius: 10 }}>
              <div style={lblStyle}>Current Running Yield</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#3b82f6" }}>
                {currentYield.toFixed(2)}%
              </div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                Annual coupon ÷ Clean price
              </div>
            </div>

            <div style={{ padding: 10, background: "var(--surface-0)", borderRadius: 10 }}>
              <div style={lblStyle}>Modified Duration</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink }}>
                {modifiedDuration.toFixed(2)} yrs
              </div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                Sensitivity to 1% rate change
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Tax & Regulatory Vault ── */}
      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div
            style={{
              padding: 10,
              borderRadius: 10,
              background: "color-mix(in srgb, var(--t-sage, #10b981) 12%, transparent)",
              color: THEME.sage,
            }}
          >
            <ShieldCheck size={22} />
          </div>
          <div>
            <h4 style={{ fontSize: 17, fontWeight: 800, color: THEME.ink, margin: 0 }}>
              Indian Fixed Income Tax & Regulatory Vault
            </h4>
            <p style={{ fontSize: 12.5, color: THEME.muted, margin: "2px 0 0" }}>
              Comprehensive reference guide for tax treatment across Indian bonds, NCDs, SGBs, and
              Government Securities.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {[
            {
              title: "Section 54EC Capital Gains Bonds",
              issuer: "NHAI / REC / PFC / IRFC",
              taxOnInterest: "Taxable as per Income Tax Slab",
              taxOnMaturity: "100% Tax-Exempt Capital Gains (up to ₹50 Lakhs)",
              lockIn: "5 Years mandatory lock-in",
              badge: "Capital Gains Saver",
              badgeColor: THEME.sage,
            },
            {
              title: "Tax-Free PSU Bonds (Sec 10(15))",
              issuer: "HUDCO, NTPC, PFC, IRFC (Existing Tranches)",
              taxOnInterest: "100% Tax-Free (No TDS, No Tax in any Slab)",
              taxOnMaturity: "LTCG if sold on exchange (>12m) @ 12.5%",
              lockIn: "Tradeable on secondary markets",
              badge: "Tax-Free Coupon",
              badgeColor: "#3b82f6",
            },
            {
              title: "Sovereign Gold Bonds (SGB)",
              issuer: "Reserve Bank of India (Govt of India)",
              taxOnInterest: "2.50% p.a. taxable as per slab rate",
              taxOnMaturity: "100% Tax-Free Capital Gains upon RBI redemption (8 Yrs)",
              lockIn: "8 Years (Early redemption from 5th year)",
              badge: "Sovereign Tax Shield",
              badgeColor: BOND_AMBER,
            },
            {
              title: "Listed & Corporate NCDs",
              issuer: "NBFCs & Private Corporates",
              taxOnInterest: "Taxable at marginal slab rate (TDS applicable > ₹10k)",
              taxOnMaturity: "STCG / LTCG taxed at slab / 12.5% as per holding tenure",
              lockIn: "Tradeable / Hold to Maturity",
              badge: "High Yield Fixed Income",
              badgeColor: "#8b5cf6",
            },
          ].map((item) => (
            <div
              key={item.title}
              style={{
                padding: 16,
                borderRadius: 12,
                background: "var(--surface-1)",
                border: `1px solid ${THEME.line}`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <h5 style={{ fontSize: 14, fontWeight: 700, color: THEME.ink, margin: 0 }}>
                    {item.title}
                  </h5>
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 6,
                      background: `color-mix(in srgb, ${item.badgeColor} 15%, transparent)`,
                      color: item.badgeColor,
                    }}
                  >
                    {item.badge}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 10 }}>
                  Issuers: <strong>{item.issuer}</strong>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5 }}>
                  <div>
                    <span style={{ color: THEME.muted }}>Interest Tax: </span>
                    <strong style={{ color: THEME.ink }}>{item.taxOnInterest}</strong>
                  </div>
                  <div>
                    <span style={{ color: THEME.muted }}>Maturity Tax: </span>
                    <strong style={{ color: THEME.ink }}>{item.taxOnMaturity}</strong>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  paddingTop: 8,
                  borderTop: `1px solid ${THEME.line}`,
                  fontSize: 10.5,
                  color: THEME.muted,
                }}
              >
                Tenure / Lock-in: <strong style={{ color: THEME.ink }}>{item.lockIn}</strong>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   BOND CASHFLOW SCHEDULE MODAL (INDIVIDUAL BOND)
   ══════════════════════════════════════════════════════════════════════ */
function BondCashflowScheduleModal({ bond, onClose }: { bond: any; onClose: () => void }) {
  const annCoupon = bondAnnualCoupon(bond);
  const principal =
    Number(bond.totalPrincipalAmount || 0) ||
    Number(bond.numberOfUnits || 0) * Number(bond.faceValuePerUnit || 0) ||
    Number(bond.totalInvestmentAmount || 0) ||
    0;

  // Generate simulated cash flow list from order date to maturity date
  const schedule = useMemo(() => {
    if (!bond.maturityDate) return [];
    const freq = (bond.interestPaymentDate || "Annually").toLowerCase();
    const stepMonths = freq.includes("monthly")
      ? 1
      : freq.includes("quarterly")
      ? 3
      : freq.includes("semi")
      ? 6
      : 12;

    const installment = annCoupon / (12 / stepMonths);
    const flows: Array<{
      date: string;
      type: "Coupon" | "Maturity Principal" | "Initial Investment";
      amount: number;
      balance: number;
    }> = [];

    const orderD = bond.orderDate || today();
    flows.push({
      date: orderD,
      type: "Initial Investment",
      amount: -(
        Number(bond.totalInvestmentAmount || 0) ||
        principal
      ),
      balance: principal,
    });

    let currDate = addMonthsToDateStr(orderD, stepMonths);
    while (currDate <= bond.maturityDate) {
      flows.push({
        date: currDate,
        type: "Coupon",
        amount: installment,
        balance: principal,
      });
      currDate = addMonthsToDateStr(currDate, stepMonths);
    }

    // Final redemption on maturity date
    flows.push({
      date: bond.maturityDate,
      type: "Maturity Principal",
      amount: principal,
      balance: 0,
    });

    return flows;
  }, [bond, annCoupon, principal]);

  return (
    <Modal title={`Coupon Schedule: ${bond.name}`} onClose={onClose} width={640}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Header Summary Strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
            background: "var(--surface-1)",
            padding: 14,
            borderRadius: 12,
            border: `1px solid ${THEME.line}`,
          }}
        >
          <div>
            <div style={lblStyle}>Face Value Principal</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink }}>
              <Money value={principal} variant="full" />
            </div>
          </div>
          <div>
            <div style={lblStyle}>Coupon Rate & Freq</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: BOND_AMBER }}>
              {bond.coupon}% · {bond.interestPaymentDate || "Annually"}
            </div>
          </div>
          <div>
            <div style={lblStyle}>Maturity Date</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: THEME.sage }}>
              {bond.maturityDate || "—"}
            </div>
          </div>
        </div>

        {/* Schedule Table */}
        <div style={{ maxHeight: 340, overflowY: "auto", border: `1px solid ${THEME.line}`, borderRadius: 10 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr
                style={{
                  background: "var(--surface-1)",
                  borderBottom: `1px solid ${THEME.line}`,
                  color: THEME.muted,
                  fontWeight: 700,
                  fontSize: 10,
                  textTransform: "uppercase",
                }}
              >
                <th style={{ padding: "8px 12px", textAlign: "left" }}>Date</th>
                <th style={{ padding: "8px 12px", textAlign: "left" }}>Cashflow Type</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>Amount (₹)</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>Principal Balance</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((item, idx) => {
                const isOutflow = item.amount < 0;
                return (
                  <tr
                    key={idx}
                    style={{
                      borderBottom: `1px solid ${THEME.line}`,
                      background:
                        item.type === "Maturity Principal"
                          ? "color-mix(in srgb, var(--t-sage) 8%, transparent)"
                          : "transparent",
                    }}
                  >
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>{item.date}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color:
                            item.type === "Initial Investment"
                              ? THEME.rust
                              : item.type === "Maturity Principal"
                              ? THEME.sage
                              : BOND_AMBER,
                        }}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "8px 12px",
                        textAlign: "right",
                        fontWeight: 700,
                        color: isOutflow ? THEME.rust : THEME.sage,
                      }}
                    >
                      {isOutflow ? `-` : `+`}
                      <Money value={Math.abs(item.amount)} variant="full" />
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: THEME.muted }}>
                      <Money value={item.balance} variant="full" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <ModalActions>
          <Button variant="outline" onClick={onClose}>
            Close Schedule
          </Button>
        </ModalActions>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   EDIT BOND MODAL
   ══════════════════════════════════════════════════════════════════════ */
export function EditBondModal({ bond: initial, onClose, onSave, saving }: any) {
  const { familyProfiles } = useMasterData();

  const [bond, setBond] = useState({
    name: initial?.name || "",
    issuer: initial?.issuer || "",
    isin: initial?.isin || "",
    securityNature: initial?.securityNature || "",
    creditRating: initial?.creditRating || "",
    orderId: initial?.orderId || "",
    faceValuePerUnit: initial?.faceValuePerUnit != null ? String(initial.faceValuePerUnit) : "1000",
    numberOfUnits: initial?.numberOfUnits != null ? String(initial.numberOfUnits) : "1",
    coupon: initial?.coupon != null ? String(initial.coupon) : "",
    ytmRate: initial?.ytmRate != null ? String(initial.ytmRate) : "",
    maturityDate: initial?.maturityDate || "",
    orderDate: initial?.orderDate || today(),
    principalRepayment: initial?.principalRepayment || "At Maturity",
    interestPaymentDate: initial?.interestPaymentDate || "Annually",
    cleanPricePerUnit: initial?.cleanPricePerUnit != null ? String(initial.cleanPricePerUnit) : "",
    accruedInterestPerUnit:
      initial?.accruedInterestPerUnit != null ? String(initial.accruedInterestPerUnit) : "0",
    brokerage: initial?.brokerage != null ? String(initial.brokerage) : "0",
    stampDuty: initial?.stampDuty != null ? String(initial.stampDuty) : "0",
    buyerName: initial?.buyerName || "",
    sellerName: initial?.sellerName || "",
    owner: initial?.owner || "self",
    nominee: initial?.nominee || "",
    dematAccount: initial?.dematAccount || "",
    taxCategory: initial?.taxCategory || "taxable_ncd",
    notes: initial?.notes || "",
  });

  const units = Number(bond.numberOfUnits) || 0;
  const fvpu = Number(bond.faceValuePerUnit) || 0;
  const cppu = Number(bond.cleanPricePerUnit) || fvpu;
  const aipu = Number(bond.accruedInterestPerUnit) || 0;
  const brok = Number(bond.brokerage) || 0;
  const sdut = Number(bond.stampDuty) || 0;
  const totalPrincipal = units * fvpu;
  const totalAccrued = units * aipu;
  const totalConsideration = units * cppu + totalAccrued;
  const totalInvestment = totalConsideration + brok + sdut;

  const handleApplyPreset = (preset: any) => {
    setBond((prev) => ({
      ...prev,
      name: preset.name,
      issuer: preset.issuer,
      securityNature: preset.securityNature,
      creditRating: preset.creditRating,
      coupon: String(preset.coupon),
      ytmRate: String(preset.ytmRate),
      faceValuePerUnit: String(preset.faceValuePerUnit),
      cleanPricePerUnit: String(preset.faceValuePerUnit),
      interestPaymentDate: preset.interestPaymentDate,
      principalRepayment: preset.principalRepayment,
      taxCategory: preset.taxCategory,
      maturityDate: addMonthsToDateStr(prev.orderDate || today(), preset.tenureYears * 12),
    }));
  };

  const handleSave = () => {
    if (!bond.name || !bond.coupon) return;
    onSave({
      ...bond,
      faceValue: totalPrincipal || Number(bond.faceValuePerUnit) || 0,
      totalPrincipalAmount: totalPrincipal,
      totalAccruedInterest: totalAccrued,
      totalConsideration,
      totalInvestmentAmount: totalInvestment,
    });
  };

  return (
    <Modal title={initial?.id ? "Edit Bond" : "Add Bond"} onClose={onClose} width={700}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Quick Presets Picker */}
        <div>
          <div style={{ ...lblStyle, marginBottom: 6 }}>Popular Indian Bond Presets</div>
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6 }}>
            {POPULAR_BOND_PRESETS.slice(0, 5).map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleApplyPreset(p)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 600,
                  background: "var(--surface-1)",
                  border: `1px solid ${THEME.line}`,
                  color: THEME.ink,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {p.issuer} ({p.coupon}%)
              </button>
            ))}
          </div>
        </div>

        {/* Bond Identity */}
        <div style={{ ...lblStyle, borderTop: `1px solid ${THEME.line}`, paddingTop: 10 }}>
          Bond Identity & Security Details
        </div>
        <Field label="Bond / Product Name *">
          <input
            style={inputStyle}
            value={bond.name}
            onChange={(e) => setBond({ ...bond, name: e.target.value })}
            placeholder="e.g. NHAI 7.50% Tax Free 2030 or IIFL Samasta NCD"
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Issuer / Organization">
            <input
              style={inputStyle}
              value={bond.issuer}
              onChange={(e) => setBond({ ...bond, issuer: e.target.value })}
              placeholder="e.g. NHAI, REC, RBI, Tata Capital"
            />
          </Field>
          <Field label="Security Nature">
            <input
              style={inputStyle}
              value={bond.securityNature}
              onChange={(e) => setBond({ ...bond, securityNature: e.target.value })}
              placeholder="e.g. Senior Secured Bond, 54EC, G-Sec"
            />
          </Field>
          <Field label="ISIN (International Securities Number)">
            <input
              style={inputStyle}
              value={bond.isin}
              onChange={(e) => setBond({ ...bond, isin: e.target.value })}
              placeholder="INE413U07335"
            />
          </Field>
          <Field label="Credit Rating">
            <input
              style={inputStyle}
              value={bond.creditRating}
              onChange={(e) => setBond({ ...bond, creditRating: e.target.value })}
              placeholder="e.g. CRISIL AAA, Sovereign (GOI), ICRA AA+"
            />
          </Field>
        </div>

        {/* Financial Terms */}
        <div style={{ ...lblStyle, borderTop: `1px solid ${THEME.line}`, paddingTop: 10 }}>
          Financial Terms & Payout Structure
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Face Value per Unit (₹) *">
            <input
              style={inputStyle}
              type="number"
              value={bond.faceValuePerUnit}
              onChange={(e) => setBond({ ...bond, faceValuePerUnit: e.target.value })}
              placeholder="1000"
            />
          </Field>
          <Field label="Number of Units *">
            <input
              style={inputStyle}
              type="number"
              value={bond.numberOfUnits}
              onChange={(e) => setBond({ ...bond, numberOfUnits: e.target.value })}
              placeholder="10"
            />
          </Field>
          <Field label="Coupon Rate (% p.a.) *">
            <input
              style={inputStyle}
              type="number"
              step="0.01"
              value={bond.coupon}
              onChange={(e) => setBond({ ...bond, coupon: e.target.value })}
              placeholder="9.6"
            />
          </Field>
          <Field label="Yield to Maturity (YTM %)">
            <input
              style={inputStyle}
              type="number"
              step="0.01"
              value={bond.ytmRate}
              onChange={(e) => setBond({ ...bond, ytmRate: e.target.value })}
              placeholder="10.25"
            />
          </Field>
          <Field label="Order / Purchase Date">
            <input
              style={inputStyle}
              type="date"
              value={bond.orderDate}
              onChange={(e) => setBond({ ...bond, orderDate: e.target.value })}
            />
          </Field>
          <Field label="Maturity Date">
            <input
              style={inputStyle}
              type="date"
              value={bond.maturityDate}
              onChange={(e) => setBond({ ...bond, maturityDate: e.target.value })}
            />
          </Field>
          <Field label="Coupon Payment Frequency">
            <select
              style={inputStyle}
              value={bond.interestPaymentDate}
              onChange={(e) => setBond({ ...bond, interestPaymentDate: e.target.value })}
            >
              <option>Annually</option>
              <option>Semi-Annually</option>
              <option>Quarterly</option>
              <option>Monthly</option>
              <option>At Maturity</option>
            </select>
          </Field>
          <Field label="Principal Repayment">
            <select
              style={inputStyle}
              value={bond.principalRepayment}
              onChange={(e) => setBond({ ...bond, principalRepayment: e.target.value })}
            >
              <option>At Maturity</option>
              <option>Installments</option>
              <option>Amortizing</option>
            </select>
          </Field>
        </div>

        {/* Purchase Pricing & Charges */}
        <div style={{ ...lblStyle, borderTop: `1px solid ${THEME.line}`, paddingTop: 10 }}>
          Purchase Pricing, Charges & Settlement
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Clean Price per Unit (₹)">
            <input
              style={inputStyle}
              type="number"
              step="0.001"
              value={bond.cleanPricePerUnit}
              onChange={(e) => setBond({ ...bond, cleanPricePerUnit: e.target.value })}
              placeholder="1000"
            />
          </Field>
          <Field label="Accrued Interest per Unit (₹)">
            <input
              style={inputStyle}
              type="number"
              step="0.001"
              value={bond.accruedInterestPerUnit}
              onChange={(e) => setBond({ ...bond, accruedInterestPerUnit: e.target.value })}
              placeholder="0"
            />
          </Field>
          <Field label="Brokerage incl. GST (₹)">
            <input
              style={inputStyle}
              type="number"
              value={bond.brokerage}
              onChange={(e) => setBond({ ...bond, brokerage: e.target.value })}
              placeholder="0"
            />
          </Field>
          <Field label="Stamp Duty (₹)">
            <input
              style={inputStyle}
              type="number"
              value={bond.stampDuty}
              onChange={(e) => setBond({ ...bond, stampDuty: e.target.value })}
              placeholder="0"
            />
          </Field>
        </div>

        {/* Ownership & Demat */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Owner Profile">
            <select
              style={inputStyle}
              value={bond.owner}
              onChange={(e) => setBond({ ...bond, owner: e.target.value })}
            >
              <option value="self">Self</option>
              {familyProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatProfileOption(p)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nominee Name">
            <input
              style={inputStyle}
              value={bond.nominee}
              onChange={(e) => setBond({ ...bond, nominee: e.target.value })}
              placeholder="e.g. Spouse / Child"
            />
          </Field>
        </div>

        {/* Live Computed Summary */}
        <div
          style={{
            marginTop: 6,
            padding: 14,
            borderRadius: 12,
            background: "var(--surface-1)",
            border: `1px solid ${THEME.line}`,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 10,
          }}
        >
          <div>
            <div style={lblStyle}>Total Principal Face Value</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
              <Money value={totalPrincipal} variant="full" />
            </div>
          </div>
          <div>
            <div style={lblStyle}>Accrued Interest</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: THEME.muted }}>
              <Money value={totalAccrued} variant="full" />
            </div>
          </div>
          <div>
            <div style={lblStyle}>Total Settlement Cost</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: BOND_AMBER }}>
              <Money value={totalInvestment} variant="full" />
            </div>
          </div>
        </div>

        <ModalActions>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={saving}
            disabled={!bond.name || !bond.coupon}
            style={{ background: BOND_AMBER, borderColor: BOND_AMBER }}
          >
            Save Bond
          </Button>
        </ModalActions>
      </div>
    </Modal>
  );
}
