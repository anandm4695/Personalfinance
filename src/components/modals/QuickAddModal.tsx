// @ts-nocheck
import React, { useState } from "react";
import { THEME } from "../../utils/constants";
import { today, autoCateg } from "../../utils/finance";
import { useMasterData } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";

const input = {
  width: "100%",
  padding: "10px 12px",
  border: `1.5px solid ${THEME.line}`,
  borderRadius: "var(--radius-md)",
  color: THEME.ink,
  fontSize: 14,
};

export function QuickAddModal({ onClose, onSave, bankAccounts }: any) {
  const { transactionCategories } = useMasterData();
  const [f, setF] = useState({
    date: today(),
    type: "debit",
    amount: "",
    category: transactionCategories[0] || "Food",
    note: "",
    referenceNumber: "",
    accountId: bankAccounts[0]?.id || "",
  });

  return (
    <Modal title="Quick Add Transaction" onClose={onClose}>
      <div className="form-grid-2">
        <Field label="Date">
          <input
            style={input}
            type="date"
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
          />
        </Field>
        <Field label="Type">
          <select
            style={input}
            value={f.type}
            onChange={(e) => setF({ ...f, type: e.target.value })}
          >
            <option value="debit">Debit (Expense)</option>
            <option value="credit">Credit (Income)</option>
          </select>
        </Field>
      </div>
      <div className="form-grid-2">
        <Field label="Amount (₹)">
          <input
            style={input}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
            placeholder="0"
            autoFocus
          />
        </Field>
        <Field label="Category">
          <select
            style={input}
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value })}
          >
            {transactionCategories.map((c: string) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Account">
        <select
          style={input}
          value={f.accountId}
          onChange={(e) => setF({ ...f, accountId: e.target.value })}
        >
          {bankAccounts.map((b: any) => (
            <option key={b.id} value={b.id}>
              {b.bankName}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Note">
        <input
          style={input}
          value={f.note}
          onChange={(e) => {
            const note = e.target.value;
            const cat = autoCateg(note);
            setF({ ...f, note, ...(cat ? { category: cat } : {}) });
          }}
          placeholder="Optional note — category auto-detected"
        />
      </Field>
      <Field label="Cheque / Reference Number">
        <input
          style={input}
          value={f.referenceNumber || ""}
          onChange={(e) => setF({ ...f, referenceNumber: e.target.value })}
          placeholder="Cheque or reference number (optional)"
        />
      </Field>
      <ModalActions
        onSave={() => f.amount && Number(f.amount) > 0 && onSave(f)}
        onClose={onClose}
        disabled={!f.amount || Number(f.amount) <= 0}
        saveLabel="Add Transaction"
      />
    </Modal>
  );
}
