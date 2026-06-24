// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  BarChart3,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  IndianRupee,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Prv } from "../../context/PrivacyContext";
import { EmptyState } from "../ui/EmptyState";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const getMonthLabel = (ym) => {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} '${y.slice(-2)}`;
};

export const ComparisonReportsTab = ({ state, metrics }) => {
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastYM = `${now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()}-${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, "0")}`;
  const currentFYStart = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const lastFYStart = currentFYStart - 1;

  const [compMode, setCompMode] = useState("mom"); // "mom" or "yoy"

  // Build monthly expense data
  const monthlyData = useMemo(() => {
    const map = {};
    (state.transactions || []).filter((t) => t.type === "debit" && t.date).forEach((t) => {
      const ym = t.date.slice(0, 7);
      const cat = t.category || "Uncategorized";
      if (!map[ym]) map[ym] = { total: 0, income: 0, cats: {} };
      map[ym].total += Number(t.amount || 0);
      map[ym].cats[cat] = (map[ym].cats[cat] || 0) + Number(t.amount || 0);
    });
    (state.transactions || []).filter((t) => t.type === "credit" && t.date).forEach((t) => {
      const ym = t.date.slice(0, 7);
      if (!map[ym]) map[ym] = { total: 0, income: 0, cats: {} };
      map[ym].income += Number(t.amount || 0);
    });
    (state.income || []).filter((i) => i.date).forEach((i) => {
      const ym = i.date.slice(0, 7);
      if (!map[ym]) map[ym] = { total: 0, income: 0, cats: {} };
      map[ym].income += Number(i.amount || 0);
    });
    return map;
  }, [state.transactions, state.income]);

  // Month over Month comparison
  const momComparison = useMemo(() => {
    const current = monthlyData[currentYM] || { total: 0, income: 0, cats: {} };
    const previous = monthlyData[lastYM] || { total: 0, income: 0, cats: {} };

    const allCats = new Set([...Object.keys(current.cats), ...Object.keys(previous.cats)]);
    const categoryComps = [...allCats].map((cat) => {
      const curr = current.cats[cat] || 0;
      const prev = previous.cats[cat] || 0;
      const delta = curr - prev;
      const pctChange = prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;
      return { category: cat, current: Math.round(curr), previous: Math.round(prev), delta: Math.round(delta), pctChange };
    }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    return {
      currentLabel: getMonthLabel(currentYM),
      previousLabel: getMonthLabel(lastYM),
      currentExpense: current.total,
      previousExpense: previous.total,
      currentIncome: current.income,
      previousIncome: previous.income,
      expenseDelta: current.total - previous.total,
      incomeDelta: current.income - previous.income,
      categoryComps,
    };
  }, [monthlyData, currentYM, lastYM]);

  // Year over Year (FY comparison)
  const yoyComparison = useMemo(() => {
    const inFY = (date, startYear) => {
      if (!date) return false;
      return date >= `${startYear}-04-01` && date <= `${startYear + 1}-03-31`;
    };

    const currentFYExpense = (state.transactions || [])
      .filter((t) => t.type === "debit" && inFY(t.date, currentFYStart))
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const lastFYExpense = (state.transactions || [])
      .filter((t) => t.type === "debit" && inFY(t.date, lastFYStart))
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const currentFYIncome = (state.income || [])
      .filter((i) => inFY(i.date, currentFYStart))
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const lastFYIncome = (state.income || [])
      .filter((i) => inFY(i.date, lastFYStart))
      .reduce((s, i) => s + Number(i.amount || 0), 0);

    // Category breakdown
    const catCurrent = {};
    const catLast = {};
    (state.transactions || []).filter((t) => t.type === "debit").forEach((t) => {
      const cat = t.category || "Uncategorized";
      if (inFY(t.date, currentFYStart)) catCurrent[cat] = (catCurrent[cat] || 0) + Number(t.amount || 0);
      if (inFY(t.date, lastFYStart)) catLast[cat] = (catLast[cat] || 0) + Number(t.amount || 0);
    });

    const allCats = new Set([...Object.keys(catCurrent), ...Object.keys(catLast)]);
    const categoryComps = [...allCats].map((cat) => {
      const curr = catCurrent[cat] || 0;
      const prev = catLast[cat] || 0;
      return {
        category: cat,
        current: Math.round(curr),
        previous: Math.round(prev),
        delta: Math.round(curr - prev),
        pctChange: prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0,
      };
    }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    // Net worth comparison
    const nwHistory = state.netWorthHistory || [];
    const currentNW = metrics.netWorth || 0;
    const lastYearNW = nwHistory.find((h) => h.month === `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, "0")}`)?.netWorth || 0;

    return {
      currentLabel: `FY ${currentFYStart}-${String(currentFYStart + 1).slice(-2)}`,
      previousLabel: `FY ${lastFYStart}-${String(lastFYStart + 1).slice(-2)}`,
      currentExpense: currentFYExpense,
      previousExpense: lastFYExpense,
      currentIncome: currentFYIncome,
      previousIncome: lastFYIncome,
      expenseDelta: currentFYExpense - lastFYExpense,
      incomeDelta: currentFYIncome - lastFYIncome,
      currentNW,
      lastYearNW,
      nwDelta: currentNW - lastYearNW,
      categoryComps,
    };
  }, [state, currentFYStart, lastFYStart, metrics, now]);

  const comp = compMode === "mom" ? momComparison : yoyComparison;

  // Chart data for category comparison
  const chartData = useMemo(() => {
    return comp.categoryComps.slice(0, 10).map((c) => ({
      category: c.category.length > 12 ? c.category.slice(0, 12) + "…" : c.category,
      [comp.currentLabel]: c.current,
      [comp.previousLabel]: c.previous,
    }));
  }, [comp]);

  const DeltaIndicator = ({ value, showAmount = true }) => {
    if (!value || Math.abs(value) < 1) return <Minus size={14} color={THEME.textSecondary} />;
    const isUp = value > 0;
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 13, fontWeight: 600,
        color: isUp ? THEME.rust : THEME.sage }}>
        {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        {showAmount && <Prv>{fmtINRFull(Math.abs(value))}</Prv>}
      </span>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <SectionTitle sub="Month-over-month and year-over-year analysis">Comparison Reports</SectionTitle>
        <div style={{ display: "flex", gap: 8 }}>
          {[{ id: "mom", label: "Month vs Month" }, { id: "yoy", label: "FY vs FY" }].map((m) => (
            <button key={m.id} onClick={() => setCompMode(m.id)}
              style={{ padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                border: `1px solid ${compMode === m.id ? "var(--accent)" : THEME.border}`,
                background: compMode === m.id ? "var(--accent)" : THEME.card, color: compMode === m.id ? "#fff" : THEME.text }}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>
          {comp.currentLabel} vs {comp.previousLabel}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <div style={{ padding: 16, borderRadius: 12, background: THEME.bg, border: `1px solid ${THEME.border}` }}>
            <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 8 }}>Expenses</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: THEME.textSecondary }}>{comp.currentLabel}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: THEME.text }}><Prv>{fmtINRFull(comp.currentExpense)}</Prv></div>
              </div>
              <div style={{ fontSize: 24, color: THEME.border }}>vs</div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: THEME.textSecondary }}>{comp.previousLabel}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: THEME.textSecondary }}><Prv>{fmtINRFull(comp.previousExpense)}</Prv></div>
              </div>
            </div>
            <div style={{ marginTop: 8, textAlign: "center" }}>
              <DeltaIndicator value={comp.expenseDelta} />
              {comp.previousExpense > 0 && (
                <span style={{ fontSize: 12, color: THEME.textSecondary, marginLeft: 8 }}>
                  ({((comp.expenseDelta / comp.previousExpense) * 100).toFixed(1)}%)
                </span>
              )}
            </div>
          </div>

          <div style={{ padding: 16, borderRadius: 12, background: THEME.bg, border: `1px solid ${THEME.border}` }}>
            <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 8 }}>Income</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: THEME.textSecondary }}>{comp.currentLabel}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: THEME.sage }}><Prv>{fmtINRFull(comp.currentIncome)}</Prv></div>
              </div>
              <div style={{ fontSize: 24, color: THEME.border }}>vs</div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: THEME.textSecondary }}>{comp.previousLabel}</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: THEME.textSecondary }}><Prv>{fmtINRFull(comp.previousIncome)}</Prv></div>
              </div>
            </div>
          </div>

          {compMode === "yoy" && yoyComparison.lastYearNW > 0 && (
            <div style={{ padding: 16, borderRadius: 12, background: THEME.bg, border: `1px solid ${THEME.border}` }}>
              <div style={{ fontSize: 12, color: THEME.textSecondary, marginBottom: 8 }}>Net Worth</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, color: THEME.textSecondary }}>Now</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent)" }}><Prv>{fmtINRFull(yoyComparison.currentNW)}</Prv></div>
                </div>
                <div style={{ fontSize: 24, color: THEME.border }}>vs</div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: THEME.textSecondary }}>Last Year</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: THEME.textSecondary }}><Prv>{fmtINRFull(yoyComparison.lastYearNW)}</Prv></div>
                </div>
              </div>
              <div style={{ marginTop: 8, textAlign: "center", fontSize: 14, fontWeight: 600, color: yoyComparison.nwDelta >= 0 ? THEME.sage : THEME.rust }}>
                {yoyComparison.nwDelta >= 0 ? "+" : ""}<Prv>{fmtINRFull(yoyComparison.nwDelta)}</Prv>
                {yoyComparison.lastYearNW > 0 && ` (${((yoyComparison.nwDelta / yoyComparison.lastYearNW) * 100).toFixed(1)}%)`}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Category Chart */}
      {chartData.length > 0 && (
        <Card style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>Category Comparison (Top 10)</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
              <XAxis type="number" tickFormatter={(v) => fmtINRFull(v)} tick={{ fontSize: 11, fill: THEME.textSecondary }} />
              <YAxis type="category" dataKey="category" width={100} tick={{ fontSize: 11, fill: THEME.textSecondary }} />
              <Tooltip formatter={(v) => fmtINRFull(v)} cursor={{ fill: THEME.line, opacity: 0.4 }} contentStyle={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 12, color: THEME.ink }} labelStyle={{ color: THEME.ink }} itemStyle={{ color: THEME.ink }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12, color: THEME.ink }} formatter={(value: string) => <span style={{ color: THEME.ink, fontWeight: 500 }}>{value}</span>} />
              <Bar dataKey={comp.currentLabel} fill="var(--accent)" radius={[0, 4, 4, 0]} />
              <Bar dataKey={comp.previousLabel} fill={THEME.muted} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Detailed Category Table */}
      {comp.categoryComps.length > 0 && (
        <Card style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>Category Detail</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${THEME.border}` }}>
                  <th style={{ padding: 10, textAlign: "left", color: THEME.textSecondary }}>Category</th>
                  <th style={{ padding: 10, textAlign: "right", color: THEME.textSecondary }}>{comp.currentLabel}</th>
                  <th style={{ padding: 10, textAlign: "right", color: THEME.textSecondary }}>{comp.previousLabel}</th>
                  <th style={{ padding: 10, textAlign: "right", color: THEME.textSecondary }}>Change</th>
                  <th style={{ padding: 10, textAlign: "right", color: THEME.textSecondary }}>%</th>
                </tr>
              </thead>
              <tbody>
                {comp.categoryComps.map((c) => (
                  <tr key={c.category} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                    <td style={{ padding: 10, fontWeight: 500, color: THEME.text }}>{c.category}</td>
                    <td style={{ padding: 10, textAlign: "right", color: THEME.text }}><Prv>{fmtINRFull(c.current)}</Prv></td>
                    <td style={{ padding: 10, textAlign: "right", color: THEME.textSecondary }}><Prv>{fmtINRFull(c.previous)}</Prv></td>
                    <td style={{ padding: 10, textAlign: "right", fontWeight: 600, color: c.delta > 0 ? THEME.rust : c.delta < 0 ? THEME.sage : THEME.textSecondary }}>
                      {c.delta > 0 ? "+" : ""}<Prv>{fmtINRFull(c.delta)}</Prv>
                    </td>
                    <td style={{ padding: 10, textAlign: "right", color: c.pctChange > 0 ? THEME.rust : c.pctChange < 0 ? THEME.sage : THEME.textSecondary }}>
                      {c.pctChange > 0 ? "+" : ""}{c.pctChange.toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {comp.categoryComps.length === 0 && (
        <EmptyState icon={BarChart3} title="Not Enough Data"
          description="Add transactions across multiple months to see comparison reports." />
      )}
    </div>
  );
};
