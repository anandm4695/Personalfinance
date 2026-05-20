// @ts-nocheck
import React, { useState } from "react";
import { Shield, Heart, Wallet, Zap, Plus, Trash2, Pencil, Sparkles } from "lucide-react";
import { THEME, PROFILES } from "../../utils/constants";
import { fmtINRFull, uid } from "../../utils/finance";
import { StatCard } from "../ui/StatCard";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { Badge } from "../ui/Badge";

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

const AddInsuranceModal = ({ sub, policy, onClose, onSave }: any) => {
  const [lic, setLic] = useState(() => {
    if (policy) {
      return {
        id: policy.id,
        owner: policy.owner || "self",
        planName: policy.planName || "",
        policyNumber: policy.policyNumber || "",
        sumAssured: policy.sumAssured || "",
        annualPremium: policy.annualPremium || "",
        premiumPaid: policy.premiumPaid || "",
        commencementDate: policy.commencementDate || "",
        maturityDate: policy.maturityDate || "",
        policyTerm: policy.policyTerm || "",
        transactions: policy.transactions || []
      };
    }
    return { owner: "self", planName: "", policyNumber: "", sumAssured: "", annualPremium: "", premiumPaid: "", commencementDate: "", maturityDate: "", policyTerm: "", transactions: [] };
  });

  const handleFieldChange = (field: string, val: any) => {
    setLic(prev => {
      let nextLic = { ...prev, [field]: val };
      if ((field === "commencementDate" || field === "policyTerm") && nextLic.commencementDate && nextLic.policyTerm) {
        const commDate = new Date(nextLic.commencementDate);
        const termYears = parseInt(nextLic.policyTerm, 10);
        if (!isNaN(commDate.getTime()) && !isNaN(termYears) && termYears > 0) {
          const matDate = new Date(commDate);
          matDate.setFullYear(matDate.getFullYear() + termYears);
          const yStr = matDate.getFullYear();
          const mStr = String(matDate.getMonth() + 1).padStart(2, "0");
          const dStr = String(matDate.getDate()).padStart(2, "0");
          nextLic.maturityDate = `${yStr}-${mStr}-${dStr}`;
        }
      }
      return nextLic;
    });
  };

  const handleTermFieldChange = (field: string, val: any) => {
    setTerm(prev => {
      let nextTerm = { ...prev, [field]: val };
      if ((field === "startDate" || field === "term") && nextTerm.startDate && nextTerm.term) {
        const commDate = new Date(nextTerm.startDate);
        const termYears = parseInt(nextTerm.term, 10);
        if (!isNaN(commDate.getTime()) && !isNaN(termYears) && termYears > 0) {
          const expDate = new Date(commDate);
          expDate.setFullYear(expDate.getFullYear() + termYears);
          const yStr = expDate.getFullYear();
          const mStr = String(expDate.getMonth() + 1).padStart(2, "0");
          const dStr = String(expDate.getDate()).padStart(2, "0");
          nextTerm.expiryDate = `${yStr}-${mStr}-${dStr}`;
        }
      }
      return nextTerm;
    });
  };

  const handleInvestFieldChange = (field: string, val: any) => {
    setInvest(prev => {
      let nextInvest = { ...prev, [field]: val };
      if ((field === "commencementDate" || field === "policyTerm") && nextInvest.commencementDate && nextInvest.policyTerm) {
        const commDate = new Date(nextInvest.commencementDate);
        const termYears = parseInt(nextInvest.policyTerm, 10);
        if (!isNaN(commDate.getTime()) && !isNaN(termYears) && termYears > 0) {
          const matDate = new Date(commDate);
          matDate.setFullYear(matDate.getFullYear() + termYears);
          const yStr = matDate.getFullYear();
          const mStr = String(matDate.getMonth() + 1).padStart(2, "0");
          const dStr = String(matDate.getDate()).padStart(2, "0");
          nextInvest.maturityDate = `${yStr}-${mStr}-${dStr}`;
        }
      }
      return nextInvest;
    });
  };

  const [term, setTerm] = useState(() => {
    if (policy) {
      return {
        id: policy.id,
        owner: policy.owner || "self",
        insurer: policy.insurer || "",
        planName: policy.planName || "",
        coverAmount: policy.coverAmount || "",
        annualPremium: policy.annualPremium || "",
        expiryDate: policy.expiryDate || "",
        startDate: policy.startDate || "",
        term: policy.term || "",
        premiumPayingTerm: policy.premiumPayingTerm || "",
        transactions: policy.transactions || []
      };
    }
    return { owner: "self", insurer: "", planName: "", coverAmount: "", annualPremium: "", expiryDate: "", startDate: "", term: "", premiumPayingTerm: "", transactions: [] };
  });

  const [invest, setInvest] = useState(() => {
    if (policy) {
      return {
        id: policy.id,
        owner: policy.owner || "self",
        insurer: policy.insurer || "",
        planName: policy.planName || "",
        policyNumber: policy.policyNumber || "",
        sumAssured: policy.sumAssured || "",
        annualPremium: policy.annualPremium || "",
        premiumPaid: policy.premiumPaid || "",
        policyTerm: policy.policyTerm || "",
        premiumPayingTerm: policy.premiumPayingTerm || "",
        commencementDate: policy.commencementDate || "",
        maturityDate: policy.maturityDate || "",
        expectedMaturityAmount: policy.expectedMaturityAmount || "",
        transactions: policy.transactions || []
      };
    }
    return { owner: "self", insurer: "", planName: "", policyNumber: "", sumAssured: "", annualPremium: "", premiumPaid: "", policyTerm: "", premiumPayingTerm: "", commencementDate: "", maturityDate: "", expectedMaturityAmount: "", transactions: [] };
  });

  const [newTxDate, setNewTxDate] = useState("");
  const [newTxAmount, setNewTxAmount] = useState("");

  const inp = "form-input";

  const handleAddTransaction = () => {
    if (!newTxDate || !newTxAmount) return;
    const newTx = {
      id: uid(),
      date: newTxDate,
      amount: Number(newTxAmount)
    };
    if (sub === "lic") {
      const updatedTxns = [...(lic.transactions || []), newTx].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setLic({ ...lic, transactions: updatedTxns });
    } else if (sub === "invest") {
      const updatedTxns = [...(invest.transactions || []), newTx].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setInvest({ ...invest, transactions: updatedTxns });
    } else {
      const updatedTxns = [...(term.transactions || []), newTx].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setTerm({ ...term, transactions: updatedTxns });
    }
    setNewTxDate("");
    setNewTxAmount("");
  };

  const handleRemoveTransaction = (txId: string) => {
    if (sub === "lic") {
      const updatedTxns = (lic.transactions || []).filter((t: any) => t.id !== txId);
      setLic({ ...lic, transactions: updatedTxns });
    } else if (sub === "invest") {
      const updatedTxns = (invest.transactions || []).filter((t: any) => t.id !== txId);
      setInvest({ ...invest, transactions: updatedTxns });
    } else {
      const updatedTxns = (term.transactions || []).filter((t: any) => t.id !== txId);
      setTerm({ ...term, transactions: updatedTxns });
    }
  };

  const handleAutoGenerateTransactions = () => {
    if (!lic.commencementDate || !lic.annualPremium) {
      alert("Please select a Commencement Date and enter an Annual Premium first.");
      return;
    }
    const commDate = new Date(lic.commencementDate);
    const premium = Number(lic.annualPremium);
    const todayDate = new Date();
    const generated: any[] = [];
    
    let current = new Date(commDate);
    while (current <= todayDate) {
      const yearStr = current.getFullYear();
      const monthStr = String(current.getMonth() + 1).padStart(2, "0");
      const dayStr = String(current.getDate()).padStart(2, "0");
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
      
      generated.push({
        id: uid(),
        date: dateStr,
        amount: premium
      });
      
      current.setFullYear(current.getFullYear() + 1);
    }
    
    setLic({ ...lic, transactions: generated });
  };

  const handleTermAutoGenerateTransactions = () => {
    if (!term.startDate || !term.annualPremium) {
      alert("Please select a Commencement Date and enter an Annual Premium first.");
      return;
    }
    const commDate = new Date(term.startDate);
    const premium = Number(term.annualPremium);
    const payTerm = term.premiumPayingTerm ? parseInt(term.premiumPayingTerm, 10) : null;
    const todayDate = new Date();
    const generated: any[] = [];
    
    let current = new Date(commDate);
    let count = 0;
    while (current <= todayDate) {
      if (payTerm !== null && !isNaN(payTerm) && count >= payTerm) {
        break;
      }
      const yearStr = current.getFullYear();
      const monthStr = String(current.getMonth() + 1).padStart(2, "0");
      const dayStr = String(current.getDate()).padStart(2, "0");
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
      
      generated.push({
        id: uid(),
        date: dateStr,
        amount: premium
      });
      
      current.setFullYear(current.getFullYear() + 1);
      count++;
    }
    
    setTerm({ ...term, transactions: generated });
  };

  const handleInvestAutoGenerateTransactions = () => {
    if (!invest.commencementDate || !invest.annualPremium) {
      alert("Please select a Commencement Date and enter an Annual Premium first.");
      return;
    }
    const commDate = new Date(invest.commencementDate);
    const premium = Number(invest.annualPremium);
    const payTerm = invest.premiumPayingTerm ? parseInt(invest.premiumPayingTerm, 10) : null;
    const todayDate = new Date();
    const generated: any[] = [];
    
    let current = new Date(commDate);
    let count = 0;
    while (current <= todayDate) {
      if (payTerm !== null && !isNaN(payTerm) && count >= payTerm) {
        break;
      }
      const yearStr = current.getFullYear();
      const monthStr = String(current.getMonth() + 1).padStart(2, "0");
      const dayStr = String(current.getDate()).padStart(2, "0");
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
      
      generated.push({
        id: uid(),
        date: dateStr,
        amount: premium
      });
      
      current.setFullYear(current.getFullYear() + 1);
      count++;
    }
    
    setInvest({ ...invest, transactions: generated });
  };

  const handleSave = () => {
    if (sub === "lic") {
      if (!lic.planName || !lic.sumAssured) return;
      const calculatedPremiumPaid = (lic.transactions || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      onSave("lic", { ...lic, premiumPaid: calculatedPremiumPaid, id: lic.id || uid() }, !!policy);
    } else if (sub === "invest") {
      if (!invest.insurer || !invest.planName || !invest.expectedMaturityAmount) return;
      const calculatedPremiumPaid = (invest.transactions || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      onSave("investmentPlans", { ...invest, premiumPaid: calculatedPremiumPaid, id: invest.id || uid() }, !!policy);
    } else {
      if (!term.insurer || !term.coverAmount) return;
      const calculatedPremiumPaid = (term.transactions || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
      onSave("termPlans", { ...term, premiumPaid: calculatedPremiumPaid, id: term.id || uid() }, !!policy);
    }
  };

  const isEdit = !!policy;

  return (
    <Modal title={`${isEdit ? "Edit" : "Add"} ${sub === "lic" ? "LIC Policy" : sub === "invest" ? "Investment Plan" : "Term Plan"}`} onClose={onClose}>
      {sub === "lic" ? (
        <>
          <Field label="Owner / Profile">
            <select className={inp} value={lic.owner || "self"} onChange={e => handleFieldChange("owner", e.target.value)}>
              {PROFILES.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Plan Name">
            <input className={inp} value={lic.planName} onChange={e => handleFieldChange("planName", e.target.value)} placeholder="e.g. LIC Jeevan Anand, Money Back" />
          </Field>
          <Field label="Policy Number">
            <input className={inp} value={lic.policyNumber} onChange={e => handleFieldChange("policyNumber", e.target.value)} placeholder="Policy number" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Sum Assured (₹)">
              <input className={inp} type="number" value={lic.sumAssured} onChange={e => handleFieldChange("sumAssured", e.target.value)} placeholder="1000000" />
            </Field>
            <Field label="Annual Premium (₹)">
              <input className={inp} type="number" value={lic.annualPremium} onChange={e => handleFieldChange("annualPremium", e.target.value)} placeholder="30000" />
            </Field>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Policy Term (Years)">
              <input className={inp} type="number" placeholder="20" value={lic.policyTerm} onChange={e => handleFieldChange("policyTerm", e.target.value)} />
            </Field>
            <Field label="Commencement Date">
              <input className={inp} type="date" value={lic.commencementDate} onChange={e => handleFieldChange("commencementDate", e.target.value)} />
            </Field>
            <Field label="Maturity Date">
              <input className={inp} type="date" value={lic.maturityDate} onChange={e => handleFieldChange("maturityDate", e.target.value)} />
            </Field>
          </div>

          {/* Premium Payments Ledger */}
          <div style={{ marginTop: 18, borderTop: `1px solid ${THEME.line}`, paddingTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>Premium Payments Ledger</div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleAutoGenerateTransactions}
                style={{ fontSize: 11, padding: "4px 8px", color: THEME.accent }}
              >
                <Sparkles size={12} style={{ marginRight: 4, display: "inline-block", verticalAlign: "middle" }} /> Auto-Generate
              </Button>
            </div>

            {/* List of Payments */}
            <div style={{ maxHeight: 150, overflowY: "auto", border: `1px solid ${THEME.line}`, borderRadius: 8, padding: "8px 12px", background: "rgba(128,128,128,0.02)", marginBottom: 12 }}>
              {(lic.transactions || []).length === 0 ? (
                <div style={{ textAlign: "center", fontSize: 11, color: THEME.muted, padding: "16px 0" }}>No transaction history entered. Use the auto-generator or add below.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {(lic.transactions || []).map((t: any) => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, paddingBottom: 6, borderBottom: `1px solid ${THEME.line}40` }}>
                      <span style={{ fontWeight: 600, color: THEME.ink }}>{t.date}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 800, color: THEME.sage }}>{fmtINRFull(t.amount)}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRemoveTransaction(t.id)} 
                          style={{ padding: 2, color: THEME.rust }}
                        >
                          <Trash2 size={11} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Payment Entry Form */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "rgba(128,128,128,0.04)", padding: 10, borderRadius: 8 }}>
              <div style={{ flex: 1.2 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, display: "block", marginBottom: 4 }}>Payment Date</label>
                <input className={inp} type="date" value={newTxDate} onChange={e => setNewTxDate(e.target.value)} style={{ padding: "6px 8px", fontSize: 12 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, display: "block", marginBottom: 4 }}>Amount (₹)</label>
                <input className={inp} type="number" placeholder="30000" value={newTxAmount} onChange={e => setNewTxAmount(e.target.value)} style={{ padding: "6px 8px", fontSize: 12 }} />
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleAddTransaction}
                style={{ padding: "6px 12px", height: 32, fontSize: 12 }}
              >
                Add Row
              </Button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: THEME.muted, marginTop: 10, flexWrap: "wrap", gap: 10 }}>
              <span>
                Expected Total: <span style={{ color: THEME.ink, fontWeight: 800 }}>{lic.annualPremium && lic.policyTerm ? fmtINRFull(Number(lic.annualPremium) * parseInt(lic.policyTerm, 10)) : "—"}</span>
              </span>
              <span>
                Calculated Paid: <span style={{ color: THEME.sage, fontWeight: 800 }}>{fmtINRFull((lic.transactions || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0))}</span>
              </span>
              <span>
                Balance to Pay: <span style={{ color: (lic.annualPremium && lic.policyTerm && (Number(lic.annualPremium) * parseInt(lic.policyTerm, 10) - (lic.transactions || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)) <= 0) ? THEME.sage : THEME.gold, fontWeight: 800 }}>
                  {lic.annualPremium && lic.policyTerm ? (
                    (() => {
                      const bal = (Number(lic.annualPremium) * parseInt(lic.policyTerm, 10)) - (lic.transactions || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
                      return bal <= 0 ? "Fully Paid" : fmtINRFull(bal);
                    })()
                  ) : "—"}
                </span>
              </span>
            </div>
          </div>
        </>
      ) : sub === "invest" ? (
        <>
          <Field label="Owner / Profile">
            <select className={inp} value={invest.owner || "self"} onChange={e => handleInvestFieldChange("owner", e.target.value)}>
              {PROFILES.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Insurer / Company">
              <input className={inp} value={invest.insurer} onChange={e => handleInvestFieldChange("insurer", e.target.value)} placeholder="e.g. HDFC Life, ICICI Pru, SBI Life" />
            </Field>
            <Field label="Plan Name">
              <input className={inp} value={invest.planName} onChange={e => handleInvestFieldChange("planName", e.target.value)} placeholder="e.g. Guaranteed Income Plan, Sanchay Plus" />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Policy Number">
              <input className={inp} value={invest.policyNumber} onChange={e => handleInvestFieldChange("policyNumber", e.target.value)} placeholder="Policy number" />
            </Field>
            <Field label="Sum Assured (₹) (Optional)">
              <input className={inp} type="number" value={invest.sumAssured} onChange={e => handleInvestFieldChange("sumAssured", e.target.value)} placeholder="500000" />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Annual Premium (₹)">
              <input className={inp} type="number" value={invest.annualPremium} onChange={e => handleInvestFieldChange("annualPremium", e.target.value)} placeholder="50000" />
            </Field>
            <Field label="Expected Maturity Amount (₹)">
              <input className={inp} type="number" value={invest.expectedMaturityAmount} onChange={e => handleInvestFieldChange("expectedMaturityAmount", e.target.value)} placeholder="1200000" />
            </Field>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
            <Field label="Policy Term (Yrs)">
              <input className={inp} type="number" placeholder="20" value={invest.policyTerm} onChange={e => handleInvestFieldChange("policyTerm", e.target.value)} />
            </Field>
            <Field label="Paying Term (Yrs)">
              <input className={inp} type="number" placeholder="10" value={invest.premiumPayingTerm} onChange={e => handleInvestFieldChange("premiumPayingTerm", e.target.value)} />
            </Field>
            <Field label="Commencement">
              <input className={inp} type="date" value={invest.commencementDate} onChange={e => handleInvestFieldChange("commencementDate", e.target.value)} />
            </Field>
            <Field label="Maturity Date">
              <input className={inp} type="date" value={invest.maturityDate} onChange={e => handleInvestFieldChange("maturityDate", e.target.value)} />
            </Field>
          </div>

          {/* Premium Payments Ledger */}
          <div style={{ marginTop: 18, borderTop: `1px solid ${THEME.line}`, paddingTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>Premium Payments Ledger</div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleInvestAutoGenerateTransactions}
                style={{ fontSize: 11, padding: "4px 8px", color: THEME.accent }}
              >
                <Sparkles size={12} style={{ marginRight: 4, display: "inline-block", verticalAlign: "middle" }} /> Auto-Generate
              </Button>
            </div>

            {/* List of Payments */}
            <div style={{ maxHeight: 150, overflowY: "auto", border: `1px solid ${THEME.line}`, borderRadius: 8, padding: "8px 12px", background: "rgba(128,128,128,0.02)", marginBottom: 12 }}>
              {(invest.transactions || []).length === 0 ? (
                <div style={{ textAlign: "center", fontSize: 11, color: THEME.muted, padding: "16px 0" }}>No transaction history entered. Use the auto-generator or add below.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {(invest.transactions || []).map((t: any) => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, paddingBottom: 6, borderBottom: `1px solid ${THEME.line}40` }}>
                      <span style={{ fontWeight: 600, color: THEME.ink }}>{t.date}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 800, color: THEME.sage }}>{fmtINRFull(t.amount)}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRemoveTransaction(t.id)} 
                          style={{ padding: 2, color: THEME.rust }}
                        >
                          <Trash2 size={11} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Payment Entry Form */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "rgba(128,128,128,0.04)", padding: 10, borderRadius: 8 }}>
              <div style={{ flex: 1.2 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, display: "block", marginBottom: 4 }}>Payment Date</label>
                <input className={inp} type="date" value={newTxDate} onChange={e => setNewTxDate(e.target.value)} style={{ padding: "6px 8px", fontSize: 12 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, display: "block", marginBottom: 4 }}>Amount (₹)</label>
                <input className={inp} type="number" placeholder="50000" value={newTxAmount} onChange={e => setNewTxAmount(e.target.value)} style={{ padding: "6px 8px", fontSize: 12 }} />
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleAddTransaction}
                style={{ padding: "6px 12px", height: 32, fontSize: 12 }}
              >
                Add Row
              </Button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: THEME.muted, marginTop: 10, flexWrap: "wrap", gap: 10 }}>
              <span>
                Expected Total: <span style={{ color: THEME.ink, fontWeight: 800 }}>{invest.annualPremium && (invest.premiumPayingTerm || invest.policyTerm) ? fmtINRFull(Number(invest.annualPremium) * parseInt(invest.premiumPayingTerm || invest.policyTerm, 10)) : "—"}</span>
              </span>
              <span>
                Calculated Paid: <span style={{ color: THEME.sage, fontWeight: 800 }}>{fmtINRFull((invest.transactions || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0))}</span>
              </span>
              <span>
                Balance to Pay: <span style={{ color: (invest.annualPremium && (invest.premiumPayingTerm || invest.policyTerm) && (Number(invest.annualPremium) * parseInt(invest.premiumPayingTerm || invest.policyTerm, 10) - (invest.transactions || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)) <= 0) ? THEME.sage : THEME.gold, fontWeight: 800 }}>
                  {invest.annualPremium && (invest.premiumPayingTerm || invest.policyTerm) ? (
                    (() => {
                      const bal = (Number(invest.annualPremium) * parseInt(invest.premiumPayingTerm || invest.policyTerm, 10)) - (invest.transactions || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
                      return bal <= 0 ? "Fully Paid" : fmtINRFull(bal);
                    })()
                  ) : "—"}
                </span>
              </span>
            </div>
          </div>
        </>
      ) : (
        <>
          <Field label="Owner / Profile">
            <select className={inp} value={term.owner || "self"} onChange={e => handleTermFieldChange("owner", e.target.value)}>
              {PROFILES.map((p: any) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Insurer / Company">
            <input className={inp} value={term.insurer} onChange={e => handleTermFieldChange("insurer", e.target.value)} placeholder="e.g. HDFC Ergo, Max Life, ICICI Pru" />
          </Field>
          <Field label="Plan Name">
            <input className={inp} value={term.planName} onChange={e => handleTermFieldChange("planName", e.target.value)} placeholder="e.g. Click 2 Protect, iProtect Smart" />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Cover Amount (₹)">
              <input className={inp} type="number" value={term.coverAmount} onChange={e => handleTermFieldChange("coverAmount", e.target.value)} placeholder="10000000" />
            </Field>
            <Field label="Annual Premium (₹)">
              <input className={inp} type="number" value={term.annualPremium} onChange={e => handleTermFieldChange("annualPremium", e.target.value)} placeholder="12000" />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Plan Cover (Years)">
              <input className={inp} type="number" placeholder="20" value={term.term} onChange={e => handleTermFieldChange("term", e.target.value)} />
            </Field>
            <Field label="Payable (Years)">
              <input className={inp} type="number" placeholder="20" value={term.premiumPayingTerm} onChange={e => handleTermFieldChange("premiumPayingTerm", e.target.value)} />
            </Field>
            <Field label="Commencement Date">
              <input className={inp} type="date" value={term.startDate} onChange={e => handleTermFieldChange("startDate", e.target.value)} />
            </Field>
          </div>
          <Field label="Policy Expiry Date">
            <input className={inp} type="date" value={term.expiryDate} onChange={e => handleTermFieldChange("expiryDate", e.target.value)} />
          </Field>

          {/* Premium Payments Ledger */}
          <div style={{ marginTop: 18, borderTop: `1px solid ${THEME.line}`, paddingTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>Premium Payments Ledger</div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleTermAutoGenerateTransactions}
                style={{ fontSize: 11, padding: "4px 8px", color: THEME.accent }}
              >
                <Sparkles size={12} style={{ marginRight: 4, display: "inline-block", verticalAlign: "middle" }} /> Auto-Generate
              </Button>
            </div>

            {/* List of Payments */}
            <div style={{ maxHeight: 150, overflowY: "auto", border: `1px solid ${THEME.line}`, borderRadius: 8, padding: "8px 12px", background: "rgba(128,128,128,0.02)", marginBottom: 12 }}>
              {(term.transactions || []).length === 0 ? (
                <div style={{ textAlign: "center", fontSize: 11, color: THEME.muted, padding: "16px 0" }}>No transaction history entered. Use the auto-generator or add below.</div>
              ) : (
                <div style={{ display: "grid", gap: 8 }}>
                  {(term.transactions || []).map((t: any) => (
                    <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, paddingBottom: 6, borderBottom: `1px solid ${THEME.line}40` }}>
                      <span style={{ fontWeight: 600, color: THEME.ink }}>{t.date}</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontWeight: 800, color: THEME.sage }}>{fmtINRFull(t.amount)}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRemoveTransaction(t.id)} 
                          style={{ padding: 2, color: THEME.rust }}
                        >
                          <Trash2 size={11} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Payment Entry Form */}
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end", background: "rgba(128,128,128,0.04)", padding: 10, borderRadius: 8 }}>
              <div style={{ flex: 1.2 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, display: "block", marginBottom: 4 }}>Payment Date</label>
                <input className={inp} type="date" value={newTxDate} onChange={e => setNewTxDate(e.target.value)} style={{ padding: "6px 8px", fontSize: 12 }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, display: "block", marginBottom: 4 }}>Amount (₹)</label>
                <input className={inp} type="number" placeholder="12000" value={newTxAmount} onChange={e => setNewTxAmount(e.target.value)} style={{ padding: "6px 8px", fontSize: 12 }} />
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={handleAddTransaction}
                style={{ padding: "6px 12px", height: 32, fontSize: 12 }}
              >
                Add Row
              </Button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: THEME.muted, marginTop: 10, flexWrap: "wrap", gap: 10 }}>
              <span>
                Expected Total: <span style={{ color: THEME.ink, fontWeight: 800 }}>{term.annualPremium && (term.premiumPayingTerm || term.term) ? fmtINRFull(Number(term.annualPremium) * parseInt(term.premiumPayingTerm || term.term, 10)) : "—"}</span>
              </span>
              <span>
                Calculated Paid: <span style={{ color: THEME.sage, fontWeight: 800 }}>{fmtINRFull((term.transactions || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0))}</span>
              </span>
              <span>
                Balance to Pay: <span style={{ color: (term.annualPremium && (term.premiumPayingTerm || term.term) && (Number(term.annualPremium) * parseInt(term.premiumPayingTerm || term.term, 10) - (term.transactions || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0)) <= 0) ? THEME.sage : THEME.gold, fontWeight: 800 }}>
                  {term.annualPremium && (term.premiumPayingTerm || term.term) ? (
                    (() => {
                      const bal = (Number(term.annualPremium) * parseInt(term.premiumPayingTerm || term.term, 10)) - (term.transactions || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);
                      return bal <= 0 ? "Fully Paid" : fmtINRFull(bal);
                    })()
                  ) : "—"}
                </span>
              </span>
            </div>
          </div>
        </>
      )}
      <ModalActions onSave={handleSave} onClose={onClose} saveLabel={isEdit ? "Update Policy" : "Add Policy"} />
    </Modal>
  );
};





/* ══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════════════ */

export function InsuranceSummaryTab({ state, metrics, addItem, removeItem, updateItem }: any) {
  const [modal, setModal] = useState<null | "lic" | "term" | "invest">(null);
  const [editPolicy, setEditPolicy] = useState<any>(null);

  const totalLICAssured = state.lic.reduce((s: number, l: any) => s + Number(l.sumAssured || 0), 0);
  const totalTermCover = state.termPlans.reduce((s: number, t: any) => s + Number(t.coverAmount || 0), 0);
  const totalInvestMaturity = (state.investmentPlans || []).reduce((s: number, ip: any) => s + Number(ip.expectedMaturityAmount || 0), 0);
  const licAnnualPremium = state.lic.reduce((s: number, l: any) => s + Number(l.annualPremium || 0), 0);
  const termAnnualPremium = state.termPlans.reduce((s: number, t: any) => s + Number(t.annualPremium || 0), 0);
  const investAnnualPremium = (state.investmentPlans || []).reduce((s: number, ip: any) => s + Number(ip.annualPremium || 0), 0);
  const totalAnnualPremium = licAnnualPremium + termAnnualPremium + investAnnualPremium;
  
  const annualIncome = metrics?.annualIncome || 0;
  
  const coverRatio = annualIncome > 0 ? totalTermCover / annualIncome : 0;
  const adequacyLevel = annualIncome > 0
    ? (coverRatio >= 15 ? "excellent" : coverRatio >= 10 ? "adequate" : coverRatio >= 5 ? "low" : "critical")
    : "none";
  const adequacyColor = { excellent: THEME.sage, adequate: THEME.gold, low: THEME.gold, critical: THEME.rust, none: THEME.muted }[adequacyLevel];
  const adequacyLabel = { 
    excellent: "Excellent Protection (≥15×)", 
    adequate: "Adequate Protection (10–15×)", 
    low: "Low Coverage (5–10×)", 
    critical: "Critical Underinsurance (<5×)",
    none: "No income data to calculate adequacy"
  }[adequacyLevel];

  const handleSave = (key: string, data: any, isEdit: boolean = false) => {
    if (isEdit) {
      updateItem(key, data.id, data);
    } else {
      addItem(key, data);
    }
    setModal(null);
    setEditPolicy(null);
  };

  return (
    <div className="tab-content-enter">
      <SectionTitle 
        sub="Manage your life insurance, term protection cover, and endowment/investment schemes in one place"
        rightElement={
          <div style={{ display: "flex", gap: 10 }}>
            <Button onClick={() => setModal("lic")} size="sm" variant="accent" icon={<Plus size={14} />}>Add LIC</Button>
            <Button onClick={() => setModal("term")} size="sm" variant="accent" icon={<Plus size={14} />}>Add Term Plan</Button>
            <Button onClick={() => setModal("invest")} size="sm" variant="accent" icon={<Plus size={14} />}>Add Investment Plan</Button>
          </div>
        }
      >
        Insurance Portfolio
      </SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard icon={<Shield />} label="Total LIC Sum Assured" value={fmtINRFull(totalLICAssured)} color={THEME.rust} sub="Life Insurance Corp policies" />
        <StatCard icon={<Heart />} label="Total Term Cover" value={fmtINRFull(totalTermCover)} color={THEME.rust} sub="Pure protection cover" />
        <StatCard icon={<Wallet />} label="Total Annual Premium" value={fmtINRFull(totalAnnualPremium)} color={THEME.gold} sub="Combined insurance cost" />
        <StatCard icon={<Sparkles />} label="Investment Maturity" value={fmtINRFull(totalInvestMaturity)} color={THEME.sage} sub="Endowment & ULIP receivables" />
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
            {state.lic.map((l: any) => {
              const paid = (l.transactions || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0) || Number(l.premiumPaid || 0);
              return (
                <Card key={l.id} style={{ padding: "20px", borderLeft: `4px solid ${THEME.rust}`, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <InsurerLogo name="LIC" isLic />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 900, fontSize: 17, color: THEME.ink, letterSpacing: "-0.02em" }}>{l.planName}</span>
                        <OwnerBadge owner={l.owner} />
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
                        <span style={{ color: THEME.rust }}>{fmtINRFull(l.sumAssured)} assured</span>
                        <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>
                        <span>#{l.policyNumber || "No No."}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: THEME.ink, letterSpacing: "-0.01em" }}>{fmtINRFull(l.annualPremium)}</div>
                      <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>premium/yr</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, padding: "12px 14px", background: "rgba(128,128,128,0.03)", borderRadius: 10, fontSize: 12 }}>
                    <div>
                      <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Policy Term</div>
                      <div style={{ fontWeight: 700, color: THEME.ink }}>{l.policyTerm ? `${l.policyTerm} Yrs` : "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Commencement</div>
                      <div style={{ fontWeight: 700, color: THEME.ink }}>{l.commencementDate || "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Maturity Date</div>
                      <div style={{ fontWeight: 700, color: THEME.ink }}>{l.maturityDate || "—"}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 8, borderTop: `1px solid ${THEME.line}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>
                        Total Paid: <span style={{ color: THEME.sage, fontWeight: 800 }}>{fmtINRFull(paid)}</span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>
                        Balance: <span style={{ color: (l.annualPremium && l.policyTerm && (Number(l.annualPremium) * parseInt(l.policyTerm, 10) - paid) <= 0) ? THEME.sage : THEME.gold, fontWeight: 800 }}>
                          {l.annualPremium && l.policyTerm ? (
                            (() => {
                              const bal = (Number(l.annualPremium) * parseInt(l.policyTerm, 10)) - paid;
                              return bal <= 0 ? "Fully Paid" : fmtINRFull(bal);
                            })()
                          ) : "—"}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                      <Button variant="ghost" size="sm" onClick={() => setEditPolicy(l)} style={{ padding: 6, color: THEME.accent }}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeItem("lic", l.id)} style={{ padding: 6, color: THEME.rust }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
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
            {state.termPlans.map((t: any) => {
              const paid = (t.transactions || []).reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0) || Number(t.premiumPaid || 0);
              return (
                <Card key={t.id} style={{ padding: "20px", borderLeft: `4px solid ${THEME.rust}`, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <InsurerLogo name={t.insurer} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 900, fontSize: 17, color: THEME.ink, letterSpacing: "-0.02em" }}>{t.planName || "Term Plan"}</span>
                        <OwnerBadge owner={t.owner} />
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
                        <span style={{ color: THEME.rust }}>{fmtINRFull(t.coverAmount)} cover</span>
                        <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>
                        <span>{t.insurer}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: THEME.ink, letterSpacing: "-0.01em" }}>{fmtINRFull(t.annualPremium)}</div>
                      <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>premium/yr</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: 12, padding: "12px 14px", background: "rgba(128,128,128,0.03)", borderRadius: 10, fontSize: 12 }}>
                    <div>
                      <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Plan Cover</div>
                      <div style={{ fontWeight: 700, color: THEME.ink }}>{t.term ? `${t.term} Yrs` : "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Payable For</div>
                      <div style={{ fontWeight: 700, color: THEME.ink }}>{t.premiumPayingTerm ? `${t.premiumPayingTerm} Yrs` : "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Commencement</div>
                      <div style={{ fontWeight: 700, color: THEME.ink }}>{t.startDate || "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Expiry Date</div>
                      <div style={{ fontWeight: 700, color: THEME.ink }}>{t.expiryDate || "—"}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 8, borderTop: `1px solid ${THEME.line}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>
                        Total Paid: <span style={{ color: THEME.sage, fontWeight: 800 }}>{fmtINRFull(paid)}</span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>
                        Balance: <span style={{ color: (t.annualPremium && (t.premiumPayingTerm || t.term) && (Number(t.annualPremium) * parseInt(t.premiumPayingTerm || t.term, 10) - paid) <= 0) ? THEME.sage : THEME.gold, fontWeight: 800 }}>
                          {t.annualPremium && (t.premiumPayingTerm || t.term) ? (
                            (() => {
                              const bal = (Number(t.annualPremium) * parseInt(t.premiumPayingTerm || t.term, 10)) - paid;
                              return bal <= 0 ? "Fully Paid" : fmtINRFull(bal);
                            })()
                          ) : "—"}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                      <Button variant="ghost" size="sm" onClick={() => setEditPolicy(t)} style={{ padding: 6, color: THEME.accent }}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeItem("termPlans", t.id)} style={{ padding: 6, color: THEME.rust }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {/* INVESTMENT PLANS SECTION */}
      <Card style={{ padding: 24, marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: "-0.02em", color: THEME.ink }}>Investment Plans (Endowment / ULIP)</div>
          <Button onClick={() => setModal("invest")} size="sm" variant="secondary" icon={<Plus size={14} />}>Add Plan</Button>
        </div>
        {(!state.investmentPlans || state.investmentPlans.length === 0) ? (
          <EmptyState
            icon={Sparkles}
            gradient="linear-gradient(135deg,#059669 0%,#34d399 100%)"
            dotColor="#059669"
            title="No Investment Plans Added"
            description="Track your Endowment, ULIPs, and Guaranteed Income plans here. Monitor premium payments, expected maturity amounts, and calculate cash-flows."
            pills={["Premium Term", "Maturity Amount", "Paid So Far", "Balance Due"]}
            buttonLabel="Add Plan"
            onAdd={() => setModal("invest")}
          />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16 }}>
            {state.investmentPlans.map((ip: any) => {
              const paid = (ip.transactions || []).reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0) || Number(ip.premiumPaid || 0);
              const expectedTotal = Number(ip.annualPremium || 0) * Number(ip.premiumPayingTerm || ip.policyTerm || 0);
              const balance = Math.max(0, expectedTotal - paid);
              const isPaid = balance <= 0;
              return (
                <Card key={ip.id} style={{ padding: "20px", borderLeft: `4px solid ${isPaid ? THEME.sage : THEME.gold}`, display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <InsurerLogo name={ip.insurer} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 900, fontSize: 17, color: THEME.ink, letterSpacing: "-0.02em" }}>{ip.planName || "Investment Plan"}</span>
                        <OwnerBadge owner={ip.owner} />
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
                        <span style={{ color: THEME.sage }}>{fmtINRFull(ip.expectedMaturityAmount)} maturity</span>
                        <span style={{ margin: "0 6px", opacity: 0.4 }}>·</span>
                        <span>{ip.insurer}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: THEME.ink, letterSpacing: "-0.01em" }}>{fmtINRFull(ip.annualPremium)}</div>
                      <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>premium/yr</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))", gap: 12, padding: "12px 14px", background: "rgba(128,128,128,0.03)", borderRadius: 10, fontSize: 12 }}>
                    <div>
                      <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Policy Term</div>
                      <div style={{ fontWeight: 700, color: THEME.ink }}>{ip.policyTerm ? `${ip.policyTerm} Yrs` : "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Paying Term</div>
                      <div style={{ fontWeight: 700, color: THEME.ink }}>{ip.premiumPayingTerm ? `${ip.premiumPayingTerm} Yrs` : "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Commencement</div>
                      <div style={{ fontWeight: 700, color: THEME.ink }}>{ip.commencementDate || "—"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>Maturity Date</div>
                      <div style={{ fontWeight: 700, color: THEME.ink }}>{ip.maturityDate || "—"}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 8, borderTop: `1px solid ${THEME.line}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>
                        Total Paid: <span style={{ color: THEME.sage, fontWeight: 800 }}>{fmtINRFull(paid)}</span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>
                        Balance: <span style={{ color: isPaid ? THEME.sage : THEME.gold, fontWeight: 800 }}>
                          {isPaid ? "Fully Paid" : fmtINRFull(balance)}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                      <Button variant="ghost" size="sm" onClick={() => setEditPolicy(ip)} style={{ padding: 6, color: THEME.accent }}>
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeItem("investmentPlans", ip.id)} style={{ padding: 6, color: THEME.rust }}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {(modal || editPolicy) && (
        <AddInsuranceModal 
          sub={modal || (editPolicy.expectedMaturityAmount !== undefined ? "invest" : editPolicy.insurer ? "term" : "lic")} 
          policy={editPolicy}
          onClose={() => { setModal(null); setEditPolicy(null); }} 
          onSave={handleSave} 
        />
      )}
    </div>
  );
}
