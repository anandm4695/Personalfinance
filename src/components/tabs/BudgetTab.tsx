// @ts-nocheck
import React, { useState, useMemo } from "react";
import { AlertCircle, Plus, Wallet, Receipt, TrendingUp, Target, Pencil, Trash2, BarChart2, Check } from "lucide-react";
import { THEME, PROFILES } from "../../utils/constants";
import { fmtINR, fmtINRFull } from "../../utils/finance";
import { useMasterData } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { StatCard } from "../ui/StatCard";
import { SectionTitle } from "../ui/SectionTitle";
import { Badge } from "../ui/Badge";

// Internal helper components




const BudgetEmptyState = ({ onAdd }: any) => (
  <Card style={{ padding: "60px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
    <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#db2777 0%,#f472b6 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(219, 39, 119, 0.2)" }}>
      <BarChart2 size={28} color="#fff" />
    </div>
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, letterSpacing: "-0.02em" }}>No Budgets Set Yet</div>
      <div style={{ fontSize: 14, color: THEME.muted, maxWidth: 380, lineHeight: 1.6 }}>Set monthly spending limits per category — Food, Rent, Entertainment, Transport — and get real-time alerts before you overspend.</div>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      {["Category Budgets", "Monthly Limits", "Spend vs Budget", "Burn Rate Chart"].map(f => (
        <Badge key={f} variant="muted" style={{ padding: "6px 14px", fontSize: 11 }}>● {f}</Badge>
      ))}
    </div>
    <Button onClick={onAdd} variant="accent" size="lg" icon={<Plus size={18} />}>Create First Budget</Button>
  </Card>
);


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
    <div className="tab-content-enter">
      {overBudgetCount > 0 && (
        <Card style={{ background: "rgba(217,48,37,0.04)", border: `1px solid ${THEME.rust}44`, padding: "12px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12, color: THEME.rust }}>
          <AlertCircle size={18} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>{overBudgetCount} {overBudgetCount === 1 ? "category" : "categories"} over budget this month</span>
        </Card>
      )}
      <SectionTitle 
        sub="Set monthly limits per category and track real spending"
        rightElement={
          state.budgets.length > 0 && (
            <Button onClick={() => setShow(true)} variant="accent" icon={<Plus size={14} />}>
              Add Budget
            </Button>
          )
        }
      >
        Budget Planner
      </SectionTitle>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 28 }}>
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
          color={totalSpent > totalBudget ? THEME.rust : THEME.accent}
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
          value={String(state.budgets.length)} 
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
        const r = 44, sz = 110, circ = 2 * Math.PI * r;
        return (
          <Card style={{ marginBottom: 32, padding: "28px 32px" }}>
            <div style={{ fontSize: 10, letterSpacing: "0.2em", textTransform: "uppercase", color: THEME.muted, marginBottom: 24, fontWeight: 800 }}>Budget Burn Rate — Day {daysPassed} of {daysInMonth}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 48, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <svg width={sz} height={sz} style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.05))" }}>
                  <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={THEME.line} strokeWidth="10" />
                  <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={THEME.muted} strokeWidth="10" opacity="0.15"
                    strokeDasharray={`${(monthElapsedPct/100)*circ} ${circ}`} strokeDashoffset={circ/4} strokeLinecap="round" />
                  <circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={burnColor} strokeWidth="10"
                    strokeDasharray={`${Math.min(spentPct/100,1)*circ} ${circ}`} strokeDashoffset={circ/4} strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }} />
                  <text x={sz/2} y={sz/2-4} textAnchor="middle" fontSize="18" fontWeight="900" fill={THEME.ink}>{spentPct.toFixed(0)}%</text>
                  <text x={sz/2} y={sz/2+14} textAnchor="middle" fontSize="10" fontWeight="700" fill={THEME.muted} style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>spent</text>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ display: "grid", gap: 14 }}>
                  {[
                    { label: "Month elapsed", val: monthElapsedPct.toFixed(0) + "%", color: THEME.muted },
                    { label: "Budget spent", val: spentPct.toFixed(0) + "%", color: burnColor },
                    { label: "Spent so far", val: fmtINRFull(totalSpent), color: THEME.ink },
                    { label: "Daily average", val: fmtINR(daysPassed > 0 ? totalSpent / daysPassed : 0) + " / day", color: THEME.muted },
                    { label: "Projected month-end", val: fmtINRFull(daysPassed > 0 ? (totalSpent / daysPassed) * daysInMonth : 0), color: burnColor },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
                      <span style={{ color: THEME.muted, fontWeight: 600 }}>{label}</span>
                      <span style={{ fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>{val}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 20, fontSize: 13, padding: "12px 16px", borderRadius: 10, background: onTrack ? "rgba(30,142,62,0.06)" : "rgba(217,48,37,0.06)", color: onTrack ? THEME.sage : THEME.rust, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                  {onTrack ? <Check size={16} /> : <AlertCircle size={16} />}
                  {onTrack ? "Spending is perfectly in line with the month progress." : "You are overpacing — spending faster than month progress."}
                </div>
              </div>
            </div>
          </Card>
        );
      })()}

      {state.budgets.length === 0 ? (
        <BudgetEmptyState onAdd={() => setShow(true)} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20 }}>
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
              <Card key={b.id} style={{ position: "relative", padding: 24, borderLeft: `4px solid ${barColor}` }}>
                <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 4 }}>
                  <Button variant="ghost" size="sm" onClick={() => setEditBudget(b)} style={{ padding: 6 }}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => removeItem("budgets", b.id)} style={{ padding: 6, color: THEME.rust }}>
                    <Trash2 size={14} />
                  </Button>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, paddingRight: 40 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: "-0.02em", color: THEME.ink }}>{b.category}</div>
                    <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4, fontWeight: 600 }}>
                      {fmtINRFull(spent)} <span style={{ fontWeight: 400 }}>of</span> {fmtINRFull(budget)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: over ? THEME.rust : THEME.ink, letterSpacing: "-0.04em" }}>{pct.toFixed(0)}%</div>
                    <div style={{ fontSize: 11, color: over ? THEME.rust : THEME.sage, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>
                      {over ? fmtINR(spent - budget) + " over" : fmtINR(budget - spent) + " left"}
                    </div>
                  </div>
                </div>
                <div style={{ height: 10, background: "rgba(128,128,128,0.06)", borderRadius: 5, overflow: "hidden", marginBottom: 16 }}>
                  <div style={{ height: "100%", width: Math.min(pct, 100) + "%", background: barColor, borderRadius: 5, transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }} />
                </div>
                {spent > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
                    <span>{fmtINR(dailyAvg)}/day avg · day {daysPassed}/{daysInMonth}</span>
                    <span style={{ color: projectedPct > 110 ? THEME.rust : projectedPct > 90 ? THEME.gold : THEME.sage, fontWeight: 800 }}>
                      Projected: {fmtINR(projected)} ({projectedPct.toFixed(0)}%)
                    </span>
                  </div>
                )}
              </Card>
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
        <select className="form-input" value={f.owner || "self"} onChange={e => setF({...f, owner: e.target.value})}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Category">
        <select className="form-input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          {allCats.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Monthly Limit (₹)">
        <input className="form-input" type="number" value={f.monthly} onChange={(e) => setF({ ...f, monthly: e.target.value })} placeholder="e.g. 5000" />
      </Field>
      <ModalActions onSave={() => f.monthly && onSave(f)} onClose={onClose} />
    </Modal>
  );
}
