/* eslint-disable */
// @ts-nocheck
import React, { useState, useMemo } from "react";
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
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Users,
  Scale,
  Briefcase,
  ChevronDown,
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
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { Modal, ModalActions } from "../ui/Modal";
import { Field, Input, Select } from "../ui/Form";
import { ConfirmDialog } from "../ui/Feedback";

const CONTACT_ROLES = ["Lawyer", "CA", "Financial Advisor", "Insurance Agent", "Other"];

type FilterMode = "all" | "missing" | "covered";
type ViewMode = "asset" | "nominee";

/* ─── Premium Nominee Bento Card ─────────────────────────────────── */
const NomineeStatCard = ({
  label,
  value,
  sub,
  subColor,
  icon: Icon,
  color,
  numericValue,
  formatValue,
  mask,
}: any) => {
  const hasAnimation = typeof numericValue === "number" && typeof formatValue === "function";
  const animated = useAnimatedNumber(hasAnimation ? numericValue : 0);
  const rawDisplayValue = hasAnimation ? formatValue(animated) : value;
  const displayValue = mask ? <Prv>{rawDisplayValue}</Prv> : rawDisplayValue;
  return (
    <div
      className="card-lift"
      style={{
        background: "var(--t-card-bg)",
        border: `1.5px solid ${THEME.line}`,
        borderTop: `4px solid ${color || THEME.accent}`,
        borderRadius: 16,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 12,
        transition: "border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", color: color || THEME.accent, flexShrink: 0 }}>
          {Icon}
        </div>
        <div
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            color: THEME.muted,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </div>
      </div>
      <div>
        <span
          style={{
            fontSize: 24,
            fontWeight: 900,
            color: THEME.ink,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {displayValue}
        </span>
        {sub && (
          <div
            style={{ fontSize: 12, color: subColor || THEME.muted, marginTop: 4, fontWeight: 600 }}
          >
            {sub}
          </div>
        )}
      </div>
    </div>
  );
};

export const NomineeTrackerTab = ({
  state,
  addItem,
  removeItem,
  updateItem,
  showToast,
  setTab,
}: any) => {
  const [filter, setFilter] = useState<FilterMode>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("asset");
  const [search, setSearch] = useState("");
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(
    null
  );
  const [assignModal, setAssignModal] = useState<FlatAsset | null>(null);
  const [assignName, setAssignName] = useState("");
  const [assignRelation, setAssignRelation] = useState("Spouse");
  const [assignRelationOther, setAssignRelationOther] = useState("");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const toggleCategory = (cat: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Will tracker
  const [showWillForm, setShowWillForm] = useState(false);
  const [editWill, setEditWill] = useState<any>(null);
  const [willForm, setWillForm] = useState({
    date: "",
    location: "",
    witnesses: "",
    lawyerName: "",
    lawyerContact: "",
    notes: "",
  });

  // Key contacts
  const [showContactForm, setShowContactForm] = useState(false);
  const [editContact, setEditContact] = useState<any>(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    role: "Lawyer",
    phone: "",
    email: "",
    notes: "",
  });

  // Derived data
  const allAssets = useMemo(() => flattenAssets(state), [state]);

  const totalAssets = allAssets.length;
  const coveredAssets = allAssets.filter((a) => a.covered);
  const missingAssets = allAssets.filter((a) => !a.covered);
  const coveragePercent =
    totalAssets > 0 ? Math.round((coveredAssets.length / totalAssets) * 100) : 0;
  const valueAtRisk = missingAssets.reduce((s, a) => s + a.value, 0);

  const filteredAssets = useMemo(() => {
    let list = allAssets;
    if (filter === "covered") list = list.filter((a) => a.covered);
    if (filter === "missing") list = list.filter((a) => !a.covered);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.label.toLowerCase().includes(q) ||
          a.identifier.toLowerCase().includes(q) ||
          a.nominee.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allAssets, filter, search]);

  const categorizedAssets = useMemo(() => {
    const map: Record<string, FlatAsset[]> = {};
    for (const a of filteredAssets) {
      (map[a.category] = map[a.category] || []).push(a);
    }
    return CATEGORY_ORDER.filter((c) => map[c]?.length).map((c) => ({
      category: c,
      items: map[c],
    }));
  }, [filteredAssets]);

  // "By Nominee" view — who inherits what, at a glance. Groups covered
  // assets by the nominee's name (case-insensitively, so "Priya" and "priya"
  // don't split into two people) so the user can sanity-check that the
  // right person is down for the right accounts.
  const byNominee = useMemo(() => {
    const map = new Map<string, { name: string; relation: string; items: FlatAsset[] }>();
    for (const a of filteredAssets) {
      if (!a.covered) continue;
      const k = a.nominee.trim().toLowerCase();
      if (!map.has(k)) map.set(k, { name: a.nominee.trim(), relation: a.nomineeRelation, items: [] });
      map.get(k)!.items.push(a);
    }
    return Array.from(map.values())
      .map((g) => ({ ...g, total: g.items.reduce((s, a) => s + a.value, 0) }))
      .sort((a, b) => b.total - a.total);
  }, [filteredAssets]);

  const documents: any[] = state.documents || [];
  const willDocs = documents.filter((d: any) => d.type === "will");
  const keyContacts = documents.filter((d: any) => d.type === "key_contact");

  // Handlers
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
      setAssignModal(null);
      setAssignName("");
      setAssignRelation("Spouse");
      setAssignRelationOther("");
    } catch (e: any) {
      showToast?.(`Failed to save nominee: ${e?.message || "Unknown error"}`, "error");
    }
  };

  const downloadCSV = () => {
    const q = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = ["Category,Asset Type,Name,Identifier,Value (₹),Nominee,Relation,Status"];
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
    a.download = "nominee-coverage.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetWillForm = () => {
    setWillForm({
      date: "",
      location: "",
      witnesses: "",
      lawyerName: "",
      lawyerContact: "",
      notes: "",
    });
    setEditWill(null);
    setShowWillForm(false);
  };

  const openEditWill = (doc: any) => {
    setWillForm({
      date: doc.date || "",
      location: doc.location || "",
      witnesses: doc.witnesses || "",
      lawyerName: doc.lawyerName || "",
      lawyerContact: doc.lawyerContact || "",
      notes: doc.notes || "",
    });
    setEditWill(doc);
    setShowWillForm(true);
  };

  const { run: handleSaveWill, loading: savingWill } = useAsyncAction(
    async () => {
      // `documents.name` is a required column in Supabase — the will record has
      // no natural "name" of its own, so synthesize one from the date so saves
      // don't fail with a not-null constraint violation.
      const name = willForm.date ? `Will — dated ${willForm.date}` : "Will Document";
      const payload = { type: "will", name, ...willForm };
      if (editWill) {
        await updateItem("documents", editWill.id, payload);
      } else {
        await addItem("documents", payload);
      }
    },
    {
      onSuccess: () => resetWillForm(),
      onError: (e: any) =>
        showToast?.(`Failed to save will details: ${e?.message || "Unknown error"}`, "error"),
    }
  );

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
      onSuccess: () => resetContactForm(),
      onError: (e: any) =>
        showToast?.(`Failed to save contact: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: deleteWillDoc, loading: deletingWill } = useAsyncAction(
    async (id: string) => { await removeItem("documents", id); },
    { onError: (e: any) => showToast?.(`Failed to delete document: ${e?.message || "Unknown error"}`, "error") }
  );
  const { run: deleteContact, loading: deletingContact } = useAsyncAction(
    async (id: string) => { await removeItem("documents", id); },
    { onError: (e: any) => showToast?.(`Failed to delete contact: ${e?.message || "Unknown error"}`, "error") }
  );

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

  return (
    <div
      className="tab-content-enter"
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
    >
      <SectionTitle sub="Track nominee assignments, will documents and key financial contacts across all your assets.">
        Will & Nominee Tracker
      </SectionTitle>

      {/* Coverage Dashboard */}
      <Card style={{ padding: 24, border: `1.5px solid ${THEME.line}` }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background:
                coveragePercent === 100
                  ? THEME.sage
                  : coveragePercent >= 50
                    ? THEME.gold
                    : THEME.rust,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {coveragePercent === 100 ? (
              <ShieldCheck size={22} color="#fff" />
            ) : coveragePercent >= 50 ? (
              <ShieldAlert size={22} color="#fff" />
            ) : (
              <ShieldX size={22} color="#fff" />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div
              style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, letterSpacing: "-0.015em" }}
            >
              Nominee Coverage Status
            </div>
            <div style={{ fontSize: 12.5, color: THEME.muted, marginTop: 4, fontWeight: 500 }}>
              {coveragePercent === 100
                ? "All assets have nominees assigned"
                : `${missingAssets.length} asset${missingAssets.length === 1 ? "" : "s"} still need nominees`}
            </div>
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 900,
              letterSpacing: "-0.04em",
              color:
                coveragePercent === 100
                  ? THEME.sage
                  : coveragePercent >= 50
                    ? THEME.gold
                    : THEME.rust,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {coveragePercent}%
          </div>
        </div>

        {/* Progress track */}
        <div
          style={{
            height: 8,
            borderRadius: 4,
            background: THEME.line,
            overflow: "hidden",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: `${coveragePercent}%`,
              height: "100%",
              borderRadius: 4,
              background:
                coveragePercent === 100
                  ? `linear-gradient(90deg, ${THEME.sage}, color-mix(in srgb, ${THEME.sage} 55%, white))`
                  : coveragePercent >= 50
                    ? `linear-gradient(90deg, ${THEME.gold}, color-mix(in srgb, ${THEME.gold} 55%, white))`
                    : `linear-gradient(90deg, ${THEME.rust}, color-mix(in srgb, ${THEME.rust} 55%, white))`,
              transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>

        {/* Stat cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
          }}
        >
          <NomineeStatCard
            label="Assets Covered"
            value={String(coveredAssets.length)}
            numericValue={coveredAssets.length}
            formatValue={(n) => String(Math.round(n))}
            sub={`of ${totalAssets} total`}
            icon={<ShieldCheck size={16} />}
            color={THEME.sage}
          />
          <NomineeStatCard
            label="Without Nominee"
            value={String(missingAssets.length)}
            numericValue={missingAssets.length}
            formatValue={(n) => String(Math.round(n))}
            sub={missingAssets.length === 0 ? "None remaining" : "Action needed"}
            subColor={missingAssets.length > 0 ? THEME.rust : undefined}
            icon={<ShieldAlert size={16} />}
            color={missingAssets.length > 0 ? THEME.rust : THEME.sage}
          />
          <NomineeStatCard
            label="Value at Risk"
            value={<Money value={valueAtRisk} variant="full" />}
            numericValue={valueAtRisk}
            formatValue={fmtINRFull}
            mask
            sub="Without nominee protection"
            icon={<AlertTriangle size={16} />}
            color={THEME.gold}
          />
        </div>
      </Card>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
            background: "var(--surface-0)",
            border: `1.5px solid ${THEME.line}`,
            padding: 4,
            borderRadius: 14,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {(["all", "missing", "covered"] as FilterMode[]).map((f) => {
            const counts = {
              all: totalAssets,
              missing: missingAssets.length,
              covered: coveredAssets.length,
            };
            const labels = { all: "All Assets", missing: "Missing Nominees", covered: "Covered" };
            const isActive = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                aria-pressed={isActive}
                className={`demat-portfolio-pill ${isActive ? "active" : ""}`}
              >
                {labels[f]} ({counts[f]})
              </button>
            );
          })}
        </div>
        <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
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
            aria-label="Search assets and nominees"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 34px",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 12,
              border: `1.5px solid ${THEME.line}`,
              background: "var(--surface-0)",
              color: THEME.ink,
              outline: "none",
            }}
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: 6,
            background: "var(--surface-0)",
            border: `1.5px solid ${THEME.line}`,
            padding: 4,
            borderRadius: 14,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          {(["asset", "nominee"] as ViewMode[]).map((v) => {
            const isActive = viewMode === v;
            return (
              <button
                key={v}
                onClick={() => setViewMode(v)}
                aria-pressed={isActive}
                className={`demat-portfolio-pill ${isActive ? "active" : ""}`}
              >
                {v === "asset" ? "By Asset" : "By Nominee"}
              </button>
            );
          })}
        </div>
        <Button variant="ghost" size="sm" icon={<FileText size={13} />} onClick={downloadCSV}>
          Export CSV
        </Button>
      </div>

      {/* By Nominee — who inherits what, grouped by beneficiary */}
      {viewMode === "nominee" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {byNominee.length === 0 ? (
            <Card
              style={{
                padding: "40px 24px",
                textAlign: "center",
                border: `1.5px solid ${THEME.line}`,
              }}
            >
              <div style={{ fontSize: 14, color: THEME.muted, fontWeight: 600 }}>
                No nominees assigned yet — switch to "By Asset" to assign one.
              </div>
            </Card>
          ) : (
            byNominee.map((g) => (
              <Card
                key={g.name.toLowerCase()}
                style={{
                  padding: "18px 20px",
                  border: `1.5px solid ${THEME.line}`,
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 12,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", color: THEME.accent, flexShrink: 0 }}>
                      <Users size={20} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14.5, fontWeight: 800, color: THEME.ink }}>
                        <Prv>{g.name}</Prv>
                      </div>
                      <div style={{ fontSize: 11.5, color: THEME.muted, fontWeight: 600 }}>
                        {g.relation || "Relation not set"} · {g.items.length} asset
                        {g.items.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>
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
                      Total Value
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 900,
                        color: THEME.ink,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      <Money value={g.total} variant="full" />
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {g.items.map((a) => (
                    <Badge key={`${a.key}-${a.id}`} variant="muted" style={{ fontSize: 10.5 }}>
                      {a.name} <span style={{ opacity: 0.6 }}>· {a.label}</span>
                    </Badge>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Asset Nominees — grouped into collapsible category sections */}
      {viewMode === "asset" && (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {categorizedAssets.length === 0 ? (
          <Card
            style={{
              padding: "40px 24px",
              textAlign: "center",
              border: `1.5px solid ${THEME.line}`,
            }}
          >
            <div style={{ fontSize: 14, color: THEME.muted, fontWeight: 600 }}>
              No assets match your search or filter.
            </div>
          </Card>
        ) : (
          categorizedAssets.map(({ category, items }) => {
            const coveredCount = items.filter((a) => a.covered).length;
            const isCollapsed = collapsedCategories.has(category);
            const allCovered = coveredCount === items.length;
            return (
              <Card
                key={category}
                style={{
                  padding: 0,
                  overflow: "hidden",
                  border: `1.5px solid ${THEME.line}`,
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <button
                  onClick={() => toggleCategory(category)}
                  aria-expanded={!isCollapsed}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "16px 20px",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14.5, fontWeight: 800, color: THEME.ink }}>
                      {category}
                    </span>
                    <Badge
                      variant={allCovered ? "sage" : "rust"}
                      style={{ fontSize: 10, padding: "3px 8px" }}
                    >
                      {coveredCount}/{items.length} covered
                    </Badge>
                  </div>
                  <ChevronDown
                    size={16}
                    style={{
                      color: THEME.muted,
                      flexShrink: 0,
                      transform: isCollapsed ? "rotate(-90deg)" : "rotate(0deg)",
                      transition: "transform 0.2s ease",
                    }}
                  />
                </button>

                {!isCollapsed && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      padding: "0 20px 16px",
                    }}
                  >
                    {items.map((asset, idx) => (
                      <div
                        key={`${asset.key}-${asset.id}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                          flexWrap: "wrap",
                          padding: "14px 0",
                          borderTop: idx === 0 ? "none" : `1px solid ${THEME.line}`,
                        }}
                      >
                        {/* Status badge */}
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 10,
                            background: asset.covered
                              ? `color-mix(in srgb, ${THEME.sage} 12%, transparent)`
                              : `color-mix(in srgb, ${THEME.rust} 12%, transparent)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: asset.covered ? THEME.sage : THEME.rust,
                            flexShrink: 0,
                          }}
                        >
                          {asset.covered ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
                        </div>

                        {/* Asset info */}
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

                        {/* Value */}
                        <div style={{ flex: "0 0 auto", textAlign: "right", minWidth: 110 }}>
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
                              fontSize: 15,
                              fontWeight: 800,
                              color: THEME.ink,
                              fontVariantNumeric: "tabular-nums",
                              marginTop: 2,
                            }}
                          >
                            <Money value={asset.value} variant="full" />
                          </div>
                        </div>

                        {/* Nominee info */}
                        <div style={{ flex: "0 0 auto", textAlign: "right", minWidth: 130 }}>
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
                                {asset.nomineeRelation}
                              </div>
                            </>
                          ) : (
                            <div style={{ fontSize: 12.5, color: THEME.rust, fontWeight: 700 }}>
                              No Nominee Assigned
                            </div>
                          )}
                        </div>

                        {/* Status capsule */}
                        <Badge
                          variant={asset.covered ? "sage" : "rust"}
                          style={{ fontSize: 10, padding: "3px 8px" }}
                        >
                          {asset.covered ? "Covered" : "Missing"}
                        </Badge>

                        {/* Action trigger */}
                        <Button
                          variant={asset.covered ? "ghost" : "primary"}
                          size="sm"
                          icon={asset.covered ? <Edit2 size={12} /> : <UserPlus size={12} />}
                          onClick={() => openAssignModal(asset)}
                          style={{ flexShrink: 0 }}
                        >
                          {asset.covered ? "Edit" : "Assign"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
      )}

      {/* Will Documents Section */}
      <SectionTitle
        sub="Keep track of your will documents, their physical location and legal details."
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "var(--t-muted)" }}>
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
              maxWidth: 380,
              margin: "0 auto 20px",
              fontWeight: 500,
              lineHeight: 1.4,
            }}
          >
            Record your will details including date, physical location, witnesses and lawyer
            information for easy reference.
          </div>
          <Button variant="accent" icon={<Plus size={14} />} onClick={() => setShowWillForm(true)}>
            Add Will Document
          </Button>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {willDocs.map((doc: any) => (
            <Card
              key={doc.id}
              className="card-lift"
              style={{
                padding: 24,
                border: `1.5px solid ${THEME.line}`,
                boxShadow: "var(--shadow-sm)",
                transition: "all 0.2s ease",
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
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", color: THEME.gold, flexShrink: 0 }}>
                    <Scale size={20} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink }}>
                      Will Document
                    </div>
                    <div
                      style={{ fontSize: 12, color: THEME.muted, marginTop: 4, fontWeight: 600 }}
                    >
                      Dated: {doc.date || "Not specified"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Edit2 size={12} />}
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
                        message: `Delete Will Document dated ${doc.date || "not specified"}? This cannot be undone.`,
                        onConfirm: () => deleteWillDoc(doc.id),
                      })
                    }
                  >
                    Delete
                  </Button>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 16,
                  marginTop: 16,
                  padding: "16px 0 0",
                  borderTop: `1.5px solid ${THEME.line}`,
                }}
              >
                {[
                  { label: "Location", value: doc.location },
                  { label: "Witnesses", value: doc.witnesses },
                  { label: "Lawyer", value: doc.lawyerName },
                  { label: "Lawyer Contact", value: doc.lawyerContact },
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
                            lineHeight: 1.3,
                            minHeight: 26,
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
          ))}
        </div>
      )}

      {/* Key Contacts Section */}
      <SectionTitle
        sub="Important financial contacts — lawyers, CAs, financial advisors and insurance agents."
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "var(--t-muted)" }}>
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
              maxWidth: 380,
              margin: "0 auto 20px",
              fontWeight: 500,
              lineHeight: 1.4,
            }}
          >
            Add important contacts like your lawyer, chartered accountant, financial advisor or
            insurance agent for quick reference.
          </div>
          <Button
            variant="accent"
            icon={<Plus size={14} />}
            onClick={() => setShowContactForm(true)}
          >
            Add Key Contact
          </Button>
        </Card>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
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
                boxShadow: "var(--shadow-sm)",
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", color: THEME.accent, flexShrink: 0 }}>
                    <Briefcase size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14.5, fontWeight: 800, color: THEME.ink }}>
                      {c.name}
                    </div>
                    <Badge variant="accent" style={{ fontSize: 9.5, marginTop: 4 }}>
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
                    <Edit2 size={13} />
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
                      background: `color-mix(in srgb, ${THEME.rust} 4%, transparent)`,
                      border: `1.5px solid color-mix(in srgb, ${THEME.rust} 19%, transparent)`,
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

              {(c.phone || c.email) && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: "10px 14px",
                    borderRadius: 10,
                    background: "var(--surface-1)",
                    border: `1px solid ${THEME.line}`,
                  }}
                >
                  {c.phone && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12.5,
                        color: THEME.muted,
                        fontWeight: 500,
                      }}
                    >
                      <Phone size={13} style={{ color: THEME.accent }} />
                      <Prv>{c.phone}</Prv>
                    </div>
                  )}
                  {c.email && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12.5,
                        color: THEME.muted,
                        fontWeight: 500,
                      }}
                    >
                      <Mail size={13} style={{ color: THEME.accent }} />
                      <Prv>{c.email}</Prv>
                    </div>
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
            </Card>
          ))}
        </div>
      )}

      {/* Assign Nominee Modal */}
      {assignModal && (
        <Modal
          title={assignModal.covered ? "Edit Nominee" : "Assign Nominee"}
          onClose={() => setAssignModal(null)}
        >
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Badge variant="muted" style={{ fontSize: 10 }}>
                {assignModal.label}
              </Badge>
              <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                {assignModal.name}
              </span>
            </div>
            {assignModal.identifier && (
              <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 500 }}>
                <Prv>{assignModal.identifier}</Prv>
              </div>
            )}
            <div style={{ fontSize: 13, color: THEME.ink, fontWeight: 700, marginTop: 8 }}>
              Value: <Money value={assignModal.value} variant="full" />
            </div>
          </div>

          <div
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              background: `color-mix(in srgb, ${THEME.gold} 8%, transparent)`,
              border: `1px solid color-mix(in srgb, ${THEME.gold} 22%, transparent)`,
              fontSize: 11.5,
              color: THEME.muted,
              lineHeight: 1.5,
              marginBottom: 14,
            }}
          >
            A nominee is only a <b style={{ color: THEME.ink }}>trustee/caretaker</b> for this
            asset after death — not automatically its legal owner. Actual ownership follows your
            Will (or succession law if there's none). Keep this in sync with your Will to avoid
            disputes.
          </div>

          <Field label="Nominee Name">
            <Input
              value={assignName}
              onChange={(e) => setAssignName(e.target.value)}
              placeholder="Enter nominee name"
            />
          </Field>

          <Field label="Relation">
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
            saveLabel={assignModal.covered ? "Update Nominee" : "Assign Nominee"}
            disabled={!assignName.trim()}
          />
        </Modal>
      )}

      {/* Will Document Modal */}
      {showWillForm && (
        <Modal
          title={editWill ? "Edit Will Document" : "Add Will Document"}
          onClose={resetWillForm}
          maxWidth={620}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="Will Date">
              <Input
                type="date"
                value={willForm.date}
                onChange={(e) => setWillForm({ ...willForm, date: e.target.value })}
              />
            </Field>
            <Field label="Physical Location">
              <Input
                value={willForm.location}
                onChange={(e) => setWillForm({ ...willForm, location: e.target.value })}
                placeholder="e.g. Bank locker, Home safe"
              />
            </Field>
          </div>

          <Field label="Witnesses">
            <Input
              value={willForm.witnesses}
              onChange={(e) => setWillForm({ ...willForm, witnesses: e.target.value })}
              placeholder="Names of witnesses"
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="Lawyer Name">
              <Input
                value={willForm.lawyerName}
                onChange={(e) => setWillForm({ ...willForm, lawyerName: e.target.value })}
                placeholder="Lawyer's full name"
              />
            </Field>
            <Field label="Lawyer Contact">
              <Input
                value={willForm.lawyerContact}
                onChange={(e) => setWillForm({ ...willForm, lawyerContact: e.target.value })}
                placeholder="Phone or email"
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={willForm.notes}
              onChange={(e) => setWillForm({ ...willForm, notes: e.target.value })}
              placeholder="Any additional notes..."
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
            saveLabel={editWill ? "Update Will" : "Save Will"}
            loading={savingWill}
          />
        </Modal>
      )}

      {/* Key Contact Modal */}
      {showContactForm && (
        <Modal
          title={editContact ? "Edit Contact" : "Add Key Contact"}
          onClose={resetContactForm}
          maxWidth={560}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Field label="Name">
              <Input
                value={contactForm.name}
                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                placeholder="Contact name"
              />
            </Field>
            <Field label="Role">
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
            <Field label="Phone">
              <Input
                value={contactForm.phone}
                onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                placeholder="Phone number"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                placeholder="Email address"
              />
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={contactForm.notes}
              onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
              placeholder="Any additional notes..."
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
            saveLabel={editContact ? "Update Contact" : "Save Contact"}
            disabled={!contactForm.name.trim()}
            loading={savingContact}
          />
        </Modal>
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
};
