/* eslint-disable */
import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  Briefcase,
  Plus,
  Trash2,
  Pencil,
  Sparkles,
  FileText,
  TrendingUp,
  TrendingDown,
  IndianRupee,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader,
  Search,
  Download,
  Award,
  X,
  Copy,
  CopyPlus,
  Zap,
  RotateCcw,
  LayoutGrid,
  Table as TableIcon,
  BarChart3,
  Eye,
  Printer,
  ShieldCheck,
  CheckCircle2,
  PieChart as PieIcon,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  DollarSign,
  Building,
  Calendar,
  Percent,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { THEME } from "../../utils/constants";
import { getCurrentFY, getCurrentFYStartYear } from "../../utils/appConstants";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { fmtINRFull, uid, today, exportArrayToCSV } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { ModalSection } from "../ui/ModalSection";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { Badge } from "../ui/Badge";
import { StatCard } from "../ui/StatCard";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { ConfirmDialog } from "../ui/Feedback";
import { useAsyncAction } from "../../hooks/useAsyncAction";

const EMPTY: any = {
  owner: "self",
  employer: "",
  slipMonth: today().slice(0, 7),
  basic: "",
  hra: "",
  educationAllowance: "",
  lta: "",
  specialAllowance: "",
  employerNpsContribution: "",
  da: "",
  bonus: "",
  otherEarnings: "",
  grossSalary: "",
  pfEmployee: "",
  pfEmployer: "",
  esiEmployee: "",
  professionalTax: "",
  tds: "",
  incomeTax: "",
  npsDeduction: "",
  otherDeductions: "",
  totalDeductions: "",
  netSalary: "",
  rawText: "",
  notes: "",
};

const NUMERIC_KEYS = [
  "basic",
  "hra",
  "educationAllowance",
  "lta",
  "specialAllowance",
  "employerNpsContribution",
  "da",
  "bonus",
  "otherEarnings",
  "grossSalary",
  "pfEmployee",
  "pfEmployer",
  "esiEmployee",
  "professionalTax",
  "tds",
  "incomeTax",
  "npsDeduction",
  "otherDeductions",
  "totalDeductions",
  "netSalary",
];

function autoCompute(
  form: any,
  netSalaryTouched?: boolean,
  grossTouched?: boolean,
  deductTouched?: boolean
) {
  const earn = [
    "basic",
    "hra",
    "educationAllowance",
    "lta",
    "specialAllowance",
    "employerNpsContribution",
    "da",
    "bonus",
    "otherEarnings",
  ];
  const deduct = [
    "pfEmployee",
    "esiEmployee",
    "professionalTax",
    "tds",
    "incomeTax",
    "npsDeduction",
    "otherDeductions",
  ];
  const earnSum = earn.reduce((s, k) => s + Number(form[k] || 0), 0);
  const deductSum = deduct.reduce((s, k) => s + Number(form[k] || 0), 0);

  const effectiveGross =
    grossTouched && form.grossSalary !== "" && form.grossSalary !== undefined
      ? Number(form.grossSalary || 0)
      : earnSum || Number(form.grossSalary || 0);

  const effectiveDeduct =
    deductTouched && form.totalDeductions !== "" && form.totalDeductions !== undefined
      ? Number(form.totalDeductions || 0)
      : deductSum || Number(form.totalDeductions || 0);

  const computedNet = effectiveGross - effectiveDeduct;

  const finalGross = grossTouched
    ? form.grossSalary
    : earnSum
    ? String(earnSum)
    : form.grossSalary;

  const finalDeduct = deductTouched
    ? form.totalDeductions
    : deductSum
    ? String(deductSum)
    : form.totalDeductions;

  const finalNet = netSalaryTouched
    ? form.netSalary
    : effectiveGross > 0 || effectiveDeduct > 0
    ? String(computedNet)
    : form.netSalary;

  return {
    ...form,
    grossSalary: finalGross,
    totalDeductions: finalDeduct,
    netSalary: finalNet,
  };
}

// Shifts a "YYYY-MM" string by `delta` months (negative goes back in time).
function shiftMonth(ym: string, delta: number) {
  if (!ym) return today().slice(0, 7);
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Clones a source slip's components into a new slip structure, defaulting to next month.
function makeClonedSlip(sourceSlip: any, targetMonth?: string) {
  if (!sourceSlip) return { ...EMPTY, slipMonth: today().slice(0, 7) };
  const nextMonth = targetMonth || shiftMonth(sourceSlip.slipMonth || today().slice(0, 7), 1);
  return {
    ...EMPTY,
    owner: sourceSlip.owner || "self",
    employer: sourceSlip.employer || "",
    slipMonth: nextMonth,
    basic: sourceSlip.basic != null ? String(sourceSlip.basic) : "",
    hra: sourceSlip.hra != null ? String(sourceSlip.hra) : "",
    educationAllowance:
      sourceSlip.educationAllowance != null ? String(sourceSlip.educationAllowance) : "",
    lta: sourceSlip.lta != null ? String(sourceSlip.lta) : "",
    specialAllowance:
      sourceSlip.specialAllowance != null ? String(sourceSlip.specialAllowance) : "",
    employerNpsContribution:
      sourceSlip.employerNpsContribution != null ? String(sourceSlip.employerNpsContribution) : "",
    da: sourceSlip.da != null ? String(sourceSlip.da) : "",
    bonus: sourceSlip.bonus != null ? String(sourceSlip.bonus) : "",
    otherEarnings: sourceSlip.otherEarnings != null ? String(sourceSlip.otherEarnings) : "",
    grossSalary: sourceSlip.grossSalary != null ? String(sourceSlip.grossSalary) : "",
    pfEmployee: sourceSlip.pfEmployee != null ? String(sourceSlip.pfEmployee) : "",
    pfEmployer: sourceSlip.pfEmployer != null ? String(sourceSlip.pfEmployer) : "",
    esiEmployee: sourceSlip.esiEmployee != null ? String(sourceSlip.esiEmployee) : "",
    professionalTax:
      sourceSlip.professionalTax != null ? String(sourceSlip.professionalTax) : "",
    tds: sourceSlip.tds != null ? String(sourceSlip.tds) : "",
    incomeTax: sourceSlip.incomeTax != null ? String(sourceSlip.incomeTax) : "",
    npsDeduction: sourceSlip.npsDeduction != null ? String(sourceSlip.npsDeduction) : "",
    otherDeductions:
      sourceSlip.otherDeductions != null ? String(sourceSlip.otherDeductions) : "",
    totalDeductions:
      sourceSlip.totalDeductions != null ? String(sourceSlip.totalDeductions) : "",
    netSalary: sourceSlip.netSalary != null ? String(sourceSlip.netSalary) : "",
    notes: sourceSlip.notes || "",
    rawText: "",
    _clonedFromMonth: sourceSlip.slipMonth,
    _clonedFromEmployer: sourceSlip.employer,
  };
}

// Convert numbers into Indian Lakhs/Crores words for realistic digital payslip
function numberToIndianWords(num: number): string {
  if (!num || isNaN(num) || num <= 0) return "Zero Rupees Only";
  const single = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
  const double = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const formatTens = (n: number): string => {
    if (n < 10) return single[n];
    if (n < 20) return double[n - 10];
    return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + single[n % 10] : "");
  };

  const formatHundreds = (n: number): string => {
    let str = "";
    if (n >= 100) {
      str += single[Math.floor(n / 100)] + " Hundred ";
      n %= 100;
    }
    if (n > 0) {
      str += formatTens(n);
    }
    return str.trim();
  };

  let intPart = Math.floor(num);
  let words = "";

  const crore = Math.floor(intPart / 10000000);
  intPart %= 10000000;
  const lakh = Math.floor(intPart / 100000);
  intPart %= 100000;
  const thousand = Math.floor(intPart / 1000);
  intPart %= 1000;
  const hundred = intPart;

  if (crore > 0) words += formatHundreds(crore) + " Crore ";
  if (lakh > 0) words += formatHundreds(lakh) + " Lakh ";
  if (thousand > 0) words += formatHundreds(thousand) + " Thousand ";
  if (hundred > 0) words += formatHundreds(hundred) + " ";

  return (words.trim() + " Rupees Only").replace(/\s+/g, " ");
}

/* ─── CUSTOM TOOLTIP ──────────────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label, formatter }: any) => {
  if (!active || !payload?.length) return null;
  const visible = payload.filter((p: any) => p.value !== 0 && p.value != null);
  if (!visible.length) return null;
  return (
    <div
      style={{
        background: "color-mix(in srgb, var(--surface-0) 90%, transparent)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        border: `1.5px solid ${THEME.line}`,
        borderRadius: 12,
        padding: "12px 16px",
        boxShadow: "var(--shadow-lg)",
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 800, color: THEME.ink, marginBottom: 8, letterSpacing: "-0.01em" }}>
        {label}
      </div>
      {visible.map((p: any, i: number) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
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
          </div>
          <span style={{ fontWeight: 700, color: THEME.ink, fontVariantNumeric: "tabular-nums" }}>
            <Prv>{formatter ? formatter(p.value) : p.value}</Prv>
          </span>
        </div>
      ))}
    </div>
  );
};

/* ─── DIGITAL PAYSLIP MODAL COMPONENT ────────────────────────────────────── */
function DigitalPayslipModal({ slip, ownerName, onClose }: any) {
  const printRef = useRef<HTMLDivElement>(null);
  const monthDate = new Date(slip.slipMonth + "-01");
  const monthFormatted = monthDate.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

  const handlePrint = () => {
    window.print();
  };

  const gross = Number(slip.grossSalary || 0);
  const deductions = Number(slip.totalDeductions || 0);
  const net = Number(slip.netSalary || 0);
  const takeHomePct = gross > 0 ? ((net / gross) * 100).toFixed(1) : "0";

  const earningsList = [
    { label: "Basic Salary", val: Number(slip.basic || 0) },
    { label: "House Rent Allowance (HRA)", val: Number(slip.hra || 0) },
    { label: "Dearness Allowance (DA)", val: Number(slip.da || 0) },
    { label: "Special Allowance", val: Number(slip.specialAllowance || 0) },
    { label: "Leave Travel Allowance (LTA)", val: Number(slip.lta || 0) },
    { label: "Education Allowance", val: Number(slip.educationAllowance || 0) },
    { label: "Employer NPS Contribution", val: Number(slip.employerNpsContribution || 0) },
    { label: "Bonus / Incentives", val: Number(slip.bonus || 0) },
    { label: "Other Earnings / Reimbursements", val: Number(slip.otherEarnings || 0) },
  ].filter((item) => item.val > 0);

  const deductionsList = [
    { label: "Provident Fund (Employee)", val: Number(slip.pfEmployee || 0) },
    { label: "Provident Fund (Employer Share)", val: Number(slip.pfEmployer || 0) },
    { label: "Tax Deducted at Source (TDS)", val: Number(slip.tds || 0) },
    { label: "Income Tax", val: Number(slip.incomeTax || 0) },
    { label: "Professional Tax (PT)", val: Number(slip.professionalTax || 0) },
    { label: "NPS Employee Deduction", val: Number(slip.npsDeduction || 0) },
    { label: "ESI Contribution", val: Number(slip.esiEmployee || 0) },
    { label: "Other Statutory Deductions", val: Number(slip.otherDeductions || 0) },
  ].filter((item) => item.val > 0);

  return (
    <Modal title={`Digital Payslip — ${monthFormatted}`} onClose={onClose} maxWidth={800}>
      <div ref={printRef} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Enterprise Payslip Header */}
        <div
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 12%, var(--surface-0)), var(--surface-0))",
            border: `1.5px solid color-mix(in srgb, var(--accent) 25%, transparent)`,
            borderRadius: 16,
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Building size={20} color="var(--accent)" />
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: THEME.ink }}>
                {slip.employer || "Corporate Employer"}
              </h2>
            </div>
            <div style={{ fontSize: 12.5, color: THEME.muted, fontWeight: 500 }}>
              Official Monthly Salary Statement &bull; Pay Period:{" "}
              <strong style={{ color: THEME.ink }}>{monthFormatted}</strong>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <Badge variant="sage" style={{ fontSize: 11, padding: "4px 10px", fontWeight: 700 }}>
              <ShieldCheck size={13} style={{ marginRight: 4 }} /> Verified Slip Entry
            </Badge>
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
              Employee / Member: <strong>{ownerName}</strong>
            </div>
          </div>
        </div>

        {/* Dual Column Ledger: Earnings vs Deductions */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
          className="payslip-ledger-grid"
        >
          {/* Earnings Ledger */}
          <div
            style={{
              background: "var(--surface-0)",
              border: `1.5px solid ${THEME.line}`,
              borderTop: `4px solid ${THEME.sage}`,
              borderRadius: 14,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                  paddingBottom: 8,
                  borderBottom: `1px solid ${THEME.line}`,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: THEME.sage,
                  }}
                >
                  Earnings / Allowances
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: THEME.muted }}>Amount</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {earningsList.length > 0 ? (
                  earningsList.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12.5,
                        color: THEME.ink,
                      }}
                    >
                      <span style={{ color: THEME.muted }}>{item.label}</span>
                      <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        <Money value={item.val} variant="full" />
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 12, color: THEME.muted, fontStyle: "italic" }}>
                    Standard gross compensation
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 12,
                marginTop: 16,
                borderTop: `1.5px dashed ${THEME.line}`,
                fontWeight: 800,
                fontSize: 13.5,
                color: THEME.ink,
              }}
            >
              <span>Gross Salary</span>
              <span style={{ color: THEME.sage, fontFamily: "var(--font-display)" }}>
                <Money value={gross} variant="full" />
              </span>
            </div>
          </div>

          {/* Deductions Ledger */}
          <div
            style={{
              background: "var(--surface-0)",
              border: `1.5px solid ${THEME.line}`,
              borderTop: `4px solid ${THEME.rust}`,
              borderRadius: 14,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                  paddingBottom: 8,
                  borderBottom: `1px solid ${THEME.line}`,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: THEME.rust,
                  }}
                >
                  Deductions & Withholdings
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: THEME.muted }}>Amount</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {deductionsList.length > 0 ? (
                  deductionsList.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12.5,
                        color: THEME.ink,
                      }}
                    >
                      <span style={{ color: THEME.muted }}>{item.label}</span>
                      <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        <Money value={item.val} variant="full" />
                      </span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 12, color: THEME.muted, fontStyle: "italic" }}>
                    No deductions recorded
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: 12,
                marginTop: 16,
                borderTop: `1.5px dashed ${THEME.line}`,
                fontWeight: 800,
                fontSize: 13.5,
                color: THEME.ink,
              }}
            >
              <span>Total Deductions</span>
              <span style={{ color: THEME.rust, fontFamily: "var(--font-display)" }}>
                <Money value={deductions} variant="full" />
              </span>
            </div>
          </div>
        </div>

        {/* Net Take-Home Highlight Card with Words Representation */}
        <div
          style={{
            background: "linear-gradient(135deg, color-mix(in srgb, var(--t-accent) 12%, var(--surface-0)), var(--surface-0))",
            border: `1.5px solid ${THEME.line}`,
            borderRadius: 16,
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Net Disbursed Take-Home Salary
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 26,
                fontWeight: 800,
                color: THEME.sage,
                marginTop: 2,
              }}
            >
              <Money value={net} variant="full" />
            </div>
            <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 4, fontStyle: "italic" }}>
              ({numberToIndianWords(net)})
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Badge variant="accent" style={{ fontSize: 11 }}>
                {takeHomePct}% Retention
              </Badge>
              <Badge variant="muted" style={{ fontSize: 11 }}>
                Gross: <Money value={gross} variant="full" />
              </Badge>
            </div>
            {slip.notes && (
              <div style={{ fontSize: 11, color: THEME.muted, maxWidth: 300, textAlign: "right" }}>
                Remarks: {slip.notes}
              </div>
            )}
          </div>
        </div>

        {/* Print / Action Footer */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <Printer size={14} style={{ marginRight: 6 }} /> Print / Save PDF
          </Button>
          <Button variant="primary" size="sm" onClick={onClose}>
            Close Payslip
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ─── SLIP FORM (ADD / EDIT) ──────────────────────────────────────────────── */
function SlipForm({
  initial,
  onSave,
  onClose,
  apiKey,
  existingSlips,
  familyProfiles,
  saving = false,
}: any) {
  const initialClean = Object.fromEntries(
    Object.entries(initial || {}).filter(([, v]) => v !== null && v !== undefined)
  );
  const [form, setForm] = useState({ ...EMPTY, ...initialClean });
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [netSalaryTouched, setNetSalaryTouched] = useState(false);
  const [grossTouched, setGrossTouched] = useState(false);
  const [deductTouched, setDeductTouched] = useState(false);
  const [showAiBox, setShowAiBox] = useState(!initial?.id && !!apiKey);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const eligibleCopySlips = useMemo(() => {
    return (existingSlips || [])
      .filter((s: any) => s.id !== initial?.id)
      .sort((a: any, b: any) => (b.slipMonth || "").localeCompare(a.slipMonth || ""));
  }, [existingSlips, initial]);

  const handleCopyFromSlip = (sourceId: string) => {
    const src = (existingSlips || []).find((s: any) => s.id === sourceId);
    if (!src) return;
    setForm((prev: any) => ({
      ...prev,
      employer: src.employer || prev.employer,
      basic: src.basic != null ? String(src.basic) : "",
      hra: src.hra != null ? String(src.hra) : "",
      educationAllowance:
        src.educationAllowance != null ? String(src.educationAllowance) : "",
      lta: src.lta != null ? String(src.lta) : "",
      specialAllowance: src.specialAllowance != null ? String(src.specialAllowance) : "",
      employerNpsContribution:
        src.employerNpsContribution != null ? String(src.employerNpsContribution) : "",
      da: src.da != null ? String(src.da) : "",
      bonus: src.bonus != null ? String(src.bonus) : "",
      otherEarnings: src.otherEarnings != null ? String(src.otherEarnings) : "",
      grossSalary: src.grossSalary != null ? String(src.grossSalary) : "",
      pfEmployee: src.pfEmployee != null ? String(src.pfEmployee) : "",
      pfEmployer: src.pfEmployer != null ? String(src.pfEmployer) : "",
      esiEmployee: src.esiEmployee != null ? String(src.esiEmployee) : "",
      professionalTax: src.professionalTax != null ? String(src.professionalTax) : "",
      tds: src.tds != null ? String(src.tds) : "",
      incomeTax: src.incomeTax != null ? String(src.incomeTax) : "",
      npsDeduction: src.npsDeduction != null ? String(src.npsDeduction) : "",
      otherDeductions: src.otherDeductions != null ? String(src.otherDeductions) : "",
      totalDeductions: src.totalDeductions != null ? String(src.totalDeductions) : "",
      netSalary: src.netSalary != null ? String(src.netSalary) : "",
      _clonedFromMonth: src.slipMonth,
      _clonedFromEmployer: src.employer,
    }));
    setNetSalaryTouched(false);
    setGrossTouched(false);
    setDeductTouched(false);
  };

  const parseWithAI = useCallback(async () => {
    if (!form.rawText.trim()) return;
    if (!apiKey) {
      setParseError("Add your Gemini API key in Settings to use AI parsing.");
      return;
    }
    setParsing(true);
    setParseError("");
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const prompt = `You are a salary slip parser. Extract the following fields from this Indian salary slip text.
Return ONLY a valid JSON object with these keys (numbers only, no currency symbols, 0 if not found):
basic, hra, educationAllowance, lta, specialAllowance, employerNpsContribution, da, bonus, otherEarnings, grossSalary, pfEmployee, pfEmployer, esiEmployee, professionalTax, tds, incomeTax, npsDeduction, otherDeductions, totalDeductions, netSalary, employer, slipMonth (YYYY-MM format)

Salary slip text:
${form.rawText}

Return only the JSON, no explanation.`;

      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim();
      const fenceStripped = raw.replace(/```json?/gi, "").replace(/```/g, "").trim();
      const braceMatch = fenceStripped.match(/\{[\s\S]*\}/);
      const json = JSON.parse(braceMatch ? braceMatch[0] : fenceStripped);

      const sanitized: any = { ...json };
      if (sanitized.slipMonth && !/^\d{4}-\d{2}$/.test(String(sanitized.slipMonth))) {
        delete sanitized.slipMonth;
      }
      NUMERIC_KEYS.forEach((k) => {
        if (sanitized[k] != null && sanitized[k] !== "") {
          const n = Number(String(sanitized[k]).replace(/[₹,\s]/g, ""));
          if (!isNaN(n)) sanitized[k] = n;
        }
      });

      setForm((f: any) => ({
        ...f,
        ...Object.fromEntries(
          Object.entries(sanitized).filter(([, v]) => v !== undefined && v !== null && v !== "")
        ),
      }));
    } catch (e: any) {
      setParseError("Parsing failed: " + (e?.message || "Unknown error"));
    } finally {
      setParsing(false);
    }
  }, [form.rawText, apiKey]);

  const computed = autoCompute(form, netSalaryTouched, grossTouched, deductTouched);
  const netExceedsGross =
    Number(computed.netSalary) > 0 &&
    Number(computed.grossSalary) > 0 &&
    Number(computed.netSalary) > Number(computed.grossSalary);

  const duplicate = (existingSlips || []).find(
    (s: any) => s.owner === form.owner && s.slipMonth === form.slipMonth && s.id !== initial?.id
  );
  const duplicateOwnerName =
    duplicate && (familyProfiles.find((p: any) => p.id === duplicate.owner)?.name || duplicate.owner);

  const save = () => {
    if (!form.slipMonth || duplicate) return;
    const cleanPayload = Object.fromEntries(
      Object.entries(computed).filter(([k]) => !k.startsWith("_"))
    );
    onSave({ ...cleanPayload, id: initial?.id || uid() });
  };

  return (
    <Modal
      title={initial?.id ? "Edit Salary Slip" : "Add Salary Slip"}
      onClose={onClose}
      maxWidth={800}
    >
      <style>{`
        .salary-form-dual-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        .salary-slip-info-grid {
          display: grid;
          grid-template-columns: 1.2fr 1.5fr 1fr;
          gap: 12px;
          margin-bottom: 12px;
        }
        @media (max-width: 680px) {
          .salary-form-dual-grid { grid-template-columns: 1fr !important; }
          .salary-slip-info-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {form._clonedFromMonth && !initial?.id && (
        <div
          style={{
            background: "color-mix(in srgb, var(--accent) 8%, var(--surface-0))",
            border: `1.5px solid color-mix(in srgb, var(--accent) 25%, transparent)`,
            borderRadius: 12,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            marginBottom: 16,
            fontSize: 12.5,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: THEME.ink }}>
            <Sparkles size={15} color="var(--accent)" style={{ flexShrink: 0 }} />
            <span>
              Pre-filled from{" "}
              <strong>
                {new Date(form._clonedFromMonth + "-01").toLocaleDateString("en-IN", {
                  month: "short",
                  year: "numeric",
                })}
              </strong>
              {form._clonedFromEmployer ? ` (${form._clonedFromEmployer})` : ""}. Review and click Save, or tweak values.
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              setForm({
                ...EMPTY,
                owner: form.owner,
                slipMonth: form.slipMonth,
                employer: form.employer,
              })
            }
            style={{
              background: "transparent",
              border: "none",
              color: THEME.muted,
              fontSize: 11.5,
              cursor: "pointer",
              textDecoration: "underline",
              whiteSpace: "nowrap",
              padding: 0,
            }}
          >
            Clear to blank
          </button>
        </div>
      )}

      {/* Primary Details */}
      <div className="salary-slip-info-grid">
        <Field label="Pay Month *" style={{ marginBottom: 0 }}>
          <input
            className="form-input"
            type="month"
            value={form.slipMonth}
            onChange={(e) => set("slipMonth", e.target.value)}
            style={duplicate ? { borderColor: THEME.rust } : undefined}
          />
        </Field>
        <Field label="Employer / Company *" style={{ marginBottom: 0 }}>
          <input
            className="form-input"
            value={form.employer}
            onChange={(e) => set("employer", e.target.value)}
            placeholder="e.g. Google India Pvt Ltd"
          />
        </Field>
        <Field label="Family Member" style={{ marginBottom: 0 }}>
          <select
            className="form-input"
            value={form.owner}
            onChange={(e) => set("owner", e.target.value)}
          >
            {familyProfiles.map((p: any) => (
              <option key={p.id} value={p.id}>
                {formatProfileOption(p)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {duplicate && (
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            fontSize: 12,
            color: THEME.rust,
            fontWeight: 600,
            marginBottom: 16,
            padding: "8px 12px",
            borderRadius: 10,
            background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
            border: `1.5px solid color-mix(in srgb, ${THEME.rust} 25%, transparent)`,
          }}
        >
          <AlertCircle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>
            A slip for {duplicateOwnerName} in{" "}
            {new Date(form.slipMonth + "-01").toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
            })}{" "}
            already exists. Edit that entry instead, or pick a different month.
          </span>
        </div>
      )}

      {/* Fast Tools: Clone Past Month & AI Extraction Toggle */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        {eligibleCopySlips.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 260 }}>
            <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 500, whiteSpace: "nowrap" }}>
              <Copy size={13} style={{ display: "inline", marginRight: 4 }} /> Copy from:
            </span>
            <select
              className="form-input"
              style={{ fontSize: 12, padding: "5px 10px", height: "auto" }}
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  handleCopyFromSlip(e.target.value);
                  e.target.value = "";
                }
              }}
            >
              <option value="" disabled>
                Select past month to copy structure...
              </option>
              {eligibleCopySlips.map((sl: any) => (
                <option key={sl.id} value={sl.id}>
                  {new Date(sl.slipMonth + "-01").toLocaleDateString("en-IN", {
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  — {sl.employer || "Employer"} (Net: ₹{Number(sl.netSalary || 0).toLocaleString("en-IN")})
                </option>
              ))}
            </select>
          </div>
        )}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setShowAiBox(!showAiBox)}
          style={{ fontSize: 12 }}
        >
          <Sparkles size={13} color="var(--accent)" style={{ marginRight: 6 }} />
          {showAiBox ? "Hide AI Parser" : "AI Text Auto-Fill"}
        </Button>
      </div>

      {/* AI Smart Parser Dropzone */}
      {showAiBox && (
        <div
          style={{
            background: "color-mix(in srgb, var(--accent) 5%, var(--surface-0))",
            border: `1.5px solid color-mix(in srgb, var(--accent) 30%, transparent)`,
            borderRadius: 14,
            padding: 16,
            marginBottom: 16,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={14} color="var(--accent)" />
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--accent)" }}>
                Gemini AI Smart Extraction
              </span>
            </div>
            {!apiKey && (
              <span style={{ fontSize: 11, color: THEME.rust, fontWeight: 600 }}>
                (Gemini API key required in Settings)
              </span>
            )}
          </div>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Paste text directly from your salary slip PDF here... Gemini AI will extract Basic, HRA, Allowances, PF, TDS, and Net Pay automatically."
            value={form.rawText}
            onChange={(e) => set("rawText", e.target.value)}
            style={{ marginBottom: 10, fontSize: 12.5 }}
          />
          {parseError && (
            <div style={{ fontSize: 12, color: THEME.danger, marginBottom: 8, fontWeight: 600 }}>
              {parseError}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Button size="sm" onClick={parseWithAI} disabled={parsing || !form.rawText.trim() || !apiKey}>
              {parsing ? (
                <>
                  <Loader size={12} className="spin" style={{ marginRight: 6 }} /> Parsing Payroll...
                </>
              ) : (
                <>
                  <Sparkles size={12} style={{ marginRight: 6 }} /> Auto-Fill All Fields
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Side-by-Side Dual Ledger Form */}
      <div className="salary-form-dual-grid">
        {/* Earnings Card Column */}
        <div
          style={{
            background: "var(--surface-0)",
            border: `1.5px solid ${THEME.line}`,
            borderTop: `4px solid ${THEME.sage}`,
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 11.5,
              color: THEME.sage,
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Earnings Components</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: THEME.muted }}>Amount (₹)</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["basic", "Basic Salary *"],
              ["hra", "House Rent Allowance (HRA)"],
              ["da", "Dearness Allowance (DA)"],
              ["specialAllowance", "Special Allowance"],
              ["lta", "Leave Travel Allowance (LTA)"],
              ["educationAllowance", "Education Allowance"],
              ["employerNpsContribution", "Employer NPS Contribution"],
              ["bonus", "Bonus / Incentives"],
              ["otherEarnings", "Other Earnings"],
            ].map(([k, label]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <label style={{ fontSize: 12, color: THEME.ink, fontWeight: 500, flex: 1.2 }}>
                  {label}
                </label>
                <input
                  className="form-input"
                  type="number"
                  value={form[k]}
                  onChange={(e) => set(k, e.target.value)}
                  placeholder="0"
                  style={{ width: 120, textAlign: "right", padding: "5px 8px", fontSize: 12.5 }}
                />
              </div>
            ))}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                paddingTop: 10,
                marginTop: 6,
                borderTop: `1.5px dashed ${THEME.line}`,
              }}
            >
              <label style={{ fontSize: 12.5, color: THEME.sage, fontWeight: 800 }}>
                Gross Salary *
              </label>
              <input
                className="form-input"
                type="number"
                value={
                  grossTouched
                    ? form.grossSalary
                    : form.grossSalary || computed.grossSalary || ""
                }
                onChange={(e) => {
                  setGrossTouched(true);
                  set("grossSalary", e.target.value);
                }}
                placeholder="0"
                style={{
                  width: 130,
                  textAlign: "right",
                  padding: "6px 8px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: THEME.sage,
                }}
              />
            </div>
          </div>
        </div>

        {/* Deductions Card Column */}
        <div
          style={{
            background: "var(--surface-0)",
            border: `1.5px solid ${THEME.line}`,
            borderTop: `4px solid ${THEME.rust}`,
            borderRadius: 14,
            padding: 16,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 11.5,
              color: THEME.rust,
              marginBottom: 12,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>Deductions & Withholdings</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: THEME.muted }}>Amount (₹)</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["pfEmployee", "PF (Employee Share)"],
              ["pfEmployer", "PF (Employer Share)"],
              ["tds", "Tax Deducted (TDS)"],
              ["incomeTax", "Income Tax (Advance)"],
              ["professionalTax", "Professional Tax (PT)"],
              ["npsDeduction", "NPS Employee Contribution"],
              ["esiEmployee", "ESI Contribution"],
              ["otherDeductions", "Other Deductions"],
            ].map(([k, label]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <label style={{ fontSize: 12, color: THEME.ink, fontWeight: 500, flex: 1.2 }}>
                  {label}
                </label>
                <input
                  className="form-input"
                  type="number"
                  value={form[k]}
                  onChange={(e) => set(k, e.target.value)}
                  placeholder="0"
                  style={{ width: 120, textAlign: "right", padding: "5px 8px", fontSize: 12.5 }}
                />
              </div>
            ))}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                paddingTop: 10,
                marginTop: 6,
                borderTop: `1.5px dashed ${THEME.line}`,
              }}
            >
              <label style={{ fontSize: 12.5, color: THEME.rust, fontWeight: 800 }}>
                Total Deductions *
              </label>
              <input
                className="form-input"
                type="number"
                value={
                  deductTouched
                    ? form.totalDeductions
                    : form.totalDeductions || computed.totalDeductions || ""
                }
                onChange={(e) => {
                  setDeductTouched(true);
                  set("totalDeductions", e.target.value);
                }}
                placeholder="0"
                style={{
                  width: 130,
                  textAlign: "right",
                  padding: "6px 8px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: THEME.rust,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Net Salary Summary & Calculation Preview */}
      <div
        style={{
          background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--surface-0)), var(--surface-0))",
          border: `1.5px solid ${THEME.line}`,
          borderLeft: `5px solid ${netExceedsGross ? THEME.rust : THEME.sage}`,
          borderRadius: 14,
          padding: "16px 20px",
          marginBottom: 16,
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: THEME.muted }}>
            Calculated Net Take-Home Salary
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 24,
              fontWeight: 800,
              color: netExceedsGross ? THEME.rust : THEME.sage,
              marginTop: 2,
            }}
          >
            {computed.netSalary ? <Money value={Number(computed.netSalary)} variant="full" /> : "—"}
          </div>
          {computed.grossSalary > 0 && (
            <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 4 }}>
              Gross: <Money value={Number(computed.grossSalary)} variant="full" /> &bull; Deductions:{" "}
              <Money value={Number(computed.totalDeductions || 0)} variant="full" />
            </div>
          )}
        </div>

        <div style={{ minWidth: 200 }}>
          <Field label="Net Salary Override (₹) *" style={{ marginBottom: 0 }}>
            <input
              className="form-input"
              type="number"
              value={
                netSalaryTouched
                  ? form.netSalary
                  : form.netSalary || computed.netSalary || ""
              }
              onChange={(e) => {
                setNetSalaryTouched(true);
                set("netSalary", e.target.value);
              }}
              placeholder="Take-home amount"
              style={{ fontWeight: 700, textAlign: "right" }}
            />
          </Field>
        </div>
      </div>

      {netExceedsGross && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 16,
            fontSize: 12,
            color: THEME.rust,
            fontWeight: 600,
            padding: "8px 12px",
            borderRadius: 10,
            background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
          }}
        >
          <AlertCircle size={14} /> Net salary is higher than gross — please verify your earnings and deduction components.
        </div>
      )}

      <Field label="Notes / Remarks">
        <input
          className="form-input"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="e.g. Appraisal increment, quarterly performance bonus, arrears"
        />
      </Field>

      <ModalActions onSave={save} onClose={onClose} saveLabel="Save Slip" disabled={saving} loading={saving} />
    </Modal>
  );
}

/* ─── MAIN SALARY SLIP TRACKER TAB ────────────────────────────────────────── */
export function SalarySlipTab({ state, addItem, removeItem, updateItem, showToast }: any) {
  const { familyProfiles } = useMasterData();
  const { privacyMode } = usePrivacy();
  const slips: any[] = state.salarySlips || [];
  const [modal, setModal] = useState<any>(null);
  const [payslipModal, setPayslipModal] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [fyFilter, setFyFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"cards" | "table" | "analytics">("cards");
  const [chartTab, setChartTab] = useState<"overview" | "earnings" | "deductions" | "retention">("overview");
  const [sortField, setSortField] = useState<"month" | "net" | "gross" | "employer">("month");
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const apiKey = state?.settings?.geminiApiKey || "";

  const ownerName = (id: string) => familyProfiles.find((p: any) => p.id === id)?.name || id;

  const distinctOwners = useMemo(
    () => Array.from(new Set(slips.map((s) => s.owner).filter(Boolean))),
    [slips]
  );
  const isMultiOwner = distinctOwners.length > 1;
  const showingCombined = isMultiOwner && ownerFilter === "all";

  // Distinct FYs available in dataset
  const availableFYs = useMemo(() => {
    const set = new Set<string>();
    slips.forEach((s) => {
      if (s.slipMonth) {
        const [y, m] = s.slipMonth.split("-").map(Number);
        const startY = m >= 4 ? y : y - 1;
        set.add(`FY ${startY}-${String(startY + 1).slice(-2)}`);
      }
    });
    return Array.from(set).sort().reverse();
  }, [slips]);

  // Current financial year (Apr–Mar) window
  const currentFY = getCurrentFY();
  const fyStartYear = getCurrentFYStartYear();
  const fyStartMonth = `${fyStartYear}-04`;
  const fyEndMonth = `${fyStartYear + 1}-03`;
  const fyLabel = `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;

  // Owner filter
  const ownerFiltered = useMemo(() => {
    return ownerFilter === "all" ? slips : slips.filter((s) => s.owner === ownerFilter);
  }, [slips, ownerFilter]);

  // FY filter applied to data
  const fyFiltered = useMemo(() => {
    if (fyFilter === "all") return ownerFiltered;
    return ownerFiltered.filter((s) => {
      if (!s.slipMonth) return false;
      const [y, m] = s.slipMonth.split("-").map(Number);
      const startY = m >= 4 ? y : y - 1;
      return `FY ${startY}-${String(startY + 1).slice(-2)}` === fyFilter;
    });
  }, [ownerFiltered, fyFilter]);

  const ownerSorted = useMemo(() => {
    return [...ownerFiltered].sort((a, b) => b.slipMonth.localeCompare(a.slipMonth));
  }, [ownerFiltered]);

  const latest = ownerSorted[0];

  // Search filter
  const searchLower = search.trim().toLowerCase();
  const searched = useMemo(() => {
    if (!searchLower) return fyFiltered;
    return fyFiltered.filter((s) => {
      const monthLabel = new Date(s.slipMonth + "-01")
        .toLocaleDateString("en-IN", { month: "long", year: "numeric" })
        .toLowerCase();
      return (
        (s.employer || "").toLowerCase().includes(searchLower) ||
        monthLabel.includes(searchLower) ||
        s.slipMonth.includes(searchLower) ||
        ownerName(s.owner).toLowerCase().includes(searchLower)
      );
    });
  }, [fyFiltered, searchLower]);

  // Sorting
  const listSorted = useMemo(() => {
    return [...searched].sort((a, b) => {
      let cmp = 0;
      if (sortField === "month") {
        cmp = a.slipMonth.localeCompare(b.slipMonth);
      } else if (sortField === "net") {
        cmp = Number(a.netSalary || 0) - Number(b.netSalary || 0);
      } else if (sortField === "gross") {
        cmp = Number(a.grossSalary || 0) - Number(b.grossSalary || 0);
      } else if (sortField === "employer") {
        cmp = (a.employer || "").localeCompare(b.employer || "");
      }
      return sortDirection === "desc" ? -cmp : cmp;
    });
  }, [searched, sortField, sortDirection]);

  // Current FY slips for KPI calculations
  const fySlips = useMemo(() => {
    return ownerFiltered.filter(
      (sl) => sl.slipMonth >= fyStartMonth && sl.slipMonth <= fyEndMonth
    );
  }, [ownerFiltered, fyStartMonth, fyEndMonth]);

  const totalTDS = fySlips.reduce((s, sl) => s + Number(sl.tds || 0) + Number(sl.incomeTax || 0), 0);
  const totalPF = fySlips.reduce(
    (s, sl) => s + Number(sl.pfEmployee || 0) + Number(sl.pfEmployer || 0),
    0
  );
  const avgNet = fySlips.length
    ? fySlips.reduce((s, sl) => s + Number(sl.netSalary || 0), 0) / fySlips.length
    : 0;
  const allTimeAvgNet = ownerFiltered.length
    ? ownerFiltered.reduce((s, sl) => s + Number(sl.netSalary || 0), 0) / ownerFiltered.length
    : 0;
  const combinedNote = showingCombined ? ` · ${distinctOwners.length} members combined` : "";

  // Month-over-month change for latest slip
  const latestOwnerHistory = latest ? ownerSorted.filter((s) => s.owner === latest.owner) : [];
  const prevSlip = latestOwnerHistory[1];
  const momPct =
    latest && prevSlip && Number(prevSlip.netSalary) > 0
      ? ((Number(latest.netSalary) - Number(prevSlip.netSalary)) / Number(prevSlip.netSalary)) * 100
      : null;

  // Year-over-year change
  const yoySlip = latest
    ? latestOwnerHistory.find((s) => s.slipMonth === shiftMonth(latest.slipMonth, -12))
    : null;
  const yoyPct =
    latest && yoySlip && Number(yoySlip.netSalary) > 0
      ? ((Number(latest.netSalary) - Number(yoySlip.netSalary)) / Number(yoySlip.netSalary)) * 100
      : null;

  // Annualized Run-Rate (12 * latest or 12 * avgNet)
  const annualizedTakeHome = latest ? Number(latest.netSalary || 0) * 12 : avgNet * 12;
  const annualizedGross = latest ? Number(latest.grossSalary || 0) * 12 : 0;
  const retentionRate = latest && Number(latest.grossSalary) > 0
    ? ((Number(latest.netSalary) / Number(latest.grossSalary)) * 100).toFixed(1)
    : null;

  const lastNetSubParts: string[] = [];
  if (showingCombined && latest) lastNetSubParts.push(ownerName(latest.owner));
  if (momPct !== null) lastNetSubParts.push(`${momPct >= 0 ? "↑" : "↓"}${Math.abs(momPct).toFixed(1)}% MoM`);
  const lastNetSub = lastNetSubParts.join(" · ") || undefined;
  const lastNetSubColor = momPct !== null ? (momPct >= 0 ? THEME.sage : THEME.rust) : undefined;

  // Chart data formatting (chronological)
  const chartData = useMemo(() => {
    return ownerSorted
      .slice(0, 18)
      .reverse()
      .map((s) => {
        const dateLabel = new Date(s.slipMonth + "-01").toLocaleDateString("en-IN", {
          month: "short",
          year: "2-digit",
        });
        const grossVal = Number(s.grossSalary || 0);
        const netVal = Number(s.netSalary || 0);
        const tdsVal = Number(s.tds || 0) + Number(s.incomeTax || 0);
        const pfVal = Number(s.pfEmployee || 0) + Number(s.pfEmployer || 0);
        const basicVal = Number(s.basic || 0);
        const hraVal = Number(s.hra || 0);
        const bonusVal = Number(s.bonus || 0);
        const allowVal = Math.max(0, grossVal - basicVal - hraVal - bonusVal);
        const otherDeductVal = Math.max(0, Number(s.totalDeductions || 0) - tdsVal - pfVal);
        const retentionPct = grossVal > 0 ? Number(((netVal / grossVal) * 100).toFixed(1)) : 0;

        return {
          month: showingCombined ? `${dateLabel} · ${ownerName(s.owner).split(" ")[0]}` : dateLabel,
          fullMonth: s.slipMonth,
          Gross: grossVal,
          Net: netVal,
          TDS: tdsVal,
          PF: pfVal,
          Basic: basicVal,
          HRA: hraVal,
          Bonus: bonusVal,
          Allowances: allowVal,
          OtherDeductions: otherDeductVal,
          RetentionRate: retentionPct,
        };
      });
  }, [ownerSorted, showingCombined]);

  const { run: save, loading: savingSlip } = useAsyncAction(
    async (data: any) => {
      if (data.id && slips.find((s: any) => s.id === data.id)) {
        await updateItem("salarySlips", data.id, data);
        showToast?.("Salary slip updated successfully", "success");
      } else {
        await addItem("salarySlips", data);
        showToast?.("Salary slip added successfully", "success");
      }
    },
    {
      onSuccess: () => setModal(null),
      onError: (e: any) =>
        showToast?.(`Failed to save salary slip: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: deleteSlip } = useAsyncAction(
    async (id: string) => {
      await removeItem("salarySlips", id);
      showToast?.("Salary slip deleted", "info");
    },
    {
      onError: (e: any) =>
        showToast?.(`Failed to delete salary slip: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const handleExportCSV = () => {
    exportArrayToCSV(
      listSorted.map((s) => ({
        ...s,
        ownerLabel: ownerName(s.owner),
        monthLabel: new Date(s.slipMonth + "-01").toLocaleDateString("en-IN", {
          month: "short",
          year: "numeric",
        }),
      })),
      [
        { key: "monthLabel", label: "Month" },
        { key: "ownerLabel", label: "Owner" },
        { key: "employer", label: "Employer" },
        { key: "basic", label: "Basic" },
        { key: "hra", label: "HRA" },
        { key: "educationAllowance", label: "Education Allowance" },
        { key: "lta", label: "LTA" },
        { key: "specialAllowance", label: "Special Allowance" },
        { key: "employerNpsContribution", label: "Employer NPS Contribution" },
        { key: "da", label: "DA" },
        { key: "bonus", label: "Bonus" },
        { key: "otherEarnings", label: "Other Earnings" },
        { key: "grossSalary", label: "Gross Salary" },
        { key: "pfEmployee", label: "PF (Employee)" },
        { key: "pfEmployer", label: "PF (Employer)" },
        { key: "esiEmployee", label: "ESI" },
        { key: "professionalTax", label: "Professional Tax" },
        { key: "tds", label: "TDS" },
        { key: "incomeTax", label: "Income Tax" },
        { key: "npsDeduction", label: "NPS Deduction" },
        { key: "otherDeductions", label: "Other Deductions" },
        { key: "totalDeductions", label: "Total Deductions" },
        { key: "netSalary", label: "Net Salary" },
        { key: "notes", label: "Notes" },
      ],
      `Salary_Slips_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  const openNewSlip = (sourceSlip?: any) => {
    if (sourceSlip) {
      setModal(makeClonedSlip(sourceSlip));
      return;
    }
    const relevantSlips =
      ownerFilter === "all" ? slips : slips.filter((s: any) => s.owner === ownerFilter);
    const sorted = [...relevantSlips].sort((a: any, b: any) =>
      (b.slipMonth || "").localeCompare(a.slipMonth || "")
    );
    const latestSlip = sorted[0] || slips[0];

    if (latestSlip) {
      setModal(makeClonedSlip(latestSlip));
    } else {
      setModal({ ...EMPTY, slipMonth: today().slice(0, 7) });
    }
  };

  // Totals for table summary footer
  const tableTotals = useMemo(() => {
    return listSorted.reduce(
      (acc, s) => {
        acc.gross += Number(s.grossSalary || 0);
        acc.basic += Number(s.basic || 0);
        acc.hra += Number(s.hra || 0);
        acc.tds += Number(s.tds || 0) + Number(s.incomeTax || 0);
        acc.pf += Number(s.pfEmployee || 0) + Number(s.pfEmployer || 0);
        acc.deductions += Number(s.totalDeductions || 0);
        acc.net += Number(s.netSalary || 0);
        return acc;
      },
      { gross: 0, basic: 0, hra: 0, tds: 0, pf: 0, deductions: 0, net: 0 }
    );
  }, [listSorted]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Top Hero SectionTitle */}
      <SectionTitle
        sub="Track compensation packages, take-home trends, PF wealth accrual, and tax withholdings with 1-click cloning and Gemini AI parsing"
        rightElement={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {latest && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => openNewSlip(latest)}
                className="hide-mobile"
              >
                <CopyPlus size={14} style={{ marginRight: 6 }} /> Auto-fill Next Month
              </Button>
            )}
            <Button size="sm" onClick={() => openNewSlip()}>
              <Plus size={14} style={{ marginRight: 4 }} /> Add Slip
            </Button>
          </div>
        }
      >
        Salary Slip Tracker
      </SectionTitle>

      {/* AI Key Tip when empty */}
      {!apiKey && slips.length === 0 && (
        <div
          style={{
            background: "var(--surface-0)",
            border: `1.5px dashed color-mix(in srgb, var(--accent) 30%, transparent)`,
            borderRadius: 14,
            padding: "16px 20px",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <Sparkles size={16} color="var(--accent)" style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 500 }}>
            <strong style={{ color: "var(--accent)", fontWeight: 700 }}>
              Gemini AI Payroll Parsing Available.
            </strong>{" "}
            Add your Gemini API key in Settings to paste raw salary slips or PDF copy-paste and extract all
            earnings and deductions instantly.
          </div>
        </div>
      )}

      {slips.length === 0 ? (
        <EmptyState
          icon={FileText}
          gradient={`linear-gradient(135deg, ${THEME.accent} 0%, color-mix(in srgb, var(--t-accent) 65%, white) 100%)`}
          dotColor={THEME.accent}
          title="No Salary Slips Tracked"
          description="Log and analyze your monthly compensation slips to monitor take-home pay, TDS deducted, PF savings, and payroll growth momentum."
          pills={[
            "1-Click Auto-Fill",
            "AI Auto-Parse",
            "Digital Paystub Preview",
            "Gross vs Net Trend",
            "TDS & PF Breakdown",
          ]}
          buttonLabel="Add First Slip"
          onAdd={() => openNewSlip()}
        />
      ) : (
        <>
          {/* Quick Auto-Fill Smart Next-Month Banner */}
          {latest && (
            <div
              style={{
                background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 10%, var(--surface-0)), var(--surface-0))",
                border: `1.5px solid color-mix(in srgb, var(--accent) 25%, transparent)`,
                borderRadius: 16,
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "color-mix(in srgb, var(--accent) 16%, transparent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent)",
                    flexShrink: 0,
                  }}
                >
                  <Zap size={20} />
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: THEME.ink, display: "flex", alignItems: "center", gap: 8 }}>
                    <span>
                      Auto-fill next month:{" "}
                      <strong>
                        {new Date(shiftMonth(latest.slipMonth, 1) + "-01").toLocaleDateString("en-IN", {
                          month: "long",
                          year: "numeric",
                        })}
                      </strong>
                    </span>
                    <Badge variant="sage" style={{ fontSize: 10, padding: "2px 8px" }}>
                      Ready to Clone
                    </Badge>
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 500, marginTop: 2 }}>
                    {latest.employer || "Employer"} &bull; Last Net Take-Home:{" "}
                    <strong style={{ color: THEME.sage }}>
                      <Money value={latest.netSalary} variant="full" />
                    </strong>{" "}
                    &bull; Pre-fills all allowances and statutory deductions with 1 click
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Button size="sm" onClick={() => openNewSlip(latest)}>
                  <CopyPlus size={14} style={{ marginRight: 6 }} /> Add Next Month's Slip
                </Button>
              </div>
            </div>
          )}

          {/* Executive KPI Stats Summary Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 16,
            }}
          >
            {latest && (
              <StatCard
                label="Last Net Salary"
                value={fmtINRFull(Number(latest.netSalary || 0))}
                numericValue={Number(latest.netSalary || 0)}
                formatValue={fmtINRFull}
                sub={lastNetSub}
                subColor={lastNetSubColor}
                icon={<IndianRupee />}
                color={THEME.sage}
              />
            )}
            <StatCard
              label={`Avg Monthly Net (${fyLabel})`}
              value={fmtINRFull(avgNet)}
              numericValue={avgNet}
              formatValue={fmtINRFull}
              sub={<>All-time: <Money value={allTimeAvgNet} variant="full" />{combinedNote}</>}
              icon={<TrendingUp />}
              color={THEME.accent}
            />
            <StatCard
              label={`Total TDS (${fyLabel})`}
              value={fmtINRFull(totalTDS)}
              numericValue={totalTDS}
              formatValue={fmtINRFull}
              sub={showingCombined ? `${distinctOwners.length} members combined` : undefined}
              icon={<TrendingDown />}
              color={THEME.rust}
            />
            <StatCard
              label={`Total PF (${fyLabel})`}
              value={fmtINRFull(totalPF)}
              numericValue={totalPF}
              formatValue={fmtINRFull}
              sub={showingCombined ? `${distinctOwners.length} members combined` : undefined}
              icon={<Briefcase />}
              color={THEME.gold}
            />
            {annualizedTakeHome > 0 && (
              <StatCard
                label="Annualized Net Run-Rate"
                value={fmtINRFull(annualizedTakeHome)}
                numericValue={annualizedTakeHome}
                formatValue={fmtINRFull}
                sub={retentionRate ? `${retentionRate}% Take-Home Ratio` : undefined}
                icon={<DollarSign />}
                color={THEME.teal}
              />
            )}
            {yoyPct !== null && (
              <StatCard
                label="YoY Growth"
                value={`${yoyPct >= 0 ? "+" : ""}${yoyPct.toFixed(1)}%`}
                sub={`vs ${new Date(yoySlip.slipMonth + "-01").toLocaleDateString("en-IN", { month: "short", year: "numeric" })}`}
                icon={<Award />}
                color={yoyPct >= 0 ? THEME.sage : THEME.rust}
              />
            )}
          </div>

          {/* Interactive Workspace Controls Bar */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "12px 16px",
              borderRadius: 14,
              background: "var(--surface-0)",
              border: `1.5px solid ${THEME.line}`,
              boxShadow: "var(--shadow-sm)",
            }}
          >
            {/* Left Controls: Filter, Search, FY Selector */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
              {isMultiOwner && (
                <select
                  className="form-input"
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  aria-label="Filter by family member"
                  style={{ width: 160, fontSize: 12.5, padding: "6px 10px", height: "auto" }}
                >
                  <option value="all">All Members</option>
                  {familyProfiles
                    .filter((p: any) => distinctOwners.includes(p.id))
                    .map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              )}

              {availableFYs.length > 1 && (
                <select
                  className="form-input"
                  value={fyFilter}
                  onChange={(e) => setFyFilter(e.target.value)}
                  aria-label="Filter by Financial Year"
                  style={{ width: 140, fontSize: 12.5, padding: "6px 10px", height: "auto" }}
                >
                  <option value="all">All FY Periods</option>
                  {availableFYs.map((fy) => (
                    <option key={fy} value={fy}>
                      {fy}
                    </option>
                  ))}
                </select>
              )}

              <div style={{ position: "relative" }}>
                <Search
                  size={15}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: THEME.muted,
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search employer or month…"
                  aria-label="Search salary slips"
                  style={{
                    border: `1.5px solid ${THEME.line}`,
                    borderRadius: 10,
                    padding: `7px ${search ? 32 : 12}px 7px 34px`,
                    fontSize: 12.5,
                    color: THEME.ink,
                    background: "var(--surface-1)",
                    width: 190,
                  }}
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
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
            </div>

            {/* Right Controls: View Switcher & Export */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "var(--surface-1)",
                  padding: 3,
                  borderRadius: 10,
                  border: `1px solid ${THEME.line}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode("cards")}
                  title="Cards View"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 10px",
                    borderRadius: 7,
                    border: "none",
                    background: viewMode === "cards" ? "var(--surface-0)" : "transparent",
                    color: viewMode === "cards" ? THEME.ink : THEME.muted,
                    fontWeight: viewMode === "cards" ? 700 : 500,
                    fontSize: 12,
                    cursor: "pointer",
                    boxShadow: viewMode === "cards" ? "var(--shadow-sm)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <LayoutGrid size={13} />
                  <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  title="Table View"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 10px",
                    borderRadius: 7,
                    border: "none",
                    background: viewMode === "table" ? "var(--surface-0)" : "transparent",
                    color: viewMode === "table" ? THEME.ink : THEME.muted,
                    fontWeight: viewMode === "table" ? 700 : 500,
                    fontSize: 12,
                    cursor: "pointer",
                    boxShadow: viewMode === "table" ? "var(--shadow-sm)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <TableIcon size={13} />
                  <span>Table</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("analytics")}
                  title="Analytics & Trends View"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 10px",
                    borderRadius: 7,
                    border: "none",
                    background: viewMode === "analytics" ? "var(--surface-0)" : "transparent",
                    color: viewMode === "analytics" ? THEME.ink : THEME.muted,
                    fontWeight: viewMode === "analytics" ? 700 : 500,
                    fontSize: 12,
                    cursor: "pointer",
                    boxShadow: viewMode === "analytics" ? "var(--shadow-sm)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  <BarChart3 size={13} />
                  <span>Trends</span>
                </button>
              </div>

              <button
                onClick={handleExportCSV}
                disabled={!listSorted.length}
                className="card-lift"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 9,
                  border: `1.5px solid ${THEME.line}`,
                  background: "var(--surface-0)",
                  color: THEME.ink,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: listSorted.length ? "pointer" : "not-allowed",
                  opacity: listSorted.length ? 1 : 0.5,
                }}
              >
                <Download size={13} />
                Export CSV
              </button>
            </div>
          </div>

          {/* Interactive Multi-Tab Recharts Analytics Section */}
          {(viewMode === "analytics" || chartData.length > 1) && (
            <Card style={{ padding: 22, border: `1.5px solid ${THEME.line}` }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 18,
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 15,
                      fontWeight: 800,
                      color: THEME.ink,
                      letterSpacing: "-0.015em",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span>Salary Trend & Compensation Intelligence</span>
                    <Badge variant="accent" style={{ fontSize: 10 }}>
                      {chartData.length} Months
                    </Badge>
                  </h3>
                  <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 2 }}>
                    Comprehensive visualization of gross salaries, take-homes, tax withholdings, and retention ratios
                    {showingCombined ? " (combined household)" : ""}
                  </div>
                </div>

                {/* Sub Chart Tab Selector */}
                <div
                  style={{
                    display: "flex",
                    background: "var(--surface-1)",
                    padding: 3,
                    borderRadius: 9,
                    border: `1px solid ${THEME.line}`,
                  }}
                >
                  {[
                    { id: "overview", label: "Gross vs Net" },
                    { id: "earnings", label: "Earnings Mix" },
                    { id: "deductions", label: "Tax & PF" },
                    { id: "retention", label: "Retention %" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setChartTab(tab.id as any)}
                      style={{
                        padding: "4px 10px",
                        fontSize: 11.5,
                        fontWeight: chartTab === tab.id ? 700 : 500,
                        borderRadius: 6,
                        border: "none",
                        background: chartTab === tab.id ? "var(--surface-0)" : "transparent",
                        color: chartTab === tab.id ? THEME.ink : THEME.muted,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ width: "100%", height: 280, position: "relative" }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  {chartTab === "overview" ? (
                    <BarChart data={chartData} barGap={4}>
                      <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: THEME.muted }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: THEME.muted }}
                        tickFormatter={(v) => (privacyMode ? "••••" : `₹${(v / 1000).toFixed(0)}k`)}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={<ChartTooltip formatter={(v: any) => fmtINRFull(Number(v || 0))} />}
                        cursor={{ fill: THEME.line, opacity: 0.3 }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                        formatter={(value: string) => (
                          <span style={{ color: THEME.ink, fontWeight: 600 }}>{value}</span>
                        )}
                      />
                      <Bar
                        dataKey="Gross"
                        fill={`color-mix(in srgb, var(--accent) 30%, transparent)`}
                        radius={[6, 6, 0, 0]}
                      />
                      <Bar dataKey="Net" fill={THEME.sage} radius={[6, 6, 0, 0]} />
                      <Bar dataKey="TDS" fill={THEME.rust} radius={[6, 6, 0, 0]} />
                      <Bar dataKey="PF" fill={THEME.gold} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  ) : chartTab === "earnings" ? (
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: THEME.muted }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: THEME.muted }}
                        tickFormatter={(v) => (privacyMode ? "••••" : `₹${(v / 1000).toFixed(0)}k`)}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={<ChartTooltip formatter={(v: any) => fmtINRFull(Number(v || 0))} />}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                        formatter={(value: string) => (
                          <span style={{ color: THEME.ink, fontWeight: 600 }}>{value}</span>
                        )}
                      />
                      <Area
                        type="monotone"
                        dataKey="Basic"
                        stackId="1"
                        stroke={THEME.teal}
                        fill={THEME.teal}
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="HRA"
                        stackId="1"
                        stroke={THEME.accent}
                        fill={THEME.accent}
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="Allowances"
                        stackId="1"
                        stroke={THEME.gold}
                        fill={THEME.gold}
                        fillOpacity={0.6}
                      />
                      <Area
                        type="monotone"
                        dataKey="Bonus"
                        stackId="1"
                        stroke={THEME.sage}
                        fill={THEME.sage}
                        fillOpacity={0.7}
                      />
                    </AreaChart>
                  ) : chartTab === "deductions" ? (
                    <BarChart data={chartData} barGap={4}>
                      <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: THEME.muted }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: THEME.muted }}
                        tickFormatter={(v) => (privacyMode ? "••••" : `₹${(v / 1000).toFixed(0)}k`)}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={<ChartTooltip formatter={(v: any) => fmtINRFull(Number(v || 0))} />}
                        cursor={{ fill: THEME.line, opacity: 0.3 }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                        formatter={(value: string) => (
                          <span style={{ color: THEME.ink, fontWeight: 600 }}>{value}</span>
                        )}
                      />
                      <Bar dataKey="TDS" name="TDS / Income Tax" fill={THEME.rust} radius={[6, 6, 0, 0]} />
                      <Bar dataKey="PF" name="Provident Fund" fill={THEME.gold} radius={[6, 6, 0, 0]} />
                      <Bar
                        dataKey="OtherDeductions"
                        name="Other Deductions"
                        fill="color-mix(in srgb, var(--ink) 30%, transparent)"
                        radius={[6, 6, 0, 0]}
                      />
                    </BarChart>
                  ) : (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="4 4" stroke={THEME.line} vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: THEME.muted }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: THEME.muted }}
                        tickFormatter={(v) => `${v}%`}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        content={<ChartTooltip formatter={(v: any) => `${v}%`} />}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                        formatter={(value: string) => (
                          <span style={{ color: THEME.ink, fontWeight: 600 }}>{value}</span>
                        )}
                      />
                      <Line
                        type="monotone"
                        dataKey="RetentionRate"
                        name="Take-Home Retention %"
                        stroke={THEME.sage}
                        strokeWidth={3}
                        dot={{ r: 4, fill: THEME.sage }}
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* MAIN CONTENT: Cards View vs Table View */}
          {listSorted.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "48px 16px",
                background: "var(--surface-0)",
                borderRadius: 14,
                border: `1.5px solid ${THEME.line}`,
                color: THEME.muted,
                fontSize: 13.5,
                fontWeight: 500,
              }}
            >
              No salary slips match your active filter criteria.
            </div>
          ) : viewMode === "table" ? (
            /* High-Density Spreadsheet Table View */
            <div
              style={{
                background: "var(--surface-0)",
                borderRadius: 14,
                border: `1.5px solid ${THEME.line}`,
                boxShadow: "var(--shadow-sm)",
                overflow: "hidden",
              }}
            >
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr
                      style={{
                        background: "var(--surface-1)",
                        borderBottom: `1.5px solid ${THEME.line}`,
                        textAlign: "left",
                        color: THEME.muted,
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        fontWeight: 700,
                      }}
                    >
                      <th style={{ padding: "12px 16px" }}>Month & Period</th>
                      <th style={{ padding: "12px 16px" }}>Employer</th>
                      {isMultiOwner && <th style={{ padding: "12px 16px" }}>Member</th>}
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Basic</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Gross Salary</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>TDS</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>PF Total</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Total Deduct.</th>
                      <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.sage }}>Net Pay</th>
                      <th style={{ padding: "12px 16px", textAlign: "center" }}>Take-Home %</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listSorted.map((s: any) => {
                      const gross = Number(s.grossSalary || 0);
                      const net = Number(s.netSalary || 0);
                      const tds = Number(s.tds || 0) + Number(s.incomeTax || 0);
                      const pf = Number(s.pfEmployee || 0) + Number(s.pfEmployer || 0);
                      const deduct = Number(s.totalDeductions || 0);
                      const pct = gross > 0 ? Math.round((net / gross) * 100) : 0;
                      const monthStr = new Date(s.slipMonth + "-01").toLocaleDateString("en-IN", {
                        month: "short",
                        year: "numeric",
                      });

                      return (
                        <tr
                          key={s.id}
                          style={{
                            borderBottom: `1px solid ${THEME.line}`,
                            transition: "background 0.15s ease",
                          }}
                          className="table-row-hover"
                        >
                          <td style={{ padding: "12px 16px", fontWeight: 700, color: THEME.ink }}>
                            {monthStr}
                          </td>
                          <td style={{ padding: "12px 16px", color: THEME.ink, fontWeight: 500 }}>
                            {s.employer || "—"}
                          </td>
                          {isMultiOwner && (
                            <td style={{ padding: "12px 16px" }}>
                              <Badge variant="muted" style={{ fontSize: 10 }}>
                                {ownerName(s.owner)}
                              </Badge>
                            </td>
                          )}
                          <td style={{ padding: "12px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                            <Money value={Number(s.basic || 0)} variant="full" />
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                            <Money value={gross} variant="full" />
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: THEME.rust, fontVariantNumeric: "tabular-nums" }}>
                            <Money value={tds} variant="full" />
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: THEME.gold, fontVariantNumeric: "tabular-nums" }}>
                            <Money value={pf} variant="full" />
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right", color: THEME.rust, fontVariantNumeric: "tabular-nums" }}>
                            <Money value={deduct} variant="full" />
                          </td>
                          <td
                            style={{
                              padding: "12px 16px",
                              textAlign: "right",
                              fontWeight: 800,
                              color: THEME.sage,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            <Money value={net} variant="full" />
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "center" }}>
                            <Badge variant={pct >= 75 ? "sage" : pct >= 60 ? "accent" : "rust"} style={{ fontSize: 10 }}>
                              {pct}%
                            </Badge>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            <div style={{ display: "flex", justifyContent: "flex-end", gap: 4 }}>
                              <button
                                onClick={() => setPayslipModal(s)}
                                className="icon-btn"
                                title="View Digital Payslip"
                                style={{
                                  background: "var(--surface-1)",
                                  border: `1px solid ${THEME.line}`,
                                  borderRadius: 6,
                                  width: 26,
                                  height: 26,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: "var(--accent)",
                                }}
                              >
                                <Eye size={12} />
                              </button>
                              <button
                                onClick={() => setModal(s)}
                                className="icon-btn"
                                title="Edit"
                                style={{
                                  background: "var(--surface-1)",
                                  border: `1px solid ${THEME.line}`,
                                  borderRadius: 6,
                                  width: 26,
                                  height: 26,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: THEME.muted,
                                }}
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => openNewSlip(s)}
                                className="icon-btn"
                                title="Duplicate for next month"
                                style={{
                                  background: "var(--surface-1)",
                                  border: `1px solid ${THEME.line}`,
                                  borderRadius: 6,
                                  width: 26,
                                  height: 26,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: THEME.muted,
                                }}
                              >
                                <Copy size={12} />
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(s.id)}
                                className="icon-btn danger"
                                title="Delete"
                                style={{
                                  background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
                                  border: `1px solid color-mix(in srgb, ${THEME.rust} 20%, transparent)`,
                                  borderRadius: 6,
                                  width: 26,
                                  height: 26,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  color: THEME.rust,
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr
                      style={{
                        background: "var(--surface-1)",
                        borderTop: `2px solid ${THEME.line}`,
                        fontWeight: 800,
                        color: THEME.ink,
                      }}
                    >
                      <td colSpan={isMultiOwner ? 3 : 2} style={{ padding: "12px 16px" }}>
                        Summary Totals ({listSorted.length} Slips)
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        <Money value={tableTotals.basic} variant="full" />
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        <Money value={tableTotals.gross} variant="full" />
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: THEME.rust, fontVariantNumeric: "tabular-nums" }}>
                        <Money value={tableTotals.tds} variant="full" />
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: THEME.gold, fontVariantNumeric: "tabular-nums" }}>
                        <Money value={tableTotals.pf} variant="full" />
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: THEME.rust, fontVariantNumeric: "tabular-nums" }}>
                        <Money value={tableTotals.deductions} variant="full" />
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right", color: THEME.sage, fontVariantNumeric: "tabular-nums" }}>
                        <Money value={tableTotals.net} variant="full" />
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        <Badge variant="sage" style={{ fontSize: 10 }}>
                          {tableTotals.gross > 0 ? Math.round((tableTotals.net / tableTotals.gross) * 100) : 0}% Avg
                        </Badge>
                      </td>
                      <td style={{ padding: "12px 16px" }}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            /* Cards View (Default & Analytics Companion) */
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {listSorted.map((s: any) => {
                const isExpanded = expanded === s.id;
                const net = Number(s.netSalary || 0);
                const gross = Number(s.grossSalary || 0);
                const pct = gross > 0 ? Math.round((net / gross) * 100) : 0;
                const netAnomaly = gross > 0 && net > gross;
                const tdsTotal = Number(s.tds || 0) + Number(s.incomeTax || 0);
                const pfTotal = Number(s.pfEmployee || 0) + Number(s.pfEmployer || 0);

                return (
                  <Card
                    key={s.id}
                    style={{
                      padding: "18px 22px",
                      border: `1.5px solid ${THEME.line}`,
                      boxShadow: "var(--shadow-sm)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                      {/* Employer & Month Icon Block */}
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: "color-mix(in srgb, var(--accent) 12%, var(--surface-1))",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--accent)",
                          flexShrink: 0,
                        }}
                      >
                        <Briefcase size={22} />
                      </div>

                      {/* Main Info */}
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: 15,
                            color: THEME.ink,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span>
                            {new Date(s.slipMonth + "-01").toLocaleDateString("en-IN", {
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                          {isMultiOwner && (
                            <Badge variant="muted" style={{ fontSize: 9.5, padding: "2px 8px" }}>
                              {ownerName(s.owner)}
                            </Badge>
                          )}
                          {netAnomaly && (
                            <span title="Net exceeds Gross — check this entry" style={{ display: "inline-flex" }}>
                              <AlertCircle size={14} color={THEME.rust} />
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12.5, color: THEME.muted, fontWeight: 500, marginTop: 3 }}>
                          <strong>{s.employer || "Employer"}</strong>
                          {pct > 0 ? ` &bull; ${pct}% take-home retention` : ""}
                        </div>
                      </div>

                      {/* Financial Badges & Totals */}
                      <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                        {gross > 0 && (
                          <div style={{ textAlign: "right" }}>
                            <div
                              style={{
                                fontFamily: "var(--font-display)",
                                fontWeight: 700,
                                fontSize: 14,
                                color: THEME.ink,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              <Money value={gross} variant="full" />
                            </div>
                            <div style={{ fontSize: 10.5, color: THEME.muted, fontWeight: 600 }}>gross</div>
                          </div>
                        )}

                        <div style={{ textAlign: "right" }}>
                          <div
                            style={{
                              fontFamily: "var(--font-display)",
                              fontWeight: 800,
                              fontSize: 16,
                              color: THEME.sage,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            <Money value={net} variant="full" />
                          </div>
                          <div style={{ fontSize: 10.5, color: THEME.sage, fontWeight: 700 }}>take-home net</div>
                        </div>

                        {tdsTotal > 0 && (
                          <Badge variant="rust" style={{ fontSize: 10, padding: "3px 8px" }}>
                            TDS <Money value={tdsTotal} variant="full" />
                          </Badge>
                        )}

                        {pfTotal > 0 && (
                          <Badge variant="muted" style={{ fontSize: 10, padding: "3px 8px" }}>
                            PF <Money value={pfTotal} variant="full" />
                          </Badge>
                        )}
                      </div>

                      {/* Action Buttons Toolbar */}
                      <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setPayslipModal(s)}
                          style={{ fontSize: 11.5, padding: "5px 10px" }}
                        >
                          <Eye size={13} style={{ marginRight: 4 }} /> Paystub
                        </Button>
                        <button
                          onClick={() => setExpanded(isExpanded ? null : s.id)}
                          className="icon-btn"
                          aria-label={isExpanded ? "Collapse salary slip details" : "Expand salary slip details"}
                          aria-expanded={isExpanded}
                          title={isExpanded ? "Collapse" : "Expand breakdown"}
                          style={{
                            background: "var(--surface-0)",
                            border: `1.5px solid ${THEME.line}`,
                            borderRadius: 8,
                            cursor: "pointer",
                            color: THEME.muted,
                            width: 30,
                            height: 30,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        <button
                          onClick={() => setModal(s)}
                          className="icon-btn"
                          title="Edit"
                          aria-label="Edit salary slip"
                          style={{
                            background: "var(--surface-0)",
                            border: `1.5px solid ${THEME.line}`,
                            borderRadius: 8,
                            cursor: "pointer",
                            color: THEME.muted,
                            width: 30,
                            height: 30,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => openNewSlip(s)}
                          className="icon-btn"
                          title="Duplicate for next month"
                          aria-label="Duplicate salary slip for next month"
                          style={{
                            background: "var(--surface-0)",
                            border: `1.5px solid ${THEME.line}`,
                            borderRadius: 8,
                            cursor: "pointer",
                            color: THEME.muted,
                            width: 30,
                            height: 30,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(s.id)}
                          className="icon-btn danger"
                          title="Delete"
                          aria-label="Delete salary slip"
                          style={{
                            background: `color-mix(in srgb, ${THEME.rust} 4%, transparent)`,
                            border: `1.5px solid color-mix(in srgb, ${THEME.rust} 19%, transparent)`,
                            borderRadius: 8,
                            cursor: "pointer",
                            color: THEME.rust,
                            width: 30,
                            height: 30,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Inline Expandable Ledger Breakdown */}
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: 18,
                          paddingTop: 18,
                          borderTop: `1.5px solid ${THEME.line}`,
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                            gap: 16,
                          }}
                        >
                          {/* Earnings breakdown */}
                          <div
                            style={{
                              background: "var(--surface-1)",
                              border: `1.5px solid ${THEME.line}`,
                              borderLeft: `4px solid ${THEME.sage}`,
                              borderRadius: 12,
                              padding: 16,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                color: THEME.sage,
                                marginBottom: 12,
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                              }}
                            >
                              Earnings Breakdown
                            </div>
                            {[
                              ["Basic Salary", s.basic],
                              ["HRA", s.hra],
                              ["Education Allowance", s.educationAllowance],
                              ["LTA", s.lta],
                              ["Special Allowance", s.specialAllowance],
                              ["Employer NPS Contribution", s.employerNpsContribution],
                              ["DA", s.da],
                              ["Bonus", s.bonus],
                              ["Other Earnings", s.otherEarnings],
                            ]
                              .filter(([, v]) => Number(v) > 0)
                              .map(([label, val]) => (
                                <div
                                  key={label}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    fontSize: 12.5,
                                    color: THEME.muted,
                                    marginBottom: 6,
                                    fontWeight: 500,
                                    fontVariantNumeric: "tabular-nums",
                                  }}
                                >
                                  <span>{label}</span>
                                  <span style={{ color: THEME.ink, fontWeight: 600 }}>
                                    <Money value={Number(val)} variant="full" />
                                  </span>
                                </div>
                              ))}
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 13,
                                fontWeight: 800,
                                color: THEME.sage,
                                borderTop: `1.5px solid ${THEME.line}`,
                                paddingTop: 8,
                                marginTop: 8,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              <span>Gross Salary</span>
                              <span style={{ fontFamily: "var(--font-display)" }}>
                                <Money value={Number(s.grossSalary || 0)} variant="full" />
                              </span>
                            </div>
                          </div>

                          {/* Deductions breakdown */}
                          <div
                            style={{
                              background: "var(--surface-1)",
                              border: `1.5px solid ${THEME.line}`,
                              borderLeft: `4px solid ${THEME.rust}`,
                              borderRadius: 12,
                              padding: 16,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                color: THEME.rust,
                                marginBottom: 12,
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                              }}
                            >
                              Deductions Breakdown
                            </div>
                            {[
                              ["PF (Employee)", s.pfEmployee],
                              ["PF (Employer)", s.pfEmployer],
                              ["ESI", s.esiEmployee],
                              ["Professional Tax", s.professionalTax],
                              ["TDS", s.tds],
                              ["Income Tax", s.incomeTax],
                              ["NPS Deduction", s.npsDeduction],
                              ["Other Deductions", s.otherDeductions],
                            ]
                              .filter(([, v]) => Number(v) > 0)
                              .map(([label, val]) => (
                                <div
                                  key={label}
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    fontSize: 12.5,
                                    color: THEME.muted,
                                    marginBottom: 6,
                                    fontWeight: 500,
                                    fontVariantNumeric: "tabular-nums",
                                  }}
                                >
                                  <span>{label}</span>
                                  <span style={{ color: THEME.ink, fontWeight: 600 }}>
                                    <Money value={Number(val)} variant="full" />
                                  </span>
                                </div>
                              ))}
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 13,
                                fontWeight: 800,
                                color: THEME.rust,
                                borderTop: `1.5px solid ${THEME.line}`,
                                paddingTop: 8,
                                marginTop: 8,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              <span>Total Deductions</span>
                              <span style={{ fontFamily: "var(--font-display)" }}>
                                <Money value={Number(s.totalDeductions || 0)} variant="full" />
                              </span>
                            </div>
                          </div>
                        </div>

                        {s.notes && (
                          <div
                            style={{
                              marginTop: 12,
                              padding: "10px 14px",
                              borderRadius: 10,
                              background: "var(--surface-0)",
                              border: `1.5px solid ${THEME.line}`,
                              fontSize: 12,
                              fontStyle: "italic",
                              color: THEME.muted,
                              fontWeight: 500,
                            }}
                          >
                            Remarks: {s.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Salary Intelligence & Tax Optimizer Insights Panel */}
          {latest && Number(latest.grossSalary) > 0 && (
            <Card
              style={{
                padding: "20px 24px",
                border: `1.5px solid ${THEME.line}`,
                background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 5%, var(--surface-0)), var(--surface-0))",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <ShieldCheck size={18} color="var(--accent)" />
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                  Payroll & Compensation Insights
                </h4>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                  gap: 16,
                  fontSize: 12.5,
                }}
              >
                <div style={{ background: "var(--surface-0)", padding: 14, borderRadius: 10, border: `1px solid ${THEME.line}` }}>
                  <div style={{ color: THEME.muted, fontWeight: 500, marginBottom: 4 }}>Annualized CTC Run-Rate</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                    <Money value={annualizedGross} variant="full" />
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
                    Estimated from last month's gross pay of <Money value={latest.grossSalary} variant="full" />
                  </div>
                </div>

                <div style={{ background: "var(--surface-0)", padding: 14, borderRadius: 10, border: `1px solid ${THEME.line}` }}>
                  <div style={{ color: THEME.muted, fontWeight: 500, marginBottom: 4 }}>HRA to Basic Ratio</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                    {Number(latest.basic) > 0 ? `${Math.round((Number(latest.hra || 0) / Number(latest.basic)) * 100)}%` : "—"}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
                    Standard statutory limit is 50% for Metros and 40% for Non-Metros
                  </div>
                </div>

                <div style={{ background: "var(--surface-0)", padding: 14, borderRadius: 10, border: `1px solid ${THEME.line}` }}>
                  <div style={{ color: THEME.muted, fontWeight: 500, marginBottom: 4 }}>Annual PF Accumulation</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: THEME.gold }}>
                    <Money value={(Number(latest.pfEmployee || 0) + Number(latest.pfEmployer || 0)) * 12} variant="full" />
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
                    Employee + Employer monthly deposits into EPF
                  </div>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Slip Add / Edit Modal */}
      {modal !== null && (
        <SlipForm
          initial={modal?.id ? modal : undefined}
          onSave={save}
          onClose={() => setModal(null)}
          apiKey={apiKey}
          existingSlips={slips}
          familyProfiles={familyProfiles}
          saving={savingSlip}
        />
      )}

      {/* Digital Payslip Modal */}
      {payslipModal !== null && (
        <DigitalPayslipModal
          slip={payslipModal}
          ownerName={ownerName(payslipModal.owner)}
          onClose={() => setPayslipModal(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <ConfirmDialog
          message="Delete this salary slip? This action cannot be undone."
          onConfirm={() => {
            deleteSlip(confirmDeleteId);
            setConfirmDeleteId(null);
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
