// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  IndianRupee,
  Info,
  Zap,
  Shield,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
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

// Indian market benchmark returns (approximate)
const BENCHMARKS = {
  nifty50: { label: "Nifty 50", return1Y: 15, return3Y: 12, return5Y: 14, color: "#3B82F6" },
  niftyMidcap: {
    label: "Nifty Midcap 150",
    return1Y: 22,
    return3Y: 18,
    return5Y: 20,
    color: "#10B981",
  },
  fdRate: { label: "FD Rate (SBI)", return1Y: 7.1, return3Y: 6.5, return5Y: 6.8, color: "#F59E0B" },
  inflation: {
    label: "Inflation (CPI)",
    return1Y: 5.5,
    return3Y: 5.8,
    return5Y: 5.5,
    color: "#EF4444",
  },
  gold: { label: "Gold", return1Y: 18, return3Y: 13, return5Y: 12, color: "#F59E0B" },
  ppf: { label: "PPF Rate", return1Y: 7.1, return3Y: 7.1, return5Y: 7.6, color: "#8B5CF6" },
};

export const PerformanceBenchmarkTab = ({ state, metrics, marketData }) => {
  const [period, setPeriod] = useState("1y");

  // Calculate portfolio returns
  const portfolioReturns = useMemo(() => {
    const stocks = state.stocks || [];
    const mfs = state.mutualFunds || [];
    const fds = state.fixedDeposits || [];
    const ppfAccs = state.ppf || [];
    const goldHoldings = state.goldHoldings || [];

    // Equity portfolio return
    let equityInvested = 0;
    let equityCurrent = 0;
    stocks.forEach((s) => {
      const qty = Number(s.qty || 0);
      const avg = Number(s.avgPrice || 0);
      const exch = s.exchange || "NSE";
      const yfSym = `${s.symbol?.replace(/\.(NS|BO)$/i, "")}.${exch === "BSE" ? "BO" : "NS"}`;
      const md = marketData?.[yfSym];
      const curr = md?.price || Number(s.currentPrice || s.avgPrice || 0);
      equityInvested += qty * avg;
      equityCurrent += qty * curr;
    });

    // MF portfolio return
    let mfInvested = 0;
    let mfCurrent = 0;
    mfs.forEach((m) => {
      const units = Number(m.units || 0);
      const buyNav = Number(m.buyNav || 0);
      const currNav = Number(m.currentNav || m.buyNav || 0);
      mfInvested += units * buyNav;
      mfCurrent += units * currNav;
    });

    // FD returns
    const fdValue = fds.reduce((s, f) => s + Number(f.principal || 0), 0);
    const avgFDRate =
      fds.length > 0 ? fds.reduce((s, f) => s + Number(f.rate || 0), 0) / fds.length : 0;

    // PPF returns
    const ppfValue = ppfAccs.reduce((s, p) => s + Number(p.balance || 0), 0);

    // Gold returns
    const goldPricePerGram = (() => {
      try {
        return Number(localStorage.getItem("gold_price_per_gram")) || 7200;
      } catch {
        return 7200;
      }
    })();
    const goldValue = goldHoldings.reduce((s, g) => s + Number(g.grams || 0) * goldPricePerGram, 0);
    const goldInvested = goldHoldings.reduce((s, g) => s + Number(g.purchasePrice || 0), 0);

    const equityReturn =
      equityInvested > 0 ? ((equityCurrent - equityInvested) / equityInvested) * 100 : 0;
    const mfReturn = mfInvested > 0 ? ((mfCurrent - mfInvested) / mfInvested) * 100 : 0;
    const goldReturn = goldInvested > 0 ? ((goldValue - goldInvested) / goldInvested) * 100 : 0;

    const totalInvested = equityInvested + mfInvested + fdValue + ppfValue + goldInvested;
    const totalCurrent = equityCurrent + mfCurrent + fdValue + ppfValue + goldValue;
    const overallReturn =
      totalInvested > 0 ? ((totalCurrent - totalInvested) / totalInvested) * 100 : 0;

    return {
      equity: { invested: equityInvested, current: equityCurrent, return: equityReturn },
      mf: { invested: mfInvested, current: mfCurrent, return: mfReturn },
      fd: { value: fdValue, rate: avgFDRate },
      ppf: { value: ppfValue, rate: 7.1 },
      gold: { invested: goldInvested, value: goldValue, return: goldReturn },
      overall: { invested: totalInvested, current: totalCurrent, return: overallReturn },
    };
  }, [state, marketData]);

  // Comparison chart data
  const comparisonData = useMemo(() => {
    const bm = BENCHMARKS;
    const key = period === "3y" ? "return3Y" : period === "5y" ? "return5Y" : "return1Y";
    const items = [
      { name: "Your Portfolio", return: portfolioReturns.overall.return, color: "var(--accent)" },
      { name: bm.nifty50.label, return: bm.nifty50[key], color: bm.nifty50.color },
      { name: bm.niftyMidcap.label, return: bm.niftyMidcap[key], color: bm.niftyMidcap.color },
      { name: bm.fdRate.label, return: bm.fdRate[key], color: bm.fdRate.color },
      { name: bm.gold.label, return: bm.gold[key], color: bm.gold.color },
      { name: bm.inflation.label, return: bm.inflation[key], color: bm.inflation.color },
    ];
    return items;
  }, [portfolioReturns, period]);

  // Asset class comparison
  const assetComparison = useMemo(() => {
    return [
      {
        category: "Equity",
        yours: portfolioReturns.equity.return,
        benchmark: BENCHMARKS.nifty50.return1Y,
      },
      {
        category: "Mutual Funds",
        yours: portfolioReturns.mf.return,
        benchmark: BENCHMARKS.nifty50.return1Y,
      },
      {
        category: "Fixed Deposits",
        yours: portfolioReturns.fd.rate,
        benchmark: BENCHMARKS.fdRate.return1Y,
      },
      { category: "PPF", yours: portfolioReturns.ppf.rate, benchmark: BENCHMARKS.ppf.return1Y },
      {
        category: "Gold",
        yours: portfolioReturns.gold.return,
        benchmark: BENCHMARKS.gold.return1Y,
      },
    ].filter((a) => a.yours !== 0 || a.benchmark !== 0);
  }, [portfolioReturns]);

  // Financial health radar
  const healthScore = useMemo(() => {
    const savingsRate =
      metrics.monthIncome > 0 ? (1 - metrics.monthExpense / metrics.monthIncome) * 100 : 0;
    const debtRatio = metrics.debtToAssetRatio || 0;
    const emergencyMonths =
      metrics.monthExpense > 0
        ? (state.bankAccounts || []).reduce((s, a) => s + Number(a.balance || 0), 0) /
          metrics.monthExpense
        : 0;
    const diversification = [
      portfolioReturns.equity.invested > 0 ? 1 : 0,
      portfolioReturns.mf.invested > 0 ? 1 : 0,
      portfolioReturns.fd.value > 0 ? 1 : 0,
      portfolioReturns.ppf.value > 0 ? 1 : 0,
      portfolioReturns.gold.invested > 0 ? 1 : 0,
    ].reduce((s, v) => s + v, 0);

    return [
      { metric: "Savings Rate", score: Math.min(100, savingsRate * 2), fullMark: 100 },
      { metric: "Low Debt", score: Math.min(100, Math.max(0, 100 - debtRatio * 2)), fullMark: 100 },
      { metric: "Emergency Fund", score: Math.min(100, emergencyMonths * 10), fullMark: 100 },
      { metric: "Diversification", score: diversification * 20, fullMark: 100 },
      {
        metric: "Returns vs FD",
        score: Math.min(100, Math.max(0, (portfolioReturns.overall.return / 7) * 50)),
        fullMark: 100,
      },
      { metric: "Goal Progress", score: Math.min(100, metrics.overallGoalPct || 0), fullMark: 100 },
    ];
  }, [metrics, portfolioReturns, state.bankAccounts]);

  const overallScore = Math.round(
    healthScore.reduce((s, h) => s + h.score, 0) / healthScore.length
  );
  const scoreColor = overallScore >= 70 ? THEME.sage : overallScore >= 40 ? THEME.gold : THEME.rust;
  const scoreLabel = overallScore >= 70 ? "Excellent" : overallScore >= 40 ? "Good" : "Needs Work";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle sub="Compare your portfolio against market benchmarks">
        Performance Benchmark
      </SectionTitle>

      {/* Summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          label="Overall Return"
          value={`${portfolioReturns.overall.return.toFixed(1)}%`}
          icon={<TrendingUp />}
          color={portfolioReturns.overall.return >= 0 ? THEME.sage : THEME.rust}
        />
        <StatCard
          label="Total Invested"
          value={<Prv>{fmtINRFull(portfolioReturns.overall.invested)}</Prv>}
          icon={<IndianRupee />}
          color={THEME.accent}
        />
        <StatCard
          label="Current Value"
          value={<Prv>{fmtINRFull(portfolioReturns.overall.current)}</Prv>}
          icon={<Target />}
          color={THEME.accent}
        />
        <StatCard
          label="Financial Health"
          value={String(overallScore)}
          sub={scoreLabel}
          icon={<Shield />}
          color={scoreColor}
        />
      </div>

      {/* Benchmark Comparison */}
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.ink }}>
          Your Returns vs Benchmarks
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={comparisonData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: THEME.inkSecondary }}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              tick={{ fontSize: 12, fill: THEME.inkSecondary }}
            />
            <Tooltip
              formatter={(v) => `${v.toFixed(1)}%`}
              cursor={{ fill: THEME.line, opacity: 0.4 }}
              contentStyle={{
                background: THEME.card,
                border: `1px solid ${THEME.border}`,
                borderRadius: 12,
                color: THEME.ink,
              }}
              labelStyle={{ color: THEME.ink }}
              itemStyle={{ color: THEME.ink }}
            />
            <Bar
              dataKey="return"
              name="Return %"
              radius={[0, 6, 6, 0]}
              shape={(props) => {
                const { x, y, width, height, payload } = props;
                return (
                  <rect
                    x={x}
                    y={y}
                    width={Math.abs(width)}
                    height={height}
                    rx={6}
                    fill={
                      payload.name === "Your Portfolio"
                        ? "var(--accent)"
                        : payload.color || THEME.muted
                    }
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Asset-wise comparison */}
      {assetComparison.length > 0 && (
        <Card style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.ink }}>
            Asset Class Performance
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={assetComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
              <XAxis dataKey="category" tick={{ fontSize: 12, fill: THEME.inkSecondary }} />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11, fill: THEME.inkSecondary }}
              />
              <Tooltip
                formatter={(v) => `${v.toFixed(1)}%`}
                cursor={{ fill: THEME.line, opacity: 0.4 }}
                contentStyle={{
                  background: THEME.card,
                  border: `1px solid ${THEME.border}`,
                  borderRadius: 12,
                  color: THEME.ink,
                }}
                labelStyle={{ color: THEME.ink }}
                itemStyle={{ color: THEME.ink }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 12, color: THEME.ink }}
                formatter={(value: string) => (
                  <span style={{ color: THEME.ink, fontWeight: 500 }}>{value}</span>
                )}
              />
              <Bar dataKey="yours" name="Your Return" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="benchmark" name="Benchmark" fill={THEME.muted} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Financial Health Radar */}
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.ink }}>
          Financial Health Radar
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <RadarChart data={healthScore} cx="50%" cy="50%" outerRadius="80%">
            <PolarGrid stroke={THEME.muted} strokeOpacity={0.3} />
            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: THEME.inkSecondary }} />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: THEME.inkSecondary }}
            />
            <Radar
              name="Your Score"
              dataKey="score"
              stroke="var(--accent)"
              fill="var(--accent)"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </Card>

      {/* Detailed Scores */}
      <Card style={{ padding: 24 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.ink }}>
          Score Breakdown
        </h3>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: 12,
          }}
        >
          {healthScore.map((h) => {
            const color = h.score >= 70 ? THEME.sage : h.score >= 40 ? THEME.gold : THEME.rust;
            return (
              <div
                key={h.metric}
                style={{
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: THEME.bg,
                  border: `1px solid ${THEME.border}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: THEME.ink }}>
                    {h.metric}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color }}>
                    {Math.round(h.score)}/100
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    borderRadius: 3,
                    background: `color-mix(in srgb, ${THEME.muted} 25%, transparent)`,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${h.score}%`,
                      borderRadius: 3,
                      background: color,
                      transition: "width 0.5s",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
