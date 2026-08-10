/* eslint-disable */
// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  IndianRupee,
  Info,
  Shield,
  Download,
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
} from "recharts";
import { THEME } from "../../utils/constants";
import {
  fmtINRFull,
  calcCAGR,
  getGoldPricePerGram,
  GOLD_PURITY_FACTOR,
  exportArrayToCSV,
} from "../../utils/finance";
import { INDEX_BENCHMARKS, OTHER_BENCHMARKS, BENCHMARK_DATA_ASOF } from "../../utils/benchmarkData";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Prv } from "../../context/PrivacyContext";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";

// Indian market benchmark returns, sourced from the shared benchmarkData module
// (single source of truth also used by DematTab's "Portfolio vs Benchmark" card) —
// see BENCHMARK_DATA_ASOF disclaimer rendered below the comparison chart.
const BENCHMARKS = {
  nifty50: {
    label: INDEX_BENCHMARKS.nifty50.label,
    return1Y: INDEX_BENCHMARKS.nifty50["1Y"],
    return3Y: INDEX_BENCHMARKS.nifty50["3Y"],
    return5Y: INDEX_BENCHMARKS.nifty50["5Y"],
    color: THEME.accent,
  },
  niftyMidcap: {
    label: INDEX_BENCHMARKS.niftyMidcap.label,
    return1Y: INDEX_BENCHMARKS.niftyMidcap["1Y"],
    return3Y: INDEX_BENCHMARKS.niftyMidcap["3Y"],
    return5Y: INDEX_BENCHMARKS.niftyMidcap["5Y"],
    color: THEME.sage,
  },
  fdRate: {
    label: OTHER_BENCHMARKS.fdRate.label,
    return1Y: OTHER_BENCHMARKS.fdRate["1Y"],
    return3Y: OTHER_BENCHMARKS.fdRate["3Y"],
    return5Y: OTHER_BENCHMARKS.fdRate["5Y"],
    color: THEME.gold,
  },
  inflation: {
    label: OTHER_BENCHMARKS.inflation.label,
    return1Y: OTHER_BENCHMARKS.inflation["1Y"],
    return3Y: OTHER_BENCHMARKS.inflation["3Y"],
    return5Y: OTHER_BENCHMARKS.inflation["5Y"],
    color: THEME.rust,
  },
  // Gold & PPF reuse the fixed chart-extension tokens (not the user-selectable
  // accent) so all six benchmark series stay visually distinguishable on the
  // same chart legend even if the active accent theme happens to be purple.
  gold: {
    label: OTHER_BENCHMARKS.gold.label,
    return1Y: OTHER_BENCHMARKS.gold["1Y"],
    return3Y: OTHER_BENCHMARKS.gold["3Y"],
    return5Y: OTHER_BENCHMARKS.gold["5Y"],
    color: THEME.violet,
  },
  ppf: {
    label: OTHER_BENCHMARKS.ppf.label,
    return1Y: OTHER_BENCHMARKS.ppf["1Y"],
    return3Y: OTHER_BENCHMARKS.ppf["3Y"],
    return5Y: OTHER_BENCHMARKS.ppf["5Y"],
    color: THEME.pink,
  },
};
// PPF pays one government-declared rate to every account — reuse the same
// canonical figure everywhere in this file instead of a separately hardcoded 7.1.
const PPF_STATED_RATE = OTHER_BENCHMARKS.ppf["1Y"];

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
            <Prv>{formatter ? formatter(p.value) : p.value}</Prv>
          </span>
        </div>
      ))}
    </div>
  );
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
    let earliestStockDate: string | null = null;
    stocks.forEach((s) => {
      const qty = Number(s.qty || 0);
      const avg = Number(s.avgPrice || 0);
      const exch = s.exchange || "NSE";
      const yfSym = `${s.symbol?.replace(/\.(NS|BO)$/i, "")}.${exch === "BSE" ? "BO" : "NS"}`;
      const md = marketData?.[yfSym];
      const curr = md?.price || Number(s.currentPrice || s.avgPrice || 0);
      equityInvested += qty * avg;
      equityCurrent += qty * curr;
      const bd = s.buyDate || s.purchaseDate;
      if (bd && (!earliestStockDate || bd < earliestStockDate)) earliestStockDate = bd;
    });

    // MF portfolio return
    let mfInvested = 0;
    let mfCurrent = 0;
    let earliestMFDate: string | null = null;
    mfs.forEach((m) => {
      const units = Number(m.units || 0);
      const buyNav = Number(m.buyNav || 0);
      const currNav = Number(m.currentNav || m.buyNav || 0);
      mfInvested += units * buyNav;
      mfCurrent += units * currNav;
      if (m.buyDate && (!earliestMFDate || m.buyDate < earliestMFDate)) earliestMFDate = m.buyDate;
    });

    // FD returns
    const fdValue = fds.reduce((s, f) => s + Number(f.principal || 0), 0);
    const avgFDRate =
      fds.length > 0 ? fds.reduce((s, f) => s + Number(f.rate || 0), 0) / fds.length : 0;

    // PPF returns
    const ppfValue = ppfAccs.reduce((s, p) => s + Number(p.balance || 0), 0);

    // Gold returns
    const goldPricePerGram = getGoldPricePerGram(state);
    // Physical gold purity (e.g. 22K jewellery) is worth less than 24K bullion —
    // apply the same purity discount used everywhere else (GoldSGBTab, useMetrics,
    // RebalancingTab); omitting it overstated goldValue/goldReturn for non-24K holdings.
    let earliestGoldDate: string | null = null;
    const goldValue = goldHoldings.reduce((s, g) => {
      const purityMul = g.type === "physical" ? GOLD_PURITY_FACTOR[g.purity] || 1 : 1;
      if (g.purchaseDate && (!earliestGoldDate || g.purchaseDate < earliestGoldDate))
        earliestGoldDate = g.purchaseDate;
      return s + Number(g.grams || 0) * goldPricePerGram * purityMul;
    }, 0);
    const goldInvested = goldHoldings.reduce((s, g) => s + Number(g.purchasePrice || 0), 0);

    // Benchmarks (Nifty/gold/FD/inflation) are annualised (1Y/3Y/5Y) figures, so the
    // portfolio side of the comparison must also be annualised (CAGR), not a raw
    // absolute since-inception % — otherwise a stock held 5 years at +80% absolute
    // (~12.5% CAGR) would appear to crush a 15%-annualised Nifty 50 on the same chart.
    // Fall back to the absolute return only when there's no buy-date to annualise from
    // (e.g. legacy holdings without a stored purchase date).
    const equityCAGR =
      equityInvested > 0 ? calcCAGR(equityInvested, equityCurrent, earliestStockDate) : null;
    const equityReturn =
      equityCAGR != null
        ? equityCAGR
        : equityInvested > 0
          ? ((equityCurrent - equityInvested) / equityInvested) * 100
          : 0;

    const mfCAGR = mfInvested > 0 ? calcCAGR(mfInvested, mfCurrent, earliestMFDate) : null;
    const mfReturn =
      mfCAGR != null ? mfCAGR : mfInvested > 0 ? ((mfCurrent - mfInvested) / mfInvested) * 100 : 0;

    const goldCAGR = goldInvested > 0 ? calcCAGR(goldInvested, goldValue, earliestGoldDate) : null;
    const goldReturn =
      goldCAGR != null
        ? goldCAGR
        : goldInvested > 0
          ? ((goldValue - goldInvested) / goldInvested) * 100
          : 0;

    const totalInvested = equityInvested + mfInvested + fdValue + ppfValue + goldInvested;
    const totalCurrent = equityCurrent + mfCurrent + fdValue + ppfValue + goldValue;
    // Blend the overall figure as a current-value-weighted average of each bucket's
    // own annualised rate (equity/MF/gold CAGR, FD's stated rate, PPF's stated rate)
    // rather than an absolute % on the combined total — same weighting approach used
    // by InvestmentStatementTab's portfolio-level weightedCAGR, so the two tabs agree.
    const weightedParts = [
      { rate: equityReturn, value: equityCurrent },
      { rate: mfReturn, value: mfCurrent },
      { rate: avgFDRate, value: fdValue },
      { rate: PPF_STATED_RATE, value: ppfValue },
      { rate: goldReturn, value: goldValue },
    ].filter((p) => p.value > 0);
    const overallReturn =
      totalCurrent > 0 && weightedParts.length > 0
        ? weightedParts.reduce((s, p) => s + p.rate * (p.value / totalCurrent), 0)
        : 0;

    return {
      equity: { invested: equityInvested, current: equityCurrent, return: equityReturn },
      mf: { invested: mfInvested, current: mfCurrent, return: mfReturn },
      fd: { value: fdValue, rate: avgFDRate },
      ppf: { value: ppfValue, rate: PPF_STATED_RATE },
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

  // Asset class comparison — benchmark side must track the same 1Y/3Y/5Y period
  // toggle as comparisonData above, otherwise the two charts silently disagree
  // (e.g. selecting "3 Years" moved the top chart's Nifty bar but left this one
  // showing the 1Y figure).
  const assetComparison = useMemo(() => {
    const key = period === "3y" ? "return3Y" : period === "5y" ? "return5Y" : "return1Y";
    return [
      {
        category: "Equity",
        yours: portfolioReturns.equity.return,
        benchmark: BENCHMARKS.nifty50[key],
      },
      {
        category: "Mutual Funds",
        yours: portfolioReturns.mf.return,
        benchmark: BENCHMARKS.nifty50[key],
      },
      {
        category: "Fixed Deposits",
        yours: portfolioReturns.fd.rate,
        benchmark: BENCHMARKS.fdRate[key],
      },
      { category: "PPF", yours: portfolioReturns.ppf.rate, benchmark: BENCHMARKS.ppf[key] },
      {
        category: "Gold",
        yours: portfolioReturns.gold.return,
        benchmark: BENCHMARKS.gold[key],
      },
    ].filter((a) => a.yours !== 0 || a.benchmark !== 0);
  }, [portfolioReturns, period]);

  // Financial health radar
  const fdReferenceRate = portfolioReturns.fd.rate > 0 ? portfolioReturns.fd.rate : BENCHMARKS.fdRate.return1Y;
  const healthScore = useMemo(() => {
    const savingsRate =
      metrics.monthIncome > 0 ? (1 - metrics.monthExpense / metrics.monthIncome) * 100 : 0;
    const debtRatio = metrics.debtToAssetRatio || 0;
    // Same figure as the dedicated Emergency Fund tab (bank + near-term FDs +
    // liquid MF + prepaid), not raw bank balance alone.
    const emergencyMonths = metrics.emergencyFund.monthsCovered;
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
      {
        metric: "Emergency Fund",
        // Scaled to the same 12-month "excellent" ceiling as the Emergency Fund
        // tab (getEmergencyFundStatus), not an unrelated 10-month cap.
        score: Math.min(100, (emergencyMonths / 12) * 100),
        fullMark: 100,
      },
      { metric: "Diversification", score: diversification * 20, fullMark: 100 },
      {
        // Reuse the same FD reference rate as the rest of this file (the user's
        // actual average FD rate if they hold any, else the BENCHMARKS.fdRate
        // figure) instead of an unrelated hardcoded "7" that used to silently
        // diverge from both.
        metric: "Returns vs FD",
        score: Math.min(
          100,
          Math.max(0, (portfolioReturns.overall.return / fdReferenceRate) * 50)
        ),
        fullMark: 100,
      },
      { metric: "Goal Progress", score: Math.min(100, metrics.overallGoalPct || 0), fullMark: 100 },
    ];
  }, [metrics, portfolioReturns, fdReferenceRate]);

  const overallScore = Math.round(
    healthScore.reduce((s, h) => s + h.score, 0) / healthScore.length
  );
  const scoreColor = overallScore >= 70 ? THEME.sage : overallScore >= 40 ? THEME.gold : THEME.rust;
  const scoreLabel = overallScore >= 70 ? "Excellent" : overallScore >= 40 ? "Good" : "Needs Work";

  if (portfolioReturns.overall.invested === 0 && portfolioReturns.overall.current === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <SectionTitle sub="Compare your portfolio against market benchmarks">
          Performance Benchmark
        </SectionTitle>
        <EmptyState
          icon={BarChart3}
          title="No Portfolio Data Yet"
          description="Add stocks, mutual funds, FDs, PPF or gold holdings to see how your returns stack up against Nifty 50, FD rates and inflation."
        />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle sub="Compare your portfolio against market benchmarks">
        Performance Benchmark
      </SectionTitle>

      {/* Summary Stat Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        <StatCard
          label="Overall Return"
          value={`${portfolioReturns.overall.return.toFixed(1)}%`}
          numericValue={portfolioReturns.overall.return}
          formatValue={(n) => `${n.toFixed(1)}%`}
          sub="Blended, weighted by current value"
          icon={
            portfolioReturns.overall.return >= 0 ? (
              <TrendingUp />
            ) : (
              <TrendingDown />
            )
          }
          color={portfolioReturns.overall.return >= 0 ? THEME.sage : THEME.rust}
        />
        <StatCard
          label="Total Invested"
          value={fmtINRFull(portfolioReturns.overall.invested)}
          numericValue={portfolioReturns.overall.invested}
          formatValue={fmtINRFull}
          icon={<IndianRupee />}
          color={THEME.accent}
        />
        <StatCard
          label="Current Value"
          value={fmtINRFull(portfolioReturns.overall.current)}
          numericValue={portfolioReturns.overall.current}
          formatValue={fmtINRFull}
          icon={<Target />}
          color={THEME.accent}
        />
        <StatCard
          label="Financial Health"
          value={String(overallScore)}
          numericValue={overallScore}
          formatValue={(n) => String(Math.round(n))}
          sub={scoreLabel}
          subColor={scoreColor}
          icon={<Shield />}
          color={scoreColor}
        />
      </div>

      {/* Benchmark Comparison */}
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
              Your Returns vs Benchmarks
            </h3>
            <div style={{ fontSize: 11, color: THEME.muted }}>
              Comparative performance mapping against market benchmarks
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: THEME.muted,
                fontStyle: "italic",
                display: "flex",
                alignItems: "center",
                gap: 4,
                marginTop: 2,
              }}
              title="Index, FD, gold, inflation and PPF figures are illustrative long-run averages, not live-updated market data."
            >
              <Info size={11} style={{ flexShrink: 0 }} />
              Illustrative long-run averages, as of {BENCHMARK_DATA_ASOF} — not live-updated
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={() =>
                exportArrayToCSV(
                  comparisonData.map((d) => ({ name: d.name, returnPct: d.return.toFixed(1) })),
                  [
                    { key: "name", label: "Series" },
                    { key: "returnPct", label: `Return % (${period.toUpperCase()})` },
                  ],
                  `performance-benchmark-${period}.csv`
                )
              }
              className="card-lift"
              title="Export this comparison as CSV"
              aria-label="Export benchmark comparison as CSV"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 12,
                background: "var(--surface-0)",
                border: `1.5px solid ${THEME.line}`,
                color: THEME.ink,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <Download size={13} />
              CSV
            </button>

            <div
              role="tablist"
              aria-label="Benchmark comparison period"
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
                { id: "1y", label: "1 Year" },
                { id: "3y", label: "3 Years" },
                { id: "5y", label: "5 Years" },
              ].map((p) => {
                const active = period === p.id;
                return (
                  <button
                    key={p.id}
                    role="tab"
                    aria-selected={active}
                    aria-pressed={active}
                    onClick={() => setPeriod(p.id)}
                    className="card-lift"
                    style={{
                      padding: "6px 14px",
                      borderRadius: 12,
                      background: active ? "var(--accent)" : "transparent",
                      border: "none",
                      color: active ? THEME.darkInk : THEME.ink,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ width: "100%", height: 300, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={comparisonData} layout="vertical">
            <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: THEME.muted }}
              tickFormatter={(v) => `${v}%`}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={130}
              tick={{ fontSize: 11, fill: THEME.ink, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v) => `${v.toFixed(1)}%`}
              content={<ChartTooltip formatter={(v) => `${v.toFixed(1)}%`} />}
              cursor={{ fill: THEME.line, opacity: 0.4 }}
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
        </ResponsiveContainer></div>
      </Card>

      {/* Asset-wise comparison */}
      {assetComparison.length > 0 && (
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
              Asset Class Performance
            </h3>
            <div style={{ fontSize: 11, color: THEME.muted }}>
              Side-by-side returns breakdown by asset class ·{" "}
              {period === "3y" ? "3 Year" : period === "5y" ? "5 Year" : "1 Year"} benchmark
            </div>
          </div>
          <div style={{ width: "100%", height: 300, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={assetComparison}>
              <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} vertical={false} />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 11, fill: THEME.muted }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 11, fill: THEME.muted }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(v) => `${v.toFixed(1)}%`}
                content={<ChartTooltip formatter={(v) => `${v.toFixed(1)}%`} />}
                cursor={{ fill: THEME.line, opacity: 0.4 }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                formatter={(value: string) => (
                  <span style={{ color: THEME.ink, fontWeight: 600 }}>{value}</span>
                )}
              />
              <Bar dataKey="yours" name="Your Return" fill="var(--accent)" radius={[6, 6, 0, 0]} />
              <Bar
                dataKey="benchmark"
                name="Benchmark"
                fill={`color-mix(in srgb, var(--accent) 30%, transparent)`}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer></div>
        </Card>
      )}

      {/* Financial Health Radar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(var(--grid-min-lg), 1fr))",
          gap: 16,
        }}
      >
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
              Financial Health Radar
            </h3>
            <div style={{ fontSize: 11, color: THEME.muted }}>
              Visual index alignment score matching primary targets
            </div>
          </div>
          <div style={{ width: "100%", height: 300, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <RadarChart data={healthScore} cx="50%" cy="50%" outerRadius="80%">
              <PolarGrid stroke={THEME.line} strokeOpacity={0.7} />
              <PolarAngleAxis
                dataKey="metric"
                tick={{ fontSize: 11, fill: THEME.ink, fontWeight: 600 }}
              />
              <PolarRadiusAxis
                angle={30}
                domain={[0, 100]}
                tick={{ fontSize: 9.5, fill: THEME.muted, fontWeight: 600 }}
                axisLine={false}
              />
              <Radar
                name="Your Score"
                dataKey="score"
                stroke="var(--accent)"
                fill="var(--accent)"
                fillOpacity={0.15}
                strokeWidth={2.5}
              />
              <Tooltip
                formatter={(v: number) => `${Math.round(v)}/100`}
                content={<ChartTooltip formatter={(v: number) => `${Math.round(v)}/100`} />}
              />
            </RadarChart>
          </ResponsiveContainer></div>
        </Card>

        {/* Detailed Scores */}
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
              Score Breakdown
            </h3>
            <div style={{ fontSize: 11, color: THEME.muted }}>
              Individual breakdown elements scoring metrics
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {healthScore.map((h) => {
              const color = h.score >= 70 ? THEME.sage : h.score >= 40 ? THEME.gold : THEME.rust;
              return (
                <div
                  key={h.metric}
                  className="card-lift"
                  style={{
                    padding: "14px 18px",
                    borderRadius: 14,
                    background: "var(--surface-0)",
                    border: `1.5px solid ${THEME.line}`,
                    boxShadow: "var(--shadow-sm)",
                    transition: "all 0.25s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 10,
                      alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                      {h.metric}
                    </span>
                    <span style={{ fontSize: 13.5, fontWeight: 800, color }}>
                      {Math.round(h.score)}/100
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 3,
                      background: `color-mix(in srgb, ${THEME.line} 80%, transparent)`,
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
    </div>
  );
};
