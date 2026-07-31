// @ts-nocheck
import React, { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Coins,
  Landmark,
  Repeat,
  Shield,
  FileText,
  Heart,
  CreditCard,
  Bell,
  Filter,
  Building2,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import {
  fmtINR,
  fmtINRFull,
  fmtINRExact,
  today,
  fdMaturity,
  rdMaturity,
} from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { SectionTitle } from "../ui/SectionTitle";
import { EmptyState } from "../ui/EmptyState";
import { StatCard } from "../ui/StatCard";
import { Prv } from "../../context/PrivacyContext";

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

export const FinancialCalendarTab = ({ state, metrics }) => {
  const [horizon, setHorizon] = useState(6);
  const [activeFilter, setActiveFilter] = useState("all");
  const [expandedSection, setExpandedSection] = useState({
    fd: true,
    rd: true,
    dividends: true,
    insurance: true,
    loans: true,
    subs: true,
    other: true,
  });

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

  const events = useMemo(() => {
    const items = [];
    const todayStr = today();

    // FD Maturities
    (state.fixedDeposits || []).forEach((fd) => {
      if (!fd.maturityDate) return;
      const days = getDaysUntil(fd.maturityDate);
      if (days <= horizon * 31 + 10) {
        const tenureYears =
          Number(fd.years || 0) ||
          (fd.startDate && fd.maturityDate
            ? Math.max(
                0,
                (new Date(fd.maturityDate).getTime() - new Date(fd.startDate).getTime()) /
                  (365.25 * 24 * 3600 * 1000)
              )
            : 0);
        const maturityAmt =
          fdMaturity && tenureYears > 0
            ? fdMaturity(Number(fd.principal || 0), Number(fd.rate || 0), tenureYears)
            : Number(fd.principal || 0) * (1 + Number(fd.rate || 0) / 100);
        items.push({
          type: "fd_maturity",
          category: "Fixed Deposit",
          icon: Landmark,
          name: `${fd.bank || "FD"} — ${fmtINRFull(fd.principal)}`,
          date: fd.maturityDate,
          days,
          amount: Number(fd.principal || 0),
          maturityAmount: maturityAmt,
          rate: fd.rate,
          color: THEME.accent,
          detail: `${fd.rate}% p.a. • Principal: ${fmtINRExact(fd.principal)}`,
        });
      }
    });

    // RD Maturities
    (state.recurringDeposits || []).forEach((rd) => {
      if (!rd.maturityDate && !rd.startDate) return;
      let matDate = rd.maturityDate;
      if (!matDate && rd.startDate && rd.tenureMonths) {
        // Clamp day-of-month so e.g. 31 Jan + 1mo lands on 28/29 Feb, not
        // overflows into March (plain setMonth() silently rolls over).
        const d = new Date(rd.startDate);
        const day = d.getDate();
        const total = d.getMonth() + Number(rd.tenureMonths);
        const y = d.getFullYear() + Math.floor(total / 12);
        const m = ((total % 12) + 12) % 12;
        const daysInMonth = new Date(y, m + 1, 0).getDate();
        matDate = new Date(y, m, Math.min(day, daysInMonth)).toISOString().slice(0, 10);
      }
      if (!matDate) return;
      const days = getDaysUntil(matDate);
      if (days <= horizon * 31 + 10) {
        const matAmt = rdMaturity
          ? rdMaturity(Number(rd.monthly || 0), Number(rd.rate || 0), Number(rd.tenureMonths || 0))
          : Number(rd.monthly || 0) * Number(rd.tenureMonths || 0);
        items.push({
          type: "rd_maturity",
          category: "Recurring Deposit",
          icon: Repeat,
          name: `${rd.bank || "RD"} — ${fmtINRFull(rd.monthly)}/mo`,
          date: matDate,
          days,
          amount: Number(rd.monthly || 0) * Number(rd.tenureMonths || 0),
          maturityAmount: matAmt,
          rate: rd.rate,
          color: THEME.violet,
          detail: `${rd.rate}% p.a. • ${rd.tenureMonths} months`,
        });
      }
    });

    // Bond Maturities
    (state.bonds || []).forEach((b) => {
      if (!b.maturityDate) return;
      const days = getDaysUntil(b.maturityDate);
      if (days <= horizon * 31 + 10) {
        items.push({
          type: "bond_maturity",
          category: "Bond",
          icon: FileText,
          name: b.name || "Bond",
          date: b.maturityDate,
          days,
          amount: Number(b.faceValue || b.totalPrincipalAmount || 0),
          color: THEME.cyan,
          detail: `Coupon: ${b.coupon || 0}% • Face Value: ${fmtINRExact(b.faceValue || b.totalPrincipalAmount)}`,
        });
      }
    });

    // Dividend History — project next dividends based on past patterns
    const dividendsBySymbol = {};
    (state.dividends || []).forEach((d) => {
      const key = d.symbol || d.name || "Unknown";
      if (!dividendsBySymbol[key]) dividendsBySymbol[key] = [];
      dividendsBySymbol[key].push(d);
    });

    Object.entries(dividendsBySymbol).forEach(([symbol, divs]) => {
      const sorted = divs.sort((a, b) => new Date(b.date) - new Date(a.date));
      if (sorted.length === 0) return;
      const lastDiv = sorted[0];
      const lastDate = new Date(lastDiv.date);

      // Project next dividend (assume annual frequency)
      const nextDate = new Date(lastDate);
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      while (nextDate < new Date(todayStr)) {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
      const nextDateStr = nextDate.toISOString().slice(0, 10);
      const days = getDaysUntil(nextDateStr);

      if (days <= horizon * 31 + 10 && days >= 0) {
        items.push({
          type: "dividend",
          category: "Dividend",
          icon: Coins,
          name: `${symbol} — Expected Dividend`,
          date: nextDateStr,
          days,
          amount: Number(lastDiv.amount || 0),
          color: THEME.sage,
          detail: `Based on last dividend of ${fmtINRExact(lastDiv.amount)} on ${formatDate(lastDiv.date)}`,
          projected: true,
        });
      }
    });

    // Insurance Premium Due
    const addInsurancePremium = (policies, label) => {
      (policies || []).forEach((p) => {
        const premium = Number(p.annualPremium || p.premium || 0);
        if (!premium) return;
        const startDate = p.commencementDate || p.startDate;
        if (!startDate) return;

        const start = new Date(startDate);
        const nowD = new Date(todayStr);
        const nextDue = new Date(start);
        nextDue.setFullYear(nowD.getFullYear());
        if (nextDue < nowD) nextDue.setFullYear(nextDue.getFullYear() + 1);
        const nextDueStr = nextDue.toISOString().slice(0, 10);
        const days = getDaysUntil(nextDueStr);

        if (days <= horizon * 31 + 10) {
          items.push({
            type: "insurance_premium",
            category: "Insurance",
            icon: Heart,
            name: `${p.planName || p.insurer || p.policyName || p.provider || label} — Premium Due`,
            date: nextDueStr,
            days,
            amount: premium,
            color: THEME.pink,
            detail: `Annual Premium: ${fmtINRExact(premium)}`,
          });
        }
      });
    };
    addInsurancePremium(state.lic, "LIC");
    addInsurancePremium(state.termPlans, "Term Plan");
    addInsurancePremium(state.investmentPlans, "Investment Plan");

    // Loan EMI end dates / closures
    (state.loansTaken || []).forEach((l) => {
      if (!l.monthsRemaining || !l.emi) return;
      // Clamp day-of-month (see RD maturity fallback above) so long remaining
      // tenures don't overflow into the wrong month.
      const closureBase = new Date(todayStr);
      const closureDay = closureBase.getDate();
      const closureTotal = closureBase.getMonth() + Number(l.monthsRemaining);
      const closureY = closureBase.getFullYear() + Math.floor(closureTotal / 12);
      const closureM = ((closureTotal % 12) + 12) % 12;
      const closureDaysInMonth = new Date(closureY, closureM + 1, 0).getDate();
      const closureDate = new Date(closureY, closureM, Math.min(closureDay, closureDaysInMonth));
      const closureDateStr = closureDate.toISOString().slice(0, 10);
      const days = getDaysUntil(closureDateStr);

      if (days <= horizon * 31 + 10 && days >= 0) {
        items.push({
          type: "loan_closure",
          category: "Loan",
          icon: CreditCard,
          name: `${l.lender || l.lenderBorrower || "Loan"} — Closure`,
          date: closureDateStr,
          days,
          amount: Number(l.outstanding || 0),
          color: THEME.rust,
          detail: `EMI: ${fmtINRExact(l.emi)} • Outstanding: ${fmtINRExact(l.outstanding)}`,
        });
      }
    });

    // Credit Card Annual Fee Due
    (state.creditCards || []).forEach((cc) => {
      const feeAmt = Number(cc.annualFee || 0);
      if (!feeAmt) return;
      const feeMonth = cc.feeMonth || 1;
      const feeDay = cc.feeDay || 1;
      // `now` must be constructed the same way as `feeDate` (both LOCAL midnight). Parsing
      // todayStr ("YYYY-MM-DD") alone makes it UTC midnight, which in a positive-UTC-offset
      // timezone (e.g. IST, +5:30) is actually today ~5:30am local — LATER than feeDate's local
      // 00:00. That mismatch made a fee due exactly "today" look already past, silently pushing
      // it a year forward and hiding it from the calendar.
      const now = new Date(todayStr + "T00:00:00");
      let feeDate = new Date(now.getFullYear(), feeMonth - 1, feeDay);
      if (feeDate < now) feeDate = new Date(now.getFullYear() + 1, feeMonth - 1, feeDay);
      // feeDate is LOCAL midnight (multi-arg constructor). Serializing it with .toISOString()
      // (UTC) would shift the date a day EARLIER for positive-UTC-offset timezones like IST,
      // since local midnight is still the previous evening in UTC. Format from local fields
      // instead, the same way the rest of this file's dates round-trip safely.
      const feeDateStr = `${feeDate.getFullYear()}-${String(feeDate.getMonth() + 1).padStart(2, "0")}-${String(feeDate.getDate()).padStart(2, "0")}`;
      const days = getDaysUntil(feeDateStr);

      if (days <= horizon * 31 + 10) {
        items.push({
          type: "cc_fee",
          category: "Credit Card",
          icon: CreditCard,
          name: `${cc.issuer || cc.name || "CC"} — Annual Fee`,
          date: feeDateStr,
          days,
          amount: feeAmt,
          color: THEME.accent,
          detail: `Annual Fee: ${fmtINRExact(feeAmt)}`,
        });
      }
    });

    // Subscription Renewals (yearly only — monthly ones are always upcoming)
    (state.subscriptions || []).forEach((s) => {
      if (s.paused || !s.renewalDate) return;
      if (s.cycle !== "yearly" && s.cycle !== "quarterly") return;
      const days = getDaysUntil(s.renewalDate);
      if (days <= horizon * 31 + 10) {
        items.push({
          type: "subscription",
          category: "Subscription",
          icon: Bell,
          name: `${s.name || s.provider || "Subscription"} — Renewal`,
          date: s.renewalDate,
          days,
          amount: Number(s.amount || 0),
          color: THEME.gold,
          detail: `${s.cycle} • ${fmtINRExact(s.amount)}`,
        });
      }
    });

    // PPF maturity (15 year term)
    (state.ppf || []).forEach((p) => {
      if (!p.startDate && !p.openDate) return;
      const start = new Date(p.startDate || p.openDate);
      const matDate = new Date(start);
      matDate.setFullYear(matDate.getFullYear() + 15);
      const matDateStr = matDate.toISOString().slice(0, 10);
      const days = getDaysUntil(matDateStr);
      if (days <= horizon * 31 + 10 && days >= 0) {
        items.push({
          type: "ppf_maturity",
          category: "PPF",
          icon: Shield,
          name: `${p.institution || "PPF"} — Maturity`,
          date: matDateStr,
          days,
          amount: Number(p.balance || 0),
          color: THEME.sage,
          detail: `Balance: ${fmtINRExact(p.balance)}`,
        });
      }
    });

    // Real Estate builder demand letters (under-construction properties only) —
    // one-off milestone dues, not a recurring cycle, so unlike everything else in
    // this file each occurrence is a distinct existing record rather than a
    // projected next-due date. Previously these dues appeared nowhere outside the
    // Real Estate tab itself, so a milestone payment could be missed entirely.
    const ucPropertyIds = new Set(
      (state.realEstateProperties || [])
        .filter((p: any) => p.status === "under-construction")
        .map((p: any) => p.id)
    );
    (state.realEstateDemands || []).forEach((d: any) => {
      if (!ucPropertyIds.has(d.propertyId) || d.status === "paid" || !d.dueDate) return;
      const totalAmt = Number(d.totalAmount || d.amount || 0);
      const paidForDemand = (state.realEstatePayments || [])
        .filter((p: any) => p.demandId === d.id)
        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const remaining = Math.max(0, totalAmt - paidForDemand);
      if (remaining <= 0) return;
      const days = getDaysUntil(d.dueDate);
      if (days <= horizon * 31 + 10) {
        const property = (state.realEstateProperties || []).find((p: any) => p.id === d.propertyId);
        items.push({
          type: "realestate_demand",
          category: "Real Estate",
          icon: Building2,
          name: `${property?.name || "Property"} — ${d.milestone || "Demand"}`,
          date: d.dueDate,
          days,
          amount: remaining,
          color: THEME.gold,
          detail: `Demand: ${fmtINRExact(totalAmt)}${paidForDemand > 0 ? ` • Paid: ${fmtINRExact(paidForDemand)}` : ""}`,
        });
      }
    });

    return items.sort((a, b) => a.days - b.days);
  }, [state, horizon]);

  const filteredEvents = useMemo(() => {
    if (activeFilter === "all") return events;
    return events.filter((e) => e.type.startsWith(activeFilter));
  }, [events, activeFilter]);

  const stats = useMemo(() => {
    const upcoming7 = events.filter((e) => e.days >= 0 && e.days <= 7).length;
    const upcoming30 = events.filter((e) => e.days >= 0 && e.days <= 30).length;
    const overdue = events.filter((e) => e.days < 0).length;
    const totalInflows = events
      .filter(
        (e) =>
          ["fd_maturity", "rd_maturity", "bond_maturity", "dividend", "ppf_maturity"].includes(
            e.type
          ) && e.days >= 0
      )
      .reduce((s, e) => s + (e.maturityAmount || e.amount || 0), 0);
    const totalOutflows = events
      .filter(
        (e) => ["insurance_premium", "cc_fee", "subscription"].includes(e.type) && e.days >= 0
      )
      .reduce((s, e) => s + (e.amount || 0), 0);

    // Monthly breakdown
    const monthlyMap = {};
    events
      .filter((e) => e.days >= 0)
      .forEach((e) => {
        const m = e.date?.slice(0, 7);
        if (!m) return;
        if (!monthlyMap[m]) monthlyMap[m] = { inflow: 0, outflow: 0, events: 0 };
        monthlyMap[m].events++;
        if (
          ["fd_maturity", "rd_maturity", "bond_maturity", "dividend", "ppf_maturity"].includes(
            e.type
          )
        ) {
          monthlyMap[m].inflow += e.maturityAmount || e.amount || 0;
        } else {
          monthlyMap[m].outflow += e.amount || 0;
        }
      });

    return { upcoming7, upcoming30, overdue, totalInflows, totalOutflows, monthlyMap };
  }, [events]);

  const filterOptions = [
    { key: "all", label: "All Events" },
    { key: "fd", label: "FD/RD" },
    { key: "bond", label: "Bonds" },
    { key: "dividend", label: "Dividends" },
    { key: "insurance", label: "Insurance" },
    { key: "loan", label: "Loans" },
    { key: "cc", label: "Credit Cards" },
    { key: "subscription", label: "Subscriptions" },
    { key: "realestate", label: "Real Estate" },
  ];

  const toggleSection = (key) => setExpandedSection((p) => ({ ...p, [key]: !p[key] }));

  if (events.length === 0) {
    return (
      <div>
        <SectionTitle sub="Track upcoming maturities, dividends, premiums & renewals">
          Financial Calendar
        </SectionTitle>
        <EmptyState
          icon={Calendar}
          gradient={`linear-gradient(135deg, ${THEME.cyan} 0%, color-mix(in srgb, ${THEME.cyan} 55%, white) 100%)`}
          dotColor={THEME.cyan}
          title="No Upcoming Events"
          description="This calendar auto-populates from your Fixed Deposits, RDs, insurance policies, loans, credit cards, PPF and subscriptions — add those elsewhere in the app and their due dates and maturities will show up here."
          pills={["FD / RD Maturities", "Premium Due Dates", "Loan Closures", "Renewal Alerts"]}
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
      <SectionTitle sub="Track upcoming maturities, dividends, premiums & renewals">
        Financial Calendar
      </SectionTitle>

      {/* Horizon Toggle */}
      <div className="chip-row" style={{ marginBottom: 20, alignItems: "center" }}>
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
          icon={<Clock />}
          color={THEME.gold}
        />
        <StatCard
          label="Next 30 Days"
          value={String(stats.upcoming30)}
          icon={<Calendar />}
          color={THEME.accent}
        />
        <StatCard
          label="Overdue"
          value={String(stats.overdue)}
          sub={stats.overdue > 0 ? "Needs action" : "All caught up"}
          subColor={stats.overdue > 0 ? THEME.rust : undefined}
          icon={<AlertTriangle />}
          color={THEME.rust}
        />
        <StatCard
          label="Expected Inflows"
          value={fmtINRFull(stats.totalInflows)}
          icon={<TrendingUp />}
          color={THEME.sage}
        />
        <StatCard
          label="Expected Outflows"
          value={fmtINRFull(stats.totalOutflows)}
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
                          +<Prv>{fmtINRExact(data.inflow)}</Prv>
                        </div>
                      )}
                      {data.outflow > 0 && (
                        <div
                          style={{ fontSize: 12, color: THEME.rust, fontWeight: 600, marginTop: 2 }}
                        >
                          -<Prv>{fmtINRExact(data.outflow)}</Prv>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        </Card>
      )}

      {/* Filter Row */}
      <div className="chip-row" style={{ marginTop: 20, marginBottom: 16 }}>
        {filterOptions.map((f) => {
          const count =
            f.key === "all" ? events.length : events.filter((e) => e.type.startsWith(f.key)).length;
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

      {/* Timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {Object.entries(groupedByMonth)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, monthEvents]) => {
            const [y, m] = month.split("-");
            const label = `${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
            return (
              <Card key={month}>
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
                    <Badge variant="muted" style={{ marginLeft: 8 }}>
                      {monthEvents.length} events
                    </Badge>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {monthEvents.map((event, idx) => {
                      const Icon = event.icon;
                      const urgencyColor = getUrgencyColor(event.days);
                      return (
                        <div
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            padding: "12px 16px",
                            borderRadius: 10,
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
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 10,
                              background: `color-mix(in srgb, ${event.color} 15%, transparent)`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Icon size={18} style={{ color: event.color }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: 14,
                                color: THEME.ink,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
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
                            </div>
                            <div style={{ fontSize: 12, color: THEME.muted, marginTop: 2 }}>
                              {event.detail}
                            </div>
                          </div>
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: THEME.ink }}>
                              <Prv>{fmtINRExact(event.maturityAmount || event.amount)}</Prv>
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
      </div>
    </div>
  );
};
