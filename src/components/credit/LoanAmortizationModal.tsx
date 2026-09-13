/* eslint-disable */
import React, { useState, useMemo } from "react";
import {
  Calculator,
  Download,
  Calendar,
  IndianRupee,
  Percent,
  Clock,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  X,
  Zap,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, fmtINRExact } from "../../utils/finance";
import { Modal } from "../ui/Modal";
import { Money } from "../ui/Money";
import { Badge } from "../ui/Badge";
import { generateAmortization, AmortizationScheduleItem } from "../tabs/LoanAmortizationTab";

interface LoanAmortizationModalProps {
  loan: any;
  onClose: () => void;
}

export function LoanAmortizationModal({ loan, onClose }: LoanAmortizationModalProps) {
  const [viewYearly, setViewYearly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [extraMonthly, setExtraMonthly] = useState(0);
  const pageSize = 12;

  const principal = Number(loan.principal) || 0;
  const outstanding = Number(loan.outstanding ?? loan.principal) || 0;
  const rate = Number(loan.rate) || 0;
  const emi = Number(loan.emi) || 0;
  const monthsRemaining = Number(loan.monthsRemaining) || 0;

  // Derive initial tenure if not explicitly available
  const tenureMonths = useMemo(() => {
    if (monthsRemaining > 0) return monthsRemaining;
    const monthlyRate = rate / 100 / 12;
    if (monthlyRate > 0 && emi > monthlyRate * principal) {
      const n = -Math.log(1 - (monthlyRate * principal) / emi) / Math.log(1 + monthlyRate);
      return Math.max(1, Math.round(n));
    }
    return emi > 0 ? Math.max(1, Math.round(principal / emi)) : 12;
  }, [principal, rate, emi, monthsRemaining]);

  const baseBalance = outstanding > 0 ? outstanding : principal;

  // Base Amortization
  const baseAmortization = useMemo(() => {
    return generateAmortization(baseBalance, rate, tenureMonths, 0, null);
  }, [baseBalance, rate, tenureMonths]);

  // Prepayment Amortization
  const extraAmortization = useMemo(() => {
    if (extraMonthly <= 0) return null;
    return generateAmortization(baseBalance, rate, tenureMonths, extraMonthly, null);
  }, [baseBalance, rate, tenureMonths, extraMonthly]);

  const activeAmortization = extraAmortization || baseAmortization;

  // Aggregate by yearly view if toggled
  const yearlySchedule = useMemo(() => {
    const years: Record<
      number,
      {
        year: number;
        principal: number;
        interest: number;
        emi: number;
        endingBalance: number;
      }
    > = {};

    activeAmortization.schedule.forEach((item) => {
      const year = Math.ceil(item.month / 12);
      if (!years[year]) {
        years[year] = {
          year,
          principal: 0,
          interest: 0,
          emi: 0,
          endingBalance: item.balance,
        };
      }
      years[year].principal += item.principal;
      years[year].interest += item.interest;
      years[year].emi += item.emi;
      years[year].endingBalance = item.balance;
    });

    return Object.values(years);
  }, [activeAmortization.schedule]);

  // Chart data (downsampled if long tenure)
  const chartData = useMemo(() => {
    return activeAmortization.schedule
      .filter(
        (_, idx) =>
          idx % (activeAmortization.schedule.length > 60 ? 3 : 1) === 0 ||
          idx === activeAmortization.schedule.length - 1
      )
      .map((item) => ({
        month: `M${item.month}`,
        Balance: item.balance,
        "Principal Paid": item.totalPrincipal,
        "Interest Paid": item.totalInterest,
      }));
  }, [activeAmortization.schedule]);

  const totalPages = Math.ceil(activeAmortization.schedule.length / pageSize);
  const pagedItems = activeAmortization.schedule.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const interestSaved = extraAmortization
    ? baseAmortization.totalInterest - extraAmortization.totalInterest
    : 0;
  const monthsSaved = extraAmortization
    ? baseAmortization.totalMonths - extraAmortization.totalMonths
    : 0;

  const exportCSV = () => {
    const headers = [
      "Month",
      "Payment (₹)",
      "Principal (₹)",
      "Interest (₹)",
      "Balance (₹)",
      "Cum. Interest (₹)",
    ];
    const rows = activeAmortization.schedule.map((row) => [
      row.month,
      row.emi,
      row.principal,
      row.interest,
      row.balance,
      row.totalInterest,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Amortization_${(loan.lender || "Loan").replace(/\s+/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal
      title={`Amortization Schedule — ${loan.lender || "Loan"} (${loan.type || "Personal"})`}
      onClose={onClose}
      maxWidth={920}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          width: "100%",
          maxWidth: "100%",
        }}
      >
        {/* Loan Summary Bar */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 10,
            padding: "14px 18px",
            background: "color-mix(in srgb, var(--surface-1) 60%, transparent)",
            borderRadius: 14,
            border: `1.5px solid var(--t-line)`,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 800,
                textTransform: "uppercase",
                color: "var(--t-muted)",
                letterSpacing: "0.05em",
              }}
            >
              Outstanding Balance
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "var(--t-rust)", marginTop: 2 }}>
              <Money value={outstanding} variant="exact" />
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 800,
                textTransform: "uppercase",
                color: "var(--t-muted)",
                letterSpacing: "0.05em",
              }}
            >
              Base EMI
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "var(--t-accent)", marginTop: 2 }}>
              <Money value={baseAmortization.emi || emi} variant="exact" />
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 800,
                textTransform: "uppercase",
                color: "var(--t-muted)",
                letterSpacing: "0.05em",
              }}
            >
              Interest Rate
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "var(--t-ink)", marginTop: 2 }}>
              {rate ? `${rate}% p.a.` : "—"}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 800,
                textTransform: "uppercase",
                color: "var(--t-muted)",
                letterSpacing: "0.05em",
              }}
            >
              Total Interest
            </div>
            <div style={{ fontSize: 16, fontWeight: 900, color: "var(--t-rust)", marginTop: 2 }}>
              <Money value={activeAmortization.totalInterest} variant="exact" />
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 800,
                textTransform: "uppercase",
                color: "var(--t-muted)",
                letterSpacing: "0.05em",
              }}
            >
              Time to Payoff
            </div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "var(--t-sage)", marginTop: 2 }}>
              {Math.floor(activeAmortization.totalMonths / 12)}y{" "}
              {activeAmortization.totalMonths % 12}m
            </div>
          </div>
        </div>

        {/* Prepayment Slider Mini-Simulator */}
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            background: "color-mix(in srgb, var(--accent) 6%, var(--surface-0))",
            border: `1px solid color-mix(in srgb, var(--accent) 20%, var(--t-line))`,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 12,
                fontWeight: 800,
                color: "var(--t-ink)",
              }}
            >
              <Zap size={14} color="var(--t-accent)" />
              <span>Simulate Prepayment Acceleration:</span>
              <span style={{ color: "var(--t-sage)", fontWeight: 800 }}>
                {extraMonthly > 0 ? `+${fmtINR(extraMonthly)}/month` : "None"}
              </span>
            </div>

            {extraMonthly > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--t-sage)" }}>
                  Saves <Money value={interestSaved} variant="exact" /> & {monthsSaved} months!
                </span>
                <button
                  onClick={() => setExtraMonthly(0)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--t-muted)",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Reset
                </button>
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="range"
              className="cxo-slider"
              min={0}
              max={Math.max(25000, Math.round((baseAmortization.emi || 10000) * 1.5))}
              step={500}
              value={extraMonthly}
              aria-label="Extra monthly prepayment slider"
              onChange={(e) => setExtraMonthly(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <div style={{ display: "flex", gap: 4 }}>
              {[1000, 2500, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setExtraMonthly(amt)}
                  style={{
                    padding: "2px 6px",
                    borderRadius: 6,
                    border: `1px solid ${extraMonthly === amt ? "var(--accent)" : "var(--t-line)"}`,
                    background:
                      extraMonthly === amt
                        ? "color-mix(in srgb, var(--accent) 15%, transparent)"
                        : "var(--surface-0)",
                    color: extraMonthly === amt ? "var(--accent)" : "var(--t-ink)",
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  +₹{(amt / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Balance vs Paid Off Chart */}
        {activeAmortization.schedule.length > 0 && (
          <div
            style={{
              padding: "16px",
              borderRadius: 14,
              background: "var(--surface-0)",
              border: `1px solid var(--t-line)`,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 800,
                  color: "var(--t-ink)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Calculator size={14} color="var(--t-accent)" /> Payoff Trajectory Curve
              </div>
              <span style={{ fontSize: 11, color: "var(--t-muted)", fontWeight: 700 }}>
                {activeAmortization.schedule.length} months until debt-free
              </span>
            </div>
            <div style={{ width: "100%", height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="modalBalanceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.rust} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={THEME.rust} stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="modalPrincipalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={THEME.sage} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={THEME.sage} stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--t-line)" opacity={0.6} />
                  <XAxis dataKey="month" stroke="var(--t-muted)" fontSize={10} tickLine={false} />
                  <YAxis
                    stroke="var(--t-muted)"
                    fontSize={10}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--surface-0)",
                      borderColor: "var(--t-line)",
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 700,
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                    }}
                    formatter={(val: any) => [fmtINRFull(val), ""]}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                  <Area
                    type="monotone"
                    dataKey="Balance"
                    stroke={THEME.rust}
                    fillOpacity={1}
                    fill="url(#modalBalanceGrad)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="Principal Paid"
                    stroke={THEME.sage}
                    fillOpacity={1}
                    fill="url(#modalPrincipalGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Table Controls */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 4,
              background: "var(--surface-1)",
              padding: 3,
              borderRadius: 10,
            }}
          >
            <button
              onClick={() => {
                setViewYearly(false);
                setCurrentPage(1);
              }}
              style={{
                padding: "5px 12px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: !viewYearly ? "var(--surface-0)" : "transparent",
                color: !viewYearly ? "var(--t-ink)" : "var(--t-muted)",
                boxShadow: !viewYearly ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              Monthly Breakdown
            </button>
            <button
              onClick={() => {
                setViewYearly(true);
                setCurrentPage(1);
              }}
              style={{
                padding: "5px 12px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                border: "none",
                cursor: "pointer",
                background: viewYearly ? "var(--surface-0)" : "transparent",
                color: viewYearly ? "var(--t-ink)" : "var(--t-muted)",
                boxShadow: viewYearly ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              Yearly Summary
            </button>
          </div>

          <button
            onClick={exportCSV}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              fontWeight: 800,
              padding: "6px 14px",
              borderRadius: 8,
              background: "color-mix(in srgb, var(--t-accent) 10%, transparent)",
              color: "var(--t-accent)",
              border: "1px solid color-mix(in srgb, var(--t-accent) 20%, transparent)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <Download size={13} /> Export CSV
          </button>
        </div>

        {/* Schedule Table */}
        <div
          style={{
            maxHeight: 280,
            overflowY: "auto",
            border: `1px solid var(--t-line)`,
            borderRadius: 12,
            background: "var(--surface-0)",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "var(--surface-1)", borderBottom: `1px solid var(--t-line)` }}>
                <th
                  style={{
                    padding: "8px 12px",
                    textAlign: "left",
                    color: "var(--t-muted)",
                    fontWeight: 700,
                    fontSize: 10,
                    textTransform: "uppercase",
                  }}
                >
                  {viewYearly ? "Year" : "Month"}
                </th>
                <th
                  style={{
                    padding: "8px 12px",
                    textAlign: "right",
                    color: "var(--t-muted)",
                    fontWeight: 700,
                    fontSize: 10,
                    textTransform: "uppercase",
                  }}
                >
                  Payment Amount
                </th>
                <th
                  style={{
                    padding: "8px 12px",
                    textAlign: "right",
                    color: "var(--t-muted)",
                    fontWeight: 700,
                    fontSize: 10,
                    textTransform: "uppercase",
                  }}
                >
                  Principal
                </th>
                <th
                  style={{
                    padding: "8px 12px",
                    textAlign: "right",
                    color: "var(--t-muted)",
                    fontWeight: 700,
                    fontSize: 10,
                    textTransform: "uppercase",
                  }}
                >
                  Interest
                </th>
                <th
                  style={{
                    padding: "8px 12px",
                    textAlign: "right",
                    color: "var(--t-muted)",
                    fontWeight: 700,
                    fontSize: 10,
                    textTransform: "uppercase",
                  }}
                >
                  Ending Balance
                </th>
              </tr>
            </thead>
            <tbody>
              {viewYearly
                ? yearlySchedule.map((row) => (
                    <tr key={row.year} style={{ borderBottom: `1px solid var(--t-line)` }}>
                      <td
                        style={{ padding: "8px 12px", fontWeight: 800, color: "var(--t-ink)" }}
                      >
                        Year {row.year}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "var(--t-ink)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Money value={row.emi} variant="exact" />
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "var(--t-sage)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Money value={row.principal} variant="exact" />
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "var(--t-rust)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Money value={row.interest} variant="exact" />
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          fontWeight: 800,
                          color: "var(--t-ink)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Money value={row.endingBalance} variant="exact" />
                      </td>
                    </tr>
                  ))
                : pagedItems.map((row) => (
                    <tr key={row.month} style={{ borderBottom: `1px solid var(--t-line)` }}>
                      <td
                        style={{ padding: "8px 12px", fontWeight: 800, color: "var(--t-ink)" }}
                      >
                        Month {row.month}
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "var(--t-ink)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Money value={row.emi} variant="exact" />
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "var(--t-sage)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Money value={row.principal} variant="exact" />
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          fontWeight: 700,
                          color: "var(--t-rust)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Money value={row.interest} variant="exact" />
                      </td>
                      <td
                        style={{
                          padding: "8px 12px",
                          textAlign: "right",
                          fontWeight: 800,
                          color: "var(--t-ink)",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Money value={row.balance} variant="exact" />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {/* Pagination if in monthly view */}
        {!viewYearly && totalPages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 11,
              color: "var(--t-muted)",
            }}
          >
            <span>
              Showing {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, activeAmortization.schedule.length)} of{" "}
              {activeAmortization.schedule.length} months
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: "3px 10px",
                  borderRadius: 6,
                  border: `1px solid var(--t-line)`,
                  background: "var(--surface-0)",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  opacity: currentPage === 1 ? 0.5 : 1,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--t-ink)",
                }}
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: "3px 10px",
                  borderRadius: 6,
                  border: `1px solid var(--t-line)`,
                  background: "var(--surface-0)",
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--t-ink)",
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
