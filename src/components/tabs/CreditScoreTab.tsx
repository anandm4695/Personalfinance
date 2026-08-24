// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  CreditCard,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  AlertCircle,
  Search,
  Download,
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
import { uid, today, exportArrayToCSV } from "../../utils/finance";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { ModalSection } from "../ui/ModalSection";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { Badge } from "../ui/Badge";
import { StatCard } from "../ui/StatCard";
import { Prv } from "../../context/PrivacyContext";
import { ConfirmDialog } from "../ui/Feedback";
import { useAsyncAction } from "../../hooks/useAsyncAction";

const BUREAUS = ["CIBIL", "Experian", "CRIF", "Equifax"];
const SOURCES = ["manual", "OneScore", "Paisabazaar", "BankApp", "Other"];

// Single source of truth for the score-band scale — reused by scoreGrade(),
// the "Bureau Score Bands" legend, and chart reference lines so the five
// tiers can't drift out of sync with each other.
const SCORE_BANDS: { min: number; range: string; label: string; color: string }[] = [
  { min: 750, range: "750–900", label: "Excellent", color: THEME.sage },
  { min: 700, range: "700–749", label: "Good", color: THEME.cyan },
  { min: 650, range: "650–699", label: "Fair", color: THEME.gold },
  { min: 600, range: "600–649", label: "Poor", color: THEME.rust },
  // Deepened rust (not a new arbitrary hex) so "Very Poor" reads as a step
  // worse than "Poor" on the same red hue instead of introducing an
  // unrelated color that could collide with the selected accent preset.
  { min: 0, range: "< 600", label: "Very Poor", color: `color-mix(in srgb, ${THEME.rust} 65%, black)` },
];

function scoreGrade(score: number): { label: string; color: string; bg: string } {
  const band = SCORE_BANDS.find((b) => score >= b.min) || SCORE_BANDS[SCORE_BANDS.length - 1];
  return {
    label: band.label,
    color: band.color,
    bg: `color-mix(in srgb, ${band.color} 12%, transparent)`,
  };
}

// Fixed chart-extension tokens (not the user-selectable accent) — raw hex
// here would go stale in dark mode and could exactly match the active
// accent preset (e.g. "#4f46e5" is the literal default Indigo accent).
const BUREAU_COLORS: Record<string, string> = {
  CIBIL: THEME.accent,
  Experian: THEME.violet,
  CRIF: THEME.sage,
  Equifax: THEME.gold,
};

// Fixed color rotation applied by a profile's position in familyProfiles — this way every
// avatar stays visually distinct and stable across renders without hardcoding names/ids that
// drift out of sync the moment a profile is renamed or added in Settings (see useMasterData).
const OWNER_COLOR_PALETTE = [THEME.accent, THEME.pink, THEME.violet, THEME.cyan, THEME.gold, THEME.sage];

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getOwnerAvatarInfo(ownerId: string, familyProfiles: any[]) {
  const idx = (familyProfiles || []).findIndex((p) => p.id === ownerId);
  const profile = idx >= 0 ? familyProfiles[idx] : null;
  const color = OWNER_COLOR_PALETTE[(idx >= 0 ? idx : 0) % OWNER_COLOR_PALETTE.length];
  return {
    initials: profile ? initialsFor(profile.name) : "??",
    name: profile ? profile.name : ownerId,
    relation: profile ? profile.relation : "",
    color: profile ? color : THEME.muted,
    bg: `color-mix(in srgb, ${profile ? color : THEME.muted} 12%, transparent)`,
  };
}

const EMPTY = {
  score: "",
  bureau: "CIBIL",
  checkDate: today(),
  owner: "self",
  source: "manual",
  notes: "",
};

// Hoisted to module scope (was previously defined inside CreditScoreTab's render
// body) — a component defined inline in a parent's render is recreated with a new
// identity on every render, forcing React to unmount/remount it instead of
// reconciling, which drops any local state or in-flight CSS transitions.
function OwnerAvatar({ ownerId, size = 22 }: { ownerId: string; size?: number }) {
  const { familyProfiles } = useMasterData();
  const info = getOwnerAvatarInfo(ownerId, familyProfiles);
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

function ScoreForm({ initial, onSave, onClose, saving = false }: any) {
  const { familyProfiles } = useMasterData();
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [error, setError] = useState("");
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = () => {
    const score = Number(form.score);
    if (!form.score || Number.isNaN(score) || score < 300 || score > 900) {
      setError("Enter a valid score between 300 and 900.");
      return;
    }
    if (!form.checkDate) {
      setError("Check date is required.");
      return;
    }
    setError("");
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
            onChange={(e) => {
              set("score", e.target.value);
              if (error) setError("");
            }}
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
            onChange={(e) => {
              set("checkDate", e.target.value);
              if (error) setError("");
            }}
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
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            color: THEME.rust,
            marginTop: 12,
          }}
        >
          <AlertCircle size={13} />
          {error}
        </div>
      )}
      <ModalActions onSave={save} onClose={onClose} saveLabel="Save Score" disabled={saving} loading={saving} />
    </Modal>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const grade = scoreGrade(score);
  const pct = Math.min(1, Math.max(0, (score - 300) / 600));
  const angle = pct * 180;
  // Needle/track sweep is already smoothed by the SVG's own CSS transition (below);
  // this only count-up-animates the big digit readout so it doesn't hard-jump between
  // bureaus/owners/new entries.
  const animatedScore = useAnimatedNumber(score);

  return (
    <div style={{ textAlign: "center", padding: "16px 0 8px 0" }}>
      <div style={{ position: "relative", display: "inline-block", width: 180, height: 110 }}>
        <svg width="180" height="110" viewBox="0 0 120 75" style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={THEME.rust} />
              <stop offset="30%" stopColor={THEME.gold} />
              <stop offset="70%" stopColor={THEME.cyan} />
              <stop offset="100%" stopColor={THEME.sage} />
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
          <span style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 600, color: THEME.ink, letterSpacing: "-0.04em", lineHeight: 1 }}>
            <Prv>{Math.round(animatedScore)}</Prv>
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

// Renders only insights we can actually derive from the user's own data — no fabricated
// "Payment History 95%" style figures. A prior version showed fixed mock percentages next
// to a real, dynamic gauge as if they were real analysis; they never changed for any user
// and were misleading once someone noticed the numbers never moved.
function CreditFactorsPanel({ sorted, creditCards }: { sorted: any[]; creditCards: any[] }) {
  const latest = sorted[sorted.length - 1];

  // Same shared-pool dedup as the CC-utilization alert in useAlerts.ts, so this figure
  // never contradicts the number that actually triggers that alert.
  const activeCards = (creditCards || []).filter(
    (c: any) => (c.status || "").toLowerCase() !== "closed"
  );
  const pools: Record<string, number> = {};
  activeCards.forEach((c: any) => {
    if (c.sharedGroup)
      pools[c.sharedGroup] = Math.max(pools[c.sharedGroup] || 0, Number(c.sharedGroupLimit) || 0);
  });
  const totalLimit =
    activeCards
      .filter((c: any) => !c.sharedGroup)
      .reduce((s: number, c: any) => s + Number(c.limit || c.cardLimit || 0), 0) +
    Object.values(pools).reduce((s: number, v: number) => s + v, 0);
  const totalOutstanding = activeCards.reduce((s: number, c: any) => s + Number(c.outstanding || 0), 0);
  const utilization = totalLimit > 0 ? (totalOutstanding / totalLimit) * 100 : null;
  const utilRating =
    utilization === null ? null : utilization < 10 ? "Excellent" : utilization < 30 ? "Good" : utilization < 50 ? "Fair" : "High";
  const utilColor =
    utilization === null
      ? THEME.muted
      : utilization < 10
      ? THEME.sage
      : utilization < 30
      ? THEME.cyan
      : utilization < 50
      ? THEME.gold
      : THEME.rust;

  // Trend across the last up-to-3 logged checks for the selected bureau.
  const recent = sorted.slice(-3);
  let trendLabel = "Not enough history yet";
  let trendColor = THEME.muted;
  if (recent.length >= 2) {
    const diff = recent[recent.length - 1].score - recent[0].score;
    if (diff > 3) {
      trendLabel = `Improving (+${diff} pts)`;
      trendColor = THEME.sage;
    } else if (diff < -3) {
      trendLabel = `Declining (${diff} pts)`;
      trendColor = THEME.rust;
    } else {
      trendLabel = "Stable";
      trendColor = THEME.cyan;
    }
  }

  const daysSinceCheck = latest
    ? Math.floor((Date.now() - new Date(latest.checkDate + "T00:00:00").getTime()) / 86400000)
    : null;
  const gapToExcellent = latest ? Math.max(0, 750 - latest.score) : null;

  const rows: { label: string; value: string; color: string; pct: number | null; desc: string }[] = [];
  if (utilization !== null) {
    rows.push({
      label: `Credit Utilization — ${utilRating}`,
      value: `${utilization.toFixed(0)}%`,
      color: utilColor,
      pct: Math.min(100, utilization),
      desc: "Outstanding vs. total limit across your active cards",
    });
  }
  rows.push({
    label: "Score Trend",
    value: trendLabel,
    color: trendColor,
    pct: null,
    desc: `Based on your last ${recent.length} logged ${recent.length === 1 ? "check" : "checks"} at this bureau`,
  });
  if (gapToExcellent !== null) {
    rows.push({
      label: gapToExcellent === 0 ? "Excellent Band Reached" : "Gap to Excellent (750+)",
      value: gapToExcellent === 0 ? "You're there" : `${gapToExcellent} pts`,
      color: gapToExcellent === 0 ? THEME.sage : THEME.gold,
      pct: null,
      desc: gapToExcellent === 0 ? "Your latest check is in the top band" : "Points needed to reach the Excellent band",
    });
  }
  if (daysSinceCheck !== null) {
    rows.push({
      label: "Last Checked",
      value: daysSinceCheck === 0 ? "Today" : `${daysSinceCheck}d ago`,
      color: daysSinceCheck > 180 ? THEME.gold : THEME.muted,
      pct: null,
      desc: daysSinceCheck > 180 ? "It's been a while — consider logging a fresh check" : "Recency of your latest entry",
    });
  }

  return (
    <Card style={{ padding: "20px 24px" }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        Credit Health Insights
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {rows.map((f, idx) => (
          <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>{f.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: f.color, whiteSpace: "nowrap" }}>{f.value}</span>
            </div>
            {f.pct !== null && (
              <div style={{ height: 6, borderRadius: 3, background: "var(--surface-2)", overflow: "hidden" }}>
                <div style={{ width: `${f.pct}%`, height: "100%", borderRadius: 3, background: f.color }} />
              </div>
            )}
            <span style={{ fontSize: 10, color: THEME.muted }}>{f.desc}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function CreditScoreTab({ state, addItem, removeItem, updateItem, showToast }: any) {
  const { familyProfiles } = useMasterData();
  const scores: any[] = state.creditScores || [];
  const [modal, setModal] = useState<any>(null);
  const [bureau, setBureau] = useState("CIBIL");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const distinctOwners = useMemo(
    () => Array.from(new Set(scores.map((s) => s.owner).filter(Boolean))),
    [scores]
  );
  const isMultiOwner = distinctOwners.length > 1;

  // Owner scoping applies to the deck counts/gauge/insights/chart — a "latest score"
  // silently mixing two family members' bureau entries is meaningless. Search (below)
  // only narrows the history list underneath, it never changes these summary numbers.
  const ownerScoped = useMemo(
    () => (ownerFilter === "all" ? scores : scores.filter((s) => s.owner === ownerFilter)),
    [scores, ownerFilter]
  );

  // Same owner scoping for the credit cards feeding CreditFactorsPanel's utilization
  // insight — without this, selecting one family member above still silently blended
  // every family member's card balances/limits into that panel's number.
  const ownerScopedCreditCards = useMemo(
    () =>
      ownerFilter === "all"
        ? state.creditCards
        : (state.creditCards || []).filter((c: any) => c.owner === ownerFilter),
    [state.creditCards, ownerFilter]
  );

  const filtered = useMemo(() => ownerScoped.filter((s) => s.bureau === bureau), [ownerScoped, bureau]);
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => a.checkDate.localeCompare(b.checkDate)),
    [filtered]
  );
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const delta = latest && prev ? latest.score - prev.score : null;

  const chartData = useMemo(
    () =>
      sorted.map((s) => ({
        date: new Date(s.checkDate).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        score: s.score,
      })),
    [sorted]
  );

  const searchLower = search.trim().toLowerCase();
  const historyList = useMemo(() => {
    const list = [...sorted].reverse();
    if (!searchLower) return list;
    return list.filter((s) => {
      const dateLabel = new Date(s.checkDate)
        .toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
        .toLowerCase();
      return (
        dateLabel.includes(searchLower) ||
        (s.source || "").toLowerCase().includes(searchLower) ||
        (s.notes || "").toLowerCase().includes(searchLower) ||
        String(s.score).includes(searchLower)
      );
    });
  }, [sorted, searchLower]);

  const { run: save, loading: savingScore } = useAsyncAction(
    async (data: any) => {
      if (data.id && scores.find((s: any) => s.id === data.id)) {
        await updateItem("creditScores", data.id, data);
      } else {
        await addItem("creditScores", data);
      }
    },
    { onSuccess: () => setModal(null), onError: (e: any) => showToast?.(`Failed to save score: ${e?.message || "Unknown error"}`, "error") }
  );

  const { run: deleteScore } = useAsyncAction(
    async (id: string) => { await removeItem("creditScores", id); },
    { onError: (e: any) => showToast?.(`Failed to delete score entry: ${e?.message || "Unknown error"}`, "error") }
  );

  const handleExportCSV = () => {
    exportArrayToCSV(
      historyList.map((s) => ({
        ...s,
        ownerLabel: getOwnerAvatarInfo(s.owner, familyProfiles).name,
        dateLabel: new Date(s.checkDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      })),
      [
        { key: "dateLabel", label: "Date" },
        { key: "bureau", label: "Bureau" },
        { key: "score", label: "Score" },
        { key: "ownerLabel", label: "Owner" },
        { key: "source", label: "Source" },
        { key: "notes", label: "Notes" },
      ],
      `Credit_Score_${bureau}_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

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
          border-color: var(--b-color) !important;
        }
        .bureau-select-card.active {
          border-color: var(--b-color) !important;
          background: color-mix(in srgb, var(--b-color) 6%, var(--surface-0));
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
          {isMultiOwner && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
              <select
                className="form-input"
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                aria-label="Filter by family member"
                style={{ width: 220, fontSize: 12, padding: "6px 10px" }}
              >
                <option value="all">All Members (combined)</option>
                {familyProfiles
                  .filter((p: any) => distinctOwners.includes(p.id))
                  .map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {isMultiOwner && ownerFilter === "all" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: THEME.muted, marginBottom: 12 }}>
              <AlertCircle size={12} style={{ flexShrink: 0 }} />
              Deck, gauge, and insights below combine scores from {distinctOwners.length} family
              members — use the filter above to view one person alone.
            </div>
          )}

          {/* Interactive bureau cards deck */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }} className="bureau-deck">
            {BUREAUS.map((b) => {
              const filteredForBureau = ownerScoped.filter((s) => s.bureau === b);
              const cnt = filteredForBureau.length;
              const isActive = bureau === b;
              const bColor = BUREAU_COLORS[b];
              
              const sortedForBureau = [...filteredForBureau].sort((x, y) => x.checkDate.localeCompare(y.checkDate));
              const latestScore = sortedForBureau[sortedForBureau.length - 1]?.score;

              return (
                <div
                  key={b}
                  onClick={() => setBureau(b)}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setBureau(b);
                    }
                  }}
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
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 600, color: latestScore ? THEME.ink : THEME.muted, letterSpacing: "-0.02em", marginTop: 4 }}>
                    {latestScore ? <Prv>{latestScore}</Prv> : "--"}
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
                <CreditFactorsPanel sorted={sorted} creditCards={ownerScopedCreditCards} />

                {/* Stat cards columns */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {delta !== null && (
                    <StatCard
                      label="Recent Change"
                      value={
                        <span style={{ color: delta > 0 ? THEME.sage : delta < 0 ? THEME.rust : THEME.muted }}>
                          {delta > 0 ? "+" : ""}
                          {delta} pts
                        </span>
                      }
                      icon={delta > 0 ? <TrendingUp size={18} /> : delta < 0 ? <TrendingDown size={18} /> : <Minus size={18} />}
                      color={delta > 0 ? THEME.sage : delta < 0 ? THEME.rust : THEME.muted}
                      sub={delta > 0 ? "Score increased!" : delta < 0 ? "Score dropped" : "No change"}
                    />
                  )}
                  
                  <StatCard
                    label="Score Logs"
                    value={String(filtered.length)}
                    numericValue={filtered.length}
                    formatValue={(n) => String(Math.round(n))}
                    icon={<CreditCard />}
                    color={BUREAU_COLORS[bureau] || THEME.accent}
                  />

                  <StatCard
                    label="Peak Score"
                    value={String(Math.max(...sorted.map((s) => s.score)))}
                    numericValue={Math.max(...sorted.map((s) => s.score))}
                    formatValue={(n) => String(Math.round(n))}
                    icon={<Award />}
                    color={THEME.sage}
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
                  {SCORE_BANDS.map((b) => (
                    <div
                      key={b.label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 12px",
                        borderRadius: "var(--radius-xs)",
                        background: `color-mix(in srgb, ${b.color} 12%, transparent)`,
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
                        stroke={THEME.sage}
                        strokeDasharray="4 4"
                        label={{
                          value: "Excellent (750+)",
                          fontSize: 10,
                          fill: THEME.sage,
                          position: "insideBottomRight",
                        }}
                      />
                      <ReferenceLine y={700} stroke={THEME.cyan} strokeDasharray="4 4" />
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

              {/* History toolbar: search + CSV export — search only narrows this list,
                  it never changes the stats/gauge/chart above it. */}
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div style={{ position: "relative" }}>
                  <Search
                    size={13}
                    style={{
                      position: "absolute",
                      left: 10,
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
                    placeholder="Search date, source, notes, score…"
                    aria-label="Search credit score history"
                    style={{
                      border: `1px solid ${THEME.line}`,
                      borderRadius: 8,
                      padding: "6px 10px 6px 28px",
                      fontSize: 12,
                      color: THEME.ink,
                      background: "var(--surface-0)",
                      width: 220,
                    }}
                  />
                </div>
                <button
                  onClick={handleExportCSV}
                  disabled={!historyList.length}
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
                    cursor: historyList.length ? "pointer" : "not-allowed",
                    opacity: historyList.length ? 1 : 0.5,
                  }}
                >
                  <Download size={13} />
                  Export CSV
                </button>
              </div>

              {/* History entries */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {historyList.length === 0 && (
                  <Card style={{ padding: "24px", textAlign: "center", borderStyle: "dashed" }}>
                    <div style={{ fontSize: 13, color: THEME.muted }}>
                      No entries match your search.
                    </div>
                  </Card>
                )}
                {historyList.map((s) => {
                  const grade = scoreGrade(s.score);
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
                          border: `1.5px solid ${grade.color}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 15,
                            fontWeight: 600,
                            color: grade.color,
                          }}
                        >
                          <Prv>{s.score}</Prv>
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
                        onClick={() => setConfirmDeleteId(s.id)}
                        aria-label="Delete credit score entry"
                        className="icon-btn danger"
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
                        }}
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
                <li>Regularly check your credit report for errors and raise a dispute with the bureau if you spot one.</li>
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
          saving={savingScore}
        />
      )}
      {confirmDeleteId && (
        <ConfirmDialog
          message="Delete this entry?"
          onConfirm={() => {
            deleteScore(confirmDeleteId);
            setConfirmDeleteId(null);
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
