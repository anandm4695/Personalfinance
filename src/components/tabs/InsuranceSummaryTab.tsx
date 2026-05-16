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
import { EmptyState } from "../ui/EmptyState";

/* ══════════════════════════════════════════════════════════════════════
   HELPERS & MODALS
   ══════════════════════════════════════════════════════════════════════ */



const AddInsuranceModal = ({ sub, onClose, onSave }: any) => {
  const [lic, setLic] = useState({ planName: "", policyNumber: "", sumAssured: "", annualPremium: "", premiumPaid: "", maturityDate: "" });
  const [term, setTerm] = useState({ insurer: "", planName: "", coverAmount: "", annualPremium: "", expiryDate: "" });

  const inp = "form-input";

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
            <input className={inp} value={lic.planName} onChange={e => setLic({ ...lic, planName: e.target.value })} placeholder="e.g. LIC Jeevan Anand, Money Back" />
          </Field>
          <Field label="Policy Number">
            <input className={inp} value={lic.policyNumber} onChange={e => setLic({ ...lic, policyNumber: e.target.value })} placeholder="Policy number" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Sum Assured (₹)">
              <input className={inp} type="number" value={lic.sumAssured} onChange={e => setLic({ ...lic, sumAssured: e.target.value })} placeholder="1000000" />
            </Field>
            <Field label="Annual Premium (₹)">
              <input className={inp} type="number" value={lic.annualPremium} onChange={e => setLic({ ...lic, annualPremium: e.target.value })} placeholder="30000" />
            </Field>
          </div>
          <Field label="Total Premium Paid So Far (₹)">
            <input className={inp} type="number" value={lic.premiumPaid} onChange={e => setLic({ ...lic, premiumPaid: e.target.value })} placeholder="90000" />
          </Field>
          <Field label="Maturity Date">
            <input className={inp} type="date" value={lic.maturityDate} onChange={e => setLic({ ...lic, maturityDate: e.target.value })} />
          </Field>
        </>
      ) : (
        <>
          <Field label="Insurer / Company">
            <input className={inp} value={term.insurer} onChange={e => setTerm({ ...term, insurer: e.target.value })} placeholder="e.g. HDFC Ergo, Max Life, ICICI Pru" />
          </Field>
          <Field label="Plan Name">
            <input className={inp} value={term.planName} onChange={e => setTerm({ ...term, planName: e.target.value })} placeholder="e.g. Click 2 Protect, iProtect Smart" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Cover Amount (₹)">
              <input className={inp} type="number" value={term.coverAmount} onChange={e => setTerm({ ...term, coverAmount: e.target.value })} placeholder="10000000" />
            </Field>
            <Field label="Annual Premium (₹)">
              <input className={inp} type="number" value={term.annualPremium} onChange={e => setTerm({ ...term, annualPremium: e.target.value })} placeholder="12000" />
            </Field>
          </div>
          <Field label="Policy Expiry Date">
            <input className={inp} type="date" value={term.expiryDate} onChange={e => setTerm({ ...term, expiryDate: e.target.value })} />
          </Field>
        </>
      )}
      <ModalActions onSave={handleSave} onClose={onClose} saveLabel="Add Policy" />
    </Modal>
  );
};



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
  const adequacyLabel = { excellent: "Excellent Protection (≥15×)", adequate: "Adequate Protection (10–15×)", low: "Low Coverage (5–10×)", critical: "Critical Underinsurance (<5×)" }[adequacyLevel];

  const handleSave = (key: string, data: any) => {
    addItem(key, data);
    setModal(null);
  };

  return (
    <div className="tab-content-enter">
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
        <StatCard icon={<Zap />} label="Cover Adequacy" value={annualIncome > 0 ? coverRatio.toFixed(1) + "×" : "—"} color={adequacyColor} sub={adequacyLabel} />
      </div>

      {/* LIC SECTION */}
      <Card style={{ marginBottom: 24, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em", color: THEME.ink }}>Life Insurance (LIC)</div>
          <Button onClick={() => setModal("lic")} size="sm" variant="secondary" icon={<Plus size={14} />}>Add Policy</Button>
        </div>
        {state.lic.length === 0 ? (
          <EmptyState
            icon={Shield}
            gradient="linear-gradient(135deg,#b45309 0%,#f59e0b 100%)"
            dotColor="#f59e0b"
            title="No LIC Policies Added Yet"
            description="Track all your LIC policies — plan name, sum assured, annual premium, maturity date, and total premium paid."
            pills={["Sum Assured", "Annual Premium", "Maturity Date", "Premium Paid"]}
            buttonLabel="Add LIC Policy"
            onAdd={() => setModal("lic")}
          />
        ) : (
          <div style={{ overflowX: "auto", margin: "0 -24px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(128,128,128,0.02)" }}>
                  <th style={{ ...th, paddingLeft: 24 }}>Policy No</th>
                  <th style={th}>Plan Name</th>
                  <th style={{ ...th, textAlign: "right" }}>Sum Assured</th>
                  <th style={{ ...th, textAlign: "right" }}>Annual Premium</th>
                  <th style={th}>Maturity</th>
                  <th style={{ ...th, width: 60, paddingRight: 24 }}></th>
                </tr>
              </thead>
              <tbody>
                {state.lic.map((l: any) => (
                  <tr key={l.id} className="row-hover" style={{ borderBottom: `1px solid ${THEME.line}44` }}>
                    <td style={{ ...td, paddingLeft: 24, fontSize: 13, color: THEME.muted }}>****{String(l.policyNumber || "").slice(-4)}</td>
                    <td style={{ ...td, fontWeight: 700, fontSize: 14 }}>{l.planName}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 800, color: THEME.ink, fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(l.sumAssured)}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700, color: THEME.gold, fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(l.annualPremium)}</td>
                    <td style={{ ...td, fontSize: 13, color: THEME.muted, fontWeight: 600 }}>{l.maturityDate || "—"}</td>
                    <td style={{ ...td, textAlign: "right", paddingRight: 24 }}>
                      <Button variant="ghost" size="sm" onClick={() => removeItem("lic", l.id)} style={{ padding: 6, color: THEME.rust }}>
                        <Trash2 size={14} />
                      </Button>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em", color: THEME.ink }}>Term Insurance Plans</div>
          <Button onClick={() => setModal("term")} size="sm" variant="secondary" icon={<Plus size={14} />}>Add Plan</Button>
        </div>
        {state.termPlans.length === 0 ? (
          <EmptyState
            icon={Heart}
            gradient="linear-gradient(135deg,#dc2626 0%,#f87171 100%)"
            dotColor="#dc2626"
            title="No Term Plans Added Yet"
            description="Track your pure protection term plans — insurer, cover amount, annual premium, and policy expiry date."
            pills={["Cover Amount", "Annual Premium", "Policy Expiry", "Insurer Details"]}
            buttonLabel="Add Term Plan"
            onAdd={() => setModal("term")}
          />
        ) : (
          <div style={{ overflowX: "auto", margin: "0 -24px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "rgba(128,128,128,0.02)" }}>
                  <th style={{ ...th, paddingLeft: 24 }}>Insurer</th>
                  <th style={th}>Plan Name</th>
                  <th style={{ ...th, textAlign: "right" }}>Cover Amount</th>
                  <th style={{ ...th, textAlign: "right" }}>Annual Premium</th>
                  <th style={th}>Expiry</th>
                  <th style={{ ...th, width: 60, paddingRight: 24 }}></th>
                </tr>
              </thead>
              <tbody>
                {state.termPlans.map((t: any) => (
                  <tr key={t.id} className="row-hover" style={{ borderBottom: `1px solid ${THEME.line}44` }}>
                    <td style={{ ...td, paddingLeft: 24, fontSize: 13, color: THEME.muted, fontWeight: 600 }}>{t.insurer}</td>
                    <td style={{ ...td, fontWeight: 700, fontSize: 14 }}>{t.planName}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 800, color: THEME.ink, fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(t.coverAmount)}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700, color: THEME.gold, fontVariantNumeric: "tabular-nums" }}>{fmtINRFull(t.annualPremium)}</td>
                    <td style={{ ...td, fontSize: 13, color: THEME.muted, fontWeight: 600 }}>{t.expiryDate || "—"}</td>
                    <td style={{ ...td, textAlign: "right", paddingRight: 24 }}>
                      <Button variant="ghost" size="sm" onClick={() => removeItem("termPlans", t.id)} style={{ padding: 6, color: THEME.rust }}>
                        <Trash2 size={14} />
                      </Button>
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
