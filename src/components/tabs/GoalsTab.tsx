// @ts-nocheck
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
  ChevronRight,
  Clock,
  ArrowUpDown,
  Zap,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, today, monthsBetween } from "../../utils/finance";
import { Money } from "../ui/Money";
import { ConfirmDialog } from "../ui/Feedback";
import { GoalModal } from "../modals/GoalModal";
import { SectionTitle } from "../ui/SectionTitle";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";

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
    description="Set targets for what money is for — retirement freedom, home down payment, higher education, dream vehicle, or travel reserves."
    pills={["Retirement Corpus", "Home Down Payment", "Education Fund", "Emergency Reserve", "Dream Vacation"]}
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

const CATEGORY_ICONS: Record<string, string> = {
  Retirement: "🏖️",
  "Home Purchase": "🏡",
  Vehicle: "🚗",
  Education: "🎓",
  "Emergency Fund": "🛡️",
  Travel: "✈️",
  Wedding: "💍",
  Investment: "📈",
  General: "🎯",
};

export function GoalsTab({ state, addItem, removeItem, updateItem, metrics, showToast }: any) {
  const [show, setShow] = useState(false);
  const [editGoal, setEditGoal] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"grid" | "roadmap" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [sortBy, setSortBy] = useState<"priority" | "deadline" | "progress" | "amount">("priority");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sipExpanded, setSipExpanded] = useState<Set<string>>(new Set());
  const [sipInputs, setSipInputs] = useState<Record<string, string>>({});
  const [showInflation, setShowInflation] = useState(false);
  const [inflationRate, setInflationRate] = useState("6");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

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

  const { run: runAddContribution } = useAsyncAction(
    async (goalId: string, currentAmount: number, amt: number) => {
      await updateItem("goals", goalId, { currentAmount: Number(currentAmount || 0) + amt });
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

  const addContribution = (goalId: string, currentAmount: number, customAmt?: number) => {
    const amt = customAmt !== undefined ? customAmt : Number(contribValue);
    if (amt > 0) {
      runAddContribution(goalId, currentAmount, amt);
    } else {
      setContribOpen(null);
      setContribValue("");
    }
  };

  const { run: deleteGoal } = useAsyncAction(
    async (id: string) => {
      await removeItem("goals", id);
    },
    {
      onError: (e: any) =>
        showToast?.(`Failed to delete goal: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const allGoals: any[] = state.goals || [];
  const totalTarget = allGoals.reduce((s: number, g: any) => s + Number(g.targetAmount || 0), 0);
  const totalSaved = allGoals.reduce((s: number, g: any) => s + Number(g.currentAmount || 0), 0);
  const totalRemaining = Math.max(0, totalTarget - totalSaved);

  const totalMonthlyRequired = allGoals.reduce((s: number, g: any) => {
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

  const completedCount = allGoals.filter(
    (g: any) => Number(g.targetAmount) > 0 && Number(g.currentAmount) >= Number(g.targetAmount)
  ).length;

  const onTrackCount = allGoals.filter((g: any) => {
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

  const behindCount = Math.max(0, allGoals.length - completedCount - onTrackCount);

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
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (g.name || "").toLowerCase().includes(q);
        const matchCat = (g.category || "").toLowerCase().includes(q);
        if (!matchName && !matchCat) return false;
      }
      return true;
    });
  }, [allGoals, filterPriority, filterCategory, searchQuery]);

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

  return (
    <div className="tab-content-enter">
      <SectionTitle
        sub="Plan and track life milestones — retirement freedom, real estate, education, and wealth"
        rightElement={
          allGoals.length > 0 && (
            <Button variant="accent" icon={<Plus size={14} />} onClick={() => setShow(true)}>
              Add Goal
            </Button>
          )
        }
      >
        Financial Goals
      </SectionTitle>

      {allGoals.length > 0 && (
        <>
          {/* Hero Portfolio Cockpit */}
          <Card
            variant="base"
            style={{
              marginBottom: 20,
              padding: "clamp(24px, 4vw, 36px)",
              background:
                "linear-gradient(135deg, color-mix(in srgb, var(--surface-0) 94%, var(--t-accent) 6%), var(--surface-0))",
              border: `1px solid ${THEME.line}`,
              borderTop: `4px solid ${THEME.accent}`,
              borderRadius: "var(--radius-xl)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: -40,
                right: -40,
                width: 180,
                height: 180,
                borderRadius: "50%",
                background: `radial-gradient(circle, color-mix(in srgb, ${THEME.accent} 15%, transparent) 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 20,
              }}
            >
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: THEME.muted,
                    marginBottom: 6,
                  }}
                >
                  <Activity size={14} color={THEME.accent} /> Overall Portfolio Completion
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(36px, 5vw, 56px)",
                    fontWeight: 900,
                    color: THEME.ink,
                    letterSpacing: "-0.03em",
                    lineHeight: 1.05,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {animatedOverallPct.toFixed(1)}%
                </div>
                <div style={{ fontSize: 13, color: THEME.muted, marginTop: 6, fontWeight: 600 }}>
                  <Money value={totalSaved} variant="full" /> saved of{" "}
                  <Money value={totalTarget} variant="full" /> target across {allGoals.length} goal
                  {allGoals.length !== 1 ? "s" : ""}
                </div>
              </div>

              {/* Quick Status Chips */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${THEME.sage} 25%, transparent)`,
                    color: THEME.sage,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle2 size={13} /> {completedCount} Done
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: "var(--radius-sm)",
                    background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${THEME.accent} 25%, transparent)`,
                    color: THEME.accent,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <TrendingUp size={13} /> {onTrackCount} On Track
                </span>
                {behindCount > 0 && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 12px",
                      borderRadius: "var(--radius-sm)",
                      background: `color-mix(in srgb, ${THEME.rust} 12%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${THEME.rust} 25%, transparent)`,
                      color: THEME.rust,
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    <AlertTriangle size={13} /> {behindCount} Behind
                  </span>
                )}
              </div>
            </div>

            {/* Overall Progress Gradient Track */}
            <div style={{ marginTop: 20 }}>
              <div
                style={{
                  height: 10,
                  borderRadius: "var(--radius-full)",
                  background: "var(--t-line)",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(overallPct, 100)}%`,
                    background: `linear-gradient(90deg, ${THEME.accent}, ${THEME.sage})`,
                    borderRadius: "var(--radius-full)",
                    transition: "width 0.8s var(--ease-premium)",
                  }}
                />
              </div>
            </div>
          </Card>

          {/* Secondary Stats Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
              marginBottom: 24,
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
              label="Remaining Gap"
              value={fmtINRFull(totalRemaining)}
              numericValue={totalRemaining}
              formatValue={fmtINRFull}
              icon={<TrendingDown />}
              color={totalRemaining > 0 ? THEME.rust : THEME.sage}
            />
            <StatCard
              label="Monthly Savings Needed"
              value={
                totalMonthlyRequired > 0
                  ? fmtINRFull(totalMonthlyRequired)
                  : completedCount === allGoals.length
                    ? "All Goals Funded!"
                    : behindCount > 0
                      ? "Behind Schedule"
                      : "On Track"
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
                    : THEME.gold
              }
            />
          </div>

          {/* View Controls & Filter Bar */}
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
            {/* View Mode Switcher */}
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
                onClick={() => setViewMode("table")}
                className={`demat-portfolio-pill ${viewMode === "table" ? "active" : ""}`}
                title="High-Density Table View"
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px" }}
              >
                <TableIcon size={13} /> Table
              </button>
            </div>

            {/* Search and Filters */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
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
                  placeholder="Search goals..."
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
                        ? { background: PRIORITY_COLOR[p], borderColor: PRIORITY_COLOR[p] }
                        : {}),
                    }}
                  >
                    {p === "all" ? "All Pri" : p}
                  </button>
                ))}
              </div>

              {/* Inflation Toggle */}
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
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
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
        </>
      )}

      {/* Goal Render Views */}
      {allGoals.length === 0 ? (
        <GoalEmptyState onAdd={() => setShow(true)} />
      ) : sortedGoals.length === 0 ? (
        <Card style={{ padding: 48, textAlign: "center" }}>
          <EmptyHint text="No goals match your search or filter criteria." />
        </Card>
      ) : viewMode === "roadmap" ? (
        /* ROADMAP TIMELINE VIEW */
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {(() => {
            const groups: Record<string, any[]> = {
              "Near-Term (< 1 Year)": [],
              "Medium-Term (1 - 3 Years)": [],
              "Long-Term (3+ Years)": [],
              "Completed & Milestone Achieved": [],
              "No Set Deadline": [],
            };

            sortedGoals.forEach((g) => {
              const progress = Number(g.targetAmount)
                ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100
                : 0;
              if (progress >= 100) {
                groups["Completed & Milestone Achieved"].push(g);
                return;
              }
              if (!g.targetDate) {
                groups["No Set Deadline"].push(g);
                return;
              }
              const ml = monthsBetween(today(), g.targetDate);
              if (ml <= 12) groups["Near-Term (< 1 Year)"].push(g);
              else if (ml <= 36) groups["Medium-Term (1 - 3 Years)"].push(g);
              else groups["Long-Term (3+ Years)"].push(g);
            });

            return Object.entries(groups).map(([title, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={title} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: THEME.muted,
                      marginBottom: 12,
                      paddingLeft: 4,
                    }}
                  >
                    <Clock size={14} color={THEME.accent} /> {title} ({items.length})
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
                    {items.map((g) => renderGoalCard(g))}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      ) : viewMode === "table" ? (
        /* COMPACT HIGH-DENSITY TABLE VIEW */
        <Card style={{ overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface-1)", borderBottom: `1.5px solid ${THEME.line}` }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Goal Name</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Category</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Priority</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Target</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Saved</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", minWidth: 140 }}>Progress</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Deadline</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedGoals.map((g) => {
                  const targetAmt = Number(g.targetAmount || 0);
                  const savedAmt = Number(g.currentAmount || 0);
                  const progress = targetAmt > 0 ? (savedAmt / targetAmt) * 100 : 0;
                  const isDone = progress >= 100;
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
                          <span>{CATEGORY_ICONS[g.category] || "🎯"}</span>
                          <span>{g.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", color: THEME.muted, fontSize: 12 }}>
                        {g.category || "General"}
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
                        <Money value={targetAmt} variant="full" />
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 800, color: THEME.sage }}>
                        <Money value={savedAmt} variant="full" />
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
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
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
    </div>
  );

  // Helper render for Goal Card
  function renderGoalCard(g: any) {
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
    const rc = ringColor(progress);

    return (
      <div
        key={g.id}
        className="card-lift"
        style={{
          padding: 22,
          background: "var(--surface-0)",
          border: `1px solid ${THEME.line}`,
          borderTop: `4px solid ${isComplete ? THEME.sage : PRIORITY_COLOR[g.priority] || THEME.accent}`,
          borderRadius: "var(--radius-xl)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 16,
          boxShadow: "var(--shadow-xs)",
        }}
      >
        <div>
          {/* Header Row: Category Badge, Priority Tag, and Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14 }}>{CATEGORY_ICONS[g.category] || "🎯"}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: THEME.muted,
                }}
              >
                {g.category || "General"}
              </span>
              {g.priority && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: PRIORITY_COLOR[g.priority] || THEME.muted,
                    background: `color-mix(in srgb, ${PRIORITY_COLOR[g.priority] || THEME.muted} 12%, transparent)`,
                    border: `1px solid color-mix(in srgb, ${PRIORITY_COLOR[g.priority] || THEME.muted} 25%, transparent)`,
                    borderRadius: 4,
                    padding: "1px 6px",
                  }}
                >
                  {g.priority}
                </span>
              )}
            </div>

            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {isComplete ? (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    background: `color-mix(in srgb, ${THEME.sage} 15%, transparent)`,
                    color: THEME.sage,
                    border: `1px solid color-mix(in srgb, ${THEME.sage} 30%, transparent)`,
                    borderRadius: 6,
                    padding: "2px 8px",
                  }}
                >
                  COMPLETED
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
                    padding: "2px 8px",
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

          {/* Goal Title and Dates */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: THEME.ink, letterSpacing: "-0.01em" }}>
              {g.name}
            </div>
            <div style={{ display: "flex", gap: 10, fontSize: 11, color: THEME.muted, marginTop: 4, flexWrap: "wrap" }}>
              {g.startDate && <span>Started: {fmtGoalDate(g.startDate)}</span>}
              {g.targetDate && (
                <span>
                  Target: {fmtGoalDate(g.targetDate)} ·{" "}
                  <strong style={{ color: rawMonthsLeft < 0 ? THEME.rust : THEME.ink }}>
                    {rawMonthsLeft < 0 ? "Overdue" : `${monthsLeft}m left`}
                  </strong>
                </span>
              )}
            </div>
          </div>

          {/* Amount and Circular Progress */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 14 }}>
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
              const r = 26,
                sz = 68,
                cx = sz / 2;
              const circ = 2 * Math.PI * r;
              const dashOff = circ * (1 - Math.min(progress, 100) / 100);
              return (
                <svg width={sz} height={sz} style={{ flexShrink: 0 }}>
                  <circle cx={cx} cy={cx} r={r} fill="none" stroke={THEME.line} strokeWidth="5.5" />
                  <circle
                    cx={cx}
                    cy={cx}
                    r={r}
                    fill="none"
                    stroke={rc}
                    strokeWidth="5.5"
                    strokeDasharray={circ}
                    strokeDashoffset={dashOff}
                    strokeLinecap="round"
                    style={{
                      transformOrigin: `${cx}px ${cx}px`,
                      transform: "rotate(-90deg)",
                      transition: "stroke-dashoffset 0.6s ease",
                    }}
                  />
                  <text x={cx} y={cx + 4} textAnchor="middle" fontSize="12" fontWeight="800" fill={rc}>
                    {Math.min(Math.round(progress), 100)}%
                  </text>
                </svg>
              );
            })()}
          </div>

          {/* Milestone Checkpoints (25, 50, 75, 100%) */}
          <div style={{ marginBottom: 14 }}>
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
                      gap: 2,
                    }}
                  >
                    {reached ? "✓" : "○"} {m}%
                  </span>
                );
              })}
            </div>
            <div style={{ height: 5, borderRadius: 3, background: "var(--t-line)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(progress, 100)}%`,
                  background: isComplete ? THEME.sage : `linear-gradient(90deg, ${THEME.accent}, ${rc})`,
                  borderRadius: 3,
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
                marginBottom: 10,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", color: THEME.muted, marginBottom: 6 }}>
                Quick Top-Up
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {[5000, 10000, 25000, 50000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => addContribution(g.id, g.currentAmount, amt)}
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
                      if (e.key === "Enter") addContribution(g.id, g.currentAmount);
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
                    onClick={() => addContribution(g.id, g.currentAmount)}
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

        {/* Footer: Monthly Needed & SIP Expansion */}
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
                SIP Planner {sipExpanded.has(g.id) ? "▲" : "▼"}
              </button>
            </div>

            {sipExpanded.has(g.id) && (
              <div
                style={{
                  marginTop: 8,
                  padding: 10,
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface-1)",
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <div style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", color: THEME.muted, marginBottom: 6 }}>
                  Monthly SIP Required by Expected CAGR
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {[10, 12, 15].map((rate) => {
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
                        <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700 }}>{rate}%</div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: THEME.accent }}>{fmtINR(sip)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}
