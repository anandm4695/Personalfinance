import { useState, useMemo } from "react";
import {
  Repeat,
  TrendingUp,
  Activity,
  Calendar,
  Layers,
  ShieldCheck,
  BarChart3,
  Search,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Clock,
  Download,
  Copy,
  Check,
  Percent,
  IndianRupee,
  Sparkles,
  Calculator,
  Building,
  FileSpreadsheet,
  Zap,
  Target,
  CreditCard,
  CheckCircle2,
  ListOrdered,
  Receipt,
  ArrowUp,
  ArrowDown,
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
import { useMasterData } from "../../utils/masterData";
import { Money } from "../ui/Money";
import {
  fmtINRFull,
  rdMaturity,
  rdElapsed,
  today,
  monthsBetween,
  addMonthsToDateStr,
  exportArrayToCSV,
} from "../../utils/finance";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { StatCard } from "../ui/StatCard";
import { ConfirmDialog } from "../ui/Feedback";
import { BankLogo } from "../ui/BrandLogos";

export interface RDItem {
  id: string;
  bank: string;
  monthly: number | string;
  rate: number | string;
  tenureMonths: number | string;
  startDate: string;
  maturityDate?: string;
  rdNumber?: string;
  accountNumber?: string;
  bankAccountId?: string;
  linkedAccount?: string;
  paidInstallments?: number | string;
  owner?: string;
  debitDay?: number | string;
  compounding?: "quarterly" | "monthly" | "half_yearly" | "annual";
  goal?: string;
  nominee?: string;
  payoutAccount?: string;
  status?: "active" | "matured" | "closed";
  notes?: string;
}

interface RecurringDepositsSectionProps {
  items: any[];
  bankAccounts?: any[];
  transactions?: any[];
  removeItem: (key: string, id: string) => void;
  updateItem: (key: string, id: string, data: any) => void;
  addItem?: (key: string, data: any) => void;
  onAdd: () => void;
  showToast?: (msg: string, type?: any) => void;
  activeProfile?: string;
}

// Popular banks in India for recurring deposits
const POPULAR_BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "India Post",
  "Canara Bank",
  "Union Bank of India",
];

const GOAL_TAGS = [
  "Emergency Fund",
  "Vacation & Travel",
  "Child Education",
  "Down Payment",
  "Vehicle Purchase",
  "Tax Saving (80C)",
  "Wedding",
  "Wealth Accumulator",
  "General Savings",
];

export function RecurringDepositsSection({
  items = [],
  bankAccounts = [],
  transactions = [],
  removeItem,
  updateItem,
  addItem,
  onAdd,
  showToast,
  activeProfile = "all",
}: RecurringDepositsSectionProps) {
  const { familyProfiles } = useMasterData();

  // State Management
  const [viewMode, setViewMode] = useState<
    "cards" | "table" | "ladder" | "analytics" | "tax" | "calculator"
  >("cards");
  const [filterTab, setFilterTab] = useState<
    "all" | "active" | "due_soon" | "matured"
  >("all");
  const [bankFilter, setBankFilter] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<
    | "maturity_asc"
    | "maturity_desc"
    | "monthly_desc"
    | "rate_desc"
    | "bank_asc"
  >("maturity_asc");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [editRD, setEditRD] = useState<any>(null);
  const [confirmDeleteRD, setConfirmDeleteRD] = useState<any>(null);
  const [rolloverRD, setRolloverRD] = useState<any>(null);
  const [breakSimRD, setBreakSimRD] = useState<any>(null);
  const [payInstallmentRD, setPayInstallmentRD] = useState<any>(null);
  const [viewHistoryRD, setViewHistoryRD] = useState<any>(null);

  // RD Calculation helpers
  const rdElapsedFn = (r: any) => rdElapsed(r);

  const getMaturityDateStr = (r: any) => {
    if (r.maturityDate) return r.maturityDate;
    const tenure = Number(r.tenureMonths) || 0;
    if (r.startDate && tenure > 0) {
      return addMonthsToDateStr(r.startDate, tenure);
    }
    return null;
  };

  const isRDMatured = (r: any) => {
    const tenure = Number(r.tenureMonths) || 0;
    if (r.status === "matured") return true;
    return tenure > 0 && rdElapsedFn(r) >= tenure;
  };

  const rdDaysLeft = (r: any) => {
    const matStr = getMaturityDateStr(r);
    if (!matStr) return null;
    const [y, m, d] = String(matStr).split("-").map(Number);
    if (!y || !m || !d) return null;
    const matDate = new Date(y, m - 1, d);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.ceil((matDate.getTime() - now.getTime()) / 86400000);
  };

  const getAccruedValue = (r: any) => {
    const elapsed = rdElapsedFn(r);
    return rdMaturity(Number(r.monthly || 0), Number(r.rate || 0), elapsed);
  };

  const getFullMaturityValue = (r: any) => {
    const tenure = Number(r.tenureMonths) || 0;
    return rdMaturity(Number(r.monthly || 0), Number(r.rate || 0), tenure);
  };

  const getDepositedAmount = (r: any) => {
    const elapsed = rdElapsedFn(r);
    return (Number(r.monthly) || 0) * elapsed;
  };

  const getTotalPlannedDeposit = (r: any) => {
    const tenure = Number(r.tenureMonths) || 0;
    return (Number(r.monthly) || 0) * tenure;
  };

  // Filter items by profile if not 'all'
  const profileFilteredItems = useMemo(() => {
    if (!activeProfile || activeProfile === "all") return items;
    return items.filter((r) => !r.owner || r.owner === activeProfile);
  }, [items, activeProfile]);

  // Status groupings
  const maturedItems = useMemo(
    () => profileFilteredItems.filter(isRDMatured),
    [profileFilteredItems]
  );
  const activeItems = useMemo(
    () => profileFilteredItems.filter((r) => !isRDMatured(r)),
    [profileFilteredItems]
  );
  const dueSoonItems = useMemo(
    () =>
      activeItems.filter((r) => {
        const days = rdDaysLeft(r);
        return days !== null && days >= 0 && days <= 90;
      }),
    [activeItems]
  );

  // Executive KPI summary calculations
  const totalMonthlySIP = useMemo(
    () =>
      activeItems.reduce(
        (sum, r) => sum + (Number(r.monthly) || 0),
        0
      ),
    [activeItems]
  );

  const totalDeposited = useMemo(
    () =>
      profileFilteredItems.reduce(
        (sum, r) => sum + getDepositedAmount(r),
        0
      ),
    [profileFilteredItems]
  );

  const totalAccruedValue = useMemo(
    () =>
      profileFilteredItems.reduce(
        (sum, r) => sum + getAccruedValue(r),
        0
      ),
    [profileFilteredItems]
  );

  const totalProjectedMaturity = useMemo(
    () =>
      profileFilteredItems.reduce(
        (sum, r) => sum + (isRDMatured(r) ? getAccruedValue(r) : getFullMaturityValue(r)),
        0
      ),
    [profileFilteredItems]
  );

  const totalInterestGain = Math.max(0, totalAccruedValue - totalDeposited);
  const totalGainPct =
    totalDeposited > 0 ? (totalInterestGain / totalDeposited) * 100 : 0;

  // Weighted average interest yield
  const weightedRate = useMemo(() => {
    if (activeItems.length === 0) return 0;
    const totalWeight = activeItems.reduce(
      (s, r) => s + (Number(r.monthly) || 0) * (Number(r.tenureMonths) || 12),
      0
    );
    if (totalWeight === 0) return 0;
    const weightedSum = activeItems.reduce(
      (s, r) =>
        s +
        Number(r.rate || 0) *
          (Number(r.monthly) || 0) *
          (Number(r.tenureMonths) || 12),
      0
    );
    return weightedSum / totalWeight;
  }, [activeItems]);

  // Filtered & Sorted items
  const processedItems = useMemo(() => {
    let res = [...profileFilteredItems];

    // Status Tab filter
    if (filterTab === "active") {
      res = res.filter((r) => !isRDMatured(r));
    } else if (filterTab === "matured") {
      res = res.filter(isRDMatured);
    } else if (filterTab === "due_soon") {
      res = res.filter((r) => {
        if (isRDMatured(r)) return false;
        const d = rdDaysLeft(r);
        return d !== null && d >= 0 && d <= 90;
      });
    }

    // Bank filter
    if (bankFilter !== "all") {
      res = res.filter(
        (r) => (r.bank || "").toLowerCase() === bankFilter.toLowerCase()
      );
    }

    // Owner filter
    if (ownerFilter !== "all") {
      res = res.filter((r) => (r.owner || "self") === ownerFilter);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      res = res.filter(
        (r) =>
          (r.bank || "").toLowerCase().includes(q) ||
          (r.rdNumber || "").toLowerCase().includes(q) ||
          (r.accountNumber || "").toLowerCase().includes(q) ||
          (r.goal || "").toLowerCase().includes(q) ||
          (r.nominee || "").toLowerCase().includes(q)
      );
    }

    // Sorting
    res.sort((a, b) => {
      if (sortBy === "monthly_desc") {
        return (Number(b.monthly) || 0) - (Number(a.monthly) || 0);
      }
      if (sortBy === "rate_desc") {
        return (Number(b.rate) || 0) - (Number(a.rate) || 0);
      }
      if (sortBy === "bank_asc") {
        return (a.bank || "").localeCompare(b.bank || "");
      }
      if (sortBy === "maturity_desc") {
        const da = rdDaysLeft(a) ?? 999999;
        const db = rdDaysLeft(b) ?? 999999;
        return db - da;
      }
      // default: maturity_asc
      const da = rdDaysLeft(a) ?? 999999;
      const db = rdDaysLeft(b) ?? 999999;
      return da - db;
    });

    return res;
  }, [
    profileFilteredItems,
    filterTab,
    bankFilter,
    ownerFilter,
    searchQuery,
    sortBy,
  ]);

  // Unique banks list
  const uniqueBanks = useMemo(() => {
    const set = new Set<string>();
    profileFilteredItems.forEach((r) => {
      if (r.bank) set.add(r.bank);
    });
    return Array.from(set).sort();
  }, [profileFilteredItems]);

  // Handle Quick Copy
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText?.(text);
    setCopiedId(id);
    showToast?.(`Copied ${text} to clipboard`, "info");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Export CSV
  const handleExportCSV = () => {
    if (profileFilteredItems.length === 0) return;
    const exportData = profileFilteredItems.map((r) => {
      const elapsed = rdElapsedFn(r);
      const tenure = Number(r.tenureMonths) || 0;
      const deposited = getDepositedAmount(r);
      const accrued = getAccruedValue(r);
      const matValue = isRDMatured(r) ? accrued : getFullMaturityValue(r);
      const matDate = getMaturityDateStr(r);
      return {
        "Bank / Institution": r.bank || "Unknown",
        "RD / Account Number": r.rdNumber || r.accountNumber || "N/A",
        "Owner": r.owner || "self",
        "Monthly SIP (₹)": Number(r.monthly) || 0,
        "Interest Rate (% p.a.)": Number(r.rate) || 0,
        "Tenure (Months)": tenure,
        "Elapsed Installments": elapsed,
        "Start Date": r.startDate || "N/A",
        "Maturity Date": matDate || "N/A",
        "Total Deposited (₹)": deposited,
        "Current Accrued (₹)": Math.round(accrued),
        "Projected Maturity (₹)": Math.round(matValue),
        "Goal Tag": r.goal || "General",
        "Nominee": r.nominee || "Not Specified",
        "Status": isRDMatured(r) ? "Matured" : "Active",
      };
    });
    exportArrayToCSV(exportData, `Recurring_Deposits_Portfolio_${today()}.csv`);
    showToast?.("Exported Recurring Deposits to CSV", "success");
  };

  // Async edit action
  const { run: saveRDEdit, loading: savingRDEdit } = useAsyncAction(
    async (id: string, v: any) => {
      await updateItem("recurringDeposits", id, v);
    },
    {
      onSuccess: () => {
        setEditRD(null);
        showToast?.("Recurring deposit updated successfully", "success");
      },
      onError: (e: any) =>
        showToast?.(
          `Failed to save recurring deposit: ${e?.message || "Unknown error"}`,
          "error"
        ),
    }
  );

  // Async rollover / new RD action
  const { run: saveRDRollover, loading: savingRDRollover } = useAsyncAction(
    async (newRdData: any) => {
      if (addItem) {
        await addItem("recurringDeposits", newRdData);
      } else {
        showToast?.("Added rollover deposit", "success");
      }
    },
    {
      onSuccess: () => {
        setRolloverRD(null);
        showToast?.("Recurring deposit reinvested successfully!", "success");
      },
      onError: (e: any) =>
        showToast?.(
          `Failed to reinvest recurring deposit: ${e?.message || "Unknown error"}`,
          "error"
        ),
    }
  );

  // Async pay/record installment action
  const { run: handleRecordPayment, loading: recordingPayment } = useAsyncAction(
    async (payload: { rd: any; bankAccountId: string; debitBank: boolean; date: string }) => {
      const { rd, bankAccountId, debitBank, date } = payload;
      const currentPaid = Number(rd.paidInstallments) || rdElapsed(rd);
      const nextPaid = currentPaid + 1;
      const tenure = Number(rd.tenureMonths) || 12;
      const updatedRD = {
        ...rd,
        paidInstallments: nextPaid,
        bankAccountId: bankAccountId || rd.bankAccountId || "",
        linkedAccount: bankAccountId || rd.linkedAccount || "",
        status: nextPaid >= tenure ? "matured" : rd.status || "active",
      };
      await updateItem("recurringDeposits", rd.id, updatedRD);

      if (debitBank && bankAccountId && Number(rd.monthly) > 0) {
        const bank = bankAccounts.find((b: any) => b.id === bankAccountId);
        if (bank) {
          await updateItem("bankAccounts", bank.id, {
            ...bank,
            balance: Math.max(0, Number(bank.balance || 0) - Number(rd.monthly)),
          });
          if (addItem) {
            const noteText = `RD Installment #${nextPaid} - ${rd.bank}${rd.rdNumber ? ` (A/C: ${rd.rdNumber})` : ""}`;
            await addItem("transactions", {
              type: "debit",
              category: "Investments",
              note: noteText,
              narration: noteText,
              linked_type: "recurring_deposit",
              linked_id: rd.id,
              amount: Number(rd.monthly),
              date: date || today(),
              accountId: bank.id,
              owner: rd.owner || "self",
            });
          }
        }
      }
    },
    {
      onSuccess: () => {
        setPayInstallmentRD(null);
        showToast?.("RD installment payment recorded successfully!", "success");
      },
      onError: (e: any) =>
        showToast?.(`Failed to record payment: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  return (
    <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* ── Empty State ── */}
      {items.length === 0 ? (
        <Card
          style={{
            padding: "48px 24px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            background: "linear-gradient(180deg, rgba(14, 165, 233, 0.05) 0%, rgba(15, 23, 42, 0) 100%)",
            border: `1px dashed ${THEME.line}`,
            borderRadius: 16,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(56, 189, 248, 0.1) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
              color: THEME.cyan,
              boxShadow: "0 8px 24px rgba(14, 165, 233, 0.15)",
            }}
          >
            <Repeat size={36} />
          </div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: THEME.ink,
              marginBottom: 8,
              fontFamily: "var(--font-display)",
            }}
          >
            No Recurring Deposits Added Yet
          </h2>
          <p
            style={{
              fontSize: 14,
              color: THEME.muted,
              maxWidth: 520,
              lineHeight: 1.6,
              marginBottom: 24,
            }}
          >
            Automate your disciplined wealth-building. Track monthly RD installments, compound interest accruals, quarterly interest compounding, maturity ladders, and goal targets.
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            {[
              "Monthly SIP Discipline",
              "Quarterly Compounding",
              "Maturity Timeline Ladder",
              "DICGC Insurance Monitor",
              "Goal-based Tracking",
              "Section 194A TDS Tracker",
            ].map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: 12,
                  padding: "4px 12px",
                  borderRadius: 999,
                  background: "rgba(14, 165, 233, 0.08)",
                  color: THEME.cyan,
                  border: "1px solid rgba(14, 165, 233, 0.2)",
                  fontWeight: 600,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
          <Button
            variant="primary"
            size="lg"
            icon={<Plus size={18} />}
            onClick={onAdd}
            style={{
              background: "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)",
              boxShadow: "0 4px 16px rgba(14, 165, 233, 0.35)",
            }}
          >
            Add First Recurring Deposit
          </Button>
        </Card>
      ) : (
        <>
          {/* ── Executive KPI Summary Strip ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            <StatCard
              label="Monthly SIP Total"
              value={fmtINRFull(totalMonthlySIP)}
              numericValue={totalMonthlySIP}
              formatValue={fmtINRFull}
              icon={<Repeat size={20} />}
              color={THEME.cyan}
              subtext={`${activeItems.length} active RD${activeItems.length === 1 ? "" : "s"} ongoing`}
            />

            <StatCard
              label="Total Deposited"
              value={fmtINRFull(totalDeposited)}
              numericValue={totalDeposited}
              formatValue={fmtINRFull}
              icon={<IndianRupee size={20} />}
              color={THEME.accent}
              subtext={`Accumulated principal to date`}
            />

            <StatCard
              label="Current Accrued"
              value={fmtINRFull(totalAccruedValue)}
              numericValue={totalAccruedValue}
              formatValue={fmtINRFull}
              icon={<Activity size={20} />}
              color={THEME.sage}
              subtext={`+₹${Math.round(totalInterestGain).toLocaleString("en-IN")} interest earned`}
            />

            <StatCard
              label="Projected Maturity"
              value={fmtINRFull(totalProjectedMaturity)}
              numericValue={totalProjectedMaturity}
              formatValue={fmtINRFull}
              icon={<TrendingUp size={20} />}
              color="#8b5cf6"
              subtext={`Final receivable corpus`}
            />

            <StatCard
              label="Blended Yield (p.a.)"
              value={`${weightedRate.toFixed(2)}%`}
              numericValue={weightedRate}
              formatValue={(n) => `${n.toFixed(2)}%`}
              icon={<Percent size={20} />}
              color="#f59e0b"
              subtext={dueSoonItems.length > 0 ? `${dueSoonItems.length} maturing in 90d` : "Weighted average rate"}
            />
          </div>

          {/* ── Quick Notice Bar (Due Soon / Mature) ── */}
          {dueSoonItems.length > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 18px",
                borderRadius: 12,
                background: "linear-gradient(90deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                color: THEME.ink,
                fontSize: 13,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Clock size={18} style={{ color: "#f59e0b", flexShrink: 0 }} />
                <span>
                  <strong>{dueSoonItems.length} Recurring Deposit{dueSoonItems.length > 1 ? "s" : ""} maturing within 90 days!</strong> Review your reinvestment or payout plans.
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilterTab("due_soon");
                  setViewMode("cards");
                }}
                style={{ borderColor: "#f59e0b", color: "#f59e0b" }}
              >
                View Maturing RDs ({dueSoonItems.length})
              </Button>
            </div>
          )}

          {/* ── Top Navigation & View Switcher ── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              borderBottom: `1px solid ${THEME.line}`,
              paddingBottom: 12,
            }}
          >
            {/* View Mode Tabs */}
            <div
              style={{
                display: "flex",
                gap: 4,
                background: "rgba(255,255,255,0.03)",
                padding: 4,
                borderRadius: 10,
                border: `1px solid ${THEME.line}`,
                overflowX: "auto",
                maxWidth: "100%",
              }}
            >
              {[
                { id: "cards", label: "Visual Cards", icon: Layers },
                { id: "table", label: "Data Table", icon: FileSpreadsheet },
                { id: "ladder", label: "SIP & Maturity Ladder", icon: Calendar },
                { id: "analytics", label: "Bank & DICGC Risk", icon: ShieldCheck },
                { id: "tax", label: "Tax & TDS Hub", icon: Sparkles },
                { id: "calculator", label: "RD & Goal Calculator", icon: Calculator },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setViewMode(id as any)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 14px",
                    borderRadius: 8,
                    border: "none",
                    background:
                      viewMode === id
                        ? "linear-gradient(135deg, rgba(14, 165, 233, 0.2) 0%, rgba(14, 165, 233, 0.1) 100%)"
                        : "transparent",
                    color: viewMode === id ? THEME.cyan : THEME.muted,
                    fontWeight: viewMode === id ? 700 : 500,
                    fontSize: 13,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.15s ease",
                    borderBottom:
                      viewMode === id ? `2px solid ${THEME.cyan}` : "2px solid transparent",
                  }}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            {/* Quick Actions */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Button
                variant="outline"
                size="sm"
                icon={<Download size={14} />}
                onClick={handleExportCSV}
                title="Export Recurring Deposits to CSV"
              >
                Export CSV
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={onAdd}
                style={{
                  background: "linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)",
                }}
              >
                Add RD
              </Button>
            </div>
          </div>

          {/* ── Filters & Search Controls (for Cards, Table, Ladder) ── */}
          {(viewMode === "cards" || viewMode === "table" || viewMode === "ladder") && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--surface-0)",
                padding: "12px 16px",
                borderRadius: 12,
                border: `1px solid ${THEME.line}`,
              }}
            >
              {/* Status Tabs */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                {[
                  { id: "all", label: `All (${profileFilteredItems.length})` },
                  { id: "active", label: `Active (${activeItems.length})` },
                  { id: "due_soon", label: `Due in 90d (${dueSoonItems.length})` },
                  { id: "matured", label: `Matured (${maturedItems.length})` },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilterTab(id as any)}
                    className={`demat-portfolio-pill ${filterTab === id ? "active" : ""}`}
                    style={{
                      cursor: "pointer",
                      border: "none",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Bank, Owner, Sort & Search */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                {/* Search Bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "var(--surface-1)",
                    border: `1px solid ${THEME.line}`,
                    borderRadius: 8,
                    padding: "6px 10px",
                    width: 190,
                  }}
                >
                  <Search size={14} style={{ color: THEME.muted }} />
                  <input
                    type="text"
                    placeholder="Search RD, bank, goal..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: THEME.ink,
                      fontSize: 12,
                      width: "100%",
                      outline: "none",
                    }}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      style={{
                        background: "none",
                        border: "none",
                        color: THEME.muted,
                        cursor: "pointer",
                        padding: 0,
                        fontSize: 12,
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Bank Filter */}
                {uniqueBanks.length > 1 && (
                  <select
                    value={bankFilter}
                    onChange={(e) => setBankFilter(e.target.value)}
                    style={{
                      background: "var(--surface-1)",
                      border: `1px solid ${THEME.line}`,
                      color: THEME.ink,
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: 12,
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="all">All Banks</option>
                    {uniqueBanks.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                )}

                {/* Owner Filter */}
                {familyProfiles && familyProfiles.length > 1 && (
                  <select
                    value={ownerFilter}
                    onChange={(e) => setOwnerFilter(e.target.value)}
                    style={{
                      background: "var(--surface-1)",
                      border: `1px solid ${THEME.line}`,
                      color: THEME.ink,
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: 12,
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="all">All Members</option>
                    {familyProfiles.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* Sort By */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  style={{
                    background: "var(--surface-1)",
                    border: `1px solid ${THEME.line}`,
                    color: THEME.ink,
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: 12,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="maturity_asc">Matures Soonest</option>
                  <option value="maturity_desc">Matures Latest</option>
                  <option value="monthly_desc">Highest Monthly SIP</option>
                  <option value="rate_desc">Highest Interest Rate</option>
                  <option value="bank_asc">Bank Name (A-Z)</option>
                </select>
              </div>
            </div>
          )}

          {/* ── View 1: Visual Cards ── */}
          {viewMode === "cards" && (
            <div>
              {processedItems.length === 0 ? (
                <div
                  style={{
                    padding: 40,
                    textAlign: "center",
                    color: THEME.muted,
                    background: "rgba(255,255,255,0.02)",
                    borderRadius: 12,
                    border: `1px solid ${THEME.line}`,
                  }}
                >
                  <Search size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                  <p style={{ fontSize: 14, fontWeight: 600 }}>
                    No recurring deposits match your filter criteria.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFilterTab("all");
                      setBankFilter("all");
                      setOwnerFilter("all");
                      setSearchQuery("");
                    }}
                    style={{ marginTop: 12 }}
                  >
                    Reset All Filters
                  </Button>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: 16,
                  }}
                >
                  {processedItems.map((r: any) => {
                    const tenure = Number(r.tenureMonths) || 0;
                    const elapsed = rdElapsedFn(r);
                    const isFullyPaid = tenure > 0 && elapsed >= tenure;
                    const matured = isRDMatured(r);
                    const deposited = getDepositedAmount(r);
                    const accrued = getAccruedValue(r);
                    const fullMaturity = getFullMaturityValue(r);
                    const gain = Math.max(0, accrued - deposited);
                    const progressPct =
                      tenure > 0
                        ? Math.min(100, (elapsed / tenure) * 100)
                        : 0;
                    const daysLeft = rdDaysLeft(r);
                    const matDateStr = getMaturityDateStr(r);

                    return (
                      <Card
                        key={r.id}
                        style={{
                          padding: 20,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          borderTop: `4px solid ${
                            isFullyPaid ? THEME.sage : THEME.cyan
                          }`,
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%)",
                          position: "relative",
                          transition: "transform 0.15s ease, box-shadow 0.15s ease",
                        }}
                      >
                        {/* Header: Bank Logo + Badge + Actions */}
                        <div>
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
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <BankLogo
                                name={r.bank || "Bank"}
                                size={38}
                                accentColor={isFullyPaid ? THEME.sage : THEME.cyan}
                              />
                              <div>
                                <div
                                  style={{
                                    fontSize: 15,
                                    fontWeight: 700,
                                    color: THEME.ink,
                                    lineHeight: 1.2,
                                  }}
                                >
                                  {r.bank || "Recurring Deposit"}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: THEME.muted,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    marginTop: 2,
                                  }}
                                >
                                  {r.rdNumber || r.accountNumber ? (
                                    <span
                                      onClick={() =>
                                        handleCopy(
                                          r.rdNumber || r.accountNumber,
                                          `acc-${r.id}`
                                        )
                                      }
                                      style={{
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: 3,
                                      }}
                                      title="Click to copy account number"
                                    >
                                      A/C: {r.rdNumber || r.accountNumber}
                                      {copiedId === `acc-${r.id}` ? (
                                        <Check size={11} color={THEME.sage} />
                                      ) : (
                                        <Copy size={11} color={THEME.muted} />
                                      )}
                                    </span>
                                  ) : (
                                    <span>RD Account</span>
                                  )}
                                  {r.owner && (
                                    <span>
                                      •{" "}
                                      {familyProfiles?.find(
                                        (p: any) => p.id === r.owner
                                      )?.name || r.owner}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: "flex", gap: 4 }}>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<Pencil size={13} />}
                                onClick={() => setEditRD(r)}
                                aria-label={`Edit ${r.bank} RD`}
                                title="Edit Recurring Deposit"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<Trash2 size={13} />}
                                style={{ color: THEME.rust }}
                                onClick={() => setConfirmDeleteRD(r)}
                                aria-label={`Delete ${r.bank} RD`}
                                title="Delete Recurring Deposit"
                              />
                            </div>
                          </div>

                          {/* Goal and Tag Badges */}
                          <div
                            style={{
                              display: "flex",
                              gap: 6,
                              flexWrap: "wrap",
                              marginBottom: 14,
                            }}
                          >
                            {isFullyPaid || matured ? (
                              <Badge variant="sage">Matured</Badge>
                            ) : daysLeft !== null && daysLeft <= 0 ? (
                              <Badge variant="gold">
                                Tenure Ended ({elapsed}/{tenure})
                              </Badge>
                            ) : daysLeft !== null && daysLeft <= 30 ? (
                              <Badge variant="rust">
                                Matures in {daysLeft}d
                              </Badge>
                            ) : daysLeft !== null && daysLeft <= 90 ? (
                              <Badge variant="gold">
                                Matures in {Math.ceil(daysLeft / 30)}m
                              </Badge>
                            ) : (
                              <Badge variant="cyan">Active SIP</Badge>
                            )}

                            {r.goal && (
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: "2px 8px",
                                  borderRadius: 6,
                                  background: "rgba(139, 92, 246, 0.12)",
                                  color: "#a78bfa",
                                  fontWeight: 600,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <Target size={10} />
                                {r.goal}
                              </span>
                            )}

                            {r.nominee ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: "2px 8px",
                                  borderRadius: 6,
                                  background: "rgba(16, 185, 129, 0.1)",
                                  color: THEME.sage,
                                  fontWeight: 500,
                                }}
                                title={`Nominee: ${r.nominee}`}
                              >
                                Nominee: {r.nominee}
                              </span>
                            ) : (
                              <span
                                style={{
                                  fontSize: 10,
                                  padding: "2px 8px",
                                  borderRadius: 6,
                                  background: "rgba(239, 68, 68, 0.1)",
                                  color: THEME.rust,
                                  fontWeight: 500,
                                }}
                                title="No nominee registered"
                              >
                                No Nominee
                              </span>
                            )}

                            {(r.bankAccountId || r.linkedAccount) && (() => {
                              const linkedBank = bankAccounts.find(
                                (b: any) => b.id === (r.bankAccountId || r.linkedAccount)
                              );
                              return linkedBank ? (
                                <span
                                  style={{
                                    fontSize: 10,
                                    padding: "2px 8px",
                                    borderRadius: 6,
                                    background: "rgba(14, 165, 233, 0.1)",
                                    color: THEME.cyan,
                                    fontWeight: 600,
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                  }}
                                  title={`Debited from: ${linkedBank.bankName} (••${linkedBank.accountNumber?.slice(-4) || "NA"})`}
                                >
                                  <Building size={10} />
                                  {linkedBank.bankName} ••{linkedBank.accountNumber?.slice(-4) || "NA"}
                                </span>
                              ) : null;
                            })()}
                          </div>

                          {/* Monthly Installment Amount */}
                          <div style={{ marginBottom: 12 }}>
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: THEME.muted,
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                                marginBottom: 2,
                              }}
                            >
                              Monthly Installment
                            </div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "baseline",
                                gap: 6,
                              }}
                            >
                              <div
                                style={{
                                  fontFamily: "var(--font-display)",
                                  fontSize: 26,
                                  fontWeight: 800,
                                  color: isFullyPaid ? THEME.muted : THEME.cyan,
                                  letterSpacing: "-0.02em",
                                }}
                              >
                                <Money
                                  value={Number(r.monthly) || 0}
                                  variant="full"
                                />
                              </div>
                              <span
                                style={{
                                  fontSize: 13,
                                  color: THEME.muted,
                                  fontWeight: 500,
                                }}
                              >
                                / month @ {r.rate}% p.a.
                              </span>
                            </div>
                            {r.debitDay && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: THEME.muted,
                                  marginTop: 2,
                                }}
                              >
                                Auto-debit date:{" "}
                                <strong>{r.debitDay}th of every month</strong>
                              </div>
                            )}
                          </div>

                          {/* Progress Tracker (Installments Paid) */}
                          <div style={{ marginBottom: 16 }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 11,
                                color: THEME.muted,
                                marginBottom: 6,
                              }}
                            >
                              <span>
                                {isFullyPaid
                                  ? `All ${tenure} installments paid`
                                  : `${elapsed} of ${tenure} installments paid`}
                              </span>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: isFullyPaid ? THEME.sage : THEME.cyan,
                                }}
                              >
                                {progressPct.toFixed(0)}%
                              </span>
                            </div>
                            <div
                              style={{
                                height: 6,
                                borderRadius: 4,
                                background: "rgba(255,255,255,0.08)",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${progressPct}%`,
                                  height: "100%",
                                  borderRadius: 4,
                                  background: isFullyPaid
                                    ? "linear-gradient(90deg, #10b981 0%, #34d399 100%)"
                                    : "linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)",
                                  transition: "width 0.3s ease",
                                }}
                              />
                            </div>
                          </div>

                          {/* Financial Metric Grid: Deposited vs Accrued vs Maturity */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "1fr 1fr",
                              gap: 10,
                              background: "var(--surface-1)",
                              border: `1px solid ${THEME.line}`,
                              padding: "12px",
                              borderRadius: 10,
                              marginBottom: 14,
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: THEME.muted,
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                }}
                              >
                                Deposited to Date
                              </div>
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 800,
                                  color: THEME.accent,
                                  fontFamily: "var(--font-display)",
                                  marginTop: 2,
                                }}
                              >
                                <Money value={deposited} variant="full" />
                              </div>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: THEME.sage,
                                  marginTop: 2,
                                }}
                              >
                                +
                                <Money value={gain} variant="full" /> interest
                              </div>
                            </div>

                            <div>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: THEME.muted,
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                }}
                              >
                                {isFullyPaid ? "Final Payout" : "Projected Maturity"}
                              </div>
                              <div
                                style={{
                                  fontSize: 14,
                                  fontWeight: 800,
                                  color: isFullyPaid ? THEME.sage : THEME.accent,
                                  fontFamily: "var(--font-display)",
                                  marginTop: 2,
                                }}
                              >
                                <Money
                                  value={isFullyPaid ? accrued : fullMaturity}
                                  variant="full"
                                />
                              </div>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: THEME.muted,
                                  marginTop: 2,
                                }}
                              >
                                {matDateStr ? `Mat: ${matDateStr}` : `${tenure}m tenure`}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Bottom Quick Actions */}
                        <div
                          style={{
                            borderTop: `1px solid ${THEME.line}`,
                            paddingTop: 12,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<ListOrdered size={12} />}
                              onClick={() => setViewHistoryRD(r)}
                              style={{ fontSize: 11, padding: "4px 8px" }}
                              title="View all paid & upcoming installments schedule"
                            >
                              Installments
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Zap size={12} />}
                              onClick={() => setBreakSimRD(r)}
                              style={{ fontSize: 11, padding: "4px 8px" }}
                              title="Simulate premature withdrawal & penal rates"
                            >
                              Break Sim
                            </Button>
                            {!isFullyPaid && elapsed < tenure && (
                              <Button
                                variant="outline"
                                size="sm"
                                icon={<CreditCard size={12} />}
                                onClick={() => setPayInstallmentRD(r)}
                                style={{
                                  fontSize: 11,
                                  padding: "4px 10px",
                                  color: THEME.cyan,
                                  borderColor: "rgba(14, 165, 233, 0.4)",
                                  background: "rgba(14, 165, 233, 0.08)",
                                }}
                                title={`Pay monthly installment #${elapsed + 1} of ${tenure}`}
                              >
                                Pay Installment
                              </Button>
                            )}
                          </div>

                          {isFullyPaid || matured ? (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<RefreshCw size={12} />}
                              onClick={() => setRolloverRD(r)}
                              style={{
                                fontSize: 11,
                                padding: "4px 10px",
                                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                              }}
                              title="Reinvest matured deposit into a new RD or FD"
                            >
                              Reinvest / Rollover
                            </Button>
                          ) : (
                            <div
                              style={{
                                fontSize: 11,
                                color: THEME.muted,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Clock size={12} />
                              {daysLeft !== null && daysLeft > 0
                                ? `${daysLeft}d left`
                                : "Active"}
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── View 2: Data Table ── */}
          {viewMode === "table" && (
            <Card style={{ padding: 0, overflow: "hidden", borderRadius: 12 }}>
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    textAlign: "left",
                    fontSize: 13,
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        borderBottom: `1px solid ${THEME.line}`,
                        color: THEME.muted,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      <th style={{ padding: "14px 16px" }}>Bank & Account</th>
                      <th style={{ padding: "14px 12px" }}>Owner</th>
                      <th style={{ padding: "14px 12px" }}>Monthly SIP</th>
                      <th style={{ padding: "14px 12px" }}>Rate (% p.a.)</th>
                      <th style={{ padding: "14px 12px" }}>Progress / Tenure</th>
                      <th style={{ padding: "14px 12px" }}>Deposited</th>
                      <th style={{ padding: "14px 12px" }}>Current Accrued</th>
                      <th style={{ padding: "14px 12px" }}>Projected Maturity</th>
                      <th style={{ padding: "14px 12px" }}>Maturity Date</th>
                      <th style={{ padding: "14px 12px" }}>Status</th>
                      <th style={{ padding: "14px 16px", textAlign: "right" }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedItems.map((r: any, idx: number) => {
                      const tenure = Number(r.tenureMonths) || 0;
                      const elapsed = rdElapsedFn(r);
                      const isFullyPaid = tenure > 0 && elapsed >= tenure;
                      const matured = isRDMatured(r);
                      const deposited = getDepositedAmount(r);
                      const accrued = getAccruedValue(r);
                      const matVal = isFullyPaid ? accrued : getFullMaturityValue(r);
                      const matDate = getMaturityDateStr(r);
                      const daysLeft = rdDaysLeft(r);

                      return (
                        <tr
                          key={r.id}
                          style={{
                            borderBottom: `1px solid ${THEME.line}`,
                            background:
                              idx % 2 === 0
                                ? "transparent"
                                : "rgba(255,255,255,0.01)",
                            transition: "background 0.15s ease",
                          }}
                        >
                          <td style={{ padding: "12px 16px" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <BankLogo name={r.bank} size={28} />
                              <div>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    color: THEME.ink,
                                  }}
                                >
                                  {r.bank}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: THEME.muted,
                                    display: "flex",
                                    gap: 6,
                                    flexWrap: "wrap",
                                    alignItems: "center",
                                    marginTop: 2,
                                  }}
                                >
                                  <span>{r.rdNumber || r.accountNumber || "RD"}</span>
                                  {r.goal && <span>• {r.goal}</span>}
                                  {(r.bankAccountId || r.linkedAccount) && (() => {
                                    const linkedBank = bankAccounts.find(
                                      (b: any) => b.id === (r.bankAccountId || r.linkedAccount)
                                    );
                                    return linkedBank ? (
                                      <span
                                        style={{
                                          color: THEME.cyan,
                                          background: "rgba(14, 165, 233, 0.08)",
                                          padding: "1px 6px",
                                          borderRadius: 4,
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 3,
                                          fontSize: 10,
                                          fontWeight: 600,
                                        }}
                                      >
                                        <Building size={9} />
                                        {linkedBank.bankName} ••{linkedBank.accountNumber?.slice(-4) || "NA"}
                                      </span>
                                    ) : null;
                                  })()}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: "12px 12px", color: THEME.ink }}>
                            {familyProfiles?.find((p: any) => p.id === r.owner)
                              ?.name ||
                              r.owner ||
                              "Self"}
                          </td>

                          <td
                            style={{
                              padding: "12px 12px",
                              fontWeight: 700,
                              color: THEME.cyan,
                              fontFamily: "var(--font-display)",
                            }}
                          >
                            <Money
                              value={Number(r.monthly) || 0}
                              variant="full"
                            />
                            <span style={{ fontSize: 10, color: THEME.muted }}>
                              /mo
                            </span>
                          </td>

                          <td
                            style={{
                              padding: "12px 12px",
                              fontWeight: 600,
                              color: THEME.ink,
                            }}
                          >
                            {r.rate}%
                          </td>

                          <td style={{ padding: "12px 12px" }}>
                            <div
                              style={{
                                fontSize: 12,
                                color: THEME.ink,
                                fontWeight: 500,
                              }}
                            >
                              {elapsed} / {tenure} mos
                            </div>
                            <div
                              style={{
                                height: 4,
                                width: 80,
                                background: "rgba(255,255,255,0.1)",
                                borderRadius: 2,
                                marginTop: 4,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${
                                    tenure > 0
                                      ? Math.min(100, (elapsed / tenure) * 100)
                                      : 0
                                  }%`,
                                  height: "100%",
                                  background: isFullyPaid
                                    ? THEME.sage
                                    : THEME.cyan,
                                }}
                              />
                            </div>
                          </td>

                          <td
                            style={{
                              padding: "12px 12px",
                              fontWeight: 600,
                              color: THEME.accent,
                              fontFamily: "var(--font-display)",
                            }}
                          >
                            <Money value={deposited} variant="full" />
                          </td>

                          <td
                            style={{
                              padding: "12px 12px",
                              fontWeight: 700,
                              color: THEME.sage,
                              fontFamily: "var(--font-display)",
                            }}
                          >
                            <Money value={accrued} variant="full" />
                          </td>

                          <td
                            style={{
                              padding: "12px 12px",
                              fontWeight: 700,
                              color: "#a78bfa",
                              fontFamily: "var(--font-display)",
                            }}
                          >
                            <Money value={matVal} variant="full" />
                          </td>

                          <td
                            style={{
                              padding: "12px 12px",
                              fontSize: 12,
                              color: THEME.muted,
                            }}
                          >
                            {matDate || "—"}
                          </td>

                          <td style={{ padding: "12px 12px" }}>
                            {isFullyPaid || matured ? (
                              <Badge variant="sage">Matured</Badge>
                            ) : daysLeft !== null && daysLeft <= 0 ? (
                              <Badge variant="gold">
                                Tenure Ended ({elapsed}/{tenure})
                              </Badge>
                            ) : daysLeft !== null && daysLeft <= 90 ? (
                              <Badge variant="gold">
                                {daysLeft}d left
                              </Badge>
                            ) : (
                              <Badge variant="cyan">Active</Badge>
                            )}
                          </td>

                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "right",
                            }}
                          >
                            <div
                              style={{
                                display: "inline-flex",
                                gap: 4,
                              }}
                            >
                              {!isFullyPaid && elapsed < tenure && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  icon={<CreditCard size={13} />}
                                  onClick={() => setPayInstallmentRD(r)}
                                  title={`Pay installment #${elapsed + 1}`}
                                  style={{ color: THEME.cyan }}
                                />
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<ListOrdered size={13} />}
                                onClick={() => setViewHistoryRD(r)}
                                title="View Installment Ledger & Payments"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<Pencil size={13} />}
                                onClick={() => setEditRD(r)}
                                title="Edit"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<Zap size={13} />}
                                onClick={() => setBreakSimRD(r)}
                                title="Premature Simulator"
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                icon={<Trash2 size={13} />}
                                style={{ color: THEME.rust }}
                                onClick={() => setConfirmDeleteRD(r)}
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

          {/* ── View 3: SIP & Maturity Ladder ── */}
          {viewMode === "ladder" && (
            <RDMaturityLadderView
              items={profileFilteredItems}
              onEditRD={setEditRD}
              onRollover={setRolloverRD}
            />
          )}

          {/* ── View 4: Bank & DICGC Risk Analytics ── */}
          {viewMode === "analytics" && (
            <RDBankConcentrationView items={profileFilteredItems} />
          )}

          {/* ── View 5: Tax & TDS Hub ── */}
          {viewMode === "tax" && (
            <RDTdsTaxOptimizerView items={profileFilteredItems} />
          )}

          {/* ── View 6: Interactive RD & Goal Calculator ── */}
          {viewMode === "calculator" && (
            <InteractiveRDCalculator onApplyScenario={(sc) => onAdd()} />
          )}
        </>
      )}

      {/* ── Modal: Pay Installment ── */}
      {payInstallmentRD && (
        <PayInstallmentModal
          rd={payInstallmentRD}
          bankAccounts={bankAccounts}
          onClose={() => setPayInstallmentRD(null)}
          onConfirm={(data) => handleRecordPayment({ rd: payInstallmentRD, ...data })}
          loading={recordingPayment}
        />
      )}

      {/* ── Modal: Installments History & Ledger ── */}
      {viewHistoryRD && (
        <RDHistoryModal
          rd={viewHistoryRD}
          bankAccounts={bankAccounts}
          transactions={transactions}
          onClose={() => setViewHistoryRD(null)}
          onPayNext={() => {
            const targetRD = viewHistoryRD;
            setViewHistoryRD(null);
            setPayInstallmentRD(targetRD);
          }}
        />
      )}

      {/* ── Modal: Edit RD ── */}
      {editRD && (
        <EditRDModal
          rd={editRD}
          bankAccounts={bankAccounts}
          familyProfiles={familyProfiles}
          onClose={() => setEditRD(null)}
          onSave={(updated: any) => saveRDEdit(editRD.id, updated)}
          saving={savingRDEdit}
        />
      )}

      {/* ── Modal: Delete Confirmation ── */}
      {confirmDeleteRD && (
        <ConfirmDialog
          message={`Delete ${confirmDeleteRD.bank || "this"} recurring deposit? This cannot be undone.`}
          onConfirm={() => {
            removeItem("recurringDeposits", confirmDeleteRD.id);
            setConfirmDeleteRD(null);
            showToast?.("Recurring deposit removed", "info");
          }}
          onCancel={() => setConfirmDeleteRD(null)}
        />
      )}

      {/* ── Modal: Premature Break / Penalty Simulator ── */}
      {breakSimRD && (
        <PrematureBreakModal
          rd={breakSimRD}
          onClose={() => setBreakSimRD(null)}
        />
      )}

      {/* ── Modal: Rollover / Reinvestment Wizard ── */}
      {rolloverRD && (
        <RDRolloverModal
          rd={rolloverRD}
          onClose={() => setRolloverRD(null)}
          onSave={saveRDRollover}
          saving={savingRDRollover}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   VIEW: SIP & Maturity Ladder Timeline
   ══════════════════════════════════════════════════════════════════════════════ */
function RDMaturityLadderView({
  items,
  onEditRD,
  onRollover,
}: {
  items: any[];
  onEditRD: (r: any) => void;
  onRollover: (r: any) => void;
}) {
  // Group maturities by Year & Quarter
  const maturityBuckets = useMemo(() => {
    const buckets: { [key: string]: { year: number; quarter: string; items: any[]; totalMaturity: number; totalDeposited: number } } = {};

    items.forEach((r) => {
      const tenure = Number(r.tenureMonths) || 0;
      const matDateStr =
        r.maturityDate ||
        (r.startDate && tenure > 0 ? addMonthsToDateStr(r.startDate, tenure) : null);
      if (!matDateStr) return;

      const [y, m] = matDateStr.split("-").map(Number);
      if (!y || !m) return;

      const q = `Q${Math.ceil(m / 3)}`;
      const key = `${y}-${q}`;
      const matVal = rdMaturity(Number(r.monthly || 0), Number(r.rate || 0), tenure);
      const deposited = (Number(r.monthly) || 0) * tenure;

      if (!buckets[key]) {
        buckets[key] = {
          year: y,
          quarter: q,
          items: [],
          totalMaturity: 0,
          totalDeposited: 0,
        };
      }
      buckets[key].items.push(r);
      buckets[key].totalMaturity += matVal;
      buckets[key].totalDeposited += deposited;
    });

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, val]) => ({ key, ...val }));
  }, [items]);

  // Monthly SIP Outlay by Bank
  const monthlySipByBank = useMemo(() => {
    const map: { [bank: string]: number } = {};
    items.forEach((r) => {
      const tenure = Number(r.tenureMonths) || 0;
      const elapsed = r.startDate ? Math.max(0, monthsBetween(r.startDate, today())) : 0;
      if (elapsed < tenure) {
        const b = r.bank || "Other";
        map[b] = (map[b] || 0) + (Number(r.monthly) || 0);
      }
    });
    return Object.entries(map).map(([bank, monthly]) => ({ bank, monthly }));
  }, [items]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header Explainer */}
      <Card
        style={{
          padding: "16px 20px",
          background: "linear-gradient(135deg, rgba(14, 165, 233, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%)",
          border: `1px solid rgba(14, 165, 233, 0.2)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Calendar size={24} style={{ color: THEME.cyan }} />
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: THEME.ink, margin: 0 }}>
              Recurring Deposit Maturity & Cash-Flow Ladder
            </h3>
            <p style={{ fontSize: 13, color: THEME.muted, margin: "4px 0 0 0" }}>
              Visualize when your recurring deposit installments finish and when lump-sum maturity proceeds credit into your bank account.
            </p>
          </div>
        </div>
      </Card>

      {/* Chart: Maturity Inflows by Quarter */}
      {maturityBuckets.length > 0 && (
        <Card style={{ padding: 20 }}>
          <h4
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: THEME.ink,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <BarChart3 size={16} color={THEME.cyan} />
            Quarterly Maturity Payout Schedule (₹)
          </h4>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={maturityBuckets} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                <XAxis dataKey="key" stroke={THEME.muted} fontSize={12} tickLine={false} />
                <YAxis
                  stroke={THEME.muted}
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: any) => [`₹${Math.round(Number(val)).toLocaleString("en-IN")}`, "Maturity Inflow"]}
                  contentStyle={{
                    background: "rgba(15, 23, 42, 0.95)",
                    border: `1px solid ${THEME.line}`,
                    borderRadius: 8,
                    color: THEME.ink,
                  }}
                />
                <Bar dataKey="totalMaturity" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="Maturity Payout" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Ladder Timeline Cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {maturityBuckets.length === 0 ? (
          <div style={{ textAlign: "center", padding: 30, color: THEME.muted }}>
            No maturity date information available.
          </div>
        ) : (
          maturityBuckets.map((b) => (
            <Card key={b.key} style={{ padding: 18 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: `1px solid ${THEME.line}`,
                  paddingBottom: 10,
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Badge variant="cyan">{b.key}</Badge>
                  <span style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>
                    {b.items.length} Deposit{b.items.length > 1 ? "s" : ""} maturing
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase" }}>
                    Total Receivable Inflow
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 16,
                      fontWeight: 800,
                      color: THEME.sage,
                    }}
                  >
                    <Money value={b.totalMaturity} variant="full" />
                  </div>
                </div>
              </div>

              {/* Items under this quarter */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
                {b.items.map((r: any) => {
                  const tenure = Number(r.tenureMonths) || 0;
                  const matVal = rdMaturity(Number(r.monthly || 0), Number(r.rate || 0), tenure);
                  return (
                    <div
                      key={r.id}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.02)",
                        border: `1px solid ${THEME.line}`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <BankLogo name={r.bank} size={28} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                            {r.bank}
                          </div>
                          <div style={{ fontSize: 11, color: THEME.muted }}>
                            ₹{Number(r.monthly).toLocaleString("en-IN")}/mo · {r.rate}%
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: THEME.sage,
                            fontFamily: "var(--font-display)",
                          }}
                        >
                          <Money value={matVal} variant="full" />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<RefreshCw size={11} />}
                          onClick={() => onRollover(r)}
                          style={{ fontSize: 10, padding: "2px 6px" }}
                        >
                          Reinvest
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   VIEW: Bank Concentration & DICGC Safety Monitor
   ══════════════════════════════════════════════════════════════════════════════ */
function RDBankConcentrationView({ items }: { items: any[] }) {
  const DICGC_LIMIT = 500000; // ₹5 Lakhs insurance limit per bank

  const bankStats = useMemo(() => {
    const map: { [bank: string]: { bank: string; count: number; totalDeposited: number; totalAccrued: number; totalMonthly: number } } = {};

    items.forEach((r) => {
      const b = r.bank || "Unknown Bank";
      const tenure = Number(r.tenureMonths) || 0;
      const elapsed = r.startDate
        ? Math.min(tenure, Math.max(0, monthsBetween(r.startDate, today())))
        : tenure;
      const deposited = (Number(r.monthly) || 0) * elapsed;
      const accrued = rdMaturity(Number(r.monthly || 0), Number(r.rate || 0), elapsed);

      if (!map[b]) {
        map[b] = {
          bank: b,
          count: 0,
          totalDeposited: 0,
          totalAccrued: 0,
          totalMonthly: 0,
        };
      }
      map[b].count += 1;
      map[b].totalDeposited += deposited;
      map[b].totalAccrued += accrued;
      map[b].totalMonthly += Number(r.monthly) || 0;
    });

    return Object.values(map).sort((a, b) => b.totalAccrued - a.totalAccrued);
  }, [items]);

  const COLORS = ["#0ea5e9", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899", "#3b82f6", "#14b8a6", "#64748b"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* DICGC Explainer Banner */}
      <Card
        style={{
          padding: "16px 20px",
          background: "linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(14, 165, 233, 0.05) 100%)",
          border: `1px solid rgba(16, 185, 129, 0.25)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <ShieldCheck size={28} style={{ color: THEME.sage, flexShrink: 0, marginTop: 2 }} />
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: THEME.ink, margin: 0 }}>
              DICGC ₹5,00,000 Deposit Insurance Safety Monitor
            </h3>
            <p style={{ fontSize: 13, color: THEME.muted, margin: "4px 0 0 0", lineHeight: 1.5 }}>
              Under RBI's <strong>Deposit Insurance and Credit Guarantee Corporation (DICGC)</strong>, cumulative deposits (Savings + FD + RD) up to <strong>₹5,00,000 (Principal + Interest)</strong> per depositor per bank are 100% insured against bank liquidation.
            </p>
          </div>
        </div>
      </Card>

      {/* Grid: Pie Chart + Bank Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        {/* Pie Chart */}
        <Card style={{ padding: 20 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: THEME.ink, marginBottom: 16 }}>
            Bank-Wise Allocation
          </h4>
          <div style={{ width: "100%", height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={bankStats}
                  dataKey="totalAccrued"
                  nameKey="bank"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={50}
                  paddingAngle={3}
                >
                  {bankStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`₹${Math.round(Number(val)).toLocaleString("en-IN")}`, "Accrued Value"]}
                  contentStyle={{
                    background: "rgba(15, 23, 42, 0.95)",
                    border: `1px solid ${THEME.line}`,
                    borderRadius: 8,
                    color: THEME.ink,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Bank Insurance Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {bankStats.map((b, idx) => {
            const isSafe = b.totalAccrued <= DICGC_LIMIT;
            const pctCovered = Math.min(100, (b.totalAccrued / DICGC_LIMIT) * 100);

            return (
              <Card key={b.bank} style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <BankLogo name={b.bank} size={28} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>{b.bank}</div>
                      <div style={{ fontSize: 11, color: THEME.muted }}>{b.count} RD account{b.count > 1 ? "s" : ""}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink, fontFamily: "var(--font-display)" }}>
                      <Money value={b.totalAccrued} variant="full" />
                    </div>
                    {isSafe ? (
                      <span style={{ fontSize: 10, color: THEME.sage, fontWeight: 600 }}>100% Insured</span>
                    ) : (
                      <span style={{ fontSize: 10, color: THEME.rust, fontWeight: 600 }}>
                        Exceeds INR 5L limit by INR {Math.round(b.totalAccrued - DICGC_LIMIT).toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>

                {/* DICGC Progress bar */}
                <div style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${pctCovered}%`,
                      height: "100%",
                      background: isSafe ? THEME.sage : THEME.rust,
                    }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   VIEW: Tax & TDS Intelligence Hub
   ══════════════════════════════════════════════════════════════════════════════ */
function RDTdsTaxOptimizerView({ items }: { items: any[] }) {
  const TDS_THRESHOLD_REGULAR = 40000;
  const TDS_THRESHOLD_SENIOR = 50000;

  // Annual interest calculation
  const totalAnnualInterest = useMemo(() => {
    return items.reduce((sum, r) => {
      const tenure = Number(r.tenureMonths) || 0;
      const elapsed = r.startDate
        ? Math.min(tenure, Math.max(0, monthsBetween(r.startDate, today())))
        : tenure;
      if (elapsed >= tenure) return sum; // Matured
      const monthly = Number(r.monthly) || 0;
      const rate = Number(r.rate) || 0;
      // Approximate annual interest from current cumulative corpus
      const currentCorpus = rdMaturity(monthly, rate, elapsed);
      return sum + (currentCorpus * rate) / 100;
    }, 0);
  }, [items]);

  const tdsApplicable = totalAnnualInterest > TDS_THRESHOLD_REGULAR;
  const estimatedTDS = tdsApplicable ? totalAnnualInterest * 0.1 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* TDS Overview Card */}
      <Card
        style={{
          padding: "20px",
          background: "linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(14, 165, 233, 0.04) 100%)",
          border: `1px solid rgba(245, 158, 11, 0.25)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <Sparkles size={28} style={{ color: "#f59e0b", flexShrink: 0 }} />
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: THEME.ink, margin: 0 }}>
              Section 194A TDS & Income Tax Rules for Recurring Deposits
            </h3>
            <p style={{ fontSize: 13, color: THEME.muted, margin: "6px 0 14px 0", lineHeight: 1.5 }}>
              Under Section 194A, banks deduct <strong>10% TDS</strong> if total interest from Fixed + Recurring Deposits across all branches of a single bank exceeds <strong>₹40,000/year</strong> (₹50,000 for senior citizens).
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <div style={{ padding: 12, background: "var(--surface-1)", border: `1px solid ${THEME.line}`, borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: THEME.muted }}>Projected Annual Interest</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, fontFamily: "var(--font-display)" }}>
                  <Money value={totalAnnualInterest} variant="full" />
                </div>
              </div>

              <div style={{ padding: 12, background: "var(--surface-1)", border: `1px solid ${THEME.line}`, borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: THEME.muted }}>Section 194A TDS Status</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: tdsApplicable ? THEME.rust : THEME.sage }}>
                  {tdsApplicable ? "TDS Applicable (10%)" : "Within INR 40,000 Limit"}
                </div>
              </div>

              <div style={{ padding: 12, background: "var(--surface-1)", border: `1px solid ${THEME.line}`, borderRadius: 8 }}>
                <div style={{ fontSize: 11, color: THEME.muted }}>Estimated Annual TDS</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: tdsApplicable ? THEME.rust : THEME.sage, fontFamily: "var(--font-display)" }}>
                  <Money value={estimatedTDS} variant="full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Tax Optimization Advisory Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <Card style={{ padding: 18 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: THEME.ink, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <FileSpreadsheet size={16} color={THEME.cyan} /> Form 15G / 15H Exemption
          </h4>
          <p style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.6 }}>
            If your total annual taxable income is below the basic tax exemption limit (₹3,00,000 under New Regime or ₹2,50,000 under Old Regime), submit <strong>Form 15G</strong> (or <strong>Form 15H</strong> if senior citizen) at your bank branch or net banking portal at the beginning of each financial year to prevent 10% TDS deduction.
          </p>
        </Card>

        <Card style={{ padding: 18 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: THEME.ink, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <Building size={16} color={THEME.sage} /> Multi-Bank Diversification
          </h4>
          <p style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.6 }}>
            TDS thresholds apply <em>per banking institution</em>. By spreading your recurring deposits across different banks (e.g. SBI, HDFC, ICICI, Post Office), you can keep annual interest in each bank below the ₹40,000 threshold and avoid automatic TDS deductions.
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   VIEW: Interactive RD & Goal Calculator
   ══════════════════════════════════════════════════════════════════════════════ */
function InteractiveRDCalculator({
  onApplyScenario,
}: {
  onApplyScenario?: (scenario: any) => void;
}) {
  const [calcMode, setCalcMode] = useState<"maturity" | "reverse_goal">("maturity");
  const [monthlyDeposit, setMonthlyDeposit] = useState<number>(10000);
  const [interestRate, setInterestRate] = useState<number>(7.25);
  const [tenureMonths, setTenureMonths] = useState<number>(24);
  const [targetCorpus, setTargetCorpus] = useState<number>(500000);

  // Mode A: Regular Maturity
  const totalPrincipal = monthlyDeposit * tenureMonths;
  const projectedMaturity = rdMaturity(monthlyDeposit, interestRate, tenureMonths);
  const totalInterest = Math.max(0, projectedMaturity - totalPrincipal);

  // Mode B: Reverse Goal Solver (Find required monthly SIP for target corpus)
  const requiredMonthly = useMemo(() => {
    if (targetCorpus <= 0 || tenureMonths <= 0 || interestRate <= 0) return 0;
    // Solve: P * (rdMaturity(1, rate, months)) = targetCorpus
    const unitMaturity = rdMaturity(1, interestRate, tenureMonths);
    return unitMaturity > 0 ? Math.ceil(targetCorpus / unitMaturity) : 0;
  }, [targetCorpus, interestRate, tenureMonths]);

  // Growth curve data for chart
  const growthData = useMemo(() => {
    const data = [];
    const step = Math.max(1, Math.floor(tenureMonths / 12));
    const activeMonthly = calcMode === "maturity" ? monthlyDeposit : requiredMonthly;

    for (let m = 1; m <= tenureMonths; m += step) {
      const invested = activeMonthly * m;
      const currentMat = rdMaturity(activeMonthly, interestRate, m);
      const interest = Math.max(0, currentMat - invested);
      data.push({
        month: `M${m}`,
        Principal: invested,
        Interest: Math.round(interest),
        Total: Math.round(currentMat),
      });
    }
    // Always include end month
    const endInvested = activeMonthly * tenureMonths;
    const endMat = rdMaturity(activeMonthly, interestRate, tenureMonths);
    data.push({
      month: `M${tenureMonths}`,
      Principal: endInvested,
      Interest: Math.round(Math.max(0, endMat - endInvested)),
      Total: Math.round(endMat),
    });
    return data;
  }, [calcMode, monthlyDeposit, requiredMonthly, interestRate, tenureMonths]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header Mode Switcher */}
      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        <button
          type="button"
          onClick={() => setCalcMode("maturity")}
          style={{
            padding: "8px 20px",
            borderRadius: 8,
            border: `1px solid ${calcMode === "maturity" ? THEME.cyan : THEME.line}`,
            background: calcMode === "maturity" ? "rgba(14, 165, 233, 0.15)" : "transparent",
            color: calcMode === "maturity" ? THEME.cyan : THEME.muted,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Calculate Maturity from Monthly Deposit
        </button>
        <button
          type="button"
          onClick={() => setCalcMode("reverse_goal")}
          style={{
            padding: "8px 20px",
            borderRadius: 8,
            border: `1px solid ${calcMode === "reverse_goal" ? "#8b5cf6" : THEME.line}`,
            background: calcMode === "reverse_goal" ? "rgba(139, 92, 246, 0.15)" : "transparent",
            color: calcMode === "reverse_goal" ? "#a78bfa" : THEME.muted,
            fontWeight: 700,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Target Goal Reverse Calculator
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        {/* Controls Card */}
        <Card style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <h4 style={{ fontSize: 16, fontWeight: 700, color: THEME.ink, margin: 0 }}>
            {calcMode === "maturity" ? "Recurring Deposit Inputs" : "Financial Goal Target"}
          </h4>

          {calcMode === "maturity" ? (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: THEME.muted }}>Monthly Installment:</span>
                <span style={{ fontWeight: 700, color: THEME.cyan }}>₹{monthlyDeposit.toLocaleString("en-IN")}</span>
              </div>
              <input
                type="range"
                min="1000"
                max="200000"
                step="1000"
                value={monthlyDeposit}
                onChange={(e) => setMonthlyDeposit(Number(e.target.value))}
                style={{ width: "100%", accentColor: THEME.cyan }}
              />
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: THEME.muted }}>Target Corpus (₹):</span>
                <span style={{ fontWeight: 700, color: "#a78bfa" }}>₹{targetCorpus.toLocaleString("en-IN")}</span>
              </div>
              <input
                type="range"
                min="50000"
                max="5000000"
                step="50000"
                value={targetCorpus}
                onChange={(e) => setTargetCorpus(Number(e.target.value))}
                style={{ width: "100%", accentColor: "#8b5cf6" }}
              />
            </div>
          )}

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: THEME.muted }}>Interest Rate (% p.a.):</span>
              <span style={{ fontWeight: 700, color: THEME.ink }}>{interestRate}%</span>
            </div>
            <input
              type="range"
              min="4.0"
              max="9.5"
              step="0.05"
              value={interestRate}
              onChange={(e) => setInterestRate(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.cyan }}
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: THEME.muted }}>Tenure (Months):</span>
              <span style={{ fontWeight: 700, color: THEME.ink }}>{tenureMonths} Months ({(tenureMonths / 12).toFixed(1)} yrs)</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {[6, 12, 24, 36, 60, 120].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setTenureMonths(m)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: `1px solid ${tenureMonths === m ? THEME.cyan : THEME.line}`,
                    background: tenureMonths === m ? "rgba(14, 165, 233, 0.2)" : "transparent",
                    color: tenureMonths === m ? THEME.cyan : THEME.muted,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {m < 12 ? `${m}M` : `${m / 12}Y`}
                </button>
              ))}
            </div>
            <input
              type="range"
              min="6"
              max="120"
              step="6"
              value={tenureMonths}
              onChange={(e) => setTenureMonths(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.cyan }}
            />
          </div>
        </Card>

        {/* Results & Visual Chart Card */}
        <Card style={{ padding: 24, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 700, color: THEME.ink, margin: 0, marginBottom: 16 }}>
              {calcMode === "maturity" ? "Projected Wealth Outcome" : "Recommended Monthly SIP"}
            </h4>

            {calcMode === "maturity" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                <div style={{ padding: 12, background: "var(--surface-1)", border: `1px solid ${THEME.line}`, borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: THEME.muted }}>Total Deposited</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: THEME.accent, fontFamily: "var(--font-display)" }}>
                    <Money value={totalPrincipal} variant="full" />
                  </div>
                </div>

                <div style={{ padding: 12, background: "var(--surface-1)", border: `1px solid ${THEME.line}`, borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: THEME.muted }}>Maturity Corpus</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: THEME.sage, fontFamily: "var(--font-display)" }}>
                    <Money value={projectedMaturity} variant="full" />
                  </div>
                  <div style={{ fontSize: 10, color: THEME.sage, marginTop: 2 }}>
                    +₹{Math.round(totalInterest).toLocaleString("en-IN")} Interest Gain
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: 16, background: "color-mix(in srgb, #8b5cf6 10%, transparent)", borderRadius: 12, border: "1px solid color-mix(in srgb, #8b5cf6 25%, transparent)", marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: THEME.muted }}>Required Monthly Installment to hit ₹{targetCorpus.toLocaleString("en-IN")}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: "#a78bfa", fontFamily: "var(--font-display)", marginTop: 4 }}>
                  ₹{requiredMonthly.toLocaleString("en-IN")} <span style={{ fontSize: 14, color: THEME.muted }}>/ month</span>
                </div>
              </div>
            )}

            {/* Growth Chart */}
            <div style={{ width: "100%", height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData}>
                  <XAxis dataKey="month" stroke={THEME.muted} fontSize={11} tickLine={false} />
                  <YAxis
                    stroke={THEME.muted}
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => [`₹${Math.round(Number(val)).toLocaleString("en-IN")}`]}
                    contentStyle={{
                      background: "rgba(15, 23, 42, 0.95)",
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 8,
                      color: THEME.ink,
                    }}
                  />
                  <Area type="monotone" dataKey="Principal" stackId="1" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.4} />
                  <Area type="monotone" dataKey="Interest" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MODAL: RD Installment History & Payment Ledger
   ══════════════════════════════════════════════════════════════════════════════ */
function RDHistoryModal({
  rd,
  bankAccounts = [],
  transactions = [],
  onClose,
  onPayNext,
}: {
  rd: any;
  bankAccounts?: any[];
  transactions?: any[];
  onClose: () => void;
  onPayNext: () => void;
}) {
  const [txnSortOrder, setTxnSortOrder] = useState<"asc" | "desc">("asc");
  const tenure = Number(rd.tenureMonths) || 12;
  const paid = Number(rd.paidInstallments) || rdElapsed(rd);
  const monthly = Number(rd.monthly) || 0;
  const rate = Number(rd.rate) || 0;
  const startDate = rd.startDate || today();
  const linkedBank = bankAccounts.find(
    (b: any) => b.id === (rd.bankAccountId || rd.linkedAccount)
  );
  const totalDeposited = paid * monthly;
  const totalPlanned = tenure * monthly;

  // Filter relevant transactions
  const rdTxns = useMemo(() => {
    return transactions.filter((t: any) => {
      if (t.linked_type === "recurring_deposit" && (t.linked_id === rd.id || t.linked_id === rd.rdNumber)) return true;
      const note = (t.note || t.description || t.narration || "").toLowerCase();
      const bankMatch = rd.bank && note.includes(rd.bank.toLowerCase()) && note.includes("rd");
      const acctMatch = rd.rdNumber && note.includes(rd.rdNumber);
      return bankMatch || acctMatch;
    });
  }, [transactions, rd]);

  // Sort transactions by date (asc / desc)
  const sortedTxns = useMemo(() => {
    return [...rdTxns].sort((a: any, b: any) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0;
      const dateB = b.date ? new Date(b.date).getTime() : 0;
      if (dateA !== dateB) {
        return txnSortOrder === "asc" ? dateA - dateB : dateB - dateA;
      }
      return txnSortOrder === "asc"
        ? String(a.id || "").localeCompare(String(b.id || ""))
        : String(b.id || "").localeCompare(String(a.id || ""));
    });
  }, [rdTxns, txnSortOrder]);

  return (
    <Modal title={`${rd.bank} RD Installment Ledger & Payments`} onClose={onClose} width={1180}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Top Summary Banner */}
        <div
          style={{
            padding: "16px 20px",
            borderRadius: 12,
            background: "var(--surface-1)",
            border: `1px solid ${THEME.line}`,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Monthly SIP</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: THEME.cyan, fontFamily: "var(--font-display)", marginTop: 2 }}>
              ₹{monthly.toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>@ {rate}% p.a.</div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Total Deposited</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: THEME.accent, fontFamily: "var(--font-display)", marginTop: 2 }}>
              ₹{totalDeposited.toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>of ₹{totalPlanned.toLocaleString("en-IN")}</div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Installments Paid</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: paid >= tenure ? THEME.sage : THEME.ink, fontFamily: "var(--font-display)", marginTop: 2 }}>
              {paid} of {tenure}
            </div>
            <div style={{ fontSize: 11, color: THEME.sage, marginTop: 2 }}>
              {((paid / (tenure || 1)) * 100).toFixed(0)}% Complete
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Debited Bank Account</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginTop: 2 }}>
              {linkedBank ? `${linkedBank.bankName} (••${linkedBank.accountNumber?.slice(-4) || "NA"})` : "Not Linked"}
            </div>
            {linkedBank && (
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                Balance: ₹{Number(linkedBank.balance || 0).toLocaleString("en-IN")}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ width: "100%" }}>
          <div style={{ height: 8, background: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" }}>
            <div
              style={{
                width: `${Math.min(100, (paid / (tenure || 1)) * 100)}%`,
                height: "100%",
                background: paid >= tenure
                  ? "linear-gradient(90deg, #10b981 0%, #34d399 100%)"
                  : "linear-gradient(90deg, #0284c7 0%, #38bdf8 100%)",
                borderRadius: 4,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>

        {/* Responsive Content Grid: Schedule (Left) + Outflow Receipts (Right) */}
        <div className={sortedTxns.length > 0 ? "rd-ledger-grid" : ""}>
          {/* Installments Schedule & Status Table */}
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                Installment Schedule ({tenure} Months)
              </div>
              {paid < tenure && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<CreditCard size={12} />}
                  onClick={onPayNext}
                  style={{ fontSize: 11, padding: "4px 10px" }}
                >
                  Pay Installment #{paid + 1}
                </Button>
              )}
            </div>

            <div
              style={{
                maxHeight: 440,
                overflowY: "auto",
                overflowX: "auto",
                border: `1px solid ${THEME.line}`,
                borderRadius: 10,
                background: "var(--surface-0)",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 540 }}>
                <thead style={{ position: "sticky", top: 0, zIndex: 2 }}>
                  <tr style={{ background: "var(--surface-1)", borderBottom: `1px solid ${THEME.line}`, color: THEME.muted, fontSize: 11 }}>
                    <th style={{ padding: "8px 8px", textAlign: "center", width: 36, whiteSpace: "nowrap" }}>#</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", whiteSpace: "nowrap" }}>Due Date</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", whiteSpace: "nowrap" }}>Amount</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", whiteSpace: "nowrap" }}>Status</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", whiteSpace: "nowrap" }}>Payment Method / Bank</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: tenure }, (_, idx) => {
                    const instNum = idx + 1;
                    const isPaid = instNum <= paid;
                    const isNextDue = instNum === paid + 1;
                    const scheduledDate = addMonthsToDateStr(startDate, idx);

                    return (
                      <tr
                        key={instNum}
                        style={{
                          borderBottom: `1px solid ${THEME.line}`,
                          background: isPaid ? "rgba(16, 185, 129, 0.03)" : isNextDue ? "rgba(14, 165, 233, 0.05)" : "transparent",
                        }}
                      >
                        <td style={{ padding: "8px 8px", textAlign: "center", fontWeight: 700, color: THEME.ink }}>
                          #{instNum}
                        </td>
                        <td style={{ padding: "8px 10px", color: THEME.muted, whiteSpace: "nowrap" }}>
                          {scheduledDate}
                        </td>
                        <td style={{ padding: "8px 10px", fontWeight: 700, color: THEME.ink, fontFamily: "var(--font-display)", whiteSpace: "nowrap" }}>
                          ₹{monthly.toLocaleString("en-IN")}
                        </td>
                        <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                          {isPaid ? (
                            <Badge variant="sage">
                              <CheckCircle2 size={10} style={{ marginRight: 3 }} /> Paid
                            </Badge>
                          ) : isNextDue ? (
                            <Badge variant="cyan">Due Now</Badge>
                          ) : (
                            <Badge variant="muted">Upcoming</Badge>
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", color: THEME.muted, whiteSpace: "nowrap" }}>
                          {isPaid ? (
                            linkedBank ? `${linkedBank.bankName} (••${linkedBank.accountNumber?.slice(-4) || "NA"})` : "Bank Account"
                          ) : isNextDue ? (
                            <span style={{ color: THEME.cyan, fontWeight: 600 }}>Auto Debit / Direct Pay</span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Linked Bank Transactions Vouchers (Right Column) */}
          {sortedTxns.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, display: "flex", alignItems: "center", gap: 6 }}>
                  <Receipt size={14} style={{ color: THEME.cyan }} />
                  <span>Bank Outflow Receipts ({sortedTxns.length})</span>
                </div>

                {/* Sorting Controls */}
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Sort Date:</span>
                  <div
                    style={{
                      display: "inline-flex",
                      background: "var(--surface-1)",
                      padding: "2px",
                      borderRadius: 6,
                      border: `1px solid ${THEME.line}`,
                      gap: 2,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setTxnSortOrder("asc")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "3px 8px",
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 4,
                        border: "none",
                        cursor: "pointer",
                        background: txnSortOrder === "asc" ? THEME.cyan : "transparent",
                        color: txnSortOrder === "asc" ? "#ffffff" : THEME.muted,
                        transition: "all 0.15s ease",
                      }}
                      title="Sort Oldest to Newest (Ascending)"
                    >
                      <ArrowUp size={11} />
                      <span>Oldest First</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTxnSortOrder("desc")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "3px 8px",
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 4,
                        border: "none",
                        cursor: "pointer",
                        background: txnSortOrder === "desc" ? THEME.cyan : "transparent",
                        color: txnSortOrder === "desc" ? "#ffffff" : THEME.muted,
                        transition: "all 0.15s ease",
                      }}
                      title="Sort Newest to Oldest (Descending)"
                    >
                      <ArrowDown size={11} />
                      <span>Newest First</span>
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 440, overflowY: "auto", paddingRight: 2 }}>
                {sortedTxns.map((t: any) => (
                  <div
                    key={t.id}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "var(--surface-1)",
                      border: `1px solid ${THEME.line}`,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      fontSize: 12,
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 700, color: THEME.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {t.note || t.description || t.narration || "RD Installment Debit"}
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                        {t.date} • Category: {t.category || "Investments"}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, color: THEME.rust, fontFamily: "var(--font-display)" }}>
                        -₹{Number(t.amount || 0).toLocaleString("en-IN")}
                      </div>
                      <div style={{ fontSize: 10, color: THEME.sage }}>Verified Outflow</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <ModalActions onClose={onClose} />
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MODAL: Pay RD Installment Modal
   ══════════════════════════════════════════════════════════════════════════════ */
function PayInstallmentModal({
  rd,
  bankAccounts = [],
  onClose,
  onConfirm,
  loading,
}: {
  rd: any;
  bankAccounts?: any[];
  onClose: () => void;
  onConfirm: (data: { bankAccountId: string; debitBank: boolean; date: string }) => void;
  loading?: boolean;
}) {
  const currentPaid = Number(rd.paidInstallments) || rdElapsed(rd);
  const nextInstallment = currentPaid + 1;
  const tenure = Number(rd.tenureMonths) || 12;
  const monthly = Number(rd.monthly) || 0;
  const initialBankId = rd.bankAccountId || rd.linkedAccount || bankAccounts[0]?.id || "";

  const [selectedBankId, setSelectedBankId] = useState(initialBankId);
  const [debitBank, setDebitBank] = useState(Boolean(initialBankId));
  const [date, setDate] = useState(today());

  const selectedBank = bankAccounts.find((b: any) => b.id === selectedBankId);
  const bankBalance = Number(selectedBank?.balance || 0);
  const remainingBalance = bankBalance - monthly;

  const inp: React.CSSProperties = {
    background: "var(--surface-1)",
    border: `1px solid ${THEME.line}`,
    borderRadius: 8,
    padding: "9px 12px",
    color: THEME.ink,
    fontSize: 13,
    width: "100%",
    outline: "none",
  };

  return (
    <Modal title={`Pay RD Installment #${nextInstallment}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: "rgba(14, 165, 233, 0.08)",
            border: "1px solid rgba(14, 165, 233, 0.2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
              {rd.bank} Recurring Deposit
            </div>
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
              {rd.rdNumber || rd.accountNumber ? `A/C: ${rd.rdNumber || rd.accountNumber} • ` : ""}
              Installment {nextInstallment} of {tenure}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: THEME.muted }}>Amount Due</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: THEME.cyan, fontFamily: "var(--font-display)" }}>
              ₹{monthly.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        <Field label="Debited From Bank Account">
          <select
            style={inp}
            value={selectedBankId}
            onChange={(e) => setSelectedBankId(e.target.value)}
          >
            <option value="">— Select Bank Account —</option>
            {bankAccounts.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.bankName} (••{b.accountNumber?.slice(-4) || "NA"} - Balance: ₹{Number(b.balance || 0).toLocaleString("en-IN")})
              </option>
            ))}
          </select>
        </Field>

        <Field label="Payment / Debit Date">
          <input
            style={inp}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>

        {selectedBank && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "var(--surface-1)",
              border: `1px solid ${THEME.line}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 12,
            }}
          >
            <span style={{ color: THEME.muted }}>Current Balance:</span>
            <span style={{ fontWeight: 600, color: THEME.ink }}>₹{bankBalance.toLocaleString("en-IN")}</span>
            <span style={{ color: THEME.muted }}>After Debit:</span>
            <span style={{ fontWeight: 700, color: remainingBalance >= 0 ? THEME.sage : THEME.rust }}>
              ₹{remainingBalance.toLocaleString("en-IN")}
            </span>
          </div>
        )}

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: THEME.ink,
            cursor: "pointer",
            marginTop: 4,
          }}
        >
          <input
            type="checkbox"
            checked={debitBank}
            onChange={(e) => setDebitBank(e.target.checked)}
            style={{ accentColor: THEME.cyan }}
          />
          <span>Deduct ₹{monthly.toLocaleString("en-IN")} from bank balance & log transaction</span>
        </label>

        <ModalActions
          onClose={onClose}
          onSave={() => onConfirm({ bankAccountId: selectedBankId, debitBank, date })}
          saveLabel={`Confirm Payment (₹${monthly.toLocaleString("en-IN")})`}
          disabled={loading || (debitBank && !selectedBankId)}
          loading={loading}
        />
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MODAL: Edit Recurring Deposit Modal
   ══════════════════════════════════════════════════════════════════════════════ */
function EditRDModal({
  rd: initial,
  bankAccounts = [],
  familyProfiles = [],
  onClose,
  onSave,
  saving,
}: {
  rd: any;
  bankAccounts?: any[];
  familyProfiles?: any[];
  onClose: () => void;
  onSave: (updated: any) => void;
  saving?: boolean;
}) {
  const [form, setForm] = useState({
    bank: initial.bank || "",
    rdNumber: initial.rdNumber || initial.accountNumber || "",
    monthly: initial.monthly != null ? String(initial.monthly) : "",
    rate: initial.rate != null ? String(initial.rate) : "",
    tenureMonths: initial.tenureMonths != null ? String(initial.tenureMonths) : "12",
    startDate: initial.startDate || today(),
    debitDay: initial.debitDay != null ? String(initial.debitDay) : "5",
    owner: initial.owner || "self",
    goal: initial.goal || "General Savings",
    nominee: initial.nominee || "",
    bankAccountId: initial.bankAccountId || initial.linkedAccount || "",
    paidInstallments:
      initial.paidInstallments != null
        ? String(initial.paidInstallments)
        : String(rdElapsed(initial)),
    notes: initial.notes || "",
  });

  const maturity = rdMaturity(
    Number(form.monthly) || 0,
    Number(form.rate) || 0,
    Number(form.tenureMonths) || 0
  );

  const inp: React.CSSProperties = {
    background: "var(--surface-1)",
    border: `1px solid ${THEME.line}`,
    borderRadius: 8,
    padding: "8px 12px",
    color: THEME.ink,
    fontSize: 13,
    width: "100%",
    outline: "none",
  };

  const handleFormSubmit = () => {
    if (!form.bank || !form.monthly || !form.rate || !form.tenureMonths) return;
    onSave({
      ...initial,
      bank: form.bank,
      rdNumber: form.rdNumber,
      accountNumber: form.rdNumber,
      monthly: Number(form.monthly),
      rate: Number(form.rate),
      tenureMonths: Number(form.tenureMonths),
      startDate: form.startDate,
      debitDay: Number(form.debitDay) || 5,
      owner: form.owner,
      goal: form.goal,
      nominee: form.nominee,
      bankAccountId: form.bankAccountId,
      linkedAccount: form.bankAccountId,
      paidInstallments: Number(form.paidInstallments) || 0,
      notes: form.notes,
    });
  };

  return (
    <Modal title="Edit Recurring Deposit" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Popular Banks Chips */}
        <div>
          <label style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, display: "block", marginBottom: 6 }}>
            QUICK BANK SELECTION
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {POPULAR_BANKS.slice(0, 5).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setForm({ ...form, bank: b })}
                style={{
                  padding: "4px 10px",
                  borderRadius: 16,
                  border: `1px solid ${form.bank === b ? THEME.cyan : THEME.line}`,
                  background: form.bank === b ? "rgba(14, 165, 233, 0.15)" : "rgba(255,255,255,0.03)",
                  color: form.bank === b ? THEME.cyan : THEME.ink,
                  fontSize: 11,
                  cursor: "pointer",
                }}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <Field label="Bank / Institution Name">
          <input
            style={inp}
            value={form.bank}
            onChange={(e) => setForm({ ...form, bank: e.target.value })}
            placeholder="e.g. HDFC Bank, SBI"
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="RD Account / Folio No.">
            <input
              style={inp}
              value={form.rdNumber}
              onChange={(e) => setForm({ ...form, rdNumber: e.target.value })}
              placeholder="e.g. 501004928192"
            />
          </Field>

          <Field label="Family Member / Owner">
            <select
              style={inp}
              value={form.owner}
              onChange={(e) => setForm({ ...form, owner: e.target.value })}
            >
              <option value="self">Self</option>
              {familyProfiles?.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Monthly Installment (₹)">
            <input
              style={inp}
              type="number"
              value={form.monthly}
              onChange={(e) => setForm({ ...form, monthly: e.target.value })}
              placeholder="10000"
            />
          </Field>

          <Field label="Interest Rate (% p.a.)">
            <input
              style={inp}
              type="number"
              step="0.05"
              value={form.rate}
              onChange={(e) => setForm({ ...form, rate: e.target.value })}
              placeholder="7.25"
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Tenure (Months)">
            <input
              style={inp}
              type="number"
              value={form.tenureMonths}
              onChange={(e) => setForm({ ...form, tenureMonths: e.target.value })}
              placeholder="24"
            />
          </Field>

          <Field label="Start Date">
            <input
              style={inp}
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Debited From Bank Account">
            <select
              style={inp}
              value={form.bankAccountId}
              onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })}
            >
              <option value="">— Select Bank Account —</option>
              {bankAccounts.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.bankName} (••{b.accountNumber?.slice(-4) || "NA"} - Balance: ₹{Number(b.balance || 0).toLocaleString("en-IN")})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Monthly Debit Day">
            <input
              style={inp}
              type="number"
              min="1"
              max="28"
              value={form.debitDay}
              onChange={(e) => setForm({ ...form, debitDay: e.target.value })}
              placeholder="5"
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Installments Deposited to Date">
            <input
              style={inp}
              type="number"
              min="0"
              value={form.paidInstallments}
              onChange={(e) => setForm({ ...form, paidInstallments: e.target.value })}
              placeholder="0"
            />
          </Field>

          <Field label="Goal / Category Tag">
            <select
              style={inp}
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
            >
              {GOAL_TAGS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Nominee Name">
          <input
            style={inp}
            value={form.nominee}
            onChange={(e) => setForm({ ...form, nominee: e.target.value })}
            placeholder="e.g. Spouse / Child / Parent name"
          />
        </Field>

        {/* Live Calculation Box */}
        {form.monthly && form.rate && form.tenureMonths && (
          <div
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background: "rgba(14, 165, 233, 0.1)",
              border: "1px solid rgba(14, 165, 233, 0.25)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: THEME.cyan, fontWeight: 700 }}>
                PROJECTED MATURITY CORPUS
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: THEME.ink, fontFamily: "var(--font-display)" }}>
                ₹{Math.round(maturity).toLocaleString("en-IN")}
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: 11, color: THEME.muted }}>
              Deposit: ₹{(Number(form.monthly) * Number(form.tenureMonths)).toLocaleString("en-IN")}
              <br />
              Gain: +₹{Math.round(maturity - Number(form.monthly) * Number(form.tenureMonths)).toLocaleString("en-IN")}
            </div>
          </div>
        )}

        <ModalActions
          onClose={onClose}
          onSave={handleFormSubmit}
          saveLabel="Save Changes"
          disabled={saving || !form.bank || !form.monthly || !form.rate}
          loading={saving}
        />
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MODAL: Premature Closure & Penalty Simulator
   ══════════════════════════════════════════════════════════════════════════════ */
function PrematureBreakModal({
  rd,
  onClose,
}: {
  rd: any;
  onClose: () => void;
}) {
  const [breakAfterMonths, setBreakAfterMonths] = useState<number>(
    Math.max(1, Math.min(Number(rd.tenureMonths) || 12, monthsBetween(rd.startDate || today(), today())))
  );
  const [penalRateDeduction, setPenalRateDeduction] = useState<number>(1.0); // Standard 1% penalty

  const tenure = Number(rd.tenureMonths) || 12;
  const originalRate = Number(rd.rate) || 7.0;
  const effectiveRate = Math.max(0, originalRate - penalRateDeduction);
  const monthly = Number(rd.monthly) || 0;

  const totalDeposited = monthly * breakAfterMonths;
  const earlyMaturityValue = rdMaturity(monthly, effectiveRate, breakAfterMonths);
  const fullMaturityValue = rdMaturity(monthly, originalRate, tenure);
  const penaltyLoss = fullMaturityValue - earlyMaturityValue;

  return (
    <Modal title="Premature Closure & Penalty Simulator" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BankLogo name={rd.bank} size={36} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: THEME.ink }}>{rd.bank} RD</div>
            <div style={{ fontSize: 12, color: THEME.muted }}>
              ₹{monthly.toLocaleString("en-IN")}/mo @ {originalRate}% p.a. for {tenure} months
            </div>
          </div>
        </div>

        <Card style={{ padding: 16, background: "var(--surface-1)" }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: THEME.muted }}>Close RD After (Months):</span>
              <span style={{ fontWeight: 700, color: THEME.cyan }}>{breakAfterMonths} Months</span>
            </div>
            <input
              type="range"
              min="1"
              max={tenure}
              value={breakAfterMonths}
              onChange={(e) => setBreakAfterMonths(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.cyan }}
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: THEME.muted }}>Bank Premature Penalty (% deduction):</span>
              <span style={{ fontWeight: 700, color: THEME.rust }}>-{penalRateDeduction}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="2.0"
              step="0.25"
              value={penalRateDeduction}
              onChange={(e) => setPenalRateDeduction(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.rust }}
            />
          </div>
        </Card>

        {/* Comparison outcome */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ padding: 12, background: "rgba(16, 185, 129, 0.1)", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: THEME.sage }}>Estimated Payout Upon Break</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: THEME.sage, fontFamily: "var(--font-display)" }}>
              ₹{Math.round(earlyMaturityValue).toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
              Effective rate: {effectiveRate.toFixed(2)}% p.a.
            </div>
          </div>

          <div style={{ padding: 12, background: "rgba(239, 68, 68, 0.1)", borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: THEME.rust }}>Opportunity Loss vs Full Tenure</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: THEME.rust, fontFamily: "var(--font-display)" }}>
              -₹{Math.round(penaltyLoss).toLocaleString("en-IN")}
            </div>
            <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
              Full maturity: ₹{Math.round(fullMaturityValue).toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Simulator
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════════
   MODAL: Rollover / Reinvestment Wizard
   ══════════════════════════════════════════════════════════════════════════════ */
function RDRolloverModal({
  rd,
  onClose,
  onSave,
  saving,
}: {
  rd: any;
  onClose: () => void;
  onSave: (newRd: any) => void;
  saving?: boolean;
}) {
  const [bank, setBank] = useState(rd.bank || "HDFC Bank");
  const [monthly, setMonthly] = useState(String(rd.monthly || "10000"));
  const [rate, setRate] = useState(String(rd.rate || "7.25"));
  const [tenureMonths, setTenureMonths] = useState(String(rd.tenureMonths || "24"));
  const [startDate, setStartDate] = useState(today());
  const [goal, setGoal] = useState(rd.goal || "Wealth Accumulator");

  const inp: React.CSSProperties = {
    background: "var(--surface-1)",
    border: `1px solid ${THEME.line}`,
    borderRadius: 8,
    padding: "8px 12px",
    color: THEME.ink,
    fontSize: 13,
    width: "100%",
    outline: "none",
  };

  const handleRollover = () => {
    onSave({
      bank,
      monthly: Number(monthly),
      rate: Number(rate),
      tenureMonths: Number(tenureMonths),
      startDate,
      owner: rd.owner || "self",
      goal,
      nominee: rd.nominee || "",
      notes: `Reinvested from previous RD #${rd.rdNumber || rd.id}`,
    });
  };

  return (
    <Modal title="Reinvest / Rollover Recurring Deposit" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ fontSize: 13, color: THEME.muted, margin: 0 }}>
          Fast-track reinvesting your matured recurring deposit into a new high-yield RD.
        </p>

        <Field label="Bank / Institution">
          <input
            style={inp}
            value={bank}
            onChange={(e) => setBank(e.target.value)}
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Monthly Installment (₹)">
            <input
              style={inp}
              type="number"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
            />
          </Field>

          <Field label="Interest Rate (% p.a.)">
            <input
              style={inp}
              type="number"
              step="0.05"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Tenure (Months)">
            <input
              style={inp}
              type="number"
              value={tenureMonths}
              onChange={(e) => setTenureMonths(e.target.value)}
            />
          </Field>

          <Field label="Start Date">
            <input
              style={inp}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
        </div>

        <ModalActions
          onClose={onClose}
          onSave={handleRollover}
          saveLabel="Create Reinvested RD"
          disabled={saving || !bank || !monthly || !rate}
          loading={saving}
        />
      </div>
    </Modal>
  );
}
