/* eslint-disable */
// @ts-nocheck
import React, { useState, useCallback } from "react";
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
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { fmtINRFull, uid, today } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { ModalSection } from "../ui/ModalSection";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { Badge } from "../ui/Badge";
import { Prv } from "../../context/PrivacyContext";

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date();
  d.setMonth(d.getMonth() - i);
  return d.toISOString().slice(0, 7);
});

const EMPTY: any = {
  owner: "self",
  employer: "",
  slipMonth: today().slice(0, 7),
  basic: "",
  hra: "",
  da: "",
  specialAllowance: "",
  lta: "",
  bonus: "",
  otherEarnings: "",
  grossSalary: "",
  pfEmployee: "",
  pfEmployer: "",
  esiEmployee: "",
  professionalTax: "",
  tds: "",
  otherDeductions: "",
  totalDeductions: "",
  netSalary: "",
  rawText: "",
  notes: "",
};

function autoCompute(form: any, netSalaryTouched?: boolean) {
  const earn = ["basic", "hra", "da", "specialAllowance", "lta", "bonus", "otherEarnings"];
  const deduct = ["pfEmployee", "esiEmployee", "professionalTax", "tds", "otherDeductions"];
  const gross = earn.reduce((s, k) => s + Number(form[k] || 0), 0);
  const totalD = deduct.reduce((s, k) => s + Number(form[k] || 0), 0);
  const net = gross - totalD;
  return {
    ...form,
    grossSalary: gross || form.grossSalary,
    totalDeductions: totalD || form.totalDeductions,
    netSalary: netSalaryTouched ? form.netSalary : net || form.netSalary,
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
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
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

/* ─── Premium Salary Bento Card ─────────────────────────────────── */
const SalaryStatCard = ({ label, value, icon: Icon, color }: any) => {
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

function SlipForm({ initial, onSave, onClose, apiKey }: any) {
  const { familyProfiles } = useMasterData();
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [netSalaryTouched, setNetSalaryTouched] = useState(false);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

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
basic, hra, da, specialAllowance, lta, bonus, otherEarnings, grossSalary, pfEmployee, pfEmployer, esiEmployee, professionalTax, tds, otherDeductions, totalDeductions, netSalary, employer, slipMonth (YYYY-MM format)

Salary slip text:
${form.rawText}

Return only the JSON, no explanation.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      const json = JSON.parse(
        text
          .replace(/```json?/gi, "")
          .replace(/```/g, "")
          .trim()
      );
      setForm((f: any) => ({
        ...f,
        ...Object.fromEntries(
          Object.entries(json).filter(([, v]) => v !== undefined && v !== null && v !== "")
        ),
      }));
    } catch (e: any) {
      setParseError("Parsing failed: " + (e?.message || "Unknown error"));
    } finally {
      setParsing(false);
    }
  }, [form.rawText, apiKey]);

  const computed = autoCompute(form, netSalaryTouched);

  const save = () => {
    if (!form.slipMonth) return;
    onSave({ ...computed, id: initial?.id || uid() });
  };

  return (
    <Modal
      title={initial?.id ? "Edit Salary Slip" : "Add Salary Slip"}
      onClose={onClose}
      maxWidth={720}
    >
      <ModalSection title="Slip Info" first />
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}
      >
        <Field label="Month *">
          <input
            className="form-input"
            type="month"
            value={form.slipMonth}
            onChange={(e) => set("slipMonth", e.target.value)}
          />
        </Field>
        <Field label="Employer">
          <input
            className="form-input"
            value={form.employer}
            onChange={(e) => set("employer", e.target.value)}
            placeholder="Company name"
          />
        </Field>
        <Field label="Owner">
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

      {/* AI paste area */}
      <div
        style={{
          background:
            "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--accent) 8%, var(--surface-0)) 100%)",
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {[
          ["basic", "Basic Salary"],
          ["hra", "HRA"],
          ["da", "DA"],
          ["specialAllowance", "Special Allowance"],
          ["lta", "LTA"],
          ["bonus", "Bonus / Incentive"],
          ["otherEarnings", "Other Earnings"],
          ["grossSalary", "Gross Salary *"],
        ].map(([k, label]) => (
          <Field key={k} label={label}>
            <input
              className="form-input"
              type="number"
              value={form[k]}
              onChange={(e) => set(k, e.target.value)}
              placeholder="0"
            />
          </Field>
        ))}
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {[
          ["pfEmployee", "PF (Employee)"],
          ["pfEmployer", "PF (Employer)"],
          ["esiEmployee", "ESI"],
          ["professionalTax", "Professional Tax"],
          ["tds", "TDS"],
          ["otherDeductions", "Other Deductions"],
          ["totalDeductions", "Total Deductions *"],
        ].map(([k, label]) => (
          <Field key={k} label={label}>
            <input
              className="form-input"
              type="number"
              value={form[k]}
              onChange={(e) => set(k, e.target.value)}
              placeholder="0"
            />
          </Field>
        ))}
      </div>

      {/* Net */}
      <div
        style={{
          background:
            "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--accent) 8%, var(--surface-0)) 100%)",
          border: `1.5px solid ${THEME.line}`,
          borderLeft: `4px solid ${THEME.sage}`,
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
          <span style={{ fontSize: 22, fontWeight: 900, color: THEME.sage }}>
            {computed.netSalary ? <Prv>{fmtINRFull(Number(computed.netSalary))}</Prv> : "—"}
          </span>
        </div>
        {computed.grossSalary > 0 && computed.totalDeductions > 0 && (
          <div style={{ fontSize: 11.5, color: THEME.muted, marginTop: 6, fontWeight: 500 }}>
            Gross: {fmtINRFull(Number(computed.grossSalary))} &bull; Deductions:{" "}
            {fmtINRFull(Number(computed.totalDeductions))}
          </div>
        )}
      </div>

      <Field label="Net Salary (₹) *">
        <input
          className="form-input"
          type="number"
          value={form.netSalary}
          onChange={(e) => {
            setNetSalaryTouched(true);
            set("netSalary", e.target.value);
          }}
          placeholder="Take-home amount"
        />
      </Field>

      <ModalActions onSave={save} onClose={onClose} saveLabel="Save Slip" />
    </Modal>
  );
}

export function SalarySlipTab({ state, addItem, removeItem, updateItem }: any) {
  const slips: any[] = state.salarySlips || [];
  const [modal, setModal] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const apiKey = state?.settings?.geminiApiKey || "";

  const sorted = [...slips].sort((a, b) => b.slipMonth.localeCompare(a.slipMonth));
  const latest = sorted[0];

  // Chart data — last 12 months
  const chartData = sorted
    .slice(0, 12)
    .reverse()
    .map((s) => ({
      month: new Date(s.slipMonth + "-01").toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit",
      }),
      Gross: Number(s.grossSalary || 0),
      Net: Number(s.netSalary || 0),
      TDS: Number(s.tds || 0),
      PF: Number(s.pfEmployee || 0),
    }));

  const totalTDS = slips.reduce((s, sl) => s + Number(sl.tds || 0), 0);
  const totalPF = slips.reduce((s, sl) => s + Number(sl.pfEmployee || 0), 0);
  const avgNet = slips.length
    ? slips.reduce((s, sl) => s + Number(sl.netSalary || 0), 0) / slips.length
    : 0;

  const save = (data: any) => {
    if (data.id && slips.find((s: any) => s.id === data.id)) {
      updateItem("salarySlips", data.id, data);
    } else {
      addItem("salarySlips", data);
    }
    setModal(null);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle
        sub="Store monthly salary components — paste any slip text and let Gemini AI extract the details"
        rightElement={
          <Button size="sm" onClick={() => setModal({})}>
            <Plus size={14} /> Add Slip
          </Button>
        }
      >
        Salary Slip Tracker
      </SectionTitle>

      {!apiKey && slips.length === 0 && (
        <div
          style={{
            background:
              "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--accent) 6%, var(--surface-0)) 100%)",
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
          gradient="linear-gradient(135deg, #0891b2 0%, #22d3ee 100%)"
          dotColor="#0891b2"
          title="No Salary Slips Tracked"
          description="Add monthly salary slips to track take-home pay, TDS deducted, PF contributions, and spot trends."
          pills={[
            "AI Auto-Parse",
            "Gross vs Net Trend",
            "TDS & PF Breakdown",
            "Monthly Comparison",
          ]}
          buttonLabel="Add First Slip"
          onAdd={() => setModal({})}
        />
      ) : (
        <>
          {/* Stats Summary Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 16,
            }}
          >
            {latest && (
              <SalaryStatCard
                label="Last Net Salary"
                value={<Prv>{fmtINRFull(Number(latest.netSalary || 0))}</Prv>}
                icon={<IndianRupee size={16} />}
                color={THEME.sage}
              />
            )}
            <SalaryStatCard
              label="Avg Monthly Net"
              value={<Prv>{fmtINRFull(avgNet)}</Prv>}
              icon={<TrendingUp size={16} />}
              color="var(--accent)"
            />
            <SalaryStatCard
              label="Total TDS (FY)"
              value={<Prv>{fmtINRFull(totalTDS)}</Prv>}
              icon={<TrendingDown size={16} />}
              color={THEME.rust}
            />
            <SalaryStatCard
              label="Total PF (Employee)"
              value={<Prv>{fmtINRFull(totalPF)}</Prv>}
              icon={<Briefcase size={16} />}
              color="#D97706"
            />
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
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
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
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(v: number, name: string) => [fmtINRFull(v), name]}
                    content={<ChartTooltip formatter={(v) => fmtINRFull(v)} />}
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
              </ResponsiveContainer>
            </Card>
          )}

          {/* Slip Accordion list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sorted.map((s: any) => {
              const isExpanded = expanded === s.id;
              const net = Number(s.netSalary || 0);
              const gross = Number(s.grossSalary || 0);
              const pct = gross > 0 ? Math.round((net / gross) * 100) : 0;

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
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: `color-mix(in srgb, var(--accent) 12%, transparent)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--accent)",
                        flexShrink: 0,
                      }}
                    >
                      <Briefcase size={16} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14.5, color: THEME.ink }}>
                        {new Date(s.slipMonth + "-01").toLocaleDateString("en-IN", {
                          month: "long",
                          year: "numeric",
                        })}
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
                          fontWeight: 800,
                          fontSize: 15,
                          color: THEME.sage,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Prv>{fmtINRFull(net)}</Prv>
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>net</div>
                    </div>
                    {gross > 0 && (
                      <div style={{ textAlign: "right" }}>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: 14.5,
                            color: THEME.ink,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          <Prv>{fmtINRFull(gross)}</Prv>
                        </div>
                        <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                          gross
                        </div>
                      </div>
                    )}
                    {Number(s.tds) > 0 && (
                      <Badge variant="rust" style={{ fontSize: 9.5, padding: "2px 8px" }}>
                        TDS <Prv>{fmtINRFull(Number(s.tds))}</Prv>
                      </Badge>
                    )}
                    <div style={{ display: "flex", gap: 6, marginLeft: 6 }}>
                      <button
                        onClick={() => setExpanded(isExpanded ? null : s.id)}
                        className="card-lift"
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
                          transition: "all 0.2s ease",
                        }}
                      >
                        {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                      </button>
                      <button
                        onClick={() => setModal(s)}
                        className="card-lift"
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
                          transition: "all 0.2s ease",
                        }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm("Delete this salary slip?"))
                            removeItem("salarySlips", s.id);
                        }}
                        className="card-lift"
                        style={{
                          background: `${THEME.rust}09`,
                          border: `1.5px solid ${THEME.rust}30`,
                          borderRadius: 8,
                          cursor: "pointer",
                          color: THEME.rust,
                          width: 28,
                          height: 28,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.2s ease",
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
                              "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 8%, var(--surface-0)) 100%)",
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
                            ["DA", s.da],
                            ["Special Allowance", s.specialAllowance],
                            ["LTA", s.lta],
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
                                  <Prv>{fmtINRFull(Number(val))}</Prv>
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
                            <span>
                              <Prv>{fmtINRFull(Number(s.grossSalary || 0))}</Prv>
                            </span>
                          </div>
                        </div>
                        {/* Deductions breakdown */}
                        <div
                          style={{
                            background:
                              "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 8%, var(--surface-0)) 100%)",
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
                                  <Prv>{fmtINRFull(Number(val))}</Prv>
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
                            <span>
                              <Prv>{fmtINRFull(Number(s.totalDeductions || 0))}</Prv>
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
        </>
      )}

      {modal !== null && (
        <SlipForm
          initial={modal?.id ? modal : undefined}
          onSave={save}
          onClose={() => setModal(null)}
          apiKey={apiKey}
        />
      )}
    </div>
  );
}
