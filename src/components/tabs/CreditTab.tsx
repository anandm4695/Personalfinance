// @ts-nocheck
import React, { useState } from "react";
import { Plus, Edit3, Trash2, TrendingDown, TrendingUp, ArrowLeftRight, IndianRupee, ChevronUp, ChevronDown, List, X } from "lucide-react";
import { THEME, PROFILES } from "../../utils/constants";
import { fmtINR, fmtINRFull, today, uid } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Badge } from "../ui/Badge";

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

const Tile = ({ icon: Icon, label, value, subColor }: any) => (
  <div style={{ background: "var(--t-darkInk)", padding: 20, borderRadius: 12, border: `1px solid ${THEME.line}` }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, color: THEME.muted, fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
      <Icon size={14} /> {label}
    </div>
    <div style={{ fontSize: 20, fontWeight: 800, color: subColor }}>{value}</div>
  </div>
);

const EmptyHint = ({ text }: { text: string }) => (
  <div style={{ padding: "40px 20px", textAlign: "center", color: THEME.muted }}>
    <div style={{ fontSize: 14 }}>{text}</div>
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

const btnAccent = {
  ...btnSolid,
  background: THEME.accent,
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
  background: "var(--t-darkInk)",
  borderRadius: 12,
  border: `1px solid ${THEME.line}`,
  padding: 20,
};

const cardDark = {
  background: THEME.ink,
  color: "#fff",
  borderRadius: 12,
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

const Grid = ({ children }: { children: React.ReactNode }) => (
  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 32 }}>
    {children}
  </div>
);

const InvestCard = ({ children, onRemove, onEdit }: any) => (
  <div style={{ ...card, position: "relative" }}>
    <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 4 }}>
      <button onClick={onEdit} style={iconBtn}><Edit3 size={14} /></button>
      <button onClick={onRemove} style={iconBtn}><Trash2 size={14} /></button>
    </div>
    {children}
  </div>
);

const Stat = ({ k, v }: { k: string; v: any }) => (
  <div>
    <div style={{ fontSize: 10, color: THEME.muted, textTransform: "uppercase" }}>{k}</div>
    <div style={{ fontWeight: 600 }}>{v}</div>
  </div>
);

const th = { textAlign: "left" as const, padding: "11px 10px", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: THEME.muted, fontWeight: 700, borderBottom: `1px solid var(--t-line)`, whiteSpace: "nowrap" as const };
const td = { padding: "12px 10px", verticalAlign: "top" as const, fontSize: 13, borderBottom: `1px solid var(--t-line)` };

export function CreditTab({ state, addItem, removeItem, updateItem }: any) {
  const [sub, setSub] = useState("cc");
  const [modal, setModal] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const subs = [
    { id: "cc", label: "Credit Cards", key: "creditCards" },
    { id: "prepaid", label: "Prepaid Cards", key: "prepaidCards" },
    { id: "taken", label: "Loans Taken", key: "loansTaken" },
    { id: "given", label: "Loans Given", key: "loansGiven" },
    { id: "borrowed", label: "From People", key: "informalBorrowed" },
    { id: "lent", label: "To People", key: "informalLent" },
  ];

  return (
    <div>
      <SectionTitle sub="Cards, debts owed, and debts owed to you">
        Credit & Loans
      </SectionTitle>

      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: `1px solid ${THEME.line}` }}>
        {subs.map((s) => {
          const active = sub === s.id;
          return (
            <button key={s.id} onClick={() => setSub(s.id)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: "10px 20px", fontFamily: "inherit", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: active ? THEME.accent : THEME.muted, borderBottom: `2px solid ${active ? THEME.accent : "transparent"}`, fontWeight: active ? 700 : 500 }}>{s.label}</button>
          );
        })}
      </div>

      {sub !== "borrowed" && sub !== "lent" && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button style={btnSolid} onClick={() => setModal(sub)}><Plus size={14} /> Add</button>
        </div>
      )}

      {sub === "cc" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
            <div style={card}>
              <div style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Total Credit Limit</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: THEME.accent, marginTop: 4 }}>{fmtINRFull(state.creditCards.reduce((acc: any, c: any) => acc + (Number(c.limit) || 0), 0))}</div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Total Outstanding</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: THEME.rust, marginTop: 4 }}>{fmtINRFull(state.creditCards.reduce((acc: any, c: any) => acc + (Number(c.outstanding) || 0), 0))}</div>
            </div>
            <div style={card}>
              <div style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>Available Credit</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: THEME.sage, marginTop: 4 }}>{fmtINRFull(state.creditCards.reduce((acc: any, c: any) => acc + (Number(c.limit) || 0) - (Number(c.outstanding) || 0), 0))}</div>
            </div>
          </div>
          <CCList items={state.creditCards} onRemove={(id: any) => removeItem("creditCards", id)} onEdit={setEditId} onUpdateCard={(id: any, updates: any) => updateItem("creditCards", id, updates)} />
        </>
      )}
      {sub === "prepaid" && <PrepaidList items={state.prepaidCards} onRemove={(id: any) => removeItem("prepaidCards", id)} onEdit={setEditId} />}
      {sub === "taken" && (
        <>
          <LoanTakenList items={state.loansTaken} onRemove={(id: any) => removeItem("loansTaken", id)} onEdit={setEditId} />
          {state.loansTaken.length > 0 && (
            <div style={{ marginTop: 32 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Payoff Progress</div>
              <div style={{ display: "grid", gap: 16 }}>
                {state.loansTaken.map((l: any) => {
                  const principal = Number(l.principal) || 0;
                  const outstanding = Number(l.outstanding) || 0;
                  const emi = Number(l.emi) || 0;
                  const months = Number(l.monthsRemaining) || 0;
                  const paid = principal - outstanding;
                  const paidPct = principal > 0 ? (paid / principal) * 100 : 0;
                  const totalRemaining = emi * months;
                  const interestRemaining = Math.max(0, totalRemaining - outstanding);
                  const payoffDate = new Date();
                  payoffDate.setMonth(payoffDate.getMonth() + months);
                  return (
                    <div key={l.id} style={card}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                        <div><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: THEME.muted }}>{l.type || "Loan"}</div><div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{l.lender}</div></div>
                        <div style={{ textAlign: "right" }}><div style={{ fontSize: 22, fontWeight: 800, color: THEME.rust }}>{fmtINRFull(outstanding)}</div><div style={{ fontSize: 11, color: THEME.muted }}>outstanding</div></div>
                      </div>
                      <div style={{ height: 10, background: THEME.line, borderRadius: 5, overflow: "hidden", marginBottom: 8 }}>
                        <div style={{ height: "100%", width: Math.min(paidPct, 100) + "%", background: paidPct > 60 ? THEME.sage : paidPct > 30 ? THEME.gold : THEME.rust, borderRadius: 5, transition: "width 0.6s" }} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, fontSize: 12 }}>
                        <div><div style={{ color: THEME.muted, marginBottom: 2 }}>Principal paid</div><div style={{ fontWeight: 700, color: THEME.sage }}>{fmtINR(paid)}</div></div>
                        <div><div style={{ color: THEME.muted, marginBottom: 2 }}>EMI</div><div style={{ fontWeight: 700 }}>{fmtINR(emi)}/mo</div></div>
                        <div><div style={{ color: THEME.muted, marginBottom: 2 }}>Interest remaining</div><div style={{ fontWeight: 700, color: THEME.rust }}>{fmtINR(interestRemaining)}</div></div>
                        <div><div style={{ color: THEME.muted, marginBottom: 2 }}>Payoff date</div><div style={{ fontWeight: 700 }}>{months > 0 ? payoffDate.toLocaleString("en-IN", { month: "short", year: "numeric" }) : "—"}</div></div>
                      </div>
                      <div style={{ marginTop: 10, fontSize: 12, color: THEME.muted }}>{paidPct.toFixed(1)}% of principal repaid · {months} months left</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
      {sub === "given" && <LoanGivenList items={state.loansGiven} onRemove={(id: any) => removeItem("loansGiven", id)} onEdit={setEditId} />}
      {sub === "borrowed" && <InformalLoanView direction="borrowed" items={state.informalBorrowed || []} onAddPerson={(v: any) => addItem("informalBorrowed", v)} onUpdate={(id: any, patch: any) => updateItem("informalBorrowed", id, patch)} onRemove={(id: any) => removeItem("informalBorrowed", id)} />}
      {sub === "lent" && <InformalLoanView direction="lent" items={state.informalLent || []} onAddPerson={(v: any) => addItem("informalLent", v)} onUpdate={(id: any, patch: any) => updateItem("informalLent", id, patch)} onRemove={(id: any) => removeItem("informalLent", id)} />}

      {modal === "cc" && <CCModal onClose={() => setModal(null)} onSave={(v: any) => { addItem("creditCards", v); setModal(null); }} />}
      {modal === "prepaid" && <PrepaidModal onClose={() => setModal(null)} onSave={(v: any) => { addItem("prepaidCards", v); setModal(null); }} />}
      {modal === "taken" && <LoanTakenModal onClose={() => setModal(null)} onSave={(v: any) => { addItem("loansTaken", v); setModal(null); }} />}
      {modal === "given" && <LoanGivenModal onClose={() => setModal(null)} onSave={(v: any) => { addItem("loansGiven", v); setModal(null); }} />}

      {editId && sub === "cc" && <CCModal initial={state.creditCards.find((x: any) => x.id === editId)} onClose={() => setEditId(null)} onSave={(v: any) => { updateItem("creditCards", editId, v); setEditId(null); }} />}
      {editId && sub === "prepaid" && <PrepaidModal initial={state.prepaidCards.find((x: any) => x.id === editId)} onClose={() => setEditId(null)} onSave={(v: any) => { updateItem("prepaidCards", editId, v); setEditId(null); }} />}
      {editId && sub === "taken" && <LoanTakenModal initial={state.loansTaken.find((x: any) => x.id === editId)} onClose={() => setEditId(null)} onSave={(v: any) => { updateItem("loansTaken", editId, v); setEditId(null); }} />}
      {editId && sub === "given" && <LoanGivenModal initial={state.loansGiven.find((x: any) => x.id === editId)} onClose={() => setEditId(null)} onSave={(v: any) => { updateItem("loansGiven", editId, v); setEditId(null); }} />}
    </div>
  );
}

function CCList({ items, onRemove, onEdit, onUpdateCard }: any) {
  const [selectedLedger, setSelectedLedger] = useState<string | null>(null);
  if (!items.length) return <EmptyHint text="No credit cards yet" />;
  const selectedCard = items.find((c: any) => c.id === selectedLedger);
  return (
    <div>
      <Grid>
        {items.map((c: any) => {
          const util = Number(c.limit) ? (Number(c.outstanding) / Number(c.limit)) * 100 : 0;
          return (
            <div key={c.id} style={{ ...cardDark, position: "relative", background: `linear-gradient(135deg, ${THEME.ink} 0%, #1A2A42 100%)`, paddingBottom: 60 }}>
              <div style={{ position: "absolute", top: 12, right: 12, display: "flex", gap: 4 }}>
                <button onClick={() => onEdit(c.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(245,239,227,0.6)" }}><Edit3 size={14} /></button>
                <button onClick={() => onRemove(c.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "rgba(245,239,227,0.6)" }}><Trash2 size={14} /></button>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}><div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: THEME.gold }}>{c.network || "Card"}</div><OwnerBadge owner={c.owner} /></div>
              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>{c.issuer}</div>
              <div style={{ fontSize: 16, letterSpacing: "0.05em", marginTop: 12, opacity: 0.8 }}>•••• •••• •••• {c.last4 || "****"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20, fontSize: 12 }}><div><div style={{ color: "rgba(245,239,227,0.6)", fontSize: 9, textTransform: "uppercase" }}>Outstanding</div><div style={{ fontWeight: 700, fontSize: 16 }}>{fmtINRFull(c.outstanding)}</div></div><div><div style={{ color: "rgba(245,239,227,0.6)", fontSize: 9, textTransform: "uppercase" }}>Limit</div><div style={{ fontWeight: 700, fontSize: 16 }}>{fmtINRFull(c.limit)}</div></div></div>
              <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 11, color: "rgba(245,239,227,0.7)" }}><div>Bill Date: <strong>{c.billDate || "—"}th</strong></div><div>Due Day: <strong>{c.dueDay || "—"}th</strong></div><div>Fee: <strong>{fmtINR(c.annualFee)}</strong></div><div>Helpline: <strong>{c.helpline || "—"}</strong></div></div>
              {c.waiverInfo && <div style={{ marginTop: 12, fontSize: 10, background: "rgba(255,255,255,0.05)", padding: "6px 10px", borderRadius: 6, color: THEME.gold }}>Waiver: {c.waiverInfo}</div>}
              <div style={{ marginTop: 16 }}><div style={{ height: 4, background: "rgba(245,239,227,0.15)", borderRadius: 2 }}><div style={{ height: "100%", width: `${Math.min(util, 100)}%`, background: util > 70 ? THEME.rust : THEME.gold, borderRadius: 2 }} /></div><div style={{ fontSize: 10, color: util > 70 ? THEME.rust : "rgba(245,239,227,0.6)", marginTop: 6 }}>{util.toFixed(1)}% utilization</div></div>
              <button onClick={() => setSelectedLedger(c.id)} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 44, background: "rgba(255,255,255,0.05)", border: "none", borderTop: `1px solid rgba(255,255,255,0.1)`, color: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><List size={14} /> View Transactions ({c.transactions?.length || 0})</button>
            </div>
          );
        })}
      </Grid>
      {selectedLedger && selectedCard && <CCTransactionLedger card={selectedCard} onClose={() => setSelectedLedger(null)} onUpdate={(newTransactions: any) => { const newOutstanding = newTransactions.reduce((acc: any, t: any) => acc + Number(t.amount), 0); onUpdateCard(selectedLedger, { transactions: newTransactions, outstanding: String(newOutstanding) }); }} />}
    </div>
  );
}

function CCTransactionLedger({ card, onClose, onUpdate }: any) {
  const [txs, setTxs] = useState(card.transactions || []);
  const [showAdd, setShowAdd] = useState(false);
  const [newTx, setNewTx] = useState({ date: today(), merchant: "", amount: "", category: "General" });
  const [editId, setEditId] = useState<string | null>(null);
  const saveTx = () => { if (!newTx.merchant || !newTx.amount) return; let updated; if (editId) { updated = txs.map((t: any) => t.id === editId ? { ...newTx, id: editId } : t); } else { updated = [...txs, { ...newTx, id: uid() }]; } setTxs(updated); onUpdate(updated); setShowAdd(false); setEditId(null); setNewTx({ date: today(), merchant: "", amount: "", category: "General" }); };
  const removeTx = (id: any) => { const updated = txs.filter((t: any) => t.id !== id); setTxs(updated); onUpdate(updated); };
  const startEdit = (t: any) => { setNewTx({ date: t.date, merchant: t.merchant, amount: t.amount, category: t.category }); setEditId(t.id); setShowAdd(true); };
  return (
    <Modal title={`${card.issuer} - Transactions`} onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><div style={{ fontSize: 14, fontWeight: 600 }}>Recent Ledger</div><button style={{ ...btnGhost, padding: "6px 12px", fontSize: 12 }} onClick={() => { if (showAdd) { setShowAdd(false); setEditId(null); setNewTx({ date: today(), merchant: "", amount: "", category: "General" }); } else setShowAdd(true); }}>{showAdd ? "Cancel" : <><Plus size={14} /> Add Transaction</>}</button></div>
      {showAdd && (
        <div style={{ ...card, background: THEME.darkInk, border: `1px solid ${THEME.line}`, marginBottom: 16, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: THEME.accent }}>{editId ? "EDIT TRANSACTION" : "NEW TRANSACTION"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}><Field label="Date"><input type="date" style={input} value={newTx.date} onChange={e => setNewTx({...newTx, date: e.target.value})} /></Field><Field label="Amount"><input type="number" style={input} value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})} placeholder="0.00" /></Field></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}><Field label="Merchant"><input type="text" style={input} value={newTx.merchant} onChange={e => setNewTx({...newTx, merchant: e.target.value})} placeholder="e.g. Amazon" /></Field><Field label="Category"><input type="text" style={input} value={newTx.category} onChange={e => setNewTx({...newTx, category: e.target.value})} placeholder="e.g. Food" /></Field></div>
          <button style={{ ...btnAccent, width: "100%" }} onClick={saveTx}>{editId ? "Update Transaction" : "Save Transaction"}</button>
        </div>
      )}
      <div style={{ maxHeight: 400, overflowY: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr style={{ textAlign: "left", borderBottom: `1px solid ${THEME.line}`, color: THEME.muted }}><th style={{ padding: "10px 8px" }}>Date</th><th style={{ padding: "10px 8px" }}>Merchant</th><th style={{ padding: "10px 8px" }}>Category</th><th style={{ padding: "10px 8px", textAlign: "right" }}>Amount</th><th style={{ padding: "10px 8px", width: 70 }}></th></tr></thead>
          <tbody>{txs.sort((a: any, b: any) => b.date.localeCompare(a.date)).map((t: any) => (<tr key={t.id} style={{ borderBottom: `1px solid ${THEME.line}` }}><td style={{ padding: "12px 8px" }}>{t.date}</td><td style={{ padding: "12px 8px", fontWeight: 600 }}>{t.merchant}</td><td style={{ padding: "12px 8px" }}><span style={{ background: THEME.paper, padding: "2px 8px", borderRadius: 4, fontSize: 11 }}>{t.category}</span></td><td style={{ padding: "12px 8px", textAlign: "right", fontWeight: 700 }}>{fmtINR(t.amount)}</td><td style={{ padding: "12px 8px", textAlign: "right" }}><div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button onClick={() => startEdit(t)} style={{ background: "transparent", border: "none", color: THEME.muted, cursor: "pointer" }}><Edit3 size={14} /></button><button onClick={() => removeTx(t.id)} style={{ background: "transparent", border: "none", color: THEME.rust, cursor: "pointer" }}><X size={14} /></button></div></td></tr>))}</tbody>
        </table>
      </div>
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: `2px solid ${THEME.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ fontSize: 14, color: THEME.muted }}>Total Ledger Outstanding</div><div style={{ fontSize: 20, fontWeight: 800, color: THEME.rust }}>{fmtINRFull(txs.reduce((acc: any, t: any) => acc + Number(t.amount), 0))}</div></div>
    </Modal>
  );
}

function PrepaidList({ items, onRemove, onEdit }: any) {
  if (!items.length) return <EmptyHint text="No prepaid cards/wallets" />;
  return (
    <Grid>
      {items.map((p: any) => (
        <InvestCard key={p.id} onRemove={() => onRemove(p.id)} onEdit={() => onEdit(p.id)}>
          <div style={{ fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: THEME.muted }}>{p.provider}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, fontWeight: 700, marginTop: 4 }}>{p.name}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: 800, marginTop: 12 }}>{fmtINRFull(p.balance)}</div>
        </InvestCard>
      ))}
    </Grid>
  );
}

function LoanTakenList({ items, onRemove, onEdit }: any) {
  if (!items.length) return <EmptyHint text="No loans taken" />;
  return (
    <Grid>
      {items.map((l: any) => (
        <InvestCard key={l.id} onRemove={() => onRemove(l.id)} onEdit={() => onEdit(l.id)}>
          <div style={{ fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: THEME.accent }}>{l.type || "Loan"}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginTop: 4 }}>{l.lender}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 800, marginTop: 12, color: THEME.accent }}>{fmtINRFull(l.outstanding)}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12, fontSize: 12 }}>
            <Stat k="Principal" v={fmtINR(l.principal)} />
            <Stat k="EMI" v={fmtINR(l.emi)} />
            <Stat k="Rate" v={`${l.rate}%`} />
            <Stat k="Tenure Left" v={`${l.monthsRemaining || "—"} mo`} />
          </div>
        </InvestCard>
      ))}
    </Grid>
  );
}

function LoanGivenList({ items, onRemove, onEdit }: any) {
  if (!items.length) return <EmptyHint text="No loans given" />;
  return (
    <Grid>
      {items.map((l: any) => (
        <InvestCard key={l.id} onRemove={() => onRemove(l.id)} onEdit={() => onEdit(l.id)}>
          <div style={{ fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase", color: THEME.sage }}>Receivable</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 18, fontWeight: 700, marginTop: 4 }}>{l.borrower}</div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 800, marginTop: 12, color: THEME.sage }}>{fmtINRFull(l.outstanding)}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12, fontSize: 12 }}>
            <Stat k="Principal" v={fmtINR(l.principal)} />
            <Stat k="Rate" v={l.rate ? `${l.rate}%` : "—"} />
            <Stat k="Given on" v={l.date || "—"} />
            <Stat k="Due" v={l.dueDate || "—"} />
          </div>
          {l.note && <div style={{ fontSize: 12, color: THEME.muted, marginTop: 8 }}>"{l.note}"</div>}
        </InvestCard>
      ))}
    </Grid>
  );
}

function CCModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || { issuer: "", network: "Visa", last4: "", limit: "", outstanding: "0", billDate: "", dueDay: "", annualFee: "0", waiverInfo: "", helpline: "", transactions: [], owner: "self" });
  return (
    <Modal title={initial ? "Edit Credit Card" : "Add Credit Card"} onClose={onClose}>
      <Field label="Owner / Profile"><select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>{PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}><Field label="Issuer"><input style={input} value={f.issuer} onChange={(e) => setF({ ...f, issuer: e.target.value })} placeholder="e.g. HDFC Regalia" /></Field><Field label="Network"><select style={input} value={f.network} onChange={(e) => setF({ ...f, network: e.target.value })}><option>Visa</option><option>Mastercard</option><option>Amex</option><option>RuPay</option><option>Diners</option></select></Field></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}><Field label="Last 4 digits"><input style={input} maxLength={4} value={f.last4} onChange={(e) => setF({ ...f, last4: e.target.value })} /></Field><Field label="Credit Limit"><input style={input} type="number" value={f.limit} onChange={(e) => setF({ ...f, limit: e.target.value })} /></Field><Field label="Outstanding"><input style={input} type="number" value={f.outstanding} onChange={(e) => setF({ ...f, outstanding: e.target.value })} /></Field></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Field label="Statement Date (Day of Month)"><input style={input} type="number" min="1" max="31" placeholder="e.g. 20" value={f.billDate} onChange={(e) => setF({ ...f, billDate: e.target.value })} /></Field><Field label="Due Day (Day of Month)"><input style={input} type="number" min="1" max="31" placeholder="e.g. 10" value={f.dueDay} onChange={(e) => setF({ ...f, dueDay: e.target.value })} /></Field></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Field label="Annual Fee"><input style={input} type="number" value={f.annualFee} onChange={(e) => setF({ ...f, annualFee: e.target.value })} /></Field><Field label="Helpline Number"><input style={input} value={f.helpline} onChange={(e) => setF({ ...f, helpline: e.target.value })} placeholder="1800-xxx-xxxx" /></Field></div>
      <Field label="Waiver Details"><textarea style={{ ...input, height: 60, resize: "none" }} value={f.waiverInfo} onChange={(e) => setF({ ...f, waiverInfo: e.target.value })} placeholder="e.g. Spend 1L in a year to waive off annual fee" /></Field>
      <ModalActions onSave={() => f.issuer && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function PrepaidModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || { provider: "", name: "", balance: "", owner: "self" });
  return (
    <Modal title={initial ? "Edit Prepaid Card / Wallet" : "Add Prepaid Card / Wallet"} onClose={onClose}>
      <Field label="Owner / Profile"><select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>{PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <Field label="Provider"><input style={input} value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value })} placeholder="e.g. Paytm, Amazon Pay" /></Field>
      <Field label="Name/Label"><input style={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Balance"><input style={input} type="number" value={f.balance} onChange={(e) => setF({ ...f, balance: e.target.value })} /></Field>
      <ModalActions onSave={() => f.provider && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function InformalLoanView({ direction, items, onAddPerson, onUpdate, onRemove }: any) {
  const isBorrowed = direction === "borrowed";
  const personLabel = isBorrowed ? "Lender" : "Borrower";
  const accentColor = isBorrowed ? THEME.rust : THEME.sage;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addPersonOpen, setAddPersonOpen] = useState(false);
  const [trancheTarget, setTrancheTarget] = useState<any>(null);
  const [paymentTarget, setPaymentTarget] = useState<any>(null);
  const totalBorrowed = items.reduce((s: number, p: any) => s + (p.tranches || []).reduce((a: number, t: any) => a + Number(t.amount || 0), 0), 0);
  const totalPaid = items.reduce((s: number, p: any) => s + (p.payments || []).reduce((a: number, t: any) => a + Number(t.amount || 0), 0), 0);
  const totalOutstanding = totalBorrowed - totalPaid;
  const fmtD = (d: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "—";
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        <Tile icon={isBorrowed ? TrendingDown : TrendingUp} label={isBorrowed ? "Total Borrowed" : "Total Lent"} value={fmtINRFull(totalBorrowed)} />
        <Tile icon={ArrowLeftRight} label={isBorrowed ? "Total Repaid" : "Received Back"} value={fmtINRFull(totalPaid)} subColor={THEME.sage} />
        <Tile icon={IndianRupee} label="Outstanding" value={fmtINRFull(totalOutstanding)} subColor={totalOutstanding > 0 ? accentColor : THEME.sage} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}><button style={btnSolid} onClick={() => setAddPersonOpen(true)}><Plus size={14} /> Add {personLabel}</button></div>
      {items.length === 0 && <EmptyHint text={`No ${isBorrowed ? "informal borrowings" : "personal loans given"} yet`} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {items.map((person: any) => {
          const tranches: any[] = person.tranches || [];
          const payments: any[] = person.payments || [];
          const totalT = tranches.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
          const totalP = payments.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
          const outstanding = totalT - totalP;
          const isExpanded = expandedId === person.id;
          const settled = outstanding <= 0;
          return (
            <div key={person.id} style={{ ...card, padding: 0, overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", cursor: "pointer", borderBottom: isExpanded ? `1px solid ${THEME.line}` : "none" }} onClick={() => setExpandedId(isExpanded ? null : person.id)}>
                <div style={{ color: THEME.muted, flexShrink: 0 }}>{isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}</div>
                <div style={{ flex: 1 }}><div style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ fontWeight: 700, fontSize: 16 }}>{person.person}</span>{settled && <span style={{ fontSize: 10, background: THEME.sage + "22", color: THEME.sage, padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>SETTLED</span>}{person.note && <span style={{ fontSize: 12, color: THEME.muted }}>· {person.note}</span>}</div><div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>{tranches.length} loan{tranches.length !== 1 ? "s" : ""} · {payments.length} payment{payments.length !== 1 ? "s" : ""}</div></div>
                <div style={{ textAlign: "right", flexShrink: 0 }}><div style={{ fontSize: 11, color: THEME.muted, textTransform: "uppercase" }}>Outstanding</div><div style={{ fontSize: 20, fontWeight: 800, color: settled ? THEME.sage : accentColor }}>{settled ? "₹0" : fmtINRFull(outstanding)}</div></div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}><button onClick={(e) => { e.stopPropagation(); onRemove(person.id); }} style={{ ...iconBtn, color: THEME.rust }} title="Delete person"><Trash2 size={13} /></button></div>
              </div>
              {isExpanded && (
                <div>
                  <div style={{ padding: "12px 18px", borderBottom: `1px solid ${THEME.line}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: accentColor }}>{isBorrowed ? "Loans Received" : "Loans Given"}</div><button style={{ ...btnGhost, fontSize: 11, padding: "3px 10px" }} onClick={() => setTrancheTarget(person)}><Plus size={11} /> Add Loan</button></div>
                    {tranches.length === 0 ? <div style={{ fontSize: 12, color: THEME.muted }}>No loans recorded yet</div> : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead><tr style={{ borderBottom: `1px solid ${THEME.line}` }}><th style={{ ...th, paddingLeft: 0, textAlign: "left" }}>Date</th><th style={{ ...th, textAlign: "right" }}>Amount</th><th style={{ ...th, textAlign: "left" }}>Note</th><th style={th}></th></tr></thead>
                        <tbody>{tranches.map((t: any) => (<tr key={t.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}><td style={{ ...td, paddingLeft: 0, color: THEME.muted }}>{fmtD(t.date)}</td><td style={{ ...td, textAlign: "right", fontWeight: 600, color: accentColor }}>{fmtINR(t.amount)}</td><td style={{ ...td, color: THEME.muted }}>{t.note || "—"}</td><td style={td}><button style={iconBtn} onClick={() => { const updated = tranches.filter((x: any) => x.id !== t.id); onUpdate(person.id, { tranches: updated }); }}><Trash2 size={11} /></button></td></tr>))}</tbody>
                        <tfoot><tr><td style={{ ...td, paddingLeft: 0, fontWeight: 700 }}>Total</td><td style={{ ...td, textAlign: "right", fontWeight: 700, color: accentColor }}>{fmtINR(totalT)}</td><td colSpan={2} style={td}></td></tr></tfoot>
                      </table>
                    )}
                  </div>
                  <div style={{ padding: "12px 18px", borderBottom: `1px solid ${THEME.line}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: THEME.sage }}>{isBorrowed ? "Repayments Made" : "Repayments Received"}</div><button style={{ ...btnGhost, fontSize: 11, padding: "3px 10px" }} onClick={() => setPaymentTarget(person)}><Plus size={11} /> Record Payment</button></div>
                    {payments.length === 0 ? <div style={{ fontSize: 12, color: THEME.muted }}>No payments recorded yet</div> : (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                        <thead><tr style={{ borderBottom: `1px solid ${THEME.line}` }}><th style={{ ...th, paddingLeft: 0, textAlign: "left" }}>Date</th><th style={{ ...th, textAlign: "right" }}>Amount</th><th style={{ ...th, textAlign: "left" }}>Note</th><th style={th}></th></tr></thead>
                        <tbody>{payments.map((p: any) => (<tr key={p.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}><td style={{ ...td, paddingLeft: 0, color: THEME.muted }}>{fmtD(p.date)}</td><td style={{ ...td, textAlign: "right", fontWeight: 600, color: THEME.sage }}>{fmtINR(p.amount)}</td><td style={{ ...td, color: THEME.muted }}>{p.note || "—"}</td><td style={td}><button style={iconBtn} onClick={() => { const updated = payments.filter((x: any) => x.id !== p.id); onUpdate(person.id, { payments: updated }); }}><Trash2 size={11} /></button></td></tr>))}</tbody>
                        <tfoot><tr><td style={{ ...td, paddingLeft: 0, fontWeight: 700 }}>Total Paid</td><td style={{ ...td, textAlign: "right", fontWeight: 700, color: THEME.sage }}>{fmtINR(totalP)}</td><td colSpan={2} style={td}></td></tr></tfoot>
                      </table>
                    )}
                  </div>
                  <div style={{ padding: "10px 18px", display: "flex", alignItems: "center", gap: 16, fontSize: 13 }}><span style={{ color: THEME.muted }}>Balance: </span><b style={{ color: settled ? THEME.sage : accentColor, fontSize: 15 }}>{settled ? "Fully Settled ✓" : `${fmtINRFull(outstanding)} pending`}</b>{!settled && totalT > 0 && <div style={{ flex: 1, height: 6, background: THEME.line, borderRadius: 3, overflow: "hidden" }}><div style={{ height: "100%", width: Math.min((totalP / totalT) * 100, 100) + "%", background: accentColor, borderRadius: 3 }} /></div>}{!settled && totalT > 0 && <span style={{ fontSize: 11, color: THEME.muted }}>{((totalP / totalT) * 100).toFixed(0)}% paid</span>}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {addPersonOpen && <Modal title={`Add ${personLabel}`} onClose={() => setAddPersonOpen(false)}><InformalPersonForm personLabel={personLabel} onSave={(v: any) => { onAddPerson(v); setAddPersonOpen(false); }} onClose={() => setAddPersonOpen(false)} /></Modal>}
      {trancheTarget && <Modal title={`Add Loan — ${trancheTarget.person}`} onClose={() => setTrancheTarget(null)}><InformalAmountForm label={isBorrowed ? "Amount Borrowed" : "Amount Lent"} onSave={(entry: any) => { const updated = [...(trancheTarget.tranches || []), { id: `tr-${Date.now()}`, ...entry }]; onUpdate(trancheTarget.id, { tranches: updated }); setTrancheTarget(null); }} onClose={() => setTrancheTarget(null)} /></Modal>}
      {paymentTarget && <Modal title={`Record Payment — ${paymentTarget.person}`} onClose={() => setPaymentTarget(null)}><InformalAmountForm label={isBorrowed ? "Amount Repaid" : "Amount Received"} onSave={(entry: any) => { const updated = [...(paymentTarget.payments || []), { id: `pm-${Date.now()}`, ...entry }]; onUpdate(paymentTarget.id, { payments: updated }); setPaymentTarget(null); }} onClose={() => setPaymentTarget(null)} /></Modal>}
    </div>
  );
}

function InformalPersonForm({ personLabel, onSave, onClose }: any) {
  const [f, setF] = useState({ owner: "self", person: "", note: "", tranches: [], payments: [] });
  return (
    <>
      <Field label="Owner / Profile"><select style={input} value={f.owner} onChange={(e) => setF({ ...f, owner: e.target.value })}>{PROFILES.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <Field label={`${personLabel} Name`}><input style={input} value={f.person} placeholder="e.g. Raj, Mom" onChange={(e) => setF({ ...f, person: e.target.value })} /></Field>
      <Field label="Note (optional)"><input style={input} value={f.note} placeholder="e.g. for house repairs" onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      <ModalActions onSave={() => f.person && onSave({ id: `il-${Date.now()}`, ...f })} onClose={onClose} saveLabel="Add" />
    </>
  );
}

function InformalAmountForm({ label, onSave, onClose }: any) {
  const [f, setF] = useState({ amount: "", date: today(), note: "" });
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Field label={label + " (₹)"}><input style={input} type="number" min="1" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field><Field label="Date"><input style={input} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field></div>
      <Field label="Note (optional)"><input style={input} value={f.note} placeholder="e.g. cash, UPI" onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      <ModalActions onSave={() => Number(f.amount) > 0 && onSave(f)} onClose={onClose} saveLabel="Save" />
    </>
  );
}

function LoanTakenModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || { lender: "", type: "Personal", principal: "", outstanding: "", emi: "", rate: "", monthsRemaining: "", owner: "self" });
  return (
    <Modal title={initial ? "Edit Loan Taken" : "Add Loan Taken"} onClose={onClose}>
      <Field label="Owner / Profile"><select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>{PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <Field label="Lender"><input style={input} value={f.lender} onChange={(e) => setF({ ...f, lender: e.target.value })} /></Field>
      <Field label="Type"><select style={input} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option>Personal</option><option>Home</option><option>Car</option><option>Education</option><option>Gold</option><option>Business</option><option>Other</option></select></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Field label="Original Principal"><input style={input} type="number" value={f.principal} onChange={(e) => setF({ ...f, principal: e.target.value })} /></Field><Field label="Outstanding"><input style={input} type="number" value={f.outstanding} onChange={(e) => setF({ ...f, outstanding: e.target.value })} /></Field><Field label="EMI"><input style={input} type="number" value={f.emi} onChange={(e) => setF({ ...f, emi: e.target.value })} /></Field><Field label="Interest Rate (%)"><input style={input} type="number" step="0.01" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></Field><Field label="Months Remaining"><input style={input} type="number" value={f.monthsRemaining} onChange={(e) => setF({ ...f, monthsRemaining: e.target.value })} /></Field></div>
      <ModalActions onSave={() => f.lender && onSave(f)} onClose={onClose} />
    </Modal>
  );
}

function LoanGivenModal({ onClose, onSave, initial = null }: any) {
  const [f, setF] = useState(initial || { borrower: "", principal: "", outstanding: "", rate: "", date: today(), dueDate: "", note: "", owner: "self" });
  return (
    <Modal title={initial ? "Edit Loan Given" : "Record Loan Given"} onClose={onClose}>
      <Field label="Owner / Profile"><select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>{PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>
      <Field label="Borrower Name"><input style={input} value={f.borrower} onChange={(e) => setF({ ...f, borrower: e.target.value })} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><Field label="Principal"><input style={input} type="number" value={f.principal} onChange={(e) => setF({ ...f, principal: e.target.value })} /></Field><Field label="Outstanding"><input style={input} type="number" value={f.outstanding} onChange={(e) => setF({ ...f, outstanding: e.target.value })} /></Field><Field label="Interest %"><input style={input} type="number" step="0.01" value={f.rate} onChange={(e) => setF({ ...f, rate: e.target.value })} /></Field><Field label="Given On"><input style={input} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field><Field label="Due By"><input style={input} type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} /></Field></div>
      <Field label="Note"><input style={input} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
      <ModalActions onSave={() => f.borrower && f.principal && onSave(f)} onClose={onClose} />
    </Modal>
  );
}
