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
} from "lucide-react";
import { THEME, PROFILES } from "../../utils/constants";
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
import { Prv } from "../../context/PrivacyContext";

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
  top_up: "#8b5cf6",
  super_top_up: "#ec4899",
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
  notes: "",
};

function PolicyForm({ initial, onSave, onClose }: any) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [members, setMembers] = useState<{ name: string; relation: string }[]>(
    initial?.insuredMembers || []
  );
  const [memberName, setMemberName] = useState("");
  const [memberRelation, setMemberRelation] = useState("");

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const addMember = () => {
    if (!memberName.trim()) return;
    setMembers((m) => [...m, { name: memberName.trim(), relation: memberRelation.trim() || "self" }]);
    setMemberName("");
    setMemberRelation("");
  };

  const removeMember = (i: number) => setMembers((m) => m.filter((_, idx) => idx !== i));

  const save = () => {
    if (!form.insurer || !form.sumInsured || !form.premium) return;
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
      <div style={g2}>
        <Field label="Insurer / Company *">
          <input className="input" value={form.insurer} onChange={(e) => set("insurer", e.target.value)} placeholder="e.g. Star Health, HDFC Ergo" />
        </Field>
        <Field label="Policy Name">
          <input className="input" value={form.policyName} onChange={(e) => set("policyName", e.target.value)} placeholder="e.g. Optima Restore" />
        </Field>
        <Field label="Policy Number">
          <input className="input" value={form.policyNumber} onChange={(e) => set("policyNumber", e.target.value)} placeholder="Policy / Certificate No." />
        </Field>
        <Field label="Policy Type">
          <select className="input" value={form.policyType} onChange={(e) => set("policyType", e.target.value)}>
            {POLICY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Owner / Profile">
          <select className="input" value={form.owner} onChange={(e) => set("owner", e.target.value)}>
            {PROFILES.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
      </div>

      <ModalSection title="Coverage & Premium" />
      <div style={g2}>
        <Field label="Sum Insured (₹) *">
          <input className="input" type="number" value={form.sumInsured} onChange={(e) => set("sumInsured", e.target.value)} placeholder="e.g. 500000" />
        </Field>
        <Field label="Premium (₹) *">
          <input className="input" type="number" value={form.premium} onChange={(e) => set("premium", e.target.value)} placeholder="Premium amount" />
        </Field>
        <Field label="Premium Frequency">
          <select className="input" value={form.premiumFrequency} onChange={(e) => set("premiumFrequency", e.target.value)}>
            {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="Start Date">
          <input className="input" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
        </Field>
        <Field label="Renewal Date">
          <input className="input" type="date" value={form.renewalDate} onChange={(e) => set("renewalDate", e.target.value)} />
        </Field>
      </div>

      <ModalSection title="Policy Features" />
      <div style={g2}>
        <Field label="Hospital Network">
          <input className="input" value={form.hospitalNetwork} onChange={(e) => set("hospitalNetwork", e.target.value)} placeholder="e.g. 10,000+ hospitals" />
        </Field>
        <Field label="Waiting Period (years)">
          <input className="input" type="number" value={form.waitingPeriodYears} onChange={(e) => set("waitingPeriodYears", e.target.value)} placeholder="e.g. 2" />
        </Field>
        <Field label="No Claim Bonus (₹)">
          <input className="input" type="number" value={form.noClaimBonus} onChange={(e) => set("noClaimBonus", e.target.value)} placeholder="Current NCB amount" />
        </Field>
        <div />
        <Field label="Cashless Available">
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, cursor: "pointer" }}>
            <input type="checkbox" checked={form.cashless} onChange={(e) => set("cashless", e.target.checked)} />
            <span style={{ fontSize: 13 }}>Yes, cashless hospitalisation</span>
          </label>
        </Field>
        <Field label="Pre-existing Diseases Covered">
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, cursor: "pointer" }}>
            <input type="checkbox" checked={form.preExistingCovered} onChange={(e) => set("preExistingCovered", e.target.checked)} />
            <span style={{ fontSize: 13 }}>Yes, after waiting period</span>
          </label>
        </Field>
      </div>

      <ModalSection title="Insured Members" />
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <input className="input" placeholder="Member name" value={memberName} onChange={(e) => setMemberName(e.target.value)} style={{ flex: 2 }} />
        <input className="input" placeholder="Relation (self, spouse…)" value={memberRelation} onChange={(e) => setMemberRelation(e.target.value)} style={{ flex: 1 }} />
        <Button size="sm" onClick={addMember}>Add</Button>
      </div>
      {members.map((m, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Badge>{m.relation}</Badge>
          <span style={{ fontSize: 13 }}>{m.name}</span>
          <button onClick={() => removeMember(i)} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: THEME.danger }}>
            <X size={14} />
          </button>
        </div>
      ))}

      <Field label="Notes" style={{ marginTop: 16 }}>
        <textarea className="input" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any additional details…" />
      </Field>

      <ModalActions onSave={save} onClose={onClose} saveLabel="Save Policy" />
    </Modal>
  );
}

export function HealthInsuranceTab({ state, addItem, removeItem, updateItem }: any) {
  const policies = state.healthInsurance || [];
  const [modal, setModal] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const totalCover = policies.reduce((s: number, p: any) => s + Number(p.sumInsured || 0), 0);
  const totalAnnualPremium = policies.reduce((s: number, p: any) =>
    s + annualPremium(Number(p.premium || 0), p.premiumFrequency || "annual"), 0);

  const renewingSoon = policies.filter((p: any) => {
    const days = daysUntilRenewal(p.renewalDate);
    return days !== null && days >= 0 && days <= 30;
  });

  const save = (data: any) => {
    if (data.id && policies.find((p: any) => p.id === data.id)) {
      updateItem("healthInsurance", data.id, data);
    } else {
      addItem("healthInsurance", data);
    }
    setModal(null);
  };

  return (
    <div>
      <SectionTitle
        sub="Track all health insurance policies — family floater, corporate, top-up & more"
        rightElement={<Button size="sm" onClick={() => setModal({})}>
          <Plus size={14} /> Add Policy
        </Button>}
      >
        Health Insurance
      </SectionTitle>

      {/* Stats */}
      {policies.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
          <StatCard
            label="Total Cover"
            value={<Prv>{fmtINRFull(totalCover)}</Prv>}
            icon={<Shield size={18} />}
            color={THEME.success}
          />
          <StatCard
            label="Annual Premium"
            value={<Prv>{fmtINRFull(totalAnnualPremium)}</Prv>}
            icon={<Heart size={18} />}
            color={THEME.danger}
          />
          <StatCard
            label="Policies Active"
            value={policies.length}
            icon={<ClipboardList size={18} />}
            color={THEME.primary}
          />
          <StatCard
            label="Renewing Soon"
            value={renewingSoon.length}
            icon={<Calendar size={18} />}
            color={renewingSoon.length > 0 ? THEME.warning : THEME.textMuted}
          />
        </div>
      )}

      {/* Renewal alerts */}
      {renewingSoon.length > 0 && (
        <div style={{
          background: `${THEME.warning}18`,
          border: `1px solid ${THEME.warning}40`,
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 16,
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}>
          <AlertCircle size={16} color={THEME.warning} style={{ marginTop: 2, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: THEME.warning }}>Renewal Due Soon</div>
            <div style={{ fontSize: 12, color: THEME.textMuted, marginTop: 2 }}>
              {renewingSoon.map((p: any) => `${p.insurer}${p.policyName ? ` (${p.policyName})` : ""} — ${daysUntilRenewal(p.renewalDate)}d left`).join(" · ")}
            </div>
          </div>
        </div>
      )}

      {/* Policies list */}
      {policies.length === 0 ? (
        <EmptyState
          icon={Heart}
          gradient="linear-gradient(135deg, #e11d48 0%, #fb7185 100%)"
          dotColor="#e11d48"
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

            return (
              <Card key={p.id} style={{ borderLeft: `4px solid ${typeColor}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, background: `${typeColor}18`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <Heart size={20} color={typeColor} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      {p.insurer}{p.policyName ? ` — ${p.policyName}` : ""}
                    </div>
                    <div style={{ fontSize: 12, color: THEME.textMuted, marginTop: 2 }}>
                      {POLICY_TYPES.find((t) => t.value === p.policyType)?.label || p.policyType}
                      {p.policyNumber ? ` · #${p.policyNumber}` : ""}
                      {p.insuredMembers?.length ? ` · ${p.insuredMembers.length} member${p.insuredMembers.length !== 1 ? "s" : ""}` : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: THEME.success }}>
                      <Prv>{fmtINRFull(Number(p.sumInsured || 0))}</Prv>
                    </div>
                    <div style={{ fontSize: 11, color: THEME.textMuted }}>cover</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      <Prv>{fmtINRFull(annual)}/yr</Prv>
                    </div>
                    <div style={{ fontSize: 11, color: THEME.textMuted }}>premium</div>
                  </div>
                  {days !== null && (
                    <Badge
                      color={days <= 7 ? "danger" : days <= 30 ? "warning" : "success"}
                    >
                      {days <= 0 ? "Expired" : `Renews in ${days}d`}
                    </Badge>
                  )}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : p.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: THEME.textMuted, padding: 4 }}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button onClick={() => setModal(p)} style={{ background: "none", border: "none", cursor: "pointer", color: THEME.textMuted, padding: 4 }}>
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => { if (window.confirm(`Delete "${p.insurer}" policy?`)) removeItem("healthInsurance", p.id); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: THEME.danger, padding: 4 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${THEME.border}` }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                      {p.cashless && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: THEME.success }}>
                          <CheckCircle size={14} /> Cashless hospitalisation
                        </div>
                      )}
                      {p.preExistingCovered && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: THEME.success }}>
                          <CheckCircle size={14} /> Pre-existing covered
                        </div>
                      )}
                      {Number(p.waitingPeriodYears) > 0 && (
                        <div style={{ fontSize: 12, color: THEME.textMuted }}>
                          Waiting period: {p.waitingPeriodYears} yr{p.waitingPeriodYears !== 1 ? "s" : ""}
                        </div>
                      )}
                      {Number(p.noClaimBonus) > 0 && (
                        <div style={{ fontSize: 12, color: THEME.textMuted }}>
                          NCB: <Prv>{fmtINRFull(Number(p.noClaimBonus))}</Prv>
                        </div>
                      )}
                      {p.hospitalNetwork && (
                        <div style={{ fontSize: 12, color: THEME.textMuted }}>
                          Network: {p.hospitalNetwork}
                        </div>
                      )}
                      {p.startDate && (
                        <div style={{ fontSize: 12, color: THEME.textMuted }}>
                          Start: {new Date(p.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      )}
                      {p.renewalDate && (
                        <div style={{ fontSize: 12, color: THEME.textMuted }}>
                          Renewal: {new Date(p.renewalDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </div>
                      )}
                    </div>
                    {p.insuredMembers?.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: THEME.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
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
                    {p.notes && (
                      <div style={{ marginTop: 10, fontSize: 12, color: THEME.textMuted, fontStyle: "italic" }}>
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
        />
      )}
    </div>
  );
}
