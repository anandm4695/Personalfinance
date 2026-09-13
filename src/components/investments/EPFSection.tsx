import React, { useState, useMemo, useEffect } from "react";
import {
  Shield,
  ShieldCheck,
  TrendingUp,
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
  Filter,
  ArrowRight,
  Repeat,
  History,
  FileText,
  Scale,
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

/* ── Constants & Types ── */
export const DEFAULT_EPFO_INTEREST_RATE = 8.25; // FY 2024-25 / 2025-26 EPFO Rate
export const EPS_WAGE_CEILING = 15000;
export const MAX_EPS_MONTHLY_CONTRIBUTION = 1250; // 8.33% of 15,000
export const EPF_ANNUAL_TAX_FREE_THRESHOLD = 250000; // Sec 10(11)/(12) employee share threshold
export const EPF_ANNUAL_TAX_FREE_THRESHOLD_NO_EMPLOYER = 500000;

export const EPF_TX_TYPES = [
  { value: "monthly_contribution", label: "Monthly Contribution (Passbook)", color: THEME.violet },
  { value: "employee_contribution", label: "Employee Share (12%)", color: THEME.accent },
  { value: "employer_contribution", label: "Employer Share (3.67%)", color: THEME.cyan },
  { value: "interest_credit", label: "Interest Credit (EPFO @ 8.25%)", color: THEME.sage },
  { value: "transfer_in", label: "Transfer In (Form 13)", color: THEME.gold },
  { value: "withdrawal", label: "Withdrawal / Advance (Form 31/19)", color: THEME.rust },
  { value: "vpf_contribution", label: "VPF (Voluntary PF)", color: THEME.pink },
];

export interface EPFTransaction {
  id: string;
  date: string;
  type:
    | "monthly_contribution"
    | "employee_contribution"
    | "employer_contribution"
    | "interest_credit"
    | "transfer_in"
    | "withdrawal"
    | "vpf_contribution"
    | string;
  amount?: number | string;
  note?: string;
  wageMonth?: string;
  particulars?: string;
  epfWages?: number | string;
  epsWages?: number | string;
  employeeShare?: number | string;
  employerShare?: number | string;
  pensionShare?: number | string;
  estId?: string;
  fromEmployer?: string;
}

export interface EPFEstablishment {
  id: string;
  employerName: string;
  estId?: string;
  memberId?: string;
  joiningDate?: string;
  exitDate?: string;
  ncpDays?: number | string;
  notes?: string;
}

export interface EPFItem {
  id: string;
  uan?: string;
  accountNumber?: string;
  employer?: string;
  bank?: string;
  balance?: number | string;
  openingDate?: string;
  owner?: string;
  nominee?: string;
  linkedAccount?: string;
  notes?: string;
  transactions?: EPFTransaction[];
  establishments?: EPFEstablishment[];
}

interface EPFSectionProps {
  items: EPFItem[];
  removeItem: (key: string, id: string) => void;
  updateItem: (key: string, id: string, data: any) => void;
  addItem?: (key: string, data: any) => void;
  onAdd: () => void;
  showToast?: (msg: string, type?: any) => void;
  activeProfile?: string;
}

/* ── Financial Year Helpers ── */
export const getFinancialYear = (dateStr: string): string => {
  if (!dateStr) return "Current FY";
  const [y, m] = dateStr.split("-").map(Number);
  if (!y || !m) return "Current FY";
  const startYear = m >= 4 ? y : y - 1;
  return `FY ${startYear}-${String(startYear + 1).slice(2)}`;
};

export const calcServiceString = (join?: string, exit?: string) => {
  if (!join) return "—";
  const from = new Date(join);
  const to = exit ? new Date(exit) : new Date();
  if (isNaN(from.getTime()) || isNaN(to.getTime())) return "—";
  let yrs = to.getFullYear() - from.getFullYear();
  let mos = to.getMonth() - from.getMonth();
  let dys = to.getDate() - from.getDate();
  if (dys < 0) {
    mos--;
    dys += 30;
  }
  if (mos < 0) {
    yrs--;
    mos += 12;
  }
  return `${Math.max(0, yrs)}Y ${Math.max(0, mos)}M ${Math.max(0, dys)}D`;
};

export const calcTotalServiceYears = (establishments: EPFEstablishment[] = []): number => {
  if (!establishments || establishments.length === 0) return 0;
  let totalDays = 0;
  establishments.forEach((est) => {
    if (!est.joiningDate) return;
    const from = new Date(est.joiningDate).getTime();
    const to = est.exitDate ? new Date(est.exitDate).getTime() : Date.now();
    if (!isNaN(from) && !isNaN(to) && to >= from) {
      const days = (to - from) / (1000 * 60 * 60 * 24) - Number(est.ncpDays || 0);
      totalDays += Math.max(0, days);
    }
  });
  return parseFloat((totalDays / 365.25).toFixed(1));
};

/* ── EPF Account Computation Helper ── */
export function computeEPFAccountMetrics(p: EPFItem) {
  const txs = p.transactions || [];
  const ests = p.establishments || [];

  const transferredOutEstIds = new Set<string>(
    txs
      .filter((x) => x.type === "transfer_in" && x.fromEmployer)
      .map((x) => {
        const est = ests.find((e) => e.employerName === x.fromEmployer);
        return est ? est.id : null;
      })
      .filter(Boolean) as string[]
  );

  const activeTxs = txs.filter((t) => !t.estId || !transferredOutEstIds.has(t.estId));

  const byType = (type: string) =>
    activeTxs.filter((x) => x.type === type).reduce((s, x) => s + Number(x.amount || 0), 0);

  const monthlyRows = activeTxs.filter((x) => x.type === "monthly_contribution");
  const interestRows = activeTxs.filter((x) => x.type === "interest_credit");
  const transferRows = txs.filter((x) => x.type === "transfer_in");
  const vpfRows = activeTxs.filter((x) => x.type === "vpf_contribution");

  const totalEmployee =
    byType("employee_contribution") +
    monthlyRows.reduce((s, x) => s + Number(x.employeeShare || 0), 0) +
    vpfRows.reduce((s, x) => s + Number(x.amount || 0), 0);

  const totalEmployer =
    byType("employer_contribution") +
    monthlyRows.reduce((s, x) => s + Number(x.employerShare || 0), 0);

  const totalPension = monthlyRows.reduce((s, x) => s + Number(x.pensionShare || 0), 0);

  const totalTransferIn = transferRows.reduce((s, x) => s + Number(x.amount || 0), 0);
  const totalWithdrawal = byType("withdrawal");

  const empInterest = interestRows.reduce((s, x) => {
    if (x.employeeShare !== undefined) return s + Number(x.employeeShare || 0);
    return s + Number(x.amount || 0);
  }, 0);

  const erInterest = interestRows.reduce((s, x) => s + Number(x.employerShare || 0), 0);
  const penInterest = interestRows.reduce((s, x) => s + Number(x.pensionShare || 0), 0);

  const transferInEr = transferRows.reduce((s, x) => s + Number(x.employerShare || 0), 0);
  const transferInPen = transferRows.reduce((s, x) => s + Number(x.pensionShare || 0), 0);
  const transferInEmp = totalTransferIn - transferInEr - transferInPen;

  const closingEmployee = totalEmployee + empInterest + transferInEmp;
  const closingEmployer = totalEmployer + erInterest + transferInEr;
  const closingPension = totalPension + transferInPen + penInterest;
  const totalInterest = empInterest + erInterest + penInterest;

  const hasPassbook = txs.length > 0;
  const calculatedTotal = closingEmployee + closingEmployer + closingPension - totalWithdrawal;
  const finalCorpus = hasPassbook ? calculatedTotal : Number(p.balance || 0);

  return {
    txs,
    ests,
    hasPassbook,
    finalCorpus,
    closingEmployee: hasPassbook ? closingEmployee : Number(p.balance || 0) * 0.5,
    closingEmployer: hasPassbook ? closingEmployer : Number(p.balance || 0) * 0.4,
    closingPension: hasPassbook ? closingPension : Number(p.balance || 0) * 0.1,
    totalEmployee,
    totalEmployer,
    totalPension,
    totalInterest,
    totalTransferIn,
    totalWithdrawal,
    empInterest,
    erInterest,
    penInterest,
    totalServiceYears: calcTotalServiceYears(ests),
  };
}

/* ── Main Component ── */
export function EPFSection({
  items = [],
  removeItem,
  updateItem,
  addItem,
  onAdd,
  showToast,
  activeProfile = "all",
}: EPFSectionProps) {
  const { familyProfiles } = useMasterData();

  // Navigation & View State
  const [viewMode, setViewMode] = useState<
    "overview" | "passbook" | "timeline" | "analytics" | "calculator" | "tax" | "guide"
  >("overview");
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [fyFilter, setFyFilter] = useState<string>("all");
  const [txTypeFilter, setTxTypeFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [editingAccount, setEditingAccount] = useState<EPFItem | null>(null);
  const [showAddAccountModal, setShowAddAccountModal] = useState<boolean>(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState<EPFItem | null>(null);
  const [txModalState, setTxModalState] = useState<{
    account: EPFItem;
    tx?: EPFTransaction | null;
    transferPrefill?: any;
  } | null>(null);
  const [confirmDeleteTx, setConfirmDeleteTx] = useState<{
    account: EPFItem;
    tx: EPFTransaction;
  } | null>(null);
  const [estModalState, setEstModalState] = useState<{
    account: EPFItem;
    est?: EPFEstablishment | null;
  } | null>(null);
  const [confirmDeleteEst, setConfirmDeleteEst] = useState<{
    account: EPFItem;
    est: EPFEstablishment;
  } | null>(null);
  const [csvImportAccount, setCsvImportAccount] = useState<EPFItem | null>(null);

  // Filter items by profile
  const profileFilteredItems = useMemo(() => {
    if (!activeProfile || activeProfile === "all") return items;
    return items.filter((p) => !p.owner || p.owner === activeProfile);
  }, [items, activeProfile]);

  // Account computed metrics map
  const accountsMetrics = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeEPFAccountMetrics>>();
    profileFilteredItems.forEach((p) => {
      map.set(p.id, computeEPFAccountMetrics(p));
    });
    return map;
  }, [profileFilteredItems]);

  // Portfolio Totals
  const portfolioStats = useMemo(() => {
    let totalCorpus = 0;
    let totalEmployee = 0;
    let totalEmployer = 0;
    let totalPension = 0;
    let totalInterest = 0;
    let totalWithdrawal = 0;
    let totalTransferIn = 0;
    let totalTxCount = 0;
    let totalEstCount = 0;

    profileFilteredItems.forEach((p) => {
      const m = accountsMetrics.get(p.id);
      if (m) {
        totalCorpus += m.finalCorpus;
        totalEmployee += m.closingEmployee;
        totalEmployer += m.closingEmployer;
        totalPension += m.closingPension;
        totalInterest += m.totalInterest;
        totalWithdrawal += m.totalWithdrawal;
        totalTransferIn += m.totalTransferIn;
        totalTxCount += m.txs.length;
        totalEstCount += m.ests.length;
      }
    });

    return {
      totalCorpus,
      totalEmployee,
      totalEmployer,
      totalPension,
      totalInterest,
      totalWithdrawal,
      totalTransferIn,
      totalTxCount,
      totalEstCount,
      accountCount: profileFilteredItems.length,
    };
  }, [profileFilteredItems, accountsMetrics]);

  // Animated Numbers for key figures
  const animCorpus = useAnimatedNumber(portfolioStats.totalCorpus);
  const animEmployee = useAnimatedNumber(portfolioStats.totalEmployee);
  const animEmployer = useAnimatedNumber(portfolioStats.totalEmployer);
  const animPension = useAnimatedNumber(portfolioStats.totalPension);
  const animInterest = useAnimatedNumber(portfolioStats.totalInterest);

  // All combined transactions for multi-account view
  const allTransactions = useMemo(() => {
    const list: Array<EPFTransaction & { accountId: string; accountName: string; owner?: string }> = [];
    profileFilteredItems.forEach((acc) => {
      const accName = acc.employer || acc.bank || `UAN: ${acc.uan || acc.accountNumber || "EPF"}`;
      (acc.transactions || []).forEach((t) => {
        list.push({
          ...t,
          accountId: acc.id,
          accountName: accName,
          owner: acc.owner,
        });
      });
    });
    return list.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [profileFilteredItems]);

  // Available Financial Years across all transactions
  const availableFYs = useMemo(() => {
    const fys = new Set<string>();
    allTransactions.forEach((t) => {
      if (t.date) fys.add(getFinancialYear(t.date));
    });
    return Array.from(fys).sort().reverse();
  }, [allTransactions]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((t) => {
      if (selectedAccountId !== "all" && t.accountId !== selectedAccountId) return false;
      if (ownerFilter !== "all" && t.owner !== ownerFilter) return false;
      if (fyFilter !== "all" && getFinancialYear(t.date) !== fyFilter) return false;
      if (txTypeFilter !== "all" && t.type !== txTypeFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNote = (t.note || "").toLowerCase().includes(q);
        const matchesParticulars = (t.particulars || "").toLowerCase().includes(q);
        const matchesWageMonth = (t.wageMonth || "").toLowerCase().includes(q);
        const matchesAccount = t.accountName.toLowerCase().includes(q);
        const matchesEmployer = (t.fromEmployer || "").toLowerCase().includes(q);
        if (!matchesNote && !matchesParticulars && !matchesWageMonth && !matchesAccount && !matchesEmployer) {
          return false;
        }
      }
      return true;
    });
  }, [allTransactions, selectedAccountId, ownerFilter, fyFilter, txTypeFilter, searchQuery]);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast?.("Copied to clipboard", "success");
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Persist Transaction CRUD
  const handleSaveTx = async (account: EPFItem, form: any, txId?: string) => {
    const currentTxs = account.transactions || [];
    let entry: EPFTransaction;

    if (form.type === "monthly_contribution") {
      entry = {
        id: txId || uid(),
        date: form.date,
        type: form.type,
        estId: form.estId || "",
        wageMonth: form.wageMonth || "",
        particulars: form.particulars || "",
        epfWages: Number(form.epfWages || 0),
        epsWages: Number(form.epsWages || 0),
        employeeShare: Number(form.employeeShare || 0),
        employerShare: Number(form.employerShare || 0),
        pensionShare: Number(form.pensionShare || 0),
        amount: Number(form.employeeShare || 0),
        note: form.note || "",
      };
    } else if (form.type === "interest_credit") {
      const empInt = Number(form.employeeShare || 0);
      const erInt = Number(form.employerShare || 0);
      const penInt = Number(form.pensionShare || 0);
      entry = {
        id: txId || uid(),
        date: form.date,
        type: form.type,
        estId: form.estId || "",
        particulars: form.particulars || "",
        employeeShare: empInt,
        employerShare: erInt,
        pensionShare: penInt,
        amount: empInt + erInt + penInt,
        note: form.note || "",
      };
    } else if (form.type === "transfer_in") {
      const empT = Number(form.employeeShare || 0);
      const erT = Number(form.employerShare || 0);
      const penT = Number(form.pensionShare || 0);
      const total = Number(form.amount || 0) || empT + erT + penT;
      entry = {
        id: txId || uid(),
        date: form.date,
        type: form.type,
        estId: form.estId || "",
        fromEmployer: form.fromEmployer || "",
        employeeShare: empT,
        employerShare: erT,
        pensionShare: penT,
        amount: total,
        note: form.note || "",
      };
    } else {
      entry = {
        id: txId || uid(),
        date: form.date,
        type: form.type,
        estId: form.estId || "",
        amount: Number(form.amount || 0),
        note: form.note || "",
      };
    }

    const updatedTxs = txId
      ? currentTxs.map((t) => (t.id === txId ? entry : t))
      : [...currentTxs, entry];

    try {
      await updateItem("epf", account.id, { transactions: updatedTxs });
      showToast?.(txId ? "Transaction updated" : "Transaction added", "success");
      setTxModalState(null);
    } catch (e: any) {
      showToast?.(`Error saving transaction: ${e?.message || "Unknown error"}`, "error");
    }
  };

  const handleDeleteTx = async (account: EPFItem, txId: string) => {
    const updatedTxs = (account.transactions || []).filter((t) => t.id !== txId);
    try {
      await updateItem("epf", account.id, { transactions: updatedTxs });
      showToast?.("Transaction deleted", "info");
      setConfirmDeleteTx(null);
    } catch (e: any) {
      showToast?.(`Error deleting transaction: ${e?.message || "Unknown error"}`, "error");
    }
  };

  // Persist Establishment CRUD
  const handleSaveEst = async (account: EPFItem, form: any, estId?: string) => {
    const currentEsts = account.establishments || [];
    const clean: EPFEstablishment = {
      id: estId || uid(),
      employerName: form.employerName || "",
      estId: form.estId || "",
      memberId: form.memberId || "",
      joiningDate: form.joiningDate || "",
      exitDate: form.exitDate || "",
      ncpDays: Number(form.ncpDays || 0),
      notes: form.notes || "",
    };

    const updatedEsts = estId
      ? currentEsts.map((e) => (e.id === estId ? clean : e))
      : [...currentEsts, clean];

    try {
      await updateItem("epf", account.id, { establishments: updatedEsts });
      showToast?.(estId ? "Service history updated" : "Employer establishment added", "success");
      setEstModalState(null);
    } catch (e: any) {
      showToast?.(`Error saving establishment: ${e?.message || "Unknown error"}`, "error");
    }
  };

  const handleDeleteEst = async (account: EPFItem, estId: string) => {
    const updatedEsts = (account.establishments || []).filter((e) => e.id !== estId);
    try {
      await updateItem("epf", account.id, { establishments: updatedEsts });
      showToast?.("Service history record deleted", "info");
      setConfirmDeleteEst(null);
    } catch (e: any) {
      showToast?.(`Error deleting establishment: ${e?.message || "Unknown error"}`, "error");
    }
  };

  // Export Passbook to CSV
  const handleExportCSV = (acc?: EPFItem) => {
    const txsToExport = acc ? acc.transactions || [] : allTransactions;
    if (txsToExport.length === 0) {
      showToast?.("No transactions to export", "info");
      return;
    }
    const rows = txsToExport.map((t) => ({
      Date: t.date,
      Type: t.type,
      "Wage Month": t.wageMonth || "",
      Particulars: t.particulars || t.note || "",
      "EPF Wages": t.epfWages || "",
      "EPS Wages": t.epsWages || "",
      "Employee Share (₹)": t.employeeShare || t.amount || "",
      "Employer Share (₹)": t.employerShare || "",
      "Pension Share (₹)": t.pensionShare || "",
      "Total Amount (₹)": t.amount || "",
      "From Employer": t.fromEmployer || "",
      Notes: t.note || "",
    }));
    exportArrayToCSV(rows, `epf_passbook_${acc ? (acc.uan || "account") : "all"}_${today()}.csv`);
    showToast?.("Passbook exported to CSV", "success");
  };

  return (
    <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Executive Header Banner ── */}
      <div
        style={{
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          borderRadius: 20,
          padding: "24px 28px",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 10px 30px -10px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${THEME.accent}15 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

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
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                border: `1.5px solid ${THEME.accent}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: THEME.accent,
                boxShadow: `0 4px 12px ${THEME.accent}20`,
              }}
            >
              <Shield size={26} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h1
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: THEME.ink,
                    letterSpacing: "-0.02em",
                    margin: 0,
                  }}
                >
                  Employees' Provident Fund (EPFO)
                </h1>
                <Badge variant="accent">Sovereign 8.25%</Badge>
                <Badge variant="outline">Sec 80C + EEE</Badge>
              </div>
              <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4 }}>
                Track EPFO passbook, dual-share splits, EPS-95 pension, service history &amp; taxable interest limits
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Button
              variant="outline"
              size="sm"
              icon={<Download size={14} />}
              onClick={() => handleExportCSV()}
            >
              Export All CSV
            </Button>
            <Button
              variant="accent"
              size="sm"
              icon={<Plus size={15} />}
              onClick={onAdd || (() => setShowAddAccountModal(true))}
            >
              Add EPF Account
            </Button>
          </div>
        </div>

        {/* ── Sub-Navigation Tabs ── */}
        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            paddingBottom: 4,
            borderBottom: `1px solid ${THEME.line}`,
          }}
        >
          {[
            { id: "overview", label: "Overview & Accounts", icon: Layers, count: profileFilteredItems.length },
            { id: "passbook", label: "EPFO Passbook", icon: BookOpen, count: allTransactions.length },
            { id: "timeline", label: "Service History", icon: History, count: portfolioStats.totalEstCount },
            { id: "analytics", label: "Analytics & Growth", icon: BarChart3 },
            { id: "calculator", label: "EPF & EPS Calculators", icon: Calculator },
            { id: "tax", label: "Tax Engine (₹2.5L Limit)", icon: Scale },
            { id: "guide", label: "EPFO Rules & Claims", icon: HelpCircle },
          ].map((tab) => {
            const isActive = viewMode === tab.id;
            const IconComp = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setViewMode(tab.id as any)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "9px 16px",
                  borderRadius: 10,
                  border: "none",
                  background: isActive
                    ? `color-mix(in srgb, ${THEME.accent} 12%, transparent)`
                    : "transparent",
                  color: isActive ? THEME.accent : THEME.muted,
                  fontWeight: isActive ? 700 : 500,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
              >
                <IconComp size={15} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 10,
                      background: isActive ? THEME.accent : "var(--surface-2)",
                      color: isActive ? "var(--surface-0)" : THEME.muted,
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── KPI Stat Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
        }}
      >
        <StatCard
          label="Total EPF Corpus"
          value={fmtINRFull(portfolioStats.totalCorpus)}
          numericValue={portfolioStats.totalCorpus}
          formatValue={fmtINRFull}
          sub="EPF + EPS accumulated balance"
          color={THEME.accent}
          icon={<Shield size={16} />}
        />
        <StatCard
          label="Employee Share"
          value={fmtINRFull(portfolioStats.totalEmployee)}
          numericValue={portfolioStats.totalEmployee}
          formatValue={fmtINRFull}
          sub="12% contribution + interest"
          color={THEME.accent}
          icon={<TrendingUp size={16} />}
        />
        <StatCard
          label="Employer Share"
          value={fmtINRFull(portfolioStats.totalEmployer)}
          numericValue={portfolioStats.totalEmployer}
          formatValue={fmtINRFull}
          sub="3.67% PF share + interest"
          color={THEME.cyan}
          icon={<Building size={16} />}
        />
        <StatCard
          label="EPS Pension Fund"
          value={fmtINRFull(portfolioStats.totalPension)}
          numericValue={portfolioStats.totalPension}
          formatValue={fmtINRFull}
          sub="8.33% EPS pension corpus"
          color={THEME.gold}
          icon={<Coins size={16} />}
        />
        <StatCard
          label="EPFO Interest Earned"
          value={fmtINRFull(portfolioStats.totalInterest)}
          numericValue={portfolioStats.totalInterest}
          formatValue={fmtINRFull}
          sub="Compounded sovereign return"
          color={THEME.sage}
          icon={<Sparkles size={16} />}
        />
      </div>

      {/* ── Empty State ── */}
      {profileFilteredItems.length === 0 ? (
        <EPFEmptyState onAdd={onAdd || (() => setShowAddAccountModal(true))} />
      ) : (
        <>
          {/* ── VIEW 1: Overview & Account Cards ── */}
          {viewMode === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                  gap: 20,
                }}
              >
                {profileFilteredItems.map((p) => {
                  const m = accountsMetrics.get(p.id)!;
                  return (
                    <EPFAccountCardRedesigned
                      key={p.id}
                      p={p}
                      metrics={m}
                      onEdit={() => setEditingAccount(p)}
                      onDelete={() => setConfirmDeleteAccount(p)}
                      onAddTx={() => setTxModalState({ account: p })}
                      onAddEst={() => setEstModalState({ account: p })}
                      onImportCsv={() => setCsvImportAccount(p)}
                      onExportCsv={() => handleExportCSV(p)}
                      onOpenPassbook={() => {
                        setSelectedAccountId(p.id);
                        setViewMode("passbook");
                      }}
                      onCopy={(txt, id) => handleCopy(txt, id)}
                      copiedId={copiedId}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* ── VIEW 2: Passbook Ledger ── */}
          {viewMode === "passbook" && (
            <EPFPassbookView
              accounts={profileFilteredItems}
              transactions={filteredTransactions}
              selectedAccountId={selectedAccountId}
              onSelectAccount={setSelectedAccountId}
              fyFilter={fyFilter}
              onSelectFY={setFyFilter}
              txTypeFilter={txTypeFilter}
              onSelectTxType={setTxTypeFilter}
              searchQuery={searchQuery}
              onSearch={setSearchQuery}
              availableFYs={availableFYs}
              onAddTx={(acc) => setTxModalState({ account: acc })}
              onEditTx={(acc, tx) => setTxModalState({ account: acc, tx })}
              onDeleteTx={(acc, tx) => setConfirmDeleteTx({ account: acc, tx })}
              onExportCsv={handleExportCSV}
              onImportCsv={(acc) => setCsvImportAccount(acc)}
            />
          )}

          {/* ── VIEW 3: Service History & Timeline ── */}
          {viewMode === "timeline" && (
            <EPFServiceHistoryView
              accounts={profileFilteredItems}
              onAddEst={(acc) => setEstModalState({ account: acc })}
              onEditEst={(acc, est) => setEstModalState({ account: acc, est })}
              onDeleteEst={(acc, est) => setConfirmDeleteEst({ account: acc, est })}
              onTransfer={(acc, est, estClosing) => {
                setTxModalState({
                  account: acc,
                  transferPrefill: {
                    type: "transfer_in",
                    date: est.exitDate || today(),
                    fromEmployer: est.employerName,
                    amount: String(estClosing.closing || ""),
                    employeeShare: String(estClosing.emp || ""),
                    employerShare: String(estClosing.er || ""),
                    pensionShare: String(estClosing.pen || ""),
                    note: `Form 13 transfer from ${est.employerName}`,
                    estId: "",
                  },
                });
              }}
            />
          )}

          {/* ── VIEW 4: Analytics & Visual Charts ── */}
          {viewMode === "analytics" && (
            <EPFAnalyticsView
              portfolioStats={portfolioStats}
              transactions={allTransactions}
              accounts={profileFilteredItems}
            />
          )}

          {/* ── VIEW 5: Calculators & Forecasters ── */}
          {viewMode === "calculator" && (
            <EPFCalculatorsView currentCorpus={portfolioStats.totalCorpus} />
          )}

          {/* ── VIEW 6: Tax Engine & Threshold Monitor ── */}
          {viewMode === "tax" && (
            <EPFTaxEngineView
              accounts={profileFilteredItems}
              transactions={allTransactions}
              portfolioStats={portfolioStats}
            />
          )}

          {/* ── VIEW 7: EPFO Rules & Claims Guide ── */}
          {viewMode === "guide" && <EPFGuideView />}
        </>
      )}

      {/* ── Modals & Dialogs ── */}
      {showAddAccountModal && (
        <AddEditEPFAccountModal
          onClose={() => setShowAddAccountModal(false)}
          onSave={async (data) => {
            if (addItem) {
              await addItem("epf", data);
            } else {
              showToast?.("Add account helper not attached", "error");
            }
            setShowAddAccountModal(false);
          }}
          familyProfiles={familyProfiles}
        />
      )}

      {editingAccount && (
        <AddEditEPFAccountModal
          initial={editingAccount}
          onClose={() => setEditingAccount(null)}
          onSave={async (data) => {
            await updateItem("epf", editingAccount.id, data);
            showToast?.("EPF Account updated successfully", "success");
            setEditingAccount(null);
          }}
          familyProfiles={familyProfiles}
        />
      )}

      {txModalState && (
        <AddEditEPFTransactionModal
          account={txModalState.account}
          initial={txModalState.tx || txModalState.transferPrefill}
          onClose={() => setTxModalState(null)}
          onSave={(form) => handleSaveTx(txModalState.account, form, txModalState.tx?.id)}
        />
      )}

      {estModalState && (
        <AddEditEstablishmentModal
          account={estModalState.account}
          initial={estModalState.est}
          onClose={() => setEstModalState(null)}
          onSave={(form) => handleSaveEst(estModalState.account, form, estModalState.est?.id)}
        />
      )}

      {csvImportAccount && (
        <EPFCsvImportModal
          account={csvImportAccount}
          onClose={() => setCsvImportAccount(null)}
          onImport={async (importedTxs) => {
            const current = csvImportAccount.transactions || [];
            await updateItem("epf", csvImportAccount.id, { transactions: [...current, ...importedTxs] });
            showToast?.(`Imported ${importedTxs.length} transactions successfully`, "success");
            setCsvImportAccount(null);
          }}
        />
      )}

      {confirmDeleteAccount && (
        <ConfirmDialog
          message={`Delete EPF account (${confirmDeleteAccount.employer || confirmDeleteAccount.bank || confirmDeleteAccount.uan})? All linked passbook entries and service history will be removed.`}
          onConfirm={() => {
            removeItem("epf", confirmDeleteAccount.id);
            setConfirmDeleteAccount(null);
            showToast?.("EPF Account removed", "info");
          }}
          onCancel={() => setConfirmDeleteAccount(null)}
        />
      )}

      {confirmDeleteTx && (
        <ConfirmDialog
          message={`Delete passbook entry dated ${confirmDeleteTx.tx.date} (${confirmDeleteTx.tx.type})?`}
          onConfirm={() => handleDeleteTx(confirmDeleteTx.account, confirmDeleteTx.tx.id)}
          onCancel={() => setConfirmDeleteTx(null)}
        />
      )}

      {confirmDeleteEst && (
        <ConfirmDialog
          message={`Delete employment history for ${confirmDeleteEst.est.employerName}?`}
          onConfirm={() => handleDeleteEst(confirmDeleteEst.account, confirmDeleteEst.est.id)}
          onCancel={() => setConfirmDeleteEst(null)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-COMPONENT: Redesigned EPF Account Card ─────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function EPFAccountCardRedesigned({
  p,
  metrics,
  onEdit,
  onDelete,
  onAddTx,
  onAddEst,
  onImportCsv,
  onExportCsv,
  onOpenPassbook,
  onCopy,
  copiedId,
}: {
  p: EPFItem;
  metrics: ReturnType<typeof computeEPFAccountMetrics>;
  onEdit: () => void;
  onDelete: () => void;
  onAddTx: () => void;
  onAddEst: () => void;
  onImportCsv: () => void;
  onExportCsv: () => void;
  onOpenPassbook: () => void;
  onCopy: (txt: string, id: string) => void;
  copiedId: string | null;
}) {
  const uan = p.uan || p.accountNumber || "";
  const employer = p.employer || p.bank || "EPF Account";
  const estCount = metrics.ests.length;
  const txCount = metrics.txs.length;

  return (
    <div
      style={{
        background: "var(--surface-0)",
        border: `1px solid ${THEME.line}`,
        borderRadius: 18,
        padding: 22,
        display: "flex",
        flexDirection: "column",
        gap: 18,
        position: "relative",
        boxShadow: "0 4px 20px -4px rgba(0,0,0,0.05)",
        transition: "all 0.2s ease",
      }}
    >
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <BankLogo name="EPFO" size={40} accentColor={THEME.accent} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>{employer}</span>
              {p.owner && <Badge variant="outline">{p.owner}</Badge>}
            </div>
            {uan && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: THEME.muted,
                  marginTop: 3,
                  fontFamily: "monospace",
                }}
              >
                <span>UAN: {uan}</span>
                <button
                  onClick={() => onCopy(uan, `uan-${p.id}`)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: THEME.muted,
                  }}
                  title="Copy UAN"
                >
                  {copiedId === `uan-${p.id}` ? <Check size={12} color={THEME.sage} /> : <Copy size={12} />}
                </button>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          <Button variant="ghost" size="sm" icon={<Pencil size={13} />} onClick={onEdit} />
          <Button
            variant="ghost"
            size="sm"
            icon={<Trash2 size={13} />}
            onClick={onDelete}
            style={{ color: THEME.rust }}
          />
        </div>
      </div>

      {/* Main Balance Display */}
      <div
        style={{
          background: `color-mix(in srgb, ${THEME.accent} 5%, var(--surface-1))`,
          border: `1px solid ${THEME.accent}20`,
          borderRadius: 14,
          padding: "16px 18px",
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
          <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
            Total EPF Corpus
          </span>
          {metrics.hasPassbook ? (
            <span
              style={{
                fontSize: 10,
                color: THEME.sage,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <CheckCircle2 size={11} /> Passbook Verified
            </span>
          ) : (
            <span style={{ fontSize: 10, color: THEME.muted }}>Manual Estimate</span>
          )}
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: THEME.accent, letterSpacing: "-0.02em" }}>
          <Money value={metrics.finalCorpus} variant="full" />
        </div>

        {/* 3 Split Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 8,
            marginTop: 14,
            paddingTop: 14,
            borderTop: `1px solid ${THEME.line}`,
          }}
        >
          <div>
            <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>Employee (12%)</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.accent, marginTop: 2 }}>
              <Money value={metrics.closingEmployee} variant="full" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>Employer (3.67%)</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.cyan, marginTop: 2 }}>
              <Money value={metrics.closingEmployer} variant="full" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>EPS Pension</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: THEME.gold, marginTop: 2 }}>
              <Money value={metrics.closingPension} variant="full" />
            </div>
          </div>
        </div>
      </div>

      {/* Account Info Stats Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          fontSize: 12,
        }}
      >
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "var(--surface-1)",
            border: `1px solid ${THEME.line}`,
          }}
        >
          <div style={{ fontSize: 10, color: THEME.muted }}>Interest Earned</div>
          <div style={{ fontWeight: 700, color: THEME.sage, marginTop: 2 }}>
            <Money value={metrics.totalInterest} variant="full" />
          </div>
        </div>
        <div
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "var(--surface-1)",
            border: `1px solid ${THEME.line}`,
          }}
        >
          <div style={{ fontSize: 10, color: THEME.muted }}>Service Duration</div>
          <div style={{ fontWeight: 700, color: THEME.ink, marginTop: 2 }}>
            {metrics.totalServiceYears > 0 ? `${metrics.totalServiceYears} Years` : "—"}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button
          variant="accent"
          size="sm"
          icon={<Plus size={13} />}
          onClick={onAddTx}
          style={{ flex: 1 }}
        >
          Add Transaction
        </Button>
        <Button
          variant="outline"
          size="sm"
          icon={<BookOpen size={13} />}
          onClick={onOpenPassbook}
          style={{ flex: 1 }}
        >
          View Passbook ({txCount})
        </Button>
        <Button
          variant="outline"
          size="sm"
          icon={<Building size={13} />}
          onClick={onAddEst}
          title="Add Employer Service Record"
        >
          + Est ({estCount})
        </Button>
        <Button
          variant="outline"
          size="sm"
          icon={<Upload size={13} />}
          onClick={onImportCsv}
          title="Import Passbook CSV"
        />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-COMPONENT: EPFO Passbook View ──────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function EPFPassbookView({
  accounts,
  transactions,
  selectedAccountId,
  onSelectAccount,
  fyFilter,
  onSelectFY,
  txTypeFilter,
  onSelectTxType,
  searchQuery,
  onSearch,
  availableFYs,
  onAddTx,
  onEditTx,
  onDeleteTx,
  onExportCsv,
  onImportCsv,
}: {
  accounts: EPFItem[];
  transactions: Array<EPFTransaction & { accountId: string; accountName: string; owner?: string }>;
  selectedAccountId: string;
  onSelectAccount: (id: string) => void;
  fyFilter: string;
  onSelectFY: (fy: string) => void;
  txTypeFilter: string;
  onSelectTxType: (type: string) => void;
  searchQuery: string;
  onSearch: (q: string) => void;
  availableFYs: string[];
  onAddTx: (acc: EPFItem) => void;
  onEditTx: (acc: EPFItem, tx: EPFTransaction) => void;
  onDeleteTx: (acc: EPFItem, tx: EPFTransaction) => void;
  onExportCsv: (acc?: EPFItem) => void;
  onImportCsv: (acc: EPFItem) => void;
}) {
  const currentAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  // Totals for the currently filtered passbook rows
  const passbookTotals = useMemo(() => {
    let sumEPFWages = 0;
    let sumEPSWages = 0;
    let sumEmployee = 0;
    let sumEmployer = 0;
    let sumPension = 0;
    let sumWithdrawal = 0;

    transactions.forEach((t) => {
      if (t.type === "monthly_contribution") {
        sumEPFWages += Number(t.epfWages || 0);
        sumEPSWages += Number(t.epsWages || 0);
        sumEmployee += Number(t.employeeShare || 0);
        sumEmployer += Number(t.employerShare || 0);
        sumPension += Number(t.pensionShare || 0);
      } else if (t.type === "interest_credit") {
        sumEmployee += Number(t.employeeShare !== undefined ? t.employeeShare : t.amount || 0);
        sumEmployer += Number(t.employerShare || 0);
        sumPension += Number(t.pensionShare || 0);
      } else if (t.type === "transfer_in") {
        const erT = Number(t.employerShare || 0);
        const penT = Number(t.pensionShare || 0);
        sumEmployee += Number(t.amount || 0) - erT - penT;
        sumEmployer += erT;
        sumPension += penT;
      } else if (t.type === "withdrawal") {
        sumWithdrawal += Number(t.amount || 0);
      } else if (t.type === "employee_contribution" || t.type === "vpf_contribution") {
        sumEmployee += Number(t.amount || 0);
      } else if (t.type === "employer_contribution") {
        sumEmployer += Number(t.amount || 0);
      }
    });

    return {
      sumEPFWages,
      sumEPSWages,
      sumEmployee,
      sumEmployer,
      sumPension,
      sumWithdrawal,
      netAddition: sumEmployee + sumEmployer + sumPension - sumWithdrawal,
    };
  }, [transactions]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Filter Bar */}
      <div
        style={{
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          borderRadius: 16,
          padding: 16,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1 }}>
          {/* Account selector */}
          <select
            value={selectedAccountId}
            onChange={(e) => onSelectAccount(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: `1px solid ${THEME.line}`,
              background: "var(--surface-1)",
              color: THEME.ink,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <option value="all">All EPF Accounts ({accounts.length})</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.employer || a.bank || `UAN: ${a.uan || a.accountNumber}`}
              </option>
            ))}
          </select>

          {/* FY filter */}
          <select
            value={fyFilter}
            onChange={(e) => onSelectFY(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: `1px solid ${THEME.line}`,
              background: "var(--surface-1)",
              color: THEME.ink,
              fontSize: 13,
            }}
          >
            <option value="all">All Financial Years</option>
            {availableFYs.map((fy) => (
              <option key={fy} value={fy}>
                {fy}
              </option>
            ))}
          </select>

          {/* Transaction Type Filter */}
          <select
            value={txTypeFilter}
            onChange={(e) => onSelectTxType(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: `1px solid ${THEME.line}`,
              background: "var(--surface-1)",
              color: THEME.ink,
              fontSize: 13,
            }}
          >
            <option value="all">All Types</option>
            {EPF_TX_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Search box */}
          <div style={{ position: "relative", minWidth: 200, flex: "1 1 200px" }}>
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
              placeholder="Search month, particulars, employer..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 32px",
                borderRadius: 8,
                border: `1px solid ${THEME.line}`,
                background: "var(--surface-1)",
                color: THEME.ink,
                fontSize: 13,
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {currentAccount && (
            <>
              <Button
                variant="accent"
                size="sm"
                icon={<Plus size={13} />}
                onClick={() => onAddTx(currentAccount)}
              >
                Add Transaction
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<Upload size={13} />}
                onClick={() => onImportCsv(currentAccount)}
              >
                Import CSV
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            icon={<Download size={13} />}
            onClick={() => onExportCsv(selectedAccountId !== "all" ? currentAccount : undefined)}
          >
            Export
          </Button>
        </div>
      </div>

      {/* Passbook Table */}
      <div
        style={{
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 4px 16px -4px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 12,
              minWidth: 850,
            }}
          >
            <thead>
              <tr style={{ background: `color-mix(in srgb, ${THEME.accent} 6%, transparent)` }}>
                <th style={thStyle}>Date &amp; Month</th>
                <th style={thStyle}>Account / Employer</th>
                <th style={thStyle}>Transaction Type</th>
                <th style={thStyle}>Particulars / Reference</th>
                <th style={{ ...thStyle, textAlign: "right" }}>EPF Wages</th>
                <th style={{ ...thStyle, textAlign: "right" }}>EPS Wages</th>
                <th style={{ ...thStyle, textAlign: "right", color: THEME.accent }}>
                  Emp. Share (12%)
                </th>
                <th style={{ ...thStyle, textAlign: "right", color: THEME.cyan }}>
                  Empr. Share (3.67%)
                </th>
                <th style={{ ...thStyle, textAlign: "right", color: THEME.gold }}>
                  Pension (8.33%)
                </th>
                <th style={{ ...thStyle, textAlign: "center", width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: 40, textAlign: "center", color: THEME.muted }}>
                    <BookOpen size={36} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
                    <div style={{ fontSize: 14, fontWeight: 700 }}>No Passbook Entries Found</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      Add monthly contributions or import your EPFO passbook CSV.
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const typeObj = EPF_TX_TYPES.find((x) => x.value === t.type) || {
                    label: t.type,
                    color: THEME.muted,
                  };
                  const isMonthly = t.type === "monthly_contribution";
                  const isInterest = t.type === "interest_credit";
                  const isTransfer = t.type === "transfer_in";
                  const isWithdrawal = t.type === "withdrawal";
                  const targetAcc = accounts.find((a) => a.id === t.accountId) || accounts[0];

                  const empShare = isMonthly
                    ? Number(t.employeeShare || 0)
                    : isInterest
                      ? Number(t.employeeShare !== undefined ? t.employeeShare : t.amount || 0)
                      : isTransfer
                        ? Number(t.employeeShare || 0) || Number(t.amount || 0)
                        : t.type === "employee_contribution" || t.type === "vpf_contribution"
                          ? Number(t.amount || 0)
                          : isWithdrawal
                            ? -Number(t.amount || 0)
                            : 0;

                  const erShare = isMonthly
                    ? Number(t.employerShare || 0)
                    : isInterest || isTransfer
                      ? Number(t.employerShare || 0)
                      : t.type === "employer_contribution"
                        ? Number(t.amount || 0)
                        : 0;

                  const penShare = isMonthly
                    ? Number(t.pensionShare || 0)
                    : isInterest || isTransfer
                      ? Number(t.pensionShare || 0)
                      : 0;

                  return (
                    <tr
                      key={t.id}
                      style={{
                        borderTop: `1px solid ${THEME.line}`,
                        background: isInterest
                          ? `color-mix(in srgb, ${THEME.sage} 4%, transparent)`
                          : isTransfer
                            ? `color-mix(in srgb, ${THEME.gold} 4%, transparent)`
                            : isWithdrawal
                              ? `color-mix(in srgb, ${THEME.rust} 4%, transparent)`
                              : undefined,
                      }}
                    >
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700, color: THEME.ink }}>{t.date || "—"}</div>
                        {t.wageMonth && (
                          <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                            Wage: {t.wageMonth}
                          </div>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: THEME.ink }}>{t.accountName}</div>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            padding: "3px 8px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: `color-mix(in srgb, ${typeObj.color} 10%, transparent)`,
                            color: typeObj.color,
                            border: `1px solid ${typeObj.color}30`,
                          }}
                        >
                          {typeObj.label}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: THEME.muted }}>
                        {isTransfer ? (
                          <span style={{ color: THEME.gold, fontWeight: 600 }}>
                            From: {t.fromEmployer || "Previous Employer"} (Form 13)
                          </span>
                        ) : (
                          t.particulars || t.note || "—"
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace" }}>
                        {t.epfWages ? <Money value={t.epfWages} variant="full" /> : "—"}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontFamily: "monospace" }}>
                        {t.epsWages ? <Money value={t.epsWages} variant="full" /> : "—"}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          fontWeight: 700,
                          color: isWithdrawal ? THEME.rust : THEME.accent,
                        }}
                      >
                        {empShare !== 0 ? (
                          <Money value={empShare} variant="full" />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          fontWeight: 700,
                          color: THEME.cyan,
                        }}
                      >
                        {erShare > 0 ? (
                          <Money value={erShare} variant="full" />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          textAlign: "right",
                          fontWeight: 700,
                          color: THEME.gold,
                        }}
                      >
                        {penShare > 0 ? (
                          <Money value={penShare} variant="full" />
                        ) : (
                          "—"
                        )}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "center" }}>
                          <button
                            onClick={() => onEditTx(targetAcc, t)}
                            style={iconBtnStyle}
                            title="Edit"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => onDeleteTx(targetAcc, t)}
                            style={{ ...iconBtnStyle, color: THEME.rust }}
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {transactions.length > 0 && (
              <tfoot>
                <tr
                  style={{
                    background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
                    borderTop: `2px solid ${THEME.line}`,
                    fontWeight: 800,
                  }}
                >
                  <td colSpan={4} style={{ ...tdStyle, textTransform: "uppercase", fontSize: 10 }}>
                    Page Total Summary ({transactions.length} entries)
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <Money value={passbookTotals.sumEPFWages} variant="full" />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right" }}>
                    <Money value={passbookTotals.sumEPSWages} variant="full" />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", color: THEME.accent }}>
                    <Money value={passbookTotals.sumEmployee} variant="full" />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", color: THEME.cyan }}>
                    <Money value={passbookTotals.sumEmployer} variant="full" />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "right", color: THEME.gold }}>
                    <Money value={passbookTotals.sumPension} variant="full" />
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-COMPONENT: Service History & Timeline ──────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function EPFServiceHistoryView({
  accounts,
  onAddEst,
  onEditEst,
  onDeleteEst,
  onTransfer,
}: {
  accounts: EPFItem[];
  onAddEst: (acc: EPFItem) => void;
  onEditEst: (acc: EPFItem, est: EPFEstablishment) => void;
  onDeleteEst: (acc: EPFItem, est: EPFEstablishment) => void;
  onTransfer: (acc: EPFItem, est: EPFEstablishment, closing: { closing: number; emp: number; er: number; pen: number }) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {accounts.map((acc) => {
        const ests = (acc.establishments || []).slice().sort((a, b) =>
          (b.joiningDate || "").localeCompare(a.joiningDate || "")
        );
        const txs = acc.transactions || [];
        const totalYears = calcTotalServiceYears(ests);

        return (
          <div
            key={acc.id}
            style={{
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              borderRadius: 18,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 18,
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
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Building size={20} color={THEME.accent} />
                  <span style={{ fontSize: 17, fontWeight: 800, color: THEME.ink }}>
                    {acc.employer || acc.bank || "EPF Account"}
                  </span>
                  <Badge variant="accent">{totalYears} Yrs Service</Badge>
                  {totalYears >= 5 ? (
                    <Badge variant="success">5+ Yrs Continuous (Tax-Free Withdrawal)</Badge>
                  ) : (
                    <Badge variant="warning">&lt;5 Yrs (Withdrawals Taxable)</Badge>
                  )}
                </div>
                {acc.uan && (
                  <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
                    UAN: <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{acc.uan}</span>
                  </div>
                )}
              </div>

              <Button
                variant="accent"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => onAddEst(acc)}
              >
                Add Employer Service History
              </Button>
            </div>

            {ests.length === 0 ? (
              <div
                style={{
                  padding: 30,
                  textAlign: "center",
                  borderRadius: 12,
                  background: "var(--surface-1)",
                  border: `1px dashed ${THEME.line}`,
                  color: THEME.muted,
                  fontSize: 13,
                }}
              >
                No establishment records added yet. Add past and current employers to track member IDs and Form 13 transfers.
              </div>
            ) : (
              <div style={{ position: "relative", paddingLeft: 28, marginTop: 8 }}>
                {/* Timeline Line */}
                <div
                  style={{
                    position: "absolute",
                    left: 10,
                    top: 15,
                    bottom: 15,
                    width: 2,
                    background: `color-mix(in srgb, ${THEME.accent} 25%, transparent)`,
                    borderRadius: 2,
                  }}
                />

                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {ests.map((est, idx) => {
                    const isCurrent = !est.exitDate;
                    const estTxs = txs.filter((t) => t.estId === est.id);
                    const estEmpC = estTxs
                      .filter((x) => x.type === "monthly_contribution" || x.type === "employee_contribution")
                      .reduce((s, x) => s + Number(x.employeeShare || x.amount || 0), 0);
                    const estErC = estTxs
                      .filter((x) => x.type === "monthly_contribution" || x.type === "employer_contribution")
                      .reduce((s, x) => s + Number(x.employerShare || x.amount || 0), 0);
                    const estPenC = estTxs
                      .filter((x) => x.type === "monthly_contribution")
                      .reduce((s, x) => s + Number(x.pensionShare || 0), 0);
                    const estIntEmp = estTxs
                      .filter((x) => x.type === "interest_credit")
                      .reduce((s, x) => s + Number(x.employeeShare !== undefined ? x.employeeShare : x.amount || 0), 0);
                    const estIntEr = estTxs
                      .filter((x) => x.type === "interest_credit")
                      .reduce((s, x) => s + Number(x.employerShare || 0), 0);
                    const estClosing = estEmpC + estErC + estPenC + estIntEmp + estIntEr;

                    const alreadyTransferred = txs.some(
                      (t) => t.type === "transfer_in" && t.fromEmployer === est.employerName
                    );

                    return (
                      <div key={est.id} style={{ position: "relative" }}>
                        {/* Timeline Node Icon */}
                        <div
                          style={{
                            position: "absolute",
                            left: -28,
                            top: 14,
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            background: isCurrent ? THEME.accent : "var(--surface-0)",
                            border: `2px solid ${isCurrent ? THEME.accent : THEME.muted}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            fontWeight: 800,
                            color: isCurrent ? "var(--surface-0)" : THEME.muted,
                          }}
                        >
                          {idx + 1}
                        </div>

                        {/* Card */}
                        <div
                          style={{
                            background: "var(--surface-1)",
                            border: `1px solid ${THEME.line}`,
                            borderRadius: 14,
                            padding: "16px 18px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              marginBottom: 10,
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 15, fontWeight: 800, color: THEME.ink }}>
                                  {est.employerName}
                                </span>
                                {isCurrent ? (
                                  <Badge variant="accent">Current Employer</Badge>
                                ) : (
                                  <Badge variant="outline">Exited</Badge>
                                )}
                              </div>
                              <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
                                {est.joiningDate || "—"} → {est.exitDate ? est.exitDate : "Present"} •{" "}
                                <span style={{ fontWeight: 600, color: THEME.ink }}>
                                  {calcServiceString(est.joiningDate, est.exitDate)}
                                </span>
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: 4 }}>
                              <button onClick={() => onEditEst(acc, est)} style={iconBtnStyle} title="Edit">
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => onDeleteEst(acc, est)}
                                style={{ ...iconBtnStyle, color: THEME.rust }}
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {/* Grid Metadata */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                              gap: 8,
                              fontSize: 11,
                              background: "var(--surface-0)",
                              padding: "10px 14px",
                              borderRadius: 10,
                              border: `1px solid ${THEME.line}`,
                            }}
                          >
                            <div>
                              <span style={{ color: THEME.muted }}>Est ID: </span>
                              <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{est.estId || "—"}</span>
                            </div>
                            <div>
                              <span style={{ color: THEME.muted }}>Member ID: </span>
                              <span style={{ fontWeight: 600, fontFamily: "monospace" }}>{est.memberId || "—"}</span>
                            </div>
                            <div>
                              <span style={{ color: THEME.muted }}>NCP Days: </span>
                              <span style={{ fontWeight: 600 }}>{est.ncpDays || 0} Days</span>
                            </div>
                            <div>
                              <span style={{ color: THEME.muted }}>Passbook Entries: </span>
                              <span style={{ fontWeight: 600 }}>{estTxs.length} Rows</span>
                            </div>
                          </div>

                          {/* Transfer In Action */}
                          {!isCurrent && (
                            <div
                              style={{
                                marginTop: 12,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                paddingTop: 10,
                                borderTop: `1px dashed ${THEME.line}`,
                              }}
                            >
                              {alreadyTransferred ? (
                                <span
                                  style={{
                                    fontSize: 12,
                                    color: THEME.sage,
                                    fontWeight: 700,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                  }}
                                >
                                  <CheckCircle2 size={14} /> Form 13 Transfer Recorded to Current Employer
                                </span>
                              ) : (
                                <>
                                  <span style={{ fontSize: 11, color: THEME.muted }}>
                                    Balance to transfer: <strong>{fmtINRFull(estClosing)}</strong>
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    icon={<Repeat size={13} />}
                                    onClick={() =>
                                      onTransfer(acc, est, {
                                        closing: estClosing,
                                        emp: estEmpC + estIntEmp,
                                        er: estErC + estIntEr,
                                        pen: estPenC,
                                      })
                                    }
                                  >
                                    Record Form 13 Transfer
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-COMPONENT: Analytics & Visual Charts ───────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function EPFAnalyticsView({
  portfolioStats,
  transactions,
  accounts,
}: {
  portfolioStats: any;
  transactions: any[];
  accounts: EPFItem[];
}) {
  // Pie chart data: Employee vs Employer vs Pension vs Interest
  const shareBreakdown = useMemo(() => {
    return [
      { name: "Employee Share (12%)", value: portfolioStats.totalEmployee, color: THEME.accent },
      { name: "Employer Share (3.67%)", value: portfolioStats.totalEmployer, color: THEME.cyan },
      { name: "EPS Pension Fund (8.33%)", value: portfolioStats.totalPension, color: THEME.gold },
      { name: "EPFO Interest", value: portfolioStats.totalInterest, color: THEME.sage },
    ].filter((x) => x.value > 0);
  }, [portfolioStats]);

  // Yearly contribution & growth bar chart data
  const yearlyData = useMemo(() => {
    const map = new Map<string, { fy: string; employee: number; employer: number; pension: number; interest: number }>();

    transactions.forEach((t) => {
      const fy = getFinancialYear(t.date);
      if (!map.has(fy)) {
        map.set(fy, { fy, employee: 0, employer: 0, pension: 0, interest: 0 });
      }
      const entry = map.get(fy)!;

      if (t.type === "monthly_contribution") {
        entry.employee += Number(t.employeeShare || 0);
        entry.employer += Number(t.employerShare || 0);
        entry.pension += Number(t.pensionShare || 0);
      } else if (t.type === "interest_credit") {
        entry.interest += Number(t.amount || (Number(t.employeeShare || 0) + Number(t.employerShare || 0)));
      } else if (t.type === "employee_contribution" || t.type === "vpf_contribution") {
        entry.employee += Number(t.amount || 0);
      } else if (t.type === "employer_contribution") {
        entry.employer += Number(t.amount || 0);
      }
    });

    return Array.from(map.values()).sort((a, b) => a.fy.localeCompare(b.fy));
  }, [transactions]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
          gap: 20,
        }}
      >
        {/* Split Donut */}
        <div
          style={{
            background: "var(--surface-0)",
            border: `1px solid ${THEME.line}`,
            borderRadius: 18,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PieIcon size={18} color={THEME.accent} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: THEME.ink }}>
              EPF Corpus Distribution Split
            </h3>
          </div>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={shareBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {shareBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [fmtINRFull(Number(val)), "Amount"]}
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {shareBreakdown.map((s) => (
              <div
                key={s.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12,
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color }} />
                <span style={{ color: THEME.muted }}>{s.name}:</span>
                <span style={{ fontWeight: 700, color: THEME.ink }}>{fmtINRFull(s.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Yearly Growth Bar Chart */}
        <div
          style={{
            background: "var(--surface-0)",
            border: `1px solid ${THEME.line}`,
            borderRadius: 18,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BarChart3 size={18} color={THEME.accent} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: THEME.ink }}>
              Year-on-Year EPFO Contributions &amp; Interest
            </h3>
          </div>
          <div style={{ height: 260 }}>
            {yearlyData.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: THEME.muted }}>
                Add passbook data to view historical yearly trends.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} opacity={0.6} />
                  <XAxis dataKey="fy" stroke={THEME.muted} fontSize={11} />
                  <YAxis
                    stroke={THEME.muted}
                    fontSize={11}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: any) => [fmtINRFull(Number(val)), ""]}
                    contentStyle={{
                      background: "var(--surface-0)",
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend />
                  <Bar dataKey="employee" name="Employee Share" fill={THEME.accent} stackId="a" />
                  <Bar dataKey="employer" name="Employer Share" fill={THEME.cyan} stackId="a" />
                  <Bar dataKey="pension" name="EPS Pension" fill={THEME.gold} stackId="a" />
                  <Bar dataKey="interest" name="EPFO Interest" fill={THEME.sage} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-COMPONENT: EPF & EPS Calculators ───────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function EPFCalculatorsView({ currentCorpus = 0 }: { currentCorpus: number }) {
  // EPF Projector State
  const [basicSalary, setBasicSalary] = useState<number>(80000);
  const [annualIncrement, setAnnualIncrement] = useState<number>(7);
  const [vpfPercent, setVpfPercent] = useState<number>(0);
  const [epfRate, setEpfRate] = useState<number>(DEFAULT_EPFO_INTEREST_RATE);
  const [currentAge, setCurrentAge] = useState<number>(30);
  const [retirementAge, setRetirementAge] = useState<number>(58);

  // EPS Pension State
  const [pensionSalary, setPensionSalary] = useState<number>(15000); // capped at 15000 or actual
  const [pensionServiceYears, setPensionServiceYears] = useState<number>(20);

  // Calculate EPF Compounding Projection
  const epfProjection = useMemo(() => {
    const years = Math.max(1, retirementAge - currentAge);
    let corpus = Number(currentCorpus || 0);
    let currentBasic = Number(basicSalary || 0);
    let totalEmployeeContr = 0;
    let totalEmployerContr = 0;
    let totalInterestEarned = 0;

    const trajectory: Array<{ year: number; age: number; corpus: number; employee: number; employer: number }> = [];

    for (let yr = 1; yr <= years; yr++) {
      const monthlyEmp = currentBasic * 0.12 + currentBasic * (Number(vpfPercent || 0) / 100);
      const monthlyEps = Math.min(currentBasic, EPS_WAGE_CEILING) * 0.0833;
      const monthlyEr = currentBasic * 0.12 - monthlyEps;

      const annualEmp = monthlyEmp * 12;
      const annualEr = monthlyEr * 12;

      totalEmployeeContr += annualEmp;
      totalEmployerContr += annualEr;

      const openingBalance = corpus;
      const interest = (openingBalance + (annualEmp + annualEr) / 2) * (Number(epfRate) / 100);
      totalInterestEarned += interest;
      corpus = openingBalance + annualEmp + annualEr + interest;

      trajectory.push({
        year: yr,
        age: currentAge + yr,
        corpus: Math.round(corpus),
        employee: Math.round(totalEmployeeContr),
        employer: Math.round(totalEmployerContr),
      });

      // Salary hike for next year
      currentBasic *= 1 + Number(annualIncrement) / 100;
    }

    return {
      years,
      finalCorpus: corpus,
      totalEmployeeContr,
      totalEmployerContr,
      totalInterestEarned,
      trajectory,
    };
  }, [currentCorpus, basicSalary, annualIncrement, vpfPercent, epfRate, currentAge, retirementAge]);

  // Calculate EPS-95 Statutory Monthly Pension
  // Formula: (Pensionable Salary * Pensionable Service) / 70
  // Note: Bonus 2 years added if service >= 20 years
  const epsPensionResult = useMemo(() => {
    const bonusService = pensionServiceYears >= 20 ? 2 : 0;
    const effectiveService = Math.min(35, pensionServiceYears + bonusService);
    const monthlyPension = (pensionSalary * effectiveService) / 70;
    return {
      monthlyPension: Math.round(monthlyPension),
      annualPension: Math.round(monthlyPension * 12),
      bonusService,
      effectiveService,
    };
  }, [pensionSalary, pensionServiceYears]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Calculator 1: EPF & VPF Compounding Maturity Projector ── */}
      <div
        style={{
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          borderRadius: 20,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              padding: 8,
              borderRadius: 10,
              background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
              color: THEME.accent,
            }}
          >
            <TrendingUp size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: THEME.ink }}>
              EPF &amp; VPF Retirement Corpus Projector
            </h3>
            <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
              Factor in your Basic + DA, expected salary hikes, VPF voluntary boost, and sovereign 8.25% compounding
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          <Field label="Monthly Basic + DA (₹)">
            <input
              type="number"
              style={inputStyle}
              value={basicSalary}
              onChange={(e) => setBasicSalary(Number(e.target.value))}
            />
          </Field>
          <Field label="Annual Salary Hike (%)">
            <input
              type="number"
              style={inputStyle}
              value={annualIncrement}
              onChange={(e) => setAnnualIncrement(Number(e.target.value))}
            />
          </Field>
          <Field label="VPF Contribution (% of Basic)">
            <input
              type="number"
              style={inputStyle}
              value={vpfPercent}
              onChange={(e) => setVpfPercent(Number(e.target.value))}
              placeholder="0 to 88%"
            />
          </Field>
          <Field label="EPFO Rate (% p.a.)">
            <input
              type="number"
              step="0.05"
              style={inputStyle}
              value={epfRate}
              onChange={(e) => setEpfRate(Number(e.target.value))}
            />
          </Field>
          <Field label="Current Age">
            <input
              type="number"
              style={inputStyle}
              value={currentAge}
              onChange={(e) => setCurrentAge(Number(e.target.value))}
            />
          </Field>
          <Field label="Retirement Age">
            <input
              type="number"
              style={inputStyle}
              value={retirementAge}
              onChange={(e) => setRetirementAge(Number(e.target.value))}
            />
          </Field>
        </div>

        {/* Projection KPI Summary */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            background: "var(--surface-1)",
            padding: 16,
            borderRadius: 14,
            border: `1px solid ${THEME.line}`,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Projected EPF Corpus</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: THEME.accent, marginTop: 4 }}>
              {fmtINRFull(epfProjection.finalCorpus)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Total Employee Share + VPF</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: THEME.ink, marginTop: 4 }}>
              {fmtINRFull(epfProjection.totalEmployeeContr)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Total Employer Share</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: THEME.cyan, marginTop: 4 }}>
              {fmtINRFull(epfProjection.totalEmployerContr)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Total Compounded Interest</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: THEME.sage, marginTop: 4 }}>
              {fmtINRFull(epfProjection.totalInterestEarned)}
            </div>
          </div>
        </div>

        {/* Growth Area Chart */}
        <div style={{ height: 260, marginTop: 10 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={epfProjection.trajectory}>
              <defs>
                <linearGradient id="epfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={THEME.accent} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={THEME.accent} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} opacity={0.6} />
              <XAxis dataKey="age" stroke={THEME.muted} fontSize={11} label={{ value: "Age", position: "insideBottom", offset: -5 }} />
              <YAxis stroke={THEME.muted} fontSize={11} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
              <Tooltip formatter={(v: any) => [fmtINRFull(Number(v)), "Projected Corpus"]} />
              <Area type="monotone" dataKey="corpus" stroke={THEME.accent} strokeWidth={2.5} fillOpacity={1} fill="url(#epfGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Calculator 2: EPS-95 Statutory Monthly Pension Estimator ── */}
      <div
        style={{
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          borderRadius: 20,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              padding: 8,
              borderRadius: 10,
              background: `color-mix(in srgb, ${THEME.gold} 12%, transparent)`,
              color: THEME.gold,
            }}
          >
            <Coins size={22} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: THEME.ink }}>
              EPS-95 Statutory Monthly Pension Estimator
            </h3>
            <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
              Statutory EPFO formula: <code>Monthly Pension = (Pensionable Salary × Pensionable Service) / 70</code>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 16,
          }}
        >
          <Field label="Pensionable Salary (Wage Ceiling ₹15,000 / Actual)">
            <input
              type="number"
              style={inputStyle}
              value={pensionSalary}
              onChange={(e) => setPensionSalary(Number(e.target.value))}
            />
          </Field>
          <Field label="Total Pensionable Service (Years)">
            <input
              type="number"
              style={inputStyle}
              value={pensionServiceYears}
              onChange={(e) => setPensionServiceYears(Number(e.target.value))}
            />
          </Field>
        </div>

        <div
          style={{
            background: `color-mix(in srgb, ${THEME.gold} 6%, var(--surface-1))`,
            border: `1px solid ${THEME.gold}30`,
            borderRadius: 14,
            padding: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
              Estimated Lifelong Monthly Pension
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color: THEME.gold, marginTop: 4 }}>
              {fmtINRFull(epsPensionResult.monthlyPension)} / month
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
              Annual Pension: <strong>{fmtINRFull(epsPensionResult.annualPension)} / year</strong>
            </div>
          </div>

          <div style={{ fontSize: 12, color: THEME.muted, maxWidth: 300, lineHeight: 1.5 }}>
            {epsPensionResult.bonusService > 0 ? (
              <span style={{ color: THEME.sage, fontWeight: 700 }}>
                ✓ +2 Years bonus service awarded for completing 20+ years of continuous service!
              </span>
            ) : (
              <span>Complete 20 years of service to receive an additional 2 years bonus service weighting.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-COMPONENT: Tax Engine & Threshold Monitor ──────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function EPFTaxEngineView({
  accounts,
  transactions,
  portfolioStats,
}: {
  accounts: EPFItem[];
  transactions: any[];
  portfolioStats: any;
}) {
  const currentFY = getCurrentFY();

  // Current FY employee contribution
  const currentFYEmployeeContr = useMemo(() => {
    return transactions
      .filter((t) => getFinancialYear(t.date) === currentFY)
      .reduce((sum, t) => {
        if (t.type === "monthly_contribution") return sum + Number(t.employeeShare || 0);
        if (t.type === "employee_contribution" || t.type === "vpf_contribution") return sum + Number(t.amount || 0);
        return sum;
      }, 0);
  }, [transactions, currentFY]);

  const taxFreeThreshold = EPF_ANNUAL_TAX_FREE_THRESHOLD;
  const isExceeded = currentFYEmployeeContr > taxFreeThreshold;
  const excessContr = Math.max(0, currentFYEmployeeContr - taxFreeThreshold);
  const estimatedTaxableInterest = excessContr * (DEFAULT_EPFO_INTEREST_RATE / 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Overview Banner */}
      <div
        style={{
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          borderRadius: 20,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Scale size={22} color={THEME.accent} />
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: THEME.ink }}>
              Section 10(11) &amp; 10(12) ₹2.5 Lakh Annual Tax Threshold Tracker
            </h3>
            <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
              Since Finance Act 2021, interest earned on employee contribution exceeding ₹2.5 Lakh/year is taxable as "Income from Other Sources".
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            background: "var(--surface-1)",
            padding: 18,
            borderRadius: 14,
            border: `1px solid ${THEME.line}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
            <span>
              <strong>{currentFY}</strong> Employee + VPF Contribution:{" "}
              <strong>{fmtINRFull(currentFYEmployeeContr)}</strong>
            </span>
            <span>
              Tax-Free Limit: <strong>₹2,50,000</strong>
            </span>
          </div>

          <div
            style={{
              height: 10,
              borderRadius: 5,
              background: "var(--surface-2)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${Math.min(100, (currentFYEmployeeContr / taxFreeThreshold) * 100)}%`,
                background: isExceeded ? THEME.rust : THEME.accent,
                borderRadius: 5,
                transition: "width 0.4s ease",
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 12,
              fontSize: 12,
            }}
          >
            {isExceeded ? (
              <span style={{ color: THEME.rust, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={14} /> Threshold Exceeded by {fmtINRFull(excessContr)}! Taxable interest: ~{fmtINRFull(estimatedTaxableInterest)} / yr
              </span>
            ) : (
              <span style={{ color: THEME.sage, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                <CheckCircle2 size={14} /> {fmtINRFull(taxFreeThreshold - currentFYEmployeeContr)} tax-free contribution room remaining in {currentFY}
              </span>
            )}
            <Badge variant={isExceeded ? "danger" : "success"}>
              {((currentFYEmployeeContr / taxFreeThreshold) * 100).toFixed(0)}% of Limit
            </Badge>
          </div>
        </div>
      </div>

      {/* Tax Rules Cheat Sheet */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        <div
          style={{
            background: "var(--surface-0)",
            border: `1px solid ${THEME.line}`,
            borderRadius: 16,
            padding: 20,
          }}
        >
          <h4 style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 800, color: THEME.ink }}>
            1. Section 80C Deduction (₹1.5L)
          </h4>
          <p style={{ margin: 0, fontSize: 12, color: THEME.muted, lineHeight: 1.6 }}>
            Your 12% employee contribution is eligible for tax deduction under Section 80C (up to the overall ₹1,50,000 cap under the Old Tax Regime).
          </p>
        </div>

        <div
          style={{
            background: "var(--surface-0)",
            border: `1px solid ${THEME.line}`,
            borderRadius: 16,
            padding: 20,
          }}
        >
          <h4 style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 800, color: THEME.ink }}>
            2. 5-Year Continuous Service Rule
          </h4>
          <p style={{ margin: 0, fontSize: 12, color: THEME.muted, lineHeight: 1.6 }}>
            Withdrawals before 5 years of continuous service are taxable (unless due to ill-health or business closure). Always transfer EPF via Form 13 to preserve service continuity.
          </p>
        </div>

        <div
          style={{
            background: "var(--surface-0)",
            border: `1px solid ${THEME.line}`,
            borderRadius: 16,
            padding: 20,
          }}
        >
          <h4 style={{ margin: "0 0 8px 0", fontSize: 14, fontWeight: 800, color: THEME.ink }}>
            3. Employer Share &gt; ₹7.5 Lakh Tax
          </h4>
          <p style={{ margin: 0, fontSize: 12, color: THEME.muted, lineHeight: 1.6 }}>
            Employer contributions exceeding ₹7,50,000 annually across EPF, NPS, and Superannuation are treated as a taxable perquisite under Section 17(2)(vii).
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-COMPONENT: EPFO Rules & Claims Guide ───────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function EPFGuideView() {
  const forms = [
    {
      form: "Form 19",
      title: "Final EPF Settlement",
      description: "Full withdrawal of EPF corpus upon retirement (58 yrs) or after 2 months of unemployment.",
      tax: "Tax-free if total continuous service >= 5 years.",
    },
    {
      form: "Form 10C",
      title: "EPS Pension Withdrawal / Scheme Certificate",
      description: "Withdraw EPS pension corpus if service < 10 years, or obtain Scheme Certificate to preserve pension rights.",
      tax: "Subject to standard income tax if service < 5 years.",
    },
    {
      form: "Form 31",
      title: "EPF Non-Refundable Advance",
      description: "Partial withdrawal for specific purposes: House construction/purchase, Medical emergency, Marriage, or COVID/unemployment.",
      tax: "Completely Tax-Free. No repayment required.",
    },
    {
      form: "Form 13",
      title: "EPF Transfer (Old to New Employer)",
      description: "Online transfer of previous establishment balance to new employer. Preserves continuous service years for tax exemptions.",
      tax: "100% Tax-Free transfer.",
    },
    {
      form: "Form 10D",
      title: "Monthly Pension Application",
      description: "Claim lifelong monthly pension after attaining age 58 with minimum 10 years eligible service.",
      tax: "Pension received is taxable as Salary income.",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          borderRadius: 20,
          padding: 24,
        }}
      >
        <h3 style={{ margin: "0 0 6px 0", fontSize: 18, fontWeight: 800, color: THEME.ink }}>
          EPFO Online Claims &amp; Withdrawal Forms Guide
        </h3>
        <p style={{ margin: "0 0 20px 0", fontSize: 13, color: THEME.muted }}>
          Understand the right EPFO claim forms to file on the Unified Member Portal for seamless settlement.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {forms.map((f) => (
            <div
              key={f.form}
              style={{
                background: "var(--surface-1)",
                border: `1px solid ${THEME.line}`,
                borderRadius: 14,
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Badge variant="accent">{f.form}</Badge>
                  <span style={{ fontSize: 15, fontWeight: 800, color: THEME.ink }}>{f.title}</span>
                </div>
                <div style={{ fontSize: 13, color: THEME.muted, marginTop: 6, lineHeight: 1.5 }}>
                  {f.description}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: THEME.sage,
                  background: `color-mix(in srgb, ${THEME.sage} 10%, transparent)`,
                  padding: "6px 12px",
                  borderRadius: 8,
                  whiteSpace: "nowrap",
                }}
              >
                {f.tax}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-COMPONENT: Add/Edit Account Modal ──────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function AddEditEPFAccountModal({
  initial,
  onClose,
  onSave,
  familyProfiles = [],
}: {
  initial?: EPFItem | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  familyProfiles: any[];
}) {
  const [form, setForm] = useState({
    uan: initial?.uan || initial?.accountNumber || "",
    employer: initial?.employer || initial?.bank || "",
    balance: initial?.balance != null ? String(initial?.balance) : "",
    owner: initial?.owner || "",
    nominee: initial?.nominee || "",
    notes: initial?.notes || "",
  });

  const { run: handleSave, loading } = useAsyncAction(async () => {
    await onSave({
      uan: form.uan,
      accountNumber: form.uan,
      employer: form.employer,
      bank: form.employer,
      balance: form.balance ? Number(form.balance) : 0,
      owner: form.owner,
      nominee: form.nominee,
      notes: form.notes,
    });
  });

  return (
    <Modal title={initial ? "Edit EPF Account" : "Add EPF Account"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Employer Name">
          <input
            style={inputStyle}
            placeholder="e.g. Tata Consultancy Services / Google"
            value={form.employer}
            onChange={(e) => setForm({ ...form, employer: e.target.value })}
          />
        </Field>

        <Field label="Universal Account Number (UAN)">
          <input
            style={inputStyle}
            placeholder="12-digit UAN (e.g. 101234567890)"
            value={form.uan}
            onChange={(e) => setForm({ ...form, uan: e.target.value })}
          />
        </Field>

        <Field label="Current EPF Corpus Estimate (₹) (Fallback if no passbook)">
          <input
            type="number"
            style={inputStyle}
            placeholder="e.g. 500000"
            value={form.balance}
            onChange={(e) => setForm({ ...form, balance: e.target.value })}
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Account Owner">
            <select
              style={inputStyle}
              value={form.owner}
              onChange={(e) => setForm({ ...form, owner: e.target.value })}
            >
              <option value="">Select Owner</option>
              {familyProfiles.map((p) => (
                <option key={p.id} value={p.name}>
                  {formatProfileOption(p)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Nominee">
            <input
              style={inputStyle}
              placeholder="e.g. Spouse / Dependent"
              value={form.nominee}
              onChange={(e) => setForm({ ...form, nominee: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Notes">
          <textarea
            style={{ ...inputStyle, minHeight: 60 }}
            placeholder="Optional notes or Member ID details"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>

        <ModalActions
          onClose={onClose}
          onSave={handleSave}
          saveText={initial ? "Save Changes" : "Add Account"}
          loading={loading}
        />
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-COMPONENT: Add/Edit EPF Transaction Modal ──────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function AddEditEPFTransactionModal({
  account,
  initial,
  onClose,
  onSave,
}: {
  account: EPFItem;
  initial?: any;
  onClose: () => void;
  onSave: (form: any) => Promise<void>;
}) {
  const ests = account.establishments || [];
  const [form, setForm] = useState(() => ({
    date: initial?.date || today(),
    type: initial?.type || "monthly_contribution",
    wageMonth: initial?.wageMonth || "",
    particulars: initial?.particulars || "",
    epfWages: initial?.epfWages != null ? String(initial.epfWages) : "",
    epsWages: initial?.epsWages != null ? String(initial.epsWages) : "",
    employeeShare: initial?.employeeShare != null ? String(initial.employeeShare) : "",
    employerShare: initial?.employerShare != null ? String(initial.employerShare) : "",
    pensionShare: initial?.pensionShare != null ? String(initial.pensionShare) : "",
    amount: initial?.amount != null ? String(initial.amount) : "",
    note: initial?.note || "",
    estId: initial?.estId || (ests[0]?.id || ""),
    fromEmployer: initial?.fromEmployer || "",
  }));

  // Auto-calculate splits on EPF wages change for monthly contributions
  const handleWageChange = (w: string) => {
    const num = Number(w || 0);
    const epsWage = Math.min(num, EPS_WAGE_CEILING);
    const emp12 = Math.round(num * 0.12);
    const eps833 = Math.round(epsWage * 0.0833);
    const er367 = emp12 - eps833;

    setForm((prev) => ({
      ...prev,
      epfWages: w,
      epsWages: String(epsWage),
      employeeShare: String(emp12),
      employerShare: String(er367),
      pensionShare: String(eps833),
      amount: String(emp12),
    }));
  };

  const { run: handleSave, loading } = useAsyncAction(async () => {
    await onSave(form);
  });

  const isMonthly = form.type === "monthly_contribution";
  const isInterest = form.type === "interest_credit";
  const isTransfer = form.type === "transfer_in";

  return (
    <Modal title={initial ? "Edit Passbook Transaction" : "Add Passbook Transaction"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Transaction Type">
            <select
              style={inputStyle}
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {EPF_TX_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Transaction Date">
            <input
              type="date"
              style={inputStyle}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </Field>
        </div>

        {ests.length > 0 && (
          <Field label="Establishment / Employer">
            <select
              style={inputStyle}
              value={form.estId}
              onChange={(e) => setForm({ ...form, estId: e.target.value })}
            >
              <option value="">(Select Establishment)</option>
              {ests.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.employerName} {e.estId ? `(${e.estId})` : ""}
                </option>
              ))}
            </select>
          </Field>
        )}

        {isMonthly && (
          <>
            <Field label="Wage Month (e.g. Apr-2025)">
              <input
                style={inputStyle}
                placeholder="e.g. Apr-2025"
                value={form.wageMonth}
                onChange={(e) => setForm({ ...form, wageMonth: e.target.value })}
              />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="EPF Wages (₹) (Auto-calculates splits)">
                <input
                  type="number"
                  style={inputStyle}
                  placeholder="e.g. 50000"
                  value={form.epfWages}
                  onChange={(e) => handleWageChange(e.target.value)}
                />
              </Field>
              <Field label="EPS Wages (₹) (Capped at ₹15,000)">
                <input
                  type="number"
                  style={inputStyle}
                  value={form.epsWages}
                  onChange={(e) => setForm({ ...form, epsWages: e.target.value })}
                />
              </Field>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              <Field label="Employee 12% (₹)">
                <input
                  type="number"
                  style={inputStyle}
                  value={form.employeeShare}
                  onChange={(e) => setForm({ ...form, employeeShare: e.target.value })}
                />
              </Field>
              <Field label="Employer 3.67% (₹)">
                <input
                  type="number"
                  style={inputStyle}
                  value={form.employerShare}
                  onChange={(e) => setForm({ ...form, employerShare: e.target.value })}
                />
              </Field>
              <Field label="Pension 8.33% (₹)">
                <input
                  type="number"
                  style={inputStyle}
                  value={form.pensionShare}
                  onChange={(e) => setForm({ ...form, pensionShare: e.target.value })}
                />
              </Field>
            </div>
          </>
        )}

        {isInterest && (
          <>
            <Field label="Interest Particulars / FY">
              <input
                style={inputStyle}
                placeholder="e.g. EPFO Interest FY 2024-25 @ 8.25%"
                value={form.particulars}
                onChange={(e) => setForm({ ...form, particulars: e.target.value })}
              />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Employee Share Interest (₹)">
                <input
                  type="number"
                  style={inputStyle}
                  value={form.employeeShare}
                  onChange={(e) => setForm({ ...form, employeeShare: e.target.value })}
                />
              </Field>
              <Field label="Employer Share Interest (₹)">
                <input
                  type="number"
                  style={inputStyle}
                  value={form.employerShare}
                  onChange={(e) => setForm({ ...form, employerShare: e.target.value })}
                />
              </Field>
            </div>
          </>
        )}

        {isTransfer && (
          <>
            <Field label="From Employer Name (Previous Company)">
              <input
                style={inputStyle}
                placeholder="e.g. Infosys Ltd"
                value={form.fromEmployer}
                onChange={(e) => setForm({ ...form, fromEmployer: e.target.value })}
              />
            </Field>
            <Field label="Total Transferred Amount (₹)">
              <input
                type="number"
                style={inputStyle}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </Field>
          </>
        )}

        {!isMonthly && !isInterest && !isTransfer && (
          <Field label="Amount (₹)">
            <input
              type="number"
              style={inputStyle}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </Field>
        )}

        <Field label="Note / Reference">
          <input
            style={inputStyle}
            placeholder="Optional note"
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </Field>

        <ModalActions
          onClose={onClose}
          onSave={handleSave}
          saveText={initial ? "Save Transaction" : "Add Entry"}
          loading={loading}
        />
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-COMPONENT: Add/Edit Establishment Modal ────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function AddEditEstablishmentModal({
  account,
  initial,
  onClose,
  onSave,
}: {
  account: EPFItem;
  initial?: EPFEstablishment | null;
  onClose: () => void;
  onSave: (form: any) => Promise<void>;
}) {
  const [form, setForm] = useState({
    employerName: initial?.employerName || "",
    estId: initial?.estId || "",
    memberId: initial?.memberId || "",
    joiningDate: initial?.joiningDate || "",
    exitDate: initial?.exitDate || "",
    ncpDays: initial?.ncpDays != null ? String(initial.ncpDays) : "0",
    notes: initial?.notes || "",
  });

  const { run: handleSave, loading } = useAsyncAction(async () => {
    await onSave(form);
  });

  return (
    <Modal title={initial ? "Edit Establishment History" : "Add Establishment History"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <Field label="Employer Name">
          <input
            style={inputStyle}
            placeholder="e.g. Wipro / Microsoft"
            value={form.employerName}
            onChange={(e) => setForm({ ...form, employerName: e.target.value })}
          />
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Establishment ID (Est ID)">
            <input
              style={inputStyle}
              placeholder="e.g. DSNHP0012345000"
              value={form.estId}
              onChange={(e) => setForm({ ...form, estId: e.target.value })}
            />
          </Field>
          <Field label="Member ID">
            <input
              style={inputStyle}
              placeholder="e.g. DSNHP0012345000001"
              value={form.memberId}
              onChange={(e) => setForm({ ...form, memberId: e.target.value })}
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Date of Joining">
            <input
              type="date"
              style={inputStyle}
              value={form.joiningDate}
              onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
            />
          </Field>
          <Field label="Date of Exit (Leave blank if Current)">
            <input
              type="date"
              style={inputStyle}
              value={form.exitDate}
              onChange={(e) => setForm({ ...form, exitDate: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Non-Contributing Period (NCP Days)">
          <input
            type="number"
            style={inputStyle}
            placeholder="0"
            value={form.ncpDays}
            onChange={(e) => setForm({ ...form, ncpDays: e.target.value })}
          />
        </Field>

        <ModalActions
          onClose={onClose}
          onSave={handleSave}
          saveText={initial ? "Save Changes" : "Add Establishment"}
          loading={loading}
        />
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-COMPONENT: CSV Import Modal ────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function EPFCsvImportModal({
  account,
  onClose,
  onImport,
}: {
  account: EPFItem;
  onClose: () => void;
  onImport: (rows: EPFTransaction[]) => Promise<void>;
}) {
  const [csvText, setCsvText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleDownloadTemplate = () => {
    const template =
      "# EPF Passbook Import Template\nDate,Type,WageMonth,Particulars,EPFWages,EPSWages,EmployeeShare,EmployerShare,PensionShare,Amount,Note\n2025-04-30,monthly_contribution,Apr-2025,Monthly Contribution,50000,15000,6000,4750,1250,6000,April 2025 PF\n2026-03-31,interest_credit,,EPFO Interest FY 2025-26,,,41250,15000,0,56250,Interest Credit @ 8.25%";
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "epf_passbook_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleParseAndImport = async () => {
    try {
      setError(null);
      const lines = csvText.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
      if (lines.length < 2) {
        setError("Please paste a valid CSV with at least one data row.");
        return;
      }

      const rows: EPFTransaction[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim());
        if (cols.length >= 2) {
          rows.push({
            id: uid(),
            date: cols[0] || today(),
            type: cols[1] || "monthly_contribution",
            wageMonth: cols[2] || "",
            particulars: cols[3] || "",
            epfWages: Number(cols[4] || 0),
            epsWages: Number(cols[5] || 0),
            employeeShare: Number(cols[6] || 0),
            employerShare: Number(cols[7] || 0),
            pensionShare: Number(cols[8] || 0),
            amount: Number(cols[9] || cols[6] || 0),
            note: cols[10] || "",
          });
        }
      }

      if (rows.length === 0) {
        setError("No valid rows parsed from CSV.");
        return;
      }

      await onImport(rows);
    } catch (e: any) {
      setError(`Import failed: ${e?.message || "Invalid format"}`);
    }
  };

  return (
    <Modal title={`Import Passbook CSV for ${account.employer || "EPF Account"}`} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: THEME.muted }}>
            Paste CSV rows or download sample template:
          </span>
          <Button variant="outline" size="sm" icon={<Download size={13} />} onClick={handleDownloadTemplate}>
            Download Template
          </Button>
        </div>

        <textarea
          style={{ ...inputStyle, minHeight: 160, fontFamily: "monospace", fontSize: 11 }}
          placeholder="Paste CSV contents here..."
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
        />

        {error && (
          <div style={{ color: THEME.rust, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        <ModalActions onClose={onClose} onSave={handleParseAndImport} saveText="Import Transactions" />
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-COMPONENT: Empty State ─────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function EPFEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      style={{
        padding: "60px 30px",
        textAlign: "center",
        background: "var(--surface-0)",
        border: `1.5px dashed ${THEME.line}`,
        borderRadius: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 18,
          background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: THEME.accent,
          marginBottom: 18,
        }}
      >
        <Shield size={36} />
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: THEME.ink, margin: "0 0 8px 0" }}>
        No EPF Accounts Added Yet
      </h2>
      <p style={{ fontSize: 13, color: THEME.muted, maxWidth: 440, margin: "0 0 24px 0", lineHeight: 1.6 }}>
        Track your Employee Provident Fund (EPFO) — dual employee &amp; employer contributions, EPS-95 pension, Form 13 transfers, and sovereign 8.25% compounding.
      </p>
      <Button variant="accent" icon={<Plus size={15} />} onClick={onAdd}>
        Add EPF Account
      </Button>
    </div>
  );
}

/* ── Common Styles ── */
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 8,
  border: `1px solid ${THEME.line}`,
  background: "var(--surface-1)",
  color: THEME.ink,
  fontSize: 13,
};

const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  textAlign: "left",
  fontWeight: 700,
  fontSize: 10,
  color: THEME.muted,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 12,
  color: THEME.ink,
};

const iconBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: THEME.muted,
  padding: 5,
  borderRadius: 4,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
