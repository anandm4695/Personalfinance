// @ts-nocheck
import React, { useState, useMemo } from "react";
import { Activity, TrendingUp, Repeat, Sparkles, Plus, Trash2, Pencil, CheckCircle, Clock } from "lucide-react";
import { THEME, PROFILES } from "../../utils/constants";
import { fmtINRFull, today, monthsBetween, getLocalDateString } from "../../utils/finance";
import { useMasterData } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { StatCard } from "../ui/StatCard";
import { SectionTitle } from "../ui/SectionTitle";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend } from "recharts";

const BROKERS = [
  "Zerodha", "Groww", "Kuvera", "MF Central", "ET Money",
  "Scripbox", "Paytm Money", "HDFC Securities", "ICICI Direct", "Axis Securities", "Other",
];

const FUND_COLORS: Record<string, string> = {
  "Equity": "#6366f1",
  "Debt": "#64748b",
  "Hybrid": "#d97706",
  "ELSS": "#dc2626",
  "Index": "#059669",
  "Liquid": "#0891b2",
  "Flexi Cap": "#7c3aed",
};

export function SIPTrackerTab({ state, addItem, removeItem, updateItem, metrics }: any) {
  const [show, setShow] = useState(false);
  const [editSip, setEditSip] = useState<any>(null);
  const [sipProjRate, setSipProjRate] = useState("12");
  const [sortBy, setSortBy] = useState<string>("amount");
  const todayStr = today();

  const sipsWithCalc = useMemo(() => {
    return (state.sips || []).map((sip: any) => {
      const isQuarterly = sip.frequency === "quarterly";
      const periodMonths = isQuarterly ? 3 : 1;
      const annualRate = Number(sipProjRate) || 12;
      // Periodic return rate (per installment period)
      const r = annualRate / (isQuarterly ? 4 : 12) / 100;
      const monthsElapsed = Math.max(0, monthsBetween(sip.startDate, todayStr));
      const totalInst = Number(sip.totalInstallments || 0);
      const paid = Math.min(Math.floor(monthsElapsed / periodMonths), totalInst);
      const totalInvested = paid * Number(sip.amount || 0);
      const remaining = Math.max(0, totalInst - paid);
      const m = Number(sip.amount || 0);

      // Annuity-due formula (payments at start of period — standard for SIPs)
      const currentCorpus = paid === 0
        ? 0
        : r === 0
          ? totalInvested
          : m * (Math.pow(1 + r, paid) - 1) / r * (1 + r);

      // Bug fix: completed SIPs stop growing (no more contributions)
      const projectedCorpus = remaining === 0
        ? currentCorpus
        : r === 0
          ? currentCorpus + m * remaining
          : currentCorpus * Math.pow(1 + r, remaining) + m * (Math.pow(1 + r, remaining) - 1) / r * (1 + r);

      const estimatedGains = Math.max(0, currentCorpus - totalInvested);
      const gainPct = totalInvested > 0 ? (estimatedGains / totalInvested) * 100 : 0;
      const progress = totalInst > 0 ? (paid / totalInst) * 100 : 0;
      const isCompleted = remaining === 0 && paid > 0;
      // Bug fix: quarterly SIP monthly equivalent = amount / 3
      const monthlyEquivalent = isQuarterly ? m / 3 : m;

      // Next installment date: startDate + paid * periodMonths
      let nextDueDateStr: string | null = null;
      let daysUntilDue: number | null = null;
      if (!isCompleted && remaining > 0 && sip.startDate) {
        const startD = new Date(sip.startDate + "T00:00:00");
        const nextD = new Date(startD);
        nextD.setMonth(nextD.getMonth() + paid * periodMonths);
        nextDueDateStr = getLocalDateString(nextD);
        const todayD = new Date(todayStr + "T00:00:00");
        daysUntilDue = Math.ceil((nextD.getTime() - todayD.getTime()) / 86400000);
      }

      return {
        ...sip, paid, totalInvested, remaining, currentCorpus, projectedCorpus,
        estimatedGains, gainPct, progress, isCompleted, monthlyEquivalent,
        nextDueDateStr, daysUntilDue,
      };
    });
  }, [state.sips, todayStr, sipProjRate]);

  const activeSips = sipsWithCalc.filter((s: any) => !s.isCompleted);
  const completedSips = sipsWithCalc.filter((s: any) => s.isCompleted);

  // Bug fix: use monthly equivalent for quarterly SIPs; count only active SIPs
  const totalMonthlyEquivalent = activeSips.reduce((s: number, sip: any) => s + sip.monthlyEquivalent, 0);
  const totalInvested = sipsWithCalc.reduce((s: number, sip: any) => s + sip.totalInvested, 0);
  const totalGains = sipsWithCalc.reduce((s: number, sip: any) => s + sip.estimatedGains, 0);
  const totalProjected = sipsWithCalc.reduce((s: number, sip: any) => s + sip.projectedCorpus, 0);
  const overallGainPct = totalInvested > 0 ? (totalGains / totalInvested) * 100 : 0;

  const sortedSips = useMemo(() => {
    const arr = [...sipsWithCalc];
    if (sortBy === "progress") return arr.sort((a: any, b: any) => b.progress - a.progress);
    if (sortBy === "projected") return arr.sort((a: any, b: any) => b.projectedCorpus - a.projectedCorpus);
    if (sortBy === "start") return arr.sort((a: any, b: any) => (a.startDate || "").localeCompare(b.startDate || ""));
    return arr.sort((a: any, b: any) => Number(b.amount || 0) - Number(a.amount || 0));
  }, [sipsWithCalc, sortBy]);

  // Fund type allocation breakdown (by monthly equivalent, active SIPs only)
  const fundTypeAlloc = useMemo(() => {
    const map: Record<string, number> = {};
    activeSips.forEach((s: any) => {
      const ft = s.fundType || "Other";
      map[ft] = (map[ft] || 0) + s.monthlyEquivalent;
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0);
    return Object.entries(map)
      .map(([type, amt]) => ({ type, amt, pct: total > 0 ? (amt / total) * 100 : 0 }))
      .sort((a, b) => b.amt - a.amt);
  }, [activeSips]);

  // 10-year projection chart with actual calendar year labels
  const projectionChartData = useMemo(() => {
    if (sipsWithCalc.length === 0) return [];
    const r = (Number(sipProjRate) || 12) / 12 / 100;
    const nowYear = new Date().getFullYear();
    const chartPoints: any[] = [];

    let currentInvested = totalInvested;
    let currentWealth = sipsWithCalc.reduce((s: number, sip: any) => s + sip.currentCorpus, 0);

    chartPoints.push({ label: "Now", invested: Math.round(currentInvested), wealth: Math.round(currentWealth) });

    for (let year = 1; year <= 10; year++) {
      for (let month = 1; month <= 12; month++) {
        sipsWithCalc.forEach((sip: any) => {
          if (sip.isCompleted) return; // completed SIPs stop contributing
          const isQuarterly = sip.frequency === "quarterly";
          const totalInst = Number(sip.totalInstallments || 0);
          const elapsed = monthsBetween(sip.startDate, todayStr);
          const totalMonthsAtPoint = elapsed + (year - 1) * 12 + month;

          if (isQuarterly) {
            const instNum = Math.floor(totalMonthsAtPoint / 3);
            if (instNum < totalInst && totalMonthsAtPoint % 3 === 0) {
              currentInvested += Number(sip.amount || 0);
              currentWealth += Number(sip.amount || 0);
            }
          } else {
            if (totalMonthsAtPoint <= totalInst) {
              currentInvested += Number(sip.amount || 0);
              currentWealth += Number(sip.amount || 0);
            }
          }
        });
        currentWealth *= (1 + r);
      }
      chartPoints.push({
        label: String(nowYear + year),
        invested: Math.round(currentInvested),
        wealth: Math.round(currentWealth),
      });
    }
    return chartPoints;
  }, [sipsWithCalc, sipProjRate, totalInvested, todayStr]);

  return (
    <div className="tab-content-enter">
      <SectionTitle
        sub="Track your systematic investment plans across mutual funds"
        rightElement={
          sipsWithCalc.length > 0 && (
            <Button variant="accent" icon={<Plus size={14} />} onClick={() => setShow(true)}>
              Add SIP
            </Button>
          )
        }
      >
        SIP Tracker
      </SectionTitle>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard
          icon={<Activity />}
          label="Monthly SIP"
          value={fmtINRFull(totalMonthlyEquivalent)}
          color={THEME.accent}
          sub={metrics?.monthIncome > 0 ? `${((totalMonthlyEquivalent / metrics.monthIncome) * 100).toFixed(1)}% of monthly income` : "Monthly equivalent"}
        />
        <StatCard
          icon={<TrendingUp />}
          label="Total Invested"
          value={fmtINRFull(totalInvested)}
          color={THEME.sage}
          sub="Cumulative capital deployed"
        />
        <StatCard
          icon={<Sparkles />}
          label="Estimated Returns"
          value={fmtINRFull(totalGains)}
          color={totalGains > 0 ? THEME.gold : THEME.muted}
          sub={totalInvested > 0 ? `+${overallGainPct.toFixed(1)}% estimated gain` : "Returns will show after first installment"}
        />
        <StatCard
          icon={<Repeat />}
          label="Projected Corpus"
          value={fmtINRFull(totalProjected)}
          color={THEME.accent}
          sub={`@${sipProjRate}% p.a. · ${activeSips.length} active${completedSips.length > 0 ? `, ${completedSips.length} done` : ""}`}
        />
      </div>

      {sipsWithCalc.length > 0 && (
        <>
          {/* ── Fund Type Allocation ── */}
          {fundTypeAlloc.length > 1 && (
            <Card style={{ marginBottom: 20, padding: 20 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: THEME.muted, fontWeight: 800, marginBottom: 12 }}>
                Portfolio Allocation by Fund Type
              </div>
              <div style={{ display: "flex", height: 8, borderRadius: 99, overflow: "hidden", marginBottom: 14, gap: 2 }}>
                {fundTypeAlloc.map(({ type, pct }) => (
                  <div
                    key={type}
                    style={{ width: `${pct}%`, background: FUND_COLORS[type] || THEME.muted, borderRadius: 99 }}
                    title={`${type}: ${pct.toFixed(0)}%`}
                  />
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 20px" }}>
                {fundTypeAlloc.map(({ type, amt, pct }) => (
                  <div key={type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: FUND_COLORS[type] || THEME.muted, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: THEME.ink, fontWeight: 700 }}>{type}</span>
                    <span style={{ fontSize: 11, color: THEME.muted }}>{fmtINRFull(amt)}/mo · {pct.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* ── Sort bar ── */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 600 }}>
              {sipsWithCalc.length} SIP{sipsWithCalc.length !== 1 ? "s" : ""}
              {completedSips.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 11, color: THEME.sage, fontWeight: 700 }}>
                  · {completedSips.length} completed
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, marginRight: 4 }}>Sort:</span>
              {[
                { key: "amount", label: "Amount" },
                { key: "progress", label: "Progress" },
                { key: "projected", label: "Projected" },
                { key: "start", label: "Oldest" },
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  style={{
                    padding: "4px 10px", borderRadius: 6, border: "none", fontSize: 11, fontFamily: "inherit",
                    fontWeight: sortBy === opt.key ? 800 : 500, cursor: "pointer",
                    background: sortBy === opt.key ? THEME.accent : "transparent",
                    color: sortBy === opt.key ? "#fff" : THEME.muted,
                    transition: "all 0.15s",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── SIP Cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: 16, marginBottom: 28 }}>
            {sortedSips.map((sip: any) => (
              <SIPCard
                key={sip.id}
                sip={sip}
                onEdit={() => setEditSip(sip)}
                onRemove={() => removeItem("sips", sip.id)}
              />
            ))}
          </div>

          {/* ── Projection Chart ── */}
          <Card style={{ marginBottom: 28, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: THEME.muted, fontWeight: 800, marginBottom: 4 }}>
                  Wealth Growth Projection
                </div>
                <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 600 }}>
                  10-year compounding projection @{sipProjRate}% expected yield
                </div>
              </div>
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: "rgba(128,128,128,0.04)", padding: "4px 14px", borderRadius: 10,
                border: `1px solid ${THEME.line}`,
              }}>
                <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>Expected Yield:</span>
                <input
                  style={{ width: 44, fontSize: 13, background: "transparent", border: "none", color: THEME.ink, fontWeight: 800, padding: 0, textAlign: "center" }}
                  type="number"
                  value={sipProjRate}
                  onChange={(e) => setSipProjRate(e.target.value)}
                />
                <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>% p.a.</span>
              </div>
            </div>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={projectionChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="sipColorInvested" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.muted} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={THEME.muted} stopOpacity={0.01} />
                    </linearGradient>
                    <linearGradient id="sipColorWealth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.sage} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={THEME.sage} stopOpacity={0.01} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" stroke={THEME.muted} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke={THEME.muted} fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => fmtINRFull(v)} width={72} />
                  <Tooltip
                    formatter={(v: any) => fmtINRFull(v)}
                    contentStyle={{ background: "var(--t-paper)", borderColor: THEME.line, borderRadius: 10, color: THEME.ink }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Area type="monotone" dataKey="invested" name="Cumulative Invested" stroke={THEME.muted} strokeWidth={2} fillOpacity={1} fill="url(#sipColorInvested)" />
                  <Area type="monotone" dataKey="wealth" name="Projected Wealth" stroke={THEME.sage} strokeWidth={2.5} fillOpacity={1} fill="url(#sipColorWealth)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}

      {sipsWithCalc.length === 0 && (
        <EmptyState
          icon={Repeat}
          gradient="linear-gradient(135deg,#0d9488 0%,#5eead4 100%)"
          dotColor="#0d9488"
          title="No SIPs Tracked Yet"
          description="Add your systematic investment plans to project your corpus, track installments paid, and visualise your wealth-building journey."
          pills={["Mutual Fund SIPs", "Corpus Projections", "Installment Progress", "Monthly Tracking"]}
          buttonLabel="Add First SIP"
          onAdd={() => setShow(true)}
        />
      )}

      {show && (
        <SIPModal
          onClose={() => setShow(false)}
          onSave={(v: any) => { addItem("sips", v); setShow(false); }}
        />
      )}
      {editSip && (
        <SIPModal
          initial={editSip}
          onClose={() => setEditSip(null)}
          onSave={(v: any) => { updateItem("sips", editSip.id, v); setEditSip(null); }}
        />
      )}
    </div>
  );
}

// ── SIP Card ─────────────────────────────────────────────────────────────────
function SIPCard({ sip, onEdit, onRemove }: any) {
  const isOverdue = sip.daysUntilDue !== null && sip.daysUntilDue < 0;
  const isDueSoon = sip.daysUntilDue !== null && sip.daysUntilDue >= 0 && sip.daysUntilDue <= 7;
  const statusColor = sip.isCompleted
    ? THEME.muted
    : isOverdue
      ? THEME.rust
      : isDueSoon
        ? THEME.gold
        : THEME.sage;

  let nextLabel: string | null = null;
  if (!sip.isCompleted && sip.nextDueDateStr) {
    const d = new Date(sip.nextDueDateStr + "T00:00:00");
    nextLabel = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <Card style={{ padding: "18px 20px", borderLeft: `3px solid ${statusColor}`, position: "relative" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          background: `color-mix(in srgb, ${statusColor} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${statusColor} 25%, transparent)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {sip.isCompleted
            ? <CheckCircle size={20} color={statusColor} />
            : <Activity size={20} color={statusColor} />
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: THEME.ink, letterSpacing: "-0.01em", marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {sip.scheme}
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {sip.fundType && <Badge variant="muted" style={{ fontSize: 9 }}>{sip.fundType}</Badge>}
            {sip.frequency && sip.frequency !== "monthly" && <Badge variant="accent" style={{ fontSize: 9 }}>{sip.frequency}</Badge>}
            {sip.broker && <Badge variant="muted" style={{ fontSize: 9, background: "rgba(0,0,0,0.04)" }}>{sip.broker}</Badge>}
            {sip.isCompleted && <Badge variant="muted" style={{ fontSize: 9, background: "rgba(16,185,129,0.1)", color: THEME.sage }}>✓ Completed</Badge>}
          </div>
        </div>

        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          <Button variant="ghost" size="sm" onClick={onEdit} style={{ padding: 6, color: THEME.accent }}>
            <Pencil size={13} />
          </Button>
          <Button variant="ghost" size="sm" onClick={onRemove} style={{ padding: 6, color: THEME.rust }}>
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {/* Amount + installments row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: statusColor }}>
          {fmtINRFull(sip.amount)}/{sip.frequency === "quarterly" ? "qtr" : "mo"}
          {sip.frequency === "quarterly" && (
            <span style={{ fontSize: 11, fontWeight: 500, color: THEME.muted }}>
              {" "}(≈{fmtINRFull(sip.monthlyEquivalent)}/mo)
            </span>
          )}
        </span>
        <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
          {sip.paid} / {sip.totalInstallments} paid
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ height: 6, background: `color-mix(in srgb, ${statusColor} 12%, transparent)`, borderRadius: 99, overflow: "hidden", marginBottom: 14 }}>
        <div style={{
          height: "100%",
          width: `${Math.min(sip.progress, 100)}%`,
          background: statusColor,
          borderRadius: 99,
          transition: "width 0.4s ease",
        }} />
      </div>

      {/* Corpus breakdown */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10,
        padding: "10px 12px", background: "var(--surface-0)", borderRadius: 10,
      }}>
        <div>
          <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Invested</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>{fmtINRFull(sip.totalInvested)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Est. Value</div>
          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.sage }}>{fmtINRFull(sip.currentCorpus)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>
            {sip.isCompleted ? "Final" : "Projected"}
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.gold }}>{fmtINRFull(sip.projectedCorpus)}</div>
        </div>
      </div>

      {/* Gains + next due row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: sip.estimatedGains > 0 ? THEME.sage : THEME.muted }}>
          {sip.estimatedGains > 0
            ? `+${fmtINRFull(sip.estimatedGains)} (${sip.gainPct.toFixed(1)}% gain)`
            : sip.paid === 0 ? "Not started" : "—"
          }
        </div>
        {!sip.isCompleted && nextLabel && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: isOverdue ? THEME.rust : isDueSoon ? THEME.gold : THEME.muted }}>
            <Clock size={11} />
            {isOverdue ? "Overdue: " : isDueSoon ? "Due soon: " : "Next: "}{nextLabel}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── SIP Modal ─────────────────────────────────────────────────────────────────
function SIPModal({ onClose, onSave, initial }: any) {
  const { mfCategories } = useMasterData();
  const [f, setF] = useState(initial
    ? {
        owner: initial.owner || "self",
        scheme: initial.scheme || "",
        fundType: initial.fundType || mfCategories[0] || "Equity",
        amount: String(initial.amount || ""),
        frequency: initial.frequency || "monthly",
        startDate: initial.startDate || today(),
        totalInstallments: String(initial.totalInstallments || "12"),
        broker: initial.broker || "",
      }
    : {
        owner: "self", scheme: "", fundType: mfCategories[0] || "Equity",
        amount: "", frequency: "monthly", startDate: today(), totalInstallments: "12", broker: "",
      });

  const instNum = Number(f.totalInstallments) || 0;
  const amt = Number(f.amount) || 0;
  const totalCommitment = instNum * amt;
  const durationYears = f.frequency === "quarterly" ? Math.floor(instNum / 4) : Math.floor(instNum / 12);
  const durationMonths = f.frequency === "quarterly" ? (instNum % 4) * 3 : instNum % 12;

  return (
    <Modal title={initial ? "Edit SIP" : "Add SIP"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select className="form-input" value={f.owner} onChange={e => setF({ ...f, owner: e.target.value })}>
          {PROFILES.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </Field>
      <Field label="Scheme Name">
        <input
          className="form-input" value={f.scheme}
          onChange={(e) => setF({ ...f, scheme: e.target.value })}
          placeholder="e.g. Parag Parikh Flexi Cap Direct Growth"
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Fund Type">
          <select className="form-input" value={f.fundType} onChange={(e) => setF({ ...f, fundType: e.target.value })}>
            {mfCategories.map((c: string) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Platform / Broker">
          <select className="form-input" value={f.broker} onChange={(e) => setF({ ...f, broker: e.target.value })}>
            <option value="">— Select —</option>
            {BROKERS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Amount (₹)">
          <input className="form-input" type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="5000" />
        </Field>
        <Field label="Frequency">
          <select className="form-input" value={f.frequency} onChange={(e) => setF({ ...f, frequency: e.target.value })}>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Start Date">
          <input className="form-input" type="date" value={f.startDate} onChange={(e) => setF({ ...f, startDate: e.target.value })} />
        </Field>
        <Field label="Total Installments">
          <input className="form-input" type="number" value={f.totalInstallments} onChange={(e) => setF({ ...f, totalInstallments: e.target.value })} placeholder="120" />
        </Field>
      </div>

      {/* Duration & commitment summary */}
      {instNum > 0 && amt > 0 && (
        <div style={{ padding: "10px 14px", background: "rgba(128,128,128,0.05)", borderRadius: 8, fontSize: 12, color: THEME.muted, lineHeight: 1.7 }}>
          <strong style={{ color: THEME.ink }}>Duration: </strong>
          {durationYears > 0 && `${durationYears} yr${durationYears !== 1 ? "s" : ""} `}
          {durationMonths > 0 && `${durationMonths} mo`}
          {durationYears === 0 && durationMonths === 0 && "< 1 month"}
          <span style={{ margin: "0 8px", opacity: 0.4 }}>·</span>
          <strong style={{ color: THEME.ink }}>Total Commitment: </strong>
          {fmtINRFull(totalCommitment)}
        </div>
      )}

      <ModalActions
        onSave={() => f.scheme && f.amount && onSave(f)}
        onClose={onClose}
        saveLabel={initial ? "Save Changes" : "Add SIP"}
      />
    </Modal>
  );
}
