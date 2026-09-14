import React from "react";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Wallet,
  ArrowRight,
  Shield,
  Zap,
  Heart,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINRFull, fmtINRExact, fmtDate } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Money } from "../ui/Money";
import { UnifiedInsurancePolicy } from "./InsuranceTypes";

interface InsurancePremiumCalendarProps {
  policies: UnifiedInsurancePolicy[];
  onOpenLedger: (policy: UnifiedInsurancePolicy) => void;
}

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

export const InsurancePremiumCalendar: React.FC<InsurancePremiumCalendarProps> = ({
  policies,
  onOpenLedger,
}) => {
  const currentMonthIdx = new Date().getMonth();

  // Active policies with premium due dates
  const activePolicies = policies.filter((p) => !p.isFullyPaid && !p.isMatured);

  // Group by calendar month (0 to 11)
  const monthlyOutflows = MONTH_NAMES.map((monthName, idx) => {
    const duePolicies = activePolicies.filter((p) => {
      if (!p.startDate && !p.nextDueDate) return false;
      const d = p.nextDueDate ? new Date(p.nextDueDate) : new Date(p.startDate);
      return !isNaN(d.getTime()) && d.getMonth() === idx;
    });

    const totalAmount = duePolicies.reduce((sum, p) => sum + p.annualPremium, 0);

    return {
      month: monthName,
      monthIndex: idx,
      isCurrent: idx === currentMonthIdx,
      policies: duePolicies,
      totalAmount,
    };
  });

  const maxMonthAmount = Math.max(...monthlyOutflows.map((m) => m.totalAmount), 1);

  // Upcoming sorted by nearest due date
  const upcomingSchedule = activePolicies
    .filter((p) => p.daysUntilDue !== null && p.daysUntilDue <= 90)
    .sort((a, b) => (a.daysUntilDue ?? 999) - (b.daysUntilDue ?? 999));

  // Upcoming maturities (end dates) in future
  const upcomingMaturities = policies
    .filter((p) => {
      if (!p.endDate) return false;
      const end = new Date(p.endDate);
      const now = new Date();
      return !isNaN(end.getTime()) && end >= now;
    })
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 12-Month Outflow Heatmap / Distribution */}
      <Card style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t-muted)", marginBottom: 2 }}>
              Annual Cashflow Planning
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--t-ink)" }}>
              12-Month Insurance Premium Outflow
            </div>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--t-accent)" }}>
            Total Outflow:{" "}
            <Money
              value={monthlyOutflows.reduce((s, m) => s + m.totalAmount, 0)}
              variant="full"
            />
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          {monthlyOutflows.map((m) => {
            const heightPct = m.totalAmount > 0 ? Math.max(15, (m.totalAmount / maxMonthAmount) * 100) : 4;
            return (
              <div
                key={m.month}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  height: 140,
                  padding: "6px 2px",
                  borderRadius: 8,
                  background: m.isCurrent
                    ? "color-mix(in srgb, var(--t-accent) 12%, transparent)"
                    : "color-mix(in srgb, var(--t-muted) 4%, transparent)",
                  border: m.isCurrent
                    ? "1px solid color-mix(in srgb, var(--t-accent) 30%, transparent)"
                    : `1px solid ${THEME.line}`,
                }}
              >
                {m.totalAmount > 0 && (
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--t-ink)",
                      marginBottom: 4,
                      textAlign: "center",
                    }}
                  >
                    <Money value={m.totalAmount} variant="compact" />
                  </div>
                )}
                <div
                  style={{
                    width: "70%",
                    height: `${heightPct}%`,
                    borderRadius: 4,
                    background: m.isCurrent
                      ? "var(--t-accent)"
                      : m.totalAmount > 0
                      ? "color-mix(in srgb, var(--t-accent) 60%, transparent)"
                      : "color-mix(in srgb, var(--t-muted) 15%, transparent)",
                    transition: "height 0.3s ease",
                  }}
                />
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: m.isCurrent ? 800 : 600,
                    color: m.isCurrent ? "var(--t-accent)" : "var(--t-muted)",
                    marginTop: 6,
                  }}
                >
                  {m.month}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Two Column Layout: Upcoming 90-Day Dues + Future Maturity Windfalls */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
        {/* Left: Upcoming Premiums */}
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Clock size={16} style={{ color: "var(--t-accent)" }} />
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--t-ink)" }}>
              Upcoming Dues (Next 90 Days)
            </div>
          </div>

          {upcomingSchedule.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--t-muted)", fontSize: 12.5 }}>
              ✓ No insurance premiums due in the next 90 days.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {upcomingSchedule.map((p) => {
                const isOverdue = p.daysUntilDue !== null && p.daysUntilDue <= 0;
                const isVerySoon = p.daysUntilDue !== null && p.daysUntilDue <= 30;
                const urgencyColor = isOverdue
                  ? THEME.rust
                  : isVerySoon
                  ? THEME.gold
                  : THEME.muted;

                return (
                  <div
                    key={`${p.type}-${p.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "var(--surface-0)",
                      border: `1px solid ${THEME.line}`,
                      borderLeft: `3px solid ${urgencyColor}`,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--t-ink)" }}>
                        {p.planName}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--t-muted)" }}>
                        {p.nextDueDate ? fmtDate(p.nextDueDate) : "Due date pending"} ·{" "}
                        <span style={{ color: urgencyColor, fontWeight: 700 }}>
                          {isOverdue
                            ? `Overdue by ${Math.abs(p.daysUntilDue!)} days`
                            : `In ${p.daysUntilDue} days`}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800, fontSize: 13, color: "var(--t-ink)" }}>
                          <Money value={p.annualPremium} variant="exact" />
                        </div>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onOpenLedger(p)}
                        style={{ fontSize: 11, padding: "4px 8px" }}
                      >
                        Ledger
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Right: Policy Maturity Roadmap & Windfall Inflows */}
        <Card style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <TrendingUp size={16} style={{ color: "var(--t-sage)" }} />
            <div style={{ fontSize: 14, fontWeight: 800, color: "var(--t-ink)" }}>
              Maturity Roadmap & Inflow Schedule
            </div>
          </div>

          {upcomingMaturities.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--t-muted)", fontSize: 12.5 }}>
              No maturity dates recorded on investment/endowment policies.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, overflowY: "auto" }}>
              {upcomingMaturities.map((p) => {
                const end = new Date(p.endDate);
                const yearsLeft = Math.max(0, end.getFullYear() - new Date().getFullYear());

                return (
                  <div
                    key={`mat-${p.type}-${p.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: 8,
                      background: "var(--surface-0)",
                      border: `1px solid ${THEME.line}`,
                      borderLeft: `3px solid ${p.typeColor}`,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--t-ink)" }}>
                        {p.planName}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--t-muted)" }}>
                        Matures: {fmtDate(p.endDate)} ({yearsLeft > 0 ? `${yearsLeft} yrs away` : "This year"})
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--t-muted)", textTransform: "uppercase" }}>
                        Expected Payout
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 13.5, color: "var(--t-sage)" }}>
                        <Money value={p.coverAmount} variant="full" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
