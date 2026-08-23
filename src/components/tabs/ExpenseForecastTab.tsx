/* eslint-disable */
// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  TrendingUp,
  Calendar,
  BarChart3,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Minus,
  Info,
  Search,
  Download,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, exportArrayToCSV, maskCurrencyInText } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Money } from "../ui/Money";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
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
              background: p.color || p.stroke,
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

export const ExpenseForecastTab = ({ state, metrics, setTab }) => {
  const { privacyMode } = usePrivacy();
  const [forecastMonths, setForecastMonths] = useState(6);
  const [catFilter, setCatFilter] = useState("");

  // Historical monthly expenses by category
  const historicalData = useMemo(() => {
    const monthMap = {};
    (state.transactions || [])
      .filter(
        (t) =>
          t.type === "debit" &&
          t.date &&
          t.category !== "Transfer" &&
          t.category !== "Self Transfer" &&
          t.category !== "Self-Transfer"
      )
      .forEach((t) => {
        const ym = t.date.slice(0, 7);
        const cat = t.category || "Uncategorized";
        if (!monthMap[ym]) monthMap[ym] = { total: 0, categories: {} };
        monthMap[ym].total += Number(t.amount || 0);
        monthMap[ym].categories[cat] = (monthMap[ym].categories[cat] || 0) + Number(t.amount || 0);
      });

    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ym, data]) => ({
        month: ym,
        label: `${MONTH_NAMES[parseInt(ym.split("-")[1]) - 1]} '${ym.slice(2, 4)}`,
        total: Math.round(data.total),
        ...data.categories,
      }));
  }, [state.transactions]);

  // Category averages & trends
  // Each category's series is zero-filled across every month in historicalData so that
  // "Monthly Avg" is a true per-calendar-month average (an annual premium paid once won't
  // read as if it recurs every month) and "Recent (3m)" reflects the actual last 3 calendar
  // months rather than the last 3 months the category happened to have any spend in.
  const categoryStats = useMemo(() => {
    const allCats = new Set();
    historicalData.forEach((m) => {
      Object.keys(m).forEach((key) => {
        if (key === "month" || key === "label" || key === "total") return;
        allCats.add(key);
      });
    });

    const N = historicalData.length;

    return Array.from(allCats)
      .map((cat) => {
        const series = historicalData.map((m) => Number(m[cat] || 0));
        const avg = series.reduce((s, v) => s + v, 0) / N;

        const recentCount = Math.min(3, N);
        const recentSlice = series.slice(-recentCount);
        const recentAvg = recentSlice.reduce((s, v) => s + v, 0) / recentCount;

        // Trend compares the recent window against the months BEFORE it, so a category
        // can't be forced to "Stable" just because the recent window is its whole history.
        const olderSlice = series.slice(0, N - recentCount);
        let trend = "new";
        if (olderSlice.length > 0) {
          const olderAvg = olderSlice.reduce((s, v) => s + v, 0) / olderSlice.length;
          trend =
            recentAvg > olderAvg * 1.15 ? "up" : recentAvg < olderAvg * 0.85 ? "down" : "stable";
        }

        const nonZero = series.filter((v) => v > 0);
        const max = nonZero.length ? Math.max(...nonZero) : 0;
        const min = nonZero.length ? Math.min(...nonZero) : 0;

        return {
          category: cat,
          avg: Math.round(avg),
          recentAvg: Math.round(recentAvg),
          trend,
          max: Math.round(max),
          min: Math.round(min),
          activeMonths: nonZero.length,
          totalMonths: N,
        };
      })
      .sort((a, b) => b.avg - a.avg);
  }, [historicalData]);

  const filteredCategoryStats = useMemo(() => {
    if (!catFilter.trim()) return categoryStats;
    const q = catFilter.trim().toLowerCase();
    return categoryStats.filter((c) => c.category.toLowerCase().includes(q));
  }, [categoryStats, catFilter]);

  const handleExportForecast = () => {
    const trendLabel = { up: "Rising", down: "Falling", stable: "Stable", new: "New" };
    const rows = categoryStats.map((c) => ({
      category: c.category,
      monthlyAvg: c.avg,
      recent3m: c.recentAvg,
      trend: trendLabel[c.trend],
      min: c.min,
      max: c.max,
    }));
    exportArrayToCSV(
      rows,
      [
        { key: "category", label: "Category" },
        { key: "monthlyAvg", label: "Monthly Avg" },
        { key: "recent3m", label: "Recent (3m)" },
        { key: "trend", label: "Trend" },
        { key: "min", label: "Min" },
        { key: "max", label: "Max" },
      ],
      `Expense_Forecast_Category_Trends_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  // Builds one future month's forecast point using the seasonal-blend model. Shared by the
  // chart's selectable horizon and the fixed 12-month projection used for headline stats, so
  // the two never disagree about methodology.
  const buildForecastPoint = (monthsAhead) => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + monthsAhead, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const targetMonth = d.getMonth();

    const sameMonthData = historicalData.filter(
      (h) => parseInt(h.month.split("-")[1]) - 1 === targetMonth
    );
    const recentData = historicalData.slice(-6);

    const seasonalAvg =
      sameMonthData.length >= 2
        ? sameMonthData.reduce((s, h) => s + h.total, 0) / sameMonthData.length
        : null;
    const recentAvg = recentData.reduce((s, h) => s + h.total, 0) / recentData.length;

    const predicted = seasonalAvg
      ? Math.round(seasonalAvg * 0.6 + recentAvg * 0.4)
      : Math.round(recentAvg);
    const lower = Math.round(predicted * 0.8);
    const upper = Math.round(predicted * 1.2);

    return {
      month: ym,
      label: `${MONTH_NAMES[targetMonth]} '${String(d.getFullYear()).slice(-2)}`,
      predicted,
      lower,
      upper,
      isForecast: true,
    };
  };

  // Forecast (drives the chart; length follows the user's selected horizon)
  const forecast = useMemo(() => {
    if (historicalData.length < 3) return [];
    const points = [];
    for (let i = 1; i <= forecastMonths; i++) points.push(buildForecastPoint(i));
    return points;
  }, [historicalData, forecastMonths]);

  // Always a fixed next-12-months projection, independent of the horizon dropdown, so the
  // Annual Projection stat can't silently disagree with what the chart itself predicts.
  const annualForecastPoints = useMemo(() => {
    if (historicalData.length < 3) return [];
    const points = [];
    for (let i = 1; i <= 12; i++) points.push(buildForecastPoint(i));
    return points;
  }, [historicalData]);

  // Combine historical + forecast for chart
  const chartData = useMemo(() => {
    const hist = historicalData.slice(-12).map((h) => ({
      ...h,
      predicted: h.total,
      isForecast: false,
    }));
    return [...hist, ...forecast];
  }, [historicalData, forecast]);

  // Seasonal patterns
  const seasonalPatterns = useMemo(() => {
    const monthTotals = {};
    historicalData.forEach((h) => {
      const m = parseInt(h.month.split("-")[1]) - 1;
      if (!monthTotals[m]) monthTotals[m] = [];
      monthTotals[m].push(h.total);
    });

    return MONTH_NAMES.map((name, i) => {
      const vals = monthTotals[i] || [];
      const avg = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
      return { month: name, avg: Math.round(avg) };
    });
  }, [historicalData]);

  // Annual projection — sum of the same seasonal-blend forecast shown in the chart, so this
  // headline number is always consistent with the model rather than a separate flat estimate.
  const annualProjection = useMemo(
    () => annualForecastPoints.reduce((s, p) => s + p.predicted, 0),
    [annualForecastPoints]
  );

  const nextMonth = forecast[0] || null;

  const dataConfidence =
    historicalData.length >= 12 ? "high" : historicalData.length >= 6 ? "medium" : "low";
  const confidenceCopy = {
    high: { label: "High Confidence", color: THEME.sage },
    medium: { label: "Medium Confidence", color: THEME.accent },
    low: { label: "Low Confidence", color: THEME.rust },
  }[dataConfidence];

  const trendingUp = categoryStats.filter((c) => c.trend === "up").length;
  const trendingDown = categoryStats.filter((c) => c.trend === "down").length;

  if (historicalData.length < 3) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="Not Enough Data"
        gradient={`linear-gradient(135deg, var(--t-accent), color-mix(in srgb, var(--t-accent) 65%, white))`}
        dotColor="var(--accent)"
        description="Add at least 3 months of transactions to see expense forecasts and patterns."
        pills={["Track spending", "Predict trends", "Seasonal patterns"]}
        buttonLabel="Add Transaction"
        onAdd={() => setTab?.("banks")}
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle sub="Predict future spending based on your historical patterns">
        Expense Forecast
      </SectionTitle>

      {/* Stat summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          label="Next Month Forecast"
          value={nextMonth ? fmtINRFull(nextMonth.predicted) : "—"}
          numericValue={nextMonth ? nextMonth.predicted : undefined}
          formatValue={fmtINRFull}
          icon={<TrendingUp />}
          color="var(--accent)"
          sub={
            nextMonth
              ? maskCurrencyInText(
                  `Range ${fmtINR(nextMonth.lower)} – ${fmtINR(nextMonth.upper)}`,
                  privacyMode
                )
              : undefined
          }
        />
        <StatCard
          label="Annual Projection"
          value={fmtINRFull(annualProjection)}
          numericValue={annualProjection}
          formatValue={fmtINRFull}
          icon={<Calendar />}
          color="var(--accent)"
          sub="Next 12 months, forecast model"
        />
        <StatCard
          label="Monthly Average"
          value={fmtINRFull(Math.round(annualProjection / 12))}
          numericValue={Math.round(annualProjection / 12)}
          formatValue={fmtINRFull}
          icon={<BarChart3 />}
          color={THEME.accent}
        />
        <StatCard
          label="Trending Up"
          value={`${trendingUp} categories`}
          numericValue={trendingUp}
          formatValue={(n) => `${Math.round(n)} categories`}
          icon={<ArrowUp />}
          color={THEME.rust}
          sub="Rising spending velocity"
          subColor={THEME.rust}
        />
        <StatCard
          label="Trending Down"
          value={`${trendingDown} categories`}
          numericValue={trendingDown}
          formatValue={(n) => `${Math.round(n)} categories`}
          icon={<ArrowDown />}
          color={THEME.sage}
          sub="Cooling spending velocity"
          subColor={THEME.sage}
        />
      </div>

      {/* Forecast Chart */}
      <Card style={{ padding: 24 }}>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                color: THEME.ink,
                letterSpacing: "-0.015em",
              }}
            >
              Expense Forecast
            </h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 11, color: THEME.muted }}>
                Historical spend versus predictive model bounds
              </span>
              <span
                title={`Based on ${historicalData.length} month${historicalData.length === 1 ? "" : "s"} of history — 12+ months unlocks full seasonal accuracy`}
                style={{
                  fontSize: 9.5,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  padding: "2px 8px",
                  borderRadius: 20,
                  color: confidenceCopy.color,
                  background: `color-mix(in srgb, ${confidenceCopy.color} 14%, transparent)`,
                  cursor: "default",
                }}
              >
                {confidenceCopy.label}
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--surface-0)",
              padding: "4px 14px",
              borderRadius: 12,
              border: `1px solid ${THEME.line}`,
              height: 38,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: THEME.muted,
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Horizon
            </span>
            <select
              value={forecastMonths}
              aria-label="Forecast horizon"
              onChange={(e) => setForecastMonths(Number(e.target.value))}
              style={{
                background: "transparent",
                border: "none",
                color: THEME.ink,
                fontWeight: 800,
                fontSize: 12.5,
                cursor: "pointer",
                outline: "none",
                paddingRight: "20px",
              }}
            >
              {[3, 6, 9, 12].map((m) => (
                <option key={m} value={m}>
                  Next {m} months
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ width: "100%", height: 350, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: THEME.muted }}
              tickLine={false}
              axisLine={{ stroke: THEME.line }}
            />
            <YAxis
              tickFormatter={(v) => (privacyMode ? "••••" : fmtINRFull(v))}
              tick={{ fontSize: 11, fill: THEME.muted }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: THEME.line }} />
            {historicalData.length > 0 && (
              <ReferenceLine
                x={historicalData[historicalData.length - 1].label}
                stroke={THEME.muted}
                strokeDasharray="3 3"
                label={{
                  value: "Today",
                  position: "insideTopRight",
                  fill: THEME.muted,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
            )}
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
              formatter={(value: string) => (
                <span style={{ color: THEME.ink, fontWeight: 600 }}>{value}</span>
              )}
            />
            <Area
              type="monotone"
              dataKey="upper"
              stroke="none"
              fill={THEME.rust}
              fillOpacity={0.06}
              name="Upper Bound"
            />
            <Area
              type="monotone"
              dataKey="lower"
              stroke="none"
              fill={THEME.sage}
              fillOpacity={0.06}
              name="Lower Bound"
            />
            <Area
              type="monotone"
              dataKey="predicted"
              stroke="var(--accent)"
              fill="var(--accent)"
              fillOpacity={0.08}
              strokeWidth={2}
              name="Predicted"
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="var(--t-accent)"
              fill="none"
              strokeWidth={2.5}
              name="Actual"
            />
          </AreaChart>
        </ResponsiveContainer></div>
      </Card>

      {/* Seasonal Patterns */}
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
            Seasonal Spending Patterns
          </h3>
          <div style={{ fontSize: 11, color: THEME.muted }}>
            Average monthly expenditure levels mapped across the calendar year
          </div>
        </div>
        <div style={{ width: "100%", height: 250, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={seasonalPatterns}>
            <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: THEME.muted }}
              tickLine={false}
              axisLine={{ stroke: THEME.line }}
            />
            <YAxis
              tickFormatter={(v) => (privacyMode ? "••••" : fmtINRFull(v))}
              tick={{ fontSize: 11, fill: THEME.muted }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: THEME.line, opacity: 0.4 }} />
            <Bar dataKey="avg" name="Average Spend" fill="var(--accent)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer></div>
      </Card>

      {/* Category Trends Table */}
      <Card style={{ padding: 24 }}>
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
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <h3
              style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                color: THEME.ink,
                letterSpacing: "-0.015em",
              }}
            >
              Category Trends
            </h3>
            <div style={{ fontSize: 11, color: THEME.muted }}>
              Velocity analysis comparing recent spending patterns against baseline averages
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ position: "relative" }}>
              <Search
                size={13}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: THEME.muted,
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                value={catFilter}
                onChange={(e) => setCatFilter(e.target.value)}
                placeholder="Filter category…"
                aria-label="Filter categories"
                style={{
                  border: `1px solid ${THEME.line}`,
                  borderRadius: 8,
                  padding: "6px 10px 6px 28px",
                  fontSize: 12,
                  color: THEME.ink,
                  background: "var(--surface-0)",
                  width: 150,
                }}
              />
            </div>
            <button
              onClick={handleExportForecast}
              disabled={!categoryStats.length}
              className="card-lift"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                border: `1px solid ${THEME.line}`,
                background: "var(--surface-0)",
                color: THEME.ink,
                fontSize: 12,
                fontWeight: 600,
                cursor: categoryStats.length ? "pointer" : "not-allowed",
                opacity: categoryStats.length ? 1 : 0.5,
              }}
            >
              <Download size={13} />
              Export CSV
            </button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...th, paddingLeft: 16 }}>Category</th>
                <th style={{ ...th, textAlign: "right" }}>Monthly Avg</th>
                <th style={{ ...th, textAlign: "right" }}>Recent (3m)</th>
                <th style={{ ...th, textAlign: "center" }}>Trend</th>
                <th style={{ ...th, textAlign: "right" }}>Min</th>
                <th style={{ ...th, textAlign: "right", paddingRight: 16 }}>Max</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategoryStats.slice(0, 15).map((c) => (
                <tr
                  key={c.category}
                  style={{ borderBottom: `1px solid ${THEME.line}` }}
                  className="table-row-hover"
                >
                  <td style={{ ...td, paddingLeft: 16, fontWeight: 700, color: THEME.ink }}>
                    {c.category}
                    {c.activeMonths < c.totalMonths && (
                      <div style={{ fontSize: 10, fontWeight: 500, color: THEME.muted, marginTop: 2 }}>
                        Active {c.activeMonths}/{c.totalMonths} mo
                      </div>
                    )}
                  </td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                    <Money value={c.avg} variant="full" />
                  </td>
                  <td style={{ ...td, textAlign: "right", fontWeight: 600 }}>
                    <Money value={c.recentAvg} variant="full" />
                  </td>
                  <td style={{ ...td, textAlign: "center" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "3px 10px",
                        borderRadius: 20,
                        fontSize: 10.5,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                        background:
                          c.trend === "up"
                            ? "color-mix(in srgb, var(--t-rust) 16%, transparent)"
                            : c.trend === "down"
                              ? "color-mix(in srgb, var(--t-sage) 16%, transparent)"
                              : c.trend === "new"
                                ? "color-mix(in srgb, var(--t-accent) 14%, transparent)"
                                : "var(--surface-2)",
                        color:
                          c.trend === "up"
                            ? THEME.rust
                            : c.trend === "down"
                              ? THEME.sage
                              : c.trend === "new"
                                ? THEME.accent
                                : THEME.muted,
                      }}
                    >
                      {c.trend === "up" ? (
                        <ArrowUp size={12} />
                      ) : c.trend === "down" ? (
                        <ArrowDown size={12} />
                      ) : c.trend === "new" ? (
                        <Info size={12} />
                      ) : (
                        <Minus size={12} />
                      )}
                      {c.trend === "up"
                        ? "Rising"
                        : c.trend === "down"
                          ? "Falling"
                          : c.trend === "new"
                            ? "New"
                            : "Stable"}
                    </span>
                  </td>
                  <td style={{ ...td, textAlign: "right", color: THEME.muted, fontWeight: 500 }}>
                    <Money value={c.min} variant="full" />
                  </td>
                  <td
                    style={{
                      ...td,
                      textAlign: "right",
                      color: THEME.muted,
                      fontWeight: 500,
                      paddingRight: 16,
                    }}
                  >
                    <Money value={c.max} variant="full" />
                  </td>
                </tr>
              ))}
              {filteredCategoryStats.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ ...td, textAlign: "center", color: THEME.muted, padding: "24px 16px" }}>
                    No categories match "{catFilter}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {filteredCategoryStats.length > 15 && (
          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 12, textAlign: "center" }}>
            Showing top 15 of {filteredCategoryStats.length} matching categories — refine your search to see others
          </div>
        )}
      </Card>

      {/* Disclaimer */}
      <div
        style={{
          padding: "10px 16px",
          borderRadius: 10,
          background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
          border: `1px solid color-mix(in srgb, ${THEME.muted} 13%, transparent)`,
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          fontSize: 11,
          color: THEME.muted,
          lineHeight: 1.6,
        }}
      >
        <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          <strong>How this forecast works:</strong> Predicted values blend each category's
          same-month seasonal average with its trailing 6-month average, then apply a ±20% band
          for the lower/upper bounds. Annual Projection is the sum of this same model's next 12
          months, so it always agrees with the chart above. "Monthly Avg" in the table below is
          amortized across every month in your history (so an annual premium doesn't read as if
          it recurs monthly), while Min/Max reflect only the months a category actually had
          spend — this is why Avg can sit below Min for occasional categories. It is a
          statistical projection from your own transaction history, not a guarantee — one-off
          expenses (medical, travel, gifting) and any new recurring commitments won't be
          reflected until they show up in past months.
        </span>
      </div>
    </div>
  );
};
