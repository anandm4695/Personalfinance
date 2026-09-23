/* eslint-disable */
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Plus,
  FileUp,
  Pencil,
  Trash2,
  Check,
  X,
  Building2,
  ReceiptText,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  PiggyBank,
  Briefcase,
  Banknote,
  Handshake,
  Lock,
  PieChart as PieIcon,
  Landmark,
  Search,
  Link2,
  ChevronLeft,
  ChevronRight,
  Download,
  User,
  ArrowLeftRight,
  Copy,
  CheckCheck,
  BarChart3,
  Layers,
  ShieldCheck,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { THEME } from "../../utils/constants";
import {
  today,
  autoCateg,
  getLocalDateString,
  addMonthsToDateStr,
  getEffectiveRent,
  fmtINR,
  fmtINRFull,
  loanOutstanding,
} from "../../utils/finance";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Drawer } from "../ui/Drawer";
import { Field } from "../ui/Form";
import { Badge } from "../ui/Badge";
import { ConfirmDialog } from "../ui/Feedback";
import { Button } from "../ui/Button";
import { BankEditModal } from "../modals/BankEditModal";
import { CsvImportModal } from "../modals/CsvImportModal";
import { SectionTitle } from "../ui/SectionTitle";
import { DataTable } from "../design-system/DataTable";
import { Card } from "../ui/Card";
import { StatCard } from "../ui/StatCard";
import { EmptyState } from "../ui/EmptyState";
import {
  BankLogo,
  resolveBankDomain,
  bankInitialsColor,
  CANONICAL_BRANDS,
} from "../ui/BrandLogos";

export { BankLogo, resolveBankDomain, bankInitialsColor };
export const BANK_LOGO_DOMAINS: Record<string, string> = Object.fromEntries(
  Object.entries(CANONICAL_BRANDS).map(([k, v]) => [k, v.domain])
);

// Account type visual themes
const ACCOUNT_TYPE_THEMES: Record<
  string,
  { color: string; bg: string; icon: typeof PiggyBank; label: string }
> = {
  savings: {
    color: THEME.cyan,
    bg: `color-mix(in srgb, ${THEME.cyan} 10%, transparent)`,
    icon: PiggyBank,
    label: "Savings",
  },
  current: {
    color: THEME.sage,
    bg: `color-mix(in srgb, ${THEME.sage} 10%, transparent)`,
    icon: Briefcase,
    label: "Current",
  },
  salary: {
    color: THEME.violet,
    bg: `color-mix(in srgb, ${THEME.violet} 10%, transparent)`,
    icon: Banknote,
    label: "Salary",
  },
  joint: {
    color: THEME.gold,
    bg: `color-mix(in srgb, ${THEME.gold} 10%, transparent)`,
    icon: Handshake,
    label: "Joint",
  },
  fd: {
    color: THEME.rust,
    bg: `color-mix(in srgb, ${THEME.rust} 10%, transparent)`,
    icon: Lock,
    label: "Fixed Deposit",
  },
  other: {
    color: THEME.muted,
    bg: `color-mix(in srgb, ${THEME.line} 25%, transparent)`,
    icon: Building2,
    label: "Other Account",
  },
};

const CHART_PALETTE = [
  THEME.accent,
  THEME.sage,
  THEME.gold,
  THEME.rust,
  THEME.violet,
  THEME.pink,
  THEME.cyan,
  THEME.muted,
  `color-mix(in srgb, ${THEME.accent} 60%, ${THEME.sage} 40%)`,
  `color-mix(in srgb, ${THEME.gold} 60%, ${THEME.rust} 40%)`,
  `color-mix(in srgb, ${THEME.violet} 60%, ${THEME.pink} 40%)`,
  `color-mix(in srgb, ${THEME.cyan} 60%, ${THEME.accent} 40%)`,
  `color-mix(in srgb, ${THEME.sage} 60%, ${THEME.cyan} 40%)`,
  `color-mix(in srgb, ${THEME.rust} 60%, ${THEME.pink} 40%)`,
  `color-mix(in srgb, ${THEME.gold} 60%, ${THEME.violet} 40%)`,
];

export const POPULAR_INDIAN_BANKS = [
  "HDFC Bank",
  "State Bank of India (SBI)",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Bank of Baroda",
  "Punjab National Bank (PNB)",
  "Canara Bank",
  "IndusInd Bank",
  "IDFC FIRST Bank",
  "Union Bank of India",
  "Yes Bank",
  "Federal Bank",
  "Standard Chartered Bank",
  "HSBC Bank",
  "Citibank",
  "RBL Bank",
  "AU Small Finance Bank",
  "Bandhan Bank",
  "Indian Bank",
];

function getAccountTheme(type: string) {
  const t = (type || "savings").toLowerCase();
  if (t.includes("salary")) return ACCOUNT_TYPE_THEMES.salary;
  if (t.includes("joint")) return ACCOUNT_TYPE_THEMES.joint;
  if (t.includes("current")) return ACCOUNT_TYPE_THEMES.current;
  if (t.includes("fd") || t.includes("fixed")) return ACCOUNT_TYPE_THEMES.fd;
  return ACCOUNT_TYPE_THEMES.savings;
}

const accountLabel = (a: any): string => {
  if (!a) return "";
  const last4 = a.accountNumber ? `····${String(a.accountNumber).slice(-4)}` : "";
  const type = a.type ? a.type : "";
  const suffix = [type, last4].filter(Boolean).join(" ");
  return suffix ? `${a.bankName} (${suffix})` : a.bankName;
};

const OwnerBadge = ({ owner }: { owner?: string }) => {
  const { familyProfiles } = useMasterData();
  if (!owner) return null;
  const p = familyProfiles.find((x) => x.id === owner || x.name === owner);
  const name = p ? p.name : owner === "self" ? "Self" : owner;
  if (!name) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 10,
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

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  salary: { color: THEME.sage, bg: `color-mix(in srgb, ${THEME.sage} 12%, transparent)` },
  income: { color: THEME.sage, bg: `color-mix(in srgb, ${THEME.sage} 12%, transparent)` },
  interest: { color: THEME.sage, bg: `color-mix(in srgb, ${THEME.sage} 12%, transparent)` },
  dividend: { color: THEME.sage, bg: `color-mix(in srgb, ${THEME.sage} 12%, transparent)` },
  savings: { color: THEME.sage, bg: `color-mix(in srgb, ${THEME.sage} 12%, transparent)` },
  transfer: { color: THEME.violet, bg: `color-mix(in srgb, ${THEME.violet} 12%, transparent)` },
  food: { color: THEME.gold, bg: `color-mix(in srgb, ${THEME.gold} 12%, transparent)` },
  dining: { color: THEME.gold, bg: `color-mix(in srgb, ${THEME.gold} 12%, transparent)` },
  groceries: { color: THEME.gold, bg: `color-mix(in srgb, ${THEME.gold} 12%, transparent)` },
  emi: { color: THEME.rust, bg: `color-mix(in srgb, ${THEME.rust} 12%, transparent)` },
  loan: { color: THEME.rust, bg: `color-mix(in srgb, ${THEME.rust} 12%, transparent)` },
  rent: { color: THEME.rust, bg: `color-mix(in srgb, ${THEME.rust} 12%, transparent)` },
  utilities: { color: THEME.cyan, bg: `color-mix(in srgb, ${THEME.cyan} 12%, transparent)` },
  bills: { color: THEME.cyan, bg: `color-mix(in srgb, ${THEME.cyan} 12%, transparent)` },
  "credit card": { color: THEME.rust, bg: `color-mix(in srgb, ${THEME.rust} 12%, transparent)` },
  shopping: { color: THEME.pink, bg: `color-mix(in srgb, ${THEME.pink} 12%, transparent)` },
  travel: { color: THEME.pink, bg: `color-mix(in srgb, ${THEME.pink} 12%, transparent)` },
  health: { color: THEME.rust, bg: `color-mix(in srgb, ${THEME.rust} 12%, transparent)` },
  medical: { color: THEME.rust, bg: `color-mix(in srgb, ${THEME.rust} 12%, transparent)` },
  insurance: { color: THEME.rust, bg: `color-mix(in srgb, ${THEME.rust} 12%, transparent)` },
  investment: { color: THEME.pink, bg: `color-mix(in srgb, ${THEME.pink} 12%, transparent)` },
  subscription: {
    color: THEME.accent as string,
    bg: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
  },
};

function getCategoryStyle(cat: string) {
  const key = (cat || "").toLowerCase().trim();
  for (const [k, v] of Object.entries(CATEGORY_COLORS)) {
    if (key.includes(k)) return v;
  }
  return { color: THEME.muted as string, bg: "rgba(128,128,128,0.08)" };
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: `1.5px solid ${THEME.line}`,
  borderRadius: "var(--radius-md)",
  color: THEME.ink,
  fontSize: 13,
  background: "var(--surface-0)",
  outline: "none",
  transition: "border-color 0.2s ease, box-shadow 0.2s ease",
};

const iconBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: THEME.muted,
  padding: "6px",
  borderRadius: 8,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.15s ease",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  verticalAlign: "middle",
  fontSize: 13,
  borderBottom: `1px solid ${THEME.line}`,
};

export function BanksTab({
  state,
  fullState,
  addItem,
  addTransactions,
  removeItem,
  bulkRemoveTransactions,
  updateItem,
  masterData: _masterData,
  showToast,
}: any) {
  // Navigation Sub-tab
  const [activeTab, setActiveTab] = useState<"accounts" | "ledger" | "analytics" | "transfers">(
    "accounts"
  );

  // Modals & Drawers
  const [showBank, setShowBank] = useState(false);
  const [showTxn, setShowTxn] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editBankId, setEditBankId] = useState<string | null>(null);
  const [editTxnId, setEditTxnId] = useState<string | null>(null);
  const [viewTxnId, setViewTxnId] = useState<string | null>(null);
  const [confirmDeleteAllAcc, setConfirmDeleteAllAcc] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  // Filters & Search
  const [filterAcc, setFilterAcc] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [accountTypeFilter, setAccountTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [activeRange, setActiveRange] = useState<string | null>("all");
  const [copiedAccId, setCopiedAccId] = useState<string | null>(null);

  // Inline Editing
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineSaving, setInlineSaving] = useState(false);
  const [inlineEdit, setInlineEdit] = useState<any>(null);

  // Sorting
  const [sortField, setSortField] = useState<"date" | "amount" | "note" | "category" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Pagination
  const TXN_PAGE_SIZE = 40;
  const [txnPage, setTxnPage] = useState(1);

  const { transactionCategories: txnCats } = useMasterData();

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedAccId(id);
    setTimeout(() => setCopiedAccId(null), 2000);
    showToast?.("Account number copied to clipboard", "info");
  };

  // Auto-post linked transaction handling
  const autoPostLinkedTransaction = async (linkedKey: string, txn: any, txnId: string) => {
    if (!linkedKey) return;
    const ci = linkedKey.indexOf(":");
    if (ci < 0) return;
    const lt = linkedKey.slice(0, ci);
    const lid = linkedKey.slice(ci + 1);
    const amt = Number(txn.amount || 0);
    if (amt <= 0) return;
    const { date, note } = txn;
    const newId = `bank-${txnId}`;

    if (["lic", "termPlans", "investmentPlans"].includes(lt)) {
      const policy = (state[lt] || []).find((p: any) => p.id === lid);
      if (!policy) return;
      await updateItem(lt, lid, {
        transactions: [...(policy.transactions || []), { id: newId, date, amount: String(amt) }],
        premiumPaid: Number(policy.premiumPaid || 0) + amt,
      });
    } else if (lt === "loansTaken") {
      const loan = (state.loansTaken || []).find((l: any) => l.id === lid);
      if (!loan) return;
      const outstandingBefore = loanOutstanding(loan);
      const monthlyRate = Number(loan.rate || 0) / 100 / 12;
      const interestPortion = outstandingBefore * monthlyRate;
      const principalPortion = Math.min(outstandingBefore, Math.max(0, amt - interestPortion));
      await Promise.all([
        updateItem("loansTaken", lid, {
          outstanding: Math.max(0, outstandingBefore - principalPortion),
          monthsRemaining: Math.max(0, Number(loan.monthsRemaining || 0) - 1),
        }),
        updateItem("transactions", txnId, { linkedPrincipalAmount: principalPortion }),
      ]);
    } else if (lt === "rentedProperties") {
      const prop = (state.rentedProperties || []).find((p: any) => p.id === lid);
      if (!prop) return;
      await updateItem("rentedProperties", lid, {
        payments: [
          ...(prop.payments || []),
          {
            id: newId,
            month: (date || "").slice(0, 7),
            date,
            amount: String(amt),
            note: note || "",
          },
        ],
      });
    } else if (lt === "rentalProperties") {
      const prop = (state.rentalProperties || []).find((p: any) => p.id === lid);
      if (!prop) return;
      await updateItem("rentalProperties", lid, {
        receipts: [
          ...(prop.receipts || []),
          {
            id: newId,
            month: (date || "").slice(0, 7),
            date,
            amount: String(amt),
            note: note || "",
          },
        ],
      });
    } else if (lt === "creditCards") {
      const card = (state.creditCards || []).find((c: any) => c.id === lid);
      if (!card) return;
      await updateItem("creditCards", lid, {
        transactions: [
          ...(card.transactions || []),
          {
            id: newId,
            date,
            merchant: note || "Payment from Bank Account",
            amount: String(-amt),
            category: "Payment",
          },
        ],
        outstanding: Number(card.outstanding || 0) - amt,
      });
    } else if (lt === "realEstateProperties") {
      const sep = lid.indexOf(":");
      const propId = sep >= 0 ? lid.slice(0, sep) : lid;
      const costField = sep >= 0 ? lid.slice(sep + 1) : "stampDuty";
      const prop = (state.realEstateProperties || []).find((p: any) => p.id === propId);
      if (!prop) return;
      await updateItem("realEstateProperties", propId, {
        [costField]: Number(prop[costField] || 0) + amt,
      });
    } else if (lt === "subscriptions") {
      const sub = (state.subscriptions || []).find((s: any) => s.id === lid);
      if (!sub || !sub.renewalDate) return;
      const step =
        sub.cycle === "yearly"
          ? 12
          : sub.cycle === "half-yearly" || sub.cycle === "semi-annual"
            ? 6
            : sub.cycle === "quarterly"
              ? 3
              : 1;
      await updateItem("subscriptions", lid, {
        renewalDate: addMonthsToDateStr(sub.renewalDate, step),
        lastPaidAmount: amt,
      });
    }
  };

  const { run: saveBankEdit, loading: savingBankEdit } = useAsyncAction(
    async (id: string, v: any) => {
      setEditBankId(null);
      await updateItem("bankAccounts", id, v);
    },
    {
      onSuccess: () => {
        showToast?.("Bank account updated successfully", "success");
      },
      onError: (e: any) =>
        showToast?.(`Failed to save bank account: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveTxnEdit, loading: savingTxnEdit } = useAsyncAction(
    async (id: string, v: any) => {
      setEditTxnId(null);
      await updateItem("transactions", id, v);
    },
    {
      onSuccess: () => {
        showToast?.("Transaction updated successfully", "success");
      },
      onError: (e: any) =>
        showToast?.(`Failed to save transaction: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveNewBank, loading: savingNewBank } = useAsyncAction(
    async (v: any) => {
      setShowBank(false);
      await addItem("bankAccounts", v);
    },
    {
      onSuccess: () => {
        showToast?.("Bank account added successfully", "success");
      },
      onError: (e: any) =>
        showToast?.(`Failed to add bank account: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveNewTxn, loading: savingNewTxn } = useAsyncAction(
    async (v: any) => {
      setShowTxn(false);
      if (v.type === "transfer" && v.toAccountId && v.accountId !== v.toAccountId) {
        const srcAcc = state.bankAccounts.find((a: any) => a.id === v.accountId);
        const destAcc = state.bankAccounts.find((a: any) => a.id === v.toAccountId);
        await Promise.all([
          addItem("transactions", {
            owner: v.owner,
            date: v.date,
            accountId: v.accountId,
            type: "debit",
            amount: v.amount,
            category: "Transfer",
            note: v.note || `Transfer to ${destAcc?.bankName || "account"}`,
            narration: v.narration,
            referenceNumber: v.referenceNumber,
          }),
          addItem("transactions", {
            owner: v.owner,
            date: v.date,
            accountId: v.toAccountId,
            type: "credit",
            amount: v.amount,
            category: "Transfer",
            note: v.note || `Transfer from ${srcAcc?.bankName || "account"}`,
            narration: v.narration,
            referenceNumber: v.referenceNumber,
          }),
        ]);
      } else {
        const { toAccountId: _drop, linkedKey, ...txnBase } = v;
        const ci = linkedKey ? linkedKey.indexOf(":") : -1;
        const linkedType = ci >= 0 ? linkedKey.slice(0, ci) : undefined;
        const linkedId = ci >= 0 ? linkedKey.slice(ci + 1) : undefined;
        const txnId = linkedKey
          ? crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2)
          : undefined;
        await addItem("transactions", {
          ...txnBase,
          ...(txnId ? { id: txnId } : {}),
          ...(linkedType ? { linkedType, linkedId } : {}),
        });
        if (linkedKey) await autoPostLinkedTransaction(linkedKey, v, txnId as string);
      }
    },
    {
      onSuccess: () => {
        showToast?.("Transaction recorded successfully", "success");
      },
      onError: (e: any) =>
        showToast?.(`Failed to save transaction: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const setQuickRange = (preset: string) => {
    const now = new Date();
    const nowLocal = getLocalDateString(now);
    if (preset === "thisMonth") {
      setDateFrom(nowLocal.slice(0, 7) + "-01");
      setDateTo(nowLocal);
    } else if (preset === "lastMonth") {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      setDateFrom(getLocalDateString(prev));
      setDateTo(getLocalDateString(last));
    } else if (preset === "3months") {
      const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      setDateFrom(getLocalDateString(from));
      setDateTo(nowLocal);
    } else if (preset === "thisFY") {
      const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      setDateFrom(`${fyYear}-04-01`);
      setDateTo(nowLocal);
    } else if (preset === "all") {
      setDateFrom("");
      setDateTo("");
    }
    setActiveRange(preset);
  };

  const recurringKeys = useMemo(() => {
    const freq: Record<string, number> = {};
    (state.transactions || []).forEach((t: any) => {
      const key = (t.note || "") + "|" + t.amount + "|" + t.type;
      freq[key] = (freq[key] || 0) + 1;
    });
    return new Set(Object.keys(freq).filter((k) => freq[k] >= 2));
  }, [state.transactions]);

  // Balance calculations and passbook math
  const balanceSource = fullState || state;

  const balanceAfterTxn = useMemo(() => {
    const map: Record<string, { value: number; confirmed: boolean; orderEstimated?: boolean }> = {};
    const byAccount: Record<string, any[]> = {};
    (balanceSource.transactions || []).forEach((t: any) => {
      if (!t.accountId) return;
      (byAccount[t.accountId] ||= []).push(t);
    });
    Object.entries(byAccount).forEach(([accountId, txns]) => {
      const acc = (balanceSource.bankAccounts || []).find((a: any) => a.id === accountId);
      if (!acc) return;
      const signed = (t: any) => (t.type === "credit" ? Number(t.amount || 0) : -Number(t.amount || 0));
      const statementBalanceOf = (t: any): number | null => {
        if (t.statementBalance === undefined || t.statementBalance === null || t.statementBalance === "")
          return null;
        const n = Number(t.statementBalance);
        return isNaN(n) ? null : n;
      };
      const createdAtOf = (t: any): number | null => {
        if (!t.createdAt) return null;
        const n = new Date(t.createdAt).getTime();
        return isNaN(n) ? null : n;
      };
      const withIdx = txns
        .map((t, idx) => ({ t, idx }))
        .sort((a, b) => {
          const byDate = (a.t.date || "").localeCompare(b.t.date || "");
          if (byDate !== 0) return byDate;
          const ca = createdAtOf(a.t);
          const cb = createdAtOf(b.t);
          if (ca !== null && cb !== null && ca !== cb) return ca - cb;
          return b.idx - a.idx;
        });
      let ordered = withIdx.map((x) => x.t);

      const hasGroundTruth = ordered.some((t) => statementBalanceOf(t) !== null);
      if (hasGroundTruth) {
        const firstTruthIdx = ordered.findIndex((t) => statementBalanceOf(t) !== null);
        if (firstTruthIdx > 0) {
          let runningBefore = statementBalanceOf(ordered[firstTruthIdx])!;
          for (let i = firstTruthIdx - 1; i >= 0; i--) {
            runningBefore -= signed(ordered[i + 1]);
            map[ordered[i].id] = { value: runningBefore, confirmed: true };
          }
        }
        let running: number | null = null;
        ordered.forEach((t) => {
          const stmt = statementBalanceOf(t);
          if (stmt !== null) {
            running = stmt;
            map[t.id] = { value: running, confirmed: true };
          } else if (running !== null) {
            running += signed(t);
            map[t.id] = { value: running, confirmed: true };
          }
        });
      } else {
        let running = 0;
        ordered.forEach((t) => {
          running += signed(t);
          map[t.id] = { value: running, confirmed: true };
        });
      }
    });
    return map;
  }, [balanceSource.transactions, balanceSource.bankAccounts]);

  const accountLatestBalance = useMemo(() => {
    const map: Record<string, number> = {};
    const byAccount: Record<string, any[]> = {};
    (balanceSource.transactions || []).forEach((t: any) => {
      if (!t.accountId) return;
      (byAccount[t.accountId] ||= []).push(t);
    });
    Object.entries(byAccount).forEach(([accountId, txns]) => {
      if (txns.length === 0) return;
      const sorted = [...txns].sort((a, b) => {
        const byDate = (a.date || "").localeCompare(b.date || "");
        if (byDate !== 0) return byDate;
        const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return ca - cb;
      });
      const newest = sorted[sorted.length - 1];
      if (newest && balanceAfterTxn[newest.id]) {
        map[accountId] = balanceAfterTxn[newest.id].value;
      } else {
        map[accountId] = txns.reduce(
          (sum, t) => sum + (t.type === "credit" ? Number(t.amount || 0) : -Number(t.amount || 0)),
          0
        );
      }
    });
    return map;
  }, [balanceSource.transactions, balanceAfterTxn]);

  const getDisplayBalance = useCallback(
    (acc: any): number => {
      if (!acc) return 0;
      if (accountLatestBalance[acc.id] !== undefined) {
        return accountLatestBalance[acc.id];
      }
      return Number(acc.balance || 0);
    },
    [accountLatestBalance]
  );

  // Auto-sync bank account balance in DB
  useEffect(() => {
    if (!updateItem || !state.bankAccounts) return;
    state.bankAccounts.forEach((acc: any) => {
      const latest = accountLatestBalance[acc.id];
      if (latest !== undefined && Math.abs(Number(acc.balance || 0) - latest) > 0.001) {
        updateItem("bankAccounts", acc.id, { balance: latest });
      }
    });
  }, [accountLatestBalance, state.bankAccounts, updateItem]);

  const balanceTitle = (bal?: { value: number; confirmed?: boolean }): string | undefined => {
    if (!bal) return undefined;
    return `Passbook balance: ₹${bal.value.toLocaleString("en-IN")}${
      bal.confirmed ? " (Anchored to bank statement)" : " (Calculated)"
    }`;
  };

  // High level financial metrics
  const totalBalance = (state.bankAccounts || []).reduce(
    (acc: number, a: any) => acc + getDisplayBalance(a),
    0
  );
  const now = new Date();
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const isTransferCat = (cat: string) =>
    cat === "Transfer" ||
    cat === "Self Transfer" ||
    cat === "Self-Transfer" ||
    cat === "Investment";

  const monthlyTxns = (state.transactions || []).filter((t: any) => t.date >= startOfMonth);
  const monthlyIncome = monthlyTxns
    .filter((t: any) => t.type === "credit" && !isTransferCat(t.category))
    .reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);
  const monthlyExpense = monthlyTxns
    .filter((t: any) => t.type === "debit" && !isTransferCat(t.category))
    .reduce((acc: number, t: any) => acc + (Number(t.amount) || 0), 0);
  const netMonthlySavings = monthlyIncome - monthlyExpense;
  const monthlySavingsRate =
    monthlyIncome > 0
      ? Math.max(0, Math.min(100, (netMonthlySavings / monthlyIncome) * 100))
      : 0;

  // Average 3-month expense for runway estimation
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const threeMonthsAgoStr = getLocalDateString(threeMonthsAgo);
  const last3mDebits = (state.transactions || [])
    .filter((t: any) => t.date >= threeMonthsAgoStr && t.type === "debit" && !isTransferCat(t.category))
    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
  const avgMonthlyBurn = last3mDebits > 0 ? last3mDebits / 3 : monthlyExpense > 0 ? monthlyExpense : 0;
  const cashRunwayMonths = avgMonthlyBurn > 0 ? totalBalance / avgMonthlyBurn : 0;
  const isHealthyRunway = avgMonthlyBurn <= 0 && totalBalance > 0;
  const runwayDisplay = isHealthyRunway
    ? "> 24 Months"
    : cashRunwayMonths >= 36
      ? "> 36 Months"
      : `${cashRunwayMonths.toFixed(1)} Months`;

  // Animated numbers
  const animTotalBalance = useAnimatedNumber(totalBalance);
  const animMonthlyIncome = useAnimatedNumber(monthlyIncome);
  const animMonthlyExpense = useAnimatedNumber(monthlyExpense);
  const animSavingsRate = useAnimatedNumber(monthlySavingsRate);

  // Filtered transactions
  const filteredTxns = useMemo(() => {
    return (state.transactions || [])
      .filter((t: any) => filterAcc === "all" || t.accountId === filterAcc)
      .filter((t: any) => {
        if (filterType === "all") return true;
        if (filterType === "transfer") return t.category === "Transfer" || t.type === "transfer";
        if (filterType === "linked") return Boolean(t.linkedType);
        return t.type === filterType;
      })
      .filter((t: any) => filterCat === "all" || t.category === filterCat)
      .filter((t: any) => !dateFrom || t.date >= dateFrom)
      .filter((t: any) => !dateTo || t.date <= dateTo)
      .filter((t: any) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          (t.note || "").toLowerCase().includes(q) ||
          (t.category || "").toLowerCase().includes(q) ||
          (t.narration || "").toLowerCase().includes(q) ||
          (t.referenceNumber || "").toLowerCase().includes(q) ||
          String(t.amount || "").includes(q)
        );
      });
  }, [state.transactions, filterAcc, filterType, filterCat, dateFrom, dateTo, search]);

  // Sorted transactions
  const sortedTxns = useMemo(() => {
    let txns = [...filteredTxns];
    if (sortField) {
      txns.sort((a, b) => {
        let valA = a[sortField] || "";
        let valB = b[sortField] || "";
        if (sortField === "amount") {
          valA = Number(valA || 0);
          valB = Number(valB || 0);
        } else {
          valA = String(valA).toLowerCase();
          valB = String(valB).toLowerCase();
        }
        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    } else {
      txns.sort((a, b) => {
        const byDate = new Date(b.date).getTime() - new Date(a.date).getTime();
        if (byDate !== 0) return byDate;
        const ca = a.createdAt ? new Date(a.createdAt).getTime() : NaN;
        const cb = b.createdAt ? new Date(b.createdAt).getTime() : NaN;
        if (!isNaN(ca) && !isNaN(cb) && ca !== cb) return cb - ca;
        return 0;
      });
    }
    return txns;
  }, [filteredTxns, sortField, sortDirection]);

  // Pagination reset
  useEffect(() => {
    setTxnPage(1);
  }, [filterAcc, filterType, filterCat, search, dateFrom, dateTo, sortField, sortDirection]);

  const totalTxnPages = Math.max(1, Math.ceil(sortedTxns.length / TXN_PAGE_SIZE));
  const currentTxnPage = Math.min(txnPage, totalTxnPages);
  const pagedTxns = useMemo(() => {
    return sortedTxns.slice((currentTxnPage - 1) * TXN_PAGE_SIZE, currentTxnPage * TXN_PAGE_SIZE);
  }, [sortedTxns, currentTxnPage]);

  // Account filter for bank cards
  const filteredBankAccounts = useMemo(() => {
    return (state.bankAccounts || []).filter((a: any) => {
      if (accountTypeFilter === "all") return true;
      const t = (a.type || "savings").toLowerCase();
      if (accountTypeFilter === "savings") return t.includes("savings");
      if (accountTypeFilter === "current") return t.includes("current");
      if (accountTypeFilter === "salary") return t.includes("salary");
      if (accountTypeFilter === "fd") return t.includes("fd") || t.includes("fixed");
      if (accountTypeFilter === "joint") return t.includes("joint");
      return true;
    });
  }, [state.bankAccounts, accountTypeFilter]);

  // Liquidity weights & Category spending memo
  const { topSpendCategories, liquidityWeights, monthlyCashFlowTrend, transferList } = useMemo(() => {
    // 1. Spend categories
    const categorySpends: Record<string, number> = {};
    monthlyTxns
      .filter((t: any) => t.type === "debit" && !isTransferCat(t.category))
      .forEach((t: any) => {
        const cat = t.category || "General";
        categorySpends[cat] = (categorySpends[cat] || 0) + Number(t.amount || 0);
      });

    const sortedCats = Object.entries(categorySpends)
      .map(([name, amount], index) => ({
        name,
        amount,
        color: CHART_PALETTE[index % CHART_PALETTE.length],
      }))
      .sort((a, b) => b.amount - a.amount);

    // 2. Liquidity weights
    const positiveAccounts = (state.bankAccounts || []).filter((a: any) => getDisplayBalance(a) > 0);
    const totalAssetBal = positiveAccounts.reduce(
      (s: number, a: any) => s + getDisplayBalance(a),
      0
    );
    const weights = (state.bankAccounts || [])
      .map((a: any, i: number) => {
        const bal = getDisplayBalance(a);
        const share = totalAssetBal > 0 && bal > 0 ? (bal / totalAssetBal) * 100 : 0;
        return {
          id: a.id,
          name: accountLabel(a),
          bankName: a.bankName,
          type: a.type || "Savings",
          accountNumberSuffix: a.accountNumber ? String(a.accountNumber).slice(-4) : "",
          balance: bal,
          share,
          color: CHART_PALETTE[i % CHART_PALETTE.length],
        };
      })
      .sort((a: any, b: any) => b.balance - a.balance);

    // 3. Last 6 Months Cash Flow Trend for Recharts
    const trend: Record<string, { month: string; income: number; expense: number; net: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
      trend[key] = { month: label, income: 0, expense: 0, net: 0 };
    }

    (state.transactions || []).forEach((t: any) => {
      const ym = (t.date || "").slice(0, 7);
      if (trend[ym]) {
        const amt = Number(t.amount || 0);
        if (t.type === "credit" && !isTransferCat(t.category)) {
          trend[ym].income += amt;
        } else if (t.type === "debit" && !isTransferCat(t.category)) {
          trend[ym].expense += amt;
        }
      }
    });

    Object.values(trend).forEach((item) => {
      item.net = item.income - item.expense;
    });

    // 4. Transfers
    const transfers = (state.transactions || []).filter(
      (t: any) => t.category === "Transfer" || t.type === "transfer"
    );

    return {
      topSpendCategories: sortedCats,
      liquidityWeights: weights,
      monthlyCashFlowTrend: Object.values(trend),
      transferList: transfers,
    };
  }, [monthlyTxns, state.bankAccounts, state.transactions, getDisplayBalance]);

  const chartColorById = useMemo(() => {
    const map: Record<string, string> = {};
    liquidityWeights.forEach((w: any) => {
      map[w.id] = w.color;
    });
    return map;
  }, [liquidityWeights]);

  const requestSort = (field: "date" | "amount" | "note" | "category") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const accTxnIdsForDelete = useMemo(() => {
    return filterAcc === "all"
      ? []
      : (state.transactions || [])
          .filter((t: any) => t.accountId === filterAcc)
          .map((t: any) => t.id);
  }, [state.transactions, filterAcc]);

  const exportTxnsToCSV = () => {
    if (!sortedTxns || sortedTxns.length === 0) return;
    const headers = [
      "Date",
      "Account",
      "Type",
      "Category",
      "Particulars / Note",
      "Narration",
      "Reference Number",
      "Debit (INR)",
      "Credit (INR)",
      "Balance (INR)",
    ];
    const csvRows = [
      headers.join(","),
      ...sortedTxns.map((t: any) => {
        const bank = (state.bankAccounts || []).find((b: any) => b.id === t.accountId);
        const bal = balanceAfterTxn[t.id];
        return [
          t.date || "",
          bank ? accountLabel(bank) : "",
          t.type || "",
          t.category || "",
          t.note || "",
          t.narration || "",
          t.referenceNumber || "",
          t.type === "debit" ? t.amount : "",
          t.type === "credit" ? t.amount : "",
          bal ? bal.value : "",
        ]
          .map((val) => `"${String(val ?? "").replace(/"/g, '""')}"`)
          .join(",");
      }),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bank-ledger-${today()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast?.(`Exported ${sortedTxns.length} transactions to CSV`, "success");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingBottom: 40 }}>
      {/* ── HEADER & PRIMARY ACTIONS ────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <SectionTitle sub="Bank accounts, liquid cash positions, dynamic passbooks, and cash flow intelligence">
          Banks & Transactions
        </SectionTitle>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setShowBank(true)}
          >
            Add Bank Account
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<FileUp size={14} />}
            onClick={() => setShowImport(true)}
            title="Import transactions from statement CSV"
          >
            Import CSV
          </Button>

          <Button
            variant="secondary"
            size="sm"
            icon={<Download size={14} />}
            onClick={exportTxnsToCSV}
            disabled={sortedTxns.length === 0}
            title="Export filtered transactions to CSV"
          >
            Export CSV
          </Button>

          <Button
            variant="accent"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => setShowTxn(true)}
          >
            Record Transaction
          </Button>
        </div>
      </div>

      {/* ── HERO KPI STAT CARDS ──────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: 16,
        }}
      >
        <StatCard
          label="Total Liquid Balance"
          value={fmtINRFull(totalBalance)}
          numericValue={animTotalBalance}
          formatValue={fmtINRFull}
          icon={<IndianRupee />}
          color={THEME.accent}
          sub={`${(state.bankAccounts || []).length} Connected Account${
            (state.bankAccounts || []).length === 1 ? "" : "s"
          }`}
        />

        <StatCard
          label="Monthly Inflow"
          value={fmtINRFull(monthlyIncome)}
          numericValue={animMonthlyIncome}
          formatValue={fmtINRFull}
          icon={<TrendingUp />}
          color={THEME.sage}
          sub="Income & inflows this month"
          subColor={THEME.sage}
        />

        <StatCard
          label="Monthly Outflow"
          value={fmtINRFull(monthlyExpense)}
          numericValue={animMonthlyExpense}
          formatValue={fmtINRFull}
          icon={<TrendingDown />}
          color={THEME.rust}
          sub="Spends & debits this month"
          subColor={THEME.rust}
        />

        <StatCard
          label="Monthly Net Savings"
          value={fmtINRFull(Math.abs(netMonthlySavings))}
          numericValue={Math.abs(netMonthlySavings)}
          formatValue={(v: number) => (netMonthlySavings >= 0 ? `+${fmtINRFull(v)}` : `-${fmtINRFull(v)}`)}
          icon={<PiggyBank />}
          color={netMonthlySavings >= 0 ? THEME.sage : THEME.rust}
          sub={`${animSavingsRate.toFixed(1)}% savings rate`}
          subColor={netMonthlySavings >= 0 ? THEME.sage : THEME.rust}
        />

        <StatCard
          label="Liquid Cash Runway"
          value={runwayDisplay}
          icon={<ShieldCheck />}
          color={isHealthyRunway || cashRunwayMonths >= 6 ? THEME.sage : cashRunwayMonths >= 3 ? THEME.gold : THEME.rust}
          sub={
            isHealthyRunway
              ? "Zero recent outflows (Strong buffer)"
              : cashRunwayMonths >= 6
                ? "Strong safety buffer (6+ mo)"
                : cashRunwayMonths >= 3
                  ? "Moderate buffer (3-6 mo)"
                  : "Low runway (<3 mo)"
          }
        />
      </div>

      {/* ── SUB-TAB NAVIGATION SEGMENTED SWITCHER ────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          borderBottom: `1.5px solid ${THEME.line}`,
          paddingBottom: 12,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            background: "var(--surface-1)",
            padding: "4px",
            borderRadius: "var(--radius-md)",
            border: `1.5px solid ${THEME.line}`,
            gap: "4px",
          }}
        >
          <button
            onClick={() => setActiveTab("accounts")}
            aria-pressed={activeTab === "accounts"}
            style={{
              padding: "7px 16px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: activeTab === "accounts" ? "var(--surface-0)" : "transparent",
              color: activeTab === "accounts" ? "var(--t-ink)" : "var(--t-muted)",
              fontWeight: 800,
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: activeTab === "accounts" ? "var(--shadow-sm)" : "none",
              transition: "all 0.2s var(--ease-premium)",
            }}
          >
            <Landmark size={15} color={activeTab === "accounts" ? THEME.accent : "currentColor"} />
            <span>Accounts & Passbooks</span>
            <Badge variant="accent" size="xs">
              {(state.bankAccounts || []).length}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab("ledger")}
            aria-pressed={activeTab === "ledger"}
            style={{
              padding: "7px 16px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: activeTab === "ledger" ? "var(--surface-0)" : "transparent",
              color: activeTab === "ledger" ? "var(--t-ink)" : "var(--t-muted)",
              fontWeight: 800,
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: activeTab === "ledger" ? "var(--shadow-sm)" : "none",
              transition: "all 0.2s var(--ease-premium)",
            }}
          >
            <ReceiptText size={15} color={activeTab === "ledger" ? THEME.accent : "currentColor"} />
            <span>Transaction Ledger</span>
            <Badge variant="muted" size="xs">
              {(state.transactions || []).length}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab("analytics")}
            aria-pressed={activeTab === "analytics"}
            style={{
              padding: "7px 16px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: activeTab === "analytics" ? "var(--surface-0)" : "transparent",
              color: activeTab === "analytics" ? "var(--t-ink)" : "var(--t-muted)",
              fontWeight: 800,
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: activeTab === "analytics" ? "var(--shadow-sm)" : "none",
              transition: "all 0.2s var(--ease-premium)",
            }}
          >
            <BarChart3 size={15} color={activeTab === "analytics" ? THEME.accent : "currentColor"} />
            <span>Cash Flow & Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab("transfers")}
            aria-pressed={activeTab === "transfers"}
            style={{
              padding: "7px 16px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: activeTab === "transfers" ? "var(--surface-0)" : "transparent",
              color: activeTab === "transfers" ? "var(--t-ink)" : "var(--t-muted)",
              fontWeight: 800,
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: activeTab === "transfers" ? "var(--shadow-sm)" : "none",
              transition: "all 0.2s var(--ease-premium)",
            }}
          >
            <ArrowLeftRight size={15} color={activeTab === "transfers" ? THEME.accent : "currentColor"} />
            <span>Transfers & Reconciliation</span>
            {transferList.length > 0 && (
              <Badge variant="gold" size="xs">
                {transferList.length}
              </Badge>
            )}
          </button>
        </div>

        {/* Quick helper contextual action */}
        {activeTab === "accounts" && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>Filter Type:</span>
            <div style={{ display: "flex", gap: 4 }}>
              {["all", "savings", "salary", "current", "fd"].map((t) => (
                <button
                  key={t}
                  onClick={() => setAccountTypeFilter(t)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 14,
                    fontSize: 11,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    background:
                      accountTypeFilter === t
                        ? `color-mix(in srgb, ${THEME.accent} 15%, transparent)`
                        : "var(--surface-1)",
                    color: accountTypeFilter === t ? THEME.accent : THEME.muted,
                    textTransform: "capitalize",
                  }}
                >
                  {t === "fd" ? "Fixed Deposits" : t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SUB-TAB 1: ACCOUNTS & PASSBOOKS VIEW
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "accounts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Liquidity allocation segmented banner */}
          {liquidityWeights.length > 0 && (
            <Card style={{ padding: "18px 24px" }}>
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
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Layers size={14} color={THEME.accent} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>
                    Liquid Asset Allocation Across Connected Accounts
                  </span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>
                  Total Pool: <Money value={totalBalance} variant="full" />
                </span>
              </div>

              {/* Segmented bar */}
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: 12,
                  background: "var(--t-line)",
                  borderRadius: 6,
                  overflow: "hidden",
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)",
                }}
              >
                {liquidityWeights.map((w: any) => (
                  <div
                    key={w.id}
                    title={`${w.bankName}: ${w.share.toFixed(1)}% (₹${fmtINR(w.balance)})`}
                    style={{
                      width: `${w.share}%`,
                      height: "100%",
                      background: w.color,
                      transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  />
                ))}
              </div>

              {/* Legend row */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 16,
                  marginTop: 12,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {liquidityWeights.map((w: any) => (
                  <div
                    key={w.id}
                    style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                    onClick={() => {
                      setFilterAcc(w.id);
                      setDateFrom("");
                      setDateTo("");
                      setActiveRange("all");
                      setActiveTab("ledger");
                    }}
                    title="Click to inspect account ledger"
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: w.color,
                        display: "inline-block",
                      }}
                    />
                    <span style={{ color: THEME.ink }}>{w.bankName}</span>
                    <span style={{ color: THEME.muted }}>({w.share.toFixed(1)}%)</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Bank Accounts Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 20,
            }}
          >
            {filteredBankAccounts.length === 0 ? (
              <div style={{ gridColumn: "1 / -1" }}>
                <BankEmptyState onAdd={() => setShowBank(true)} />
              </div>
            ) : (
              filteredBankAccounts.map((a: any) => {
                const theme = getAccountTheme(a.type);
                const accentColor = chartColorById[a.id] || theme.color;
                const bal = getDisplayBalance(a);
                const txnsForThisAcc = (state.transactions || []).filter(
                  (t: any) => t.accountId === a.id
                );
                const monthInflow = txnsForThisAcc
                  .filter((t: any) => t.date >= startOfMonth && t.type === "credit")
                  .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
                const monthOutflow = txnsForThisAcc
                  .filter((t: any) => t.date >= startOfMonth && t.type === "debit")
                  .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);

                return (
                  <Card
                    key={a.id}
                    hover
                    style={{
                      position: "relative",
                      overflow: "hidden",
                      padding: 0,
                      display: "flex",
                      flexDirection: "column",
                      borderRadius: 16,
                      background:
                        "linear-gradient(145deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 85%, transparent) 100%)",
                      border: `1.5px solid ${THEME.line}`,
                      boxShadow: "0 4px 20px -2px rgba(0,0,0,0.05)",
                    }}
                  >
                    {/* Top gradient glow strip */}
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background: `linear-gradient(90deg, ${accentColor}, color-mix(in srgb, ${accentColor} 30%, transparent))`,
                      }}
                    />

                    {/* Card Body */}
                    <div
                      style={{
                        padding: "22px 24px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                        height: "100%",
                        justifyContent: "space-between",
                      }}
                    >
                      {/* Bank header and action buttons */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <BankLogo bankName={a.bankName} size={36} />
                          <div>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                flexWrap: "wrap",
                                marginBottom: 4,
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.05em",
                                  color: accentColor,
                                  background: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
                                  padding: "2px 8px",
                                  borderRadius: 10,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <theme.icon size={11} /> {a.type || "Savings"}
                              </span>
                              <OwnerBadge owner={a.owner} />
                            </div>
                            <h3
                              style={{
                                fontSize: 16,
                                fontWeight: 800,
                                color: THEME.ink,
                                margin: 0,
                                letterSpacing: "-0.01em",
                              }}
                            >
                              {a.bankName}
                            </h3>
                          </div>
                        </div>

                        {/* Top corner actions */}
                        <div style={{ display: "flex", gap: 4 }}>
                          <button
                            onClick={() => setEditBankId(a.id)}
                            className="icon-btn"
                            style={{
                              ...iconBtn,
                              background: "var(--surface-1)",
                              border: `1px solid ${THEME.line}`,
                            }}
                            title="Edit account details"
                            aria-label={`Edit ${a.bankName}`}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() =>
                              setConfirmAction({
                                message: `Delete "${a.bankName}" account? Linked transactions will remain intact without this account tag. This cannot be undone.`,
                                onConfirm: () => removeItem("bankAccounts", a.id),
                              })
                            }
                            className="icon-btn danger"
                            style={{
                              ...iconBtn,
                              background: "var(--surface-1)",
                              border: `1px solid ${THEME.line}`,
                            }}
                            title="Delete account"
                            aria-label={`Delete ${a.bankName}`}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Account Number with 1-click copy */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          borderRadius: 8,
                          background: "var(--surface-1)",
                          border: `1px solid ${THEME.line}`,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>
                            A/C No:
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: 12,
                              fontWeight: 700,
                              color: THEME.ink,
                              letterSpacing: "0.06em",
                            }}
                          >
                            <Prv>
                              {a.accountNumber
                                ? `•••• ${String(a.accountNumber).slice(-4)}`
                                : "Not specified"}
                            </Prv>
                          </span>
                        </div>

                        {a.accountNumber && (
                          <button
                            onClick={() => handleCopy(a.accountNumber, a.id)}
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              color: copiedAccId === a.id ? THEME.sage : THEME.muted,
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              padding: "2px 6px",
                            }}
                            title="Copy full account number"
                          >
                            {copiedAccId === a.id ? (
                              <>
                                <CheckCheck size={12} /> Copied
                              </>
                            ) : (
                              <>
                                <Copy size={12} /> Copy
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {/* Main Balance Display */}
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            color: THEME.muted,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            marginBottom: 4,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>Live Balance</span>
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 800,
                              color: THEME.sage,
                              background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                              padding: "2px 6px",
                              borderRadius: 4,
                            }}
                          >
                            ● Auto-Synced
                          </span>
                        </div>

                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 28,
                            fontWeight: 700,
                            color: THEME.ink,
                            letterSpacing: "-0.02em",
                            lineHeight: 1.1,
                          }}
                        >
                          <Money value={bal} variant="full" />
                        </div>
                      </div>

                      {/* Mini Monthly Activity */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 10,
                          paddingTop: 10,
                          borderTop: `1px dashed ${THEME.line}`,
                        }}
                      >
                        <div>
                          <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 700 }}>
                            THIS MONTH IN
                          </span>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              color: THEME.sage,
                              marginTop: 2,
                            }}
                          >
                            +<Money value={monthInflow} variant="full" />
                          </div>
                        </div>

                        <div>
                          <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 700 }}>
                            THIS MONTH OUT
                          </span>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              color: THEME.rust,
                              marginTop: 2,
                            }}
                          >
                            -<Money value={monthOutflow} variant="full" />
                          </div>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          paddingTop: 6,
                        }}
                      >
                        <Button
                          variant="secondary"
                          size="sm"
                          style={{ flex: 1, fontSize: 11 }}
                          onClick={() => {
                            setFilterAcc(a.id);
                            setDateFrom("");
                            setDateTo("");
                            setActiveRange("all");
                            setActiveTab("ledger");
                          }}
                        >
                          View Passbook ({txnsForThisAcc.length})
                        </Button>

                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<Plus size={12} />}
                          style={{ fontSize: 11 }}
                          onClick={() => {
                            setShowTxn(true);
                          }}
                          title="Record transaction for this account"
                        >
                          Txn
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUB-TAB 2: TRANSACTION LEDGER & PASSBOOK VIEW
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "ledger" && (
        <Card style={{ padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Header Row with Filter Controls */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              borderBottom: `1.5px solid ${THEME.line}`,
              paddingBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                Passbook Transaction Ledger
              </span>
              <Badge variant="accent">{sortedTxns.length} records</Badge>

              {filterAcc !== "all" && (
                <Badge
                  variant="gold"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                  }}
                  onClick={() => setFilterAcc("all")}
                  title="Click to show all accounts"
                >
                  Filtered: {state.bankAccounts.find((b: any) => b.id === filterAcc)?.bankName} ✕
                </Badge>
              )}
            </div>

            {/* Segmented Quick Date Presets */}
            <div
              style={{
                display: "flex",
                background: "var(--surface-1)",
                padding: "3px",
                borderRadius: "var(--radius-md)",
                border: `1.5px solid ${THEME.line}`,
                gap: "2px",
              }}
            >
              {[
                { key: "thisMonth", label: "This Month" },
                { key: "lastMonth", label: "Last Month" },
                { key: "3months", label: "Last 3M" },
                { key: "thisFY", label: "This FY" },
                { key: "all", label: "All Time" },
              ].map((p) => {
                const isActive = activeRange === p.key;
                return (
                  <button
                    key={p.key}
                    aria-pressed={isActive}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "none",
                      background: isActive ? "var(--surface-0)" : "transparent",
                      color: isActive ? "var(--t-ink)" : "var(--t-muted)",
                      fontWeight: 700,
                      fontSize: "11px",
                      cursor: "pointer",
                      boxShadow: isActive ? "var(--shadow-sm)" : "none",
                      transition: "all 0.2s var(--ease-premium)",
                    }}
                    onClick={() => setQuickRange(p.key)}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter Bar Row */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            {/* Search Input */}
            <div style={{ position: "relative", flex: "2 1 220px", minWidth: 200 }}>
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: THEME.muted,
                  pointerEvents: "none",
                  display: "flex",
                }}
              >
                <Search size={14} />
              </span>
              <input
                style={{
                  ...inputStyle,
                  paddingLeft: 36,
                  paddingRight: search ? 32 : 12,
                  height: 38,
                  fontWeight: 600,
                }}
                placeholder="Search note, category, narration, reference or ₹ amount…"
                aria-label="Search transactions"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    border: "none",
                    background: "var(--surface-2)",
                    color: THEME.muted,
                    cursor: "pointer",
                  }}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Account Selector */}
            <select
              style={{
                ...inputStyle,
                width: "auto",
                minWidth: 160,
                height: 38,
                fontWeight: 600,
                cursor: "pointer",
              }}
              value={filterAcc}
              onChange={(e) => setFilterAcc(e.target.value)}
            >
              <option value="all">All Bank Accounts</option>
              {(state.bankAccounts || []).map((a: any) => (
                <option key={a.id} value={a.id}>
                  {accountLabel(a)}
                </option>
              ))}
            </select>

            {/* Type Selector */}
            <select
              style={{
                ...inputStyle,
                width: "auto",
                minWidth: 130,
                height: 38,
                fontWeight: 600,
                cursor: "pointer",
              }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="credit">Credits (Income / In)</option>
              <option value="debit">Debits (Expense / Out)</option>
              <option value="transfer">Transfers</option>
              <option value="linked">Linked Entities</option>
            </select>

            {/* Category Selector */}
            <select
              style={{
                ...inputStyle,
                width: "auto",
                minWidth: 130,
                height: 38,
                fontWeight: 600,
                cursor: "pointer",
              }}
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
            >
              <option value="all">All Categories</option>
              {txnCats.map((c: string) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Date range pickers */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <input
                type="date"
                style={{ ...inputStyle, width: "auto", height: 38, fontWeight: 600 }}
                title="From date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setActiveRange(null);
                }}
              />
              <span style={{ color: THEME.muted, fontSize: 12, fontWeight: 700 }}>to</span>
              <input
                type="date"
                style={{ ...inputStyle, width: "auto", height: 38, fontWeight: 600 }}
                title="To date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setActiveRange(null);
                }}
              />
            </div>

            {(dateFrom || dateTo || search || filterAcc !== "all" || filterType !== "all" || filterCat !== "all") && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setFilterAcc("all");
                  setFilterType("all");
                  setFilterCat("all");
                  setDateFrom("");
                  setDateTo("");
                  setActiveRange("all");
                }}
                style={{ height: 38, color: THEME.rust }}
              >
                Clear All Filters
              </Button>
            )}
          </div>

          {/* Table Container */}
          {sortedTxns.length === 0 ? (
            (state.transactions || []).length === 0 ? (
              <TxnEmptyState onAdd={() => setShowTxn(true)} />
            ) : (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  color: THEME.muted,
                  background: "var(--surface-1)",
                  borderRadius: 12,
                  border: `1px dashed ${THEME.line}`,
                }}
              >
                <ReceiptText size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
                <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
                  No transactions match your current search & filters
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  Try adjusting the date range, account selection, or search query.
                </div>
              </div>
            )
          ) : (
            <div className="desktop-only">
              <DataTable
                columns={[
                  {
                    key: "date",
                    header: "Date",
                    sortable: true,
                    accessor: (t: any) => (
                      <span
                        style={{
                          color: THEME.muted,
                          fontSize: 12,
                          whiteSpace: "nowrap",
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {t.date
                          ? new Date(t.date + "T00:00:00").toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                    ),
                  },
                  {
                    key: "note",
                    header: "Particulars / Narration",
                    sortable: true,
                    accessor: (t: any) => (
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 13,
                            fontWeight: 700,
                            color: THEME.ink,
                          }}
                        >
                          {t.note || "—"}
                          {t.category === "Transfer" && (
                            <Badge variant="accent" size="xs" style={{ whiteSpace: "nowrap" }}>
                              ↔ TRANSFER
                            </Badge>
                          )}
                          {t.linkedType && (
                            <Badge
                              variant="accent"
                              size="xs"
                              style={{
                                whiteSpace: "nowrap",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                            >
                              <Link2 size={9} /> LINKED
                            </Badge>
                          )}
                          {t.category !== "Transfer" &&
                            recurringKeys.has((t.note || "") + "|" + t.amount + "|" + t.type) && (
                              <Badge variant="gold" size="xs" style={{ whiteSpace: "nowrap" }}>
                                RECURRING
                              </Badge>
                            )}
                        </div>
                        {t.narration && (
                          <div
                            style={{
                              fontSize: 11,
                              color: THEME.muted,
                              fontStyle: "italic",
                              fontWeight: 500,
                            }}
                          >
                            {t.narration}
                          </div>
                        )}
                        {t.referenceNumber && (
                          <div
                            style={{
                              fontSize: 10.5,
                              color: THEME.muted,
                              fontWeight: 600,
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            Ref: {t.referenceNumber}
                          </div>
                        )}
                      </div>
                    ),
                  },
                  {
                    key: "category",
                    header: "Category",
                    sortable: true,
                    accessor: (t: any) =>
                      t.category ? (
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "var(--radius-xs)",
                            fontSize: 10,
                            fontWeight: 800,
                            background: getCategoryStyle(t.category).bg,
                            color: getCategoryStyle(t.category).color,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {t.category}
                        </span>
                      ) : (
                        <span style={{ color: THEME.muted }}>—</span>
                      ),
                  },
                  {
                    key: "account",
                    header: "Account",
                    accessor: (t: any) => {
                      const bank = (state.bankAccounts || []).find((b: any) => b.id === t.accountId);
                      if (!bank) return <span style={{ color: THEME.muted }}>—</span>;
                      return (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <BankLogo bankName={bank.bankName} size={22} />
                          <span style={{ color: THEME.ink, fontSize: 12, fontWeight: 600 }}>
                            {bank.bankName}
                          </span>
                        </div>
                      );
                    },
                  },
                  {
                    key: "debit",
                    header: "Debit (-)",
                    sortable: true,
                    sortGroup: "amount",
                    align: "right",
                    accessor: (t: any) => (
                      <span
                        style={{
                          color: THEME.rust,
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 800,
                        }}
                      >
                        {t.type === "debit" ? (
                          <>
                            - <Money value={t.amount} variant="exact" />
                          </>
                        ) : (
                          ""
                        )}
                      </span>
                    ),
                  },
                  {
                    key: "credit",
                    header: "Credit (+)",
                    sortable: true,
                    sortGroup: "amount",
                    align: "right",
                    accessor: (t: any) => (
                      <span
                        style={{
                          color: THEME.sage,
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 800,
                        }}
                      >
                        {t.type === "credit" ? (
                          <>
                            + <Money value={t.amount} variant="exact" />
                          </>
                        ) : (
                          ""
                        )}
                      </span>
                    ),
                  },
                  {
                    key: "balance",
                    header: "Passbook Balance",
                    align: "right",
                    accessor: (t: any) => {
                      const bal = balanceAfterTxn[t.id];
                      if (!bal) return <span style={{ color: THEME.muted }}>—</span>;
                      return (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            justifyContent: "flex-end",
                          }}
                        >
                          <span
                            style={{
                              color: THEME.ink,
                              fontVariantNumeric: "tabular-nums",
                              fontWeight: 800,
                            }}
                            title={balanceTitle(bal)}
                          >
                            <Money value={bal.value} variant="exact" />
                          </span>
                          {bal.confirmed && (
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: THEME.sage,
                                display: "inline-block",
                              }}
                              title="Statement verified anchor point"
                            />
                          )}
                        </div>
                      );
                    },
                  },
                ]}
                data={pagedTxns}
                hideSearch
                keyExtractor={(t: any) => t.id}
                sortKey={sortField}
                sortDirection={sortDirection}
                onSortChange={(key: any) => requestSort(key)}
                onRowClick={(t: any) => setViewTxnId(t.id)}
                onRowDoubleClick={(t: any) => {
                  setInlineEditId(t.id);
                  setInlineEdit({ ...t });
                }}
                rowAriaLabel={(t: any) =>
                  `View details for ${t.note || "transaction"} on ${t.date || ""}`
                }
                renderRow={(t: any) => {
                  if (inlineEditId !== t.id || !inlineEdit) return null;
                  const bank = (state.bankAccounts || []).find((b: any) => b.id === t.accountId);
                  const handleSaveInline = async () => {
                    if (!inlineEdit.amount || Number(inlineEdit.amount) <= 0) {
                      showToast?.("Please enter a valid amount greater than 0", "warn");
                      return;
                    }
                    setInlineSaving(true);
                    try {
                      await updateItem("transactions", t.id, inlineEdit);
                      setInlineEditId(null);
                      showToast?.("Transaction updated inline", "success");
                    } catch (e: any) {
                      showToast?.(
                        `Failed to save transaction: ${e?.message || "Unknown error"}`,
                        "error"
                      );
                    } finally {
                      setInlineSaving(false);
                    }
                  };
                  return (
                    <tr
                      key={t.id}
                      style={{
                        borderBottom: `2px solid ${THEME.accent}`,
                        background: `color-mix(in srgb, ${THEME.accent} 6%, transparent)`,
                      }}
                    >
                      <td style={{ ...tdStyle, padding: "12px 14px" }}>
                        <input
                          type="date"
                          value={inlineEdit.date}
                          onChange={(e) =>
                            setInlineEdit({ ...inlineEdit, date: e.target.value })
                          }
                          style={{
                            ...inputStyle,
                            padding: "6px 10px",
                            fontSize: 12,
                            height: 32,
                            width: 130,
                          }}
                        />
                      </td>
                      <td style={{ ...tdStyle, padding: "12px 14px" }}>
                        <input
                          value={inlineEdit.note || ""}
                          onChange={(e) =>
                            setInlineEdit({ ...inlineEdit, note: e.target.value })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveInline();
                            if (e.key === "Escape") setInlineEditId(null);
                          }}
                          placeholder="Particulars / note"
                          style={{
                            ...inputStyle,
                            padding: "6px 10px",
                            fontSize: 12,
                            height: 32,
                            minWidth: 150,
                          }}
                          autoFocus
                        />
                        <input
                          value={inlineEdit.narration || ""}
                          onChange={(e) =>
                            setInlineEdit({ ...inlineEdit, narration: e.target.value })
                          }
                          placeholder="Narration"
                          style={{
                            ...inputStyle,
                            padding: "4px 8px",
                            fontSize: 11,
                            minWidth: 150,
                            marginTop: 4,
                          }}
                        />
                      </td>
                      <td style={{ ...tdStyle, padding: "12px 14px" }}>
                        <select
                          value={inlineEdit.category || ""}
                          onChange={(e) =>
                            setInlineEdit({ ...inlineEdit, category: e.target.value })
                          }
                          style={{ ...inputStyle, padding: "4px 8px", height: 32, fontSize: 12 }}
                        >
                          {txnCats.map((c: string) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ ...tdStyle, padding: "12px 14px", color: THEME.muted, fontSize: 12, fontWeight: 600 }}>
                        {bank ? bank.bankName : "—"}
                      </td>
                      <td style={{ ...tdStyle, padding: "12px 14px", textAlign: "right" }} colSpan={2}>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            alignItems: "center",
                            justifyContent: "flex-end",
                          }}
                        >
                          <select
                            value={inlineEdit.type || "debit"}
                            onChange={(e) => setInlineEdit({ ...inlineEdit, type: e.target.value })}
                            style={{
                              background:
                                inlineEdit.type === "credit"
                                  ? `color-mix(in srgb, ${THEME.sage} 12%, transparent)`
                                  : `color-mix(in srgb, ${THEME.rust} 12%, transparent)`,
                              color: inlineEdit.type === "credit" ? THEME.sage : THEME.rust,
                              border: `1.5px solid color-mix(in srgb, ${
                                inlineEdit.type === "credit" ? THEME.sage : THEME.rust
                              } 30%, transparent)`,
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 800,
                              padding: "4px 8px",
                              cursor: "pointer",
                              outline: "none",
                            }}
                          >
                            <option value="debit">DEBIT</option>
                            <option value="credit">CREDIT</option>
                          </select>
                          <input
                            type="number"
                            value={inlineEdit.amount}
                            onChange={(e) =>
                              setInlineEdit({ ...inlineEdit, amount: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveInline();
                              if (e.key === "Escape") setInlineEditId(null);
                            }}
                            style={{
                              ...inputStyle,
                              padding: "4px 8px",
                              height: 32,
                              fontSize: 12,
                              width: 100,
                              textAlign: "right",
                            }}
                          />
                        </div>
                      </td>
                      <td style={{ ...tdStyle, padding: "12px 14px" }}>
                        <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                          <button
                            onClick={handleSaveInline}
                            disabled={inlineSaving}
                            className="icon-btn"
                            style={{ ...iconBtn, color: THEME.sage, padding: 6 }}
                            title="Save"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            disabled={inlineSaving}
                            onClick={() => setInlineEditId(null)}
                            className="icon-btn danger"
                            style={{ ...iconBtn, color: THEME.rust, padding: 6 }}
                            title="Cancel"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }}
                actions={(t: any) => (
                  <div style={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditTxnId(t.id);
                      }}
                      className="icon-btn"
                      style={{ ...iconBtn, padding: 6, borderRadius: 8 }}
                      title="Edit transaction"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmAction({
                          message: `Delete transaction "${t.note || "entry"}" for ₹${t.amount}? This cannot be undone.`,
                          onConfirm: () => removeItem("transactions", t.id),
                        });
                      }}
                      className="icon-btn danger"
                      style={{ ...iconBtn, padding: 6, borderRadius: 8 }}
                      title="Delete transaction"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
                footer={(() => {
                  const totalDebit = sortedTxns
                    .filter((t: any) => t.type === "debit")
                    .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
                  const totalCredit = sortedTxns
                    .filter((t: any) => t.type === "credit")
                    .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
                  const net = totalCredit - totalDebit;
                  const netColor = net > 0 ? THEME.sage : net < 0 ? THEME.rust : THEME.muted;
                  const borderTop = `1.5px solid ${THEME.line}`;
                  return (
                    <tr style={{ background: "var(--surface-1)" }}>
                      <td
                        colSpan={3}
                        style={{
                          padding: "12px 16px",
                          fontSize: 11,
                          fontWeight: 800,
                          color: THEME.muted,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          borderTop,
                        }}
                      >
                        {sortedTxns.length} Filtered Records
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontSize: 11,
                          fontWeight: 800,
                          color: THEME.muted,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          borderTop,
                        }}
                      >
                        Net Flow
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontWeight: 800,
                          color: THEME.rust,
                          fontSize: 13,
                          fontVariantNumeric: "tabular-nums",
                          borderTop,
                        }}
                      >
                        -<Money value={totalDebit} variant="exact" />
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontWeight: 800,
                          color: THEME.sage,
                          fontSize: 13,
                          fontVariantNumeric: "tabular-nums",
                          borderTop,
                        }}
                      >
                        +<Money value={totalCredit} variant="exact" />
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontWeight: 900,
                          color: netColor,
                          fontSize: 13,
                          fontVariantNumeric: "tabular-nums",
                          borderTop,
                        }}
                      >
                        {net >= 0 ? "+" : "-"}
                        <Money value={Math.abs(net)} variant="exact" />
                      </td>
                    </tr>
                  );
                })()}
              />
            </div>
          )}

          {/* Mobile Card List View */}
          {sortedTxns.length > 0 && (
            <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pagedTxns.map((t: any) => {
                const bank = (state.bankAccounts || []).find((b: any) => b.id === t.accountId);
                return (
                  <div
                    key={t.id}
                    onClick={() => setViewTxnId(t.id)}
                    role="button"
                    tabIndex={0}
                    style={{
                      border: `1.5px solid ${THEME.line}`,
                      borderRadius: 12,
                      padding: "12px 14px",
                      background: "var(--surface-0)",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 10,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 13,
                            fontWeight: 700,
                            color: THEME.ink,
                            flexWrap: "wrap",
                          }}
                        >
                          {t.note || "—"}
                          {t.category === "Transfer" && (
                            <Badge variant="accent" size="xs">
                              ↔
                            </Badge>
                          )}
                          {t.linkedType && (
                            <Badge
                              variant="accent"
                              size="xs"
                              style={{ display: "inline-flex", alignItems: "center" }}
                            >
                              <Link2 size={9} />
                            </Badge>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: THEME.muted,
                            marginTop: 3,
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          <span>
                            {t.date
                              ? new Date(t.date + "T00:00:00").toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                })
                              : "—"}
                          </span>
                          <span>·</span>
                          <span>{bank ? bank.bankName : "—"}</span>
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          fontVariantNumeric: "tabular-nums",
                          color: t.type === "credit" ? THEME.sage : THEME.rust,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {t.type === "credit" ? "+" : "-"}
                        <Money value={t.amount} variant="exact" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination Deck */}
          {sortedTxns.length > TXN_PAGE_SIZE && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 10,
                paddingTop: 8,
                borderTop: `1px solid ${THEME.line}`,
              }}
            >
              <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
                Showing {(currentTxnPage - 1) * TXN_PAGE_SIZE + 1}–
                {Math.min(currentTxnPage * TXN_PAGE_SIZE, sortedTxns.length)} of {sortedTxns.length}{" "}
                records
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => setTxnPage((p) => Math.max(1, p - 1))}
                  disabled={currentTxnPage <= 1}
                  className="icon-btn"
                  style={{
                    ...iconBtn,
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: `1.5px solid ${THEME.line}`,
                    background: "var(--surface-1)",
                    opacity: currentTxnPage <= 1 ? 0.4 : 1,
                    cursor: currentTxnPage <= 1 ? "not-allowed" : "pointer",
                  }}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} /> Prev
                </button>
                <span style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>
                  Page {currentTxnPage} of {totalTxnPages}
                </span>
                <button
                  onClick={() => setTxnPage((p) => Math.min(totalTxnPages, p + 1))}
                  disabled={currentTxnPage >= totalTxnPages}
                  className="icon-btn"
                  style={{
                    ...iconBtn,
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: `1.5px solid ${THEME.line}`,
                    background: "var(--surface-1)",
                    opacity: currentTxnPage >= totalTxnPages ? 0.4 : 1,
                    cursor: currentTxnPage >= totalTxnPages ? "not-allowed" : "pointer",
                  }}
                  aria-label="Next page"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUB-TAB 3: CASH FLOW & ANALYTICS VIEW (RECHARTS)
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "analytics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Charts Row 1: Inflow vs Outflow History */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(450px, 100%), 1fr))",
              gap: 20,
            }}
          >
            {/* Chart 1: Monthly Cash Movement */}
            <Card style={{ padding: 22 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <BarChart3 size={16} color={THEME.accent} />
                  <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: THEME.ink }}>
                    Monthly Inflow vs Outflow History
                  </h4>
                </div>
                <Badge variant="accent">Last 6 Months</Badge>
              </div>

              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyCashFlowTrend}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} vertical={false} />
                    <XAxis
                      dataKey="month"
                      stroke={THEME.muted}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke={THEME.muted}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `₹${fmtINR(v)}`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        return (
                          <div
                            style={{
                              background: "var(--surface-0)",
                              border: `1px solid ${THEME.line}`,
                              padding: "10px 14px",
                              borderRadius: 10,
                              boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                              fontSize: 12,
                            }}
                          >
                            <div style={{ fontWeight: 800, marginBottom: 6, color: THEME.ink }}>
                              {label}
                            </div>
                            <div style={{ color: THEME.sage, fontWeight: 700 }}>
                              Inflow: ₹{fmtINRFull(Number(payload[0]?.value || 0))}
                            </div>
                            <div style={{ color: THEME.rust, fontWeight: 700 }}>
                              Outflow: ₹{fmtINRFull(Number(payload[1]?.value || 0))}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Bar dataKey="income" name="Inflow (Credit)" fill={THEME.sage} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Outflow (Debit)" fill={THEME.rust} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Chart 2: Net Monthly Savings Trend */}
            <Card style={{ padding: 22 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <TrendingUp size={16} color={THEME.sage} />
                  <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: THEME.ink }}>
                    Net Monthly Cash Generation
                  </h4>
                </div>
                <Badge variant="sage">Surplus Trend</Badge>
              </div>

              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={monthlyCashFlowTrend}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={THEME.sage} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={THEME.sage} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} vertical={false} />
                    <XAxis
                      dataKey="month"
                      stroke={THEME.muted}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke={THEME.muted}
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `₹${fmtINR(v)}`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload || !payload.length) return null;
                        const netVal = Number(payload[0]?.value || 0);
                        return (
                          <div
                            style={{
                              background: "var(--surface-0)",
                              border: `1px solid ${THEME.line}`,
                              padding: "10px 14px",
                              borderRadius: 10,
                              boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
                              fontSize: 12,
                            }}
                          >
                            <div style={{ fontWeight: 800, marginBottom: 4, color: THEME.ink }}>
                              {label}
                            </div>
                            <div
                              style={{
                                color: netVal >= 0 ? THEME.sage : THEME.rust,
                                fontWeight: 800,
                              }}
                            >
                              Net Cash Flow: {netVal >= 0 ? "+" : "-"}₹{fmtINRFull(Math.abs(netVal))}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="net"
                      name="Net Savings"
                      stroke={THEME.sage}
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorNet)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Charts Row 2: Spend Category Breakdown */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(380px, 100%), 1fr))",
              gap: 20,
            }}
          >
            {/* Donut Chart */}
            <Card style={{ padding: 22 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <PieIcon size={16} color={THEME.pink} />
                  <h4 style={{ fontSize: 14, fontWeight: 800, margin: 0, color: THEME.ink }}>
                    This Month Spend Distribution
                  </h4>
                </div>
                <Badge variant="accent">Top Categories</Badge>
              </div>

              {topSpendCategories.length === 0 ? (
                <div
                  style={{
                    height: 220,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: THEME.muted,
                    fontSize: 13,
                  }}
                >
                  No expense records logged this month
                </div>
              ) : (
                <div style={{ width: "100%", height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topSpendCategories}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                      >
                        {topSpendCategories.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const d = payload[0].payload;
                          const pct =
                            monthlyExpense > 0 ? ((d.amount / monthlyExpense) * 100).toFixed(1) : 0;
                          return (
                            <div
                              style={{
                                background: "var(--surface-0)",
                                border: `1px solid ${THEME.line}`,
                                padding: "8px 12px",
                                borderRadius: 8,
                                fontSize: 12,
                              }}
                            >
                              <div style={{ fontWeight: 800, color: THEME.ink }}>{d.name}</div>
                              <div style={{ color: THEME.rust, fontWeight: 700 }}>
                                ₹{fmtINRFull(d.amount)} ({pct}%)
                              </div>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Category Rank List */}
            <Card style={{ padding: 22 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                  Category Breakdown & Share
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>
                  Total: <Money value={monthlyExpense} variant="full" />
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {topSpendCategories.slice(0, 5).map((c) => {
                  const pct = monthlyExpense > 0 ? (c.amount / monthlyExpense) * 100 : 0;
                  return (
                    <div key={c.name} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: c.color,
                            }}
                          />
                          <span style={{ color: THEME.ink }}>{c.name}</span>
                        </div>
                        <span style={{ color: THEME.ink, fontVariantNumeric: "tabular-nums" }}>
                          <Money value={c.amount} variant="full" /> ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: 6,
                          background: "var(--t-line)",
                          borderRadius: 3,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${pct}%`,
                            height: "100%",
                            background: c.color,
                            borderRadius: 3,
                            transition: "width 0.6s ease",
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
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SUB-TAB 4: TRANSFERS & RECONCILIATION
         ══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "transfers" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <Card style={{ padding: 22 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: THEME.ink }}>
                  Inter-Account Transfers Ledger
                </h4>
                <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
                  Audits all internal fund transfers between your connected bank accounts (neutral to net worth).
                </div>
              </div>
              <Button
                variant="accent"
                size="sm"
                icon={<ArrowLeftRight size={14} />}
                onClick={() => setShowTxn(true)}
              >
                New Transfer
              </Button>
            </div>

            {transferList.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: THEME.muted,
                  background: "var(--surface-1)",
                  borderRadius: 12,
                }}
              >
                <ArrowLeftRight size={28} style={{ opacity: 0.5, marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 700 }}>No inter-account transfers recorded yet</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {transferList.map((t: any) => {
                  const bank = (state.bankAccounts || []).find((b: any) => b.id === t.accountId);
                  return (
                    <div
                      key={t.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                        borderRadius: 10,
                        border: `1px solid ${THEME.line}`,
                        background: "var(--surface-0)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: `color-mix(in srgb, ${THEME.violet} 12%, transparent)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: THEME.violet,
                          }}
                        >
                          <ArrowLeftRight size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                            {t.note || "Inter-account Transfer"}
                          </div>
                          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                            {t.date} · {bank ? bank.bankName : "Bank Account"}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            color: t.type === "credit" ? THEME.sage : THEME.rust,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {t.type === "credit" ? "+" : "-"}
                          <Money value={t.amount} variant="exact" />
                        </div>
                        <Badge variant="violet" size="xs">
                          {t.type === "credit" ? "Transfer In" : "Transfer Out"}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Advanced Danger Zone / Statement Reset Tool (Safely isolated here) */}
          <Card
            style={{
              padding: 20,
              background: "var(--surface-0)",
              border: `1.5px solid color-mix(in srgb, ${THEME.rust} 25%, ${THEME.line})`,
              borderRadius: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 8,
                  background: `color-mix(in srgb, ${THEME.rust} 12%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: THEME.rust,
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <Trash2 size={16} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                  Advanced Statement Maintenance (Purge Erroneous CSV Import)
                </div>
                <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4, lineHeight: 1.5 }}>
                  This tool is strictly meant for resetting an account if you previously uploaded an incorrect CSV bank statement. To protect your data against accidental clicks, this action requires picking the specific bank account and confirming the safety dialog.
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginTop: 14,
                    flexWrap: "wrap",
                  }}
                >
                  <select
                    style={{ ...inputStyle, width: "auto", minWidth: 200, height: 36, fontWeight: 600 }}
                    value={filterAcc}
                    onChange={(e) => setFilterAcc(e.target.value)}
                  >
                    <option value="all">— Select an account to reset —</option>
                    {(state.bankAccounts || []).map((a: any) => (
                      <option key={a.id} value={a.id}>
                        {accountLabel(a)}
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={filterAcc === "all" || accTxnIdsForDelete.length === 0}
                    onClick={() => setConfirmDeleteAllAcc(true)}
                    style={{
                      borderColor: THEME.rust,
                      color: THEME.rust,
                      fontSize: 12,
                      fontWeight: 700,
                      opacity: filterAcc === "all" || accTxnIdsForDelete.length === 0 ? 0.4 : 1,
                    }}
                  >
                    Purge {accTxnIdsForDelete.length} Statement Transactions
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── MODALS & DRAWERS ─────────────────────────────────────────────────── */}
      {showBank && (
        <BankModal
          onClose={() => setShowBank(false)}
          onSave={saveNewBank}
          saving={savingNewBank}
        />
      )}

      {editBankId && (
        <BankEditModal
          account={(state.bankAccounts || []).find((a: any) => a.id === editBankId)}
          onClose={() => setEditBankId(null)}
          onSave={(v: any) => saveBankEdit(editBankId, v)}
          saving={savingBankEdit}
        />
      )}

      {showTxn && (
        <TxnModal
          accounts={state.bankAccounts || []}
          state={state}
          getDisplayBalance={getDisplayBalance}
          onClose={() => setShowTxn(false)}
          onSave={saveNewTxn}
          saving={savingNewTxn}
        />
      )}

      {editTxnId && (
        <TxnEditModal
          txn={(state.transactions || []).find((t: any) => t.id === editTxnId)}
          accounts={state.bankAccounts || []}
          getDisplayBalance={getDisplayBalance}
          onClose={() => setEditTxnId(null)}
          onSave={(v: any) => saveTxnEdit(editTxnId, v)}
          saving={savingTxnEdit}
        />
      )}

      {viewTxnId &&
        (() => {
          const t = (state.transactions || []).find((tx: any) => tx.id === viewTxnId);
          if (!t) return null;
          const bank = (state.bankAccounts || []).find((b: any) => b.id === t.accountId);
          const bal = balanceAfterTxn[t.id];

          return (
            <Drawer title="Transaction Voucher / Receipt" onClose={() => setViewTxnId(null)}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  padding: "4px 0 20px",
                }}
              >
                {/* Hero Receipt Amount Header */}
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px 16px",
                    borderRadius: 12,
                    background:
                      t.type === "credit"
                        ? `color-mix(in srgb, ${THEME.sage} 8%, transparent)`
                        : `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
                    border: `1.5px solid ${
                      t.type === "credit"
                        ? `color-mix(in srgb, ${THEME.sage} 25%, transparent)`
                        : `color-mix(in srgb, ${THEME.rust} 25%, transparent)`
                    }`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 34,
                      fontWeight: 700,
                      letterSpacing: "-0.03em",
                      color: t.type === "credit" ? THEME.sage : THEME.rust,
                    }}
                  >
                    {t.type === "credit" ? "+" : "-"}
                    <Money value={t.amount} variant="exact" />
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: THEME.muted,
                      marginTop: 4,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {t.type === "credit" ? "Credit / Inflow" : "Debit / Outflow"}
                  </div>
                </div>

                {/* Details list */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    fontSize: 13,
                    borderTop: `1px solid ${THEME.line}`,
                    paddingTop: 12,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: THEME.muted, fontWeight: 600 }}>Particulars / Note</span>
                    <span style={{ fontWeight: 800, color: THEME.ink, textAlign: "right" }}>
                      {t.note || "—"}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: THEME.muted, fontWeight: 600 }}>Date</span>
                    <span style={{ fontWeight: 700, color: THEME.ink }}>
                      {t.date
                        ? new Date(t.date + "T00:00:00").toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: THEME.muted, fontWeight: 600 }}>Category</span>
                    <Badge variant="accent">{t.category || "General"}</Badge>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: THEME.muted, fontWeight: 600 }}>Bank Account</span>
                    <span style={{ fontWeight: 700, color: THEME.ink, display: "flex", alignItems: "center", gap: 6 }}>
                      {bank && <BankLogo bankName={bank.bankName} size={16} />}
                      {bank ? bank.bankName : "—"}
                    </span>
                  </div>

                  {bal && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: THEME.muted, fontWeight: 600 }}>Passbook Balance After</span>
                      <span style={{ fontWeight: 800, color: THEME.ink }}>
                        <Money value={bal.value} variant="exact" />
                      </span>
                    </div>
                  )}

                  {t.narration && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: THEME.muted, fontWeight: 600 }}>Narration</span>
                      <span style={{ fontWeight: 600, color: THEME.ink, maxWidth: "60%", textAlign: "right" }}>
                        {t.narration}
                      </span>
                    </div>
                  )}

                  {t.referenceNumber && (
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: THEME.muted, fontWeight: 600 }}>Ref / Cheque No.</span>
                      <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)", color: THEME.ink }}>
                        {t.referenceNumber}
                      </span>
                    </div>
                  )}
                </div>

                {/* Drawer Footer Actions */}
                <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                  <Button
                    variant="secondary"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setViewTxnId(null);
                      setInlineEditId(t.id);
                      setInlineEdit({ ...t });
                    }}
                  >
                    Quick Edit
                  </Button>
                  <Button
                    variant="accent"
                    style={{ flex: 1 }}
                    onClick={() => {
                      setViewTxnId(null);
                      setEditTxnId(t.id);
                    }}
                  >
                    Full Edit
                  </Button>
                </div>
              </div>
            </Drawer>
          );
        })()}

      {showImport && (
        <CsvImportModal
          accounts={state.bankAccounts || []}
          existingTransactions={balanceSource.transactions || []}
          onClose={() => setShowImport(false)}
          onImport={async (rows: any) => {
            try {
              if (addTransactions) {
                await addTransactions(rows);
              } else {
                for (const v of rows) {
                  await addItem("transactions", v);
                }
              }
              setShowImport(false);
              showToast?.(`Imported ${rows.length} transactions successfully`, "success");
            } catch (e: any) {
              showToast?.(`Failed to import: ${e?.message || "Unknown error"}`, "error");
            }
          }}
          onBackfillBalance={async (updates: { id: string; statementBalance: string }[]) => {
            for (const u of updates) {
              await updateItem("transactions", u.id, { statementBalance: u.statementBalance });
            }
          }}
        />
      )}

      {confirmDeleteAllAcc && (
        <ConfirmDialog
          message={`Delete all ${accTxnIdsForDelete.length} transactions recorded for "${accountLabel(
            (state.bankAccounts || []).find((a: any) => a.id === filterAcc)
          )}"?\n\nThe account balance will be adjusted accordingly. This cannot be undone.`}
          confirmLabel={deletingAll ? "Deleting…" : `Yes, delete all ${accTxnIdsForDelete.length}`}
          onConfirm={async () => {
            if (deletingAll) return;
            setDeletingAll(true);
            try {
              if (bulkRemoveTransactions) {
                await bulkRemoveTransactions(accTxnIdsForDelete);
              } else {
                for (const id of accTxnIdsForDelete) {
                  await removeItem("transactions", id);
                }
              }
              showToast?.(`Deleted ${accTxnIdsForDelete.length} transactions`, "success");
            } catch (e: any) {
              showToast?.(`Failed to delete: ${e?.message || "Unknown error"}`, "error");
            } finally {
              setDeletingAll(false);
              setConfirmDeleteAllAcc(false);
            }
          }}
          onCancel={() => setConfirmDeleteAllAcc(false)}
        />
      )}

      {confirmAction && (
        <ConfirmDialog
          message={confirmAction.message}
          onConfirm={() => {
            confirmAction.onConfirm();
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MODALS: BANK ACCOUNT & TRANSACTION EDITORS
   ══════════════════════════════════════════════════════════════════════ */

function BankEmptyState({ onAdd }: any) {
  return (
    <EmptyState
      icon={Building2}
      gradient={`linear-gradient(135deg, ${THEME.accent}, color-mix(in srgb, ${THEME.accent} 55%, white))`}
      dotColor={THEME.accent}
      title="No Bank Accounts Connected"
      description="Add your savings, current, and salary bank accounts to monitor balances, passbooks, and every rupee that moves."
      pills={["Savings & Salary", "Live Passbook", "Smart CSV Import", "Runway Analytics"]}
      buttonLabel="Add Bank Account"
      onAdd={onAdd}
    />
  );
}

function TxnEmptyState({ onAdd }: any) {
  return (
    <EmptyState
      icon={ReceiptText}
      gradient={`linear-gradient(135deg, ${THEME.accent}, color-mix(in srgb, ${THEME.accent} 55%, white))`}
      dotColor={THEME.accent}
      title="No Transactions Recorded"
      description="Record income and expenses manually or bulk-import from your bank statement CSV. Automatic categorization and passbook linking included."
      pills={["Debit & Credit", "Category Tags", "Bulk CSV Import", "Recurring Detection"]}
      buttonLabel="Record Transaction"
      onAdd={onAdd}
    />
  );
}

function getLinkConfig(category: string, type: string, state: any, privacyMode?: boolean) {
  if (!state) return null;
  const fmt = (v: any) =>
    privacyMode
      ? "₹••••"
      : Number(v || 0).toLocaleString("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        });

  if (category === "EMI" && type === "debit") {
    return {
      label: "Loan",
      options: (state.loansTaken || [])
        .filter((l: any) => loanOutstanding(l) > 0)
        .map((l: any) => ({
          key: `loansTaken:${l.id}`,
          label: `${l.lender || "Loan"} – ${l.type || ""} | EMI ${fmt(l.emi)}/mo | Outstanding ${fmt(
            loanOutstanding(l)
          )}`,
        })),
    };
  }
  if (category === "Insurance" && type === "debit") {
    return {
      label: "Insurance Policy",
      options: [
        ...(state.lic || []).map((p: any) => ({
          key: `lic:${p.id}`,
          label: `LIC – ${p.planName || "Policy"} – ${fmt(p.annualPremium)}/yr`,
        })),
        ...(state.termPlans || []).map((p: any) => ({
          key: `termPlans:${p.id}`,
          label: `${p.insurer || "Term"} – ${p.planName || "Term Plan"} – ${fmt(
            p.annualPremium
          )}/yr`,
        })),
        ...(state.investmentPlans || []).map((p: any) => ({
          key: `investmentPlans:${p.id}`,
          label: `${p.insurer || "Invest"} – ${p.planName || "Plan"} – ${fmt(
            p.annualPremium
          )}/yr`,
        })),
      ],
    };
  }
  if (category === "Rent" && type === "debit") {
    return {
      label: "Rented Property (you pay)",
      options: (state.rentedProperties || [])
        .filter((p: any) => p.isActive !== false)
        .map((p: any) => ({
          key: `rentedProperties:${p.id}`,
          label: `${p.propertyName || "Property"} – ${fmt(getEffectiveRent(p))}/mo`,
        })),
    };
  }
  if (category === "Rent" && type === "credit") {
    return {
      label: "Rental Property (you receive)",
      options: (state.rentalProperties || [])
        .filter((p: any) => p.isActive !== false)
        .map((p: any) => ({
          key: `rentalProperties:${p.id}`,
          label: `${p.propertyName || "Property"} – ${fmt(getEffectiveRent(p))}/mo`,
        })),
    };
  }
  if ((category === "Credit Card" || category === "Bills") && type === "debit") {
    return {
      label: "Credit Card",
      options: (state.creditCards || [])
        .filter((c: any) => (c.status || "").toLowerCase() !== "closed")
        .map((c: any) => ({
          key: `creditCards:${c.id}`,
          label: `${c.issuer || "Card"} ····${c.last4 || "????"} | Outstanding ${fmt(
            c.outstanding
          )}`,
        })),
    };
  }
  if (category === "Real Estate" && type === "debit") {
    const costFields = [
      { key: "stampDutyPaid", totalKey: "stampDuty", label: "Stamp Duty" },
      { key: "tdsValue", totalKey: "tdsAmount", label: "TDS" },
      { key: "agreementValuePaid", totalKey: "agreementValue", label: "Agreement Value / Token" },
    ];
    return {
      label: "Real Estate Cost",
      options: (state.realEstateProperties || [])
        .filter((p: any) => p.status !== "sold")
        .flatMap((p: any) =>
          costFields.map((cf) => {
            const balance = Math.max(0, Number(p[cf.totalKey] || 0) - Number(p[cf.key] || 0));
            return {
              key: `realEstateProperties:${p.id}:${cf.key}`,
              label: `${p.name || "Property"} — ${cf.label} (balance ${fmt(balance)})`,
            };
          })
        ),
    };
  }
  if (category === "Subscription" && type === "debit") {
    return {
      label: "Subscription",
      options: (state.subscriptions || [])
        .filter((s: any) => !s.paused)
        .map((s: any) => ({
          key: `subscriptions:${s.id}`,
          label: `${s.name || "Subscription"} – ${fmt(s.amount)}/${s.cycle || "month"}`,
        })),
    };
  }
  return null;
}

function BankModal({ onClose, onSave, saving }: any) {
  const { bankAccountTypes, familyProfiles } = useMasterData();
  const [f, setF] = useState({
    owner: "self",
    bankName: "",
    accountNumber: "",
    type: bankAccountTypes[0] || "Savings",
    balance: "",
  });

  return (
    <Modal title="Add Bank Account" onClose={onClose}>
      <Field label="Owner / Family Profile">
        <select
          style={inputStyle}
          value={f.owner || "self"}
          onChange={(e) => setF({ ...f, owner: e.target.value })}
        >
          {familyProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {formatProfileOption(p)}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Bank Name">
        <div style={{ position: "relative" }}>
          <input
            style={inputStyle}
            value={f.bankName}
            onChange={(e) => setF({ ...f, bankName: e.target.value })}
            placeholder="e.g. HDFC Bank, SBI, ICICI Bank"
            list="popular-banks-list"
            autoFocus
          />
          <datalist id="popular-banks-list">
            {POPULAR_INDIAN_BANKS.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </div>
      </Field>

      <Field label="Account Number (full or last 4 digits)">
        <input
          style={inputStyle}
          value={f.accountNumber}
          onChange={(e) => setF({ ...f, accountNumber: e.target.value })}
          placeholder="e.g. 50100432109876"
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Account Type">
          <select
            style={inputStyle}
            value={f.type}
            onChange={(e) => setF({ ...f, type: e.target.value })}
          >
            {bankAccountTypes.map((t: string) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>

        <Field label="Current / Opening Balance (₹)">
          <input
            style={inputStyle}
            type="number"
            value={f.balance}
            onChange={(e) => setF({ ...f, balance: e.target.value })}
            placeholder="0.00"
          />
        </Field>
      </div>

      <ModalActions
        onSave={() => f.bankName && onSave(f)}
        onClose={onClose}
        saveLabel="Add Bank Account"
        disabled={saving || !f.bankName.trim()}
        loading={saving}
      />
    </Modal>
  );
}

function TxnModal({ accounts, state, getDisplayBalance, onClose, onSave, saving }: any) {
  const { transactionCategories: cats, familyProfiles } = useMasterData();
  const { privacyMode } = usePrivacy();
  const defaultToId = accounts.length > 1 ? accounts[1].id : accounts[0]?.id || "";
  const [f, setF] = useState({
    owner: "self",
    date: today(),
    accountId: accounts[0]?.id || "",
    type: "debit",
    amount: "",
    category: cats[0] || "General",
    note: "",
    narration: "",
    referenceNumber: "",
    toAccountId: defaultToId,
    linkedKey: "",
    statementBalance: "",
  });

  const isTransfer = f.type === "transfer";

  return (
    <Modal title="Record Bank Transaction" onClose={onClose}>
      {/* 3-Mode segmented selector */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          background: "var(--surface-1)",
          padding: 4,
          borderRadius: 10,
          border: `1.5px solid ${THEME.line}`,
          gap: 4,
          marginBottom: 16,
        }}
      >
        <button
          type="button"
          onClick={() => setF({ ...f, type: "debit", linkedKey: "" })}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "none",
            background:
              f.type === "debit"
                ? `color-mix(in srgb, ${THEME.rust} 15%, transparent)`
                : "transparent",
            color: f.type === "debit" ? THEME.rust : THEME.muted,
            fontWeight: 800,
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <TrendingDown size={14} /> Expense (Debit)
        </button>

        <button
          type="button"
          onClick={() => setF({ ...f, type: "credit", linkedKey: "" })}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "none",
            background:
              f.type === "credit"
                ? `color-mix(in srgb, ${THEME.sage} 15%, transparent)`
                : "transparent",
            color: f.type === "credit" ? THEME.sage : THEME.muted,
            fontWeight: 800,
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <TrendingUp size={14} /> Income (Credit)
        </button>

        <button
          type="button"
          onClick={() => setF({ ...f, type: "transfer", category: "Transfer", linkedKey: "" })}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "none",
            background:
              f.type === "transfer"
                ? `color-mix(in srgb, ${THEME.violet} 15%, transparent)`
                : "transparent",
            color: f.type === "transfer" ? THEME.violet : THEME.muted,
            fontWeight: 800,
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <ArrowLeftRight size={14} /> Transfer
        </button>
      </div>

      <Field label="Owner / Family Profile">
        <select
          style={inputStyle}
          value={f.owner || "self"}
          onChange={(e) => setF({ ...f, owner: e.target.value })}
        >
          {familyProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {formatProfileOption(p)}
            </option>
          ))}
        </select>
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Date">
          <input
            style={inputStyle}
            type="date"
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
          />
        </Field>

        <Field label={isTransfer ? "Source Bank Account" : "Bank Account"}>
          <select
            style={inputStyle}
            value={f.accountId}
            onChange={(e) => setF({ ...f, accountId: e.target.value })}
          >
            {accounts.length === 0 && <option value="">Add account first</option>}
            {accounts.map((a: any) => (
              <option key={a.id} value={a.id}>
                {accountLabel(a)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {/* Amount Input */}
      <Field label="Amount (₹)">
        <input
          style={{ ...inputStyle, fontSize: 16, fontWeight: 700 }}
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={f.amount}
          onChange={(e) => setF({ ...f, amount: e.target.value })}
          autoFocus
        />
      </Field>

      {/* Transfer destination */}
      {isTransfer && (
        <Field label="Destination Bank Account">
          <select
            style={inputStyle}
            value={f.toAccountId}
            onChange={(e) => setF({ ...f, toAccountId: e.target.value })}
          >
            {accounts
              .filter((a: any) => a.id !== f.accountId)
              .map((a: any) => (
                <option key={a.id} value={a.id}>
                  {accountLabel(a)}
                </option>
              ))}
          </select>
        </Field>
      )}

      {/* Category selector */}
      {!isTransfer && (
        <Field label="Category">
          <select
            style={inputStyle}
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value, linkedKey: "" })}
          >
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      )}

      {/* Auto link preview */}
      {!isTransfer &&
        (() => {
          const cfg = getLinkConfig(f.category, f.type, state, privacyMode);
          if (!cfg) return null;
          return (
            <Field label={`Link to ${cfg.label} (optional)`}>
              <select
                style={inputStyle}
                value={f.linkedKey}
                onChange={(e) => setF({ ...f, linkedKey: e.target.value })}
              >
                <option value="">— Bank ledger only —</option>
                {cfg.options.map((o: any) => (
                  <option key={o.key} value={o.key}>
                    {o.label}
                  </option>
                ))}
              </select>
              {f.linkedKey && (
                <div
                  style={{
                    fontSize: 11,
                    color: THEME.sage,
                    marginTop: 6,
                    fontWeight: 700,
                    padding: "6px 10px",
                    background: `color-mix(in srgb, ${THEME.sage} 10%, transparent)`,
                    borderRadius: 8,
                  }}
                >
                  ✓ Will auto-post and update {cfg.label} record
                </div>
              )}
            </Field>
          );
        })()}

      <Field label="Particulars / Note">
        <input
          style={inputStyle}
          value={f.note}
          onChange={(e) => {
            const note = e.target.value;
            const cat = !isTransfer ? autoCateg(note) : null;
            setF({ ...f, note, ...(cat ? { category: cat, linkedKey: "" } : {}) });
          }}
          placeholder={
            isTransfer
              ? "e.g. Monthly transfer to salary savings"
              : "e.g. Swiggy order, Electricity Bill — category auto-detects"
          }
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Narration / Description">
          <input
            style={inputStyle}
            value={f.narration}
            onChange={(e) => setF({ ...f, narration: e.target.value })}
            placeholder="UPI / IMPS / Bank description"
          />
        </Field>

        <Field label="Reference / Cheque No.">
          <input
            style={inputStyle}
            value={f.referenceNumber || ""}
            onChange={(e) => setF({ ...f, referenceNumber: e.target.value })}
            placeholder="Optional ref / cheque number"
          />
        </Field>
      </div>

      <ModalActions
        onSave={() =>
          Number(f.amount) > 0 &&
          f.accountId &&
          (!isTransfer || (f.toAccountId && f.accountId !== f.toAccountId)) &&
          onSave(f)
        }
        onClose={onClose}
        saveLabel="Record Transaction"
        disabled={saving || !f.amount || Number(f.amount) <= 0}
        loading={saving}
      />
    </Modal>
  );
}

function TxnEditModal({ txn, accounts, getDisplayBalance, onClose, onSave, saving }: any) {
  const { transactionCategories: cats, familyProfiles } = useMasterData();
  const [f, setF] = useState({
    owner: txn?.owner || "self",
    date: txn?.date || today(),
    accountId: txn?.accountId || accounts[0]?.id || "",
    type: txn?.type || "debit",
    amount: txn?.amount || "",
    category: txn?.category || "General",
    note: txn?.note || "",
    narration: txn?.narration || "",
    referenceNumber: txn?.referenceNumber || "",
    statementBalance:
      txn?.statementBalance === undefined || txn?.statementBalance === null
        ? ""
        : String(txn.statementBalance),
  });

  return (
    <Modal title="Edit Transaction Details" onClose={onClose}>
      {txn?.linkedType && (
        <div
          style={{
            fontSize: 11,
            color: THEME.gold,
            marginBottom: 12,
            fontWeight: 700,
            padding: "8px 12px",
            background: `color-mix(in srgb, ${THEME.gold} 10%, transparent)`,
            border: `1px solid color-mix(in srgb, ${THEME.gold} 25%, transparent)`,
            borderRadius: 8,
          }}
        >
          <Link2 size={12} style={{ verticalAlign: -2, marginRight: 4 }} /> This transaction is
          linked to a {txn.linkedType} record.
        </div>
      )}

      <Field label="Owner / Family Profile">
        <select
          style={inputStyle}
          value={f.owner || "self"}
          onChange={(e) => setF({ ...f, owner: e.target.value })}
        >
          {familyProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {formatProfileOption(p)}
            </option>
          ))}
        </select>
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Date">
          <input
            style={inputStyle}
            type="date"
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
          />
        </Field>

        <Field label="Bank Account">
          <select
            style={inputStyle}
            value={f.accountId}
            onChange={(e) => setF({ ...f, accountId: e.target.value })}
          >
            {accounts.map((a: any) => (
              <option key={a.id} value={a.id}>
                {accountLabel(a)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Transaction Type">
          <select
            style={inputStyle}
            value={f.type}
            onChange={(e) => setF({ ...f, type: e.target.value })}
          >
            <option value="debit">Debit (Expense / Money Out)</option>
            <option value="credit">Credit (Income / Money In)</option>
          </select>
        </Field>

        <Field label="Amount (₹)">
          <input
            style={inputStyle}
            type="number"
            min="0"
            step="0.01"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Category">
        <select
          style={inputStyle}
          value={f.category}
          onChange={(e) => setF({ ...f, category: e.target.value })}
        >
          {cats.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>

      <Field label="Particulars / Note">
        <input
          style={inputStyle}
          value={f.note}
          onChange={(e) => setF({ ...f, note: e.target.value })}
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Narration">
          <input
            style={inputStyle}
            value={f.narration}
            onChange={(e) => setF({ ...f, narration: e.target.value })}
          />
        </Field>

        <Field label="Reference / Cheque No.">
          <input
            style={inputStyle}
            value={f.referenceNumber || ""}
            onChange={(e) => setF({ ...f, referenceNumber: e.target.value })}
          />
        </Field>
      </div>

      <ModalActions
        onSave={() => Number(f.amount) > 0 && f.accountId && onSave(f)}
        onClose={onClose}
        saveLabel="Save Changes"
        disabled={saving || !f.amount || Number(f.amount) <= 0}
        loading={saving}
      />
    </Modal>
  );
}
