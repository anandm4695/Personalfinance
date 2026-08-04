// @ts-nocheck
import React, { useMemo, useState } from "react";
import {
  Calendar,
  CreditCard,
  Activity,
  Repeat,
  Heart,
  Wallet,
  Zap,
  IndianRupee,
  Building2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Receipt,
  Landmark,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, fmtINRExact, today, getCCDueDate, uid } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { EmptyState } from "../ui/EmptyState";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Prv, usePrivacy } from "../../context/PrivacyContext";
// Reuses BillPaymentTab's exact "is this bill paid for its current cycle" formula
// (cross-referenced against billPaymentHistory) instead of re-deriving a second,
// inevitably-divergent version of the same logic here. This is the same shared
// import the app-wide useAlerts hook already uses for the identical reason.
import { dueStatus } from "./BillPaymentTab";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// Shared by the day-name header row and the day-cell grid so the two
// 7-column grids can never drift out of alignment with each other.
const CAL_GRID_COLS = "repeat(7, 1fr)";
const CAL_GRID_GAP = 3;

const ORDINAL = (d: number) => {
  if (d >= 11 && d <= 13) return "th";
  const r = d % 10;
  if (r === 1) return "st";
  if (r === 2) return "nd";
  if (r === 3) return "rd";
  return "th";
};

// Fixed THEME tokens (not raw hex) so every category dot stays theme-aware in
// dark mode and never coincidentally matches a user-selectable accent preset.
const TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  emi: { label: "Loan EMI", color: THEME.rust, icon: Landmark },
  creditcard: { label: "Credit Card Bill", color: THEME.rust, icon: CreditCard },
  sip: { label: "SIP", color: THEME.violet, icon: Activity },
  rd: { label: "RD Instalment", color: THEME.accent, icon: Repeat },
  subscription: { label: "Subscription", color: THEME.cyan, icon: Zap },
  insurance: { label: "Insurance", color: THEME.pink, icon: Heart },
  rent: { label: "Rent", color: THEME.gold, icon: Building2 },
  health: { label: "Health Ins.", color: THEME.sage, icon: Shield },
  bill: { label: "Utility Bill", color: THEME.rust, icon: Receipt },
  other: { label: "Other", color: THEME.muted, icon: Wallet },
};

// Item types that can carry a reliable "does this need a manual action right now"
// signal (an `autoPay` flag and/or a payment ledger to check against). EMIs/SIPs/RDs
// are bank/broker auto-debit mandates by nature and insurance/rent have no such
// tracked field in this app, so they intentionally fall back to the old, calmer
// "past due date" treatment instead of a false-confidence "Overdue" alert.
const MANUAL_ATTENTION_TYPES = new Set(["bill", "creditcard"]);
const needsManualAttention = (p: any) =>
  MANUAL_ATTENTION_TYPES.has(p.type) && !p.autoPay && !p.paidThisCycle;

export function PaymentCalendarTab({ state, addItem, showToast }: any) {
  const { privacyMode } = usePrivacy();
  const todayStr = today();
  const todayDate = new Date(todayStr + "T00:00:00");

  const [viewDate, setViewDate] = useState<{ year: number; month: number }>({
    year: todayDate.getFullYear(),
    month: todayDate.getMonth(),
  });
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  // Tracks the billId currently being logged via "Mark Paid" so that button
  // shows a spinner and can't be double-clicked into two ledger entries.
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  // Writes a same-day payment record to billPaymentHistory (the exact ledger
  // BillPaymentTab's own "Log" action writes to), so a bill paid from this
  // calendar shows up as paid everywhere else in the app too — Bill Payment
  // Tracker, the Smart Alerts "Due This Week" list, and next time this tab
  // computes dueStatus for the same bill. Gated on `addItem` being provided:
  // if the parent hasn't wired it up yet, the action is hidden entirely rather
  // than rendering a button that silently does nothing when clicked.
  const markBillPaid = async (p: any) => {
    if (!addItem || !p.billId || markingPaidId) return;
    setMarkingPaidId(p.billId);
    try {
      await addItem("billPaymentHistory", {
        id: uid(),
        billId: p.billId,
        paidDate: todayStr,
        amount: p.amount,
      });
      showToast?.(`Marked "${p.name}" as paid`, "success");
    } catch (e: any) {
      showToast?.(`Couldn't save payment: ${e?.message || "Unknown error"}`, "error");
    } finally {
      setMarkingPaidId(null);
    }
  };

  // ── Collect all recurring payment items ──────────────────────────────
  const payments = useMemo(() => {
    const items: any[] = [];

    // Loan EMIs
    (state.loansTaken || []).forEach((l: any) => {
      if (!l.emi || Number(l.emi) <= 0) return;
      if (Number(l.monthsRemaining || 0) <= 0) return;
      items.push({
        id: `loan-${l.id}`,
        name: `${l.lenderBorrower || l.type || "Loan"} EMI`,
        type: "emi",
        amount: Number(l.emi),
        frequency: "monthly",
        dueDay: Number(l.dueDay || 5),
        owner: l.owner,
        monthsLeft: Number(l.monthsRemaining),
        startedAt: todayDate,
      });
    });

    // SIPs
    (state.sips || []).forEach((s: any) => {
      if (!s.amount || Number(s.amount) <= 0) return;
      const dueDay = s.startDate ? new Date(s.startDate + "T00:00:00").getDate() : 5;
      items.push({
        id: `sip-${s.id}`,
        name: s.scheme || s.fundName || "SIP",
        type: "sip",
        amount: Number(s.amount),
        frequency: s.frequency === "quarterly" ? "quarterly" : "monthly",
        dueDay,
        owner: s.owner,
        monthsLeft: s.totalInstallments
          ? Number(s.totalInstallments) - (s.paidInstallments || 0)
          : 9999,
        startDate: s.startDate,
      });
    });

    // Recurring Deposits
    (state.recurringDeposits || []).forEach((rd: any) => {
      if (!rd.monthly || Number(rd.monthly) <= 0) return;
      if (rd.maturityDate && rd.maturityDate <= todayStr) return;
      const dueDay = rd.startDate ? new Date(rd.startDate + "T00:00:00").getDate() : 5;
      items.push({
        id: `rd-${rd.id}`,
        name: `${rd.bank || "RD"} Instalment`,
        type: "rd",
        amount: Number(rd.monthly),
        frequency: "monthly",
        dueDay,
        owner: rd.owner,
        monthsLeft: 9999,
        maturityDate: rd.maturityDate,
      });
    });

    // Subscriptions
    (state.subscriptions || []).forEach((s: any) => {
      if (!s.amount || s.paused) return;
      const dueDay = s.renewalDate ? new Date(s.renewalDate + "T00:00:00").getDate() : 1;
      items.push({
        id: `sub-${s.id}`,
        name: s.name || s.provider || "Subscription",
        type: "subscription",
        amount: Number(s.amount),
        frequency: s.cycle || "monthly",
        dueDay,
        owner: null,
        monthsLeft: 9999,
        renewalDate: s.renewalDate,
      });
    });

    // Insurance Premiums — LIC / Term / Investment Plans / Health
    const PREMIUM_FREQ_MULT: Record<string, number> = {
      monthly: 12,
      quarterly: 4,
      semi_annual: 2,
      annual: 1,
    };
    const addInsurance = (policies: any[], tag: string, typeKey: string) => {
      (policies || []).forEach((p: any) => {
        // LIC/Term/Investment-plan records carry a pre-annualized `annualPremium`.
        // Health-insurance records don't — they only have `premium` + `premiumFrequency`
        // (e.g. monthly), so using the raw `premium` as-is understated this calendar's
        // health-premium entry by up to 12x for monthly-billed policies. Annualize using
        // the same frequency multiplier the Health Insurance tab itself uses.
        const premium = p.annualPremium
          ? Number(p.annualPremium)
          : Number(p.premium || 0) * (PREMIUM_FREQ_MULT[p.premiumFrequency] || 1);
        if (!premium) return;
        const startDate = p.commencementDate || p.startDate;
        const dueDay = startDate ? new Date(startDate + "T00:00:00").getDate() : 1;
        items.push({
          id: `${tag}-${p.id}`,
          name: `${p.planName || p.insurer || tag} Premium`,
          type: typeKey,
          amount: premium,
          frequency: "yearly",
          dueDay,
          owner: p.owner,
          monthsLeft: 9999,
          startDate,
        });
      });
    };
    addInsurance(state.lic, "LIC", "insurance");
    addInsurance(state.termPlans, "Term", "insurance");
    addInsurance(state.investmentPlans, "Inv. Plan", "insurance");
    addInsurance(state.healthInsurance, "Health", "health");

    // Utility bills (electricity, gas, water, broadband, mobile, etc.) — this is
    // exactly the same kind of recurring monthly due-date commitment as EMIs/SIPs/
    // subscriptions above, but was previously missing from this calendar entirely.
    // Included regardless of auto-pay: it's still real money going out each month,
    // auto-pay only changes who initiates it. `autoPay` and `paidThisCycle` (via
    // the shared `dueStatus` helper, cross-referenced against billPaymentHistory)
    // are carried onto the item so the calendar can tell "already handled" apart
    // from "genuinely needs your action" instead of dimming every past date alike.
    const billHistory = state.billPaymentHistory || [];
    (state.billPayments || []).forEach((b: any) => {
      if (!b.amount || Number(b.amount) <= 0 || !b.dueDay) return;
      const hist = billHistory
        .filter((h: any) => h.billId === b.id)
        .sort((x: any, y: any) => (y.paidDate || "").localeCompare(x.paidDate || ""));
      const status = dueStatus(Number(b.dueDay), hist[0]?.paidDate);
      items.push({
        id: `bill-${b.id}`,
        billId: b.id,
        name: b.nickname || b.provider || "Bill",
        type: "bill",
        amount: Number(b.amount),
        frequency: "monthly",
        dueDay: Number(b.dueDay),
        owner: b.owner,
        monthsLeft: 9999,
        autoPay: !!b.autoPay,
        paidThisCycle: status.paid,
      });
    });

    // Credit Card statement dues — uses the exact same `getCCDueDate` formula as
    // CreditTab and the global useAlerts hook (single source of truth for CC
    // due-date math), instead of the generic dueDay-clamping every other item
    // type above uses. Unlike EMIs/SIPs (fixed recurring amounts), a card's
    // outstanding balance is only known for its CURRENT cycle — next month's
    // statement total doesn't exist yet — so this resolves to exactly the one
    // upcoming due date getCCDueDate returns (this month or next) rather than
    // being projected forward across the whole 12-month window like the others.
    (state.creditCards || []).forEach((c: any) => {
      if ((c.status || "active").toLowerCase() === "closed") return;
      if (!c.dueDay) return;
      const outstanding = Number(c.outstanding || 0);
      if (outstanding <= 0) return;
      const dueDateStr = getCCDueDate(c, todayDate);
      if (!dueDateStr) return;
      const [dY, dM, dD] = dueDateStr.split("-").map(Number);
      items.push({
        id: `cc-${c.id}`,
        name: `${c.issuer || "Card"} •${c.last4 || "····"}`,
        type: "creditcard",
        amount: outstanding,
        frequency: "monthly",
        dueDay: dD,
        dueYear: dY,
        dueMonth: dM - 1,
        owner: c.owner,
        monthsLeft: 9999,
        autoPay: !!c.autoPay,
      });
    });

    // Rent paid (rented-in properties)
    (state.rentedProperties || []).forEach((p: any) => {
      if (!p.monthlyRent || Number(p.monthlyRent) <= 0) return;
      items.push({
        id: `rent-${p.id}`,
        name: `Rent — ${p.propertyName || p.landlordName || "Property"}`,
        type: "rent",
        amount: Number(p.monthlyRent),
        frequency: "monthly",
        dueDay: Number(p.dueDay || 1),
        owner: p.owner,
        monthsLeft: 9999,
      });
    });
    // Also check rental properties with propertyType "in"
    (state.rentalProperties || [])
      .filter((p: any) => p.propertyType === "in")
      .forEach((p: any) => {
        if (!p.monthlyRent || Number(p.monthlyRent) <= 0) return;
        items.push({
          id: `rentalin-${p.id}`,
          name: `Rent — ${p.propertyName || "Property"}`,
          type: "rent",
          amount: Number(p.monthlyRent),
          frequency: "monthly",
          dueDay: Number(p.dueDay || 1),
          owner: p.owner,
          monthsLeft: 9999,
        });
      });

    return items;
  }, [state, todayStr, todayDate]);

  // ── Check if a payment falls in a given (year, 0-based month) ────────
  const isActiveInMonth = (p: any, year: number, month: number): boolean => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    // Check maturityDate / renewalDate expiry
    if (p.maturityDate && new Date(p.maturityDate + "T00:00:00") < monthStart) return false;

    // Credit card items resolve to exactly one known due month (see the payments
    // useMemo above, via getCCDueDate) instead of recurring indefinitely like
    // EMIs/SIPs/bills — a future month's statement amount isn't knowable yet.
    if (p.type === "creditcard") {
      return year === p.dueYear && month === p.dueMonth;
    }

    // For EMIs: check months remaining from today
    if (p.type === "emi" && p.monthsLeft !== undefined) {
      const now = todayDate;
      const monthsDiff = (year - now.getFullYear()) * 12 + month - now.getMonth();
      return monthsDiff >= 0 && monthsDiff < p.monthsLeft;
    }

    // For SIPs with a fixed installment target: stop showing once the
    // installment count is exhausted, instead of recurring forever. monthsLeft
    // is counted in installments, so for quarterly SIPs convert to calendar
    // months (1 installment = 3 months) before comparing against monthsDiff.
    if (p.type === "sip" && p.monthsLeft !== undefined && p.monthsLeft < 9999) {
      const now = todayDate;
      const monthsDiff = (year - now.getFullYear()) * 12 + month - now.getMonth();
      const monthsRemaining = p.frequency === "quarterly" ? p.monthsLeft * 3 : p.monthsLeft;
      if (monthsDiff < 0 || monthsDiff >= monthsRemaining) return false;
    }

    // For SIPs with quarterly frequency: only every 3rd month from start
    if (p.frequency === "quarterly" && p.startDate) {
      const startMonth = new Date(p.startDate + "T00:00:00").getMonth();
      const startYear = new Date(p.startDate + "T00:00:00").getFullYear();
      const diff = (year - startYear) * 12 + month - startMonth;
      return diff >= 0 && diff % 3 === 0;
    }

    // Yearly items: check if this is the due month
    if (p.frequency === "yearly" && p.startDate) {
      const dueMonth = new Date(p.startDate + "T00:00:00").getMonth();
      return month === dueMonth;
    }
    if (p.frequency === "yearly" && p.renewalDate) {
      const dueMonth = new Date(p.renewalDate + "T00:00:00").getMonth();
      return month === dueMonth;
    }

    return true;
  };

  const getMonthPayments = (year: number, month: number) =>
    payments.filter((p) => isActiveInMonth(p, year, month));

  // ── 12-month overview bars ───────────────────────────────────────────
  const monthlySummary = useMemo(() => {
    const now = todayDate;
    return Array.from({ length: 12 }).map((_, i) => {
      const totalMonths = now.getMonth() + i;
      const year = now.getFullYear() + Math.floor(totalMonths / 12);
      const month = totalMonths % 12;
      const active = getMonthPayments(year, month);
      const total = active.reduce((s: number, p: any) => s + p.amount, 0);
      const breakdown: Record<string, number> = {};
      active.forEach((p: any) => {
        breakdown[p.type] = (breakdown[p.type] || 0) + p.amount;
      });
      return { year, month, total, breakdown, count: active.length };
    });
  }, [payments, todayStr]);

  // ── Calendar grid for selected month ────────────────────────────────
  const calendarData = useMemo(() => {
    const { year, month } = viewDate;
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const activePayments = getMonthPayments(year, month);

    const dayMap: Record<number, any[]> = {};
    activePayments.forEach((p) => {
      if (p.frequency === "yearly" || p.frequency === "quarterly") return;
      const day = Math.min(p.dueDay, daysInMonth);
      if (!dayMap[day]) dayMap[day] = [];
      dayMap[day].push(p);
    });

    const annualThisMonth = activePayments.filter((p) => p.frequency === "yearly");
    const quarterlyThisMonth = activePayments.filter((p) => p.frequency === "quarterly");

    return {
      firstDay,
      daysInMonth,
      dayMap,
      annualThisMonth,
      quarterlyThisMonth,
    };
  }, [viewDate, payments, todayStr]);

  const selectedMonthPayments = getMonthPayments(viewDate.year, viewDate.month);
  const selectedMonthTotal = selectedMonthPayments.reduce((s: number, p: any) => s + p.amount, 0);

  const monthlyAvg = payments.reduce((s: number, p: any) => {
    if (p.frequency === "yearly") return s + p.amount / 12;
    if (p.frequency === "quarterly") return s + p.amount / 3;
    return s + p.amount;
  }, 0);

  // Real "this month" total (independent of month navigation below) — always
  // index 0 of the 12-month overview — so the top stat row stays a stable
  // answer to "what do I actually owe this month" even while browsing ahead.
  const thisMonthTotal = monthlySummary[0]?.total ?? 0;

  // Bills/credit cards past due (or due today) with no autopay and no logged
  // payment for the current cycle — the same "genuinely needs your action"
  // signal used for the day-cell Overdue styling below, rolled up into a
  // single at-a-glance count. Clamps dueDay to the real length of the current
  // month first (e.g. a "31st" bill in a 28/29/30-day month is actually due on
  // the last day), matching how the calendar grid itself places these pills.
  const daysInCurrentMonth = new Date(
    todayDate.getFullYear(),
    todayDate.getMonth() + 1,
    0
  ).getDate();
  const attentionItems = getMonthPayments(todayDate.getFullYear(), todayDate.getMonth()).filter(
    (p: any) => needsManualAttention(p) && Math.min(p.dueDay, daysInCurrentMonth) <= todayDate.getDate()
  );

  // Months between the viewed month and the current month (0 = this month).
  // Navigation is bounded to this range because past months have no due-date
  // history to show (isActiveInMonth excludes monthsDiff < 0 for EMIs/SIPs),
  // and the future range matches the 12-month bar overview above.
  const monthsFromToday =
    (viewDate.year - todayDate.getFullYear()) * 12 + (viewDate.month - todayDate.getMonth());
  const canGoPrev = monthsFromToday > 0;
  const canGoNext = monthsFromToday < 11;

  const navigateMonth = (dir: number) => {
    if (dir < 0 && !canGoPrev) return;
    if (dir > 0 && !canGoNext) return;
    setSelectedDay(null);
    setViewDate((prev) => {
      let m = prev.month + dir;
      let y = prev.year;
      if (m < 0) {
        m = 11;
        y--;
      }
      if (m > 11) {
        m = 0;
        y++;
      }
      return { year: y, month: m };
    });
  };

  if (payments.length === 0) {
    return (
      <div>
        <SectionTitle sub="All EMIs, SIPs, subscriptions, bills, credit cards & premiums by date">
          Payment Calendar
        </SectionTitle>
        <EmptyState
          icon={Calendar}
          gradient={`linear-gradient(135deg, ${THEME.violet} 0%, color-mix(in srgb, ${THEME.violet} 55%, white) 100%)`}
          dotColor={THEME.violet}
          title="No Recurring Payments"
          description="This calendar plots every EMI, SIP, RD, subscription, utility bill, credit card statement and insurance premium you track elsewhere in the app onto a monthly view — add one to see it show up here by due date."
          pills={[
            "Loan EMIs",
            "Credit Card Bills",
            "SIPs & RDs",
            "Subscriptions",
            "Utility Bills",
            "Insurance Premiums",
          ]}
        />
      </div>
    );
  }

  const maxBar = Math.max(...monthlySummary.map((m) => m.total), 1);

  return (
    <div className="tab-content-enter">
      <style>{`
        @media (max-width: 480px) {
          .paycal-day-cell { min-height: 44px !important; padding: 3px 2px !important; }
          .paycal-day-cell > div:first-child { font-size: 10px !important; }
          .paycal-pill { font-size: 8px !important; padding: 1px 2px !important; }
        }
      `}</style>
      <SectionTitle sub="Every recurring outflow — EMIs, SIPs, RDs, subscriptions, bills, credit cards & insurance premiums plotted by date">
        Payment Calendar
      </SectionTitle>

      {/* Summary stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <StatCard
          label="Due This Month"
          value={privacyMode ? "••••" : fmtINRFull(thisMonthTotal)}
          sub={`${monthlySummary[0]?.count ?? 0} payment${(monthlySummary[0]?.count ?? 0) === 1 ? "" : "s"}`}
          icon={<Calendar />}
          color={THEME.accent}
        />
        <StatCard
          label="Monthly Committed (avg)"
          value={privacyMode ? "••••" : fmtINRFull(monthlyAvg)}
          icon={<Repeat />}
          color={THEME.violet}
        />
        <StatCard
          label="Annual Committed"
          value={privacyMode ? "••••" : fmtINRFull(monthlyAvg * 12)}
          icon={<IndianRupee />}
          color={THEME.rust}
        />
        <StatCard
          label="Needs Attention"
          value={String(attentionItems.length)}
          sub={attentionItems.length > 0 ? "Unpaid & past due" : "All clear"}
          subColor={attentionItems.length > 0 ? THEME.rust : THEME.sage}
          icon={attentionItems.length > 0 ? <AlertTriangle /> : <CheckCircle2 />}
          color={attentionItems.length > 0 ? THEME.rust : THEME.sage}
        />
      </div>

      {/* 12-month bar overview */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ padding: 20 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              marginBottom: 16,
              color: THEME.ink,
            }}
          >
            Monthly Outflows — Next 12 Months
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "flex-end",
              overflowX: "auto",
              paddingBottom: 4,
            }}
          >
            {monthlySummary.map((m, i) => {
              const barH = Math.max(8, (m.total / maxBar) * 84);
              const isSelected = m.year === viewDate.year && m.month === viewDate.month;
              return (
                <div
                  key={i}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${MONTH_NAMES[m.month]} ${m.year}, ${privacyMode ? "••••" : fmtINRFull(m.total)} due`}
                  aria-pressed={isSelected}
                  style={{
                    flex: "0 0 auto",
                    width: 56,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    cursor: "pointer",
                  }}
                  onClick={() => setViewDate({ year: m.year, month: m.month })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setViewDate({ year: m.year, month: m.month });
                    }
                  }}
                >
                  <div
                    title={privacyMode ? "••••" : fmtINRFull(m.total)}
                    style={{
                      fontSize: 10,
                      color: THEME.muted,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: 56,
                    }}
                  >
                    <Prv>{fmtINR(m.total)}</Prv>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: barH,
                      borderRadius: "4px 4px 0 0",
                      background: isSelected
                        ? THEME.accent
                        : `color-mix(in srgb, ${THEME.accent} 44%, transparent)`,
                      transition: "all 0.2s",
                    }}
                  />
                  <div
                    style={{
                      fontSize: 11,
                      color: isSelected ? THEME.accent : THEME.muted,
                      fontWeight: isSelected ? 700 : 500,
                      textAlign: "center",
                    }}
                  >
                    {SHORT_MONTHS[m.month]}
                    <br />
                    <span style={{ fontSize: 10, opacity: 0.7 }}>
                      {m.year !== todayDate.getFullYear() ? m.year : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: THEME.muted, marginTop: 8 }}>
            Click a month bar to see day-level detail below
          </div>
        </div>
      </Card>

      {/* Calendar grid */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ padding: 20 }}>
          {/* Month navigation */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <button
              onClick={() => navigateMonth(-1)}
              disabled={!canGoPrev}
              aria-label="Previous month"
              title={canGoPrev ? "Previous month" : "Payment history isn't tracked before the current month"}
              style={{
                background: "transparent",
                border: `1.5px solid ${THEME.line}`,
                borderRadius: 8,
                padding: "6px 10px",
                cursor: canGoPrev ? "pointer" : "not-allowed",
                color: canGoPrev ? THEME.ink : THEME.muted,
                opacity: canGoPrev ? 1 : 0.4,
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <div>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 16,
                  color: THEME.ink,
                }}
              >
                {MONTH_NAMES[viewDate.month]} {viewDate.year}
              </span>
              <span
                style={{
                  fontSize: 13,
                  color: THEME.muted,
                  marginLeft: 10,
                  fontWeight: 500,
                }}
              >
                — <Prv>{fmtINRExact(selectedMonthTotal)}</Prv> total
              </span>
            </div>
            <button
              onClick={() => navigateMonth(1)}
              disabled={!canGoNext}
              aria-label="Next month"
              title={canGoNext ? "Next month" : "Beyond the 12-month forecast window"}
              style={{
                background: "transparent",
                border: `1.5px solid ${THEME.line}`,
                borderRadius: 8,
                padding: "6px 10px",
                cursor: canGoNext ? "pointer" : "not-allowed",
                color: canGoNext ? THEME.ink : THEME.muted,
                opacity: canGoNext ? 1 : 0.4,
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Day names */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: CAL_GRID_COLS,
              gap: CAL_GRID_GAP,
              marginBottom: 6,
            }}
          >
            {DAY_NAMES.map((d) => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  color: THEME.muted,
                  fontWeight: 600,
                  padding: "4px 0",
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: CAL_GRID_COLS,
              gap: CAL_GRID_GAP,
            }}
          >
            {Array.from({ length: calendarData.firstDay }).map((_, i) => (
              <div key={`e${i}`} style={{ minHeight: 60 }} />
            ))}
            {Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayPmts = calendarData.dayMap[day] || [];
              const isCurrentMonth =
                viewDate.year === todayDate.getFullYear() &&
                viewDate.month === todayDate.getMonth();
              const isToday = isCurrentMonth && day === todayDate.getDate();
              const isPast = isCurrentMonth && day < todayDate.getDate();
              const dayTotal = dayPmts.reduce((s: number, p: any) => s + p.amount, 0);
              const hasPmts = dayPmts.length > 0;
              const isSelected = selectedDay === day && hasPmts;
              // Genuinely overdue: a bill/credit card with no autopay and no logged
              // payment, on a date that's already passed (or is today). Everything
              // else that's merely "past" (an EMI/SIP auto-debit, a paid bill, an
              // autopay card) keeps the old calm dimmed treatment instead of a
              // false-urgency red alert.
              const attentionPmts = dayPmts.filter(needsManualAttention);
              const isOverdue = isCurrentMonth && (isPast || isToday) && attentionPmts.length > 0;
              const dayLabel = hasPmts
                ? `${MONTH_NAMES[viewDate.month]} ${day}: ${dayPmts.length} payment${dayPmts.length > 1 ? "s" : ""} totalling ${privacyMode ? "••••" : fmtINRFull(dayTotal)}${
                    isOverdue
                      ? `, ${attentionPmts.length} unpaid and ${isToday ? "due today" : "overdue"}`
                      : isPast
                        ? " (past due date)"
                        : ""
                  }`
                : `${MONTH_NAMES[viewDate.month]} ${day}, no payments due`;

              return (
                <div
                  key={day}
                  className="paycal-day-cell"
                  role={hasPmts ? "button" : undefined}
                  tabIndex={hasPmts ? 0 : undefined}
                  aria-label={dayLabel}
                  aria-pressed={hasPmts ? isSelected : undefined}
                  onClick={hasPmts ? () => setSelectedDay(isSelected ? null : day) : undefined}
                  onKeyDown={
                    hasPmts
                      ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedDay(isSelected ? null : day);
                          }
                        }
                      : undefined
                  }
                  style={{
                    minHeight: 60,
                    borderRadius: 8,
                    border: `1.5px solid ${
                      isOverdue
                        ? THEME.rust
                        : isSelected
                          ? THEME.accent
                          : isToday
                            ? THEME.accent
                            : hasPmts
                              ? THEME.line
                              : "transparent"
                    }`,
                    background: isOverdue
                      ? `color-mix(in srgb, ${THEME.rust} 12%, transparent)`
                      : isSelected
                        ? `color-mix(in srgb, ${THEME.accent} 14%, transparent)`
                        : isToday
                          ? `color-mix(in srgb, ${THEME.accent} 8%, transparent)`
                          : hasPmts
                            ? "color-mix(in srgb, var(--t-accent) 3%, transparent)"
                            : "transparent",
                    padding: "5px 4px",
                    cursor: hasPmts ? "pointer" : "default",
                    // Overdue items stay fully opaque even on past dates — they need
                    // to stand out, not fade into the background like a settled item.
                    opacity: isPast && !isSelected && !isOverdue ? 0.55 : 1,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      fontWeight: isToday ? 800 : hasPmts ? 700 : 500,
                      fontSize: 12,
                      color: isOverdue ? THEME.rust : isToday ? THEME.accent : hasPmts ? THEME.ink : THEME.muted,
                      marginBottom: 3,
                      lineHeight: 1,
                    }}
                  >
                    {day}
                    {isOverdue && <AlertTriangle size={9} style={{ flexShrink: 0 }} />}
                  </div>
                  {dayPmts.slice(0, 2).map((p, pi) => {
                    const cfg = TYPE_CONFIG[p.type] || TYPE_CONFIG.other;
                    const isClamped = p.dueDay > calendarData.daysInMonth;
                    // Paid pills switch to the success color regardless of category —
                    // "handled" is the more useful signal than "which type" once a
                    // bill is actually settled for its cycle.
                    const pillColor = p.paidThisCycle ? THEME.sage : cfg.color;
                    const statusSuffix = p.paidThisCycle
                      ? " (Paid this cycle)"
                      : p.autoPay
                        ? " (Autopay — no action needed)"
                        : "";
                    return (
                      <div
                        key={pi}
                        className="paycal-pill"
                        style={{
                          fontSize: 9,
                          color: pillColor,
                          background: `color-mix(in srgb, ${pillColor} 14%, transparent)`,
                          borderRadius: 3,
                          padding: "1px 3px",
                          marginBottom: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontWeight: 600,
                        }}
                        title={`${p.name} — ${privacyMode ? "••••" : fmtINRFull(p.amount)}${statusSuffix}${
                          isClamped
                            ? ` (normally due ${p.dueDay}${ORDINAL(p.dueDay)}; moved to the last day of this shorter month)`
                            : ""
                        }`}
                      >
                        {p.name}
                        {p.paidThisCycle ? " ✓" : ""}
                        {isClamped ? "*" : ""}
                      </div>
                    );
                  })}
                  {dayPmts.length > 2 && (
                    <div
                      style={{
                        fontSize: 9,
                        color: THEME.muted,
                        fontWeight: 600,
                      }}
                    >
                      +{dayPmts.length - 2} more
                    </div>
                  )}
                  {dayTotal > 0 && (
                    <div
                      style={{
                        fontSize: 8,
                        color: THEME.muted,
                        marginTop: 1,
                      }}
                    >
                      <Prv>{fmtINR(dayTotal)}</Prv>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected-day detail — gives keyboard/touch users (no hover tooltip)
              a way to see full names & amounts, and surfaces the +N overflow items */}
          {selectedDay !== null && calendarData.dayMap[selectedDay]?.length > 0 && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 14px",
                borderRadius: 8,
                background: `color-mix(in srgb, ${THEME.accent} 8%, transparent)`,
                border: `1px solid ${THEME.accent}`,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: THEME.ink,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                {MONTH_NAMES[viewDate.month]} {selectedDay}
                {ORDINAL(selectedDay)} — {calendarData.dayMap[selectedDay].length} payment
                {calendarData.dayMap[selectedDay].length > 1 ? "s" : ""}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {calendarData.dayMap[selectedDay].map((p: any, i: number) => {
                  const cfg = TYPE_CONFIG[p.type] || TYPE_CONFIG.other;
                  const canMarkPaid =
                    p.type === "bill" &&
                    !p.autoPay &&
                    !p.paidThisCycle &&
                    monthsFromToday === 0 &&
                    !!addItem;
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontSize: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <cfg.icon size={13} style={{ color: cfg.color, flexShrink: 0 }} />
                      <span style={{ color: THEME.ink, fontWeight: 600 }}>{p.name}</span>
                      {p.owner && p.owner !== "self" && (
                        <span style={{ color: THEME.muted, fontSize: 11 }}>({p.owner})</span>
                      )}
                      {p.paidThisCycle && (
                        <Badge variant="sage" size="xs">
                          Paid
                        </Badge>
                      )}
                      {p.autoPay && !p.paidThisCycle && (
                        <Badge variant="accent" size="xs">
                          Autopay
                        </Badge>
                      )}
                      <span style={{ marginLeft: "auto", color: cfg.color, fontWeight: 700 }}>
                        <Prv>{fmtINRExact(p.amount)}</Prv>
                      </span>
                      {canMarkPaid && (
                        <Button
                          size="sm"
                          variant="ghost"
                          loading={markingPaidId === p.billId}
                          onClick={() => markBillPaid(p)}
                          style={{ fontSize: 11, padding: "3px 10px" }}
                        >
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Yearly/quarterly items shown below grid */}
          {(calendarData.annualThisMonth.length > 0 ||
            calendarData.quarterlyThisMonth.length > 0) && (
            <div
              style={{
                marginTop: 14,
                padding: "10px 14px",
                borderRadius: 8,
                background: "color-mix(in srgb, var(--t-accent) 5%, transparent)",
                border: `1px solid ${THEME.line}`,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: THEME.muted,
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                Also due this month (annual / quarterly):
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                {[...calendarData.annualThisMonth, ...calendarData.quarterlyThisMonth].map(
                  (p, i) => {
                    const cfg = TYPE_CONFIG[p.type] || TYPE_CONFIG.other;
                    return (
                      <div
                        key={i}
                        style={{
                          fontSize: 11,
                          color: cfg.color,
                          background: `color-mix(in srgb, ${cfg.color} 14%, transparent)`,
                          borderRadius: 6,
                          padding: "3px 8px",
                          fontWeight: 600,
                        }}
                      >
                        {p.name} — <Prv>{fmtINRFull(p.amount)}</Prv>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Detailed breakdown list */}
      <Card>
        <div style={{ padding: 20 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 15,
              marginBottom: 14,
              color: THEME.ink,
            }}
          >
            {MONTH_NAMES[viewDate.month]} {viewDate.year} — All Payments
          </div>

          {Object.entries(TYPE_CONFIG)
            .filter(([type]) => selectedMonthPayments.some((p) => p.type === type))
            .map(([type, cfg]) => {
              const typePayments = selectedMonthPayments.filter((p) => p.type === type);
              const typeTotal = typePayments.reduce((s: number, p: any) => s + p.amount, 0);
              return (
                <div key={type} style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <cfg.icon size={14} style={{ color: cfg.color }} />
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 13,
                        color: cfg.color,
                      }}
                    >
                      {cfg.label}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: THEME.muted,
                        marginLeft: "auto",
                        fontWeight: 600,
                      }}
                    >
                      <Prv>{fmtINRExact(typeTotal)}</Prv>
                    </span>
                  </div>
                  {typePayments.map((p, i) => {
                    const canMarkPaid =
                      p.type === "bill" &&
                      !p.autoPay &&
                      !p.paidThisCycle &&
                      monthsFromToday === 0 &&
                      !!addItem;
                    const daysInThisMonth = new Date(
                      viewDate.year,
                      viewDate.month + 1,
                      0
                    ).getDate();
                    const isOverdueRow =
                      monthsFromToday === 0 &&
                      needsManualAttention(p) &&
                      Math.min(p.dueDay, daysInThisMonth) <= todayDate.getDate();
                    return (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 8,
                          padding: "8px 12px",
                          borderRadius: 8,
                          background: isOverdueRow
                            ? `color-mix(in srgb, ${THEME.rust} 12%, transparent)`
                            : `color-mix(in srgb, ${cfg.color} 8%, transparent)`,
                          border: isOverdueRow
                            ? `1px solid color-mix(in srgb, ${THEME.rust} 35%, transparent)`
                            : "1px solid transparent",
                          marginBottom: 4,
                          fontSize: 13,
                        }}
                      >
                        <div>
                          <span
                            style={{
                              fontWeight: 600,
                              color: THEME.ink,
                            }}
                          >
                            {p.name}
                          </span>
                          {p.owner && p.owner !== "self" && (
                            <span
                              style={{
                                fontSize: 11,
                                color: THEME.muted,
                                marginLeft: 6,
                              }}
                            >
                              ({p.owner})
                            </span>
                          )}
                          {p.frequency === "monthly" && p.dueDay && (
                            <span
                              style={{
                                fontSize: 11,
                                color: THEME.muted,
                                marginLeft: 6,
                              }}
                            >
                              • {p.dueDay}
                              {ORDINAL(p.dueDay)} of month
                            </span>
                          )}
                          {p.frequency === "yearly" && (
                            <span
                              style={{
                                fontSize: 11,
                                color: THEME.muted,
                                marginLeft: 6,
                              }}
                            >
                              • annual
                            </span>
                          )}
                          {p.frequency === "quarterly" && (
                            <span
                              style={{
                                fontSize: 11,
                                color: THEME.muted,
                                marginLeft: 6,
                              }}
                            >
                              • quarterly
                            </span>
                          )}
                          {p.type === "emi" && p.monthsLeft && (
                            <span
                              style={{
                                fontSize: 11,
                                color: THEME.muted,
                                marginLeft: 6,
                              }}
                            >
                              • {p.monthsLeft} months left
                            </span>
                          )}
                          {isOverdueRow && (
                            <Badge variant="rust" size="xs" style={{ marginLeft: 6 }}>
                              {todayDate.getDate() === Math.min(p.dueDay, daysInThisMonth)
                                ? "Due Today"
                                : "Overdue"}
                            </Badge>
                          )}
                          {p.paidThisCycle && (
                            <Badge variant="sage" size="xs" style={{ marginLeft: 6 }}>
                              Paid
                            </Badge>
                          )}
                          {p.autoPay && !p.paidThisCycle && (
                            <Badge variant="accent" size="xs" style={{ marginLeft: 6 }}>
                              Autopay
                            </Badge>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              color: cfg.color,
                              whiteSpace: "nowrap",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            <Prv>{fmtINRExact(p.amount)}</Prv>
                          </div>
                          {canMarkPaid && (
                            <Button
                              size="sm"
                              variant="ghost"
                              loading={markingPaidId === p.billId}
                              onClick={() => markBillPaid(p)}
                              style={{ fontSize: 11, padding: "3px 10px" }}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

          <div
            style={{
              borderTop: `1.5px solid ${THEME.line}`,
              paddingTop: 12,
              display: "flex",
              justifyContent: "space-between",
              fontWeight: 700,
              fontSize: 14,
              color: THEME.ink,
            }}
          >
            <span>Total for {MONTH_NAMES[viewDate.month]}</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              <Prv>{fmtINRExact(selectedMonthTotal)}</Prv>
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
