// @ts-nocheck
import React, { useState } from "react";
import { Calculator, Shield, History, Plus, Trash2, Calendar, Target, CheckCircle2 } from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, calcTaxNew, calcTaxOld, today, uid } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Field, Input } from "../ui/Form";
import { SectionTitle } from "../ui/SectionTitle";
import { Modal, ModalActions } from "../ui/Modal";

/* ══════════════════════════════════════════════════════════════════════
   HELPERS & MODALS
   ══════════════════════════════════════════════════════════════════════ */

const AddTaxPaymentModal = ({ onClose, onSave }: any) => {
  const [f, setF] = useState({ date: today(), type: "TDS", amount: "", note: "" });
  const types = ["TDS", "Advance Tax", "Self-Assessment", "Professional Tax"];

  return (
    <Modal title="Record Tax Payment" onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Payment Date">
          <input className="form-input" type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
        </Field>
        <Field label="Type">
          <select className="form-input" value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Amount (₹)">
        <input className="form-input" type="number" placeholder="0" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} />
      </Field>
      <Field label="Note / Reference">
        <input className="form-input" placeholder="e.g. Q2 Advance Tax, Salary TDS" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} />
      </Field>
      <ModalActions onSave={() => f.amount && onSave(f)} onClose={onClose} saveLabel="Record Payment" />
    </Modal>
  );
};

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════ */

interface TaxVaultTabProps {
  state: any;
  metrics: any;
  addItem: any;
  removeItem: any;
  updateItem: any;
}

export const TaxVaultTab: React.FC<TaxVaultTabProps> = ({ state, metrics, addItem, removeItem }) => {
  const [activeRegime, setActiveRegime] = useState<"new" | "old">(state.profile.regime || "new");
  const [showModal, setShowModal] = useState(false);
  
  // 1. Core Income & Basic Tax Calculation
  const annualIncome = (metrics.monthIncome || 0) * 12;
  const standardDeduction = 50000;
  const projections = {
    "80C": 150000,
    "80D": 25000,
    HRA: 0,
    Other: 0
  };
  const totalDeductions = standardDeduction + Object.values(projections).reduce((a, b) => a + b, 0);
  
  const taxNew = calcTaxNew(annualIncome);
  const taxOld = calcTaxOld(annualIncome, totalDeductions);
  const currentTotalTax = activeRegime === "new" ? taxNew.total : taxOld.total;

  // 2. Advance Tax Logic
  const taxPayments = state.taxPayments || [];
  const totalTDS = taxPayments.filter((p: any) => p.type === "TDS").reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const totalAdvancePaid = taxPayments.filter((p: any) => p.type === "Advance Tax").reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const totalPaidSoFar = totalTDS + totalAdvancePaid;
  
  const netLiability = Math.max(0, currentTotalTax - totalTDS);
  const remainingAdvance = Math.max(0, netLiability - totalAdvancePaid);
  
  const isAdvanceTaxApplicable = netLiability > 10000;

  // 3. Installments Data
  const installments = [
    { q: "Q1", due: "15 Jun", pct: 15, amt: netLiability * 0.15 },
    { q: "Q2", due: "15 Sep", pct: 45, amt: netLiability * 0.45 },
    { q: "Q3", due: "15 Dec", pct: 75, amt: netLiability * 0.75 },
    { q: "Q4", due: "15 Mar", pct: 100, amt: netLiability * 1.00 },
  ];

  const handleSavePayment = (data: any) => {
    addItem("taxPayments", { ...data, id: uid() });
    setShowModal(false);
  };

  return (
    <div className="tab-content-enter">
      <SectionTitle 
        sub={`Financial Year ${state.profile.fy} · Advance tax tracking & regime comparison`}
        rightElement={
          <div style={{ display: "flex", gap: 8 }}>
             <Button size="sm" variant={activeRegime === "new" ? "accent" : "ghost"} onClick={() => setActiveRegime("new")}>New Regime</Button>
             <Button size="sm" variant={activeRegime === "old" ? "accent" : "ghost"} onClick={() => setActiveRegime("old")}>Old Regime</Button>
          </div>
        }
      >
        Tax Vault
      </SectionTitle>

      {/* ── SUMMARY DASHBOARD ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20, marginBottom: 32 }}>
        <Card variant="hero" style={{ padding: 32, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", marginBottom: 8 }}>Projected Net Tax Liability</div>
            <div style={{ fontSize: 52, fontWeight: 900, color: "#fff", marginBottom: 4, letterSpacing: "-0.03em" }}>{fmtINRFull(remainingAdvance)}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: 500 }}>
               <Shield size={14} /> Total projected: {fmtINRFull(currentTotalTax)} (after TDS & Paid)
            </div>
          </div>

          <div style={{ marginTop: 32 }}>
             <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 800, textTransform: "uppercase", marginBottom: 10 }}>
                <span>Progress Paid</span>
                <span>{((totalPaidSoFar / currentTotalTax) * 100 || 0).toFixed(0)}%</span>
             </div>
             <div style={{ height: 8, background: "rgba(255,255,255,0.15)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${(totalPaidSoFar / currentTotalTax) * 100}%`, background: "#fff", boxShadow: "0 0 15px rgba(255,255,255,0.3)", borderRadius: 10 }} />
             </div>
             <div style={{ display: "flex", gap: 16, marginTop: 16 }}>
                <div>
                   <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>TDS Deducted</div>
                   <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{fmtINRFull(totalTDS)}</div>
                </div>
                <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
                <div>
                   <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Advance Paid</div>
                   <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{fmtINRFull(totalAdvancePaid)}</div>
                </div>
             </div>
          </div>
        </Card>

        <Card style={{ padding: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.15em", textTransform: "uppercase", color: THEME.muted, marginBottom: 20 }}>Advance Tax Schedule</div>
          <div style={{ display: "grid", gap: 12 }}>
             {installments.map(inst => {
               const isPaid = totalAdvancePaid >= inst.amt;
               const isPartiallyPaid = totalAdvancePaid > 0 && totalAdvancePaid < inst.amt;
               
               return (
                 <div key={inst.q} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 12, background: "rgba(128,128,128,0.03)", border: `1px solid ${THEME.line}` }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: isPaid ? "color-mix(in srgb, var(--t-sage) 12%, transparent)" : "color-mix(in srgb, var(--t-gold) 12%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                       {isPaid ? <CheckCircle2 size={18} color={THEME.sage} /> : <Calendar size={18} color={THEME.gold} />}
                    </div>
                    <div style={{ flex: 1 }}>
                       <div style={{ fontWeight: 800, fontSize: 14 }}>{inst.q} · <span style={{ color: THEME.muted }}>By {inst.due}</span></div>
                       <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Cumulative {inst.pct}% · {fmtINRFull(inst.amt)}</div>
                    </div>
                    {isPaid && <Badge variant="sage" style={{ fontSize: 9 }}>Paid</Badge>}
                    {!isPaid && isPartiallyPaid && <Badge variant="gold" style={{ fontSize: 9 }}>Shortfall</Badge>}
                 </div>
               );
             })}
          </div>
          {!isAdvanceTaxApplicable && (
            <div style={{ marginTop: 16, padding: "10px 12px", borderRadius: 10, background: "color-mix(in srgb, var(--t-sage) 8%, transparent)", border: `1px solid color-mix(in srgb, var(--t-sage) 20%, transparent)`, display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 600, color: THEME.sage }}>
               <Shield size={14} /> Advance Tax not applicable (Liability &lt; ₹10k)
            </div>
          )}
        </Card>
      </div>

      {/* ── TAX PAYMENTS LOG ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
         <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>Payment Log & TDS</h3>
         <Button size="sm" variant="secondary" icon={<Plus size={14} />} onClick={() => setShowModal(true)}>Record Payment</Button>
      </div>

      {taxPayments.length === 0 ? (
        <Card style={{ padding: "40px 0", textAlign: "center", color: THEME.muted, fontSize: 13 }}>
           No tax payments or TDS entries recorded yet. Use 'Record Payment' to track.
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14, marginBottom: 40 }}>
           {taxPayments.map((p: any) => (
             <Card key={p.id} style={{ padding: "16px 20px", borderLeft: `3px solid ${p.type === "TDS" ? THEME.gold : THEME.sage}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                   <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(128,128,128,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <History size={18} color={THEME.muted} />
                   </div>
                   <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                         <span style={{ fontWeight: 800, fontSize: 15, color: THEME.ink }}>{fmtINRFull(p.amount)}</span>
                         <Badge variant="muted" style={{ fontSize: 9 }}>{p.type}</Badge>
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                         {p.date} · {p.note || "No note"}
                      </div>
                   </div>
                   <Button variant="ghost" size="sm" onClick={() => removeItem("taxPayments", p.id)} style={{ padding: 6, color: THEME.rust }}>
                      <Trash2 size={14} />
                   </Button>
                </div>
             </Card>
           ))}
        </div>
      )}

      {/* ── PLANNING SECTION ── */}
      <div style={{ marginBottom: 16 }}>
         <h3 style={{ fontSize: 18, fontWeight: 900, margin: 0, letterSpacing: "-0.02em" }}>Tax Planning & Deductions</h3>
      </div>
      <Card style={{ padding: 32 }}>
         <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 10, borderBottom: `1.5px solid ${THEME.line}`, paddingBottom: 16 }}>
               <Target size={18} color={THEME.accent} />
               <span style={{ fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: THEME.accent }}>Estimated Deductions (Old Regime)</span>
            </div>
            
            <Field label="80C (LIC, ELSS, PPF)">
               <Input type="number" defaultValue={150000} />
            </Field>
            <Field label="80D (Health Insurance)">
               <Input type="number" defaultValue={25000} />
            </Field>
            <Field label="HRA Projection">
               <Input type="number" placeholder="0" />
            </Field>
            <Field label="Home Loan Interest">
               <Input type="number" placeholder="0" />
            </Field>
            <Field label="NPS (80CCD 1B)">
               <Input type="number" placeholder="Max 50,000" />
            </Field>
            <Field label="Standard Deduction">
               <Input type="number" defaultValue="50000" disabled />
            </Field>
         </div>

         <div style={{ marginTop: 40, paddingTop: 32, borderTop: `2px solid ${THEME.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
               <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Potential Savings vs New Regime</div>
               <div style={{ fontSize: 32, fontWeight: 900, color: taxOld.total < taxNew.total ? THEME.sage : THEME.rust }}>
                  {fmtINRFull(Math.abs(taxNew.total - taxOld.total))}
               </div>
               <div style={{ fontSize: 12, fontWeight: 600, color: THEME.muted, marginTop: 4 }}>
                  {taxOld.total < taxNew.total ? "Old regime is currently more beneficial" : "New regime is currently more beneficial"}
               </div>
            </div>
            <Button variant="accent" size="lg" icon={<Calculator size={20} />} style={{ padding: "12px 40px" }}>Generate Tax Report</Button>
         </div>
      </Card>

      {showModal && <AddTaxPaymentModal onClose={() => setShowModal(false)} onSave={handleSavePayment} />}
    </div>
  );
};
