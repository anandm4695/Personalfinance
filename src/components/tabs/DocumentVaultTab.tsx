import React, { useState, useMemo, useRef } from "react";
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
  Building,
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
  Users,
  Shield,
  Layers,
  Key,
  HardDrive,
  FileCheck,
  Sparkles,
  Tag,
  MapPin,
  Eye,
  SlidersHorizontal,
  CheckSquare,
  Square,
  ArrowUpDown,
  Filter,
  Info,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { uid, today as todayFn, addMonthsToDateStr } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field, Input, Select } from "../ui/Form";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { ConfirmDialog } from "../ui/Feedback";
import { Prv } from "../../context/PrivacyContext";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";
import { supabase } from "../../supabaseClient";

const VAULT_BUCKET = "documents";
const MAX_FILE_MB = 15;

// ─────────────────────────────────────────────────────────────────────────────
// Category definitions with tailored semantic colors & subcategories
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = {
  Identity: {
    icon: Fingerprint,
    color: THEME.accent || "#6366f1",
    subcategories: ["PAN Card", "Aadhaar", "Passport", "Voter ID", "Driving License", "OCI / PIO", "Birth Certificate"],
    suggestedIssuer: {
      "PAN Card": "Income Tax Department",
      Aadhaar: "UIDAI",
      Passport: "Ministry of External Affairs",
      "Voter ID": "Election Commission of India",
      "Driving License": "Regional Transport Office (RTO)",
    } as Record<string, string>,
  },
  Financial: {
    icon: Landmark,
    color: THEME.sage || "#10b981",
    subcategories: [
      "Bank Statement",
      "Tax Return (ITR)",
      "Form 16",
      "Form 26AS / AIS",
      "Investment Proof",
      "Salary Slip",
      "Demat Statement",
      "Other",
    ],
    suggestedIssuer: {
      "Tax Return (ITR)": "Income Tax Department",
      "Form 16": "Employer",
      "Form 26AS / AIS": "Income Tax Department",
    } as Record<string, string>,
  },
  Insurance: {
    icon: ShieldCheck,
    color: THEME.cyan || "#06b6d4",
    subcategories: ["Policy Document", "Health Card", "Claim Form", "Medical Report", "Premium Receipt", "Other"],
    suggestedIssuer: {
      "Policy Document": "Insurance Provider",
      "Health Card": "TPA / Insurer",
    } as Record<string, string>,
  },
  Property: {
    icon: Home,
    color: THEME.gold || "#f59e0b",
    subcategories: [
      "Sale Deed",
      "Registry",
      "Agreement to Sale",
      "NOC Certificate",
      "Possession Letter",
      "RERA Certificate",
      "Property Tax Receipt",
      "Electricity / Water Bill",
      "Other",
    ],
    suggestedIssuer: {
      Registry: "Sub-Registrar Office",
      "RERA Certificate": "RERA Authority",
      "Property Tax Receipt": "Municipal Corporation",
    } as Record<string, string>,
  },
  Vehicle: {
    icon: Car,
    color: THEME.rust || "#ef4444",
    subcategories: ["RC Book (Smart Card)", "Vehicle Insurance", "PUC Certificate", "Service Record", "Road Tax Receipt", "Other"],
    suggestedIssuer: {
      "RC Book (Smart Card)": "Regional Transport Office (RTO)",
      "PUC Certificate": "Authorized PUC Center",
    } as Record<string, string>,
  },
  Legal: {
    icon: Scale,
    color: THEME.violet || "#8b5cf6",
    subcategories: ["Will", "Power of Attorney (PoA)", "Trust Deed", "Partnership Deed", "Succession Certificate", "Gift Deed", "Other"],
    suggestedIssuer: {
      "Power of Attorney (PoA)": "Notary / Sub-Registrar",
      "Succession Certificate": "Civil Court",
    } as Record<string, string>,
  },
  Other: {
    icon: Folder,
    color: THEME.muted || "#94a3b8",
    subcategories: ["Academic Certificate", "Warranty Card", "Invoice / Bill", "Membership Proof", "Other"],
    suggestedIssuer: {} as Record<string, string>,
  },
};

type CategoryKey = keyof typeof CATEGORIES;
const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

const PHYSICAL_LOCATIONS = [
  "Bank Locker",
  "Home Safe",
  "Document Binder #1",
  "Document Binder #2",
  "Office Drawer",
  "Lawyer / CA Office",
  "Digital / Soft Copy Only",
];

const LINKED_ASSET_TYPES = [
  { id: "bankAccount", label: "Bank Account" },
  { id: "fd", label: "Fixed Deposit" },
  { id: "insurance", label: "Insurance Policy" },
  { id: "property", label: "Property / Real Estate" },
  { id: "vehicle", label: "Vehicle" },
  { id: "loan", label: "Loan" },
  { id: "creditCard", label: "Credit Card" },
  { id: "demat", label: "Demat Account" },
  { id: "mutualFund", label: "Mutual Fund" },
  { id: "ppf", label: "PPF Account" },
  { id: "nps", label: "NPS Account" },
  { id: "epf", label: "EPF Account" },
];

const MANDATORY_FAMILY_DOCS = [
  { label: "PAN Card", category: "Identity", subcategory: "PAN Card" },
  { label: "Aadhaar Card", category: "Identity", subcategory: "Aadhaar" },
  { label: "Passport", category: "Identity", subcategory: "Passport" },
  { label: "Driving License", category: "Identity", subcategory: "Driving License" },
  { label: "Health Card / Policy", category: "Insurance", subcategory: "Health Card" },
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
      return { label: "Expired", variant: "rust" as const, color: THEME.rust || "#ef4444" };
    case "expiring":
      return { label: "Expiring Soon", variant: "gold" as const, color: THEME.gold || "#f59e0b" };
    case "valid":
      return { label: "Valid", variant: "sage" as const, color: THEME.sage || "#10b981" };
    default:
      return { label: "Lifetime / No Expiry", variant: "muted" as const, color: THEME.muted || "#94a3b8" };
  }
}

function formatDate(d: string): string {
  if (!d) return "—";
  const dt = new Date(d);
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getCategoryIcon(category: string) {
  const cat = CATEGORIES[category as CategoryKey];
  return cat ? cat.icon : FileText;
}

const OWNER_AVATAR_COLOR: Record<string, string> = {
  self: THEME.accent || "#6366f1",
  wife: THEME.pink || "#ec4899",
  daughter: THEME.violet || "#8b5cf6",
  huf: THEME.cyan || "#06b6d4",
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
        label: `${a.bankName || "Bank"} - ${a.accountNumber ? a.accountNumber.slice(-4) : a.id}`,
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
        ...(state.healthInsurance || []).map((a: any) => ({
          id: a.id,
          label: `Health - ${a.policyName || a.insurer || a.id}`,
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
      return (state.loansTaken || []).map((a: any) => ({
        id: a.id,
        label: `Loan - ${a.lender || a.id}`,
      }));
    case "creditCard":
      return (state.creditCards || []).map((a: any) => ({
        id: a.id,
        label: `${a.bank || ""} ${a.name || ""}`.trim() || a.id,
      }));
    case "demat":
      return (state.demat || []).map((a: any) => ({
        id: a.id,
        label: `${a.broker || "Demat"} - ${a.accountId || a.id}`,
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
        ...(state.healthInsurance || []),
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
// Form defaults
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
  location: "Bank Locker",
  tags: [] as string[],
  filePath: "",
  fileSize: null as number | null,
  mimeType: "",
};

// ─────────────────────────────────────────────────────────────────────────────
// Reusable sub-components
// ─────────────────────────────────────────────────────────────────────────────

function OwnerAvatar({
  ownerId,
  familyProfiles,
  size = 24,
}: {
  ownerId: string;
  familyProfiles: any[];
  size?: number;
}) {
  const info = getOwnerAvatarInfo(ownerId, familyProfiles);
  return (
    <div
      title={`${info.name} (${info.relation || "Profile"})`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: info.bg,
        border: `1.5px solid ${info.color}`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        color: info.color,
        fontSize: Math.max(9, Math.round(size * 0.42)),
        fontWeight: 700,
        cursor: "default",
        flexShrink: 0,
        letterSpacing: "-0.02em",
      }}
    >
      {info.initials}
    </div>
  );
}

function CircularProgressWheel({
  percentage,
  size = 72,
  strokeWidth = 5,
  color,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;
  const fillColor = color || (percentage >= 100 ? THEME.sage : THEME.accent);

  return (
    <div style={{ position: "relative", width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)", overflow: "visible" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="var(--surface-2, rgba(255,255,255,0.08))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      <div style={{ position: "absolute", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <span
          style={{
            fontFamily: "var(--font-display, inherit)",
            fontSize: Math.round(size * 0.22),
            fontWeight: 800,
            color: THEME.ink,
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          {percentage}%
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Document Card Component
// ─────────────────────────────────────────────────────────────────────────────

function DocCard({
  doc,
  state,
  familyProfiles,
  copiedId,
  isSelected,
  onSelect,
  onView,
  onCopy,
  onEdit,
  onDelete,
  onRenew,
  onOpenFile,
}: {
  doc: any;
  state: any;
  familyProfiles: any[];
  copiedId: string | null;
  isSelected: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onView: (id: string) => void;
  onCopy: (id: string, text: string, e?: React.MouseEvent) => void;
  onEdit: (doc: any) => void;
  onDelete: (id: string) => void;
  onRenew: (doc: any) => void;
  onOpenFile: (doc: any) => void;
}) {
  const status = getDocStatus(doc.expiryDate);
  const badge = statusBadge(status);
  const days = daysUntilExpiry(doc.expiryDate);
  const cat = CATEGORIES[doc.category as CategoryKey] || CATEGORIES.Other;
  const ownerInfo = getOwnerAvatarInfo(doc.owner, familyProfiles);

  const linkedAssetResolved =
    !!doc.linkedAssetType &&
    !!doc.linkedAsset &&
    getLinkedAssets(state, doc.linkedAssetType).some((a) => a.id === doc.linkedAsset);

  return (
    <div
      className={`doc-vault-card ${isSelected ? "selected" : ""}`}
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
      } as React.CSSProperties}
    >
      {/* Top Category Indicator & Selection */}
      <div
        style={{
          height: 4,
          background: `linear-gradient(90deg, ${cat.color}, color-mix(in srgb, ${cat.color} 40%, transparent))`,
          position: "relative",
          width: "100%",
        }}
      />

      <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header with Icon, Title, and Checkbox */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelect(doc.id, e);
            }}
            title={isSelected ? "Deselect" : "Select"}
            style={{
              paddingTop: 2,
              cursor: "pointer",
              color: isSelected ? THEME.accent : THEME.muted,
              transition: "transform 0.15s ease",
            }}
          >
            {isSelected ? <CheckSquare size={16} /> : <Square size={16} style={{ opacity: 0.6 }} />}
          </div>

          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `color-mix(in srgb, ${cat.color} 12%, transparent)`,
              color: cat.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {React.createElement(cat.icon, { size: 16 })}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: THEME.ink,
                letterSpacing: "-0.01em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={doc.name}
            >
              {doc.name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2, flexWrap: "wrap" }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: cat.color }}>
                {doc.category}
              </span>
              {doc.subcategory && (
                <span style={{ fontSize: 10, color: THEME.muted }}>• {doc.subcategory}</span>
              )}
            </div>
          </div>

          {/* Owner Avatar */}
          <OwnerAvatar ownerId={doc.owner} familyProfiles={familyProfiles} size={22} />
        </div>

        {/* Copyable Doc Number Pill */}
        {doc.documentNumber && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "5px 9px",
              background: "var(--surface-1, rgba(255,255,255,0.04))",
              borderRadius: 6,
              border: `1px solid ${THEME.line}`,
              marginBottom: 10,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: 11,
                fontWeight: 700,
                color: THEME.ink,
                letterSpacing: "0.04em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              <Prv>{doc.documentNumber}</Prv>
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
              <button
                className={`copy-btn ${copiedId === doc.id ? "copied" : ""}`}
                onClick={(e) => onCopy(doc.id, doc.documentNumber, e)}
                title="Copy Number"
                aria-label="Copy document number"
                style={{ padding: 3 }}
              >
                {copiedId === doc.id ? <Check size={11} color={THEME.sage} /> : <Copy size={11} />}
              </button>
              {copiedId === doc.id && (
                <span style={{ fontSize: 9, fontWeight: 700, color: THEME.sage }}>Copied</span>
              )}
            </div>
          </div>
        )}

        {/* Metadata Details */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11, flex: 1 }}>
          {doc.issuer && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: THEME.muted }}>
              <Building size={11} style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {doc.issuer}
              </span>
            </div>
          )}

          {doc.location && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: THEME.muted }}>
              <MapPin size={11} style={{ flexShrink: 0, color: THEME.accent }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10.5 }}>
                {doc.location}
              </span>
            </div>
          )}

          {doc.filePath && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, color: THEME.muted }}>
              <Paperclip size={11} style={{ flexShrink: 0, color: THEME.accent }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10.5 }}>
                {fileNameFromPath(doc.filePath)}
                {doc.fileSize ? ` (${formatBytes(doc.fileSize)})` : ""}
              </span>
            </div>
          )}

          {/* Expiry Badge and Progress Meter */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4, paddingTop: 4, borderTop: `1px dashed ${THEME.line}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, color: THEME.muted, fontSize: 10.5 }}>
              <Calendar size={11} />
              <span>{doc.expiryDate ? formatDate(doc.expiryDate) : "Lifetime"}</span>
            </div>

            <Badge variant={badge.variant} style={{ fontSize: 9, padding: "1px 6px" }}>
              {badge.label}
            </Badge>
          </div>

          {days !== null && days >= 0 && days <= 30 && (
            <div style={{ marginTop: 2 }}>
              <div style={{ height: 3, borderRadius: 2, background: "var(--surface-2)", overflow: "hidden", marginBottom: 2 }}>
                <div style={{ width: `${Math.max(8, (days / 30) * 100)}%`, height: "100%", background: THEME.gold }} />
              </div>
              <span style={{ fontSize: 9.5, color: THEME.gold, fontWeight: 700 }}>
                {days === 0 ? "Expires today!" : `${days} day(s) left`}
              </span>
            </div>
          )}

          {days !== null && days < 0 && (
            <div style={{ fontSize: 9.5, color: THEME.rust, fontWeight: 700 }}>
              Expired {Math.abs(days)} day(s) ago
            </div>
          )}
        </div>

        {/* Footer Badges: Linked & Tags */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 8,
            paddingTop: 6,
            flexWrap: "wrap",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {linkedAssetResolved ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 9,
                  fontWeight: 700,
                  color: THEME.accent,
                  background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
                  padding: "1px 5px",
                  borderRadius: 4,
                }}
              >
                <Link2 size={9} />
                Linked
              </span>
            ) : (
              <span style={{ fontSize: 9.5, color: THEME.muted, fontWeight: 500 }}>
                {ownerInfo.name}
              </span>
            )}
          </div>

          {Array.isArray(doc.tags) && doc.tags.length > 0 && (
            <span
              style={{
                fontSize: 9,
                color: THEME.muted,
                background: "var(--surface-2)",
                padding: "1px 5px",
                borderRadius: 4,
                fontFamily: "var(--font-mono, monospace)",
              }}
            >
              #{doc.tags[0]}
            </span>
          )}
        </div>
      </div>

      {/* Card Actions Bottom Dock */}
      <div
        style={{
          display: "flex",
          borderTop: `1px solid ${THEME.line}`,
          background: "var(--surface-1, rgba(255,255,255,0.02))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {(doc.url || doc.filePath) && (
          <button
            onClick={() => onOpenFile(doc)}
            aria-label="Open document file or URL"
            title="Open Document"
            className="doc-vault-card-action-btn"
            style={{ color: THEME.accent }}
          >
            {doc.filePath && !doc.url ? <Paperclip size={11} /> : <ExternalLink size={11} />}
            <span>Open</span>
          </button>
        )}

        {days !== null && days <= 60 && (
          <button
            onClick={() => onRenew(doc)}
            aria-label="Renew document expiry"
            title="Renew Expiry"
            className="doc-vault-card-action-btn"
            style={{ color: THEME.sage }}
          >
            <RefreshCw size={11} />
            <span>Renew</span>
          </button>
        )}

        <button
          onClick={() => onEdit(doc)}
          aria-label="Edit document details"
          title="Edit"
          className="doc-vault-card-action-btn"
          style={{ color: THEME.muted }}
        >
          <Pencil size={11} />
          <span>Edit</span>
        </button>

        <button
          onClick={() => onDelete(doc.id)}
          aria-label="Delete document"
          title="Delete"
          className="doc-vault-card-action-btn danger"
          style={{ color: THEME.rust }}
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Document Row (Table View) Component
// ─────────────────────────────────────────────────────────────────────────────

function DocRow({
  doc,
  state,
  familyProfiles,
  copiedId,
  isSelected,
  onSelect,
  onView,
  onCopy,
  onEdit,
  onDelete,
  onRenew,
  onOpenFile,
}: {
  doc: any;
  state: any;
  familyProfiles: any[];
  copiedId: string | null;
  isSelected: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onView: (id: string) => void;
  onCopy: (id: string, text: string, e?: React.MouseEvent) => void;
  onEdit: (doc: any) => void;
  onDelete: (id: string) => void;
  onRenew: (doc: any) => void;
  onOpenFile: (doc: any) => void;
}) {
  const status = getDocStatus(doc.expiryDate);
  const badge = statusBadge(status);
  const days = daysUntilExpiry(doc.expiryDate);
  const cat = CATEGORIES[doc.category as CategoryKey] || CATEGORIES.Other;

  const linkedAssetResolved =
    !!doc.linkedAssetType &&
    !!doc.linkedAsset &&
    getLinkedAssets(state, doc.linkedAssetType).some((a) => a.id === doc.linkedAsset);

  return (
    <div
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
      className={`doc-vault-table-row ${isSelected ? "selected" : ""}`}
    >
      {/* Checkbox */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect(doc.id, e);
        }}
        style={{
          width: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: isSelected ? THEME.accent : THEME.muted,
        }}
      >
        {isSelected ? <CheckSquare size={15} /> : <Square size={15} style={{ opacity: 0.5 }} />}
      </div>

      {/* Category Icon */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: `color-mix(in srgb, ${cat.color} 12%, transparent)`,
          color: cat.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {React.createElement(cat.icon, { size: 15 })}
      </div>

      {/* Name & Details */}
      <div style={{ flex: 1.5, minWidth: 0, paddingRight: 10 }}>
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
        <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
          <span>{doc.category}</span>
          {doc.subcategory && <span>• {doc.subcategory}</span>}
          {doc.location && <span style={{ color: THEME.accent }}>• {doc.location}</span>}
        </div>
      </div>

      {/* Doc Number */}
      <div className="doc-vault-hide-mobile" style={{ flex: 1.2, minWidth: 0, paddingRight: 10 }}>
        {doc.documentNumber ? (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, fontWeight: 600, color: THEME.ink }}>
              <Prv>{doc.documentNumber}</Prv>
            </span>
            <button
              className={`copy-btn ${copiedId === doc.id ? "copied" : ""}`}
              onClick={(e) => onCopy(doc.id, doc.documentNumber, e)}
              title="Copy Number"
              aria-label="Copy document number"
              style={{ padding: 2 }}
            >
              {copiedId === doc.id ? <Check size={11} color={THEME.sage} /> : <Copy size={11} />}
            </button>
          </div>
        ) : (
          <span style={{ fontSize: 11, color: THEME.muted }}>—</span>
        )}
      </div>

      {/* Issuer & Attachment */}
      <div className="doc-vault-hide-mobile" style={{ flex: 1, minWidth: 0, paddingRight: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: THEME.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {doc.issuer || "—"}
        </div>
        {doc.filePath ? (
          <span style={{ fontSize: 9.5, color: THEME.accent, display: "flex", alignItems: "center", gap: 3 }}>
            <Paperclip size={9} /> File attached
          </span>
        ) : doc.url ? (
          <span style={{ fontSize: 9.5, color: THEME.muted, display: "flex", alignItems: "center", gap: 3 }}>
            <ExternalLink size={9} /> Link
          </span>
        ) : null}
      </div>

      {/* Owner Avatar */}
      <div style={{ width: 40, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <OwnerAvatar ownerId={doc.owner} familyProfiles={familyProfiles} size={22} />
      </div>

      {/* Expiry Date */}
      <div className="doc-vault-hide-mobile" style={{ width: 110, textAlign: "right", paddingRight: 10, flexShrink: 0 }}>
        <div style={{ fontSize: 11, color: THEME.ink, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {doc.expiryDate ? formatDate(doc.expiryDate) : "Lifetime"}
        </div>
        {days !== null && (
          <div style={{ fontSize: 9.5, fontWeight: 700, color: days < 0 ? THEME.rust : days <= 30 ? THEME.gold : THEME.muted }}>
            {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `${days}d left`}
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div style={{ width: 90, textAlign: "center", flexShrink: 0 }}>
        <Badge variant={badge.variant} style={{ fontSize: 9, padding: "2px 6px" }}>
          {badge.label}
        </Badge>
      </div>

      {/* Actions */}
      <div
        style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        {(doc.url || doc.filePath) && (
          <button
            onClick={() => onOpenFile(doc)}
            aria-label="Open document file or URL"
            title="Open"
            className="icon-btn"
            style={{ padding: 5, color: THEME.accent }}
          >
            {doc.filePath && !doc.url ? <Paperclip size={13} /> : <ExternalLink size={13} />}
          </button>
        )}
        {days !== null && days <= 60 && (
          <button
            onClick={() => onRenew(doc)}
            aria-label="Renew document"
            title="Renew"
            className="icon-btn"
            style={{ padding: 5, color: THEME.sage }}
          >
            <RefreshCw size={13} />
          </button>
        )}
        <button
          onClick={() => onEdit(doc)}
          aria-label="Edit document"
          title="Edit"
          className="icon-btn"
          style={{ padding: 5, color: THEME.muted }}
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => onDelete(doc.id)}
          aria-label="Delete document"
          title="Delete"
          className="icon-btn danger"
          style={{ padding: 5, color: THEME.rust }}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

interface DocumentVaultTabProps {
  state: any;
  addItem?: any;
  removeItem?: any;
  updateItem?: any;
  session?: any;
  showToast?: (msg: string, type?: string) => void;
}

export const DocumentVaultTab: React.FC<DocumentVaultTabProps> = ({
  state,
  addItem,
  removeItem,
  updateItem,
  session,
  showToast,
}) => {
  const { familyProfiles } = useMasterData();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Exclude Will & Nominee tracker records
  const documents: any[] = useMemo(() => {
    return (state.documents || []).filter(
      (d: any) => d.type !== "will" && d.type !== "key_contact"
    );
  }, [state.documents]);

  const userId = session?.user?.id;
  const isOffline = !userId || userId === "offline-user";

  // ── View Mode & Navigation ────────────────────────────────────────────────
  const [activeDeckTab, setActiveDeckTab] = useState<"explorer" | "renewals" | "matrix" | "family" | "lockers">("explorer");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // ── Modals & Actions ──────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_DOC });
  const [tagInput, setTagInput] = useState("");
  const [viewDocId, setViewDocId] = useState<string | null>(null);
  const [renewDoc, setRenewDoc] = useState<any>(null);
  const [renewDate, setRenewDate] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // File Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [removeExistingFile, setRemoveExistingFile] = useState(false);
  const [fileError, setFileError] = useState("");
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [saving, setSaving] = useState(false);

  // Selection & Batch Mode
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchConfirmDelete, setBatchConfirmDelete] = useState(false);

  // Filters & Search
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterOwner, setFilterOwner] = useState<string>("all");
  const [filterExpiryStatus, setFilterExpiryStatus] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [filterAttachment, setFilterAttachment] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "date" | "category" | "expiry" | "owner">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // ── Computed Statistics ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    let expiringSoon = 0;
    let expired = 0;
    let totalBytes = 0;
    let withFiles = 0;
    const catCounts: Record<string, number> = {};
    const ownerCounts: Record<string, number> = {};
    const locationCounts: Record<string, number> = {};

    documents.forEach((doc) => {
      const status = getDocStatus(doc.expiryDate);
      if (status === "expired") expired++;
      else if (status === "expiring") expiringSoon++;

      const cat = doc.category || "Other";
      catCounts[cat] = (catCounts[cat] || 0) + 1;

      const owner = doc.owner || "self";
      ownerCounts[owner] = (ownerCounts[owner] || 0) + 1;

      const loc = doc.location || "Bank Locker";
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;

      if (doc.fileSize) totalBytes += doc.fileSize;
      if (doc.filePath) withFiles++;
    });

    const validDocs = documents.length - expired;
    const healthPercentage = documents.length > 0 ? Math.round((validDocs / documents.length) * 100) : 100;

    return {
      total: documents.length,
      expiringSoon,
      expired,
      catCounts,
      ownerCounts,
      locationCounts,
      totalBytes,
      withFiles,
      healthPercentage,
    };
  }, [documents]);

  // Asset Linkage Matrix data
  const quickLinks = useMemo(() => {
    const links: { type: string; label: string; total: number; linked: number; assets: any[] }[] = [];
    const assetMap: Record<string, { key: string; label: string }> = {
      bankAccount: { key: "bankAccounts", label: "Bank Accounts" },
      insurance: { key: "lic", label: "Insurance Policies" },
      property: { key: "realEstateProperties", label: "Properties" },
      vehicle: { key: "vehicles", label: "Vehicles" },
      creditCard: { key: "creditCards", label: "Credit Cards" },
      fd: { key: "fixedDeposits", label: "Fixed Deposits" },
      demat: { key: "demat", label: "Demat Accounts" },
      loan: { key: "loansTaken", label: "Loans" },
    };

    for (const [typeId, info] of Object.entries(assetMap)) {
      let assets = state[info.key] || [];
      if (typeId === "insurance") {
        assets = [
          ...(state.lic || []),
          ...(state.termPlans || []),
          ...(state.investmentPlans || []),
          ...(state.healthInsurance || []),
        ];
      }
      if (assets.length === 0) continue;

      const validIds = new Set(assets.map((a: any) => a.id));
      const linkedDocMap = new Map<string, any>();

      documents
        .filter((d) => d.linkedAssetType === typeId && d.linkedAsset && validIds.has(d.linkedAsset))
        .forEach((d) => linkedDocMap.set(d.linkedAsset, d));

      links.push({
        type: typeId,
        label: info.label,
        total: assets.length,
        linked: linkedDocMap.size,
        assets: assets.map((a: any) => {
          let name = a.name || a.bankName || a.policyName || a.make || a.schemeName || a.id;
          if (typeId === "vehicle" && a.make) {
            name = `${a.make} ${a.model || ""} (${a.registrationNumber || a.id})`.trim();
          } else if (typeId === "bankAccount" && a.bankName) {
            name = `${a.bankName} (${a.accountNumber ? a.accountNumber.slice(-4) : a.id})`;
          }
          return {
            ...a,
            displayName: name,
            linkedDoc: linkedDocMap.get(a.id) || null,
          };
        }),
      });
    }

    return links;
  }, [state, documents]);

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

  // Expiry Timeline Buckets
  const renewalBuckets = useMemo(() => {
    const overdue: any[] = [];
    const urgent30: any[] = [];
    const upcoming90: any[] = [];
    const futureYear: any[] = [];
    const lifetime: any[] = [];

    documents.forEach((doc) => {
      const days = daysUntilExpiry(doc.expiryDate);
      if (days === null) {
        lifetime.push(doc);
      } else if (days < 0) {
        overdue.push(doc);
      } else if (days <= 30) {
        urgent30.push(doc);
      } else if (days <= 90) {
        upcoming90.push(doc);
      } else {
        futureYear.push(doc);
      }
    });

    const sortFn = (a: any, b: any) => (daysUntilExpiry(a.expiryDate) ?? 9999) - (daysUntilExpiry(b.expiryDate) ?? 9999);
    overdue.sort(sortFn);
    urgent30.sort(sortFn);
    upcoming90.sort(sortFn);
    futureYear.sort(sortFn);

    return { overdue, urgent30, upcoming90, futureYear, lifetime };
  }, [documents]);

  // Filtered & Sorted Documents
  const filteredDocs = useMemo(() => {
    let list = [...documents];

    if (filterCategory !== "all") {
      list = list.filter((d) => d.category === filterCategory);
    }

    if (filterOwner !== "all") {
      list = list.filter((d) => d.owner === filterOwner);
    }

    if (filterLocation !== "all") {
      list = list.filter((d) => (d.location || "Bank Locker") === filterLocation);
    }

    if (filterAttachment === "hasFile") {
      list = list.filter((d) => !!d.filePath);
    } else if (filterAttachment === "hasLink") {
      list = list.filter((d) => !!d.url && !d.filePath);
    } else if (filterAttachment === "metaOnly") {
      list = list.filter((d) => !d.filePath && !d.url);
    }

    if (filterExpiryStatus !== "all") {
      list = list.filter((d) => {
        const s = getDocStatus(d.expiryDate);
        if (filterExpiryStatus === "expired") return s === "expired";
        if (filterExpiryStatus === "expiring") return s === "expiring";
        if (filterExpiryStatus === "valid") return s === "valid";
        if (filterExpiryStatus === "lifetime") return s === "no-expiry";
        return true;
      });
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) =>
          (d.name || "").toLowerCase().includes(q) ||
          (d.documentNumber || "").toLowerCase().includes(q) ||
          (d.issuer || "").toLowerCase().includes(q) ||
          (d.subcategory || "").toLowerCase().includes(q) ||
          (d.location || "").toLowerCase().includes(q) ||
          (d.notes || "").toLowerCase().includes(q) ||
          (Array.isArray(d.tags) && d.tags.some((t: string) => t.toLowerCase().includes(q)))
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
        case "owner":
          cmp = (a.owner || "").localeCompare(b.owner || "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [documents, filterCategory, filterOwner, filterLocation, filterAttachment, filterExpiryStatus, searchQuery, sortBy, sortDir]);

  // ── Selection Handlers ────────────────────────────────────────────────────
  const toggleSelectDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    if (selectedIds.size === filteredDocs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDocs.map((d) => d.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  // ── Storage & File Handlers ───────────────────────────────────────────────
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
        showToast?.("Failed to open file — it may have been removed from storage.", "error");
      }
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndSetFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) validateAndSetFile(file);
  };

  const validateAndSetFile = (file: File) => {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setFileError(`File exceeds maximum size of ${MAX_FILE_MB}MB.`);
      return;
    }
    setFileError("");
    setUploadFile(file);
    setRemoveExistingFile(false);
  };

  // ── Open Modals ───────────────────────────────────────────────────────────
  const openAddModal = (
    defaultAssetType = "",
    defaultAssetId = "",
    presetCategory?: CategoryKey,
    presetOwner?: string,
    presetSubcategory?: string
  ) => {
    let defaultOwner = presetOwner || "self";
    let defaultCategory: CategoryKey = presetCategory || "Identity";
    let defaultName = "";
    let defaultIssuer = "";

    if (defaultAssetType && defaultAssetId) {
      const assetList = getAssetListByType(state, defaultAssetType);
      const asset = assetList.find((a: any) => a.id === defaultAssetId);
      if (asset) {
        if (asset.owner) defaultOwner = asset.owner;
        else if (asset.profileId) defaultOwner = asset.profileId;

        const assetName = asset.name || asset.bankName || asset.policyName || asset.make || "";
        if (defaultAssetType === "bankAccount") defaultName = `${asset.bankName || "Bank"} Account Proof`;
        else if (defaultAssetType === "insurance") defaultName = `${asset.policyName || asset.insurer || "Insurance"} Policy Document`;
        else if (defaultAssetType === "vehicle") defaultName = `${asset.make} ${asset.model || ""} RC Book`;
        else if (defaultAssetType === "property") defaultName = `${assetName} Sale Deed`;
        else defaultName = `${assetName} Document`;
      }

      if (
        ["bankAccount", "fd", "loan", "creditCard", "demat", "mutualFund", "ppf", "nps", "epf"].includes(defaultAssetType)
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

    if (presetSubcategory) {
      const catConfig = CATEGORIES[defaultCategory];
      if (catConfig && catConfig.suggestedIssuer[presetSubcategory]) {
        defaultIssuer = catConfig.suggestedIssuer[presetSubcategory];
      }
      if (!defaultName) defaultName = presetSubcategory;
    }

    setForm({
      ...EMPTY_DOC,
      name: defaultName,
      category: defaultCategory,
      subcategory: presetSubcategory || "",
      issuer: defaultIssuer,
      owner: defaultOwner,
      linkedAssetType: defaultAssetType,
      linkedAsset: defaultAssetId,
      location: "Bank Locker",
      tags: [],
    });
    setTagInput("");
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
      location: doc.location || "Bank Locker",
      tags: Array.isArray(doc.tags) ? doc.tags : [],
      filePath: doc.filePath || "",
      fileSize: doc.fileSize || null,
      mimeType: doc.mimeType || "",
    });
    setTagInput("");
    setEditId(doc.id);
    setUploadFile(null);
    setRemoveExistingFile(false);
    setFileError("");
    setShowModal(true);
  };

  const openRenewModal = (doc: any) => {
    setRenewDoc(doc);
    setRenewDate("");
  };

  // ── Form State Handlers ───────────────────────────────────────────────────
  const setField = (key: string, val: any) => {
    setForm((prev) => {
      const next = { ...prev, [key]: val };
      if (key === "category") {
        next.subcategory = "";
      }
      if (key === "subcategory" && val) {
        const catConfig = CATEGORIES[next.category as CategoryKey];
        if (catConfig && catConfig.suggestedIssuer && catConfig.suggestedIssuer[val] && !next.issuer) {
          next.issuer = catConfig.suggestedIssuer[val];
        }
      }
      if (key === "linkedAssetType") {
        next.linkedAsset = "";
      }
      if (key === "linkedAsset" && val) {
        const assetList = getAssetListByType(state, next.linkedAssetType);
        const actualAsset = assetList.find((a: any) => a.id === val);
        if (actualAsset && (actualAsset.owner || actualAsset.profileId)) {
          next.owner = actualAsset.owner || actualAsset.profileId;
        }
      }
      return next;
    });
  };

  const addTag = (tagText: string) => {
    const clean = tagText.trim().replace(/^#/, "");
    if (!clean) return;
    if (!form.tags.includes(clean)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, clean] }));
    }
    setTagInput("");
  };

  const removeTag = (tagToRemove: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tagToRemove) }));
  };

  // ── CRUD Actions ──────────────────────────────────────────────────────────
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
        location: form.location.trim(),
        tags: form.tags,
      };

      if (editId) {
        await updateItem("documents", editId, payload);
        showToast?.("Document updated successfully", "success");
      } else {
        await addItem("documents", { id: docId, ...payload });
        showToast?.("Document secured in vault", "success");
      }
      setShowModal(false);
      setEditId(null);
      setUploadFile(null);
      setRemoveExistingFile(false);
    } catch (err: any) {
      showToast?.(`Failed to save document: ${err?.message || "Unknown error"}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => setConfirmDeleteId(id);

  const performDelete = async (id: string) => {
    const doc = documents.find((d) => d.id === id);
    try {
      await removeItem("documents", id);
      if (doc?.filePath) {
        deleteDocFile(doc.filePath);
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      showToast?.("Document removed from vault", "info");
    } catch (err: any) {
      showToast?.(`Failed to delete document: ${err?.message || "Unknown error"}`, "error");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const performBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    try {
      for (const id of ids) {
        const doc = documents.find((d) => d.id === id);
        await removeItem("documents", id);
        if (doc?.filePath) deleteDocFile(doc.filePath);
      }
      setSelectedIds(new Set());
      showToast?.(`Deleted ${ids.length} documents`, "info");
    } catch (err: any) {
      showToast?.(`Batch delete error: ${err?.message || "Unknown error"}`, "error");
    } finally {
      setBatchConfirmDelete(false);
    }
  };

  const handleRenewSave = async () => {
    if (renewDoc && renewDate && /^\d{4}-\d{2}-\d{2}$/.test(renewDate)) {
      try {
        await updateItem("documents", renewDoc.id, { expiryDate: renewDate });
        showToast?.("Document renewed successfully", "success");
        setRenewDoc(null);
        setRenewDate("");
      } catch (err: any) {
        showToast?.(`Failed to renew document: ${err?.message || "Unknown error"}`, "error");
      }
    }
  };

  const handleCopy = (id: string, text: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error("Failed to copy text:", err);
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

  const handleExportCsv = (itemsToExport: any[] = filteredDocs) => {
    const header = "Name,Category,Sub-category,Document Number,Issuer,Physical Location,Issue Date,Expiry Date,Owner,Tags,Status";
    const rows = itemsToExport.map((d) => {
      const status = statusBadge(getDocStatus(d.expiryDate)).label;
      const cell = (v: any) => `"${(String(v || "")).replace(/"/g, '""')}"`;
      return [
        cell(d.name),
        cell(d.category),
        cell(d.subcategory),
        cell(d.documentNumber),
        cell(d.issuer),
        cell(d.location || "Bank Locker"),
        cell(d.issueDate),
        cell(d.expiryDate),
        cell(getOwnerAvatarInfo(d.owner, familyProfiles).name),
        cell(Array.isArray(d.tags) ? d.tags.join(";") : ""),
        cell(status),
      ].join(",");
    });
    const content = [header, ...rows].join("\n");
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `document_vault_export_${todayFn()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast?.("Vault export downloaded", "success");
  };

  // Linked Asset Options for Modal
  const linkedAssetOptions = useMemo(
    () => (form.linkedAssetType ? getLinkedAssets(state, form.linkedAssetType) : []),
    [state, form.linkedAssetType]
  );

  // ── Render Empty State ────────────────────────────────────────────────────
  if (documents.length === 0) {
    return (
      <div className="doc-vault-container">
        <SectionTitle sub="Centralize, secure, and monitor all personal, financial, and family documents in a high-security digital fortress.">
          Document Vault & Fortress
        </SectionTitle>
        <EmptyState
          icon={Shield}
          gradient={`linear-gradient(135deg, ${THEME.accent} 0%, color-mix(in srgb, var(--t-accent) 60%, white) 100%)`}
          dotColor={THEME.accent}
          title="Digital Fortress is Ready"
          description="Protect your family's identity proofs, tax filings, real estate deeds, vehicle registrations, and insurance policies in one organized vault."
          pills={["PAN & Aadhaar", "Passports", "Property Deeds", "Insurance Policies", "Vehicle RCs", "ITR & AIS"]}
          buttonLabel="Secure First Document"
          onAdd={() => openAddModal()}
        />

        {/* Category Preview */}
        <div style={{ marginTop: 28 }}>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: THEME.muted,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: 14,
              textAlign: "center",
            }}
          >
            Organize across 7 essential categories
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: 12,
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
                    gap: 10,
                    padding: "16px 12px",
                    borderRadius: 14,
                    border: `1.5px solid ${THEME.line}`,
                    background: "var(--surface-0)",
                    cursor: "pointer",
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: cat.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      boxShadow: `0 4px 12px color-mix(in srgb, ${cat.color} 30%, transparent)`,
                    }}
                  >
                    <Icon size={18} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: THEME.ink }}>
                    {catKey}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {showModal && renderAddEditModal()}
      </div>
    );
  }

  // ── Render Sub-Views ──────────────────────────────────────────────────────

  // 1. Vault Explorer View
  const renderExplorerView = () => {
    return (
      <div>
        {/* Category Browser Ribbon */}
        <div style={{ marginBottom: 18 }}>
          <div className="doc-vault-category-ribbon">
            <div
              role="button"
              tabIndex={0}
              aria-pressed={filterCategory === "all"}
              onClick={() => setFilterCategory("all")}
              className={`doc-vault-category-card ${filterCategory === "all" ? "active" : ""}`}
              style={{ "--cat-color": THEME.accent } as React.CSSProperties}
            >
              <div style={{ display: "flex", alignItems: "center", color: THEME.accent }}>
                <FolderOpen size={18} />
              </div>
              <span className="doc-vault-category-card-label">All Documents</span>
              <span className="doc-vault-category-card-badge">{stats.total}</span>
            </div>

            {CATEGORY_KEYS.map((catKey) => {
              const cat = CATEGORIES[catKey];
              const Icon = cat.icon;
              const count = stats.catCounts[catKey] || 0;
              const isActive = filterCategory === catKey;

              return (
                <div
                  key={catKey}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  onClick={() => setFilterCategory(isActive ? "all" : catKey)}
                  className={`doc-vault-category-card ${isActive ? "active" : ""}`}
                  style={{
                    "--cat-color": cat.color,
                    opacity: count === 0 && !isActive ? 0.5 : 1,
                  } as React.CSSProperties}
                >
                  <div style={{ display: "flex", alignItems: "center", color: cat.color }}>
                    <Icon size={18} />
                  </div>
                  <span className="doc-vault-category-card-label">{catKey}</span>
                  {count > 0 && (
                    <span className="doc-vault-category-card-badge" style={{ background: cat.color }}>
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Facet Toolbar */}
        <Card style={{ padding: "14px 18px", marginBottom: 16 }}>
          <div className="doc-vault-toolbar-container">
            {/* Search Input */}
            <div className="doc-vault-search-box">
              <Search size={15} className="doc-vault-search-icon" />
              <input
                type="text"
                placeholder="Search by name, number, issuer, tag, locker..."
                aria-label="Search documents"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="doc-vault-search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="doc-vault-search-clear"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Quick Filter Selectors */}
            <div className="doc-vault-filter-group">
              {/* Owner Filter */}
              <select
                value={filterOwner}
                aria-label="Filter by owner"
                onChange={(e) => setFilterOwner(e.target.value)}
                className="doc-vault-select-filter"
              >
                <option value="all">All Members</option>
                {familyProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.relation || "Member"})
                  </option>
                ))}
              </select>

              {/* Expiry Filter */}
              <select
                value={filterExpiryStatus}
                aria-label="Filter by validity"
                onChange={(e) => setFilterExpiryStatus(e.target.value)}
                className="doc-vault-select-filter"
              >
                <option value="all">All Statuses</option>
                <option value="valid">Valid Only</option>
                <option value="expiring">Expiring Soon</option>
                <option value="expired">Expired</option>
                <option value="lifetime">Lifetime / No Expiry</option>
              </select>

              {/* Location Filter */}
              <select
                value={filterLocation}
                aria-label="Filter by storage location"
                onChange={(e) => setFilterLocation(e.target.value)}
                className="doc-vault-select-filter"
              >
                <option value="all">All Locations</option>
                {PHYSICAL_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>

              {/* Attachment Filter */}
              <select
                value={filterAttachment}
                aria-label="Filter by file attachment"
                onChange={(e) => setFilterAttachment(e.target.value)}
                className="doc-vault-select-filter"
              >
                <option value="all">All Attachments</option>
                <option value="hasFile">With File Upload</option>
                <option value="hasLink">With External Link</option>
                <option value="metaOnly">Record Only</option>
              </select>
            </div>

            {/* Sort Controls & View Switcher */}
            <div className="doc-vault-right-controls">
              {/* Sort selector */}
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <select
                  value={sortBy}
                  aria-label="Sort documents"
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="doc-vault-select-filter"
                >
                  <option value="name">Sort: Name</option>
                  <option value="expiry">Sort: Expiry</option>
                  <option value="date">Sort: Issue Date</option>
                  <option value="category">Sort: Category</option>
                  <option value="owner">Sort: Owner</option>
                </select>
                <button
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  className="doc-vault-btn-icon"
                  title={sortDir === "asc" ? "Ascending" : "Descending"}
                >
                  <ArrowUpDown size={14} />
                </button>
              </div>

              {/* Export */}
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={13} />}
                onClick={() => handleExportCsv(filteredDocs)}
                title="Export CSV"
              >
                Export
              </Button>

              {/* Grid / Table Toggle */}
              <div className="doc-vault-view-toggle">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`doc-vault-view-toggle-btn ${viewMode === "grid" ? "active" : ""}`}
                  aria-label="Grid view"
                  title="Grid View"
                >
                  <Grid size={14} />
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`doc-vault-view-toggle-btn ${viewMode === "table" ? "active" : ""}`}
                  aria-label="Table view"
                  title="Table View"
                >
                  <List size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Active Filter Pills Bar */}
          {(filterCategory !== "all" ||
            filterOwner !== "all" ||
            filterExpiryStatus !== "all" ||
            filterLocation !== "all" ||
            filterAttachment !== "all" ||
            searchQuery) && (
            <div className="doc-vault-active-pills-bar">
              <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                {filteredDocs.length} matching document{filteredDocs.length !== 1 ? "s" : ""}:
              </span>

              {filterCategory !== "all" && (
                <Badge variant="accent" style={{ fontSize: 9.5, cursor: "pointer" }} onClick={() => setFilterCategory("all")}>
                  {filterCategory} <X size={10} style={{ marginLeft: 3 }} />
                </Badge>
              )}

              {filterOwner !== "all" && (
                <Badge variant="violet" style={{ fontSize: 9.5, cursor: "pointer" }} onClick={() => setFilterOwner("all")}>
                  Owner: {familyProfiles.find((p) => p.id === filterOwner)?.name || filterOwner} <X size={10} style={{ marginLeft: 3 }} />
                </Badge>
              )}

              {filterExpiryStatus !== "all" && (
                <Badge variant="gold" style={{ fontSize: 9.5, cursor: "pointer" }} onClick={() => setFilterExpiryStatus("all")}>
                  Status: {filterExpiryStatus} <X size={10} style={{ marginLeft: 3 }} />
                </Badge>
              )}

              {filterLocation !== "all" && (
                <Badge variant="cyan" style={{ fontSize: 9.5, cursor: "pointer" }} onClick={() => setFilterLocation("all")}>
                  Location: {filterLocation} <X size={10} style={{ marginLeft: 3 }} />
                </Badge>
              )}

              {filterAttachment !== "all" && (
                <Badge variant="sage" style={{ fontSize: 9.5, cursor: "pointer" }} onClick={() => setFilterAttachment("all")}>
                  Attachment: {filterAttachment} <X size={10} style={{ marginLeft: 3 }} />
                </Badge>
              )}

              {searchQuery && (
                <Badge variant="muted" style={{ fontSize: 9.5, cursor: "pointer" }} onClick={() => setSearchQuery("")}>
                  "{searchQuery}" <X size={10} style={{ marginLeft: 3 }} />
                </Badge>
              )}

              <button
                onClick={() => {
                  setFilterCategory("all");
                  setFilterOwner("all");
                  setFilterExpiryStatus("all");
                  setFilterLocation("all");
                  setFilterAttachment("all");
                  setSearchQuery("");
                }}
                className="doc-vault-clear-all-link"
              >
                Reset all filters
              </button>
            </div>
          )}
        </Card>

        {/* Document Grid / Table */}
        {filteredDocs.length === 0 ? (
          <Card style={{ padding: "48px 24px", textAlign: "center" }}>
            <Search size={36} color={THEME.muted} style={{ marginBottom: 12, opacity: 0.3 }} />
            <div style={{ fontSize: 15, fontWeight: 700, color: THEME.ink, marginBottom: 4 }}>
              No documents matched your criteria
            </div>
            <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 320, margin: "0 auto 16px" }}>
              Try loosening your search query or removing active filters to view documents.
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterCategory("all");
                setFilterOwner("all");
                setFilterExpiryStatus("all");
                setFilterLocation("all");
                setFilterAttachment("all");
                setSearchQuery("");
              }}
            >
              Reset Filters
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
                isSelected={selectedIds.has(doc.id)}
                onSelect={toggleSelectDoc}
                onView={setViewDocId}
                onCopy={handleCopy}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onRenew={openRenewModal}
                onOpenFile={handleOpenDoc}
              />
            ))}
          </div>
        ) : (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div className="doc-vault-table-header">
              <div
                onClick={selectAllFiltered}
                style={{ width: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                title={selectedIds.size === filteredDocs.length ? "Deselect All" : "Select All"}
              >
                {selectedIds.size > 0 && selectedIds.size === filteredDocs.length ? (
                  <CheckSquare size={15} color={THEME.accent} />
                ) : (
                  <Square size={15} style={{ opacity: 0.5 }} />
                )}
              </div>
              <div style={{ width: 32 }} />
              <div style={{ flex: 1.5 }}>Document Name</div>
              <div className="doc-vault-hide-mobile" style={{ flex: 1.2 }}>Number</div>
              <div className="doc-vault-hide-mobile" style={{ flex: 1 }}>Issuer & File</div>
              <div style={{ width: 40, textAlign: "center" }}>Owner</div>
              <div className="doc-vault-hide-mobile" style={{ width: 110, textAlign: "right", paddingRight: 10 }}>Expiry</div>
              <div style={{ width: 90, textAlign: "center" }}>Status</div>
              <div style={{ width: 110, textAlign: "center" }}>Actions</div>
            </div>
            {filteredDocs.map((doc) => (
              <DocRow
                key={doc.id}
                doc={doc}
                state={state}
                familyProfiles={familyProfiles}
                copiedId={copiedId}
                isSelected={selectedIds.has(doc.id)}
                onSelect={toggleSelectDoc}
                onView={setViewDocId}
                onCopy={handleCopy}
                onEdit={openEditModal}
                onDelete={handleDelete}
                onRenew={openRenewModal}
                onOpenFile={handleOpenDoc}
              />
            ))}
          </Card>
        )}
      </div>
    );
  };

  // 2. Expiry & Renewal Timeline View
  const renderRenewalsView = () => {
    const totalExpiring = renewalBuckets.overdue.length + renewalBuckets.urgent30.length;

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Top Summary Banner */}
        <div
          style={{
            padding: "18px 22px",
            borderRadius: 14,
            background:
              totalExpiring > 0
                ? `linear-gradient(135deg, color-mix(in srgb, ${THEME.rust} 15%, var(--surface-0)), var(--surface-0))`
                : `linear-gradient(135deg, color-mix(in srgb, ${THEME.sage} 15%, var(--surface-0)), var(--surface-0))`,
            border: `1.5px solid ${totalExpiring > 0 ? THEME.rust : THEME.sage}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: totalExpiring > 0 ? THEME.rust : THEME.sage,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
              }}
            >
              {totalExpiring > 0 ? <AlertTriangle size={22} /> : <ShieldCheck size={22} />}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: THEME.ink }}>
                {totalExpiring > 0
                  ? `${totalExpiring} Document(s) Require Immediate Renewal`
                  : "All Documents are Currently Valid & Up to Date"}
              </div>
              <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                Keep track of passports, insurance policies, PUCs, and driving licenses to avoid statutory penalties.
              </div>
            </div>
          </div>

          <Button
            variant="accent"
            size="sm"
            icon={<Plus size={13} />}
            onClick={() => openAddModal()}
          >
            Add New Document
          </Button>
        </div>

        {/* Overdue / Expired Section */}
        {renewalBuckets.overdue.length > 0 && (
          <Card style={{ padding: "18px 20px", border: `1.5px solid ${THEME.rust}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="status-pulse-dot" style={{ color: THEME.rust }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: THEME.rust, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Overdue / Expired Backlog ({renewalBuckets.overdue.length})
                </span>
              </div>
            </div>
            <div className="doc-vault-renewal-grid">
              {renewalBuckets.overdue.map((doc) => {
                const days = daysUntilExpiry(doc.expiryDate);
                return (
                  <div key={doc.id} className="doc-vault-renewal-card expired">
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {doc.name}
                        </div>
                        <div style={{ fontSize: 10.5, color: THEME.muted, marginTop: 2 }}>
                          {doc.category} • {doc.issuer || "No issuer"}
                        </div>
                      </div>
                      <OwnerAvatar ownerId={doc.owner} familyProfiles={familyProfiles} size={20} />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${THEME.line}` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: THEME.rust }}>
                        Expired {Math.abs(days ?? 0)}d ago ({formatDate(doc.expiryDate)})
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<RefreshCw size={11} />}
                        onClick={() => openRenewModal(doc)}
                        style={{ color: THEME.sage, borderColor: THEME.sage, padding: "3px 8px", fontSize: 10.5 }}
                      >
                        Renew
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Urgent (<30 days) Section */}
        {renewalBuckets.urgent30.length > 0 && (
          <Card style={{ padding: "18px 20px", border: `1.5px solid ${THEME.gold}` }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={16} color={THEME.gold} />
                <span style={{ fontSize: 14, fontWeight: 800, color: THEME.gold, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Action Needed within 30 Days ({renewalBuckets.urgent30.length})
                </span>
              </div>
            </div>
            <div className="doc-vault-renewal-grid">
              {renewalBuckets.urgent30.map((doc) => {
                const days = daysUntilExpiry(doc.expiryDate);
                return (
                  <div key={doc.id} className="doc-vault-renewal-card warning">
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {doc.name}
                        </div>
                        <div style={{ fontSize: 10.5, color: THEME.muted, marginTop: 2 }}>
                          {doc.category} • {doc.issuer || "No issuer"}
                        </div>
                      </div>
                      <OwnerAvatar ownerId={doc.owner} familyProfiles={familyProfiles} size={20} />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${THEME.line}` }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: THEME.gold }}>
                        {days === 0 ? "Expires TODAY" : `${days} day(s) left`} ({formatDate(doc.expiryDate)})
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={<RefreshCw size={11} />}
                        onClick={() => openRenewModal(doc)}
                        style={{ color: THEME.sage, borderColor: THEME.sage, padding: "3px 8px", fontSize: 10.5 }}
                      >
                        Renew
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Upcoming (31-90 Days) */}
        {renewalBuckets.upcoming90.length > 0 && (
          <Card style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink, marginBottom: 14 }}>
              Upcoming in 31 to 90 Days ({renewalBuckets.upcoming90.length})
            </div>
            <div className="doc-vault-renewal-grid">
              {renewalBuckets.upcoming90.map((doc) => {
                const days = daysUntilExpiry(doc.expiryDate);
                return (
                  <div key={doc.id} className="doc-vault-renewal-card">
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {doc.name}
                        </div>
                        <div style={{ fontSize: 10.5, color: THEME.muted, marginTop: 2 }}>
                          {doc.category} • {doc.issuer || "—"}
                        </div>
                      </div>
                      <OwnerAvatar ownerId={doc.owner} familyProfiles={familyProfiles} size={20} />
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${THEME.line}` }}>
                      <div style={{ fontSize: 11, color: THEME.muted }}>
                        Expires in {days}d ({formatDate(doc.expiryDate)})
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<RefreshCw size={11} />}
                        onClick={() => openRenewModal(doc)}
                        style={{ padding: "3px 6px", fontSize: 10.5 }}
                      >
                        Renew
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Future / Lifetime Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Card style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 8 }}>
              Valid for &gt; 90 Days
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: THEME.sage }}>
              {renewalBuckets.futureYear.length}
            </div>
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
              Documents in active validity window
            </div>
          </Card>

          <Card style={{ padding: "16px 20px" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, marginBottom: 8 }}>
              Lifetime Validity / Permanent
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: THEME.accent }}>
              {renewalBuckets.lifetime.length}
            </div>
            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
              PAN, Aadhaar, Sale Deeds, Birth Certificates
            </div>
          </Card>
        </div>
      </div>
    );
  };

  // 3. Asset Link & Audit Matrix View
  const renderMatrixView = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Coverage Overview Card */}
        <div className="doc-vault-matrix-header-panel">
          <Card style={{ padding: "20px 24px", flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              <Link2 size={16} color={THEME.accent} />
              Portfolio Document Coverage
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
              <CircularProgressWheel percentage={coverageMetrics.percentage} size={84} strokeWidth={7} />
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: THEME.muted }}>
                  Total Financial Assets: <strong style={{ color: THEME.ink }}>{coverageMetrics.total}</strong>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: THEME.muted, marginTop: 4 }}>
                  Secured with Documents: <strong style={{ color: THEME.sage }}>{coverageMetrics.linked}</strong>
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 10, lineHeight: 1.4 }}>
                  {coverageMetrics.percentage === 100
                    ? "Exceptional! All financial accounts and properties have associated proofs in the vault."
                    : "Attach original PDFs, deeds, and policy papers to ensure frictionless estate settlement and audit readiness."}
                </div>
              </div>
            </div>
          </Card>

          <Card style={{ padding: "20px 24px", flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink, marginBottom: 12 }}>
              Asset Type Breakdown
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {quickLinks.map((link) => {
                const pct = link.total > 0 ? Math.round((link.linked / link.total) * 100) : 0;
                return (
                  <div key={link.type} style={{ fontSize: 11 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontWeight: 600, color: THEME.ink }}>{link.label}</span>
                      <span style={{ color: pct === 100 ? THEME.sage : THEME.muted, fontWeight: 700 }}>
                        {link.linked} / {link.total} ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: "var(--surface-2)", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: pct === 100 ? THEME.sage : THEME.accent,
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Detailed Matrix Per Asset Category */}
        {quickLinks.map((group) => (
          <Card key={group.type} style={{ padding: "18px 22px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
                {group.label} ({group.assets.length})
              </div>
              <span style={{ fontSize: 11, color: group.linked === group.total ? THEME.sage : THEME.gold, fontWeight: 700 }}>
                {group.linked} of {group.total} documented
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
              {group.assets.map((asset) => (
                <div
                  key={asset.id}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "var(--surface-1)",
                    border: `1.5px solid ${asset.linkedDoc ? THEME.line : "color-mix(in srgb, var(--t-gold) 35%, transparent)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: THEME.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {asset.displayName}
                    </div>
                    {asset.linkedDoc ? (
                      <div
                        style={{
                          fontSize: 10.5,
                          color: THEME.sage,
                          marginTop: 3,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          cursor: "pointer",
                        }}
                        onClick={() => setViewDocId(asset.linkedDoc.id)}
                      >
                        <FileCheck size={11} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {asset.linkedDoc.name}
                        </span>
                      </div>
                    ) : (
                      <div style={{ fontSize: 10.5, color: THEME.gold, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
                        <AlertTriangle size={11} />
                        <span>No document attached</span>
                      </div>
                    )}
                  </div>

                  {asset.linkedDoc ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setViewDocId(asset.linkedDoc.id)}
                      style={{ fontSize: 10, padding: "3px 8px" }}
                    >
                      View
                    </Button>
                  ) : (
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() => openAddModal(group.type, asset.id)}
                      style={{ fontSize: 10, padding: "3px 8px" }}
                    >
                      + Attach
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    );
  };

  // 4. Family Member Dossiers View
  const renderFamilyDossiersView = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 13, color: THEME.muted }}>
          Keep complete document dossiers for every family member to ensure smooth passport renewals, tax filings, and banking formalities.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {familyProfiles.map((profile) => {
            const memberDocs = documents.filter((d) => d.owner === profile.id);
            const avatarInfo = getOwnerAvatarInfo(profile.id, familyProfiles);

            return (
              <Card key={profile.id} style={{ padding: "20px 22px" }}>
                {/* Profile Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <OwnerAvatar ownerId={profile.id} familyProfiles={familyProfiles} size={36} />
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>
                        {profile.name}
                      </div>
                      <div style={{ fontSize: 11, color: avatarInfo.color, fontWeight: 600 }}>
                        {profile.relation || "Member"} • {memberDocs.length} Document(s)
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Plus size={12} />}
                    onClick={() => openAddModal("", "", undefined, profile.id)}
                    style={{ fontSize: 10.5, padding: "4px 8px" }}
                  >
                    Add
                  </Button>
                </div>

                {/* Essential Checklist */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                    Mandatory Identity & Health Proofs
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {MANDATORY_FAMILY_DOCS.map((req) => {
                      const matched = memberDocs.find(
                        (d) =>
                          d.category === req.category &&
                          (d.subcategory === req.subcategory || (d.name || "").toLowerCase().includes(req.label.toLowerCase()))
                      );

                      return (
                        <div
                          key={req.label}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 10px",
                            borderRadius: 6,
                            background: "var(--surface-1)",
                            fontSize: 11.5,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            {matched ? (
                              <Check size={14} color={THEME.sage} />
                            ) : (
                              <div style={{ width: 14, height: 14, borderRadius: "50%", border: `1.5px dashed ${THEME.muted}` }} />
                            )}
                            <span style={{ fontWeight: matched ? 600 : 500, color: matched ? THEME.ink : THEME.muted }}>
                              {req.label}
                            </span>
                          </div>

                          {matched ? (
                            <span
                              style={{ fontSize: 10, color: THEME.accent, cursor: "pointer", fontWeight: 700 }}
                              onClick={() => setViewDocId(matched.id)}
                            >
                              View
                            </span>
                          ) : (
                            <span
                              style={{ fontSize: 10, color: THEME.muted, cursor: "pointer", fontWeight: 600 }}
                              onClick={() => openAddModal("", "", req.category as CategoryKey, profile.id, req.subcategory)}
                            >
                              + Upload
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Attached Documents List */}
                {memberDocs.length > 0 && (
                  <div style={{ borderTop: `1px dashed ${THEME.line}`, paddingTop: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, marginBottom: 8 }}>
                      All Attached ({memberDocs.length})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 130, overflowY: "auto" }}>
                      {memberDocs.map((doc) => (
                        <div
                          key={doc.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: 11,
                            padding: "4px 6px",
                            borderRadius: 4,
                            cursor: "pointer",
                          }}
                          className="doc-vault-list-hover"
                          onClick={() => setViewDocId(doc.id)}
                        >
                          <span style={{ color: THEME.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {doc.name}
                          </span>
                          <span style={{ fontSize: 9.5, color: getCategoryColor(doc.category), fontWeight: 700 }}>
                            {doc.category}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  // 5. Physical Locker & Storage Registry View
  const renderLockersView = () => {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Physical Storage Overview */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {PHYSICAL_LOCATIONS.map((loc) => {
            const locDocs = documents.filter((d) => (d.location || "Bank Locker") === loc);
            return (
              <Card key={loc} style={{ padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <MapPin size={16} color={THEME.accent} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>{loc}</span>
                  </div>
                  <Badge variant={locDocs.length > 0 ? "accent" : "muted"} style={{ fontSize: 10 }}>
                    {locDocs.length}
                  </Badge>
                </div>

                <div style={{ fontSize: 11, color: THEME.muted, marginBottom: 10 }}>
                  {loc === "Bank Locker"
                    ? "Safe deposit locker for original property deeds & gold bonds"
                    : loc === "Home Safe"
                      ? "Fireproof home safe for passports & key credentials"
                      : "Categorized physical filing storage"}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 110, overflowY: "auto" }}>
                  {locDocs.slice(0, 5).map((d) => (
                    <div
                      key={d.id}
                      style={{ fontSize: 10.5, color: THEME.ink, padding: "2px 0", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      onClick={() => setViewDocId(d.id)}
                    >
                      • {d.name}
                    </div>
                  ))}
                  {locDocs.length > 5 && (
                    <div style={{ fontSize: 10, color: THEME.accent, fontWeight: 600, marginTop: 2 }}>
                      +{locDocs.length - 5} more documents
                    </div>
                  )}
                  {locDocs.length === 0 && (
                    <div style={{ fontSize: 10.5, color: THEME.muted, fontStyle: "italic" }}>
                      No items registered in this location
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Storage Quota & File Statistics */}
        <Card style={{ padding: "20px 24px" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <HardDrive size={16} color={THEME.accent} />
            Vault Storage & Encryption Health
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <div style={{ padding: "12px 14px", borderRadius: 8, background: "var(--surface-1)" }}>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Active Storage Used</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, marginTop: 4 }}>
                {formatBytes(stats.totalBytes) || "0 B"}
              </div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                Across {stats.withFiles} uploaded PDF/Image files
              </div>
            </div>

            <div style={{ padding: "12px 14px", borderRadius: 8, background: "var(--surface-1)" }}>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Privacy Protection</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: THEME.sage, marginTop: 4 }}>
                Active
              </div>
              <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
                Document numbers masked in public mode
              </div>
            </div>

            <div style={{ padding: "12px 14px", borderRadius: 8, background: "var(--surface-1)" }}>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Full Vault Backup</div>
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={12} />}
                onClick={() => handleExportCsv(documents)}
                style={{ marginTop: 6, fontSize: 11 }}
              >
                Export All ({documents.length})
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  // ── Render Modals ─────────────────────────────────────────────────────────

  // Add / Edit Modal
  function renderAddEditModal() {
    const subcats = CATEGORIES[form.category as CategoryKey]?.subcategories || [];

    return (
      <Modal
        title={editId ? "Edit Document Record" : "Secure New Document"}
        onClose={() => setShowModal(false)}
        maxWidth={640}
      >
        <div className="doc-vault-form-grid">
          {/* Section 1: Basic Information */}
          <div style={{ gridColumn: "1 / -1", fontSize: 12, fontWeight: 700, color: THEME.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
            1. Document Classification
          </div>

          <Field label="Document Name" style={{ gridColumn: "1 / -1" }}>
            <Input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. Passport, PAN Card, Flat 402 Registry"
              autoFocus
            />
          </Field>

          <Field label="Category">
            <Select value={form.category} onChange={(e) => setField("category", e.target.value)}>
              {CATEGORY_KEYS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Sub-Category">
            <Select value={form.subcategory} onChange={(e) => setField("subcategory", e.target.value)}>
              <option value="">-- Select Subcategory --</option>
              {subcats.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Document Owner">
            <Select value={form.owner} onChange={(e) => setField("owner", e.target.value)}>
              {familyProfiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {formatProfileOption(p)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Physical Location / Locker">
            <Select value={form.location} onChange={(e) => setField("location", e.target.value)}>
              {PHYSICAL_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </Select>
          </Field>

          {/* Section 2: Identification Details */}
          <div style={{ gridColumn: "1 / -1", fontSize: 12, fontWeight: 700, color: THEME.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 10, marginBottom: 2 }}>
            2. Identification & Validity
          </div>

          <Field label="Document / Card Number">
            <Input
              value={form.documentNumber}
              onChange={(e) => setField("documentNumber", e.target.value)}
              placeholder="e.g. ABCDE1234F, Z1234567"
            />
          </Field>

          <Field label="Issuing Authority">
            <Input
              value={form.issuer}
              onChange={(e) => setField("issuer", e.target.value)}
              placeholder="e.g. Income Tax Dept, UIDAI, MEA"
            />
          </Field>

          <Field label="Issue Date">
            <Input
              type="date"
              value={form.issueDate}
              onChange={(e) => setField("issueDate", e.target.value)}
            />
          </Field>

          <Field label="Expiry Date (Leave blank if Lifetime)">
            <Input
              type="date"
              value={form.expiryDate}
              onChange={(e) => setField("expiryDate", e.target.value)}
            />
          </Field>

          {/* Section 3: Financial Linkage & Attachment */}
          <div style={{ gridColumn: "1 / -1", fontSize: 12, fontWeight: 700, color: THEME.accent, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 10, marginBottom: 2 }}>
            3. Financial Asset Link & Attachment
          </div>

          <Field label="Link with Asset Type (Optional)">
            <Select
              value={form.linkedAssetType}
              onChange={(e) => setField("linkedAssetType", e.target.value)}
            >
              <option value="">-- None / Standalone Document --</option>
              {LINKED_ASSET_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Linked Asset Record">
            <Select
              value={form.linkedAsset}
              onChange={(e) => setField("linkedAsset", e.target.value)}
              disabled={!form.linkedAssetType || linkedAssetOptions.length === 0}
            >
              <option value="">
                {!form.linkedAssetType
                  ? "-- Select asset type first --"
                  : linkedAssetOptions.length === 0
                    ? "-- No assets found --"
                    : "-- Select Record --"}
              </option>
              {linkedAssetOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </Select>
          </Field>

          {/* Drag & Drop File Upload Zone */}
          <Field label="File Attachment (PDF, JPG, PNG — max 15MB)" style={{ gridColumn: "1 / -1" }}>
            {isOffline ? (
              <div style={{ fontSize: 12, color: THEME.muted, fontStyle: "italic" }}>
                Sign in to upload encrypted files to cloud storage. Use URL link below while offline.
              </div>
            ) : uploadFile ? (
              <div className="doc-vault-file-chip">
                <Paperclip size={14} color={THEME.accent} />
                <span className="doc-vault-file-chip-name">{uploadFile.name}</span>
                <span className="doc-vault-file-chip-size">{formatBytes(uploadFile.size)}</span>
                <button
                  type="button"
                  className="doc-vault-file-chip-remove"
                  onClick={() => setUploadFile(null)}
                  aria-label="Remove file"
                >
                  <X size={13} />
                </button>
              </div>
            ) : form.filePath && !removeExistingFile ? (
              <div className="doc-vault-file-chip">
                <Paperclip size={14} color={THEME.accent} />
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
              <div
                className={`doc-vault-dropzone ${isDraggingFile ? "dragging" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(true);
                }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={18} color={THEME.accent} />
                <div style={{ textAlign: "center" }}>
                  <span style={{ fontWeight: 600, color: THEME.ink }}>Drag & drop file here</span>, or{" "}
                  <span style={{ color: THEME.accent, textDecoration: "underline" }}>browse local files</span>
                </div>
                <div style={{ fontSize: 10.5, color: THEME.muted }}>
                  Supported formats: PDF, JPEG, PNG, WEBP (Max {MAX_FILE_MB}MB)
                </div>
              </div>
            )}
            {!isOffline && (
              <input
                ref={fileInputRef}
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

          {/* External URL */}
          <Field label="External URL / Drive Link (Optional)" style={{ gridColumn: "1 / -1" }}>
            <Input
              value={form.url}
              onChange={(e) => setField("url", e.target.value)}
              placeholder="https://drive.google.com/..."
            />
          </Field>

          {/* Custom Tags */}
          <Field label="Tags / Custom Labels (Press Enter)" style={{ gridColumn: "1 / -1" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
              {form.tags.map((t) => (
                <span
                  key={t}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "2px 8px",
                    borderRadius: 6,
                    background: "var(--surface-2)",
                    fontSize: 11,
                    fontWeight: 600,
                    color: THEME.ink,
                  }}
                >
                  #{t}
                  <X size={11} style={{ cursor: "pointer" }} onClick={() => removeTag(t)} />
                </span>
              ))}
            </div>
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              placeholder="Type tag (e.g. tax2026, kyc, original) and press Enter"
            />
          </Field>

          {/* Notes */}
          <Field label="Notes / Comments (Optional)" style={{ gridColumn: "1 / -1" }}>
            <textarea
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Locker key details, witness names, renewal procedures..."
              rows={2}
              className="doc-vault-textarea"
            />
          </Field>
        </div>

        <ModalActions
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          saveLabel={editId ? "Update Document" : "Save to Vault"}
          disabled={!form.name.trim() || saving}
          loading={saving}
        />
      </Modal>
    );
  };

  // Document Detail / Inspection Dossier Modal
  const renderDetailModal = () => {
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
      if (matched) linkedAssetLabel = matched.label;
    }

    return (
      <Modal
        title="Document Dossier"
        onClose={() => setViewDocId(null)}
        maxWidth={580}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Dossier Header Banner */}
          <div
            style={{
              padding: "18px 22px",
              borderRadius: 14,
              background: `linear-gradient(135deg, ${cat.color} 0%, color-mix(in srgb, ${cat.color} 75%, black) 100%)`,
              color: "#fff",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(4px)",
                }}
              >
                {React.createElement(cat.icon, { size: 24, color: "#fff" })}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em" }}>
                  {doc.name}
                </div>
                <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2, fontWeight: 600 }}>
                  {doc.category} {doc.subcategory ? `• ${doc.subcategory}` : ""}
                </div>
              </div>
            </div>

            <Badge variant={badge.variant} style={{ fontSize: 10, padding: "3px 8px" }}>
              {badge.label}
            </Badge>
          </div>

          {/* Dossier Data Grid */}
          <div className="doc-vault-dossier-grid">
            {doc.documentNumber && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="doc-vault-dossier-label">Document / Card Number</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, fontFamily: "var(--font-mono, monospace)", color: THEME.ink, letterSpacing: "0.04em" }}>
                    <Prv>{doc.documentNumber}</Prv>
                  </span>
                  <button
                    className={`copy-btn ${copiedId === doc.id ? "copied" : ""}`}
                    onClick={(e) => handleCopy(doc.id, doc.documentNumber, e)}
                    title="Copy Document Number"
                    aria-label="Copy document number"
                  >
                    {copiedId === doc.id ? <Check size={14} color={THEME.sage} /> : <Copy size={14} />}
                  </button>
                  {copiedId === doc.id && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: THEME.sage }}>Copied!</span>
                  )}
                </div>
              </div>
            )}

            <div>
              <div className="doc-vault-dossier-label">Issuing Authority</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>
                {doc.issuer || "—"}
              </div>
            </div>

            <div>
              <div className="doc-vault-dossier-label">Document Owner</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <OwnerAvatar ownerId={doc.owner} familyProfiles={familyProfiles} size={22} />
                <span style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>
                  {ownerInfo.name} ({ownerInfo.relation || "Self"})
                </span>
              </div>
            </div>

            <div>
              <div className="doc-vault-dossier-label">Physical Location</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: THEME.accent }}>
                <MapPin size={13} />
                {doc.location || "Bank Locker"}
              </div>
            </div>

            <div>
              <div className="doc-vault-dossier-label">Issue Date</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>
                {doc.issueDate ? formatDate(doc.issueDate) : "—"}
              </div>
            </div>

            <div>
              <div className="doc-vault-dossier-label">Expiry Date</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>
                {doc.expiryDate ? formatDate(doc.expiryDate) : "Lifetime / Permanent"}
              </div>
            </div>

            {days !== null && (
              <div>
                <div className="doc-vault-dossier-label">Validity Status</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: days < 0 ? THEME.rust : days <= 30 ? THEME.gold : THEME.sage }}>
                  {days < 0
                    ? `Expired ${Math.abs(days)} days ago`
                    : days === 0
                      ? "Expires Today!"
                      : `${days} days remaining`}
                </div>
              </div>
            )}

            {linkedAssetLabel && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="doc-vault-dossier-label">Linked Financial Asset</div>
                <div className="doc-vault-linked-asset-pill">
                  <Link2 size={13} color={THEME.accent} />
                  <span>
                    {LINKED_ASSET_TYPES.find((t) => t.id === doc.linkedAssetType)?.label}: <strong>{linkedAssetLabel}</strong>
                  </span>
                </div>
              </div>
            )}

            {doc.filePath && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="doc-vault-dossier-label">Attached Encrypted File</div>
                <div className="doc-vault-attached-file-box">
                  <Paperclip size={14} color={THEME.accent} />
                  <span style={{ fontWeight: 600, flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {fileNameFromPath(doc.filePath)}
                  </span>
                  {doc.fileSize && (
                    <span style={{ color: THEME.muted, fontSize: 11 }}>({formatBytes(doc.fileSize)})</span>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenDoc(doc)}
                    icon={<ExternalLink size={12} />}
                    style={{ fontSize: 11, padding: "3px 8px" }}
                  >
                    Open
                  </Button>
                </div>
              </div>
            )}

            {Array.isArray(doc.tags) && doc.tags.length > 0 && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div className="doc-vault-dossier-label">Tags</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {doc.tags.map((t: string) => (
                    <Badge key={t} variant="muted" style={{ fontSize: 10 }}>
                      #{t}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          {doc.notes && (
            <div>
              <div className="doc-vault-dossier-label">Notes & Physical Storage Info</div>
              <div className="notepad-notes-box">{doc.notes}</div>
            </div>
          )}

          {/* Dossier Footer Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1.5px solid ${THEME.line}`, paddingTop: 16, flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setViewDocId(null);
                  openEditModal(doc);
                }}
                icon={<Pencil size={12} />}
              >
                Edit
              </Button>
              {days !== null && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setViewDocId(null);
                    openRenewModal(doc);
                  }}
                  icon={<RefreshCw size={12} />}
                  style={{ color: THEME.sage, borderColor: THEME.sage }}
                >
                  Renew
                </Button>
              )}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {(doc.url || doc.filePath) && (
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => handleOpenDoc(doc)}
                  icon={<ExternalLink size={12} />}
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
                icon={<Trash2 size={12} />}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    );
  };

  // Smart Renew Modal
  const renderRenewModal = () => {
    if (!renewDoc) return null;

    return (
      <Modal
        title="Renew Document Expiry"
        onClose={() => {
          setRenewDoc(null);
          setRenewDate("");
        }}
        maxWidth={420}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
            Target Document
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: THEME.ink, marginTop: 2 }}>
            {renewDoc.name}
          </div>
          {renewDoc.expiryDate && (
            <div style={{ fontSize: 12, color: THEME.rust, marginTop: 4, fontWeight: 600 }}>
              Current Expiry: {formatDate(renewDoc.expiryDate)}
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

        {/* Quick Expiry Add Stepper Buttons */}
        <div style={{ marginTop: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, marginBottom: 6 }}>
            Quick Presets:
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
                  const todayStr = todayFn();
                  const base =
                    renewDoc.expiryDate && renewDoc.expiryDate >= todayStr
                      ? renewDoc.expiryDate
                      : todayStr;
                  setRenewDate(addMonthsToDateStr(base, btn.val * 12));
                }}
                className="doc-vault-preset-btn"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        <ModalActions
          onSave={handleRenewSave}
          onClose={() => {
            setRenewDoc(null);
            setRenewDate("");
          }}
          saveLabel="Save Expiry"
          disabled={!renewDate}
        />
      </Modal>
    );
  };

  // ── Main Render Structure ─────────────────────────────────────────────────
  return (
    <div className="doc-vault-container">
      {/* Styles */}
      <style>{`
        .doc-vault-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .doc-vault-deck-nav {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow-x: auto;
          scrollbar-width: none;
          padding-bottom: 2px;
          border-bottom: 1.5px solid var(--t-line);
          margin-bottom: 4px;
        }
        .doc-vault-deck-nav::-webkit-scrollbar { display: none; }
        .doc-vault-deck-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          font-size: 13px;
          font-weight: 700;
          color: var(--t-muted);
          background: transparent;
          border: none;
          border-bottom: 2.5px solid transparent;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          white-space: nowrap;
          border-radius: 6px 6px 0 0;
        }
        .doc-vault-deck-btn:hover {
          color: var(--t-ink);
          background: color-mix(in srgb, var(--t-line) 40%, transparent);
        }
        .doc-vault-deck-btn.active {
          color: var(--t-accent);
          border-bottom-color: var(--t-accent);
          background: color-mix(in srgb, var(--t-accent) 8%, transparent);
        }
        .doc-vault-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }
        .doc-vault-category-ribbon {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          scrollbar-width: none;
          padding: 4px 2px 8px;
        }
        .doc-vault-category-ribbon::-webkit-scrollbar { display: none; }
        .doc-vault-category-card {
          flex: 0 0 130px;
          padding: 12px 10px;
          border-radius: 12px;
          background: var(--surface-0);
          border: 1.5px solid var(--t-line);
          display: flex;
          flex-direction: column;
          align-items: center;
          justifyContent: center;
          gap: 6px;
          cursor: pointer;
          position: relative;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .doc-vault-category-card:hover {
          border-color: var(--cat-color);
          transform: translateY(-2px);
        }
        .doc-vault-category-card.active {
          border-color: var(--cat-color);
          background: color-mix(in srgb, var(--cat-color) 8%, var(--surface-0));
          box-shadow: 0 4px 16px color-mix(in srgb, var(--cat-color) 15%, transparent);
        }
        .doc-vault-category-card-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--t-ink);
          text-align: center;
        }
        .doc-vault-category-card-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          background: var(--t-accent);
          color: #fff;
          font-size: 9px;
          font-weight: 800;
          padding: 2px 6px;
          border-radius: 10px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .doc-vault-toolbar-container {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .doc-vault-search-box {
          flex: 1.2;
          min-width: 220px;
          position: relative;
        }
        .doc-vault-search-icon {
          position: absolute;
          left: 11px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--t-muted);
          pointer-events: none;
        }
        .doc-vault-search-input {
          width: 100%;
          padding: 8px 12px 8px 34px;
          font-size: 12.5px;
          font-weight: 500;
          border-radius: 8px;
          border: 1.5px solid var(--t-line);
          background: var(--surface-1);
          color: var(--t-ink);
          outline: none;
          transition: all 0.2s;
        }
        .doc-vault-search-input:focus {
          border-color: var(--t-accent);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--t-accent) 12%, transparent);
        }
        .doc-vault-search-clear {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          border: none;
          background: transparent;
          color: var(--t-muted);
          cursor: pointer;
          padding: 3px;
        }
        .doc-vault-filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .doc-vault-select-filter {
          padding: 7px 10px;
          font-size: 11.5px;
          font-weight: 600;
          border-radius: 8px;
          border: 1.5px solid var(--t-line);
          background: var(--surface-1);
          color: var(--t-ink);
          outline: none;
          cursor: pointer;
          transition: all 0.15s;
        }
        .doc-vault-select-filter:focus {
          border-color: var(--t-accent);
        }
        .doc-vault-right-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
        }
        .doc-vault-btn-icon {
          padding: 7px 10px;
          border-radius: 8px;
          border: 1.5px solid var(--t-line);
          background: var(--surface-1);
          color: var(--t-muted);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .doc-vault-btn-icon:hover {
          color: var(--t-ink);
          border-color: var(--t-accent);
        }
        .doc-vault-view-toggle {
          display: flex;
          border-radius: 8px;
          border: 1.5px solid var(--t-line);
          overflow: hidden;
          background: var(--surface-1);
        }
        .doc-vault-view-toggle-btn {
          padding: 6px 10px;
          border: none;
          background: transparent;
          color: var(--t-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: all 0.15s;
        }
        .doc-vault-view-toggle-btn.active {
          background: color-mix(in srgb, var(--t-accent) 15%, transparent);
          color: var(--t-accent);
        }
        .doc-vault-active-pills-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px dashed var(--t-line);
          flex-wrap: wrap;
        }
        .doc-vault-clear-all-link {
          font-size: 11px;
          color: var(--t-rust);
          font-weight: 700;
          background: none;
          border: none;
          cursor: pointer;
          text-decoration: underline;
          padding: 2px 4px;
        }
        .doc-vault-doc-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(285px, 1fr));
          gap: 16px;
        }
        .doc-vault-card {
          position: relative;
          background: var(--surface-0);
          border: 1.5px solid var(--t-line);
          border-radius: 14px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          cursor: pointer;
        }
        .doc-vault-card:hover {
          border-color: var(--cat-color);
          box-shadow: 0 8px 24px color-mix(in srgb, var(--cat-color) 12%, transparent);
          transform: translateY(-2px);
        }
        .doc-vault-card.selected {
          border-color: var(--t-accent);
          box-shadow: 0 0 0 2px var(--t-accent);
        }
        .doc-vault-card-action-btn {
          flex: 1;
          padding: 8px 0;
          border: none;
          background: transparent;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          font-size: 10.5px;
          font-weight: 700;
          transition: background 0.15s;
          border-left: 1px solid var(--t-line);
        }
        .doc-vault-card-action-btn:first-child { border-left: none; }
        .doc-vault-card-action-btn:hover {
          background: color-mix(in srgb, var(--t-line) 40%, transparent);
        }
        .doc-vault-card-action-btn.danger:hover {
          background: color-mix(in srgb, var(--t-rust) 12%, transparent);
        }
        .doc-vault-table-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          border-bottom: 2px solid var(--t-line);
          font-size: 11px;
          font-weight: 700;
          color: var(--t-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          background: var(--surface-1);
        }
        .doc-vault-table-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 16px;
          border-bottom: 1px solid var(--t-line);
          transition: background 0.15s;
          cursor: pointer;
        }
        .doc-vault-table-row:hover {
          background: color-mix(in srgb, var(--t-accent) 4%, var(--surface-0));
        }
        .doc-vault-table-row.selected {
          background: color-mix(in srgb, var(--t-accent) 8%, var(--surface-0));
        }
        .doc-vault-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2px 14px;
        }
        .doc-vault-dropzone {
          border: 2px dashed var(--t-line);
          border-radius: 10px;
          padding: 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          background: var(--surface-1);
          transition: all 0.2s ease;
        }
        .doc-vault-dropzone:hover, .doc-vault-dropzone.dragging {
          border-color: var(--t-accent);
          background: color-mix(in srgb, var(--t-accent) 6%, var(--surface-1));
        }
        .doc-vault-file-chip {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 8px;
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
        }
        .doc-vault-file-chip-view {
          font-size: 11px;
          font-weight: 700;
          color: var(--t-accent);
          cursor: pointer;
          background: none;
          border: none;
          padding: 2px 6px;
        }
        .doc-vault-file-chip-remove {
          border: none;
          background: transparent;
          color: var(--t-muted);
          cursor: pointer;
          padding: 2px;
        }
        .doc-vault-file-chip-remove:hover { color: var(--t-rust); }
        .doc-vault-textarea {
          width: 100%;
          padding: 8px 12px;
          font-size: 13px;
          font-weight: 500;
          border-radius: 8px;
          border: 1.5px solid var(--t-line);
          background: var(--surface-0);
          color: var(--t-ink);
          outline: none;
          font-family: inherit;
        }
        .doc-vault-textarea:focus {
          border-color: var(--t-accent);
        }
        .doc-vault-dossier-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px 20px;
          padding: 16px 18px;
          border-radius: 12px;
          background: var(--surface-1);
          border: 1.5px solid var(--t-line);
        }
        .doc-vault-dossier-label {
          font-size: 10.5px;
          font-weight: 700;
          color: var(--t-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }
        .doc-vault-linked-asset-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 8px;
          background: var(--surface-0);
          border: 1px solid var(--t-line);
          font-size: 12px;
          color: var(--t-ink);
        }
        .doc-vault-attached-file-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 8px;
          background: var(--surface-0);
          border: 1px solid var(--t-line);
          font-size: 12px;
        }
        .doc-vault-preset-btn {
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 700;
          border-radius: 6px;
          border: 1px solid var(--t-line);
          background: var(--surface-1);
          color: var(--t-ink);
          cursor: pointer;
          transition: all 0.15s;
        }
        .doc-vault-preset-btn:hover {
          border-color: var(--t-accent);
          background: color-mix(in srgb, var(--t-accent) 8%, var(--surface-1));
        }
        .doc-vault-renewal-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }
        .doc-vault-renewal-card {
          padding: 12px 14px;
          border-radius: 10px;
          background: var(--surface-1);
          border: 1.5px solid var(--t-line);
        }
        .doc-vault-renewal-card.expired {
          border-color: color-mix(in srgb, var(--t-rust) 40%, transparent);
          background: color-mix(in srgb, var(--t-rust) 4%, var(--surface-1));
        }
        .doc-vault-renewal-card.warning {
          border-color: color-mix(in srgb, var(--t-gold) 40%, transparent);
          background: color-mix(in srgb, var(--t-gold) 4%, var(--surface-1));
        }
        .doc-vault-matrix-header-panel {
          display: flex;
          gap: 16px;
        }
        .doc-vault-floating-batch-bar {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--surface-0);
          border: 1.5px solid var(--t-accent);
          box-shadow: 0 12px 32px rgba(0,0,0,0.3);
          border-radius: 12px;
          padding: 10px 18px;
          display: flex;
          align-items: center;
          gap: 16px;
          z-index: 100;
          animation: slide-up 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slide-up {
          from { transform: translate(-50%, 20px); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        .notepad-notes-box {
          padding: 12px 16px;
          border-radius: 8px;
          background: var(--surface-1);
          border: 1px solid var(--t-line);
          font-size: 12.5px;
          color: var(--t-ink);
          white-space: pre-wrap;
          line-height: 1.5;
        }
        .status-pulse-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          background-color: currentColor;
          position: relative;
        }
        .status-pulse-dot::after {
          content: '';
          position: absolute;
          top: -3px; left: -3px; right: -3px; bottom: -3px;
          border-radius: 50%;
          border: 2px solid currentColor;
          opacity: 0;
          animation: pulse-ring 1.8s infinite;
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.35); opacity: 0.8; }
          80%, 100% { transform: scale(1.3); opacity: 0; }
        }
        .copy-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--t-muted);
          border-radius: 4px;
        }
        .copy-btn:hover { color: var(--t-accent); }
        .doc-vault-list-hover:hover {
          background: var(--surface-1);
        }
        @media (max-width: 840px) {
          .doc-vault-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }
          .doc-vault-matrix-header-panel { flex-direction: column; }
          .doc-vault-form-grid { grid-template-columns: 1fr; }
          .doc-vault-form-grid [style*="grid-column"] { grid-column: auto !important; }
          .doc-vault-hide-mobile { display: none !important; }
        }
        @media (max-width: 480px) {
          .doc-vault-stats-grid { grid-template-columns: 1fr 1fr; }
          .doc-vault-doc-grid { grid-template-columns: 1fr; }
          .doc-vault-floating-batch-bar { width: 92%; justify-content: space-between; }
        }
      `}</style>

      {/* Section Title & Primary Action */}
      <SectionTitle
        sub="Store, organize, and monitor all personal, financial, and family credentials in one high-security digital fortress."
        rightElement={
          <Button variant="accent" icon={<Plus size={14} />} onClick={() => openAddModal()}>
            Add Document
          </Button>
        }
      >
        Document Vault & Fortress
      </SectionTitle>

      {/* Executive Key Metric Ribbon */}
      <div className="doc-vault-stats-grid">
        <StatCard
          label="Secured Documents"
          value={String(stats.total)}
          numericValue={stats.total}
          formatValue={(n: number) => String(Math.round(n))}
          sub={`${stats.withFiles} files uploaded`}
          icon={<FileText />}
          color={THEME.accent}
        />
        <StatCard
          label="Vault Health Rate"
          value={`${stats.healthPercentage}%`}
          numericValue={stats.healthPercentage}
          formatValue={(n: number) => `${Math.round(n)}%`}
          sub={stats.expired > 0 ? `${stats.expired} expired` : "all valid"}
          subColor={stats.expired > 0 ? THEME.rust : THEME.sage}
          icon={<ShieldCheck />}
          color={THEME.sage}
        />
        <StatCard
          label="Attention Required"
          value={String(stats.expiringSoon + stats.expired)}
          numericValue={stats.expiringSoon + stats.expired}
          formatValue={(n: number) => String(Math.round(n))}
          sub={stats.expiringSoon > 0 ? `${stats.expiringSoon} within 30d` : "no urgent items"}
          subColor={stats.expiringSoon > 0 ? THEME.gold : undefined}
          icon={<Clock />}
          color={THEME.gold}
        />
        <StatCard
          label="Asset Link Coverage"
          value={`${coverageMetrics.percentage}%`}
          numericValue={coverageMetrics.percentage}
          formatValue={(n: number) => `${Math.round(n)}%`}
          sub={`${coverageMetrics.linked} of ${coverageMetrics.total} assets`}
          icon={<Link2 />}
          color={THEME.cyan}
        />
      </div>

      {/* 5-Pillar Command Deck Navigation */}
      <div className="doc-vault-deck-nav">
        <button
          onClick={() => setActiveDeckTab("explorer")}
          className={`doc-vault-deck-btn ${activeDeckTab === "explorer" ? "active" : ""}`}
        >
          <FolderOpen size={15} />
          <span>Vault Explorer</span>
        </button>

        <button
          onClick={() => setActiveDeckTab("renewals")}
          className={`doc-vault-deck-btn ${activeDeckTab === "renewals" ? "active" : ""}`}
        >
          <Clock size={15} />
          <span>Expiry & Renewals</span>
          {(stats.expiringSoon > 0 || stats.expired > 0) && (
            <Badge variant={stats.expired > 0 ? "rust" : "gold"} style={{ fontSize: 9, padding: "1px 5px" }}>
              {stats.expiringSoon + stats.expired}
            </Badge>
          )}
        </button>

        <button
          onClick={() => setActiveDeckTab("matrix")}
          className={`doc-vault-deck-btn ${activeDeckTab === "matrix" ? "active" : ""}`}
        >
          <Link2 size={15} />
          <span>Asset Link Matrix</span>
          <Badge variant="accent" style={{ fontSize: 9, padding: "1px 5px" }}>
            {coverageMetrics.percentage}%
          </Badge>
        </button>

        <button
          onClick={() => setActiveDeckTab("family")}
          className={`doc-vault-deck-btn ${activeDeckTab === "family" ? "active" : ""}`}
        >
          <Users size={15} />
          <span>Family Dossiers</span>
        </button>

        <button
          onClick={() => setActiveDeckTab("lockers")}
          className={`doc-vault-deck-btn ${activeDeckTab === "lockers" ? "active" : ""}`}
        >
          <MapPin size={15} />
          <span>Physical Lockers & Storage</span>
        </button>
      </div>

      {/* Sub-View Render Body */}
      {activeDeckTab === "explorer" && renderExplorerView()}
      {activeDeckTab === "renewals" && renderRenewalsView()}
      {activeDeckTab === "matrix" && renderMatrixView()}
      {activeDeckTab === "family" && renderFamilyDossiersView()}
      {activeDeckTab === "lockers" && renderLockersView()}

      {/* Floating Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="doc-vault-floating-batch-bar">
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Badge variant="accent" style={{ fontSize: 11, padding: "3px 8px" }}>
              {selectedIds.size}
            </Badge>
            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
              Document(s) Selected
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Button
              variant="secondary"
              size="sm"
              icon={<Download size={12} />}
              onClick={() => {
                const selectedDocs = documents.filter((d) => selectedIds.has(d.id));
                handleExportCsv(selectedDocs);
              }}
            >
              Export CSV
            </Button>

            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 size={12} />}
              onClick={() => setBatchConfirmDelete(true)}
            >
              Delete Selected
            </Button>

            <button
              onClick={clearSelection}
              aria-label="Clear selected documents"
              style={{ background: "none", border: "none", color: THEME.muted, cursor: "pointer", padding: 4 }}
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {showModal && renderAddEditModal()}
      {renderDetailModal()}
      {renderRenewModal()}

      {/* Confirm Single Delete Dialog */}
      {confirmDeleteId && (
        <ConfirmDialog
          message={`Are you sure you want to permanently delete "${documents.find((d) => d.id === confirmDeleteId)?.name || "this document"}" from the vault? Attached storage files will also be removed.`}
          onConfirm={() => performDelete(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}

      {/* Confirm Batch Delete Dialog */}
      {batchConfirmDelete && (
        <ConfirmDialog
          message={`Are you sure you want to permanently delete ${selectedIds.size} selected documents from the vault? This cannot be undone.`}
          onConfirm={performBatchDelete}
          onCancel={() => setBatchConfirmDelete(false)}
        />
      )}
    </div>
  );
};
