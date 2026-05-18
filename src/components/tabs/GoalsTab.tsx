// @ts-nocheck
import React, { useState } from "react";
import { Plus, Pencil, Trash2, Flag, TrendingUp, Sparkles } from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, today, monthsBetween } from "../../utils/finance";
import { GoalModal } from "../modals/GoalModal";
import { StatCard } from "../ui/StatCard";
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
  <Card style={{ padding: "64px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
    <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#d97706 0%,#fbbf24 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 20px rgba(217,119,6,0.2)" }}>
      <Flag size={28} color="#fff" />
    </div>
    <div>
      <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, letterSpacing: "-0.02em" }}>No Goals Added Yet</h3>
      <p style={{ fontSize: 14, color: THEME.muted, maxWidth: 420, lineHeight: 1.6, margin: "0 auto" }}>
        Set financial goals — a house down payment, retirement corpus, car, education, or emergency fund — and watch your progress every day.
      </p>
    </div>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
      {["Retirement Planning", "Home Down Payment", "Education Fund", "Emergency Reserve"].map(f => (
        <Badge key={f} variant="muted" style={{ padding: "6px 14px", fontSize: 11 }}>● {f}</Badge>
      ))}
    </div>
    <Button variant="accent" size="lg" icon={<Plus size={18} />} onClick={onAdd} style={{ marginTop: 8 }}>
      Set Your First Goal
    </Button>
  </Card>
);

const PRIORITY_ORDER: Record<string, number> = { High: 3, Medium: 2, Low: 1 };
const PRIORITY_COLOR: Record<string, string> = { High: "#ef4444", Medium: "#f59e0b", Low: "#22c55e" };

export function GoalsTab({ state, addItem, removeItem, updateItem }: any) {
  const [show, setShow] = useState(false);
  const [editGoal, setEditGoal] = useState<any>(null);
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [filterPriority, setFilterPriority] = useState<string>("all");

  const totalTarget = state.goals.reduce((s: number, g: any) => s + Number(g.targetAmount || 0), 0);
  const totalSaved = state.goals.reduce((s: number, g: any) => s + Number(g.currentAmount || 0), 0);
  const totalRemaining = Math.max(0, totalTarget - totalSaved);
  const overallPct = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;
  
  const completedCount = state.goals.filter((g: any) => Number(g.targetAmount) > 0 && Number(g.currentAmount) >= Number(g.targetAmount)).length;
  
  const onTrackCount = state.goals.filter((g: any) => {
    const progress = Number(g.targetAmount) ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100 : 0;
    if (progress >= 100) return false;
    if (!g.targetDate) return true;
    const elapsed = g.startDate ? monthsBetween(g.startDate, today()) : 0;
    const rem = Math.max(0, monthsBetween(today(), g.targetDate));
    const total = elapsed + rem;
    const expectedPct = total > 0 ? (elapsed / total) * 100 : 0;
    return progress >= expectedPct - 10;
  }).length;
  
  const behindCount = state.goals.length - completedCount - onTrackCount;

  const priBreakdown = (["High", "Medium", "Low"] as const).map(p => {
    const gs = state.goals.filter((g: any) => (g.priority || "Medium") === p);
    return {
      priority: p,
      count: gs.length,
      target: gs.reduce((s: number, g: any) => s + Number(g.targetAmount || 0), 0),
      saved: gs.reduce((s: number, g: any) => s + Number(g.currentAmount || 0), 0),
    };
  });

  const sortedGoals = [...state.goals]
    .filter(g => filterPriority === "all" || (g.priority || "Medium") === filterPriority)
    .sort((a, b) => {
      const pa = PRIORITY_ORDER[a.priority] ?? 2;
      const pb = PRIORITY_ORDER[b.priority] ?? 2;
      return sortDir === "desc" ? pb - pa : pa - pb;
    });

  const ringColor = (pct: number) =>
    pct >= 100 ? THEME.sage : pct >= 75 ? THEME.gold : pct >= 40 ? THEME.accent : THEME.rust;

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
        Goals & Future Planning
      </SectionTitle>

      {state.goals.length > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 28 }}>
            <StatCard 
              icon={<Flag />} 
              label="Total Target" 
              value={fmtINRFull(totalTarget)} 
              color={THEME.accent}
              sub={`${state.goals.length} active goals`}
            />
            <StatCard 
              icon={<TrendingUp />} 
              label="Saved So Far" 
              value={fmtINRFull(totalSaved)} 
              color={THEME.sage}
              sub={`${overallPct.toFixed(1)}% of global target`}
            />
            <StatCard 
              icon={<Flag />} 
              label="Balance Left" 
              value={fmtINRFull(totalRemaining)} 
              color={THEME.rust}
              sub="Required capital to finish"
            />
            <StatCard 
              icon={<Sparkles />} 
              label="Status" 
              value={onTrackCount + completedCount} 
              color={ringColor(overallPct)}
              sub={`${onTrackCount} on track, ${completedCount} done`}
            />
          </div>

          <Card style={{ marginBottom: 32, padding: 28 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16, fontWeight: 700 }}>Portfolio Completion — {overallPct.toFixed(1)}% achieved</div>
            <div style={{ height: 12, background: THEME.line, borderRadius: 6, overflow: "hidden", marginBottom: 16 }}>
              <div style={{
                height: "100%",
                width: `${Math.min(overallPct, 100)}%`,
                background: `linear-gradient(90deg, ${ringColor(overallPct)}, color-mix(in srgb, ${ringColor(overallPct)} 70%, white))`,
                borderRadius: 6,
                transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)",
              }} />
            </div>
            <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
              <Badge variant="sage">✓ {completedCount} completed</Badge>
              <Badge variant="accent">↑ {onTrackCount} on track</Badge>
              {behindCount > 0 && <Badge variant="rust">⚠ {behindCount} behind</Badge>}
            </div>

            <div style={{ borderTop: `1px solid ${THEME.line}`, paddingTop: 24 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: THEME.muted, marginBottom: 20, fontWeight: 700 }}>Breakdown by Priority</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                {priBreakdown.map(p => {
                  const pPct = p.target > 0 ? (p.saved / p.target) * 100 : 0;
                  return (
                    <div key={p.priority} style={{
                      padding: "16px 20px",
                      borderRadius: 14,
                      border: `1.5px solid ${THEME.line}`,
                      background: "rgba(128,128,128,0.02)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: PRIORITY_COLOR[p.priority], textTransform: "uppercase", letterSpacing: "0.1em" }}>{p.priority}</span>
                        <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>{p.count} goal{p.count !== 1 ? "s" : ""}</span>
                      </div>
                      <div style={{ height: 6, background: THEME.line, borderRadius: 3, marginBottom: 12, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(pPct, 100)}%`, background: PRIORITY_COLOR[p.priority], borderRadius: 3, transition: "width 0.6s ease" }} />
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted }}>
                        <span style={{ color: THEME.ink, fontWeight: 800 }}>{fmtINRFull(p.saved)}</span>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>Filter:</span>
            {(["all", "High", "Medium", "Low"] as const).map(p => (
              <Button
                key={p}
                size="sm"
                variant={filterPriority === p ? "accent" : "ghost"}
                onClick={() => setFilterPriority(p)}
                style={{
                  padding: "4px 14px",
                  height: 32,
                  ...(filterPriority !== p && p !== "all" ? { color: PRIORITY_COLOR[p], borderColor: `${PRIORITY_COLOR[p]}33` } : {}),
                  ...(filterPriority === p && p !== "all" ? { background: PRIORITY_COLOR[p], borderColor: PRIORITY_COLOR[p] } : {})
                }}
              >
                {p === "all" ? "All" : p}
              </Button>
            ))}
            <div style={{ width: 1, height: 20, background: THEME.line, margin: "0 4px" }} />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
              style={{ height: 32 }}
            >
              {sortDir === "desc" ? "High → Low" : "Low → High"}
            </Button>
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
            const progress = Number(g.targetAmount)
              ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100
              : 0;
            const isComplete = progress >= 100;
            const monthsLeft = g.targetDate
              ? Math.max(0, monthsBetween(today(), g.targetDate))
              : 0;
            const remaining = Math.max(0, Number(g.targetAmount) - Number(g.currentAmount));
            const monthlyNeeded = monthsLeft > 0 ? remaining / monthsLeft : 0;
            const elapsed = g.startDate ? monthsBetween(g.startDate, today()) : 0;
            const totalDuration = elapsed + monthsLeft;
            const expectedPct = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;
            const isBehind = !isComplete && g.targetDate && progress < expectedPct - 10;
            const rc = ringColor(progress);

            return (
              <Card key={g.id} style={{ border: isComplete ? `1.5px solid ${THEME.sage}44` : undefined, padding: 24 }}>
                {/* Header Row: Category/Priority Tags & Action Badges/Buttons */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted }}>{g.category}</div>
                    {g.priority && (
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: PRIORITY_COLOR[g.priority] || THEME.muted, border: `1px solid ${PRIORITY_COLOR[g.priority] || THEME.muted}`, borderRadius: 4, padding: "1px 6px" }}>
                        {g.priority}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    {isComplete && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: `${THEME.sage}22`, color: THEME.sage, border: `1px solid ${THEME.sage}55`, borderRadius: 6, padding: "2px 8px", letterSpacing: "0.1em" }}>
                        COMPLETED
                      </span>
                    )}
                    {isBehind && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: `${THEME.rust}15`, color: THEME.rust, border: `1px solid ${THEME.rust}44`, borderRadius: 6, padding: "2px 8px", letterSpacing: "0.1em" }}>
                        BEHIND
                      </span>
                    )}
                    <button onClick={() => setEditGoal(g)} style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted, display: "inline-flex", alignItems: "center", padding: 4, borderRadius: 6 }} title="Edit Goal">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => removeItem("goals", g.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted, display: "inline-flex", alignItems: "center", padding: 4, borderRadius: 6 }} title="Delete Goal">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Content Row: Goal Name, Start/Target Dates, Current/Target Amounts */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: 800 }}>{g.name}</div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 6, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {g.startDate && <span>Started: {g.startDate}</span>}
                      {g.targetDate && <span>Target: {g.targetDate} · {monthsLeft}m left</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 800 }}>
                      {fmtINRFull(g.currentAmount)}{" "}
                      <span style={{ color: THEME.muted, fontSize: 15 }}>/ {fmtINRFull(g.targetAmount)}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: rc, marginTop: 4 }}>{progress.toFixed(1)}% reached</div>
                  </div>
                </div>

                {/* Progress Details Row */}
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  {(() => {
                    const r = 36, sz = 88, cx = sz / 2;
                    const circ = 2 * Math.PI * r;
                    const dashOff = circ * (1 - Math.min(progress, 100) / 100);
                    return (
                      <svg width={sz} height={sz} style={{ flexShrink: 0 }}>
                        <circle cx={cx} cy={cx} r={r} fill="none" stroke={THEME.line} strokeWidth="7" />
                        <circle cx={cx} cy={cx} r={r} fill="none" stroke={rc} strokeWidth="7"
                          strokeDasharray={circ} strokeDashoffset={dashOff} strokeLinecap="round"
                          style={{ transformOrigin: `${cx}px ${cx}px`, transform: "rotate(-90deg)", transition: "stroke-dashoffset 0.6s ease" }}
                        />
                        <text x={cx} y={cx - 4} textAnchor="middle" fontSize="13" fontWeight="800" fill={rc}>{Math.min(Math.round(progress), 100)}%</text>
                        <text x={cx} y={cx + 12} textAnchor="middle" fontSize="9" fill={THEME.muted}>{isComplete ? "DONE!" : "done"}</text>
                      </svg>
                    );
                  })()}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8, fontSize: 12 }}>
                      <div><div style={{ color: THEME.muted }}>Saved so far</div><div style={{ fontWeight: 700, color: THEME.sage }}>{fmtINRFull(g.currentAmount)}</div></div>
                      <div><div style={{ color: THEME.muted }}>Remaining</div><div style={{ fontWeight: 700, color: THEME.rust }}>{fmtINRFull(remaining)}</div></div>
                      {g.targetDate && <div><div style={{ color: THEME.muted }}>Months left</div><div style={{ fontWeight: 700 }}>{monthsLeft}</div></div>}
                    </div>
                    {monthlyNeeded > 0 && (
                      <div style={{ marginTop: 10, fontSize: 13, color: THEME.ink }}>
                        → Save <b>{fmtINRFull(monthlyNeeded)}</b>/month to hit target on time.
                      </div>
                    )}
                    {isBehind && (
                      <div style={{ marginTop: 6, fontSize: 12, color: THEME.rust }}>
                        Expected {expectedPct.toFixed(0)}% by now — you are {(expectedPct - progress).toFixed(0)}% behind schedule.
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {show && (
        <GoalModal
          onClose={() => setShow(false)}
          onSave={(v: any) => { addItem("goals", v); setShow(false); }}
        />
      )}
      {editGoal && (
        <GoalModal
          initial={editGoal}
          onClose={() => setEditGoal(null)}
          onSave={(v: any) => { updateItem("goals", editGoal.id, v); setEditGoal(null); }}
        />
      )}
    </div>
  );
}
