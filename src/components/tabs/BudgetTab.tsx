// @ts-nocheck
import React, { useState, useMemo } from "react";
import { AlertCircle, Plus, Wallet, Receipt, TrendingUp, Target, Pencil, Trash2, BarChart2 } from "lucide-react";
import { THEME, PROFILES } from "../../utils/constants";
import { fmtINR, fmtINRFull } from "../../utils/finance";
import { useMasterData } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { StatCard } from "../ui/StatCard";
import { SectionTitle } from "../ui/SectionTitle";

// Internal helper components




const BudgetEmptyState = ({ onAdd }: any) => (
  <div style={{ padding: "60px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
    <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#db2777 0%,#f472b6 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <BarChart2 size={28} color="#fff" />
    </div>
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>No Budgets Set Yet</div>
      <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 380 }}>Set monthly spending limits per category — Food, Rent, Entertainment, Transport — and get real-time alerts before you overspend.</div>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      {["Category Budgets", "Monthly Limits", "Spend vs Budget", "Burn Rate Chart"].map(f => (
        <span key={f} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 20, background: "rgba(219,39,119,0.08)", color: "#db2777", fontWeight: 600, border: "1px solid rgba(219,39,119,0.15)" }}>● {f}</span>
      ))}
    </div>
    <button style={{ marginTop: 8, padding: "10px 24px", background: "linear-gradient(135deg,#db2777 0%,#f472b6 100%)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }} onClick={onAdd}>
      <Plus size={16} /> Create First Budget
    </button>
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

const input = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--t-paper)",
  border: `1.5px solid ${THEME.line}`,
  borderRadius: 10,
  color: THEME.ink,
  fontSize: 14,
};

const card = {
  background: "var(--surface-0)",
  borderRadius: 12,
  border: "1px solid var(--t-line)",
  padding: 20,
};

export function BudgetTab({ state, addItem, removeItem, updateItem }: any) {
  const [show, setShow] = useState(false);
  const [editBudget, setEditBudget] = useState<any>(null);
  const ym = useMemo(() => new Date().toISOString().slice(0, 7), []);

  const monthSpending = useMemo(() => {
    return state.transactions
      .filter((t: any) => t.date && t.date.startsWith(ym) && t.type === "debit")
      .reduce((acc: any, t: any) => {
        const cat = t.category || "Uncategorized";
        acc[cat] = (acc[cat] || 0) + Number(t.amount || 0);
        return acc;
      }, {});
  }, [state.transactions, ym]);

  const totalBudget = state.budgets.reduce((s: number, b: any) => s + Number(b.monthly || 0), 0);
  const totalSpent = state.budgets.reduce((s: number, b: any) => s + (monthSpending[b.category] || 0), 0);

  const overBudgetCount = state.budgets.filter((b: any) => {
    const spent = monthSpending[b.category] || 0;
    return spent > Number(b.monthly || 0);
  }).length;

  return (
    <div>
      {overBudgetCount > 0 && (
        <div style={{ background: "rgba(217,48,37,0.08)", border: `1px solid ${THEME.rust}`, borderRadius: 8, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10, color: THEME.rust }}>
          <AlertCircle size={16} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>⚠ {overBudgetCount} {overBudgetCount === 1 ? "category" : "categories"} over budget this month</span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <SectionTitle sub="Set monthly limits per category and track real spending">
          Budget Planner
        </SectionTitle>
        {state.budgets.length > 0 && (
          <button style={btnSolid} onClick={() => setShow(true)}>
            <Plus size={14} /> Add Budget
          </button>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard 
          icon={<Wallet />} 
          label="Total Budgeted" 
          value={fmtINRFull(totalBudget)} 
          color={THEME.accent}
          sub="Planned monthly limits"
        />
        <StatCard 
          icon={<Receipt />} 
          label="Spent This Month" 
          value={fmtINRFull(totalSpent)} 
          color={totalSpent > totalBudget ? THEME.rust : THEME.ink}
          sub={`Used ${((totalSpent / (totalBudget || 1)) * 100).toFixed(0)}% of total`}
        />
        <StatCard 
          icon={<TrendingUp />} 
          label="Remaining" 
          value={fmtINRFull(Math.max(0, totalBudget - totalSpent))} 
          color={totalBudget - totalSpent > 0 ? THEME.sage : THEME.rust}
          sub="Balance to spend"
        />
        <StatCard 
          icon={<Target />} 
          label="Categories" 
          value={state.budgets.length} 
          color={THEME.muted}
          sub="Active budget buckets"
        />
      </div>

      {totalBudget > 0 && (() => {
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const daysPassed = now.getDate();
        const monthElapsedPct = (daysPassed / daysInMonth) * 100;
        const spentPct = (totalSpent / totalBudget) * 100;
        const onTrack = spentPct <= monthElapsedPct + 5;
        const burnColor = spentPct > monthElapsedPct + 10 ? THEME.rust : spentPct > monthElapsedPct - 5 ? THEME.gold : THEME.sage;
        const r = 44, sz = 104, circ = 2 * Math.PI * r;
        return (
          <div style={{ ...card, marginBottom: 24 }}>
            <div style={{ fontSize: 11, letterSpacing: "0.25em", textTransform: "uppercase", color: THEME.muted, marginBottom: 16 }}>Budget Burn Rate — Day {daysPassed} of {daysInMonth}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <svg width={sz} height={sz}>
                  <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={THEME.line} strokeWidth="8" />
                  <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={THEME.muted} strokeWidth="8" opacity="0.3"
                    strokeDasharray={`${(monthElapsedPct/100)*circ} ${circ}`} strokeDashoffset={circ/4} strokeLinecap="round" />
                  <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={burnColor} strokeWidth="8"
                    strokeDasharray={`${Math.min(spentPct/100,1)*circ} ${circ}`} strokeDashoffset={circ/4} strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 0.6s ease" }} />
                  <text x={sz/2} y={sz/2-4} textAnchor="middle" fontSize="15" fontWeight="800" fill={burnColor}>{spentPct.toFixed(0)}%</text>
                  <text x={sz/2} y={sz/2+13} textAnchor="middle" fontSize="9" fill={THEME.muted}>spent</text>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "grid", gap: 10 }}>
                  {[
                    { label: "Month elapsed", val: monthElapsedPct.toFixed(0) + "%", color: THEME.muted },
                    { label: "Budget spent", val: spentPct.toFixed(0) + "%", color: burnColor },
                    { label: "Spent so far", val: fmtINRFull(totalSpent), color: THEME.ink },
                    { label: "Daily average", val: fmtINR(daysPassed > 0 ? totalSpent / daysPassed : 0) + "/day", color: THEME.muted },
                    { label: "Projected month-end", val: fmtINRFull(daysPassed > 0 ? (totalSpent / daysPassed) * daysInMonth : 0), color: burnColor },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: THEME.muted }}>{label}</span>
                      <span style={{ fontWeight: 700, color }}>{val}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, fontSize: 12, padding: "8px 12px", borderRadius: 6, background: onTrack ? "rgba(30,142,62,0.08)" : "rgba(217,48,37,0.08)", color: onTrack ? THEME.sage : THEME.rust, fontWeight: 600 }}>
                  {onTrack ? "✓ On track — spending in line with the month" : `⚠ Overpacing — spending faster than month progress`}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {state.budgets.length === 0 ? (
        <div style={card}>
          <BudgetEmptyState onAdd={() => setShow(true)} />
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {state.budgets.map((b: any) => {
            const spent = monthSpending[b.category] || 0;
            const budget = Number(b.monthly || 0);
            const pct = budget > 0 ? (spent / budget) * 100 : 0;
            const over = pct > 100;
            const barColor = over ? THEME.rust : pct > 95 ? "#F97316" : pct > 80 ? THEME.gold : pct > 50 ? "#A3E635" : THEME.sage;

            const nowDate = new Date();
            const daysPassed = nowDate.getDate();
            const daysInMonth = new Date(nowDate.getFullYear(), nowDate.getMonth() + 1, 0).getDate();
            const projected = daysPassed > 0 ? (spent / daysPassed) * daysInMonth : 0;
            const projectedPct = budget > 0 ? (projected / budget) * 100 : 0;
            const dailyAvg = daysPassed > 0 ? spent / daysPassed : 0;

            return (
              <div key={b.id} style={{ ...card, position: "relative" }}>
                <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8 }}>
                  <button onClick={() => setEditBudget(b)} style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted }}>
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => removeItem("budgets", b.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: THEME.muted }}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, paddingRight: 28 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{b.category}</div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                      {fmtINRFull(spent)} spent of {fmtINRFull(budget)} budget
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: over ? THEME.rust : THEME.ink }}>{pct.toFixed(0)}%</div>
                    <div style={{ fontSize: 11, color: over ? THEME.rust : THEME.sage, fontWeight: 600 }}>
                      {over ? fmtINR(spent - budget) + " over" : fmtINR(budget - spent) + " left"}
                    </div>
                  </div>
                </div>
                <div style={{ height: 8, background: THEME.line, borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
                  <div style={{ height: "100%", width: Math.min(pct, 100) + "%", background: barColor, borderRadius: 4, transition: "width 0.5s" }} />
                </div>
                {spent > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.muted, flexWrap: "wrap", gap: 4 }}>
                    <span>{fmtINR(dailyAvg)}/day avg · day {daysPassed}/{daysInMonth}</span>
                    <span style={{ fontWeight: 600, color: projectedPct > 110 ? THEME.rust : projectedPct > 90 ? THEME.gold : THEME.sage }}>
                      Projected: {fmtINR(projected)} ({projectedPct.toFixed(0)}%)
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {show && (
        <BudgetModal
          existing={state.budgets.map((b: any) => b.category)}
          onClose={() => setShow(false)}
          onSave={(v: any) => { addItem("budgets", v); setShow(false); }}
        />
      )}
      {editBudget && (
        <BudgetModal
          existing={state.budgets.filter((b: any) => b.id !== editBudget.id).map((b: any) => b.category)}
          initialValues={editBudget}
          onClose={() => setEditBudget(null)}
          onSave={(v: any) => { updateItem("budgets", editBudget.id, v); setEditBudget(null); }}
        />
      )}
    </div>
  );
}

export function BudgetModal({ onClose, onSave, initialValues = null }: any) {
  const { transactionCategories: allCats } = useMasterData();
  const [f, setF] = useState(initialValues ? { owner: initialValues.owner || "self", category: initialValues.category || allCats[0], monthly: initialValues.monthly || "" } : { owner: "self", category: allCats[0], monthly: "" });
  return (
    <Modal title={initialValues ? "Edit Budget" : "Add Budget"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select style={input} value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Category">
        <select style={input} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {allCats.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Monthly Limit (₹)">
        <input style={input} type="number" value={f.monthly} onChange={(e) => setF({ ...f, monthly: e.target.value })} placeholder="e.g. 5000" />
      </Field>
      <ModalActions onSave={() => f.monthly && onSave(f)} onClose={onClose} />
    </Modal>
  );
}
