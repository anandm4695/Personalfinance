// @ts-nocheck
import React, { useState, useMemo, useEffect } from "react";
import {
  Bell,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  Shield,
  Zap,
  Filter,
  CheckCircle,
  XCircle,
  Info,
  Calendar,
  IndianRupee,
  Target,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, fmtINRExact, today, monthsBetween } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Badge } from "../ui/Badge";
import { Prv } from "../../context/PrivacyContext";
import { EmptyState } from "../ui/EmptyState";

const DISMISSED_ALERTS_KEY = "finance-dismissed-alerts";
const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const SmartAlertsTab = ({ state, metrics }) => {
  const [filter, setFilter] = useState("all");
  // Dismissal must survive a tab switch — this tab unmounts every time the user navigates
  // away, so plain component state made a dismissed alert reappear immediately on return.
  //
  // Dismissals are a snooze (id -> expiry timestamp), not permanent. Most alert ids here are
  // condition-based, not entity-based (e.g. "credit_util_high", "spend_anomaly") — the same id
  // fires again whenever the underlying condition recurs. A permanent `Set` dismissal (the old
  // behavior) silenced that id forever after a single click, so a real utilization spike three
  // months later would never resurface. Expiring the dismissal fixes that while still letting
  // the user clear noise for a while.
  const [dismissed, setDismissed] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(DISMISSED_ALERTS_KEY);
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      // Migrate the old array-of-ids format (permanent dismissals) into a few days' grace
      // snooze instead of dropping it outright.
      if (Array.isArray(parsed)) {
        const now = Date.now();
        const migrated: Record<string, number> = {};
        parsed.forEach((id: string) => (migrated[id] = now + SNOOZE_MS));
        return migrated;
      }
      const now = Date.now();
      const pruned: Record<string, number> = {};
      Object.entries(parsed as Record<string, number>).forEach(([id, expiry]) => {
        if (expiry > now) pruned[id] = expiry;
      });
      return pruned;
    } catch {
      return {};
    }
  });

  const isSnoozed = (id: string) => !!dismissed[id] && dismissed[id] > Date.now();

  const dismissAlert = (id: string) => {
    setDismissed((prev) => {
      const next = { ...prev, [id]: Date.now() + SNOOZE_MS };
      try {
        localStorage.setItem(DISMISSED_ALERTS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const clearSnoozed = () => {
    setDismissed({});
    try {
      localStorage.removeItem(DISMISSED_ALERTS_KEY);
    } catch {}
  };

  const snoozedCount = Object.keys(dismissed).filter((id) => isSnoozed(id)).length;

  const smartAlerts = useMemo(() => {
    const alerts = [];
    const now = new Date();
    const todayStr = today();
    // Day-count helper: diffs two LOCAL midnights instead of `dateStr`'s UTC midnight vs the
    // real current instant `now` (which carries today's time-of-day). Mixing those made the
    // displayed "days until" for FD/bond maturities and goal deadlines drift by up to a day
    // depending on what time of day the alert was computed, and could show a same-day event as
    // 2 days away when checked before ~5:30am IST.
    const daysUntil = (dateStr) => {
      if (!dateStr) return Infinity;
      const target = new Date(dateStr + "T00:00:00");
      const nowMidnight = new Date(todayStr + "T00:00:00");
      return Math.round((target.getTime() - nowMidnight.getTime()) / 86400000);
    };
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const lastMonth = `${now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()}-${String(now.getMonth() === 0 ? 12 : now.getMonth()).padStart(2, "0")}`;

    // 1. Spending anomaly detection
    const monthlySpend = {};
    (state.transactions || [])
      .filter(
        (t) =>
          t.type === "debit" &&
          t.date &&
          t.category !== "Transfer" &&
          t.category !== "Self Transfer" &&
          t.category !== "Self-Transfer"
      )
      .forEach((t) => {
        const ym = t.date.slice(0, 7);
        monthlySpend[ym] = (monthlySpend[ym] || 0) + Number(t.amount || 0);
      });

    const spendValues = Object.entries(monthlySpend)
      .filter(([ym]) => ym < currentMonth)
      .map(([, v]) => v);
    if (spendValues.length >= 3) {
      const avg = spendValues.reduce((s, v) => s + v, 0) / spendValues.length;
      const thisMonthSpend = monthlySpend[currentMonth] || 0;
      // `avg` is a FULL-month total, but `thisMonthSpend` is a partial, in-progress month —
      // comparing them directly meant "spending is unusually low" fired almost every day
      // for the first ~15 days of every month (half the month elapsed = ~half of avg spent,
      // which is normal pacing, not an anomaly) and "higher than usual" almost never fired
      // except near month-end. Prorate `avg` to the same elapsed-days fraction before comparing.
      const dayOfMonth = now.getDate();
      const daysInCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const expectedToDate = avg * (dayOfMonth / daysInCurrentMonth);
      if (expectedToDate > 0 && thisMonthSpend > expectedToDate * 1.3 && thisMonthSpend > 0) {
        alerts.push({
          id: "spend_anomaly",
          level: "warn",
          category: "spending",
          title: "Spending is higher than usual",
          detail: (
            <>
              {"So far this month: "}
              <Prv>{fmtINRExact(thisMonthSpend)}</Prv>
              {" vs typical pace: "}
              <Prv>{fmtINRExact(expectedToDate)}</Prv>
              {` (${((thisMonthSpend / expectedToDate - 1) * 100).toFixed(0)}% higher, avg full month: `}
              <Prv>{fmtINRExact(avg)}</Prv>
              {")"}
            </>
          ),
          icon: TrendingUp,
          action: "Review your expenses",
        });
      }
      // Only flag "unusually low" once enough of the month has elapsed for pacing to be
      // meaningful — a week's worth of transactions is too small a sample to judge.
      if (dayOfMonth >= 7 && thisMonthSpend > 0 && thisMonthSpend < expectedToDate * 0.5) {
        alerts.push({
          id: "spend_low",
          level: "info",
          category: "spending",
          title: "Spending is unusually low",
          detail: (
            <>
              {"So far this month: "}
              <Prv>{fmtINRExact(thisMonthSpend)}</Prv>
              {" vs typical pace: "}
              <Prv>{fmtINRExact(expectedToDate)}</Prv>
              {" — are all expenses logged?"}
            </>
          ),
          icon: TrendingDown,
          action: "Check if transactions are missing",
        });
      }
    }

    // 2. Category-specific anomalies
    const catSpend = {};
    const catAvg = {};
    (state.transactions || [])
      .filter(
        (t) =>
          t.type === "debit" &&
          t.date &&
          t.category !== "Transfer" &&
          t.category !== "Self Transfer" &&
          t.category !== "Self-Transfer"
      )
      .forEach((t) => {
        const ym = t.date.slice(0, 7);
        const cat = t.category || "Uncategorized";
        if (!catSpend[cat]) catSpend[cat] = {};
        catSpend[cat][ym] = (catSpend[cat][ym] || 0) + Number(t.amount || 0);
      });
    Object.entries(catSpend).forEach(([cat, months]) => {
      const vals = Object.entries(months)
        .filter(([ym]) => ym < currentMonth)
        .map(([, v]) => v);
      if (vals.length >= 3) {
        const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
        const thisMonth = months[currentMonth] || 0;
        if (thisMonth > avg * 2 && thisMonth > 5000) {
          alerts.push({
            id: `cat_spike_${cat}`,
            level: "warn",
            category: "spending",
            title: `${cat} spending spiked`,
            detail: (
              <>
                <Prv>{fmtINRExact(thisMonth)}</Prv>
                {" this month vs avg "}
                <Prv>{fmtINRExact(avg)}</Prv>
                {` — ${((thisMonth / avg - 1) * 100).toFixed(0)}% higher`}
              </>
            ),
            icon: AlertTriangle,
            action: `Review ${cat} transactions`,
          });
        }
      }
    });

    // 3. FD maturing soon
    (state.fixedDeposits || []).forEach((fd) => {
      if (fd.maturityDate) {
        const days = daysUntil(fd.maturityDate);
        if (days >= 0 && days <= 30) {
          alerts.push({
            id: `fd_mature_${fd.id}`,
            level: days <= 7 ? "error" : "warn",
            category: "investments",
            title: `FD maturing in ${days} days`,
            detail: (
              <>
                {`${fd.bank || "FD"} — Principal: `}
                <Prv>{fmtINRExact(fd.principal)}</Prv>
                {` @ ${fd.rate}%`}
              </>
            ),
            icon: Clock,
            action: "Decide: reinvest or withdraw",
          });
        }
      }
    });

    // 3b. Bond maturing soon
    (state.bonds || []).forEach((b) => {
      if (b.maturityDate) {
        const days = daysUntil(b.maturityDate);
        if (days >= 0 && days <= 30) {
          alerts.push({
            id: `bond_mature_${b.id}`,
            level: days <= 7 ? "error" : "warn",
            category: "investments",
            title: `Bond maturing in ${days} days`,
            detail: (
              <>
                {`${b.name || "Bond"} — Face Value: `}
                <Prv>{fmtINRExact(b.faceValue || b.totalInvestmentAmount)}</Prv>
              </>
            ),
            icon: Clock,
            action: "Decide: reinvest or withdraw",
          });
        }
      }
    });

    // 4. Insurance premium due (anniversary-based, matching RemindersTab logic)
    const insurancePolicies = [
      ...(state.lic || []).map((p) => ({
        ...p,
        _startField: p.commencementDate,
        _matField: p.maturityDate,
        _termField: p.policyTerm,
      })),
      ...(state.termPlans || []).map((p) => ({
        ...p,
        _startField: p.startDate,
        _matField: p.expiryDate,
        _termField: p.premiumPayingTerm || p.term,
      })),
      ...(state.investmentPlans || []).map((p) => ({
        ...p,
        _startField: p.commencementDate,
        _matField: p.maturityDate,
        _termField: p.premiumPayingTerm || p.policyTerm,
      })),
    ];
    insurancePolicies.forEach((p) => {
      if (!p._startField) return;
      const comm = new Date(p._startField);
      if (isNaN(comm.getTime())) return;
      const currentYear = now.getFullYear();
      let anniversary = new Date(currentYear, comm.getMonth(), comm.getDate());
      if (anniversary < new Date(todayStr + "T00:00:00")) {
        anniversary = new Date(currentYear + 1, comm.getMonth(), comm.getDate());
      }
      let isExpired = false;
      if (p._matField) {
        const mat = new Date(p._matField);
        if (!isNaN(mat.getTime()) && anniversary > mat) isExpired = true;
      }
      const payTerm = p._termField ? parseInt(p._termField, 10) : null;
      if (payTerm && !isNaN(payTerm)) {
        if (anniversary.getFullYear() - comm.getFullYear() >= payTerm) isExpired = true;
      }
      if (isExpired) return;
      // `anniversary` is already LOCAL midnight (multi-arg Date constructor) — diff it against
      // today's local midnight, not the real "now" instant, for the same reason as daysUntil().
      const days = Math.round(
        (anniversary.getTime() - new Date(todayStr + "T00:00:00").getTime()) / 86400000
      );
      if (days >= 0 && days <= 30) {
        alerts.push({
          id: `insurance_due_${p.id}`,
          level: days <= 7 ? "error" : "warn",
          category: "insurance",
          title: `Insurance premium due in ${days} days`,
          detail: (
            <>
              {`${p.planName || p.policyName || p.insurer || "Policy"} — Premium: `}
              <Prv>{fmtINRExact(p.annualPremium || p.premium)}</Prv>
            </>
          ),
          icon: Shield,
          action: "Pay premium to avoid lapse",
        });
      }
    });

    // 5. SIP monitoring — this alert was permanently dead: SIP records carry
    // `startDate`/`totalInstallments`/`frequency`/`scheme`, never `endDate`/`name`/`fund`,
    // so the old condition and detail text could never fire/read correctly. Derive
    // completion the same way SIPTrackerTab.tsx does (monthsElapsed >= totalInstallments).
    (state.sips || []).forEach((sip) => {
      if (sip.status === "stopped" || sip.status === "paused") return;
      const totalInst = Number(sip.totalInstallments || 0);
      if (totalInst <= 0 || !sip.startDate) return;
      const isQuarterly = sip.frequency === "quarterly";
      const monthsElapsed = Math.max(0, monthsBetween(sip.startDate, todayStr));
      const installmentsElapsed = isQuarterly ? Math.floor(monthsElapsed / 3) : monthsElapsed;
      if (installmentsElapsed >= totalInst) {
        alerts.push({
          id: `sip_ended_${sip.id}`,
          level: "info",
          category: "investments",
          title: "SIP completed",
          detail: `${sip.scheme || "SIP"} has completed its ${totalInst}-installment run. Consider renewing or starting a new one.`,
          icon: CheckCircle,
          action: "Review SIP tracker",
        });
      }
    });

    // 6. No transactions logged recently
    const latestTxn = (state.transactions || []).reduce((latest, t) => {
      if (!t.date) return latest;
      return t.date > latest ? t.date : latest;
    }, "");
    if (latestTxn && todayStr) {
      const daysSince = Math.ceil(
        (new Date(todayStr).getTime() - new Date(latestTxn).getTime()) / 86400000
      );
      if (daysSince > 14) {
        alerts.push({
          id: "no_recent_txns",
          level: "info",
          category: "data",
          title: `No transactions logged in ${daysSince} days`,
          detail:
            "Your records may be out of date. Import a bank statement or add transactions manually.",
          icon: Info,
          action: "Add transactions",
        });
      }
    }

    // 7. Goal deadlines approaching
    (state.goals || []).forEach((g) => {
      if (!g.targetDate) return;
      const days = daysUntil(g.targetDate);
      const progress = Number(g.targetAmount)
        ? (Number(g.currentAmount) / Number(g.targetAmount)) * 100
        : 0;
      if (days >= 0 && days <= 90 && progress < 80) {
        alerts.push({
          id: `goal_deadline_${g.id}`,
          level: days <= 30 ? "error" : "warn",
          category: "goals",
          title: `Goal "${g.name}" deadline in ${days} days`,
          detail: (
            <>
              {`Progress: ${progress.toFixed(0)}% — Need `}
              <Prv>{fmtINRExact(Number(g.targetAmount) - Number(g.currentAmount))}</Prv>
              {" more"}
            </>
          ),
          icon: Target,
          action: "Accelerate savings",
        });
      }
    });

    // 7b. Life event deadlines approaching — same shape/threshold as the goal-deadline
    // alert above (life events and financial goals are structurally similar: a target
    // amount + date + progress). Previously life events surfaced no alert anywhere.
    (state.lifeEvents || []).forEach((e) => {
      if (!e.targetDate) return;
      const days = daysUntil(e.targetDate);
      const progress = Number(e.estimatedCost)
        ? (Number(e.currentSaved) / Number(e.estimatedCost)) * 100
        : 0;
      if (days >= 0 && days <= 90 && progress < 80) {
        alerts.push({
          id: `life_event_deadline_${e.id}`,
          level: days <= 30 ? "error" : "warn",
          category: "goals",
          title: `Life event "${e.name}" in ${days} days`,
          detail: (
            <>
              {`Progress: ${progress.toFixed(0)}% — Need `}
              <Prv>{fmtINRExact(Math.max(0, Number(e.estimatedCost) - Number(e.currentSaved)))}</Prv>
              {" more"}
            </>
          ),
          icon: Calendar,
          action: "Review Life Event Planner",
        });
      }
    });

    const monthlyExpense = metrics.monthExpense || 0;

    // 8. Emergency fund warning — same liquid-assets figure (bank + near-term FDs
    // + liquid MF + prepaid) as the dedicated Emergency Fund tab, instead of raw
    // bank balance alone.
    const efLiquidAssets = metrics.emergencyFund.liquidAssets;
    const efMonthlyExpense = metrics.emergencyFund.monthlyExpense;
    if (efMonthlyExpense > 0 && metrics.emergencyFund.monthsCovered < 3) {
      alerts.push({
        id: "emergency_fund_low",
        level: metrics.emergencyFund.monthsCovered < 1 ? "error" : "warn",
        category: "safety",
        title: "Emergency fund below 3 months",
        detail: (
          <>
            {"Liquid assets: "}
            <Prv>{fmtINRExact(efLiquidAssets)}</Prv>
            {` covers ${metrics.emergencyFund.monthsCovered.toFixed(1)} months of expenses`}
          </>
        ),
        icon: Shield,
        action: "Build up your emergency fund",
      });
    }

    // 9. Credit utilization high
    const ccUtil = Number(metrics.creditUtilization) || 0;
    if (ccUtil > 30) {
      alerts.push({
        id: "credit_util_high",
        level: ccUtil > 70 ? "error" : "warn",
        category: "credit",
        title: `Credit utilization at ${ccUtil.toFixed(0)}%`,
        detail: "Keep credit utilization below 30% for a healthy credit score",
        icon: AlertTriangle,
        action: "Pay down credit card outstanding",
      });
    }

    // 10. Subscription review
    const monthlySubs = (state.subscriptions || [])
      .filter((s) => !s.paused)
      .reduce((s, sub) => {
        const amt = Number(sub.amount || 0);
        if (sub.cycle === "yearly") return s + amt / 12;
        if (sub.cycle === "quarterly") return s + amt / 3;
        return s + amt;
      }, 0);
    if (monthlySubs > monthlyExpense * 0.15 && monthlySubs > 5000) {
      alerts.push({
        id: "subs_high",
        level: "info",
        category: "spending",
        title: "Subscriptions are 15%+ of expenses",
        detail: (
          <>
            <Prv>{fmtINRExact(monthlySubs)}</Prv>
            {"/month on subscriptions. Review for unused ones."}
          </>
        ),
        icon: Zap,
        action: "Review subscriptions",
      });
    }

    // 11. Loan EMI to income ratio
    const foirVal = Number(metrics.foir) || 0;
    if (foirVal > 40) {
      alerts.push({
        id: "foir_high",
        level: foirVal > 50 ? "error" : "warn",
        category: "credit",
        title: `EMI-to-income ratio at ${foirVal.toFixed(0)}%`,
        detail: "Banks consider >50% FOIR risky. Try to keep it below 40%.",
        icon: AlertTriangle,
        action: "Consider prepaying high-interest loans",
      });
    }

    return alerts.sort((a, b) => {
      const order = { error: 0, warn: 1, info: 2 };
      return order[a.level] - order[b.level];
    });
  }, [state, metrics]);

  // Every count/stat on this page must be driven off *active* (non-snoozed) alerts. The old
  // version computed stats and filter-pill counts from the raw `smartAlerts` list, so dismissing
  // an alert never moved the "Critical Alerts" stat, the "All (N)" count, or its own category
  // pill count — the numbers stayed frozen while the list below them shrank, which reads as the
  // dismiss button being broken.
  const activeAlerts = useMemo(
    () => smartAlerts.filter((a) => !isSnoozed(a.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [smartAlerts, dismissed]
  );

  const filteredAlerts = useMemo(() => {
    if (filter === "all") return activeAlerts;
    return activeAlerts.filter((a) => a.category === filter);
  }, [activeAlerts, filter]);

  const categories = useMemo(
    () => [...new Set(activeAlerts.map((a) => a.category))],
    [activeAlerts]
  );
  const errorCount = activeAlerts.filter((a) => a.level === "error").length;
  const warnCount = activeAlerts.filter((a) => a.level === "warn").length;

  // If the selected category filter has no active alerts left (e.g. its last alert was just
  // dismissed), fall back to "all" instead of silently showing an empty list under a pill that
  // no longer even appears in the filter row.
  useEffect(() => {
    if (filter !== "all" && !categories.includes(filter)) setFilter("all");
  }, [categories, filter]);

  const levelColors = { error: THEME.rust, warn: THEME.gold, info: THEME.accent };
  const levelLabels = { error: "Critical", warn: "Warning", info: "Info" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <SectionTitle sub="AI-powered financial health monitoring">Smart Alerts</SectionTitle>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
        }}
      >
        <StatCard
          label="Critical Alerts"
          value={errorCount}
          icon={<XCircle />}
          color={THEME.rust}
        />
        <StatCard label="Warnings" value={warnCount} icon={<AlertTriangle />} color={THEME.gold} />
        <StatCard
          label="Total Alerts"
          value={activeAlerts.length}
          icon={<Bell />}
          color={THEME.accent}
        />
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => setFilter("all")}
            aria-pressed={filter === "all"}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              border: `1.5px solid ${filter === "all" ? THEME.accent : THEME.border}`,
              background: filter === "all" ? THEME.accent : THEME.card,
              color: filter === "all" ? "#fff" : THEME.text,
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (filter !== "all") e.currentTarget.style.borderColor = THEME.accent;
            }}
            onMouseLeave={(e) => {
              if (filter !== "all") e.currentTarget.style.borderColor = THEME.border;
            }}
          >
            All ({activeAlerts.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              aria-pressed={filter === cat}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                textTransform: "capitalize",
                border: `1.5px solid ${filter === cat ? THEME.accent : THEME.border}`,
                background: filter === cat ? THEME.accent : THEME.card,
                color: filter === cat ? "#fff" : THEME.text,
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (filter !== cat) e.currentTarget.style.borderColor = THEME.accent;
              }}
              onMouseLeave={(e) => {
                if (filter !== cat) e.currentTarget.style.borderColor = THEME.border;
              }}
            >
              {cat} ({activeAlerts.filter((a) => a.category === cat).length})
            </button>
          ))}
        </div>
        {snoozedCount > 0 && (
          <button
            onClick={clearSnoozed}
            style={{
              padding: "6px 12px",
              borderRadius: 20,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              border: `1px dashed ${THEME.border}`,
              background: "transparent",
              color: THEME.textSecondary,
            }}
            title="Snoozed alerts will resurface automatically after 30 days if the condition still applies. Click to bring them all back now."
          >
            {snoozedCount} snoozed · Show again
          </button>
        )}
      </div>

      {/* Alert Cards */}
      {filteredAlerts.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredAlerts.map((alert) => {
            const Icon = alert.icon;
            return (
              <Card
                key={alert.id}
                style={{
                  padding: 16,
                  background: "var(--t-card-bg)",
                  border: `1px solid ${THEME.line}`,
                  borderLeft: `3px solid ${levelColors[alert.level]}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1 }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: `color-mix(in srgb, ${levelColors[alert.level]} 20%, transparent)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} color={levelColors[alert.level]} />
                    </div>
                    <div>
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}
                      >
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 6,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            background: `color-mix(in srgb, ${levelColors[alert.level]} 20%, transparent)`,
                            color: levelColors[alert.level],
                          }}
                        >
                          {levelLabels[alert.level]}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color: THEME.textSecondary,
                            textTransform: "capitalize",
                          }}
                        >
                          {alert.category}
                        </span>
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          color: THEME.text,
                          marginBottom: 4,
                        }}
                      >
                        {alert.title}
                      </div>
                      <div style={{ fontSize: 13, color: THEME.textSecondary }}>{alert.detail}</div>
                      {alert.action && (
                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 12,
                            color: THEME.accent,
                            fontWeight: 500,
                          }}
                        >
                          Suggested action: {alert.action}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    title="Snooze for 30 days"
                    aria-label="Snooze alert for 30 days"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: THEME.textSecondary,
                      padding: 6,
                      flexShrink: 0,
                    }}
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={CheckCircle}
          title="All Clear!"
          description={
            snoozedCount > 0
              ? `No active alerts. ${snoozedCount} alert${snoozedCount === 1 ? " is" : "s are"} snoozed for now — they'll come back if the condition still holds after 30 days, or click "Show again" above.`
              : "No alerts at this time. Your finances look healthy. Keep tracking your expenses and investments."
          }
        />
      )}
    </div>
  );
};
