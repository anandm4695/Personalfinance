/* eslint-disable */
import React, { useState } from "react";
import {
  User,
  Calendar,
  IndianRupee,
  Percent,
  Clock,
  Phone,
  Sparkles,
  Shield,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { today, fmtINR } from "../../utils/finance";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Money } from "../ui/Money";

interface LoanGivenModalProps {
  initial?: any;
  bankAccounts?: any[];
  onClose: () => void;
  onSave: (data: any, bankTxn?: any) => Promise<void> | void;
  saving?: boolean;
}

export function LoanGivenModal({
  initial = null,
  bankAccounts = [],
  onClose,
  onSave,
  saving,
}: LoanGivenModalProps) {
  const { familyProfiles } = useMasterData();

  const [f, setF] = useState(
    initial || {
      borrower: "",
      phone: "",
      principal: "",
      outstanding: "",
      rate: "0",
      isInterestFree: true,
      date: today(),
      dueDate: "",
      status: "active",
      security: "",
      note: "",
      owner: "self",
    }
  );

  const [selectedBankId, setSelectedBankId] = useState<string>("");

  const setDuePreset = (monthsToAdd: number) => {
    const base = f.date ? new Date(f.date + "T00:00:00") : new Date();
    base.setMonth(base.getMonth() + monthsToAdd);
    const yyyy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, "0");
    const dd = String(base.getDate()).padStart(2, "0");
    setF((prev: any) => ({ ...prev, dueDate: `${yyyy}-${mm}-${dd}` }));
  };

  const principalNum = Number(f.principal) || 0;
  const rateNum = Number(f.rate) || 0;

  const handleSave = () => {
    if (!f.borrower?.trim() || !(Number(f.principal) > 0)) {
      return;
    }

    const outstanding = f.outstanding !== "" ? f.outstanding : f.principal;
    const loanData = {
      ...f,
      principal: Number(f.principal) || 0,
      outstanding: Math.max(0, Number(outstanding) || 0),
      rate: f.isInterestFree ? 0 : Number(f.rate) || 0,
    };

    let bankTxn: any = null;
    if (!initial && selectedBankId) {
      const selectedBank = bankAccounts.find((b: any) => b.id === selectedBankId);
      bankTxn = {
        id: `txn-${Date.now()}`,
        date: f.date || today(),
        amount: principalNum,
        type: "debit",
        category: "Loan Given",
        description: `Personal loan disbursed to ${f.borrower}${f.note ? ` (${f.note})` : ""}`,
        accountId: selectedBankId,
        bankAccountId: selectedBankId,
        bankName: selectedBank?.bankName || "Bank",
        mode: "Bank Transfer",
        owner: f.owner || "self",
        linkedType: "loansGiven",
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
    <Modal title={initial ? "Edit Loan Given" : "Record New Loan Given"} onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
          <Field label="Owner / Lender Profile">
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

          <Field label="Status">
            <select
              style={inputStyle}
              value={f.status || "active"}
              onChange={(e) => setF({ ...f, status: e.target.value })}
            >
              <option value="active">Active (Pending Recovery)</option>
              <option value="settled">Settled / Fully Recovered</option>
            </select>
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 12 }}>
          <Field label="Borrower Full Name">
            <input
              style={inputStyle}
              placeholder="e.g. Rahul Sharma, Amit Verma"
              value={f.borrower}
              onChange={(e) => setF({ ...f, borrower: e.target.value })}
            />
          </Field>

          <Field label="Phone / WhatsApp (Optional)">
            <input
              style={inputStyle}
              placeholder="e.g. 9876543210"
              value={f.phone || ""}
              onChange={(e) => setF({ ...f, phone: e.target.value })}
            />
          </Field>
        </div>

        {/* Financial Inputs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Principal Lent (₹)">
            <input
              style={inputStyle}
              type="number"
              min="0"
              placeholder="e.g. 100000"
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
              placeholder={f.principal || "0.00"}
              value={f.outstanding}
              onChange={(e) => setF({ ...f, outstanding: e.target.value })}
            />
          </Field>
        </div>

        {/* Interest Structure */}
        <div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t-muted)", textTransform: "uppercase" }}>
              Interest Terms
            </label>
            <div style={{ display: "flex", gap: 6, background: "var(--surface-1)", padding: 2, borderRadius: 6 }}>
              <button
                type="button"
                onClick={() => setF({ ...f, isInterestFree: true, rate: "0" })}
                style={{
                  padding: "3px 10px",
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  background: f.isInterestFree ? "var(--surface-0)" : "transparent",
                  color: f.isInterestFree ? "var(--t-ink)" : "var(--t-muted)",
                }}
              >
                0% Friendly (No Interest)
              </button>
              <button
                type="button"
                onClick={() => setF({ ...f, isInterestFree: false, rate: f.rate === "0" ? "12" : f.rate })}
                style={{
                  padding: "3px 10px",
                  borderRadius: 5,
                  fontSize: 11,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  background: !f.isInterestFree ? "var(--surface-0)" : "transparent",
                  color: !f.isInterestFree ? "var(--t-ink)" : "var(--t-muted)",
                }}
              >
                Interest Bearing
              </button>
            </div>
          </div>

          {!f.isInterestFree && (
            <Field label="Annual Interest Rate (% p.a. Simple)">
              <input
                style={inputStyle}
                type="number"
                min="0"
                step="0.1"
                placeholder="e.g. 12"
                value={f.rate}
                onChange={(e) => setF({ ...f, rate: e.target.value })}
              />
            </Field>
          )}
        </div>

        {/* Dates */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Given On Date">
            <input
              style={inputStyle}
              type="date"
              value={f.date}
              onChange={(e) => setF({ ...f, date: e.target.value })}
            />
          </Field>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: "var(--t-muted)", textTransform: "uppercase" }}>
                Agreed Due Date
              </label>
            </div>
            <input
              style={inputStyle}
              type="date"
              value={f.dueDate || ""}
              onChange={(e) => setF({ ...f, dueDate: e.target.value })}
            />
          </div>
        </div>

        {/* Due Date Quick Presets */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: -6 }}>
          <span style={{ fontSize: 10, color: "var(--t-muted)", alignSelf: "center", fontWeight: 700 }}>Quick Due:</span>
          {[
            { label: "+3 Months", months: 3 },
            { label: "+6 Months", months: 6 },
            { label: "+1 Year", months: 12 },
            { label: "+2 Years", months: 24 },
          ].map(({ label, months }) => (
            <button
              key={label}
              type="button"
              onClick={() => setDuePreset(months)}
              style={{
                padding: "2px 8px",
                borderRadius: 5,
                fontSize: 10,
                fontWeight: 700,
                border: "1px solid var(--t-line)",
                background: "var(--surface-1)",
                color: "var(--t-ink)",
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <Field label="Collateral / Security / Agreement (Optional)">
          <input
            style={inputStyle}
            placeholder="e.g. Cheque held, Promissory Note, Gold security"
            value={f.security || ""}
            onChange={(e) => setF({ ...f, security: e.target.value })}
          />
        </Field>

        <Field label="Notes / Purpose (Optional)">
          <input
            style={inputStyle}
            placeholder="e.g. Medical emergency / Business bridge loan"
            value={f.note || ""}
            onChange={(e) => setF({ ...f, note: e.target.value })}
          />
        </Field>

        {!initial && bankAccounts.length > 0 && (
          <Field label="Disbursed From Bank Account (Optional)">
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
                ✓ Will automatically debit {principalNum > 0 ? `₹${principalNum.toLocaleString("en-IN")}` : "principal"} from this bank account in Banks & Transactions
              </div>
            )}
          </Field>
        )}

        <ModalActions
          onSave={handleSave}
          onClose={onClose}
          saveLabel={initial ? "Save Changes" : "Record Loan Given"}
          disabled={saving || !f.borrower?.trim() || !(Number(f.principal) > 0)}
          loading={saving}
        />
      </div>
    </Modal>
  );
}
