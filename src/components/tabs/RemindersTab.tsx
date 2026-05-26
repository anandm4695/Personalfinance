// @ts-nocheck
import React, { useState, useMemo } from "react";
import { Bell, Plus, Trash2, CreditCard, Repeat, Coins, FileText, Shield, HandCoins, Check, AlertCircle, Home, Filter, X, Car, Heart, IndianRupee, Receipt, Pencil } from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, today, getCCDueDate, getLocalDateString } from "../../utils/finance";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { StatCard } from "../ui/StatCard";
import { SectionTitle } from "../ui/SectionTitle";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";

const TYPE_COLORS: Record<string, string> = {
  "Credit Card": THEME.rust,
  "Subscription": THEME.gold,
  "Fixed Deposit": THEME.accent,
  "Bond": THEME.accent,
  "LIC": THEME.sage,
  "LIC Premium": THEME.sage,
  "Term Plan": THEME.sage,
  "Term Premium": THEME.sage,
  "Investment Plan": THEME.sage,
  "Investment Premium": THEME.sage,
  "Loan Given": THEME.gold,
  "Rent": THEME.rust,
  "Reminder": THEME.accent,
  "Health": THEME.rust,
  "Vehicle": THEME.gold,
  "Tax": THEME.rust,
  "Bills": THEME.accent,
};

const TYPE_ICONS: Record<string, any> = {
  "Credit Card": CreditCard,
  "Subscription": Repeat,
  "Fixed Deposit": Coins,
  "Bond": FileText,
  "LIC": Shield,
  "LIC Premium": Shield,
  "Term Plan": Shield,
  "Term Premium": Shield,
  "Investment Plan": Shield,
  "Investment Premium": Shield,
  "Loan Given": HandCoins,
  "Rent": Home,
  "Reminder": Bell,
  "Health": Heart,
  "Vehicle": Car,
  "Tax": IndianRupee,
  "Bills": Receipt,
};

const MANUAL_CATEGORIES = ["Reminder", "Health", "Vehicle", "Tax", "Bills"];

const TYPE_CATEGORIES = [
  "All",
  "Credit Card",
  "Subscription",
  "Rent",
  "Fixed Deposit",
  "LIC",
  "LIC Premium",
  "Term Plan",
  "Term Premium",
  "Investment Plan",
  "Investment Premium",
  "Bond",
  "Loan Given",
  "Reminder",
  "Health",
  "Vehicle",
  "Tax",
  "Bills",
];

function fmtDisplayDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function RemindersTab({ state, addItem, removeItem, updateItem }: any) {
  const [show, setShow] = useState(false);
  const [editingReminder, setEditingReminder] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState("All");
  const [notifPerm, setNotifPerm] = useState<string>(() => {
    try { return localStorage.getItem("finance-notif") || "default"; } catch { return "default"; }
  });
  const [completedKeys, setCompletedKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("finance-completed-reminders");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showCompleted, setShowCompleted] = useState(false);
  const [showAllPast, setShowAllPast] = useState(false);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("finance-completed-reminders");
      if (saved) {
        const parsed = JSON.parse(saved);
        const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
        const validKeys = parsed.filter((key: string) => {
          const parts = key.split("-");
          if (parts.length >= 4) {
            const dateStr = parts.slice(-3).join("-");
            const d = new Date(dateStr + "T00:00:00");
            if (!isNaN(d.getTime()) && d.getTime() < ninetyDaysAgo) {
              return false;
            }
          }
          return true;
        });
        if (validKeys.length !== parsed.length) {
          localStorage.setItem("finance-completed-reminders", JSON.stringify(validKeys));
          setCompletedKeys(validKeys);
        }
      }
    } catch (e) {
      console.error("Cleanup old completed reminders error:", e);
    }
  }, []);

  const toggleComplete = (id: string, date: string) => {
    const key = `${id}-${date}`;
    let newKeys: string[];
    if (completedKeys.includes(key)) {
      newKeys = completedKeys.filter((k) => k !== key);
    } else {
      newKeys = [...completedKeys, key];
    }
    setCompletedKeys(newKeys);
    try {
      localStorage.setItem("finance-completed-reminders", JSON.stringify(newKeys));
    } catch (e) {
      console.error("Failed to save completed reminders", e);
    }
  };

  const markAllPastDone = () => {
    const pastKeys = past.map((r) => `${r.id}-${r.date}`);
    const newKeys = [...new Set([...completedKeys, ...pastKeys])];
    setCompletedKeys(newKeys);
    try {
      localStorage.setItem("finance-completed-reminders", JSON.stringify(newKeys));
    } catch {}
  };

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

    // ── 1. CREDIT CARDS ──
    (state.creditCards || []).filter((c: any) => (c.status || "").toLowerCase() !== "closed").forEach((c: any) => {
      const dueDate = getCCDueDate(c);
      if (dueDate) list.push({
        id: "cc-" + c.id,
        title: (c.issuer || "Card") + " — Bill Due",
        subtitle: c.outstanding ? "Outstanding: " + fmtINRFull(c.outstanding) : "Active card",
        date: dueDate,
        type: "Credit Card",
        amount: Number(c.outstanding || 0),
        isOutflow: true,
      });
    });

    // ── 2. SUBSCRIPTIONS ──
    (state.subscriptions || []).filter((s: any) => !s.paused).forEach((s: any) => {
      if (s.renewalDate) list.push({
        id: "sub-" + s.id,
        title: s.name + " Renewal",
        subtitle: (s.cycle || s.billingCycle || "Monthly") + " · " + fmtINRFull(s.amount),
        date: s.renewalDate,
        type: "Subscription",
        amount: Number(s.amount || 0),
        isOutflow: true,
      });
    });

    // ── 3. FIXED DEPOSITS ──
    (state.fixedDeposits || []).forEach((f: any) => {
      if (f.maturityDate) list.push({
        id: "fd-" + f.id,
        title: "FD Maturity — " + (f.bank || f.bankName || "Bank"),
        subtitle: "Principal: " + fmtINRFull(f.principal),
        date: f.maturityDate,
        type: "Fixed Deposit",
        amount: Number(f.principal || 0),
        isOutflow: false,
      });
    });

    // ── 4. BONDS ──
    (state.bonds || []).forEach((b: any) => {
      if (b.maturityDate) list.push({
        id: "bond-" + b.id,
        title: "Bond Maturity — " + b.name,
        subtitle: "Face Value: " + fmtINRFull(b.faceValue),
        date: b.maturityDate,
        type: "Bond",
        amount: 0,
        isOutflow: false,
      });
    });

    // ── 5. LIC POLICIES ──
    (state.lic || []).forEach((l: any) => {
      if (l.maturityDate) list.push({
        id: "lic-" + l.id,
        title: "LIC Maturity — " + l.planName,
        subtitle: "Annual Premium: " + fmtINRFull(l.annualPremium),
        date: l.maturityDate,
        type: "LIC",
        amount: 0,
        isOutflow: false,
      });
      if (l.commencementDate) {
        const comm = new Date(l.commencementDate);
        if (!isNaN(comm.getTime())) {
          const todayDate = new Date();
          todayDate.setHours(0, 0, 0, 0);
          const currentYear = todayDate.getFullYear();
          let anniversary = new Date(currentYear, comm.getMonth(), comm.getDate());
          if (anniversary < todayDate) {
            anniversary = new Date(currentYear + 1, comm.getMonth(), comm.getDate());
          }
          let isMatured = false;
          if (l.maturityDate) {
            const mat = new Date(l.maturityDate);
            if (!isNaN(mat.getTime()) && anniversary > mat) isMatured = true;
          }
          const policyTerm = l.policyTerm ? parseInt(l.policyTerm, 10) : null;
          if (policyTerm && !isNaN(policyTerm)) {
            const yearsElapsed = anniversary.getFullYear() - comm.getFullYear();
            if (yearsElapsed >= policyTerm) isMatured = true;
          }
          if (!isMatured) {
            list.push({
              id: "lic-prem-" + l.id,
              title: `LIC Premium — ${l.planName}`,
              subtitle: `Policy: ${l.policyNumber || "N/A"} · Premium: ${fmtINRFull(l.annualPremium)}`,
              date: getLocalDateString(anniversary),
              type: "LIC Premium",
              amount: Number(l.annualPremium || 0),
              isOutflow: true,
            });
          }
        }
      }
    });

    // ── 6. TERM PLANS ──
    (state.termPlans || []).forEach((t: any) => {
      if (t.expiryDate) list.push({
        id: "term-" + t.id,
        title: "Term Plan Expiry — " + t.planName,
        subtitle: "Cover: " + fmtINRFull(t.coverAmount),
        date: t.expiryDate,
        type: "Term Plan",
        amount: 0,
        isOutflow: false,
      });
      if (t.startDate) {
        const comm = new Date(t.startDate);
        if (!isNaN(comm.getTime())) {
          const todayDate = new Date();
          todayDate.setHours(0, 0, 0, 0);
          const currentYear = todayDate.getFullYear();
          let anniversary = new Date(currentYear, comm.getMonth(), comm.getDate());
          if (anniversary < todayDate) {
            anniversary = new Date(currentYear + 1, comm.getMonth(), comm.getDate());
          }
          let isExpired = false;
          if (t.expiryDate) {
            const exp = new Date(t.expiryDate);
            if (!isNaN(exp.getTime()) && anniversary > exp) isExpired = true;
          }
          const payTerm = t.premiumPayingTerm ? parseInt(t.premiumPayingTerm, 10) : (t.term ? parseInt(t.term, 10) : null);
          if (payTerm && !isNaN(payTerm)) {
            const yearsElapsed = anniversary.getFullYear() - comm.getFullYear();
            if (yearsElapsed >= payTerm) isExpired = true;
          }
          if (!isExpired) {
            list.push({
              id: "term-prem-" + t.id,
              title: `Term Premium — ${t.planName || "Plan"}`,
              subtitle: `Insurer: ${t.insurer || "N/A"} · Premium: ${fmtINRFull(t.annualPremium)}`,
              date: getLocalDateString(anniversary),
              type: "Term Premium",
              amount: Number(t.annualPremium || 0),
              isOutflow: true,
            });
          }
        }
      }
    });

    // ── 7. INVESTMENT PLANS ──
    (state.investmentPlans || []).forEach((ip: any) => {
      if (ip.maturityDate) {
        list.push({
          id: "invest-" + ip.id,
          title: "Investment Maturity — " + ip.planName,
          subtitle: "Expected Maturity: " + fmtINRFull(ip.expectedMaturityAmount),
          date: ip.maturityDate,
          type: "Investment Plan",
          amount: 0,
          isOutflow: false,
        });
      }
      if (ip.commencementDate) {
        const comm = new Date(ip.commencementDate);
        if (!isNaN(comm.getTime())) {
          const todayDate = new Date();
          todayDate.setHours(0, 0, 0, 0);
          const currentYear = todayDate.getFullYear();
          let anniversary = new Date(currentYear, comm.getMonth(), comm.getDate());
          if (anniversary < todayDate) {
            anniversary = new Date(currentYear + 1, comm.getMonth(), comm.getDate());
          }
          let isMatured = false;
          if (ip.maturityDate) {
            const mat = new Date(ip.maturityDate);
            if (!isNaN(mat.getTime()) && anniversary > mat) isMatured = true;
          }
          const payTerm = ip.premiumPayingTerm ? parseInt(ip.premiumPayingTerm, 10) : (ip.policyTerm ? parseInt(ip.policyTerm, 10) : null);
          if (payTerm && !isNaN(payTerm)) {
            const yearsElapsed = anniversary.getFullYear() - comm.getFullYear();
            if (yearsElapsed >= payTerm) isMatured = true;
          }
          if (!isMatured) {
            list.push({
              id: "invest-prem-" + ip.id,
              title: `Investment Premium — ${ip.planName || "Plan"}`,
              subtitle: `Insurer: ${ip.insurer || "N/A"} · Premium: ${fmtINRFull(ip.annualPremium)}`,
              date: getLocalDateString(anniversary),
              type: "Investment Premium",
              amount: Number(ip.annualPremium || 0),
              isOutflow: true,
            });
          }
        }
      }
    });

    // ── 8. LOANS GIVEN (recovery) ──
    (state.loansGiven || []).forEach((l: any) => {
      if (l.dueDate) list.push({
        id: "loan-" + l.id,
        title: "Loan Recovery — " + (l.lender || l.name || "Borrower"),
        subtitle: "Outstanding: " + fmtINRFull(l.outstanding),
        date: l.dueDate,
        type: "Loan Given",
        amount: Number(l.outstanding || 0),
        isOutflow: false,
      });
    });

    // ── 9. RENTED PROPERTIES — Monthly Rent Dues ──
    const todayD = new Date();
    todayD.setHours(0, 0, 0, 0);
    (state.rentedProperties || []).filter((p: any) => p.isActive !== false && Number(p.monthlyRent) > 0).forEach((p: any) => {
      const dueDay = p.dueDay ? parseInt(p.dueDay, 10) : 5;
      const currentYear = todayD.getFullYear();
      const currentMonth = todayD.getMonth();
      const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
      const paidCurrent = (p.payments || []).some((pay: any) => pay.date && pay.date.startsWith(currentMonthStr));

      if (!paidCurrent) {
        const dueDate = new Date(currentYear, currentMonth, dueDay);
        list.push({
          id: "rent-" + p.id,
          title: `${p.propertyName || "Rent"} — Monthly Rent`,
          subtitle: `Rent: ${fmtINRFull(p.monthlyRent)} · Due on ${dueDay}${["st","nd","rd"][((dueDay+90)%100-10)%10-1]||"th"} of month`,
          date: getLocalDateString(dueDay >= todayD.getDate() ? dueDate : new Date(currentYear, currentMonth + 1, dueDay)),
          type: "Rent",
          amount: Number(p.monthlyRent || 0),
          isOutflow: true,
        });
      } else {
        // Already paid — show next month's due
        const nextMonth = currentMonth + 1;
        const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
        const nextMonthNorm = nextMonth > 11 ? 0 : nextMonth;
        const nextMonthStr = `${nextYear}-${String(nextMonthNorm + 1).padStart(2, "0")}`;
        const paidNext = (p.payments || []).some((pay: any) => pay.date && pay.date.startsWith(nextMonthStr));
        if (!paidNext) {
          const nextDueDate = new Date(nextYear, nextMonthNorm, dueDay);
          list.push({
            id: "rent-next-" + p.id,
            title: `${p.propertyName || "Rent"} — Monthly Rent`,
            subtitle: `Rent: ${fmtINRFull(p.monthlyRent)} · This month already paid ✓`,
            date: getLocalDateString(nextDueDate),
            type: "Rent",
            amount: Number(p.monthlyRent || 0),
            isOutflow: true,
          });
        }
      }
    });

    // ── 10. MANUAL REMINDERS ──
    (state.reminders || []).forEach((r: any) => {
      const noteParts = [r.note, r.amount ? `Amount: ${fmtINRFull(r.amount)}` : ""].filter(Boolean);
      list.push({
        id: r.id,
        title: r.title,
        subtitle: noteParts.join(" · "),
        date: r.date,
        type: r.category || "Reminder",
        amount: Number(r.amount || 0),
        isOutflow: true,
        manual: true,
        raw: r,
      });
    });

    return list.filter((r) => r.date).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [state]);

  const daysLeft = (d: string) => Math.ceil((new Date(d + "T00:00:00").getTime() - new Date(todayStr + "T00:00:00").getTime()) / 86400000);

  const partitioned = useMemo(() => {
    const upcomingList: any[] = [];
    const pastList: any[] = [];
    const completedList: any[] = [];

    allReminders.forEach((r) => {
      const key = `${r.id}-${r.date}`;
      const isCompleted = completedKeys.includes(key);
      if (isCompleted) {
        completedList.push(r);
      } else {
        const days = daysLeft(r.date);
        if (days >= 0) {
          upcomingList.push(r);
        } else {
          pastList.push(r);
        }
      }
    });

    return {
      upcoming: upcomingList,
      past: pastList,
      completed: completedList,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allReminders, completedKeys]);

  const { upcoming, past, completed } = partitioned;

  const next30Outflow = useMemo(() => {
    return upcoming
      .filter((r) => r.isOutflow && daysLeft(r.date) <= 30)
      .reduce((s, r) => s + r.amount, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcoming]);

  const availableTypes = useMemo(() => {
    const types = new Set(upcoming.map((r) => r.type));
    return TYPE_CATEGORIES.filter((t) => t === "All" || types.has(t));
  }, [upcoming]);

  const filteredUpcoming = activeFilter === "All" ? upcoming : upcoming.filter((r) => r.type === activeFilter);

  // Time bucket grouping
  const critical = filteredUpcoming.filter((r) => daysLeft(r.date) <= 7);
  const soon = filteredUpcoming.filter((r) => { const d = daysLeft(r.date); return d > 7 && d <= 30; });
  const horizon = filteredUpcoming.filter((r) => daysLeft(r.date) > 30);

  const pastToShow = showAllPast ? [...past].reverse() : [...past].reverse().slice(0, 8);

  const renderReminderCard = (r: any, compact = false) => {
    const days = daysLeft(r.date);
    const color = TYPE_COLORS[r.type] || THEME.accent;
    const urgencyCol = days <= 7 ? THEME.rust : days <= 30 ? THEME.gold : THEME.sage;
    const urgencyBg = days <= 7 ? `${THEME.rust}15` : days <= 30 ? `${THEME.gold}15` : `${THEME.sage}15`;
    const Icon = TYPE_ICONS[r.type] || Bell;
    const daysLabel = days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`;

    return (
      <Card key={r.id + r.date} style={{ padding: compact ? "14px 18px" : "16px 20px", borderLeft: `3px solid ${color}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: compact ? 36 : 42, height: compact ? 36 : 42, borderRadius: 12, flexShrink: 0,
            background: `color-mix(in srgb, ${color} 12%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Icon size={compact ? 17 : 20} color={color} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800, fontSize: compact ? 13 : 15, color: THEME.ink, letterSpacing: "-0.01em" }}>{r.title}</span>
              <span style={{
                fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 6,
                background: `color-mix(in srgb, ${color} 10%, transparent)`,
                color,
                textTransform: "uppercase", letterSpacing: "0.06em",
                border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
              }}>{r.type}</span>
            </div>
            {r.subtitle && (
              <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 500 }}>{r.subtitle}</div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <div style={{
                padding: "4px 14px", borderRadius: 8,
                background: urgencyBg,
                border: `1px solid color-mix(in srgb, ${urgencyCol} 20%, transparent)`,
              }}>
                <span style={{ fontWeight: 900, fontSize: 15, color: urgencyCol, letterSpacing: "-0.02em" }}>{daysLabel}</span>
              </div>
              <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>{fmtDisplayDate(r.date)}</div>
            </div>

            {/* Edit button (manual only) */}
            {r.manual && updateItem && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingReminder(r.raw)}
                style={{ padding: 6, color: THEME.muted }}
                title="Edit"
              >
                <Pencil size={14} />
              </Button>
            )}

            {/* Complete Checkbox */}
            <button
              onClick={() => toggleComplete(r.id, r.date)}
              title="Mark as Done"
              style={{
                width: 34, height: 34, borderRadius: "50%",
                border: `1px dashed color-mix(in srgb, ${THEME.sage} 40%, transparent)`,
                background: "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
                color: `color-mix(in srgb, ${THEME.sage} 70%, ${THEME.muted})`,
                transition: "all 0.2s ease-in-out",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderStyle = "solid";
                e.currentTarget.style.borderColor = THEME.sage;
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.background = THEME.sage;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderStyle = "dashed";
                e.currentTarget.style.borderColor = `color-mix(in srgb, ${THEME.sage} 40%, transparent)`;
                e.currentTarget.style.color = `color-mix(in srgb, ${THEME.sage} 70%, ${THEME.muted})`;
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Check size={16} strokeWidth={2.5} />
            </button>

            {/* Delete (manual only) */}
            {r.manual && (
              <Button variant="ghost" size="sm" onClick={() => removeItem("reminders", r.id)} style={{ padding: 6, color: THEME.rust }}>
                <Trash2 size={14} />
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  };

  const renderBucket = (items: any[], label: string, labelColor: string, compact = false) => {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: 32 }}>
        <div style={{
          fontSize: 10, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase",
          marginBottom: 12, color: labelColor,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: labelColor, display: "inline-block", flexShrink: 0 }} />
          {label} · {items.length}
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((r) => renderReminderCard(r, compact))}
        </div>
      </div>
    );
  };

  return (
    <div className="tab-content-enter">
      <SectionTitle
        sub="Upcoming dues, maturities, renewals and custom alerts"
        rightElement={
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {notifPerm !== "unsupported" && notifPerm !== "granted" && (
              <Button variant="ghost" size="sm" onClick={requestNotifications} icon={<Bell size={14} />}>
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
        Reminders &amp; Alerts
      </SectionTitle>

      {/* ── STAT CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
        <StatCard icon={<Bell />} label="Upcoming Alerts" value={upcoming.length} color={THEME.accent} sub="Reminders within next 365 days" />
        <StatCard icon={<AlertCircle size={20} />} label="Due Soon (7 days)" value={upcoming.filter((r) => daysLeft(r.date) <= 7).length} color={upcoming.filter((r) => daysLeft(r.date) <= 7).length > 0 ? THEME.rust : THEME.sage} sub="Critical window alerts" />
        <StatCard icon={<Trash2 size={20} />} label="Past Due" value={past.length} color={past.length > 0 ? THEME.rust : THEME.muted} sub="Unresolved past alerts" />
        <StatCard icon={<IndianRupee size={20} />} label="Next 30d Outflow" value={fmtINRFull(next30Outflow)} color={next30Outflow > 0 ? THEME.rust : THEME.muted} sub="Payments due in next 30 days" />
      </div>

      {allReminders.length === 0 ? (
        <EmptyState
          icon={Bell}
          gradient="linear-gradient(135deg,#4f46e5 0%,#818cf8 100%)"
          dotColor="#4f46e5"
          title="No Reminders Yet"
          description="Reminders auto-populate from your credit cards, FDs, subscriptions, bonds, loans, and rented properties — just add those with due dates and they appear here automatically."
          pills={["CC Bill Due Dates", "FD & Bond Maturities", "Subscription Renewals", "Rent Due Dates", "Custom Alerts"]}
          buttonLabel="Add Manual Reminder"
          onAdd={() => setShow(true)}
        />
      ) : (
        <>
          {/* All Caught Up Premium Empty State */}
          {upcoming.length === 0 && past.length === 0 && completed.length > 0 && (
            <Card style={{ padding: "40px 24px", textAlign: "center", background: `color-mix(in srgb, ${THEME.sage} 4%, transparent)`, border: `1.5px dashed color-mix(in srgb, ${THEME.sage} 25%, transparent)`, borderRadius: 16, marginBottom: 24 }}>
              <div style={{ width: 54, height: 54, borderRadius: "50%", background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <Check size={28} color={THEME.sage} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, marginBottom: 8 }}>All Caught Up!</h3>
              <p style={{ fontSize: 13, color: THEME.muted, maxWidth: 380, margin: "0 auto 16px", lineHeight: 1.5 }}>
                You have marked all active reminders as completed or have no unresolved dues. Excellent job keeping your personal finances in order!
              </p>
              <Button variant="ghost" size="sm" onClick={() => setShow(true)} icon={<Plus size={14} />}>
                Add Manual Reminder
              </Button>
            </Card>
          )}

          {/* Fallback Empty State if active lists are empty */}
          {upcoming.length === 0 && past.length === 0 && completed.length === 0 && (
            <EmptyState
              icon={Bell}
              gradient="linear-gradient(135deg,#4f46e5 0%,#818cf8 100%)"
              dotColor="#4f46e5"
              title="No Active Reminders"
              description="You have no active or completed reminders."
              buttonLabel="Add Manual Reminder"
              onAdd={() => setShow(true)}
            />
          )}

          {/* ── FILTER PILLS ── */}
          {availableTypes.length > 2 && (upcoming.length > 0 || past.length > 0) && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20, alignItems: "center" }}>
              <Filter size={13} color={THEME.muted} />
              {availableTypes.map((t) => {
                const active = activeFilter === t;
                const col = t === "All" ? THEME.accent : (TYPE_COLORS[t] || THEME.accent);
                return (
                  <button
                    key={t}
                    onClick={() => setActiveFilter(t)}
                    style={{
                      padding: "5px 14px", borderRadius: 99,
                      border: active ? `1.5px solid ${col}` : `1px solid ${THEME.line}`,
                      background: active ? `color-mix(in srgb, ${col} 12%, transparent)` : "transparent",
                      color: active ? col : THEME.muted,
                      fontSize: 11, fontWeight: 700, cursor: "pointer",
                      transition: "all 0.18s", letterSpacing: "0.03em",
                    }}
                  >
                    {t}
                    {t !== "All" && (
                      <span style={{ marginLeft: 5, opacity: 0.7 }}>
                        ({upcoming.filter((r) => r.type === t).length})
                      </span>
                    )}
                  </button>
                );
              })}
              {activeFilter !== "All" && (
                <button
                  onClick={() => setActiveFilter("All")}
                  style={{ background: "none", border: "none", cursor: "pointer", color: THEME.muted, display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}
                >
                  <X size={12} /> Clear
                </button>
              )}
            </div>
          )}

          {/* ── TIME-BUCKETED UPCOMING ALERTS ── */}
          {filteredUpcoming.length > 0 && (
            <>
              {renderBucket(critical, "Critical — Due within 7 days", THEME.rust)}
              {renderBucket(soon, "Coming Up — Next 30 days", THEME.gold)}
              {renderBucket(horizon, "On the Horizon", THEME.muted, true)}
            </>
          )}

          {filteredUpcoming.length === 0 && activeFilter !== "All" && (upcoming.length > 0 || past.length > 0) && (
            <div style={{ textAlign: "center", padding: "40px 0", color: THEME.muted, fontSize: 13 }}>
              No upcoming {activeFilter} alerts.
            </div>
          )}

          {/* ── PAST DUE ── */}
          {past.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, color: THEME.muted, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Past Due Alerts · {past.length}</span>
                <button
                  onClick={markAllPastDone}
                  style={{
                    fontSize: 11, fontWeight: 700, color: THEME.sage, background: "none", border: "none",
                    cursor: "pointer", display: "flex", alignItems: "center", gap: 4, padding: 0,
                    textTransform: "none", letterSpacing: 0,
                  }}
                  title="Mark all past due as done"
                >
                  <Check size={11} /> Mark all done
                </button>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {pastToShow.map((r) => {
                  const days = Math.abs(daysLeft(r.date));
                  const Icon = TYPE_ICONS[r.type] || Bell;
                  const color = TYPE_COLORS[r.type] || THEME.muted;
                  return (
                    <Card key={r.id} style={{ padding: "12px 20px", opacity: 0.85 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(128,128,128,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <Icon size={15} color={THEME.muted} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>{r.title}</div>
                          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                            <span style={{ color: `color-mix(in srgb, ${color} 70%, ${THEME.muted})`, fontWeight: 700 }}>{r.type}</span>
                            {" · "}
                            {fmtDisplayDate(r.date)}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                          <div style={{
                            fontSize: 11, fontWeight: 700, color: THEME.rust,
                            padding: "2px 8px", borderRadius: 6,
                            background: `${THEME.rust}12`, border: `1px solid ${THEME.rust}22`,
                          }}>
                            {days}d ago
                          </div>

                          <button
                            onClick={() => toggleComplete(r.id, r.date)}
                            title="Mark as Done"
                            style={{
                              width: 28, height: 28, borderRadius: "50%",
                              border: `1px dashed color-mix(in srgb, ${THEME.sage} 40%, transparent)`,
                              background: "transparent",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              cursor: "pointer",
                              color: `color-mix(in srgb, ${THEME.sage} 70%, ${THEME.muted})`,
                              transition: "all 0.2s ease-in-out",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderStyle = "solid";
                              e.currentTarget.style.borderColor = THEME.sage;
                              e.currentTarget.style.color = "#ffffff";
                              e.currentTarget.style.background = THEME.sage;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderStyle = "dashed";
                              e.currentTarget.style.borderColor = `color-mix(in srgb, ${THEME.sage} 40%, transparent)`;
                              e.currentTarget.style.color = `color-mix(in srgb, ${THEME.sage} 70%, ${THEME.muted})`;
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            <Check size={13} strokeWidth={2.5} />
                          </button>

                          {r.manual && updateItem && (
                            <Button variant="ghost" size="sm" onClick={() => setEditingReminder(r.raw)} style={{ padding: 6, color: THEME.muted }} title="Edit">
                              <Pencil size={12} />
                            </Button>
                          )}

                          {r.manual && (
                            <Button variant="ghost" size="sm" onClick={() => removeItem("reminders", r.id)} style={{ padding: 6, color: THEME.rust }}>
                              <Trash2 size={12} />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
              {past.length > 8 && (
                <button
                  onClick={() => setShowAllPast(!showAllPast)}
                  style={{
                    display: "block", width: "100%", marginTop: 10,
                    padding: "8px 0", borderRadius: 8,
                    border: `1px dashed ${THEME.line}`,
                    background: "transparent", cursor: "pointer",
                    fontSize: 12, fontWeight: 700, color: THEME.muted,
                    textAlign: "center",
                  }}
                >
                  {showAllPast ? "Show less" : `Show all ${past.length} past due items`}
                </button>
              )}
            </div>
          )}

          {/* ── COMPLETED REMINDERS ── */}
          {completed.length > 0 && (
            <div style={{ marginTop: 32, marginBottom: 16 }}>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                style={{
                  background: "none", border: "none", padding: 0,
                  display: "flex", alignItems: "center", gap: 8,
                  fontSize: 10, color: THEME.muted, fontWeight: 800,
                  letterSpacing: "0.2em", textTransform: "uppercase",
                  marginBottom: 14, cursor: "pointer", width: "100%", textAlign: "left",
                }}
              >
                <span>Completed Reminders · {completed.length}</span>
                <span style={{ fontSize: 9, transition: "transform 0.2s", transform: showCompleted ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block" }}>▶</span>
              </button>

              {showCompleted && (
                <div style={{ display: "grid", gap: 8 }}>
                  {completed.map((r) => {
                    const color = TYPE_COLORS[r.type] || THEME.muted;
                    return (
                      <Card key={r.id} style={{ padding: "12px 20px", opacity: 0.55, background: "rgba(128,128,128,0.02)", borderLeft: `3px solid ${THEME.sage}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: THEME.sage,
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                          }}>
                            <Check size={16} color="#ffffff" strokeWidth={3} />
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink, textDecoration: "line-through" }}>{r.title}</div>
                            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                              <span style={{ color: `color-mix(in srgb, ${color} 70%, ${THEME.muted})`, fontWeight: 700 }}>{r.type}</span>
                              {" · "}
                              {fmtDisplayDate(r.date)}
                            </div>
                          </div>

                          <button
                            onClick={() => toggleComplete(r.id, r.date)}
                            title="Mark Active"
                            style={{
                              padding: "4px 10px", borderRadius: 6,
                              border: `1px solid ${THEME.line}`, background: "transparent",
                              fontSize: 11, fontWeight: 700, color: THEME.muted, cursor: "pointer",
                              transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = THEME.accent;
                              e.currentTarget.style.color = THEME.accent;
                              e.currentTarget.style.background = `color-mix(in srgb, ${THEME.accent} 10%, transparent)`;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = THEME.line;
                              e.currentTarget.style.color = THEME.muted;
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            Undo
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
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

      {editingReminder && updateItem && (
        <ReminderModal
          initialValues={editingReminder}
          onClose={() => setEditingReminder(null)}
          onSave={(v: any) => {
            updateItem("reminders", editingReminder.id, v);
            setEditingReminder(null);
          }}
        />
      )}
    </div>
  );
}

function ReminderModal({ onClose, onSave, initialValues = null }: any) {
  const [f, setF] = useState(initialValues ? {
    title: initialValues.title || "",
    category: initialValues.category || "Reminder",
    amount: initialValues.amount || "",
    date: initialValues.date || "",
    note: initialValues.note || "",
  } : {
    title: "",
    category: "Reminder",
    amount: "",
    date: "",
    note: "",
  });

  return (
    <Modal title={initialValues ? "Edit Reminder" : "Add Reminder"} onClose={onClose}>
      <Field label="Title">
        <input className="form-input" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Car Insurance Renewal" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Category">
          <select className="form-input" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
            {MANUAL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Due Date">
          <input className="form-input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        </Field>
      </div>
      <Field label="Amount (optional)">
        <input className="form-input" type="number" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} placeholder="e.g. 12000" />
      </Field>
      <Field label="Note (optional)">
        <input className="form-input" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="e.g. Pay via HDFC net banking" />
      </Field>
      <ModalActions onSave={() => f.title && f.date && onSave(f)} onClose={onClose} />
    </Modal>
  );
}
