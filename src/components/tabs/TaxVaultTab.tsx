import React, { useState } from "react";
import { Calculator, Shield, Receipt, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, calcTaxNew, calcTaxOld } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Field, Input, Select } from "../ui/Form";

interface TaxVaultTabProps {
  state: any;
  metrics: any;
}

export const TaxVaultTab: React.FC<TaxVaultTabProps> = ({ state, metrics }) => {
  const [activeRegime, setActiveRegime] = useState<"new" | "old">("new");
  
  const income = metrics.monthIncome * 12; // Simplified annual projection
  const deductions = 150000 + 50000; // Standard + 80C projection
  
  const taxNew = calcTaxNew(income);
  const taxOld = calcTaxOld(income, deductions);

  return (
    <div className="tab-content-enter">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Tax Vault</h2>
          <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4 }}>FY {state.profile.fy} · Intelligent tax planning & calculators</div>
        </div>
        <div style={{ display: "flex", gap: 8, background: THEME.line, padding: 4, borderRadius: 12 }}>
           <button 
             onClick={() => setActiveRegime("new")}
             style={{ padding: "6px 16px", borderRadius: 10, border: "none", background: activeRegime === "new" ? THEME.darkInk : "transparent", color: activeRegime === "new" ? THEME.accent : THEME.muted, fontWeight: 700, cursor: "pointer" }}>
             New Regime
           </button>
           <button 
             onClick={() => setActiveRegime("old")}
             style={{ padding: "6px 16px", borderRadius: 10, border: "none", background: activeRegime === "old" ? THEME.darkInk : "transparent", color: activeRegime === "old" ? THEME.accent : THEME.muted, fontWeight: 700, cursor: "pointer" }}>
             Old Regime
           </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
        <Card variant="hero">
          <div className="section-label" style={{ color: "rgba(255,255,255,0.6)" }}>Estimated Annual Tax</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: "#fff", marginBottom: 8 }}>{fmtINRFull(activeRegime === "new" ? taxNew.total : taxOld.total)}</div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
            Based on current {activeRegime} regime slabs for FY {state.profile.fy}
          </div>
          <div style={{ marginTop: 24, display: "flex", gap: 16 }}>
             <div style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,0.1)", borderRadius: 12 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Taxable Income</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{fmtINRFull(income)}</div>
             </div>
             <div style={{ flex: 1, padding: "12px", background: "rgba(255,255,255,0.1)", borderRadius: 12 }}>
                <div style={{ fontSize: 10, textTransform: "uppercase", color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Effective Rate</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{income > 0 ? ((taxNew.total / income) * 100).toFixed(1) : 0}%</div>
             </div>
          </div>
        </Card>

        <Card style={{ padding: 24 }}>
          <div className="section-label">Comparison</div>
          <div style={{ display: "grid", gap: 16 }}>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, borderRadius: 12, background: activeRegime === "new" ? "color-mix(in srgb, var(--t-accent) 8%, transparent)" : "transparent", border: `1.5px solid ${activeRegime === "new" ? THEME.accent : THEME.line}` }}>
                <div>
                   <div style={{ fontWeight: 700 }}>New Regime (FY 25-26)</div>
                   <div style={{ fontSize: 12, color: THEME.muted }}>Zero tax up to ₹12L income</div>
                </div>
                <div style={{ textAlign: "right" }}>
                   <div style={{ fontWeight: 800, fontSize: 18 }}>{fmtINRFull(taxNew.total)}</div>
                   {taxNew.total < taxOld.total && <Badge variant="sage">Saves {fmtINR(taxOld.total - taxNew.total)}</Badge>}
                </div>
             </div>
             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, borderRadius: 12, background: activeRegime === "old" ? "color-mix(in srgb, var(--t-accent) 8%, transparent)" : "transparent", border: `1.5px solid ${activeRegime === "old" ? THEME.accent : THEME.line}` }}>
                <div>
                   <div style={{ fontWeight: 700 }}>Old Regime</div>
                   <div style={{ fontSize: 12, color: THEME.muted }}>With 80C, 80D & HRA deductions</div>
                </div>
                <div style={{ textAlign: "right" }}>
                   <div style={{ fontWeight: 800, fontSize: 18 }}>{fmtINRFull(taxOld.total)}</div>
                   {taxOld.total < taxNew.total && <Badge variant="sage">Saves {fmtINR(taxNew.total - taxOld.total)}</Badge>}
                </div>
             </div>
          </div>
        </Card>
      </div>

      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Detailed Tax Planner</h3>
      
      <Card style={{ padding: 28 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
          <div style={{ gridColumn: "1 / -1", borderBottom: `1px solid ${THEME.line}`, paddingBottom: 12, marginBottom: 8 }}>
            <h4 style={{ margin: 0, fontSize: 14, color: THEME.accent, textTransform: "uppercase", letterSpacing: "0.05em" }}>1. Income Details</h4>
          </div>
          <Field label="Annual Salary (Gross)">
            <Input type="number" defaultValue={income} />
          </Field>
          <Field label="Interest Income">
            <Input type="number" placeholder="0" />
          </Field>
          <Field label="Rental Income (IHP)">
            <Input type="number" placeholder="0" />
          </Field>

          <div style={{ gridColumn: "1 / -1", borderBottom: `1px solid ${THEME.line}`, paddingBottom: 12, marginBottom: 8, marginTop: 12 }}>
            <h4 style={{ margin: 0, fontSize: 14, color: THEME.accent, textTransform: "uppercase", letterSpacing: "0.05em" }}>2. Deductions (Old Regime)</h4>
          </div>
          <Field label="Section 80C (LIC, PPF, ELSS)">
            <Input type="number" placeholder="Max 1,50,000" />
          </Field>
          <Field label="Section 80D (Health Insurance)">
            <Input type="number" placeholder="Max 25,000 / 50,000" />
          </Field>
          <Field label="HRA (House Rent Allowance)">
            <Input type="number" placeholder="0" />
          </Field>
          <Field label="NPS (80CCD 1B)">
            <Input type="number" placeholder="Max 50,000" />
          </Field>
          <Field label="Home Loan Interest (Sec 24)">
            <Input type="number" placeholder="Max 2,00,000" />
          </Field>
          <Field label="Standard Deduction">
            <Input type="number" defaultValue="50000" disabled />
          </Field>
        </div>
        
        <div style={{ marginTop: 32, paddingTop: 24, borderTop: `2px solid ${THEME.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
             <div style={{ fontSize: 13, color: THEME.muted }}>Total Taxable Income</div>
             <div style={{ fontSize: 24, fontWeight: 800 }}>{fmtINRFull(income - deductions)}</div>
          </div>
          <Button variant="accent" size="lg" icon={<Calculator size={18} />}>Recalculate Tax</Button>
        </div>
      </Card>
    </div>
  );
};
