// @ts-nocheck
import React, { useState, useMemo } from "react";
import { Plus, FileUp, Edit3, Trash2, Check, X, Building2, ReceiptText } from "lucide-react";
import { THEME, PROFILES } from "../../utils/constants";
import { fmtINRFull, today, autoCateg } from "../../utils/finance";
import { Prv } from "../../context/PrivacyContext";
import { useMasterData } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Badge } from "../ui/Badge";
import { BankEditModal } from "../modals/BankEditModal";
import { CsvImportModal } from "../modals/CsvImportModal";

// Bank logo domains for Clearbit / Google Favicon API
const BANK_LOGO_DOMAINS: Record<string, string> = {
  hdfc:      "hdfcbank.com",
  icici:     "icicibank.com",
  sbi:       "sbi.co.in",
  axis:      "axisbank.com",
  kotak:     "kotak.com",
  idfc:      "idfcfirstbank.com",
  indusind:  "indusind.com",
  yesbank:   "yesbank.in",
  "yes bank": "yesbank.in",
  sc:        "sc.com",
  citi:      "citi.com",
  hsbc:      "hsbc.co.in",
  dbs:       "dbs.com",
  bob:       "bankofbaroda.in",
  baroda:    "bankofbaroda.in",
  pnb:       "pnbindia.in",
  canara:    "canarabank.com",
  idbi:      "idbibank.in",
  union:     "unionbankofindia.co.in",
  federal:   "federalbank.co.in",
  equitas:   "equitasbank.com",
  au:        "aubank.in",
  rbl:       "rblbank.com",
  bandhan:   "bandhanbank.com",
  jupiter:   "jupiter.money",
  fi:        "fi.money",
  slice:     "sliceit.com",
  onecard:   "getonecard.com",
  airtel:    "airtel.in",
  paytm:     "paytmbank.com",
  amazon:    "amazon.in",
};

// Account type visual themes
const ACCOUNT_TYPE_THEMES: Record<string, { color: string; bg: string; icon: string }> = {
  savings: { color: "#0284c7", bg: "rgba(2,132,199,0.08)", icon: "💰" },
  current: { color: "#059669", bg: "rgba(5,150,105,0.08)", icon: "💼" },
  salary:  { color: "#7c3aed", bg: "rgba(124,58,237,0.08)", icon: "💎" },
  joint:   { color: "#d97706", bg: "rgba(217,119,6,0.08)", icon: "🤝" },
  fd:      { color: "#ea580c", bg: "rgba(234,88,12,0.08)", icon: "🔒" },
  other:   { color: THEME.muted, bg: "rgba(128,128,128,0.08)", icon: "🏦" },
};

function getAccountTheme(type: string) {
  const t = (type || "savings").toLowerCase();
  if (t.includes("salary")) return ACCOUNT_TYPE_THEMES.salary;
  if (t.includes("joint"))  return ACCOUNT_TYPE_THEMES.joint;
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

  if (domain) {
    return (
      <div style={{ width: size, height: size, borderRadius: 10, background: "#fff", border: `1px solid ${THEME.line}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
        <img 
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`} 
          alt={bankName} 
          style={{ width: "70%", height: "70%", objectFit: "contain" }}
          onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.parentElement!.innerHTML = `<span style="font-size: ${size/2.5}px; font-weight: 800; color: ${THEME.muted}">${bankName.slice(0, 2).toUpperCase()}</span>`; }}
        />
      </div>
    );
  }

  return (
    <div style={{ width: size, height: size, borderRadius: 10, background: "rgba(128,128,128,0.1)", border: `1px solid ${THEME.line}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: size/2.5, fontWeight: 800, color: THEME.muted }}>{bankName.slice(0, 2).toUpperCase()}</span>
    </div>
  );
};

const OwnerBadge = ({ owner }: { owner?: string }) => {
  if (!owner) return null;
  const p = PROFILES.find(x => x.id === owner);
  if (!p) return null;
  return (
    <Badge variant="accent" style={{ fontSize: 10 }}>
      {p.name}
    </Badge>
  );
};

const SectionTitle = ({ children, sub }: { children: React.ReactNode; sub?: string }) => (
  <div style={{ marginBottom: 32 }}>
    <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>{children}</h2>
    {sub && <p style={{ color: THEME.muted, fontSize: 13, marginTop: 4 }}>{sub}</p>}
  </div>
);

const EmptyHint = ({ text }: { text: string }) => (
  <div style={{ padding: "32px 20px", textAlign: "center", color: THEME.muted }}>
    <div style={{ fontSize: 13 }}>{text}</div>
  </div>
);

const BankEmptyState = ({ onAdd }: any) => (
  <div style={{ padding: "60px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
    <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#0284c7 0%,#38bdf8 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Building2 size={28} color="#fff" />
    </div>
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>No Bank Accounts Added Yet</div>
      <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 380 }}>Connect your savings, current, and salary accounts to track balances and every rupee that moves in and out.</div>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      {["Savings & Current", "Balance Tracking", "CSV Import", "Auto Categories"].map(f => (
        <span key={f} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 20, background: "rgba(2,132,199,0.08)", color: "#0284c7", fontWeight: 600, border: "1px solid rgba(2,132,199,0.15)" }}>● {f}</span>
      ))}
    </div>
    <button style={{ marginTop: 8, padding: "10px 24px", background: "linear-gradient(135deg,#0284c7 0%,#38bdf8 100%)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }} onClick={onAdd}>
      <Plus size={16} /> Add Bank Account
    </button>
  </div>
);

const TxnEmptyState = ({ onAdd }: any) => (
  <div style={{ padding: "60px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
    <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#6366f1 0%,#a78bfa 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <ReceiptText size={28} color="#fff" />
    </div>
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>No Transactions Yet</div>
      <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 380 }}>Record income and expenses manually or bulk-import from your bank statement CSV. Every transaction is auto-categorised.</div>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      {["Debit & Credit", "Category Tags", "Bulk CSV Import", "Recurring Detection"].map(f => (
        <span key={f} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 20, background: "rgba(99,102,241,0.08)", color: "#6366f1", fontWeight: 600, border: "1px solid rgba(99,102,241,0.15)" }}>● {f}</span>
      ))}
    </div>
    <button style={{ marginTop: 8, padding: "10px 24px", background: "linear-gradient(135deg,#6366f1 0%,#a78bfa 100%)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }} onClick={onAdd}>
      <Plus size={16} /> Add Transaction
    </button>
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
  background: "var(--t-paper)",
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

const th = { textAlign: "left" as const, padding: "11px 10px", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: THEME.muted, fontWeight: 700, borderBottom: `1px solid var(--t-line)`, whiteSpace: "nowrap" as const };
const td = { padding: "12px 10px", verticalAlign: "top" as const, fontSize: 13, borderBottom: `1px solid var(--t-line)` };

export function BanksTab({ state, addItem, removeItem, updateItem }: any) {
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
  const { transactionCategories: txnCats } = useMasterData();

  const setQuickRange = (preset: string) => {
    const now = new Date();
    if (preset === "thisMonth") {
      setDateFrom(now.toISOString().slice(0, 7) + "-01");
      setDateTo(now.toISOString().slice(0, 10));
    } else if (preset === "lastMonth") {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const last = new Date(now.getFullYear(), now.getMonth(), 0);
      setDateFrom(prev.toISOString().slice(0, 10));
      setDateTo(last.toISOString().slice(0, 10));
    } else if (preset === "3months") {
      const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      setDateFrom(from.toISOString().slice(0, 10));
      setDateTo(now.toISOString().slice(0, 10));
    } else if (preset === "thisFY") {
      const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      setDateFrom(`${fyYear}-04-01`);
      setDateTo(now.toISOString().slice(0, 10));
    }
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
    .filter((t: any) => filterType === "all" || t.type === filterType)
    .filter((t: any) => !dateFrom || t.date >= dateFrom)
    .filter((t: any) => !dateTo || t.date <= dateTo)
    .filter((t: any) =>
      !search ||
      (t.note || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.category || "").toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <SectionTitle sub="Bank accounts, cash positions, and every rupee that moves">
          Banks & Transactions
        </SectionTitle>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={btnGhost} onClick={() => setShowBank(true)}>
            <Plus size={14} /> Account
          </button>
          <button style={btnGhost} onClick={() => setShowImport(true)} title="Import transactions from CSV">
            <FileUp size={14} /> Import CSV
          </button>
          <button style={btnSolid} onClick={() => setShowTxn(true)}>
            <Plus size={14} /> Transaction
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
        {state.bankAccounts.length === 0 && (
          <div style={{ ...card, gridColumn: "1 / -1" }}><BankEmptyState onAdd={() => setShowBank(true)} /></div>
        )}
        {state.bankAccounts.map((a: any) => {
          const theme = getAccountTheme(a.type);
          return (
            <div key={a.id} style={{ ...card, position: "relative", overflow: "hidden" }}>
              {/* Type indicator strip */}
              <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 4, background: theme.color }} />
              
              <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 4 }}>
                <button onClick={() => setEditBankId(a.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted }}><Edit3 size={14} /></button>
                <button onClick={() => removeItem("bankAccounts", a.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted }}><Trash2 size={14} /></button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <BankLogo bankName={a.bankName} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ 
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
                      gap: 4
                    }}>
                      <span>{theme.icon}</span> {a.type || "Savings"}
                    </div>
                    <OwnerBadge owner={a.owner} />
                  </div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, color: THEME.ink, marginTop: 4 }}>{a.bankName}</div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 2 }}>Account Balance</div>
                  <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 26, fontWeight: 800, color: THEME.ink }}><Prv>{fmtINRFull(a.balance)}</Prv></div>
                </div>
                <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600, letterSpacing: "0.05em", paddingBottom: 4 }}>
                  •••• {(a.accountNumber || "").slice(-4)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 700 }}>Transaction Ledger</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input style={{ ...input, width: "auto", minWidth: 160 }} placeholder="Search notes or category…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <select style={{ ...input, width: "auto", minWidth: 140 }} value={filterAcc} onChange={(e) => setFilterAcc(e.target.value)}>
              <option value="all">All accounts</option>
              {state.bankAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.bankName}</option>)}
            </select>
            <select style={{ ...input, width: "auto", minWidth: 120 }} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All types</option>
              <option value="credit">Credit only</option>
              <option value="debit">Debit only</option>
            </select>
            <input type="date" style={{ ...input, width: "auto" }} title="From date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <span style={{ color: THEME.muted, fontSize: 12 }}>to</span>
            <input type="date" style={{ ...input, width: "auto" }} title="To date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            {["thisMonth", "lastMonth", "3months", "thisFY"].map((p) => (
              <button key={p} style={{ ...btnGhost, padding: "6px 10px", fontSize: 11, whiteSpace: "nowrap" }} onClick={() => setQuickRange(p)}>
                {{ thisMonth: "This Month", lastMonth: "Last Month", "3months": "Last 3M", thisFY: "This FY" }[p]}
              </button>
            ))}
            {(dateFrom || dateTo) && <button style={{ ...btnGhost, padding: "4px 8px", fontSize: 12 }} onClick={() => { setDateFrom(""); setDateTo(""); }}>Clear</button>}
          </div>
        </div>

        {filteredTxns.length === 0 ? (
          state.transactions.length === 0
            ? <TxnEmptyState onAdd={() => setShowTxn(true)} />
            : <EmptyHint text="No transactions match your filters" />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${THEME.ink}` }}>
                  <th style={th}>Date</th>
                  <th style={th}>Particulars</th>
                  <th style={th}>Category</th>
                  <th style={th}>Account</th>
                  <th style={{ ...th, textAlign: "right" }}>Debit</th>
                  <th style={{ ...th, textAlign: "right" }}>Credit</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {[...filteredTxns].reverse().map((t: any) => {
                  const bank = state.bankAccounts.find((b: any) => b.id === t.accountId);
                  const isEditing = inlineEditId === t.id;

                  if (isEditing && inlineEdit) {
                    return (
                      <tr key={t.id} style={{ borderBottom: `1px solid ${THEME.accent}`, background: `color-mix(in srgb, var(--t-accent) 4%, transparent)` }}>
                        <td style={td}><input type="date" value={inlineEdit.date} onChange={(e) => setInlineEdit({ ...inlineEdit, date: e.target.value })} style={{ ...input, padding: "4px 6px", fontSize: 12, width: 130 }} /></td>
                        <td style={td}><input value={inlineEdit.note || ""} onChange={(e) => setInlineEdit({ ...inlineEdit, note: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") { updateItem("transactions", t.id, inlineEdit); setInlineEditId(null); } if (e.key === "Escape") setInlineEditId(null); }} style={{ ...input, padding: "4px 6px", fontSize: 12, minWidth: 140 }} autoFocus /></td>
                        <td style={td}><select value={inlineEdit.category || ""} onChange={(e) => setInlineEdit({ ...inlineEdit, category: e.target.value })} style={{ ...input, padding: "4px 6px", fontSize: 12 }}>{txnCats.map((c) => <option key={c}>{c}</option>)}</select></td>
                        <td style={{ ...td, color: THEME.muted, fontSize: 12 }}>{bank?.bankName || "—"}</td>
                        <td style={{ ...td, textAlign: "right" }} colSpan={2}><input type="number" value={inlineEdit.amount} onChange={(e) => setInlineEdit({ ...inlineEdit, amount: e.target.value })} style={{ ...input, padding: "4px 6px", fontSize: 12, width: 100, textAlign: "right" }} /></td>
                        <td style={td}>
                          <div style={{ display: "flex", gap: 2 }}>
                            <button onClick={() => { updateItem("transactions", t.id, inlineEdit); setInlineEditId(null); }} style={{ ...iconBtn, color: THEME.sage }} title="Save"><Check size={14} /></button>
                            <button onClick={() => setInlineEditId(null)} style={{ ...iconBtn, color: THEME.rust }} title="Cancel"><X size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={t.id} onDoubleClick={() => { setInlineEditId(t.id); setInlineEdit({ ...t }); }} style={{ borderBottom: `1px dashed ${THEME.line}`, cursor: "default" }} title="Double-click to edit inline">
                      <td style={td}>{t.date}</td>
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          {t.note || "—"}
                          {recurringKeys.has((t.note || "") + "|" + t.amount + "|" + t.type) && (
                            <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: THEME.gold + "33", color: THEME.gold, fontWeight: 700, whiteSpace: "nowrap" }}>RECURRING</span>
                          )}
                        </div>
                      </td>
                      <td style={{ ...td, color: THEME.muted, fontSize: 12 }}>{t.category}</td>
                      <td style={{ ...td, color: THEME.muted, fontSize: 12 }}>{bank?.bankName || "—"}</td>
                      <td style={{ ...td, textAlign: "right", color: THEME.accent, fontVariantNumeric: "tabular-nums" }}>{t.type === "debit" ? fmtINRFull(t.amount) : ""}</td>
                      <td style={{ ...td, textAlign: "right", color: THEME.sage, fontVariantNumeric: "tabular-nums" }}>{t.type === "credit" ? fmtINRFull(t.amount) : ""}</td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 2 }}>
                          <button onClick={() => setEditTxnId(t.id)} style={iconBtn}><Edit3 size={13} /></button>
                          <button onClick={() => removeItem("transactions", t.id)} style={iconBtn}><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editBankId && <BankEditModal account={state.bankAccounts.find((a: any) => a.id === editBankId)} onClose={() => setEditBankId(null)} onSave={(v: any) => { updateItem("bankAccounts", editBankId, v); setEditBankId(null); }} />}
      {editTxnId && <TxnEditModal txn={state.transactions.find((t: any) => t.id === editTxnId)} accounts={state.bankAccounts} onClose={() => setEditTxnId(null)} onSave={(v: any) => { updateItem("transactions", editTxnId, v); setEditTxnId(null); }} />}
      {showBank && <BankModal onClose={() => setShowBank(false)} onSave={(v: any) => { addItem("bankAccounts", v); setShowBank(false); }} />}
      {showTxn && <TxnModal accounts={state.bankAccounts} onClose={() => setShowTxn(false)} onSave={(v: any) => { addItem("transactions", v); setShowTxn(false); }} />}
      {showImport && <CsvImportModal accounts={state.bankAccounts} onClose={() => setShowImport(false)} onImport={(rows: any) => { rows.forEach((v: any) => addItem("transactions", v)); setShowImport(false); }} />}
    </div>
  );
}

function BankModal({ onClose, onSave }: any) {
  const { bankAccountTypes } = useMasterData();
  const [f, setF] = useState({ owner: "self", bankName: "", accountNumber: "", type: bankAccountTypes[0] || "Savings", balance: "" });
  return (
    <Modal title="Add Bank Account" onClose={onClose}>
      <Field label="Owner / Profile"><select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>{PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <Field label="Bank Name"><input style={input} value={f.bankName} onChange={(e) => setF({ ...f, bankName: e.target.value })} placeholder="e.g. HDFC Bank" /></Field>
      <Field label="Account Number (last 4 ok)"><input style={input} value={f.accountNumber} onChange={(e) => setF({ ...f, accountNumber: e.target.value })} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Type"><select style={input} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{bankAccountTypes.map((t: string) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Current Balance"><input style={input} type="number" value={f.balance} onChange={(e) => setF({ ...f, balance: e.target.value })} /></Field>
      </div>
      <ModalActions onSave={() => f.bankName && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function TxnModal({ accounts, onClose, onSave }: any) {
  const { transactionCategories: cats } = useMasterData();
  const [f, setF] = useState({ owner: "self", date: today(), accountId: accounts[0]?.id || "", type: "debit", amount: "", category: cats[0] || "General", note: "" });
  return (
    <Modal title="Record Transaction" onClose={onClose}>
      <Field label="Owner / Profile"><select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>{PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Date"><input style={input} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Account"><select style={input} value={f.accountId} onChange={(e) => setF({ ...f, accountId: e.target.value })}>{accounts.length === 0 && <option value="">Add account first</option>}{accounts.map((a: any) => <option key={a.id} value={a.id}>{a.bankName}</option>)}</select></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Type"><select style={input} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="debit">Debit (money out)</option><option value="credit">Credit (money in)</option></select></Field>
        <Field label="Amount"><input style={input} type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
      </div>
      <Field label="Category"><select style={input} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{cats.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Note"><input style={input} value={f.note} onChange={(e) => { const note = e.target.value; const cat = autoCateg(note); setF({ ...f, note, ...(cat ? { category: cat } : {}) }); }} placeholder="e.g. Swiggy order — category auto-detected" /></Field>
      <ModalActions onSave={() => f.amount && f.accountId && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function TxnEditModal({ txn, accounts, onClose, onSave }: any) {
  const { transactionCategories: cats } = useMasterData();
  const [f, setF] = useState({ owner: txn?.owner || "self", date: txn?.date || today(), accountId: txn?.accountId || accounts[0]?.id || "", type: txn?.type || "debit", amount: txn?.amount || "", category: txn?.category || "General", note: txn?.note || "" });
  return (
    <Modal title="Edit Transaction" onClose={onClose}>
      <Field label="Owner / Profile"><select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>{PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Date"><input style={input} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
        <Field label="Account"><select style={input} value={f.accountId} onChange={(e) => setF({ ...f, accountId: e.target.value })}>{accounts.map((a: any) => <option key={a.id} value={a.id}>{a.bankName}</option>)}</select></Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Type"><select style={input} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="debit">Debit (money out)</option><option value="credit">Credit (money in)</option></select></Field>
        <Field label="Amount"><input style={input} type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
      </div>
      <Field label="Category"><select style={input} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{cats.map((c) => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Note"><input style={input} value={f.note} onChange={(e) => { const note = e.target.value; const cat = autoCateg(note); setF({ ...f, note, ...(cat ? { category: cat } : {}) }); }} placeholder="e.g. Swiggy order — category auto-detected" /></Field>
      <ModalActions onSave={() => f.amount && f.accountId && onSave(f)} onClose={onClose} />
    </Modal>
  );
}
