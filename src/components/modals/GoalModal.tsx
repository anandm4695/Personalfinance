// @ts-nocheck
import React, { useState } from "react";
import { THEME } from "../../utils/constants";
import { today } from "../../utils/finance";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";

export function GoalModal({ initial, onClose, onSave }: any) {
  const { goalCategories, familyProfiles } = useMasterData();
  const [clearHover, setClearHover] = useState(false);
  const [setDateHover, setSetDateHover] = useState(false);
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

  const dateOrderInvalid = f.targetDate && f.startDate && f.targetDate < f.startDate;
  const canSave =
    f.name.trim().length > 0 &&
    Number(f.targetAmount) > 0 &&
    Number(f.currentAmount || 0) >= 0 &&
    !dateOrderInvalid;

  return (
    <Modal title={initial ? "Edit Goal" : "Add Financial Goal"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select
          className="form-input"
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
          className="form-input"
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="e.g. Buy a home, Retirement corpus"
        />
      </Field>
      <div className="form-grid-2" style={{ gap: 12 }}>
        <Field label="Category">
          <select
            className="form-input"
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
            className="form-input"
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
            className="form-input"
            type="number"
            min="0"
            value={f.targetAmount}
            onChange={(e) => setF({ ...f, targetAmount: e.target.value })}
          />
        </Field>
        <Field label="Current Saved">
          <input
            className="form-input"
            type="number"
            min="0"
            value={f.currentAmount}
            onChange={(e) => setF({ ...f, currentAmount: e.target.value })}
          />
        </Field>
        <Field label="Start Date">
          <input
            className="form-input"
            type="date"
            value={f.startDate}
            onChange={(e) => setF({ ...f, startDate: e.target.value })}
          />
        </Field>
        <Field
          label="Target Date"
          error={dateOrderInvalid ? "Target date can't be before the start date" : undefined}
        >
          {f.targetDate ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                className="form-input"
                style={{ flex: 1 }}
                type="date"
                value={f.targetDate}
                onChange={(e) => setF({ ...f, targetDate: e.target.value })}
              />
              <button
                type="button"
                aria-label="Clear target date"
                onClick={() => setF({ ...f, targetDate: "" })}
                onMouseEnter={() => setClearHover(true)}
                onMouseLeave={() => setClearHover(false)}
                style={{
                  padding: "10px 12px",
                  border: `1.5px solid ${THEME.rust}`,
                  borderRadius: "var(--radius-md)",
                  background: clearHover ? THEME.rust : "transparent",
                  color: clearHover ? "#fff" : THEME.rust,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  transition: "background 0.15s ease, color 0.15s ease",
                }}
              >
                Clear
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setF({ ...f, targetDate: today() })}
              onMouseEnter={() => setSetDateHover(true)}
              onMouseLeave={() => setSetDateHover(false)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "var(--radius-md)",
                background: setDateHover
                  ? "color-mix(in srgb, var(--t-accent) 6%, transparent)"
                  : "transparent",
                border: `1.5px dashed ${setDateHover ? THEME.accent : THEME.line}`,
                color: setDateHover ? THEME.accent : THEME.muted,
                cursor: "pointer",
                textAlign: "left",
                fontSize: 13,
                fontWeight: 500,
                transition: "background 0.15s ease, border-color 0.15s ease, color 0.15s ease",
              }}
            >
              + Set a target date (optional)
            </button>
          )}
        </Field>
      </div>
      <ModalActions
        onSave={() => onSave({ ...f, name: f.name.trim() })}
        onClose={onClose}
        disabled={!canSave}
      />
    </Modal>
  );
}
