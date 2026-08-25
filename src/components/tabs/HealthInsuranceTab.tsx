// @ts-nocheck
import React, { useState } from "react";
import {
  Heart,
  Plus,
  Trash2,
  Pencil,
  Shield,
  AlertCircle,
  CheckCircle,
  Users,
  Calendar,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  Clock,
  AlertTriangle,
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
import { useAsyncAction } from "../../hooks/useAsyncAction";

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
  family_floater: THEME.primary,
  individual: THEME.success,
  corporate: THEME.gold,
  top_up: THEME.violet,
  super_top_up: THEME.pink,
  critical_illness: THEME.danger,
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

// Same self-vs-parents heuristic used by Section80TrackerTab.tsx / TaxFilingHelperTab.tsx
// for their Sec 80D calculation — kept identical here (rather than re-deriving it) so the
// "eligible for 80D" figure shown on this tab always agrees with the Tax tools' numbers.
// A policy is treated as a "parents" policy if any insured member's relation looks like
// a parent; there's no dedicated field for it in the data model.
const PARENT_RELATION_RE = /parent|father|mother|dad|mom|papa|mummy|-in-law/i;
function isParentsPolicy(p: any): boolean {
  return (p.insuredMembers || []).some((m: any) => PARENT_RELATION_RE.test(m?.relation || ""));
}
const SEC80D_SELF_LIMIT = 25000;
const SEC80D_PARENTS_LIMIT = 25000; // stays at the non-senior-citizen cap — see Section80TrackerTab.tsx

// Waiting period (e.g. for pre-existing disease cover) counted in whole months from the
// policy start date. Parses startDate with an explicit local-midnight time component
// (`+"T00:00:00"`) rather than the bare `new Date("YYYY-MM-DD")` form — the bare form is
// parsed as UTC per the ECMA-262 date-only grammar, which can silently roll the displayed/
// compared date back a day in timezones behind UTC. Matches the `dateStr + "T00:00:00"`
// convention already used elsewhere in the app (BudgetTab, CashFlowTab, BanksTab, etc.).
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

// A room-rent sub-limit (e.g. "1% of SI/day", "Single Private AC Room") caps the daily room
// rent a policy will pay for — going over it usually triggers a "proportionate deduction"
// clause that also shrinks reimbursement of the rest of the hospital bill, not just the
// room charge. Anything other than an explicit "no limit" is worth flagging.
function hasRoomRentCap(p: any): boolean {
  const v = (p.roomRentLimit || "").trim();
  if (!v) return false;
  return !/^(no\s*(sub-?)?limit|none|nil|n\/?a|unlimited)/i.test(v);
}

// Rough coverage-adequacy heuristic: flag base health policies (not top-ups, which are
// meant to stack on a base policy, and not critical-illness, which is a lump-sum payout
// product) whose sum insured works out to under ₹5L per insured member — a commonly cited
// rule-of-thumb minimum for a metro/tier-1 hospitalisation today.
const ADEQUACY_PER_MEMBER_MIN = 500000;
// Returns the raw per-member figure (not a pre-formatted string) so the caller can wrap
// just the money portion in <Money> — the sum-insured-per-member number is exactly the kind
// of sensitive figure Privacy Mode is meant to blur, and embedding it in a plain string
// (as this used to do) meant it always rendered unmasked.
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
    // Was previously a silent no-op: an incomplete form (missing insurer, or a zero/blank
    // sum insured or premium) just did nothing when "Save" was clicked, with no error
    // shown, so it looked like the app had frozen or the click hadn't registered.
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
            placeholder="e.g. Star Health, HDFC Ergo"
          />
        </Field>
        <Field label="Policy Name">
          <input
            className="form-input"
            value={form.policyName}
            onChange={(e) => set("policyName", e.target.value)}
            placeholder="e.g. Optima Restore"
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
            placeholder="e.g. 500000"
          />
        </Field>
        <Field label="Premium (₹) *" error={errors.premium}>
          <input
            className="form-input"
            type="number"
            value={form.premium}
            onChange={(e) => set("premium", e.target.value)}
            placeholder="Premium amount"
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
        <Field label="Cashless Available">
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 4,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form.cashless}
              onChange={(e) => set("cashless", e.target.checked)}
            />
            <span style={{ fontSize: 13 }}>Yes, cashless hospitalisation</span>
          </label>
        </Field>
        <Field label="Pre-existing Diseases Covered">
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 4,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form.preExistingCovered}
              onChange={(e) => set("preExistingCovered", e.target.checked)}
            />
            <span style={{ fontSize: 13 }}>Yes, after waiting period</span>
          </label>
        </Field>
      </div>

      <ModalSection title="Insured Members" />
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input
          className="form-input"
          aria-label="Insured member name"
          placeholder="Member name"
          value={memberName}
          onChange={(e) => setMemberName(e.target.value)}
          style={{ flex: 2 }}
        />
        <input
          className="form-input"
          aria-label="Insured member relation"
          placeholder="Relation (self, spouse…)"
          value={memberRelation}
          onChange={(e) => setMemberRelation(e.target.value)}
          style={{ flex: 1 }}
        />
        <Button size="sm" onClick={addMember} aria-label="Add insured member">
          Add
        </Button>
      </div>
      {members.map((m, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Badge>{m.relation}</Badge>
          <span style={{ fontSize: 13 }}>{m.name}</span>
          <button
            onClick={() => removeMember(i)}
            aria-label={`Remove ${m.name}`}
            title={`Remove ${m.name}`}
            className="icon-btn danger"
            style={{
              marginLeft: "auto",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: THEME.danger,
              padding: 6,
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={14} />
          </button>
        </div>
      ))}

      <Field label="Notes" style={{ marginTop: 16 }}>
        <textarea
          className="form-input"
          rows={2}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Any additional details…"
        />
      </Field>

      <ModalActions onSave={save} onClose={onClose} saveLabel="Save Policy" disabled={saving} loading={saving} />
    </Modal>
  );
}

// Lightweight "log a claim" modal, separate from the full policy-edit form — filing a
// claim happens far more often than editing policy details, so it shouldn't require
// opening the whole Edit Policy modal (same reasoning as Loans Given's dedicated
// "Add Payment" modal vs. its full loan-edit form). Appends to the policy's `claims`
// jsonb array (column already exists — see database/64_health_insurance.sql).
function ClaimForm({ policy, onSave, onClose, saving = false }: any) {
  const [date, setDate] = useState(today());
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [settled, setSettled] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const save = () => {
    const next: Record<string, string> = {};
    if (!date) next.date = "Select a claim date.";
    if (!(Number(amount) > 0)) next.amount = "Enter a claim amount greater than ₹0.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    onSave([
      ...(policy.claims || []),
      { id: uid(), date, description: description.trim(), amount: Number(amount), settled },
    ]);
  };

  return (
    <Modal
      title={`Log Claim — ${policy.insurer}${policy.policyName ? ` · ${policy.policyName}` : ""}`}
      onClose={onClose}
      maxWidth={480}
    >
      <Field label="Claim Date *" error={errors.date}>
        <input
          className="form-input"
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            if (errors.date) setErrors((er) => ({ ...er, date: "" }));
          }}
        />
      </Field>
      <Field label="Description">
        <input
          className="form-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Hospitalisation — appendix surgery"
        />
      </Field>
      <Field label="Claim Amount (₹) *" error={errors.amount}>
        <input
          className="form-input"
          type="number"
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            if (errors.amount) setErrors((er) => ({ ...er, amount: "" }));
          }}
          placeholder="Amount claimed"
        />
      </Field>
      <Field label="Status">
        <label
          style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, cursor: "pointer" }}
        >
          <input type="checkbox" checked={settled} onChange={(e) => setSettled(e.target.checked)} />
          <span style={{ fontSize: 13 }}>Settled / paid out</span>
        </label>
      </Field>
      <ModalActions onSave={save} onClose={onClose} saveLabel="Log Claim" disabled={saving} loading={saving} />
    </Modal>
  );
}

export function HealthInsuranceTab({ state, addItem, removeItem, updateItem, showToast }: any) {
  const policies = state.healthInsurance || [];
  const [modal, setModal] = useState<any>(null);
  const [claimModal, setClaimModal] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(
    null
  );

  const totalCover = policies.reduce((s: number, p: any) => s + Number(p.sumInsured || 0), 0);
  const totalAnnualPremium = policies.reduce(
    (s: number, p: any) =>
      s + annualPremium(Number(p.premium || 0), p.premiumFrequency || "annual"),
    0
  );

  const renewingSoon = policies.filter((p: any) => {
    const days = daysUntilRenewal(p.renewalDate);
    return days !== null && days >= 0 && days <= 30;
  });

  // Sec 80D eligibility estimate — same formula/limits as Section80TrackerTab.tsx &
  // TaxFilingHelperTab.tsx (see PARENT_RELATION_RE above) so this tab's number never
  // drifts from what the Tax tools actually claim as deductible.
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

  const allClaims = policies.flatMap((p: any) => (p.claims || []).map((c: any) => ({ ...c, policy: p })));
  const totalClaimedAmount = allClaims.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
  const pendingClaims = allClaims.filter((c: any) => !c.settled).length;

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

  const { run: removeClaimRun } = useAsyncAction(
    async (policy: any, claimId: string) => {
      await updateItem("healthInsurance", policy.id, {
        ...policy,
        claims: (policy.claims || []).filter((c: any) => c.id !== claimId),
      });
    },
    { onError: (e: any) => showToast?.(`Failed to delete claim: ${e?.message || "Unknown error"}`, "error") }
  );
  const removeClaim = (policy: any, claimId: string) => {
    setConfirmAction({
      message: "Delete this claim record? This cannot be undone.",
      onConfirm: () => removeClaimRun(policy, claimId),
    });
  };

  const { run: deletePolicy } = useAsyncAction(
    async (id: string) => { await removeItem("healthInsurance", id); },
    { onError: (e: any) => showToast?.(`Failed to delete policy: ${e?.message || "Unknown error"}`, "error") }
  );

  return (
    <div>
      <SectionTitle
        sub="Track all health insurance policies — family floater, corporate, top-up & more"
        rightElement={
          <Button size="sm" onClick={() => setModal({})}>
            <Plus size={14} /> Add Policy
          </Button>
        }
      >
        Health Insurance
      </SectionTitle>

      {/* Stats */}
      {policies.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <StatCard
            label="Total Cover"
            value={fmtINRFull(totalCover)}
            numericValue={totalCover}
            formatValue={fmtINRFull}
            icon={<Shield size={18} />}
            color={THEME.success}
          />
          <StatCard
            label="Annual Premium"
            value={fmtINRFull(totalAnnualPremium)}
            numericValue={totalAnnualPremium}
            formatValue={fmtINRFull}
            sub={
              sec80DEstimate > 0 ? (
                <>
                  ≈ <Money value={sec80DEstimate} variant="full" /> eligible for 80D
                </>
              ) : undefined
            }
            icon={<Heart size={18} />}
            color={THEME.danger}
          />
          <StatCard
            label="Policies Active"
            value={String(policies.length)}
            numericValue={policies.length}
            formatValue={(n) => String(Math.round(n))}
            icon={<ClipboardList size={18} />}
            color={THEME.primary}
          />
          <StatCard
            label="Renewing Soon"
            value={String(renewingSoon.length)}
            numericValue={renewingSoon.length}
            formatValue={(n) => String(Math.round(n))}
            icon={<Calendar size={18} />}
            color={renewingSoon.length > 0 ? THEME.warning : THEME.textMuted}
          />
        </div>
      )}

      {/* Claims summary */}
      {allClaims.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: THEME.textMuted,
            marginBottom: 16,
          }}
        >
          <FileText size={12} />
          {allClaims.length} claim{allClaims.length !== 1 ? "s" : ""} filed ·{" "}
          <Money value={totalClaimedAmount} variant="full" /> total claimed
          {pendingClaims > 0 ? ` · ${pendingClaims} pending settlement` : ""}
        </div>
      )}

      {/* Renewal alerts */}
      {renewingSoon.length > 0 && (
        <div
          style={{
            background: `color-mix(in srgb, ${THEME.warning} 18%, transparent)`,
            border: `1px solid color-mix(in srgb, ${THEME.warning} 40%, transparent)`,
            borderRadius: 10,
            padding: "12px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          <AlertCircle size={16} color={THEME.warning} style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: THEME.warning }}>
              Renewal Due Soon
            </div>
            <div style={{ fontSize: 12, color: THEME.textMuted, marginTop: 2 }}>
              {renewingSoon
                .map(
                  (p: any) =>
                    `${p.insurer}${p.policyName ? ` (${p.policyName})` : ""} — ${daysUntilRenewal(p.renewalDate)}d left`
                )
                .join(" · ")}
            </div>
          </div>
        </div>
      )}

      {/* Policies list */}
      {policies.length === 0 ? (
        <EmptyState
          icon={Heart}
          gradient={`linear-gradient(135deg, ${THEME.danger} 0%, color-mix(in srgb, ${THEME.danger} 55%, white) 100%)`}
          dotColor={THEME.danger}
          title="No Health Insurance Policies Yet"
          description="Add your health insurance policies to track coverage, premiums, renewals, and claims."
          pills={["Family Floater", "Corporate Cover", "Renewal Alerts", "Premium Tracking"]}
          buttonLabel="Add Policy"
          onAdd={() => setModal({})}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {policies.map((p: any) => {
            const days = daysUntilRenewal(p.renewalDate);
            const isExpanded = expanded === p.id;
            const annual = annualPremium(Number(p.premium || 0), p.premiumFrequency || "annual");
            const typeColor = TYPE_COLORS[p.policyType] || THEME.primary;
            const adequacyNote = coverageAdequacyNote(p);
            const waiting = waitingPeriodInfo(p);
            const roomRentCapped = hasRoomRentCap(p);
            const claims = p.claims || [];

            return (
              <Card key={p.id} style={{ borderLeft: `4px solid ${typeColor}`, padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                    <Heart size={22} color={typeColor} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {p.insurer}
                      {p.policyName ? ` — ${p.policyName}` : ""}
                    </div>
                    <div style={{ fontSize: 12, color: THEME.textMuted, marginTop: 2 }}>
                      {POLICY_TYPES.find((t) => t.value === p.policyType)?.label || p.policyType}
                      {p.policyNumber ? ` · #${p.policyNumber}` : ""}
                      {p.insuredMembers?.length
                        ? ` · ${p.insuredMembers.length} member${p.insuredMembers.length !== 1 ? "s" : ""}`
                        : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: THEME.success }}>
                      <Money value={Number(p.sumInsured || 0)} variant="full" />
                    </div>
                    <div style={{ fontSize: 11, color: THEME.textMuted }}>cover</div>
                    {adequacyNote && (
                      <div
                        style={{
                          fontSize: 10,
                          color: THEME.warning,
                          marginTop: 2,
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                          justifyContent: "flex-end",
                        }}
                        title="Rough rule-of-thumb: ₹5L+ cover per insured member for a metro/tier-1 hospitalisation"
                      >
                        <AlertTriangle size={10} /> ~<Money value={adequacyNote} variant="full" />
                        /member — consider a top-up
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      <Money value={annual} variant="full" />/yr
                    </div>
                    <div style={{ fontSize: 11, color: THEME.textMuted }}>premium</div>
                  </div>
                  {days !== null && (
                    <Badge variant={days <= 7 ? "rust" : days <= 30 ? "gold" : "sage"}>
                      {days <= 0 ? "Expired" : `Renews in ${days}d`}
                    </Badge>
                  )}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => setClaimModal(p)}
                      aria-label={`Log a claim for ${p.insurer} policy`}
                      title="Log a claim"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.textMuted,
                        padding: 6,
                        display: "flex",
                        alignItems: "center",
                        transition: "background 0.15s ease, color 0.15s ease",
                      }}
                    >
                      <FileText size={14} />
                    </button>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : p.id)}
                      aria-label={isExpanded ? "Collapse policy details" : "Expand policy details"}
                      title={isExpanded ? "Collapse" : "Expand"}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.textMuted,
                        padding: 6,
                        display: "flex",
                        alignItems: "center",
                      transition: "background 0.15s ease, color 0.15s ease",
                      }}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button
                      onClick={() => setModal(p)}
                      aria-label={`Edit ${p.insurer} policy`}
                      title="Edit policy"
                      className="icon-btn"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.textMuted,
                        padding: 6,
                        display: "flex",
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
                      aria-label={`Delete ${p.insurer} policy`}
                      title="Delete policy"
                      className="icon-btn danger"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.danger,
                        padding: 6,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 16,
                      borderTop: `1px solid ${THEME.border}`,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: 12,
                      }}
                    >
                      {p.cashless && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12,
                            color: THEME.success,
                          }}
                        >
                          <CheckCircle size={14} /> Cashless hospitalisation
                        </div>
                      )}
                      {p.preExistingCovered && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12,
                            color: THEME.success,
                          }}
                        >
                          <CheckCircle size={14} /> Pre-existing covered
                        </div>
                      )}
                      {Number(p.waitingPeriodYears) > 0 && (
                        <div style={{ fontSize: 12, color: THEME.textMuted }}>
                          <div>
                            Waiting period: {p.waitingPeriodYears} yr
                            {p.waitingPeriodYears !== 1 ? "s" : ""}
                          </div>
                          {waiting && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                marginTop: 2,
                                color: waiting.done ? THEME.success : THEME.warning,
                              }}
                            >
                              <Clock size={11} />
                              {waiting.done
                                ? "Fully vested"
                                : `${waiting.remainingMonths} mo remaining`}
                            </div>
                          )}
                        </div>
                      )}
                      {Number(p.noClaimBonus) > 0 && (
                        <div style={{ fontSize: 12, color: THEME.textMuted }}>
                          NCB: <Money value={Number(p.noClaimBonus)} variant="full" />
                        </div>
                      )}
                      {p.hospitalNetwork && (
                        <div style={{ fontSize: 12, color: THEME.textMuted }}>
                          Network: {p.hospitalNetwork}
                        </div>
                      )}
                      {p.roomRentLimit && (
                        <div
                          style={{
                            fontSize: 12,
                            color: roomRentCapped ? THEME.warning : THEME.textMuted,
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          {roomRentCapped && <AlertTriangle size={11} />}
                          Room rent: {p.roomRentLimit}
                        </div>
                      )}
                      {p.startDate && (
                        <div style={{ fontSize: 12, color: THEME.textMuted }}>
                          Start:{" "}
                          {new Date(p.startDate + "T00:00:00").toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      )}
                      {p.renewalDate && (
                        <div style={{ fontSize: 12, color: THEME.textMuted }}>
                          Renewal:{" "}
                          {new Date(p.renewalDate + "T00:00:00").toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      )}
                    </div>
                    {p.insuredMembers?.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: THEME.textMuted,
                            marginBottom: 6,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Insured Members
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {p.insuredMembers.map((m: any, i: number) => (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <Users size={12} color={THEME.textMuted} />
                              <span style={{ fontSize: 12 }}>{m.name}</span>
                              <Badge style={{ fontSize: 10 }}>{m.relation}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {claims.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: THEME.textMuted,
                            marginBottom: 6,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Claim History
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {[...claims]
                            .sort((a: any, b: any) => (b.date || "").localeCompare(a.date || ""))
                            .map((c: any) => (
                              <div
                                key={c.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  fontSize: 12,
                                  flexWrap: "wrap",
                                }}
                              >
                                <span style={{ color: THEME.textMuted, minWidth: 70 }}>
                                  {c.date
                                    ? new Date(c.date + "T00:00:00").toLocaleDateString("en-IN", {
                                        day: "2-digit",
                                        month: "short",
                                        year: "2-digit",
                                      })
                                    : "—"}
                                </span>
                                <span style={{ fontWeight: 600 }}>
                                  <Money value={Number(c.amount || 0)} variant="full" />
                                </span>
                                {c.description && (
                                  <span style={{ color: THEME.textMuted, flex: 1, minWidth: 0 }}>
                                    {c.description}
                                  </span>
                                )}
                                <Badge variant={c.settled ? "sage" : "gold"} size="xs">
                                  {c.settled ? "Settled" : "Pending"}
                                </Badge>
                                <button
                                  onClick={() => removeClaim(p, c.id)}
                                  aria-label={`Delete claim from ${c.date}`}
                                  title="Delete claim"
                                  className="icon-btn danger"
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: THEME.danger,
                                    padding: 4,
                                    display: "flex",
                                    alignItems: "center",
                                  }}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                    {p.notes && (
                      <div
                        style={{
                          marginTop: 10,
                          fontSize: 12,
                          color: THEME.textMuted,
                          fontStyle: "italic",
                        }}
                      >
                        {p.notes}
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
        <ClaimForm
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
