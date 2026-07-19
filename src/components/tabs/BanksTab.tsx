// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Plus,
  FileUp,
  Edit3,
  Trash2,
  Check,
  X,
  Building2,
  ReceiptText,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, fmtINRExact, today, autoCateg, getLocalDateString } from "../../utils/finance";
import { Prv } from "../../context/PrivacyContext";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Badge } from "../ui/Badge";
import { StatCard } from "../ui/StatCard";
import { Button } from "../ui/Button";
import { BankEditModal } from "../modals/BankEditModal";
import { CsvImportModal } from "../modals/CsvImportModal";
import { SectionTitle } from "../ui/SectionTitle";
import { Card } from "../ui/Card";

// Bank logo domains for Clearbit / Google Favicon API
const BANK_LOGO_DOMAINS: Record<string, string> = {
  hdfc: "hdfcbank.com",
  icici: "icicibank.com",
  sbi: "sbi.co.in",
  "state bank": "sbi.co.in",
  axis: "axisbank.com",
  kotak: "kotak.com",
  idfc: "idfcfirstbank.com",
  indusind: "indusind.com",
  yesbank: "yesbank.in",
  "yes bank": "yesbank.in",
  sc: "sc.com",
  "standard chartered": "sc.com",
  citi: "citi.com",
  hsbc: "hsbc.com",
  dbs: "dbs.com",
  bob: "bankofbaroda.in",
  baroda: "bankofbaroda.in",
  "bank of baroda": "bankofbaroda.in",
  pnb: "pnbindia.in",
  "punjab national": "pnbindia.in",
  canara: "canarabank.com",
  idbi: "idbibank.in",
  union: "unionbankofindia.co.in",
  federal: "federalbank.co.in",
  equitas: "equitasbank.com",
  au: "aubank.in",
  rbl: "rblbank.com",
  bandhan: "bandhanbank.com",
  jupiter: "jupiter.money",
  fi: "fi.money",
  slice: "sliceit.com",
  onecard: "getonecard.com",
  airtel: "airtel.in",
  paytm: "paytm.com",
  amazon: "amazon.in",
};

// Account type visual themes
const ACCOUNT_TYPE_THEMES: Record<string, { color: string; bg: string; icon: string }> = {
  savings: { color: "#0284c7", bg: "#0284c715", icon: "💰" },
  current: { color: "#059669", bg: "#05966915", icon: "💼" },
  salary: { color: "#7c3aed", bg: "#7c3aed15", icon: "💎" },
  joint: { color: "#d97706", bg: "#d9770615", icon: "🤝" },
  fd: { color: "#ea580c", bg: "#ea580c15", icon: "🔒" },
  other: {
    color: THEME.muted,
    bg: `color-mix(in srgb, ${THEME.line} 25%, transparent)`,
    icon: "🏦",
  },
};

const CHART_PALETTE = [
  "#0284c7",
  "#059669",
  "#7c3aed",
  "#d97706",
  "#ea580c",
  "#0891b2",
  "#db2777",
  "#4f46e5",
  "#65a30d",
  "#dc2626",
  "#0d9488",
  "#a855f7",
  "#ca8a04",
  "#2563eb",
  "#e11d48",
];

function getAccountTheme(type: string) {
  const t = (type || "savings").toLowerCase();
  if (t.includes("salary")) return ACCOUNT_TYPE_THEMES.salary;
  if (t.includes("joint")) return ACCOUNT_TYPE_THEMES.joint;
  if (t.includes("current")) return ACCOUNT_TYPE_THEMES.current;
  if (t.includes("fd") || t.includes("fixed")) return ACCOUNT_TYPE_THEMES.fd;
  return ACCOUNT_TYPE_THEMES.savings;
}

const BankLogo = ({ bankName, size = 40 }: { bankName: string; size?: number }) => {
  const name = (bankName || "").toLowerCase();
  let domain = "";
  for (const [k, d] of Object.entries(BANK_LOGO_DOMAINS)) {
    if (name.includes(k)) {
      domain = d;
      break;
    }
  }

  const [imgSrc, setImgSrc] = React.useState<string | null>(null);
  const [fallbackLevel, setFallbackLevel] = React.useState<number>(0); // 0: hunter.io, 1: google favicon, 2: initials

  React.useEffect(() => {
    if (domain) {
      setImgSrc(`https://logos.hunter.io/${domain}`);
      setFallbackLevel(0);
    } else {
      setImgSrc(null);
      setFallbackLevel(2);
    }
  }, [domain]);

  const handleError = () => {
    if (fallbackLevel === 0) {
      setFallbackLevel(1);
      setImgSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=256`);
    } else if (fallbackLevel === 1) {
      setFallbackLevel(2);
      setImgSrc(null);
    }
  };

  if (domain && fallbackLevel < 2 && imgSrc) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        <img
          src={imgSrc}
          alt={bankName}
          style={{ width: "80%", height: "80%", objectFit: "contain" }}
          onError={handleError}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`,
        border: `1px solid ${THEME.line}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: size / 2.5, fontWeight: 800, color: THEME.muted }}>
        {bankName.slice(0, 2).toUpperCase()}
      </span>
    </div>
  );
};

const accountLabel = (a: any): string => {
  const last4 = a.accountNumber ? `····${String(a.accountNumber).slice(-4)}` : "";
  const type = a.type ? a.type : "";
  const suffix = [type, last4].filter(Boolean).join(" ");
  return suffix ? `${a.bankName} – ${suffix}` : a.bankName;
};

const OwnerBadge = ({ owner }: { owner?: string }) => {
  const { familyProfiles } = useMasterData();
  if (!owner) return null;
  const p = familyProfiles.find((x) => x.id === owner);
  if (!p) return null;
  return (
    <Badge variant="accent" style={{ fontSize: 10 }}>
      {p.name}
    </Badge>
  );
};

const EmptyHint = ({ text }: { text: string }) => (
  <div style={{ padding: "32px 20px", textAlign: "center", color: THEME.muted }}>
    <div style={{ fontSize: 13 }}>{text}</div>
  </div>
);

const BankEmptyState = ({ onAdd }: any) => (
  <div
    style={{
      padding: "60px 40px",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 20,
    }}
  >
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 20,
        background: "linear-gradient(135deg,#0284c7 0%,#38bdf8 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Building2 size={28} color="#fff" />
    </div>
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
        No Bank Accounts Added Yet
      </div>
      <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 380 }}>
        Connect your savings, current, and salary accounts to track balances and every rupee that
        moves in and out.
      </div>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      {["Savings & Current", "Balance Tracking", "CSV Import", "Auto Categories"].map((f) => (
        <span
          key={f}
          style={{
            fontSize: 11,
            padding: "5px 12px",
            borderRadius: 20,
            background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
            color: THEME.accent,
            fontWeight: 600,
            border: `1px solid color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
          }}
        >
          ● {f}
        </span>
      ))}
    </div>
    <Button variant="accent" icon={<Plus size={16} />} style={{ marginTop: 8 }} onClick={onAdd}>
      Add Bank Account
    </Button>
  </div>
);

const TxnEmptyState = ({ onAdd }: any) => (
  <div
    style={{
      padding: "60px 40px",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 20,
    }}
  >
    <div
      style={{
        width: 64,
        height: 64,
        borderRadius: 20,
        background: `linear-gradient(135deg,${THEME.accent} 0%,#a78bfa 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <ReceiptText size={28} color="#fff" />
    </div>
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>No Transactions Yet</div>
      <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 380 }}>
        Record income and expenses manually or bulk-import from your bank statement CSV. Every
        transaction is auto-categorised.
      </div>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      {["Debit & Credit", "Category Tags", "Bulk CSV Import", "Recurring Detection"].map((f) => (
        <span
          key={f}
          style={{
            fontSize: 11,
            padding: "5px 12px",
            borderRadius: 20,
            background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
            color: THEME.accent,
            fontWeight: 600,
            border: `1px solid color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
          }}
        >
          ● {f}
        </span>
      ))}
    </div>
    <Button variant="accent" icon={<Plus size={16} />} onClick={onAdd} style={{ marginTop: 8 }}>
      Add Transaction
    </Button>
  </div>
);

const btnSolid = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 16px",
  background: THEME.accent,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const btnGhost = {
  background: "transparent",
  border: `1.5px solid ${THEME.line}`,
  color: THEME.ink,
  padding: "8px 14px",
  fontSize: 13,
  fontWeight: 500,
  borderRadius: 10,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const input = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--surface-0)",
  border: `1.5px solid ${THEME.line}`,
  borderRadius: 10,
  color: THEME.ink,
  fontSize: 14,
};

const card = {
  background: "var(--surface-0)",
  borderRadius: 12,
  border: `1px solid ${THEME.line}`,
  padding: 20,
};

const iconBtn = {
  background: "transparent",
  border: "none",
  cursor: "pointer",
  color: THEME.muted,
  padding: "5px",
  borderRadius: 6,
  display: "inline-flex",
  alignItems: "center",
};

const th = {
  textAlign: "left" as const,
  padding: "11px 10px",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
  color: THEME.muted,
  fontWeight: 700,
  borderBottom: `1.5px solid ${THEME.line}`,
  whiteSpace: "nowrap" as const,
};
const td = {
  padding: "11px 10px",
  verticalAlign: "middle" as const,
  fontSize: 13,
  borderBottom: `1px solid ${THEME.line}`,
};

const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  salary: { color: "#059669", bg: "#0596691a" },
  income: { color: "#059669", bg: "#0596691a" },
  interest: { color: "#059669", bg: "#0596691a" },
  dividend: { color: "#059669", bg: "#0596691a" },
  savings: { color: "#059669", bg: "#0596691a" },
  transfer: { color: "#8b5cf6", bg: "#8b5cf61a" },
  food: { color: "#f59e0b", bg: "#f59e0b1a" },
  dining: { color: "#f59e0b", bg: "#f59e0b1a" },
  groceries: { color: "#f59e0b", bg: "#f59e0b1a" },
  emi: { color: "#dc2626", bg: "#dc26261a" },
  loan: { color: "#dc2626", bg: "#dc26261a" },
  rent: { color: "#dc2626", bg: "#dc26261a" },
  utilities: { color: "#0891b2", bg: "#0891b21a" },
  bills: { color: "#0891b2", bg: "#0891b21a" },
  shopping: { color: "#7c3aed", bg: "#7c3aed1a" },
  travel: { color: "#0284c7", bg: "#0284c71a" },
  health: { color: "#dc2626", bg: "#dc26261a" },
  medical: { color: "#dc2626", bg: "#dc26261a" },
  insurance: { color: "#ea580c", bg: "#ea580c1a" },
  investment: { color: "#7c3aed", bg: "#7c3aed1a" },
  subscription: {
    color: THEME.accent as string,
    bg: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
  },
};
function getCategoryStyle(cat: string) {
  const key = (cat || "").toLowerCase().trim();
  for (const [k, v] of Object.entries(CATEGORY_COLORS)) {
    if (key.includes(k)) return v;
  }
  return { color: THEME.muted as string, bg: "rgba(128,128,128,0.08)" };
}

export function BanksTab({
  state,
  addItem,
  addTransactions,
  removeItem,
  updateItem,
  masterData: _masterData,
}: any) {
  const [showBank, setShowBank] = useState(false);
  const [showTxn, setShowTxn] = useState(false);
  const [filterAcc, setFilterAcc] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [editBankId, setEditBankId] = useState<string | null>(null);
  const [editTxnId, setEditTxnId] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [inlineEditId, setInlineEditId] = useState<string | null>(null);
  const [inlineEdit, setInlineEdit] = useState<any>(null);
  const [activeRange, setActiveRange] = useState<string | null>(null);
  const [hoveredTxnId, setHoveredTxnId] = useState<string | null>(null);
  const { transactionCategories: txnCats } = useMasterData();

  const autoPostLinkedTransaction = (linkedKey: string, txn: any) => {
    if (!linkedKey) return;
    const ci = linkedKey.indexOf(":");
    if (ci < 0) return;
    const lt = linkedKey.slice(0, ci);
    const lid = linkedKey.slice(ci + 1);
    const amt = Number(txn.amount || 0);
    if (amt <= 0) return;
    const { date, note } = txn;
    const newId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);

    if (["lic", "termPlans", "investmentPlans"].includes(lt)) {
      const policy = (state[lt] || []).find((p: any) => p.id === lid);
      if (!policy) return;
      updateItem(lt, lid, {
        transactions: [...(policy.transactions || []), { id: newId, date, amount: String(amt) }],
        premiumPaid: Number(policy.premiumPaid || 0) + amt,
      });
    } else if (lt === "loansTaken") {
      const loan = (state.loansTaken || []).find((l: any) => l.id === lid);
      if (!loan) return;
      updateItem("loansTaken", lid, {
        outstanding: Math.max(0, Number(loan.outstanding || 0) - amt),
        monthsRemaining: Math.max(0, Number(loan.monthsRemaining || 0) - 1),
      });
    } else if (lt === "rentedProperties") {
      const prop = (state.rentedProperties || []).find((p: any) => p.id === lid);
      if (!prop) return;
      updateItem("rentedProperties", lid, {
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
      updateItem("rentalProperties", lid, {
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
      // Don't clamp to 0: paying more than the outstanding balance leaves a
      // legitimate negative (credit) balance owed back to the cardholder — the
      // credit-card ledger (CreditTab) treats this the same way.
      updateItem("creditCards", lid, {
        outstanding: Number(card.outstanding || 0) - amt,
      });
    } else if (lt === "subscriptions") {
      const sub = (state.subscriptions || []).find((s: any) => s.id === lid);
      if (!sub || !sub.renewalDate) return;
      const base = new Date(sub.renewalDate + "T00:00:00");
      if (isNaN(base.getTime())) return;
      const next = new Date(base);
      if (sub.cycle === "monthly") next.setMonth(next.getMonth() + 1);
      else if (sub.cycle === "quarterly") next.setMonth(next.getMonth() + 3);
      else next.setFullYear(next.getFullYear() + 1);
      updateItem("subscriptions", lid, { renewalDate: getLocalDateString(next) });
    }
  };

  // Sorting State
  const [sortField, setSortField] = useState<"date" | "amount" | "note" | "category" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

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
    }
    setActiveRange(preset);
  };

  const recurringKeys = useMemo(() => {
    const freq: any = {};
    state.transactions.forEach((t: any) => {
      const key = (t.note || "") + "|" + t.amount + "|" + t.type;
      freq[key] = (freq[key] || 0) + 1;
    });
    return new Set(Object.keys(freq).filter((k) => freq[k] >= 2));
  }, [state.transactions]);

  const filteredTxns = useMemo(
    () =>
      state.transactions
        .filter((t: any) => filterAcc === "all" || t.accountId === filterAcc)
        .filter(
          (t: any) =>
            filterType === "all" ||
            (filterType === "transfer" ? t.category === "Transfer" : t.type === filterType)
        )
        .filter((t: any) => !dateFrom || t.date >= dateFrom)
        .filter((t: any) => !dateTo || t.date <= dateTo)
        .filter(
          (t: any) =>
            !search ||
            (t.note || "").toLowerCase().includes(search.toLowerCase()) ||
            (t.category || "").toLowerCase().includes(search.toLowerCase()) ||
            (t.narration || "").toLowerCase().includes(search.toLowerCase()) ||
            (t.referenceNumber || "").toLowerCase().includes(search.toLowerCase())
        ),
    [state.transactions, filterAcc, filterType, dateFrom, dateTo, search]
  );

  // Sorting Logic
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
      txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }
    return txns;
  }, [filteredTxns, sortField, sortDirection]);

  const requestSort = (field: "date" | "amount" | "note" | "category") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Compute each account's balance from its transactions (credits − debits).
  // Falls back to stored `balance` only if the account has zero transactions,
  // so the displayed value always matches the ledger total.
  const txnNetByAccount = useMemo(() => {
    const map: Record<string, number> = {};
    state.transactions.forEach((t: any) => {
      if (map[t.accountId] === undefined) map[t.accountId] = 0;
      if (t.type === "credit") map[t.accountId] += Number(t.amount || 0);
      else if (t.type === "debit") map[t.accountId] -= Number(t.amount || 0);
    });
    return map;
  }, [state.transactions]);

  const getDisplayBalance = (acc: any): number =>
    txnNetByAccount[acc.id] !== undefined ? txnNetByAccount[acc.id] : Number(acc.balance || 0);

  const totalBalance = state.bankAccounts.reduce(
    (acc: any, a: any) => acc + getDisplayBalance(a),
    0
  );
  const now = new Date();
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const monthlyTxns = state.transactions.filter((t: any) => t.date >= startOfMonth);
  const monthlyIncome = monthlyTxns
    .filter((t: any) => t.type === "credit" && t.category !== "Transfer")
    .reduce((acc: any, t: any) => acc + (Number(t.amount) || 0), 0);
  const monthlyExpense = monthlyTxns
    .filter((t: any) => t.type === "debit" && t.category !== "Transfer")
    .reduce((acc: any, t: any) => acc + (Number(t.amount) || 0), 0);

  // Savings, Category Spending, and Asset weights memo
  const { monthlySavingsRate, topSpendCategories, liquidityWeights } = useMemo(() => {
    const savingsRate =
      monthlyIncome > 0
        ? Math.max(0, Math.min(100, ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100))
        : 0;

    const categorySpends: Record<string, number> = {};
    monthlyTxns
      .filter((t: any) => t.type === "debit" && t.category !== "Transfer")
      .forEach((t: any) => {
        const cat = t.category || "Other";
        categorySpends[cat] = (categorySpends[cat] || 0) + Number(t.amount || 0);
      });

    const sortedCats = Object.entries(categorySpends)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);

    const positiveAccounts = state.bankAccounts.filter((a: any) => getDisplayBalance(a) > 0);
    const totalAssetBal = positiveAccounts.reduce(
      (s: number, a: any) => s + getDisplayBalance(a),
      0
    );
    const weights = state.bankAccounts
      .map((a: any) => {
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
        };
      })
      .sort((a, b) => b.share - a.share)
      .map((w, i) => ({ ...w, color: CHART_PALETTE[i % CHART_PALETTE.length] }));

    return {
      monthlySavingsRate: savingsRate,
      topSpendCategories: sortedCats,
      liquidityWeights: weights,
    };
  }, [monthlyIncome, monthlyExpense, monthlyTxns, state.bankAccounts, txnNetByAccount]);

  const chartColorById = useMemo(() => {
    const map: Record<string, string> = {};
    liquidityWeights.forEach((w) => {
      map[w.id] = w.color;
    });
    return map;
  }, [liquidityWeights]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── HEADER & ACTIONS ────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <SectionTitle sub="Bank accounts, cash positions, and every rupee that moves">
          Banks & Transactions
        </SectionTitle>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-ghost" style={btnGhost} onClick={() => setShowBank(true)}>
            <Plus size={14} /> Account
          </button>
          <button
            className="btn-ghost"
            style={btnGhost}
            onClick={() => setShowImport(true)}
            title="Import transactions from CSV"
          >
            <FileUp size={14} /> Import CSV
          </button>
          <button className="btn-primary" style={btnSolid} onClick={() => setShowTxn(true)}>
            <Plus size={14} /> Transaction
          </button>
        </div>
      </div>

      {/* ── QUICK STATS ──────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {/* Card 1: Total Balance */}
        <Card
          hover
          style={{
            padding: "18px 20px",
            borderTop: `4px solid ${THEME.accent}`,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: THEME.accent,
                flexShrink: 0,
              }}
            >
              <IndianRupee size={18} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Total Balance
              </div>
              <div style={{ fontSize: 10, color: THEME.muted, opacity: 0.8, marginTop: 1 }}>
                Across all banks
              </div>
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: THEME.ink,
                letterSpacing: "-0.04em",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
              }}
            >
              <Prv>{fmtINRFull(totalBalance)}</Prv>
            </div>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, marginTop: 4 }}>
              {state.bankAccounts.length} Connected Account
              {state.bankAccounts.length === 1 ? "" : "s"}
            </div>
          </div>
        </Card>

        {/* Card 2: Monthly Income */}
        <Card
          hover
          style={{
            padding: "18px 20px",
            borderTop: `4px solid ${THEME.sage}`,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: THEME.sage,
                flexShrink: 0,
              }}
            >
              <TrendingUp size={18} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Monthly Income
              </div>
              <div style={{ fontSize: 10, color: THEME.muted, opacity: 0.8, marginTop: 1 }}>
                Current month credits
              </div>
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: THEME.ink,
                letterSpacing: "-0.04em",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
              }}
            >
              <Prv>{fmtINRFull(monthlyIncome)}</Prv>
            </div>
            <div style={{ fontSize: 11, color: THEME.sage, fontWeight: 700, marginTop: 4 }}>
              Inflow cash positions
            </div>
          </div>
        </Card>

        {/* Card 3: Monthly Spends */}
        <Card
          hover
          style={{
            padding: "18px 20px",
            borderTop: `4px solid ${THEME.rust}`,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `color-mix(in srgb, ${THEME.rust} 12%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: THEME.rust,
                flexShrink: 0,
              }}
            >
              <TrendingDown size={18} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Monthly Spends
              </div>
              <div style={{ fontSize: 10, color: THEME.muted, opacity: 0.8, marginTop: 1 }}>
                Current month debits
              </div>
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: THEME.ink,
                letterSpacing: "-0.04em",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1,
              }}
            >
              <Prv>{fmtINRFull(monthlyExpense)}</Prv>
            </div>
            <div style={{ fontSize: 11, color: THEME.rust, fontWeight: 700, marginTop: 4 }}>
              Outflow cash ledger
            </div>
          </div>
        </Card>
      </div>

      {/* ── CASH FLOW ANALYTICS PANEL ────────────────────────────────────────── */}
      {state.bankAccounts.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(320px, 100%), 1fr))",
            gap: 20,
            marginBottom: 24,
          }}
        >
          {/* Column 1: Savings Rate indicator */}
          <Card
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              height: "100%",
              padding: 20,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <span>📈 Monthly Savings Rate</span>
              </div>

              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}
              >
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 900,
                    color: THEME.ink,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {monthlySavingsRate.toFixed(1)}%
                </span>
                <Badge
                  variant={
                    monthlySavingsRate >= 40 ? "sage" : monthlySavingsRate >= 20 ? "gold" : "rust"
                  }
                  style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase" }}
                >
                  {monthlySavingsRate >= 40
                    ? "Excellent"
                    : monthlySavingsRate >= 20
                      ? "Healthy"
                      : "Low"}
                </Badge>
              </div>

              {/* Savings Rate Bar */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div
                  style={{
                    width: "100%",
                    height: 8,
                    background: "var(--t-line)",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(0, monthlySavingsRate))}%`,
                      height: "100%",
                      background: `linear-gradient(90deg, ${monthlySavingsRate >= 40 ? THEME.sage : monthlySavingsRate >= 20 ? THEME.gold : THEME.rust} 0%, color-mix(in srgb, ${monthlySavingsRate >= 40 ? THEME.sage : monthlySavingsRate >= 20 ? THEME.gold : THEME.rust} 75%, white) 100%)`,
                      borderRadius: 4,
                      transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}
                  />
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 10,
                    fontWeight: 700,
                    color: THEME.muted,
                  }}
                >
                  <span>
                    Net Savings:{" "}
                    <Prv>{fmtINRFull(Math.max(0, monthlyIncome - monthlyExpense))}</Prv>
                  </span>
                  <span>Monthly Buffer</span>
                </div>
              </div>
            </div>

            <div
              style={{
                fontSize: 12,
                color: THEME.muted,
                lineHeight: "1.5",
                fontWeight: 500,
                borderTop: `1.5px dashed ${THEME.line}`,
                paddingTop: 12,
                marginTop: 12,
              }}
            >
              {monthlySavingsRate >= 40
                ? "Superb! You are maintaining an excellent savings buffer to accelerate your wealth building."
                : monthlySavingsRate >= 20
                  ? "Good buffer. Try setting up automated transfers to direct this savings pool into active investments."
                  : "Savings rate is low. Review your non-essential categories to optimize outflow leakages."}
            </div>
          </Card>

          {/* Column 2: Top Expense Categories Breakdown */}
          <Card
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              height: "100%",
              padding: 20,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <span>📊 Monthly Spend Categories</span>
              </div>

              {topSpendCategories.length === 0 ? (
                <div
                  style={{
                    display: "flex",
                    height: 120,
                    alignItems: "center",
                    justifyContent: "center",
                    color: THEME.muted,
                    fontSize: 12,
                  }}
                >
                  No spend transactions recorded this month
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {topSpendCategories.slice(0, 4).map((c) => {
                    const percentage = monthlyExpense > 0 ? (c.amount / monthlyExpense) * 100 : 0;
                    return (
                      <div
                        key={c.name}
                        style={{ display: "flex", flexDirection: "column", gap: 4 }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          <span style={{ color: THEME.ink }}>{c.name}</span>
                          <span
                            style={{
                              color: THEME.muted,
                              fontVariantNumeric: "tabular-nums",
                              fontWeight: 700,
                            }}
                          >
                            ₹{c.amount.toLocaleString("en-IN")} ({percentage.toFixed(0)}%)
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
                              width: `${percentage}%`,
                              height: "100%",
                              background: THEME.accent,
                              borderRadius: 3,
                              transition: "width 0.5s ease",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {topSpendCategories.length > 0 && (
              <div
                style={{
                  fontSize: 12,
                  color: THEME.muted,
                  lineHeight: "1.5",
                  fontWeight: 500,
                  borderTop: `1.5px dashed ${THEME.line}`,
                  paddingTop: 12,
                  marginTop: 12,
                }}
              >
                Top expense categories for the current month. Optimize these to boost your savings
                rate.
              </div>
            )}
          </Card>

          {/* Column 3: Liquidity Distribution Share */}
          <Card
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              height: "100%",
              padding: 20,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                <span>💳 Liquidity Asset Weight</span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 11,
                  color: THEME.muted,
                  fontWeight: 700,
                }}
              >
                <span>ACCOUNT ALLOCATION</span>
                <span>SHARE %</span>
              </div>

              {/* Allocated segmented bar */}
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  height: 14,
                  background: "var(--t-line)",
                  borderRadius: 7,
                  overflow: "hidden",
                  boxShadow: "inset 0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                {liquidityWeights.map((w) => (
                  <div
                    key={w.id}
                    title={`${w.name}: ${w.share.toFixed(1)}%`}
                    style={{
                      width: `${w.share}%`,
                      height: "100%",
                      background: w.color,
                      transition: "width 0.5s ease",
                    }}
                  />
                ))}
              </div>

              {/* Details legends list formatted as a clean list table */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                {liquidityWeights.map((w: any) => (
                  <div
                    key={w.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: 12,
                      padding: "4px 0",
                      borderBottom: `1.5px dashed color-mix(in srgb, ${THEME.line} 31%, transparent)`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: w.color,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 700, color: THEME.ink }}>{w.bankName}</span>
                      <span style={{ color: THEME.muted, fontSize: 10, fontWeight: 600 }}>
                        ({w.type || "Savings"} •••• {w.accountNumberSuffix || "—"})
                      </span>
                    </div>
                    <span
                      style={{
                        fontWeight: 800,
                        color: THEME.ink,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {w.share.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {state.bankAccounts.length === 0 && (
          <div style={{ gridColumn: "1 / -1" }}>
            <BankEmptyState onAdd={() => setShowBank(true)} />
          </div>
        )}
        {state.bankAccounts.map((a: any) => {
          const theme = getAccountTheme(a.type);
          const accentColor = chartColorById[a.id] || theme.color;
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
              }}
            >
              {/* Left-side accent strip */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: 4,
                  background: accentColor,
                  zIndex: 2,
                }}
              />

              {/* Action buttons (top right) */}
              <div
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  display: "flex",
                  gap: 4,
                  zIndex: 3,
                }}
              >
                <button
                  onClick={() => setEditBankId(a.id)}
                  className="icon-btn"
                  style={{
                    ...iconBtn,
                    padding: 6,
                    borderRadius: 8,
                    background: "var(--surface-1)",
                    border: `1.5px solid ${THEME.line}`,
                  }}
                  title="Edit account"
                >
                  <Edit3 size={12} />
                </button>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete "${a.bankName}" account? Transactions linked to it will lose their account label. This cannot be undone.`
                      )
                    ) {
                      removeItem("bankAccounts", a.id);
                    }
                  }}
                  className="icon-btn danger"
                  style={{
                    ...iconBtn,
                    padding: 6,
                    borderRadius: 8,
                    background: "var(--surface-1)",
                    border: `1.5px solid ${THEME.line}`,
                  }}
                  title="Delete account"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Inner wrapper with custom paddings to clear the left accent line */}
              <div
                style={{
                  padding: "20px 24px 20px 28px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  width: "100%",
                  height: "100%",
                }}
              >
                {/* Bank Header Info */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, paddingRight: 48 }}>
                  <BankLogo bankName={a.bankName} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}
                    >
                      <div
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: accentColor,
                          background: `color-mix(in srgb, ${accentColor} 10%, transparent)`,
                          padding: "2px 8px",
                          borderRadius: 12,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <span>{theme.icon}</span> {a.type || "Savings"}
                      </div>
                      <OwnerBadge owner={a.owner} />
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: THEME.ink,
                        marginTop: 4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {a.bankName}
                    </div>
                  </div>
                </div>

                {/* Balance & Account Number */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: THEME.muted,
                        marginBottom: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontWeight: 600,
                      }}
                    >
                      <span>Account Balance</span>
                      <span
                        style={{
                          fontSize: 9,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                          color: THEME.sage,
                          fontWeight: 800,
                        }}
                      >
                        ● Live
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 900,
                        color: THEME.ink,
                        fontVariantNumeric: "tabular-nums",
                        letterSpacing: "-0.02em",
                        lineHeight: 1,
                      }}
                    >
                      <Prv>{fmtINRFull(getDisplayBalance(a))}</Prv>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: THEME.muted,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      paddingBottom: 2,
                    }}
                  >
                    <Prv>•••• {(a.accountNumber || "").slice(-4) || "—"}</Prv>
                  </div>
                </div>

                {/* Transactions count & view button */}
                <div
                  style={{
                    marginTop: 4,
                    paddingTop: 14,
                    borderTop: `1.5px solid ${THEME.line}`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>
                    {state.transactions.filter((t: any) => t.accountId === a.id).length}{" "}
                    Transactions recorded
                  </span>
                  <button
                    style={{
                      fontSize: 11,
                      padding: "4px 12px",
                      borderRadius: 8,
                      background: "var(--surface-1)",
                      border: `1.5px solid ${THEME.line}`,
                      color: THEME.accent,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    onClick={() => setFilterAcc(a.id)}
                  >
                    View Ledger →
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Row 1: Header title & presets */}
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
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>
              Transaction Ledger
            </span>
            <Badge variant="accent">{sortedTxns.length} entries</Badge>
          </div>

          {/* Segmented presets buttons */}
          <div
            style={{
              display: "flex",
              background: "var(--surface-1)",
              padding: "4px",
              borderRadius: "var(--radius-md)",
              border: `1.5px solid ${THEME.line}`,
              gap: "2px",
            }}
          >
            {["thisMonth", "lastMonth", "3months", "thisFY"].map((p) => {
              const isActive = activeRange === p;
              return (
                <button
                  key={p}
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
                  onClick={() => setQuickRange(p)}
                >
                  {
                    {
                      thisMonth: "This Month",
                      lastMonth: "Last Month",
                      "3months": "Last 3M",
                      thisFY: "This FY",
                    }[p]
                  }
                </button>
              );
            })}
            {(dateFrom || dateTo) && (
              <button
                style={{
                  padding: "5px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "none",
                  background: "transparent",
                  color: THEME.rust,
                  fontWeight: 800,
                  fontSize: "11px",
                  cursor: "pointer",
                }}
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setActiveRange(null);
                }}
              >
                ✕ Clear
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Search inputs & filters deck */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          {/* Search Notes */}
          <div style={{ position: "relative", flex: "2 1 200px", minWidth: 200 }}>
            <span
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: THEME.muted,
                fontSize: 13,
                pointerEvents: "none",
              }}
            >
              🔍
            </span>
            <input
              style={{ ...input, paddingLeft: 34, height: 38, fontSize: 13, fontWeight: 600 }}
              placeholder="Search notes, categories, references…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Account selector */}
          <select
            style={{
              ...input,
              width: "auto",
              minWidth: 150,
              height: 38,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
            value={filterAcc}
            onChange={(e) => setFilterAcc(e.target.value)}
          >
            <option value="all">All Accounts</option>
            {state.bankAccounts.map((a: any) => (
              <option key={a.id} value={a.id}>
                {accountLabel(a)}
              </option>
            ))}
          </select>

          {/* Type selector */}
          <select
            style={{
              ...input,
              width: "auto",
              minWidth: 130,
              height: 38,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="credit">Credit only</option>
            <option value="debit">Debit only</option>
            <option value="transfer">Transfers</option>
          </select>

          {/* Custom Date from-to fields */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <input
              type="date"
              style={{ ...input, width: "auto", height: 38, fontSize: 13, fontWeight: 600 }}
              title="From date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setActiveRange(null);
              }}
            />
            <span style={{ color: THEME.muted, fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
              to
            </span>
            <input
              type="date"
              style={{ ...input, width: "auto", height: 38, fontSize: 13, fontWeight: 600 }}
              title="To date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setActiveRange(null);
              }}
            />
          </div>
        </div>

        {/* Ledger Table Container */}
        {sortedTxns.length === 0 ? (
          state.transactions.length === 0 ? (
            <TxnEmptyState onAdd={() => setShowTxn(true)} />
          ) : (
            <EmptyHint text="No transactions match your query filters" />
          )
        ) : (
          <div style={{ overflowX: "auto", borderRadius: 12, border: `1.5px solid ${THEME.line}` }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "var(--surface-1)" }}>
                  <th
                    style={{ ...th, padding: "12px 16px", cursor: "pointer", userSelect: "none" }}
                    onClick={() => requestSort("date")}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      Date{" "}
                      {sortField === "date" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp size={11} strokeWidth={3} />
                        ) : (
                          <ArrowDown size={11} strokeWidth={3} />
                        )
                      ) : (
                        <ArrowUpDown size={11} />
                      )}
                    </span>
                  </th>
                  <th
                    style={{ ...th, padding: "12px 16px", cursor: "pointer", userSelect: "none" }}
                    onClick={() => requestSort("note")}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      Particulars{" "}
                      {sortField === "note" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp size={11} strokeWidth={3} />
                        ) : (
                          <ArrowDown size={11} strokeWidth={3} />
                        )
                      ) : (
                        <ArrowUpDown size={11} />
                      )}
                    </span>
                  </th>
                  <th
                    style={{ ...th, padding: "12px 16px", cursor: "pointer", userSelect: "none" }}
                    onClick={() => requestSort("category")}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      Category{" "}
                      {sortField === "category" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp size={11} strokeWidth={3} />
                        ) : (
                          <ArrowDown size={11} strokeWidth={3} />
                        )
                      ) : (
                        <ArrowUpDown size={11} />
                      )}
                    </span>
                  </th>
                  <th style={{ ...th, padding: "12px 16px" }}>Account</th>
                  <th
                    style={{
                      ...th,
                      padding: "12px 16px",
                      textAlign: "right",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => requestSort("amount")}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      Debit{" "}
                      {sortField === "amount" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp size={11} strokeWidth={3} />
                        ) : (
                          <ArrowDown size={11} strokeWidth={3} />
                        )
                      ) : (
                        <ArrowUpDown size={11} />
                      )}
                    </span>
                  </th>
                  <th
                    style={{
                      ...th,
                      padding: "12px 16px",
                      textAlign: "right",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                    onClick={() => requestSort("amount")}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      Credit{" "}
                      {sortField === "amount" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp size={11} strokeWidth={3} />
                        ) : (
                          <ArrowDown size={11} strokeWidth={3} />
                        )
                      ) : (
                        <ArrowUpDown size={11} />
                      )}
                    </span>
                  </th>
                  <th style={{ ...th, padding: "12px 16px" }}></th>
                </tr>
              </thead>
              <tbody>
                {sortedTxns.map((t: any) => {
                  const bank = state.bankAccounts.find((b: any) => b.id === t.accountId);
                  const isEditing = inlineEditId === t.id;

                  const handleSaveInline = () => {
                    if (!inlineEdit.amount || Number(inlineEdit.amount) <= 0) {
                      alert("Please enter a valid amount greater than 0");
                      return;
                    }
                    updateItem("transactions", t.id, inlineEdit);
                    setInlineEditId(null);
                  };

                  if (isEditing && inlineEdit) {
                    return (
                      <tr
                        key={t.id}
                        style={{
                          borderBottom: `1.5px solid ${THEME.accent}`,
                          background: `color-mix(in srgb, ${THEME.accent} 6%, transparent)`,
                        }}
                      >
                        <td style={{ ...td, padding: "12px 16px" }}>
                          <input
                            type="date"
                            value={inlineEdit.date}
                            onChange={(e) => setInlineEdit({ ...inlineEdit, date: e.target.value })}
                            style={{
                              ...input,
                              padding: "6px 10px",
                              fontSize: 12,
                              height: 32,
                              width: 130,
                            }}
                          />
                        </td>
                        <td style={{ ...td, padding: "12px 16px" }}>
                          <input
                            value={inlineEdit.note || ""}
                            onChange={(e) => setInlineEdit({ ...inlineEdit, note: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveInline();
                              if (e.key === "Escape") setInlineEditId(null);
                            }}
                            style={{
                              ...input,
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
                            placeholder="Narration (bank description)"
                            style={{
                              ...input,
                              padding: "4px 8px",
                              fontSize: 11,
                              minWidth: 150,
                              marginTop: 4,
                            }}
                          />
                          <input
                            value={inlineEdit.referenceNumber || ""}
                            onChange={(e) =>
                              setInlineEdit({ ...inlineEdit, referenceNumber: e.target.value })
                            }
                            placeholder="Cheque / Ref Number"
                            style={{
                              ...input,
                              padding: "4px 8px",
                              fontSize: 11,
                              minWidth: 150,
                              marginTop: 4,
                            }}
                          />
                        </td>
                        <td style={{ ...td, padding: "12px 16px" }}>
                          <select
                            value={inlineEdit.category || ""}
                            onChange={(e) =>
                              setInlineEdit({ ...inlineEdit, category: e.target.value })
                            }
                            style={{ ...input, padding: "4px 8px", height: 32, fontSize: 12 }}
                          >
                            {txnCats.map((c: string) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        </td>
                        <td
                          style={{
                            ...td,
                            padding: "12px 16px",
                            color: THEME.muted,
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {bank ? accountLabel(bank) : "—"}
                        </td>
                        <td style={{ ...td, padding: "12px 16px", textAlign: "right" }} colSpan={2}>
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
                              onChange={(e) =>
                                setInlineEdit({ ...inlineEdit, type: e.target.value })
                              }
                              style={{
                                background:
                                  inlineEdit.type === "credit"
                                    ? `color-mix(in srgb, ${THEME.sage} 12%, transparent)`
                                    : `color-mix(in srgb, ${THEME.rust} 12%, transparent)`,
                                color: inlineEdit.type === "credit" ? THEME.sage : THEME.rust,
                                border: `1.5px solid color-mix(in srgb, ${inlineEdit.type === "credit" ? THEME.sage : THEME.rust} 27%, transparent)`,
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
                                ...input,
                                padding: "4px 8px",
                                height: 32,
                                fontSize: 12,
                                width: 90,
                                textAlign: "right",
                              }}
                            />
                          </div>
                        </td>
                        <td style={{ ...td, padding: "12px 16px" }}>
                          <div style={{ display: "flex", gap: 2 }}>
                            <button
                              onClick={handleSaveInline}
                              className="icon-btn"
                              style={{ ...iconBtn, color: THEME.sage, padding: 6 }}
                              title="Save"
                            >
                              <Check size={14} />
                            </button>
                            <button
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
                  }

                  const isHovered = hoveredTxnId === t.id;

                  return (
                    <tr
                      key={t.id}
                      onMouseEnter={() => setHoveredTxnId(t.id)}
                      onMouseLeave={() => setHoveredTxnId(null)}
                      onDoubleClick={() => {
                        setInlineEditId(t.id);
                        setInlineEdit({ ...t });
                      }}
                      style={{
                        cursor: "pointer",
                        background: isHovered ? "var(--surface-1)" : "transparent",
                        transform: isHovered ? "translateX(2px)" : "none",
                        transition: "all 0.2s var(--ease-premium)",
                      }}
                      title="Double-click to edit inline"
                    >
                      <td
                        style={{
                          ...td,
                          padding: "12px 16px",
                          color: THEME.muted,
                          fontSize: 12,
                          whiteSpace: "nowrap",
                          fontWeight: 600,
                        }}
                      >
                        {t.date
                          ? new Date(t.date + "T00:00:00").toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td style={{ ...td, padding: "12px 16px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
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
                              <span
                                style={{
                                  fontSize: 8,
                                  padding: "1px 5px",
                                  borderRadius: 4,
                                  background:
                                    "color-mix(in srgb, var(--t-accent) 12%, transparent)",
                                  color: "var(--t-accent)",
                                  fontWeight: 800,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                ↔ TRANSFER
                              </span>
                            )}
                            {t.linkedType && (
                              <span
                                style={{
                                  fontSize: 8,
                                  padding: "1px 5px",
                                  borderRadius: 4,
                                  background:
                                    "color-mix(in srgb, var(--t-accent) 12%, transparent)",
                                  color: "var(--t-accent)",
                                  fontWeight: 800,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                🔗 LINKED
                              </span>
                            )}
                            {t.category !== "Transfer" &&
                              recurringKeys.has((t.note || "") + "|" + t.amount + "|" + t.type) && (
                                <span
                                  style={{
                                    fontSize: 8,
                                    padding: "1px 5px",
                                    borderRadius: 4,
                                    background: `color-mix(in srgb, ${THEME.gold} 12%, transparent)`,
                                    color: THEME.gold,
                                    fontWeight: 800,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  RECURRING
                                </span>
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
                            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                              Ref: {t.referenceNumber}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ ...td, padding: "12px 16px" }}>
                        {t.category ? (
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 20,
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
                        )}
                      </td>
                      <td
                        style={{
                          ...td,
                          padding: "12px 16px",
                          color: THEME.muted,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        {bank ? accountLabel(bank) : "—"}
                      </td>
                      <td
                        style={{
                          ...td,
                          padding: "12px 16px",
                          textAlign: "right",
                          color: THEME.rust,
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 800,
                        }}
                      >
                        {t.type === "debit" ? fmtINRExact(t.amount) : ""}
                      </td>
                      <td
                        style={{
                          ...td,
                          padding: "12px 16px",
                          textAlign: "right",
                          color: THEME.sage,
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 800,
                        }}
                      >
                        {t.type === "credit" ? fmtINRExact(t.amount) : ""}
                      </td>
                      <td style={{ ...td, padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 2 }}>
                          <button
                            onClick={() => setEditTxnId(t.id)}
                            className="icon-btn"
                            style={{
                              ...iconBtn,
                              padding: 6,
                              borderRadius: 8,
                              background: isHovered ? "var(--surface-0)" : "transparent",
                            }}
                            title="Edit"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            onClick={() => removeItem("transactions", t.id)}
                            className="icon-btn danger"
                            style={{
                              ...iconBtn,
                              padding: 6,
                              borderRadius: 8,
                              background: isHovered ? "var(--surface-0)" : "transparent",
                            }}
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {sortedTxns.length > 0 &&
                (() => {
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
                    <tfoot>
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
                          {sortedTxns.length} Transaction{sortedTxns.length === 1 ? "" : "s"} total
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
                          Net Balance
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
                          -{fmtINRExact(totalDebit)}
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
                          +{fmtINRExact(totalCredit)}
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
                          {fmtINRExact(Math.abs(net))}
                        </td>
                      </tr>
                    </tfoot>
                  );
                })()}
            </table>
          </div>
        )}
      </Card>

      {editBankId && (
        <BankEditModal
          account={state.bankAccounts.find((a: any) => a.id === editBankId)}
          onClose={() => setEditBankId(null)}
          onSave={(v: any) => {
            updateItem("bankAccounts", editBankId, v);
            setEditBankId(null);
          }}
        />
      )}
      {editTxnId && (
        <TxnEditModal
          txn={state.transactions.find((t: any) => t.id === editTxnId)}
          accounts={state.bankAccounts}
          getDisplayBalance={getDisplayBalance}
          onClose={() => setEditTxnId(null)}
          onSave={(v: any) => {
            updateItem("transactions", editTxnId, v);
            setEditTxnId(null);
          }}
        />
      )}
      {showBank && (
        <BankModal
          onClose={() => setShowBank(false)}
          onSave={(v: any) => {
            addItem("bankAccounts", v);
            setShowBank(false);
          }}
        />
      )}
      {showTxn && (
        <TxnModal
          accounts={state.bankAccounts}
          state={state}
          getDisplayBalance={getDisplayBalance}
          onClose={() => setShowTxn(false)}
          onSave={(v: any) => {
            if (v.type === "transfer" && v.toAccountId && v.accountId !== v.toAccountId) {
              const srcAcc = state.bankAccounts.find((a: any) => a.id === v.accountId);
              const destAcc = state.bankAccounts.find((a: any) => a.id === v.toAccountId);
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
              });
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
              });
            } else {
              const { toAccountId: _drop, linkedKey, ...txnBase } = v;
              const ci = linkedKey ? linkedKey.indexOf(":") : -1;
              const linkedType = ci >= 0 ? linkedKey.slice(0, ci) : undefined;
              const linkedId = ci >= 0 ? linkedKey.slice(ci + 1) : undefined;
              addItem("transactions", {
                ...txnBase,
                ...(linkedType ? { linkedType, linkedId } : {}),
              });
              if (linkedKey) autoPostLinkedTransaction(linkedKey, v);
            }
            setShowTxn(false);
          }}
        />
      )}
      {showImport && (
        <CsvImportModal
          accounts={state.bankAccounts}
          existingTransactions={state.transactions || []}
          onClose={() => setShowImport(false)}
          onImport={(rows: any) => {
            if (addTransactions) {
              addTransactions(rows);
            } else {
              rows.forEach((v: any) => addItem("transactions", v));
            }
            setShowImport(false);
          }}
        />
      )}
    </div>
  );
}

function getLinkConfig(category: string, type: string, state: any) {
  if (!state) return null;
  const fmt = (v: any) =>
    Number(v || 0).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });

  if (category === "EMI" && type === "debit") {
    return {
      label: "Loan",
      options: (state.loansTaken || []).map((l: any) => ({
        key: `loansTaken:${l.id}`,
        label: `${l.lender || "Loan"} – ${l.type || ""} | EMI ${fmt(l.emi)}/mo | Outstanding ${fmt(l.outstanding)}`,
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
          label: `${p.insurer || "Term"} – ${p.planName || "Term Plan"} – ${fmt(p.annualPremium)}/yr`,
        })),
        ...(state.investmentPlans || []).map((p: any) => ({
          key: `investmentPlans:${p.id}`,
          label: `${p.insurer || "Invest"} – ${p.planName || "Plan"} – ${fmt(p.annualPremium)}/yr`,
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
          label: `${p.propertyName || "Property"} – ${fmt(p.monthlyRent)}/mo`,
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
          label: `${p.propertyName || "Property"} – ${fmt(p.monthlyRent)}/mo`,
        })),
    };
  }
  if (category === "Bills" && type === "debit") {
    return {
      label: "Credit Card",
      options: (state.creditCards || [])
        .filter((c: any) => c.status !== "closed")
        .map((c: any) => ({
          key: `creditCards:${c.id}`,
          label: `${c.issuer || "Card"} ····${c.last4 || "????"} | Outstanding ${fmt(c.outstanding)}`,
        })),
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

function BankModal({ onClose, onSave }: any) {
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
      <Field label="Owner / Profile">
        <select
          style={input}
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
        <input
          style={input}
          value={f.bankName}
          onChange={(e) => setF({ ...f, bankName: e.target.value })}
          placeholder="e.g. HDFC Bank"
        />
      </Field>
      <Field label="Account Number (last 4 ok)">
        <input
          style={input}
          value={f.accountNumber}
          onChange={(e) => setF({ ...f, accountNumber: e.target.value })}
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Type">
          <select
            style={input}
            value={f.type}
            onChange={(e) => setF({ ...f, type: e.target.value })}
          >
            {bankAccountTypes.map((t: string) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Current Balance">
          <input
            style={input}
            type="number"
            value={f.balance}
            onChange={(e) => setF({ ...f, balance: e.target.value })}
          />
        </Field>
      </div>
      <ModalActions onSave={() => f.bankName && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function TxnModal({ accounts, state, getDisplayBalance, onClose, onSave }: any) {
  const { transactionCategories: cats, familyProfiles } = useMasterData();
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
  });
  const isTransfer = f.type === "transfer";

  const BalanceChip = ({ accId, label }: { accId: string; label: string }) => {
    const sel = accounts.find((a: any) => a.id === accId);
    if (!sel) return null;
    const bal = getDisplayBalance ? getDisplayBalance(sel) : Number(sel.balance || 0);
    const color = bal > 0 ? THEME.sage : bal < 0 ? THEME.rust : THEME.accent;
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "7px 12px",
          background: `color-mix(in srgb, ${color} 8%, transparent)`,
          border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
          borderRadius: 10,
        }}
      >
        <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color }}>{fmtINRFull(bal)}</span>
      </div>
    );
  };

  return (
    <Modal title="Record Transaction" onClose={onClose}>
      <Field label="Owner / Profile">
        <select
          style={input}
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
            style={input}
            type="date"
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
          />
        </Field>
        <Field label={isTransfer ? "From Account" : "Account"}>
          <select
            style={input}
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
      {!isTransfer &&
        (() => {
          const sel = accounts.find((a: any) => a.id === f.accountId);
          if (!sel) return null;
          const bal = getDisplayBalance ? getDisplayBalance(sel) : Number(sel.balance || 0);
          const color = bal > 0 ? THEME.sage : bal < 0 ? THEME.rust : THEME.accent;
          return (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 14px",
                background: `color-mix(in srgb, ${color} 8%, transparent)`,
                border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
                borderRadius: 10,
                marginTop: -4,
              }}
            >
              <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
                Current Balance
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, color }}>{fmtINRFull(bal)}</span>
            </div>
          );
        })()}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Type">
          <select
            style={input}
            value={f.type}
            onChange={(e) => setF({ ...f, type: e.target.value, linkedKey: "" })}
          >
            <option value="debit">Debit (money out)</option>
            <option value="credit">Credit (money in)</option>
            <option value="transfer">↔ Transfer (between accounts)</option>
          </select>
        </Field>
        <Field label="Amount">
          <input
            style={input}
            type="number"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
          />
        </Field>
      </div>
      {isTransfer && (
        <>
          <Field label="To Account">
            <select
              style={input}
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
          <div style={{ display: "flex", gap: 8, marginTop: -4 }}>
            <BalanceChip accId={f.accountId} label="From Balance" />
            <div
              style={{ display: "flex", alignItems: "center", color: THEME.muted, fontSize: 16 }}
            >
              →
            </div>
            <BalanceChip accId={f.toAccountId} label="To Balance" />
          </div>
        </>
      )}
      {!isTransfer && (
        <Field label="Category">
          <select
            style={input}
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value, linkedKey: "" })}
          >
            {cats.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      )}
      {!isTransfer &&
        (() => {
          const cfg = getLinkConfig(f.category, f.type, state);
          if (!cfg) return null;
          return (
            <Field label={`Link to ${cfg.label} (optional)`}>
              <select
                style={input}
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
              {f.linkedKey ? (
                <div
                  style={{
                    fontSize: 11,
                    color: THEME.sage,
                    marginTop: 6,
                    fontWeight: 600,
                    padding: "5px 10px",
                    background: `color-mix(in srgb, ${THEME.sage} 7%, transparent)`,
                    borderRadius: 8,
                  }}
                >
                  ✓ Will auto-update {cfg.label} record when saved
                </div>
              ) : cfg.options.length === 0 ? (
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
                  No {cfg.label.toLowerCase()} records found — add them in the relevant tab first.
                </div>
              ) : null}
            </Field>
          );
        })()}
      <Field label="Note">
        <input
          style={input}
          value={f.note}
          onChange={(e) => {
            const note = e.target.value;
            const cat = !isTransfer ? autoCateg(note) : null;
            setF({ ...f, note, ...(cat ? { category: cat, linkedKey: "" } : {}) });
          }}
          placeholder={
            isTransfer
              ? "e.g. Monthly savings transfer"
              : "e.g. Swiggy order — category auto-detected"
          }
        />
      </Field>
      <Field label="Narration">
        <input
          style={input}
          value={f.narration}
          onChange={(e) => setF({ ...f, narration: e.target.value })}
          placeholder="Bank description e.g. UPI/HDFC/REF123456"
        />
      </Field>
      <Field label="Cheque / Reference Number">
        <input
          style={input}
          value={f.referenceNumber || ""}
          onChange={(e) => setF({ ...f, referenceNumber: e.target.value })}
          placeholder="Cheque or reference number (optional)"
        />
      </Field>
      <ModalActions
        onSave={() =>
          f.amount &&
          f.accountId &&
          (!isTransfer || (f.toAccountId && f.accountId !== f.toAccountId)) &&
          onSave(f)
        }
        onClose={onClose}
      />
    </Modal>
  );
}

function TxnEditModal({ txn, accounts, getDisplayBalance, onClose, onSave }: any) {
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
  });
  return (
    <Modal title="Edit Transaction" onClose={onClose}>
      <Field label="Owner / Profile">
        <select
          style={input}
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
            style={input}
            type="date"
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
          />
        </Field>
        <Field label="Account">
          <select
            style={input}
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
      {(() => {
        const sel = accounts.find((a: any) => a.id === f.accountId);
        if (!sel) return null;
        const bal = getDisplayBalance ? getDisplayBalance(sel) : Number(sel.balance || 0);
        const color = bal > 0 ? THEME.sage : bal < 0 ? THEME.rust : THEME.accent;
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 14px",
              background: `color-mix(in srgb, ${color} 8%, transparent)`,
              border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
              borderRadius: 10,
              marginTop: -4,
            }}
          >
            <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
              Current Balance
            </span>
            <span style={{ fontSize: 14, fontWeight: 800, color }}>{fmtINRFull(bal)}</span>
          </div>
        );
      })()}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Type">
          <select
            style={input}
            value={f.type}
            onChange={(e) => setF({ ...f, type: e.target.value })}
          >
            <option value="debit">Debit (money out)</option>
            <option value="credit">Credit (money in)</option>
          </select>
        </Field>
        <Field label="Amount">
          <input
            style={input}
            type="number"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Category">
        <select
          style={input}
          value={f.category}
          onChange={(e) => setF({ ...f, category: e.target.value })}
        >
          {cats.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="Note">
        <input
          style={input}
          value={f.note}
          onChange={(e) => {
            const note = e.target.value;
            const cat = autoCateg(note);
            setF({ ...f, note, ...(cat ? { category: cat } : {}) });
          }}
          placeholder="e.g. Swiggy order — category auto-detected"
        />
      </Field>
      <Field label="Narration">
        <input
          style={input}
          value={f.narration}
          onChange={(e) => setF({ ...f, narration: e.target.value })}
          placeholder="Bank description e.g. UPI/HDFC/REF123456"
        />
      </Field>
      <Field label="Cheque / Reference Number">
        <input
          style={input}
          value={f.referenceNumber || ""}
          onChange={(e) => setF({ ...f, referenceNumber: e.target.value })}
          placeholder="Cheque or reference number (optional)"
        />
      </Field>
      <ModalActions onSave={() => f.amount && f.accountId && onSave(f)} onClose={onClose} />
    </Modal>
  );
}
