import React, { useState, useMemo } from "react";
import { THEME } from "../../utils/constants";
import { today, monthsBetween, fmtINR, fmtINRFull } from "../../utils/finance";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import {
  Palmtree,
  Home,
  GraduationCap,
  Shield,
  Car,
  Plane,
  Heart,
  TrendingUp,
  Sparkles,
  Calculator,
} from "lucide-react";

export interface Goal {
  id?: string;
  owner?: string;
  name: string;
  category: string;
  targetAmount: number | string;
  currentAmount: number | string;
  priority: string;
  startDate: string;
  targetDate?: string;
  expectedReturnRate?: number | string;
  notes?: string;
}

interface GoalModalProps {
  initial?: Goal | null;
  onClose: () => void;
  onSave: (data: Goal) => void;
  saving?: boolean;
}

const GOAL_TEMPLATES = [
  {
    name: "Retirement Freedom Corpus",
    category: "Retirement",
    priority: "High",
    yearsOut: 15,
    suggestedAmount: 25000000,
    icon: Palmtree,
  },
  {
    name: "Dream Home Down Payment",
    category: "Home",
    priority: "High",
    yearsOut: 5,
    suggestedAmount: 3000000,
    icon: Home,
  },
  {
    name: "Child Higher Education",
    category: "Education",
    priority: "High",
    yearsOut: 10,
    suggestedAmount: 5000000,
    icon: GraduationCap,
  },
  {
    name: "Emergency Reserve Fund (6M)",
    category: "Emergency Fund",
    priority: "High",
    yearsOut: 1,
    suggestedAmount: 600000,
    icon: Shield,
  },
  {
    name: "Dream Car / EV Upgrade",
    category: "Vehicle",
    priority: "Medium",
    yearsOut: 3,
    suggestedAmount: 1500000,
    icon: Car,
  },
  {
    name: "International Vacation",
    category: "Travel",
    priority: "Low",
    yearsOut: 2,
    suggestedAmount: 500000,
    icon: Plane,
  },
  {
    name: "Wedding & Celebration Fund",
    category: "Wedding",
    priority: "Medium",
    yearsOut: 4,
    suggestedAmount: 2000000,
    icon: Heart,
  },
  {
    name: "Long-Term Wealth Multiplier",
    category: "Wealth",
    priority: "High",
    yearsOut: 7,
    suggestedAmount: 10000000,
    icon: TrendingUp,
  },
];

export function GoalModal({ initial, onClose, onSave, saving = false }: GoalModalProps) {
  const { goalCategories, familyProfiles } = useMasterData();
  const [clearHover, setClearHover] = useState(false);
  const [setDateHover, setSetDateHover] = useState(false);
  const [showPresets, setShowPresets] = useState(!initial);

  const [f, setF] = useState<Goal>(
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
          expectedReturnRate: "12",
          notes: "",
        }
  );

  const dateOrderInvalid = Boolean(f.targetDate && f.startDate && f.targetDate < f.startDate);
  const canSave =
    f.name.trim().length > 0 &&
    Number(f.targetAmount) > 0 &&
    Number(f.currentAmount || 0) >= 0 &&
    !dateOrderInvalid;

  // Real-time calculation previews
  const calculations = useMemo(() => {
    const targetAmt = Number(f.targetAmount) || 0;
    const currentAmt = Number(f.currentAmount) || 0;
    const remaining = Math.max(0, targetAmt - currentAmt);
    const progress = targetAmt > 0 ? (currentAmt / targetAmt) * 100 : 0;

    let monthsLeft = 0;
    let yearsLeft = 0;
    let monthlyPlain = 0;
    let inflatedTarget6 = targetAmt;
    let sip12 = 0;

    if (f.targetDate) {
      const rawML = monthsBetween(today(), f.targetDate);
      monthsLeft = Math.max(1, rawML);
      yearsLeft = monthsLeft / 12;

      // 6% Inflation
      inflatedTarget6 = targetAmt * Math.pow(1.06, yearsLeft);
      monthlyPlain = remaining / monthsLeft;

      // SIP at 12% return compounding
      const r = 0.12 / 12;
      const n = monthsLeft;
      const fvCurrent = currentAmt * Math.pow(1 + r, n);
      const gap = Math.max(0, targetAmt - fvCurrent);
      sip12 = n > 0 && r > 0 ? (gap * r) / (Math.pow(1 + r, n) - 1) : monthlyPlain;
    }

    return {
      targetAmt,
      currentAmt,
      remaining,
      progress,
      monthsLeft,
      yearsLeft,
      monthlyPlain,
      inflatedTarget6,
      sip12,
    };
  }, [f.targetAmount, f.currentAmount, f.targetDate]);

  const applyTemplate = (tpl: typeof GOAL_TEMPLATES[0]) => {
    const todayDate = new Date();
    const targetDateObj = new Date(
      todayDate.getFullYear() + tpl.yearsOut,
      todayDate.getMonth(),
      todayDate.getDate()
    );
    const formattedTargetDate = targetDateObj.toISOString().split("T")[0];

    setF((prev) => ({
      ...prev,
      name: tpl.name,
      category: tpl.category,
      priority: tpl.priority,
      targetAmount: tpl.suggestedAmount,
      targetDate: formattedTargetDate,
    }));
    setShowPresets(false);
  };

  return (
    <Modal title={initial ? "Edit Financial Goal" : "Create Financial Goal"} onClose={onClose}>
      {/* Quick Goal Presets Bar (on new goals) */}
      {!initial && (
        <div style={{ marginBottom: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: THEME.muted,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Sparkles size={13} color={THEME.accent} /> Quick Goal Templates
            </span>
            <button
              type="button"
              onClick={() => setShowPresets((v) => !v)}
              style={{
                background: "none",
                border: "none",
                fontSize: 11,
                fontWeight: 700,
                color: THEME.accent,
                cursor: "pointer",
              }}
            >
              {showPresets ? "Hide Templates" : "Show Templates"}
            </button>
          </div>

          {showPresets && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
                gap: 8,
                padding: "10px",
                background: "var(--surface-1)",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${THEME.line}`,
              }}
            >
              {GOAL_TEMPLATES.map((tpl) => {
                const Icon = tpl.icon;
                return (
                  <button
                    key={tpl.name}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 10px",
                      borderRadius: "var(--radius-sm)",
                      border: `1px solid ${THEME.line}`,
                      background: "var(--surface-0)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                    className="card-lift"
                  >
                    <Icon size={14} color={THEME.accent} style={{ flexShrink: 0 }} />
                    <div style={{ overflow: "hidden" }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: THEME.ink,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {tpl.name}
                      </div>
                      <div style={{ fontSize: 10, color: THEME.muted }}>
                        {fmtINR(tpl.suggestedAmount)} · {tpl.yearsOut}y
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Owner & Goal Name */}
      <div className="form-grid-2" style={{ gap: 12 }}>
        <Field label="Owner / Family Profile">
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
            placeholder="e.g. Retirement Freedom, Home Down Payment"
            autoFocus={!initial}
          />
        </Field>
      </div>

      {/* Category & Priority */}
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
            <option value="High">High (Essential / Non-Negotiable)</option>
            <option value="Medium">Medium (Important Milestone)</option>
            <option value="Low">Low (Discretionary / Luxury)</option>
          </select>
        </Field>
      </div>

      {/* Amounts and Dates */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        <Field label="Target Amount (₹)">
          <input
            className="form-input"
            type="number"
            min="0"
            step="1000"
            placeholder="e.g. 2500000"
            value={f.targetAmount}
            onChange={(e) => setF({ ...f, targetAmount: e.target.value })}
          />
        </Field>
        <Field label="Current Saved / Corpus (₹)">
          <input
            className="form-input"
            type="number"
            min="0"
            step="1000"
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
              onClick={() => {
                const nextYear = new Date();
                nextYear.setFullYear(nextYear.getFullYear() + 3);
                setF({ ...f, targetDate: nextYear.toISOString().split("T")[0] });
              }}
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
              + Set Target Horizon Date
            </button>
          )}
        </Field>
      </div>

      {/* Live Financial Intelligence & SIP Preview Card */}
      {Number(f.targetAmount) > 0 && (
        <div
          style={{
            marginTop: 14,
            padding: "12px 14px",
            borderRadius: "var(--radius-lg)",
            background: "linear-gradient(135deg, color-mix(in srgb, var(--t-accent) 6%, var(--surface-1)), var(--surface-1))",
            border: `1px solid ${THEME.line}`,
            borderLeft: `3px solid ${THEME.accent}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: THEME.accent,
              marginBottom: 8,
            }}
          >
            <Calculator size={13} /> Live Goal Financial Intelligence
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 10,
              fontSize: 12,
            }}
          >
            <div>
              <div style={{ color: THEME.muted, fontSize: 10, fontWeight: 700 }}>REMAINING DEFICIT</div>
              <div style={{ fontWeight: 800, color: THEME.ink, fontSize: 13 }}>
                {fmtINRFull(calculations.remaining)}
              </div>
            </div>

            {f.targetDate && (
              <>
                <div>
                  <div style={{ color: THEME.muted, fontSize: 10, fontWeight: 700 }}>HORIZON</div>
                  <div style={{ fontWeight: 800, color: THEME.ink, fontSize: 13 }}>
                    {calculations.yearsLeft >= 1
                      ? `${calculations.yearsLeft.toFixed(1)} Years`
                      : `${calculations.monthsLeft} Months`}
                  </div>
                </div>

                <div>
                  <div style={{ color: THEME.muted, fontSize: 10, fontWeight: 700 }}>
                    FUTURE COST @ 6% INFLATION
                  </div>
                  <div style={{ fontWeight: 800, color: THEME.gold, fontSize: 13 }}>
                    {fmtINRFull(calculations.inflatedTarget6)}
                  </div>
                </div>

                <div>
                  <div style={{ color: THEME.muted, fontSize: 10, fontWeight: 700 }}>
                    EST. MONTHLY SIP @ 12%
                  </div>
                  <div style={{ fontWeight: 900, color: THEME.sage, fontSize: 13 }}>
                    {fmtINR(calculations.sip12)}/mo
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ModalActions
        onSave={() => onSave({ ...f, name: f.name.trim() })}
        onClose={onClose}
        saveLabel={initial ? "Save Changes" : "Create Financial Goal"}
        disabled={!canSave || saving}
        loading={saving}
      />
    </Modal>
  );
}
