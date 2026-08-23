// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  Shield,
  Plus,
  Trash2,
  Pencil,
  TrendingUp,
  Users,
  IndianRupee,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Star,
  Coins,
  Briefcase,
  FileText,
  Activity,
  Repeat,
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
import {
  APY_PENSION_TIERS,
  PMKISAN_ANNUAL_BENEFIT,
  SCHEME_RULES,
  annualizeContribution,
  getMaturityStatus,
  getSchemeWarnings,
  projectSchemeValue,
} from "../../utils/govtSchemes";

// Category colors drawn only from THEME tokens (no arbitrary hex, no collision
// risk with the 10 selectable accent presets) — cycled across the 7 usable
// tokens (accent/gold/sage/rust/violet/pink/cyan) since 11 scheme types need
// more categorical distinction than the app's 5 core semantic colors alone.
//
// `hideContribution` suppresses the generic Contribution Amount/Frequency
// fields for schemes where they'd either duplicate a dedicated field (PMJJBY/
// PMSBY already have Annual Premium) or don't apply at all (PM-KISAN is a
// fixed DBT benefit paid to the user, not a user contribution) — showing both
// invited double-entry and silently corrupted the Annual Outflow stat.
// `balanceLabel`/`balanceCardLabel` let PM-KISAN reuse the `currentBalance`
// column to mean "amount received" instead of "corpus".
const SCHEMES = [
  {
    value: "APY",
    label: "APY — Atal Pension Yojana",
    description: "Guaranteed pension of ₹1,000–5,000/month at 60. For unorganised sector workers.",
    color: THEME.accent,
    fields: ["pensionAmount"],
    hasBalance: false,
  },
  {
    value: "SSY",
    label: "SSY — Sukanya Samriddhi Yojana",
    description:
      "Tax-free savings scheme for girl child. 8.2% p.a. Matures at 21 years / marriage.",
    color: THEME.pink,
    fields: ["memberName", "interestRate"],
    hasBalance: true,
  },
  {
    value: "PMJJBY",
    label: "PMJJBY — Pradhan Mantri Jeevan Jyoti Bima",
    description: "Life insurance cover of ₹2 lakh. Annual premium ₹436.",
    color: THEME.sage,
    fields: ["coverageAmount", "premium"],
    hasBalance: false,
    hideContribution: true,
  },
  {
    value: "PMSBY",
    label: "PMSBY — Pradhan Mantri Suraksha Bima",
    description: "Accident insurance ₹2 lakh. Annual premium ₹20.",
    color: THEME.gold,
    fields: ["coverageAmount", "premium"],
    hasBalance: false,
    hideContribution: true,
  },
  {
    value: "PMKISAN",
    label: "PM-KISAN — Kisan Samman Nidhi",
    description: "₹6,000/year in 3 instalments for eligible farmers.",
    color: THEME.cyan,
    fields: [],
    hasBalance: true,
    hideContribution: true,
    balanceLabel: "Total Amount Received (₹)",
    balancePlaceholder: "Sum of instalments received to date",
    balanceCardLabel: "received",
  },
  {
    value: "SCSS",
    label: "SCSS — Senior Citizen Savings Scheme",
    description: "Post office scheme for 60+. 8.2% p.a. quarterly payout.",
    color: THEME.violet,
    fields: ["interestRate"],
    hasBalance: true,
  },
  {
    value: "NSC",
    label: "NSC — National Savings Certificate",
    description: "5-year post office scheme. 7.7% p.a. Qualifies for 80C deduction.",
    color: THEME.rust,
    fields: ["interestRate"],
    hasBalance: true,
  },
  {
    value: "KVP",
    label: "KVP — Kisan Vikas Patra",
    description: "Investment doubles in ~115 months. 7.5% p.a.",
    color: THEME.gold,
    fields: ["interestRate"],
    hasBalance: true,
  },
  {
    value: "POST_MIS",
    label: "Post Office MIS — Monthly Income Scheme",
    description: "Monthly interest payout. 7.4% p.a. Max deposit ₹9L (single) / ₹15L (joint).",
    color: THEME.rust,
    fields: ["interestRate"],
    hasBalance: true,
  },
  {
    value: "RBI_BOND",
    label: "RBI Floating Rate Bond",
    description: "7-year bond. Floating rate (currently 8.05%). No premature withdrawal.",
    color: THEME.accent,
    fields: ["interestRate"],
    hasBalance: true,
  },
  {
    value: "NPS_LITE",
    label: "NPS Lite — Swavalamban",
    description: "NPS for unorganised sector. Govt co-contribution for eligible members.",
    color: THEME.cyan,
    fields: ["interestRate"],
    hasBalance: true,
  },
];

const SCHEME_MAP = Object.fromEntries(SCHEMES.map((s) => [s.value, s]));

const SCHEME_ICONS: Record<string, any> = {
  APY: Users,
  SSY: Star,
  PMJJBY: Shield,
  PMSBY: Shield,
  PMKISAN: TrendingUp,
  SCSS: Users,
  NSC: FileText,
  KVP: Coins,
  POST_MIS: Coins,
  RBI_BOND: FileText,
  NPS_LITE: Briefcase,
};

const EMPTY: any = {
  schemeType: "APY",
  schemeName: "",
  accountNumber: "",
  memberName: "",
  owner: "self",
  startDate: "",
  maturityDate: "",
  contributionAmount: "",
  frequency: "annual",
  currentBalance: "",
  interestRate: "",
  pensionAmount: "",
  coverageAmount: "",
  premium: "",
  nominee: "",
  bankAccount: "",
  notes: "",
};

function SchemeForm({ initial, onSave, onClose, saving = false }: any) {
  const { familyProfiles } = useMasterData();
  const [form, setForm] = useState({ ...EMPTY, startDate: today(), ...initial });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const meta = SCHEME_MAP[form.schemeType] || SCHEMES[0];
  const isNew = !initial?.id;

  // Auto-fill the official premium on a fresh PMJJBY/PMSBY entry so a blank
  // field doesn't silently understate the Annual Outflow stat — still
  // editable, since premiums have changed over the scheme's history.
  useEffect(() => {
    if (!isNew) return;
    const rule = SCHEME_RULES[form.schemeType];
    if (rule?.defaultPremium && !form.premium) {
      set("premium", String(rule.defaultPremium));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.schemeType]);

  const save = () => {
    if (!form.schemeType) return;
    const name = form.schemeName || meta.label.split("—")[0].trim();
    onSave({ ...form, schemeName: name, id: initial?.id || uid() });
  };

  const warnings = getSchemeWarnings(form);

  const g2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };

  return (
    <Modal
      title={initial?.id ? "Edit Government Scheme" : "Add Government Scheme"}
      onClose={onClose}
      maxWidth={640}
    >
      <Field label="Scheme Type *">
        <select
          className="form-input"
          value={form.schemeType}
          onChange={(e) => set("schemeType", e.target.value)}
        >
          {SCHEMES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>

      {/* Scheme info card */}
      <div
        style={{
          background: `color-mix(in srgb, ${meta.color} 7%, transparent)`,
          border: `1px solid color-mix(in srgb, ${meta.color} 19%, transparent)`,
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 16,
          fontSize: 12,
          color: THEME.textMuted,
          lineHeight: 1.6,
        }}
      >
        {meta.description}
      </div>

      <ModalSection title="Account Details" />
      <div style={g2}>
        {meta.fields.includes("memberName") && (
          <Field label="Member Name (Beneficiary)">
            <input
              className="form-input"
              value={form.memberName}
              onChange={(e) => set("memberName", e.target.value)}
              placeholder="e.g. Daughter's name"
            />
          </Field>
        )}
        <Field label="Custom Label">
          <input
            className="form-input"
            value={form.schemeName}
            onChange={(e) => set("schemeName", e.target.value)}
            placeholder="Optional display name"
          />
        </Field>
        <Field label="Account Number">
          <input
            className="form-input"
            value={form.accountNumber}
            onChange={(e) => set("accountNumber", e.target.value)}
            placeholder="Scheme / PRAN number"
          />
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

      <ModalSection title="Timeline" />
      <div style={g2}>
        <Field label="Start Date">
          <input
            className="form-input"
            type="date"
            value={form.startDate}
            onChange={(e) => set("startDate", e.target.value)}
          />
        </Field>
        <Field label="Maturity Date">
          <input
            className="form-input"
            type="date"
            value={form.maturityDate}
            onChange={(e) => set("maturityDate", e.target.value)}
          />
        </Field>
      </div>

      <ModalSection title="Contribution & Value" />
      <div style={g2}>
        {meta.hasBalance && (
          <Field label={meta.balanceLabel || "Current Balance (₹)"}>
            <input
              className="form-input"
              type="number"
              value={form.currentBalance}
              onChange={(e) => set("currentBalance", e.target.value)}
              placeholder={meta.balancePlaceholder || "Current corpus"}
            />
          </Field>
        )}
        {meta.fields.includes("interestRate") && (
          <Field label="Interest Rate (% p.a.)">
            <input
              className="form-input"
              type="number"
              value={form.interestRate}
              onChange={(e) => set("interestRate", e.target.value)}
              placeholder="e.g. 8.2"
            />
          </Field>
        )}
        {!meta.hideContribution && (
          <>
            <Field label="Contribution Amount (₹)">
              <input
                className="form-input"
                type="number"
                value={form.contributionAmount}
                onChange={(e) => set("contributionAmount", e.target.value)}
                placeholder="Per instalment"
              />
            </Field>
            <Field label="Contribution Frequency">
              <select
                className="form-input"
                value={form.frequency}
                onChange={(e) => set("frequency", e.target.value)}
              >
                {["monthly", "quarterly", "annual", "one_time"].map((f) => (
                  <option key={f} value={f}>
                    {f.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        {meta.fields.includes("pensionAmount") && (
          <Field label="Monthly Pension at 60 (₹)">
            <select
              className="form-input"
              value={form.pensionAmount}
              onChange={(e) => set("pensionAmount", e.target.value)}
            >
              <option value="">Select tier</option>
              {APY_PENSION_TIERS.map((t) => (
                <option key={t} value={t}>
                  ₹{t.toLocaleString("en-IN")}
                </option>
              ))}
            </select>
          </Field>
        )}
        {meta.fields.includes("coverageAmount") && (
          <Field label="Coverage Amount (₹)">
            <input
              className="form-input"
              type="number"
              value={form.coverageAmount}
              onChange={(e) => set("coverageAmount", e.target.value)}
              placeholder="e.g. 200000"
            />
          </Field>
        )}
        {meta.fields.includes("premium") && (
          <Field label="Annual Premium (₹)">
            <input
              className="form-input"
              type="number"
              value={form.premium}
              onChange={(e) => set("premium", e.target.value)}
              placeholder="e.g. 436"
            />
          </Field>
        )}
      </div>

      {warnings.length > 0 && (
        <div
          style={{
            background: `color-mix(in srgb, ${THEME.warning} 10%, transparent)`,
            border: `1px solid color-mix(in srgb, ${THEME.warning} 25%, transparent)`,
            borderRadius: 8,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 12,
            color: THEME.warning,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {warnings.map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
              <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      <ModalSection title="Additional Details" />
      <div style={g2}>
        <Field label="Nominee">
          <input
            className="form-input"
            value={form.nominee}
            onChange={(e) => set("nominee", e.target.value)}
            placeholder="Nominee name"
          />
        </Field>
        <Field label="Linked Bank">
          <input
            className="form-input"
            value={form.bankAccount}
            onChange={(e) => set("bankAccount", e.target.value)}
            placeholder="Bank name / branch"
          />
        </Field>
      </div>
      <Field label="Notes">
        <textarea
          className="form-input"
          rows={2}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Optional notes"
        />
      </Field>
      <ModalActions onSave={save} onClose={onClose} saveLabel="Save Scheme" disabled={saving} loading={saving} />
    </Modal>
  );
}

export function GovtSchemesTab({
  state,
  addItem,
  removeItem,
  updateItem,
  subTab,
  onSubTabChange,
  showToast,
}: any) {
  const schemes: any[] = state.govtSchemes || [];
  const [modal, setModal] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sub, setSub] = useState(subTab || "APY");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sync internal sub when parent drives subTab via sidebar click
  useEffect(() => {
    if (subTab) setSub(subTab);
  }, [subTab]);

  const handleSubChange = (newSub: string) => {
    setSub(newSub);
    onSubTabChange?.(newSub);
  };

  // Corpus excludes PM-KISAN's currentBalance, which tracks cumulative DBT
  // *received* (already-spent income), not a held asset.
  const totalCorpus = schemes
    .filter((sc) => sc.schemeType !== "PMKISAN")
    .reduce((s, sc) => s + Number(sc.currentBalance || 0), 0);

  // Annual Outflow = money the user pays INTO schemes: periodic contributions
  // (SSY/NSC/KVP/APY/etc, gated off for schemes whose form hides that field)
  // plus PMJJBY/PMSBY's dedicated Annual Premium — previously excluded here,
  // which silently understated this stat for anyone tracking insurance schemes.
  const totalOutflow = schemes.reduce((s, sc) => {
    const meta = SCHEME_MAP[sc.schemeType];
    if (meta?.hideContribution) {
      return s + Number(sc.premium || 0);
    }
    return s + annualizeContribution(Number(sc.contributionAmount || 0), sc.frequency || "annual");
  }, 0);

  // Annual Benefit = money schemes pay OUT to the user: PM-KISAN's fixed DBT
  // and the annualized interest payout for SCSS/POMIS/RBI Bond (which
  // disburse interest on a cycle rather than compounding it into the corpus).
  const totalBenefit = schemes.reduce((s, sc) => {
    if (sc.schemeType === "PMKISAN") return s + PMKISAN_ANNUAL_BENEFIT;
    const rule = SCHEME_RULES[sc.schemeType];
    if (rule?.growth === "payout") {
      return s + (Number(sc.currentBalance || 0) * Number(sc.interestRate || 0)) / 100;
    }
    return s;
  }, 0);

  const { run: save, loading: savingScheme } = useAsyncAction(
    async (data: any) => {
      if (data.id && schemes.find((s: any) => s.id === data.id)) {
        await updateItem("govtSchemes", data.id, data);
      } else {
        await addItem("govtSchemes", data);
      }
    },
    { onSuccess: () => setModal(null), onError: (e: any) => showToast?.(`Failed to save scheme: ${e?.message || "Unknown error"}`, "error") }
  );

  const { run: deleteScheme } = useAsyncAction(
    async (id: string) => { await removeItem("govtSchemes", id); },
    { onError: (e: any) => showToast?.(`Failed to delete scheme: ${e?.message || "Unknown error"}`, "error") }
  );

  const subs = SCHEMES.map((s) => ({
    id: s.value,
    label: s.label.split("—")[0].trim(),
    icon: SCHEME_ICONS[s.value] || Star,
    color: s.color,
    count: schemes.filter((sc: any) => sc.schemeType === s.value).length,
  }));

  const filteredSchemes = schemes.filter((sc: any) => sc.schemeType === sub);
  const activeMeta = SCHEME_MAP[sub] || SCHEMES[0];

  const getPillsForType = (type: string) => {
    switch (type) {
      case "APY":
        return [
          "Guaranteed Pension",
          "Govt Co-contribution",
          "Tax Benefits (80C)",
          "Maturity at 60",
        ];
      case "SSY":
        return ["Girl Child Welfare", "High Interest (8.2%)", "Tax Free (EEE)", "Maturity at 21"];
      case "PMJJBY":
        return [
          "Life Cover (₹2L)",
          "Low Premium (₹436/yr)",
          "Easy Enrollment",
          "Auto-debit Option",
        ];
      case "PMSBY":
        return [
          "Accident Cover (₹2L)",
          "Low Premium (₹20/yr)",
          "Disability Benefit",
          "Auto-debit Option",
        ];
      case "PMKISAN":
        return [
          "Income Support",
          "₹6000 Per Year",
          "Direct Benefit Transfer",
          "3 Equal Installments",
        ];
      case "SCSS":
        return [
          "Senior Citizens (60+)",
          "High Interest (8.2%)",
          "Quarterly Interest",
          "Tax Saving (80C)",
        ];
      default:
        return ["Guaranteed Returns", "Tax Benefits", "Maturity Tracking", "Secure Option"];
    }
  };

  return (
    <div className="tab-content-enter">
      <SectionTitle
        sub="APY, Sukanya Samriddhi, PMJJBY, PMSBY, SCSS, NSC, KVP and more"
        rightElement={
          <Button size="sm" onClick={() => setModal({ schemeType: sub })}>
            <Plus size={14} /> Add Scheme
          </Button>
        }
      >
        Government Schemes
      </SectionTitle>

      {/* Stats */}
      {schemes.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <StatCard
            label="Total Corpus"
            value={fmtINRFull(totalCorpus)}
            numericValue={totalCorpus}
            formatValue={fmtINRFull}
            icon={<IndianRupee size={18} />}
            color={THEME.success}
          />
          <StatCard
            label="Annual Outflow"
            value={fmtINRFull(totalOutflow)}
            numericValue={totalOutflow}
            formatValue={fmtINRFull}
            icon={<TrendingUp size={18} />}
            color={THEME.primary}
          />
          <StatCard
            label="Annual Benefit"
            value={fmtINRFull(totalBenefit)}
            numericValue={totalBenefit}
            formatValue={fmtINRFull}
            sub="PM-KISAN + payout schemes"
            icon={<Repeat size={18} />}
            color={THEME.violet}
          />
          <StatCard
            label="Schemes Active"
            value={schemes.length.toLocaleString("en-IN")}
            numericValue={schemes.length}
            formatValue={(n) => Math.round(n).toLocaleString("en-IN")}
            icon={<Shield size={18} />}
            color={THEME.gold}
          />
        </div>
      )}

      {/* Sub-tab navigation bar */}
      <div className="demat-portfolio-bar no-scrollbar" style={{ marginBottom: 24 }}>
        {subs.map((s) => {
          const Icon = s.icon;
          const active = sub === s.id;
          return (
            <button
              key={s.id}
              onClick={() => handleSubChange(s.id)}
              aria-pressed={active}
              className={`demat-portfolio-pill ${active ? "active" : ""}`}
              style={
                active
                  ? ({
                      background: `linear-gradient(135deg, ${s.color} 0%, color-mix(in srgb, ${s.color} 80%, black) 100%)`,
                      color: "#fff",
                      boxShadow: `0 4px 12px color-mix(in srgb, ${s.color} 35%, transparent)`,
                    } as React.CSSProperties)
                  : {}
              }
            >
              <Icon size={13} color={active ? "#fff" : undefined} />
              {s.label}
              {s.count > 0 && (
                <span
                  style={{
                    padding: "1px 6px",
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 800,
                    background: active
                      ? "color-mix(in srgb, #fff 25%, transparent)"
                      : `color-mix(in srgb, ${THEME.textMuted} 22%, transparent)`,
                    color: active ? "#fff" : THEME.textMuted,
                    marginLeft: 4,
                  }}
                >
                  {s.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content area */}
      {filteredSchemes.length === 0 ? (
        <EmptyState
          icon={activeMeta.value === "PMJJBY" || activeMeta.value === "PMSBY" ? Shield : Star}
          gradient={`linear-gradient(135deg, ${activeMeta.color} 0%, color-mix(in srgb, ${activeMeta.color} 70%, white) 100%)`}
          dotColor={activeMeta.color}
          title={`No ${activeMeta.label.split("—")[0].trim()} Tracked`}
          description={activeMeta.description}
          pills={getPillsForType(sub)}
          buttonLabel={`Add ${activeMeta.label.split("—")[0].trim()}`}
          onAdd={() => setModal({ schemeType: sub })}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredSchemes.map((sc: any) => {
            const meta = SCHEME_MAP[sc.schemeType] || {
              color: THEME.primary,
              label: sc.schemeType,
            };
            const isExpanded = expanded === sc.id;
            const maturityStatus = getMaturityStatus(sc.maturityDate);
            const projection = projectSchemeValue(sc);

            return (
              <Card key={sc.id} style={{ borderLeft: `4px solid ${meta.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: `color-mix(in srgb, ${meta.color} 15%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Star size={20} color={meta.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      {sc.schemeName || sc.schemeType}
                      {sc.memberName ? ` — ${sc.memberName}` : ""}
                    </div>
                    <div style={{ fontSize: 12, color: THEME.textMuted, marginTop: 2 }}>
                      {meta.label?.split("—")[0]?.trim() || sc.schemeType}
                      {sc.accountNumber ? ` · #${sc.accountNumber}` : ""}
                      {sc.nominee ? ` · Nominee: ${sc.nominee}` : ""}
                    </div>
                  </div>

                  {Number(sc.currentBalance) > 0 && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: 16, color: THEME.success }}>
                        <Money value={Number(sc.currentBalance)} variant="full" />
                      </div>
                      <div style={{ fontSize: 11, color: THEME.textMuted }}>
                        {meta.balanceCardLabel || "corpus"}
                      </div>
                    </div>
                  )}
                  {Number(sc.pensionAmount) > 0 && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>
                        <Money value={Number(sc.pensionAmount)} variant="full" />/mo
                      </div>
                      <div style={{ fontSize: 11, color: THEME.textMuted }}>pension</div>
                    </div>
                  )}
                  {Number(sc.coverageAmount) > 0 && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>
                        <Money value={Number(sc.coverageAmount)} variant="full" />
                      </div>
                      <div style={{ fontSize: 11, color: THEME.textMuted }}>coverage</div>
                    </div>
                  )}

                  {Number(sc.interestRate) > 0 && (
                    <Badge variant="sage">{sc.interestRate}% p.a.</Badge>
                  )}
                  {maturityStatus && (
                    <Badge
                      variant={
                        maturityStatus.urgency === "overdue"
                          ? "rust"
                          : maturityStatus.urgency === "soon"
                            ? "gold"
                            : "muted"
                      }
                    >
                      {maturityStatus.label}
                    </Badge>
                  )}

                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : sc.id)}
                      className="icon-btn"
                      aria-label={isExpanded ? "Collapse scheme details" : "Expand scheme details"}
                      aria-expanded={isExpanded}
                      title={isExpanded ? "Collapse" : "Expand"}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.textMuted,
                        padding: 6,
                      }}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                      onClick={() => setModal(sc)}
                      className="icon-btn"
                      aria-label="Edit scheme"
                      title="Edit"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.textMuted,
                        padding: 6,
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(sc.id)}
                      className="icon-btn danger"
                      aria-label="Delete scheme"
                      title="Delete"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.danger,
                        padding: 6,
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: `1px solid ${THEME.border}`,
                    }}
                  >
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                        gap: 10,
                        fontSize: 12,
                        color: THEME.textMuted,
                      }}
                    >
                      {sc.startDate && (
                        <div>
                          Start:{" "}
                          {new Date(`${sc.startDate}T00:00:00`).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      )}
                      {sc.maturityDate && (
                        <div>
                          Maturity:{" "}
                          {new Date(`${sc.maturityDate}T00:00:00`).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      )}
                      {Number(sc.contributionAmount) > 0 && (
                        <div>
                          Contribution: <Money value={Number(sc.contributionAmount)} variant="full" /> /{" "}
                          {sc.frequency?.replace("_", " ")}
                        </div>
                      )}
                      {Number(sc.premium) > 0 && (
                        <div>
                          Premium: <Money value={Number(sc.premium)} variant="full" />/yr
                        </div>
                      )}
                      {sc.bankAccount && <div>Bank: {sc.bankAccount}</div>}
                    </div>
                    {projection && (
                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          color: meta.color,
                        }}
                      >
                        <TrendingUp size={13} />
                        {projection.label}: <Money value={projection.value} variant="full" />
                        {projection.mode === "payout" && (
                          <span style={{ fontWeight: 400, color: THEME.textMuted }}>
                            (based on current balance)
                          </span>
                        )}
                      </div>
                    )}
                    {sc.notes && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 12,
                          fontStyle: "italic",
                          color: THEME.textMuted,
                        }}
                      >
                        {sc.notes}
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
        <SchemeForm
          initial={modal?.id ? modal : modal?.schemeType ? modal : undefined}
          onSave={save}
          onClose={() => setModal(null)}
          saving={savingScheme}
        />
      )}
      {confirmDeleteId && (
        <ConfirmDialog
          message="Delete this scheme?"
          onConfirm={() => {
            deleteScheme(confirmDeleteId);
            setConfirmDeleteId(null);
          }}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}
