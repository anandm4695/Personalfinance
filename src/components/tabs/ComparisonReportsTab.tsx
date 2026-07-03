/* eslint-disable */
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
import { Prv } from "../../context/PrivacyContext";
import { EmptyState } from "../ui/EmptyState";

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "14px 16px",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: THEME.muted,
  fontWeight: 700,
  borderBottom: `1.5px solid ${THEME.line}`,
  whiteSpace: "nowrap",
  background: "color-mix(in srgb, var(--surface-1) 50%, transparent)",
};

const td: React.CSSProperties = {
  padding: "14px 16px",
  verticalAlign: "middle",
  fontSize: 13,
  borderBottom: `1px solid ${THEME.line}`,
  fontVariantNumeric: "tabular-nums",
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const getMonthLabel = (ym) => {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[parseInt(m) - 1]} '${y.slice(-2)}`;
};

/* ─── CUSTOM TOOLTIP ──────────────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null;
  const visible = payload.filter((p: any) => p.value !== 0 && p.value != null);
  if (!visible.length) return null;
  return (
    <div
      style={{
        background: "color-mix(in srgb, var(--surface-0) 85%, transparent)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1.5px solid ${THEME.line}`,
        borderRadius: 12,
        padding: "10px 14px",
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 800, color: THEME.ink, marginBottom: 6, letterSpacing: "-0.01em" }}>
        {label}
      </div>
      {visible.map((p: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: p.color || p.fill,
              display: "inline-block",
            }}
          />
          <span style={{ color: THEME.muted, fontWeight: 500 }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: THEME.ink }}>
            <Prv>{formatter ? formatter(p.value) : fmtINRFull(p.value)}</Prv>
          </span>
        </div>
      ))}
    </div>
  );
};

/* ─── Comparison Split Card ───────────────────────────────────── */
const ComparisonSplitCard = ({
  label,
  currentLabel,
  previousLabel,
  currentValue,
  previousValue,
  delta,
  percentChange,
  isIncome = false,
  isNetWorth = false,
  deltaIndicator,
}: any) => {
  const isUp = delta > 0;
  return (
    <div
      className="card-lift"
      style={{
        background:
          "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 12%, var(--surface-0)) 100%)",
        border: `1.5px solid ${THEME.line}`,
        borderRadius: 16,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: THEME.muted,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </div>

      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 10,
              color: THEME.muted,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 4,
            }}
          >
            {currentLabel}
          </div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 900,
              color: isIncome ? THEME.sage : isNetWorth ? "var(--accent)" : THEME.ink,
              letterSpacing: "-0.02em",
            }}
          >
            <Prv>{fmtINRFull(currentValue)}</Prv>
          </div>
        </div>

        <div style={{ fontSize: 18, color: THEME.line, fontWeight: 600, padding: "0 6px" }}>vs</div>

        <div style={{ flex: 1, textAlign: "right" }}>
          <div
            style={{
              fontSize: 10,
              color: THEME.muted,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: 4,
            }}
          >
            {previousLabel}
          </div>
          <div
            style={{ fontSize: 20, fontWeight: 700, color: THEME.muted, letterSpacing: "-0.02em" }}
          >
            <Prv>{fmtINRFull(previousValue)}</Prv>
          </div>
        </div>
      </div>

      <div
        style={{
          borderTop: `1px solid ${THEME.line}`,
          paddingTop: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        {deltaIndicator}
        {percentChange !== undefined && percentChange !== 0 && (
          <span
            style={{
              fontSize: 12,
              color: isIncome ? (isUp ? THEME.sage : THEME.rust) : isUp ? THEME.rust : THEME.sage,
              fontWeight: 700,
            }}
          >
            ({isUp ? "+" : ""}
            {percentChange.toFixed(1)}%)
          </span>
        )}
      </div>
    </div>
  );
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
    (state.transactions || [])
      .filter((t) => t.type === "debit" && t.date)
      .forEach((t) => {
        const ym = t.date.slice(0, 7);
        const cat = t.category || "Uncategorized";
        if (!map[ym]) map[ym] = { total: 0, income: 0, cats: {} };
        map[ym].total += Number(t.amount || 0);
        map[ym].cats[cat] = (map[ym].cats[cat] || 0) + Number(t.amount || 0);
      });
    (state.transactions || [])
      .filter((t) => t.type === "credit" && t.date)
      .forEach((t) => {
        const ym = t.date.slice(0, 7);
        if (!map[ym]) map[ym] = { total: 0, income: 0, cats: {} };
        map[ym].income += Number(t.amount || 0);
      });
    (state.income || [])
      .filter((i) => i.date)
      .forEach((i) => {
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
    const categoryComps = [...allCats]
      .map((cat) => {
        const curr = current.cats[cat] || 0;
        const prev = previous.cats[cat] || 0;
        const delta = curr - prev;
        const pctChange = prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;
        return {
          category: cat,
          current: Math.round(curr),
          previous: Math.round(prev),
          delta: Math.round(delta),
          pctChange,
        };
      })
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

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

    const currentFYIncomeFromLedger = (state.income || [])
      .filter((i) => inFY(i.date, currentFYStart))
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const currentFYIncomeFromTxn = (state.transactions || [])
      .filter((t) => t.type === "credit" && inFY(t.date, currentFYStart))
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const currentFYIncome =
      currentFYIncomeFromLedger > 0 ? currentFYIncomeFromLedger : currentFYIncomeFromTxn;

    const lastFYIncomeFromLedger = (state.income || [])
      .filter((i) => inFY(i.date, lastFYStart))
      .reduce((s, i) => s + Number(i.amount || 0), 0);
    const lastFYIncomeFromTxn = (state.transactions || [])
      .filter((t) => t.type === "credit" && inFY(t.date, lastFYStart))
      .reduce((s, t) => s + Number(t.amount || 0), 0);
    const lastFYIncome = lastFYIncomeFromLedger > 0 ? lastFYIncomeFromLedger : lastFYIncomeFromTxn;

    // Category breakdown
    const catCurrent = {};
    const catLast = {};
    (state.transactions || [])
      .filter((t) => t.type === "debit")
      .forEach((t) => {
        const cat = t.category || "Uncategorized";
        if (inFY(t.date, currentFYStart))
          catCurrent[cat] = (catCurrent[cat] || 0) + Number(t.amount || 0);
        if (inFY(t.date, lastFYStart)) catLast[cat] = (catLast[cat] || 0) + Number(t.amount || 0);
      });

    const allCats = new Set([...Object.keys(catCurrent), ...Object.keys(catLast)]);
    const categoryComps = [...allCats]
      .map((cat) => {
        const curr = catCurrent[cat] || 0;
        const prev = catLast[cat] || 0;
        return {
          category: cat,
          current: Math.round(curr),
          previous: Math.round(prev),
          delta: Math.round(curr - prev),
          pctChange: prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0,
        };
      })
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    // Net worth comparison
    const nwHistory = state.netWorthHistory || [];
    const currentNW = metrics.netWorth || 0;
    const lastYearNW =
      nwHistory.find(
        (h) => h.month === `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, "0")}`
      )?.netWorth || 0;

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
  }, [state, currentFYStart, lastFYStart, metrics]);

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
    if (!value || Math.abs(value) < 1) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 10px",
            borderRadius: 20,
            background: "var(--surface-2)",
            color: THEME.muted,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          <Minus size={12} /> Stable
        </span>
      );
    }
    const isUp = value > 0;
    const color = isUp ? THEME.rust : THEME.sage;
    const bg = isUp ? `${THEME.rust}16` : `${THEME.sage}16`;
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "3px 10px",
          borderRadius: 20,
          background: bg,
          color: color,
          fontSize: 11,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {isUp ? "Increased" : "Decreased"}
        {showAmount && (
          <span style={{ fontWeight: 900, marginLeft: 2 }}>
            <Prv>{fmtINRFull(Math.abs(value))}</Prv>
          </span>
        )}
      </span>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <SectionTitle sub="Month-over-month and year-over-year analysis">
          Comparison Reports
        </SectionTitle>

        {/* Premium Mode Switcher */}
        <div
          style={{
            display: "flex",
            gap: 6,
            background: "var(--surface-0)",
            border: `1.5px solid ${THEME.line}`,
            padding: "4px",
            borderRadius: 16,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {[
            { id: "mom", label: "Month vs Month" },
            { id: "yoy", label: "FY vs FY" },
          ].map((m) => {
            const active = compMode === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setCompMode(m.id)}
                className="card-lift"
                style={{
                  padding: "6px 14px",
                  borderRadius: 12,
                  background: active ? THEME.accent : "transparent",
                  border: "none",
                  color: active ? "#fff" : THEME.ink,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  whiteSpace: "nowrap",
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary Stats Split Cards */}
      <Card style={{ padding: 24 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: THEME.ink,
            marginBottom: 18,
            letterSpacing: "-0.015em",
          }}
        >
          {comp.currentLabel} vs {comp.previousLabel}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
          }}
        >
          <ComparisonSplitCard
            label="Expenses"
            currentLabel={comp.currentLabel}
            previousLabel={comp.previousLabel}
            currentValue={comp.currentExpense}
            previousValue={comp.previousExpense}
            delta={comp.expenseDelta}
            percentChange={
              comp.previousExpense > 0
                ? (comp.expenseDelta / comp.previousExpense) * 100
                : undefined
            }
            deltaIndicator={<DeltaIndicator value={comp.expenseDelta} showAmount={false} />}
          />

          <ComparisonSplitCard
            label="Income"
            currentLabel={comp.currentLabel}
            previousLabel={comp.previousLabel}
            currentValue={comp.currentIncome}
            previousValue={comp.previousIncome}
            delta={comp.incomeDelta}
            percentChange={
              comp.previousIncome > 0 ? (comp.incomeDelta / comp.previousIncome) * 100 : undefined
            }
            isIncome={true}
            deltaIndicator={<DeltaIndicator value={comp.incomeDelta} showAmount={false} />}
          />

          {compMode === "yoy" && yoyComparison.lastYearNW > 0 && (
            <ComparisonSplitCard
              label="Net Worth"
              currentLabel="Now"
              previousLabel="Last Year"
              currentValue={yoyComparison.currentNW}
              previousValue={yoyComparison.lastYearNW}
              delta={yoyComparison.nwDelta}
              percentChange={
                yoyComparison.lastYearNW > 0
                  ? (yoyComparison.nwDelta / yoyComparison.lastYearNW) * 100
                  : undefined
              }
              isNetWorth={true}
              deltaIndicator={<DeltaIndicator value={yoyComparison.nwDelta} showAmount={false} />}
            />
          )}
        </div>
      </Card>

      {/* Category Chart */}
      {chartData.length > 0 && (
        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 20 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                color: THEME.ink,
                letterSpacing: "-0.015em",
              }}
            >
              Category Comparison (Top 10)
            </h3>
            <div style={{ fontSize: 11, color: THEME.muted }}>
              Distribution comparison across selected periods
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v) => fmtINRFull(v)}
                tick={{ fontSize: 11, fill: THEME.muted }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="category"
                width={110}
                tick={{ fontSize: 11, fill: THEME.ink, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: THEME.line, opacity: 0.4 }} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                formatter={(value: string) => (
                  <span style={{ color: THEME.ink, fontWeight: 600 }}>{value}</span>
                )}
              />
              <Bar dataKey={comp.currentLabel} fill="var(--accent)" radius={[0, 6, 6, 0]} />
              <Bar
                dataKey={comp.previousLabel}
                fill={`color-mix(in srgb, ${THEME.accent} 30%, transparent)`}
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Detailed Category Table */}
      {comp.categoryComps.length > 0 && (
        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 20 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                color: THEME.ink,
                letterSpacing: "-0.015em",
              }}
            >
              Category Detail
            </h3>
            <div style={{ fontSize: 11, color: THEME.muted }}>
              Period-over-period comparative analysis by spending category
            </div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ ...th, paddingLeft: 16 }}>Category</th>
                  <th style={{ ...th, textAlign: "right" }}>{comp.currentLabel}</th>
                  <th style={{ ...th, textAlign: "right" }}>{comp.previousLabel}</th>
                  <th style={{ ...th, textAlign: "right" }}>Change</th>
                  <th style={{ ...th, textAlign: "right", paddingRight: 16 }}>%</th>
                </tr>
              </thead>
              <tbody>
                {comp.categoryComps.map((c) => (
                  <tr
                    key={c.category}
                    style={{ borderBottom: `1px solid ${THEME.line}` }}
                    className="table-row-hover"
                  >
                    <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                      {c.category}
                    </td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                      <Prv>{fmtINRFull(c.current)}</Prv>
                    </td>
                    <td style={{ ...td, textAlign: "right", color: THEME.muted, fontWeight: 500 }}>
                      <Prv>{fmtINRFull(c.previous)}</Prv>
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: "right",
                        fontWeight: 700,
                        color: c.delta > 0 ? THEME.rust : c.delta < 0 ? THEME.sage : THEME.muted,
                      }}
                    >
                      {c.delta > 0 ? "+" : ""}
                      <Prv>{fmtINRFull(c.delta)}</Prv>
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: "right",
                        fontWeight: 700,
                        paddingRight: 16,
                        color:
                          c.pctChange > 0 ? THEME.rust : c.pctChange < 0 ? THEME.sage : THEME.muted,
                      }}
                    >
                      {c.pctChange > 0 ? "+" : ""}
                      {c.pctChange.toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {comp.categoryComps.length === 0 && (
        <EmptyState
          icon={BarChart3}
          title="Not Enough Data"
          description="Add transactions across multiple months to see comparison reports."
        />
      )}
    </div>
  );
};
