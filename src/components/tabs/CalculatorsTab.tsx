// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Calculator,
  TrendingUp,
  Clock,
  Briefcase,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull } from "../../utils/finance";
import { Card } from "../ui/Card";

interface CalculatorsTabProps {
  metrics: any;
}

export const CalculatorsTab: React.FC<CalculatorsTabProps> = ({ metrics }) => {
  // EMI Calculator
  const [emiP, setEmiP] = useState("1000000");
  const [emiR, setEmiR] = useState("8.5");
  const [emiN, setEmiN] = useState("240");

  const emiResult = useMemo(() => {
    const p = Number(emiP) || 0, r = (Number(emiR) || 0) / 12 / 100, n = Number(emiN) || 1;
    if (r === 0) return { emi: p / n, total: p, interest: 0 };
    const emi = p * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    return { emi, total: emi * n, interest: emi * n - p };
  }, [emiP, emiR, emiN]);

  // SIP Returns Projector
  const [sipAmt, setSipAmt] = useState("10000");
  const [sipYrs, setSipYrs] = useState("10");
  const [sipRate, setSipRate] = useState("12");
  const sipResult = useMemo(() => {
    const m = Number(sipAmt) || 0, y = Number(sipYrs) || 1, r = (Number(sipRate) || 0) / 12 / 100;
    const n = y * 12;
    const corpus = r === 0 ? m * n : m * (Math.pow(1 + r, n) - 1) / r * (1 + r);
    return { corpus, invested: m * n, gains: corpus - m * n };
  }, [sipAmt, sipYrs, sipRate]);

  // FD / RD Maturity Calculator
  const [fdP, setFdP] = useState("100000");
  const [fdR, setFdR] = useState("6.5");
  const [fdYrs, setFdYrs] = useState("3");
  const [fdType, setFdType] = useState("fd");
  const fdResult = useMemo(() => {
    const p = Number(fdP) || 0, r = (Number(fdR) || 0) / 100, y = Number(fdYrs) || 1;
    if (fdType === "fd") {
      const maturity = p * Math.pow(1 + r / 4, 4 * y);
      return { maturity, interest: maturity - p };
    } else {
      const n = y * 12, mr = r / 12;
      const maturity = mr === 0 ? p * n : p * (Math.pow(1 + mr, n) - 1) / mr * (1 + mr);
      return { maturity, interest: maturity - p * n, totalDeposited: p * n };
    }
  }, [fdP, fdR, fdYrs, fdType]);

  // Net Worth Projection
  const [nwpSavings, setNwpSavings] = useState("30000");
  const [nwpReturn, setNwpReturn] = useState("10");
  const [nwpYears, setNwpYears] = useState("15");
  const nwpData = useMemo(() => {
    const current = metrics?.netWorth || 0;
    const monthly = Number(nwpSavings) || 0;
    const annualR = (Number(nwpReturn) || 0) / 100;
    const years = Math.max(1, Math.min(Number(nwpYears) || 15, 40));
    const startYear = new Date().getFullYear();
    const points: any[] = [];
    let corpus = current;
    for (let y = 0; y <= years; y++) {
      points.push({ year: startYear + y, value: Math.round(corpus) });
      const r = annualR / 12;
      corpus = r === 0
        ? corpus + monthly * 12
        : corpus * (1 + annualR) + monthly * (Math.pow(1 + r, 12) - 1) / r * (1 + r);
    }
    return points;
  }, [metrics?.netWorth, nwpSavings, nwpReturn, nwpYears]);

  const inpRow = (lbl: string, val: string, set: (v: string) => void) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 4, fontWeight: 500 }}>{lbl}</div>
      <input
        style={{
          width: "100%",
          padding: "10px 12px",
          background: "var(--t-paper)",
          border: `1.5px solid ${THEME.line}`,
          borderRadius: 10,
          color: THEME.ink,
          fontSize: 14,
        }}
        type="number"
        value={val}
        onChange={(e) => set(e.target.value)}
      />
    </div>
  );

  const resultRow = (lbl: string, val: number, highlight?: boolean) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px dashed ${THEME.line}`, fontSize: 14 }}>
      <span style={{ color: THEME.muted }}>{lbl}</span>
      <span style={{ fontWeight: highlight ? 800 : 600, color: highlight ? THEME.sage : THEME.ink }}>{fmtINRFull(val)}</span>
    </div>
  );

  return (
    <div className="tab-content-enter">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: THEME.line, display: "flex", alignItems: "center", justifyContent: "center", color: THEME.accent }}>
          <Calculator size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Calculators</h2>
          <p style={{ fontSize: 13, color: THEME.muted, marginTop: 2 }}>Project your future wealth and manage loans</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 24 }}>
        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <Clock size={18} color={THEME.accent} />
            <div style={{ fontSize: 16, fontWeight: 700 }}>EMI Calculator</div>
          </div>
          {inpRow("Loan Amount (₹)", emiP, setEmiP)}
          {inpRow("Annual Interest Rate (%)", emiR, setEmiR)}
          {inpRow("Tenure (months)", emiN, setEmiN)}
          <div style={{ marginTop: 20, padding: 16, background: "rgba(128,128,128,0.04)", borderRadius: 12 }}>
            {resultRow("Monthly EMI", emiResult.emi, true)}
            {resultRow("Total Interest", emiResult.interest)}
            {resultRow("Total Payment", emiResult.total)}
          </div>
        </Card>

        <Card style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <TrendingUp size={18} color={THEME.sage} />
            <div style={{ fontSize: 16, fontWeight: 700 }}>SIP Returns</div>
          </div>
          {inpRow("Monthly SIP Amount (₹)", sipAmt, setSipAmt)}
          {inpRow("Expected Return Rate (%)", sipRate, setSipRate)}
          {inpRow("Investment Period (years)", sipYrs, setSipYrs)}
          <div style={{ marginTop: 20, padding: 16, background: "rgba(128,128,128,0.04)", borderRadius: 12 }}>
            {resultRow("Estimated Corpus", sipResult.corpus, true)}
            {resultRow("Total Invested", sipResult.invested)}
            {resultRow("Wealth Gain", sipResult.gains)}
          </div>
        </Card>

        <Card style={{ padding: 24, gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <Briefcase size={18} color={THEME.gold} />
            <div style={{ fontSize: 16, fontWeight: 700 }}>Net Worth Projection</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 24 }}>
            {inpRow("Monthly Savings (₹)", nwpSavings, setNwpSavings)}
            {inpRow("Annual Return (%)", nwpReturn, setNwpReturn)}
            {inpRow("Projection Years", nwpYears, setNwpYears)}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 32 }}>
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={nwpData}>
                  <defs>
                    <linearGradient id="gNwp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={THEME.accent} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={THEME.accent} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke={THEME.line} />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={fmtINR} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => fmtINRFull(v)} />
                  <Area type="monotone" dataKey="value" stroke={THEME.accent} strokeWidth={3} fill="url(#gNwp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
              <div style={{ padding: 16, background: "rgba(128,128,128,0.04)", borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 4 }}>Starting Today</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{fmtINRFull(nwpData[0]?.value)}</div>
              </div>
              <div style={{ padding: 16, background: "color-mix(in srgb, var(--t-sage) 10%, transparent)", borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 4 }}>In {nwpYears} Years</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: THEME.sage }}>{fmtINRFull(nwpData[nwpData.length - 1]?.value)}</div>
              </div>
              <div style={{ padding: 16, border: `1px dashed ${THEME.line}`, borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 4 }}>Total Growth</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: THEME.gold }}>
                   {nwpData[0]?.value > 0 ? `${(((nwpData[nwpData.length - 1]?.value || 0) / nwpData[0].value - 1) * 100).toFixed(0)}%` : "—"}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
