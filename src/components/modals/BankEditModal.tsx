// @ts-nocheck
import React, { useState } from "react";
import { THEME } from "../../utils/constants";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";

import { useMasterData } from "../../utils/masterData";

const input = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--t-paper)",
  border: `1.5px solid ${THEME.line}`,
  borderRadius: 10,
  color: THEME.ink,
  fontSize: 14,
};

export function BankEditModal({ account, onClose, onSave, saving }: any) {
  const { bankAccountTypes } = useMasterData();
  const [f, setF] = useState({
    owner: account?.owner || "self",
    bankName: account?.bankName || "",
    accountNumber: account?.accountNumber || "",
    type: account?.type || bankAccountTypes[0] || "Savings",
    balance: account?.balance || "",
  });
  return (
    <Modal title="Edit Bank Account" onClose={onClose}>
      <Field label="Bank Name">
        <input
          style={input}
          value={f.bankName}
          onChange={(e) => setF({ ...f, bankName: e.target.value })}
          placeholder="e.g. HDFC Bank"
          autoFocus
        />
      </Field>
      <Field label="Account Number (last 4 ok)">
        <input
          style={input}
          value={f.accountNumber}
          onChange={(e) => setF({ ...f, accountNumber: e.target.value })}
          placeholder="●●●●1234"
        />
      </Field>
      <div className="form-grid-2">
        <Field label="Type">
          <select
            style={input}
            value={f.type}
            onChange={(e) => setF({ ...f, type: e.target.value })}
          >
            {bankAccountTypes.map((t: string) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Balance (auto-updated by transactions)">
          <input
            style={input}
            type="number"
            step="0.01"
            inputMode="decimal"
            value={f.balance}
            onChange={(e) => setF({ ...f, balance: e.target.value })}
            placeholder="Override if needed"
          />
        </Field>
      </div>
      <ModalActions
        onSave={() => f.bankName.trim() && onSave(f)}
        onClose={onClose}
        disabled={!f.bankName.trim() || saving}
        loading={saving}
        saveLabel="Save Changes"
      />
    </Modal>
  );
}
