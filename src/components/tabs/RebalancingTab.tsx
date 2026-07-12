/* eslint-disable */
// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  PieChart as PieIcon,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Settings,
  Zap,
  Info,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, rdMaturity, calculateEpfBalance } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { Prv } from "../../context/PrivacyContext";

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "14px 16px",
  fontSize: 10,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: THEME.muted,
  fontWeight: 700,
  borderBottom: `1.5px solid ${THEME.line}`,
  background: "color-mix(in srgb, var(--surface-1) 50%, transparent)",
  whiteSpace: "nowrap",
};

const td: React.CSSProperties = {
  padding: "14px 16px",
  borderBottom: `1px solid ${THEME.line}`,
  color: THEME.ink,
  fontSize: 13,
  verticalAlign: "middle",
  fontVariantNumeric: "tabular-nums",
};

const thRight: React.CSSProperties = { ...th, textAlign: "right" };
const tdRight: React.CSSProperties = { ...td, textAlign: "right" };

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
      {visible.map((p: any, i: number) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: p.color || p.fill,
              display: "inline-block",
            }}
          />
          <span style={{ color: THEME.muted, fontWeight: 500 }}>{p.name || label}:</span>
          <span style={{ fontWeight: 700, color: THEME.ink }}>
            <Prv>{formatter ? formatter(p.value) : fmtINRFull(p.value)}</Prv>
          </span>
        </div>
      ))}
    </div>
  );
};

const PRESETS = {
  aggressive: {
    label: "Aggressive (80/15/5)",
    equity: 80,
    debt: 15,
    gold: 0,
    cash: 5,
    desc: "High growth, high risk — for age < 35",
  },
  moderate: {
    label: "Moderate (60/30/10)",
    equity: 60,
    debt: 30,
    gold: 0,
    cash: 10,
    desc: "Balanced growth — for age 35-50",
  },
  conservative: {
    label: "Conservative (40/45/15)",
    equity: 40,
    debt: 45,
    gold: 0,
    cash: 15,
    desc: "Capital preservation — for age 50+",
  },
  retirement: {
    label: "Retirement (30/50/20)",
    equity: 30,
    debt: 50,
    gold: 0,
    cash: 20,
    desc: "Income & safety focus",
  },
};

export const RebalancingTab = ({ state, metrics, marketData }) => {
  const [selectedPreset, setSelectedPreset] = useState("moderate");
  const [customTarget, setCustomTarget] = useState({ equity: 60, debt: 30, gold: 0, cash: 10 });
  const [useCustom, setUseCustom] = useState(false);

  const [activeCurrentIndex, setActiveCurrentIndex] = useState<number | null>(null);
  const [activeTargetIndex, setActiveTargetIndex] = useState<number | null>(null);

  const target = useCustom ? customTarget : PRESETS[selectedPreset];

  const customTargetSum =
    Number(customTarget.equity || 0) +
    Number(customTarget.debt || 0) +
    Number(customTarget.gold || 0) +
    Number(customTarget.cash || 0);
  const customTargetInvalid = useCustom && Math.abs(customTargetSum - 100) > 0.5;

  const allocation = useMemo(() => {
    const equityStocks = (state.stocks || []).reduce((s, st) => {
      const price = (() => {
        if (marketData) {
          const sym = `${(st.symbol || "").replace(/\.(NS|BO)$/i, "")}.${(st.exchange || "NSE") === "BSE" ? "BO" : "NS"}`;
          return marketData[sym]?.price || Number(st.currentPrice) || Number(st.avgPrice) || 0;
        }
        return Number(st.currentPrice) || Number(st.avgPrice) || 0;
      })();
      return s + (Number(st.qty) || 0) * price;
    }, 0);

    const equityMF = (state.mutualFunds || []).reduce((s, m) => {
      const cat = (m.category || m.type || "").toLowerCase();
      const isEquity = [
        "equity",
        "elss",
        "flexi",
        "large",
        "mid",
        "small",
        "multi",
        "focused",
        "sectoral",
        "thematic",
        "index",
      ].some((k) => cat.includes(k));
      if (!isEquity && cat) return s;
      return s + (Number(m.units) || 0) * (Number(m.currentNav) || Number(m.buyNav) || 0);
    }, 0);

    const debtMF = (state.mutualFunds || []).reduce((s, m) => {
      const cat = (m.category || m.type || "").toLowerCase();
      const isDebt = [
        "debt",
        "liquid",
        "money market",
        "gilt",
        "corporate bond",
        "banking",
        "credit risk",
        "dynamic bond",
        "ultra short",
        "low duration",
        "medium",
        "long duration",
        "overnight",
        "floater",
      ].some((k) => cat.includes(k));
      if (!isDebt) return s;
      return s + (Number(m.units) || 0) * (Number(m.currentNav) || Number(m.buyNav) || 0);
    }, 0);

    const fd = (state.fixedDeposits || []).reduce((s, f) => s + Number(f.principal || 0), 0);
    const rd = (state.recurringDeposits || []).reduce((s, r) => {
      const now = new Date();
      const start = r.startDate ? new Date(r.startDate + "T00:00:00") : now;
      const totalMonths = Number(r.tenureMonths || 0);
      const elapsed = Math.min(
        totalMonths,
        Math.max(
          0,
          (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
        )
      );
      return s + rdMaturity(Number(r.monthly || 0), Number(r.rate || 6), elapsed);
    }, 0);
    const bonds = (state.bonds || []).reduce(
      (s, b) => s + Number(b.totalPrincipalAmount || b.faceValue || 0),
      0
    );
    const ppf = (state.ppf || []).reduce((s, p) => s + Number(p.balance || 0), 0);
    const nps = (state.nps || []).reduce((s: number, n: any) => {
      const bal = Number(n.balance) || 0;
      if (bal > 0) return s + bal;
      return (
        s +
        (n.transactions || []).reduce(
          (ss: number, t: any) =>
            ss + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
          0
        )
      );
    }, 0);
    const epf = (state.epf || []).reduce((s, e) => s + calculateEpfBalance(e), 0);
    const cash = (state.bankAccounts || []).reduce((s, a) => s + Number(a.balance || 0), 0);
    const lic = (state.lic || []).reduce((s: number, l: any) => {
      const txTotal = (l.transactions || []).reduce(
        (sum: number, t: any) => sum + Number(t.amount || 0),
        0
      );
      return s + (txTotal > 0 ? txTotal : Number(l.premiumPaid || 0));
    }, 0);
    const investPlans = (state.investmentPlans || []).reduce((s: number, ip: any) => {
      const txTotal = (ip.transactions || []).reduce(
        (sum: number, t: any) => sum + Number(t.amount || 0),
        0
      );
      return s + (txTotal > 0 ? txTotal : Number(ip.premiumPaid || 0));
    }, 0);

    const goldPricePerGram = (() => {
      try {
        return Number(localStorage.getItem("gold_price_per_gram")) || 7200;
      } catch {
        return 7200;
      }
    })();
    const PURITY_FACTOR = { "24K": 1, "22K": 22 / 24, "18K": 18 / 24, "14K": 14 / 24 };
    const gold = (state.goldHoldings || []).reduce((s, g) => {
      const grams = Number(g.grams || 0);
      const purityMul = g.type === "physical" ? PURITY_FACTOR[g.purity] || 1 : 1;
      return s + grams * goldPricePerGram * purityMul;
    }, 0);

    const equity = equityStocks + equityMF;
    const debt = debtMF + fd + rd + bonds + ppf + epf + lic + investPlans;
    const total = equity + debt + gold + cash + nps;

    return {
      equity,
      debt,
      gold,
      cash,
      nps,
      total,
      equityPct: total ? (equity / total) * 100 : 0,
      debtPct: total ? ((debt + nps) / total) * 100 : 0,
      goldPct: total ? (gold / total) * 100 : 0,
      cashPct: total ? (cash / total) * 100 : 0,
      breakdown: {
        equityStocks,
        equityMF,
        debtMF,
        fd,
        rd,
        bonds,
        ppf,
        nps,
        epf,
        lic,
        investPlans,
        cash,
      },
    };
  }, [state, marketData]);

  const suggestions = useMemo(() => {
    if (!allocation.total) return [];
    const items = [];
    const classes = [
      {
        name: "Equity",
        current: allocation.equityPct,
        target: target.equity,
        value: allocation.equity,
      },
      {
        name: "Debt",
        current: allocation.debtPct,
        target: target.debt,
        value: allocation.debt + allocation.nps,
      },
      {
        name: "Gold",
        current: allocation.goldPct,
        target: target.gold || 0,
        value: allocation.gold,
      },
      { name: "Cash", current: allocation.cashPct, target: target.cash, value: allocation.cash },
    ];

    classes.forEach((cls) => {
      const diff = cls.current - cls.target;
      const diffAmt = (Math.abs(diff) / 100) * allocation.total;
      if (Math.abs(diff) > 3) {
        items.push({
          asset: cls.name,
          action: diff > 0 ? "Reduce" : "Increase",
          diffPct: Math.abs(diff).toFixed(1),
          diffAmt,
          current: cls.current.toFixed(1),
          target: cls.target,
          overweight: diff > 0,
        });
      }
    });

    return items.sort((a, b) => b.diffAmt - a.diffAmt);
  }, [allocation, target]);

  const deviationScore = useMemo(() => {
    if (!allocation.total) return 0;
    const d1 = Math.abs(allocation.equityPct - target.equity);
    const d2 = Math.abs(allocation.debtPct - target.debt);
    const d3 = Math.abs(allocation.goldPct - (target.gold || 0));
    const d4 = Math.abs(allocation.cashPct - target.cash);
    return Math.max(0, 100 - (d1 + d2 + d3 + d4));
  }, [allocation, target]);

  const pieData = [
    { name: "Equity", value: allocation.equity, color: "#4F46E5" },
    { name: "Debt", value: allocation.debt + allocation.nps, color: "#059669" },
    { name: "Gold", value: allocation.gold, color: "#D97706" },
    { name: "Cash", value: allocation.cash, color: "#7C3AED" },
  ].filter((d) => d.value > 0);

  const targetPieData = [
    { name: "Equity", value: target.equity, color: "#4F46E5" },
    { name: "Debt", value: target.debt, color: "#059669" },
    { name: "Gold", value: target.gold || 0, color: "#D97706" },
    { name: "Cash", value: target.cash, color: "#7C3AED" },
  ].filter((d) => d.value > 0);

  const comparisonData = [
    { name: "Equity", Current: Number(allocation.equityPct.toFixed(1)), Target: target.equity },
    { name: "Debt", Current: Number(allocation.debtPct.toFixed(1)), Target: target.debt },
    { name: "Gold", Current: Number(allocation.goldPct.toFixed(1)), Target: target.gold || 0 },
    { name: "Cash", Current: Number(allocation.cashPct.toFixed(1)), Target: target.cash },
  ];

  if (!allocation.total) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <SectionTitle sub="Compare your allocation to target and get actionable suggestions">
          Smart Rebalancing
        </SectionTitle>
        <EmptyState
          icon={PieIcon}
          title="No Portfolio Data"
          description="Add investments to see rebalancing suggestions"
        />
      </div>
    );
  }

  const scoreColor =
    deviationScore > 80 ? THEME.sage : deviationScore > 50 ? THEME.gold : THEME.rust;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle sub="Compare your allocation to target and get actionable suggestions">
        Smart Rebalancing
      </SectionTitle>

      {/* Alignment Score Bento Card */}
      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              background: `conic-gradient(${scoreColor} ${deviationScore * 3.6}deg, ${THEME.line} 0deg)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 15px rgba(0, 0, 0, 0.03)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--surface-0)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: 20,
                color: scoreColor,
              }}
            >
              {Math.round(deviationScore)}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div
              style={{ fontWeight: 800, fontSize: 16, color: THEME.ink, letterSpacing: "-0.015em" }}
            >
              Portfolio Alignment Score
            </div>
            <div style={{ fontSize: 12.5, color: THEME.muted, marginTop: 4, fontWeight: 500 }}>
              {deviationScore > 80
                ? "Well aligned — minor adjustments only"
                : deviationScore > 50
                  ? "Moderate deviation — consider rebalancing"
                  : "Significant deviation — rebalancing recommended"}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 11,
                color: THEME.muted,
                textTransform: "uppercase",
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              Total Portfolio
            </div>
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: THEME.ink,
                letterSpacing: "-0.03em",
                marginTop: 2,
              }}
            >
              <Prv>{fmtINRFull(allocation.total)}</Prv>
            </div>
          </div>
        </div>
      </Card>

      {/* Target Selection Card */}
      <Card style={{ padding: 24 }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: 15,
            marginBottom: 16,
            color: THEME.ink,
            display: "flex",
            alignItems: "center",
            gap: 8,
            letterSpacing: "-0.015em",
          }}
        >
          <Settings size={16} /> Target Allocation Profile
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            marginBottom: 18,
          }}
        >
          {Object.entries(PRESETS).map(([key, preset]) => {
            const active = !useCustom && selectedPreset === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setSelectedPreset(key);
                  setUseCustom(false);
                }}
                className="card-lift"
                style={{
                  padding: "16px 18px",
                  borderRadius: 14,
                  textAlign: "left",
                  border: `1.5px solid ${active ? "var(--accent)" : THEME.line}`,
                  background: active
                    ? "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--accent) 8%, var(--surface-0)) 100%)"
                    : "var(--surface-0)",
                  cursor: "pointer",
                  boxShadow: active
                    ? "0 4px 15px color-mix(in srgb, var(--accent) 8%, transparent)"
                    : "var(--shadow-sm)",
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    fontWeight: 800,
                    fontSize: 13.5,
                    color: active ? "var(--accent)" : THEME.ink,
                  }}
                >
                  {preset.label}
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 500, lineHeight: 1.3 }}>
                  {preset.desc}
                </div>
              </button>
            );
          })}
        </div>

        {/* Custom target options switcher */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            borderTop: `1px solid ${THEME.line}`,
            paddingTop: 16,
          }}
        >
          <div>
            <button
              onClick={() => setUseCustom(!useCustom)}
              className="card-lift"
              style={{
                padding: "6px 14px",
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 700,
                border: `1.5px solid ${useCustom ? "var(--accent)" : THEME.line}`,
                background: useCustom
                  ? "color-mix(in srgb, var(--accent) 12%, transparent)"
                  : "transparent",
                color: useCustom ? "var(--accent)" : THEME.ink,
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              Custom Target Allocation
            </button>
          </div>
          {useCustom && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              {["equity", "debt", "gold", "cash"].map((k) => (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 10,
                    background: "var(--surface-0)",
                    border: `1px solid ${THEME.line}`,
                  }}
                >
                  <label
                    style={{
                      fontSize: 11.5,
                      color: THEME.muted,
                      fontWeight: 700,
                      textTransform: "capitalize",
                    }}
                  >
                    {k}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={customTarget[k]}
                    onChange={(e) =>
                      setCustomTarget((p) => ({ ...p, [k]: Number(e.target.value) }))
                    }
                    style={{
                      width: 50,
                      padding: "4px 6px",
                      borderRadius: 6,
                      border: `1px solid ${THEME.line}`,
                      background: "transparent",
                      color: THEME.ink,
                      fontSize: 13,
                      fontWeight: 700,
                      textAlign: "center",
                      outline: "none",
                    }}
                  />
                  <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>%</span>
                </div>
              ))}
            </div>
          )}
          {customTargetInvalid && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 10,
                background: "color-mix(in srgb, var(--t-rust) 10%, transparent)",
                border: `1px solid color-mix(in srgb, var(--t-rust) 35%, transparent)`,
              }}
            >
              <AlertTriangle size={14} color={THEME.rust} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: THEME.rust }}>
                Targets sum to {customTargetSum.toFixed(1)}% — should total 100%.
              </span>
            </div>
          )}
        </div>
      </Card>

      {/* Comparison Charts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {/* Current Donut */}
        <Card style={{ padding: "24px 16px" }}>
          <div style={{ padding: "0 8px", textAlign: "center" }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 13.5,
                marginBottom: 12,
                color: THEME.ink,
                letterSpacing: "-0.01em",
              }}
            >
              Current Allocation
            </div>
            <div style={{ width: "100%", height: 180, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={50}
                    paddingAngle={3}
                    stroke="none"
                    onMouseEnter={(_, idx) => setActiveCurrentIndex(idx)}
                    onMouseLeave={() => setActiveCurrentIndex(null)}
                  >
                    {pieData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.color}
                        style={{
                          filter:
                            activeCurrentIndex === i
                              ? "drop-shadow(0 4px 10px rgba(0,0,0,0.15))"
                              : "none",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  {activeCurrentIndex !== null && pieData[activeCurrentIndex] ? (
                    <>
                      <text
                        x="50%"
                        y="46%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 9.5,
                          fill: THEME.muted,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        {pieData[activeCurrentIndex].name}
                      </text>
                      <text
                        x="50%"
                        y="56%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 13,
                          fill: THEME.ink,
                          fontWeight: 900,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        ₹
                        {pieData[activeCurrentIndex].value.toLocaleString("en-IN", {
                          maximumFractionDigits: 0,
                        })}
                      </text>
                    </>
                  ) : (
                    <>
                      <text
                        x="50%"
                        y="46%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 9.5,
                          fill: THEME.muted,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        Portfolio
                      </text>
                      <text
                        x="50%"
                        y="56%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 13,
                          fill: THEME.ink,
                          fontWeight: 900,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        ₹{allocation.total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </text>
                    </>
                  )}
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 10,
                marginTop: 12,
              }}
            >
              {pieData.map((d) => (
                <div
                  key={d.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    color: THEME.muted,
                    fontWeight: 600,
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                  {d.name} {allocation.total ? ((d.value / allocation.total) * 100).toFixed(0) : 0}%
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Comparison Bar */}
        <Card style={{ padding: "24px 16px" }}>
          <div style={{ padding: "0 8px", textAlign: "center" }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 13.5,
                marginBottom: 12,
                color: THEME.ink,
                letterSpacing: "-0.01em",
              }}
            >
              Current vs Target
            </div>
            <div style={{ width: "100%", height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    unit="%"
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    formatter={(v) => `${v}%`}
                    content={<ChartTooltip formatter={(v) => `${v}%`} />}
                    cursor={{ fill: THEME.line, opacity: 0.4 }}
                  />
                  <Bar dataKey="Current" fill="#4F46E5" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Target" fill="#059669" radius={[6, 6, 0, 0]} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                    formatter={(value: string) => (
                      <span style={{ color: THEME.ink, fontWeight: 600 }}>{value}</span>
                    )}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Target Donut */}
        <Card style={{ padding: "24px 16px" }}>
          <div style={{ padding: "0 8px", textAlign: "center" }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 13.5,
                marginBottom: 12,
                color: THEME.ink,
                letterSpacing: "-0.01em",
              }}
            >
              Target Allocation
            </div>
            <div style={{ width: "100%", height: 180, position: "relative" }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={targetPieData}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={50}
                    paddingAngle={3}
                    stroke="none"
                    onMouseEnter={(_, idx) => setActiveTargetIndex(idx)}
                    onMouseLeave={() => setActiveTargetIndex(null)}
                  >
                    {targetPieData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.color}
                        style={{
                          filter:
                            activeTargetIndex === i
                              ? "drop-shadow(0 4px 10px rgba(0,0,0,0.15))"
                              : "none",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip formatter={(v) => `${v}%`} />} />
                  {activeTargetIndex !== null && targetPieData[activeTargetIndex] ? (
                    <>
                      <text
                        x="50%"
                        y="46%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 9.5,
                          fill: THEME.muted,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        {targetPieData[activeTargetIndex].name}
                      </text>
                      <text
                        x="50%"
                        y="56%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 13,
                          fill: THEME.ink,
                          fontWeight: 900,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {targetPieData[activeTargetIndex].value}%
                      </text>
                    </>
                  ) : (
                    <>
                      <text
                        x="50%"
                        y="46%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 9.5,
                          fill: THEME.muted,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        Target
                      </text>
                      <text
                        x="50%"
                        y="56%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{
                          fontSize: 13,
                          fill: THEME.ink,
                          fontWeight: 900,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        100%
                      </text>
                    </>
                  )}
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 10,
                marginTop: 12,
              }}
            >
              {targetPieData.map((d) => (
                <div
                  key={d.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11,
                    color: THEME.muted,
                    fontWeight: 600,
                  }}
                >
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                  {d.name} {d.value}%
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Rebalancing Actions Suggestions */}
      <Card style={{ padding: 24 }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: 15,
            marginBottom: 16,
            color: THEME.ink,
            display: "flex",
            alignItems: "center",
            gap: 8,
            letterSpacing: "-0.015em",
          }}
        >
          <Zap size={16} style={{ color: THEME.gold }} /> Actionable Suggestions
        </div>
        {suggestions.length === 0 ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "16px 20px",
              borderRadius: 14,
              background: `color-mix(in srgb, ${THEME.sage} 5%, transparent)`,
              border: `1.5px solid color-mix(in srgb, ${THEME.sage} 15%, transparent)`,
            }}
          >
            <CheckCircle2 size={18} style={{ color: THEME.sage }} />
            <span style={{ fontSize: 13.5, color: THEME.ink, fontWeight: 600 }}>
              Your portfolio is perfectly aligned! No rebalancing suggestions required.
            </span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {suggestions.map((s, i) => (
              <div
                key={i}
                className="card-lift"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  padding: "16px 20px",
                  borderRadius: 14,
                  background: "var(--surface-0)",
                  border: `1.5px solid ${THEME.line}`,
                  borderLeft: `5px solid ${s.overweight ? THEME.rust : THEME.sage}`,
                  boxShadow: "var(--shadow-sm)",
                  transition: "all 0.25s ease",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: s.overweight
                      ? `color-mix(in srgb, ${THEME.rust} 9%, transparent)`
                      : `color-mix(in srgb, ${THEME.sage} 9%, transparent)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {s.overweight ? (
                    <ArrowRight
                      size={16}
                      style={{ color: THEME.rust, transform: "rotate(-45deg)" }}
                    />
                  ) : (
                    <ArrowRight
                      size={16}
                      style={{ color: THEME.sage, transform: "rotate(45deg)" }}
                    />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 13.5, color: THEME.ink }}>
                    {s.action} {s.asset} by {s.diffPct}%
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2, fontWeight: 500 }}>
                    Current: {s.current}% &rarr; Target: {s.target}%
                  </div>
                </div>
                <div
                  style={{
                    textAlign: "right",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: 14,
                      color: s.overweight ? THEME.rust : THEME.sage,
                    }}
                  >
                    <Prv>{fmtINRFull(s.diffAmt)}</Prv>
                  </div>
                  <Badge
                    variant={s.overweight ? "rust" : "sage"}
                    style={{ fontSize: 9.5, padding: "2px 6px" }}
                  >
                    {s.overweight ? "Overweight" : "Underweight"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Detailed Breakdown Table */}
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
            Detailed Breakdown
          </h3>
          <div style={{ fontSize: 11, color: THEME.muted }}>
            Individual asset components and their portfolio shares
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...th, paddingLeft: 16 }}>Asset Class</th>
                <th style={thRight}>Value</th>
                <th style={{ ...thRight, paddingRight: 16 }}>% of Portfolio</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  label: "Stocks (Direct Equity)",
                  value: allocation.breakdown.equityStocks,
                  parent: "Equity",
                },
                {
                  label: "Equity Mutual Funds",
                  value: allocation.breakdown.equityMF,
                  parent: "Equity",
                },
                {
                  label: "Debt Mutual Funds",
                  value: allocation.breakdown.debtMF,
                  parent: "Debt",
                },
                { label: "Fixed Deposits", value: allocation.breakdown.fd, parent: "Debt" },
                { label: "Recurring Deposits", value: allocation.breakdown.rd, parent: "Debt" },
                { label: "Bonds", value: allocation.breakdown.bonds, parent: "Debt" },
                { label: "PPF", value: allocation.breakdown.ppf, parent: "Debt" },
                { label: "EPF", value: allocation.breakdown.epf, parent: "Debt" },
                { label: "NPS", value: allocation.breakdown.nps, parent: "Debt" },
                {
                  label: "LIC / Insurance",
                  value: allocation.breakdown.lic + allocation.breakdown.investPlans,
                  parent: "Debt",
                },
                { label: "Gold & SGBs", value: allocation.gold, parent: "Gold" },
                {
                  label: "Bank Balance (Cash)",
                  value: allocation.breakdown.cash,
                  parent: "Cash",
                },
              ]
                .filter((r) => r.value > 0)
                .map((row, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: `1px solid ${THEME.line}` }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "color-mix(in srgb, var(--accent) 4%, transparent)")
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ ...td, paddingLeft: 16, color: THEME.ink, fontWeight: 700 }}>
                      {row.label}
                      <Badge
                        variant="muted"
                        style={{ marginLeft: 8, fontSize: 10, padding: "2px 6px" }}
                      >
                        {row.parent}
                      </Badge>
                    </td>
                    <td style={{ ...tdRight, fontWeight: 700 }}>
                      <Prv>{fmtINRFull(row.value)}</Prv>
                    </td>
                    <td
                      style={{ ...tdRight, paddingRight: 16, color: THEME.muted, fontWeight: 600 }}
                    >
                      {allocation.total ? ((row.value / allocation.total) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Disclaimer */}
      <div
        style={{
          padding: "14px 18px",
          borderRadius: 14,
          background: "color-mix(in srgb, var(--accent) 5%, var(--surface-0))",
          border: `1.5px solid ${THEME.line}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 12,
            color: THEME.muted,
            lineHeight: 1.4,
            fontWeight: 500,
          }}
        >
          <Info size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <span>
            Rebalancing suggestions are indicative. Consult your financial advisor before making
            investment decisions. Tax implications of selling should be considered.
          </span>
        </div>
      </div>
    </div>
  );
};
