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
import { THEME } from "../../utils/constants";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { uid, today } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { ModalSection } from "../ui/ModalSection";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { Badge } from "../ui/Badge";
import { StatCard } from "../ui/StatCard";

const BUREAUS = ["CIBIL", "Experian", "CRIF", "Equifax"];
const SOURCES = ["manual", "OneScore", "Paisabazaar", "BankApp", "Other"];

function scoreGrade(score: number): { label: string; color: string; bg: string } {
  if (score >= 750) return { label: "Excellent", color: "#16a34a", bg: "color-mix(in srgb, #16a34a 12%, transparent)" };
  if (score >= 700) return { label: "Good", color: "#2563eb", bg: "color-mix(in srgb, #2563eb 12%, transparent)" };
  if (score >= 650) return { label: "Fair", color: "#d97706", bg: "color-mix(in srgb, #d97706 12%, transparent)" };
  if (score >= 600) return { label: "Poor", color: "#dc2626", bg: "color-mix(in srgb, #dc2626 12%, transparent)" };
  return { label: "Very Poor", color: "#7f1d1d", bg: "color-mix(in srgb, #7f1d1d 12%, transparent)" };
}

const BUREAU_COLORS: Record<string, string> = {
  CIBIL: "#4f46e5",
  Experian: "#8b5cf6",
  CRIF: "#059669",
  Equifax: "#d97706",
};

function getOwnerAvatarInfo(ownerId: string) {
  switch (ownerId) {
    case "self":
      return {
        initials: "AM",
        name: "Anand Mohta",
        relation: "Self",
        color: "#6366F1",
        bg: "color-mix(in srgb, #6366F1 12%, transparent)",
      };
    case "wife":
      return {
        initials: "DM",
        name: "Dharna Mohta",
        relation: "Wife",
        color: "#EC4899",
        bg: "color-mix(in srgb, #EC4899 12%, transparent)",
      };
    case "daughter":
      return {
        initials: "RM",
        name: "Revika Mohta",
        relation: "Daughter",
        color: "#A855F7",
        bg: "color-mix(in srgb, #A855F7 12%, transparent)",
      };
    case "huf":
      return {
        initials: "H",
        name: "Anand Mohta HUF",
        relation: "HUF",
        color: "#14B8A6",
        bg: "color-mix(in srgb, #14B8A6 12%, transparent)",
      };
    default:
      return {
        initials: "??",
        name: ownerId,
        relation: "",
        color: "#64748B",
        bg: "color-mix(in srgb, #64748B 12%, transparent)",
      };
  }
}

const EMPTY = {
  score: "",
  bureau: "CIBIL",
  checkDate: today(),
  owner: "self",
  source: "manual",
  notes: "",
};

function ScoreForm({ initial, onSave, onClose }: any) {
  const { familyProfiles } = useMasterData();
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = () => {
    const score = Number(form.score);
    if (!score || score < 300 || score > 900) return;
    onSave({ ...form, score, id: initial?.id || uid() });
  };

  return (
    <Modal
      title={initial?.id ? "Edit Credit Score Entry" : "Add Credit Score"}
      onClose={onClose}
      maxWidth={560}
    >
      <ModalSection title="Score Details" first />
      <div className="doc-vault-form-grid" style={{ gap: "0 16px" }}>
        <Field label="Credit Score (300–900) *">
          <input
            className="form-input"
            type="number"
            min={300}
            max={900}
            value={form.score}
            onChange={(e) => set("score", e.target.value)}
            placeholder="e.g. 782"
          />
        </Field>
        <Field label="Bureau">
          <select
            className="form-input"
            value={form.bureau}
            onChange={(e) => set("bureau", e.target.value)}
          >
            {BUREAUS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Check Date *">
          <input
            className="form-input"
            type="date"
            value={form.checkDate}
            onChange={(e) => set("checkDate", e.target.value)}
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
        <Field label="Source" style={{ gridColumn: "1 / -1" }}>
          <select
            className="form-input"
            value={form.source}
            onChange={(e) => set("source", e.target.value)}
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <ModalSection title="Additional Details" />
      <Field label="Notes">
        <input
          className="form-input"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Optional note"
        />
      </Field>
      <ModalActions onSave={save} onClose={onClose} saveLabel="Save Score" />
    </Modal>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const grade = scoreGrade(score);
  const pct = Math.min(1, Math.max(0, (score - 300) / 600));
  const angle = pct * 180;

  return (
    <div style={{ textAlign: "center", padding: "16px 0 8px 0" }}>
      <div style={{ position: "relative", display: "inline-block", width: 180, height: 110 }}>
        <svg width="180" height="110" viewBox="0 0 120 75" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#dc2626" />
              <stop offset="30%" stopColor="#d97706" />
              <stop offset="70%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
          </defs>
          
          {/* Base track */}
          <circle
            cx={60}
            cy={60}
            r={45}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth={8}
            strokeDasharray="141.37 141.37"
            transform="rotate(-180 60 60)"
            strokeLinecap="round"
          />
          
          {/* Active colored track */}
          <circle
            cx={60}
            cy={60}
            r={45}
            fill="none"
            stroke="url(#gauge-grad)"
            strokeWidth={8}
            strokeDasharray="141.37 141.37"
            strokeDashoffset={141.37 - (pct * 141.37)}
            transform="rotate(-180 60 60)"
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)" }}
          />

          {/* Scale Ticks */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const tickAngle = -180 + t * 180;
            const rad = (tickAngle * Math.PI) / 180;
            const x1 = 60 + 49 * Math.cos(rad);
            const y1 = 60 + 49 * Math.sin(rad);
            const x2 = 60 + 53 * Math.cos(rad);
            const y2 = 60 + 53 * Math.sin(rad);
            return (
              <line
                key={t}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--t-muted)"
                strokeWidth={1}
                opacity={0.6}
              />
            );
          })}
          
          {/* Needle */}
          <line
            x1={60}
            y1={60}
            x2={22}
            y2={60}
            stroke={grade.color}
            strokeWidth={3.5}
            strokeLinecap="round"
            transform={`rotate(${angle} 60 60)`}
            style={{ transition: "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)" }}
          />
          
          {/* Center Cap */}
          <circle cx={60} cy={60} r={7} fill={grade.color} stroke="var(--surface-0)" strokeWidth={2.5} />
          <circle cx={60} cy={60} r={2.5} fill="var(--surface-0)" />
        </svg>

        {/* Score numbers absolute positioned */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "flex-end",
            height: 60,
          }}
        >
          <span style={{ fontSize: 32, fontWeight: 900, color: THEME.ink, letterSpacing: "-0.04em", lineHeight: 1 }}>
            {score}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: grade.color,
              marginTop: 4,
            }}
          >
            {grade.label}
          </span>
        </div>
      </div>
      
      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 8, fontWeight: 500 }}>
        Range: 300 to 900
      </div>
    </div>
  );
}

function CreditFactorsPanel() {
  const factors = [
    { name: "Payment History", weight: "35% weight", desc: "Timely bill payments", value: 95, rating: "Excellent", color: "#16a34a" },
    { name: "Credit Utilization", weight: "30% weight", desc: "Balance to credit limit", value: 78, rating: "Good", color: "#2563eb" },
    { name: "Credit History Age", weight: "15% weight", desc: "Age of accounts", value: 60, rating: "Fair", color: "#d97706" },
    { name: "Total Accounts / Mix", weight: "10% weight", desc: "Credit types variety", value: 85, rating: "Good", color: "#2563eb" },
    { name: "Recent Inquiries", weight: "10% weight", desc: "Hard score checks", value: 90, rating: "Excellent", color: "#16a34a" },
  ];

  return (
    <Card style={{ padding: "20px 24px" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Key Credit Factors Analysis
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {factors.map((f, idx) => (
          <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>{f.name}</span>
                <span style={{ fontSize: 10, color: THEME.muted, marginLeft: 6 }}>({f.weight})</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: f.color }}>{f.rating}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--surface-2)", overflow: "hidden" }}>
                <div style={{ width: `${f.value}%`, height: "100%", borderRadius: 3, background: f.color }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: THEME.muted, width: 28, textAlign: "right" }}>{f.value}%</span>
            </div>
            <span style={{ fontSize: 10, color: THEME.muted }}>{f.desc}</span>
          </div>
        ))}
      </div>
    </Card>
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

  function OwnerAvatar({ ownerId, size = 22 }: { ownerId: string; size?: number }) {
    const info = getOwnerAvatarInfo(ownerId);
    return (
      <div
        title={`${info.name} (${info.relation})`}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: info.bg,
          border: `1.5px solid ${info.color}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: info.color,
          fontSize: size * 0.45,
          fontWeight: 700,
          cursor: "default",
          flexShrink: 0,
        }}
      >
        {info.initials}
      </div>
    );
  }

  return (
    <div>
      <style>{`
        .bureau-select-card {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 12px 16px;
          border-radius: 12px;
          background: var(--surface-0);
          border: 1.5px solid var(--t-line);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: var(--shadow-sm);
        }
        .bureau-select-card:hover {
          transform: translateY(-2px);
          border-color: var(--b-color) !important;
          box-shadow: 0 4px 12px color-mix(in srgb, var(--b-color) 8%, transparent);
        }
        .bureau-select-card.active {
          border-color: var(--b-color) !important;
          background: color-mix(in srgb, var(--b-color) 6%, var(--surface-0));
          box-shadow: 0 4px 18px -4px color-mix(in srgb, var(--b-color) 20%, transparent);
        }
        .credit-score-history-card {
          position: relative;
          background: var(--surface-0);
          border: 1.5px solid var(--t-line);
          border-radius: 12px;
          overflow: hidden;
          transition: all 0.2s;
        }
        .credit-score-history-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-md);
          border-color: var(--t-accent);
        }
        .credit-score-stats-grid {
          display: grid;
          grid-template-columns: 1.2fr 1.5fr 1fr;
          gap: 16px;
          margin-bottom: 24px;
        }
        .form-input {
          border-radius: var(--radius-md, 8px) !important;
          border: 1.5px solid var(--t-line) !important;
          background: var(--surface-0) !important;
          color: var(--t-ink) !important;
          outline: none !important;
          transition: all 0.2s ease-in-out !important;
        }
        .form-input:focus {
          border-color: var(--t-accent) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--t-accent) 12%, transparent) !important;
        }
        @media (max-width: 900px) {
          .credit-score-stats-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }
        }
        @media (max-width: 600px) {
          .bureau-deck {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>

      <SectionTitle
        sub="Track and monitor your credit health across primary bureaus"
        rightElement={
          <Button variant="accent" icon={<Plus size={14} />} onClick={() => setModal({})}>
            Log Score
          </Button>
        }
      >
        Credit Score Center
      </SectionTitle>

      {scores.length === 0 ? (
        <EmptyState
          icon={Award}
          gradient="linear-gradient(135deg, #7c3aed 0%, #c084fc 100%)"
          dotColor="#7c3aed"
          title="No Credit Score Entries Yet"
          description="Log your credit score from CIBIL, Experian, or other bureaus to track it over time."
          pills={[
            "CIBIL / Experian / CRIF",
            "Score Trend Chart",
            "Score Bands",
            "Improvement Tips",
          ]}
          buttonLabel="Log Score"
          onAdd={() => setModal({})}
        />
      ) : (
        <>
          {/* Interactive bureau cards deck */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }} className="bureau-deck">
            {BUREAUS.map((b) => {
              const filteredForBureau = scores.filter((s) => s.bureau === b);
              const cnt = filteredForBureau.length;
              const isActive = bureau === b;
              const bColor = BUREAU_COLORS[b];
              
              const sortedForBureau = [...filteredForBureau].sort((x, y) => x.checkDate.localeCompare(y.checkDate));
              const latestScore = sortedForBureau[sortedForBureau.length - 1]?.score;

              return (
                <div
                  key={b}
                  onClick={() => setBureau(b)}
                  className={`bureau-select-card ${isActive ? "active" : ""}`}
                  style={{ "--b-color": bColor } as React.CSSProperties}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: isActive ? bColor : THEME.ink }}>
                      {b}
                    </span>
                    {cnt > 0 && (
                      <Badge variant="muted" style={{ fontSize: 9, padding: "1px 5px" }}>
                        {cnt}
                      </Badge>
                    )}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: latestScore ? THEME.ink : THEME.muted, letterSpacing: "-0.02em", marginTop: 4 }}>
                    {latestScore || "--"}
                  </div>
                  <span style={{ fontSize: 9, color: THEME.muted }}>
                    {cnt === 0 ? "No records" : "Latest Rating"}
                  </span>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <Card style={{ padding: "40px 24px", textAlign: "center", borderStyle: "dashed" }}>
              <Award size={36} color={THEME.muted} style={{ marginBottom: 14, opacity: 0.3 }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: THEME.ink, marginBottom: 4 }}>
                No Credit Score Entries for {bureau}
              </div>
              <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 320, margin: "0 auto 16px" }}>
                Keep track of your credit standing at {bureau}. Logging history helps track changes over time.
              </div>
              <Button
                variant="accent"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => setModal({ bureau })}
              >
                Log {bureau} Score
              </Button>
            </Card>
          ) : (
            <>
              {/* Main metrics grid */}
              <div className="credit-score-stats-grid">
                {/* Speedometer card */}
                <Card style={{ padding: "20px 24px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <ScoreGauge score={latest.score} />
                  <div style={{ fontSize: 11, color: THEME.muted, textAlign: "center", marginTop: 4 }}>
                    Checked on:{" "}
                    <strong>
                      {new Date(latest.checkDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </strong>
                  </div>
                </Card>

                {/* Factors description */}
                <CreditFactorsPanel />

                {/* Stat cards columns */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {delta !== null && (
                    <StatCard
                      label="Recent Change"
                      value={
                        <span style={{ color: delta > 0 ? "#16a34a" : delta < 0 ? "#dc2626" : THEME.muted }}>
                          {delta > 0 ? "+" : ""}
                          {delta} pts
                        </span>
                      }
                      icon={delta > 0 ? <TrendingUp size={18} /> : delta < 0 ? <TrendingDown size={18} /> : <Minus size={18} />}
                      color={delta > 0 ? "#16a34a" : delta < 0 ? "#dc2626" : THEME.muted}
                      sub={delta > 0 ? "Score increased!" : delta < 0 ? "Score dropped" : "No change"}
                    />
                  )}
                  
                  <StatCard
                    label="Score Logs"
                    value={String(filtered.length)}
                    icon={<CreditCard />}
                    color={BUREAU_COLORS[bureau] || THEME.accent}
                  />
                  
                  <StatCard
                    label="Peak Score"
                    value={String(Math.max(...sorted.map((s) => s.score)))}
                    icon={<Award />}
                    color="#16a34a"
                  />
                </div>
              </div>

              {/* Bands */}
              <Card style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: THEME.muted,
                    marginBottom: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Bureau Score Bands
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[
                    { range: "750–900", label: "Excellent", color: "#16a34a", bg: "color-mix(in srgb, #16a34a 12%, transparent)" },
                    { range: "700–749", label: "Good", color: "#2563eb", bg: "color-mix(in srgb, #2563eb 12%, transparent)" },
                    { range: "650–699", label: "Fair", color: "#d97706", bg: "color-mix(in srgb, #d97706 12%, transparent)" },
                    { range: "600–649", label: "Poor", color: "#dc2626", bg: "color-mix(in srgb, #dc2626 12%, transparent)" },
                    { range: "< 600", label: "Very Poor", color: "#7f1d1d", bg: "color-mix(in srgb, #7f1d1d 12%, transparent)" },
                  ].map((b) => (
                    <div
                      key={b.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 12px",
                        borderRadius: 20,
                        background: b.bg,
                      }}
                    >
                      <span style={{ fontSize: 11, fontWeight: 700, color: b.color }}>
                        {b.range}
                      </span>
                      <span style={{ fontSize: 11, color: b.color, fontWeight: 600 }}>{b.label}</span>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Chart */}
              {chartData.length > 1 && (
                <Card style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em", color: THEME.muted }}>
                    Score Trend History — {bureau}
                  </div>
                  <div style={{ width: "100%", height: 220, position: "relative" }}><ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[300, 900]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v: number) => [v, "Score"]}
                        contentStyle={{
                          background: THEME.card,
                          border: `1.5px solid ${THEME.border}`,
                          borderRadius: 8,
                        }}
                      />
                      <ReferenceLine
                        y={750}
                        stroke="#16a34a"
                        strokeDasharray="4 4"
                        label={{
                          value: "Excellent (750+)",
                          fontSize: 10,
                          fill: "#16a34a",
                          position: "insideBottomRight",
                        }}
                      />
                      <ReferenceLine y={700} stroke="#2563eb" strokeDasharray="4 4" />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke={BUREAU_COLORS[bureau] || THEME.accent}
                        strokeWidth={2.5}
                        dot={{ r: 5, fill: BUREAU_COLORS[bureau] || THEME.accent }}
                        activeDot={{ r: 7 }}
                      />
                    </LineChart>
                  </ResponsiveContainer></div>
                </Card>
              )}

              {/* History entries */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[...sorted].reverse().map((s) => {
                  const grade = scoreGrade(s.score);
                  const ownerInfo = getOwnerAvatarInfo(s.owner);
                  return (
                    <div
                      key={s.id}
                      className="credit-score-history-card"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        padding: "14px 20px",
                        background: "var(--surface-0)",
                      }}
                    >
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 10,
                          background: `color-mix(in srgb, ${grade.color} 10%, transparent)`,
                          border: `1.5px solid ${grade.color}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          boxShadow: `0 2px 8px color-mix(in srgb, ${grade.color} 12%, transparent)`,
                        }}
                      >
                        <span style={{ fontSize: 16, fontWeight: 900, color: grade.color }}>
                          {s.score}
                        </span>
                      </div>
                      
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: THEME.ink }}>
                          {new Date(s.checkDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                        </div>
                        <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span>Bureau: <strong style={{ color: THEME.ink }}>{s.bureau}</strong></span>
                          <span>•</span>
                          <span>Source: <strong style={{ color: THEME.ink }}>{s.source}</strong></span>
                          {s.notes && (
                            <>
                              <span>•</span>
                              <span style={{ fontStyle: "italic", color: THEME.ink }}>"{s.notes}"</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Owner initials Avatar */}
                      <div style={{ flexShrink: 0 }}>
                        <OwnerAvatar ownerId={s.owner} size={22} />
                      </div>

                      <Badge style={{ background: grade.bg, color: grade.color, fontWeight: 700 }}>
                        {grade.label}
                      </Badge>
                      
                      <button
                        onClick={() => {
                          if (window.confirm("Delete this entry?"))
                            removeItem("creditScores", s.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: THEME.rust,
                          padding: 6,
                          borderRadius: 6,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "background 0.2s",
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "color-mix(in srgb, var(--t-rust) 8%, transparent)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {latest && latest.score < 700 && (
        <Card
          style={{
            marginTop: 16,
            background: `color-mix(in srgb, ${THEME.gold} 5%, var(--surface-0))`,
            border: `1px solid color-mix(in srgb, ${THEME.gold} 25%, transparent)`,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <AlertCircle size={16} color={THEME.gold} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: THEME.gold, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Tips to improve credit health
              </div>
              <ul
                style={{
                  fontSize: 12,
                  color: THEME.muted,
                  margin: "8px 0 0",
                  paddingLeft: 16,
                  lineHeight: 1.8,
                }}
              >
                <li>Pay all credit card bills in full before the due date.</li>
                <li>Keep credit utilization ratio below 30% of the total limit.</li>
                <li>Avoid submitting multiple hard loan inquiries in quick succession.</li>
                <li>Keep older credit accounts active to build long-term credit history age.</li>
                <li>Regularly check credit reports for errors and file disputes for disputes.</li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {modal !== null && (
        <ScoreForm
          initial={modal?.bureau ? modal : modal?.id ? modal : undefined}
          onSave={save}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
