/* eslint-disable */
// @ts-nocheck
import React, { useState, useCallback, useMemo } from "react";
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
} from "recharts";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { THEME } from "../../utils/constants";
import { getCurrentFY } from "../../utils/appConstants";
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
        boxShadow: "var(--shadow-lg)",
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 800, color: THEME.ink, marginBottom: 6, letterSpacing: "-0.01em" }}>
        {label}
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

function SlipForm({ initial, onSave, onClose, apiKey, existingSlips, familyProfiles, saving = false }: any) {
  // Filter out null/undefined so a DB row with e.g. raw_text: null (common for
  // slips saved before this column existed, or added without AI-parsing) doesn't
  // clobber EMPTY's "" default — form.rawText.trim() would then crash on open.
  const initialClean = Object.fromEntries(
    Object.entries(initial || {}).filter(([, v]) => v !== null && v !== undefined)
  );
  const [form, setForm] = useState({ ...EMPTY, ...initialClean });
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [netSalaryTouched, setNetSalaryTouched] = useState(false);
  const [grossTouched, setGrossTouched] = useState(false);
  const [deductTouched, setDeductTouched] = useState(false);
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
      // The model is asked to return only JSON, but sometimes wraps it in prose
      // or fences anyway — strip fences, then pull out the first {...} block so
      // a stray sentence before/after the object doesn't break JSON.parse.
      const fenceStripped = raw.replace(/```json?/gi, "").replace(/```/g, "").trim();
      const braceMatch = fenceStripped.match(/\{[\s\S]*\}/);
      const json = JSON.parse(braceMatch ? braceMatch[0] : fenceStripped);

      const sanitized: any = { ...json };
      // A malformed/misformatted slipMonth would silently blank the <input type="month">
      // (it just rejects invalid values with no visible feedback), wiping out whatever
      // the user had entered. Only accept it if it's actually YYYY-MM.
      if (sanitized.slipMonth && !/^\d{4}-\d{2}$/.test(String(sanitized.slipMonth))) {
        delete sanitized.slipMonth;
      }
      // Coerce numeric fields even if the model ignored the "numbers only" instruction
      // and returned "₹45,000" or "45,000" as a string.
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

  // The DB enforces UNIQUE(user_id, owner, slip_month) — catch the collision here
  // with a clear message instead of letting an opaque constraint-violation error
  // surface (or the save silently fail) after the user hits Save.
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
      maxWidth={720}
    >
      <style>{`
        .salary-slip-components-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        @media (max-width: 640px) {
          .salary-slip-components-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .salary-slip-info-grid { grid-template-columns: 1fr !important; }
          .salary-slip-components-grid { grid-template-columns: 1fr !important; }
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
              {form._clonedFromEmployer ? ` (${form._clonedFromEmployer})` : ""}.
              Review and click Save, or edit any changed fields.
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

      <ModalSection title="Slip Info" first />

      {eligibleCopySlips.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 10,
            background: "var(--surface-1, rgba(0,0,0,0.02))",
            border: `1px solid ${THEME.line}`,
            marginBottom: 12,
            fontSize: 12,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: THEME.muted, fontWeight: 500 }}>
            <Copy size={13} color="var(--accent)" />
            <span>Copy breakdown from past slip:</span>
          </div>
          <select
            className="form-input"
            style={{
              width: "auto",
              maxWidth: 260,
              fontSize: 12,
              padding: "4px 8px",
              height: "auto",
              minHeight: 28,
            }}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                handleCopyFromSlip(e.target.value);
                e.target.value = "";
              }
            }}
          >
            <option value="" disabled>
              Select past month to copy...
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

      <div
        className="salary-slip-info-grid"
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 8 }}
      >
        <Field label="Month *" style={{ marginBottom: 0 }}>
          <input
            className="form-input"
            type="month"
            value={form.slipMonth}
            onChange={(e) => set("slipMonth", e.target.value)}
            style={duplicate ? { borderColor: THEME.rust } : undefined}
          />
        </Field>
        <Field label="Employer" style={{ marginBottom: 0 }}>
          <input
            className="form-input"
            value={form.employer}
            onChange={(e) => set("employer", e.target.value)}
            placeholder="Company name"
          />
        </Field>
        <Field label="Owner" style={{ marginBottom: 0 }}>
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

      {/* AI paste area */}
      <div
        style={{
          background:
            "var(--surface-0)",
          border: `1.5px solid ${THEME.line}`,
          borderRadius: 14,
          padding: 18,
          marginBottom: 16,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Sparkles size={14} color="var(--accent)" />
          <span style={{ fontSize: 13, fontWeight: 800, color: "var(--accent)" }}>
            AI Parser — Paste Salary Slip Text
          </span>
        </div>
        <textarea
          className="form-input"
          rows={4}
          placeholder="Paste the text from your salary slip PDF here… The AI will extract all fields automatically."
          value={form.rawText}
          onChange={(e) => set("rawText", e.target.value)}
          style={{ marginBottom: 12, fontSize: 12.5 }}
        />
        {parseError && (
          <div style={{ fontSize: 12, color: THEME.danger, marginBottom: 10, fontWeight: 600 }}>
            {parseError}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Button size="sm" onClick={parseWithAI} disabled={parsing || !form.rawText.trim()}>
            {parsing ? (
              <>
                <Loader size={12} className="spin" style={{ marginRight: 6 }} /> Parsing…
              </>
            ) : (
              <>
                <Sparkles size={12} style={{ marginRight: 6 }} /> Parse with Gemini
              </>
            )}
          </Button>
          {!apiKey && (
            <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 500 }}>
              (Add Gemini API key in Settings to enable)
            </span>
          )}
        </div>
      </div>

      {/* Earnings */}
      <div
        style={{
          fontWeight: 800,
          fontSize: 11,
          color: THEME.sage,
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        Earnings
      </div>
      <div className="salary-slip-components-grid">
        {[
          ["basic", "Basic Salary"],
          ["hra", "HRA"],
          ["educationAllowance", "Education Allowance"],
          ["lta", "LTA"],
          ["specialAllowance", "Special Allowance"],
          ["employerNpsContribution", "Employer NPS Contribution"],
          ["da", "DA"],
          ["bonus", "Bonus / Incentive"],
          ["otherEarnings", "Other Earnings"],
          ["grossSalary", "Gross Salary *"],
        ].map(([k, label]) => {
          const val =
            k === "grossSalary"
              ? grossTouched
                ? form.grossSalary
                : form.grossSalary || computed.grossSalary || ""
              : form[k];
          return (
            <Field
              key={k}
              label={label}
              style={{ marginBottom: 0, display: "flex", flexDirection: "column", height: "100%", justifyContent: "flex-end" }}
              labelStyle={{ minHeight: 28, display: "flex", alignItems: "flex-end", marginBottom: 6, lineHeight: 1.25 }}
            >
              <input
                className="form-input"
                type="number"
                value={val}
                onChange={(e) => {
                  if (k === "grossSalary") setGrossTouched(true);
                  set(k, e.target.value);
                }}
                placeholder="0"
              />
            </Field>
          );
        })}
      </div>

      {/* Deductions */}
      <div
        style={{
          fontWeight: 800,
          fontSize: 11,
          color: THEME.rust,
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        Deductions
      </div>
      <div className="salary-slip-components-grid">
        {[
          ["pfEmployee", "PF (Employee)"],
          ["pfEmployer", "PF (Employer)"],
          ["esiEmployee", "ESI"],
          ["professionalTax", "Professional Tax"],
          ["tds", "TDS"],
          ["incomeTax", "Income Tax"],
          ["npsDeduction", "NPS Deduction"],
          ["otherDeductions", "Other Deductions"],
          ["totalDeductions", "Total Deductions *"],
        ].map(([k, label]) => {
          const val =
            k === "totalDeductions"
              ? deductTouched
                ? form.totalDeductions
                : form.totalDeductions || computed.totalDeductions || ""
              : form[k];
          return (
            <Field
              key={k}
              label={label}
              style={{ marginBottom: 0, display: "flex", flexDirection: "column", height: "100%", justifyContent: "flex-end" }}
              labelStyle={{ minHeight: 28, display: "flex", alignItems: "flex-end", marginBottom: 6, lineHeight: 1.25 }}
            >
              <input
                className="form-input"
                type="number"
                value={val}
                onChange={(e) => {
                  if (k === "totalDeductions") setDeductTouched(true);
                  set(k, e.target.value);
                }}
                placeholder="0"
              />
            </Field>
          );
        })}
      </div>

      {/* Net */}
      <div
        style={{
          background:
            "var(--surface-0)",
          border: `1.5px solid ${THEME.line}`,
          borderLeft: `4px solid ${netExceedsGross ? THEME.rust : THEME.sage}`,
          borderRadius: 14,
          padding: "16px 20px",
          marginBottom: 16,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 800, fontSize: 13.5, color: THEME.ink }}>
            Net Salary (Take-Home)
          </span>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 600,
              color: netExceedsGross ? THEME.rust : THEME.sage,
            }}
          >
            {computed.netSalary ? <Money value={Number(computed.netSalary)} variant="full" /> : "—"}
          </span>
        </div>
        {computed.grossSalary > 0 && computed.totalDeductions > 0 && (
          <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 6, fontWeight: 500 }}>
            Gross: <Money value={Number(computed.grossSalary)} variant="full" /> &bull; Deductions:{" "}
            <Money value={Number(computed.totalDeductions)} variant="full" />
          </div>
        )}
        {netExceedsGross && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 8,
              fontSize: 11.5,
              color: THEME.rust,
              fontWeight: 600,
            }}
          >
            <AlertCircle size={12} /> Net salary is higher than gross — double-check your entries.
          </div>
        )}
      </div>

      <Field label="Net Salary (₹) *">
        <input
          className="form-input"
          type="number"
          value={netSalaryTouched ? form.netSalary : form.netSalary || computed.netSalary || ""}
          onChange={(e) => {
            setNetSalaryTouched(true);
            set("netSalary", e.target.value);
          }}
          placeholder="Take-home amount"
        />
      </Field>

      <ModalActions onSave={save} onClose={onClose} saveLabel="Save Slip" disabled={saving} loading={saving} />
    </Modal>
  );
}

export function SalarySlipTab({ state, addItem, removeItem, updateItem, showToast }: any) {
  const { familyProfiles } = useMasterData();
  const { privacyMode } = usePrivacy();
  const slips: any[] = state.salarySlips || [];
  const [modal, setModal] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const apiKey = state?.settings?.geminiApiKey || "";

  const ownerName = (id: string) => familyProfiles.find((p: any) => p.id === id)?.name || id;

  const distinctOwners = useMemo(
    () => Array.from(new Set(slips.map((s) => s.owner).filter(Boolean))),
    [slips]
  );
  const isMultiOwner = distinctOwners.length > 1;
  const showingCombined = isMultiOwner && ownerFilter === "all";

  // Owner scoping applies to stats/chart (a household's mixed averages/latest-value
  // are otherwise misleading — see card sub-labels below). Search only narrows the
  // list underneath, matching the pattern used elsewhere (search never quietly
  // changes the summary numbers above it).
  const ownerFiltered =
    ownerFilter === "all" ? slips : slips.filter((s) => s.owner === ownerFilter);

  const ownerSorted = [...ownerFiltered].sort((a, b) => b.slipMonth.localeCompare(a.slipMonth));
  const latest = ownerSorted[0];

  const searchLower = search.trim().toLowerCase();
  const searched = searchLower
    ? ownerFiltered.filter((s) => {
        const monthLabel = new Date(s.slipMonth + "-01")
          .toLocaleDateString("en-IN", { month: "long", year: "numeric" })
          .toLowerCase();
        return (
          (s.employer || "").toLowerCase().includes(searchLower) ||
          monthLabel.includes(searchLower) ||
          s.slipMonth.includes(searchLower)
        );
      })
    : ownerFiltered;
  const listSorted = [...searched].sort((a, b) => b.slipMonth.localeCompare(a.slipMonth));

  // Chart data — last 12 entries within the current owner scope. When viewing all
  // members combined, tag each bar with the owner's first name so two people's pay
  // for the same calendar month don't collapse into one ambiguous x-axis label.
  const chartData = ownerSorted
    .slice(0, 12)
    .reverse()
    .map((s) => {
      const dateLabel = new Date(s.slipMonth + "-01").toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      });
      return {
        month: showingCombined ? `${dateLabel} · ${ownerName(s.owner).split(" ")[0]}` : dateLabel,
        Gross: Number(s.grossSalary || 0),
        Net: Number(s.netSalary || 0),
        TDS: Number(s.tds || 0) + Number(s.incomeTax || 0),
        PF: Number(s.pfEmployee || 0) + Number(s.pfEmployer || 0),
      };
    });

  // Current financial year (Apr–Mar) window, used to scope the "(FY)" stat cards
  // below so they don't silently aggregate every slip ever added.
  const currentFY = getCurrentFY();
  const fyStartYear = Number(currentFY.split("-")[0]);
  const fyStartMonth = `${fyStartYear}-04`;
  const fyEndMonth = `${fyStartYear + 1}-03`;
  const fySlips = ownerFiltered.filter(
    (sl) => sl.slipMonth >= fyStartMonth && sl.slipMonth <= fyEndMonth
  );
  const fyLabel = `FY ${fyStartYear}-${String(fyStartYear + 1).slice(-2)}`;

  const totalTDS = fySlips.reduce((s, sl) => s + Number(sl.tds || 0) + Number(sl.incomeTax || 0), 0);
  const totalPF = fySlips.reduce(
    (s, sl) => s + Number(sl.pfEmployee || 0) + Number(sl.pfEmployer || 0),
    0
  );
  // Scoped to the same FY window as the TDS/PF cards beside it, instead of averaging
  // every slip ever entered — previously this mixed different years' figures into
  // one number while the neighboring cards were FY-only.
  const avgNet = fySlips.length
    ? fySlips.reduce((s, sl) => s + Number(sl.netSalary || 0), 0) / fySlips.length
    : 0;
  const allTimeAvgNet = ownerFiltered.length
    ? ownerFiltered.reduce((s, sl) => s + Number(sl.netSalary || 0), 0) / ownerFiltered.length
    : 0;
  const combinedNote = showingCombined ? ` · ${distinctOwners.length} members combined` : "";

  // Month-over-month change for the latest slip, compared against the same owner's
  // previous entry (never a different family member's, even when "All" is selected).
  const latestOwnerHistory = latest ? ownerSorted.filter((s) => s.owner === latest.owner) : [];
  const prevSlip = latestOwnerHistory[1];
  const momPct =
    latest && prevSlip && Number(prevSlip.netSalary) > 0
      ? ((Number(latest.netSalary) - Number(prevSlip.netSalary)) / Number(prevSlip.netSalary)) * 100
      : null;

  // Year-over-year change: same owner, same calendar month, ~12 months back.
  const yoySlip = latest
    ? latestOwnerHistory.find((s) => s.slipMonth === shiftMonth(latest.slipMonth, -12))
    : null;
  const yoyPct =
    latest && yoySlip && Number(yoySlip.netSalary) > 0
      ? ((Number(latest.netSalary) - Number(yoySlip.netSalary)) / Number(yoySlip.netSalary)) * 100
      : null;

  const lastNetSubParts: string[] = [];
  if (showingCombined && latest) lastNetSubParts.push(ownerName(latest.owner));
  if (momPct !== null) lastNetSubParts.push(`${momPct >= 0 ? "↑" : "↓"}${Math.abs(momPct).toFixed(1)}% MoM`);
  const lastNetSub = lastNetSubParts.join(" · ") || undefined;
  const lastNetSubColor = momPct !== null ? (momPct >= 0 ? THEME.sage : THEME.rust) : undefined;

  const { run: save, loading: savingSlip } = useAsyncAction(
    async (data: any) => {
      if (data.id && slips.find((s: any) => s.id === data.id)) {
        await updateItem("salarySlips", data.id, data);
      } else {
        await addItem("salarySlips", data);
      }
    },
    { onSuccess: () => setModal(null), onError: (e: any) => showToast?.(`Failed to save salary slip: ${e?.message || "Unknown error"}`, "error") }
  );

  const { run: deleteSlip } = useAsyncAction(
    async (id: string) => { await removeItem("salarySlips", id); },
    { onError: (e: any) => showToast?.(`Failed to delete salary slip: ${e?.message || "Unknown error"}`, "error") }
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle
        sub="Store monthly salary components — pre-fills from previous month automatically, or paste slip text with AI"
        rightElement={
          <Button size="sm" onClick={() => openNewSlip()}>
            <Plus size={14} /> Add Slip
          </Button>
        }
      >
        Salary Slip Tracker
      </SectionTitle>

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
              AI Parsing available.
            </strong>{" "}
            Add your Gemini API key in Settings, then paste salary slip text to auto-fill all
            fields.
          </div>
        </div>
      )}

      {slips.length === 0 ? (
        <EmptyState
          icon={FileText}
          gradient={`linear-gradient(135deg, ${THEME.accent} 0%, color-mix(in srgb, var(--t-accent) 65%, white) 100%)`}
          dotColor={THEME.accent}
          title="No Salary Slips Tracked"
          description="Add monthly salary slips to track take-home pay, TDS deducted, PF contributions, and spot trends."
          pills={[
            "1-Click Auto-Fill",
            "AI Auto-Parse",
            "Gross vs Net Trend",
            "TDS & PF Breakdown",
          ]}
          buttonLabel="Add First Slip"
          onAdd={() => openNewSlip()}
        />
      ) : (
        <>
          {/* Quick Auto-fill next month banner */}
          {latest && (
            <div
              style={{
                background: "color-mix(in srgb, var(--accent) 6%, var(--surface-0))",
                border: `1.5px solid color-mix(in srgb, var(--accent) 22%, transparent)`,
                borderRadius: 14,
                padding: "12px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    background: "color-mix(in srgb, var(--accent) 15%, transparent)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--accent)",
                    flexShrink: 0,
                  }}
                >
                  <Zap size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                    Auto-fill next month:{" "}
                    {new Date(shiftMonth(latest.slipMonth, 1) + "-01").toLocaleDateString("en-IN", {
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 500 }}>
                    {latest.employer || "Employer"} · Net Pay:{" "}
                    <Money value={latest.netSalary} variant="full" /> · Pre-fills all earnings &
                    deductions in 1 click
                  </div>
                </div>
              </div>
              <Button size="sm" onClick={() => openNewSlip(latest)}>
                <CopyPlus size={14} /> Add Next Month's Slip
              </Button>
            </div>
          )}
          {/* Toolbar: owner filter (multi-profile households only), search, export */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              {isMultiOwner && (
                <select
                  className="form-input"
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  aria-label="Filter by family member"
                  style={{ width: 180, fontSize: 12, padding: "6px 10px" }}
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
              <div style={{ position: "relative" }}>
                <Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: 14,
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
                    borderRadius: 12,
                    padding: `9px ${search ? 36 : 12}px 9px 38px`,
                    fontSize: 13,
                    color: THEME.ink,
                    background: "var(--surface-0)",
                    boxShadow: "var(--shadow-sm)",
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
                      right: 10,
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
            <button
              onClick={handleExportCSV}
              disabled={!listSorted.length}
              className="card-lift"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                border: `1px solid ${THEME.line}`,
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

          {/* Stats Summary Grid */}
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

          {/* Recharts Trend Card */}
          {chartData.length > 1 && (
            <Card style={{ padding: 24, border: `1.5px solid ${THEME.line}` }}>
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
                  Salary Trend
                </h3>
                <div style={{ fontSize: 11, color: THEME.muted }}>
                  Visual comparison of gross incomes, take-homes, TDS, and PF
                  {showingCombined ? " — combined across family members" : ""}
                </div>
              </div>
              <div style={{ width: "100%", height: 260, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                    dataKey="Gross"
                    fill={`color-mix(in srgb, var(--accent) 30%, transparent)`}
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar dataKey="Net" fill={THEME.sage} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="TDS" fill={THEME.rust} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer></div>
            </Card>
          )}

          {/* Slip Accordion list */}
          {listSorted.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "32px 16px",
                color: THEME.muted,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              No slips match your search.
            </div>
          ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {listSorted.map((s: any) => {
              const isExpanded = expanded === s.id;
              const net = Number(s.netSalary || 0);
              const gross = Number(s.grossSalary || 0);
              const pct = gross > 0 ? Math.round((net / gross) * 100) : 0;
              const netAnomaly = gross > 0 && net > gross;

              return (
                <Card
                  key={s.id}
                  style={{
                    padding: "16px 20px",
                    border: `1.5px solid ${THEME.line}`,
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", color: "var(--accent)", flexShrink: 0 }}>
                      <Briefcase size={22} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14.5, color: THEME.ink, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        {new Date(s.slipMonth + "-01").toLocaleDateString("en-IN", {
                          month: "long",
                          year: "numeric",
                        })}
                        {isMultiOwner && (
                          <Badge variant="muted" style={{ fontSize: 9.5, padding: "2px 8px" }}>
                            {ownerName(s.owner)}
                          </Badge>
                        )}
                        {netAnomaly && (
                          <span title="Net exceeds Gross — check this entry" style={{ display: "inline-flex" }}>
                            <AlertCircle size={13} color={THEME.rust} />
                          </span>
                        )}
                      </div>
                      <div
                        style={{ fontSize: 12, color: THEME.muted, fontWeight: 500, marginTop: 2 }}
                      >
                        {s.employer || ""}
                        {pct > 0 ? ` · ${pct}% take-home` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 800,
                          fontSize: 15,
                          color: THEME.sage,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Money value={net} variant="full" />
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>net</div>
                    </div>
                    {gross > 0 && (
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 800,
                            fontSize: 14.5,
                            color: THEME.ink,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          <Money value={gross} variant="full" />
                        </div>
                        <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                          gross
                        </div>
                      </div>
                    )}
                    {Number(s.tds || 0) + Number(s.incomeTax || 0) > 0 && (
                      <Badge variant="rust" style={{ fontSize: 9.5, padding: "2px 8px" }}>
                        TDS <Money value={Number(s.tds || 0) + Number(s.incomeTax || 0)} variant="full" />
                      </Badge>
                    )}
                    <div style={{ display: "flex", gap: 6, marginLeft: 6 }}>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : s.id)}
                        className="icon-btn"
                        aria-label={isExpanded ? "Collapse salary slip details" : "Expand salary slip details"}
                        aria-expanded={isExpanded}
                        style={{
                          background: "var(--surface-0)",
                          border: `1.5px solid ${THEME.line}`,
                          borderRadius: 8,
                          cursor: "pointer",
                          color: THEME.muted,
                          width: 28,
                          height: 28,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
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
                          width: 28,
                          height: 28,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Pencil size={13} />
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
                          width: 28,
                          height: 28,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Copy size={13} />
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
                          width: 28,
                          height: 28,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div
                      style={{
                        marginTop: 16,
                        paddingTop: 16,
                        borderTop: `1.5px solid ${THEME.line}`,
                      }}
                    >
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                          gap: 20,
                        }}
                      >
                        {/* Earnings breakdown */}
                        <div
                          style={{
                            background:
                              "var(--surface-0)",
                            border: `1.5px solid ${THEME.line}`,
                            borderLeft: `4px solid ${THEME.sage}`,
                            borderRadius: 12,
                            padding: 16,
                            boxShadow: "var(--shadow-sm)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10.5,
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
                            background:
                              "var(--surface-0)",
                            border: `1.5px solid ${THEME.line}`,
                            borderLeft: `4px solid ${THEME.rust}`,
                            borderRadius: 12,
                            padding: 16,
                            boxShadow: "var(--shadow-sm)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 10.5,
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
                            background: "var(--surface-1)",
                            border: `1.5px solid ${THEME.line}`,
                            fontSize: 12,
                            fontStyle: "italic",
                            color: THEME.muted,
                            fontWeight: 500,
                          }}
                        >
                          {s.notes}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
          )}
        </>
      )}

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
      {confirmDeleteId && (
        <ConfirmDialog
          message="Delete this salary slip? This cannot be undone."
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
