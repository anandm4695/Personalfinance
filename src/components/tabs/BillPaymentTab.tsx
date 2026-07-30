// @ts-nocheck
import React, { useState } from "react";
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
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  ClipboardList,
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
import { Prv } from "../../context/PrivacyContext";

// Bill category colors — fixed THEME tokens instead of raw hex so tags stay
// theme-aware in dark mode and never coincidentally match a user-selectable
// accent preset.
const CATEGORIES = [
  { value: "electricity", label: "Electricity", Icon: Zap, color: THEME.gold },
  { value: "gas", label: "Gas / Piped Gas", Icon: Droplets, color: THEME.rust },
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

export function dueStatus(dueDayOfMonth: number): { label: string; color: string; daysLeft: number } {
  const now = new Date();
  // Clamp to the last day of the target month so a dueDay of 29/30/31 doesn't
  // overflow into the following month (e.g. Feb 31 -> Mar 3) when the target
  // month is shorter (Feb, or any 30-day month).
  const clampedDue = (year: number, month: number) =>
    new Date(year, month, Math.min(dueDayOfMonth, new Date(year, month + 1, 0).getDate()));
  const thisMonthDue = clampedDue(now.getFullYear(), now.getMonth());
  // Compare dates only (not time-of-day) so that when today IS the due date, it isn't
  // treated as already-passed (midnight due date vs later "now" timestamp) and bumped
  // to next month, which previously showed "~30 days" instead of "Due Today".
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let target = thisMonthDue;
  if (target.getTime() < todayMidnight.getTime()) {
    target = clampedDue(now.getFullYear(), now.getMonth() + 1);
  }
  const days = Math.ceil((target.getTime() - todayMidnight.getTime()) / 86400000);
  if (days <= 0) return { label: "Due Today", color: THEME.danger, daysLeft: 0 };
  if (days <= 3) return { label: `Due in ${days}d`, color: THEME.danger, daysLeft: days };
  if (days <= 7) return { label: `Due in ${days}d`, color: THEME.warning, daysLeft: days };
  return { label: `Due in ${days}d`, color: THEME.success, daysLeft: days };
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

function BillForm({ initial, onSave, onClose }: any) {
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
            placeholder="e.g. MSEDCL, BSNL"
          />
        </Field>
        <Field label="Nickname">
          <input
            className="form-input"
            value={form.nickname}
            onChange={(e) => set("nickname", e.target.value)}
            placeholder="e.g. Home Electricity"
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
        <Field label="Due Day of Month *">
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
        <Field label="Owner">
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
        <Field label="Auto-Pay">
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 8,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={form.autoPay}
              onChange={(e) => set("autoPay", e.target.checked)}
            />
            <span style={{ fontSize: 13 }}>Yes, auto-pay enabled</span>
          </label>
        </Field>
      </div>

      <ModalSection title="Additional Details" />
      <Field label="Notes">
        <input
          className="form-input"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Optional notes"
        />
      </Field>
      <ModalActions onSave={save} onClose={onClose} saveLabel="Save Bill" />
    </Modal>
  );
}

function PaymentForm({ bill, onSave, onClose }: any) {
  const [form, setForm] = useState({ ...EMPTY_PAYMENT, amount: bill?.amount || "" });
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = () => {
    if (!form.paidDate || !form.amount) return;
    onSave({
      ...form,
      amount: Number(form.amount),
      unitsConsumed: form.unitsConsumed ? Number(form.unitsConsumed) : null,
      billId: bill.id,
      id: uid(),
    });
  };

  return (
    <Modal title={`Log Payment — ${bill.nickname || bill.provider}`} onClose={onClose}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
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
          />
        </Field>
        {(bill.category === "electricity" ||
          bill.category === "gas" ||
          bill.category === "water") && (
          <Field label="Units Consumed">
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
            {["UPI", "NEFT/IMPS", "Net Banking", "Auto-debit", "Cash", "Cheque"].map((m) => (
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
      <ModalActions onSave={save} onClose={onClose} saveLabel="Log Payment" />
    </Modal>
  );
}

export function BillPaymentTab({ state, addItem, removeItem, updateItem }: any) {
  const bills: any[] = state.billPayments || [];
  const history: any[] = state.billPaymentHistory || [];
  const [modal, setModal] = useState<any>(null);
  const [payModal, setPayModal] = useState<any>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const totalMonthly = bills.reduce((s, b) => s + Number(b.amount || 0), 0);

  const upcomingDue = bills
    .filter((b) => b.dueDay)
    .map((b) => ({ ...b, ...dueStatus(Number(b.dueDay)) }))
    .filter((b) => b.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const saveBill = (data: any) => {
    if (data.id && bills.find((b: any) => b.id === data.id)) {
      updateItem("billPayments", data.id, data);
    } else {
      addItem("billPayments", data);
    }
    setModal(null);
  };

  const savePayment = (data: any) => {
    addItem("billPaymentHistory", data);
    setPayModal(null);
  };

  const billHistory = (billId: string) =>
    history.filter((h) => h.billId === billId).sort((a, b) => b.paidDate.localeCompare(a.paidDate));

  return (
    <div>
      <SectionTitle
        sub="Track electricity, gas, water, broadband, mobile and other recurring utility bills"
        rightElement={
          <Button size="sm" onClick={() => setModal({})}>
            <Plus size={14} /> Add Bill
          </Button>
        }
      >
        Bill Payment Tracker
      </SectionTitle>

      {/* Stats */}
      {bills.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div style={{ gridColumn: "span 2" }}>
            <StatCard
              label="Monthly Bills"
              value={<Prv>{fmtINRFull(totalMonthly)}</Prv>}
              sub={`${bills.length} bill${bills.length === 1 ? "" : "s"} tracked · ${fmtINRFull(totalMonthly * 12)}/yr`}
              icon={<IndianRupee size={18} />}
              color={THEME.primary}
            />
          </div>
          <StatCard
            label="Bills Tracked"
            value={bills.length}
            icon={<ClipboardList size={18} />}
            color={THEME.success}
          />
          <StatCard
            label="Due This Week"
            value={upcomingDue.length}
            sub={upcomingDue.length > 0 ? "Needs attention" : "All clear"}
            subColor={upcomingDue.length > 0 ? THEME.warning : undefined}
            icon={<Clock size={18} />}
            color={upcomingDue.length > 0 ? THEME.warning : THEME.textMuted}
          />
        </div>
      )}

      {/* Due alerts */}
      {upcomingDue.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {upcomingDue.map((b) => (
            <div
              key={b.id}
              style={{
                background: `color-mix(in srgb, ${b.color} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${b.color} 40%, transparent)`,
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 6,
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <AlertCircle size={14} color={b.color} />
              <span style={{ fontSize: 13, fontWeight: 600, color: b.color }}>{b.label}</span>
              <span style={{ fontSize: 13 }}>{b.nickname || b.provider}</span>
              <span style={{ fontSize: 13, color: THEME.textMuted, marginLeft: "auto" }}>
                <Prv>{fmtINRFull(Number(b.amount))}</Prv>
              </span>
              <Button size="sm" onClick={() => setPayModal(b)}>
                Pay Now
              </Button>
            </div>
          ))}
        </div>
      )}

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
          buttonLabel="Add Bill"
          onAdd={() => setModal({})}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {bills.map((b: any) => {
            const cat = CAT_MAP[b.category] || CAT_MAP.other;
            const status = b.dueDay ? dueStatus(Number(b.dueDay)) : null;
            const bHistory = billHistory(b.id);
            const isExpanded = expanded === b.id;
            const lastPaid = bHistory[0];

            return (
              <Card key={b.id} style={{ borderLeft: `4px solid ${cat.color}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: `color-mix(in srgb, ${cat.color} 15%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {catIcon(b.category)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{b.nickname || b.provider}</div>
                    <div style={{ fontSize: 12, color: THEME.textMuted }}>
                      {cat.label} · {b.provider}
                      {b.accountNumber ? ` · #${b.accountNumber}` : ""}
                      {b.autoPay ? " · Auto-pay" : ""}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>
                      <Prv>{fmtINRFull(Number(b.amount))}</Prv>
                    </div>
                    <div style={{ fontSize: 11, color: THEME.textMuted }}>
                      {b.dueDay ? `Due on ${b.dueDay}${ordinal(Number(b.dueDay))}` : ""}
                    </div>
                  </div>
                  {status && (
                    <Badge
                      variant={
                        status.daysLeft <= 3 ? "rust" : status.daysLeft <= 7 ? "gold" : "sage"
                      }
                    >
                      {status.label}
                    </Badge>
                  )}
                  {b.autoPay && (
                    <CheckCircle size={16} color={THEME.success} title="Auto-pay enabled" />
                  )}
                  <div style={{ display: "flex", gap: 4 }}>
                    <Button size="sm" variant="ghost" onClick={() => setPayModal(b)}>
                      Log
                    </Button>
                    <button
                      onClick={() => setExpanded(isExpanded ? null : b.id)}
                      aria-label={isExpanded ? "Collapse details" : "Expand details"}
                      className="icon-btn"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.textMuted,
                        padding: 8,
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
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.textMuted,
                        padding: 8,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete "${b.nickname || b.provider}"?`))
                          removeItem("billPayments", b.id);
                      }}
                      aria-label="Delete bill"
                      className="icon-btn danger"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: THEME.danger,
                        padding: 8,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Expanded payment history */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: `1px solid ${THEME.border}`,
                    }}
                  >
                    {bHistory.length === 0 ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: THEME.textMuted,
                          textAlign: "center",
                          padding: "8px 0",
                        }}
                      >
                        No payment history yet
                      </div>
                    ) : (
                      <>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: THEME.textMuted,
                            marginBottom: 8,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                          }}
                        >
                          Payment History
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {bHistory.slice(0, 6).map((h: any) => (
                            <div
                              key={h.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                fontSize: 13,
                              }}
                            >
                              <CheckCircle size={13} color={THEME.success} />
                              <span>
                                {new Date(h.paidDate).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                              <span style={{ fontWeight: 600 }}>
                                <Prv>{fmtINRFull(Number(h.amount))}</Prv>
                              </span>
                              {h.unitsConsumed && (
                                <span style={{ color: THEME.textMuted }}>
                                  {h.unitsConsumed} units
                                </span>
                              )}
                              {h.paymentMethod && (
                                <Badge variant="muted" style={{ fontSize: 10 }}>
                                  {h.paymentMethod}
                                </Badge>
                              )}
                              <button
                                onClick={() => removeItem("billPaymentHistory", h.id)}
                                aria-label="Delete payment record"
                                className="icon-btn danger"
                                style={{
                                  marginLeft: "auto",
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  color: THEME.danger,
                                  padding: 6,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Trash2 size={12} />
                              </button>
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
        />
      )}
      {payModal !== null && (
        <PaymentForm bill={payModal} onSave={savePayment} onClose={() => setPayModal(null)} />
      )}
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
