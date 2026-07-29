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
import {
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

// Groups asset types into sections for the tracker UI. Stocks and mutual
// fund schemes are deliberately absent here — they're not nominee-able on
// their own (see flattenAssets below).
const CATEGORY_MAP: Record<string, string> = {
  bankAccounts: "Bank & Deposits",
  fixedDeposits: "Bank & Deposits",
  recurringDeposits: "Bank & Deposits",
  demat: "Investments",
  mutualFunds: "Investments",
  bonds: "Investments",
  goldHoldings: "Investments",
  ppf: "Retirement",
  nps: "Retirement",
  epf: "Retirement",
  lic: "Insurance",
  termPlans: "Insurance",
  investmentPlans: "Insurance",
  realEstateProperties: "Property & Vehicles",
  vehicles: "Property & Vehicles",
};
const CATEGORY_ORDER = [
  "Bank & Deposits",
  "Investments",
  "Retirement",
  "Insurance",
  "Property & Vehicles",
];

interface FlatAsset {
  key: string;
  label: string;
  id: string;
  ids: string[];
  name: string;
  identifier: string;
  value: number;
  nominee: string;
  nomineeRelation: string;
  covered: boolean;
  category: string;
}

// In India, a nominee is registered once per demat account (covering every
// stock held in it) and once per mutual fund folio (covering every scheme
// under that folio) — never per individual stock or scheme. So stocks roll
// up into their demat account, and mutual fund schemes roll up into their
// folio group, instead of each getting their own nominee entry.
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
        ids: [item.id],
        name: item[at.nameField] || at.label,
        identifier: at.idLabel(item),
        value: val,
        nominee: item.nominee || "",
        nomineeRelation: item.nomineeRelation || "",
        covered: !!(item.nominee && item.nominee.trim()),
        category: CATEGORY_MAP[at.key] || "Other",
      });
    }
  }

  // Demat accounts — nominee lives on the account; its value is every
  // linked stock holding's current value.
  const stocks = state.stocks || [];
  for (const d of state.demat || []) {
    const linkedStocks = stocks.filter((s: any) => s.dematId === d.id);
    const val = linkedStocks.reduce(
      (s: number, st: any) =>
        s + (Number(st.qty) || 0) * (Number(st.currentPrice || st.avgPrice) || 0),
      0
    );
    result.push({
      key: "demat",
      label: "Demat Account",
      id: d.id,
      ids: [d.id],
      name: d.broker || "Demat Account",
      identifier: d.accountId || d.dpId || "",
      value: val,
      nominee: d.nominee || "",
      nomineeRelation: d.nomineeRelation || "",
      covered: !!(d.nominee && d.nominee.trim()),
      category: "Investments",
    });
  }

  // Mutual funds — nominee lives on the folio (one folio = one AMC
  // enrollment); schemes without a folio number can't be safely grouped, so
  // each stays its own entry until a folio is recorded.
  const mfGroups: Record<string, any[]> = {};
  for (const mf of state.mutualFunds || []) {
    const folio = (mf.folioNumber || "").trim();
    const groupKey = folio ? `folio:${folio}` : `item:${mf.id}`;
    (mfGroups[groupKey] = mfGroups[groupKey] || []).push(mf);
  }
  for (const groupKey of Object.keys(mfGroups)) {
    const items = mfGroups[groupKey];
    const withNominee = items.find((m) => m.nominee && m.nominee.trim());
    const rep = withNominee || items[0];
    const val = items.reduce(
      (s, m) => s + (Number(m.units) || 0) * (Number(m.currentNav || m.buyNav) || 0),
      0
    );
    const schemeNames = Array.from(new Set(items.map((m) => m.name).filter(Boolean)));
    result.push({
      key: "mutualFunds",
      label: "Mutual Fund",
      id: groupKey,
      ids: items.map((m) => m.id),
      name:
        schemeNames.length > 1
          ? `${schemeNames[0]} +${schemeNames.length - 1} more`
          : schemeNames[0] || "Mutual Fund",
      identifier: rep.folioNumber ? `Folio ${rep.folioNumber}` : "",
      value: val,
      nominee: rep.nominee || "",
      nomineeRelation: rep.nomineeRelation || "",
      covered: !!(rep.nominee && rep.nominee.trim()),
      category: "Investments",
    });
  }

  return result;
}

/* ─── Premium Nominee Bento Card ─────────────────────────────────── */
const NomineeStatCard = ({ label, value, sub, subColor, icon: Icon, color }: any) => {
  return (
    <div
      className="card-lift"
      style={{
        background:
          "linear-gradient(135deg, var(--surface-0) 0%, color-mix(in srgb, var(--surface-1) 12%, var(--surface-0)) 100%)",
        border: `1.5px solid ${THEME.line}`,
        borderTop: `4px solid ${color || THEME.accent}`,
        borderRadius: 16,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow:
          "0 4px 20px -2px rgba(0, 0, 0, 0.02), inset 0 1px 0 color-mix(in srgb, var(--t-ink) 4%, transparent)",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `color-mix(in srgb, ${color || THEME.accent} 12%, transparent)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: color || THEME.accent,
            flexShrink: 0,
          }}
        >
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
          {value}
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
  const [search, setSearch] = useState("");
  const [assignModal, setAssignModal] = useState<FlatAsset | null>(null);
  const [assignName, setAssignName] = useState("");
  const [assignRelation, setAssignRelation] = useState("Spouse");
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

  const documents: any[] = state.documents || [];
  const willDocs = documents.filter((d: any) => d.type === "will");
  const keyContacts = documents.filter((d: any) => d.type === "key_contact");

  // Handlers
  const openAssignModal = (asset: FlatAsset) => {
    setAssignName(asset.nominee);
    setAssignRelation(asset.nomineeRelation || "Spouse");
    setAssignModal(asset);
  };

  const handleAssign = async () => {
    if (!assignModal || !assignName.trim()) return;
    try {
      await Promise.all(
        assignModal.ids.map((itemId) =>
          updateItem(assignModal.key, itemId, {
            nominee: assignName.trim(),
            nomineeRelation: assignRelation,
          })
        )
      );
      setAssignModal(null);
      setAssignName("");
      setAssignRelation("Spouse");
    } catch (e: any) {
      showToast?.(`Failed to save nominee: ${e?.message || "Unknown error"}`, "error");
    }
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

  const handleSaveWill = async () => {
    const payload = { type: "will", ...willForm };
    try {
      if (editWill) {
        await updateItem("documents", editWill.id, payload);
      } else {
        await addItem("documents", payload);
      }
      resetWillForm();
    } catch (e: any) {
      showToast?.(`Failed to save will details: ${e?.message || "Unknown error"}`, "error");
    }
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

  const handleSaveContact = async () => {
    if (!contactForm.name.trim()) return;
    const payload = { type: "key_contact", ...contactForm };
    try {
      if (editContact) {
        await updateItem("documents", editContact.id, payload);
      } else {
        await addItem("documents", payload);
      }
      resetContactForm();
    } catch (e: any) {
      showToast?.(`Failed to save contact: ${e?.message || "Unknown error"}`, "error");
    }
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
                  ? `linear-gradient(135deg, ${THEME.sage} 0%, color-mix(in srgb, ${THEME.sage} 55%, white) 100%)`
                  : coveragePercent >= 50
                    ? `linear-gradient(135deg, ${THEME.gold} 0%, color-mix(in srgb, ${THEME.gold} 55%, white) 100%)`
                    : `linear-gradient(135deg, ${THEME.rust} 0%, color-mix(in srgb, ${THEME.rust} 55%, white) 100%)`,
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
            sub={`of ${totalAssets} total`}
            icon={<ShieldCheck size={16} />}
            color={THEME.sage}
          />
          <NomineeStatCard
            label="Without Nominee"
            value={String(missingAssets.length)}
            sub={missingAssets.length === 0 ? "None remaining" : "Action needed"}
            subColor={missingAssets.length > 0 ? THEME.rust : undefined}
            icon={<ShieldAlert size={16} />}
            color={missingAssets.length > 0 ? THEME.rust : THEME.sage}
          />
          <NomineeStatCard
            label="Value at Risk"
            value={fmtINRFull(valueAtRisk)}
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
                style={{
                  padding: "6px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: isActive ? THEME.accent : "transparent",
                  color: isActive ? "#fff" : THEME.ink,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isActive)
                    e.currentTarget.style.background = `color-mix(in srgb, ${THEME.accent} 8%, transparent)`;
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = "transparent";
                }}
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
      </div>

      {/* Asset Nominees — grouped into collapsible category sections */}
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
                            <Prv>{fmtINRFull(asset.value)}</Prv>
                          </div>
                        </div>

                        {/* Nominee info */}
                        <div style={{ flex: "0 0 auto", textAlign: "right", minWidth: 130 }}>
                          {asset.covered ? (
                            <>
                              <div style={{ fontSize: 13.5, fontWeight: 800, color: THEME.ink }}>
                                {asset.nominee}
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
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: `linear-gradient(135deg, ${THEME.gold} 0%, color-mix(in srgb, ${THEME.gold} 55%, white) 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Scale size={24} color="#fff" />
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
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: `color-mix(in srgb, ${THEME.gold} 12%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: THEME.gold,
                      flexShrink: 0,
                    }}
                  >
                    <Scale size={18} />
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
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete Will Document dated ${doc.date || "not specified"}? This cannot be undone.`
                        )
                      ) {
                        removeItem("documents", doc.id);
                      }
                    }}
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
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background: `linear-gradient(135deg, var(--accent) 0%, color-mix(in srgb, var(--accent) 65%, white) 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <Users size={24} color="#fff" />
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
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      background: `color-mix(in srgb, var(--accent) 12%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: THEME.accent,
                      flexShrink: 0,
                    }}
                  >
                    <Briefcase size={16} />
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
                    className="card-lift"
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
                      transition: "all 0.2s ease",
                    }}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete contact "${c.name}"? This cannot be undone.`)) {
                        removeItem("documents", c.id);
                      }
                    }}
                    className="card-lift"
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
                      transition: "all 0.2s ease",
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
                {assignModal.identifier}
              </div>
            )}
            <div style={{ fontSize: 13, color: THEME.ink, fontWeight: 700, marginTop: 8 }}>
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
          />
        </Modal>
      )}
    </div>
  );
};
