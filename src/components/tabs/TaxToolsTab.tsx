import React, { useState, useMemo, useEffect } from "react";
import {
  Calculator,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Home,
  Printer,
  Download,
  Info,
  Receipt,
  Percent,
  Zap,
  Sparkles,
  Layers,
  TrendingUp,
  Clock,
  ArrowRight,
  FileCheck,
  Filter,
  Search,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Scale,
  Coins,
  HelpCircle,
  RefreshCw,
  SlidersHorizontal,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Building,
  DollarSign,
  PieChart,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
  AreaChart,
  Area,
  CartesianGrid,
} from "recharts";
import { THEME } from "../../utils/constants";
import { getCurrentFY, getCurrentFYStartYear } from "../../utils/appConstants";
import {
  fmtINR,
  fmtINRFull,
  fmtINRExact,
  today,
  calcTaxNewByFY,
  calcTaxOldByFY,
  getAutoDetectedDeductions,
  getEffectiveRent,
} from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { ConfirmDialog } from "../ui/Feedback";
import { Modal, ModalActions } from "../ui/Modal";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";

// Escapes user-controlled free-text before HTML interpolation
function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const buildFYList = (state: any): string[] => {
  const fySet = new Set<number>();
  const addDate = (d: string) => {
    if (!d) return;
    const dt = new Date(d + "T00:00:00");
    if (!isNaN(dt.getTime())) {
      fySet.add(dt.getMonth() >= 3 ? dt.getFullYear() : dt.getFullYear() - 1);
    }
  };
  (state.income || []).forEach((i: any) => addDate(i.date));
  (state.transactions || []).forEach((t: any) => addDate(t.date));
  (state.taxPayments || []).forEach((t: any) => {
    if (t.fy) {
      const y = Number(t.fy.split("-")[0]);
      if (y) fySet.add(y);
    }
  });
  const now = new Date();
  fySet.add(now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1);
  return Array.from(fySet)
    .sort((a, b) => b - a)
    .map((y) => `${y}-${String(y + 1).slice(-2)}`);
};

const FYSelector = ({
  fy,
  setFy,
  fyList,
}: {
  fy: string;
  setFy: (v: string) => void;
  fyList: string[];
}) => (
  <select
    className="form-input"
    value={fy}
    onChange={(e) => setFy(e.target.value)}
    aria-label="Select financial year"
    style={{
      padding: "7px 12px",
      fontSize: 13,
      fontWeight: 600,
      minWidth: 130,
      borderRadius: 8,
      borderColor: THEME.line,
    }}
  >
    {fyList.map((f) => (
      <option key={f} value={f}>
        FY {f}
      </option>
    ))}
  </select>
);

// ─────────────────────────────────────────────────────────────────────────────
// 1. ADVANCE TAX & SECTION 234B/C SHORTFALL SIMULATOR
// ─────────────────────────────────────────────────────────────────────────────

const ADVANCE_TAX_DEADLINES = [
  { label: "Q1 — 15 Jun", quarterName: "Q1 (Apr - Jun)", date: "06-15", cumPct: 15, monthsInterest: 3 },
  { label: "Q2 — 15 Sep", quarterName: "Q2 (Jul - Sep)", date: "09-15", cumPct: 45, monthsInterest: 3 },
  { label: "Q3 — 15 Dec", quarterName: "Q3 (Oct - Dec)", date: "12-15", cumPct: 75, monthsInterest: 3 },
  { label: "Q4 — 15 Mar", quarterName: "Q4 (Jan - Mar)", date: "03-15", cumPct: 100, monthsInterest: 1 },
];

interface AdvanceTaxSectionProps {
  state: any;
  metrics: any;
  addItem?: any;
  showToast?: (msg: string, type?: string) => void;
}

const AdvanceTaxSection: React.FC<AdvanceTaxSectionProps> = ({ state, metrics, addItem, showToast }) => {
  const fyList = useMemo(
    () => buildFYList(state),
    [state.income, state.transactions, state.taxPayments]
  );
  const [fy, setFy] = useState(state.profile?.fy || fyList[0] || getCurrentFY());
  const regime = state.profile?.regime || "new";
  const fyStart = parseInt(fy.split("-")[0]);

  const projectedIncome = useMemo(() => {
    const annualIncome = metrics.annualIncome || 0;
    if (annualIncome > 0) return annualIncome;
    return (metrics.monthIncome || 0) * 12;
  }, [metrics]);

  const [manualIncome, setManualIncome] = useState("");
  const income = manualIncome ? Number(manualIncome) : projectedIncome;

  const taxLiability = useMemo(() => {
    if (!income) return 0;
    if (regime === "new") {
      return calcTaxNewByFY(income, fy).total;
    }
    const auto = getAutoDetectedDeductions(state, fy);
    const overrides = state.masterData?.taxDeductions?.[fy] || {};
    const d80C = overrides.d80C !== undefined ? overrides.d80C : auto.d80C;
    const d80D = overrides.d80D !== undefined ? overrides.d80D : auto.d80D;
    const hra = overrides.hra !== undefined ? overrides.hra : auto.hra;
    const homeLoan = overrides.homeLoan !== undefined ? overrides.homeLoan : auto.homeLoan;
    const nps = overrides.nps !== undefined ? overrides.nps : auto.nps;
    const d80CCD2 = overrides.d80CCD2 !== undefined ? overrides.d80CCD2 : auto.d80CCD2;
    const d80G = overrides.d80G !== undefined ? overrides.d80G : 0;
    const d80E = overrides.d80E !== undefined ? overrides.d80E : 0;
    const d80TTA = overrides.d80TTA !== undefined ? overrides.d80TTA : 0;
    const stdDedOld = fyStart >= 2020 ? 50000 : 40000;
    const totalOldDeductions =
      stdDedOld +
      Math.min(d80C, 150000) +
      Math.min(d80D, 100000) +
      hra +
      Math.min(homeLoan, 200000) +
      Math.min(nps, 50000) +
      (d80CCD2 || 0) +
      (d80G || 0) +
      (d80E || 0) +
      Math.min(d80TTA || 0, 10000);
    return calcTaxOldByFY(income, totalOldDeductions, fy).total;
  }, [income, regime, fy, fyStart, state]);

  const tdsPaid = useMemo(() => {
    return (state.taxPayments || [])
      .filter((t: any) => t.fy === fy && (t.taxType === "TDS" || t.type === "TDS"))
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  }, [state.taxPayments, fy]);

  const advanceTaxPaid = useMemo(() => {
    return (state.taxPayments || [])
      .filter((t: any) => t.fy === fy && (t.taxType === "Advance Tax" || t.type === "Advance Tax" || t.taxType === "Advance" || t.type === "Advance"))
      .reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  }, [state.taxPayments, fy]);

  const isSec208Exempt = taxLiability - tdsPaid < 10000;
  const netTaxDue = Math.max(0, taxLiability - tdsPaid);
  const totalPaid = advanceTaxPaid;
  const remaining = Math.max(0, netTaxDue - totalPaid);

  const animatedRemaining = useAnimatedNumber(remaining);
  const animatedTaxLiability = useAnimatedNumber(taxLiability);
  const animatedTdsPaid = useAnimatedNumber(tdsPaid);
  const animatedNetTaxDue = useAnimatedNumber(netTaxDue);
  const animatedTotalPaid = useAnimatedNumber(totalPaid);

  const todayStr = today();
  const nowDate = new Date(todayStr + "T00:00:00");

  // Section 234C & 234B calculations
  const { schedule, total234CInterest, is234BApplicable, est234BInterest } = useMemo(() => {
    let sum234C = 0;
    const rows = ADVANCE_TAX_DEADLINES.map((q, idx) => {
      const qRequiredCum = (netTaxDue * q.cumPct) / 100;
      const prevCum = idx > 0 ? (netTaxDue * ADVANCE_TAX_DEADLINES[idx - 1].cumPct) / 100 : 0;
      const installment = qRequiredCum - prevCum;
      const deadlineYear = q.date.startsWith("03") ? fyStart + 1 : fyStart;
      const deadlineFull = `${deadlineYear}-${q.date}`;
      const deadlineDate = new Date(deadlineFull + "T00:00:00");
      const daysLeft = Math.ceil((deadlineDate.getTime() - nowDate.getTime()) / 86400000);
      const isPast = daysLeft < 0;

      // Section 234C Shortfall: Check if advance tax paid up to this date was less than requirement
      // Minimum safe thresholds: Q1: 12% (instead of 15%), Q2: 36% (instead of 45%), Q3: 75%, Q4: 100%
      const safeThresholdPct = idx === 0 ? 12 : idx === 1 ? 36 : q.cumPct;
      const safeThresholdAmt = (netTaxDue * safeThresholdPct) / 100;
      const shortfall = isPast && netTaxDue >= 10000 ? Math.max(0, qRequiredCum - totalPaid) : 0;
      const interest234C = shortfall > 0 ? Math.round(shortfall * 0.01 * q.monthsInterest) : 0;
      sum234C += interest234C;

      return {
        ...q,
        idx,
        installment,
        qRequiredCum,
        deadlineFull,
        daysLeft,
        isPast,
        shortfall,
        interest234C,
      };
    });

    const currentIdx = rows.findIndex((r) => !r.isPast);
    const mappedRows = rows.map((r) => ({ ...r, isCurrent: r.idx === currentIdx }));

    // Section 234B: 1% per month from April of Assessment Year if paid < 90% of assessed tax
    const is234B = netTaxDue >= 10000 && totalPaid < netTaxDue * 0.9 && nowDate > new Date(fyStart + 1, 2, 31);
    const shortfall234B = Math.max(0, netTaxDue - totalPaid);
    // Rough estimate: months elapsed since 1st April of AY
    const ayStart = new Date(fyStart + 1, 3, 1);
    const ayMonths = Math.max(1, Math.ceil((nowDate.getTime() - ayStart.getTime()) / (30 * 86400000)));
    const est234B = is234B ? Math.round(shortfall234B * 0.01 * ayMonths) : 0;

    return {
      schedule: mappedRows,
      total234CInterest: sum234C,
      is234BApplicable: is234B,
      est234BInterest: est234B,
    };
  }, [netTaxDue, fyStart, nowDate, totalPaid]);

  // Record Payment Modal State
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedQuarterForPayment, setSelectedQuarterForPayment] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayStr);
  const [paymentChallan, setPaymentChallan] = useState("");
  const [paymentBank, setPaymentBank] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  const openPaymentModal = (q: any) => {
    setSelectedQuarterForPayment(q);
    setPaymentAmount(String(Math.round(q.installment || remaining)));
    setPaymentDate(todayStr);
    setRecordModalOpen(true);
  };

  const handleSavePayment = async () => {
    if (!addItem || !paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) return;
    setSavingPayment(true);
    try {
      await addItem("taxPayments", {
        fy,
        taxType: "Advance Tax",
        amount: Number(paymentAmount),
        date: paymentDate,
        challan: paymentChallan || null,
        bank: paymentBank || null,
        notes: selectedQuarterForPayment ? `Advance Tax ${selectedQuarterForPayment.label}` : "Advance Tax",
      });
      showToast?.("Advance tax payment successfully recorded!", "success");
      setRecordModalOpen(false);
    } catch (e: any) {
      showToast?.(`Failed to record tax payment: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSavingPayment(false);
    }
  };

  const exportScheduleCSV = () => {
    const rows = ["Quarter,Due Date,Cumulative %,Installment Due,Cumulative Required,Status,Est 234C Interest"];
    schedule.forEach((q) => {
      const status = q.isPast ? "Past" : q.isCurrent ? "Current" : "Upcoming";
      rows.push(
        [
          q.label.replace(",", " "),
          q.deadlineFull,
          `${q.cumPct}%`,
          q.installment.toFixed(2),
          q.qRequiredCum.toFixed(2),
          status,
          q.interest234C ? `₹${q.interest234C}` : "₹0",
        ].join(",")
      );
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `advance-tax-schedule-FY${fy}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 800,
              fontSize: 18,
              color: THEME.ink,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Calculator size={20} style={{ color: THEME.accent }} />
            Advance Tax & Section 234B/C Simulator
          </div>
          <div style={{ fontSize: 13, color: THEME.muted, marginTop: 2 }}>
            Section 208 statutory compliance & shortfall penalty forecasting for FY {fy}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Badge variant={regime === "new" ? "accent" : "sage"}>
            {regime === "new" ? "New Regime" : "Old Regime"}
          </Badge>
          <FYSelector fy={fy} setFy={setFy} fyList={fyList} />
        </div>
      </div>

      {/* Income Configuration & Status Banner */}
      <Card>
        <div style={{ padding: 20 }}>
          <div className="form-grid-2" style={{ alignItems: "center", gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Auto-Projected Gross Income
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: THEME.ink, marginTop: 4 }}>
                <Money value={projectedIncome} variant="full" />
              </div>
              <div style={{ fontSize: 12, color: THEME.muted, marginTop: 4 }}>
                Derived from annual salary and recurring cashflows
              </div>
            </div>
            <div>
              <label style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, display: "block", marginBottom: 6 }}>
                Override Taxable Income (Optional)
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="number"
                  placeholder="Enter total estimated taxable income"
                  value={manualIncome}
                  onChange={(e) => setManualIncome(e.target.value)}
                  className="form-input"
                  style={{ padding: "8px 12px", fontSize: 14, flex: 1 }}
                />
                {manualIncome && (
                  <Button variant="secondary" size="sm" onClick={() => setManualIncome("")}>
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Section 208 Exemption Notice */}
      {isSec208Exempt && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 12,
            background: `color-mix(in srgb, ${THEME.sage} 10%, transparent)`,
            border: `1.5px solid color-mix(in srgb, ${THEME.sage} 25%, transparent)`,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <CheckCircle2 size={18} style={{ color: THEME.sage, flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: THEME.ink }}>
            <strong>Section 208 Exemption:</strong> Your net estimated tax liability after TDS is below ₹10,000 (
            <Money value={netTaxDue} variant="full" />). Advance tax is <strong>not mandatory</strong> for you for FY {fy}.
          </div>
        </div>
      )}

      {/* Headline Metric Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
        }}
      >
        <Card
          style={{
            borderTop: `3px solid ${remaining > 0 ? THEME.rust : THEME.sage}`,
            background: `color-mix(in srgb, ${remaining > 0 ? THEME.rust : THEME.sage} 4%, transparent)`,
          }}
        >
          <div style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Remaining to Pay
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 26,
                fontWeight: 800,
                color: remaining > 0 ? THEME.rust : THEME.sage,
                marginTop: 4,
              }}
            >
              <Money value={animatedRemaining} variant="full" />
            </div>
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
              {remaining > 0 ? "Pending advance tax installments" : "Advance tax fully covered!"}
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
              Gross Tax Liability
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: THEME.accent, marginTop: 4 }}>
              <Money value={animatedTaxLiability} variant="full" />
            </div>
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
              Pre-TDS / Pre-prepaid tax
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
              TDS / TCS Credit
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: THEME.sage, marginTop: 4 }}>
              <Money value={animatedTdsPaid} variant="full" />
            </div>
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
              Withheld at source by deductors
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: "16px 18px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
              Advance Tax Paid
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: THEME.accent, marginTop: 4 }}>
              <Money value={animatedTotalPaid} variant="full" />
            </div>
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
              Challan 280 payments recorded
            </div>
          </div>
        </Card>
      </div>

      {/* Quarterly Installment Breakdown */}
      <Card>
        <div style={{ padding: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: THEME.ink }}>
                Quarterly Statutory Payment Schedule
              </div>
              <div style={{ fontSize: 12, color: THEME.muted }}>
                Section 211 statutory advance tax installment milestones
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button onClick={exportScheduleCSV} variant="secondary" size="sm">
                <Download size={14} style={{ marginRight: 4 }} /> Export Schedule
              </Button>
              {addItem && (
                <Button size="sm" onClick={() => openPaymentModal(schedule.find((q) => q.isCurrent) || schedule[0])}>
                  <Plus size={14} style={{ marginRight: 4 }} /> Record Payment
                </Button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {schedule.map((q) => {
              const { idx, installment, daysLeft, isPast, isCurrent, qRequiredCum, interest234C } = q;
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: isCurrent
                      ? `color-mix(in srgb, ${THEME.accent} 8%, transparent)`
                      : isPast
                        ? `color-mix(in srgb, ${THEME.sage} 5%, transparent)`
                        : "transparent",
                    border: `1.5px solid ${isCurrent ? THEME.accent : THEME.line}`,
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: isPast
                        ? `color-mix(in srgb, ${THEME.sage} 15%, transparent)`
                        : isCurrent
                          ? `color-mix(in srgb, ${THEME.accent} 15%, transparent)`
                          : `color-mix(in srgb, ${THEME.line} 40%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isPast ? (
                      <CheckCircle2 size={18} style={{ color: THEME.sage }} />
                    ) : (
                      <Calendar size={18} style={{ color: isCurrent ? THEME.accent : THEME.muted }} />
                    )}
                  </div>

                  <div style={{ flex: "1 1 200px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: THEME.ink }}>{q.label}</div>
                      {isCurrent && <Badge variant="accent">Current Milestone</Badge>}
                      {isPast && <Badge variant="sage">Past Deadline</Badge>}
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                      {q.cumPct}% cumulative requirement (<Money value={qRequiredCum} variant="full" />)
                    </div>
                  </div>

                  <div style={{ textAlign: "right", minWidth: 120 }}>
                    <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Installment Due</div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: THEME.ink }}>
                      <Money value={installment} variant="full" />
                    </div>
                    {isCurrent && daysLeft > 0 && (
                      <div style={{ fontSize: 11, color: THEME.gold, fontWeight: 700 }}>{daysLeft} days remaining</div>
                    )}
                    {isCurrent && daysLeft <= 0 && (
                      <div style={{ fontSize: 11, color: THEME.rust, fontWeight: 700 }}>Due Today / Overdue</div>
                    )}
                  </div>

                  {addItem && (
                    <Button
                      variant={isCurrent ? "primary" : "secondary"}
                      size="sm"
                      onClick={() => openPaymentModal(q)}
                      style={{ flexShrink: 0 }}
                    >
                      Pay / Log
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Section 234C / 234B Penalty Radar Card */}
          {total234CInterest > 0 && (
            <div
              style={{
                marginTop: 16,
                padding: "14px 18px",
                borderRadius: 12,
                background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
                border: `1.5px solid color-mix(in srgb, ${THEME.rust} 25%, transparent)`,
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <AlertTriangle size={20} style={{ color: THEME.rust, flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: THEME.rust }}>
                  Statutory Interest Warning: Section 234C Shortfall Detected
                </div>
                <div style={{ fontSize: 13, color: THEME.ink, marginTop: 3 }}>
                  Estimated Section 234C interest liability: <strong><Money value={total234CInterest} variant="full" /></strong>.
                  Interest is charged @ 1% per month for statutory deferment periods (3 months for Q1/Q2/Q3, 1 month for Q4).
                  {is234BApplicable && (
                    <span> Additionally, Section 234B interest of approx. <strong><Money value={est234BInterest} variant="full" /></strong> applies if paid advance tax is &lt; 90% of assessed tax.</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Record Advance Tax Modal */}
      {recordModalOpen && (
        <Modal
          title={`Record Advance Tax Payment — FY ${fy}`}
          onClose={() => setRecordModalOpen(false)}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, display: "block", marginBottom: 4 }}>
                Payment Amount (₹)
              </label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Enter amount paid"
                className="form-input"
                style={{ fontSize: 14, padding: "8px 12px" }}
              />
            </div>

            <div className="form-grid-2">
              <div>
                <label style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, display: "block", marginBottom: 4 }}>
                  Date of Payment
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="form-input"
                  style={{ fontSize: 13, padding: "8px 10px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, display: "block", marginBottom: 4 }}>
                  Challan / BSR / CIN No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. ITNS 280 / BSR 021004"
                  value={paymentChallan}
                  onChange={(e) => setPaymentChallan(e.target.value)}
                  className="form-input"
                  style={{ fontSize: 13, padding: "8px 10px" }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, display: "block", marginBottom: 4 }}>
                Bank & Branch (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC Bank, Fort Branch"
                value={paymentBank}
                onChange={(e) => setPaymentBank(e.target.value)}
                className="form-input"
                style={{ fontSize: 13, padding: "8px 10px" }}
              />
            </div>

            <ModalActions>
              <Button variant="secondary" onClick={() => setRecordModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePayment} disabled={savingPayment}>
                {savingPayment ? "Saving..." : "Save Payment Record"}
              </Button>
            </ModalActions>
          </div>
        </Modal>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. HRA EXEMPTION OPTIMIZER & RENT RECEIPT GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

interface HraReceiptSectionProps {
  state: any;
}

const HraReceiptSection: React.FC<HraReceiptSectionProps> = ({ state }) => {
  const { privacyMode } = usePrivacy();
  const [selectedProperty, setSelectedProperty] = useState("");
  const [months, setMonths] = useState<string[]>([]);
  const [landlordName, setLandlordName] = useState("");
  const [landlordPan, setLandlordPan] = useState("");
  const [landlordAddress, setLandlordAddress] = useState("");
  const [tenantName, setTenantName] = useState(state.profile?.name || "");
  const [showPreview, setShowPreview] = useState(false);
  const [showForm60Modal, setShowForm60Modal] = useState(false);

  // HRA Exemption Calculator Fields (Section 10(13A) Rule 2A)
  const [basicSalary, setBasicSalary] = useState("1200000");
  const [hraReceived, setHraReceived] = useState("480000");
  const [isMetro, setIsMetro] = useState(true);

  const fyList = useMemo(
    () => buildFYList(state),
    [state.income, state.transactions, state.taxPayments]
  );
  const [fy, setFy] = useState(state.profile?.fy || fyList[0] || getCurrentFY());
  const fyStart = parseInt(fy.split("-")[0]);

  const rentedProps = state.rentedProperties || [];

  const fyMonths = useMemo(() => {
    const result = [];
    for (let m = 3; m < 15; m++) {
      const year = m < 12 ? fyStart : fyStart + 1;
      const month = m % 12;
      result.push({
        key: `${year}-${String(month + 1).padStart(2, "0")}`,
        label: `${MONTH_NAMES[month]} ${year}`,
      });
    }
    return result;
  }, [fyStart]);

  const selectedProp = rentedProps.find((p: any) => p.id === selectedProperty);

  const toggleMonth = (key: string) => {
    setMonths((prev: string[]) =>
      prev.includes(key) ? prev.filter((m) => m !== key) : [...prev, key].sort()
    );
  };

  const selectAllMonths = () => {
    if (months.length === fyMonths.length) setMonths([]);
    else setMonths(fyMonths.map((m) => m.key));
  };

  const getReceiptData = () => {
    return months.sort().map((m, idx) => {
      const rent = selectedProp ? getEffectiveRent(selectedProp, m) : 0;
      const [y, mo] = m.split("-");
      const monthName = MONTH_NAMES[parseInt(mo) - 1];
      return {
        receiptNo: idx + 1,
        month: `${monthName} ${y}`,
        monthKey: m,
        amount: rent,
        date: `${new Date(parseInt(y), parseInt(mo), 0).getDate()} ${monthName} ${y}`,
      };
    });
  };

  const totalRentPaid = useMemo(() => {
    return getReceiptData().reduce((s: number, r: any) => s + r.amount, 0);
  }, [months, selectedProp]);

  // Section 10(13A) 3-way Rule 2A Exemption Calculation
  const hraExemption = useMemo(() => {
    const basic = Number(basicSalary) || 0;
    const hraRec = Number(hraReceived) || 0;
    const rent = totalRentPaid > 0 ? totalRentPaid : (selectedProp ? getEffectiveRent(selectedProp) * 12 : 0);

    const condition1 = hraRec;
    const condition2 = Math.max(0, rent - 0.1 * basic);
    const condition3 = isMetro ? 0.5 * basic : 0.4 * basic;

    const exemptAmt = Math.min(condition1, condition2, condition3);
    const taxableHra = Math.max(0, condition1 - exemptAmt);
    const taxSavedEst = exemptAmt * 0.312; // Approx 30% slab + 4% cess

    return {
      condition1,
      condition2,
      condition3,
      exemptAmt,
      taxableHra,
      taxSavedEst,
      rentConsidered: rent,
    };
  }, [basicSalary, hraReceived, totalRentPaid, selectedProp, isMetro]);

  const isPanMandatory = totalRentPaid > 100000 || (selectedProp && getEffectiveRent(selectedProp) * 12 > 100000);

  const printReceipts = () => {
    const receipts = getReceiptData();
    const totalRent = receipts.reduce((s: number, r: any) => s + r.amount, 0);
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>Rent Receipts — FY ${fy}</title>
      <style>
        body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 24px; color: #111827; background: #fff; }
        .receipt { border: 2px solid #1f2937; padding: 28px; margin-bottom: 28px; page-break-inside: avoid; border-radius: 8px; position: relative; }
        .receipt-header { text-align: center; font-size: 20px; font-weight: 800; letter-spacing: 1px; margin-bottom: 20px; border-bottom: 2px solid #1f2937; padding-bottom: 10px; }
        .receipt-row { display: flex; justify-content: space-between; margin: 10px 0; font-size: 14px; }
        .receipt-row label { font-weight: 700; color: #4b5563; }
        .amount-box { font-size: 22px; font-weight: 800; text-align: center; margin: 18px 0; padding: 14px; background: #f3f4f6; border-radius: 6px; border: 1px dashed #9ca3af; }
        .stamp-box { border: 1px dashed #6b7280; width: 85px; height: 95px; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 10px; font-weight: 700; color: #6b7280; margin: 0 auto; text-transform: uppercase; }
        .signature { margin-top: 36px; display: flex; justify-content: space-between; align-items: flex-end; }
        .signature div { text-align: center; }
        .signature .line { border-top: 1.5px solid #1f2937; width: 190px; margin-top: 45px; padding-top: 6px; font-size: 12px; font-weight: 700; }
        .summary { margin-top: 24px; padding: 20px; background: #f9fafb; border: 2px solid #374151; border-radius: 8px; }
        @media print { .no-print { display: none; } .receipt { page-break-after: always; } }
      </style></head>
      <body>
        <div class="no-print" style="text-align:center;margin-bottom:24px;">
          <button onclick="window.print()" style="padding:12px 36px;font-size:16px;font-weight:700;cursor:pointer;background:#0f172a;color:#fff;border:none;border-radius:8px;">Print All Receipts / Save as PDF</button>
        </div>
        ${receipts
          .map(
            (r) => `
          <div class="receipt">
            <div class="receipt-header">HOUSE RENT RECEIPT</div>
            <div class="receipt-row"><label>Receipt No:</label><span>#${r.receiptNo}</span></div>
            <div class="receipt-row"><label>Date of Payment:</label><span>${r.date}</span></div>
            <div class="receipt-row"><label>Rental Period:</label><span>For the month of ${r.month}</span></div>
            <div class="receipt-row"><label>Received from (Tenant):</label><span><strong>${escapeHtml(tenantName)}</strong></span></div>
            <div class="amount-box">Amount Paid: ${fmtINRFull(r.amount)}</div>
            <div class="receipt-row"><label>Rental Property Address:</label><span>${escapeHtml(selectedProp?.address || selectedProp?.name || "—")}</span></div>
            <div class="receipt-row"><label>Landlord Name:</label><span>${escapeHtml(landlordName)}</span></div>
            ${landlordPan ? `<div class="receipt-row"><label>Landlord PAN:</label><span><strong>${escapeHtml(landlordPan)}</strong></span></div>` : ""}
            ${landlordAddress ? `<div class="receipt-row"><label>Landlord Address:</label><span>${escapeHtml(landlordAddress)}</span></div>` : ""}
            <div class="signature">
              <div><div class="line">Tenant Signature</div></div>
              <div><div class="stamp-box">Affix ₹1<br>Revenue<br>Stamp</div></div>
              <div><div class="line">Landlord Signature</div></div>
            </div>
          </div>
        `
          )
          .join("")}
        <div class="summary">
          <div class="receipt-header" style="border-bottom: 2px solid #374151;">ANNUAL HRA RENT SUMMARY — FY ${fy}</div>
          <div class="receipt-row"><label>Total Receipts Generated:</label><span>${receipts.length} Months</span></div>
          <div class="receipt-row"><label>Total Rent Paid:</label><span><strong>${fmtINRFull(totalRent)}</strong></span></div>
          <div class="receipt-row"><label>Tenant Full Name:</label><span>${escapeHtml(tenantName)}</span></div>
          <div class="receipt-row"><label>Landlord Full Name:</label><span>${escapeHtml(landlordName)}</span></div>
          ${landlordPan ? `<div class="receipt-row"><label>Landlord PAN (Sec 10(13A)):</label><span><strong>${escapeHtml(landlordPan)}</strong></span></div>` : `<div class="receipt-row"><label>Landlord PAN:</label><span style="color:#b91c1c;">Form 60 Declaration Attached (No PAN)</span></div>`}
        </div>
      </body></html>
    `;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 800,
              fontSize: 18,
              color: THEME.ink,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Home size={20} style={{ color: THEME.accent }} />
            HRA Exemption Optimizer & Rent Receipts
          </div>
          <div style={{ fontSize: 13, color: THEME.muted, marginTop: 2 }}>
            Section 10(13A) Rule 2A exemption engine and compliant PDF rent receipts for FY {fy}
          </div>
        </div>
        <FYSelector fy={fy} setFy={setFy} fyList={fyList} />
      </div>

      {/* Section 10(13A) Exemption Lab */}
      <Card>
        <div style={{ padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: THEME.ink, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <Scale size={16} color={THEME.accent} /> Section 10(13A) Rule 2A Exemption Calculator
          </div>

          <div className="form-grid-3" style={{ marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, display: "block", marginBottom: 4 }}>
                Annual Basic Salary + DA (₹)
              </label>
              <input
                type="number"
                value={basicSalary}
                onChange={(e) => setBasicSalary(e.target.value)}
                className="form-input"
                style={{ padding: "8px 12px", fontSize: 14 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, display: "block", marginBottom: 4 }}>
                Annual HRA Received (₹)
              </label>
              <input
                type="number"
                value={hraReceived}
                onChange={(e) => setHraReceived(e.target.value)}
                className="form-input"
                style={{ padding: "8px 12px", fontSize: 14 }}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, display: "block", marginBottom: 4 }}>
                City Classification
              </label>
              <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
                <button
                  type="button"
                  onClick={() => setIsMetro(true)}
                  className={`demat-portfolio-pill ${isMetro ? "active" : ""}`}
                  style={{ flex: 1, justifyContent: "center", padding: "8px 10px", fontSize: 12 }}
                >
                  Metro (50%)
                </button>
                <button
                  type="button"
                  onClick={() => setIsMetro(false)}
                  className={`demat-portfolio-pill ${!isMetro ? "active" : ""}`}
                  style={{ flex: 1, justifyContent: "center", padding: "8px 10px", fontSize: 12 }}
                >
                  Non-Metro (40%)
                </button>
              </div>
            </div>
          </div>

          {/* 3-Condition Breakdown */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
              padding: 16,
              borderRadius: 12,
              background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
              border: `1px solid ${THEME.line}`,
            }}
          >
            <div style={{ padding: 10, borderRadius: 8, background: "var(--t-card-bg)" }}>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>1. Actual HRA Received</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, marginTop: 4 }}>
                <Money value={hraExemption.condition1} variant="full" />
              </div>
            </div>

            <div style={{ padding: 10, borderRadius: 8, background: "var(--t-card-bg)" }}>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>2. Rent Paid − 10% Basic</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, marginTop: 4 }}>
                <Money value={hraExemption.condition2} variant="full" />
              </div>
            </div>

            <div style={{ padding: 10, borderRadius: 8, background: "var(--t-card-bg)" }}>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>
                3. {isMetro ? "50%" : "40%"} of Basic Salary
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, marginTop: 4 }}>
                <Money value={hraExemption.condition3} variant="full" />
              </div>
            </div>

            <div style={{ padding: 10, borderRadius: 8, background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`, border: `1.5px solid ${THEME.sage}` }}>
              <div style={{ fontSize: 11, color: THEME.sage, fontWeight: 800 }}>Tax-Exempt HRA (Least of 3)</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: THEME.sage, marginTop: 4 }}>
                <Money value={hraExemption.exemptAmt} variant="full" />
              </div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                Est. Tax Savings: ~<Money value={hraExemption.taxSavedEst} variant="full" />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Property & Landlord Setup */}
      {rentedProps.length === 0 ? (
        <EmptyState
          icon={Home}
          title="No Rented Properties Found"
          description="Add a rented property in the Rental Details tab to start generating HRA rent receipts."
        />
      ) : (
        <>
          <Card>
            <div style={{ padding: 20 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: THEME.ink, marginBottom: 14 }}>
                Tenant & Landlord Information
              </div>

              <div className="form-grid-2" style={{ marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, display: "block", marginBottom: 4 }}>
                    Select Rental Property
                  </label>
                  <select
                    value={selectedProperty}
                    onChange={(e) => setSelectedProperty(e.target.value)}
                    aria-label="Select property"
                    className="form-input"
                    style={{ padding: "8px 12px", fontSize: 14 }}
                  >
                    <option value="">— Select Property —</option>
                    {rentedProps.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name || p.address || "Property"} — {privacyMode ? "••••" : fmtINRFull(getEffectiveRent(p))}/month
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, display: "block", marginBottom: 4 }}>
                    Tenant Full Name (Your Name)
                  </label>
                  <input
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder="Tenant full name as per PAN"
                    className="form-input"
                    style={{ padding: "8px 12px", fontSize: 14 }}
                  />
                </div>
              </div>

              <div className="form-grid-3">
                <div>
                  <label style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, display: "block", marginBottom: 4 }}>
                    Landlord Full Name
                  </label>
                  <input
                    value={landlordName}
                    onChange={(e) => setLandlordName(e.target.value)}
                    placeholder="Full legal name"
                    className="form-input"
                    style={{ padding: "8px 12px", fontSize: 14 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, display: "block", marginBottom: 4 }}>
                    Landlord PAN {isPanMandatory && <span style={{ color: THEME.rust }}>* (Mandatory &gt; ₹1L)</span>}
                  </label>
                  <input
                    value={landlordPan}
                    onChange={(e) => setLandlordPan(e.target.value.toUpperCase())}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    className="form-input"
                    style={{ padding: "8px 12px", fontSize: 14, textTransform: "uppercase" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, display: "block", marginBottom: 4 }}>
                    Landlord Postal Address
                  </label>
                  <input
                    value={landlordAddress}
                    onChange={(e) => setLandlordAddress(e.target.value)}
                    placeholder="Residential address"
                    className="form-input"
                    style={{ padding: "8px 12px", fontSize: 14 }}
                  />
                </div>
              </div>

              {isPanMandatory && !landlordPan && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: `color-mix(in srgb, ${THEME.gold} 10%, transparent)`,
                    border: `1.5px solid color-mix(in srgb, ${THEME.gold} 30%, transparent)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: THEME.ink }}>
                    <AlertTriangle size={15} style={{ color: THEME.gold, flexShrink: 0 }} />
                    <span>Annual rent exceeds ₹1,00,000. Landlord PAN is required by CBDT or a Form 60 declaration must be obtained.</span>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setShowForm60Modal(true)}>
                    Generate Form 60 Template
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Month Multi-Selector */}
          <Card>
            <div style={{ padding: 20 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: THEME.ink }}>Select Rental Months</div>
                  <div style={{ fontSize: 12, color: THEME.muted }}>Click individual months to toggle or generate the full annual batch</div>
                </div>
                <Button variant="secondary" size="sm" onClick={selectAllMonths}>
                  {months.length === fyMonths.length ? "Deselect All" : "Select All 12 Months"}
                </Button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
                  gap: 8,
                }}
              >
                {fyMonths.map((m) => {
                  const isSelected = months.includes(m.key);
                  const rent = selectedProp ? getEffectiveRent(selectedProp, m.key) : 0;
                  return (
                    <button
                      key={m.key}
                      onClick={() => toggleMonth(m.key)}
                      aria-pressed={isSelected}
                      className={isSelected ? "" : "table-row-hover"}
                      style={{
                        padding: "10px 6px",
                        borderRadius: 8,
                        border: `1.5px solid ${isSelected ? THEME.accent : THEME.line}`,
                        background: isSelected
                          ? `color-mix(in srgb, ${THEME.accent} 10%, transparent)`
                          : "transparent",
                        color: isSelected ? THEME.accent : THEME.ink,
                        cursor: "pointer",
                        textAlign: "center",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{m.label}</div>
                      {rent > 0 && (
                        <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                          <Money value={rent} variant="full" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {months.length > 0 && (
                <div
                  style={{
                    marginTop: 18,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                    paddingTop: 14,
                    borderTop: `1px solid ${THEME.line}`,
                  }}
                >
                  <div style={{ fontSize: 14, color: THEME.ink }}>
                    <strong>{months.length}</strong> months selected • Total Rent:{" "}
                    <strong><Money value={totalRentPaid} variant="full" /></strong>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <Button
                      onClick={() => setShowPreview(!showPreview)}
                      variant="secondary"
                      size="sm"
                    >
                      {showPreview ? "Hide Preview" : "View Preview Cards"}
                    </Button>
                    <Button onClick={printReceipts} size="sm">
                      <Printer size={14} style={{ marginRight: 6 }} /> Print / Save PDF Batch
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Interactive Preview */}
          {showPreview && months.length > 0 && (
            <Card>
              <div style={{ padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14, color: THEME.ink }}>
                  Receipt Preview ({months.length} Generated)
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 12,
                  }}
                >
                  {getReceiptData().map((r) => (
                    <div
                      key={r.monthKey}
                      style={{
                        padding: 16,
                        borderRadius: 12,
                        border: `1.5px solid ${THEME.line}`,
                        background: `color-mix(in srgb, ${THEME.accent} 3%, transparent)`,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 13, color: THEME.ink }}>
                          Receipt #{r.receiptNo}
                        </span>
                        <Badge variant="muted">{r.month}</Badge>
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 4 }}>
                        Tenant: <strong>{tenantName || "—"}</strong>
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 6 }}>
                        Landlord: <strong>{landlordName || "—"}</strong>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 800, color: THEME.accent }}>
                        <Money value={r.amount} variant="full" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* Form 60 Template Modal */}
          {showForm60Modal && (
            <Modal title="Form 60 Declaration (No Landlord PAN)" onClose={() => setShowForm60Modal(false)}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 13, color: THEME.ink }}>
                <p>
                  Under Rule 114B of Income Tax Rules, if the landlord does not possess a PAN, a signed <strong>Form 60 declaration</strong> must be obtained to substantiate HRA claims exceeding ₹1,00,000 per financial year.
                </p>
                <div
                  style={{
                    padding: 14,
                    background: `color-mix(in srgb, ${THEME.muted} 5%, transparent)`,
                    borderRadius: 8,
                    border: `1px solid ${THEME.line}`,
                    fontFamily: "monospace",
                    fontSize: 12,
                  }}
                >
                  <div>I, <strong>{landlordName || "[Landlord Name]"}</strong>, residing at <strong>{landlordAddress || "[Landlord Address]"}</strong>, do hereby declare that I do not possess a Permanent Account Number (PAN) and my total taxable income during the Financial Year {fy} does not exceed the maximum amount not chargeable to tax.</div>
                  <div style={{ marginTop: 12 }}>Date: {todayStr}</div>
                  <div>Signature of Declarant / Landlord: ____________________</div>
                </div>
                <ModalActions>
                  <Button variant="secondary" onClick={() => setShowForm60Modal(false)}>
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      const text = `FORM 60 DECLARATION\n\nI, ${landlordName || "[Landlord Name]"}, residing at ${landlordAddress || "[Landlord Address]"}, do hereby declare that I do not possess a Permanent Account Number (PAN) and my total taxable income during the Financial Year ${fy} does not exceed the maximum amount not chargeable to tax.\n\nDate: ${todayStr}\nSignature of Landlord: ____________________`;
                      navigator.clipboard.writeText(text);
                      alert("Form 60 template copied to clipboard!");
                    }}
                  >
                    <Copy size={14} style={{ marginRight: 6 }} /> Copy Template
                  </Button>
                </ModalActions>
              </div>
            </Modal>
          )}
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. FORM 26AS & AIS SMART RECONCILER WITH TRACES PARSER
// ─────────────────────────────────────────────────────────────────────────────

interface Form26ASSectionProps {
  state: any;
  addItem: any;
  removeItem: any;
  showToast?: (msg: string, type?: string) => void;
}

const Form26ASSection: React.FC<Form26ASSectionProps> = ({ state, addItem, removeItem, showToast }) => {
  const entries = state.form26as || [];
  const [showAdd, setShowAdd] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<{ id: string; deductor: string } | null>(null);
  const [newEntry, setNewEntry] = useState({
    deductor: "",
    tan: "",
    amount: "",
    dateOfPayment: "",
    section: "192",
  });
  const fyList = useMemo(
    () => buildFYList(state),
    [state.income, state.transactions, state.taxPayments]
  );
  const [fy, setFy] = useState(state.profile?.fy || fyList[0] || getCurrentFY());

  const taxPayments = useMemo(() => {
    return (state.taxPayments || []).filter((t: any) => t.fy === fy);
  }, [state.taxPayments, fy]);

  const addEntry = async () => {
    if (!newEntry.deductor || !newEntry.amount || saving) return;
    setSaving(true);
    try {
      await addItem("form26as", {
        deductor: newEntry.deductor,
        tan: newEntry.tan || null,
        amount: Number(newEntry.amount),
        dateOfPayment: newEntry.dateOfPayment || null,
        section: newEntry.section,
        fy,
      });
      setNewEntry({ deductor: "", tan: "", amount: "", dateOfPayment: "", section: "192" });
      setShowAdd(false);
      showToast?.("26AS entry added successfully!", "success");
    } catch (e: any) {
      showToast?.(`Failed to save 26AS entry: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setSaving(false);
    }
  };

  // Smart Parser for pasted TRACES text / AIS tabular rows
  const handleParsePaste = async () => {
    if (!pasteText.trim()) return;
    setSaving(true);
    try {
      const lines = pasteText.split("\n").map((l) => l.trim()).filter(Boolean);
      let parsedCount = 0;

      for (const line of lines) {
        // Regex to search for TAN format (4 letters, 5 digits, 1 letter)
        const tanMatch = line.match(/\b([A-Z]{4}[0-9]{5}[A-Z])\b/i);
        // Regex to search for section (e.g. 192, 194A, 194C, 194J, 194I, 194H, 194Q)
        const secMatch = line.match(/\b(19[2-5][A-Z0-9-]*|206C[A-Z0-9-]*)\b/i);
        // Regex for amounts
        const numbers = line.replace(/,/g, "").match(/\b\d+(\.\d+)?\b/g);

        if (numbers && numbers.length > 0) {
          // Typically in TRACES rows, the largest number is gross and the TDS is another column,
          // or if single amount is provided, treat it as TDS amount
          const potentialAmounts = numbers.map(Number).filter((n) => n > 50);
          const tdsAmount = potentialAmounts.length > 0 ? potentialAmounts[potentialAmounts.length - 1] : 0;

          if (tdsAmount > 0) {
            const deductorName = line.split("\t")[0] || line.split(",")[0] || "Deductor (Parsed)";
            await addItem("form26as", {
              deductor: deductorName.slice(0, 50),
              tan: tanMatch ? tanMatch[1].toUpperCase() : null,
              amount: tdsAmount,
              dateOfPayment: today(),
              section: secMatch ? secMatch[1].toUpperCase() : "192",
              fy,
            });
            parsedCount++;
          }
        }
      }

      showToast?.(`Successfully parsed and imported ${parsedCount} entries!`, "success");
      setPasteText("");
      setShowPasteModal(false);
    } catch (e: any) {
      showToast?.(`Parsing error: ${e?.message || "Invalid format"}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const doDeleteEntry = async (id: string) => {
    try {
      await removeItem("form26as", id);
      showToast?.("Entry removed", "success");
    } catch (e: any) {
      showToast?.(`Failed to delete 26AS entry: ${e?.message || "Unknown error"}`, "error");
    }
  };

  const entryFY = (e: any): string | null => {
    if (e.fy) return e.fy;
    if (!e.dateOfPayment) return null;
    const dt = new Date(e.dateOfPayment + "T00:00:00");
    if (isNaN(dt.getTime())) return null;
    const y = dt.getMonth() >= 3 ? dt.getFullYear() : dt.getFullYear() - 1;
    return `${y}-${String(y + 1).slice(-2)}`;
  };

  const entriesForFY = entries.filter((e: any) => entryFY(e) === fy);
  const total26AS = entriesForFY.reduce((s: number, e: any) => s + Number(e.amount || 0), 0);
  const animatedTotal26AS = useAnimatedNumber(total26AS);
  const appTdsAmounts = taxPayments
    .filter((t: any) => t.taxType === "TDS" || t.type === "TDS")
    .map((t: any) => Number(t.amount || 0));
  const totalApp = appTdsAmounts.reduce((s: number, a: number) => s + a, 0);
  const animatedTotalApp = useAnimatedNumber(totalApp);
  const mismatch = Math.abs(total26AS - totalApp);
  const animatedMismatch = useAnimatedNumber(mismatch);
  const isMatch = mismatch < 100;

  const isEntryMatched = (amount: number) =>
    appTdsAmounts.some((a: number) => Math.abs(a - Number(amount || 0)) < 1);

  // 1-Click Import Missing from 26AS into App Records
  const importMissingToApp = async (entry: any) => {
    try {
      await addItem("taxPayments", {
        fy,
        taxType: "TDS",
        amount: Number(entry.amount),
        date: entry.dateOfPayment || today(),
        challan: entry.tan || null,
        notes: `Imported from 26AS: ${entry.deductor} (Sec ${entry.section})`,
      });
      showToast?.(`Imported ₹${entry.amount} into Tax Payments!`, "success");
    } catch (e: any) {
      showToast?.(`Import error: ${e?.message}`, "error");
    }
  };

  const SECTIONS = [
    "192", "194A", "194B", "194C", "194D", "194H", "194I", "194J", "194K", "194Q", "194-IA", "194-IB", "206C", "Other"
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 800,
              fontSize: 18,
              color: THEME.ink,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <FileText size={20} style={{ color: THEME.accent }} />
            Form 26AS / AIS Smart Reconciler
          </div>
          <div style={{ fontSize: 13, color: THEME.muted, marginTop: 2 }}>
            Cross-verify official TRACES / AIS tax credits with recorded deductions for FY {fy}
          </div>
        </div>
        <FYSelector fy={fy} setFy={setFy} fyList={fyList} />
      </div>

      {/* Summary KPI Trio */}
      <div className="form-grid-3">
        <Card>
          <div style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
              26AS / AIS Total Credit
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: THEME.accent, marginTop: 4 }}>
              <Money value={animatedTotal26AS} variant="full" />
            </div>
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{entriesForFY.length} credit entries</div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
              App Recorded TDS
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: THEME.accent, marginTop: 4 }}>
              <Money value={animatedTotalApp} variant="full" />
            </div>
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{appTdsAmounts.length} payments logged</div>
          </div>
        </Card>

        <Card
          style={{
            borderTop: `3px solid ${isMatch ? THEME.sage : THEME.rust}`,
            background: `color-mix(in srgb, ${isMatch ? THEME.sage : THEME.rust} 4%, transparent)`,
          }}
        >
          <div style={{ padding: 16, textAlign: "center" }}>
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
              Reconciliation Delta
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
                fontWeight: 800,
                color: isMatch ? THEME.sage : THEME.rust,
                marginTop: 4,
              }}
            >
              {isMatch ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                  <CheckCircle2 size={20} /> Reconciled
                </span>
              ) : (
                <Money value={animatedMismatch} variant="full" />
              )}
            </div>
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
              {isMatch ? "Zero variance (< ₹100)" : "Discrepancy requires matching"}
            </div>
          </div>
        </Card>
      </div>

      {/* 26AS Entries Table Card */}
      <Card>
        <div style={{ padding: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: THEME.ink }}>
                Form 26AS / AIS Records
              </div>
              <div style={{ fontSize: 12, color: THEME.muted }}>
                Deductors who have deposited TDS to your PAN
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button onClick={() => setShowPasteModal(true)} variant="secondary" size="sm">
                <Sparkles size={14} style={{ marginRight: 4 }} /> Paste TRACES / AIS
              </Button>
              <Button onClick={() => setShowAdd(!showAdd)} size="sm">
                <Plus size={14} style={{ marginRight: 4 }} /> {showAdd ? "Cancel" : "Add Entry"}
              </Button>
            </div>
          </div>

          {showAdd && (
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                background: `color-mix(in srgb, ${THEME.accent} 5%, transparent)`,
                marginBottom: 16,
                border: `1.5px solid ${THEME.line}`,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: THEME.ink }}>
                Add New 26AS Credit Record
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: 10,
                  alignItems: "end",
                }}
              >
                <div>
                  <label style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, display: "block", marginBottom: 3 }}>
                    Deductor Name
                  </label>
                  <input
                    value={newEntry.deductor}
                    onChange={(e) => setNewEntry({ ...newEntry, deductor: e.target.value })}
                    placeholder="Employer / Bank Name"
                    className="form-input"
                    style={{ padding: "7px 10px", fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, display: "block", marginBottom: 3 }}>
                    TAN (10 Chars)
                  </label>
                  <input
                    value={newEntry.tan}
                    onChange={(e) => setNewEntry({ ...newEntry, tan: e.target.value.toUpperCase() })}
                    maxLength={10}
                    placeholder="ABCD12345E"
                    className="form-input"
                    style={{ padding: "7px 10px", fontSize: 13, textTransform: "uppercase" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, display: "block", marginBottom: 3 }}>
                    TDS Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={newEntry.amount}
                    onChange={(e) => setNewEntry({ ...newEntry, amount: e.target.value })}
                    placeholder="Amount"
                    className="form-input"
                    style={{ padding: "7px 10px", fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, display: "block", marginBottom: 3 }}>
                    Section
                  </label>
                  <select
                    value={newEntry.section}
                    onChange={(e) => setNewEntry({ ...newEntry, section: e.target.value })}
                    aria-label="Select section"
                    className="form-input"
                    style={{ padding: "7px 10px", fontSize: 13 }}
                  >
                    {SECTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, display: "block", marginBottom: 3 }}>
                    Date of Payment
                  </label>
                  <input
                    type="date"
                    value={newEntry.dateOfPayment}
                    onChange={(e) => setNewEntry({ ...newEntry, dateOfPayment: e.target.value })}
                    className="form-input"
                    style={{ padding: "7px 10px", fontSize: 13 }}
                  />
                </div>
                <Button onClick={addEntry} size="sm" disabled={saving}>
                  {saving ? "Adding..." : "Save"}
                </Button>
              </div>
            </div>
          )}

          {entriesForFY.length === 0 ? (
            <div style={{ textAlign: "center", padding: 28, color: THEME.muted, fontSize: 13 }}>
              No 26AS entries recorded for FY {fy}. Paste your TRACES export or add entries manually to reconcile.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: `2px solid ${THEME.line}`,
                      background: "color-mix(in srgb, var(--surface-1) 50%, transparent)",
                    }}
                  >
                    {["Deductor", "TAN", "Section", "Amount", "Status", "Actions"].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "10px 12px",
                          color: THEME.muted,
                          fontWeight: 700,
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entriesForFY.map((e: any) => {
                    const matched = isEntryMatched(e.amount);
                    return (
                      <tr key={e.id} className="table-row-hover" style={{ borderBottom: `1px solid ${THEME.line}` }}>
                        <td style={{ padding: "10px 12px", color: THEME.ink, fontWeight: 600 }}>{e.deductor}</td>
                        <td style={{ padding: "10px 12px", color: THEME.muted, fontFamily: "monospace" }}>{e.tan || "—"}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <Badge variant="muted">Sec {e.section}</Badge>
                        </td>
                        <td style={{ padding: "10px 12px", fontWeight: 700, color: THEME.ink }}>
                          <Money value={e.amount} variant="full" />
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          {matched ? (
                            <Badge variant="sage">
                              <CheckCircle2 size={11} style={{ marginRight: 3, verticalAlign: -1 }} /> Matched
                            </Badge>
                          ) : (
                            <Badge variant="rust">Unmatched in App</Badge>
                          )}
                        </td>
                        <td style={{ padding: "10px 12px" }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            {!matched && addItem && (
                              <button
                                onClick={() => importMissingToApp(e)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: THEME.accent,
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: 600,
                                }}
                              >
                                + Import to App
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmDeleteId({ id: e.id, deductor: e.deductor })}
                              style={{
                                background: "none",
                                border: "none",
                                color: THEME.rust,
                                cursor: "pointer",
                                fontSize: 12,
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Paste TRACES Text Modal */}
      {showPasteModal && (
        <Modal title="Smart Paste TRACES / AIS Export" onClose={() => setShowPasteModal(false)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 13, color: THEME.muted }}>
              Copy rows directly from your TRACES Form 26AS PDF or Income Tax AIS/TIS portal table and paste below.
              The parser will automatically extract the Deductor Name, TAN, Section, and TDS Amount.
            </p>
            <textarea
              rows={8}
              placeholder="Paste tabular rows from TRACES or AIS here..."
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              className="form-input"
              style={{ fontFamily: "monospace", fontSize: 12, padding: "10px" }}
            />
            <ModalActions>
              <Button variant="secondary" onClick={() => setShowPasteModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleParsePaste} disabled={saving || !pasteText.trim()}>
                {saving ? "Parsing..." : "Parse & Import Entries"}
              </Button>
            </ModalActions>
          </div>
        </Modal>
      )}

      {confirmDeleteId && (
        <ConfirmDialog
          message={`Delete 26AS entry from ${confirmDeleteId.deductor}? This action cannot be undone.`}
          onConfirm={() => {
            doDeleteEntry(confirmDeleteId.id);
            setConfirmDeleteId(null);
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. GST & TDS INVOICE RECKONER & STATUTORY DIRECTORY
// ─────────────────────────────────────────────────────────────────────────────

const TDS_SECTIONS = [
  { code: "192", name: "Salary Income", rate: "Slab", threshold: 300000, category: "Salary", desc: "TDS on salary estimated across average slab rates" },
  { code: "194A", name: "Interest other than Securities (FD/RD)", rate: 10, threshold: 40000, category: "Interest", desc: "Threshold ₹50,000 for Senior Citizens; ₹40,000 for others" },
  { code: "194C(1)", name: "Contractor (Individual / HUF)", rate: 1, threshold: 30000, annualThreshold: 100000, category: "Contractor", desc: "Single bill > ₹30K or aggregate > ₹1L in FY" },
  { code: "194C(2)", name: "Contractor (Company / Firm / LLP)", rate: 2, threshold: 30000, annualThreshold: 100000, category: "Contractor", desc: "Contracts executed by companies, firms, LLPs" },
  { code: "194H", name: "Commission or Brokerage", rate: 5, threshold: 15000, category: "Commission", desc: "Real estate brokerage, distribution agents" },
  { code: "194I(a)", name: "Rent on Land & Building", rate: 10, threshold: 240000, category: "Rent", desc: "Commercial or residential rent paid by entities" },
  { code: "194I(b)", name: "Rent on Plant & Machinery", rate: 2, threshold: 240000, category: "Rent", desc: "Equipment hire, generator, server rack rental" },
  { code: "194-IA", name: "Purchase of Immovable Property", rate: 1, threshold: 5000000, category: "Property", desc: "Applicable on full consideration if property >= ₹50 Lakh" },
  { code: "194-IB", name: "Rent by Individual/HUF (Not in Audit)", rate: 5, threshold: 50000, category: "Rent", desc: "Rent exceeding ₹50,000 per month paid by individuals" },
  { code: "194J(a)", name: "Professional & Technical Fees", rate: 10, threshold: 30000, category: "Professional", desc: "Legal, medical, architectural, accounting, consulting" },
  { code: "194J(b)", name: "Royalty / Technical Services / BPO", rate: 2, threshold: 30000, category: "Professional", desc: "IT technical support, BPO, call center charges" },
  { code: "194K", name: "Income from Mutual Fund Units (Dividend)", rate: 10, threshold: 5000, category: "Dividend", desc: "Dividend income distributed by mutual funds" },
  { code: "194M", name: "Contractual Payments by Individual/HUF", rate: 5, threshold: 5000000, category: "Contractor", desc: "Payments exceeding ₹50L in FY for personal contracts" },
  { code: "194Q", name: "Purchase of Goods (> ₹50L)", rate: 0.1, threshold: 5000000, category: "Goods", desc: "Turnover > ₹10Cr in prior FY; applies on amount > ₹50L" },
  { code: "194S", name: "Transfer of Virtual Digital Assets (Crypto)", rate: 1, threshold: 50000, category: "Crypto", desc: "TDS on purchase/sale of cryptocurrencies & NFTs" },
];

const GstTdsSection: React.FC = () => {
  const [gstMode, setGstMode] = useState<"exclusive" | "inclusive">("exclusive");
  const [gstAmount, setGstAmount] = useState("100000");
  const [gstRate, setGstRate] = useState<number>(18);
  const [supplyType, setSupplyType] = useState<"intra" | "inter">("intra");
  const [govtTds, setGovtTds] = useState(false);

  // TDS State
  const [tdsSectionCode, setTdsSectionCode] = useState("194J(a)");
  const [tdsInvoiceAmt, setTdsInvoiceAmt] = useState("100000");
  const [hasPan, setHasPan] = useState(true);
  const [isLDC, setIsLDC] = useState(false);
  const [ldcRate, setLdcRate] = useState("3");
  const [directoryFilter, setDirectoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // GST Math
  const gstResult = useMemo(() => {
    const raw = Math.max(0, Number(gstAmount) || 0);
    const r = gstRate / 100;
    let baseAmount = 0;
    let taxAmount = 0;
    let totalInvoice = 0;

    if (gstMode === "exclusive") {
      baseAmount = raw;
      taxAmount = raw * r;
      totalInvoice = baseAmount + taxAmount;
    } else {
      totalInvoice = raw;
      baseAmount = raw / (1 + r);
      taxAmount = totalInvoice - baseAmount;
    }

    const cgst = supplyType === "intra" ? taxAmount / 2 : 0;
    const sgst = supplyType === "intra" ? taxAmount / 2 : 0;
    const igst = supplyType === "inter" ? taxAmount : 0;
    const gstTdsAmt = govtTds && baseAmount >= 250000 ? baseAmount * 0.02 : 0;
    const netReceivable = totalInvoice - gstTdsAmt;

    return {
      baseAmount,
      taxAmount,
      totalInvoice,
      cgst,
      sgst,
      igst,
      gstTdsAmt,
      netReceivable,
    };
  }, [gstMode, gstAmount, gstRate, supplyType, govtTds]);

  const activeTdsSection = useMemo(() => {
    return TDS_SECTIONS.find((s) => s.code === tdsSectionCode) || TDS_SECTIONS[9];
  }, [tdsSectionCode]);

  const tdsResult = useMemo(() => {
    const gross = Math.max(0, Number(tdsInvoiceAmt) || 0);
    const rateNum = typeof activeTdsSection.rate === "number" ? activeTdsSection.rate : 10;
    let effectiveRate = rateNum;

    if (!hasPan) {
      effectiveRate = 20; // Section 206AA
    } else if (isLDC) {
      effectiveRate = Math.max(0, Number(ldcRate) || 0);
    }

    let taxableBase = gross;
    if (activeTdsSection.code === "194Q") {
      taxableBase = Math.max(0, gross - 5000000);
    }

    const isExempt = hasPan && !isLDC && gross < activeTdsSection.threshold && activeTdsSection.code !== "194Q";
    const tdsDeducted = isExempt ? 0 : (taxableBase * effectiveRate) / 100;
    const netPayable = Math.max(0, gross - tdsDeducted);

    return {
      gross,
      effectiveRate,
      tdsDeducted,
      netPayable,
      isExempt,
    };
  }, [activeTdsSection, tdsInvoiceAmt, hasPan, isLDC, ldcRate]);

  // Combined Freelancer Matrix: Base + 18% GST - 10% TDS on Base = Net Inflow
  const combinedMatrix = useMemo(() => {
    const base = gstResult.baseAmount;
    const gstTax = gstResult.taxAmount;
    const invoiceTotal = gstResult.totalInvoice;
    const tdsCut = (base * (typeof activeTdsSection.rate === "number" ? activeTdsSection.rate : 10)) / 100;
    const netBankReceipt = invoiceTotal - tdsCut - gstResult.gstTdsAmt;
    return {
      base,
      gstTax,
      invoiceTotal,
      tdsCut,
      netBankReceipt,
    };
  }, [gstResult, activeTdsSection]);

  const filteredDirectory = useMemo(() => {
    return TDS_SECTIONS.filter((s) => {
      const matchCat = directoryFilter === "all" || s.category.toLowerCase() === directoryFilter.toLowerCase();
      const matchSearch =
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.desc.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [directoryFilter, searchQuery]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Header Bar */}
      <div>
        <div
          style={{
            fontWeight: 800,
            fontSize: 18,
            color: THEME.ink,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Receipt size={20} style={{ color: THEME.accent }} />
          GST & TDS Invoicing Reckoner & Directory
        </div>
        <div style={{ fontSize: 13, color: THEME.muted, marginTop: 2 }}>
          Combined B2B / Freelancer invoicing settlement matrix & complete statutory TDS lookup
        </div>
      </div>

      <div className="bento-grid" style={{ gap: 20 }}>
        {/* GST Invoicing Calculator */}
        <div className="bento-col-6">
          <Card style={{ padding: 22, height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Receipt size={18} color={THEME.accent} />
              <div style={{ fontSize: 16, fontWeight: 800 }}>GST Tax Split Calculator</div>
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => setGstMode("exclusive")}
                className={`demat-portfolio-pill ${gstMode === "exclusive" ? "active" : ""}`}
                style={{ flex: 1, justifyContent: "center", padding: "8px 10px", fontSize: 12 }}
              >
                Tax Exclusive (Forward)
              </button>
              <button
                type="button"
                onClick={() => setGstMode("inclusive")}
                className={`demat-portfolio-pill ${gstMode === "inclusive" ? "active" : ""}`}
                style={{ flex: 1, justifyContent: "center", padding: "8px 10px", fontSize: 12 }}
              >
                Tax Inclusive / MRP (Reverse)
              </button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: THEME.muted, marginBottom: 4, fontWeight: 700, display: "block" }}>
                {gstMode === "exclusive" ? "Base Taxable Value (₹)" : "Gross Total Invoice / MRP (₹)"}
              </label>
              <input
                className="form-input"
                type="number"
                value={gstAmount}
                onChange={(e) => setGstAmount(e.target.value)}
                placeholder="100000"
                style={{ fontSize: 14, padding: "8px 12px" }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: THEME.muted, marginBottom: 6, fontWeight: 700, display: "block" }}>
                GST Slab Rate
              </label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[0, 5, 12, 18, 28].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setGstRate(rate)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      border: `1px solid ${gstRate === rate ? THEME.accent : THEME.line}`,
                      background: gstRate === rate ? THEME.accent : "var(--t-card-bg)",
                      color: gstRate === rate ? "#ffffff" : THEME.ink,
                    }}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: THEME.muted, marginBottom: 4, fontWeight: 700, display: "block" }}>
                Supply Nature
              </label>
              <div style={{ display: "flex", gap: 14 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", color: THEME.ink }}>
                  <input
                    type="radio"
                    name="supplyType"
                    checked={supplyType === "intra"}
                    onChange={() => setSupplyType("intra")}
                    style={{ accentColor: THEME.accent }}
                  />
                  <span>Intra-State (CGST + SGST)</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", color: THEME.ink }}>
                  <input
                    type="radio"
                    name="supplyType"
                    checked={supplyType === "inter"}
                    onChange={() => setSupplyType("inter")}
                    style={{ accentColor: THEME.accent }}
                  />
                  <span>Inter-State (IGST)</span>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer", color: THEME.ink }}>
                <input
                  type="checkbox"
                  checked={govtTds}
                  onChange={(e) => setGovtTds(e.target.checked)}
                  style={{ accentColor: THEME.accent }}
                />
                <span>Govt / PSU Contract (2% TDS u/s 51 on &gt; ₹2.5L taxable value)</span>
              </label>
            </div>

            {/* GST Output */}
            <div
              style={{
                padding: 14,
                background: `color-mix(in srgb, ${THEME.muted} 4%, transparent)`,
                borderRadius: 12,
                border: `1px solid ${THEME.line}`,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: THEME.muted }}>Base Taxable Value</span>
                <span style={{ fontWeight: 700, color: THEME.ink }}><Money value={gstResult.baseAmount} variant="full" /></span>
              </div>
              {supplyType === "intra" ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: THEME.muted }}>CGST ({gstRate / 2}%)</span>
                    <span style={{ fontWeight: 700, color: THEME.accent }}><Money value={gstResult.cgst} variant="full" /></span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span style={{ color: THEME.muted }}>SGST ({gstRate / 2}%)</span>
                    <span style={{ fontWeight: 700, color: THEME.accent }}><Money value={gstResult.sgst} variant="full" /></span>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: THEME.muted }}>IGST ({gstRate}%)</span>
                  <span style={{ fontWeight: 700, color: THEME.accent }}><Money value={gstResult.igst} variant="full" /></span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 6, borderTop: `1px dashed ${THEME.line}`, fontSize: 14 }}>
                <span style={{ fontWeight: 700, color: THEME.ink }}>Total Invoice Amount</span>
                <span style={{ fontWeight: 800, color: THEME.ink }}><Money value={gstResult.totalInvoice} variant="full" /></span>
              </div>
            </div>
          </Card>
        </div>

        {/* Combined Freelancer / B2B Settlement Matrix */}
        <div className="bento-col-6">
          <Card style={{ padding: 22, height: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Percent size={18} color={THEME.accent} />
              <div style={{ fontSize: 16, fontWeight: 800 }}>Combined Invoice Settlement Matrix</div>
            </div>

            <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 12 }}>
              When billing corporate clients, GST is added to your invoice, while TDS is deducted from the base amount before bank disbursement.
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, display: "block", marginBottom: 4 }}>
                Deduction Section
              </label>
              <select
                className="form-input"
                value={tdsSectionCode}
                onChange={(e) => setTdsSectionCode(e.target.value)}
                style={{ padding: "8px 12px", fontSize: 13, fontWeight: 600 }}
              >
                {TDS_SECTIONS.map((s) => (
                  <option key={s.code} value={s.code}>
                    Sec {s.code} — {s.name} ({s.rate}%)
                  </option>
                ))}
              </select>
            </div>

            {/* Combined Matrix Flow */}
            <div
              style={{
                padding: 16,
                background: `color-mix(in srgb, ${THEME.accent} 5%, transparent)`,
                borderRadius: 12,
                border: `1.5px solid ${THEME.line}`,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: THEME.muted }}>1. Taxable Professional/Service Fees</span>
                <span style={{ fontWeight: 700, color: THEME.ink }}><Money value={combinedMatrix.base} variant="full" /></span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: THEME.muted }}>2. Add: GST ({gstRate}%)</span>
                <span style={{ fontWeight: 700, color: THEME.accent }}>+ <Money value={combinedMatrix.gstTax} variant="full" /></span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, borderTop: `1px solid ${THEME.line}`, paddingTop: 6 }}>
                <span>Gross Invoice Billed to Client</span>
                <span><Money value={combinedMatrix.invoiceTotal} variant="full" /></span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: THEME.rust }}>
                <span>3. Less: TDS Deducted u/s {activeTdsSection.code} ({activeTdsSection.rate}%)</span>
                <span style={{ fontWeight: 700 }}>- <Money value={combinedMatrix.tdsCut} variant="full" /></span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 16,
                  fontWeight: 800,
                  color: THEME.sage,
                  borderTop: `2px solid ${THEME.sage}`,
                  paddingTop: 8,
                  marginTop: 4,
                }}
              >
                <span>Net Inflow in Your Bank</span>
                <span><Money value={combinedMatrix.netBankReceipt} variant="full" /></span>
              </div>
            </div>

            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 10 }}>
              * You will deposit <Money value={combinedMatrix.gstTax} variant="full" /> GST via GSTR-3B, and claim credit for <Money value={combinedMatrix.tdsCut} variant="full" /> TDS in your ITR via Form 26AS.
            </div>
          </Card>
        </div>
      </div>

      {/* Statutory TDS Directory */}
      <Card>
        <div style={{ padding: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: THEME.ink }}>
                Statutory TDS Rate Directory (FY 2024-25 & FY 2025-26)
              </div>
              <div style={{ fontSize: 12, color: THEME.muted }}>
                Quick reference guide for withholding rates, exemption thresholds, and legal applicability
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                placeholder="Search section / keyword..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input"
                style={{ padding: "6px 12px", fontSize: 12, width: 180 }}
              />
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${THEME.line}`, background: "color-mix(in srgb, var(--surface-1) 50%, transparent)" }}>
                  {["Section", "Nature of Payment", "Statutory Rate", "Exemption Threshold", "Scope / Legal Notes"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "10px 12px",
                        color: THEME.muted,
                        fontWeight: 700,
                        fontSize: 11,
                        textTransform: "uppercase",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredDirectory.map((s) => (
                  <tr key={s.code} className="table-row-hover" style={{ borderBottom: `1px solid ${THEME.line}` }}>
                    <td style={{ padding: "10px 12px" }}>
                      <Badge variant="accent">Sec {s.code}</Badge>
                    </td>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: THEME.ink }}>{s.name}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: THEME.ink }}>{s.rate}%</td>
                    <td style={{ padding: "10px 12px", color: THEME.muted }}>
                      <Money value={s.threshold} variant="full" />
                    </td>
                    <td style={{ padding: "10px 12px", color: THEME.muted, fontSize: 12 }}>{s.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. REGIME CROSSOVER SANDBOX & BREAK-EVEN ENGINE
// ─────────────────────────────────────────────────────────────────────────────

interface RegimeSandboxProps {
  state: any;
}

const RegimeSandbox: React.FC<RegimeSandboxProps> = ({ state }) => {
  const [income, setIncome] = useState<number>(1500000);
  const [ded80C, setDed80C] = useState<number>(150000);
  const [ded80D, setDed80D] = useState<number>(25000);
  const [hra, setHra] = useState<number>(200000);
  const [homeLoan, setHomeLoan] = useState<number>(200000);
  const [nps80CCD1B, setNps80CCD1B] = useState<number>(50000);
  const [corporateNps, setCorporateNps] = useState<number>(0);

  const fy = state.profile?.fy || getCurrentFY();
  const fyStart = parseInt(fy.split("-")[0]);
  const stdDedOld = fyStart >= 2020 ? 50000 : 40000;

  const totalDeductions =
    stdDedOld +
    Math.min(ded80C, 150000) +
    Math.min(ded80D, 100000) +
    hra +
    Math.min(homeLoan, 200000) +
    Math.min(nps80CCD1B, 50000) +
    corporateNps;

  const oldTax = useMemo(() => {
    return calcTaxOldByFY(income, totalDeductions, fy).total;
  }, [income, totalDeductions, fy]);

  const newTax = useMemo(() => {
    return calcTaxNewByFY(income, fy).total;
  }, [income, fy]);

  const taxDiff = Math.abs(oldTax - newTax);
  const isNewBetter = newTax <= oldTax;

  // Generate crossover curve data points across income ₹5L to ₹30L
  const curveData = useMemo(() => {
    const points = [];
    for (let inc = 500000; inc <= 3000000; inc += 250000) {
      const oTax = calcTaxOldByFY(inc, totalDeductions, fy).total;
      const nTax = calcTaxNewByFY(inc, fy).total;
      points.push({
        income: `₹${inc / 100000}L`,
        oldTax: oTax,
        newTax: nTax,
      });
    }
    return points;
  }, [totalDeductions, fy]);

  // Find exact breakeven deduction for current income level
  const breakEvenDeduction = useMemo(() => {
    let low = 0;
    let high = income;
    let best = 0;
    for (let i = 0; i < 40; i++) {
      const mid = (low + high) / 2;
      const tOld = calcTaxOldByFY(income, mid, fy).total;
      if (tOld > newTax) {
        low = mid;
      } else {
        high = mid;
        best = mid;
      }
    }
    return Math.round(best);
  }, [income, newTax, fy]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div
          style={{
            fontWeight: 800,
            fontSize: 18,
            color: THEME.ink,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <SlidersHorizontal size={20} style={{ color: THEME.accent }} />
          Old vs New Regime Crossover Sandbox
        </div>
        <div style={{ fontSize: 13, color: THEME.muted, marginTop: 2 }}>
          Interactive simulation lab & break-even inflection curve for FY {fy}
        </div>
      </div>

      {/* Outcome Banner */}
      <Card
        style={{
          borderTop: `3px solid ${isNewBetter ? THEME.accent : THEME.sage}`,
          background: `color-mix(in srgb, ${isNewBetter ? THEME.accent : THEME.sage} 5%, transparent)`,
        }}
      >
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", color: THEME.muted }}>
                Optimal Regime Recommendation
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: isNewBetter ? THEME.accent : THEME.sage, marginTop: 4 }}>
                {isNewBetter ? "New Tax Regime is More Beneficial" : "Old Tax Regime is More Beneficial"}
              </div>
              <div style={{ fontSize: 13, color: THEME.ink, marginTop: 4 }}>
                You save <strong><Money value={taxDiff} variant="full" /></strong> per year under the {isNewBetter ? "New" : "Old"} regime with your current deductions of <Money value={totalDeductions} variant="full" />.
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>Break-Even Deduction Threshold</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: THEME.gold, marginTop: 2 }}>
                <Money value={breakEvenDeduction} variant="full" />
              </div>
              <div style={{ fontSize: 11, color: THEME.muted }}>Required in Old Regime to beat New</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Interactive Controls & Chart */}
      <div className="bento-grid" style={{ gap: 20 }}>
        <div className="bento-col-5">
          <Card style={{ padding: 20, height: "100%" }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: THEME.ink, marginBottom: 14 }}>
              Deduction Parameters
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700 }}>Gross Taxable Income</span>
                  <span style={{ fontWeight: 800, color: THEME.accent }}><Money value={income} variant="full" /></span>
                </div>
                <input
                  type="range"
                  min={500000}
                  max={4000000}
                  step={50000}
                  value={income}
                  onChange={(e) => setIncome(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.accent }}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span>Section 80C (Max ₹1.5L)</span>
                  <span style={{ fontWeight: 700 }}><Money value={ded80C} variant="full" /></span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={150000}
                  step={10000}
                  value={ded80C}
                  onChange={(e) => setDed80C(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.accent }}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span>Section 80D Health Insurance (Max ₹1L)</span>
                  <span style={{ fontWeight: 700 }}><Money value={ded80D} variant="full" /></span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100000}
                  step={5000}
                  value={ded80D}
                  onChange={(e) => setDed80D(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.accent }}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span>HRA Exemption Claimed</span>
                  <span style={{ fontWeight: 700 }}><Money value={hra} variant="full" /></span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={600000}
                  step={10000}
                  value={hra}
                  onChange={(e) => setHra(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.accent }}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span>Home Loan Interest Sec 24(b) (Max ₹2L)</span>
                  <span style={{ fontWeight: 700 }}><Money value={homeLoan} variant="full" /></span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200000}
                  step={10000}
                  value={homeLoan}
                  onChange={(e) => setHomeLoan(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.accent }}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                  <span>NPS Section 80CCD(1B) (Max ₹50K)</span>
                  <span style={{ fontWeight: 700 }}><Money value={nps80CCD1B} variant="full" /></span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50000}
                  step={5000}
                  value={nps80CCD1B}
                  onChange={(e) => setNps80CCD1B(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.accent }}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Visual Crossover Chart */}
        <div className="bento-col-7">
          <Card style={{ padding: 20, height: "100%" }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: THEME.ink, marginBottom: 14 }}>
              Regime Tax Curve Comparison
            </div>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={curveData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={THEME.line} />
                  <XAxis dataKey="income" stroke={THEME.muted} fontSize={11} />
                  <YAxis stroke={THEME.muted} fontSize={11} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    formatter={(val: any) => fmtINRFull(Number(val))}
                    contentStyle={{ background: "var(--t-card-bg)", borderColor: THEME.line, borderRadius: 8 }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="oldTax" name="Old Regime Tax" stroke={THEME.sage} strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="newTax" name="New Regime Tax" stroke={THEME.accent} strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. CAPITAL GAINS TAX LAB (POST-BUDGET RULES)
// ─────────────────────────────────────────────────────────────────────────────

const CapitalGainsLab: React.FC = () => {
  const [equityLtcg, setEquityLtcg] = useState("200000");
  const [equityStcg, setEquityStcg] = useState("100000");
  const [propertyLtcg, setPropertyLtcg] = useState("500000");
  const [unlistedLtcg, setUnlistedLtcg] = useState("0");

  const results = useMemo(() => {
    const eLtcg = Math.max(0, Number(equityLtcg) || 0);
    const eStcg = Math.max(0, Number(equityStcg) || 0);
    const pLtcg = Math.max(0, Number(propertyLtcg) || 0);
    const uLtcg = Math.max(0, Number(unlistedLtcg) || 0);

    // Section 112A: 12.5% on LTCG exceeding ₹1.25 Lakh (Budget 2024 revision)
    const taxableEquityLtcg = Math.max(0, eLtcg - 125000);
    const taxEquityLtcg = taxableEquityLtcg * 0.125 * 1.04;

    // Section 111A: 20% on STCG (Budget 2024 revision from 15% to 20%)
    const taxEquityStcg = eStcg * 0.2 * 1.04;

    // Real Estate: 12.5% without indexation
    const taxPropertyLtcg = pLtcg * 0.125 * 1.04;

    // Unlisted: 12.5%
    const taxUnlistedLtcg = uLtcg * 0.125 * 1.04;

    const totalTax = taxEquityLtcg + taxEquityStcg + taxPropertyLtcg + taxUnlistedLtcg;

    return {
      taxableEquityLtcg,
      taxEquityLtcg,
      taxEquityStcg,
      taxPropertyLtcg,
      taxUnlistedLtcg,
      totalTax,
    };
  }, [equityLtcg, equityStcg, propertyLtcg, unlistedLtcg]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div
          style={{
            fontWeight: 800,
            fontSize: 18,
            color: THEME.ink,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Coins size={20} style={{ color: THEME.accent }} />
          Capital Gains Tax Lab (Budget 2024 & 2025 Rules)
        </div>
        <div style={{ fontSize: 13, color: THEME.muted, marginTop: 2 }}>
          Section 112A (12.5% &gt; ₹1.25L) & Section 111A (20% STCG) capital gains computation engine
        </div>
      </div>

      <div className="bento-grid" style={{ gap: 20 }}>
        {/* Input Controls */}
        <div className="bento-col-6">
          <Card style={{ padding: 20, height: "100%" }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: THEME.ink, marginBottom: 14 }}>
              Capital Gains Realized in FY
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, display: "block", marginBottom: 4 }}>
                  Equity / ELSS LTCG (&gt; 12 Months) (₹)
                </label>
                <input
                  type="number"
                  value={equityLtcg}
                  onChange={(e) => setEquityLtcg(e.target.value)}
                  className="form-input"
                  style={{ padding: "8px 12px", fontSize: 14 }}
                />
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                  First ₹1,25,000 exempt under Sec 112A; balance taxed @ 12.5% + cess
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, display: "block", marginBottom: 4 }}>
                  Equity STCG (&le; 12 Months) (₹)
                </label>
                <input
                  type="number"
                  value={equityStcg}
                  onChange={(e) => setEquityStcg(e.target.value)}
                  className="form-input"
                  style={{ padding: "8px 12px", fontSize: 14 }}
                />
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                  Taxed @ 20% flat under Sec 111A (revised in Finance Act 2024)
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, color: THEME.muted, fontWeight: 700, display: "block", marginBottom: 4 }}>
                  Real Estate / Property LTCG (₹)
                </label>
                <input
                  type="number"
                  value={propertyLtcg}
                  onChange={(e) => setPropertyLtcg(e.target.value)}
                  className="form-input"
                  style={{ padding: "8px 12px", fontSize: 14 }}
                />
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                  Taxed @ 12.5% without indexation (or 20% with indexation for pre-July 2024 assets)
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Output Summary */}
        <div className="bento-col-6">
          <Card style={{ padding: 20, height: "100%" }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: THEME.ink, marginBottom: 14 }}>
              Tax Breakdown & Set-Off Rules
            </div>

            <div
              style={{
                padding: 16,
                background: `color-mix(in srgb, ${THEME.accent} 5%, transparent)`,
                borderRadius: 12,
                border: `1.5px solid ${THEME.line}`,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: THEME.muted }}>Sec 112A Equity LTCG Tax (12.5%)</span>
                <span style={{ fontWeight: 700, color: THEME.ink }}><Money value={results.taxEquityLtcg} variant="full" /></span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: THEME.muted }}>Sec 111A Equity STCG Tax (20%)</span>
                <span style={{ fontWeight: 700, color: THEME.ink }}><Money value={results.taxEquityStcg} variant="full" /></span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ color: THEME.muted }}>Property LTCG Tax (12.5%)</span>
                <span style={{ fontWeight: 700, color: THEME.ink }}><Money value={results.taxPropertyLtcg} variant="full" /></span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 16,
                  fontWeight: 800,
                  color: THEME.rust,
                  borderTop: `2px solid ${THEME.line}`,
                  paddingTop: 10,
                }}
              >
                <span>Total Capital Gains Tax</span>
                <span><Money value={results.totalTax} variant="full" /></span>
              </div>
            </div>

            {/* Set-off guide */}
            <div style={{ marginTop: 14, padding: 12, borderRadius: 8, background: "var(--t-card-bg)", border: `1px solid ${THEME.line}`, fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: THEME.ink, marginBottom: 4 }}>
                Loss Set-Off Matrix:
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, color: THEME.muted }}>
                <li><strong>Short-Term Capital Loss (STCL):</strong> Can offset both STCG and LTCG (Carry forward 8 FYs).</li>
                <li><strong>Long-Term Capital Loss (LTCL):</strong> Can ONLY offset LTCG (Carry forward 8 FYs).</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. SECTION 87A REBATE & MARGINAL RELIEF VISUALIZER
// ─────────────────────────────────────────────────────────────────────────────

const MarginalReliefVisualizer: React.FC = () => {
  const [taxableIncome, setTaxableIncome] = useState<number>(715000);
  const [regime, setRegime] = useState<"new" | "old">("new");

  const calcResult = useMemo(() => {
    const inc = taxableIncome;
    if (regime === "new") {
      // Slabs FY 2025-26 New Regime:
      // 0-4L: Nil
      // 4-8L: 5%
      // 8-12L: 10%
      // 12-16L: 15%
      // 16-20L: 20%
      // 20-24L: 25%
      // >24L: 30%
      // Rebate limit is ₹7,00,000 (tax up to ₹25,000 is 100% rebated)
      let tax = 0;
      if (inc <= 700000) {
        return { normalTax: 0, rebate87A: 0, marginalRelief: 0, netTax: 0, rebateEligible: true };
      }

      // Normal tax without rebate
      if (inc > 400000) tax += (Math.min(inc, 800000) - 400000) * 0.05;
      if (inc > 800000) tax += (Math.min(inc, 1200000) - 800000) * 0.1;

      // Marginal Relief check: Tax cannot exceed (Income - 7,00,000)
      const excessIncome = inc - 700000;
      let marginalRelief = 0;
      let finalTax = tax;

      if (tax > excessIncome) {
        marginalRelief = tax - excessIncome;
        finalTax = excessIncome;
      }

      return {
        normalTax: tax,
        rebate87A: 0,
        marginalRelief,
        netTax: finalTax * 1.04,
        rebateEligible: false,
      };
    } else {
      // Old Regime: Rebate up to ₹5,00,000 (₹12,500 max)
      if (inc <= 500000) {
        return { normalTax: 0, rebate87A: 0, marginalRelief: 0, netTax: 0, rebateEligible: true };
      }
      let tax = 0;
      if (inc > 250000) tax += (Math.min(inc, 500000) - 250000) * 0.05;
      if (inc > 500000) tax += (Math.min(inc, 1000000) - 500000) * 0.2;

      const excessIncome = inc - 500000;
      let marginalRelief = 0;
      let finalTax = tax;
      if (tax > excessIncome) {
        marginalRelief = tax - excessIncome;
        finalTax = excessIncome;
      }
      return {
        normalTax: tax,
        rebate87A: 0,
        marginalRelief,
        netTax: finalTax * 1.04,
        rebateEligible: false,
      };
    }
  }, [taxableIncome, regime]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div
          style={{
            fontWeight: 800,
            fontSize: 18,
            color: THEME.ink,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Sparkles size={20} style={{ color: THEME.accent }} />
          Section 87A Rebate & Marginal Relief Visualizer
        </div>
        <div style={{ fontSize: 13, color: THEME.muted, marginTop: 2 }}>
          Understand how tax cliff effects are neutralized when taxable income slightly exceeds ₹7,00,000
        </div>
      </div>

      <Card>
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => setRegime("new")}
              className={`demat-portfolio-pill ${regime === "new" ? "active" : ""}`}
              style={{ flex: 1, justifyContent: "center", padding: "8px 10px" }}
            >
              New Regime (₹7 Lakh Limit)
            </button>
            <button
              type="button"
              onClick={() => setRegime("old")}
              className={`demat-portfolio-pill ${regime === "old" ? "active" : ""}`}
              style={{ flex: 1, justifyContent: "center", padding: "8px 10px" }}
            >
              Old Regime (₹5 Lakh Limit)
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
              <span style={{ fontWeight: 700 }}>Taxable Income</span>
              <span style={{ fontWeight: 800, color: THEME.accent }}><Money value={taxableIncome} variant="full" /></span>
            </div>
            <input
              type="range"
              min={600000}
              max={900000}
              step={1000}
              value={taxableIncome}
              onChange={(e) => setTaxableIncome(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.accent }}
            />
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            <div style={{ padding: 14, borderRadius: 10, background: "var(--t-card-bg)", border: `1px solid ${THEME.line}` }}>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700 }}>Normal Slab Tax</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, marginTop: 4 }}>
                <Money value={calcResult.normalTax} variant="full" />
              </div>
            </div>

            <div style={{ padding: 14, borderRadius: 10, background: `color-mix(in srgb, ${THEME.sage} 10%, transparent)`, border: `1px solid ${THEME.sage}` }}>
              <div style={{ fontSize: 11, color: THEME.sage, fontWeight: 800 }}>Marginal Relief Cushion</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: THEME.sage, marginTop: 4 }}>
                <Money value={calcResult.marginalRelief} variant="full" />
              </div>
            </div>

            <div style={{ padding: 14, borderRadius: 10, background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`, border: `1px solid ${THEME.accent}` }}>
              <div style={{ fontSize: 11, color: THEME.accent, fontWeight: 800 }}>Net Tax Payable (Incl Cess)</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: THEME.accent, marginTop: 4 }}>
                <Money value={calcResult.netTax} variant="full" />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. STATUTORY TAX COMPLIANCE RADAR & CALENDAR
// ─────────────────────────────────────────────────────────────────────────────

const COMPLIANCE_DEADLINES = [
  { date: "05-31", name: "SFT Filing Deadline", type: "Annual", desc: "Statement of Financial Transactions filing by reporting entities" },
  { date: "06-15", name: "Advance Tax Q1 Milestone", type: "Advance Tax", desc: "15% cumulative advance tax liability due" },
  { date: "06-15", name: "Form 16 Issuance Deadline", type: "TDS", desc: "Employers must issue Form 16 Part A & B to employees" },
  { date: "07-31", name: "Individual ITR Filing (Non-Audit)", type: "ITR", desc: "Original ITR-1 / ITR-2 / ITR-4 filing deadline for individuals u/s 139(1)" },
  { date: "09-15", name: "Advance Tax Q2 Milestone", type: "Advance Tax", desc: "45% cumulative advance tax liability due" },
  { date: "10-31", name: "Tax Audit ITR Filing", type: "ITR", desc: "ITR deadline for taxpayers liable to audit under Section 44AB" },
  { date: "12-15", name: "Advance Tax Q3 Milestone", type: "Advance Tax", desc: "75% cumulative advance tax liability due" },
  { date: "12-31", name: "Belated / Revised ITR Filing", type: "ITR", desc: "Last date to file belated ITR u/s 139(4) or revised ITR u/s 139(5)" },
  { date: "03-15", name: "Advance Tax Q4 Milestone", type: "Advance Tax", desc: "100% cumulative advance tax liability due" },
  { date: "03-31", name: "Updated ITR (ITR-U) Deadline", type: "ITR", desc: "Filing updated return u/s 139(8A) within 24 months of assessment year" },
];

const ComplianceCalendar: React.FC<{ state: any }> = ({ state }) => {
  const fyList = useMemo(() => buildFYList(state), [state]);
  const [fy, setFy] = useState(state.profile?.fy || fyList[0] || getCurrentFY());
  const fyStart = parseInt(fy.split("-")[0]);
  const todayStr = today();
  const nowDate = new Date(todayStr + "T00:00:00");

  const events = useMemo(() => {
    return COMPLIANCE_DEADLINES.map((d) => {
      const year = d.date.startsWith("03") ? fyStart + 1 : fyStart;
      const fullDate = `${year}-${d.date}`;
      const dt = new Date(fullDate + "T00:00:00");
      const days = Math.ceil((dt.getTime() - nowDate.getTime()) / 86400000);
      return {
        ...d,
        fullDate,
        daysLeft: days,
        isPast: days < 0,
        isUpcoming: days >= 0 && days <= 30,
      };
    }).sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
  }, [fyStart, nowDate]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 800,
              fontSize: 18,
              color: THEME.ink,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Calendar size={20} style={{ color: THEME.accent }} />
            Statutory Tax Compliance Radar
          </div>
          <div style={{ fontSize: 13, color: THEME.muted, marginTop: 2 }}>
            Complete statutory compliance calendar and direct tax deadlines for FY {fy}
          </div>
        </div>
        <FYSelector fy={fy} setFy={setFy} fyList={fyList} />
      </div>

      <Card>
        <div style={{ padding: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {events.map((e, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: 10,
                  border: `1.5px solid ${e.isUpcoming ? THEME.gold : THEME.line}`,
                  background: e.isUpcoming
                    ? `color-mix(in srgb, ${THEME.gold} 6%, transparent)`
                    : e.isPast
                      ? `color-mix(in srgb, ${THEME.sage} 4%, transparent)`
                      : "transparent",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 12,
                      color: THEME.accent,
                    }}
                  >
                    {e.date}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: THEME.ink }}>{e.name}</div>
                    <div style={{ fontSize: 12, color: THEME.muted }}>{e.desc}</div>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <Badge variant={e.isPast ? "sage" : e.isUpcoming ? "gold" : "muted"}>
                    {e.isPast ? "Passed" : e.isUpcoming ? `Due in ${e.daysLeft} days` : `Due on ${e.fullDate}`}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TAX TOOLS TAB COMPONENT (EXECUTIVE CONTROLLER)
// ─────────────────────────────────────────────────────────────────────────────

interface TaxToolsTabProps {
  state: any;
  metrics: any;
  subTab?: string;
  addItem?: any;
  removeItem?: any;
  updateItem?: any;
  showToast?: (msg: string, type?: string) => void;
}

export const TaxToolsTab: React.FC<TaxToolsTabProps> = ({
  state,
  metrics,
  subTab,
  addItem,
  removeItem,
  showToast,
}) => {
  const [activeSection, setActiveSection] = useState(subTab || "advance");

  useEffect(() => {
    if (subTab) {
      setActiveSection(subTab);
    }
  }, [subTab]);

  const sections = [
    { key: "advance", label: "Advance Tax & Sec 234B/C", icon: Calculator },
    { key: "hra", label: "HRA Optimizer & Receipts", icon: Home },
    { key: "26as", label: "26AS & AIS Reconciler", icon: FileText },
    { key: "gst-tds", label: "GST & TDS Reckoner", icon: Receipt },
    { key: "regime-sandbox", label: "Regime Crossover Lab", icon: SlidersHorizontal },
    { key: "capital-gains", label: "Capital Gains Lab", icon: Coins },
    { key: "marginal-relief", label: "Section 87A & Relief", icon: Sparkles },
    { key: "calendar", label: "Compliance Radar", icon: Calendar },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <SectionTitle sub="Advance tax engine, Section 10(13A) HRA optimizer, 26AS smart reconciler, GST/TDS matrix, and regime sandbox">
        Tax Tools & Compliance Hub
      </SectionTitle>

      {/* Modern Sub-Tab Pill Bar */}
      <div className="demat-portfolio-bar no-scrollbar" style={{ gap: 8, overflowX: "auto" }}>
        {sections.map((s) => {
          const Icon = s.icon;
          const active = activeSection === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              aria-pressed={active}
              className={`demat-portfolio-pill ${active ? "active" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                whiteSpace: "nowrap",
              }}
            >
              <Icon size={16} /> {s.label}
            </button>
          );
        })}
      </div>

      {/* Active Section Content */}
      {activeSection === "advance" && (
        <AdvanceTaxSection state={state} metrics={metrics} addItem={addItem} showToast={showToast} />
      )}
      {activeSection === "hra" && <HraReceiptSection state={state} />}
      {activeSection === "26as" && (
        <Form26ASSection state={state} addItem={addItem} removeItem={removeItem} showToast={showToast} />
      )}
      {activeSection === "gst-tds" && <GstTdsSection />}
      {activeSection === "regime-sandbox" && <RegimeSandbox state={state} />}
      {activeSection === "capital-gains" && <CapitalGainsLab />}
      {activeSection === "marginal-relief" && <MarginalReliefVisualizer />}
      {activeSection === "calendar" && <ComplianceCalendar state={state} />}
    </div>
  );
};

export default TaxToolsTab;
