import React, { useState, useMemo } from "react";
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
  Search,
  LayoutGrid,
  Milestone,
  Table as TableIcon,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Sliders,
  Clock,
  ArrowUpDown,
  Zap,
  Home,
  Car,
  GraduationCap,
  Shield,
  Plane,
  Heart,
  Briefcase,
  Palmtree,
  Calculator,
  Layers,
  ChevronDown,
  ChevronUp,
  X,
  User,
  Compass,
  Award,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, today, monthsBetween } from "../../utils/finance";
import { Money } from "../ui/Money";
import { ConfirmDialog } from "../ui/Feedback";
import { GoalModal, Goal } from "../modals/GoalModal";
import { SectionTitle } from "../ui/SectionTitle";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";
import { Modal } from "../ui/Modal";

const EmptyHint = ({ text }: { text: string }) => (
  <div style={{ padding: "36px 20px", textAlign: "center", color: THEME.muted }}>
    <div style={{ fontSize: 13, fontWeight: 500 }}>{text}</div>
  </div>
);

const GoalEmptyState = ({ onAdd }: any) => (
  <EmptyState
    icon={Flag}
    gradient={`linear-gradient(135deg, ${THEME.accent}, ${THEME.sage})`}
    title="No Financial Goals Set Yet"
    description="Set targets for what your money is for — retirement freedom, home down payment, higher education, dream vehicle, or emergency buffer."
    pills={["Retirement Corpus", "Home Down Payment", "Education Fund", "Emergency Buffer", "Dream Vacation"]}
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

const getCategoryIcon = (category: string, size = 15) => {
  const cat = (category || "").toLowerCase();
  if (cat.includes("retire")) return <Palmtree size={size} color={THEME.accent} />;
  if (cat.includes("home") || cat.includes("house") || cat.includes("property")) return <Home size={size} color={THEME.accent} />;
  if (cat.includes("car") || cat.includes("vehicle") || cat.includes("bike")) return <Car size={size} color={THEME.accent} />;
  if (cat.includes("edu") || cat.includes("school") || cat.includes("college")) return <GraduationCap size={size} color={THEME.accent} />;
  if (cat.includes("emergency") || cat.includes("reserve") || cat.includes("buffer")) return <Shield size={size} color={THEME.sage} />;
  if (cat.includes("travel") || cat.includes("vacation") || cat.includes("trip")) return <Plane size={size} color={THEME.accent} />;
  if (cat.includes("wedding") || cat.includes("marriage")) return <Heart size={size} color={THEME.pink} />;
  if (cat.includes("invest") || cat.includes("wealth")) return <TrendingUp size={size} color={THEME.sage} />;
  return <Target size={size} color={THEME.accent} />;
};

const getAssetAllocationRecommendation = (monthsLeft: number) => {
  if (monthsLeft <= 0) return { equity: 0, debt: 100, gold: 0, label: "Cash / Liquid Funds" };
  if (monthsLeft <= 36) {
    return {
      equity: 20,
      debt: 70,
      gold: 10,
      label: "Capital Preservation (Arbitrage / Short-Duration Debt & FDs)",
    };
  }
  if (monthsLeft <= 84) {
    return {
      equity: 60,
      debt: 30,
      gold: 10,
      label: "Balanced Growth (Flexicap / Multi-Asset / Hybrid MFs)",
    };
  }
  return {
    equity: 75,
    debt: 15,
    gold: 10,
    label: "Aggressive Wealth Compounding (Nifty 50 / Midcap / Smallcap MFs)",
  };
};

export function GoalsTab({ state, addItem, removeItem, updateItem, metrics, showToast }: any) {
  const [show, setShow] = useState(false);
  const [editGoal, setEditGoal] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"grid" | "roadmap" | "matrix" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [sortBy, setSortBy] = useState<"priority" | "deadline" | "progress" | "amount">("priority");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "completed" | "on_track" | "behind" | "overdue">("all");
  const [sipExpanded, setSipExpanded] = useState<Set<string>>(new Set());
  const [showInflation, setShowInflation] = useState(false);
  const [inflationRate, setInflationRate] = useState("6");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);
  const [showSimulator, setShowSimulator] = useState(false);
  const [customSipRate, setCustomSipRate] = useState<Record<string, number>>({});

  // Quick Top-up State
  const [contribOpen, setContribOpen] = useState<string | null>(null);
  const [contribValue, setContribValue] = useState("");

  const { run: runAddGoal, loading: addingGoal } = useAsyncAction(
    async (v: any) => {
      await addItem("goals", v);
      showToast?.("Goal created successfully!", "success");
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
      showToast?.("Goal updated successfully!", "success");
    },
    {
      onSuccess: () => setEditGoal(null),
      onError: (e: any) =>
        showToast?.(`Failed to save goal: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: runAddContribution } = useAsyncAction(
    async (goalId: string, currentAmount: number, amt: number, goalName: string) => {
      await updateItem("goals", goalId, { currentAmount: Number(currentAmount || 0) + amt });
      showToast?.(`Added ₹${fmtINR(amt)} to "${goalName}"!`, "success");
    },
    {
      onSuccess: () => {
        setContribOpen(null);
        setContribValue("");
      },
      onError: (e: any) =>
        showToast?.(`Failed to add contribution: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const addContribution = (g: any, customAmt?: number) => {
    const amt = customAmt !== undefined ? customAmt : Number(contribValue);
    if (amt > 0) {
      runAddContribution(g.id, g.currentAmount, amt, g.name);
    } else {
      setContribOpen(null);
      setContribValue("");
    }
  };

  const { run: deleteGoal } = useAsyncAction(
    async (id: string) => {
      await removeItem("goals", id);
      showToast?.("Goal deleted", "info");
    },
    {
      onError: (e: any) =>
        showToast?.(`Failed to delete goal: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const allGoals: any[] = state.goals || [];
  const inflRateNum = (Number(inflationRate) || 6) / 100;

  // Portfolio Totals & Calculations
  const {
    totalTarget,
    totalInflatedTarget,
    totalSaved,
    totalRemaining,
    totalMonthlyRequired,
    completedCount,
    onTrackCount,
    behindCount,
    overdueCount,
    horizonBreakdown,
  } = useMemo(() => {
    let targetSum = 0;
    let inflatedTargetSum = 0;
    let savedSum = 0;
    let monthlyReqSum = 0;
    let completed = 0;
    let onTrack = 0;
    let behind = 0;
    let overdue = 0;

    const horizons = {
      near: { count: 0, amount: 0 },
      medium: { count: 0, amount: 0 },
      long: { count: 0, amount: 0 },
      done: { count: 0, amount: 0 },
    };

    allGoals.forEach((g: any) => {
      const nominalTarget = Number(g.targetAmount || 0);
      const current = Number(g.currentAmount || 0);
      targetSum += nominalTarget;
      savedSum += current;

      const yearsToTarget = g.targetDate ? Math.max(0, monthsBetween(today(), g.targetDate) / 12) : 0;
      const inflatedTarget =
        showInflation && yearsToTarget > 0
          ? nominalTarget * Math.pow(1 + inflRateNum, yearsToTarget)
          : nominalTarget;
      inflatedTargetSum += inflatedTarget;

      const effectiveTarget = showInflation ? inflatedTarget : nominalTarget;
      const isComplete = effectiveTarget > 0 && current >= effectiveTarget;
      const progress = effectiveTarget > 0 ? (current / effectiveTarget) * 100 : 0;

      if (isComplete) {
        completed++;
        horizons.done.count++;
        horizons.done.amount += current;
        return;
      }

      const rawML = g.targetDate ? monthsBetween(today(), g.targetDate) : null;
      if (rawML !== null && rawML < 0) {
        overdue++;
      }

      const ml = rawML !== null ? Math.max(0, rawML) : 0;
      const remaining = Math.max(0, effectiveTarget - current);
      const effM = ml > 0 ? ml : rawML === 0 ? 1 : 0;

      if (effM > 0) {
        monthlyReqSum += remaining / effM;
      }

      // Elapsed & expected progress
      const elapsed = g.startDate ? monthsBetween(g.startDate, today()) : 0;
      const totalMonths = elapsed + ml;
      const expectedPct = totalMonths > 0 ? (elapsed / totalMonths) * 100 : 0;
      const isBehind = g.targetDate && progress < expectedPct - 10;

      if (isBehind) {
        behind++;
      } else {
        onTrack++;
      }

      // Horizon categorization
      if (ml <= 12) {
        horizons.near.count++;
        horizons.near.amount += effectiveTarget;
      } else if (ml <= 36) {
        horizons.medium.count++;
        horizons.medium.amount += effectiveTarget;
      } else {
        horizons.long.count++;
        horizons.long.amount += effectiveTarget;
      }
    });

    const rem = Math.max(0, (showInflation ? inflatedTargetSum : targetSum) - savedSum);

    return {
      totalTarget: targetSum,
      totalInflatedTarget: inflatedTargetSum,
      totalSaved: savedSum,
      totalRemaining: rem,
      totalMonthlyRequired: monthlyReqSum,
      completedCount: completed,
      onTrackCount: onTrack,
      behindCount: behind,
      overdueCount: overdue,
      horizonBreakdown: horizons,
    };
  }, [allGoals, showInflation, inflRateNum]);

  const monthlySavings = metrics
    ? Math.max(0, (metrics.monthIncome || 0) - (metrics.monthExpense || 0))
    : 0;

  const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
  const animatedOverallPct = useAnimatedNumber(overallPct);

  // Portfolio Velocity Score (0 to 100)
  const portfolioVelocityScore = useMemo(() => {
    if (allGoals.length === 0) return 100;
    const activeGoals = allGoals.length - completedCount;
    if (activeGoals === 0) return 100;
    const score = Math.round((onTrackCount / activeGoals) * 100);
    return Math.min(100, Math.max(0, score));
  }, [allGoals, completedCount, onTrackCount]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    allGoals.forEach((g) => {
      if (g.category) set.add(g.category);
    });
    return Array.from(set);
  }, [allGoals]);

  const filteredGoals = useMemo(() => {
    return allGoals.filter((g) => {
      if (filterPriority !== "all" && (g.priority || "Medium") !== filterPriority) return false;
      if (filterCategory !== "all" && g.category !== filterCategory) return false;

      const nominalTarget = Number(g.targetAmount || 0);
      const current = Number(g.currentAmount || 0);
      const isComplete = nominalTarget > 0 && current >= nominalTarget;
      const rawML = g.targetDate ? monthsBetween(today(), g.targetDate) : null;
      const isOverdue = rawML !== null && rawML < 0 && !isComplete;

      const elapsed = g.startDate ? monthsBetween(g.startDate, today()) : 0;
      const ml = rawML !== null ? Math.max(0, rawML) : 0;
      const totalMonths = elapsed + ml;
      const progress = nominalTarget > 0 ? (current / nominalTarget) * 100 : 0;
      const expectedPct = totalMonths > 0 ? (elapsed / totalMonths) * 100 : 0;
      const isBehind = !isComplete && g.targetDate && progress < expectedPct - 10;

      if (filterStatus === "completed" && !isComplete) return false;
      if (filterStatus === "overdue" && !isOverdue) return false;
      if (filterStatus === "behind" && !isBehind) return false;
      if (filterStatus === "on_track" && (isComplete || isBehind || isOverdue)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (g.name || "").toLowerCase().includes(q);
        const matchCat = (g.category || "").toLowerCase().includes(q);
        const matchOwner = (g.owner || "").toLowerCase().includes(q);
        if (!matchName && !matchCat && !matchOwner) return false;
      }
      return true;
    });
  }, [allGoals, filterPriority, filterCategory, filterStatus, searchQuery]);

  const sortedGoals = useMemo(() => {
    return [...filteredGoals].sort((a, b) => {
      if (sortBy === "deadline") {
        const da = a.targetDate ? new Date(a.targetDate).getTime() : Infinity;
        const db = b.targetDate ? new Date(b.targetDate).getTime() : Infinity;
        return sortDir === "desc" ? db - da : da - db;
      }
      if (sortBy === "progress") {
        const pa = Number(a.targetAmount) ? (Number(a.currentAmount) / Number(a.targetAmount)) * 100 : 0;
        const pb = Number(b.targetAmount) ? (Number(b.currentAmount) / Number(b.targetAmount)) * 100 : 0;
        return sortDir === "desc" ? pb - pa : pa - pb;
      }
      if (sortBy === "amount") {
        const aa = Number(a.targetAmount || 0);
        const ab = Number(b.targetAmount || 0);
        return sortDir === "desc" ? ab - aa : aa - ab;
      }
      const pa = PRIORITY_ORDER[a.priority] ?? 2;
      const pb = PRIORITY_ORDER[b.priority] ?? 2;
      return sortDir === "desc" ? pb - pa : pa - pb;
    });
  }, [filteredGoals, sortBy, sortDir]);

  const ringColor = (pct: number) =>
    pct >= 100 ? THEME.sage : pct >= 75 ? THEME.gold : pct >= 40 ? THEME.accent : THEME.muted;

  const fmtGoalDate = (d: string) =>
    d
      ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { month: "short", year: "2-digit" })
      : "";

  const cashflowSurplusDelta = monthlySavings - totalMonthlyRequired;

  return (
    <div className="tab-content-enter">
      <SectionTitle
        sub="Master your financial destiny — track wealth milestones, retirement freedom, and strategic compounding"
        rightElement={
          allGoals.length > 0 && (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Button
                variant="secondary"
                icon={<Sparkles size={14} color={THEME.accent} />}
                onClick={() => setShowSimulator(true)}
              >
                What-If Simulator
              </Button>
              <Button variant="accent" icon={<Plus size={14} />} onClick={() => setShow(true)}>
                Add Goal
              </Button>
            </div>
          )
        }
      >
        Financial Goals
      </SectionTitle>

      {allGoals.length > 0 && (
        <>
          {/* Executive Goal Mastery Cockpit */}
          <Card
            variant="base"
            style={{
              marginBottom: 20,
              padding: "clamp(20px, 3.5vw, 32px)",
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--surface-0) 92%, var(--t-accent) 8%), var(--surface-0))",
              border: `1px solid ${THEME.line}`,
              borderTop: `4px solid ${THEME.accent}`,
              borderRadius: "var(--radius-xl)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Ambient Background Glow */}
            <div
              style={{
                position: "absolute",
                top: -60,
                right: -60,
                width: 240,
                height: 240,
                borderRadius: "50%",
                background: `radial-gradient(circle, color-mix(in srgb, ${THEME.accent} 16%, transparent) 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 24,
                alignItems: "center",
              }}
            >
              {/* Left Column: Radial Completion Ring & Total Corpus */}
              <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                {/* Large Radial SVG Gauge */}
                {(() => {
                  const size = 110;
                  const strokeWidth = 9;
                  const radius = (size - strokeWidth) / 2;
                  const circumference = 2 * Math.PI * radius;
                  const strokeDashoffset =
                    circumference - (Math.min(overallPct, 100) / 100) * circumference;
                  return (
                    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
                      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
                        <circle
                          cx={size / 2}
                          cy={size / 2}
                          r={radius}
                          stroke="var(--t-line)"
                          strokeWidth={strokeWidth}
                          fill="transparent"
                        />
                        <circle
                          cx={size / 2}
                          cy={size / 2}
                          r={radius}
                          stroke={THEME.accent}
                          strokeWidth={strokeWidth}
                          fill="transparent"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          style={{ transition: "stroke-dashoffset 1s ease" }}
                        />
                      </svg>
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 22,
                            fontWeight: 900,
                            color: THEME.ink,
                            fontVariantNumeric: "tabular-nums",
                            lineHeight: 1,
                          }}
                        >
                          {animatedOverallPct.toFixed(0)}%
                        </span>
                        <span style={{ fontSize: 9, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", marginTop: 2 }}>
                          Funded
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: THEME.muted,
                      marginBottom: 4,
                    }}
                  >
                    <Activity size={14} color={THEME.accent} /> Goal Mastery Velocity
                  </div>
                  <div
                    style={{
                      fontSize: "clamp(24px, 3.5vw, 36px)",
                      fontWeight: 900,
                      color: THEME.ink,
                      letterSpacing: "-0.02em",
                      lineHeight: 1.1,
                      display: "flex",
                      alignItems: "baseline",
                      gap: 8,
                    }}
                  >
                    <span>{fmtINRFull(totalSaved)}</span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: THEME.muted }}>
                      / {fmtINRFull(showInflation ? totalInflatedTarget : totalTarget)}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4, fontWeight: 600 }}>
                    {allGoals.length} Active Financial Goal{allGoals.length !== 1 ? "s" : ""} ·{" "}
                    <strong style={{ color: totalRemaining > 0 ? THEME.gold : THEME.sage }}>
                      {fmtINRFull(totalRemaining)} Remaining Gap
                    </strong>
                  </div>
                </div>
              </div>

              {/* Right Column: Portfolio Health & Surplus Run-Rate Assessment */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  justifyContent: "center",
                  background: "var(--surface-1)",
                  padding: "16px 20px",
                  borderRadius: "var(--radius-lg)",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: THEME.muted }}>
                    Monthly Goal Savings Run-Rate
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: "var(--radius-sm)",
                      background:
                        cashflowSurplusDelta >= 0
                          ? `color-mix(in srgb, ${THEME.sage} 15%, transparent)`
                          : `color-mix(in srgb, ${THEME.rust} 15%, transparent)`,
                      color: cashflowSurplusDelta >= 0 ? THEME.sage : THEME.rust,
                    }}
                  >
                    {cashflowSurplusDelta >= 0 ? "Surplus Funded" : "Savings Deficit"}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: THEME.ink }}>
                      {fmtINR(totalMonthlyRequired)}
                      <span style={{ fontSize: 12, fontWeight: 600, color: THEME.muted }}>/mo required</span>
                    </div>
                  </div>
                  {monthlySavings > 0 && (
                    <div style={{ textAlign: "right", fontSize: 12, color: THEME.muted }}>
                      Net Surplus: <strong style={{ color: THEME.ink }}>{fmtINR(monthlySavings)}/mo</strong>
                    </div>
                  )}
                </div>

                {/* Horizon Quick Pills */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", borderTop: `1px solid ${THEME.line}`, paddingTop: 10 }}>
                  <span style={{ fontSize: 11, color: THEME.muted }}>
                    Near-Term (&lt;1y): <strong style={{ color: THEME.ink }}>{horizonBreakdown.near.count}</strong>
                  </span>
                  <span style={{ color: THEME.muted }}>·</span>
                  <span style={{ fontSize: 11, color: THEME.muted }}>
                    Mid-Term (1-3y): <strong style={{ color: THEME.ink }}>{horizonBreakdown.medium.count}</strong>
                  </span>
                  <span style={{ color: THEME.muted }}>·</span>
                  <span style={{ fontSize: 11, color: THEME.muted }}>
                    Long-Term (3y+): <strong style={{ color: THEME.ink }}>{horizonBreakdown.long.count}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Status Filter Bar */}
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
                marginTop: 20,
                borderTop: `1px solid ${THEME.line}`,
                paddingTop: 16,
              }}
            >
              <button
                onClick={() => setFilterStatus("all")}
                className={`demat-portfolio-pill ${filterStatus === "all" ? "active" : ""}`}
                style={{ fontSize: 11, padding: "5px 12px", display: "flex", alignItems: "center", gap: 6 }}
              >
                <span>All Goals</span>
                <span style={{ opacity: 0.7, fontWeight: 800 }}>({allGoals.length})</span>
              </button>

              <button
                onClick={() => setFilterStatus("on_track")}
                className={`demat-portfolio-pill ${filterStatus === "on_track" ? "active" : ""}`}
                style={{
                  fontSize: 11,
                  padding: "5px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  ...(filterStatus === "on_track"
                    ? { background: THEME.accent, borderColor: THEME.accent, color: "#fff" }
                    : {}),
                }}
              >
                <TrendingUp size={12} />
                <span>On Track</span>
                <span style={{ opacity: 0.8, fontWeight: 800 }}>({onTrackCount})</span>
              </button>

              {behindCount > 0 && (
                <button
                  onClick={() => setFilterStatus("behind")}
                  className={`demat-portfolio-pill ${filterStatus === "behind" ? "active" : ""}`}
                  style={{
                    fontSize: 11,
                    padding: "5px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    ...(filterStatus === "behind"
                      ? { background: THEME.rust, borderColor: THEME.rust, color: "#fff" }
                      : {}),
                  }}
                >
                  <AlertTriangle size={12} />
                  <span>Behind Schedule</span>
                  <span style={{ opacity: 0.8, fontWeight: 800 }}>({behindCount})</span>
                </button>
              )}

              {overdueCount > 0 && (
                <button
                  onClick={() => setFilterStatus("overdue")}
                  className={`demat-portfolio-pill ${filterStatus === "overdue" ? "active" : ""}`}
                  style={{
                    fontSize: 11,
                    padding: "5px 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    ...(filterStatus === "overdue"
                      ? { background: THEME.rust, borderColor: THEME.rust, color: "#fff" }
                      : {}),
                  }}
                >
                  <Clock size={12} />
                  <span>Overdue</span>
                  <span style={{ opacity: 0.8, fontWeight: 800 }}>({overdueCount})</span>
                </button>
              )}

              <button
                onClick={() => setFilterStatus("completed")}
                className={`demat-portfolio-pill ${filterStatus === "completed" ? "active" : ""}`}
                style={{
                  fontSize: 11,
                  padding: "5px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  ...(filterStatus === "completed"
                    ? { background: THEME.sage, borderColor: THEME.sage, color: "#fff" }
                    : {}),
                }}
              >
                <CheckCircle2 size={12} />
                <span>Completed</span>
                <span style={{ opacity: 0.8, fontWeight: 800 }}>({completedCount})</span>
              </button>
            </div>
          </Card>

          {/* Secondary Summary Metric Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <StatCard
              label="Total Target"
              value={fmtINRFull(showInflation ? totalInflatedTarget : totalTarget)}
              numericValue={showInflation ? totalInflatedTarget : totalTarget}
              formatValue={fmtINRFull}
              sub={showInflation ? `Adjusted for ${inflationRate}% annual inflation` : "Nominal portfolio targets"}
              icon={<Target />}
              color={THEME.accent}
            />
            <StatCard
              label="Accumulated Corpus"
              value={fmtINRFull(totalSaved)}
              numericValue={totalSaved}
              formatValue={fmtINRFull}
              sub={`${overallPct.toFixed(1)}% of total portfolio goal`}
              icon={<PiggyBank />}
              color={THEME.sage}
            />
            <StatCard
              label="Funding Gap"
              value={fmtINRFull(totalRemaining)}
              numericValue={totalRemaining}
              formatValue={fmtINRFull}
              sub={totalRemaining === 0 ? "100% Fully Funded!" : "Net capital to be accumulated"}
              icon={<TrendingDown />}
              color={totalRemaining > 0 ? THEME.gold : THEME.sage}
            />
            <StatCard
              label="Required Monthly SIP"
              value={
                totalMonthlyRequired > 0
                  ? fmtINR(totalMonthlyRequired) + "/mo"
                  : completedCount === allGoals.length
                    ? "All Goals Funded!"
                    : "On Schedule"
              }
              sub={
                monthlySavings > 0
                  ? `Current surplus: ${fmtINR(monthlySavings)}/mo`
                  : undefined
              }
              icon={<Calendar />}
              color={
                totalMonthlyRequired > 0 && monthlySavings > 0 && totalMonthlyRequired > monthlySavings
                  ? THEME.rust
                  : completedCount === allGoals.length
                    ? THEME.sage
                    : THEME.accent
              }
            />
          </div>

          {/* Controls Bar & View Mode Switcher */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 20,
              padding: "12px 16px",
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              borderRadius: "var(--radius-lg)",
            }}
          >
            {/* View Mode Pills */}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                onClick={() => setViewMode("grid")}
                className={`demat-portfolio-pill ${viewMode === "grid" ? "active" : ""}`}
                title="Card Grid View"
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px" }}
              >
                <LayoutGrid size={13} /> Cards
              </button>
              <button
                onClick={() => setViewMode("roadmap")}
                className={`demat-portfolio-pill ${viewMode === "roadmap" ? "active" : ""}`}
                title="Milestone Roadmap Timeline"
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px" }}
              >
                <Milestone size={13} /> Roadmap
              </button>
              <button
                onClick={() => setViewMode("matrix")}
                className={`demat-portfolio-pill ${viewMode === "matrix" ? "active" : ""}`}
                title="Priority Urgency Wealth Matrix"
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px" }}
              >
                <Compass size={13} /> Priority Matrix
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`demat-portfolio-pill ${viewMode === "table" ? "active" : ""}`}
                title="High-Density Table View"
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px" }}
              >
                <TableIcon size={13} /> Table
              </button>
            </div>

            {/* Search, Priority, and Inflation Adjuster */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {/* Search Bar */}
              <div style={{ position: "relative", minWidth: 160 }}>
                <Search
                  size={13}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: THEME.muted,
                  }}
                />
                <input
                  type="text"
                  placeholder="Search goals or owners..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 10px 6px 30px",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-1)",
                    color: THEME.ink,
                    fontSize: 12,
                    outline: "none",
                  }}
                />
              </div>

              {/* Priority Filter */}
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {(["all", "High", "Medium", "Low"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setFilterPriority(p)}
                    className={`demat-portfolio-pill ${filterPriority === p ? "active" : ""}`}
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      ...(filterPriority === p && p !== "all"
                        ? { background: PRIORITY_COLOR[p], borderColor: PRIORITY_COLOR[p], color: "#fff" }
                        : {}),
                    }}
                  >
                    {p === "all" ? "All Pri" : p}
                  </button>
                ))}
              </div>

              {/* Inflation Toggle & Rate Input */}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  onClick={() => setShowInflation((v) => !v)}
                  className={`demat-portfolio-pill ${showInflation ? "active" : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    padding: "4px 10px",
                  }}
                  title="Calculate future inflation-adjusted required corpus"
                >
                  <BarChart3 size={12} /> {showInflation ? `Inflation (${inflationRate}%)` : "Inflation"}
                </button>
                {showInflation && (
                  <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <input
                      type="number"
                      min="1"
                      max="15"
                      value={inflationRate}
                      onChange={(e) => setInflationRate(e.target.value)}
                      style={{
                        width: 44,
                        padding: "3px 4px",
                        borderRadius: 4,
                        border: `1px solid ${THEME.line}`,
                        fontSize: 11,
                        textAlign: "center",
                        background: "var(--surface-1)",
                        color: THEME.ink,
                      }}
                    />
                    <span style={{ fontSize: 10, color: THEME.muted }}>%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
      {allGoals.length === 0 ? (
        <GoalEmptyState onAdd={() => setShow(true)} />
      ) : sortedGoals.length === 0 ? (
        <Card style={{ padding: 48, textAlign: "center" }}>
          <EmptyHint text="No goals match your search or filter criteria." />
        </Card>
      ) : viewMode === "roadmap" ? (
        /* ROADMAP TIMELINE VIEW */
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {(() => {
            const groups: Record<string, { desc: string; items: any[] }> = {
              "Immediate & Near-Term (< 1 Year)": {
                desc: "Critical short-term liquidity buffers, urgent debt retirement, and immediate milestones",
                items: [],
              },
              "Medium-Term Horizon (1 – 3 Years)": {
                desc: "Vehicle upgrades, home renovations, and planned major expenditures",
                items: [],
              },
              "Long-Term Wealth Milestones (3 – 7 Years)": {
                desc: "Home down payments, child higher education, and aggressive compounding funds",
                items: [],
              },
              "Decade Horizon & Retirement (7+ Years)": {
                desc: "Retirement freedom corpus, FIRE independence, and generational legacy wealth",
                items: [],
              },
              "Completed & Milestones Celebrated": {
                desc: "Goals 100% funded and ready for realization",
                items: [],
              },
              "No Set Target Date": {
                desc: "Open-ended wealth creation targets",
                items: [],
              },
            };

            sortedGoals.forEach((g) => {
              const progress = Number(g.targetAmount)
                ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100
                : 0;
              if (progress >= 100) {
                groups["Completed & Milestones Celebrated"].items.push(g);
                return;
              }
              if (!g.targetDate) {
                groups["No Set Target Date"].items.push(g);
                return;
              }
              const ml = monthsBetween(today(), g.targetDate);
              if (ml <= 12) groups["Immediate & Near-Term (< 1 Year)"].items.push(g);
              else if (ml <= 36) groups["Medium-Term Horizon (1 – 3 Years)"].items.push(g);
              else if (ml <= 84) groups["Long-Term Wealth Milestones (3 – 7 Years)"].items.push(g);
              else groups["Decade Horizon & Retirement (7+ Years)"].items.push(g);
            });

            return Object.entries(groups).map(([title, grp]) => {
              if (grp.items.length === 0) return null;
              return (
                <div key={title} style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                      paddingLeft: 4,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 13,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: THEME.ink,
                        }}
                      >
                        <Clock size={15} color={THEME.accent} /> {title} ({grp.items.length})
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{grp.desc}</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
                    {grp.items.map((g) => renderGoalCard(g))}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      ) : viewMode === "matrix" ? (
        /* PRIORITY & URGENCY WEALTH MATRIX (EISENHOWER QUADRANT) */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 18 }}>
          {(() => {
            const quadrants = [
              {
                id: "q1",
                title: "Urgent & High Priority (Non-Negotiable)",
                desc: "Immediate emergency buffers & critical near-term obligations",
                color: THEME.rust,
                icon: AlertTriangle,
                filter: (g: any) => {
                  const ml = g.targetDate ? monthsBetween(today(), g.targetDate) : 999;
                  return g.priority === "High" && ml <= 36;
                },
              },
              {
                id: "q2",
                title: "Strategic Long-Term Wealth (High Compounding)",
                desc: "Retirement freedom, education corpus, and generational wealth",
                color: THEME.accent,
                icon: TrendingUp,
                filter: (g: any) => {
                  const ml = g.targetDate ? monthsBetween(today(), g.targetDate) : 999;
                  return g.priority === "High" && ml > 36;
                },
              },
              {
                id: "q3",
                title: "Important Milestones (Medium Priority)",
                desc: "Planned lifestyle upgrades, vehicles, and real estate renovation",
                color: THEME.gold,
                icon: Compass,
                filter: (g: any) => g.priority === "Medium",
              },
              {
                id: "q4",
                title: "Discretionary & Lifestyle Aspirations",
                desc: "Vacations, luxury experiences, and elective spending goals",
                color: THEME.sage,
                icon: Palmtree,
                filter: (g: any) => (g.priority || "Low") === "Low",
              },
            ];

            return quadrants.map((quad) => {
              const items = sortedGoals.filter(quad.filter);
              const QuadIcon = quad.icon;
              return (
                <Card
                  key={quad.id}
                  style={{
                    padding: 20,
                    borderTop: `4px solid ${quad.color}`,
                    background: "var(--surface-0)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <QuadIcon size={16} color={quad.color} />
                    <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>{quad.title}</div>
                    <span
                      style={{
                        marginLeft: "auto",
                        fontSize: 10,
                        fontWeight: 800,
                        padding: "2px 7px",
                        borderRadius: "var(--radius-sm)",
                        background: `color-mix(in srgb, ${quad.color} 12%, transparent)`,
                        color: quad.color,
                      }}
                    >
                      {items.length} Goal{items.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 14 }}>{quad.desc}</div>

                  {items.length === 0 ? (
                    <div style={{ padding: "24px 0", textAlign: "center", color: THEME.muted, fontSize: 12 }}>
                      No goals in this quadrant
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {items.map((g) => renderGoalCard(g, true))}
                    </div>
                  )}
                </Card>
              );
            });
          })()}
        </div>
      ) : viewMode === "table" ? (
        /* COMPACT HIGH-DENSITY SPREADSHEET TABLE VIEW */
        <Card style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface-1)", borderBottom: `1.5px solid ${THEME.line}` }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Goal Name & Owner</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Category</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Priority</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Target</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Accumulated</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Gap</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 130 }}>Progress</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Deadline</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Monthly SIP</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedGoals.map((g) => {
                  const nominalTarget = Number(g.targetAmount || 0);
                  const yearsToTarget = g.targetDate ? Math.max(0, monthsBetween(today(), g.targetDate) / 12) : 0;
                  const inflatedTarget =
                    showInflation && yearsToTarget > 0
                      ? nominalTarget * Math.pow(1 + inflRateNum, yearsToTarget)
                      : nominalTarget;
                  const effectiveTarget = showInflation ? inflatedTarget : nominalTarget;
                  const savedAmt = Number(g.currentAmount || 0);
                  const progress = effectiveTarget > 0 ? (savedAmt / effectiveTarget) * 100 : 0;
                  const isDone = progress >= 100;
                  const gap = Math.max(0, effectiveTarget - savedAmt);

                  const rawML = g.targetDate ? monthsBetween(today(), g.targetDate) : 0;
                  const ml = Math.max(0, rawML);
                  const monthlyNeeded = ml > 0 ? gap / ml : 0;

                  return (
                    <tr
                      key={g.id}
                      style={{
                        borderBottom: `1px solid ${THEME.line}`,
                        transition: "background 0.15s ease",
                      }}
                      className="table-row-hover"
                    >
                      <td style={{ padding: "14px 16px", fontWeight: 700, color: THEME.ink }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {getCategoryIcon(g.category, 15)}
                          <div>
                            <div>{g.name}</div>
                            {g.owner && g.owner !== "self" && (
                              <div style={{ fontSize: 10, color: THEME.muted, display: "flex", alignItems: "center", gap: 3 }}>
                                <User size={10} /> {g.owner}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", color: THEME.muted, fontSize: 12 }}>
                        {g.category || "Wealth"}
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: PRIORITY_COLOR[g.priority] || THEME.muted,
                            background: `color-mix(in srgb, ${PRIORITY_COLOR[g.priority] || THEME.muted} 12%, transparent)`,
                            border: `1px solid color-mix(in srgb, ${PRIORITY_COLOR[g.priority] || THEME.muted} 25%, transparent)`,
                            padding: "2px 6px",
                            borderRadius: 4,
                          }}
                        >
                          {g.priority || "Medium"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 700 }}>
                        <Money value={effectiveTarget} variant="full" />
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 800, color: THEME.sage }}>
                        <Money value={savedAmt} variant="full" />
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 700, color: gap > 0 ? THEME.gold : THEME.sage }}>
                        <Money value={gap} variant="full" />
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--t-line)", overflow: "hidden" }}>
                            <div
                              style={{
                                height: "100%",
                                width: `${Math.min(progress, 100)}%`,
                                background: isDone ? THEME.sage : ringColor(progress),
                                borderRadius: 3,
                              }}
                            />
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, minWidth: 36, textAlign: "right", color: ringColor(progress) }}>
                            {progress.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center", fontSize: 12, color: THEME.muted }}>
                        {fmtGoalDate(g.targetDate) || "—"}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 800, color: THEME.ink }}>
                        {monthlyNeeded > 0 ? fmtINR(monthlyNeeded) : isDone ? "Done" : "—"}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                          <button
                            onClick={() => addContribution(g, 10000)}
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 6px",
                              borderRadius: 4,
                              border: `1px solid color-mix(in srgb, ${THEME.sage} 30%, transparent)`,
                              background: `color-mix(in srgb, ${THEME.sage} 10%, transparent)`,
                              color: THEME.sage,
                              cursor: "pointer",
                            }}
                            title="Quick Top-up +₹10,000"
                          >
                            +10k
                          </button>
                          <button
                            onClick={() => setEditGoal(g)}
                            className="icon-btn"
                            style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4 }}
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ id: g.id, name: g.name })}
                            className="icon-btn danger"
                            style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 4 }}
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* GRID CARDS VIEW */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 18 }}>
          {sortedGoals.map((g) => renderGoalCard(g))}
        </div>
      )}

      {/* Goal Modals & Confirmation */}
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
      {confirmDelete && (
        <ConfirmDialog
          message={`Delete goal "${confirmDelete.name}"? This cannot be undone.`}
          onConfirm={() => {
            deleteGoal(confirmDelete.id);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Interactive What-If Goal Realization Simulator */}
      {showSimulator && (
        <GoalSimulatorModal
          goals={allGoals}
          metrics={metrics}
          onClose={() => setShowSimulator(false)}
        />
      )}
    </div>
  );

  // Helper render for Goal Card
  function renderGoalCard(g: any, compact = false) {
    const nominalTarget = Number(g.targetAmount) || 0;
    const yearsToTarget = g.targetDate
      ? Math.max(0, monthsBetween(today(), g.targetDate) / 12)
      : 0;
    const inflatedTarget =
      showInflation && yearsToTarget > 0
        ? nominalTarget * Math.pow(1 + inflRateNum, yearsToTarget)
        : nominalTarget;
    const effectiveTarget = showInflation ? inflatedTarget : nominalTarget;
    const progress = effectiveTarget > 0 ? (Number(g.currentAmount) / effectiveTarget) * 100 : 0;
    const isComplete = progress >= 100;
    const rawMonthsLeft = g.targetDate ? monthsBetween(today(), g.targetDate) : 0;
    const monthsLeft = Math.max(0, rawMonthsLeft);
    const remaining = Math.max(0, effectiveTarget - Number(g.currentAmount));
    const effectiveMonths = monthsLeft > 0 ? monthsLeft : rawMonthsLeft === 0 && g.targetDate ? 1 : 0;
    const monthlyNeeded = effectiveMonths > 0 ? remaining / effectiveMonths : 0;
    const elapsed = g.startDate ? monthsBetween(g.startDate, today()) : 0;
    const totalDuration = elapsed + monthsLeft;
    const expectedPct = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
    const isBehind = !isComplete && g.targetDate && progress < expectedPct - 10;
    const isOverdue = !isComplete && g.targetDate && rawMonthsLeft < 0;
    const rc = ringColor(progress);

    const assetMix = getAssetAllocationRecommendation(monthsLeft);
    const currentRate = customSipRate[g.id] || 12;

    return (
      <div
        key={g.id}
        className="card-lift"
        style={{
          padding: compact ? "16px 18px" : "20px 22px",
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          borderTop: `4px solid ${
            isComplete
              ? THEME.sage
              : isOverdue
                ? THEME.rust
                : PRIORITY_COLOR[g.priority] || THEME.accent
          }`,
          borderRadius: "var(--radius-xl)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 14,
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <div>
          {/* Header Row: Category Badge, Owner Tag, and Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 8px",
                  borderRadius: "var(--radius-sm)",
                  background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
                  color: THEME.accent,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {getCategoryIcon(g.category, 13)}
                <span>{g.category || "Wealth"}</span>
              </div>

              {g.priority && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: PRIORITY_COLOR[g.priority] || THEME.muted,
                    background: `color-mix(in srgb, ${PRIORITY_COLOR[g.priority] || THEME.muted} 12%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${PRIORITY_COLOR[g.priority] || THEME.muted} 25%, transparent)`,
                    borderRadius: 4,
                    padding: "2px 6px",
                  }}
                >
                  {g.priority}
                </span>
              )}

              {g.owner && g.owner !== "self" && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: THEME.muted,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <User size={10} /> {g.owner}
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {isComplete ? (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    background: `color-mix(in srgb, ${THEME.sage} 15%, transparent)`,
                    color: THEME.sage,
                    border: `1px solid color-mix(in srgb, ${THEME.sage} 30%, transparent)`,
                    borderRadius: 6,
                    padding: "2px 7px",
                  }}
                >
                  ACHIEVED
                </span>
              ) : isOverdue ? (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    background: `color-mix(in srgb, ${THEME.rust} 15%, transparent)`,
                    color: THEME.rust,
                    border: `1px solid color-mix(in srgb, ${THEME.rust} 30%, transparent)`,
                    borderRadius: 6,
                    padding: "2px 7px",
                  }}
                >
                  OVERDUE
                </span>
              ) : isBehind ? (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    background: `color-mix(in srgb, ${THEME.rust} 12%, transparent)`,
                    color: THEME.rust,
                    border: `1px solid color-mix(in srgb, ${THEME.rust} 30%, transparent)`,
                    borderRadius: 6,
                    padding: "2px 7px",
                  }}
                >
                  BEHIND
                </span>
              ) : null}

              <button
                onClick={() => setEditGoal(g)}
                className="icon-btn"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: THEME.muted,
                  padding: 4,
                  borderRadius: 6,
                }}
                title="Edit Goal"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => setConfirmDelete({ id: g.id, name: g.name })}
                className="icon-btn danger"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: THEME.muted,
                  padding: 4,
                  borderRadius: 6,
                }}
                title="Delete Goal"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Goal Title & Target Horizon Badge */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: THEME.ink, letterSpacing: "-0.01em" }}>
              {g.name}
            </div>
            <div style={{ display: "flex", gap: 10, fontSize: 11, color: THEME.muted, marginTop: 4, flexWrap: "wrap", alignItems: "center" }}>
              {g.startDate && <span>Started: {fmtGoalDate(g.startDate)}</span>}
              {g.targetDate && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: "var(--surface-1)",
                    border: `1px solid ${THEME.line}`,
                    fontWeight: 700,
                    color: rawMonthsLeft < 0 ? THEME.rust : THEME.ink,
                  }}
                >
                  <Calendar size={11} />
                  Target: {fmtGoalDate(g.targetDate)} ·{" "}
                  {rawMonthsLeft < 0
                    ? `${Math.abs(rawMonthsLeft)}m overdue`
                    : monthsLeft >= 12
                      ? `${(monthsLeft / 12).toFixed(1)}y left`
                      : `${monthsLeft}m left`}
                </span>
              )}
            </div>
          </div>

          {/* Amount and Mini Radial Gauge */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: THEME.ink }}>
                <Money value={g.currentAmount} variant="full" />
              </div>
              <div style={{ fontSize: 12, color: THEME.muted }}>
                of <Money value={effectiveTarget} variant="full" /> target
              </div>
              {showInflation && inflatedTarget > nominalTarget && (
                <div style={{ fontSize: 10, color: THEME.gold, marginTop: 2 }}>
                  Nominal: <Money value={nominalTarget} variant="full" />
                </div>
              )}
            </div>

            {/* Circular Gauge */}
            {(() => {
              const r = 24,
                sz = 60,
                cx = sz / 2;
              const circ = 2 * Math.PI * r;
              const dashOff = circ * (1 - Math.min(progress, 100) / 100);
              return (
                <svg width={sz} height={sz} style={{ flexShrink: 0 }}>
                  <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--t-line)" strokeWidth="5" />
                  <circle
                    cx={cx}
                    cy={cx}
                    r={r}
                    fill="none"
                    stroke={rc}
                    strokeWidth="5"
                    strokeDasharray={circ}
                    strokeDashoffset={dashOff}
                    strokeLinecap="round"
                    style={{
                      transformOrigin: `${cx}px ${cx}px`,
                      transform: "rotate(-90deg)",
                      transition: "stroke-dashoffset 0.6s ease",
                    }}
                  />
                  <text x={cx} y={cx + 4} textAnchor="middle" fontSize="11" fontWeight="800" fill={rc}>
                    {Math.min(Math.round(progress), 100)}%
                  </text>
                </svg>
              );
            })()}
          </div>

          {/* 4-Stage Milestone Progression */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              {[25, 50, 75, 100].map((m) => {
                const reached = progress >= m;
                return (
                  <span
                    key={m}
                    style={{
                      fontSize: 9,
                      fontWeight: 800,
                      color: reached ? THEME.sage : THEME.muted,
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <CheckCircle2 size={9} style={{ opacity: reached ? 1 : 0.4 }} /> {m}%
                  </span>
                );
              })}
            </div>
            <div style={{ height: 6, borderRadius: 3, background: "var(--t-line)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(progress, 100)}%`,
                  background: isComplete ? THEME.sage : `linear-gradient(90deg, ${THEME.accent}, ${rc})`,
                  borderRadius: 3,
                  transition: "width 0.6s ease",
                }}
              />
            </div>
          </div>

          {/* Quick Top-Up Bar */}
          {!isComplete && (
            <div
              style={{
                padding: "8px 10px",
                borderRadius: "var(--radius-md)",
                background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
                border: `1px solid color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: THEME.muted, marginBottom: 5 }}>
                Quick Top-Up
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {[5000, 10000, 25000, 50000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => addContribution(g, amt)}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 4,
                      border: `1px solid color-mix(in srgb, ${THEME.sage} 30%, transparent)`,
                      background: `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
                      color: THEME.sage,
                      cursor: "pointer",
                    }}
                  >
                    +{fmtINR(amt)}
                  </button>
                ))}
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
                    padding: "3px 8px",
                    borderRadius: 4,
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-0)",
                    color: THEME.ink,
                    cursor: "pointer",
                  }}
                >
                  Custom
                </button>
              </div>

              {contribOpen === g.id && (
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
                  <input
                    autoFocus
                    type="number"
                    min="0"
                    placeholder="₹ Amount"
                    value={contribValue}
                    onChange={(e) => setContribValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addContribution(g);
                      if (e.key === "Escape") setContribOpen(null);
                    }}
                    style={{
                      width: 90,
                      padding: "4px 6px",
                      borderRadius: 4,
                      border: `1px solid ${THEME.line}`,
                      fontSize: 11,
                      fontWeight: 700,
                      background: "var(--surface-0)",
                      color: THEME.ink,
                    }}
                  />
                  <Button
                    size="sm"
                    variant="accent"
                    onClick={() => addContribution(g)}
                    disabled={!(Number(contribValue) > 0)}
                    style={{ height: 26, fontSize: 10, padding: "2px 8px" }}
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer: Monthly Needed, Smart SIP & Asset Allocation Guidance */}
        {monthlyNeeded > 0 && !isComplete && (
          <div style={{ borderTop: `1px solid ${THEME.line}`, paddingTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 11, color: THEME.muted }}>
                Needed: <strong style={{ color: THEME.ink }}>{fmtINR(monthlyNeeded)}</strong>/mo
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
                  color: THEME.accent,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                SIP & Asset Mix {sipExpanded.has(g.id) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            {sipExpanded.has(g.id) && (
              <div
                style={{
                  marginTop: 10,
                  padding: 12,
                  borderRadius: "var(--radius-md)",
                  background: "var(--surface-1)",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                {/* 3-Tier Monthly SIP compound table */}
                <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", color: THEME.muted, marginBottom: 6 }}>
                  Monthly SIP Required by Expected Return
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 10 }}>
                  {[8, 12, 15].map((rate) => {
                    const r = rate / 100 / 12;
                    const n = effectiveMonths;
                    const fvCurrent = Number(g.currentAmount || 0) * Math.pow(1 + r, n);
                    const gap = Math.max(0, effectiveTarget - fvCurrent);
                    const sip = n > 0 && r > 0 ? (gap * r) / (Math.pow(1 + r, n) - 1) : monthlyNeeded;
                    return (
                      <div
                        key={rate}
                        style={{
                          textAlign: "center",
                          padding: "6px 4px",
                          borderRadius: 4,
                          background: "var(--surface-0)",
                          border: `1px solid ${THEME.line}`,
                        }}
                      >
                        <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700 }}>
                          {rate}% {rate === 8 ? "Debt" : rate === 12 ? "Index" : "Equity"}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: THEME.accent }}>{fmtINR(sip)}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Horizon Asset Allocation Guidance */}
                <div style={{ borderTop: `1px dashed ${THEME.line}`, paddingTop: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", color: THEME.muted, marginBottom: 4 }}>
                    Recommended Asset Mix ({monthsLeft >= 12 ? `${(monthsLeft / 12).toFixed(1)}y Horizon` : `${monthsLeft}m Horizon`})
                  </div>
                  <div style={{ display: "flex", gap: 6, fontSize: 10, fontWeight: 700 }}>
                    <span style={{ color: THEME.accent }}>{assetMix.equity}% Equity</span> ·{" "}
                    <span style={{ color: THEME.sage }}>{assetMix.debt}% Debt</span> ·{" "}
                    <span style={{ color: THEME.gold }}>{assetMix.gold}% Gold</span>
                  </div>
                  <div style={{ fontSize: 9, color: THEME.muted, marginTop: 2 }}>{assetMix.label}</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}

// Interactive What-If Goal Realization Simulator Modal
function GoalSimulatorModal({ goals, metrics, onClose }: { goals: any[]; metrics: any; onClose: () => void }) {
  const [stepUpRate, setStepUpRate] = useState(10);
  const [extraMonthly, setExtraMonthly] = useState(10000);
  const [expectedCagr, setExpectedCagr] = useState(12);

  const activeGoals = goals.filter((g) => {
    const target = Number(g.targetAmount || 0);
    const current = Number(g.currentAmount || 0);
    return target > 0 && current < target;
  });

  const totalGap = activeGoals.reduce((s, g) => s + Math.max(0, Number(g.targetAmount || 0) - Number(g.currentAmount || 0)), 0);

  // Simulation: Time to achieve portfolio target with Step-Up SIP
  const simulationResults = useMemo(() => {
    const monthlyRate = expectedCagr / 100 / 12;
    let baseMonths = 0;
    let stepUpMonths = 0;

    // Normal SIP calculation (Fixed monthly surplus)
    let corpusNormal = goals.reduce((s, g) => s + Number(g.currentAmount || 0), 0);
    const targetCorpus = goals.reduce((s, g) => s + Number(g.targetAmount || 0), 0);
    const monthlyDeposit = extraMonthly;

    if (monthlyDeposit > 0 && targetCorpus > corpusNormal) {
      let m = 0;
      while (corpusNormal < targetCorpus && m < 600) {
        corpusNormal = corpusNormal * (1 + monthlyRate) + monthlyDeposit;
        m++;
      }
      baseMonths = m;
    }

    // Step-Up SIP (increases every 12 months by stepUpRate)
    let corpusStepUp = goals.reduce((s, g) => s + Number(g.currentAmount || 0), 0);
    if (monthlyDeposit > 0 && targetCorpus > corpusStepUp) {
      let m = 0;
      let currDeposit = monthlyDeposit;
      while (corpusStepUp < targetCorpus && m < 600) {
        if (m > 0 && m % 12 === 0) {
          currDeposit *= 1 + stepUpRate / 100;
        }
        corpusStepUp = corpusStepUp * (1 + monthlyRate) + currDeposit;
        m++;
      }
      stepUpMonths = m;
    }

    const monthsSaved = Math.max(0, baseMonths - stepUpMonths);
    const yearsSaved = (monthsSaved / 12).toFixed(1);

    return {
      baseYears: (baseMonths / 12).toFixed(1),
      stepUpYears: (stepUpMonths / 12).toFixed(1),
      monthsSaved,
      yearsSaved,
      targetCorpus,
    };
  }, [goals, extraMonthly, stepUpRate, expectedCagr]);

  return (
    <Modal title="Interactive Goal Realization & Step-Up Simulator" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 13, color: THEME.muted, lineHeight: 1.5 }}>
          Simulate how stepping up your monthly investments annually accelerates your financial freedom and helps you achieve your life goals years earlier.
        </div>

        {/* Sliders & Inputs */}
        <div
          style={{
            padding: 16,
            borderRadius: "var(--radius-lg)",
            background: "var(--surface-1)",
            border: `1px solid ${THEME.line}`,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              <span>Monthly Surplus Dedicated to Goals</span>
              <strong style={{ color: THEME.accent }}>₹{fmtINR(extraMonthly)}/mo</strong>
            </div>
            <input
              type="range"
              min="1000"
              max="200000"
              step="1000"
              value={extraMonthly}
              onChange={(e) => setExtraMonthly(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.accent }}
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              <span>Annual Step-Up Percentage</span>
              <strong style={{ color: THEME.gold }}>+{stepUpRate}% / year</strong>
            </div>
            <input
              type="range"
              min="0"
              max="25"
              step="1"
              value={stepUpRate}
              onChange={(e) => setStepUpRate(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.gold }}
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>
              <span>Expected Portfolio Return (CAGR)</span>
              <strong style={{ color: THEME.sage }}>{expectedCagr}% CAGR</strong>
            </div>
            <input
              type="range"
              min="6"
              max="18"
              step="0.5"
              value={expectedCagr}
              onChange={(e) => setExpectedCagr(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.sage }}
            />
          </div>
        </div>

        {/* Simulation Outcome Highlight */}
        <div
          style={{
            padding: 16,
            borderRadius: "var(--radius-lg)",
            background: `linear-gradient(135deg, color-mix(in srgb, ${THEME.sage} 12%, var(--surface-0)), var(--surface-0))`,
            border: `1.5px solid color-mix(in srgb, ${THEME.sage} 30%, transparent)`,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: THEME.muted }}>Fixed SIP Horizon</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: THEME.ink, marginTop: 2 }}>
              {simulationResults.baseYears} Years
            </div>
          </div>

          <div>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: THEME.muted }}>Step-Up SIP Horizon</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: THEME.accent, marginTop: 2 }}>
              {simulationResults.stepUpYears} Years
            </div>
          </div>

          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: THEME.sage, marginTop: 2, display: "flex", alignItems: "center", gap: 5 }}>
              <Zap size={18} color={THEME.sage} style={{ flexShrink: 0 }} />
              <span>{simulationResults.yearsSaved} Years</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button variant="secondary" onClick={onClose}>
            Close Simulator
          </Button>
        </div>
      </div>
    </Modal>
  );
}
