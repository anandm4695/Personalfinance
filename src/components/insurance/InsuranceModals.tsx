import React, { useState } from "react";
import {
  AlertCircle,
  Plus,
  Trash2,
  Sparkles,
  ListOrdered,
  Calendar,
  Clock,
  User,
  Shield,
  Zap,
  TrendingUp,
  Receipt,
  FileCheck,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { uid, today, fmtINRExact } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Button } from "../ui/Button";
import { Money } from "../ui/Money";
import { ConfirmDialog } from "../ui/Feedback";
import { addYearsClamped, UnifiedInsurancePolicy } from "./InsuranceTypes";

interface AddEditPolicyModalProps {
  type: "lic" | "term" | "invest";
  policy?: any;
  onClose: () => void;
  onSave: (collectionKey: string, data: any, isEdit: boolean) => Promise<void>;
  saving?: boolean;
  showToast?: (msg: string, type?: string) => void;
}

export const AddEditPolicyModal: React.FC<AddEditPolicyModalProps> = ({
  type,
  policy,
  onClose,
  onSave,
  saving = false,
  showToast,
}) => {
  const { familyProfiles } = useMasterData();
  const isEdit = !!policy;
  const todayStr = today();
  const futureStr20 = (() => {
    const d = new Date();
    return `${d.getFullYear() + 20}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();

  const [formError, setFormError] = useState("");

  // LIC state
  const [lic, setLic] = useState<any>(() => {
    if (type === "lic" && policy) {
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
        premiumPayingTerm: policy.premiumPayingTerm || "",
        transactions: policy.transactions || [],
        nominee: policy.nominee || "",
        nomineeRelation: policy.nomineeRelation || "",
        nomineeShare: policy.nomineeShare || "",
      };
    }
    return {
      owner: "self",
      planName: "",
      policyNumber: "",
      sumAssured: "",
      annualPremium: "",
      premiumPaid: "",
      commencementDate: todayStr,
      maturityDate: futureStr20,
      policyTerm: "20",
      premiumPayingTerm: "",
      transactions: [],
      nominee: "",
      nomineeRelation: "",
      nomineeShare: "",
    };
  });

  // Term state
  const [term, setTerm] = useState<any>(() => {
    if (type === "term" && policy) {
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
        policyNumber: policy.policyNumber || "",
        transactions: policy.transactions || [],
        nominee: policy.nominee || "",
        nomineeRelation: policy.nomineeRelation || "",
        nomineeShare: policy.nomineeShare || "",
      };
    }
    return {
      owner: "self",
      insurer: "",
      planName: "",
      coverAmount: "",
      annualPremium: "",
      expiryDate: futureStr20,
      startDate: todayStr,
      term: "20",
      premiumPayingTerm: "20",
      policyNumber: "",
      transactions: [],
      nominee: "",
      nomineeRelation: "",
      nomineeShare: "",
    };
  });

  // Investment state
  const [invest, setInvest] = useState<any>(() => {
    if (type === "invest" && policy) {
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
        transactions: policy.transactions || [],
        nominee: policy.nominee || "",
        nomineeRelation: policy.nomineeRelation || "",
        nomineeShare: policy.nomineeShare || "",
      };
    }
    return {
      owner: "self",
      insurer: "",
      planName: "",
      policyNumber: "",
      sumAssured: "",
      annualPremium: "",
      premiumPaid: "",
      policyTerm: "20",
      premiumPayingTerm: "10",
      commencementDate: todayStr,
      maturityDate: futureStr20,
      expectedMaturityAmount: "",
      transactions: [],
      nominee: "",
      nomineeRelation: "",
      nomineeShare: "",
    };
  });

  const handleLicChange = (field: string, val: any) => {
    setFormError("");
    setLic((prev: any) => {
      const updated = { ...prev, [field]: val };
      if ((field === "commencementDate" || field === "policyTerm") && updated.commencementDate && updated.policyTerm) {
        const commDate = new Date(updated.commencementDate);
        const termYears = parseInt(updated.policyTerm, 10);
        if (!isNaN(commDate.getTime()) && !isNaN(termYears) && termYears > 0) {
          const matDate = addYearsClamped(commDate, termYears);
          const y = matDate.getFullYear();
          const m = String(matDate.getMonth() + 1).padStart(2, "0");
          const d = String(matDate.getDate()).padStart(2, "0");
          updated.maturityDate = `${y}-${m}-${d}`;
        }
      }
      return updated;
    });
  };

  const handleTermChange = (field: string, val: any) => {
    setFormError("");
    setTerm((prev: any) => {
      const updated = { ...prev, [field]: val };
      if ((field === "startDate" || field === "term") && updated.startDate && updated.term) {
        const commDate = new Date(updated.startDate);
        const termYears = parseInt(updated.term, 10);
        if (!isNaN(commDate.getTime()) && !isNaN(termYears) && termYears > 0) {
          const expDate = addYearsClamped(commDate, termYears);
          const y = expDate.getFullYear();
          const m = String(expDate.getMonth() + 1).padStart(2, "0");
          const d = String(expDate.getDate()).padStart(2, "0");
          updated.expiryDate = `${y}-${m}-${d}`;
        }
      }
      return updated;
    });
  };

  const handleInvestChange = (field: string, val: any) => {
    setFormError("");
    setInvest((prev: any) => {
      const updated = { ...prev, [field]: val };
      if ((field === "commencementDate" || field === "policyTerm") && updated.commencementDate && updated.policyTerm) {
        const commDate = new Date(updated.commencementDate);
        const termYears = parseInt(updated.policyTerm, 10);
        if (!isNaN(commDate.getTime()) && !isNaN(termYears) && termYears > 0) {
          const matDate = addYearsClamped(commDate, termYears);
          const y = matDate.getFullYear();
          const m = String(matDate.getMonth() + 1).padStart(2, "0");
          const d = String(matDate.getDate()).padStart(2, "0");
          updated.maturityDate = `${y}-${m}-${d}`;
        }
      }
      return updated;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === "lic") {
      if (!lic.planName.trim()) {
        setFormError("Plan Name is required.");
        return;
      }
      if (!(Number(lic.sumAssured) > 0)) {
        setFormError("Sum Assured must be greater than 0.");
        return;
      }
      if (!(Number(lic.annualPremium) > 0)) {
        setFormError("Annual Premium must be greater than 0.");
        return;
      }
      const calculatedPaid = (lic.transactions || []).reduce(
        (sum: number, t: any) => sum + Number(t.amount || 0),
        0
      );
      onSave("lic", { ...lic, premiumPaid: calculatedPaid || lic.premiumPaid, id: lic.id || uid() }, isEdit);
    } else if (type === "term") {
      if (!term.insurer.trim()) {
        setFormError("Insurer / Company is required.");
        return;
      }
      if (!term.planName.trim()) {
        setFormError("Plan Name is required.");
        return;
      }
      if (!(Number(term.coverAmount) > 0)) {
        setFormError("Cover Amount must be greater than 0.");
        return;
      }
      if (!(Number(term.annualPremium) > 0)) {
        setFormError("Annual Premium must be greater than 0.");
        return;
      }
      const calculatedPaid = (term.transactions || []).reduce(
        (sum: number, t: any) => sum + Number(t.amount || 0),
        0
      );
      onSave("termPlans", { ...term, premiumPaid: calculatedPaid || term.premiumPaid, id: term.id || uid() }, isEdit);
    } else {
      if (!term && !invest.planName.trim()) {
        setFormError("Plan Name is required.");
        return;
      }
      if (!invest.insurer.trim()) {
        setFormError("Insurer is required.");
        return;
      }
      if (!(Number(invest.expectedMaturityAmount) > 0)) {
        setFormError("Expected Maturity Amount must be greater than 0.");
        return;
      }
      if (!(Number(invest.annualPremium) > 0)) {
        setFormError("Annual Premium must be greater than 0.");
        return;
      }
      const calculatedPaid = (invest.transactions || []).reduce(
        (sum: number, t: any) => sum + Number(t.amount || 0),
        0
      );
      onSave("investmentPlans", { ...invest, premiumPaid: calculatedPaid || invest.premiumPaid, id: invest.id || uid() }, isEdit);
    }
  };

  const modalTitle = `${isEdit ? "Edit" : "Add"} ${
    type === "lic"
      ? "LIC Traditional Policy"
      : type === "term"
      ? "Term Life Cover"
      : "Investment / ULIP Scheme"
  }`;

  return (
    <Modal title={modalTitle} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {formError && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              borderRadius: 8,
              background: "color-mix(in srgb, var(--t-rust) 12%, transparent)",
              border: "1px solid color-mix(in srgb, var(--t-rust) 30%, transparent)",
              color: "var(--t-rust)",
              fontSize: 12,
              fontWeight: 700,
              marginBottom: 14,
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            {formError}
          </div>
        )}

        {/* Form fields based on policy type */}
        {type === "lic" && (
          <>
            <Field label="Policy Owner / Member">
              <select
                className="form-input"
                value={lic.owner || "self"}
                onChange={(e) => handleLicChange("owner", e.target.value)}
              >
                {familyProfiles.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {formatProfileOption(p)}
                  </option>
                ))}
              </select>
            </Field>

            <div className="ins-form-row-2">
              <Field label="Plan Name">
                <input
                  className="form-input"
                  value={lic.planName}
                  onChange={(e) => handleLicChange("planName", e.target.value)}
                  placeholder="e.g. Jeevan Anand, Tech Term"
                  required
                />
              </Field>
              <Field label="Policy Number">
                <input
                  className="form-input"
                  value={lic.policyNumber}
                  onChange={(e) => handleLicChange("policyNumber", e.target.value)}
                  placeholder="e.g. 123456789"
                />
              </Field>
            </div>

            <div className="ins-form-row-2">
              <Field label="Sum Assured (₹)">
                <input
                  className="form-input"
                  type="number"
                  value={lic.sumAssured}
                  onChange={(e) => handleLicChange("sumAssured", e.target.value)}
                  placeholder="1000000"
                  required
                />
              </Field>
              <Field label="Annual Premium (₹)">
                <input
                  className="form-input"
                  type="number"
                  value={lic.annualPremium}
                  onChange={(e) => handleLicChange("annualPremium", e.target.value)}
                  placeholder="35000"
                  required
                />
              </Field>
            </div>

            <div className="ins-form-row-3">
              <Field label="Policy Term (Years)">
                <input
                  className="form-input"
                  type="number"
                  value={lic.policyTerm}
                  onChange={(e) => handleLicChange("policyTerm", e.target.value)}
                  placeholder="20"
                />
              </Field>
              <Field label="Commencement Date">
                <input
                  className="form-input"
                  type="date"
                  value={lic.commencementDate}
                  onChange={(e) => handleLicChange("commencementDate", e.target.value)}
                />
              </Field>
              <Field label="Maturity Date">
                <input
                  className="form-input"
                  type="date"
                  value={lic.maturityDate}
                  onChange={(e) => handleLicChange("maturityDate", e.target.value)}
                />
              </Field>
            </div>
          </>
        )}

        {type === "term" && (
          <>
            <Field label="Policy Owner / Member">
              <select
                className="form-input"
                value={term.owner || "self"}
                onChange={(e) => handleTermChange("owner", e.target.value)}
              >
                {familyProfiles.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {formatProfileOption(p)}
                  </option>
                ))}
              </select>
            </Field>

            <div className="ins-form-row-2">
              <Field label="Insurer / Company">
                <input
                  className="form-input"
                  value={term.insurer}
                  onChange={(e) => handleTermChange("insurer", e.target.value)}
                  placeholder="e.g. HDFC Life, ICICI Pru, Max Life"
                  required
                />
              </Field>
              <Field label="Plan Name">
                <input
                  className="form-input"
                  value={term.planName}
                  onChange={(e) => handleTermChange("planName", e.target.value)}
                  placeholder="e.g. Click 2 Protect 3D Plus"
                  required
                />
              </Field>
            </div>

            <div className="ins-form-row-2">
              <Field label="Cover Amount (₹)">
                <input
                  className="form-input"
                  type="number"
                  value={term.coverAmount}
                  onChange={(e) => handleTermChange("coverAmount", e.target.value)}
                  placeholder="10000000"
                  required
                />
              </Field>
              <Field label="Annual Premium (₹)">
                <input
                  className="form-input"
                  type="number"
                  value={term.annualPremium}
                  onChange={(e) => handleTermChange("annualPremium", e.target.value)}
                  placeholder="18000"
                  required
                />
              </Field>
            </div>

            <div className="ins-form-row-3">
              <Field label="Cover Term (Years)">
                <input
                  className="form-input"
                  type="number"
                  value={term.term}
                  onChange={(e) => handleTermChange("term", e.target.value)}
                  placeholder="30"
                />
              </Field>
              <Field label="Start Date">
                <input
                  className="form-input"
                  type="date"
                  value={term.startDate}
                  onChange={(e) => handleTermChange("startDate", e.target.value)}
                />
              </Field>
              <Field label="Expiry Date">
                <input
                  className="form-input"
                  type="date"
                  value={term.expiryDate}
                  onChange={(e) => handleTermChange("expiryDate", e.target.value)}
                />
              </Field>
            </div>
          </>
        )}

        {type === "invest" && (
          <>
            <Field label="Policy Owner / Member">
              <select
                className="form-input"
                value={invest.owner || "self"}
                onChange={(e) => handleInvestChange("owner", e.target.value)}
              >
                {familyProfiles.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {formatProfileOption(p)}
                  </option>
                ))}
              </select>
            </Field>

            <div className="ins-form-row-2">
              <Field label="Insurer / Company">
                <input
                  className="form-input"
                  value={invest.insurer}
                  onChange={(e) => handleInvestChange("insurer", e.target.value)}
                  placeholder="e.g. Kotak, Tata AIA, SBI Life"
                  required
                />
              </Field>
              <Field label="Plan Name">
                <input
                  className="form-input"
                  value={invest.planName}
                  onChange={(e) => handleInvestChange("planName", e.target.value)}
                  placeholder="e.g. Sanchay Plus, Guaranteed Returns"
                  required
                />
              </Field>
            </div>

            <div className="ins-form-row-2">
              <Field label="Annual Premium (₹)">
                <input
                  className="form-input"
                  type="number"
                  value={invest.annualPremium}
                  onChange={(e) => handleInvestChange("annualPremium", e.target.value)}
                  placeholder="100000"
                  required
                />
              </Field>
              <Field label="Expected Maturity Payout (₹)">
                <input
                  className="form-input"
                  type="number"
                  value={invest.expectedMaturityAmount}
                  onChange={(e) => handleInvestChange("expectedMaturityAmount", e.target.value)}
                  placeholder="1800000"
                  required
                />
              </Field>
            </div>

            <div className="ins-form-row-4">
              <Field label="Policy Term (Yrs)">
                <input
                  className="form-input"
                  type="number"
                  value={invest.policyTerm}
                  onChange={(e) => handleInvestChange("policyTerm", e.target.value)}
                  placeholder="15"
                />
              </Field>
              <Field label="Pay Term (Yrs)">
                <input
                  className="form-input"
                  type="number"
                  value={invest.premiumPayingTerm}
                  onChange={(e) => handleInvestChange("premiumPayingTerm", e.target.value)}
                  placeholder="10"
                />
              </Field>
              <Field label="Start Date">
                <input
                  className="form-input"
                  type="date"
                  value={invest.commencementDate}
                  onChange={(e) => handleInvestChange("commencementDate", e.target.value)}
                />
              </Field>
              <Field label="Maturity Date">
                <input
                  className="form-input"
                  type="date"
                  value={invest.maturityDate}
                  onChange={(e) => handleInvestChange("maturityDate", e.target.value)}
                />
              </Field>
            </div>
          </>
        )}

        <ModalActions>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="accent" type="submit" disabled={saving}>
            {saving ? "Saving..." : isEdit ? "Update Policy" : "Create Policy"}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
};

interface PolicyLedgerDrawerModalProps {
  policy: UnifiedInsurancePolicy;
  onClose: () => void;
  onUpdatePolicy: (policy: UnifiedInsurancePolicy) => Promise<void>;
  showToast?: (msg: string, type?: string) => void;
}

export const PolicyLedgerDrawerModal: React.FC<PolicyLedgerDrawerModalProps> = ({
  policy,
  onClose,
  onUpdatePolicy,
  showToast,
}) => {
  const [transactions, setTransactions] = useState<any[]>(
    policy.raw.transactions || []
  );
  const [newDate, setNewDate] = useState(today());
  const [newAmount, setNewAmount] = useState(String(policy.annualPremium || ""));
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const calculatedPaid = transactions.reduce(
    (sum, t) => sum + Number(t.amount || 0),
    0
  );
  const balanceRemaining = Math.max(0, policy.expectedTotal - calculatedPaid);

  const handleAddPayment = () => {
    if (!newDate || !newAmount || Number(newAmount) <= 0) {
      showToast?.("Please enter a valid payment date and amount.", "warn");
      return;
    }
    const newTx = {
      id: uid(),
      date: newDate,
      amount: Number(newAmount),
    };
    const updated = [...transactions, newTx].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    setTransactions(updated);
    setNewAmount(String(policy.annualPremium || ""));
  };

  const handleRemovePayment = (txId: string) => {
    setTransactions(transactions.filter((t) => t.id !== txId));
  };

  const doAutoGenerate = () => {
    const startStr = policy.startDate;
    const premium = Number(policy.annualPremium || 0);
    const payTerm = policy.payingTerm || policy.policyTerm || 10;
    if (!startStr || premium <= 0) {
      showToast?.("Commencement date and annual premium required.", "warn");
      return;
    }

    const startDate = new Date(startStr);
    const todayDate = new Date();
    const generated: any[] = [];
    let count = 0;
    let curr = new Date(startDate);

    while (curr <= todayDate && count < payTerm) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, "0");
      const d = String(curr.getDate()).padStart(2, "0");
      generated.push({
        id: uid(),
        date: `${y}-${m}-${d}`,
        amount: premium,
      });
      count++;
      curr = addYearsClamped(startDate, count);
    }

    setTransactions(generated);
    setConfirmReplace(false);
    showToast?.(`Auto-generated ${generated.length} payment records.`, "success");
  };

  const handleSaveLedger = async () => {
    setIsSaving(true);
    try {
      const updatedRaw = {
        ...policy.raw,
        transactions,
        premiumPaid: calculatedPaid,
      };
      await onUpdatePolicy({
        ...policy,
        totalPaid: calculatedPaid,
        balanceToPay: balanceRemaining,
        raw: updatedRaw,
      });
      showToast?.("Payment ledger updated successfully.", "success");
      onClose();
    } catch (e: any) {
      showToast?.(`Failed to save ledger: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      title={`Payment Ledger · ${policy.planName}`}
      onClose={onClose}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* KPI summary */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 10,
            background: "var(--surface-0)",
            padding: "12px 16px",
            borderRadius: 10,
            border: `1px solid ${THEME.line}`,
          }}
        >
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t-muted)", textTransform: "uppercase" }}>
              Expected Lifetime
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--t-ink)" }}>
              <Money value={policy.expectedTotal} variant="exact" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t-muted)", textTransform: "uppercase" }}>
              Total Paid
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--t-sage)" }}>
              <Money value={calculatedPaid} variant="exact" />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t-muted)", textTransform: "uppercase" }}>
              Balance Left
            </div>
            <div style={{ fontSize: 14, fontWeight: 800, color: balanceRemaining <= 0 ? "var(--t-sage)" : "var(--t-gold)" }}>
              {balanceRemaining <= 0 ? "Nil (Paid)" : <Money value={balanceRemaining} variant="exact" />}
            </div>
          </div>
        </div>

        {/* Action Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--t-ink)" }}>
            Recorded Premiums ({transactions.length})
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (transactions.length > 0) {
                setConfirmReplace(true);
              } else {
                doAutoGenerate();
              }
            }}
            style={{ fontSize: 11, color: "var(--t-accent)" }}
          >
            <Sparkles size={12} style={{ marginRight: 4 }} />
            Auto-Generate Schedule
          </Button>
        </div>

        {/* Transactions List */}
        <div
          style={{
            maxHeight: 220,
            overflowY: "auto",
            border: `1px solid ${THEME.line}`,
            borderRadius: 8,
            padding: "8px 12px",
            background: "var(--surface-0)",
          }}
        >
          {transactions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--t-muted)", fontSize: 12 }}>
              No payments logged yet. Use auto-generate or record one below.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {transactions.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 8px",
                    borderRadius: 6,
                    borderBottom: `1px solid color-mix(in srgb, ${THEME.line} 40%, transparent)`,
                    fontSize: 12,
                  }}
                >
                  <span style={{ fontWeight: 600, color: "var(--t-ink)" }}>{t.date}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontWeight: 800, color: "var(--t-sage)" }}>
                      <Money value={t.amount} variant="exact" />
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemovePayment(t.id)}
                      style={{ padding: 4, color: "var(--t-rust)" }}
                      title="Remove entry"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Payment Row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 10,
            padding: 12,
            borderRadius: 8,
            background: "color-mix(in srgb, var(--t-muted) 6%, transparent)",
            border: `1px solid ${THEME.line}`,
          }}
        >
          <div style={{ flex: 1.2 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: "var(--t-muted)", display: "block", marginBottom: 4 }}>
              Payment Date
            </label>
            <input
              type="date"
              className="form-input"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              style={{ fontSize: 12, padding: "5px 8px" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: "var(--t-muted)", display: "block", marginBottom: 4 }}>
              Amount (₹)
            </label>
            <input
              type="number"
              className="form-input"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              style={{ fontSize: 12, padding: "5px 8px" }}
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAddPayment}
            style={{ height: 32, fontSize: 12 }}
          >
            + Add Payment
          </Button>
        </div>

        <ModalActions>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="accent" onClick={handleSaveLedger} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Ledger Changes"}
          </Button>
        </ModalActions>
      </div>

      {confirmReplace && (
        <ConfirmDialog
          message={`This will overwrite ${transactions.length} existing transactions with an auto-generated schedule based on policy dates. Proceed?`}
          onConfirm={doAutoGenerate}
          onCancel={() => setConfirmReplace(false)}
        />
      )}
    </Modal>
  );
};
