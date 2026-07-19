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
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, fmtINRExact, today } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { EmptyState } from "../ui/EmptyState";
import { Prv } from "../../context/PrivacyContext";

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

const ORDINAL = (d: number) => {
  if (d >= 11 && d <= 13) return "th";
  const r = d % 10;
  if (r === 1) return "st";
  if (r === 2) return "nd";
  if (r === 3) return "rd";
  return "th";
};

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  emi: { label: "Loan EMI", color: "#EF4444", icon: CreditCard },
  sip: { label: "SIP", color: "#6366F1", icon: Activity },
  rd: { label: "RD Instalment", color: "#8B5CF6", icon: Repeat },
  subscription: { label: "Subscription", color: "#14B8A6", icon: Zap },
  insurance: { label: "Insurance", color: "#EC4899", icon: Heart },
  rent: { label: "Rent", color: "#F97316", icon: Building2 },
  health: { label: "Health Ins.", color: "#0EA5E9", icon: Shield },
  other: { label: "Other", color: THEME.muted, icon: Wallet },
};

export function PaymentCalendarTab({ state }: any) {
  const todayStr = today();
  const todayDate = new Date(todayStr + "T00:00:00");

  const [viewDate, setViewDate] = useState<{ year: number; month: number }>({
    year: todayDate.getFullYear(),
    month: todayDate.getMonth(),
  });

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

    // Insurance Premiums — LIC / Term / Investment Plans
    const addInsurance = (policies: any[], tag: string, typeKey: string) => {
      (policies || []).forEach((p: any) => {
        const premium = Number(p.annualPremium || p.premium || 0);
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
  }, [state, todayStr]);

  // ── Check if a payment falls in a given (year, 0-based month) ────────
  const isActiveInMonth = (p: any, year: number, month: number): boolean => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    // Check maturityDate / renewalDate expiry
    if (p.maturityDate && new Date(p.maturityDate + "T00:00:00") < monthStart) return false;

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

  const navigateMonth = (dir: number) => {
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
        <SectionTitle sub="All EMIs, SIPs, subscriptions & premiums by date">
          Payment Calendar
        </SectionTitle>
        <EmptyState
          icon={Calendar}
          title="No Recurring Payments"
          subtitle="Add loans, SIPs, subscriptions or insurance policies to see your payment calendar"
        />
      </div>
    );
  }

  const maxBar = Math.max(...monthlySummary.map((m) => m.total), 1);

  return (
    <div className="tab-content-enter">
      <SectionTitle sub="Every recurring outflow — EMIs, SIPs, RDs, subscriptions & insurance premiums plotted by date">
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
          label="Monthly Committed"
          value={fmtINRFull(monthlyAvg)}
          icon={<Calendar />}
          color={THEME.accent}
        />
        <StatCard
          label="Annual Committed"
          value={fmtINRFull(monthlyAvg * 12)}
          icon={<IndianRupee />}
          color={THEME.rust}
        />
        <StatCard
          label="Active Commitments"
          value={String(payments.length)}
          icon={<Repeat />}
          color={THEME.gold}
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
                  aria-label={`View ${MONTH_NAMES[m.month]} ${m.year}, ${fmtINRFull(m.total)} due`}
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
                    style={{
                      fontSize: 10,
                      color: THEME.muted,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Prv>{fmtINRFull(m.total)}</Prv>
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
              aria-label="Previous month"
              title="Previous month"
              style={{
                background: "transparent",
                border: `1.5px solid ${THEME.line}`,
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                color: THEME.ink,
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
              aria-label="Next month"
              title="Next month"
              style={{
                background: "transparent",
                border: `1.5px solid ${THEME.line}`,
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                color: THEME.ink,
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
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 3,
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
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 3,
            }}
          >
            {Array.from({ length: calendarData.firstDay }).map((_, i) => (
              <div key={`e${i}`} style={{ minHeight: 60 }} />
            ))}
            {Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayPmts = calendarData.dayMap[day] || [];
              const isToday =
                viewDate.year === todayDate.getFullYear() &&
                viewDate.month === todayDate.getMonth() &&
                day === todayDate.getDate();
              const dayTotal = dayPmts.reduce((s: number, p: any) => s + p.amount, 0);
              const hasPmts = dayPmts.length > 0;

              return (
                <div
                  key={day}
                  style={{
                    minHeight: 60,
                    borderRadius: 8,
                    border: `1.5px solid ${
                      isToday ? THEME.accent : hasPmts ? THEME.line : "transparent"
                    }`,
                    background: isToday
                      ? `color-mix(in srgb, ${THEME.accent} 8%, transparent)`
                      : hasPmts
                        ? "color-mix(in srgb, var(--t-accent) 3%, transparent)"
                        : "transparent",
                    padding: "5px 4px",
                  }}
                >
                  <div
                    style={{
                      fontWeight: isToday ? 800 : 500,
                      fontSize: 12,
                      color: isToday ? THEME.accent : THEME.muted,
                      marginBottom: 3,
                      lineHeight: 1,
                    }}
                  >
                    {day}
                  </div>
                  {dayPmts.slice(0, 2).map((p, pi) => {
                    const cfg = TYPE_CONFIG[p.type] || TYPE_CONFIG.other;
                    return (
                      <div
                        key={pi}
                        style={{
                          fontSize: 9,
                          color: cfg.color,
                          background: `color-mix(in srgb, ${cfg.color} 14%, transparent)`,
                          borderRadius: 3,
                          padding: "1px 3px",
                          marginBottom: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontWeight: 600,
                        }}
                        title={`${p.name} — ₹${Number(p.amount).toLocaleString("en-IN")}`}
                      >
                        {p.name.length > 8 ? p.name.slice(0, 7) + "…" : p.name}
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
                      +{dayPmts.length - 2}
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
                      <Prv>
                        ₹
                        {dayTotal >= 100000
                          ? `${(dayTotal / 100000).toFixed(1)}L`
                          : dayTotal >= 1000
                            ? `${(dayTotal / 1000).toFixed(0)}K`
                            : dayTotal}
                      </Prv>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

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
                        {p.name} — <Prv>₹{Number(p.amount).toLocaleString("en-IN")}</Prv>
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
                  {typePayments.map((p, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: `color-mix(in srgb, ${cfg.color} 8%, transparent)`,
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
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          color: cfg.color,
                          whiteSpace: "nowrap",
                        }}
                      >
                        <Prv>{fmtINRExact(p.amount)}</Prv>
                      </div>
                    </div>
                  ))}
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
            <Prv>{fmtINRExact(selectedMonthTotal)}</Prv>
          </div>
        </div>
      </Card>
    </div>
  );
}
