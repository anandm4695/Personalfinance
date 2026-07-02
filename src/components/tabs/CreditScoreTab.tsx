// @ts-nocheck
import React, { useState } from "react";
import {
  CreditCard,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  AlertCircle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { THEME, PROFILES } from "../../utils/constants";
import { uid, today } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { Badge } from "../ui/Badge";
import { StatCard } from "../ui/StatCard";

const BUREAUS = ["CIBIL", "Experian", "CRIF", "Equifax"];
const SOURCES = ["manual", "OneScore", "Paisabazaar", "BankApp", "Other"];

function scoreGrade(score: number): { label: string; color: string; bg: string } {
  if (score >= 750) return { label: "Excellent", color: "#16a34a", bg: "#dcfce7" };
  if (score >= 700) return { label: "Good", color: "#2563eb", bg: "#dbeafe" };
  if (score >= 650) return { label: "Fair", color: "#d97706", bg: "#fef3c7" };
  if (score >= 600) return { label: "Poor", color: "#dc2626", bg: "#fee2e2" };
  return { label: "Very Poor", color: "#7f1d1d", bg: "#fecaca" };
}

const BUREAU_COLORS: Record<string, string> = {
  CIBIL: THEME.primary,
  Experian: "#8b5cf6",
  CRIF: "#059669",
  Equifax: "#d97706",
};

const EMPTY = {
  score: "",
  bureau: "CIBIL",
  checkDate: today(),
  owner: "self",
  source: "manual",
  notes: "",
};

function ScoreForm({ initial, onSave, onClose }: any) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = () => {
    const score = Number(form.score);
    if (!score || score < 300 || score > 900) return;
    onSave({ ...form, score, id: initial?.id || uid() });
  };

  return (
    <Modal title={initial?.id ? "Edit Credit Score Entry" : "Add Credit Score"} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Credit Score (300–900) *">
          <input
            className="input"
            type="number"
            min={300}
            max={900}
            value={form.score}
            onChange={(e) => set("score", e.target.value)}
            placeholder="e.g. 782"
          />
        </Field>
        <Field label="Bureau">
          <select className="input" value={form.bureau} onChange={(e) => set("bureau", e.target.value)}>
            {BUREAUS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </Field>
        <Field label="Check Date *">
          <input className="input" type="date" value={form.checkDate} onChange={(e) => set("checkDate", e.target.value)} />
        </Field>
        <Field label="Owner">
          <select className="input" value={form.owner} onChange={(e) => set("owner", e.target.value)}>
            {PROFILES.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Source">
          <select className="input" value={form.source} onChange={(e) => set("source", e.target.value)}>
            {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Notes" style={{ marginTop: 12 }}>
        <input className="input" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Optional note" />
      </Field>
      <ModalActions onSave={save} onClose={onClose} saveLabel="Save Score" />
    </Modal>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const grade = scoreGrade(score);
  const pct = ((score - 300) / 600) * 100;

  return (
    <div style={{ textAlign: "center", padding: "16px 0" }}>
      <div style={{ position: "relative", display: "inline-block", marginBottom: 12 }}>
        <div style={{
          width: 120, height: 120, borderRadius: "50%",
          background: `conic-gradient(${grade.color} ${pct * 3.6}deg, ${THEME.border} 0)`,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 90, height: 90, borderRadius: "50%",
            background: THEME.card, display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column",
          }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: grade.color }}>{score}</span>
          </div>
        </div>
      </div>
      <div>
        <Badge style={{ background: grade.bg, color: grade.color, fontWeight: 700 }}>
          {grade.label}
        </Badge>
      </div>
    </div>
  );
}

export function CreditScoreTab({ state, addItem, removeItem, updateItem }: any) {
  const scores: any[] = state.creditScores || [];
  const [modal, setModal] = useState<any>(null);
  const [bureau, setBureau] = useState("CIBIL");

  const filtered = scores.filter((s) => s.bureau === bureau);
  const sorted = [...filtered].sort((a, b) => a.checkDate.localeCompare(b.checkDate));
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const delta = latest && prev ? latest.score - prev.score : null;

  const chartData = sorted.map((s) => ({
    date: new Date(s.checkDate).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
    score: s.score,
  }));

  const save = (data: any) => {
    if (data.id && scores.find((s: any) => s.id === data.id)) {
      updateItem("creditScores", data.id, data);
    } else {
      addItem("creditScores", data);
    }
    setModal(null);
  };

  return (
    <div>
      <SectionTitle
        sub="Track your CIBIL / Experian credit score over time"
        rightElement={<Button size="sm" onClick={() => setModal({})}>
          <Plus size={14} /> Log Score
        </Button>}
      >
        Credit Score History
      </SectionTitle>

      {scores.length === 0 ? (
        <EmptyState
          icon={Award}
          gradient="linear-gradient(135deg, #7c3aed 0%, #c084fc 100%)"
          dotColor="#7c3aed"
          title="No Credit Score Entries Yet"
          description="Log your credit score from CIBIL, Experian, or other bureaus to track it over time."
          pills={["CIBIL / Experian / CRIF", "Score Trend Chart", "Score Bands", "Improvement Tips"]}
          buttonLabel="Log Score"
          onAdd={() => setModal({})}
        />
      ) : (
        <>
          {/* Bureau selector */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            {BUREAUS.map((b) => {
              const cnt = scores.filter((s) => s.bureau === b).length;
              if (cnt === 0) return null;
              return (
                <button
                  key={b}
                  onClick={() => setBureau(b)}
                  style={{
                    padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                    border: `2px solid ${bureau === b ? BUREAU_COLORS[b] : THEME.border}`,
                    background: bureau === b ? `${BUREAU_COLORS[b]}18` : "transparent",
                    color: bureau === b ? BUREAU_COLORS[b] : THEME.textMuted,
                    cursor: "pointer",
                  }}
                >
                  {b} ({cnt})
                </button>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", color: THEME.textMuted, padding: 32 }}>
              No entries for {bureau}
            </div>
          ) : (
            <>
              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
                {latest && (
                  <Card style={{ textAlign: "center", padding: 0 }}>
                    <ScoreGauge score={latest.score} />
                    <div style={{ fontSize: 11, color: THEME.textMuted, paddingBottom: 12 }}>
                      Latest · {new Date(latest.checkDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                  </Card>
                )}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {delta !== null && (
                    <StatCard
                      label="Change"
                      value={
                        <span style={{ color: delta > 0 ? THEME.success : delta < 0 ? THEME.danger : THEME.textMuted }}>
                          {delta > 0 ? <TrendingUp size={14} style={{ display: "inline", marginRight: 4 }} /> : delta < 0 ? <TrendingDown size={14} style={{ display: "inline", marginRight: 4 }} /> : <Minus size={14} style={{ display: "inline", marginRight: 4 }} />}
                          {delta > 0 ? "+" : ""}{delta}
                        </span>
                      }
                      icon={<TrendingUp size={18} />}
                      color={delta > 0 ? THEME.success : delta < 0 ? THEME.danger : THEME.textMuted}
                    />
                  )}
                  <StatCard
                    label="Entries"
                    value={filtered.length}
                    icon={<CreditCard size={18} />}
                    color={THEME.primary}
                  />
                  {sorted.length >= 2 && (
                    <StatCard
                      label="Best Score"
                      value={Math.max(...sorted.map((s) => s.score))}
                      icon={<Award size={18} />}
                      color={THEME.success}
                    />
                  )}
                </div>
              </div>

              {/* Score guide */}
              <Card style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: THEME.textMuted, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Score Bands
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[
                    { range: "750–900", label: "Excellent", color: "#16a34a", bg: "#dcfce7" },
                    { range: "700–749", label: "Good", color: "#2563eb", bg: "#dbeafe" },
                    { range: "650–699", label: "Fair", color: "#d97706", bg: "#fef3c7" },
                    { range: "600–649", label: "Poor", color: "#dc2626", bg: "#fee2e2" },
                    { range: "< 600", label: "Very Poor", color: "#7f1d1d", bg: "#fecaca" },
                  ].map((b) => (
                    <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 20, background: b.bg }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: b.color }}>{b.range}</span>
                      <span style={{ fontSize: 11, color: b.color }}>{b.label}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Chart */}
              {chartData.length > 1 && (
                <Card style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Score Trend — {bureau}</div>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[300, 900]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v: number) => [v, "Score"]}
                        contentStyle={{ background: THEME.card, border: `1px solid ${THEME.border}`, borderRadius: 8 }}
                      />
                      <ReferenceLine y={750} stroke="#16a34a" strokeDasharray="4 4" label={{ value: "Excellent", fontSize: 11, fill: "#16a34a", position: "right" }} />
                      <ReferenceLine y={700} stroke="#2563eb" strokeDasharray="4 4" />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke={BUREAU_COLORS[bureau] || THEME.primary}
                        strokeWidth={2.5}
                        dot={{ r: 5, fill: BUREAU_COLORS[bureau] || THEME.primary }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>
              )}

              {/* History list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[...sorted].reverse().map((s) => {
                  const grade = scoreGrade(s.score);
                  return (
                    <Card key={s.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{
                        width: 52, height: 52, borderRadius: 10,
                        background: grade.bg, display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0,
                      }}>
                        <span style={{ fontSize: 18, fontWeight: 800, color: grade.color }}>{s.score}</span>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>
                          {new Date(s.checkDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}
                        </div>
                        <div style={{ fontSize: 12, color: THEME.textMuted }}>
                          {s.bureau} · {s.source}
                          {s.notes ? ` · ${s.notes}` : ""}
                        </div>
                      </div>
                      <Badge style={{ background: grade.bg, color: grade.color }}>{grade.label}</Badge>
                      <button
                        onClick={() => { if (window.confirm("Delete this entry?")) removeItem("creditScores", s.id); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: THEME.danger, padding: 4 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {latest && latest.score < 700 && (
        <Card style={{ marginTop: 16, background: `${THEME.warning}12`, border: `1px solid ${THEME.warning}40` }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertCircle size={16} color={THEME.warning} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: THEME.warning }}>Tips to improve your score</div>
              <ul style={{ fontSize: 12, color: THEME.textMuted, margin: "8px 0 0", paddingLeft: 16, lineHeight: 1.8 }}>
                <li>Pay all credit card bills before the due date</li>
                <li>Keep credit card utilisation below 30% of limit</li>
                <li>Don't apply for multiple loans/cards in a short period</li>
                <li>Maintain older credit cards — age of credit history matters</li>
                <li>Check credit report for errors and dispute incorrect entries</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {modal !== null && (
        <ScoreForm
          initial={modal?.id ? modal : undefined}
          onSave={save}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
