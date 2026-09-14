/* eslint-disable */
import React, { useState, useMemo, useRef } from "react";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Search,
  UserPlus,
  FileText,
  Phone,
  Mail,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Users,
  Scale,
  Briefcase,
  ChevronDown,
  ChevronUp,
  X,
  Printer,
  Download,
  CheckSquare,
  Square,
  Sparkles,
  Info,
  ExternalLink,
  BookOpen,
  HelpCircle,
  Award,
  Lock,
  Building2,
  Calendar,
  Share2,
  Check,
  Copy,
  Layers,
  PieChart,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull } from "../../utils/finance";
import {
  flattenAssets,
  RELATION_OPTIONS,
  CATEGORY_ORDER,
  type FlatAsset,
} from "../../utils/nomineeTracker";
import { Prv } from "../../context/PrivacyContext";
import { Money } from "../ui/Money";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Modal, ModalActions } from "../ui/Modal";
import { Field, Input, Select } from "../ui/Form";
import { ConfirmDialog } from "../ui/Feedback";
import { StatCard } from "../ui/StatCard";

const CONTACT_ROLES = [
  "Lawyer",
  "CA",
  "Financial Advisor",
  "Insurance Agent",
  "Bank Manager",
  "Family Doctor",
  "Alternate Executor",
  "Other",
];

const WILL_STATUS_OPTIONS = [
  { value: "Executed", label: "Signed / Executed (Valid)", color: THEME.sage },
  { value: "Registered", label: "Registered with Sub-Registrar", color: THEME.accent },
  { value: "Draft", label: "Draft in Progress", color: THEME.gold },
  { value: "Under Review", label: "Under Periodic Review", color: THEME.violet || "#8b5cf6" },
];

type FilterMode = "all" | "missing" | "covered" | "highValue";
type ViewMode = "asset" | "table" | "nominee" | "guide";

export const NomineeTrackerTab = ({
  state,
  addItem,
  removeItem,
  updateItem,
  showToast,
  setTab,
}: any) => {
  const [filter, setFilter] = useState<FilterMode>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("asset");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"value_desc" | "value_asc" | "name_asc" | "status">("value_desc");
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(
    null
  );

  // Selection for Batch Assign
  const [selectedAssetKeys, setSelectedAssetKeys] = useState<Set<string>>(new Set());
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchNomineeName, setBatchNomineeName] = useState("");
  const [batchNomineeRelation, setBatchNomineeRelation] = useState("Spouse");
  const [batchRelationOther, setBatchRelationOther] = useState("");

  // Single Assign Modal
  const [assignModal, setAssignModal] = useState<FlatAsset | null>(null);
  const [assignName, setAssignName] = useState("");
  const [assignRelation, setAssignRelation] = useState("Spouse");
  const [assignRelationOther, setAssignRelationOther] = useState("");

  // Collapsible categories
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Emergency Dossier Modal
  const [showDossierModal, setShowDossierModal] = useState(false);
  const [copiedDossier, setCopiedDossier] = useState(false);

  // Will tracker form
  const [showWillForm, setShowWillForm] = useState(false);
  const [editWill, setEditWill] = useState<any>(null);
  const [willForm, setWillForm] = useState({
    date: "",
    status: "Executed",
    location: "",
    primaryExecutor: "",
    alternateExecutor: "",
    witnesses: "",
    lawyerName: "",
    lawyerContact: "",
    regNumber: "",
    subRegistrarOffice: "",
    notes: "",
  });

  // Key contacts form
  const [showContactForm, setShowContactForm] = useState(false);
  const [editContact, setEditContact] = useState<any>(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    role: "Lawyer",
    phone: "",
    email: "",
    notes: "",
  });

  // Derived asset data
  const allAssets = useMemo(() => flattenAssets(state), [state]);

  const totalAssets = allAssets.length;
  const coveredAssets = allAssets.filter((a) => a.covered);
  const missingAssets = allAssets.filter((a) => !a.covered);
  const coveragePercent =
    totalAssets > 0 ? Math.round((coveredAssets.length / totalAssets) * 100) : 0;
  const totalAssetValue = allAssets.reduce((s, a) => s + a.value, 0);
  const valueAtRisk = missingAssets.reduce((s, a) => s + a.value, 0);
  const valueProtected = coveredAssets.reduce((s, a) => s + a.value, 0);
  const protectedPercent = totalAssetValue > 0 ? Math.round((valueProtected / totalAssetValue) * 100) : 0;

  // Documents
  const documents: any[] = state.documents || [];
  const willDocs = documents.filter((d: any) => d.type === "will");
  const keyContacts = documents.filter((d: any) => d.type === "key_contact");

  // Estate Readiness Score (Out of 100)
  const estateReadinessScore = useMemo(() => {
    if (totalAssets === 0) return 0;
    let score = 0;
    // 50 points: Nominee Coverage %
    score += Math.round((coveragePercent / 100) * 50);
    // 25 points: Will Document added and active
    if (willDocs.length > 0) score += 25;
    // 15 points: Key contacts added (at least 2 contacts like Lawyer/CA)
    if (keyContacts.length >= 2) score += 15;
    else if (keyContacts.length === 1) score += 8;
    // 10 points: Executor nominated in will
    if (willDocs.some((w) => w.primaryExecutor || w.witnesses)) score += 10;
    return Math.min(100, score);
  }, [totalAssets, coveragePercent, willDocs, keyContacts]);

  // Unique existing nominees for quick 1-click autofill
  const knownNominees = useMemo(() => {
    const map = new Map<string, { name: string; relation: string; count: number }>();
    for (const a of allAssets) {
      if (a.covered && a.nominee.trim()) {
        const key = a.nominee.trim().toLowerCase();
        const existing = map.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(key, { name: a.nominee.trim(), relation: a.nomineeRelation || "Spouse", count: 1 });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [allAssets]);

  // Filtered assets
  const filteredAssets = useMemo(() => {
    let list = allAssets;
    if (filter === "covered") list = list.filter((a) => a.covered);
    if (filter === "missing") list = list.filter((a) => !a.covered);
    if (filter === "highValue") list = list.filter((a) => a.value >= 1000000); // >= 10 Lakhs

    if (categoryFilter !== "all") {
      list = list.filter((a) => a.category === categoryFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.label.toLowerCase().includes(q) ||
          a.identifier.toLowerCase().includes(q) ||
          a.nominee.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q)
      );
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sortBy === "value_desc") return b.value - a.value;
      if (sortBy === "value_asc") return a.value - b.value;
      if (sortBy === "name_asc") return a.name.localeCompare(b.name);
      if (sortBy === "status") return (a.covered === b.covered ? 0 : a.covered ? 1 : -1);
      return 0;
    });
  }, [allAssets, filter, categoryFilter, search, sortBy]);

  // Grouped by Category
  const categorizedAssets = useMemo(() => {
    const map: Record<string, FlatAsset[]> = {};
    for (const a of filteredAssets) {
      (map[a.category] = map[a.category] || []).push(a);
    }
    return CATEGORY_ORDER.filter((c) => map[c]?.length).map((c) => ({
      category: c,
      items: map[c],
      totalVal: map[c].reduce((s, it) => s + it.value, 0),
      coveredCount: map[c].filter((it) => it.covered).length,
    }));
  }, [filteredAssets]);

  // "By Nominee" beneficiary allocation breakdown
  const byNominee = useMemo(() => {
    const map = new Map<
      string,
      { name: string; relation: string; items: FlatAsset[]; categoryBreakdown: Record<string, number> }
    >();
    for (const a of filteredAssets) {
      if (!a.covered) continue;
      const k = a.nominee.trim().toLowerCase();
      if (!map.has(k)) {
        map.set(k, {
          name: a.nominee.trim(),
          relation: a.nomineeRelation || "—",
          items: [],
          categoryBreakdown: {},
        });
      }
      const entry = map.get(k)!;
      entry.items.push(a);
      entry.categoryBreakdown[a.category] = (entry.categoryBreakdown[a.category] || 0) + a.value;
    }
    return Array.from(map.values())
      .map((g) => {
        const total = g.items.reduce((s, a) => s + a.value, 0);
        const percentOfWealth = totalAssetValue > 0 ? (total / totalAssetValue) * 100 : 0;
        return { ...g, total, percentOfWealth };
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredAssets, totalAssetValue]);

  // Selection handlers for batch operations
  const toggleSelectAsset = (uniqueKey: string) => {
    setSelectedAssetKeys((prev) => {
      const next = new Set(prev);
      if (next.has(uniqueKey)) next.delete(uniqueKey);
      else next.add(uniqueKey);
      return next;
    });
  };

  const selectAllUnassigned = () => {
    const unassigned = filteredAssets.filter((a) => !a.covered).map((a) => `${a.key}:${a.id}`);
    setSelectedAssetKeys(new Set(unassigned));
  };

  const clearSelection = () => {
    setSelectedAssetKeys(new Set());
  };

  // Handlers for Single Assign
  const openAssignModal = (asset: FlatAsset) => {
    setAssignName(asset.nominee);
    const rel = asset.nomineeRelation || "Spouse";
    if (rel && !RELATION_OPTIONS.includes(rel)) {
      setAssignRelation("Other");
      setAssignRelationOther(rel);
    } else {
      setAssignRelation(rel);
      setAssignRelationOther("");
    }
    setAssignModal(asset);
  };

  const handleAssign = async () => {
    if (!assignModal || !assignName.trim()) return;
    const relation =
      assignRelation === "Other" && assignRelationOther.trim()
        ? assignRelationOther.trim()
        : assignRelation;
    try {
      await Promise.all(
        assignModal.ids.map((itemId) =>
          updateItem(assignModal.key, itemId, {
            nominee: assignName.trim(),
            nomineeRelation: relation,
          })
        )
      );
      showToast?.(`Nominee saved for ${assignModal.name}`, "success");
      setAssignModal(null);
      setAssignName("");
      setAssignRelation("Spouse");
      setAssignRelationOther("");
    } catch (e: any) {
      showToast?.(`Failed to save nominee: ${e?.message || "Unknown error"}`, "error");
    }
  };

  // Batch Assign Handler
  const handleBatchAssign = async () => {
    if (!batchNomineeName.trim() || selectedAssetKeys.size === 0) return;
    const relation =
      batchNomineeRelation === "Other" && batchRelationOther.trim()
        ? batchRelationOther.trim()
        : batchNomineeRelation;

    const selectedAssets = allAssets.filter((a) => selectedAssetKeys.has(`${a.key}:${a.id}`));

    try {
      const updatePromises: Promise<any>[] = [];
      for (const asset of selectedAssets) {
        for (const itemId of asset.ids) {
          updatePromises.push(
            updateItem(asset.key, itemId, {
              nominee: batchNomineeName.trim(),
              nomineeRelation: relation,
            })
          );
        }
      }
      await Promise.all(updatePromises);
      showToast?.(
        `Successfully assigned nominee to ${selectedAssets.length} asset${
          selectedAssets.length === 1 ? "" : "s"
        }`,
        "success"
      );
      setShowBatchModal(false);
      setBatchNomineeName("");
      setBatchNomineeRelation("Spouse");
      setBatchRelationOther("");
      clearSelection();
    } catch (e: any) {
      showToast?.(`Failed batch assignment: ${e?.message || "Unknown error"}`, "error");
    }
  };

  const downloadCSV = () => {
    const q = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = ["Category,Asset Type,Name,Identifier,Value (INR),Nominee,Relation,Status"];
    allAssets.forEach((a) => {
      rows.push(
        [
          q(a.category),
          q(a.label),
          q(a.name),
          q(a.identifier),
          q(a.value),
          q(a.nominee),
          q(a.nomineeRelation),
          q(a.covered ? "Covered" : "Missing"),
        ].join(",")
      );
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nominee-estate-coverage-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Will Handlers
  const resetWillForm = () => {
    setWillForm({
      date: "",
      status: "Executed",
      location: "",
      primaryExecutor: "",
      alternateExecutor: "",
      witnesses: "",
      lawyerName: "",
      lawyerContact: "",
      regNumber: "",
      subRegistrarOffice: "",
      notes: "",
    });
    setEditWill(null);
    setShowWillForm(false);
  };

  const openEditWill = (doc: any) => {
    setWillForm({
      date: doc.date || "",
      status: doc.status || "Executed",
      location: doc.location || "",
      primaryExecutor: doc.primaryExecutor || "",
      alternateExecutor: doc.alternateExecutor || "",
      witnesses: doc.witnesses || "",
      lawyerName: doc.lawyerName || "",
      lawyerContact: doc.lawyerContact || "",
      regNumber: doc.regNumber || "",
      subRegistrarOffice: doc.subRegistrarOffice || "",
      notes: doc.notes || "",
    });
    setEditWill(doc);
    setShowWillForm(true);
  };

  const { run: handleSaveWill, loading: savingWill } = useAsyncAction(
    async () => {
      const name = willForm.date ? `Will — dated ${willForm.date}` : "Will Document";
      const payload = { type: "will", name, ...willForm };
      if (editWill) {
        await updateItem("documents", editWill.id, payload);
      } else {
        await addItem("documents", payload);
      }
    },
    {
      onSuccess: () => {
        showToast?.("Will document details updated successfully", "success");
        resetWillForm();
      },
      onError: (e: any) =>
        showToast?.(`Failed to save will details: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  // Key Contacts Handlers
  const resetContactForm = () => {
    setContactForm({ name: "", role: "Lawyer", phone: "", email: "", notes: "" });
    setEditContact(null);
    setShowContactForm(false);
  };

  const openEditContact = (doc: any) => {
    setContactForm({
      name: doc.name || "",
      role: doc.role || "Lawyer",
      phone: doc.phone || "",
      email: doc.email || "",
      notes: doc.notes || "",
    });
    setEditContact(doc);
    setShowContactForm(true);
  };

  const { run: handleSaveContact, loading: savingContact } = useAsyncAction(
    async () => {
      if (!contactForm.name.trim()) return;
      const payload = { type: "key_contact", ...contactForm };
      if (editContact) {
        await updateItem("documents", editContact.id, payload);
      } else {
        await addItem("documents", payload);
      }
    },
    {
      onSuccess: () => {
        showToast?.("Key contact saved successfully", "success");
        resetContactForm();
      },
      onError: (e: any) =>
        showToast?.(`Failed to save contact: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: deleteWillDoc, loading: deletingWill } = useAsyncAction(
    async (id: string) => {
      await removeItem("documents", id);
      showToast?.("Will document removed", "success");
    },
    { onError: (e: any) => showToast?.(`Failed to delete document: ${e?.message || "Unknown error"}`, "error") }
  );

  const { run: deleteContact, loading: deletingContact } = useAsyncAction(
    async (id: string) => {
      await removeItem("documents", id);
      showToast?.("Contact removed", "success");
    },
    { onError: (e: any) => showToast?.(`Failed to delete contact: ${e?.message || "Unknown error"}`, "error") }
  );

  const copyEmergencyDossier = () => {
    const text = [
      `=======================================================`,
      `ESTATE & NOMINEE EMERGENCY BRIEFING DOSSIER`,
      `Generated: ${new Date().toLocaleDateString("en-IN", { dateStyle: "full" })}`,
      `=======================================================`,
      ``,
      `1. WILL & EXECUTOR DETAILS:`,
      willDocs.length > 0
        ? willDocs
            .map(
              (w) =>
                `- Date: ${w.date || "N/A"} (${w.status || "Executed"})\n  Location: ${
                  w.location || "N/A"
                }\n  Primary Executor: ${w.primaryExecutor || "N/A"}\n  Lawyer: ${
                  w.lawyerName || "N/A"
                } (${w.lawyerContact || "N/A"})`
            )
            .join("\n")
        : `- No Will Document on record yet.`,
      ``,
      `2. KEY ADVISORY CONTACTS:`,
      keyContacts.length > 0
        ? keyContacts
            .map(
              (c) =>
                `- ${c.name} [${c.role}]: Phone: ${c.phone || "N/A"} | Email: ${c.email || "N/A"}`
            )
            .join("\n")
        : `- No Key Contacts recorded.`,
      ``,
      `3. BENEFICIARY ALLOCATION SUMMARY:`,
      byNominee.length > 0
        ? byNominee
            .map(
              (b) =>
                `- ${b.name} (${b.relation}): ${fmtINRFull(b.total)} (${b.percentOfWealth.toFixed(
                  1
                )}% of estate) across ${b.items.length} assets`
            )
            .join("\n")
        : `- No Beneficiaries assigned yet.`,
      ``,
      `4. ASSET COVERAGE BREAKDOWN:`,
      allAssets
        .map(
          (a) =>
            `- [${a.category}] ${a.name} (${a.label}) | Value: ${fmtINRFull(a.value)} | Nominee: ${
              a.covered ? `${a.nominee} (${a.nomineeRelation})` : "MISSING NOMINEE"
            }`
        )
        .join("\n"),
      ``,
      `=======================================================`,
      `Confidential estate document for family & executor reference.`,
      `=======================================================`,
    ].join("\n");

    navigator.clipboard.writeText(text);
    setCopiedDossier(true);
    setTimeout(() => setCopiedDossier(false), 2500);
    showToast?.("Emergency Dossier copied to clipboard", "success");
  };

  if (totalAssets === 0) {
    return (
      <div style={{ padding: "24px 0" }}>
        <SectionTitle sub="Track nominee assignments and estate planning documents across all your financial assets.">
          Will & Nominee Tracker
        </SectionTitle>
        <EmptyState
          icon={Shield}
          gradient={`linear-gradient(135deg, ${THEME.accent} 0%, color-mix(in srgb, var(--t-accent) 65%, white) 100%)`}
          dotColor={THEME.accent}
          title="No Assets Found"
          description="Add bank accounts, investments, insurance policies and other assets first, then come back to track nominee assignments."
          pills={["Bank Accounts", "Investments", "Insurance", "Real Estate"]}
          buttonLabel="Go to Dashboard"
          onAdd={() => setTab?.("analytics")}
        />
      </div>
    );
  }

  const selectedCount = selectedAssetKeys.size;

  return (
    <div
      className="tab-content-enter"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      {/* Top Header & Section Title */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <SectionTitle sub="Executive estate planning center: Track nominee assignments, will documents, beneficiary distributions, and key financial advisors.">
          Will & Nominee Tracker
        </SectionTitle>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            variant="ghost"
            size="sm"
            icon={<FileText size={13} />}
            onClick={() => setShowDossierModal(true)}
            style={{
              background: "var(--surface-0)",
              border: `1.5px solid ${THEME.line}`,
              fontWeight: 700,
            }}
          >
            Emergency Dossier
          </Button>

          <Button
            variant="ghost"
            size="sm"
            icon={<Download size={13} />}
            onClick={downloadCSV}
            style={{
              background: "var(--surface-0)",
              border: `1.5px solid ${THEME.line}`,
              fontWeight: 700,
            }}
          >
            Export CSV
          </Button>

          <Button
            variant="accent"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => {
              resetWillForm();
              setShowWillForm(true);
            }}
          >
            Add Will
          </Button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          EXECUTIVE ESTATE COMMAND CENTER & SCORECARD
          ───────────────────────────────────────────────────────────── */}
      <Card
        style={{
          padding: 24,
          border: `1.5px solid ${THEME.line}`,
          background: "var(--surface-0)",
          boxShadow: "var(--shadow-card)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top Status Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 20,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background:
                  coveragePercent === 100
                    ? `linear-gradient(135deg, ${THEME.sage}, color-mix(in srgb, ${THEME.sage} 75%, black))`
                    : coveragePercent >= 50
                    ? `linear-gradient(135deg, ${THEME.gold}, color-mix(in srgb, ${THEME.gold} 75%, black))`
                    : `linear-gradient(135deg, ${THEME.rust}, color-mix(in srgb, ${THEME.rust} 75%, black))`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: `0 4px 14px color-mix(in srgb, ${
                  coveragePercent === 100 ? THEME.sage : coveragePercent >= 50 ? THEME.gold : THEME.rust
                } 30%, transparent)`,
                flexShrink: 0,
              }}
            >
              {coveragePercent === 100 ? (
                <ShieldCheck size={26} color="#fff" />
              ) : coveragePercent >= 50 ? (
                <ShieldAlert size={26} color="#fff" />
              ) : (
                <ShieldX size={26} color="#fff" />
              )}
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: 17,
                    fontWeight: 900,
                    color: THEME.ink,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Nominee Coverage Status
                </span>
                <Badge
                  variant={coveragePercent === 100 ? "sage" : coveragePercent >= 50 ? "gold" : "rust"}
                  style={{ fontSize: 10.5, fontWeight: 800, padding: "2px 8px" }}
                >
                  {coveragePercent === 100
                    ? "Fully Nominated"
                    : coveragePercent >= 50
                    ? "Partial Protection"
                    : "Action Required"}
                </Badge>
              </div>
              <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4, fontWeight: 500 }}>
                {coveragePercent === 100
                  ? "All 100% of financial accounts and assets have valid nominees registered."
                  : `${missingAssets.length} of ${totalAssets} assets (${fmtINRFull(
                      valueAtRisk
                    )} value at risk) are currently missing a nominee.`}
              </div>
            </div>
          </div>

          {/* Dual Metrics: Coverage % & Estate Readiness Score */}
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {/* Estate Readiness Score Card */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "8px 14px",
                borderRadius: 12,
                background: "var(--surface-1)",
                border: `1.5px solid ${THEME.line}`,
              }}
            >
              <Award
                size={20}
                style={{
                  color:
                    estateReadinessScore >= 80
                      ? THEME.sage
                      : estateReadinessScore >= 50
                      ? THEME.gold
                      : THEME.rust,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Estate Readiness
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 900,
                    color: THEME.ink,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {estateReadinessScore}
                  <span style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>/100</span>
                </div>
              </div>
            </div>

            {/* Main Coverage Big Number */}
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Nominee Ratio
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 34,
                  fontWeight: 900,
                  letterSpacing: "-0.04em",
                  color:
                    coveragePercent === 100
                      ? THEME.sage
                      : coveragePercent >= 50
                      ? THEME.gold
                      : THEME.rust,
                  fontVariantNumeric: "tabular-nums",
                  lineHeight: 1,
                  marginTop: 2,
                }}
              >
                {coveragePercent}%
              </div>
            </div>
          </div>
        </div>

        {/* Dual Progress Bars: Asset Count Coverage & Wealth Value Coverage */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                fontWeight: 700,
                color: THEME.muted,
                marginBottom: 4,
              }}
            >
              <span>Asset Count Protection ({coveredAssets.length} of {totalAssets} accounts)</span>
              <span>{coveragePercent}%</span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 4,
                background: "var(--surface-2, var(--t-line))",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${coveragePercent}%`,
                  height: "100%",
                  borderRadius: 4,
                  background:
                    coveragePercent === 100
                      ? `linear-gradient(90deg, ${THEME.sage}, color-mix(in srgb, ${THEME.sage} 65%, white))`
                      : coveragePercent >= 50
                      ? `linear-gradient(90deg, ${THEME.gold}, color-mix(in srgb, ${THEME.gold} 65%, white))`
                      : `linear-gradient(90deg, ${THEME.rust}, color-mix(in srgb, ${THEME.rust} 65%, white))`,
                  transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            </div>
          </div>

          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                fontWeight: 700,
                color: THEME.muted,
                marginBottom: 4,
              }}
            >
              <span>Wealth Value Covered ({fmtINRFull(valueProtected)} of {fmtINRFull(totalAssetValue)})</span>
              <span>{protectedPercent}%</span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: "var(--surface-2, var(--t-line))",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${protectedPercent}%`,
                  height: "100%",
                  borderRadius: 3,
                  background: `linear-gradient(90deg, ${THEME.accent}, color-mix(in srgb, ${THEME.accent} 60%, white))`,
                  transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              />
            </div>
          </div>
        </div>

        {/* Stat cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 14,
          }}
        >
          <StatCard
            label="Assets Covered"
            value={String(coveredAssets.length)}
            numericValue={coveredAssets.length}
            formatValue={(n) => String(Math.round(n))}
            maskInPrivacyMode={false}
            sub={`${fmtINRFull(valueProtected)} protected`}
            icon={<ShieldCheck />}
            color={THEME.sage}
          />

          <StatCard
            label="Without Nominee"
            value={String(missingAssets.length)}
            numericValue={missingAssets.length}
            formatValue={(n) => String(Math.round(n))}
            maskInPrivacyMode={false}
            sub={missingAssets.length === 0 ? "All assets protected" : "Immediate action needed"}
            subColor={missingAssets.length > 0 ? THEME.rust : undefined}
            icon={<ShieldAlert />}
            color={missingAssets.length > 0 ? THEME.rust : THEME.sage}
          />

          <StatCard
            label="Value at Risk"
            value={fmtINRFull(valueAtRisk)}
            numericValue={valueAtRisk}
            formatValue={fmtINRFull}
            sub="Subject to probate / delays"
            icon={<AlertTriangle />}
            color={valueAtRisk > 0 ? THEME.gold : THEME.sage}
          />

          <StatCard
            label="Will Status"
            value={willDocs.length > 0 ? willDocs[0].status || "Recorded" : "Missing"}
            maskInPrivacyMode={false}
            sub={
              willDocs.length > 0
                ? `${willDocs.length} document${willDocs.length === 1 ? "" : "s"} logged`
                : "Create will to secure heirs"
            }
            subColor={willDocs.length === 0 ? THEME.rust : THEME.sage}
            icon={<Scale />}
            color={willDocs.length > 0 ? THEME.accent : THEME.rust}
          />
        </div>

        {/* Quick Suggestion / Action Banner if assets are missing */}
        {missingAssets.length > 0 && (
          <div
            style={{
              marginTop: 18,
              padding: "12px 16px",
              borderRadius: 12,
              background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
              border: `1.5px solid color-mix(in srgb, ${THEME.rust} 24%, transparent)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AlertTriangle size={18} color={THEME.rust} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 12.5, color: THEME.ink, fontWeight: 600 }}>
                You have <strong>{missingAssets.length} unassigned assets</strong>. Without nominees, bank accounts & demats face lengthy court succession procedures.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button
                variant="danger"
                size="sm"
                icon={<UserPlus size={13} />}
                onClick={() => {
                  selectAllUnassigned();
                  setShowBatchModal(true);
                }}
              >
                1-Click Batch Assign ({missingAssets.length})
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          FILTER BAR & VIEW MODE CONTROLLER
          ───────────────────────────────────────────────────────────── */}
      <Card
        style={{
          padding: "14px 18px",
          border: `1.5px solid ${THEME.line}`,
          background: "var(--surface-0)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Main View Mode Selector Pills */}
          <div
            style={{
              display: "flex",
              gap: 6,
              background: "var(--surface-1)",
              border: `1.5px solid ${THEME.line}`,
              padding: 4,
              borderRadius: 14,
            }}
          >
            {[
              { id: "asset", label: "By Category", icon: Layers },
              { id: "table", label: "Asset Register", icon: CheckSquare },
              { id: "nominee", label: "By Nominee", icon: Users },
              { id: "guide", label: "Succession Guide", icon: BookOpen },
            ].map((v) => {
              const Icon = v.icon;
              const isActive = viewMode === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => setViewMode(v.id as ViewMode)}
                  aria-pressed={isActive}
                  className={`demat-portfolio-pill ${isActive ? "active" : ""}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <Icon size={14} />
                  {v.label}
                </button>
              );
            })}
          </div>

          {/* Quick Search Bar */}
          <div style={{ flex: "1 1 240px", position: "relative" }}>
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
              placeholder="Search assets, nominees..."
              aria-label="Search assets, nominees..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: `8px ${search ? 36 : 12}px 8px 34px`,
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 12,
                border: `1.5px solid ${THEME.line}`,
                background: "var(--surface-0)",
                color: THEME.ink,
                outline: "none",
              }}
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  border: "none",
                  background: "var(--surface-2)",
                  color: THEME.muted,
                  cursor: "pointer",
                }}
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* Sort & Order */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 10,
                border: `1.5px solid ${THEME.line}`,
                background: "var(--surface-0)",
                color: THEME.ink,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="value_desc">Highest Value First</option>
              <option value="value_asc">Lowest Value First</option>
              <option value="name_asc">Asset Name (A-Z)</option>
              <option value="status">Missing Nominee First</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Chips */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            borderTop: `1px solid ${THEME.line}`,
            paddingTop: 10,
          }}
        >
          {/* Status Filter */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, marginRight: 4 }}>
              Filter:
            </span>
            {(["all", "missing", "covered", "highValue"] as FilterMode[]).map((f) => {
              const labels = {
                all: `All (${totalAssets})`,
                missing: `Missing Nominee (${missingAssets.length})`,
                covered: `Covered (${coveredAssets.length})`,
                highValue: `High Value > ₹10L (${allAssets.filter((a) => a.value >= 1000000).length})`,
              };
              const isActive = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 8,
                    fontSize: 11.5,
                    fontWeight: 700,
                    border: `1px solid ${isActive ? THEME.accent : THEME.line}`,
                    background: isActive
                      ? `color-mix(in srgb, ${THEME.accent} 12%, transparent)`
                      : "transparent",
                    color: isActive ? THEME.accent : THEME.muted,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {labels[f]}
                </button>
              );
            })}
          </div>

          {/* Category Dropdown Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                padding: "4px 10px",
                fontSize: 11.5,
                fontWeight: 700,
                borderRadius: 8,
                border: `1px solid ${THEME.line}`,
                background: "var(--surface-0)",
                color: THEME.ink,
                outline: "none",
              }}
            >
              <option value="all">All Categories</option>
              {CATEGORY_ORDER.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Batch Selection Action Bar (Appears when items are selected) */}
        {selectedCount > 0 && (
          <div
            style={{
              marginTop: 4,
              padding: "10px 14px",
              borderRadius: 10,
              background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
              border: `1.5px solid color-mix(in srgb, ${THEME.accent} 30%, transparent)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CheckSquare size={16} color={THEME.accent} />
              <span style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                {selectedCount} asset{selectedCount === 1 ? "" : "s"} selected
              </span>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                style={{ fontSize: 11.5 }}
              >
                Clear Selection
              </Button>
              <Button
                variant="accent"
                size="sm"
                icon={<UserPlus size={13} />}
                onClick={() => setShowBatchModal(true)}
              >
                Assign Nominee to {selectedCount} Asset{selectedCount === 1 ? "" : "s"}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          VIEW MODE 1: BY CATEGORY (ACCORDION WITH RICH CARDS)
          ───────────────────────────────────────────────────────────── */}
      {viewMode === "asset" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {categorizedAssets.length === 0 ? (
            <Card
              style={{
                padding: "48px 24px",
                textAlign: "center",
                border: `1.5px solid ${THEME.line}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                <Search size={32} color={THEME.muted} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, marginBottom: 4 }}>
                No Assets Found
              </div>
              <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 500 }}>
                No assets matched your search keyword or selected filter criteria.
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                  setCategoryFilter("all");
                }}
                style={{ marginTop: 14 }}
              >
                Reset Filters
              </Button>
            </Card>
          ) : (
            categorizedAssets.map(({ category, items, totalVal, coveredCount }) => {
              const isCollapsed = collapsedCategories.has(category);
              const allCovered = coveredCount === items.length;
              const catPercent = Math.round((coveredCount / items.length) * 100);

              return (
                <Card
                  key={category}
                  className="card-lift"
                  style={{
                    padding: 0,
                    overflow: "hidden",
                    border: `1.5px solid ${THEME.line}`,
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  {/* Category Header Accordion Button */}
                  <button
                    onClick={() => toggleCategory(category)}
                    aria-expanded={!isCollapsed}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16,
                      padding: "16px 20px",
                      background: "var(--surface-0)",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: allCovered ? THEME.sage : catPercent >= 50 ? THEME.gold : THEME.rust,
                        }}
                      />
                      <span style={{ fontSize: 15, fontWeight: 900, color: THEME.ink }}>
                        {category}
                      </span>
                      <Badge
                        variant={allCovered ? "sage" : "rust"}
                        style={{ fontSize: 10, padding: "2px 8px", fontWeight: 700 }}
                      >
                        {coveredCount}/{items.length} covered ({catPercent}%)
                      </Badge>
                      <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 600 }}>
                        Total: <Money value={totalVal} variant="full" />
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <ChevronDown
                        size={18}
                        style={{
                          color: THEME.muted,
                          flexShrink: 0,
                          transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                          transition: "transform 0.2s ease",
                        }}
                      />
                    </div>
                  </button>

                  {/* Accordion Item Rows */}
                  {!isCollapsed && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        background: "var(--surface-0)",
                        borderTop: `1px solid ${THEME.line}`,
                      }}
                    >
                      {items.map((asset, idx) => {
                        const uniqueKey = `${asset.key}:${asset.id}`;
                        const isSelected = selectedAssetKeys.has(uniqueKey);

                        return (
                          <div
                            key={uniqueKey}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 16,
                              flexWrap: "wrap",
                              padding: "14px 20px",
                              borderTop: idx === 0 ? "none" : `1px solid ${THEME.line}`,
                              background: isSelected
                                ? `color-mix(in srgb, ${THEME.accent} 6%, var(--surface-0))`
                                : "transparent",
                              transition: "background 0.15s ease",
                            }}
                          >
                            {/* Checkbox for Batch Selection */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelectAsset(uniqueKey);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 2,
                                display: "flex",
                                alignItems: "center",
                                color: isSelected ? THEME.accent : THEME.muted,
                              }}
                              title={isSelected ? "Deselect" : "Select for batch assign"}
                            >
                              {isSelected ? <CheckSquare size={17} /> : <Square size={17} />}
                            </button>

                            {/* Status Icon Indicator */}
                            <div
                              style={{
                                width: 38,
                                height: 38,
                                borderRadius: 10,
                                background: asset.covered
                                  ? `color-mix(in srgb, ${THEME.sage} 14%, transparent)`
                                  : `color-mix(in srgb, ${THEME.rust} 14%, transparent)`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: asset.covered ? THEME.sage : THEME.rust,
                                flexShrink: 0,
                              }}
                            >
                              {asset.covered ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                            </div>

                            {/* Asset Name & Meta */}
                            <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  flexWrap: "wrap",
                                }}
                              >
                                <span style={{ fontSize: 14.5, fontWeight: 800, color: THEME.ink }}>
                                  {asset.name}
                                </span>
                                <Badge variant="muted" style={{ fontSize: 10, padding: "2px 6px" }}>
                                  {asset.label}
                                </Badge>
                                {asset.value >= 1000000 && (
                                  <Badge variant="gold" style={{ fontSize: 9.5, padding: "1px 5px" }}>
                                    High Value
                                  </Badge>
                                )}
                              </div>
                              {asset.identifier && (
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: THEME.muted,
                                    marginTop: 4,
                                    fontWeight: 500,
                                  }}
                                >
                                  <Prv>{asset.identifier}</Prv>
                                </div>
                              )}
                            </div>

                            {/* Asset Financial Value */}
                            <div style={{ flex: "0 0 auto", textAlign: "right", minWidth: 120 }}>
                              <div
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  color: THEME.muted,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.08em",
                                }}
                              >
                                Asset Value
                              </div>
                              <div
                                style={{
                                  fontFamily: "var(--font-display)",
                                  fontSize: 15,
                                  fontWeight: 900,
                                  color: THEME.ink,
                                  fontVariantNumeric: "tabular-nums",
                                  marginTop: 2,
                                }}
                              >
                                <Money value={asset.value} variant="full" />
                              </div>
                            </div>

                            {/* Nominee Details */}
                            <div style={{ flex: "0 0 auto", textAlign: "right", minWidth: 140 }}>
                              {asset.covered ? (
                                <>
                                  <div style={{ fontSize: 13.5, fontWeight: 800, color: THEME.ink }}>
                                    <Prv>{asset.nominee}</Prv>
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: THEME.muted,
                                      fontWeight: 600,
                                      marginTop: 2,
                                    }}
                                  >
                                    {asset.nomineeRelation || "Beneficiary"}
                                  </div>
                                </>
                              ) : (
                                <div
                                  style={{
                                    fontSize: 12.5,
                                    color: THEME.rust,
                                    fontWeight: 800,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    justifyContent: "flex-end",
                                  }}
                                >
                                  <AlertTriangle size={13} />
                                  No Nominee Assigned
                                </div>
                              )}
                            </div>

                            {/* Status Capsule */}
                            <Badge
                              variant={asset.covered ? "sage" : "rust"}
                              style={{ fontSize: 10, padding: "3px 8px", fontWeight: 700 }}
                            >
                              {asset.covered ? "Covered" : "Missing"}
                            </Badge>

                            {/* Action Button */}
                            <Button
                              variant={asset.covered ? "ghost" : "accent"}
                              size="sm"
                              icon={asset.covered ? <Pencil size={12} /> : <UserPlus size={12} />}
                              onClick={() => openAssignModal(asset)}
                              style={{ flexShrink: 0 }}
                            >
                              {asset.covered ? "Edit" : "Assign"}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW MODE 2: FLAT TABULAR ASSET REGISTER
          ───────────────────────────────────────────────────────────── */}
      {viewMode === "table" && (
        <Card
          style={{
            padding: 0,
            overflow: "hidden",
            border: `1.5px solid ${THEME.line}`,
            background: "var(--surface-0)",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr
                  style={{
                    background: "var(--surface-1)",
                    borderBottom: `1.5px solid ${THEME.line}`,
                  }}
                >
                  <th style={{ padding: "12px 16px", width: 40 }}>
                    <button
                      type="button"
                      onClick={
                        selectedCount === filteredAssets.length
                          ? clearSelection
                          : () => setSelectedAssetKeys(new Set(filteredAssets.map((a) => `${a.key}:${a.id}`)))
                      }
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: selectedCount > 0 ? THEME.accent : THEME.muted,
                      }}
                    >
                      {selectedCount === filteredAssets.length && filteredAssets.length > 0 ? (
                        <CheckSquare size={16} />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase" }}>
                    Asset / Account
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase" }}>
                    Category
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", textAlign: "right" }}>
                    Value (₹)
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase" }}>
                    Nominee Assigned
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase" }}>
                    Relation
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", textAlign: "center" }}>
                    Status
                  </th>
                  <th style={{ padding: "12px 16px", fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase", textAlign: "right" }}>
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: "36px", textAlign: "center", color: THEME.muted, fontWeight: 600 }}>
                      No assets found matching current criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map((asset) => {
                    const uniqueKey = `${asset.key}:${asset.id}`;
                    const isSelected = selectedAssetKeys.has(uniqueKey);

                    return (
                      <tr
                        key={uniqueKey}
                        style={{
                          borderBottom: `1px solid ${THEME.line}`,
                          background: isSelected
                            ? `color-mix(in srgb, ${THEME.accent} 6%, var(--surface-0))`
                            : "transparent",
                          transition: "background 0.15s ease",
                        }}
                      >
                        <td style={{ padding: "12px 16px" }}>
                          <button
                            type="button"
                            onClick={() => toggleSelectAsset(uniqueKey)}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: isSelected ? THEME.accent : THEME.muted,
                            }}
                          >
                            {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                          </button>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ fontSize: 13.5, fontWeight: 800, color: THEME.ink }}>
                            {asset.name}
                          </div>
                          {asset.identifier && (
                            <div style={{ fontSize: 11.5, color: THEME.muted, fontWeight: 500, marginTop: 2 }}>
                              <Prv>{asset.identifier}</Prv>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <Badge variant="muted" style={{ fontSize: 10 }}>
                            {asset.category}
                          </Badge>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 800, color: THEME.ink, fontVariantNumeric: "tabular-nums" }}>
                          <Money value={asset.value} variant="full" />
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {asset.covered ? (
                            <span style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                              <Prv>{asset.nominee}</Prv>
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, fontWeight: 700, color: THEME.rust }}>
                              — None —
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px", fontSize: 12.5, color: THEME.muted, fontWeight: 600 }}>
                          {asset.covered ? asset.nomineeRelation || "—" : "—"}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <Badge
                            variant={asset.covered ? "sage" : "rust"}
                            style={{ fontSize: 10, padding: "2px 7px" }}
                          >
                            {asset.covered ? "Covered" : "Missing"}
                          </Badge>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <Button
                            variant={asset.covered ? "ghost" : "accent"}
                            size="sm"
                            icon={asset.covered ? <Pencil size={11} /> : <UserPlus size={11} />}
                            onClick={() => openAssignModal(asset)}
                          >
                            {asset.covered ? "Edit" : "Assign"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW MODE 3: BY NOMINEE (BENEFICIARY WEALTH ALLOCATION MATRIX)
          ───────────────────────────────────────────────────────────── */}
      {viewMode === "nominee" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {byNominee.length === 0 ? (
            <Card
              style={{
                padding: "48px 24px",
                textAlign: "center",
                border: `1.5px solid ${THEME.line}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                <Users size={36} color={THEME.muted} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, marginBottom: 4 }}>
                No Beneficiaries Assigned Yet
              </div>
              <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 500, maxWidth: 420, margin: "0 auto 16px" }}>
                Switch to "By Category" or "Asset Register" to assign nominees across your bank accounts, investments, and insurance policies.
              </div>
              <Button variant="accent" icon={<UserPlus size={14} />} onClick={() => setViewMode("asset")}>
                Go to Asset Register
              </Button>
            </Card>
          ) : (
            <>
              {/* Beneficiary Allocation Overview Summary */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 16,
                }}
              >
                {byNominee.map((g) => {
                  const isHighConcentration = g.percentOfWealth > 75 && byNominee.length > 1;

                  return (
                    <Card
                      key={g.name.toLowerCase()}
                      className="card-lift"
                      style={{
                        padding: 22,
                        border: `1.5px solid ${THEME.line}`,
                        background: "var(--surface-0)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                      }}
                    >
                      {/* Beneficiary Profile Header */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: 12,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 14,
                              background: `linear-gradient(135deg, ${THEME.accent}, color-mix(in srgb, ${THEME.accent} 60%, white))`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: "#fff",
                              fontWeight: 900,
                              fontSize: 18,
                              flexShrink: 0,
                            }}
                          >
                            {g.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize: 16, fontWeight: 900, color: THEME.ink }}>
                              <Prv>{g.name}</Prv>
                            </div>
                            <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600, marginTop: 2 }}>
                              {g.relation || "Beneficiary"} · {g.items.length} asset{g.items.length === 1 ? "" : "s"}
                            </div>
                          </div>
                        </div>

                        <Badge
                          variant="accent"
                          style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px" }}
                        >
                          {g.percentOfWealth.toFixed(1)}% of Estate
                        </Badge>
                      </div>

                      {/* Wealth Amount & Share Track */}
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: THEME.muted,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            marginBottom: 4,
                          }}
                        >
                          Total Wealth Allocated
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-display)",
                            fontSize: 22,
                            fontWeight: 900,
                            color: THEME.ink,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          <Money value={g.total} variant="full" />
                        </div>

                        {/* Progress Share Bar */}
                        <div
                          style={{
                            height: 6,
                            borderRadius: 3,
                            background: "var(--surface-2, var(--t-line))",
                            overflow: "hidden",
                            marginTop: 8,
                          }}
                        >
                          <div
                            style={{
                              width: `${Math.min(100, g.percentOfWealth)}%`,
                              height: "100%",
                              borderRadius: 3,
                              background: `linear-gradient(90deg, ${THEME.accent}, ${THEME.sage})`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Category Allocation Tags */}
                      <div>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: THEME.muted,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            marginBottom: 8,
                          }}
                        >
                          Category Mix
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {Object.entries(g.categoryBreakdown).map(([cat, val]) => (
                            <Badge
                              key={cat}
                              variant="muted"
                              style={{
                                fontSize: 10.5,
                                padding: "4px 8px",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <span>{cat}:</span>
                              <strong style={{ color: THEME.ink }}>{fmtINRFull(val)}</strong>
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Assets Linked List */}
                      <div
                        style={{
                          borderTop: `1px solid ${THEME.line}`,
                          paddingTop: 12,
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: THEME.muted,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                          }}
                        >
                          Nominated Accounts ({g.items.length})
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {g.items.map((a) => (
                            <Badge key={`${a.key}-${a.id}`} variant="muted" style={{ fontSize: 10.5 }}>
                              {a.name} <span style={{ opacity: 0.6 }}>· {a.label}</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          VIEW MODE 4: SUCCESSION GUIDE & 6-POINT READINESS CHECKLIST
          ───────────────────────────────────────────────────────────── */}
      {viewMode === "guide" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* 6-Point Estate Succession Readiness Checklist */}
          <Card
            style={{
              padding: 24,
              border: `1.5px solid ${THEME.line}`,
              background: "var(--surface-0)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <Award size={22} color={THEME.accent} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, color: THEME.ink }}>
                  Estate Succession Readiness Checklist
                </div>
                <div style={{ fontSize: 12.5, color: THEME.muted, fontWeight: 500 }}>
                  Ensure your family and heirs have seamless, dispute-free access to your wealth.
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: 12,
              }}
            >
              {[
                {
                  title: "100% Nominee Coverage",
                  desc: "Every bank account, demat account, and insurance policy has an active nominee registered.",
                  passed: coveragePercent === 100,
                  badge: `${coveragePercent}% done`,
                },
                {
                  title: "Valid Will Executed",
                  desc: "A formal written will is drafted, signed in the presence of 2 independent witnesses.",
                  passed: willDocs.length > 0,
                  badge: willDocs.length > 0 ? "Recorded" : "Missing",
                },
                {
                  title: "Primary Executor Appointed",
                  desc: "A trusted executor (and alternate executor) is named to administer the estate distribution.",
                  passed: willDocs.some((w) => w.primaryExecutor),
                  badge: willDocs.some((w) => w.primaryExecutor) ? "Appointed" : "Not Set",
                },
                {
                  title: "Key Financial Advisors Listed",
                  desc: "Lawyer, CA, and Financial Advisor contact info documented for emergency family access.",
                  passed: keyContacts.length >= 2,
                  badge: `${keyContacts.length} contacts`,
                },
                {
                  title: "Physical & Locker Storage Specified",
                  desc: "Physical location of original documents (bank locker, safe) recorded with access instructions.",
                  passed: willDocs.some((w) => w.location),
                  badge: willDocs.some((w) => w.location) ? "Specified" : "Missing",
                },
                {
                  title: "Beneficiary Will Harmony",
                  desc: "Nominee entries on bank/broker portals match the beneficiary allocations stated in your Will.",
                  passed: coveragePercent > 0 && willDocs.length > 0,
                  badge: coveragePercent > 0 && willDocs.length > 0 ? "Harmonized" : "Pending",
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 12,
                    background: item.passed
                      ? `color-mix(in srgb, ${THEME.sage} 8%, transparent)`
                      : "var(--surface-1)",
                    border: `1.5px solid ${
                      item.passed ? `color-mix(in srgb, ${THEME.sage} 30%, transparent)` : THEME.line
                    }`,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: item.passed ? THEME.sage : THEME.muted,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {item.passed ? <Check size={14} strokeWidth={3} /> : <X size={14} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: THEME.ink }}>
                        {item.title}
                      </span>
                      <Badge variant={item.passed ? "sage" : "muted"} style={{ fontSize: 9.5 }}>
                        {item.badge}
                      </Badge>
                    </div>
                    <div
                      style={{
                        fontSize: 11.5,
                        color: THEME.muted,
                        marginTop: 4,
                        lineHeight: 1.4,
                        fontWeight: 500,
                      }}
                    >
                      {item.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Legal Explanations & FAQ Guide */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 16,
            }}
          >
            <Card
              style={{
                padding: 20,
                border: `1.5px solid ${THEME.line}`,
                background: "var(--surface-0)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Scale size={18} color={THEME.accent} />
                <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                  Nominee vs. Legal Heir (Critical Difference)
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: THEME.muted, lineHeight: 1.6, margin: 0 }}>
                Under Indian law (Supreme Court ruling), a nominee for bank accounts, mutual funds, and demat holdings is merely a <strong>trustee / caretaker</strong> authorized to receive funds upon death. Ownership belongs to the <strong>legal heirs</strong> specified in the Will. Always maintain symmetry between nominees and your Will.
              </p>
            </Card>

            <Card
              style={{
                padding: 20,
                border: `1.5px solid ${THEME.line}`,
                background: "var(--surface-0)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <ShieldCheck size={18} color={THEME.sage} />
                <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                  Beneficial Nominee in Life Insurance
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: THEME.muted, lineHeight: 1.6, margin: 0 }}>
                Under Section 39 of the Insurance Act (amended 2015), if you nominate immediate family (parents, spouse, children) on life & term insurance, they become <strong>Beneficial Nominees</strong> and gain absolute legal ownership of the claim proceeds to the exclusion of other heirs.
              </p>
            </Card>

            <Card
              style={{
                padding: 20,
                border: `1.5px solid ${THEME.line}`,
                background: "var(--surface-0)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Building2 size={18} color={THEME.gold} />
                <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                  Will Registration & Witnesses
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: THEME.muted, lineHeight: 1.6, margin: 0 }}>
                Registration of a Will at the Sub-Registrar's office is <strong>optional</strong> in India, but strongly recommended as it provides undeniable authenticity. A Will must be signed in the presence of <strong>at least two independent witnesses</strong> who are not beneficiaries.
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          WILL DOCUMENTS REPOSITORY
          ───────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 12 }}>
        <SectionTitle
          sub="Keep track of your will documents, physical safe storage, executors, witnesses, and legal contacts."
          rightElement={
            <Button
              variant="accent"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => {
                resetWillForm();
                setShowWillForm(true);
              }}
            >
              Add Will
            </Button>
          }
        >
          Will Documents
        </SectionTitle>

        {willDocs.length === 0 && !showWillForm ? (
          <Card
            style={{ padding: "40px 24px", textAlign: "center", border: `1.5px solid ${THEME.line}` }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                color: "var(--t-muted)",
              }}
            >
              <Scale size={36} strokeWidth={1.5} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, marginBottom: 6 }}>
              No Will Documents Recorded
            </div>
            <div
              style={{
                fontSize: 13,
                color: THEME.muted,
                marginBottom: 20,
                maxWidth: 420,
                margin: "0 auto 20px",
                fontWeight: 500,
                lineHeight: 1.5,
              }}
            >
              Record your will details including date, execution status, primary executor, physical storage location, witnesses, and lawyer information.
            </div>
            <Button variant="accent" icon={<Plus size={14} />} onClick={() => setShowWillForm(true)}>
              Add Will Document
            </Button>
          </Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {willDocs.map((doc: any) => {
              const statusCfg =
                WILL_STATUS_OPTIONS.find((s) => s.value === doc.status) || WILL_STATUS_OPTIONS[0];

              return (
                <Card
                  key={doc.id}
                  className="card-lift"
                  style={{
                    padding: 24,
                    border: `1.5px solid ${THEME.line}`,
                    background: "var(--surface-0)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 12,
                          background: `color-mix(in srgb, ${statusCfg.color} 14%, transparent)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: statusCfg.color,
                          flexShrink: 0,
                        }}
                      >
                        <Scale size={22} />
                      </div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 16, fontWeight: 900, color: THEME.ink }}>
                            Will Document
                          </span>
                          <Badge
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              background: `color-mix(in srgb, ${statusCfg.color} 12%, transparent)`,
                              color: statusCfg.color,
                              border: `1px solid color-mix(in srgb, ${statusCfg.color} 30%, transparent)`,
                            }}
                          >
                            {statusCfg.label}
                          </Badge>
                        </div>
                        <div
                          style={{ fontSize: 12.5, color: THEME.muted, marginTop: 4, fontWeight: 600 }}
                        >
                          Dated:{" "}
                          {doc.date
                            ? new Date(doc.date + "T00:00:00").toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—"}
                          {doc.regNumber && ` · Reg No: ${doc.regNumber}`}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Pencil size={12} />}
                        onClick={() => openEditWill(doc)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<Trash2 size={12} />}
                        loading={deletingWill}
                        disabled={deletingWill}
                        onClick={() =>
                          setConfirmAction({
                            message: `Delete Will Document dated ${
                              doc.date
                                ? new Date(doc.date + "T00:00:00").toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "—"
                            }? This cannot be undone.`,
                            onConfirm: () => deleteWillDoc(doc.id),
                          })
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Detail Grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                      gap: 16,
                      marginTop: 18,
                      padding: "16px 0 0",
                      borderTop: `1.5px solid ${THEME.line}`,
                    }}
                  >
                    {[
                      { label: "Storage Location / Safe", value: doc.location },
                      { label: "Primary Executor", value: doc.primaryExecutor },
                      { label: "Alternate Executor", value: doc.alternateExecutor },
                      { label: "Witnesses", value: doc.witnesses },
                      { label: "Drafting Lawyer", value: doc.lawyerName },
                      { label: "Lawyer Contact", value: doc.lawyerContact },
                      { label: "Sub-Registrar Office", value: doc.subRegistrarOffice },
                    ].map(
                      (f) =>
                        f.value && (
                          <div key={f.label}>
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: THEME.muted,
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                marginBottom: 4,
                              }}
                            >
                              {f.label}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                              {f.value}
                            </div>
                          </div>
                        )
                    )}
                  </div>

                  {doc.notes && (
                    <div
                      style={{
                        marginTop: 14,
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: "var(--surface-1)",
                        border: `1.5px solid ${THEME.line}`,
                        fontSize: 12.5,
                        color: THEME.muted,
                        lineHeight: 1.5,
                        fontStyle: "italic",
                        fontWeight: 500,
                      }}
                    >
                      {doc.notes}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          KEY FINANCIAL ADVISORS & CONTACTS
          ───────────────────────────────────────────────────────────── */}
      <div style={{ marginTop: 12 }}>
        <SectionTitle
          sub="Important financial advisory board — lawyers, CAs, wealth managers, and insurance agents."
          rightElement={
            <Button
              variant="accent"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => {
                resetContactForm();
                setShowContactForm(true);
              }}
            >
              Add Contact
            </Button>
          }
        >
          Key Contacts
        </SectionTitle>

        {keyContacts.length === 0 && !showContactForm ? (
          <Card
            style={{ padding: "40px 24px", textAlign: "center", border: `1.5px solid ${THEME.line}` }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                color: "var(--t-muted)",
              }}
            >
              <Users size={36} strokeWidth={1.5} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, marginBottom: 6 }}>
              No Key Contacts Added
            </div>
            <div
              style={{
                fontSize: 13,
                color: THEME.muted,
                marginBottom: 20,
                maxWidth: 400,
                margin: "0 auto 20px",
                fontWeight: 500,
                lineHeight: 1.5,
              }}
            >
              Add important contacts like your lawyer, chartered accountant (CA), wealth advisor or insurance agent for quick emergency reference.
            </div>
            <Button variant="accent" icon={<Plus size={14} />} onClick={() => setShowContactForm(true)}>
              Add Key Contact
            </Button>
          </Card>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))",
              gap: 16,
            }}
          >
            {keyContacts.map((c: any) => (
              <Card
                key={c.id}
                className="card-lift"
                style={{
                  padding: "20px 22px",
                  border: `1.5px solid ${THEME.line}`,
                  background: "var(--surface-0)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      marginBottom: 14,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 12,
                          background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: THEME.accent,
                          flexShrink: 0,
                        }}
                      >
                        <Briefcase size={20} />
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink }}>
                          {c.name}
                        </div>
                        <Badge variant="accent" style={{ fontSize: 10, marginTop: 4 }}>
                          {c.role}
                        </Badge>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => openEditContact(c)}
                        className="icon-btn"
                        aria-label={`Edit contact ${c.name}`}
                        title="Edit"
                        style={{
                          background: "var(--surface-0)",
                          border: `1.5px solid ${THEME.line}`,
                          borderRadius: 8,
                          cursor: "pointer",
                          width: 32,
                          height: 32,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: THEME.muted,
                        }}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() =>
                          setConfirmAction({
                            message: `Delete contact "${c.name}"? This cannot be undone.`,
                            onConfirm: () => deleteContact(c.id),
                          })
                        }
                        disabled={deletingContact}
                        className="icon-btn danger"
                        aria-label={`Delete contact ${c.name}`}
                        title="Delete"
                        style={{
                          background: `color-mix(in srgb, ${THEME.rust} 6%, transparent)`,
                          border: `1.5px solid color-mix(in srgb, ${THEME.rust} 20%, transparent)`,
                          borderRadius: 8,
                          cursor: "pointer",
                          width: 32,
                          height: 32,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: THEME.rust,
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Direct Contact Links */}
                  {(c.phone || c.email) && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: "var(--surface-1)",
                        border: `1px solid ${THEME.line}`,
                      }}
                    >
                      {c.phone && (
                        <a
                          href={`tel:${c.phone}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 12.5,
                            color: THEME.ink,
                            fontWeight: 600,
                            textDecoration: "none",
                          }}
                        >
                          <Phone size={13} style={{ color: THEME.accent }} />
                          <Prv>{c.phone}</Prv>
                        </a>
                      )}
                      {c.email && (
                        <a
                          href={`mailto:${c.email}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 12.5,
                            color: THEME.ink,
                            fontWeight: 600,
                            textDecoration: "none",
                          }}
                        >
                          <Mail size={13} style={{ color: THEME.accent }} />
                          <Prv>{c.email}</Prv>
                        </a>
                      )}
                    </div>
                  )}

                  {c.notes && (
                    <div
                      style={{
                        marginTop: 12,
                        fontSize: 12,
                        color: THEME.muted,
                        lineHeight: 1.4,
                        fontStyle: "italic",
                        fontWeight: 500,
                      }}
                    >
                      {c.notes}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: SINGLE ASSET ASSIGN NOMINEE
          ───────────────────────────────────────────────────────────── */}
      {assignModal && (
        <Modal
          title={assignModal.covered ? "Edit Nominee Assignment" : "Assign Nominee"}
          onClose={() => setAssignModal(null)}
          maxWidth={540}
        >
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Badge variant="muted" style={{ fontSize: 10 }}>
                {assignModal.label}
              </Badge>
              <span style={{ fontSize: 15, fontWeight: 800, color: THEME.ink }}>
                {assignModal.name}
              </span>
            </div>
            {assignModal.identifier && (
              <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 500 }}>
                <Prv>{assignModal.identifier}</Prv>
              </div>
            )}
            <div style={{ fontSize: 13, color: THEME.ink, fontWeight: 800, marginTop: 8 }}>
              Asset Value: <Money value={assignModal.value} variant="full" />
            </div>
          </div>

          {/* Quick Select from Known Family Members */}
          {knownNominees.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  color: THEME.muted,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  marginBottom: 6,
                }}
              >
                1-Click Quick Select Existing Nominee:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {knownNominees.map((n) => (
                  <button
                    key={n.name}
                    type="button"
                    onClick={() => {
                      setAssignName(n.name);
                      setAssignRelation(n.relation);
                    }}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 8,
                      fontSize: 11.5,
                      fontWeight: 700,
                      border: `1.5px solid ${assignName === n.name ? THEME.accent : THEME.line}`,
                      background: assignName === n.name
                        ? `color-mix(in srgb, ${THEME.accent} 12%, transparent)`
                        : "var(--surface-1)",
                      color: assignName === n.name ? THEME.accent : THEME.ink,
                      cursor: "pointer",
                    }}
                  >
                    {n.name} ({n.relation})
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: `color-mix(in srgb, ${THEME.gold} 10%, transparent)`,
              border: `1.5px solid color-mix(in srgb, ${THEME.gold} 24%, transparent)`,
              fontSize: 12,
              color: THEME.ink,
              lineHeight: 1.5,
              marginBottom: 16,
            }}
          >
            A nominee is a <strong style={{ color: THEME.ink }}>trustee / caretaker</strong> under Indian law. Legal ownership flows via your Will or succession law. Keep nominees aligned with your Will.
          </div>

          <Field label="Nominee Full Name">
            <Input
              value={assignName}
              onChange={(e) => setAssignName(e.target.value)}
              placeholder="e.g. Ananya Mohta"
            />
          </Field>

          <Field label="Relationship">
            <Select value={assignRelation} onChange={(e) => setAssignRelation(e.target.value)}>
              {RELATION_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </Field>

          {assignRelation === "Other" && (
            <Field label="Specify Relation">
              <Input
                value={assignRelationOther}
                onChange={(e) => setAssignRelationOther(e.target.value)}
                placeholder="e.g. Nephew, Friend, Trust"
              />
            </Field>
          )}

          <ModalActions
            onSave={handleAssign}
            onClose={() => setAssignModal(null)}
            saveLabel={assignModal.covered ? "Save Changes" : "Assign Nominee"}
            disabled={!assignName.trim()}
          />
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: BATCH NOMINEE ASSIGNMENT MODAL
          ───────────────────────────────────────────────────────────── */}
      {showBatchModal && (
        <Modal
          title={`Batch Assign Nominee (${selectedCount} Assets)`}
          onClose={() => setShowBatchModal(false)}
          maxWidth={560}
        >
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: THEME.muted, fontWeight: 500, marginBottom: 12 }}>
              Assign the same nominee to all <strong>{selectedCount} selected accounts</strong> simultaneously.
            </div>

            {/* Quick Pick Known Family Nominee */}
            {knownNominees.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 6,
                  }}
                >
                  Quick Select Existing Nominee:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {knownNominees.map((n) => (
                    <button
                      key={n.name}
                      type="button"
                      onClick={() => {
                        setBatchNomineeName(n.name);
                        setBatchNomineeRelation(n.relation);
                      }}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 700,
                        border: `1.5px solid ${batchNomineeName === n.name ? THEME.accent : THEME.line}`,
                        background: batchNomineeName === n.name
                          ? `color-mix(in srgb, ${THEME.accent} 14%, transparent)`
                          : "var(--surface-1)",
                        color: batchNomineeName === n.name ? THEME.accent : THEME.ink,
                        cursor: "pointer",
                      }}
                    >
                      {n.name} ({n.relation})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <Field label="Nominee Full Name">
              <Input
                value={batchNomineeName}
                onChange={(e) => setBatchNomineeName(e.target.value)}
                placeholder="Enter nominee name"
              />
            </Field>

            <Field label="Relationship">
              <Select
                value={batchNomineeRelation}
                onChange={(e) => setBatchNomineeRelation(e.target.value)}
              >
                {RELATION_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>

            {batchNomineeRelation === "Other" && (
              <Field label="Specify Relation">
                <Input
                  value={batchRelationOther}
                  onChange={(e) => setBatchRelationOther(e.target.value)}
                  placeholder="e.g. Brother, Niece, Trust"
                />
              </Field>
            )}
          </div>

          <ModalActions
            onSave={handleBatchAssign}
            onClose={() => setShowBatchModal(false)}
            saveLabel={`Assign to ${selectedCount} Assets`}
            disabled={!batchNomineeName.trim()}
          />
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 3: EMERGENCY ESTATE DOSSIER (PRINT / EXPORT BRIEFING)
          ───────────────────────────────────────────────────────────── */}
      {showDossierModal && (
        <Modal
          title="Emergency Estate & Nominee Dossier"
          onClose={() => setShowDossierModal(false)}
          maxWidth={720}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 10,
                background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                border: `1.5px solid color-mix(in srgb, ${THEME.accent} 24%, transparent)`,
                fontSize: 12.5,
                color: THEME.ink,
                lineHeight: 1.5,
              }}
            >
              This emergency dossier provides a complete summary of your will storage, executor contact, advisory team, and asset nominee registrations for family or executor reference in emergency situations.
            </div>

            {/* Will Storage & Executors Card */}
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                background: "var(--surface-1)",
                border: `1.5px solid ${THEME.line}`,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 900, color: THEME.ink, marginBottom: 8 }}>
                1. Will Location & Primary Executor
              </div>
              {willDocs.length > 0 ? (
                willDocs.map((w, idx) => (
                  <div key={idx} style={{ fontSize: 12, color: THEME.muted, lineHeight: 1.6 }}>
                    <div><strong>Date & Status:</strong> {w.date || "N/A"} ({w.status || "Executed"})</div>
                    <div><strong>Physical Location / Safe:</strong> {w.location || "N/A"}</div>
                    <div><strong>Primary Executor:</strong> {w.primaryExecutor || "N/A"}</div>
                    <div><strong>Drafting Lawyer:</strong> {w.lawyerName || "N/A"} ({w.lawyerContact || "N/A"})</div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: THEME.rust, fontWeight: 600 }}>
                  No Will document registered.
                </div>
              )}
            </div>

            {/* Key Contacts */}
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                background: "var(--surface-1)",
                border: `1.5px solid ${THEME.line}`,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 900, color: THEME.ink, marginBottom: 8 }}>
                2. Key Emergency Advisors ({keyContacts.length})
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {keyContacts.map((c, idx) => (
                  <div key={idx} style={{ fontSize: 12, color: THEME.ink, fontWeight: 600 }}>
                    • {c.name} ({c.role}): <span style={{ color: THEME.muted }}>{c.phone || c.email || "No contact"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Beneficiaries Breakdown */}
            <div
              style={{
                padding: 16,
                borderRadius: 12,
                background: "var(--surface-1)",
                border: `1.5px solid ${THEME.line}`,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 900, color: THEME.ink, marginBottom: 8 }}>
                3. Beneficiary Asset Allocations ({byNominee.length} Nominees)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {byNominee.map((b) => (
                  <div
                    key={b.name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      fontWeight: 600,
                    }}
                  >
                    <span>{b.name} ({b.relation}) · {b.items.length} assets</span>
                    <strong style={{ color: THEME.ink }}>{fmtINRFull(b.total)} ({b.percentOfWealth.toFixed(1)}%)</strong>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
              <Button
                variant="ghost"
                icon={copiedDossier ? <Check size={14} /> : <Copy size={14} />}
                onClick={copyEmergencyDossier}
              >
                {copiedDossier ? "Copied!" : "Copy Full Text"}
              </Button>
              <Button
                variant="accent"
                icon={<Printer size={14} />}
                onClick={() => window.print()}
              >
                Print Dossier
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 4: WILL DOCUMENT FORM MODAL
          ───────────────────────────────────────────────────────────── */}
      {showWillForm && (
        <Modal
          title={editWill ? "Edit Will Document" : "Add Will Document"}
          onClose={resetWillForm}
          maxWidth={640}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="Will Date">
              <Input
                type="date"
                value={willForm.date}
                onChange={(e) => setWillForm({ ...willForm, date: e.target.value })}
              />
            </Field>

            <Field label="Will Status">
              <Select
                value={willForm.status}
                onChange={(e) => setWillForm({ ...willForm, status: e.target.value })}
              >
                {WILL_STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Physical Storage Location & Safe Details">
            <Input
              value={willForm.location}
              onChange={(e) => setWillForm({ ...willForm, location: e.target.value })}
              placeholder="e.g. HDFC Bank Locker #402, Churchgate Branch (Key in home safe)"
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="Primary Executor Name">
              <Input
                value={willForm.primaryExecutor}
                onChange={(e) => setWillForm({ ...willForm, primaryExecutor: e.target.value })}
                placeholder="e.g. Rahul Mohta (Brother)"
              />
            </Field>

            <Field label="Alternate Executor Name">
              <Input
                value={willForm.alternateExecutor}
                onChange={(e) => setWillForm({ ...willForm, alternateExecutor: e.target.value })}
                placeholder="e.g. CA S. K. Sharma"
              />
            </Field>
          </div>

          <Field label="Witness Names (At least 2 required)">
            <Input
              value={willForm.witnesses}
              onChange={(e) => setWillForm({ ...willForm, witnesses: e.target.value })}
              placeholder="e.g. Rajesh Gupta, Dr. Priya Mehta"
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="Drafting Lawyer Name">
              <Input
                value={willForm.lawyerName}
                onChange={(e) => setWillForm({ ...willForm, lawyerName: e.target.value })}
                placeholder="Lawyer's full name"
              />
            </Field>

            <Field label="Lawyer Contact (Phone/Email)">
              <Input
                value={willForm.lawyerContact}
                onChange={(e) => setWillForm({ ...willForm, lawyerContact: e.target.value })}
                placeholder="Phone or email"
              />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="Registration No. (If Registered)">
              <Input
                value={willForm.regNumber}
                onChange={(e) => setWillForm({ ...willForm, regNumber: e.target.value })}
                placeholder="e.g. REG/2026/894"
              />
            </Field>

            <Field label="Sub-Registrar Office">
              <Input
                value={willForm.subRegistrarOffice}
                onChange={(e) => setWillForm({ ...willForm, subRegistrarOffice: e.target.value })}
                placeholder="e.g. Bandra East, Mumbai"
              />
            </Field>
          </div>

          <Field label="Additional Estate Instructions / Notes">
            <textarea
              value={willForm.notes}
              onChange={(e) => setWillForm({ ...willForm, notes: e.target.value })}
              placeholder="Any additional notes or instructions for the executor..."
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 8,
                border: `1.5px solid ${THEME.line}`,
                background: "var(--surface-0, #fff)",
                color: THEME.ink,
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </Field>

          <ModalActions
            onSave={handleSaveWill}
            onClose={resetWillForm}
            saveLabel={editWill ? "Save Changes" : "Add Will Document"}
            loading={savingWill}
          />
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 5: KEY CONTACT FORM MODAL
          ───────────────────────────────────────────────────────────── */}
      {showContactForm && (
        <Modal
          title={editContact ? "Edit Advisor Contact" : "Add Key Advisor Contact"}
          onClose={resetContactForm}
          maxWidth={560}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="Contact Full Name">
              <Input
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                placeholder="e.g. Adv. R. K. Singhania"
              />
            </Field>

            <Field label="Professional Role">
              <Select
                value={contactForm.role}
                onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
              >
                {CONTACT_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="Phone Number">
              <Input
                value={contactForm.phone}
                onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </Field>

            <Field label="Email Address">
              <Input
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                placeholder="lawyer@example.com"
              />
            </Field>
          </div>

          <Field label="Notes / Specialization">
            <textarea
              value={contactForm.notes}
              onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
              placeholder="e.g. Drafted 2024 Will, handles property registration and estate execution"
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                fontSize: 14,
                fontWeight: 500,
                borderRadius: 8,
                border: `1.5px solid ${THEME.line}`,
                background: "var(--surface-0, #fff)",
                color: THEME.ink,
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
          </Field>

          <ModalActions
            onSave={handleSaveContact}
            onClose={resetContactForm}
            saveLabel={editContact ? "Save Changes" : "Add Key Contact"}
            disabled={!contactForm.name.trim()}
            loading={savingContact}
          />
        </Modal>
      )}

      {/* Confirmation Dialog */}
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
};
