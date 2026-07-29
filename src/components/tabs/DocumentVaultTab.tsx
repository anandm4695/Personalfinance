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

// Custom function to return theme profiles structure
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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewDocId, setViewDocId] = useState<string | null>(null);

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
                      background: cat.gradient,
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

  // ── Family Initial Avatar ───────────────────────────────────────────────
  function OwnerAvatar({ ownerId, size = 26 }: { ownerId: string; size?: number }) {
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
  function DocCard({ doc }: { doc: any }) {
    const status = getDocStatus(doc.expiryDate);
    const badge = statusBadge(status);
    const days = daysUntilExpiry(doc.expiryDate);
    const cat = CATEGORIES[doc.category as CategoryKey] || CATEGORIES.Other;
    const ownerInfo = getOwnerAvatarInfo(doc.owner);
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
        onClick={() => setViewDocId(doc.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setViewDocId(doc.id);
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
            height: 12,
            background: cat.gradient,
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
                width: 36,
                height: 36,
                borderRadius: 8,
                background: `color-mix(in srgb, ${cat.color} 12%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: cat.color,
                flexShrink: 0,
              }}
            >
              {React.createElement(cat.icon, { size: 18 })}
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
                  onClick={(e) => handleCopy(doc.id, doc.documentNumber, e)}
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
              <OwnerAvatar ownerId={doc.owner} size={20} />
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
          {doc.url && (
            <button
              onClick={() => window.open(doc.url, "_blank")}
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
              <ExternalLink size={11} />
              Open
            </button>
          )}
          <button
            onClick={() => openEditModal(doc)}
            style={{
              flex: 1,
              padding: "8px 0",
              border: "none",
              borderLeft: doc.url ? `1px solid ${THEME.line}` : "none",
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
            onClick={() => handleDelete(doc.id)}
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
  function DocRow({ doc }: { doc: any }) {
    const status = getDocStatus(doc.expiryDate);
    const badge = statusBadge(status);
    const cat = CATEGORIES[doc.category as CategoryKey] || CATEGORIES.Other;
    const ownerInfo = getOwnerAvatarInfo(doc.owner);

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
        onClick={() => setViewDocId(doc.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setViewDocId(doc.id);
          }
        }}
        className="card-lift"
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: `color-mix(in srgb, ${cat.color} 12%, transparent)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: cat.color,
            flexShrink: 0,
          }}
        >
          {React.createElement(cat.icon, { size: 14 })}
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
          <OwnerAvatar ownerId={doc.owner} size={20} />
        </div>

        <Badge variant={badge.variant} style={{ fontSize: 9, flexShrink: 0, padding: "2px 6px" }}>
          {badge.label}
        </Badge>
        
        <div style={{ display: "flex", gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          {doc.documentNumber && (
            <button
              className={`copy-btn ${copiedId === doc.id ? "copied" : ""}`}
              onClick={(e) => handleCopy(doc.id, doc.documentNumber, e)}
              title="Copy Number"
              aria-label="Copy document number"
              style={actionBtnBase}
            >
              {copiedId === doc.id ? <Check size={13} /> : <Copy size={13} />}
            </button>
          )}
          {doc.url && (
            <button
              onClick={() => window.open(doc.url, "_blank")}
              aria-label="Open document link"
              title="Open"
              style={{ ...actionBtnBase, color: THEME.accent }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "color-mix(in srgb, var(--t-accent) 10%, transparent)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <ExternalLink size={13} />
            </button>
          )}
          <button
            onClick={() => openEditModal(doc)}
            aria-label="Edit document"
            title="Edit"
            style={{ ...actionBtnBase, color: THEME.muted }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "color-mix(in srgb, var(--t-line) 60%, transparent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => handleDelete(doc.id)}
            aria-label="Delete document"
            title="Delete"
            style={{ ...actionBtnBase, color: THEME.rust }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "color-mix(in srgb, var(--t-rust) 10%, transparent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Trash2 size={13} />
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
                const base = renewDoc.expiryDate ? new Date(renewDoc.expiryDate) : new Date();
                const current = base.getTime() < new Date().getTime() ? new Date() : base;
                current.setFullYear(current.getFullYear() + btn.val);
                setRenewDate(current.toISOString().split("T")[0]);
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
    const ownerInfo = getOwnerAvatarInfo(doc.owner);

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
          {/* Card Header mesh preview */}
          <div
            style={{
              padding: "20px 24px",
              borderRadius: 12,
              background: cat.gradient,
              position: "relative",
              color: "#fff",
              overflow: "hidden",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 15px rgba(0,0,0,0.08)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: "radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 50%)",
                pointerEvents: "none",
              }}
            />
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: "rgba(255, 255, 255, 0.2)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {React.createElement(cat.icon, { size: 22, color: "#fff" })}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "-0.02em" }}>{doc.name}</div>
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
                <OwnerAvatar ownerId={doc.owner} size={22} />
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
              {doc.url && (
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => window.open(doc.url, "_blank")}
                  icon={<ExternalLink size={13} />}
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
          transform: translateY(-2px);
          border-color: var(--cat-color);
          box-shadow: 0 6px 20px -5px color-mix(in srgb, var(--cat-color) 12%, transparent);
        }
        .category-browser-card.active {
          border-color: var(--cat-color);
          background: color-mix(in srgb, var(--cat-color) 6%, var(--surface-0));
          box-shadow: 0 4px 18px -4px color-mix(in srgb, var(--cat-color) 20%, transparent);
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
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          box-shadow: var(--shadow-sm);
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .doc-vault-card:hover {
          transform: translateY(-4px);
          border-color: var(--cat-color);
          box-shadow: 0 12px 30px -8px color-mix(in srgb, var(--cat-color) 15%, rgba(15, 23, 42, 0.12));
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
          icon={<FileText />}
          color={THEME.accent}
        />
        <StatCard
          label="Expiring Soon"
          value={String(stats.expiringSoon)}
          sub="within 30 days"
          subColor={stats.expiringSoon > 0 ? THEME.gold : undefined}
          icon={<Clock />}
          color={THEME.gold}
        />
        <StatCard
          label="Expired"
          value={String(stats.expired)}
          sub={stats.expired > 0 ? "needs attention" : "all clear"}
          subColor={stats.expired > 0 ? THEME.rust : THEME.sage}
          icon={<AlertTriangle />}
          color={THEME.rust}
        />
        <StatCard
          label="Categories"
          value={String(Object.keys(stats.catCounts).length)}
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
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: THEME.accent,
              }}
            >
              <Folder size={16} />
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
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: `color-mix(in srgb, ${catDef.color} 12%, transparent)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: catDef.color,
                  }}
                >
                  <Icon size={16} />
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
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: `color-mix(in srgb, ${getCategoryColor(doc.category)} 12%, transparent)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: getCategoryColor(doc.category),
                      }}
                    >
                      {React.createElement(getCategoryIcon(doc.category), { size: 14 })}
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
            <DocCard key={doc.id} doc={doc} />
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
            <DocRow key={doc.id} doc={doc} />
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
