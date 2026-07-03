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
  BookOpen,
  Briefcase,
  X,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import {
  fmtINR,
  fmtINRFull,
  today,
  monthsBetween,
  rdMaturity,
  calculateEpfBalance,
} from "../../utils/finance";
import { Prv } from "../../context/PrivacyContext";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";
import { Modal, ModalActions } from "../ui/Modal";
import { Field, Input, Select } from "../ui/Form";

// ─────────────────────────────────────────────────────────────────────────────
// Asset type definitions for nominee scanning
// ─────────────────────────────────────────────────────────────────────────────

const assetTypes = [
  {
    key: "bankAccounts",
    label: "Bank Account",
    nameField: "bankName",
    valueField: "balance",
    idLabel: (a: any) => a.accountNumber || "",
  },
  {
    key: "fixedDeposits",
    label: "Fixed Deposit",
    nameField: "bank",
    valueField: "principal",
    idLabel: (a: any) => `${fmtINRFull(a.principal)} @ ${a.rate}%`,
  },
  {
    key: "recurringDeposits",
    label: "Recurring Deposit",
    nameField: "bank",
    valueField: null,
    calcValue: (a: any) => {
      const elapsed = a.startDate
        ? Math.min(Number(a.tenureMonths || 0), Math.max(0, monthsBetween(a.startDate, today())))
        : Number(a.tenureMonths || 0);
      return rdMaturity(Number(a.monthly || 0), Number(a.rate || 0), elapsed);
    },
    idLabel: (a: any) => `${fmtINRFull(a.monthly)}/mo`,
  },
  {
    key: "mutualFunds",
    label: "Mutual Fund",
    nameField: "name",
    valueField: null,
    calcValue: (a: any) => (a.units || 0) * (a.currentNav || a.buyNav || 0),
    idLabel: (a: any) => a.folio || "",
  },
  {
    key: "stocks",
    label: "Stock Holding",
    nameField: "symbol",
    valueField: null,
    calcValue: (a: any) => (a.qty || 0) * (a.currentPrice || a.avgPrice || 0),
    idLabel: (a: any) => a.exchange || "",
  },
  {
    key: "bonds",
    label: "Bond",
    nameField: "name",
    valueField: null,
    calcValue: (a: any) =>
      Number(a.totalInvestmentAmount || a.totalPrincipalAmount || a.faceValue || 0),
    idLabel: (a: any) => a.isin || "",
  },
  {
    key: "goldHoldings",
    label: "Gold / SGB",
    nameField: "type",
    valueField: null,
    calcValue: (a: any) => Number(a.currentValue || a.investedAmount || 0),
    idLabel: (a: any) => a.subType || a.form || "",
  },
  {
    key: "demat",
    label: "Demat Account",
    nameField: "broker",
    valueField: null,
    calcValue: () => 0,
    idLabel: (a: any) => a.accountId || a.dpId || "",
  },
  {
    key: "ppf",
    label: "PPF",
    nameField: "institution",
    valueField: "balance",
    idLabel: (a: any) => a.accountNumber || "",
  },
  {
    key: "nps",
    label: "NPS",
    nameField: "fundManager",
    valueField: null,
    calcValue: (a: any) => {
      const bal = Number(a.balance) || 0;
      if (bal > 0) return bal;
      return (a.transactions || []).reduce(
        (s: number, t: any) =>
          s + (Number(t.employeeAmount) || 0) + (Number(t.employerAmount) || 0),
        0
      );
    },
    idLabel: (a: any) => a.pran || "",
  },
  {
    key: "epf",
    label: "EPF",
    nameField: "employer",
    valueField: null,
    calcValue: (a: any) => calculateEpfBalance(a),
    idLabel: (a: any) => a.uan || "",
  },
  {
    key: "lic",
    label: "LIC Policy",
    nameField: "planName",
    valueField: "sumAssured",
    idLabel: (a: any) => a.policyNumber || "",
  },
  {
    key: "termPlans",
    label: "Term Plan",
    nameField: "insurer",
    valueField: "coverAmount",
    idLabel: (a: any) => a.policyNumber || "",
  },
  {
    key: "investmentPlans",
    label: "Investment Plan",
    nameField: "insurer",
    valueField: "sumAssured",
    idLabel: (a: any) => a.policyNumber || "",
  },
  {
    key: "realEstateProperties",
    label: "Real Estate",
    nameField: "name",
    valueField: "marketValue",
    idLabel: (a: any) => a.location || "",
  },
  {
    key: "vehicles",
    label: "Vehicle",
    nameField: "name",
    valueField: "currentValue",
    idLabel: (a: any) => a.registration || "",
  },
];

const RELATION_OPTIONS = ["Spouse", "Child", "Parent", "Sibling", "Other"];
const CONTACT_ROLES = ["Lawyer", "CA", "Financial Advisor", "Insurance Agent", "Other"];

type FilterMode = "all" | "missing" | "covered";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: flatten all assets into a unified list
// ─────────────────────────────────────────────────────────────────────────────

interface FlatAsset {
  key: string;
  label: string;
  id: string;
  name: string;
  identifier: string;
  value: number;
  nominee: string;
  nomineeRelation: string;
  covered: boolean;
}

function flattenAssets(state: any): FlatAsset[] {
  const result: FlatAsset[] = [];
  for (const at of assetTypes) {
    const items = state[at.key] || [];
    for (const item of items) {
      const val = at.valueField
        ? Number(item[at.valueField]) || 0
        : at.calcValue
          ? at.calcValue(item)
          : 0;
      result.push({
        key: at.key,
        label: at.label,
        id: item.id,
        name: item[at.nameField] || at.label,
        identifier: at.idLabel(item),
        value: val,
        nominee: item.nominee || "",
        nomineeRelation: item.nomineeRelation || "",
        covered: !!(item.nominee && item.nominee.trim()),
      });
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export const NomineeTrackerTab = ({ state, addItem, removeItem, updateItem }: any) => {
  // ── State ────────────────────────────────────────────────────────────────
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");
  const [assignModal, setAssignModal] = useState<FlatAsset | null>(null);
  const [assignName, setAssignName] = useState("");
  const [assignRelation, setAssignRelation] = useState("Spouse");

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

  // ── Derived data ─────────────────────────────────────────────────────────
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

  const documents: any[] = state.documents || [];
  const willDocs = documents.filter((d: any) => d.type === "will");
  const keyContacts = documents.filter((d: any) => d.type === "key_contact");

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openAssignModal = (asset: FlatAsset) => {
    setAssignName(asset.nominee);
    setAssignRelation(asset.nomineeRelation || "Spouse");
    setAssignModal(asset);
  };

  const handleAssign = () => {
    if (!assignModal || !assignName.trim()) return;
    updateItem(assignModal.key, assignModal.id, {
      nominee: assignName.trim(),
      nomineeRelation: assignRelation,
    });
    setAssignModal(null);
    setAssignName("");
    setAssignRelation("Spouse");
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

  const handleSaveWill = () => {
    const payload = { type: "will", ...willForm };
    if (editWill) {
      removeItem("documents", editWill.id);
      addItem("documents", { ...payload, id: editWill.id });
    } else {
      addItem("documents", payload);
    }
    resetWillForm();
  };

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

  const handleSaveContact = () => {
    if (!contactForm.name.trim()) return;
    const payload = { type: "key_contact", ...contactForm };
    if (editContact) {
      removeItem("documents", editContact.id);
      addItem("documents", { ...payload, id: editContact.id });
    } else {
      addItem("documents", payload);
    }
    resetContactForm();
  };

  // ── Empty state ──────────────────────────────────────────────────────────
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
          title="No assets found"
          description="Add bank accounts, investments, insurance policies and other assets first, then come back to track nominee assignments."
          pills={["Bank Accounts", "Investments", "Insurance", "Real Estate"]}
          buttonLabel="Go to Dashboard"
          onAdd={() => {}}
        />
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "24px 0" }}>
      {/* ── Section Title ──────────────────────────────────────────── */}
      <SectionTitle sub="Track nominee assignments, will documents and key financial contacts across all your assets.">
        Will & Nominee Tracker
      </SectionTitle>

      {/* ── Coverage Dashboard ─────────────────────────────────────── */}
      <Card style={{ padding: "28px 28px 24px", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background:
                coveragePercent === 100
                  ? `linear-gradient(135deg, ${THEME.sage} 0%, #34d399 100%)`
                  : coveragePercent >= 50
                    ? `linear-gradient(135deg, ${THEME.gold} 0%, #fbbf24 100%)`
                    : `linear-gradient(135deg, ${THEME.rust} 0%, #f87171 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {coveragePercent === 100 ? (
              <ShieldCheck size={24} color="#fff" />
            ) : coveragePercent >= 50 ? (
              <ShieldAlert size={24} color="#fff" />
            ) : (
              <ShieldX size={24} color="#fff" />
            )}
          </div>
          <div>
            <div
              style={{ fontSize: 20, fontWeight: 800, color: THEME.ink, letterSpacing: "-0.03em" }}
            >
              Nominee Coverage
            </div>
            <div style={{ fontSize: 13, color: THEME.muted, marginTop: 2 }}>
              {coveragePercent === 100
                ? "All assets have nominees assigned"
                : `${missingAssets.length} asset${missingAssets.length === 1 ? "" : "s"} still need nominees`}
            </div>
          </div>
          <div
            style={{
              marginLeft: "auto",
              fontSize: 36,
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

        {/* Progress bar */}
        <div
          style={{
            height: 10,
            borderRadius: 5,
            background: `color-mix(in srgb, ${THEME.line} 60%, transparent)`,
            overflow: "hidden",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              width: `${coveragePercent}%`,
              height: "100%",
              borderRadius: 5,
              background:
                coveragePercent === 100
                  ? `linear-gradient(90deg, ${THEME.sage}, #34d399)`
                  : coveragePercent >= 50
                    ? `linear-gradient(90deg, ${THEME.gold}, #fbbf24)`
                    : `linear-gradient(90deg, ${THEME.rust}, #f87171)`,
              transition: "width 0.6s ease",
            }}
          />
        </div>

        {/* Stat cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 14,
          }}
        >
          <StatCard
            label="Assets Covered"
            value={String(coveredAssets.length)}
            sub={`of ${totalAssets} total`}
            icon={<ShieldCheck />}
            color={THEME.sage}
          />
          <StatCard
            label="Without Nominee"
            value={String(missingAssets.length)}
            sub={missingAssets.length === 0 ? "None remaining" : "Action needed"}
            subColor={missingAssets.length > 0 ? THEME.rust : undefined}
            icon={<ShieldAlert />}
            color={missingAssets.length > 0 ? THEME.rust : THEME.sage}
          />
          <StatCard
            label="Value at Risk"
            value={fmtINRFull(valueAtRisk)}
            sub="Without nominee protection"
            icon={<AlertTriangle />}
            color={THEME.gold}
          />
        </div>
      </Card>

      {/* ── Filter & Search Bar ────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
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
              style={{
                padding: "7px 16px",
                borderRadius: 20,
                border: `1.5px solid ${isActive ? THEME.accent : THEME.line}`,
                background: isActive
                  ? `color-mix(in srgb, ${THEME.accent} 10%, transparent)`
                  : "transparent",
                color: isActive ? THEME.accent : THEME.muted,
                fontWeight: 700,
                fontSize: 12,
                cursor: "pointer",
                transition: "all 0.2s",
                letterSpacing: "0.02em",
              }}
            >
              {labels[f]} ({counts[f]})
            </button>
          );
        })}
        <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 34px",
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 10,
              border: `1.5px solid ${THEME.line}`,
              background: "var(--surface-0, #fff)",
              color: THEME.ink,
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* ── Asset-wise Nominee Grid ────────────────────────────────── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 40 }}>
        {filteredAssets.length === 0 ? (
          <Card style={{ padding: "40px 24px", textAlign: "center" }}>
            <div style={{ fontSize: 15, color: THEME.muted, fontWeight: 600 }}>
              No assets match your search or filter.
            </div>
          </Card>
        ) : (
          filteredAssets.map((asset) => (
            <Card
              key={`${asset.key}-${asset.id}`}
              style={{
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
              hover
            >
              {/* Asset type icon */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: asset.covered
                    ? `color-mix(in srgb, ${THEME.sage} 12%, transparent)`
                    : `color-mix(in srgb, ${THEME.rust} 12%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {asset.covered ? (
                  <ShieldCheck size={18} color={THEME.sage} />
                ) : (
                  <ShieldAlert size={18} color={THEME.rust} />
                )}
              </div>

              {/* Asset info */}
              <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
                    {asset.name}
                  </span>
                  <Badge variant="muted" style={{ fontSize: 10 }}>
                    {asset.label}
                  </Badge>
                </div>
                {asset.identifier && (
                  <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                    <Prv>{asset.identifier}</Prv>
                  </div>
                )}
              </div>

              {/* Value */}
              <div style={{ flex: "0 0 auto", textAlign: "right", minWidth: 100 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Value
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 800,
                    color: THEME.ink,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  <Prv>{fmtINRFull(asset.value)}</Prv>
                </div>
              </div>

              {/* Nominee info */}
              <div style={{ flex: "0 0 auto", textAlign: "right", minWidth: 120 }}>
                {asset.covered ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                      {asset.nominee}
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>{asset.nomineeRelation}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: THEME.rust, fontWeight: 600 }}>No nominee</div>
                )}
              </div>

              {/* Status badge */}
              <Badge
                variant={asset.covered ? "sage" : "rust"}
                style={{ fontSize: 10, flexShrink: 0 }}
              >
                {asset.covered ? "Covered" : "Missing"}
              </Badge>

              {/* Action button */}
              <Button
                variant={asset.covered ? "ghost" : "primary"}
                size="sm"
                icon={asset.covered ? <Edit2 size={12} /> : <UserPlus size={12} />}
                onClick={() => openAssignModal(asset)}
                style={{ flexShrink: 0 }}
              >
                {asset.covered ? "Edit" : "Assign"}
              </Button>
            </Card>
          ))
        )}
      </div>

      {/* ── Will Tracker Section ───────────────────────────────────── */}
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
        <Card style={{ padding: "40px 24px", textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${THEME.gold} 0%, #fbbf24 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Scale size={26} color="#fff" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, marginBottom: 6 }}>
            No will documents recorded
          </div>
          <div
            style={{
              fontSize: 13,
              color: THEME.muted,
              marginBottom: 20,
              maxWidth: 380,
              margin: "0 auto 20px",
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 40 }}>
          {willDocs.map((doc: any) => (
            <Card key={doc.id} style={{ padding: "20px 24px" }}>
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
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: `color-mix(in srgb, ${THEME.gold} 12%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Scale size={20} color={THEME.gold} />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: THEME.ink }}>
                      Will Document
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                      Dated: {doc.date || "Not specified"}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
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
                    onClick={() => removeItem("documents", doc.id)}
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
                  borderTop: `1px solid ${THEME.line}`,
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
                            fontWeight: 700,
                            color: THEME.muted,
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            marginBottom: 4,
                          }}
                        >
                          {f.label}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: THEME.ink }}>
                          {f.value}
                        </div>
                      </div>
                    )
                )}
              </div>

              {doc.notes && (
                <div
                  style={{
                    marginTop: 12,
                    fontSize: 13,
                    color: THEME.muted,
                    lineHeight: 1.6,
                    fontStyle: "italic",
                  }}
                >
                  {doc.notes}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ── Key Contacts Section ───────────────────────────────────── */}
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
        <Card style={{ padding: "40px 24px", textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${THEME.accent} 0%, color-mix(in srgb, var(--t-accent) 65%, white) 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Users size={26} color="#fff" />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink, marginBottom: 6 }}>
            No key contacts added
          </div>
          <div
            style={{
              fontSize: 13,
              color: THEME.muted,
              marginBottom: 20,
              maxWidth: 380,
              margin: "0 auto 20px",
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
            gap: 14,
            marginBottom: 24,
          }}
        >
          {keyContacts.map((c: any) => (
            <Card key={c.id} style={{ padding: "20px 22px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: `color-mix(in srgb, ${THEME.accent} 12%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Briefcase size={18} color={THEME.accent} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>{c.name}</div>
                    <Badge variant="accent" style={{ fontSize: 10, marginTop: 4 }}>
                      {c.role}
                    </Badge>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    onClick={() => openEditContact(c)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      color: THEME.muted,
                    }}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => removeItem("documents", c.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 4,
                      color: THEME.rust,
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {(c.phone || c.email) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {c.phone && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 13,
                        color: THEME.muted,
                      }}
                    >
                      <Phone size={13} />
                      <Prv>{c.phone}</Prv>
                    </div>
                  )}
                  {c.email && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 13,
                        color: THEME.muted,
                      }}
                    >
                      <Mail size={13} />
                      <Prv>{c.email}</Prv>
                    </div>
                  )}
                </div>
              )}

              {c.notes && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: THEME.muted,
                    lineHeight: 1.5,
                    fontStyle: "italic",
                  }}
                >
                  {c.notes}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* ── Assign Nominee Modal ───────────────────────────────────── */}
      {assignModal && (
        <Modal
          title={assignModal.covered ? "Edit Nominee" : "Assign Nominee"}
          onClose={() => setAssignModal(null)}
        >
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Badge variant="muted" style={{ fontSize: 10 }}>
                {assignModal.label}
              </Badge>
              <span style={{ fontSize: 14, fontWeight: 700, color: THEME.ink }}>
                {assignModal.name}
              </span>
            </div>
            {assignModal.identifier && (
              <div style={{ fontSize: 12, color: THEME.muted }}>{assignModal.identifier}</div>
            )}
            <div style={{ fontSize: 13, color: THEME.ink, fontWeight: 600, marginTop: 4 }}>
              Value: <Prv>{fmtINRFull(assignModal.value)}</Prv>
            </div>
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

          <ModalActions
            onSave={handleAssign}
            onClose={() => setAssignModal(null)}
            saveLabel={assignModal.covered ? "Update Nominee" : "Assign Nominee"}
            disabled={!assignName.trim()}
          />
        </Modal>
      )}

      {/* ── Will Document Modal ────────────────────────────────────── */}
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
          />
        </Modal>
      )}

      {/* ── Key Contact Modal ──────────────────────────────────────── */}
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
          />
        </Modal>
      )}
    </div>
  );
};
