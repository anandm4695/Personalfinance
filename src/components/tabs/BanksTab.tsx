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
import { THEME, PROFILES } from "../../utils/constants";
import { fmtINRFull, today, autoCateg, getLocalDateString } from "../../utils/finance";
import { Prv } from "../../context/PrivacyContext";
import { useMasterData } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Badge } from "../ui/Badge";
import { StatCard } from "../ui/StatCard";
import { Button } from "../ui/Button";
import { BankEditModal } from "../modals/BankEditModal";
import { CsvImportModal } from "../modals/CsvImportModal";
import { SectionTitle } from "../ui/SectionTitle";

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
  other: { color: THEME.muted, bg: `${THEME.line}40`, icon: "🏦" },
};

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
          background: "#fff",
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
        background: `${THEME.line}40`,
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
  if (!owner) return null;
  const p = PROFILES.find((x) => x.id === owner);
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
            background: `${THEME.accent}15`,
            color: THEME.accent,
            fontWeight: 600,
            border: `1px solid ${THEME.accent}26`,
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
            background: `${THEME.accent}15`,
            color: THEME.accent,
            fontWeight: 600,
            border: `1px solid ${THEME.accent}26`,
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
  subscription: { color: THEME.accent as string, bg: `${THEME.accent}1a` },
};
function getCategoryStyle(cat: string) {
  const key = (cat || "").toLowerCase().trim();
  for (const [k, v] of Object.entries(CATEGORY_COLORS)) {
    if (key.includes(k)) return v;
  }
  return { color: THEME.muted as string, bg: "rgba(128,128,128,0.08)" };
}

export function BanksTab({ state, addItem, removeItem, updateItem, masterData: _masterData }: any) {
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
      updateItem("creditCards", lid, {
        outstanding: Math.max(0, Number(card.outstanding || 0) - amt),
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

  const filteredTxns = state.transactions
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

  const totalBalance = state.bankAccounts.reduce(
    (acc: any, a: any) => acc + (Number(a.balance) || 0),
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

    const totalAssetBal = state.bankAccounts.reduce(
      (s: number, a: any) => s + Number(a.balance || 0),
      0
    );
    const weights = state.bankAccounts
      .map((a: any) => {
        const share = totalAssetBal > 0 ? (Number(a.balance || 0) / totalAssetBal) * 100 : 0;
        const theme = getAccountTheme(a.type);
        return {
          id: a.id,
          name: accountLabel(a),
          balance: a.balance,
          share,
          color: theme.color,
        };
      })
      .sort((a, b) => b.share - a.share);

    return {
      monthlySavingsRate: savingsRate,
      topSpendCategories: sortedCats,
      liquidityWeights: weights,
    };
  }, [monthlyIncome, monthlyExpense, monthlyTxns, state.bankAccounts]);

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 24,
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

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 14,
          marginBottom: 32,
        }}
      >
        <StatCard
          label="Total Balance"
          value={fmtINRFull(totalBalance)}
          icon={<IndianRupee />}
          color={THEME.accent}
          sub={`${state.bankAccounts.length} Connected Accounts`}
        />
        <StatCard
          label="Monthly Income"
          value={fmtINRFull(monthlyIncome)}
          icon={<TrendingUp />}
          color={THEME.sage}
          sub="Current month credits"
        />
        <StatCard
          label="Monthly Spends"
          value={fmtINRFull(monthlyExpense)}
          icon={<TrendingDown />}
          color={THEME.rust}
          sub="Current month debits"
        />
      </div>

      {/* Cash Flow Analytics Dashboard Panel */}
      {state.bankAccounts.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
            marginBottom: 32,
          }}
        >
          {/* Column 1: Savings Rate indicator */}
          <div style={{ ...card, background: "var(--surface-0)" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: THEME.muted,
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>📈 Monthly Savings Rate</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 28, fontWeight: 800, color: THEME.ink }}>
                {monthlySavingsRate.toFixed(1)}%
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  color:
                    monthlySavingsRate >= 40
                      ? THEME.sage
                      : monthlySavingsRate >= 20
                        ? THEME.gold
                        : THEME.rust,
                }}
              >
                {monthlySavingsRate >= 40
                  ? "Excellent"
                  : monthlySavingsRate >= 20
                    ? "Healthy"
                    : "Low"}
              </span>
            </div>
            {/* Savings Rate Bar */}
            <div
              style={{
                width: "100%",
                height: 8,
                background: `${THEME.line}40`,
                borderRadius: 10,
                overflow: "hidden",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  width: `${monthlySavingsRate}%`,
                  height: "100%",
                  background:
                    monthlySavingsRate >= 40
                      ? THEME.sage
                      : monthlySavingsRate >= 20
                        ? THEME.gold
                        : THEME.rust,
                  borderRadius: 10,
                  transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, lineHeight: "1.4" }}>
              {monthlySavingsRate >= 40
                ? "Superb! You are maintaining an excellent savings buffer to accelerate your goals."
                : monthlySavingsRate >= 20
                  ? "Good buffer. Try automated transfers to direct this pool into investments."
                  : "Savings rate is low. Review your non-essential categories to optimize outflows."}
            </div>
          </div>

          {/* Column 2: Top Expense Categories Breakdown */}
          <div style={{ ...card, background: "var(--surface-0)" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: THEME.muted,
                marginBottom: 12,
              }}
            >
              <span>📊 Monthly Spend Categories</span>
            </div>
            {topSpendCategories.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  height: "80px",
                  alignItems: "center",
                  justifyContent: "center",
                  color: THEME.muted,
                  fontSize: 12,
                }}
              >
                No spend transactions recorded this month
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {topSpendCategories.map((c) => {
                  const percentage = monthlyExpense > 0 ? (c.amount / monthlyExpense) * 100 : 0;
                  return (
                    <div key={c.name}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 12,
                          marginBottom: 3,
                        }}
                      >
                        <span style={{ fontWeight: 700 }}>{c.name}</span>
                        <span style={{ color: THEME.muted, fontWeight: 600 }}>
                          ₹{c.amount.toLocaleString("en-IN")} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: 6,
                          background: `${THEME.line}40`,
                          borderRadius: 10,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${percentage}%`,
                            height: "100%",
                            background: THEME.accent,
                            borderRadius: 10,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 3: Liquidity Distribution Share */}
          <div style={{ ...card, background: "var(--surface-0)" }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: THEME.muted,
                marginBottom: 12,
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
                marginBottom: 8,
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
                background: `${THEME.line}40`,
                borderRadius: 10,
                overflow: "hidden",
                marginBottom: 14,
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
                    transition: "width 0.3s ease",
                  }}
                />
              ))}
            </div>
            {/* Details legends list */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {liquidityWeights.map((w) => (
                <div
                  key={w.id}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: w.color }} />
                  <span style={{ fontWeight: 600 }}>{w.name}</span>
                  <span style={{ color: THEME.muted }}>{w.share.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </div>
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
          <div style={{ ...card, gridColumn: "1 / -1" }}>
            <BankEmptyState onAdd={() => setShowBank(true)} />
          </div>
        )}
        {state.bankAccounts.map((a: any) => {
          const theme = getAccountTheme(a.type);
          return (
            <div
              key={a.id}
              className="card-lift"
              style={{ ...card, position: "relative", overflow: "hidden" }}
            >
              {/* Type indicator strip */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: 4,
                  background: theme.color,
                }}
              />

              <div style={{ position: "absolute", top: 10, right: 10, display: "flex", gap: 2 }}>
                <button
                  onClick={() => setEditBankId(a.id)}
                  className="icon-btn"
                  style={iconBtn}
                  title="Edit account"
                >
                  <Edit3 size={14} />
                </button>
                <button
                  onClick={() => removeItem("bankAccounts", a.id)}
                  className="icon-btn danger"
                  style={iconBtn}
                  title="Delete account"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <BankLogo bankName={a.bankName} />
                <div style={{ flex: 1, paddingRight: 52 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        color: theme.color,
                        background: theme.bg,
                        padding: "2px 8px",
                        borderRadius: 20,
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
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 18,
                      fontWeight: 700,
                      color: THEME.ink,
                      marginTop: 4,
                    }}
                  >
                    {a.bankName}
                  </div>
                </div>
              </div>

              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}
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
                    }}
                  >
                    <span>Account Balance</span>
                    <span
                      style={{
                        fontSize: 9,
                        padding: "1px 6px",
                        borderRadius: 4,
                        background: `${THEME.sage}1f`,
                        color: THEME.sage,
                        fontWeight: 700,
                      }}
                    >
                      ● Live
                    </span>
                  </div>
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: 24,
                      fontWeight: 800,
                      color: THEME.ink,
                    }}
                  >
                    <Prv>{fmtINRFull(a.balance)}</Prv>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: THEME.muted,
                    fontWeight: 600,
                    letterSpacing: "0.05em",
                    paddingBottom: 4,
                  }}
                >
                  <Prv>•••• {(a.accountNumber || "").slice(-4) || "—"}</Prv>
                </div>
              </div>
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: `1px solid ${THEME.line}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                  {state.transactions.filter((t: any) => t.accountId === a.id).length} transactions
                </span>
                <button
                  style={{
                    fontSize: 11,
                    padding: "3px 12px",
                    borderRadius: 8,
                    background: "transparent",
                    border: `1px solid ${THEME.accent}40`,
                    color: THEME.accent,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                  onClick={() => setFilterAcc(a.id)}
                >
                  View →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={card}>
        <div style={{ marginBottom: 16 }}>
          {/* Row 1: Title + count + quick range presets */}
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
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em" }}>
                Transaction Ledger
              </span>
              <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                {sortedTxns.length} {sortedTxns.length === 1 ? "entry" : "entries"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
              {["thisMonth", "lastMonth", "3months", "thisFY"].map((p) => (
                <button
                  key={p}
                  style={{
                    ...btnGhost,
                    padding: "4px 10px",
                    fontSize: 10,
                    whiteSpace: "nowrap",
                    borderRadius: 8,
                    ...(activeRange === p
                      ? {
                          background: `${THEME.accent}12`,
                          borderColor: `${THEME.accent}40`,
                          color: THEME.accent,
                        }
                      : {}),
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
              ))}
              {(dateFrom || dateTo) && (
                <button
                  style={{
                    ...btnGhost,
                    padding: "3px 8px",
                    fontSize: 10,
                    color: THEME.rust,
                    borderColor: `${THEME.rust}50`,
                    borderRadius: 8,
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
          {/* Row 2: Search + account + type + date range */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: "1 1 180px", minWidth: 160 }}>
              <span
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: THEME.muted,
                  fontSize: 14,
                  pointerEvents: "none",
                }}
              >
                🔍
              </span>
              <input
                style={{ ...input, paddingLeft: 32 }}
                placeholder="Search notes, category…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              style={{ ...input, width: "auto", minWidth: 140 }}
              value={filterAcc}
              onChange={(e) => setFilterAcc(e.target.value)}
            >
              <option value="all">All accounts</option>
              {state.bankAccounts.map((a: any) => (
                <option key={a.id} value={a.id}>
                  {accountLabel(a)}
                </option>
              ))}
            </select>
            <select
              style={{ ...input, width: "auto", minWidth: 120 }}
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="all">All types</option>
              <option value="credit">Credit only</option>
              <option value="debit">Debit only</option>
              <option value="transfer">↔ Transfers</option>
            </select>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="date"
                style={{ ...input, width: "auto" }}
                title="From date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <span style={{ color: THEME.muted, fontSize: 12, flexShrink: 0 }}>to</span>
              <input
                type="date"
                style={{ ...input, width: "auto" }}
                title="To date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </div>

        {sortedTxns.length === 0 ? (
          state.transactions.length === 0 ? (
            <TxnEmptyState onAdd={() => setShowTxn(true)} />
          ) : (
            <EmptyHint text="No transactions match your filters" />
          )
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  <th
                    style={{ ...th, cursor: "pointer", userSelect: "none" }}
                    onClick={() => requestSort("date")}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                      Date{" "}
                      {sortField === "date" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp size={9} />
                        ) : (
                          <ArrowDown size={9} />
                        )
                      ) : (
                        <ArrowUpDown size={9} />
                      )}
                    </span>
                  </th>
                  <th
                    style={{ ...th, cursor: "pointer", userSelect: "none" }}
                    onClick={() => requestSort("note")}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                      Particulars{" "}
                      {sortField === "note" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp size={9} />
                        ) : (
                          <ArrowDown size={9} />
                        )
                      ) : (
                        <ArrowUpDown size={9} />
                      )}
                    </span>
                  </th>
                  <th
                    style={{ ...th, cursor: "pointer", userSelect: "none" }}
                    onClick={() => requestSort("category")}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                      Category{" "}
                      {sortField === "category" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp size={9} />
                        ) : (
                          <ArrowDown size={9} />
                        )
                      ) : (
                        <ArrowUpDown size={9} />
                      )}
                    </span>
                  </th>
                  <th style={th}>Account</th>
                  <th
                    style={{ ...th, textAlign: "right", cursor: "pointer", userSelect: "none" }}
                    onClick={() => requestSort("amount")}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                      Debit{" "}
                      {sortField === "amount" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp size={9} />
                        ) : (
                          <ArrowDown size={9} />
                        )
                      ) : (
                        <ArrowUpDown size={9} />
                      )}
                    </span>
                  </th>
                  <th
                    style={{ ...th, textAlign: "right", cursor: "pointer", userSelect: "none" }}
                    onClick={() => requestSort("amount")}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                      Credit{" "}
                      {sortField === "amount" ? (
                        sortDirection === "asc" ? (
                          <ArrowUp size={9} />
                        ) : (
                          <ArrowDown size={9} />
                        )
                      ) : (
                        <ArrowUpDown size={9} />
                      )}
                    </span>
                  </th>
                  <th style={th}></th>
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
                          borderBottom: `1px solid ${THEME.accent}`,
                          background: `${THEME.accent}09`,
                        }}
                      >
                        <td style={td}>
                          <input
                            type="date"
                            value={inlineEdit.date}
                            onChange={(e) => setInlineEdit({ ...inlineEdit, date: e.target.value })}
                            style={{ ...input, padding: "4px 6px", fontSize: 12, width: 130 }}
                          />
                        </td>
                        <td style={td}>
                          <input
                            value={inlineEdit.note || ""}
                            onChange={(e) => setInlineEdit({ ...inlineEdit, note: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveInline();
                              if (e.key === "Escape") setInlineEditId(null);
                            }}
                            style={{ ...input, padding: "4px 6px", fontSize: 12, minWidth: 140 }}
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
                              padding: "4px 6px",
                              fontSize: 11,
                              minWidth: 140,
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
                              padding: "4px 6px",
                              fontSize: 11,
                              minWidth: 140,
                              marginTop: 4,
                            }}
                          />
                        </td>
                        <td style={td}>
                          <select
                            value={inlineEdit.category || ""}
                            onChange={(e) =>
                              setInlineEdit({ ...inlineEdit, category: e.target.value })
                            }
                            style={{ ...input, padding: "4px 6px", fontSize: 12 }}
                          >
                            {txnCats.map((c) => (
                              <option key={c}>{c}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ ...td, color: THEME.muted, fontSize: 12 }}>
                          {bank ? accountLabel(bank) : "—"}
                        </td>
                        <td style={{ ...td, textAlign: "right" }} colSpan={2}>
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
                                    ? `${THEME.sage}15`
                                    : `${THEME.rust}15`,
                                color: inlineEdit.type === "credit" ? THEME.sage : THEME.rust,
                                border: `1.5px solid ${inlineEdit.type === "credit" ? THEME.sage : THEME.rust}44`,
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 800,
                                padding: "2px 4px",
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
                                padding: "4px 6px",
                                fontSize: 12,
                                width: 90,
                                textAlign: "right",
                              }}
                            />
                          </div>
                        </td>
                        <td style={td}>
                          <div style={{ display: "flex", gap: 2 }}>
                            <button
                              onClick={handleSaveInline}
                              className="icon-btn"
                              style={{ ...iconBtn, color: THEME.sage }}
                              title="Save"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => setInlineEditId(null)}
                              className="icon-btn danger"
                              style={{ ...iconBtn, color: THEME.rust }}
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr
                      key={t.id}
                      onDoubleClick={() => {
                        setInlineEditId(t.id);
                        setInlineEdit({ ...t });
                      }}
                      style={{ cursor: "default" }}
                      title="Double-click to edit inline"
                    >
                      <td style={{ ...td, color: THEME.muted, fontSize: 12, whiteSpace: "nowrap" }}>
                        {t.date
                          ? new Date(t.date + "T00:00:00").toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            {t.note || "—"}
                            {t.category === "Transfer" && (
                              <span
                                style={{
                                  fontSize: 9,
                                  padding: "1px 5px",
                                  borderRadius: 4,
                                  background: "#8B5CF633",
                                  color: "#8B5CF6",
                                  fontWeight: 700,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                ↔ TRANSFER
                              </span>
                            )}
                            {t.linkedType && (
                              <span
                                style={{
                                  fontSize: 9,
                                  padding: "1px 5px",
                                  borderRadius: 4,
                                  background: "#0EA5E933",
                                  color: "#0EA5E9",
                                  fontWeight: 700,
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
                                    fontSize: 9,
                                    padding: "1px 5px",
                                    borderRadius: 4,
                                    background: `${THEME.gold}33`,
                                    color: THEME.gold,
                                    fontWeight: 700,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  RECURRING
                                </span>
                              )}
                          </div>
                          {t.narration && (
                            <div style={{ fontSize: 11, color: THEME.muted, fontStyle: "italic" }}>
                              {t.narration}
                            </div>
                          )}
                          {t.referenceNumber && (
                            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 500 }}>
                              Ref: {t.referenceNumber}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ ...td, fontSize: 12 }}>
                        {t.category ? (
                          <span
                            style={{
                              padding: "2px 8px",
                              borderRadius: 20,
                              fontSize: 10,
                              fontWeight: 700,
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
                      <td style={{ ...td, color: THEME.muted, fontSize: 12 }}>
                        {bank ? accountLabel(bank) : "—"}
                      </td>
                      <td
                        style={{
                          ...td,
                          textAlign: "right",
                          color: THEME.rust,
                          fontVariantNumeric: "tabular-nums",
                          fontWeight: 700,
                        }}
                      >
                        {t.type === "debit" ? fmtINRFull(t.amount) : ""}
                      </td>
                      <td
                        style={{
                          ...td,
                          textAlign: "right",
                          color: THEME.sage,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {t.type === "credit" ? fmtINRFull(t.amount) : ""}
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 2 }}>
                          <button
                            onClick={() => setEditTxnId(t.id)}
                            className="icon-btn"
                            style={iconBtn}
                            title="Edit"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => {
                              const acc = state.bankAccounts.find((a: any) => a.id === t.accountId);
                              if (acc) {
                                const delta = t.type === "credit" ? -Number(t.amount || 0) : Number(t.amount || 0);
                                updateItem("bankAccounts", acc.id, { balance: Number(acc.balance || 0) + delta });
                              }
                              removeItem("transactions", t.id);
                            }}
                            className="icon-btn danger"
                            style={iconBtn}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {sortedTxns.length > 0 && (
                <tfoot>
                  <tr style={{ background: `${THEME.accent}08` }}>
                    <td
                      colSpan={4}
                      style={{
                        padding: "10px",
                        fontSize: 11,
                        fontWeight: 800,
                        color: THEME.muted,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        borderTop: `1.5px solid ${THEME.line}`,
                      }}
                    >
                      {sortedTxns.length} {sortedTxns.length === 1 ? "transaction" : "transactions"}
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        textAlign: "right",
                        fontWeight: 900,
                        color: THEME.rust,
                        fontSize: 13,
                        borderTop: `1.5px solid ${THEME.line}`,
                      }}
                    >
                      -
                      {fmtINRFull(
                        sortedTxns
                          .filter((t: any) => t.type === "debit")
                          .reduce((s: number, t: any) => s + Number(t.amount || 0), 0)
                      )}
                    </td>
                    <td
                      style={{
                        padding: "10px",
                        textAlign: "right",
                        fontWeight: 900,
                        color: THEME.sage,
                        fontSize: 13,
                        borderTop: `1.5px solid ${THEME.line}`,
                      }}
                    >
                      +
                      {fmtINRFull(
                        sortedTxns
                          .filter((t: any) => t.type === "credit")
                          .reduce((s: number, t: any) => s + Number(t.amount || 0), 0)
                      )}
                    </td>
                    <td style={{ borderTop: `1.5px solid ${THEME.line}` }} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

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
          onClose={() => setEditTxnId(null)}
          onSave={(v: any) => {
            const old = state.transactions.find((t: any) => t.id === editTxnId);
            updateItem("transactions", editTxnId, v);
            if (old) {
              const oldDelta = old.type === "credit" ? Number(old.amount || 0) : -Number(old.amount || 0);
              const newDelta = v.type === "credit" ? Number(v.amount || 0) : -Number(v.amount || 0);
              if (old.accountId === v.accountId) {
                const acc = state.bankAccounts.find((a: any) => a.id === v.accountId);
                if (acc) updateItem("bankAccounts", acc.id, { balance: Number(acc.balance || 0) - oldDelta + newDelta });
              } else {
                const oldAcc = state.bankAccounts.find((a: any) => a.id === old.accountId);
                const newAcc = state.bankAccounts.find((a: any) => a.id === v.accountId);
                if (oldAcc) updateItem("bankAccounts", oldAcc.id, { balance: Number(oldAcc.balance || 0) - oldDelta });
                if (newAcc) updateItem("bankAccounts", newAcc.id, { balance: Number(newAcc.balance || 0) + newDelta });
              }
            }
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
          onClose={() => setShowTxn(false)}
          onSave={(v: any) => {
            const amt = Number(v.amount || 0);
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
              if (srcAcc) updateItem("bankAccounts", srcAcc.id, { balance: Number(srcAcc.balance || 0) - amt });
              if (destAcc) updateItem("bankAccounts", destAcc.id, { balance: Number(destAcc.balance || 0) + amt });
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
              const acc = state.bankAccounts.find((a: any) => a.id === v.accountId);
              if (acc) {
                const delta = v.type === "credit" ? amt : -amt;
                updateItem("bankAccounts", acc.id, { balance: Number(acc.balance || 0) + delta });
              }
            }
            setShowTxn(false);
          }}
        />
      )}
      {showImport && (
        <CsvImportModal
          accounts={state.bankAccounts}
          onClose={() => setShowImport(false)}
          onImport={(rows: any) => {
            rows.forEach((v: any) => addItem("transactions", v));
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
  const { bankAccountTypes } = useMasterData();
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
          {PROFILES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
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

function TxnModal({ accounts, state, onClose, onSave }: any) {
  const { transactionCategories: cats } = useMasterData();
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
    const bal = Number(sel.balance || 0);
    const color = bal > 0 ? THEME.sage : bal < 0 ? THEME.rust : "#3B82F6";
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "7px 12px",
          background: color + "14",
          border: `1px solid ${color}33`,
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
          {PROFILES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
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
          const bal = Number(sel.balance || 0);
          const color = bal > 0 ? THEME.sage : bal < 0 ? THEME.rust : "#3B82F6";
          return (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 14px",
                background: color + "14",
                border: `1px solid ${color}33`,
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
                    background: `${THEME.sage}12`,
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

function TxnEditModal({ txn, accounts, onClose, onSave }: any) {
  const { transactionCategories: cats } = useMasterData();
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
          {PROFILES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
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
        const bal = Number(sel.balance || 0);
        const color = bal > 0 ? THEME.sage : bal < 0 ? THEME.rust : "#3B82F6";
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 14px",
              background: color + "14",
              border: `1px solid ${color}33`,
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
