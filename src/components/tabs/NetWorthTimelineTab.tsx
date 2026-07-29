// @ts-nocheck
import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Zap,
  Info,
  ChevronDown,
  Check,
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
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINRFull, today } from "../../utils/finance";
import { computeNetWorthAsOf, getEarliestNetWorthMonth, nextYm } from "../../utils/netWorthAsOf";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Badge } from "../ui/Badge";
import { Prv } from "../../context/PrivacyContext";
import { EmptyState } from "../ui/EmptyState";

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

const formatMonth = (ym: string) => {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} '${y.slice(-2)}`;
};

const projectionPresets = [
  { label: "Conservative", returnRate: 8, inflationRate: 6 },
  { label: "Moderate", returnRate: 12, inflationRate: 6 },
  { label: "Aggressive", returnRate: 16, inflationRate: 6 },
];

// ── Custom Tooltip for Recharts ────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  const isBreakdown = payload.some(
    (p: any) =>
      p.dataKey !== "netWorth" &&
      p.dataKey !== "delta" &&
      p.dataKey !== "nominal" &&
      p.dataKey !== "real"
  );
  const isChange = payload[0]?.dataKey === "delta";
  const isProjection = payload[0]?.dataKey === "nominal" || payload[0]?.dataKey === "real";

  let totalValue = 0;
  if (isBreakdown) {
    totalValue = payload.reduce((sum: number, entry: any) => sum + (Number(entry.value) || 0), 0);
  }

  return (
    <div
      style={{
        background: "color-mix(in srgb, var(--surface-0) 90%, transparent)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1.5px solid var(--t-line)`,
        borderRadius: "12px",
        padding: "14px 16px",
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        minWidth: "240px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 700,
          color: "var(--t-muted)",
          borderBottom: `1px solid var(--t-line)`,
          paddingBottom: "6px",
        }}
      >
        {label} {isProjection ? "Projection" : isChange ? "Net Worth Change" : "Net Worth Summary"}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {payload.map((entry: any, index: number) => {
          let color = entry.color || entry.stroke;
          if (entry.dataKey === "cash") color = "var(--t-accent)";
          else if (entry.dataKey === "equity") color = "var(--t-sage)";
          else if (entry.dataKey === "debt") color = "var(--t-gold)";
          else if (entry.dataKey === "realEstate") color = "var(--t-violet)";
          else if (entry.dataKey === "vehicles") color = "var(--t-pink)";
          else if (entry.dataKey === "netWorth") color = "var(--t-accent)";
          else if (entry.dataKey === "delta")
            color = entry.value >= 0 ? "var(--t-sage)" : "var(--t-rust)";
          else if (entry.dataKey === "nominal") color = "var(--t-accent)";
          else if (entry.dataKey === "real") color = "var(--t-gold)";

          const pct =
            isBreakdown && totalValue > 0
              ? ` (${((entry.value / totalValue) * 100).toFixed(0)}%)`
              : "";

          return (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: color,
                    display: "inline-block",
                  }}
                />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--t-ink)" }}>
                  {entry.name}
                  {pct && (
                    <span style={{ fontSize: "11px", color: "var(--t-muted)", fontWeight: 500 }}>
                      {pct}
                    </span>
                  )}
                </span>
              </div>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--t-ink)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                <Prv>{fmtINRFull(entry.value)}</Prv>
              </span>
            </div>
          );
        })}
        {isBreakdown && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              borderTop: `1px solid var(--t-line)`,
              paddingTop: "6px",
              marginTop: "2px",
            }}
          >
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--t-ink)" }}>
              Total Net Worth
            </span>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 800,
                color: "var(--t-accent)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <Prv>{fmtINRFull(totalValue)}</Prv>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const NetWorthTimelineTab = ({ state, metrics, marketData }) => {
  const [projectionYears, setProjectionYears] = useState(5);
  const [selectedPreset, setSelectedPreset] = useState(1);
  const [monthlySavings, setMonthlySavings] = useState(
    metrics.monthIncome > 0 ? Math.round((metrics.monthIncome - metrics.monthExpense) * 0.8) : 50000
  );
  const [showBreakdown, setShowBreakdown] = useState(true);

  // Reconstructed month-by-month from every asset's own dated records (buy dates,
  // ledger entries, open/start dates, etc.) via computeNetWorthAsOf — the same approach
  // AnalyticsTab's Trends chart uses. This tab used to read frozen state.netWorthHistory
  // snapshots, but those are gutted by a one-time cleanup migration (masterData._nwCleanV1)
  // that permanently deleted any past-month snapshot under 10% of current net worth —
  // which nuked genuine early history once real estate inflated the current net worth.
  // Reconstructing from source records sidesteps that entirely and isn't limited by
  // whatever survived in the snapshot table.
  const history = useMemo(() => {
    const todayYm = today().slice(0, 7);
    const startYm = getEarliestNetWorthMonth(state);
    const findVal = (breakdown, name) => breakdown.find((x) => x.name === name)?.value || 0;
    const points = [];
    let cursor = startYm;
    while (cursor <= todayYm) {
      const { netWorth, assetBreakdown } = computeNetWorthAsOf(state, cursor, marketData);
      points.push({
        month: cursor,
        label: formatMonth(cursor),
        netWorth,
        cash: findVal(assetBreakdown, "Bank Cash"),
        equity: findVal(assetBreakdown, "Stocks") + findVal(assetBreakdown, "Mutual Funds"),
        debt: findVal(assetBreakdown, "Fixed Deposits"),
        realEstate: findVal(assetBreakdown, "Real Estate"),
        vehicles: findVal(assetBreakdown, "Vehicles"),
      });
      cursor = nextYm(cursor);
    }
    return points;
  }, [state, marketData]);

  const momDeltas = useMemo(() => {
    if (history.length < 2) return [];
    return history.slice(1).map((h, i) => ({
      label: h.label,
      month: h.month,
      delta: h.netWorth - history[i].netWorth,
      pctChange: history[i].netWorth
        ? ((h.netWorth - history[i].netWorth) / history[i].netWorth) * 100
        : 0,
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
      const nominal =
        currentNW * Math.pow(1 + monthlyReturn, i) +
        monthlySavings * ((Math.pow(1 + monthlyReturn, i) - 1) / monthlyReturn || i);
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
    const targets = [
      10_00_000, 25_00_000, 50_00_000, 1_00_00_000, 2_00_00_000, 5_00_00_000, 10_00_00_000,
      25_00_00_000, 50_00_00_000,
    ];
    const currentNW = metrics.netWorth || 0;
    const preset = projectionPresets[selectedPreset];
    const monthlyReturn = preset.returnRate / 100 / 12;
    const maxMonths = 50 * 12;

    return targets.map((t) => {
      const achieved = currentNW >= t;
      let eta = "";
      if (!achieved) {
        const hitInChart = projection.find((p) => p.nominal >= t);
        if (hitInChart) {
          eta = hitInChart.label;
        } else if (monthlyReturn > 0 || monthlySavings > 0) {
          for (let i = 1; i <= maxMonths; i++) {
            const nominal =
              currentNW * Math.pow(1 + monthlyReturn, i) +
              monthlySavings * ((Math.pow(1 + monthlyReturn, i) - 1) / monthlyReturn || i);
            if (nominal >= t) {
              const years = Math.ceil(i / 12);
              eta = `~${years} year${years > 1 ? "s" : ""}`;
              break;
            }
          }
          if (!eta) eta = "50+ years";
        }
      }
      return { target: t, achieved, eta };
    });
  }, [metrics.netWorth, projection, selectedPreset, monthlySavings]);

  const stats = useMemo(() => {
    if (history.length < 2) return null;
    const first = history[0];
    const last = history[history.length - 1];
    const totalGrowth = last.netWorth - first.netWorth;
    const months = history.length - 1;
    const avgMonthly = months > 0 ? totalGrowth / months : 0;
    // CAGR is only meaningful starting from a positive net worth — a negative
    // or zero starting point (more debt than assets) makes the compounding
    // ratio undefined, not just numerically large.
    const cagr =
      months > 0 && first.netWorth > 0
        ? (Math.pow(last.netWorth / first.netWorth, 12 / months) - 1) * 100
        : null;
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

      {/* ── Summary KPI Cards ────────────────────────────────────────────────── */}
      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 8,
          }}
        >
          {/* Card 1: Total Growth */}
          <Card
            hover
            style={{
              padding: "18px 20px",
              borderTop: `4px solid ${stats.totalGrowth >= 0 ? THEME.sage : THEME.rust}`,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background:
                    stats.totalGrowth >= 0
                      ? `color-mix(in srgb, ${THEME.sage} 12%, transparent)`
                      : `color-mix(in srgb, ${THEME.rust} 12%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: stats.totalGrowth >= 0 ? THEME.sage : THEME.rust,
                  flexShrink: 0,
                }}
              >
                {stats.totalGrowth >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Total Growth
                </div>
                <div style={{ fontSize: 10, color: THEME.muted, opacity: 0.8, marginTop: 1 }}>
                  Starting from {history[0]?.label}
                </div>
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: THEME.ink,
                  letterSpacing: "-0.04em",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                }}
              >
                <Prv>
                  {(stats.totalGrowth < 0 ? "-" : "") + fmtINRFull(Math.abs(stats.totalGrowth))}
                </Prv>
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: stats.totalGrowth >= 0 ? THEME.sage : THEME.rust,
                  marginTop: 4,
                }}
              >
                {stats.totalGrowth >= 0 ? "+" : ""}
                {((stats.totalGrowth / Math.max(1, history[0]?.netWorth || 0)) * 100).toFixed(1)}%
                Inception Growth
              </div>
            </div>
          </Card>

          {/* Card 2: Avg Monthly Growth */}
          <Card
            hover
            style={{
              padding: "18px 20px",
              borderTop: `4px solid ${THEME.accent}`,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: THEME.accent,
                  flexShrink: 0,
                }}
              >
                <Calendar size={18} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Avg Monthly Growth
                </div>
                <div style={{ fontSize: 10, color: THEME.muted, opacity: 0.8, marginTop: 1 }}>
                  Calculated over {stats.months} Months
                </div>
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: THEME.ink,
                  letterSpacing: "-0.04em",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                }}
              >
                <Prv>
                  {(stats.avgMonthly < 0 ? "-" : "") + fmtINRFull(Math.abs(stats.avgMonthly))}
                </Prv>
              </div>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, marginTop: 4 }}>
                Net Monthly Wealth Accumulation
              </div>
            </div>
          </Card>

          {/* Card 3: CAGR */}
          {(() => {
            const cagrKnown = stats.cagr !== null;
            const cagrPositive = cagrKnown && stats.cagr >= 0;
            const accentColor = !cagrKnown ? THEME.muted : cagrPositive ? THEME.sage : THEME.rust;
            return (
              <Card
                hover
                style={{
                  padding: "18px 20px",
                  borderTop: `4px solid ${accentColor}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: accentColor,
                      flexShrink: 0,
                    }}
                  >
                    <Zap size={18} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: THEME.muted,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Compounded CAGR
                    </div>
                    <div style={{ fontSize: 10, color: THEME.muted, opacity: 0.8, marginTop: 1 }}>
                      Annualized Growth Rate
                    </div>
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 900,
                      color: THEME.ink,
                      letterSpacing: "-0.04em",
                      fontVariantNumeric: "tabular-nums",
                      lineHeight: 1,
                    }}
                  >
                    {cagrKnown ? `${stats.cagr.toFixed(1)}%` : "N/A"}
                  </div>
                  <div style={{ marginTop: 4 }}>
                    {cagrKnown ? (
                      <Badge
                        variant={
                          stats.cagr >= 15
                            ? "sage"
                            : stats.cagr >= 10
                              ? "accent"
                              : stats.cagr >= 5
                                ? "gold"
                                : "muted"
                        }
                        style={{ fontSize: "9px", padding: "1px 5px", textTransform: "uppercase" }}
                      >
                        {stats.cagr >= 15
                          ? "Aggressive Build"
                          : stats.cagr >= 10
                            ? "Steady Growth"
                            : stats.cagr >= 5
                              ? "Conservative"
                              : "Flat Growth"}
                      </Badge>
                    ) : (
                      <Badge
                        variant="muted"
                        style={{ fontSize: "9px", padding: "1px 5px", textTransform: "uppercase" }}
                      >
                        Needs positive start
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            );
          })()}

          {/* Card 4: Best Month */}
          <Card
            hover
            style={{
              padding: "18px 20px",
              borderTop: `4px solid ${THEME.sage}`,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: THEME.sage,
                  flexShrink: 0,
                }}
              >
                <TrendingUp size={18} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Best Month
                </div>
                <div style={{ fontSize: 10, color: THEME.muted, opacity: 0.8, marginTop: 1 }}>
                  Record Delta: {stats.best?.label}
                </div>
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: THEME.sage,
                  letterSpacing: "-0.04em",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                }}
              >
                <Prv>+{fmtINRFull(stats.best?.delta || 0)}</Prv>
              </div>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, marginTop: 4 }}>
                Growth: +{stats.best?.pctChange.toFixed(1)}% MoM
              </div>
            </div>
          </Card>

          {/* Card 5: Worst Month */}
          <Card
            hover
            style={{
              padding: "18px 20px",
              borderTop: `4px solid ${THEME.rust}`,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `color-mix(in srgb, ${THEME.rust} 12%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: THEME.rust,
                  flexShrink: 0,
                }}
              >
                <TrendingDown size={18} />
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Worst Month
                </div>
                <div style={{ fontSize: 10, color: THEME.muted, opacity: 0.8, marginTop: 1 }}>
                  Trough Delta: {stats.worst?.label}
                </div>
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 900,
                  color: THEME.rust,
                  letterSpacing: "-0.04em",
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                }}
              >
                <Prv>{fmtINRFull(stats.worst?.delta || 0)}</Prv>
              </div>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, marginTop: 4 }}>
                Growth: {stats.worst?.pctChange.toFixed(1)}% MoM
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── Net Worth History Chart ────────────────────────────────────────── */}
      <Card style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TrendingUp size={18} style={{ color: THEME.accent }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: THEME.ink }}>
              Net Worth History
            </h3>
          </div>

          {/* Segmented control toggle */}
          <div
            role="group"
            aria-label="Chart view"
            style={{
              display: "flex",
              background: "var(--surface-1)",
              padding: "4px",
              borderRadius: "var(--radius-md)",
              border: `1.5px solid ${THEME.line}`,
              gap: "2px",
            }}
          >
            <button
              onClick={() => setShowBreakdown(false)}
              aria-pressed={!showBreakdown}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: !showBreakdown ? "var(--surface-0)" : "transparent",
                color: !showBreakdown ? "var(--t-ink)" : "var(--t-muted)",
                fontWeight: 700,
                fontSize: "12px",
                cursor: "pointer",
                boxShadow: !showBreakdown ? "var(--shadow-sm)" : "none",
                transition: "all 0.2s var(--ease-premium)",
              }}
            >
              Simple Trend
            </button>
            <button
              onClick={() => setShowBreakdown(true)}
              aria-pressed={showBreakdown}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background: showBreakdown ? "var(--surface-0)" : "transparent",
                color: showBreakdown ? "var(--t-ink)" : "var(--t-muted)",
                fontWeight: 700,
                fontSize: "12px",
                cursor: "pointer",
                boxShadow: showBreakdown ? "var(--shadow-sm)" : "none",
                transition: "all 0.2s var(--ease-premium)",
              }}
            >
              Asset Breakdown
            </button>
          </div>
        </div>

        <div style={{ width: "100%", height: 350, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
          {showBreakdown ? (
            <AreaChart data={history} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--t-accent)" stopOpacity={0.65} />
                  <stop offset="100%" stopColor="var(--t-accent)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--t-sage)" stopOpacity={0.65} />
                  <stop offset="100%" stopColor="var(--t-sage)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="debtGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--t-gold)" stopOpacity={0.65} />
                  <stop offset="100%" stopColor="var(--t-gold)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="realEstateGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--t-violet)" stopOpacity={0.65} />
                  <stop offset="100%" stopColor="var(--t-violet)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="vehiclesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--t-pink)" stopOpacity={0.65} />
                  <stop offset="100%" stopColor="var(--t-pink)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} opacity={0.25} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fontWeight: 600, fill: THEME.muted }}
                axisLine={{ stroke: THEME.line }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => fmtINRFull(v)}
                tick={{ fontSize: 11, fill: THEME.muted }}
                axisLine={false}
                tickLine={false}
                width={85}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: THEME.line }} />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingBottom: 10 }}
              />
              <Area
                type="monotone"
                dataKey="cash"
                stackId="1"
                stroke="var(--t-accent)"
                fill="url(#cashGrad)"
                strokeWidth={1.5}
                name="Cash"
              />
              <Area
                type="monotone"
                dataKey="equity"
                stackId="1"
                stroke="var(--t-sage)"
                fill="url(#equityGrad)"
                strokeWidth={1.5}
                name="Equity"
              />
              <Area
                type="monotone"
                dataKey="debt"
                stackId="1"
                stroke="var(--t-gold)"
                fill="url(#debtGrad)"
                strokeWidth={1.5}
                name="Fixed Deposits"
              />
              <Area
                type="monotone"
                dataKey="realEstate"
                stackId="1"
                stroke="var(--t-violet)"
                fill="url(#realEstateGrad)"
                strokeWidth={1.5}
                name="Real Estate"
              />
              <Area
                type="monotone"
                dataKey="vehicles"
                stackId="1"
                stroke="var(--t-pink)"
                fill="url(#vehiclesGrad)"
                strokeWidth={1.5}
                name="Vehicles"
              />
            </AreaChart>
          ) : (
            <AreaChart data={history} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--t-accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--t-accent)" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} opacity={0.25} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fontWeight: 600, fill: THEME.muted }}
                axisLine={{ stroke: THEME.line }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => fmtINRFull(v)}
                tick={{ fontSize: 11, fill: THEME.muted }}
                axisLine={false}
                tickLine={false}
                width={85}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: THEME.line }} />
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="var(--t-accent)"
                fill="url(#netWorthGrad)"
                strokeWidth={3}
                name="Total Net Worth"
              />
            </AreaChart>
          )}
        </ResponsiveContainer></div>
      </Card>

      {/* ── Month-over-Month Delta ─────────────────────────────────────────── */}
      {momDeltas.length > 0 && (
        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <Calendar size={18} style={{ color: THEME.accent }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: THEME.ink }}>
              Monthly Change
            </h3>
          </div>
          <div style={{ width: "100%", height: 250, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={momDeltas}>
              <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} opacity={0.25} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fontWeight: 600, fill: THEME.muted }}
                axisLine={{ stroke: THEME.line }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => fmtINRFull(v)}
                tick={{ fontSize: 11, fill: THEME.muted }}
                axisLine={false}
                tickLine={false}
                width={70}
                domain={[(dataMin: number) => Math.min(0, dataMin), (dataMax: number) => Math.max(0, dataMax)]}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: THEME.line, opacity: 0.4 }} />
              <Bar
                dataKey="delta"
                name="Change"
                fill="var(--t-accent)"
                radius={[4, 4, 0, 0]}
                shape={(props: any) => {
                  const { x, y, width, height, value } = props;
                  const isPositive = value >= 0;
                  const fill = isPositive ? "var(--t-sage)" : "var(--t-rust)";
                  // Recharts reports a negative `height` for bars below the zero
                  // baseline, with `y` anchored at the value (the bar's bottom edge).
                  // A plain SVG <rect> needs a non-negative height and `y` at the top
                  // edge, so for negative bars the top is y + height, not y.
                  const barY = height >= 0 ? y : y + height;
                  const barHeight = Math.max(4, Math.abs(height));
                  return (
                    <rect
                      x={x}
                      y={barY}
                      width={width}
                      height={barHeight}
                      rx={4}
                      ry={4}
                      style={{
                        fill: fill,
                        fillOpacity: 0.85,
                        stroke: fill,
                        strokeWidth: 1,
                      }}
                    />
                  );
                }}
              />
            </BarChart>
          </ResponsiveContainer></div>
        </Card>
      )}

      {/* ── What-If Time Machine ───────────────────────────────────────────── */}
      <SectionTitle sub="Project your net worth into the future">What-If Time Machine</SectionTitle>
      <Card style={{ padding: 24 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 20,
            marginBottom: 24,
            alignItems: "flex-end",
          }}
        >
          {/* Controls: projection Period */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              id="projection-period-label"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Projection Period
            </span>
            <select
              aria-labelledby="projection-period-label"
              value={projectionYears}
              onChange={(e) => setProjectionYears(Number(e.target.value))}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: `1.5px solid ${THEME.line}`,
                background: "var(--surface-0)",
                color: THEME.ink,
                fontSize: 13,
                fontWeight: 600,
                outline: "none",
                cursor: "pointer",
                minWidth: 120,
              }}
            >
              {[1, 2, 3, 5, 10, 15, 20, 25, 30].map((y) => (
                <option key={y} value={y}>
                  {y} Year{y > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Controls: Scenario Selector */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Growth Scenario
            </span>
            <div
              role="group"
              aria-label="Growth Scenario"
              style={{
                display: "flex",
                background: "var(--surface-1)",
                padding: "4px",
                borderRadius: "var(--radius-md)",
                border: `1.5px solid ${THEME.line}`,
                gap: "2px",
              }}
            >
              {projectionPresets.map((p, i) => {
                const isActive = i === selectedPreset;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedPreset(i)}
                    aria-pressed={isActive}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "var(--radius-sm)",
                      border: "none",
                      background: isActive ? "var(--surface-0)" : "transparent",
                      color: isActive ? "var(--t-ink)" : "var(--t-muted)",
                      fontWeight: 700,
                      fontSize: "12px",
                      cursor: "pointer",
                      boxShadow: isActive ? "var(--shadow-sm)" : "none",
                      transition: "all 0.2s var(--ease-premium)",
                    }}
                  >
                    {p.label} ({p.returnRate}%)
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls: Monthly Savings input */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              id="monthly-savings-label"
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Monthly Savings
            </span>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  fontSize: 13,
                  fontWeight: 600,
                  color: THEME.muted,
                }}
              >
                ₹
              </span>
              <input
                type="number"
                aria-labelledby="monthly-savings-label"
                value={monthlySavings}
                onChange={(e) => setMonthlySavings(Number(e.target.value))}
                style={{
                  padding: "8px 12px 8px 24px",
                  borderRadius: 8,
                  border: `1.5px solid ${THEME.line}`,
                  background: "var(--surface-0)",
                  color: THEME.ink,
                  fontSize: 13,
                  fontWeight: 700,
                  outline: "none",
                  width: 140,
                }}
              />
            </div>
          </div>
        </div>

        {/* Projection Chart */}
        <div style={{ width: "100%", height: 320, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
          {(() => {
            const step = projectionYears <= 3 ? 3 : projectionYears <= 10 ? 6 : 12;
            const chartData = projection.filter(
              (_, i) => i % step === 0 || i === projection.length - 1
            );
            const tickInterval = Math.max(0, Math.ceil(chartData.length / 10) - 1);
            return (
              <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="nominalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--t-accent)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--t-accent)" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--t-gold)" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="var(--t-gold)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} opacity={0.25} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: THEME.muted }}
                  interval={tickInterval}
                  axisLine={{ stroke: THEME.line }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => fmtINRFull(v)}
                  tick={{ fontSize: 11, fill: THEME.muted }}
                  axisLine={false}
                  tickLine={false}
                  width={85}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: THEME.line }} />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, fontWeight: 600, paddingBottom: 10 }}
                />
                <Area
                  type="monotone"
                  dataKey="nominal"
                  stroke="var(--t-accent)"
                  fill="url(#nominalGrad)"
                  strokeWidth={2.5}
                  name="Nominal Future Value"
                />
                <Area
                  type="monotone"
                  dataKey="real"
                  stroke="var(--t-gold)"
                  fill="url(#realGrad)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Inflation-Adjusted Value"
                />
              </AreaChart>
            );
          })()}
        </ResponsiveContainer></div>

        {/* Projection Outputs summary panels */}
        <div style={{ marginTop: 20, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <div
            style={{
              padding: "12px 20px",
              borderRadius: 12,
              background: `color-mix(in srgb, var(--t-accent) 8%, transparent)`,
              border: `1.5px solid color-mix(in srgb, var(--t-accent) 15%, transparent)`,
              minWidth: 200,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Projected in {projectionYears} Years
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: THEME.accent,
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
                marginTop: 4,
              }}
            >
              <Prv>{fmtINRFull(projection[projection.length - 1]?.nominal || 0)}</Prv>
            </div>
          </div>

          <div
            style={{
              padding: "12px 20px",
              borderRadius: 12,
              background: `color-mix(in srgb, var(--t-gold) 8%, transparent)`,
              border: `1.5px solid color-mix(in srgb, var(--t-gold) 15%, transparent)`,
              minWidth: 200,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Inflation-Adjusted (Today's Value)
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "var(--t-gold)",
                letterSpacing: "-0.02em",
                fontVariantNumeric: "tabular-nums",
                marginTop: 4,
              }}
            >
              <Prv>{fmtINRFull(projection[projection.length - 1]?.real || 0)}</Prv>
            </div>
          </div>
        </div>
      </Card>

      {/* ── Wealth Milestones ──────────────────────────────────────────────── */}
      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <Target size={18} style={{ color: THEME.accent }} />
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: THEME.ink }}>
            Wealth Milestones
          </h3>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 14,
          }}
        >
          {milestones
            .filter((m) => m.target >= (metrics.netWorth || 0) * 0.1)
            .map((m) => {
              const currentNW = metrics.netWorth || 0;
              const pctToTarget = Math.min(
                100,
                Math.max(0, Math.round((currentNW / m.target) * 100))
              );

              return (
                <div
                  key={m.target}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: m.achieved
                      ? `color-mix(in srgb, ${THEME.sage} 6%, var(--surface-0))`
                      : "var(--surface-0)",
                    border: `1.5px solid ${m.achieved ? `color-mix(in srgb, ${THEME.sage} 25%, transparent)` : `var(--t-line)`}`,
                    transition: "all 0.2s var(--ease-premium)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {/* Circle icon marker */}
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: m.achieved ? THEME.sage : "var(--surface-1)",
                        color: m.achieved ? "#fff" : THEME.muted,
                        boxShadow: m.achieved
                          ? `0 0 0 3px color-mix(in srgb, ${THEME.sage} 20%, transparent)`
                          : "none",
                        flexShrink: 0,
                      }}
                    >
                      {m.achieved ? (
                        <Check size={14} strokeWidth={3} />
                      ) : (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: "var(--t-line)",
                          }}
                        />
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 800,
                          fontSize: 14,
                          color: THEME.ink,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {fmtINRFull(m.target)}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: m.achieved ? THEME.sage : THEME.muted,
                          marginTop: 1,
                        }}
                      >
                        {m.achieved ? "Achieved!" : m.eta ? `ETA: ${m.eta}` : "—"}
                      </div>
                    </div>
                  </div>

                  {/* Progress Line */}
                  {!m.achieved && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 2 }}>
                      <div
                        style={{
                          height: 4,
                          borderRadius: 2,
                          background: "var(--t-line)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${pctToTarget}%`,
                            background: "var(--t-accent)",
                            height: "100%",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 9,
                          fontWeight: 700,
                          color: THEME.muted,
                        }}
                      >
                        <span>Progress</span>
                        <span>{pctToTarget}%</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </Card>
    </div>
  );
};
