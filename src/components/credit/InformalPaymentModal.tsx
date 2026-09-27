/* eslint-disable */
import React, { useState } from "react";
import {
  IndianRupee,
  Calendar,
  CreditCard,
  FileText,
  Landmark,
  CheckCircle2,
  Sparkles,
  Zap,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, today } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Money } from "../ui/Money";

const PAYMENT_MODES = [
  "UPI",
  "Bank Transfer / IMPS / NEFT",
  "Cash",
  "Cheque",
  "Card",
  "Other",
];

interface InformalPaymentModalProps {
  direction: "borrowed" | "lent";
  person: any;
  initial?: any | null;
  bankAccounts?: any[];
  onSave: (paymentData: any, bankTxn?: any) => Promise<void> | void;
  onClose: () => void;
  saving?: boolean;
}

export function InformalPaymentModal({
  direction,
  person,
  initial = null,
  bankAccounts = [],
  onSave,
  onClose,
  saving = false,
}: InformalPaymentModalProps) {
  const isBorrowed = direction === "borrowed";
  const personName = person?.person || person?.name || (isBorrowed ? "Lender" : "Borrower");

  // Calculate current outstanding for context
  const tranches: any[] = person?.tranches || [];
  const payments: any[] = person?.payments || [];
  const totalT = tranches.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  const totalP = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const currentOutstanding = Math.max(0, totalT - totalP);

  const actionTitle = initial
    ? `Edit Payment — ${personName}`
    : isBorrowed
    ? `Record Repayment Made to ${personName}`
    : `Record Payment Received from ${personName}`;

  const [amount, setAmount] = useState<string>(
    initial?.amount ? String(initial.amount) : currentOutstanding > 0 ? String(currentOutstanding) : ""
  );
  const [date, setDate] = useState<string>(initial?.date || today());
  const [method, setMethod] = useState<string>(initial?.method || "UPI");
  const [note, setNote] = useState<string>(initial?.note || "");
  const [selectedBankId, setSelectedBankId] = useState<string>("");
  const [narration, setNarration] = useState<string>(initial?.narration || "");
  const [referenceNumber, setReferenceNumber] = useState<string>(initial?.referenceNumber || initial?.reference || "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const numAmt = Number(amount);
    if (!amount || isNaN(numAmt) || numAmt <= 0) {
      setError("Please enter a valid payment amount greater than ₹0");
      return;
    }
    if (!date) {
      setError("Please select the payment date");
      return;
    }
    setError(null);

    const paymentData: any = {
      ...(initial || {}),
      id: initial?.id || `pm-${Date.now()}`,
      amount: numAmt,
      date,
      method,
      note: note.trim(),
      ...(narration.trim() ? { narration: narration.trim() } : {}),
      ...(referenceNumber.trim() ? { referenceNumber: referenceNumber.trim(), reference: referenceNumber.trim() } : {}),
      ...(selectedBankId ? { bankAccountId: selectedBankId } : {}),
    };

    // Optional bank transaction creation (only on new payment)
    let bankTxn: any = null;
    if (!initial && selectedBankId) {
      const selectedBank = bankAccounts.find((b: any) => b.id === selectedBankId);
      if (isBorrowed) {
        // Repayment made to lender -> Debit from user's bank account
        bankTxn = {
          id: `txn-${Date.now()}`,
          date,
          amount: numAmt,
          type: "debit",
          category: "Debt Repayment",
          note: note.trim() || `Repayment to ${personName}`,
          description: note.trim() || `Repayment to ${personName} via ${method}`,
          narration: narration.trim() || `Repayment to ${personName} - Ref: ${referenceNumber.trim() || method}`,
          referenceNumber: referenceNumber.trim() || undefined,
          accountId: selectedBankId,
          bankAccountId: selectedBankId,
          bankName: selectedBank?.bankName || "Bank",
          mode: method,
          owner: person?.owner || "self",
          linkedType: "informalBorrowed",
          linkedId: person?.id,
        };
      } else {
        // Repayment received from borrower -> Credit into user's bank account
        bankTxn = {
          id: `txn-${Date.now()}`,
          date,
          amount: numAmt,
          type: "credit",
          category: "Loan Recovery",
          note: note.trim() || `Loan recovery from ${personName}`,
          description: note.trim() || `Loan recovery from ${personName} via ${method}`,
          narration: narration.trim() || `Loan recovery from ${personName} - Ref: ${referenceNumber.trim() || method}`,
          referenceNumber: referenceNumber.trim() || undefined,
          accountId: selectedBankId,
          bankAccountId: selectedBankId,
          bankName: selectedBank?.bankName || "Bank",
          mode: method,
          owner: person?.owner || "self",
          linkedType: "informalLent",
          linkedId: person?.id,
        };
      }
    }

    if (bankTxn) {
      await onSave(paymentData, bankTxn);
    } else {
      await onSave(paymentData);
    }
  };

  return (
    <Modal title={actionTitle} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Outstanding Context Banner */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 14px",
            background: "color-mix(in srgb, var(--surface-1) 60%, transparent)",
            borderRadius: 10,
            border: "1px solid var(--t-line)",
          }}
        >
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--t-muted)" }}>
              {isBorrowed ? "Total You Owe" : "Total Owed To You"}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                fontWeight: 800,
                color: currentOutstanding > 0 ? (isBorrowed ? "var(--t-rust)" : "var(--t-accent)") : "var(--t-sage)",
                fontVariantNumeric: "tabular-nums",
                marginTop: 2,
              }}
            >
              <Money value={currentOutstanding} variant="full" />
            </div>
          </div>

          {!initial && currentOutstanding > 0 && (
            <button
              type="button"
              onClick={() => setAmount(String(currentOutstanding))}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid color-mix(in srgb, var(--t-sage) 30%, transparent)",
                background: "color-mix(in srgb, var(--t-sage) 12%, transparent)",
                color: "var(--t-sage)",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <Zap size={13} /> Settle Full (₹{fmtINR(currentOutstanding)})
            </button>
          )}
        </div>

        {error && (
          <div
            style={{
              padding: "8px 12px",
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              borderRadius: 6,
              color: "var(--t-rust)",
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {error}
          </div>
        )}

        {/* Amount & Date */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={isBorrowed ? "Repayment Amount (₹)" : "Received Amount (₹)"}>
            <div style={{ position: "relative" }}>
              <input
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 36px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--t-line)",
                  background: "var(--t-card-bg)",
                  color: "var(--t-ink)",
                  fontSize: 14,
                  fontWeight: 700,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                type="number"
                min="1"
                step="any"
                placeholder="20000"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus
              />
              <IndianRupee
                size={15}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--t-muted)",
                }}
              />
            </div>
          </Field>

          <Field label="Payment Date">
            <div style={{ position: "relative" }}>
              <input
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 36px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--t-line)",
                  background: "var(--t-card-bg)",
                  color: "var(--t-ink)",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <Calendar
                size={15}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--t-muted)",
                }}
              />
            </div>
          </Field>
        </div>

        {/* Payment Method */}
        <Field label="Payment Mode / Channel">
          <div style={{ position: "relative" }}>
            <select
              style={{
                width: "100%",
                padding: "10px 12px 10px 36px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--t-line)",
                background: "var(--t-card-bg)",
                color: "var(--t-ink)",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              {PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <CreditCard
              size={15}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--t-muted)",
              }}
            />
          </div>
        </Field>

        {/* Bank Account Selection (Only for new entries) */}
        {!initial && bankAccounts && bankAccounts.length > 0 && (
          <Field label={isBorrowed ? "Debit from Bank Account (optional)" : "Deposit to Bank Account (optional)"}>
            <div style={{ position: "relative" }}>
              <select
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 36px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--t-line)",
                  background: "var(--t-card-bg)",
                  color: "var(--t-ink)",
                  fontSize: 13,
                  outline: "none",
                  boxSizing: "border-box",
                }}
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
              >
                <option value="">Do not log bank transaction</option>
                {bankAccounts.map((b: any) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} - {b.accountNumber ? `•••• ${b.accountNumber.slice(-4)}` : "Account"} (₹{fmtINR(b.balance || 0)})
                  </option>
                ))}
              </select>
              <Landmark
                size={15}
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--t-muted)",
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: "var(--t-muted)", marginTop: 4 }}>
              {isBorrowed
                ? "If selected, automatically logs an expense debit transaction in your bank ledger."
                : "If selected, automatically logs an income deposit transaction in your bank ledger."}
            </div>
          </Field>
        )}

        {/* Bank Transaction Metadata Fields */}
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
              <Field label="Reference / Cheque / UTR No.">
                <input
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--t-line)",
                    background: "var(--t-card-bg)",
                    color: "var(--t-ink)",
                    fontSize: 13,
                    outline: "none",
                  }}
                  placeholder="e.g. UPI / Cheque #4521 / UTR"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                />
              </Field>

              <Field label="Narration / Description (for Bank Ledger)">
                <input
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--t-line)",
                    background: "var(--t-card-bg)",
                    color: "var(--t-ink)",
                    fontSize: 13,
                    outline: "none",
                  }}
                  placeholder="e.g. UPI/23910391/Debt Settlement"
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                />
              </Field>
            </div>
          </div>
        )}

        {/* Note */}
        <Field label="Payment Remarks / Reference (optional)">
          <div style={{ position: "relative" }}>
            <input
              style={{
                width: "100%",
                padding: "10px 12px 10px 36px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--t-line)",
                background: "var(--t-card-bg)",
                color: "var(--t-ink)",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="e.g. GPay UPI ref #829103, Part payment 1"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <FileText
              size={15}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--t-muted)",
              }}
            />
          </div>
        </Field>

        <ModalActions
          onSave={handleSubmit}
          onClose={onClose}
          saveLabel={initial ? "Save Changes" : "Record Payment"}
          disabled={saving || !amount || Number(amount) <= 0}
          loading={saving}
        />
      </div>
    </Modal>
  );
}
