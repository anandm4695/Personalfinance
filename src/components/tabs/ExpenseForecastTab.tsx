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
  LineChart,
  Line,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Prv } from "../../context/PrivacyContext";
import { EmptyState } from "../ui/EmptyState";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const ExpenseForecastTab = ({ state, metrics }) => {
  const [forecastMonths, setForecastMonths] = useState(6);

  // Historical monthly expenses by category
  const historicalData = useMemo(() => {
    const monthMap = {};
    (state.transactions || []).filter((t) => t.type === "debit" && t.date).forEach((t) => {
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
  const categoryStats = useMemo(() => {
    const catMonthly = {};
    historicalData.forEach((m) => {
      Object.entries(m).forEach(([key, val]) => {
        if (key === "month" || key === "label" || key === "total") return;
        if (!catMonthly[key]) catMonthly[key] = [];
        catMonthly[key].push(val);
      });
    });

    return Object.entries(catMonthly).map(([cat, vals]) => {
      const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
      const recent3 = vals.slice(-3);
      const recentAvg = recent3.length > 0 ? recent3.reduce((s, v) => s + v, 0) / recent3.length : avg;
      const trend = recentAvg > avg * 1.15 ? "up" : recentAvg < avg * 0.85 ? "down" : "stable";
      const max = Math.max(...vals);
      const min = Math.min(...vals);
      return { category: cat, avg: Math.round(avg), recentAvg: Math.round(recentAvg), trend, max: Math.round(max), min: Math.round(min), months: vals.length };
    }).sort((a, b) => b.avg - a.avg);
  }, [historicalData]);

  // Forecast
  const forecast = useMemo(() => {
    if (historicalData.length < 3) return [];
    const now = new Date();
    const points = [];

    for (let i = 1; i <= forecastMonths; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const targetMonth = d.getMonth(); // 0-indexed

      // Use same-month historical data if available (seasonal), else use recent average
      const sameMonthData = historicalData.filter((h) => parseInt(h.month.split("-")[1]) - 1 === targetMonth);
      const recentData = historicalData.slice(-6);

      const seasonalAvg = sameMonthData.length >= 2
        ? sameMonthData.reduce((s, h) => s + h.total, 0) / sameMonthData.length
        : null;
      const recentAvg = recentData.reduce((s, h) => s + h.total, 0) / recentData.length;

      const predicted = seasonalAvg ? Math.round(seasonalAvg * 0.6 + recentAvg * 0.4) : Math.round(recentAvg);
      const lower = Math.round(predicted * 0.8);
      const upper = Math.round(predicted * 1.2);

      points.push({
        month: ym,
        label: `${MONTH_NAMES[targetMonth]} '${String(d.getFullYear()).slice(-2)}`,
        predicted,
        lower,
        upper,
        isForecast: true,
      });
    }

    return points;
  }, [historicalData, forecastMonths]);

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

  // Annual projection
  const annualProjection = useMemo(() => {
    if (historicalData.length < 3) return 0;
    const recent6 = historicalData.slice(-6);
    const monthlyAvg = recent6.reduce((s, h) => s + h.total, 0) / recent6.length;
    return Math.round(monthlyAvg * 12);
  }, [historicalData]);

  const totalCategories = categoryStats.length;
  const trendingUp = categoryStats.filter((c) => c.trend === "up").length;
  const trendingDown = categoryStats.filter((c) => c.trend === "down").length;

  if (historicalData.length < 3) {
    return (
      <EmptyState icon={TrendingUp} title="Not Enough Data"
        description="Add at least 3 months of transactions to see expense forecasts and patterns." />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle icon={TrendingUp} title="Expense Forecast" subtitle="Predict future spending based on your historical patterns" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <StatCard label="Annual Projection" value={<Prv>{fmtINRFull(annualProjection)}</Prv>} icon={Calendar} color="var(--accent)" />
        <StatCard label="Monthly Average" value={<Prv>{fmtINRFull(Math.round(annualProjection / 12))}</Prv>} icon={BarChart3} color="#3B82F6" />
        <StatCard label="Trending Up" value={`${trendingUp} categories`} icon={ArrowUp} color="#EF4444" />
        <StatCard label="Trending Down" value={`${trendingDown} categories`} icon={ArrowDown} color="#10B981" />
      </div>

      {/* Forecast Chart */}
      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: THEME.text }}>Expense Forecast</h3>
          <select value={forecastMonths} onChange={(e) => setForecastMonths(Number(e.target.value))}
            style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, fontSize: 13 }}>
            {[3, 6, 9, 12].map((m) => <option key={m} value={m}>Next {m} months</option>)}
          </select>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: THEME.textSecondary }} />
            <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 11, fill: THEME.textSecondary }} />
            <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 12 }} />
            <Legend />
            <Area type="monotone" dataKey="upper" stroke="none" fill="#EF444415" name="Upper Bound" />
            <Area type="monotone" dataKey="lower" stroke="none" fill="#10B98115" name="Lower Bound" />
            <Area type="monotone" dataKey="predicted" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.1} strokeWidth={2} name="Predicted" />
            <Area type="monotone" dataKey="total" stroke="#3B82F6" fill="none" strokeWidth={2} strokeDasharray={undefined} name="Actual" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Seasonal Patterns */}
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>Seasonal Spending Patterns</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={seasonalPatterns}>
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: THEME.textSecondary }} />
            <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 11, fill: THEME.textSecondary }} />
            <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 12 }} />
            <Bar dataKey="avg" name="Average Spend" fill="var(--accent)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Category Trends */}
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>Category Trends</h3>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${THEME.border}` }}>
                <th style={{ padding: 10, textAlign: "left", color: THEME.textSecondary }}>Category</th>
                <th style={{ padding: 10, textAlign: "right", color: THEME.textSecondary }}>Monthly Avg</th>
                <th style={{ padding: 10, textAlign: "right", color: THEME.textSecondary }}>Recent (3m)</th>
                <th style={{ padding: 10, textAlign: "center", color: THEME.textSecondary }}>Trend</th>
                <th style={{ padding: 10, textAlign: "right", color: THEME.textSecondary }}>Min</th>
                <th style={{ padding: 10, textAlign: "right", color: THEME.textSecondary }}>Max</th>
              </tr>
            </thead>
            <tbody>
              {categoryStats.slice(0, 15).map((c) => (
                <tr key={c.category} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                  <td style={{ padding: 10, fontWeight: 500, color: THEME.text }}>{c.category}</td>
                  <td style={{ padding: 10, textAlign: "right", color: THEME.text }}><Prv>{fmtINRFull(c.avg)}</Prv></td>
                  <td style={{ padding: 10, textAlign: "right", color: THEME.text }}><Prv>{fmtINRFull(c.recentAvg)}</Prv></td>
                  <td style={{ padding: 10, textAlign: "center" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                      background: c.trend === "up" ? "#EF444420" : c.trend === "down" ? "#10B98120" : `${THEME.border}`,
                      color: c.trend === "up" ? "#EF4444" : c.trend === "down" ? "#10B981" : THEME.textSecondary }}>
                      {c.trend === "up" ? <ArrowUp size={12} /> : c.trend === "down" ? <ArrowDown size={12} /> : <Minus size={12} />}
                      {c.trend === "up" ? "Rising" : c.trend === "down" ? "Falling" : "Stable"}
                    </span>
                  </td>
                  <td style={{ padding: 10, textAlign: "right", color: THEME.textSecondary }}>{fmtINRFull(c.min)}</td>
                  <td style={{ padding: 10, textAlign: "right", color: THEME.textSecondary }}>{fmtINRFull(c.max)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
