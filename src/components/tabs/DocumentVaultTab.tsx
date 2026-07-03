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
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { uid, today as todayFn } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field, Input, Select } from "../ui/Form";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { Prv } from "../../context/PrivacyContext";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";

// ─────────────────────────────────────────────────────────────────────────────
// Category definitions
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = {
  Identity: {
    icon: Fingerprint,
    color: "#6366F1",
    gradient: "linear-gradient(135deg, #6366F1 0%, #818CF8 100%)",
    subcategories: ["PAN Card", "Aadhaar", "Passport", "Voter ID", "Driving License"],
  },
  Financial: {
    icon: Landmark,
    color: "#059669",
    gradient: "linear-gradient(135deg, #059669 0%, #34D399 100%)",
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
    color: "#0EA5E9",
    gradient: "linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)",
    subcategories: ["Policy Document", "Claim Form", "Medical Report", "Other"],
  },
  Property: {
    icon: Home,
    color: "#D97706",
    gradient: "linear-gradient(135deg, #D97706 0%, #FBBF24 100%)",
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
    color: "#EF4444",
    gradient: "linear-gradient(135deg, #EF4444 0%, #F87171 100%)",
    subcategories: ["RC Book", "Insurance", "PUC Certificate", "Service Record", "Other"],
  },
  Legal: {
    icon: Scale,
    color: "#8B5CF6",
    gradient: "linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)",
    subcategories: ["Will", "Power of Attorney", "Trust Deed", "Partnership Deed", "Other"],
  },
  Other: {
    icon: Folder,
    color: "#64748B",
    gradient: "linear-gradient(135deg, #64748B 0%, #94A3B8 100%)",
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
      return { label: "Expired", variant: "rust" as const, color: "#EF4444" };
    case "expiring":
      return { label: "Expiring Soon", variant: "gold" as const, color: "#D97706" };
    case "valid":
      return { label: "Valid", variant: "sage" as const, color: "#059669" };
    default:
      return { label: "No Expiry", variant: "muted" as const, color: "#64748B" };
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

function getCategoryColor(category: string) {
  const cat = CATEGORIES[category as CategoryKey];
  return cat ? cat.color : "#64748B";
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
  transition: "background 0.15s, color 0.15s",
};

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export const DocumentVaultTab = ({ state, addItem, removeItem, updateItem }) => {
  const { familyProfiles } = useMasterData();
  const documents: any[] = state.documents || [];

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
      if (typeId === "insurance") {
        insuranceTotal =
          (state.lic || []).length +
          (state.termPlans || []).length +
          (state.investmentPlans || []).length;
      }

      const linkedDocIds = new Set(
        documents
          .filter((d) => d.linkedAssetType === typeId && d.linkedAsset)
          .map((d) => d.linkedAsset)
      );

      links.push({
        type: typeId,
        label: info.label,
        total: typeId === "insurance" ? insuranceTotal : assets.length,
        linked: linkedDocIds.size,
      });
    }

    return links.filter((l) => l.total > 0);
  }, [state, documents]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const openAddModal = () => {
    setForm({ ...EMPTY_DOC });
    setEditId(null);
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
    });
    setEditId(doc.id);
    setShowModal(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const payload = {
      ...form,
      name: form.name.trim(),
      documentNumber: form.documentNumber.trim(),
      issuer: form.issuer.trim(),
      notes: form.notes.trim(),
      url: form.url.trim(),
    };

    if (editId) {
      updateItem("documents", editId, payload);
    } else {
      addItem("documents", { id: uid(), ...payload });
    }
    setShowModal(false);
    setEditId(null);
  };

  const handleDelete = (id: string) => {
    if (confirm("Delete this document?")) {
      removeItem("documents", id);
    }
  };

  const openRenewModal = (doc: any) => {
    setRenewDoc(doc);
    setRenewDate("");
  };

  const handleRenewSave = () => {
    if (renewDoc && renewDate && /^\d{4}-\d{2}-\d{2}$/.test(renewDate)) {
      updateItem("documents", renewDoc.id, { expiryDate: renewDate });
      setRenewDoc(null);
      setRenewDate("");
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
      if (key === "linkedAssetType") next.linkedAsset = "";
      return next;
    });
  };

  const linkedAssetOptions = useMemo(
    () => (form.linkedAssetType ? getLinkedAssets(state, form.linkedAssetType) : []),
    [state, form.linkedAssetType]
  );

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
          onAdd={openAddModal}
        />
        {showModal && renderModal()}
      </div>
    );
  }

  // ── Category icon badge ─────────────────────────────────────────────────
  function CategoryIconBadge({ category, size = 36 }: { category: string; size?: number }) {
    const Icon = getCategoryIcon(category);
    const color = getCategoryColor(category);
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 10,
          background: `color-mix(in srgb, ${color} 12%, transparent)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: color,
          flexShrink: 0,
        }}
      >
        <Icon size={size * 0.5} />
      </div>
    );
  }

  // ── Document card (grid mode) ───────────────────────────────────────────
  function DocCard({ doc }: { doc: any }) {
    const status = getDocStatus(doc.expiryDate);
    const badge = statusBadge(status);
    const days = daysUntilExpiry(doc.expiryDate);
    const catColor = getCategoryColor(doc.category);

    return (
      <Card
        className="card-lift"
        style={{
          padding: 0,
          overflow: "hidden",
          borderTop: `3px solid ${catColor}`,
        }}
      >
        <div style={{ padding: "16px 18px" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 12 }}>
            <CategoryIconBadge category={doc.category} size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 4,
                  flexWrap: "wrap",
                }}
              >
                <Badge variant={badge.variant} style={{ fontSize: 10 }}>
                  {badge.label}
                </Badge>
                {doc.subcategory && (
                  <span style={{ fontSize: 11, color: THEME.muted }}>{doc.subcategory}</span>
                )}
              </div>
            </div>
          </div>

          {/* Details */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }}>
            {doc.documentNumber && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: THEME.muted }}>
                <Hash size={12} style={{ flexShrink: 0 }} />
                <span
                  style={{ color: THEME.ink, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
                >
                  <Prv>{doc.documentNumber}</Prv>
                </span>
              </div>
            )}
            {doc.issuer && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: THEME.muted }}>
                <Building size={12} style={{ flexShrink: 0 }} />
                <span
                  style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                >
                  {doc.issuer}
                </span>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 6, color: THEME.muted }}>
              <Calendar size={12} style={{ flexShrink: 0 }} />
              <span>
                {doc.issueDate ? formatDate(doc.issueDate) : "--"}
                {doc.expiryDate ? ` to ${formatDate(doc.expiryDate)}` : ""}
              </span>
            </div>
            {days !== null && days <= 30 && days >= 0 && (
              <div style={{ fontSize: 11, color: "#D97706", fontWeight: 600, marginTop: 2 }}>
                {days === 0 ? "Expires today" : `${days} day${days === 1 ? "" : "s"} remaining`}
              </div>
            )}
            {days !== null && days < 0 && (
              <div style={{ fontSize: 11, color: "#EF4444", fontWeight: 600, marginTop: 2 }}>
                Expired {Math.abs(days)} day{Math.abs(days) === 1 ? "" : "s"} ago
              </div>
            )}
          </div>

          {/* Owner */}
          {doc.owner && (
            <div style={{ marginTop: 10 }}>
              <Badge variant="muted" style={{ fontSize: 10, textTransform: "capitalize" }}>
                {familyProfiles.find((p) => p.id === doc.owner)?.name || doc.owner}
              </Badge>
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            borderTop: `1px solid ${THEME.line}`,
            background: "var(--surface-0)",
          }}
        >
          {doc.url && (
            <button
              onClick={() => window.open(doc.url, "_blank")}
              className="card-lift"
              style={{
                flex: 1,
                padding: "9px 0",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                fontSize: 11,
                fontWeight: 600,
                color: THEME.accent,
                transition: "background 0.15s",
              }}
            >
              <ExternalLink size={12} />
              Open
            </button>
          )}
          <button
            onClick={() => openEditModal(doc)}
            className="card-lift"
            style={{
              flex: 1,
              padding: "9px 0",
              border: "none",
              borderLeft: doc.url ? `1px solid ${THEME.line}` : "none",
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              fontSize: 11,
              fontWeight: 600,
              color: THEME.muted,
              transition: "background 0.15s",
            }}
          >
            <Pencil size={12} />
            Edit
          </button>
          <button
            onClick={() => handleDelete(doc.id)}
            className="card-lift"
            style={{
              flex: 1,
              padding: "9px 0",
              border: "none",
              borderLeft: `1px solid ${THEME.line}`,
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
              fontSize: 11,
              fontWeight: 600,
              color: THEME.rust,
              transition: "background 0.15s",
            }}
          >
            <Trash2 size={12} />
            Delete
          </button>
        </div>
      </Card>
    );
  }

  // ── Document row (list mode) ────────────────────────────────────────────
  function DocRow({ doc }: { doc: any }) {
    const status = getDocStatus(doc.expiryDate);
    const badge = statusBadge(status);

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          borderBottom: `1px solid ${THEME.line}`,
          transition: "background 0.15s",
        }}
        className="card-lift"
      >
        <CategoryIconBadge category={doc.category} size={32} />
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
          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
            {doc.category}
            {doc.subcategory ? ` / ${doc.subcategory}` : ""}
            {doc.documentNumber ? (
              <>
                {" "}
                | <Prv>{doc.documentNumber}</Prv>
              </>
            ) : (
              ""
            )}
          </div>
        </div>
        {/* Desktop-only columns */}
        <div className="doc-vault-list-meta" style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 11, color: THEME.muted }}>{doc.issuer || "--"}</div>
          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
            {doc.expiryDate ? formatDate(doc.expiryDate) : "No expiry"}
          </div>
        </div>
        <Badge variant={badge.variant} style={{ fontSize: 10, flexShrink: 0 }}>
          {badge.label}
        </Badge>
        <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
          {doc.url && (
            <button
              onClick={() => window.open(doc.url, "_blank")}
              aria-label="Open link"
              style={{ ...actionBtnBase, color: THEME.accent }}
            >
              <ExternalLink size={14} />
            </button>
          )}
          <button
            onClick={() => openEditModal(doc)}
            aria-label="Edit document"
            style={{ ...actionBtnBase, color: THEME.muted }}
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => handleDelete(doc.id)}
            aria-label="Delete document"
            style={{ ...actionBtnBase, color: THEME.rust }}
          >
            <Trash2 size={14} />
          </button>
        </div>
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

  // ── Main Modal ─────────────────────────────────────────────────────────
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
          disabled={!form.name.trim()}
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
        .doc-vault-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 24px;
        }
        .doc-vault-cat-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
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
        .doc-vault-coverage-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 12px;
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
          .doc-vault-toolbar { flex-wrap: wrap; gap: 8px; }
          .doc-vault-toolbar-search { min-width: 100%; order: -1; }
          .doc-vault-sort-group { flex-wrap: wrap; }
          .doc-vault-doc-grid { grid-template-columns: 1fr; gap: 12px; }
          .doc-vault-coverage-grid { grid-template-columns: repeat(2, 1fr); }
          .doc-vault-alert-row { padding: 10px 14px; gap: 8px; flex-wrap: wrap; }
          .doc-vault-alert-meta { width: 100%; justify-content: flex-end; gap: 6px; margin-top: 4px; }
          .doc-vault-list-meta { display: none !important; }
          .doc-vault-list-header { display: none !important; }
        }
        @media (max-width: 480px) {
          .doc-vault-stats-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
          .doc-vault-sort-group { gap: 3px; }
          .doc-vault-coverage-grid { grid-template-columns: 1fr; }
          .doc-vault-cat-pills { gap: 6px; }
        }
      `}</style>

      {/* Section Title */}
      <SectionTitle
        sub="Store, organize and track all your important documents in one secure vault."
        rightElement={
          <Button variant="accent" icon={<Plus size={14} />} onClick={openAddModal}>
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
          icon={<FileText />}
          color="#6366F1"
        />
        <StatCard
          label="Expiring Soon"
          value={String(stats.expiringSoon)}
          sub="within 30 days"
          subColor={stats.expiringSoon > 0 ? "#D97706" : undefined}
          icon={<Clock />}
          color="#D97706"
        />
        <StatCard
          label="Expired"
          value={String(stats.expired)}
          sub={stats.expired > 0 ? "needs attention" : "all clear"}
          subColor={stats.expired > 0 ? "#EF4444" : "#059669"}
          icon={<AlertTriangle />}
          color="#EF4444"
        />
        <StatCard
          label="Categories"
          value={String(Object.keys(stats.catCounts).length)}
          sub={`of ${CATEGORY_KEYS.length} used`}
          icon={<FolderOpen />}
          color="#059669"
        />
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
          Categories
        </div>
        <div className="doc-vault-cat-pills">
          <button
            onClick={() => setFilterCategory("all")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              borderRadius: 20,
              border: `1.5px solid ${filterCategory === "all" ? THEME.accent : THEME.line}`,
              background:
                filterCategory === "all"
                  ? `color-mix(in srgb, ${THEME.accent} 8%, transparent)`
                  : "transparent",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              color: filterCategory === "all" ? THEME.accent : THEME.muted,
              transition: "all 0.2s",
            }}
          >
            <Folder size={14} />
            All ({stats.total})
          </button>
          {CATEGORY_KEYS.map((cat) => {
            const catDef = CATEGORIES[cat];
            const Icon = catDef.icon;
            const count = stats.catCounts[cat] || 0;
            const isActive = filterCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setFilterCategory(isActive ? "all" : cat)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: `1.5px solid ${isActive ? catDef.color : THEME.line}`,
                  background: isActive
                    ? `color-mix(in srgb, ${catDef.color} 8%, transparent)`
                    : "transparent",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  color: isActive ? catDef.color : THEME.muted,
                  transition: "all 0.2s",
                  opacity: count === 0 && !isActive ? 0.5 : 1,
                }}
              >
                <Icon size={14} />
                {cat} ({count})
              </button>
            );
          })}
        </div>
      </Card>

      {/* ── Expiry Alerts ────────────────────────────────────────────────── */}
      {expiryAlerts.length > 0 && (
        <Card style={{ padding: 0, marginBottom: 24, overflow: "hidden" }}>
          <button
            onClick={() => setExpandedAlerts((e) => !e)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
              border: "none",
              background: "color-mix(in srgb, #EF4444 6%, transparent)",
              cursor: "pointer",
              borderBottom: expandedAlerts ? `1px solid ${THEME.line}` : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={16} color="#EF4444" />
              <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>Expiry Alerts</span>
              <Badge variant="rust" style={{ fontSize: 10 }}>
                {expiryAlerts.length}
              </Badge>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <select
                value={expiryFilter}
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
          </button>
          {expandedAlerts && (
            <div style={{ maxHeight: 300, overflow: "auto" }}>
              {expiryAlerts.map((doc) => {
                const days = daysUntilExpiry(doc.expiryDate);
                const isExpired = days !== null && days < 0;
                return (
                  <div key={doc.id} className="doc-vault-alert-row">
                    <CategoryIconBadge category={doc.category} size={28} />
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
                              color: isExpired ? "#EF4444" : days <= 30 ? "#D97706" : THEME.muted,
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
                        style={{ color: "#059669", borderColor: "#059669" }}
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

      {/* ── Quick Links ──────────────────────────────────────────────────── */}
      {quickLinks.length > 0 && (
        <Card style={{ padding: "18px 24px", marginBottom: 24 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: THEME.ink,
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Link2 size={16} color={THEME.accent} />
            Asset Document Coverage
          </div>
          <div className="doc-vault-coverage-grid">
            {quickLinks.map((link) => {
              const pct = link.total > 0 ? Math.round((link.linked / link.total) * 100) : 0;
              return (
                <div
                  key={link.type}
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-0)",
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: THEME.ink, marginBottom: 6 }}>
                    {link.label}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          borderRadius: 3,
                          background: pct === 100 ? "#059669" : THEME.accent,
                          transition: "width 0.3s",
                        }}
                      />
                    </div>
                    <span
                      style={{ fontSize: 11, fontWeight: 600, color: THEME.muted, flexShrink: 0 }}
                    >
                      {link.linked}/{link.total}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
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
          <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 300, margin: "0 auto" }}>
            Try adjusting your search or filter criteria
          </div>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="doc-vault-doc-grid">
          {filteredDocs.map((doc) => (
            <DocCard key={doc.id} doc={doc} />
          ))}
        </div>
      ) : (
        <Card style={{ padding: 0, overflow: "hidden" }}>
          {/* List header — hidden on mobile via CSS */}
          <div className="doc-vault-list-header">
            <div style={{ width: 32 }} />
            <div style={{ flex: 1 }}>Document</div>
            <div style={{ width: 140, textAlign: "right" }}>Issuer / Expiry</div>
            <div style={{ width: 90, textAlign: "center" }}>Status</div>
            <div style={{ width: 90, textAlign: "center" }}>Actions</div>
          </div>
          {filteredDocs.map((doc) => (
            <DocRow key={doc.id} doc={doc} />
          ))}
        </Card>
      )}

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {showModal && renderModal()}
      {renderRenewModal()}
    </div>
  );
};
