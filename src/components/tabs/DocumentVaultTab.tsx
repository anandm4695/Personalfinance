// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  Search,
  Grid,
  List,
  AlertTriangle,
  Clock,
  Folder,
  FolderOpen,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Link2,
  Calendar,
  Hash,
  Building,
  SortAsc,
  SortDesc,
  Fingerprint,
  Landmark,
  ShieldCheck,
  Home,
  Car,
  Scale,
  X,
  Copy,
  Check,
  Upload,
  Paperclip,
  Download,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { uid, today as todayFn, addMonthsToDateStr } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field, Input, Select } from "../ui/Form";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { Prv } from "../../context/PrivacyContext";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";
import { supabase } from "../../supabaseClient";

const VAULT_BUCKET = "documents";
const MAX_FILE_MB = 15;

// ─────────────────────────────────────────────────────────────────────────────
// Category definitions
// ─────────────────────────────────────────────────────────────────────────────

// Colors come from THEME's fixed semantic/extension tokens (not the user's selectable accent
// preset) so each category keeps a stable, distinct identity regardless of which of the 10 accent
// presets is active — a hardcoded hex here could silently collide with the chosen accent color.
const CATEGORIES = {
  Identity: {
    icon: Fingerprint,
    color: THEME.accent,
    subcategories: ["PAN Card", "Aadhaar", "Passport", "Voter ID", "Driving License"],
  },
  Financial: {
    icon: Landmark,
    color: THEME.sage,
    subcategories: [
      "Bank Statement",
      "Tax Return (ITR)",
      "Form 16",
      "26AS",
      "Investment Proof",
      "Other",
    ],
  },
  Insurance: {
    icon: ShieldCheck,
    color: THEME.cyan,
    subcategories: ["Policy Document", "Claim Form", "Medical Report", "Other"],
  },
  Property: {
    icon: Home,
    color: THEME.gold,
    subcategories: [
      "Sale Deed",
      "Registry",
      "Agreement",
      "NOC",
      "Possession Letter",
      "RERA Certificate",
      "Other",
    ],
  },
  Vehicle: {
    icon: Car,
    color: THEME.rust,
    subcategories: ["RC Book", "Insurance", "PUC Certificate", "Service Record", "Other"],
  },
  Legal: {
    icon: Scale,
    color: THEME.violet,
    subcategories: ["Will", "Power of Attorney", "Trust Deed", "Partnership Deed", "Other"],
  },
  Other: {
    icon: Folder,
    color: THEME.muted,
    subcategories: ["Certificate", "Receipt", "Warranty", "Other"],
  },
};

type CategoryKey = keyof typeof CATEGORIES;
const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

const LINKED_ASSET_TYPES = [
  { id: "bankAccount", label: "Bank Account" },
  { id: "fd", label: "Fixed Deposit" },
  { id: "insurance", label: "Insurance Policy" },
  { id: "property", label: "Property" },
  { id: "vehicle", label: "Vehicle" },
  { id: "loan", label: "Loan" },
  { id: "creditCard", label: "Credit Card" },
  { id: "demat", label: "Demat Account" },
  { id: "mutualFund", label: "Mutual Fund" },
  { id: "ppf", label: "PPF" },
  { id: "nps", label: "NPS" },
  { id: "epf", label: "EPF" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000;

function daysUntilExpiry(expiryDate: string): number | null {
  if (!expiryDate) return null;
  const now = new Date(todayFn());
  const exp = new Date(expiryDate);
  return Math.ceil((exp.getTime() - now.getTime()) / DAY_MS);
}

function getDocStatus(expiryDate: string): "valid" | "expiring" | "expired" | "no-expiry" {
  const days = daysUntilExpiry(expiryDate);
  if (days === null) return "no-expiry";
  if (days < 0) return "expired";
  if (days <= 30) return "expiring";
  return "valid";
}

function statusBadge(status: string) {
  switch (status) {
    case "expired":
      return { label: "Expired", variant: "rust" as const, color: THEME.rust };
    case "expiring":
      return { label: "Expiring Soon", variant: "gold" as const, color: THEME.gold };
    case "valid":
      return { label: "Valid", variant: "sage" as const, color: THEME.sage };
    default:
      return { label: "No Expiry", variant: "muted" as const, color: THEME.muted };
  }
}

function formatDate(d: string): string {
  if (!d) return "--";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getCategoryIcon(category: string) {
  const cat = CATEGORIES[category as CategoryKey];
  return cat ? cat.icon : FileText;
}

// Fixed per-relation accent hue, layered onto whatever name/relation the user has actually
// configured in Settings → Family Profiles (`profiles`, from useMasterData()). Only the *color*
// is fixed per relation-slot here — initials are always derived from the live profile name below,
// never hardcoded: an earlier version hardcoded both name AND initials (e.g. "AM"/"DM"/"RM" for
// the demo user's own initials), so a renamed family member kept showing the old person's initials
// on every document forever even after the name itself was fixed to read live.
const OWNER_AVATAR_COLOR: Record<string, string> = {
  self: THEME.accent,
  wife: THEME.pink,
  daughter: THEME.violet,
  huf: THEME.cyan,
};

function initialsFor(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getOwnerAvatarInfo(ownerId: string, profiles: { id: string; name: string; relation: string }[] = []) {
  const profile = profiles.find((p) => p.id === ownerId);
  const color = OWNER_AVATAR_COLOR[ownerId] || THEME.muted;
  return {
    initials: initialsFor(profile?.name || ownerId),
    name: profile?.name || ownerId,
    relation: profile?.relation || "",
    color,
    bg: `color-mix(in srgb, ${color} 12%, transparent)`,
  };
}

function getCategoryColor(category: string) {
  const cat = CATEGORIES[category as CategoryKey];
  return cat ? cat.color : THEME.muted;
}

function formatBytes(bytes?: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Storage objects are keyed `${userId}/${docId}/${sanitizedFileName}` — the
// original filename is everything after the second slash, used for display.
function fileNameFromPath(path?: string): string {
  if (!path) return "";
  const parts = path.split("/");
  return parts[parts.length - 1] || "";
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

function getLinkedAssets(state: any, assetType: string): { id: string; label: string }[] {
  switch (assetType) {
    case "bankAccount":
      return (state.bankAccounts || []).map((a: any) => ({
        id: a.id,
        label: `${a.bankName || ""} - ${a.accountNumber || a.id}`.trim(),
      }));
    case "fd":
      return (state.fixedDeposits || []).map((a: any) => ({
        id: a.id,
        label: `${a.bankName || "FD"} - ${a.accountNumber || a.id}`,
      }));
    case "insurance":
      return [
        ...(state.lic || []).map((a: any) => ({
          id: a.id,
          label: `LIC - ${a.policyName || a.policyNumber || a.id}`,
        })),
        ...(state.termPlans || []).map((a: any) => ({
          id: a.id,
          label: `Term - ${a.policyName || a.insurer || a.id}`,
        })),
        ...(state.investmentPlans || []).map((a: any) => ({
          id: a.id,
          label: `Investment - ${a.policyName || a.insurer || a.id}`,
        })),
      ];
    case "property":
      return (state.realEstateProperties || []).map((a: any) => ({
        id: a.id,
        label: a.name || a.address || a.id,
      }));
    case "vehicle":
      return (state.vehicles || []).map((a: any) => ({
        id: a.id,
        label: `${a.make || ""} ${a.model || ""} (${a.registrationNumber || a.id})`.trim(),
      }));
    case "loan":
      return [
        ...(state.loansTaken || []).map((a: any) => ({
          id: a.id,
          label: `Loan - ${a.lender || a.id}`,
        })),
      ];
    case "creditCard":
      return (state.creditCards || []).map((a: any) => ({
        id: a.id,
        label: `${a.bank || ""} ${a.name || ""}`.trim() || a.id,
      }));
    case "demat":
      return (state.demat || []).map((a: any) => ({
        id: a.id,
        label: `${a.broker || ""} - ${a.accountId || a.id}`,
      }));
    case "mutualFund":
      return (state.mutualFunds || []).map((a: any) => ({
        id: a.id,
        label: a.schemeName || a.name || a.id,
      }));
    case "ppf":
      return (state.ppf || []).map((a: any) => ({
        id: a.id,
        label: `PPF - ${a.bankName || a.id}`,
      }));
    case "nps":
      return (state.nps || []).map((a: any) => ({
        id: a.id,
        label: `NPS - ${a.pranNumber || a.id}`,
      }));
    case "epf":
      return (state.epf || []).map((a: any) => ({
        id: a.id,
        label: `EPF - ${a.uanNumber || a.company || a.id}`,
      }));
    default:
      return [];
  }
}

function getAssetListByType(state: any, assetType: string): any[] {
  switch (assetType) {
    case "bankAccount":
      return state.bankAccounts || [];
    case "fd":
      return state.fixedDeposits || [];
    case "insurance":
      return [
        ...(state.lic || []),
        ...(state.termPlans || []),
        ...(state.investmentPlans || []),
      ];
    case "property":
      return state.realEstateProperties || [];
    case "vehicle":
      return state.vehicles || [];
    case "loan":
      return state.loansTaken || [];
    case "creditCard":
      return state.creditCards || [];
    case "demat":
      return state.demat || [];
    case "mutualFund":
      return state.mutualFunds || [];
    case "ppf":
      return state.ppf || [];
    case "nps":
      return state.nps || [];
    case "epf":
      return state.epf || [];
    default:
      return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty form
// ─────────────────────────────────────────────────────────────────────────────

const EMPTY_DOC = {
  name: "",
  category: "Identity" as CategoryKey,
  subcategory: "",
  documentNumber: "",
  issuer: "",
  issueDate: "",
  expiryDate: "",
  notes: "",
  url: "",
  owner: "self",
  linkedAssetType: "",
  linkedAsset: "",
  filePath: "",
  fileSize: null as number | null,
  mimeType: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared inline style helpers
// ─────────────────────────────────────────────────────────────────────────────

const actionBtnBase: React.CSSProperties = {
  padding: 6,
  border: "none",
  background: "transparent",
  cursor: "pointer",
  borderRadius: 6,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

// ─────────────────────────────────────────────────────────────────────────────
// Presentational helpers — hoisted to module scope (not defined inside
// DocumentVaultTab's render body). A component function declared inside a
// parent's render body gets a new identity every render, which forces React
// to unmount/remount every instance (losing hover/focus state and DOM,
// paying full re-render cost) on every parent state change — e.g. every
// keystroke in the search box would have remounted the entire document grid.
// ─────────────────────────────────────────────────────────────────────────────

function OwnerAvatar({
  ownerId,
  familyProfiles,
  size = 26,
}: {
  ownerId: string;
  familyProfiles: any[];
  size?: number;
}) {
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

// ── Circular Progress Wheel ──────────────────────────────────────────────
function CircularProgressWheel({ percentage, size = 80 }: { percentage: number; size?: number }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="coverage-circular-progress" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", overflow: "visible" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="var(--surface-2)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={percentage === 100 ? THEME.sage : THEME.accent}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="coverage-circular-progress-text">
        <span style={{ fontSize: 16, fontWeight: 900, color: THEME.ink, letterSpacing: "-0.03em" }}>
          {percentage}%
        </span>
        <span style={{ fontSize: 8, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 1 }}>
          Covered
        </span>
      </div>
    </div>
  );
}

// ── Document card (grid mode) ───────────────────────────────────────────
function DocCard({
  doc,
  state,
  familyProfiles,
  copiedId,
  onView,
  onCopy,
  onEdit,
  onDelete,
  onOpenFile,
}: {
  doc: any;
  state: any;
  familyProfiles: any[];
  copiedId: string | null;
  onView: (id: string) => void;
  onCopy: (id: string, text: string, e?: React.MouseEvent) => void;
  onEdit: (doc: any) => void;
  onDelete: (id: string) => void;
  onOpenFile: (doc: any) => void;
}) {
  const status = getDocStatus(doc.expiryDate);
  const badge = statusBadge(status);
  const days = daysUntilExpiry(doc.expiryDate);
  const cat = CATEGORIES[doc.category as CategoryKey] || CATEGORIES.Other;
  const ownerInfo = getOwnerAvatarInfo(doc.owner, familyProfiles);
  // A stored linkedAsset id can go stale if the underlying asset was edited/deleted
  // elsewhere (e.g. bank account closed, property sold and removed) — the id then
  // resolves to nothing. Mirror the Detail modal's resolution here instead of the
  // old truthy check on doc.linkedAsset alone, so the card doesn't proudly show
  // "Linked" for a reference that no longer points at a real record.
  const linkedAssetResolved =
    !!doc.linkedAssetType &&
    !!doc.linkedAsset &&
    getLinkedAssets(state, doc.linkedAssetType).some((a) => a.id === doc.linkedAsset);

  return (
    <div
      className="doc-vault-card"
      role="button"
      tabIndex={0}
      aria-label={`View document ${doc.name}`}
      onClick={() => onView(doc.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView(doc.id);
        }
      }}
      style={{
        "--cat-color": cat.color,
        cursor: "pointer",
      } as React.CSSProperties}
    >
      {/* Card Decorative Top Header */}
      <div
        style={{
          height: 3,
          background: cat.color,
          position: "relative",
          width: "100%",
        }}
      >
        {days !== null && days <= 30 && (
          <span
            className="status-pulse-dot"
            style={{
              position: "absolute",
              top: 4,
              right: 8,
              color: days < 0 ? THEME.rust : THEME.gold,
              transform: "scale(0.8)",
            }}
          />
        )}
      </div>

      <div style={{ padding: "16px 18px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Main Info */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              color: cat.color,
              flexShrink: 0,
            }}
          >
            {React.createElement(cat.icon, { size: 20 })}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: THEME.ink,
                letterSpacing: "-0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {doc.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: cat.color }}>
                {doc.category}
              </span>
              {doc.subcategory && (
                <span style={{ fontSize: 10, color: THEME.muted }}>• {doc.subcategory}</span>
              )}
            </div>
          </div>
        </div>

        {/* Copyable Doc Number */}
        {doc.documentNumber && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 10px",
              background: "var(--surface-1)",
              borderRadius: 8,
              border: `1px solid ${THEME.line}`,
              marginBottom: 12,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                fontWeight: 700,
                color: THEME.ink,
                letterSpacing: "0.03em",
              }}
            >
              <Prv>{doc.documentNumber}</Prv>
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                className={`copy-btn ${copiedId === doc.id ? "copied" : ""}`}
                onClick={(e) => onCopy(doc.id, doc.documentNumber, e)}
                title="Copy Number"
                aria-label="Copy document number"
              >
                {copiedId === doc.id ? <Check size={12} /> : <Copy size={12} />}
              </button>
              {copiedId === doc.id && (
                <span style={{ fontSize: 9, fontWeight: 700, color: THEME.sage }}>Copied</span>
              )}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, flex: 1 }}>
          {doc.issuer && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: THEME.muted }}>
              <Building size={11} style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {doc.issuer}
              </span>
            </div>
          )}
          {doc.filePath && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: THEME.muted }}>
              <Paperclip size={11} style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {fileNameFromPath(doc.filePath)}
                {doc.fileSize ? ` (${formatBytes(doc.fileSize)})` : ""}
              </span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: THEME.muted }}>
            <Calendar size={11} style={{ flexShrink: 0 }} />
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              Exp: {doc.expiryDate ? formatDate(doc.expiryDate) : "No expiry"}
            </span>
          </div>

          {/* Expiry visual indicator */}
          {days !== null && days >= 0 && days <= 30 && (
            <div style={{ marginTop: 2 }}>
              <div style={{ height: 4, borderRadius: 2, background: "var(--surface-2)", overflow: "hidden", marginBottom: 3 }}>
                <div style={{ width: `${(days / 30) * 100}%`, height: "100%", background: THEME.gold }} />
              </div>
              <span style={{ fontSize: 10, color: THEME.gold, fontWeight: 700 }}>
                {days === 0 ? "Expires today" : `${days} day(s) left`}
              </span>
            </div>
          )}

          {days !== null && days < 0 && (
            <div style={{ fontSize: 10, color: THEME.rust, fontWeight: 700, marginTop: 4 }}>
              Expired {Math.abs(days)} day(s) ago
            </div>
          )}
        </div>

        {/* Owner details and Asset Links indicator */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px dashed ${THEME.line}`,
            paddingTop: 10,
            marginTop: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <OwnerAvatar ownerId={doc.owner} familyProfiles={familyProfiles} size={20} />
            <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>
              {ownerInfo.name}
            </span>
          </div>

          {linkedAssetResolved && (
            <div
              title="Linked with financial asset"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 3,
                fontSize: 9,
                fontWeight: 700,
                color: THEME.accent,
                background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                padding: "2px 6px",
                borderRadius: 6,
              }}
            >
              <Link2 size={10} />
              Linked
            </div>
          )}
        </div>
      </div>

      {/* Card actions bottom bar */}
      <div
        style={{
          display: "flex",
          borderTop: `1px solid ${THEME.line}`,
          background: "var(--surface-1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {(doc.url || doc.filePath) && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenFile(doc);
            }}
            style={{
              flex: 1,
              padding: "8px 0",
              border: "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              fontSize: 10,
              fontWeight: 700,
              color: THEME.accent,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "color-mix(in srgb, var(--t-accent) 10%, transparent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {doc.filePath && !doc.url ? <Paperclip size={11} /> : <ExternalLink size={11} />}
            Open
          </button>
        )}
        <button
          onClick={() => onEdit(doc)}
          style={{
            flex: 1,
            padding: "8px 0",
            border: "none",
            borderLeft: doc.url || doc.filePath ? `1px solid ${THEME.line}` : "none",
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            fontSize: 10,
            fontWeight: 700,
            color: THEME.muted,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "color-mix(in srgb, var(--t-line) 50%, transparent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Pencil size={11} />
          Edit
        </button>
        <button
          onClick={() => onDelete(doc.id)}
          style={{
            flex: 1,
            padding: "8px 0",
            border: "none",
            borderLeft: `1px solid ${THEME.line}`,
            background: "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            fontSize: 10,
            fontWeight: 700,
            color: THEME.rust,
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "color-mix(in srgb, var(--t-rust) 10%, transparent)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <Trash2 size={11} />
          Delete
        </button>
      </div>
    </div>
  );
}

// ── Document row (list mode) ────────────────────────────────────────────
function DocRow({
  doc,
  familyProfiles,
  copiedId,
  onView,
  onCopy,
  onEdit,
  onDelete,
  onOpenFile,
}: {
  doc: any;
  familyProfiles: any[];
  copiedId: string | null;
  onView: (id: string) => void;
  onCopy: (id: string, text: string, e?: React.MouseEvent) => void;
  onEdit: (doc: any) => void;
  onDelete: (id: string) => void;
  onOpenFile: (doc: any) => void;
}) {
  const status = getDocStatus(doc.expiryDate);
  const badge = statusBadge(status);
  const cat = CATEGORIES[doc.category as CategoryKey] || CATEGORIES.Other;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View document ${doc.name}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 16px",
        borderBottom: `1px solid ${THEME.line}`,
        transition: "background 0.15s",
        cursor: "pointer",
      }}
      onClick={() => onView(doc.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onView(doc.id);
        }
      }}
      className="card-lift"
    >
      <div style={{ display: "flex", alignItems: "center", color: cat.color, flexShrink: 0 }}>
        {React.createElement(cat.icon, { size: 18 })}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: THEME.ink,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {doc.name}
        </div>
        <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
          {doc.category}
          {doc.subcategory ? ` / ${doc.subcategory}` : ""}
          {doc.documentNumber ? (
            <>
              {" "}
              | <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}><Prv>{doc.documentNumber}</Prv></span>
            </>
          ) : (
            ""
          )}
        </div>
      </div>

      {/* Desktop elements */}
      <div className="doc-vault-list-meta" style={{ textAlign: "right", flexShrink: 0, paddingRight: 10 }}>
        <div style={{ fontSize: 11, color: THEME.ink, fontWeight: 600 }}>{doc.issuer || "--"}</div>
        <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
          {doc.expiryDate ? `Expires ${formatDate(doc.expiryDate)}` : "No expiry"}
        </div>
      </div>

      {/* Owner profile badge */}
      <div style={{ flexShrink: 0, marginRight: 4 }}>
        <OwnerAvatar ownerId={doc.owner} familyProfiles={familyProfiles} size={20} />
      </div>

      <Badge variant={badge.variant} style={{ fontSize: 9, flexShrink: 0, padding: "2px 6px" }}>
        {badge.label}
      </Badge>

      <div style={{ display: "flex", gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
        {doc.documentNumber && (
          <button
            className={`copy-btn ${copiedId === doc.id ? "copied" : ""}`}
            onClick={(e) => onCopy(doc.id, doc.documentNumber, e)}
            title="Copy Number"
            aria-label="Copy document number"
            style={actionBtnBase}
          >
            {copiedId === doc.id ? <Check size={13} /> : <Copy size={13} />}
          </button>
        )}
        {(doc.url || doc.filePath) && (
          <button
            onClick={() => onOpenFile(doc)}
            aria-label="Open document link"
            title="Open"
            className="icon-btn"
            style={{ ...actionBtnBase, color: THEME.accent }}
          >
            {doc.filePath && !doc.url ? <Paperclip size={13} /> : <ExternalLink size={13} />}
          </button>
        )}
        <button
          onClick={() => onEdit(doc)}
          aria-label="Edit document"
          title="Edit"
          className="icon-btn"
          style={{ ...actionBtnBase, color: THEME.muted }}
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => onDelete(doc.id)}
          aria-label="Delete document"
          title="Delete"
          className="icon-btn danger"
          style={{ ...actionBtnBase, color: THEME.rust }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export const DocumentVaultTab = ({ state, addItem, removeItem, updateItem, session, showToast }) => {
  const { familyProfiles } = useMasterData();
  // Will & Nominee Tracker also writes into the `documents` table (type: "will" |
  // "key_contact") for its own estate-planning records — exclude those here so a
  // Will doesn't show up as a generic vault document with a nonsensical category
  // and a Delete button that doesn't belong to this tab.
  const documents: any[] = (state.documents || []).filter(
    (d: any) => d.type !== "will" && d.type !== "key_contact"
  );

  const userId = session?.user?.id;
  const isOffline = !userId || userId === "offline-user";

  // ── UI State ────────────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_DOC });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date" | "category" | "expiry">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expiryFilter, setExpiryFilter] = useState<"all" | "30" | "60" | "90">("all");
  const [expandedAlerts, setExpandedAlerts] = useState(true);
  const [renewDoc, setRenewDoc] = useState<any>(null);
  const [renewDate, setRenewDate] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewDocId, setViewDocId] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [removeExistingFile, setRemoveExistingFile] = useState(false);
  const [fileError, setFileError] = useState("");
  const [saving, setSaving] = useState(false);

  // ── Computed ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    let expiringSoon = 0;
    let expired = 0;
    const catCounts: Record<string, number> = {};

    documents.forEach((doc) => {
      const status = getDocStatus(doc.expiryDate);
      if (status === "expired") expired++;
      else if (status === "expiring") expiringSoon++;

      const cat = doc.category || "Other";
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });

    return { total: documents.length, expiringSoon, expired, catCounts };
  }, [documents]);

  const expiryAlerts = useMemo(() => {
    return documents
      .filter((doc) => {
        const days = daysUntilExpiry(doc.expiryDate);
        if (days === null) return false;
        if (expiryFilter === "all") return days <= 90;
        return days <= parseInt(expiryFilter);
      })
      .sort((a, b) => {
        const da = daysUntilExpiry(a.expiryDate) ?? 999;
        const db = daysUntilExpiry(b.expiryDate) ?? 999;
        return da - db;
      });
  }, [documents, expiryFilter]);

  const filteredDocs = useMemo(() => {
    let list = [...documents];

    if (filterCategory !== "all") {
      list = list.filter((d) => d.category === filterCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) =>
          (d.name || "").toLowerCase().includes(q) ||
          (d.documentNumber || "").toLowerCase().includes(q) ||
          (d.issuer || "").toLowerCase().includes(q) ||
          (d.subcategory || "").toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "name":
          cmp = (a.name || "").localeCompare(b.name || "");
          break;
        case "date":
          cmp = (a.issueDate || "").localeCompare(b.issueDate || "");
          break;
        case "category":
          cmp = (a.category || "").localeCompare(b.category || "");
          break;
        case "expiry":
          cmp = (a.expiryDate || "9999").localeCompare(b.expiryDate || "9999");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [documents, filterCategory, searchQuery, sortBy, sortDir]);

  const quickLinks = useMemo(() => {
    const links: { type: string; label: string; total: number; linked: number }[] = [];
    const assetMap: Record<string, { key: string; label: string }> = {
      bankAccount: { key: "bankAccounts", label: "Bank Accounts" },
      insurance: { key: "lic", label: "Insurance Policies" },
      property: { key: "realEstateProperties", label: "Properties" },
      vehicle: { key: "vehicles", label: "Vehicles" },
      creditCard: { key: "creditCards", label: "Credit Cards" },
    };

    for (const [typeId, info] of Object.entries(assetMap)) {
      const assets = state[info.key] || [];
      if (assets.length === 0) continue;

      let insuranceTotal = assets.length;
      let validIds = new Set(assets.map((a: any) => a.id));
      if (typeId === "insurance") {
        const allInsurance = [
          ...(state.lic || []),
          ...(state.termPlans || []),
          ...(state.investmentPlans || []),
        ];
        insuranceTotal = allInsurance.length;
        validIds = new Set(allInsurance.map((a: any) => a.id));
      }

      // Only count a document as "linking" this type if its stored
      // linkedAsset id still resolves to a real, current asset — otherwise a
      // document linked to a bank account/policy/etc. that was later edited
      // or deleted keeps inflating this count forever (it can even push
      // coverage above 100%). Mirrors the same staleness fix DocCard's
      // `linkedAssetResolved` already applies per-document; this aggregate
      // stat had been missed when that fix went in.
      const linkedDocIds = new Set(
        documents
          .filter(
            (d) => d.linkedAssetType === typeId && d.linkedAsset && validIds.has(d.linkedAsset)
          )
          .map((d) => d.linkedAsset)
      );

      links.push({
        type: typeId,
        label: info.label,
        total: typeId === "insurance" ? insuranceTotal : assets.length,
        linked: linkedDocIds.size,
      });
    }

    return links;
  }, [state, documents]);

  // Overall Coverage statistics
  const coverageMetrics = useMemo(() => {
    let total = 0;
    let linked = 0;
    quickLinks.forEach((link) => {
      total += link.total;
      linked += link.linked;
    });
    const percentage = total > 0 ? Math.round((linked / total) * 100) : 0;
    return { total, linked, percentage };
  }, [quickLinks]);

  // Identify assets missing documents
  const missingAssets = useMemo(() => {
    const missing: { type: string; label: string; assetName: string; assetId: string }[] = [];
    const assetMap: Record<string, { key: string; label: string }> = {
      bankAccount: { key: "bankAccounts", label: "Bank Account" },
      insurance: { key: "lic", label: "Insurance Policy" },
      property: { key: "realEstateProperties", label: "Property" },
      vehicle: { key: "vehicles", label: "Vehicle" },
      creditCard: { key: "creditCards", label: "Credit Card" },
    };

    for (const [typeId, info] of Object.entries(assetMap)) {
      let assets = state[info.key] || [];
      if (typeId === "insurance") {
        assets = [
          ...(state.lic || []),
          ...(state.termPlans || []),
          ...(state.investmentPlans || []),
        ];
      }

      assets.forEach((asset: any) => {
        const hasDoc = documents.some(
          (d) => d.linkedAssetType === typeId && d.linkedAsset === asset.id
        );
        if (!hasDoc) {
          let name = asset.name || asset.bankName || asset.policyName || asset.make || asset.id;
          if (typeId === "vehicle" && asset.make) {
            name = `${asset.make} ${asset.model || ""}`.trim();
          } else if (typeId === "bankAccount" && asset.bankName) {
            name = `${asset.bankName} (${asset.accountNumber?.slice(-4) || asset.id})`;
          }
          missing.push({
            type: typeId,
            label: info.label,
            assetName: name,
            assetId: asset.id,
          });
        }
      });
    }
    return missing;
  }, [state, documents]);

  // ── Handlers ────────────────────────────────────────────────────────────
  // `presetCategory` is an optional UI convenience (e.g. clicking a category
  // tile in the empty-vault preview) — it only pre-fills the form's category
  // field and never affects any linked-asset resolution below.
  const openAddModal = (
    defaultAssetType = "",
    defaultAssetId = "",
    presetCategory?: CategoryKey
  ) => {
    let defaultOwner = "self";
    let defaultCategory: CategoryKey = presetCategory || "Identity";
    let defaultName = "";

    if (defaultAssetType && defaultAssetId) {
      const assetList = getAssetListByType(state, defaultAssetType);
      const asset = assetList.find((a: any) => a.id === defaultAssetId);
      if (asset) {
        if (asset.owner) {
          defaultOwner = asset.owner;
        } else if (asset.profileId) {
          defaultOwner = asset.profileId;
        }

        const assetName = asset.name || asset.bankName || asset.policyName || asset.make || "";
        let details = "";
        if (defaultAssetType === "bankAccount" && asset.bankName) {
          details = `${asset.bankName} Account`;
        } else if (defaultAssetType === "insurance") {
          details = `${asset.policyName || asset.insurer || "Policy"}`;
        } else if (defaultAssetType === "vehicle") {
          details = `${asset.make} ${asset.model || ""}`.trim();
        } else if (defaultAssetType === "property") {
          details = assetName;
        } else if (defaultAssetType === "creditCard") {
          details = `${asset.bank || ""} ${asset.name || "Credit Card"}`.trim();
        } else {
          details = assetName;
        }
        defaultName = details ? `${details} Document` : "";
      }

      if (
        defaultAssetType === "bankAccount" ||
        defaultAssetType === "fd" ||
        defaultAssetType === "loan" ||
        defaultAssetType === "creditCard" ||
        defaultAssetType === "demat" ||
        defaultAssetType === "mutualFund" ||
        defaultAssetType === "ppf" ||
        defaultAssetType === "nps" ||
        defaultAssetType === "epf"
      ) {
        defaultCategory = "Financial";
      } else if (defaultAssetType === "insurance") {
        defaultCategory = "Insurance";
      } else if (defaultAssetType === "property") {
        defaultCategory = "Property";
      } else if (defaultAssetType === "vehicle") {
        defaultCategory = "Vehicle";
      }
    }

    setForm({
      ...EMPTY_DOC,
      name: defaultName,
      category: defaultCategory,
      owner: defaultOwner,
      linkedAssetType: defaultAssetType,
      linkedAsset: defaultAssetId,
    });
    setEditId(null);
    setUploadFile(null);
    setRemoveExistingFile(false);
    setFileError("");
    setShowModal(true);
  };

  const openEditModal = (doc: any) => {
    setForm({
      name: doc.name || "",
      category: doc.category || "Identity",
      subcategory: doc.subcategory || "",
      documentNumber: doc.documentNumber || "",
      issuer: doc.issuer || "",
      issueDate: doc.issueDate || "",
      expiryDate: doc.expiryDate || "",
      notes: doc.notes || "",
      url: doc.url || "",
      owner: doc.owner || "self",
      linkedAssetType: doc.linkedAssetType || "",
      linkedAsset: doc.linkedAsset || "",
      filePath: doc.filePath || "",
      fileSize: doc.fileSize || null,
      mimeType: doc.mimeType || "",
    });
    setEditId(doc.id);
    setUploadFile(null);
    setRemoveExistingFile(false);
    setFileError("");
    setShowModal(true);
  };

  // Storage objects live at `${userId}/${docId}/${sanitizedFileName}` — the
  // top-level folder matching auth.uid() is what the bucket's RLS policies key on.
  const uploadDocFile = async (docId: string, file: File) => {
    const path = `${userId}/${docId}/${sanitizeFileName(file.name)}`;
    const { error } = await supabase.storage
      .from(VAULT_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (error) throw error;
    return { filePath: path, fileSize: file.size, mimeType: file.type || "" };
  };

  const deleteDocFile = async (path?: string) => {
    if (!path) return;
    try {
      await supabase.storage.from(VAULT_BUCKET).remove([path]);
    } catch (err) {
      console.warn("Failed to delete vault file from storage:", err);
    }
  };

  // Private bucket — files aren't reachable by a plain URL, so opening one
  // means minting a short-lived signed URL on demand rather than storing a
  // permanent link (which would defeat the point of a *private* vault).
  const handleOpenDoc = async (doc: any) => {
    if (doc.url) {
      window.open(doc.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (doc.filePath) {
      try {
        const { data, error } = await supabase.storage
          .from(VAULT_BUCKET)
          .createSignedUrl(doc.filePath, 300);
        if (error || !data?.signedUrl) throw error || new Error("No signed URL returned");
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      } catch (err) {
        showToast?.("Couldn't open file — it may have been removed from storage.", "error");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setFileError(`File is too large — max ${MAX_FILE_MB}MB.`);
      return;
    }
    setFileError("");
    setUploadFile(file);
    setRemoveExistingFile(false);
  };

  const handleSave = async () => {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      const docId = editId || uid();
      let fileFields: { filePath?: string; fileSize?: number | null; mimeType?: string } = {};

      if (uploadFile) {
        if (isOffline) {
          showToast?.("Sign in to upload files — add a URL/link instead while offline.", "warn");
        } else {
          const uploaded = await uploadDocFile(docId, uploadFile);
          fileFields = uploaded;
          if (form.filePath && form.filePath !== uploaded.filePath) {
            await deleteDocFile(form.filePath);
          }
        }
      } else if (removeExistingFile && form.filePath) {
        await deleteDocFile(form.filePath);
        fileFields = { filePath: "", fileSize: null, mimeType: "" };
      }

      const payload = {
        ...form,
        ...fileFields,
        name: form.name.trim(),
        documentNumber: form.documentNumber.trim(),
        issuer: form.issuer.trim(),
        notes: form.notes.trim(),
        url: form.url.trim(),
      };

      if (editId) {
        await updateItem("documents", editId, payload);
      } else {
        await addItem("documents", { id: docId, ...payload });
      }
      setShowModal(false);
      setEditId(null);
      setUploadFile(null);
      setRemoveExistingFile(false);
    } catch (err: any) {
      showToast?.(`Failed to save document: ${err?.message || "Please try again."}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    const doc = documents.find((d) => d.id === id);
    try {
      await removeItem("documents", id);
      if (doc?.filePath) {
        deleteDocFile(doc.filePath);
      }
    } catch (err: any) {
      showToast?.(`Failed to delete document: ${err?.message || "Unknown error"}`, "error");
    }
  };

  const openRenewModal = (doc: any) => {
    setRenewDoc(doc);
    setRenewDate("");
  };

  const handleRenewSave = async () => {
    if (renewDoc && renewDate && /^\d{4}-\d{2}-\d{2}$/.test(renewDate)) {
      try {
        await updateItem("documents", renewDoc.id, { expiryDate: renewDate });
        setRenewDoc(null);
        setRenewDate("");
      } catch (err: any) {
        showToast?.(`Failed to renew document: ${err?.message || "Unknown error"}`, "error");
      }
    }
  };

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  const setField = (key: string, val: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      if (key === "category") next.subcategory = "";
      if (key === "linkedAssetType") {
        next.linkedAsset = "";
        // Auto-update category based on linked asset type
        if (
          val === "bankAccount" ||
          val === "fd" ||
          val === "loan" ||
          val === "creditCard" ||
          val === "demat" ||
          val === "mutualFund" ||
          val === "ppf" ||
          val === "nps" ||
          val === "epf"
        ) {
          next.category = "Financial";
        } else if (val === "insurance") {
          next.category = "Insurance";
        } else if (val === "property") {
          next.category = "Property";
        } else if (val === "vehicle") {
          next.category = "Vehicle";
        }
      }
      if (key === "linkedAsset" && val) {
        // If document name is empty, suggest one based on the selected asset
        if (!next.name.trim()) {
          const assets = getLinkedAssets(state, next.linkedAssetType);
          const matched = assets.find((a) => a.id === val);
          if (matched) {
            next.name = `${matched.label} Document`;
          }
        }
        // Auto-resolve owner from the actual asset
        const assetList = getAssetListByType(state, next.linkedAssetType);
        const actualAsset = assetList.find((a) => a.id === val);
        if (actualAsset && (actualAsset.owner || actualAsset.profileId)) {
          next.owner = actualAsset.owner || actualAsset.profileId;
        }
      }
      return next;
    });
  };

  const handleCopy = (id: string, text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1500);
      } else {
        // Fallback for older browsers / non-secure contexts
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1500);
      }
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const linkedAssetOptions = useMemo(
    () => (form.linkedAssetType ? getLinkedAssets(state, form.linkedAssetType) : []),
    [state, form.linkedAssetType]
  );

  const handleExportCsv = () => {
    const header = "Name,Category,Sub-category,Document Number,Issuer,Issue Date,Expiry Date,Owner,Status";
    const rows = filteredDocs.map((d) => {
      const status = statusBadge(getDocStatus(d.expiryDate)).label;
      const cell = (v: string) => `"${(v || "").replace(/"/g, '""')}"`;
      return [
        cell(d.name),
        cell(d.category),
        cell(d.subcategory),
        cell(d.documentNumber),
        cell(d.issuer),
        cell(d.issueDate),
        cell(d.expiryDate),
        cell(getOwnerAvatarInfo(d.owner, familyProfiles).name),
        cell(status),
      ].join(",");
    });
    const content = [header, ...rows].join("\n");
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "document_vault.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Empty state ─────────────────────────────────────────────────────────
  if (documents.length === 0) {
    return (
      <div>
        <SectionTitle sub="Store, organize and track all your important documents in one secure vault.">
          Document Vault
        </SectionTitle>
        <EmptyState
          icon={FileText}
          gradient={`linear-gradient(135deg, ${THEME.accent} 0%, color-mix(in srgb, var(--t-accent) 65%, white) 100%)`}
          dotColor={THEME.accent}
          title="No Documents Yet"
          description="Add your identity proofs, financial documents, insurance policies, property papers, and more. Track expiry dates and link documents to your assets."
          pills={["PAN Card", "Passport", "Sale Deeds", "Insurance", "RC Book", "ITR"]}
          buttonLabel="Add Document"
          onAdd={() => openAddModal()}
        />
        {/* Category preview — shows the vault's real organizing structure so an
            empty vault still reads as considered/bespoke, not a bare placeholder. */}
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: THEME.muted,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Your vault organizes documents into 7 categories
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 10,
            }}
          >
            {CATEGORY_KEYS.map((catKey) => {
              const cat = CATEGORIES[catKey];
              const Icon = cat.icon;
              return (
                <button
                  key={catKey}
                  onClick={() => openAddModal("", "", catKey)}
                  aria-label={`Add a ${catKey} document`}
                  className="card-lift"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 8,
                    padding: "16px 10px",
                    borderRadius: 14,
                    border: `1.5px solid ${THEME.line}`,
                    background: "var(--surface-0)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: cat.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={17} color="#fff" />
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: THEME.ink }}>
                    {catKey}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {showModal && renderModal()}
      </div>
    );
  }

  // ── Renew Modal ────────────────────────────────────────────────────────
  function renderRenewModal() {
    if (!renewDoc) return null;
    return (
      <Modal
        title="Renew Document"
        onClose={() => {
          setRenewDoc(null);
          setRenewDate("");
        }}
        maxWidth={400}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 4 }}>Document</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>{renewDoc.name}</div>
          {renewDoc.expiryDate && (
            <div style={{ fontSize: 12, color: THEME.rust, marginTop: 4 }}>
              Current expiry: {formatDate(renewDoc.expiryDate)}
            </div>
          )}
        </div>
        <Field label="New Expiry Date">
          <Input
            type="date"
            value={renewDate}
            onChange={(e) => setRenewDate(e.target.value)}
            autoFocus
          />
        </Field>
        {/* Quick Date renewal buttons */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, marginBottom: 16 }}>
          {[
            { label: "+1 Year", val: 1 },
            { label: "+3 Years", val: 3 },
            { label: "+5 Years", val: 5 },
            { label: "+10 Years", val: 10 },
          ].map((btn) => (
            <button
              key={btn.label}
              type="button"
              onClick={() => {
                // Built from Y-M-D string arithmetic (addMonthsToDateStr), not
                // Date#setFullYear, which silently overflows a Feb 29 base date
                // into March 1 on a non-leap target year — same bug class fixed
                // elsewhere in the app (nextAnnualOccurrence/addMonthsClamped).
                const todayStr = todayFn();
                const base = renewDoc.expiryDate && renewDoc.expiryDate >= todayStr
                  ? renewDoc.expiryDate
                  : todayStr;
                setRenewDate(addMonthsToDateStr(base, btn.val * 12));
              }}
              style={{
                padding: "6px 12px",
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 6,
                border: `1px solid ${THEME.line}`,
                background: "var(--surface-1)",
                color: THEME.ink,
                cursor: "pointer",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = THEME.accent;
                e.currentTarget.style.background = `color-mix(in srgb, ${THEME.accent} 6%, var(--surface-1))`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = THEME.line;
                e.currentTarget.style.background = "var(--surface-1)";
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <ModalActions
          onSave={handleRenewSave}
          onClose={() => {
            setRenewDoc(null);
            setRenewDate("");
          }}
          saveLabel="Update Expiry"
          disabled={!renewDate}
        />
      </Modal>
    );
  }

  // ── Document View Details Modal ─────────────────────────────────────────
  function renderDetailModal() {
    if (!viewDocId) return null;
    const doc = documents.find((d) => d.id === viewDocId);
    if (!doc) return null;

    const status = getDocStatus(doc.expiryDate);
    const badge = statusBadge(status);
    const days = daysUntilExpiry(doc.expiryDate);
    const cat = CATEGORIES[doc.category as CategoryKey] || CATEGORIES.Other;
    const ownerInfo = getOwnerAvatarInfo(doc.owner, familyProfiles);

    let linkedAssetLabel = "";
    if (doc.linkedAssetType && doc.linkedAsset) {
      const assets = getLinkedAssets(state, doc.linkedAssetType);
      const matched = assets.find((a) => a.id === doc.linkedAsset);
      if (matched) {
        linkedAssetLabel = matched.label;
      }
    }

    return (
      <Modal
        title="Document Details"
        onClose={() => setViewDocId(null)}
        maxWidth={540}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Card header */}
          <div
            style={{
              padding: "20px 24px",
              borderRadius: 12,
              background: cat.color,
              color: "#fff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  {React.createElement(cat.icon, { size: 26, color: "#fff" })}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 19,
                      fontWeight: 600,
                      letterSpacing: "-0.005em",
                    }}
                  >
                    {doc.name}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.8)", marginTop: 2, fontWeight: 600 }}>
                    {doc.category} {doc.subcategory ? `• ${doc.subcategory}` : ""}
                  </div>
                </div>
              </div>
              <Badge variant={badge.variant} style={{ fontSize: 10, padding: "3px 8px" }}>
                {badge.label}
              </Badge>
            </div>
          </div>

          {/* Details Box */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px 24px",
              padding: "16px 20px",
              background: "var(--surface-1)",
              borderRadius: 12,
              border: `1.5px solid ${THEME.line}`,
            }}
          >
            {doc.documentNumber && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                  Document Number
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono)", color: THEME.ink }}>
                    <Prv>{doc.documentNumber}</Prv>
                  </span>
                  <button
                    className={`copy-btn ${copiedId === doc.id ? "copied" : ""}`}
                    onClick={(e) => handleCopy(doc.id, doc.documentNumber, e)}
                    title="Copy Document Number"
                    aria-label="Copy document number"
                  >
                    {copiedId === doc.id ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  {copiedId === doc.id && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: THEME.sage }}>Copied!</span>
                  )}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                Issuer
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>
                {doc.issuer || "--"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                Owner / Profile
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <OwnerAvatar ownerId={doc.owner} familyProfiles={familyProfiles} size={22} />
                <span style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>
                  {ownerInfo.name}
                </span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                Issue Date
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>
                {doc.issueDate ? formatDate(doc.issueDate) : "--"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                Expiry Date
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>
                {doc.expiryDate ? formatDate(doc.expiryDate) : "No Expiry"}
              </div>
            </div>

            {days !== null && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                  Expiry Status
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span
                    className="status-pulse-dot"
                    style={{
                      color: days < 0 ? THEME.rust : days <= 30 ? THEME.gold : THEME.sage,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: days < 0 ? THEME.rust : days <= 30 ? THEME.gold : THEME.sage,
                    }}
                  >
                    {days < 0
                      ? `Expired ${Math.abs(days)} day(s) ago`
                      : days === 0
                        ? "Expires today"
                        : `${days} day(s) remaining`}
                  </span>
                </div>
              </div>
            )}

            {linkedAssetLabel && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                  Linked Financial Asset
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: "var(--surface-0)",
                    border: `1px solid ${THEME.line}`,
                    fontSize: 12,
                    fontWeight: 600,
                    color: THEME.accent,
                  }}
                >
                  <Link2 size={12} />
                  {LINKED_ASSET_TYPES.find((t) => t.id === doc.linkedAssetType)?.label}: {linkedAssetLabel}
                </div>
              </div>
            )}

            {doc.filePath && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                  Attached File
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: "var(--surface-0)",
                    border: `1px solid ${THEME.line}`,
                    fontSize: 12,
                    fontWeight: 600,
                    color: THEME.ink,
                  }}
                >
                  <Paperclip size={12} color={THEME.accent} />
                  {fileNameFromPath(doc.filePath)}
                  {doc.fileSize && (
                    <span style={{ color: THEME.muted, fontWeight: 500 }}>
                      ({formatBytes(doc.fileSize)})
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {doc.notes && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
                Notes & Comments
              </div>
              <div className="notepad-notes-box">
                {doc.notes}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, borderTop: `1.5px solid ${THEME.line}`, paddingTop: 18 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setViewDocId(null);
                  openEditModal(doc);
                }}
                icon={<Pencil size={13} />}
              >
                Edit Details
              </Button>
              {days !== null && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setViewDocId(null);
                    openRenewModal(doc);
                  }}
                  icon={<RefreshCw size={13} />}
                  style={{ color: THEME.sage, borderColor: THEME.sage }}
                >
                  Renew
                </Button>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {(doc.url || doc.filePath) && (
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => handleOpenDoc(doc)}
                  icon={doc.filePath && !doc.url ? <Paperclip size={13} /> : <ExternalLink size={13} />}
                >
                  Open Original
                </Button>
              )}
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setViewDocId(null);
                  handleDelete(doc.id);
                }}
                icon={<Trash2 size={13} />}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Main Modal (Add/Edit) ──────────────────────────────────────────────
  function renderModal() {
    const subcats = CATEGORIES[form.category as CategoryKey]?.subcategories || [];

    return (
      <Modal
        title={editId ? "Edit Document" : "Add Document"}
        onClose={() => setShowModal(false)}
        maxWidth={620}
      >
        <div className="doc-vault-form-grid">
          {/* Name - full width */}
          <Field label="Document Name" style={{ gridColumn: "1 / -1" }}>
            <Input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. Passport, PAN Card"
            />
          </Field>

          {/* Category */}
          <Field label="Category">
            <Select value={form.category} onChange={(e) => setField("category", e.target.value)}>
              {CATEGORY_KEYS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>

          {/* Sub-category */}
          <Field label="Sub-category">
            <Select
              value={form.subcategory}
              onChange={(e) => setField("subcategory", e.target.value)}
            >
              <option value="">-- Select --</option>
              {subcats.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>

          {/* Document Number */}
          <Field label="Document Number">
            <Input
              value={form.documentNumber}
              onChange={(e) => setField("documentNumber", e.target.value)}
              placeholder="e.g. ABCDE1234F"
            />
          </Field>

          {/* Issuer */}
          <Field label="Issuer">
            <Input
              value={form.issuer}
              onChange={(e) => setField("issuer", e.target.value)}
              placeholder="e.g. Govt of India"
            />
          </Field>

          {/* Issue Date */}
          <Field label="Issue Date">
            <Input
              type="date"
              value={form.issueDate}
              onChange={(e) => setField("issueDate", e.target.value)}
            />
          </Field>

          {/* Expiry Date */}
          <Field label="Expiry Date (optional)">
            <Input
              type="date"
              value={form.expiryDate}
              onChange={(e) => setField("expiryDate", e.target.value)}
            />
          </Field>

          {/* Owner */}
          <Field label="Owner">
            <Select value={form.owner} onChange={(e) => setField("owner", e.target.value)}>
              {familyProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatProfileOption(p)}
                </option>
              ))}
            </Select>
          </Field>

          {/* URL */}
          <Field label="URL / Link (optional)">
            <Input
              value={form.url}
              onChange={(e) => setField("url", e.target.value)}
              placeholder="https://..."
            />
          </Field>

          {/* File attachment */}
          <Field label="Attach File (optional)" style={{ gridColumn: "1 / -1" }}>
            {isOffline ? (
              <div style={{ fontSize: 12, color: THEME.muted, fontStyle: "italic" }}>
                Sign in to upload files — use the URL / Link field above while offline.
              </div>
            ) : uploadFile ? (
              <div className="doc-vault-file-chip">
                <Paperclip size={13} color={THEME.accent} />
                <span className="doc-vault-file-chip-name">{uploadFile.name}</span>
                <span className="doc-vault-file-chip-size">{formatBytes(uploadFile.size)}</span>
                <button
                  type="button"
                  className="doc-vault-file-chip-remove"
                  onClick={() => setUploadFile(null)}
                  aria-label="Remove selected file"
                >
                  <X size={13} />
                </button>
              </div>
            ) : form.filePath && !removeExistingFile ? (
              <div className="doc-vault-file-chip">
                <Paperclip size={13} color={THEME.accent} />
                <span className="doc-vault-file-chip-name">{fileNameFromPath(form.filePath)}</span>
                {form.fileSize && (
                  <span className="doc-vault-file-chip-size">{formatBytes(form.fileSize)}</span>
                )}
                <button
                  type="button"
                  className="doc-vault-file-chip-view"
                  onClick={() => handleOpenDoc({ filePath: form.filePath })}
                >
                  View
                </button>
                <label htmlFor="doc-vault-file-input" className="doc-vault-file-chip-view">
                  Replace
                </label>
                <button
                  type="button"
                  className="doc-vault-file-chip-remove"
                  onClick={() => setRemoveExistingFile(true)}
                  aria-label="Remove attached file"
                >
                  <X size={13} />
                </button>
              </div>
            ) : (
              <label htmlFor="doc-vault-file-input" className="doc-vault-file-picker">
                <Upload size={14} />
                Choose file (PDF, JPG, PNG — max {MAX_FILE_MB}MB)
              </label>
            )}
            {!isOffline && (
              <input
                id="doc-vault-file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            )}
            {fileError && (
              <div style={{ fontSize: 11, color: THEME.rust, marginTop: 6, fontWeight: 600 }}>
                {fileError}
              </div>
            )}
          </Field>

          {/* Linked Asset Type */}
          <Field label="Linked Asset Type (optional)">
            <Select
              value={form.linkedAssetType}
              onChange={(e) => setField("linkedAssetType", e.target.value)}
            >
              <option value="">-- None --</option>
              {LINKED_ASSET_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>

          {/* Linked Asset */}
          <Field label="Linked Asset (optional)">
            <Select
              value={form.linkedAsset}
              onChange={(e) => setField("linkedAsset", e.target.value)}
              disabled={!form.linkedAssetType || linkedAssetOptions.length === 0}
            >
              <option value="">
                {!form.linkedAssetType
                  ? "-- Select type first --"
                  : linkedAssetOptions.length === 0
                    ? "-- No assets found --"
                    : "-- Select --"}
              </option>
              {linkedAssetOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>

          {/* Notes - full width */}
          <Field label="Notes (optional)" style={{ gridColumn: "1 / -1" }}>
            <textarea
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Any additional details..."
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14,
                fontWeight: 500,
                resize: "vertical",
                fontFamily: "inherit",
                borderRadius: "var(--radius-md, 8px)",
                border: `1.5px solid ${THEME.line}`,
                background: "transparent",
                color: THEME.ink,
                outline: "none",
                transition: "border-color 0.2s",
              }}
            />
          </Field>
        </div>
        <ModalActions
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          saveLabel={editId ? "Update" : "Add Document"}
          disabled={!form.name.trim() || saving}
          loading={saving}
        />
      </Modal>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div>
      <style>{`
        .doc-vault-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0 16px;
        }
        .doc-vault-form-grid input,
        .doc-vault-form-grid select {
          border-radius: var(--radius-md, 8px) !important;
          border: 1.5px solid var(--t-line) !important;
          background: var(--surface-0) !important;
          color: var(--t-ink) !important;
          outline: none !important;
          transition: all 0.2s ease-in-out !important;
        }
        .doc-vault-form-grid input:focus,
        .doc-vault-form-grid select:focus,
        .doc-vault-form-grid textarea:focus {
          border-color: var(--t-accent) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--t-accent) 12%, transparent) !important;
        }
        .doc-vault-file-picker {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px;
          font-size: 12.5px;
          font-weight: 600;
          border-radius: var(--radius-md, 8px);
          border: 1.5px dashed var(--t-line);
          background: var(--surface-1);
          color: var(--t-muted);
          cursor: pointer;
          transition: all 0.2s;
        }
        .doc-vault-file-picker:hover {
          border-color: var(--t-accent);
          color: var(--t-accent);
          background: color-mix(in srgb, var(--t-accent) 5%, var(--surface-1));
        }
        .doc-vault-file-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: var(--radius-md, 8px);
          border: 1.5px solid var(--t-line);
          background: var(--surface-1);
        }
        .doc-vault-file-chip-name {
          flex: 1;
          min-width: 0;
          font-size: 12.5px;
          font-weight: 700;
          color: var(--t-ink);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .doc-vault-file-chip-size {
          font-size: 10.5px;
          color: var(--t-muted);
          flex-shrink: 0;
        }
        .doc-vault-file-chip-view {
          font-size: 11px;
          font-weight: 700;
          color: var(--t-accent);
          cursor: pointer;
          flex-shrink: 0;
          background: none;
          border: none;
          padding: 2px 4px;
        }
        .doc-vault-file-chip-remove {
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 3px;
          border: none;
          border-radius: 5px;
          background: transparent;
          color: var(--t-muted);
          cursor: pointer;
        }
        .doc-vault-file-chip-remove:hover {
          background: color-mix(in srgb, var(--t-rust) 10%, transparent);
          color: var(--t-rust);
        }
        .doc-vault-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 24px;
        }
        .doc-vault-coverage-panel {
          display: grid;
          grid-template-columns: 1.2fr 2fr;
          gap: 16px;
          margin-bottom: 24px;
        }
        .category-browser-container {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          padding: 8px 4px 16px;
          scrollbar-width: none;
        }
        .category-browser-container::-webkit-scrollbar {
          display: none;
        }
        .category-browser-card {
          flex: 0 0 120px;
          padding: 14px 10px;
          border-radius: 12px;
          background: var(--surface-0);
          border: 1.5px solid var(--t-line);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
          position: relative;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .category-browser-card:hover {
          border-color: var(--cat-color);
        }
        .category-browser-card.active {
          border-color: var(--cat-color);
          background: color-mix(in srgb, var(--cat-color) 6%, var(--surface-0));
        }
        .doc-vault-toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }
        .doc-vault-toolbar-search {
          flex: 1;
          min-width: 200px;
          position: relative;
        }
        .doc-vault-sort-group {
          display: flex;
          gap: 4px;
        }
        .doc-vault-doc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        .doc-vault-card {
          position: relative;
          background: var(--surface-0);
          border: 1.5px solid var(--t-line);
          border-radius: 14px;
          overflow: hidden;
          transition: border-color 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .doc-vault-card:hover {
          border-color: var(--cat-color);
        }
        .coverage-circular-progress {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .coverage-circular-progress-text {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .copy-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--t-muted);
          transition: all 0.15s;
        }
        .copy-btn:hover {
          color: var(--t-accent);
          background: color-mix(in srgb, var(--t-accent) 8%, transparent);
        }
        .copy-btn.copied {
          color: var(--t-sage);
          background: color-mix(in srgb, var(--t-sage) 10%, transparent);
        }
        .status-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          position: relative;
          display: inline-block;
          background-color: currentColor;
        }
        .status-pulse-dot::after {
          content: '';
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border-radius: 50%;
          border: 2px solid currentColor;
          opacity: 0;
          animation: pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.35); opacity: 0.8; }
          80%, 100% { transform: scale(1.2); opacity: 0; }
        }
        .notepad-notes-box {
          padding: 14px 18px;
          border-radius: 10px;
          background: linear-gradient(rgba(0, 0, 0, 0.01) 95%, var(--t-line) 100%);
          background-size: 100% 24px;
          line-height: 24px;
          border: 1px solid var(--t-line);
          color: var(--t-ink);
          font-size: 13px;
          font-family: inherit;
          white-space: pre-wrap;
        }
        .doc-vault-alert-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 20px;
          border-bottom: 1px solid ${THEME.line};
        }
        .doc-vault-alert-meta { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .doc-vault-list-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          border-bottom: 2px solid ${THEME.line};
          font-size: 11px;
          font-weight: 700;
          color: ${THEME.muted};
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        @media (max-width: 768px) {
          .doc-vault-form-grid { grid-template-columns: 1fr; }
          .doc-vault-form-grid [style*="grid-column"] { grid-column: auto !important; }
          .doc-vault-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .doc-vault-coverage-panel { grid-template-columns: 1fr; gap: 16px; }
          .doc-vault-toolbar { flex-wrap: wrap; gap: 8px; }
          .doc-vault-toolbar-search { min-width: 100%; order: -1; }
          .doc-vault-sort-group { flex-wrap: wrap; }
          .doc-vault-doc-grid { grid-template-columns: 1fr; gap: 12px; }
          .doc-vault-alert-row { padding: 10px 14px; gap: 8px; flex-wrap: wrap; }
          .doc-vault-alert-meta { width: 100%; justify-content: flex-end; gap: 6px; margin-top: 4px; }
          .doc-vault-list-meta { display: none !important; }
          .doc-vault-list-header { display: none !important; }
        }
        @media (max-width: 480px) {
          .doc-vault-stats-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
          .doc-vault-sort-group { gap: 3px; }
        }
      `}</style>

      {/* Section Title */}
      <SectionTitle
        sub="Store, organize and track all your important documents in one secure vault."
        rightElement={
          <Button variant="accent" icon={<Plus size={14} />} onClick={() => openAddModal()}>
            Add Document
          </Button>
        }
      >
        Document Vault
      </SectionTitle>

      {/* ── Dashboard Stats ──────────────────────────────────────────────── */}
      <div className="doc-vault-stats-grid">
        <StatCard
          label="Total Documents"
          value={String(stats.total)}
          numericValue={stats.total}
          formatValue={(n: number) => String(Math.round(n))}
          icon={<FileText />}
          color={THEME.accent}
        />
        <StatCard
          label="Expiring Soon"
          value={String(stats.expiringSoon)}
          numericValue={stats.expiringSoon}
          formatValue={(n: number) => String(Math.round(n))}
          sub="within 30 days"
          subColor={stats.expiringSoon > 0 ? THEME.gold : undefined}
          icon={<Clock />}
          color={THEME.gold}
        />
        <StatCard
          label="Expired"
          value={String(stats.expired)}
          numericValue={stats.expired}
          formatValue={(n: number) => String(Math.round(n))}
          sub={stats.expired > 0 ? "needs attention" : "all clear"}
          subColor={stats.expired > 0 ? THEME.rust : THEME.sage}
          icon={<AlertTriangle />}
          color={THEME.rust}
        />
        <StatCard
          label="Categories"
          value={String(Object.keys(stats.catCounts).length)}
          numericValue={Object.keys(stats.catCounts).length}
          formatValue={(n: number) => String(Math.round(n))}
          sub={`of ${CATEGORY_KEYS.length} used`}
          icon={<FolderOpen />}
          color={THEME.sage}
        />
      </div>

      {/* ── Vault Security & Coverage Hub ────────────────────────────────── */}
      <div className="doc-vault-coverage-panel">
        <Card style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <Link2 size={16} color={THEME.accent} />
            Asset Coverage
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            <CircularProgressWheel percentage={coverageMetrics.percentage} />
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: THEME.muted }}>
                Total Assets: <strong style={{ color: THEME.ink }}>{coverageMetrics.total}</strong>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: THEME.muted, marginTop: 4 }}>
                Documented: <strong style={{ color: THEME.ink }}>{coverageMetrics.linked}</strong>
              </div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 12, lineHeight: 1.4 }}>
                {coverageMetrics.percentage === 100 
                  ? "Outstanding! All financial assets are secured with documentation." 
                  : "Link your identity cards, certificates and policies to keep the vault audit complete."}
              </div>
            </div>
          </div>
        </Card>

        <Card style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={15} color={THEME.gold} />
              Vault Recommendations
            </div>
            <span style={{ fontSize: 10, color: THEME.muted, fontWeight: 600 }}>
              {missingAssets.length} action item(s)
            </span>
          </div>
          
          <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, paddingRight: 4 }}>
            {missingAssets.length === 0 ? (
              <div style={{ fontSize: 12, color: THEME.sage, fontWeight: 600, padding: "16px 0", textAlign: "center" }}>
                All clear! No missing documents detected.
              </div>
            ) : (
              missingAssets.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "6px 12px",
                    borderRadius: 8,
                    background: "var(--surface-1)",
                    border: `1px solid ${THEME.line}`,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1, paddingRight: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.assetName}
                    </div>
                    <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                      No {item.label} document linked
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openAddModal(item.type, item.assetId)}
                    style={{ padding: "4px 8px", fontSize: 10, color: THEME.accent }}
                  >
                    + Add
                  </Button>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* ── Category Breakdown ───────────────────────────────────────────── */}
      <Card style={{ padding: "20px 24px", marginBottom: 24 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: THEME.ink,
            marginBottom: 14,
            letterSpacing: "-0.01em",
          }}
        >
          Browse by Category
        </div>
        <div className="category-browser-container">
          <div
            role="button"
            tabIndex={0}
            aria-pressed={filterCategory === "all"}
            onClick={() => setFilterCategory("all")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setFilterCategory("all");
              }
            }}
            className={`category-browser-card ${filterCategory === "all" ? "active" : ""}`}
            style={{ "--cat-color": THEME.accent } as React.CSSProperties}
          >
            <div style={{ display: "flex", alignItems: "center", color: THEME.accent }}>
              <Folder size={20} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: filterCategory === "all" ? THEME.accent : THEME.muted }}>
              All Docs
            </span>
            <span
              style={{
                position: "absolute",
                top: -5,
                right: -5,
                background: THEME.accent,
                color: "#fff",
                fontSize: 9,
                fontWeight: 700,
                padding: "2px 6px",
                borderRadius: 10,
                boxShadow: `0 2px 8px color-mix(in srgb, ${THEME.accent} 25%, transparent)`,
              }}
            >
              {stats.total}
            </span>
          </div>

          {CATEGORY_KEYS.map((cat) => {
            const catDef = CATEGORIES[cat];
            const Icon = catDef.icon;
            const count = stats.catCounts[cat] || 0;
            const isActive = filterCategory === cat;
            return (
              <div
                key={cat}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                onClick={() => setFilterCategory(isActive ? "all" : cat)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setFilterCategory(isActive ? "all" : cat);
                  }
                }}
                className={`category-browser-card ${isActive ? "active" : ""}`}
                style={{
                  "--cat-color": catDef.color,
                  opacity: count === 0 && !isActive ? 0.5 : 1,
                } as React.CSSProperties}
              >
                <div style={{ display: "flex", alignItems: "center", color: catDef.color }}>
                  <Icon size={20} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? catDef.color : THEME.muted }}>
                  {cat}
                </span>
                {count > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: -5,
                      right: -5,
                      background: catDef.color,
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 10,
                      boxShadow: `0 2px 8px color-mix(in srgb, ${catDef.color} 25%, transparent)`,
                    }}
                  >
                    {count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* ── Expiry Alerts ────────────────────────────────────────────────── */}
      {expiryAlerts.length > 0 && (
        <Card style={{ padding: 0, marginBottom: 24, overflow: "hidden" }}>
          <div
            role="button"
            tabIndex={0}
            aria-expanded={expandedAlerts}
            onClick={() => setExpandedAlerts((e) => !e)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setExpandedAlerts((v) => !v);
              }
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
              border: "none",
              background: "color-mix(in srgb, var(--t-rust) 6%, transparent)",
              cursor: "pointer",
              borderBottom: expandedAlerts ? `1px solid ${THEME.line}` : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={16} color={THEME.rust} />
              <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>Expiry Alerts</span>
              <Badge variant="rust" style={{ fontSize: 10 }}>
                {expiryAlerts.length}
              </Badge>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <select
                value={expiryFilter}
                aria-label="Filter expiry alerts by time window"
                onChange={(e) => {
                  e.stopPropagation();
                  setExpiryFilter(e.target.value as any);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  padding: "3px 8px",
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: `1px solid ${THEME.line}`,
                  background: "transparent",
                  color: THEME.muted,
                  cursor: "pointer",
                }}
              >
                <option value="all">All Alerts</option>
                <option value="90">Next 90 days</option>
                <option value="60">Next 60 days</option>
                <option value="30">Next 30 days</option>
              </select>
              {expandedAlerts ? (
                <ChevronUp size={16} color={THEME.muted} />
              ) : (
                <ChevronDown size={16} color={THEME.muted} />
              )}
            </div>
          </div>
          {expandedAlerts && (
            <div style={{ maxHeight: 300, overflow: "auto" }}>
              {expiryAlerts.map((doc) => {
                const days = daysUntilExpiry(doc.expiryDate);
                const isExpired = days !== null && days < 0;
                return (
                  <div key={doc.id} className="doc-vault-alert-row">
                    <div style={{ display: "flex", alignItems: "center", color: getCategoryColor(doc.category) }}>
                      {React.createElement(getCategoryIcon(doc.category), { size: 18 })}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: THEME.ink,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {doc.name}
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted }}>
                        Expiry: {formatDate(doc.expiryDate)}
                        {days !== null && (
                          <span
                            style={{
                              marginLeft: 8,
                              fontWeight: 700,
                              color: isExpired ? THEME.rust : days <= 30 ? THEME.gold : THEME.muted,
                            }}
                          >
                            {isExpired
                              ? `${Math.abs(days)}d overdue`
                              : days === 0
                                ? "today"
                                : `${days}d left`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="doc-vault-alert-meta">
                      <Badge variant={isExpired ? "rust" : "gold"} style={{ fontSize: 10 }}>
                        {isExpired ? "Expired" : "Expiring"}
                      </Badge>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<RefreshCw size={12} />}
                        onClick={() => openRenewModal(doc)}
                        style={{ color: THEME.sage, borderColor: THEME.sage }}
                      >
                        Renew
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="doc-vault-toolbar">
        {/* Search */}
        <div className="doc-vault-toolbar-search">
          <Search
            size={14}
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
            placeholder="Search documents..."
            aria-label="Search documents"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 34px",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 8,
              border: `1.5px solid ${THEME.line}`,
              background: "transparent",
              color: THEME.ink,
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = THEME.accent;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "";
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              title="Clear search"
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                padding: 4,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: THEME.muted,
                display: "flex",
                alignItems: "center",
                borderRadius: 4,
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Sort buttons */}
        <div className="doc-vault-sort-group">
          {(
            [
              { key: "name", label: "Name" },
              { key: "date", label: "Date" },
              { key: "category", label: "Category" },
              { key: "expiry", label: "Expiry" },
            ] as const
          ).map((s) => (
            <button
              key={s.key}
              onClick={() => toggleSort(s.key)}
              style={{
                padding: "6px 10px",
                fontSize: 11,
                fontWeight: 600,
                border: `1px solid ${sortBy === s.key ? THEME.accent : THEME.line}`,
                borderRadius: 6,
                background:
                  sortBy === s.key
                    ? `color-mix(in srgb, ${THEME.accent} 8%, transparent)`
                    : "transparent",
                color: sortBy === s.key ? THEME.accent : THEME.muted,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 3,
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {s.label}
              {sortBy === s.key &&
                (sortDir === "asc" ? <SortAsc size={11} /> : <SortDesc size={11} />)}
            </button>
          ))}
        </div>

        {/* Export */}
        <Button
          variant="secondary"
          size="sm"
          icon={<Download size={13} />}
          onClick={handleExportCsv}
          title="Export visible documents to CSV"
        >
          Export
        </Button>

        {/* View toggle */}
        <div
          style={{
            display: "flex",
            borderRadius: 8,
            border: `1px solid ${THEME.line}`,
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => setViewMode("grid")}
            aria-label="Grid view"
            style={{
              padding: "6px 10px",
              border: "none",
              background:
                viewMode === "grid"
                  ? `color-mix(in srgb, ${THEME.accent} 12%, transparent)`
                  : "transparent",
              color: viewMode === "grid" ? THEME.accent : THEME.muted,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              transition: "all 0.15s",
            }}
          >
            <Grid size={14} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            aria-label="List view"
            style={{
              padding: "6px 10px",
              border: "none",
              borderLeft: `1px solid ${THEME.line}`,
              background:
                viewMode === "list"
                  ? `color-mix(in srgb, ${THEME.accent} 12%, transparent)`
                  : "transparent",
              color: viewMode === "list" ? THEME.accent : THEME.muted,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              transition: "all 0.15s",
            }}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {/* ── Results count ────────────────────────────────────────────────── */}
      {(filterCategory !== "all" || searchQuery) && (
        <div style={{ fontSize: 12, color: THEME.muted, marginBottom: 12, fontWeight: 500 }}>
          {filteredDocs.length} document{filteredDocs.length !== 1 ? "s" : ""} found
          {filterCategory !== "all" && (
            <Badge
              variant="accent"
              style={{ fontSize: 10, marginLeft: 8, cursor: "pointer" }}
              onClick={() => setFilterCategory("all")}
            >
              {filterCategory} <X size={10} style={{ marginLeft: 2 }} />
            </Badge>
          )}
          {searchQuery && (
            <Badge
              variant="muted"
              style={{ fontSize: 10, marginLeft: 6, cursor: "pointer" }}
              onClick={() => setSearchQuery("")}
            >
              "{searchQuery}" <X size={10} style={{ marginLeft: 2 }} />
            </Badge>
          )}
        </div>
      )}

      {/* ── Document Grid / List ─────────────────────────────────────────── */}
      {filteredDocs.length === 0 ? (
        <Card style={{ padding: "48px 24px", textAlign: "center" }}>
          <Search size={36} color={THEME.muted} style={{ marginBottom: 14, opacity: 0.3 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: THEME.ink, marginBottom: 4 }}>
            No documents found
          </div>
          <div
            style={{
              fontSize: 13,
              color: THEME.muted,
              maxWidth: 300,
              margin: "0 auto 16px",
            }}
          >
            Try adjusting your search or filter criteria
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFilterCategory("all");
              setSearchQuery("");
            }}
          >
            Clear search & filters
          </Button>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="doc-vault-doc-grid">
          {filteredDocs.map((doc) => (
            <DocCard
              key={doc.id}
              doc={doc}
              state={state}
              familyProfiles={familyProfiles}
              copiedId={copiedId}
              onView={setViewDocId}
              onCopy={handleCopy}
              onEdit={openEditModal}
              onDelete={handleDelete}
              onOpenFile={handleOpenDoc}
            />
          ))}
        </div>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          <div className="doc-vault-list-header">
            <div style={{ width: 28 }} />
            <div style={{ flex: 1 }}>Document</div>
            <div style={{ width: 140, textAlign: "right", paddingRight: 10 }}>Issuer / Expiry</div>
            <div style={{ width: 24, textIndent: -999 }}>Owner</div>
            <div style={{ width: 90, textAlign: "center" }}>Status</div>
            <div style={{ width: 110, textAlign: "center" }}>Actions</div>
          </div>
          {filteredDocs.map((doc) => (
            <DocRow
              key={doc.id}
              doc={doc}
              familyProfiles={familyProfiles}
              copiedId={copiedId}
              onView={setViewDocId}
              onCopy={handleCopy}
              onEdit={openEditModal}
              onDelete={handleDelete}
              onOpenFile={handleOpenDoc}
            />
          ))}
        </Card>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {showModal && renderModal()}
      {renderRenewModal()}
      {renderDetailModal()}
    </div>
  );
};
