import React, { useState, useMemo } from "react";
import {
  Bell,
  Plus,
  Trash2,
  CreditCard,
  Repeat,
  Coins,
  FileText,
  Shield,
  HandCoins,
  Check,
  AlertCircle,
  Home,
  Filter,
  X,
  Car,
  Heart,
  IndianRupee,
  Receipt,
  Pencil,
  BellOff,
  BellRing,
  Clock,
  Search as SearchIcon,
  Calendar,
  Sparkles,
  Download,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUpDown,
  Layers,
  SlidersHorizontal,
  Send,
  CheckSquare,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import {
  fmtINRFull,
  fmtINRExact,
  today,
  getCCDueDate,
  getLocalDateString,
  getEffectiveRent,
  maskCurrencyInText,
} from "../../utils/finance";
import { useMilestoneEvents } from "../../hooks/useFinancialEvents";
import { useMasterData, formatProfileOption } from "../../utils/masterData";
import { Modal, ModalActions } from "../ui/Modal";
import { Field } from "../ui/Form";
import { SectionTitle } from "../ui/SectionTitle";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
import { useAsyncAction } from "../../hooks/useAsyncAction";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";
import { ConfirmDialog } from "../ui/Feedback";

const TYPE_COLORS: Record<string, string> = {
  "Credit Card": THEME.rust || "#ef4444",
  Subscription: THEME.gold || "#f59e0b",
  "Fixed Deposit": THEME.accent || "#6366f1",
  Bond: THEME.accent || "#6366f1",
  LIC: THEME.sage || "#10b981",
  "LIC Premium": THEME.sage || "#10b981",
  "Term Plan": THEME.sage || "#10b981",
  "Term Premium": THEME.sage || "#10b981",
  "Investment Plan": THEME.sage || "#10b981",
  "Investment Premium": THEME.sage || "#10b981",
  "Loan Given": THEME.gold || "#f59e0b",
  Rent: THEME.rust || "#ef4444",
  Reminder: THEME.accent || "#6366f1",
  Health: THEME.rust || "#ef4444",
  Vehicle: THEME.gold || "#f59e0b",
  Tax: THEME.rust || "#ef4444",
  Bills: THEME.accent || "#6366f1",
};

const TYPE_ICONS: Record<string, any> = {
  "Credit Card": CreditCard,
  Subscription: Repeat,
  "Fixed Deposit": Coins,
  Bond: FileText,
  LIC: Shield,
  "LIC Premium": Shield,
  "Term Plan": Shield,
  "Term Premium": Shield,
  "Investment Plan": Shield,
  "Investment Premium": Shield,
  "Loan Given": HandCoins,
  Rent: Home,
  Reminder: Bell,
  Health: Heart,
  Vehicle: Car,
  Tax: IndianRupee,
  Bills: Receipt,
};

const MANUAL_CATEGORIES = ["Reminder", "Health", "Vehicle", "Tax", "Bills"];

const TEMPLATE_PRESETS = [
  { label: "Credit Card Bill", category: "Bills", icon: CreditCard, defaultNote: "Credit card monthly statement due" },
  { label: "Car Insurance / PUC", category: "Vehicle", icon: Car, defaultNote: "Annual comprehensive vehicle insurance renewal" },
  { label: "Health Insurance / Medical", category: "Health", icon: Heart, defaultNote: "Annual health policy renewal & checkup" },
  { label: "Property / Advance Tax", category: "Tax", icon: IndianRupee, defaultNote: "Advance tax installment / Municipal tax" },
  { label: "House / Office Rent", category: "Bills", icon: Home, defaultNote: "Monthly rental remittance" },
  { label: "Utility & Broadband Bills", category: "Bills", icon: Receipt, defaultNote: "Electricity / Water / Internet bill payment" },
];

const FAR_FUTURE_CUTOFF = "2099-12-31";

const DEFAULT_NOTIF_SETTINGS = {
  leadDays: 3,
  notifStartHour: 6,
  notifEndHour: 10,
  categories: {
    creditCards: true,
    subscriptions: true,
    reminders: true,
    fdMaturities: true,
    insurancePremiums: true,
    loanRecovery: true,
    rent: true,
    bonds: true,
  },
};

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

function generateGoogleCalendarUrl(r: any): string {
  const title = encodeURIComponent(r.title);
  const details = encodeURIComponent(
    `${r.subtitle || ""}\n\nCategory: ${r.type}\nAmount: ${r.amount ? `₹${r.amount}` : "N/A"}\nManaged via Personal Finance App`
  );
  const dateFormatted = (r.date || "").replace(/-/g, "");
  const nextDay = new Date(new Date((r.date || today()) + "T00:00:00").getTime() + 86400000)
    .toISOString()
    .split("T")[0]
    .replace(/-/g, "");
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateFormatted}/${nextDay}&details=${details}`;
}

function exportIcsFile(reminders: any[]) {
  if (!reminders.length) return;
  const events = reminders.map((r) => {
    const dStr = (r.date || today()).replace(/-/g, "");
    return [
      "BEGIN:VEVENT",
      `SUMMARY:${r.title}`,
      `DESCRIPTION:${(r.subtitle || "").replace(/\n/g, "\\n")}`,
      `DTSTART;VALUE=DATE:${dStr}`,
      `CATEGORIES:${r.type}`,
      `UID:${r.id}-${dStr}@personalfinance`,
      "END:VEVENT",
    ].join("\r\n");
  });

  const icsData = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Personal Finance App//Reminders & Alerts//EN",
    "CALSCALE:GREGORIAN",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([icsData], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `finance-reminders-${today()}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function RemindersTab({ state, addItem, removeItem, updateItem, showToast }: any) {
  const milestoneEvents = useMilestoneEvents(state, FAR_FUTURE_CUTOFF);
  const { privacyMode } = usePrivacy();
  const { familyProfiles = [] } = useMasterData() || {};

  // Dialog & Form States
  const [show, setShow] = useState(false);
  const [editingReminder, setEditingReminder] = useState<any>(null);
  const [confirmDeleteReminder, setConfirmDeleteReminder] = useState<any>(null);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);

  // Filter, Search, Sort & View States
  const [viewMode, setViewMode] = useState<"timeline" | "categories" | "cashflow">("timeline");
  const [activeFilter, setActiveFilter] = useState("All");
  const [urgencyFilter, setUrgencyFilter] = useState<"all" | "critical" | "soon" | "horizon" | "autopay">("all");
  const [flowFilter, setFlowFilter] = useState<"all" | "outflow" | "inflow">("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date_asc" | "date_desc" | "amount_desc" | "title_asc">("date_asc");

  // Snoozed State
  const [snoozedMap, setSnoozedMap] = useState<Record<string, string>>(() => {
    try {
      const s = localStorage.getItem("finance-snoozed-reminders");
      return s ? JSON.parse(s) : {};
    } catch {
      return {};
    }
  });

  const [activeSnoozeMenu, setActiveSnoozeMenu] = useState<string | null>(null);

  const setSnooze = (key: string, newDateStr: string | null) => {
    const next = { ...snoozedMap };
    if (newDateStr) {
      next[key] = newDateStr;
    } else {
      delete next[key];
    }
    setSnoozedMap(next);
    try {
      localStorage.setItem("finance-snoozed-reminders", JSON.stringify(next));
    } catch {}
    setActiveSnoozeMenu(null);
    showToast?.(newDateStr ? `Reminder snoozed to ${fmtDisplayDate(newDateStr)}` : "Snooze cleared", "success");
  };

  const { run: saveNewReminder, loading: savingNewReminder } = useAsyncAction(
    async (v: any) => {
      await addItem("reminders", v);
    },
    {
      onSuccess: () => {
        setShow(false);
        showToast?.("Reminder added successfully", "success");
      },
      onError: (e: any) => showToast?.(`Failed to add reminder: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: saveReminderEdit, loading: savingReminderEdit } = useAsyncAction(
    async (v: any) => {
      await updateItem("reminders", editingReminder.id, v);
    },
    {
      onSuccess: () => {
        setEditingReminder(null);
        showToast?.("Reminder updated successfully", "success");
      },
      onError: (e: any) => showToast?.(`Failed to save reminder: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const { run: deleteReminder } = useAsyncAction(
    async (id: string) => {
      await removeItem("reminders", id);
    },
    {
      onSuccess: () => showToast?.("Reminder removed", "info"),
      onError: (e: any) => showToast?.(`Failed to delete reminder: ${e?.message || "Unknown error"}`, "error"),
    }
  );

  const [notifPerm, setNotifPerm] = useState<string>(() => {
    if (typeof Notification === "undefined") return "unsupported";
    const actual = Notification.permission;
    try {
      localStorage.setItem("finance-notif", actual);
    } catch {}
    return actual;
  });

  const [notifSettings, setNotifSettings] = useState<any>(() => {
    try {
      const saved = localStorage.getItem("finance-notif-settings");
      if (saved)
        return {
          ...DEFAULT_NOTIF_SETTINGS,
          categories: { ...DEFAULT_NOTIF_SETTINGS.categories },
          ...JSON.parse(saved),
        };
    } catch {}
    return DEFAULT_NOTIF_SETTINGS;
  });

  const updateNotifSettings = (updates: any) => {
    const next = { ...notifSettings, ...updates };
    setNotifSettings(next);
    try {
      localStorage.setItem("finance-notif-settings", JSON.stringify(next));
    } catch {}
  };

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

  // Clean up completed reminders older than 90 days
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
    const isNowDone = !completedKeys.includes(key);
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
    showToast?.(isNowDone ? "Marked as completed ✓" : "Restored to active list", "info");
  };

  const markAllPastDone = () => {
    const pastKeys = searchedPast.map((r) => `${r.id}-${r.originalDate || r.date}`);
    const newKeys = [...new Set([...completedKeys, ...pastKeys])];
    setCompletedKeys(newKeys);
    try {
      localStorage.setItem("finance-completed-reminders", JSON.stringify(newKeys));
    } catch {}
    showToast?.(`Marked ${pastKeys.length} past-due reminders as completed`, "success");
  };

  const clearCompletedHistory = () => {
    setCompletedKeys([]);
    try {
      localStorage.removeItem("finance-completed-reminders");
    } catch {}
    showToast?.("Completed history cleared", "info");
  };

  const todayStr = today();

  const requestNotifications = async () => {
    if (typeof Notification === "undefined") {
      setNotifPerm("unsupported");
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
    try {
      localStorage.setItem("finance-notif", perm);
    } catch {}
    if (perm === "granted") {
      showToast?.("Push notifications enabled successfully", "success");
    }
  };

  const sendTestNotification = () => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") {
      showToast?.("Notifications are not permitted yet. Please grant permission first.", "warning");
      return;
    }
    try {
      new Notification("Personal Finance Alert System", {
        body: "Test Alert: Your notification center is active and alerts are verified!",
        icon: "https://img.icons8.com/color/128/bell.png",
      });
      showToast?.("Test notification dispatched!", "success");
    } catch (err: any) {
      showToast?.(`Could not send test notification: ${err?.message || "Error"}`, "error");
    }
  };

  // Compile full reminder list from all modules
  const allReminders = useMemo(() => {
    const list: any[] = [];
    const milestoneByType = (type: string) => milestoneEvents.filter((e: any) => e.type === type);

    // 1. Credit Cards Due Bills
    (state.creditCards || [])
      .filter((c: any) => (c.status || "").toLowerCase() !== "closed")
      .forEach((c: any) => {
        const dueDate = getCCDueDate(c);
        if (dueDate)
          list.push({
            id: "cc-" + c.id,
            title: (c.issuer || "Card") + (c.name ? ` (${c.name})` : "") + " — Bill Due",
            subtitle: c.outstanding ? "Outstanding: " + fmtINRExact(c.outstanding) : "Active credit card",
            date: dueDate,
            originalDate: dueDate,
            type: "Credit Card",
            amount: Number(c.outstanding || 0),
            isOutflow: true,
            autoPay: !!c.autoPay,
            profileId: c.profileId,
            sourceModule: "Credit Cards",
          });
      });

    // 1b. Credit Card Annual Fees
    milestoneByType("cc_fee").forEach((e: any) => {
      const c = e.source;
      list.push({
        id: "ccfee-" + c.id,
        title: (c.issuer || "Card") + " — Annual Fee",
        subtitle: `Yearly card fee · ${fmtINRExact(c.annualFee)}`,
        date: e.date,
        originalDate: e.date,
        type: "Credit Card",
        amount: Number(c.annualFee),
        isOutflow: true,
        profileId: c.profileId,
        sourceModule: "Credit Cards",
      });
    });

    // 2. Subscriptions
    (state.subscriptions || [])
      .filter((s: any) => !s.paused)
      .forEach((s: any) => {
        if (s.renewalDate)
          list.push({
            id: "sub-" + s.id,
            title: s.name + " Renewal",
            subtitle: (s.cycle || s.billingCycle || "Monthly") + " · " + fmtINRExact(s.amount),
            date: s.renewalDate,
            originalDate: s.renewalDate,
            type: "Subscription",
            amount: Number(s.amount || 0),
            isOutflow: true,
            autoPay: !!s.autoPay,
            profileId: s.profileId,
            sourceModule: "Subscriptions",
          });
      });

    // 3. Fixed Deposits
    milestoneByType("fd_maturity").forEach((e: any) => {
      const f = e.source;
      list.push({
        id: "fd-" + f.id,
        title: "FD Maturity — " + (f.bank || f.bankName || "Bank"),
        subtitle: "Principal: " + fmtINRExact(f.principal) + (f.interestRate ? ` @ ${f.interestRate}%` : ""),
        date: e.date,
        originalDate: e.date,
        type: "Fixed Deposit",
        amount: Number(f.principal || 0),
        isOutflow: false,
        profileId: f.profileId,
        sourceModule: "Fixed Deposits",
      });
    });

    // 4. Bonds
    milestoneByType("bond_maturity").forEach((e: any) => {
      const b = e.source;
      list.push({
        id: "bond-" + b.id,
        title: "Bond Maturity — " + b.name,
        subtitle: "Face Value: " + fmtINRExact(b.faceValue || b.totalInvestmentAmount || 0),
        date: e.date,
        originalDate: e.date,
        type: "Bond",
        amount: Number(b.faceValue || b.totalInvestmentAmount || 0),
        isOutflow: false,
        profileId: b.profileId,
        sourceModule: "Bonds",
      });
    });

    // 5. LIC Policies Maturity
    (state.lic || []).forEach((l: any) => {
      if (l.maturityDate)
        list.push({
          id: "lic-" + l.id,
          title: "LIC Maturity — " + l.planName,
          subtitle: "Policy: " + (l.policyNumber || "—") + " · Premium: " + fmtINRExact(l.annualPremium),
          date: l.maturityDate,
          originalDate: l.maturityDate,
          type: "LIC",
          amount: Number(l.sumAssured || 0),
          isOutflow: false,
          profileId: l.profileId,
          sourceModule: "Insurance",
        });
    });

    // 5b. Insurance Premiums
    const policyTermMatured = (source: any, termField: string, anniversaryStr: string) => {
      const payTerm = source[termField] ? parseInt(source[termField], 10) : null;
      if (!payTerm || isNaN(payTerm)) return false;
      const comm = new Date(source.commencementDate || source.startDate);
      const anniversary = new Date(anniversaryStr + "T00:00:00");
      if (isNaN(comm.getTime())) return false;
      return anniversary.getFullYear() - comm.getFullYear() >= payTerm;
    };

    milestoneByType("insurance_premium").forEach((e: any) => {
      const p = e.source;
      if (e.sourceLabel === "LIC") {
        if (policyTermMatured(p, "policyTerm", e.date)) return;
        list.push({
          id: "lic-prem-" + p.id,
          title: `LIC Premium — ${p.planName}`,
          subtitle: `Policy: ${p.policyNumber || "—"} · Premium: ${fmtINRExact(e.amount)}`,
          date: e.date,
          originalDate: e.date,
          type: "LIC Premium",
          amount: Number(e.amount || 0),
          isOutflow: true,
          profileId: p.profileId,
          sourceModule: "Insurance",
        });
      } else if (e.sourceLabel === "Term Plan") {
        if (policyTermMatured(p, p.premiumPayingTerm ? "premiumPayingTerm" : "term", e.date)) return;
        list.push({
          id: "term-prem-" + p.id,
          title: `Term Premium — ${p.planName || "Plan"}`,
          subtitle: `Insurer: ${p.insurer || "—"} · Premium: ${fmtINRExact(e.amount)}`,
          date: e.date,
          originalDate: e.date,
          type: "Term Premium",
          amount: Number(e.amount || 0),
          isOutflow: true,
          profileId: p.profileId,
          sourceModule: "Insurance",
        });
      } else if (e.sourceLabel === "Investment Plan") {
        if (policyTermMatured(p, p.premiumPayingTerm ? "premiumPayingTerm" : "policyTerm", e.date)) return;
        list.push({
          id: "invest-prem-" + p.id,
          title: `Investment Premium — ${p.planName || "Plan"}`,
          subtitle: `Insurer: ${p.insurer || "—"} · Premium: ${fmtINRExact(e.amount)}`,
          date: e.date,
          originalDate: e.date,
          type: "Investment Premium",
          amount: Number(e.amount || 0),
          isOutflow: true,
          profileId: p.profileId,
          sourceModule: "Insurance",
        });
      }
    });

    // 6. Term Plans Expiry
    (state.termPlans || []).forEach((t: any) => {
      if (t.expiryDate)
        list.push({
          id: "term-" + t.id,
          title: "Term Plan Expiry — " + t.planName,
          subtitle: "Cover: " + fmtINRExact(t.coverAmount),
          date: t.expiryDate,
          originalDate: t.expiryDate,
          type: "Term Plan",
          amount: 0,
          isOutflow: false,
          profileId: t.profileId,
          sourceModule: "Insurance",
        });
    });

    // 7. Investment Plans Maturity
    (state.investmentPlans || []).forEach((ip: any) => {
      if (ip.maturityDate) {
        list.push({
          id: "invest-" + ip.id,
          title: "Investment Maturity — " + ip.planName,
          subtitle: "Expected Maturity: " + fmtINRExact(ip.expectedMaturityAmount),
          date: ip.maturityDate,
          originalDate: ip.maturityDate,
          type: "Investment Plan",
          amount: Number(ip.expectedMaturityAmount || 0),
          isOutflow: false,
          profileId: ip.profileId,
          sourceModule: "Investments",
        });
      }
    });

    // 8. Loans Given Recovery
    milestoneByType("loan_given_repayment").forEach((e: any) => {
      const l = e.source;
      list.push({
        id: "loan-" + l.id,
        title: "Loan Recovery — " + (l.borrower || "Borrower"),
        subtitle: "Outstanding: " + fmtINRExact(l.outstanding),
        date: e.date,
        originalDate: e.date,
        type: "Loan Given",
        amount: Number(l.outstanding || 0),
        isOutflow: false,
        profileId: l.profileId,
        sourceModule: "Loans Given",
      });
    });

    // 9. Rented Properties (Payable)
    const todayD = new Date();
    todayD.setHours(0, 0, 0, 0);
    const clampedRentDate = (year: number, month: number, day: number) => {
      const lastDay = new Date(year, month + 1, 0).getDate();
      return new Date(year, month, Math.min(day, lastDay));
    };
    const ordinalSuffix = (n: number) => ["st", "nd", "rd"][((((n + 90) % 100) - 10) % 10) - 1] || "th";

    (state.rentedProperties || [])
      .filter((p: any) => p.isActive !== false && getEffectiveRent(p) > 0)
      .forEach((p: any) => {
        const rentAmt = getEffectiveRent(p);
        const dueDay = p.dueDay ? parseInt(p.dueDay, 10) : 5;
        const currentYear = todayD.getFullYear();
        const currentMonth = todayD.getMonth();
        const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
        const paidCurrent = (p.payments || []).some(
          (pay: any) => pay.date && pay.date.startsWith(currentMonthStr)
        );

        if (!paidCurrent) {
          const dueDate = clampedRentDate(currentYear, currentMonth, dueDay);
          const dStr = getLocalDateString(dueDate);
          list.push({
            id: "rent-" + p.id,
            title: `${p.propertyName || "Rent"} — Monthly Rent`,
            subtitle: `Rent: ${fmtINRExact(rentAmt)} · Due on ${dueDay}${ordinalSuffix(dueDay)} of month`,
            date: dStr,
            originalDate: dStr,
            type: "Rent",
            amount: rentAmt,
            isOutflow: true,
            profileId: p.profileId,
            sourceModule: "Real Estate",
          });
        } else {
          const nextMonth = currentMonth + 1;
          const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
          const nextMonthNorm = nextMonth > 11 ? 0 : nextMonth;
          const nextMonthStr = `${nextYear}-${String(nextMonthNorm + 1).padStart(2, "0")}`;
          const paidNext = (p.payments || []).some(
            (pay: any) => pay.date && pay.date.startsWith(nextMonthStr)
          );
          if (!paidNext) {
            const nextDueDate = clampedRentDate(nextYear, nextMonthNorm, dueDay);
            const dStr = getLocalDateString(nextDueDate);
            list.push({
              id: "rent-next-" + p.id,
              title: `${p.propertyName || "Rent"} — Monthly Rent`,
              subtitle: `Rent: ${fmtINRExact(rentAmt)} · This month already paid ✓`,
              date: dStr,
              originalDate: dStr,
              type: "Rent",
              amount: rentAmt,
              isOutflow: true,
              profileId: p.profileId,
              sourceModule: "Real Estate",
            });
          }
        }
      });

    // 9b. Rental Properties (Receivable)
    (state.rentalProperties || [])
      .filter((p: any) => p.isActive !== false && getEffectiveRent(p) > 0)
      .forEach((p: any) => {
        const rentAmt = getEffectiveRent(p);
        const dueDay = p.dueDay ? parseInt(p.dueDay, 10) : 5;
        const currentYear = todayD.getFullYear();
        const currentMonth = todayD.getMonth();
        const currentMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;
        const receivedCurrent = (p.receipts || []).some(
          (r: any) => r.date && r.date.startsWith(currentMonthStr)
        );

        if (!receivedCurrent) {
          const dueDate = clampedRentDate(currentYear, currentMonth, dueDay);
          const dStr = getLocalDateString(dueDate);
          list.push({
            id: "rent-recv-" + p.id,
            title: `${p.propertyName || "Rent"} — Rent Receivable`,
            subtitle: `Expected: ${fmtINRExact(rentAmt)} · Due on ${dueDay}${ordinalSuffix(dueDay)} of month`,
            date: dStr,
            originalDate: dStr,
            type: "Rent",
            amount: rentAmt,
            isOutflow: false,
            profileId: p.profileId,
            sourceModule: "Real Estate",
          });
        } else {
          const nextMonth = currentMonth + 1;
          const nextYear = nextMonth > 11 ? currentYear + 1 : currentYear;
          const nextMonthNorm = nextMonth > 11 ? 0 : nextMonth;
          const nextMonthStr = `${nextYear}-${String(nextMonthNorm + 1).padStart(2, "0")}`;
          const receivedNext = (p.receipts || []).some(
            (r: any) => r.date && r.date.startsWith(nextMonthStr)
          );
          if (!receivedNext) {
            const nextDueDate = clampedRentDate(nextYear, nextMonthNorm, dueDay);
            const dStr = getLocalDateString(nextDueDate);
            list.push({
              id: "rent-recv-next-" + p.id,
              title: `${p.propertyName || "Rent"} — Rent Receivable`,
              subtitle: `Expected: ${fmtINRExact(rentAmt)} · This month already received ✓`,
              date: dStr,
              originalDate: dStr,
              type: "Rent",
              amount: rentAmt,
              isOutflow: false,
              profileId: p.profileId,
              sourceModule: "Real Estate",
            });
          }
        }
      });

    // 10. Manual Reminders
    (state.reminders || []).forEach((r: any) => {
      const noteParts = [r.note, r.amount ? `Amount: ${fmtINRExact(r.amount)}` : ""].filter(Boolean);
      list.push({
        id: r.id,
        title: r.title,
        subtitle: noteParts.join(" · "),
        date: r.date,
        originalDate: r.date,
        type: r.category || "Reminder",
        amount: Number(r.amount || 0),
        isOutflow: true,
        manual: true,
        raw: r,
        priority: r.priority || "Normal",
        recurrence: r.recurrence || "One-time",
        profileId: r.profileId,
        sourceModule: "Custom Reminder",
      });
    });

    // Apply snooze overrides
    return list.map((item) => {
      const key = `${item.id}-${item.originalDate || item.date}`;
      if (snoozedMap[key]) {
        return {
          ...item,
          date: snoozedMap[key],
          isSnoozed: true,
          snoozedKey: key,
        };
      }
      return item;
    });
  }, [state, milestoneEvents, snoozedMap]);

  const daysLeft = (d: string) =>
    Math.ceil((new Date(d + "T00:00:00").getTime() - new Date(todayStr + "T00:00:00").getTime()) / 86400000);

  // Partition items into Upcoming, Past Due, Completed
  const partitioned = useMemo(() => {
    const upcomingList: any[] = [];
    const pastList: any[] = [];
    const completedList: any[] = [];

    allReminders.forEach((r) => {
      const key = `${r.id}-${r.originalDate || r.date}`;
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
  }, [allReminders, completedKeys, todayStr]);

  const { upcoming, past, completed } = partitioned;

  // Key Financial Metrics
  const next30Metrics = useMemo(() => {
    const in30 = upcoming.filter((r) => daysLeft(r.date) <= 30);
    const outflow = in30.filter((r) => r.isOutflow).reduce((s, r) => s + (r.amount || 0), 0);
    const inflow = in30.filter((r) => !r.isOutflow).reduce((s, r) => s + (r.amount || 0), 0);
    const autoPayCount = upcoming.filter((r) => r.autoPay).length;
    return {
      outflow,
      inflow,
      net: inflow - outflow,
      count: in30.length,
      autoPayCount,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcoming]);

  const availableTypes = useMemo(() => {
    const types = new Set([...upcoming, ...past].map((r) => r.type));
    return TYPE_CATEGORIES.filter((t) => t === "All" || types.has(t));
  }, [upcoming, past]);

  const matchesSearch = (r: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.title || "").toLowerCase().includes(q) ||
      (r.subtitle || "").toLowerCase().includes(q) ||
      (r.type || "").toLowerCase().includes(q) ||
      (r.sourceModule || "").toLowerCase().includes(q)
    );
  };

  // Filter and sort items
  const filteredUpcoming = useMemo(() => {
    let list = upcoming;

    // Type Category Filter
    if (activeFilter !== "All") {
      list = list.filter((r) => r.type === activeFilter);
    }

    // Urgency Filter
    if (urgencyFilter === "critical") {
      list = list.filter((r) => daysLeft(r.date) <= 7);
    } else if (urgencyFilter === "soon") {
      list = list.filter((r) => {
        const d = daysLeft(r.date);
        return d > 7 && d <= 30;
      });
    } else if (urgencyFilter === "horizon") {
      list = list.filter((r) => daysLeft(r.date) > 30);
    } else if (urgencyFilter === "autopay") {
      list = list.filter((r) => r.autoPay);
    }

    // Flow Filter
    if (flowFilter === "outflow") {
      list = list.filter((r) => r.isOutflow);
    } else if (flowFilter === "inflow") {
      list = list.filter((r) => !r.isOutflow);
    }

    // Search Query
    list = list.filter(matchesSearch);

    // Sorting
    return [...list].sort((a, b) => {
      if (sortBy === "date_asc") return new Date(a.date).getTime() - new Date(b.date).getTime();
      if (sortBy === "date_desc") return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === "amount_desc") return (b.amount || 0) - (a.amount || 0);
      if (sortBy === "title_asc") return (a.title || "").localeCompare(b.title || "");
      return 0;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcoming, activeFilter, urgencyFilter, flowFilter, search, sortBy]);

  // Groupings
  const critical = filteredUpcoming.filter((r) => daysLeft(r.date) <= 7);
  const soon = filteredUpcoming.filter((r) => {
    const d = daysLeft(r.date);
    return d > 7 && d <= 30;
  });
  const horizon = filteredUpcoming.filter((r) => daysLeft(r.date) > 30);

  const searchedPast = past.filter(matchesSearch);
  const pastToShow = showAllPast ? [...searchedPast].reverse() : [...searchedPast].reverse().slice(0, 8);

  // Groupings by category for Category Matrix view
  const categoryGroups = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredUpcoming.forEach((r) => {
      const arr = map.get(r.type) || [];
      arr.push(r);
      map.set(r.type, arr);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredUpcoming]);

  // Groupings for Cashflow matrix view
  const cashflowGroups = useMemo(() => {
    const outflows = filteredUpcoming.filter((r) => r.isOutflow);
    const inflows = filteredUpcoming.filter((r) => !r.isOutflow);
    return {
      outflows,
      inflows,
      totalOutflow: outflows.reduce((s, r) => s + (r.amount || 0), 0),
      totalInflow: inflows.reduce((s, r) => s + (r.amount || 0), 0),
    };
  }, [filteredUpcoming]);

  const renderUrgencyBadge = (r: any, days: number) => {
    if (r.autoPay) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 800,
            padding: "3px 8px",
            borderRadius: 6,
            background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
            color: THEME.sage,
            border: `1px solid color-mix(in srgb, ${THEME.sage} 25%, transparent)`,
          }}
          title="Auto-debited automatically"
        >
          <Shield size={11} /> Auto-Pay
        </span>
      );
    }

    if (days < 0) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 900,
            padding: "3px 8px",
            borderRadius: 6,
            background: `color-mix(in srgb, ${THEME.rust} 12%, transparent)`,
            color: THEME.rust,
            border: `1px solid color-mix(in srgb, ${THEME.rust} 25%, transparent)`,
          }}
        >
          <AlertTriangle size={11} /> {Math.abs(days)}d Overdue
        </span>
      );
    }

    if (days === 0) {
      return (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            fontWeight: 900,
            padding: "3px 8px",
            borderRadius: 6,
            background: `color-mix(in srgb, ${THEME.rust} 15%, transparent)`,
            color: THEME.rust,
            border: `1px solid color-mix(in srgb, ${THEME.rust} 30%, transparent)`,
          }}
        >
          <Clock size={11} /> Due Today!
        </span>
      );
    }

    if (days === 1) {
      return (
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            padding: "3px 8px",
            borderRadius: 6,
            background: `color-mix(in srgb, ${THEME.rust} 10%, transparent)`,
            color: THEME.rust,
            border: `1px solid color-mix(in srgb, ${THEME.rust} 20%, transparent)`,
          }}
        >
          Tomorrow
        </span>
      );
    }

    if (days <= 7) {
      return (
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            padding: "3px 8px",
            borderRadius: 6,
            background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
            color: THEME.rust,
            border: `1px solid color-mix(in srgb, ${THEME.rust} 18%, transparent)`,
          }}
        >
          In {days} days
        </span>
      );
    }

    if (days <= 30) {
      return (
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: 6,
            background: `color-mix(in srgb, ${THEME.gold} 10%, transparent)`,
            color: THEME.gold,
            border: `1px solid color-mix(in srgb, ${THEME.gold} 20%, transparent)`,
          }}
        >
          In {days} days
        </span>
      );
    }

    return (
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          padding: "3px 8px",
          borderRadius: 6,
          background: "var(--surface-2)",
          color: THEME.muted,
          border: `1px solid ${THEME.line}`,
        }}
      >
        In {days} days
      </span>
    );
  };

  const renderReminderCard = (r: any, compact = false) => {
    const days = daysLeft(r.date);
    const color = TYPE_COLORS[r.type] || THEME.accent;
    const Icon = TYPE_ICONS[r.type] || Bell;
    const snoozeKey = `${r.id}-${r.originalDate || r.date}`;
    const isSnoozeOpen = activeSnoozeMenu === snoozeKey;

    const profile = (familyProfiles || []).find((p: any) => p.id === r.profileId);

    return (
      <Card
        key={r.id + r.date}
        style={{
          padding: compact ? "12px 16px" : "16px 20px",
          borderLeft: `4px solid ${color}`,
          position: "relative",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          background: "var(--surface-0)",
          boxShadow: "var(--shadow-sm)",
        }}
        className="reminder-item-card"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {/* Category Icon Container */}
          <div
            style={{
              width: compact ? 36 : 42,
              height: compact ? 36 : 42,
              borderRadius: 12,
              flexShrink: 0,
              background: `color-mix(in srgb, ${color} 10%, transparent)`,
              border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 2px 8px color-mix(in srgb, ${color} 12%, transparent)`,
            }}
          >
            <Icon size={compact ? 18 : 21} color={color} />
          </div>

          {/* Central Information Block */}
          <div style={{ flex: "1 1 240px", minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontWeight: 800,
                  fontSize: compact ? 13 : 15,
                  color: THEME.ink,
                  letterSpacing: "-0.01em",
                }}
              >
                {r.title}
              </span>

              {/* Type Chip */}
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: "var(--radius-xs)",
                  background: `color-mix(in srgb, ${color} 8%, transparent)`,
                  color,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  border: `1px solid color-mix(in srgb, ${color} 18%, transparent)`,
                }}
              >
                {r.type}
              </span>

              {/* Inflow vs Outflow tag */}
              {r.amount > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: r.isOutflow
                      ? `color-mix(in srgb, ${THEME.rust} 8%, transparent)`
                      : `color-mix(in srgb, ${THEME.sage} 10%, transparent)`,
                    color: r.isOutflow ? THEME.rust : THEME.sage,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  {r.isOutflow ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                  {r.isOutflow ? "Payable" : "Receivable"}
                </span>
              )}

              {/* Snoozed Tag */}
              {r.isSnoozed && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "2px 6px",
                    borderRadius: 4,
                    background: `color-mix(in srgb, ${THEME.gold} 12%, transparent)`,
                    color: THEME.gold,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                    border: `1px solid color-mix(in srgb, ${THEME.gold} 20%, transparent)`,
                  }}
                >
                  <RotateCcw size={10} /> Snoozed
                </span>
              )}

              {/* Family Profile Tag */}
              {profile && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: "var(--surface-2)",
                    color: THEME.muted,
                  }}
                >
                  {formatProfileOption(profile)}
                </span>
              )}
            </div>

            {/* Subtitle / Details */}
            {r.subtitle && (
              <div style={{ fontSize: 12, color: THEME.muted, fontWeight: 500, lineHeight: 1.4 }}>
                {maskCurrencyInText(r.subtitle, privacyMode)}
              </div>
            )}
          </div>

          {/* Amount Badge */}
          {r.amount > 0 && (
            <div
              style={{
                textAlign: "right",
                padding: "4px 12px",
                borderRadius: 8,
                background: "var(--surface-1)",
                border: `1px solid ${THEME.line}`,
                minWidth: 100,
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                {r.isOutflow ? "Payment Due" : "Maturity / Inflow"}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: r.isOutflow ? THEME.ink : THEME.sage,
                }}
              >
                <Prv>{fmtINRFull(r.amount)}</Prv>
              </div>
            </div>
          )}

          {/* Date & Urgency State */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, minWidth: 95 }}>
            {renderUrgencyBadge(r, days)}
            <div style={{ fontSize: 11, color: THEME.muted, fontWeight: 600 }}>
              {fmtDisplayDate(r.date)}
            </div>
          </div>

          {/* Quick Action Controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, position: "relative" }}>
            {/* Mark Complete Check Button */}
            <button
              onClick={() => toggleComplete(r.id, r.originalDate || r.date)}
              title="Mark as Completed"
              aria-label={`Mark ${r.title} as completed`}
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                border: `1.5px solid color-mix(in srgb, ${THEME.sage} 40%, transparent)`,
                background: `color-mix(in srgb, ${THEME.sage} 6%, transparent)`,
                color: THEME.sage,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.18s ease-in-out",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = THEME.sage;
                e.currentTarget.style.color = "#ffffff";
                e.currentTarget.style.transform = "scale(1.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = `color-mix(in srgb, ${THEME.sage} 6%, transparent)`;
                e.currentTarget.style.color = THEME.sage;
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <Check size={16} strokeWidth={2.5} />
            </button>

            {/* Snooze Dropdown Menu */}
            <div style={{ position: "relative" }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveSnoozeMenu(isSnoozeOpen ? null : snoozeKey)}
                style={{ padding: "6px 8px", color: r.isSnoozed ? THEME.gold : THEME.muted }}
                title="Snooze Reminder"
                aria-label="Snooze options"
              >
                <Clock size={14} />
              </Button>

              {isSnoozeOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "100%",
                    marginTop: 4,
                    zIndex: 50,
                    background: "var(--surface-0)",
                    borderRadius: 10,
                    border: `1.5px solid ${THEME.line}`,
                    boxShadow: "var(--shadow-lg)",
                    padding: 6,
                    minWidth: 160,
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 800, color: THEME.muted, padding: "4px 8px", textTransform: "uppercase" }}>
                    Snooze Reminder
                  </div>
                  {[
                    { label: "3 Days (+3d)", days: 3 },
                    { label: "1 Week (+7d)", days: 7 },
                    { label: "2 Weeks (+14d)", days: 14 },
                    { label: "1 Month (+30d)", days: 30 },
                  ].map((opt) => {
                    const target = new Date(new Date().getTime() + opt.days * 86400000)
                      .toISOString()
                      .split("T")[0];
                    return (
                      <button
                        key={opt.label}
                        onClick={() => setSnooze(snoozeKey, target)}
                        style={{
                          textAlign: "left",
                          padding: "6px 8px",
                          fontSize: 12,
                          fontWeight: 600,
                          borderRadius: 6,
                          background: "transparent",
                          border: "none",
                          color: THEME.ink,
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-1)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                  {r.isSnoozed && (
                    <button
                      onClick={() => setSnooze(snoozeKey, null)}
                      style={{
                        textAlign: "left",
                        padding: "6px 8px",
                        fontSize: 12,
                        fontWeight: 700,
                        borderRadius: 6,
                        background: `color-mix(in srgb, ${THEME.rust} 8%, transparent)`,
                        border: "none",
                        color: THEME.rust,
                        cursor: "pointer",
                        marginTop: 4,
                      }}
                    >
                      Reset to original date
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Google Calendar Link */}
            <a
              href={generateGoogleCalendarUrl(r)}
              target="_blank"
              rel="noopener noreferrer"
              title="Add to Google Calendar"
              aria-label="Add to Google Calendar"
              style={{
                padding: "6px 8px",
                color: THEME.muted,
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 6,
                textDecoration: "none",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = THEME.accent)}
              onMouseLeave={(e) => (e.currentTarget.style.color = THEME.muted)}
            >
              <Calendar size={14} />
            </a>

            {/* Edit (manual only) */}
            {r.manual && updateItem && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingReminder(r.raw)}
                style={{ padding: "6px 8px", color: THEME.muted }}
                title="Edit Reminder"
                aria-label={`Edit ${r.title}`}
              >
                <Pencil size={14} />
              </Button>
            )}

            {/* Delete (manual only) */}
            {r.manual && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmDeleteReminder(r)}
                style={{ padding: "6px 8px", color: THEME.rust }}
                title="Delete Reminder"
                aria-label="Delete reminder"
              >
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
    const subtotal = items.reduce((s, r) => (r.isOutflow ? s + (r.amount || 0) : s), 0);
    return (
      <div style={{ marginBottom: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
            borderBottom: `1px solid ${THEME.line}`,
            paddingBottom: 6,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: labelColor,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: labelColor,
                display: "inline-block",
                boxShadow: `0 0 6px ${labelColor}`,
              }}
            />
            {label} · {items.length} {items.length === 1 ? "alert" : "alerts"}
          </div>

          {subtotal > 0 && (
            <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>
              Outflow: <Prv>{fmtINRFull(subtotal)}</Prv>
            </div>
          )}
        </div>
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((r) => renderReminderCard(r, compact))}
        </div>
      </div>
    );
  };

  return (
    <div className="tab-content-enter">
      {/* ── SECTION HEADER & PRIMARY ACTIONS ── */}
      <SectionTitle
        sub="Comprehensive tracking of upcoming bills, maturities, premium dues, and customized alerts"
        rightElement={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* Quick Export iCal */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportIcsFile(filteredUpcoming.length ? filteredUpcoming : upcoming)}
              icon={<Download size={14} />}
              title="Export reminders to .ics calendar file"
            >
              Export Calendar
            </Button>

            {/* Notification Drawer Toggle */}
            <Button
              variant={showSettingsDrawer ? "primary" : "secondary"}
              size="sm"
              onClick={() => setShowSettingsDrawer(!showSettingsDrawer)}
              icon={notifPerm === "granted" ? <BellRing size={14} color={THEME.sage} /> : <SlidersHorizontal size={14} />}
            >
              Notifications
            </Button>

            {/* Add Custom Reminder Modal Button */}
            <Button variant="accent" size="sm" onClick={() => setShow(true)} icon={<Plus size={14} />}>
              Add Reminder
            </Button>
          </div>
        }
      >
        Reminders &amp; Alerts
      </SectionTitle>

      {/* ── NOTIFICATION SETTINGS DRAWER / BANNER ── */}
      {showSettingsDrawer && notifPerm !== "unsupported" && (
        <Card
          style={{
            padding: 20,
            marginBottom: 24,
            border: `1.5px solid ${notifPerm === "granted" ? `color-mix(in srgb, ${THEME.sage} 30%, transparent)` : THEME.line}`,
            background: "var(--surface-0)",
            boxShadow: "var(--shadow-md)",
            borderRadius: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background:
                    notifPerm === "granted"
                      ? `color-mix(in srgb, ${THEME.sage} 12%, transparent)`
                      : `color-mix(in srgb, ${THEME.rust} 10%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {notifPerm === "granted" ? (
                  <BellRing size={18} color={THEME.sage} />
                ) : notifPerm === "denied" ? (
                  <BellOff size={18} color={THEME.rust} />
                ) : (
                  <Bell size={18} color={THEME.muted} />
                )}
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: THEME.ink }}>
                  Push Notification Center
                </div>
                <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                  {notifPerm === "granted"
                    ? "Active — Daily morning background alerts are enabled for your selected categories"
                    : notifPerm === "denied"
                    ? "Notifications blocked by browser. Please enable site permissions in your browser settings."
                    : "Enable browser push notifications to get automated morning reminders before dues."}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {notifPerm === "default" && (
                <Button variant="accent" size="sm" onClick={requestNotifications} icon={<Bell size={14} />}>
                  Enable Push Notifications
                </Button>
              )}
              {notifPerm === "granted" && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={sendTestNotification}
                  icon={<Send size={13} />}
                >
                  Send Test Notification
                </Button>
              )}
            </div>
          </div>

          {notifPerm === "granted" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 18,
                paddingTop: 16,
                borderTop: `1px solid ${THEME.line}`,
              }}
            >
              {/* Lead Days Config */}
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 8,
                  }}
                >
                  Advance Notice Horizon
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {[1, 2, 3, 5, 7].map((d) => {
                    const active = (notifSettings.leadDays || 3) === d;
                    return (
                      <button
                        key={d}
                        onClick={() => updateNotifSettings({ leadDays: d })}
                        aria-pressed={active}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 8,
                          border: active ? `2px solid ${THEME.accent}` : `1.5px solid ${THEME.line}`,
                          background: active ? `color-mix(in srgb, ${THEME.accent} 10%, transparent)` : "var(--surface-1)",
                          color: active ? THEME.accent : THEME.ink,
                          fontWeight: 800,
                          fontSize: 12,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {d} {d === 1 ? "day" : "days"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notification Hour Window */}
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 8,
                  }}
                >
                  Notification Time Window (IST)
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <select
                    value={notifSettings.notifStartHour ?? 6}
                    onChange={(e) => updateNotifSettings({ notifStartHour: Number(e.target.value) })}
                    aria-label="Notification start hour"
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: `1.5px solid ${THEME.line}`,
                      background: "var(--surface-1)",
                      color: THEME.ink,
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: 12, color: THEME.muted, fontWeight: 700 }}>to</span>
                  <select
                    value={notifSettings.notifEndHour ?? 10}
                    onChange={(e) => updateNotifSettings({ notifEndHour: Number(e.target.value) })}
                    aria-label="Notification end hour"
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: `1.5px solid ${THEME.line}`,
                      background: "var(--surface-1)",
                      color: THEME.ink,
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i === 0 ? "12 AM" : i < 12 ? `${i} AM` : i === 12 ? "12 PM" : `${i - 12} PM`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Monitored Categories */}
              <div style={{ gridColumn: "1 / -1" }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: THEME.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: 10,
                  }}
                >
                  Enabled Alert Categories
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
                  {[
                    { key: "creditCards", label: "Credit Cards", Icon: CreditCard },
                    { key: "subscriptions", label: "Subscriptions", Icon: Repeat },
                    { key: "reminders", label: "Custom Alerts", Icon: Bell },
                    { key: "fdMaturities", label: "FD Maturities", Icon: Coins },
                    { key: "insurancePremiums", label: "Insurance Dues", Icon: Shield },
                    { key: "loanRecovery", label: "Loan Recovery", Icon: HandCoins },
                    { key: "rent", label: "Rent Schedules", Icon: Home },
                    { key: "bonds", label: "Bond Maturities", Icon: FileText },
                  ].map(({ key, label, Icon }) => {
                    const on = notifSettings.categories?.[key] !== false;
                    return (
                      <button
                        key={key}
                        onClick={() =>
                          updateNotifSettings({
                            categories: { ...(notifSettings.categories || {}), [key]: !on },
                          })
                        }
                        aria-pressed={on}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 10px",
                          borderRadius: 8,
                          border: on ? `1.5px solid color-mix(in srgb, ${THEME.sage} 30%, transparent)` : `1px solid ${THEME.line}`,
                          background: on ? `color-mix(in srgb, ${THEME.sage} 6%, transparent)` : "var(--surface-1)",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        <Icon size={14} color={on ? THEME.sage : THEME.muted} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: on ? THEME.ink : THEME.muted, flex: 1, textAlign: "left" }}>
                          {label}
                        </span>
                        {on && <Check size={12} color={THEME.sage} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* ── STAT TILES ── */}
      {(() => {
        const critCount = upcoming.filter((r) => daysLeft(r.date) <= 7).length;
        const tiles = [
          {
            label: "Upcoming Alerts",
            value: String(upcoming.length),
            numericValue: upcoming.length,
            formatValue: (n: number) => String(Math.round(n)),
            sub: `${next30Metrics.count} in next 30 days`,
            color: THEME.accent,
            icon: <Bell size={18} />,
          },
          {
            label: "Due in ≤7 Days",
            value: String(critCount),
            numericValue: critCount,
            formatValue: (n: number) => String(Math.round(n)),
            sub: critCount > 0 ? "Immediate attention required" : "All clear this week",
            color: critCount > 0 ? THEME.rust : THEME.sage,
            icon: <BellRing size={18} />,
          },
          {
            label: "Past Due / Overdue",
            value: String(past.length),
            numericValue: past.length,
            formatValue: (n: number) => String(Math.round(n)),
            sub: past.length > 0 ? "Unresolved overdue alerts" : "Zero overdue liabilities",
            color: past.length > 0 ? THEME.rust : THEME.muted,
            icon: <AlertCircle size={18} />,
          },
          {
            label: "30-Day Outflow",
            value: fmtINRFull(next30Metrics.outflow),
            numericValue: next30Metrics.outflow,
            formatValue: fmtINRFull,
            sub: next30Metrics.inflow > 0 ? `Net: ${fmtINRFull(next30Metrics.net)}` : "Payments in next 30 days",
            color: next30Metrics.outflow > 0 ? THEME.rust : THEME.muted,
            icon: <IndianRupee size={18} />,
          },
        ];
        return (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
              marginBottom: 24,
            }}
          >
            {tiles.map(({ label, value, sub, color, icon, numericValue, formatValue }) => (
              <StatCard
                key={label}
                label={label}
                value={value}
                numericValue={numericValue}
                formatValue={formatValue}
                sub={sub}
                color={color}
                icon={icon}
              />
            ))}
          </div>
        );
      })()}

      {/* ── 30-DAY CASHFLOW FORECAST BAR ── */}
      {upcoming.length > 0 && (next30Metrics.outflow > 0 || next30Metrics.inflow > 0) && (
        <Card
          style={{
            padding: "14px 20px",
            marginBottom: 20,
            background: "var(--surface-0)",
            border: `1px solid ${THEME.line}`,
            borderRadius: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: `color-mix(in srgb, ${THEME.accent} 10%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sparkles size={16} color={THEME.accent} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                  30-Day Liquidity Forecast
                </div>
                <div style={{ fontSize: 11, color: THEME.muted }}>
                  {next30Metrics.autoPayCount > 0 ? `${next30Metrics.autoPayCount} auto-debited liabilities shielded` : "All dues require manual remittance"}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                  Expected Outflow
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: THEME.rust }}>
                  <Prv>-{fmtINRFull(next30Metrics.outflow)}</Prv>
                </div>
              </div>

              {next30Metrics.inflow > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                    Expected Inflow
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: THEME.sage }}>
                    <Prv>+{fmtINRFull(next30Metrics.inflow)}</Prv>
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: THEME.muted, textTransform: "uppercase" }}>
                  Net Balance Burden
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, color: next30Metrics.net >= 0 ? THEME.sage : THEME.rust }}>
                  <Prv>{fmtINRFull(next30Metrics.net)}</Prv>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ── CONTROLS TOOLBAR: SEARCH, VIEW SWITCHER, FILTERS ── */}
      {(upcoming.length > 0 || past.length > 0) && (
        <Card
          style={{
            padding: "12px 16px",
            marginBottom: 20,
            background: "var(--surface-0)",
            borderRadius: 12,
            border: `1px solid ${THEME.line}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            {/* Search Input */}
            <div style={{ display: "flex", position: "relative", alignItems: "center", flex: "1 1 260px", maxWidth: 360 }}>
              <SearchIcon
                size={15}
                color={THEME.muted}
                style={{ position: "absolute", left: 12, pointerEvents: "none" }}
              />
              <input
                type="text"
                aria-label="Search reminders"
                placeholder="Search by title, provider, category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: `8px ${search ? 32 : 12}px 8px 36px`,
                  borderRadius: 8,
                  border: `1.5px solid ${THEME.line}`,
                  background: "var(--surface-1)",
                  color: THEME.ink,
                  fontSize: 13,
                  fontFamily: "inherit",
                }}
              />
              {search && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearch("")}
                  style={{
                    position: "absolute",
                    right: 8,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    border: "none",
                    background: "var(--surface-2)",
                    color: THEME.muted,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <X size={11} />
                </button>
              )}
            </div>

            {/* View Mode Switcher */}
            <div
              style={{
                display: "inline-flex",
                background: "var(--surface-1)",
                padding: 3,
                borderRadius: 8,
                border: `1px solid ${THEME.line}`,
              }}
            >
              {[
                { id: "timeline", label: "Timeline", icon: Clock },
                { id: "categories", label: "Categories", icon: Layers },
                { id: "cashflow", label: "Cash Flow", icon: ArrowUpDown },
              ].map(({ id, label, icon: ModeIcon }) => {
                const active = viewMode === id;
                return (
                  <button
                    key={id}
                    onClick={() => setViewMode(id as any)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 12px",
                      borderRadius: 6,
                      border: "none",
                      background: active ? "var(--surface-0)" : "transparent",
                      color: active ? THEME.ink : THEME.muted,
                      fontWeight: active ? 800 : 600,
                      fontSize: 12,
                      cursor: "pointer",
                      boxShadow: active ? "var(--shadow-sm)" : "none",
                      transition: "all 0.15s",
                    }}
                  >
                    <ModeIcon size={13} />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Sort Control */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort reminders by"
                style={{
                  padding: "5px 8px",
                  borderRadius: 6,
                  border: `1px solid ${THEME.line}`,
                  background: "var(--surface-1)",
                  color: THEME.ink,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <option value="date_asc">Date (Earliest First)</option>
                <option value="date_desc">Date (Latest First)</option>
                <option value="amount_desc">Amount (Highest First)</option>
                <option value="title_asc">Title (A to Z)</option>
              </select>
            </div>
          </div>

          {/* Filter Pills Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 12,
              paddingTop: 10,
              borderTop: `1px solid ${THEME.line}`,
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Filter size={13} color={THEME.muted} />
              <span style={{ fontSize: 11, fontWeight: 800, color: THEME.muted, textTransform: "uppercase" }}>
                Filter:
              </span>
            </div>

            {/* Urgency Filter Pills */}
            {[
              { id: "all", label: "All Items" },
              { id: "critical", label: "Critical (≤7d)" },
              { id: "soon", label: "Soon (8-30d)" },
              { id: "horizon", label: "Later (>30d)" },
              { id: "autopay", label: "Auto-Pay Only" },
            ].map((u) => {
              const active = urgencyFilter === u.id;
              return (
                <button
                  key={u.id}
                  onClick={() => setUrgencyFilter(u.id as any)}
                  style={{
                    padding: "3px 10px",
                    borderRadius: 12,
                    border: "none",
                    background: active ? `color-mix(in srgb, ${THEME.accent} 15%, transparent)` : "var(--surface-1)",
                    color: active ? THEME.accent : THEME.muted,
                    fontSize: 11,
                    fontWeight: active ? 800 : 600,
                    cursor: "pointer",
                  }}
                >
                  {u.label}
                </button>
              );
            })}

            {/* Flow Filter Pills */}
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {[
                { id: "all", label: "All Flows" },
                { id: "outflow", label: "Outflows Only" },
                { id: "inflow", label: "Inflows Only" },
              ].map((f) => {
                const active = flowFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setFlowFilter(f.id as any)}
                    style={{
                      padding: "3px 8px",
                      borderRadius: 6,
                      border: `1px solid ${active ? THEME.accent : THEME.line}`,
                      background: active ? `color-mix(in srgb, ${THEME.accent} 10%, transparent)` : "transparent",
                      color: active ? THEME.accent : THEME.muted,
                      fontSize: 11,
                      fontWeight: active ? 800 : 600,
                      cursor: "pointer",
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Filter Pills */}
          {availableTypes.length > 2 && (
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                marginTop: 10,
                alignItems: "center",
              }}
            >
              {availableTypes.map((t) => {
                const active = activeFilter === t;
                const col = t === "All" ? THEME.accent : TYPE_COLORS[t] || THEME.accent;
                return (
                  <button
                    key={t}
                    onClick={() => setActiveFilter(t)}
                    aria-pressed={active}
                    style={{
                      padding: "4px 10px",
                      borderRadius: 8,
                      border: "none",
                      background: active ? `color-mix(in srgb, ${col} 15%, transparent)` : "transparent",
                      color: active ? col : THEME.muted,
                      fontSize: 11,
                      fontWeight: active ? 800 : 600,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    {t}
                    {t !== "All" && (
                      <span style={{ marginLeft: 4, opacity: 0.75 }}>
                        ({upcoming.filter((r) => r.type === t).length})
                      </span>
                    )}
                  </button>
                );
              })}
              {activeFilter !== "All" && (
                <button
                  onClick={() => setActiveFilter("All")}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: THEME.muted,
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  <X size={12} /> Clear Filter
                </button>
              )}
            </div>
          )}
        </Card>
      )}

      {/* ── MAIN CONTENT AREA ── */}
      {allReminders.length === 0 ? (
        <EmptyState
          icon={Bell}
          gradient={`linear-gradient(135deg,${THEME.accent} 0%,color-mix(in srgb, var(--t-accent) 65%, white) 100%)`}
          dotColor={THEME.accent}
          title="No Active Reminders"
          description="Reminders auto-populate from your credit cards, fixed deposits, insurance policies, rental contracts, and loan schedules — or add custom reminders below."
          pills={[
            "Credit Card Dues",
            "FD & Bond Maturities",
            "Subscription Renewals",
            "Rent Payment Schedules",
            "Custom Event Alerts",
          ]}
          buttonLabel="Add Manual Reminder"
          onAdd={() => setShow(true)}
        />
      ) : (
        <>
          {/* All Caught Up State */}
          {upcoming.length === 0 && past.length === 0 && completed.length > 0 && (
            <Card
              style={{
                padding: "40px 24px",
                textAlign: "center",
                background: `color-mix(in srgb, ${THEME.sage} 4%, transparent)`,
                border: `1.5px dashed color-mix(in srgb, ${THEME.sage} 30%, transparent)`,
                borderRadius: 16,
                marginBottom: 24,
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: `color-mix(in srgb, ${THEME.sage} 12%, transparent)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                  color: THEME.sage,
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: THEME.ink, marginBottom: 8 }}>
                All Clear &amp; Caught Up!
              </h3>
              <p style={{ fontSize: 13, color: THEME.muted, maxWidth: 420, margin: "0 auto 16px", lineHeight: 1.5 }}>
                You have marked all active reminders as completed and have zero unresolved dues on your financial horizon.
              </p>
              <Button variant="secondary" size="sm" onClick={() => setShow(true)} icon={<Plus size={14} />}>
                Add Custom Reminder
              </Button>
            </Card>
          )}

          {/* ── 1. TIMELINE STREAM VIEW ── */}
          {viewMode === "timeline" && filteredUpcoming.length > 0 && (
            <>
              {renderBucket(critical, "Critical Attention — Due within 7 Days", THEME.rust)}
              {renderBucket(soon, "Upcoming Horizon — Next 8 to 30 Days", THEME.gold)}
              {renderBucket(horizon, "Future Scheduled — Beyond 30 Days", THEME.muted, true)}
            </>
          )}

          {/* ── 2. CATEGORY MATRIX VIEW ── */}
          {viewMode === "categories" && filteredUpcoming.length > 0 && (
            <div style={{ display: "grid", gap: 20 }}>
              {categoryGroups.map(([catName, catItems]) => {
                const color = TYPE_COLORS[catName] || THEME.accent;
                const Icon = TYPE_ICONS[catName] || Bell;
                const totalAmt = catItems.reduce((s, r) => s + (r.amount || 0), 0);
                return (
                  <Card key={catName} style={{ padding: 18, borderRadius: 14 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 14,
                        borderBottom: `1px solid ${THEME.line}`,
                        paddingBottom: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 8,
                            background: `color-mix(in srgb, ${color} 12%, transparent)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon size={16} color={color} />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 800, color: THEME.ink }}>
                          {catName}
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: THEME.muted }}>
                          ({catItems.length})
                        </span>
                      </div>

                      {totalAmt > 0 && (
                        <div style={{ fontSize: 13, fontWeight: 800, color: THEME.ink }}>
                          Total: <Prv>{fmtINRFull(totalAmt)}</Prv>
                        </div>
                      )}
                    </div>
                    <div style={{ display: "grid", gap: 8 }}>
                      {catItems.map((r) => renderReminderCard(r, true))}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {/* ── 3. CASH FLOW IMPACT VIEW ── */}
          {viewMode === "cashflow" && filteredUpcoming.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 18 }}>
              {/* Outflows Column */}
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: THEME.rust,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                    paddingBottom: 6,
                    borderBottom: `2px solid ${THEME.rust}`,
                  }}
                >
                  <span>Upcoming Outflows ({cashflowGroups.outflows.length})</span>
                  <span><Prv>-{fmtINRFull(cashflowGroups.totalOutflow)}</Prv></span>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {cashflowGroups.outflows.map((r) => renderReminderCard(r, true))}
                  {cashflowGroups.outflows.length === 0 && (
                    <div style={{ fontSize: 12, color: THEME.muted, padding: 16, textAlign: "center" }}>
                      No upcoming outflow liabilities.
                    </div>
                  )}
                </div>
              </div>

              {/* Inflows Column */}
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    color: THEME.sage,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                    paddingBottom: 6,
                    borderBottom: `2px solid ${THEME.sage}`,
                  }}
                >
                  <span>Upcoming Inflows ({cashflowGroups.inflows.length})</span>
                  <span><Prv>+{fmtINRFull(cashflowGroups.totalInflow)}</Prv></span>
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {cashflowGroups.inflows.map((r) => renderReminderCard(r, true))}
                  {cashflowGroups.inflows.length === 0 && (
                    <div style={{ fontSize: 12, color: THEME.muted, padding: 16, textAlign: "center" }}>
                      No upcoming expected inflows or maturities.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Zero Search Results Message */}
          {filteredUpcoming.length === 0 && (upcoming.length > 0 || past.length > 0) && (
            <div style={{ textAlign: "center", padding: "40px 0", color: THEME.muted, fontSize: 13 }}>
              {search.trim()
                ? `No upcoming reminders match search query "${search.trim()}".`
                : `No upcoming reminders match active filters.`}
            </div>
          )}

          {/* ── PAST DUE SECTION ── */}
          {past.length > 0 && (
            <div style={{ marginTop: 32, marginBottom: 24 }}>
              <div
                style={{
                  fontSize: 11,
                  color: THEME.rust,
                  fontWeight: 800,
                  letterSpacing: "0.15em",
                  textTransform: "uppercase",
                  marginBottom: 14,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: 6,
                  borderBottom: `1px solid ${THEME.line}`,
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={14} /> Past Due Liabilities · {searchedPast.length}
                </span>
                {searchedPast.length > 0 && (
                  <button
                    onClick={markAllPastDone}
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.sage,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: 0,
                    }}
                    title="Mark all past due as done"
                  >
                    <CheckSquare size={13} /> Mark all done
                  </button>
                )}
              </div>

              {searchedPast.length === 0 && (
                <div style={{ fontSize: 12, color: THEME.muted, padding: "8px 0" }}>
                  No past-due reminders match "{search.trim()}".
                </div>
              )}

              <div style={{ display: "grid", gap: 8 }}>
                {pastToShow.map((r) => {
                  const days = Math.abs(daysLeft(r.date));
                  const Icon = TYPE_ICONS[r.type] || Bell;
                  const color = TYPE_COLORS[r.type] || THEME.muted;
                  return (
                    <Card
                      key={r.id + r.date}
                      style={{
                        padding: "12px 18px",
                        background: `color-mix(in srgb, ${THEME.rust} 3%, var(--surface-0))`,
                        borderLeft: `4px solid ${THEME.rust}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                          <Icon size={18} color={THEME.rust} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: THEME.ink }}>
                            {r.title}
                          </div>
                          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                            <span style={{ color, fontWeight: 700 }}>{r.type}</span>
                            {" · "}
                            {fmtDisplayDate(r.date)}
                            {r.amount > 0 && ` · ₹${fmtINRExact(r.amount)}`}
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: THEME.rust,
                              padding: "3px 8px",
                              borderRadius: 6,
                              background: `color-mix(in srgb, ${THEME.rust} 10%, transparent)`,
                              border: `1px solid color-mix(in srgb, ${THEME.rust} 20%, transparent)`,
                            }}
                          >
                            {days}d Overdue
                          </div>

                          <button
                            onClick={() => toggleComplete(r.id, r.originalDate || r.date)}
                            title="Mark as Done"
                            aria-label={`Mark ${r.title} as done`}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "50%",
                              border: `1px solid ${THEME.sage}`,
                              background: `color-mix(in srgb, ${THEME.sage} 8%, transparent)`,
                              color: THEME.sage,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                          >
                            <Check size={14} strokeWidth={2.5} />
                          </button>

                          {r.manual && updateItem && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingReminder(r.raw)}
                              style={{ padding: 6, color: THEME.muted }}
                              title="Edit"
                              aria-label={`Edit ${r.title}`}
                            >
                              <Pencil size={12} />
                            </Button>
                          )}

                          {r.manual && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setConfirmDeleteReminder(r)}
                              style={{ padding: 6, color: THEME.rust }}
                              title="Delete"
                              aria-label="Delete reminder"
                            >
                              <Trash2 size={12} />
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {searchedPast.length > 8 && (
                <button
                  onClick={() => setShowAllPast(!showAllPast)}
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: 10,
                    padding: "8px 0",
                    borderRadius: 8,
                    border: `1px dashed ${THEME.line}`,
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                    color: THEME.muted,
                    textAlign: "center",
                  }}
                >
                  {showAllPast ? "Show less" : `Show all ${searchedPast.length} past due items`}
                </button>
              )}
            </div>
          )}

          {/* ── COMPLETED REMINDERS ARCHIVE ── */}
          {completed.length > 0 && (
            <div style={{ marginTop: 32, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  aria-expanded={showCompleted}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11,
                    color: THEME.muted,
                    fontWeight: 800,
                    letterSpacing: "0.15em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  <span>Completed Archive · {completed.length}</span>
                  <span
                    style={{
                      fontSize: 9,
                      transition: "transform 0.2s",
                      transform: showCompleted ? "rotate(90deg)" : "rotate(0deg)",
                      display: "inline-block",
                    }}
                  >
                    ▶
                  </span>
                </button>

                {showCompleted && (
                  <button
                    onClick={clearCompletedHistory}
                    style={{
                      background: "none",
                      border: "none",
                      fontSize: 11,
                      fontWeight: 700,
                      color: THEME.rust,
                      cursor: "pointer",
                    }}
                  >
                    Clear History
                  </button>
                )}
              </div>

              {showCompleted && (
                <div style={{ display: "grid", gap: 8 }}>
                  {completed.map((r) => {
                    const color = TYPE_COLORS[r.type] || THEME.muted;
                    return (
                      <Card
                        key={r.id + r.date}
                        style={{
                          padding: "12px 18px",
                          opacity: 0.65,
                          background: "var(--surface-1)",
                          borderLeft: `3px solid ${THEME.sage}`,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <div
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: "50%",
                              background: THEME.sage,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Check size={14} color="#ffffff" strokeWidth={3} />
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 700,
                                color: THEME.ink,
                                textDecoration: "line-through",
                              }}
                            >
                              {r.title}
                            </div>
                            <div style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                              <span style={{ color, fontWeight: 700 }}>{r.type}</span>
                              {" · "}
                              {fmtDisplayDate(r.date)}
                              {r.amount > 0 && ` · ₹${fmtINRExact(r.amount)}`}
                            </div>
                          </div>

                          <button
                            onClick={() => toggleComplete(r.id, r.originalDate || r.date)}
                            title="Restore to Active"
                            style={{
                              padding: "4px 10px",
                              borderRadius: 6,
                              border: `1px solid ${THEME.line}`,
                              background: "transparent",
                              fontSize: 11,
                              fontWeight: 700,
                              color: THEME.muted,
                              cursor: "pointer",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = THEME.accent;
                              e.currentTarget.style.color = THEME.accent;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = THEME.line;
                              e.currentTarget.style.color = THEME.muted;
                            }}
                          >
                            Restore
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

      {/* ── MODALS ── */}
      {show && (
        <ReminderModal
          profiles={familyProfiles}
          onClose={() => setShow(false)}
          onSave={saveNewReminder}
          saving={savingNewReminder}
        />
      )}

      {editingReminder && updateItem && (
        <ReminderModal
          profiles={familyProfiles}
          initialValues={editingReminder}
          onClose={() => setEditingReminder(null)}
          onSave={saveReminderEdit}
          saving={savingReminderEdit}
        />
      )}

      {confirmDeleteReminder && (
        <ConfirmDialog
          message={`Delete "${confirmDeleteReminder.title}"? This cannot be undone.`}
          onConfirm={() => {
            deleteReminder(confirmDeleteReminder.id);
            setConfirmDeleteReminder(null);
          }}
          onCancel={() => setConfirmDeleteReminder(null)}
        />
      )}
    </div>
  );
}

function ReminderModal({ onClose, onSave, initialValues = null, saving = false, profiles = [] }: any) {
  const [f, setF] = useState(
    initialValues
      ? {
          title: initialValues.title || "",
          category: initialValues.category || "Reminder",
          amount: initialValues.amount || "",
          date: initialValues.date || "",
          note: initialValues.note || "",
          priority: initialValues.priority || "Normal",
          recurrence: initialValues.recurrence || "One-time",
          profileId: initialValues.profileId || "",
        }
      : {
          title: "",
          category: "Reminder",
          amount: "",
          date: "",
          note: "",
          priority: "Normal",
          recurrence: "One-time",
          profileId: "",
        }
  );

  const applyPreset = (preset: any) => {
    setF((prev: any) => ({
      ...prev,
      title: preset.label,
      category: preset.category,
      note: preset.defaultNote || prev.note,
    }));
  };

  return (
    <Modal title={initialValues ? "Edit Reminder" : "Create Financial Alert & Reminder"} onClose={onClose}>
      {/* Template Presets */}
      {!initialValues && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: THEME.muted, textTransform: "uppercase", marginBottom: 8 }}>
            Quick Presets
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TEMPLATE_PRESETS.map((p) => {
              const PresetIcon = p.icon;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 8px",
                    borderRadius: 6,
                    border: `1px solid ${THEME.line}`,
                    background: "var(--surface-1)",
                    color: THEME.ink,
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = THEME.accent)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = THEME.line)}
                >
                  <PresetIcon size={12} color={THEME.accent} />
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <Field label="Reminder Title *">
        <input
          className="form-input"
          value={f.title}
          onChange={(e) => setF({ ...f, title: e.target.value })}
          placeholder="e.g. Car Insurance Renewal / Property Tax Due"
          required
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Category">
          <select
            className="form-input"
            value={f.category}
            onChange={(e) => setF({ ...f, category: e.target.value })}
          >
            {MANUAL_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Due Date *">
          <input
            className="form-input"
            type="date"
            value={f.date}
            onChange={(e) => setF({ ...f, date: e.target.value })}
            required
          />
        </Field>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Amount (₹ Optional)">
          <input
            className="form-input"
            type="number"
            value={f.amount}
            onChange={(e) => setF({ ...f, amount: e.target.value })}
            placeholder="e.g. 15000"
          />
        </Field>

        <Field label="Recurrence">
          <select
            className="form-input"
            value={f.recurrence}
            onChange={(e) => setF({ ...f, recurrence: e.target.value })}
          >
            <option value="One-time">One-time</option>
            <option value="Monthly">Monthly</option>
            <option value="Quarterly">Quarterly</option>
            <option value="Half-Yearly">Half-Yearly</option>
            <option value="Annual">Annual</option>
          </select>
        </Field>
      </div>

      {profiles.length > 0 && (
        <Field label="Assign to Family Member / Profile">
          <select
            className="form-input"
            value={f.profileId}
            onChange={(e) => setF({ ...f, profileId: e.target.value })}
          >
            <option value="">(Self / Primary Account)</option>
            {profiles.map((p: any) => (
              <option key={p.id} value={p.id}>
                {formatProfileOption(p)}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="Notes / Action Instructions (Optional)">
        <input
          className="form-input"
          value={f.note}
          onChange={(e) => setF({ ...f, note: e.target.value })}
          placeholder="e.g. Pay via HDFC Net Banking or UPI to avoid late surcharge"
        />
      </Field>

      <ModalActions
        onSave={() => f.title && f.date && onSave(f)}
        onClose={onClose}
        saveLabel={initialValues ? "Save Changes" : "Create Reminder"}
        disabled={saving || !f.title.trim() || !f.date}
        loading={saving}
      />
    </Modal>
  );
}
