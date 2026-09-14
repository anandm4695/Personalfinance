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
  Copy,
  Check,
  Printer,
  Download,
  Filter,
  ArrowRight,
  ShieldAlert,
  UserCheck,
  RefreshCw,
  PhoneCall,
  SlidersHorizontal,
  ExternalLink,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { useMasterData, formatProfileOption, calculateAge, formatAge } from "../../utils/masterData";
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
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { InsurerLogo } from "../ui/BrandLogos";

// Types & Enums
export const POLICY_TYPES = [
  { value: "family_floater", label: "Family Floater", desc: "Shared sum insured for entire family" },
  { value: "individual", label: "Individual", desc: "Dedicated sum insured for single individual" },
  { value: "corporate", label: "Corporate / Group", desc: "Employer-provided group medical cover" },
  { value: "top_up", label: "Top-Up", desc: "Additional cover above threshold per claim" },
  { value: "super_top_up", label: "Super Top-Up", desc: "Additional cover above aggregate annual deductible" },
  { value: "critical_illness", label: "Critical Illness", desc: "Fixed lump-sum payout on diagnosis" },
];

export const FREQ_LABELS: Record<string, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  semi_annual: "Half-Yearly",
  annual: "Annual",
};

export const TYPE_COLORS: Record<string, string> = {
  family_floater: THEME.accent,
  individual: THEME.sage,
  corporate: THEME.gold,
  top_up: THEME.violet,
  super_top_up: THEME.pink,
  critical_illness: THEME.rust,
};

export const POPULAR_INSURERS = [
  "Star Health",
  "HDFC ERGO",
  "Care Health",
  "Niva Bupa",
  "ICICI Lombard",
  "Aditya Birla Health",
  "ManipalCigna",
  "Tata AIG",
  "SBI General",
  "Bajaj Allianz",
  "New India Assurance",
  "United India",
];

export const COMMON_TPAS = [
  "Medi Assist",
  "Vidal Health",
  "FHPL",
  "Paramount Health",
  "Raksha TPA",
  "MDIndia",
  "Heritage Health",
  "In-House Claim Desk",
];

export function daysUntilRenewal(renewalDate: string): number | null {
  if (!renewalDate) return null;
  const diff = new Date(renewalDate).getTime() - new Date(today()).getTime();
  return Math.ceil(diff / 86400000);
}

export function annualPremium(amount: number, freq: string): number {
  const mult: Record<string, number> = { monthly: 12, quarterly: 4, semi_annual: 2, annual: 1 };
  return amount * (mult[freq] || 1);
}

const PARENT_RELATION_RE = /parent|father|mother|dad|mom|papa|mummy|-in-law/i;
export function isParentsPolicy(p: any): boolean {
  return (p.insuredMembers || []).some((m: any) => PARENT_RELATION_RE.test(m?.relation || ""));
}

export function waitingPeriodInfo(
  p: any
): { totalMonths: number; elapsedMonths: number; remainingMonths: number; progressPct: number; done: boolean } | null {
  const years = Number(p.waitingPeriodYears);
  if (!(years > 0) || !p.startDate) return null;
  const start = new Date(p.startDate + "T00:00:00");
  if (isNaN(start.getTime())) return null;
  const now = new Date(today() + "T00:00:00");
  const totalMonths = Math.round(years * 12);
  const elapsedMonthsRaw =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  const elapsedMonths = Math.min(totalMonths, Math.max(0, elapsedMonthsRaw));
  const progressPct = Math.min(100, Math.round((elapsedMonths / totalMonths) * 100));
  return {
    totalMonths,
    elapsedMonths,
    remainingMonths: totalMonths - elapsedMonths,
    progressPct,
    done: elapsedMonths >= totalMonths,
  };
}

export function hasRoomRentCap(p: any): boolean {
  const v = (p.roomRentLimit || "").trim();
  if (!v) return false;
  return !/^(no\s*(sub-?)?limit|none|nil|n\/?a|unlimited|single\s*private)/i.test(v);
}

const ADEQUACY_PER_MEMBER_MIN = 1000000; // ₹10 Lakhs benchmark per life
const SENIOR_ADEQUACY_MIN = 1500000; // ₹15 Lakhs benchmark for seniors

const EMPTY_POLICY: any = {
  insurer: "",
  policyName: "",
  policyNumber: "",
  policyType: "family_floater",
  owner: "self",
  insuredMembers: [],
  sumInsured: "",
  deductible: "",
  premium: "",
  premiumFrequency: "annual",
  startDate: "",
  renewalDate: "",
  tpaName: "",
  tpaContact: "",
  hospitalNetwork: "",
  cashless: true,
  preExistingCovered: false,
  waitingPeriodYears: "",
  noClaimBonus: "",
  copayPercent: "0",
  roomRentLimit: "No Sub-limit",
  restorationBenefit: true,
  maternityCover: false,
  daycareCover: true,
  notes: "",
  claims: [],
};

// ==========================================
// 1. ADD / EDIT POLICY MODAL
// ==========================================
function PolicyForm({ initial, onSave, onClose, saving = false }: any) {
  const { familyProfiles } = useMasterData();
  const [activeTab, setActiveTab] = useState<"general" | "financials" | "terms" | "members" | "notes">("general");
  const [form, setForm] = useState({ ...EMPTY_POLICY, ...initial });
  const [members, setMembers] = useState<{ name: string; relation: string; dob?: string }[]>(
    initial?.insuredMembers || []
  );
  const [memberName, setMemberName] = useState("");
  const [memberRelation, setMemberRelation] = useState("self");
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
    setMemberRelation("self");
  };

  const removeMember = (i: number) => setMembers((m) => m.filter((_, idx) => idx !== i));

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.insurer.trim()) next.insurer = "Insurer name is required.";
    if (!(Number(form.sumInsured) > 0)) next.sumInsured = "Enter a sum insured greater than ₹0.";
    if (!(Number(form.premium) > 0)) next.premium = "Enter a premium amount greater than ₹0.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = () => {
    if (!validate()) {
      setActiveTab("general");
      return;
    }
    onSave({
      ...form,
      sumInsured: Number(form.sumInsured),
      deductible: form.deductible ? Number(form.deductible) : 0,
      premium: Number(form.premium),
      noClaimBonus: form.noClaimBonus ? Number(form.noClaimBonus) : 0,
      copayPercent: Number(form.copayPercent || 0),
      insuredMembers: members,
      id: initial?.id || uid(),
    });
  };

  const g2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };

  return (
    <Modal
      title={initial?.id ? `Edit ${initial.insurer} Policy` : "Add Health Insurance Policy"}
      onClose={onClose}
      maxWidth={680}
    >
      {/* Modal Tab Switcher */}
      <div
        style={{
          display: "flex",
          borderBottom: `1px solid ${THEME.line}`,
          marginBottom: 18,
          gap: 6,
          overflowX: "auto",
        }}
      >
        {[
          { id: "general", label: "1. Policy Info" },
          { id: "financials", label: "2. Cover & Premium" },
          { id: "terms", label: "3. TPA & Rules" },
          { id: "members", label: `4. Lives Covered (${members.length})` },
          { id: "notes", label: "5. Features & Notes" },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTab(t.id as any)}
            style={{
              padding: "8px 14px",
              border: "none",
              borderBottom: activeTab === t.id ? `2px solid ${THEME.accent}` : "2px solid transparent",
              background: "none",
              fontWeight: activeTab === t.id ? 700 : 500,
              color: activeTab === t.id ? THEME.accent : THEME.muted,
              fontSize: 13,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <>
          <ModalSection title="Basic Details" first />
          <Field label="Insurer / Insurance Company *" error={errors.insurer}>
            <input
              className="form-input"
              value={form.insurer}
              onChange={(e) => set("insurer", e.target.value)}
              placeholder="e.g. Star Health, HDFC ERGO, Care Health"
              list="popular-insurers"
            />
            <datalist id="popular-insurers">
              {POPULAR_INSURERS.map((ins) => (
                <option key={ins} value={ins} />
              ))}
            </datalist>
          </Field>

          <div className="form-grid-2" style={g2}>
            <Field label="Plan / Product Name">
              <input
                className="form-input"
                value={form.policyName}
                onChange={(e) => set("policyName", e.target.value)}
                placeholder="e.g. Optima Secure, Supreme, Comprehensive"
              />
            </Field>
            <Field label="Policy / Certificate Number">
              <input
                className="form-input"
                value={form.policyNumber}
                onChange={(e) => set("policyNumber", e.target.value)}
                placeholder="e.g. POL-9847291038"
              />
            </Field>
          </div>

          <div className="form-grid-2" style={g2}>
            <Field label="Policy Type">
              <select
                className="form-input"
                value={form.policyType}
                onChange={(e) => set("policyType", e.target.value)}
              >
                {POLICY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label} ({t.desc})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Policy Owner">
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
        </>
      )}

      {activeTab === "financials" && (
        <>
          <ModalSection title="Sum Insured & Premium Schedule" first />
          <div className="form-grid-2" style={g2}>
            <Field label="Base Sum Insured (₹) *" error={errors.sumInsured}>
              <input
                className="form-input"
                type="number"
                value={form.sumInsured}
                onChange={(e) => set("sumInsured", e.target.value)}
                placeholder="e.g. 1000000 (₹10 Lakhs)"
              />
            </Field>
            <Field label="Cumulative / No Claim Bonus (₹)">
              <input
                className="form-input"
                type="number"
                value={form.noClaimBonus}
                onChange={(e) => set("noClaimBonus", e.target.value)}
                placeholder="e.g. 200000"
              />
            </Field>
          </div>

          {(form.policyType === "top_up" || form.policyType === "super_top_up") && (
            <Field label="Deductible / Threshold Amount (₹)">
              <input
                className="form-input"
                type="number"
                value={form.deductible}
                onChange={(e) => set("deductible", e.target.value)}
                placeholder="e.g. 500000 (Cover kicks in after ₹5L)"
              />
            </Field>
          )}

          <div className="form-grid-2" style={g2}>
            <Field label="Premium Amount (₹) *" error={errors.premium}>
              <input
                className="form-input"
                type="number"
                value={form.premium}
                onChange={(e) => set("premium", e.target.value)}
                placeholder="e.g. 24000"
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
          </div>

          <div className="form-grid-2" style={g2}>
            <Field label="Policy Commencement Date">
              <input
                className="form-input"
                type="date"
                value={form.startDate}
                onChange={(e) => set("startDate", e.target.value)}
              />
            </Field>
            <Field label="Next Renewal Date">
              <input
                className="form-input"
                type="date"
                value={form.renewalDate}
                onChange={(e) => set("renewalDate", e.target.value)}
              />
            </Field>
          </div>
        </>
      )}

      {activeTab === "terms" && (
        <>
          <ModalSection title="TPA & Hospital Network" first />
          <div className="form-grid-2" style={g2}>
            <Field label="Third Party Administrator (TPA)">
              <input
                className="form-input"
                value={form.tpaName}
                onChange={(e) => set("tpaName", e.target.value)}
                placeholder="e.g. Medi Assist, Vidal Health"
                list="tpa-list"
              />
              <datalist id="tpa-list">
                {COMMON_TPAS.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </Field>
            <Field label="TPA Helpline / Emergency Contact">
              <input
                className="form-input"
                value={form.tpaContact}
                onChange={(e) => set("tpaContact", e.target.value)}
                placeholder="e.g. 1800-425-9449"
              />
            </Field>
          </div>

          <div className="form-grid-2" style={g2}>
            <Field label="Hospital Network Count">
              <input
                className="form-input"
                value={form.hospitalNetwork}
                onChange={(e) => set("hospitalNetwork", e.target.value)}
                placeholder="e.g. 12,000+ Cashless Hospitals"
              />
            </Field>
            <Field label="Room Rent Sub-limit Rule">
              <input
                className="form-input"
                value={form.roomRentLimit}
                onChange={(e) => set("roomRentLimit", e.target.value)}
                placeholder="e.g. No Sub-limit, Single Private, 1% SI"
              />
            </Field>
          </div>

          <div className="form-grid-2" style={g2}>
            <Field label="Co-payment (%)">
              <select
                className="form-input"
                value={form.copayPercent}
                onChange={(e) => set("copayPercent", e.target.value)}
              >
                <option value="0">0% (Zero Co-pay)</option>
                <option value="10">10% Co-pay</option>
                <option value="20">20% Senior Citizen Co-pay</option>
                <option value="30">30% Zone/Age Co-pay</option>
              </select>
            </Field>
            <Field label="Pre-Existing Condition Waiting (Years)">
              <input
                className="form-input"
                type="number"
                value={form.waitingPeriodYears}
                onChange={(e) => set("waitingPeriodYears", e.target.value)}
                placeholder="e.g. 2 or 3 years"
              />
            </Field>
          </div>
        </>
      )}

      {activeTab === "members" && (
        <>
          <ModalSection title="Insured Family Members" first />
          {familyProfiles?.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, marginBottom: 8 }}>
                Quick Add from Family Profiles:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {familyProfiles
                  .filter((p: any) => p.relationship !== "HUF")
                  .map((p: any) => {
                    const alreadyAdded = members.some(
                      (m) => m.name.toLowerCase() === p.name.toLowerCase()
                    );
                    const age = p.dob ? calculateAge(p.dob) : null;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        disabled={alreadyAdded}
                        onClick={() => {
                          setMembers((m) => [
                            ...m,
                            { name: p.name, relation: p.relationship?.toLowerCase() || "self", dob: p.dob },
                          ]);
                        }}
                        style={{
                          padding: "5px 12px",
                          borderRadius: "var(--radius-sm)",
                          fontSize: 12,
                          fontWeight: 600,
                          border: `1px solid ${alreadyAdded ? "var(--t-line)" : THEME.accent}`,
                          background: alreadyAdded ? "var(--surface-2)" : "var(--surface-0)",
                          color: alreadyAdded ? THEME.muted : THEME.accent,
                          cursor: alreadyAdded ? "not-allowed" : "pointer",
                          opacity: alreadyAdded ? 0.6 : 1,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span>+ {p.name}</span>
                        <span style={{ fontSize: 10, opacity: 0.85 }}>
                          ({p.relationship}{age !== null ? `, ${age}y` : ""})
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input
              className="form-input"
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="Custom Member Name"
              style={{ flex: 2 }}
            />
            <select
              className="form-input"
              value={memberRelation}
              onChange={(e) => setMemberRelation(e.target.value)}
              style={{ flex: 1.5 }}
            >
              <option value="self">Self</option>
              <option value="spouse">Spouse</option>
              <option value="child">Child / Dependent</option>
              <option value="father">Father</option>
              <option value="mother">Mother</option>
              <option value="father-in-law">Father-in-law</option>
              <option value="mother-in-law">Mother-in-law</option>
            </select>
            <Button size="sm" variant="ghost" onClick={addMember}>
              Add
            </Button>
          </div>

          {members.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {members.map((m, i) => {
                const matchedProfile = familyProfiles?.find(
                  (p: any) => p.name.toLowerCase() === m.name.toLowerCase()
                );
                const dob = m.dob || matchedProfile?.dob;
                const age = dob ? calculateAge(dob) : null;
                return (
                  <Badge
                    key={i}
                    variant="muted"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      fontSize: 12,
                    }}
                  >
                    <UserCheck size={13} color={THEME.accent} />
                    <span style={{ fontWeight: 700 }}>{m.name}</span>
                    <span style={{ opacity: 0.8 }}>({m.relation})</span>
                    {age !== null && <span style={{ fontWeight: 800, color: THEME.ink }}>· {age} yrs</span>}
                    <button
                      onClick={() => removeMember(i)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.rust,
                        padding: 0,
                        marginLeft: 4,
                      }}
                      title="Remove member"
                    >
                      <X size={13} />
                    </button>
                  </Badge>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                padding: "12px",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface-1)",
                color: THEME.muted,
                fontSize: 12,
                marginBottom: 16,
              }}
            >
              No members added yet. For Family Floater policies, adding members enables the Family Protection Matrix and age-based 80D calculations.
            </div>
          )}
        </>
      )}

      {activeTab === "notes" && (
        <>
          <ModalSection title="Key Benefits & Riders" first />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
              marginBottom: 16,
            }}
          >
            {[
              { key: "cashless", label: "Cashless Hospitalisation" },
              { key: "preExistingCovered", label: "Pre-Existing Diseases Covered" },
              { key: "restorationBenefit", label: "100% Restoration Benefit" },
              { key: "daycareCover", label: "Daycare Procedures Included" },
              { key: "maternityCover", label: "Maternity / Newborn Cover" },
            ].map((feature) => (
              <label
                key={feature.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: form[feature.key] ? `color-mix(in srgb, ${THEME.accent} 8%, var(--surface-1))` : "var(--surface-1)",
                  border: `1px solid ${form[feature.key] ? THEME.accent : THEME.line}`,
                }}
              >
                <input
                  type="checkbox"
                  checked={!!form[feature.key]}
                  onChange={(e) => set(feature.key, e.target.checked)}
                  style={{ accentColor: THEME.accent }}
                />
                {feature.label}
              </label>
            ))}
          </div>

          <Field label="Special Clauses, Exclusions & Notes">
            <textarea
              className="form-input"
              rows={3}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="e.g. Critical illness rider of ₹10L included; 2-year waiting period on joint replacement."
            />
          </Field>
        </>
      )}

      <ModalActions
        onSave={save}
        onClose={onClose}
        saveLabel={initial?.id ? "Save Changes" : "Add Policy"}
        disabled={saving}
        loading={saving}
      />
    </Modal>
  );
}

// ==========================================
// 2. ENHANCED CLAIM LOGGING MODAL
// ==========================================
function ClaimModal({ policy, onClose, onSave, saving = false }: any) {
  const [claims, setClaims] = useState<any[]>(policy?.claims || []);
  const [showAddForm, setShowAddForm] = useState(claims.length === 0);
  const [form, setForm] = useState({
    claimDate: today(),
    dischargeDate: "",
    hospitalName: "",
    hospitalCity: "",
    patientName: policy?.insuredMembers?.[0]?.name || "",
    reason: "",
    amount: "",
    settledAmount: "",
    claimNumber: "",
    status: "settled", // 'in_process' | 'settled' | 'rejected'
    claimType: "cashless",
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const addClaim = () => {
    if (!form.amount || !form.hospitalName) return;
    const newClaim = {
      ...form,
      id: uid(),
      amount: Number(form.amount),
      settledAmount: form.settledAmount ? Number(form.settledAmount) : form.status === "settled" ? Number(form.amount) : 0,
      settled: form.status === "settled",
    };
    const updated = [newClaim, ...claims];
    setClaims(updated);
    onSave(updated);
    setShowAddForm(false);
    setForm({
      claimDate: today(),
      dischargeDate: "",
      hospitalName: "",
      hospitalCity: "",
      patientName: policy?.insuredMembers?.[0]?.name || "",
      reason: "",
      amount: "",
      settledAmount: "",
      claimNumber: "",
      status: "settled",
      claimType: "cashless",
    });
  };

  const removeClaim = (id: string) => {
    const updated = claims.filter((c) => c.id !== id);
    setClaims(updated);
    onSave(updated);
  };

  const toggleSettled = (id: string) => {
    const updated = claims.map((c) =>
      c.id === id ? { ...c, settled: !c.settled, status: !c.settled ? "settled" : "in_process" } : c
    );
    setClaims(updated);
    onSave(updated);
  };

  return (
    <Modal
      title={`Claims Tracker · ${policy.insurer} (${policy.policyName || "Policy"})`}
      onClose={onClose}
      maxWidth={640}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          padding: "10px 14px",
          borderRadius: "var(--radius-sm)",
          background: "var(--surface-1)",
          border: `1px solid ${THEME.line}`,
        }}
      >
        <div>
          <span style={{ fontSize: 12, color: THEME.muted }}>Total Policy Claims: </span>
          <strong style={{ fontSize: 13, color: THEME.ink }}>{claims.length} Records</strong>
        </div>
        <Button
          size="sm"
          variant={showAddForm ? "ghost" : "accent"}
          icon={showAddForm ? <X size={13} /> : <Plus size={13} />}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? "Cancel Form" : "Log New Claim"}
        </Button>
      </div>

      {showAddForm && (
        <div
          style={{
            padding: 16,
            borderRadius: "var(--radius-md)",
            background: "var(--surface-0)",
            border: `1.5px solid ${THEME.accent}`,
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, color: THEME.accent, marginBottom: 12 }}>
            + Enter Hospitalisation / Mediclaim Details
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Hospital Name *">
              <input
                className="form-input"
                value={form.hospitalName}
                onChange={(e) => set("hospitalName", e.target.value)}
                placeholder="e.g. Apollo Hospital, Max Healthcare"
              />
            </Field>
            <Field label="Patient Name">
              <input
                className="form-input"
                value={form.patientName}
                onChange={(e) => set("patientName", e.target.value)}
                placeholder="Insured patient"
              />
            </Field>
            <Field label="Admission / Claim Date">
              <input
                type="date"
                className="form-input"
                value={form.claimDate}
                onChange={(e) => set("claimDate", e.target.value)}
              />
            </Field>
            <Field label="Discharge Date">
              <input
                type="date"
                className="form-input"
                value={form.dischargeDate}
                onChange={(e) => set("dischargeDate", e.target.value)}
              />
            </Field>
            <Field label="Claimed Amount (₹) *">
              <input
                type="number"
                className="form-input"
                value={form.amount}
                onChange={(e) => set("amount", e.target.value)}
                placeholder="Total billed amount"
              />
            </Field>
            <Field label="Settled Amount (₹)">
              <input
                type="number"
                className="form-input"
                value={form.settledAmount}
                onChange={(e) => set("settledAmount", e.target.value)}
                placeholder="Approved payout by insurer"
              />
            </Field>
            <Field label="Claim Mode">
              <select
                className="form-input"
                value={form.claimType}
                onChange={(e) => set("claimType", e.target.value)}
              >
                <option value="cashless">Cashless Settlement</option>
                <option value="reimbursement">Reimbursement</option>
              </select>
            </Field>
            <Field label="Claim Status">
              <select
                className="form-input"
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
              >
                <option value="settled">Fully Settled</option>
                <option value="in_process">In Process / Pre-Auth</option>
                <option value="rejected">Rejected / Disallowed</option>
              </select>
            </Field>
          </div>
          <div style={{ marginTop: 10 }}>
            <Field label="Diagnosis / Treatment Reason">
              <input
                className="form-input"
                value={form.reason}
                onChange={(e) => set("reason", e.target.value)}
                placeholder="e.g. Dengue Treatment, Gallbladder Laparoscopy"
              />
            </Field>
          </div>
          <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
            <Button size="sm" variant="accent" onClick={addClaim} disabled={saving} loading={saving}>
              Save Claim Record
            </Button>
          </div>
        </div>
      )}

      <ModalSection title="Claim History & Settlements" first={!showAddForm} />
      {claims.length === 0 ? (
        <div style={{ color: THEME.muted, fontSize: 13, padding: "16px 0", textAlign: "center" }}>
          No hospitalisation claims logged for this policy.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {claims.map((c) => {
            const isSettled = c.settled || c.status === "settled";
            return (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface-1)",
                  border: `1px solid ${THEME.line}`,
                  gap: 12,
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>
                    {c.hospitalName} {c.patientName ? `· ${c.patientName}` : ""}
                  </div>
                  <div style={{ fontSize: 12, color: THEME.muted, marginTop: 3 }}>
                    Date: <strong>{c.claimDate}</strong> · Billed: <Money value={Number(c.amount)} variant="full" />
                    {c.settledAmount ? (
                      <span> · Approved: <strong style={{ color: THEME.sage }}><Money value={Number(c.settledAmount)} variant="full" /></strong></span>
                    ) : null}
                    {c.reason ? ` · ${c.reason}` : ""}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Badge variant={isSettled ? "sage" : c.status === "rejected" ? "rust" : "gold"}>
                    {isSettled ? "Settled" : c.status === "rejected" ? "Rejected" : "In Review"}
                  </Badge>
                  <button
                    onClick={() => toggleSettled(c.id)}
                    style={{
                      fontSize: 11,
                      color: THEME.accent,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    {isSettled ? "Mark Pending" : "Mark Settled"}
                  </button>
                  <button
                    onClick={() => removeClaim(c.id)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: THEME.rust,
                      padding: 4,
                    }}
                    title="Delete claim record"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

// ==========================================
// 3. EMERGENCY DIGITAL HEALTH CARD MODAL
// ==========================================
function EmergencyCardModal({ policy, member, onClose }: any) {
  const [copied, setCopied] = useState(false);

  const emergencyText = `🚨 EMERGENCY MEDICAL PASS 🚨
Policy: ${policy.insurer} (${policy.policyName || "Health Plan"})
Policy No: ${policy.policyNumber || "N/A"}
Patient / Member: ${member?.name || "Insured"} (${member?.relation || "self"})
Sum Insured: ${fmtINRFull(policy.sumInsured || 0)}
TPA Desk: ${policy.tpaName || "In-House Desk"} (${policy.tpaContact || "Toll-Free 1800-425-9449"})
Cashless: ${policy.cashless ? "YES (Enabled)" : "Reimbursement"}
Emergency Contact: ${policy.owner || "Family"}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(emergencyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal title="Emergency Digital Health Pass" onClose={onClose} maxWidth={520}>
      <div
        style={{
          background: "linear-gradient(135deg, #0d1b2a 0%, #1b263b 100%)",
          color: "#ffffff",
          borderRadius: "var(--radius-lg)",
          padding: "22px 24px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          marginBottom: 18,
          border: "1px solid rgba(255,255,255,0.15)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -20,
            right: -20,
            opacity: 0.08,
            pointerEvents: "none",
          }}
        >
          <Shield size={160} color="#ffffff" />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", color: "#64dfdf", fontWeight: 800 }}>
              Hospital Admission Pass
            </div>
            <div style={{ fontSize: 18, fontWeight: 900, marginTop: 2 }}>{policy.insurer}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>{policy.policyName || "Health Insurance Cover"}</div>
          </div>
          <div
            style={{
              padding: "4px 8px",
              background: policy.cashless ? "rgba(46, 196, 182, 0.25)" : "rgba(255, 159, 28, 0.25)",
              border: `1px solid ${policy.cashless ? "#2ec4b6" : "#ff9f1c"}`,
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 800,
              color: policy.cashless ? "#2ec4b6" : "#ff9f1c",
            }}
          >
            {policy.cashless ? "CASHLESS ACTIVE" : "REIMBURSEMENT"}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 14, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 10, textTransform: "uppercase", opacity: 0.7 }}>Insured Patient</div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>{member?.name || "Insured"}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Relation: {member?.relation || "self"}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, textTransform: "uppercase", opacity: 0.7 }}>Policy Number</div>
            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "monospace" }}>
              {policy.policyNumber || "NOT SPECIFIED"}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
          <div>
            <div style={{ fontSize: 10, textTransform: "uppercase", opacity: 0.7 }}>Sum Insured</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#64dfdf" }}>
              {fmtINRFull(policy.sumInsured || 0)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, textTransform: "uppercase", opacity: 0.7 }}>TPA / Claim Desk</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>
              {policy.tpaName || "Direct Insurer Desk"}
            </div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>
              {policy.tpaContact || "Toll-free 1800-425-9449"}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Button size="sm" variant="ghost" icon={copied ? <Check size={14} color={THEME.sage} /> : <Copy size={14} />} onClick={handleCopy}>
          {copied ? "Copied to Clipboard!" : "Copy Pass Text"}
        </Button>
        <Button size="sm" variant="accent" icon={<Printer size={14} />} onClick={handlePrint}>
          Print Health Pass
        </Button>
      </div>
    </Modal>
  );
}

// ==========================================
// MAIN HEALTH INSURANCE TAB COMPONENT
// ==========================================
export function HealthInsuranceTab({ state, addItem, removeItem, updateItem, showToast }: any) {
  const { familyProfiles } = useMasterData();
  const policies: any[] = state.healthInsurance || [];

  // Active Subview Mode: 'portfolio' | 'matrix' | 'claims' | 'tax80d' | 'comparison' | 'table'
  const [subView, setSubView] = useState<"portfolio" | "matrix" | "claims" | "tax80d" | "comparison" | "table">("portfolio");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [expandedPolicyId, setExpandedPolicyId] = useState<string | null>(null);

  // Modals
  const [policyModal, setPolicyModal] = useState<any>(null);
  const [claimModal, setClaimModal] = useState<any>(null);
  const [eCardModal, setECardModal] = useState<{ policy: any; member: any } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null);

  // Tax 80D custom state
  const [preventiveCheckupSpent, setPreventiveCheckupSpent] = useState<number>(5000);
  const [taxRegime, setTaxRegime] = useState<"old" | "new">("old");
  const [taxSlabRate, setTaxSlabRate] = useState<number>(30); // 30% default for high earners

  // Calculations & Analytics
  const totalBaseSumInsured = useMemo(() => {
    return policies
      .filter((p) => !["top_up", "super_top_up"].includes(p.policyType))
      .reduce((s: number, p: any) => s + Number(p.sumInsured || 0), 0);
  }, [policies]);

  const totalTopUpSumInsured = useMemo(() => {
    return policies
      .filter((p) => ["top_up", "super_top_up"].includes(p.policyType))
      .reduce((s: number, p: any) => s + Number(p.sumInsured || 0), 0);
  }, [policies]);

  const totalCombinedCover = totalBaseSumInsured + totalTopUpSumInsured;

  const totalAnnualPremium = useMemo(() => {
    return policies.reduce(
      (s: number, p: any) => s + annualPremium(Number(p.premium || 0), p.premiumFrequency || "annual"),
      0
    );
  }, [policies]);

  const monthlyOutgo = Math.round(totalAnnualPremium / 12);

  // Expiring / Renewing within 30 days
  const renewingSoon = useMemo(() => {
    return policies.filter((p: any) => {
      const d = daysUntilRenewal(p.renewalDate);
      return d !== null && d >= 0 && d <= 30;
    });
  }, [policies]);

  // Section 80D Math
  const selfFamilyPremium = useMemo(() => {
    return policies
      .filter((p: any) => !isParentsPolicy(p))
      .reduce(
        (s: number, p: any) => s + annualPremium(Number(p.premium || 0), p.premiumFrequency || "annual"),
        0
      );
  }, [policies]);

  const parentsPremium = useMemo(() => {
    return policies
      .filter(isParentsPolicy)
      .reduce(
        (s: number, p: any) => s + annualPremium(Number(p.premium || 0), p.premiumFrequency || "annual"),
        0
      );
  }, [policies]);

  // Check if any parents in Master Data are senior citizens (age 60+)
  const hasSeniorParents = useMemo(() => {
    return familyProfiles.some((p: any) => {
      if (!PARENT_RELATION_RE.test(p.relationship || "")) return false;
      const age = p.dob ? calculateAge(p.dob) : null;
      return age !== null && age >= 60;
    });
  }, [familyProfiles]);

  const sec80D_SelfLimit = 25000;
  const sec80D_ParentsLimit = hasSeniorParents ? 50000 : 25000;
  const sec80D_PreventiveLimit = 5000;

  const sec80D_SelfDeduction = Math.min(selfFamilyPremium, sec80D_SelfLimit);
  const sec80D_ParentsDeduction = Math.min(parentsPremium, sec80D_ParentsLimit);
  const sec80D_PreventiveDeduction = Math.min(preventiveCheckupSpent, sec80D_PreventiveLimit);

  const totalEligible80D = Math.min(
    sec80D_SelfLimit + sec80D_ParentsLimit,
    sec80D_SelfDeduction + sec80D_ParentsDeduction + sec80D_PreventiveDeduction
  );

  const estimatedTaxSaved = Math.round(totalEligible80D * (taxSlabRate / 100) * 1.04); // including 4% cess

  // Claims Analytics
  const allClaims = useMemo(() => {
    return policies.flatMap((p: any) => (p.claims || []).map((c: any) => ({ ...c, policy: p })));
  }, [policies]);

  const totalClaimedAmount = allClaims.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
  const totalSettledAmount = allClaims.reduce(
    (s: number, c: any) => s + Number(c.settledAmount || (c.settled ? c.amount : 0)),
    0
  );
  const pendingClaimsCount = allClaims.filter((c: any) => !c.settled && c.status !== "settled").length;
  const settledClaimsCount = allClaims.filter((c: any) => c.settled || c.status === "settled").length;

  // Family Coverage Adequacy Matrix Calculation
  const familyCoverageMatrix = useMemo(() => {
    // Gather distinct family members from Master Data + all policies
    const memberMap = new Map<string, { name: string; relation: string; dob?: string; policies: any[] }>();

    familyProfiles
      .filter((p: any) => p.relationship !== "HUF")
      .forEach((p: any) => {
        memberMap.set(p.name.toLowerCase(), {
          name: p.name,
          relation: p.relationship || "self",
          dob: p.dob,
          policies: [],
        });
      });

    policies.forEach((policy: any) => {
      (policy.insuredMembers || []).forEach((m: any) => {
        const key = (m.name || "").toLowerCase();
        if (key) {
          if (!memberMap.has(key)) {
            memberMap.set(key, {
              name: m.name,
              relation: m.relation || "self",
              dob: m.dob,
              policies: [],
            });
          }
          memberMap.get(key)!.policies.push(policy);
        }
      });
    });

    return Array.from(memberMap.values()).map((member) => {
      const age = member.dob ? calculateAge(member.dob) : null;
      const isSenior = age !== null && age >= 60;
      const targetBenchmark = isSenior ? SENIOR_ADEQUACY_MIN : ADEQUACY_PER_MEMBER_MIN;

      const baseCover = member.policies
        .filter((p) => !["top_up", "super_top_up", "critical_illness"].includes(p.policyType))
        .reduce((sum, p) => sum + Number(p.sumInsured || 0), 0);

      const topUpCover = member.policies
        .filter((p) => ["top_up", "super_top_up"].includes(p.policyType))
        .reduce((sum, p) => sum + Number(p.sumInsured || 0), 0);

      const criticalCover = member.policies
        .filter((p) => p.policyType === "critical_illness")
        .reduce((sum, p) => sum + Number(p.sumInsured || 0), 0);

      const totalMemberCover = baseCover + topUpCover;
      const isAdequate = totalMemberCover >= targetBenchmark;
      const hasCorporate = member.policies.some((p) => p.policyType === "corporate");
      const hasPersonalOnly = member.policies.length > 0 && !hasCorporate;

      return {
        ...member,
        age,
        isSenior,
        baseCover,
        topUpCover,
        criticalCover,
        totalMemberCover,
        targetBenchmark,
        isAdequate,
        hasCorporate,
        hasPersonalOnly,
      };
    });
  }, [familyProfiles, policies]);

  // Overall Family Protection Score
  const familyProtectionScore = useMemo(() => {
    if (familyCoverageMatrix.length === 0) return 0;
    const adequateCount = familyCoverageMatrix.filter((m) => m.isAdequate).length;
    return Math.round((adequateCount / familyCoverageMatrix.length) * 100);
  }, [familyCoverageMatrix]);

  // Filtered Policies for Portfolio & Table views
  const filteredPolicies = useMemo(() => {
    return policies.filter((p: any) => {
      if (filterType !== "all" && p.policyType !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchIns = (p.insurer || "").toLowerCase().includes(q);
        const matchName = (p.policyName || "").toLowerCase().includes(q);
        const matchNum = (p.policyNumber || "").toLowerCase().includes(q);
        const matchTpa = (p.tpaName || "").toLowerCase().includes(q);
        const matchMember = (p.insuredMembers || []).some((m: any) =>
          (m.name || "").toLowerCase().includes(q)
        );
        if (!matchIns && !matchName && !matchNum && !matchTpa && !matchMember) return false;
      }
      return true;
    });
  }, [policies, filterType, searchQuery]);

  // Async Mutations
  const { run: savePolicy, loading: savingPolicy } = useAsyncAction(
    async (data: any) => {
      if (data.id && policies.find((p: any) => p.id === data.id)) {
        await updateItem("healthInsurance", data.id, data);
        showToast?.("Health insurance policy updated successfully.", "success");
      } else {
        await addItem("healthInsurance", data);
        showToast?.("New health insurance policy added to portfolio.", "success");
      }
    },
    {
      onSuccess: () => setPolicyModal(null),
      onError: (e: any) => showToast?.(`Failed to save policy: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveClaimUpdate, loading: savingClaim } = useAsyncAction(
    async (claims: any[]) => {
      if (!claimModal) return;
      await updateItem("healthInsurance", claimModal.id, { ...claimModal, claims });
      showToast?.("Claims records updated.", "success");
    },
    {
      onSuccess: () => setClaimModal(null),
      onError: (e: any) => showToast?.(`Failed to update claims: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: deletePolicy } = useAsyncAction(
    async (id: string) => {
      await removeItem("healthInsurance", id);
      showToast?.("Policy removed from portfolio.", "info");
    },
    { onError: (e: any) => showToast?.(`Failed to delete policy: ${e?.message || "Unknown error"}`, "error") }
  );

  // CSV Export for Table view
  const exportCSV = () => {
    const headers = [
      "Insurer",
      "Policy Name",
      "Policy Number",
      "Type",
      "Sum Insured",
      "Deductible",
      "Annual Premium",
      "Frequency",
      "Renewal Date",
      "TPA",
      "Cashless",
      "Room Rent Limit",
      "Members Count",
    ];
    const rows = filteredPolicies.map((p) => [
      `"${p.insurer || ""}"`,
      `"${p.policyName || ""}"`,
      `"${p.policyNumber || ""}"`,
      `"${p.policyType || ""}"`,
      p.sumInsured || 0,
      p.deductible || 0,
      annualPremium(Number(p.premium || 0), p.premiumFrequency || "annual"),
      p.premiumFrequency || "annual",
      p.renewalDate || "",
      `"${p.tpaName || ""}"`,
      p.cashless ? "Yes" : "No",
      `"${p.roomRentLimit || ""}"`,
      p.insuredMembers?.length || 0,
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Health_Insurance_Portfolio_${today()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast?.("Health insurance portfolio exported to CSV.", "success");
  };

  return (
    <div className="tab-content-enter">
      {/* Header with Title & Action */}
      <SectionTitle
        sub="Executive Health & Mediclaim Command Center · Family Floater, Super Top-Up, 80D Tax Optimization & Claims Pipeline"
        rightElement={
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              variant="accent"
              icon={<Plus size={14} />}
              onClick={() => setPolicyModal({})}
            >
              Add Health Policy
            </Button>
          </div>
        }
      >
        Health Insurance Portfolio
      </SectionTitle>

      {/* Hero Analytics Cockpit */}
      {policies.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 14,
            marginBottom: 22,
          }}
        >
          <StatCard
            label="Total Combined Cover"
            value={fmtINRFull(totalCombinedCover)}
            numericValue={totalCombinedCover}
            formatValue={fmtINRFull}
            sub={`Base: ${fmtINRFull(totalBaseSumInsured)} · Top-up: ${fmtINRFull(totalTopUpSumInsured)}`}
            icon={<Shield />}
            color={THEME.accent}
          />
          <StatCard
            label="Annual Outgo"
            value={fmtINRFull(totalAnnualPremium)}
            numericValue={totalAnnualPremium}
            formatValue={fmtINRFull}
            sub={`≈ ${fmtINRFull(monthlyOutgo)}/mo run-rate`}
            icon={<HeartPulse />}
            color={THEME.sage}
          />
          <StatCard
            label="80D Tax Deduction"
            value={fmtINRFull(totalEligible80D)}
            numericValue={totalEligible80D}
            formatValue={fmtINRFull}
            sub={`Saves ≈ ${fmtINRFull(estimatedTaxSaved)} in 30% slab`}
            icon={<Percent />}
            color={THEME.violet}
          />
          <StatCard
            label="Family Protection Score"
            value={`${familyProtectionScore}%`}
            numericValue={familyProtectionScore}
            formatValue={(n) => `${Math.round(n)}%`}
            sub={`${familyCoverageMatrix.filter((m) => m.isAdequate).length} of ${familyCoverageMatrix.length} lives adequately covered`}
            icon={<ShieldCheck />}
            color={familyProtectionScore >= 80 ? THEME.sage : familyProtectionScore >= 50 ? THEME.gold : THEME.rust}
          />
        </div>
      )}

      {/* Renewal Warning Banner */}
      {renewingSoon.length > 0 && (
        <Card
          style={{
            marginBottom: 20,
            padding: "14px 18px",
            background: `linear-gradient(135deg, color-mix(in srgb, ${THEME.gold} 12%, var(--surface-0)), var(--surface-0))`,
            border: `1px solid color-mix(in srgb, ${THEME.gold} 35%, transparent)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AlertCircle size={20} color={THEME.gold} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                Renewal Due Soon for {renewingSoon.length} Policy{renewingSoon.length !== 1 ? "s" : ""}
              </div>
              <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                {renewingSoon
                  .map(
                    (p) =>
                      `${p.insurer} (${p.policyName || "Policy"}) renews in ${daysUntilRenewal(p.renewalDate)} days`
                  )
                  .join(" · ")}
              </div>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            style={{ fontSize: 12 }}
            onClick={() => {
              setSubView("portfolio");
              setFilterType("all");
            }}
          >
            View Policies
          </Button>
        </Card>
      )}

      {/* Executive Sub-View Navigation Bar */}
      {policies.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 20,
            padding: "10px 14px",
            background: "var(--surface-0)",
            border: `1px solid ${THEME.line}`,
            borderRadius: "var(--radius-lg)",
          }}
        >
          {/* SubView Tabs */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
            {[
              { id: "portfolio", label: "Policy Portfolio", icon: LayoutGrid },
              { id: "matrix", label: `Family Matrix (${familyCoverageMatrix.length})`, icon: Users },
              { id: "claims", label: `Claims Central (${allClaims.length})`, icon: Hospital },
              { id: "tax80d", label: "80D Tax Planner", icon: Percent },
              { id: "comparison", label: "Policy Comparison", icon: SlidersHorizontal },
              { id: "table", label: "Data Table", icon: TableIcon },
            ].map((tab) => {
              const IconComp = tab.icon;
              const active = subView === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSubView(tab.id as any)}
                  className={`demat-portfolio-pill ${active ? "active" : ""}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  <IconComp size={13} /> {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search & Filter Controls (Active for Portfolio & Table) */}
          {(subView === "portfolio" || subView === "table") && (
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
                  placeholder="Search insurer, TPA, member..."
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

              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {[
                  { id: "all", label: "All" },
                  { id: "family_floater", label: "Floater" },
                  { id: "individual", label: "Individual" },
                  { id: "corporate", label: "Corporate" },
                  { id: "super_top_up", label: "Super Top-Up" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setFilterType(t.id)}
                    className={`demat-portfolio-pill ${filterType === t.id ? "active" : ""}`}
                    style={{ fontSize: 11, padding: "4px 8px" }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {subView === "table" && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<FileSpreadsheet size={13} />}
                  onClick={exportCSV}
                  style={{ fontSize: 11, padding: "5px 10px" }}
                >
                  Export CSV
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Subview Content */}
      {policies.length === 0 ? (
        <EmptyState
          icon={Heart}
          gradient={`linear-gradient(135deg, ${THEME.accent} 0%, color-mix(in srgb, ${THEME.accent} 55%, white) 100%)`}
          dotColor={THEME.accent}
          title="No Health Insurance Policies Yet"
          description="Track all your health insurance policies, family floater sum insured, corporate covers, pre-existing waiting periods, claims, and Section 80D tax deductions."
          pills={["Family Floater", "Super Top-Up", "Section 80D Tax", "Digital Health Passes", "Claims Radar"]}
          buttonLabel="Add Your First Policy"
          onAdd={() => setPolicyModal({})}
        />
      ) : (
        <>
          {/* ========================================================= */}
          {/* SUBVIEW 1: POLICY PORTFOLIO CARDS */}
          {/* ========================================================= */}
          {subView === "portfolio" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {filteredPolicies.length === 0 ? (
                <Card style={{ padding: 48, textAlign: "center" }}>
                  <div style={{ color: THEME.muted, fontSize: 13 }}>No policies match your search or filter.</div>
                </Card>
              ) : (
                filteredPolicies.map((p: any) => {
                  const days = daysUntilRenewal(p.renewalDate);
                  const isExpanded = expandedPolicyId === p.id;
                  const annual = annualPremium(Number(p.premium || 0), p.premiumFrequency || "annual");
                  const typeColor = TYPE_COLORS[p.policyType] || THEME.accent;
                  const waiting = waitingPeriodInfo(p);
                  const roomRentCapped = hasRoomRentCap(p);
                  const claims = p.claims || [];

                  return (
                    <Card
                      key={p.id}
                      className="card-lift"
                      style={{
                        borderLeft: `4.5px solid ${typeColor}`,
                        padding: "20px 24px",
                        position: "relative",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 16,
                          flexWrap: "wrap",
                          justifyContent: "space-between",
                        }}
                      >
                        {/* Insurer Logo & Titles */}
                        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 240, flex: 1 }}>
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 14,
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

                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ fontWeight: 800, fontSize: 16, color: THEME.ink }}>
                                {p.insurer}
                              </div>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  color: typeColor,
                                  background: `color-mix(in srgb, ${typeColor} 12%, transparent)`,
                                  padding: "2px 7px",
                                  borderRadius: 4,
                                  textTransform: "uppercase",
                                }}
                              >
                                {POLICY_TYPES.find((t) => t.value === p.policyType)?.label || p.policyType}
                              </span>
                            </div>

                            <div
                              style={{
                                fontSize: 12,
                                color: THEME.muted,
                                marginTop: 3,
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                flexWrap: "wrap",
                              }}
                            >
                              {p.policyName && <strong style={{ color: THEME.ink }}>{p.policyName}</strong>}
                              {p.policyNumber && <span>· #{p.policyNumber}</span>}
                              {p.insuredMembers?.length > 0 && (
                                <span>· {p.insuredMembers.length} lives covered</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Sum Insured & Premium Metric Blocks */}
                        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
                          <div style={{ textAlign: "right" }}>
                            <div
                              style={{
                                fontFamily: "var(--font-display)",
                                fontWeight: 900,
                                fontSize: 18,
                                color: THEME.accent,
                              }}
                            >
                              <Money value={Number(p.sumInsured || 0)} variant="full" />
                            </div>
                            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                              Sum Insured {p.deductible ? `(Threshold: ${fmtINRFull(p.deductible)})` : ""}
                            </div>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            <div
                              style={{
                                fontFamily: "var(--font-display)",
                                fontWeight: 800,
                                fontSize: 16,
                                color: THEME.ink,
                              }}
                            >
                              <Money value={annual} variant="full" />
                            </div>
                            <div style={{ fontSize: 11, color: THEME.muted }}>
                              {p.premiumFrequency !== "annual" ? `${FREQ_LABELS[p.premiumFrequency]} premium` : "Annual premium"}
                            </div>
                          </div>

                          {/* Renewal Badge */}
                          {days !== null ? (
                            <Badge variant={days <= 7 ? "rust" : days <= 30 ? "gold" : "sage"}>
                              {days <= 0 ? "Expired" : `Renews in ${days}d`}
                            </Badge>
                          ) : (
                            <Badge variant="muted">Active</Badge>
                          )}

                          {/* Quick Actions */}
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={<Hospital size={13} />}
                              onClick={() => setClaimModal(p)}
                              style={{ padding: "6px 10px", fontSize: 12 }}
                            >
                              Claims ({claims.length})
                            </Button>
                            <button
                              onClick={() => setExpandedPolicyId(isExpanded ? null : p.id)}
                              aria-label={isExpanded ? "Collapse policy details" : "Expand policy details"}
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
                              onClick={() => setPolicyModal(p)}
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
                      </div>

                      {/* Visual PED Waiting Period Timeline (if configured) */}
                      {waiting && (
                        <div
                          style={{
                            marginTop: 14,
                            padding: "8px 12px",
                            borderRadius: "var(--radius-sm)",
                            background: "var(--surface-1)",
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.ink, display: "flex", alignItems: "center", gap: 5 }}>
                            <Clock size={12} color={waiting.done ? THEME.sage : THEME.gold} />
                            PED Waiting Period:
                          </div>
                          <div style={{ flex: 1, minWidth: 120, height: 6, borderRadius: 3, background: "var(--surface-2)", overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${waiting.progressPct}%`,
                                height: "100%",
                                background: waiting.done ? THEME.sage : THEME.gold,
                                borderRadius: 3,
                              }}
                            />
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 600, color: waiting.done ? THEME.sage : THEME.ink }}>
                            {waiting.done ? "100% Completed (All PED Covered)" : `${waiting.elapsedMonths}/${waiting.totalMonths} mos (${waiting.remainingMonths} mos remaining)`}
                          </div>
                        </div>
                      )}

                      {/* Expanded Full Specs Drawer */}
                      {isExpanded && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${THEME.line}` }}>
                          {/* Policy Specs Grid */}
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                              gap: 12,
                              marginBottom: 16,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                              <CheckCircle2 size={15} color={p.cashless ? THEME.sage : THEME.muted} />
                              <span style={{ fontWeight: 600, color: p.cashless ? THEME.ink : THEME.muted }}>
                                {p.cashless ? "Cashless Hospitalisation" : "Reimbursement Only"}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                              <CheckCircle2 size={15} color={p.preExistingCovered ? THEME.sage : THEME.muted} />
                              <span style={{ fontWeight: 600, color: p.preExistingCovered ? THEME.ink : THEME.muted }}>
                                {p.preExistingCovered ? "Pre-Existing Diseases Covered" : "PED Not Covered"}
                              </span>
                            </div>

                            {p.tpaName && (
                              <div style={{ fontSize: 12, color: THEME.muted }}>
                                TPA Desk: <strong style={{ color: THEME.ink }}>{p.tpaName}</strong> {p.tpaContact ? `(${p.tpaContact})` : ""}
                              </div>
                            )}

                            {p.hospitalNetwork && (
                              <div style={{ fontSize: 12, color: THEME.muted }}>
                                Network: <strong style={{ color: THEME.ink }}>{p.hospitalNetwork}</strong>
                              </div>
                            )}

                            {p.roomRentLimit && (
                              <div style={{ fontSize: 12, color: roomRentCapped ? THEME.rust : THEME.sage }}>
                                Room Rent Sublimit: <strong>{p.roomRentLimit}</strong>
                                {roomRentCapped && <span style={{ marginLeft: 4, fontSize: 10 }}>⚠️ (Proportionate deduction risk)</span>}
                              </div>
                            )}

                            {p.copayPercent !== undefined && Number(p.copayPercent) > 0 && (
                              <div style={{ fontSize: 12, color: THEME.rust }}>
                                Co-Pay: <strong>{p.copayPercent}%</strong>
                              </div>
                            )}

                            {p.noClaimBonus ? (
                              <div style={{ fontSize: 12, color: THEME.sage }}>
                                No Claim Bonus: <strong><Money value={Number(p.noClaimBonus)} variant="full" /></strong>
                              </div>
                            ) : null}
                          </div>

                          {/* Insured Members List with Emergency Pass Action */}
                          {p.insuredMembers?.length > 0 && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, marginBottom: 8, textTransform: "uppercase" }}>
                                Insured Members & Instant Emergency Passes
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {p.insuredMembers.map((m: any, idx: number) => {
                                  const matchedProfile = familyProfiles?.find(
                                    (prof: any) => prof.name.toLowerCase() === m.name.toLowerCase()
                                  );
                                  const dob = m.dob || matchedProfile?.dob;
                                  const age = dob ? calculateAge(dob) : null;
                                  return (
                                    <div
                                      key={idx}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        padding: "6px 10px",
                                        borderRadius: "var(--radius-sm)",
                                        background: "var(--surface-1)",
                                        border: `1px solid ${THEME.line}`,
                                        fontSize: 12,
                                      }}
                                    >
                                      <Users size={12} color={THEME.accent} />
                                      <span style={{ fontWeight: 700, color: THEME.ink }}>{m.name}</span>
                                      <span style={{ color: THEME.muted }}>({m.relation})</span>
                                      {age !== null && <span style={{ fontWeight: 700, color: THEME.ink }}>· {age}y</span>}
                                      <button
                                        onClick={() => setECardModal({ policy: p, member: m })}
                                        style={{
                                          marginLeft: 6,
                                          fontSize: 10,
                                          fontWeight: 700,
                                          padding: "2px 6px",
                                          borderRadius: 4,
                                          border: `1px solid ${THEME.accent}`,
                                          background: "none",
                                          color: THEME.accent,
                                          cursor: "pointer",
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 3,
                                        }}
                                      >
                                        <Printer size={10} /> Emergency Pass
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {p.notes && (
                            <div style={{ marginTop: 12, fontSize: 12, color: THEME.muted, fontStyle: "italic" }}>
                              Note: {p.notes}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* SUBVIEW 2: FAMILY COVERAGE MATRIX & GAP ANALYSIS */}
          {/* ========================================================= */}
          {subView === "matrix" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Matrix Header Banner */}
              <Card
                style={{
                  padding: "16px 20px",
                  background: "linear-gradient(135deg, var(--surface-0) 0%, var(--surface-1) 100%)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink }}>
                      Family Protection & Stacking Matrix
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                      Benchmarking each family life against ₹10L standard / ₹15L senior citizen medical coverage guidelines.
                    </div>
                  </div>
                  <Badge variant={familyProtectionScore >= 80 ? "sage" : familyProtectionScore >= 50 ? "gold" : "rust"}>
                    {familyProtectionScore}% Adequacy Score
                  </Badge>
                </div>
              </Card>

              {/* Members Stacking Cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
                {familyCoverageMatrix.map((member) => (
                  <Card
                    key={member.name}
                    style={{
                      padding: "18px 20px",
                      borderTop: `3px solid ${member.isAdequate ? THEME.sage : THEME.gold}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: THEME.ink }}>
                          {member.name}
                        </div>
                        <div style={{ fontSize: 12, color: THEME.muted }}>
                          Relation: <strong style={{ textTransform: "capitalize" }}>{member.relation}</strong>
                          {member.age !== null ? ` · Age ${member.age} yrs` : ""}
                          {member.isSenior ? " (Senior Citizen)" : ""}
                        </div>
                      </div>
                      <Badge variant={member.isAdequate ? "sage" : "gold"}>
                        {member.isAdequate ? "Adequately Covered" : "Under-Insured"}
                      </Badge>
                    </div>

                    {/* Coverage Stacking Visual */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                        <span style={{ color: THEME.muted }}>Total Effective Cover:</span>
                        <strong style={{ color: THEME.accent, fontSize: 14 }}>{fmtINRFull(member.totalMemberCover)}</strong>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: "var(--surface-2)", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${Math.min(100, Math.round((member.totalMemberCover / member.targetBenchmark) * 100))}%`,
                            height: "100%",
                            background: member.isAdequate ? THEME.sage : THEME.gold,
                            borderRadius: 3,
                          }}
                        />
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: THEME.muted, marginTop: 4 }}>
                        <span>Target: {fmtINRFull(member.targetBenchmark)}</span>
                        <span>{Math.round((member.totalMemberCover / member.targetBenchmark) * 100)}% of guideline</span>
                      </div>
                    </div>

                    {/* Linked Policies */}
                    <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, marginBottom: 6, textTransform: "uppercase" }}>
                      Active Policies ({member.policies.length})
                    </div>
                    {member.policies.length === 0 ? (
                      <div style={{ fontSize: 12, color: THEME.rust, fontWeight: 600 }}>
                        ⚠️ Not included in any active health policy.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {member.policies.map((p: any) => (
                          <div
                            key={p.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "6px 10px",
                              borderRadius: "var(--radius-sm)",
                              background: "var(--surface-1)",
                              fontSize: 12,
                            }}
                          >
                            <span style={{ fontWeight: 600 }}>{p.insurer} ({POLICY_TYPES.find((t) => t.value === p.policyType)?.label || p.policyType})</span>
                            <strong style={{ color: THEME.ink }}><Money value={Number(p.sumInsured || 0)} variant="full" /></strong>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* SUBVIEW 3: CLAIMS CENTRAL & PIPELINE */}
          {/* ========================================================= */}
          {subView === "claims" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Claims Cockpit */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: 12,
                }}
              >
                <Card style={{ padding: "14px 18px" }}>
                  <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                    Total Claimed
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: THEME.ink, marginTop: 4 }}>
                    <Money value={totalClaimedAmount} variant="full" />
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>{allClaims.length} hospital claims</div>
                </Card>

                <Card style={{ padding: "14px 18px" }}>
                  <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                    Total Settled Payouts
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: THEME.sage, marginTop: 4 }}>
                    <Money value={totalSettledAmount} variant="full" />
                  </div>
                  <div style={{ fontSize: 11, color: THEME.sage, marginTop: 2 }}>
                    {settledClaimsCount} claims approved
                  </div>
                </Card>

                <Card style={{ padding: "14px 18px" }}>
                  <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, textTransform: "uppercase" }}>
                    Pending In Review
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: pendingClaimsCount > 0 ? THEME.gold : THEME.ink, marginTop: 4 }}>
                    {pendingClaimsCount}
                  </div>
                  <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>Pre-auth / in-process</div>
                </Card>
              </div>

              {/* Claims List */}
              {allClaims.length === 0 ? (
                <Card style={{ padding: 48, textAlign: "center" }}>
                  <div style={{ color: THEME.muted, fontSize: 13 }}>No hospitalisation claims filed across your policies.</div>
                </Card>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {allClaims.map((c: any) => (
                    <Card
                      key={c.id}
                      style={{
                        padding: "16px 20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        flexWrap: "wrap",
                        gap: 14,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 12,
                            background: "var(--surface-1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Hospital size={22} color={THEME.accent} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 15, color: THEME.ink }}>
                            {c.hospitalName} {c.patientName ? `· ${c.patientName}` : ""}
                          </div>
                          <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                            {c.policy?.insurer} · Admission Date: <strong>{c.claimDate}</strong>
                            {c.dischargeDate ? ` · Discharged: ${c.dischargeDate}` : ""} · Type:{" "}
                            <strong style={{ textTransform: "capitalize" }}>{c.claimType}</strong>
                            {c.reason ? ` · ${c.reason}` : ""}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 16, fontWeight: 900, color: THEME.ink }}>
                            <Money value={Number(c.amount)} variant="full" />
                          </div>
                          {c.settledAmount ? (
                            <div style={{ fontSize: 11, color: THEME.sage, fontWeight: 700 }}>
                              Settled: <Money value={Number(c.settledAmount)} variant="full" />
                            </div>
                          ) : null}
                        </div>
                        <Badge variant={c.settled || c.status === "settled" ? "sage" : c.status === "rejected" ? "rust" : "gold"}>
                          {c.settled || c.status === "settled" ? "Settled" : c.status === "rejected" ? "Rejected" : "In Review"}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* SUBVIEW 4: SECTION 80D TAX PLANNER */}
          {/* ========================================================= */}
          {subView === "tax80d" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Card style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: THEME.ink }}>
                      Section 80D Income Tax Deduction Optimizer
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                      Claim deductions for health insurance premiums and preventive health checkups under Chapter VI-A.
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: THEME.muted }}>Tax Slab:</span>
                    <select
                      className="form-input"
                      value={taxSlabRate}
                      onChange={(e) => setTaxSlabRate(Number(e.target.value))}
                      style={{ padding: "4px 8px", fontSize: 12 }}
                    >
                      <option value="10">10% Slab</option>
                      <option value="20">20% Slab</option>
                      <option value="30">30% Slab (High Earner)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
                  {/* Category 1: Self, Spouse & Dependent Children */}
                  <div style={{ padding: 16, borderRadius: "var(--radius-md)", background: "var(--surface-1)", border: `1px solid ${THEME.line}` }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: THEME.accent, textTransform: "uppercase" }}>
                      1. Self, Spouse & Kids
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: THEME.ink, marginTop: 6 }}>
                      <Money value={sec80D_SelfDeduction} variant="full" />
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                      Premium: {fmtINRFull(selfFamilyPremium)} (Cap: ₹25,000)
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: "var(--surface-2)", marginTop: 8, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${Math.min(100, Math.round((selfFamilyPremium / sec80D_SelfLimit) * 100))}%`,
                          height: "100%",
                          background: THEME.accent,
                        }}
                      />
                    </div>
                  </div>

                  {/* Category 2: Parents */}
                  <div style={{ padding: 16, borderRadius: "var(--radius-md)", background: "var(--surface-1)", border: `1px solid ${THEME.line}` }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: THEME.violet, textTransform: "uppercase" }}>
                      2. Parents {hasSeniorParents ? "(Senior Citizen Cap)" : "(Normal Cap)"}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: THEME.ink, marginTop: 6 }}>
                      <Money value={sec80D_ParentsDeduction} variant="full" />
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                      Premium: {fmtINRFull(parentsPremium)} (Cap: {fmtINRFull(sec80D_ParentsLimit)})
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: "var(--surface-2)", marginTop: 8, overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${Math.min(100, Math.round((parentsPremium / sec80D_ParentsLimit) * 100))}%`,
                          height: "100%",
                          background: THEME.violet,
                        }}
                      />
                    </div>
                  </div>

                  {/* Category 3: Preventive Health Checkup */}
                  <div style={{ padding: 16, borderRadius: "var(--radius-md)", background: "var(--surface-1)", border: `1px solid ${THEME.line}` }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: THEME.sage, textTransform: "uppercase" }}>
                      3. Preventive Health Checkup
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: THEME.ink, marginTop: 6 }}>
                      <Money value={sec80D_PreventiveDeduction} variant="full" />
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                      Max ₹5,000 sublimit across all members
                    </div>
                    <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: THEME.muted }}>Spent: ₹</span>
                      <input
                        type="number"
                        className="form-input"
                        value={preventiveCheckupSpent}
                        onChange={(e) => setPreventiveCheckupSpent(Number(e.target.value))}
                        style={{ padding: "2px 6px", fontSize: 11, width: 80 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Total Tax Impact Cockpit */}
                <div
                  style={{
                    marginTop: 18,
                    padding: "16px 20px",
                    borderRadius: "var(--radius-md)",
                    background: `linear-gradient(135deg, color-mix(in srgb, ${THEME.accent} 10%, var(--surface-1)), var(--surface-1))`,
                    border: `1px solid color-mix(in srgb, ${THEME.accent} 30%, transparent)`,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 14,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                      Total Section 80D Deductible: <strong style={{ color: THEME.accent }}>{fmtINRFull(totalEligible80D)}</strong>
                    </div>
                    <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                      Maximum combined 80D limit available: {fmtINRFull(sec80D_SelfLimit + sec80D_ParentsLimit)}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: THEME.sage, textTransform: "uppercase" }}>
                      Estimated Direct Tax Savings
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: THEME.sage }}>
                      {fmtINRFull(estimatedTaxSaved)}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ========================================================= */}
          {/* SUBVIEW 5: POLICY COMPARISON MATRIX */}
          {/* ========================================================= */}
          {subView === "comparison" && (
            <Card style={{ overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--surface-1)", borderBottom: `1.5px solid ${THEME.line}` }}>
                      <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Feature / Spec</th>
                      {policies.map((p) => (
                        <th key={p.id} style={{ padding: "12px 16px", textAlign: "left", color: THEME.ink, fontSize: 13, fontWeight: 800 }}>
                          <div>{p.insurer}</div>
                          <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 500 }}>{p.policyName || "Policy"}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: `1px solid ${THEME.line}` }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: THEME.muted }}>Policy Type</td>
                      {policies.map((p) => (
                        <td key={p.id} style={{ padding: "12px 16px" }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: TYPE_COLORS[p.policyType] || THEME.accent,
                              background: `color-mix(in srgb, ${TYPE_COLORS[p.policyType] || THEME.accent} 12%, transparent)`,
                              padding: "2px 6px",
                              borderRadius: 4,
                            }}
                          >
                            {POLICY_TYPES.find((t) => t.value === p.policyType)?.label || p.policyType}
                          </span>
                        </td>
                      ))}
                    </tr>

                    <tr style={{ borderBottom: `1px solid ${THEME.line}` }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: THEME.muted }}>Sum Insured</td>
                      {policies.map((p) => (
                        <td key={p.id} style={{ padding: "12px 16px", fontWeight: 900, color: THEME.accent }}>
                          <Money value={Number(p.sumInsured || 0)} variant="full" />
                        </td>
                      ))}
                    </tr>

                    <tr style={{ borderBottom: `1px solid ${THEME.line}` }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: THEME.muted }}>Annual Premium</td>
                      {policies.map((p) => (
                        <td key={p.id} style={{ padding: "12px 16px", fontWeight: 800 }}>
                          <Money value={annualPremium(Number(p.premium || 0), p.premiumFrequency || "annual")} variant="full" />
                        </td>
                      ))}
                    </tr>

                    <tr style={{ borderBottom: `1px solid ${THEME.line}` }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: THEME.muted }}>Room Rent Sub-limit</td>
                      {policies.map((p) => (
                        <td key={p.id} style={{ padding: "12px 16px", color: hasRoomRentCap(p) ? THEME.rust : THEME.sage }}>
                          {p.roomRentLimit || "No Sub-limit"}
                        </td>
                      ))}
                    </tr>

                    <tr style={{ borderBottom: `1px solid ${THEME.line}` }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: THEME.muted }}>Co-Pay (%)</td>
                      {policies.map((p) => (
                        <td key={p.id} style={{ padding: "12px 16px" }}>
                          {p.copayPercent ? `${p.copayPercent}%` : "0% (Zero)"}
                        </td>
                      ))}
                    </tr>

                    <tr style={{ borderBottom: `1px solid ${THEME.line}` }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: THEME.muted }}>Cashless Active</td>
                      {policies.map((p) => (
                        <td key={p.id} style={{ padding: "12px 16px" }}>
                          {p.cashless ? <Badge variant="sage">Yes</Badge> : <Badge variant="gold">Reimbursement</Badge>}
                        </td>
                      ))}
                    </tr>

                    <tr style={{ borderBottom: `1px solid ${THEME.line}` }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: THEME.muted }}>TPA Desk</td>
                      {policies.map((p) => (
                        <td key={p.id} style={{ padding: "12px 16px" }}>
                          {p.tpaName || "Direct / In-House"}
                        </td>
                      ))}
                    </tr>

                    <tr style={{ borderBottom: `1px solid ${THEME.line}` }}>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: THEME.muted }}>Insured Lives</td>
                      {policies.map((p) => (
                        <td key={p.id} style={{ padding: "12px 16px" }}>
                          {p.insuredMembers?.length || 1} members
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* ========================================================= */}
          {/* SUBVIEW 6: TABLE VIEW */}
          {/* ========================================================= */}
          {subView === "table" && (
            <Card style={{ overflow: "hidden" }}>
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
                              <button
                                onClick={() => setClaimModal(p)}
                                className="icon-btn"
                                style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4 }}
                                title="Claims"
                              >
                                <FileText size={14} />
                              </button>
                              <button
                                onClick={() => setPolicyModal(p)}
                                className="icon-btn"
                                style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4 }}
                                title="Edit"
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
                                className="icon-btn danger"
                                style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 4 }}
                                title="Delete"
                              >
                                <Trash2 size={14} />
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
          )}
        </>
      )}

      {/* MODALS */}
      {policyModal !== null && (
        <PolicyForm
          initial={policyModal?.id ? policyModal : undefined}
          onSave={savePolicy}
          onClose={() => setPolicyModal(null)}
          saving={savingPolicy}
        />
      )}

      {claimModal !== null && (
        <ClaimModal
          policy={claimModal}
          onSave={saveClaimUpdate}
          onClose={() => setClaimModal(null)}
          saving={savingClaim}
        />
      )}

      {eCardModal !== null && (
        <EmergencyCardModal
          policy={eCardModal.policy}
          member={eCardModal.member}
          onClose={() => setECardModal(null)}
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
