// @ts-nocheck
import React, { useState } from "react";
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

const SCHEMES = [
  {
    value: "APY",
    label: "APY — Atal Pension Yojana",
    description: "Guaranteed pension of ₹1,000–5,000/month at 60. For unorganised sector workers.",
    color: "#2563eb",
    fields: ["pensionAmount"],
    hasBalance: false,
  },
  {
    value: "SSY",
    label: "SSY — Sukanya Samriddhi Yojana",
    description:
      "Tax-free savings scheme for girl child. 8.2% p.a. Matures at 21 years / marriage.",
    color: "#ec4899",
    fields: ["memberName", "interestRate"],
    hasBalance: true,
  },
  {
    value: "PMJJBY",
    label: "PMJJBY — Pradhan Mantri Jeevan Jyoti Bima",
    description: "Life insurance cover of ₹2 lakh. Annual premium ₹436.",
    color: "#059669",
    fields: ["coverageAmount", "premium"],
    hasBalance: false,
  },
  {
    value: "PMSBY",
    label: "PMSBY — Pradhan Mantri Suraksha Bima",
    description: "Accident insurance ₹2 lakh. Annual premium ₹20.",
    color: "#d97706",
    fields: ["coverageAmount", "premium"],
    hasBalance: false,
  },
  {
    value: "PMKISAN",
    label: "PM-KISAN — Kisan Samman Nidhi",
    description: "₹6,000/year in 3 instalments for eligible farmers.",
    color: "#16a34a",
    fields: [],
    hasBalance: false,
  },
  {
    value: "SCSS",
    label: "SCSS — Senior Citizen Savings Scheme",
    description: "Post office scheme for 60+. 8.2% p.a. quarterly payout.",
    color: "#7c3aed",
    fields: ["interestRate"],
    hasBalance: true,
  },
  {
    value: "NSC",
    label: "NSC — National Savings Certificate",
    description: "5-year post office scheme. 7.7% p.a. Qualifies for 80C deduction.",
    color: "#b45309",
    fields: ["interestRate"],
    hasBalance: true,
  },
  {
    value: "KVP",
    label: "KVP — Kisan Vikas Patra",
    description: "Investment doubles in ~115 months. 7.5% p.a.",
    color: "#0891b2",
    fields: ["interestRate"],
    hasBalance: true,
  },
  {
    value: "POST_MIS",
    label: "Post Office MIS — Monthly Income Scheme",
    description: "Monthly interest payout. 7.4% p.a. Max deposit ₹9L (single) / ₹15L (joint).",
    color: "#dc2626",
    fields: ["interestRate"],
    hasBalance: true,
  },
  {
    value: "RBI_BOND",
    label: "RBI Floating Rate Bond",
    description: "7-year bond. Floating rate (currently 8.05%). No premature withdrawal.",
    color: "#1d4ed8",
    fields: ["interestRate"],
    hasBalance: true,
  },
  {
    value: "NPS_LITE",
    label: "NPS Lite — Swavalamban",
    description: "NPS for unorganised sector. Govt co-contribution for eligible members.",
    color: "#0f766e",
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

function SchemeForm({ initial, onSave, onClose }: any) {
  const [form, setForm] = useState({ ...EMPTY, startDate: today(), ...initial });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const meta = SCHEME_MAP[form.schemeType] || SCHEMES[0];

  const save = () => {
    if (!form.schemeType) return;
    const name = form.schemeName || meta.label.split("—")[0].trim();
    onSave({ ...form, schemeName: name, id: initial?.id || uid() });
  };

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
          background: `${meta.color}12`,
          border: `1px solid ${meta.color}30`,
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
            {PROFILES.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.name}
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
          <Field label="Current Balance (₹)">
            <input
              className="form-input"
              type="number"
              value={form.currentBalance}
              onChange={(e) => set("currentBalance", e.target.value)}
              placeholder="Current corpus"
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
        {meta.fields.includes("pensionAmount") && (
          <Field label="Monthly Pension at 60 (₹)">
            <input
              className="form-input"
              type="number"
              value={form.pensionAmount}
              onChange={(e) => set("pensionAmount", e.target.value)}
              placeholder="e.g. 5000"
            />
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
      <ModalActions onSave={save} onClose={onClose} saveLabel="Save Scheme" />
    </Modal>
  );
}

export function GovtSchemesTab({ state, addItem, removeItem, updateItem }: any) {
  const schemes: any[] = state.govtSchemes || [];
  const [modal, setModal] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sub, setSub] = useState("APY");

  const totalCorpus = schemes.reduce((s, sc) => s + Number(sc.currentBalance || 0), 0);
  const totalContrib = schemes.reduce((s, sc) => {
    const freq = sc.frequency || "annual";
    const mult = { monthly: 12, quarterly: 4, annual: 1, one_time: 0 }[freq] || 1;
    return s + Number(sc.contributionAmount || 0) * mult;
  }, 0);

  const save = (data: any) => {
    if (data.id && schemes.find((s: any) => s.id === data.id)) {
      updateItem("govtSchemes", data.id, data);
    } else {
      addItem("govtSchemes", data);
    }
    setModal(null);
  };

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
            value={<Prv>{fmtINRFull(totalCorpus)}</Prv>}
            icon={<IndianRupee size={18} />}
            color={THEME.success}
          />
          <StatCard
            label="Annual Contribution"
            value={<Prv>{fmtINRFull(totalContrib)}</Prv>}
            icon={<TrendingUp size={18} />}
            color={THEME.primary}
          />
          <StatCard
            label="Schemes Active"
            value={schemes.length}
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
              onClick={() => setSub(s.id)}
              className={`demat-portfolio-pill ${active ? "active" : ""}`}
              style={
                active
                  ? ({
                      "--active-color": s.color,
                      "--active-border": `${s.color}40`,
                      "--active-bg": `${s.color}15`,
                    } as React.CSSProperties)
                  : {}
              }
            >
              <Icon size={13} color={active ? s.color : undefined} />
              {s.label}
              {s.count > 0 && (
                <span
                  style={{
                    padding: "1px 6px",
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 800,
                    background: active ? `${s.color}22` : `${THEME.textMuted}22`,
                    color: active ? s.color : THEME.textMuted,
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
        <>
          <EmptyState
            icon={activeMeta.value === "PMJJBY" || activeMeta.value === "PMSBY" ? Shield : Star}
            gradient={`linear-gradient(135deg, ${activeMeta.color} 0%, ${activeMeta.color}b3 100%)`}
            dotColor={activeMeta.color}
            title={`No ${activeMeta.label.split("—")[0].trim()} Tracked`}
            description={activeMeta.description}
            pills={getPillsForType(sub)}
            buttonLabel={`Add ${activeMeta.label.split("—")[0].trim()}`}
            onAdd={() => setModal({ schemeType: sub })}
          />

          {/* Discovery Card Grid for all schemes */}
          <div style={{ marginTop: 32 }}>
            <div
              style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, color: THEME.textMuted }}
            >
              Popular Government Schemes
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 10,
              }}
            >
              {SCHEMES.map((s) => (
                <Card
                  key={s.value}
                  style={{
                    borderLeft: `4px solid ${s.color}`,
                    cursor: "pointer",
                    background: s.value === sub ? "var(--surface-1)" : undefined,
                  }}
                  onClick={() => {
                    setSub(s.value);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: 13, color: s.color }}>
                      {s.label.split("—")[0].trim()}
                    </div>
                    {schemes.filter((sc: any) => sc.schemeType === s.value).length > 0 && (
                      <Badge color="success">
                        {schemes.filter((sc: any) => sc.schemeType === s.value).length} active
                      </Badge>
                    )}
                  </div>
                  <div
                    style={{ fontSize: 12, color: THEME.textMuted, marginTop: 4, lineHeight: 1.5 }}
                  >
                    {s.description}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setModal({ schemeType: s.value });
                      }}
                    >
                      + Add
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filteredSchemes.map((sc: any) => {
            const meta = SCHEME_MAP[sc.schemeType] || {
              color: THEME.primary,
              label: sc.schemeType,
            };
            const isExpanded = expanded === sc.id;

            return (
              <Card key={sc.id} style={{ borderLeft: `4px solid ${meta.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: `${meta.color}18`,
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
                        <Prv>{fmtINRFull(Number(sc.currentBalance))}</Prv>
                      </div>
                      <div style={{ fontSize: 11, color: THEME.textMuted }}>corpus</div>
                    </div>
                  )}
                  {Number(sc.pensionAmount) > 0 && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>
                        <Prv>{fmtINRFull(Number(sc.pensionAmount))}/mo</Prv>
                      </div>
                      <div style={{ fontSize: 11, color: THEME.textMuted }}>pension</div>
                    </div>
                  )}
                  {Number(sc.coverageAmount) > 0 && (
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>
                        <Prv>{fmtINRFull(Number(sc.coverageAmount))}</Prv>
                      </div>
                      <div style={{ fontSize: 11, color: THEME.textMuted }}>coverage</div>
                    </div>
                  )}

                  {Number(sc.interestRate) > 0 && (
                    <Badge color="success">{sc.interestRate}% p.a.</Badge>
                  )}

                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : sc.id)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.textMuted,
                      }}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                      onClick={() => setModal(sc)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.textMuted,
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete this scheme?`)) removeItem("govtSchemes", sc.id);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.danger,
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
                          {new Date(sc.startDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      )}
                      {sc.maturityDate && (
                        <div>
                          Maturity:{" "}
                          {new Date(sc.maturityDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      )}
                      {Number(sc.contributionAmount) > 0 && (
                        <div>
                          Contribution: <Prv>{fmtINRFull(Number(sc.contributionAmount))}</Prv> /{" "}
                          {sc.frequency?.replace("_", " ")}
                        </div>
                      )}
                      {Number(sc.premium) > 0 && (
                        <div>
                          Premium: <Prv>{fmtINRFull(Number(sc.premium))}/yr</Prv>
                        </div>
                      )}
                      {sc.bankAccount && <div>Bank: {sc.bankAccount}</div>}
                    </div>
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
        />
      )}
    </div>
  );
}
