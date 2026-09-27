/* eslint-disable */
import React, { useState } from "react";
import {
  IndianRupee,
  Calendar,
  CreditCard,
  CheckCircle2,
  FileText,
  AlertCircle,
  TrendingDown,
  Layers,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { today, uid, fmtINR } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Money } from "../ui/Money";

interface LoanPaymentModalProps {
  loan: any;
  type: "taken" | "given";
  bankAccounts?: any[];
  onClose: () => void;
  onSavePayment: (
    paymentRecord: any,
    updatedLoanPatch: any,
    bankTransaction?: any
  ) => Promise<void> | void;
  saving?: boolean;
}

export function LoanPaymentModal({
  loan,
  type,
  bankAccounts = [],
  onClose,
  onSavePayment,
  saving,
}: LoanPaymentModalProps) {
  const isTaken = type === "taken";
  const outstanding = Number(loan.outstanding ?? loan.principal) || 0;
  const emi = Number(loan.emi) || 0;
  const rate = Number(loan.rate) || 0;
  const monthsRemaining = Number(loan.monthsRemaining) || 0;

  // Find matching bank accounts for the loan owner or default to available
  const ownerAccounts = bankAccounts.filter(
    (a: any) => !loan.owner || loan.owner === "self" || a.owner === loan.owner || a.owner === "self"
  );
  const candidateAccounts = ownerAccounts.length > 0 ? ownerAccounts : bankAccounts;

  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    candidateAccounts.length > 0 ? candidateAccounts[0].id : ""
  );

  const [paymentType, setPaymentType] = useState<"emi" | "prepayment" | "custom">(
    isTaken ? "emi" : "custom"
  );
  const [amount, setAmount] = useState<string>(
    isTaken ? String(emi || outstanding) : String(outstanding)
  );
  const [date, setDate] = useState<string>(today());
  const [paymentMode, setPaymentMode] = useState<string>(isTaken ? "Auto-Debit (NACH)" : "UPI");
  const [reference, setReference] = useState<string>("");
  const [narration, setNarration] = useState<string>("");
  const [note, setNote] = useState<string>("");

  const numAmount = Number(amount) || 0;
  const nextOutstanding = Math.max(0, outstanding - numAmount);

  // For loan taken: calculate approximate principal vs interest breakdown for EMI
  const monthlyRate = rate / 100 / 12;
  const approxInterestPortion = isTaken && monthlyRate > 0 ? Math.round(outstanding * monthlyRate) : 0;
  const approxPrincipalPortion = isTaken ? Math.max(0, numAmount - approxInterestPortion) : numAmount;

  const handleSave = () => {
    if (numAmount <= 0) return;

    const paymentRecord = {
      id: uid(),
      date,
      amount: numAmount,
      type: paymentType,
      mode: paymentMode,
      reference,
      note,
      bankAccountId: selectedAccountId || undefined,
      principalPortion: approxPrincipalPortion,
      interestPortion: approxInterestPortion,
    };

    let updatedLoanPatch: any = {
      outstanding: nextOutstanding,
      payments: [...(loan.payments || []), paymentRecord],
    };

    if (isTaken) {
      if (nextOutstanding <= 0) {
        updatedLoanPatch.status = "closed";
        updatedLoanPatch.monthsRemaining = 0;
      } else if (paymentType === "emi" && monthsRemaining > 0) {
        updatedLoanPatch.monthsRemaining = Math.max(0, monthsRemaining - 1);
      } else if (paymentType === "prepayment") {
        // Recalculate remaining months with lower balance
        if (monthlyRate > 0 && emi > monthlyRate * nextOutstanding) {
          const newMonths = Math.ceil(-Math.log(1 - (monthlyRate * nextOutstanding) / emi) / Math.log(1 + monthlyRate));
          updatedLoanPatch.monthsRemaining = newMonths;
        }
      }
    } else {
      if (nextOutstanding <= 0) {
        updatedLoanPatch.status = "settled";
      }
    }

    let bankTxn: any = undefined;
    if (selectedAccountId) {
      bankTxn = {
        owner: loan.owner || "self",
        date,
        accountId: selectedAccountId,
        type: isTaken ? "debit" : "credit",
        amount: numAmount,
        category: isTaken ? "EMI / Loan Payment" : "Loan Recovery",
        note:
          note ||
          (isTaken
            ? `EMI payment for ${loan.lender || "Loan"}`
            : `Loan repayment from ${loan.borrower || "Borrower"}`),
        narration:
          narration.trim() ||
          (isTaken
            ? `Loan Payment (${loan.lender || "Loan"}) - Ref: ${reference || paymentMode}`
            : `Loan Recovery (${loan.borrower || "Borrower"}) - Ref: ${reference || paymentMode}`),
        referenceNumber: reference || undefined,
        linkedType: isTaken ? "loansTaken" : "loansGiven",
        linkedId: loan.id,
        linkedPrincipalAmount: approxPrincipalPortion,
      };
    }

    onSavePayment(paymentRecord, updatedLoanPatch, bankTxn);
  };

  return (
    <Modal
      title={
        isTaken
          ? `Record Payment — ${loan.lender || "Loan"}`
          : `Record Payment Received — ${loan.borrower || "Borrower"}`
      }
      onClose={onClose}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* Outstanding Context banner */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            background: "color-mix(in srgb, var(--surface-1) 60%, transparent)",
            borderRadius: 10,
            border: `1px solid var(--t-line)`,
          }}
        >
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--t-muted)" }}>
              Current Outstanding
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "var(--t-rust)", marginTop: 1 }}>
              <Money value={outstanding} variant="exact" />
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: "var(--t-muted)" }}>
              Balance After Payment
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: nextOutstanding === 0 ? "var(--t-sage)" : "var(--t-ink)",
                marginTop: 1,
              }}
            >
              <Money value={nextOutstanding} variant="exact" />
            </div>
          </div>
        </div>

        {/* Payment Type Selector for Loans Taken */}
        {isTaken && (
          <div style={{ display: "flex", gap: 6, background: "var(--surface-1)", padding: 3, borderRadius: 8 }}>
            <button
              onClick={() => {
                setPaymentType("emi");
                setAmount(String(emi || outstanding));
              }}
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 800,
                border: "none",
                cursor: "pointer",
                background: paymentType === "emi" ? "var(--surface-0)" : "transparent",
                color: paymentType === "emi" ? "var(--t-ink)" : "var(--t-muted)",
              }}
            >
              Regular Monthly EMI ({fmtINR(emi)})
            </button>
            <button
              onClick={() => setPaymentType("prepayment")}
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 800,
                border: "none",
                cursor: "pointer",
                background: paymentType === "prepayment" ? "var(--surface-0)" : "transparent",
                color: paymentType === "prepayment" ? "var(--t-ink)" : "var(--t-muted)",
              }}
            >
              Part Prepayment
            </button>
            <button
              onClick={() => {
                setPaymentType("custom");
                setAmount(String(outstanding));
              }}
              style={{
                flex: 1,
                padding: "6px 10px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 800,
                border: "none",
                cursor: "pointer",
                background: paymentType === "custom" ? "var(--surface-0)" : "transparent",
                color: paymentType === "custom" ? "var(--t-ink)" : "var(--t-muted)",
              }}
            >
              Full Foreclosure ({fmtINR(outstanding)})
            </button>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={isTaken ? "Payment Amount (₹)" : "Amount Received (₹)"}>
            <input
              type="number"
              min="0"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--t-line)",
                background: "var(--surface-0)",
                color: "var(--t-ink)",
                fontSize: 14,
                fontWeight: 800,
                outline: "none",
              }}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>

          <Field label="Payment Date">
            <input
              type="date"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--t-line)",
                background: "var(--surface-0)",
                color: "var(--t-ink)",
                fontSize: 13,
                outline: "none",
              }}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label={isTaken ? "Deduct from Bank Account" : "Deposit into Bank Account"}>
            <select
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--t-line)",
                background: "var(--surface-0)",
                color: "var(--t-ink)",
                fontSize: 13,
                outline: "none",
              }}
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
            >
              {candidateAccounts.length === 0 ? (
                <option value="">No bank accounts available</option>
              ) : (
                <>
                  {candidateAccounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bankName || acc.name || "Bank"} {acc.accountNumber ? `(..${String(acc.accountNumber).slice(-4)})` : ""} — {fmtINR(acc.balance || 0)}
                    </option>
                  ))}
                  <option value="">— Do not record in Bank Account —</option>
                </>
              )}
            </select>
            {selectedAccountId && (
              <div style={{ fontSize: 10, color: "var(--t-sage)", marginTop: 4, fontWeight: 700 }}>
                {isTaken
                  ? "✓ Automatically debits this bank account & posts to Transactions"
                  : "✓ Automatically credits this bank account & posts to Transactions"}
              </div>
            )}
          </Field>

          <Field label="Payment Mode">
            <select
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--t-line)",
                background: "var(--surface-0)",
                color: "var(--t-ink)",
                fontSize: 13,
                outline: "none",
              }}
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value)}
            >
              {isTaken ? (
                <>
                  <option>Auto-Debit (NACH)</option>
                  <option>Net Banking</option>
                  <option>UPI / QR</option>
                  <option>Debit Card</option>
                  <option>Cheque</option>
                  <option>Branch Cash</option>
                </>
              ) : (
                <>
                  <option>UPI</option>
                  <option>Bank Transfer (IMPS / NEFT)</option>
                  <option>Cash</option>
                  <option>Cheque</option>
                  <option>Other</option>
                </>
              )}
            </select>
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Reference No. / UTR (Optional)">
            <input
              placeholder="e.g. UTR19827364"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--t-line)",
                background: "var(--surface-0)",
                color: "var(--t-ink)",
                fontSize: 13,
                outline: "none",
              }}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </Field>

          <Field label="Notes / Purpose (Optional)">
            <input
              placeholder="e.g. Monthly EMI / Advance repayment"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--t-line)",
                background: "var(--surface-0)",
                color: "var(--t-ink)",
                fontSize: 13,
                outline: "none",
              }}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
        </div>

        {selectedAccountId && (
          <Field label="Narration / Description (for Bank Ledger)">
            <input
              placeholder={isTaken ? `e.g. EMI/${loan.lender || "Loan"}/NACH` : `e.g. Loan Recovery/${loan.borrower || "Borrower"}/UPI`}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--t-line)",
                background: "var(--surface-0)",
                color: "var(--t-ink)",
                fontSize: 13,
                outline: "none",
              }}
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
            />
          </Field>
        )}

        {isTaken && numAmount > 0 && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              background: "color-mix(in srgb, var(--surface-1) 50%, transparent)",
              fontSize: 11,
              color: "var(--t-muted)",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>
              Principal Portioned: <strong style={{ color: "var(--t-sage)" }}>{fmtINR(approxPrincipalPortion)}</strong>
            </span>
            {approxInterestPortion > 0 && (
              <span>
                Est. Interest: <strong style={{ color: "var(--t-rust)" }}>{fmtINR(approxInterestPortion)}</strong>
              </span>
            )}
          </div>
        )}

        <ModalActions
          onSave={handleSave}
          onClose={onClose}
          saveLabel={isTaken ? "Record EMI Payment" : "Record Receipt"}
          disabled={saving || numAmount <= 0}
          loading={saving}
        />
      </div>
    </Modal>
  );
}
