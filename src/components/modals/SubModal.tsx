// @ts-nocheck
import React, { useState } from "react";
import { THEME } from "../../utils/constants";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
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

export function SubModal({ onClose, onSave, initialValues = null, saving = false }: any) {
  const { familyProfiles } = useMasterData();
  const [attempted, setAttempted] = useState(false);
  const [f, setF] = useState(
    initialValues
      ? {
          owner: initialValues.owner || "self",
          name: initialValues.name || "",
          category: initialValues.category || "Entertainment",
          amount: initialValues.amount || "",
          cycle: initialValues.cycle || "monthly",
          renewalDate: initialValues.renewalDate || "",
          remark: initialValues.remark || "",
          website: initialValues.website || "",
        }
      : {
          owner: "self",
          name: "",
          category: "Entertainment",
          amount: "",
          cycle: "monthly",
          renewalDate: "",
          remark: "",
          website: "",
        }
  );

  const nameError = attempted && !f.name.trim() ? "Service name is required" : undefined;
  const amountError =
    attempted && !(Number(f.amount) > 0) ? "Enter an amount greater than 0" : undefined;

  const handleSave = () => {
    if (f.name.trim() && Number(f.amount) > 0) {
      onSave(f);
    } else {
      setAttempted(true);
    }
  };

  return (
    <Modal title={initialValues ? "Edit Subscription" : "Add Subscription"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select
          style={input}
          value={f.owner || "self"}
          onChange={(e) => setF({ ...f, owner: e.target.value })}
        >
          {familyProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {formatProfileOption(p)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Service Name" error={nameError}>
        <input
          style={{ ...input, ...(nameError ? { borderColor: THEME.rust } : {}) }}
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="e.g., Netflix, Spotify"
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
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        <Field label="Amount" error={amountError}>
          <input
            style={{ ...input, ...(amountError ? { borderColor: THEME.rust } : {}) }}
            type="number"
            min="0"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
            placeholder="e.g., 649"
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
      <Field label="Website (Optional — used to load logo)">
        <input
          style={input}
          value={f.website}
          onChange={(e) => setF({ ...f, website: e.target.value })}
          placeholder="e.g., notion.so or https://notion.so"
        />
      </Field>
      <Field label="Remark (Optional)">
        <input
          style={input}
          value={f.remark}
          onChange={(e) => setF({ ...f, remark: e.target.value })}
          placeholder="e.g., Shared with family, billed to credit card"
        />
      </Field>
      <ModalActions
        onSave={handleSave}
        onClose={onClose}
        saveLabel={initialValues ? "Save Changes" : "Add Subscription"}
        disabled={saving}
        loading={saving}
      />
    </Modal>
  );
}
