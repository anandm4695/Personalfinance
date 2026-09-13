import React, { useState, useMemo, useCallback } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Zap,
  Droplets,
  Wifi,
  Phone,
  Tv,
  Building,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  ClipboardList,
  Search,
  LayoutGrid,
  CalendarDays,
  Table as TableIcon,
  Flame,
  ShieldCheck,
  CreditCard,
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Copy,
  Check,
  ExternalLink,
  Calendar,
  Filter,
  PieChart as PieIcon,
  RefreshCw,
  Layers,
  CheckCheck,
  Landmark,
  FileText,
  DollarSign,
  Info,
  ArrowUpRight,
  ZapOff,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { fmtINR, fmtINRFull, fmtINRExact, uid, today } from "../../utils/finance";
import { dueStatus } from "../../utils/dueStatus";
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
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { useAsyncAction } from "../../hooks/useAsyncAction";

export interface UtilityCategory {
  value: string;
  label: string;
  Icon: any;
  color: string;
  unit: string;
  unitLabel: string;
}

export const CATEGORIES: UtilityCategory[] = [
  { value: "electricity", label: "Electricity", Icon: Zap, color: THEME.gold, unit: "kWh", unitLabel: "Electricity Units (kWh)" },
  { value: "gas", label: "Gas / Piped Gas", Icon: Flame, color: THEME.rust, unit: "SCM", unitLabel: "Gas Volume (SCM / Cylinders)" },
  { value: "water", label: "Water Supply", Icon: Droplets, color: THEME.cyan, unit: "kL", unitLabel: "Water Units (kL / m³)" },
  { value: "broadband", label: "Broadband / Wi-Fi", Icon: Wifi, color: THEME.violet, unit: "GB", unitLabel: "Data Usage" },
  { value: "mobile", label: "Mobile / Postpaid", Icon: Phone, color: THEME.sage, unit: "GB", unitLabel: "Plan Usage" },
  { value: "cable_tv", label: "Cable TV / DTH", Icon: Tv, color: THEME.pink, unit: "Ch", unitLabel: "Channels / Pack" },
  { value: "maintenance", label: "Society Maintenance", Icon: Building, color: THEME.accent, unit: "sqft", unitLabel: "Flat / Area (sqft)" },
  { value: "other", label: "Other Utility", Icon: IndianRupee, color: THEME.muted, unit: "units", unitLabel: "Units Consumed" },
];

export const CAT_MAP: Record<string, UtilityCategory> = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c])
);

export const PROVIDER_PRESETS: Record<string, string[]> = {
  electricity: [
    "Tata Power",
    "Adani Electricity",
    "MSEDCL (Mahavitaran)",
    "BESCOM (Bengaluru)",
    "Torrent Power",
    "BSES Rajdhani (Delhi)",
    "BSES Yamuna (Delhi)",
    "CESC (Kolkata)",
    "TSSPDCL (Hyderabad)",
    "UPPCL (Uttar Pradesh)",
    "DHBVN (Haryana)",
    "PSPCL (Punjab)",
    "KSEB (Kerala)",
    "TANGEDCO (Tamil Nadu)",
    "WBSEDCL (West Bengal)",
  ],
  gas: [
    "Mahanagar Gas (MGL)",
    "Indraprastha Gas (IGL)",
    "Adani Total Gas",
    "Gujarat Gas",
    "HP Gas (HPCL LPG)",
    "Bharat Gas (BPCL LPG)",
    "Indane Gas (IOCL LPG)",
    "Sabarmati Gas",
    "Central UP Gas (CUGL)",
    "GAIL Gas",
  ],
  water: [
    "Municipal Corporation (BMC / MCGM)",
    "BWSSB (Bangalore Water)",
    "Delhi Jal Board (DJB)",
    "HMWS&SB (Hyderabad Water)",
    "CMWSSB (Chennai Metro Water)",
    "PHE Department",
    "Society Borewell / Private Tanker",
  ],
  broadband: [
    "Airtel Xstream Fiber",
    "Jio Fiber / AirFiber",
    "ACT Fibernet",
    "Tata Play Fiber",
    "Hathway Broadband",
    "Excitel Fiber",
    "BSNL Bharat Fiber",
    "YOU Broadband",
    "Spectranet",
  ],
  mobile: [
    "Airtel Postpaid",
    "Jio Postpaid Plus",
    "Vi (Vodafone Idea) Postpaid",
    "BSNL Postpaid",
  ],
  cable_tv: [
    "Tata Play (Tata Sky)",
    "Airtel Digital TV",
    "Dish TV",
    "Sun Direct",
    "D2H (Videocon)",
    "Hathway Digital Cable",
  ],
  maintenance: [
    "Residential Society Maintenance",
    "Apartment Owners Association (AOA)",
    "RWA Monthly Charges",
    "Commercial Office Maintenance",
    "Clubhouse / Gym Facility Fees",
  ],
};

function catIcon(cat: string, size = 18) {
  const c = CAT_MAP[cat] || CAT_MAP.other;
  const { Icon, color } = c;
  return <Icon size={size} color={color} />;
}

const FREQUENCY_OPTIONS = [
  { value: "monthly", label: "Monthly", multiplier: 1 },
  { value: "bi_monthly", label: "Bi-Monthly (Every 2 mos)", multiplier: 0.5 },
  { value: "quarterly", label: "Quarterly (Every 3 mos)", multiplier: 1 / 3 },
  { value: "half_yearly", label: "Half-Yearly (Every 6 mos)", multiplier: 1 / 6 },
  { value: "annual", label: "Annually (Once a year)", multiplier: 1 / 12 },
];

const EMPTY_BILL = {
  category: "electricity",
  provider: "",
  accountNumber: "",
  nickname: "",
  amount: "",
  dueDay: "",
  frequency: "monthly",
  defaultPaymentSource: "",
  autoPay: false,
  owner: "self",
  portalUrl: "",
  notes: "",
};

const EMPTY_PAYMENT = {
  paidDate: today(),
  amount: "",
  unitsConsumed: "",
  paymentMethod: "UPI",
  linkedAccountId: "",
  receiptNumber: "",
  notes: "",
};

/* ─── Custom Tooltip for Charts ─── */
const ChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div
      style={{
        background: "color-mix(in srgb, var(--surface-0) 90%, transparent)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1px solid ${THEME.line}`,
        borderRadius: 10,
        padding: "8px 12px",
        boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
        fontSize: 12,
      }}
    >
      <div style={{ fontWeight: 800, color: THEME.ink, display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: data.color || THEME.accent }} />
        {data.name}
      </div>
      <div style={{ color: THEME.muted, marginTop: 4, fontWeight: 600 }}>
        {fmtINRFull(data.value)}/mo ({data.percentage?.toFixed(1)}%)
      </div>
      <div style={{ fontSize: 10, color: THEME.muted, marginTop: 2 }}>
        {data.count} bill{data.count !== 1 ? "s" : ""}
      </div>
    </div>
  );
};

/* ─── Bill Modal Form ─── */
function BillForm({ initial, state, onSave, onClose, saving = false }: any) {
  const { familyProfiles } = useMasterData();
  const [form, setForm] = useState({
    ...EMPTY_BILL,
    ...initial,
    frequency: initial?.frequency || "monthly",
    defaultPaymentSource: initial?.defaultPaymentSource || "",
  });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const banks = state?.bankAccounts || state?.banks || [];
  const creditCards = state?.creditCards || [];
  const currentPresets = PROVIDER_PRESETS[form.category] || [];

  const save = () => {
    if (!form.provider.trim() || !form.amount || !form.dueDay) return;
    onSave({
      ...form,
      provider: form.provider.trim(),
      amount: Number(form.amount),
      dueDay: Math.min(31, Math.max(1, Number(form.dueDay))),
      id: initial?.id || uid(),
    });
  };

  const g2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };

  return (
    <Modal title={initial?.id ? "Edit Utility Bill" : "Add Utility Bill"} onClose={onClose} maxWidth={580}>
      <ModalSection title="Service Details" first />
      <div style={g2}>
        <Field label="Category *">
          <select
            className="form-input"
            value={form.category}
            onChange={(e) => {
              set("category", e.target.value);
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Provider / Service Name *">
          <input
            className="form-input"
            list="provider-preset-list"
            value={form.provider}
            onChange={(e) => set("provider", e.target.value)}
            placeholder="e.g. Tata Power, BESCOM, Airtel"
          />
          <datalist id="provider-preset-list">
            {currentPresets.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>

        <Field label="Nickname / Identifier">
          <input
            className="form-input"
            value={form.nickname}
            onChange={(e) => set("nickname", e.target.value)}
            placeholder="e.g. Home Electricity, Office Wi-Fi"
          />
        </Field>

        <Field label="Consumer / Account No.">
          <input
            className="form-input"
            value={form.accountNumber}
            onChange={(e) => set("accountNumber", e.target.value)}
            placeholder="e.g. CA / Consumer / Sub-meter ID"
          />
        </Field>
      </div>

      <ModalSection title="Schedule & Billing Amount" />
      <div style={g2}>
        <Field label="Typical Bill Amount (₹) *">
          <input
            className="form-input"
            type="number"
            min={0}
            step="any"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="e.g. 2500"
          />
        </Field>

        <Field label="Due Day of Month (1-31) *">
          <input
            className="form-input"
            type="number"
            min={1}
            max={31}
            value={form.dueDay}
            onChange={(e) => set("dueDay", e.target.value)}
            placeholder="e.g. 15 (every month)"
          />
        </Field>

        <Field label="Billing Frequency">
          <select
            className="form-input"
            value={form.frequency}
            onChange={(e) => set("frequency", e.target.value)}
          >
            {FREQUENCY_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Online Payment Portal / URL">
          <input
            className="form-input"
            type="url"
            value={form.portalUrl}
            onChange={(e) => set("portalUrl", e.target.value)}
            placeholder="https://..."
          />
        </Field>
      </div>

      <ModalSection title="Payment Source & Automation" />
      <div style={g2}>
        <Field label="Default Payment Account (Auto-Sync)">
          <select
            className="form-input"
            value={form.defaultPaymentSource}
            onChange={(e) => set("defaultPaymentSource", e.target.value)}
          >
            <option value="">None (Select at payment time)</option>
            {banks.length > 0 && (
              <optgroup label="Bank Accounts (Auto-debits Banking Ledger)">
                {banks.map((b: any) => (
                  <option key={b.id} value={`bank:${b.id}`}>
                    {b.bankName} - {b.accountName || b.accountNumber || "Savings"}
                  </option>
                ))}
              </optgroup>
            )}
            {creditCards.length > 0 && (
              <optgroup label="Credit Cards (Auto-adds to Card Ledger)">
                {creditCards.map((c: any) => (
                  <option key={c.id} value={`cc:${c.id}`}>
                    {c.cardName || c.bank} Card
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </Field>

        <Field label="Owner Profile">
          <select
            className="form-input"
            value={form.owner}
            onChange={(e) => set("owner", e.target.value)}
          >
            <option value="self">Self</option>
            {familyProfiles?.map((p: any) => (
              <option key={p.id} value={p.id}>
                {formatProfileOption(p)}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div style={{ marginTop: 8 }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 700,
            color: THEME.ink,
          }}
        >
          <input
            type="checkbox"
            checked={form.autoPay}
            onChange={(e) => set("autoPay", e.target.checked)}
            style={{ accentColor: THEME.accent, width: 16, height: 16, cursor: "pointer" }}
          />
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <ShieldCheck size={14} color={THEME.sage} /> Auto-Debit / NACH Mandate Enabled
          </span>
        </label>
        <span style={{ fontSize: 11, color: THEME.muted, marginTop: 4, display: "block", paddingLeft: 24 }}>
          Bank / card mandate automatically settles this bill each month.
        </span>
      </div>

      <div style={{ marginTop: 12 }}>
        <Field label="Notes & Reference">
          <input
            className="form-input"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="e.g. Meter No. 44109B, 100 units subsidized"
          />
        </Field>
      </div>

      <ModalActions
        onSave={save}
        onClose={onClose}
        saveLabel={initial?.id ? "Save Changes" : "Add Bill"}
        disabled={saving || !form.provider.trim() || !form.amount || !form.dueDay}
        loading={saving}
      />
    </Modal>
  );
}

/* ─── Payment Form Modal ─── */
function PaymentForm({ bill, state, onSave, onClose, saving = false }: any) {
  const [form, setForm] = useState({
    ...EMPTY_PAYMENT,
    amount: bill?.amount ? String(bill.amount) : "",
    linkedAccountId: bill?.defaultPaymentSource || "",
    paymentMethod: bill?.defaultPaymentSource?.startsWith("cc:")
      ? "Credit Card"
      : bill?.defaultPaymentSource?.startsWith("bank:")
      ? "Net Banking"
      : bill?.autoPay
      ? "Auto-Debit / NACH"
      : "UPI",
  });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const banks = state?.bankAccounts || state?.banks || [];
  const creditCards = state?.creditCards || [];
  const cat = CAT_MAP[bill?.category] || CAT_MAP.other;

  const selectedBank = form.linkedAccountId?.startsWith("bank:")
    ? banks.find((b: any) => b.id === form.linkedAccountId.slice(5))
    : null;
  const selectedCC = form.linkedAccountId?.startsWith("cc:")
    ? creditCards.find((c: any) => c.id === form.linkedAccountId.slice(3))
    : null;

  const save = () => {
    if (!form.amount || !form.paidDate) return;
    onSave({
      ...form,
      id: uid(),
      billId: bill.id,
      amount: Number(form.amount),
      unitsConsumed: form.unitsConsumed ? Number(form.unitsConsumed) : undefined,
    });
  };

  const g2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ padding: 6, borderRadius: 8, background: `color-mix(in srgb, ${cat.color} 15%, transparent)` }}>
            {catIcon(bill?.category, 18)}
          </div>
          <span>Log Payment: {bill?.nickname || bill?.provider}</span>
        </div>
      }
      onClose={onClose}
      maxWidth={550}
    >
      <ModalSection title="Payment Details" first />
      <div style={g2}>
        <Field label="Payment Date *">
          <input
            className="form-input"
            type="date"
            value={form.paidDate}
            onChange={(e) => set("paidDate", e.target.value)}
          />
        </Field>

        <Field label="Amount Paid (₹) *">
          <input
            className="form-input"
            type="number"
            min={0}
            step="any"
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="e.g. 2450"
          />
        </Field>

        <Field label="Paid From Account (Auto-Syncs Ledger)">
          <select
            className="form-input"
            value={form.linkedAccountId}
            onChange={(e) => {
              const val = e.target.value;
              set("linkedAccountId", val);
              if (val.startsWith("cc:")) set("paymentMethod", "Credit Card");
              else if (val.startsWith("bank:")) set("paymentMethod", "Net Banking");
            }}
          >
            <option value="">None / External Cash / UPI</option>
            {banks.length > 0 && (
              <optgroup label="Bank Accounts (Auto-creates debit txn)">
                {banks.map((b: any) => (
                  <option key={b.id} value={`bank:${b.id}`}>
                    {b.bankName} - {b.accountName || b.accountNumber || "Savings"}
                  </option>
                ))}
              </optgroup>
            )}
            {creditCards.length > 0 && (
              <optgroup label="Credit Cards (Auto-adds card expense)">
                {creditCards.map((c: any) => (
                  <option key={c.id} value={`cc:${c.id}`}>
                    {c.cardName || c.bank} Card
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </Field>

        <Field label="Payment Method">
          <select
            className="form-input"
            value={form.paymentMethod}
            onChange={(e) => set("paymentMethod", e.target.value)}
          >
            {["UPI", "Credit Card", "Debit Card", "Net Banking", "Auto-Debit / NACH", "Cheque", "Cash"].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>

        <Field label={cat.unitLabel || "Units Consumed (Optional)"}>
          <input
            className="form-input"
            type="number"
            step="any"
            value={form.unitsConsumed}
            onChange={(e) => set("unitsConsumed", e.target.value)}
            placeholder={`e.g. 185 ${cat.unit}`}
          />
        </Field>

        <Field label="Receipt / Transaction Ref">
          <input
            className="form-input"
            value={form.receiptNumber}
            onChange={(e) => set("receiptNumber", e.target.value)}
            placeholder="e.g. UPI Ref / TXN-94021"
          />
        </Field>
      </div>

      {/* Auto-Sync Banner */}
      {selectedBank && (
        <div
          style={{
            marginTop: 12,
            padding: "8px 12px",
            background: `color-mix(in srgb, ${THEME.sage} 12%, var(--surface-1))`,
            border: `1px solid color-mix(in srgb, ${THEME.sage} 30%, transparent)`,
            borderRadius: "var(--radius-sm)",
            fontSize: 11,
            color: THEME.ink,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Landmark size={14} color={THEME.sage} />
          <span>
            <strong>Auto-Sync Active:</strong> A ₹{form.amount || "0"} debit transaction will automatically be recorded in{" "}
            <strong>{selectedBank.bankName}</strong>. No need to re-enter!
          </span>
        </div>
      )}

      {selectedCC && (
        <div
          style={{
            marginTop: 12,
            padding: "8px 12px",
            background: `color-mix(in srgb, ${THEME.cyan} 12%, var(--surface-1))`,
            border: `1px solid color-mix(in srgb, ${THEME.cyan} 30%, transparent)`,
            borderRadius: "var(--radius-sm)",
            fontSize: 11,
            color: THEME.ink,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <CreditCard size={14} color={THEME.cyan} />
          <span>
            <strong>Auto-Sync Active:</strong> A ₹{form.amount || "0"} charge will automatically be added to your{" "}
            <strong>{selectedCC.cardName || selectedCC.bank}</strong> Credit Card. No need to re-enter!
          </span>
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <Field label="Payment Remarks / Notes">
          <input
            className="form-input"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="e.g. Includes ₹50 late fee / Discount availed"
          />
        </Field>
      </div>

      <ModalActions
        onSave={save}
        onClose={onClose}
        saveLabel="Record Payment"
        disabled={saving || !form.amount || !form.paidDate}
        loading={saving}
      />
    </Modal>
  );
}

/* ─── Main BillPaymentTab Component ─── */
export function BillPaymentTab({ state, addItem, removeItem, updateItem, showToast }: any) {
  const { privacyMode } = usePrivacy();
  const bills: any[] = state.billPayments || [];
  const history: any[] = state.billPaymentHistory || [];
  const bankAccounts: any[] = state.bankAccounts || state.banks || [];
  const creditCards: any[] = state.creditCards || [];

  const [modal, setModal] = useState<any>(null);
  const [payModal, setPayModal] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"cards" | "calendar" | "table">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterAutoPay, setFilterAutoPay] = useState<"all" | "autopay" | "manual">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "due_soon" | "paid" | "overdue">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(
    null
  );

  /* Copy to clipboard with feedback */
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  /* Helper to retrieve sorted history for a bill */
  const billHistory = useCallback(
    (billId: string) =>
      history
        .filter((h) => h.billId === billId)
        .sort((a, b) => (b.paidDate || "").localeCompare(a.paidDate || "")),
    [history]
  );

  /* Helper to resolve source name */
  const getSourceLabel = useCallback(
    (sourceKey?: string) => {
      if (!sourceKey) return null;
      if (sourceKey.startsWith("bank:")) {
        const bankId = sourceKey.slice(5);
        const b = bankAccounts.find((x: any) => x.id === bankId);
        return b ? b.bankName : "Bank";
      }
      if (sourceKey.startsWith("cc:")) {
        const ccId = sourceKey.slice(3);
        const c = creditCards.find((x: any) => x.id === ccId);
        return c ? `${c.cardName || c.bank} Card` : "Credit Card";
      }
      return null;
    },
    [bankAccounts, creditCards]
  );

  /* Monthly outflow calculation accounting for frequency */
  const getMonthlyAmount = (b: any) => {
    const raw = Number(b.amount || 0);
    const freq = FREQUENCY_OPTIONS.find((f) => f.value === b.frequency);
    return raw * (freq ? freq.multiplier : 1);
  };

  const totalMonthly = useMemo(() => {
    return bills.reduce((sum, b) => sum + getMonthlyAmount(b), 0);
  }, [bills]);

  const autoPayBills = useMemo(() => bills.filter((b) => b.autoPay), [bills]);
  const autoPayPct = bills.length > 0 ? (autoPayBills.length / bills.length) * 100 : 0;

  /* Enriched Bills with Status and History */
  const enrichedBills = useMemo(() => {
    return bills.map((b: any) => {
      const bHistory = billHistory(b.id);
      const lastPaid = bHistory[0];
      const status = b.dueDay ? dueStatus(Number(b.dueDay), lastPaid?.paidDate) : null;
      const monthlyEquivalent = getMonthlyAmount(b);

      const totalPaidAllTime = bHistory.reduce((s, h) => s + Number(h.amount || 0), 0);
      const avgPaid = bHistory.length > 0 ? totalPaidAllTime / bHistory.length : Number(b.amount || 0);

      return {
        ...b,
        _history: bHistory,
        _lastPaid: lastPaid,
        _status: status,
        _monthlyEquivalent: monthlyEquivalent,
        _avgPaid: avgPaid,
      };
    });
  }, [bills, history, billHistory]);

  /* Upcoming due bills */
  const upcomingDue = useMemo(() => {
    return enrichedBills
      .filter((b) => b.dueDay && !b.autoPay && b._status && !b._status.paid && b._status.daysLeft <= 7)
      .sort((a, b) => a._status.daysLeft - b._status.daysLeft);
  }, [enrichedBills]);

  /* Overdue / Due Today bills */
  const urgentBills = useMemo(() => {
    return enrichedBills
      .filter((b) => b.dueDay && !b.autoPay && b._status && !b._status.paid && b._status.daysLeft <= 3)
      .sort((a, b) => a._status.daysLeft - b._status.daysLeft);
  }, [enrichedBills]);

  /* Current Month Paid vs Pending metrics */
  const monthMetrics = useMemo(() => {
    let paidCount = 0;
    let pendingCount = 0;
    let paidAmount = 0;
    let pendingAmount = 0;

    enrichedBills.forEach((b) => {
      if (b._status?.paid) {
        paidCount++;
        paidAmount += Number(b._lastPaid?.amount || b.amount || 0);
      } else {
        pendingCount++;
        pendingAmount += Number(b.amount || 0);
      }
    });

    const totalCycleAmount = paidAmount + pendingAmount;
    const paidPercentage = totalCycleAmount > 0 ? (paidAmount / totalCycleAmount) * 100 : 0;

    return { paidCount, pendingCount, paidAmount, pendingAmount, paidPercentage };
  }, [enrichedBills]);

  /* Category breakdown distribution */
  const categoryDistribution = useMemo(() => {
    const map: Record<string, { name: string; value: number; count: number; color: string }> = {};
    enrichedBills.forEach((b) => {
      const catKey = b.category || "other";
      const catConfig = CAT_MAP[catKey] || CAT_MAP.other;
      const amount = b._monthlyEquivalent || 0;

      if (!map[catKey]) {
        map[catKey] = {
          name: catConfig.label,
          value: 0,
          count: 0,
          color: catConfig.color,
        };
      }
      map[catKey].value += amount;
      map[catKey].count += 1;
    });

    return Object.values(map)
      .filter((item) => item.value > 0)
      .map((item) => ({
        ...item,
        percentage: totalMonthly > 0 ? (item.value / totalMonthly) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [enrichedBills, totalMonthly]);

  /* Filtered Bills */
  const filteredBills = useMemo(() => {
    return enrichedBills
      .filter((b: any) => {
        if (filterCategory !== "all" && b.category !== filterCategory) return false;
        if (filterAutoPay === "autopay" && !b.autoPay) return false;
        if (filterAutoPay === "manual" && b.autoPay) return false;
        if (filterStatus === "paid" && !b._status?.paid) return false;
        if (filterStatus === "due_soon" && (b._status?.paid || b._status?.daysLeft > 7)) return false;
        if (filterStatus === "overdue" && (b._status?.paid || b._status?.daysLeft > 3)) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchNick = (b.nickname || "").toLowerCase().includes(q);
          const matchProv = (b.provider || "").toLowerCase().includes(q);
          const matchAcc = (b.accountNumber || "").toLowerCase().includes(q);
          const matchNotes = (b.notes || "").toLowerCase().includes(q);
          if (!matchNick && !matchProv && !matchAcc && !matchNotes) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const da = a._status && !a._status.paid ? a._status.daysLeft : 999;
        const db = b._status && !b._status.paid ? b._status.daysLeft : 999;
        return da - db;
      });
  }, [enrichedBills, filterCategory, filterAutoPay, filterStatus, searchQuery]);

  /* 31-Day Due Date Grid mapping */
  const dayScheduleMap = useMemo(() => {
    const map = new Map<number, any[]>();
    for (let i = 1; i <= 31; i++) {
      map.set(i, []);
    }
    enrichedBills.forEach((b) => {
      const day = Number(b.dueDay);
      if (day >= 1 && day <= 31) {
        const list = map.get(day) || [];
        list.push(b);
        map.set(day, list);
      }
    });
    return map;
  }, [enrichedBills]);

  /* Actions: Save Bill */
  const { run: saveBill, loading: savingBill } = useAsyncAction(
    async (data: any) => {
      if (data.id && bills.find((b: any) => b.id === data.id)) {
        await updateItem("billPayments", data.id, data);
        showToast?.("Utility bill updated successfully", "success");
      } else {
        await addItem("billPayments", data);
        showToast?.("Utility bill added successfully", "success");
      }
    },
    {
      onSuccess: () => setModal(null),
      onError: (e: any) => showToast?.(`Failed to save bill: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  /* Actions: Save Payment with Automatic Cross-Module Sync */
  const { run: savePayment, loading: savingPayment } = useAsyncAction(
    async (data: any) => {
      const bill = bills.find((b: any) => b.id === data.billId) || payModal;
      const cat = CAT_MAP[bill?.category] || CAT_MAP.other;
      const paymentAmount = Number(data.amount);
      const linkedAccountId = data.linkedAccountId;
      const linkedTxnId = uid();

      // 1. Record in billPaymentHistory
      await addItem("billPaymentHistory", {
        ...data,
        linkedTxnId: linkedAccountId ? linkedTxnId : undefined,
      });

      // 2. Cross-post to Bank Account if linked
      if (linkedAccountId?.startsWith("bank:")) {
        const bankId = linkedAccountId.slice(5);
        const bank = bankAccounts.find((b: any) => b.id === bankId);
        if (bank) {
          await addItem("transactions", {
            id: linkedTxnId,
            owner: bill?.owner || "self",
            date: data.paidDate || today(),
            accountId: bankId,
            type: "debit",
            amount: paymentAmount,
            category: "Utilities",
            note: `${cat.label} Bill: ${bill?.nickname || bill?.provider}${data.receiptNumber ? ` (Ref: ${data.receiptNumber})` : ""}`,
            referenceNumber: data.receiptNumber || undefined,
            linkedType: "billPayments",
            linkedId: bill?.id,
          });
          showToast?.(`Payment of ₹${paymentAmount} logged & auto-debited in ${bank.bankName}`, "success");
          return;
        }
      }

      // 3. Cross-post to Credit Card if linked
      if (linkedAccountId?.startsWith("cc:")) {
        const ccId = linkedAccountId.slice(3);
        const card = creditCards.find((c: any) => c.id === ccId);
        if (card) {
          const newTxn = {
            id: linkedTxnId,
            date: data.paidDate || today(),
            merchant: `${cat.label}: ${bill?.nickname || bill?.provider}`,
            amount: String(paymentAmount),
            category: "Utilities",
          };
          await updateItem("creditCards", ccId, {
            transactions: [...(card.transactions || []), newTxn],
            outstanding: Number(card.outstanding || 0) + paymentAmount,
          });
          showToast?.(`Payment of ₹${paymentAmount} logged & added to ${card.cardName || card.bank} Card`, "success");
          return;
        }
      }

      showToast?.("Payment logged successfully", "success");
    },
    {
      onSuccess: () => setPayModal(null),
      onError: (e: any) => showToast?.(`Failed to save payment: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  /* Quick 1-Click Pay for standard typical amount with Auto-Sync */
  const { run: quickMarkPaid } = useAsyncAction(
    async (bill: any) => {
      const cat = CAT_MAP[bill.category] || CAT_MAP.other;
      const amount = Number(bill.amount || 0);
      const linkedAccountId = bill.defaultPaymentSource || "";
      const linkedTxnId = uid();

      // Record in billPaymentHistory
      await addItem("billPaymentHistory", {
        id: uid(),
        billId: bill.id,
        paidDate: today(),
        amount: amount,
        paymentMethod: linkedAccountId?.startsWith("cc:")
          ? "Credit Card"
          : linkedAccountId?.startsWith("bank:")
          ? "Net Banking"
          : bill.autoPay
          ? "Auto-Debit / NACH"
          : "UPI",
        linkedAccountId: linkedAccountId || undefined,
        linkedTxnId: linkedAccountId ? linkedTxnId : undefined,
        notes: "Quick recorded via 1-click pay",
      });

      // Auto-debit bank if linked
      if (linkedAccountId.startsWith("bank:")) {
        const bankId = linkedAccountId.slice(5);
        const bank = bankAccounts.find((b: any) => b.id === bankId);
        if (bank) {
          await addItem("transactions", {
            id: linkedTxnId,
            owner: bill.owner || "self",
            date: today(),
            accountId: bankId,
            type: "debit",
            amount: amount,
            category: "Utilities",
            note: `${cat.label} Bill: ${bill.nickname || bill.provider}`,
            linkedType: "billPayments",
            linkedId: bill.id,
          });
          showToast?.(`Logged ₹${amount} for ${bill.nickname || bill.provider} & auto-debited in ${bank.bankName}`, "success");
          return;
        }
      }

      // Auto-charge CC if linked
      if (linkedAccountId.startsWith("cc:")) {
        const ccId = linkedAccountId.slice(3);
        const card = creditCards.find((c: any) => c.id === ccId);
        if (card) {
          const newTxn = {
            id: linkedTxnId,
            date: today(),
            merchant: `${cat.label}: ${bill.nickname || bill.provider}`,
            amount: String(amount),
            category: "Utilities",
          };
          await updateItem("creditCards", ccId, {
            transactions: [...(card.transactions || []), newTxn],
            outstanding: Number(card.outstanding || 0) + amount,
          });
          showToast?.(`Logged ₹${amount} for ${bill.nickname || bill.provider} & charged to ${card.cardName || card.bank} Card`, "success");
          return;
        }
      }

      showToast?.(`Logged ₹${amount} payment for ${bill.nickname || bill.provider}`, "success");
    },
    { onError: (e: any) => showToast?.(`Failed to log payment: ${e?.message}`, "error") }
  );

  const { run: deleteBill } = useAsyncAction(
    async (id: string) => {
      await removeItem("billPayments", id);
      showToast?.("Utility bill removed", "info");
    },
    { onError: (e: any) => showToast?.(`Failed to delete bill: ${e?.message || "Unknown error"}`, "error") }
  );

  /* Delete payment with reverse auto-sync */
  const { run: deletePaymentRecord } = useAsyncAction(
    async (h: any) => {
      // 1. If linked to bank transaction, delete that transaction
      if (h.linkedAccountId?.startsWith("bank:") && h.linkedTxnId) {
        try {
          await removeItem("transactions", h.linkedTxnId);
        } catch {}
      }

      // 2. If linked to CC transaction, reverse outstanding
      if (h.linkedAccountId?.startsWith("cc:") && h.linkedTxnId) {
        const ccId = h.linkedAccountId.slice(3);
        const card = creditCards.find((c: any) => c.id === ccId);
        if (card) {
          try {
            const nextTxns = (card.transactions || []).filter((t: any) => t.id !== h.linkedTxnId);
            await updateItem("creditCards", ccId, {
              transactions: nextTxns,
              outstanding: Math.max(0, Number(card.outstanding || 0) - Number(h.amount || 0)),
            });
          } catch {}
        }
      }

      // 3. Remove payment record
      await removeItem("billPaymentHistory", h.id);
      showToast?.("Payment record removed & ledger reversed", "info");
    },
    {
      onError: (e: any) =>
        showToast?.(`Failed to delete payment record: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  return (
    <div className="tab-content-enter">
      {/* Top Header */}
      <SectionTitle
        sub="Monitor recurring utility expenses, track monthly due dates, consumption metrics, and automate payments"
        rightElement={
          bills.length > 0 && (
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="accent" icon={<Plus size={14} />} onClick={() => setModal({})}>
                Add Utility Bill
              </Button>
            </div>
          )
        }
      >
        Utility & Bill Payments
      </SectionTitle>

      {bills.length > 0 && (
        <>
          {/* Hero KPI Cockpit Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
              marginBottom: 20,
            }}
          >
            <StatCard
              label="Monthly Utility Outflow"
              value={fmtINRFull(totalMonthly)}
              numericValue={totalMonthly}
              formatValue={fmtINRFull}
              sub={`${bills.length} bills · ${privacyMode ? "••••" : fmtINRFull(totalMonthly * 12)}/year`}
              icon={<IndianRupee />}
              color={THEME.accent}
            />

            <StatCard
              label="This Month Settled"
              value={`${monthMetrics.paidCount} / ${bills.length}`}
              numericValue={monthMetrics.paidPercentage}
              formatValue={(v) => `${Math.round(v)}% paid`}
              sub={
                monthMetrics.pendingCount > 0
                  ? `${monthMetrics.pendingCount} pending (${privacyMode ? "••••" : fmtINRFull(monthMetrics.pendingAmount)})`
                  : "All current bills settled"
              }
              icon={<CheckCircle2 />}
              color={monthMetrics.pendingCount === 0 ? THEME.sage : THEME.cyan}
            />

            <StatCard
              label="Auto-Pay Protection"
              value={`${autoPayBills.length} of ${bills.length}`}
              numericValue={autoPayPct}
              formatValue={(n) => `${Math.round(n)}% on Auto-Pay`}
              sub={`${bills.length - autoPayBills.length} manual payments require action`}
              icon={<ShieldCheck />}
              color={THEME.sage}
            />

            <StatCard
              label="Due This Week"
              value={upcomingDue.length.toLocaleString("en-IN")}
              numericValue={upcomingDue.length}
              formatValue={(n) => Math.round(n).toLocaleString("en-IN")}
              sub={
                upcomingDue.length > 0
                  ? `${urgentBills.length} due within 3 days`
                  : "No urgent utility deadlines"
              }
              icon={<Clock />}
              color={urgentBills.length > 0 ? THEME.rust : upcomingDue.length > 0 ? THEME.gold : THEME.muted}
            />
          </div>

          {/* Urgent Deadlines Banner */}
          {upcomingDue.length > 0 && (
            <Card
              style={{
                marginBottom: 20,
                padding: "16px 20px",
                background: `linear-gradient(135deg, color-mix(in srgb, ${THEME.gold} 12%, var(--surface-0)), var(--surface-0))`,
                border: `1px solid color-mix(in srgb, ${THEME.gold} 35%, transparent)`,
                boxShadow: "0 4px 20px rgba(0,0,0,0.04)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{
                      padding: 6,
                      borderRadius: 8,
                      background: `color-mix(in srgb, ${THEME.gold} 20%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <AlertTriangle size={16} color={THEME.gold} />
                  </div>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: 13, color: THEME.ink }}>
                      Upcoming Utility Deadlines: {upcomingDue.length} Bill{upcomingDue.length !== 1 ? "s" : ""} Due Soon
                    </span>
                    <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 500 }}>
                      Pay before the due date to prevent late fees or service disconnection.
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: 10,
                }}
              >
                {upcomingDue.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--surface-0)",
                      border: `1px solid ${THEME.line}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          background: `color-mix(in srgb, ${CAT_MAP[b.category]?.color || THEME.accent} 15%, transparent)`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {catIcon(b.category, 16)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: THEME.ink,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {b.nickname || b.provider}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: b._status?.color }}>
                          {b._status?.label} · <Money value={Number(b.amount)} variant="full" />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => quickMarkPaid(b)}
                        style={{ padding: "4px 8px", fontSize: 11 }}
                        title="1-click mark as paid for typical amount"
                      >
                        1-Click Pay
                      </Button>
                      <Button
                        size="sm"
                        variant="accent"
                        onClick={() => setPayModal(b)}
                        style={{ padding: "4px 10px", fontSize: 11 }}
                      >
                        Log
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Category Analytics & Monthly Settlement Progress Card */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 16,
              marginBottom: 20,
            }}
          >
            {/* Category Spend Breakdown */}
            <Card style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <PieIcon size={16} color={THEME.accent} />
                  <span style={{ fontWeight: 800, fontSize: 13, color: THEME.ink }}>
                    Utility Spend Distribution
                  </span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: THEME.muted }}>
                  {categoryDistribution.length} Categories
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                {categoryDistribution.length > 0 ? (
                  <>
                    <div style={{ width: 130, height: 130, flexShrink: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryDistribution}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={36}
                            outerRadius={58}
                            paddingAngle={3}
                          >
                            {categoryDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip content={<ChartTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={{ flex: 1, minWidth: 160, display: "flex", flexDirection: "column", gap: 8 }}>
                      {categoryDistribution.slice(0, 4).map((c) => (
                        <div
                          key={c.name}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            fontSize: 12,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: c.color }} />
                            <span style={{ fontWeight: 600, color: THEME.ink }}>{c.name}</span>
                          </div>
                          <div style={{ fontWeight: 700, color: THEME.ink }}>
                            <Money value={c.value} variant="full" />
                            <span style={{ fontSize: 10, color: THEME.muted, marginLeft: 4 }}>
                              ({c.percentage.toFixed(0)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ color: THEME.muted, fontSize: 12, textAlign: "center", width: "100%", padding: "20px 0" }}>
                    No utility bills to calculate distribution
                  </div>
                )}
              </div>
            </Card>

            {/* Current Month Settlement Progress */}
            <Card style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <CheckCheck size={16} color={THEME.sage} />
                  <span style={{ fontWeight: 800, fontSize: 13, color: THEME.ink }}>
                    Cycle Settlement Progress
                  </span>
                </div>
                <Badge variant={monthMetrics.pendingCount === 0 ? "sage" : "gold"}>
                  {monthMetrics.paidCount} / {bills.length} Paid
                </Badge>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: THEME.muted, fontWeight: 600 }}>Settlement Ratio</span>
                  <span style={{ fontWeight: 800, color: THEME.ink }}>{monthMetrics.paidPercentage.toFixed(0)}%</span>
                </div>
                <div
                  style={{
                    height: 8,
                    borderRadius: 4,
                    background: "var(--surface-2)",
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${monthMetrics.paidPercentage}%`,
                      background: `linear-gradient(90deg, ${THEME.accent}, ${THEME.sage})`,
                      borderRadius: 4,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginTop: 14,
                  paddingTop: 12,
                  borderTop: `1px solid ${THEME.line}`,
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Paid this Cycle</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: THEME.sage, marginTop: 2 }}>
                    <Money value={monthMetrics.paidAmount} variant="full" />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>Pending Outflow</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: monthMetrics.pendingAmount > 0 ? THEME.gold : THEME.muted, marginTop: 2 }}>
                    <Money value={monthMetrics.pendingAmount} variant="full" />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Unified Controls Bar */}
          <Card
            style={{
              padding: "14px 18px",
              marginBottom: 20,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {/* Upper row: View switcher & Search */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              {/* View Mode Buttons */}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button
                  onClick={() => setViewMode("cards")}
                  className={`demat-portfolio-pill ${viewMode === "cards" ? "active" : ""}`}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", fontWeight: 700 }}
                >
                  <LayoutGrid size={14} /> Bill Cards
                </button>
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`demat-portfolio-pill ${viewMode === "calendar" ? "active" : ""}`}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", fontWeight: 700 }}
                >
                  <CalendarDays size={14} /> Due Calendar
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`demat-portfolio-pill ${viewMode === "table" ? "active" : ""}`}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", fontWeight: 700 }}
                >
                  <TableIcon size={14} /> Table View
                </button>
              </div>

              {/* Search & Auto-pay Quick Filters */}
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ position: "relative", minWidth: 200 }}>
                  <Search
                    size={14}
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
                    placeholder="Search by provider, nickname, consumer ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "7px 10px 7px 32px",
                      borderRadius: "var(--radius-sm)",
                      border: `1px solid ${THEME.line}`,
                      background: "var(--surface-1)",
                      color: THEME.ink,
                      fontSize: 12,
                      outline: "none",
                    }}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      style={{
                        position: "absolute",
                        right: 8,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: THEME.muted,
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e: any) => setFilterStatus(e.target.value)}
                  className="form-input"
                  style={{ padding: "6px 10px", fontSize: 12, width: "auto" }}
                >
                  <option value="all">All Statuses</option>
                  <option value="due_soon">Due Soon / Pending</option>
                  <option value="overdue">Urgent (≤ 3d)</option>
                  <option value="paid">Settled / Paid</option>
                </select>

                {/* Auto-pay Toggle */}
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {(
                    [
                      { id: "all", label: "All" },
                      { id: "autopay", label: "Auto-Pay" },
                      { id: "manual", label: "Manual" },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFilterAutoPay(f.id)}
                      className={`demat-portfolio-pill ${filterAutoPay === f.id ? "active" : ""}`}
                      style={{ fontSize: 11, padding: "5px 10px", fontWeight: 700 }}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Lower row: Category Chips Filter */}
            <div
              style={{
                display: "flex",
                gap: 6,
                alignItems: "center",
                flexWrap: "wrap",
                paddingTop: 8,
                borderTop: `1px solid ${THEME.line}`,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, marginRight: 4, textTransform: "uppercase" }}>
                Category:
              </span>
              <button
                onClick={() => setFilterCategory("all")}
                className={`demat-portfolio-pill ${filterCategory === "all" ? "active" : ""}`}
                style={{ fontSize: 11, padding: "4px 10px", fontWeight: 700 }}
              >
                All ({bills.length})
              </button>
              {CATEGORIES.map((c) => {
                const count = bills.filter((b) => b.category === c.value).length;
                if (count === 0 && filterCategory !== c.value) return null;
                const { Icon } = c;
                return (
                  <button
                    key={c.value}
                    onClick={() => setFilterCategory(c.value)}
                    className={`demat-portfolio-pill ${filterCategory === c.value ? "active" : ""}`}
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontWeight: 700,
                    }}
                  >
                    <Icon size={12} color={filterCategory === c.value ? "inherit" : c.color} />
                    {c.label} ({count})
                  </button>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {/* Main View Area */}
      {bills.length === 0 ? (
        <EmptyState
          icon={Zap}
          gradient={`linear-gradient(135deg, ${THEME.accent} 0%, color-mix(in srgb, ${THEME.accent} 55%, white) 100%)`}
          dotColor={THEME.accent}
          title="No Utility Bills Tracked Yet"
          description="Add your recurring household utilities (Electricity, Gas, Water, Broadband, Society Maintenance) to stay on top of due dates and avoid penalties."
          pills={[
            "Electricity / Piped Gas / Water",
            "High-Speed Broadband & DTH",
            "Society Maintenance & Charges",
            "Auto-Pay Tracking & Due Alerts",
            "Consumption Unit Analytics",
          ]}
          buttonLabel="Add Your First Bill"
          onAdd={() => setModal({})}
        />
      ) : filteredBills.length === 0 ? (
        <Card style={{ padding: 48, textAlign: "center" }}>
          <AlertCircle size={32} color={THEME.muted} style={{ margin: "0 auto 12px" }} />
          <div style={{ color: THEME.ink, fontSize: 15, fontWeight: 800 }}>No bills match your criteria</div>
          <div style={{ color: THEME.muted, fontSize: 12, marginTop: 4 }}>
            Try resetting your search query or category filters.
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearchQuery("");
              setFilterCategory("all");
              setFilterAutoPay("all");
              setFilterStatus("all");
            }}
            style={{ marginTop: 14 }}
          >
            Clear All Filters
          </Button>
        </Card>
      ) : viewMode === "calendar" ? (
        /* ─── INTERACTIVE DUE CALENDAR VIEW ─── */
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card style={{ padding: "20px 22px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: THEME.ink, display: "flex", alignItems: "center", gap: 8 }}>
                  <Calendar size={18} color={THEME.accent} />
                  Monthly Due Date Matrix (Day 1 - 31)
                </div>
                <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                  Click on any active calendar day to inspect bills and record payments.
                </div>
              </div>

              {selectedCalendarDay !== null && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedCalendarDay(null)}
                  style={{ fontSize: 11 }}
                >
                  Show All Days
                </Button>
              )}
            </div>

            {/* 31-Day Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
                gap: 10,
              }}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                const dayBills = dayScheduleMap.get(day) || [];
                const hasBills = dayBills.length > 0;
                const isSelected = selectedCalendarDay === day;
                const hasPending = dayBills.some((b) => !b._status?.paid);
                const isToday = new Date().getDate() === day;

                return (
                  <div
                    key={day}
                    onClick={() => hasBills && setSelectedCalendarDay(isSelected ? null : day)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "var(--radius-md)",
                      background: isSelected
                        ? `color-mix(in srgb, ${THEME.accent} 15%, var(--surface-0))`
                        : isToday
                        ? `color-mix(in srgb, ${THEME.gold} 10%, var(--surface-1))`
                        : hasBills
                        ? "var(--surface-0)"
                        : "var(--surface-1)",
                      border: isSelected
                        ? `2px solid ${THEME.accent}`
                        : isToday
                        ? `1.5px solid ${THEME.gold}`
                        : hasBills
                        ? `1px solid ${THEME.line}`
                        : `1px dashed color-mix(in srgb, ${THEME.line} 50%, transparent)`,
                      cursor: hasBills ? "pointer" : "default",
                      opacity: hasBills ? 1 : 0.65,
                      transition: "all 0.15s ease",
                      minHeight: 85,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span
                        style={{
                          fontWeight: 800,
                          fontSize: 14,
                          color: isToday ? THEME.gold : hasBills ? THEME.ink : THEME.muted,
                        }}
                      >
                        {day}
                        <span style={{ fontSize: 9, fontWeight: 600, color: THEME.muted }}>
                          {day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"}
                        </span>
                      </span>
                      {isToday && (
                        <Badge variant="gold" style={{ fontSize: 9, padding: "1px 5px" }}>
                          Today
                        </Badge>
                      )}
                      {!isToday && hasBills && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: hasPending ? THEME.gold : THEME.sage,
                          }}
                        >
                          {dayBills.length} bill{dayBills.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {hasBills ? (
                      <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
                        {dayBills.slice(0, 2).map((b) => {
                          const cat = CAT_MAP[b.category] || CAT_MAP.other;
                          return (
                            <div
                              key={b.id}
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: THEME.ink,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{b.nickname || b.provider}</span>
                            </div>
                          );
                        })}
                        {dayBills.length > 2 && (
                          <div style={{ fontSize: 9, color: THEME.muted, fontWeight: 700 }}>
                            +{dayBills.length - 2} more
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ fontSize: 10, color: THEME.muted }}>No bills due</div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Selected Day Bills Detail Panel */}
          {selectedCalendarDay !== null && (
            <Card style={{ padding: "18px 20px", borderLeft: `4px solid ${THEME.accent}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>
                  Bills Scheduled for Day {selectedCalendarDay} ({dayScheduleMap.get(selectedCalendarDay)?.length || 0})
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelectedCalendarDay(null)}>
                  Close Details
                </Button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                {dayScheduleMap.get(selectedCalendarDay)?.map((b) => {
                  const cat = CAT_MAP[b.category] || CAT_MAP.other;
                  const sourceLabel = getSourceLabel(b.defaultPaymentSource);
                  return (
                    <div
                      key={b.id}
                      style={{
                        padding: "12px 14px",
                        background: "var(--surface-1)",
                        borderRadius: "var(--radius-md)",
                        border: `1px solid ${THEME.line}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: `color-mix(in srgb, ${cat.color} 15%, transparent)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {catIcon(b.category, 18)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: THEME.ink }}>{b.nickname || b.provider}</div>
                          <div style={{ fontSize: 11, color: THEME.muted }}>
                            <Money value={Number(b.amount)} variant="full" /> · {b.autoPay ? "Auto-Pay" : "Manual"}
                            {sourceLabel && ` · ${sourceLabel}`}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 6 }}>
                        <Button size="sm" variant="ghost" onClick={() => quickMarkPaid(b)} style={{ fontSize: 11 }}>
                          1-Click Pay
                        </Button>
                        <Button size="sm" variant="accent" onClick={() => setPayModal(b)} style={{ fontSize: 11 }}>
                          Log Pay
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      ) : viewMode === "table" ? (
        /* ─── DENSE DATA TABLE VIEW ─── */
        <Card style={{ overflow: "hidden", marginBottom: 20 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface-1)", borderBottom: `1.5px solid ${THEME.line}` }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Bill / Service
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Category
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Typical Amount
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Due Day
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Payment Source
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Cycle Status
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Auto-Pay
                  </th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((b: any) => {
                  const cat = CAT_MAP[b.category] || CAT_MAP.other;
                  const status = b._status;
                  const sourceLabel = getSourceLabel(b.defaultPaymentSource);

                  return (
                    <tr
                      key={b.id}
                      style={{
                        borderBottom: `1px solid ${THEME.line}`,
                        transition: "background 0.15s ease",
                      }}
                    >
                      <td style={{ padding: "14px 16px", fontWeight: 700, color: THEME.ink }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              padding: 7,
                              borderRadius: 8,
                              background: `color-mix(in srgb, ${cat.color} 14%, transparent)`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {catIcon(b.category, 16)}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 800 }}>{b.nickname || b.provider}</div>
                            {b.accountNumber && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: THEME.muted,
                                  fontWeight: 500,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  marginTop: 2,
                                }}
                              >
                                <span>#{b.accountNumber}</span>
                                <button
                                  onClick={() => handleCopy(b.accountNumber, b.id)}
                                  title="Copy Consumer ID"
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: copiedId === b.id ? THEME.sage : THEME.muted,
                                    padding: 0,
                                  }}
                                >
                                  {copiedId === b.id ? <Check size={11} /> : <Copy size={11} />}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: "14px 16px", color: THEME.muted, fontSize: 12, fontWeight: 600 }}>
                        {cat.label}
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 800 }}>
                        <Money value={Number(b.amount)} variant="full" />
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 700 }}>
                        {b.dueDay ? `Day ${b.dueDay}` : "—"}
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "center", fontSize: 11 }}>
                        {sourceLabel ? (
                          <span
                            style={{
                              fontWeight: 700,
                              color: THEME.ink,
                              background: "var(--surface-1)",
                              padding: "2px 8px",
                              borderRadius: 4,
                            }}
                          >
                            {sourceLabel}
                          </span>
                        ) : (
                          <span style={{ color: THEME.muted }}>Manual</span>
                        )}
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        {status && (
                          <Badge
                            variant={
                              status.paid
                                ? "sage"
                                : status.daysLeft <= 3
                                ? "rust"
                                : status.daysLeft <= 7
                                ? "gold"
                                : "sage"
                            }
                          >
                            {status.label}
                          </Badge>
                        )}
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        {b.autoPay ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: THEME.sage,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <ShieldCheck size={13} /> Active
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: THEME.muted }}>Manual</span>
                        )}
                      </td>

                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => quickMarkPaid(b)}
                            style={{ padding: "4px 8px", fontSize: 11 }}
                            title="1-click mark as paid & auto-sync to bank/card"
                          >
                            Quick Pay
                          </Button>
                          <Button
                            size="sm"
                            variant="accent"
                            onClick={() => setPayModal(b)}
                            style={{ padding: "4px 8px", fontSize: 11 }}
                          >
                            Log
                          </Button>
                          <button
                            onClick={() => setModal(b)}
                            title="Edit Bill"
                            className="icon-btn"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: THEME.muted,
                              padding: 4,
                            }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() =>
                              setConfirmAction({
                                message: `Delete "${b.nickname || b.provider}"? This will also remove scheduled due alerts.`,
                                onConfirm: () => deleteBill(b.id),
                              })
                            }
                            title="Delete Bill"
                            className="icon-btn danger"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: THEME.rust,
                              padding: 4,
                            }}
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
      ) : (
        /* ─── RICH BILL CARDS VIEW (DEFAULT) ─── */
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filteredBills.map((b: any) => {
            const cat = CAT_MAP[b.category] || CAT_MAP.other;
            const bHistory = b._history;
            const isExpanded = expanded === b.id;
            const lastPaid = b._lastPaid;
            const status = b._status;
            const freq = FREQUENCY_OPTIONS.find((f) => f.value === b.frequency) || FREQUENCY_OPTIONS[0];
            const sourceLabel = getSourceLabel(b.defaultPaymentSource);

            return (
              <Card
                key={b.id}
                className="card-lift"
                style={{
                  borderLeft: `4px solid ${cat.color}`,
                  padding: "18px 22px",
                  position: "relative",
                  transition: "all 0.2s ease",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    flexWrap: "wrap",
                  }}
                >
                  {/* Category Visual Icon */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: `color-mix(in srgb, ${cat.color} 14%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${cat.color} 30%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {catIcon(b.category, 22)}
                  </div>

                  {/* Bill Details */}
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 800, fontSize: 16, color: THEME.ink }}>
                        {b.nickname || b.provider}
                      </span>
                      {b.autoPay && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: THEME.sage,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                            background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                            padding: "2px 6px",
                            borderRadius: 4,
                          }}
                        >
                          <ShieldCheck size={12} /> Auto-Pay
                        </span>
                      )}
                      {sourceLabel && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: THEME.accent,
                            background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
                            padding: "2px 6px",
                            borderRadius: 4,
                          }}
                          title="Auto-syncs ledger on payment"
                        >
                          {sourceLabel}
                        </span>
                      )}
                      {b.portalUrl && (
                        <a
                          href={b.portalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open payment portal"
                          style={{
                            color: THEME.accent,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 2,
                            fontSize: 11,
                            fontWeight: 600,
                            textDecoration: "none",
                          }}
                        >
                          <ExternalLink size={12} /> Portal
                        </a>
                      )}
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: THEME.muted,
                        fontWeight: 600,
                        marginTop: 4,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span>{cat.label}</span>
                      <span>·</span>
                      <span>{b.provider}</span>
                      {b.accountNumber && (
                        <>
                          <span>·</span>
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              background: "var(--surface-1)",
                              padding: "1px 6px",
                              borderRadius: 4,
                              fontSize: 11,
                            }}
                          >
                            ID: {b.accountNumber}
                            <button
                              onClick={() => handleCopy(b.accountNumber, b.id)}
                              title="Copy Consumer ID"
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: copiedId === b.id ? THEME.sage : THEME.muted,
                                padding: 0,
                                display: "inline-flex",
                                alignItems: "center",
                              }}
                            >
                              {copiedId === b.id ? <Check size={11} /> : <Copy size={11} />}
                            </button>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Typical Amount & Due Schedule */}
                  <div style={{ textAlign: "right", minWidth: 120 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 17, color: THEME.ink }}>
                      <Money value={Number(b.amount)} variant="full" />
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, marginTop: 2 }}>
                      {b.dueDay ? `Due on Day ${b.dueDay}` : ""} · {freq.label.split(" ")[0]}
                    </div>
                  </div>

                  {/* Status Badge */}
                  {status && (
                    <Badge
                      variant={
                        status.paid
                          ? "sage"
                          : status.daysLeft <= 3
                          ? "rust"
                          : status.daysLeft <= 7
                          ? "gold"
                          : "sage"
                      }
                    >
                      {status.label}
                    </Badge>
                  )}

                  {/* Action Cluster */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => quickMarkPaid(b)}
                      style={{ padding: "6px 10px", fontSize: 11 }}
                      title="1-click mark as paid & auto-sync to bank/card"
                    >
                      Quick Pay
                    </Button>

                    <Button
                      size="sm"
                      variant="accent"
                      onClick={() => setPayModal(b)}
                      style={{ padding: "6px 12px", fontSize: 12 }}
                    >
                      Log Payment
                    </Button>

                    <button
                      onClick={() => setExpanded(isExpanded ? null : b.id)}
                      aria-label={isExpanded ? "Collapse history" : "Expand history"}
                      className="icon-btn"
                      title={isExpanded ? "Hide history" : "View payment history"}
                      style={{
                        background: "var(--surface-1)",
                        border: `1px solid ${THEME.line}`,
                        cursor: "pointer",
                        color: THEME.muted,
                        padding: 7,
                        borderRadius: 6,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    <button
                      onClick={() => setModal(b)}
                      aria-label="Edit bill"
                      className="icon-btn"
                      title="Edit Bill"
                      style={{
                        background: "var(--surface-1)",
                        border: `1px solid ${THEME.line}`,
                        cursor: "pointer",
                        color: THEME.muted,
                        padding: 7,
                        borderRadius: 6,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Pencil size={14} />
                    </button>

                    <button
                      onClick={() =>
                        setConfirmAction({
                          message: `Delete "${b.nickname || b.provider}"? This cannot be undone.`,
                          onConfirm: () => deleteBill(b.id),
                        })
                      }
                      aria-label="Delete bill"
                      className="icon-btn danger"
                      title="Delete Bill"
                      style={{
                        background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${THEME.rust} 20%, transparent)`,
                        cursor: "pointer",
                        color: THEME.rust,
                        padding: 7,
                        borderRadius: 6,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Expanded Payment History Timeline & Consumption Stats */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 16,
                      borderTop: `1px solid ${THEME.line}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          color: THEME.muted,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                        }}
                      >
                        Payment & Consumption Ledger ({bHistory.length} records)
                      </div>
                      {bHistory.length > 0 && (
                        <div style={{ fontSize: 11, color: THEME.muted }}>
                          Avg Payment: <span style={{ fontWeight: 700, color: THEME.ink }}>{fmtINRFull(b._avgPaid)}</span>
                        </div>
                      )}
                    </div>

                    {bHistory.length === 0 ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: THEME.muted,
                          textAlign: "center",
                          padding: "16px 0",
                          background: "var(--surface-1)",
                          borderRadius: "var(--radius-md)",
                        }}
                      >
                        No past payment history logged yet for this utility.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {bHistory.slice(0, 8).map((h: any) => {
                          const linkedSource = getSourceLabel(h.linkedAccountId);
                          return (
                            <div
                              key={h.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "10px 14px",
                                background: "var(--surface-1)",
                                borderRadius: "var(--radius-sm)",
                                fontSize: 12,
                                gap: 12,
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                <CheckCircle2 size={14} color={THEME.sage} />
                                <span style={{ fontWeight: 700, color: THEME.ink }}>
                                  {new Date(`${h.paidDate}T00:00:00`).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                                {h.paymentMethod && <Badge variant="muted" style={{ fontSize: 10 }}>{h.paymentMethod}</Badge>}
                                {linkedSource && (
                                  <span style={{ fontSize: 10, fontWeight: 700, color: THEME.accent }}>
                                    {linkedSource}
                                  </span>
                                )}
                                {h.unitsConsumed && (
                                  <span
                                    style={{
                                      color: THEME.accent,
                                      fontWeight: 700,
                                      background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
                                      padding: "1px 6px",
                                      borderRadius: 4,
                                      fontSize: 11,
                                    }}
                                  >
                                    {h.unitsConsumed} {cat.unit}
                                  </span>
                                )}
                                {h.receiptNumber && (
                                  <span style={{ color: THEME.muted, fontSize: 11 }}>Ref: {h.receiptNumber}</span>
                                )}
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <span style={{ fontWeight: 800, color: THEME.ink, fontSize: 13 }}>
                                  <Money value={Number(h.amount)} variant="full" />
                                </span>
                                <button
                                  onClick={() =>
                                    setConfirmAction({
                                      message: `Delete payment record from ${h.paidDate} (₹${h.amount})? This will also reverse the synced bank/card entry.`,
                                      onConfirm: () => deletePaymentRecord(h),
                                    })
                                  }
                                  title="Delete payment record & reverse auto-sync"
                                  className="icon-btn danger"
                                  style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 3 }}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Modals & Dialogs */}
      {modal !== null && (
        <BillForm
          initial={modal?.id ? modal : undefined}
          state={state}
          onSave={saveBill}
          onClose={() => setModal(null)}
          saving={savingBill}
        />
      )}

      {payModal !== null && (
        <PaymentForm
          bill={payModal}
          state={state}
          onSave={savePayment}
          onClose={() => setPayModal(null)}
          saving={savingPayment}
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
