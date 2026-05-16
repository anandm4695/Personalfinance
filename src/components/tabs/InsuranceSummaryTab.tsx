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

const INSURER_LOGOS: Record<string, string> = {
  lic: "licindia.in",
  hdfc: "hdfclife.com",
  icici: "iciciprulife.com",
  sbi: "sbilife.co.in",
  max: "maxlifeinsurance.com",
  tata: "tataaia.com",
  bajaj: "bajajallianzlife.com",
  kotak: "kotaklife.com",
  birla: "adityabirlasunlifeinsurance.com",
  absli: "adityabirlasunlifeinsurance.com",
  pnb: "pnbmetlife.com",
  metlife: "pnbmetlife.com",
  canara: "canarahsbclife.com",
  hsbc: "canarahsbclife.com",
  aviva: "avivaindia.com",
  reliance: "reliancenipponlife.com",
  exide: "exidelife.in",
};

const InsurerLogo = ({ name, size = 40, isLic = false }: { name: string; size?: number; isLic?: boolean }) => {
  const n = isLic ? "lic" : (name || "").toLowerCase();
  let domain = "";
  for (const [k, d] of Object.entries(INSURER_LOGOS)) {
    if (n.includes(k)) { domain = d; break; }
  }

  if (domain) {
    return (
      <div style={{ width: size, height: size, borderRadius: 10, background: "#fff", border: `1px solid ${THEME.line}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
        <img 
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=128`} 
          alt={name} 
          style={{ width: "70%", height: "70%", objectFit: "contain" }}
          onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.parentElement!.innerHTML = `<span style="font-size: ${size/2.5}px; font-weight: 800; color: ${THEME.muted}">${name.slice(0, 2).toUpperCase()}</span>`; }}
        />
      </div>
    );
  }

  return (
    <div style={{ width: size, height: size, borderRadius: 10, background: "rgba(128,128,128,0.1)", border: `1px solid ${THEME.line}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <span style={{ fontSize: size/2.5, fontWeight: 800, color: THEME.muted }}>{name.slice(0, 2).toUpperCase()}</span>
    </div>
  );
};

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
            buttonLabel="Add Policy"
            onAdd={() => setModal("lic")}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>
            {state.lic.map((l: any) => (
              <Card key={l.id} style={{ padding: "16px 20px", borderLeft: `3px solid ${THEME.rust}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <InsurerLogo name="LIC" isLic />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: THEME.ink, letterSpacing: "-0.01em" }}>{l.planName}</div>
                    <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
                      <span style={{ color: THEME.rust }}>{fmtINRFull(l.sumAssured)} assured</span>
                      <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>
                      <span>#{l.policyNumber || "No No."}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>{fmtINRFull(l.annualPremium)}</div>
                    <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>premium/yr</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeItem("lic", l.id)} style={{ padding: 6, color: THEME.rust }}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </Card>
            ))}
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
            gradient="linear-gradient(135deg,#db2777 0%,#f472b6 100%)"
            dotColor="#db2777"
            title="No Term Plans Tracked"
            description="Add your pure protection term plans to track cover amounts, insurers, and expiry dates."
            pills={["High Cover", "Low Premium", "Policy Duration", "Adequacy Ratio"]}
            buttonLabel="Add Term Plan"
            onAdd={() => setModal("term")}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>
            {state.termPlans.map((t: any) => (
              <Card key={t.id} style={{ padding: "16px 20px", borderLeft: `3px solid ${THEME.rust}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <InsurerLogo name={t.insurer} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: THEME.ink, letterSpacing: "-0.01em" }}>{t.planName || "Term Plan"}</div>
                    <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
                      <span style={{ color: THEME.rust }}>{fmtINRFull(t.coverAmount)} cover</span>
                      <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>
                      <span>{t.insurer}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>{fmtINRFull(t.annualPremium)}</div>
                    <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>premium/yr</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeItem("termPlans", t.id)} style={{ padding: 6, color: THEME.rust }}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      {modal && <AddInsuranceModal sub={modal} onClose={() => setModal(null)} onSave={handleSave} />}
    </div>
  );
}
