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
  Pause,
  PlayCircle,
  StopCircle,
  Sparkles,
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
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { useAsyncAction } from "../../hooks/useAsyncAction";
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
  Debt: THEME.muted,
  Hybrid: THEME.gold,
  ELSS: THEME.rust,
  Index: THEME.sage,
  // Liquid and Flexi Cap get distinct hues outside the 5-token semantic
  // palette so all fund types remain visually distinguishable together.
  // Both use fixed chart-extension tokens (not raw hex) — a raw hex value
  // would go stale in dark mode and could exactly match the active accent
  // preset (e.g. a raw "#7c3aed" would equal THEME.accent under the
  // "Violet" theme, making the badge indistinguishable from the frequency
  // badge that already uses THEME.accent on the same card).
  Liquid: THEME.cyan,
  "Flexi Cap": THEME.violet,
};

export function SIPTrackerTab({ state, addItem, removeItem, updateItem, metrics, showToast }: any) {
  const { privacyMode } = usePrivacy();
  const [show, setShow] = useState(false);
  const [editSip, setEditSip] = useState<any>(null);
  const [sipProjRate, setSipProjRate] = useState("12");
  const [sortBy, setSortBy] = useState<string>("amount");
  const todayStr = today();

  const deleteSip = async (id: string) => {
    try {
      await removeItem("sips", id);
    } catch (e: any) {
      showToast?.(`Failed to delete SIP: ${e?.message || "Unknown error"}`, "error");
    }
  };

  const changeSipStatus = async (id: string, newStatus: string) => {
    try {
      await updateItem("sips", id, { status: newStatus });
    } catch (e: any) {
      showToast?.(`Failed to update SIP status: ${e?.message || "Unknown error"}`, "error");
    }
  };

  const { run: saveNewSip, loading: savingNewSip } = useAsyncAction(
    async (v: any) => { await addItem("sips", v); },
    { onSuccess: () => setShow(false), onError: (e: any) => showToast?.(`Failed to add SIP: ${e?.message || "Unknown error"}`, "error") }
  );
  const { run: saveSipEdit, loading: savingSipEdit } = useAsyncAction(
    async (v: any) => { await updateItem("sips", editSip.id, v); },
    { onSuccess: () => setEditSip(null), onError: (e: any) => showToast?.(`Failed to save SIP: ${e?.message || "Unknown error"}`, "error") }
  );

  const sipsWithCalc = useMemo(() => {
    return (state.sips || []).map((sip: any) => {
      const status = sip.status || "active";
      const isStopped = status === "stopped";
      const isPaused = status === "paused";
      const stepUpPct = Math.max(0, Number(sip.stepUpPct || 0)) / 100;
      const baseAmount = Number(sip.amount || 0);

      if (!sip.startDate) {
        return {
          ...sip,
          status,
          paid: 0,
          totalInvested: 0,
          remaining: Number(sip.totalInstallments || 0),
          currentCorpus: 0,
          projectedCorpus: 0,
          estimatedGains: 0,
          gainPct: 0,
          progress: 0,
          isCompleted: false,
          isInactive: isStopped || isPaused,
          monthlyEquivalent: 0,
          currentInstallmentAmt: baseAmount,
          nextDueDateStr: null,
          daysUntilDue: null,
        };
      }
      const isQuarterly = sip.frequency === "quarterly";
      const periodMonths = isQuarterly ? 3 : 1;
      const periodsPerYear = isQuarterly ? 4 : 12;
      const annualRate = Number(sipProjRate) || 12;
      const r = annualRate / periodsPerYear / 100;
      const monthsElapsed = Math.max(0, monthsBetween(sip.startDate, todayStr));
      const totalInst = Number(sip.totalInstallments || 0);
      // Open-ended SIPs (no fixed tenure) accrue installments indefinitely;
      // only cap "paid" when a real totalInstallments target is set.
      const paid =
        totalInst > 0
          ? Math.min(Math.floor(monthsElapsed / periodMonths), totalInst)
          : Math.floor(monthsElapsed / periodMonths);
      // A stopped SIP never gets new installments; a paused one is assumed to
      // resume, so it still projects forward (but is excluded from "due soon"
      // alerts and current monthly-outgo totals below).
      const remainingRaw = totalInst > 0 ? Math.max(0, totalInst - paid) : 0;
      const remaining = isStopped ? 0 : remainingRaw;

      // Step-up SIPs increase the per-installment amount by `stepUpPct` at
      // every anniversary (every `periodsPerYear` installments), compounding
      // year-over-year off the PREVIOUS year's stepped amount (not the
      // original base each time) — amount(yearIdx) = base * (1+step)^yearIdx.
      // Corpus is built with a running ordinary-annuity recurrence
      // (corpus = corpus*(1+r) + installment) so a varying installment
      // amount is handled correctly; multiplying the final total by (1+r)
      // once converts it from "ordinary" (deposit at period end) to
      // "annuity-due" (deposit at period start) basis — this scaling is
      // uniform regardless of how many periods ran, so it's valid to apply
      // it once at the end even when installment amounts vary by year.
      // With stepUpPct = 0 this reduces to the plain flat-SIP FV of annuity-due.
      let ordinaryFV = 0;
      let totalInvested = 0;
      for (let i = 0; i < paid; i++) {
        const yearIdx = Math.floor(i / periodsPerYear);
        const amt = baseAmount * Math.pow(1 + stepUpPct, yearIdx);
        ordinaryFV = ordinaryFV * (1 + r) + amt;
        totalInvested += amt;
      }
      const currentCorpus = paid === 0 ? 0 : ordinaryFV * (1 + r);

      let ordinaryFVProjected = ordinaryFV;
      for (let i = paid; i < paid + remaining; i++) {
        const yearIdx = Math.floor(i / periodsPerYear);
        const amt = baseAmount * Math.pow(1 + stepUpPct, yearIdx);
        ordinaryFVProjected = ordinaryFVProjected * (1 + r) + amt;
      }
      const projectedCorpus = remaining === 0 ? currentCorpus : ordinaryFVProjected * (1 + r);

      // The installment amount that would apply RIGHT NOW (i.e. on the next
      // due date), reflecting any step-ups already elapsed.
      const currentInstallmentAmt = baseAmount * Math.pow(1 + stepUpPct, Math.floor(paid / periodsPerYear));

      const estimatedGains = Math.max(0, currentCorpus - totalInvested);
      const gainPct = totalInvested > 0 ? (estimatedGains / totalInvested) * 100 : 0;
      const progress = totalInst > 0 ? (paid / totalInst) * 100 : 0;
      const isCompleted = totalInst > 0 && remainingRaw === 0 && paid > 0;
      const isInactive = isCompleted || isStopped || isPaused;
      // Monthly-equivalent outgo only counts SIPs actively contributing right
      // now, at their current (post-step-up) installment amount.
      const monthlyEquivalent = isInactive
        ? 0
        : isQuarterly
          ? currentInstallmentAmt / 3
          : currentInstallmentAmt;

      let nextDueDateStr: string | null = null;
      let daysUntilDue: number | null = null;
      if (!isCompleted && !isStopped && !isPaused && remaining > 0 && sip.startDate) {
        const startD = new Date(sip.startDate + "T00:00:00");
        // Date.setMonth() overflows past month-end (e.g. Jan 31 + 1mo -> Mar 3, since
        // Feb 31 doesn't exist) instead of clamping, silently shifting the due date for
        // SIPs started on the 29th/30th/31st. Clamp to the target month's last day instead.
        const startDay = startD.getDate();
        const totalMonthsAdd = paid * periodMonths;
        const rawMonth = startD.getMonth() + totalMonthsAdd;
        const targetYear = startD.getFullYear() + Math.floor(rawMonth / 12);
        const targetMonth = ((rawMonth % 12) + 12) % 12;
        const lastDayOfTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const nextD = new Date(targetYear, targetMonth, Math.min(startDay, lastDayOfTargetMonth));
        nextDueDateStr = getLocalDateString(nextD);
        const todayD = new Date(todayStr + "T00:00:00");
        daysUntilDue = Math.ceil((nextD.getTime() - todayD.getTime()) / 86400000);
      }

      return {
        ...sip,
        status,
        paid,
        totalInvested,
        remaining,
        currentCorpus,
        projectedCorpus,
        currentInstallmentAmt,
        estimatedGains,
        gainPct,
        progress,
        isCompleted,
        isInactive,
        monthlyEquivalent,
        nextDueDateStr,
        daysUntilDue,
      };
    });
  }, [state.sips, todayStr, sipProjRate]);

  const activeSips = sipsWithCalc.filter((s: any) => !s.isInactive);
  const completedSips = sipsWithCalc.filter((s: any) => s.isInactive);

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
          // A stopped SIP contributes no further installments; a paused one
          // is assumed to eventually resume, so it still projects forward.
          if (sip.isCompleted || sip.status === "stopped") continue;
          const isQuarterly = sip.frequency === "quarterly";
          const periodsPerYear = isQuarterly ? 4 : 12;
          const stepUpPct = Math.max(0, Number(sip.stepUpPct || 0)) / 100;
          const baseAmount = Number(sip.amount || 0);
          const totalInst = Number(sip.totalInstallments || 0);
          const elapsed = monthsBetween(sip.startDate, todayStr);
          const totalMonthsAtPoint = elapsed + (year - 1) * 12 + month;

          if (isQuarterly) {
            const instNum = Math.floor(totalMonthsAtPoint / 3);
            if ((totalInst === 0 || instNum < totalInst) && totalMonthsAtPoint % 3 === 0) {
              const amt = baseAmount * Math.pow(1 + stepUpPct, Math.floor((instNum - 1) / periodsPerYear));
              currentInvested += amt;
              currentWealth += amt;
            }
          } else {
            if (totalInst === 0 || totalMonthsAtPoint <= totalInst) {
              const amt =
                baseAmount * Math.pow(1 + stepUpPct, Math.floor((totalMonthsAtPoint - 1) / periodsPerYear));
              currentInvested += amt;
              currentWealth += amt;
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

  const sortedActive = sortedSips.filter((s: any) => !s.isInactive);
  const sortedCompleted = sortedSips.filter((s: any) => s.isInactive);

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
          numericValue={totalMonthlyEquivalent}
          formatValue={fmtINRFull}
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
          numericValue={totalInvested}
          formatValue={fmtINRFull}
          sub="Cumulative capital deployed"
          icon={<IndianRupee />}
          color={THEME.sage}
        />
        <StatCard
          label="Est. Returns"
          value={totalInvested > 0 ? `+${overallGainPct.toFixed(1)}%` : "—"}
          numericValue={overallGainPct}
          formatValue={(n) => (totalInvested > 0 ? `+${n.toFixed(1)}%` : "—")}
          sub={
            totalGains > 0
              ? `+${privacyMode ? "••••" : fmtINRFull(totalGains)} total return`
              : "Returns after first installment"
          }
          icon={<TrendingUp />}
          color={totalGains > 0 ? THEME.gold : THEME.muted}
        />
        <StatCard
          label="Projected Corpus"
          value={fmtINRFull(totalProjected)}
          numericValue={totalProjected}
          formatValue={fmtINRFull}
          sub={`@${sipProjRate}% p.a. · ${activeSips.length} active${completedSips.length > 0 ? `, ${completedSips.length} inactive` : ""}`}
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
                        background: `color-mix(in srgb, ${col} 4%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${col} 13%, transparent)`,
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
                          <Prv>{fmtINRFull(amt)}</Prv>/mo · {pct.toFixed(0)}%
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
                <span style={{ marginLeft: 8, fontSize: 11, color: THEME.muted, fontWeight: 700 }}>
                  · {completedSips.length} inactive
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
                  onMouseEnter={(e) => {
                    if (sortBy !== opt.key)
                      e.currentTarget.style.background =
                        "color-mix(in srgb, var(--t-accent) 8%, transparent)";
                  }}
                  onMouseLeave={(e) => {
                    if (sortBy !== opt.key) e.currentTarget.style.background = "transparent";
                  }}
                  aria-pressed={sortBy === opt.key}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 7,
                    border: "none",
                    fontSize: 11,
                    fontFamily: "inherit",
                    fontWeight: sortBy === opt.key ? 800 : 600,
                    cursor: "pointer",
                    background: sortBy === opt.key ? THEME.accent : "transparent",
                    color: sortBy === opt.key ? THEME.darkInk : THEME.muted,
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
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))",
                  gap: 16,
                  marginBottom: sortedCompleted.length > 0 ? 28 : 28,
                }}
              >
                {sortedActive.map((sip: any) => (
                  <SIPCard
                    key={sip.id}
                    sip={sip}
                    onEdit={() => setEditSip(sip)}
                    onRemove={() => {
                      if (window.confirm(`Delete "${sip.scheme || "this SIP"}"? This cannot be undone.`)) {
                        deleteSip(sip.id);
                      }
                    }}
                    onStatusChange={(newStatus: string) => changeSipStatus(sip.id, newStatus)}
                  />
                ))}
              </div>
            </>
          )}

          {/* ── Inactive SIPs (completed / paused / stopped) ── */}
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
                Inactive · {sortedCompleted.length}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(360px, 100%), 1fr))",
                  gap: 16,
                  marginBottom: 28,
                }}
              >
                {sortedCompleted.map((sip: any) => (
                  <SIPCard
                    key={sip.id}
                    sip={sip}
                    onEdit={() => setEditSip(sip)}
                    onRemove={() => {
                      if (window.confirm(`Delete "${sip.scheme || "this SIP"}"? This cannot be undone.`)) {
                        deleteSip(sip.id);
                      }
                    }}
                    onStatusChange={(newStatus: string) => changeSipStatus(sip.id, newStatus)}
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
                  background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
                  padding: "6px 14px",
                  borderRadius: 10,
                  border: `1px solid color-mix(in srgb, ${THEME.accent} 13%, transparent)`,
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
              <div style={{ width: "100%", height: "100%", position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                    tickFormatter={(v) => (privacyMode ? "••••" : fmtINRFull(v))}
                    width={72}
                  />
                  <Tooltip
                    formatter={(v: any) => (privacyMode ? "••••" : fmtINRFull(v))}
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
              </ResponsiveContainer></div>
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
          onSave={saveNewSip}
          saving={savingNewSip}
        />
      )}
      {editSip && (
        <SIPModal
          initial={editSip}
          onClose={() => setEditSip(null)}
          onSave={saveSipEdit}
          saving={savingSipEdit}
        />
      )}
    </div>
  );
}

// ── SIP Card ─────────────────────────────────────────────────────────────────
function SIPCard({ sip, onEdit, onRemove, onStatusChange }: any) {
  const { familyProfiles } = useMasterData();
  const { privacyMode } = usePrivacy();
  const isPaused = sip.status === "paused";
  const isStopped = sip.status === "stopped";
  const isOverdue = sip.daysUntilDue !== null && sip.daysUntilDue < 0;
  const isDueSoon = sip.daysUntilDue !== null && sip.daysUntilDue >= 0 && sip.daysUntilDue <= 7;
  const statusColor = sip.isCompleted
    ? THEME.muted
    : isStopped
      ? THEME.rust
      : isPaused
        ? THEME.gold
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

  const currentAmt = Number(sip.currentInstallmentAmt ?? sip.amount ?? 0);
  const annualAmt = sip.frequency === "quarterly" ? currentAmt * 4 : currentAmt * 12;
  // Show the step-up badge whenever the SIP has one configured; show the
  // "started at ₹X" note only once the amount has actually risen.
  const hasStepUpConfigured = Number(sip.stepUpPct || 0) > 0;
  const hasSteppedUp = Math.abs(currentAmt - Number(sip.amount || 0)) >= 1;

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
                  background: `color-mix(in srgb, ${fundColor} 7%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${fundColor} 15%, transparent)`,
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
                  background: `color-mix(in srgb, ${THEME.accent} 7%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
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
                  background: `color-mix(in srgb, ${THEME.line} 25%, transparent)`,
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
                  background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${THEME.accent} 13%, transparent)`,
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
                  background: `color-mix(in srgb, ${THEME.sage} 7%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${THEME.sage} 15%, transparent)`,
                  borderRadius: 4,
                  padding: "2px 6px",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                }}
              >
                ✓ Completed
              </span>
            )}
            {!sip.isCompleted && isPaused && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: THEME.gold,
                  background: `color-mix(in srgb, ${THEME.gold} 7%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${THEME.gold} 15%, transparent)`,
                  borderRadius: 4,
                  padding: "2px 6px",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                }}
              >
                ⏸ Paused
              </span>
            )}
            {!sip.isCompleted && isStopped && (
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: THEME.rust,
                  background: `color-mix(in srgb, ${THEME.rust} 7%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${THEME.rust} 15%, transparent)`,
                  borderRadius: 4,
                  padding: "2px 6px",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                }}
              >
                ■ Stopped
              </span>
            )}
            {hasStepUpConfigured && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 9,
                  fontWeight: 700,
                  color: THEME.violet,
                  background: `color-mix(in srgb, ${THEME.violet} 7%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${THEME.violet} 15%, transparent)`,
                  borderRadius: 4,
                  padding: "2px 6px",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                }}
                title={
                  privacyMode
                    ? "Amount increased after step-up"
                    : `Started at ${fmtINRExact(sip.amount)}, now ${fmtINRExact(currentAmt)} after step-up`
                }
              >
                <Sparkles size={9} /> {sip.stepUpPct}% step-up
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
          {!sip.isCompleted && !isPaused && !isStopped && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStatusChange?.("paused")}
              style={{ padding: 6, color: THEME.gold }}
              title="Pause SIP"
              aria-label="Pause SIP"
            >
              <Pause size={13} />
            </Button>
          )}
          {!sip.isCompleted && (isPaused || isStopped) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onStatusChange?.("active")}
              style={{ padding: 6, color: THEME.sage }}
              title="Resume SIP"
              aria-label="Resume SIP"
            >
              <PlayCircle size={13} />
            </Button>
          )}
          {!sip.isCompleted && !isStopped && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (
                  window.confirm(
                    `Stop "${sip.scheme || "this SIP"}"? It will no longer count toward your monthly SIP total or show due-date reminders. You can resume it any time.`
                  )
                ) {
                  onStatusChange?.("stopped");
                }
              }}
              style={{ padding: 6, color: THEME.rust }}
              title="Stop SIP"
              aria-label="Stop SIP"
            >
              <StopCircle size={13} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            style={{ padding: 6, color: THEME.accent }}
            title="Edit"
            aria-label="Edit SIP"
          >
            <Pencil size={13} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            style={{ padding: 6, color: THEME.rust }}
            title="Delete"
            aria-label="Delete SIP"
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
            background: `color-mix(in srgb, ${alertColor} 6%, transparent)`,
            border: `1px solid color-mix(in srgb, ${alertColor} 21%, transparent)`,
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
            <Prv>{fmtINRExact(currentAmt)}</Prv>
          </span>
          <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600, marginLeft: 4 }}>
            /{sip.frequency === "quarterly" ? "qtr" : "mo"}
          </span>
          <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 500, marginLeft: 8 }}>
            · <Prv>{fmtINRFull(annualAmt)}</Prv>/yr
          </span>
          {hasSteppedUp && (
            <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 500, marginTop: 3 }}>
              Started at <Prv>{fmtINRExact(sip.amount)}</Prv>
            </div>
          )}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
            {sip.paid} / {Number(sip.totalInstallments || 0) > 0 ? sip.totalInstallments : "∞"}
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
          { k: "Invested", v: <Prv>{fmtINRFull(sip.totalInvested)}</Prv>, color: THEME.muted },
          { k: "Est. Value", v: <Prv>{fmtINRFull(sip.currentCorpus)}</Prv>, color: THEME.sage },
          {
            k: sip.isCompleted || isStopped ? "Final" : "Projected",
            v: <Prv>{fmtINRFull(sip.projectedCorpus)}</Prv>,
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
              background: `color-mix(in srgb, ${color} 4%, transparent)`,
              border: `1px solid color-mix(in srgb, ${color} 13%, transparent)`,
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
          {sip.estimatedGains > 0 ? (
            <>
              +<Prv>{fmtINRFull(sip.estimatedGains)}</Prv> ({sip.gainPct.toFixed(1)}% total return)
            </>
          ) : sip.paid === 0 ? (
            "Not started"
          ) : (
            "—"
          )}
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
              background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
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
function SIPModal({ onClose, onSave, initial, saving = false }: any) {
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
          stepUpPct: String(initial.stepUpPct || "0"),
          status: initial.status || "active",
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
          stepUpPct: "0",
          status: "active",
        }
  );

  const instNum = Number(f.totalInstallments) || 0;
  const amt = Number(f.amount) || 0;
  const stepUpPctNum = Math.max(0, Number(f.stepUpPct) || 0) / 100;
  const periodsPerYear = f.frequency === "quarterly" ? 4 : 12;
  // Step-up SIPs raise the installment amount by stepUpPctNum every
  // `periodsPerYear` installments, so the flat instNum*amt estimate would
  // understate the real commitment — sum each stepped installment instead.
  let totalCommitment = 0;
  for (let i = 0; i < instNum; i++) {
    const yearIdx = Math.floor(i / periodsPerYear);
    totalCommitment += amt * Math.pow(1 + stepUpPctNum, yearIdx);
  }
  const durationYears =
    f.frequency === "quarterly" ? Math.floor(instNum / 4) : Math.floor(instNum / 12);
  const durationMonths = f.frequency === "quarterly" ? (instNum % 4) * 3 : instNum % 12;
  const isValid = f.scheme.trim().length > 0 && amt > 0;

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
      <div style={{ display: "grid", gridTemplateColumns: initial ? "1fr 1fr" : "1fr", gap: 12 }}>
        <Field label="Annual Step-Up (%)">
          <input
            className="form-input"
            type="number"
            min={0}
            max={100}
            value={f.stepUpPct}
            onChange={(e) => setF({ ...f, stepUpPct: e.target.value })}
            placeholder="0"
          />
        </Field>
        {initial && (
          <Field label="Status">
            <select
              className="form-input"
              value={f.status}
              onChange={(e) => setF({ ...f, status: e.target.value })}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="stopped">Stopped</option>
            </select>
          </Field>
        )}
      </div>
      {Number(f.stepUpPct) > 0 && (
        <div style={{ fontSize: 11, color: THEME.muted, marginTop: -10, marginBottom: 16 }}>
          Installment amount increases by {f.stepUpPct}% every year — e.g. a &ldquo;raise-with-salary&rdquo;
          SIP.
        </div>
      )}

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
          <Prv>{fmtINRFull(totalCommitment)}</Prv>
        </div>
      )}

      {!isValid && (
        <div style={{ fontSize: 11, color: THEME.rust, marginTop: -6, marginBottom: 4 }}>
          Enter a scheme name and an amount greater than 0 to save.
        </div>
      )}
      <ModalActions
        onSave={() => isValid && onSave(f)}
        onClose={onClose}
        saveLabel={initial ? "Save Changes" : "Add SIP"}
        disabled={!isValid || saving}
        loading={saving}
      />
    </Modal>
  );
}
