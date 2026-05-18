// @ts-nocheck
import React, { useState } from "react";
import { THEME, PROFILES } from "../../utils/constants";
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

export function SubModal({ onClose, onSave, initialValues = null }: any) {
  const [f, setF] = useState(initialValues ? {
    owner: initialValues.owner || "self",
    name: initialValues.name || "",
    category: initialValues.category || "Entertainment",
    amount: initialValues.amount || "",
    cycle: initialValues.cycle || "monthly",
    renewalDate: initialValues.renewalDate || "",
    remark: initialValues.remark || "",
  } : {
    owner: "self",
    name: "",
    category: "Entertainment",
    amount: "",
    cycle: "monthly",
    renewalDate: "",
    remark: "",
  });
  return (
    <Modal title={initialValues ? "Edit Subscription" : "Add Subscription"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Service Name">
        <input
          style={input}
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
      </Field>
      <Field label="Category">
        <select
          style={input}
          value={f.category}
          onChange={(e) => setF({ ...f, category: e.target.value })}
        >
          <option>Entertainment</option>
          <option>Productivity</option>
          <option>Storage/Cloud</option>
          <option>News/Media</option>
          <option>Fitness</option>
          <option>Utilities</option>
          <option>Other</option>
        </select>
      </Field>
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}
      >
        <Field label="Amount">
          <input
            style={input}
            type="number"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
          />
        </Field>
        <Field label="Cycle">
          <select
            style={input}
            value={f.cycle}
            onChange={(e) => setF({ ...f, cycle: e.target.value })}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="yearly">Yearly</option>
          </select>
        </Field>
        <Field label="Next Renewal">
          <input
            style={input}
            type="date"
            value={f.renewalDate}
            onChange={(e) => setF({ ...f, renewalDate: e.target.value })}
          />
        </Field>
      </div>
      <Field label="Remark (Optional)">
        <input
          style={input}
          value={f.remark}
          onChange={(e) => setF({ ...f, remark: e.target.value })}
          placeholder="e.g., Shared with family, billed to credit card"
        />
      </Field>
      <ModalActions
        onSave={() => f.name && f.amount && onSave(f)}
        onClose={onClose}
      />
    </Modal>
  );
}
