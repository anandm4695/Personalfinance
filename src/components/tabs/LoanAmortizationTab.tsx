/* eslint-disable */
// @ts-nocheck
import React, { useState, useMemo } from "react";
import { Calculator, TrendingDown, IndianRupee, Calendar, Zap, Info } from "lucide-react";
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
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, fmtINRExact } from "../../utils/finance";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { Prv } from "../../context/PrivacyContext";

const th: React.CSSProperties = {
  padding: "14px 16px",
  textAlign: "right",
  color: THEME.muted,
  fontWeight: 800,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  borderBottom: `2px solid ${THEME.line}`,
};

const td: React.CSSProperties = {
  padding: "14px 16px",
  textAlign: "right",
  color: THEME.ink,
  fontSize: 13,
  fontWeight: 500,
  borderBottom: `1px solid ${THEME.line}`,
  fontVariantNumeric: "tabular-nums",
};

const thCenter: React.CSSProperties = { ...th, textAlign: "center" };
const tdCenter: React.CSSProperties = {
  ...td,
  textAlign: "center",
  color: THEME.muted,
  fontWeight: 700,
};

export const generateAmortization = (principal, annualRate, tenureMonths, extraMonthly = 0) => {
  if (!tenureMonths || tenureMonths <= 0) {
    return { emi: 0, schedule: [], totalInterest: 0, totalMonths: 0 };
  }

  const monthlyRate = annualRate / 100 / 12;
  const emi =
    monthlyRate > 0
      ? (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
        (Math.pow(1 + monthlyRate, tenureMonths) - 1)
      : principal / tenureMonths;

  const schedule = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPrincipal = 0;
  let month = 0;

  while (balance > 0.5 && month < tenureMonths * 2) {
    month++;
    const interestPart = balance * monthlyRate;
    let principalPart = emi - interestPart + extraMonthly;
    if (principalPart > balance) principalPart = balance;
    balance -= principalPart;
    totalInterest += interestPart;
    totalPrincipal += principalPart;

    schedule.push({
      month,
      // Actual cash paid this month = interest + principal portion. Using this
      // directly (rather than a reconstructed emi+extra formula) keeps the final,
      // capped installment (where principalPart < emi - interest + extra) correct too.
      emi: Math.round(interestPart + principalPart),
      principal: Math.round(principalPart),
      interest: Math.round(interestPart),
      balance: Math.max(0, Math.round(balance)),
      totalInterest: Math.round(totalInterest),
      totalPrincipal: Math.round(totalPrincipal),
    });

    if (balance <= 0) break;
  }

  return {
    emi: Math.round(emi),
    schedule,
    totalInterest: Math.round(totalInterest),
    totalMonths: month,
  };
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
        {typeof label === "number" ? `Month ${label}` : label}
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

/* ─── Premium Amortization Bento Card ─────────────────────────────────── */
const AmortizationStatCard = ({ label, value, icon: Icon, color }: any) => {
  return (
    <div
      className="card-lift"
      style={{
        background:
          "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 12%, var(--surface-0)) 100%)",
        border: `1.5px solid ${THEME.line}`,
        borderTop: `4px solid ${color || THEME.accent}`,
        borderRadius: 16,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "0 4px 20px -2px rgba(0, 0, 0, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `color-mix(in srgb, ${color || THEME.accent} 12%, transparent)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: color || THEME.accent,
            flexShrink: 0,
          }}
        >
          {Icon}
        </div>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            color: THEME.muted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </div>
      </div>
      <div>
        <span
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: THEME.ink,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value}
        </span>
      </div>
    </div>
  );
};

export const LoanAmortizationTab = ({ state }) => {
  const loans = useMemo(
    () => [...(state.loansTaken || [])].filter((l) => Number(l.outstanding || l.principal) > 0),
    [state.loansTaken]
  );

  const [selectedLoan, setSelectedLoan] = useState(null);
  const [customPrincipal, setCustomPrincipal] = useState(0);
  const [customRate, setCustomRate] = useState(0);
  const [customTenure, setCustomTenure] = useState(0);
  const [extraEMI, setExtraEMI] = useState(0);
  const [showTable, setShowTable] = useState(false);
  const [useCustom, setUseCustom] = useState(false);

  const loanData = useMemo(() => {
    if (useCustom) {
      return {
        principal: customPrincipal,
        rate: customRate,
        tenure: customTenure,
        name: "Custom Loan",
      };
    }
    // Fall back to the first loan whenever `selectedLoan` doesn't resolve —
    // including a stale id left over after the loan was deleted elsewhere —
    // so a fabricated "Sample Loan" only ever appears when there are truly
    // no real loans to show.
    const matched = selectedLoan ? loans.find((lo) => lo.id === selectedLoan) : null;
    const l = matched || loans[0];
    if (l) {
      return {
        principal: Number(l.outstanding || l.principal || 0),
        rate: Number(l.rate || 0),
        tenure: Number(l.monthsRemaining || l.tenureMonths || 240),
        name: l.type || l.lender || "Loan",
      };
    }
    return { principal: 5000000, rate: 8.5, tenure: 240, name: "Sample Loan" };
  }, [selectedLoan, loans, useCustom, customPrincipal, customRate, customTenure]);

  const baseAmort = useMemo(
    () => generateAmortization(loanData.principal, loanData.rate, loanData.tenure),
    [loanData]
  );
  const extraAmort = useMemo(
    () =>
      extraEMI > 0
        ? generateAmortization(loanData.principal, loanData.rate, loanData.tenure, extraEMI)
        : null,
    [loanData, extraEMI]
  );

  const savings = useMemo(() => {
    if (!extraAmort) return null;
    return {
      interestSaved: baseAmort.totalInterest - extraAmort.totalInterest,
      monthsSaved: baseAmort.totalMonths - extraAmort.totalMonths,
      totalWithExtra: loanData.principal + extraAmort.totalInterest,
      totalWithout: loanData.principal + baseAmort.totalInterest,
    };
  }, [baseAmort, extraAmort, loanData.principal]);

  const chartData = useMemo(() => {
    return baseAmort.schedule.filter(
      (_, i) =>
        i % Math.max(1, Math.floor(baseAmort.schedule.length / 60)) === 0 ||
        i === baseAmort.schedule.length - 1
    );
  }, [baseAmort]);

  const yearlyBreakdown = useMemo(() => {
    const years = [];
    for (let i = 0; i < baseAmort.schedule.length; i += 12) {
      const yearMonths = baseAmort.schedule.slice(i, i + 12);
      const yearPrincipal = yearMonths.reduce((s, m) => s + m.principal, 0);
      const yearInterest = yearMonths.reduce((s, m) => s + m.interest, 0);
      years.push({
        year: Math.floor(i / 12) + 1,
        principal: yearPrincipal,
        interest: yearInterest,
        label: `Year ${Math.floor(i / 12) + 1}`,
      });
    }
    return years;
  }, [baseAmort]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div className="sub-tab-hero animate-fade-in-up">
        <div className="sub-tab-hero-icon">🏦</div>
        <div className="sub-tab-hero-body">
          <div className="sub-tab-hero-title">Loan Amortization</div>
          <div className="sub-tab-hero-desc">
            Detailed EMI breakdown with a prepayment simulator — see exactly how extra payments
            cut interest and tenure
          </div>
        </div>
        {loanData.principal > 0 && (
          <div className="sub-tab-hero-badge">
            <IndianRupee size={13} /> EMI {fmtINRExact(baseAmort.emi)}
          </div>
        )}
      </div>

      {/* Loan Selector */}
      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-end" }}>
          <div>
            <label
              id="loan-source-label"
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: THEME.muted,
                display: "block",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Loan Source
            </label>
            <div
              role="group"
              aria-labelledby="loan-source-label"
              style={{
                display: "flex",
                gap: 6,
                background: "var(--surface-0)",
                border: `1.5px solid ${THEME.line}`,
                padding: 4,
                borderRadius: 14,
              }}
            >
              <button
                onClick={() => setUseCustom(false)}
                className="card-lift"
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 12.5,
                  fontWeight: 600,
                  border: "none",
                  background: !useCustom ? "var(--accent)" : "transparent",
                  color: !useCustom ? "#fff" : THEME.ink,
                  transition: "all 0.2s ease",
                }}
              >
                From My Loans ({loans.length})
              </button>
              <button
                onClick={() => setUseCustom(true)}
                className="card-lift"
                style={{
                  padding: "8px 16px",
                  borderRadius: 10,
                  cursor: "pointer",
                  fontSize: 12.5,
                  fontWeight: 600,
                  border: "none",
                  background: useCustom ? "var(--accent)" : "transparent",
                  color: useCustom ? "#fff" : THEME.ink,
                  transition: "all 0.2s ease",
                }}
              >
                Custom Loan
              </button>
            </div>
          </div>

          {!useCustom && loans.length > 0 && (
            <div style={{ flex: 1, minWidth: 200 }}>
              <label
                htmlFor="loan-select-active"
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: THEME.muted,
                  display: "block",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Select Active Loan
              </label>
              <select
                id="loan-select-active"
                value={selectedLoan || loans[0]?.id || ""}
                onChange={(e) => setSelectedLoan(e.target.value)}
                className="form-input"
                style={{ padding: "10px 14px", fontSize: 13.5, fontWeight: 600 }}
              >
                {loans.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.type || l.lender || "Loan"} — {fmtINRFull(l.outstanding || l.principal)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {useCustom && (
            <>
              <div>
                <label
                  htmlFor="loan-custom-principal"
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: THEME.muted,
                    display: "block",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Principal (₹)
                </label>
                <input
                  id="loan-custom-principal"
                  type="number"
                  value={customPrincipal}
                  onChange={(e) => setCustomPrincipal(Number(e.target.value))}
                  className="form-input"
                  style={{ padding: "9px 12px", fontSize: 13.5, width: 140 }}
                />
              </div>
              <div>
                <label
                  htmlFor="loan-custom-rate"
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: THEME.muted,
                    display: "block",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Rate (% p.a.)
                </label>
                <input
                  id="loan-custom-rate"
                  type="number"
                  step="0.1"
                  value={customRate}
                  onChange={(e) => setCustomRate(Number(e.target.value))}
                  className="form-input"
                  style={{ padding: "9px 12px", fontSize: 13.5, width: 100 }}
                />
              </div>
              <div>
                <label
                  htmlFor="loan-custom-tenure"
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: THEME.muted,
                    display: "block",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Tenure (months)
                </label>
                <input
                  id="loan-custom-tenure"
                  type="number"
                  value={customTenure}
                  onChange={(e) => setCustomTenure(Number(e.target.value))}
                  className="form-input"
                  style={{ padding: "9px 12px", fontSize: 13.5, width: 100 }}
                />
              </div>
            </>
          )}

          <div>
            <label
              htmlFor="loan-extra-prepayment"
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: THEME.muted,
                display: "block",
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Extra Prepayment / Month
            </label>
            <input
              id="loan-extra-prepayment"
              type="number"
              value={extraEMI}
              onChange={(e) => setExtraEMI(Number(e.target.value))}
              placeholder="e.g. ₹5,000"
              className="form-input"
              style={{ padding: "9px 12px", fontSize: 13.5, width: 150 }}
            />
            <input
              type="range"
              className="cxo-slider"
              min={0}
              max={Math.max(50000, Math.round((baseAmort.emi || 0) * 2))}
              step={500}
              value={extraEMI}
              aria-label="Extra prepayment per month slider"
              onChange={(e) => setExtraEMI(Number(e.target.value))}
              style={{ marginTop: 10, width: 150 }}
            />
          </div>
        </div>
      </Card>

      {/* Stats */}
      {loanData.principal > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <AmortizationStatCard
              label="Monthly EMI"
              value={<Prv>{fmtINRExact(baseAmort.emi)}</Prv>}
              icon={<IndianRupee size={16} />}
              color="var(--accent)"
            />
            <AmortizationStatCard
              label="Total Interest"
              value={<Prv>{fmtINRFull(baseAmort.totalInterest)}</Prv>}
              icon={<TrendingDown size={16} />}
              color={THEME.rust}
            />
            <AmortizationStatCard
              label="Total Payment"
              value={<Prv>{fmtINRFull(loanData.principal + baseAmort.totalInterest)}</Prv>}
              icon={<Calculator size={16} />}
              color="var(--accent)"
            />
            <AmortizationStatCard
              label="Loan Closes In"
              value={`${Math.floor(baseAmort.totalMonths / 12)}y ${baseAmort.totalMonths % 12}m`}
              icon={<Calendar size={16} />}
              color={THEME.sage}
            />
          </div>

          {/* Prepayment Savings */}
          {savings && (
            <Card
              style={{
                padding: 24,
                background:
                  "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 12%, var(--surface-0)) 100%)",
                border: `1.5px solid ${THEME.line}`,
                borderLeft: `4px solid ${THEME.sage}`,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 16px",
                  fontSize: 15,
                  fontWeight: 800,
                  color: THEME.sage,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Zap size={18} /> Prepayment Impact
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 14,
                }}
              >
                <div
                  className="card-lift"
                  style={{
                    padding: "14px 18px",
                    borderRadius: 14,
                    background: "var(--surface-0)",
                    border: `1.5px solid ${THEME.line}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Interest Saved
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: THEME.sage, marginTop: 4 }}>
                    <Prv>{fmtINRFull(savings.interestSaved)}</Prv>
                  </div>
                </div>
                <div
                  className="card-lift"
                  style={{
                    padding: "14px 18px",
                    borderRadius: 14,
                    background: "var(--surface-0)",
                    border: `1.5px solid ${THEME.line}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Months Saved
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: THEME.sage, marginTop: 4 }}>
                    {Math.floor(savings.monthsSaved / 12)}y {savings.monthsSaved % 12}m
                    <span
                      style={{ fontSize: 12, fontWeight: 600, color: THEME.muted, marginLeft: 6 }}
                    >
                      ({savings.monthsSaved} mo)
                    </span>
                  </div>
                </div>
                <div
                  className="card-lift"
                  style={{
                    padding: "14px 18px",
                    borderRadius: 14,
                    background: "var(--surface-0)",
                    border: `1.5px solid ${THEME.line}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.muted,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    New Closure
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: THEME.sage, marginTop: 4 }}>
                    {Math.floor(extraAmort.totalMonths / 12)}y {extraAmort.totalMonths % 12}m
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Charts */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 16,
            }}
          >
            {/* Principal vs Interest Over Time */}
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
                  Balance Over Time
                </h3>
                <div style={{ fontSize: 11, color: THEME.muted }}>
                  Outstanding balance trajectory vs cumulative interest paid
                </div>
              </div>
              <div style={{ width: "100%", height: 300, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="interestGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.rust} stopOpacity={0.15} />
                      <stop offset="95%" stopColor={THEME.rust} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => fmtINRFull(v)}
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    axisLine={false}
                    tickLine={false}
                    width={85}
                  />
                  <Tooltip
                    formatter={(v) => fmtINRFull(v)}
                    content={<ChartTooltip formatter={(v) => fmtINRFull(v)} />}
                    cursor={{ stroke: THEME.line }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                    formatter={(value: string) => (
                      <span style={{ color: THEME.ink, fontWeight: 600 }}>{value}</span>
                    )}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="var(--accent)"
                    fill="url(#balanceGrad)"
                    strokeWidth={2.5}
                    name="Outstanding Balance"
                  />
                  <Area
                    type="monotone"
                    dataKey="totalInterest"
                    stroke={THEME.rust}
                    fill="url(#interestGrad)"
                    strokeWidth={2.5}
                    name="Cumulative Interest"
                  />
                </AreaChart>
              </ResponsiveContainer></div>
            </Card>

            {/* Yearly Breakdown Bar Chart */}
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
                  Yearly Principal vs Interest
                </h3>
                <div style={{ fontSize: 11, color: THEME.muted }}>
                  Annual split of principal components vs interest charges
                </div>
              </div>
              <div style={{ width: "100%", height: 300, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <BarChart data={yearlyBreakdown}>
                  <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tickFormatter={(v) => fmtINRFull(v)}
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    axisLine={false}
                    tickLine={false}
                    width={85}
                  />
                  <Tooltip
                    formatter={(v) => fmtINRFull(v)}
                    content={<ChartTooltip formatter={(v) => fmtINRFull(v)} />}
                    cursor={{ fill: THEME.line, opacity: 0.4 }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                    formatter={(value: string) => (
                      <span style={{ color: THEME.ink, fontWeight: 600 }}>{value}</span>
                    )}
                  />
                  <Bar
                    dataKey="principal"
                    name="Principal"
                    fill={THEME.sage}
                    stackId="a"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar
                    dataKey="interest"
                    name="Interest"
                    fill={THEME.rust}
                    stackId="a"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer></div>
            </Card>
          </div>

          {/* Full Schedule */}
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
                  Full Amortization Schedule
                </h3>
                <div style={{ fontSize: 11, color: THEME.muted }}>
                  Month-by-month financial projection ledger
                </div>
              </div>
              <button
                onClick={() => setShowTable(!showTable)}
                className="card-lift"
                style={{
                  background: "var(--surface-0)",
                  border: `1.5px solid ${THEME.line}`,
                  borderRadius: 12,
                  padding: "8px 16px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: THEME.ink,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {showTable
                  ? "Hide Table Ledger"
                  : `View Table Ledger (${baseAmort.schedule.length} months)`}
              </button>
            </div>

            {showTable && (
              <div
                style={{
                  overflowX: "auto",
                  maxHeight: 500,
                  overflowY: "auto",
                  border: `1.5px solid ${THEME.line}`,
                  borderRadius: 12,
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr
                      style={{
                        position: "sticky",
                        top: 0,
                        background: "var(--surface-1)",
                        zIndex: 2,
                      }}
                    >
                      <th style={thCenter}>Month</th>
                      <th style={th}>EMI</th>
                      <th style={th}>Principal</th>
                      <th style={th}>Interest</th>
                      <th style={th}>Outstanding Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {baseAmort.schedule.map((row) => (
                      <tr
                        key={row.month}
                        className="table-row-hover"
                        style={{
                          borderBottom: `1px solid ${THEME.line}`,
                        }}
                      >
                        <td style={tdCenter}>{row.month}</td>
                        <td style={td}>{fmtINRExact(row.emi)}</td>
                        <td style={{ ...td, color: THEME.sage, fontWeight: 600 }}>
                          {fmtINRExact(row.principal)}
                        </td>
                        <td style={{ ...td, color: THEME.rust, fontWeight: 600 }}>
                          {fmtINRExact(row.interest)}
                        </td>
                        <td
                          style={{
                            ...td,
                            fontWeight: 700,
                            color: THEME.ink,
                          }}
                        >
                          {fmtINRExact(row.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {loans.length === 0 && !useCustom && (
        <EmptyState
          icon={Calculator}
          title="No Active Loans"
          description="Add loans in the Credit & Liabilities section, or switch to Custom Loan mode to simulate any loan scenario."
        />
      )}
    </div>
  );
};
