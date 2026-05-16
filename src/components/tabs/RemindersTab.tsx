// @ts-nocheck
import React, { useState, useMemo } from "react";
import { Bell, Plus, Trash2, CreditCard, Repeat, Coins, FileText, Shield, HandCoins, Check, AlertCircle } from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, today, getCCDueDate } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { StatCard } from "../ui/StatCard";
import { SectionTitle } from "../ui/SectionTitle";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";






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
    <div className="tab-content-enter">
      <SectionTitle 
        sub="Upcoming dues, maturities, renewals and custom alerts"
        rightElement={
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {notifPerm !== "unsupported" && notifPerm !== "granted" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={requestNotifications}
                icon={<Bell size={14} />}
              >
                Enable Notifications
              </Button>
            )}
            {notifPerm === "granted" && (
              <span style={{ fontSize: 12, color: THEME.sage, display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
                <Check size={14} /> Notifications on
              </span>
            )}
            <Button variant="accent" onClick={() => setShow(true)} icon={<Plus size={14} />}>
              Add Reminder
            </Button>
          </div>
        }
      >
        Reminders & Alerts
      </SectionTitle>

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
        <EmptyState
          icon={Bell}
          gradient="linear-gradient(135deg,#4f46e5 0%,#818cf8 100%)"
          dotColor="#4f46e5"
          title="No Reminders Yet"
          description="Reminders auto-populate from your credit cards, FDs, subscriptions, bonds, and loans — just add those with due dates and they appear here automatically."
          pills={["CC Bill Due Dates", "FD & Bond Maturities", "Subscription Renewals", "Custom Alerts"]}
          buttonLabel="Add Manual Reminder"
          onAdd={() => setShow(true)}
        />
      ) : (
        <>
          {upcoming.length > 0 && (
            <div style={{ display: "grid", gap: 12, marginBottom: 40 }}>
              {upcoming.map((r) => {
                const days = daysLeft(r.date);
                const color = urgencyColor(days);
                const Icon = r.icon;
                return (
                  <Card key={r.id} style={{ display: "flex", alignItems: "center", gap: 20, borderLeft: `4px solid ${color}`, padding: "18px 24px" }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}11`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon size={22} style={{ color }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 16, color: THEME.ink }}>{r.title}</div>
                      <div style={{ fontSize: 13, color: THEME.muted, marginTop: 4, fontWeight: 600 }}>{r.subtitle}{r.subtitle ? " · " : ""}<span style={{ opacity: 0.8 }}>{r.type}</span></div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontWeight: 900, color, fontSize: 18, letterSpacing: "-0.02em" }}>
                        {days === 0 ? "Today" : days === 1 ? "Tomorrow" : days + " days"}
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 700, textTransform: "uppercase", marginTop: 2 }}>{r.date}</div>
                    </div>
                    {r.manual && (
                      <Button variant="ghost" size="sm" onClick={() => removeItem("reminders", r.id)} style={{ padding: 6, color: THEME.rust }}>
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
          {past.length > 0 && (
            <div>
              <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 16 }}>Past Due / Completed</div>
              <div style={{ display: "grid", gap: 10 }}>
                {past.slice(-5).map((r) => {
                  const days = Math.abs(daysLeft(r.date));
                  const Icon = r.icon;
                  return (
                    <Card key={r.id} style={{ display: "flex", alignItems: "center", gap: 16, opacity: 0.6, padding: "12px 20px" }}>
                      <Icon size={18} style={{ color: THEME.muted, flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>
                        {r.title}
                        <span style={{ color: THEME.muted, fontWeight: 400 }}> · {r.date}</span>
                      </div>
                      <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 700 }}>{days}d ago</div>
                    </Card>
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
        <input className="form-input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Car Insurance Renewal" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Due Date">
          <input className="form-input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
        <Field label="Amount (optional)">
          <input className="form-input" type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
        </Field>
      </div>
      <Field label="Note (optional)">
        <input className="form-input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      </Field>
      <ModalActions onSave={() => f.title && f.date && onSave(f)} onClose={onClose} />
    </Modal>
  );
}
