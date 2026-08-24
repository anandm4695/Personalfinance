/* eslint-disable */
// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Calculator,
  TrendingDown,
  IndianRupee,
  Calendar,
  Zap,
  Info,
  Download,
  Search,
  X,
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
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, fmtINRExact, loanOutstanding } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";

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

export const generateAmortization = (
  principal,
  annualRate,
  tenureMonths,
  extraMonthly = 0,
  lumpSum = null
) => {
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
    if (lumpSum && lumpSum.month === month && lumpSum.amount > 0) {
      principalPart += lumpSum.amount;
    }
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

// Projects a schedule row's calendar date from today — loans don't store a
// disbursement date, so this is the same "starting now" anchor the rest of
// the calculator already uses (balance = today's outstanding, tenure = months remaining).
const addMonths = (date, n) => new Date(date.getFullYear(), date.getMonth() + n, 1);
const formatMonthYear = (date) => date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });

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

export const LoanAmortizationTab = ({ state }) => {
  const { privacyMode } = usePrivacy();
  const loans = useMemo(
    // A loan with `outstanding` explicitly at 0 is paid off — only fall back to
    // `principal` when `outstanding` is genuinely missing (legacy/imported rows),
    // otherwise a settled loan reappears here as if it were still active.
    () => [...(state.loansTaken || [])].filter((l) => loanOutstanding(l) > 0),
    [state.loansTaken]
  );

  const [selectedLoan, setSelectedLoan] = useState(null);
  const [customPrincipal, setCustomPrincipal] = useState(0);
  const [customRate, setCustomRate] = useState(0);
  const [customTenure, setCustomTenure] = useState(0);
  const [extraEMI, setExtraEMI] = useState(0);
  const [lumpSumAmount, setLumpSumAmount] = useState(0);
  const [lumpSumMonth, setLumpSumMonth] = useState(12);
  const [showTable, setShowTable] = useState(false);
  const [useCustom, setUseCustom] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const today = useMemo(() => new Date(), []);

  // Resolves to a real loan id whenever one exists — falls back to the first
  // loan if `selectedLoan` is unset or stale (e.g. that loan was deleted
  // elsewhere) — so the <select> below never shows blank while the
  // calculator is actually using loans[0]'s figures underneath it.
  const resolvedLoanId = useMemo(() => {
    if (selectedLoan && loans.some((lo) => lo.id === selectedLoan)) return selectedLoan;
    return loans[0]?.id || "";
  }, [selectedLoan, loans]);

  const loanData = useMemo(() => {
    if (useCustom) {
      return {
        principal: customPrincipal,
        rate: customRate,
        tenure: customTenure,
        name: "Custom Loan",
      };
    }
    const l = loans.find((lo) => lo.id === resolvedLoanId);
    if (l) {
      return {
        principal: loanOutstanding(l),
        rate: Number(l.rate || 0),
        tenure: Number(l.monthsRemaining || l.tenureMonths || 240),
        name: l.type || l.lender || "Loan",
      };
    }
    // No active loan to fall back to — return an empty loan rather than a
    // fake "Sample Loan" so this doesn't render alongside the "No Active
    // Loans" empty state below with contradictory, made-up figures.
    return { principal: 0, rate: 0, tenure: 0, name: "" };
  }, [resolvedLoanId, loans, useCustom, customPrincipal, customRate, customTenure]);

  const baseAmort = useMemo(
    () => generateAmortization(loanData.principal, loanData.rate, loanData.tenure),
    [loanData]
  );
  const hasPrepayment = extraEMI > 0 || lumpSumAmount > 0;
  const extraAmort = useMemo(
    () =>
      hasPrepayment
        ? generateAmortization(
            loanData.principal,
            loanData.rate,
            loanData.tenure,
            extraEMI,
            lumpSumAmount > 0 ? { month: lumpSumMonth, amount: lumpSumAmount } : null
          )
        : null,
    [loanData, extraEMI, lumpSumAmount, lumpSumMonth, hasPrepayment]
  );
  // The table/CSV should reflect whatever scenario is actually configured —
  // previously they always showed the un-prepaid schedule even while the
  // Prepayment Impact card and chart showed the accelerated one.
  const activeAmort = extraAmort || baseAmort;

  const scheduleWithDates = useMemo(
    () =>
      activeAmort.schedule.map((row) => ({
        ...row,
        dateLabel: formatMonthYear(addMonths(today, row.month - 1)),
      })),
    [activeAmort, today]
  );

  const filteredSchedule = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return scheduleWithDates;
    return scheduleWithDates.filter(
      (row) => String(row.month).includes(q) || row.dateLabel.toLowerCase().includes(q)
    );
  }, [scheduleWithDates, searchQuery]);

  const closureDate = useMemo(
    () => (baseAmort.totalMonths ? formatMonthYear(addMonths(today, baseAmort.totalMonths - 1)) : null),
    [baseAmort, today]
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
    const sampleEvery = Math.max(1, Math.floor(baseAmort.schedule.length / 60));
    return baseAmort.schedule
      .filter((_, i) => i % sampleEvery === 0 || i === baseAmort.schedule.length - 1)
      .map((row) => {
        if (!extraAmort) return row;
        const extraRow = extraAmort.schedule.find((r) => r.month === row.month);
        return { ...row, balanceWithPrepay: extraRow ? extraRow.balance : 0 };
      });
  }, [baseAmort, extraAmort]);

  const yearlyBreakdown = useMemo(() => {
    const years = [];
    for (let i = 0; i < baseAmort.schedule.length; i += 12) {
      const yearMonths = baseAmort.schedule.slice(i, i + 12);
      const yearPrincipal = yearMonths.reduce((s, m) => s + m.principal, 0);
      const yearInterest = yearMonths.reduce((s, m) => s + m.interest, 0);
      const startYear = addMonths(today, i).getFullYear();
      const endYear = addMonths(today, i + yearMonths.length - 1).getFullYear();
      years.push({
        year: Math.floor(i / 12) + 1,
        principal: yearPrincipal,
        interest: yearInterest,
        label: startYear === endYear ? `${startYear}` : `${startYear}–'${String(endYear).slice(-2)}`,
      });
    }
    return years;
  }, [baseAmort, today]);

  const downloadScheduleCSV = () => {
    const rows = ["Month,Date,EMI,Principal,Interest,Outstanding Balance"];
    scheduleWithDates.forEach((row) => {
      rows.push([row.month, row.dateLabel, row.emi, row.principal, row.interest, row.balance].join(","));
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const suffix = extraAmort ? "-with-prepayment" : "";
    a.download = `${(loanData.name || "loan").toLowerCase().replace(/\s+/g, "-")}-amortization${suffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle
        sub="Detailed EMI breakdown with a prepayment simulator — see exactly how extra payments cut interest and tenure"
        rightElement={
          loanData.principal > 0 && (
            <>
              <Badge variant="muted">{loanData.name}</Badge>
              <Badge variant="accent">
                <IndianRupee size={13} /> EMI <Money value={baseAmort.emi} variant="exact" />
              </Badge>
            </>
          )
        }
      >
        Loan Amortization
      </SectionTitle>

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
                aria-pressed={!useCustom}
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
                aria-pressed={useCustom}
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
                value={resolvedLoanId}
                onChange={(e) => setSelectedLoan(e.target.value)}
                className="form-input"
                style={{ padding: "10px 14px", fontSize: 13.5, fontWeight: 600 }}
              >
                {loans.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.type || l.lender || "Loan"} —{" "}
                    {privacyMode ? "••••" : fmtINRFull(l.outstanding || l.principal)}
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
                  min="0"
                  value={customPrincipal}
                  onChange={(e) => setCustomPrincipal(Math.max(0, Number(e.target.value)))}
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
                  min="0"
                  value={customRate}
                  onChange={(e) => setCustomRate(Math.max(0, Number(e.target.value)))}
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
                  min="0"
                  value={customTenure}
                  onChange={(e) => setCustomTenure(Math.max(0, Number(e.target.value)))}
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
              min="0"
              value={extraEMI}
              onChange={(e) => setExtraEMI(Math.max(0, Number(e.target.value)))}
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

          <div>
            <label
              id="loan-lumpsum-label"
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
              One-Time Lump Sum (Optional)
            </label>
            <div role="group" aria-labelledby="loan-lumpsum-label" style={{ display: "flex", gap: 8 }}>
              <input
                type="number"
                min="0"
                value={lumpSumAmount}
                onChange={(e) => setLumpSumAmount(Math.max(0, Number(e.target.value)))}
                placeholder="Amount ₹"
                aria-label="One-time lump sum amount"
                className="form-input"
                style={{ padding: "9px 12px", fontSize: 13.5, width: 110 }}
              />
              <input
                type="number"
                min="1"
                max={loanData.tenure || 360}
                value={lumpSumMonth}
                onChange={(e) =>
                  setLumpSumMonth(
                    Math.max(1, Math.min(loanData.tenure || 360, Number(e.target.value) || 1))
                  )
                }
                placeholder="Month #"
                aria-label="Month number to apply the lump sum in"
                title="Which month number to apply the lump sum in (1 = next payment)"
                className="form-input"
                style={{ padding: "9px 12px", fontSize: 13.5, width: 90 }}
              />
            </div>
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
            <StatCard
              label="Monthly EMI"
              value={fmtINRExact(baseAmort.emi)}
              numericValue={baseAmort.emi}
              formatValue={fmtINRExact}
              icon={<IndianRupee size={16} />}
              color="var(--accent)"
            />
            <StatCard
              label="Total Interest"
              value={fmtINRFull(baseAmort.totalInterest)}
              numericValue={baseAmort.totalInterest}
              formatValue={fmtINRFull}
              icon={<TrendingDown size={16} />}
              color={THEME.rust}
            />
            <StatCard
              label="Total Payment"
              value={fmtINRFull(loanData.principal + baseAmort.totalInterest)}
              numericValue={loanData.principal + baseAmort.totalInterest}
              formatValue={fmtINRFull}
              icon={<Calculator size={16} />}
              color="var(--accent)"
            />
            <StatCard
              label="Loan Closes In"
              value={`${Math.floor(baseAmort.totalMonths / 12)}y ${baseAmort.totalMonths % 12}m`}
              numericValue={baseAmort.totalMonths}
              formatValue={(n) => `${Math.floor(n / 12)}y ${Math.round(n % 12)}m`}
              sub={closureDate ? `Around ${closureDate}` : undefined}
              icon={<Calendar size={16} />}
              color={THEME.sage}
            />
          </div>

          {/* Prepayment Savings */}
          {savings && (
            <Card
              style={{
                padding: 24,
                background: "var(--surface-0)",
                border: `1.5px solid ${THEME.line}`,
                borderLeft: `4px solid ${THEME.sage}`,
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
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: THEME.sage, marginTop: 4 }}>
                    <Money value={savings.interestSaved} variant="full" />
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
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: THEME.sage, marginTop: 4 }}>
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
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: THEME.sage, marginTop: 4 }}>
                    {Math.floor(extraAmort.totalMonths / 12)}y {extraAmort.totalMonths % 12}m
                    {extraAmort.totalMonths > 0 && (
                      <span
                        style={{ fontSize: 12, fontWeight: 600, color: THEME.muted, marginLeft: 6 }}
                      >
                        ({formatMonthYear(addMonths(today, extraAmort.totalMonths - 1))})
                      </span>
                    )}
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
                    tickFormatter={(v) => (privacyMode ? "••••" : fmtINRFull(v))}
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    axisLine={false}
                    tickLine={false}
                    width={85}
                  />
                  <Tooltip
                    formatter={(v) => (privacyMode ? "••••" : fmtINRFull(v))}
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
                  {extraAmort && (
                    <Area
                      type="monotone"
                      dataKey="balanceWithPrepay"
                      stroke={THEME.sage}
                      strokeWidth={2.5}
                      strokeDasharray="5 4"
                      fill="none"
                      name="Balance With Prepayment"
                    />
                  )}
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
                    tickFormatter={(v) => (privacyMode ? "••••" : fmtINRFull(v))}
                    tick={{ fontSize: 11, fill: THEME.muted }}
                    axisLine={false}
                    tickLine={false}
                    width={85}
                  />
                  <Tooltip
                    formatter={(v) => (privacyMode ? "••••" : fmtINRFull(v))}
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
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
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
                  {extraAmort && <Badge variant="accent">Including Prepayment</Badge>}
                </div>
                <div style={{ fontSize: 11, color: THEME.muted }}>
                  Month-by-month financial projection ledger
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {showTable && (
                  <div style={{ display: "flex", position: "relative", alignItems: "center" }}>
                    <Search
                      size={14}
                      color={THEME.muted}
                      style={{ position: "absolute", left: 12, pointerEvents: "none" }}
                    />
                    <input
                      type="text"
                      aria-label="Search schedule by month or date"
                      placeholder="Search month or date..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: 190,
                        padding: `8px ${searchQuery ? 32 : 12}px 8px 32px`,
                        borderRadius: 12,
                        border: `1.5px solid ${THEME.line}`,
                        background: "var(--surface-0)",
                        color: THEME.ink,
                        fontSize: 12.5,
                        boxShadow: "var(--shadow-sm)",
                      }}
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        aria-label="Clear search"
                        onClick={() => setSearchQuery("")}
                        style={{
                          position: "absolute",
                          right: 8,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          border: "none",
                          background: "var(--surface-2)",
                          color: THEME.muted,
                          cursor: "pointer",
                        }}
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>
                )}
                <button
                  onClick={downloadScheduleCSV}
                  className="card-lift"
                  title="Download full schedule as CSV"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
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
                  <Download size={14} /> Export CSV
                </button>
                <button
                  onClick={() => setShowTable(!showTable)}
                  className="card-lift"
                  aria-expanded={showTable}
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
                    : `View Table Ledger (${activeAmort.schedule.length} months)`}
                </button>
              </div>
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
                      <th style={thCenter}>Date</th>
                      <th style={th}>EMI</th>
                      <th style={th}>Principal</th>
                      <th style={th}>Interest</th>
                      <th style={th}>Outstanding Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchedule.map((row) => (
                      <tr
                        key={row.month}
                        className="table-row-hover"
                        style={{
                          borderBottom: `1px solid ${THEME.line}`,
                        }}
                      >
                        <td style={tdCenter}>{row.month}</td>
                        <td style={tdCenter}>{row.dateLabel}</td>
                        <td style={td}>
                          <Money value={row.emi} variant="exact" />
                        </td>
                        <td style={{ ...td, color: THEME.sage, fontWeight: 600 }}>
                          <Money value={row.principal} variant="exact" />
                        </td>
                        <td style={{ ...td, color: THEME.rust, fontWeight: 600 }}>
                          <Money value={row.interest} variant="exact" />
                        </td>
                        <td
                          style={{
                            ...td,
                            fontWeight: 700,
                            color: THEME.ink,
                          }}
                        >
                          <Money value={row.balance} variant="exact" />
                        </td>
                      </tr>
                    ))}
                    {filteredSchedule.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ ...td, textAlign: "center", padding: 24 }}>
                          {searchQuery.trim()
                            ? `No months match "${searchQuery}"`
                            : "No schedule to display — check the loan's tenure."}
                        </td>
                      </tr>
                    )}
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

      {useCustom && loanData.principal <= 0 && (
        <EmptyState
          icon={Calculator}
          title="Enter a Custom Loan"
          description="Fill in the Principal, Rate, and Tenure fields above to simulate any loan scenario."
        />
      )}
    </div>
  );
};
