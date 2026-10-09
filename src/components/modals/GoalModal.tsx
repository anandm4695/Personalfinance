import { useState, useMemo, useEffect } from "react";
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
  Repeat,
  Target,
  Calendar,
  CheckCircle2,
  Plus,
  Trash2,
  ArrowUpRight,
  Sliders,
} from "lucide-react";
import type { GoalDisbursement, GoalInstallmentScheduleItem } from "../../types/finance";

export interface Goal {
  id?: string;
  owner?: string;
  name: string;
  category: string;
  goalType?: "target" | "recurring";
  recurringFrequency?: "yearly" | "half_yearly" | "quarterly" | "monthly";
  installmentsCount?: number | string;
  amountPerInstallment?: number | string;
  installmentsPaid?: number | string;
  nextDueDate?: string;
  disbursements?: GoalDisbursement[];
  schedule?: GoalInstallmentScheduleItem[];
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
    name: "Child School Annual Fees (5 Years)",
    category: "Education",
    priority: "High",
    goalType: "recurring" as const,
    recurringFrequency: "yearly" as const,
    installmentsCount: 5,
    amountPerInstallment: 120000,
    suggestedAmount: 600000,
    yearsOut: 5,
    icon: GraduationCap,
    desc: "Yearly school fee payout over 5 academic years",
  },
  {
    name: "College Tuition Yearly Fees (4 Years)",
    category: "Education",
    priority: "High",
    goalType: "recurring" as const,
    recurringFrequency: "yearly" as const,
    installmentsCount: 4,
    amountPerInstallment: 250000,
    suggestedAmount: 1000000,
    yearsOut: 4,
    icon: GraduationCap,
    desc: "4-year undergraduate/postgraduate annual tuition",
  },
  {
    name: "Annual Insurance Premium Pool (5 Years)",
    category: "Emergency Fund",
    priority: "High",
    goalType: "recurring" as const,
    recurringFrequency: "yearly" as const,
    installmentsCount: 5,
    amountPerInstallment: 50000,
    suggestedAmount: 250000,
    yearsOut: 5,
    icon: Shield,
    desc: "Health & term life annual premiums bucket",
  },
  {
    name: "Annual Family Vacation (3 Years)",
    category: "Travel",
    priority: "Low",
    goalType: "recurring" as const,
    recurringFrequency: "yearly" as const,
    installmentsCount: 3,
    amountPerInstallment: 150000,
    suggestedAmount: 450000,
    yearsOut: 3,
    icon: Plane,
    desc: "Annual holiday travel fund for 3 years",
  },
  {
    name: "Retirement Freedom Corpus",
    category: "Retirement",
    priority: "High",
    goalType: "target" as const,
    yearsOut: 15,
    suggestedAmount: 25000000,
    icon: Palmtree,
    desc: "Lump-sum retirement nest egg milestone",
  },
  {
    name: "Dream Home Down Payment",
    category: "Home",
    priority: "High",
    goalType: "target" as const,
    yearsOut: 5,
    suggestedAmount: 3000000,
    icon: Home,
    desc: "One-time property down payment goal",
  },
  {
    name: "Emergency Reserve Fund (6M)",
    category: "Emergency Fund",
    priority: "High",
    goalType: "target" as const,
    yearsOut: 1,
    suggestedAmount: 600000,
    icon: Shield,
    desc: "6 months living expenses safety net",
  },
  {
    name: "Dream Car / EV Upgrade",
    category: "Vehicle",
    priority: "Medium",
    goalType: "target" as const,
    yearsOut: 3,
    suggestedAmount: 1500000,
    icon: Car,
    desc: "Vehicle purchase or down payment fund",
  },
  {
    name: "Wedding & Celebration Fund",
    category: "Wedding",
    priority: "Medium",
    goalType: "target" as const,
    yearsOut: 4,
    suggestedAmount: 2000000,
    icon: Heart,
    desc: "Marriage and milestone celebration fund",
  },
  {
    name: "Long-Term Wealth Multiplier",
    category: "Wealth",
    priority: "High",
    goalType: "target" as const,
    yearsOut: 7,
    suggestedAmount: 10000000,
    icon: TrendingUp,
    desc: "Strategic compounding equity wealth target",
  },
];

export function GoalModal({ initial, onClose, onSave, saving = false }: GoalModalProps) {
  const { goalCategories, familyProfiles } = useMasterData();
  const [clearHover, setClearHover] = useState(false);
  const [setDateHover, setSetDateHover] = useState(false);
  const [showPresets, setShowPresets] = useState(!initial);

  const [scheduleMode, setScheduleMode] = useState<"equal" | "variable">(() => {
    return initial?.schedule && initial.schedule.length > 0 ? "variable" : "equal";
  });
  const [escalationRate, setEscalationRate] = useState("8");

  const [f, setF] = useState<Goal>(() => {
    if (initial) {
      const schedule = initial.schedule || [];
      return {
        ...initial,
        goalType: initial.goalType || "target",
        recurringFrequency: initial.recurringFrequency || "yearly",
        installmentsCount: initial.installmentsCount ?? (schedule.length > 0 ? schedule.length : initial.goalType === "recurring" ? 4 : ""),
        amountPerInstallment: initial.amountPerInstallment ?? (
          initial.goalType === "recurring" && initial.targetAmount && initial.installmentsCount
            ? Math.round(Number(initial.targetAmount) / Number(initial.installmentsCount))
            : ""
        ),
        installmentsPaid: initial.installmentsPaid ?? 0,
        nextDueDate: initial.nextDueDate || initial.targetDate || "",
        disbursements: initial.disbursements || [],
        schedule: schedule,
      };
    }
    return {
      owner: "self",
      name: "",
      category: "Wealth",
      goalType: "target",
      recurringFrequency: "yearly",
      installmentsCount: "4",
      amountPerInstallment: "",
      installmentsPaid: "0",
      nextDueDate: "",
      disbursements: [],
      schedule: [],
      targetAmount: "",
      currentAmount: "0",
      priority: "Medium",
      startDate: today(),
      targetDate: "",
      expectedReturnRate: "12",
      notes: "",
    };
  });

  const isRecurring = f.goalType === "recurring";

  // Helper to generate default schedule
  const generateInitialSchedule = (count: number, baseAmt: number, startDateStr: string) => {
    const startYr = new Date(startDateStr || today()).getFullYear();
    const items: GoalInstallmentScheduleItem[] = [];
    for (let i = 1; i <= count; i++) {
      const dueDate = new Date(startDateStr || today());
      dueDate.setFullYear(startYr + i);
      items.push({
        installmentNumber: i,
        label: `Year ${i} (${startYr + i})`,
        dueDate: dueDate.toISOString().split("T")[0],
        amount: baseAmt > 0 ? baseAmt : 100000,
        isPaid: i <= (Number(f.installmentsPaid) || 0),
      });
    }
    return items;
  };

  // Switch to variable schedule mode
  const enableVariableSchedule = () => {
    const count = Number(f.installmentsCount) || 4;
    const baseAmt = Number(f.amountPerInstallment) || (Number(f.targetAmount) ? Math.round(Number(f.targetAmount) / count) : 100000);
    const existing = f.schedule && f.schedule.length > 0 ? f.schedule : generateInitialSchedule(count, baseAmt, f.startDate);
    const total = existing.reduce((s, item) => s + (Number(item.amount) || 0), 0);
    setF((prev) => ({
      ...prev,
      schedule: existing,
      installmentsCount: existing.length,
      targetAmount: total > 0 ? total : prev.targetAmount,
    }));
    setScheduleMode("variable");
  };

  // Switch to equal schedule mode
  const enableEqualSchedule = () => {
    const count = Number(f.installmentsCount) || (f.schedule?.length || 4);
    const total = Number(f.targetAmount) || 0;
    const perInst = count > 0 && total > 0 ? Math.round(total / count) : (Number(f.amountPerInstallment) || 100000);
    setF((prev) => ({
      ...prev,
      schedule: undefined,
      installmentsCount: count,
      amountPerInstallment: perInst,
      targetAmount: perInst * count,
    }));
    setScheduleMode("equal");
  };

  // Apply auto escalation rate across the schedule
  const applyAutoEscalation = () => {
    if (!f.schedule || f.schedule.length === 0) return;
    const rate = Number(escalationRate) || 8;
    const base = Number(f.schedule[0]?.amount) || 100000;
    const updated = f.schedule.map((item, idx) => {
      const inflated = Math.round(base * Math.pow(1 + rate / 100, idx));
      return {
        ...item,
        amount: inflated,
      };
    });
    const total = updated.reduce((s, item) => s + Number(item.amount || 0), 0);
    setF((prev) => ({
      ...prev,
      schedule: updated,
      targetAmount: total,
    }));
  };

  // Update specific item in custom schedule
  const updateScheduleItem = (idx: number, updates: Partial<GoalInstallmentScheduleItem>) => {
    if (!f.schedule) return;
    const updated = [...f.schedule];
    updated[idx] = { ...updated[idx], ...updates };
    const total = updated.reduce((s, item) => s + (Number(item.amount) || 0), 0);
    setF((prev) => ({
      ...prev,
      schedule: updated,
      targetAmount: total,
    }));
  };

  // Add an installment year to schedule
  const addScheduleYear = () => {
    const existing = f.schedule || [];
    const nextNum = existing.length + 1;
    const lastItem = existing[existing.length - 1];
    let nextDateStr = "";
    if (lastItem?.dueDate) {
      const d = new Date(lastItem.dueDate);
      d.setFullYear(d.getFullYear() + 1);
      nextDateStr = d.toISOString().split("T")[0];
    }
    const lastAmt = Number(lastItem?.amount) || 100000;
    const newItem: GoalInstallmentScheduleItem = {
      installmentNumber: nextNum,
      label: `Year ${nextNum}`,
      dueDate: nextDateStr,
      amount: lastAmt,
      isPaid: false,
    };
    const updated = [...existing, newItem];
    const total = updated.reduce((s, item) => s + (Number(item.amount) || 0), 0);
    setF((prev) => ({
      ...prev,
      schedule: updated,
      installmentsCount: updated.length,
      targetAmount: total,
    }));
  };

  // Remove last installment year from schedule
  const removeScheduleYear = (idx: number) => {
    if (!f.schedule || f.schedule.length <= 1) return;
    const updated = f.schedule.filter((_, i) => i !== idx).map((item, i) => ({
      ...item,
      installmentNumber: i + 1,
    }));
    const total = updated.reduce((s, item) => s + (Number(item.amount) || 0), 0);
    setF((prev) => ({
      ...prev,
      schedule: updated,
      installmentsCount: updated.length,
      targetAmount: total,
    }));
  };

  // Equal mode handlers
  const handleAmountPerInstallmentChange = (val: string) => {
    const amt = Number(val) || 0;
    const count = Number(f.installmentsCount) || 1;
    setF((prev) => ({
      ...prev,
      amountPerInstallment: val,
      targetAmount: amt > 0 && count > 0 ? amt * count : prev.targetAmount,
    }));
  };

  const handleInstallmentsCountChange = (val: string) => {
    const count = Number(val) || 1;
    const amt = Number(f.amountPerInstallment) || 0;
    setF((prev) => ({
      ...prev,
      installmentsCount: val,
      targetAmount: amt > 0 && count > 0 ? amt * count : prev.targetAmount,
    }));
  };

  const handleTargetAmountChange = (val: string) => {
    const total = Number(val) || 0;
    const count = Number(f.installmentsCount) || 1;
    setF((prev) => ({
      ...prev,
      targetAmount: val,
      amountPerInstallment: isRecurring && scheduleMode === "equal" && count > 0 && total > 0 ? Math.round(total / count) : prev.amountPerInstallment,
    }));
  };

  const dateOrderInvalid = Boolean(f.targetDate && f.startDate && f.targetDate < f.startDate);
  const nextDateOrderInvalid = Boolean(isRecurring && f.nextDueDate && f.startDate && f.nextDueDate < f.startDate);

  const canSave =
    f.name.trim().length > 0 &&
    Number(f.targetAmount) > 0 &&
    Number(f.currentAmount || 0) >= 0 &&
    !dateOrderInvalid &&
    !nextDateOrderInvalid;

  // Real-time calculation previews
  const calculations = useMemo(() => {
    const targetAmt = Number(f.targetAmount) || 0;
    const currentAmt = Number(f.currentAmount) || 0;

    if (isRecurring) {
      const hasCustomSchedule = f.schedule && f.schedule.length > 0;
      const totalCount = hasCustomSchedule ? f.schedule!.length : (Number(f.installmentsCount) || 1);
      const paidCount = Number(f.installmentsPaid) || (f.disbursements?.length || 0);

      // Next unpaid installment determination
      let nextInstAmt = Number(f.amountPerInstallment) || (totalCount > 0 ? targetAmt / totalCount : targetAmt);
      let nextDue = f.nextDueDate || f.targetDate || "";

      if (hasCustomSchedule) {
        const nextScheduleItem = f.schedule![paidCount] || f.schedule![f.schedule!.length - 1];
        if (nextScheduleItem) {
          nextInstAmt = Number(nextScheduleItem.amount) || nextInstAmt;
          if (nextScheduleItem.dueDate) nextDue = nextScheduleItem.dueDate;
        }
      }

      const totalPaidOut = f.disbursements && f.disbursements.length > 0
        ? f.disbursements.reduce((sum, d) => sum + Number(d.amount || 0), 0)
        : hasCustomSchedule
          ? f.schedule!.slice(0, paidCount).reduce((sum, item) => sum + Number(item.amount || 0), 0)
          : paidCount * nextInstAmt;

      const totalRealized = totalPaidOut + currentAmt;
      const overallProgress = targetAmt > 0 ? Math.min(100, (totalRealized / targetAmt) * 100) : 0;
      const remainingInstallments = Math.max(0, totalCount - paidCount);
      const isComplete = paidCount >= totalCount || (targetAmt > 0 && totalPaidOut >= targetAmt);

      let monthsToNext = 12;
      if (nextDue) {
        const rawM = monthsBetween(today(), nextDue);
        monthsToNext = Math.max(0, rawM);
      }
      const effMonths = monthsToNext > 0 ? monthsToNext : 1;
      const nextGap = Math.max(0, nextInstAmt - currentAmt);
      const nextProgress = nextInstAmt > 0 ? Math.min(100, (currentAmt / nextInstAmt) * 100) : 0;
      const monthlyForNext = isComplete ? 0 : nextGap / effMonths;

      return {
        isRecurring: true,
        hasCustomSchedule,
        targetAmt,
        currentAmt,
        perInstallment: nextInstAmt,
        totalCount,
        paidCount,
        remainingInstallments,
        totalPaidOut,
        totalRealized,
        overallProgress,
        isComplete,
        nextDue,
        monthsToNext,
        nextGap,
        nextProgress,
        monthlyForNext,
      };
    }

    // Standard Lump-Sum Goal calculations
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
      isRecurring: false,
      hasCustomSchedule: false,
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
  }, [f.targetAmount, f.currentAmount, f.targetDate, f.goalType, f.installmentsCount, f.amountPerInstallment, f.installmentsPaid, f.nextDueDate, f.disbursements, f.schedule, isRecurring]);

  const applyTemplate = (tpl: typeof GOAL_TEMPLATES[0]) => {
    const todayDate = new Date();
    const targetDateObj = new Date(
      todayDate.getFullYear() + tpl.yearsOut,
      todayDate.getMonth(),
      todayDate.getDate()
    );
    const formattedTargetDate = targetDateObj.toISOString().split("T")[0];

    const nextDueDateObj = new Date(
      todayDate.getFullYear() + 1,
      todayDate.getMonth(),
      todayDate.getDate()
    );
    const formattedNextDueDate = nextDueDateObj.toISOString().split("T")[0];

    setF((prev) => ({
      ...prev,
      name: tpl.name,
      category: tpl.category,
      priority: tpl.priority,
      goalType: tpl.goalType || "target",
      recurringFrequency: (tpl as any).recurringFrequency || "yearly",
      installmentsCount: (tpl as any).installmentsCount || (tpl.goalType === "recurring" ? tpl.yearsOut : ""),
      amountPerInstallment: (tpl as any).amountPerInstallment || "",
      targetAmount: tpl.suggestedAmount,
      targetDate: formattedTargetDate,
      nextDueDate: tpl.goalType === "recurring" ? formattedNextDueDate : "",
      schedule: undefined,
    }));
    setScheduleMode("equal");
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
                gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
                gap: 8,
                padding: "10px",
                background: "var(--surface-1)",
                borderRadius: "var(--radius-md)",
                border: `1px solid ${THEME.line}`,
              }}
            >
              {GOAL_TEMPLATES.map((tpl) => {
                const Icon = tpl.icon;
                const isRec = tpl.goalType === "recurring";
                return (
                  <button
                    key={tpl.name}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: "var(--radius-sm)",
                      border: `1px solid ${THEME.line}`,
                      background: "var(--surface-0)",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.15s ease",
                    }}
                    className="card-lift"
                  >
                    <Icon size={15} color={isRec ? THEME.sage : THEME.accent} style={{ flexShrink: 0, marginTop: 2 }} />
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
                      <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                        {fmtINR(tpl.suggestedAmount)} · {isRec ? `${(tpl as any).installmentsCount} Annual Payouts` : `${tpl.yearsOut}y Horizon`}
                      </div>
                      <div style={{ fontSize: 9, color: isRec ? THEME.sage : THEME.accent, fontWeight: 700, marginTop: 2 }}>
                        {isRec ? "🔄 Recurring Annual Cash Flow" : "🎯 Lump-Sum Milestone"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Goal Structure Selector: Lump-Sum vs Multi-Year Recurring */}
      <div style={{ marginBottom: 16 }}>
        <label
          style={{
            fontSize: 11,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: THEME.muted,
            display: "block",
            marginBottom: 6,
          }}
        >
          Goal Cash-Flow Structure
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            type="button"
            onClick={() => setF((prev) => ({ ...prev, goalType: "target" }))}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              border: `1.5px solid ${!isRecurring ? THEME.accent : THEME.line}`,
              background: !isRecurring
                ? `color-mix(in srgb, ${THEME.accent} 10%, var(--surface-0))`
                : "var(--surface-0)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <Target size={16} color={!isRecurring ? THEME.accent : THEME.muted} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: !isRecurring ? THEME.accent : THEME.ink }}>
                One-Time Lump Sum
              </div>
              <div style={{ fontSize: 10, color: THEME.muted }}>
                Retirement corpus, home down payment, vehicle purchase
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              const count = Number(f.installmentsCount) || 4;
              const total = Number(f.targetAmount) || 0;
              const perInst = total > 0 ? Math.round(total / count) : 100000;
              const nextYr = new Date();
              nextYr.setFullYear(nextYr.getFullYear() + 1);
              setF((prev) => ({
                ...prev,
                goalType: "recurring",
                recurringFrequency: "yearly",
                installmentsCount: count,
                amountPerInstallment: perInst,
                targetAmount: total > 0 ? total : perInst * count,
                nextDueDate: prev.nextDueDate || nextYr.toISOString().split("T")[0],
              }));
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 14px",
              borderRadius: "var(--radius-md)",
              border: `1.5px solid ${isRecurring ? THEME.sage : THEME.line}`,
              background: isRecurring
                ? `color-mix(in srgb, ${THEME.sage} 10%, var(--surface-0))`
                : "var(--surface-0)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <Repeat size={16} color={isRecurring ? THEME.sage : THEME.muted} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: isRecurring ? THEME.sage : THEME.ink }}>
                Multi-Year / Periodic Cash Flow
              </div>
              <div style={{ fontSize: 10, color: THEME.muted }}>
                School / college annual fees, yearly insurance premiums
              </div>
            </div>
          </button>
        </div>
      </div>

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
            placeholder={isRecurring ? "e.g. School Annual Fees (Grade 1-5)" : "e.g. Retirement Freedom, Home Down Payment"}
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

      {/* RECURRING MULTI-YEAR SPECIFIC CONFIGURATION */}
      {isRecurring && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: "var(--radius-md)",
            background: "var(--surface-1)",
            border: `1px solid ${THEME.line}`,
            borderLeft: `4px solid ${THEME.sage}`,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
              flexWrap: "wrap",
              gap: 8,
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
                color: THEME.sage,
              }}
            >
              <Repeat size={13} /> Recurring Schedule & Yearly Amounts
            </div>

            {/* Schedule Mode Switcher: Equal vs Custom Year-by-Year */}
            <div style={{ display: "flex", gap: 4, background: "var(--surface-0)", padding: 2, borderRadius: 6, border: `1px solid ${THEME.line}` }}>
              <button
                type="button"
                onClick={enableEqualSchedule}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 4,
                  border: "none",
                  background: scheduleMode === "equal" ? THEME.sage : "transparent",
                  color: scheduleMode === "equal" ? "#fff" : THEME.muted,
                  cursor: "pointer",
                }}
              >
                Equal Yearly
              </button>
              <button
                type="button"
                onClick={enableVariableSchedule}
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 4,
                  border: "none",
                  background: scheduleMode === "variable" ? THEME.sage : "transparent",
                  color: scheduleMode === "variable" ? "#fff" : THEME.muted,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <Sliders size={11} /> Different Amount / Year
              </button>
            </div>
          </div>

          {scheduleMode === "equal" ? (
            /* EQUAL SCHEDULE INPUTS */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                gap: 12,
              }}
            >
              <Field label="Payout Frequency">
                <select
                  className="form-input"
                  value={f.recurringFrequency || "yearly"}
                  onChange={(e) => setF({ ...f, recurringFrequency: e.target.value as any })}
                >
                  <option value="yearly">Yearly / Annual (e.g. School Fee)</option>
                  <option value="half_yearly">Half-Yearly (Semi-Annual)</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </Field>

              <Field label="Total Years / Installments">
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  max="30"
                  value={f.installmentsCount || ""}
                  onChange={(e) => handleInstallmentsCountChange(e.target.value)}
                  placeholder="e.g. 4 or 5"
                />
              </Field>

              <Field label="Amount Per Year / Payout (₹)">
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="1000"
                  value={f.amountPerInstallment || ""}
                  onChange={(e) => handleAmountPerInstallmentChange(e.target.value)}
                  placeholder="e.g. 100000"
                />
              </Field>

              <Field label="Next Payout Due Date">
                <input
                  className="form-input"
                  type="date"
                  value={f.nextDueDate || ""}
                  onChange={(e) => setF({ ...f, nextDueDate: e.target.value })}
                />
              </Field>

              <Field label="Installments Already Paid">
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  max={Number(f.installmentsCount) || 30}
                  value={f.installmentsPaid ?? 0}
                  onChange={(e) => setF({ ...f, installmentsPaid: Number(e.target.value) || 0 })}
                  placeholder="0"
                />
              </Field>
            </div>
          ) : (
            /* CUSTOM / VARIABLE YEAR-BY-YEAR SCHEDULE EDITOR */
            <div>
              {/* Quick Auto-Escalation Bar */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                  padding: "8px 10px",
                  background: "var(--surface-0)",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${THEME.line}`,
                  marginBottom: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: THEME.muted }}>
                  <ArrowUpRight size={13} color={THEME.accent} />
                  <span>Annual Fee Escalation Hike:</span>
                  <input
                    type="number"
                    min="1"
                    max="25"
                    value={escalationRate}
                    onChange={(e) => setEscalationRate(e.target.value)}
                    style={{
                      width: 44,
                      padding: "2px 4px",
                      borderRadius: 4,
                      border: `1px solid ${THEME.line}`,
                      fontSize: 11,
                      textAlign: "center",
                      background: "var(--surface-1)",
                      color: THEME.ink,
                    }}
                  />
                  <span>% / yr</span>
                  <button
                    type="button"
                    onClick={applyAutoEscalation}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 4,
                      border: `1px solid ${THEME.accent}`,
                      background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                      color: THEME.accent,
                      cursor: "pointer",
                    }}
                  >
                    Apply Hike from Yr 1
                  </button>
                </div>

                <button
                  type="button"
                  onClick={addScheduleYear}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 4,
                    border: `1px solid ${THEME.sage}`,
                    background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                    color: THEME.sage,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <Plus size={12} /> Add Year { (f.schedule?.length || 0) + 1 }
                </button>
              </div>

              {/* Year-by-Year Table */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(f.schedule || []).map((item, idx) => (
                  <div
                    key={item.installmentNumber}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1.2fr 1.2fr 40px",
                      gap: 8,
                      alignItems: "center",
                      padding: "6px 8px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--surface-0)",
                      border: `1px solid ${THEME.line}`,
                    }}
                  >
                    <div>
                      <input
                        className="form-input"
                        style={{ padding: "4px 8px", fontSize: 11, fontWeight: 700 }}
                        value={item.label || `Year ${item.installmentNumber}`}
                        onChange={(e) => updateScheduleItem(idx, { label: e.target.value })}
                        placeholder="Year Label"
                      />
                    </div>
                    <div>
                      <input
                        className="form-input"
                        type="date"
                        style={{ padding: "4px 8px", fontSize: 11 }}
                        value={item.dueDate || ""}
                        onChange={(e) => updateScheduleItem(idx, { dueDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        step="1000"
                        style={{ padding: "4px 8px", fontSize: 11, fontWeight: 700 }}
                        value={item.amount}
                        onChange={(e) => updateScheduleItem(idx, { amount: Number(e.target.value) || 0 })}
                        placeholder="₹ Amount"
                      />
                    </div>
                    <div style={{ textAlign: "center" }}>
                      {(f.schedule?.length || 0) > 1 && (
                        <button
                          type="button"
                          onClick={() => removeScheduleYear(idx)}
                          style={{
                            background: "none",
                            border: "none",
                            color: THEME.rust,
                            cursor: "pointer",
                            padding: 4,
                          }}
                          title="Remove this year"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Amounts and Dates */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        <Field label={isRecurring ? "Total Multi-Year Commitment (₹)" : "Target Amount (₹)"}>
          <input
            className="form-input"
            type="number"
            min="0"
            step="1000"
            placeholder="e.g. 2500000"
            value={f.targetAmount}
            onChange={(e) => handleTargetAmountChange(e.target.value)}
            readOnly={isRecurring && scheduleMode === "variable"}
            style={isRecurring && scheduleMode === "variable" ? { background: "var(--surface-1)" } : {}}
          />
        </Field>
        <Field label={isRecurring ? "Current Pool Ready for Next Payout (₹)" : "Current Saved / Corpus (₹)"}>
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
          label={isRecurring ? "Final Horizon / End Date" : "Target Date"}
          error={dateOrderInvalid ? "Target date can't be before start date" : undefined}
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
                const count = Number(f.installmentsCount) || (f.schedule?.length || 3);
                const nextYear = new Date();
                nextYear.setFullYear(nextYear.getFullYear() + (isRecurring ? count : 3));
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
            borderLeft: `3px solid ${isRecurring ? THEME.sage : THEME.accent}`,
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
              color: isRecurring ? THEME.sage : THEME.accent,
              marginBottom: 8,
            }}
          >
            <Calculator size={13} /> Live Goal Financial Intelligence {isRecurring && "(Multi-Year Cash Flow)"}
          </div>

          {isRecurring ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 10,
                fontSize: 12,
              }}
            >
              <div>
                <div style={{ color: THEME.muted, fontSize: 10, fontWeight: 700 }}>NEXT PAYOUT DUE</div>
                <div style={{ fontWeight: 800, color: THEME.ink, fontSize: 13 }}>
                  {fmtINRFull(calculations.perInstallment || 0)}
                  <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>
                    {" "}(Inst. {(calculations.paidCount || 0) + 1} of {calculations.totalCount})
                  </span>
                </div>
              </div>

              <div>
                <div style={{ color: THEME.muted, fontSize: 10, fontWeight: 700 }}>SAVED FOR NEXT PAYOUT</div>
                <div style={{ fontWeight: 800, color: THEME.sage, fontSize: 13 }}>
                  {fmtINRFull(f.currentAmount)}
                  <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>
                    {" "}({calculations.nextProgress.toFixed(0)}%)
                  </span>
                </div>
              </div>

              <div>
                <div style={{ color: THEME.muted, fontSize: 10, fontWeight: 700 }}>NEXT DEFICIT GAP</div>
                <div style={{ fontWeight: 800, color: (calculations.nextGap || 0) > 0 ? THEME.gold : THEME.sage, fontSize: 13 }}>
                  {fmtINRFull(calculations.nextGap || 0)}
                </div>
              </div>

              <div>
                <div style={{ color: THEME.muted, fontSize: 10, fontWeight: 700 }}>REQUIRED MONTHLY SAVINGS</div>
                <div style={{ fontWeight: 900, color: THEME.accent, fontSize: 13 }}>
                  {fmtINR(calculations.monthlyForNext || 0)}/mo
                  {calculations.monthsToNext !== undefined && (
                    <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 500 }}>
                      for next {calculations.monthsToNext} months
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
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
                      {(calculations.yearsLeft || 0) >= 1
                        ? `${calculations.yearsLeft.toFixed(1)} Years`
                        : `${calculations.monthsLeft} Months`}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: THEME.muted, fontSize: 10, fontWeight: 700 }}>
                      FUTURE COST @ 6% INFLATION
                    </div>
                    <div style={{ fontWeight: 800, color: THEME.gold, fontSize: 13 }}>
                      {fmtINRFull(calculations.inflatedTarget6 || 0)}
                    </div>
                  </div>

                  <div>
                    <div style={{ color: THEME.muted, fontSize: 10, fontWeight: 700 }}>
                      EST. MONTHLY SIP @ 12%
                    </div>
                    <div style={{ fontWeight: 900, color: THEME.sage, fontSize: 13 }}>
                      {fmtINR(calculations.sip12 || 0)}/mo
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <ModalActions
        onSave={() =>
          onSave({
            ...f,
            name: f.name.trim(),
            installmentsCount: isRecurring
              ? scheduleMode === "variable" && f.schedule
                ? f.schedule.length
                : Number(f.installmentsCount) || 1
              : undefined,
            amountPerInstallment: isRecurring
              ? scheduleMode === "variable"
                ? undefined
                : Number(f.amountPerInstallment) || 0
              : undefined,
            installmentsPaid: isRecurring ? Number(f.installmentsPaid) || 0 : undefined,
            schedule: isRecurring && scheduleMode === "variable" ? f.schedule : undefined,
          })
        }
        onClose={onClose}
        saveLabel={initial ? "Save Changes" : "Create Financial Goal"}
        disabled={!canSave || saving}
        loading={saving}
      />
    </Modal>
  );
}
