// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Calculator,
  TrendingDown,
  IndianRupee,
  Calendar,
  Zap,
  AlertTriangle,
  CheckCircle,
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
  ComposedChart,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { EmptyState } from "../ui/EmptyState";
import { Prv } from "../../context/PrivacyContext";

const generateAmortization = (principal, annualRate, tenureMonths, extraMonthly = 0) => {
  const monthlyRate = annualRate / 100 / 12;
  const emi = monthlyRate > 0
    ? (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1)
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
      emi: Math.round(emi + (balance > 0 ? extraMonthly : 0)),
      principal: Math.round(principalPart),
      interest: Math.round(interestPart),
      balance: Math.max(0, Math.round(balance)),
      totalInterest: Math.round(totalInterest),
      totalPrincipal: Math.round(totalPrincipal),
    });

    if (balance <= 0) break;
  }

  return { emi: Math.round(emi), schedule, totalInterest: Math.round(totalInterest), totalMonths: month };
};

export const LoanAmortizationTab = ({ state }) => {
  const loans = useMemo(() => [...(state.loansTaken || [])].filter((l) => Number(l.outstanding || l.principal) > 0), [state.loansTaken]);

  const [selectedLoan, setSelectedLoan] = useState(null);
  const [customPrincipal, setCustomPrincipal] = useState(0);
  const [customRate, setCustomRate] = useState(0);
  const [customTenure, setCustomTenure] = useState(0);
  const [extraEMI, setExtraEMI] = useState(0);
  const [showTable, setShowTable] = useState(false);
  const [useCustom, setUseCustom] = useState(false);

  const loanData = useMemo(() => {
    if (useCustom) {
      return { principal: customPrincipal, rate: customRate, tenure: customTenure, name: "Custom Loan" };
    }
    if (!selectedLoan && loans.length > 0) {
      const l = loans[0];
      return {
        principal: Number(l.outstanding || l.principal || 0),
        rate: Number(l.rate || 0),
        tenure: Number(l.monthsRemaining || l.tenureMonths || 240),
        name: l.type || l.lender || "Loan",
      };
    }
    if (selectedLoan) {
      const l = loans.find((lo) => lo.id === selectedLoan);
      if (l) return {
        principal: Number(l.outstanding || l.principal || 0),
        rate: Number(l.rate || 0),
        tenure: Number(l.monthsRemaining || l.tenureMonths || 240),
        name: l.type || l.lender || "Loan",
      };
    }
    return { principal: 5000000, rate: 8.5, tenure: 240, name: "Sample Loan" };
  }, [selectedLoan, loans, useCustom, customPrincipal, customRate, customTenure]);

  const baseAmort = useMemo(() => generateAmortization(loanData.principal, loanData.rate, loanData.tenure), [loanData]);
  const extraAmort = useMemo(() => extraEMI > 0 ? generateAmortization(loanData.principal, loanData.rate, loanData.tenure, extraEMI) : null, [loanData, extraEMI]);

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
    return baseAmort.schedule.filter((_, i) => i % Math.max(1, Math.floor(baseAmort.schedule.length / 60)) === 0 || i === baseAmort.schedule.length - 1);
  }, [baseAmort]);

  const yearlyBreakdown = useMemo(() => {
    const years = [];
    for (let i = 0; i < baseAmort.schedule.length; i += 12) {
      const yearMonths = baseAmort.schedule.slice(i, i + 12);
      const yearPrincipal = yearMonths.reduce((s, m) => s + m.principal, 0);
      const yearInterest = yearMonths.reduce((s, m) => s + m.interest, 0);
      years.push({ year: Math.floor(i / 12) + 1, principal: yearPrincipal, interest: yearInterest, label: `Year ${Math.floor(i / 12) + 1}` });
    }
    return years;
  }, [baseAmort]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle sub="Detailed EMI breakdown with prepayment simulator">Loan Amortization</SectionTitle>

      {/* Loan Selector */}
      <Card style={{ padding: 24 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
          <div>
            <label style={{ fontSize: 12, color: THEME.textSecondary, display: "block", marginBottom: 4 }}>Source</label>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setUseCustom(false)}
                style={{ padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                  border: `1px solid ${!useCustom ? "var(--accent)" : THEME.border}`,
                  background: !useCustom ? "var(--accent)" : THEME.card, color: !useCustom ? "#fff" : THEME.text }}>
                From My Loans ({loans.length})
              </button>
              <button onClick={() => setUseCustom(true)}
                style={{ padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13,
                  border: `1px solid ${useCustom ? "var(--accent)" : THEME.border}`,
                  background: useCustom ? "var(--accent)" : THEME.card, color: useCustom ? "#fff" : THEME.text }}>
                Custom Loan
              </button>
            </div>
          </div>

          {!useCustom && loans.length > 0 && (
            <div>
              <label style={{ fontSize: 12, color: THEME.textSecondary, display: "block", marginBottom: 4 }}>Select Loan</label>
              <select value={selectedLoan || loans[0]?.id || ""} onChange={(e) => setSelectedLoan(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, fontSize: 14 }}>
                {loans.map((l) => (
                  <option key={l.id} value={l.id}>{l.type || l.lender || "Loan"} — {fmtINRFull(l.outstanding || l.principal)}</option>
                ))}
              </select>
            </div>
          )}

          {useCustom && (
            <>
              <div>
                <label style={{ fontSize: 12, color: THEME.textSecondary, display: "block", marginBottom: 4 }}>Principal</label>
                <input type="number" value={customPrincipal} onChange={(e) => setCustomPrincipal(Number(e.target.value))}
                  style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, fontSize: 14, width: 140 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: THEME.textSecondary, display: "block", marginBottom: 4 }}>Rate (% p.a.)</label>
                <input type="number" step="0.1" value={customRate} onChange={(e) => setCustomRate(Number(e.target.value))}
                  style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, fontSize: 14, width: 100 }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: THEME.textSecondary, display: "block", marginBottom: 4 }}>Tenure (months)</label>
                <input type="number" value={customTenure} onChange={(e) => setCustomTenure(Number(e.target.value))}
                  style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, fontSize: 14, width: 100 }} />
              </div>
            </>
          )}

          <div>
            <label style={{ fontSize: 12, color: THEME.textSecondary, display: "block", marginBottom: 4 }}>Extra Payment / Month</label>
            <input type="number" value={extraEMI} onChange={(e) => setExtraEMI(Number(e.target.value))}
              placeholder="0"
              style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${THEME.border}`, background: THEME.card, color: THEME.text, fontSize: 14, width: 140 }} />
          </div>
        </div>
      </Card>

      {/* Stats */}
      {loanData.principal > 0 && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <StatCard label="Monthly EMI" value={<Prv>{fmtINRFull(baseAmort.emi)}</Prv>} icon={<IndianRupee />} color="var(--accent)" />
            <StatCard label="Total Interest" value={<Prv>{fmtINRFull(baseAmort.totalInterest)}</Prv>} icon={<TrendingDown />} color="#EF4444" />
            <StatCard label="Total Payment" value={<Prv>{fmtINRFull(loanData.principal + baseAmort.totalInterest)}</Prv>} icon={<Calculator />} color="#3B82F6" />
            <StatCard label="Loan Closes In" value={`${Math.floor(baseAmort.totalMonths / 12)}y ${baseAmort.totalMonths % 12}m`} icon={<Calendar />} color="#10B981" />
          </div>

          {/* Prepayment Savings */}
          {savings && (
            <Card style={{ padding: 24, background: "#10B98108", border: "1px solid #10B98130" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: "#10B981", display: "flex", alignItems: "center", gap: 8 }}>
                <Zap size={18} /> Prepayment Impact
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                <div style={{ padding: "12px 16px", borderRadius: 12, background: "#10B98115" }}>
                  <div style={{ fontSize: 12, color: THEME.textSecondary }}>Interest Saved</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#10B981" }}><Prv>{fmtINRFull(savings.interestSaved)}</Prv></div>
                </div>
                <div style={{ padding: "12px 16px", borderRadius: 12, background: "#10B98115" }}>
                  <div style={{ fontSize: 12, color: THEME.textSecondary }}>Months Saved</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#10B981" }}>
                    {Math.floor(savings.monthsSaved / 12)}y {savings.monthsSaved % 12}m ({savings.monthsSaved} months)
                  </div>
                </div>
                <div style={{ padding: "12px 16px", borderRadius: 12, background: "#10B98115" }}>
                  <div style={{ fontSize: 12, color: THEME.textSecondary }}>New Closure</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#10B981" }}>
                    {Math.floor(extraAmort.totalMonths / 12)}y {extraAmort.totalMonths % 12}m
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Principal vs Interest Over Time */}
          <Card style={{ padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>Balance Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: THEME.textSecondary }} label={{ value: "Month", position: "insideBottom", offset: -5 }} />
                <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 11, fill: THEME.textSecondary }} />
                <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 12 }} />
                <Legend />
                <Area type="monotone" dataKey="balance" stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.15} strokeWidth={2} name="Outstanding Balance" />
                <Area type="monotone" dataKey="totalInterest" stroke="#EF4444" fill="#EF444420" strokeWidth={2} name="Cumulative Interest" />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Yearly Breakdown Bar Chart */}
          <Card style={{ padding: 24 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 600, color: THEME.text }}>Yearly Principal vs Interest</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={yearlyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: THEME.textSecondary }} />
                <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 11, fill: THEME.textSecondary }} />
                <Tooltip formatter={(v) => fmtINRFull(v)} contentStyle={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 12 }} />
                <Legend />
                <Bar dataKey="principal" name="Principal" fill="#10B981" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="interest" name="Interest" fill="#EF4444" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Full Schedule */}
          <Card style={{ padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: THEME.text }}>Full Amortization Schedule</h3>
              <button onClick={() => setShowTable(!showTable)}
                style={{ background: "none", border: `1px solid ${THEME.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 13, color: THEME.textSecondary, cursor: "pointer" }}>
                {showTable ? "Hide Table" : `Show Table (${baseAmort.schedule.length} rows)`}
              </button>
            </div>

            {showTable && (
              <div style={{ overflowX: "auto", maxHeight: 500, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${THEME.border}`, position: "sticky", top: 0, background: THEME.card }}>
                      <th style={{ padding: 8, textAlign: "center", color: THEME.textSecondary }}>#</th>
                      <th style={{ padding: 8, textAlign: "right", color: THEME.textSecondary }}>EMI</th>
                      <th style={{ padding: 8, textAlign: "right", color: THEME.textSecondary }}>Principal</th>
                      <th style={{ padding: 8, textAlign: "right", color: THEME.textSecondary }}>Interest</th>
                      <th style={{ padding: 8, textAlign: "right", color: THEME.textSecondary }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {baseAmort.schedule.map((row) => (
                      <tr key={row.month} style={{ borderBottom: `1px solid ${THEME.border}` }}>
                        <td style={{ padding: 8, textAlign: "center", color: THEME.textSecondary }}>{row.month}</td>
                        <td style={{ padding: 8, textAlign: "right", color: THEME.text }}>{fmtINRFull(row.emi)}</td>
                        <td style={{ padding: 8, textAlign: "right", color: "#10B981" }}>{fmtINRFull(row.principal)}</td>
                        <td style={{ padding: 8, textAlign: "right", color: "#EF4444" }}>{fmtINRFull(row.interest)}</td>
                        <td style={{ padding: 8, textAlign: "right", fontWeight: 600, color: THEME.text }}>{fmtINRFull(row.balance)}</td>
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
        <EmptyState icon={Calculator} title="No Active Loans"
          description="Add loans in the Credit & Liabilities section, or switch to Custom Loan mode to simulate any loan scenario." />
      )}
    </div>
  );
};
