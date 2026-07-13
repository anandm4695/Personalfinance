// @ts-nocheck
import React, { useState, useMemo } from "react";
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
import { fmtINRFull, fmtINRExact, today } from "../../utils/finance";
import { Card } from "../ui/Card";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { Badge } from "../ui/Badge";
import { Prv } from "../../context/PrivacyContext";
import { EmptyState } from "../ui/EmptyState";

export const SmartAlertsTab = ({ state, metrics }) => {
  const [filter, setFilter] = useState("all");
  const [dismissed, setDismissed] = useState(new Set());

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
      .filter((t) => t.type === "debit" && t.date)
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
      if (thisMonthSpend > avg * 1.3 && thisMonthSpend > 0) {
        alerts.push({
          id: "spend_anomaly",
          level: "warn",
          category: "spending",
          title: "Spending is higher than usual",
          detail: `This month: ${fmtINRExact(thisMonthSpend)} vs avg: ${fmtINRExact(avg)} (${((thisMonthSpend / avg - 1) * 100).toFixed(0)}% higher)`,
          icon: TrendingUp,
          action: "Review your expenses",
        });
      }
      if (thisMonthSpend > 0 && thisMonthSpend < avg * 0.5) {
        alerts.push({
          id: "spend_low",
          level: "info",
          category: "spending",
          title: "Spending is unusually low",
          detail: `This month: ${fmtINRExact(thisMonthSpend)} vs avg: ${fmtINRExact(avg)} — are all expenses logged?`,
          icon: TrendingDown,
          action: "Check if transactions are missing",
        });
      }
    }

    // 2. Category-specific anomalies
    const catSpend = {};
    const catAvg = {};
    (state.transactions || [])
      .filter((t) => t.type === "debit" && t.date)
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
            detail: `${fmtINRExact(thisMonth)} this month vs avg ${fmtINRExact(avg)} — ${((thisMonth / avg - 1) * 100).toFixed(0)}% higher`,
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
            detail: `${fd.bank || "FD"} — Principal: ${fmtINRExact(fd.principal)} @ ${fd.rate}%`,
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
            detail: `${b.name || "Bond"} — Face Value: ${fmtINRExact(b.faceValue || b.totalInvestmentAmount)}`,
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
          detail: `${p.planName || p.policyName || p.insurer || "Policy"} — Premium: ${fmtINRExact(p.annualPremium || p.premium)}`,
          icon: Shield,
          action: "Pay premium to avoid lapse",
        });
      }
    });

    // 5. SIP monitoring
    (state.sips || []).forEach((sip) => {
      if (sip.status === "stopped" || sip.status === "paused") return;
      if (sip.endDate && sip.endDate < todayStr) {
        alerts.push({
          id: `sip_ended_${sip.id}`,
          level: "info",
          category: "investments",
          title: "SIP completed",
          detail: `${sip.name || sip.fund || "SIP"} has ended. Consider renewing or starting a new one.`,
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
          detail: `Progress: ${progress.toFixed(0)}% — Need ${fmtINRExact(Number(g.targetAmount) - Number(g.currentAmount))} more`,
          icon: Target,
          action: "Accelerate savings",
        });
      }
    });

    // 8. Emergency fund warning
    const monthlyExpense = metrics.monthExpense || 0;
    const bankBalance = (state.bankAccounts || []).reduce((s, a) => s + Number(a.balance || 0), 0);
    if (monthlyExpense > 0 && bankBalance < monthlyExpense * 3) {
      alerts.push({
        id: "emergency_fund_low",
        level: bankBalance < monthlyExpense ? "error" : "warn",
        category: "safety",
        title: "Emergency fund below 3 months",
        detail: `Bank balance: ${fmtINRExact(bankBalance)} covers ${(bankBalance / monthlyExpense).toFixed(1)} months of expenses`,
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
        detail: `${fmtINRExact(monthlySubs)}/month on subscriptions. Review for unused ones.`,
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

  const filteredAlerts = useMemo(() => {
    let list = smartAlerts.filter((a) => !dismissed.has(a.id));
    if (filter !== "all") list = list.filter((a) => a.category === filter);
    return list;
  }, [smartAlerts, filter, dismissed]);

  const categories = [...new Set(smartAlerts.map((a) => a.category))];
  const errorCount = smartAlerts.filter((a) => a.level === "error").length;
  const warnCount = smartAlerts.filter((a) => a.level === "warn").length;

  const levelColors = { error: THEME.rust, warn: THEME.gold, info: THEME.accent };
  const levelBg = {
    error: `color-mix(in srgb, ${THEME.rust} 15%, transparent)`,
    warn: `color-mix(in srgb, ${THEME.gold} 15%, transparent)`,
    info: `color-mix(in srgb, ${THEME.accent} 15%, transparent)`,
  };
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
          value={smartAlerts.length}
          icon={<Bell />}
          color="var(--accent)"
        />
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          onClick={() => setFilter("all")}
          style={{
            padding: "6px 14px",
            borderRadius: 20,
            fontSize: 13,
            cursor: "pointer",
            border: `1px solid ${filter === "all" ? "var(--accent)" : THEME.border}`,
            background: filter === "all" ? "var(--accent)" : THEME.card,
            color: filter === "all" ? "#fff" : THEME.text,
          }}
        >
          All ({smartAlerts.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 13,
              cursor: "pointer",
              textTransform: "capitalize",
              border: `1px solid ${filter === cat ? "var(--accent)" : THEME.border}`,
              background: filter === cat ? "var(--accent)" : THEME.card,
              color: filter === cat ? "#fff" : THEME.text,
            }}
          >
            {cat} ({smartAlerts.filter((a) => a.category === cat).length})
          </button>
        ))}
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
                  background: levelBg[alert.level],
                  border: `1px solid color-mix(in srgb, ${levelColors[alert.level]} 30%, transparent)`,
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
                            color: "var(--accent)",
                            fontWeight: 500,
                          }}
                        >
                          Suggested action: {alert.action}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setDismissed((prev) => new Set([...prev, alert.id]))}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: THEME.textSecondary,
                      padding: 4,
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
          description="No alerts at this time. Your finances look healthy. Keep tracking your expenses and investments."
        />
      )}
    </div>
  );
};
