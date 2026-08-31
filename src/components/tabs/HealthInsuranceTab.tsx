// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Heart,
  Plus,
  Trash2,
  Pencil,
  Shield,
  AlertCircle,
  CheckCircle2,
  Users,
  Calendar,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  Clock,
  AlertTriangle,
  HeartPulse,
  Activity,
  Hospital,
  Building2,
  Sparkles,
  TrendingUp,
  Search,
  LayoutGrid,
  Table as TableIcon,
  ShieldCheck,
  Percent,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { fmtINRFull, uid, today } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { ModalSection } from "../ui/ModalSection";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { Badge } from "../ui/Badge";
import { StatCard } from "../ui/StatCard";
import { Money } from "../ui/Money";
import { ConfirmDialog } from "../ui/Feedback";
import { InsurerLogo } from "../ui/BrandLogos";

const POLICY_TYPES = [
  { value: "family_floater", label: "Family Floater" },
  { value: "individual", label: "Individual" },
  { value: "corporate", label: "Corporate / Group" },
  { value: "top_up", label: "Top-Up" },
  { value: "super_top_up", label: "Super Top-Up" },
  { value: "critical_illness", label: "Critical Illness" },
];

const FREQ_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annual: "Half-Yearly",
  annual: "Annual",
};

const TYPE_COLORS: Record<string, string> = {
  family_floater: THEME.accent,
  individual: THEME.sage,
  corporate: THEME.gold,
  top_up: THEME.violet,
  super_top_up: THEME.pink,
  critical_illness: THEME.rust,
};

function daysUntilRenewal(renewalDate: string): number | null {
  if (!renewalDate) return null;
  const diff = new Date(renewalDate).getTime() - new Date(today()).getTime();
  return Math.ceil(diff / 86400000);
}

function annualPremium(amount: number, freq: string): number {
  const mult: Record<string, number> = { monthly: 12, quarterly: 4, semi_annual: 2, annual: 1 };
  return amount * (mult[freq] || 1);
}

const PARENT_RELATION_RE = /parent|father|mother|dad|mom|papa|mummy|-in-law/i;
function isParentsPolicy(p: any): boolean {
  return (p.insuredMembers || []).some((m: any) => PARENT_RELATION_RE.test(m?.relation || ""));
}
const SEC80D_SELF_LIMIT = 25000;
const SEC80D_PARENTS_LIMIT = 25000;

function waitingPeriodInfo(
  p: any
): { totalMonths: number; elapsedMonths: number; remainingMonths: number; done: boolean } | null {
  const years = Number(p.waitingPeriodYears);
  if (!(years > 0) || !p.startDate) return null;
  const start = new Date(p.startDate + "T00:00:00");
  if (isNaN(start.getTime())) return null;
  const now = new Date(today() + "T00:00:00");
  const totalMonths = Math.round(years * 12);
  const elapsedMonthsRaw =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  const elapsedMonths = Math.min(totalMonths, Math.max(0, elapsedMonthsRaw));
  return {
    totalMonths,
    elapsedMonths,
    remainingMonths: totalMonths - elapsedMonths,
    done: elapsedMonths >= totalMonths,
  };
}

function hasRoomRentCap(p: any): boolean {
  const v = (p.roomRentLimit || "").trim();
  if (!v) return false;
  return !/^(no\s*(sub-?)?limit|none|nil|n\/?a|unlimited)/i.test(v);
}

const ADEQUACY_PER_MEMBER_MIN = 500000;
function coverageAdequacyNote(p: any): number | null {
  if (["top_up", "super_top_up", "critical_illness"].includes(p.policyType)) return null;
  const members = Math.max(1, p.insuredMembers?.length || 1);
  const perMember = Number(p.sumInsured || 0) / members;
  if (perMember >= ADEQUACY_PER_MEMBER_MIN) return null;
  return perMember;
}

const EMPTY: any = {
  insurer: "",
  policyName: "",
  policyNumber: "",
  policyType: "family_floater",
  owner: "self",
  insuredMembers: [],
  sumInsured: "",
  premium: "",
  premiumFrequency: "annual",
  startDate: "",
  renewalDate: "",
  hospitalNetwork: "",
  cashless: true,
  preExistingCovered: false,
  waitingPeriodYears: "",
  noClaimBonus: "",
  roomRentLimit: "",
  notes: "",
  claims: [],
};

function PolicyForm({ initial, onSave, onClose, saving = false }: any) {
  const { familyProfiles } = useMasterData();
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [members, setMembers] = useState<{ name: string; relation: string }[]>(
    initial?.insuredMembers || []
  );
  const [memberName, setMemberName] = useState("");
  const [memberRelation, setMemberRelation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string, v: any) => {
    setForm((f: any) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  const addMember = () => {
    if (!memberName.trim()) return;
    setMembers((m) => [
      ...m,
      { name: memberName.trim(), relation: memberRelation.trim() || "self" },
    ]);
    setMemberName("");
    setMemberRelation("");
  };

  const removeMember = (i: number) => setMembers((m) => m.filter((_, idx) => idx !== i));

  const save = () => {
    const next: Record<string, string> = {};
    if (!form.insurer.trim()) next.insurer = "Insurer name is required.";
    if (!(Number(form.sumInsured) > 0)) next.sumInsured = "Enter a sum insured greater than ₹0.";
    if (!(Number(form.premium) > 0)) next.premium = "Enter a premium greater than ₹0.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    onSave({ ...form, insuredMembers: members, id: initial?.id || uid() });
  };

  const g2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };

  return (
    <Modal
      title={initial?.id ? "Edit Health Insurance Policy" : "Add Health Insurance Policy"}
      onClose={onClose}
      maxWidth={640}
    >
      <ModalSection title="Policy Details" first />
      <div className="form-grid-2" style={g2}>
        <Field label="Insurer / Company *" error={errors.insurer}>
          <input
            className="form-input"
            value={form.insurer}
            onChange={(e) => set("insurer", e.target.value)}
            placeholder="e.g. Star Health, HDFC Ergo, Care"
          />
        </Field>
        <Field label="Policy Name">
          <input
            className="form-input"
            value={form.policyName}
            onChange={(e) => set("policyName", e.target.value)}
            placeholder="e.g. Optima Restore, Supreme"
          />
        </Field>
        <Field label="Policy Number">
          <input
            className="form-input"
            value={form.policyNumber}
            onChange={(e) => set("policyNumber", e.target.value)}
            placeholder="Policy / Certificate No."
          />
        </Field>
        <Field label="Policy Type">
          <select
            className="form-input"
            value={form.policyType}
            onChange={(e) => set("policyType", e.target.value)}
          >
            {POLICY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Owner / Profile">
          <select
            className="form-input"
            value={form.owner}
            onChange={(e) => set("owner", e.target.value)}
          >
            {familyProfiles.map((p: any) => (
              <option key={p.id} value={p.id}>
                {formatProfileOption(p)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <ModalSection title="Coverage & Premium" />
      <div className="form-grid-2" style={g2}>
        <Field label="Sum Insured (₹) *" error={errors.sumInsured}>
          <input
            className="form-input"
            type="number"
            value={form.sumInsured}
            onChange={(e) => set("sumInsured", e.target.value)}
            placeholder="e.g. 1000000"
          />
        </Field>
        <Field label="Premium (₹) *" error={errors.premium}>
          <input
            className="form-input"
            type="number"
            value={form.premium}
            onChange={(e) => set("premium", e.target.value)}
            placeholder="e.g. 18500"
          />
        </Field>
        <Field label="Premium Frequency">
          <select
            className="form-input"
            value={form.premiumFrequency}
            onChange={(e) => set("premiumFrequency", e.target.value)}
          >
            {Object.entries(FREQ_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Start Date">
          <input
            className="form-input"
            type="date"
            value={form.startDate}
            onChange={(e) => set("startDate", e.target.value)}
          />
        </Field>
        <Field label="Renewal Date">
          <input
            className="form-input"
            type="date"
            value={form.renewalDate}
            onChange={(e) => set("renewalDate", e.target.value)}
          />
        </Field>
      </div>

      <ModalSection title="Policy Features" />
      <div className="form-grid-2" style={g2}>
        <Field label="Hospital Network">
          <input
            className="form-input"
            value={form.hospitalNetwork}
            onChange={(e) => set("hospitalNetwork", e.target.value)}
            placeholder="e.g. 10,000+ hospitals"
          />
        </Field>
        <Field label="Waiting Period (years)">
          <input
            className="form-input"
            type="number"
            value={form.waitingPeriodYears}
            onChange={(e) => set("waitingPeriodYears", e.target.value)}
            placeholder="e.g. 2"
          />
        </Field>
        <Field label="No Claim Bonus (₹)">
          <input
            className="form-input"
            type="number"
            value={form.noClaimBonus}
            onChange={(e) => set("noClaimBonus", e.target.value)}
            placeholder="Current NCB amount"
          />
        </Field>
        <Field label="Room Rent Sub-limit">
          <input
            className="form-input"
            value={form.roomRentLimit}
            onChange={(e) => set("roomRentLimit", e.target.value)}
            placeholder="e.g. No Limit, 1% of SI/day"
          />
        </Field>
      </div>

      <div style={{ display: "flex", gap: 18, marginTop: 14 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={form.cashless}
            onChange={(e) => set("cashless", e.target.checked)}
            style={{ accentColor: THEME.accent }}
          />
          Cashless Enabled
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={form.preExistingCovered}
            onChange={(e) => set("preExistingCovered", e.target.checked)}
            style={{ accentColor: THEME.accent }}
          />
          Pre-Existing Diseases Covered
        </label>
      </div>

      <ModalSection title="Insured Family Members" />
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          className="form-input"
          value={memberName}
          onChange={(e) => setMemberName(e.target.value)}
          placeholder="Member Name"
          style={{ flex: 2 }}
        />
        <input
          className="form-input"
          value={memberRelation}
          onChange={(e) => setMemberRelation(e.target.value)}
          placeholder="Relation (self, spouse, child, parent)"
          style={{ flex: 1.5 }}
        />
        <Button size="sm" variant="ghost" onClick={addMember}>
          Add
        </Button>
      </div>
      {members.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {members.map((m, i) => (
            <Badge key={i} variant="muted" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {m.name} ({m.relation})
              <button
                onClick={() => removeMember(i)}
                style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 0 }}
              >
                <X size={12} />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Field label="Notes & Exclusions">
        <textarea
          className="form-input"
          rows={2}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="e.g. Critical illness rider included, deductible ₹2L"
        />
      </Field>

      <ModalActions onSave={save} onClose={onClose} saveLabel={initial?.id ? "Save Changes" : "Add Policy"} disabled={saving} loading={saving} />
    </Modal>
  );
}

function ClaimModal({ policy, onClose, onSave, saving = false }: any) {
  const [claims, setClaims] = useState<any[]>(policy.claims || []);
  const [form, setForm] = useState({
    claimDate: today(),
    hospitalName: "",
    patientName: "",
    reason: "",
    amount: "",
    settledAmount: "",
    settled: false,
    claimType: "cashless",
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const addClaim = () => {
    if (!form.amount || !form.hospitalName) return;
    const newClaim = {
      ...form,
      id: uid(),
      amount: Number(form.amount),
      settledAmount: form.settledAmount ? Number(form.settledAmount) : undefined,
    };
    const updated = [...claims, newClaim];
    setClaims(updated);
    onSave(updated);
  };

  const removeClaim = (id: string) => {
    const updated = claims.filter((c) => c.id !== id);
    setClaims(updated);
    onSave(updated);
  };

  const toggleSettled = (id: string) => {
    const updated = claims.map((c) => (c.id === id ? { ...c, settled: !c.settled } : c));
    setClaims(updated);
    onSave(updated);
  };

  return (
    <Modal title={`Claims for ${policy.insurer} (${policy.policyName || "Policy"})`} onClose={onClose} maxWidth={580}>
      <ModalSection title="Existing Claims" first />
      {claims.length === 0 ? (
        <div style={{ color: THEME.muted, fontSize: 13, padding: "8px 0" }}>No claims logged yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {claims.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface-1)",
                border: `1px solid ${THEME.line}`,
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: THEME.ink }}>
                  {c.patientName ? `${c.patientName} at ` : ""}{c.hospitalName}
                </div>
                <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                  {c.claimDate} · <Money value={Number(c.amount)} variant="full" /> · {c.claimType}
                  {c.reason ? ` · ${c.reason}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Badge variant={c.settled ? "sage" : "gold"}>
                  {c.settled ? "Settled" : "In Review"}
                </Badge>
                <button
                  onClick={() => toggleSettled(c.id)}
                  style={{ fontSize: 11, color: THEME.accent, background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                >
                  {c.settled ? "Mark Pending" : "Mark Settled"}
                </button>
                <button
                  onClick={() => removeClaim(c.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 2 }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ModalSection title="Log New Claim" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Hospital Name *">
          <input className="form-input" value={form.hospitalName} onChange={(e) => set("hospitalName", e.target.value)} />
        </Field>
        <Field label="Patient Name">
          <input className="form-input" value={form.patientName} onChange={(e) => set("patientName", e.target.value)} />
        </Field>
        <Field label="Claim Date">
          <input type="date" className="form-input" value={form.claimDate} onChange={(e) => set("claimDate", e.target.value)} />
        </Field>
        <Field label="Claimed Amount (₹) *">
          <input type="number" className="form-input" value={form.amount} onChange={(e) => set("amount", e.target.value)} />
        </Field>
        <Field label="Claim Type">
          <select className="form-input" value={form.claimType} onChange={(e) => set("claimType", e.target.value)}>
            <option value="cashless">Cashless</option>
            <option value="reimbursement">Reimbursement</option>
          </select>
        </Field>
        <Field label="Diagnosis / Reason">
          <input className="form-input" value={form.reason} onChange={(e) => set("reason", e.target.value)} placeholder="e.g. Dengue, Surgery" />
        </Field>
      </div>
      <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
        <Button size="sm" variant="accent" onClick={addClaim} disabled={saving} loading={saving}>
          Add Claim Record
        </Button>
      </div>
    </Modal>
  );
}

export function HealthInsuranceTab({ state, addItem, removeItem, updateItem, showToast }: any) {
  const policies: any[] = state.healthInsurance || [];
  const [modal, setModal] = useState<any>(null);
  const [claimModal, setClaimModal] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"cards" | "claims" | "table">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);

  const totalCover = policies.reduce((s: number, p: any) => s + Number(p.sumInsured || 0), 0);
  const totalAnnualPremium = policies.reduce(
    (s: number, p: any) => s + annualPremium(Number(p.premium || 0), p.premiumFrequency || "annual"),
    0
  );

  const renewingSoon = policies.filter((p: any) => {
    const d = daysUntilRenewal(p.renewalDate);
    return d !== null && d >= 0 && d <= 30;
  });

  const selfHealthPremium = policies
    .filter((p: any) => !isParentsPolicy(p))
    .reduce(
      (s: number, p: any) => s + annualPremium(Number(p.premium || 0), p.premiumFrequency || "annual"),
      0
    );
  const parentsHealthPremium = policies
    .filter(isParentsPolicy)
    .reduce(
      (s: number, p: any) => s + annualPremium(Number(p.premium || 0), p.premiumFrequency || "annual"),
      0
    );
  const sec80DEstimate =
    Math.min(selfHealthPremium, SEC80D_SELF_LIMIT) + Math.min(parentsHealthPremium, SEC80D_PARENTS_LIMIT);

  const allClaims = useMemo(() => {
    return policies.flatMap((p: any) => (p.claims || []).map((c: any) => ({ ...c, policy: p })));
  }, [policies]);
  const totalClaimedAmount = allClaims.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
  const pendingClaims = allClaims.filter((c: any) => !c.settled).length;

  const filteredPolicies = useMemo(() => {
    return policies.filter((p: any) => {
      if (filterType !== "all" && p.policyType !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchIns = (p.insurer || "").toLowerCase().includes(q);
        const matchName = (p.policyName || "").toLowerCase().includes(q);
        const matchNum = (p.policyNumber || "").toLowerCase().includes(q);
        if (!matchIns && !matchName && !matchNum) return false;
      }
      return true;
    });
  }, [policies, filterType, searchQuery]);

  const { run: save, loading: savingPolicy } = useAsyncAction(
    async (data: any) => {
      if (data.id && policies.find((p: any) => p.id === data.id)) {
        await updateItem("healthInsurance", data.id, data);
      } else {
        await addItem("healthInsurance", data);
      }
    },
    { onSuccess: () => setModal(null), onError: (e: any) => showToast?.(`Failed to save policy: ${e?.message || "Unknown error"}`, "error") }
  );

  const { run: saveClaim, loading: savingClaim } = useAsyncAction(
    async (claims: any[]) => {
      if (!claimModal) return;
      await updateItem("healthInsurance", claimModal.id, { ...claimModal, claims });
    },
    { onSuccess: () => setClaimModal(null), onError: (e: any) => showToast?.(`Failed to save claim: ${e?.message || "Unknown error"}`, "error") }
  );

  const { run: deletePolicy } = useAsyncAction(
    async (id: string) => { await removeItem("healthInsurance", id); },
    { onError: (e: any) => showToast?.(`Failed to delete policy: ${e?.message || "Unknown error"}`, "error") }
  );

  return (
    <div className="tab-content-enter">
      <SectionTitle
        sub="Track all health insurance policies — family floater, corporate, top-up, and claim histories"
        rightElement={
          policies.length > 0 && (
            <Button variant="accent" icon={<Plus size={14} />} onClick={() => setModal({})}>
              Add Policy
            </Button>
          )
        }
      >
        Health Insurance Portfolio
      </SectionTitle>

      {/* Hero Stats Cockpit */}
      {policies.length > 0 && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <StatCard
              label="Total Sum Insured"
              value={fmtINRFull(totalCover)}
              numericValue={totalCover}
              formatValue={fmtINRFull}
              icon={<Shield />}
              color={THEME.accent}
            />
            <StatCard
              label="Annual Premium"
              value={fmtINRFull(totalAnnualPremium)}
              numericValue={totalAnnualPremium}
              formatValue={fmtINRFull}
              sub={sec80DEstimate > 0 ? `≈ ${fmtINRFull(sec80DEstimate)} eligible for 80D` : "Annual outgo"}
              icon={<HeartPulse />}
              color={THEME.sage}
            />
            <StatCard
              label="Active Policies"
              value={String(policies.length)}
              numericValue={policies.length}
              formatValue={(n) => String(Math.round(n))}
              sub={`${policies.reduce((s, p) => s + (p.insuredMembers?.length || 1), 0)} lives covered`}
              icon={<ClipboardList />}
              color={THEME.violet}
            />
            <StatCard
              label="Renewing Soon"
              value={String(renewingSoon.length)}
              numericValue={renewingSoon.length}
              formatValue={(n) => String(Math.round(n))}
              sub={renewingSoon.length > 0 ? "Due within 30 days" : "All policies active"}
              icon={<Calendar />}
              color={renewingSoon.length > 0 ? THEME.gold : THEME.muted}
            />
          </div>

          {/* Renewal Warning Banner */}
          {renewingSoon.length > 0 && (
            <Card
              style={{
                marginBottom: 20,
                padding: "14px 18px",
                background: `linear-gradient(135deg, color-mix(in srgb, ${THEME.gold} 10%, var(--surface-0)), var(--surface-0))`,
                border: `1px solid color-mix(in srgb, ${THEME.gold} 30%, transparent)`,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <AlertCircle size={18} color={THEME.gold} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                  Renewal Due Soon for {renewingSoon.length} Policy{renewingSoon.length !== 1 ? "s" : ""}
                </div>
                <div style={{ fontSize: 12, color: THEME.muted }}>
                  {renewingSoon.map((p) => `${p.insurer} (${p.policyName || "Policy"}) renews in ${daysUntilRenewal(p.renewalDate)} days`).join(" · ")}
                </div>
              </div>
            </Card>
          )}

          {/* Controls Bar: Multi-Mode Views & Filters */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              marginBottom: 20,
              padding: "12px 16px",
              background: "var(--surface-0)",
              border: `1px solid ${THEME.line}`,
              borderRadius: "var(--radius-lg)",
            }}
          >
            {/* View Mode Buttons */}
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button
                onClick={() => setViewMode("cards")}
                className={`demat-portfolio-pill ${viewMode === "cards" ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px" }}
              >
                <LayoutGrid size={13} /> Policy Cards
              </button>
              <button
                onClick={() => setViewMode("claims")}
                className={`demat-portfolio-pill ${viewMode === "claims" ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px" }}
              >
                <Hospital size={13} /> Claims Radar ({allClaims.length})
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`demat-portfolio-pill ${viewMode === "table" ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px" }}
              >
                <TableIcon size={13} /> Policy Table
              </button>
            </div>

            {/* Search and Filters */}
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ position: "relative", minWidth: 160 }}>
                <Search
                  size={13}
                  style={{
                    position: "absolute",
                    left: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: THEME.muted,
                  }}
                />
                <input
                  type="text"
                  placeholder="Search policies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 10px 6px 30px",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-1)",
                    color: THEME.ink,
                    fontSize: 12,
                    outline: "none",
                  }}
                />
              </div>

              {/* Policy Type Filter */}
              <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                {(
                  [
                    { id: "all", label: "All Types" },
                    { id: "family_floater", label: "Floater" },
                    { id: "individual", label: "Individual" },
                    { id: "corporate", label: "Corporate" },
                    { id: "top_up", label: "Top-Up" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFilterType(t.id)}
                    className={`demat-portfolio-pill ${filterType === t.id ? "active" : ""}`}
                    style={{ fontSize: 11, padding: "4px 10px" }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main Content View */}
      {policies.length === 0 ? (
        <EmptyState
          icon={Heart}
          gradient={`linear-gradient(135deg, ${THEME.accent} 0%, color-mix(in srgb, ${THEME.accent} 55%, white) 100%)`}
          dotColor={THEME.accent}
          title="No Health Insurance Policies Yet"
          description="Add your health insurance policies to track coverage, premiums, renewals, and claims."
          pills={["Family Floater", "Corporate Cover", "Renewal Alerts", "Premium Tracking"]}
          buttonLabel="Add Policy"
          onAdd={() => setModal({})}
        />
      ) : filteredPolicies.length === 0 ? (
        <Card style={{ padding: 48, textAlign: "center" }}>
          <div style={{ color: THEME.muted, fontSize: 13 }}>No policies match your search or filter.</div>
        </Card>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <Card style={{ overflow: "hidden", marginBottom: 20 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface-1)", borderBottom: `1.5px solid ${THEME.line}` }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Insurer & Policy</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Type</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Sum Insured</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Annual Premium</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Renewal Date</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Features</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPolicies.map((p: any) => {
                  const days = daysUntilRenewal(p.renewalDate);
                  const annual = annualPremium(Number(p.premium || 0), p.premiumFrequency || "annual");
                  const typeColor = TYPE_COLORS[p.policyType] || THEME.accent;
                  return (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                      <td style={{ padding: "14px 16px", fontWeight: 700, color: THEME.ink }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <InsurerLogo name={p.insurer} size={32} />
                          <div>
                            <div>{p.insurer}</div>
                            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 500 }}>
                              {p.policyName ? `${p.policyName} ` : ""}#{p.policyNumber || "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: typeColor,
                            background: `color-mix(in srgb, ${typeColor} 12%, transparent)`,
                            padding: "2px 8px",
                            borderRadius: 4,
                            textTransform: "uppercase",
                          }}
                        >
                          {POLICY_TYPES.find((t) => t.value === p.policyType)?.label || p.policyType}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 900, color: THEME.accent }}>
                        <Money value={Number(p.sumInsured || 0)} variant="full" />
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 800 }}>
                        <Money value={annual} variant="full" />
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 12 }}>
                        {p.renewalDate ? (
                          <span style={{ fontWeight: 700, color: days !== null && days <= 30 ? THEME.gold : THEME.ink }}>
                            {p.renewalDate} {days !== null ? `(${days}d)` : ""}
                          </span>
                        ) : (
                          <span style={{ color: THEME.muted }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 4 }}>
                          {p.cashless && <Badge variant="sage" style={{ fontSize: 9 }}>Cashless</Badge>}
                          {p.preExistingCovered && <Badge variant="muted" style={{ fontSize: 9 }}>PED</Badge>}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <button onClick={() => setClaimModal(p)} className="icon-btn" style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4 }} title="Claims">
                            <FileText size={13} />
                          </button>
                          <button onClick={() => setModal(p)} className="icon-btn" style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4 }} title="Edit">
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() =>
                              setConfirmAction({
                                message: `Delete "${p.insurer}" policy? This cannot be undone.`,
                                onConfirm: () => deletePolicy(p.id),
                              })
                            }
                            className="icon-btn danger"
                            style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 4 }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : viewMode === "claims" ? (
        /* CLAIMS RADAR VIEW */
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
          {allClaims.length === 0 ? (
            <Card style={{ padding: 48, textAlign: "center" }}>
              <div style={{ color: THEME.muted, fontSize: 13 }}>No hospitalisation claims filed across your policies.</div>
            </Card>
          ) : (
            allClaims.map((c: any) => (
              <Card key={c.id} style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--surface-1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Hospital size={20} color={THEME.accent} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>
                      {c.hospitalName} {c.patientName ? `— ${c.patientName}` : ""}
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                      {c.policy?.insurer} · Claim Date: {c.claimDate} · Type: <strong style={{ textTransform: "capitalize" }}>{c.claimType}</strong>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink }}>
                      <Money value={Number(c.amount)} variant="full" />
                    </div>
                    <Badge variant={c.settled ? "sage" : "gold"}>{c.settled ? "Settled" : "In Review"}</Badge>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* SHOWCASE POLICY CARDS (DEFAULT) */
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredPolicies.map((p: any) => {
            const days = daysUntilRenewal(p.renewalDate);
            const isExpanded = expanded === p.id;
            const annual = annualPremium(Number(p.premium || 0), p.premiumFrequency || "annual");
            const typeColor = TYPE_COLORS[p.policyType] || THEME.accent;
            const adequacyNote = coverageAdequacyNote(p);
            const waiting = waitingPeriodInfo(p);
            const roomRentCapped = hasRoomRentCap(p);
            const claims = p.claims || [];

            return (
              <Card key={p.id} className="card-lift" style={{ borderLeft: `4px solid ${typeColor}`, padding: "18px 22px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: `color-mix(in srgb, ${typeColor} 12%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${typeColor} 25%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <InsurerLogo name={p.insurer} size={42} />
                  </div>

                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: THEME.ink }}>
                      {p.insurer}
                      {p.policyName ? ` — ${p.policyName}` : ""}
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: typeColor,
                          background: `color-mix(in srgb, ${typeColor} 12%, transparent)`,
                          padding: "1px 6px",
                          borderRadius: 3,
                          textTransform: "uppercase",
                        }}
                      >
                        {POLICY_TYPES.find((t) => t.value === p.policyType)?.label || p.policyType}
                      </span>
                      {p.policyNumber && <span>#{p.policyNumber}</span>}
                      {p.insuredMembers?.length > 0 && <span>· {p.insuredMembers.length} member{p.insuredMembers.length !== 1 ? "s" : ""}</span>}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 18, color: THEME.accent }}>
                      <Money value={Number(p.sumInsured || 0)} variant="full" />
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Sum Insured</div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 15, color: THEME.ink }}>
                      <Money value={annual} variant="full" />
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted }}>annual premium</div>
                  </div>

                  {days !== null && (
                    <Badge variant={days <= 7 ? "rust" : days <= 30 ? "gold" : "sage"}>
                      {days <= 0 ? "Expired" : `Renews in ${days}d`}
                    </Badge>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                    <Button size="sm" variant="ghost" onClick={() => setClaimModal(p)} style={{ padding: "6px 10px", fontSize: 12 }}>
                      Claims ({claims.length})
                    </Button>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : p.id)}
                      aria-label={isExpanded ? "Collapse" : "Expand"}
                      className="icon-btn"
                      style={{
                        background: "var(--surface-1)",
                        border: `1px solid ${THEME.line}`,
                        cursor: "pointer",
                        color: THEME.muted,
                        padding: 6,
                        borderRadius: 6,
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                      onClick={() => setModal(p)}
                      aria-label="Edit policy"
                      className="icon-btn"
                      style={{
                        background: "var(--surface-1)",
                        border: `1px solid ${THEME.line}`,
                        cursor: "pointer",
                        color: THEME.muted,
                        padding: 6,
                        borderRadius: 6,
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() =>
                        setConfirmAction({
                          message: `Delete "${p.insurer}" policy? This cannot be undone.`,
                          onConfirm: () => deletePolicy(p.id),
                        })
                      }
                      aria-label="Delete policy"
                      className="icon-btn danger"
                      style={{
                        background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${THEME.rust} 20%, transparent)`,
                        cursor: "pointer",
                        color: THEME.rust,
                        padding: 6,
                        borderRadius: 6,
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Expanded Details & Member Chips */}
                {isExpanded && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${THEME.line}` }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                        <CheckCircle2 size={15} color={p.cashless ? THEME.sage : THEME.muted} />
                        <span style={{ fontWeight: 600, color: p.cashless ? THEME.ink : THEME.muted }}>
                          {p.cashless ? "Cashless Hospitalisation Active" : "Reimbursement Only"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                        <CheckCircle2 size={15} color={p.preExistingCovered ? THEME.sage : THEME.muted} />
                        <span style={{ fontWeight: 600, color: p.preExistingCovered ? THEME.ink : THEME.muted }}>
                          {p.preExistingCovered ? "Pre-Existing Conditions Covered" : "PED Not Covered"}
                        </span>
                      </div>
                      {p.hospitalNetwork && (
                        <div style={{ fontSize: 12, color: THEME.muted }}>
                          Hospital Network: <strong style={{ color: THEME.ink }}>{p.hospitalNetwork}</strong>
                        </div>
                      )}
                      {p.roomRentLimit && (
                        <div style={{ fontSize: 12, color: roomRentCapped ? THEME.rust : THEME.sage }}>
                          Room Rent Sublimit: <strong>{p.roomRentLimit}</strong>
                        </div>
                      )}
                      {p.noClaimBonus && (
                        <div style={{ fontSize: 12, color: THEME.sage }}>
                          No Claim Bonus: <strong><Money value={Number(p.noClaimBonus)} variant="full" /></strong>
                        </div>
                      )}
                    </div>

                    {/* Insured Family Members */}
                    {p.insuredMembers?.length > 0 && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, marginBottom: 6, textTransform: "uppercase" }}>
                          Insured Members
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {p.insuredMembers.map((m: any, idx: number) => (
                            <Badge key={idx} variant="muted" style={{ padding: "4px 8px", fontSize: 11 }}>
                              <Users size={11} style={{ marginRight: 4 }} /> {m.name} ({m.relation})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {modal !== null && (
        <PolicyForm
          initial={modal?.id ? modal : undefined}
          onSave={save}
          onClose={() => setModal(null)}
          saving={savingPolicy}
        />
      )}
      {claimModal !== null && (
        <ClaimModal
          policy={claimModal}
          onSave={saveClaim}
          onClose={() => setClaimModal(null)}
          saving={savingClaim}
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
