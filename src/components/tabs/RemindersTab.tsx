// @ts-nocheck
import React, { useState, useMemo } from "react";
import { Bell, Plus, Trash2, CreditCard, Repeat, Coins, FileText, Shield, HandCoins, Check, AlertCircle } from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, today, getCCDueDate } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { StatCard } from "../ui/StatCard";
import { SectionTitle } from "../ui/SectionTitle";

// Internal helper components usually found in App.tsx or similar


const RemindersEmptyState = ({ onAdd }: any) => (
  <div style={{ padding: "60px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
    <div style={{ width: 64, height: 64, borderRadius: 20, background: "linear-gradient(135deg,#4f46e5 0%,#818cf8 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Bell size={28} color="#fff" />
    </div>
    <div>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>No Reminders Yet</div>
      <div style={{ fontSize: 13, color: THEME.muted, maxWidth: 400 }}>
        Reminders auto-populate from your credit cards, FDs, subscriptions, bonds, and loans — just add those with due dates and they appear here automatically.
      </div>
    </div>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
      {["CC Bill Due Dates", "FD & Bond Maturities", "Subscription Renewals", "Custom Alerts"].map(f => (
        <span key={f} style={{ fontSize: 11, padding: "5px 12px", borderRadius: 20, background: "rgba(79,70,229,0.08)", color: "#4f46e5", fontWeight: 600, border: "1px solid rgba(79,70,229,0.15)" }}>● {f}</span>
      ))}
    </div>
    <button style={{ marginTop: 8, padding: "10px 24px", background: "linear-gradient(135deg,#4f46e5 0%,#818cf8 100%)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }} onClick={onAdd}>
      <Plus size={16} /> Add Manual Reminder
    </button>
  </div>
);

const btnSolid = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 16px",
  background: THEME.accent,
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const btnGhost = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  background: "transparent",
  color: THEME.muted,
  border: "none",
  borderRadius: 8,
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const card = {
  background: "var(--surface-0)",
  borderRadius: 12,
  border: `1px solid ${THEME.line}`,
  padding: 20,
};

const iconBtn = {
  padding: 6,
  background: "transparent",
  border: "none",
  color: THEME.muted,
  cursor: "pointer",
  borderRadius: 6,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const input = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--t-paper)",
  border: `1.5px solid ${THEME.line}`,
  borderRadius: 10,
  color: THEME.ink,
  fontSize: 14,
};

export function RemindersTab({ state, addItem, removeItem }: any) {
  const [show, setShow] = useState(false);
  const [notifPerm, setNotifPerm] = useState<string>(() => {
    try { return localStorage.getItem("finance-notif") || "default"; } catch { return "default"; }
  });
  const todayStr = today();

  const requestNotifications = async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    if (perm === "granted") {
      try { localStorage.setItem("finance-notif", "granted"); } catch {}
    }
  };

  const allReminders = useMemo(() => {
    const list: any[] = [];
    state.creditCards.forEach((c: any) => {
      const dueDate = getCCDueDate(c);
      if (dueDate) list.push({ id: "cc-" + c.id, title: (c.issuer || "Card") + " — Bill Due", subtitle: "Outstanding: " + fmtINRFull(c.outstanding), date: dueDate, type: "Credit Card", icon: CreditCard });
    });
    state.subscriptions.forEach((s: any) => {
      if (s.renewalDate) list.push({ id: "sub-" + s.id, title: s.name + " Renewal", subtitle: s.cycle + " · " + fmtINRFull(s.amount), date: s.renewalDate, type: "Subscription", icon: Repeat });
    });
    state.fixedDeposits.forEach((f: any) => {
      if (f.maturityDate) list.push({ id: "fd-" + f.id, title: "FD Maturity — " + (f.bank || f.bankName || "Bank"), subtitle: "Principal: " + fmtINRFull(f.principal), date: f.maturityDate, type: "Fixed Deposit", icon: Coins });
    });
    state.bonds.forEach((b: any) => {
      if (b.maturityDate) list.push({ id: "bond-" + b.id, title: "Bond Maturity — " + b.name, subtitle: "Face Value: " + fmtINRFull(b.faceValue), date: b.maturityDate, type: "Bond", icon: FileText });
    });
    state.lic.forEach((l: any) => {
      if (l.maturityDate) list.push({ id: "lic-" + l.id, title: "LIC Maturity — " + l.planName, subtitle: "Annual Premium: " + fmtINRFull(l.annualPremium), date: l.maturityDate, type: "LIC", icon: Shield });
    });
    state.termPlans.forEach((t: any) => {
      if (t.expiryDate) list.push({ id: "term-" + t.id, title: "Term Plan Expiry — " + t.planName, subtitle: "Cover: " + fmtINRFull(t.coverAmount), date: t.expiryDate, type: "Term Plan", icon: Shield });
    });
    state.loansGiven.forEach((l: any) => {
      if (l.dueDate) list.push({ id: "loan-" + l.id, title: "Loan Recovery — " + l.borrower, subtitle: "Outstanding: " + fmtINRFull(l.outstanding), date: l.dueDate, type: "Loan Given", icon: HandCoins });
    });
    state.reminders.forEach((r: any) => {
      list.push({ id: r.id, title: r.title, subtitle: r.note || "", date: r.date, type: "Reminder", icon: Bell, manual: true });
    });
    return list.filter((r) => r.date).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [state]);

  const daysLeft = (d: string) => Math.ceil((new Date(d).getTime() - new Date(todayStr).getTime()) / 86400000);
  const urgencyColor = (days: number) => days < 0 ? THEME.muted : days <= 7 ? THEME.rust : days <= 30 ? THEME.gold : THEME.sage;

  const upcoming = allReminders.filter((r) => daysLeft(r.date) >= 0);
  const past = allReminders.filter((r) => daysLeft(r.date) < 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <SectionTitle sub="Upcoming dues, maturities, renewals and custom alerts">
          Reminders & Alerts
        </SectionTitle>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {notifPerm !== "unsupported" && notifPerm !== "granted" && (
            <button
              style={{ ...btnGhost, fontSize: 12 }}
              onClick={requestNotifications}
              title="Get browser notifications for due reminders"
            >
              <Bell size={13} /> Enable Notifications
            </button>
          )}
          {notifPerm === "granted" && (
            <span style={{ fontSize: 12, color: THEME.sage, display: "flex", alignItems: "center", gap: 4 }}>
              <Check size={13} /> Notifications on
            </span>
          )}
          <button style={btnSolid} onClick={() => setShow(true)}>
            <Plus size={14} /> Add Reminder
          </button>
      </div>
    </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard 
          icon={<Bell />} 
          label="Upcoming Alerts" 
          value={upcoming.length} 
          color={THEME.accent}
          sub="Reminders for next 365 days"
        />
        <StatCard 
          icon={<AlertCircle size={20} />} 
          label="Due Soon (7d)" 
          value={upcoming.filter(r => daysLeft(r.date) <= 7).length} 
          color={upcoming.filter(r => daysLeft(r.date) <= 7).length > 0 ? THEME.rust : THEME.sage}
          sub="Critical window alerts"
        />
        <StatCard 
          icon={<Trash2 size={20} />} 
          label="Past Due" 
          value={past.length} 
          color={past.length > 0 ? THEME.rust : THEME.muted}
          sub="Unresolved past alerts"
        />
      </div>

      {upcoming.length === 0 && past.length === 0 ? (
        <div style={card}>
          <RemindersEmptyState onAdd={() => setShow(true)} />
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div style={{ display: "grid", gap: 12, marginBottom: 32 }}>
              {upcoming.map((r) => {
                const days = daysLeft(r.date);
                const color = urgencyColor(days);
                const Icon = r.icon;
                return (
                  <div key={r.id} style={{ ...card, display: "flex", alignItems: "center", gap: 16, borderLeft: "4px solid " + color, padding: "16px 20px" }}>
                    <Icon size={20} style={{ color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15 }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>{r.subtitle}{r.subtitle ? " · " : ""}{r.type}</div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, color, fontSize: 16 }}>
                        {days === 0 ? "Today" : days === 1 ? "Tomorrow" : days + " days"}
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted }}>{r.date}</div>
                    </div>
                    {r.manual && (
                      <button onClick={() => removeItem("reminders", r.id)} style={iconBtn}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {past.length > 0 && (
            <div>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Past Due</div>
              <div style={{ display: "grid", gap: 8 }}>
                {past.slice(-5).map((r) => {
                  const days = Math.abs(daysLeft(r.date));
                  const Icon = r.icon;
                  return (
                    <div key={r.id} style={{ ...card, display: "flex", alignItems: "center", gap: 12, opacity: 0.6, padding: "12px 16px" }}>
                      <Icon size={16} style={{ color: THEME.muted, flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 14 }}>
                        <span style={{ fontWeight: 600 }}>{r.title}</span>
                        <span style={{ color: THEME.muted }}> · {r.date}</span>
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted }}>{days}d ago</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {show && (
        <ReminderModal
          onClose={() => setShow(false)}
          onSave={(v: any) => { addItem("reminders", v); setShow(false); }}
        />
      )}
    </div>
  );
}

function ReminderModal({ onClose, onSave }: any) {
  const [f, setF] = useState({ title: "", amount: "", date: "", note: "" });
  return (
    <Modal title="Add Reminder" onClose={onClose}>
      <Field label="Title">
        <input style={input} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Car Insurance Renewal" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Due Date">
          <input style={input} type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
        <Field label="Amount (optional)">
          <input style={input} type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </Field>
      </div>
      <Field label="Note (optional)">
        <input style={input} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      </Field>
      <ModalActions onSave={() => f.title && f.date && onSave(f)} onClose={onClose} />
    </Modal>
  );
}
