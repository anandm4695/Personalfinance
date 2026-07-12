// @ts-nocheck
import React, { useState } from "react";
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
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, today, monthsBetween } from "../../utils/finance";
import { Prv } from "../../context/PrivacyContext";
import { GoalModal } from "../modals/GoalModal";
import { SectionTitle } from "../ui/SectionTitle";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

// Internal helper components

const EmptyHint = ({ text }: { text: string }) => (
  <div style={{ padding: "32px 20px", textAlign: "center", color: THEME.muted }}>
    <div style={{ fontSize: 13 }}>{text}</div>
  </div>
);

const GoalEmptyState = ({ onAdd }: any) => (
  <div
    style={{
      padding: "54px 36px",
      textAlign: "center" as const,
      background:
        "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 12%, var(--surface-0)) 100%)",
      border: `1.5px solid ${THEME.line}`,
      borderRadius: 20,
      boxShadow: "0 4px 24px -4px rgba(0, 0, 0, 0.03)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 24,
    }}
  >
    <div
      style={{
        width: 68,
        height: 68,
        borderRadius: 22,
        background: "linear-gradient(135deg,#d97706 0%,#fbbf24 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 8px 24px -4px rgba(217, 119, 6, 0.3)",
        border: "2px solid rgba(255, 255, 255, 0.2)",
      }}
    >
      <Flag size={30} color="#fff" />
    </div>
    <div>
      <h3
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: THEME.ink,
          marginBottom: 12,
          letterSpacing: "-0.02em",
        }}
      >
        No Goals Added Yet
      </h3>
      <p
        style={{
          fontSize: 14,
          color: THEME.muted,
          maxWidth: 420,
          lineHeight: 1.6,
          margin: "0 auto",
        }}
      >
        Set financial goals — a house down payment, retirement corpus, car, education, or emergency
        fund — and watch your progress every day.
      </p>
    </div>
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
      {["Retirement Planning", "Home Down Payment", "Education Fund", "Emergency Reserve"].map(
        (f) => (
          <span
            key={f}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: 12,
              background: "var(--surface-1)",
              border: `1.5px solid ${THEME.line}`,
              fontWeight: 600,
              fontSize: 11,
              color: THEME.muted,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#f59e0b",
                display: "inline-block",
              }}
            />
            {f}
          </span>
        )
      )}
    </div>
    <Button
      variant="accent"
      size="lg"
      icon={<Plus size={18} />}
      onClick={onAdd}
      style={{ marginTop: 8 }}
    >
      Set Your First Goal
    </Button>
  </div>
);

const PRIORITY_ORDER: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
const PRIORITY_COLOR: Record<string, string> = {
  High: THEME.rust,
  Medium: THEME.gold,
  Low: THEME.sage,
};

export function GoalsTab({ state, addItem, removeItem, updateItem, metrics }: any) {
  const [show, setShow] = useState(false);
  const [editGoal, setEditGoal] = useState<any>(null);
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [sipExpanded, setSipExpanded] = useState<Set<string>>(new Set());
  const [sipInputs, setSipInputs] = useState<Record<string, string>>({});
  const [showInflation, setShowInflation] = useState(false);
  const [inflationRate, setInflationRate] = useState("6");

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
      const pa = PRIORITY_ORDER[a.priority] ?? 2;
      const pb = PRIORITY_ORDER[b.priority] ?? 2;
      return sortDir === "desc" ? pb - pa : pa - pb;
    });

  const ringColor = (pct: number) =>
    pct >= 100 ? THEME.sage : pct >= 75 ? THEME.gold : pct >= 40 ? THEME.accent : THEME.rust;

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
          {/* Stat cards — matches Banks tab StatCard style */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
              marginBottom: 28,
            }}
          >
            {[
              {
                label: "Total Target",
                value: fmtINRFull(totalTarget),
                color: THEME.accent,
                Icon: Target,
              },
              {
                label: "Total Saved",
                value: fmtINRFull(totalSaved),
                color: THEME.sage,
                Icon: PiggyBank,
              },
              {
                label: "Remaining",
                value: fmtINRFull(totalRemaining),
                color: THEME.rust,
                Icon: TrendingDown,
              },
              {
                label: "Overall Progress",
                value: `${overallPct.toFixed(1)}%`,
                color: ringColor(overallPct),
                Icon: Activity,
              },
              {
                label: "Monthly Required",
                value:
                  totalMonthlyRequired > 0
                    ? fmtINRFull(totalMonthlyRequired)
                    : completedCount === state.goals.length
                      ? "All done!"
                      : state.goals.some((g: any) => g.targetDate)
                        ? "On track"
                        : "No deadlines",
                color:
                  totalMonthlyRequired > 0 &&
                  monthlySavings > 0 &&
                  totalMonthlyRequired > monthlySavings
                    ? THEME.rust
                    : completedCount === state.goals.length
                      ? THEME.sage
                      : THEME.gold,
                Icon: Calendar,
              },
            ].map(({ label, value, color, Icon }) => (
              <div
                key={label}
                className="card-lift"
                style={{
                  background:
                    "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 15%, var(--surface-0)) 100%)",
                  border: `1.5px solid ${THEME.line}`,
                  borderTop: `4px solid ${color}`,
                  borderRadius: 16,
                  padding: "20px 22px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  boxShadow:
                    "0 4px 20px -2px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 11,
                      background: `linear-gradient(135deg, color-mix(in srgb, ${color} 15%, transparent) 0%, color-mix(in srgb, ${color} 8%, transparent) 100%)`,
                      border: `1.5px solid color-mix(in srgb, ${color} 25%, transparent)`,
                      boxShadow: `0 2px 8px color-mix(in srgb, ${color} 8%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {label}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 900,
                    color: THEME.ink,
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
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
              Portfolio Completion — {overallPct.toFixed(1)}% achieved
            </div>
            <div
              style={{
                height: 12,
                background: `color-mix(in srgb, ${THEME.muted} 25%, transparent)`,
                borderRadius: 6,
                overflow: "hidden",
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(overallPct, 100)}%`,
                  background: `linear-gradient(90deg, ${ringColor(overallPct)}, color-mix(in srgb, ${ringColor(overallPct)} 80%, transparent))`,
                  borderRadius: 6,
                  transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
              <Badge variant="sage">✓ {completedCount} completed</Badge>
              <Badge variant="accent">↑ {onTrackCount} on track</Badge>
              {behindCount > 0 && <Badge variant="rust">⚠ {behindCount} behind</Badge>}
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
                      <div
                        style={{
                          height: 6,
                          background: `color-mix(in srgb, ${THEME.muted} 25%, transparent)`,
                          borderRadius: 3,
                          marginBottom: 12,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(pPct, 100)}%`,
                            background: color,
                            borderRadius: 3,
                            transition: "width 0.6s ease",
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted }}>
                        <span style={{ color: THEME.ink, fontWeight: 800 }}>
                          {fmtINRFull(p.saved)}
                        </span>
                        <span style={{ opacity: 0.6 }}> / {fmtINRFull(p.target)}</span>
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
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
              style={{ height: 32 }}
            >
              {sortDir === "desc" ? "High → Low" : "Low → High"}
            </Button>
            <div style={{ width: 1, height: 20, background: THEME.line, margin: "0 4px" }} />
            <Button
              size="sm"
              variant={showInflation ? "accent" : "ghost"}
              onClick={() => setShowInflation((v) => !v)}
              style={{ height: 32, fontSize: 12 }}
            >
              {showInflation ? "📊 Inflation ON" : "📊 Inflation"}
            </Button>
            {showInflation && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <input
                  type="number"
                  min="1"
                  max="15"
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
                    <button
                      onClick={() => setEditGoal(g)}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.muted,
                        display: "inline-flex",
                        alignItems: "center",
                        padding: 4,
                        borderRadius: 6,
                      }}
                      title="Edit Goal"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete goal "${g.name}"?`)) removeItem("goals", g.id);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.muted,
                        display: "inline-flex",
                        alignItems: "center",
                        padding: 4,
                        borderRadius: 6,
                      }}
                      title="Delete Goal"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

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
                      style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: 800 }}
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
                      style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 800 }}
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
                      <svg width={sz} height={sz} style={{ flexShrink: 0 }}>
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
                              {fmtINRFull(monthlyNeeded)}
                            </span>
                            <span style={{ fontSize: 10 }}> /mo</span>
                          </div>
                          <button
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
                                      {fmtINRFull(sip)}/mo
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
                                const monthsNeeded =
                                  monthlySip > 0 && remaining > 0
                                    ? Math.log(1 + (remaining * r) / monthlySip) / Math.log(1 + r)
                                    : 0;
                                const reachDate =
                                  monthsNeeded > 0
                                    ? new Date(
                                        new Date().setMonth(
                                          new Date().getMonth() + Math.ceil(monthsNeeded)
                                        )
                                      )
                                    : null;
                                const goalDate = g.targetDate ? new Date(g.targetDate) : null;
                                const onTime = reachDate && goalDate ? reachDate <= goalDate : null;
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
                                      Reach goal in{" "}
                                      {monthsNeeded > 0 ? Math.ceil(monthsNeeded) : "—"} months
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
          onSave={(v: any) => {
            addItem("goals", v);
            setShow(false);
          }}
        />
      )}
      {editGoal && (
        <GoalModal
          initial={editGoal}
          onClose={() => setEditGoal(null)}
          onSave={(v: any) => {
            updateItem("goals", editGoal.id, v);
            setEditGoal(null);
          }}
        />
      )}
    </div>
  );
}
