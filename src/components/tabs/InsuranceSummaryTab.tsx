// @ts-nocheck
import React, { useState } from "react";
import { Shield, Heart, Wallet, Zap, Plus, Trash2 } from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, uid } from "../../utils/finance";
import { StatCard } from "../ui/StatCard";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";

/* ══════════════════════════════════════════════════════════════════════
   HELPERS & MODALS
   ══════════════════════════════════════════════════════════════════════ */



const AddInsuranceModal = ({ sub, onClose, onSave }: any) => {
  const [lic, setLic] = useState({ planName: "", policyNumber: "", sumAssured: "", annualPremium: "", premiumPaid: "", maturityDate: "" });
  const [term, setTerm] = useState({ insurer: "", planName: "", coverAmount: "", annualPremium: "", expiryDate: "" });

  const inp = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: 8,
    border: `1px solid ${THEME.line}`,
    background: "var(--surface-0)",
    color: THEME.ink,
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
  };

  const handleSave = () => {
    if (sub === "lic") {
      if (!lic.planName || !lic.sumAssured) return;
      onSave("lic", { ...lic, id: uid() });
    } else {
      if (!term.insurer || !term.coverAmount) return;
      onSave("termPlans", { ...term, id: uid() });
    }
  };

  return (
    <Modal title={`Add ${sub === "lic" ? "LIC Policy" : "Term Plan"}`} onClose={onClose}>
      {sub === "lic" ? (
        <>
          <Field label="Plan Name">
            <input style={inp} value={lic.planName} onChange={e => setLic({ ...lic, planName: e.target.value })} placeholder="e.g. LIC Jeevan Anand, Money Back" />
          </Field>
          <Field label="Policy Number">
            <input style={inp} value={lic.policyNumber} onChange={e => setLic({ ...lic, policyNumber: e.target.value })} placeholder="Policy number" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Sum Assured (₹)">
              <input style={inp} type="number" value={lic.sumAssured} onChange={e => setLic({ ...lic, sumAssured: e.target.value })} placeholder="1000000" />
            </Field>
            <Field label="Annual Premium (₹)">
              <input style={inp} type="number" value={lic.annualPremium} onChange={e => setLic({ ...lic, annualPremium: e.target.value })} placeholder="30000" />
            </Field>
          </div>
          <Field label="Total Premium Paid So Far (₹)">
            <input style={inp} type="number" value={lic.premiumPaid} onChange={e => setLic({ ...lic, premiumPaid: e.target.value })} placeholder="90000" />
          </Field>
          <Field label="Maturity Date">
            <input style={inp} type="date" value={lic.maturityDate} onChange={e => setLic({ ...lic, maturityDate: e.target.value })} />
          </Field>
        </>
      ) : (
        <>
          <Field label="Insurer / Company">
            <input style={inp} value={term.insurer} onChange={e => setTerm({ ...term, insurer: e.target.value })} placeholder="e.g. HDFC Ergo, Max Life, ICICI Pru" />
          </Field>
          <Field label="Plan Name">
            <input style={inp} value={term.planName} onChange={e => setTerm({ ...term, planName: e.target.value })} placeholder="e.g. Click 2 Protect, iProtect Smart" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Cover Amount (₹)">
              <input style={inp} type="number" value={term.coverAmount} onChange={e => setTerm({ ...term, coverAmount: e.target.value })} placeholder="10000000" />
            </Field>
            <Field label="Annual Premium (₹)">
              <input style={inp} type="number" value={term.annualPremium} onChange={e => setTerm({ ...term, annualPremium: e.target.value })} placeholder="12000" />
            </Field>
          </div>
          <Field label="Policy Expiry Date">
            <input style={inp} type="date" value={term.expiryDate} onChange={e => setTerm({ ...term, expiryDate: e.target.value })} />
          </Field>
        </>
      )}
      <ModalActions onSave={handleSave} onClose={onClose} saveLabel="Add Policy" />
    </Modal>
  );
};

const LICEmptyState = ({ onAdd }: any) => (
  <Card style={{ padding: "48px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
    <div style={{ width: 56, height: 56, borderRadius: 18, background: "linear-gradient(135deg,#dc2626 0%,#fca5a5 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(220, 38, 38, 0.2)" }}>
      <Shield size={24} color="#fff" />
    </div>
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, letterSpacing: "-0.02em" }}>No LIC Policies Added</div>
      <div style={{ fontSize: 14, color: THEME.muted, maxWidth: 360, lineHeight: 1.5 }}>Add your LIC policies to see sum assured, premiums, and maturity details here.</div>
    </div>
    <Button onClick={() => onAdd("lic")} variant="accent" icon={<Plus size={16} />}>Add LIC Policy</Button>
  </Card>
);

const TermPlanEmptyState = ({ onAdd }: any) => (
  <Card style={{ padding: "48px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
    <div style={{ width: 56, height: 56, borderRadius: 18, background: "linear-gradient(135deg,#e11d48 0%,#fb7185 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(225, 29, 72, 0.2)" }}>
      <Heart size={24} color="#fff" />
    </div>
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, letterSpacing: "-0.02em" }}>No Term Plans Added</div>
      <div style={{ fontSize: 14, color: THEME.muted, maxWidth: 360, lineHeight: 1.5 }}>Add your term insurance plans to track cover adequacy, premiums, and expiry.</div>
    </div>
    <Button onClick={() => onAdd("term")} variant="accent" icon={<Plus size={16} />}>Add Term Plan</Button>
  </Card>
);


const th = { textAlign: "left" as const, padding: "12px 8px", color: THEME.muted, fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.05em" };
const td = { padding: "16px 8px" };

/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════ */

export function InsuranceSummaryTab({ state, addItem, removeItem }: any) {
  const [modal, setModal] = useState<null | "lic" | "term">(null);

  const totalLICAssured = state.lic.reduce((s: number, l: any) => s + Number(l.sumAssured || 0), 0);
  const totalTermCover = state.termPlans.reduce((s: number, t: any) => s + Number(t.coverAmount || 0), 0);
  const licAnnualPremium = state.lic.reduce((s: number, l: any) => s + Number(l.annualPremium || 0), 0);
  const termAnnualPremium = state.termPlans.reduce((s: number, t: any) => s + Number(t.annualPremium || 0), 0);
  const totalAnnualPremium = licAnnualPremium + termAnnualPremium;
  const annualIncome = state.income.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
  
  const coverRatio = annualIncome > 0 ? totalTermCover / annualIncome : 0;
  const adequacyLevel = coverRatio >= 15 ? "excellent" : coverRatio >= 10 ? "adequate" : coverRatio >= 5 ? "low" : "critical";
  const adequacyColor = { excellent: THEME.sage, adequate: THEME.gold, low: THEME.gold, critical: THEME.rust }[adequacyLevel];
  const adequacyLabel = { excellent: "Excellent (≥15×)", adequate: "Adequate (10–15×)", low: "Low (5–10×)", critical: "Critical (<5×)" }[adequacyLevel];

  const handleSave = (key: string, data: any) => {
    addItem(key, data);
    setModal(null);
  };

  return (
    <div>
      <SectionTitle 
        sub="Manage your life insurance and term protection cover in one place"
        rightElement={
          <div style={{ display: "flex", gap: 10 }}>
            <Button onClick={() => setModal("lic")} size="sm" variant="accent" icon={<Plus size={14} />}>Add LIC</Button>
            <Button onClick={() => setModal("term")} size="sm" variant="accent" icon={<Plus size={14} />}>Add Term Plan</Button>
          </div>
        }
      >
        Insurance Portfolio
      </SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard icon={<Shield />} label="Total LIC Sum Assured" value={fmtINRFull(totalLICAssured)} color={THEME.rust} sub="Life Insurance Corp policies" />
        <StatCard icon={<Heart />} label="Total Term Cover" value={fmtINRFull(totalTermCover)} color={THEME.rust} sub="Pure protection cover" />
        <StatCard icon={<Wallet />} label="Total Annual Premium" value={fmtINRFull(totalAnnualPremium)} color={THEME.gold} sub="Combined insurance cost" />
        <StatCard icon={<Zap />} label="Cover Ratio" value={annualIncome > 0 ? coverRatio.toFixed(1) + "×" : "—"} color={adequacyColor} sub={adequacyLabel} />
      </div>

      {/* LIC SECTION */}
      <Card style={{ marginBottom: 24, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>Life Insurance (LIC)</div>
          <Button onClick={() => setModal("lic")} size="sm" variant="secondary" icon={<Plus size={14} />}>Add Policy</Button>
        </div>
        {state.lic.length === 0 ? (
          <LICEmptyState onAdd={setModal} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: `1.5px solid ${THEME.line}` }}>
                  <th style={th}>Policy No</th>
                  <th style={th}>Plan Name</th>
                  <th style={{ ...th, textAlign: "right" }}>Sum Assured</th>
                  <th style={{ ...th, textAlign: "right" }}>Annual Premium</th>
                  <th style={th}>Maturity</th>
                  <th style={{ ...th, width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {state.lic.map((l: any) => (
                  <tr key={l.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}>
                    <td style={td}>****{String(l.policyNumber || "").slice(-4)}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{l.planName}</td>
                    <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(l.sumAssured)}</td>
                    <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(l.annualPremium)}</td>
                    <td style={td}>{l.maturityDate || "—"}</td>
                    <td style={td}>
                      <button onClick={() => removeItem("lic", l.id)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* TERM PLANS SECTION */}
      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em" }}>Term Insurance Plans</div>
          <Button onClick={() => setModal("term")} size="sm" variant="secondary" icon={<Plus size={14} />}>Add Plan</Button>
        </div>
        {state.termPlans.length === 0 ? (
          <TermPlanEmptyState onAdd={setModal} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: `1.5px solid ${THEME.line}` }}>
                  <th style={th}>Insurer</th>
                  <th style={th}>Plan Name</th>
                  <th style={{ ...th, textAlign: "right" }}>Cover Amount</th>
                  <th style={{ ...th, textAlign: "right" }}>Annual Premium</th>
                  <th style={th}>Expiry</th>
                  <th style={{ ...th, width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {state.termPlans.map((t: any) => (
                  <tr key={t.id} style={{ borderBottom: `1px dashed ${THEME.line}` }}>
                    <td style={td}>{t.insurer}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{t.planName}</td>
                    <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(t.coverAmount)}</td>
                    <td style={{ ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(t.annualPremium)}</td>
                    <td style={td}>{t.expiryDate || "—"}</td>
                    <td style={td}>
                      <button onClick={() => removeItem("termPlans", t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modal && <AddInsuranceModal sub={modal} onClose={() => setModal(null)} onSave={handleSave} />}
    </div>
  );
}
