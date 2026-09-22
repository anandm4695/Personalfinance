import React, { useState, useMemo, useEffect } from "react";
import {
  Briefcase,
  Shield,
  ShieldCheck,
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
  Award,
  List,
  Flame,
  Milestone,
  BookOpen,
  Filter,
  Eye,
  EyeOff,
  Lightbulb,
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
import { getCurrentFY } from "../../utils/appConstants";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { Money } from "../ui/Money";
import {
  fmtINRFull,
  today,
  monthsBetween,
  addMonthsToDateStr,
  exportArrayToCSV,
  uid,
} from "../../utils/finance";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { StatCard } from "../ui/StatCard";
import { ConfirmDialog } from "../ui/Feedback";
import { BankLogo } from "../ui/BrandLogos";

export const NPS_ORANGE = THEME.gold || "#f59e0b";

export const NPS_PFM_COLOR: Record<string, string> = {
  SBI: "#0067b2",
  LIC: "#00a651",
  UTI: "#e31b23",
  HDFC: "#004c8f",
  ICICI: "#F58220",
  Kotak: "#e31e25",
  "Aditya Birla": "#d2232a",
  DSP: "#003087",
  Tata: "#00529b",
  "Max Life": "#c2185b",
  Axis: "#97144d",
};

export const NPS_LC_LABEL: Record<string, string> = {
  "LC-75": "LC-75 Aggressive (Max 75% Equity)",
  "LC-50": "LC-50 Moderate (Max 50% Equity)",
  "LC-25": "LC-25 Conservative (Max 25% Equity)",
};

export interface NPSTransaction {
  id: string;
  date: string;
  particulars?: string;
  uploadedBy?: string;
  employeeAmount?: number | string;
  employerAmount?: number | string;
  note?: string;
  type?: "employee" | "employer" | "voluntary";
}

export interface NPSItem {
  id: string;
  pran?: string;
  tier?: "I" | "II" | string;
  schemeType?: "All Citizen" | "Corporate" | "Government" | "NPS Lite" | string;
  fundManager?: string;
  investmentChoice?: "Auto" | "Active" | string;
  lifecycleFund?: "LC-75" | "LC-50" | "LC-25" | string;
  equityPct?: number | string;
  corpBondPct?: number | string;
  govtSecPct?: number | string;
  altAssetPct?: number | string;
  balance?: number | string;
  yearContribution?: number | string;
  employerContribution?: number | string;
  owner?: string;
  nominee?: string;
  linkedAccount?: string;
  transactions?: NPSTransaction[];
  notes?: string;
  openDate?: string;
  accountName?: string;
}

interface NPSSectionProps {
  items: NPSItem[];
  removeItem: (key: string, id: string) => void;
  updateItem: (key: string, id: string, data: any) => void;
  addItem?: (key: string, data: any) => void;
  onAdd: () => void;
  showToast?: (msg: string, type?: any) => void;
  activeProfile?: string;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: "var(--radius-md)",
  border: `1px solid ${THEME.line}`,
  background: "var(--surface-0)",
  color: THEME.ink,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

// Lifecycle Equity Glide Path Function
function getLifecycleEquity(fund: string, age: number): number {
  if (fund === "LC-75") {
    if (age <= 35) return 75;
    if (age >= 55) return 15;
    return Math.max(15, 75 - (age - 35) * 3);
  } else if (fund === "LC-25") {
    if (age <= 35) return 25;
    if (age >= 55) return 5;
    return Math.max(5, 25 - (age - 35) * 1);
  } else {
    // LC-50
    if (age <= 35) return 50;
    if (age >= 55) return 10;
    return Math.max(10, 50 - (age - 35) * 2);
  }
}

export function NPSSection({
  items = [],
  removeItem,
  updateItem,
  addItem,
  onAdd,
  showToast,
  activeProfile = "All",
}: NPSSectionProps) {
  const { profiles } = useMasterData();
  const { hidden: isPrivacyActive } = usePrivacy();

  // State
  const [viewMode, setViewMode] = useState<
    "cards" | "allocation" | "ledger" | "simulator" | "tax" | "guidance"
  >("cards");
  const [tierFilter, setTierFilter] = useState<"ALL" | "I" | "II">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedPran, setCopiedPran] = useState<string | null>(null);
  const [unmaskedPranMap, setUnmaskedPranMap] = useState<Record<string, boolean>>({});

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<NPSItem | null>(null);
  const [quickContribItem, setQuickContribItem] = useState<NPSItem | null>(null);
  const [updateCorpusItem, setUpdateCorpusItem] = useState<NPSItem | null>(null);
  const [csvImportItem, setCsvImportItem] = useState<NPSItem | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<NPSItem | null>(null);

  // Global Simulator State
  const [simAge, setSimAge] = useState(30);
  const [simRetireAge, setSimRetireAge] = useState(60);
  const [simMonthly, setSimMonthly] = useState(10000);
  const [simStepUp, setSimStepUp] = useState(5); // 5% annual step-up
  const [simExpectedReturn, setSimExpectedReturn] = useState(10.5); // 10.5% CAGR
  const [simAnnuityShare, setSimAnnuityShare] = useState(40); // 40% mandatory annuity
  const [simAnnuityYield, setSimAnnuityYield] = useState(6.5); // 6.5% annuity return

  // Filter Items by activeProfile and tier
  const filteredItems = useMemo(() => {
    return items.filter((n) => {
      if (activeProfile && activeProfile !== "All") {
        if (n.owner && n.owner !== activeProfile) return false;
      }
      if (tierFilter !== "ALL") {
        const itemTier = n.tier || "I";
        if (itemTier !== tierFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pran = (n.pran || "").toLowerCase();
        const pfm = (n.fundManager || "").toLowerCase();
        const owner = (n.owner || "").toLowerCase();
        const scheme = (n.schemeType || "").toLowerCase();
        return pran.includes(q) || pfm.includes(q) || owner.includes(q) || scheme.includes(q);
      }
      return true;
    });
  }, [items, activeProfile, tierFilter, searchQuery]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalCorpus = 0;
    let totalEmployee = 0;
    let totalEmployer = 0;
    let tier1Corpus = 0;
    let tier2Corpus = 0;
    let totalTxs = 0;
    let currentFYEmployee = 0;

    const currentFY = getCurrentFY();

    items.forEach((n) => {
      const bal = Number(n.balance) || 0;
      const txs = n.transactions || [];
      totalTxs += txs.length;

      const txEmp = txs.reduce((s, t) => s + (Number(t.employeeAmount) || 0), 0);
      const txEr = txs.reduce((s, t) => s + (Number(t.employerAmount) || 0), 0);
      const txTotal = txEmp + txEr;

      totalEmployee += txEmp;
      totalEmployer += txEr;

      // Current FY employee contribution for 80CCD(1B) meter
      txs.forEach((t) => {
        if (t.date) {
          const d = new Date(t.date);
          const y = d.getFullYear();
          const m = d.getMonth() + 1;
          const fyYear = m >= 4 ? y : y - 1;
          const fyStr = `FY ${fyYear}-${String(fyYear + 1).slice(2)}`;
          if (fyStr === currentFY) {
            currentFYEmployee += Number(t.employeeAmount) || 0;
          }
        }
      });

      const effectiveCorpus = bal > 0 ? bal : txTotal;
      totalCorpus += effectiveCorpus;

      if ((n.tier || "I") === "II") {
        tier2Corpus += effectiveCorpus;
      } else {
        tier1Corpus += effectiveCorpus;
      }
    });

    const totalContributed = totalEmployee + totalEmployer;
    const totalGains = Math.max(0, totalCorpus - totalContributed);
    const returnPct = totalContributed > 0 ? (totalGains / totalContributed) * 100 : 0;

    // Projected Monthly Pension at age 60 using totalCorpus compounding for 15 yrs default if age unknown
    const defaultYrsToRetire = 15;
    const futureCorpusEst = totalCorpus * Math.pow(1 + 0.1, defaultYrsToRetire);
    const estAnnuityCorpus = futureCorpusEst * 0.4;
    const estMonthlyPension = (estAnnuityCorpus * 0.065) / 12;

    return {
      totalCorpus,
      totalEmployee,
      totalEmployer,
      totalContributed,
      totalGains,
      returnPct,
      tier1Corpus,
      tier2Corpus,
      totalTxs,
      currentFYEmployee,
      estMonthlyPension,
    };
  }, [items]);

  // Copy PRAN helper
  const handleCopyPran = (pran: string) => {
    navigator.clipboard.writeText(pran);
    setCopiedPran(pran);
    showToast?.("PRAN copied to clipboard", "success");
    setTimeout(() => setCopiedPran(null), 2000);
  };

  // Toggle PRAN Mask
  const togglePranMask = (id: string) => {
    setUnmaskedPranMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Format PRAN Display
  const formatPran = (pran?: string, id?: string) => {
    if (!pran) return "—";
    if (isPrivacyActive) return "••••••••••••";
    const unmasked = id ? unmaskedPranMap[id] : false;
    if (unmasked) return pran;
    if (pran.length === 12) {
      return `${pran.slice(0, 4)}••••${pran.slice(8)}`;
    }
    return pran;
  };

  // Save Handlers
  const handleSaveAccount = (data: Partial<NPSItem>) => {
    if (editingItem) {
      updateItem("nps", editingItem.id, data);
      showToast?.("NPS account updated successfully", "success");
      setEditingItem(null);
    } else if (addItem) {
      const newItem: NPSItem = {
        id: uid(),
        tier: "I",
        schemeType: "All Citizen",
        investmentChoice: "Auto",
        lifecycleFund: "LC-50",
        transactions: [],
        ...data,
      };
      addItem("nps", newItem);
      showToast?.("New NPS account created successfully", "success");
      setShowAddModal(false);
    }
  };

  const handleAddQuickContribution = (itemId: string, tx: NPSTransaction) => {
    const target = items.find((n) => n.id === itemId);
    if (!target) return;
    const updatedTxs = [...(target.transactions || []), { ...tx, id: uid() }];
    const manualBal = Number(target.balance) || 0;
    const addedAmount = (Number(tx.employeeAmount) || 0) + (Number(tx.employerAmount) || 0);
    const updatedBalance = manualBal > 0 ? manualBal + addedAmount : manualBal;

    updateItem("nps", itemId, {
      transactions: updatedTxs,
      balance: updatedBalance > 0 ? updatedBalance : target.balance,
    });
    showToast?.("Contribution logged and corpus updated", "success");
    setQuickContribItem(null);
  };

  const handleUpdateCorpus = (itemId: string, newBalance: number) => {
    updateItem("nps", itemId, { balance: newBalance });
    showToast?.("NPS corpus value updated successfully", "success");
    setUpdateCorpusItem(null);
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmItem) {
      removeItem("nps", deleteConfirmItem.id);
      showToast?.("NPS account removed", "info");
      setDeleteConfirmItem(null);
    }
  };

  return (
    <div className="tab-content-enter" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── TOP CONTROL & ACTION BAR ── */}
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
              width: 42,
              height: 42,
              borderRadius: "var(--radius-md)",
              background: `linear-gradient(135deg, ${NPS_ORANGE} 0%, #d97706 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              boxShadow: `0 4px 14px color-mix(in srgb, ${NPS_ORANGE} 30%, transparent)`,
            }}
          >
            <Briefcase size={22} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: 20,
                  fontWeight: 800,
                  color: THEME.ink,
                  letterSpacing: "-0.02em",
                }}
              >
                National Pension System (NPS)
              </h2>
              <Badge variant="gold">Tier I & II</Badge>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 6,
                  background: "color-mix(in srgb, var(--accent) 10%, transparent)",
                  color: "var(--accent)",
                }}
              >
                PFRDA Regulated
              </span>
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
              Tax-advantaged pension accumulation, asset allocation glide paths, and retirement annuity planning
            </div>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Button
            variant="accent"
            icon={<Plus size={14} />}
            onClick={() => {
              if (onAdd) onAdd();
              else setShowAddModal(true);
            }}
          >
            Add NPS Account
          </Button>
          <Button
            variant="ghost"
            icon={<Calculator size={14} />}
            onClick={() => setViewMode("simulator")}
            style={{
              borderColor: viewMode === "simulator" ? "var(--accent)" : THEME.line,
              color: viewMode === "simulator" ? "var(--accent)" : THEME.ink,
            }}
          >
            Pension Projector
          </Button>
          <Button
            variant="ghost"
            icon={<FileSpreadsheet size={14} />}
            onClick={() => {
              const exportRows = items.flatMap((n) =>
                (n.transactions || []).map((t) => ({
                  PRAN: n.pran || "—",
                  Tier: n.tier || "I",
                  FundManager: n.fundManager || "—",
                  Owner: n.owner || "—",
                  Date: t.date,
                  Particulars: t.particulars || "—",
                  UploadedBy: t.uploadedBy || "—",
                  EmployeeAmount: t.employeeAmount || 0,
                  EmployerAmount: t.employerAmount || 0,
                }))
              );
              if (exportRows.length === 0) {
                showToast?.("No transaction entries to export", "info");
                return;
              }
              exportArrayToCSV(exportRows, `nps_master_ledger_${today()}.csv`);
              showToast?.("Master NPS ledger exported successfully", "success");
            }}
          >
            Export All CSV
          </Button>
        </div>
      </div>

      {/* ── EXECUTIVE KPI METRIC CARDS ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          label="Total NPS Wealth"
          value={fmtINRFull(metrics.totalCorpus)}
          numericValue={metrics.totalCorpus}
          formatValue={fmtINRFull}
          color={NPS_ORANGE}
          icon={<Briefcase />}
          sub={`Tier I: ${fmtINRFull(metrics.tier1Corpus)} • Tier II: ${fmtINRFull(metrics.tier2Corpus)}`}
        />
        <StatCard
          label="Self Contributions"
          value={fmtINRFull(metrics.totalEmployee)}
          numericValue={metrics.totalEmployee}
          formatValue={fmtINRFull}
          color={THEME.accent}
          icon={<User />}
          sub="Cumulative employee voluntary & regular"
        />
        <StatCard
          label="Employer Co-Contributions"
          value={fmtINRFull(metrics.totalEmployer)}
          numericValue={metrics.totalEmployer}
          formatValue={fmtINRFull}
          color={THEME.cyan}
          icon={<Building />}
          sub="Section 80CCD(2) tax-exempt corporate share"
        />
        <StatCard
          label="FY 80CCD(1B) Utilization"
          value={fmtINRFull(Math.min(50000, metrics.currentFYEmployee))}
          numericValue={Math.min(50000, metrics.currentFYEmployee)}
          formatValue={fmtINRFull}
          color={metrics.currentFYEmployee >= 50000 ? THEME.sage : THEME.gold}
          icon={<Award />}
          sub={
            metrics.currentFYEmployee >= 50000
              ? "Max ₹50,000 tax deduction utilized"
              : `₹${(50000 - metrics.currentFYEmployee).toLocaleString("en-IN")} headroom left in ${getCurrentFY()}`
          }
        />
        <StatCard
          label="Estimated Monthly Pension"
          value={fmtINRFull(metrics.estMonthlyPension)}
          numericValue={metrics.estMonthlyPension}
          formatValue={fmtINRFull}
          color={THEME.violet}
          icon={<Sparkles />}
          sub="Projected annuity cashflow at age 60"
        />
      </div>

      {/* ── NAVIGATION VIEW SWITCHER & FILTER TABS ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "10px 14px",
          background: "var(--surface-1)",
          borderRadius: "var(--radius-lg)",
          border: `1px solid ${THEME.line}`,
        }}
      >
        {/* Left: View Modes */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { id: "cards", label: "Accounts & Portfolios", icon: Layers },
            { id: "allocation", label: "Asset Allocation (E/C/G/A)", icon: PieIcon },
            { id: "ledger", label: "Contribution Ledger", icon: List, badge: metrics.totalTxs },
            { id: "simulator", label: "Pension & Wealth Projector", icon: Calculator },
            { id: "tax", label: "80CCD Tax Optimizer", icon: Receipt },
            { id: "guidance", label: "PFRDA Rules & Guide", icon: BookOpen },
          ].map(({ id, label, icon: Icon, badge }: any) => {
            const isActive = viewMode === id;
            return (
              <button
                key={id}
                onClick={() => setViewMode(id as any)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "7px 14px",
                  borderRadius: "var(--radius-md)",
                  border: isActive ? `1.5px solid var(--accent)` : `1px solid transparent`,
                  background: isActive ? "var(--surface-0)" : "transparent",
                  color: isActive ? "var(--accent)" : THEME.muted,
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 12,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
                }}
              >
                <Icon size={14} />
                <span>{label}</span>
                {badge !== undefined && badge > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: 10,
                      background: isActive ? "var(--accent)" : THEME.line,
                      color: isActive ? "#fff" : THEME.muted,
                    }}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Search & Tier Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Tier Selector */}
          <div
            style={{
              display: "flex",
              background: "var(--surface-0)",
              borderRadius: "var(--radius-md)",
              border: `1px solid ${THEME.line}`,
              padding: 2,
            }}
          >
            {(["ALL", "I", "II"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTierFilter(t)}
                style={{
                  padding: "4px 10px",
                  borderRadius: "calc(var(--radius-md) - 2px)",
                  border: "none",
                  background: tierFilter === t ? "var(--accent)" : "transparent",
                  color: tierFilter === t ? "#fff" : THEME.muted,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {t === "ALL" ? "All Tiers" : `Tier ${t}`}
              </button>
            ))}
          </div>

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
              style={{ position: "absolute", left: 10, color: THEME.muted, pointerEvents: "none" }}
            />
            <input
              type="text"
              placeholder="Search PRAN, PFM, Owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                ...inputStyle,
                paddingLeft: 30,
                paddingRight: 10,
                width: 180,
                fontSize: 12,
                height: 32,
              }}
            />
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ACCORDING TO VIEW MODE ── */}

      {/* VIEW 1: PORTFOLIO CARDS */}
      {viewMode === "cards" && (
        <>
          {filteredItems.length === 0 ? (
            <div
              style={{
                padding: "60px 20px",
                textAlign: "center",
                background: "var(--surface-1)",
                borderRadius: "var(--radius-xl)",
                border: `1px dashed ${THEME.line}`,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: `color-mix(in srgb, ${NPS_ORANGE} 12%, transparent)`,
                  color: NPS_ORANGE,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <Briefcase size={28} />
              </div>
              <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 700, color: THEME.ink }}>
                {searchQuery || tierFilter !== "ALL"
                  ? "No matching NPS accounts found"
                  : "No NPS Accounts Added Yet"}
              </h3>
              <p
                style={{
                  margin: "0 auto 20px",
                  maxWidth: 420,
                  fontSize: 13,
                  color: THEME.muted,
                  lineHeight: 1.5,
                }}
              >
                Track your National Pension System corpus, manage Tier I & Tier II holdings, monitor PRAN contributions, and plan retirement annuity yields.
              </p>
              <Button
                variant="accent"
                icon={<Plus size={14} />}
                onClick={() => {
                  if (onAdd) onAdd();
                  else setShowAddModal(true);
                }}
              >
                Add First NPS Account
              </Button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                gap: 16,
              }}
            >
              {filteredItems.map((n) => (
                <NPSAccountCard
                  key={n.id}
                  n={n}
                  onEdit={() => setEditingItem(n)}
                  onDelete={() => setDeleteConfirmItem(n)}
                  onQuickContrib={() => setQuickContribItem(n)}
                  onUpdateCorpus={() => setUpdateCorpusItem(n)}
                  onImportCsv={() => setCsvImportItem(n)}
                  onCopyPran={handleCopyPran}
                  copiedPran={copiedPran}
                  formatPran={formatPran}
                  togglePranMask={togglePranMask}
                  unmaskedPran={!!unmaskedPranMap[n.id]}
                  updateItem={updateItem}
                  showToast={showToast}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* VIEW 2: ASSET ALLOCATION MATRIX & PFM ANALYTICS */}
      {viewMode === "allocation" && (
        <NPSAssetAllocationMatrix items={items} />
      )}

      {/* VIEW 3: UNIFIED CONTRIBUTION LEDGER */}
      {viewMode === "ledger" && (
        <NPSUnifiedLedger
          items={items}
          updateItem={updateItem}
          showToast={showToast}
          onAddQuickContrib={(item) => setQuickContribItem(item)}
        />
      )}

      {/* VIEW 4: RETIREMENT & ANNUITY WEALTH PROJECTOR */}
      {viewMode === "simulator" && (
        <NPSRetirementSimulator
          totalCorpus={metrics.totalCorpus}
          simAge={simAge}
          setSimAge={setSimAge}
          simRetireAge={simRetireAge}
          setSimRetireAge={setSimRetireAge}
          simMonthly={simMonthly}
          setSimMonthly={setSimMonthly}
          simStepUp={simStepUp}
          setSimStepUp={setSimStepUp}
          simExpectedReturn={simExpectedReturn}
          setSimExpectedReturn={setSimExpectedReturn}
          simAnnuityShare={simAnnuityShare}
          setSimAnnuityShare={setSimAnnuityShare}
          simAnnuityYield={simAnnuityYield}
          setSimAnnuityYield={setSimAnnuityYield}
        />
      )}

      {/* VIEW 5: 80CCD TAX OPTIMIZER */}
      {viewMode === "tax" && (
        <NPSTaxOptimizer metrics={metrics} items={items} />
      )}

      {/* VIEW 6: PFRDA RULES & GUIDANCE */}
      {viewMode === "guidance" && <NPSGuidanceCenter />}

      {/* ── MODALS ── */}

      {/* Add / Edit NPS Account Modal */}
      {(showAddModal || editingItem) && (
        <NPSAccountModal
          initial={editingItem}
          onClose={() => {
            setShowAddModal(false);
            setEditingItem(null);
          }}
          onSave={handleSaveAccount}
          profiles={profiles}
        />
      )}

      {/* Quick Contribution Modal */}
      {quickContribItem && (
        <NPSQuickContributionModal
          item={quickContribItem}
          onClose={() => setQuickContribItem(null)}
          onSave={(tx) => handleAddQuickContribution(quickContribItem.id, tx)}
        />
      )}

      {/* Quick Update Corpus Modal */}
      {updateCorpusItem && (
        <NPSUpdateCorpusModal
          item={updateCorpusItem}
          onClose={() => setUpdateCorpusItem(null)}
          onSave={(newBal) => handleUpdateCorpus(updateCorpusItem.id, newBal)}
        />
      )}

      {/* CSV Import Modal */}
      {csvImportItem && (
        <NPSCsvImportModal
          item={csvImportItem}
          onClose={() => setCsvImportItem(null)}
          onImport={(rows) => {
            const currentTxs = csvImportItem.transactions || [];
            updateItem("nps", csvImportItem.id, {
              transactions: [...currentTxs, ...rows],
            });
            showToast?.(`Imported ${rows.length} transactions into NPS ledger`, "success");
            setCsvImportItem(null);
          }}
        />
      )}

      {/* Confirm Deletion Dialog */}
      {deleteConfirmItem && (
        <ConfirmDialog
          message={`Are you sure you want to delete NPS account (${deleteConfirmItem.pran || deleteConfirmItem.fundManager || "Account"})? This will remove all associated ledger entries.`}
          onConfirm={handleDeleteAccount}
          onCancel={() => setDeleteConfirmItem(null)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SUB-COMPONENT: INDIVIDUAL NPS ACCOUNT CARD
   ═══════════════════════════════════════════════════════════════════════ */

interface NPSAccountCardProps {
  n: NPSItem;
  onEdit: () => void;
  onDelete: () => void;
  onQuickContrib: () => void;
  onUpdateCorpus: () => void;
  onImportCsv: () => void;
  onCopyPran: (pran: string) => void;
  copiedPran: string | null;
  formatPran: (pran?: string, id?: string) => string;
  togglePranMask: (id: string) => void;
  unmaskedPran: boolean;
  updateItem: (key: string, id: string, data: any) => void;
  showToast?: (msg: string, type?: any) => void;
}

function NPSAccountCard({
  n,
  onEdit,
  onDelete,
  onQuickContrib,
  onUpdateCorpus,
  onImportCsv,
  onCopyPran,
  copiedPran,
  formatPran,
  togglePranMask,
  unmaskedPran,
  updateItem,
  showToast,
}: NPSAccountCardProps) {
  const [showMiniLedger, setShowMiniLedger] = useState(false);
  const pfmColor = NPS_PFM_COLOR[n.fundManager || ""] || NPS_ORANGE;
  const isTier1 = (n.tier || "I") === "I";
  const isActiveChoice = n.investmentChoice === "Active";

  const txs = n.transactions || [];
  const totalEmp = txs.reduce((s, t) => s + (Number(t.employeeAmount) || 0), 0);
  const totalEr = txs.reduce((s, t) => s + (Number(t.employerAmount) || 0), 0);
  const totalContributed = totalEmp + totalEr;
  const manualBalance = Number(n.balance) || 0;
  const displayCorpus = manualBalance > 0 ? manualBalance : totalContributed;
  const gain = Math.max(0, displayCorpus - totalContributed);
  const gainPct = totalContributed > 0 ? (gain / totalContributed) * 100 : 0;

  // Active allocation
  const eqPct = Number(n.equityPct) || 0;
  const corpPct = Number(n.corpBondPct) || 0;
  const govtPct = Number(n.govtSecPct) || 0;
  const altPct = Number(n.altAssetPct) || 0;

  return (
    <Card
      style={{
        padding: 20,
        borderRadius: "var(--radius-lg)",
        borderTop: `4px solid ${pfmColor}`,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        background: "var(--surface-0)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
        position: "relative",
      }}
    >
      {/* Header Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <BankLogo name={n.fundManager || "NPS"} size={42} accentColor={pfmColor} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Badge variant={isTier1 ? "gold" : "blue"}>
                Tier {n.tier || "I"} — {isTier1 ? "Pension" : "Savings"}
              </Badge>
              {n.schemeType && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 7px",
                    borderRadius: 4,
                    background: `color-mix(in srgb, ${pfmColor} 10%, transparent)`,
                    color: pfmColor,
                    border: `1px solid color-mix(in srgb, ${pfmColor} 25%, transparent)`,
                  }}
                >
                  {n.schemeType}
                </span>
              )}
              {n.owner && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "2px 7px",
                    borderRadius: 4,
                    background: "var(--surface-1)",
                    color: THEME.muted,
                  }}
                >
                  <User size={10} style={{ display: "inline", marginRight: 3 }} />
                  {n.owner}
                </span>
              )}
            </div>

            {/* Fund Manager Name */}
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginTop: 4 }}>
              {n.fundManager ? `${n.fundManager} Pension Fund` : "National Pension System"}
            </div>

            {/* PRAN with Copy & Reveal */}
            {n.pran && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                <span style={{ fontSize: 11, color: THEME.muted, fontFamily: "monospace" }}>
                  PRAN: {formatPran(n.pran, n.id)}
                </span>
                <button
                  onClick={() => togglePranMask(n.id)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: THEME.muted,
                    cursor: "pointer",
                  }}
                  title={unmaskedPran ? "Hide PRAN" : "Show PRAN"}
                >
                  {unmaskedPran ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
                <button
                  onClick={() => handleCopyPran(n.pran || "")}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: copiedPran === n.pran ? THEME.sage : THEME.muted,
                    cursor: "pointer",
                  }}
                  title="Copy PRAN"
                >
                  {copiedPran === n.pran ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card Header Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Button
            variant="ghost"
            size="sm"
            icon={<Pencil size={12} />}
            onClick={onEdit}
            title="Edit Account"
          />
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 size={12} />}
            style={{ color: THEME.rust }}
            onClick={onDelete}
            title="Delete Account"
          />
        </div>
      </div>

      {/* Corpus & Gain Strip */}
      <div
        style={{
          padding: "12px 14px",
          background: `color-mix(in srgb, ${pfmColor} 4%, var(--surface-1))`,
          borderRadius: "var(--radius-md)",
          border: `1px solid color-mix(in srgb, ${pfmColor} 18%, transparent)`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Current Portfolio Value</div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: pfmColor,
              fontFamily: "var(--font-display)",
              letterSpacing: "-0.02em",
              marginTop: 2,
            }}
          >
            <Money value={displayCorpus} variant="full" />
          </div>
        </div>

        {totalContributed > 0 && gain > 0 && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: THEME.sage, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 3 }}>
              <TrendingUp size={11} /> +{gainPct.toFixed(1)}% Return
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.sage, marginTop: 2 }}>
              +<Money value={gain} variant="full" />
            </div>
            <div style={{ fontSize: 9, color: THEME.muted }}>Capital Gains</div>
          </div>
        )}
      </div>

      {/* Contribution Breakdown Tiles */}
      {totalContributed > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              background: "var(--surface-1)",
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
              Employee Deposits
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.accent, marginTop: 2 }}>
              <Money value={totalEmp} variant="full" />
            </div>
          </div>
          <div
            style={{
              padding: "8px 10px",
              borderRadius: 8,
              background: "var(--surface-1)",
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
              Employer Share 80CCD(2)
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.cyan, marginTop: 2 }}>
              <Money value={totalEr} variant="full" />
            </div>
          </div>
        </div>
      )}

      {/* Investment Choice & Asset Allocation Bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, marginBottom: 6 }}>
          <span style={{ color: THEME.muted, fontWeight: 600 }}>
            Choice:{" "}
            <b style={{ color: THEME.ink }}>
              {isActiveChoice
                ? "Active Choice (Manual)"
                : `Auto Choice — ${NPS_LC_LABEL[n.lifecycleFund || "LC-50"] || n.lifecycleFund || "LC-50"}`}
            </b>
          </span>
          {isActiveChoice && (
            <span style={{ fontSize: 10, color: THEME.muted }}>
              E: {eqPct}% • C: {corpPct}% • G: {govtPct}% • A: {altPct}%
            </span>
          )}
        </div>

        {isActiveChoice ? (
          <NPSAllocationBar
            equityPct={eqPct}
            corpBondPct={corpPct}
            govtSecPct={govtPct}
            altAssetPct={altPct}
          />
        ) : (
          <div
            style={{
              fontSize: 10,
              color: THEME.muted,
              padding: "6px 10px",
              borderRadius: 6,
              background: "var(--surface-1)",
              lineHeight: 1.4,
            }}
          >
            {n.lifecycleFund === "LC-75"
              ? "Aggressive Life Cycle: 75% Equity up to age 35, dynamically tapering to 15% at age 55."
              : n.lifecycleFund === "LC-25"
                ? "Conservative Life Cycle: 25% Equity up to age 35, safely tapering to 5% at age 55."
                : "Moderate Life Cycle: 50% Equity up to age 35, balanced tapering to 10% at age 55."}
          </div>
        )}
      </div>

      {/* Tier Note Badge */}
      <div
        style={{
          fontSize: 10,
          color: THEME.muted,
          padding: "6px 10px",
          borderRadius: 6,
          background: "var(--surface-1)",
          lineHeight: 1.5,
          borderLeft: `3px solid ${isTier1 ? THEME.gold : THEME.cyan}`,
        }}
      >
        {isTier1
          ? "Tier I — Locked till age 60. At maturity: 60% tax-free lump sum + 40% compulsory monthly pension annuity."
          : "Tier II — Voluntary savings with instant liquidity. No withdrawal restrictions or lock-in period."}
      </div>

      {/* Card Action Footer */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          paddingTop: 8,
          borderTop: `1px solid ${THEME.line}`,
        }}
      >
        <Button
          variant="secondary"
          size="sm"
          icon={<Plus size={11} />}
          onClick={onQuickContrib}
        >
          Add Contribution
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<RefreshCw size={11} />}
          onClick={onUpdateCorpus}
        >
          Update Value
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<List size={11} />}
          onClick={() => setShowMiniLedger(!showMiniLedger)}
          style={{ marginLeft: "auto" }}
        >
          {showMiniLedger ? "Hide Ledger" : `Ledger (${txs.length})`}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          icon={<Upload size={11} />}
          onClick={onImportCsv}
          title="Import CSV"
        />
      </div>

      {/* Mini Ledger Drawer */}
      {showMiniLedger && (
        <div
          style={{
            marginTop: 6,
            padding: 12,
            background: "var(--surface-1)",
            borderRadius: "var(--radius-md)",
            border: `1px solid ${THEME.line}`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: THEME.ink }}>
              Recent Transactions ({txs.length})
            </span>
            {txs.length > 0 && (
              <button
                onClick={() => {
                  const rows = txs.map((t) => ({
                    Date: t.date,
                    Particulars: t.particulars || "—",
                    UploadedBy: t.uploadedBy || "—",
                    EmployeeAmount: t.employeeAmount || 0,
                    EmployerAmount: t.employerAmount || 0,
                  }));
                  exportArrayToCSV(rows, `nps_${n.pran || n.id}_txs.csv`);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--accent)",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Download size={10} /> CSV
              </button>
            )}
          </div>

          {txs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "12px 0", color: THEME.muted, fontSize: 11 }}>
              No transactions logged yet. Use "Add Contribution" to log your first deposit.
            </div>
          ) : (
            <div style={{ maxHeight: 180, overflowY: "auto" }}>
              <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ color: THEME.muted, borderBottom: `1px solid ${THEME.line}`, textAlign: "left" }}>
                    <th style={{ padding: "4px 6px" }}>Date</th>
                    <th style={{ padding: "4px 6px" }}>Particulars</th>
                    <th style={{ padding: "4px 6px", textAlign: "right" }}>Employee</th>
                    <th style={{ padding: "4px 6px", textAlign: "right" }}>Employer</th>
                  </tr>
                </thead>
                <tbody>
                  {[...txs]
                    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                    .map((t) => (
                      <tr key={t.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                        <td style={{ padding: "5px 6px", whiteSpace: "nowrap", color: THEME.muted }}>
                          {t.date}
                        </td>
                        <td
                          style={{
                            padding: "5px 6px",
                            maxWidth: 120,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t.particulars || "Contribution"}
                        </td>
                        <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700, color: THEME.accent }}>
                          {Number(t.employeeAmount) > 0 ? <Money value={Number(t.employeeAmount)} variant="full" /> : "—"}
                        </td>
                        <td style={{ padding: "5px 6px", textAlign: "right", fontWeight: 700, color: THEME.cyan }}>
                          {Number(t.employerAmount) > 0 ? <Money value={Number(t.employerAmount)} variant="full" /> : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SUB-COMPONENT: ASSET ALLOCATION BAR
   ═══════════════════════════════════════════════════════════════════════ */

export function NPSAllocationBar({ equityPct, corpBondPct, govtSecPct, altAssetPct }: any) {
  const e = Number(equityPct) || 0;
  const c = Number(corpBondPct) || 0;
  const g = Number(govtSecPct) || 0;
  const a = Number(altAssetPct) || 0;
  const total = e + c + g + a;
  if (!total) return null;

  const isInvalid = Math.abs(total - 100) > 0.5;

  const segments = [
    { label: "Equity (E)", short: "E", pct: e, color: THEME.rust || "#ef4444" },
    { label: "Corporate Debt (C)", short: "C", pct: c, color: THEME.cyan || "#06b6d4" },
    { label: "Govt Bonds (G)", short: "G", pct: g, color: THEME.sage || "#10b981" },
    { label: "Alternative (A)", short: "A", pct: a, color: THEME.violet || "#8b5cf6" },
  ].filter((s) => s.pct > 0);

  return (
    <div style={{ marginTop: 4 }}>
      {/* Progress Track */}
      <div
        style={{
          display: "flex",
          borderRadius: 6,
          overflow: "hidden",
          height: 10,
          width: "100%",
          background: `color-mix(in srgb, ${THEME.muted} 15%, transparent)`,
        }}
      >
        {segments.map((s) => (
          <div
            key={s.short}
            style={{
              width: `${Math.min(100, s.pct)}%`,
              background: s.color,
              flexShrink: 0,
            }}
            title={`${s.label}: ${s.pct}%`}
          />
        ))}
      </div>

      {/* Legend & Labels */}
      <div style={{ display: "flex", gap: 10, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
        {segments.map((s) => (
          <span
            key={s.short}
            style={{
              fontSize: 10,
              color: THEME.muted,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: s.color,
                display: "inline-block",
              }}
            />
            <b>{s.short}</b> {s.pct}%
          </span>
        ))}
        {isInvalid && (
          <span style={{ fontSize: 10, color: THEME.rust, fontWeight: 700, marginLeft: "auto" }}>
            Total {total}% (Must equal 100%)
          </span>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SUB-COMPONENT: ASSET ALLOCATION MATRIX & PFM ANALYTICS
   ═══════════════════════════════════════════════════════════════════════ */

function NPSAssetAllocationMatrix({ items = [] }: { items: NPSItem[] }) {
  // Aggregate asset class totals across all NPS accounts
  const allocationSummary = useMemo(() => {
    let totalCorpus = 0;
    let equitySum = 0;
    let corpDebtSum = 0;
    let govtSecSum = 0;
    let altAssetSum = 0;

    const pfmMap: Record<string, number> = {};

    items.forEach((n) => {
      const bal = Number(n.balance) || 0;
      const txTotal = (n.transactions || []).reduce(
        (s, t) => s + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
        0
      );
      const corpus = bal > 0 ? bal : txTotal;
      totalCorpus += corpus;

      const pfmName = n.fundManager || "Other";
      pfmMap[pfmName] = (pfmMap[pfmName] || 0) + corpus;

      if (n.investmentChoice === "Active") {
        const e = Number(n.equityPct) || 0;
        const c = Number(n.corpBondPct) || 0;
        const g = Number(n.govtSecPct) || 0;
        const a = Number(n.altAssetPct) || 0;
        equitySum += (corpus * e) / 100;
        corpDebtSum += (corpus * c) / 100;
        govtSecSum += (corpus * g) / 100;
        altAssetSum += (corpus * a) / 100;
      } else {
        // Lifecycle fund estimation based on standard age 35 allocation
        const lc = n.lifecycleFund || "LC-50";
        const eqPct = lc === "LC-75" ? 75 : lc === "LC-25" ? 25 : 50;
        const debtPct = (100 - eqPct) / 2;
        equitySum += (corpus * eqPct) / 100;
        corpDebtSum += (corpus * debtPct) / 100;
        govtSecSum += (corpus * debtPct) / 100;
      }
    });

    const pieData = [
      { name: "Equity (Scheme E)", value: equitySum, color: THEME.rust || "#ef4444" },
      { name: "Corporate Bonds (Scheme C)", value: corpDebtSum, color: THEME.cyan || "#06b6d4" },
      { name: "Govt Securities (Scheme G)", value: govtSecSum, color: THEME.sage || "#10b981" },
      { name: "Alternative Assets (Scheme A)", value: altAssetSum, color: THEME.violet || "#8b5cf6" },
    ].filter((d) => d.value > 0);

    const pfmData = Object.entries(pfmMap).map(([name, val]) => ({
      name,
      value: val,
      color: NPS_PFM_COLOR[name] || THEME.accent,
    }));

    return { totalCorpus, equitySum, corpDebtSum, govtSecSum, altAssetSum, pieData, pfmData };
  }, [items]);

  // Lifecycle Glide Curve Data (Ages 25 to 60)
  const glideCurveData = useMemo(() => {
    const data = [];
    for (let age = 25; age <= 60; age += 5) {
      data.push({
        age: `${age}y`,
        "LC-75 (Aggressive)": getLifecycleEquity("LC-75", age),
        "LC-50 (Moderate)": getLifecycleEquity("LC-50", age),
        "LC-25 (Conservative)": getLifecycleEquity("LC-25", age),
      });
    }
    return data;
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
        {/* Asset Class Donut Chart */}
        <Card style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: THEME.ink }}>
            NPS Asset Class Allocation
          </h3>
          <p style={{ margin: "0 0 16px", fontSize: 12, color: THEME.muted }}>
            Consolidated exposure across Equity (E), Corporate Bonds (C), Govt Bonds (G), & Alternative Assets (A)
          </p>

          <div style={{ height: 220, position: "relative" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationSummary.pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {allocationSummary.pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => [fmtINRFull(Number(value)), "Corpus Exposure"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            {allocationSummary.pieData.map((d) => {
              const pct = allocationSummary.totalCorpus > 0 ? (d.value / allocationSummary.totalCorpus) * 100 : 0;
              return (
                <div
                  key={d.name}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: "var(--surface-1)",
                    border: `1px solid ${THEME.line}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                    <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>{d.name.split(" ")[0]}</span>
                    <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: THEME.ink }}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: d.color, marginTop: 3 }}>
                    {fmtINRFull(d.value)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* PFM Share Breakdown */}
        <Card style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: THEME.ink }}>
            Pension Fund Manager (PFM) Spread
          </h3>
          <p style={{ margin: "0 0 16px", fontSize: 12, color: THEME.muted }}>
            Asset distribution managed by PFRDA-registered Pension Fund Managers
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {allocationSummary.pfmData.map((p) => {
              const pct = allocationSummary.totalCorpus > 0 ? (p.value / allocationSummary.totalCorpus) * 100 : 0;
              return (
                <div key={p.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <BankLogo name={p.name} size={22} accentColor={p.color} />
                      <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                        {p.name} Pension Fund
                      </span>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: p.color }}>
                        {fmtINRFull(p.value)}
                      </span>
                      <span style={{ fontSize: 11, color: THEME.muted, marginLeft: 6 }}>({pct.toFixed(1)}%)</span>
                    </div>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: "var(--surface-1)",
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ width: `${pct}%`, height: "100%", background: p.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Lifecycle Auto-Choice Glide Path Comparison Chart */}
      <Card style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: THEME.ink }}>
              Lifecycle Glide Paths (Auto Choice)
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: THEME.muted }}>
              PFRDA automated risk-tapering: Equity (E) allocation systematically decreases with advancing age
            </p>
          </div>
          <Badge variant="blue">PFRDA Standard Curves</Badge>
        </div>

        <div style={{ height: 260 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={glideCurveData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} />
              <XAxis dataKey="age" stroke={THEME.muted} fontSize={11} />
              <YAxis unit="%" stroke={THEME.muted} fontSize={11} domain={[0, 80]} />
              <Tooltip formatter={(value: any) => [`${value}% Equity`, ""]} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Area
                type="monotone"
                dataKey="LC-75 (Aggressive)"
                stroke={THEME.rust || "#ef4444"}
                fill={`color-mix(in srgb, ${THEME.rust || "#ef4444"} 15%, transparent)`}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="LC-50 (Moderate)"
                stroke={THEME.gold || "#f59e0b"}
                fill={`color-mix(in srgb, ${THEME.gold || "#f59e0b"} 15%, transparent)`}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="LC-25 (Conservative)"
                stroke={THEME.cyan || "#06b6d4"}
                fill={`color-mix(in srgb, ${THEME.cyan || "#06b6d4"} 15%, transparent)`}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SUB-COMPONENT: UNIFIED CONTRIBUTION LEDGER
   ═══════════════════════════════════════════════════════════════════════ */

function NPSUnifiedLedger({
  items = [],
  updateItem,
  showToast,
  onAddQuickContrib,
}: {
  items: NPSItem[];
  updateItem: (key: string, id: string, data: any) => void;
  showToast?: (msg: string, type?: any) => void;
  onAddQuickContrib: (item: NPSItem) => void;
}) {
  const [selectedPran, setSelectedPran] = useState<string>("ALL");
  const [fyFilter, setFyFilter] = useState<string>("ALL");
  const [searchTx, setSearchTx] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "EMPLOYEE" | "EMPLOYER">("ALL");

  // Flatten and decorate all transactions with parent NPS metadata
  const allTransactions = useMemo(() => {
    const list: Array<NPSTransaction & { parentId: string; pran: string; pfm: string; owner: string }> = [];
    items.forEach((n) => {
      (n.transactions || []).forEach((t) => {
        list.push({
          ...t,
          parentId: n.id,
          pran: n.pran || "—",
          pfm: n.fundManager || "NPS",
          owner: n.owner || "Self",
        });
      });
    });
    return list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [items]);

  // Unique Financial Years from transactions
  const availableFYs = useMemo(() => {
    const set = new Set<string>();
    allTransactions.forEach((t) => {
      if (t.date) {
        const d = new Date(t.date);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const fyYear = m >= 4 ? y : y - 1;
        set.add(`FY ${fyYear}-${String(fyYear + 1).slice(2)}`);
      }
    });
    return Array.from(set).sort().reverse();
  }, [allTransactions]);

  // Filtered transactions
  const filteredTxs = useMemo(() => {
    return allTransactions.filter((t) => {
      if (selectedPran !== "ALL" && t.parentId !== selectedPran) return false;

      if (fyFilter !== "ALL" && t.date) {
        const d = new Date(t.date);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const fyYear = m >= 4 ? y : y - 1;
        const fyStr = `FY ${fyYear}-${String(fyYear + 1).slice(2)}`;
        if (fyStr !== fyFilter) return false;
      }

      if (typeFilter === "EMPLOYEE" && !(Number(t.employeeAmount) > 0)) return false;
      if (typeFilter === "EMPLOYER" && !(Number(t.employerAmount) > 0)) return false;

      if (searchTx.trim()) {
        const q = searchTx.toLowerCase();
        const p = (t.particulars || "").toLowerCase();
        const u = (t.uploadedBy || "").toLowerCase();
        const pran = t.pran.toLowerCase();
        return p.includes(q) || u.includes(q) || pran.includes(q);
      }
      return true;
    });
  }, [allTransactions, selectedPran, fyFilter, typeFilter, searchTx]);

  // Aggregate stats for current filter view
  const currentViewStats = useMemo(() => {
    let emp = 0;
    let er = 0;
    filteredTxs.forEach((t) => {
      emp += Number(t.employeeAmount) || 0;
      er += Number(t.employerAmount) || 0;
    });
    return { emp, er, total: emp + er, count: filteredTxs.length };
  }, [filteredTxs]);

  // Delete transaction handler
  const handleDeleteTx = (parentId: string, txId: string) => {
    const target = items.find((n) => n.id === parentId);
    if (!target) return;
    const updated = (target.transactions || []).filter((t) => t.id !== txId);
    updateItem("nps", parentId, { transactions: updated });
    showToast?.("Transaction deleted", "info");
  };

  return (
    <Card style={{ padding: 20 }}>
      {/* Ledger Header & Filter Controls */}
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
          <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: THEME.ink }}>
            Master NPS Contribution Ledger
          </h3>
          <p style={{ margin: 0, fontSize: 12, color: THEME.muted }}>
            Complete audit trail of voluntary deposits, corporate employer matching, and monthly arrears
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {items.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus size={12} />}
              onClick={() => onAddQuickContrib(items[0])}
            >
              Add Contribution
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={<Download size={12} />}
            onClick={() => {
              if (filteredTxs.length === 0) {
                showToast?.("No transactions to export", "info");
                return;
              }
              const rows = filteredTxs.map((t) => ({
                Date: t.date,
                PRAN: t.pran,
                FundManager: t.pfm,
                Owner: t.owner,
                Particulars: t.particulars || "—",
                UploadedBy: t.uploadedBy || "—",
                EmployeeContribution: t.employeeAmount || 0,
                EmployerContribution: t.employerAmount || 0,
              }));
              exportArrayToCSV(rows, `nps_filtered_ledger_${today()}.csv`);
            }}
          >
            Export Filtered CSV
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
          padding: "10px 14px",
          background: "var(--surface-1)",
          borderRadius: "var(--radius-md)",
          border: `1px solid ${THEME.line}`,
          marginBottom: 16,
        }}
      >
        {/* Account Filter */}
        <select
          value={selectedPran}
          onChange={(e) => setSelectedPran(e.target.value)}
          style={{ ...inputStyle, width: "auto", height: 32, fontSize: 12 }}
        >
          <option value="ALL">All Accounts ({items.length})</option>
          {items.map((n) => (
            <option key={n.id} value={n.id}>
              {n.pran ? `PRAN ${n.pran}` : n.fundManager || "NPS"} ({n.owner || "Self"})
            </option>
          ))}
        </select>

        {/* Financial Year Filter */}
        <select
          value={fyFilter}
          onChange={(e) => setFyFilter(e.target.value)}
          style={{ ...inputStyle, width: "auto", height: 32, fontSize: 12 }}
        >
          <option value="ALL">All Financial Years</option>
          {availableFYs.map((fy) => (
            <option key={fy} value={fy}>
              {fy}
            </option>
          ))}
        </select>

        {/* Contribution Type Filter */}
        <div style={{ display: "flex", background: "var(--surface-0)", borderRadius: 6, border: `1px solid ${THEME.line}`, padding: 2 }}>
          {(["ALL", "EMPLOYEE", "EMPLOYER"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setTypeFilter(mode)}
              style={{
                padding: "3px 8px",
                borderRadius: 4,
                border: "none",
                background: typeFilter === mode ? "var(--accent)" : "transparent",
                color: typeFilter === mode ? "#fff" : THEME.muted,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {mode === "ALL" ? "All" : mode === "EMPLOYEE" ? "Employee" : "Employer"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: "relative", marginLeft: "auto" }}>
          <Search size={12} style={{ position: "absolute", left: 8, top: 10, color: THEME.muted }} />
          <input
            type="text"
            placeholder="Filter particulars..."
            value={searchTx}
            onChange={(e) => setSearchTx(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 26, width: 160, height: 32, fontSize: 12 }}
          />
        </div>
      </div>

      {/* Summary Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--surface-1)", border: `1px solid ${THEME.line}` }}>
          <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700 }}>MATCHING ROWS</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink, marginTop: 2 }}>{currentViewStats.count} Entries</div>
        </div>
        <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--surface-1)", border: `1px solid ${THEME.line}` }}>
          <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700 }}>EMPLOYEE DEPOSITS</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: THEME.accent, marginTop: 2 }}>
            <Money value={currentViewStats.emp} variant="full" />
          </div>
        </div>
        <div style={{ padding: "8px 12px", borderRadius: 8, background: "var(--surface-1)", border: `1px solid ${THEME.line}` }}>
          <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700 }}>EMPLOYER CO-CONTRIBUTION</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: THEME.cyan, marginTop: 2 }}>
            <Money value={currentViewStats.er} variant="full" />
          </div>
        </div>
        <div style={{ padding: "8px 12px", borderRadius: 8, background: `color-mix(in srgb, ${NPS_ORANGE} 6%, var(--surface-1))`, border: `1px solid color-mix(in srgb, ${NPS_ORANGE} 25%, transparent)` }}>
          <div style={{ fontSize: 10, color: NPS_ORANGE, fontWeight: 700 }}>TOTAL PERIOD DEPOSITS</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: NPS_ORANGE, marginTop: 2 }}>
            <Money value={currentViewStats.total} variant="full" />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      {filteredTxs.length === 0 ? (
        <div style={{ padding: "40px 0", textAlign: "center", color: THEME.muted, fontSize: 13 }}>
          No transactions match the selected filters.
        </div>
      ) : (
        <div style={{ overflowX: "auto", border: `1px solid ${THEME.line}`, borderRadius: "var(--radius-md)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--surface-1)", textAlign: "left", color: THEME.muted, fontSize: 11, borderBottom: `1px solid ${THEME.line}` }}>
                <th style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>Date</th>
                <th style={{ padding: "8px 12px" }}>PRAN / PFM</th>
                <th style={{ padding: "8px 12px" }}>Particulars</th>
                <th style={{ padding: "8px 12px" }}>Uploaded By</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>Employee (₹)</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>Employer (₹)</th>
                <th style={{ padding: "8px 12px", textAlign: "right" }}>Total (₹)</th>
                <th style={{ padding: "8px 12px", width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {filteredTxs.map((t) => {
                const emp = Number(t.employeeAmount) || 0;
                const er = Number(t.employerAmount) || 0;
                const rowTotal = emp + er;
                return (
                  <tr key={t.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                    <td style={{ padding: "8px 12px", whiteSpace: "nowrap", color: THEME.muted }}>
                      {t.date}
                    </td>
                    <td style={{ padding: "8px 12px", whiteSpace: "nowrap" }}>
                      <div style={{ fontWeight: 700, color: THEME.ink }}>{t.pfm}</div>
                      <div style={{ fontSize: 10, color: THEME.muted, fontFamily: "monospace" }}>{t.pran}</div>
                    </td>
                    <td style={{ padding: "8px 12px", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.particulars || "Regular Contribution"}
                    </td>
                    <td style={{ padding: "8px 12px", color: THEME.muted, fontSize: 11, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {t.uploadedBy || "—"}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: emp > 0 ? THEME.accent : THEME.muted }}>
                      {emp > 0 ? <Money value={emp} variant="full" /> : "—"}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: er > 0 ? THEME.cyan : THEME.muted }}>
                      {er > 0 ? <Money value={er} variant="full" /> : "—"}
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 800, color: THEME.ink }}>
                      <Money value={rowTotal} variant="full" />
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
                      <button
                        onClick={() => handleDeleteTx(t.parentId, t.id)}
                        style={{ background: "none", border: "none", color: THEME.rust, cursor: "pointer", padding: 4 }}
                        title="Delete Entry"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SUB-COMPONENT: RETIREMENT & ANNUITY WEALTH PROJECTOR
   ═══════════════════════════════════════════════════════════════════════ */

interface NPSRetirementSimulatorProps {
  totalCorpus: number;
  simAge: number;
  setSimAge: (n: number) => void;
  simRetireAge: number;
  setSimRetireAge: (n: number) => void;
  simMonthly: number;
  setSimMonthly: (n: number) => void;
  simStepUp: number;
  setSimStepUp: (n: number) => void;
  simExpectedReturn: number;
  setSimExpectedReturn: (n: number) => void;
  simAnnuityShare: number;
  setSimAnnuityShare: (n: number) => void;
  simAnnuityYield: number;
  setSimAnnuityYield: (n: number) => void;
}

function NPSRetirementSimulator({
  totalCorpus,
  simAge,
  setSimAge,
  simRetireAge,
  setSimRetireAge,
  simMonthly,
  setSimMonthly,
  simStepUp,
  setSimStepUp,
  simExpectedReturn,
  setSimExpectedReturn,
  simAnnuityShare,
  setSimAnnuityShare,
  simAnnuityYield,
  setSimAnnuityYield,
}: NPSRetirementSimulatorProps) {
  const years = Math.max(1, simRetireAge - simAge);

  // Compounding simulation with annual step-up
  const simulationResults = useMemo(() => {
    let currentWealth = totalCorpus;
    let totalInvested = totalCorpus;
    let currentMonthlySIP = simMonthly;
    const monthlyRate = simExpectedReturn / 100 / 12;

    const yearlyData = [];
    yearlyData.push({
      age: simAge,
      corpus: Math.round(currentWealth),
      invested: Math.round(totalInvested),
      gains: Math.max(0, Math.round(currentWealth - totalInvested)),
    });

    for (let yr = 1; yr <= years; yr++) {
      for (let m = 1; m <= 12; m++) {
        currentWealth = (currentWealth + currentMonthlySIP) * (1 + monthlyRate);
        totalInvested += currentMonthlySIP;
      }
      // Step up monthly contribution at end of each year
      currentMonthlySIP = currentMonthlySIP * (1 + simStepUp / 100);

      yearlyData.push({
        age: simAge + yr,
        corpus: Math.round(currentWealth),
        invested: Math.round(totalInvested),
        gains: Math.max(0, Math.round(currentWealth - totalInvested)),
      });
    }

    const finalCorpus = currentWealth;
    const annuityCorpus = (finalCorpus * simAnnuityShare) / 100;
    const lumpSumWithdrawal = finalCorpus - annuityCorpus;
    const monthlyPension = (annuityCorpus * (simAnnuityYield / 100)) / 12;

    return {
      finalCorpus,
      totalInvested,
      totalGains: Math.max(0, finalCorpus - totalInvested),
      lumpSumWithdrawal,
      annuityCorpus,
      monthlyPension,
      yearlyData,
    };
  }, [
    totalCorpus,
    simAge,
    simRetireAge,
    simMonthly,
    simStepUp,
    simExpectedReturn,
    simAnnuityShare,
    simAnnuityYield,
    years,
  ]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Top Banner */}
      <Card style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: THEME.ink }}>
              Retirement Corpus & Annuity Pension Simulator
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: THEME.muted }}>
              Model power of compounding with monthly step-up contributions, 60% tax-free lump sum exit, and 40% monthly pension annuity
            </p>
          </div>
          <Badge variant="gold">Compounding Simulator</Badge>
        </div>

        {/* Projection KPI Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div style={{ padding: "12px 14px", borderRadius: 10, background: `color-mix(in srgb, ${NPS_ORANGE} 8%, var(--surface-1))`, border: `1px solid color-mix(in srgb, ${NPS_ORANGE} 25%, transparent)` }}>
            <div style={{ fontSize: 10, color: NPS_ORANGE, fontWeight: 700 }}>PROJECTED CORPUS AT {simRetireAge}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: NPS_ORANGE, marginTop: 3 }}>
              {fmtINRFull(simulationResults.finalCorpus)}
            </div>
            <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
              Invested: {fmtINRFull(simulationResults.totalInvested)}
            </div>
          </div>

          <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--surface-1)", border: `1px solid ${THEME.line}` }}>
            <div style={{ fontSize: 10, color: THEME.sage, fontWeight: 700 }}>60% TAX-FREE LUMP SUM</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: THEME.sage, marginTop: 3 }}>
              {fmtINRFull(simulationResults.lumpSumWithdrawal)}
            </div>
            <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
              100% Tax-Exempt under Sec 10(12A)
            </div>
          </div>

          <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--surface-1)", border: `1px solid ${THEME.line}` }}>
            <div style={{ fontSize: 10, color: THEME.cyan, fontWeight: 700 }}>40% MANDATORY ANNUITY CORPUS</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: THEME.cyan, marginTop: 3 }}>
              {fmtINRFull(simulationResults.annuityCorpus)}
            </div>
            <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
              Invested in PFRDA Annuity Service Provider
            </div>
          </div>

          <div style={{ padding: "12px 14px", borderRadius: 10, background: `color-mix(in srgb, ${THEME.violet} 8%, var(--surface-1))`, border: `1px solid color-mix(in srgb, ${THEME.violet} 25%, transparent)` }}>
            <div style={{ fontSize: 10, color: THEME.violet, fontWeight: 700 }}>ESTIMATED MONTHLY PENSION</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: THEME.violet, marginTop: 3 }}>
              {fmtINRFull(simulationResults.monthlyPension)}
            </div>
            <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
              Lifelong monthly pension @ {simAnnuityYield}% p.a.
            </div>
          </div>
        </div>

        {/* Growth Projection Chart */}
        <div style={{ height: 260, marginBottom: 20 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={simulationResults.yearlyData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} />
              <XAxis dataKey="age" unit=" yrs" stroke={THEME.muted} fontSize={11} />
              <YAxis tickFormatter={(v) => fmtINRFull(v)} stroke={THEME.muted} fontSize={11} />
              <Tooltip formatter={(value: any) => [fmtINRFull(Number(value)), ""]} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              <Area
                type="monotone"
                dataKey="corpus"
                name="Total Wealth Corpus"
                stroke={NPS_ORANGE}
                fill={`color-mix(in srgb, ${NPS_ORANGE} 18%, transparent)`}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="invested"
                name="Principal Invested"
                stroke={THEME.accent}
                fill={`color-mix(in srgb, ${THEME.accent} 10%, transparent)`}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Interactive Sliders Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
            padding: 16,
            background: "var(--surface-1)",
            borderRadius: "var(--radius-lg)",
            border: `1px solid ${THEME.line}`,
          }}
        >
          {/* Current Age */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: THEME.muted }}>Current Age:</span>
              <b style={{ color: THEME.ink }}>{simAge} Years</b>
            </div>
            <input
              type="range"
              min={18}
              max={59}
              value={simAge}
              onChange={(e) => setSimAge(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
          </div>

          {/* Retirement Age */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: THEME.muted }}>Retirement Age:</span>
              <b style={{ color: THEME.ink }}>{simRetireAge} Years</b>
            </div>
            <input
              type="range"
              min={Math.max(60, simAge + 1)}
              max={70}
              value={simRetireAge}
              onChange={(e) => setSimRetireAge(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
          </div>

          {/* Monthly SIP */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: THEME.muted }}>Monthly Contribution:</span>
              <b style={{ color: THEME.ink }}>{fmtINRFull(simMonthly)}/mo</b>
            </div>
            <input
              type="range"
              min={1000}
              max={150000}
              step={1000}
              value={simMonthly}
              onChange={(e) => setSimMonthly(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
          </div>

          {/* Annual Step Up */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: THEME.muted }}>Annual SIP Step-up:</span>
              <b style={{ color: THEME.ink }}>{simStepUp}% / Year</b>
            </div>
            <input
              type="range"
              min={0}
              max={15}
              step={1}
              value={simStepUp}
              onChange={(e) => setSimStepUp(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
          </div>

          {/* Expected CAGR */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: THEME.muted }}>Expected Return (CAGR):</span>
              <b style={{ color: THEME.ink }}>{simExpectedReturn}% p.a.</b>
            </div>
            <input
              type="range"
              min={8}
              max={15}
              step={0.5}
              value={simExpectedReturn}
              onChange={(e) => setSimExpectedReturn(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
          </div>

          {/* Annuity Purchase Ratio */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: THEME.muted }}>Annuity Purchase:</span>
              <b style={{ color: THEME.ink }}>{simAnnuityShare}% (Min 40%)</b>
            </div>
            <input
              type="range"
              min={40}
              max={100}
              step={5}
              value={simAnnuityShare}
              onChange={(e) => setSimAnnuityShare(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SUB-COMPONENT: 80CCD TAX OPTIMIZER & VISUALIZER
   ═══════════════════════════════════════════════════════════════════════ */

function NPSTaxOptimizer({ metrics, items }: { metrics: any; items: NPSItem[] }) {
  const currentFY = getCurrentFY();
  const currentFyContrib = metrics.currentFYEmployee || 0;
  const utilized80CCD1B = Math.min(50000, currentFyContrib);
  const remaining80CCD1B = Math.max(0, 50000 - currentFyContrib);

  // Assuming 30% tax bracket (+ 4% cess = 31.2%)
  const taxSaved80CCD1B = (utilized80CCD1B * 31.2) / 100;
  const potentialExtraSavings = (remaining80CCD1B * 31.2) / 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 3 Pillars of NPS Tax Benefits */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {/* Section 80CCD(1) */}
        <Card style={{ padding: 20, borderTop: `4px solid ${THEME.accent}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <h3 style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: THEME.ink }}>
                Section 80CCD(1)
              </h3>
              <div style={{ fontSize: 11, color: THEME.muted }}>Individual Contribution</div>
            </div>
            <Badge variant="blue">Within ₹1.5L Limit</Badge>
          </div>
          <p style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.5, margin: "0 0 12px" }}>
            Deduction for self-contribution up to <b>10% of salary</b> (Basic + DA) for salaried, or 20% of gross income for self-employed, within the overall <b>₹1,50,000</b> ceiling under Section 80CCE.
          </p>
          <div style={{ padding: "8px 10px", background: "var(--surface-1)", borderRadius: 6, fontSize: 11, color: THEME.ink, display: "flex", alignItems: "center", gap: 6 }}>
            <Lightbulb size={13} color={THEME.accent} style={{ flexShrink: 0 }} />
            <span>Shared with EPF, PPF, ELSS, Life Insurance premiums.</span>
          </div>
        </Card>

        {/* Section 80CCD(1B) */}
        <Card style={{ padding: 20, borderTop: `4px solid ${THEME.gold}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <h3 style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: THEME.ink }}>
                Section 80CCD(1B)
              </h3>
              <div style={{ fontSize: 11, color: THEME.muted }}>Exclusive Extra Deduction</div>
            </div>
            <Badge variant="gold">Extra ₹50,000</Badge>
          </div>
          <p style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.5, margin: "0 0 12px" }}>
            <b>Over and above the ₹1.5 Lakh 80C limit!</b> Exclusive tax deduction of up to <b>₹50,000</b> for Tier-I contributions. Saves up to ₹15,600 in tax every single year (30% bracket).
          </p>
          <div style={{ padding: "8px 10px", background: `color-mix(in srgb, ${THEME.gold} 10%, var(--surface-1))`, borderRadius: 6, fontSize: 11, color: THEME.gold, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <Zap size={13} color={THEME.gold} style={{ flexShrink: 0 }} />
            <span>Old Tax Regime Exclusive: Save up to ₹15,600/year.</span>
          </div>
        </Card>

        {/* Section 80CCD(2) */}
        <Card style={{ padding: 20, borderTop: `4px solid ${THEME.cyan}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              <h3 style={{ margin: "0 0 2px", fontSize: 15, fontWeight: 700, color: THEME.ink }}>
                Section 80CCD(2)
              </h3>
              <div style={{ fontSize: 11, color: THEME.muted }}>Employer Co-Contribution</div>
            </div>
            <Badge variant="green">Both Regimes</Badge>
          </div>
          <p style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.5, margin: "0 0 12px" }}>
            Employer contribution up to <b>10% of salary</b> (14% for Central/State Govt employees). <b>Available in both Old AND New Tax Regimes!</b> No upper rupee cap (subject to ₹7.5L combined employer EPF/NPS/Superannuation limit).
          </p>
          <div style={{ padding: "8px 10px", background: `color-mix(in srgb, ${THEME.cyan} 10%, var(--surface-1))`, borderRadius: 6, fontSize: 11, color: THEME.cyan, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <Award size={13} color={THEME.cyan} style={{ flexShrink: 0 }} />
            <span>Works under New Tax Regime under Section 115BAC!</span>
          </div>
        </Card>
      </div>

      {/* Real-time 80CCD(1B) Utilization Tracker */}
      <Card style={{ padding: 20 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 700, color: THEME.ink }}>
          {currentFY} 80CCD(1B) ₹50,000 Tax-Shield Meter
        </h3>
        <p style={{ margin: "0 0 16px", fontSize: 12, color: THEME.muted }}>
          Track voluntary Tier I deposits against the statutory ₹50,000 extra tax deduction limit
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
            {fmtINRFull(utilized80CCD1B)} of ₹50,000 Utilized
          </span>
          <span style={{ fontSize: 13, fontWeight: 800, color: utilized80CCD1B >= 50000 ? THEME.sage : THEME.gold }}>
            {((utilized80CCD1B / 50000) * 100).toFixed(0)}%
          </span>
        </div>

        <div style={{ height: 12, borderRadius: 6, background: "var(--surface-1)", overflow: "hidden", marginBottom: 16 }}>
          <div
            style={{
              width: `${Math.min(100, (utilized80CCD1B / 50000) * 100)}%`,
              height: "100%",
              background: utilized80CCD1B >= 50000 ? THEME.sage : THEME.gold,
              transition: "width 0.3s ease",
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <div style={{ padding: "10px 14px", borderRadius: 8, background: "var(--surface-1)", border: `1px solid ${THEME.line}` }}>
            <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700 }}>TAX SAVED SO FAR (30% BRACKET)</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: THEME.sage, marginTop: 2 }}>
              {fmtINRFull(taxSaved80CCD1B)}
            </div>
          </div>
          {remaining80CCD1B > 0 && (
            <div style={{ padding: "10px 14px", borderRadius: 8, background: `color-mix(in srgb, ${THEME.gold} 8%, var(--surface-1))`, border: `1px solid color-mix(in srgb, ${THEME.gold} 25%, transparent)` }}>
              <div style={{ fontSize: 10, color: THEME.gold, fontWeight: 700 }}>POTENTIAL EXTRA TAX SAVINGS</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: THEME.gold, marginTop: 2 }}>
                {fmtINRFull(potentialExtraSavings)}
              </div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                Deposit ₹{remaining80CCD1B.toLocaleString("en-IN")} more before March 31
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   SUB-COMPONENT: PFRDA RULES & GUIDANCE CENTER
   ═══════════════════════════════════════════════════════════════════════ */

function NPSGuidanceCenter() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Tier I vs Tier II Comparison Table */}
      <Card style={{ padding: 20 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 700, color: THEME.ink }}>
          NPS Tier I vs Tier II Comparison
        </h3>
        <p style={{ margin: "0 0 16px", fontSize: 12, color: THEME.muted }}>
          Understand key differences between primary pension accounts and voluntary savings accounts
        </p>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--surface-1)", textAlign: "left", color: THEME.muted }}>
                <th style={{ padding: "10px 14px", width: "25%" }}>Feature</th>
                <th style={{ padding: "10px 14px", width: "37.5%" }}>Tier I (Pension Account)</th>
                <th style={{ padding: "10px 14px", width: "37.5%" }}>Tier II (Savings Account)</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  feature: "Account Objective",
                  t1: "Compulsory retirement & pension accumulation",
                  t2: "Voluntary open-ended investment facility",
                },
                {
                  feature: "Lock-in Period",
                  t1: "Locked until age 60",
                  t2: "Zero lock-in — withdraw anytime with T+2 liquidity",
                },
                {
                  feature: "Tax Deductions",
                  t1: "80CCD(1) + 80CCD(1B) [₹50k extra] + 80CCD(2)",
                  t2: "No tax benefits (except Section 80C for Central Govt 3-yr lock-in)",
                },
                {
                  feature: "Exit at Age 60",
                  t1: "60% tax-free lump sum + 40% mandatory annuity",
                  t2: "100% withdrawable anytime without annuity requirement",
                },
                {
                  feature: "Partial Withdrawals",
                  t1: "Up to 25% after 3 years for education/marriage/medical/house",
                  t2: "Unlimited withdrawals at any frequency",
                },
                {
                  feature: "Min Annual Contribution",
                  t1: "₹1,000 / financial year",
                  t2: "₹250 per transaction / No annual minimum requirement",
                },
              ].map((row, idx) => (
                <tr key={row.feature} style={{ borderTop: `1px solid ${THEME.line}` }}>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: THEME.ink }}>{row.feature}</td>
                  <td style={{ padding: "10px 14px", color: THEME.ink }}>{row.t1}</td>
                  <td style={{ padding: "10px 14px", color: THEME.muted }}>{row.t2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Exit & Withdrawal Rules */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <Card style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Milestone size={18} color={THEME.sage} />
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: THEME.ink }}>
              Exit at Superannuation (Age 60)
            </h4>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: THEME.muted, lineHeight: 1.6 }}>
            <li><b>Lump Sum:</b> Up to 60% of total corpus can be withdrawn completely <b>tax-free</b> under Section 10(12A).</li>
            <li><b>Annuity:</b> Minimum 40% must be used to purchase lifelong annuity from registered ASP.</li>
            <li><b>Small Corpus Exception:</b> If total corpus is ≤ ₹5,00,000, 100% can be withdrawn as lump sum without mandatory annuity.</li>
          </ul>
        </Card>

        <Card style={{ padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <AlertTriangle size={18} color={THEME.rust} />
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: THEME.ink }}>
              Premature Exit (Before Age 60)
            </h4>
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: THEME.muted, lineHeight: 1.6 }}>
            <li>Minimum subscription period of <b>5 years</b> required.</li>
            <li><b>Annuity Penalty:</b> Minimum <b>80%</b> of corpus must be utilized for annuity purchase.</li>
            <li>Only 20% can be withdrawn as lump sum.</li>
            <li>If total corpus is ≤ ₹2,50,000, 100% lump-sum exit allowed.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MODAL 1: ADD / EDIT NPS ACCOUNT
   ═══════════════════════════════════════════════════════════════════════ */

function NPSAccountModal({
  initial,
  onClose,
  onSave,
  profiles = [],
}: {
  initial: NPSItem | null;
  onClose: () => void;
  onSave: (data: Partial<NPSItem>) => void;
  profiles: string[];
}) {
  const [form, setForm] = useState({
    pran: initial?.pran || "",
    tier: initial?.tier || "I",
    schemeType: initial?.schemeType || "All Citizen",
    fundManager: initial?.fundManager || "SBI",
    investmentChoice: initial?.investmentChoice || "Auto",
    lifecycleFund: initial?.lifecycleFund || "LC-50",
    equityPct: initial?.equityPct != null ? String(initial.equityPct) : "50",
    corpBondPct: initial?.corpBondPct != null ? String(initial.corpBondPct) : "30",
    govtSecPct: initial?.govtSecPct != null ? String(initial.govtSecPct) : "15",
    altAssetPct: initial?.altAssetPct != null ? String(initial.altAssetPct) : "5",
    balance: initial?.balance != null ? String(initial.balance) : "",
    yearContribution: initial?.yearContribution != null ? String(initial.yearContribution) : "",
    employerContribution: initial?.employerContribution != null ? String(initial.employerContribution) : "",
    owner: initial?.owner || "Self",
    nominee: initial?.nominee || "",
    notes: initial?.notes || "",
  });

  const isActive = form.investmentChoice === "Active";
  const e = Number(form.equityPct) || 0;
  const c = Number(form.corpBondPct) || 0;
  const g = Number(form.govtSecPct) || 0;
  const a = Number(form.altAssetPct) || 0;
  const allocSum = e + c + g + a;
  const isAllocValid = !isActive || Math.abs(allocSum - 100) < 0.5;

  const handleSubmit = () => {
    if (isActive && !isAllocValid) return;
    onSave({
      pran: form.pran.trim(),
      tier: form.tier,
      schemeType: form.schemeType,
      fundManager: form.fundManager,
      investmentChoice: form.investmentChoice,
      lifecycleFund: form.lifecycleFund,
      equityPct: isActive ? e : undefined,
      corpBondPct: isActive ? c : undefined,
      govtSecPct: isActive ? g : undefined,
      altAssetPct: isActive ? a : undefined,
      balance: form.balance ? Number(form.balance) : 0,
      yearContribution: form.yearContribution ? Number(form.yearContribution) : 0,
      employerContribution: form.employerContribution ? Number(form.employerContribution) : 0,
      owner: form.owner,
      nominee: form.nominee.trim(),
      notes: form.notes.trim(),
    });
  };

  return (
    <Modal title={initial ? "Edit NPS Account" : "Add NPS Account"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Tier & Subscriber Model */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Tier *">
            <select
              style={inputStyle}
              value={form.tier}
              onChange={(e) => setForm({ ...form, tier: e.target.value })}
            >
              <option value="I">Tier I — Pension (Tax Advantages)</option>
              <option value="II">Tier II — Savings (No Lock-in)</option>
            </select>
          </Field>

          <Field label="Subscriber Model">
            <select
              style={inputStyle}
              value={form.schemeType}
              onChange={(e) => setForm({ ...form, schemeType: e.target.value })}
            >
              <option value="All Citizen">All Citizen Model</option>
              <option value="Corporate">Corporate NPS (Employer)</option>
              <option value="Government">Government Model (NPS-G)</option>
              <option value="NPS Lite">NPS Lite / Swavalamban</option>
            </select>
          </Field>
        </div>

        {/* PRAN & Fund Manager */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="PRAN Number (12 Digits)">
            <input
              style={inputStyle}
              placeholder="e.g. 110012345678"
              maxLength={12}
              value={form.pran}
              onChange={(e) => setForm({ ...form, pran: e.target.value.replace(/\D/g, "") })}
            />
          </Field>

          <Field label="Pension Fund Manager (PFM) *">
            <select
              style={inputStyle}
              value={form.fundManager}
              onChange={(e) => setForm({ ...form, fundManager: e.target.value })}
            >
              <option value="SBI">SBI Pension Funds</option>
              <option value="HDFC">HDFC Pension Management</option>
              <option value="ICICI">ICICI Prudential Pension</option>
              <option value="Kotak">Kotak Mahindra Pension</option>
              <option value="LIC">LIC Pension Fund</option>
              <option value="UTI">UTI Retirement Solutions</option>
              <option value="Aditya Birla">Aditya Birla Sun Life Pension</option>
              <option value="DSP">DSP Pension Fund</option>
              <option value="Tata">Tata Pension Management</option>
              <option value="Max Life">Max Life Pension Fund</option>
              <option value="Axis">Axis Pension Fund</option>
            </select>
          </Field>
        </div>

        {/* Investment Choice: Auto vs Active */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Investment Choice">
            <select
              style={inputStyle}
              value={form.investmentChoice}
              onChange={(e) => setForm({ ...form, investmentChoice: e.target.value })}
            >
              <option value="Auto">Auto Choice (Lifecycle Glide Path)</option>
              <option value="Active">Active Choice (Manual E/C/G/A)</option>
            </select>
          </Field>

          {form.investmentChoice === "Auto" ? (
            <Field label="Lifecycle Fund">
              <select
                style={inputStyle}
                value={form.lifecycleFund}
                onChange={(e) => setForm({ ...form, lifecycleFund: e.target.value })}
              >
                <option value="LC-75">LC-75 Aggressive (Max 75% Equity)</option>
                <option value="LC-50">LC-50 Moderate (Max 50% Equity)</option>
                <option value="LC-25">LC-25 Conservative (Max 25% Equity)</option>
              </select>
            </Field>
          ) : (
            <Field label="Equity (E) % — Max 75%">
              <input
                type="number"
                min={0}
                max={75}
                style={inputStyle}
                value={form.equityPct}
                onChange={(e) => setForm({ ...form, equityPct: e.target.value })}
              />
            </Field>
          )}
        </div>

        {/* Active Choice Custom Asset Splits */}
        {isActive && (
          <div
            style={{
              padding: 12,
              background: "var(--surface-1)",
              borderRadius: "var(--radius-md)",
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: THEME.ink, marginBottom: 8 }}>
              Active Asset Allocation (Must Sum to 100%)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <Field label="Corp Bonds (C) %">
                <input
                  type="number"
                  min={0}
                  max={100}
                  style={inputStyle}
                  value={form.corpBondPct}
                  onChange={(e) => setForm({ ...form, corpBondPct: e.target.value })}
                />
              </Field>
              <Field label="Govt Bonds (G) %">
                <input
                  type="number"
                  min={0}
                  max={100}
                  style={inputStyle}
                  value={form.govtSecPct}
                  onChange={(e) => setForm({ ...form, govtSecPct: e.target.value })}
                />
              </Field>
              <Field label="Alternative (A) % (Max 5%)">
                <input
                  type="number"
                  min={0}
                  max={5}
                  style={inputStyle}
                  value={form.altAssetPct}
                  onChange={(e) => setForm({ ...form, altAssetPct: e.target.value })}
                />
              </Field>
            </div>

            <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", fontSize: 11 }}>
              <span style={{ color: isAllocValid ? THEME.sage : THEME.rust, fontWeight: 700 }}>
                Total: {allocSum}% {isAllocValid ? "(Valid 100%)" : "(Must equal exactly 100%)"}
              </span>
            </div>
          </div>
        )}

        {/* Corpus & Annual Estimate */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Current Corpus Value (₹)">
            <input
              type="number"
              style={inputStyle}
              placeholder="e.g. 500000"
              value={form.balance}
              onChange={(e) => setForm({ ...form, balance: e.target.value })}
            />
          </Field>
          <Field label="Annual Employee Contribution (₹)">
            <input
              type="number"
              style={inputStyle}
              placeholder="e.g. 50000"
              value={form.yearContribution}
              onChange={(e) => setForm({ ...form, yearContribution: e.target.value })}
            />
          </Field>
        </div>

        {/* Corporate Employer Contribution & Owner */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {form.schemeType === "Corporate" && (
            <Field label="Annual Employer Contribution (₹) — 80CCD(2)">
              <input
                type="number"
                style={inputStyle}
                placeholder="e.g. 60000"
                value={form.employerContribution}
                onChange={(e) => setForm({ ...form, employerContribution: e.target.value })}
              />
            </Field>
          )}
          <Field label="Account Holder / Profile">
            <select
              style={inputStyle}
              value={form.owner}
              onChange={(e) => setForm({ ...form, owner: e.target.value })}
            >
              {profiles.length > 0 ? (
                profiles.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))
              ) : (
                <option value="Self">Self</option>
              )}
            </select>
          </Field>
        </div>

        {/* Nominee */}
        <Field label="Nominee Details">
          <input
            style={inputStyle}
            placeholder="e.g. Spouse / Nominee Name"
            value={form.nominee}
            onChange={(e) => setForm({ ...form, nominee: e.target.value })}
          />
        </Field>
      </div>

      <ModalActions
        onSave={handleSubmit}
        onClose={onClose}
        saveLabel={initial ? "Save Changes" : "Create NPS Account"}
        disabled={!isAllocValid}
      />
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MODAL 2: QUICK CONTRIBUTION MODAL
   ═══════════════════════════════════════════════════════════════════════ */

function NPSQuickContributionModal({
  item,
  onClose,
  onSave,
}: {
  item: NPSItem;
  onClose: () => void;
  onSave: (tx: NPSTransaction) => void;
}) {
  const [form, setForm] = useState({
    date: today(),
    particulars: "Monthly Regular Contribution",
    uploadedBy: "eNPS / Net Banking",
    employeeAmount: "5000",
    employerAmount: "0",
  });

  const emp = Number(form.employeeAmount) || 0;
  const er = Number(form.employerAmount) || 0;
  const isValid = !!form.date && (emp > 0 || er > 0);

  return (
    <Modal title={`Log NPS Contribution — ${item.pran || item.fundManager || "Account"}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Transaction Date *">
          <input
            type="date"
            style={inputStyle}
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </Field>

        <Field label="Particulars / Description">
          <input
            style={inputStyle}
            value={form.particulars}
            onChange={(e) => setForm({ ...form, particulars: e.target.value })}
            placeholder="e.g. Regular monthly contribution"
          />
        </Field>

        <Field label="Uploaded By / Source Channel">
          <input
            style={inputStyle}
            value={form.uploadedBy}
            onChange={(e) => setForm({ ...form, uploadedBy: e.target.value })}
            placeholder="e.g. Kotak Mahindra Bank / eNPS Online"
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Employee Amount (₹)">
            <input
              type="number"
              min={0}
              style={inputStyle}
              value={form.employeeAmount}
              onChange={(e) => setForm({ ...form, employeeAmount: e.target.value })}
            />
          </Field>
          <Field label="Employer Amount (₹)">
            <input
              type="number"
              min={0}
              style={inputStyle}
              value={form.employerAmount}
              onChange={(e) => setForm({ ...form, employerAmount: e.target.value })}
            />
          </Field>
        </div>

        {(emp > 0 || er > 0) && (
          <div
            style={{
              padding: "10px 14px",
              background: `color-mix(in srgb, ${NPS_ORANGE} 8%, var(--surface-1))`,
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 700,
              color: NPS_ORANGE,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Total Deposit:</span>
            <span>{fmtINRFull(emp + er)}</span>
          </div>
        )}
      </div>

      <ModalActions
        onSave={() => {
          if (!isValid) return;
          onSave({
            id: uid(),
            date: form.date,
            particulars: form.particulars.trim(),
            uploadedBy: form.uploadedBy.trim(),
            employeeAmount: emp,
            employerAmount: er,
          });
        }}
        onClose={onClose}
        saveLabel="Log Contribution"
        disabled={!isValid}
      />
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MODAL 3: QUICK UPDATE CORPUS MODAL
   ═══════════════════════════════════════════════════════════════════════ */

function NPSUpdateCorpusModal({
  item,
  onClose,
  onSave,
}: {
  item: NPSItem;
  onClose: () => void;
  onSave: (newBalance: number) => void;
}) {
  const [balance, setBalance] = useState(item.balance != null ? String(item.balance) : "");

  return (
    <Modal title={`Update NPS Corpus Value — ${item.pran || item.fundManager || "Account"}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <p style={{ fontSize: 12, color: THEME.muted, margin: 0 }}>
          Enter the latest market valuation from your CRA statement (NSDL Protean or KFintech statement).
        </p>

        <Field label="Latest Portfolio Valuation (₹) *">
          <input
            type="number"
            style={{ ...inputStyle, fontSize: 16, fontWeight: 700 }}
            placeholder="e.g. 625000"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            autoFocus
          />
        </Field>
      </div>

      <ModalActions
        onSave={() => onSave(Number(balance) || 0)}
        onClose={onClose}
        saveLabel="Update Value"
      />
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MODAL 4: CSV BULK IMPORT MODAL
   ═══════════════════════════════════════════════════════════════════════ */

function NPSCsvImportModal({
  item,
  onClose,
  onImport,
}: {
  item: NPSItem;
  onClose: () => void;
  onImport: (rows: NPSTransaction[]) => void;
}) {
  const [csvText, setCsvText] = useState("");
  const [previewRows, setPreviewRows] = useState<NPSTransaction[]>([]);
  const [error, setError] = useState("");

  const parseCSV = (text: string) => {
    setError("");
    setPreviewRows([]);
    try {
      const lines = text
        .trim()
        .split("\n")
        .filter((l) => l.trim() && !l.trim().startsWith("#"));
      if (!lines.length) throw new Error("No data rows found.");

      const rows: NPSTransaction[] = lines.map((line, i) => {
        const parts = line.split(",").map((p) => p.trim().replace(/^"|"$/g, ""));
        if (parts.length < 4) {
          throw new Error(`Row ${i + 1}: Expected date, particulars, uploaded_by, employee_amount[, employer_amount]`);
        }
        const [date, particulars, uploadedBy, empRaw, erRaw] = parts;
        if (!date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          throw new Error(`Row ${i + 1}: Date must be in YYYY-MM-DD format`);
        }
        const emp = Number(empRaw) || 0;
        const er = Number(erRaw || 0) || 0;
        if (emp < 0 || er < 0) throw new Error(`Row ${i + 1}: Amounts cannot be negative`);
        if (emp === 0 && er === 0) throw new Error(`Row ${i + 1}: At least one amount must be > 0`);

        return {
          id: `npstx-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          date,
          particulars,
          uploadedBy,
          employeeAmount: emp,
          employerAmount: er,
        };
      });

      setPreviewRows(rows);
    } catch (e: any) {
      setError(e.message || "CSV parse error");
    }
  };

  const handleFileUpload = (e: any) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setCsvText(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  return (
    <Modal title={`Import NPS Transactions CSV — PRAN ${item.pran || item.fundManager}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: THEME.muted }}>Upload statement or paste comma-separated entries</span>
          <button
            onClick={() => {
              const content =
                "# NPS Transaction Import Template\n# Format: date, particulars, uploaded_by, employee_amount, employer_amount\n2025-04-14,By Arrear - Regular Contribution for April,Kotak Mahindra Bank,0,4664.60\n2025-08-17,By Voluntary Contributions,eNPS Online,20000,0\n2026-01-13,For January 2026,Kotak Mahindra Bank,0,4664.60";
              const blob = new Blob([content], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "nps_transactions_template.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
          >
            Download CSV Template
          </button>
        </div>

        {/* File drop zone */}
        <label
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "20px 0",
            border: `1.5px dashed color-mix(in srgb, ${NPS_ORANGE} 40%, transparent)`,
            borderRadius: 10,
            cursor: "pointer",
            background: `color-mix(in srgb, ${NPS_ORANGE} 4%, transparent)`,
          }}
        >
          <Upload size={22} color={NPS_ORANGE} />
          <div style={{ fontSize: 13, fontWeight: 600, color: NPS_ORANGE }}>
            Click to browse or drop statement CSV
          </div>
          <input type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleFileUpload} />
        </label>

        {/* Text Area */}
        <textarea
          style={{
            ...inputStyle,
            minHeight: 80,
            fontFamily: "monospace",
            fontSize: 11,
          }}
          placeholder="2025-04-14, By Arrear Regular Contribution, Bank Name, 0, 4664.60"
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value);
            parseCSV(e.target.value);
          }}
        />

        {error && (
          <div style={{ padding: "8px 12px", borderRadius: 8, background: "color-mix(in srgb, var(--rust) 10%, transparent)", color: THEME.rust, fontSize: 12 }}>
            <AlertTriangle size={13} style={{ display: "inline", marginRight: 5 }} /> {error}
          </div>
        )}

        {previewRows.length > 0 && (
          <div style={{ fontSize: 12, fontWeight: 700, color: THEME.sage, display: "flex", alignItems: "center", gap: 5 }}>
            <CheckCircle2 size={13} color={THEME.sage} style={{ flexShrink: 0 }} />
            <span>{previewRows.length} transactions parsed and ready to import.</span>
          </div>
        )}
      </div>

      <ModalActions
        onSave={() => onImport(previewRows)}
        onClose={onClose}
        saveLabel={`Import ${previewRows.length} Transactions`}
        disabled={previewRows.length === 0}
      />
    </Modal>
  );
}
