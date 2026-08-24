// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  Coins,
  Landmark,
  Repeat,
  Shield,
  FileText,
  Heart,
  CreditCard,
  Bell,
  Building2,
  Star,
  Wallet,
  Car,
  Wrench,
  Users,
  Download,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  Milestone,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import {
  fmtINRFull,
  fmtINRExact,
  today,
  fdMaturity,
  rdMaturity,
  nextAnnualOccurrence,
  addMonthsToDateStr,
  annualizePremium,
} from "../../utils/finance";
import { SCHEME_RULES, projectSchemeValue } from "../../utils/govtSchemes";
import { useMilestoneEvents } from "../../hooks/useFinancialEvents";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";
import { Money } from "../ui/Money";

// Maps each event type to the tab a user would go to in order to actually
// act on it (edit the policy, pay the bill, etc). Used by the optional
// `onNavigateToTab` prop for click-through — see prop docs below.
const EVENT_TYPE_TO_TAB: Record<string, string> = {
  fd_maturity: "investments",
  rd_maturity: "investments",
  bond_maturity: "investments",
  ppf_maturity: "investments",
  dividend: "dividendcal",
  insurance_premium: "insurance",
  loan_closure: "credit",
  loan_given_repayment: "credit",
  cc_fee: "credit",
  prepaid_card_expiry: "credit",
  subscription: "subs",
  govt_scheme_maturity: "govtschemes",
  govt_scheme_premium: "govtschemes",
  realestate_demand: "realestate",
  vehicle_insurance: "vehicles",
  vehicle_puc: "vehicles",
  vehicle_service: "vehicles",
  health_insurance: "healthinsurance",
  life_event: "lifeevents",
  rent_receivable: "rental",
};

// Types that represent money coming IN (maturities, projected income) vs
// going OUT (premiums, fees, renewals). Shared by the stat totals and the
// monthly breakdown so the two can never drift apart.
const INFLOW_TYPES = [
  "fd_maturity",
  "rd_maturity",
  "bond_maturity",
  "dividend",
  "ppf_maturity",
  "govt_scheme_maturity",
  "loan_given_repayment",
  "rent_receivable",
];
const OUTFLOW_TYPES = [
  "insurance_premium",
  "health_insurance",
  "cc_fee",
  "subscription",
  "govt_scheme_premium",
];

// Persisted "mark as done" state for events (e.g. "I already paid this
// premium"). Keyed by a stable per-event id (source record id + type, not
// array index) so it survives horizon/filter changes and reloads. This is a
// display-only client-side dismiss, not a DB write — the underlying record
// (FD, policy, etc.) is untouched, so there's nothing to sync elsewhere.
const DISMISS_STORAGE_KEY = "finCalDismissedEvents_v1";
const loadDismissed = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
};
const saveDismissed = (ids: Set<string>) => {
  try {
    localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    /* localStorage unavailable (private browsing etc) — dismiss just won't persist */
  }
};

const MONTH_NAMES = [
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

const getDaysUntil = (dateStr) => {
  if (!dateStr) return Infinity;
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date(today() + "T00:00:00");
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
};

const getUrgencyColor = (days) => {
  if (days < 0) return THEME.rust;
  if (days <= 7) return THEME.gold;
  if (days <= 30) return THEME.gold;
  if (days <= 90) return THEME.accent;
  return THEME.sage;
};

const getUrgencyLabel = (days) => {
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days <= 7) return `${days}d`;
  if (days <= 30) return `${days}d`;
  if (days <= 90) return `${Math.ceil(days / 7)}w`;
  return `${Math.round(days / 30)}mo`;
};

// `onNavigateToTab` is optional and not yet wired up by the parent — see
// cross-file findings in the audit report for the one-line App.tsx change
// that would enable click-through from an event card to its source tab.
export const FinancialCalendarTab = ({
  state,
  metrics,
  onNavigateToTab = undefined,
  // Set by CalendarTab.tsx when rendering this as the "Milestones" view of
  // the merged Calendar tab — suppresses this component's own SectionTitle
  // since the wrapper already renders one shared header + view toggle.
  embedded = false,
}) => {
  const [horizon, setHorizon] = useState(6);
  const [activeFilter, setActiveFilter] = useState("all");
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());
  const [showDismissed, setShowDismissed] = useState(false);

  const toggleDismissed = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveDismissed(next);
      return next;
    });
  };

  const cutoffDate = useMemo(() => {
    // Plain setMonth() overflows for day 29-31 starting dates when the target
    // month is shorter (e.g. 31 Jan + 1 month rolls into 2/3 Mar, not 28 Feb),
    // silently widening/narrowing the horizon window. Clamp to the target
    // month's last day instead.
    const d = new Date(today());
    const day = d.getDate();
    const total = d.getMonth() + horizon;
    const y = d.getFullYear() + Math.floor(total / 12);
    const m = ((total % 12) + 12) % 12;
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(day, daysInMonth)).toISOString().slice(0, 10);
  }, [horizon]);

  const events = useMilestoneEvents(state, cutoffDate);

  const filteredEvents = useMemo(() => {
    const base = activeFilter === "all" ? events : events.filter((e) => e.type.startsWith(activeFilter));
    if (showDismissed) return base;
    return base.filter((e) => !dismissed.has(e.id));
  }, [events, activeFilter, dismissed, showDismissed]);

  const dismissedCount = useMemo(
    () => events.filter((e) => dismissed.has(e.id)).length,
    [events, dismissed]
  );

  const stats = useMemo(() => {
    // Stats reflect "live" (non-dismissed) events only — a marked-done
    // premium shouldn't keep inflating "Expected Outflows".
    const liveEvents = events.filter((e) => !dismissed.has(e.id));
    const upcoming7 = liveEvents.filter((e) => e.days >= 0 && e.days <= 7).length;
    const upcoming30 = liveEvents.filter((e) => e.days >= 0 && e.days <= 30).length;
    const overdue = liveEvents.filter((e) => e.days < 0).length;
    const totalInflows = liveEvents
      .filter((e) => INFLOW_TYPES.includes(e.type) && e.days >= 0)
      .reduce((s, e) => s + (e.maturityAmount || e.amount || 0), 0);
    const totalOutflows = liveEvents
      .filter((e) => OUTFLOW_TYPES.includes(e.type) && e.days >= 0)
      .reduce((s, e) => s + (e.amount || 0), 0);

    // Monthly breakdown
    const monthlyMap = {};
    liveEvents
      .filter((e) => e.days >= 0)
      .forEach((e) => {
        const m = e.date?.slice(0, 7);
        if (!m) return;
        if (!monthlyMap[m]) monthlyMap[m] = { inflow: 0, outflow: 0, events: 0 };
        monthlyMap[m].events++;
        if (INFLOW_TYPES.includes(e.type)) {
          monthlyMap[m].inflow += e.maturityAmount || e.amount || 0;
        } else if (OUTFLOW_TYPES.includes(e.type)) {
          monthlyMap[m].outflow += e.amount || 0;
        }
        // Everything else (prepaid card expiry, vehicle compliance
        // reminders) is a deadline, not a cash movement, so it only counts
        // toward the "N events" tally, not inflow/outflow.
      });

    return { upcoming7, upcoming30, overdue, totalInflows, totalOutflows, monthlyMap };
  }, [events, dismissed]);

  const filterOptions = [
    { key: "all", label: "All Events" },
    { key: "fd", label: "FD/RD" },
    { key: "bond", label: "Bonds" },
    { key: "dividend", label: "Dividends" },
    { key: "insurance", label: "Insurance" },
    { key: "health_insurance", label: "Health Insurance" },
    { key: "loan", label: "Loans" },
    { key: "cc", label: "Credit Cards" },
    { key: "subscription", label: "Subscriptions" },
    { key: "realestate", label: "Real Estate" },
    { key: "govt_scheme", label: "Govt Schemes" },
    { key: "prepaid_card", label: "Prepaid Cards" },
    { key: "vehicle", label: "Vehicles" },
    { key: "life_event", label: "Life Events" },
    { key: "rent_receivable", label: "Rent Receivable" },
  ];

  // ICS (iCalendar) export — one VEVENT per currently-filtered, non-dismissed
  // event, so the user can drop their financial due dates into their phone's
  // native calendar app. All-day events (DTSTART;VALUE=DATE) since these are
  // date-level deadlines, not specific times.
  const exportToICS = () => {
    const pad = (n: number) => String(n).padStart(2, "0");
    const stamp = (d: Date) =>
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    const escapeText = (s: string) => String(s || "").replace(/([,;])/g, "\\$1");
    const lines = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Personal Finance//Financial Calendar//EN",
      "CALSCALE:GREGORIAN",
    ];
    filteredEvents.forEach((e) => {
      const dt = e.date.replace(/-/g, "");
      // `e.detail` is JSX (built to let the money portion get individually
      // <Prv>-masked on screen), not plain text, so it can't be stringified
      // directly here — rebuild a plain description from the event's own
      // amount fields instead. Exports always carry real values regardless
      // of on-screen privacy mode, same as every CSV export elsewhere in
      // this app (a deliberate user-initiated data export of their own
      // data, not a masked UI surface).
      const amt = e.maturityAmount || e.amount;
      const description = amt
        ? `${e.category} • ${fmtINRExact(amt)} • Due ${formatDate(e.date)}`
        : `${e.category} • Due ${formatDate(e.date)}`;
      lines.push(
        "BEGIN:VEVENT",
        `UID:${e.id}@financial-calendar`,
        `DTSTAMP:${stamp(new Date())}`,
        `DTSTART;VALUE=DATE:${dt}`,
        `SUMMARY:${escapeText(e.name)}`,
        `DESCRIPTION:${escapeText(description)}`,
        "END:VEVENT"
      );
    });
    lines.push("END:VCALENDAR");
    const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `financial-calendar-${today()}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Same dismissed/showDismissed logic as filteredEvents, but ignoring the
  // category filter — used for filter-chip counts so they reflect what's
  // actually visible (a dismissed event hidden from the list shouldn't
  // still be counted in its chip).
  const visibleEvents = showDismissed ? events : events.filter((e) => !dismissed.has(e.id));
  const todayYM = today().slice(0, 7);

  if (events.length === 0) {
    return (
      <div>
        {!embedded && (
          <SectionTitle sub="Track upcoming maturities, dividends, premiums & renewals">
            Financial Calendar
          </SectionTitle>
        )}
        <EmptyState
          icon={Calendar}
          gradient={`linear-gradient(135deg, ${THEME.cyan} 0%, color-mix(in srgb, ${THEME.cyan} 55%, white) 100%)`}
          dotColor={THEME.cyan}
          title="No Upcoming Events"
          description="This calendar auto-populates from your Fixed Deposits, RDs, insurance policies, loans, vehicles, credit cards, PPF, govt schemes and subscriptions — add those elsewhere in the app and their due dates and maturities will show up here."
          pills={["FD / RD Maturities", "Premium Due Dates", "Loan Closures", "Vehicle Renewals", "Renewal Alerts"]}
        />
      </div>
    );
  }

  // Group events by month
  const groupedByMonth = {};
  filteredEvents.forEach((e) => {
    const m = e.date?.slice(0, 7) || "unknown";
    if (!groupedByMonth[m]) groupedByMonth[m] = [];
    groupedByMonth[m].push(e);
  });

  return (
    <div>
      {!embedded && (
        <SectionTitle sub="Track upcoming maturities, dividends, premiums & renewals">
          Financial Calendar
        </SectionTitle>
      )}

      {/* Horizon Toggle */}
      <div
        className="chip-row"
        style={{
          marginBottom: 20,
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div className="chip-row" style={{ alignItems: "center", margin: 0 }}>
          <span style={{ fontSize: 13, color: THEME.muted, fontWeight: 600, marginRight: 2 }}>
            Forecast:
          </span>
          {[3, 6, 12].map((m) => (
            <button
              key={m}
              onClick={() => setHorizon(m)}
              aria-pressed={horizon === m}
              className={`chip ${horizon === m ? "active" : ""}`}
            >
              {m} Months
            </button>
          ))}
        </div>
        <div className="chip-row" style={{ alignItems: "center", margin: 0 }}>
          {dismissedCount > 0 && (
            <button
              onClick={() => setShowDismissed((v) => !v)}
              className={`chip ${showDismissed ? "active" : ""}`}
              title={showDismissed ? "Hide completed events" : "Show events you've marked done"}
            >
              <RotateCcw size={13} style={{ marginRight: 5, verticalAlign: -2 }} />
              {showDismissed ? "Hide" : "Show"} Done ({dismissedCount})
            </button>
          )}
          <Button variant="secondary" onClick={exportToICS} title="Download as .ics for your calendar app">
            <Download size={14} style={{ marginRight: 6, verticalAlign: -2 }} />
            Export .ics
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          marginBottom: 24,
        }}
      >
        <StatCard
          label="This Week"
          value={String(stats.upcoming7)}
          numericValue={stats.upcoming7}
          formatValue={(n) => String(Math.round(n))}
          icon={<Clock />}
          color={THEME.gold}
        />
        <StatCard
          label="Next 30 Days"
          value={String(stats.upcoming30)}
          numericValue={stats.upcoming30}
          formatValue={(n) => String(Math.round(n))}
          icon={<Calendar />}
          color={THEME.accent}
        />
        <StatCard
          label="Overdue"
          value={String(stats.overdue)}
          numericValue={stats.overdue}
          formatValue={(n) => String(Math.round(n))}
          sub={stats.overdue > 0 ? "Needs action" : "All caught up"}
          subColor={stats.overdue > 0 ? THEME.rust : undefined}
          icon={<AlertTriangle />}
          color={THEME.rust}
        />
        <StatCard
          label="Expected Inflows"
          value={fmtINRFull(stats.totalInflows)}
          numericValue={stats.totalInflows}
          formatValue={fmtINRFull}
          icon={<TrendingUp />}
          color={THEME.sage}
        />
        <StatCard
          label="Expected Outflows"
          value={fmtINRFull(stats.totalOutflows)}
          numericValue={stats.totalOutflows}
          formatValue={fmtINRFull}
          icon={<Coins />}
          color={THEME.rust}
        />
      </div>

      {/* Monthly Summary Bar */}
      {Object.keys(stats.monthlyMap).length > 0 && (
        <Card>
          <div style={{ padding: 20 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: THEME.ink }}>
              Monthly Breakdown
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                gap: 12,
              }}
            >
              {Object.entries(stats.monthlyMap)
                .sort(([a], [b]) => a.localeCompare(b))
                .slice(0, horizon)
                .map(([month, data]) => {
                  const [y, m] = month.split("-");
                  return (
                    <div
                      key={month}
                      style={{
                        textAlign: "center",
                        padding: 12,
                        borderRadius: 10,
                        background: "color-mix(in srgb, var(--t-accent) 6%, transparent)",
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14, color: THEME.ink }}>
                        {MONTH_NAMES[parseInt(m) - 1]} {y}
                      </div>
                      <div style={{ fontSize: 11, color: THEME.muted, marginTop: 4 }}>
                        {data.events} events
                      </div>
                      {data.inflow > 0 && (
                        <div
                          style={{ fontSize: 12, color: THEME.sage, fontWeight: 600, marginTop: 6 }}
                        >
                          +<Money value={data.inflow} variant="exact" />
                        </div>
                      )}
                      {data.outflow > 0 && (
                        <div
                          style={{ fontSize: 12, color: THEME.rust, fontWeight: 600, marginTop: 2 }}
                        >
                          -<Money value={data.outflow} variant="exact" />
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </Card>
      )}

      {/* Filter Row — counts reflect the currently visible set (respecting
          the dismissed/"show done" toggle) so a chip's number always matches
          how many cards actually appear when you click it. */}
      <div className="chip-row" style={{ marginTop: 20, marginBottom: 12 }}>
        {filterOptions.map((f) => {
          const count =
            f.key === "all" ? visibleEvents.length : visibleEvents.filter((e) => e.type.startsWith(f.key)).length;
          if (count === 0 && f.key !== "all") return null;
          return (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              aria-pressed={activeFilter === f.key}
              className={`chip ${activeFilter === f.key ? "active" : ""}`}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Urgency legend — the color system used for every card's left accent
          and the badge on the right, so a glance at the timeline tells you
          what's pressing without reading each date. */}
      <div
        className="chip-row"
        style={{ marginBottom: 20, gap: 16, fontSize: 12, color: THEME.muted, fontWeight: 600 }}
      >
        {[
          { label: "Overdue", color: THEME.rust },
          { label: "Due ≤ 30d", color: THEME.gold },
          { label: "Due ≤ 90d", color: THEME.accent },
          { label: "Later", color: THEME.sage },
        ].map((l) => (
          <span key={l.label} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: l.color,
                display: "inline-block",
              }}
            />
            {l.label}
          </span>
        ))}
      </div>

      {/* Timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {Object.entries(groupedByMonth)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, monthEvents]) => {
            const [y, m] = month.split("-");
            const label = `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
            const isCurrentMonth = month === todayYM;
            return (
              <Card
                key={month}
                style={
                  isCurrentMonth
                    ? { borderColor: "color-mix(in srgb, var(--t-accent) 35%, var(--t-line))" }
                    : undefined
                }
              >
                <div style={{ padding: 20 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      marginBottom: 14,
                      color: THEME.ink,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Calendar size={16} style={{ color: THEME.accent }} />
                    {label}
                    {isCurrentMonth && (
                      <Badge variant="accent" style={{ marginLeft: 2 }}>
                        This month
                      </Badge>
                    )}
                    <Badge variant="muted" style={{ marginLeft: isCurrentMonth ? 0 : 8 }}>
                      {monthEvents.length} event{monthEvents.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {monthEvents.map((event) => {
                      const Icon = event.icon;
                      const urgencyColor = getUrgencyColor(event.days);
                      const isDismissed = dismissed.has(event.id);
                      const hasAmount = !!(event.maturityAmount || event.amount);
                      const targetTab = EVENT_TYPE_TO_TAB[event.type];
                      const clickable = !!onNavigateToTab && !!targetTab;
                      return (
                        <div
                          key={event.id}
                          className="fincal-event-row"
                          onClick={clickable ? () => onNavigateToTab(targetTab) : undefined}
                          role={clickable ? "button" : undefined}
                          tabIndex={clickable ? 0 : undefined}
                          onKeyDown={
                            clickable
                              ? (e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    onNavigateToTab(targetTab);
                                  }
                                }
                              : undefined
                          }
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            padding: "12px 16px",
                            borderRadius: 10,
                            opacity: isDismissed ? 0.5 : 1,
                            cursor: clickable ? "pointer" : "default",
                            background:
                              event.days < 0
                                ? "color-mix(in srgb, var(--t-rust) 6%, transparent)"
                                : event.days <= 7
                                  ? "color-mix(in srgb, var(--t-gold) 6%, transparent)"
                                  : "color-mix(in srgb, var(--t-accent) 4%, transparent)",
                            border: `1px solid ${event.days < 0 ? "color-mix(in srgb, var(--t-rust) 15%, transparent)" : THEME.line}`,
                          }}
                        >
                          <div
                            className="fincal-event-icon"
                            style={{ display: "flex", alignItems: "center", flexShrink: 0 }}
                          >
                            <Icon size={20} style={{ color: event.color }} />
                          </div>
                          <div className="fincal-event-main" style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: 14,
                                color: THEME.ink,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                textDecoration: isDismissed ? "line-through" : "none",
                              }}
                            >
                              {event.name}
                              {event.projected && (
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: THEME.muted,
                                    marginLeft: 6,
                                    fontWeight: 500,
                                  }}
                                >
                                  projected
                                </span>
                              )}
                              {clickable && (
                                <ExternalLink
                                  size={11}
                                  style={{ marginLeft: 6, verticalAlign: -1, color: THEME.muted }}
                                />
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                              {event.detail}
                            </div>
                          </div>
                          <div className="fincal-event-amount" style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: THEME.ink }}>
                              {hasAmount ? (
                                <Money value={event.maturityAmount || event.amount} variant="exact" />
                              ) : (
                                <span style={{ color: THEME.muted, fontWeight: 500 }}>Reminder</span>
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                              {formatDate(event.date)}
                            </div>
                          </div>
                          <div
                            style={{
                              padding: "4px 10px",
                              borderRadius: 6,
                              background: `color-mix(in srgb, ${urgencyColor} 18%, transparent)`,
                              color: urgencyColor,
                              fontSize: 11,
                              fontWeight: 700,
                              flexShrink: 0,
                              minWidth: 40,
                              textAlign: "center",
                            }}
                          >
                            {getUrgencyLabel(event.days)}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDismissed(event.id);
                            }}
                            className="fincal-dismiss-btn"
                            aria-pressed={isDismissed}
                            title={isDismissed ? "Mark as not done" : "Mark as done"}
                            style={{
                              flexShrink: 0,
                              width: 30,
                              height: 30,
                              borderRadius: 8,
                              border: `1px solid ${isDismissed ? "color-mix(in srgb, var(--t-sage) 40%, transparent)" : THEME.line}`,
                              background: isDismissed
                                ? "color-mix(in srgb, var(--t-sage) 15%, transparent)"
                                : "transparent",
                              color: isDismissed ? THEME.sage : THEME.muted,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                            }}
                          >
                            <CheckCircle2 size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
      </div>

      <style>{`
        .fincal-dismiss-btn:hover { border-color: color-mix(in srgb, var(--t-accent) 40%, transparent) !important; }
        .fincal-event-row:focus-visible { outline: 2px solid var(--t-accent); outline-offset: 2px; }
        @media (max-width: 640px) {
          .fincal-event-row {
            flex-wrap: wrap;
          }
          .fincal-event-main {
            min-width: 140px;
            order: 1;
          }
          .fincal-event-icon {
            order: 0;
          }
          .fincal-event-amount {
            order: 2;
            text-align: left !important;
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
};
