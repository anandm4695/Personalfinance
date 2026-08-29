// @ts-nocheck
import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { fmtINRFull, uid, today } from "../../utils/finance";
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

const CATEGORIES = [
  { value: "electricity", label: "Electricity", Icon: Zap, color: THEME.gold },
  { value: "gas", label: "Gas / Piped Gas", Icon: Flame, color: THEME.rust },
  { value: "water", label: "Water", Icon: Droplets, color: THEME.cyan },
  { value: "broadband", label: "Broadband / Internet", Icon: Wifi, color: THEME.violet },
  { value: "mobile", label: "Mobile / Postpaid", Icon: Phone, color: THEME.sage },
  { value: "cable_tv", label: "Cable TV / DTH", Icon: Tv, color: THEME.pink },
  { value: "maintenance", label: "Society Maintenance", Icon: Building, color: THEME.accent },
  { value: "other", label: "Other", Icon: IndianRupee, color: THEME.muted },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

function catIcon(cat: string, size = 18) {
  const c = CAT_MAP[cat] || CAT_MAP.other;
  const { Icon, color } = c;
  return <Icon size={size} color={color} />;
}

const EMPTY_BILL = {
  category: "electricity",
  provider: "",
  accountNumber: "",
  nickname: "",
  amount: "",
  dueDay: "",
  autoPay: false,
  owner: "self",
  notes: "",
};

const EMPTY_PAYMENT = {
  paidDate: today(),
  amount: "",
  unitsConsumed: "",
  paymentMethod: "",
  receiptNumber: "",
  notes: "",
};

function BillForm({ initial, onSave, onClose, saving = false }: any) {
  const { familyProfiles } = useMasterData();
  const [form, setForm] = useState({ ...EMPTY_BILL, ...initial });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.provider || !form.amount || !form.dueDay) return;
    onSave({
      ...form,
      amount: Number(form.amount),
      dueDay: Number(form.dueDay),
      id: initial?.id || uid(),
    });
  };

  const g2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };

  return (
    <Modal title={initial?.id ? "Edit Bill" : "Add Bill"} onClose={onClose} maxWidth={560}>
      <ModalSection title="Bill Details" first />
      <div style={g2}>
        <Field label="Category *">
          <select
            className="form-input"
            value={form.category}
            onChange={(e) => set("category", e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Provider / Company *">
          <input
            className="form-input"
            value={form.provider}
            onChange={(e) => set("provider", e.target.value)}
            placeholder="e.g. MSEDCL, Tata Power, Airtel"
          />
        </Field>
        <Field label="Nickname">
          <input
            className="form-input"
            value={form.nickname}
            onChange={(e) => set("nickname", e.target.value)}
            placeholder="e.g. Home Electricity, Office Wi-Fi"
          />
        </Field>
        <Field label="Account / Consumer No.">
          <input
            className="form-input"
            value={form.accountNumber}
            onChange={(e) => set("accountNumber", e.target.value)}
            placeholder="Consumer/Account number"
          />
        </Field>
      </div>

      <ModalSection title="Billing Schedule" />
      <div style={g2}>
        <Field label="Typical Amount (₹) *">
          <input
            className="form-input"
            type="number"
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
            placeholder="e.g. 15"
          />
        </Field>
      </div>

      <ModalSection title="Settings & Owner" />
      <div style={g2}>
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
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 26 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={form.autoPay}
              onChange={(e) => set("autoPay", e.target.checked)}
              style={{ accentColor: THEME.accent }}
            />
            Auto-pay Enabled
          </label>
        </div>
      </div>

      <ModalActions onSave={save} onClose={onClose} saveLabel={initial?.id ? "Save Changes" : "Add Bill"} disabled={saving} loading={saving} />
    </Modal>
  );
}

function PaymentForm({ bill, onSave, onClose, saving = false }: any) {
  const [form, setForm] = useState({
    ...EMPTY_PAYMENT,
    amount: bill?.amount ? String(bill.amount) : "",
  });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.amount || !form.paidDate) return;
    onSave({
      ...form,
      id: uid(),
      billId: bill.id,
      amount: Number(form.amount),
    });
  };

  const g2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 };

  return (
    <Modal title={`Log Payment for ${bill.nickname || bill.provider}`} onClose={onClose} maxWidth={520}>
      <ModalSection title="Payment Details" first />
      <div style={g2}>
        <Field label="Paid Date *">
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
            value={form.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="e.g. 2450"
          />
        </Field>
        {(bill.category === "electricity" || bill.category === "water" || bill.category === "gas") && (
          <Field label="Units Consumed (Optional)">
            <input
              className="form-input"
              type="number"
              value={form.unitsConsumed}
              onChange={(e) => set("unitsConsumed", e.target.value)}
              placeholder="kWh / cubic m"
            />
          </Field>
        )}
        <Field label="Payment Method">
          <select
            className="form-input"
            value={form.paymentMethod}
            onChange={(e) => set("paymentMethod", e.target.value)}
          >
            <option value="">Select</option>
            {["UPI", "Credit Card", "Debit Card", "NEFT/IMPS", "Net Banking", "Auto-debit", "Cash"].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Receipt / Ref No.">
          <input
            className="form-input"
            value={form.receiptNumber}
            onChange={(e) => set("receiptNumber", e.target.value)}
            placeholder="Optional reference"
          />
        </Field>
      </div>
      <ModalActions onSave={save} onClose={onClose} saveLabel="Log Payment" disabled={saving} loading={saving} />
    </Modal>
  );
}

export function BillPaymentTab({ state, addItem, removeItem, updateItem, showToast }: any) {
  const { privacyMode } = usePrivacy();
  const bills: any[] = state.billPayments || [];
  const history: any[] = state.billPaymentHistory || [];
  const [modal, setModal] = useState<any>(null);
  const [payModal, setPayModal] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"cards" | "calendar" | "table">("cards");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterAutoPay, setFilterAutoPay] = useState<"all" | "autopay" | "manual">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(
    null
  );

  const totalMonthly = bills.reduce((s, b) => s + Number(b.amount || 0), 0);
  const autoPayBills = bills.filter((b) => b.autoPay);
  const autoPayPct = bills.length > 0 ? (autoPayBills.length / bills.length) * 100 : 0;

  const billHistory = (billId: string) =>
    history
      .filter((h) => h.billId === billId)
      .sort((a, b) => (b.paidDate || "").localeCompare(a.paidDate || ""));

  const upcomingDue = useMemo(() => {
    return bills
      .filter((b) => b.dueDay && !b.autoPay)
      .map((b) => ({ ...b, ...dueStatus(Number(b.dueDay), billHistory(b.id)[0]?.paidDate) }))
      .filter((b) => !b.paid && b.daysLeft <= 7)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [bills, history]);

  const sortedBills = useMemo(() => {
    return bills
      .map((b: any) => {
        const bHistory = billHistory(b.id);
        const lastPaid = bHistory[0];
        const status = b.dueDay ? dueStatus(Number(b.dueDay), lastPaid?.paidDate) : null;
        return { ...b, _history: bHistory, _lastPaid: lastPaid, _status: status };
      })
      .sort((a, b) => {
        const da = a._status && !a._status.paid ? a._status.daysLeft : Infinity;
        const db = b._status && !b._status.paid ? b._status.daysLeft : Infinity;
        return da - db;
      });
  }, [bills, history]);

  const filteredBills = useMemo(() => {
    return sortedBills.filter((b: any) => {
      if (filterCategory !== "all" && b.category !== filterCategory) return false;
      if (filterAutoPay === "autopay" && !b.autoPay) return false;
      if (filterAutoPay === "manual" && b.autoPay) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNick = (b.nickname || "").toLowerCase().includes(q);
        const matchProv = (b.provider || "").toLowerCase().includes(q);
        const matchAcc = (b.accountNumber || "").toLowerCase().includes(q);
        if (!matchNick && !matchProv && !matchAcc) return false;
      }
      return true;
    });
  }, [sortedBills, filterCategory, filterAutoPay, searchQuery]);

  const { run: saveBill, loading: savingBill } = useAsyncAction(
    async (data: any) => {
      if (data.id && bills.find((b: any) => b.id === data.id)) {
        await updateItem("billPayments", data.id, data);
      } else {
        await addItem("billPayments", data);
      }
    },
    { onSuccess: () => setModal(null), onError: (e: any) => showToast?.(`Failed to save bill: ${e?.message || "Unknown error"}`, "error") }
  );

  const { run: savePayment, loading: savingPayment } = useAsyncAction(
    async (data: any) => { await addItem("billPaymentHistory", data); },
    { onSuccess: () => setPayModal(null), onError: (e: any) => showToast?.(`Failed to save payment: ${e?.message || "Unknown error"}`, "error") }
  );

  const { run: deleteBill } = useAsyncAction(
    async (id: string) => { await removeItem("billPayments", id); },
    { onError: (e: any) => showToast?.(`Failed to delete bill: ${e?.message || "Unknown error"}`, "error") }
  );
  const { run: deletePaymentRecord } = useAsyncAction(
    async (id: string) => { await removeItem("billPaymentHistory", id); },
    { onError: (e: any) => showToast?.(`Failed to delete payment record: ${e?.message || "Unknown error"}`, "error") }
  );

  return (
    <div className="tab-content-enter">
      <SectionTitle
        sub="Track electricity, gas, water, broadband, mobile and other recurring utility bills"
        rightElement={
          bills.length > 0 && (
            <Button variant="accent" icon={<Plus size={14} />} onClick={() => setModal({})}>
              Add Bill
            </Button>
          )
        }
      >
        Utility & Bill Payments
      </SectionTitle>

      {/* Hero Stats Cockpit */}
      {bills.length > 0 && (
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
              label="Monthly Utility Outflow"
              value={fmtINRFull(totalMonthly)}
              numericValue={totalMonthly}
              formatValue={fmtINRFull}
              sub={`${bills.length} bills · ${privacyMode ? "••••" : fmtINRFull(totalMonthly * 12)}/yr`}
              icon={<IndianRupee />}
              color={THEME.accent}
            />
            <StatCard
              label="Bills Tracked"
              value={bills.length.toLocaleString("en-IN")}
              numericValue={bills.length}
              formatValue={(n) => Math.round(n).toLocaleString("en-IN")}
              sub={`${autoPayBills.length} on auto-pay (${autoPayPct.toFixed(0)}%)`}
              icon={<ClipboardList />}
              color={THEME.sage}
            />
            <StatCard
              label="Due This Week"
              value={upcomingDue.length.toLocaleString("en-IN")}
              numericValue={upcomingDue.length}
              formatValue={(n) => Math.round(n).toLocaleString("en-IN")}
              sub={upcomingDue.length > 0 ? "Requires payment action" : "All payments current"}
              icon={<Clock />}
              color={upcomingDue.length > 0 ? THEME.gold : THEME.muted}
            />
          </div>

          {/* Urgent Due Alerts Banner */}
          {upcomingDue.length > 0 && (
            <Card
              style={{
                marginBottom: 20,
                padding: "14px 18px",
                background: `linear-gradient(135deg, color-mix(in srgb, ${THEME.gold} 10%, var(--surface-0)), var(--surface-0))`,
                border: `1px solid color-mix(in srgb, ${THEME.gold} 30%, transparent)`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <AlertCircle size={16} color={THEME.gold} />
                <span style={{ fontWeight: 800, fontSize: 13, color: THEME.ink }}>
                  Action Needed: {upcomingDue.length} Bill{upcomingDue.length !== 1 ? "s" : ""} Due Soon
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {upcomingDue.map((b) => (
                  <div
                    key={b.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--surface-0)",
                      border: `1px solid ${THEME.line}`,
                    }}
                  >
                    {catIcon(b.category, 16)}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: THEME.ink }}>{b.nickname || b.provider}</div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: b.color }}>
                        {b.label} · <Money value={Number(b.amount)} variant="full" />
                      </div>
                    </div>
                    <Button size="sm" variant="accent" onClick={() => setPayModal(b)} style={{ padding: "4px 8px", fontSize: 11 }}>
                      Pay
                    </Button>
                  </div>
                ))}
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
                <LayoutGrid size={13} /> Bill Cards
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`demat-portfolio-pill ${viewMode === "calendar" ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px" }}
              >
                <CalendarDays size={13} /> Due Calendar
              </button>
              <button
                onClick={() => setViewMode("table")}
                className={`demat-portfolio-pill ${viewMode === "table" ? "active" : ""}`}
                style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px" }}
              >
                <TableIcon size={13} /> Table
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
                  placeholder="Search bills..."
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

              {/* Auto-pay Filter */}
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "autopay", label: "Auto-pay" },
                    { id: "manual", label: "Manual" },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterAutoPay(f.id)}
                    className={`demat-portfolio-pill ${filterAutoPay === f.id ? "active" : ""}`}
                    style={{ fontSize: 11, padding: "4px 10px" }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Main View Area */}
      {bills.length === 0 ? (
        <EmptyState
          icon={Zap}
          gradient={`linear-gradient(135deg, ${THEME.accent} 0%, color-mix(in srgb, ${THEME.accent} 55%, white) 100%)`}
          dotColor={THEME.accent}
          title="No Bills Tracked Yet"
          description="Add your recurring utility bills to track due dates, payment history, and spot trends."
          pills={[
            "Electricity / Gas / Water",
            "Due Date Alerts",
            "Auto-pay Tracking",
            "Payment History",
          ]}
          buttonLabel="Add First Bill"
          onAdd={() => setModal({})}
        />
      ) : filteredBills.length === 0 ? (
        <Card style={{ padding: 48, textAlign: "center" }}>
          <div style={{ color: THEME.muted, fontSize: 13 }}>No bills match your search or filter.</div>
        </Card>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <Card style={{ overflow: "hidden", marginBottom: 20 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--surface-1)", borderBottom: `1.5px solid ${THEME.line}` }}>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Bill</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Category</th>
                  <th style={{ padding: "12px 16px", textAlign: "right", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Typical Amount</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Due Day</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Status</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Auto-pay</th>
                  <th style={{ padding: "12px 16px", textAlign: "center", color: THEME.muted, fontSize: 11, textTransform: "uppercase" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((b: any) => {
                  const cat = CAT_MAP[b.category] || CAT_MAP.other;
                  const status = b._status;
                  return (
                    <tr key={b.id} style={{ borderBottom: `1px solid ${THEME.line}` }}>
                      <td style={{ padding: "14px 16px", fontWeight: 700, color: THEME.ink }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ padding: 6, borderRadius: 8, background: `color-mix(in srgb, ${cat.color} 12%, transparent)` }}>
                            {catIcon(b.category, 16)}
                          </div>
                          <div>
                            <div>{b.nickname || b.provider}</div>
                            {b.accountNumber && <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 500 }}>#{b.accountNumber}</div>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", color: THEME.muted, fontSize: 12 }}>{cat.label}</td>
                      <td style={{ padding: "14px 16px", textAlign: "right", fontWeight: 800 }}>
                        <Money value={Number(b.amount)} variant="full" />
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center", fontWeight: 700 }}>
                        {b.dueDay ? `${b.dueDay}${ordinal(Number(b.dueDay))}` : "—"}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        {status && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: status.paid ? THEME.sage : status.daysLeft <= 3 ? THEME.rust : status.daysLeft <= 7 ? THEME.gold : THEME.sage,
                              background: `color-mix(in srgb, ${status.paid ? THEME.sage : status.daysLeft <= 3 ? THEME.rust : THEME.gold} 12%, transparent)`,
                              padding: "2px 8px",
                              borderRadius: 4,
                            }}
                          >
                            {status.label}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        {b.autoPay ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: THEME.sage, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <CheckCircle2 size={12} /> Yes
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: THEME.muted }}>Manual</span>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <Button size="sm" variant="ghost" onClick={() => setPayModal(b)} style={{ padding: "4px 8px", fontSize: 11 }}>
                            Log Pay
                          </Button>
                          <button
                            onClick={() => setModal(b)}
                            className="icon-btn"
                            style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, padding: 4 }}
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() =>
                              setConfirmAction({
                                message: `Delete "${b.nickname || b.provider}"? This cannot be undone.`,
                                onConfirm: () => deleteBill(b.id),
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
      ) : (
        /* CARDS / CALENDAR VIEW */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredBills.map((b: any) => {
            const cat = CAT_MAP[b.category] || CAT_MAP.other;
            const bHistory = b._history;
            const isExpanded = expanded === b.id;
            const lastPaid = b._lastPaid;
            const status = b._status;

            return (
              <Card key={b.id} className="card-lift" style={{ borderLeft: `4px solid ${cat.color}`, padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: `color-mix(in srgb, ${cat.color} 12%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${cat.color} 25%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {catIcon(b.category, 20)}
                  </div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: THEME.ink }}>{b.nickname || b.provider}</div>
                    <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 600, marginTop: 2 }}>
                      {cat.label} · {b.provider}
                      {b.accountNumber ? ` · #${b.accountNumber}` : ""}
                      {b.autoPay ? " · Auto-pay" : ""}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: 16, color: THEME.ink }}>
                      <Money value={Number(b.amount)} variant="full" />
                    </div>
                    <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
                      {b.dueDay ? `Due on ${b.dueDay}${ordinal(Number(b.dueDay))}` : ""}
                      {lastPaid ? ` · Paid ${new Date(lastPaid.paidDate + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}` : ""}
                    </div>
                  </div>

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

                  {b.autoPay && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: THEME.sage, display: "flex", alignItems: "center", gap: 3 }}>
                      <ShieldCheck size={14} /> Auto-pay
                    </span>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
                    <Button size="sm" variant="accent" onClick={() => setPayModal(b)} style={{ padding: "6px 12px", fontSize: 12 }}>
                      Log Payment
                    </Button>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : b.id)}
                      aria-label={isExpanded ? "Collapse details" : "Expand details"}
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
                        justifyContent: "center",
                      }}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                      onClick={() => setModal(b)}
                      aria-label="Edit bill"
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
                      style={{
                        background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${THEME.rust} 20%, transparent)`,
                        cursor: "pointer",
                        color: THEME.rust,
                        padding: 6,
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

                {/* Expanded Payment History Timeline */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: `1px solid ${THEME.line}`,
                    }}
                  >
                    {bHistory.length === 0 ? (
                      <div style={{ fontSize: 12, color: THEME.muted, textAlign: "center", padding: "12px 0" }}>
                        No past payment history logged for this bill yet.
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: THEME.muted,
                            marginBottom: 8,
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          Recent Payment Records
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {bHistory.slice(0, 6).map((h: any) => (
                            <div
                              key={h.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "8px 12px",
                                background: "var(--surface-1)",
                                borderRadius: "var(--radius-sm)",
                                fontSize: 12,
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <CheckCircle2 size={14} color={THEME.sage} />
                                <span style={{ fontWeight: 700, color: THEME.ink }}>
                                  {new Date(`${h.paidDate}T00:00:00`).toLocaleDateString("en-IN", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </span>
                                {h.paymentMethod && <Badge variant="muted" style={{ fontSize: 9 }}>{h.paymentMethod}</Badge>}
                                {h.unitsConsumed && <span style={{ color: THEME.muted }}>({h.unitsConsumed} units)</span>}
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontWeight: 800, color: THEME.ink }}>
                                  <Money value={Number(h.amount)} variant="full" />
                                </span>
                                <button
                                  onClick={() =>
                                    setConfirmAction({
                                      message: `Delete this payment record from ${h.paidDate}? This cannot be undone.`,
                                      onConfirm: () => deletePaymentRecord(h.id),
                                    })
                                  }
                                  className="icon-btn danger"
                                  style={{ background: "none", border: "none", cursor: "pointer", color: THEME.rust, padding: 2 }}
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {modal !== null && (
        <BillForm
          initial={modal?.id ? modal : undefined}
          onSave={saveBill}
          onClose={() => setModal(null)}
          saving={savingBill}
        />
      )}
      {payModal !== null && (
        <PaymentForm
          bill={payModal}
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

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
