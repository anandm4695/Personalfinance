// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  PieChart as PieIcon,
  TrendingUp,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Settings,
  BarChart2,
  Shield,
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
import { THEME, PIE_COLORS } from "../../utils/constants";
import { fmtINR, fmtINRFull } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { Prv } from "../../context/PrivacyContext";

const PRESETS = {
  aggressive: { label: "Aggressive (80/15/5)", equity: 80, debt: 15, gold: 0, cash: 5, desc: "High growth, high risk — for age < 35" },
  moderate: { label: "Moderate (60/30/10)", equity: 60, debt: 30, gold: 0, cash: 10, desc: "Balanced growth — for age 35-50" },
  conservative: { label: "Conservative (40/45/15)", equity: 40, debt: 45, gold: 0, cash: 15, desc: "Capital preservation — for age 50+" },
  retirement: { label: "Retirement (30/50/20)", equity: 30, debt: 50, gold: 0, cash: 20, desc: "Income & safety focus" },
};

export const RebalancingTab = ({ state, metrics, marketData }) => {
  const [selectedPreset, setSelectedPreset] = useState("moderate");
  const [customTarget, setCustomTarget] = useState({ equity: 60, debt: 30, gold: 0, cash: 10 });
  const [useCustom, setUseCustom] = useState(false);

  const target = useCustom ? customTarget : PRESETS[selectedPreset];

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
      const isEquity = ["equity", "elss", "flexi", "large", "mid", "small", "multi", "focused", "sectoral", "thematic", "index", "hybrid"].some((k) => cat.includes(k));
      if (!isEquity && cat) return s;
      return s + (Number(m.units) || 0) * (Number(m.currentNav) || Number(m.buyNav) || 0);
    }, 0);

    const debtMF = (state.mutualFunds || []).reduce((s, m) => {
      const cat = (m.category || m.type || "").toLowerCase();
      const isDebt = ["debt", "liquid", "money market", "gilt", "corporate bond", "banking", "credit risk", "dynamic bond", "ultra short", "low duration", "medium", "long duration", "overnight", "floater"].some((k) => cat.includes(k));
      if (!isDebt) return s;
      return s + (Number(m.units) || 0) * (Number(m.currentNav) || Number(m.buyNav) || 0);
    }, 0);

    const fd = (state.fixedDeposits || []).reduce((s, f) => s + Number(f.principal || 0), 0);
    const rd = (state.recurringDeposits || []).reduce((s, r) => s + Number(r.monthly || 0) * Number(r.tenureMonths || 0), 0);
    const bonds = (state.bonds || []).reduce((s, b) => s + Number(b.totalPrincipalAmount || b.faceValue || 0), 0);
    const ppf = (state.ppf || []).reduce((s, p) => s + Number(p.balance || 0), 0);
    const nps = (state.nps || []).reduce((s, n) => s + Number(n.balance || 0), 0);
    const epf = (state.epf || []).reduce((s, e) => s + Number(e.balance || 0), 0);
    const cash = (state.bankAccounts || []).reduce((s, a) => s + Number(a.balance || 0), 0);
    const lic = (state.lic || []).reduce((s, l) => s + Number(l.premiumPaid || 0), 0);
    const investPlans = (state.investmentPlans || []).reduce((s, ip) => s + Number(ip.premiumPaid || 0), 0);

    const equity = equityStocks + equityMF;
    const debt = debtMF + fd + rd + bonds + ppf + epf + lic + investPlans;
    const gold = 0;
    const total = equity + debt + gold + cash + nps;

    return {
      equity, debt, gold, cash, nps, total,
      equityPct: total ? (equity / total) * 100 : 0,
      debtPct: total ? ((debt + nps) / total) * 100 : 0,
      goldPct: total ? (gold / total) * 100 : 0,
      cashPct: total ? (cash / total) * 100 : 0,
      breakdown: {
        equityStocks, equityMF, debtMF, fd, rd, bonds, ppf, nps, epf, lic, investPlans, cash,
      },
    };
  }, [state, marketData]);

  const suggestions = useMemo(() => {
    if (!allocation.total) return [];
    const items = [];
    const classes = [
      { name: "Equity", current: allocation.equityPct, target: target.equity, value: allocation.equity },
      { name: "Debt", current: allocation.debtPct, target: target.debt, value: allocation.debt + allocation.nps },
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
    const d3 = Math.abs(allocation.cashPct - target.cash);
    return Math.max(0, 100 - (d1 + d2 + d3));
  }, [allocation, target]);

  const pieData = [
    { name: "Equity", value: allocation.equity, color: "#6366F1" },
    { name: "Debt", value: allocation.debt + allocation.nps, color: "#10B981" },
    { name: "Cash", value: allocation.cash, color: "#F59E0B" },
  ].filter((d) => d.value > 0);

  const targetPieData = [
    { name: "Equity", value: target.equity, color: "#6366F1" },
    { name: "Debt", value: target.debt, color: "#10B981" },
    { name: "Cash", value: target.cash, color: "#F59E0B" },
  ].filter((d) => d.value > 0);

  const comparisonData = [
    { name: "Equity", Current: Number(allocation.equityPct.toFixed(1)), Target: target.equity },
    { name: "Debt", Current: Number(allocation.debtPct.toFixed(1)), Target: target.debt },
    { name: "Cash", Current: Number(allocation.cashPct.toFixed(1)), Target: target.cash },
  ];

  if (!allocation.total) {
    return (
      <div>
        <SectionTitle sub="Compare your allocation to target and get actionable suggestions">Smart Rebalancing</SectionTitle>
        <EmptyState icon={PieIcon} title="No Portfolio Data" subtitle="Add investments to see rebalancing suggestions" />
      </div>
    );
  }

  return (
    <div>
      <SectionTitle sub="Compare your allocation to target and get actionable suggestions">Smart Rebalancing</SectionTitle>

      {/* Alignment Score */}
      <Card>
        <div style={{ padding: 20, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: `conic-gradient(${deviationScore > 80 ? "#10B981" : deviationScore > 50 ? "#F59E0B" : "#EF4444"} ${deviationScore * 3.6}deg, ${THEME.line} 0deg)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%", background: THEME.paper,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 800, fontSize: 18, color: deviationScore > 80 ? "#10B981" : deviationScore > 50 ? "#F59E0B" : "#EF4444",
            }}>
              {Math.round(deviationScore)}
            </div>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: THEME.ink }}>Portfolio Alignment Score</div>
            <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4 }}>
              {deviationScore > 80 ? "Well aligned — minor adjustments only" :
               deviationScore > 50 ? "Moderate deviation — consider rebalancing" :
               "Significant deviation — rebalancing recommended"}
            </div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: 12, color: THEME.muted }}>Total Portfolio</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: THEME.ink }}><Prv>{fmtINRFull(allocation.total)}</Prv></div>
          </div>
        </div>
      </Card>

      {/* Target Selection */}
      <Card>
        <div style={{ padding: 20, marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: THEME.ink, display: "flex", alignItems: "center", gap: 6 }}>
            <Settings size={15} /> Target Allocation
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, marginBottom: 16 }}>
            {Object.entries(PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => { setSelectedPreset(key); setUseCustom(false); }}
                style={{
                  padding: "12px 16px", borderRadius: 10, textAlign: "left",
                  border: `1.5px solid ${!useCustom && selectedPreset === key ? THEME.accent : THEME.line}`,
                  background: !useCustom && selectedPreset === key ? `${THEME.accent}10` : "transparent",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 13, color: THEME.ink }}>{preset.label}</div>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>{preset.desc}</div>
              </button>
            ))}
          </div>

          {/* Custom Toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
            <button
              onClick={() => setUseCustom(!useCustom)}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                border: `1.5px solid ${useCustom ? THEME.accent : THEME.line}`,
                background: useCustom ? `${THEME.accent}15` : "transparent",
                color: useCustom ? THEME.accent : THEME.muted, cursor: "pointer",
              }}
            >
              Custom Target
            </button>
            {useCustom && (
              <div style={{ display: "flex", gap: 10 }}>
                {["equity", "debt", "cash"].map((k) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <label style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, textTransform: "capitalize" }}>{k}:</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={customTarget[k]}
                      onChange={(e) => setCustomTarget((p) => ({ ...p, [k]: Number(e.target.value) }))}
                      style={{
                        width: 50, padding: "4px 6px", borderRadius: 6,
                        border: `1px solid ${THEME.line}`, background: "transparent",
                        color: THEME.ink, fontSize: 13, textAlign: "center",
                      }}
                    />
                    <span style={{ fontSize: 11, color: THEME.muted }}>%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Comparison Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 16 }}>
        {/* Current Pie */}
        <Card>
          <div style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: THEME.ink }}>Current Allocation</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtINRFull(v)} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 8 }}>
              {pieData.map((d) => (
                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: THEME.muted }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                  {d.name} {allocation.total ? ((d.value / allocation.total) * 100).toFixed(0) : 0}%
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Comparison Bar */}
        <Card>
          <div style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: THEME.ink }}>Current vs Target</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: THEME.muted }} />
                <YAxis tick={{ fontSize: 11, fill: THEME.muted }} unit="%" />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="Current" fill="#6366F1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Target" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Target Pie */}
        <Card>
          <div style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: THEME.ink }}>Target Allocation</div>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={targetPieData} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                  {targetPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 8 }}>
              {targetPieData.map((d) => (
                <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: THEME.muted }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.color }} />
                  {d.name} {d.value}%
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Rebalancing Actions */}
      <Card>
        <div style={{ padding: 20, marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: THEME.ink, display: "flex", alignItems: "center", gap: 8 }}>
            <Zap size={16} style={{ color: "#F59E0B" }} /> Rebalancing Suggestions
          </div>
          {suggestions.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 16, borderRadius: 10, background: "rgba(16,185,129,0.06)" }}>
              <CheckCircle2 size={18} style={{ color: "#10B981" }} />
              <span style={{ fontSize: 14, color: THEME.ink }}>Your portfolio is well-balanced! No rebalancing needed.</span>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "14px 16px", borderRadius: 10,
                    background: s.overweight ? "rgba(239,68,68,0.04)" : "rgba(16,185,129,0.04)",
                    border: `1.5px solid ${s.overweight ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)"}`,
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: s.overweight ? "#EF444415" : "#10B98115",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {s.overweight
                      ? <ArrowRight size={18} style={{ color: "#EF4444", transform: "rotate(-45deg)" }} />
                      : <ArrowRight size={18} style={{ color: "#10B981", transform: "rotate(45deg)" }} />
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: THEME.ink }}>
                      {s.action} {s.asset} by {s.diffPct}%
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                      Current: {s.current}% → Target: {s.target}%
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: s.overweight ? "#EF4444" : "#10B981" }}>
                      <Prv>{fmtINRFull(s.diffAmt)}</Prv>
                    </div>
                    <Badge variant={s.overweight ? "error" : "success"}>{s.overweight ? "Overweight" : "Underweight"}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Detailed Breakdown */}
      <Card>
        <div style={{ padding: 20, marginTop: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: THEME.ink }}>Detailed Breakdown</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${THEME.line}` }}>
                  {["Asset Class", "Value", "% of Portfolio"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: THEME.muted, fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Stocks (Direct Equity)", value: allocation.breakdown.equityStocks, parent: "Equity" },
                  { label: "Equity Mutual Funds", value: allocation.breakdown.equityMF, parent: "Equity" },
                  { label: "Debt Mutual Funds", value: allocation.breakdown.debtMF, parent: "Debt" },
                  { label: "Fixed Deposits", value: allocation.breakdown.fd, parent: "Debt" },
                  { label: "Recurring Deposits", value: allocation.breakdown.rd, parent: "Debt" },
                  { label: "Bonds", value: allocation.breakdown.bonds, parent: "Debt" },
                  { label: "PPF", value: allocation.breakdown.ppf, parent: "Debt" },
                  { label: "EPF", value: allocation.breakdown.epf, parent: "Debt" },
                  { label: "NPS", value: allocation.breakdown.nps, parent: "Debt" },
                  { label: "LIC / Insurance", value: allocation.breakdown.lic + allocation.breakdown.investPlans, parent: "Debt" },
                  { label: "Bank Balance (Cash)", value: allocation.breakdown.cash, parent: "Cash" },
                ].filter((r) => r.value > 0).map((row, i) => (
                  <tr key={i} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                    <td style={{ padding: "8px 10px", color: THEME.ink }}>
                      {row.label}
                      <Badge variant="outline" style={{ marginLeft: 8, fontSize: 10 }}>{row.parent}</Badge>
                    </td>
                    <td style={{ padding: "8px 10px", fontWeight: 600, color: THEME.ink }}><Prv>{fmtINRFull(row.value)}</Prv></td>
                    <td style={{ padding: "8px 10px", color: THEME.muted }}>
                      {allocation.total ? ((row.value / allocation.total) * 100).toFixed(1) : 0}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Disclaimer */}
      <div style={{ marginTop: 16, padding: "12px 16px", borderRadius: 10, background: "rgba(99,102,241,0.05)", border: `1px solid ${THEME.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: THEME.muted }}>
          <Info size={14} />
          Rebalancing suggestions are indicative. Consult your financial advisor before making investment decisions. Tax implications of selling should be considered.
        </div>
      </div>
    </div>
  );
};
