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
import { THEME, PROFILES } from "../../utils/constants";
import { fmtINRFull, uid, today } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { Badge } from "../ui/Badge";
import { StatCard } from "../ui/StatCard";
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

function autoCompute(form: any) {
  const earn = ["basic", "hra", "da", "specialAllowance", "lta", "bonus", "otherEarnings"];
  const deduct = ["pfEmployee", "esiEmployee", "professionalTax", "tds", "otherDeductions"];
  const gross = earn.reduce((s, k) => s + Number(form[k] || 0), 0);
  const totalD = deduct.reduce((s, k) => s + Number(form[k] || 0), 0);
  const net = gross - totalD;
  return {
    ...form,
    grossSalary: gross || form.grossSalary,
    totalDeductions: totalD || form.totalDeductions,
    netSalary: net || form.netSalary,
  };
}

function SlipForm({ initial, onSave, onClose, apiKey }: any) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
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
      const json = JSON.parse(text.replace(/```json?/gi, "").replace(/```/g, "").trim());
      setForm((f: any) => ({
        ...f,
        ...Object.fromEntries(Object.entries(json).filter(([, v]) => v !== undefined && v !== null && v !== "")),
      }));
    } catch (e: any) {
      setParseError("Parsing failed: " + (e?.message || "Unknown error"));
    } finally {
      setParsing(false);
    }
  }, [form.rawText, apiKey]);

  const computed = autoCompute(form);

  const save = () => {
    if (!form.slipMonth) return;
    onSave({ ...computed, id: initial?.id || uid() });
  };

  return (
    <Modal title={initial?.id ? "Edit Salary Slip" : "Add Salary Slip"} onClose={onClose} size="lg">
      {/* Month / employer */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Field label="Month *">
          <input className="input" type="month" value={form.slipMonth} onChange={(e) => set("slipMonth", e.target.value)} />
        </Field>
        <Field label="Employer">
          <input className="input" value={form.employer} onChange={(e) => set("employer", e.target.value)} placeholder="Company name" />
        </Field>
        <Field label="Owner">
          <select className="input" value={form.owner} onChange={(e) => set("owner", e.target.value)}>
            {PROFILES.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </div>

      {/* AI paste area */}
      <div style={{ background: `${THEME.primary}0a`, border: `1px solid ${THEME.primary}30`, borderRadius: 10, padding: 14, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <Sparkles size={14} color={THEME.primary} />
          <span style={{ fontSize: 13, fontWeight: 600, color: THEME.primary }}>AI Parser — paste salary slip text</span>
        </div>
        <textarea
          className="input"
          rows={4}
          placeholder="Paste the text from your salary slip PDF here… The AI will extract all fields automatically."
          value={form.rawText}
          onChange={(e) => set("rawText", e.target.value)}
          style={{ marginBottom: 8, fontSize: 12 }}
        />
        {parseError && <div style={{ fontSize: 12, color: THEME.danger, marginBottom: 8 }}>{parseError}</div>}
        <Button
          size="sm"
          onClick={parseWithAI}
          disabled={parsing || !form.rawText.trim()}
        >
          {parsing ? <><Loader size={12} style={{ animation: "spin 1s linear infinite" }} /> Parsing…</> : <><Sparkles size={12} /> Parse with Gemini</>}
        </Button>
        {!apiKey && (
          <span style={{ fontSize: 11, color: THEME.textMuted, marginLeft: 10 }}>
            (Add Gemini API key in Settings to enable)
          </span>
        )}
      </div>

      {/* Earnings */}
      <div style={{ fontWeight: 600, fontSize: 12, color: THEME.success, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
        Earnings
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
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
            <input className="input" type="number" value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder="0" />
          </Field>
        ))}
      </div>

      {/* Deductions */}
      <div style={{ fontWeight: 600, fontSize: 12, color: THEME.danger, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
        Deductions
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
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
            <input className="input" type="number" value={form[k]} onChange={(e) => set(k, e.target.value)} placeholder="0" />
          </Field>
        ))}
      </div>

      {/* Net */}
      <div style={{ background: `${THEME.success}12`, border: `1px solid ${THEME.success}30`, borderRadius: 8, padding: "12px 16px", marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontWeight: 600 }}>Net Salary (Take-Home)</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: THEME.success }}>
            {computed.netSalary ? <Prv>{fmtINRFull(Number(computed.netSalary))}</Prv> : "—"}
          </span>
        </div>
        {computed.grossSalary > 0 && computed.totalDeductions > 0 && (
          <div style={{ fontSize: 12, color: THEME.textMuted, marginTop: 4 }}>
            Gross: {fmtINRFull(Number(computed.grossSalary))} — Deductions: {fmtINRFull(Number(computed.totalDeductions))}
          </div>
        )}
      </div>

      <Field label="Net Salary (₹) *">
        <input className="input" type="number" value={form.netSalary} onChange={(e) => set("netSalary", e.target.value)} placeholder="Take-home amount" />
      </Field>

      <ModalActions>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save}>Save Slip</Button>
      </ModalActions>
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
  const chartData = sorted.slice(0, 12).reverse().map((s) => ({
    month: new Date(s.slipMonth + "-01").toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
    "Gross": Number(s.grossSalary || 0),
    "Net": Number(s.netSalary || 0),
    "TDS": Number(s.tds || 0),
    "PF": Number(s.pfEmployee || 0),
  }));

  const totalTDS = slips.reduce((s, sl) => s + Number(sl.tds || 0), 0);
  const totalPF = slips.reduce((s, sl) => s + Number(sl.pfEmployee || 0), 0);
  const avgNet = slips.length ? slips.reduce((s, sl) => s + Number(sl.netSalary || 0), 0) / slips.length : 0;

  const save = (data: any) => {
    if (data.id && slips.find((s: any) => s.id === data.id)) {
      updateItem("salarySlips", data.id, data);
    } else {
      addItem("salarySlips", data);
    }
    setModal(null);
  };

  return (
    <div>
      <SectionTitle
        icon={<Briefcase size={20} color={THEME.primary} />}
        title="Salary Slip Tracker"
        subtitle="Store monthly salary components — paste any slip text and let Gemini AI extract the details"
        action={<Button size="sm" onClick={() => setModal({})}>
          <Plus size={14} /> Add Slip
        </Button>}
      />

      {!apiKey && slips.length === 0 && (
        <div style={{
          background: `${THEME.primary}0a`, border: `1px dashed ${THEME.primary}50`,
          borderRadius: 10, padding: "12px 16px", marginBottom: 16,
          display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <Sparkles size={14} color={THEME.primary} style={{ marginTop: 2 }} />
          <div style={{ fontSize: 13, color: THEME.textMuted }}>
            <strong style={{ color: THEME.primary }}>AI Parsing available.</strong> Add your Gemini API key in Settings, then paste salary slip text to auto-fill all fields.
          </div>
        </div>
      )}

      {slips.length === 0 ? (
        <EmptyState
          icon={<FileText size={40} />}
          title="No salary slips tracked"
          description="Add monthly salary slips to track take-home pay, TDS deducted, PF contributions, and spot trends."
          action={<Button onClick={() => setModal({})}>
            <Plus size={14} /> Add First Slip
          </Button>}
        />
      ) : (
        <>
          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
            {latest && (
              <StatCard
                label="Last Net Salary"
                value={<Prv>{fmtINRFull(Number(latest.netSalary || 0))}</Prv>}
                icon={<IndianRupee size={18} />}
                color={THEME.success}
              />
            )}
            <StatCard
              label="Avg Monthly Net"
              value={<Prv>{fmtINRFull(avgNet)}</Prv>}
              icon={<TrendingUp size={18} />}
              color={THEME.primary}
            />
            <StatCard
              label="Total TDS (FY)"
              value={<Prv>{fmtINRFull(totalTDS)}</Prv>}
              icon={<TrendingDown size={18} />}
              color={THEME.danger}
            />
            <StatCard
              label="Total PF (Employee)"
              value={<Prv>{fmtINRFull(totalPF)}</Prv>}
              icon={<Briefcase size={18} />}
              color={THEME.gold}
            />
          </div>

          {/* Chart */}
          {chartData.length > 1 && (
            <Card style={{ marginBottom: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Salary Trend</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number, name: string) => [fmtINRFull(v), name]}
                    contentStyle={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 8 }}
                  />
                  <Legend />
                  <Bar dataKey="Gross" fill={`${THEME.primary}80`} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Net" fill={THEME.success} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="TDS" fill={THEME.danger} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Slip list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {sorted.map((s: any) => {
              const isExpanded = expanded === s.id;
              const net = Number(s.netSalary || 0);
              const gross = Number(s.grossSalary || 0);
              const pct = gross > 0 ? Math.round((net / gross) * 100) : 0;

              return (
                <Card key={s.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 10, background: `${THEME.primary}18`,
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <Briefcase size={20} color={THEME.primary} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>
                        {new Date(s.slipMonth + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                      </div>
                      <div style={{ fontSize: 12, color: THEME.textMuted }}>
                        {s.employer || ""}
                        {pct > 0 ? ` · ${pct}% take-home` : ""}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: THEME.success }}>
                        <Prv>{fmtINRFull(net)}</Prv>
                      </div>
                      <div style={{ fontSize: 11, color: THEME.textMuted }}>net</div>
                    </div>
                    {gross > 0 && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          <Prv>{fmtINRFull(gross)}</Prv>
                        </div>
                        <div style={{ fontSize: 11, color: THEME.textMuted }}>gross</div>
                      </div>
                    )}
                    {Number(s.tds) > 0 && (
                      <Badge color="danger">TDS <Prv>{fmtINRFull(Number(s.tds))}</Prv></Badge>
                    )}
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => setExpanded(isExpanded ? null : s.id)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.textMuted }}>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button onClick={() => setModal(s)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.textMuted }}>
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => { if (window.confirm("Delete this salary slip?")) removeItem("salarySlips", s.id); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: THEME.danger }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${THEME.border}` }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        {/* Earnings breakdown */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.success, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Earnings</div>
                          {[
                            ["Basic", s.basic],
                            ["HRA", s.hra],
                            ["DA", s.da],
                            ["Special Allowance", s.specialAllowance],
                            ["LTA", s.lta],
                            ["Bonus", s.bonus],
                            ["Other", s.otherEarnings],
                          ].filter(([, v]) => Number(v) > 0).map(([label, val]) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: THEME.textMuted, marginBottom: 3 }}>
                              <span>{label}</span>
                              <span><Prv>{fmtINRFull(Number(val))}</Prv></span>
                            </div>
                          ))}
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: THEME.success, borderTop: `1px solid ${THEME.border}`, paddingTop: 4, marginTop: 4 }}>
                            <span>Gross</span>
                            <span><Prv>{fmtINRFull(Number(s.grossSalary || 0))}</Prv></span>
                          </div>
                        </div>
                        {/* Deductions breakdown */}
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.danger, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>Deductions</div>
                          {[
                            ["PF (Employee)", s.pfEmployee],
                            ["PF (Employer)", s.pfEmployer],
                            ["ESI", s.esiEmployee],
                            ["Professional Tax", s.professionalTax],
                            ["TDS", s.tds],
                            ["Other", s.otherDeductions],
                          ].filter(([, v]) => Number(v) > 0).map(([label, val]) => (
                            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: THEME.textMuted, marginBottom: 3 }}>
                              <span>{label}</span>
                              <span style={{ color: THEME.danger }}><Prv>{fmtINRFull(Number(val))}</Prv></span>
                            </div>
                          ))}
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: THEME.danger, borderTop: `1px solid ${THEME.border}`, paddingTop: 4, marginTop: 4 }}>
                            <span>Total Deductions</span>
                            <span><Prv>{fmtINRFull(Number(s.totalDeductions || 0))}</Prv></span>
                          </div>
                        </div>
                      </div>
                      {s.notes && <div style={{ marginTop: 8, fontSize: 12, fontStyle: "italic", color: THEME.textMuted }}>{s.notes}</div>}
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
