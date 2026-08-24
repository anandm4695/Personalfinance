// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Home,
  Plus,
  Trash2,
  Pencil,
  FileText,
  Receipt,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  IndianRupee,
  Building2,
  AlertCircle,
  User,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { fmtINRFull, today } from "../../utils/finance";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { EmptyState } from "../ui/EmptyState";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { StatCard } from "../ui/StatCard";
import { SectionTitle } from "../ui/SectionTitle";
import { usePrivacy } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { ConfirmDialog } from "../ui/Feedback";
import { useAsyncAction } from "../../hooks/useAsyncAction";

// Sentinel owner id for a co-owner who isn't one of this household's tracked
// family profiles (e.g. a parent on the property papers who isn't part of
// this app's net worth tracking). Stored as a free-text `name` instead of a
// familyProfiles id — see OwnerSplitRow.
const EXTERNAL_OWNER_ID = "external";

// Fraction of a property's value attributable to THIS household (all tracked
// family profiles combined), excluding any share held by an untracked
// "external" co-owner. Mirrors `realEstateTrackedShare` in useMetrics.ts /
// netWorthAsOf.ts — kept in sync so this tab's portfolio totals agree with
// the canonical net-worth figure for jointly-owned properties instead of
// showing the full 100% value of a property the household only partly owns.
function realEstateTrackedShare(property: any): number {
  if (Array.isArray(property.owners) && property.owners.length > 0) {
    return (
      property.owners.reduce(
        (s: number, o: any) => (o?.id !== EXTERNAL_OWNER_ID ? s + Number(o.sharePct || 0) : s),
        0
      ) / 100
    );
  }
  return 1;
}

// Single family profile's own share, mirroring `realEstateShareForOwner` in
// useMetrics.ts. Without this, viewing a single family member's profile would
// fall through to the household-wide share and show a co-owner's ENTIRE joint
// property value under one member's individual portfolio stats.
function realEstateShareForOwner(property: any, profileId: string): number {
  if (Array.isArray(property.owners) && property.owners.length > 0) {
    const match = property.owners.find((o: any) => o?.id === profileId);
    return match ? Number(match.sharePct || 0) / 100 : 0;
  }
  return property.owner === profileId ? 1 : 0;
}

// ─── Builder Logo ─────────────────────────────────────────────────────────────

const BUILDER_LOGO_DOMAINS: Record<string, string> = {
  lodha: "lodhagroup.com",
  macrotech: "lodhagroup.com",
  dlf: "dlf.in",
  godrej: "godrejproperties.com",
  prestige: "prestigeconstructions.com",
  brigade: "brigadegroup.com",
  sobha: "sobha.com",
  puravankara: "puravankara.com",
  provident: "providenthousing.com",
  mahindra: "mahindralifespaces.com",
  tata: "tatahousing.com",
  oberoi: "oberoirealty.com",
  kolte: "koltepatil.com",
  shapoorji: "shapoorji.com",
  phoenix: "thephoenixmills.com",
  embassy: "embassyindia.com",
  raymond: "raymond.in",
  runwal: "runwalgroupindia.com",
  hiranandani: "hiranandanigroup.com",
  "l&t": "ltrealty.com",
  lnt: "ltrealty.com",
  piramal: "piramalrealty.com",
  omkar: "omkarrealtors.com",
  rustomjee: "rustomjee.com",
  sunteck: "sunteckrealty.com",
  wadhwa: "wadhwagroup.com",
  kanakia: "kanakiaspaces.com",
  kalpataru: "kalpatarugroup.com",
  vtp: "vtprealty.com",
  sumadhura: "sumadhura.com",
  century: "centuryrealestate.in",
  shriram: "shriramproperties.com",
  rohan: "rohanbuilders.com",
  ekta: "ektaworld.com",
  casagrande: "casagrande.in",
  "casa grande": "casagrande.in",
  radiance: "radiancerealty.in",
  chandak: "chandakgroup.com",
};

const BUILDER_THEMES: Record<string, { gradient: string; color: string }> = {
  lodha: { gradient: "linear-gradient(135deg,#1e3a8a 0%,#3b82f6 100%)", color: "#1e40af" },
  dlf: { gradient: "linear-gradient(135deg,#7c2d12 0%,#ea580c 100%)", color: "#ea580c" },
  godrej: { gradient: "linear-gradient(135deg,#14532d 0%,#22c55e 100%)", color: "#15803d" },
  prestige: { gradient: "linear-gradient(135deg,#7c3aed 0%,#a78bfa 100%)", color: "#7c3aed" },
  brigade: { gradient: "linear-gradient(135deg,#0891b2 0%,#22d3ee 100%)", color: "#0891b2" },
  sobha: { gradient: "linear-gradient(135deg,#b45309 0%,#f59e0b 100%)", color: "#b45309" },
  puravankara: { gradient: "linear-gradient(135deg,#dc2626 0%,#f87171 100%)", color: "#dc2626" },
  mahindra: { gradient: "linear-gradient(135deg,#dc2626 0%,#f87171 100%)", color: "#dc2626" },
  tata: { gradient: "linear-gradient(135deg,#1d4ed8 0%,#60a5fa 100%)", color: "#1d4ed8" },
  oberoi: { gradient: "linear-gradient(135deg,#0f172a 0%,#334155 100%)", color: "#334155" },
  kolte: { gradient: "linear-gradient(135deg,#059669 0%,#34d399 100%)", color: "#059669" },
  shapoorji: { gradient: "linear-gradient(135deg,#d97706 0%,#fbbf24 100%)", color: "#d97706" },
  hiranandani: { gradient: "linear-gradient(135deg,#6d28d9 0%,#c084fc 100%)", color: "#7c3aed" },
  kalpataru: { gradient: "linear-gradient(135deg,#b45309 0%,#fbbf24 100%)", color: "#b45309" },
  piramal: { gradient: "linear-gradient(135deg,#0f766e 0%,#2dd4bf 100%)", color: "#0f766e" },
  runwal: { gradient: "linear-gradient(135deg,#1e40af 0%,#60a5fa 100%)", color: "#1e40af" },
  sunteck: { gradient: "linear-gradient(135deg,#7c2d12 0%,#fb923c 100%)", color: "#c2410c" },
  chandak: { gradient: "linear-gradient(135deg,#1e3a8a 0%,#f59e0b 100%)", color: "#1d4ed8" },
};

function getBuilderTheme(name: string) {
  const key = (name || "").toLowerCase().replace(/[\s\-_.&]+/g, "");
  for (const [k, v] of Object.entries(BUILDER_THEMES)) {
    if (key.includes(k.replace(/[\s\-_.&]+/g, ""))) return v;
  }
  const hue =
    Array.from(name || "?").reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffff, 0) % 360;
  const color = `hsl(${hue},55%,42%)`;
  return {
    gradient: `linear-gradient(135deg,hsl(${hue},55%,42%) 0%,hsl(${hue},70%,62%) 100%)`,
    color,
  };
}

function builderInitials(name: string): string {
  const words = (name || "?").trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

const BuilderLogo = ({
  name,
  size = 46,
  borderRadius = 13,
}: {
  name: string;
  size?: number;
  borderRadius?: number;
}) => {
  const theme = getBuilderTheme(name);
  const key = (name || "").toLowerCase().replace(/[\s\-_.&]+/g, "");
  let domain = "";
  for (const [k, d] of Object.entries(BUILDER_LOGO_DOMAINS)) {
    if (key.includes(k.replace(/[\s\-_.&]+/g, ""))) {
      domain = d;
      break;
    }
  }

  const [imgSrc, setImgSrc] = React.useState<string | null>(
    domain ? `https://logos.hunter.io/${domain}` : null
  );
  const [fallbackLevel, setFallbackLevel] = React.useState<number>(domain ? 0 : 2);

  React.useEffect(() => {
    if (domain) {
      setImgSrc(`https://logos.hunter.io/${domain}`);
      setFallbackLevel(0);
    } else {
      setImgSrc(null);
      setFallbackLevel(2);
    }
  }, [domain]);

  const handleError = () => {
    if (fallbackLevel === 0) {
      setFallbackLevel(1);
      setImgSrc(`https://www.google.com/s2/favicons?domain=${domain}&sz=256`);
    } else {
      setFallbackLevel(2);
      setImgSrc(null);
    }
  };

  const initials = builderInitials(name || "?");
  const fontSize = Math.round(size * 0.38);

  if (domain && fallbackLevel < 2 && imgSrc) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius,
          background: "var(--surface-0)",
          border: `1.5px solid color-mix(in srgb, ${theme.color} 30%, transparent)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          overflow: "hidden",
        }}
      >
        <img
          src={imgSrc}
          alt={name}
          onError={handleError}
          style={{
            width: Math.round(size * 0.8),
            height: Math.round(size * 0.8),
            objectFit: "contain",
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius,
        background: theme.gradient,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize,
          fontWeight: 900,
          color: "#fff",
          letterSpacing: "-0.01em",
          lineHeight: 1,
        }}
      >
        {initials}
      </span>
    </div>
  );
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "var(--radius-md)",
  border: "1.5px solid var(--t-line)",
  background: "var(--surface-0)",
  color: "var(--t-ink)",
  fontSize: 14,
  fontWeight: 500,
  outline: "none",
  boxSizing: "border-box" as const,
};

// Map onto the app-wide semantic tokens (sage/gold/rust/accent) so status
// colors stay consistent with every other tab and adapt to the active theme.
// These are CSS var() strings, so always combine with color-mix() — never
// append a hex-alpha suffix directly onto a var().
const STATUS_HEX: Record<string, string> = {
  owned: THEME.sage,
  sold: THEME.rust,
  "under-construction": THEME.gold,
};

const DEMAND_HEX: Record<string, string> = {
  pending: THEME.gold,
  paid: THEME.sage,
  partial: THEME.accent,
  overdue: THEME.rust,
};

const fmtDate = (d: string) => {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
};

const TYPE_LABELS: Record<string, string> = {
  residential: "Residential",
  commercial: "Commercial",
  land: "Land",
  plot: "Plot",
  villa: "Villa",
  other: "Other",
};

// ─── Shared card shell ────────────────────────────────────────────────────────
// Premium glassmorphic card with gradient background, double border, and soft shadow
const cardShell: React.CSSProperties = {
  background:
    "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 10%, var(--surface-0)) 100%)",
  border: "1.5px solid var(--t-line)",
  borderRadius: 18,
  boxShadow:
    "0 4px 24px -4px rgba(15,23,42,0.06), inset 0 1px 0 color-mix(in srgb, var(--t-ink) 5%, transparent)",
  overflow: "hidden",
  marginBottom: 20,
  transition: "box-shadow 0.25s cubic-bezier(0.4,0,0.2,1)",
};

// ─── Property Modal ──────────────────────────────────────────────────────────

function PropertyModal({ existing, onClose, onSave, saving = false }: any) {
  const { familyProfiles } = useMasterData();
  const isEdit = !!existing;
  const [f, setF] = useState(
    existing || {
      name: "",
      type: "residential",
      status: "owned",
      location: "",
      developerName: "",
      sellerName: "",
      reraNumber: "",
      areaSqft: "",
      purchaseDate: today(),
      registrationDate: "",
      possessionDate: "",
      agreementValue: "",
      agreementValuePaid: "",
      stampDuty: "",
      stampDutyPaid: "",
      tdsAmount: "",
      tdsValue: "",
      marketValue: "",
      saleDate: "",
      salePrice: "",
      saleStampDuty: "",
      saleTds: "",
      notes: "",
      owner: "self",
    }
  );

  // Buyer-side ownership: a property can be jointly held by more than one
  // family profile, each with its own percentage share. `owners` is the
  // source of truth; the flat `owner` field is derived on save (highest
  // share) so the rest of the app's single-owner filters keep working.
  const [owners, setOwners] = useState<any[]>(() => {
    if (existing?.owners?.length > 0) return existing.owners;
    return [{ id: existing?.owner || "self", sharePct: 100 }];
  });

  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const totalPct = owners.reduce((s, o) => s + Number(o.sharePct || 0), 0);
  const isMulti = owners.length > 1;
  const pctValid = totalPct === 100;

  const updateOwner = (idx: number, updated: any) =>
    setOwners((prev) => prev.map((o, i) => (i === idx ? updated : o)));

  const addOwner = () => {
    const used = new Set(owners.map((o) => o.id));
    const availableProfile = familyProfiles.find((p) => !used.has(p.id));
    // Once every tracked family profile is already an owner, default new rows to
    // an "external" owner — someone (e.g. a parent) who co-owns the property but
    // isn't one of this household's tracked family profiles / net worth.
    const newOwner = availableProfile
      ? { id: availableProfile.id, sharePct: 0 }
      : { id: EXTERNAL_OWNER_ID, name: "", sharePct: 0 };
    const count = owners.length + 1;
    const base = Math.floor(100 / count);
    const rem = 100 - base * count;
    setOwners([...owners.map((o) => ({ ...o, sharePct: base })), { ...newOwner, sharePct: base + rem }]);
  };

  const removeOwner = (idx: number) => {
    const removed = owners[idx];
    const next = owners.filter((_, i) => i !== idx);
    if (next.length === 0) return;
    const perOther = Math.floor(Number(removed.sharePct || 0) / next.length);
    const rem = Number(removed.sharePct || 0) - perOther * next.length;
    setOwners(
      next.map((o, i) => ({
        ...o,
        sharePct: Number(o.sharePct || 0) + perOther + (i === 0 ? rem : 0),
      }))
    );
  };

  const equaliseOwners = () => {
    const base = Math.floor(100 / owners.length);
    const rem = 100 - base * owners.length;
    setOwners((prev) => prev.map((o, i) => ({ ...o, sharePct: i === 0 ? base + rem : base })));
  };

  const externalNamesValid = owners.every(
    (o) => o.id !== EXTERNAL_OWNER_ID || String(o.name || "").trim()
  );

  const handleSave = () => {
    if (!f.name) return;
    if (!pctValid || !externalNamesValid) return;
    // The flat `owner` field must stay a valid familyProfiles id (it's used
    // across the app for single-owner filtering), so the primary owner is
    // chosen from the highest-share tracked family profile, skipping any
    // external co-owners. Falls back to "self" if every owner is external.
    const trackedOwners = owners.filter((o) => o.id !== EXTERNAL_OWNER_ID);
    const pool = trackedOwners.length > 0 ? trackedOwners : owners;
    const primary = pool.reduce(
      (max, o) => (Number(o.sharePct || 0) > Number(max.sharePct || 0) ? o : max),
      pool[0]
    );
    onSave({ ...f, owners, owner: primary.id === EXTERNAL_OWNER_ID ? "self" : primary.id });
  };

  return (
    <Modal title={isEdit ? "Edit Property" : "Add Property"} onClose={onClose} maxWidth={640}>
      <div className="form-grid-2" style={{ gap: 12 }}>
        <Field label="Property Name *" style={{ gridColumn: "1 / -1" }}>
          <input
            style={input}
            value={f.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Flat 4B, Lodha Palava"
          />
        </Field>
        <Field label="Type">
          <select style={input} value={f.type} onChange={(e) => set("type", e.target.value)}>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="land">Land</option>
            <option value="plot">Plot</option>
            <option value="villa">Villa</option>
            <option value="other">Other</option>
          </select>
        </Field>
        <Field label="Status">
          <select style={input} value={f.status} onChange={(e) => set("status", e.target.value)}>
            <option value="owned">Owned</option>
            <option value="under-construction">Under Construction</option>
            <option value="sold">Sold</option>
          </select>
        </Field>
        <Field label="Location" style={{ gridColumn: "1 / -1" }}>
          <input
            style={input}
            value={f.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="City / area"
          />
        </Field>
        <Field label="Developer / Builder Name">
          <input
            style={input}
            value={f.developerName}
            onChange={(e) => set("developerName", e.target.value)}
          />
        </Field>
        <Field label="Seller Name">
          <input
            style={input}
            value={f.sellerName}
            onChange={(e) => set("sellerName", e.target.value)}
          />
        </Field>
        <Field label="RERA Number">
          <input
            style={input}
            value={f.reraNumber}
            onChange={(e) => set("reraNumber", e.target.value)}
          />
        </Field>
        <Field label="Area (sq ft)">
          <input
            style={input}
            type="number"
            value={f.areaSqft}
            onChange={(e) => set("areaSqft", e.target.value)}
          />
        </Field>
      </div>

      <div style={{ height: 1, background: "var(--t-line)", margin: "16px 0" }} />
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: THEME.muted,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 12,
        }}
      >
        Ownership Details (Buyer Side)
      </div>

      {isMulti && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            marginBottom: 12,
            background: pctValid
              ? `color-mix(in srgb, ${THEME.sage} 8%, transparent)`
              : `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
            border: `1px solid color-mix(in srgb, ${pctValid ? THEME.sage : THEME.rust} 20%, transparent)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {pctValid ? (
              <CheckCircle size={15} color={THEME.sage} />
            ) : (
              <AlertCircle size={15} color={THEME.rust} />
            )}
            <span
              style={{ fontSize: 12, fontWeight: 700, color: pctValid ? THEME.sage : THEME.rust }}
            >
              {pctValid
                ? `Ownership balanced — total ${totalPct}%`
                : `Ownership % must total 100% (currently ${totalPct}%)`}
            </span>
          </div>
          <button
            onClick={equaliseOwners}
            style={{
              padding: "4px 10px",
              borderRadius: 6,
              border: `1px solid color-mix(in srgb, ${THEME.accent} 27%, transparent)`,
              background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
              color: THEME.accent,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Auto-equalise
          </button>
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {owners.map((o, idx) => (
          <OwnerSplitRow
            key={idx}
            owner={o}
            idx={idx}
            familyProfiles={familyProfiles}
            usedIds={owners.filter((_, i) => i !== idx).map((x) => x.id)}
            onChange={(updated: any) => updateOwner(idx, updated)}
            canDelete={owners.length > 1}
            onDelete={() => removeOwner(idx)}
          />
        ))}
      </div>

      {owners.length < 10 && (
        <button
          onClick={addOwner}
          style={{
            marginTop: 10,
            width: "100%",
            padding: "9px",
            border: `1.5px dashed color-mix(in srgb, ${THEME.accent} 33%, transparent)`,
            borderRadius: 10,
            background: `color-mix(in srgb, ${THEME.accent} 4%, transparent)`,
            color: THEME.accent,
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Plus size={13} /> Add Co-Owner
        </button>
      )}

      <div style={{ height: 1, background: "var(--t-line)", margin: "16px 0" }} />
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: THEME.muted,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 12,
        }}
      >
        Key Dates
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
        }}
      >
        <Field label="Purchase Date">
          <input
            style={input}
            type="date"
            value={f.purchaseDate}
            onChange={(e) => set("purchaseDate", e.target.value)}
          />
        </Field>
        <Field label="Registration Date">
          <input
            style={input}
            type="date"
            value={f.registrationDate}
            onChange={(e) => set("registrationDate", e.target.value)}
          />
        </Field>
        <Field label="Possession Date">
          <input
            style={input}
            type="date"
            value={f.possessionDate}
            onChange={(e) => set("possessionDate", e.target.value)}
          />
        </Field>
      </div>

      <div style={{ height: 1, background: "var(--t-line)", margin: "16px 0" }} />
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: THEME.muted,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: 12,
        }}
      >
        Financials (Purchase)
      </div>
      <div className="form-grid-2" style={{ gap: 12 }}>
        <Field label="Agreement Value (₹)">
          <input
            style={input}
            type="number"
            value={f.agreementValue}
            onChange={(e) => set("agreementValue", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Agreement Value Paid (₹)">
          <input
            style={input}
            type="number"
            value={f.agreementValuePaid}
            onChange={(e) => set("agreementValuePaid", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Stamp Duty (₹)">
          <input
            style={input}
            type="number"
            value={f.stampDuty}
            onChange={(e) => set("stampDuty", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Stamp Duty Paid (₹)">
          <input
            style={input}
            type="number"
            value={f.stampDutyPaid}
            onChange={(e) => set("stampDutyPaid", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="TDS Amount (₹)">
          <input
            style={input}
            type="number"
            value={f.tdsAmount}
            onChange={(e) => set("tdsAmount", e.target.value)}
            placeholder="Total TDS liability, e.g. 1% under Sec 194-IA"
          />
        </Field>
        <Field label="TDS Paid (₹)">
          <input
            style={input}
            type="number"
            value={f.tdsValue}
            onChange={(e) => set("tdsValue", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Current Market Value (₹)">
          <input
            style={input}
            type="number"
            value={f.marketValue}
            onChange={(e) => set("marketValue", e.target.value)}
            placeholder="0"
          />
        </Field>
      </div>

      {f.status === "sold" && (
        <>
          <div style={{ height: 1, background: "var(--t-line)", margin: "16px 0" }} />
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: THEME.muted,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
            }}
          >
            Sale Details
          </div>
          <div className="form-grid-2" style={{ gap: 12 }}>
            <Field label="Sale Date">
              <input
                style={input}
                type="date"
                value={f.saleDate}
                onChange={(e) => set("saleDate", e.target.value)}
              />
            </Field>
            <Field label="Sale Price (₹)">
              <input
                style={input}
                type="number"
                value={f.salePrice}
                onChange={(e) => set("salePrice", e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="Sale Stamp Duty (₹)">
              <input
                style={input}
                type="number"
                value={f.saleStampDuty}
                onChange={(e) => set("saleStampDuty", e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="Sale TDS (₹)">
              <input
                style={input}
                type="number"
                value={f.saleTds}
                onChange={(e) => set("saleTds", e.target.value)}
                placeholder="0"
              />
            </Field>
          </div>
        </>
      )}

      <Field label="Notes" style={{ marginTop: 12 }}>
        <textarea
          style={{ ...input, minHeight: 60, resize: "vertical" }}
          value={f.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </Field>

      <ModalActions
        onSave={handleSave}
        onClose={onClose}
        saveLabel={isEdit ? "Save Changes" : "Add Property"}
        disabled={!f.name || !pctValid || !externalNamesValid || saving}
        loading={saving}
      />
    </Modal>
  );
}

// ─── Owner Split Row ──────────────────────────────────────────────────────────

function OwnerSplitRow({
  owner,
  idx,
  familyProfiles,
  usedIds,
  onChange,
  canDelete,
  onDelete,
}: {
  owner: any;
  idx: number;
  familyProfiles: any[];
  usedIds: string[];
  onChange: (updated: any) => void;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const accentColor = [THEME.accent, THEME.sage, THEME.gold, THEME.rust, THEME.violet][idx % 5];
  const usedSet = new Set(usedIds);
  const isExternal = owner.id === EXTERNAL_OWNER_ID;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 10,
        border: `1.5px solid color-mix(in srgb, ${accentColor} 20%, transparent)`,
        background: `color-mix(in srgb, ${accentColor} 4%, var(--t-paper))`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: accentColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <User size={13} color="#fff" />
        </div>
        <select
          style={{ ...input, flex: 2 }}
          value={owner.id}
          onChange={(e) =>
            onChange(
              e.target.value === EXTERNAL_OWNER_ID
                ? { id: EXTERNAL_OWNER_ID, name: owner.name || "", sharePct: owner.sharePct }
                : { id: e.target.value, sharePct: owner.sharePct }
            )
          }
        >
          {familyProfiles
            .filter((p) => p.id === owner.id || !usedSet.has(p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {formatProfileOption(p)}
              </option>
            ))}
          <option value={EXTERNAL_OWNER_ID}>+ Someone else (not in Family Profiles)</option>
        </select>
        <input
          style={{ ...input, flex: 1, textAlign: "right" }}
          type="number"
          min={0}
          max={100}
          value={owner.sharePct}
          onChange={(e) => onChange({ ...owner, sharePct: e.target.value })}
        />
        <span style={{ fontSize: 12, fontWeight: 700, color: accentColor, width: 14 }}>%</span>
        {canDelete && (
          <button
            onClick={onDelete}
            aria-label={`Remove owner ${idx + 1}`}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: THEME.rust,
              padding: 6,
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {isExternal && (
        <input
          style={{ ...input, marginLeft: 34 }}
          value={owner.name || ""}
          onChange={(e) => onChange({ ...owner, name: e.target.value })}
          placeholder="Name, e.g. Suresh Mohta (Father)"
        />
      )}
    </div>
  );
}

// ─── Demand Modal ─────────────────────────────────────────────────────────────

function DemandModal({ existing, propertyName, onClose, onSave, saving = false }: any) {
  const isEdit = !!existing;
  const [f, setF] = useState(
    existing || {
      demandDate: today(),
      dueDate: "",
      milestone: "",
      amount: "",
      gstAmount: "",
      totalAmount: "",
      status: "pending",
      notes: "",
    }
  );
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const computedTotal = (Number(f.amount) || 0) + (Number(f.gstAmount) || 0);

  return (
    <Modal
      title={isEdit ? "Edit Demand Letter" : `Add Demand — ${propertyName}`}
      onClose={onClose}
      maxWidth={520}
    >
      <div className="form-grid-2" style={{ gap: 12 }}>
        <Field label="Demand Date">
          <input
            style={input}
            type="date"
            value={f.demandDate}
            onChange={(e) => set("demandDate", e.target.value)}
          />
        </Field>
        <Field label="Due Date">
          <input
            style={input}
            type="date"
            value={f.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
          />
        </Field>
        <Field label="Milestone / Description" style={{ gridColumn: "1 / -1" }}>
          <input
            style={input}
            value={f.milestone}
            onChange={(e) => set("milestone", e.target.value)}
            placeholder="e.g. Plinth Work Completion"
          />
        </Field>
        <Field label="Demand Amount (₹)">
          <input
            style={input}
            type="number"
            value={f.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="GST Amount (₹)">
          <input
            style={input}
            type="number"
            value={f.gstAmount}
            onChange={(e) => set("gstAmount", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Total Amount (₹)">
          <input
            style={{
              ...input,
              background: "var(--surface-1)",
              color: THEME.accent,
              fontWeight: 700,
            }}
            type="number"
            value={f.totalAmount || computedTotal || ""}
            onChange={(e) => set("totalAmount", e.target.value)}
            placeholder={computedTotal ? String(computedTotal) : "Auto-calculated"}
          />
        </Field>
        <Field label="Status">
          <select style={input} value={f.status} onChange={(e) => set("status", e.target.value)}>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="overdue">Overdue</option>
          </select>
        </Field>
        <Field label="Notes" style={{ gridColumn: "1 / -1" }}>
          <textarea
            style={{ ...input, minHeight: 60, resize: "vertical" }}
            value={f.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
      </div>
      <ModalActions
        onSave={() => onSave({ ...f, totalAmount: f.totalAmount || computedTotal || f.amount })}
        onClose={onClose}
        saveLabel={isEdit ? "Save Changes" : "Add Demand"}
        disabled={saving}
        loading={saving}
      />
    </Modal>
  );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────

function PaymentModal({ existing, propertyName, demands, onClose, onSave, saving = false }: any) {
  const { privacyMode } = usePrivacy();
  const isEdit = !!existing;
  const [f, setF] = useState(
    existing || {
      paymentDate: today(),
      amount: "",
      paymentMode: "NEFT",
      referenceNumber: "",
      demandId: "",
      note: "",
    }
  );
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  return (
    <Modal
      title={isEdit ? "Edit Payment" : `Record Payment — ${propertyName}`}
      onClose={onClose}
      maxWidth={520}
    >
      <div className="form-grid-2" style={{ gap: 12 }}>
        <Field label="Payment Date">
          <input
            style={input}
            type="date"
            value={f.paymentDate}
            onChange={(e) => set("paymentDate", e.target.value)}
          />
        </Field>
        <Field label="Amount (₹)">
          <input
            style={input}
            type="number"
            value={f.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label="Payment Mode">
          <select
            style={input}
            value={f.paymentMode}
            onChange={(e) => set("paymentMode", e.target.value)}
          >
            <option value="NEFT">NEFT</option>
            <option value="RTGS">RTGS</option>
            <option value="UPI">UPI</option>
            <option value="Cheque">Cheque</option>
            <option value="DD">Demand Draft</option>
            <option value="Cash">Cash</option>
            <option value="Other">Other</option>
          </select>
        </Field>
        <Field label="Reference / UTR Number">
          <input
            style={input}
            value={f.referenceNumber}
            onChange={(e) => set("referenceNumber", e.target.value)}
            placeholder="UTR / Cheque no."
          />
        </Field>
        {demands.length > 0 && (
          <Field label="Link to Demand Letter (optional)" style={{ gridColumn: "1 / -1" }}>
            <select
              style={input}
              value={f.demandId}
              onChange={(e) => set("demandId", e.target.value)}
            >
              <option value="">— Not linked —</option>
              {demands.map((d: any) => (
                <option key={d.id} value={d.id}>
                  {d.milestone || "Demand"} — {fmtDate(d.demandDate)} —{" "}
                  {privacyMode ? "••••" : fmtINRFull(d.totalAmount || d.amount || 0)}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Note" style={{ gridColumn: "1 / -1" }}>
          <textarea
            style={{ ...input, minHeight: 60, resize: "vertical" }}
            value={f.note}
            onChange={(e) => set("note", e.target.value)}
          />
        </Field>
      </div>
      <ModalActions
        onSave={() => f.amount && onSave(f)}
        onClose={onClose}
        saveLabel={isEdit ? "Save Changes" : "Record Payment"}
        disabled={saving}
        loading={saving}
      />
    </Modal>
  );
}

// ─── Property Card ────────────────────────────────────────────────────────────

function PropertyCard({
  property,
  demands,
  payments,
  onEditProperty,
  onDeleteProperty,
  onAddDemand,
  onEditDemand,
  onDeleteDemand,
  onAddPayment,
  onEditPayment,
  onDeletePayment,
}: any) {
  const [expanded, setExpanded] = useState(false);
  const { familyProfiles } = useMasterData();

  const owners: any[] =
    property.owners?.length > 0 ? property.owners : [{ id: property.owner || "self", sharePct: 100 }];
  const isJoint = owners.length > 1;
  const ownerName = (o: any) =>
    o.id === EXTERNAL_OWNER_ID
      ? o.name || "Other"
      : familyProfiles.find((p: any) => p.id === o.id)?.name || o.id;

  const totalDemanded = demands.reduce(
    (s: number, d: any) => s + Number(d.totalAmount || d.amount || 0),
    0
  );
  const totalPaid = payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const outstanding = Math.max(0, totalDemanded - totalPaid);
  const paidPct = totalDemanded > 0 ? Math.min(100, (totalPaid / totalDemanded) * 100) : 0;
  const totalCost =
    Number(property.agreementValue || 0) +
    Number(property.stampDuty || 0) +
    Number(property.tdsAmount || 0);
  const agreementValueBalance = Math.max(
    0,
    Number(property.agreementValue || 0) - Number(property.agreementValuePaid || 0)
  );
  const stampDutyBalance = Math.max(
    0,
    Number(property.stampDuty || 0) - Number(property.stampDutyPaid || 0)
  );
  const tdsBalance = Math.max(0, Number(property.tdsAmount || 0) - Number(property.tdsValue || 0));
  const statusHex = STATUS_HEX[property.status] || THEME.accent;
  const isSold = property.status === "sold";
  const saleProceeds = isSold
    ? Number(property.salePrice || 0) -
      Number(property.saleStampDuty || 0) -
      Number(property.saleTds || 0)
    : 0;
  const gain = isSold ? saleProceeds - totalCost : Number(property.marketValue || 0) - totalCost;
  const gainPct = totalCost > 0 ? (gain / totalCost) * 100 : 0;
  // Simple annualised return using holding period (purchase → sale, or purchase →
  // today for a still-held property) — plain CAGR, not XIRR, since this is a single
  // lump-sum cost basis vs. a single current/exit value (no intermediate cashflows
  // to model, unlike the demand/payment ledger which is a cost timeline, not a return one).
  const holdingYears = property.purchaseDate
    ? Math.max(
        0,
        (new Date((isSold && property.saleDate ? property.saleDate : today()) + "T00:00:00").getTime() -
          new Date(property.purchaseDate + "T00:00:00").getTime()) /
          (365.25 * 24 * 3600 * 1000)
      )
    : 0;
  const cagr =
    holdingYears >= 0.5 && totalCost > 0 && gain !== 0
      ? (Math.pow((totalCost + gain) / totalCost, 1 / holdingYears) - 1) * 100
      : null;

  // All table cell borders use CSS variable directly (valid CSS, not "var(...)44" which is invalid)
  const divider = "1px solid var(--t-line)";
  const th: React.CSSProperties = {
    padding: "8px 10px",
    fontSize: 11,
    fontWeight: 700,
    color: THEME.muted,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    textAlign: "left" as const,
    borderBottom: divider,
    whiteSpace: "nowrap" as const,
  };
  const td: React.CSSProperties = {
    padding: "8px 10px",
    fontSize: 12,
    fontWeight: 500,
    color: THEME.ink,
    borderBottom: divider,
    verticalAlign: "middle" as const,
  };

  return (
    <div style={cardShell}>
      {/* Header — premium glassmorphic */}
      <div
        style={{
          padding: "20px 24px",
          borderBottom: divider,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 14,
          background: `linear-gradient(135deg, color-mix(in srgb, ${statusHex} 6%, transparent) 0%, transparent 60%)`,
        }}
      >
        {/* Builder logo */}
        {property.developerName && (
          <div style={{ flexShrink: 0, marginTop: 2 }}>
            <BuilderLogo name={property.developerName} size={50} borderRadius={14} />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            <span
              style={{ fontSize: 18, fontWeight: 900, color: THEME.ink, letterSpacing: "-0.02em" }}
            >
              {property.name}
            </span>
            {/* Status badge */}
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: statusHex,
                background: `color-mix(in srgb, ${statusHex} 18%, transparent)`,
                border: `1.5px solid color-mix(in srgb, ${statusHex} 30%, transparent)`,
                padding: "3px 10px",
                borderRadius: 20,
                textTransform: "uppercase" as const,
                letterSpacing: "0.06em",
              }}
            >
              {property.status === "under-construction" ? "Under Const." : property.status}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: THEME.muted,
                background: "var(--surface-1)",
                border: `1.5px solid ${THEME.line}`,
                padding: "3px 10px",
                borderRadius: 20,
              }}
            >
              {TYPE_LABELS[property.type] || property.type}
            </span>
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            {property.location && (
              <span
                style={{
                  fontSize: 12,
                  color: THEME.muted,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <MapPin size={12} /> {property.location}
              </span>
            )}
            {property.developerName && (
              <span
                style={{
                  fontSize: 12,
                  color: THEME.muted,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Building2 size={12} /> {property.developerName}
              </span>
            )}
            {property.purchaseDate && (
              <span
                style={{
                  fontSize: 12,
                  color: THEME.muted,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Calendar size={12} /> {fmtDate(property.purchaseDate)}
              </span>
            )}
            {property.areaSqft && (
              <span style={{ fontSize: 12, color: THEME.muted }}>
                {Number(property.areaSqft).toLocaleString("en-IN")} sq ft
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            {owners.map((o, i) => {
              const accentColor = [THEME.accent, THEME.sage, THEME.gold, THEME.rust, THEME.violet][
                i % 5
              ];
              return (
                <span
                  key={o.id + i}
                  title={isJoint ? "Co-owner" : "Owner"}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: accentColor,
                    background: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
                    border: `1.5px solid color-mix(in srgb, ${accentColor} 25%, transparent)`,
                    padding: "3px 9px",
                    borderRadius: 20,
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <User size={11} /> {ownerName(o)}
                  {isJoint ? ` · ${Number(o.sharePct || 0)}%` : ""}
                </span>
              );
            })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button
            onClick={() => onEditProperty(property)}
            aria-label={`Edit ${property.name}`}
            title="Edit"
            style={{
              background: "color-mix(in srgb, var(--t-muted) 8%, transparent)",
              border: `1.5px solid ${THEME.line}`,
              cursor: "pointer",
              color: THEME.muted,
              padding: "6px 8px",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDeleteProperty(property.id)}
            aria-label={`Delete ${property.name}`}
            title="Delete"
            style={{
              background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
              border: `1.5px solid color-mix(in srgb, ${THEME.rust} 16%, transparent)`,
              cursor: "pointer",
              color: THEME.rust,
              padding: "6px 8px",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
            }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Financials grid — premium tinted cells. Auto-fit so it reflows to 2
          or 1 columns on narrower viewports instead of squeezing 3 fixed
          columns of INR figures into a phone-width card. Each tile carries
          its own border/radius rather than relying on row/column-index
          divider math, so the reflow doesn't leave stray border edges. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 1,
          background: "var(--t-line)",
          borderBottom: divider,
        }}
      >
        {(() => {
          const tiles = [
            { label: "Agreement Value", value: property.agreementValue, color: THEME.accent },
            { label: "Agreement Value Paid", value: property.agreementValuePaid, color: THEME.cyan },
            {
              label: "Agreement Value Balance",
              value: agreementValueBalance,
              color: agreementValueBalance > 0 ? THEME.rust : THEME.sage,
            },
            { label: "Stamp Duty", value: property.stampDuty, color: THEME.gold },
            { label: "Stamp Duty Paid", value: property.stampDutyPaid, color: THEME.cyan },
            {
              label: "Stamp Duty Balance",
              value: stampDutyBalance,
              color: stampDutyBalance > 0 ? THEME.rust : THEME.sage,
            },
            { label: "TDS Amount", value: property.tdsAmount, color: THEME.pink },
            { label: "TDS Paid", value: property.tdsValue, color: THEME.violet },
            { label: "TDS Balance", value: tdsBalance, color: tdsBalance > 0 ? THEME.rust : THEME.sage },
            { label: "Market Value", value: property.marketValue, color: THEME.sage },
          ];
          return tiles.map(({ label, value, color }) => (
          <div
            key={label}
            style={{
              padding: "14px 18px",
              background: value
                ? `linear-gradient(135deg, color-mix(in srgb, ${color} 5%, var(--t-card-bg)) 0%, var(--t-card-bg) 100%)`
                : "var(--t-card-bg)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: value ? color : THEME.muted,
                  flexShrink: 0,
                }}
              />
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: THEME.muted,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.06em",
                }}
              >
                {label}
              </div>
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 900,
                color: value ? color : THEME.muted,
                letterSpacing: "-0.02em",
              }}
            >
              {value ? <Money value={Number(value)} variant="full" /> : "—"}
            </div>
          </div>
          ));
        })()}
      </div>

      {/* Gain/Loss — premium pill */}
      {((isSold && Number(property.salePrice || 0) > 0) || (!isSold && property.marketValue)) &&
        totalCost > 0 && (
          <div
            style={{
              padding: "10px 24px",
              borderBottom: divider,
              background:
                gain >= 0
                  ? `linear-gradient(90deg, color-mix(in srgb, ${THEME.sage} 7%, transparent) 0%, transparent 100%)`
                  : `linear-gradient(90deg, color-mix(in srgb, ${THEME.rust} 7%, transparent) 0%, transparent 100%)`,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                color: gain >= 0 ? THEME.sage : THEME.rust,
                background:
                  gain >= 0
                    ? `color-mix(in srgb, ${THEME.sage} 12%, transparent)`
                    : `color-mix(in srgb, ${THEME.rust} 12%, transparent)`,
                border: `1.5px solid ${gain >= 0 ? `color-mix(in srgb, ${THEME.sage} 25%, transparent)` : `color-mix(in srgb, ${THEME.rust} 25%, transparent)`}`,
                padding: "3px 10px",
                borderRadius: 20,
                letterSpacing: "0.04em",
              }}
            >
              {gain >= 0 ? "▲" : "▼"} {isSold ? "Realised" : "Unrealised"}{" "}
              {gain >= 0 ? "Gain" : "Loss"}: <Money value={Math.abs(gain)} variant="full" /> (
              {gain >= 0 ? "+" : "−"}
              {Math.abs(gainPct).toFixed(1)}%)
            </span>
            <span style={{ fontSize: 11, color: THEME.muted }}>
              Cost: <Money value={totalCost} variant="full" />
              {isSold ? (
                <>
                  {" "}
                  · Net sale: <Money value={saleProceeds} variant="full" />
                </>
              ) : (
                ""
              )}
              {cagr !== null ? ` · ${cagr >= 0 ? "+" : "−"}${Math.abs(cagr).toFixed(1)}% CAGR` : ""}
            </span>
          </div>
        )}

      {/* Payment progress — premium gradient track */}
      {totalDemanded > 0 && (
        <div style={{ padding: "14px 24px", borderBottom: divider }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: THEME.muted,
                textTransform: "uppercase" as const,
                letterSpacing: "0.06em",
              }}
            >
              Payment Progress — {demands.length} demand{demands.length !== 1 ? "s" : ""}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: THEME.sage }}>
                <Money value={totalPaid} variant="full" />
              </span>
              <span style={{ fontSize: 11, color: THEME.muted }}>
                of <Money value={totalDemanded} variant="full" />
              </span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: paidPct >= 100 ? THEME.sage : THEME.accent,
                  background:
                    paidPct >= 100
                      ? `color-mix(in srgb, ${THEME.sage} 12%, transparent)`
                      : `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                  padding: "2px 8px",
                  borderRadius: 12,
                }}
              >
                {paidPct.toFixed(0)}%
              </span>
            </div>
          </div>
          <div
            style={{
              height: 7,
              background: "var(--surface-1)",
              borderRadius: 4,
              overflow: "hidden",
              boxShadow: "inset 0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${paidPct}%`,
                background:
                  paidPct >= 100
                    ? `linear-gradient(90deg, ${THEME.sage}, color-mix(in srgb, ${THEME.sage} 70%, white))`
                    : `linear-gradient(90deg, ${THEME.accent}, color-mix(in srgb, ${THEME.accent} 70%, white))`,
                borderRadius: 4,
                transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)",
              }}
            />
          </div>
          {outstanding > 0 && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: THEME.rust,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  background: THEME.rust,
                  flexShrink: 0,
                }}
              />
              Outstanding: <Money value={outstanding} variant="full" />
            </div>
          )}
        </div>
      )}

      {/* Expand / Collapse toggle — premium */}
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        style={{
          width: "100%",
          padding: "12px 24px",
          background: expanded ? `color-mix(in srgb, ${THEME.accent} 2%, transparent)` : "transparent",
          border: "none",
          borderBottom: expanded ? divider : "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 12,
          fontWeight: 700,
          color: THEME.accent,
          transition: "background 0.2s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              background: demands.length > 0 ? THEME.accent : THEME.muted,
            }}
          />
          <span>
            {demands.length} demand letter{demands.length !== 1 ? "s" : ""} · {payments.length}{" "}
            payment{payments.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            background: `color-mix(in srgb, ${THEME.accent} 7%, transparent)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </div>
      </button>

      {expanded && (
        <div>
          {/* Demand Letters */}
          <div style={{ padding: "14px 20px 12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <FileText size={13} color={THEME.accent} />
                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                  Demand Letters
                </span>
              </div>
              <Button
                variant="accent"
                icon={<Plus size={12} />}
                onClick={() => onAddDemand(property)}
              >
                Add Demand
              </Button>
            </div>
            {demands.length === 0 ? (
              <div
                style={{ fontSize: 12, color: THEME.muted, padding: "8px 0", fontStyle: "italic" }}
              >
                No demand letters recorded yet.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--surface-1)" }}>
                      {[
                        "Date",
                        "Due Date",
                        "Milestone",
                        "Amount",
                        "GST",
                        "Total",
                        "Status",
                        "",
                      ].map((h) => (
                        <th key={h} style={th}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {demands
                      .slice()
                      .sort((a: any, b: any) => (a.demandDate > b.demandDate ? -1 : 1))
                      .map((d: any) => {
                        const dHex = DEMAND_HEX[d.status] || THEME.muted;
                        return (
                          <tr key={d.id} style={{ background: "var(--surface-0)" }}>
                            <td style={td}>{fmtDate(d.demandDate)}</td>
                            <td style={td}>{fmtDate(d.dueDate)}</td>
                            <td style={{ ...td, fontWeight: 600 }}>{d.milestone || "—"}</td>
                            <td style={{ ...td, textAlign: "right" }}>
                              {d.amount ? <Money value={Number(d.amount)} variant="full" /> : "—"}
                            </td>
                            <td style={{ ...td, textAlign: "right" }}>
                              {d.gstAmount ? <Money value={Number(d.gstAmount)} variant="full" /> : "—"}
                            </td>
                            <td
                              style={{
                                ...td,
                                textAlign: "right",
                                fontWeight: 700,
                                color: THEME.accent,
                              }}
                            >
                              {d.totalAmount ? (
                                <Money value={Number(d.totalAmount)} variant="full" />
                              ) : (
                                "—"
                              )}
                            </td>
                            <td style={td}>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: dHex,
                                  background: `color-mix(in srgb, ${dHex} 22%, transparent)`,
                                  padding: "2px 8px",
                                  borderRadius: 20,
                                  textTransform: "capitalize",
                                }}
                              >
                                {d.status}
                              </span>
                            </td>
                            <td style={{ ...td, whiteSpace: "nowrap" }}>
                              <button
                                onClick={() => onEditDemand(d)}
                                aria-label={`Edit demand letter dated ${fmtDate(d.demandDate)}`}
                                title="Edit"
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: THEME.muted,
                                  padding: 6,
                                }}
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => onDeleteDemand(d.id)}
                                aria-label={`Delete demand letter dated ${fmtDate(d.demandDate)}`}
                                title="Delete"
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: THEME.rust,
                                  padding: 6,
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Payments */}
          <div style={{ padding: "14px 20px 16px", borderTop: divider }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Receipt size={13} color={THEME.sage} />
                <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>Payments</span>
              </div>
              <Button
                variant="accent"
                icon={<Plus size={12} />}
                onClick={() => onAddPayment(property)}
              >
                Record Payment
              </Button>
            </div>
            {payments.length === 0 ? (
              <div
                style={{ fontSize: 12, color: THEME.muted, padding: "8px 0", fontStyle: "italic" }}
              >
                No payments recorded yet.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--surface-1)" }}>
                      {["Date", "Amount", "Mode", "Reference", "Linked Demand", "Note", ""].map(
                        (h) => (
                          <th key={h} style={th}>
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {payments
                      .slice()
                      .sort((a: any, b: any) => (a.paymentDate > b.paymentDate ? -1 : 1))
                      .map((p: any) => {
                        const linked = demands.find((d: any) => d.id === p.demandId);
                        return (
                          <tr key={p.id} style={{ background: "var(--surface-0)" }}>
                            <td style={td}>{fmtDate(p.paymentDate)}</td>
                            <td
                              style={{
                                ...td,
                                textAlign: "right",
                                fontWeight: 800,
                                color: THEME.sage,
                              }}
                            >
                              +<Money value={Number(p.amount)} variant="full" />
                            </td>
                            <td style={td}>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: THEME.accent,
                                  background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
                                  padding: "2px 8px",
                                  borderRadius: 20,
                                }}
                              >
                                {p.paymentMode}
                              </span>
                            </td>
                            <td style={{ ...td, fontFamily: "monospace", fontSize: 11 }}>
                              {p.referenceNumber || "—"}
                            </td>
                            <td style={{ ...td, fontSize: 11, color: THEME.muted }}>
                              {linked ? linked.milestone || fmtDate(linked.demandDate) : "—"}
                            </td>
                            <td style={{ ...td, color: THEME.muted }}>{p.note || "—"}</td>
                            <td style={{ ...td, whiteSpace: "nowrap" }}>
                              <button
                                onClick={() => onEditPayment(p)}
                                aria-label={`Edit payment dated ${fmtDate(p.paymentDate)}`}
                                title="Edit"
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: THEME.muted,
                                  padding: 6,
                                }}
                              >
                                <Pencil size={12} />
                              </button>
                              <button
                                onClick={() => onDeletePayment(p.id)}
                                aria-label={`Delete payment dated ${fmtDate(p.paymentDate)}`}
                                title="Delete"
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: THEME.rust,
                                  padding: 6,
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: `color-mix(in srgb, ${THEME.sage} 6%, transparent)` }}>
                      <td
                        style={{
                          ...td,
                          fontWeight: 800,
                          color: THEME.muted,
                          fontSize: 11,
                          textTransform: "uppercase",
                        }}
                      >
                        Total
                      </td>
                      <td
                        style={{
                          ...td,
                          textAlign: "right",
                          fontWeight: 900,
                          color: THEME.sage,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        <Money value={totalPaid} variant="full" />
                      </td>
                      <td colSpan={5} style={{ borderBottom: divider }} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

interface RealEstateTabProps {
  state: any;
  addItem: (key: string, data: any) => void;
  removeItem: (key: string, id: string) => void;
  updateItem: (key: string, id: string, data: any) => void;
  activeProfile?: string;
  showToast?: (message: string, type?: string) => void;
}

export function RealEstateTab({
  state,
  addItem,
  removeItem,
  updateItem,
  activeProfile,
  showToast,
}: RealEstateTabProps) {
  const properties: any[] = state.realEstateProperties || [];
  const demands: any[] = state.realEstateDemands || [];
  const payments: any[] = state.realEstatePayments || [];

  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [editProperty, setEditProperty] = useState<any>(null);
  const [demandForProperty, setDemandForProperty] = useState<any>(null);
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(
    null
  );
  const [editDemand, setEditDemand] = useState<any>(null);
  const [paymentForProperty, setPaymentForProperty] = useState<any>(null);
  const [editPayment, setEditPayment] = useState<any>(null);
  // "share" (default) matches Dashboard/Net Worth — scales by ownership %.
  // "full" shows each property's entire value, useful when managing the
  // property itself rather than your personal net-worth stake in it.
  const [valueView, setValueView] = useState<"share" | "full">("share");

  const stats = useMemo(() => {
    const activeProperties = properties.filter((p) => p.status !== "sold");
    // Scale each property's contribution by this household's (or this single
    // profile's) ownership share — a jointly-owned property with an external
    // co-owner, or one owned 100% by a single family member, must not count
    // at its full value here when the canonical net-worth calc (useMetrics.ts
    // / netWorthAsOf.ts) only counts the tracked share. See realEstateTrackedShare.
    // Toggled off via valueView === "full" to show whole-property totals instead.
    const shareOf = (p: any) =>
      valueView === "full"
        ? 1
        : activeProfile && activeProfile !== "all"
          ? realEstateShareForOwner(p, activeProfile)
          : realEstateTrackedShare(p);
    const portfolioValue = activeProperties.reduce(
      (s, p) => s + Number(p.marketValue || p.agreementValue || 0) * shareOf(p),
      0
    );
    const totalInvested = activeProperties.reduce(
      (s, p) =>
        s +
        (Number(p.agreementValue || 0) + Number(p.stampDuty || 0) + Number(p.tdsAmount || 0)) *
          shareOf(p),
      0
    );
    // Demand letters and payments are billed against the full property (they aren't
    // pre-split per owner), so — unlike portfolioValue/totalInvested above, which read
    // a per-property field — these need an explicit per-item share lookup before summing.
    // Previously these two stats ignored the ownership share (and, before the upstream
    // filteredState fix, could include another family member's properties entirely),
    // showing the full 100% figure regardless of the "My Share" toggle or active profile.
    const propById = new Map(properties.map((p) => [p.id, p]));
    const shareOfItem = (item: any) => {
      const prop = propById.get(item.propertyId);
      return prop ? shareOf(prop) : 0;
    };
    const ucIds = new Set(
      properties.filter((p) => p.status === "under-construction").map((p) => p.id)
    );
    const totalDemanded = demands
      .filter((d) => ucIds.has(d.propertyId))
      .reduce((s, d) => s + Number(d.totalAmount || d.amount || 0) * shareOfItem(d), 0);
    const totalPaidUC = payments
      .filter((p) => ucIds.has(p.propertyId))
      .reduce((s, p) => s + Number(p.amount || 0) * shareOfItem(p), 0);
    const outstanding = Math.max(0, totalDemanded - totalPaidUC);
    const allPaid = payments.reduce((s, p) => s + Number(p.amount || 0) * shareOfItem(p), 0);
    // Same "current value − cost" arithmetic already used per-card (see PropertyCard's
    // `gain`), just aggregated across the portfolio — this is the number the whole
    // section answers, so it earns the hero-card slot below.
    const appreciation = portfolioValue - totalInvested;
    const appreciationPct = totalInvested > 0 ? (appreciation / totalInvested) * 100 : 0;
    return {
      portfolioValue,
      totalInvested,
      totalPaid: allPaid,
      outstanding,
      appreciation,
      appreciationPct,
    };
  }, [properties, demands, payments, activeProfile, valueView]);

  const { run: handleSaveProperty, loading: savingProperty } = useAsyncAction(
    async (data: any) => {
      if (editProperty) {
        await updateItem("realEstateProperties", editProperty.id, data);
      } else {
        await addItem("realEstateProperties", data);
      }
    },
    {
      onSuccess: () => { setEditProperty(null); setShowPropertyModal(false); },
      onError: (e: any) => showToast?.(`Failed to save property: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: handleSaveDemand, loading: savingDemand } = useAsyncAction(
    async (data: any) => {
      if (editDemand) {
        await updateItem("realEstateDemands", editDemand.id, data);
      } else {
        await addItem("realEstateDemands", { ...data, propertyId: demandForProperty.id });
      }
    },
    {
      onSuccess: () => { setEditDemand(null); setDemandForProperty(null); },
      onError: (e: any) => showToast?.(`Failed to save demand letter: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: handleSavePayment, loading: savingPayment } = useAsyncAction(
    async (data: any) => {
      if (editPayment) {
        await updateItem("realEstatePayments", editPayment.id, data);
      } else {
        await addItem("realEstatePayments", { ...data, propertyId: paymentForProperty.id });
      }
    },
    {
      onSuccess: () => { setEditPayment(null); setPaymentForProperty(null); },
      onError: (e: any) => showToast?.(`Failed to save payment: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: deleteProperty, loading: deletingProperty } = useAsyncAction(
    async (id: string) => { await removeItem("realEstateProperties", id); },
    { onError: (e: any) => showToast?.(`Failed to delete property: ${e?.message || "Unknown error"}`, "error") }
  );
  const { run: deleteDemand, loading: deletingDemand } = useAsyncAction(
    async (id: string) => { await removeItem("realEstateDemands", id); },
    { onError: (e: any) => showToast?.(`Failed to delete demand letter: ${e?.message || "Unknown error"}`, "error") }
  );
  const { run: deletePayment, loading: deletingPayment } = useAsyncAction(
    async (id: string) => { await removeItem("realEstatePayments", id); },
    { onError: (e: any) => showToast?.(`Failed to delete payment: ${e?.message || "Unknown error"}`, "error") }
  );

  return (
    <div>
      {/* Header — standard SectionTitle (matches the rest of the app; see
          BanksTab/RentalTab/GoldSGBTab etc. — a per-tab gradient icon badge next
          to the title was a one-off pattern that had only crept into 4 of the
          app's 54 tabs, not an established standard, so it's dropped here). */}
      <SectionTitle
        sub={`${properties.length} propert${properties.length !== 1 ? "ies" : "y"} · Track purchases, demand letters & payments`}
        rightElement={
          <Button
            variant="accent"
            icon={<Plus size={14} />}
            onClick={() => setShowPropertyModal(true)}
          >
            Add Property
          </Button>
        }
      >
        Real Estate
      </SectionTitle>

      {/* Stats — Portfolio Value + Appreciation is the number this section answers,
          so it gets the hero-card slot (matches FIRE Number / Goals Overall Progress). */}
      {properties.length > 0 && (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              {(
                [
                  { key: "share", label: "My Share" },
                  { key: "full", label: "Full Value" },
                ] as { key: "share" | "full"; label: string }[]
              ).map((opt) => {
                const active = valueView === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setValueView(opt.key)}
                    className="card-lift"
                    aria-pressed={active}
                    title={
                      opt.key === "share"
                        ? "Shows only your ownership % of each property (matches Dashboard/Net Worth)"
                        : "Shows each property's full value regardless of ownership split"
                    }
                    style={{
                      padding: "5px 12px",
                      borderRadius: 16,
                      background: active ? THEME.accent : "var(--surface-0)",
                      border: `1px solid ${active ? THEME.accent : THEME.line}`,
                      color: active ? "#fff" : THEME.ink,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <Card
            variant="hero"
            style={{
              marginBottom: 20,
              padding: "clamp(24px, 4vw, 36px)",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 10,
                fontWeight: 800,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              <Home size={13} /> Portfolio Value
            </div>
            <div
              style={{
                fontSize: "clamp(32px, 5vw, 52px)",
                fontWeight: 900,
                color: "#fff",
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <Money value={stats.portfolioValue} variant="full" />
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>
              {stats.appreciation >= 0 ? "Up " : "Down "}
              <Money value={Math.abs(stats.appreciation)} variant="full" /> (
              {stats.appreciation >= 0 ? "+" : "−"}
              {Math.abs(stats.appreciationPct).toFixed(1)}%) against{" "}
              <Money value={stats.totalInvested} variant="full" /> invested (agreement + stamp + TDS)
            </div>
          </Card>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
              marginBottom: 28,
            }}
          >
            <StatCard
              label="Total Invested"
              value={<Money value={stats.totalInvested} variant="full" />}
              numericValue={stats.totalInvested}
              formatValue={fmtINRFull}
              sub="Agreement + Stamp + TDS"
              icon={<IndianRupee />}
              color={THEME.accent}
            />
            <StatCard
              label="Total Paid"
              value={<Money value={stats.totalPaid} variant="full" />}
              numericValue={stats.totalPaid}
              formatValue={fmtINRFull}
              sub="All payments"
              icon={<CheckCircle />}
              color={THEME.accent}
            />
            <StatCard
              label="Outstanding"
              value={<Money value={stats.outstanding} variant="full" />}
              numericValue={stats.outstanding}
              formatValue={fmtINRFull}
              sub="Demands pending"
              icon={<Clock />}
              color={stats.outstanding > 0 ? THEME.rust : THEME.muted}
            />
            <StatCard
              label="Appreciation"
              value={
                <>
                  {stats.appreciation >= 0 ? "+" : "−"}
                  <Money value={Math.abs(stats.appreciation)} variant="full" />
                </>
              }
              numericValue={stats.appreciation}
              formatValue={(n) => `${n >= 0 ? "+" : "−"}${fmtINRFull(Math.abs(n))}`}
              sub={`${stats.appreciation >= 0 ? "+" : "−"}${Math.abs(stats.appreciationPct).toFixed(1)}% vs. invested`}
              icon={<TrendingUp />}
              color={stats.appreciation >= 0 ? THEME.sage : THEME.rust}
            />
          </div>
        </>
      )}

      {/* Properties */}
      {properties.length === 0 ? (
        <EmptyState
          icon={Home}
          gradient={`linear-gradient(135deg, ${THEME.accent}, ${THEME.sage})`}
          dotColor={THEME.accent}
          title="No Properties Yet"
          description="Track all your real estate investments — purchases, demand letters, and payments in one place."
          pills={[
            "Agreement Value",
            "Stamp Duty & TDS",
            "Demand Letters",
            "Payment History",
            "Market Value",
          ]}
          buttonLabel="Add First Property"
          onAdd={() => setShowPropertyModal(true)}
        />
      ) : (
        properties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            demands={demands.filter((d) => d.propertyId === property.id)}
            payments={payments.filter((p) => p.propertyId === property.id)}
            onEditProperty={(p: any) => setEditProperty(p)}
            onDeleteProperty={(id: string) => {
              setConfirmAction({
                message:
                  "Delete this property? Its demand letters and payment records will be deleted too. This cannot be undone.",
                onConfirm: () => deleteProperty(id),
              });
            }}
            onAddDemand={(p: any) => setDemandForProperty(p)}
            onEditDemand={(d: any) => setEditDemand(d)}
            onDeleteDemand={(id: string) => {
              setConfirmAction({
                message: "Delete this demand letter? This cannot be undone.",
                onConfirm: () => deleteDemand(id),
              });
            }}
            onAddPayment={(p: any) => setPaymentForProperty(p)}
            onEditPayment={(p: any) => setEditPayment(p)}
            onDeletePayment={(id: string) => {
              setConfirmAction({
                message: "Delete this payment record? This cannot be undone.",
                onConfirm: () => deletePayment(id),
              });
            }}
          />
        ))
      )}

      {/* Modals */}
      {(showPropertyModal || editProperty) && (
        <PropertyModal
          existing={editProperty}
          onClose={() => {
            setShowPropertyModal(false);
            setEditProperty(null);
          }}
          onSave={handleSaveProperty}
          saving={savingProperty}
        />
      )}
      {(demandForProperty || editDemand) && (
        <DemandModal
          existing={editDemand}
          propertyName={
            editDemand
              ? properties.find((p) => p.id === editDemand.propertyId)?.name || "Property"
              : demandForProperty?.name || "Property"
          }
          onClose={() => {
            setDemandForProperty(null);
            setEditDemand(null);
          }}
          onSave={handleSaveDemand}
          saving={savingDemand}
        />
      )}
      {(paymentForProperty || editPayment) && (
        <PaymentModal
          existing={editPayment}
          propertyName={
            editPayment
              ? properties.find((p) => p.id === editPayment.propertyId)?.name || "Property"
              : paymentForProperty?.name || "Property"
          }
          demands={
            editPayment
              ? demands.filter((d) => d.propertyId === editPayment.propertyId)
              : demands.filter((d) => d.propertyId === paymentForProperty?.id)
          }
          onClose={() => {
            setPaymentForProperty(null);
            setEditPayment(null);
          }}
          onSave={handleSavePayment}
          saving={savingPayment}
        />
      )}
      {confirmAction && (
        <ConfirmDialog
          message={confirmAction.message}
          onConfirm={() => {
            confirmAction.onConfirm();
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
