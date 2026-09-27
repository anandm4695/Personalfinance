/* eslint-disable */
import React, { useState } from "react";
import {
  Calculator,
  Building,
  Calendar,
  IndianRupee,
  Percent,
  Clock,
  Sparkles,
  Info,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull } from "../../utils/finance";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Money } from "../ui/Money";

interface LoanTakenModalProps {
  initial?: any;
  bankAccounts?: any[];
  onClose: () => void;
  onSave: (data: any, bankTxn?: any) => Promise<void> | void;
  saving?: boolean;
}

export function LoanTakenModal({
  initial = null,
  bankAccounts = [],
  onClose,
  onSave,
  saving,
}: LoanTakenModalProps) {
  const { loanTypes, familyProfiles } = useMasterData();

  const [f, setF] = useState(
    initial || {
      lender: "",
      type: loanTypes[0] || "Personal",
      accountNumber: "",
      principal: "",
      outstanding: "",
      emi: "",
      rate: "",
      monthsRemaining: "",
      dueDay: "",
      interestType: "Floating",
      status: "active",
      note: "",
      owner: "self",
    }
  );

  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [mode, setMode] = useState<string>("Bank Transfer");
  const [narration, setNarration] = useState<string>("");
  const [referenceNumber, setReferenceNumber] = useState<string>("");
  const [tenureUnit, setTenureUnit] = useState<"months" | "years">("months");
  const [tenureYears, setTenureYears] = useState<string>(
    f.monthsRemaining ? String(Math.round(Number(f.monthsRemaining) / 12)) : ""
  );

  // Live auto-calculator functions
  const autoCalculateEMI = () => {
    const p = Number(f.outstanding || f.principal) || 0;
    const r = Number(f.rate) || 0;
    const n = Number(f.monthsRemaining) || (Number(tenureYears) * 12) || 0;

    if (p <= 0 || n <= 0) return;
    const monthlyRate = r / 100 / 12;
    if (monthlyRate > 0) {
      const calculatedEmi = Math.round(
        (p * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1)
      );
      setF((prev: any) => ({ ...prev, emi: String(calculatedEmi) }));
    } else {
      setF((prev: any) => ({ ...prev, emi: String(Math.round(p / n)) }));
    }
  };

  const autoCalculateTenure = () => {
    const p = Number(f.outstanding || f.principal) || 0;
    const r = Number(f.rate) || 0;
    const emi = Number(f.emi) || 0;

    if (p <= 0 || emi <= 0) return;
    const monthlyRate = r / 100 / 12;
    if (monthlyRate > 0 && emi > monthlyRate * p) {
      const n = Math.ceil(-Math.log(1 - (monthlyRate * p) / emi) / Math.log(1 + monthlyRate));
      setF((prev: any) => ({ ...prev, monthsRemaining: String(n) }));
      setTenureYears(String((n / 12).toFixed(1)));
    } else if (monthlyRate === 0) {
      const n = Math.ceil(p / emi);
      setF((prev: any) => ({ ...prev, monthsRemaining: String(n) }));
      setTenureYears(String((n / 12).toFixed(1)));
    }
  };

  const handleTenureYearsChange = (val: string) => {
    setTenureYears(val);
    const months = val ? String(Math.round(Number(val) * 12)) : "";
    setF((prev: any) => ({ ...prev, monthsRemaining: months }));
  };

  const handleMonthsChange = (val: string) => {
    setF((prev: any) => ({ ...prev, monthsRemaining: val }));
    setTenureYears(val ? String((Number(val) / 12).toFixed(1)) : "");
  };

  const handleSave = () => {
    if (
      !f.lender?.trim() ||
      !(Number(f.principal) > 0) ||
      !(Number(f.emi) > 0) ||
      f.rate === "" ||
      f.rate == null
    ) {
      return;
    }

    const principalAmt = Number(f.principal) || 0;
    const outstanding = f.outstanding !== "" ? f.outstanding : f.principal;
    const loanData = {
      ...f,
      principal: principalAmt,
      outstanding: Math.max(0, Number(outstanding) || 0),
      emi: Number(f.emi) || 0,
      rate: Number(f.rate) || 0,
      monthsRemaining: Number(f.monthsRemaining) || 0,
    };

    let bankTxn: any = null;
    if (!initial && selectedBankId) {
      const selectedBank = bankAccounts.find((b: any) => b.id === selectedBankId);
      bankTxn = {
        id: `txn-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        amount: principalAmt,
        type: "credit",
        category: "Loan Received",
        note: f.note?.trim() || `Loan disbursement received from ${f.lender}`,
        description: f.note?.trim() || `Loan disbursement received from ${f.lender} via ${mode}`,
        narration: narration.trim() || `Disbursement from ${f.lender}${f.accountNumber ? ` A/C: ${f.accountNumber}` : ""} - Ref: ${referenceNumber.trim() || mode}`,
        referenceNumber: referenceNumber.trim() || undefined,
        accountId: selectedBankId,
        bankAccountId: selectedBankId,
        bankName: selectedBank?.bankName || "Bank",
        mode,
        owner: f.owner || "self",
        linkedType: "loansTaken",
      };
    }

    onSave(loanData, bankTxn);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid var(--t-line)",
    background: "var(--surface-0)",
    color: "var(--t-ink)",
    fontSize: 13,
    outline: "none",
  };

  return (
    <Modal title={initial ? "Edit Loan Taken" : "Add New Loan Taken"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
          <Field label="Owner / Family Profile">
            <select
              style={inputStyle}
              value={f.owner || "self"}
              onChange={(e) => setF({ ...f, owner: e.target.value })}
            >
              {familyProfiles.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {formatProfileOption(p)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Loan Category / Type">
            <select
              style={inputStyle}
              value={f.type}
              onChange={(e) => setF({ ...f, type: e.target.value })}
            >
              {loanTypes.map((t: string) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 12 }}>
          <Field label="Bank / Lending Institution">
            <input
              style={inputStyle}
              placeholder="e.g. HDFC Bank, SBI, ICICI, Bajaj Finserv"
              value={f.lender}
              onChange={(e) => setF({ ...f, lender: e.target.value })}
            />
          </Field>

          <Field label="Loan Account No. (Optional)">
            <input
              style={inputStyle}
              placeholder="e.g. LN-8392019"
              value={f.accountNumber || ""}
              onChange={(e) => setF({ ...f, accountNumber: e.target.value })}
            />
          </Field>
        </div>

        {/* Financial Inputs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Original Principal (₹)">
            <input
              style={inputStyle}
              type="number"
              min="0"
              placeholder="e.g. 2500000"
              value={f.principal}
              onChange={(e) => {
                const val = e.target.value;
                setF((prev: any) => ({
                  ...prev,
                  principal: val,
                  outstanding:
                    prev.outstanding === "" || prev.outstanding === prev.principal
                      ? val
                      : prev.outstanding,
                }));
              }}
            />
          </Field>

          <Field label="Current Outstanding Balance (₹)">
            <input
              style={inputStyle}
              type="number"
              min="0"
              placeholder={f.principal || "Current debt"}
              value={f.outstanding}
              onChange={(e) => setF({ ...f, outstanding: e.target.value })}
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Annual Interest Rate (% p.a.)">
            <input
              style={inputStyle}
              type="number"
              min="0"
              step="0.05"
              placeholder="e.g. 8.75"
              value={f.rate}
              onChange={(e) => setF({ ...f, rate: e.target.value })}
            />
          </Field>

          <Field label="Interest Rate Structure">
            <select
              style={inputStyle}
              value={f.interestType || "Floating"}
              onChange={(e) => setF({ ...f, interestType: e.target.value })}
            >
              <option>Floating / Variable</option>
              <option>Fixed Rate</option>
            </select>
          </Field>
        </div>

        {/* EMI and Tenure with Live Calculators */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t-muted)", textTransform: "uppercase" }}>
                Monthly EMI (₹)
              </label>
              <button
                type="button"
                onClick={autoCalculateEMI}
                title="Calculate EMI from Principal, Rate & Tenure"
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "var(--t-accent)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <Calculator size={11} /> Auto-Calc EMI
              </button>
            </div>
            <input
              style={inputStyle}
              type="number"
              min="0"
              placeholder="e.g. 24500"
              value={f.emi}
              onChange={(e) => setF({ ...f, emi: e.target.value })}
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t-muted)", textTransform: "uppercase" }}>
                Tenure Remaining
              </label>
              <button
                type="button"
                onClick={autoCalculateTenure}
                title="Calculate Tenure from Principal, Rate & EMI"
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: "var(--t-accent)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <Calculator size={11} /> Auto-Calc Tenure
              </button>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                type="number"
                min="0"
                placeholder="Months"
                value={f.monthsRemaining}
                onChange={(e) => handleMonthsChange(e.target.value)}
              />
              <span style={{ fontSize: 12, color: "var(--t-muted)", alignSelf: "center", fontWeight: 700 }}>
                ({tenureYears || "0"} yrs)
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Monthly EMI Due Day (1–31)">
            <input
              style={inputStyle}
              type="number"
              min={1}
              max={31}
              placeholder="e.g. 5 (5th of each month)"
              value={f.dueDay || ""}
              onChange={(e) => setF({ ...f, dueDay: e.target.value })}
            />
          </Field>

          <Field label="Status">
            <select
              style={inputStyle}
              value={f.status || "active"}
              onChange={(e) => setF({ ...f, status: e.target.value })}
            >
              <option value="active">Active Loan</option>
              <option value="closed">Paid Off / Closed</option>
            </select>
          </Field>
        </div>

        <Field label="Note / Purpose (Optional)">
          <input
            style={inputStyle}
            placeholder="e.g. 3BHK flat at Sector 45 / 4-wheeler loan"
            value={f.note || ""}
            onChange={(e) => setF({ ...f, note: e.target.value })}
          />
        </Field>

        {!initial && bankAccounts.length > 0 && (
          <>
            <Field label="Disbursed To Bank Account (Optional)">
              <select
                style={inputStyle}
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
              >
                <option value="">— Do not record in bank account —</option>
                {bankAccounts.map((acc: any) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bankName} {acc.accountNumber ? `(••••${acc.accountNumber.slice(-4)})` : ""}
                  </option>
                ))}
              </select>
              {selectedBankId && (
                <div
                  style={{
                    fontSize: 11,
                    color: THEME.sage,
                    marginTop: 6,
                    fontWeight: 600,
                  }}
                >
                  ✓ Will automatically credit {Number(f.principal) > 0 ? `₹${Number(f.principal).toLocaleString("en-IN")}` : "principal"} to this bank account in Banks & Transactions
                </div>
              )}
            </Field>

            {selectedBankId && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  padding: "12px 14px",
                  background: "color-mix(in srgb, var(--surface-1) 50%, transparent)",
                  borderRadius: "var(--radius-md)",
                  border: "1px dashed var(--t-line)",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--t-accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Bank Ledger Details
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <Field label="Payment Mode">
                    <select
                      style={inputStyle}
                      value={mode}
                      onChange={(e) => setMode(e.target.value)}
                    >
                      <option value="Bank Transfer">Bank Transfer (NEFT / IMPS / RTGS)</option>
                      <option value="UPI">UPI</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="Other">Other</option>
                    </select>
                  </Field>

                  <Field label="Reference / Cheque / UTR No.">
                    <input
                      style={inputStyle}
                      placeholder="e.g. Cheque #4521 / UTR No."
                      value={referenceNumber}
                      onChange={(e) => setReferenceNumber(e.target.value)}
                    />
                  </Field>
                </div>

                <Field label="Narration / Description (for Bank Ledger)">
                  <input
                    style={inputStyle}
                    placeholder="e.g. Disbursed Loan Principal / Ref: Loan Account"
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                  />
                </Field>
              </div>
            )}
          </>
        )}

        <ModalActions
          onSave={handleSave}
          onClose={onClose}
          saveLabel={initial ? "Save Changes" : "Add Loan Taken"}
          disabled={
            saving ||
            !f.lender?.trim() ||
            !(Number(f.principal) > 0) ||
            !(Number(f.emi) > 0) ||
            f.rate === ""
          }
          loading={saving}
        />
      </div>
    </Modal>
  );
}
