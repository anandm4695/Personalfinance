// @ts-nocheck
import React, { useState } from "react";
import { THEME } from "../../utils/constants";
import { today } from "../../utils/finance";
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

export function GoalModal({ initial, onClose, onSave }: any) {
  const { goalCategories, familyProfiles } = useMasterData();
  const [f, setF] = useState(
    initial
      ? { ...initial }
      : {
          owner: "self",
          name: "",
          category: "Wealth",
          targetAmount: "",
          currentAmount: "0",
          priority: "Medium",
          startDate: today(),
          targetDate: "",
        }
  );

  return (
    <Modal title={initial ? "Edit Goal" : "Add Financial Goal"} onClose={onClose}>
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
      <Field label="Goal Name">
        <input
          style={input}
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="e.g. Buy a home, Retirement corpus"
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Category">
          <select
            style={input}
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value })}
          >
            {goalCategories.map((c: string) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Priority">
          <select
            style={input}
            value={f.priority}
            onChange={(e) => setF({ ...f, priority: e.target.value })}
          >
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
        </Field>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        <Field label="Target Amount">
          <input
            style={input}
            type="number"
            value={f.targetAmount}
            onChange={(e) => setF({ ...f, targetAmount: e.target.value })}
          />
        </Field>
        <Field label="Current Saved">
          <input
            style={input}
            type="number"
            value={f.currentAmount}
            onChange={(e) => setF({ ...f, currentAmount: e.target.value })}
          />
        </Field>
        <Field label="Start Date">
          <input
            style={input}
            type="date"
            value={f.startDate}
            onChange={(e) => setF({ ...f, startDate: e.target.value })}
          />
        </Field>
        <Field label="Target Date">
          {f.targetDate ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                style={{ ...input, flex: 1 }}
                type="date"
                value={f.targetDate}
                onChange={(e) => setF({ ...f, targetDate: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setF({ ...f, targetDate: "" })}
                style={{
                  padding: "10px 12px",
                  border: `1.5px solid ${THEME.rust}`,
                  borderRadius: 10,
                  background: "transparent",
                  color: THEME.rust,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                Clear
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setF({ ...f, targetDate: today() })}
              style={{
                ...input,
                background: "transparent",
                border: `1.5px dashed ${THEME.line}`,
                color: THEME.muted,
                cursor: "pointer",
                textAlign: "left",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              + Set a target date (optional)
            </button>
          )}
        </Field>
      </div>
      <ModalActions onSave={() => f.name && f.targetAmount && onSave(f)} onClose={onClose} />
    </Modal>
  );
}
