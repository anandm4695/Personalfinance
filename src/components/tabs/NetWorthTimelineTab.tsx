// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Zap,
  Info,
  ChevronDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  BarChart,
  Bar,
  ComposedChart,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Badge } from "../ui/Badge";
import { Prv } from "../../context/PrivacyContext";
import { EmptyState } from "../ui/EmptyState";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const formatMonth = (ym: string) => {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} '${y.slice(-2)}`;
};

const projectionPresets = [
  { label: "Conservative", returnRate: 8, inflationRate: 6 },
  { label: "Moderate", returnRate: 12, inflationRate: 6 },
  { label: "Aggressive", returnRate: 16, inflationRate: 6 },
];

export const NetWorthTimelineTab = ({ state, metrics }) => {
  const [projectionYears, setProjectionYears] = useState(5);
  const [selectedPreset, setSelectedPreset] = useState(1);
  const [monthlySavings, setMonthlySavings] = useState(
    metrics.monthIncome > 0 ? Math.round((metrics.monthIncome - metrics.monthExpense) * 0.8) : 50000
  );
  const [showBreakdown, setShowBreakdown] = useState(true);

  const history = useMemo(() => {
    return [...(state.netWorthHistory || [])]
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((h) => ({
        ...h,
        label: formatMonth(h.month),
        cash: h.cash || 0,
        equity: h.equity || 0,
        debt: h.debt || 0,
        realEstate: h.realEstate || 0,
        vehicles: h.vehicles || 0,
      }));
  }, [state.netWorthHistory]);

  const momDeltas = useMemo(() => {
    if (history.length < 2) return [];
    return history.slice(1).map((h, i) => ({
      label: h.label,
      month: h.month,
      delta: h.netWorth - history[i].netWorth,
      pctChange: history[i].netWorth ? ((h.netWorth - history[i].netWorth) / history[i].netWorth) * 100 : 0,
    }));
  }, [history]);

  const projection = useMemo(() => {
    const preset = projectionPresets[selectedPreset];
    const currentNW = metrics.netWorth || 0;
    const monthlyReturn = preset.returnRate / 100 / 12;
    const monthlyInflation = preset.inflationRate / 100 / 12;
    const months = projectionYears * 12;
    const points = [];
    const now = new Date();

    for (let i = 0; i <= months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const nominal = currentNW * Math.pow(1 + monthlyReturn, i) + monthlySavings * ((Math.pow(1 + monthlyReturn, i) - 1) / monthlyReturn || i);
      const real = nominal / Math.pow(1 + monthlyInflation, i);
      points.push({
        label: formatMonth(ym),
        month: ym,
        nominal: Math.round(nominal),
        real: Math.round(real),
      });
    }
    return points;
  }, [metrics.netWorth, projectionYears, selectedPreset, monthlySavings]);

  const milestones = useMemo(() => {
    const targets = [10_00_000, 25_00_000, 50_00_000, 1_00_00_000, 2_00_00_000, 5_00_00_000, 10_00_00_000, 25_00_00_000, 50_00_00_000];
    const currentNW = metrics.netWorth || 0;
    return targets.map((t) => {
      const achieved = currentNW >= t;
      let eta = "";
      if (!achieved && projection.length > 1) {
        const hit = projection.find((p) => p.nominal >= t);
        if (hit) eta = hit.label;
        else eta = `${projectionYears}+ years`;
      }
      return { target: t, achieved, eta };
    });
  }, [metrics.netWorth, projection, projectionYears]);

  const stats = useMemo(() => {
    if (history.length < 2) return null;
    const first = history[0];
    const last = history[history.length - 1];
    const totalGrowth = last.netWorth - first.netWorth;
    const months = history.length - 1;
    const avgMonthly = months > 0 ? totalGrowth / months : 0;
    const cagr = months > 0 ? (Math.pow(last.netWorth / Math.max(first.netWorth, 1), 12 / months) - 1) * 100 : 0;
    const best = momDeltas.reduce((a, b) => (b.delta > a.delta ? b : a), momDeltas[0]);
    const worst = momDeltas.reduce((a, b) => (b.delta < a.delta ? b : a), momDeltas[0]);
    return { totalGrowth, avgMonthly, cagr, best, worst, months };
  }, [history, momDeltas]);

  if (history.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Net Worth Timeline"
        description="Your net worth history will appear here as you add financial data. Snapshots are taken automatically each month."
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle sub="Track your wealth journey over time">Net Worth Timeline</SectionTitle>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          <StatCard label="Total Growth" value={<Prv>{fmtINRFull(stats.totalGrowth)}</Prv>} icon={<TrendingUp />}
            color={stats.totalGrowth >= 0 ? "#10B981" : "#EF4444"} />
          <StatCard label="Avg Monthly Growth" value={<Prv>{fmtINRFull(stats.avgMonthly)}</Prv>} icon={<Calendar />}
            color="#3B82F6" />
          <StatCard label="CAGR" value={`${stats.cagr.toFixed(1)}%`} icon={<Zap />}
            color={stats.cagr >= 0 ? "#10B981" : "#EF4444"} />
          <StatCard label={`Best Month (${stats.best?.label})`} value={<Prv>{fmtINRFull(stats.best?.delta || 0)}</Prv>}
            icon={<TrendingUp />} color="#10B981" />
          <StatCard label={`Worst Month (${stats.worst?.label})`} value={<Prv>{fmtINRFull(stats.worst?.delta || 0)}</Prv>}
            icon={<TrendingDown />} color="#EF4444" />
        </div>
      )}

      {/* Net Worth History Chart */}
      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: THEME.text }}>Net Worth History</h3>
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            style={{ background: "none", border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "6px 12px",
              fontSize: 13, color: THEME.textSecondary, cursor: "pointer" }}
          >
            {showBreakdown ? "Simple View" : "Asset Breakdown"}
          </button>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          {showBreakdown ? (
            <AreaChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: THEME.textSecondary }} />
              <YAxis tickFormatter={(v) => fmtINRFull(v)} tick={{ fontSize: 11, fill: THEME.textSecondary }} />
              <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 12 }} />
              <Legend />
              <Area type="monotone" dataKey="cash" stackId="1" stroke="#3B82F6" fill="#3B82F680" name="Cash" />
              <Area type="monotone" dataKey="equity" stackId="1" stroke="#10B981" fill="#10B98180" name="Equity" />
              <Area type="monotone" dataKey="debt" stackId="1" stroke="#F59E0B" fill="#F59E0B80" name="Debt" />
              <Area type="monotone" dataKey="realEstate" stackId="1" stroke="#8B5CF6" fill="#8B5CF680" name="Real Estate" />
            </AreaChart>
          ) : (
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: THEME.textSecondary }} />
              <YAxis tickFormatter={(v) => fmtINRFull(v)} tick={{ fontSize: 11, fill: THEME.textSecondary }} />
              <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 12 }} />
              <Line type="monotone" dataKey="netWorth" stroke="var(--accent)" strokeWidth={3} dot={{ r: 4 }} name="Net Worth" />
            </LineChart>
          )}
        </ResponsiveContainer>
      </Card>

      {/* Month-over-Month Delta */}
      {momDeltas.length > 0 && (
        <Card style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>Monthly Change</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={momDeltas}>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: THEME.textSecondary }} />
              <YAxis tickFormatter={(v) => fmtINRFull(v)} tick={{ fontSize: 11, fill: THEME.textSecondary }} />
              <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 12 }} />
              <Bar dataKey="delta" name="Change" fill="var(--accent)" radius={[4, 4, 0, 0]}
                // Color bars based on positive/negative
                shape={(props) => {
                  const { x, y, width, height, value } = props;
                  return <rect x={x} y={y} width={width} height={Math.abs(height)} rx={4} fill={value >= 0 ? "#10B981" : "#EF4444"} />;
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Projection / Time Machine */}
      <SectionTitle sub="Project your net worth into the future">What-If Time Machine</SectionTitle>
      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 20, alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: 12, color: THEME.textSecondary, display: "block", marginBottom: 4 }}>Projection Period</label>
            <select value={projectionYears} onChange={(e) => setProjectionYears(Number(e.target.value))}
              style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, fontSize: 14 }}>
              {[1, 2, 3, 5, 10, 15, 20, 25, 30].map((y) => <option key={y} value={y}>{y} Year{y > 1 ? "s" : ""}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: THEME.textSecondary, display: "block", marginBottom: 4 }}>Growth Scenario</label>
            <div style={{ display: "flex", gap: 8 }}>
              {projectionPresets.map((p, i) => (
                <button key={i} onClick={() => setSelectedPreset(i)}
                  style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${i === selectedPreset ? "var(--accent)" : THEME.border}`,
                    background: i === selectedPreset ? "var(--accent)" : THEME.card, color: i === selectedPreset ? "#fff" : THEME.text,
                    fontSize: 13, cursor: "pointer", fontWeight: i === selectedPreset ? 600 : 400 }}>
                  {p.label} ({p.returnRate}%)
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: THEME.textSecondary, display: "block", marginBottom: 4 }}>Monthly Savings</label>
            <input type="number" value={monthlySavings} onChange={(e) => setMonthlySavings(Number(e.target.value))}
              style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, fontSize: 14, width: 140 }} />
          </div>
        </div>

        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={projection.filter((_, i) => i % Math.max(1, Math.floor(projection.length / 60)) === 0 || i === projection.length - 1)}>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: THEME.textSecondary }} interval={Math.max(0, Math.floor(projection.length / 120))} />
            <YAxis tickFormatter={(v) => fmtINRFull(v)} tick={{ fontSize: 11, fill: THEME.textSecondary }} />
            <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 12 }} />
            <Legend />
            <Area type="monotone" dataKey="nominal" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.15} strokeWidth={2} name="Nominal Value" />
            <Area type="monotone" dataKey="real" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 5" name="Inflation-Adjusted" />
          </AreaChart>
        </ResponsiveContainer>

        <div style={{ marginTop: 16, display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div style={{ padding: "12px 20px", borderRadius: 12, background: `var(--accent)15`, border: `1px solid var(--accent)30` }}>
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>Projected in {projectionYears}y (Nominal)</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}>
              <Prv>{fmtINRFull(projection[projection.length - 1]?.nominal || 0)}</Prv>
            </div>
          </div>
          <div style={{ padding: "12px 20px", borderRadius: 12, background: "#F59E0B15", border: "1px solid #F59E0B30" }}>
            <div style={{ fontSize: 12, color: THEME.textSecondary }}>Inflation-Adjusted (Real)</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#F59E0B" }}>
              <Prv>{fmtINRFull(projection[projection.length - 1]?.real || 0)}</Prv>
            </div>
          </div>
        </div>
      </Card>

      {/* Milestones */}
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>Wealth Milestones</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
          {milestones.filter((m) => m.target >= (metrics.netWorth || 0) * 0.1).map((m) => (
            <div key={m.target} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
              borderRadius: 12, background: m.achieved ? "#10B98110" : THEME.bg, border: `1px solid ${m.achieved ? "#10B98140" : THEME.border}` }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: m.achieved ? "#10B981" : THEME.border, color: m.achieved ? "#fff" : THEME.textSecondary, fontSize: 14 }}>
                {m.achieved ? "✓" : "○"}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: THEME.text }}>{fmtINRFull(m.target)}</div>
                <div style={{ fontSize: 12, color: m.achieved ? "#10B981" : THEME.textSecondary }}>
                  {m.achieved ? "Achieved!" : m.eta ? `ETA: ${m.eta}` : "—"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
