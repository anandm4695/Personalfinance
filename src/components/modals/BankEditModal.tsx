// @ts-nocheck
import React, { useState } from "react";
import { THEME } from "../../utils/constants";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";

const input = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--t-paper)",
  border: `1.5px solid ${THEME.line}`,
  borderRadius: 10,
  color: THEME.ink,
  fontSize: 14,
};

export function BankEditModal({ account, onClose, onSave }: any) {
  const [f, setF] = useState({
    bankName: account?.bankName || "",
    accountNumber: account?.accountNumber || "",
    type: account?.type || "Savings",
    balance: account?.balance || "",
  });
  return (
    <Modal title="Edit Bank Account" onClose={onClose}>
      <Field label="Bank Name">
        <input style={input} value={f.bankName} onChange={(e) => setF({ ...f, bankName: e.target.value })} />
      </Field>
      <Field label="Account Number (last 4 ok)">
        <input style={input} value={f.accountNumber} onChange={(e) => setF({ ...f, accountNumber: e.target.value })} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Type">
          <select style={input} value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
            <option>Savings</option>
            <option>Current</option>
            <option>Salary</option>
            <option>Joint</option>
          </select>
        </Field>
        <Field label="Current Balance">
          <input style={input} type="number" value={f.balance} onChange={(e) => setF({ ...f, balance: e.target.value })} />
        </Field>
      </div>
      <ModalActions onSave={() => f.bankName && onSave(f)} onClose={onClose} />
    </Modal>
  );
}
