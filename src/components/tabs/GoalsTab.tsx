// @ts-nocheck
import React, { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, TrendingUp, Target } from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, today, monthsBetween } from "../../utils/finance";
import { GoalModal } from "../modals/GoalModal";

// Internal helper components
const SectionTitle = ({ children, sub }: { children: React.ReactNode; sub?: string }) => (
  <div style={{ marginBottom: 32 }}>
    <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", margin: 0 }}>{children}</h2>
    {sub && <p style={{ color: THEME.muted, fontSize: 13, marginTop: 4 }}>{sub}</p>}
  </div>
);

const EmptyHint = ({ text }: { text: string }) => (
  <div style={{ padding: "40px 20px", textAlign: "center", color: THEME.muted }}>
    <Target size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
    <div style={{ fontSize: 14 }}>{text}</div>
  </div>
);

const btnSolid = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 16px",
  background: THEME.accent,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const btnOutline = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 16px",
  background: "transparent",
  color: THEME.ink,
  border: `1px solid ${THEME.line}`,
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const card = {
  background: "var(--t-darkInk)",
  borderRadius: 12,
  border: `1px solid ${THEME.line}`,
  padding: 20,
};

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
    <div>
      <SectionTitle sub="What the money is for — down payments, retirement, freedom">
        Goals & Future Planning
      </SectionTitle>

      {state.goals.length > 0 && (
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 16, marginBottom: 18 }}>
            {[
              { label: "Total Goals", value: String(state.goals.length), color: THEME.ink },
              { label: "Total Target", value: fmtINRFull(totalTarget), color: THEME.ink },
              { label: "Saved So Far", value: fmtINRFull(totalSaved), color: THEME.sage },
              { label: "Balance Left", value: fmtINRFull(totalRemaining), color: THEME.rust },
              { label: "Overall Achieved", value: `${overallPct.toFixed(1)}%`, color: ringColor(overallPct) },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ padding: "12px 0" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: THEME.muted, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color, fontFamily: "'Inter', sans-serif" }}>{value}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ height: 10, background: THEME.line, borderRadius: 6, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(overallPct, 100)}%`,
                background: `linear-gradient(90deg, ${ringColor(overallPct)}, color-mix(in srgb, ${ringColor(overallPct)} 70%, white))`,
                borderRadius: 6,
                transition: "width 0.7s cubic-bezier(0.22,1,0.36,1)",
              }} />
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: THEME.sage, fontWeight: 600 }}>✓ {completedCount} completed</span>
              <span style={{ fontSize: 12, color: THEME.accent, fontWeight: 600 }}>↑ {onTrackCount} on track</span>
              {behindCount > 0 && <span style={{ fontSize: 12, color: THEME.rust, fontWeight: 600 }}>⚠ {behindCount} behind</span>}
            </div>
          </div>

          <div style={{ borderTop: `1px solid ${THEME.line}`, paddingTop: 14 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: THEME.muted, marginBottom: 10 }}>Breakdown by Priority</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {priBreakdown.map(p => {
                const pPct = p.target > 0 ? (p.saved / p.target) * 100 : 0;
                return (
                  <div key={p.priority} style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: `1.5px solid ${PRIORITY_COLOR[p.priority]}22`,
                    background: `${PRIORITY_COLOR[p.priority]}0a`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: PRIORITY_COLOR[p.priority], textTransform: "uppercase", letterSpacing: "0.1em" }}>{p.priority}</span>
                      <span style={{ fontSize: 11, color: THEME.muted }}>{p.count} goal{p.count !== 1 ? "s" : ""}</span>
                    </div>
                    <div style={{ height: 4, background: THEME.line, borderRadius: 3, marginBottom: 6, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min(pPct, 100)}%`, background: PRIORITY_COLOR[p.priority], borderRadius: 3, transition: "width 0.6s ease" }} />
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>
                      <span style={{ color: THEME.sage, fontWeight: 600 }}>{fmtINRFull(p.saved)}</span>
                      <span> / {fmtINRFull(p.target)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {(["all", "High", "Medium", "Low"] as const).map(p => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              style={{
                ...btnOutline,
                fontSize: 11,
                padding: "6px 12px",
                background: filterPriority === p ? (p === "all" ? THEME.accent : PRIORITY_COLOR[p]) : "transparent",
                color: filterPriority === p ? "#fff" : (p === "all" ? THEME.ink : PRIORITY_COLOR[p]),
                borderColor: p === "all" ? THEME.line : PRIORITY_COLOR[p],
                fontWeight: 700,
              }}
            >
              {p === "all" ? "All" : p}
            </button>
          ))}
          <button
            onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
            style={{ ...btnOutline, fontSize: 11, padding: "6px 12px" }}
          >
            {sortDir === "desc" ? "High → Low" : "Low → High"}
          </button>
        </div>
        <button style={btnSolid} onClick={() => setShow(true)}>
          <Plus size={14} /> Add Goal
        </button>
      </div>

      {state.goals.length === 0 ? (
        <div style={card}>
          <EmptyHint text="Set a goal — retirement, house, car, travel, emergency fund…" />
        </div>
      ) : sortedGoals.length === 0 ? (
        <div style={card}>
          <EmptyHint text={`No ${filterPriority} priority goals yet.`} />
        </div>
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
              <div key={g.id} style={{ ...card, position: "relative", border: isComplete ? `1.5px solid ${THEME.sage}44` : undefined }}>
                <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8, alignItems: "center" }}>
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
                  <button onClick={() => setEditGoal(g)} style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => removeItem("goals", g.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted }}>
                    <Trash2 size={14} />
                  </button>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 240 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 10, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted }}>{g.category}</div>
                      {g.priority && (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: PRIORITY_COLOR[g.priority] || THEME.muted, border: `1px solid ${PRIORITY_COLOR[g.priority] || THEME.muted}`, borderRadius: 4, padding: "1px 6px" }}>
                          {g.priority}
                        </span>
                      )}
                    </div>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, fontWeight: 800, marginTop: 4 }}>{g.name}</div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4, display: "flex", gap: 12, flexWrap: "wrap" }}>
                      {g.startDate && <span>Started: {g.startDate}</span>}
                      {g.targetDate && <span>Target: {g.targetDate} · {monthsLeft}m left</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 22, fontWeight: 800 }}>
                      {fmtINRFull(g.currentAmount)}{" "}
                      <span style={{ color: THEME.muted, fontSize: 15 }}>/ {fmtINRFull(g.targetAmount)}</span>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: rc }}>{progress.toFixed(1)}% reached</div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16 }}>
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
              </div>
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
