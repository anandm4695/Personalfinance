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
  Lock,
  Calendar,
} from "lucide-react";
import { THEME } from "../../utils/constants";
import { fmtINR, fmtINRFull, getEffectiveRent, annualizePremium } from "../../utils/finance";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { SectionTitle } from "../ui/SectionTitle";
import { StatCard } from "../ui/StatCard";
import { EmptyState } from "../ui/EmptyState";
import { Money } from "../ui/Money";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";

const TIER_COLOR = { critical: THEME.rust, building: THEME.gold, healthy: THEME.accent, excellent: THEME.sage };

export const EmergencyFundTab = ({ state, metrics }) => {
  const ef = metrics.emergencyFund;
  const data = useMemo(() => {
    const bankBalance = ef.cashInBanks;
    const fdValue = ef.nearTermFDValue;
    const liquidMF = ef.liquidMFValue;
    const prepaidBalance = Math.max(0, ef.prepaidValue);
    const totalLiquid = ef.liquidAssets;
    const finalExpense = ef.monthlyExpense;
    const monthsCovered = ef.monthsCovered;
    const targetMonths = ef.targetMonths;
    const targetAmount = ef.targetAmount;
    const gap = ef.gap;
    const coveragePct = ef.coveragePct;

    // Expense breakdown for table
    const expenseBreakdown = [];
    const emis = (state.loansTaken || []).reduce((s, l) => s + Number(l.emi || 0), 0);
    if (emis > 0) expenseBreakdown.push({ label: "EMIs", amount: emis, icon: CreditCard });

    // Uses getEffectiveRent() rather than the raw monthlyRent field, which is
    // set once at lease start and never updated as escalation tiers advance.
    const rent = (state.rentedProperties || [])
      .filter((p) => p.isActive !== false)
      .reduce((s, p) => s + getEffectiveRent(p), 0);
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
    ].reduce((s, p) => s + annualizePremium(p.premium, p.premiumFrequency, p.annualPremium) / 12, 0);
    if (insTotal > 0)
      expenseBreakdown.push({ label: "Insurance Premiums", amount: insTotal, icon: HeartPulse });

    return {
      bankBalance,
      fdValue,
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
  }, [state, ef]);

  const healthColor = TIER_COLOR[ef.tier];
  const healthLabel = ef.label;
  const animatedMonthsCovered = useAnimatedNumber(data.monthsCovered);

  // Projected months to close the gap, based on the user's actual monthly
  // savings (income - expense). Only shown when there's a real gap and a
  // positive savings rate to project from — otherwise "time to target" is
  // either moot (already funded) or unknowable (no surplus to save).
  const monthlySurplus = Math.max(0, (metrics.monthIncome || 0) - (metrics.monthExpense || 0));
  const monthsToTarget = data.gap > 0 && monthlySurplus > 0 ? data.gap / monthlySurplus : null;

  return (
    <div>
      <SectionTitle sub="How many months can you survive on liquid assets alone?">
        Emergency Fund Health
      </SectionTitle>

      {/* Main Health Indicator */}
      <Card style={{ borderRadius: 16 }}>
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
                  fontFamily: "var(--font-display)",
                  fontSize: 28,
                  fontWeight: 600,
                  color: healthColor,
                  lineHeight: 1,
                  letterSpacing: "-0.03em",
                }}
              >
                {animatedMonthsCovered.toFixed(1)}
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
              <Badge variant={ef.badgeVariant}>{healthLabel}</Badge>
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
          value={fmtINRFull(data.totalLiquid)}
          numericValue={data.totalLiquid}
          formatValue={fmtINRFull}
          sub="Bank accounts, FDs maturing within 90 days & liquid funds"
          icon={<IndianRupee />}
          color={THEME.sage}
        />
        <StatCard
          label="Monthly Expenses"
          value={fmtINRFull(data.monthlyExpense)}
          numericValue={data.monthlyExpense}
          formatValue={fmtINRFull}
          sub="Calculated active monthly commitments"
          icon={<Wallet />}
          color={THEME.gold}
        />
        <StatCard
          label="6-Month Target"
          value={fmtINRFull(data.targetAmount)}
          numericValue={data.targetAmount}
          formatValue={fmtINRFull}
          sub="Standard security buffer target amount"
          icon={<Target />}
          color={THEME.accent}
        />
        <StatCard
          label="Gap to Fill"
          value={data.gap > 0 ? fmtINRFull(data.gap) : "Fully Funded!"}
          numericValue={data.gap > 0 ? data.gap : undefined}
          formatValue={fmtINRFull}
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
      <Card style={{ marginTop: 16 }}>
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
                label: "Fixed Deposits Maturing Within 90 Days",
                value: data.fdValue,
                icon: Calendar,
                color: THEME.muted,
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
                      <div style={{ color: r.color, display: "flex", alignItems: "center", flexShrink: 0 }}>
                        <Icon size={18} />
                      </div>
                      <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: THEME.ink }}>
                        {r.label}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--font-display)",
                          fontWeight: 800,
                          fontSize: 14,
                          color: THEME.ink,
                        }}
                      >
                        <Money value={r.value} variant="full" />
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
        <Card style={{ marginTop: 16 }}>
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
            {(() => {
              // Bug fix: this breakdown's line items (EMIs, rent, SIPs, subscriptions,
              // recurring expenses, insurance) are always computed bottom-up, but the
              // "Monthly Expenses" figure used for the months-covered calc above prefers
              // a manually-set Budget total when one exists — the two can legitimately
              // differ (a budget rarely itemizes every commitment 1:1). Dividing each
              // line item by that *different* total previously produced percentages
              // that could sum to 400%+ instead of 100%. Percentages here are now
              // relative to the sum of the items actually shown, which always adds up.
              const breakdownTotal = data.expenseBreakdown.reduce((s, e) => s + e.amount, 0);
              const usesDifferentTotal =
                Math.abs(breakdownTotal - data.monthlyExpense) > Math.max(1, data.monthlyExpense * 0.01);
              return (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {data.expenseBreakdown
                .sort((a, b) => b.amount - a.amount)
                .map((e, i) => {
                  const expPct = breakdownTotal ? (e.amount / breakdownTotal) * 100 : 0;
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
                        <span
                          style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 700,
                            fontSize: 13,
                            color: THEME.ink,
                          }}
                        >
                          <Money value={e.amount} variant="full" />
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
                  Sum of Tracked Commitments
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontWeight: 900,
                    fontSize: 15,
                    color: THEME.ink,
                  }}
                >
                  <Money value={breakdownTotal} variant="full" />
                </span>
              </div>
              {usesDifferentTotal && (
                <div style={{ fontSize: 11, color: THEME.muted, padding: "0 4px" }}>
                  The <Money value={data.monthlyExpense} variant="full" /> used above for months-covered comes from
                  your Budget total, which doesn't line up 1:1 with these itemized commitments.
                </div>
              )}
            </div>
              );
            })()}
          </div>
        </Card>
      )}

      {/* Recommendations */}
      <Card style={{ marginTop: 16 }}>
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
                  To bridge the target gap of <Money value={data.gap} variant="full" />, allocate{" "}
                  <strong>
                    <Money value={data.gap / 6} variant="full" />/month
                  </strong>{" "}
                  for 6 months, or{" "}
                  <strong>
                    <Money value={data.gap / 12} variant="full" />/month
                  </strong>{" "}
                  for 12 months.
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
                  background: "color-mix(in srgb, var(--t-sage) 4%, transparent)",
                  border: "1px solid var(--t-line)",
                  borderLeft: "4px solid var(--t-sage)",
                  boxShadow: "var(--shadow-xs)",
                }}
              >
                <Lock size={18} style={{ color: THEME.sage, flexShrink: 0, marginTop: 2 }} />
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
                    At Your Current Pace
                  </strong>
                  {monthsToTarget !== null ? (
                    <>
                      You're saving <Money value={monthlySurplus} variant="full" />/month on average. Keep
                      that up and you'll close the gap in{" "}
                      <strong>
                        {monthsToTarget < 1
                          ? "under a month"
                          : `about ${Math.ceil(monthsToTarget)} month${Math.ceil(monthsToTarget) === 1 ? "" : "s"}`}
                      </strong>
                      , around{" "}
                      <strong>
                        {new Date(
                          Date.now() + Math.ceil(monthsToTarget) * 30.44 * 86400000
                        ).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                      </strong>
                      .
                    </>
                  ) : (
                    <>
                      This month's income doesn't leave a surplus over expenses, so there's nothing
                      to project a payoff date from yet. Redirecting even a small recurring amount
                      here will start closing the gap.
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};
