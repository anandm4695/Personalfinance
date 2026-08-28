// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import {
  Shield,
  ShieldCheck,
  Plus,
  Trash2,
  Pencil,
  TrendingUp,
  Users,
  IndianRupee,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Sparkles,
  Coins,
  Briefcase,
  FileText,
  Activity,
  Repeat,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  ArrowUpRight,
  Calculator,
  LayoutGrid,
  Table as TableIcon,
  HelpCircle,
  Heart,
  Landmark,
  Wallet,
  CheckCircle2,
  Info,
  Sliders,
  Award,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import { THEME } from "../../utils/constants";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { fmtINR, fmtINRFull, uid, today, exportArrayToCSV } from "../../utils/finance";
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
  calculateSSYProjection,
  calculateSCSSProjection,
  calculatePOMISProjection,
  calculateCompoundingScheme,
  APY_CONTRIBUTION_TABLE,
} from "../../utils/govtSchemes";

// Master Schemes definition with enhanced metadata, branding colors, and tax benefits
const SCHEMES = [
  {
    value: "APY",
    label: "APY — Atal Pension Yojana",
    shortLabel: "APY",
    category: "pension",
    description: "Guaranteed monthly pension of ₹1,000–₹5,000 at age 60 for unorganised sector workers.",
    color: THEME.accent,
    icon: Users,
    fields: ["pensionAmount"],
    hasBalance: false,
    officialRate: 8.0,
    tenure: "Until age 60",
    taxBadge: "Section 80CCD(1B)",
    payoutType: "Guaranteed Pension at 60",
    eligibility: "Indian citizens aged 18–40",
  },
  {
    value: "SSY",
    label: "SSY — Sukanya Samriddhi Yojana",
    shortLabel: "SSY",
    category: "child",
    description: "Highest sovereign return scheme for girl child with complete triple tax-exempt (EEE) status.",
    color: THEME.pink,
    icon: Heart,
    fields: ["memberName", "interestRate"],
    hasBalance: true,
    officialRate: 8.2,
    tenure: "21 Years (15y deposit)",
    taxBadge: "Section 80C · EEE Tax-Free",
    payoutType: "Compounding at Maturity",
    eligibility: "Parents of girl child aged < 10 years",
  },
  {
    value: "PMJJBY",
    label: "PMJJBY — Pradhan Mantri Jeevan Jyoti Bima",
    shortLabel: "PMJJBY",
    category: "insurance",
    description: "Low-cost renewable term life insurance cover of ₹2 Lakh for any cause of death.",
    color: THEME.sage,
    icon: ShieldCheck,
    fields: ["coverageAmount", "premium"],
    hasBalance: false,
    hideContribution: true,
    officialRate: 0,
    tenure: "Annual Renewable (1 Year)",
    taxBadge: "Section 80C / 10(10D)",
    payoutType: "Life Cover (₹2 Lakh)",
    eligibility: "Bank savings account holders aged 18–50",
  },
  {
    value: "PMSBY",
    label: "PMSBY — Pradhan Mantri Suraksha Bima",
    shortLabel: "PMSBY",
    category: "insurance",
    description: "Accidental death and total permanent disability cover of ₹2 Lakh for just ₹20/year.",
    color: THEME.gold,
    icon: Shield,
    fields: ["coverageAmount", "premium"],
    hasBalance: false,
    hideContribution: true,
    officialRate: 0,
    tenure: "Annual Renewable (1 Year)",
    taxBadge: "Section 80C / 10(10D)",
    payoutType: "Accident Cover (₹2 Lakh)",
    eligibility: "Bank savings account holders aged 18–70",
  },
  {
    value: "PMKISAN",
    label: "PM-KISAN — Kisan Samman Nidhi",
    shortLabel: "PM-KISAN",
    category: "dbt",
    description: "Direct income support of ₹6,000/year paid in 3 equal four-monthly instalments of ₹2,000.",
    color: THEME.cyan,
    icon: TrendingUp,
    fields: [],
    hasBalance: true,
    hideContribution: true,
    balanceLabel: "Total Amount Received (₹)",
    balancePlaceholder: "Sum of instalments received to date",
    balanceCardLabel: "total received",
    officialRate: 0,
    tenure: "Ongoing DBT",
    taxBadge: "Direct Benefit Transfer",
    payoutType: "₹6,000/yr (3 Instalments)",
    eligibility: "Landholding farmer families",
  },
  {
    value: "SCSS",
    label: "SCSS — Senior Citizen Savings Scheme",
    shortLabel: "SCSS",
    category: "fixed_income",
    description: "Safe quarterly interest payout scheme for senior citizens offering high guaranteed yield.",
    color: THEME.violet,
    icon: Landmark,
    fields: ["interestRate"],
    hasBalance: true,
    officialRate: 8.2,
    tenure: "5 Years (Extendable by 3y)",
    taxBadge: "Section 80C (Deposit)",
    payoutType: "Quarterly Interest Payout",
    eligibility: "Individuals aged 60+ (55+ for VRS retirees)",
  },
  {
    value: "NSC",
    label: "NSC — National Savings Certificate",
    shortLabel: "NSC",
    category: "fixed_income",
    description: "Post office backed 5-year fixed savings instrument with guaranteed annual compounding.",
    color: THEME.rust,
    icon: FileText,
    fields: ["interestRate"],
    hasBalance: true,
    officialRate: 7.7,
    tenure: "5 Years Fixed",
    taxBadge: "Section 80C Deduction",
    payoutType: "Compounding at Maturity",
    eligibility: "All Indian Resident Individuals",
  },
  {
    value: "KVP",
    label: "KVP — Kisan Vikas Patra",
    shortLabel: "KVP",
    category: "fixed_income",
    description: "Guaranteed doubling certificate scheme maturing in approximately 115 months (9.6 years).",
    color: THEME.gold,
    icon: Coins,
    fields: ["interestRate"],
    hasBalance: true,
    officialRate: 7.5,
    tenure: "115 Months (~9.6 Years)",
    taxBadge: "Taxable as per Slab",
    payoutType: "Doubles Corpus at Maturity",
    eligibility: "All Indian Resident Individuals",
  },
  {
    value: "POST_MIS",
    label: "Post Office MIS — Monthly Income Scheme",
    shortLabel: "POMIS",
    category: "fixed_income",
    description: "Regular predictable monthly income scheme with sovereign safety. Max deposit ₹9L (single) / ₹15L (joint).",
    color: THEME.accent,
    icon: Wallet,
    fields: ["interestRate"],
    hasBalance: true,
    officialRate: 7.4,
    tenure: "5 Years Fixed",
    taxBadge: "Monthly Interest Taxable",
    payoutType: "Monthly Interest Payout",
    eligibility: "All Indian Residents (Single/Joint)",
  },
  {
    value: "RBI_BOND",
    label: "RBI Floating Rate Savings Bond",
    shortLabel: "RBI Bond",
    category: "fixed_income",
    description: "7-year sovereign bond with semi-annual payout linked to NSC benchmark + 0.35% spread.",
    color: THEME.cyan,
    icon: Landmark,
    fields: ["interestRate"],
    hasBalance: true,
    officialRate: 8.05,
    tenure: "7 Years Fixed",
    taxBadge: "Taxable (TDS applies)",
    payoutType: "Half-Yearly Payout",
    eligibility: "Citizens of India & HUFs",
  },
  {
    value: "NPS_LITE",
    label: "NPS Lite — Swavalamban",
    shortLabel: "NPS Lite",
    category: "pension",
    description: "Low-cost micro pension model for unorganised sector workers with market-linked returns.",
    color: THEME.sage,
    icon: Briefcase,
    fields: ["interestRate"],
    hasBalance: true,
    officialRate: 9.5,
    tenure: "Until age 60",
    taxBadge: "Section 80CCD(1B)",
    payoutType: "Pension Wealth Accumulation",
    eligibility: "Economically disadvantaged groups",
  },
];

const SCHEME_MAP = Object.fromEntries(SCHEMES.map((s) => [s.value, s]));

// Categories for unified filter tab
const CATEGORIES = [
  { id: "ALL", label: "All Schemes", icon: Sparkles },
  { id: "pension", label: "Pension & Retirement", icon: Users },
  { id: "child", label: "Girl Child & Family", icon: Heart },
  { id: "fixed_income", label: "Guaranteed Savings & Payouts", icon: Landmark },
  { id: "insurance", label: "Govt Insurance", icon: ShieldCheck },
  { id: "dbt", label: "Direct Benefit (DBT)", icon: TrendingUp },
];

const EMPTY_FORM: any = {
  schemeType: "SSY",
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

// ─── MODAL SCHEME FORM WITH REAL-TIME PREVIEW ───────────────────────────────
function SchemeForm({ initial, onSave, onClose, saving = false }: any) {
  const { familyProfiles } = useMasterData();
  const [form, setForm] = useState({ ...EMPTY_FORM, startDate: today(), ...initial });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  const meta = SCHEME_MAP[form.schemeType] || SCHEMES[0];
  const isNew = !initial?.id;

  // Auto-fill official rate and defaults on scheme type switch for a fresh entry
  useEffect(() => {
    if (!isNew) return;
    const rule = SCHEME_RULES[form.schemeType];
    if (rule?.defaultPremium && !form.premium) {
      set("premium", String(rule.defaultPremium));
    }
    if (rule?.officialRate && !form.interestRate) {
      set("interestRate", String(rule.officialRate));
    }
    if (form.schemeType === "PMJJBY" || form.schemeType === "PMSBY") {
      if (!form.coverageAmount) set("coverageAmount", "200000");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.schemeType]);

  const save = () => {
    if (!form.schemeType) return;
    const name = form.schemeName || meta.label.split("—")[0].trim();
    onSave({ ...form, schemeName: name, id: initial?.id || uid() });
  };

  const warnings = getSchemeWarnings(form);
  const projection = projectSchemeValue(form);

  const g2: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 16,
    marginBottom: 16,
  };

  return (
    <Modal
      title={initial?.id ? `Edit ${meta.shortLabel} Holding` : "Track Government Scheme"}
      onClose={onClose}
      maxWidth={680}
    >
      {/* Scheme Type Selector Pill Grid */}
      <Field label="Select Government Scheme *">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(135px, 1fr))",
            gap: 8,
            marginBottom: 12,
          }}
        >
          {SCHEMES.map((s) => {
            const isSelected = form.schemeType === s.value;
            const Icon = s.icon;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => {
                  set("schemeType", s.value);
                  if (isNew && s.officialRate > 0) {
                    set("interestRate", String(s.officialRate));
                  }
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: "var(--radius-md)",
                  border: isSelected
                    ? `2px solid ${s.color}`
                    : "1px solid var(--t-line)",
                  background: isSelected
                    ? `color-mix(in srgb, ${s.color} 12%, var(--surface-0))`
                    : "var(--surface-0)",
                  color: isSelected ? s.color : "var(--t-ink)",
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "var(--t-transition)",
                }}
              >
                <Icon size={16} color={s.color} style={{ flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </Field>

      {/* Scheme Info & Yield Preview Banner */}
      <div
        style={{
          background: `color-mix(in srgb, ${meta.color} 8%, var(--surface-0))`,
          border: `1px solid color-mix(in srgb, ${meta.color} 25%, transparent)`,
          borderRadius: "var(--radius-md)",
          padding: "12px 16px",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: "var(--radius-full)",
                background: `color-mix(in srgb, ${meta.color} 20%, transparent)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: meta.color,
              }}
            >
              <meta.icon size={13} />
            </span>
            <span style={{ fontWeight: 700, fontSize: 13, color: meta.color }}>
              {meta.label}
            </span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {meta.officialRate > 0 && (
              <Badge variant="sage">{meta.officialRate}% p.a. Current Rate</Badge>
            )}
            <Badge variant="muted">{meta.taxBadge}</Badge>
          </div>
        </div>
        <p style={{ fontSize: 12, color: THEME.textMuted, marginTop: 6, marginBottom: 0, lineHeight: 1.5 }}>
          {meta.description}
        </p>

        {/* Live Calculation Preview Banner */}
        {projection && (
          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: `1px dashed color-mix(in srgb, ${meta.color} 30%, transparent)`,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 13,
              fontWeight: 700,
              color: meta.color,
            }}
          >
            <TrendingUp size={16} />
            <span>
              Estimated {projection.label}: <Money value={projection.value} variant="full" />
            </span>
          </div>
        )}
      </div>

      <ModalSection title="Account & Ownership" />
      <div style={g2}>
        <Field label="Custom Display Label">
          <input
            className="form-input"
            value={form.schemeName}
            onChange={(e) => set("schemeName", e.target.value)}
            placeholder={`e.g. My ${meta.shortLabel} Account`}
          />
        </Field>
        {meta.fields.includes("memberName") && (
          <Field label="Beneficiary / Girl Child Name *">
            <input
              className="form-input"
              value={form.memberName}
              onChange={(e) => set("memberName", e.target.value)}
              placeholder="e.g. Daughter's Name"
            />
          </Field>
        )}
        <Field label="Account / Certificate Number">
          <input
            className="form-input"
            value={form.accountNumber}
            onChange={(e) => set("accountNumber", e.target.value)}
            placeholder="Scheme / PRAN / Passbook Number"
          />
        </Field>
        <Field label="Account Holder / Profile *">
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

      <ModalSection title="Financials & Balances" />
      <div style={g2}>
        {meta.hasBalance && (
          <Field label={meta.balanceLabel || "Current Corpus / Invested Amount (₹) *"}>
            <input
              className="form-input"
              type="number"
              value={form.currentBalance}
              onChange={(e) => set("currentBalance", e.target.value)}
              placeholder={meta.balancePlaceholder || "Current balance in ₹"}
            />
          </Field>
        )}
        {meta.fields.includes("interestRate") && (
          <Field label="Interest Rate (% p.a.) *">
            <input
              className="form-input"
              type="number"
              step="0.01"
              value={form.interestRate}
              onChange={(e) => set("interestRate", e.target.value)}
              placeholder={`Official rate: ${meta.officialRate}%`}
            />
          </Field>
        )}
        {!meta.hideContribution && (
          <>
            <Field label="Contribution / Instalment (₹)">
              <input
                className="form-input"
                type="number"
                value={form.contributionAmount}
                onChange={(e) => set("contributionAmount", e.target.value)}
                placeholder="Amount per instalment"
              />
            </Field>
            <Field label="Deposit Frequency">
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
          <Field label="Guaranteed Monthly Pension at 60 (₹) *">
            <select
              className="form-input"
              value={form.pensionAmount}
              onChange={(e) => set("pensionAmount", e.target.value)}
            >
              <option value="">Select Monthly Pension Tier</option>
              {APY_PENSION_TIERS.map((t) => (
                <option key={t} value={t}>
                  ₹{t.toLocaleString("en-IN")} / month
                </option>
              ))}
            </select>
          </Field>
        )}
        {meta.fields.includes("coverageAmount") && (
          <Field label="Life / Accidental Cover Amount (₹)">
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
          <Field label="Annual Premium (₹) *">
            <input
              className="form-input"
              type="number"
              value={form.premium}
              onChange={(e) => set("premium", e.target.value)}
              placeholder="Official premium in ₹"
            />
          </Field>
        )}
      </div>

      <ModalSection title="Timeline & Maturity" />
      <div style={g2}>
        <Field label="Account Start Date">
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

      {warnings.length > 0 && (
        <div
          style={{
            background: `color-mix(in srgb, ${THEME.warning} 10%, transparent)`,
            border: `1px solid color-mix(in srgb, ${THEME.warning} 25%, transparent)`,
            borderRadius: "var(--radius-md)",
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 12,
            color: THEME.warning,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {warnings.map((w, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      <ModalSection title="Bank & Nominee" />
      <div style={g2}>
        <Field label="Nominee Name">
          <input
            className="form-input"
            value={form.nominee}
            onChange={(e) => set("nominee", e.target.value)}
            placeholder="Registered nominee"
          />
        </Field>
        <Field label="Post Office / Bank Branch">
          <input
            className="form-input"
            value={form.bankAccount}
            onChange={(e) => set("bankAccount", e.target.value)}
            placeholder="e.g. SBI Main Branch / Head Post Office"
          />
        </Field>
      </div>
      <Field label="Notes & Folio Details">
        <textarea
          className="form-input"
          rows={2}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Add any reminders, certificate serials, or special remarks..."
        />
      </Field>

      <ModalActions
        onSave={save}
        onClose={onClose}
        saveLabel={initial?.id ? "Update Scheme" : "Save to Portfolio"}
        disabled={saving}
        loading={saving}
      />
    </Modal>
  );
}

// ─── LIVE INTERACTIVE GOVERNMENT SCHEMES CALCULATOR ─────────────────────────
function SchemeCalculator({ onSelectScheme }: { onSelectScheme: (scheme: string) => void }) {
  const [calcType, setCalcType] = useState<"SSY" | "SCSS" | "POST_MIS" | "NSC" | "APY">("SSY");

  // SSY States
  const [ssyYearly, setSsyYearly] = useState(150000);
  const [ssyRate, setSsyRate] = useState(8.2);

  // SCSS States
  const [scssDeposit, setScssDeposit] = useState(1500000);
  const [scssRate, setScssRate] = useState(8.2);

  // POMIS States
  const [pomisDeposit, setPomisDeposit] = useState(900000);
  const [pomisRate, setPomisRate] = useState(7.4);

  // NSC States
  const [nscDeposit, setNscDeposit] = useState(500000);
  const [nscRate, setNscRate] = useState(7.7);
  const [nscYears, setNscYears] = useState(5);

  // APY States
  const [apyAge, setApyAge] = useState(25);
  const [apyTarget, setApyTarget] = useState(5000);

  const ssyResult = useMemo(() => calculateSSYProjection(ssyYearly, ssyRate), [ssyYearly, ssyRate]);
  const scssResult = useMemo(() => calculateSCSSProjection(scssDeposit, scssRate), [scssDeposit, scssRate]);
  const pomisResult = useMemo(() => calculatePOMISProjection(pomisDeposit, pomisRate), [pomisDeposit, pomisRate]);
  const nscResult = useMemo(
    () => calculateCompoundingScheme(nscDeposit, nscRate, nscYears),
    [nscDeposit, nscRate, nscYears]
  );

  const apyMonthly = useMemo(() => {
    const ageLookup = [18, 25, 30, 35, 40].reduce((prev, curr) =>
      Math.abs(curr - apyAge) < Math.abs(prev - apyAge) ? curr : prev
    );
    return APY_CONTRIBUTION_TABLE[ageLookup]?.[apyTarget] || 210;
  }, [apyAge, apyTarget]);

  return (
    <Card style={{ padding: 24, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "var(--radius-md)",
              background: `color-mix(in srgb, ${THEME.primary} 15%, transparent)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: THEME.primary,
            }}
          >
            <Calculator size={20} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Live Government Schemes Simulator & Returns Estimator
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: THEME.textMuted }}>
              Model projected maturity corpus, quarterly interest cash flows, and pension contribution tiers.
            </p>
          </div>
        </div>

        {/* Calculator Scheme Switcher */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[
            { id: "SSY", label: "SSY (Sukanya)", icon: Heart, color: THEME.pink },
            { id: "SCSS", label: "SCSS (Quarterly)", icon: Landmark, color: THEME.violet },
            { id: "POST_MIS", label: "POMIS (Monthly)", icon: Wallet, color: THEME.accent },
            { id: "NSC", label: "NSC / KVP", icon: FileText, color: THEME.rust },
            { id: "APY", label: "APY Pension", icon: Users, color: THEME.sage },
          ].map((t) => {
            const active = calcType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setCalcType(t.id as any)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "var(--radius-full)",
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  border: active ? `1px solid ${t.color}` : "1px solid var(--t-line)",
                  background: active ? `color-mix(in srgb, ${t.color} 15%, transparent)` : "var(--surface-1)",
                  color: active ? t.color : "var(--t-muted)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "var(--t-transition)",
                }}
              >
                <t.icon size={13} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Calculator Content */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 24,
          alignItems: "center",
          background: "var(--surface-1)",
          padding: 20,
          borderRadius: "var(--radius-lg)",
        }}
      >
        {/* Controls Column */}
        <div>
          {calcType === "SSY" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>Annual Deposit Amount</span>
                  <span style={{ fontWeight: 700, color: THEME.pink }}>{fmtINRFull(ssyYearly)} / yr</span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={150000}
                  step={1000}
                  value={ssyYearly}
                  onChange={(e) => setSsyYearly(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.pink }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.textMuted }}>
                  <span>₹1,000</span>
                  <span>Max ₹1.5 Lakh / yr (80C)</span>
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>Interest Rate (% p.a.)</span>
                  <span style={{ fontWeight: 700 }}>{ssyRate}%</span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={ssyRate}
                  onChange={(e) => setSsyRate(Number(e.target.value))}
                  className="form-input"
                />
              </div>
            </div>
          )}

          {calcType === "SCSS" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>One-time Deposit (Lump sum)</span>
                  <span style={{ fontWeight: 700, color: THEME.violet }}>{fmtINRFull(scssDeposit)}</span>
                </div>
                <input
                  type="range"
                  min={10000}
                  max={3000000}
                  step={10000}
                  value={scssDeposit}
                  onChange={(e) => setScssDeposit(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.violet }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.textMuted }}>
                  <span>₹10,000</span>
                  <span>Max ₹30 Lakh cap</span>
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>Interest Rate (% p.a.)</span>
                  <span style={{ fontWeight: 700 }}>{scssRate}%</span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={scssRate}
                  onChange={(e) => setScssRate(Number(e.target.value))}
                  className="form-input"
                />
              </div>
            </div>
          )}

          {calcType === "POST_MIS" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>Deposit Amount</span>
                  <span style={{ fontWeight: 700, color: THEME.accent }}>{fmtINRFull(pomisDeposit)}</span>
                </div>
                <input
                  type="range"
                  min={10000}
                  max={1500000}
                  step={10000}
                  value={pomisDeposit}
                  onChange={(e) => setPomisDeposit(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.accent }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.textMuted }}>
                  <span>₹10,000</span>
                  <span>Single: ₹9L | Joint: ₹15L</span>
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>Interest Rate (% p.a.)</span>
                  <span style={{ fontWeight: 700 }}>{pomisRate}%</span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={pomisRate}
                  onChange={(e) => setPomisRate(Number(e.target.value))}
                  className="form-input"
                />
              </div>
            </div>
          )}

          {calcType === "NSC" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>Principal Deposit</span>
                  <span style={{ fontWeight: 700, color: THEME.rust }}>{fmtINRFull(nscDeposit)}</span>
                </div>
                <input
                  type="range"
                  min={5000}
                  max={2000000}
                  step={5000}
                  value={nscDeposit}
                  onChange={(e) => setNscDeposit(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.rust }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Rate (% p.a.)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={nscRate}
                    onChange={(e) => setNscRate(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Tenure (Years)</label>
                  <input
                    type="number"
                    value={nscYears}
                    onChange={(e) => setNscYears(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
              </div>
            </div>
          )}

          {calcType === "APY" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 4 }}>
                  <span>Current Age (Entry Age)</span>
                  <span style={{ fontWeight: 700, color: THEME.sage }}>{apyAge} Years</span>
                </div>
                <input
                  type="range"
                  min={18}
                  max={40}
                  step={1}
                  value={apyAge}
                  onChange={(e) => setApyAge(Number(e.target.value))}
                  style={{ width: "100%", accentColor: THEME.sage }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.textMuted }}>
                  <span>Min: 18 years</span>
                  <span>Max entry: 40 years</span>
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                  Desired Monthly Pension at 60
                </label>
                <select
                  value={apyTarget}
                  onChange={(e) => setApyTarget(Number(e.target.value))}
                  className="form-input"
                >
                  {APY_PENSION_TIERS.map((t) => (
                    <option key={t} value={t}>
                      ₹{t.toLocaleString("en-IN")} / month
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Results Summary Box */}
        <div
          style={{
            background: "var(--surface-0)",
            padding: 20,
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--t-line)",
          }}
        >
          {calcType === "SSY" && (
            <div>
              <div style={{ fontSize: 12, color: THEME.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Projected Maturity at 21 Years (EEE Tax-Free)
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: THEME.pink,
                  fontFamily: "var(--font-display)",
                  margin: "8px 0 16px 0",
                }}
              >
                {fmtINRFull(ssyResult.maturityAmount)}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--t-line)", fontSize: 13 }}>
                <span style={{ color: THEME.textMuted }}>Total Invested (15 yrs):</span>
                <span style={{ fontWeight: 600 }}>{fmtINRFull(ssyResult.totalInvested)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                <span style={{ color: THEME.textMuted }}>Total Compound Interest:</span>
                <span style={{ fontWeight: 700, color: THEME.success }}>+{fmtINRFull(ssyResult.totalInterest)}</span>
              </div>
            </div>
          )}

          {calcType === "SCSS" && (
            <div>
              <div style={{ fontSize: 12, color: THEME.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Quarterly Passive Payout (Every 3 Months)
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: THEME.violet,
                  fontFamily: "var(--font-display)",
                  margin: "8px 0 16px 0",
                }}
              >
                {fmtINRFull(scssResult.quarterlyPayout)}
                <span style={{ fontSize: 14, fontWeight: 500, color: THEME.textMuted }}>/qtr</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--t-line)", fontSize: 13 }}>
                <span style={{ color: THEME.textMuted }}>Annual Regular Income:</span>
                <span style={{ fontWeight: 600 }}>{fmtINRFull(scssResult.annualIncome)} / yr</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                <span style={{ color: THEME.textMuted }}>Total 5-Year Interest Payout:</span>
                <span style={{ fontWeight: 700, color: THEME.success }}>{fmtINRFull(scssResult.total5YearInterest)}</span>
              </div>
            </div>
          )}

          {calcType === "POST_MIS" && (
            <div>
              <div style={{ fontSize: 12, color: THEME.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Guaranteed Monthly Pension / Income
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: THEME.accent,
                  fontFamily: "var(--font-display)",
                  margin: "8px 0 16px 0",
                }}
              >
                {fmtINRFull(pomisResult.monthlyPayout)}
                <span style={{ fontSize: 14, fontWeight: 500, color: THEME.textMuted }}>/month</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--t-line)", fontSize: 13 }}>
                <span style={{ color: THEME.textMuted }}>Annual Income Generated:</span>
                <span style={{ fontWeight: 600 }}>{fmtINRFull(pomisResult.annualIncome)} / yr</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                <span style={{ color: THEME.textMuted }}>Principal Returned at 5y:</span>
                <span style={{ fontWeight: 700 }}>{fmtINRFull(pomisDeposit)}</span>
              </div>
            </div>
          )}

          {calcType === "NSC" && (
            <div>
              <div style={{ fontSize: 12, color: THEME.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Maturity Value at {nscYears} Years
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: THEME.rust,
                  fontFamily: "var(--font-display)",
                  margin: "8px 0 16px 0",
                }}
              >
                {fmtINRFull(nscResult.maturityAmount)}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--t-line)", fontSize: 13 }}>
                <span style={{ color: THEME.textMuted }}>Principal Deposit:</span>
                <span style={{ fontWeight: 600 }}>{fmtINRFull(nscDeposit)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                <span style={{ color: THEME.textMuted }}>Guaranteed Interest Growth:</span>
                <span style={{ fontWeight: 700, color: THEME.success }}>+{fmtINRFull(nscResult.totalInterest)}</span>
              </div>
            </div>
          )}

          {calcType === "APY" && (
            <div>
              <div style={{ fontSize: 12, color: THEME.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                Required Monthly Contribution
              </div>
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: THEME.sage,
                  fontFamily: "var(--font-display)",
                  margin: "8px 0 16px 0",
                }}
              >
                {fmtINRFull(apyMonthly)}
                <span style={{ fontSize: 14, fontWeight: 500, color: THEME.textMuted }}>/mo</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--t-line)", fontSize: 13 }}>
                <span style={{ color: THEME.textMuted }}>Guaranteed Pension at 60:</span>
                <span style={{ fontWeight: 700, color: THEME.sage }}>{fmtINRFull(apyTarget)} / mo for life</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
                <span style={{ color: THEME.textMuted }}>Nominee Return on Death:</span>
                <span style={{ fontWeight: 600 }}>Up to ₹8.5 Lakhs</span>
              </div>
            </div>
          )}

          <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
            <Button
              size="sm"
              onClick={() => onSelectScheme(calcType)}
            >
              <Plus size={13} /> Track this Scheme
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── OFFICIAL RATES & DIRECTORY EXPLORER ─────────────────────────────────────
function SchemeRatesDirectory({ onTrackScheme }: { onTrackScheme: (scheme: any) => void }) {
  return (
    <Card style={{ padding: 24, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Award size={20} color={THEME.gold} />
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              Official Government Schemes Catalog & Current Benchmark Rates (FY 2024–26)
            </h3>
            <p style={{ margin: 0, fontSize: 12, color: THEME.textMuted }}>
              Published interest rates and statutory terms notified by the Ministry of Finance & PFRDA.
            </p>
          </div>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="app-table" style={{ width: "100%", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--surface-1)", textAlign: "left" }}>
              <th style={{ padding: "10px 14px" }}>Scheme Name</th>
              <th style={{ padding: "10px 14px" }}>Category</th>
              <th style={{ padding: "10px 14px" }}>Current Rate / Return</th>
              <th style={{ padding: "10px 14px" }}>Tenure / Lock-in</th>
              <th style={{ padding: "10px 14px" }}>Tax Benefit</th>
              <th style={{ padding: "10px 14px" }}>Eligibility / Limits</th>
              <th style={{ padding: "10px 14px", textAlign: "right" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {SCHEMES.map((s) => {
              const Icon = s.icon;
              return (
                <tr key={s.value} style={{ borderBottom: "1px solid var(--t-line)" }}>
                  <td style={{ padding: "12px 14px", fontWeight: 600 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "var(--radius-sm)",
                          background: `color-mix(in srgb, ${s.color} 15%, transparent)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: s.color,
                        }}
                      >
                        <Icon size={15} />
                      </span>
                      <div>
                        <div>{s.shortLabel}</div>
                        <div style={{ fontSize: 11, color: THEME.textMuted, fontWeight: 400 }}>
                          {s.label.split("—")[1]?.trim()}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px" }}>
                    <Badge variant="muted" style={{ textTransform: "capitalize" }}>
                      {s.category.replace("_", " ")}
                    </Badge>
                  </td>
                  <td style={{ padding: "12px 14px", fontWeight: 700, color: s.officialRate > 0 ? THEME.success : "inherit" }}>
                    {s.officialRate > 0 ? `${s.officialRate}% p.a.` : s.payoutType}
                  </td>
                  <td style={{ padding: "12px 14px", color: THEME.textMuted }}>{s.tenure}</td>
                  <td style={{ padding: "12px 14px" }}>
                    <Badge variant="sage">{s.taxBadge}</Badge>
                  </td>
                  <td style={{ padding: "12px 14px", fontSize: 12, color: THEME.textMuted, maxWidth: 220 }}>
                    {s.eligibility}
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <Button size="sm" variant="ghost" onClick={() => onTrackScheme(s)}>
                      <Plus size={13} /> Add
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ─── MAIN GOVERNMENT SCHEMES TAB COMPONENT ──────────────────────────────────
export function GovtSchemesTab({
  state,
  addItem,
  removeItem,
  updateItem,
  subTab,
  onSubTabChange,
  showToast,
}: any) {
  const { familyProfiles } = useMasterData();
  const schemes: any[] = state.govtSchemes || [];

  const [modal, setModal] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [selectedSchemeFilter, setSelectedSchemeFilter] = useState<string>(subTab || "ALL");
  const [viewMode, setViewMode] = useState<"cards" | "table" | "timeline" | "explorer">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"value" | "rate" | "maturity" | "name">("value");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sync internal sub when parent drives subTab via sidebar click
  useEffect(() => {
    if (subTab) {
      setSelectedSchemeFilter(subTab);
      const meta = SCHEME_MAP[subTab];
      if (meta) setActiveCategory(meta.category);
    }
  }, [subTab]);

  const handleSchemeFilterChange = (newSub: string) => {
    setSelectedSchemeFilter(newSub);
    if (newSub === "ALL") {
      setActiveCategory("ALL");
    } else {
      const meta = SCHEME_MAP[newSub];
      if (meta) setActiveCategory(meta.category);
    }
    onSubTabChange?.(newSub);
  };

  const handleCategoryChange = (catId: string) => {
    setActiveCategory(catId);
    setSelectedSchemeFilter("ALL");
  };

  // ─── AGGREGATE CALCULATIONS ───────────────────────────────────────────────
  // Total corpus held across investment/payout schemes
  const totalCorpus = useMemo(() => {
    return schemes
      .filter((sc) => sc.schemeType !== "PMKISAN")
      .reduce((s, sc) => s + Number(sc.currentBalance || 0), 0);
  }, [schemes]);

  // Annual Outflow = SIPs / recurring contributions + dedicated insurance premiums
  const totalOutflow = useMemo(() => {
    return schemes.reduce((s, sc) => {
      const meta = SCHEME_MAP[sc.schemeType];
      if (meta?.hideContribution) {
        return s + Number(sc.premium || 0);
      }
      return s + annualizeContribution(Number(sc.contributionAmount || 0), sc.frequency || "annual");
    }, 0);
  }, [schemes]);

  // Annual Benefit = Periodic interest payouts (SCSS quarterly, POMIS monthly, RBI Bonds) + PM-KISAN DBT
  const totalBenefit = useMemo(() => {
    return schemes.reduce((s, sc) => {
      if (sc.schemeType === "PMKISAN") return s + PMKISAN_ANNUAL_BENEFIT;
      const rule = SCHEME_RULES[sc.schemeType];
      if (rule?.growth === "payout") {
        return s + (Number(sc.currentBalance || 0) * Number(sc.interestRate || 0)) / 100;
      }
      return s;
    }, 0);
  }, [schemes]);

  // Total Life & Accident Insurance Cover sum assured
  const totalInsuranceCover = useMemo(() => {
    return schemes.reduce((s, sc) => {
      if (sc.schemeType === "PMJJBY" || sc.schemeType === "PMSBY") {
        return s + Number(sc.coverageAmount || 200000);
      }
      return s;
    }, 0);
  }, [schemes]);

  // Total monthly guaranteed pension across APY & NPS Lite
  const totalMonthlyPension = useMemo(() => {
    return schemes.reduce((s, sc) => s + Number(sc.pensionAmount || 0), 0);
  }, [schemes]);

  // ─── FILTERING & SORTING ──────────────────────────────────────────────────
  const filteredSchemes = useMemo(() => {
    return schemes
      .filter((sc: any) => {
        // Category filter
        if (activeCategory !== "ALL") {
          const meta = SCHEME_MAP[sc.schemeType];
          if (meta?.category !== activeCategory) return false;
        }
        // Specific scheme pill filter
        if (selectedSchemeFilter !== "ALL" && sc.schemeType !== selectedSchemeFilter) {
          return false;
        }
        // Owner filter
        if (ownerFilter !== "all" && sc.owner !== ownerFilter) {
          return false;
        }
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const meta = SCHEME_MAP[sc.schemeType];
          const matchName = (sc.schemeName || "").toLowerCase().includes(q);
          const matchLabel = (meta?.label || "").toLowerCase().includes(q);
          const matchMember = (sc.memberName || "").toLowerCase().includes(q);
          const matchAcc = (sc.accountNumber || "").toLowerCase().includes(q);
          const matchBank = (sc.bankAccount || "").toLowerCase().includes(q);
          const matchNotes = (sc.notes || "").toLowerCase().includes(q);
          if (!matchName && !matchLabel && !matchMember && !matchAcc && !matchBank && !matchNotes) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "value") {
          return Number(b.currentBalance || 0) - Number(a.currentBalance || 0);
        }
        if (sortBy === "rate") {
          return Number(b.interestRate || 0) - Number(a.interestRate || 0);
        }
        if (sortBy === "maturity") {
          return (a.maturityDate || "9999").localeCompare(b.maturityDate || "9999");
        }
        if (sortBy === "name") {
          return (a.schemeName || a.schemeType).localeCompare(b.schemeName || b.schemeType);
        }
        return 0;
      });
  }, [schemes, activeCategory, selectedSchemeFilter, ownerFilter, searchQuery, sortBy]);

  // Visual Allocation Chart Data
  const chartData = useMemo(() => {
    const map: Record<string, { name: string; value: number; color: string }> = {};
    schemes.forEach((sc) => {
      const meta = SCHEME_MAP[sc.schemeType] || { label: sc.schemeType, color: THEME.primary };
      const val = Number(sc.currentBalance || 0);
      if (val > 0) {
        if (!map[sc.schemeType]) {
          map[sc.schemeType] = { name: meta.label.split("—")[0].trim(), value: 0, color: meta.color };
        }
        map[sc.schemeType].value += val;
      }
    });
    return Object.values(map);
  }, [schemes]);

  // Upcoming payouts and maturity timeline items
  const timelineEvents = useMemo(() => {
    const events: any[] = [];
    schemes.forEach((sc) => {
      const meta = SCHEME_MAP[sc.schemeType] || { label: sc.schemeType, color: THEME.primary };
      if (sc.maturityDate) {
        const mat = getMaturityStatus(sc.maturityDate);
        events.push({
          type: "maturity",
          scheme: sc,
          meta,
          date: sc.maturityDate,
          status: mat,
          label: `${sc.schemeName || meta.label.split("—")[0].trim()} Maturity`,
          amount: Number(sc.currentBalance || 0),
        });
      }
      const rule = SCHEME_RULES[sc.schemeType];
      if (rule?.growth === "payout" && Number(sc.currentBalance) > 0) {
        const proj = projectSchemeValue(sc);
        if (proj) {
          events.push({
            type: "payout",
            scheme: sc,
            meta,
            payoutFreq: rule.payoutFreqPerYear === 12 ? "Monthly" : rule.payoutFreqPerYear === 4 ? "Quarterly" : "Semi-Annual",
            label: `${sc.schemeName || meta.label.split("—")[0].trim()} (${proj.label})`,
            amount: proj.value,
          });
        }
      }
    });
    return events;
  }, [schemes]);

  // ─── ASYNC ACTIONS ────────────────────────────────────────────────────────
  const { run: save, loading: savingScheme } = useAsyncAction(
    async (data: any) => {
      if (data.id && schemes.find((s: any) => s.id === data.id)) {
        await updateItem("govtSchemes", data.id, data);
        showToast?.("Government scheme updated successfully", "success");
      } else {
        await addItem("govtSchemes", data);
        showToast?.("Government scheme tracked successfully", "success");
      }
    },
    {
      onSuccess: () => setModal(null),
      onError: (e: any) => showToast?.(`Failed to save scheme: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: deleteScheme } = useAsyncAction(
    async (id: string) => {
      await removeItem("govtSchemes", id);
      showToast?.("Scheme removed from portfolio", "info");
    },
    { onError: (e: any) => showToast?.(`Failed to delete scheme: ${e?.message || "Unknown error"}`, "error") }
  );

  // ─── CSV EXPORT ───────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (schemes.length === 0) return;
    const headers = [
      "Scheme Code",
      "Scheme Name",
      "Beneficiary",
      "Owner",
      "Account Number",
      "Current Balance",
      "Interest Rate %",
      "Contribution",
      "Frequency",
      "Annual Premium",
      "Coverage Amount",
      "Monthly Pension",
      "Start Date",
      "Maturity Date",
      "Nominee",
      "Bank",
      "Notes",
    ];
    const rows = schemes.map((s) => [
      s.schemeType || "",
      s.schemeName || "",
      s.memberName || "",
      s.owner || "self",
      s.accountNumber || "",
      s.currentBalance || 0,
      s.interestRate || "",
      s.contributionAmount || 0,
      s.frequency || "",
      s.premium || 0,
      s.coverageAmount || 0,
      s.pensionAmount || 0,
      s.startDate || "",
      s.maturityDate || "",
      s.nominee || "",
      s.bankAccount || "",
      s.notes || "",
    ]);
    exportArrayToCSV("Government_Schemes_Portfolio.csv", headers, rows);
    showToast?.("Government schemes exported to CSV", "success");
  };

  return (
    <div className="tab-content-enter">
      {/* Header Section */}
      <SectionTitle
        sub="Sovereign guaranteed savings, monthly/quarterly income schemes, micro-pensions & government insurance"
        rightElement={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {schemes.length > 0 && (
              <Button size="sm" variant="ghost" onClick={handleExportCSV} title="Export to CSV">
                <Download size={14} /> Export
              </Button>
            )}
            <Button size="sm" onClick={() => setModal({ schemeType: selectedSchemeFilter !== "ALL" ? selectedSchemeFilter : "SSY" })}>
              <Plus size={14} /> Add Scheme
            </Button>
          </div>
        }
      >
        Government Schemes Portfolio
      </SectionTitle>

      {/* ─── HERO METRIC KPI CARDS ─────────────────────────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <StatCard
          label="Total Sovereign Corpus"
          value={fmtINRFull(totalCorpus)}
          numericValue={totalCorpus}
          formatValue={fmtINRFull}
          sub={`${schemes.length} active holdings`}
          icon={<IndianRupee size={18} />}
          color={THEME.success}
        />
        <StatCard
          label="Annual Passive Payouts"
          value={fmtINRFull(totalBenefit)}
          numericValue={totalBenefit}
          formatValue={fmtINRFull}
          sub="POMIS + SCSS + RBI + PM-KISAN"
          icon={<Repeat size={18} />}
          color={THEME.accent}
        />
        <StatCard
          label="Annual Commitments"
          value={fmtINRFull(totalOutflow)}
          numericValue={totalOutflow}
          formatValue={fmtINRFull}
          sub="SIP deposits & premiums"
          icon={<TrendingUp size={18} />}
          color={THEME.primary}
        />
        {totalInsuranceCover > 0 && (
          <StatCard
            label="Total Insurance Cover"
            value={fmtINRFull(totalInsuranceCover)}
            numericValue={totalInsuranceCover}
            formatValue={fmtINRFull}
            sub="PMJJBY + PMSBY Sum Assured"
            icon={<ShieldCheck size={18} />}
            color={THEME.sage}
          />
        )}
        {totalMonthlyPension > 0 && (
          <StatCard
            label="Guaranteed Pension at 60"
            value={`${fmtINRFull(totalMonthlyPension)}/mo`}
            numericValue={totalMonthlyPension}
            formatValue={(n) => `${fmtINRFull(n)}/mo`}
            sub="APY & NPS Lite retirement"
            icon={<Users size={18} />}
            color={THEME.gold}
          />
        )}
      </div>

      {/* ─── VISUAL ALLOCATION & CASHFLOW SECTION (COLLAPSIBLE) ────────────── */}
      {schemes.length > 0 && chartData.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background: "none",
                border: "none",
                fontSize: 12,
                color: THEME.primary,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              <Activity size={14} />
              {showAnalytics ? "Hide Portfolio Analytics" : "Show Allocation & Cash Flow Charts"}
              {showAnalytics ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>

          {showAnalytics && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: 16,
                marginBottom: 20,
              }}
            >
              {/* Asset Allocation Donut Chart */}
              <Card style={{ padding: 20 }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>
                  Corpus Allocation by Scheme
                </h4>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => [fmtINRFull(value), "Corpus"]}
                        contentStyle={{
                          background: "var(--surface-0)",
                          borderRadius: 8,
                          border: "1px solid var(--t-line)",
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Annual Cashflow Balance Chart */}
              <Card style={{ padding: 20 }}>
                <h4 style={{ margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>
                  Annual Cash Flow Dynamics (Inflow vs Outflow)
                </h4>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: "Annual Outflow (Deposits)", amount: totalOutflow, fill: THEME.primary },
                        { name: "Annual Inflow (Payouts/DBT)", amount: totalBenefit, fill: THEME.success },
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="name" stroke="var(--t-muted)" fontSize={12} />
                      <YAxis stroke="var(--t-muted)" fontSize={12} tickFormatter={(v) => fmtINR(v)} />
                      <Tooltip
                        formatter={(value: any) => [fmtINRFull(value), "Amount"]}
                        contentStyle={{
                          background: "var(--surface-0)",
                          borderRadius: 8,
                          border: "1px solid var(--t-line)",
                        }}
                      />
                      <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                        <Cell fill={THEME.primary} />
                        <Cell fill={THEME.success} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ─── PRIMARY NAVIGATION: CATEGORIES & VIEW SWITCHER ────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {/* Category Filter Pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const active = activeCategory === c.id;
            const count =
              c.id === "ALL"
                ? schemes.length
                : schemes.filter((sc) => SCHEME_MAP[sc.schemeType]?.category === c.id).length;

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCategoryChange(c.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: "var(--radius-full)",
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  border: active ? "1px solid var(--t-accent)" : "1px solid var(--t-line)",
                  background: active
                    ? "color-mix(in srgb, var(--t-accent) 15%, transparent)"
                    : "var(--surface-0)",
                  color: active ? "var(--t-accent)" : "var(--t-ink)",
                  cursor: "pointer",
                  transition: "var(--t-transition)",
                }}
              >
                <Icon size={13} />
                <span>{c.label}</span>
                {count > 0 && (
                  <span
                    style={{
                      padding: "1px 6px",
                      borderRadius: "var(--radius-xs)",
                      fontSize: 10,
                      fontWeight: 800,
                      background: active
                        ? "color-mix(in srgb, var(--t-accent) 25%, transparent)"
                        : "var(--surface-2)",
                      color: active ? "var(--t-accent)" : "var(--t-muted)",
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* View Mode Switcher */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            background: "var(--surface-1)",
            padding: 3,
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--t-line)",
          }}
        >
          {[
            { id: "cards", label: "Cards", icon: LayoutGrid },
            { id: "table", label: "Table", icon: TableIcon },
            { id: "timeline", label: "Timeline", icon: Calendar },
            { id: "explorer", label: "Rates & Calculator", icon: Calculator },
          ].map((v) => {
            const active = viewMode === v.id;
            const Icon = v.icon;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setViewMode(v.id as any)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "5px 10px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  border: "none",
                  background: active ? "var(--surface-0)" : "transparent",
                  color: active ? "var(--t-ink)" : "var(--t-muted)",
                  boxShadow: active ? "var(--shadow-xs)" : "none",
                  cursor: "pointer",
                  transition: "var(--t-transition)",
                }}
              >
                <Icon size={13} />
                <span>{v.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── SCHEME SUB-TABS BAR (HORIZONTALLY SCROLLABLE) ────────────────── */}
      <div className="demat-portfolio-bar no-scrollbar" style={{ marginBottom: 16 }}>
        <button
          onClick={() => handleSchemeFilterChange("ALL")}
          className={`demat-portfolio-pill ${selectedSchemeFilter === "ALL" ? "active" : ""}`}
          style={
            selectedSchemeFilter === "ALL"
              ? {
                  background: "color-mix(in srgb, var(--t-accent) 12%, transparent)",
                  color: "var(--t-accent)",
                  boxShadow: "inset 0 -2px 0 var(--t-accent)",
                }
              : {}
          }
        >
          <Sparkles size={13} />
          All Schemes ({schemes.length})
        </button>

        {SCHEMES.filter((s) => activeCategory === "ALL" || s.category === activeCategory).map((s) => {
          const Icon = s.icon;
          const active = selectedSchemeFilter === s.value;
          const count = schemes.filter((sc: any) => sc.schemeType === s.value).length;
          return (
            <button
              key={s.value}
              onClick={() => handleSchemeFilterChange(s.value)}
              aria-pressed={active}
              className={`demat-portfolio-pill ${active ? "active" : ""}`}
              style={
                active
                  ? ({
                      background: `color-mix(in srgb, ${s.color} 12%, transparent)`,
                      color: s.color,
                      boxShadow: `inset 0 -2px 0 ${s.color}`,
                    } as React.CSSProperties)
                  : {}
              }
            >
              <Icon size={13} color={active ? s.color : undefined} />
              {s.shortLabel}
              {count > 0 && (
                <span
                  style={{
                    padding: "1px 6px",
                    borderRadius: "var(--radius-xs)",
                    fontSize: 10,
                    fontWeight: 800,
                    background: active
                      ? `color-mix(in srgb, ${s.color} 22%, transparent)`
                      : `color-mix(in srgb, ${THEME.textMuted} 22%, transparent)`,
                    color: active ? s.color : THEME.textMuted,
                    marginLeft: 4,
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ─── SEARCH & FILTER TOOLBAR ──────────────────────────────────────── */}
      {viewMode !== "explorer" && schemes.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 20,
            background: "var(--surface-0)",
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--t-line)",
          }}
        >
          {/* Search Box */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 200 }}>
            <Search size={14} color="var(--t-muted)" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by scheme name, account #, beneficiary, bank or notes..."
              style={{
                border: "none",
                background: "transparent",
                outline: "none",
                width: "100%",
                fontSize: 13,
                color: "var(--t-ink)",
              }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {/* Owner Filter */}
            {familyProfiles.length > 1 && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                <Filter size={13} color="var(--t-muted)" />
                <select
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  style={{
                    padding: "4px 8px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--t-line)",
                    background: "var(--surface-1)",
                    fontSize: 12,
                    color: "var(--t-ink)",
                  }}
                >
                  <option value="all">All Family Profiles</option>
                  {familyProfiles.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
              <Sliders size={13} color="var(--t-muted)" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                style={{
                  padding: "4px 8px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--t-line)",
                  background: "var(--surface-1)",
                  fontSize: 12,
                  color: "var(--t-ink)",
                }}
              >
                <option value="value">Sort: Balance (High to Low)</option>
                <option value="rate">Sort: Rate % (High to Low)</option>
                <option value="maturity">Sort: Maturity Date</option>
                <option value="name">Sort: Name (A–Z)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* ─── VIEW MODE: EXPLORER & CALCULATORS ─────────────────────────────── */}
      {viewMode === "explorer" && (
        <div>
          <SchemeCalculator
            onSelectScheme={(scheme) => setModal({ schemeType: scheme })}
          />
          <SchemeRatesDirectory
            onTrackScheme={(s) => setModal({ schemeType: s.value })}
          />
        </div>
      )}

      {/* ─── VIEW MODE: TIMELINE & CASH FLOW SCHEDULE ─────────────────────── */}
      {viewMode === "timeline" && (
        <Card style={{ padding: 24, marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 16px 0", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <Calendar size={18} color={THEME.accent} />
            Maturity Schedule & Regular Income Milestones
          </h3>

          {timelineEvents.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: THEME.textMuted }}>
              No upcoming maturities or regular payout schemes found. Add an SSY, SCSS, POMIS, or NSC account to track cash flow milestones.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {timelineEvents.map((evt, idx) => {
                const Icon = evt.meta.icon;
                return (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "14px 18px",
                      background: "var(--surface-1)",
                      borderRadius: "var(--radius-md)",
                      borderLeft: `4px solid ${evt.meta.color}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: "var(--radius-full)",
                          background: `color-mix(in srgb, ${evt.meta.color} 15%, transparent)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: evt.meta.color,
                        }}
                      >
                        <Icon size={16} />
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{evt.label}</div>
                        <div style={{ fontSize: 12, color: THEME.textMuted, marginTop: 2 }}>
                          {evt.type === "maturity" ? (
                            <>
                              Maturity Date: <strong>{evt.date}</strong>
                              {evt.status && (
                                <Badge
                                  variant={
                                    evt.status.urgency === "overdue"
                                      ? "rust"
                                      : evt.status.urgency === "soon"
                                        ? "gold"
                                        : "muted"
                                  }
                                  style={{ marginLeft: 8 }}
                                >
                                  {evt.status.label}
                                </Badge>
                              )}
                            </>
                          ) : (
                            <>
                              Frequency: <strong>{evt.payoutFreq} Payout</strong> · Linked: {evt.scheme.bankAccount || "Post Office"}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 800,
                          color: evt.type === "payout" ? THEME.success : THEME.primary,
                          fontFamily: "var(--font-display)",
                        }}
                      >
                        <Money value={evt.amount} variant="full" />
                        {evt.type === "payout" && <span style={{ fontSize: 12, fontWeight: 500 }}>/cycle</span>}
                      </div>
                      <div style={{ fontSize: 11, color: THEME.textMuted }}>
                        {evt.type === "maturity" ? "Corpus Balance" : "Estimated Payout"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ─── VIEW MODE: ENTERPRISE DATA TABLE ──────────────────────────────── */}
      {viewMode === "table" && (
        <Card style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
          {filteredSchemes.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: THEME.textMuted }}>
              No government schemes match your filter criteria.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table className="app-table" style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--surface-1)", textAlign: "left" }}>
                    <th style={{ padding: "12px 16px" }}>Scheme / Label</th>
                    <th style={{ padding: "12px 16px" }}>Beneficiary / Owner</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Corpus Balance</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Rate / Yield</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Annual Outflow</th>
                    <th style={{ padding: "12px 16px" }}>Maturity / Payout</th>
                    <th style={{ padding: "12px 16px" }}>Tax Status</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchemes.map((sc: any) => {
                    const meta = SCHEME_MAP[sc.schemeType] || { label: sc.schemeType, color: THEME.primary };
                    const Icon = meta.icon || Sparkles;
                    const projection = projectSchemeValue(sc);
                    const maturityStatus = getMaturityStatus(sc.maturityDate);

                    return (
                      <tr key={sc.id} style={{ borderBottom: "1px solid var(--t-line)" }}>
                        <td style={{ padding: "12px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: "var(--radius-sm)",
                                background: `color-mix(in srgb, ${meta.color} 15%, transparent)`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: meta.color,
                              }}
                            >
                              <Icon size={15} />
                            </span>
                            <div>
                              <div style={{ fontWeight: 700 }}>{sc.schemeName || meta.label.split("—")[0].trim()}</div>
                              <div style={{ fontSize: 11, color: THEME.textMuted }}>
                                {meta.shortLabel} {sc.accountNumber ? `· #${sc.accountNumber}` : ""}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {sc.memberName && (
                            <div style={{ fontWeight: 600, color: THEME.pink }}>{sc.memberName}</div>
                          )}
                          <div style={{ fontSize: 11, color: THEME.textMuted, textTransform: "capitalize" }}>
                            Owner: {sc.owner || "self"}
                          </div>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, fontFamily: "var(--font-display)" }}>
                          {Number(sc.currentBalance) > 0 ? (
                            <Money value={Number(sc.currentBalance)} variant="full" />
                          ) : Number(sc.coverageAmount) > 0 ? (
                            <span style={{ color: THEME.sage }}>{fmtINRFull(sc.coverageAmount)} (Cover)</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600 }}>
                          {Number(sc.interestRate) > 0 ? (
                            <Badge variant="sage">{sc.interestRate}%</Badge>
                          ) : Number(sc.pensionAmount) > 0 ? (
                            <Badge variant="gold">₹{sc.pensionAmount}/mo</Badge>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          {Number(sc.premium) > 0 ? (
                            <span>{fmtINRFull(sc.premium)} / yr</span>
                          ) : Number(sc.contributionAmount) > 0 ? (
                            <span>{fmtINRFull(sc.contributionAmount)} / {sc.frequency}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          {projection ? (
                            <div style={{ fontSize: 12, fontWeight: 600, color: meta.color }}>
                              {projection.label}: {fmtINRFull(projection.value)}
                            </div>
                          ) : maturityStatus ? (
                            <Badge variant={maturityStatus.urgency === "overdue" ? "rust" : "muted"}>
                              {maturityStatus.label}
                            </Badge>
                          ) : (
                            <span style={{ color: THEME.textMuted }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px" }}>
                          <Badge variant="muted">{meta.taxBadge}</Badge>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "right" }}>
                          <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
                            <button
                              onClick={() => setModal(sc)}
                              className="icon-btn"
                              aria-label="Edit scheme"
                              title="Edit"
                              style={{ background: "none", border: "none", cursor: "pointer", color: THEME.textMuted, padding: 6 }}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(sc.id)}
                              className="icon-btn danger"
                              aria-label="Delete scheme"
                              title="Delete"
                              style={{ background: "none", border: "none", cursor: "pointer", color: THEME.danger, padding: 6 }}
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
          )}
        </Card>
      )}

      {/* ─── VIEW MODE: RICH INTERACTIVE CARDS ─────────────────────────────── */}
      {viewMode === "cards" && (
        <div>
          {filteredSchemes.length === 0 ? (
            <EmptyState
              icon={Sparkles}
              title={
                selectedSchemeFilter !== "ALL"
                  ? `No ${SCHEME_MAP[selectedSchemeFilter]?.label?.split("—")[0]?.trim()} Tracked`
                  : "No Government Schemes in Portfolio"
              }
              description={
                selectedSchemeFilter !== "ALL"
                  ? SCHEME_MAP[selectedSchemeFilter]?.description
                  : "Track high-yield government savings like Sukanya Samriddhi (SSY 8.2%), SCSS, Post Office MIS, APY pensions, and sovereign insurance schemes."
              }
              pills={[
                "High Interest (up to 8.2%)",
                "Tax-Free Returns (Section 80C & EEE)",
                "Sovereign Guarantee",
                "Regular Quarterly / Monthly Payouts",
              ]}
              buttonLabel={
                selectedSchemeFilter !== "ALL"
                  ? `Add ${SCHEME_MAP[selectedSchemeFilter]?.shortLabel}`
                  : "Track First Government Scheme"
              }
              onAdd={() => setModal({ schemeType: selectedSchemeFilter !== "ALL" ? selectedSchemeFilter : "SSY" })}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {filteredSchemes.map((sc: any) => {
                const meta = SCHEME_MAP[sc.schemeType] || {
                  color: THEME.primary,
                  label: sc.schemeType,
                  shortLabel: sc.schemeType,
                };
                const Icon = meta.icon || Sparkles;
                const isExpanded = expanded === sc.id;
                const maturityStatus = getMaturityStatus(sc.maturityDate);
                const projection = projectSchemeValue(sc);

                // Calculate progress % between Start Date and Maturity Date
                let progressPct: number | null = null;
                if (sc.startDate && sc.maturityDate) {
                  const start = new Date(sc.startDate + "T00:00:00").getTime();
                  const end = new Date(sc.maturityDate + "T00:00:00").getTime();
                  const current = new Date(today() + "T00:00:00").getTime();
                  if (end > start) {
                    progressPct = Math.min(100, Math.max(0, Math.round(((current - start) / (end - start)) * 100)));
                  }
                }

                return (
                  <Card
                    key={sc.id}
                    style={{
                      borderLeft: `5px solid ${meta.color}`,
                      padding: "18px 22px",
                      position: "relative",
                    }}
                  >
                    {/* Header Bar */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 240 }}>
                        <span
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: "var(--radius-md)",
                            background: `color-mix(in srgb, ${meta.color} 15%, transparent)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: meta.color,
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={20} />
                        </span>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 700, fontSize: 16 }}>
                              {sc.schemeName || meta.label.split("—")[0].trim()}
                            </span>
                            {sc.memberName && (
                              <Badge variant="pink" style={{ fontWeight: 700 }}>
                                👧 {sc.memberName}
                              </Badge>
                            )}
                            <Badge variant="muted">{meta.shortLabel}</Badge>
                            <Badge variant="sage">{meta.taxBadge}</Badge>
                          </div>
                          <div style={{ fontSize: 12, color: THEME.textMuted, marginTop: 3 }}>
                            {sc.accountNumber ? `Account #${sc.accountNumber} · ` : ""}
                            {sc.bankAccount ? `${sc.bankAccount} · ` : ""}
                            Owner: <strong style={{ textTransform: "capitalize" }}>{sc.owner || "self"}</strong>
                            {sc.nominee ? ` · Nominee: ${sc.nominee}` : ""}
                          </div>
                        </div>
                      </div>

                      {/* Right-side Key Metrics */}
                      <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                        {Number(sc.currentBalance) > 0 && (
                          <div style={{ textAlign: "right" }}>
                            <div
                              style={{
                                fontFamily: "var(--font-display)",
                                fontWeight: 800,
                                fontSize: 18,
                                color: THEME.success,
                              }}
                            >
                              <Money value={Number(sc.currentBalance)} variant="full" />
                            </div>
                            <div style={{ fontSize: 11, color: THEME.textMuted }}>
                              {meta.balanceCardLabel || "current corpus"}
                            </div>
                          </div>
                        )}

                        {Number(sc.pensionAmount) > 0 && (
                          <div style={{ textAlign: "right" }}>
                            <div
                              style={{
                                fontFamily: "var(--font-display)",
                                fontWeight: 800,
                                fontSize: 17,
                                color: THEME.gold,
                              }}
                            >
                              <Money value={Number(sc.pensionAmount)} variant="full" />/mo
                            </div>
                            <div style={{ fontSize: 11, color: THEME.textMuted }}>guaranteed pension at 60</div>
                          </div>
                        )}

                        {Number(sc.coverageAmount) > 0 && (
                          <div style={{ textAlign: "right" }}>
                            <div
                              style={{
                                fontFamily: "var(--font-display)",
                                fontWeight: 800,
                                fontSize: 17,
                                color: THEME.sage,
                              }}
                            >
                              <Money value={Number(sc.coverageAmount)} variant="full" />
                            </div>
                            <div style={{ fontSize: 11, color: THEME.textMuted }}>sum assured cover</div>
                          </div>
                        )}

                        {Number(sc.interestRate) > 0 && (
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 800, fontSize: 16, color: meta.color }}>
                              {sc.interestRate}%
                            </div>
                            <div style={{ fontSize: 11, color: THEME.textMuted }}>annual yield</div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <button
                            onClick={() => setExpanded(isExpanded ? null : sc.id)}
                            className="icon-btn"
                            aria-label={isExpanded ? "Collapse" : "Expand"}
                            title={isExpanded ? "Collapse details" : "Expand details"}
                            style={{ background: "none", border: "none", cursor: "pointer", color: THEME.textMuted, padding: 6 }}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          <button
                            onClick={() => setModal(sc)}
                            className="icon-btn"
                            aria-label="Edit scheme"
                            title="Edit scheme"
                            style={{ background: "none", border: "none", cursor: "pointer", color: THEME.textMuted, padding: 6 }}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(sc.id)}
                            className="icon-btn danger"
                            aria-label="Delete scheme"
                            title="Delete scheme"
                            style={{ background: "none", border: "none", cursor: "pointer", color: THEME.danger, padding: 6 }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Maturity Progress Bar (if dates available) */}
                    {progressPct !== null && (
                      <div style={{ marginTop: 10, marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: THEME.textMuted, marginBottom: 4 }}>
                          <span>Maturity Timeline ({progressPct}% elapsed)</span>
                          {maturityStatus && (
                            <span style={{ fontWeight: 600, color: maturityStatus.urgency === "overdue" ? THEME.danger : meta.color }}>
                              {maturityStatus.label}
                            </span>
                          )}
                        </div>
                        <div style={{ width: "100%", height: 6, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${progressPct}%`,
                              height: "100%",
                              background: meta.color,
                              borderRadius: 3,
                              transition: "width 0.4s ease",
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Projections & Payout Highlight Banner */}
                    {projection && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: "8px 12px",
                          borderRadius: "var(--radius-sm)",
                          background: `color-mix(in srgb, ${meta.color} 8%, var(--surface-1))`,
                          border: `1px dashed color-mix(in srgb, ${meta.color} 30%, transparent)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600, color: meta.color }}>
                          <TrendingUp size={14} />
                          <span>{projection.label}:</span>
                          <strong style={{ fontSize: 13 }}><Money value={projection.value} variant="full" /></strong>
                        </div>
                        <span style={{ fontSize: 11, color: THEME.textMuted }}>
                          {projection.mode === "payout" ? "Regular passive cash flow" : "Compounded to maturity"}
                        </span>
                      </div>
                    )}

                    {/* Expanded Deep Dive Drawer */}
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: 14,
                          paddingTop: 14,
                          borderTop: "1px solid var(--t-line)",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: 12,
                            fontSize: 12,
                            color: THEME.textMuted,
                          }}
                        >
                          {sc.startDate && (
                            <div>
                              <span style={{ display: "block", color: "var(--t-muted)" }}>Start Date</span>
                              <strong style={{ color: "var(--t-ink)" }}>
                                {new Date(`${sc.startDate}T00:00:00`).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </strong>
                            </div>
                          )}
                          {sc.maturityDate && (
                            <div>
                              <span style={{ display: "block", color: "var(--t-muted)" }}>Maturity Date</span>
                              <strong style={{ color: "var(--t-ink)" }}>
                                {new Date(`${sc.maturityDate}T00:00:00`).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </strong>
                            </div>
                          )}
                          {Number(sc.contributionAmount) > 0 && (
                            <div>
                              <span style={{ display: "block", color: "var(--t-muted)" }}>Recurring Contribution</span>
                              <strong style={{ color: "var(--t-ink)" }}>
                                <Money value={Number(sc.contributionAmount)} variant="full" /> / {sc.frequency?.replace("_", " ")}
                              </strong>
                            </div>
                          )}
                          {Number(sc.premium) > 0 && (
                            <div>
                              <span style={{ display: "block", color: "var(--t-muted)" }}>Annual Premium</span>
                              <strong style={{ color: "var(--t-ink)" }}>
                                <Money value={Number(sc.premium)} variant="full" />/yr
                              </strong>
                            </div>
                          )}
                          {sc.bankAccount && (
                            <div>
                              <span style={{ display: "block", color: "var(--t-muted)" }}>Linked Institution</span>
                              <strong style={{ color: "var(--t-ink)" }}>{sc.bankAccount}</strong>
                            </div>
                          )}
                          {sc.nominee && (
                            <div>
                              <span style={{ display: "block", color: "var(--t-muted)" }}>Nominee</span>
                              <strong style={{ color: "var(--t-ink)" }}>{sc.nominee}</strong>
                            </div>
                          )}
                        </div>

                        {sc.notes && (
                          <div
                            style={{
                              marginTop: 12,
                              padding: "8px 12px",
                              background: "var(--surface-1)",
                              borderRadius: "var(--radius-sm)",
                              fontSize: 12,
                              fontStyle: "italic",
                              color: THEME.textMuted,
                            }}
                          >
                            <strong>Notes:</strong> {sc.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── MODALS & DIALOGS ──────────────────────────────────────────────── */}
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
          message="Are you sure you want to delete this government scheme? This action cannot be undone."
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
