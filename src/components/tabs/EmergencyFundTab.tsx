// @ts-nocheck
import React, { useMemo } from "react";
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Landmark,
  Wallet,
  Info,
  IndianRupee,
  Target,
  PieChart,
  CreditCard,
  Home,
  RefreshCw,
  ClipboardList,
  HeartPulse,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { EmptyState } from "../ui/EmptyState";
import { Prv } from "../../context/PrivacyContext";

const getHealthColor = (months) => {
  if (months >= 12) return THEME.sage;
  if (months >= 6) return THEME.accent;
  if (months >= 3) return THEME.gold;
  return THEME.rust;
};

const getHealthLabel = (months) => {
  if (months >= 12) return "Excellent";
  if (months >= 6) return "Healthy";
  if (months >= 3) return "Needs Improvement";
  return "Critical";
};

export const EmergencyFundTab = ({ state, metrics }) => {
  const data = useMemo(() => {
    // Liquid assets = bank balances + FD (if breakable) + liquid MF
    const bankBalance = (state.bankAccounts || []).reduce((s, a) => s + Number(a.balance || 0), 0);

    const liquidMF = (state.mutualFunds || []).reduce((s, m) => {
      const cat = (m.category || m.type || "").toLowerCase();
      if (
        cat.includes("liquid") ||
        cat.includes("money market") ||
        cat.includes("overnight") ||
        cat.includes("ultra short")
      ) {
        return s + (Number(m.units) || 0) * (Number(m.currentNav) || Number(m.buyNav) || 0);
      }
      return s;
    }, 0);

    const prepaidBalance = (state.prepaidCards || []).reduce((s, c) => {
      const txns = c.transactions || [];
      const balance = txns.reduce((ts, t) => {
        return t.type === "credit" ? ts + Number(t.amount || 0) : ts - Number(t.amount || 0);
      }, 0);
      return s + Math.max(0, balance);
    }, 0);

    const totalLiquid = bankBalance + liquidMF + prepaidBalance;

    // Monthly expenses
    const monthlyExpense = (() => {
      // Use budget total if available.
      // Bug fix: this previously summed EVERY budget category unconditionally,
      // including "Investment" and "Transfer" — both valid budget categories a
      // user can set in BudgetTab.tsx (e.g. an "Investment: ₹20,000/mo" SIP
      // target) but neither is real spend. MonthlyReportModal.tsx already
      // established the pattern of excluding these two from "expense" totals
      // app-wide (see its isTransferCat/`category !== "Investment"` filters);
      // pulling them into this tab's expense base inflated the denominator
      // used for "months of expenses covered", understating the user's real
      // emergency-fund runway for anyone with sizeable investment budgets.
      const isNonExpenseBudgetCat = (cat) =>
        ["Transfer", "Self Transfer", "Self-Transfer", "Investment"].includes(cat || "");
      const budgetTotal = (state.budgets || [])
        .filter((b) => !isNonExpenseBudgetCat(b.category))
        .reduce((s, b) => s + Number(b.monthly || b.monthlyLimit || 0), 0);
      if (budgetTotal > 0) return budgetTotal;

      // Fallback: sum of EMIs + SIPs + subscriptions + recurring expenses + rent
      const emis = (state.loansTaken || []).reduce((s, l) => s + Number(l.emi || 0), 0);
      const sips = (state.sips || [])
        .filter((s) => s.status !== "stopped")
        .reduce((s, si) => s + Number(si.amount || 0), 0);
      const subs = (state.subscriptions || [])
        .filter((s) => !s.paused)
        .reduce((s, sub) => {
          const amt = Number(sub.amount || 0);
          if (sub.cycle === "yearly") return s + amt / 12;
          if (sub.cycle === "quarterly") return s + amt / 3;
          return s + amt;
        }, 0);
      const recurring = (state.recurringExpenses || []).reduce(
        (s, r) => s + Number(r.amount || 0),
        0
      );
      const rent = (state.rentedProperties || []).reduce(
        (s, p) => s + Number(p.monthlyRent || 0),
        0
      );
      const insurance = [
        ...(state.lic || []),
        ...(state.termPlans || []),
        ...(state.investmentPlans || []),
      ].reduce((s, p) => s + Number(p.annualPremium || p.premium || 0) / 12, 0);
      return emis + sips + subs + recurring + rent + insurance;
    })();

    // If expense calc fails, use metrics
    const finalExpense = monthlyExpense > 0 ? monthlyExpense : metrics.monthExpense || 0;

    const monthsCovered = finalExpense > 0 ? totalLiquid / finalExpense : 0;
    const targetMonths = 6;
    const targetAmount = finalExpense * targetMonths;
    const gap = Math.max(0, targetAmount - totalLiquid);
    const coveragePct = Math.min(100, (monthsCovered / targetMonths) * 100);

    // Expense breakdown for table
    const expenseBreakdown = [];
    const emis = (state.loansTaken || []).reduce((s, l) => s + Number(l.emi || 0), 0);
    if (emis > 0) expenseBreakdown.push({ label: "EMIs", amount: emis, icon: CreditCard });

    const rent = (state.rentedProperties || []).reduce((s, p) => s + Number(p.monthlyRent || 0), 0);
    if (rent > 0) expenseBreakdown.push({ label: "Rent", amount: rent, icon: Home });

    const sipTotal = (state.sips || [])
      .filter((s) => s.status !== "stopped")
      .reduce((s, si) => s + Number(si.amount || 0), 0);
    if (sipTotal > 0) expenseBreakdown.push({ label: "SIPs", amount: sipTotal, icon: TrendingUp });

    const subTotal = (state.subscriptions || [])
      .filter((s) => !s.paused)
      .reduce((s, sub) => {
        const amt = Number(sub.amount || 0);
        if (sub.cycle === "yearly") return s + amt / 12;
        if (sub.cycle === "quarterly") return s + amt / 3;
        return s + amt;
      }, 0);
    if (subTotal > 0)
      expenseBreakdown.push({ label: "Subscriptions", amount: subTotal, icon: RefreshCw });

    const recTotal = (state.recurringExpenses || []).reduce((s, r) => s + Number(r.amount || 0), 0);
    if (recTotal > 0)
      expenseBreakdown.push({ label: "Recurring Expenses", amount: recTotal, icon: ClipboardList });

    const insTotal = [
      ...(state.lic || []),
      ...(state.termPlans || []),
      ...(state.investmentPlans || []),
    ].reduce((s, p) => s + Number(p.annualPremium || p.premium || 0) / 12, 0);
    if (insTotal > 0)
      expenseBreakdown.push({ label: "Insurance Premiums", amount: insTotal, icon: HeartPulse });

    return {
      bankBalance,
      liquidMF,
      prepaidBalance,
      totalLiquid,
      monthlyExpense: finalExpense,
      monthsCovered,
      targetMonths,
      targetAmount,
      gap,
      coveragePct,
      expenseBreakdown,
    };
  }, [state, metrics]);

  const healthColor = getHealthColor(data.monthsCovered);
  const healthLabel = getHealthLabel(data.monthsCovered);

  return (
    <div>
      <SectionTitle sub="How many months can you survive on liquid assets alone?">
        Emergency Fund Health
      </SectionTitle>

      {/* Main Health Indicator */}
      <Card className="glass" style={{ background: "transparent", borderRadius: 16 }}>
        <div
          style={{ padding: 24, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}
        >
          {/* Circular gauge */}
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              flexShrink: 0,
              background: `conic-gradient(${healthColor} 0%, ${healthColor} ${Math.min(data.coveragePct, 100) * 3.6}deg, var(--t-line) 0deg)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 15px color-mix(in srgb, ${healthColor} 20%, transparent), inset 0 0 10px rgba(0,0,0,0.05)`,
              position: "relative",
            }}
          >
            <div
              style={{
                width: 98,
                height: 98,
                borderRadius: "50%",
                background: "color-mix(in srgb, var(--surface-0) 88%, transparent)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                border: "1.5px solid var(--t-line)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 900,
                  color: healthColor,
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                }}
              >
                {data.monthsCovered.toFixed(1)}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: THEME.muted,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginTop: 4,
                }}
              >
                months
              </div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Badge
                variant={
                  data.monthsCovered >= 6
                    ? "success"
                    : data.monthsCovered >= 3
                      ? "warning"
                      : "error"
                }
              >
                {healthLabel}
              </Badge>
            </div>
            <div style={{ fontSize: 14, color: THEME.ink, marginBottom: 12 }}>
              Your liquid assets can cover <strong>{data.monthsCovered.toFixed(1)} months</strong>{" "}
              of expenses.
              {data.monthsCovered < 6 && (
                <span style={{ color: THEME.rust, fontWeight: 500 }}>
                  {" "}
                  Target is at least 6 months.
                </span>
              )}
            </div>

            {/* Progress bar */}
            <div className="progress-track" style={{ height: 8, marginTop: 12, marginBottom: 8 }}>
              <div
                style={{
                  height: "100%",
                  borderRadius: "var(--radius-full)",
                  width: `${Math.min(100, data.coveragePct)}%`,
                  background: `linear-gradient(90deg, ${healthColor}, color-mix(in srgb, ${healthColor} 65%, white))`,
                  transition: "width 0.8s var(--ease-premium)",
                  position: "relative",
                }}
                className="progress-fill"
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
              <span style={{ fontSize: 11, color: THEME.muted }}>0 months</span>
              <span style={{ fontSize: 11, color: THEME.muted }}>6 months (target)</span>
              <span style={{ fontSize: 11, color: THEME.muted }}>12 months</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
          marginTop: 16,
        }}
      >
        <StatCard
          label="Liquid Assets"
          value={<Prv>{fmtINRFull(data.totalLiquid)}</Prv>}
          sub="Savings bank accounts, breakable FDs & liquid funds"
          icon={<IndianRupee />}
          color={THEME.sage}
        />
        <StatCard
          label="Monthly Expenses"
          value={<Prv>{fmtINRFull(data.monthlyExpense)}</Prv>}
          sub="Calculated active monthly commitments"
          icon={<Wallet />}
          color={THEME.gold}
        />
        <StatCard
          label="6-Month Target"
          value={<Prv>{fmtINRFull(data.targetAmount)}</Prv>}
          sub="Standard security buffer target amount"
          icon={<Target />}
          color={THEME.accent}
        />
        <StatCard
          label="Gap to Fill"
          value={data.gap > 0 ? <Prv>{fmtINRFull(data.gap)}</Prv> : "Fully Funded!"}
          sub={
            data.gap > 0
              ? "Shortfall to reach 6-month buffer"
              : "You have achieved perfect security!"
          }
          subColor={data.gap > 0 ? "var(--t-rust)" : "var(--t-sage)"}
          icon={data.gap > 0 ? <AlertTriangle /> : <CheckCircle2 />}
          color={data.gap > 0 ? THEME.rust : THEME.sage}
        />
      </div>

      {/* Liquid Assets Breakdown */}
      <Card className="glass" style={{ marginTop: 16, background: "transparent" }}>
        <div style={{ padding: 20 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 14,
              marginBottom: 16,
              color: THEME.ink,
              display: "flex",
              alignItems: "center",
              gap: 8,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            <Wallet size={16} style={{ color: THEME.accent }} /> What Counts as Liquid Assets
          </div>
          {data.totalLiquid <= 0 ? (
            <EmptyState
              icon={Wallet}
              title="No liquid assets found yet"
              description="Add bank accounts, liquid mutual funds, or prepaid card balances to start tracking your emergency fund coverage."
            />
          ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              {
                label: "Bank Balances (Savings + Current)",
                value: data.bankBalance,
                icon: Landmark,
                color: THEME.accent,
              },
              {
                label: "Liquid / Money Market Mutual Funds",
                value: data.liquidMF,
                icon: TrendingUp,
                color: THEME.sage,
              },
              {
                label: "Prepaid Card Balances",
                value: data.prepaidBalance,
                icon: Wallet,
                color: THEME.gold,
              },
            ]
              .filter((r) => r.value > 0)
              .map((r, i) => {
                const Icon = r.icon;
                const assetPct = data.totalLiquid > 0 ? (r.value / data.totalLiquid) * 100 : 0;
                return (
                  <div
                    key={i}
                    className="card-lift"
                    style={{
                      padding: "12px 16px",
                      borderRadius: 12,
                      background: "color-mix(in srgb, var(--surface-0) 45%, transparent)",
                      border: "1px solid var(--t-line, var(--border))",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: `color-mix(in srgb, ${r.color} 10%, transparent)`,
                          color: r.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={14} />
                      </div>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: THEME.ink }}>
                        {r.label}
                      </span>
                      <span style={{ fontWeight: 800, fontSize: 14, color: THEME.ink }}>
                        <Prv>{fmtINRFull(r.value)}</Prv>
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: r.color,
                          background: `color-mix(in srgb, ${r.color} 12%, transparent)`,
                          padding: "2px 6px",
                          borderRadius: 4,
                          minWidth: 42,
                          textAlign: "center",
                        }}
                      >
                        {assetPct.toFixed(0)}%
                      </span>
                    </div>
                    {/* Proportion bar */}
                    <div
                      style={{
                        height: 4,
                        borderRadius: 2,
                        background: "var(--t-line)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          width: `${assetPct}%`,
                          background: r.color,
                          borderRadius: 2,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
          )}
        </div>
      </Card>

      {/* Monthly Expense Breakdown */}
      {data.expenseBreakdown.length > 0 && (
        <Card className="glass" style={{ marginTop: 16, background: "transparent" }}>
          <div style={{ padding: 20 }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 14,
                marginBottom: 16,
                color: THEME.ink,
                display: "flex",
                alignItems: "center",
                gap: 8,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              <PieChart size={16} style={{ color: THEME.accent }} /> Monthly Expense Allocation
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.expenseBreakdown
                .sort((a, b) => b.amount - a.amount)
                .map((e, i) => {
                  const expPct = data.monthlyExpense ? (e.amount / data.monthlyExpense) * 100 : 0;
                  const barColor =
                    i === 0
                      ? THEME.accent
                      : i === 1
                        ? THEME.gold
                        : i === 2
                          ? THEME.sage
                          : THEME.muted;
                  return (
                    <div
                      key={i}
                      className="card-lift"
                      style={{
                        padding: "12px 16px",
                        borderRadius: 12,
                        background: "color-mix(in srgb, var(--surface-0) 45%, transparent)",
                        border: "1px solid var(--t-line, var(--border))",
                        transition: "transform 0.2s ease",
                      }}
                    >
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}
                      >
                        <e.icon size={16} color={THEME.muted} />
                        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: THEME.ink }}>
                          {e.label}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 13, color: THEME.ink }}>
                          <Prv>{fmtINRFull(e.amount)}</Prv>
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            color: barColor,
                            background: `color-mix(in srgb, ${barColor} 12%, transparent)`,
                            padding: "2px 6px",
                            borderRadius: 4,
                            minWidth: 42,
                            textAlign: "center",
                          }}
                        >
                          {expPct.toFixed(0)}%
                        </span>
                      </div>
                      {/* Allocation bar */}
                      <div
                        style={{
                          height: 4,
                          borderRadius: 2,
                          background: "var(--t-line)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${expPct}%`,
                            background: barColor,
                            borderRadius: 2,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: "color-mix(in srgb, var(--surface-1) 30%, transparent)",
                  borderTop: `2px solid var(--t-line)`,
                  marginTop: 6,
                }}
              >
                <IndianRupee size={16} color={THEME.ink} />
                <span style={{ flex: 1, fontSize: 13, color: THEME.ink, fontWeight: 800 }}>
                  Total Monthly Expenditures
                </span>
                <span style={{ fontWeight: 900, fontSize: 15, color: THEME.ink }}>
                  <Prv>{fmtINRFull(data.monthlyExpense)}</Prv>
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Recommendations */}
      <Card className="glass" style={{ marginTop: 16, background: "transparent" }}>
        <div style={{ padding: 20 }}>
          <div
            style={{
              fontWeight: 800,
              fontSize: 14,
              marginBottom: 16,
              color: THEME.ink,
              display: "flex",
              alignItems: "center",
              gap: 8,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            <Info size={16} style={{ color: THEME.accent }} /> Tailored Recommendations
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {data.monthsCovered < 1 && (
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "color-mix(in srgb, var(--t-rust) 6%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--t-rust) 15%, transparent)",
                  borderLeft: `4px solid var(--t-rust)`,
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                <AlertTriangle
                  size={18}
                  style={{ color: THEME.rust, flexShrink: 0, marginTop: 2 }}
                />
                <div style={{ fontSize: 13, color: THEME.ink, lineHeight: 1.4 }}>
                  <strong
                    style={{
                      color: THEME.rust,
                      textTransform: "uppercase",
                      fontSize: 11,
                      display: "block",
                      marginBottom: 2,
                    }}
                  >
                    Critical Emergency Shortfall
                  </strong>
                  You have less than 1 month of expenses covered. Prioritize building your emergency
                  fund immediately before committing to any other long-term investment channels.
                </div>
              </div>
            )}
            {data.monthsCovered >= 1 && data.monthsCovered < 3 && (
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "color-mix(in srgb, var(--t-gold) 6%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--t-gold) 15%, transparent)",
                  borderLeft: `4px solid var(--t-gold)`,
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                <AlertTriangle
                  size={18}
                  style={{ color: THEME.gold, flexShrink: 0, marginTop: 2 }}
                />
                <div style={{ fontSize: 13, color: THEME.ink, lineHeight: 1.4 }}>
                  <strong
                    style={{
                      color: THEME.gold,
                      textTransform: "uppercase",
                      fontSize: 11,
                      display: "block",
                      marginBottom: 2,
                    }}
                  >
                    Needs Attention
                  </strong>
                  Aim for at least 3 months as your immediate milestone. Consider parking your
                  buffer in high-yield savings accounts or breakable fixed deposits.
                </div>
              </div>
            )}
            {data.monthsCovered >= 3 && data.monthsCovered < 6 && (
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "color-mix(in srgb, var(--t-accent) 6%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--t-accent) 15%, transparent)",
                  borderLeft: `4px solid var(--t-accent)`,
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                <Shield size={18} style={{ color: THEME.accent, flexShrink: 0, marginTop: 2 }} />
                <div style={{ fontSize: 13, color: THEME.ink, lineHeight: 1.4 }}>
                  <strong
                    style={{
                      color: THEME.accent,
                      textTransform: "uppercase",
                      fontSize: 11,
                      display: "block",
                      marginBottom: 2,
                    }}
                  >
                    Good Progress
                  </strong>
                  You are building a stable buffer. Target 6 months for a complete safety net. We
                  recommend splitting it: keep 1-2 months in your savings account, and put the rest
                  in low-risk liquid mutual funds.
                </div>
              </div>
            )}
            {data.monthsCovered >= 6 && (
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "color-mix(in srgb, var(--t-sage) 6%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--t-sage) 15%, transparent)",
                  borderLeft: `4px solid var(--t-sage)`,
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                <CheckCircle2
                  size={18}
                  style={{ color: THEME.sage, flexShrink: 0, marginTop: 2 }}
                />
                <div style={{ fontSize: 13, color: THEME.ink, lineHeight: 1.4 }}>
                  <strong
                    style={{
                      color: THEME.sage,
                      textTransform: "uppercase",
                      fontSize: 11,
                      display: "block",
                      marginBottom: 2,
                    }}
                  >
                    Fully Prepared!
                  </strong>
                  Your emergency reserve is in excellent shape, covering over 6 months of expenses.
                  Any monthly savings beyond this can be redirected into wealth-building equity or
                  mutual fund investments.
                </div>
              </div>
            )}
            {data.gap > 0 && (
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 12,
                  background: "color-mix(in srgb, var(--t-accent) 4%, transparent)",
                  border: "1px solid var(--t-line)",
                  borderLeft: "4px solid var(--t-muted)",
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                <TrendingUp
                  size={18}
                  style={{ color: THEME.accent, flexShrink: 0, marginTop: 2 }}
                />
                <div style={{ fontSize: 13, color: THEME.ink, lineHeight: 1.4 }}>
                  <strong
                    style={{
                      color: THEME.muted,
                      textTransform: "uppercase",
                      fontSize: 11,
                      display: "block",
                      marginBottom: 2,
                    }}
                  >
                    Recommended Savings Target
                  </strong>
                  To bridge the target gap of <Prv>{fmtINRFull(data.gap)}</Prv>, allocate{" "}
                  <strong>
                    <Prv>{fmtINRFull(data.gap / 6)}</Prv>/month
                  </strong>{" "}
                  for 6 months, or{" "}
                  <strong>
                    <Prv>{fmtINRFull(data.gap / 12)}</Prv>/month
                  </strong>{" "}
                  for 12 months.
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
