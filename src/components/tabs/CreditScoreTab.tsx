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
  X,
  ShieldCheck,
  Activity,
  Sparkles,
  Calculator,
  History,
  ExternalLink,
  CheckCircle2,
  Info,
  Layers,
  Edit3,
  RefreshCw,
  FileText,
  Clock,
  PieChart,
  Check,
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
import { useMasterData, formatProfileOption, FamilyProfile } from "../../utils/masterData";
import { uid, today, exportArrayToCSV, fmtINR } from "../../utils/finance";
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

export const BUREAUS = ["CIBIL", "Experian", "CRIF", "Equifax"] as const;
export type BureauType = (typeof BUREAUS)[number];

export interface CreditScoreEntry {
  id: string;
  score: number;
  bureau: BureauType;
  checkDate: string;
  owner: string;
  source: string;
  notes?: string;
}

export interface CreditCardItem {
  id: string;
  bank?: string;
  name?: string;
  owner?: string;
  limit?: number | string;
  cardLimit?: number | string;
  outstanding?: number | string;
  sharedGroup?: string;
  sharedGroupLimit?: number | string;
  status?: string;
  issueDate?: string;
  openedDate?: string;
}

export interface LoanItem {
  id: string;
  name?: string;
  type?: string;
  bank?: string;
  principal?: number | string;
  outstanding?: number | string;
  emi?: number | string;
  owner?: string;
  status?: string;
  overdueAmount?: number | string;
  startDate?: string;
  disbursedDate?: string;
  date?: string;
}

export const SOURCES = [
  "manual",
  "OneScore",
  "CRED",
  "Paisabazaar",
  "BankApp",
  "CIBIL Direct",
  "Experian Direct",
  "Other",
];

export const SCORE_BANDS: { min: number; max: number; range: string; label: string; color: string; desc: string }[] = [
  { min: 750, max: 900, range: "750–900", label: "Excellent", color: THEME.sage, desc: "Prime loan approvals & lowest interest rates" },
  { min: 700, max: 749, range: "700–749", label: "Good", color: THEME.cyan, desc: "High approval odds with competitive pricing" },
  { min: 650, max: 699, range: "650–699", label: "Fair", color: THEME.gold, desc: "Eligible for credit but may face higher interest" },
  { min: 600, max: 649, range: "600–649", label: "Poor", color: THEME.rust, desc: "High rejection rate, loan terms may be restrictive" },
  { min: 300, max: 599, range: "300–599", label: "Very Poor", color: `color-mix(in srgb, ${THEME.rust} 75%, black)`, desc: "Immediate credit repair & debt discipline needed" },
];

export function scoreGrade(score: number): { label: string; color: string; bg: string; desc: string } {
  const band = SCORE_BANDS.find((b) => score >= b.min) || SCORE_BANDS[SCORE_BANDS.length - 1];
  return {
    label: band.label,
    color: band.color,
    bg: `color-mix(in srgb, ${band.color} 12%, transparent)`,
    desc: band.desc,
  };
}

export const BUREAU_COLORS: Record<BureauType, string> = {
  CIBIL: THEME.accent,
  Experian: THEME.violet,
  CRIF: THEME.sage,
  Equifax: THEME.gold,
};

export const BUREAU_INFO: Record<BureauType, { fullName: string; refreshRate: string; portal: string; disputeUrl: string }> = {
  CIBIL: {
    fullName: "TransUnion CIBIL",
    refreshRate: "Monthly (30 days)",
    portal: "https://www.cibil.com",
    disputeUrl: "https://www.cibil.com/dispute-resolution",
  },
  Experian: {
    fullName: "Experian Credit Information Services",
    refreshRate: "Monthly (30 days)",
    portal: "https://www.experian.in",
    disputeUrl: "https://www.experian.in/consumer-services/dispute-resolution",
  },
  CRIF: {
    fullName: "CRIF High Mark",
    refreshRate: "Monthly (30-45 days)",
    portal: "https://www.crifhighmark.com",
    disputeUrl: "https://www.crifhighmark.com",
  },
  Equifax: {
    fullName: "Equifax Credit Information Services",
    refreshRate: "Monthly (30 days)",
    portal: "https://www.equifax.co.in",
    disputeUrl: "https://www.equifax.co.in",
  },
};

const OWNER_COLOR_PALETTE = [THEME.accent, THEME.pink, THEME.violet, THEME.cyan, THEME.gold, THEME.sage];

function initialsFor(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getOwnerAvatarInfo(ownerId: string, familyProfiles: FamilyProfile[]) {
  const idx = (familyProfiles || []).findIndex((p) => p.id === ownerId);
  const profile = idx >= 0 ? familyProfiles[idx] : null;
  const color = OWNER_COLOR_PALETTE[(idx >= 0 ? idx : 0) % OWNER_COLOR_PALETTE.length];
  return {
    initials: profile ? initialsFor(profile.name) : "??",
    name: profile ? profile.name : ownerId || "Self",
    relation: profile ? profile.relation : "",
    color: profile ? color : THEME.muted,
    bg: `color-mix(in srgb, ${profile ? color : THEME.muted} 12%, transparent)`,
  };
}

function OwnerAvatar({ ownerId, size = 24 }: { ownerId: string; size?: number }) {
  const { familyProfiles } = useMasterData();
  const info = getOwnerAvatarInfo(ownerId, familyProfiles);
  return (
    <div
      title={`${info.name} ${info.relation ? `(${info.relation})` : ""}`}
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
        fontSize: Math.max(10, Math.floor(size * 0.42)),
        fontWeight: 700,
        cursor: "default",
        flexShrink: 0,
      }}
    >
      {info.initials}
    </div>
  );
}

// -----------------------------------------------------------------------------
// MODAL: ADD / EDIT CREDIT SCORE
// -----------------------------------------------------------------------------
const EMPTY_ENTRY = {
  score: "",
  bureau: "CIBIL" as BureauType,
  checkDate: today(),
  owner: "self",
  source: "manual",
  notes: "",
};

interface ScoreFormModalProps {
  initial?: Partial<CreditScoreEntry>;
  onSave: (data: CreditScoreEntry) => void;
  onClose: () => void;
  saving?: boolean;
}

function ScoreFormModal({ initial, onSave, onClose, saving = false }: ScoreFormModalProps) {
  const { familyProfiles } = useMasterData();
  const [form, setForm] = useState({ ...EMPTY_ENTRY, ...initial });
  const [error, setError] = useState("");
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const currentNumeric = Number(form.score);
  const grade = !Number.isNaN(currentNumeric) && currentNumeric >= 300 && currentNumeric <= 900
    ? scoreGrade(currentNumeric)
    : null;

  const handleSave = () => {
    const score = Number(form.score);
    if (!form.score || Number.isNaN(score) || score < 300 || score > 900) {
      setError("Please enter a valid credit score between 300 and 900.");
      return;
    }
    if (!form.checkDate) {
      setError("Check date is required.");
      return;
    }
    setError("");
    onSave({
      id: initial?.id || uid(),
      score,
      bureau: form.bureau as BureauType,
      checkDate: form.checkDate,
      owner: form.owner,
      source: form.source,
      notes: form.notes,
    });
  };

  return (
    <Modal
      title={initial?.id ? "Edit Credit Score Entry" : "Log Credit Score"}
      onClose={onClose}
      maxWidth={560}
    >
      <ModalSection title="Bureau & Score Value" first />
      
      {/* Bureau Selector Pills */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: THEME.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Credit Bureau *
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {BUREAUS.map((b) => {
            const isSel = form.bureau === b;
            const bCol = BUREAU_COLORS[b];
            return (
              <button
                key={b}
                type="button"
                onClick={() => set("bureau", b)}
                style={{
                  padding: "10px 8px",
                  borderRadius: 10,
                  border: `1.5px solid ${isSel ? bCol : "var(--t-line)"}`,
                  background: isSel ? `color-mix(in srgb, ${bCol} 12%, var(--surface-0))` : "var(--surface-0)",
                  color: isSel ? bCol : THEME.ink,
                  fontWeight: isSel ? 700 : 500,
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  transition: "all 0.2s",
                }}
              >
                <span>{b}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Score Input & Grade Badge */}
      <div className="doc-vault-form-grid" style={{ gap: "0 16px" }}>
        <Field label="Score (300 – 900) *">
          <div style={{ position: "relative" }}>
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
              placeholder="e.g. 780"
              autoFocus
              style={{ paddingRight: grade ? 110 : 12, fontSize: 16, fontWeight: 600 }}
            />
            {grade && (
              <div
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: grade.bg,
                  color: grade.color,
                  fontSize: 11,
                  fontWeight: 700,
                  pointerEvents: "none",
                }}
              >
                {grade.label}
              </div>
            )}
          </div>
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

        <Field label="Family Member / Profile">
          <select
            className="form-input"
            value={form.owner}
            onChange={(e) => set("owner", e.target.value)}
          >
            {familyProfiles.map((p) => (
              <option key={p.id} value={p.id}>
                {formatProfileOption(p)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Source">
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

      <ModalSection title="Notes & Reference" />
      <Field label="Notes & Observations">
        <input
          className="form-input"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="e.g. Inquiries checked via OneScore, all card dues cleared"
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
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      <ModalActions onSave={handleSave} onClose={onClose} saveLabel={initial?.id ? "Update Score" : "Save Score"} disabled={saving} loading={saving} />
    </Modal>
  );
}

// -----------------------------------------------------------------------------
// LUXURY GAUGE VISUAL COMPONENT
// -----------------------------------------------------------------------------
function CreditGaugeVisual({ score, size = 220, showDetails = true }: { score: number; size?: number; showDetails?: boolean }) {
  const grade = scoreGrade(score);
  const pct = Math.min(1, Math.max(0, (score - 300) / 600));
  const angle = pct * 180;
  const animatedScore = useAnimatedNumber(score);

  return (
    <div style={{ textAlign: "center", padding: "10px 0" }}>
      <div style={{ position: "relative", display: "inline-block", width: size, height: Math.round(size * 0.62) }}>
        <svg
          width={size}
          height={Math.round(size * 0.62)}
          viewBox="0 0 140 86"
          style={{ overflow: "visible" }}
        >
          <defs>
            <linearGradient id="luxury-gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={THEME.rust} />
              <stop offset="25%" stopColor={THEME.gold} />
              <stop offset="60%" stopColor={THEME.cyan} />
              <stop offset="100%" stopColor={THEME.sage} />
            </linearGradient>
            <filter id="gauge-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Arc Track */}
          <circle
            cx={70}
            cy={70}
            r={52}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth={9}
            strokeDasharray="163.36 163.36"
            transform="rotate(-180 70 70)"
            strokeLinecap="round"
          />

          {/* Active Gradient Arc Track */}
          <circle
            cx={70}
            cy={70}
            r={52}
            fill="none"
            stroke="url(#luxury-gauge-grad)"
            strokeWidth={9}
            strokeDasharray="163.36 163.36"
            strokeDashoffset={163.36 - pct * 163.36}
            transform="rotate(-180 70 70)"
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)" }}
          />

          {/* Milestone Ticks & Scale Markers */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const tickAngle = -180 + t * 180;
            const rad = (tickAngle * Math.PI) / 180;
            const x1 = 70 + 58 * Math.cos(rad);
            const y1 = 70 + 58 * Math.sin(rad);
            const x2 = 70 + 63 * Math.cos(rad);
            const y2 = 70 + 63 * Math.sin(rad);
            return (
              <line
                key={t}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="var(--t-muted)"
                strokeWidth={1.5}
                opacity={0.5}
              />
            );
          })}

          {/* Needle */}
          <line
            x1={70}
            y1={70}
            x2={24}
            y2={70}
            stroke={grade.color}
            strokeWidth={3.8}
            strokeLinecap="round"
            transform={`rotate(${angle} 70 70)`}
            style={{ transition: "transform 1.4s cubic-bezier(0.16, 1, 0.3, 1)" }}
          />

          {/* Center Pivot Caps */}
          <circle cx={70} cy={70} r={8} fill={grade.color} stroke="var(--surface-0)" strokeWidth={2.5} />
          <circle cx={70} cy={70} r={3} fill="var(--surface-0)" />
        </svg>

        {/* Big Digit Readout & Status */}
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
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontSize: Math.round(size * 0.17),
              fontWeight: 700,
              color: THEME.ink,
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            <Prv>{Math.round(animatedScore)}</Prv>
          </span>
          <span
            style={{
              fontSize: 11,
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

      {showDetails && (
        <div style={{ fontSize: 11, color: THEME.muted, marginTop: 6, fontWeight: 500 }}>
          Scale Range: <strong>300</strong> to <strong>900</strong>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// 5 PILLARS CREDIT HEALTH ENGINE
// -----------------------------------------------------------------------------
function CreditPillarsEngine({
  sorted,
  creditCards,
  loans,
}: {
  sorted: CreditScoreEntry[];
  creditCards: CreditCardItem[];
  loans: LoanItem[];
}) {
  // 1. Credit Utilization (30% weight)
  const activeCards = (creditCards || []).filter(
    (c) => (c.status || "").toLowerCase() !== "closed"
  );
  const pools: Record<string, number> = {};
  activeCards.forEach((c) => {
    if (c.sharedGroup) {
      pools[c.sharedGroup] = Math.max(pools[c.sharedGroup] || 0, Number(c.sharedGroupLimit) || 0);
    }
  });
  const totalLimit =
    activeCards
      .filter((c) => !c.sharedGroup)
      .reduce((s: number, c) => s + Number(c.limit || c.cardLimit || 0), 0) +
    Object.values(pools).reduce((s: number, v: number) => s + v, 0);
  const totalOutstanding = activeCards.reduce(
    (s: number, c) => s + Number(c.outstanding || 0),
    0
  );
  const utilization = totalLimit > 0 ? (totalOutstanding / totalLimit) * 100 : null;

  // 2. Payment History (35% weight)
  const activeLoans = (loans || []).filter(
    (l) => (l.status || "").toLowerCase() !== "closed"
  );
  const hasOverdueLoans = activeLoans.some((l) => Number(l.overdueAmount || 0) > 0);
  const paymentHistoryRating = hasOverdueLoans ? "Needs Attention" : "100% On-Time";
  const paymentHistoryScore = hasOverdueLoans ? 60 : 100;

  // 3. Credit Age & Vintage (15% weight)
  const allDates = [
    ...sorted.map((s) => s.checkDate),
    ...(loans || []).map((l) => l.startDate || l.disbursedDate || l.date),
    ...(creditCards || []).map((c) => c.issueDate || c.openedDate),
  ].filter(Boolean) as string[];
  
  let earliestYear = new Date().getFullYear();
  allDates.forEach((d) => {
    const yr = new Date(d).getFullYear();
    if (yr && !isNaN(yr) && yr < earliestYear) earliestYear = yr;
  });
  const creditAgeYears = Math.max(1, new Date().getFullYear() - earliestYear);
  const creditAgeRating =
    creditAgeYears >= 5 ? "Excellent (5+ yrs)" : creditAgeYears >= 2 ? "Good (2-4 yrs)" : "Building (<2 yrs)";
  const creditAgeScore = Math.min(100, Math.round((creditAgeYears / 5) * 100));

  // 4. Credit Mix & Diversity (10% weight)
  const hasSecured = activeLoans.some((l) =>
    ["home", "mortgage", "auto", "car", "gold", "property"].some((k) =>
      (l.type || l.name || "").toLowerCase().includes(k)
    )
  );
  const hasUnsecured =
    activeCards.length > 0 ||
    activeLoans.some((l) =>
      ["personal", "education", "consumer", "credit"].some((k) =>
        (l.type || l.name || "").toLowerCase().includes(k)
      )
    );
  const creditMixRating =
    hasSecured && hasUnsecured
      ? "Balanced (Secured + Unsecured)"
      : hasUnsecured
      ? "Unsecured Heavy"
      : hasSecured
      ? "Secured Heavy"
      : "Single Product";
  const creditMixScore = hasSecured && hasUnsecured ? 95 : 75;

  // 5. Recent Inquiries & Velocity (10% weight)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recentLogsCount = sorted.filter(
    (s) => new Date(s.checkDate) >= sixMonthsAgo
  ).length;
  const inquiryRating =
    recentLogsCount <= 3 ? "Low (Safe)" : recentLogsCount <= 6 ? "Moderate" : "High Velocity";
  const inquiryScore = recentLogsCount <= 3 ? 100 : recentLogsCount <= 6 ? 75 : 50;

  // Utilization Rating
  const utilRating =
    utilization === null
      ? "No Active Cards"
      : utilization < 10
      ? "Optimal (< 10%)"
      : utilization < 30
      ? "Good (10–30%)"
      : utilization < 50
      ? "Fair (30–50%)"
      : "High (> 50%)";
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
  const utilScore =
    utilization === null ? 85 : Math.max(10, Math.round(100 - utilization));

  const pillars = [
    {
      name: "Payment History",
      weight: "35%",
      score: paymentHistoryScore,
      rating: paymentHistoryRating,
      color: hasOverdueLoans ? THEME.rust : THEME.sage,
      desc: "Timely payment of EMIs and card statements without defaults",
      action: hasOverdueLoans ? "Clear overdue EMIs immediately" : "Keep automated autopay active",
      icon: CheckCircle2,
    },
    {
      name: "Credit Utilization",
      weight: "30%",
      score: utilScore,
      rating: utilRating,
      color: utilColor,
      desc: totalLimit > 0 ? `${fmtINR(totalOutstanding)} used of ${fmtINR(totalLimit)} limit (${(utilization || 0).toFixed(0)}%)` : "No revolving credit card limits found",
      action: utilization && utilization > 30 ? "Pay dues before statement generation to lower ratio" : "Excellent control maintained",
      icon: CreditCard,
    },
    {
      name: "Credit Age & Depth",
      weight: "15%",
      score: creditAgeScore,
      rating: creditAgeRating,
      color: creditAgeYears >= 5 ? THEME.sage : creditAgeYears >= 2 ? THEME.cyan : THEME.gold,
      desc: `Track record spans ~${creditAgeYears} ${creditAgeYears === 1 ? "year" : "years"} across accounts`,
      action: "Keep your oldest credit card active to preserve age",
      icon: Clock,
    },
    {
      name: "Credit Mix & Diversity",
      weight: "10%",
      score: creditMixScore,
      rating: creditMixRating,
      color: hasSecured && hasUnsecured ? THEME.sage : THEME.cyan,
      desc: `${activeCards.length} Cards, ${activeLoans.length} Loans (${hasSecured ? "Secured" : "Unsecured"})`,
      action: "Maintains optimal balance between asset-backed and unsecured credit",
      icon: Layers,
    },
    {
      name: "Inquiries & Velocity",
      weight: "10%",
      score: inquiryScore,
      rating: inquiryRating,
      color: recentLogsCount <= 3 ? THEME.sage : THEME.gold,
      desc: `${recentLogsCount} credit checks logged in last 6 months`,
      action: "Avoid applying for multiple loan cards in a short window",
      icon: Activity,
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        {pillars.map((p, idx) => {
          const IconComp = p.icon;
          return (
            <div
              key={idx}
              style={{
                background: "var(--surface-0)",
                border: "1.5px solid var(--t-line)",
                borderRadius: 12,
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: `color-mix(in srgb, ${p.color} 14%, var(--surface-0))`,
                      color: p.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <IconComp size={16} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>Weight: {p.weight}</div>
                  </div>
                </div>
                <Badge style={{ background: `color-mix(in srgb, ${p.color} 12%, transparent)`, color: p.color, fontWeight: 700, fontSize: 10 }}>
                  {p.rating}
                </Badge>
              </div>

              {/* Progress Bar */}
              <div>
                <div style={{ height: 6, borderRadius: 3, background: "var(--surface-2)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(5, p.score))}%`,
                      height: "100%",
                      borderRadius: 3,
                      background: p.color,
                      transition: "width 0.8s ease",
                    }}
                  />
                </div>
              </div>

              <div style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.4 }}>
                {p.desc}
              </div>

              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: p.color,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: "auto",
                  paddingTop: 6,
                  borderTop: "1px dashed var(--t-line)",
                }}
              >
                <Sparkles size={11} />
                <span>{p.action}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// INTERACTIVE "WHAT-IF" CREDIT SCORE SIMULATOR
// -----------------------------------------------------------------------------
function CreditScoreSimulator({
  currentScore,
  creditCards,
}: {
  currentScore: number;
  creditCards: CreditCardItem[];
  loans: LoanItem[];
}) {
  const activeCards = (creditCards || []).filter(
    (c) => (c.status || "").toLowerCase() !== "closed"
  );
  const totalLimit = activeCards.reduce(
    (s: number, c) => s + Number(c.limit || c.cardLimit || 0),
    0
  );
  const totalOutstanding = activeCards.reduce(
    (s: number, c) => s + Number(c.outstanding || 0),
    0
  );

  // Simulation Sliders / Toggles
  const [payoffAmount, setPayoffAmount] = useState(0);
  const [limitIncrease, setLimitIncrease] = useState(0);
  const [closeOldCard, setCloseOldCard] = useState(false);
  const [applyNewLoan, setApplyNewLoan] = useState(false);
  const [missedPayment, setMissedPayment] = useState(false);

  // Score Impact Calculation Engine
  const simulationResults = useMemo(() => {
    let delta = 0;
    const factors: { label: string; impact: number; text: string }[] = [];

    // 1. Payoff balance impact
    if (payoffAmount > 0 && totalLimit > 0) {
      const curUtil = (totalOutstanding / totalLimit) * 100;
      const newUtil = (Math.max(0, totalOutstanding - payoffAmount) / totalLimit) * 100;
      const utilDrop = curUtil - newUtil;
      const boost = Math.min(45, Math.round(utilDrop * 0.85));
      if (boost > 0) {
        delta += boost;
        factors.push({
          label: "Card Debt Reduction",
          impact: boost,
          text: `Paying off ${fmtINR(payoffAmount)} drops utilization from ${curUtil.toFixed(0)}% to ${newUtil.toFixed(0)}%`,
        });
      }
    }

    // 2. Limit Increase impact
    if (limitIncrease > 0 && totalLimit > 0) {
      const newTotalLimit = totalLimit + limitIncrease;
      const curUtil = (totalOutstanding / totalLimit) * 100;
      const newUtil = (totalOutstanding / newTotalLimit) * 100;
      const utilDrop = curUtil - newUtil;
      const boost = Math.min(25, Math.round(utilDrop * 0.6));
      if (boost > 0) {
        delta += boost;
        factors.push({
          label: "Credit Limit Increase",
          impact: boost,
          text: `Adding ${fmtINR(limitIncrease)} limit lowers overall utilization`,
        });
      }
    }

    // 3. Closing Old Card
    if (closeOldCard) {
      const penalty = -22;
      delta += penalty;
      factors.push({
        label: "Card Closure Penalty",
        impact: penalty,
        text: "Closing your oldest account shrinks total credit line and lowers credit vintage age",
      });
    }

    // 4. Applying for New Loan/Card
    if (applyNewLoan) {
      const penalty = -10;
      delta += penalty;
      factors.push({
        label: "Hard Inquiry Impact",
        impact: penalty,
        text: "Lenders trigger a hard bureau inquiry which temporarily trims 5–15 points",
      });
    }

    // 5. Missed Payment / Default
    if (missedPayment) {
      const penalty = -75;
      delta += penalty;
      factors.push({
        label: "30+ Day Late Payment",
        impact: penalty,
        text: "Severe delinquency flag reported to bureau — stays on record up to 36 months",
      });
    }

    const projected = Math.min(900, Math.max(300, currentScore + delta));
    return { delta, projected, factors };
  }, [currentScore, payoffAmount, limitIncrease, closeOldCard, applyNewLoan, missedPayment, totalLimit, totalOutstanding]);

  const projectedGrade = scoreGrade(simulationResults.projected);

  const resetSimulator = () => {
    setPayoffAmount(0);
    setLimitIncrease(0);
    setCloseOldCard(false);
    setApplyNewLoan(false);
    setMissedPayment(false);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
      {/* Interactive Controls */}
      <Card style={{ padding: "22px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Calculator size={18} color={THEME.accent} />
            <span style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
              What-If Scenario Controls
            </span>
          </div>
          <Button variant="ghost" size="sm" icon={<RefreshCw size={12} />} onClick={resetSimulator}>
            Reset
          </Button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Slider 1: Pay off Debt */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: THEME.ink, marginBottom: 6 }}>
              <span>Pay Off Credit Card Balances</span>
              <span style={{ color: THEME.sage, fontWeight: 700 }}>{fmtINR(payoffAmount)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(100000, totalOutstanding || 100000)}
              step={5000}
              value={payoffAmount}
              onChange={(e) => setPayoffAmount(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.sage, cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: THEME.muted, marginTop: 4 }}>
              <span>₹0</span>
              <span>Total Dues: {fmtINR(totalOutstanding)}</span>
            </div>
          </div>

          {/* Slider 2: Increase Limit */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: THEME.ink, marginBottom: 6 }}>
              <span>Request Credit Limit Increase</span>
              <span style={{ color: THEME.cyan, fontWeight: 700 }}>+{fmtINR(limitIncrease)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={500000}
              step={25000}
              value={limitIncrease}
              onChange={(e) => setLimitIncrease(Number(e.target.value))}
              style={{ width: "100%", accentColor: THEME.cyan, cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: THEME.muted, marginTop: 4 }}>
              <span>+₹0</span>
              <span>+₹5 Lakh</span>
            </div>
          </div>

          {/* Action Toggles */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 6, borderTop: "1px solid var(--t-line)" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: 8,
                background: closeOldCard ? "color-mix(in srgb, var(--t-rust) 8%, var(--surface-0))" : "var(--surface-0)",
                border: `1px solid ${closeOldCard ? THEME.rust : "var(--t-line)"}`,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: THEME.ink }}>Close Oldest Credit Card</span>
                <span style={{ fontSize: 10, color: THEME.muted }}>Shrinks history length & available pool</span>
              </div>
              <input
                type="checkbox"
                checked={closeOldCard}
                onChange={(e) => setCloseOldCard(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: THEME.rust }}
              />
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: 8,
                background: applyNewLoan ? "color-mix(in srgb, var(--t-gold) 8%, var(--surface-0))" : "var(--surface-0)",
                border: `1px solid ${applyNewLoan ? THEME.gold : "var(--t-line)"}`,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: THEME.ink }}>Apply for New Loan / Credit Card</span>
                <span style={{ fontSize: 10, color: THEME.muted }}>Generates hard inquiry at the bureau</span>
              </div>
              <input
                type="checkbox"
                checked={applyNewLoan}
                onChange={(e) => setApplyNewLoan(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: THEME.gold }}
              />
            </label>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: 8,
                background: missedPayment ? "color-mix(in srgb, var(--t-rust) 12%, var(--surface-0))" : "var(--surface-0)",
                border: `1px solid ${missedPayment ? THEME.rust : "var(--t-line)"}`,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: THEME.rust }}>Miss a Payment (30+ Days Late)</span>
                <span style={{ fontSize: 10, color: THEME.muted }}>High penalty delinquency reporting</span>
              </div>
              <input
                type="checkbox"
                checked={missedPayment}
                onChange={(e) => setMissedPayment(e.target.checked)}
                style={{ width: 16, height: 16, accentColor: THEME.rust }}
              />
            </label>
          </div>
        </div>
      </Card>

      {/* Projected Simulation Results */}
      <Card style={{ padding: "22px 24px", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 16, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Projected Bureau Score
        </div>

        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "center", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 44, fontWeight: 700, color: projectedGrade.color, letterSpacing: "-0.04em" }}>
              <Prv>{simulationResults.projected}</Prv>
            </span>
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: simulationResults.delta > 0 ? THEME.sage : simulationResults.delta < 0 ? THEME.rust : THEME.muted,
              }}
            >
              {simulationResults.delta > 0 ? `+${simulationResults.delta}` : simulationResults.delta < 0 ? `${simulationResults.delta}` : "±0"} pts
            </span>
          </div>
          <Badge style={{ background: projectedGrade.bg, color: projectedGrade.color, fontWeight: 700, fontSize: 11, marginTop: 4 }}>
            {projectedGrade.label}
          </Badge>
          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 6 }}>
            Current Baseline: <strong>{currentScore}</strong>
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink, marginBottom: 8 }}>
          Simulation Factor Breakdown:
        </div>

        {simulationResults.factors.length === 0 ? (
          <div style={{ fontSize: 12, color: THEME.muted, fontStyle: "italic", padding: "16px 0", textAlign: "center" }}>
            Adjust sliders or toggles on the left to simulate real-world financial moves.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto", maxHeight: 220 }}>
            {simulationResults.factors.map((f, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: f.impact > 0 ? "color-mix(in srgb, var(--t-sage) 8%, var(--surface-0))" : "color-mix(in srgb, var(--t-rust) 8%, var(--surface-0))",
                  border: `1px solid ${f.impact > 0 ? "color-mix(in srgb, var(--t-sage) 20%, transparent)" : "color-mix(in srgb, var(--t-rust) 20%, transparent)"}`,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: THEME.ink }}>{f.label}</span>
                  <span style={{ fontSize: 10, color: THEME.muted }}>{f.text}</span>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    color: f.impact > 0 ? THEME.sage : THEME.rust,
                    whiteSpace: "nowrap",
                  }}
                >
                  {f.impact > 0 ? `+${f.impact}` : f.impact} pts
                </span>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px dashed var(--t-line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: THEME.muted }}>
            <Info size={13} style={{ flexShrink: 0 }} />
            <span>Simulated estimates follow standard FICO / TransUnion Indian risk weight algorithms.</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

// -----------------------------------------------------------------------------
// BUREAU DISPUTE & REDRESSAL GUIDE COMPONENT
// -----------------------------------------------------------------------------
function BureauDisputeGuide() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        {BUREAUS.map((b) => {
          const info = BUREAU_INFO[b];
          const bColor = BUREAU_COLORS[b];
          return (
            <Card key={b} style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: bColor }}>{b}</div>
                <Badge variant="muted" style={{ fontSize: 10 }}>
                  {info.refreshRate}
                </Badge>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: THEME.ink }}>{info.fullName}</div>
              <div style={{ fontSize: 11, color: THEME.muted, lineHeight: 1.4 }}>
                If you find incorrect personal details, wrongful account reporting, or fraudulent inquiries on your {b} report:
              </div>
              <div style={{ marginTop: "auto", paddingTop: 8 }}>
                <a
                  href={info.disputeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 700,
                    color: bColor,
                    textDecoration: "none",
                  }}
                >
                  Raise {b} Online Dispute <ExternalLink size={12} />
                </a>
              </div>
            </Card>
          );
        })}
      </div>

      {/* RBI Ombudsman Escalation Protocol */}
      <Card style={{ padding: "20px 24px", background: "color-mix(in srgb, var(--t-accent) 4%, var(--surface-0))" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <ShieldCheck size={20} color={THEME.accent} style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
              RBI Mandatory 30-Day Resolution Protocol & Ombudsman Escalation
            </div>
            <div style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.6 }}>
              Under Reserve Bank of India (RBI) Master Directives, credit bureaus and reporting banks MUST resolve customer disputes within <strong>30 calendar days</strong>. If unresolved or unfairly rejected, you are entitled to compensation of ₹100 per day of delay and can escalate to the RBI Banking Ombudsman portal at:
            </div>
            <div style={{ marginTop: 6 }}>
              <a
                href="https://cms.rbi.org.in"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  color: THEME.accent,
                  textDecoration: "none",
                }}
              >
                File Complaint with RBI Ombudsman (cms.rbi.org.in) <ExternalLink size={13} />
              </a>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// -----------------------------------------------------------------------------
// MAIN CREDIT SCORE TAB
// -----------------------------------------------------------------------------
interface CreditScoreTabProps {
  state: {
    creditScores?: CreditScoreEntry[];
    creditCards?: CreditCardItem[];
    loans?: LoanItem[];
  };
  addItem: (collection: string, item: CreditScoreEntry) => Promise<void> | void;
  removeItem: (collection: string, id: string) => Promise<void> | void;
  updateItem: (collection: string, id: string, item: CreditScoreEntry) => Promise<void> | void;
  showToast?: (message: string, type?: "success" | "error" | "info" | "warning") => void;
}

export function CreditScoreTab({ state, addItem, removeItem, updateItem, showToast }: CreditScoreTabProps) {
  const { familyProfiles } = useMasterData();
  const rawScores = state.creditScores;
  const rawCards = state.creditCards;
  const rawLoans = state.loans;

  const scores: CreditScoreEntry[] = useMemo(() => rawScores || [], [rawScores]);
  const creditCards: CreditCardItem[] = useMemo(() => rawCards || [], [rawCards]);
  const loans: LoanItem[] = useMemo(() => rawLoans || [], [rawLoans]);

  // Main UI States
  const [modal, setModal] = useState<Partial<CreditScoreEntry> | null>(null);
  const [bureau, setBureau] = useState<BureauType>("CIBIL");
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "trends" | "simulator" | "history" | "disputes">("overview");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [timeRange, setTimeRange] = useState<"6M" | "1Y" | "3Y" | "ALL">("1Y");
  const [overlayAllBureaus, setOverlayAllBureaus] = useState(false);
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Multi-Owner Scoping
  const distinctOwners = useMemo(
    () => Array.from(new Set(scores.map((s) => s.owner).filter(Boolean))),
    [scores]
  );
  const isMultiOwner = distinctOwners.length > 1;

  const ownerScopedScores = useMemo(
    () => (ownerFilter === "all" ? scores : scores.filter((s) => s.owner === ownerFilter)),
    [scores, ownerFilter]
  );

  const ownerScopedCards = useMemo(
    () =>
      ownerFilter === "all"
        ? creditCards
        : creditCards.filter((c) => c.owner === ownerFilter),
    [creditCards, ownerFilter]
  );

  const ownerScopedLoans = useMemo(
    () =>
      ownerFilter === "all"
        ? loans
        : loans.filter((l) => l.owner === ownerFilter),
    [loans, ownerFilter]
  );

  // Per-Bureau latest scores dictionary
  const bureauLatestMap = useMemo(() => {
    const map: Record<string, { latest: CreditScoreEntry | null; prev: CreditScoreEntry | null; delta: number | null; count: number }> = {};
    BUREAUS.forEach((b) => {
      const bScores = ownerScopedScores
        .filter((s) => s.bureau === b)
        .sort((x, y) => x.checkDate.localeCompare(y.checkDate));
      const latest = bScores[bScores.length - 1] || null;
      const prev = bScores[bScores.length - 2] || null;
      const delta = latest && prev ? latest.score - prev.score : null;
      map[b] = { latest, prev, delta, count: bScores.length };
    });
    return map;
  }, [ownerScopedScores]);

  // Selected Bureau data
  const bureauFiltered = useMemo(
    () => ownerScopedScores.filter((s) => s.bureau === bureau),
    [ownerScopedScores, bureau]
  );
  const bureauSorted = useMemo(
    () => [...bureauFiltered].sort((a, b) => a.checkDate.localeCompare(b.checkDate)),
    [bureauFiltered]
  );
  const activeLatest = bureauSorted[bureauSorted.length - 1];
  const activePrev = bureauSorted[bureauSorted.length - 2];
  const activeDelta = activeLatest && activePrev ? activeLatest.score - activePrev.score : null;

  // Chart Data Preparation with Range Filter
  const chartData = useMemo(() => {
    const cutoff = new Date();
    if (timeRange === "6M") cutoff.setMonth(cutoff.getMonth() - 6);
    else if (timeRange === "1Y") cutoff.setFullYear(cutoff.getFullYear() - 1);
    else if (timeRange === "3Y") cutoff.setFullYear(cutoff.getFullYear() - 3);
    else cutoff.setFullYear(cutoff.getFullYear() - 50);

    if (overlayAllBureaus) {
      // Aggregate by unique dates
      const dateMap: Record<string, Record<string, string | number>> = {};
      ownerScopedScores.forEach((s) => {
        if (new Date(s.checkDate) < cutoff) return;
        const dateKey = s.checkDate;
        if (!dateMap[dateKey]) {
          dateMap[dateKey] = {
            dateKey,
            dateLabel: new Date(s.checkDate).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
          };
        }
        dateMap[dateKey][s.bureau] = s.score;
      });
      return Object.values(dateMap).sort((a, b) => String(a.dateKey).localeCompare(String(b.dateKey)));
    }

    return bureauSorted
      .filter((s) => new Date(s.checkDate) >= cutoff)
      .map((s) => ({
        dateLabel: new Date(s.checkDate).toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
        score: s.score,
        bureau: s.bureau,
      }));
  }, [ownerScopedScores, bureauSorted, timeRange, overlayAllBureaus]);

  // Search and Sort for History Log Table
  const searchLower = search.trim().toLowerCase();
  const historyList = useMemo(() => {
    const list = [...ownerScopedScores].sort((a, b) => b.checkDate.localeCompare(a.checkDate));
    if (!searchLower) return list;
    return list.filter((s) => {
      const dateLabel = new Date(s.checkDate)
        .toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
        .toLowerCase();
      return (
        dateLabel.includes(searchLower) ||
        (s.bureau || "").toLowerCase().includes(searchLower) ||
        (s.source || "").toLowerCase().includes(searchLower) ||
        (s.notes || "").toLowerCase().includes(searchLower) ||
        String(s.score).includes(searchLower)
      );
    });
  }, [ownerScopedScores, searchLower]);

  // Async CRUD Handlers
  const { run: saveScore, loading: savingScore } = useAsyncAction(
    async (data: CreditScoreEntry) => {
      if (data.id && scores.find((s) => s.id === data.id)) {
        await updateItem("creditScores", data.id, data);
        showToast?.("Credit score updated successfully", "success");
      } else {
        await addItem("creditScores", data);
        showToast?.("Credit score logged successfully", "success");
      }
    },
    { onSuccess: () => setModal(null), onError: (e: any) => showToast?.(`Failed to save score: ${e?.message || "Unknown error"}`, "error") }
  );

  const { run: deleteScore } = useAsyncAction(
    async (id: string) => {
      await removeItem("creditScores", id);
      showToast?.("Credit score entry removed", "info");
    },
    { onError: (e: any) => showToast?.(`Failed to delete score entry: ${e?.message || "Unknown error"}`, "error") }
  );

  const handleExportCSV = () => {
    exportArrayToCSV(
      historyList.map((s) => ({
        ...s,
        ownerName: getOwnerAvatarInfo(s.owner, familyProfiles).name,
        dateFormatted: new Date(s.checkDate).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      })),
      [
        { key: "dateFormatted", label: "Check Date" },
        { key: "bureau", label: "Bureau" },
        { key: "score", label: "Score" },
        { key: "ownerName", label: "Owner" },
        { key: "source", label: "Source" },
        { key: "notes", label: "Notes" },
      ],
      `Credit_Score_Report_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Dynamic CSS Styling for responsive cards & hover states */}
      <style>{`
        .bureau-command-card {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 14px 16px;
          border-radius: 12px;
          background: var(--surface-0);
          border: 1.5px solid var(--t-line);
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
        }
        .bureau-command-card:hover {
          border-color: var(--b-color) !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px color-mix(in srgb, var(--b-color) 12%, transparent);
        }
        .bureau-command-card.active {
          border-color: var(--b-color) !important;
          background: color-mix(in srgb, var(--b-color) 7%, var(--surface-0));
          box-shadow: 0 0 0 1px var(--b-color);
        }
        .subnav-pill-btn {
          padding: 8px 14px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          background: transparent;
          color: var(--t-muted);
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .subnav-pill-btn:hover {
          color: var(--t-ink);
          background: var(--surface-1);
        }
        .subnav-pill-btn.active {
          color: var(--t-accent);
          background: color-mix(in srgb, var(--t-accent) 12%, var(--surface-0));
          font-weight: 700;
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
          .bureau-command-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 600px) {
          .bureau-command-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* Main Header & Top Actions */}
      <SectionTitle
        sub="Multi-Bureau Intelligence, 5-Pillar Credit Health, Trend Analytics & Interactive Simulator"
        rightElement={
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Button
              variant="ghost"
              size="sm"
              icon={<Download size={13} />}
              onClick={handleExportCSV}
              disabled={historyList.length === 0}
            >
              Export Report
            </Button>
            <Button
              variant="accent"
              icon={<Plus size={14} />}
              onClick={() => setModal({ bureau })}
            >
              Log Score
            </Button>
          </div>
        }
      >
        Credit Score & Bureau Health Center
      </SectionTitle>

      {/* Multi-Owner Profile Filter Bar */}
      {isMultiOwner && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: THEME.muted }}>
            <Info size={13} />
            <span>Viewing credit standing for:</span>
          </div>
          <select
            className="form-input"
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            aria-label="Filter by family member"
            style={{ width: 220, fontSize: 12, padding: "6px 12px" }}
          >
            <option value="all">All Family Members (Combined)</option>
            {familyProfiles
              .filter((p) => distinctOwners.includes(p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>
      )}

      {scores.length === 0 ? (
        <EmptyState
          icon={Award}
          gradient="linear-gradient(135deg, #6366f1 0%, #a855f7 100%)"
          dotColor="#6366f1"
          title="No Credit Scores Logged Yet"
          description="Log your credit scores from CIBIL, Experian, CRIF, or Equifax to unlock 5-factor credit health insights, historical trend graphs, and interactive 'what-if' score simulations."
          pills={[
            "4 Indian Credit Bureaus",
            "5-Pillar Health Scorecard",
            "What-If Debt Simulator",
            "Automated CSV / Report Export",
          ]}
          buttonLabel="Log First Credit Score"
          onAdd={() => setModal({ bureau: "CIBIL" })}
        />
      ) : (
        <>
          {/* Top Multi-Bureau Command Grid */}
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}
            className="bureau-command-grid"
          >
            {BUREAUS.map((b) => {
              const data = bureauLatestMap[b];
              const isActive = bureau === b;
              const bColor = BUREAU_COLORS[b];
              const latestScore = data.latest?.score;
              const grade = latestScore ? scoreGrade(latestScore) : null;

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
                  className={`bureau-command-card ${isActive ? "active" : ""}`}
                  style={{ "--b-color": bColor } as React.CSSProperties}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: isActive ? bColor : THEME.ink }}>
                        {b}
                      </span>
                      {data.count > 0 && (
                        <Badge variant="muted" style={{ fontSize: 9, padding: "1px 5px" }}>
                          {data.count}
                        </Badge>
                      )}
                    </div>
                    {data.delta !== null && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: data.delta > 0 ? THEME.sage : data.delta < 0 ? THEME.rust : THEME.muted,
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                        }}
                      >
                        {data.delta > 0 ? `+${data.delta}` : `${data.delta}`}
                      </span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 24,
                        fontWeight: 700,
                        color: latestScore ? THEME.ink : THEME.muted,
                        letterSpacing: "-0.03em",
                      }}
                    >
                      {latestScore ? <Prv>{latestScore}</Prv> : "—"}
                    </span>
                    {grade && (
                      <Badge
                        style={{
                          background: grade.bg,
                          color: grade.color,
                          fontSize: 9,
                          fontWeight: 800,
                          padding: "2px 6px",
                        }}
                      >
                        {grade.label}
                      </Badge>
                    )}
                  </div>

                  <div style={{ fontSize: 10, color: THEME.muted, marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>
                      {data.latest
                        ? new Date(data.latest.checkDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "No logs"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setModal({ bureau: b });
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        cursor: "pointer",
                        color: bColor,
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      + Add
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sub-Navigation Tabs */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              borderBottom: "1px solid var(--t-line)",
              paddingBottom: 6,
              overflowX: "auto",
            }}
          >
            <button
              className={`subnav-pill-btn ${activeSubTab === "overview" ? "active" : ""}`}
              onClick={() => setActiveSubTab("overview")}
            >
              <PieChart size={14} /> Overview & 5 Pillars
            </button>
            <button
              className={`subnav-pill-btn ${activeSubTab === "trends" ? "active" : ""}`}
              onClick={() => setActiveSubTab("trends")}
            >
              <TrendingUp size={14} /> Score Trends & Comparison
            </button>
            <button
              className={`subnav-pill-btn ${activeSubTab === "simulator" ? "active" : ""}`}
              onClick={() => setActiveSubTab("simulator")}
            >
              <Calculator size={14} /> What-If Simulator
            </button>
            <button
              className={`subnav-pill-btn ${activeSubTab === "history" ? "active" : ""}`}
              onClick={() => setActiveSubTab("history")}
            >
              <History size={14} /> Audit Log ({historyList.length})
            </button>
            <button
              className={`subnav-pill-btn ${activeSubTab === "disputes" ? "active" : ""}`}
              onClick={() => setActiveSubTab("disputes")}
            >
              <ShieldCheck size={14} /> Bureau Dispute Guide
            </button>
          </div>

          {/* TAB 1: OVERVIEW & 5 PILLARS */}
          {activeSubTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {activeLatest ? (
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr", gap: 20 }}>
                  {/* Left Hero Speedometer Card */}
                  <Card style={{ padding: "24px 20px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: BUREAU_COLORS[bureau] }}>
                        {bureau} Score
                      </span>
                      <span style={{ fontSize: 11, color: THEME.muted }}>• Latest Check</span>
                    </div>

                    <CreditGaugeVisual score={activeLatest.score} size={230} />

                    <div style={{ fontSize: 11, color: THEME.muted, textAlign: "center", marginTop: 8 }}>
                      Checked on{" "}
                      <strong>
                        {new Date(activeLatest.checkDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </strong>
                      {activeLatest.source && ` via ${activeLatest.source}`}
                    </div>

                    {activeDelta !== null && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: "4px 12px",
                          borderRadius: 20,
                          background: activeDelta > 0 ? "color-mix(in srgb, var(--t-sage) 12%, transparent)" : activeDelta < 0 ? "color-mix(in srgb, var(--t-rust) 12%, transparent)" : "var(--surface-1)",
                          color: activeDelta > 0 ? THEME.sage : activeDelta < 0 ? THEME.rust : THEME.muted,
                          fontSize: 11,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {activeDelta > 0 ? <TrendingUp size={13} /> : activeDelta < 0 ? <TrendingDown size={13} /> : <Minus size={13} />}
                        {activeDelta > 0 ? `+${activeDelta} pts increase` : activeDelta < 0 ? `${activeDelta} pts drop` : "Score unchanged"}
                      </div>
                    )}
                  </Card>

                  {/* Right Score Bands & Quick Vitals */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <Card style={{ padding: "20px 22px" }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Bureau Score Tier Scale
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
                        {SCORE_BANDS.map((b) => {
                          const isCurrentTier = activeLatest.score >= b.min && activeLatest.score <= b.max;
                          return (
                            <div
                              key={b.label}
                              style={{
                                padding: "8px 10px",
                                borderRadius: 8,
                                background: isCurrentTier ? `color-mix(in srgb, ${b.color} 18%, var(--surface-0))` : "var(--surface-0)",
                                border: `1.5px solid ${isCurrentTier ? b.color : "var(--t-line)"}`,
                                display: "flex",
                                flexDirection: "column",
                                gap: 2,
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: 11, fontWeight: 800, color: b.color }}>{b.label}</span>
                                {isCurrentTier && <Check size={11} color={b.color} />}
                              </div>
                              <span style={{ fontSize: 10, color: THEME.ink, fontWeight: 600 }}>{b.range}</span>
                            </div>
                          );
                        })}
                      </div>
                    </Card>

                    {/* Peak & Average Summary */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
                      <StatCard
                        label="Peak Score"
                        value={String(Math.max(...bureauSorted.map((s) => s.score)))}
                        numericValue={Math.max(...bureauSorted.map((s) => s.score))}
                        formatValue={(n) => String(Math.round(n))}
                        icon={<Award size={18} />}
                        color={THEME.sage}
                      />
                      <StatCard
                        label="Logged Checks"
                        value={String(bureauSorted.length)}
                        numericValue={bureauSorted.length}
                        formatValue={(n) => String(Math.round(n))}
                        icon={<FileText size={18} />}
                        color={BUREAU_COLORS[bureau]}
                      />
                      <StatCard
                        label="Gap to 750+ (Prime)"
                        value={activeLatest.score >= 750 ? "Achieved" : `${750 - activeLatest.score} pts`}
                        icon={<Sparkles size={18} />}
                        color={activeLatest.score >= 750 ? THEME.sage : THEME.gold}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <Card style={{ padding: "36px 20px", textAlign: "center", borderStyle: "dashed" }}>
                  <Award size={36} color={THEME.muted} style={{ marginBottom: 12, opacity: 0.3 }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink, marginBottom: 4 }}>
                    No {bureau} Score Entries Found
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted, maxWidth: 360, margin: "0 auto 16px" }}>
                    Log your latest {bureau} credit score to enable live gauge tracking, health rating, and personalized advice.
                  </div>
                  <Button variant="accent" size="sm" icon={<Plus size={13} />} onClick={() => setModal({ bureau })}>
                    Log {bureau} Score
                  </Button>
                </Card>
              )}

              {/* 5 Pillars Health Scorecard */}
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  5-Pillar Credit Health Scorecard (Indian Bureau Formula)
                </div>
                <CreditPillarsEngine
                  sorted={bureauSorted}
                  creditCards={ownerScopedCards}
                  loans={ownerScopedLoans}
                />
              </div>
            </div>
          )}

          {/* TAB 2: SCORE TRENDS & COMPARISON */}
          {activeSubTab === "trends" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Card style={{ padding: "22px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
                      {overlayAllBureaus ? "Multi-Bureau Historical Comparison" : `Score Trend Analytics — ${bureau}`}
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                      Track score progression, bureau alignment, and milestone thresholds
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {/* Multi-Bureau Overlay Toggle */}
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        fontWeight: 600,
                        color: THEME.ink,
                        cursor: "pointer",
                        padding: "4px 8px",
                        borderRadius: 6,
                        background: overlayAllBureaus ? "color-mix(in srgb, var(--t-accent) 12%, var(--surface-0))" : "transparent",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={overlayAllBureaus}
                        onChange={(e) => setOverlayAllBureaus(e.target.checked)}
                        style={{ accentColor: THEME.accent }}
                      />
                      <span>Compare All 4 Bureaus</span>
                    </label>

                    {/* Time Range Selector */}
                    <div style={{ display: "flex", background: "var(--surface-2)", borderRadius: 8, padding: 2 }}>
                      {(["6M", "1Y", "3Y", "ALL"] as const).map((r) => (
                        <button
                          key={r}
                          onClick={() => setTimeRange(r)}
                          style={{
                            padding: "4px 10px",
                            border: "none",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: timeRange === r ? 700 : 500,
                            background: timeRange === r ? "var(--surface-0)" : "transparent",
                            color: timeRange === r ? THEME.ink : THEME.muted,
                            cursor: "pointer",
                            boxShadow: timeRange === r ? "var(--shadow-xs)" : "none",
                          }}
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {chartData.length < 2 ? (
                  <div style={{ padding: "40px 20px", textAlign: "center", color: THEME.muted, fontSize: 12 }}>
                    Log at least 2 entries across different dates to visualize trend curves.
                  </div>
                ) : (
                  <div style={{ width: "100%", height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={THEME.border} />
                        <XAxis dataKey="dateLabel" tick={{ fontSize: 11, fill: "var(--t-muted)" }} />
                        <YAxis domain={[300, 900]} tick={{ fontSize: 11, fill: "var(--t-muted)" }} />
                        <Tooltip
                          contentStyle={{
                            background: "var(--surface-0)",
                            border: `1.5px solid ${THEME.border}`,
                            borderRadius: 8,
                            boxShadow: "var(--shadow-md)",
                            fontSize: 12,
                          }}
                        />
                        <ReferenceLine
                          y={750}
                          stroke={THEME.sage}
                          strokeDasharray="4 4"
                          label={{
                            value: "750+ Prime",
                            fontSize: 10,
                            fill: THEME.sage,
                            position: "insideBottomRight",
                          }}
                        />
                        <ReferenceLine
                          y={700}
                          stroke={THEME.cyan}
                          strokeDasharray="4 4"
                          label={{
                            value: "700+ Good",
                            fontSize: 10,
                            fill: THEME.cyan,
                            position: "insideBottomRight",
                          }}
                        />

                        {overlayAllBureaus ? (
                          BUREAUS.map((b) => (
                            <Line
                              key={b}
                              type="monotone"
                              dataKey={b}
                              name={b}
                              stroke={BUREAU_COLORS[b]}
                              strokeWidth={2.5}
                              dot={{ r: 4, fill: BUREAU_COLORS[b] }}
                              activeDot={{ r: 6 }}
                              connectNulls
                            />
                          ))
                        ) : (
                          <Line
                            type="monotone"
                            dataKey="score"
                            name={bureau}
                            stroke={BUREAU_COLORS[bureau]}
                            strokeWidth={2.5}
                            dot={{ r: 5, fill: BUREAU_COLORS[bureau] }}
                            activeDot={{ r: 7 }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* TAB 3: WHAT-IF SIMULATOR */}
          {activeSubTab === "simulator" && (
            <CreditScoreSimulator
              currentScore={activeLatest?.score || 720}
              creditCards={ownerScopedCards}
              loans={ownerScopedLoans}
            />
          )}

          {/* TAB 4: AUDIT LOG & HISTORY */}
          {activeSubTab === "history" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Toolbar */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div style={{ position: "relative", minWidth: 260 }}>
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
                    placeholder="Search bureau, date, score, source…"
                    style={{
                      border: `1.5px solid ${THEME.line}`,
                      borderRadius: 10,
                      padding: `8px ${search ? 32 : 12}px 8px 34px`,
                      fontSize: 12,
                      color: THEME.ink,
                      background: "var(--surface-0)",
                      width: "100%",
                    }}
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      style={{
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: THEME.muted,
                        cursor: "pointer",
                      }}
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Button variant="ghost" size="sm" icon={<Download size={13} />} onClick={handleExportCSV}>
                    Export CSV
                  </Button>
                  <Button variant="accent" size="sm" icon={<Plus size={13} />} onClick={() => setModal({ bureau })}>
                    Log New Entry
                  </Button>
                </div>
              </div>

              {/* Data Rows */}
              {historyList.length === 0 ? (
                <Card style={{ padding: "30px", textAlign: "center", borderStyle: "dashed" }}>
                  <div style={{ fontSize: 13, color: THEME.muted }}>No credit score records match your search criteria.</div>
                </Card>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {historyList.map((s) => {
                    const grade = scoreGrade(s.score);
                    const bColor = BUREAU_COLORS[s.bureau as BureauType] || THEME.accent;
                    return (
                      <div
                        key={s.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                          padding: "12px 18px",
                          borderRadius: 12,
                          background: "var(--surface-0)",
                          border: "1.5px solid var(--t-line)",
                          transition: "all 0.2s",
                        }}
                      >
                        {/* Bureau Monogram + Score Badge */}
                        <div
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: 10,
                            border: `1.5px solid ${grade.color}`,
                            background: `color-mix(in srgb, ${grade.color} 8%, var(--surface-0))`,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <span style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: grade.color }}>
                            <Prv>{s.score}</Prv>
                          </span>
                          <span style={{ fontSize: 9, fontWeight: 800, color: bColor, textTransform: "uppercase" }}>
                            {s.bureau}
                          </span>
                        </div>

                        {/* Middle Details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: THEME.ink }}>
                              {new Date(s.checkDate).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              })}
                            </span>
                            <Badge style={{ background: grade.bg, color: grade.color, fontWeight: 700, fontSize: 10 }}>
                              {grade.label}
                            </Badge>
                          </div>

                          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span>Source: <strong style={{ color: THEME.ink }}>{s.source || "Manual"}</strong></span>
                            {s.notes && (
                              <>
                                <span>•</span>
                                <span style={{ fontStyle: "italic", color: THEME.ink }}>&ldquo;{s.notes}&rdquo;</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Owner Avatar */}
                        <OwnerAvatar ownerId={s.owner} size={26} />

                        {/* Action Buttons */}
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <button
                            onClick={() => setModal(s)}
                            aria-label="Edit score entry"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: THEME.muted,
                              padding: 6,
                              borderRadius: 6,
                            }}
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(s.id)}
                            aria-label="Delete score entry"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: THEME.rust,
                              padding: 6,
                              borderRadius: 6,
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: BUREAU DISPUTES & RESOLUTION */}
          {activeSubTab === "disputes" && <BureauDisputeGuide />}
        </>
      )}

      {/* Modal Dialog */}
      {modal !== null && (
        <ScoreFormModal
          initial={modal}
          onSave={saveScore}
          onClose={() => setModal(null)}
          saving={savingScore}
        />
      )}

      {/* Confirm Delete Dialog */}
      {confirmDeleteId && (
        <ConfirmDialog
          message="Delete this credit score entry? This cannot be undone."
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
export default CreditScoreTab;
