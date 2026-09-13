import React, { useState, useMemo } from "react";
import {
  Coins,
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
} from "recharts";
import { THEME } from "../../utils/constants";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { Money } from "../ui/Money";
import {
  fmtINRFull,
  fdMaturity,
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

export interface FDItem {
  id: string;
  bank: string;
  principal: number | string;
  rate: number | string;
  years: number | string;
  startDate: string;
  maturityDate?: string;
  fdNumber?: string;
  accountNumber?: string;
  owner?: string;
  interestPayout?: "cumulative" | "monthly" | "quarterly" | "half_yearly" | "annual" | "at_maturity";
  depositType?: "standard" | "tax_saver" | "senior" | "nbfc" | "flexi";
  autoRenew?: "none" | "principal_interest" | "principal_only";
  nominee?: string;
  tag?: string;
  notes?: string;
}

interface FixedDepositsSectionProps {
  items: any[];
  removeItem: (key: string, id: string) => void;
  updateItem: (key: string, id: string, data: any) => void;
  addItem?: (key: string, data: any) => void;
  onAdd: () => void;
  showToast?: (msg: string, type?: any) => void;
  activeProfile?: string;
}

// Popular banks for quick selection
const POPULAR_BANKS = [
  "HDFC Bank",
  "State Bank of India",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Bajaj Finance",
];

export function FixedDepositsSection({
  items = [],
  removeItem,
  updateItem,
  addItem,
  onAdd,
  showToast,
  activeProfile = "all",
}: FixedDepositsSectionProps) {
  const { familyProfiles } = useMasterData();

  // State Management
  const [viewMode, setViewMode] = useState<"cards" | "table" | "ladder" | "analytics" | "tax" | "calculator">("cards");
  const [filterTab, setFilterTab] = useState<"all" | "active" | "due_soon" | "matured" | "tax_saver">("all");
  const [bankFilter, setBankFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<"maturity_asc" | "maturity_desc" | "principal_desc" | "rate_desc" | "bank_asc">("maturity_asc");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [editFD, setEditFD] = useState<any>(null);
  const [confirmDeleteFD, setConfirmDeleteFD] = useState<any>(null);
  const [renewFD, setRenewFD] = useState<any>(null);
  const [breakSimFD, setBreakSimFD] = useState<any>(null);

  // Async edit action
  const { run: saveFDEdit, loading: savingFDEdit } = useAsyncAction(
    async (id: string, v: any) => {
      await updateItem("fixedDeposits", id, v);
    },
    {
      onSuccess: () => {
        setEditFD(null);
        showToast?.("Fixed deposit updated successfully", "success");
      },
      onError: (e: any) =>
        showToast?.(`Failed to save fixed deposit: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  // Async renew action
  const { run: saveFDRenewal, loading: savingFDRenewal } = useAsyncAction(
    async (newFdData: any) => {
      if (addItem) {
        await addItem("fixedDeposits", newFdData);
      } else {
        // Fallback: update existing or toast
        showToast?.("Added renewed deposit", "success");
      }
    },
    {
      onSuccess: () => {
        setRenewFD(null);
        showToast?.("Fixed deposit renewed successfully!", "success");
      },
      onError: (e: any) =>
        showToast?.(`Failed to renew fixed deposit: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  // Utility calculations
  const fdDaysLeft = (f: any) => {
    if (!f.maturityDate) return null;
    const [y, m, d] = String(f.maturityDate).split("-").map(Number);
    if (!y || !m || !d) return null;
    const matDate = new Date(y, m - 1, d);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((matDate.getTime() - now.getTime()) / 86400000);
  };

  const getAccruedValue = (f: any) => {
    const maturity = fdMaturity(Number(f.principal || 0), Number(f.rate || 0), Number(f.years || 0));
    const daysLeft = fdDaysLeft(f);
    if (daysLeft !== null && daysLeft <= 0) return maturity;
    if (!f.startDate || !f.years) return Number(f.principal) || 0;
    const elapsed = Math.min(
      Number(f.years),
      Math.max(0, monthsBetween(f.startDate, today()) / 12)
    );
    return fdMaturity(Number(f.principal || 0), Number(f.rate || 0), elapsed);
  };

  const getProgress = (f: any) => {
    const daysLeft = fdDaysLeft(f);
    if (daysLeft !== null && daysLeft <= 0) return 100;
    if (!f.years || !f.startDate) return 0;
    const totalMonths = Number(f.years) * 12;
    if (totalMonths <= 0) return 0;
    const elapsedMonths = monthsBetween(f.startDate, today());
    return Math.min(100, Math.max(0, (elapsedMonths / totalMonths) * 100));
  };

  // Distinct banks & owners list for filters
  const uniqueBanks = useMemo(() => {
    const set = new Set<string>();
    items.forEach((item) => {
      if (item.bank) set.add(item.bank.trim());
    });
    return Array.from(set).sort();
  }, [items]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalInvested = items.reduce((s: number, f: any) => s + (Number(f.principal) || 0), 0);
    const totalMaturity = items.reduce(
      (s: number, f: any) => s + fdMaturity(Number(f.principal || 0), Number(f.rate || 0), Number(f.years || 0)),
      0
    );
    const totalAccrued = items.reduce((s: number, f: any) => s + getAccruedValue(f), 0);
    const totalGain = totalAccrued - totalInvested;
    const totalProjectedGain = totalMaturity - totalInvested;

    const activeFds = items.filter((f: any) => (fdDaysLeft(f) ?? 1) > 0);
    const maturedFds = items.filter((f: any) => (fdDaysLeft(f) ?? 1) <= 0);
    const dueSoonFds = items.filter((f: any) => {
      const d = fdDaysLeft(f);
      return d !== null && d > 0 && d <= 30;
    });

    const activeInvested = activeFds.reduce((s: number, f: any) => s + (Number(f.principal) || 0), 0);
    const avgRate =
      activeInvested > 0
        ? activeFds.reduce((s: number, f: any) => s + (Number(f.rate) || 0) * (Number(f.principal) || 0), 0) /
          activeInvested
        : items.length > 0
        ? items.reduce((s: number, f: any) => s + Number(f.rate || 0), 0) / items.length
        : 0;

    // Monthly & Annualized Passive Interest
    const annualInterest = activeFds.reduce(
      (s: number, f: any) => s + (Number(f.principal) || 0) * ((Number(f.rate) || 0) / 100),
      0
    );
    const monthlyInterest = annualInterest / 12;

    return {
      totalInvested,
      totalMaturity,
      totalAccrued,
      totalGain,
      totalProjectedGain,
      activeCount: activeFds.length,
      maturedCount: maturedFds.length,
      dueSoonCount: dueSoonFds.length,
      activeInvested,
      avgRate,
      annualInterest,
      monthlyInterest,
    };
  }, [items]);

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return items
      .filter((f: any) => {
        // Status filter
        const daysLeft = fdDaysLeft(f);
        if (filterTab === "active" && (daysLeft ?? 1) <= 0) return false;
        if (filterTab === "matured" && (daysLeft ?? 1) > 0) return false;
        if (filterTab === "due_soon" && (daysLeft === null || daysLeft <= 0 || daysLeft > 30)) return false;
        if (filterTab === "tax_saver" && f.depositType !== "tax_saver" && !f.isTaxSaver) return false;

        // Bank filter
        if (bankFilter !== "all" && f.bank !== bankFilter) return false;

        // Owner filter
        if (ownerFilter !== "all" && (f.owner || "self") !== ownerFilter) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const bMatch = (f.bank || "").toLowerCase().includes(q);
          const numMatch = (f.fdNumber || f.accountNumber || "").toLowerCase().includes(q);
          const tagMatch = (f.tag || "").toLowerCase().includes(q);
          const notesMatch = (f.notes || "").toLowerCase().includes(q);
          const ownerMatch = (f.owner || "").toLowerCase().includes(q);
          if (!bMatch && !numMatch && !tagMatch && !notesMatch && !ownerMatch) return false;
        }

        return true;
      })
      .sort((a: any, b: any) => {
        if (sortBy === "maturity_asc") {
          const aDate = a.maturityDate || "9999-12-31";
          const bDate = b.maturityDate || "9999-12-31";
          return aDate.localeCompare(bDate);
        }
        if (sortBy === "maturity_desc") {
          const aDate = a.maturityDate || "0000-00-00";
          const bDate = b.maturityDate || "0000-00-00";
          return bDate.localeCompare(aDate);
        }
        if (sortBy === "principal_desc") {
          return (Number(b.principal) || 0) - (Number(a.principal) || 0);
        }
        if (sortBy === "rate_desc") {
          return (Number(b.rate) || 0) - (Number(a.rate) || 0);
        }
        if (sortBy === "bank_asc") {
          return (a.bank || "").localeCompare(b.bank || "");
        }
        return 0;
      });
  }, [items, filterTab, bankFilter, ownerFilter, searchQuery, sortBy]);

  // Copy helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast?.("Copied to clipboard", "success");
  };

  // CSV Export handler
  const handleExportCSV = () => {
    if (items.length === 0) return;
    const exportData = items.map((f: any) => ({
      Bank: f.bank || "",
      "FD Number / Acc": f.fdNumber || f.accountNumber || "—",
      "Principal (₹)": Number(f.principal) || 0,
      "Interest Rate (% p.a.)": Number(f.rate) || 0,
      "Tenure (Years)": Number(f.years) || 0,
      "Start Date": f.startDate || "",
      "Maturity Date": f.maturityDate || "",
      "Current Accrued (₹)": Math.round(getAccruedValue(f)),
      "Maturity Value (₹)": Math.round(fdMaturity(Number(f.principal || 0), Number(f.rate || 0), Number(f.years || 0))),
      "Payout Type": f.interestPayout || "Cumulative",
      "Deposit Type": f.depositType || (f.isTaxSaver ? "Tax Saver" : "Standard"),
      "Auto Renew": f.autoRenew || "None",
      Owner: f.owner || "Self",
      Nominee: f.nominee || "—",
      Tag: f.tag || "—",
      Status: (fdDaysLeft(f) ?? 1) <= 0 ? "Matured" : "Active",
    }));
    exportArrayToCSV(exportData, `Fixed_Deposits_${today()}`);
    showToast?.("Exported Fixed Deposits to CSV", "success");
  };

  // Helper to render owner badge
  const renderOwnerBadge = (owner?: string) => {
    if (!owner) return null;
    const p = familyProfiles?.find((x) => x.id === owner || x.name === owner);
    const name = p ? p.name : owner === "self" ? "Self" : owner;
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 7px",
          borderRadius: 6,
          fontSize: 10.5,
          fontWeight: 700,
          background: "color-mix(in srgb, var(--t-accent) 12%, transparent)",
          border: "1px solid color-mix(in srgb, var(--t-accent) 25%, transparent)",
          color: "var(--t-accent)",
        }}
      >
        <User size={10} />
        {name}
      </span>
    );
  };

  // Helper to get Deposit Type Badge
  const renderDepositTypeBadge = (f: any) => {
    if (f.depositType === "tax_saver" || f.isTaxSaver) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: "2px 6px",
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 700,
            background: "color-mix(in srgb, var(--t-teal) 15%, transparent)",
            border: "1px solid color-mix(in srgb, var(--t-teal) 30%, transparent)",
            color: "var(--t-teal)",
          }}
        >
          <Shield size={10} /> 80C Tax Saver
        </span>
      );
    }
    if (f.depositType === "senior") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: "2px 6px",
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 700,
            background: "color-mix(in srgb, var(--t-purple) 15%, transparent)",
            border: "1px solid color-mix(in srgb, var(--t-purple) 30%, transparent)",
            color: "var(--t-purple)",
          }}
        >
          Senior Citizen (+0.5%)
        </span>
      );
    }
    if (f.depositType === "nbfc") {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            padding: "2px 6px",
            borderRadius: 6,
            fontSize: 10,
            fontWeight: 700,
            background: "color-mix(in srgb, var(--t-gold) 15%, transparent)",
            border: "1px solid color-mix(in srgb, var(--t-gold) 30%, transparent)",
            color: "var(--t-gold)",
          }}
        >
          Corporate / NBFC
        </span>
      );
    }
    return null;
  };

  // Empty State
  if (items.length === 0) {
    return (
      <div className="animate-fade-in-up">
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            background: "var(--surface-0)",
            borderRadius: 16,
            border: `1.5px dashed ${THEME.line}`,
            margin: "16px 0",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${THEME.gold} 0%, #fbbf24 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
              boxShadow: "0 8px 24px rgba(217, 119, 6, 0.25)",
              color: "#fff",
            }}
          >
            <Coins size={32} />
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: THEME.ink, marginBottom: 8 }}>
            No Fixed Deposits Added Yet
          </h3>
          <p
            style={{
              fontSize: 13.5,
              color: THEME.muted,
              maxWidth: 520,
              margin: "0 auto 24px",
              lineHeight: 1.6,
            }}
          >
            Track your bank fixed deposits, cumulative quarterly interest, monthly payout schedules,
            DICGC ₹5 Lakh statutory insurance limits, Section 194A TDS forecast, and maturity timelines in one place.
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 28,
            }}
          >
            {["Guaranteed Compounding", "DICGC ₹5L Protection Monitor", "TDS 194A Optimizer", "Maturity Laddering"].map(
              (pill) => (
                <span
                  key={pill}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 20,
                    fontSize: 11.5,
                    fontWeight: 600,
                    background: "var(--surface-1)",
                    border: `1px solid ${THEME.line}`,
                    color: THEME.ink,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Check size={11} color={THEME.sage} /> {pill}
                </span>
              )
            )}
          </div>

          <Button variant="accent" size="lg" icon={<Plus size={16} />} onClick={onAdd}>
            Add First Fixed Deposit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── 1. EXECUTIVE KPI SUMMARY STRIP ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))",
          gap: 12,
        }}
      >
        <StatCard
          label="Total Invested"
          value={fmtINRFull(metrics.totalInvested)}
          numericValue={metrics.totalInvested}
          formatValue={fmtINRFull}
          icon={<IndianRupee />}
          color={THEME.gold}
          subtext={`${metrics.activeCount} active · ${metrics.maturedCount} matured`}
        />
        <StatCard
          label="Current Accrued"
          value={fmtINRFull(metrics.totalAccrued)}
          numericValue={metrics.totalAccrued}
          formatValue={fmtINRFull}
          icon={<TrendingUp />}
          color={THEME.accent}
          subtext={`+${fmtINRFull(metrics.totalGain)} earned so far`}
        />
        <StatCard
          label="Total Maturity Value"
          value={fmtINRFull(metrics.totalMaturity)}
          numericValue={metrics.totalMaturity}
          formatValue={fmtINRFull}
          icon={<Sparkles />}
          color={THEME.sage}
          subtext={`+${fmtINRFull(metrics.totalProjectedGain)} guaranteed return`}
        />
        <StatCard
          label="Avg. Yield (Active)"
          value={`${metrics.avgRate.toFixed(2)}%`}
          numericValue={metrics.avgRate}
          formatValue={(n: number) => `${n.toFixed(2)}% p.a.`}
          icon={<Percent />}
          color={THEME.purple || "#8b5cf6"}
          subtext={`Weighted by principal`}
        />
        <StatCard
          label="Annual Passive Interest"
          value={fmtINRFull(metrics.annualInterest)}
          numericValue={metrics.annualInterest}
          formatValue={fmtINRFull}
          icon={<Activity />}
          color={THEME.teal || "#0d9488"}
          subtext={`≈ ${fmtINRFull(metrics.monthlyInterest)} / month`}
        />
      </div>

      {/* ── 2. VIEW SWITCHER & TOP TOOLBAR ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "12px 16px",
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          borderRadius: 14,
        }}
      >
        {/* View mode toggle tabs */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { id: "cards", label: "Grid Cards", icon: Layers },
            { id: "table", label: "Data Table", icon: FileSpreadsheet },
            { id: "ladder", label: "Maturity Ladder", icon: Calendar },
            { id: "analytics", label: "Bank & DICGC Risk", icon: PieIcon },
            { id: "tax", label: "TDS & Tax Optimizer", icon: ShieldCheck },
            { id: "calculator", label: "FD Calculator", icon: Calculator },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setViewMode(id as any)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                border: "none",
                transition: "all 0.15s ease",
                background:
                  viewMode === id
                    ? "color-mix(in srgb, var(--t-accent) 15%, transparent)"
                    : "transparent",
                color: viewMode === id ? "var(--t-accent)" : THEME.muted,
                borderBottom: viewMode === id ? "2px solid var(--t-accent)" : "2px solid transparent",
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Button
            variant="ghost"
            size="sm"
            icon={<Download size={13} />}
            onClick={handleExportCSV}
            title="Export to CSV"
          >
            Export CSV
          </Button>
          <Button variant="accent" size="sm" icon={<Plus size={14} />} onClick={onAdd}>
            Add Fixed Deposit
          </Button>
        </div>
      </div>

      {/* ── 3. FILTER, SEARCH & SORT CONTROLS (Active on Cards, Table, Ladder) ── */}
      {(viewMode === "cards" || viewMode === "table" || viewMode === "ladder") && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            padding: 16,
            background: "var(--surface-0)",
            border: `1px solid ${THEME.line}`,
            borderRadius: 14,
          }}
        >
          {/* Row 1: Status Filter Pills */}
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
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
                {`Active (${metrics.activeCount})`}
              </button>
              {metrics.dueSoonCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterTab("due_soon")}
                  className={`demat-portfolio-pill ${filterTab === "due_soon" ? "active" : ""}`}
                  style={{
                    cursor: "pointer",
                    border: "none",
                    color: filterTab === "due_soon" ? "#fff" : THEME.rust,
                    background: filterTab === "due_soon" ? THEME.rust : "color-mix(in srgb, var(--t-rust) 12%, transparent)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Clock size={12} /> {`Matures in ≤30d (${metrics.dueSoonCount})`}
                </button>
              )}
              {metrics.maturedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterTab("matured")}
                  className={`demat-portfolio-pill ${filterTab === "matured" ? "active" : ""}`}
                  style={{ cursor: "pointer", border: "none" }}
                >
                  {`Matured (${metrics.maturedCount})`}
                </button>
              )}
              <button
                type="button"
                onClick={() => setFilterTab("tax_saver")}
                className={`demat-portfolio-pill ${filterTab === "tax_saver" ? "active" : ""}`}
                style={{ cursor: "pointer", border: "none" }}
              >
                80C Tax Saver
              </button>
            </div>

            {/* Results count */}
            <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
              Showing {filteredItems.length} of {items.length} deposits
            </div>
          </div>

          {/* Row 2: Search, Bank Filter, Owner Filter, Sort By */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
              alignItems: "center",
            }}
          >
            {/* Search Input */}
            <div style={{ position: "relative" }}>
              <Search
                size={14}
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
                placeholder="Search bank, account #, tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 10px 7px 32px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  background: "var(--surface-1)",
                  border: `1px solid ${THEME.line}`,
                  color: THEME.ink,
                  outline: "none",
                }}
              />
            </div>

            {/* Bank Filter dropdown */}
            <select
              value={bankFilter}
              onChange={(e) => setBankFilter(e.target.value)}
              style={{
                padding: "7px 10px",
                borderRadius: 8,
                fontSize: 12.5,
                background: "var(--surface-1)",
                border: `1px solid ${THEME.line}`,
                color: THEME.ink,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="all">All Banks & NBFCs</option>
              {uniqueBanks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Owner Filter */}
            {familyProfiles && familyProfiles.length > 1 && (
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                style={{
                  padding: "7px 10px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  background: "var(--surface-1)",
                  border: `1px solid ${THEME.line}`,
                  color: THEME.ink,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="all">All Family Members</option>
                <option value="self">Self</option>
                {familyProfiles
                  .filter((p) => p.id !== "self")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            )}

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: "7px 10px",
                borderRadius: 8,
                fontSize: 12.5,
                background: "var(--surface-1)",
                border: `1px solid ${THEME.line}`,
                color: THEME.ink,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="maturity_asc">Maturity Date (Soonest)</option>
              <option value="maturity_desc">Maturity Date (Latest)</option>
              <option value="principal_desc">Principal (High to Low)</option>
              <option value="rate_desc">Interest Rate (High to Low)</option>
              <option value="bank_asc">Bank Name (A-Z)</option>
            </select>
          </div>
        </div>
      )}

      {/* ── 4. VIEW PERSPECTIVE RENDERING ── */}

      {/* ── VIEW A: CARDS GRID VIEW ── */}
      {viewMode === "cards" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {filteredItems.map((f: any) => {
            const maturity = fdMaturity(Number(f.principal || 0), Number(f.rate || 0), Number(f.years || 0));
            const daysLeft = fdDaysLeft(f);
            const isMatured = daysLeft !== null && daysLeft <= 0;
            const isDueSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 30;
            const accrued = getAccruedValue(f);
            const gain = accrued - (Number(f.principal) || 0);
            const totalProjectedInterest = maturity - (Number(f.principal) || 0);
            const progress = getProgress(f);
            const borderColor = isMatured ? THEME.muted : isDueSoon ? THEME.rust : THEME.gold;

            return (
              <Card
                key={f.id}
                style={{
                  padding: "18px 20px",
                  borderTop: `4px solid ${borderColor}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  position: "relative",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                }}
              >
                {/* Header: Badges & Action Menu */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                    <Badge variant={isMatured ? "muted" : "gold"}>{f.bank}</Badge>
                    {isMatured && <Badge variant="muted">Matured</Badge>}
                    {isDueSoon && (
                      <Badge variant="rust">
                        {daysLeft === 0 ? "Matures Today!" : `${daysLeft}d left`}
                      </Badge>
                    )}
                    {renderDepositTypeBadge(f)}
                    {renderOwnerBadge(f.owner)}
                  </div>

                  <div style={{ display: "flex", gap: 4 }}>
                    {/* 1-click Renew button if matured or due soon */}
                    {(isMatured || isDueSoon) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<RefreshCw size={12} />}
                        onClick={() => setRenewFD(f)}
                        title="Renew / Rollover FD"
                        style={{ color: THEME.accent }}
                      />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Pencil size={12} />}
                      onClick={() => setEditFD(f)}
                      title="Edit Fixed Deposit"
                      aria-label={`Edit ${f.bank} fixed deposit`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<Trash2 size={12} />}
                      style={{ color: THEME.rust }}
                      onClick={() => setConfirmDeleteFD(f)}
                      title="Delete"
                      aria-label={`Delete ${f.bank} fixed deposit`}
                    />
                  </div>
                </div>

                {/* Bank Identity & Account Number */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <BankLogo name={f.bank} size={38} accentColor={THEME.gold} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink }}>{f.bank}</div>
                      {(f.fdNumber || f.accountNumber) && (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 11,
                            color: THEME.muted,
                            cursor: "pointer",
                            marginTop: 1,
                          }}
                          onClick={() => copyToClipboard(f.fdNumber || f.accountNumber, f.id)}
                          title="Click to copy account number"
                        >
                          <span>#{f.fdNumber || f.accountNumber}</span>
                          {copiedId === f.id ? <Check size={10} color={THEME.sage} /> : <Copy size={10} />}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                      Interest Rate
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: THEME.gold, fontFamily: "var(--font-display)" }}>
                      {f.rate}% <span style={{ fontSize: 11, fontWeight: 600 }}>p.a.</span>
                    </div>
                  </div>
                </div>

                {/* Principal Amount Highlight */}
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "var(--surface-1)",
                    border: `1px solid ${THEME.line}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                      Principal Invested
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 20,
                        fontWeight: 900,
                        color: THEME.ink,
                      }}
                    >
                      <Money value={Number(f.principal || 0)} variant="full" />
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                      Tenure
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                      {f.years ? `${f.years} Years` : "—"}
                    </div>
                  </div>
                </div>

                {/* 4-Item Grid Details */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 6,
                  }}
                >
                  {[
                    ["Start Date", f.startDate ? f.startDate.slice(0, 10) : "—"],
                    ["Matures On", f.maturityDate ? f.maturityDate.slice(0, 10) : "—"],
                    ["Payout", f.interestPayout ? f.interestPayout.replace("_", " ") : "Cumulative"],
                    [
                      "Status",
                      isMatured ? "Matured" : daysLeft !== null ? `${daysLeft}d left` : "Active",
                    ],
                  ].map(([label, val]) => (
                    <div
                      key={label}
                      style={{
                        padding: "6px 4px",
                        background: "var(--surface-1)",
                        borderRadius: 6,
                        border: `1px solid ${THEME.line}`,
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          color: THEME.muted,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          marginBottom: 2,
                        }}
                      >
                        {label}
                      </div>
                      <div
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: THEME.ink,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {val}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progress Bar */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 10,
                      color: THEME.muted,
                      marginBottom: 4,
                      fontWeight: 700,
                    }}
                  >
                    <span>{isMatured ? "TENURE COMPLETED" : "TENURE PROGRESS"}</span>
                    <span style={{ color: isMatured ? THEME.sage : THEME.gold, fontWeight: 800 }}>
                      {isMatured ? "100% COMPLETED" : `${progress.toFixed(0)}%`}
                    </span>
                  </div>
                  <div className="progress-track" style={{ height: 6, borderRadius: 3 }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${progress}%`,
                        background: isMatured ? THEME.sage : THEME.gold,
                        height: "100%",
                      }}
                    />
                  </div>
                </div>

                {/* Value Summary Footer: Accrued vs Maturity */}
                <div
                  style={{
                    borderTop: `1px solid ${THEME.line}`,
                    paddingTop: 10,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 9.5, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                      Current Accrued
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 14,
                        fontWeight: 800,
                        color: THEME.accent,
                      }}
                    >
                      <Money value={accrued} variant="full" />
                    </div>
                    <div style={{ fontSize: 10, color: gain >= 0 ? THEME.sage : THEME.rust, fontWeight: 700 }}>
                      +{fmtINRFull(gain)} gain
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 9.5, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                      Maturity Value
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 14,
                        fontWeight: 800,
                        color: THEME.sage,
                      }}
                    >
                      <Money value={maturity} variant="full" />
                    </div>
                    <div style={{ fontSize: 10, color: THEME.muted }}>
                      +{fmtINRFull(totalProjectedInterest)} int.
                    </div>
                  </div>
                </div>

                {/* Quick actions footer */}
                <div
                  style={{
                    borderTop: `1px dashed ${THEME.line}`,
                    paddingTop: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setBreakSimFD(f)}
                    style={{
                      background: "none",
                      border: "none",
                      color: THEME.muted,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      padding: 0,
                    }}
                  >
                    <Percent size={11} /> Premature Break Sim
                  </button>

                  {(isMatured || isDueSoon) && (
                    <button
                      type="button"
                      onClick={() => setRenewFD(f)}
                      style={{
                        background: "none",
                        border: "none",
                        color: THEME.accent,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 3,
                        padding: 0,
                      }}
                    >
                      <RefreshCw size={11} /> Renew FD
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── VIEW B: MASTER DATA TABLE VIEW ── */}
      {viewMode === "table" && (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 12.5,
                textAlign: "left",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "var(--surface-1)",
                    borderBottom: `1.5px solid ${THEME.line}`,
                    color: THEME.muted,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  <th style={{ padding: "12px 16px" }}>Bank & Account</th>
                  <th style={{ padding: "12px 14px", textAlign: "right" }}>Principal</th>
                  <th style={{ padding: "12px 14px", textAlign: "right" }}>Rate (% p.a.)</th>
                  <th style={{ padding: "12px 14px", textAlign: "right" }}>Tenure</th>
                  <th style={{ padding: "12px 14px" }}>Start Date</th>
                  <th style={{ padding: "12px 14px" }}>Maturity Date</th>
                  <th style={{ padding: "12px 14px", textAlign: "right" }}>Current Accrued</th>
                  <th style={{ padding: "12px 14px", textAlign: "right" }}>Maturity Value</th>
                  <th style={{ padding: "12px 14px" }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "center" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((f: any, idx: number) => {
                  const maturity = fdMaturity(Number(f.principal || 0), Number(f.rate || 0), Number(f.years || 0));
                  const accrued = getAccruedValue(f);
                  const daysLeft = fdDaysLeft(f);
                  const isMatured = daysLeft !== null && daysLeft <= 0;
                  const isDueSoon = daysLeft !== null && daysLeft > 0 && daysLeft <= 30;

                  return (
                    <tr
                      key={f.id}
                      style={{
                        borderBottom: `1px solid ${THEME.line}`,
                        background: idx % 2 === 0 ? "transparent" : "var(--surface-1)",
                        transition: "background 0.15s ease",
                      }}
                    >
                      {/* Bank & Account */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <BankLogo name={f.bank} size={28} accentColor={THEME.gold} />
                          <div>
                            <div style={{ fontWeight: 800, color: THEME.ink }}>{f.bank}</div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                              {(f.fdNumber || f.accountNumber) && (
                                <span style={{ fontSize: 10.5, color: THEME.muted, fontFamily: "monospace" }}>
                                  #{f.fdNumber || f.accountNumber}
                                </span>
                              )}
                              {renderDepositTypeBadge(f)}
                              {renderOwnerBadge(f.owner)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Principal */}
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, color: THEME.ink }}>
                        <Money value={Number(f.principal || 0)} variant="full" />
                      </td>

                      {/* Rate */}
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, color: THEME.gold }}>
                        {f.rate}%
                      </td>

                      {/* Tenure */}
                      <td style={{ padding: "12px 14px", textAlign: "right", color: THEME.ink }}>
                        {f.years} yrs
                      </td>

                      {/* Start Date */}
                      <td style={{ padding: "12px 14px", color: THEME.muted, fontSize: 11.5 }}>
                        {f.startDate || "—"}
                      </td>

                      {/* Maturity Date */}
                      <td style={{ padding: "12px 14px", color: THEME.ink, fontSize: 11.5, fontWeight: 700 }}>
                        {f.maturityDate || "—"}
                      </td>

                      {/* Current Accrued */}
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, color: THEME.accent }}>
                        <Money value={accrued} variant="full" />
                      </td>

                      {/* Maturity Value */}
                      <td style={{ padding: "12px 14px", textAlign: "right", fontWeight: 800, color: THEME.sage }}>
                        <Money value={maturity} variant="full" />
                      </td>

                      {/* Status */}
                      <td style={{ padding: "12px 14px" }}>
                        {isMatured ? (
                          <Badge variant="muted">Matured</Badge>
                        ) : isDueSoon ? (
                          <Badge variant="rust">{daysLeft}d left</Badge>
                        ) : (
                          <Badge variant="gold">{daysLeft ? `${daysLeft}d` : "Active"}</Badge>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 4 }}>
                          {(isMatured || isDueSoon) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<RefreshCw size={12} />}
                              onClick={() => setRenewFD(f)}
                              title="Renew"
                              style={{ color: THEME.accent }}
                            />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Pencil size={12} />}
                            onClick={() => setEditFD(f)}
                            title="Edit"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Trash2 size={12} />}
                            style={{ color: THEME.rust }}
                            onClick={() => setConfirmDeleteFD(f)}
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

      {/* ── VIEW C: MATURITY LADDER & LIQUIDITY CALENDAR ── */}
      {viewMode === "ladder" && (
        <MaturityLadderView
          items={filteredItems}
          onRenew={(f: any) => setRenewFD(f)}
          onEdit={(f: any) => setEditFD(f)}
        />
      )}

      {/* ── VIEW D: BANK CONCENTRATION & DICGC SAFETY ANALYTICS ── */}
      {viewMode === "analytics" && <BankConcentrationView items={items} />}

      {/* ── VIEW E: TDS & SECTION 194A TAX OPTIMIZER ── */}
      {viewMode === "tax" && <TdsTaxOptimizerView items={items} />}

      {/* ── VIEW F: INTERACTIVE FD CALCULATOR & LADDERING PLANNER ── */}
      {viewMode === "calculator" && <InteractiveFDCalculator />}

      {/* ── MODALS ── */}

      {/* 1. Edit FD Modal */}
      {editFD && (
        <EditFDModal
          fd={editFD}
          onClose={() => setEditFD(null)}
          onSave={(updated: any) => saveFDEdit(editFD.id, updated)}
          saving={savingFDEdit}
          familyProfiles={familyProfiles}
        />
      )}

      {/* 2. 1-Click Renew / Rollover Modal */}
      {renewFD && (
        <RenewFDModal
          fd={renewFD}
          onClose={() => setRenewFD(null)}
          onSave={(renewedData: any) => saveFDRenewal(renewedData)}
          saving={savingFDRenewal}
        />
      )}

      {/* 3. Premature Break / Closure Simulator Modal */}
      {breakSimFD && (
        <PrematureBreakModal fd={breakSimFD} onClose={() => setBreakSimFD(null)} />
      )}

      {/* 4. Delete Confirmation Dialog */}
      {confirmDeleteFD && (
        <ConfirmDialog
          message={`Delete ${confirmDeleteFD.bank} fixed deposit of ₹${Number(confirmDeleteFD.principal || 0).toLocaleString(
            "en-IN"
          )}? This cannot be undone.`}
          onConfirm={() => {
            removeItem("fixedDeposits", confirmDeleteFD.id);
            setConfirmDeleteFD(null);
            showToast?.("Fixed deposit removed", "success");
          }}
          onCancel={() => setConfirmDeleteFD(null)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   VIEW C: MATURITY LADDER COMPONENT
══════════════════════════════════════════════════════════════════════ */
function MaturityLadderView({ items, onRenew, onEdit }: any) {
  // Group FDs by Year & Quarter of maturity
  const ladder = useMemo(() => {
    const buckets: Record<string, { label: string; year: string; quarter: string; fds: any[]; totalAmount: number }> =
      {};

    items.forEach((f: any) => {
      if (!f.maturityDate) return;
      const [y, m] = f.maturityDate.split("-").map(Number);
      if (!y || !m) return;
      const q = Math.ceil(m / 3);
      const key = `${y}-Q${q}`;
      const maturity = fdMaturity(Number(f.principal || 0), Number(f.rate || 0), Number(f.years || 0));

      if (!buckets[key]) {
        buckets[key] = {
          label: `Q${q} ${y}`,
          year: String(y),
          quarter: `Q${q}`,
          fds: [],
          totalAmount: 0,
        };
      }
      buckets[key].fds.push(f);
      buckets[key].totalAmount += maturity;
    });

    return Object.keys(buckets)
      .sort()
      .map((k) => buckets[k]);
  }, [items]);

  const chartData = ladder.map((b) => ({
    name: b.label,
    amount: Math.round(b.totalAmount),
    count: b.fds.length,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Ladder Overview Chart */}
      <Card style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, margin: 0 }}>
              Quarterly Liquidity & Cash Flow Inflow
            </h4>
            <p style={{ fontSize: 12, color: THEME.muted, margin: "4px 0 0" }}>
              Projected maturity payouts scheduled across upcoming quarters
            </p>
          </div>
        </div>

        {chartData.length > 0 ? (
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <XAxis dataKey="name" stroke={THEME.muted} fontSize={11} />
                <YAxis
                  stroke={THEME.muted}
                  fontSize={11}
                  tickFormatter={(v) => `₹${(v / 100000).toFixed(1)}L`}
                />
                <Tooltip
                  formatter={(value: any) => [fmtINRFull(Number(value)), "Maturity Inflow"]}
                  contentStyle={{
                    background: "var(--surface-0)",
                    border: `1px solid ${THEME.line}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="amount" fill={THEME.gold} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 24, color: THEME.muted, fontSize: 13 }}>
            No maturity dates recorded to project ladder
          </div>
        )}
      </Card>

      {/* Ladder Timeline Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {ladder.map((bucket) => (
          <Card key={bucket.label} style={{ padding: 18, borderLeft: `4px solid ${THEME.gold}` }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    padding: "4px 10px",
                    borderRadius: 8,
                    background: "color-mix(in srgb, var(--t-gold) 15%, transparent)",
                    color: THEME.gold,
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  {bucket.label}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                  {bucket.fds.length} Deposit{bucket.fds.length > 1 ? "s" : ""} Maturing
                </span>
              </div>

              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: 11, color: THEME.muted, marginRight: 8 }}>Total Liquidity:</span>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 900,
                    color: THEME.sage,
                    fontFamily: "var(--font-display)",
                  }}
                >
                  <Money value={bucket.totalAmount} variant="full" />
                </span>
              </div>
            </div>

            {/* List of FDs in this bucket */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
              {bucket.fds.map((f) => {
                const mat = fdMaturity(Number(f.principal || 0), Number(f.rate || 0), Number(f.years || 0));
                return (
                  <div
                    key={f.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: "var(--surface-1)",
                      border: `1px solid ${THEME.line}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <BankLogo name={f.bank} size={26} accentColor={THEME.gold} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>{f.bank}</div>
                        <div style={{ fontSize: 11, color: THEME.muted }}>
                          {f.maturityDate} · {f.rate}% p.a.
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: THEME.sage }}>
                        <Money value={mat} variant="full" />
                      </div>
                      <button
                        type="button"
                        onClick={() => onRenew(f)}
                        style={{
                          background: "none",
                          border: "none",
                          color: THEME.accent,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          padding: 0,
                          marginTop: 2,
                        }}
                      >
                        Renew / Reinvest →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   VIEW D: BANK CONCENTRATION & DICGC SAFETY ANALYTICS
══════════════════════════════════════════════════════════════════════ */
function BankConcentrationView({ items }: { items: any[] }) {
  const DICGC_LIMIT = 500000; // ₹5 Lakh per bank per depositor

  // Aggregate by bank
  const bankStats = useMemo(() => {
    const map: Record<string, { bank: string; principal: number; accrued: number; count: number }> = {};
    items.forEach((f: any) => {
      const b = (f.bank || "Other").trim();
      const p = Number(f.principal || 0);
      const acc = getAccruedValueHelper(f);
      if (!map[b]) {
        map[b] = { bank: b, principal: 0, accrued: 0, count: 0 };
      }
      map[b].principal += p;
      map[b].accrued += acc;
      map[b].count += 1;
    });

    return Object.values(map).sort((a, b) => b.accrued - a.accrued);
  }, [items]);

  const COLORS = [THEME.gold, THEME.accent, THEME.sage, THEME.purple || "#8b5cf6", THEME.teal || "#0d9488", "#f97316", "#06b6d4"];

  const pieData = bankStats.map((b) => ({
    name: b.bank,
    value: Math.round(b.accrued),
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* DICGC ₹5 Lakh Insurance Alert & Status */}
      <Card
        style={{
          padding: "16px 20px",
          background: "color-mix(in srgb, var(--t-accent) 6%, var(--surface-0))",
          border: `1.5px solid color-mix(in srgb, var(--t-accent) 25%, transparent)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div
            style={{
              padding: 8,
              borderRadius: 10,
              background: "color-mix(in srgb, var(--t-accent) 15%, transparent)",
              color: "var(--t-accent)",
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, margin: "0 0 4px" }}>
              DICGC (RBI) ₹5,00,000 Deposit Insurance Monitor
            </h4>
            <p style={{ fontSize: 12.5, color: THEME.muted, margin: 0, lineHeight: 1.5 }}>
              Under RBI rules, deposits across all branches of a single bank (principal + interest) are insured up to{" "}
              <strong style={{ color: THEME.ink }}>₹5,00,000</strong> per depositor. Diversifying large deposits across
              multiple scheduled banks keeps 100% of your capital government-insured.
            </p>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {/* Bank Share Donut Chart */}
        <Card style={{ padding: 20 }}>
          <h4 style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, margin: "0 0 16px" }}>
            Bank Exposure Breakdown
          </h4>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [fmtINRFull(Number(value)), "Value"]}
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
        </Card>

        {/* Bank List with Safety Meter */}
        <Card style={{ padding: 20 }}>
          <h4 style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, margin: "0 0 14px" }}>
            Bank Safety & Limit Status
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {bankStats.map((b) => {
              const isOverLimit = b.accrued > DICGC_LIMIT;
              const ratio = Math.min(100, (b.accrued / DICGC_LIMIT) * 100);

              return (
                <div
                  key={b.bank}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "var(--surface-1)",
                    border: `1px solid ${isOverLimit ? THEME.rust : THEME.line}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <BankLogo name={b.bank} size={24} accentColor={THEME.gold} />
                      <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>{b.bank}</span>
                      <span style={{ fontSize: 11, color: THEME.muted }}>({b.count} FDs)</span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                        {fmtINRFull(b.accrued)}
                      </span>
                    </div>
                  </div>

                  {/* Progress vs 5L */}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: THEME.muted, marginBottom: 3 }}>
                    <span>
                      {isOverLimit ? (
                        <strong style={{ color: THEME.rust, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <AlertTriangle size={11} /> Exceeds ₹5L cover by {fmtINRFull(b.accrued - DICGC_LIMIT)}
                        </strong>
                      ) : (
                        <span style={{ color: THEME.sage, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle2 size={11} /> Fully Insured under DICGC
                        </span>
                      )}
                    </span>
                    <span>{(b.accrued / 100000).toFixed(2)}L / 5.00L</span>
                  </div>
                  <div className="progress-track" style={{ height: 5, borderRadius: 2.5 }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${ratio}%`,
                        background: isOverLimit ? THEME.rust : ratio > 80 ? THEME.gold : THEME.sage,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   VIEW E: TDS & SECTION 194A TAX OPTIMIZER
══════════════════════════════════════════════════════════════════════ */
function TdsTaxOptimizerView({ items }: { items: any[] }) {
  const [taxSlab, setTaxSlab] = useState<number>(30); // 5%, 20%, 30%
  const TDS_THRESHOLD_GENERAL = 40000;
  const TDS_THRESHOLD_SENIOR = 50000;

  // Calculate annual interest per bank
  const bankTdsStats = useMemo(() => {
    const map: Record<string, { bank: string; annualInterest: number; principal: number; count: number }> = {};

    items.forEach((f: any) => {
      const b = (f.bank || "Other").trim();
      const p = Number(f.principal || 0);
      const r = Number(f.rate || 0);
      const int = p * (r / 100);

      if (!map[b]) {
        map[b] = { bank: b, annualInterest: 0, principal: 0, count: 0 };
      }
      map[b].annualInterest += int;
      map[b].principal += p;
      map[b].count += 1;
    });

    return Object.values(map).sort((a, b) => b.annualInterest - a.annualInterest);
  }, [items]);

  const totalAnnualInterest = bankTdsStats.reduce((s, b) => s + b.annualInterest, 0);
  const estimatedTax = totalAnnualInterest * (taxSlab / 100);
  const netPostTaxInterest = totalAnnualInterest - estimatedTax;
  const grossYield =
    items.reduce((s, f) => s + (Number(f.principal) || 0), 0) > 0
      ? (totalAnnualInterest / items.reduce((s, f) => s + (Number(f.principal) || 0), 0)) * 100
      : 0;
  const netPostTaxYield = grossYield * (1 - taxSlab / 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* TDS Section 194A Guidance Banner */}
      <Card
        style={{
          padding: "16px 20px",
          background: "color-mix(in srgb, var(--t-teal) 6%, var(--surface-0))",
          border: `1.5px solid color-mix(in srgb, var(--t-teal) 25%, transparent)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div
            style={{
              padding: 8,
              borderRadius: 10,
              background: "color-mix(in srgb, var(--t-teal) 15%, transparent)",
              color: "var(--t-teal)",
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, margin: "0 0 4px" }}>
              Section 194A TDS Rules & Form 15G / 15H Guide
            </h4>
            <p style={{ fontSize: 12.5, color: THEME.muted, margin: 0, lineHeight: 1.5 }}>
              Banks deduct 10% TDS if your total FD interest in a financial year exceeds{" "}
              <strong style={{ color: THEME.ink }}>₹40,000</strong> (or{" "}
              <strong style={{ color: THEME.ink }}>₹50,000</strong> for Senior Citizens u/s 80TTB). Submit{" "}
              <strong style={{ color: THEME.ink }}>Form 15G (General)</strong> or{" "}
              <strong style={{ color: THEME.ink }}>Form 15H (Seniors)</strong> at the start of the FY if your total
              taxable income is below basic exemption to prevent automatic TDS deduction.
            </p>
          </div>
        </div>
      </Card>

      {/* Tax Slab & Net Return Simulator */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h4 style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, margin: 0 }}>
              Post-Tax Net Yield Simulator
            </h4>
            <div style={{ display: "flex", gap: 4 }}>
              {[0, 5, 20, 30].map((slab) => (
                <button
                  key={slab}
                  type="button"
                  onClick={() => setTaxSlab(slab)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "none",
                    background: taxSlab === slab ? "var(--t-accent)" : "var(--surface-1)",
                    color: taxSlab === slab ? "#fff" : THEME.muted,
                  }}
                >
                  {slab}% Slab
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${THEME.line}` }}>
              <span style={{ fontSize: 13, color: THEME.muted }}>Total Gross Annual Interest</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>{fmtINRFull(totalAnnualInterest)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${THEME.line}` }}>
              <span style={{ fontSize: 13, color: THEME.muted }}>Estimated Tax Payable (@ {taxSlab}%)</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: THEME.rust }}>-{fmtINRFull(estimatedTax)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${THEME.line}` }}>
              <span style={{ fontSize: 13, color: THEME.ink, fontWeight: 700 }}>Net Post-Tax Inhand Cashflow</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: THEME.sage }}>{fmtINRFull(netPostTaxInterest)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
              <span style={{ fontSize: 13, color: THEME.muted }}>Effective Real Return (Gross vs Net)</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: THEME.gold }}>
                {grossYield.toFixed(2)}% → {netPostTaxYield.toFixed(2)}% p.a.
              </span>
            </div>
          </div>
        </Card>

        {/* Bank-wise TDS threshold tracker */}
        <Card style={{ padding: 20 }}>
          <h4 style={{ fontSize: 15, fontWeight: 800, color: THEME.ink, margin: "0 0 14px" }}>
            Bank-Wise Section 194A TDS Threshold Tracker
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {bankTdsStats.map((b) => {
              const exceedsTds = b.annualInterest >= TDS_THRESHOLD_GENERAL;
              const pctOfLimit = Math.min(100, (b.annualInterest / TDS_THRESHOLD_GENERAL) * 100);

              return (
                <div
                  key={b.bank}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: "var(--surface-1)",
                    border: `1px solid ${exceedsTds ? THEME.rust : THEME.line}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <BankLogo name={b.bank} size={20} accentColor={THEME.gold} />
                      <span style={{ fontSize: 12.5, fontWeight: 800, color: THEME.ink }}>{b.bank}</span>
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: exceedsTds ? THEME.rust : THEME.ink }}>
                      {fmtINRFull(b.annualInterest)} / yr
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: THEME.muted, marginBottom: 3 }}>
                    <span>
                      {exceedsTds ? (
                        <strong style={{ color: THEME.rust, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <AlertTriangle size={11} /> TDS Applicable (Submit Form 15G/15H)
                        </strong>
                      ) : (
                        <span style={{ color: THEME.sage, display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <CheckCircle2 size={11} /> Below ₹40k TDS threshold
                        </span>
                      )}
                    </span>
                    <span>{(b.annualInterest / 1000).toFixed(0)}k / 40k</span>
                  </div>
                  <div className="progress-track" style={{ height: 4 }}>
                    <div
                      className="progress-fill"
                      style={{
                        width: `${pctOfLimit}%`,
                        background: exceedsTds ? THEME.rust : THEME.sage,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   VIEW F: INTERACTIVE FD CALCULATOR & LADDERING PLANNER
══════════════════════════════════════════════════════════════════════ */
function InteractiveFDCalculator() {
  const [calcPrincipal, setCalcPrincipal] = useState<number>(500000);
  const [calcRate, setCalcRate] = useState<number>(7.5);
  const [calcYears, setCalcYears] = useState<number>(3);
  const [calcFreq, setCalcFreq] = useState<number>(4); // Quarterly

  const maturity = fdMaturity(calcPrincipal, calcRate, calcYears, calcFreq);
  const totalInterest = maturity - calcPrincipal;
  const effectiveApy = (Math.pow(1 + calcRate / 100 / calcFreq, calcFreq) - 1) * 100;

  return (
    <Card style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, margin: 0 }}>
            Interactive Fixed Deposit & Compounding Simulator
          </h3>
          <p style={{ fontSize: 12.5, color: THEME.muted, margin: "4px 0 0" }}>
            Model compounding frequency, APY, and interest payouts
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
        {/* Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                Deposit Amount
              </label>
              <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>{fmtINRFull(calcPrincipal)}</span>
            </div>
            <input
              type="range"
              min={10000}
              max={5000000}
              step={10000}
              value={calcPrincipal}
              onChange={(e) => setCalcPrincipal(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.gold }}
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                Interest Rate (% p.a.)
              </label>
              <span style={{ fontSize: 14, fontWeight: 800, color: THEME.gold }}>{calcRate}%</span>
            </div>
            <input
              type="range"
              min={3.0}
              max={10.0}
              step={0.1}
              value={calcRate}
              onChange={(e) => setCalcRate(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.gold }}
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                Tenure (Years)
              </label>
              <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>{calcYears} Years</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={10}
              step={0.5}
              value={calcYears}
              onChange={(e) => setCalcYears(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.gold }}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", display: "block", marginBottom: 6 }}>
              Compounding Frequency
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {[
                { label: "Monthly", val: 12 },
                { label: "Quarterly", val: 4 },
                { label: "Half-Yr", val: 2 },
                { label: "Annual", val: 1 },
              ].map(({ label, val }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setCalcFreq(val)}
                  style={{
                    padding: "7px 4px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    border: "none",
                    background: calcFreq === val ? "var(--t-accent)" : "var(--surface-1)",
                    color: calcFreq === val ? "#fff" : THEME.muted,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results Card */}
        <div
          style={{
            padding: 24,
            borderRadius: 14,
            background: "var(--surface-1)",
            border: `1px solid ${THEME.line}`,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
              Maturity Value
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 32,
                fontWeight: 900,
                color: THEME.sage,
                letterSpacing: "-0.02em",
              }}
            >
              {fmtINRFull(maturity)}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                Total Guaranteed Gain
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: THEME.gold }}>
                +{fmtINRFull(totalInterest)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                Effective APY
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                {effectiveApy.toFixed(2)}% p.a.
              </div>
            </div>
          </div>

          <div
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              background: "color-mix(in srgb, var(--t-gold) 10%, transparent)",
              border: `1px solid color-mix(in srgb, var(--t-gold) 20%, transparent)`,
              fontSize: 11.5,
              color: THEME.ink,
              lineHeight: 1.4,
              display: "flex",
              alignItems: "flex-start",
              gap: 6,
            }}
          >
            <Info size={14} style={{ color: THEME.gold, flexShrink: 0, marginTop: 1 }} />
            <span>
              In India, commercial banks (SBI, HDFC, ICICI, etc.) compound interest on a{" "}
              <strong>Quarterly</strong> basis.
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MODAL 1: EDIT FD MODAL
══════════════════════════════════════════════════════════════════════ */
const modalInpStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "var(--surface-0)",
  border: `1.5px solid ${THEME.line}`,
  borderRadius: 8,
  color: THEME.ink,
  fontSize: 13.5,
  outline: "none",
};

function EditFDModal({ fd: initial, onClose, onSave, saving, familyProfiles = [] }: any) {
  const [form, setForm] = useState({
    bank: initial.bank || "",
    principal: initial.principal != null ? String(initial.principal) : "",
    rate: initial.rate != null ? String(initial.rate) : "",
    years: initial.years != null ? String(initial.years) : "",
    startDate: initial.startDate || today(),
    maturityDate: initial.maturityDate || "",
    fdNumber: initial.fdNumber || initial.accountNumber || "",
    owner: initial.owner || "self",
    interestPayout: initial.interestPayout || "cumulative",
    depositType: initial.depositType || (initial.isTaxSaver ? "tax_saver" : "standard"),
    autoRenew: initial.autoRenew || "none",
    nominee: initial.nominee || "",
    tag: initial.tag || "",
    notes: initial.notes || "",
  });

  const calcMaturity = (sd: string, yrs: string) => {
    if (!sd || !yrs || isNaN(Number(yrs))) return "";
    return addMonthsToDateStr(sd, Math.round(Number(yrs) * 12));
  };

  const setField = (field: string, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "startDate" || field === "years") {
        const sd = field === "startDate" ? value : prev.startDate;
        const yrs = field === "years" ? value : prev.years;
        next.maturityDate = calcMaturity(sd, yrs);
      }
      return next;
    });
  };

  const maturity = fdMaturity(Number(form.principal || 0), Number(form.rate || 0), Number(form.years || 0));

  return (
    <Modal title="Edit Fixed Deposit" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Bank / Institution">
          <input
            style={modalInpStyle}
            value={form.bank}
            onChange={(e) => setField("bank", e.target.value)}
            placeholder="e.g. HDFC Bank, SBI"
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Principal Amount (₹)">
            <input
              style={modalInpStyle}
              type="number"
              value={form.principal}
              onChange={(e) => setField("principal", e.target.value)}
              placeholder="500000"
            />
          </Field>
          <Field label="Interest Rate (% p.a.)">
            <input
              style={modalInpStyle}
              type="number"
              value={form.rate}
              onChange={(e) => setField("rate", e.target.value)}
              placeholder="7.5"
              step="0.05"
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Tenure (Years)">
            <input
              style={modalInpStyle}
              type="number"
              value={form.years}
              onChange={(e) => setField("years", e.target.value)}
              placeholder="2"
              step="0.25"
            />
          </Field>
          <Field label="Start Date">
            <input
              style={modalInpStyle}
              type="date"
              value={form.startDate}
              onChange={(e) => setField("startDate", e.target.value)}
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Maturity Date">
            <input
              style={modalInpStyle}
              type="date"
              value={form.maturityDate}
              onChange={(e) => setField("maturityDate", e.target.value)}
            />
          </Field>
          <Field label="FD / Certificate Number">
            <input
              style={modalInpStyle}
              value={form.fdNumber}
              onChange={(e) => setField("fdNumber", e.target.value)}
              placeholder="e.g. FD1093847"
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Account Owner">
            <select
              style={modalInpStyle}
              value={form.owner}
              onChange={(e) => setField("owner", e.target.value)}
            >
              <option value="self">Self</option>
              {familyProfiles
                .filter((p: any) => p.id !== "self")
                .map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </Field>

          <Field label="Deposit Type">
            <select
              style={modalInpStyle}
              value={form.depositType}
              onChange={(e) => setField("depositType", e.target.value)}
            >
              <option value="standard">Standard Bank FD</option>
              <option value="tax_saver">5-Year Tax Saver (Sec 80C)</option>
              <option value="senior">Senior Citizen FD</option>
              <option value="nbfc">Corporate / NBFC FD</option>
            </select>
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Interest Compounding / Payout">
            <select
              style={modalInpStyle}
              value={form.interestPayout}
              onChange={(e) => setField("interestPayout", e.target.value)}
            >
              <option value="cumulative">Cumulative (Quarterly Compounding)</option>
              <option value="monthly">Monthly Interest Payout</option>
              <option value="quarterly">Quarterly Interest Payout</option>
              <option value="half_yearly">Half-Yearly Payout</option>
              <option value="annual">Annual Payout</option>
            </select>
          </Field>

          <Field label="Auto-Renewal Preference">
            <select
              style={modalInpStyle}
              value={form.autoRenew}
              onChange={(e) => setField("autoRenew", e.target.value)}
            >
              <option value="none">No Auto-Renew (Credit on Maturity)</option>
              <option value="principal_interest">Auto-Renew Principal + Interest</option>
              <option value="principal_only">Auto-Renew Principal Only</option>
            </select>
          </Field>
        </div>

        <Field label="Nominee Name">
          <input
            style={modalInpStyle}
            value={form.nominee}
            onChange={(e) => setField("nominee", e.target.value)}
            placeholder="e.g. Spouse / Son"
          />
        </Field>

        {/* Projected Maturity Box */}
        {form.principal && form.rate && form.years && (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              background: "color-mix(in srgb, var(--t-gold) 8%, var(--surface-1))",
              border: `1px solid color-mix(in srgb, var(--t-gold) 25%, transparent)`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>PROJECTED MATURITY</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: THEME.sage }}>
                <Money value={maturity} variant="full" />
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>TOTAL INTEREST</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: THEME.gold }}>
                +{fmtINRFull(maturity - Number(form.principal || 0))}
              </div>
            </div>
          </div>
        )}
      </div>

      <ModalActions
        onClose={onClose}
        saveLabel="Save Changes"
        loading={saving}
        onSave={() => {
          onSave({
            ...form,
            principal: Number(form.principal) || 0,
            rate: Number(form.rate) || 0,
            years: Number(form.years) || 0,
            isTaxSaver: form.depositType === "tax_saver",
          });
        }}
      />
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MODAL 2: 1-CLICK RENEW / ROLLOVER MODAL
══════════════════════════════════════════════════════════════════════ */
function RenewFDModal({ fd, onClose, onSave, saving }: any) {
  const currentMaturity = fdMaturity(Number(fd.principal || 0), Number(fd.rate || 0), Number(fd.years || 0));

  const [renewType, setRenewType] = useState<"maturity_val" | "principal_only">("maturity_val");
  const [bank, setBank] = useState(fd.bank || "");
  const [principal, setPrincipal] = useState(String(Math.round(currentMaturity)));
  const [rate, setRate] = useState(String(fd.rate || "7.5"));
  const [years, setYears] = useState(String(fd.years || "1"));
  const [startDate, setStartDate] = useState(today());
  const [maturityDate, setMaturityDate] = useState(
    addMonthsToDateStr(today(), Math.round(Number(fd.years || 1) * 12))
  );

  const handleRenewTypeChange = (type: "maturity_val" | "principal_only") => {
    setRenewType(type);
    if (type === "maturity_val") {
      setPrincipal(String(Math.round(currentMaturity)));
    } else {
      setPrincipal(String(fd.principal || ""));
    }
  };

  const handleYearsChange = (val: string) => {
    setYears(val);
    if (startDate && val && !isNaN(Number(val))) {
      setMaturityDate(addMonthsToDateStr(startDate, Math.round(Number(val) * 12)));
    }
  };

  const newMaturity = fdMaturity(Number(principal || 0), Number(rate || 0), Number(years || 0));

  return (
    <Modal title={`Renew / Rollover Fixed Deposit`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontSize: 13, color: THEME.muted, margin: 0 }}>
          Roll over your matured deposit at <strong>{fd.bank}</strong> into a fresh deposit term.
        </p>

        {/* Rollover option toggle */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            type="button"
            onClick={() => handleRenewTypeChange("maturity_val")}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: `1.5px solid ${renewType === "maturity_val" ? "var(--t-accent)" : THEME.line}`,
              background: renewType === "maturity_val" ? "color-mix(in srgb, var(--t-accent) 10%, transparent)" : "var(--surface-0)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>Roll Over Full Amount</div>
            <div style={{ fontSize: 11, color: THEME.muted }}>Principal + Interest ({fmtINRFull(currentMaturity)})</div>
          </button>

          <button
            type="button"
            onClick={() => handleRenewTypeChange("principal_only")}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: `1.5px solid ${renewType === "principal_only" ? "var(--t-accent)" : THEME.line}`,
              background: renewType === "principal_only" ? "color-mix(in srgb, var(--t-accent) 10%, transparent)" : "var(--surface-0)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>Original Principal Only</div>
            <div style={{ fontSize: 11, color: THEME.muted }}>Payout interest ({fmtINRFull(Number(fd.principal || 0))})</div>
          </button>
        </div>

        <Field label="Bank / Institution">
          <input
            style={modalInpStyle}
            value={bank}
            onChange={(e) => setBank(e.target.value)}
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Renewed Principal (₹)">
            <input
              style={modalInpStyle}
              type="number"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
            />
          </Field>
          <Field label="New Interest Rate (% p.a.)">
            <input
              style={modalInpStyle}
              type="number"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              step="0.05"
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Tenure (Years)">
            <input
              style={modalInpStyle}
              type="number"
              value={years}
              onChange={(e) => handleYearsChange(e.target.value)}
              step="0.5"
            />
          </Field>
          <Field label="Start Date">
            <input
              style={modalInpStyle}
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                if (years) setMaturityDate(addMonthsToDateStr(e.target.value, Math.round(Number(years) * 12)));
              }}
            />
          </Field>
        </div>

        <Field label="New Maturity Date">
          <input
            style={modalInpStyle}
            type="date"
            value={maturityDate}
            onChange={(e) => setMaturityDate(e.target.value)}
          />
        </Field>

        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            background: "color-mix(in srgb, var(--t-sage) 8%, var(--surface-1))",
            border: `1px solid color-mix(in srgb, var(--t-sage) 25%, transparent)`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>NEW MATURITY ESTIMATE</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: THEME.sage }}>
              <Money value={newMaturity} variant="full" />
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>INTEREST TO EARN</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: THEME.gold }}>
              +{fmtINRFull(newMaturity - Number(principal || 0))}
            </div>
          </div>
        </div>
      </div>

      <ModalActions
        onClose={onClose}
        saveLabel="Confirm & Create Renewed FD"
        loading={saving}
        onSave={() => {
          onSave({
            ...fd,
            id: undefined, // Create fresh deposit
            bank,
            principal: Number(principal) || 0,
            rate: Number(rate) || 0,
            years: Number(years) || 0,
            startDate,
            maturityDate,
          });
        }}
      />
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MODAL 3: PREMATURE BREAK / CLOSURE SIMULATOR
══════════════════════════════════════════════════════════════════════ */
function PrematureBreakModal({ fd, onClose }: { fd: any; onClose: () => void }) {
  const [penaltyPct, setPenaltyPct] = useState<number>(0.5); // Bank standard 0.5% - 1.0% penalty

  const originalPrincipal = Number(fd.principal || 0);
  const originalRate = Number(fd.rate || 0);
  const elapsedYears = Math.max(0.08, monthsBetween(fd.startDate || today(), today()) / 12);

  // Effective broken rate = applicable rate minus penalty
  const effectiveBrokenRate = Math.max(0, originalRate - penaltyPct);
  const simulatedAccrued = fdMaturity(originalPrincipal, effectiveBrokenRate, elapsedYears);
  const normalAccrued = fdMaturity(originalPrincipal, originalRate, elapsedYears);
  const penaltyCost = normalAccrued - simulatedAccrued;

  return (
    <Modal title="Premature FD Liquidation / Break Simulator" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontSize: 12.5, color: THEME.muted, margin: 0, lineHeight: 1.5 }}>
          Simulate the net payout amount if you liquidate this <strong>{fd.bank}</strong> fixed deposit today before
          maturity. Banks typically charge a <strong>0.50% to 1.00% penalty</strong> on the applicable rate for the
          tenure held.
        </p>

        {/* Penalty slider */}
        <div style={{ padding: 14, borderRadius: 10, background: "var(--surface-1)", border: `1px solid ${THEME.line}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>Premature Penalty Rate</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: THEME.rust }}>{penaltyPct.toFixed(2)}% p.a.</span>
          </div>
          <input
            type="range"
            min={0.0}
            max={2.0}
            step={0.25}
            value={penaltyPct}
            onChange={(e) => setPenaltyPct(Number(e.target.value))}
            style={{ width: "100%", accentColor: THEME.rust }}
          />
        </div>

        {/* Breakdown details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: THEME.muted }}>Principal Deposited</span>
            <span style={{ fontWeight: 800, color: THEME.ink }}>{fmtINRFull(originalPrincipal)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: THEME.muted }}>Contracted Interest Rate</span>
            <span style={{ fontWeight: 800, color: THEME.gold }}>{originalRate}% p.a.</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: THEME.muted }}>Tenure Elapsed (Held So Far)</span>
            <span style={{ fontWeight: 800, color: THEME.ink }}>{(elapsedYears * 12).toFixed(1)} Months</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: THEME.muted }}>Applicable Penalized Rate</span>
            <span style={{ fontWeight: 800, color: THEME.rust }}>{effectiveBrokenRate.toFixed(2)}% p.a.</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span style={{ color: THEME.muted }}>Estimated Penalty Cost</span>
            <span style={{ fontWeight: 800, color: THEME.rust }}>-{fmtINRFull(penaltyCost)}</span>
          </div>
        </div>

        {/* Net Settlement box */}
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: "color-mix(in srgb, var(--t-accent) 10%, var(--surface-1))",
            border: `1px solid color-mix(in srgb, var(--t-accent) 25%, transparent)`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>NET PAYOUT IF BROKEN TODAY</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--t-accent)", fontFamily: "var(--font-display)" }}>
              {fmtINRFull(simulatedAccrued)}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>NET INTEREST EARNED</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: THEME.sage }}>
              +{fmtINRFull(simulatedAccrued - originalPrincipal)}
            </div>
          </div>
        </div>
      </div>

      <ModalActions onClose={onClose} cancelLabel="Close" />
    </Modal>
  );
}

// Internal accrued value helper
function getAccruedValueHelper(f: any): number {
  const maturity = fdMaturity(Number(f.principal || 0), Number(f.rate || 0), Number(f.years || 0));
  if (!f.startDate || !f.years) return Number(f.principal) || 0;
  const elapsed = Math.min(
    Number(f.years),
    Math.max(0, monthsBetween(f.startDate, today()) / 12)
  );
  return fdMaturity(Number(f.principal || 0), Number(f.rate || 0), elapsed);
}
