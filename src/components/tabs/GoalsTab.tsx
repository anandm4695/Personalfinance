// @ts-nocheck
import React, { useState } from "react";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import {
  Plus,
  Pencil,
  Trash2,
  Flag,
  Target,
  PiggyBank,
  TrendingDown,
  Activity,
  Calendar,
  AlertTriangle,
  BarChart3,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, today, monthsBetween } from "../../utils/finance";
import { Prv } from "../../context/PrivacyContext";
import { GoalModal } from "../modals/GoalModal";
import { SectionTitle } from "../ui/SectionTitle";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";

// Internal helper components

const EmptyHint = ({ text }: { text: string }) => (
  <div style={{ padding: "32px 20px", textAlign: "center", color: THEME.muted }}>
    <div style={{ fontSize: 13 }}>{text}</div>
  </div>
);

const GoalEmptyState = ({ onAdd }: any) => (
  <EmptyState
    icon={Flag}
    title="No Goals Added Yet"
    description="Set financial goals — a house down payment, retirement corpus, car, education, or emergency fund — and watch your progress every day."
    pills={["Retirement Planning", "Home Down Payment", "Education Fund", "Emergency Reserve"]}
    buttonLabel="Set Your First Goal"
    onAdd={onAdd}
  />
);

const PRIORITY_ORDER: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
const PRIORITY_COLOR: Record<string, string> = {
  High: THEME.rust,
  Medium: THEME.gold,
  Low: THEME.sage,
};

export function GoalsTab({ state, addItem, removeItem, updateItem, metrics, showToast }: any) {
  const [show, setShow] = useState(false);
  const [editGoal, setEditGoal] = useState<any>(null);
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [sortBy, setSortBy] = useState<"priority" | "deadline">("priority");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [sipExpanded, setSipExpanded] = useState<Set<string>>(new Set());
  const [sipInputs, setSipInputs] = useState<Record<string, string>>({});
  const [showInflation, setShowInflation] = useState(false);
  const [inflationRate, setInflationRate] = useState("6");

  const { run: runAddGoal, loading: addingGoal } = useAsyncAction(
    async (v: any) => {
      await addItem("goals", v);
    },
    {
      onSuccess: () => setShow(false),
      onError: (e: any) =>
        showToast?.(`Failed to save goal: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: runUpdateGoal, loading: updatingGoal } = useAsyncAction(
    async (id: string, v: any) => {
      await updateItem("goals", id, v);
    },
    {
      onSuccess: () => setEditGoal(null),
      onError: (e: any) =>
        showToast?.(`Failed to save goal: ${e?.message || "Unknown error"}`, "error"),
    }
  );
  const [contribOpen, setContribOpen] = useState<string | null>(null);
  const [contribValue, setContribValue] = useState("");

  const addContribution = (goalId: string, currentAmount: number) => {
    const amt = Number(contribValue);
    if (amt > 0) {
      updateItem("goals", goalId, { currentAmount: Number(currentAmount || 0) + amt });
    }
    setContribOpen(null);
    setContribValue("");
  };

  const totalTarget = state.goals.reduce((s: number, g: any) => s + Number(g.targetAmount || 0), 0);
  const totalSaved = state.goals.reduce((s: number, g: any) => s + Number(g.currentAmount || 0), 0);
  const totalRemaining = Math.max(0, totalTarget - totalSaved);

  // Total monthly savings needed across all incomplete, time-bound goals.
  // Mirrors the per-goal card calc below: uses the inflation-adjusted
  // effectiveTarget when "Show Inflation-Adjusted" is on, so this summary
  // reconciles with the individual goal cards instead of always using the
  // nominal target.
  const totalMonthlyRequired = state.goals.reduce((s: number, g: any) => {
    const nominalTarget = Number(g.targetAmount) || 0;
    const inflRate = (Number(inflationRate) || 6) / 100;
    const yearsToTarget = g.targetDate ? Math.max(0, monthsBetween(today(), g.targetDate) / 12) : 0;
    const inflatedTarget =
      showInflation && yearsToTarget > 0
        ? nominalTarget * Math.pow(1 + inflRate, yearsToTarget)
        : nominalTarget;
    const effectiveTarget = showInflation ? inflatedTarget : nominalTarget;
    const isComplete = effectiveTarget > 0 && Number(g.currentAmount) >= effectiveTarget;
    if (isComplete || !g.targetDate) return s;
    const rawML = monthsBetween(today(), g.targetDate);
    const ml = Math.max(0, rawML);
    const remaining = Math.max(0, effectiveTarget - Number(g.currentAmount));
    const effM = ml > 0 ? ml : rawML === 0 ? 1 : 0;
    return s + (effM > 0 ? remaining / effM : 0);
  }, 0);
  const monthlySavings = metrics
    ? Math.max(0, (metrics.monthIncome || 0) - (metrics.monthExpense || 0))
    : 0;
  const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
  const animatedOverallPct = useAnimatedNumber(overallPct);

  const completedCount = state.goals.filter(
    (g: any) => Number(g.targetAmount) > 0 && Number(g.currentAmount) >= Number(g.targetAmount)
  ).length;

  const onTrackCount = state.goals.filter((g: any) => {
    const progress = Number(g.targetAmount)
      ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100
      : 0;
    if (progress >= 100) return false;
    if (!g.targetDate) return true;
    const elapsed = g.startDate ? monthsBetween(g.startDate, today()) : 0;
    const rem = Math.max(0, monthsBetween(today(), g.targetDate));
    const total = elapsed + rem;
    const expectedPct = total > 0 ? (elapsed / total) * 100 : 0;
    return progress >= expectedPct - 10;
  }).length;

  const behindCount = Math.max(0, state.goals.length - completedCount - onTrackCount);

  const priBreakdown = (["High", "Medium", "Low"] as const).map((p) => {
    const gs = state.goals.filter((g: any) => (g.priority || "Medium") === p);
    return {
      priority: p,
      count: gs.length,
      target: gs.reduce((s: number, g: any) => s + Number(g.targetAmount || 0), 0),
      saved: gs.reduce((s: number, g: any) => s + Number(g.currentAmount || 0), 0),
    };
  });

  const sortedGoals = [...state.goals]
    .filter((g) => filterPriority === "all" || (g.priority || "Medium") === filterPriority)
    .sort((a, b) => {
      if (sortBy === "deadline") {
        // Goals with no target date sort last regardless of direction — there's
        // nothing to be "soonest" or "latest" about a goal with no deadline.
        const da = a.targetDate ? new Date(a.targetDate).getTime() : Infinity;
        const db = b.targetDate ? new Date(b.targetDate).getTime() : Infinity;
        return sortDir === "desc" ? db - da : da - db;
      }
      const pa = PRIORITY_ORDER[a.priority] ?? 2;
      const pb = PRIORITY_ORDER[b.priority] ?? 2;
      return sortDir === "desc" ? pb - pa : pa - pb;
    });

  // Note: unlike Budget's bar (where a high % is bad - overspending), a high % here is
  // good - closer to the goal. THEME.rust is reserved for genuinely concerning states
  // elsewhere (the BEHIND badge), not just "goal recently started" - showing a brand-new
  // goal in alarming red would read as shaming rather than encouraging progress.
  const ringColor = (pct: number) =>
    pct >= 100 ? THEME.sage : pct >= 75 ? THEME.gold : pct >= 40 ? THEME.accent : THEME.muted;

  const fmtGoalDate = (d: string) =>
    d
      ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
      : "";

  return (
    <div className="tab-content-enter">
      <SectionTitle
        sub="What the money is for — down payments, retirement, freedom"
        rightElement={
          state.goals.length > 0 && (
            <Button variant="accent" icon={<Plus size={14} />} onClick={() => setShow(true)}>
              Add Goal
            </Button>
          )
        }
      >
        Financial Goals
      </SectionTitle>

      {state.goals.length > 0 && (
        <>
          {/* Overall Progress is the one number this whole tab answers — gets top billing
              as a hero card, matching the FIRE Number / Emergency Fund gauge treatment. */}
          <Card
            variant="hero"
            style={{
              marginBottom: 20,
              padding: "clamp(24px, 4vw, 36px)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              <Activity size={13} /> Overall Progress
            </div>
            <div
              style={{
                fontSize: "clamp(32px, 5vw, 52px)",
                fontWeight: 900,
                color: "#fff",
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {animatedOverallPct.toFixed(1)}%
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>
              <Prv>{fmtINRFull(totalSaved)}</Prv> saved of <Prv>{fmtINRFull(totalTarget)}</Prv>{" "}
              across {state.goals.length} goal{state.goals.length !== 1 ? "s" : ""}
            </div>
          </Card>

          {/* Secondary stats — supporting figures for the hero number above */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
              marginBottom: 28,
            }}
          >
            <StatCard
              label="Total Target"
              value={fmtINRFull(totalTarget)}
              numericValue={totalTarget}
              formatValue={fmtINRFull}
              icon={<Target />}
              color={THEME.accent}
            />
            <StatCard
              label="Total Saved"
              value={fmtINRFull(totalSaved)}
              numericValue={totalSaved}
              formatValue={fmtINRFull}
              icon={<PiggyBank />}
              color={THEME.sage}
            />
            <StatCard
              label="Remaining"
              value={fmtINRFull(totalRemaining)}
              numericValue={totalRemaining}
              formatValue={fmtINRFull}
              icon={<TrendingDown />}
              color={THEME.rust}
            />
            <StatCard
              label="Monthly Required"
              value={
                totalMonthlyRequired > 0
                  ? fmtINRFull(totalMonthlyRequired)
                  : completedCount === state.goals.length
                    ? "All done!"
                    : behindCount > 0
                      ? "Overdue"
                      : state.goals.some((g: any) => g.targetDate)
                        ? "On track"
                        : "No deadlines"
              }
              icon={<Calendar />}
              color={
                (totalMonthlyRequired > 0 &&
                  monthlySavings > 0 &&
                  totalMonthlyRequired > monthlySavings) ||
                (totalMonthlyRequired === 0 && behindCount > 0)
                  ? THEME.rust
                  : completedCount === state.goals.length
                    ? THEME.sage
                    : THEME.gold
              }
            />
          </div>

          <Card style={{ marginBottom: 32, padding: 28 }}>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: THEME.muted,
                marginBottom: 16,
                fontWeight: 700,
              }}
            >
              Portfolio Completion — {animatedOverallPct.toFixed(1)}% achieved
            </div>
            <div className="progress-track" style={{ height: 10, marginBottom: 16 }}>
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(overallPct, 100)}%`,
                  background: `linear-gradient(90deg, ${ringColor(overallPct)}, color-mix(in srgb, ${ringColor(overallPct)} 80%, transparent))`,
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
              <Badge variant="sage">✓ {completedCount} completed</Badge>
              <Badge variant="accent">↑ {onTrackCount} on track</Badge>
              {behindCount > 0 && (
                <Badge variant="rust">
                  <AlertTriangle size={11} /> {behindCount} behind
                </Badge>
              )}
            </div>

            <div style={{ borderTop: `1px solid ${THEME.line}`, paddingTop: 24 }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: THEME.muted,
                  marginBottom: 20,
                  fontWeight: 700,
                }}
              >
                Breakdown by Priority
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 16,
                }}
              >
                {priBreakdown.map((p) => {
                  const pPct = p.target > 0 ? (p.saved / p.target) * 100 : 0;
                  const color = PRIORITY_COLOR[p.priority];
                  return (
                    <div
                      key={p.priority}
                      style={{
                        padding: "18px 20px",
                        borderRadius: 16,
                        border: `1.5px solid color-mix(in srgb, ${color} 13%, transparent)`,
                        background: `linear-gradient(135deg, color-mix(in srgb, ${color} 4%, var(--surface-0)) 0%, var(--surface-0) 100%)`,
                        boxShadow: "0 2px 12px -2px rgba(0, 0, 0, 0.01)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 12,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                          }}
                        >
                          {p.priority}
                        </span>
                        <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                          {p.count} goal{p.count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="progress-track" style={{ marginBottom: 12 }}>
                        <div
                          className="progress-fill"
                          style={{
                            width: `${Math.min(pPct, 100)}%`,
                            background: color,
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted }}>
                        <span style={{ color: THEME.ink, fontWeight: 800 }}>
                          <Prv>{fmtINRFull(p.saved)}</Prv>
                        </span>
                        <span style={{ opacity: 0.6 }}>
                          {" "}
                          / <Prv>{fmtINRFull(p.target)}</Prv>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        </>
      )}

      {state.goals.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>Filter:</span>
            {(["all", "High", "Medium", "Low"] as const).map((p) => (
              <Button
                key={p}
                size="sm"
                variant={filterPriority === p ? "accent" : "ghost"}
                onClick={() => setFilterPriority(p)}
                style={{
                  padding: "4px 14px",
                  height: 32,
                  ...(filterPriority !== p && p !== "all"
                    ? {
                        color: PRIORITY_COLOR[p],
                        borderColor: `color-mix(in srgb, ${PRIORITY_COLOR[p]} 20%, transparent)`,
                      }
                    : {}),
                  ...(filterPriority === p && p !== "all"
                    ? { background: PRIORITY_COLOR[p], borderColor: PRIORITY_COLOR[p] }
                    : {}),
                }}
              >
                {p === "all" ? "All" : p}
              </Button>
            ))}
            <div style={{ width: 1, height: 20, background: THEME.line, margin: "0 4px" }} />
            <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>Sort:</span>
            <Button
              size="sm"
              variant={sortBy === "priority" ? "accent" : "ghost"}
              onClick={() => setSortBy("priority")}
              style={{ height: 32 }}
            >
              Priority
            </Button>
            <Button
              size="sm"
              variant={sortBy === "deadline" ? "accent" : "ghost"}
              onClick={() => setSortBy("deadline")}
              style={{ height: 32 }}
            >
              Deadline
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              style={{ height: 32 }}
            >
              {sortBy === "deadline"
                ? sortDir === "desc"
                  ? "Latest → Soonest"
                  : "Soonest → Latest"
                : sortDir === "desc"
                  ? "High → Low"
                  : "Low → High"}
            </Button>
            <div style={{ width: 1, height: 20, background: THEME.line, margin: "0 4px" }} />
            <Button
              size="sm"
              variant={showInflation ? "accent" : "ghost"}
              onClick={() => setShowInflation((v) => !v)}
              style={{ height: 32, fontSize: 12 }}
              icon={<BarChart3 size={13} />}
            >
              {showInflation ? "Inflation ON" : "Inflation"}
            </Button>
            {showInflation && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="number"
                  min="1"
                  max="15"
                  aria-label="Inflation rate percentage"
                  value={inflationRate}
                  onChange={(e) => setInflationRate(e.target.value)}
                  style={{
                    width: 48,
                    padding: "4px 6px",
                    borderRadius: 6,
                    border: `1px solid ${THEME.line}`,
                    fontSize: 12,
                    background: "var(--surface-0)",
                    color: THEME.ink,
                    textAlign: "center",
                  }}
                />
                <span style={{ fontSize: 11, color: THEME.muted }}>% p.a.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {state.goals.length === 0 ? (
        <GoalEmptyState onAdd={() => setShow(true)} />
      ) : sortedGoals.length === 0 ? (
        <Card style={{ padding: 48, textAlign: "center" }}>
          <EmptyHint text={`No ${filterPriority} priority goals yet.`} />
        </Card>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {sortedGoals.map((g: any) => {
            const nominalTarget = Number(g.targetAmount) || 0;
            const inflRate = (Number(inflationRate) || 6) / 100;
            const yearsToTarget = g.targetDate
              ? Math.max(0, monthsBetween(today(), g.targetDate) / 12)
              : 0;
            const inflatedTarget =
              showInflation && yearsToTarget > 0
                ? nominalTarget * Math.pow(1 + inflRate, yearsToTarget)
                : nominalTarget;
            const effectiveTarget = showInflation ? inflatedTarget : nominalTarget;
            const progress =
              effectiveTarget > 0 ? (Number(g.currentAmount) / effectiveTarget) * 100 : 0;
            const isComplete = progress >= 100;
            const rawMonthsLeft = g.targetDate ? monthsBetween(today(), g.targetDate) : 0;
            const monthsLeft = Math.max(0, rawMonthsLeft);
            const remaining = Math.max(0, effectiveTarget - Number(g.currentAmount));
            const effectiveMonths =
              monthsLeft > 0 ? monthsLeft : rawMonthsLeft === 0 && g.targetDate ? 1 : 0;
            const monthlyNeeded = effectiveMonths > 0 ? remaining / effectiveMonths : 0;
            const elapsed = g.startDate ? monthsBetween(g.startDate, today()) : 0;
            const totalDuration = elapsed + monthsLeft;
            const expectedPct = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
            const isBehind = !isComplete && g.targetDate && progress < expectedPct - 10;
            const rc = ringColor(progress);

            return (
              <div
                key={g.id}
                className="card-lift"
                style={{
                  padding: 24,
                  background:
                    "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 8%, var(--surface-0)) 100%)",
                  border: `1.5px solid ${THEME.line}`,
                  borderTop: `4px solid ${isComplete ? THEME.sage : PRIORITY_COLOR[g.priority] || THEME.muted}`,
                  borderRadius: 16,
                  boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.02)",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                {/* Header Row: Category/Priority Tags & Action Badges/Buttons */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.25em",
                        textTransform: "uppercase",
                        color: THEME.muted,
                      }}
                    >
                      {g.category}
                    </div>
                    {g.priority && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.15em",
                          textTransform: "uppercase",
                          color: PRIORITY_COLOR[g.priority] || THEME.muted,
                          border: `1px solid ${PRIORITY_COLOR[g.priority] || THEME.muted}`,
                          borderRadius: 4,
                          padding: "1px 6px",
                        }}
                      >
                        {g.priority}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {isComplete && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          background: `color-mix(in srgb, ${THEME.sage} 13%, transparent)`,
                          color: THEME.sage,
                          border: `1px solid color-mix(in srgb, ${THEME.sage} 33%, transparent)`,
                          borderRadius: 6,
                          padding: "2px 8px",
                          letterSpacing: "0.1em",
                        }}
                      >
                        COMPLETED
                      </span>
                    )}
                    {isBehind && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
                          color: THEME.rust,
                          border: `1px solid color-mix(in srgb, ${THEME.rust} 27%, transparent)`,
                          borderRadius: 6,
                          padding: "2px 8px",
                          letterSpacing: "0.1em",
                        }}
                      >
                        BEHIND
                      </span>
                    )}
                    {!isComplete && (
                      <button
                        onClick={() =>
                          setContribOpen((prev) => {
                            const next = prev === g.id ? null : g.id;
                            setContribValue("");
                            return next;
                          })
                        }
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: contribOpen === g.id ? "#fff" : THEME.sage,
                          background:
                            contribOpen === g.id
                              ? THEME.sage
                              : `color-mix(in srgb, ${THEME.sage} 10%, transparent)`,
                          border: `1px solid color-mix(in srgb, ${THEME.sage} 30%, transparent)`,
                          borderRadius: 20,
                          padding: "3px 10px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                        title="Add Funds"
                        aria-expanded={contribOpen === g.id}
                        aria-label={`Add funds to ${g.name}`}
                      >
                        <Plus size={11} /> Add Funds
                      </button>
                    )}
                    <button
                      onClick={() => setEditGoal(g)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.muted,
                        display: "inline-flex",
                        alignItems: "center",
                        padding: 4,
                        borderRadius: 6,
                        transition: "background 0.15s ease, color 0.15s ease",
                      }}
                      title="Edit Goal"
                      aria-label={`Edit goal ${g.name}`}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete goal "${g.name}"?`)) removeItem("goals", g.id);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.muted,
                        display: "inline-flex",
                        alignItems: "center",
                        padding: 4,
                        borderRadius: 6,
                        transition: "background 0.15s ease, color 0.15s ease",
                      }}
                      title="Delete Goal"
                      aria-label={`Delete goal ${g.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {contribOpen === g.id && (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                      marginBottom: 16,
                      padding: "10px 12px",
                      borderRadius: 10,
                      background: `color-mix(in srgb, ${THEME.sage} 5%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${THEME.sage} 18%, transparent)`,
                    }}
                  >
                    <span style={{ fontSize: 12, color: THEME.muted }}>Add</span>
                    <input
                      autoFocus
                      type="number"
                      min="0"
                      placeholder="amount"
                      aria-label={`Amount to add to ${g.name}`}
                      value={contribValue}
                      onChange={(e) => setContribValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addContribution(g.id, g.currentAmount);
                        if (e.key === "Escape") {
                          setContribOpen(null);
                          setContribValue("");
                        }
                      }}
                      style={{
                        width: 110,
                        padding: "5px 8px",
                        borderRadius: 6,
                        border: `1px solid ${THEME.line}`,
                        background: "var(--surface-0)",
                        fontSize: 13,
                        fontWeight: 700,
                        color: THEME.ink,
                        outline: "none",
                      }}
                    />
                    <span style={{ fontSize: 12, color: THEME.muted }}>
                      to <Prv>{fmtINRFull(g.currentAmount)}</Prv> saved
                    </span>
                    <Button
                      size="sm"
                      variant="accent"
                      onClick={() => addContribution(g.id, g.currentAmount)}
                      disabled={!(Number(contribValue) > 0)}
                      style={{ height: 30 }}
                    >
                      Add
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setContribOpen(null);
                        setContribValue("");
                      }}
                      style={{ height: 30 }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {/* Content Row: Goal Name, Start/Target Dates, Current/Target Amounts */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 16,
                    flexWrap: "wrap",
                    marginBottom: 16,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div
                      style={{ fontFamily: "var(--font-sans)", fontSize: 24, fontWeight: 800 }}
                    >
                      {g.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: THEME.muted,
                        marginTop: 6,
                        display: "flex",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      {g.startDate && <span>Started: {fmtGoalDate(g.startDate)}</span>}
                      {g.targetDate && (
                        <span>
                          Target: {fmtGoalDate(g.targetDate)} · {monthsLeft}m left
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{ fontFamily: "var(--font-sans)", fontSize: 22, fontWeight: 800 }}
                    >
                      <Prv>{fmtINRFull(g.currentAmount)}</Prv>{" "}
                      <span style={{ color: THEME.muted, fontSize: 15 }}>
                        / <Prv>{fmtINRFull(effectiveTarget)}</Prv>
                      </span>
                    </div>
                    {showInflation && inflatedTarget > nominalTarget && (
                      <div style={{ fontSize: 11, color: THEME.gold, marginTop: 2 }}>
                        Nominal: <Prv>{fmtINRFull(nominalTarget)}</Prv> → Inflation-adjusted @{" "}
                        {inflationRate}%
                      </div>
                    )}
                    <div style={{ fontSize: 13, fontWeight: 600, color: rc, marginTop: 4 }}>
                      {progress.toFixed(1)}% reached
                    </div>
                  </div>
                </div>

                {/* Progress Details Row */}
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  {(() => {
                    const r = 36,
                      sz = 88,
                      cx = sz / 2;
                    const circ = 2 * Math.PI * r;
                    const dashOff = circ * (1 - Math.min(progress, 100) / 100);
                    return (
                      <svg
                        width={sz}
                        height={sz}
                        style={{ flexShrink: 0 }}
                        role="img"
                        aria-label={`${Math.min(Math.round(progress), 100)}% of goal reached`}
                      >
                        <circle
                          cx={cx}
                          cy={cx}
                          r={r}
                          fill="none"
                          stroke={THEME.line}
                          strokeWidth="7"
                        />
                        <circle
                          cx={cx}
                          cy={cx}
                          r={r}
                          fill="none"
                          stroke={rc}
                          strokeWidth="7"
                          strokeDasharray={circ}
                          strokeDashoffset={dashOff}
                          strokeLinecap="round"
                          style={{
                            transformOrigin: `${cx}px ${cx}px`,
                            transform: "rotate(-90deg)",
                            transition: "stroke-dashoffset 0.6s ease",
                          }}
                        />
                        <text
                          x={cx}
                          y={cx - 4}
                          textAnchor="middle"
                          fontSize="13"
                          fontWeight="800"
                          fill={rc}
                        >
                          {Math.min(Math.round(progress), 100)}%
                        </text>
                        <text
                          x={cx}
                          y={cx + 12}
                          textAnchor="middle"
                          fontSize="9"
                          fill={THEME.muted}
                        >
                          {isComplete ? "DONE!" : "done"}
                        </text>
                      </svg>
                    );
                  })()}
                  <div style={{ flex: 1 }}>
                    {/* Tinted stat tiles */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                      {[
                        {
                          label: "Saved",
                          value: <Prv>{fmtINRFull(g.currentAmount)}</Prv>,
                          color: THEME.sage,
                        },
                        {
                          label: "Remaining",
                          value: <Prv>{fmtINRFull(remaining)}</Prv>,
                          color: THEME.rust,
                        },
                        ...(g.targetDate
                          ? [
                              {
                                label: rawMonthsLeft < 0 ? "Overdue" : "Months Left",
                                value:
                                  rawMonthsLeft < 0
                                    ? `${Math.abs(rawMonthsLeft)}m`
                                    : String(monthsLeft),
                                color:
                                  rawMonthsLeft < 0
                                    ? THEME.rust
                                    : isBehind
                                      ? THEME.rust
                                      : THEME.accent,
                              },
                            ]
                          : []),
                      ].map(({ label, value, color }) => (
                        <div
                          key={label}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                            padding: "7px 12px",
                            borderRadius: 8,
                            background: `color-mix(in srgb, ${color} 4%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${color} 13%, transparent)`,
                            flex: "1 1 80px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 9,
                              letterSpacing: "0.07em",
                              textTransform: "uppercase" as const,
                              color: THEME.muted,
                              fontWeight: 700,
                            }}
                          >
                            {label}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 800, color }}>{value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Time-elapsed progress bar */}
                    {g.startDate &&
                      g.targetDate &&
                      (() => {
                        const totalM = monthsBetween(g.startDate, g.targetDate);
                        const elapsedM = Math.max(0, monthsBetween(g.startDate, today()));
                        const timePct = totalM > 0 ? Math.min(100, (elapsedM / totalM) * 100) : 0;
                        if (totalM <= 0) return null;
                        return (
                          <div style={{ marginBottom: 12 }}>
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 9,
                                color: THEME.muted,
                                marginBottom: 4,
                                fontWeight: 600,
                              }}
                            >
                              <span>TIME ELAPSED</span>
                              <span
                                style={{
                                  color: isBehind ? THEME.rust : THEME.accent,
                                  fontWeight: 700,
                                }}
                              >
                                {timePct.toFixed(0)}%
                              </span>
                            </div>
                            <div className="progress-track">
                              <div
                                className="progress-fill"
                                style={{
                                  width: `${timePct}%`,
                                  background: isBehind ? THEME.rust : THEME.accent,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })()}

                    {monthlyNeeded > 0 && !isComplete && (
                      <div style={{ marginTop: 12 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div style={{ fontSize: 12, color: THEME.muted }}>
                            Monthly needed:{" "}
                            <span style={{ fontWeight: 800, color: THEME.ink }}>
                              <Prv>{fmtINRFull(monthlyNeeded)}</Prv>
                            </span>
                            <span style={{ fontSize: 10 }}> /mo</span>
                          </div>
                          <button
                            aria-expanded={sipExpanded.has(g.id)}
                            aria-label={`${sipExpanded.has(g.id) ? "Collapse" : "Expand"} SIP calculator for ${g.name}`}
                            onClick={() =>
                              setSipExpanded((prev) => {
                                const next = new Set(prev);
                                next.has(g.id) ? next.delete(g.id) : next.add(g.id);
                                return next;
                              })
                            }
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: sipExpanded.has(g.id) ? "#fff" : THEME.accent,
                              background: sipExpanded.has(g.id)
                                ? THEME.accent
                                : `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                              border: `1px solid color-mix(in srgb, ${THEME.accent} 20%, transparent)`,
                              borderRadius: 20,
                              padding: "3px 10px",
                              cursor: "pointer",
                            }}
                          >
                            SIP Calc {sipExpanded.has(g.id) ? "▲" : "▼"}
                          </button>
                        </div>

                        {sipExpanded.has(g.id) && (
                          <div
                            style={{
                              marginTop: 12,
                              padding: 16,
                              background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
                              borderRadius: 12,
                              border: `1px solid color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                color: THEME.muted,
                                fontWeight: 700,
                                textTransform: "uppercase" as const,
                                letterSpacing: "0.05em",
                                marginBottom: 10,
                              }}
                            >
                              Required SIP at different returns
                            </div>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(3,1fr)",
                                gap: 8,
                                marginBottom: 16,
                              }}
                            >
                              {[10, 12, 15].map((rate) => {
                                const r = rate / 100 / 12;
                                const n = effectiveMonths;
                                const fvCurrent = Number(g.currentAmount || 0) * Math.pow(1 + r, n);
                                const gap = Math.max(0, effectiveTarget - fvCurrent);
                                const sip =
                                  n > 0 && r > 0
                                    ? (gap * r) / (Math.pow(1 + r, n) - 1)
                                    : monthlyNeeded;
                                return (
                                  <div
                                    key={rate}
                                    style={{
                                      textAlign: "center",
                                      padding: "10px 8px",
                                      background: "var(--surface-0)",
                                      borderRadius: 8,
                                      border: `1px solid ${THEME.line}`,
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: 10,
                                        color: THEME.muted,
                                        fontWeight: 700,
                                        marginBottom: 4,
                                      }}
                                    >
                                      {rate}% p.a.
                                    </div>
                                    <div
                                      style={{ fontSize: 14, fontWeight: 800, color: THEME.accent }}
                                    >
                                      <Prv>{fmtINRFull(sip)}</Prv>/mo
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <div
                              style={{
                                fontSize: 11,
                                color: THEME.muted,
                                fontWeight: 700,
                                textTransform: "uppercase" as const,
                                letterSpacing: "0.05em",
                                marginBottom: 8,
                              }}
                            >
                              What-if calculator
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: 8,
                                alignItems: "center",
                                flexWrap: "wrap" as const,
                              }}
                            >
                              <span style={{ fontSize: 12, color: THEME.muted }}>I can invest</span>
                              <input
                                type="number"
                                placeholder="amount"
                                aria-label="Monthly SIP amount to test"
                                value={sipInputs[g.id] || ""}
                                onChange={(e) =>
                                  setSipInputs((prev) => ({ ...prev, [g.id]: e.target.value }))
                                }
                                style={{
                                  width: 90,
                                  padding: "4px 8px",
                                  borderRadius: 6,
                                  border: `1px solid ${THEME.line}`,
                                  background: "var(--surface-0)",
                                  fontSize: 13,
                                  fontWeight: 700,
                                  color: THEME.ink,
                                  outline: "none",
                                }}
                              />
                              <span style={{ fontSize: 12, color: THEME.muted }}>
                                /mo at 12% p.a.
                              </span>
                            </div>
                            {sipInputs[g.id] &&
                              Number(sipInputs[g.id]) > 0 &&
                              (() => {
                                const monthlySip = Number(sipInputs[g.id]);
                                const r = 0.12 / 12;
                                const MAX_MONTHS = 1200;
                                // Grows the already-saved corpus at the same rate as new
                                // contributions (matching the "Required SIP" projection above),
                                // instead of solving the annuity formula against a static nominal
                                // gap — which ignored compounding on the existing balance and
                                // overstated months-to-goal for anyone with savings already in.
                                let monthsNeeded = 0;
                                let balance = Number(g.currentAmount || 0);
                                if (monthlySip > 0 && remaining > 0) {
                                  while (balance < effectiveTarget && monthsNeeded < MAX_MONTHS) {
                                    balance = balance * (1 + r) + monthlySip;
                                    monthsNeeded++;
                                  }
                                }
                                const reachable = balance >= effectiveTarget;
                                // Clamp day-of-month so e.g. 31 Jan + 1mo lands on 28/29 Feb,
                                // not overflows into March (plain setMonth() rolls over).
                                const reachDate = (() => {
                                  if (monthsNeeded <= 0 || !reachable) return null;
                                  const base = new Date();
                                  const day = base.getDate();
                                  const total = base.getMonth() + monthsNeeded;
                                  const y = base.getFullYear() + Math.floor(total / 12);
                                  const m = ((total % 12) + 12) % 12;
                                  const daysInMonth = new Date(y, m + 1, 0).getDate();
                                  return new Date(y, m, Math.min(day, daysInMonth));
                                })();
                                const goalDate = g.targetDate ? new Date(g.targetDate) : null;
                                const onTime = !reachable
                                  ? false
                                  : reachDate && goalDate
                                    ? reachDate <= goalDate
                                    : null;
                                return (
                                  <div
                                    style={{
                                      marginTop: 10,
                                      padding: "10px 12px",
                                      borderRadius: 8,
                                      background:
                                        onTime === true
                                          ? `color-mix(in srgb, ${THEME.sage} 6%, transparent)`
                                          : onTime === false
                                            ? `color-mix(in srgb, ${THEME.rust} 6%, transparent)`
                                            : `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
                                      border: `1px solid ${onTime === true ? `color-mix(in srgb, ${THEME.sage} 15%, transparent)` : onTime === false ? `color-mix(in srgb, ${THEME.rust} 12%, transparent)` : THEME.line}`,
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 700,
                                        color:
                                          onTime === true
                                            ? THEME.sage
                                            : onTime === false
                                              ? THEME.rust
                                              : THEME.ink,
                                      }}
                                    >
                                      {!reachable
                                        ? "Won't reach this goal within 100 years at this rate"
                                        : `Reach goal in ${monthsNeeded} month${monthsNeeded !== 1 ? "s" : ""}`}
                                      {reachDate
                                        ? ` · ${reachDate.toLocaleString("en-IN", { month: "short", year: "numeric" })}`
                                        : ""}
                                    </div>
                                    {onTime !== null && (
                                      <div
                                        style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}
                                      >
                                        {onTime
                                          ? "✓ On track to meet your target date"
                                          : "✗ You'll miss your target date at this rate"}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                          </div>
                        )}
                      </div>
                    )}
                    {isBehind && (
                      <div style={{ marginTop: 6, fontSize: 12, color: THEME.rust }}>
                        Expected {expectedPct.toFixed(0)}% by now — you are{" "}
                        {(expectedPct - progress).toFixed(0)}% behind schedule.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {show && (
        <GoalModal
          onClose={() => setShow(false)}
          onSave={(v: any) => runAddGoal(v)}
          saving={addingGoal}
        />
      )}
      {editGoal && (
        <GoalModal
          initial={editGoal}
          onClose={() => setEditGoal(null)}
          onSave={(v: any) => runUpdateGoal(editGoal.id, v)}
          saving={updatingGoal}
        />
      )}
    </div>
  );
}
