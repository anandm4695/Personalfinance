// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Activity,
  Repeat,
  Plus,
  Trash2,
  Pencil,
  CheckCircle,
  Clock,
  AlertCircle,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import {
  fmtINRFull,
  fmtINRExact,
  today,
  monthsBetween,
  getLocalDateString,
} from "../../utils/finance";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { SectionTitle } from "../ui/SectionTitle";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";
import { Prv } from "../../context/PrivacyContext";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { MFLogo } from "./InvestmentsTab";

const BROKERS = [
  "Zerodha",
  "Groww",
  "Kuvera",
  "MF Central",
  "ET Money",
  "Scripbox",
  "Paytm Money",
  "HDFC Securities",
  "ICICI Direct",
  "Axis Securities",
  "Other",
];

const FUND_COLORS: Record<string, string> = {
  Equity: THEME.accent,
  Debt: "#64748b",
  Hybrid: "#d97706",
  ELSS: "#dc2626",
  Index: "#059669",
  Liquid: "#0891b2",
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
      if (!sip.startDate) {
        return {
          ...sip,
          paid: 0,
          totalInvested: 0,
          remaining: Number(sip.totalInstallments || 0),
          currentCorpus: 0,
          projectedCorpus: 0,
          estimatedGains: 0,
          gainPct: 0,
          progress: 0,
          isCompleted: false,
          monthlyEquivalent: Number(sip.amount || 0),
          nextDueDateStr: null,
          daysUntilDue: null,
        };
      }
      const isQuarterly = sip.frequency === "quarterly";
      const periodMonths = isQuarterly ? 3 : 1;
      const annualRate = Number(sipProjRate) || 12;
      const r = annualRate / (isQuarterly ? 4 : 12) / 100;
      const monthsElapsed = Math.max(0, monthsBetween(sip.startDate, todayStr));
      const totalInst = Number(sip.totalInstallments || 0);
      const paid = Math.min(Math.floor(monthsElapsed / periodMonths), totalInst);
      const totalInvested = paid * Number(sip.amount || 0);
      const remaining = Math.max(0, totalInst - paid);
      const m = Number(sip.amount || 0);

      const currentCorpus =
        paid === 0
          ? 0
          : r === 0
            ? totalInvested
            : ((m * (Math.pow(1 + r, paid) - 1)) / r) * (1 + r);

      const projectedCorpus =
        remaining === 0
          ? currentCorpus
          : r === 0
            ? currentCorpus + m * remaining
            : currentCorpus * Math.pow(1 + r, remaining) +
              ((m * (Math.pow(1 + r, remaining) - 1)) / r) * (1 + r);

      const estimatedGains = Math.max(0, currentCorpus - totalInvested);
      const gainPct = totalInvested > 0 ? (estimatedGains / totalInvested) * 100 : 0;
      const progress = totalInst > 0 ? (paid / totalInst) * 100 : 0;
      const isCompleted = remaining === 0 && paid > 0;
      const monthlyEquivalent = isQuarterly ? m / 3 : m;

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
        ...sip,
        paid,
        totalInvested,
        remaining,
        currentCorpus,
        projectedCorpus,
        estimatedGains,
        gainPct,
        progress,
        isCompleted,
        monthlyEquivalent,
        nextDueDateStr,
        daysUntilDue,
      };
    });
  }, [state.sips, todayStr, sipProjRate]);

  const activeSips = sipsWithCalc.filter((s: any) => !s.isCompleted);
  const completedSips = sipsWithCalc.filter((s: any) => s.isCompleted);

  const totalMonthlyEquivalent = activeSips.reduce(
    (s: number, sip: any) => s + sip.monthlyEquivalent,
    0
  );
  const totalInvested = sipsWithCalc.reduce((s: number, sip: any) => s + sip.totalInvested, 0);
  const totalGains = sipsWithCalc.reduce((s: number, sip: any) => s + sip.estimatedGains, 0);
  const totalProjected = sipsWithCalc.reduce((s: number, sip: any) => s + sip.projectedCorpus, 0);
  const overallGainPct = totalInvested > 0 ? (totalGains / totalInvested) * 100 : 0;

  const sortedSips = useMemo(() => {
    const arr = [...sipsWithCalc];
    if (sortBy === "progress") return arr.sort((a: any, b: any) => b.progress - a.progress);
    if (sortBy === "projected")
      return arr.sort((a: any, b: any) => b.projectedCorpus - a.projectedCorpus);
    if (sortBy === "start")
      return arr.sort((a: any, b: any) => (a.startDate || "").localeCompare(b.startDate || ""));
    return arr.sort((a: any, b: any) => Number(b.amount || 0) - Number(a.amount || 0));
  }, [sipsWithCalc, sortBy]);

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

  const projectionChartData = useMemo(() => {
    if (sipsWithCalc.length === 0) return [];
    const r = (Number(sipProjRate) || 12) / 12 / 100;
    const nowYear = new Date().getFullYear();
    const chartPoints: any[] = [];

    let currentInvested = totalInvested;
    let currentWealth = sipsWithCalc.reduce((s: number, sip: any) => s + sip.currentCorpus, 0);

    chartPoints.push({
      label: "Now",
      invested: Math.round(currentInvested),
      wealth: Math.round(currentWealth),
    });

    for (let year = 1; year <= 10; year++) {
      for (let month = 1; month <= 12; month++) {
        for (const sip of sipsWithCalc) {
          if (sip.isCompleted) continue;
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
        }
        currentWealth *= 1 + r;
      }
      chartPoints.push({
        label: String(nowYear + year),
        invested: Math.round(currentInvested),
        wealth: Math.round(currentWealth),
      });
    }
    return chartPoints;
  }, [sipsWithCalc, sipProjRate, totalInvested, todayStr]);

  const sortedActive = sortedSips.filter((s: any) => !s.isCompleted);
  const sortedCompleted = sortedSips.filter((s: any) => s.isCompleted);

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

      {/* ── Summary Tiles ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 28,
        }}
      >
        <StatCard
          label="Monthly SIP"
          value={fmtINRFull(totalMonthlyEquivalent)}
          sub={
            metrics?.monthIncome > 0
              ? `${((totalMonthlyEquivalent / metrics.monthIncome) * 100).toFixed(1)}% of monthly income`
              : "Monthly equivalent"
          }
          icon={<Repeat />}
          color={THEME.accent}
        />
        <StatCard
          label="Total Invested"
          value={fmtINRFull(totalInvested)}
          sub="Cumulative capital deployed"
          icon={<IndianRupee />}
          color={THEME.sage}
        />
        <StatCard
          label="Est. Returns"
          value={totalInvested > 0 ? `+${overallGainPct.toFixed(1)}%` : "—"}
          sub={
            totalGains > 0
              ? `+${fmtINRFull(totalGains)} total return`
              : "Returns after first installment"
          }
          icon={<TrendingUp />}
          color={totalGains > 0 ? THEME.gold : THEME.muted}
        />
        <StatCard
          label="Projected Corpus"
          value={fmtINRFull(totalProjected)}
          sub={`@${sipProjRate}% p.a. · ${activeSips.length} active${completedSips.length > 0 ? `, ${completedSips.length} done` : ""}`}
          icon={<Activity />}
          color={THEME.accent}
        />
      </div>

      {sipsWithCalc.length > 0 && (
        <>
          {/* ── Fund Type Allocation ── */}
          {fundTypeAlloc.length > 1 && (
            <Card style={{ marginBottom: 20, padding: "18px 20px" }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  color: THEME.muted,
                  fontWeight: 800,
                  marginBottom: 14,
                }}
              >
                Portfolio Allocation by Fund Type
              </div>
              <div
                style={{
                  display: "flex",
                  height: 10,
                  borderRadius: 99,
                  overflow: "hidden",
                  marginBottom: 16,
                  gap: 3,
                }}
              >
                {fundTypeAlloc.map(({ type, pct }) => (
                  <div
                    key={type}
                    style={{
                      width: `${pct}%`,
                      background: FUND_COLORS[type] || THEME.muted,
                      borderRadius: 99,
                    }}
                    title={`${type}: ${pct.toFixed(0)}%`}
                  />
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {fundTypeAlloc.map(({ type, amt, pct }) => {
                  const col = FUND_COLORS[type] || THEME.muted;
                  return (
                    <div
                      key={type}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 12px",
                        borderRadius: 10,
                        background: `${col}09`,
                        border: `1px solid ${col}22`,
                        flex: "1 1 110px",
                      }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: col,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: THEME.ink }}>
                          {type}
                        </div>
                        <div style={{ fontSize: 10, color: THEME.muted }}>
                          {fmtINRFull(amt)}/mo · {pct.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ── Sort bar ── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 600 }}>
              {sipsWithCalc.length} SIP{sipsWithCalc.length !== 1 ? "s" : ""}
              {completedSips.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 11, color: THEME.sage, fontWeight: 700 }}>
                  · {completedSips.length} completed
                </span>
              )}
            </div>
            <div
              style={{
                display: "flex",
                gap: 4,
                alignItems: "center",
                background: "var(--surface-0)",
                padding: "4px 6px",
                borderRadius: 10,
                border: `1px solid ${THEME.line}`,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  color: THEME.muted,
                  fontWeight: 600,
                  marginRight: 4,
                  paddingLeft: 4,
                }}
              >
                Sort:
              </span>
              {[
                { key: "amount", label: "Amount" },
                { key: "progress", label: "Progress" },
                { key: "projected", label: "Projected" },
                { key: "start", label: "Oldest" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setSortBy(opt.key)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 7,
                    border: "none",
                    fontSize: 11,
                    fontFamily: "inherit",
                    fontWeight: sortBy === opt.key ? 800 : 600,
                    cursor: "pointer",
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

          {/* ── Active SIPs ── */}
          {sortedActive.length > 0 && (
            <>
              {sortedCompleted.length > 0 && (
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: THEME.muted,
                    fontWeight: 800,
                    marginBottom: 12,
                  }}
                >
                  Active · {sortedActive.length}
                </div>
              )}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                  gap: 16,
                  marginBottom: sortedCompleted.length > 0 ? 28 : 28,
                }}
              >
                {sortedActive.map((sip: any) => (
                  <SIPCard
                    key={sip.id}
                    sip={sip}
                    onEdit={() => setEditSip(sip)}
                    onRemove={() => removeItem("sips", sip.id)}
                  />
                ))}
              </div>
            </>
          )}

          {/* ── Completed SIPs ── */}
          {sortedCompleted.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: THEME.muted,
                  fontWeight: 800,
                  marginBottom: 12,
                }}
              >
                Completed · {sortedCompleted.length}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
                  gap: 16,
                  marginBottom: 28,
                }}
              >
                {sortedCompleted.map((sip: any) => (
                  <SIPCard
                    key={sip.id}
                    sip={sip}
                    onEdit={() => setEditSip(sip)}
                    onRemove={() => removeItem("sips", sip.id)}
                  />
                ))}
              </div>
            </>
          )}

          {/* ── Projection Chart ── */}
          <Card style={{ marginBottom: 28, padding: 24 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: THEME.muted,
                    fontWeight: 800,
                    marginBottom: 4,
                  }}
                >
                  Wealth Growth Projection
                </div>
                <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 600 }}>
                  10-year compounding projection @{sipProjRate}% expected yield
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: `${THEME.accent}09`,
                  padding: "6px 14px",
                  borderRadius: 10,
                  border: `1px solid ${THEME.accent}22`,
                }}
              >
                <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
                  Expected Yield
                </span>
                <input
                  style={{
                    width: 44,
                    fontSize: 14,
                    background: "transparent",
                    border: "none",
                    color: THEME.ink,
                    fontWeight: 800,
                    padding: 0,
                    textAlign: "center",
                  }}
                  type="number"
                  value={sipProjRate}
                  onChange={(e) => setSipProjRate(e.target.value)}
                />
                <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>% p.a.</span>
              </div>
            </div>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={projectionChartData}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
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
                  <XAxis
                    dataKey="label"
                    stroke={THEME.muted}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke={THEME.muted}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => fmtINRFull(v)}
                    width={72}
                  />
                  <Tooltip
                    formatter={(v: any) => fmtINRFull(v)}
                    cursor={{ stroke: THEME.line }}
                    contentStyle={{
                      background: "var(--surface-0)",
                      borderColor: THEME.line,
                      borderRadius: 10,
                      color: THEME.ink,
                    }}
                    labelStyle={{ color: THEME.ink }}
                    itemStyle={{ color: THEME.ink }}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Area
                    type="monotone"
                    dataKey="invested"
                    name="Cumulative Invested"
                    stroke={THEME.muted}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#sipColorInvested)"
                  />
                  <Area
                    type="monotone"
                    dataKey="wealth"
                    name="Projected Wealth"
                    stroke={THEME.sage}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#sipColorWealth)"
                  />
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
          pills={[
            "Mutual Fund SIPs",
            "Corpus Projections",
            "Installment Progress",
            "Monthly Tracking",
          ]}
          buttonLabel="Add First SIP"
          onAdd={() => setShow(true)}
        />
      )}

      {show && (
        <SIPModal
          onClose={() => setShow(false)}
          onSave={(v: any) => {
            addItem("sips", v);
            setShow(false);
          }}
        />
      )}
      {editSip && (
        <SIPModal
          initial={editSip}
          onClose={() => setEditSip(null)}
          onSave={(v: any) => {
            updateItem("sips", editSip.id, v);
            setEditSip(null);
          }}
        />
      )}
    </div>
  );
}

// ── SIP Card ─────────────────────────────────────────────────────────────────
function SIPCard({ sip, onEdit, onRemove }: any) {
  const { familyProfiles } = useMasterData();
  const isOverdue = sip.daysUntilDue !== null && sip.daysUntilDue < 0;
  const isDueSoon = sip.daysUntilDue !== null && sip.daysUntilDue >= 0 && sip.daysUntilDue <= 7;
  const statusColor = sip.isCompleted
    ? THEME.muted
    : isOverdue
      ? THEME.rust
      : isDueSoon
        ? THEME.gold
        : THEME.sage;
  const fundColor = FUND_COLORS[sip.fundType] || THEME.muted;
  const alertColor = isOverdue ? THEME.rust : THEME.gold;

  const ownerProfile = familyProfiles?.find?.((p: any) => p.id === sip.owner);
  const ownerLabel =
    ownerProfile?.name ||
    (sip.owner ? sip.owner.charAt(0).toUpperCase() + sip.owner.slice(1) : null);

  const annualAmt =
    sip.frequency === "quarterly" ? Number(sip.amount) * 4 : Number(sip.amount) * 12;

  let nextLabel: string | null = null;
  if (!sip.isCompleted && sip.nextDueDateStr) {
    const d = new Date(sip.nextDueDateStr + "T00:00:00");
    nextLabel = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  const startedLabel = sip.startDate
    ? new Date(sip.startDate + "T00:00:00").toLocaleDateString("en-IN", {
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <Card
      style={{ padding: "18px 20px", borderTop: `3px solid ${statusColor}`, position: "relative" }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: isOverdue || isDueSoon ? 10 : 14,
        }}
      >
        <MFLogo fundName={sip.scheme || ""} size={40} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 14,
              color: THEME.ink,
              letterSpacing: "-0.01em",
              marginBottom: 5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {sip.scheme}
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
            {sip.fundType && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: fundColor,
                  background: `${fundColor}12`,
                  border: `1px solid ${fundColor}25`,
                  borderRadius: 4,
                  padding: "2px 6px",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                }}
              >
                {sip.fundType}
              </span>
            )}
            {sip.frequency && sip.frequency !== "monthly" && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: THEME.accent,
                  background: `${THEME.accent}12`,
                  border: `1px solid ${THEME.accent}25`,
                  borderRadius: 4,
                  padding: "2px 6px",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                }}
              >
                {sip.frequency}
              </span>
            )}
            {sip.broker && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  color: THEME.muted,
                  background: `${THEME.line}40`,
                  border: `1px solid ${THEME.line}`,
                  borderRadius: 4,
                  padding: "2px 6px",
                }}
              >
                {sip.broker}
              </span>
            )}
            {ownerLabel && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: THEME.accent,
                  background: `${THEME.accent}09`,
                  border: `1px solid ${THEME.accent}22`,
                  borderRadius: 4,
                  padding: "2px 6px",
                }}
              >
                {ownerLabel}
              </span>
            )}
            {sip.isCompleted && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: THEME.sage,
                  background: `${THEME.sage}12`,
                  border: `1px solid ${THEME.sage}25`,
                  borderRadius: 4,
                  padding: "2px 6px",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                }}
              >
                ✓ Completed
              </span>
            )}
          </div>
          {startedLabel && (
            <div style={{ fontSize: 10, color: THEME.muted, marginTop: 5, fontWeight: 500 }}>
              Started {startedLabel}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            style={{ padding: 6, color: THEME.accent }}
          >
            <Pencil size={13} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            style={{ padding: 6, color: THEME.rust }}
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {/* Overdue / Due-soon alert band */}
      {(isOverdue || isDueSoon) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            borderRadius: 8,
            marginBottom: 14,
            background: `${alertColor}10`,
            border: `1px solid ${alertColor}35`,
            color: alertColor,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          <AlertCircle size={12} />
          {isOverdue
            ? `Overdue by ${Math.abs(sip.daysUntilDue)} day${Math.abs(sip.daysUntilDue) !== 1 ? "s" : ""} — ${nextLabel}`
            : `Due in ${sip.daysUntilDue} day${sip.daysUntilDue !== 1 ? "s" : ""} — ${nextLabel}`}
        </div>
      )}

      {/* Amount + installments row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div>
          <span
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: statusColor,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmtINRExact(sip.amount)}
          </span>
          <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600, marginLeft: 4 }}>
            /{sip.frequency === "quarterly" ? "qtr" : "mo"}
          </span>
          <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 500, marginLeft: 8 }}>
            · {fmtINRFull(annualAmt)}/yr
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
            {sip.paid} / {sip.totalInstallments}
          </div>
          <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>installments paid</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 9,
            color: THEME.muted,
            marginBottom: 5,
            fontWeight: 600,
            textTransform: "uppercase" as const,
            letterSpacing: "0.08em",
          }}
        >
          <span>Progress</span>
          <span style={{ color: statusColor, fontWeight: 700 }}>
            {sip.progress.toFixed(0)}%{sip.remaining > 0 ? ` · ${sip.remaining} left` : ""}
          </span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: `${Math.min(sip.progress, 100)}%`, background: statusColor }}
          />
        </div>
      </div>

      {/* Corpus tinted tiles */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {[
          { k: "Invested", v: fmtINRFull(sip.totalInvested), color: THEME.muted },
          { k: "Est. Value", v: fmtINRFull(sip.currentCorpus), color: THEME.sage },
          {
            k: sip.isCompleted ? "Final" : "Projected",
            v: fmtINRFull(sip.projectedCorpus),
            color: THEME.gold,
          },
        ].map(({ k, v, color }) => (
          <div
            key={k}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              padding: "7px 10px",
              borderRadius: 9,
              background: `${color}09`,
              border: `1px solid ${color}22`,
              flex: "1 1 80px",
            }}
          >
            <span
              style={{
                fontSize: 9,
                textTransform: "uppercase" as const,
                color: THEME.muted,
                fontWeight: 700,
                letterSpacing: "0.07em",
              }}
            >
              {k}
            </span>
            <span
              style={{ fontSize: 12, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}
            >
              {v}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom row: total return + next due pill (on-track only) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 6,
          paddingTop: 10,
          borderTop: `1px solid ${THEME.line}`,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: sip.estimatedGains > 0 ? THEME.sage : THEME.muted,
          }}
        >
          {sip.estimatedGains > 0
            ? `+${fmtINRFull(sip.estimatedGains)} (${sip.gainPct.toFixed(1)}% total return)`
            : sip.paid === 0
              ? "Not started"
              : "—"}
        </div>
        {!sip.isCompleted && nextLabel && !isOverdue && !isDueSoon && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 6,
              background: `${THEME.muted}09`,
              border: `1px solid ${THEME.line}`,
              color: THEME.muted,
            }}
          >
            <Clock size={10} />
            Next: {nextLabel}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── SIP Modal ─────────────────────────────────────────────────────────────────
function SIPModal({ onClose, onSave, initial }: any) {
  const { mfCategories, familyProfiles } = useMasterData();
  const [f, setF] = useState(
    initial
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
          owner: "self",
          scheme: "",
          fundType: mfCategories[0] || "Equity",
          amount: "",
          frequency: "monthly",
          startDate: today(),
          totalInstallments: "12",
          broker: "",
        }
  );

  const instNum = Number(f.totalInstallments) || 0;
  const amt = Number(f.amount) || 0;
  const totalCommitment = instNum * amt;
  const durationYears =
    f.frequency === "quarterly" ? Math.floor(instNum / 4) : Math.floor(instNum / 12);
  const durationMonths = f.frequency === "quarterly" ? (instNum % 4) * 3 : instNum % 12;

  return (
    <Modal title={initial ? "Edit SIP" : "Add SIP"} onClose={onClose}>
      <Field label="Owner / Profile">
        <select
          className="form-input"
          value={f.owner}
          onChange={(e) => setF({ ...f, owner: e.target.value })}
        >
          {familyProfiles.map((p) => (
            <option key={p.id} value={p.id}>
              {formatProfileOption(p)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Scheme Name">
        <input
          className="form-input"
          value={f.scheme}
          onChange={(e) => setF({ ...f, scheme: e.target.value })}
          placeholder="e.g. Parag Parikh Flexi Cap Direct Growth"
        />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Fund Type">
          <select
            className="form-input"
            value={f.fundType}
            onChange={(e) => setF({ ...f, fundType: e.target.value })}
          >
            {mfCategories.map((c: string) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Platform / Broker">
          <select
            className="form-input"
            value={f.broker}
            onChange={(e) => setF({ ...f, broker: e.target.value })}
          >
            <option value="">— Select —</option>
            {BROKERS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Amount (₹)">
          <input
            className="form-input"
            type="number"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
            placeholder="5000"
          />
        </Field>
        <Field label="Frequency">
          <select
            className="form-input"
            value={f.frequency}
            onChange={(e) => setF({ ...f, frequency: e.target.value })}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
          </select>
        </Field>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Start Date">
          <input
            className="form-input"
            type="date"
            value={f.startDate}
            onChange={(e) => setF({ ...f, startDate: e.target.value })}
          />
        </Field>
        <Field label="Total Installments">
          <input
            className="form-input"
            type="number"
            value={f.totalInstallments}
            onChange={(e) => setF({ ...f, totalInstallments: e.target.value })}
            placeholder="120"
          />
        </Field>
      </div>

      {instNum > 0 && amt > 0 && (
        <div
          style={{
            padding: "10px 14px",
            background: "var(--surface-0)",
            border: `1px solid ${THEME.line}`,
            borderRadius: 8,
            fontSize: 12,
            color: THEME.muted,
            lineHeight: 1.7,
          }}
        >
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
